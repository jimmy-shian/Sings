// ============================================================================
// SingStudio - TypeScript 型別定義
// ============================================================================

export interface VocalTake {
  id: number;
  startTime: number;
  duration: number;
  url: string;
  blob?: Blob;
  peaks?: number[];
  rmsHistory?: number[];
}

// 可再編輯專案的 Take 快照（保存至作品庫 / 載入續修用）
export interface SavedTake {
  id: number;
  startTime: number;
  duration: number;
  blob?: Blob;
}

export interface LyricsLine {
  time: number;
  text: string;
  index: number;
}

export interface YouTubeResult {
  id: string;
  title: string;
  duration: string;
  channel: string;
  thumbnail?: string;
}

export type LeftTabMode = 'source' | 'lyrics';
export type AudioSourceMode = 'local' | 'youtube';

export interface Recording {
  id?: number;
  title: string;
  sourceType: 'local' | 'youtube';
  youtubeId?: string;
  duration: number;
  timestamp: number;
  dateString: string;
  sizeBytes?: number;
  sizeFormatted: string;
  vocalBlob?: Blob;
  backingBlob?: Blob;
  lyrics?: string;
  note?: string;
  takesCount?: number;
  latencyOffset?: number;
  takes?: SavedTake[];
}

export interface AudioState {
  isRecording: boolean;
  isPaused: boolean;
  isBackingSoloPlaying: boolean;
  isPlayingMix: boolean;
  sourceMode: 'local' | 'youtube';
  currentBackingUrl: string | null;
  backingDuration: number;
  currentTime: number;
  liveBackingVolume: number;
  backingVolume: number;
  vocalVolume: number;
  backingMuted: boolean;
  vocalMuted: boolean;
  reverbEnabled: boolean;
  latencyOffsetMs: number;
  isVocalCancellationEnabled: boolean;
  isMonitoringEnabled: boolean;
  monitorVolume: number;
  micSensitivity: number;
  isNoiseFilterEnabled: boolean;
  /** 伴奏播放速度 0.5 ~ 2.0（錄音時自動回復 1.0） */
  playbackRate: number;
  /** 升降 KEY 半音數 -6 ~ +6（僅本地音檔支援；錄音時自動回復 0） */
  pitchSemitones: number;
}

export interface TimelineState {
  zoomLevel: number;
  viewStartTime: number;
  duration: number;
  currentTime: number;
  isDragging: boolean;
  isSnapped: boolean;
  snapTime: number;
  isRecording: boolean;
}

export interface LyricsState {
  lyrics: LyricsLine[];
  currentIndex: number;
  offsetSec: number;
  rawLrcText: string;
}

export interface TimelineContextMenuInfo {
  x: number;
  y: number;
  time: number;
  take: VocalTake | null;
}

export interface LyricsContextMenuInfo {
  x: number;
  y: number;
  index: number;
  line: LyricsLine;
}

export interface LrcSearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  syncedLyrics?: string;
  plainLyrics?: string;
}

