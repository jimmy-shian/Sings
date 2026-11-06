import React, { useRef, useState } from 'react';
import { formatTime } from '../utils/format';

interface BottomSystemBarProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isRecording: boolean;
  isPaused: boolean;
  title: string;
  sourceMode: 'local' | 'youtube';
  hasBacking: boolean;
  inputLevel: number;
  isSingingMode: boolean;
  /** 播放速度 0.5~2（YouTube 僅變速，無法升降 KEY） */
  playbackRate: number;
  pitchSemitones: number;
  /** true = YouTube 來源，KEY 控制鎖定 */
  pitchLocked: boolean;
  onExitSinging: () => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onFinishRecording: () => void;
  onCycleRate: () => void;
  onPitchStep: (delta: number) => void;
}

export const BottomSystemBar: React.FC<BottomSystemBarProps> = ({
  currentTime,
  duration,
  isPlaying,
  isRecording,
  isPaused,
  title,
  sourceMode,
  hasBacking,
  inputLevel,
  isSingingMode,
  playbackRate,
  pitchSemitones,
  pitchLocked,
  onExitSinging,
  onTogglePlay,
  onSeek,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onFinishRecording,
  onCycleRate,
  onPitchStep,
}) => {
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const durationSafe = Math.max(duration, 1);
  const progressPercent = Math.min(100, Math.max(0, currentTime / durationSafe * 100));
  const canSeek = hasBacking && !isRecording && !isPaused;

  const calculateTime = (clientX: number) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const usableWidth = Math.max(1, rect.width - 32);
    const x = Math.max(0, Math.min(usableWidth, clientX - rect.left - 16));
    return x / usableWidth * durationSafe;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    onSeek(calculateTime(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) onSeek(calculateTime(e.clientX));
    if (progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const usableWidth = Math.max(1, rect.width - 32);
      const x = Math.max(0, Math.min(usableWidth, e.clientX - rect.left - 16));
      setHoverX(16 + x);
      setHoverTime(x / usableWidth * durationSafe);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* pointer already released */ }
    setIsDragging(false);
  };

  const statusLabel = isRecording ? '錄音中' : isPaused ? '已暫停' : isPlaying ? '伴奏播放中' : '待機';
  const statusColor = isRecording ? '#ef4444' : isPaused ? '#f59e0b' : isPlaying ? '#10b981' : 'var(--text-muted)';

  return (
    <section className={`bottom-system-bar-container${isSingingMode ? ' singing-visible' : ''}`} aria-label="演唱控制">
      <div
        ref={progressBarRef}
        className={`yt-scrubber-track${isDragging ? ' dragging' : ''}${!canSeek ? ' locked' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => { if (!isDragging) setHoverTime(null); }}
        aria-label={canSeek ? '伴奏時間軸' : '錄音期間時間軸已鎖定'}
      >
        <div className="yt-scrubber-fill" style={{ width: `${progressPercent}%` }}><div className="yt-scrubber-handle" /></div>
        {hoverTime !== null && canSeek && <div className="yt-scrubber-tooltip" style={{ left: `${hoverX}px` }}>{formatTime(hoverTime)}</div>}
      </div>

      <div className="bottom-system-bar-content">
        <div className="bottom-bar-info-row">
          <span className="bottom-bar-pulse-dot" style={{ backgroundColor: statusColor }} />
          <span className="bottom-bar-title" title={title}>{title || (sourceMode === 'youtube' ? 'YouTube 伴奏' : '未載入伴奏音訊')}</span>
          <span className="bottom-bar-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
          <span className="bottom-bar-status-badge" style={{ color: statusColor }}>{statusLabel}</span>
          {(isRecording || isPaused) && <span className="bottom-bar-level-badge">麥克風 {inputLevel.toFixed(0)} dB</span>}
        </div>

        {/* 變速 / 升降 KEY 精簡列（錄音與暫停期間隱藏，錄音自動回復原速原調） */}
        {hasBacking && !isRecording && !isPaused && (
          <div className="bottom-rate-key-row">
            <button className="bottom-rk-pill" type="button" onClick={onCycleRate} title="循環切換播放速度">
              速度 {playbackRate}x
            </button>
            <button
              className="bottom-rk-pill"
              type="button"
              onClick={() => onPitchStep(-1)}
              disabled={pitchLocked || pitchSemitones <= -6}
              title={pitchLocked ? 'YouTube 來源無法升降 KEY' : '降半音'}
            >
              KEY −
            </button>
            <span className={`bottom-rk-value${pitchLocked ? ' locked' : ''}`}>
              {pitchLocked
                ? 'YT'
                : pitchSemitones === 0
                  ? '原調'
                  : `${pitchSemitones > 0 ? '+' : ''}${pitchSemitones}`}
            </span>
            <button
              className="bottom-rk-pill"
              type="button"
              onClick={() => onPitchStep(1)}
              disabled={pitchLocked || pitchSemitones >= 6}
              title={pitchLocked ? 'YouTube 來源無法升降 KEY' : '升半音'}
            >
              KEY ＋
            </button>
          </div>
        )}

        <div className="bottom-bar-right">
          <button className="bottom-bar-btn mobile-exit-btn" type="button" onClick={onExitSinging} disabled={isRecording || isPaused}>返回準備</button>
          {!isRecording && !isPaused && <button className="bottom-bar-btn" type="button" onClick={onTogglePlay} disabled={!hasBacking} aria-label={isPlaying ? '暫停試聽伴奏' : '試聽伴奏'}>{hasBacking ? (isPlaying ? '暫停試聽' : '試聽伴奏') : '尚未載入伴奏'}</button>}
          {isRecording
            ? <button className="bottom-bar-btn bottom-bar-primary" type="button" onClick={onPauseRecording}>Ⅱ 暫停錄音</button>
            : isPaused
              ? <button className="bottom-bar-btn bottom-bar-primary" type="button" onClick={onResumeRecording}>▶ 接續錄音</button>
              : <button className="bottom-bar-btn bottom-bar-primary" type="button" onClick={onStartRecording}>● 開始錄音</button>}
          {(isRecording || isPaused) && <button className="bottom-bar-btn bottom-bar-finish" type="button" onClick={onFinishRecording}>完成錄音</button>}
        </div>
      </div>
    </section>
  );
};
