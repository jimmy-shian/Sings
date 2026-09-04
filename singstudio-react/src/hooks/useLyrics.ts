import { useState, useCallback, useEffect, useRef } from 'react';
import type { LyricsLine, LyricsState } from '../types';

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

  const containerRef = useRef<HTMLDivElement>(null);
  const lineElementsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  // 載入示範歌詞
  const loadDemoLyrics = useCallback(() => {
    const demoLrc = `[00:00.00] 卡農之歌 (示範伴奏)
[00:02.00] 準備開始... 3, 2, 1
[00:04.00] 微風輕輕吹過窗前的一角
[00:08.00] 伴奏響起心中的旋律在微笑
[00:12.00] 每一句旋律都唱出夢想的步調
[00:16.00] 讓歌聲在時光裡自由飛躍與環繞
[00:20.00] 不要害怕音符走高或是變低
[00:24.00] 只要用心唱出每一刻的旋律
[00:28.00] 節奏在跳動，跟隨心跳的頻率
[00:32.00] 這是屬於你最真實的聲音
[00:36.00] 唱出心中的熱情與力量
[00:40.00] 掌聲為你響起，勇敢去發光
[00:44.00] 尾奏漸弱，留下美好的餘響
[00:50.00] 演唱結束，立即試聽你的精彩版本！`;

    parseLRC(demoLrc);
  }, []);

  // 解析 LRC
  const parseLRC = useCallback((lrcText: string) => {
    const lyrics: LyricsLine[] = [];
    const lines = lrcText.split(/\r?\n/);
    const timeReg = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('[ti:') || trimmed.startsWith('[ar:') || trimmed.startsWith('[al:')) continue;

      let match;
      const text = trimmed.replace(timeReg, '').trim();

      timeReg.lastIndex = 0;
      while ((match = timeReg.exec(trimmed)) !== null) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = match[3] ? parseInt(match[3].padEnd(3, '0').substring(0, 3), 10) : 0;
        const totalSeconds = min * 60 + sec + ms / 1000;

        lyrics.push({
          time: totalSeconds,
          text: text || trimmed.replace(timeReg, '').trim(),
          index: lyrics.length,
        });
      }
    }

    // 依時間排序
    lyrics.sort((a, b) => a.time - b.time);
    lyrics.forEach((l, i) => l.index = i);

    setLyricsState(prev => ({
      ...prev,
      lyrics,
      rawLrcText: lrcText,
      currentIndex: -1,
    }));
  }, []);

  // 更新當前歌詞索引
  const updateCurrentIndex = useCallback((currentTime: number) => {
    setLyricsState(prev => {
      const adjustedTime = currentTime - prev.offsetSec;
      let newIndex = -1;

      for (let i = prev.lyrics.length - 1; i >= 0; i--) {
        if (prev.lyrics[i].time <= adjustedTime) {
          newIndex = i;
          break;
        }
      }

      if (newIndex !== prev.currentIndex) {
        // 自動捲動到當前歌詞
        if (newIndex >= 0 && containerRef.current) {
          const lineEl = lineElementsRef.current.get(newIndex);
          if (lineEl) {
            lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }

      return { ...prev, currentIndex: newIndex };
    });
  }, []);

  // 調整歌詞偏移
  const adjustOffset = useCallback((delta: number) => {
    setLyricsState(prev => ({
      ...prev,
      offsetSec: Math.round((prev.offsetSec + delta) * 10) / 10,
    }));
  }, []);

  // 重置偏移
  const resetOffset = useCallback(() => {
    setLyricsState(prev => ({ ...prev, offsetSec: 0 }));
  }, []);

  // 設定當前句為起點
  const setAnchor = useCallback((currentTime: number) => {
    setLyricsState(prev => {
      if (prev.currentIndex >= 0 && prev.currentIndex < prev.lyrics.length) {
        const currentLine = prev.lyrics[prev.currentIndex];
        return {
          ...prev,
          offsetSec: Math.round((currentTime - currentLine.time) * 10) / 10,
        };
      }
      return prev;
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
      if (results.length > 0) {
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

  // 匯出 LRC
  const exportLRC = useCallback(() => {
    return lyricsState.rawLrcText;
  }, [lyricsState.rawLrcText]);

  // 註冊歌詞行元素
  const registerLineElement = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) {
      lineElementsRef.current.set(index, el);
    } else {
      lineElementsRef.current.delete(index);
    }
  }, []);

  // 初始化示範歌詞
  useEffect(() => {
    loadDemoLyrics();
  }, [loadDemoLyrics]);

  return {
    lyricsState,
    containerRef,
    registerLineElement,
    updateCurrentIndex,
    adjustOffset,
    resetOffset,
    setAnchor,
    seekToLyric,
    searchLyrics,
    exportLRC,
    parseLRC,
    loadDemoLyrics,
  };
}
