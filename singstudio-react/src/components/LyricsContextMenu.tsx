import React, { useEffect, useRef } from 'react';
import type { LyricsContextMenuInfo } from '../types';

interface LyricsContextMenuProps {
  info: LyricsContextMenuInfo | null;
  onClose: () => void;
  onAlignToCurrentTime: (lineIndex: number) => void;
  onPlayFromLyric: (time: number) => void;
  onCopyText: (text: string) => void;
}

export const LyricsContextMenu: React.FC<LyricsContextMenuProps> = ({
  info,
  onClose,
  onAlignToCurrentTime,
  onPlayFromLyric,
  onCopyText,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!info) return null;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: `${info.x}px`,
        top: `${info.y}px`,
        zIndex: 1000,
        backgroundColor: '#2b2d37',
        border: '1px solid #4a4f61',
        borderRadius: '6px',
        padding: '6px 0',
        minWidth: '180px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ padding: '6px 14px', fontSize: '12px', color: '#9da3b5', borderBottom: '1px solid #3c4150', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        【{info.line.text}】
      </div>

      <div
        className="menu-item"
        onClick={() => { onAlignToCurrentTime(info.index); onClose(); }}
        style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '14px', color: '#ffffff' }}
      >
        📍 對齊至當前播放指針
      </div>

      <div
        className="menu-item"
        onClick={() => { onPlayFromLyric(info.line.time); onClose(); }}
        style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '14px', color: '#ffffff' }}
      >
        ▶ 從本句跳轉播放伴奏
      </div>

      <div
        className="menu-item"
        onClick={() => { onCopyText(info.line.text); onClose(); }}
        style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '14px', color: '#ffffff' }}
      >
        📄 複製本句歌詞文字
      </div>
    </div>
  );
};
