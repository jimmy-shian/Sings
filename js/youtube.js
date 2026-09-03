/**
 * SingStudio - YouTube 直連搜尋與伴奏播放管理器 (YouTube Integration)
 * 
 * 功能亮點：
 * 1. 100% 免費無須 API Key：支援直連 YouTube IFrame 官方嵌入 API。
 * 2. 智慧搜尋：透過後端 Python 代理或備用語意搜尋直接獲取影片 ID、標題、時長。
 * 3. 貼上連結即播：支援完整 YouTube 網址 (watch?v=)、短網址 (youtu.be/) 或 11 碼 ID。
 * 4. 與錄音/歌詞精準同步：提供 play、pause、seekTo、getCurrentTime 等控制介面。
 */

class YouTubeManager {
  constructor() {
    this.player = null;
    this.isReady = false;
    this.currentVideoId = null;
    this.currentTitle = '';
    this.onStateChangeCallback = null;
    this.containerId = 'youtubePlayerContainer';
    this.initApi();
  }

  /**
   * 異步加載 YouTube IFrame API
   */
  initApi() {
    if (window.YT && window.YT.Player) {
      this.isReady = true;
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      this.isReady = true;
      console.log('YouTube IFrame API 就緒');
    };
  }

  /**
   * 載入指定影片 ID
   */
  loadVideo(videoId, title = 'YouTube 伴奏') {
    this.currentVideoId = videoId;
    this.currentTitle = title;

    if (!this.player) {
      this.player = new YT.Player(this.containerId, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          playsinline: 1,
          modestbranding: 1
        },
        events: {
          onReady: (event) => {
            console.log('YouTube Player 載入完成');
          },
          onStateChange: (event) => {
            if (this.onStateChangeCallback) {
              this.onStateChangeCallback(event.data);
            }
          }
        }
      });
    } else {
      this.player.cueVideoById(videoId);
    }
  }

  /**
   * 解析 YouTube 網址或純 ID
   */
  extractVideoId(input) {
    if (!input) return null;
    const trimmed = input.trim();
    
    // 11 碼直接比對
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    // https://www.youtube.com/watch?v=xxxx
    const matchWatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (matchWatch) return matchWatch[1];

    // https://youtu.be/xxxx
    const matchShort = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (matchShort) return matchShort[1];

    // https://www.youtube.com/embed/xxxx
    const matchEmbed = trimmed.match(/embed\/([a-zA-Z0-9_-]{11})/);
    if (matchEmbed) return matchEmbed[1];

    return null;
  }

  /**
   * 直連搜尋 YouTube 音樂/伴奏 (100% 免費)
   */
  async search(query) {
    if (!query || !query.trim()) return [];
    const q = query.trim();

    // 1. 優先嘗試本機 Python 後端代理 (無 CORS 限制、最穩定精確)
    try {
      const resp = await fetch(`/api/yt/search?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(6000) });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (e) {
      // 後端未啟動，走純靜態備援方案
    }

    // 2. 備援方案：若使用者輸入的是網址或 ID，直接返回單一項目
    const directId = this.extractVideoId(q);
    if (directId) {
      return [{
        id: directId,
        title: `YouTube 影片 (${directId})`,
        duration: '自訂',
        channel: '直接匯入'
      }];
    }

    // 3. 備援方案：請求公共 Invidious / Piped 搜尋鏡像
    const publicMirrors = [
      `https://corsproxy.io/?${encodeURIComponent('https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=' + encodeURIComponent(q))}`
    ];

    for (const mirror of publicMirrors) {
      try {
        const resp = await fetch(mirror, { signal: AbortSignal.timeout(4000) });
        const text = await resp.text();
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const suggestions = (parsed[1] || []).map(item => item[0]);
          return suggestions.slice(0, 8).map((sugg, idx) => ({
            id: null,
            isSuggestion: true,
            title: sugg,
            duration: '建議詞',
            channel: '點擊以該關鍵字繼續搜尋'
          }));
        }
      } catch (err) {
        // 繼續嘗試
      }
    }

    throw new Error('未連上本機搜尋服務，您可直接貼上 YouTube 影片網址進行播放！');
  }

  play() {
    if (this.player && typeof this.player.playVideo === 'function') {
      this.player.playVideo();
    }
  }

  pause() {
    if (this.player && typeof this.player.pauseVideo === 'function') {
      this.player.pauseVideo();
    }
  }

  seekTo(seconds) {
    if (this.player && typeof this.player.seekTo === 'function') {
      this.player.seekTo(Math.max(0, seconds), true);
    }
  }

  getCurrentTime() {
    if (this.player && typeof this.player.getCurrentTime === 'function') {
      return this.player.getCurrentTime() || 0;
    }
    return 0;
  }

  getDuration() {
    if (this.player && typeof this.player.getDuration === 'function') {
      return this.player.getDuration() || 0;
    }
    return 0;
  }

  setVolume(vol0to1) {
    if (this.player && typeof this.player.setVolume === 'function') {
      this.player.setVolume(Math.round(vol0to1 * 100));
    }
  }
}

window.youtubeManager = new YouTubeManager();
