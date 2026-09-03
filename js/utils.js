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

/**
 * 統一 UI 通知與互動對話框系統 (Toast & Modal Card)
 * 取代原生 alert / confirm，遵循 OpenDesign 極簡現代暗色調卡片設計
 */
const UI = {
  toast(message, type = 'info', duration = 2800) {
    let container = document.getElementById('uiToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'uiToastContainer';
      container.className = 'ui-toast-container';
      document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    toastEl.className = `ui-toast ui-toast-${type}`;
    
    let iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    if (type === 'success') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'warning') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    }

    toastEl.innerHTML = `
      ${iconSvg}
      <span class="toast-msg">${Utils.escapeHtml(message)}</span>
    `;

    container.appendChild(toastEl);

    // 進場動畫
    requestAnimationFrame(() => {
      toastEl.classList.add('show');
    });

    // 自動移除
    setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => {
        if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
      }, 300);
    }, duration);
  },

  alert(message, title = '系統提示') {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'custom-dialog-overlay';
      modal.innerHTML = `
        <div class="custom-dialog-card">
          <div class="custom-dialog-header">
            <span class="custom-dialog-title">${Utils.escapeHtml(title)}</span>
          </div>
          <div class="custom-dialog-body">
            <p>${Utils.escapeHtml(message).replace(/\n/g, '<br>')}</p>
          </div>
          <div class="custom-dialog-footer">
            <button class="btn btn-primary btn-confirm">確定</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      requestAnimationFrame(() => modal.classList.add('open'));

      const confirmBtn = modal.querySelector('.btn-confirm');
      confirmBtn.focus();

      function closeDialog() {
        modal.classList.remove('open');
        setTimeout(() => {
          if (modal.parentNode) modal.parentNode.removeChild(modal);
        }, 200);
        resolve();
      }

      confirmBtn.addEventListener('click', closeDialog);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeDialog();
      });
    });
  },

  confirm(message, title = '請確認操作') {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'custom-dialog-overlay';
      modal.innerHTML = `
        <div class="custom-dialog-card">
          <div class="custom-dialog-header">
            <span class="custom-dialog-title">${Utils.escapeHtml(title)}</span>
          </div>
          <div class="custom-dialog-body">
            <p>${Utils.escapeHtml(message).replace(/\n/g, '<br>')}</p>
          </div>
          <div class="custom-dialog-footer">
            <button class="btn btn-cancel">取消</button>
            <button class="btn btn-primary btn-confirm">確定</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      requestAnimationFrame(() => modal.classList.add('open'));

      const cancelBtn = modal.querySelector('.btn-cancel');
      const confirmBtn = modal.querySelector('.btn-confirm');
      confirmBtn.focus();

      function finish(result) {
        modal.classList.remove('open');
        setTimeout(() => {
          if (modal.parentNode) modal.parentNode.removeChild(modal);
        }, 200);
        resolve(result);
      }

      confirmBtn.addEventListener('click', () => finish(true));
      cancelBtn.addEventListener('click', () => finish(false));
      modal.addEventListener('click', (e) => {
        if (e.target === modal) finish(false);
      });
    });
  }
};

window.Utils = Utils;
window.UI = UI;
