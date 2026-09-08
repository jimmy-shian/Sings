import React, { useRef, useEffect } from 'react';
import type { LyricsLine, LyricsContextMenuInfo } from '../types';
import { formatTime } from '../utils/format';

interface LyricsPanelProps {
  leftTab: 'source' | 'lyrics';
  onTabChange: (tab: 'source' | 'lyrics') => void;
  lyrics: LyricsLine[];
  currentIndex: number;
  offsetSec: number;
  rawLrcText: string;
  currentTime: number;
  onOffsetChange: (delta: number) => void;
  onOffsetReset: () => void;
  onSetAnchor: (currentTime: number, targetIndex?: number) => void;
  onOpenSearchModal: () => void;
  onImportLrc: () => void;
  onExportLrc: () => void;
  onSeekToLyric: (time: number) => void;
  onContextMenu?: (e: React.MouseEvent, info: LyricsContextMenuInfo) => void;
}

export const LyricsPanel: React.FC<LyricsPanelProps> = ({
  leftTab,
  onTabChange,
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
  const [selectedLineIndex, setSelectedLineIndex] = React.useState<number | null>(null);

  // 保持當前句歌詞平滑置中顯示於歌詞視窗中央 (Apple Music / Spotify 置中體驗)
  useEffect(() => {
    if (currentIndex >= 0 && containerRef.current && leftTab === 'lyrics') {
      const container = containerRef.current;
      const activeEl = lineRefs.current.get(currentIndex);
      if (activeEl) {
        const containerRect = container.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        const activeCenter = activeRect.top + activeRect.height / 2;
        const containerCenter = containerRect.top + containerRect.height / 2;
        const diff = activeCenter - containerCenter;
        if (Math.abs(diff) > 2) {
          container.scrollBy({ top: diff, behavior: 'smooth' });
        }
      }
    }
  }, [currentIndex, leftTab]);

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
    <div className="panel panel-equal-height lyrics-panel-root">
      <div className="panel-header">
        <div className="tab-pill-group">
          <button
            className={`tab-pill-btn ${leftTab === 'source' ? 'active' : ''}`}
            type="button"
            onClick={() => onTabChange('source')}
          >
            伴奏來源
          </button>
          <button
            className={`tab-pill-btn ${leftTab === 'lyrics' ? 'active' : ''}`}
            type="button"
            onClick={() => onTabChange('lyrics')}
          >
            同步字幕歌詞 (LRC)
          </button>
        </div>
        <span className="panel-tag">[60 FPS 平滑捲動]</span>
      </div>

      <div className="lyrics-action-bar">
        <button className="btn btn-sm btn-primary lyrics-search-btn" type="button" onClick={onOpenSearchModal}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>搜尋同步歌詞 (LRCLIB)</span>
        </button>
        <button className="btn btn-sm" type="button" onClick={onImportLrc}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>匯入 LRC</span>
        </button>
        <button className="btn btn-sm" type="button" onClick={onExportLrc}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>匯出 LRC</span>
        </button>
      </div>

      <div className="lyrics-offset-bar">
        <div className="lyrics-offset-controls">
          <span className="lyrics-offset-label">校準:</span>
          <div className="lyrics-stepper-row">
            <button className="btn btn-sm btn-stepper" type="button" onClick={() => onOffsetChange(-0.5)} title="整段提早 0.5 秒">
              -0.5s
            </button>
            <input
              type="text"
              className="offset-input"
              value={`${offsetSec >= 0 ? '+' : ''}${offsetSec.toFixed(1)}s`}
              readOnly
              title="歌詞時間偏移量"
            />
            <button className="btn btn-sm btn-stepper" type="button" onClick={() => onOffsetChange(0.5)} title="整段延後 0.5 秒">
              +0.5s
            </button>
            <button className="btn btn-sm btn-stepper-reset" type="button" onClick={onOffsetReset} title="重設為 0s">
              0s
            </button>
          </div>
        </div>

        <button
          className="btn btn-sm btn-primary lyrics-anchor-btn"
          type="button"
          onClick={() => onSetAnchor(currentTime, selectedLineIndex !== null ? selectedLineIndex : undefined)}
          title={selectedLineIndex !== null ? `以目前播放時間對齊選取的第 ${selectedLineIndex + 1} 句歌詞` : '以目前播放時間對齊當前句（或首句）'}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="22" y1="12" x2="18" y2="12" />
            <line x1="6" y1="12" x2="2" y2="12" />
            <line x1="12" y1="6" x2="12" y2="2" />
            <line x1="12" y1="22" x2="12" y2="18" />
          </svg>
          <span>{selectedLineIndex !== null ? `對齊第 ${selectedLineIndex + 1} 句` : '對齊當前句'}</span>
        </button>
      </div>

      <div ref={containerRef} className="lyrics-box lyrics-box-tall">
        {lyrics.length === 0 ? (
          <div className="lyrics-empty-placeholder">
            尚未載入動態歌詞。請由上方「搜尋同步歌詞 (LRCLIB)」線上檢索，或「匯入 LRC」本地檔案。
          </div>
        ) : (
          lyrics.map((line, idx) => (
            <div
              key={idx}
              ref={(el) => {
                if (el) lineRefs.current.set(idx, el);
                else lineRefs.current.delete(idx);
              }}
              className={`lyrics-line ${idx === currentIndex ? 'active' : ''} ${idx === selectedLineIndex ? 'selected' : ''}`}
              onClick={() => {
                setSelectedLineIndex(idx);
                onSeekToLyric(line.time + offsetSec);
              }}
              onContextMenu={(e) => {
                setSelectedLineIndex(idx);
                handleLineContextMenu(e, line, idx);
              }}
            >
              <span className="lyrics-time">
                {formatTime(Math.max(0, line.time + offsetSec))}
              </span>
              <span className="lyrics-text">
                {line.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
