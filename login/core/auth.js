/**
 * VidyaOS Public Login Session Helper (Isolated for /login)
 */
(function () {
  'use strict';
  function getAuthToken() {
    try { return localStorage.getItem('access_token') || ''; } catch (_) { return ''; }
  }
  function getDeviceId() {
    try {
      let id = localStorage.getItem('vidyaos_device_id');
      if (!id) {
        id = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
        localStorage.setItem('vidyaos_device_id', id);
      }
      return id;
    } catch (_) { return 'dev_fallback_' + Date.now(); }
  }
  function setAuthSession(token, user, refreshToken) {
    try {
      localStorage.setItem('access_token', token);
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('currentUser', JSON.stringify(user));
      if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    } catch (_) {}
  }
  function getCurrentUser() {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }
  function initAppTheme() {
    try {
      const t = localStorage.getItem('app_theme') || localStorage.getItem('theme') || 'light';
      document.documentElement.setAttribute('data-theme', t);
    } catch (_) {}
  }
  initAppTheme();
  window.getAuthToken = getAuthToken;
  window.getToken = getAuthToken;
  window.getAccessToken = getAuthToken;
  window.getDeviceId = getDeviceId;
  window.setAuthSession = setAuthSession;
  window.getCurrentUser = getCurrentUser;
})();
