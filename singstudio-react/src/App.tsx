import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SourcePanel } from './components/SourcePanel';
import { LocalPlayerBar } from './components/LocalPlayerBar';
import { LyricsPanel } from './components/LyricsPanel';
import { TimelineCanvas } from './components/TimelineCanvas';
import { RecordingControls } from './components/RecordingControls';
import { TakesManager } from './components/TakesManager';
import { ReviewModal } from './components/ReviewModal';
import { LibraryTable } from './components/LibraryTable';
import { LrcSearchModal } from './components/LrcSearchModal';
import { TimelineContextMenu } from './components/TimelineContextMenu';
import { LyricsContextMenu } from './components/LyricsContextMenu';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useTimeline } from './hooks/useTimeline';
import { useLyrics } from './hooks/useLyrics';
import { useYouTube } from './hooks/useYouTube';
import { useStorage } from './hooks/useStorage';
import type { TimelineContextMenuInfo, LyricsContextMenuInfo, VocalTake } from './types';
import './styles/App.css';

type SourceMode = 'local' | 'youtube' | 'demo' | 'lyrics';

function App() {
  const audio = useAudioEngine();
  const timeline = useTimeline(60);
  const lyrics = useLyrics();
  const youtube = useYouTube();
  const storage = useStorage();

  const [version, setVersion] = useState(typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0');
  const [sourceMode, setSourceMode] = useState<SourceMode>('demo');
  const [localFileName, setLocalFileName] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showLrcModal, setShowLrcModal] = useState(false);
  const [timelineContextMenu, setTimelineContextMenu] = useState<TimelineContextMenuInfo | null>(null);
  const [lyricsContextMenu, setLyricsContextMenu] = useState<LyricsContextMenuInfo | null>(null);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getVersion().then(ver => {
        if (ver) setVersion(ver);
      });
    }
  }, []);

  useEffect(() => {
    if (audio.audioState.backingDuration > 0) {
      timeline.setDuration(audio.audioState.backingDuration);
    }
  }, [audio.audioState.backingDuration, timeline]);

  useEffect(() => {
    if (sourceMode === 'youtube' && youtube.duration > 0) {
      timeline.setDuration(youtube.duration);
    }
  }, [sourceMode, youtube.duration, timeline]);

  const handleSeek = useCallback((time: number) => {
    timeline.seek(time);
    lyrics.updateCurrentIndex(time);

    if (sourceMode === 'youtube') {
      youtube.seekTo(time);
    } else if (audio.backingAudioRef.current && audio.backingAudioRef.current.src) {
      audio.seekBackingOnly(time);
    }
  }, [timeline, lyrics, sourceMode, youtube, audio]);

  useEffect(() => {
    if (sourceMode === 'youtube' && youtube.isPlaying) {
      youtube.startSyncTimer((time) => {
        timeline.seek(time);
        lyrics.updateCurrentIndex(time);
      });
    } else {
      youtube.stopSyncTimer();
    }
    return () => youtube.stopSyncTimer();
  }, [sourceMode, youtube.isPlaying, youtube, timeline, lyrics]);

  useEffect(() => {
    const el = audio.backingAudioRef.current;
    if (!el) return;

    const onTimeUpdate = () => {
      if (!el.paused && sourceMode !== 'youtube') {
        timeline.seek(el.currentTime);
        lyrics.updateCurrentIndex(el.currentTime);
      }
    };

    el.addEventListener('timeupdate', onTimeUpdate);
    return () => el.removeEventListener('timeupdate', onTimeUpdate);
  }, [audio.backingAudioRef, sourceMode, timeline, lyrics]);

  const handleLoadDemo = useCallback(async () => {
    setSourceMode('demo');
    setLocalFileName('卡農經典和弦進行 (56秒內建合成)');
    const dur = await audio.generateDemoBackingTrack();
    timeline.setDuration(dur);
    lyrics.loadDemoLyrics();
  }, [audio, timeline, lyrics]);

  const handleLoadLocalFile = useCallback(async (file: File) => {
    setSourceMode('local');
    setLocalFileName(file.name);
    const dur = await audio.loadBackingTrack(file);
    timeline.setDuration(dur);
  }, [audio, timeline]);

  const handleYouTubeSearch = useCallback((query: string) => {
    setSourceMode('youtube');
    setLocalFileName(`YouTube: ${query}`);
    youtube.search(query);
  }, [youtube]);

  const handleStartRecording = useCallback(async () => {
    await audio.startRecording(timeline.timelineState.currentTime);
  }, [audio, timeline.timelineState.currentTime]);

  const handleFinishRecording = useCallback(() => {
    audio.finishRecording();
    setShowReviewModal(true);
  }, [audio]);

  const handleSaveToLibrary = useCallback(async (title: string) => {
    await storage.saveRecording({
      title,
      sourceType: audio.audioState.sourceMode,
      youtubeId: youtube.currentVideoId || undefined,
      duration: Math.max(audio.audioState.backingDuration, timeline.timelineState.duration),
      vocalBlob: audio.vocalTakes.length > 0 ? audio.vocalTakes[0].blob : undefined,
      backingBlob: audio.currentBackingBlob || undefined,
      lyrics: lyrics.lyricsState.rawLrcText,
      takesCount: audio.vocalTakes.length,
      latencyOffset: audio.audioState.latencyOffsetMs,
    });
    alert('作品已安全寫入本地 IndexedDB 作品庫！');
  }, [storage, audio, youtube, timeline, lyrics]);

  const handleExportWav = useCallback(async () => {
    try {
      const wavBlob = await audio.exportMixedWavBlob();
      const defaultFilename = `SingStudio_${localFileName || 'Master'}_${Date.now()}.wav`;

      if (window.electronAPI) {
        const filePath = await window.electronAPI.saveFile({
          defaultPath: defaultFilename,
          filters: [{ name: 'WAV 音訊 (*.wav)', extensions: ['wav'] }]
        });
        if (filePath) {
          const buf = await wavBlob.arrayBuffer();
          await window.electronAPI.writeTempFile(filePath, buf);
          alert(`混音母帶已成功匯出至：\n${filePath}`);
          return;
        }
      }

      const a = document.createElement('a');
      a.href = URL.createObjectURL(wavBlob);
      a.download = defaultFilename;
      a.click();
      URL.revokeObjectURL(a.href);
      alert('混音母帶已成功生成並開始下載！');
    } catch (err: any) {
      alert(`匯出失敗: ${err.message}`);
    }
  }, [audio, localFileName]);

  const handleLoadFromLibrary = useCallback(async (id: number) => {
    const full = await storage.getById(id);
    if (!full) return;

    if (full.backingBlob) {
      await audio.loadBackingTrack(full.backingBlob);
    }
    if (full.lyrics) {
      lyrics.parseLRC(full.lyrics);
    }
    if (full.vocalBlob) {
      const take: VocalTake = {
        id: Date.now(),
        startTime: 0,
        duration: full.duration,
        blob: full.vocalBlob,
        url: URL.createObjectURL(full.vocalBlob),
      };
      (audio as any).vocalTakes = [take];
    }
    if (full.latencyOffset) {
      audio.updateLatencyOffset(full.latencyOffset);
    }
    setShowReviewModal(true);
  }, [storage, audio, lyrics]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (showReviewModal) {
          audio.toggleMixedPreview();
        } else if (audio.audioState.isRecording) {
          audio.pauseRecording();
        } else if (audio.audioState.isPaused) {
          audio.resumeRecording();
        } else {
          if (audio.audioState.isBackingSoloPlaying) {
            audio.pauseBackingOnly();
          } else {
            audio.playBackingOnly(timeline.timelineState.currentTime);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showReviewModal, audio, timeline.timelineState.currentTime]);

  return (
    <div className="app">
      <Header version={version} />

      <main className="main-content">
        <div className="track-status-bar">
          <div className="track-info">
            <span className="status-indicator"></span>
            <span className="track-title-text">
              {localFileName || '尚未載入伴奏音樂'}
            </span>
            <span className="track-meta">
              {sourceMode === 'youtube'
                ? 'YouTube 直連伴奏 (25 FPS 雙向連動)'
                : sourceMode === 'local'
                ? '本地無損音訊檔案'
                : '內建 56 秒卡農和弦進行'}
            </span>
          </div>
          <div className="track-actions">
            <button
              className="btn btn-sm btn-primary"
              onClick={handleStartRecording}
              disabled={audio.audioState.isRecording}
            >
              快速錄製
            </button>
          </div>
        </div>

        <div className="workspace-grid">
          <div className="left-column">
            {sourceMode === 'local' && (
              <LocalPlayerBar
                fileName={localFileName}
                isPlaying={audio.audioState.isBackingSoloPlaying}
                currentTime={timeline.timelineState.currentTime}
                duration={timeline.timelineState.duration}
                onTogglePlay={() => {
                  if (audio.audioState.isBackingSoloPlaying) audio.pauseBackingOnly();
                  else audio.playBackingOnly(timeline.timelineState.currentTime);
                }}
                onSeek={handleSeek}
                onChangeFile={() => setSourceMode('local')}
              />
            )}

            {sourceMode === 'lyrics' ? (
              <LyricsPanel
                lyrics={lyrics.lyricsState.lyrics}
                currentIndex={lyrics.lyricsState.currentIndex}
                offsetSec={lyrics.lyricsState.offsetSec}
                rawLrcText={lyrics.lyricsState.rawLrcText}
                currentTime={timeline.timelineState.currentTime}
                onOffsetChange={lyrics.adjustOffset}
                onOffsetReset={lyrics.resetOffset}
                onSetAnchor={lyrics.setAnchor}
                onOpenSearchModal={() => setShowLrcModal(true)}
                onImportLrc={async () => {
                  if (window.electronAPI) {
                    const res = await window.electronAPI.openFile({ filters: [{ name: 'LRC', extensions: ['lrc', 'txt'] }] });
                    if (res && res.data) {
                      const text = atob(res.data);
                      lyrics.parseLRC(text);
                    }
                  } else {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.lrc,.txt';
                    input.onchange = (e: any) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (re) => lyrics.parseLRC(re.target?.result as string);
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }
                }}
                onExportLrc={() => {
                  const text = lyrics.exportLRC();
                  navigator.clipboard?.writeText(text);
                  alert('LRC 歌詞內容已複製至剪貼簿！');
                }}
                onSeekToLyric={handleSeek}
                onContextMenu={(_e, info) => setLyricsContextMenu(info)}
              />
            ) : (
              <SourcePanel
                sourceMode={sourceMode}
                onSourceModeChange={(m) => setSourceMode(m as SourceMode)}
                onLoadLocalFile={handleLoadLocalFile}
                onLoadDemo={handleLoadDemo}
                onYouTubeSearch={handleYouTubeSearch}
                isSearching={youtube.isSearching}
                searchResults={youtube.searchResults}
                currentVideoId={youtube.currentVideoId}
                karaokeMode={youtube.karaokeMode}
                onKaraokeModeChange={youtube.setKaraokeMode}
                youtubeContainerRef={youtube.containerRef}
              />
            )}
          </div>

          <div className="right-column">
            <div className="panel panel-equal-height">
              <div className="panel-header">
                <span className="panel-title">
                  <svg className="icon" viewBox="0 0 24 24">
                    <path d="M2 10s3-3 5-3 5 6 7 6 5-6 8-6"></path>
                  </svg>
                  即時伴奏音訊軸與聲波流
                </span>
                <div className="timeline-zoom-controls">
                  <button className="btn btn-sm" type="button" onClick={timeline.panLeft} title="向左平移">◀</button>
                  <button className="btn btn-sm" type="button" onClick={timeline.zoomOut} title="縮小">-</button>
                  <span className="zoom-badge">{timeline.timelineState.zoomLevel.toFixed(1)}x</span>
                  <button className="btn btn-sm" type="button" onClick={timeline.zoomIn} title="放大">+</button>
                  <button className="btn btn-sm" type="button" onClick={timeline.panRight} title="向右平移">▶</button>
                  <button className="btn btn-sm" type="button" onClick={timeline.zoomReset} title="重置 1:1">1:1</button>
                </div>
              </div>

              <div style={{ height: '200px' }}>
                <TimelineCanvas
                  duration={timeline.timelineState.duration}
                  currentTime={timeline.timelineState.currentTime}
                  viewStartTime={timeline.timelineState.viewStartTime}
                  zoomLevel={timeline.timelineState.zoomLevel}
                  backingPeaks={audio.waveformPeaks}
                  vocalTakes={audio.vocalTakes}
                  liveVocalWave={audio.liveVocalWave}
                  selectedTakeId={timeline.selectedTakeId}
                  isRecording={audio.audioState.isRecording}
                  onSeek={handleSeek}
                  onZoom={timeline.zoom}
                  onPan={timeline.pan}
                  onContextMenu={(_e, info) => setTimelineContextMenu(info)}
                  onSelectTake={timeline.setSelectedTakeId}
                />
              </div>

              <div className="audio-metrics-bar">
                <div className="metric-group">
                  <span className="metric-tag-lbl">時鐘位置:</span>
                  <span className="metric-time-num">
                    {Math.floor(timeline.timelineState.currentTime / 60).toString().padStart(2, '0')}:
                    {Math.floor(timeline.timelineState.currentTime % 60).toString().padStart(2, '0')} /{' '}
                    {Math.floor(timeline.timelineState.duration / 60).toString().padStart(2, '0')}:
                    {Math.floor(timeline.timelineState.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="metric-group flex-1">
                  <span className="metric-tag-lbl">麥克風輸入電平:</span>
                  <div className="vu-meter-track">
                    <div
                      className="vu-meter-fill"
                      style={{ width: `${Math.max(0, (audio.inputLevel + 60) / 60 * 100)}%` }}
                    ></div>
                  </div>
                  <span className="metric-db-num">{audio.inputLevel.toFixed(0)} dB</span>
                </div>

                <div className="metric-group">
                  <span className="panel-tag">
                    [{audio.audioState.isRecording ? '錄製中 · REC' : audio.audioState.isPaused ? '暫停中 · PAUSED' : '待機中 · STANDBY'}]
                  </span>
                </div>
              </div>

              <div className="live-audio-toolbar">
                <div className="live-tool-row">
                  <div className="live-tool-item">
                    <span className="live-tool-lbl">伴奏音量:</span>
                    <input
                      type="range"
                      className="range-input-sm"
                      min="0"
                      max="150"
                      value={audio.audioState.liveBackingVolume * 100}
                      onChange={(e) => audio.updateBackingVolume(Number(e.target.value) / 100)}
                    />
                    <span className="vol-badge">{Math.round(audio.audioState.liveBackingVolume * 100)}%</span>
                  </div>

                  <div className="live-tool-item">
                    <button
                      className={`btn btn-sm ${audio.audioState.isVocalCancellationEnabled ? 'btn-primary' : 'btn-outline'}`}
                      type="button"
                      onClick={audio.toggleVocalCancellation}
                    >
                      消除人聲: {audio.audioState.isVocalCancellationEnabled ? '開' : '關'}
                    </button>
                  </div>
                </div>

                <div className="live-tool-row live-tool-monitor-row">
                  <div className="live-tool-item">
                    <button
                      className={`btn btn-sm ${audio.audioState.isMonitoringEnabled ? 'btn-primary' : 'btn-outline'}`}
                      type="button"
                      onClick={audio.toggleMonitor}
                    >
                      即時耳返: {audio.audioState.isMonitoringEnabled ? '開' : '關'}
                    </button>
                  </div>

                  {audio.audioState.isMonitoringEnabled && (
                    <div className="monitor-controls-box" style={{ display: 'flex', gap: '10px' }}>
                      <div className="live-tool-item">
                        <span className="live-tool-lbl">耳返:</span>
                        <input
                          type="range"
                          className="range-input-sm"
                          min="0"
                          max="300"
                          value={audio.audioState.monitorVolume * 100}
                          onChange={(e) => audio.updateMonitorVolume(Number(e.target.value) / 100)}
                        />
                        <span className="vol-badge">{Math.round(audio.audioState.monitorVolume * 100)}%</span>
                      </div>

                      <div className="live-tool-item">
                        <span className="live-tool-lbl">靈敏度:</span>
                        <input
                          type="range"
                          className="range-input-sm"
                          min="10"
                          max="200"
                          value={audio.audioState.micSensitivity * 100}
                          onChange={(e) => audio.updateMicSensitivity(Number(e.target.value) / 100)}
                        />
                        <span className="vol-badge">{Math.round(audio.audioState.micSensitivity * 100)}%</span>
                      </div>

                      <label className="toggle-control">
                        <input
                          type="checkbox"
                          checked={audio.audioState.isNoiseFilterEnabled}
                          onChange={audio.toggleNoiseFilter}
                        />
                        <span>噪聲門降噪</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <RecordingControls
                isRecording={audio.audioState.isRecording}
                isPaused={audio.audioState.isPaused}
                hasRecording={audio.vocalTakes.length > 0}
                onStartRecording={handleStartRecording}
                onPauseRecording={audio.pauseRecording}
                onResumeRecording={audio.resumeRecording}
                onFinishRecording={handleFinishRecording}
                onResetRecording={audio.resetRecording}
              />

              <TakesManager
                takes={audio.vocalTakes}
                selectedTakeId={timeline.selectedTakeId}
                onSelectTake={timeline.setSelectedTakeId}
                onDeleteTake={audio.deleteTake}
                onPlayTake={audio.playTake}
                onReRecordTake={audio.reRecordTake}
              />
            </div>
          </div>
        </div>

        <LibraryTable
          recordings={storage.recordings}
          onLoadRecording={handleLoadFromLibrary}
          onDeleteRecording={storage.deleteRecording}
          onRefresh={storage.refresh}
        />

        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            audio.stopMixedPreview();
            setShowReviewModal(false);
          }}
          duration={Math.max(audio.audioState.backingDuration, timeline.timelineState.duration)}
          currentTime={audio.mixCurrentTime}
          isPlaying={audio.audioState.isPlayingMix}
          backingPeaks={audio.waveformPeaks}
          vocalTakes={audio.vocalTakes}
          backingVolume={audio.audioState.backingVolume}
          vocalVolume={audio.audioState.vocalVolume}
          backingMuted={audio.audioState.backingMuted}
          vocalMuted={audio.audioState.vocalMuted}
          reverbEnabled={audio.audioState.reverbEnabled}
          latencyOffsetMs={audio.audioState.latencyOffsetMs}
          defaultTitle={localFileName || '我的演唱作品'}
          onTogglePlayPreview={audio.toggleMixedPreview}
          onSeekPreview={audio.seekMixedPreview}
          onResetPreview={() => audio.seekMixedPreview(0)}
          onBackingVolumeChange={audio.updateBackingVolume}
          onVocalVolumeChange={audio.updateVocalVolume}
          onToggleBackingMute={audio.toggleBackingMute}
          onToggleVocalMute={audio.toggleVocalMute}
          onToggleReverb={audio.toggleReverb}
          onLatencyOffsetChange={audio.updateLatencyOffset}
          onSaveToLibrary={handleSaveToLibrary}
          onExportWav={handleExportWav}
        />

        <LrcSearchModal
          isOpen={showLrcModal}
          onClose={() => setShowLrcModal(false)}
          onSelectLyrics={(lrc) => lyrics.parseLRC(lrc)}
        />

        <TimelineContextMenu
          info={timelineContextMenu}
          onClose={() => setTimelineContextMenu(null)}
          onPlayFromHere={(time) => {
            timeline.seek(time);
            audio.playBackingOnly(time);
          }}
          onPunchInHere={(time) => {
            timeline.seek(time);
            audio.startRecording(time);
          }}
          onAlignLyricHere={(time) => lyrics.setAnchor(time)}
          onPlayTake={audio.playTake}
          onReRecordTake={audio.reRecordTake}
          onDeleteTake={audio.deleteTake}
          onZoomIn={timeline.zoomIn}
          onZoomOut={timeline.zoomOut}
          onZoomReset={timeline.zoomReset}
        />

        <LyricsContextMenu
          info={lyricsContextMenu}
          onClose={() => setLyricsContextMenu(null)}
          onAlignToCurrentTime={(_idx) => {
            lyrics.setAnchor(timeline.timelineState.currentTime);
          }}
          onPlayFromLyric={(time) => handleSeek(time)}
          onCopyText={(text) => {
            navigator.clipboard?.writeText(text);
            alert(`已複製歌詞：【${text}】`);
          }}
        />
      </main>
    </div>
  );
}

export default App;
