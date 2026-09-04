import React from 'react';

// ============================================================================
// SingStudio - Header 元件
// ============================================================================

interface HeaderProps {
  version: string;
}

export const Header: React.FC<HeaderProps> = ({ version }) => {
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
      </div>
    </header>
  );
};
