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
      className="context-menu lyrics-context-menu"
      style={{
        left: `${info.x}px`,
        top: `${info.y}px`,
      }}
    >
      <div className="context-menu-header">
        【{info.line.text}】
      </div>

      <div
        className="menu-item"
        onClick={() => { onAlignToCurrentTime(info.index); onClose(); }}
      >
        對齊至當前播放指針
      </div>

      <div
        className="menu-item"
        onClick={() => { onPlayFromLyric(info.line.time); onClose(); }}
      >
        從本句跳轉播放伴奏
      </div>

      <div
        className="menu-item"
        onClick={() => { onCopyText(info.line.text); onClose(); }}
      >
        複製本句歌詞文字
      </div>
    </div>
  );
};
