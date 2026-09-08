import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
// SingStudio - Electron Main Process
// 取代原本的 Python HTTP Server，直接提供桌面應用程式體驗
// ============================================================================

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'SingStudio DAW PRO',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // 需要存取音訊與檔案系統
    },
    show: false,
    titleBarStyle: 'hiddenInset', // macOS 風格標題列
  });

  // 載入應用程式
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 視窗準備好後顯示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 外部連結用預設瀏覽器開啟
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================================
// App 生命週期
// ============================================================================

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============================================================================
// IPC 處理器 - 取代 Python Server 的功能
// ============================================================================

// 取得應用程式版本 (直接自 package.json 讀取)
ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});


// YouTube 搜尋代理 (取代 Python server 的 /api/yt/search)
ipcMain.handle('yt:search', async (_event, query: string) => {
  try {
    const trimmed = query.trim();
    // 檢查是否為直接網址或 11 碼 ID
    const urlMatch = trimmed.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+?&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
    const directVid = urlMatch ? urlMatch[1] : (/^[a-zA-Z0-9_-]{11}$/.test(trimmed) ? trimmed : null);

    if (directVid) {
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${directVid}&format=json`);
        if (oembedRes.ok) {
          const data: any = await oembedRes.json();
          return [{
            id: directVid,
            title: data.title || `YouTube 影片 (${directVid})`,
            duration: '直連伴奏',
            channel: data.author_name || 'YouTube',
            thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${directVid}/hqdefault.jpg`,
          }];
        }
      } catch (err) {
        console.warn('Electron oEmbed lookup failed:', err);
      }
      return [{
        id: directVid,
        title: `YouTube 影片 (${directVid})`,
        duration: '直連伴奏',
        channel: 'YouTube',
        thumbnail: `https://i.ytimg.com/vi/${directVid}/hqdefault.jpg`,
      }];
    }

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const results: any[] = [];

    // 解析 ytInitialData
    const match = html.match(/var ytInitialData\s*=\s*({.+?});<\/script>/);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents || [];

        for (const sec of contents) {
          const items = sec?.itemSectionRenderer?.contents || [];
          for (const it of items) {
            if (it.videoRenderer) {
              const vr = it.videoRenderer;
              const vid = vr.videoId;
              const title = vr.title?.runs?.[0]?.text || '';
              const duration = vr.lengthText?.simpleText || '';
              const channel = vr.ownerText?.runs?.[0]?.text || '';
              const thumbnail = vr.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
              if (vid && title) {
                results.push({ id: vid, title, duration, channel, thumbnail });
              }
            }
          }
        }
      } catch (e) {
        console.error('解析 ytInitialData 失敗:', e);
      }
    }

    // 備用：正則提取影片 ID
    if (results.length === 0) {
      const vids = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/g) || [];
      const uniqueVids = [...new Set(vids.map(v => v.replace('/watch?v=', '')))];
      for (const vid of uniqueVids.slice(0, 10)) {
        results.push({
          id: vid,
          title: `YouTube 影片 (${vid})`,
          duration: '未知',
          channel: 'YouTube',
          thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        });
      }
    }

    return results.slice(0, 15);
  } catch (e: any) {
    return { error: e.message };
  }
});

// 開啟檔案對話框 (取代 HTML file input)
ipcMain.handle('dialog:openFile', async (_event, options?: { filters?: { name: string; extensions: string[] }[] }) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: options?.filters || [
      { name: '音訊檔案', extensions: ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'webm'] },
      { name: 'LRC 歌詞', extensions: ['lrc', 'txt'] },
      { name: '所有檔案', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  try {
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const ext = path.extname(filePath).slice(1);
    return {
      name: path.basename(filePath),
      path: filePath,
      data: base64,
      mimeType: ext === 'lrc' ? 'text/plain' : `audio/${ext}`
    };
  } catch (e: any) {
    return { error: e.message };
  }
});

// 儲存檔案對話框
ipcMain.handle('dialog:saveFile', async (_event, options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: options.defaultPath || 'recording.wav',
    filters: options.filters || [
      { name: 'WAV 音訊', extensions: ['wav'] },
      { name: 'WebM 音訊', extensions: ['webm'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  return result.filePath;
});

// 讀取暫存目錄
ipcMain.handle('fs:get-temp-dir', () => {
  const tempDir = path.join(app.getPath('userData'), 'temp_recordings');
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
});

// 寫入暫存檔案
ipcMain.handle('fs:write-temp', async (_event, filename: string, data: ArrayBuffer) => {
  const tempDir = path.join(app.getPath('userData'), 'temp_recordings');
  fs.mkdirSync(tempDir, { recursive: true });
  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, Buffer.from(data));
  return filePath;
});

// 讀取暫存檔案
ipcMain.handle('fs:read-temp', async (_event, filename: string) => {
  const tempDir = path.join(app.getPath('userData'), 'temp_recordings');
  const filePath = path.join(tempDir, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath);
});

// 刪除暫存檔案
ipcMain.handle('fs:delete-temp', async (_event, filename: string) => {
  const tempDir = path.join(app.getPath('userData'), 'temp_recordings');
  const filePath = path.join(tempDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return true;
});

// 列出暫存檔案
ipcMain.handle('fs:list-temp', () => {
  const tempDir = path.join(app.getPath('userData'), 'temp_recordings');
  if (!fs.existsSync(tempDir)) {
    return [];
  }
  return fs.readdirSync(tempDir).filter(f => f.startsWith('temp_'));
});

// 在檔案管理員中顯示
ipcMain.handle('shell:show-in-folder', (_event, filePath: string) => {
  shell.showItemInFolder(filePath);
});
