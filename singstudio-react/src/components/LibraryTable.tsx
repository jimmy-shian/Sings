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

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>作品名稱</th>
              <th>時長</th>
              <th>片段數</th>
              <th>檔案大小</th>
              <th>錄製時間</th>
              <th>延遲補償</th>
              <th style={{ textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {recordings.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-empty">
                  暫無本地作品。錄音完成後，可於後製混音視窗中點選「保存至本機作品庫」。
                </td>
              </tr>
            ) : (
              recordings.map((rec) => (
                <tr key={rec.id}>
                  <td className="table-title" data-label="作品名稱">
                    {rec.title}
                  </td>
                  <td data-label="時長" style={{ fontFamily: 'var(--font-mono)' }}>
                    {formatDuration(rec.duration)}
                  </td>
                  <td data-label="片段數">
                    {rec.takesCount || 1} 段
                  </td>
                  <td data-label="檔案大小">
                    {rec.sizeFormatted || '0 B'}
                  </td>
                  <td data-label="錄製時間">
                    {rec.dateString}
                  </td>
                  <td data-label="延遲補償" style={{ fontFamily: 'var(--font-mono)' }}>
                    {rec.latencyOffset || 0} ms
                  </td>
                  <td data-label="操作" className="table-actions-cell">
                    <div className="table-actions-group">
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
