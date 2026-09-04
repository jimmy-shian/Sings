import React from 'react';

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
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="local-track-player-box"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        backgroundColor: 'var(--surface-subtle)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        marginBottom: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>🎵 伴奏:</span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fileName}
          </span>
        </div>
        <button className="btn btn-sm" type="button" onClick={onChangeFile}>
          更換檔案
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          className={`btn btn-sm ${isPlaying ? 'btn-warning' : 'btn-primary'}`}
          type="button"
          onClick={onTogglePlay}
          style={{ minWidth: '70px' }}
        >
          {isPlaying ? '暫停' : '▶ 播放'}
        </button>

        <input
          type="range"
          min="0"
          max={Math.max(1, duration)}
          step="0.1"
          value={currentTime}
          onChange={(e) => onSeek(Number(e.target.value))}
          style={{ flex: 1, accentColor: 'var(--accent)' }}
        />

        <span style={{ fontSize: '12.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', minWidth: '95px', textAlign: 'right' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};
