import React, { useState, useEffect } from 'react';
import type { LrcSearchResult } from '../types';
import { formatDuration } from '../utils/format';

interface LrcSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLyrics: (lrcText: string, trackTitle?: string) => void;
  defaultQuery?: string;
}

export const LrcSearchModal: React.FC<LrcSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectLyrics,
  defaultQuery = '',
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LrcSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 當對話框開啟時，自動預填當前伴奏/影片歌曲名稱
  useEffect(() => {
    if (isOpen) {
      setQuery(defaultQuery);
      setError(null);
    }
  }, [isOpen, defaultQuery]);

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card lrc-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-title-icon">📜</span>
            <span className="modal-title-text">
              LRCLIB 免費歌詞庫搜尋
            </span>
          </div>
          <button className="btn btn-sm modal-close-btn" type="button" onClick={onClose}>
            ✕ 關閉
          </button>
        </div>

        <div className="lrc-search-bar">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="input-text lrc-search-input search-input-with-clear"
              placeholder="請輸入歌曲名稱或歌手 (例如: 周杰倫 晴天)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              autoFocus
            />
            {query && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setQuery('')}
                title="全部清除"
              >
                ✕
              </button>
            )}
          </div>
          <button
            className="btn btn-primary lrc-search-btn search-submit-btn"
            type="button"
            onClick={handleSearch}
            disabled={loading}
          >
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
                      <span className="badge-tag badge-synced">
                        同步動態
                      </span>
                    ) : (
                      <span className="badge-tag badge-plain">
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
