# SingStudio DAW PRO - 專業雙軌音訊工作站與卡拉OK錄音系統

SingStudio 是一套以 **Local-First（本機優先）** 與 **OpenDesign 極簡開發者美學** 為核心的專業雙軌音訊工作站（Digital Audio Workstation, DAW）。系統完全運行於本機瀏覽器，提供伴奏匯入、YouTube 免費直連搜尋與 25 FPS 時間軸同步、即時聲波繪製、接續錄製（Punch-in）、Take 獨立編輯（刪除/單獨重錄）、磁碟暫存防崩潰、獨立雙軌混音後製與 16-bit 無損立體聲 WAV 匯出。

---

## 核心功能特色

### 1. 伴奏來源與動態字幕並行佈局
- 左欄整合為單一等高卡片，提供膠囊按鈕隨時切換：
  - **伴奏來源**：本地檔案（MP3/WAV/FLAC/M4A）與獨立伴奏播放器、YouTube 直連搜尋、內建示範和弦。
  - **同步字幕 (LRC)**：440px+ 滿版 60 FPS 平滑視差捲動歌詞容器，與右側錄音操作區**高度完全齊平、左右平行並列**。

### 2. YouTube 直連搜尋與雙向時間軸 25 FPS 緊密連動
- 自動獲取 YouTube 影片真實時長（如 5:29）。
- YouTube 影片播放、暫停與跳轉時，時間軸指針、進度條與同步歌詞以 25 FPS 精準同步推進。
- 支援外部播放列控制與時間軸點擊/拖曳跳轉雙向反饋。

### 3. 快捷操作：電腦端空白鍵 (Spacebar) 快速播放 / 暫停
- 於錄音工作區按 **空白鍵 (Space)**：錄製中自動暫停；暫停時自動接續錄製；待機時快速播放/暫停伴奏。
- 於獨立後製混音視窗按 **空白鍵**：即時切換混音預覽播放與暫停。
- 輸入框或文字編輯時自動避讓，不干擾打字。

### 4. 專業雙軌時間軸模組 (`AudioTimeline`)
- **滾輪縮放 (Wheel Zoom)**：支援 `1.0x` 至 `10.0x` 平滑縮放，自適應刻度尺確保標籤文字不重疊。
- **視窗水平平移 (Horizontal Pan)**：支援 `Shift + 滾輪` 水平捲動、滑鼠右鍵/中鍵拖曳平移、以及工具列 `[◀ 往前]` `[往後 ▶]` 按鈕。
- **磁鐵吸附 (Magnetic Snapping)**：拖曳指針接近 Take 起訖邊界（3~5ms / 0.05s）時自動精準吸附並顯示參考虛線。
- **雙軌波形可視化**：
  - 上軌：伴奏音訊軌（已播放亮藍、未播放淺灰）。
  - 下軌：人聲音訊軌（真實時域振幅 Oscillogram 與各 Take 獨立邊界裁剪）。

### 5. 接續錄製 (Punch-in) 與 Take 分段簡易管理
- 支援演唱途中隨時暫停。
- **後續內容保護**：在兩段 Take 中間接續錄製時，完整保留後續片段，不清除後面內容，僅自動順延序號。
- **Takes 獨立編輯面板**：
  - `[▶ 試聽]`：單獨試聽該段人聲。
  - `[↻ 僅重錄此段]`：自動限制錄音起訖時長，錄滿該段時長自動停止，絕不覆蓋別段。
  - `[× 刪除]`：單獨移除不滿意的 Take。

### 6. 動態字幕歌詞起點平移校準 (Offset)
- 支援歌詞時間軸整體微調：`[-0.5s]`、`[+0.5s]`、`[0s 重置]`。
- **一鍵對齊起點 (📍 對齊當前句)**：將目前播放點秒數綁定為當前句歌詞起點，秒解前奏刪減或伴奏延遲問題。
- 修正長文字自動換行居中、平滑視差滾動，杜絕超出邊界。

### 7. 磁碟 `temp_` 暫存機制 (防 RAM 耗盡卡死)
- 錄音片段即時寫入本機硬碟 `temp_recordings/temp_*.webm`。
- 瀏覽器端釋放記憶體 Blob，改由磁碟串流讀取，徹底杜絕長時間錄音或大檔案導致的記憶體爆滿與瀏覽器卡死。

### 8. 獨立後製混音專屬視窗
- 內建專屬的第二個時間軸實例，試聽時時間軸指針、雙軌波形與進度條同步 60 FPS 推進。
- 具備伴奏音量、人聲音量、獨立靜音開關、人聲延遲校準（-250ms ~ +250ms）、KTV 空間殘響（Reverb）、以及立體聲 16-bit PCM WAV 無損混音匯出。

---

## 快速啟動指南

### 方式一：直接執行 Windows 原生桌面應用程式 (免安裝 / 安裝版)
本架構已升級為 **Electron 原生視窗應用程式**，雙擊即可直接啟動桌面視窗（無須開啟本地瀏覽器）：
- **免安裝單一執行檔**：直接執行 `dist/SingStudio-Windows-x64.exe` 或 `singstudio-react/release/win-unpacked/SingStudio.exe`。
- **標準安裝版**：執行 `dist/SingStudio-Setup-*.exe`。

### 方式二：React + Electron 開發模式
```powershell
cd singstudio-react
npm run electron:dev
```
即刻啟動 Vite 本地開發熱重載 (HMR) 並自動掛載 Electron 原生視窗。

### 方式三：舊版 Python Server (相容備用)
```powershell
C:\Users\Administrator\venv\Scripts\python.exe server.py
# 或 python server.py
```
開啟瀏覽器訪問：`http://localhost:8088`

---

## 本機編譯與打包 (Build EXE & APK)

### 1. 本機編譯 Windows 原生桌面執行檔 (EXE)
本專案提供一鍵打包腳本，自動調度 TypeScript、Vite 與 `electron-builder`：
```powershell
# 方式一：一鍵 Python 建置腳本 (推薦)
C:\Users\Administrator\venv\Scripts\python.exe build_exe.py
# 或通用環境
python build_exe.py

# 方式二：直接使用 NPM 指令
cd singstudio-react
npm run electron:build
```
編譯完成後，產物將自動輸出至 `dist/` 目錄：
- `dist/SingStudio-Windows-x64.exe`：**免安裝單一獨立執行檔**（直接雙擊即可啟動原生視窗，無須安裝與本地伺服器）。
- `dist/SingStudio-Setup-1.0.0.exe`：**標準 NSIS 安裝程式**（自動建立桌面圖示與開始功能表捷徑）。
- `singstudio-react/release/win-unpacked/SingStudio.exe`：免安裝綠色解壓版目錄。

### 2. 本機編譯 Android 安裝套件 (APK)
本專案整合 Capacitor 跨平台框架與 Android Gradle 雙重簽名機制：

#### 前置環境要求：
- **Node.js**：v20+
- **JDK**：Java 21 (推薦 Temurin 21)
- **Android SDK**：具備 `build-tools` 與 `platforms;android-34`（或設有 `ANDROID_HOME`）

#### 本機一鍵建置：
```powershell
# 執行一鍵 APK 建置腳本
C:\Users\Administrator\venv\Scripts\python.exe build_apk.py
# 或通用環境
python build_apk.py
```

#### 手動逐步建置流程：
```bash
# 1. 編譯 React 前端網頁資產
cd singstudio-react
npm run build:web
cd ..

# 2. 同步前端資產至 www/ 目錄
rm -rf www && mkdir -p www
cp -r singstudio-react/dist/* www/
cp -r singstudio-react/public/assets www/ 2>/dev/null || true

# 3. 執行 Capacitor 同步
npx cap sync android

# 4. 套用 Gradle 依賴修補並注入發行簽名密鑰
python scripts/patch_android_build.py

# 5. 編譯正式 Release APK
cd android
./gradlew assembleRelease --no-daemon      # Linux / macOS
gradlew.bat assembleRelease --no-daemon    # Windows
```

#### 簽名與安裝說明：
- **內建簽名密鑰**：專案已自帶發行金鑰 `singstudio.keystore`（別名 `mykey` / 密碼 `123456`），腳本會自動配置 **APK Signature Scheme v1 與 v2 雙重簽名**，產出之 APK 可直接在實體 Android 手機/平板正常安裝。
- **安裝至實機**：
  ```bash
  adb install dist/SingStudio-Android.apk
  ```
  或直接透過 USB / 通訊軟體將 APK 傳輸至手機點擊安裝。

### 3. GitHub Actions 雲端自動編譯發佈 (EXE & APK)
本專案配置企業級 CI/CD 工作流程 (`.github/workflows/build.yml`)：
- 推送版本標籤（例如 `v1.0.0`）或於 GitHub Actions 頁面手動點擊 `Run workflow`：
  ```bash
  git tag -a v1.0.0 -m "Release v1.0.0"
  git push origin v1.0.0
  ```
- GitHub Actions 自動在雲端環境矩陣中建置：
  1. **Windows 原生桌面檔**：`SingStudio-Windows-x64.exe` (Portable) 與 `SingStudio-Setup-*.exe` (Installer)。
  2. **Android 安裝包**：`SingStudio-Android.apk` (已內建正式 keystore 簽名與麥克風權限)。
- 建置完成後自動發佈至 GitHub Release 頁面供隨時下載！

---

## 專案架構目錄

```text
Sings/
├── singstudio-react/        # 【現代架構】React 19 + TypeScript + Electron 44 桌面工作站
│   ├── electron/            # Electron 主進程與 Preload 安全橋接
│   ├── src/                 # React 元件、Web Audio Hooks、Canvas 時間軸
│   ├── package.json         # 單一版本來源、依賴與 electron-builder 設定
│   └── vite.config.ts       # Vite + Electron 編譯設定
├── .github/
│   └── workflows/
│       └── build.yml        # CI/CD 自動構建發佈 EXE (Electron) 與 APK (Capacitor)
├── android/                 # Android 原生專案配置與簽名檔
├── scripts/
│   └── patch_android_build.py # Android Gradle 依賴衝突與簽名自動修補腳本
├── css/                     # 【相容歷史】舊版樣式庫
├── js/                      # 【相容歷史】舊版 Vanilla JS 音訊與時間軸模組
├── build_exe.py             # 一鍵編譯 Windows Standalone EXE 智慧腳本
├── singstudio.keystore      # Android 正式發行固定密鑰簽名庫
├── README.md                # 專案完整操作說明與技術手冊
└── server.py                # 舊版 Python HTTP 伺服器 (供相容模式使用)
```

---

## 開源授權

本專案基於 MIT 授權條款開放原始碼，歡迎自由使用與擴充。
