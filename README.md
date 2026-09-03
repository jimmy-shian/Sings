# SingStudio DAW PRO - 專業雙軌音訊工作站與卡拉OK錄音系統

SingStudio 是一套以 **Local-First（本機優先）** 與 **OpenDesign 極簡開發者美學** 為核心的專業雙軌音訊工作站（Digital Audio Workstation, DAW）。系統完全運行於本機瀏覽器，提供伴奏匯入、YouTube 免費直連搜尋、即時聲波繪製、接續錄製（Punch-in）、磁碟暫存防崩潰、獨立雙軌混音後製與 16-bit 無損立體聲 WAV 匯出。

---

## 核心功能特色

### 1. 伴奏來源與動態字幕並行佈局
- 左欄整合為單一等高卡片，提供膠囊按鈕隨時切換：
  - **伴奏來源**：本地檔案（MP3/WAV/FLAC/M4A）與獨立伴奏播放器、YouTube 直連搜尋、內建示範和弦。
  - **同步字幕 (LRC)**：440px+ 滿版 60 FPS 平滑視差捲動歌詞容器，與右側錄音操作區**高度完全齊平、左右平行並列**。

### 2. 專業雙軌時間軸模組 (`AudioTimeline`)
- **滾輪縮放 (Wheel Zoom)**：於時間軸畫布滑動滑鼠滾輪，支援 `1.0x` 至 `10.0x` 平滑縮放，自適應刻度尺確保標籤文字不重疊。
- **拖曳跳轉 (Click & Drag Scrubbing)**：隨時在時間軸上點擊或拖曳垂直指針（Playhead），毫秒級同步跳轉。
- **伴奏單播連動**：在正式錄音前單獨試聽伴奏時，時間軸指針與波形隨 60 FPS 平滑推移，歌詞同步捲動。
- **雙軌波形可視化**：
  - 上軌：伴奏音訊軌（已播放亮藍、未播放淺灰）。
  - 下軌：人聲音訊軌（真實時域振幅 Oscillogram 與各 Take 片段邊界）。

### 3. 接續錄製系統 (Punch-in / Resume Recording)
- 支援演唱途中隨時暫停。
- 暫停後可將時間軸指針任意拖動至指定秒數（如第 15 秒重新唱），點擊「接續錄製（Punch-in）」。
- 系統自動從該秒數無縫重播伴奏並開啟麥克風建立新 Take，妥善處理重疊銜接，支援多次分段補唱。

### 4. 磁碟 `temp_` 暫存機制 (防 RAM 耗盡卡死)
- 透過本機伺服器端點 (`POST /api/temp/save`)，錄音片段即時寫入硬碟 `temp_recordings/temp_*.webm`。
- 瀏覽器端釋放記憶體 Blob，改由本機磁碟串流讀取，徹底杜絕長時間錄音或大檔案導致的記憶體爆滿與瀏覽器卡死。

### 5. 獨立後製混音專屬視窗
- 「完成演唱」後彈出全獨立的後製混音專屬視窗，與主錄音畫面徹底分離。
- 內建專屬的第二個時間軸實例，試聽時時間軸指針、雙軌波形與進度條同步 60 FPS 推進。
- 具備伴奏音量、人聲音量、獨立靜音開關、人聲延遲校準（-250ms ~ +250ms）、KTV 空間殘響（Reverb）、以及立體聲 16-bit PCM WAV 無損混音匯出。

### 6. 全球開放同步歌詞庫 (LRCLIB)
- 整合全球開放開源歌詞庫 LRCLIB API，輸入歌曲名稱即可一鍵套用時間軸同步歌詞。
- 完整支援手動匯入與匯出 `.lrc` 格式。

### 7. 本地第一儲存保護 (IndexedDB)
- 所有作品與伴奏以原子寫入方式保存在本機 IndexedDB 資料庫中。
- 提供磁碟儲存配額估算與快閃記憶體壽命保護，離線亦可正常運作。

---

## 快速啟動指南

### 環境需求
- Python 3.7+（Windows / macOS / Linux 均支援）
- 現代 Chromium 核心瀏覽器（Google Chrome, Microsoft Edge）或 Firefox
- 建議配戴耳機以獲得最佳錄音與混音效果（避免揚聲器回授）

### 執行步驟
1. 複製或下載本專案倉庫：
   ```bash
   git clone https://github.com/jimmy-shian/Sings.git
   cd Sings
   ```

2. 啟動本機伺服器：
   ```bash
   python server.py
   ```
   *Windows 環境若使用虛擬環境：*
   ```powershell
   C:\Users\Administrator\venv\Scripts\python.exe server.py
   ```

3. 開啟瀏覽器訪問：
   ```text
   http://localhost:8088
   ```

---

## 操作工作流程

1. **選取伴奏**：
   - 方式 A：將本地 MP3/WAV 音訊拖曳至左側上傳區。
   - 方式 B：點擊「YouTube 直連搜尋」，輸入歌名或貼上 YouTube 連結。
   - 方式 C：點擊「內建示範和弦」載入 56 秒卡農伴奏。
2. **獲取字幕**：
   - 點擊左欄切換按鈕「同步字幕歌詞 (LRC)」，點擊「搜尋同步歌詞 (LRCLIB)」線上一鍵套用。
3. **開始演唱**：
   - 點擊右側「開始錄製」，伴奏播放且麥克風啟動，即時觀察真實輸入電平表與人聲波形。
   - 若唱錯段落，點擊「暫停錄製」，將時間軸指針拖回出錯處，點擊「接續錄製 (Punch-in)」即可補唱。
4. **後製混音與匯出**：
   - 點擊「完成演唱 · 進入後製混音」，開啟獨立後製視窗。
   - 播放試聽並微調「人聲延遲校準」與雙軌音量比例，滿意後點擊「匯出立體聲混音 WAV」儲存無損檔案。

---

## 專案架構目錄

```text
Sings/
├── css/
│   └── style.css            # OpenDesign 現代石墨灰高對比樣式與響應式排版
├── js/
│   ├── app.js               # 主應用調度器 (雙時間軸、生命週期與事件協調)
│   ├── audio.js             # 雙軌音訊工作站核心 (電平抓取、temp_ 暫存、接續錄製、WAV 渲染)
│   ├── lyrics.js            # LRC 同步動態歌詞解析與 LRCLIB API 搜尋模組
│   ├── scoring.js           # 視覺化相容模組
│   ├── storage.js           # IndexedDB 本機儲存保護引擎
│   ├── timeline.js          # 專業雙軌時間軸畫布引擎 (滾輪縮放、拖曳跳轉、Takes 拼接)
│   ├── utils.js             # 時間格式化、位元組轉換與複製工具
│   └── youtube.js           # YouTube IFrame API 整合模組
├── temp_recordings/         # 運行時錄音分段磁碟暫存 (由 .gitignore 排除)
├── .gitignore               # Git 版本忽略規則
├── index.html               # 核心使用者介面 (平行對齊工作區與獨立後製視窗)
├── README.md                # 專案操作說明與技術手冊
└── server.py                # 輕量本機 HTTP 伺服器 (靜態檔案、YT 代理、temp_ 磁碟儲存)
```

---

## 開源授權

本專案基於 MIT 授權條款開放原始碼，歡迎自由使用與擴充。
