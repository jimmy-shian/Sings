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
import { BottomSystemBar } from './components/BottomSystemBar';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useTimeline } from './hooks/useTimeline';
import { useLyrics } from './hooks/useLyrics';
import { useYouTube } from './hooks/useYouTube';
import { useStorage } from './hooks/useStorage';
import type { TimelineContextMenuInfo, LyricsContextMenuInfo, VocalTake } from './types';
import { cleanTrackTitle } from './utils/format';
import './styles/App.css';

type SourceMode = 'local' | 'youtube';
type LeftTab = 'source' | 'lyrics';

function App() {
  const audio = useAudioEngine();
  const timeline = useTimeline(60);
  const lyrics = useLyrics();
  const youtube = useYouTube();
  const storage = useStorage();

  const [version, setVersion] = useState(typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.1');
  const [sourceMode, setSourceMode] = useState<SourceMode>('local');
  const [leftTab, setLeftTab] = useState<LeftTab>('source');
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

  const timelineSetDuration = timeline.setDuration;
  const timelineSeek = timeline.seek;
  const lyricsUpdateIndex = lyrics.updateCurrentIndex;
  const ytSeekTo = youtube.seekTo;
  const ytPlay = youtube.play;
  const ytPause = youtube.pause;
  const ytStartSync = youtube.startSyncTimer;
  const ytStopSync = youtube.stopSyncTimer;

  useEffect(() => {
    if (audio.audioState.backingDuration > 0) {
      timelineSetDuration(audio.audioState.backingDuration);
    }
  }, [audio.audioState.backingDuration, timelineSetDuration]);

  useEffect(() => {
    if (sourceMode === 'youtube' && youtube.duration > 0) {
      timelineSetDuration(youtube.duration);
    }
  }, [sourceMode, youtube.duration, timelineSetDuration]);

  const handleSeek = useCallback((time: number) => {
    timelineSeek(time);
    lyricsUpdateIndex(time);

    if (sourceMode === 'youtube') {
      ytSeekTo(time);
    } else if (audio.backingAudioRef.current && audio.backingAudioRef.current.src) {
      audio.seekBackingOnly(time);
    }
  }, [timelineSeek, lyricsUpdateIndex, sourceMode, ytSeekTo, audio]);

  useEffect(() => {
    if (sourceMode === 'youtube' && youtube.isPlaying) {
      ytStartSync((time) => {
        timelineSeek(time);
        lyricsUpdateIndex(time);
      });
    } else {
      ytStopSync();
    }
    return () => ytStopSync();
  }, [sourceMode, youtube.isPlaying, ytStartSync, ytStopSync, timelineSeek, lyricsUpdateIndex]);

  useEffect(() => {
    const el = audio.backingAudioRef.current;
    if (!el) return;

    const onTimeUpdate = () => {
      if (!el.paused && sourceMode !== 'youtube') {
        timelineSeek(el.currentTime);
        lyricsUpdateIndex(el.currentTime);
      }
    };

    el.addEventListener('timeupdate', onTimeUpdate);
    return () => el.removeEventListener('timeupdate', onTimeUpdate);
  }, [audio.backingAudioRef, sourceMode, timelineSeek, lyricsUpdateIndex]);

  const handleLoadLocalFile = useCallback(async (file: File) => {
    setSourceMode('local');
    setLocalFileName(file.name);
    const dur = await audio.loadBackingTrack(file);
    timeline.setDuration(dur);
  }, [audio, timeline]);

  const handleYouTubeSearch = useCallback((query: string) => {
    setSourceMode('youtube');
    youtube.search(query);
  }, [youtube]);

  useEffect(() => {
    if (sourceMode === 'youtube' && youtube.currentTitle) {
      setLocalFileName(youtube.currentTitle);
    }
  }, [sourceMode, youtube.currentTitle]);

  const handleStartRecording = useCallback(async () => {
    await audio.startRecording(timeline.timelineState.currentTime);
  }, [audio, timeline.timelineState.currentTime]);

  const handleFinishRecording = useCallback(() => {
    audio.finishRecording();
    setShowReviewModal(true);
  }, [audio]);

  const isBackingPlaying = sourceMode === 'youtube' ? youtube.isPlaying : audio.audioState.isBackingSoloPlaying;

  const handleToggleBackingPlay = useCallback(() => {
    if (sourceMode === 'youtube') {
      if (youtube.isPlaying) {
        youtube.pause();
      } else {
        youtube.play();
      }
    } else {
      if (audio.audioState.isBackingSoloPlaying) {
        audio.pauseBackingOnly();
      } else {
        audio.playBackingOnly(timeline.timelineState.currentTime);
      }
    }
  }, [sourceMode, youtube, audio, timeline.timelineState.currentTime]);

  const handleToggleRecord = useCallback(async () => {
    if (audio.audioState.isRecording) {
      handleFinishRecording();
    } else {
      await handleStartRecording();
    }
  }, [audio.audioState.isRecording, handleFinishRecording, handleStartRecording]);

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
          handleToggleBackingPlay();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showReviewModal, audio, handleToggleBackingPlay]);

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
                : '本地無損音訊檔案'}
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
                onChangeFile={() => {
                  setLeftTab('source');
                  setSourceMode('local');
                }}
              />
            )}

            <div className={`left-tab-pane ${leftTab === 'source' ? '' : 'offscreen-keep'}`}>
              <SourcePanel
                sourceMode={sourceMode}
                onSourceModeChange={(m) => setSourceMode(m)}
                leftTab={leftTab}
                onTabChange={setLeftTab}
                onLoadLocalFile={handleLoadLocalFile}
                onYouTubeSearch={handleYouTubeSearch}
                isSearching={youtube.isSearching}
                searchResults={youtube.searchResults}
                currentVideoId={youtube.currentVideoId}
                karaokeMode={youtube.karaokeMode}
                onKaraokeModeChange={youtube.setKaraokeMode}
                youtubeContainerRef={youtube.containerRef}
              />
            </div>

            <div className={`left-tab-pane ${leftTab === 'lyrics' ? '' : 'hidden'}`}>
              <LyricsPanel
                leftTab={leftTab}
                onTabChange={setLeftTab}
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
            </div>
          </div>

          <div className="right-column">
            <div className="panel panel-equal-height">
              {/* 波形可視化區：手機端隱藏，桌面端保留 */}
              <div className="timeline-visual-area">
                <div className="panel-header">
                  <span className="panel-title">
                    <svg className="icon" viewBox="0 0 24 24">
                      <path d="M2 10s3-3 5-3 5 6 7 6 5-6 8-6"></path>
                    </svg>
                    即時伴奏音訊軸與聲波流
                  </span>
                  <div className="timeline-zoom-controls">
                    <button className="btn btn-sm" type="button" onClick={timeline.panLeft} title="向左平移">&lt;</button>
                    <button className="btn btn-sm" type="button" onClick={timeline.zoomOut} title="縮小">-</button>
                    <span className="zoom-badge">{timeline.timelineState.zoomLevel.toFixed(1)}x</span>
                    <button className="btn btn-sm" type="button" onClick={timeline.zoomIn} title="放大">+</button>
                    <button className="btn btn-sm" type="button" onClick={timeline.panRight} title="向右平移">&gt;</button>
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
              </div>

              {/* 瀏覽器影音播放效果控制列 (原位詳細控制) */}
              <div className="waveform-media-player-bar">
                <div className="media-player-left">
                  <button
                    className="btn btn-sm btn-icon"
                    type="button"
                    onClick={() => handleSeek(0)}
                    title="重設回起點 (00:00)"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                    </svg>
                  </button>
                  <button
                    className="btn btn-sm btn-icon"
                    type="button"
                    onClick={() => handleSeek(Math.max(0, timeline.timelineState.currentTime - 5))}
                    title="快退 5 秒"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 4v6h6" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    <span>5s</span>
                  </button>
                  <button
                    className={`btn btn-sm media-play-btn ${isBackingPlaying ? 'playing' : ''}`}
                    type="button"
                    onClick={handleToggleBackingPlay}
                    title={isBackingPlaying ? '暫停伴奏 (Space)' : '播放伴奏 (Space)'}
                  >
                    {isBackingPlaying ? (
                      <>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                        <span>暫停</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>播放伴奏</span>
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-sm btn-icon"
                    type="button"
                    onClick={() => handleSeek(Math.min(timeline.timelineState.duration, timeline.timelineState.currentTime + 5))}
                    title="快進 5 秒"
                  >
                    <span>5s</span>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 4v6h-6" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                  </button>
                </div>

                <div className="media-player-right">
                  <div className="media-volume-strip">
                    <button
                      className="btn btn-sm btn-icon"
                      type="button"
                      onClick={() => audio.updateBackingVolume(audio.audioState.liveBackingVolume > 0 ? 0 : 1)}
                      title={audio.audioState.liveBackingVolume === 0 ? '取消靜音' : '靜音'}
                    >
                      {audio.audioState.liveBackingVolume === 0 ? (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <line x1="23" y1="9" x2="17" y2="15" />
                          <line x1="17" y1="9" x2="23" y2="15" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                      )}
                    </button>
                    <input
                      type="range"
                      className="range-input-sm"
                      min="0"
                      max="150"
                      value={audio.audioState.liveBackingVolume * 100}
                      onChange={(e) => audio.updateBackingVolume(Number(e.target.value) / 100)}
                      title={`伴奏音量: ${Math.round(audio.audioState.liveBackingVolume * 100)}%`}
                    />
                    <span className="vol-badge">{Math.round(audio.audioState.liveBackingVolume * 100)}%</span>
                  </div>

                  {isBackingPlaying && (
                    <span className="media-playing-indicator">
                      <span className="wave-bar bar1"></span>
                      <span className="wave-bar bar2"></span>
                      <span className="wave-bar bar3"></span>
                      <span>播放中</span>
                    </span>
                  )}
                </div>
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
          defaultQuery={cleanTrackTitle(sourceMode === 'youtube' ? youtube.currentTitle : localFileName)}
          onSelectLyrics={(lrc) => {
            lyrics.parseLRC(lrc, timeline.timelineState.duration || 180);
            setLeftTab('lyrics');
          }}
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
          onAlignToCurrentTime={(idx) => {
            lyrics.setAnchor(timeline.timelineState.currentTime, idx);
          }}
          onPlayFromLyric={(time) => handleSeek(time)}
          onCopyText={(text) => {
            navigator.clipboard?.writeText(text);
            alert(`已複製歌詞：【${text}】`);
          }}
        />

        {/* 手機端專屬固定底部系統顯示器 (YouTube App 風格) */}
        <BottomSystemBar
          currentTime={timeline.timelineState.currentTime}
          duration={timeline.timelineState.duration}
          isPlaying={isBackingPlaying}
          isRecording={audio.audioState.isRecording}
          isPaused={audio.audioState.isPaused}
          title={cleanTrackTitle(localFileName) || (sourceMode === 'youtube' ? (youtube.currentTitle || 'YouTube 伴奏') : '尚未載入伴奏')}
          sourceMode={sourceMode}
          inputLevel={audio.inputLevel}
          onTogglePlay={handleToggleBackingPlay}
          onSeek={handleSeek}
          onToggleRecord={handleToggleRecord}
        />
      </main>
    </div>
  );
}

export default App;
