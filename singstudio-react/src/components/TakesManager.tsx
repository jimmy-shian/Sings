import React from 'react';
import type { VocalTake } from '../types';

interface TakesManagerProps {
  takes: VocalTake[];
  selectedTakeId: number | null;
  onSelectTake: (id: number) => void;
  onDeleteTake: (id: number) => void;
  onPlayTake: (take: VocalTake) => void;
  onReRecordTake: (id: number) => void;
}

export const TakesManager: React.FC<TakesManagerProps> = ({
  takes,
  selectedTakeId,
  onSelectTake,
  onDeleteTake,
  onPlayTake,
  onReRecordTake,
}) => {
  if (takes.length === 0) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="vocal-takes-panel" style={{ marginTop: '14px' }}>
      <div className="takes-panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>錄製分段管理 (Takes)</span>
          <span className="panel-tag">{takes.length} 個片段</span>
        </div>
      </div>

      <div className="takes-list">
        {takes.map((take, idx) => (
          <div
            key={take.id}
            className={`take-item ${selectedTakeId === take.id ? 'selected' : ''}`}
            onClick={() => onSelectTake(take.id)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', marginBottom: '6px', borderRadius: 'var(--radius-sm)', border: selectedTakeId === take.id ? '1px solid #10b981' : '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)', cursor: 'pointer' }}
          >
            <div className="take-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="take-id" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Take {idx + 1}</span>
              <span className="take-duration" style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {formatTime(take.startTime)} ~ {formatTime(take.startTime + take.duration)}
              </span>
              <span className="take-length" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                ({take.duration.toFixed(1)}s)
              </span>
            </div>
            <div className="take-actions" style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn btn-sm"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayTake(take);
                }}
                title="試聽此段"
              >
                ▶ 試聽
              </button>
              <button
                className="btn btn-sm btn-warning"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReRecordTake(take.id);
                }}
                title="自動限制起訖時長，僅重錄本段"
              >
                ↻ 僅重錄此段
              </button>
              <button
                className="btn btn-sm btn-danger"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTake(take.id);
                }}
                title="刪除此 Take"
              >
                × 刪除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
