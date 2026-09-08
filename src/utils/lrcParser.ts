/**
 * SingStudio - lrcParser.ts
 * LRC 動態歌詞與純文字歌詞解析、序列化與容錯模組
 */

import type { LyricsLine } from '../types';

/**
 * 解析 LRC 歌詞文字為結構化 LyricsLine 陣列
 * 支援:
 * 1. 標準 LRC 時間戳 [mm:ss.xx] 與 [mm:ss.xxx]、[mm:ss]
 * 2. 同一行內包含多個時間戳 (如 [00:10.00][00:30.00] 旋律再現)
 * 3. 容錯處理增強型卡拉OK字級標籤 <00:10.50>
 * 4. 純文字歌詞 (plainLyrics) 智慧降級: 若無任何時間戳，自動依時長生成均勻參考起點，
 *    避免面板空白或卡死，並允許使用者點擊「📍 對齊當前句」進行校準。
 */
export function parseLrc(lrcText: string, fallbackDuration = 180): LyricsLine[] {
  if (!lrcText || typeof lrcText !== 'string') return [];

  const rawLines = lrcText.split(/\r?\n/);
  const timeReg = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  const parsedLyrics: LyricsLine[] = [];
  const plainTextLines: string[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // 忽略常見 LRC 標籤中繼資料 (ti: 歌名, ar: 歌手, al: 專輯, by: 創作者, offset: 偏移量等)
    if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(trimmed)) {
      continue;
    }

    // 檢查是否有時間戳
    timeReg.lastIndex = 0;
    const hasTimestamp = timeReg.test(trimmed);

    if (hasTimestamp) {
      // 提取去除所有時間戳後的純文字
      let lineText = trimmed.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
      // 移除可能存在的增強型字級時間標籤 (如 <00:12.30>)
      lineText = lineText.replace(/<\d{1,2}:\d{2}(?:\.\d{1,3})?>/g, '').trim();

      // 重新搜尋這行中所有的時間戳 (支援同一句有多個時間點)
      timeReg.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = timeReg.exec(trimmed)) !== null) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const msRaw = match[3] || '0';
        // 統一換算為秒 (補齊至 3 位毫秒)
        const ms = parseInt(msRaw.padEnd(3, '0').substring(0, 3), 10);
        const totalSeconds = min * 60 + sec + ms / 1000;

        parsedLyrics.push({
          time: totalSeconds,
          text: lineText,
          index: 0, // 後續排序後重新標號
        });
      }
    } else {
      // 無時間戳的純文字行
      plainTextLines.push(trimmed);
    }
  }

  // 若成功解析出至少 1 行含時間戳的歌詞
  if (parsedLyrics.length > 0) {
    // 按時間升序排序
    parsedLyrics.sort((a, b) => a.time - b.time);
    // 重新校正 index
    parsedLyrics.forEach((item, idx) => {
      item.index = idx;
    });
    return parsedLyrics;
  }

  // 降級保護: 若完全沒有時間戳 (使用者選用了 LRCLIB 的 plainLyrics 純文字歌詞)
  if (plainTextLines.length > 0) {
    const validLines = plainTextLines.filter(l => l.length > 0);
    if (validLines.length === 0) return [];

    const effectiveDur = Math.max(30, fallbackDuration);
    const step = Math.min(5, Math.max(2, effectiveDur / validLines.length));

    return validLines.map((text, idx) => ({
      time: Math.round(idx * step * 10) / 10,
      text,
      index: idx,
    }));
  }

  return [];
}

/**
 * 將 LyricsLine 陣列匯出為標準 LRC 格式字串
 */
export function exportLrc(lyrics: LyricsLine[], metadata: Record<string, string> = {}): string {
  const metaHeader: string[] = [];
  if (metadata.title) metaHeader.push(`[ti:${metadata.title}]`);
  if (metadata.artist) metaHeader.push(`[ar:${metadata.artist}]`);
  if (metadata.album) metaHeader.push(`[al:${metadata.album}]`);
  metaHeader.push('[by:SingStudio Pro]');

  const lines = lyrics.map((line) => {
    const totalSec = Math.max(0, line.time);
    const min = Math.floor(totalSec / 60);
    const sec = Math.floor(totalSec % 60);
    const ms = Math.floor((totalSec % 1) * 100);

    const minStr = min.toString().padStart(2, '0');
    const secStr = sec.toString().padStart(2, '0');
    const msStr = ms.toString().padStart(2, '0');

    return `[${minStr}:${secStr}.${msStr}] ${line.text}`;
  });

  return [...metaHeader, ...lines].join('\n');
}
