/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY MEMBER AUTHENTICATION & RBAC GUARD (auth.js)
 * Strict Domain Isolation: Zero references to other role portals.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  function escHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getAuthToken() {
    try {
      return localStorage.getItem('access_token') ||
             localStorage.getItem('token') ||
             localStorage.getItem('authToken') || '';
    } catch (_) {
      return '';
    }
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('auth_user') || localStorage.getItem('currentUser');
      if (!raw) return null;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (_) {
      return null;
    }
  }

  function getUserDisplayName(user) {
    if (!user) return 'Faculty Member';
    const name = user.full_name || user.name || user.username;
    if (name && name !== 'undefined' && name !== 'null' && String(name).trim() !== '') {
      return String(name).trim();
    }
    return user.email ? String(user.email).split('@')[0] : 'Faculty Member';
  }

  function getDeviceId() {
    try {
      let deviceId = localStorage.getItem('vidyaos_device_id');
      if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
        localStorage.setItem('vidyaos_device_id', deviceId);
      }
      return deviceId;
    } catch (_) {
      return 'dev_fallback_' + Date.now();
    }
  }

  function setAuthSession(token, user) {
    try {
      localStorage.setItem('access_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('currentUser', JSON.stringify(user));
    } catch (_) {}
  }

  function clearAuthSession() {
    try {
      // 1. Preserve only the user's explicit theme preference
      const savedTheme = localStorage.getItem('vidya_theme') || localStorage.getItem('theme');

      // 2. Clear ALL items in localStorage to prevent data leakage/stale session bugs
      try {
        localStorage.clear();
      } catch (_) {
        const authKeys = [
          'access_token', 'accessToken', 'token', 'authToken', 'auth_token', 'vidyaos_token',
          'refresh_token', 'user', 'auth_user', 'currentUser', 'vidyaos_user',
          'user_profile', 'user_roles', 'role', 'roles', 'session_id', 'vidyaos_device_id',
          'vidya_user_profile', 'vidya_selected_class', 'vidya_selected_dept', 'vidya_roster_cache'
        ];
        authKeys.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
      }

      // Restore user theme preference
      if (savedTheme) {
        try { localStorage.setItem('vidya_theme', savedTheme); } catch (_) {}
      }

      // 3. Clear ALL items in sessionStorage
      try {
        sessionStorage.clear();
      } catch (_) {}

      // 4. Clear all cookies across all paths and subdomains
      try {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (!name) continue;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname};`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
        }
      } catch (_) {}

      // 5. Purge CacheStorage (Service Worker / browser HTTP cache)
      if (typeof window !== 'undefined' && window.caches && window.caches.keys) {
        window.caches.keys().then(names => {
          return Promise.all(names.map(name => window.caches.delete(name)));
        }).catch(() => {});
      }

      // 6. Clear IndexedDB databases if supported and present
      if (typeof window !== 'undefined' && window.indexedDB && window.indexedDB.databases) {
        window.indexedDB.databases().then(dbs => {
          if (Array.isArray(dbs)) {
            dbs.forEach(db => {
              if (db && db.name && !db.name.includes('theme')) {
                try { window.indexedDB.deleteDatabase(db.name); } catch (_) {}
              }
            });
          }
        }).catch(() => {});
      }
    } catch (_) {}
  }

  function handleSessionRevocation(reason = 'session_transferred') {
    clearAuthSession();
    try {
      sessionStorage.setItem('vidya_logout_notice', reason === 'session_expired'
        ? 'Your session expired due to inactivity. Please sign in again.'
        : 'Your session has ended because this account was logged into from another device or signed out.');
    } catch (_) {}
    window.location.replace(`/login/index.html?reason=${encodeURIComponent(reason)}`);
  }

  function logout(reason = 'user_logout') {
    const token = getAuthToken();
    const refreshToken = localStorage.getItem('refresh_token') || '';
    const deviceId = getDeviceId();
    try {
      fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId
        },
        body: JSON.stringify({ device_id: deviceId, refresh_token: refreshToken }),
        keepalive: true,
        credentials: 'include'
      }).catch(() => {});
    } catch (_) {}
    clearAuthSession();
    try { sessionStorage.setItem('vidya_logged_out_flag', '1'); } catch (_) {}
    window.location.replace(`/login/index.html?reason=${encodeURIComponent(reason)}`);
  }

  function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;bottom:calc(64px + 1.25rem + env(safe-area-inset-bottom, 0px));right:1.5rem;display:flex;flex-direction:column;gap:0.6rem;z-index:99999;max-width:400px;pointer-events:none;';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = 'pointer-events:auto;animation:fadeIn 0.2s ease-out;margin-bottom:8px;padding:10px 16px;border-radius:6px;font-size:0.875rem;color:var(--text-white, #fff);box-shadow:var(--shadow-lg), 0 8px 24px rgba(0,0,0,0.18);';
    toast.style.background = type === 'error' ? 'var(--status-absent, #ef4444)' :
                            (type === 'success' ? 'var(--status-present, #22c55e)' :
                            (type === 'warning' ? 'var(--status-late, #f59e0b)' : 'var(--color-primary, #2563eb)'));
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  let _lastSyncTs = 0;
  let _syncPromise = null;
  async function syncCurrentUser(force = false) {
    const now = Date.now();
    if (!force && _syncPromise) return _syncPromise;
    if (!force && (now - _lastSyncTs) < 5000) return getCurrentUser();
    _lastSyncTs = now;
    _syncPromise = (async () => {
      try {
        const token = getAuthToken();
        if (!token) return null;
        const res = await fetch('/api/v1/auth/me', {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Device-Id': getDeviceId()
          }
        });
        if (res.status === 401) {
          const errJson = await res.json().catch(() => ({}));
          if (errJson?.error?.code === 'SESSION_REVOKED') {
            handleSessionRevocation();
            return null;
          }
        }
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const stored = getCurrentUser() || {};
            const merged = { ...stored, ...json.data };
            localStorage.setItem('user', JSON.stringify(merged));
            return merged;
          }
        }
      } catch (_) {} finally {
        _syncPromise = null;
      }
      return getCurrentUser();
    })();
    return _syncPromise;
  }

  let _heartbeatTimer = null;
  function startSessionHeartbeat() {
    if (_heartbeatTimer || typeof window === 'undefined') return;
    if (!getAuthToken()) return;
    _heartbeatTimer = setInterval(async () => {
      const curToken = getAuthToken();
      if (!curToken) {
        clearInterval(_heartbeatTimer);
        _heartbeatTimer = null;
        return;
      }
      try {
        const res = await fetch('/api/v1/auth/heartbeat', {
          headers: {
            'Authorization': `Bearer ${curToken}`,
            'X-Device-Id': getDeviceId()
          }
        });
        if (res.status === 401) {
          const data = await res.json().catch(() => ({}));
          if (data?.error?.code === 'SESSION_REVOKED') {
            clearInterval(_heartbeatTimer);
            _heartbeatTimer = null;
            handleSessionRevocation();
          }
        }
      } catch (_) {}
    }, 120000);
  }

  function initAppTheme() {
    try {
      const saved = localStorage.getItem('app_theme') || localStorage.getItem('theme') || localStorage.getItem('vidya_theme') || 'light';
      document.documentElement.setAttribute('data-theme', saved);
    } catch (_) {}
  }

  function toggleAppTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('app_theme', next);
      localStorage.setItem('theme', next);
      localStorage.setItem('vidya_theme', next);
    } catch (_) {}
    showToast(`Appearance changed to ${next === 'dark' ? 'Dark Mode' : 'Light Mode'}`, 'info', 2000);
  }

  function guardRoute(options = ['TEACHER', 'FACULTY', 'HOD', 'DEPT_HEAD', 'COMMON_FACULTY_MANAGER', 'SYSTEM_ADMIN']) {
    const token = getAuthToken();
    const user = getCurrentUser();

    if (!token || !user) {
      clearAuthSession();
      window.location.replace('/login/index.html?reason=unauthenticated');
      return null;
    }

    syncCurrentUser();
    startSessionHeartbeat();

    const defaultAllowed = ['TEACHER', 'FACULTY', 'HOD', 'DEPT_HEAD', 'COMMON_FACULTY_MANAGER', 'SYSTEM_ADMIN'];
    let allowedRoles = defaultAllowed;
    if (Array.isArray(options) && options.length > 0) {
      allowedRoles = options;
    } else if (options && typeof options === 'object') {
      allowedRoles = options.roles || options.requireRoles || defaultAllowed;
    }

    const normalizedAllowed = allowedRoles.map(r => String(r).toUpperCase());
    const userRoles = [];
    if (Array.isArray(user.roles)) {
      user.roles.forEach(r => userRoles.push(String(r).toUpperCase()));
    }
    if (user.role) userRoles.push(String(user.role).toUpperCase());
    if (user.is_hod) { userRoles.push('HOD', 'DEPT_HEAD', 'TEACHER', 'FACULTY'); }
    if (user.is_common_faculty_manager) { userRoles.push('COMMON_FACULTY_MANAGER'); }

    const isAuthorized = userRoles.some(r => normalizedAllowed.includes(r));
    if (!isAuthorized) {
      showToast('Access Denied: You do not have permission to view this portal.', 'error');
      window.location.replace('/login/index.html?reason=unauthorized');
      return null;
    }

    const isAdmin = userRoles.includes('SYSTEM_ADMIN') || userRoles.includes('ADMIN');
    if (isAdmin && (window.location.pathname.endsWith('/faculty/dashboard/index.html') || window.location.pathname.endsWith('/faculty/dashboard/') || window.location.pathname.endsWith('/faculty/dashboard'))) {
      window.location.replace('/admin/dashboard/index.html');
      return null;
    }

    return user;
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', (e) => {
      if ((e.key === 'access_token' || e.key === 'token' || e.key === 'accessToken') && !e.newValue) {
        if (window.location && !window.location.pathname.includes('/login')) {
          window.location.replace('/login/index.html?reason=session_ended');
        }
      }
    });
  }

  initAppTheme();

  const PortalAuth = {
    escHtml,
    escapeHtml: escHtml,
    getAuthToken,
    getToken: getAuthToken,
    getAccessToken: getAuthToken,
    getCurrentUser,
    getUserDisplayName,
    getDeviceId,
    setAuthSession,
    clearAuthSession,
    handleSessionRevocation,
    syncCurrentUser,
    startSessionHeartbeat,
    toggleAppTheme,
    logout,
    showToast,
    guardRoute,
    requireAuth: guardRoute
  };

  window.FacultyAuth = PortalAuth;
  window.escHtml = escHtml;
  if (!window.esc) window.esc = escHtml;
  if (!window.escapeHtml) window.escapeHtml = escHtml;
  window.getAuthToken = getAuthToken;
  window.getToken = getAuthToken;
  window.getAccessToken = getAuthToken;
  window.getCurrentUser = getCurrentUser;
  window.getUserDisplayName = getUserDisplayName;
  window.getDeviceId = getDeviceId;
  window.setAuthSession = setAuthSession;
  window.clearAuthSession = clearAuthSession;
  window.handleSessionRevocation = handleSessionRevocation;
  window.syncCurrentUser = syncCurrentUser;
  window.toggleAppTheme = toggleAppTheme;
  window.logout = logout;
  window.handleLogout = logout;
  window.guardRoute = guardRoute;
  window.requireAuth = guardRoute;
  if (typeof window.showToast !== 'function') {
    window.showToast = showToast;
  }
})();

window.requireFacultyAuth = window.guardRoute;
window.facultyLogout = window.logout;

// Prevent Back-Forward Cache (bfcache) resurrecting stale authenticated pages after logout
if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      const token = typeof window.getAuthToken === 'function' ? window.getAuthToken() : (localStorage.getItem('access_token') || localStorage.getItem('token'));
      const path = window.location.pathname;
      if (!token && !path.includes('/login') && path !== '/' && !path.includes('/landing')) {
        if (typeof window.clearAuthSession === 'function') {
          window.clearAuthSession();
        }
        window.location.replace('/login/index.html?reason=session_ended');
      }
    }
  });
}
