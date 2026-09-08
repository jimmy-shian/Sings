import { contextBridge, ipcRenderer } from 'electron';

// ============================================================================
// SingStudio - Electron Preload Script
// 安全地將 Node.js/Electron API 暴露給 Renderer Process
// ============================================================================

contextBridge.exposeInMainWorld('electronAPI', {
  // 應用程式資訊
  getVersion: () => ipcRenderer.invoke('app:get-version'),

  // YouTube 搜尋
  searchYouTube: (query: string) => ipcRenderer.invoke('yt:search', query),

  // 檔案對話框
  openFile: (options?: { filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('dialog:saveFile', options),

  // 檔案系統操作
  getTempDir: () => ipcRenderer.invoke('fs:get-temp-dir'),
  writeTempFile: (filename: string, data: ArrayBuffer) =>
    ipcRenderer.invoke('fs:write-temp', filename, data),
  readTempFile: (filename: string) =>
    ipcRenderer.invoke('fs:read-temp', filename),
  deleteTempFile: (filename: string) =>
    ipcRenderer.invoke('fs:delete-temp', filename),
  listTempFiles: () =>
    ipcRenderer.invoke('fs:list-temp'),

  // Shell 操作
  showInFolder: (filePath: string) =>
    ipcRenderer.invoke('shell:show-in-folder', filePath),
});

// 型別宣告
declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>;
      searchYouTube: (query: string) => Promise<any[] | { error: string }>;
      openFile: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<any>;
      saveFile: (options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
      getTempDir: () => Promise<string>;
      writeTempFile: (filename: string, data: ArrayBuffer) => Promise<string>;
      readTempFile: (filename: string) => Promise<Buffer | null>;
      deleteTempFile: (filename: string) => Promise<boolean>;
      listTempFiles: () => Promise<string[]>;
      showInFolder: (filePath: string) => Promise<void>;
    };
  }
}

export {};
