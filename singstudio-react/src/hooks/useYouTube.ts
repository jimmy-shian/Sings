import { useState, useRef, useCallback, useEffect } from 'react';
import type { YouTubeResult } from '../types';

export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  // Comprehensive regex for all YouTube link formats
  const match = trimmed.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+?&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : null;
}

export function useYouTube() {
  const [player, setPlayer] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>('VS1lvYuW3LQ');
  const [currentTitle, setCurrentTitle] = useState('王心凌 Cyndi Wang – 大眠 (Official Music Video)');
  const [duration, setDuration] = useState(0);
  const [searchResults, setSearchResults] = useState<YouTubeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [karaokeMode, setKaraokeMode] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const syncTimerRef = useRef<number | null>(null);
  const onTimeUpdateRef = useRef<((time: number) => void) | null>(null);
  const onDurationChangeRef = useRef<((dur: number) => void) | null>(null);
  const pendingVideoRef = useRef<{ videoId: string; title: string } | null>({
    videoId: 'VS1lvYuW3LQ',
    title: '預設示範歌曲',
  });

  const loadVideo = useCallback((videoId: string, title: string) => {
    if (!window.YT || !window.YT.Player) {
      pendingVideoRef.current = { videoId, title };
      return;
    }

    setCurrentVideoId(videoId);
    setCurrentTitle(title);

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const holder = document.createElement('div');
      containerRef.current.appendChild(holder);

      try {
        const newPlayer = new window.YT.Player(holder, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            fs: 0,
            disablekb: 1,
          },
          events: {
            onReady: () => {
              setPlayer(newPlayer);
              const dur = newPlayer.getDuration();
              if (dur && dur > 0) {
                setDuration(dur);
                onDurationChangeRef.current?.(dur);
              }
            },
            onStateChange: (event: any) => {
              const state = event.data;
              setIsPlaying(state === window.YT.PlayerState.PLAYING);
            },
          },
        });
      } catch (err) {
        console.warn('YouTube Player 初始化異常:', err);
      }
    }
  }, []);

  const initApi = useCallback(() => {
    if (window.YT && window.YT.Player) {
      setIsReady(true);
      if (pendingVideoRef.current) {
        const { videoId, title } = pendingVideoRef.current;
        pendingVideoRef.current = null;
        loadVideo(videoId, title);
      }
      return;
    }

    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      setIsReady(true);
      if (typeof prevReady === 'function') prevReady();
      if (pendingVideoRef.current) {
        const { videoId, title } = pendingVideoRef.current;
        pendingVideoRef.current = null;
        loadVideo(videoId, title);
      }
    };
  }, [loadVideo]);

  const search = useCallback(async (rawQuery: string) => {
    if (!rawQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);

    try {
      // 判斷是否為 YouTube 影片網址或 11 碼影片 ID
      const directVideoId = extractYouTubeVideoId(rawQuery);
      if (directVideoId) {
        let title = `YouTube 影片 (${directVideoId})`;
        let channel = 'YouTube';
        let thumbnail = `https://i.ytimg.com/vi/${directVideoId}/hqdefault.jpg`;

        // 免費、無限制、免金鑰使用 YouTube 官方 oEmbed API 取得正式歌曲名稱與創作者
        try {
          const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${directVideoId}&format=json`;
          const res = await fetch(oembedUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.title) title = data.title;
            if (data.author_name) channel = data.author_name;
            if (data.thumbnail_url) thumbnail = data.thumbnail_url;
          }
        } catch (oembedErr) {
          console.warn('oEmbed 取得影片詳情異常，使用預設值:', oembedErr);
        }

        const directResult: YouTubeResult = {
          id: directVideoId,
          title,
          duration: '直連伴奏',
          channel,
          thumbnail,
        };

        setSearchResults([directResult]);
        loadVideo(directVideoId, title);
        setIsSearching(false);
        return;
      }

      let query = rawQuery;
      if (karaokeMode) {
        const lower = rawQuery.toLowerCase();
        const hasKey = lower.includes('伴奏') || lower.includes('karaoke') || lower.includes('instrumental') || lower.includes('off vocal') || lower.includes('純音樂');
        if (!hasKey) {
          query = `${rawQuery} 伴奏`;
        }
      }

      if (window.electronAPI) {
        const results = await window.electronAPI.searchYouTube(query);
        if (Array.isArray(results)) {
          setSearchResults(results);
        }
      } else {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        });
        if (response.ok) {
          const html = await response.text();
          const match = html.match(/var ytInitialData\s*=\s*({.+?});<\/script>/);
          if (match) {
            const data = JSON.parse(match[1]);
            const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
              ?.sectionListRenderer?.contents || [];
            const results: YouTubeResult[] = [];
            for (const sec of contents) {
              const items = sec?.itemSectionRenderer?.contents || [];
              for (const it of items) {
                if (it.videoRenderer) {
                  const vr = it.videoRenderer;
                  results.push({
                    id: vr.videoId,
                    title: vr.title?.runs?.[0]?.text || '',
                    duration: vr.lengthText?.simpleText || '',
                    channel: vr.ownerText?.runs?.[0]?.text || '',
                    thumbnail: vr.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`,
                  });
                }
              }
            }
            setSearchResults(results.slice(0, 15));
          }
        }
      }
    } catch (e) {
      console.error('YouTube 搜尋失敗:', e);
    } finally {
      setIsSearching(false);
    }
  }, [karaokeMode, loadVideo]);

  const startSyncTimer = useCallback((onTimeUpdate: (time: number) => void) => {
    onTimeUpdateRef.current = onTimeUpdate;
    if (syncTimerRef.current) cancelAnimationFrame(syncTimerRef.current);

    let lastTime = 0;
    const fpsInterval = 1000 / 25;

    const sync = (timestamp: number) => {
      if (timestamp - lastTime >= fpsInterval) {
        lastTime = timestamp;
        if (player && typeof player.getCurrentTime === 'function') {
          const time = player.getCurrentTime();
          onTimeUpdateRef.current?.(time);

          const dur = player.getDuration();
          if (dur && dur > 0 && Math.abs(dur - duration) > 0.5) {
            setDuration(dur);
            onDurationChangeRef.current?.(dur);
          }
        }
      }
      syncTimerRef.current = requestAnimationFrame(sync);
    };

    syncTimerRef.current = requestAnimationFrame(sync);
  }, [player, duration]);

  const stopSyncTimer = useCallback(() => {
    if (syncTimerRef.current) {
      cancelAnimationFrame(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    player?.playVideo?.();
  }, [player]);

  const pause = useCallback(() => {
    player?.pauseVideo?.();
  }, [player]);

  const seekTo = useCallback((time: number) => {
    player?.seekTo?.(time, true);
  }, [player]);

  const setVolume = useCallback((vol: number) => {
    player?.setVolume?.(vol);
  }, [player]);

  useEffect(() => {
    initApi();
    return () => {
      stopSyncTimer();
      player?.destroy?.();
    };
  }, [initApi, stopSyncTimer, player]);

  return {
    isReady,
    isPlaying,
    currentVideoId,
    currentTitle,
    duration,
    searchResults,
    isSearching,
    karaokeMode,
    setKaraokeMode,
    containerRef,
    loadVideo,
    search,
    startSyncTimer,
    stopSyncTimer,
    play,
    pause,
    seekTo,
    setVolume,
  };
}
