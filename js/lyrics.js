/**
 * SingStudio - 動態歌詞同步與免費歌詞庫引擎 (Lyrics Engine)
 * 
 * 特性：
 * 1. 嚴格引用 Utils 工具函數，杜絕重複代碼。
 * 2. 整合 LRCLIB 免費開放歌詞 API（無 API Key、社群同步時間軸）。
 * 3. 60 FPS 平滑視差捲動與目前歌詞高亮居中放大。
 * 4. 支援歌詞時間軸整體平移校準 (Offset)，支援以當前播放點設定為起始錨點。
 * 5. 點擊歌詞直接跳轉播放進度。
 */

class LyricsEngine {
  constructor() {
    this.lyrics = [];
    this.currentIndex = -1;
    this.containerEl = null;
    this.lineElements = [];
    this.rawLrcText = '';
    this.offsetSec = 0; // 歌詞時間偏移量 (秒)
    this.selectedLineIndex = -1; // 使用者主動選取之歌詞句索引 (用於精準對齊)
    this.onLineContextMenuCallback = null;
  }

  init(containerElement) {
    this.containerEl = containerElement;
    this.loadDemoLyrics();
  }

  loadDemoLyrics() {
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

    this.parseLRC(demoLrc);
  }

  parseLRC(lrcText) {
    this.rawLrcText = lrcText;
    this.lyrics = [];
    this.currentIndex = -1;
    // 保留目前使用者設定的 offsetSec (若未初始化則為 0)
    if (typeof this.offsetSec !== 'number') this.offsetSec = 0;

    if (!lrcText || typeof lrcText !== 'string') {
      this.render();
      return;
    }

    const lines = lrcText.split(/\r?\n/);
    const timeReg = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('[ti:') || trimmed.startsWith('[ar:') || trimmed.startsWith('[al:')) continue;

      let match;
      let hasTime = false;
      const text = trimmed.replace(timeReg, '').trim();

      timeReg.lastIndex = 0;
      while ((match = timeReg.exec(trimmed)) !== null) {
        hasTime = true;
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = match[3] ? parseInt(match[3].padEnd(3, '0').substring(0, 3), 10) : 0;
        const totalSeconds = min * 60 + sec + ms / 1000;

        this.lyrics.push({
          time: totalSeconds,
          text: text || '♪ ♪ ♪'
        });
      }

      if (!hasTime && text) {
        this.lyrics.push({
          time: this.lyrics.length > 0 ? this.lyrics[this.lyrics.length - 1].time + 4 : 0,
          text: text
        });
      }
    }

    this.lyrics.sort((a, b) => a.time - b.time);
    this.lyrics.forEach((item, idx) => item.index = idx);
    this.render();
  }

  /**
   * 取得計算偏移量後的有效時間
   */
  getEffectiveTime(item) {
    return Math.max(0, item.time + this.offsetSec);
  }

  /**
   * 調整整體歌詞位移 (Offset)
   */
  setOffset(offsetSec) {
    this.offsetSec = Math.round(offsetSec * 10) / 10;
    this.updateTimeDisplay();
    return this.offsetSec;
  }

  addOffset(deltaSec) {
    return this.setOffset(this.offsetSec + deltaSec);
  }

  /**
   * 選取特定歌詞行
   */
  selectLine(idx) {
    if (idx < 0 || idx >= this.lyrics.length) {
      this.selectedLineIndex = -1;
    } else {
      this.selectedLineIndex = idx;
    }
    this.lineElements.forEach((el, i) => {
      if (i === this.selectedLineIndex) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
    return this.selectedLineIndex >= 0 ? this.lyrics[this.selectedLineIndex] : null;
  }

  /**
   * 將指定行精確對齊至目標播放時間
   */
  alignLineToTime(lineIdx, targetTime) {
    if (this.lyrics.length === 0) return this.offsetSec;
    const target = (lineIdx >= 0 && lineIdx < this.lyrics.length) ? this.lyrics[lineIdx] : null;
    if (!target) return this.offsetSec;
    const newOffset = targetTime - target.time;
    this.setOffset(newOffset);
    return {
      offsetSec: this.offsetSec,
      line: target,
      targetTime: targetTime
    };
  }

  /**
   * 以目前播放指針時間，設定為選取行（或目前播放行/第一行）之起點
   */
  setAnchorAtCurrentTime(targetTime) {
    if (this.lyrics.length === 0) return this.offsetSec;
    const targetIdx = this.selectedLineIndex >= 0 ? this.selectedLineIndex : (this.currentIndex >= 0 ? this.currentIndex : 0);
    const res = this.alignLineToTime(targetIdx, targetTime);
    return typeof res === 'object' ? res.offsetSec : res;
  }

  updateTimeDisplay() {
    this.lineElements.forEach((el, idx) => {
      const item = this.lyrics[idx];
      if (item) {
        const timeEl = el.querySelector('.lyric-time');
        if (timeEl) {
          timeEl.textContent = Utils.formatDuration(this.getEffectiveTime(item));
        }
      }
    });
  }

  clearLyrics(customHint = '尚未載入同步歌詞。可點擊上方「搜尋同步歌詞 (LRCLIB)」線上搜尋或手動匯入。') {
    this.lyrics = [];
    this.rawLrcText = '';
    this.currentIndex = -1;
    this.selectedLineIndex = -1;
    this.offsetSec = 0;
    this.emptyCustomHint = customHint;
    this.render();
  }

  render() {
    if (!this.containerEl) return;
    this.containerEl.innerHTML = '';
    this.lineElements = [];

    if (this.lyrics.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'lyric-empty';
      empty.innerHTML = `
        <div style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">暫無同步歌詞</div>
        <div style="font-size: 14.5px; color: var(--text-muted); margin-bottom: 14px;">${Utils.escapeHtml(this.emptyCustomHint || '可點擊上方「搜尋同步歌詞」線上獲取或匯入 .lrc')}</div>
        <button id="btnQuickSearchLrc" class="btn btn-sm btn-primary" type="button">立即搜尋此歌曲歌詞</button>
      `;
      const btn = empty.querySelector('#btnQuickSearchLrc');
      if (btn) {
        btn.addEventListener('click', () => {
          const btnSearch = document.getElementById('btnSearchLrc');
          if (btnSearch) btnSearch.click();
        });
      }
      this.containerEl.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();

    this.lyrics.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'lyric-line';
      div.dataset.index = idx;
      div.dataset.time = item.time;
      div.innerHTML = `<span class="lyric-time">${Utils.formatDuration(this.getEffectiveTime(item))}</span><span class="lyric-text">${Utils.escapeHtml(item.text)}</span>`;

      div.addEventListener('click', () => {
        this.selectLine(idx);
        const seekTime = this.getEffectiveTime(item);
        if (window.audioEngine) {
          if (window.audioEngine.isPlayingMix) {
            window.audioEngine.seekMixedPreview(seekTime);
          } else if (!window.audioEngine.isRecording) {
            window.audioEngine.seekBackingOnly(seekTime);
          }
        }
      });

      div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.selectLine(idx);
        if (this.onLineContextMenuCallback) {
          this.onLineContextMenuCallback(e, item, idx);
        }
      });

      this.lineElements.push(div);
      fragment.appendChild(div);
    });

    this.containerEl.appendChild(fragment);
  }

  update(currentTime) {
    if (this.lyrics.length === 0 || !this.containerEl) return;

    let activeIdx = -1;
    for (let i = 0; i < this.lyrics.length; i++) {
      const effectiveTime = this.getEffectiveTime(this.lyrics[i]);
      if (currentTime >= effectiveTime) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== this.currentIndex) {
      if (this.currentIndex >= 0 && this.lineElements[this.currentIndex]) {
        this.lineElements[this.currentIndex].classList.remove('active');
        this.lineElements[this.currentIndex].classList.add('passed');
      }

      this.currentIndex = activeIdx;

      if (this.currentIndex >= 0 && this.lineElements[this.currentIndex]) {
        const activeEl = this.lineElements[this.currentIndex];
        activeEl.classList.add('active');
        activeEl.classList.remove('passed');

        // 使用平滑居中捲動
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  async searchLRCLib(query) {
    if (!query || !query.trim()) return [];

    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query.trim())}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'SingStudio-OpenSource/2.0'
      }
    });
    if (!resp.ok) throw new Error(`歌詞搜尋失敗 (${resp.status})`);
    return await resp.json();
  }

  exportLrcBlob() {
    let content = this.rawLrcText;
    if (!content && this.lyrics.length > 0) {
      content = this.lyrics.map(l => `[${Utils.formatTimeLrc(this.getEffectiveTime(l))}] ${l.text}`).join('\n');
    }
    return new Blob([content], { type: 'text/plain;charset=utf-8' });
  }
}

window.lyricsEngine = new LyricsEngine();
