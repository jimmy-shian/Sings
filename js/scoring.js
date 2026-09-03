/**
 * SingStudio - 音準視覺化畫布與評分系統 (Scoring & Visualizer)
 * 遵循 OpenDesign 規範：淺灰高對比、禁止花俏卡通 emoji、字體階層分明 (>= 15px)
 * 支援雙模式：
 * 1. notes (內建示範模式): 音符瀑布流導引與音階標線 (音符那種)
 * 2. audio-axis (本地檔案/YouTube 模式): 伴奏波形軸與時間刻度尺 (音訊軸)
 */

class PitchScoring {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    
    // 視覺化模式: 'audio-axis' | 'notes'
    this.visualizerMode = 'audio-axis';
    
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalSamples = 0;
    this.hitSamples = 0;
    
    this.pitchHistory = [];
    this.vocalWaveHistory = [];
    this.maxHistoryLength = 160;
    this.targetMelody = this.generateDemoMelody();
    this.rank = 'C';

    this.lastFeedback = '';
    this.feedbackAlpha = 0;
    this.feedbackColor = '#10b981';
  }

  init(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // 點擊畫布直接跳轉時間 (音訊軸模式)
    this.canvas.addEventListener('click', (e) => {
      if (this.visualizerMode !== 'audio-axis') return;
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const dur = this.getTotalDuration();
      const targetTime = ratio * dur;

      if (window.audioEngine) {
        if (window.audioEngine.isPlayingMix) {
          window.audioEngine.seekMixedPreview(targetTime);
        } else if (!window.audioEngine.isRecording) {
          window.audioEngine.seekBackingOnly(targetTime);
        }
      }
    });
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    this.displayWidth = rect.width;
    this.displayHeight = rect.height;
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalSamples = 0;
    this.hitSamples = 0;
    this.pitchHistory = [];
    this.vocalWaveHistory = [];
    this.rank = 'C';
    this.lastFeedback = '';
    this.feedbackAlpha = 0;
  }

  getTotalDuration() {
    if (window.audioEngine) {
      return window.audioEngine.getReviewDuration() || 60;
    }
    return 60;
  }

  generateDemoMelody() {
    return [
      { start: 4.0, duration: 1.8, midi: 64, note: 'E4' },
      { start: 6.0, duration: 1.8, midi: 62, note: 'D4' },
      { start: 8.0, duration: 1.8, midi: 60, note: 'C4' },
      { start: 10.0, duration: 1.8, midi: 59, note: 'B3' },
      { start: 12.0, duration: 1.8, midi: 57, note: 'A3' },
      { start: 14.0, duration: 1.8, midi: 60, note: 'C4' },
      { start: 16.0, duration: 1.8, midi: 62, note: 'D4' },
      { start: 18.0, duration: 1.8, midi: 64, note: 'E4' },
      { start: 20.0, duration: 1.8, midi: 65, note: 'F4' },
      { start: 22.0, duration: 1.8, midi: 64, note: 'E4' },
      { start: 24.0, duration: 1.8, midi: 62, note: 'D4' },
      { start: 26.0, duration: 1.8, midi: 60, note: 'C4' },
      { start: 28.0, duration: 1.8, midi: 62, note: 'D4' },
      { start: 30.0, duration: 1.8, midi: 64, note: 'E4' },
      { start: 32.0, duration: 1.8, midi: 67, note: 'G4' },
      { start: 36.0, duration: 2.0, midi: 69, note: 'A4' },
      { start: 39.0, duration: 2.0, midi: 67, note: 'G4' },
      { start: 42.0, duration: 2.5, midi: 64, note: 'E4' },
      { start: 46.0, duration: 3.0, midi: 60, note: 'C4' }
    ];
  }

  update(pitchData, currentTime) {
    if (!pitchData) return;

    const hasVoice = pitchData.clarity > 0.55 && pitchData.midi > 0;

    // 模式 A: 音符瀑布流模式 (示範卡農)
    if (this.visualizerMode === 'notes') {
      const targetNote = this.targetMelody.find(
        n => currentTime >= n.start && currentTime <= (n.start + n.duration)
      );

      if (hasVoice) {
        this.totalSamples++;
        let hit = false;

        if (targetNote) {
          const userOct = pitchData.midi % 12;
          const targetOct = targetNote.midi % 12;
          const diff = Math.min(
            Math.abs(userOct - targetOct),
            12 - Math.abs(userOct - targetOct)
          );

          if (diff === 0 && Math.abs(pitchData.cents) < 35) {
            hit = true;
            this.triggerFeedback('PERFECT', '#10b981');
            this.score += 15;
            this.combo++;
          } else if (diff <= 1) {
            hit = true;
            this.triggerFeedback('GREAT', '#3b82f6');
            this.score += 10;
            this.combo++;
          } else {
            this.triggerFeedback('GOOD', '#d4d7e2');
            this.score += 5;
          }
        } else {
          if (pitchData.clarity > 0.8) {
            this.score += 8;
            this.hitSamples++;
          }
        }

        if (hit) {
          this.hitSamples++;
          if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        }

        this.pitchHistory.push({
          time: currentTime,
          midi: pitchData.midi,
          note: pitchData.note,
          cents: pitchData.cents,
          hit: hit
        });
      } else {
        if (targetNote && currentTime > targetNote.start + 0.5) {
          if (this.combo > 0) {
            this.triggerFeedback('MISS', '#ef4444');
            this.combo = 0;
          }
        }
        this.pitchHistory.push({ time: currentTime, midi: null });
      }
    } 
    // 模式 B: 音訊軸模式 (本地伴奏 / YouTube 歌曲自適應評分)
    else {
      if (hasVoice) {
        this.totalSamples++;
        this.hitSamples++;
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        if (pitchData.clarity > 0.85) {
          this.triggerFeedback('EXCELLENT', '#10b981');
          this.score += 12;
        } else if (pitchData.clarity > 0.7) {
          this.triggerFeedback('STABLE TONE', '#3b82f6');
          this.score += 8;
        } else {
          this.triggerFeedback('SINGING', '#d4d7e2');
          this.score += 4;
        }

        this.pitchHistory.push({
          time: currentTime,
          midi: pitchData.midi,
          note: pitchData.note,
          cents: pitchData.cents,
          hit: true
        });
        this.vocalWaveHistory.push({
          time: currentTime,
          rms: pitchData.rms || 0.1
        });
      } else {
        if (this.combo > 0) {
          this.combo = 0;
        }
        this.pitchHistory.push({ time: currentTime, midi: null });
      }
    }

    if (this.pitchHistory.length > this.maxHistoryLength) {
      this.pitchHistory.shift();
    }
    if (this.vocalWaveHistory.length > this.maxHistoryLength) {
      this.vocalWaveHistory.shift();
    }

    this.calculateRank();
  }

  triggerFeedback(text, color) {
    this.lastFeedback = text;
    this.feedbackColor = color;
    this.feedbackAlpha = 1.0;
  }

  calculateRank() {
    const s = this.getNormalizedScore();
    if (s >= 90) this.rank = 'S';
    else if (s >= 80) this.rank = 'A';
    else if (s >= 65) this.rank = 'B';
    else this.rank = 'C';
  }

  getNormalizedScore() {
    if (this.totalSamples === 0) return 60;
    const accuracy = (this.hitSamples / this.totalSamples) * 100;
    const comboBonus = Math.min(10, this.maxCombo * 0.2);
    return Math.min(100, Math.round(accuracy * 0.9 + comboBonus));
  }

  /**
   * 畫布主繪製函式
   */
  draw(currentTime, currentPitch) {
    if (!this.ctx || !this.displayWidth) return;
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;

    // 淺灰背景色 (提高 20% 亮度，高質感石墨灰)
    ctx.fillStyle = '#1c1d24';
    ctx.fillRect(0, 0, w, h);

    if (this.visualizerMode === 'notes') {
      this.drawNotesMode(ctx, w, h, currentTime, currentPitch);
    } else {
      this.drawAudioAxisMode(ctx, w, h, currentTime, currentPitch);
    }

    // 繪製評分反饋文字 (字體 20px)
    if (this.feedbackAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.feedbackAlpha;
      ctx.fillStyle = this.feedbackColor || '#10b981';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.lastFeedback, w * 0.5, 36);
      if (this.combo > 1) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '15px "JetBrains Mono", monospace';
        ctx.fillText(`[${this.combo} COMBO]`, w * 0.5, 60);
      }
      ctx.restore();
      this.feedbackAlpha = Math.max(0, this.feedbackAlpha - 0.025);
    }
  }

  /**
   * 繪製模式 A: 內建音符瀑布流模式 (音符那種)
   */
  drawNotesMode(ctx, w, h, currentTime, currentPitch) {
    const minMidi = 48;
    const maxMidi = 84;
    const midiRange = maxMidi - minMidi;

    // 水平音高標線 (Zinc 700)
    ctx.strokeStyle = '#323644';
    ctx.lineWidth = 1;
    for (let m = minMidi; m <= maxMidi; m += 2) {
      const y = h - ((m - minMidi) / midiRange) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      if (m % 12 === 0) {
        ctx.fillStyle = '#8f95a7';
        ctx.font = '14.5px "JetBrains Mono", monospace';
        const noteName = 'C' + (m / 12 - 1);
        ctx.fillText(noteName, 12, y - 4);
      }
    }

    const nowX = w * 0.28;
    const timeScale = 85;

    // 目標音符條 (OpenDesign 高對比樣式)
    this.targetMelody.forEach(note => {
      const startX = nowX + (note.start - currentTime) * timeScale;
      const noteW = note.duration * timeScale;
      const noteY = h - ((note.midi - minMidi) / midiRange) * h;

      if (startX + noteW > 0 && startX < w) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;

        ctx.strokeRect(startX, noteY - 10, noteW, 20);
        ctx.fillRect(startX, noteY - 10, noteW, 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = '15px sans-serif';
        ctx.fillText(note.note, startX + 8, noteY + 5);
      }
    });

    // 當前時間標記線
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(nowX, 0);
    ctx.lineTo(nowX, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // 使用者音準軌跡
    if (this.pitchHistory.length > 1) {
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 1; i < this.pitchHistory.length; i++) {
        const p1 = this.pitchHistory[i - 1];
        const p2 = this.pitchHistory[i];

        if (p1.midi && p2.midi) {
          const x1 = nowX + (p1.time - currentTime) * timeScale;
          const y1 = h - ((p1.midi - minMidi) / midiRange) * h;
          const x2 = nowX + (p2.time - currentTime) * timeScale;
          const y2 = h - ((p2.midi - minMidi) / midiRange) * h;

          ctx.strokeStyle = p2.hit ? '#10b981' : '#a1a1aa';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    }

    // 即時雷射光點
    if (currentPitch && currentPitch.midi > 0 && currentPitch.clarity > 0.5) {
      const curY = h - ((currentPitch.midi - minMidi) / midiRange) * h;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(nowX, curY, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '15px "JetBrains Mono", monospace';
      ctx.fillText(`${currentPitch.note} · ${currentPitch.freq}Hz`, nowX + 14, curY + 5);
    }
  }

  /**
   * 繪製模式 B: 音訊時間軸與聲波流模式 (音訊軸)
   */
  drawAudioAxisMode(ctx, w, h, currentTime, currentPitch) {
    const totalDuration = this.getTotalDuration();
    const progressRatio = Math.max(0, Math.min(1, currentTime / (totalDuration || 1)));
    const playheadX = progressRatio * w;

    // 1. 頂部時間標尺 (Timeline Ruler)
    const rulerHeight = 28;
    ctx.fillStyle = '#252731';
    ctx.fillRect(0, 0, w, rulerHeight);
    ctx.strokeStyle = '#3d4253';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerHeight);
    ctx.lineTo(w, rulerHeight);
    ctx.stroke();

    // 時間刻度與文字 (依總長度動態調整間隔)
    const stepSec = totalDuration > 180 ? 30 : totalDuration > 60 ? 15 : 5;
    for (let s = 0; s <= totalDuration; s += stepSec) {
      const tickX = (s / totalDuration) * w;
      ctx.beginPath();
      ctx.moveTo(tickX, rulerHeight - 8);
      ctx.lineTo(tickX, rulerHeight);
      ctx.stroke();

      ctx.fillStyle = '#9da3b5';
      ctx.font = '13.5px "JetBrains Mono", monospace';
      ctx.fillText(Utils.formatDuration(s), Math.max(4, tickX - 16), rulerHeight - 12);
    }

    // 2. 伴奏波形軸 (Backing Waveform Track)
    const waveCenterY = rulerHeight + (h - rulerHeight) * 0.45;
    const maxWaveHeight = (h - rulerHeight) * 0.35;

    // 波形基線
    ctx.strokeStyle = '#323644';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, waveCenterY);
    ctx.lineTo(w, waveCenterY);
    ctx.stroke();

    const peaks = window.audioEngine ? window.audioEngine.waveformPeaks : null;

    if (peaks && peaks.length > 0) {
      const numBars = peaks.length;
      const barWidth = Math.max(1, w / numBars);

      for (let i = 0; i < numBars; i++) {
        const x = (i / numBars) * w;
        const amp = peaks[i] || 0.05;
        const barH = amp * maxWaveHeight;

        // 已播放與未播放波形顏色區分
        if (x <= playheadX) {
          ctx.fillStyle = '#3b82f6'; // 已播放: 亮藍
        } else {
          ctx.fillStyle = '#515668'; // 未播放: 淺灰
        }

        ctx.fillRect(x, waveCenterY - barH, Math.max(1.5, barWidth - 0.5), barH * 2);
      }
    } else {
      // 備用動態頻譜能量曲線 (如 YouTube 模式)
      const segments = 120;
      const segWidth = w / segments;
      for (let i = 0; i < segments; i++) {
        const x = i * segWidth;
        const dist = Math.abs(x - playheadX);
        const pulse = Math.sin(i * 0.3 + currentTime * 3) * 0.3 + 0.5;
        const proximity = Math.max(0, 1 - dist / 80);
        const amp = (pulse * 0.5 + proximity * 0.5) * maxWaveHeight * 0.7;

        ctx.fillStyle = x <= playheadX ? '#3b82f6' : '#515668';
        ctx.fillRect(x, waveCenterY - amp, segWidth - 1, amp * 2);
      }
    }

    // 伴奏軸文字標記
    ctx.fillStyle = '#8f95a7';
    ctx.font = '13.5px "JetBrains Mono", monospace';
    ctx.fillText('[伴奏音訊軌]', 12, rulerHeight + 20);

    // 3. 人聲即時音訊軌與音準走勢 (Vocal Wave & Pitch Track)
    const vocalCenterY = h - 35;
    ctx.fillStyle = '#8f95a7';
    ctx.font = '13.5px "JetBrains Mono", monospace';
    ctx.fillText('[即時人聲音準軌]', 12, vocalCenterY - 18);

    // 人聲波形歷史能量棒
    if (this.vocalWaveHistory.length > 0) {
      ctx.fillStyle = '#10b981';
      this.vocalWaveHistory.forEach(item => {
        const itemX = (item.time / totalDuration) * w;
        const barH = Math.min(25, (item.rms || 0.1) * 60);
        ctx.fillRect(itemX - 1, vocalCenterY - barH, 2.5, barH * 2);
      });
    }

    // 即時人聲音準走勢線
    if (this.pitchHistory.length > 1) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      let started = false;

      for (let i = 0; i < this.pitchHistory.length; i++) {
        const p = this.pitchHistory[i];
        if (p.midi) {
          const ptX = (p.time / totalDuration) * w;
          const ptY = vocalCenterY - ((p.midi - 55) / 30) * 20;
          if (!started) {
            ctx.moveTo(ptX, ptY);
            started = true;
          } else {
            ctx.lineTo(ptX, ptY);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();
    }

    // 4. 當前播放垂直指針 (Playhead Needle)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, h);
    ctx.stroke();

    // 指針頂部時間指示旗標
    ctx.fillStyle = '#10b981';
    const tagText = Utils.formatDuration(currentTime);
    ctx.fillRect(Math.max(0, Math.min(w - 56, playheadX - 25)), 0, 50, rulerHeight - 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(tagText, Math.max(25, Math.min(w - 25, playheadX)), rulerHeight - 10);
    ctx.textAlign = 'left';

    // 當前發聲音符提示
    if (currentPitch && currentPitch.note) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.fillText(`${currentPitch.note} (${currentPitch.freq}Hz)`, Math.min(w - 140, playheadX + 10), h - 14);
    }
  }
}

window.pitchScoring = new PitchScoring();

