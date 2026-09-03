/**
 * SingStudio 統一版本配置中心 (Single Source of Truth)
 * 唯一版本源為根目錄的 version.json，所有模組均由此引用
 */
(function() {
  const DEFAULT_VERSION = '0.0.2';
  window.APP_VERSION = DEFAULT_VERSION;

  function updateDomVersion(ver) {
    window.APP_VERSION = ver;
    const badge = document.getElementById('appVersionBadge');
    if (badge) badge.textContent = 'v' + ver;
    const titles = document.querySelectorAll('.app-ver-text');
    titles.forEach(el => el.textContent = 'v' + ver);
  }

  // 嘗試動態獲取 version.json
  fetch('/version.json')
    .then(res => res.json())
    .then(data => {
      if (data && data.version) {
        updateDomVersion(data.version);
      }
    })
    .catch(() => {
      updateDomVersion(DEFAULT_VERSION);
    });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => updateDomVersion(window.APP_VERSION));
  } else {
    updateDomVersion(window.APP_VERSION);
  }
})();
