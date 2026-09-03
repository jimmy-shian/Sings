/**
 * SingStudio - 專業音訊工作站時間軸引擎 (Audio Timeline Component)
 * 遵循 OpenDesign 規範：淺灰高對比、模組化獨立、零裝飾 Emoji、支援滾輪縮放與拖曳 Scrubbing
 * 
 * 核心功能：
 * 1. 雙軌波形繪製：伴奏音訊軌 (Backing Track) + 人聲音訊軌 (Vocal Track，支援接續錄製 Takes 拼接)
 * 2. 滾輪平滑縮放 (Wheel Zoom)：1.0x ~ 10.0x 細部時間軸縮放，自適應刻度尺保證刻度文字不重疊
 * 3. 點擊與拖動跳轉 (Click & Drag Scrubbing)：平滑拖曳播放指針，即時回調 onSeek
 * 4. 視窗自動跟隨 (Auto-scroll)：當放大檢視且播放指針超出可視範圍時自動水平平移
 */

class AudioTimeline {
  constructor(options = {}) {
    this.canvas = options.canvas || null;
    this.ctx = null;

    // 回調函式
    this.onSeek = options.onSeek || (() => {});
    this.onZoomChange = options.onZoomChange || (() => {});

    // 時間與時長 (秒)
    this.duration = options.duration || 60;
    this.currentTime = 0;
    this.isPlaying = false;

    // 縮放與檢視範圍
    this.zoomLevel = 1.0; // 1.0x ~ 10.0x
    this.minZoom = 1.0;
    this.maxZoom = 10.0;
    this.viewStartTime = 0; // 當前視窗起始秒數

    // 拖曳狀態
    this.isDragging = false;

    // 波形數據
    this.backingPeaks = null; // Float32Array 伴奏振幅特徵
    this.vocalTakes = [];     // 人聲片段陣列: [{ id, startTime, duration, peaks, rmsHistory }]
    this.liveVocalWave = [];  // 當前即時錄音波形取樣 (Float32Array / Array)

    if (this.canvas) {
      this.init(this.canvas);
    }
  }

  init(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    
    // 初始化時執行兩次 resize 以確保佈局完成後獲得精準寬度
    this.resize();
    setTimeout(() => this.resize(), 50);

    window.addEventListener('resize', () => this.resize());

    // 1. 滑鼠滾輪縮放時間軸 (Wheel Zoom)
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseRatio = mouseX / rect.width;
      
      const visibleDuration = this.getVisibleDuration();
      const mouseTime = this.viewStartTime + mouseRatio * visibleDuration;

      const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;
      const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel * zoomFactor));

      if (Math.abs(newZoom - this.zoomLevel) > 0.01) {
        this.zoomLevel = newZoom;
        const newVisibleDuration = this.getVisibleDuration();
        this.viewStartTime = Math.max(0, Math.min(this.duration - newVisibleDuration, mouseTime - mouseRatio * newVisibleDuration));
        this.onZoomChange(this.zoomLevel);
        this.render();
      }
    }, { passive: false });

    // 2. 點擊與拖動時間軸指針 (Click & Drag Scrubbing)
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.canvas.style.cursor = 'grabbing';
      this.handlePointerTime(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.handlePointerTime(e);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        if (this.canvas) this.canvas.style.cursor = 'crosshair';
      }
    });

    this.render();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.displayWidth = rect.width;
    this.displayHeight = rect.height;
    this.render();
  }

  getVisibleDuration() {
    return Math.max(1, this.duration / this.zoomLevel);
  }

  timeToX(timeSec) {
    const visibleDuration = this.getVisibleDuration();
    return ((timeSec - this.viewStartTime) / visibleDuration) * this.displayWidth;
  }

  xToTime(x) {
    const visibleDuration = this.getVisibleDuration();
    const ratio = Math.max(0, Math.min(1, x / this.displayWidth));
    return Math.max(0, Math.min(this.duration, this.viewStartTime + ratio * visibleDuration));
  }

  handlePointerTime(e) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const targetTime = this.xToTime(mouseX);
    this.currentTime = targetTime;
    this.onSeek(targetTime);
    this.render();
  }

  setZoom(level) {
    this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, level));
    const newVisible = this.getVisibleDuration();
    this.viewStartTime = Math.max(0, Math.min(this.duration - newVisible, this.currentTime - newVisible * 0.3));
    this.onZoomChange(this.zoomLevel);
    this.render();
  }

  resetZoom() {
    this.zoomLevel = 1.0;
    this.viewStartTime = 0;
    this.onZoomChange(this.zoomLevel);
    this.render();
  }

  setDuration(dur) {
    this.duration = Math.max(1, dur);
    this.render();
  }

  setBackingPeaks(peaks, duration = null) {
    this.backingPeaks = peaks;
    if (duration && duration > 0) {
      this.duration = duration;
    }
    this.render();
  }

  setVocalTakes(takes) {
    this.vocalTakes = takes || [];
    this.render();
  }

  addLiveVocalWave(timeSec, rmsValue) {
    this.liveVocalWave.push({ time: timeSec, rms: rmsValue });
    if (this.liveVocalWave.length > 1200) {
      this.liveVocalWave.shift();
    }
  }

  clearLiveVocalWave() {
    this.liveVocalWave = [];
  }

  updatePlayhead(currentTime, isPlaying = false) {
    this.currentTime = Math.max(0, Math.min(this.duration, currentTime));
    this.isPlaying = isPlaying;

    const visibleDur = this.getVisibleDuration();
    if (this.zoomLevel > 1.0) {
      if (this.currentTime > this.viewStartTime + visibleDur * 0.85) {
        this.viewStartTime = Math.min(this.duration - visibleDur, this.currentTime - visibleDur * 0.5);
      } else if (this.currentTime < this.viewStartTime) {
        this.viewStartTime = Math.max(0, this.currentTime - visibleDur * 0.1);
      }
    } else {
      this.viewStartTime = 0;
    }

    this.render();
  }

  /**
   * 繪製專業音訊工作站雙軌波形與時間軸
   */
  render() {
    if (!this.ctx || !this.displayWidth) return;
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;

    // 底色
    ctx.fillStyle = '#1c1e26';
    ctx.fillRect(0, 0, w, h);

    const visibleDur = this.getVisibleDuration();
    const rulerH = 26;

    // 1. 頂部時間標尺 (Timeline Ruler)
    ctx.fillStyle = '#262934';
    ctx.fillRect(0, 0, w, rulerH);
    ctx.strokeStyle = '#3e4354';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerH);
    ctx.lineTo(w, rulerH);
    ctx.stroke();

    // 自適應刻度間隔計算：保證每個標籤至少有 80px 空間，徹底杜絕文字擠壓重疊
    const minPixelPerTick = 80;
    const maxTicks = Math.max(2, Math.floor(w / minPixelPerTick));
    const idealStep = visibleDur / maxTicks;
    const stepChoices = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    let tickStep = stepChoices.find(s => s >= idealStep) || 60;

    const firstTick = Math.floor(this.viewStartTime / tickStep) * tickStep;
    for (let t = firstTick; t <= this.viewStartTime + visibleDur; t += tickStep) {
      if (t < 0) continue;
      const x = this.timeToX(t);
      if (x < 0 || x > w) continue;

      ctx.strokeStyle = '#4e5469';
      ctx.beginPath();
      ctx.moveTo(x, rulerH - 8);
      ctx.lineTo(x, rulerH);
      ctx.stroke();

      ctx.fillStyle = '#a0a6b8';
      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.fillText(Utils.formatDuration(t), Math.max(4, x - 18), rulerH - 9);
    }

    // 軌道佈局分配
    const trackAreaH = h - rulerH;
    const trackH = Math.max(40, (trackAreaH - 12) / 2);
    const backingTrackTop = rulerH + 4;
    const vocalTrackTop = backingTrackTop + trackH + 4;

    // 2. 軌道 1: 伴奏音訊軌 (Backing Waveform Track)
    this.renderTrackBackground(ctx, 0, backingTrackTop, w, trackH, '伴奏軌 [BACKING]');
    this.renderBackingWaveform(ctx, w, backingTrackTop, trackH);

    // 3. 軌道 2: 人聲音訊軌 (Vocal Waveform Track)
    this.renderTrackBackground(ctx, 0, vocalTrackTop, w, trackH, '人聲軌 [VOCAL]');
    this.renderVocalWaveforms(ctx, w, vocalTrackTop, trackH);

    // 4. 當前播放/錄製指針 (Playhead Cursor)
    const playheadX = this.timeToX(this.currentTime);
    if (playheadX >= 0 && playheadX <= w) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(playheadX, rulerH);
      ctx.lineTo(playheadX, h);
      ctx.stroke();

      // 頂部小標籤旗標 (精緻對齊，不擋刻度文字)
      const badgeW = 54;
      const badgeH = 19;
      const badgeX = Math.max(2, Math.min(w - badgeW - 2, playheadX - badgeW / 2));
      
      ctx.fillStyle = '#10b981';
      ctx.fillRect(badgeX, 3, badgeW, badgeH);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(Utils.formatDuration(this.currentTime), badgeX + badgeW / 2, 17);
      ctx.textAlign = 'left';
    }
  }

  renderTrackBackground(ctx, x, y, w, h, label) {
    ctx.fillStyle = '#21242e';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#343948';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // 軌道標籤置於右上角，完全避開波形與 Take 框
    ctx.fillStyle = '#7a8194';
    ctx.font = '12.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(label, w - 12, y + 16);
    ctx.textAlign = 'left';

    // 中心基線
    const midY = y + h / 2;
    ctx.strokeStyle = '#2b303d';
    ctx.beginPath();
    ctx.moveTo(x, midY);
    ctx.lineTo(x + w, midY);
    ctx.stroke();
  }

  renderBackingWaveform(ctx, w, trackTop, trackH) {
    const midY = trackTop + trackH / 2;
    const maxAmpH = trackH * 0.42;
    const playheadX = this.timeToX(this.currentTime);

    if (this.backingPeaks && this.backingPeaks.length > 0) {
      const peaks = this.backingPeaks;
      const totalPoints = peaks.length;

      for (let i = 0; i < totalPoints; i++) {
        const peakTime = (i / totalPoints) * this.duration;
        const x = this.timeToX(peakTime);
        if (x < -5 || x > w + 5) continue;

        const amp = peaks[i] || 0.05;
        const barH = amp * maxAmpH;

        ctx.fillStyle = x <= playheadX ? '#3b82f6' : '#555b70';
        ctx.fillRect(x, midY - barH, 1.8, barH * 2);
      }
    } else {
      const bars = 100;
      for (let i = 0; i < bars; i++) {
        const t = (i / bars) * this.duration;
        const x = this.timeToX(t);
        if (x < -5 || x > w + 5) continue;

        const pulse = Math.sin(i * 0.25 + (this.isPlaying ? this.currentTime * 3 : 0)) * 0.3 + 0.5;
        const barH = pulse * maxAmpH * 0.6;
        ctx.fillStyle = x <= playheadX ? '#3b82f6' : '#555b70';
        ctx.fillRect(x, midY - barH, 2, barH * 2);
      }
    }
  }

  renderVocalWaveforms(ctx, w, trackTop, trackH) {
    const midY = trackTop + trackH / 2;
    const maxAmpH = trackH * 0.42;

    // 1. 繪製已錄製的接續片段 (Vocal Takes)
    if (this.vocalTakes && this.vocalTakes.length > 0) {
      this.vocalTakes.forEach((take) => {
        const startX = this.timeToX(take.startTime);
        const endX = this.timeToX(take.startTime + take.duration);
        const takeW = endX - startX;

        if (startX + takeW > 0 && startX < w) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1;
          ctx.fillRect(startX, trackTop + 2, takeW, trackH - 4);
          ctx.strokeRect(startX, trackTop + 2, takeW, trackH - 4);

          // 片段名稱標籤 (左上角)
          ctx.fillStyle = '#10b981';
          ctx.font = '12px "JetBrains Mono", monospace';
          ctx.fillText(`Take: ${take.id || 'Take'} (${take.duration.toFixed(1)}s)`, startX + 6, trackTop + 16);

          if (take.peaks && take.peaks.length > 0) {
            ctx.fillStyle = '#10b981';
            const numPeaks = take.peaks.length;
            for (let p = 0; p < numPeaks; p++) {
              const peakTime = take.startTime + (p / numPeaks) * take.duration;
              const px = this.timeToX(peakTime);
              if (px >= startX && px <= endX) {
                const bH = (take.peaks[p] || 0.05) * maxAmpH;
                ctx.fillRect(px, midY - bH, 1.8, bH * 2);
              }
            }
          }
        }
      });
    }

    // 2. 繪製即時正在錄製的聲音振幅 (Live Oscillogram Waveform)
    if (this.liveVocalWave && this.liveVocalWave.length > 0) {
      ctx.fillStyle = '#34d399';
      this.liveVocalWave.forEach(pt => {
        const px = this.timeToX(pt.time);
        if (px >= 0 && px <= w) {
          const bH = Math.min(maxAmpH, (pt.rms || 0.05) * maxAmpH * 2.5);
          ctx.fillRect(px - 1, midY - bH, 2.2, bH * 2);
        }
      });
    }
  }
}

window.AudioTimeline = AudioTimeline;
