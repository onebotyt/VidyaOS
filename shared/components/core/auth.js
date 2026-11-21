/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS UNIFIED AUTHENTICATION & SESSION ENGINE (auth.js)
 * Location: /shared/components/core/auth.js
 * 
 * - Multi-Role Route Guarding (Admin, Faculty, Student)
 * - Automatic Session Validation & Heartbeat
 * - Cross-Tab Session Synchronization & Logout Broadcast
 * - Theme Initialization & bfcache Protection
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

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

  function getCurrentUser() {
    try {
      const u = localStorage.getItem('user') || localStorage.getItem('auth_user');
      return u ? JSON.parse(u) : null;
    } catch (_) {
      return null;
    }
  }

  function setCurrentUser(user) {
    try {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('auth_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('auth_user');
      }
    } catch (_) {}
  }

  function clearAuthSession() {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_user');
      sessionStorage.clear();
    } catch (_) {}
  }

  function logout(reason = 'manual') {
    clearAuthSession();
    try { sessionStorage.setItem('vidya_logged_out_flag', '1'); } catch (_) {}
    window.location.replace(`/login/index.html?reason=${encodeURIComponent(reason)}`);
  }

  /**
   * Heartbeat session verification
   */
  let _heartbeatInterval = null;
  function startSessionHeartbeat() {
    if (_heartbeatInterval) return;
    _heartbeatInterval = setInterval(async () => {
      const token = getAuthToken();
      if (!token) return;
      try {
        if (typeof fetchApi === 'function') {
          await fetchApi('/auth/me', { suppressToast: true, noCache: true });
        }
      } catch (err) {
        if (err?.status === 401) {
          logout('expired');
        }
      }
    }, 120000);
  }

  /**
   * Apply saved theme
   */
  function initTheme() {
    try {
      const saved = localStorage.getItem('app_theme') || localStorage.getItem('theme') || localStorage.getItem('vidya_theme') || 'light';
      document.documentElement.setAttribute('data-theme', saved);
    } catch (_) {}
  }
  initTheme();

  /**
   * Role Guard: Admin, Faculty, or Student
   */
  function guardRoute(options) {
    const token = getAuthToken();
    const user = getCurrentUser();

    if (!token || !user) {
      logout('unauthenticated');
      return null;
    }

    startSessionHeartbeat();

    // Determine allowed roles
    const currentPath = (window.location.pathname || '').toLowerCase();
    let defaultAllowed = ['SYSTEM_ADMIN', 'ADMIN', 'TEACHER', 'FACULTY', 'HOD', 'DEPT_HEAD', 'STUDENT'];

    if (currentPath.includes('/admin/')) {
      defaultAllowed = ['SYSTEM_ADMIN', 'ADMIN'];
    } else if (currentPath.includes('/faculty/')) {
      defaultAllowed = ['TEACHER', 'FACULTY', 'HOD', 'DEPT_HEAD', 'COMMON_FACULTY_MANAGER', 'SYSTEM_ADMIN', 'ADMIN'];
    } else if (currentPath.includes('/student/')) {
      defaultAllowed = ['STUDENT'];
    }

    const allowedRoles = (Array.isArray(options) && options.length > 0) ? options : defaultAllowed;
    const normalizedAllowed = allowedRoles.map(r => String(r).toUpperCase());

    const userRoles = [];
    if (Array.isArray(user.roles)) {
      user.roles.forEach(r => userRoles.push(String(r).toUpperCase()));
    }
    if (user.role) userRoles.push(String(user.role).toUpperCase());
    if (user.is_admin) userRoles.push('SYSTEM_ADMIN', 'ADMIN');
    if (user.is_hod) userRoles.push('HOD', 'DEPT_HEAD', 'TEACHER', 'FACULTY');
    if (user.is_common_faculty_manager) userRoles.push('COMMON_FACULTY_MANAGER');

    const isAuthorized = userRoles.some(r => normalizedAllowed.includes(r));
    if (!isAuthorized) {
      if (window.VidyaUI) window.VidyaUI.toast('Access denied. Redirecting...', 'error');
      setTimeout(() => logout('unauthorized'), 1200);
      return null;
    }

    return user;
  }

  function isAuthenticated() {
    return Boolean(getAuthToken());
  }

  // Unified PortalAuth Object
  const PortalAuth = {
    getAuthToken,
    getToken: getAuthToken,
    getCurrentUser,
    getUser: getCurrentUser,
    setCurrentUser,
    setUser: setCurrentUser,
    clearAuthSession,
    isAuthenticated,
    logout,
    guardRoute,
    requireAuth: guardRoute,
    initTheme
  };

  window.VidyaAuth = PortalAuth;
  window.AdminAuth = PortalAuth;
  window.FacultyAuth = PortalAuth;
  window.StudentAuth = PortalAuth;

  window.guardRoute = guardRoute;
  window.requireAuth = guardRoute;
  window.logout = logout;
  window.getCurrentUser = getCurrentUser;
  window.getAuthToken = getAuthToken;

  // Prevent bfcache from displaying stale authenticated pages
  window.addEventListener('pageshow', function (event) {
    if (event.persisted && !getAuthToken() && !window.location.pathname.includes('/login/')) {
      window.location.replace('/login/index.html?reason=back_cache');
    }
  });

})();
