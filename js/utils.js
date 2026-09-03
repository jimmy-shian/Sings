/**
 * SingStudio - 核心共用工具庫 (Common Utilities)
 * 遵循 OpenDesign 規範：無裝飾性代碼、高資訊密度、單一真理來源
 */

const Utils = {
  /**
   * 時間格式化 (秒 -> mm:ss)
   */
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  },

  /**
   * LRC 時間戳格式化 (秒 -> mm:ss.xx)
   */
  formatTimeLrc(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00.00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  },

  /**
   * 檔案大小格式化 (Bytes -> KB / MB)
   */
  formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  },

  /**
   * HTML 跳脫防止 XSS
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  },

  /**
   * OpenDesign 1-Click 互動式複製至剪貼簿
   */
  async copyText(text, targetElement) {
    try {
      await navigator.clipboard.writeText(text);
      if (targetElement) {
        const originalText = targetElement.dataset.originalText || targetElement.textContent;
        targetElement.dataset.originalText = originalText;
        targetElement.textContent = '已複製';
        targetElement.classList.add('copy-success');
        setTimeout(() => {
          targetElement.textContent = originalText;
          targetElement.classList.remove('copy-success');
        }, 1500);
      }
      return true;
    } catch (err) {
      console.warn('剪貼簿寫入失敗:', err);
      return false;
    }
  },

  /**
   * 下載 Blob 檔案
   */
  downloadBlob(blob, filename) {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'recording.wav';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  },

  /**
   * 安全 ObjectURL 物件池 (管理 RAM 釋放，防記憶體洩漏)
   */
  urlPool: {
    pool: new Set(),
    create(blob) {
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      this.pool.add(url);
      return url;
    },
    revoke(url) {
      if (url && this.pool.has(url)) {
        URL.revokeObjectURL(url);
        this.pool.delete(url);
      }
    },
    clear() {
      for (const url of this.pool) {
        URL.revokeObjectURL(url);
      }
      this.pool.clear();
    }
  }
};

window.Utils = Utils;
