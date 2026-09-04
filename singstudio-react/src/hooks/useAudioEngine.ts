import { useState, useRef, useCallback, useEffect } from 'react';
import type { VocalTake, AudioState } from '../types';

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

  const [audioState, setAudioState] = useState<AudioState>({
    isRecording: false,
    isPaused: false,
    isBackingSoloPlaying: false,
    isPlayingMix: false,
    sourceMode: 'demo',
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
  });

  const [vocalTakes, setVocalTakes] = useState<VocalTake[]>([]);
  const [waveformPeaks, setWaveformPeaks] = useState<Float32Array | null>(null);
  const [inputLevel, setInputLevel] = useState(-60);
  const [liveVocalWave, setLiveVocalWave] = useState<Float32Array | null>(null);
  const [currentBackingBlob, setCurrentBackingBlob] = useState<Blob | null>(null);
  const [mixCurrentTime, setMixCurrentTime] = useState(0);

  const activeTakeChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef(0);
  const currentTakeStartTimeRef = useRef(0);
  const reRecordLimitTimerRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);
  const timeDataRef = useRef<Float32Array>(new Float32Array(1024));
  const previewAudiosRef = useRef<{ id: number; audio: HTMLAudioElement; startTime: number; duration: number }[]>([]);
  const previewBackingRef = useRef<HTMLAudioElement | null>(null);
  const previewRafRef = useRef<number | null>(null);
  const previewStartStampRef = useRef<number>(0);
  const previewStartOffsetRef = useRef<number>(0);

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

  // 合成內建示範伴奏 (56 秒卡農和弦進行)
  const generateDemoBackingTrack = useCallback(async (): Promise<number> => {
    const ctx = await ensureAudioContext();
    const sampleRate = 44100;
    const duration = 56;
    const totalSamples = sampleRate * duration;
    const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
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
      [196.00, 246.94, 293.66], // G
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

    const wavBlob = audioBufferToWavBlob(buffer);
    setCurrentBackingBlob(wavBlob);
    const url = URL.createObjectURL(wavBlob);

    if (backingAudioRef.current) {
      backingAudioRef.current.src = url;
    }

    const peaks = await extractWaveformPeaks(wavBlob, 800);
    setWaveformPeaks(peaks);

    setAudioState(prev => ({
      ...prev,
      sourceMode: 'demo',
      currentBackingUrl: url,
      backingDuration: duration,
      currentTime: 0,
    }));

    return duration;
  }, [ensureAudioContext, audioBufferToWavBlob, extractWaveformPeaks]);

  // 載入本地伴奏檔案
  const loadBackingTrack = useCallback(async (file: File | Blob): Promise<number> => {
    await ensureAudioContext();
    setCurrentBackingBlob(file);
    const url = URL.createObjectURL(file);

    if (backingAudioRef.current) {
      backingAudioRef.current.src = url;
    }

    const peaks = await extractWaveformPeaks(file, 800);
    setWaveformPeaks(peaks);

    const tempAudio = new Audio(url);
    await new Promise((resolve) => {
      tempAudio.onloadedmetadata = () => resolve(true);
      tempAudio.onerror = () => resolve(false);
    });
    const dur = tempAudio.duration || 60;

    setAudioState(prev => ({
      ...prev,
      sourceMode: 'local',
      currentBackingUrl: url,
      backingDuration: dur,
      currentTime: 0,
    }));

    return dur;
  }, [ensureAudioContext, extractWaveformPeaks]);

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
  const startRecording = useCallback(async (punchInTime = 0) => {
    const micOk = await initMicrophone();
    if (!micOk || !micStreamRef.current) return;

    const ctx = await ensureAudioContext();
    const stream = micStreamRef.current;

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 128000,
    });

    activeTakeChunksRef.current = [];
    recordingStartTimeRef.current = ctx.currentTime;
    currentTakeStartTimeRef.current = punchInTime;

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        activeTakeChunksRef.current.push(e.data);
      }
    };

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(activeTakeChunksRef.current, { type: mimeType });
      const duration = ctx.currentTime - recordingStartTimeRef.current;
      const takeId = Date.now();

      if (window.electronAPI) {
        try {
          const buf = await blob.arrayBuffer();
          await window.electronAPI.writeTempFile(`temp_${takeId}.webm`, buf);
        } catch (err) {
          console.warn('寫入磁碟暫存失敗:', err);
        }
      }

      const newTake: VocalTake = {
        id: takeId,
        startTime: currentTakeStartTimeRef.current,
        duration: Math.max(0.2, duration),
        url: URL.createObjectURL(blob),
        blob,
      };

      setVocalTakes(prev => [...prev, newTake]);
      activeTakeChunksRef.current = [];
    };

    mediaRecorderRef.current.start(500);

    if (backingAudioRef.current && backingAudioRef.current.src) {
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
    updateLevel();
  }, [initMicrophone, ensureAudioContext, audioState.liveBackingVolume]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
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
      if (backingAudioRef.current) {
        backingAudioRef.current.play().catch(e => console.warn(e));
      }
      setAudioState(prev => ({ ...prev, isRecording: true, isPaused: false }));
    }
  }, []);

  const finishRecording = useCallback(() => {
    if (reRecordLimitTimerRef.current) {
      clearTimeout(reRecordLimitTimerRef.current);
      reRecordLimitTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (backingAudioRef.current) {
      backingAudioRef.current.pause();
    }
    setAudioState(prev => ({ ...prev, isRecording: false, isPaused: false }));
    cancelAnimationFrame(animationFrameRef.current);
    setInputLevel(-60);
    setLiveVocalWave(null);
  }, []);

  const resetRecording = useCallback(() => {
    if (reRecordLimitTimerRef.current) {
      clearTimeout(reRecordLimitTimerRef.current);
      reRecordLimitTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
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

  const reRecordTake = useCallback(async (takeId: number) => {
    const take = vocalTakes.find(t => t.id === takeId);
    if (!take) return;

    setVocalTakes(prev => prev.filter(t => t.id !== takeId));
    await startRecording(take.startTime);

    reRecordLimitTimerRef.current = setTimeout(() => {
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

  const playBackingOnly = useCallback((startAtSec = 0) => {
    if (backingAudioRef.current && backingAudioRef.current.src) {
      backingAudioRef.current.currentTime = startAtSec;
      backingAudioRef.current.volume = audioState.liveBackingVolume;
      backingAudioRef.current.play().catch(e => console.warn(e));
      setAudioState(prev => ({ ...prev, isBackingSoloPlaying: true }));
    }
  }, [audioState.liveBackingVolume]);

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
    }
    previewAudiosRef.current.forEach(item => {
      item.audio.pause();
    });
    setAudioState(prev => ({ ...prev, isPlayingMix: false }));
  }, []);

  const playMixedPreview = useCallback((startAt = 0) => {
    stopMixedPreview();

    if (currentBackingBlob) {
      const bUrl = URL.createObjectURL(currentBackingBlob);
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
      audioState.backingDuration,
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

  const seekMixedPreview = useCallback((time: number) => {
    const isPlaying = audioState.isPlayingMix;
    if (isPlaying) {
      playMixedPreview(time);
    } else {
      setMixCurrentTime(time);
    }
  }, [audioState.isPlayingMix, playMixedPreview]);

  const toggleMixedPreview = useCallback(() => {
    if (audioState.isPlayingMix) {
      stopMixedPreview();
      return false;
    } else {
      playMixedPreview(mixCurrentTime);
      return true;
    }
  }, [audioState.isPlayingMix, stopMixedPreview, playMixedPreview, mixCurrentTime]);

  const exportMixedWavBlob = useCallback(async (): Promise<Blob> => {
    const ctx = await ensureAudioContext();
    const sampleRate = 44100;
    const totalDuration = Math.max(
      audioState.backingDuration,
      ...vocalTakes.map(t => t.startTime + t.duration),
      1
    );

    const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * totalDuration), sampleRate);

    if (currentBackingBlob) {
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
    return audioBufferToWavBlob(rendered);
  }, [ensureAudioContext, audioState, vocalTakes, currentBackingBlob, audioBufferToWavBlob]);

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
    generateDemoBackingTrack,
    loadBackingTrack,
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
  };
}
