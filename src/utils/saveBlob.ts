// ============================================================================
// SingStudio - 跨平台檔案輸出
// Electron → 另存對話框 + 直接寫入絕對路徑
// Capacitor (Android) → Filesystem 寫入快取 + 系統分享面板
// 純瀏覽器 → <a download> 下載
// ============================================================================

import { Capacitor } from '@capacitor/core';

export interface SaveFilter {
  name: string;
  extensions: string[];
}

export type SaveResult = 'saved' | 'shared' | 'downloaded' | 'cancelled';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('讀取檔案內容失敗'));
    reader.readAsDataURL(blob);
  });
}

export async function saveBlobToDisk(
  blob: Blob,
  defaultFilename: string,
  filters: SaveFilter[],
): Promise<SaveResult> {
  // 1) Electron 桌面版：對話框 + 寫入使用者選擇的絕對路徑
  const electronAPI = (window as any).electronAPI;
  if (electronAPI?.saveFile && electronAPI?.writeFile) {
    const filePath = await electronAPI.saveFile({ defaultPath: defaultFilename, filters });
    if (!filePath) return 'cancelled';
    const buf = await blob.arrayBuffer();
    await electronAPI.writeFile(filePath, buf);
    return 'saved';
  }

  // 2) Capacitor 原生（Android APK）：寫入快取後開分享面板（可存檔/傳分享）
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const base64 = await blobToBase64(blob);
    await Filesystem.writeFile({
      path: defaultFilename,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    const { uri } = await Filesystem.getUri({ path: defaultFilename, directory: Directory.Cache });
    await Share.share({
      title: defaultFilename,
      url: uri,
      dialogTitle: '匯出作品',
    });
    return 'shared';
  }

  // 3) 純瀏覽器：觸發下載
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = defaultFilename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  return 'downloaded';
}
