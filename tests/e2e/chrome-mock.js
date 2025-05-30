// Mock minimal de l'API Chrome pour les tests UI Playwright
window.chrome = window.chrome || {};
window.chrome.runtime = window.chrome.runtime || {};
window.chrome.runtime.onMessage = {
  addListener: () => {},
};
window.chrome.runtime.sendMessage = (...args) => {
  return Promise.resolve();
};
window.chrome.storage = {
  local: {
    get: (keys, cb) => cb && cb({}),
    set: (items, cb) => cb && cb(),
    remove: (keys, cb) => cb && cb(),
  }
};
// Ajoute d'autres mocks si besoin (chrome.tabs, chrome.i18n, etc.) 