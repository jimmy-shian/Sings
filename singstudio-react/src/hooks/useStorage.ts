import { useState, useCallback, useEffect } from 'react';
import type { Recording } from '../types';

// ============================================================================
// SingStudio - useStorage Hook
// 安全本機儲存庫 (React Hook 版本)
// ============================================================================

export function useStorage() {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);

  // 初始化 IndexedDB
  useEffect(() => {
    const initDB = () => {
      return new Promise<IDBDatabase>((resolve, reject) => {
        if (!window.indexedDB) {
          console.warn('此環境不支援 IndexedDB');
          reject(new Error('IndexedDB 不支援'));
          return;
        }

        const request = indexedDB.open('SingStudio_Storage_v2', 1);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('recordings')) {
            const store = db.createObjectStore('recordings', { keyPath: 'id', autoIncrement: true });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          const database = (event.target as IDBOpenDBRequest).result;
          resolve(database);
        };

        request.onerror = (event) => {
          reject((event.target as IDBOpenDBRequest).error);
        };
      });
    };

    initDB()
      .then(database => {
        setDb(database);
        setIsReady(true);
        loadAllMeta(database);
      })
      .catch(err => {
        console.error('IndexedDB 初始化失敗:', err);
        setIsReady(true); // 仍然標記為 ready，只是沒有 DB
      });
  }, []);

  // 載入所有作品元數據
  const loadAllMeta = useCallback((database: IDBDatabase) => {
    return new Promise<void>((resolve) => {
      const tx = database.transaction(['recordings'], 'readonly');
      const store = tx.objectStore('recordings');
      const request = store.openCursor(null, 'prev');
      const list: Recording[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const val = cursor.value;
          list.push({
            id: val.id,
            title: val.title,
            sourceType: val.sourceType,
            youtubeId: val.youtubeId,
            duration: val.duration,
            timestamp: val.timestamp,
            dateString: val.dateString,
            sizeFormatted: val.sizeFormatted,
            takesCount: val.takesCount || 1,
            latencyOffset: val.latencyOffset || 0,
          } as Recording);
          cursor.continue();
        } else {
          setRecordings(list);
          resolve();
        }
      };

      request.onerror = () => resolve();
    });
  }, []);

  // 儲存錄音作品
  const saveRecording = useCallback(async (data: {
    title: string;
    sourceType: 'local' | 'youtube' | 'demo';
    youtubeId?: string;
    duration: number;
    vocalBlob?: Blob;
    backingBlob?: Blob;
    lyrics?: string;
    note?: string;
    takesCount?: number;
    latencyOffset?: number;
  }): Promise<number | null> => {
    if (!db) {
      console.warn('資料庫未初始化');
      return null;
    }

    const vocalSize = data.vocalBlob?.size || 0;
    const backingSize = data.backingBlob?.size || 0;
    const totalBytes = vocalSize + backingSize;

    const item: any = {
      title: data.title || '未命名作品',
      sourceType: data.sourceType,
      youtubeId: data.youtubeId || null,
      duration: Math.round(data.duration || 0),
      timestamp: Date.now(),
      dateString: new Date().toLocaleString('zh-TW', { hour12: false }),
      sizeBytes: totalBytes,
      sizeFormatted: formatBytes(totalBytes),
      vocalBlob: data.vocalBlob,
      backingBlob: data.backingBlob,
      lyrics: data.lyrics || '',
      note: data.note || '',
      takesCount: data.takesCount || 1,
      latencyOffset: data.latencyOffset || 0,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['recordings'], 'readwrite');
      const store = tx.objectStore('recordings');
      const req = store.add(item);

      req.onsuccess = (e) => {
        const id = (e.target as IDBRequest).result as number;
        setRecordings(prev => [{
          id,
          title: item.title,
          sourceType: item.sourceType,
          youtubeId: item.youtubeId,
          duration: item.duration,
          timestamp: item.timestamp,
          dateString: item.dateString,
          sizeFormatted: item.sizeFormatted,
          takesCount: item.takesCount,
          latencyOffset: item.latencyOffset,
        }, ...prev]);
        resolve(id);
      };

      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }, [db]);

  // 依 ID 取得完整作品
  const getById = useCallback((id: number): Promise<Recording | null> => {
    if (!db) return Promise.resolve(null);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['recordings'], 'readonly');
      const store = tx.objectStore('recordings');
      const req = store.get(id);

      req.onsuccess = (e) => resolve((e.target as IDBRequest).result || null);
      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }, [db]);

  // 更新標題
  const updateTitle = useCallback((id: number, newTitle: string): Promise<boolean> => {
    if (!db) return Promise.resolve(false);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['recordings'], 'readwrite');
      const store = tx.objectStore('recordings');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item = getReq.result;
        if (!item) return resolve(false);
        item.title = newTitle;
        const putReq = store.put(item);
        putReq.onsuccess = () => {
          setRecordings(prev => prev.map(r => r.id === id ? { ...r, title: newTitle } : r));
          resolve(true);
        };
        putReq.onerror = (e) => reject((e.target as IDBRequest).error);
      };

      getReq.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }, [db]);

  // 刪除作品
  const deleteRecording = useCallback((id: number): Promise<boolean> => {
    if (!db) return Promise.resolve(false);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['recordings'], 'readwrite');
      const store = tx.objectStore('recordings');
      const req = store.delete(id);

      req.onsuccess = () => {
        setRecordings(prev => prev.filter(r => r.id !== id));
        resolve(true);
      };

      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }, [db]);

  // 重新整理
  const refresh = useCallback(() => {
    if (db) {
      loadAllMeta(db);
    }
  }, [db, loadAllMeta]);

  return {
    isReady,
    recordings,
    saveRecording,
    getById,
    updateTitle,
    deleteRecording,
    refresh,
  };
}

// ============================================================================
// 輔助函數
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
