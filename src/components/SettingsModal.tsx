import React from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  isDownloading: boolean;
  modelReady: boolean;
  downloadPercent: number;
  downloadFile: string;
  error: string;
  onDownloadModel: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  isDownloading,
  modelReady,
  downloadPercent,
  downloadFile,
  error,
  onDownloadModel,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay settings-overlay" role="presentation" onMouseDown={onClose}>
      <section className="settings-card" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="settings-header">
          <div>
            <h2 id="settings-title">設定</h2>
            <p>本機語音與字幕</p>
          </div>
          <button className="btn btn-sm" type="button" onClick={onClose} aria-label="關閉設定">✕</button>
        </header>

        <div className="settings-content">
          <article className="settings-model-card">
            <div className="settings-model-heading">
              <div>
                <strong>離線語音辨識</strong>
                <span className="settings-model-subtitle">Whisper Tiny 多語模型 · 約 41 MB</span>
              </div>
              <span className={`settings-model-state${modelReady ? ' ready' : ''}`}>
                {modelReady ? '已下載' : isDownloading ? '下載中' : '尚未下載'}
              </span>
            </div>
            <p>首次下載需要網路。下載完成後，錄音字幕會在裝置本機辨識，錄音不會上傳。</p>
            <p>歌曲中的伴奏與混響可能影響辨識結果，轉出的字幕可再編輯校正。</p>
            <p className="settings-model-note">下載在背景執行。切換頁面或關閉設定時會繼續；若系統暫停 App，重新開啟後可再次載入模型。</p>

            {isDownloading && (
              <div className="model-download-progress" aria-live="polite">
                <div className="model-download-label"><span>{downloadFile || '下載模型檔案'}</span><strong>{downloadPercent}%</strong></div>
                <progress max={100} value={downloadPercent}>{downloadPercent}%</progress>
              </div>
            )}

            {error && <div className="settings-error" role="alert">{error}</div>}

            <button className="btn btn-primary settings-download-btn" type="button" onClick={onDownloadModel} disabled={isDownloading || modelReady}>
              {modelReady ? '模型已就緒' : isDownloading ? `下載中 ${downloadPercent}%` : '下載並啟用模型'}
            </button>
          </article>

          <article className="settings-info-card">
            <strong>NVIDIA Nemotron</strong>
            <p>已列入評估。Nemotron 3.5 ASR Streaming 0.6B 的 q8 模型約 742 MB；官方列出 zh-CN，未列 zh-TW，NeMo-Speech.cpp 文件也沒有 Android 建置套件。此版改用約 41 MB、支援多語且可在手機瀏覽器本機執行的 Whisper Tiny。</p>
          </article>
        </div>

        <footer className="settings-footer">
          <button className="btn" type="button" onClick={onClose}>完成</button>
        </footer>
      </section>
    </div>
  );
};
