import React from 'react';
import { formatTime } from '../utils/format';

interface LocalPlayerBarProps {
  fileName: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onChangeFile: () => void;
}

export const LocalPlayerBar: React.FC<LocalPlayerBarProps> = ({
  fileName,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  onChangeFile,
}) => {
  return (
    <div className="local-track-player-box">
      <div className="local-track-header">
        <div className="local-track-title-wrapper">
          <span className="local-track-label">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: '4px' }}>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            伴奏:
          </span>
          <span className="local-track-name">
            {fileName}
          </span>
        </div>
        <button className="btn btn-sm" type="button" onClick={onChangeFile}>
          更換檔案
        </button>
      </div>

      <div className="local-player-controls">
        <button
          className={`btn btn-sm local-player-play-btn ${isPlaying ? 'btn-warning' : 'btn-primary'}`}
          type="button"
          onClick={onTogglePlay}
        >
          {isPlaying ? (
            <>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              <span>暫停</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>播放</span>
            </>
          )}
        </button>

        <input
          type="range"
          className="local-track-slider"
          min="0"
          max={Math.max(1, duration)}
          step="0.1"
          value={currentTime}
          onChange={(e) => onSeek(Number(e.target.value))}
        />

        <span className="local-track-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};
