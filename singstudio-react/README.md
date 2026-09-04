# SingStudio DAW PRO (React + Electron)

SingStudio 是一套以 **Local-First（本機優先）** 與 **OpenDesign 極簡開發者美學** 為核心的專業雙軌音訊工作站（Digital Audio Workstation, DAW）。
本架構為 **React 19 + TypeScript + Vite + Electron 44** 原生桌面應用程式，取代舊版 Python HTTP Server + 瀏覽器架構，雙擊 EXE 即可直接啟動桌面視窗。

---

## 核心技術架構

- **桌面應用框架**：Electron 44 (主進程 `electron/main.ts` + 安全隔離 Preload `electron/preload.ts`)
- **前端框架**：React 19 + TypeScript + Vite 8
- **版本控制中心**：以 `package.json` 之 `version` 欄位為單一真實來源 (Single Source of Truth)，透過 Vite `define` 注入 `__APP_VERSION__`，並透過 IPC `app:get-version` 同步主進程與渲染進程
- **音訊核心引擎**：Web Audio API (雙軌混音、即時耳返監聽、85Hz 高通濾波、中置人聲消除 OOPS、16-bit 立體聲 PCM WAV 離線渲染)
- **視覺化雙軌時間軸**：HTML5 Canvas 高性能雙軌繪製 (伴奏軌 + 人聲軌、磁鐵吸附 50ms Snapping、自適應刻度尺、Shift+滾輪平移、滾輪平滑縮放)
- **外部資源整合**：YouTube IFrame API (25 FPS 雙向連動、播放佇列機制)、LRCLIB 雲端動態歌詞搜尋 API
- **本機資料庫儲存**：IndexedDB (`SingStudio_Storage_v2`) + Electron 本機硬碟磁碟暫存

---

## 目錄結構

```text
singstudio-react/
├── electron/
│   ├── main.ts            # Electron 主進程 (IPC 處理、檔案對話框、暫存管理、視窗管理)
│   └── preload.ts         # contextBridge 安全橋接層 (window.electronAPI)
├── src/
│   ├── components/        # UI 元件層
│   │   ├── Header.tsx             # 頂部導航列、版本標記與狀態指示
│   │   ├── SourcePanel.tsx        # 伴奏來源切換 (本地/YouTube/示範)
│   │   ├── LyricsPanel.tsx        # 動態歌詞視差捲動與校準控制
│   │   ├── LocalPlayerBar.tsx     # 獨立本地伴奏播放列
│   │   ├── TimelineCanvas.tsx     # 雙軌繪製、即時波形與磁吸時間軸 Canvas
│   │   ├── TimelineContextMenu.tsx# 時間軸專屬右鍵選單
│   │   ├── LyricsContextMenu.tsx  # 歌詞專屬右鍵選單
│   │   ├── RecordingControls.tsx  # 錄音控制、耳返監聽、雜音過濾開關
│   │   ├── TakesManager.tsx       # 分段 Take 試聽、重錄、刪除管理
│   │   ├── MixingConsole.tsx      # 後製混音台開關與快速匯出
│   │   ├── ReviewModal.tsx        # 獨立後製混音視窗 (雙軌音量/殘響/延遲校準/16-bit WAV)
│   │   ├── LibraryTable.tsx       # 已儲存作品資料庫清單
│   │   └── LrcSearchModal.tsx     # LRCLIB 雲端歌詞搜尋視窗
│   ├── hooks/             # 業務邏輯與音訊引擎 Hooks
│   │   ├── useAudioEngine.ts      # Web Audio 雙軌錄音、示範和弦、PCM WAV 匯出
│   │   ├── useYouTube.ts          # YouTube 播放器與 25 FPS 指針同步
│   │   ├── useTimeline.ts         # 時間軸縮放、平移與指針位置管理
│   │   ├── useLyrics.ts           # LRC 解析、即時對齊與時間偏移
│   │   └── useStorage.ts          # IndexedDB 作品庫儲存與管理
│   ├── types/             # TypeScript 型別定義
│   │   ├── index.ts               # 系統實體與狀態介面宣告
│   │   └── global.d.ts            # Electron API 與全域環境宣告
│   ├── styles/            # OpenDesign 極簡黑白高對比樣式
│   │   └── App.css                # 核心視覺樣式
│   ├── App.tsx            # 根元件與鍵盤快捷鍵 (Spacebar 播放/暫停)
│   └── main.tsx           # React DOM 進入點
├── public/                # 靜態資源 (圖示、Favicon)
├── package.json           # 依賴配置、單一版本來源與 electron-builder 設定
├── tsconfig.json          # TypeScript 編譯配置
└── vite.config.ts         # Vite 建置與 Electron 外掛設定
```

---

## 本機開發與建置指令

### 1. 啟動桌面版開發模式
```bash
npm run electron:dev
```
啟動 Vite 本地開發伺服器並自動開啟 Electron 視窗，支援熱模組替換 (HMR)。

### 2. 純前端網頁建置 (供 Android/Capacitor 同步使用)
```bash
npm run build:web
```
編譯純靜態 HTML/CSS/JS 產物輸出至 `singstudio-react/dist/`。

### 3. 本機編譯 Windows 原生桌面執行檔 (Standalone EXE & Setup)
```bash
# 使用 npm 指令直接編譯
npm run electron:build

# 或於專案根目錄執行智慧打包腳本
python build_exe.py
```
建置產物將輸出至 `release/` 及根目錄 `dist/`：
- `SingStudio-Windows-x64.exe`：**免安裝單一執行檔** (Portable Standalone EXE)，直接雙擊即可啟動原生視窗，無須瀏覽器與 Python 伺服器。
- `SingStudio-Setup-1.0.0.exe`：**標準安裝導引程式** (NSIS Installer)，支援建立桌面捷徑。
- `win-unpacked/SingStudio.exe`：免安裝綠色解壓版目錄。

### 4. 本機編譯 Android 安裝套件 (APK)
於專案根目錄執行專屬一鍵腳本或逐步建置：
```bash
# 根目錄一鍵建置
python build_apk.py

# 或手動逐步建置
npm run build:web
cp -r dist/* ../www/
cd ..
npx cap sync android
python scripts/patch_android_build.py
cd android && ./gradlew assembleRelease
```
正式發行已簽名之 APK 將輸出至 `dist/SingStudio-Android.apk`，可使用 `adb install` 或直接傳送至 Android 實體裝置安裝。
