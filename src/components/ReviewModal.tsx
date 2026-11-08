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
  backingVolumeMax: number;
  vocalVolume: number;
  backingMuted: boolean;
  vocalMuted: boolean;
  reverbEnabled: boolean;
  latencyOffsetMs: number;
  defaultTitle: string;
  sourceMode: 'local' | 'youtube';
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
  onExportMp3: () => Promise<void>;
  onExportVideo: () => Promise<void>;
  videoExporting?: boolean;
  videoProgress?: number;
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
  backingVolumeMax,
  vocalVolume,
  backingMuted,
  vocalMuted,
  reverbEnabled,
  latencyOffsetMs,
  defaultTitle,
  sourceMode,
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
  onExportMp3,
  onExportVideo,
  videoExporting = false,
  videoProgress = 0,
}) => {
  const reviewTimeline = useTimeline(duration);
  const [saveTitle, setSaveTitle] = useState(defaultTitle || '我的演唱作品');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExportWav();
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMp3Click = async () => {
    setIsExporting(true);
    try {
      await onExportMp3();
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportVideoClick = async () => {
    if (videoExporting) return;
    await onExportVideo();
  };

  const anyExporting = isExporting || videoExporting;

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
        backgroundColor: 'rgba(5, 6, 8, 0.88)',
        backdropFilter: 'blur(16px)',
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
          backgroundColor: '#0d0f14',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1080px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 32px 64px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#12151c',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14"></line>
                <line x1="4" y1="10" x2="4" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="3"></line>
                <line x1="20" y1="21" x2="20" y2="16"></line>
                <line x1="20" y1="12" x2="20" y2="3"></line>
                <line x1="1" y1="14" x2="7" y2="14"></line>
                <line x1="9" y1="8" x2="15" y2="8"></line>
                <line x1="17" y1="16" x2="23" y2="16"></line>
              </svg>
            </div>
            <span style={{ fontWeight: 600, fontSize: '15px', letterSpacing: '0.02em', color: '#f4f5f8' }}>
              MASTERING & MIX CONSOLE
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.04em',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontWeight: 600,
            }}>
              HARDWARE SYNC
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Timeline Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {sourceMode === 'youtube' ? 'Vocal Track (YouTube Streaming)' : 'Dual-Track Waveform Preview'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button className="btn btn-sm" type="button" onClick={reviewTimeline.zoomOut} style={{ padding: '2px 8px', fontSize: '11px' }}>-</button>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', padding: '0 4px' }}>
                  {reviewTimeline.timelineState.zoomLevel.toFixed(1)}x
                </span>
                <button className="btn btn-sm" type="button" onClick={reviewTimeline.zoomIn} style={{ padding: '2px 8px', fontSize: '11px' }}>+</button>
                <button className="btn btn-sm" type="button" onClick={reviewTimeline.zoomReset} style={{ padding: '2px 8px', fontSize: '11px' }}>1:1</button>
              </div>
            </div>

            <div style={{ height: '170px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: '#07080a' }}>
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
          </div>

          {/* Transport Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 18px',
              backgroundColor: '#12151c',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <button
              type="button"
              onClick={onTogglePlayPreview}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                backgroundColor: isPlaying ? 'rgba(245, 158, 11, 0.15)' : '#2563eb',
                color: isPlaying ? '#f59e0b' : '#ffffff',
                border: isPlaying ? '1px solid rgba(245, 158, 11, 0.4)' : 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {isPlaying ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                    <rect x="14" y="4" width="4" height="16" rx="1"></rect>
                  </svg>
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  <span>PLAY PREVIEW</span>
                </>
              )}
            </button>

            <button
              className="btn btn-sm"
              type="button"
              onClick={onResetPreview}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-secondary)',
                padding: '7px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
              <span>RESET</span>
            </button>

            <input
              type="range"
              min="0"
              max={Math.max(1, duration)}
              step="0.05"
              value={currentTime}
              onChange={(e) => onSeekPreview(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#3b82f6', cursor: 'pointer' }}
            />

            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: '#f4f5f8',
              letterSpacing: '0.04em',
              minWidth: '150px',
              textAlign: 'right',
            }}>
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          {/* Mixing Channels Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px' }}>
            {/* Backing Channel */}
            <div
              style={{
                padding: '16px',
                backgroundColor: '#12151c',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#f4f5f8', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                  BACKING TRACK
                </span>
                <button
                  type="button"
                  onClick={onToggleBackingMute}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: backingMuted ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: backingMuted ? '#ef4444' : 'var(--text-muted)',
                    border: `1px solid ${backingMuted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {backingMuted ? 'MUTED' : 'MUTE'}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>VOL</span>
                <input
                  type="range"
                  min="0"
                  max={backingVolumeMax}
                  step="0.01"
                  value={backingVolume}
                  onChange={(e) => onBackingVolumeChange(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#3b82f6' }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', minWidth: '40px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {Math.round(Math.min(backingVolume, backingVolumeMax) * 100)}%
                </span>
              </div>
            </div>

            {/* Vocal Channel */}
            <div
              style={{
                padding: '16px',
                backgroundColor: '#12151c',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#f4f5f8', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  VOCAL TRACK
                </span>
                <button
                  type="button"
                  onClick={onToggleVocalMute}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: vocalMuted ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: vocalMuted ? '#ef4444' : 'var(--text-muted)',
                    border: `1px solid ${vocalMuted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {vocalMuted ? 'MUTED' : 'MUTE'}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>VOL</span>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.01"
                  value={vocalVolume}
                  onChange={(e) => onVocalVolumeChange(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#3b82f6' }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', minWidth: '40px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {Math.round(vocalVolume * 100)}%
                </span>
              </div>
            </div>

            {/* FX & Latency Offset */}
            <div
              style={{
                padding: '16px',
                backgroundColor: '#12151c',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#f4f5f8', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  DSP & ALIGNMENT
                </span>
                <button
                  type="button"
                  onClick={onToggleReverb}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: reverbEnabled ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    color: reverbEnabled ? '#3b82f6' : 'var(--text-muted)',
                    border: `1px solid ${reverbEnabled ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  REVERB: {reverbEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SYNC</span>
                <input
                  type="range"
                  min="-250"
                  max="250"
                  step="1"
                  value={latencyOffsetMs}
                  onChange={(e) => onLatencyOffsetChange(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#3b82f6' }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', minWidth: '55px', textAlign: 'right', color: '#10b981' }}>
                  {latencyOffsetMs > 0 ? '+' : ''}{latencyOffsetMs}ms
                </span>
              </div>
            </div>
          </div>

          {showSaveDialog && (
            <div
              style={{
                padding: '14px 18px',
                backgroundColor: '#161922',
                borderRadius: '10px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f4f5f8' }}>專案名稱:</span>
              <input
                type="text"
                className="input-text"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: '#0d0f14',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#ffffff',
                }}
              />
              <button className="btn btn-primary" type="button" onClick={handleSaveConfirm} style={{ padding: '8px 16px', borderRadius: '6px' }}>
                確認保存
              </button>
              <button className="btn" type="button" onClick={() => setShowSaveDialog(false)} style={{ padding: '8px 16px', borderRadius: '6px' }}>
                取消
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: '12px',
            backgroundColor: '#12151c',
          }}
        >
          {videoExporting && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: 'auto' }}>
              <span style={{ fontSize: '12.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                RENDERING MP4: {Math.round(videoProgress * 100)}%
              </span>
              <div style={{ width: '140px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.round(videoProgress * 100)}%`, height: '100%', backgroundColor: '#3b82f6', transition: 'width 0.2s linear' }} />
              </div>
            </div>
          )}

          <button
            className="btn btn-outline"
            type="button"
            onClick={() => setShowSaveDialog(true)}
            disabled={anyExporting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', fontSize: '12px' }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>保存專案</span>
          </button>

          <button
            className="btn btn-outline"
            type="button"
            onClick={handleExportMp3Click}
            disabled={anyExporting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', fontSize: '12px' }}
          >
            {isExporting ? (
              <span>編碼中...</span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
                <span>匯出 MP3</span>
              </>
            )}
          </button>

          <button
            className="btn"
            type="button"
            onClick={handleExport}
            disabled={anyExporting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            {isExporting ? (
              <span>渲染中...</span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>匯出 WAV</span>
              </>
            )}
          </button>

          <button
            className="btn btn-primary"
            type="button"
            onClick={handleExportVideoClick}
            disabled={anyExporting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '6px',
              fontSize: '12px',
              backgroundColor: '#3b82f6',
              fontWeight: 600,
            }}
          >
            {videoExporting ? (
              <span>渲染中 {Math.round(videoProgress * 100)}%...</span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <span>匯出 MP4 影片</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
