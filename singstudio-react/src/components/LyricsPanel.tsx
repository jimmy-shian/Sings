import React, { useRef, useEffect } from 'react';
import type { LyricsLine, LyricsContextMenuInfo } from '../types';

interface LyricsPanelProps {
  lyrics: LyricsLine[];
  currentIndex: number;
  offsetSec: number;
  rawLrcText: string;
  currentTime: number;
  onOffsetChange: (delta: number) => void;
  onOffsetReset: () => void;
  onSetAnchor: (currentTime: number) => void;
  onOpenSearchModal: () => void;
  onImportLrc: () => void;
  onExportLrc: () => void;
  onSeekToLyric: (time: number) => void;
  onContextMenu?: (e: React.MouseEvent, info: LyricsContextMenuInfo) => void;
}

export const LyricsPanel: React.FC<LyricsPanelProps> = ({
  lyrics,
  currentIndex,
  offsetSec,
  currentTime,
  onOffsetChange,
  onOffsetReset,
  onSetAnchor,
  onOpenSearchModal,
  onImportLrc,
  onExportLrc,
  onSeekToLyric,
  onContextMenu,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (currentIndex >= 0 && containerRef.current) {
      const activeEl = lineRefs.current.get(currentIndex);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentIndex]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLineContextMenu = (e: React.MouseEvent, line: LyricsLine, index: number) => {
    e.preventDefault();
    if (onContextMenu) {
      onContextMenu(e, {
        x: e.clientX,
        y: e.clientY,
        index,
        line,
      });
    }
  };

  return (
    <div className="panel panel-equal-height" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <span className="panel-title">同步字幕視窗 (60 FPS 平滑捲動)</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-sm btn-primary" type="button" onClick={onOpenSearchModal}>
            🔍 搜尋同步歌詞 (LRCLIB)
          </button>
          <button className="btn btn-sm" type="button" onClick={onImportLrc}>
            匯入 LRC
          </button>
          <button className="btn btn-sm" type="button" onClick={onExportLrc}>
            匯出 LRC
          </button>
        </div>
      </div>

      <div
        className="lyrics-offset-bar"
        style={{
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--surface-subtle)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-muted)' }}>歌詞起點校準:</span>
          <button className="btn btn-sm" type="button" onClick={() => onOffsetChange(-0.5)} title="整段提早 0.5 秒">
            -0.5s
          </button>
          <input
            type="text"
            className="offset-input"
            value={`${offsetSec >= 0 ? '+' : ''}${offsetSec.toFixed(1)}s`}
            readOnly
            title="歌詞時間偏移量"
          />
          <button className="btn btn-sm" type="button" onClick={() => onOffsetChange(0.5)} title="整段延後 0.5 秒">
            +0.5s
          </button>
          <button className="btn btn-sm" type="button" onClick={onOffsetReset} title="重設為 0s">
            0s
          </button>
        </div>

        <button
          className="btn btn-sm btn-primary"
          type="button"
          onClick={() => onSetAnchor(currentTime)}
          title="以目前播放指針時間設為當前句歌詞起點"
        >
          📍 對齊當前句
        </button>
      </div>

      <div
        ref={containerRef}
        className="lyrics-box lyrics-box-tall"
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: '340px',
          padding: '24px 16px',
          backgroundColor: '#1a1c24',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}
      >
        {lyrics.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            尚無歌詞。可點擊上方「搜尋同步歌詞 (LRCLIB)」線上檢索，或「匯入 LRC」本地檔案。
          </div>
        ) : (
          lyrics.map((line, idx) => (
            <div
              key={idx}
              ref={(el) => {
                if (el) lineRefs.current.set(idx, el);
                else lineRefs.current.delete(idx);
              }}
              className={`lyrics-line ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => onSeekToLyric(line.time + offsetSec)}
              onContextMenu={(e) => handleLineContextMenu(e, line, idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '10px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: idx === currentIndex ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                borderLeft: idx === currentIndex ? '3px solid #3b82f6' : '3px solid transparent',
              }}
            >
              <span
                className="lyrics-time"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12.5px',
                  color: idx === currentIndex ? '#3b82f6' : '#6b7280',
                  minWidth: '45px',
                }}
              >
                {formatTime(line.time)}
              </span>
              <span
                className="lyrics-text"
                style={{
                  fontSize: idx === currentIndex ? '17px' : '15px',
                  fontWeight: idx === currentIndex ? 600 : 400,
                  color: idx === currentIndex ? '#ffffff' : '#9da3b5',
                  lineHeight: 1.4,
                }}
              >
                {line.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
