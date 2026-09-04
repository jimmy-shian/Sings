import React from 'react';
import type { Recording } from '../types';

interface LibraryTableProps {
  recordings: Recording[];
  onLoadRecording: (id: number) => void;
  onDeleteRecording: (id: number) => void;
  onRefresh: () => void;
}

export const LibraryTable: React.FC<LibraryTableProps> = ({
  recordings,
  onLoadRecording,
  onDeleteRecording,
  onRefresh,
}) => {
  const formatDuration = (sec?: number) => {
    if (!sec) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="panel" style={{ marginTop: '20px' }}>
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📚</span>
          <span className="panel-title">本地已儲存作品庫 (IndexedDB Library)</span>
          <span className="badge-tag">{recordings.length} 部作品</span>
        </div>
        <button className="btn btn-sm" type="button" onClick={onRefresh}>
          🔄 重新整理
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 14px' }}>作品名稱</th>
              <th style={{ padding: '12px 14px' }}>時長</th>
              <th style={{ padding: '12px 14px' }}>片段數</th>
              <th style={{ padding: '12px 14px' }}>檔案大小</th>
              <th style={{ padding: '12px 14px' }}>錄製時間</th>
              <th style={{ padding: '12px 14px' }}>延遲補償</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {recordings.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px 14px' }}>
                  暫無本地作品。錄音完成後，可於後製混音視窗中點選「保存至本機作品庫」。
                </td>
              </tr>
            ) : (
              recordings.map((rec) => (
                <tr
                  key={rec.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {rec.title}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)' }}>
                    {formatDuration(rec.duration)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {rec.takesCount || 1} 段
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                    {rec.sizeFormatted || '0 B'}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {rec.dateString}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)' }}>
                    {rec.latencyOffset || 0} ms
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        className="btn btn-sm btn-primary"
                        type="button"
                        onClick={() => rec.id && onLoadRecording(rec.id)}
                      >
                        試聽後製
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        type="button"
                        onClick={() => rec.id && onDeleteRecording(rec.id)}
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
