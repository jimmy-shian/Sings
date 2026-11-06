import { useState, useRef, useCallback, useEffect } from 'react';
import type { VocalTake, AudioState } from '../types';
import { createPitchShifterNode } from '../utils/pitchWorklet';

export function useAudioEngine() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const backingAudioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const backingObjectUrlRef = useRef<string | null>(null);
  const recordingBackingEnabledRef = useRef(true);
  const finishResolveRef = useRef<(() => void) | null>(null);
  const discardActiveTakeRef = useRef(false);

  const [audioState, setAudioState] = useState<AudioState>({
    isRecording: false,
    isPaused: false,
    isBackingSoloPlaying: false,
    isPlayingMix: false,
    sourceMode: 'local',
    currentBackingUrl: null,
    backingDuration: 0,
    currentTime: 0,
    liveBackingVolume: 1.0,
    backingVolume: 1.0,
    vocalVolume: 1.0,
    backingMuted: false,
    vocalMuted: false,
    reverbEnabled: true,
    latencyOffsetMs: -40,
    isVocalCancellationEnabled: false,
    isMonitoringEnabled: false,
    monitorVolume: 1.0,
    micSensitivity: 0.85,
    isNoiseFilterEnabled: true,
    playbackRate: 1,
    pitchSemitones: 0,
  });

  const [vocalTakes, setVocalTakes] = useState<VocalTake[]>([]);
  const [waveformPeaks, setWaveformPeaks] = useState<Float32Array | null>(null);
  const [inputLevel, setInputLevel] = useState(-60);
  const [liveVocalWave, setLiveVocalWave] = useState<Float32Array | null>(null);
  const [currentBackingBlob, setCurrentBackingBlob] = useState<Blob | null>(null);
  const [mixCurrentTime, setMixCurrentTime] = useState(0);
  const vocalTakesRef = useRef<VocalTake[]>([]);

  const activeTakeChunksRef = useRef<Blob[]>([]);
  const recordingActiveDurationRef = useRef(0);
  const recordingSegmentStartedAtRef = useRef(0);
  const currentTakeStartTimeRef = useRef(0);
  const reRecordLimitTimerRef = useRef<any>(null);
  const reRecordRemainingMsRef = useRef<number | null>(null);
  const reRecordTimerStartRef = useRef(0);
  const animationFrameRef = useRef<number>(0);
  const levelUpdateRef = useRef<(() => void) | null>(null);
  const timeDataRef = useRef<Float32Array>(new Float32Array(1024));
  const previewAudiosRef = useRef<{ id: number; audio: HTMLAudioElement; startTime: number; duration: number }[]>([]);
  const previewBackingRef = useRef<HTMLAudioElement | null>(null);
  const previewBackingUrlRef = useRef<string | null>(null);
  const previewRafRef = useRef<number | null>(null);
  const previewStartStampRef = useRef<number>(0);
  const previewStartOffsetRef = useRef<number>(0);

  // 變速 / 升降 KEY：伴奏元素經 Web Audio 圖路由，pitch=0 時直通（bypass）
  const elementSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const pitchNodeRef = useRef<AudioWorkletNode | null>(null);
  const backingMasterGainRef = useRef<GainNode | null>(null);
  const playbackRateRef = useRef(1);
  const pitchSemitonesRef = useRef(0);

  useEffect(() => {
    vocalTakesRef.current = vocalTakes;
  }, [vocalTakes]);

  useEffect(() => {
    const element = backingAudioRef.current;
    if (!element) return;
    const onPlay = () => setAudioState(prev => ({ ...prev, isBackingSoloPlaying: true }));
    const onPause = () => setAudioState(prev => ({ ...prev, isBackingSoloPlaying: false }));
    const onEnded = () => setAudioState(prev => ({ ...prev, isBackingSoloPlaying: false, currentTime: element.duration || prev.currentTime }));
    element.addEventListener('play', onPlay);
    element.addEventListener('pause', onPause);
    element.addEventListener('ended', onEnded);
    return () => {
      element.removeEventListener('play', onPlay);
      element.removeEventListener('pause', onPause);
      element.removeEventListener('ended', onEnded);
    };
  }, []);

  // 初始化 AudioContext
  const ensureAudioContext = useCallback(async () => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      try {
        audioCtxRef.current = new AudioCtxClass({
          latencyHint: 'interactive',
          sampleRate: 48000,
        });
      } catch (e) {
        audioCtxRef.current = new AudioCtxClass({ latencyHint: 'interactive' });
      }
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // 16-bit PCM WAV 編碼器
  const audioBufferToWavBlob = useCallback((buffer: AudioBuffer): Blob => {
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

    const writeString = (v: DataView, offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        v.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    const channels: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    let offset = 44;
    for (let i = 0; i < samplesCount; i++) {
      for (let c = 0; c < numChannels; c++) {
        const sample = Math.max(-1, Math.min(1, channels[c][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }, []);

  // 提取波形峰值
  const extractWaveformPeaks = useCallback(async (blob: Blob, numPoints = 800): Promise<Float32Array | null> => {
    try {
      const ctx = await ensureAudioContext();
      const arrayBuf = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
      const channelData = audioBuffer.getChannelData(0);
      const blockSize = Math.floor(channelData.length / numPoints);
      const peaks = new Float32Array(numPoints);

      for (let i = 0; i < numPoints; i++) {
        const start = i * blockSize;
        let max = 0;
        for (let j = 0; j < blockSize; j++) {
          const val = Math.abs(channelData[start + j]);
          if (val > max) max = val;
        }
        peaks[i] = max;
      }
      return peaks;
    } catch (e) {
      console.warn('提取波形失敗:', e);
      return null;
    }
  }, [ensureAudioContext]);

  // 載入本地伴奏檔案
  const loadBackingTrack = useCallback(async (file: File | Blob): Promise<number> => {
    await ensureAudioContext();
    setCurrentBackingBlob(file);
    const url = URL.createObjectURL(file);

    const element = backingAudioRef.current || new Audio();
    backingAudioRef.current = element;
    element.pause();
    if (backingObjectUrlRef.current) URL.revokeObjectURL(backingObjectUrlRef.current);
    backingObjectUrlRef.current = url;
    element.src = url;
    element.load();
    // 變速：保持音高（preservesPitch），升降 KEY 由 Web Audio 圖處理
    element.preservesPitch = true;
    (element as any).webkitPreservesPitch = true;
    element.playbackRate = playbackRateRef.current;

    const peaks = await extractWaveformPeaks(file, 800);
    setWaveformPeaks(peaks);

    const dur = await new Promise<number>((resolve, reject) => {
      const onLoaded = () => {
        element.removeEventListener('loadedmetadata', onLoaded);
        element.removeEventListener('error', onError);
        if (Number.isFinite(element.duration) && element.duration > 0) resolve(element.duration);
        else reject(new Error('音訊檔案沒有有效的播放長度'));
      };
      const onError = () => {
        element.removeEventListener('loadedmetadata', onLoaded);
        element.removeEventListener('error', onError);
        reject(new Error('瀏覽器無法解碼此音訊檔案'));
      };
      if (element.readyState >= HTMLMediaElement.HAVE_METADATA) {
        onLoaded();
      } else {
        element.addEventListener('loadedmetadata', onLoaded, { once: true });
        element.addEventListener('error', onError, { once: true });
      }
    });

    setAudioState(prev => ({
      ...prev,
      sourceMode: 'local',
      currentBackingUrl: url,
      backingDuration: dur,
      currentTime: 0,
    }));

    return dur;
  }, [ensureAudioContext, extractWaveformPeaks]);

  const clearBackingTrack = useCallback(() => {
    const element = backingAudioRef.current;
    if (element) {
      element.pause();
      element.removeAttribute('src');
      element.load();
    }
    if (backingObjectUrlRef.current) URL.revokeObjectURL(backingObjectUrlRef.current);
    backingObjectUrlRef.current = null;
    setCurrentBackingBlob(null);
    setWaveformPeaks(null);
    setAudioState(prev => ({ ...prev, currentBackingUrl: null, backingDuration: 0, currentTime: 0, isBackingSoloPlaying: false }));
  }, []);

  const replaceVocalTakes = useCallback((takes: VocalTake[]) => {
    setVocalTakes(prev => {
      for (const take of prev) if (!takes.some(next => next.id === take.id)) URL.revokeObjectURL(take.url);
      return takes;
    });
  }, []);

  // ---- 變速 / 升降 KEY：伴奏元素 → (PitchWorklet) → MasterGain → 輸出 ----

  // 建立伴奏元素的 Web Audio 圖（每個元素只能建一次 MediaElementSource，之後固定走圖）
  const ensurePitchGraph = useCallback(async (): Promise<boolean> => {
    const ctx = await ensureAudioContext();
    const element = backingAudioRef.current;
    if (!ctx || !element) return false;
    if (!elementSourceRef.current) {
      try {
        elementSourceRef.current = ctx.createMediaElementSource(element);
        backingMasterGainRef.current = ctx.createGain();
        elementSourceRef.current.connect(backingMasterGainRef.current);
        backingMasterGainRef.current.connect(ctx.destination);
      } catch (e) {
        console.warn('建立伴奏音訊圖失敗:', e);
        return false;
      }
    }
    if (!pitchNodeRef.current) {
      try {
        pitchNodeRef.current = await createPitchShifterNode(ctx);
        const param = pitchNodeRef.current.parameters.get('semitones');
        param?.setValueAtTime(pitchSemitonesRef.current, ctx.currentTime);
      } catch (e) {
        console.warn('載入升降 KEY 處理器失敗:', e);
        pitchNodeRef.current = null;
        return false;
      }
    }
    return true;
  }, [ensureAudioContext]);

  // 依 semitones 接線：0 = 直通 bypass，≠0 = 經 pitch worklet
  const routePitch = useCallback((semi: number) => {
    const src = elementSourceRef.current;
    const master = backingMasterGainRef.current;
    if (!src || !master) return;
    try { src.disconnect(); } catch { /* noop */ }
    if (semi !== 0 && pitchNodeRef.current) {
      try { pitchNodeRef.current.disconnect(); } catch { /* noop */ }
      src.connect(pitchNodeRef.current);
      pitchNodeRef.current.connect(master);
    } else {
      src.connect(master);
    }
  }, []);

  const updatePlaybackRate = useCallback((rate: number) => {
    if (audioState.isRecording || audioState.isPaused) return;
    const clamped = Math.min(2, Math.max(0.5, rate));
    setAudioState(prev => ({ ...prev, playbackRate: clamped }));
    playbackRateRef.current = clamped;
    if (backingAudioRef.current) {
      backingAudioRef.current.playbackRate = clamped;
    }
  }, [audioState.isRecording, audioState.isPaused]);

  const updatePitchSemitones = useCallback(async (semi: number) => {
    if (audioState.isRecording || audioState.isPaused) return;
    const clamped = Math.max(-6, Math.min(6, Math.round(semi)));
    setAudioState(prev => ({ ...prev, pitchSemitones: clamped }));
    pitchSemitonesRef.current = clamped;
    // YouTube 音訊無法路由進 Web Audio（跨來源限制），僅記錄狀態供 UI 顯示
    if (audioState.sourceMode === 'youtube') return;
    if (clamped === 0 && !pitchNodeRef.current) return;
    const ok = await ensurePitchGraph();
    if (!ok || !audioCtxRef.current) return;
    const param = pitchNodeRef.current?.parameters.get('semitones');
    if (param) {
      param.setTargetAtTime(clamped, audioCtxRef.current.currentTime, 0.02);
    }
    routePitch(clamped);
  }, [audioState.isRecording, audioState.isPaused, audioState.sourceMode, ensurePitchGraph, routePitch]);

  // 開始錄音前回復原速原調（速度≠1 會使 take 對位錯置）
  const resetPlaybackPitch = useCallback(() => {
    setAudioState(prev => ({ ...prev, playbackRate: 1, pitchSemitones: 0 }));
    playbackRateRef.current = 1;
    pitchSemitonesRef.current = 0;
    if (backingAudioRef.current) {
      backingAudioRef.current.playbackRate = 1;
    }
    if (pitchNodeRef.current && audioCtxRef.current) {
      const param = pitchNodeRef.current.parameters.get('semitones');
      param?.setValueAtTime(0, audioCtxRef.current.currentTime);
    }
    routePitch(0);
  }, [routePitch]);

  // 麥克風與監聽節點初始化
  const initMicrophone = useCallback(async () => {
    const ctx = await ensureAudioContext();
    try {
      if (!micStreamRef.current) {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000,
            channelCount: 1,
          }
        });
      }

      micSourceRef.current = ctx.createMediaStreamSource(micStreamRef.current);
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.3;

      micGainRef.current = ctx.createGain();
      micGainRef.current.gain.value = audioState.micSensitivity;

      monitorGainRef.current = ctx.createGain();
      monitorGainRef.current.gain.value = audioState.isMonitoringEnabled ? audioState.monitorVolume : 0;

      filterNodeRef.current = ctx.createBiquadFilter();
      filterNodeRef.current.type = 'highpass';
      filterNodeRef.current.frequency.value = 120;

      compressorRef.current = ctx.createDynamicsCompressor();
      compressorRef.current.threshold.value = -24;
      compressorRef.current.knee.value = 30;
      compressorRef.current.ratio.value = 12;
      compressorRef.current.attack.value = 0.003;
      compressorRef.current.release.value = 0.25;

      micSourceRef.current.connect(filterNodeRef.current);
      filterNodeRef.current.connect(micGainRef.current);
      micGainRef.current.connect(analyserRef.current);
      analyserRef.current.connect(compressorRef.current);
      compressorRef.current.connect(monitorGainRef.current);
      monitorGainRef.current.connect(ctx.destination);

      return true;
    } catch (e) {
      console.error('麥克風存取失敗:', e);
      return false;
    }
  }, [audioState.micSensitivity, audioState.isMonitoringEnabled, audioState.monitorVolume, ensureAudioContext]);

  // 開始錄音 (支援 Punch-in)
  const startRecording = useCallback(async (punchInTime = 0, playBacking = true) => {
    const micOk = await initMicrophone();
    if (!micOk || !micStreamRef.current) return false;

    const stream = micStreamRef.current;

    const preferredMimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const supportedMimeType = preferredMimeTypes.find(type => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, supportedMimeType
      ? { mimeType: supportedMimeType, audioBitsPerSecond: 128000 }
      : { audioBitsPerSecond: 128000 });
    const mimeType = recorder.mimeType || supportedMimeType || 'audio/webm';
    mediaRecorderRef.current = recorder;

    activeTakeChunksRef.current = [];
    recordingActiveDurationRef.current = 0;
    recordingSegmentStartedAtRef.current = performance.now();
    currentTakeStartTimeRef.current = punchInTime;
    recordingBackingEnabledRef.current = playBacking;

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        activeTakeChunksRef.current.push(e.data);
      }
    };

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(activeTakeChunksRef.current, { type: mimeType });
      const takeId = Date.now();

      if (window.electronAPI) {
        try {
          const buf = await blob.arrayBuffer();
          const extension = mimeType.includes('mp4') ? 'm4a' : 'webm';
          await window.electronAPI.writeTempFile(`temp_${takeId}.${extension}`, buf);
        } catch (err) {
          console.warn('寫入磁碟暫存失敗:', err);
        }
      }

      if (discardActiveTakeRef.current) {
        discardActiveTakeRef.current = false;
        activeTakeChunksRef.current = [];
        finishResolveRef.current?.();
        finishResolveRef.current = null;
        return;
      }

      const newTake: VocalTake = {
        id: takeId,
        startTime: currentTakeStartTimeRef.current,
        duration: Math.max(0.2, recordingActiveDurationRef.current),
        url: URL.createObjectURL(blob),
        blob,
      };

      setVocalTakes(prev => [...prev, newTake]);
      activeTakeChunksRef.current = [];
      finishResolveRef.current?.();
      finishResolveRef.current = null;
    };

    mediaRecorderRef.current.start(500);

    if (playBacking && backingAudioRef.current && backingAudioRef.current.src) {
      backingAudioRef.current.currentTime = punchInTime;
      backingAudioRef.current.volume = audioState.liveBackingVolume;
      backingAudioRef.current.play().catch(e => console.warn(e));
    }

    setAudioState(prev => ({ ...prev, isRecording: true, isPaused: false, currentTime: punchInTime }));

    const updateLevel = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getFloatTimeDomainData(timeDataRef.current as any);
      let sum = 0;
      for (let i = 0; i < timeDataRef.current.length; i++) {
        sum += timeDataRef.current[i] * timeDataRef.current[i];
      }
      const rms = Math.sqrt(sum / timeDataRef.current.length);
      const db = rms > 0 ? 20 * Math.log10(rms) : -60;
      setInputLevel(db);

      const wave = new Float32Array(timeDataRef.current);
      setLiveVocalWave(wave);

      if (mediaRecorderRef.current?.state === 'recording') {
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      }
    };
    levelUpdateRef.current = updateLevel;
    updateLevel();
    return true;
  }, [initMicrophone, audioState.liveBackingVolume]);

  const pauseRecording = useCallback(() => {
    // 重錄自動結束 timer：暫停時凍結剩餘時間
    if (reRecordRemainingMsRef.current !== null) {
      const remaining = reRecordRemainingMsRef.current - (performance.now() - reRecordTimerStartRef.current);
      clearTimeout(reRecordLimitTimerRef.current);
      reRecordLimitTimerRef.current = null;
      if (remaining <= 0) {
        reRecordRemainingMsRef.current = null;
        finishRecording();
        return;
      }
      reRecordRemainingMsRef.current = remaining;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      if (recordingSegmentStartedAtRef.current) {
        recordingActiveDurationRef.current += (performance.now() - recordingSegmentStartedAtRef.current) / 1000;
        recordingSegmentStartedAtRef.current = 0;
      }
      mediaRecorderRef.current.pause();
    }
    if (backingAudioRef.current) {
      backingAudioRef.current.pause();
    }
    setAudioState(prev => ({ ...prev, isRecording: false, isPaused: true }));
    cancelAnimationFrame(animationFrameRef.current);
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      recordingSegmentStartedAtRef.current = performance.now();
      if (recordingBackingEnabledRef.current && backingAudioRef.current) {
        backingAudioRef.current.play().catch(e => console.warn(e));
      }
      // 恢復重錄自動結束 timer（以凍結的剩餘時間）
      if (reRecordRemainingMsRef.current !== null) {
        const remaining = Math.max(reRecordRemainingMsRef.current, 100);
        reRecordTimerStartRef.current = performance.now();
        reRecordLimitTimerRef.current = setTimeout(() => {
          reRecordRemainingMsRef.current = null;
          finishRecording();
        }, remaining);
      }
      setAudioState(prev => ({ ...prev, isRecording: true, isPaused: false }));
      levelUpdateRef.current?.();
    }
    // finishRecording 為穩定 useCallback（deps []），且宣告於本函式之後，故不入依賴
  }, []);

  const finishRecording = useCallback(() => new Promise<void>((resolve) => {
    finishResolveRef.current = resolve;
    if (reRecordLimitTimerRef.current) {
      clearTimeout(reRecordLimitTimerRef.current);
      reRecordLimitTimerRef.current = null;
    }
    reRecordRemainingMsRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (recordingSegmentStartedAtRef.current) {
        recordingActiveDurationRef.current += (performance.now() - recordingSegmentStartedAtRef.current) / 1000;
        recordingSegmentStartedAtRef.current = 0;
      }
      mediaRecorderRef.current.stop();
    } else {
      finishResolveRef.current?.();
      finishResolveRef.current = null;
    }
    if (backingAudioRef.current) {
      backingAudioRef.current.pause();
    }
    setAudioState(prev => ({ ...prev, isRecording: false, isPaused: false }));
    cancelAnimationFrame(animationFrameRef.current);
    setInputLevel(-60);
    setLiveVocalWave(null);
  }), []);

  const resetRecording = useCallback(() => {
    if (reRecordLimitTimerRef.current) {
      clearTimeout(reRecordLimitTimerRef.current);
      reRecordLimitTimerRef.current = null;
    }
    reRecordRemainingMsRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      discardActiveTakeRef.current = true;
      recordingSegmentStartedAtRef.current = 0;
      recordingActiveDurationRef.current = 0;
      mediaRecorderRef.current.stop();
    }
    finishResolveRef.current?.();
    finishResolveRef.current = null;
    if (backingAudioRef.current) {
      backingAudioRef.current.pause();
      backingAudioRef.current.currentTime = 0;
    }
    setVocalTakes([]);
    setAudioState(prev => ({ ...prev, isRecording: false, isPaused: false, currentTime: 0 }));
    cancelAnimationFrame(animationFrameRef.current);
    setInputLevel(-60);
    setLiveVocalWave(null);
  }, []);

  const reRecordTake = useCallback(async (
    takeId: number,
    options?: { playExternalBacking?: (startAt: number) => void },
  ) => {
    const take = vocalTakes.find(t => t.id === takeId);
    if (!take) return;

    setVocalTakes(prev => prev.filter(t => t.id !== takeId));
    // 有外部伴奏（YouTube）時交由呼叫端驅動播放；引擎只處理錄音與內部伴奏
    const started = await startRecording(take.startTime, !options?.playExternalBacking);
    if (!started) return;
    options?.playExternalBacking?.(take.startTime);

    // 自動結束：take 原長度，暫停時凍結（見 pause/resumeRecording）
    reRecordRemainingMsRef.current = take.duration * 1000;
    reRecordTimerStartRef.current = performance.now();
    reRecordLimitTimerRef.current = setTimeout(() => {
      reRecordRemainingMsRef.current = null;
      finishRecording();
    }, take.duration * 1000);
  }, [vocalTakes, startRecording, finishRecording]);

  const deleteTake = useCallback((takeId: number) => {
    setVocalTakes(prev => {
      const take = prev.find(t => t.id === takeId);
      if (take?.url) URL.revokeObjectURL(take.url);
      return prev.filter(t => t.id !== takeId);
    });
  }, []);

  const playTake = useCallback((take: VocalTake) => {
    const a = new Audio(take.url);
    a.play();
  }, []);

  const playBackingOnly = useCallback(async (startAtSec = 0) => {
    if (backingAudioRef.current && backingAudioRef.current.src) {
      // 伴奏元素一旦接上 Web Audio 圖，播放前必須 resume，否則靜音
      await ensureAudioContext();
      backingAudioRef.current.currentTime = startAtSec;
      backingAudioRef.current.volume = audioState.liveBackingVolume;
      backingAudioRef.current.play().catch(e => {
        setAudioState(prev => ({ ...prev, isBackingSoloPlaying: false }));
        console.warn('伴奏播放失敗:', e);
      });
    }
  }, [audioState.liveBackingVolume, ensureAudioContext]);

  const pauseBackingOnly = useCallback(() => {
    if (backingAudioRef.current) {
      backingAudioRef.current.pause();
    }
    setAudioState(prev => ({ ...prev, isBackingSoloPlaying: false }));
  }, []);

  const seekBackingOnly = useCallback((time: number) => {
    if (backingAudioRef.current && backingAudioRef.current.src) {
      backingAudioRef.current.currentTime = time;
    }
    setAudioState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const stopMixedPreview = useCallback(() => {
    if (previewRafRef.current) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
    }
    if (previewBackingRef.current) {
      previewBackingRef.current.pause();
      previewBackingRef.current.src = '';
      previewBackingRef.current = null;
    }
    if (previewBackingUrlRef.current) URL.revokeObjectURL(previewBackingUrlRef.current);
    previewBackingUrlRef.current = null;
    previewAudiosRef.current.forEach(item => {
      item.audio.pause();
    });
    setAudioState(prev => ({ ...prev, isPlayingMix: false }));
  }, []);

  const playMixedPreview = useCallback((startAt = 0, includeBackingTrack = true) => {
    stopMixedPreview();

    if (includeBackingTrack && currentBackingBlob) {
      const bUrl = URL.createObjectURL(currentBackingBlob);
      previewBackingUrlRef.current = bUrl;
      const bAudio = new Audio(bUrl);
      bAudio.volume = audioState.backingMuted ? 0 : audioState.backingVolume;
      bAudio.currentTime = startAt;
      bAudio.play().catch(e => console.warn(e));
      previewBackingRef.current = bAudio;
    }

    previewAudiosRef.current = vocalTakes.map(take => {
      const a = new Audio(take.url);
      a.volume = audioState.vocalMuted ? 0 : audioState.vocalVolume;
      return { id: take.id, audio: a, startTime: take.startTime, duration: take.duration };
    });

    previewStartStampRef.current = performance.now();
    previewStartOffsetRef.current = startAt;
    setAudioState(prev => ({ ...prev, isPlayingMix: true }));

    const maxDuration = Math.max(
      includeBackingTrack ? audioState.backingDuration : 0,
      ...vocalTakes.map(t => t.startTime + t.duration),
      1
    );

    const updatePreview = () => {
      const elapsed = (performance.now() - previewStartStampRef.current) / 1000;
      const cur = previewStartOffsetRef.current + elapsed;

      if (cur >= maxDuration) {
        stopMixedPreview();
        setMixCurrentTime(maxDuration);
        return;
      }

      setMixCurrentTime(cur);

      const latencySec = (audioState.latencyOffsetMs || 0) / 1000;
      previewAudiosRef.current.forEach(item => {
        const alignedStart = item.startTime + latencySec;
        if (cur >= alignedStart && cur <= alignedStart + item.duration) {
          if (item.audio.paused) {
            item.audio.currentTime = cur - alignedStart;
            item.audio.play().catch(e => console.warn(e));
          }
        } else {
          if (!item.audio.paused) {
            item.audio.pause();
          }
        }
      });

      previewRafRef.current = requestAnimationFrame(updatePreview);
    };

    previewRafRef.current = requestAnimationFrame(updatePreview);
  }, [stopMixedPreview, currentBackingBlob, audioState.backingMuted, audioState.backingVolume, audioState.vocalMuted, audioState.vocalVolume, audioState.backingDuration, audioState.latencyOffsetMs, vocalTakes]);

  const seekMixedPreview = useCallback((time: number, includeBackingTrack = true) => {
    const isPlaying = audioState.isPlayingMix;
    if (isPlaying) {
      playMixedPreview(time, includeBackingTrack);
    } else {
      setMixCurrentTime(time);
    }
  }, [audioState.isPlayingMix, playMixedPreview]);

  const toggleMixedPreview = useCallback((includeBackingTrack = true) => {
    if (audioState.isPlayingMix) {
      stopMixedPreview();
      return false;
    } else {
      playMixedPreview(mixCurrentTime, includeBackingTrack);
      return true;
    }
  }, [audioState.isPlayingMix, stopMixedPreview, playMixedPreview, mixCurrentTime]);

  // 離線渲染最終混音（伴奏 + 人聲 + 殘響 + 延遲補償）
  const renderMixedAudioBuffer = useCallback(async (includeBackingTrack = true): Promise<AudioBuffer> => {
    const ctx = await ensureAudioContext();
    const sampleRate = 44100;
    const totalDuration = Math.max(
      includeBackingTrack ? audioState.backingDuration : 0,
      ...vocalTakes.map(t => t.startTime + t.duration),
      1
    );

    const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * totalDuration), sampleRate);

    if (includeBackingTrack && currentBackingBlob) {
      try {
        const bArray = await currentBackingBlob.arrayBuffer();
        const bBuffer = await ctx.decodeAudioData(bArray.slice(0));
        const bSource = offlineCtx.createBufferSource();
        const bGain = offlineCtx.createGain();
        bSource.buffer = bBuffer;
        bGain.gain.value = audioState.backingMuted ? 0 : audioState.backingVolume;
        bSource.connect(bGain);
        bGain.connect(offlineCtx.destination);
        bSource.start(0);
      } catch (e) {
        console.warn('伴奏渲染失敗:', e);
      }
    }

    const offsetSec = (audioState.latencyOffsetMs || 0) / 1000;

    for (const take of vocalTakes) {
      if (!take.blob) continue;
      try {
        const vArray = await take.blob.arrayBuffer();
        const vBuffer = await ctx.decodeAudioData(vArray.slice(0));
        const vSource = offlineCtx.createBufferSource();
        const vGain = offlineCtx.createGain();
        vSource.buffer = vBuffer;
        vGain.gain.value = audioState.vocalMuted ? 0 : audioState.vocalVolume;

        const alignedStart = Math.max(0, take.startTime + offsetSec);

        if (audioState.reverbEnabled) {
          const convolver = offlineCtx.createConvolver();
          const impulse = offlineCtx.createBuffer(2, sampleRate * 1.5, sampleRate);
          const left = impulse.getChannelData(0);
          const right = impulse.getChannelData(1);
          for (let i = 0; i < impulse.length; i++) {
            const decay = Math.pow(1 - i / impulse.length, 2.2);
            left[i] = (Math.random() * 2 - 1) * decay;
            right[i] = (Math.random() * 2 - 1) * decay;
          }
          convolver.buffer = impulse;

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
        console.warn(`Take ${take.id} 渲染失敗:`, e);
      }
    }

    const rendered = await offlineCtx.startRendering();
    return rendered;
  }, [ensureAudioContext, audioState, vocalTakes, currentBackingBlob]);

  const exportMixedWavBlob = useCallback(async (includeBackingTrack = true): Promise<Blob> => {
    const rendered = await renderMixedAudioBuffer(includeBackingTrack);
    return audioBufferToWavBlob(rendered);
  }, [renderMixedAudioBuffer, audioBufferToWavBlob]);

  // 16-bit PCM → MP3（lamejs 純 JS 編碼，離線、免 ffmpeg）
  const audioBufferToMp3Blob = useCallback(async (buffer: AudioBuffer, kbps = 192): Promise<Blob> => {
    const { Mp3Encoder } = await import('@breezystack/lamejs');
    const channels = Math.min(2, buffer.numberOfChannels);
    const encoder = new Mp3Encoder(channels, buffer.sampleRate, kbps);

    const toInt16 = (float32: Float32Array): Int16Array => {
      const out = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      return out;
    };

    const left = buffer.getChannelData(0);
    const right = channels > 1 ? buffer.getChannelData(1) : null;
    const blockSize = 1152 * 20;
    const chunks: Uint8Array[] = [];

    for (let offset = 0; offset < buffer.length; offset += blockSize) {
      const leftChunk = toInt16(left.subarray(offset, Math.min(offset + blockSize, buffer.length)));
      const encoded = channels > 1
        ? encoder.encodeBuffer(leftChunk, toInt16(right!.subarray(offset, Math.min(offset + blockSize, buffer.length))))
        : encoder.encodeBuffer(leftChunk);
      if (encoded.length > 0) chunks.push(new Uint8Array(encoded));
      // 讓出主執行緒，保持 UI 可回應
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const tail = encoder.flush();
    if (tail.length > 0) chunks.push(new Uint8Array(tail));
    return new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
  }, []);

  const exportMixedMp3Blob = useCallback(async (includeBackingTrack = true, kbps = 192): Promise<Blob> => {
    const rendered = await renderMixedAudioBuffer(includeBackingTrack);
    return audioBufferToMp3Blob(rendered, kbps);
  }, [renderMixedAudioBuffer, audioBufferToMp3Blob]);

  const updateBackingVolume = useCallback((volume: number) => {
    setAudioState(prev => ({ ...prev, liveBackingVolume: volume, backingVolume: volume }));
    if (backingAudioRef.current) {
      backingAudioRef.current.volume = volume;
    }
  }, []);

  const updateVocalVolume = useCallback((volume: number) => {
    setAudioState(prev => ({ ...prev, vocalVolume: volume }));
  }, []);

  const updateLatencyOffset = useCallback((offsetMs: number) => {
    setAudioState(prev => ({ ...prev, latencyOffsetMs: offsetMs }));
  }, []);

  const toggleBackingMute = useCallback(() => {
    setAudioState(prev => ({ ...prev, backingMuted: !prev.backingMuted }));
  }, []);

  const toggleVocalMute = useCallback(() => {
    setAudioState(prev => ({ ...prev, vocalMuted: !prev.vocalMuted }));
  }, []);

  const toggleReverb = useCallback(() => {
    setAudioState(prev => ({ ...prev, reverbEnabled: !prev.reverbEnabled }));
  }, []);

  const updateMonitorVolume = useCallback((volume: number) => {
    setAudioState(prev => ({ ...prev, monitorVolume: volume }));
    if (monitorGainRef.current) {
      monitorGainRef.current.gain.value = volume;
    }
  }, []);

  const updateMicSensitivity = useCallback((sens: number) => {
    setAudioState(prev => ({ ...prev, micSensitivity: sens }));
    if (micGainRef.current) {
      micGainRef.current.gain.value = sens;
    }
  }, []);

  const toggleMonitor = useCallback(() => {
    setAudioState(prev => {
      const next = !prev.isMonitoringEnabled;
      if (monitorGainRef.current) {
        monitorGainRef.current.gain.value = next ? prev.monitorVolume : 0;
      }
      return { ...prev, isMonitoringEnabled: next };
    });
  }, []);

  const toggleVocalCancellation = useCallback(() => {
    setAudioState(prev => ({ ...prev, isVocalCancellationEnabled: !prev.isVocalCancellationEnabled }));
  }, []);

  const toggleNoiseFilter = useCallback(() => {
    setAudioState(prev => ({ ...prev, isNoiseFilterEnabled: !prev.isNoiseFilterEnabled }));
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
      if (previewBackingRef.current) previewBackingRef.current.pause();
      if (previewBackingUrlRef.current) URL.revokeObjectURL(previewBackingUrlRef.current);
      if (backingObjectUrlRef.current) URL.revokeObjectURL(backingObjectUrlRef.current);
      for (const take of vocalTakesRef.current) URL.revokeObjectURL(take.url);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return {
    audioState,
    vocalTakes,
    waveformPeaks,
    inputLevel,
    liveVocalWave,
    currentBackingBlob,
    mixCurrentTime,
    audioCtxRef,
    backingAudioRef,
    ensureAudioContext,
    initMicrophone,
    loadBackingTrack,
    clearBackingTrack,
    replaceVocalTakes,
    playBackingOnly,
    pauseBackingOnly,
    seekBackingOnly,
    startRecording,
    pauseRecording,
    resumeRecording,
    finishRecording,
    resetRecording,
    reRecordTake,
    deleteTake,
    playTake,
    playMixedPreview,
    pauseMixedPreview: stopMixedPreview,
    stopMixedPreview,
    seekMixedPreview,
    toggleMixedPreview,
    exportMixedWavBlob,
    exportMixedMp3Blob,
    renderMixedAudioBuffer,
    updateBackingVolume,
    updateVocalVolume,
    updateLatencyOffset,
    toggleBackingMute,
    toggleVocalMute,
    toggleReverb,
    updateMonitorVolume,
    updateMicSensitivity,
    toggleMonitor,
    toggleVocalCancellation,
    toggleNoiseFilter,
    updatePlaybackRate,
    updatePitchSemitones,
    resetPlaybackPitch,
  };
}
