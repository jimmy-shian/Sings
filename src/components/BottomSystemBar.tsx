import React, { useRef, useState, useCallback } from 'react';
import { formatTime } from '../utils/format';

interface BottomSystemBarProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isRecording: boolean;
  isPaused: boolean;
  title: string;
  sourceMode: 'local' | 'youtube';
  inputLevel: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onToggleRecord: () => void;
}

export const BottomSystemBar: React.FC<BottomSystemBarProps> = ({
  currentTime,
  duration,
  isPlaying,
  isRecording,
  isPaused,
  title,
  sourceMode,
  inputLevel,
  onTogglePlay,
  onSeek,
  onToggleRecord,
}) => {
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  // 時間軸左右內距（px），需與 CSS .yt-scrubber-track 的 padding 左右值保持一致，
  // 讓手指在左右邊緣按壓時仍可精準換算比例，不會因邊框留白而失準
  const SCRUBBER_EDGE_PAD = 16;

  const safeDuration = Math.max(duration, 1);
  const progressPercent = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100));

  const calculateTimeFromEvent = useCallback(
    (clientX: number) => {
      if (!progressBarRef.current) return 0;
      const rect = progressBarRef.current.getBoundingClientRect();
      // 扣除左右內距後的可操作寬度，使換算基準與視覺軌道一致
      const usableWidth = Math.max(1, rect.width - SCRUBBER_EDGE_PAD * 2);
      const clickX = Math.max(0, Math.min(usableWidth, clientX - rect.left - SCRUBBER_EDGE_PAD));
      const ratio = clickX / usableWidth;
      return ratio * safeDuration;
    },
    [safeDuration]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const time = calculateTimeFromEvent(e.clientX);
    onSeek(time);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      const time = calculateTimeFromEvent(e.clientX);
      onSeek(time);
    }
    if (progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const usableWidth = Math.max(1, rect.width - SCRUBBER_EDGE_PAD * 2);
      const x = Math.max(0, Math.min(usableWidth, e.clientX - rect.left - SCRUBBER_EDGE_PAD));
      setHoverX(SCRUBBER_EDGE_PAD + x);
      setHoverTime((x / usableWidth) * safeDuration);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(false);
  };

  const handlePointerLeave = () => {
    if (!isDragging) {
      setHoverTime(null);
    }
  };

  const statusLabel = isRecording
    ? 'REC 錄音'
    : isPaused
    ? 'PAUSE'
    : isPlaying
    ? 'PLAY 播放'
    : '待機';

  const statusColor = isRecording
    ? '#ef4444'
    : isPaused
    ? '#f59e0b'
    : isPlaying
    ? '#10b981'
    : 'var(--text-muted)';

  return (
    <div className="bottom-system-bar-container">
      {/* YouTube 風格高精準時間軸進度拖曳條 (Scrubber) */}
      <div
        ref={progressBarRef}
        className={`yt-scrubber-track ${isDragging ? 'dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        title="拖曳或點擊跳轉時間軸"
      >
        <div
          className="yt-scrubber-fill"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="yt-scrubber-handle" />
        </div>

        {/* 拖曳/懸浮時顯示預覽時間標籤 */}
        {hoverTime !== null && (
          <div
            className="yt-scrubber-tooltip"
            style={{ left: `${hoverX}px` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* 底部系統顯示器主體 (Mini Player Bar) */}
      <div className="bottom-system-bar-content">
        {/* 行1：標題 + 時間 + 狀態 badge 並排 */}
        <div className="bottom-bar-info-row">
          <span
            className="bottom-bar-pulse-dot"
            style={{ backgroundColor: statusColor }}
          />
          <span className="bottom-bar-title" title={title}>
            {title || (sourceMode === 'youtube' ? 'YouTube 伴奏' : '未載入伴奏音訊')}
          </span>
          <span className="bottom-bar-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <span className="bottom-bar-status-badge" style={{ color: statusColor }}>
            {statusLabel}
          </span>
          {isRecording && (
            <span className="bottom-bar-level-badge">
              麥克風: {inputLevel.toFixed(0)} dB
            </span>
          )}
        </div>

        {/* 行2：控制按鈕組 */}
        <div className="bottom-bar-right">
          {/* 快退 5s */}
          <button
            className="bottom-bar-btn btn-icon bottom-bar-seek-btn"
            type="button"
            onClick={() => onSeek(Math.max(0, currentTime - 5))}
            title="倒退 5 秒"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            <span className="seek-text">5s</span>
          </button>

          {/* 核心播放 / 暫停按鍵 (影音播放器效果) */}
          <button
            className={`bottom-bar-btn bottom-bar-play-btn ${isPlaying ? 'playing' : ''}`}
            type="button"
            onClick={onTogglePlay}
            title={isPlaying ? '暫停播放' : '開始播放'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* 快進 5s */}
          <button
            className="bottom-bar-btn btn-icon bottom-bar-seek-btn"
            type="button"
            onClick={() => onSeek(Math.min(duration, currentTime + 5))}
            title="快進 5 秒"
          >
            <span className="seek-text">5s</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>

          {/* 快速錄音按鈕 */}
          <button
            className={`bottom-bar-btn bottom-bar-rec-btn ${isRecording ? 'recording' : ''}`}
            type="button"
            onClick={onToggleRecord}
            title={isRecording ? '結束錄音' : '開始錄音'}
          >
            <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
              <circle cx="12" cy="12" r="8" />
            </svg>
            <span className="rec-text">{isRecording ? '完成' : '錄音'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
