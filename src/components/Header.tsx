import React from 'react';

// ============================================================================
// SingStudio - Header 元件
// ============================================================================

interface HeaderProps {
  version: string;
  libraryOpen: boolean;
  libraryDisabled: boolean;
  settingsDisabled: boolean;
  onToggleLibrary: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ version, libraryOpen, libraryDisabled, settingsDisabled, onToggleLibrary, onOpenSettings }) => {
  return (
    <header className="top-nav">
      <div className="nav-left">
        <div className="logo">
          <svg className="icon-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 12l2 2 4-4"></path>
          </svg>
          <span className="logo-text">SingStudio</span>
          <span className="badge-tag">DAW PRO</span>
          <span className="badge-tag" id="appVersionBadge">v{version}</span>
        </div>
      </div>

      <div className="nav-right">
        <span className="nav-hint">專業雙軌卡拉OK錄音系統</span>
        <button className={`btn btn-sm library-nav-btn${libraryOpen ? ' active' : ''}`} type="button" onClick={onToggleLibrary} disabled={libraryDisabled} aria-label={libraryOpen ? '返回工作區' : '作品庫'}>
          <span className="library-nav-label-wide">{libraryOpen ? '返回工作區' : '作品庫'}</span>
          <span className="library-nav-label-compact">{libraryOpen ? '返回' : '作品庫'}</span>
        </button>
        <button className="btn btn-sm settings-nav-btn" type="button" onClick={onOpenSettings} disabled={settingsDisabled} aria-label="設定">
          <span aria-hidden="true">⚙</span><span className="settings-nav-label">設定</span>
        </button>
      </div>
    </header>
  );
};
