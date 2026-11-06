// ============================================================================
// SingStudio - 歌詞影片匯出 (Canvas + MediaRecorder 即時渲染)
// 輸出：伴奏 + 人聲混音 + 同步歌詞字幕 + 頻譜視覺化 的 MP4 (或 WebM 備援)
// ============================================================================

export interface LyricLineLike {
  time: number;
  text: string;
}

export interface LyricVideoOptions {
  /** 離線渲染完成的混音 AudioBuffer (renderMixedAudioBuffer) */
  audioBuffer: AudioBuffer;
  /** 影片上方顯示的曲名 */
  title: string;
  /** 同步歌詞（已按 time 升冪） */
  lyrics: LyricLineLike[];
  width?: number;
  height?: number;
  fps?: number;
  /** 渲染進度 0 ~ 1（即時錄製，進度 ≈ 播放進度） */
  onProgress?: (ratio: number) => void;
}

export interface LyricVideoResult {
  blob: Blob;
  mimeType: string;
  extension: 'mp4' | 'webm';
}

/** 依環境支援度挑選錄製 MIME：優先 MP4 (H.264 + AAC)，退回 WebM (VP9/VP8 + Opus) */
export function pickVideoMimeType(): string | null {
  const candidates = [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) || null;
}

const FONT_STACK = '"Noto Sans TC", "Microsoft JhengHei", -apple-system, sans-serif';

export async function renderLyricVideoBlob(options: LyricVideoOptions): Promise<LyricVideoResult> {
  const {
    audioBuffer,
    title,
    lyrics,
    width = 1280,
    height = 720,
    fps = 30,
    onProgress,
  } = options;

  const mimeType = pickVideoMimeType();
  if (!mimeType) {
    throw new Error('此環境不支援影片錄製（找不到可用的 MediaRecorder 格式）');
  }

  // ---- 畫布 ----
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) throw new Error('無法建立影片畫布');

  // ---- 音訊圖：BufferSource → Analyser → MediaStreamDestination（不接喇叭，避免與試聽打架）----
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx: AudioContext = new AudioCtxClass();
  if (audioCtx.state === 'suspended') await audioCtx.resume();

  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.75;
  const streamDest = audioCtx.createMediaStreamDestination();
  source.connect(analyser);
  analyser.connect(streamDest);

  // ---- 影音合一 MediaStream ----
  const canvasStream = canvas.captureStream(fps);
  const audioTracks = streamDest.stream.getAudioTracks();
  const mixedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);

  const recorder = new MediaRecorder(mixedStream, {
    mimeType,
    videoBitsPerSecond: 4_500_000,
    audioBitsPerSecond: 192_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const duration = audioBuffer.duration;
  const spectrum = new Uint8Array(analyser.frequencyBinCount);
  let lyricIdx = 0;

  const drawFrame = (t: number) => {
    // 背景：深色漸層
    const grad = ctx2d.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#10141f');
    grad.addColorStop(1, '#1b2237');
    ctx2d.fillStyle = grad;
    ctx2d.fillRect(0, 0, width, height);

    // 底部頻譜
    analyser.getByteFrequencyData(spectrum as any);
    const bars = 56;
    const slot = width / bars;
    for (let i = 0; i < bars; i++) {
      const v = spectrum[Math.floor(i * spectrum.length / bars)] / 255;
      const h = Math.max(2, v * height * 0.16);
      ctx2d.fillStyle = `rgba(59, 130, 246, ${0.16 + v * 0.45})`;
      ctx2d.fillRect(i * slot + slot * 0.2, height - 56 - h, slot * 0.6, h);
    }

    // 曲名
    ctx2d.textAlign = 'center';
    ctx2d.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx2d.font = `600 ${Math.round(width * 0.021)}px ${FONT_STACK}`;
    ctx2d.fillText(title.length > 42 ? `${title.slice(0, 42)}…` : title, width / 2, height * 0.11);

    // 歌詞：前一句（暗）／當句（大亮）／下一句（半暗）
    while (lyricIdx < lyrics.length - 1 && lyrics[lyricIdx + 1].time <= t) lyricIdx++;
    const cur = lyricIdx < lyrics.length && lyrics[lyricIdx].time <= t ? lyrics[lyricIdx] : null;
    const prev = cur && lyricIdx > 0 ? lyrics[lyricIdx - 1] : null;
    const next = cur && lyricIdx + 1 < lyrics.length ? lyrics[lyricIdx + 1] : null;

    const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);

    if (prev) {
      ctx2d.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx2d.font = `400 ${Math.round(width * 0.024)}px ${FONT_STACK}`;
      ctx2d.fillText(clip(prev.text, 26), width / 2, height * 0.5 - width * 0.075);
    }
    if (cur) {
      ctx2d.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx2d.shadowBlur = 10;
      ctx2d.fillStyle = '#ffffff';
      ctx2d.font = `700 ${Math.round(width * 0.042)}px ${FONT_STACK}`;
      ctx2d.fillText(clip(cur.text, 22), width / 2, height * 0.5 + width * 0.02);
      ctx2d.shadowBlur = 0;
    } else {
      ctx2d.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx2d.font = `600 ${Math.round(width * 0.03)}px ${FONT_STACK}`;
      ctx2d.fillText('♪ 前奏中 ♪', width / 2, height * 0.5 + width * 0.014);
    }
    if (next) {
      ctx2d.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx2d.font = `400 ${Math.round(width * 0.024)}px ${FONT_STACK}`;
      ctx2d.fillText(clip(next.text, 26), width / 2, height * 0.5 + width * 0.075);
    }

    // 進度條
    ctx2d.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx2d.fillRect(width * 0.04, height - 34, width * 0.92, 5);
    ctx2d.fillStyle = '#3b82f6';
    ctx2d.fillRect(width * 0.04, height - 34, width * 0.92 * Math.min(1, t / Math.max(1, duration)), 5);
  };

  let workerTicker: Worker | null = null;
  let workerUrl: string | null = null;
  const stopTicker = () => {
    if (workerTicker) { workerTicker.terminate(); workerTicker = null; }
    if (workerUrl) { URL.revokeObjectURL(workerUrl); workerUrl = null; }
  };

  let startCtxTime = 0;
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType.split(';')[0] }));
      recorder.onerror = () => reject(new Error('影片錄製過程發生錯誤'));
      source.onended = () => {
        setTimeout(() => {
          stopTicker();
          if (recorder.state !== 'inactive') recorder.stop();
        }, 350); // 收尾緩衝，確保最後一段音訊與畫面寫入
      };
      // 先畫出第一幀，避免起始黑畫面
      drawFrame(0);
      recorder.start(1000);
      startCtxTime = audioCtx.currentTime;
      source.start();
      // rAF 在視窗最小化 / 嵌入式面板會被完全節流（實測 0 次/秒）→
      // 改用 Web Worker 計時器驅動繪製，背景與最小化狀態仍維持 fps 幀率
      workerUrl = URL.createObjectURL(new Blob(
        [`setInterval(() => postMessage(0), ${Math.max(16, Math.round(1000 / fps))});`],
        { type: 'text/javascript' },
      ));
      workerTicker = new Worker(workerUrl);
      workerTicker.onmessage = () => {
        const t = audioCtx.currentTime - startCtxTime;
        drawFrame(Math.max(0, Math.min(t, duration)));
        onProgress?.(Math.min(1, Math.max(0, t / duration)));
      };
    });

    const extension: 'mp4' | 'webm' = mimeType.includes('mp4') ? 'mp4' : 'webm';
    return { blob, mimeType, extension };
  } finally {
    stopTicker();
    try { source.disconnect(); } catch { /* noop */ }
    try { await audioCtx.close(); } catch { /* noop */ }
    canvasStream.getTracks().forEach(track => track.stop());
  }
}
