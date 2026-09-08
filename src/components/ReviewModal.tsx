import React, { useState } from 'react';
import type { VocalTake } from '../types';
import { TimelineCanvas } from './TimelineCanvas';
import { useTimeline } from '../hooks/useTimeline';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  backingPeaks: Float32Array | null;
  vocalTakes: VocalTake[];
  backingVolume: number;
  vocalVolume: number;
  backingMuted: boolean;
  vocalMuted: boolean;
  reverbEnabled: boolean;
  latencyOffsetMs: number;
  defaultTitle: string;
  onTogglePlayPreview: () => void;
  onSeekPreview: (time: number) => void;
  onResetPreview: () => void;
  onBackingVolumeChange: (vol: number) => void;
  onVocalVolumeChange: (vol: number) => void;
  onToggleBackingMute: () => void;
  onToggleVocalMute: () => void;
  onToggleReverb: () => void;
  onLatencyOffsetChange: (offsetMs: number) => void;
  onSaveToLibrary: (title: string) => Promise<void>;
  onExportWav: () => Promise<void>;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  duration,
  currentTime,
  isPlaying,
  backingPeaks,
  vocalTakes,
  backingVolume,
  vocalVolume,
  backingMuted,
  vocalMuted,
  reverbEnabled,
  latencyOffsetMs,
  defaultTitle,
  onTogglePlayPreview,
  onSeekPreview,
  onResetPreview,
  onBackingVolumeChange,
  onVocalVolumeChange,
  onToggleBackingMute,
  onToggleVocalMute,
  onToggleReverb,
  onLatencyOffsetChange,
  onSaveToLibrary,
  onExportWav,
}) => {
  const reviewTimeline = useTimeline(duration);
  const [saveTitle, setSaveTitle] = useState(defaultTitle || '我的演唱作品');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExportWav();
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveConfirm = async () => {
    if (!saveTitle.trim()) return;
    await onSaveToLibrary(saveTitle.trim());
    setShowSaveDialog(false);
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1500,
        padding: '24px',
      }}
    >
      <div
        className="modal-card"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0,0,0,0.7)',
          overflow: 'hidden',
        }}
      >
        <div
          className="modal-header"
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--surface-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🎛️</span>
            <span style={{ fontWeight: 700, fontSize: '17px', color: 'var(--text-primary)' }}>
              獨立後製混音專屬視窗 (Dual-Track Mixing Console)
            </span>
            <span className="badge-tag" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
              60 FPS 雙軌同步
            </span>
          </div>
          <button className="btn btn-sm" type="button" onClick={onClose} style={{ padding: '6px 14px' }}>
            ✕ 關閉視窗
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              雙軌同步時間軸可視化
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button className="btn btn-sm" type="button" onClick={reviewTimeline.zoomOut}>-</button>
              <span className="zoom-badge">{reviewTimeline.timelineState.zoomLevel.toFixed(1)}x</span>
              <button className="btn btn-sm" type="button" onClick={reviewTimeline.zoomIn}>+</button>
              <button className="btn btn-sm" type="button" onClick={reviewTimeline.zoomReset}>1:1</button>
            </div>
          </div>

          <div style={{ height: '180px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <TimelineCanvas
              duration={duration}
              currentTime={currentTime}
              viewStartTime={reviewTimeline.timelineState.viewStartTime}
              zoomLevel={reviewTimeline.timelineState.zoomLevel}
              backingPeaks={backingPeaks}
              vocalTakes={vocalTakes}
              onSeek={onSeekPreview}
              onZoom={reviewTimeline.zoom}
              onPan={reviewTimeline.pan}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 16px',
              backgroundColor: 'var(--surface-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              className={`btn ${isPlaying ? 'btn-warning' : 'btn-primary'}`}
              type="button"
              onClick={onTogglePlayPreview}
              style={{ minWidth: '130px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {isPlaying ? (
                <>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                  <span>暫停播放</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>播放雙軌混音</span>
                </>
              )}
            </button>

            <button className="btn btn-sm" type="button" onClick={onResetPreview} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
              <span>重置起點</span>
            </button>

            <input
              type="range"
              min="0"
              max={Math.max(1, duration)}
              step="0.05"
              value={currentTime}
              onChange={(e) => onSeekPreview(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)' }}
            />

            <span style={{ fontSize: '13.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', minWidth: '135px', textAlign: 'right' }}>
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                  伴奏軌 (Backing)
                </span>
                <button
                  className={`btn btn-sm ${backingMuted ? 'btn-danger' : 'btn-outline'}`}
                  type="button"
                  onClick={onToggleBackingMute}
                >
                  {backingMuted ? '已靜音' : '靜音'}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>音量:</span>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.01"
                  value={backingVolume}
                  onChange={(e) => onBackingVolumeChange(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span className="vol-badge">{Math.round(backingVolume * 100)}%</span>
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                backgroundColor: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  人聲軌 (Vocals)
                </span>
                <button
                  className={`btn btn-sm ${vocalMuted ? 'btn-danger' : 'btn-outline'}`}
                  type="button"
                  onClick={onToggleVocalMute}
                >
                  {vocalMuted ? '已靜音' : '靜音'}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>音量:</span>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.01"
                  value={vocalVolume}
                  onChange={(e) => onVocalVolumeChange(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span className="vol-badge">{Math.round(vocalVolume * 100)}%</span>
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                backgroundColor: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  後製效果 (DSP)
                </span>
                <button
                  className={`btn btn-sm ${reverbEnabled ? 'btn-primary' : 'btn-outline'}`}
                  type="button"
                  onClick={onToggleReverb}
                >
                  KTV 空間殘響: {reverbEnabled ? '開' : '關'}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>人聲延遲:</span>
                <input
                  type="range"
                  min="-250"
                  max="250"
                  step="5"
                  value={latencyOffsetMs}
                  onChange={(e) => onLatencyOffsetChange(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span className="vol-badge">{latencyOffsetMs > 0 ? '+' : ''}{latencyOffsetMs}ms</span>
              </div>
            </div>
          </div>

          {showSaveDialog && (
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: 'var(--surface-highlight)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>作品名稱:</span>
              <input
                type="text"
                className="input-text"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" type="button" onClick={handleSaveConfirm}>
                確認保存
              </button>
              <button className="btn" type="button" onClick={() => setShowSaveDialog(false)}>
                取消
              </button>
            </div>
          )}
        </div>

        <div
          className="modal-footer"
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            backgroundColor: 'var(--surface-subtle)',
          }}
        >
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => setShowSaveDialog(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>保存至本機作品庫</span>
          </button>
          <button
            className="btn btn-success"
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            style={{ minWidth: '170px', display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
          >
            {isExporting ? (
              <span>無損渲染中...</span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>匯出 16-bit WAV</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
