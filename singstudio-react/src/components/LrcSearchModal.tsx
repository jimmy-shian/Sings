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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="modal-card"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '650px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📜</span>
            <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>
              LRCLIB 免費開源歌詞庫搜尋
            </span>
          </div>
          <button className="btn btn-sm" type="button" onClick={onClose} style={{ padding: '4px 10px' }}>
            ✕ 關閉
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="input-text"
            placeholder="請輸入歌曲名稱或歌手 (例如: 周杰倫 晴天)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1 }}
            autoFocus
          />
          <button className="btn btn-primary" type="button" onClick={handleSearch} disabled={loading}>
            {loading ? '搜尋中...' : '搜尋'}
          </button>
        </div>

        {error && (
          <div style={{ padding: '0 20px 10px', color: 'var(--danger)', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {results.map((item) => {
            const hasSynced = !!item.syncedLyrics;
            const lrcContent = item.syncedLyrics || item.plainLyrics || '';

            return (
              <div
                key={item.id}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--surface-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>
                      {item.trackName}
                    </span>
                    {hasSynced ? (
                      <span className="badge-tag" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                        同步動態
                      </span>
                    ) : (
                      <span className="badge-tag" style={{ backgroundColor: 'rgba(157, 163, 181, 0.2)', color: '#9da3b5' }}>
                        純文字
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    歌手: {item.artistName} {item.albumName ? `· 專輯: ${item.albumName}` : ''} {item.duration ? `· ${formatDuration(item.duration)}` : ''}
                  </div>
                </div>

                <button
                  className="btn btn-sm btn-primary"
                  type="button"
                  onClick={() => {
                    onSelectLyrics(lrcContent, `${item.artistName} - ${item.trackName}`);
                    onClose();
                  }}
                  disabled={!lrcContent}
                  style={{ whiteSpace: 'nowrap' }}
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
