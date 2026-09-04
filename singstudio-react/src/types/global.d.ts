// ============================================================================
// SingStudio - 全域型別宣告
// ============================================================================

export {};

declare global {
  const __APP_VERSION__: string;
  interface Window {
    electronAPI?: {
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
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
