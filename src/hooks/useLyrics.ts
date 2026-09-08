import { useState, useCallback, useEffect } from 'react';
import type { LyricsState } from '../types';
import { parseLrc, exportLrc } from '../utils/lrcParser';

// ============================================================================
// SingStudio - useLyrics Hook
// 動態歌詞同步與免費歌詞庫引擎 (React Hook 版本)
// ============================================================================

export function useLyrics() {
  const [lyricsState, setLyricsState] = useState<LyricsState>({
    lyrics: [],
    currentIndex: -1,
    offsetSec: 0,
    rawLrcText: '',
  });

  // 解析 LRC (引用共用模組 parseLrc)
  const parseLRC = useCallback((lrcText: string, fallbackDuration = 180) => {
    const lyrics = parseLrc(lrcText, fallbackDuration);

    setLyricsState(prev => ({
      ...prev,
      lyrics,
      rawLrcText: lrcText,
      currentIndex: -1,
    }));
  }, []);

  // 清空歌詞
  const clearLyrics = useCallback(() => {
    setLyricsState({
      lyrics: [],
      rawLrcText: '',
      currentIndex: -1,
      offsetSec: 0,
    });
  }, []);

  const loadDemoLyrics = useCallback(() => {
    // 預設留白不載入示範歌詞
  }, []);

  // 更新當前歌詞索引 (純粹狀態更新，絕不在 Reducer 內部呼叫 DOM 副作用)
  const updateCurrentIndex = useCallback((currentTime: number) => {
    setLyricsState(prev => {
      if (prev.lyrics.length === 0) return prev;

      const adjustedTime = currentTime - prev.offsetSec;
      let newIndex = -1;

      for (let i = prev.lyrics.length - 1; i >= 0; i--) {
        if (prev.lyrics[i].time <= adjustedTime) {
          newIndex = i;
          break;
        }
      }

      if (newIndex !== prev.currentIndex) {
        return { ...prev, currentIndex: newIndex };
      }
      return prev;
    });
  }, []);

  // 調整歌詞偏移
  const adjustOffset = useCallback((delta: number, currentTime?: number) => {
    setLyricsState(prev => {
      const newOffset = Math.round((prev.offsetSec + delta) * 10) / 10;
      let newIndex = prev.currentIndex;
      if (typeof currentTime === 'number' && prev.lyrics.length > 0) {
        const adjustedTime = currentTime - newOffset;
        newIndex = -1;
        for (let i = prev.lyrics.length - 1; i >= 0; i--) {
          if (prev.lyrics[i].time <= adjustedTime) {
            newIndex = i;
            break;
          }
        }
      }
      return {
        ...prev,
        offsetSec: newOffset,
        currentIndex: newIndex,
      };
    });
  }, []);

  // 重置偏移
  const resetOffset = useCallback((currentTime?: number) => {
    setLyricsState(prev => {
      let newIndex = prev.currentIndex;
      if (typeof currentTime === 'number' && prev.lyrics.length > 0) {
        newIndex = -1;
        for (let i = prev.lyrics.length - 1; i >= 0; i--) {
          if (prev.lyrics[i].time <= currentTime) {
            newIndex = i;
            break;
          }
        }
      }
      return { ...prev, offsetSec: 0, currentIndex: newIndex };
    });
  }, []);

  // 設定指定句（或當前句 / 第一句）對齊至播放指針時間
  const setAnchor = useCallback((currentTime: number, targetIndex?: number) => {
    setLyricsState(prev => {
      if (prev.lyrics.length === 0) return prev;

      // 決定要對齊的目標句
      let targetIdx = 0;
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < prev.lyrics.length) {
        targetIdx = targetIndex;
      } else if (prev.currentIndex >= 0 && prev.currentIndex < prev.lyrics.length) {
        targetIdx = prev.currentIndex;
      }

      const targetLine = prev.lyrics[targetIdx];
      // 目標行在 targetLine.time，要讓它在 currentTime 播放：targetLine.time + offsetSec = currentTime
      const newOffset = Math.round((currentTime - targetLine.time) * 10) / 10;

      // 立即重新計算當前高亮行
      const adjustedTime = currentTime - newOffset;
      let newIndex = -1;
      for (let i = prev.lyrics.length - 1; i >= 0; i--) {
        if (prev.lyrics[i].time <= adjustedTime) {
          newIndex = i;
          break;
        }
      }

      return {
        ...prev,
        offsetSec: newOffset,
        currentIndex: newIndex >= 0 ? newIndex : targetIdx,
      };
    });
  }, []);

  // 點擊歌詞跳轉
  const seekToLyric = useCallback((index: number) => {
    if (index >= 0 && index < lyricsState.lyrics.length) {
      return lyricsState.lyrics[index].time + lyricsState.offsetSec;
    }
    return 0;
  }, [lyricsState.lyrics, lyricsState.offsetSec]);

  // 從 LRCLIB 搜尋歌詞
  const searchLyrics = useCallback(async (query: string) => {
    try {
      const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) return null;

      const results = await response.json();
      if (Array.isArray(results) && results.length > 0) {
        // 優先選擇有時間軸的版本
        const synced = results.find((r: any) => r.syncedLyrics);
        if (synced?.syncedLyrics) {
          parseLRC(synced.syncedLyrics);
          return synced;
        }
        // 備用：純文字歌詞
        if (results[0].plainLyrics) {
          parseLRC(results[0].plainLyrics);
          return results[0];
        }
      }
      return null;
    } catch (e) {
      console.error('搜尋歌詞失敗:', e);
      return null;
    }
  }, [parseLRC]);

  // 匯出 LRC (引用共用模組 exportLrc)
  const exportLRC = useCallback(() => {
    return lyricsState.rawLrcText || exportLrc(lyricsState.lyrics);
  }, [lyricsState.rawLrcText, lyricsState.lyrics]);

  return {
    lyricsState,
    updateCurrentIndex,
    adjustOffset,
    resetOffset,
    setAnchor,
    seekToLyric,
    searchLyrics,
    exportLRC,
    parseLRC,
    clearLyrics,
    loadDemoLyrics,
  };
}
