import React, { useEffect, useRef } from 'react';
import type { TimelineContextMenuInfo, VocalTake } from '../types';

interface TimelineContextMenuProps {
  info: TimelineContextMenuInfo | null;
  onClose: () => void;
  onPlayFromHere: (time: number) => void;
  onPunchInHere: (time: number) => void;
  onAlignLyricHere: (time: number) => void;
  onPlayTake: (take: VocalTake) => void;
  onReRecordTake: (takeId: number) => void;
  onDeleteTake: (takeId: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export const TimelineContextMenu: React.FC<TimelineContextMenuProps> = ({
  info,
  onClose,
  onPlayFromHere,
  onPunchInHere,
  onAlignLyricHere,
  onPlayTake,
  onReRecordTake,
  onDeleteTake,
  onZoomIn,
  onZoomOut,
  onZoomReset,
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

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
      <div style={{ padding: '6px 14px', fontSize: '12px', color: '#9da3b5', borderBottom: '1px solid #3c4150' }}>
        時間點：{formatTime(info.time)}
      </div>

      <div
        className="menu-item"
        onClick={() => { onPlayFromHere(info.time); onClose(); }}
        style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '14px', color: '#ffffff' }}
      >
        ▶ 從此處播放伴奏
      </div>

      <div
        className="menu-item"
        onClick={() => { onPunchInHere(info.time); onClose(); }}
        style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '14px', color: '#ffffff' }}
      >
        ⏺ 從此處接續錄製 (Punch-in)
      </div>

      <div
        className="menu-item"
        onClick={() => { onAlignLyricHere(info.time); onClose(); }}
        style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '14px', color: '#ffffff' }}
      >
        📍 對齊當前歌詞句至此
      </div>

      {info.take && (
        <>
          <div style={{ borderTop: '1px solid #3c4150', margin: '4px 0' }}></div>
          <div
            className="menu-item"
            onClick={() => { onPlayTake(info.take!); onClose(); }}
            style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '14px', color: '#ffffff' }}
          >
            🔊 試聽此片段 (Take)
          </div>
          <div
            className="menu-item"
            onClick={() => { onReRecordTake(info.take!.id); onClose(); }}
            style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '14px', color: '#f59e0b' }}
          >
            ↻ 僅重錄此片段 (限時防覆蓋)
          </div>
          <div
            className="menu-item"
            onClick={() => { onDeleteTake(info.take!.id); onClose(); }}
            style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '14px', color: '#ef4444' }}
          >
            × 刪除此片段 (Delete Take)
          </div>
        </>
      )}

      <div style={{ borderTop: '1px solid #3c4150', margin: '4px 0' }}></div>

      <div
        className="menu-item"
        onClick={() => { onZoomIn(); onClose(); }}
        style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '14px', color: '#d4d7e2' }}
      >
        🔍 放大時間軸 (+)
      </div>

      <div
        className="menu-item"
        onClick={() => { onZoomOut(); onClose(); }}
        style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '14px', color: '#d4d7e2' }}
      >
        🔎 縮小時間軸 (-)
      </div>

      <div
        className="menu-item"
        onClick={() => { onZoomReset(); onClose(); }}
        style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '14px', color: '#d4d7e2' }}
      >
        ↺ 重置縮放 (1:1)
      </div>
    </div>
  );
};
