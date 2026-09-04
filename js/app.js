/**
 * SingStudio - 主應用調度器 (Application Coordinator)
 * 遵循 OpenDesign 規範：模組化分離、零重複邏輯、純專業 DAW 音訊操作
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. 快取所有 DOM 元素
  const el = {
    // 頂部導航與音軌摘要
    currentTrackTitle: document.getElementById('currentTrackTitle'),
    currentTrackMeta: document.getElementById('currentTrackMeta'),
    sourceModeBadge: document.getElementById('sourceModeBadge'),
    btnQuickRecord: document.getElementById('btnQuickRecord'),

    // 左欄切換膠囊 (伴奏來源 vs 同步字幕)
    btnTabSource: document.getElementById('btnTabSource'),
    btnTabLyrics: document.getElementById('btnTabLyrics'),
    viewSource: document.getElementById('viewSource'),
    viewLyrics: document.getElementById('viewLyrics'),

    // 伴奏子分頁
    tabLocal: document.getElementById('tabLocal'),
    tabYouTube: document.getElementById('tabYouTube'),
    tabDemo: document.getElementById('tabDemo'),
    paneLocal: document.getElementById('paneLocal'),
    paneYouTube: document.getElementById('paneYouTube'),
    paneDemo: document.getElementById('paneDemo'),

    // 本地伴奏與獨立播放器
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileBackingInput'),
    btnBrowseLocal: document.getElementById('btnBrowseLocal'),
    localTrackPlayerBox: document.getElementById('localTrackPlayerBox'),
    lblLocalFileName: document.getElementById('lblLocalFileName'),
    btnChangeLocalFile: document.getElementById('btnChangeLocalFile'),
    btnPlayBackingOnly: document.getElementById('btnPlayBackingOnly'),
    sliderBackingSeek: document.getElementById('sliderBackingSeek'),
    lblBackingTime: document.getElementById('lblBackingTime'),

    // YouTube 模組
    ytSearchInput: document.getElementById('ytSearchInput'),
    btnYtSearch: document.getElementById('btnYtSearch'),
    ytResults: document.getElementById('ytResults'),
    ytPlayerBox: document.getElementById('ytPlayerBox'),

    // 示範伴奏
    btnLoadDemo: document.getElementById('btnLoadDemo'),

    // 動態歌詞
    lyricsBox: document.getElementById('lyricsBox'),
    btnImportLrc: document.getElementById('btnImportLrc'),
    fileLrcInput: document.getElementById('fileLrcInput'),
    btnExportLrc: document.getElementById('btnExportLrc'),
    btnSearchLrc: document.getElementById('btnSearchLrc'),

    // 主錄音時間軸畫布與控制項
    mainTimelineCanvas: document.getElementById('mainTimelineCanvas'),
    lblZoomLevel: document.getElementById('lblZoomLevel'),
    btnZoomIn: document.getElementById('btnZoomIn'),
    btnZoomOut: document.getElementById('btnZoomOut'),
    btnZoomReset: document.getElementById('btnZoomReset'),
    btnTimelinePanLeft: document.getElementById('btnTimelinePanLeft'),
    btnTimelinePanRight: document.getElementById('btnTimelinePanRight'),

    // 歌詞時間位移校準
    btnLyricsOffsetMinus: document.getElementById('btnLyricsOffsetMinus'),
    lblLyricsOffset: document.getElementById('lblLyricsOffset'),
    btnLyricsOffsetPlus: document.getElementById('btnLyricsOffsetPlus'),
    btnLyricsOffsetReset: document.getElementById('btnLyricsOffsetReset'),
    btnLyricsSetAnchor: document.getElementById('btnLyricsSetAnchor'),

    // Takes 分段管理
    vocalTakesContainer: document.getElementById('vocalTakesContainer'),
    lblTakesCount: document.getElementById('lblTakesCount'),
    vocalTakesList: document.getElementById('vocalTakesList'),

    // 音訊電平儀表 (無評分)
    lblRecordTime: document.getElementById('lblRecordTime'),
    vuLevelBar: document.getElementById('vuLevelBar'),
    lblInputDb: document.getElementById('lblInputDb'),
    lblTrackStatus: document.getElementById('lblTrackStatus'),

    // YouTube 伴奏優先推薦開關 (方案 1)
    chkKaraokeMode: document.getElementById('chkKaraokeMode'),

    // 即時伴奏音量調節、去人聲與耳返監聽
    sliderLiveBackingVol: document.getElementById('sliderLiveBackingVol'),
    lblLiveBackingVol: document.getElementById('lblLiveBackingVol'),
    btnToggleVocalCancel: document.getElementById('btnToggleVocalCancel'),
    lblVocalCancel: document.getElementById('lblVocalCancel'),
    btnToggleMonitor: document.getElementById('btnToggleMonitor'),
    lblMonitorStatus: document.getElementById('lblMonitorStatus'),
    boxMonitorVol: document.getElementById('boxMonitorVol'),
    sliderLiveMonitorVol: document.getElementById('sliderLiveMonitorVol'),
    lblLiveMonitorVol: document.getElementById('lblLiveMonitorVol'),
    sliderMicSensitivity: document.getElementById('sliderMicSensitivity'),
    lblMicSensitivity: document.getElementById('lblMicSensitivity'),
    chkNoiseFilter: document.getElementById('chkNoiseFilter'),

    // 錄音操作按鈕 (支援接續錄製)
    btnRecordStart: document.getElementById('btnRecordStart'),
    btnRecordPause: document.getElementById('btnRecordPause'),
    btnRecordResume: document.getElementById('btnRecordResume'),
    btnRecordFinish: document.getElementById('btnRecordFinish'),
    btnRecordReset: document.getElementById('btnRecordReset'),

    // 獨立後製混音專屬視窗 (完全分離)
    reviewWindowModal: document.getElementById('reviewWindowModal'),
    btnCloseReviewModal: document.getElementById('btnCloseReviewModal'),
    reviewTimelineCanvas: document.getElementById('reviewTimelineCanvas'),
    lblReviewZoom: document.getElementById('lblReviewZoom'),
    btnReviewZoomIn: document.getElementById('btnReviewZoomIn'),
    btnReviewZoomOut: document.getElementById('btnReviewZoomOut'),
    btnTogglePlayPreview: document.getElementById('btnTogglePlayPreview'),
    lblPlayPreview: document.getElementById('lblPlayPreview'),
    iconPlayPreview: document.getElementById('iconPlayPreview'),
    btnResetPreview: document.getElementById('btnResetPreview'),
    sliderSyncSeek: document.getElementById('sliderSyncSeek'),
    lblSyncTime: document.getElementById('lblSyncTime'),

    // 混音滑桿與靜音
    sliderBacking: document.getElementById('sliderBacking'),
    sliderVocal: document.getElementById('sliderVocal'),
    sliderLatency: document.getElementById('sliderLatency'),
    valBacking: document.getElementById('valBacking'),
    valVocal: document.getElementById('valVocal'),
    valLatency: document.getElementById('valLatency'),
    checkReverb: document.getElementById('checkReverb'),
    btnMuteBacking: document.getElementById('btnMuteBacking'),
    btnMuteVocal: document.getElementById('btnMuteVocal'),
    btnSaveLocal: document.getElementById('btnSaveLocal'),
    btnExportWav: document.getElementById('btnExportWav'),

    // 作品庫表格
    libraryBody: document.getElementById('libraryBody'),

    // LRCLIB Modal
    modalLrc: document.getElementById('modalLrc'),
    btnCloseLrcModal: document.getElementById('btnCloseLrcModal'),
    lrcSearchQuery: document.getElementById('lrcSearchQuery'),
    btnDoLrcSearch: document.getElementById('btnDoLrcSearch'),
    lrcResultsList: document.getElementById('lrcResultsList'),

    // 時間軸右鍵選單 (Context Menu)
    timelineContextMenu: document.getElementById('timelineContextMenu'),
    ctxMenuHeader: document.getElementById('ctxMenuHeader'),
    ctxPlayFromHere: document.getElementById('ctxPlayFromHere'),
    ctxPunchInHere: document.getElementById('ctxPunchInHere'),
    ctxAlignLyric: document.getElementById('ctxAlignLyric'),
    ctxTakeGroup: document.getElementById('ctxTakeGroup'),
    ctxEmptyGroup: document.getElementById('ctxEmptyGroup'),
    ctxPlayTake: document.getElementById('ctxPlayTake'),
    lblCtxPlayTake: document.getElementById('lblCtxPlayTake'),
    ctxReRecordTake: document.getElementById('ctxReRecordTake'),
    lblCtxReRecordTake: document.getElementById('lblCtxReRecordTake'),
    ctxDeleteTake: document.getElementById('ctxDeleteTake'),
    lblCtxDeleteTake: document.getElementById('lblCtxDeleteTake'),
    ctxZoomIn: document.getElementById('ctxZoomIn'),
    ctxZoomOut: document.getElementById('ctxZoomOut'),
    ctxZoomReset: document.getElementById('ctxZoomReset')
  };

  let recordLoopId = null;
  let backingSoloLoopId = null;
  let reviewSyncLoopId = null;

  // 2. 實例化兩個獨立的時間軸 (主錄音時間軸 + 獨立後製混音時間軸)
  const mainTimeline = new AudioTimeline({
    canvas: el.mainTimelineCanvas,
    duration: 60,
    onSeek: (targetTime) => {
      if (audioEngine.isRecording) return; // 正在錄音時不任意跳躍

      if (audioEngine.isBackingSoloPlaying) {
        audioEngine.seekBackingOnly(targetTime);
      }
      lyricsEngine.update(targetTime);
      updateRecordTimeDisplay(targetTime);
    },
    onZoomChange: (zoom) => {
      el.lblZoomLevel.textContent = `${zoom.toFixed(1)}x`;
    },
    onContextMenu: (e, info) => {
      showTimelineContextMenu(e, info);
    }
  });

  const reviewTimeline = new AudioTimeline({
    canvas: el.reviewTimelineCanvas,
    duration: 60,
    onSeek: (targetTime) => {
      audioEngine.seekMixedPreview(targetTime);
      const totalDur = audioEngine.getReviewDuration();
      el.sliderSyncSeek.value = (targetTime / totalDur) * 1000;
      el.lblSyncTime.textContent = `${Utils.formatDuration(targetTime)} / ${Utils.formatDuration(totalDur)}`;
      lyricsEngine.update(targetTime);
    },
    onZoomChange: (zoom) => {
      el.lblReviewZoom.textContent = `${zoom.toFixed(1)}x`;
    }
  });

  // 初始化歌詞引擎
  lyricsEngine.init(el.lyricsBox);
  refreshLibraryTable();

  // ==========================================================================
  // 左欄切換膠囊：伴奏來源 vs 同步字幕 (LRC)
  // ==========================================================================
  function switchLeftTab(tab) {
    if (tab === 'source') {
      el.btnTabSource.classList.add('active');
      el.btnTabLyrics.classList.remove('active');
      el.viewSource.style.display = 'flex';
      el.viewLyrics.style.display = 'none';
    } else {
      el.btnTabLyrics.classList.add('active');
      el.btnTabSource.classList.remove('active');
      el.viewLyrics.style.display = 'flex';
      el.viewSource.style.display = 'none';
    }
  }

  el.btnTabSource.addEventListener('click', () => switchLeftTab('source'));
  el.btnTabLyrics.addEventListener('click', () => switchLeftTab('lyrics'));

  // 快速錄製按鈕：自動切換到歌詞檢視並啟動錄音
  el.btnQuickRecord.addEventListener('click', () => {
    switchLeftTab('lyrics');
    el.btnRecordStart.click();
  });

  // ==========================================================================
  // 時間軸滾輪縮放與按鈕控制
  // ==========================================================================
  el.btnZoomIn.addEventListener('click', () => {
    mainTimeline.setZoom(mainTimeline.zoomLevel * 1.3);
  });
  el.btnZoomOut.addEventListener('click', () => {
    mainTimeline.setZoom(mainTimeline.zoomLevel / 1.3);
  });
  el.btnZoomReset.addEventListener('click', () => {
    mainTimeline.resetZoom();
  });

  el.btnReviewZoomIn.addEventListener('click', () => {
    reviewTimeline.setZoom(reviewTimeline.zoomLevel * 1.3);
  });
  el.btnReviewZoomOut.addEventListener('click', () => {
    reviewTimeline.setZoom(reviewTimeline.zoomLevel / 1.3);
  });

  // ==========================================================================
  // 伴奏模式次分頁切換 (本地 / YouTube / 示範)
  // ==========================================================================
  function switchBackingPane(mode) {
    [el.tabLocal, el.tabYouTube, el.tabDemo].forEach(t => t.classList.remove('active'));
    [el.paneLocal, el.paneYouTube, el.paneDemo].forEach(p => p.classList.remove('active'));

    audioEngine.pauseBackingOnly();
    updateBackingSoloBtn(false);

    if (mode === 'local') {
      el.tabLocal.classList.add('active');
      el.paneLocal.classList.add('active');
      audioEngine.sourceMode = 'local';
      el.sourceModeBadge.textContent = '[本地音訊]';
    } else if (mode === 'youtube') {
      el.tabYouTube.classList.add('active');
      el.paneYouTube.classList.add('active');
      audioEngine.sourceMode = 'youtube';
      el.sourceModeBadge.textContent = '[YouTube 直連]';
    } else {
      el.tabDemo.classList.add('active');
      el.paneDemo.classList.add('active');
      audioEngine.sourceMode = 'demo';
      el.sourceModeBadge.textContent = '[內建示範]';
    }
  }

  el.tabLocal.addEventListener('click', () => switchBackingPane('local'));
  el.tabYouTube.addEventListener('click', () => switchBackingPane('youtube'));
  el.tabDemo.addEventListener('click', () => switchBackingPane('demo'));

  // ==========================================================================
  // 本地伴奏載入與獨立播放器 (時間軸 60FPS 平滑連動)
  // ==========================================================================
  el.btnBrowseLocal.addEventListener('click', () => el.fileInput.click());
  el.btnChangeLocalFile.addEventListener('click', () => el.fileInput.click());
  el.dropzone.addEventListener('click', () => el.fileInput.click());

  el.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.dropzone.classList.add('dragover');
  });
  el.dropzone.addEventListener('dragleave', () => el.dropzone.classList.remove('dragover'));
  el.dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    el.dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLocalFile(e.dataTransfer.files[0]);
    }
  });

  el.fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleLocalFile(e.target.files[0]);
    }
  });

  async function handleLocalFile(file) {
    if (!file) return;
    try {
      el.currentTrackTitle.textContent = `載入中: ${file.name}...`;
      const dur = await audioEngine.loadBackingTrack(file);

      el.currentTrackTitle.textContent = file.name;
      el.currentTrackMeta.textContent = `[本機音訊] ${Utils.formatBytes(file.size)} · ${Utils.formatDuration(dur)}`;
      el.ytPlayerBox.style.display = 'none';

      // 啟用伴奏專屬播放控制
      el.localTrackPlayerBox.style.display = 'block';
      el.lblLocalFileName.textContent = file.name;
      el.lblBackingTime.textContent = `00:00 / ${Utils.formatDuration(dur)}`;
      el.sliderBackingSeek.value = 0;
      updateBackingSoloBtn(false);

      // 同步載入至主時間軸
      mainTimeline.setDuration(dur);
      mainTimeline.setBackingPeaks(audioEngine.waveformPeaks, dur);
      mainTimeline.updatePlayhead(0, false);
      updateRecordTimeDisplay(0);

      // 清空舊示範歌詞，引導搜尋
      lyricsEngine.clearLyrics(`已載入【${file.name}】。點擊上方「搜尋同步歌詞」或匯入 .lrc。`);
    } catch (err) {
      UI.alert('檔案載入失敗: ' + err.message, '載入失敗');
      el.currentTrackTitle.textContent = '載入失敗';
    }
  }

  function updateBackingSoloBtn(isPlaying) {
    if (isPlaying) {
      el.btnPlayBackingOnly.textContent = '❚❚ 暫停伴奏';
      el.btnPlayBackingOnly.classList.remove('btn-primary');
    } else {
      el.btnPlayBackingOnly.textContent = '▶ 試聽伴奏';
      el.btnPlayBackingOnly.classList.add('btn-primary');
    }
  }

  // 伴奏單獨播放：時間軸指針與波形隨 60FPS 平滑推移
  el.btnPlayBackingOnly.addEventListener('click', () => {
    if (audioEngine.sourceMode === 'youtube' && window.youtubeManager) {
      if (window.youtubeManager.isPlaying) {
        window.youtubeManager.pause();
        updateBackingSoloBtn(false);
      } else {
        window.youtubeManager.play();
        updateBackingSoloBtn(true);
      }
      return;
    }

    const isPlaying = audioEngine.toggleBackingOnly();
    updateBackingSoloBtn(isPlaying);

    if (isPlaying) {
      function backingSoloLoop() {
        if (!audioEngine.isBackingSoloPlaying) return;

        const cur = audioEngine.getCurrentTime();
        const dur = audioEngine.backingDuration || 60;

        el.sliderBackingSeek.value = (cur / dur) * 1000;
        el.lblBackingTime.textContent = `${Utils.formatDuration(cur)} / ${Utils.formatDuration(dur)}`;

        // 同步驅動時間軸與歌詞
        mainTimeline.updatePlayhead(cur, true);
        lyricsEngine.update(cur);
        updateRecordTimeDisplay(cur);

        if (cur >= dur) {
          audioEngine.pauseBackingOnly();
          updateBackingSoloBtn(false);
          return;
        }

        backingSoloLoopId = requestAnimationFrame(backingSoloLoop);
      }
      backingSoloLoop();
    } else {
      if (backingSoloLoopId) cancelAnimationFrame(backingSoloLoopId);
    }
  });

  el.sliderBackingSeek.addEventListener('input', (e) => {
    const ratio = parseFloat(e.target.value) / 1000;
    const dur = audioEngine.backingDuration || 60;
    const target = ratio * dur;
    if (audioEngine.sourceMode === 'youtube' && window.youtubeManager) {
      window.youtubeManager.seekTo(target);
    } else {
      audioEngine.seekBackingOnly(target);
    }
    el.lblBackingTime.textContent = `${Utils.formatDuration(target)} / ${Utils.formatDuration(dur)}`;
    mainTimeline.updatePlayhead(target, audioEngine.isBackingSoloPlaying || (window.youtubeManager && window.youtubeManager.isPlaying));
    lyricsEngine.update(target);
    updateRecordTimeDisplay(target);
  });

  // ==========================================================================
  // 示範伴奏合成
  // ==========================================================================
  el.btnLoadDemo.addEventListener('click', async () => {
    try {
      el.btnLoadDemo.textContent = '合成中...';
      const dur = await audioEngine.generateDemoBackingTrack();
      lyricsEngine.loadDemoLyrics();

      el.currentTrackTitle.textContent = '卡農之歌 (內建高音質和弦示範)';
      el.currentTrackMeta.textContent = '[內建音訊] 56秒 卡農和弦進行';
      el.ytPlayerBox.style.display = 'none';
      audioEngine.sourceMode = 'demo';
      el.btnLoadDemo.textContent = '載入示範伴奏';

      mainTimeline.setDuration(dur);
      mainTimeline.setBackingPeaks(audioEngine.waveformPeaks, dur);
      mainTimeline.updatePlayhead(0, false);
      updateRecordTimeDisplay(0);
    } catch (err) {
      UI.alert('合成失敗: ' + err.message, '合成失敗');
      el.btnLoadDemo.textContent = '載入示範伴奏';
    }
  });

  // ==========================================================================
  // YouTube 直連搜尋
  // ==========================================================================
  async function performYouTubeSearch() {
    const rawQuery = el.ytSearchInput.value.trim();
    if (!rawQuery) return;

    const directId = youtubeManager.extractVideoId(rawQuery);
    if (directId) {
      selectYouTubeVideo(directId, `YouTube 影片 (${directId})`);
      return;
    }

    // 方案 1: 伴奏優先 (Karaoke Mode) 智慧過濾 (預設開啟，可切換)
    const isKaraokeMode = el.chkKaraokeMode ? el.chkKaraokeMode.checked : true;
    let query = rawQuery;
    if (isKaraokeMode) {
      const lower = rawQuery.toLowerCase();
      const hasKey = lower.includes('伴奏') || lower.includes('karaoke') || lower.includes('instrumental') || lower.includes('off vocal') || lower.includes('純音樂');
      if (!hasKey) {
        query = `${rawQuery} 伴奏`;
        UI.toast(`已啟用伴奏優先推薦搜尋:【${query}】`, 'info', 2200);
      }
    }

    el.ytResults.innerHTML = '<div style="padding:16px;color:var(--text-muted);text-align:center;">搜尋中...</div>';

    try {
      const results = await youtubeManager.search(query);
      el.ytResults.innerHTML = '';

      if (!results || results.length === 0) {
        el.ytResults.innerHTML = '<div style="padding:16px;color:var(--text-muted);text-align:center;">未找到影片，請嘗試簡化關鍵字或直接貼上網址</div>';
        return;
      }

      results.forEach(item => {
        const div = document.createElement('div');
        div.className = 'yt-result-item';
        const isBacking = item.title.includes('伴奏') || item.title.toLowerCase().includes('karaoke') || item.title.toLowerCase().includes('instrumental');
        const backingBadge = isBacking ? '<span class="karaoke-badge" style="font-size:11px;margin-left:6px;padding:1px 5px;">純伴奏</span>' : '';

        div.innerHTML = `
          <div>
            <div class="yt-item-title">${Utils.escapeHtml(item.title)}${backingBadge}</div>
            <div class="yt-item-sub">${Utils.escapeHtml(item.channel)} · ${item.duration}</div>
          </div>
          <button class="btn btn-sm btn-primary">選擇</button>
        `;

        div.querySelector('button').addEventListener('click', () => {
          if (item.isSuggestion) {
            el.ytSearchInput.value = item.title;
            performYouTubeSearch();
          } else {
            selectYouTubeVideo(item.id, item.title);
          }
        });

        el.ytResults.appendChild(div);
      });
    } catch (err) {
      el.ytResults.innerHTML = `<div style="padding:16px;color:var(--danger);text-align:center;">${err.message}</div>`;
    }
  }

  function selectYouTubeVideo(videoId, title) {
    youtubeManager.loadVideo(videoId, title);
    audioEngine.sourceMode = 'youtube';
    el.ytPlayerBox.style.display = 'block';
    el.currentTrackTitle.textContent = title;
    el.currentTrackMeta.textContent = `[YouTube 直連] ID: ${videoId}`;

    // 顯示伴奏控制列，供使用者在 YouTube 模式下亦可使用播放/跳轉滑桿
    el.localTrackPlayerBox.style.display = 'block';
    el.lblLocalFileName.textContent = title;
    el.lblBackingTime.textContent = '00:00 / 載入中...';
    el.sliderBackingSeek.value = 0;
    updateBackingSoloBtn(false);

    // YouTube 取得真實時長時自動同步
    youtubeManager.onDurationChangeCallback = (dur) => {
      if (dur > 0) {
        audioEngine.backingDuration = dur;
        mainTimeline.setDuration(dur);
        reviewTimeline.setDuration(dur);
        el.lblBackingTime.textContent = `00:00 / ${Utils.formatDuration(dur)}`;
        updateRecordTimeDisplay(mainTimeline.currentTime);
      }
    };

    // YouTube 播放時 25 FPS 精準同步驅動時間軸與歌詞
    youtubeManager.onTimeUpdateCallback = (curTime, isPlaying, dur) => {
      if (dur > 0 && Math.abs(dur - (audioEngine.backingDuration || 0)) > 1.0) {
        audioEngine.backingDuration = dur;
        mainTimeline.setDuration(dur);
        reviewTimeline.setDuration(dur);
      }
      updateBackingSoloBtn(isPlaying);
      if (!audioEngine.isRecording) {
        mainTimeline.updatePlayhead(curTime, isPlaying);
        lyricsEngine.update(curTime);
        updateRecordTimeDisplay(curTime);
        const totalDur = dur || audioEngine.backingDuration || 60;
        if (totalDur > 0) {
          el.sliderBackingSeek.value = (curTime / totalDur) * 1000;
          el.lblBackingTime.textContent = `${Utils.formatDuration(curTime)} / ${Utils.formatDuration(totalDur)}`;
        }
      }
    };

    lyricsEngine.clearLyrics(`已選擇【${title}】。點擊上方「搜尋同步歌詞」或匯入 .lrc。`);
  }

  el.btnYtSearch.addEventListener('click', performYouTubeSearch);
  el.ytSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performYouTubeSearch();
  });

  // ==========================================================================
  // 動態歌詞與 LRCLIB 整合
  // ==========================================================================
  el.btnImportLrc.addEventListener('click', () => el.fileLrcInput.click());
  el.fileLrcInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      lyricsEngine.parseLRC(evt.target.result);
    };
    reader.readAsText(file);
  });

  el.btnExportLrc.addEventListener('click', () => {
    const blob = lyricsEngine.exportLrcBlob();
    Utils.downloadBlob(blob, `${el.currentTrackTitle.textContent.trim() || 'lyrics'}.lrc`);
  });

  el.btnSearchLrc.addEventListener('click', () => {
    el.modalLrc.classList.add('open');
    el.lrcSearchQuery.value = el.currentTrackTitle.textContent
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/【.*?】/g, '')
      .replace(/\.[^/.]+$/, "")
      .trim();
  });

  el.btnCloseLrcModal.addEventListener('click', () => el.modalLrc.classList.remove('open'));

  el.btnDoLrcSearch.addEventListener('click', async () => {
    const q = el.lrcSearchQuery.value.trim();
    if (!q) return;

    el.lrcResultsList.innerHTML = '<div style="padding:16px;color:var(--text-muted);text-align:center;">查詢 LRCLIB 開源庫...</div>';

    try {
      const list = await lyricsEngine.searchLRCLib(q);
      el.lrcResultsList.innerHTML = '';

      if (!list || list.length === 0) {
        el.lrcResultsList.innerHTML = '<div style="padding:16px;color:var(--text-muted);text-align:center;">查無歌詞，請嘗試簡化關鍵字</div>';
        return;
      }

      list.forEach(song => {
        const item = document.createElement('div');
        item.className = 'yt-result-item';
        item.innerHTML = `
          <div>
            <div class="yt-item-title">${Utils.escapeHtml(song.trackName)}</div>
            <div class="yt-item-sub">${Utils.escapeHtml(song.artistName)} · ${song.syncedLyrics ? '[同步時間軸]' : '[純文字]'}</div>
          </div>
          <button class="btn btn-sm btn-primary">套用</button>
        `;

        item.querySelector('button').addEventListener('click', () => {
          lyricsEngine.parseLRC(song.syncedLyrics || song.plainLyrics || '');
          el.modalLrc.classList.remove('open');
        });

        el.lrcResultsList.appendChild(item);
      });
    } catch (err) {
      el.lrcResultsList.innerHTML = `<div style="padding:16px;color:var(--danger);text-align:center;">${err.message}</div>`;
    }
  });

  // ==========================================================================
  // 錄製流程：開始 / 暫停 / 接續錄製 (Punch-in) / 完成進入後製
  // ==========================================================================

  function updateRecordTimeDisplay(curSec) {
    const totalSec = audioEngine.backingDuration || 60;
    el.lblRecordTime.textContent = `${Utils.formatDuration(curSec)} / ${Utils.formatDuration(totalSec)}`;
  }

  function startLiveRecordLoop() {
    function loop() {
      if (!audioEngine.isRecording) return;

      const curTime = audioEngine.getCurrentTime();

      // 檢查限時重錄：達目標時長自動停止，保護後續片段
      if (audioEngine.punchInEndLimit && curTime >= audioEngine.punchInEndLimit) {
        el.btnRecordPause.click();
        return;
      }

      const audioData = audioEngine.getLiveAudioData();

      // 1. 更新真實音訊電平表 (VU Meter) 與 dB
      const levelPercent = Math.min(100, Math.max(0, (audioData.peakDb + 60) * 1.66));
      el.vuLevelBar.style.width = `${levelPercent}%`;
      el.lblInputDb.textContent = `${audioData.peakDb.toFixed(0)} dB`;

      // 2. 更新時間顯示
      updateRecordTimeDisplay(curTime);

      // 3. 傳入即時人聲時域振幅至時間軸繪製
      mainTimeline.addLiveVocalWave(curTime, audioData.rms);
      mainTimeline.updatePlayhead(curTime, true);

      // 4. 同步滾動字幕
      lyricsEngine.update(curTime);

      recordLoopId = requestAnimationFrame(loop);
    }
    recordLoopId = requestAnimationFrame(loop);
  }

  // 開始全新錄製
  el.btnRecordStart.addEventListener('click', async () => {
    try {
      audioEngine.pauseBackingOnly();
      updateBackingSoloBtn(false);

      await audioEngine.startSinging(0);
      mainTimeline.clearLiveVocalWave();
      mainTimeline.setVocalTakes([]);

      // 切換按鈕狀態
      el.btnRecordStart.style.display = 'none';
      el.btnRecordPause.style.display = 'inline-flex';
      el.btnRecordResume.style.display = 'none';
      el.btnRecordFinish.style.display = 'none';
      el.btnRecordReset.style.display = 'none';
      el.lblTrackStatus.textContent = '[錄音進行中 · REC]';
      el.lblTrackStatus.style.color = 'var(--danger)';

      startLiveRecordLoop();
    } catch (err) {
      UI.alert(err.message || '麥克風啟動失敗，請確認已授予麥克風權限', '麥克風異常');
    }
  });

  // 暫停錄音 (寫入磁碟 temp_ 暫存，保留當前 Takes)
  el.btnRecordPause.addEventListener('click', async () => {
    if (recordLoopId) cancelAnimationFrame(recordLoopId);

    const takes = await audioEngine.pauseSinging();
    mainTimeline.clearLiveVocalWave();
    mainTimeline.setVocalTakes(takes);
    renderVocalTakesList();

    // 切換按鈕狀態 (顯示接續錄製與完成按鈕)
    el.btnRecordPause.style.display = 'none';
    el.btnRecordResume.style.display = 'inline-flex';
    el.btnRecordFinish.style.display = 'inline-flex';
    el.btnRecordReset.style.display = 'inline-flex';
    el.lblTrackStatus.textContent = '[錄音已暫停 · PAUSED]';
    el.lblTrackStatus.style.color = 'var(--warning)';

    el.vuLevelBar.style.width = '0%';
    el.lblInputDb.textContent = '-60 dB';
  });

  // 接續錄製 (Punch-in Recording)：從當前時間軸指針處接續錄製
  el.btnRecordResume.addEventListener('click', async () => {
    try {
      const punchInTime = mainTimeline.currentTime;
      await audioEngine.startSinging(punchInTime);

      el.btnRecordResume.style.display = 'none';
      el.btnRecordPause.style.display = 'inline-flex';
      el.btnRecordFinish.style.display = 'none';
      el.btnRecordReset.style.display = 'none';
      el.lblTrackStatus.textContent = `[接續錄製中 · ${Utils.formatDuration(punchInTime)}]`;
      el.lblTrackStatus.style.color = 'var(--danger)';

      startLiveRecordLoop();
    } catch (err) {
      UI.alert(err.message || '接續錄音失敗', '錄音異常');
    }
  });

  // 重新開始錄音
  el.btnRecordReset.addEventListener('click', async () => {
    if (await UI.confirm('確定放棄目前的錄製片段並重新開始嗎？', '放棄錄製')) {
      audioEngine.resetRecording();
      mainTimeline.clearLiveVocalWave();
      mainTimeline.setVocalTakes([]);
      mainTimeline.updatePlayhead(0, false);
      updateRecordTimeDisplay(0);
      renderVocalTakesList();

      el.btnRecordStart.style.display = 'inline-flex';
      el.btnRecordPause.style.display = 'none';
      el.btnRecordResume.style.display = 'none';
      el.btnRecordFinish.style.display = 'none';
      el.btnRecordReset.style.display = 'none';
      el.lblTrackStatus.textContent = '[待機中]';
      el.lblTrackStatus.style.color = '';
      UI.toast('已重置錄音工作區', 'info');
    }
  });

  // ==========================================================================
  // 即時伴奏音量調節與耳機耳返監聽 (Direct Monitoring)
  // ==========================================================================
  if (el.sliderLiveBackingVol) {
    el.sliderLiveBackingVol.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value) / 100;
      audioEngine.setLiveBackingVolume(vol);
      el.lblLiveBackingVol.textContent = `${Math.round(vol * 100)}%`;
    });
  }

  // 方案 2: Web Audio 即時消除人聲 (立體聲差分)
  if (el.btnToggleVocalCancel) {
    el.btnToggleVocalCancel.addEventListener('click', () => {
      const isCancel = audioEngine.toggleVocalCancellation();
      if (isCancel) {
        el.lblVocalCancel.textContent = '🎙️ 消除人聲: 開';
        el.btnToggleVocalCancel.classList.add('active');
        UI.toast('已開啟即時去人聲 (中央人聲差分消除模式)', 'success');
      } else {
        el.lblVocalCancel.textContent = '🎙️ 消除人聲: 關';
        el.btnToggleVocalCancel.classList.remove('active');
        UI.toast('已關閉即時去人聲 (還原原聲伴奏)', 'info');
      }
    });
  }

  if (el.btnToggleMonitor) {
    el.btnToggleMonitor.addEventListener('click', async () => {
      try {
        await audioEngine.initMicrophone();
      } catch (err) {
        UI.alert(err.message, '麥克風存取受限');
        return;
      }

      const next = !audioEngine.isMonitoringEnabled;
      if (next) {
        UI.toast('即時耳返已開啟，請務必配戴耳機，避免喇叭造成聲音回授(嘯叫)！', 'warning', 3500);
      } else {
        UI.toast('已關閉即時耳返', 'info');
      }
      audioEngine.setDirectMonitoring(next);
      updateMonitorUI(next);
    });
  }

  function updateMonitorUI(enabled) {
    if (!el.lblMonitorStatus || !el.btnToggleMonitor) return;
    if (enabled) {
      el.lblMonitorStatus.textContent = '🎧 即時耳返: 開';
      el.btnToggleMonitor.classList.add('active');
      if (el.boxMonitorVol) el.boxMonitorVol.style.display = 'flex';
    } else {
      el.lblMonitorStatus.textContent = '🎧 即時耳返: 關';
      el.btnToggleMonitor.classList.remove('active');
      if (el.boxMonitorVol) el.boxMonitorVol.style.display = 'none';
    }
  }

  if (el.sliderLiveMonitorVol) {
    el.sliderLiveMonitorVol.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value) / 100;
      audioEngine.setMonitorVolume(vol);
      el.lblLiveMonitorVol.textContent = `${Math.round(vol * 100)}%`;
    });
  }

  // 麥克風靈敏度調節
  if (el.sliderMicSensitivity) {
    el.sliderMicSensitivity.addEventListener('input', (e) => {
      const sens = parseFloat(e.target.value) / 100;
      audioEngine.setMicSensitivity(sens);
      el.lblMicSensitivity.textContent = `${Math.round(sens * 100)}%`;
    });
  }

  // 85Hz 環境雜音過濾開關
  if (el.chkNoiseFilter) {
    el.chkNoiseFilter.addEventListener('change', (e) => {
      audioEngine.setNoiseFilter(e.target.checked);
      UI.toast(e.target.checked ? '已開啟 85Hz 環境雜音過濾' : '已關閉環境雜音過濾 (原生動態)', 'info');
    });
  }

  // 完成演唱：開啟獨立後製混音視窗 (完全獨立視窗)
  el.btnRecordFinish.addEventListener('click', async () => {
    if (recordLoopId) cancelAnimationFrame(recordLoopId);

    const result = await audioEngine.stopSinging();

    el.btnRecordStart.style.display = 'inline-flex';
    el.btnRecordPause.style.display = 'none';
    el.btnRecordResume.style.display = 'none';
    el.btnRecordFinish.style.display = 'none';
    el.btnRecordReset.style.display = 'none';
    el.lblTrackStatus.textContent = '[已完成 · READY]';
    el.lblTrackStatus.style.color = 'var(--success)';

    // 初始化並開啟獨立後製混音視窗
    openReviewModal(result);
  });

  // ==========================================================================
  // 獨立後製混音專屬視窗 (完全分離，具備專屬動態時間軸)
  // ==========================================================================

  function openReviewModal(result) {
    const totalDur = audioEngine.getReviewDuration();

    // 優先依照錄製時設定的伴奏音量作為後製混音與導出的預設值
    const defaultBackingPct = Math.round(audioEngine.liveBackingVolume * 100);
    el.sliderBacking.value = defaultBackingPct;
    el.valBacking.textContent = `${defaultBackingPct}%`;
    audioEngine.backingVolume = audioEngine.liveBackingVolume;

    // 載入至後製專屬時間軸
    reviewTimeline.setDuration(totalDur);
    reviewTimeline.setBackingPeaks(audioEngine.waveformPeaks, audioEngine.backingDuration);
    reviewTimeline.setVocalTakes(audioEngine.vocalTakes);
    reviewTimeline.updatePlayhead(0, false);

    // 重置進度條與標籤
    el.sliderSyncSeek.value = 0;
    el.lblSyncTime.textContent = `00:00 / ${Utils.formatDuration(totalDur)}`;

    // 顯示後製視窗
    el.reviewWindowModal.classList.add('open');

    // 自動開始雙軌同步試聽
    audioEngine.playMixedPreview(0);
    updateReviewPlayBtn(true);
    startReviewSyncLoop();
  }

  el.btnCloseReviewModal.addEventListener('click', () => {
    audioEngine.stopMixedPreview();
    stopReviewSyncLoop();
    updateReviewPlayBtn(false);
    el.reviewWindowModal.classList.remove('open');
  });

  function updateReviewPlayBtn(isPlaying) {
    if (isPlaying) {
      el.lblPlayPreview.textContent = '暫停播放';
      el.iconPlayPreview.innerHTML = '<rect x="6" y="4" width="4" height="16" fill="currentColor"></rect><rect x="14" y="4" width="4" height="16" fill="currentColor"></rect>';
      el.btnTogglePlayPreview.classList.add('active');
    } else {
      el.lblPlayPreview.textContent = '播放雙軌混音';
      el.iconPlayPreview.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
      el.btnTogglePlayPreview.classList.remove('active');
    }
  }

  function startReviewSyncLoop() {
    stopReviewSyncLoop();
    function syncLoop() {
      if (audioEngine.isPlayingMix) {
        const cur = audioEngine.mixCurrentTime;
        const dur = audioEngine.getReviewDuration();

        el.sliderSyncSeek.value = (cur / dur) * 1000;
        el.lblSyncTime.textContent = `${Utils.formatDuration(cur)} / ${Utils.formatDuration(dur)}`;

        // 同步驅動後製專屬時間軸指針與歌詞
        reviewTimeline.updatePlayhead(cur, true);
        lyricsEngine.update(cur);

        reviewSyncLoopId = requestAnimationFrame(syncLoop);
      } else {
        updateReviewPlayBtn(false);
      }
    }
    reviewSyncLoopId = requestAnimationFrame(syncLoop);
  }

  function stopReviewSyncLoop() {
    if (reviewSyncLoopId) {
      cancelAnimationFrame(reviewSyncLoopId);
      reviewSyncLoopId = null;
    }
  }

  el.btnTogglePlayPreview.addEventListener('click', async () => {
    const isPlaying = await audioEngine.toggleMixedPreview();
    updateReviewPlayBtn(isPlaying);
    if (isPlaying) {
      startReviewSyncLoop();
    } else {
      stopReviewSyncLoop();
    }
  });

  el.btnResetPreview.addEventListener('click', () => {
    audioEngine.stopMixedPreview();
    stopReviewSyncLoop();
    updateReviewPlayBtn(false);

    const dur = audioEngine.getReviewDuration();
    el.sliderSyncSeek.value = 0;
    el.lblSyncTime.textContent = `00:00 / ${Utils.formatDuration(dur)}`;
    reviewTimeline.updatePlayhead(0, false);
    lyricsEngine.update(0);
  });

  el.sliderSyncSeek.addEventListener('input', (e) => {
    const ratio = parseFloat(e.target.value) / 1000;
    const dur = audioEngine.getReviewDuration();
    const target = ratio * dur;

    audioEngine.seekMixedPreview(target);
    el.lblSyncTime.textContent = `${Utils.formatDuration(target)} / ${Utils.formatDuration(dur)}`;
    reviewTimeline.updatePlayhead(target, audioEngine.isPlayingMix);
    lyricsEngine.update(target);
  });

  // 音量與靜音
  el.sliderBacking.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    audioEngine.backingVolume = val;
    el.valBacking.textContent = `${Math.round(val * 100)}%`;
  });

  el.sliderVocal.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    audioEngine.vocalVolume = val;
    el.valVocal.textContent = `${Math.round(val * 100)}%`;
  });

  el.btnMuteBacking.addEventListener('click', () => {
    audioEngine.backingMuted = !audioEngine.backingMuted;
    el.btnMuteBacking.textContent = audioEngine.backingMuted ? '已靜音' : '靜音';
    el.btnMuteBacking.style.color = audioEngine.backingMuted ? 'var(--danger)' : '';
  });

  el.btnMuteVocal.addEventListener('click', () => {
    audioEngine.vocalMuted = !audioEngine.vocalMuted;
    el.btnMuteVocal.textContent = audioEngine.vocalMuted ? '已靜音' : '靜音';
    el.btnMuteVocal.style.color = audioEngine.vocalMuted ? 'var(--danger)' : '';
  });

  el.sliderLatency.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    audioEngine.setLatencyOffset(val);
    el.valLatency.textContent = `${val > 0 ? '+' : ''}${val} ms`;
  });

  el.checkReverb.addEventListener('change', (e) => {
    audioEngine.reverbEnabled = e.target.checked;
  });

  // 儲存至本地 IndexedDB 作品庫
  el.btnSaveLocal.addEventListener('click', async () => {
    const defaultTitle = el.currentTrackTitle.textContent.replace(/\[.*?\]/g, '').trim() || '我的演唱作品';
    const title = prompt('作品名稱：', defaultTitle);
    if (title !== null && title.trim()) {
      try {
        const fullMeta = {
          title: title.trim(),
          sourceType: audioEngine.sourceMode,
          youtubeId: youtubeManager.currentVideoId,
          duration: audioEngine.getReviewDuration(),
          score: 100,
          rank: 'PRO',
          vocalBlob: audioEngine.vocalTakes.length > 0 ? audioEngine.vocalTakes[0].blob : null,
          backingBlob: audioEngine.currentBackingBlob,
          latencyOffset: audioEngine.latencyOffsetMs,
          lyrics: lyricsEngine.rawLrcText,
          takesCount: audioEngine.vocalTakes.length
        };

        await safeStorage.saveRecording(fullMeta);
        UI.toast('作品已安全寫入本地 IndexedDB 作品庫！', 'success');
        await refreshLibraryTable();
      } catch (err) {
        UI.alert('儲存失敗: ' + err.message, '儲存失敗');
      }
    }
  });

  // 匯出立體聲 WAV
  el.btnExportWav.addEventListener('click', async () => {
    try {
      el.btnExportWav.textContent = '無損渲染中...';
      const blob = await audioEngine.exportMixedWavBlob();
      const trackTitle = el.currentTrackTitle.textContent.replace(/\[.*?\]/g, '').trim() || 'SingStudio';
      Utils.downloadBlob(blob, `${trackTitle}_Mixed_Master.wav`);
      el.btnExportWav.textContent = '匯出立體聲混音 WAV';
      UI.toast('混音母帶已成功生成並開始下載', 'success');
    } catch (err) {
      UI.alert('混音匯出失敗: ' + err.message, '匯出失敗');
      el.btnExportWav.textContent = '匯出立體聲混音 WAV';
    }
  });

  // ==========================================================================
  // 作品庫表格渲染
  // ==========================================================================
  async function refreshLibraryTable() {
    const list = await safeStorage.getAllMeta();
    el.libraryBody.innerHTML = '';

    if (!list || list.length === 0) {
      el.libraryBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">暫無本地作品</td></tr>';
      return;
    }

    list.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="table-title" data-label="作品名稱">${Utils.escapeHtml(item.title)}</td>
        <td data-label="時長">${Utils.formatDuration(item.duration)}</td>
        <td data-label="片段數">${item.takesCount || 1} 段</td>
        <td data-label="檔案大小">${item.sizeFormatted}</td>
        <td data-label="錄製時間">${item.dateString}</td>
        <td data-label="延遲補償">${item.latencyOffset} ms</td>
        <td data-label="操作">
          <div style="display:flex;gap:6px;">
            <button class="btn btn-sm btn-primary btn-play-lib" data-id="${item.id}">試聽後製</button>
            <button class="btn btn-sm btn-del-lib" data-id="${item.id}" style="color:var(--danger);">刪除</button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-play-lib').addEventListener('click', async () => {
        const full = await safeStorage.getById(item.id);
        if (full) {
          if (full.backingBlob) {
            await audioEngine.loadBackingTrack(full.backingBlob);
          }
          if (full.vocalBlob) {
            audioEngine.vocalTakes = [{
              id: 'Take_1',
              startTime: 0,
              duration: full.duration,
              blob: full.vocalBlob,
              url: URL.createObjectURL(full.vocalBlob),
              peaks: null
            }];
          }
          audioEngine.recordedDuration = full.duration;
          audioEngine.latencyOffsetMs = full.latencyOffset || 0;
          if (full.lyrics) {
            lyricsEngine.parseLRC(full.lyrics);
          }
          openReviewModal({});
        }
      });

      tr.querySelector('.btn-del-lib').addEventListener('click', async () => {
        if (await UI.confirm(`確定刪除【${item.title}】並釋放空間嗎？`, '刪除作品')) {
          await safeStorage.deleteRecording(item.id);
          await refreshLibraryTable();
          UI.toast('已成功刪除作品', 'info');
        }
      });

      el.libraryBody.appendChild(tr);
    });
  }

  // ==========================================================================
  // Takes 錄製分段管理與單獨重錄
  // ==========================================================================
  function renderVocalTakesList() {
    if (!el.vocalTakesContainer || !el.vocalTakesList) return;
    const takes = audioEngine.vocalTakes || [];
    if (takes.length === 0) {
      el.vocalTakesContainer.style.display = 'none';
      return;
    }
    el.vocalTakesContainer.style.display = 'block';
    el.lblTakesCount.textContent = `${takes.length} 個片段`;
    el.vocalTakesList.innerHTML = '';

    takes.forEach(take => {
      const row = document.createElement('div');
      row.className = 'takes-row';
      const startFmt = Utils.formatDuration(take.startTime);
      const endFmt = Utils.formatDuration(take.startTime + take.duration);
      row.innerHTML = `
        <div>
          <span class="take-title">${take.id}</span>
          <span class="take-dur">(${startFmt} ~ ${endFmt}, ${take.duration.toFixed(1)}s)</span>
        </div>
        <div class="take-actions">
          <button class="btn btn-sm btn-play-take" title="播放此 Take">▶ 試聽</button>
          <button class="btn btn-sm btn-warning btn-rerecord-take" title="自動限制起訖時長，僅重錄本段">↻ 僅重錄此段</button>
          <button class="btn btn-sm btn-del-take" style="color: var(--danger);" title="刪除此 Take">× 刪除</button>
        </div>
      `;

      row.querySelector('.btn-play-take').addEventListener('click', () => {
        const a = new Audio(take.url);
        a.play();
      });

      row.querySelector('.btn-rerecord-take').addEventListener('click', async () => {
        if (audioEngine.isRecording) return;
        if (await UI.confirm(`確定要重錄【${take.id}】嗎？系統將從 ${startFmt} 開始，並在錄滿 ${take.duration.toFixed(1)} 秒後自動停止，絕不覆蓋別段。`, '僅重錄此段')) {
          mainTimeline.currentTime = take.startTime;
          mainTimeline.updatePlayhead(take.startTime, false);
          await audioEngine.reRecordTake(take.id);
          
          el.btnRecordStart.style.display = 'none';
          el.btnRecordPause.style.display = 'inline-flex';
          el.btnRecordResume.style.display = 'none';
          el.btnRecordFinish.style.display = 'none';
          el.btnRecordReset.style.display = 'none';
          el.lblTrackStatus.textContent = `[僅重錄 ${take.id} · REC]`;
          el.lblTrackStatus.style.color = 'var(--danger)';

          mainTimeline.setVocalTakes(audioEngine.vocalTakes);
          renderVocalTakesList();
          startLiveRecordLoop();
        }
      });

      row.querySelector('.btn-del-take').addEventListener('click', async () => {
        if (await UI.confirm(`確定刪除【${take.id}】嗎？`, '刪除片段')) {
          audioEngine.deleteTake(take.id);
          mainTimeline.setVocalTakes(audioEngine.vocalTakes);
          reviewTimeline.setVocalTakes(audioEngine.vocalTakes);
          renderVocalTakesList();
          UI.toast(`已刪除 ${take.id}`, 'info');
        }
      });

      el.vocalTakesList.appendChild(row);
    });
  }

  // ==========================================================================
  // 時間軸視窗平移控制項 (Pan View)
  // ==========================================================================
  if (el.btnTimelinePanLeft) {
    el.btnTimelinePanLeft.addEventListener('click', () => mainTimeline.panLeft());
  }
  if (el.btnTimelinePanRight) {
    el.btnTimelinePanRight.addEventListener('click', () => mainTimeline.panRight());
  }

  // ==========================================================================
  // 字幕時間軸整體平移校準 (Offset)
  // ==========================================================================
  function updateLyricsOffsetDisplay() {
    const off = lyricsEngine.offsetSec;
    if (el.lblLyricsOffset) {
      el.lblLyricsOffset.textContent = (off >= 0 ? '+' : '') + off.toFixed(1) + 's';
    }
  }

  if (el.btnLyricsOffsetMinus) {
    el.btnLyricsOffsetMinus.addEventListener('click', () => {
      lyricsEngine.addOffset(-0.5);
      updateLyricsOffsetDisplay();
    });
  }
  if (el.btnLyricsOffsetPlus) {
    el.btnLyricsOffsetPlus.addEventListener('click', () => {
      lyricsEngine.addOffset(0.5);
      updateLyricsOffsetDisplay();
    });
  }
  if (el.btnLyricsOffsetReset) {
    el.btnLyricsOffsetReset.addEventListener('click', () => {
      lyricsEngine.setOffset(0);
      updateLyricsOffsetDisplay();
    });
  }
  if (el.btnLyricsSetAnchor) {
    el.btnLyricsSetAnchor.addEventListener('click', () => {
      const cur = audioEngine.getCurrentTime();
      lyricsEngine.setAnchorAtCurrentTime(cur);
      updateLyricsOffsetDisplay();
    });
  }

  // ==========================================================================
  // 電腦端快捷鍵：空白鍵快速播放 / 暫停
  // ==========================================================================
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || (document.activeElement && document.activeElement.isContentEditable)) {
        return;
      }
      e.preventDefault();
      handleSpacebarToggle();
    }
  });

  function handleSpacebarToggle() {
    // 1. 如果獨立後製視窗已開啟，控制混音試聽
    if (el.reviewWindowModal && el.reviewWindowModal.classList.contains('open')) {
      el.btnTogglePlayPreview.click();
      return;
    }
    // 2. 如果正在錄製中，暫停錄製
    if (audioEngine.isRecording) {
      el.btnRecordPause.click();
      return;
    }
    // 3. 如果錄製已暫停，接續錄製
    if (audioEngine.isPaused) {
      el.btnRecordResume.click();
      return;
    }
    // 4. 否則切換伴奏單播試聽
    if (audioEngine.sourceMode === 'youtube' && window.youtubeManager) {
      if (window.youtubeManager.isPlaying) {
        window.youtubeManager.pause();
        updateBackingSoloBtn(false);
      } else {
        window.youtubeManager.play();
        updateBackingSoloBtn(true);
      }
    } else {
      el.btnPlayBackingOnly.click();
    }
  }

  // ==========================================================================
  // 時間軸專屬右鍵選單 (Context Menu) 互動邏輯
  // ==========================================================================
  let activeContextTarget = null; // { time, take }

  function showTimelineContextMenu(e, info) {
    activeContextTarget = info;
    const menu = el.timelineContextMenu;
    if (!menu) return;

    el.ctxMenuHeader.textContent = `${Utils.formatDuration(info.time)} · 時間軸選項`;

    if (info.take) {
      // 點選在 Take 片段上：僅獨立顯示該片段編輯選單 (無縮放選單)
      if (el.ctxTakeGroup) el.ctxTakeGroup.style.display = 'block';
      if (el.ctxEmptyGroup) el.ctxEmptyGroup.style.display = 'none';
      el.ctxMenuHeader.textContent = `🎵 片段 ${info.take.id} (${info.take.duration.toFixed(1)}s)`;
      if (el.lblCtxPlayTake) el.lblCtxPlayTake.textContent = `▶ 試聽 ${info.take.id} (時間軸同步)`;
      if (el.lblCtxReRecordTake) el.lblCtxReRecordTake.textContent = `↻ 僅重錄 ${info.take.id} (自動限時)`;
      if (el.lblCtxDeleteTake) el.lblCtxDeleteTake.textContent = `× 刪除 ${info.take.id}`;
    } else {
      // 點選在空白處：獨立顯示視窗縮放與時間軸跳轉選單
      if (el.ctxTakeGroup) el.ctxTakeGroup.style.display = 'none';
      if (el.ctxEmptyGroup) el.ctxEmptyGroup.style.display = 'block';
      el.ctxMenuHeader.textContent = `${Utils.formatDuration(info.time)} · 時間軸操作`;
    }

    menu.style.display = 'block';
    const menuW = 230;
    const menuH = info.take ? 180 : 250;
    const posX = Math.min(e.clientX, window.innerWidth - menuW - 12);
    const posY = Math.min(e.clientY, window.innerHeight - menuH - 12);

    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;
  }

  function hideTimelineContextMenu() {
    if (el.timelineContextMenu) {
      el.timelineContextMenu.style.display = 'none';
    }
  }

  window.addEventListener('click', (e) => {
    if (el.timelineContextMenu && !el.timelineContextMenu.contains(e.target)) {
      hideTimelineContextMenu();
    }
  });
  window.addEventListener('blur', hideTimelineContextMenu);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideTimelineContextMenu();
  });

  if (el.ctxPlayFromHere) {
    el.ctxPlayFromHere.addEventListener('click', () => {
      hideTimelineContextMenu();
      if (!activeContextTarget) return;
      const t = activeContextTarget.time;
      if (audioEngine.sourceMode === 'youtube' && window.youtubeManager) {
        window.youtubeManager.seekTo(t);
        window.youtubeManager.play();
        updateBackingSoloBtn(true);
      } else {
        audioEngine.seekBackingOnly(t);
        if (!audioEngine.isBackingSoloPlaying) el.btnPlayBackingOnly.click();
      }
      mainTimeline.updatePlayhead(t, true);
    });
  }

  if (el.ctxPunchInHere) {
    el.ctxPunchInHere.addEventListener('click', async () => {
      hideTimelineContextMenu();
      if (!activeContextTarget) return;
      const t = activeContextTarget.time;
      mainTimeline.currentTime = t;
      mainTimeline.updatePlayhead(t, false);
      if (audioEngine.isRecording) {
        await audioEngine.pauseSinging();
      }
      el.btnRecordResume.click();
    });
  }

  if (el.ctxAlignLyric) {
    el.ctxAlignLyric.addEventListener('click', () => {
      hideTimelineContextMenu();
      if (!activeContextTarget) return;
      lyricsEngine.setAnchorAtCurrentTime(activeContextTarget.time);
      updateLyricsOffsetDisplay();
      UI.toast(`已對齊當前歌詞錨點至 ${Utils.formatDuration(activeContextTarget.time)}`, 'success');
    });
  }

  if (el.ctxPlayTake) {
    el.ctxPlayTake.addEventListener('click', () => {
      hideTimelineContextMenu();
      if (activeContextTarget && activeContextTarget.take) {
        const take = activeContextTarget.take;
        mainTimeline.updatePlayhead(take.startTime, false);
        updateRecordTimeDisplay(take.startTime);
        audioEngine.playTakeAudio(take, (curTime) => {
          mainTimeline.updatePlayhead(curTime, true);
          updateRecordTimeDisplay(curTime);
        }, () => {
          mainTimeline.updatePlayhead(take.startTime, false);
          updateRecordTimeDisplay(take.startTime);
        });
        UI.toast(`正在試聽 ${take.id} (時間軸指針同步推進)`, 'info');
      }
    });
  }

  if (el.ctxReRecordTake) {
    el.ctxReRecordTake.addEventListener('click', async () => {
      hideTimelineContextMenu();
      if (!activeContextTarget || !activeContextTarget.take) return;
      const take = activeContextTarget.take;
      const startFmt = Utils.formatDuration(take.startTime);
      if (await UI.confirm(`確定要重錄【${take.id}】嗎？系統將從 ${startFmt} 開始，並在錄滿 ${take.duration.toFixed(1)} 秒後自動停止，絕不覆蓋別段。`, '僅重錄此段')) {
        mainTimeline.currentTime = take.startTime;
        mainTimeline.updatePlayhead(take.startTime, false);
        await audioEngine.reRecordTake(take.id);
        
        el.btnRecordStart.style.display = 'none';
        el.btnRecordPause.style.display = 'inline-flex';
        el.btnRecordResume.style.display = 'none';
        el.btnRecordFinish.style.display = 'none';
        el.btnRecordReset.style.display = 'none';
        el.lblTrackStatus.textContent = `[僅重錄 ${take.id} · REC]`;
        el.lblTrackStatus.style.color = 'var(--danger)';

        mainTimeline.setVocalTakes(audioEngine.vocalTakes);
        renderVocalTakesList();
        startLiveRecordLoop();
      }
    });
  }

  if (el.ctxDeleteTake) {
    el.ctxDeleteTake.addEventListener('click', async () => {
      hideTimelineContextMenu();
      if (!activeContextTarget || !activeContextTarget.take) return;
      const take = activeContextTarget.take;
      if (await UI.confirm(`確定刪除【${take.id}】嗎？`, '刪除片段')) {
        audioEngine.deleteTake(take.id);
        mainTimeline.setVocalTakes(audioEngine.vocalTakes);
        reviewTimeline.setVocalTakes(audioEngine.vocalTakes);
        renderVocalTakesList();
        UI.toast(`已刪除 ${take.id}`, 'info');
      }
    });
  }

  if (el.ctxZoomIn) el.ctxZoomIn.addEventListener('click', () => { mainTimeline.zoomIn(); hideTimelineContextMenu(); });
  if (el.ctxZoomOut) el.ctxZoomOut.addEventListener('click', () => { mainTimeline.zoomOut(); hideTimelineContextMenu(); });
  if (el.ctxZoomReset) el.ctxZoomReset.addEventListener('click', () => { mainTimeline.zoomReset(); hideTimelineContextMenu(); });

  // 1-Click 複製互動卡片綁定 (若存在)
  document.querySelectorAll('.config-item').forEach(card => {
    card.addEventListener('click', () => {
      const val = card.querySelector('.config-val') ? card.querySelector('.config-val').textContent : card.textContent;
      const hint = card.querySelector('.copy-hint');
      Utils.copyText(val, hint);
      UI.toast('已複製資訊至剪貼簿', 'info');
    });
  });
});
