import React, { useState } from 'react';
import type { LrcSearchResult } from '../types';

interface LrcSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLyrics: (lrcText: string, trackTitle?: string) => void;
}

export const LrcSearchModal: React.FC<LrcSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectLyrics,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LrcSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setResults(data);
        if (data.length === 0) setError('找不到相符的歌詞，請嘗試不同關鍵字。');
      }
    } catch (e: any) {
      setError(`搜尋失敗: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return '';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal-card lrc-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>📜</span>
            <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              LRCLIB 免費歌詞庫搜尋
            </span>
          </div>
          <button className="btn btn-sm" type="button" onClick={onClose} style={{ flexShrink: 0 }}>
            ✕ 關閉
          </button>
        </div>

        <div className="lrc-search-bar">
          <input
            type="text"
            className="input-text lrc-search-input"
            placeholder="請輸入歌曲名稱或歌手 (例如: 周杰倫 晴天)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            autoFocus
          />
          <button className="btn btn-primary lrc-search-btn" type="button" onClick={handleSearch} disabled={loading}>
            {loading ? '搜尋中...' : '搜尋'}
          </button>
        </div>

        {error && (
          <div className="lrc-search-error">
            {error}
          </div>
        )}

        <div className="lrc-results-list">
          {results.map((item) => {
            const hasSynced = !!item.syncedLyrics;
            const lrcContent = item.syncedLyrics || item.plainLyrics || '';

            return (
              <div key={item.id} className="lrc-result-card">
                <div className="lrc-result-info">
                  <div className="lrc-result-title-row">
                    <span className="lrc-track-name">
                      {item.trackName}
                    </span>
                    {hasSynced ? (
                      <span className="badge-tag" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', flexShrink: 0 }}>
                        同步動態
                      </span>
                    ) : (
                      <span className="badge-tag" style={{ backgroundColor: 'rgba(157, 163, 181, 0.2)', color: '#9da3b5', flexShrink: 0 }}>
                        純文字
                      </span>
                    )}
                  </div>
                  <div className="lrc-result-meta">
                    歌手: {item.artistName} {item.albumName ? `· 專輯: ${item.albumName}` : ''} {item.duration ? `· ${formatDuration(item.duration)}` : ''}
                  </div>
                </div>

                <button
                  className="btn btn-sm btn-primary lrc-apply-btn"
                  type="button"
                  onClick={() => {
                    onSelectLyrics(lrcContent, `${item.artistName} - ${item.trackName}`);
                    onClose();
                  }}
                  disabled={!lrcContent}
                >
                  套用此歌詞
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
