# SingStudio DAW PRO - 專業雙軌音訊工作站與卡拉OK錄音系統 (v1.0.1)

SingStudio 是一套以 **Local-First（本機優先）** 與 **OpenDesign 極簡開發者美學** 為核心的專業雙軌音訊工作站（Digital Audio Workstation, DAW）。本專案已全面扁平化重構為 **React 19 + TypeScript + Electron 44 (桌面端) + Capacitor 8 (Android 手機端)** 現代化架構，所有程式碼均位於根目錄統籌管理，徹底移除舊版 Python HTTP 伺服器與 Legacy Vanilla 檔案，支援桌面原生視窗與行動裝置一鍵編譯發佈及 GitHub Actions 雲端自動化建置。

---

## 核心功能特色

### 1. 伴奏來源與動態字幕並行佈局
- **伴奏來源雙軌切換**：
  - **本地檔案**：支援 MP3 / WAV / FLAC / M4A 等格式，並具備獨立伴奏播放列。
  - **YouTube 直連搜尋**：即時線上檢索 YouTube 伴奏，影片時長自動抓取，播放指針與歌詞 25 FPS 雙向連動。
- **同步字幕歌詞 (LRC)**：
  - **正中央置中平滑捲動**：開唱時第 1 句即精準座落於視窗正中央，播放推進時每一句平滑置中呈現，媲美 Apple Music / Spotify 體驗。
  - **高精準對齊當前時間 (📍 對齊當前句)**：點選歌詞或右鍵指定某句，一鍵將其對齊至當前播放指針時間，所有時間戳標籤即時連動計算更新。
  - **雲端與本機支援**：整合 LRCLIB 免費動態歌詞庫線上檢索，亦支援手動匯入 / 匯出 `.lrc` 檔案。

### 2. 即時伴奏音訊軸與聲波流（瀏覽器影音播放效果）
- **內建影音播放器控制項**：在聲波圖正下方內嵌瀏覽器原生風格的播放控制器，包含大型播放/暫停按鈕（▶ / ⏸）、重設起點（⏮）、快退 5 秒（⏪ 5s）、快進 5 秒（5s ⏩）、伴奏即時音量拉桿與一鍵靜音。
- **空白鍵快捷操作 (Spacebar)**：無論焦點在何處，按下空白鍵皆可全域切換伴奏播放/暫停（打字輸入時自動避讓）。
- **雙軌波形可視化 Canvas**：
  - 上軌：伴奏音訊振幅波形與當前指針。
  - 下軌：麥克風錄製人聲時域波形與分段 Take 獨立標記。
  - 具備自適應時間刻度、滾輪縮放（1.0x ~ 10.0x）、Shift+滾輪平移與 50ms 磁吸附對齊。

### 3. 手機 / APK 模式：YouTube App 風格底部系統顯示器
- **中間視窗留給置中歌詞**：在手機或平板直式螢幕下，重型波形面板預設自動收合，釋放 100% 畫面空間供清晰閱讀置中同步歌詞。
- **固定底部系統顯示器 (Bottom Mini-Player)**：
  - **超薄時間軸拖曳進度條 (Scrubber)**：頂端配置 YouTube 移動端紅線拖曳條，隨手觸控滑動即可即時跳轉播放位置。
  - **即時系統時鐘與狀態**：顯示曲名、播放/錄音狀態燈（REC / PLAY / STANDBY）、當前時間與總長、麥克風電平。
  - **快捷大鍵操作**：直觀的大型 Play/Pause 圓鍵、一鍵快速錄音鍵、以及「▲ 波形」展開/收合切換鍵。

### 4. 接續錄製 (Punch-in) 與 Take 分段簡易管理
- 演唱途中隨時暫停與接續錄製，接續片段自動新增獨立 Take。
- **Takes 獨立編輯面板**：支援單獨試聽該段人聲、僅重錄此段（自動限制起訖時長防止覆蓋）、以及單獨刪除不滿意的片段。

### 5. 獨立後製混音視窗與無損匯出
- 雙軌即時試聽、伴奏/人聲獨立音量增益、KTV 空間殘響（Reverb）、人聲延遲校準（-250ms ~ +250ms）。
- 支援一鍵匯出 **16-bit PCM WAV** 立體聲無損母帶，並自動存入本地 IndexedDB 作品庫。

---

## 快速啟動與一鍵操作

### 1. 互動式選單 (Windows 推薦)
專案根目錄已提供整合式一鍵批次選單 **`0-一鍵啟動選單.bat`**，直接雙擊即可享受互動選單：

```text
======================================================================
   SingStudio DAW PRO - 一鍵啟動與建置選單 (v1.0.1)
======================================================================

   [1] 本機啟動開發 (Electron + React 熱重載)  <- 預設
   [2] 編譯 Windows EXE - Setup 安裝檔 + Portable 免安裝
   [3] 編譯 Android APK - Capacitor + Gradle Release
   [4] 全部建置 - Windows EXE + Android APK
   [5] 僅建置網頁版 - Vite 靜態輸出 dist/
   [6] 結束離開
```

### 2. NPM 命令列指令

亦可直接在終端機中透過 npm 腳本執行：

```powershell
# 1. 啟動桌面即時熱重載開發環境 (Electron + React)
npm run electron:dev

# 2. 啟動純網頁端開發預覽
npm run dev

# 3. 本機一鍵編譯 Windows EXE (輸出至 dist/)
npm run build:exe

# 4. 本機一鍵編譯 Android Release APK (輸出至 dist/)
npm run build:apk

# 5. 一鍵同時編譯 Windows EXE 與 Android APK
npm run build:all

# 6. 建置純網頁前端靜態資源 (輸出至 dist/)
npm run build:web
```

---

## 編譯產物說明

執行編譯後，所有產物自動統整輸出至根目錄 `dist/`：
- **`dist/SingStudio-Windows-x64.exe`**：**免安裝單一獨立執行檔**（免安裝直接執行，啟動原生 Electron 視窗，零依賴）。
- **`dist/SingStudio-Setup-1.0.1.exe`**：**標準 NSIS 安裝程式**（自動建立桌面捷徑與開始功能表）。
- **`dist/SingStudio-Android.apk`**：**正式簽名之 Android APK**（已配置 `singstudio.keystore` 雙重簽名與錄音權限，可直接安裝至實體手機）。

---

## 雲端 CI/CD 自動化建置 (GitHub Actions)

專案已內建完整的 GitHub Actions 雲端建置工作流程（位於 `.github/workflows/build.yml`）：
- **觸發時機**：推送（Push）至 `main` 分支或發布版本標籤（`v*.*.*`）。
- **Windows 建置作業**：自動執行 `npm install`、`tsc`、`vite build` 與 `electron-builder`，產出免安裝 EXE 與 NSIS Setup 安裝檔並自動上傳 Artifacts / Release Assets。
- **Android 建置作業**：配置 Java 17 與 Android SDK，自動同步 Capacitor 資源至 `android/` 專案，執行 Gradle 封裝並使用 Keystore 簽名產生 Release APK，自動上傳發布。

---

## 專案目錄結構 (扁平化架構)

```text
Sings/
├── 0-一鍵啟動選單.bat           # 整合式 6 合 1 啟動與建置批次選單
├── package.json                # 單一權威專案設定 (React 19 + Capacitor 8.5.1 + Electron 44)
├── capacitor.config.json       # Capacitor 跨平台設定檔 (webDir: dist)
├── vite.config.ts              # Vite 8 + Electron 雙向打包設定
├── tsconfig.json               # TypeScript 專案參考設定檔
├── tsconfig.app.json           # React 應用端 TypeScript 編譯設定
├── tsconfig.node.json          # Vite / Node 腳本 TypeScript 編譯設定
├── index.html                  # 前端核心 HTML 進入點
├── src/                        # 【核心原始碼】React 19 + TypeScript 工作站
│   ├── components/             # 現代 UI 元件 (BottomSystemBar, LyricsPanel, TimelineCanvas 等)
│   ├── hooks/                  # Web Audio, YouTube, Timeline, Lyrics 等核心 Hook
│   ├── types/                  # TypeScript 全域型別定義
│   ├── styles/                 # OpenDesign 高對比極簡風格樣式 (App.css)
│   ├── App.tsx                 # DAW 主邏輯、快捷鍵與多端佈局排版
│   └── main.tsx                # React 渲染起點
├── electron/                   # 【桌面端核心】
│   ├── main.ts                 # Electron 主進程 (原生視窗管理、音訊權限、選單防護)
│   └── preload.ts              # ContextBridge 安全預載腳本
├── public/                     # 應用圖示、Favicon 與 SVG 向量資源
├── android/                    # Capacitor 原生 Android 專案
├── build_exe.py                # Windows EXE 自動化打包腳本
├── build_apk.py                # Android APK 自動化建置打包程序
├── singstudio.keystore         # Android 正式發行密鑰庫
├── scripts/
│   └── patch_android_build.py  # Android Gradle 簽名與依賴修補腳本
├── .github/workflows/build.yml # GitHub Actions 雙平台雲端自動化建置流程
└── dist/                       # 發行產物統一輸出目錄 (EXE / APK / Web 靜態資源)
```

---

## 開源授權

本專案基於 MIT 授權條款開放原始碼，歡迎自由使用、修改與散佈。

