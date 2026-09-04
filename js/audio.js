/**
 * SingStudio - 專業音訊工作站核心引擎 (Professional Audio Engine)
 * 遵循 OpenDesign 規範：零 Emoji、專業音訊架構、模組化分離
 * 
 * 核心升級：
 * 1. 移除音準打分與卡通評分，改為純粹專業即時音訊電平 (dB/RMS) 與時域振幅 (Oscillogram)
 * 2. 磁碟 temp_ 暫存機制：每段錄音即時寫入後端 temp_recordings/temp_*.webm，徹底杜絕瀏覽器 RAM 耗盡與卡死
 * 3. 支援接續錄製 (Punch-in / Resume Recording)：多段 Takes 自由拼接與覆蓋，毫秒級對齊
 * 4. 伴奏單獨播放即時時鐘推進，驅動時間軸與歌詞
 * 5. 多 Take 雙軌立體聲無損混音渲染 (OfflineAudioContext) 與 16-bit PCM WAV 匯出
 */

class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.micStream = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.activeTakeChunks = [];
    
    // 伴奏播放器
    this.backingAudio = new Audio();
    this.backingAudio.preload = 'auto';
    
    // 模式: 'local' | 'youtube' | 'demo'
    this.sourceMode = 'demo';
    
    // 伴奏數據與波形特徵
    this.currentBackingBlob = null;
    this.currentBackingUrl = null;
    this.waveformPeaks = null;
    this.backingDuration = 0;
    
    // 人聲片段 Takes (支援接續錄製)
    // 結構: [{ id: 1, startTime: 0, duration: 15.2, url: '/temp_recordings/...', blob, peaks: [] }]
    this.vocalTakes = [];
    this.currentTakeStartTime = 0;
    this.recordingStartTime = 0;
    this.recordedDuration = 0;
    
    // 錄製狀態: 待機、錄製中、暫停中
    this.isRecording = false;
    this.isPaused = false;
    
    // 伴奏獨立試聽狀態
    this.isBackingSoloPlaying = false;
    
    // 雙軌後製混音播放狀態
    this.isPlayingMix = false;
    this.mixCurrentTime = 0;
    this.mixSyncLoopId = null;
    this.vocalTakeAudios = []; // [{ take, audio }]
    
    // 混音與即時監聽參數
    this.latencyOffsetMs = -40; // 延遲校準 (毫秒)
    this.liveBackingVolume = 1.0; // 錄製即時伴奏音量 (0~1.5)
    this.backingVolume = 1.0;     // 後製混音導出伴奏音量 (預設同錄製時的設定)
    this.vocalVolume = 1.0;
    this.backingMuted = false;
    this.vocalMuted = false;
    this.reverbEnabled = true;

    // 即時耳返監聽 (Direct Monitoring) 參數
    this.isMonitoringEnabled = false;
    this.monitorVolume = 1.0;
    this.micSensitivity = 0.85; // 麥克風靈敏度 (預設 85%，可降低雜音)
    this.isNoiseFilterEnabled = true; // 85Hz 低頻風噪過濾
    this.micSourceNode = null;
    this.micGainNode = null;
    this.noiseFilterNode = null;
    this.monitorGainNode = null;

    // 方案 2: Web Audio 即時消音/去除中置人聲 (Center Channel Cancellation / OOPS)
    this.isVocalCancellationEnabled = false;
    this.backingSourceNode = null;
    this.backingGainNode = null;
    this.directBackingGain = null;
    this.vocalCancelBranchGain = null;
    
    // 即時音訊取樣緩衝區 (1024 點)
    this.bufferSize = 1024;
    this.timeData = new Float32Array(this.bufferSize);
  }

  async ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      try {
        this.audioCtx = new AudioCtxClass({
          latencyHint: 'interactive',
          sampleRate: 48000
        });
      } catch (e) {
        try {
          this.audioCtx = new AudioCtxClass({ latencyHint: 'interactive' });
        } catch (err) {
          this.audioCtx = new AudioCtxClass();
        }
      }
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * 初始化伴奏 Web Audio 節點鏈 (包含立體聲去人聲 DSP 模組)
   */
  initBackingAudioNodes() {
    if (this.backingSourceNode || !this.audioCtx || !this.backingAudio) return;

    try {
      this.backingSourceNode = this.audioCtx.createMediaElementSource(this.backingAudio);

      // 總輸出增益 (依據即時伴奏音量)
      this.backingGainNode = this.audioCtx.createGain();
      this.backingGainNode.gain.value = this.liveBackingVolume;

      // 1. 直通分支 (未開啟消音時使用)
      this.directBackingGain = this.audioCtx.createGain();
      this.directBackingGain.gain.value = this.isVocalCancellationEnabled ? 0.0 : 1.0;

      // 2. 去人聲處理分支 (OOPS 聲道差分網絡)
      this.vocalCancelBranchGain = this.audioCtx.createGain();
      this.vocalCancelBranchGain.gain.value = this.isVocalCancellationEnabled ? 1.0 : 0.0;

      // 分離左右聲道
      const splitter = this.audioCtx.createChannelSplitter(2);

      // 低頻保留濾波器 (保留 140Hz 以下大鼓與貝斯，避免聲音單薄)
      const lpFilterL = this.audioCtx.createBiquadFilter();
      lpFilterL.type = 'lowpass';
      lpFilterL.frequency.value = 140;

      const lpFilterR = this.audioCtx.createBiquadFilter();
      lpFilterR.type = 'lowpass';
      lpFilterR.frequency.value = 140;

      // 中高頻差分濾波器 (人聲主要分佈頻段 140Hz ~ 6kHz)
      const hpFilterL = this.audioCtx.createBiquadFilter();
      hpFilterL.type = 'highpass';
      hpFilterL.frequency.value = 140;

      const hpFilterR = this.audioCtx.createBiquadFilter();
      hpFilterR.type = 'highpass';
      hpFilterR.frequency.value = 140;

      // 反相器：Right 聲道乘上 -1 (使得 L + (-R) = L - R，抵消正中央人聲)
      const inverterR = this.audioCtx.createGain();
      inverterR.gain.value = -1;

      // 差分疊加
      const diffSum = this.audioCtx.createGain();
      diffSum.gain.value = 0.8;
      hpFilterL.connect(diffSum);
      hpFilterR.connect(inverterR);
      inverterR.connect(diffSum);

      // 低頻大鼓/貝斯還原 (單聲道合成，加強厚度)
      splitter.connect(lpFilterL, 0);
      splitter.connect(lpFilterR, 1);
      const bassSum = this.audioCtx.createGain();
      bassSum.gain.value = 0.55;
      lpFilterL.connect(bassSum);
      lpFilterR.connect(bassSum);

      // 合成至雙聲道輸出
      const merger = this.audioCtx.createChannelMerger(2);

      // 左聲道: (L - R) + Bass
      diffSum.connect(merger, 0, 0);
      bassSum.connect(merger, 0, 0);

      // 右聲道: -(L - R) + Bass
      const diffInv = this.audioCtx.createGain();
      diffInv.gain.value = -1;
      diffSum.connect(diffInv);
      diffInv.connect(merger, 0, 1);
      bassSum.connect(merger, 0, 1);

      // 串接路由
      this.vocalCancelBranchGain.connect(splitter);
      splitter.connect(hpFilterL, 0);
      splitter.connect(hpFilterR, 1);

      this.backingSourceNode.connect(this.directBackingGain);
      this.backingSourceNode.connect(this.vocalCancelBranchGain);

      this.directBackingGain.connect(this.backingGainNode);
      merger.connect(this.backingGainNode);

      this.backingGainNode.connect(this.audioCtx.destination);
    } catch (e) {
      console.warn('MediaElementSource initialization:', e);
    }
  }

  /**
   * 開啟或關閉即時去人聲 (方案 2: OOPS)
   */
  setVocalCancellation(enabled) {
    this.isVocalCancellationEnabled = !!enabled;
    this.initBackingAudioNodes();

    if (this.directBackingGain && this.vocalCancelBranchGain) {
      if (this.isVocalCancellationEnabled) {
        this.directBackingGain.gain.value = 0.0;
        this.vocalCancelBranchGain.gain.value = 1.0;
      } else {
        this.directBackingGain.gain.value = 1.0;
        this.vocalCancelBranchGain.gain.value = 0.0;
      }
    }
    return this.isVocalCancellationEnabled;
  }

  toggleVocalCancellation() {
    return this.setVocalCancellation(!this.isVocalCancellationEnabled);
  }

  async initMicrophone() {
    await this.ensureAudioContext();
    if (this.micStream && this.analyser) return;

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false, // 建議戴耳機，保留原生動態
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          latency: 0,
          sampleRate: 48000,
          // 關閉 Chromium 底層 WebRTC 軟體 DSP 緩衝管線，直接接管硬體原生音訊，實現極限超低延遲
          googEchoCancellation: false,
          googAutoGainControl: false,
          googNoiseSuppression: false,
          googHighpassFilter: false,
          googTypingNoiseDetection: false,
          googAudioMirroring: false
        },
        video: false
      });

      const source = this.audioCtx.createMediaStreamSource(this.micStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = this.bufferSize;
      source.connect(this.analyser);

      // 建立耳機即時耳返通道 (Direct Monitoring)
      this.micSourceNode = source;
      if (!this.monitorGainNode) {
        this.monitorGainNode = this.audioCtx.createGain();
      }
      this.monitorGainNode.gain.value = this.isMonitoringEnabled ? this.monitorVolume : 0;
      this.micSourceNode.connect(this.monitorGainNode);
      this.monitorGainNode.connect(this.audioCtx.destination);
    } catch (err) {
      console.error('麥克風存取失敗:', err);
      throw new Error('無法存取麥克風，請檢查瀏覽器麥克風權限並使用耳機。');
    }
  }

  /**
   * 更新耳返音訊過濾路由
   */
  updateMonitorRouting() {
    if (!this.micGainNode || !this.monitorGainNode || !this.noiseFilterNode) return;
    try {
      this.micGainNode.disconnect(this.monitorGainNode);
      this.micGainNode.disconnect(this.noiseFilterNode);
      this.noiseFilterNode.disconnect(this.monitorGainNode);

      if (this.isNoiseFilterEnabled) {
        this.micGainNode.connect(this.noiseFilterNode);
        this.noiseFilterNode.connect(this.monitorGainNode);
      } else {
        this.micGainNode.connect(this.monitorGainNode);
      }
    } catch (e) {
      // 忽略初次未連接時的 disconnect 警告
    }
  }

  /**
   * 設定麥克風輸入靈敏度 (0.1 ~ 1.5, 預設 0.85)
   */
  setMicSensitivity(val) {
    this.micSensitivity = Math.max(0.05, Math.min(2.0, val));
    if (this.micGainNode) {
      this.micGainNode.gain.value = this.micSensitivity;
    }
  }

  /**
   * 開啟或關閉耳返雜音高通濾波
   */
  setNoiseFilter(enabled) {
    this.isNoiseFilterEnabled = !!enabled;
    this.updateMonitorRouting();
  }

  /**
   * 設定即時伴奏音量 (錄製/試聽隨時生效，並自動同步為導出混音預設值)
   */
  setLiveBackingVolume(vol) {
    this.liveBackingVolume = Math.max(0, Math.min(1.5, vol));
    this.backingVolume = this.liveBackingVolume; // 同步做為後製混音與導出的預設音量

    // 1. YouTube 伴奏即時音量 (0~100)
    if (window.youtubeManager) {
      window.youtubeManager.setVolume(this.liveBackingVolume * 100);
    }

    // 2. 本地/示範伴奏 Web Audio 節點與 HTML5 Audio
    if (this.backingGainNode) {
      this.backingGainNode.gain.value = this.liveBackingVolume;
      if (this.backingAudio) {
        this.backingAudio.volume = 1.0;
      }
    } else if (this.backingAudio) {
      this.backingAudio.volume = Math.max(0, Math.min(1.0, this.liveBackingVolume));
    }
  }

  /**
   * 開啟或關閉即時耳返 (Direct Monitoring)
   */
  setDirectMonitoring(enabled) {
    this.isMonitoringEnabled = !!enabled;
    if (this.monitorGainNode) {
      this.monitorGainNode.gain.value = this.isMonitoringEnabled ? this.monitorVolume : 0;
    }
  }

  /**
   * 調節即時耳返人聲音量
   */
  setMonitorVolume(vol) {
    this.monitorVolume = Math.max(0, Math.min(1.5, vol));
    if (this.monitorGainNode && this.isMonitoringEnabled) {
      this.monitorGainNode.gain.value = this.monitorVolume;
    }
  }

  /**
   * 取得即時人聲音訊電平 (dB / RMS) 與時域振幅波形
   */
  getLiveAudioData() {
    if (!this.analyser) {
      return { rms: 0, peakDb: -60, peak: 0, timeDomain: null };
    }

    this.analyser.getFloatTimeDomainData(this.timeData);
    let sum = 0;
    let peak = 0;

    for (let i = 0; i < this.bufferSize; i++) {
      const val = this.timeData[i];
      sum += val * val;
      const absVal = Math.abs(val);
      if (absVal > peak) peak = absVal;
    }

    const rms = Math.sqrt(sum / this.bufferSize);
    const peakDb = peak > 0.0001 ? Math.max(-60, 20 * Math.log10(peak)) : -60;

    return {
      rms: rms,
      peakDb: peakDb,
      peak: peak,
      timeDomain: this.timeData
    };
  }

  /**
   * 上傳錄音分段至後端磁碟暫存 (temp_recordings/)
   */
  async uploadTempTake(blob, filename) {
    try {
      const resp = await fetch('/api/temp/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/webm',
          'X-Temp-Filename': filename
        },
        body: blob
      });

      if (resp.ok) {
        const data = await resp.json();
        return data.url;
      }
    } catch (e) {
      console.warn('後端磁碟暫存寫入失敗，使用瀏覽器 RAM Blob 作為備援:', e);
    }
    return URL.createObjectURL(blob);
  }

  /**
   * 從音訊 Blob/File 解碼提取波形 Peaks (800 點)
   */
  async extractWaveformPeaks(fileOrBlob, numPeaks = 800) {
    try {
      await this.ensureAudioContext();
      let arrayBuffer;
      if (fileOrBlob instanceof Blob || fileOrBlob instanceof File) {
        arrayBuffer = await fileOrBlob.arrayBuffer();
      } else if (fileOrBlob instanceof ArrayBuffer) {
        arrayBuffer = fileOrBlob;
      } else {
        return null;
      }

      const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer.slice(0));
      const channelData = audioBuffer.getChannelData(0);
      const step = Math.max(1, Math.floor(channelData.length / numPeaks));
      const peaks = new Float32Array(numPeaks);

      for (let i = 0; i < numPeaks; i++) {
        let maxVal = 0;
        const start = i * step;
        const end = Math.min(channelData.length, start + step);
        for (let j = start; j < end; j++) {
          const abs = Math.abs(channelData[j]);
          if (abs > maxVal) maxVal = abs;
        }
        peaks[i] = Math.min(1.0, maxVal * 1.25);
      }

      return {
        peaks: peaks,
        duration: audioBuffer.duration
      };
    } catch (err) {
      console.warn('波形解碼錯誤:', err);
      return null;
    }
  }

  /**
   * 載入本地伴奏
   */
  async loadBackingTrack(file) {
    await this.ensureAudioContext();
    this.currentBackingBlob = file;
    if (this.currentBackingUrl) URL.revokeObjectURL(this.currentBackingUrl);
    this.currentBackingUrl = URL.createObjectURL(file);
    this.backingAudio.src = this.currentBackingUrl;

    const waveResult = await this.extractWaveformPeaks(file, 800);
    if (waveResult) {
      this.waveformPeaks = waveResult.peaks;
      this.backingDuration = waveResult.duration;
    } else {
      await new Promise(resolve => {
        this.backingAudio.onloadedmetadata = () => {
          this.backingDuration = this.backingAudio.duration || 60;
          resolve();
        };
      });
    }

    this.sourceMode = 'local';
    this.initBackingAudioNodes();
    this.setLiveBackingVolume(this.liveBackingVolume);
    return this.backingDuration;
  }

  /**
   * 合成內建示範伴奏 (56秒 卡農和弦)
   */
  async generateDemoBackingTrack() {
    await this.ensureAudioContext();
    const sampleRate = 44100;
    const duration = 56;
    const totalSamples = sampleRate * duration;
    const buffer = this.audioCtx.createBuffer(2, totalSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const chords = [
      [261.63, 329.63, 392.00], // C
      [196.00, 246.94, 293.66], // G
      [220.00, 261.63, 329.63], // Am
      [164.81, 196.00, 246.94], // Em
      [174.61, 220.00, 261.63], // F
      [130.81, 164.81, 196.00], // C
      [174.61, 220.00, 261.63], // F
      [196.00, 246.94, 293.66]  // G
    ];

    const chordDuration = 4.0;
    const samplesPerChord = Math.floor(sampleRate * chordDuration);

    for (let i = 0; i < totalSamples; i++) {
      const chordIdx = Math.floor(i / samplesPerChord) % chords.length;
      const notes = chords[chordIdx];
      const t = i / sampleRate;

      let sample = 0;
      for (let n = 0; n < notes.length; n++) {
        const freq = notes[n];
        const osc = Math.sin(2 * Math.PI * freq * t) * 0.15;
        const env = Math.exp(-((t % 0.5) * 4));
        sample += osc * (0.6 + 0.4 * env);
      }

      left[i] = sample;
      right[i] = sample * 0.95;
    }

    const wavBlob = this.audioBufferToWavBlob(buffer);
    this.currentBackingBlob = wavBlob;
    if (this.currentBackingUrl) URL.revokeObjectURL(this.currentBackingUrl);
    this.currentBackingUrl = URL.createObjectURL(wavBlob);
    this.backingAudio.src = this.currentBackingUrl;
    this.backingDuration = duration;

    const waveResult = await this.extractWaveformPeaks(wavBlob, 800);
    if (waveResult) {
      this.waveformPeaks = waveResult.peaks;
    }

    this.sourceMode = 'demo';
    this.initBackingAudioNodes();
    this.setLiveBackingVolume(this.liveBackingVolume);
    return duration;
  }

  // ==========================================================================
  // 伴奏獨立試聽播放器 (時間軸連動)
  // ==========================================================================
  playBackingOnly(startAtSec = 0) {
    this.ensureAudioContext();
    this.initBackingAudioNodes();
    this.setLiveBackingVolume(this.liveBackingVolume);
    if (this.sourceMode === 'youtube' && window.youtubeManager) {
      window.youtubeManager.seekTo(startAtSec);
      window.youtubeManager.play();
    } else if (this.backingAudio.src) {
      this.backingAudio.currentTime = Math.max(0, startAtSec);
      this.backingAudio.play().catch(e => console.warn(e));
    }
    this.isBackingSoloPlaying = true;
  }

  pauseBackingOnly() {
    if (this.sourceMode === 'youtube' && window.youtubeManager) {
      window.youtubeManager.pause();
    } else if (this.backingAudio.src) {
      this.backingAudio.pause();
    }
    this.isBackingSoloPlaying = false;
  }

  toggleBackingOnly() {
    if (this.isBackingSoloPlaying) {
      this.pauseBackingOnly();
      return false;
    } else {
      const cur = this.getCurrentTime();
      this.playBackingOnly(cur);
      return true;
    }
  }

  seekBackingOnly(targetSec) {
    if (this.sourceMode === 'youtube' && window.youtubeManager) {
      window.youtubeManager.seekTo(targetSec);
    } else if (this.backingAudio.src) {
      this.backingAudio.currentTime = Math.max(0, targetSec);
    }
  }

  // ==========================================================================
  // 錄製流程：開始 / 暫停 / 接續錄製 (Punch-in) / 停止 / Take 編輯
  // ==========================================================================

  /**
   * 開始或接續錄製
   * @param {number} atTimeSec - 起始時間戳 (支援接續錄製)
   * @param {number|null} limitDuration - 限制錄製時長 (用於「僅重錄此段」，達時長自動停止)
   */
  async startSinging(atTimeSec = 0, limitDuration = null) {
    await this.initMicrophone();
    this.pauseBackingOnly();
    this.stopMixedPreview();

    // 接續錄製 (Punch-in)：保留所有先前與後續 Takes，不強制覆蓋
    if (atTimeSec === 0 && !this.isPaused && this.vocalTakes.length === 0) {
      this.vocalTakes = [];
    }

    this.currentTakeStartTime = Math.max(0, atTimeSec);
    this.punchInEndLimit = limitDuration ? (this.currentTakeStartTime + limitDuration) : null;
    this.activeTakeChunks = [];
    this.recordingStartTime = performance.now() - (this.currentTakeStartTime * 1000);

    // 啟動 MediaRecorder
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
    }

    this.mediaRecorder = new MediaRecorder(this.micStream, {
      mimeType: mimeType,
      audioBitsPerSecond: 256000
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.activeTakeChunks.push(e.data);
      }
    };

    // 啟動伴奏同步播放
    this.initBackingAudioNodes();
    this.setLiveBackingVolume(this.liveBackingVolume);
    if (this.sourceMode === 'youtube' && window.youtubeManager) {
      window.youtubeManager.seekTo(this.currentTakeStartTime);
      window.youtubeManager.play();
    } else if (this.backingAudio.src) {
      this.backingAudio.currentTime = this.currentTakeStartTime;
      this.backingAudio.play().catch(e => console.warn(e));
    }

    this.mediaRecorder.start(100);
    this.isRecording = true;
    this.isPaused = false;
  }

  /**
   * 暫停錄製 (保存目前 Take 並寫入磁碟 temp_ 暫存)
   */
  async pauseSinging() {
    if (!this.isRecording || !this.mediaRecorder) return;

    // 暫停伴奏
    if (this.sourceMode === 'youtube' && window.youtubeManager) {
      window.youtubeManager.pause();
    } else if (this.backingAudio.src) {
      this.backingAudio.pause();
    }

    const currentClockTime = this.getCurrentTime();
    let takeDuration = Math.max(0.1, currentClockTime - this.currentTakeStartTime);
    
    // 若有設定限制終點，時長上限為該範圍
    if (this.punchInEndLimit && this.currentTakeStartTime + takeDuration > this.punchInEndLimit) {
      takeDuration = Math.max(0.1, this.punchInEndLimit - this.currentTakeStartTime);
    }

    // 停止 MediaRecorder 並封裝 Take
    await new Promise((resolve) => {
      this.mediaRecorder.onstop = async () => {
        const takeBlob = new Blob(this.activeTakeChunks, { type: this.mediaRecorder.mimeType || 'audio/webm' });
        const tempName = `temp_vocal_${Date.now()}_take${this.vocalTakes.length + 1}.webm`;

        // 上傳至本機磁碟 temp_ 暫存目錄
        const tempUrl = await this.uploadTempTake(takeBlob, tempName);

        // 提取此 Take 的波形
        const wave = await this.extractWaveformPeaks(takeBlob, 120);

        this.vocalTakes.push({
          id: `Take_${this.vocalTakes.length + 1}`,
          startTime: this.currentTakeStartTime,
          duration: takeDuration,
          blob: takeBlob,
          url: tempUrl,
          peaks: wave ? wave.peaks : null
        });

        // 依時間排序並重新指派序號，確保 Take 序號連續
        this.reindexTakes();

        this.activeTakeChunks = [];
        this.punchInEndLimit = null;
        resolve();
      };
      this.mediaRecorder.stop();
    });

    this.isRecording = false;
    this.isPaused = true;
    this.recordedDuration = Math.max(this.recordedDuration, currentClockTime);
    return this.vocalTakes;
  }

  /**
   * 重新排序並命名 Takes
   */
  reindexTakes() {
    this.vocalTakes.sort((a, b) => a.startTime - b.startTime);
    this.vocalTakes.forEach((t, idx) => {
      t.id = `Take_${idx + 1}`;
    });
  }

  /**
   * 刪除指定 Take
   */
  deleteTake(takeId) {
    this.vocalTakes = this.vocalTakes.filter(t => t.id !== takeId);
    this.reindexTakes();
    return this.vocalTakes;
  }

  /**
   * 僅重錄此段 Take (自動限制起始與結束時間，避免覆蓋別段)
   */
  async reRecordTake(takeId) {
    const targetTake = this.vocalTakes.find(t => t.id === takeId);
    if (!targetTake) return;

    const startSec = targetTake.startTime;
    const durSec = targetTake.duration;

    // 先移除舊的 Take
    this.deleteTake(takeId);

    // 以其原始時長啟動限時錄製
    await this.startSinging(startSec, durSec);
  }

  /**
   * 停止並完成演唱 (結束錄音，返回完整結果)
   */
  async stopSinging() {
    if (this.isRecording) {
      await this.pauseSinging();
    }

    this.isRecording = false;
    this.isPaused = false;

    // 停止伴奏
    if (this.sourceMode === 'youtube' && window.youtubeManager) {
      window.youtubeManager.pause();
    } else if (this.backingAudio.src) {
      this.backingAudio.pause();
    }

    // 計算總錄製長度
    let maxTakeEnd = 0;
    this.vocalTakes.forEach(t => {
      const end = t.startTime + t.duration;
      if (end > maxTakeEnd) maxTakeEnd = end;
    });

    this.recordedDuration = Math.max(maxTakeEnd, this.backingDuration || 0);

    return {
      duration: this.recordedDuration,
      takes: this.vocalTakes,
      backingBlob: this.currentBackingBlob
    };
  }

  resetRecording() {
    this.vocalTakes = [];
    this.isRecording = false;
    this.isPaused = false;
    this.recordedDuration = 0;
    this.stopMixedPreview();
  }

  getCurrentTime() {
    if (this.sourceMode === 'youtube' && window.youtubeManager) {
      const ytTime = window.youtubeManager.getCurrentTime();
      if (ytTime > 0 || this.isRecording) return ytTime;
    }
    if (this.isRecording) {
      return Math.max(0, (performance.now() - this.recordingStartTime) / 1000);
    }
    return this.backingAudio.currentTime || 0;
  }

  getReviewDuration() {
    return this.recordedDuration > 0 ? this.recordedDuration : (this.backingDuration || 60);
  }

  // ==========================================================================
  // 後製雙軌混音同步播放控制 (支援多 Takes)
  // ==========================================================================

  initVocalTakeAudios() {
    this.vocalTakeAudios = this.vocalTakes.map(take => {
      const a = new Audio(take.url);
      a.preload = 'auto';
      return { take, audio: a };
    });
  }

  async toggleMixedPreview() {
    if (this.isPlayingMix) {
      this.pauseMixedPreview();
      return false;
    } else {
      await this.playMixedPreview(this.mixCurrentTime);
      return true;
    }
  }

  async playMixedPreview(startAtSec = 0) {
    await this.ensureAudioContext();
    this.stopMixedPreview();
    this.initVocalTakeAudios();

    this.mixCurrentTime = Math.max(0, startAtSec);
    const offsetSec = (this.latencyOffsetMs || 0) / 1000;

    // 1. 伴奏播放
    if (this.sourceMode === 'youtube' && window.youtubeManager) {
      window.youtubeManager.seekTo(this.mixCurrentTime);
      window.youtubeManager.play();
    } else if (this.backingAudio.src) {
      this.backingAudio.currentTime = this.mixCurrentTime;
      this.backingAudio.volume = this.backingMuted ? 0 : this.backingVolume;
      this.backingAudio.play().catch(e => console.warn(e));
    }

    // 2. 多 Takes 人聲同步排程
    this.vocalTakeAudios.forEach(({ take, audio }) => {
      audio.volume = this.vocalMuted ? 0 : Math.min(1.0, this.vocalVolume);
      const alignedStart = Math.max(0, take.startTime + offsetSec);
      const alignedEnd = alignedStart + take.duration;

      if (this.mixCurrentTime >= alignedStart && this.mixCurrentTime < alignedEnd) {
        audio.currentTime = this.mixCurrentTime - alignedStart;
        audio.play().catch(e => console.warn(e));
      }
    });

    this.isPlayingMix = true;
    this.startMixSyncMonitor();
  }

  pauseMixedPreview() {
    this.isPlayingMix = false;
    if (this.mixSyncLoopId) {
      cancelAnimationFrame(this.mixSyncLoopId);
      this.mixSyncLoopId = null;
    }

    if (this.sourceMode === 'youtube' && window.youtubeManager) {
      window.youtubeManager.pause();
    } else if (this.backingAudio.src) {
      this.backingAudio.pause();
    }

    this.vocalTakeAudios.forEach(({ audio }) => audio.pause());
  }

  stopMixedPreview() {
    this.pauseMixedPreview();
    this.mixCurrentTime = 0;
  }

  seekMixedPreview(targetSec) {
    this.mixCurrentTime = Math.max(0, Math.min(this.getReviewDuration(), targetSec));
    const offsetSec = (this.latencyOffsetMs || 0) / 1000;

    if (this.sourceMode === 'youtube' && window.youtubeManager) {
      window.youtubeManager.seekTo(this.mixCurrentTime);
    } else if (this.backingAudio.src) {
      this.backingAudio.currentTime = this.mixCurrentTime;
    }

    this.vocalTakeAudios.forEach(({ take, audio }) => {
      const alignedStart = Math.max(0, take.startTime + offsetSec);
      const alignedEnd = alignedStart + take.duration;

      if (this.mixCurrentTime >= alignedStart && this.mixCurrentTime < alignedEnd) {
        audio.currentTime = this.mixCurrentTime - alignedStart;
        if (this.isPlayingMix) audio.play().catch(e => console.warn(e));
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  }

  setLatencyOffset(newOffsetMs) {
    this.latencyOffsetMs = newOffsetMs;
    if (this.isPlayingMix) {
      this.seekMixedPreview(this.mixCurrentTime);
    }
  }

  startMixSyncMonitor() {
    let lastTime = performance.now();

    const monitor = () => {
      if (!this.isPlayingMix) return;

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      this.mixCurrentTime += dt;
      const totalDur = this.getReviewDuration();

      // 檢查每個 Take 是否該在此時間點觸發播放
      const offsetSec = (this.latencyOffsetMs || 0) / 1000;
      this.vocalTakeAudios.forEach(({ take, audio }) => {
        const alignedStart = Math.max(0, take.startTime + offsetSec);
        const alignedEnd = alignedStart + take.duration;

        if (this.mixCurrentTime >= alignedStart && this.mixCurrentTime < alignedEnd) {
          if (audio.paused) {
            audio.currentTime = Math.max(0, this.mixCurrentTime - alignedStart);
            audio.play().catch(e => console.warn(e));
          }
        } else {
          if (!audio.paused) {
            audio.pause();
          }
        }
      });

      if (this.mixCurrentTime >= totalDur) {
        this.stopMixedPreview();
        return;
      }

      this.mixSyncLoopId = requestAnimationFrame(monitor);
    };

    this.mixSyncLoopId = requestAnimationFrame(monitor);
  }

  // ==========================================================================
  // 多軌無損混音渲染與 WAV 匯出
  // ==========================================================================
  async exportMixedWavBlob() {
    await this.ensureAudioContext();
    const sampleRate = 44100;
    const totalDuration = this.getReviewDuration();
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * totalDuration), sampleRate);

    // 1. 解碼伴奏軌
    if (this.currentBackingBlob) {
      try {
        const backingArray = await this.currentBackingBlob.arrayBuffer();
        const backingBuffer = await this.audioCtx.decodeAudioData(backingArray.slice(0));
        const bSource = offlineCtx.createBufferSource();
        const bGain = offlineCtx.createGain();
        bSource.buffer = backingBuffer;
        bGain.gain.value = this.backingMuted ? 0 : this.backingVolume;
        bSource.connect(bGain);
        bGain.connect(offlineCtx.destination);
        bSource.start(0);
      } catch (e) {
        console.warn('伴奏解碼渲染失敗:', e);
      }
    }

    // 2. 解碼多段 Vocal Takes
    const offsetSec = (this.latencyOffsetMs || 0) / 1000;

    for (const take of this.vocalTakes) {
      try {
        const vArray = await take.blob.arrayBuffer();
        const vBuffer = await this.audioCtx.decodeAudioData(vArray.slice(0));

        const vSource = offlineCtx.createBufferSource();
        const vGain = offlineCtx.createGain();
        vSource.buffer = vBuffer;
        vGain.gain.value = this.vocalMuted ? 0 : this.vocalVolume;

        const alignedStart = Math.max(0, take.startTime + offsetSec);

        // KTV 殘響混響 (Reverb)
        if (this.reverbEnabled) {
          const convolver = offlineCtx.createConvolver();
          convolver.buffer = this.createSyntheticImpulse(offlineCtx, 1.5, 2.2);
          const wetGain = offlineCtx.createGain();
          wetGain.gain.value = 0.22;
          vSource.connect(convolver);
          convolver.connect(wetGain);
          wetGain.connect(offlineCtx.destination);
        }

        vSource.connect(vGain);
        vGain.connect(offlineCtx.destination);
        vSource.start(alignedStart);
      } catch (e) {
        console.warn(`Take ${take.id} 解碼渲染失敗:`, e);
      }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return this.audioBufferToWavBlob(renderedBuffer);
  }

  createSyntheticImpulse(ctx, duration = 1.5, decay = 2.0) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = (1 - i / length) ** decay;
      left[i] = (Math.random() * 2 - 1) * n;
      right[i] = (Math.random() * 2 - 1) * n;
    }
    return impulse;
  }

  audioBufferToWavBlob(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const samplesCount = buffer.length;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samplesCount * blockAlign;
    const bufferLength = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    const channels = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    let offset = 44;
    for (let i = 0; i < samplesCount; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = Math.max(-1, Math.min(1, channels[c][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

window.audioEngine = new AudioEngine();
