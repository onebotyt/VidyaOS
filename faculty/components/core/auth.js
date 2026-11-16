/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY AUTHENTICATION & RBAC GUARD (auth.js)
 * Location: /faculty/components/core/auth.js
 * 
 * Strict Domain Isolation: Autonomous authentication, session management,
 * RBAC authorization, and XSS sanitization engine for the Faculty Portal.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /**
   * HTML entity escaper for safe DOM rendering (XSS Protection)
   */
  function escHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Token retrieval with backward compatibility fallback
   */
  function getAuthToken() {
    try {
      return localStorage.getItem('access_token') || 
             localStorage.getItem('token') || 
             localStorage.getItem('authToken') || 
             '';
    } catch (_) {
      return '';
    }
  }

  function getToken() {
    return getAuthToken();
  }

  function getAccessToken() {
    return getAuthToken();
  }

  /**
   * Retrieve active user object from local storage
   */
  function getCurrentUser() {
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('auth_user') || localStorage.getItem('currentUser');
      if (!raw) return null;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (_) {
      return null;
    }
  }

  /**
   * Generate or retrieve persistent device ID
   */
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

  /**
   * Establish authenticated session
   */
  function setAuthSession(token, user) {
    try {
      localStorage.setItem('access_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('auth_user', JSON.stringify(user));
    } catch (_) {}
  }

  /**
   * Clear all auth session tokens and cache
   */
  function clearAuthSession() {
    try {
      const authKeys = [
        'access_token', 'accessToken', 'token', 'authToken', 'auth_token', 'vidyaos_token',
        'refresh_token', 'user', 'auth_user', 'currentUser', 'vidyaos_user',
        'user_profile', 'user_roles', 'role', 'roles', 'session_id'
      ];
      authKeys.forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
      sessionStorage.clear();
      document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
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

  /**
   * User logout handler with redirection
   */
  function logout(reason = 'user_logout') {
    clearAuthSession();
    window.location.replace(`/login/index.html?reason=${encodeURIComponent(reason)}`);
  }

  /**
   * Built-in fallback toast notification system
   */
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
    toast.style.cssText = 'pointer-events:auto;animation:fadeIn 0.2s ease-out;margin-bottom:8px;padding:10px 16px;border-radius:6px;font-size:0.875rem;color:var(--text-white, #fff);box-shadow:var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1)), 0 8px 24px rgba(0,0,0,0.18);';
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

  /**
   * Faculty RBAC Route Guard: Requires TEACHER, HOD, or SYSTEM_ADMIN
   * Supports array of roles or config object { roles: [...], requireRoles: [...] }
   */
  function requireFacultyAuth(inputRoles = ['TEACHER', 'HOD', 'SYSTEM_ADMIN']) {
    let allowedRoles = ['TEACHER', 'HOD', 'SYSTEM_ADMIN'];
    if (Array.isArray(inputRoles) && inputRoles.length > 0) {
      allowedRoles = inputRoles;
    } else if (inputRoles && typeof inputRoles === 'object') {
      allowedRoles = inputRoles.roles || inputRoles.requireRoles || allowedRoles;
    }

    const token = getAuthToken();
    const user = getCurrentUser();

    if (!token || !user) {
      clearAuthSession();
      window.location.replace('/login/index.html?reason=unauthenticated');
      return false;
    }

    const normalizedAllowed = allowedRoles.map(r => String(r).toUpperCase());
    const userRoles = [];
    if (Array.isArray(user.roles)) {
      user.roles.forEach(r => userRoles.push(String(r).toUpperCase()));
    }
    if (user.role) userRoles.push(String(user.role).toUpperCase());
    if (user.is_hod) {
      userRoles.push('HOD');
      userRoles.push('TEACHER');
    }

    const isAuthorized = userRoles.some(r => normalizedAllowed.includes(r));

    if (!isAuthorized) {
      if (userRoles.includes('STUDENT')) {
        window.location.replace('/student/dashboard/index.html');
        return false;
      }
      showToast('You do not have permission to access Faculty pages.', 'error');
      setTimeout(() => {
        window.location.replace('/login/index.html?reason=unauthorized');
      }, 1200);
      return false;
    }

    return true;
  }

  // Cross-tab logout listener (guarded: never trigger if already on login page)
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', (e) => {
      if ((e.key === 'access_token' || e.key === 'token' || e.key === 'accessToken') && !e.newValue) {
        if (window.location && typeof window.location.replace === 'function') {
          if (window.location.pathname.includes('/login')) return;
          window.location.replace('/login/index.html?reason=session_ended');
        }
      }
    });
  }

  // Auto-capture OAuth tokens from URL if present
  if (typeof window !== 'undefined' && window.location && window.location.search) {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const oauthToken = urlParams.get('token');
      const oauthUser = urlParams.get('user');
      if (oauthToken) {
        localStorage.setItem('access_token', oauthToken);
        localStorage.setItem('token', oauthToken);
        if (oauthUser) {
          try {
            localStorage.setItem('user', JSON.stringify(JSON.parse(oauthUser)));
          } catch (_) {
            localStorage.setItem('user', oauthUser);
          }
        }
        urlParams.delete('token');
        urlParams.delete('user');
        const cleanQuery = urlParams.toString();
        const cleanUrl = window.location.pathname + (cleanQuery ? '?' + cleanQuery : '') + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (_) {}
  }

  // Export to window
  const FacultyAuth = {
    escHtml,
    getAuthToken,
    getToken,
    getAccessToken,
    getCurrentUser,
    getDeviceId,
    setAuthSession,
    clearAuthSession,
    handleSessionRevocation,
    logout,
    showToast,
    requireFacultyAuth,
    requireAuth: requireFacultyAuth,
    guardRoute: requireFacultyAuth
  };

  window.FacultyAuth = FacultyAuth;
  window.escHtml = escHtml;
  window.getAuthToken = getAuthToken;
  window.getToken = getToken;
  window.getAccessToken = getAccessToken;
  window.getCurrentUser = getCurrentUser;
  window.getDeviceId = getDeviceId;
  window.setAuthSession = setAuthSession;
  window.clearAuthSession = clearAuthSession;
  window.handleSessionRevocation = handleSessionRevocation;
  window.logout = logout;
  window.requireFacultyAuth = requireFacultyAuth;
  window.requireAuth = requireFacultyAuth;
  window.guardRoute = requireFacultyAuth;

  if (typeof window.showToast !== 'function') {
    window.showToast = showToast;
  }
})();
