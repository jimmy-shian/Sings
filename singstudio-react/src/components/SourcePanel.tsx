import React, { useState, useRef } from 'react';
import type { YouTubeResult } from '../types';

// ============================================================================
// SingStudio - SourcePanel 元件 (伴奏來源面板)
// ============================================================================

interface SourcePanelProps {
  sourceMode: 'local' | 'youtube' | 'demo';
  onSourceModeChange: (mode: 'local' | 'youtube' | 'demo') => void;
  leftTab: 'source' | 'lyrics';
  onTabChange: (tab: 'source' | 'lyrics') => void;
  onLoadLocalFile: (file: File) => void;
  onLoadDemo: () => void;
  onYouTubeSearch: (query: string) => void;
  isSearching: boolean;
  searchResults: YouTubeResult[];
  currentVideoId: string | null;
  karaokeMode: boolean;
  onKaraokeModeChange: (enabled: boolean) => void;
  youtubeContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const SourcePanel: React.FC<SourcePanelProps> = ({
  sourceMode,
  onSourceModeChange,
  leftTab,
  onTabChange,
  onLoadLocalFile,
  onLoadDemo,
  onYouTubeSearch,
  isSearching,
  searchResults,
  currentVideoId,
  karaokeMode,
  onKaraokeModeChange,
  youtubeContainerRef,
}) => {
  const [ytQuery, setYtQuery] = useState('https://www.youtube.com/watch?v=VS1lvYuW3LQ');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadLocalFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      onLoadLocalFile(file);
    }
  };

  const handleYtPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text && text.trim()) {
      const clean = text.trim();
      setYtQuery(clean);
      // 若貼上內容含有 YouTube 網址或 11 碼 ID，自動觸發直連查詢載入
      if (/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/[^\s]+|[a-zA-Z0-9_-]{11})/i.test(clean)) {
        setTimeout(() => {
          onYouTubeSearch(clean);
        }, 50);
      }
    }
  };

  const handleYtKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onYouTubeSearch(ytQuery);
    }
  };

  return (
    <div className="panel panel-equal-height">
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
        <span className="panel-tag" id="sourceModeBadge">
          {sourceMode === 'youtube' ? '[YouTube 直連]' : sourceMode === 'demo' ? '[示範和弦]' : '[本地檔案]'}
        </span>
      </div>

      <div className="tab-group" style={{ marginBottom: '12px' }}>
        <button
          className={`tab-btn ${sourceMode === 'local' ? 'active' : ''}`}
          type="button"
          onClick={() => onSourceModeChange('local')}
        >
          本地檔案 (MP3/WAV)
        </button>
        <button
          className={`tab-btn ${sourceMode === 'youtube' ? 'active' : ''}`}
          type="button"
          onClick={() => onSourceModeChange('youtube')}
        >
          YouTube 直連搜尋
        </button>
        <button
          className={`tab-btn ${sourceMode === 'demo' ? 'active' : ''}`}
          type="button"
          onClick={() => onSourceModeChange('demo')}
        >
          內建示範和弦
        </button>
      </div>

      {/* 本地檔案面板 */}
      {sourceMode === 'local' && (
        <div className="source-pane active">
          <div
            className="dropzone"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <svg className="icon" style={{ width: '36px', height: '36px' }} viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <div className="dropzone-title">拖曳伴奏音訊至此，或點擊選取</div>
            <div className="dropzone-hint">支援 MP3, WAV, M4A, FLAC 音訊格式</div>
            <button
              className="btn btn-sm btn-primary"
              type="button"
              style={{ marginTop: '6px' }}
              onClick={() => fileInputRef.current?.click()}
            >
              選擇本地檔案
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>
        </div>
      )}

      {/* YouTube 搜尋面板 */}
      {sourceMode === 'youtube' && (
        <div className="source-pane active">
          <div className="search-bar">
            <input
              type="text"
              className="input-text"
              value={ytQuery}
              onChange={(e) => setYtQuery(e.target.value)}
              onPaste={handleYtPaste}
              onKeyDown={handleYtKeyDown}
              placeholder="輸入歌曲關鍵字或直接貼上 YouTube 網址"
            />
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => onYouTubeSearch(ytQuery)}
              disabled={isSearching}
            >
              {isSearching ? '搜尋中...' : '搜尋 / 載入'}
            </button>
          </div>

          <div className="yt-search-options">
            <label className="karaoke-toggle-lbl">
              <input
                type="checkbox"
                checked={karaokeMode}
                onChange={(e) => onKaraokeModeChange(e.target.checked)}
              />
              <span className="karaoke-badge">伴奏/Karaoke 優先推薦</span>
            </label>
          </div>

          <div id="ytPlayerBox" className="yt-player-box">
            <div ref={youtubeContainerRef} id="youtubePlayerContainer"></div>
          </div>

          <div id="ytResults" className="yt-results-list">
            {searchResults.length === 0 && !isSearching && (
              <div style={{ padding: '14px', color: 'var(--text-muted)', fontSize: '15px', textAlign: 'center' }}>
                輸入關鍵字點擊「搜尋」，或直接貼上 YouTube 網址載入伴奏
              </div>
            )}
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                className={`yt-result-item ${currentVideoId === result.id ? 'active' : ''}`}
                onClick={() => onYouTubeSearch(result.id)}
              >
                {result.thumbnail && (
                  <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="yt-result-thumb"
                    loading="lazy"
                  />
                )}
                <div className="yt-result-details">
                  <div className="yt-result-title">{result.title}</div>
                  <div className="yt-result-meta">
                    {result.duration && <span>{result.duration}</span>}
                    {result.channel && <span>{result.channel}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 示範伴奏面板 */}
      {sourceMode === 'demo' && (
        <div className="source-pane active">
          <div
            style={{
              padding: '14px',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0, flex: '1 1 200px' }}>
              <div style={{ fontWeight: 600, fontSize: '15px', wordBreak: 'break-word' }}>
                卡農經典和弦進行 (C - G - Am - Em - F - C - F - G)
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginTop: '2px' }}>
                內建 56 秒無損合成伴奏
              </div>
            </div>
            <button className="btn btn-primary" type="button" onClick={onLoadDemo} style={{ whiteSpace: 'nowrap' }}>
              載入示範伴奏
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
