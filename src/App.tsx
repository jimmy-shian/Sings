import { SplashAd } from './components/SplashAd';
import { PreRecordingAd } from './components/PreRecordingAd';
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { WorkflowTabs, type AppStage } from './components/WorkflowTabs';
import { SettingsModal } from './components/SettingsModal';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useTimeline } from './hooks/useTimeline';
import { useLyrics } from './hooks/useLyrics';
import { useYouTube } from './hooks/useYouTube';
import { useStorage } from './hooks/useStorage';
import { useSpeechTranscription, type SpeechChunk } from './hooks/useSpeechTranscription';
import type { TimelineContextMenuInfo, LyricsContextMenuInfo, VocalTake } from './types';
import { cleanTrackTitle } from './utils/format';
import { renderLyricVideoBlob } from './utils/videoExport';
import { saveBlobToDisk } from './utils/saveBlob';
import './styles/App.css';

type SourceMode = 'local' | 'youtube';
type LeftTab = 'source' | 'lyrics';

function createLrcTimestamp(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainder = (safeSeconds % 60).toFixed(2).padStart(5, '0');
  return `[${minutes}:${remainder}]`;
}

function speechChunksToLrc(chunks: SpeechChunk[] | undefined, text: string, offset: number) {
  if (!chunks?.length) return `${createLrcTimestamp(offset)}${text.trim()}`;

  const lines: { time: number; text: string }[] = [];
  let phrase = '';
  let phraseStart = 0;
  let phraseEnd = 0;

  const flushPhrase = () => {
    const cleanText = phrase.trim();
    if (cleanText) lines.push({ time: phraseStart + offset, text: cleanText });
    phrase = '';
  };

  for (const chunk of chunks) {
    const chunkText = chunk.text?.trim();
    if (!chunkText) continue;
    const start = typeof chunk.timestamp?.[0] === 'number' ? chunk.timestamp[0] : phraseEnd;
    const end = typeof chunk.timestamp?.[1] === 'number' ? chunk.timestamp[1] : start;
    if (!phrase) phraseStart = start;
    phrase += chunkText;
    phraseEnd = end;
    if (/[，。！？!?；;,.]$/.test(chunkText) || phrase.length >= 16 || phraseEnd - phraseStart >= 4.5) flushPhrase();
  }
  flushPhrase();

  return lines.length
    ? lines.map(line => `${createLrcTimestamp(line.time)}${line.text}`).join('\n')
    : `${createLrcTimestamp(offset)}${text.trim()}`;
}

function safeFilename(name: string): string {
  return (name || '').replace(/[\\/:*?"<>|\r\n]+/g, '_').slice(0, 80);
}

function App() {
  const audio = useAudioEngine();
  const timeline = useTimeline(0);
  const lyrics = useLyrics();
  const youtube = useYouTube();
  const storage = useStorage();
  const speech = useSpeechTranscription();

  const [version, setVersion] = useState(typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.1');
  const [sourceMode, setSourceMode] = useState<SourceMode>('local');
  const [leftTab, setLeftTab] = useState<LeftTab>('source');
  const [localFileName, setLocalFileName] = useState('');
  const [stage, setStage] = useState<AppStage>('prepare');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showLrcModal, setShowLrcModal] = useState(false);
  const [timelineContextMenu, setTimelineContextMenu] = useState<TimelineContextMenuInfo | null>(null);
  const [lyricsContextMenu, setLyricsContextMenu] = useState<LyricsContextMenuInfo | null>(null);
  const libraryReturnStageRef = useRef<AppStage>('prepare');
  const vocalTakeIdsRef = useRef('');
  const isSingingMode = stage === 'sing';
  const showReviewModal = stage === 'review' && !isLibraryOpen;
  // 錄音 / 暫停期間鎖定一切定位操作：take 對位固定於開始錄製當下，跳轉會導致人聲錯位
  const seekLocked = audio.audioState.isRecording || audio.audioState.isPaused;

  useEffect(() => {
    const ids = audio.vocalTakes.map(take => take.id).join(',');
    if (ids !== vocalTakeIdsRef.current) {
      vocalTakeIdsRef.current = ids;
      const latestTake = audio.vocalTakes[audio.vocalTakes.length - 1];
      timeline.setSelectedTakeId(latestTake?.id ?? null);
    }
  }, [audio.vocalTakes, timeline.setSelectedTakeId]);

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
    if (audio.audioState.isRecording || audio.audioState.isPaused) return;
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
    youtube.pause();
    setSourceMode('local');
    setLocalFileName(file.name);
    const dur = await audio.loadBackingTrack(file);
    timeline.setDuration(dur);
  }, [audio, timeline, youtube]);

  const handleYouTubeSearch = useCallback((query: string) => {
    audio.pauseBackingOnly();
    setSourceMode('youtube');
    youtube.search(query);
  }, [youtube, audio]);

  const handleSourceModeChange = useCallback((mode: SourceMode) => {
    setSourceMode(mode);
    if (mode === 'youtube') audio.pauseBackingOnly();
    else youtube.pause();
  }, [audio, youtube]);

  useEffect(() => {
    if (sourceMode === 'youtube' && youtube.currentTitle) {
      setLocalFileName(youtube.currentTitle);
    }
  }, [sourceMode, youtube.currentTitle]);

  const [showSplashAd, setShowSplashAd] = useState(true);
  const [showPreRecAd, setShowPreRecAd] = useState(false);
  const [videoExporting, setVideoExporting] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const startActualRecording = useCallback(async () => {
    setShowPreRecAd(false);
    // 錄音前回復原速原調（速度≠1 會使人聲 take 對位錯置）
    audio.resetPlaybackPitch();
    if (sourceMode === 'youtube') youtube.setPlaybackRate(1);
    const startAt = timeline.timelineState.currentTime;
    const started = await audio.startRecording(startAt, sourceMode === 'local');
    if (!started) {
      alert('無法啟動錄音，請檢查麥克風權限與輸入裝置。');
      return;
    }
    if (sourceMode === 'youtube') {
      youtube.seekTo(startAt);
      youtube.play();
    }
    setStage('sing');
  }, [audio, timeline.timelineState.currentTime, sourceMode, youtube]);

  // ---- 播放變速 / 升降 KEY ----
  const RATE_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const handlePlaybackRateChange = useCallback((rate: number) => {
    audio.updatePlaybackRate(rate);
    if (sourceMode === 'youtube') youtube.setPlaybackRate(rate);
  }, [audio, sourceMode, youtube]);

  const handleCycleRate = useCallback(() => {
    const current = audio.audioState.playbackRate;
    const idx = RATE_PRESETS.findIndex(p => Math.abs(p - current) < 0.01);
    const next = idx === -1 ? 1 : RATE_PRESETS[(idx + 1) % RATE_PRESETS.length];
    handlePlaybackRateChange(next);
  }, [audio.audioState.playbackRate, handlePlaybackRateChange]);

  const handlePitchStep = useCallback((delta: number) => {
    audio.updatePitchSemitones(audio.audioState.pitchSemitones + delta);
  }, [audio]);

  const handleStartRecording = useCallback(async () => {
    setShowPreRecAd(true);
  }, []);

  const enterSingingMode = useCallback(() => {
    setLeftTab('lyrics');
    setIsLibraryOpen(false);
    setStage('sing');
  }, []);

  const exitSingingMode = useCallback(() => {
    if (audio.audioState.isRecording || audio.audioState.isPaused) return;
    if (sourceMode === 'youtube') youtube.pause();
    else audio.pauseBackingOnly();
    setStage('prepare');
    setLeftTab('source');
  }, [audio.audioState.isRecording, audio.audioState.isPaused, audio, sourceMode, youtube]);

  const handleFinishRecording = useCallback(async () => {
    await audio.finishRecording();
    if (sourceMode === 'youtube') youtube.pause();
    setStage('review');
  }, [audio, sourceMode, youtube]);

  const handlePauseRecording = useCallback(() => {
    audio.pauseRecording();
    if (sourceMode === 'youtube') youtube.pause();
  }, [audio, sourceMode, youtube]);

  const handleResumeRecording = useCallback(() => {
    audio.resumeRecording();
    if (sourceMode === 'youtube') youtube.play();
  }, [audio, sourceMode, youtube]);

  // 重錄此段：YouTube 來源改驅動線上播放器 seek + play（原實作只會去播空伴奏元素）
  const handleReRecordTake = useCallback(async (takeId: number) => {
    if (sourceMode === 'youtube') {
      await audio.reRecordTake(takeId, {
        playExternalBacking: (startAt) => {
          youtube.seekTo(startAt);
          youtube.play();
        },
      });
    } else {
      await audio.reRecordTake(takeId);
    }
  }, [audio, sourceMode, youtube]);

  const handleStageChange = useCallback((next: AppStage) => {
    if (audio.audioState.isRecording || audio.audioState.isPaused) return;
    if (next === 'review' && audio.vocalTakes.length === 0) return;
    if (showReviewModal) {
      audio.stopMixedPreview();
      youtube.pause();
    }
    setIsLibraryOpen(false);
    setStage(next);
    if (next === 'prepare') setLeftTab('source');
    if (next === 'sing') setLeftTab('lyrics');
  }, [audio, showReviewModal, youtube]);

  const handleToggleLibrary = useCallback(() => {
    if (audio.audioState.isRecording || audio.audioState.isPaused) return;
    if (isLibraryOpen) {
      setIsLibraryOpen(false);
      setStage(libraryReturnStageRef.current);
      return;
    }
    libraryReturnStageRef.current = stage;
    if (showReviewModal) {
      audio.stopMixedPreview();
      youtube.pause();
    }
    setIsLibraryOpen(true);
  }, [audio, isLibraryOpen, stage, showReviewModal, youtube]);

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

  const handleSaveToLibrary = useCallback(async (title: string) => {
    await storage.saveRecording({
      title,
      sourceType: sourceMode,
      youtubeId: youtube.currentVideoId || undefined,
      duration: Math.max(audio.audioState.backingDuration, timeline.timelineState.duration),
      // 完整可再編輯專案：保留所有 Take 的對位 (startTime) 與長度，載入後可繼續編修
      takes: audio.vocalTakes.map(take => ({
        id: take.id,
        startTime: take.startTime,
        duration: take.duration,
        blob: take.blob,
      })),
      vocalBlob: audio.vocalTakes[audio.vocalTakes.length - 1]?.blob,
      backingBlob: sourceMode === 'local' ? audio.currentBackingBlob || undefined : undefined,
      lyrics: lyrics.lyricsState.rawLrcText,
      takesCount: audio.vocalTakes.length,
      latencyOffset: audio.audioState.latencyOffsetMs,
    });
    alert('作品已安全寫入本地 IndexedDB 作品庫（含完整多軌 Take，可再載入續修）！');
  }, [storage, audio, youtube, timeline, lyrics, sourceMode]);

  const handleReviewPreviewToggle = useCallback(() => {
    const isPlaying = audio.toggleMixedPreview(sourceMode === 'local');
    if (sourceMode === 'youtube') {
      if (isPlaying) {
        youtube.seekTo(audio.mixCurrentTime);
        youtube.play();
      } else {
        youtube.pause();
      }
    }
  }, [audio, sourceMode, youtube]);

  const handleReviewSeek = useCallback((time: number) => {
    timeline.seek(time);
    lyrics.updateCurrentIndex(time);
    audio.seekMixedPreview(time, sourceMode === 'local');
    if (sourceMode === 'youtube') youtube.seekTo(time);
  }, [audio, lyrics, sourceMode, timeline, youtube]);

  const handleReviewBackingVolumeChange = useCallback((volume: number) => {
    const nextVolume = sourceMode === 'youtube' ? Math.min(volume, 1) : volume;
    audio.updateBackingVolume(nextVolume);
    if (sourceMode === 'youtube') {
      youtube.setVolume(audio.audioState.backingMuted ? 0 : Math.round(nextVolume * 100));
    }
  }, [audio, sourceMode, youtube]);

  const handleReviewBackingMute = useCallback(() => {
    const nextMuted = !audio.audioState.backingMuted;
    audio.toggleBackingMute();
    if (sourceMode === 'youtube') {
      youtube.setVolume(nextMuted ? 0 : Math.min(100, Math.round(audio.audioState.backingVolume * 100)));
    }
  }, [audio, sourceMode, youtube]);

  const handleExportWav = useCallback(async () => {
    try {
      const wavBlob = await audio.exportMixedWavBlob(sourceMode === 'local');
      const defaultFilename = `SingStudio_${safeFilename(cleanTrackTitle(localFileName) || 'Master')}_${Date.now()}.wav`;
      const result = await saveBlobToDisk(wavBlob, defaultFilename, [
        { name: 'WAV 音訊 (*.wav)', extensions: ['wav'] },
      ]);
      if (result === 'saved') alert(`混音母帶已成功匯出至：\n${defaultFilename}`);
      else if (result === 'downloaded') alert('混音母帶已成功生成並開始下載！');
    } catch (err: any) {
      alert(`匯出失敗: ${err.message}`);
    }
  }, [audio, localFileName, sourceMode]);

  const handleExportMp3 = useCallback(async () => {
    try {
      const mp3Blob = await audio.exportMixedMp3Blob(sourceMode === 'local', 192);
      const defaultFilename = `SingStudio_${safeFilename(cleanTrackTitle(localFileName) || 'Master')}_${Date.now()}.mp3`;
      const result = await saveBlobToDisk(mp3Blob, defaultFilename, [
        { name: 'MP3 音訊 (*.mp3)', extensions: ['mp3'] },
      ]);
      if (result === 'saved') alert(`MP3 已成功匯出至：\n${defaultFilename}`);
      else if (result === 'downloaded') alert('MP3 已成功生成並開始下載！');
    } catch (err: any) {
      alert(`MP3 匯出失敗: ${err.message}`);
    }
  }, [audio, localFileName, sourceMode]);

  // MP4 歌詞影片：離線混音 → Canvas + MediaRecorder 即時渲染（畫面含歌詞字幕與頻譜）
  const handleExportVideo = useCallback(async () => {
    if (videoExporting) return;
    setVideoExporting(true);
    setVideoProgress(0);
    try {
      // 匯出期間停掉所有試聽音源，避免混入
      audio.stopMixedPreview();
      youtube.pause();

      const mixedBuffer = await audio.renderMixedAudioBuffer(sourceMode === 'local');
      const { blob, extension } = await renderLyricVideoBlob({
        audioBuffer: mixedBuffer,
        title: cleanTrackTitle(localFileName) || 'SingStudio 演唱作品',
        lyrics: lyrics.lyricsState.lyrics,
        onProgress: setVideoProgress,
      });
      const defaultFilename = `SingStudio_${safeFilename(cleanTrackTitle(localFileName) || 'Master')}_${Date.now()}.${extension}`;
      const result = await saveBlobToDisk(blob, defaultFilename, [
        { name: extension === 'mp4' ? 'MP4 影片 (*.mp4)' : 'WebM 影片 (*.webm)', extensions: [extension] },
      ]);
      if (result === 'saved') alert(`歌詞影片已成功匯出至：\n${defaultFilename}`);
      else if (result === 'downloaded') alert('歌詞影片已成功生成並開始下載！');
    } catch (err: any) {
      alert(`影片匯出失敗: ${err.message}`);
    } finally {
      setVideoExporting(false);
      setVideoProgress(0);
    }
  }, [audio, youtube, lyrics, localFileName, sourceMode, videoExporting]);

  const handleLoadFromLibrary = useCallback(async (id: number) => {
    const full = await storage.getById(id);
    if (!full) return;

    setLocalFileName(full.title);
    if (full.sourceType === 'local') {
      setSourceMode('local');
      if (full.backingBlob) await audio.loadBackingTrack(full.backingBlob);
      else audio.clearBackingTrack();
      timeline.setDuration(full.duration);
    } else if (full.sourceType === 'youtube' && full.youtubeId) {
      audio.clearBackingTrack();
      setSourceMode('youtube');
      youtube.loadVideo(full.youtubeId, full.title);
      timeline.setDuration(full.duration);
    }
    if (full.lyrics) {
      lyrics.parseLRC(full.lyrics);
    } else {
      lyrics.clearLyrics();
    }
    if (full.vocalBlob || full.takes?.length) {
      // 優先還原完整多軌專案（所有 Take 含原始對位），舊資料退回單一 vocalBlob
      if (full.takes?.length) {
        const takes: VocalTake[] = full.takes
          .filter(t => t.blob instanceof Blob)
          .map(t => ({
            id: t.id,
            startTime: t.startTime,
            duration: t.duration,
            blob: t.blob,
            url: URL.createObjectURL(t.blob!),
          }));
        audio.replaceVocalTakes(takes);
        timeline.setSelectedTakeId(takes[takes.length - 1]?.id ?? null);
      } else {
        const take: VocalTake = {
          id: Date.now(),
          startTime: 0,
          duration: full.duration,
          blob: full.vocalBlob,
          url: URL.createObjectURL(full.vocalBlob!),
        };
        audio.replaceVocalTakes([take]);
        timeline.setSelectedTakeId(take.id);
      }
    } else {
      audio.replaceVocalTakes([]);
    }
    if (full.latencyOffset) {
      audio.updateLatencyOffset(full.latencyOffset);
    }
    setIsLibraryOpen(false);
    setStage('review');
  }, [storage, audio, lyrics, youtube, timeline]);

  const handleTranscribeTake = useCallback(async () => {
    const selectedTake = audio.vocalTakes.find(take => take.id === timeline.selectedTakeId);
    const take = selectedTake || audio.vocalTakes[audio.vocalTakes.length - 1];
    if (!take?.blob) {
      alert('找不到可辨識的人聲錄音，請先完成錄音或重新載入作品。');
      return;
    }
    if (!speech.modelReady) {
      setIsSettingsOpen(true);
      return;
    }
    if (lyrics.lyricsState.rawLrcText && !window.confirm('目前已有歌詞，要用語音辨識結果取代嗎？')) return;

    try {
      const result = await speech.transcribe(take.blob);
      const lrc = speechChunksToLrc(result.chunks, result.text, take.startTime);
      lyrics.parseLRC(lrc, timeline.timelineState.duration || take.duration);
      setLeftTab('lyrics');
      setStage('prepare');
    } catch (error) {
      alert(`語音轉字幕失敗：${error instanceof Error ? error.message : String(error)}`);
    }
  }, [audio.vocalTakes, timeline, speech, lyrics]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (showReviewModal) {
          handleReviewPreviewToggle();
        } else if (audio.audioState.isRecording) {
          handlePauseRecording();
        } else if (audio.audioState.isPaused) {
          handleResumeRecording();
        } else {
          handleToggleBackingPlay();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showReviewModal, audio, handleReviewPreviewToggle, handleToggleBackingPlay, handlePauseRecording, handleResumeRecording]);

  return (
    <div className={`app${isSingingMode ? ' is-singing-mode' : ''}${leftTab === 'lyrics' ? ' is-lyrics-tab' : ''}${sourceMode === 'youtube' ? ' is-youtube-source' : ''}${isLibraryOpen ? ' is-library-open' : ''}`}>
      <audio ref={audio.backingAudioRef} preload="metadata" className="backing-audio-element" />
      <Header
        version={version}
        libraryOpen={isLibraryOpen}
        libraryDisabled={audio.audioState.isRecording || audio.audioState.isPaused}
        settingsDisabled={audio.audioState.isRecording || audio.audioState.isPaused}
        onToggleLibrary={handleToggleLibrary}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <WorkflowTabs
        stage={stage}
        disabled={audio.audioState.isRecording || audio.audioState.isPaused}
        hasTakes={audio.vocalTakes.length > 0}
        onChange={handleStageChange}
      />

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
              onClick={() => {
                if (window.matchMedia('(max-width: 768px)').matches) {
                  if (isSingingMode) exitSingingMode();
                  else enterSingingMode();
                } else {
                  handleStartRecording();
                }
              }}
              disabled={audio.audioState.isRecording || audio.audioState.isPaused || isLibraryOpen}
            >
              <span className="desktop-record-label">快速錄製</span>
              <span className="mobile-sing-label">{isSingingMode ? '返回準備' : '進入開唱'}</span>
            </button>
          </div>
        </div>

        <div className="workspace-grid">
          <div className="left-column">
            {sourceMode === 'local' && (
              <LocalPlayerBar
                fileName={localFileName}
                hasTrack={Boolean(audio.currentBackingBlob)}
                isPlaying={audio.audioState.isBackingSoloPlaying}
                currentTime={timeline.timelineState.currentTime}
                duration={timeline.timelineState.duration}
                seekLocked={seekLocked}
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

            <div className={`left-tab-pane source-workspace-pane ${leftTab === 'source' ? '' : 'offscreen-keep'}`}>
              <SourcePanel
                sourceMode={sourceMode}
                onSourceModeChange={handleSourceModeChange}
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

            <div className={`left-tab-pane lyrics-workspace-pane ${leftTab === 'lyrics' ? '' : 'hidden'}`}>
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
                onTranscribeTake={handleTranscribeTake}
                onOpenSettings={() => setIsSettingsOpen(true)}
                hasVocalTake={audio.vocalTakes.length > 0}
                modelReady={speech.modelReady}
                isTranscribing={speech.isTranscribing}
                onSeekToLyric={handleSeek}
                onContextMenu={(_e, info) => setLyricsContextMenu(info)}
                readOnly={audio.audioState.isRecording || audio.audioState.isPaused}
                emptyMessage={isSingingMode
                  ? '尚未加入同步歌詞。返回準備頁搜尋或匯入歌詞，也可以直接錄音。'
                  : undefined}
              />
            </div>
          </div>

          <div className="right-column">
            <div className="panel panel-equal-height audio-workspace-panel">
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
                    seekLocked={seekLocked}
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
                    disabled={seekLocked}
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
                    disabled={seekLocked}
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
                    disabled={seekLocked}
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
                    disabled={seekLocked}
                    title="快進 5 秒"
                  >
                    <span>5s</span>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 4v6h-6" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                  </button>
                </div>

                <div className="media-rate-key-strip">
                  <label
                    className="mini-ctl"
                    title="播放速度（練習用；開始錄音時自動回復原速）"
                  >
                    <span>速度</span>
                    <select
                      className="mini-select"
                      value={audio.audioState.playbackRate}
                      disabled={seekLocked}
                      onChange={(e) => handlePlaybackRateChange(Number(e.target.value))}
                    >
                      {RATE_PRESETS.map(r => (
                        <option key={r} value={r}>{r}x</option>
                      ))}
                    </select>
                  </label>
                  <div
                    className="mini-ctl"
                    title={sourceMode === 'youtube'
                      ? 'YouTube 來源技術上無法升降 KEY（僅支援變速）'
                      : '升降 KEY（半音）；開始錄音時自動回復原調'}
                  >
                    <span>KEY</span>
                    <button
                      className="btn btn-sm btn-icon key-btn"
                      type="button"
                      disabled={seekLocked || sourceMode === 'youtube' || audio.audioState.pitchSemitones <= -6}
                      onClick={() => handlePitchStep(-1)}
                    >
                      −
                    </button>
                    <span className="key-value">
                      {audio.audioState.pitchSemitones === 0
                        ? '原調'
                        : `${audio.audioState.pitchSemitones > 0 ? '+' : ''}${audio.audioState.pitchSemitones}`}
                    </span>
                    <button
                      className="btn btn-sm btn-icon key-btn"
                      type="button"
                      disabled={seekLocked || sourceMode === 'youtube' || audio.audioState.pitchSemitones >= 6}
                      onClick={() => handlePitchStep(1)}
                    >
                      +
                    </button>
                  </div>
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
                    <button
                      className={`btn btn-sm ${audio.audioState.isVocalCancellationEnabled ? 'btn-primary' : 'btn-outline'}`}
                      type="button"
                      onClick={audio.toggleVocalCancellation}
                    >
                      消除人聲: {audio.audioState.isVocalCancellationEnabled ? '開' : '關'}
                    </button>
                  </div>

                  <div className="live-tool-item">
                    <button
                      className={`btn btn-sm ${audio.audioState.isMonitoringEnabled ? 'btn-primary' : 'btn-outline'}`}
                      type="button"
                      onClick={audio.toggleMonitor}
                    >
                      即時耳返: {audio.audioState.isMonitoringEnabled ? '開' : '關'}
                    </button>
                  </div>
                </div>

                {audio.audioState.isMonitoringEnabled && (
                  <div className="monitor-controls-box">
                    <div className="live-tool-item">
                      <span className="live-tool-lbl">耳返音量:</span>
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

              <RecordingControls
                isRecording={audio.audioState.isRecording}
                isPaused={audio.audioState.isPaused}
                hasRecording={audio.vocalTakes.length > 0}
                onStartRecording={handleStartRecording}
                onPauseRecording={handlePauseRecording}
                onResumeRecording={handleResumeRecording}
                onFinishRecording={handleFinishRecording}
                onResetRecording={audio.resetRecording}
              />

              <TakesManager
                takes={audio.vocalTakes}
                selectedTakeId={timeline.selectedTakeId}
                onSelectTake={timeline.setSelectedTakeId}
                onDeleteTake={audio.deleteTake}
                onPlayTake={audio.playTake}
                onReRecordTake={handleReRecordTake}
              />
            </div>
          </div>
        </div>

        <div className={`library-view${isLibraryOpen ? '' : ' hidden'}`}>
          <LibraryTable
            recordings={storage.recordings}
            onLoadRecording={handleLoadFromLibrary}
            onDeleteRecording={storage.deleteRecording}
            onRefresh={storage.refresh}
          />
        </div>

        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            audio.stopMixedPreview();
            youtube.pause();
            setStage('sing');
          }}
          duration={Math.max(audio.audioState.backingDuration, timeline.timelineState.duration)}
          currentTime={audio.mixCurrentTime}
          isPlaying={audio.audioState.isPlayingMix}
          backingPeaks={audio.waveformPeaks}
          vocalTakes={audio.vocalTakes}
          backingVolume={audio.audioState.backingVolume}
          backingVolumeMax={sourceMode === 'youtube' ? 1 : 1.5}
          vocalVolume={audio.audioState.vocalVolume}
          backingMuted={audio.audioState.backingMuted}
          vocalMuted={audio.audioState.vocalMuted}
          reverbEnabled={audio.audioState.reverbEnabled}
          latencyOffsetMs={audio.audioState.latencyOffsetMs}
          defaultTitle={localFileName || '我的演唱作品'}
          sourceMode={sourceMode}
          onTogglePlayPreview={handleReviewPreviewToggle}
          onSeekPreview={handleReviewSeek}
          onResetPreview={() => handleReviewSeek(0)}
          onBackingVolumeChange={handleReviewBackingVolumeChange}
          onVocalVolumeChange={audio.updateVocalVolume}
          onToggleBackingMute={handleReviewBackingMute}
          onToggleVocalMute={audio.toggleVocalMute}
          onToggleReverb={audio.toggleReverb}
          onLatencyOffsetChange={audio.updateLatencyOffset}
          onSaveToLibrary={handleSaveToLibrary}
          onExportWav={handleExportWav}
          onExportMp3={handleExportMp3}
          onExportVideo={handleExportVideo}
          videoExporting={videoExporting}
          videoProgress={videoProgress}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          isDownloading={speech.isDownloading}
          modelReady={speech.modelReady}
          downloadPercent={speech.downloadPercent}
          downloadFile={speech.downloadFile}
          error={speech.error}
          onDownloadModel={speech.downloadModel}
          onClose={() => setIsSettingsOpen(false)}
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
          onReRecordTake={handleReRecordTake}
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
          hasBacking={sourceMode === 'youtube' ? Boolean(youtube.currentVideoId) : Boolean(audio.currentBackingBlob)}
          inputLevel={audio.inputLevel}
          playbackRate={audio.audioState.playbackRate}
          pitchSemitones={audio.audioState.pitchSemitones}
          pitchLocked={sourceMode === 'youtube'}
          onTogglePlay={handleToggleBackingPlay}
          onSeek={handleSeek}
          isSingingMode={isSingingMode}
          onExitSinging={exitSingingMode}
          onStartRecording={handleStartRecording}
          onPauseRecording={handlePauseRecording}
          onResumeRecording={handleResumeRecording}
          onFinishRecording={handleFinishRecording}
          onCycleRate={handleCycleRate}
          onPitchStep={handlePitchStep}
        />
      </main>

      {/* yesolve studio 開場廣告覆蓋層（聲學青雙軌工作站主題） */}
      {showSplashAd && <SplashAd onFinish={() => setShowSplashAd(false)} appName="SingStudio DAW" />}

      {/* 開唱前預備贊助廣告（倒數結束後自動開始錄音） */}
      <PreRecordingAd visible={showPreRecAd} onFinish={startActualRecording} />
    </div>
  );
}

export default App;
