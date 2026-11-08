import React from 'react';

// ============================================================================
// SingStudio - RecordingControls (Teenage Engineering / Hardware Tactile Deck)
// ============================================================================

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  hasRecording: boolean;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onFinishRecording: () => void;
  onResetRecording: () => void;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  isPaused,
  hasRecording,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onFinishRecording,
  onResetRecording,
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '12px 18px',
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(12px)',
      width: 'fit-content',
      margin: '0 auto',
    }}>
      {/* 待命：主錄音按鈕 */}
      {!isRecording && !isPaused && !hasRecording && (
        <button
          type="button"
          onClick={onStartRecording}
          title="開始錄音 (Space)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 22px',
            borderRadius: '9999px',
            backgroundColor: '#ff3b30',
            color: '#ffffff',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(255, 59, 48, 0.35)',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            display: 'inline-block',
          }} />
          <span>START RECORDING</span>
        </button>
      )}

      {/* 錄音中：暫停 */}
      {isRecording && (
        <button
          type="button"
          onClick={onPauseRecording}
          title="暫停錄製 (Space)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '8px',
            backgroundColor: '#1f222b',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1"></rect>
          </svg>
          <span>PAUSE</span>
        </button>
      )}

      {/* 暫停中：接續 Punch-in */}
      {isPaused && (
        <button
          type="button"
          onClick={onResumeRecording}
          title="接續錄製"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '8px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>PUNCH-IN RESUME</span>
        </button>
      )}

      {/* 完成演唱或重置 */}
      {(isRecording || isPaused || (hasRecording && !isRecording)) && (
        <>
          <button
            type="button"
            onClick={onFinishRecording}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>FINISH & MIX</span>
          </button>

          <button
            type="button"
            onClick={onResetRecording}
            disabled={isRecording}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: isRecording ? 'not-allowed' : 'pointer',
              opacity: isRecording ? 0.4 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
            <span>RESET</span>
          </button>
        </>
      )}
    </div>
  );
};
