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

### 方式一：直接執行已編譯之 Windows 執行檔
進入 `dist/SingStudio/` 目錄，直接雙擊 `SingStudio.exe` 即可啟動。

### 方式二：本機 Python 執行
```powershell
# 啟動伺服器 (Windows)
C:\Users\Administrator\venv\Scripts\python.exe server.py

# 或標準環境
python server.py
```
開啟瀏覽器訪問：`http://localhost:8088`

---

## 本機編譯與打包 (Build EXE & APK)

### 1. 本機編譯 Windows 免安裝 EXE
本專案提供一鍵打包腳本：
```powershell
python build_exe.py
```
編譯完成後，免安裝執行檔將產生於 `dist/SingStudio/SingStudio.exe`。

### 2. GitHub Actions 自動編譯發佈 (EXE & APK)
本專案已配置完整 CI/CD 工作流程 (`.github/workflows/build.yml`)：
- 只要推送版本標籤（例如 `v0.0.1`）至 GitHub：
  ```bash
  git tag -a v0.0.1 -m "Release v0.0.1"
  git push origin v0.0.1
  ```
- GitHub Actions 將自動在雲端矩陣中建置：
  1. **Windows 執行檔**：`SingStudio-Windows-x64.exe`
  2. **Android 安裝包**：`SingStudio-Android.apk`
- 建置完成後自動發佈至 GitHub Release 頁面供隨時下載！

---

## 專案架構目錄

```text
Sings/
├── .github/
│   └── workflows/
│       └── build.yml        # CI/CD 自動構建發佈 EXE 與 APK 工作流程
├── css/
│   └── style.css            # OpenDesign 現代石墨灰高對比樣式與響應式排版
├── js/
│   ├── app.js               # 主應用調度器 (快捷鍵、雙時間軸、Takes管理、生命週期)
│   ├── audio.js             # 雙軌音訊工作站核心 (電平抓取、temp_ 暫存、接續錄製、WAV 渲染)
│   ├── lyrics.js            # LRC 同步動態歌詞解析、位移校準與 LRCLIB API
│   ├── scoring.js           # 視覺化相容模組
│   ├── storage.js           # IndexedDB 本機儲存保護引擎
│   ├── timeline.js          # 專業雙軌時間軸引擎 (滾輪縮放、平移、磁鐵吸附、Takes裁剪)
│   ├── utils.js             # 時間格式化、位元組轉換與複製工具
│   └── youtube.js           # YouTube IFrame API 整合模組 (自動時長、25 FPS 同步)
├── temp_recordings/         # 運行時錄音分段磁碟暫存 (由 .gitignore 排除)
├── .gitignore               # Git 版本忽略規則 (排除暫存與編譯產物)
├── build_exe.py             # 本機 Windows Standalone EXE 一鍵打包腳本
├── index.html               # 核心使用者介面
├── README.md                # 專案操作說明與技術手冊
└── server.py                # 輕量本機 HTTP 伺服器 (靜態檔案、YT 代理、temp_ 磁碟儲存)
```

---

## 開源授權

本專案基於 MIT 授權條款開放原始碼，歡迎自由使用與擴充。
