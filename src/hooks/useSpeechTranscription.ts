import { useCallback, useEffect, useRef, useState } from 'react';

const MODEL_READY_KEY = 'singstudio.whisper-tiny.ready';

export interface SpeechChunk {
  timestamp?: [number | null, number | null];
  text: string;
}

export interface SpeechResult {
  text: string;
  chunks?: SpeechChunk[];
}

export interface SpeechProgress {
  file: string;
  progress: number;
  loaded?: number;
  total?: number;
}

interface PendingRequest {
  resolve: (value: SpeechResult) => void;
  reject: (reason: Error) => void;
}

export function useSpeechTranscription() {
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  const pendingRef = useRef(new Map<number, PendingRequest>());
  const [modelReady, setModelReady] = useState(() => localStorage.getItem(MODEL_READY_KEY) === 'true');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [downloadFile, setDownloadFile] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const worker = new Worker(new URL('../workers/speech.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<any>) => {
      const message = event.data;
      if (message.type === 'progress') {
        const progress = message.progress as Record<string, unknown>;
        const file = String(progress.file || '下載模型檔案');
        const percent = Number(progress.progress || 0);
        const status = String(progress.status || '');
        if (status === 'ready') return;
        setDownloadFile(status === 'progress_total' ? '全部模型檔案' : file.split('/').pop() || file);
        if (status === 'progress_total') setDownloadPercent(Math.min(99, Math.round(percent)));
        else if (status === 'progress') setDownloadPercent(Math.min(99, Math.round(percent)));
        if (status === 'download' || status === 'progress' || status === 'progress_total') setIsDownloading(true);
      } else if (message.type === 'ready') {
        setModelReady(true);
        localStorage.setItem(MODEL_READY_KEY, 'true');
        setIsDownloading(false);
        setDownloadPercent(100);
      } else if (message.type === 'error') {
        setIsDownloading(false);
        setError(message.message || '模型下載或載入失敗');
      } else if (message.type === 'transcription-started') {
        setIsTranscribing(true);
      } else if (message.type === 'transcription-result') {
        const pending = pendingRef.current.get(message.requestId);
        pendingRef.current.delete(message.requestId);
        setIsTranscribing(false);
        pending?.resolve(message.result as SpeechResult);
      } else if (message.type === 'transcription-error') {
        const pending = pendingRef.current.get(message.requestId);
        pendingRef.current.delete(message.requestId);
        setIsTranscribing(false);
        pending?.reject(new Error(message.message || '語音辨識失敗'));
      }
    };

    worker.onerror = (event) => {
      setIsDownloading(false);
      setIsTranscribing(false);
      setError(event.message || '本機語音模型啟動失敗');
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      for (const pending of pendingRef.current.values()) pending.reject(new Error('語音辨識已中止'));
      pendingRef.current.clear();
    };
  }, []);

  const downloadModel = useCallback(() => {
    if (!workerRef.current || isDownloading) return;
    setError('');
    setDownloadFile('準備模型');
    setDownloadPercent(0);
    setIsDownloading(true);
    workerRef.current.postMessage({ type: 'download' });
  }, [isDownloading]);

  const transcribe = useCallback(async (blob: Blob): Promise<SpeechResult> => {
    if (!workerRef.current) throw new Error('本機語音模型尚未啟動');
    if (!modelReady) throw new Error('請先到「設定」下載離線字幕模型');

    setError('');
    setIsTranscribing(true);
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const context = new AudioContextClass();
    try {
      const decoded = await context.decodeAudioData(await blob.arrayBuffer());
      const targetSampleRate = 16000;
      const frameCount = Math.ceil(decoded.duration * targetSampleRate);
      const offline = new OfflineAudioContext(1, Math.max(frameCount, 1), targetSampleRate);
      const source = offline.createBufferSource();
      source.buffer = decoded;
      source.connect(offline.destination);
      source.start();
      const mono = await offline.startRendering();
      const samples = new Float32Array(mono.getChannelData(0));
      const requestId = ++requestRef.current;

      return await new Promise<SpeechResult>((resolve, reject) => {
        pendingRef.current.set(requestId, { resolve, reject });
        workerRef.current?.postMessage({ type: 'transcribe', requestId, samples }, [samples.buffer]);
      });
    } finally {
      await context.close().catch(() => undefined);
    }
  }, [modelReady]);

  return {
    modelReady,
    isDownloading,
    downloadPercent,
    downloadFile,
    isTranscribing,
    error,
    downloadModel,
    transcribe,
    clearError: () => setError(''),
  };
}
