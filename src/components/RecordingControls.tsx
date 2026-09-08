import React from 'react';

// ============================================================================
// SingStudio - RecordingControls 元件 (錄音操作按鈕列)
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
    <div className="action-bar">
      {!isRecording && !isPaused && !hasRecording && (
        <button className="btn btn-record" type="button" onClick={onStartRecording} title="快捷鍵: 空白鍵 Space">
          <svg className="icon" style={{ stroke: '#ffffff' }} viewBox="0 0 24 24">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          開始錄製 (伴奏 + 麥克風)
        </button>
      )}

      {isRecording && (
        <button className="btn btn-warning" type="button" onClick={onPauseRecording} title="快捷鍵: 空白鍵 Space">
          <svg className="icon" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
          暫停錄製
        </button>
      )}

      {isPaused && (
        <button className="btn btn-primary" type="button" onClick={onResumeRecording}>
          <svg className="icon" viewBox="0 0 24 24">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
          </svg>
          接續錄製 (Punch-in)
        </button>
      )}

      {hasRecording && !isRecording && (
        <>
          <button className="btn btn-success" type="button" onClick={onFinishRecording}>
            <svg className="icon" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            完成演唱 · 進入後製混音
          </button>
          <button className="btn" type="button" onClick={onResetRecording}>
            <svg className="icon" viewBox="0 0 24 24">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
            重新開始
          </button>
        </>
      )}
    </div>
  );
};
