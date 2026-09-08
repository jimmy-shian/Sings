/**
 * SingStudio - format.ts
 * 時間格式化、時長顯示與歌曲/音訊標題淨化模組
 */

/**
 * 將秒數格式化為 mm:ss 格式
 * 例如: 65 -> "01:05", 215.4 -> "03:35"
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 將秒數格式化為可選 m:ss 格式 (適用於簡短標籤)
 */
export function formatDuration(sec?: number): string {
  if (!sec || isNaN(sec) || sec < 0) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * 淨化歌曲/音訊標題，剔除檔案副檔名及常見 MV/官方冗贅詞彙，
 * 提煉出最精確的「歌手 - 歌名」以利 LRCLIB / 歌詞庫高精準搜尋
 */
export function cleanTrackTitle(rawTitle: string): string {
  if (!rawTitle) return '';

  let cleaned = rawTitle.trim();

  // 1. 移除音訊副檔名
  cleaned = cleaned.replace(/\.(mp3|wav|m4a|flac|ogg|aac|wma)$/i, '');

  // 2. 移除常見的官方影片與格式標註 (支援中英文大小括號與方括號)
  const noisePatterns = [
    /[[【(（]\s*(official\s*(music\s*)?(video|audio)|official|mv|hd|hq|4k|1080p|720p|audio|lyrics?|官方\s*mv|官方音樂錄影帶|高畫質|無損|動態歌詞|伴奏|純伴奏|karaoke|instrumental|純音|無人聲|消音版)\s*[\]】)）]/gi,
    /\|\s*official\s*(music\s*)?(video|audio)/gi,
    /-\s*official\s*(music\s*)?(video|audio)/gi,
    /純伴奏|無人聲|消音版/gi,
  ];

  for (const pattern of noisePatterns) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // 3. 清理可能遺留的空括號
  cleaned = cleaned.replace(/[[【(（]\s*[\]】)）]/g, ' ');

  // 4. 壓縮連續多餘空白
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return cleaned || rawTitle.trim();
}
