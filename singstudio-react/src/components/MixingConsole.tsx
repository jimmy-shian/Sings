import React from 'react';

// ============================================================================
// SingStudio - MixingConsole 元件 (後製混音控制台)
// ============================================================================

interface MixingConsoleProps {
  backingVolume: number;
  vocalVolume: number;
  backingMuted: boolean;
  vocalMuted: boolean;
  reverbEnabled: boolean;
  latencyOffset: number;
  onBackingVolumeChange: (vol: number) => void;
  onVocalVolumeChange: (vol: number) => void;
  onBackingMuteToggle: () => void;
  onVocalMuteToggle: () => void;
  onReverbToggle: () => void;
  onLatencyChange: (offset: number) => void;
  onExportWav: () => void;
}

export const MixingConsole: React.FC<MixingConsoleProps> = ({
  backingVolume,
  vocalVolume,
  backingMuted,
  vocalMuted,
  reverbEnabled,
  latencyOffset,
  onBackingVolumeChange,
  onVocalVolumeChange,
  onBackingMuteToggle,
  onVocalMuteToggle,
  onReverbToggle,
  onLatencyChange,
  onExportWav,
}) => {
  return (
    <div className="mixing-console">
      <div className="console-header">
        <h3>後製混音控制台</h3>
        <button className="btn btn-success" type="button" onClick={onExportWav}>
          匯出 16-bit WAV
        </button>
      </div>

      <div className="console-channels">
        {/* 伴奏聲道 */}
        <div className="channel-strip">
          <div className="channel-label">伴奏</div>
          <div className="channel-controls">
            <label className="volume-control">
              <span>音量</span>
              <input
                type="range"
                min="0"
                max="150"
                value={backingVolume * 100}
                onChange={(e) => onBackingVolumeChange(Number(e.target.value) / 100)}
              />
              <span className="vol-badge">{Math.round(backingVolume * 100)}%</span>
            </label>
            <button
              className={`btn btn-sm ${backingMuted ? 'btn-danger' : 'btn-outline'}`}
              type="button"
              onClick={onBackingMuteToggle}
            >
              {backingMuted ? '取消靜音' : '靜音'}
            </button>
          </div>
        </div>

        {/* 人聲聲道 */}
        <div className="channel-strip">
          <div className="channel-label">人聲</div>
          <div className="channel-controls">
            <label className="volume-control">
              <span>音量</span>
              <input
                type="range"
                min="0"
                max="150"
                value={vocalVolume * 100}
                onChange={(e) => onVocalVolumeChange(Number(e.target.value) / 100)}
              />
              <span className="vol-badge">{Math.round(vocalVolume * 100)}%</span>
            </label>
            <button
              className={`btn btn-sm ${vocalMuted ? 'btn-danger' : 'btn-outline'}`}
              type="button"
              onClick={onVocalMuteToggle}
            >
              {vocalMuted ? '取消靜音' : '靜音'}
            </button>
          </div>
        </div>

        {/* 效果器 */}
        <div className="channel-strip">
          <div className="channel-label">效果器</div>
          <div className="channel-controls">
            <button
              className={`btn btn-sm ${reverbEnabled ? 'btn-primary' : 'btn-outline'}`}
              type="button"
              onClick={onReverbToggle}
            >
              KTV 殘響
            </button>
            <label className="volume-control">
              <span>延遲校準</span>
              <input
                type="range"
                min="-250"
                max="250"
                value={latencyOffset}
                onChange={(e) => onLatencyChange(Number(e.target.value))}
              />
              <span className="vol-badge">{latencyOffset}ms</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
