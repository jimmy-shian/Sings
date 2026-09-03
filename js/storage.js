/**
 * SingStudio - 安全本機儲存庫 (Safe Local Storage)
 * 
 * 硬體與記憶體保護規範：
 * 1. 錄音中途零磁碟 I/O：錄製時嚴禁寫入快閃硬碟 (SSD/eMMC/UFS)，僅於記憶體暫存。
 * 2. 單次原子交易寫入：按下儲存時將二進位 Blob 一次性存入 IndexedDB。
 * 3. 避免 Base64 記憶體膨脹：純 Blob 存儲，減少 33% 額外開銷。
 * 4. 磁碟空間估算監控：主動使用 navigator.storage.estimate 回報健康狀態。
 */

class SafeStorage {
  constructor() {
    this.dbName = 'SingStudio_Storage_v2';
    this.storeName = 'recordings';
    this.db = null;
    this.initPromise = this.initDB();
  }

  async initDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('此環境不支援 IndexedDB，改用純記憶體暫存模式');
        resolve(null);
        return;
      }

      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB 初始化失敗:', event.target.error);
        resolve(null);
      };
    });
  }

  /**
   * 取得儲存空間使用情況
   */
  async getStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageMB = (estimate.usage / (1024 * 1024)).toFixed(2);
        const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(2);
        const percent = ((estimate.usage / estimate.quota) * 100).toFixed(1);
        return { usageMB, quotaMB, percent };
      } catch (e) {
        console.warn('無法讀取 Storage Estimate:', e);
      }
    }
    return { usageMB: '0.00', quotaMB: '1000.00', percent: '0' };
  }

  /**
   * 單次原子寫入作品（僅在錄音結束後由使用者觸發）
   */
  async saveRecording(data) {
    await this.initPromise;
    if (!this.db) {
      throw new Error('本地資料庫未初始化');
    }

    const vocalSize = data.vocalBlob ? data.vocalBlob.size : 0;
    const backingSize = data.backingBlob ? data.backingBlob.size : 0;
    const totalBytes = vocalSize + backingSize;

    const item = {
      title: data.title || '未命名作品',
      sourceType: data.sourceType || 'local', // 'local' | 'youtube' | 'demo'
      youtubeId: data.youtubeId || null,
      duration: Math.round(data.duration || 0),
      score: Math.round(data.score || 0),
      rank: data.rank || 'C',
      timestamp: Date.now(),
      dateString: new Date().toLocaleString('zh-TW', { hour12: false }),
      sizeBytes: totalBytes,
      sizeFormatted: Utils.formatBytes(totalBytes),
      latencyOffset: data.latencyOffset || 0,
      vocalBlob: data.vocalBlob,       // 純二進位保存
      backingBlob: data.backingBlob,   // 若有本機伴奏則保存
      lyrics: data.lyrics || '',
      note: data.note || ''
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.add(item);

      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * 取得作品輕量清單（不載入大型 Blob，避免 RAM 膨脹）
   */
  async getAllMeta() {
    await this.initPromise;
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.openCursor(null, 'prev');
      const list = [];

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const val = cursor.value;
          list.push({
            id: val.id,
            title: val.title,
            sourceType: val.sourceType,
            youtubeId: val.youtubeId,
            duration: val.duration,
            score: val.score,
            rank: val.rank,
            timestamp: val.timestamp,
            dateString: val.dateString,
            sizeFormatted: val.sizeFormatted,
            latencyOffset: val.latencyOffset
          });
          cursor.continue();
        } else {
          resolve(list);
        }
      };

      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * 依 ID 取得單一作品的完整音訊 Blob
   */
  async getById(id) {
    await this.initPromise;
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(Number(id));

      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * 更新標題
   */
  async updateTitle(id, newTitle) {
    await this.initPromise;
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const getReq = store.get(Number(id));

      getReq.onsuccess = () => {
        const item = getReq.result;
        if (!item) return resolve(false);
        item.title = newTitle;
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = (e) => reject(e.target.error);
      };

      getReq.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * 刪除作品並釋放空間
   */
  async deleteRecording(id) {
    await this.initPromise;
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.delete(Number(id));

      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }
}

window.safeStorage = new SafeStorage();
