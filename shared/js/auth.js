
/**
 * Shared Client Authentication, Session Management & RBAC Guard
 * Location: /shared/js/auth.js
 */

function getAuthToken() {
  return localStorage.getItem('access_token');
}

function getToken() {
  return typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('access_token') || '');
}

function getAccessToken() {
  return typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('access_token') || '');
}

if (typeof window !== 'undefined') {
  window.getAuthToken = getAuthToken;
  window.getToken = getToken;
  window.getAccessToken = getAccessToken;
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
if (typeof window !== 'undefined') {
  window.getDeviceId = getDeviceId;
}

function setAuthSession(token, user) {
  localStorage.setItem('access_token', token);
  localStorage.setItem('user', JSON.stringify(user));
  try {
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
  } catch (_) { }
}
if (typeof window !== 'undefined') {
  window.setAuthSession = setAuthSession;
}

// Auto-capture token and user if redirected from OAuth callback URL
if (typeof window !== 'undefined' && window.location && window.location.search) {
  try {
    const _urlParams = new URLSearchParams(window.location.search);
    const _oauthToken = _urlParams.get('token');
    const _oauthUser = _urlParams.get('user');
    if (_oauthToken) {
      localStorage.setItem('access_token', _oauthToken);
      if (_oauthUser) {
        try { localStorage.setItem('user', JSON.stringify(JSON.parse(_oauthUser))); }
        catch (_) { localStorage.setItem('user', _oauthUser); }
      }
      _urlParams.delete('token');
      _urlParams.delete('user');
      const _newQuery = _urlParams.toString();
      const _cleanUrl = window.location.pathname + (_newQuery ? '?' + _newQuery : '') + window.location.hash;
      window.history.replaceState({}, document.title, _cleanUrl);
    }
  } catch (_e) {
    console.warn('OAuth URL param capture warning:', _e);
  }
}

// Fallback showToast to guarantee no ReferenceError occurs if ui.js is omitted
if (typeof window !== 'undefined' && typeof window.showToast !== 'function') {
  window.showToast = function (message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;bottom:calc(64px + 1.25rem + env(safe-area-inset-bottom, 0px));right:1.5rem;display:flex;flex-direction:column;gap:0.6rem;z-index:99999;max-width:400px;pointer-events:none;';
      document.body.appendChild(container);
    } else if (!container.style.position) {
      container.style.cssText = 'position:fixed;bottom:calc(64px + 1.25rem + env(safe-area-inset-bottom, 0px));right:1.5rem;display:flex;flex-direction:column;gap:0.6rem;z-index:99999;max-width:400px;pointer-events:none;';
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = 'pointer-events:auto;animation: fadeIn 0.2s ease-out; margin-bottom: 8px; padding: 10px 16px; border-radius: 6px; font-size: 0.875rem; color: var(--text-white); box-shadow: var(--shadow-lg), 0 8px 24px hsl(0 0% 0% / 0.18);';
    toast.style.background = type === 'error' ? 'var(--status-absent)' : (type === 'success' ? 'var(--status-present)' : (type === 'warning' ? 'var(--status-late)' : 'var(--color-primary)'));
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  };
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    // Sanitize any stale orphaned COMMON_FACULTY_MANAGER role if user is not active manager
    if (user && !user.is_common_faculty_manager && user.roles && user.roles.includes('COMMON_FACULTY_MANAGER')) {
      user.roles = user.roles.filter(r => r !== 'COMMON_FACULTY_MANAGER');
      localStorage.setItem('user', JSON.stringify(user));
    }
    return user;
  } catch {
    return null;
  }
}

async function syncCurrentUser() {
  const token = getAuthToken();
  if (!token) return;
  try {
    const res = await fetch('/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Device-Id': getDeviceId()
      }
    });
    if (res.status === 401) {
      const errJson = await res.json().catch(() => ({}));
      if (errJson?.error?.code === 'SESSION_REVOKED') {
        handleSessionRevocation();
        return;
      }
    }
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const stored = getCurrentUser() || {};
        const rolesChanged = JSON.stringify(stored.roles) !== JSON.stringify(json.data.roles);
        const cfmChanged = Boolean(stored.is_common_faculty_manager) !== Boolean(json.data.is_common_faculty_manager);
        const hodChanged = Boolean(stored.is_hod) !== Boolean(json.data.is_hod);

        localStorage.setItem('user', JSON.stringify({ ...stored, ...json.data }));

        if (rolesChanged || cfmChanged || hodChanged) {
          const existingSidebar = document.getElementById('app-sidebar');
          if (existingSidebar) {
            existingSidebar.remove();
            renderSidebar();
          }
          if (typeof renderHeaderUser === 'function') {
            renderHeaderUser();
          }
        }
      }
    }
  } catch (_) { }
}

function handleSessionRevocation(reason = 'session_transferred') {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  try {
    sessionStorage.setItem('vidya_logout_notice', reason === 'session_expired'
      ? 'Your session expired due to inactivity. Please sign in again.'
      : 'Your session has ended because this account was logged into from another device or signed out.');
  } catch (_) { }
  window.location.href = `/login/index.html?reason=${encodeURIComponent(reason)}`;
}

let _heartbeatTimer = null;
function startSessionHeartbeat() {
  if (_heartbeatTimer || typeof window === 'undefined') return;
  const token = getAuthToken();
  if (!token) return;

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
    } catch (_) { }
  }, 120000);
}

function logout() {
  const token = getAuthToken();
  const deviceId = getDeviceId();
  if (token) {
    fetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId
      },
      body: JSON.stringify({ device_id: deviceId })
    }).catch(() => { });
  }
  if (_heartbeatTimer) {
    clearInterval(_heartbeatTimer);
    _heartbeatTimer = null;
  }
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  window.location.href = '/index.html';
}

/**
 * Strong Role-Based Route Guard
 * @param {Array|Object} options - Either an array of allowed roles or an options object:
 *   {
 *     roles: ['TEACHER', 'SYSTEM_ADMIN'],
 *     requireHOD: true,            // Requires HOD assignment (or SYSTEM_ADMIN)
 *     requireClassTeacher: true,    // Requires CLASS_TEACHER assignment (or SYSTEM_ADMIN)
 *     requireSubjects: true         // Requires active assigned subjects (or SYSTEM_ADMIN/HOD)
 *   }
 */
function guardRoute(options = []) {
  const user = getCurrentUser();
  const token = getAuthToken();

  if (!token || !user) {
    window.location.href = '/index.html';
    return false;
  }

  // Auto-sync session profile in background & start session heartbeat
  syncCurrentUser();
  startSessionHeartbeat();

  const config = Array.isArray(options) ? { roles: options } : (options || {});
  const allowedRoles = config.roles || config.requireRoles || [];

  // 1. Role verification
  if (allowedRoles.length > 0) {
    const hasRole = user.roles && user.roles.some(r => allowedRoles.includes(r));
    if (!hasRole) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('flash_toast', JSON.stringify({ message: 'Access Denied: You do not have permission to view this portal.', type: 'error' }));
        }
      } catch (_) { }
      if (typeof showToast === 'function') {
        showToast('Access Denied: You do not have permission to view this portal.', 'error');
      }
      if (user.roles?.includes('STUDENT')) {
        window.location.href = '/student/dashboard';
      } else if (user.roles?.includes('TEACHER')) {
        window.location.href = '/faculty/dashboard';
      } else if (user.roles?.includes('SYSTEM_ADMIN')) {
        window.location.href = '/admin/dashboard';
      } else {
        window.location.href = '/index.html';
      }
      return false;
    }
  }

  // 2. HOD administrative requirement
  if (config.requireHOD && !user.roles?.includes('SYSTEM_ADMIN')) {
    if (!user.is_hod) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('flash_toast', JSON.stringify({ message: 'Access Denied: Head of Department (HOD) authorization required.', type: 'error' }));
        }
      } catch (_) { }
      window.location.href = '/faculty/dashboard';
      return false;
    }
  }

  // 3. Department faculty authorization (Any branch faculty can manage students & cohorts)
  if ((config.requireDepartmentFaculty || config.requireClassTeacher) && !user.roles?.includes('SYSTEM_ADMIN')) {
    const isDeptFaculty = Boolean(user.department_id || user.teacher?.department_id || user.is_class_teacher || user.is_hod || user.roles?.includes('TEACHER'));
    if (!isDeptFaculty) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('flash_toast', JSON.stringify({ message: 'Access Denied: Department faculty authorization required.', type: 'error' }));
        }
      } catch (_) { }
      window.location.href = '/faculty/dashboard';
      return false;
    }
  }

  // 4. Subject assignment requirement
  if (config.requireSubjects && !user.roles?.includes('SYSTEM_ADMIN') && !user.is_hod) {
    if (!user.has_assigned_subjects) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('flash_toast', JSON.stringify({ message: 'No subjects have been assigned to you yet.', type: 'info' }));
        }
      } catch (_) { }
      window.location.href = '/faculty/dashboard';
      return false;
    }
  }

  // 5. Common Faculty Manager requirement
  if (config.requireCommonFacultyManager && !user.roles?.includes('SYSTEM_ADMIN')) {
    if (!user.is_common_faculty_manager && !user.roles?.includes('COMMON_FACULTY_MANAGER')) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('flash_toast', JSON.stringify({ message: 'Access Denied: Common Faculty Manager authorization required.', type: 'error' }));
        }
      } catch (_) { }
      window.location.href = '/faculty/dashboard';
      return false;
    }
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      const flash = sessionStorage.getItem('flash_toast');
      if (flash) {
        sessionStorage.removeItem('flash_toast');
        const parsed = JSON.parse(flash);
        setTimeout(() => {
          if (typeof showToast === 'function') showToast(parsed.message, parsed.type);
        }, 300);
      }
    }
  } catch (_) { }

  const currentPath = (window.location && window.location.pathname ? window.location.pathname : '').toLowerCase();
  if (!currentPath.startsWith('/admin') && !currentPath.startsWith('/faculty') && !currentPath.includes('/faculty/')) {
    try {
      mountNavigationSystem();
    } catch (err) {
      console.error('Error in mountNavigationSystem:', err);
    }
  }

  return true;
}

function getUserDisplayName(user) {
  if (!user) return 'User';
  let name = user.full_name || user.name || user.username;
  if (!name || name === 'undefined' || name === 'null' || name.trim() === '') {
    if (user.roles?.includes('SYSTEM_ADMIN')) {
      return 'System Administrator';
    } else if (user.roles?.includes('TEACHER')) {
      return user.is_hod ? 'Head of Department' : 'Faculty Member';
    } else if (user.roles?.includes('STUDENT')) {
      return 'Student';
    } else if (user.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  }
  return name;
}

// ─────────────────────────────────────────────────────────
// SIDEBAR NAVIGATION (Persistent Collapsible)
// ─────────────────────────────────────────────────────────

function _getSidebarState() {
  try {
    return localStorage.getItem('sidebar_open') !== 'false';
  } catch (_) {
    return true;
  }
}

function _setSidebarState(open) {
  try {
    localStorage.setItem('sidebar_open', open ? 'true' : 'false');
  } catch (_) { }
}

function _updateMenuToggleButtons(isOpen) {
  const hamburgerSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';

  const btns = document.querySelectorAll('#sidebar-toggle-btn, #btn-menu-toggle, .gc-navbar .gc-menu-btn, .app-header .sidebar-toggle-btn');
  btns.forEach(btn => {
    btn.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;">${hamburgerSvg}</span>`;
    btn.setAttribute('aria-label', isOpen ? 'Close navigation sidebar' : 'Open navigation sidebar');
    btn.setAttribute('title', isOpen ? 'Close Main Menu' : 'Main Menu');
    btn.setAttribute('aria-pressed', isOpen ? 'true' : 'false');
  });
}

function toggleSidebar(forceState) {
  const sidebar = document.getElementById('app-sidebar') || document.getElementById('classroom-drawer') || document.getElementById('gc-drawer');
  const backdrop = document.getElementById('sidebar-backdrop') || document.getElementById('classroom-drawer-backdrop') || document.getElementById('gc-drawer-backdrop');
  if (!sidebar) return;

  const isCurrentlyOpen = sidebar.classList.contains('sidebar-open') || sidebar.classList.contains('open') || document.body.classList.contains('sidebar-open');
  const shouldOpen = typeof forceState === 'boolean' ? forceState : !isCurrentlyOpen;

  if (shouldOpen) {
    sidebar.classList.add('sidebar-open', 'open');
    sidebar.classList.remove('sidebar-closed');
    document.body.classList.add('sidebar-open');
    document.body.classList.remove('sidebar-closed');
    if (backdrop) {
      backdrop.classList.add('active', 'open');
    }
  } else {
    sidebar.classList.remove('sidebar-open', 'open');
    sidebar.classList.add('sidebar-closed');
    document.body.classList.remove('sidebar-open');
    document.body.classList.add('sidebar-closed');
    if (backdrop) {
      backdrop.classList.remove('active', 'open');
    }
  }

  _setSidebarState(shouldOpen);
  _updateMenuToggleButtons(shouldOpen);
}

function closeSidebar() {
  toggleSidebar(false);
}

function _initSidebarState() {
  if (typeof window !== 'undefined' && (
    (window.location && window.location.pathname && window.location.pathname.toLowerCase().startsWith('/admin')) ||
    Boolean(document.querySelector('.admin-sidebar, .admin-app-layout, .admin-dashboard-page'))
  )) {
    return;
  }
  const sidebar = document.getElementById('app-sidebar') || document.getElementById('classroom-drawer') || document.getElementById('gc-drawer');
  const backdrop = document.getElementById('sidebar-backdrop') || document.getElementById('classroom-drawer-backdrop') || document.getElementById('gc-drawer-backdrop');

  if (sidebar) {
    sidebar.classList.remove('sidebar-open', 'open');
    sidebar.classList.add('sidebar-closed');
    document.body.classList.remove('sidebar-open');
    document.body.classList.add('sidebar-closed');
    if (backdrop) {
      backdrop.classList.remove('active', 'open');
    }
  }
  _updateMenuToggleButtons(false);
}

// Global aliases to ensure all pages work with either function name
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.toggleDrawer = toggleSidebar;
window.closeDrawer = closeSidebar;
window.toggleStudentDrawer = toggleSidebar;
window._updateMenuToggleButtons = _updateMenuToggleButtons;
window._initSidebarState = _initSidebarState;

function toggleAppsLauncher(event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }
  const el = document.getElementById('apps-launcher-dropdown');
  if (!el) return;
  const isOpen = el.classList.toggle('open');
  el.style.display = isOpen ? 'grid' : 'none';
  if (isOpen) {
    closeUserProfile();
    closeUserDropdown();
  }
}

function closeAppsLauncher() {
  const el = document.getElementById('apps-launcher-dropdown');
  if (el) {
    el.classList.remove('open');
    el.style.display = 'none';
  }
}

function toggleUserProfile(event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }
  const el = document.getElementById('user-profile-popover');
  if (!el) return;
  const isOpen = el.classList.toggle('open');
  el.style.display = isOpen ? 'flex' : 'none';
  if (isOpen) {
    closeAppsLauncher();
    closeUserDropdown();
  }
}

function closeUserProfile() {
  const el = document.getElementById('user-profile-popover');
  if (el) {
    el.classList.remove('open');
    el.style.display = 'none';
  }
}

if (typeof window !== 'undefined') {
  window.toggleDrawer = toggleSidebar;
  window.closeDrawer = closeSidebar;
  window.toggleAppsLauncher = toggleAppsLauncher;
  window.closeAppsLauncher = closeAppsLauncher;
  window.toggleUserProfile = toggleUserProfile;
  window.closeUserProfile = closeUserProfile;

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#apps-launcher-dropdown') && !e.target.closest('[onclick*="toggleAppsLauncher"]') && !e.target.closest('#btn-apps-launcher')) {
      closeAppsLauncher();
    }
    if (!e.target.closest('#user-profile-popover') && !e.target.closest('#gc-user-avatar') && !e.target.closest('[onclick*="toggleUserProfile"]') && !e.target.closest('#btn-user-avatar')) {
      closeUserProfile();
    }
  });
}

async function _loadDrawerTeachingClasses() {
  const container = document.getElementById('drawer-classes-list');
  if (!container) return;
  const token = getAuthToken();
  if (!token) return;
  try {
    const res = await fetch('/api/v1/teaching-groups?status=ACTIVE', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const json = await res.json();
    const groups = json?.data || [];
    if (!groups.length) {
      container.innerHTML = '<div style="padding:0.4rem 1.25rem; color:var(--text-muted); font-size:0.78rem;">No active classes</div>';
      return;
    }
    const currentUrl = (window.location.pathname + window.location.search).toLowerCase();
    container.innerHTML = groups.map(g => {
      const initial = (g.name || 'C').charAt(0).toUpperCase();
      const href = `/faculty/group-detail.html?id=${g.id}`;
      const isActive = currentUrl.includes(`id=${g.id}`);
      const safeName = String(g.name || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      return `
        <a href="${href}" class="sidebar-item gc-drawer-link ${isActive ? 'active' : ''}" title="${safeName}" style="padding:0.45rem 1.25rem;">
          <span style="width:24px; height:24px; border-radius:50%; background:var(--color-primary); color:var(--text-white); display:inline-flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; flex-shrink:0;">${initial}</span>
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeName}</span>
        </a>
      `;
    }).join('');
  } catch (_) { }
}

function renderClassroomNavbar() {
  let user = getCurrentUser();
  if (!user) {
    if (currentPath.includes('/admin/')) {
      user = { full_name: 'Administrator', username: 'admin', roles: ['SYSTEM_ADMIN'] };
    } else {
      return;
    }
  }
  const currentPath = window.location.pathname.toLowerCase();
  const isFaculty = currentPath.includes('/faculty/');
  const isAdmin = currentPath.includes('/admin/');
  if (!isFaculty && !isAdmin) return;

  const displayName = getUserDisplayName(user);
  const email = user.email || user.username || (isAdmin ? 'admin@college.edu' : 'teacher@college.edu');
  const cleanName = displayName.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  const initial = parts.length > 0 ? parts[0][0].toUpperCase() : (isAdmin ? 'A' : 'T');

  const avatarEl = document.getElementById('gc-user-avatar');
  if (avatarEl) avatarEl.textContent = initial;
  const popoverAvatar = document.getElementById('popover-avatar');
  if (popoverAvatar) popoverAvatar.textContent = initial;
  const popoverName = document.getElementById('popover-user-name');
  if (popoverName) popoverName.textContent = displayName;
  const popoverEmail = document.getElementById('popover-user-email');
  if (popoverEmail) popoverEmail.textContent = email;
  const launcher = document.getElementById('apps-launcher-dropdown');
  if (launcher) {
    if (!launcher.classList?.contains?.('open')) launcher.style.display = 'none';
    // Role-based visibility for HOD tiles
    const isHod = Boolean(user.is_hod);
    if (typeof launcher.querySelectorAll === 'function') {
      launcher.querySelectorAll('.hod-only-tile, a[href*="hod-"]').forEach(tile => {
        tile.style.display = isHod ? 'flex' : 'none';
      });
    }
  }
  const popover = document.getElementById('user-profile-popover');
  if (popover && !popover.classList?.contains?.('open')) popover.style.display = 'none';

  if (isFaculty) {
    _loadDrawerTeachingClasses();
  }
}

// ─────────────────────────────────────────────────────────
// UNIVERSAL SVG ICON SYSTEM (Zero Raw Emojis)
// ─────────────────────────────────────────────────────────
const SVG_ICONS = {
  dashboard: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`,
  academic: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/></svg>`,
  hod: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>`,
  students: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  reports: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  trendingUp: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  trendingDown: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
  settings: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  audit: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  home: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  calendar: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  book: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  assignment: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 10h6"/><path d="M9 18h4"/></svg>`,
  test: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  practical: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31L4.17 19.14A2 2 0 0 0 5.86 22h12.28a2 2 0 0 0 1.69-2.86L14 9.31V2"/><line x1="8.5" y1="2" x2="15.5" y2="2"/><line x1="6.5" y1="15" x2="17.5" y2="15"/></svg>`,
  folder: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  finaldocs: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  leave: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>`,
  commonFaculty: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  devices: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>`,
  archive: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
  trash: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  gradCap: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  stream: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  users: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  user: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  key: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-1.5 1.5L14 9l-2-2-4 4 2 2-4 4-2-2-2 2 4 4 6-6 1-1 4-4 2-2z"/><circle cx="7.5" cy="16.5" r="1.5"/></svg>`,
  logout: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  bell: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  moon: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  sun: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  apps: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="4" cy="4" r="1.5"/><circle cx="12" cy="4" r="1.5"/><circle cx="20" cy="4" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="20" cy="12" r="1.5"/><circle cx="4" cy="20" r="1.5"/><circle cx="12" cy="20" r="1.5"/><circle cx="20" cy="20" r="1.5"/></svg>`,
  menu: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  close: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  check: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  alert: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  chevronDown: (s = 12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  eye: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  edit: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  copy: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  plus: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  send: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  video: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  paperclip: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`,
  link: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  comment: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  megaphone: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`,
  refresh: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  printer: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
  download: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  upload: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  table: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`,
  star: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  save: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  zap: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  search: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  clock: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  scale: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>`
};

const EMOJI_TO_SVG = {
  '\u23F3': 'clock',
  '\u231B': 'clock',
  '\u2696\uFE0F': 'scale',
  '\u2713': 'check',
  '\u2715': 'close',
  '\uD83D\uDCCA': 'reports',
  '\uD83C\uDFDB\uFE0F': 'academic',
  '\uD83D\uDC68\u200D\uD83C\uDFEB': 'hod',
  '\uD83D\uDC65': 'students',
  '\uD83D\uDCC8': 'trendingUp',
  '\u2699\uFE0F': 'settings',
  '\uD83D\uDEE1\uFE0F': 'audit',
  '\uD83C\uDFE0': 'home',
  '\uD83D\uDCC5': 'calendar',
  '\uD83D\uDCD6': 'book',
  '\uD83D\uDCDD': 'assignment',
  '\uD83D\uDCC9': 'trendingDown',
  '\uD83E\uDDFE': 'leave',
  '\uD83C\uDF10': 'commonFaculty',
  '\uD83D\uDCE1': 'devices',
  '\uD83D\uDCE6': 'archive',
  '\uD83D\uDDD1\uFE0F': 'trash',
  '\uD83D\uDDD1': 'trash',
  '\uD83C\uDFEB': 'home',
  '\uD83D\uDDD3\uFE0F': 'calendar',
  '\uD83E\uDDEE': 'reports',
  '\uD83C\uDF93': 'gradCap',
  '\uD83D\uDC64': 'user',
  '\uD83D\uDD11': 'key',
  '\uD83D\uDEAA': 'logout',
  '\uD83D\uDD14': 'bell',
  '\uD83C\uDF19': 'moon',
  '\u2600\uFE0F': 'sun',
  '\uD83C\uDF13': 'moon',
  '\u2731': 'apps',
  '\u2630': 'menu',
  '\u2705': 'check',
  '\u26A0\uFE0F': 'alert',
  '\u270F\uFE0F': 'edit',
  '\uD83D\uDCCB': 'assignment',
  '\uD83D\uDCE2': 'megaphone',
  '\uD83E\uDDEA': 'practical',
  '\uD83D\uDCBE': 'save',
  '\u2B50': 'star',
  '\uD83D\uDD04': 'refresh',
  '\uD83D\uDDA8\uFE0F': 'printer',
  '\uD83D\uDCE5': 'download',
  '\uD83D\uDCE4': 'upload',
  '\uD83D\uDC41\uFE0F': 'eye',
  '\uD83D\uDE48': 'eyeOff',
  '\u26A1': 'zap',
  '\uD83D\uDD0D': 'search',
  '\u2795': 'plus',
  '\uD83D\uDCF1': 'devices',
  '\uD83D\uDD22': 'table',
  '\uD83D\uDCDA': 'book',
  '\uD83D\uDCA1': 'alert',
  '\uD83D\uDED1': 'alert',
  '\uD83C\uDF89': 'star',
  '\u2728': 'star',
  '\u270D\uFE0F': 'edit',
  '\uD83D\uDCC4': 'assignment',
  '\uD83D\uDCAC': 'comment',
  '\uD83D\uDCAF': 'star',
  '\u23F1\uFE0F': 'calendar',
  '&#128226;': 'stream',
  '&#128100;': 'students',
  '&#128221;': 'test',
  '&#128218;': 'assignment',
  '&#128228;': 'send',
  '&#128197;': 'calendar',
  '&#128230;': 'archive',
  '&#128203;': 'copy',
  '&#128202;': 'reports',
  '&#9999;&#65039;': 'edit',
  '&#127891;': 'gradCap',
  '&#9889;': 'zap'
};

function getSvgIcon(icon, size = 18) {
  if (!icon) return '';
  if (typeof icon === 'string' && icon.trim().startsWith('<svg')) return icon;
  if (typeof window !== 'undefined' && window.VIDYA_ICONS && typeof window.getSvgIcon === 'function') {
    return window.getSvgIcon(icon, size);
  }
  const key = EMOJI_TO_SVG[icon] || icon;
  if (SVG_ICONS[key]) return SVG_ICONS[key](size);
  return icon;
}

if (typeof window !== 'undefined') {
  window.SVG_ICONS = SVG_ICONS;
  window.getSvgIcon = getSvgIcon;
}

// ─────────────────────────────────────────────────────────
// 4-ROLE UNIFIED INSTITUTIONAL NAVIGATION ENGINE
// 1 for Admin, 1 for HOD, 1 for Faculty, 1 for Student
// Zero Legacy AJAX Collisions, Zero Network Latency
// ─────────────────────────────────────────────────────────

const NAVIGATION_PROFILES = {
  admin: {
    role: 'admin',
    portalLabel: 'Administration',
    pageBadge: 'ADMIN CONSOLE',
    badgeClass: 'badge-admin',
    homeUrl: '/admin/dashboard.html',
    appsTiles: [
      { href: '/admin/dashboard.html', icon: 'dashboard', label: 'Dashboard' },
      { href: '/admin/academic-structure.html', icon: 'academic', label: 'Structure' },
      { href: '/admin/faculty.html', icon: 'hod', label: 'HODs' },
      { href: '/admin/reports.html', icon: 'reports', label: 'Reports' },
      { href: '/admin/audit-logs.html', icon: 'audit', label: 'Audit Logs' },
      { href: '/admin/settings.html', icon: 'settings', label: 'Settings' }
    ],
    sections: [
      {
        label: 'Administration',
        items: [
          { href: '/admin/dashboard.html', icon: 'dashboard', label: 'Dashboard' },
          { href: '/admin/academic-structure.html', icon: 'academic', label: 'Academic Structure' },
          { href: '/admin/faculty.html', icon: 'hod', label: 'HOD Management' },
          { href: '/admin/reports.html', icon: 'reports', label: 'Reports & Analytics' },
          { href: '/admin/audit-logs.html', icon: 'audit', label: 'Audit Logs' },
          { href: '/admin/settings.html', icon: 'settings', label: 'System Settings' }
        ]
      }
    ],
    bottomTabs: [
      { href: '/admin/dashboard.html', icon: 'home', label: 'Home' },
      { href: '/admin/academic-structure.html', icon: 'academic', label: 'Structure' },
      { href: '/admin/faculty.html', icon: 'hod', label: 'HODs' },
      { isMenu: true, icon: 'menu', label: 'Menu' }
    ]
  },

  hod: {
    role: 'hod',
    portalLabel: (u) => `HOD • ${u?.hod_department_name || u?.department_name || 'Department'}`,
    pageBadge: 'HOD COMMAND',
    badgeClass: 'badge-hod',
    homeUrl: '/faculty/dashboard.html',
    appsTiles: [
      { href: '/faculty/dashboard.html', icon: 'home', label: 'Classes' },
      { href: '/faculty/hod-teachers.html', icon: 'hod', label: 'Faculty' },
      { href: '/faculty/students.html', icon: 'students', label: 'Students' },
      { href: '/faculty/registers.html', icon: 'book', label: 'Registers' },
      { href: '/faculty/assignments.html', icon: 'assignment', label: 'Coursework' },
      { href: '/faculty/tests.html', icon: 'test', label: 'Marksheets' },
      { href: '/faculty/evaluation.html', icon: 'trendingUp', label: 'Evaluation' },
      { href: '/faculty/hod-settings.html', icon: 'settings', label: 'Settings' }
    ],
    sections: [
      {
        label: 'HOD Department Command',
        items: [
          { href: '/faculty/dashboard.html', icon: 'home', label: 'Department Overview' },
          { href: '/faculty/hod-teachers.html', icon: 'hod', label: 'Department Faculty' },
          { href: '/faculty/students.html', icon: 'students', label: 'Student Directory & Approvals', hasBadge: true, id: 'nav-students-item' },
          { href: '/faculty/hod-settings.html', icon: 'settings', label: 'Department Settings' }
        ]
      },
      {
        label: 'Academic Management',
        items: [
          { href: '/faculty/registers.html', icon: 'book', label: 'Attendance Registers', id: 'nav-reg' },
          { href: '/faculty/evaluation.html', icon: 'trendingUp', label: 'Internal Evaluation', id: 'nav-eval' },
          { href: '/faculty/reports.html', icon: 'reports', label: 'Department Analytics', id: 'nav-reports' },
          { href: '/faculty/media.html', icon: 'folder', label: 'Faculty Drive & Vault', id: 'nav-drive' },
          { href: '/faculty/timetable.html', icon: 'calendar', label: 'Department Timetable' },
          { href: '/faculty/leave-approvals.html', icon: 'leave', label: 'Leave Approvals' }
        ]
      },
      {
        label: 'Archive & Safety',
        items: [
          { href: '/faculty/dashboard.html?filter=ARCHIVED', icon: 'archive', label: 'Archived Classes' },
          { href: '/faculty/dashboard.html?trash=1', icon: 'trash', label: 'Trash Bin (7d Recovery)' }
        ]
      }
    ],
    bottomTabs: [
      { href: '/faculty/dashboard.html', icon: 'home', label: 'Home' },
      { href: '/faculty/hod-teachers.html', icon: 'hod', label: 'Faculty' },
      { href: '/faculty/registers.html', icon: 'book', label: 'Registers' },
      { isMenu: true, icon: 'menu', label: 'Menu' }
    ]
  },

  faculty: {
    role: 'faculty',
    portalLabel: (u) => u?.is_class_teacher ? `Class Teacher • ${u?.class_cohort || 'Cohort'}` : 'Faculty Portal',
    pageBadge: 'FACULTY WORKSPACE',
    badgeClass: 'badge-faculty',
    homeUrl: '/faculty/dashboard.html',
    appsTiles: [
      { href: '/faculty/dashboard.html', icon: 'home', label: 'Classes' },
      { href: '/faculty/media.html', icon: 'folder', label: 'Drive Vault' },
      { href: '/faculty/registers.html', icon: 'book', label: 'Registers' },
      { href: '/faculty/assignments.html', icon: 'assignment', label: 'Coursework' },
      { href: '/faculty/tests.html', icon: 'test', label: 'Marksheets' },
      { href: '/faculty/evaluation.html', icon: 'trendingUp', label: 'Evaluation' },
      { href: '/faculty/students.html', icon: 'students', label: 'Students' },
      { href: '/faculty/reports.html', icon: 'reports', label: 'Analytics' }
    ],
    sections: [
      {
        label: '',
        items: [
          { href: '/faculty/dashboard.html', icon: 'home', label: 'Classes Hub' },
          { href: '/faculty/media.html', icon: 'folder', label: 'Faculty Drive & Vault', id: 'nav-drive' },
          { href: '/faculty/timetable.html', icon: 'calendar', label: 'Timetable' }
        ]
      },
      {
        label: 'Teaching Classes',
        customContent: '<div id="drawer-classes-list"><div style="padding:0.4rem 1.25rem;color:var(--text-muted);font-size:0.78rem;">Loading classes...</div></div>',
        items: []
      },
      {
        label: 'Academic Tools',
        items: [
          { href: '/faculty/registers.html', icon: 'book', label: 'Attendance Registers', id: 'nav-reg' },
          { href: '/faculty/evaluation.html', icon: 'trendingUp', label: 'Internal Evaluation', id: 'nav-eval' },
          { href: '/faculty/students.html', icon: 'students', label: 'Faculty & Students', id: 'nav-students-item', hasBadge: true },
          { href: '/faculty/reports.html', icon: 'reports', label: 'Reports & Analytics', id: 'nav-reports' },
          { href: '/faculty/leave-approvals.html', icon: 'leave', label: 'Leave Requests' }
        ]
      },
      {
        label: 'Archive & Safety',
        items: [
          { href: '/faculty/dashboard.html?filter=ARCHIVED', icon: 'archive', label: 'Archived Classes' },
          { href: '/faculty/dashboard.html?trash=1', icon: 'trash', label: 'Trash Bin (7d Recovery)' },
          { href: '/faculty/profile.html', icon: 'settings', label: 'Settings & Profile' }
        ]
      }
    ],
    bottomTabs: [
      { href: '/faculty/dashboard.html', icon: 'home', label: 'Home' },
      { href: '/faculty/registers.html', icon: 'book', label: 'Registers' },
      { href: '/faculty/students.html', icon: 'students', label: 'Students' },
      { isMenu: true, icon: 'menu', label: 'Menu' }
    ]
  },

  student: {
    role: 'student',
    portalLabel: 'Student Portal',
    pageBadge: 'STUDENT WORKSPACE',
    badgeClass: 'badge-student',
    homeUrl: '/student/dashboard.html',
    appsTiles: [
      { href: '/student/dashboard.html', icon: 'reports', label: 'Dashboard' },
      { href: '/student/groups.html', icon: 'home', label: 'Classes' },
      { href: '/student/attendance.html', icon: 'calendar', label: 'Attendance' },
      { href: '/student/timetable.html', icon: 'clock', label: 'Timetable' },
      { href: '/student/assignments.html', icon: 'assignment', label: 'Assignments' },
      { href: '/student/scores.html', icon: 'reports', label: 'Scores' }
    ],
    sections: [
      {
        label: 'Academics',
        items: [
          { href: '/student/dashboard.html', icon: 'reports', label: 'Dashboard Overview' },
          { href: '/student/groups.html', icon: 'home', label: 'My Classes & Subjects' },
          { href: '/student/attendance.html', icon: 'calendar', label: 'Attendance & Biometrics' },
          { href: '/student/timetable.html', icon: 'clock', label: 'My Timetable' }
        ]
      },
      {
        label: 'Coursework & Evaluation',
        items: [
          { href: '/student/assignments.html', icon: 'assignment', label: 'My Assignments' },
          { href: '/student/scores.html', icon: 'reports', label: 'Test Scores & Marks' },
          { href: '/student/leave.html', icon: 'leave', label: 'Apply for Leave' }
        ]
      },
      {
        label: 'Account',
        items: [
          { href: '/student/profile.html', icon: 'settings', label: 'My Profile' }
        ]
      }
    ],
    bottomTabs: [
      { href: '/student/dashboard.html', icon: 'home', label: 'Home' },
      { href: '/student/attendance.html', icon: 'calendar', label: 'Attendance' },
      { href: '/student/assignments.html', icon: 'assignment', label: 'Tasks' },
      { isMenu: true, icon: 'menu', label: 'Menu' }
    ]
  }
};

function resolveNavigationRole(user, pathname) {
  const p = (pathname || (typeof window !== 'undefined' && window.location ? window.location.pathname : '')).toLowerCase();
  if (user?.roles?.includes('SYSTEM_ADMIN') || p.includes('/admin/')) return 'admin';
  if (user?.is_hod || p.includes('/faculty/hod-')) return 'hod';
  if (user?.roles?.includes('TEACHER') || p.includes('/faculty/')) return 'faculty';
  if (user?.roles?.includes('STUDENT') || p.includes('/student/')) return 'student';
  return 'faculty';
}

function mountNavigationSystem(options = {}) {
  if (typeof document === 'undefined') return;

  const currentPath = (window.location && window.location.pathname ? window.location.pathname : '').toLowerCase();

  // 0. STRICT ADMIN & FACULTY PORTAL ISOLATION: Both portals have dedicated modular components in /admin/components/ and /faculty/components/
  if (currentPath.startsWith('/admin') ||
      currentPath.startsWith('/faculty') ||
      currentPath.includes('/faculty/') ||
      Boolean(document.querySelector('.admin-sidebar, .admin-app-layout, .admin-dashboard-page, .faculty-sidebar, .faculty-app-layout, .vidya-faculty-sidebar, .faculty-top-header'))) {
    return;
  }

  const isPublicAuthPage = currentPath.includes('/login/') ||
    currentPath.startsWith('/login') ||
    currentPath.startsWith('/register') ||
    currentPath.includes('student-register') ||
    currentPath === '/' ||
    currentPath === '/index.html';

  const isIsolatedPage = window.DISABLE_NAV === true ||
    window.DISABLE_NAVIGATION === true ||
    window.DISABLE_HEADER === true ||
    currentPath.includes('/classwork/create') ||
    Boolean(document.querySelector('.cw-gclass-nav')) ||
    Boolean(document.body && document.body.classList.contains('cw-create-body'));

  // 1. Clean up any conflicting legacy DOM elements
  const staleElements = [
    '#universal-bottom-nav',
    '#studio-main-bottom-menu',
    '#android-profile-drawer',
    '#android-profile-backdrop',
    '#universal-app-header',
    '.app-footer'
  ];
  staleElements.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => el.remove());
  });

  if (isPublicAuthPage || isIsolatedPage) {
    document.body.classList.remove('has-bottom-nav', 'has-sidebar');
    if (typeof document.body.setAttribute === 'function') {
      document.body.setAttribute('data-nav-ready', '1');
    }
    const injectedNav = document.querySelectorAll('.gc-navbar, #app-sidebar, #sidebar-backdrop, .mobile-bottom-nav');
    injectedNav.forEach(el => el.remove());
    return;
  }

  let user = getCurrentUser();
  if (!user) {
    if (currentPath.includes('/admin/')) {
      user = { full_name: 'Administrator', username: 'admin', roles: ['SYSTEM_ADMIN'] };
    } else {
      return;
    }
  }

  const roleKey = options.role || resolveNavigationRole(user, currentPath);
  const profile = NAVIGATION_PROFILES[roleKey] || NAVIGATION_PROFILES.faculty;

  const displayName = getUserDisplayName(user);
  const email = user.email || user.username || `${roleKey}@college.edu`;
  const cleanName = displayName.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  const initial = parts.length > 0 ? (parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase()) : roleKey.slice(0, 2).toUpperCase();

  const portalLabel = typeof profile.portalLabel === 'function' ? profile.portalLabel(user) : profile.portalLabel;

  // 2. HEADER (.gc-navbar)
  _ensureHeader(profile, user, initial, displayName, email, portalLabel);

  // 3. SIDEBAR (#app-sidebar)
  _ensureSidebar(profile, user, portalLabel);

  // 4. MOBILE BOTTOM NAV (.mobile-bottom-nav)
  _ensureMobileBottomNav(profile, currentPath);

  // 5. Navigation progress bar & View Transitions wiring (once per session)
  _ensureNavProgress();

  // 6. Async enrichments for faculty & HOD
  if (roleKey === 'faculty' || roleKey === 'hod') {
    _loadDrawerTeachingClasses();
    _loadNavPendingBadge();
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION PROGRESS BAR + VIEW TRANSITIONS WIRING
// Injects #vidyaos-nav-progress and hooks pageswap/pagereveal/navigate events
// so the 2.5px top bar animates on every internal page navigation.
// ─────────────────────────────────────────────────────────────────────────────
let _navProgressInitialized = false;
function _ensureNavProgress() {
  if (_navProgressInitialized) return;
  _navProgressInitialized = true;

  // Inject the progress bar element if not already present
  if (!document.getElementById('vidyaos-nav-progress')) {
    const bar = document.createElement('div');
    bar.id = 'vidyaos-nav-progress';
    document.body.insertAdjacentElement('afterbegin', bar);
  }

  const bar = document.getElementById('vidyaos-nav-progress');
  if (!bar) return;

  function _showProgress() {
    bar.className = '';
    // Force reflow so the transition restarts
    void bar.offsetWidth;
    bar.classList.add('loading');
  }
  function _doneProgress() {
    bar.classList.remove('loading');
    bar.classList.add('done');
    setTimeout(() => { bar.className = ''; }, 400);
  }

  // --- Cross-Document View Transitions (Chrome 126+) ---
  // pageswap fires on the OLD page just before unload (navigation starts)
  if ('onpageswap' in window) {
    window.addEventListener('pageswap', (e) => {
      if (e.viewTransition) _showProgress();
    });
  }
  // pagereveal fires on the NEW page just before first render (navigation done)
  if ('onpagereveal' in window) {
    window.addEventListener('pagereveal', (e) => {
      if (e.viewTransition) {
        e.viewTransition.ready.then(_doneProgress).catch(_doneProgress);
      }
    });
  }

  // --- Navigation API (Chrome 102+) - notify only, NEVER intercept cross-document navigation ---
  if (typeof navigation !== 'undefined' && navigation.addEventListener) {
    navigation.addEventListener('navigate', (e) => {
      if (e.hashChange || e.downloadRequest) return;
      try {
        const url = new URL(e.destination.url);
        if (url.origin !== location.origin) return;
      } catch (_) { return; }
      _showProgress();
      // NOTE: NEVER call e.intercept()! It cancels cross-document page navigation and causes blank/stuck pages.
    });
  }

  // --- Click fallback for all browsers to start progress indicator instantly on link tap ---
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript') || href.startsWith('mailto')) return;
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
    } catch (_) { return; }
    _showProgress();
  }, { capture: true, passive: true });
}

function _ensureHeader(profile, user, initial, displayName, email, portalLabel) {
  if (window.DISABLE_HEADER || window.DISABLE_NAV || window.DISABLE_NAVIGATION) return;
  if (document.querySelector('.cw-gclass-nav') || (document.body && document.body.classList.contains('cw-create-body'))) return;

  let header = document.querySelector('.gc-navbar, .app-header');

  if (!header) {
    const headerHtml = `
      <header class="gc-navbar">
        <div class="gc-nav-left">
          <button type="button" class="gc-menu-btn" id="sidebar-toggle-btn" onclick="toggleSidebar()" title="Main Menu" aria-label="Toggle navigation">
            <span style="display:inline-flex;align-items:center;justify-content:center;">${getSvgIcon('menu', 18)}</span>
          </button>
          <a href="${profile.homeUrl}" class="gc-brand-link" title="VidyaOS ${portalLabel}">
            <div class="gc-brand-icon">${getSvgIcon('gradCap', 22)}</div>
            <div class="gc-brand-title">VidyaOS</div>
          </a>
          <span class="gc-page-badge" id="app-header-page-title">${profile.pageBadge}</span>
        </div>
        <div class="gc-nav-right">
          <button type="button" class="gc-icon-btn" onclick="toggleAppsLauncher(event)" id="btn-apps-launcher" title="Apps &amp; Modules" aria-label="Apps Launcher">
            ${getSvgIcon('apps', 18)}
          </button>
          <button type="button" class="gc-icon-btn" onclick="toggleAppTheme()" id="btn-theme-toggle" title="Toggle Theme" aria-label="Toggle Theme">
            ${getSvgIcon('moon', 18)}
          </button>
          <div class="gc-user-avatar" id="gc-user-avatar" onclick="toggleUserProfile(event)" title="Account Profile">${initial}</div>
        </div>
      </header>
    `;
    document.body.insertAdjacentHTML('afterbegin', headerHtml);
    header = document.querySelector('.gc-navbar');
  }

  // Ensure toggle button in left wrap
  const existingToggleBtn = document.getElementById('sidebar-toggle-btn') || document.getElementById('btn-menu-toggle');
  if (!existingToggleBtn) {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'sidebar-toggle-btn';
    toggleBtn.className = 'sidebar-toggle-btn gc-menu-btn';
    toggleBtn.type = 'button';
    toggleBtn.onclick = toggleSidebar;
    toggleBtn.setAttribute('aria-label', 'Toggle navigation');
    toggleBtn.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;">${getSvgIcon('menu', 18)}</span>`;
    const leftWrap = header.querySelector('.gc-nav-left, .header-left');
    if (leftWrap) leftWrap.insertBefore(toggleBtn, leftWrap.firstChild);
  } else {
    // Always keep hamburger icon (never X)
    existingToggleBtn.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;">${getSvgIcon('menu', 18)}</span>`;
    existingToggleBtn.onclick = toggleSidebar;
  }

  // Ensure page badge (role label) is visible in navbar left wrap
  if (profile.pageBadge) {
    const leftWrap = header.querySelector('.gc-nav-left, .header-left');
    let badge = document.getElementById('app-header-page-title') || header.querySelector('.gc-page-badge');
    if (!badge && leftWrap) {
      badge = document.createElement('span');
      badge.id = 'app-header-page-title';
      badge.className = 'gc-page-badge';
      leftWrap.appendChild(badge);
    }
    if (badge) badge.textContent = profile.pageBadge;
  }

  // Update Avatar and Profile
  const avatarEl = document.getElementById('gc-user-avatar') || header.querySelector('.gc-user-avatar');
  if (avatarEl) {
    avatarEl.textContent = initial;
    avatarEl.setAttribute('onclick', 'toggleUserProfile(event)');
  }

  // Ensure and populate Apps Launcher Dropdown
  _ensureAppsLauncher(header, profile);

  // Ensure and populate User Profile Popover
  _ensureUserProfilePopover(header, user, initial, displayName, email, portalLabel);

  // Sync theme toggle icon
  const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('app_theme') || 'light';
  updateThemeToggleUI(currentTheme);
}

function _ensureAppsLauncher(header, profile) {
  let launcher = document.getElementById('apps-launcher-dropdown');
  if (!launcher) {
    launcher = document.createElement('div');
    launcher.id = 'apps-launcher-dropdown';
    launcher.className = 'apps-launcher-dropdown';
    launcher.style.display = 'none';
    const navRight = header.querySelector('.gc-nav-right, .header-right') || header;
    navRight.appendChild(launcher);
  }

  const tilesHtml = (profile.appsTiles || []).map(tile => `
    <a href="${tile.href}" class="app-tile">
      <div class="app-tile-icon" style="display:flex;align-items:center;justify-content:center;">${getSvgIcon(tile.icon, 20)}</div>
      <span>${tile.label}</span>
    </a>
  `).join('');

  launcher.innerHTML = tilesHtml;
}

function _ensureUserProfilePopover(header, user, initial, displayName, email, portalLabel) {
  let popover = document.getElementById('user-profile-popover');
  if (!popover) {
    popover = document.createElement('div');
    popover.id = 'user-profile-popover';
    popover.className = 'user-profile-popover';
    popover.style.display = 'none';
    const navRight = header.querySelector('.gc-nav-right, .header-right') || header;
    navRight.appendChild(popover);
  }

  const popoverAvatar = popover.querySelector('#popover-avatar');
  if (popoverAvatar) popoverAvatar.textContent = initial;
  const popoverName = popover.querySelector('#popover-user-name');
  if (popoverName) popoverName.textContent = displayName;
  const popoverEmail = popover.querySelector('#popover-user-email');
  if (popoverEmail) popoverEmail.textContent = email;

  const role = (user && user.role) ? String(user.role).toUpperCase() : '';
  let profileHref = '/faculty/profile.html';
  if (role === 'STUDENT' || window.location.pathname.includes('/student/')) {
    profileHref = '/student/profile.html';
  } else if (role === 'SYSTEM_ADMIN' || window.location.pathname.includes('/admin/')) {
    profileHref = '/admin/profile.html';
  }

  // Ensure "My Profile" button exists
  let profileLink = popover.querySelector('a[href*="profile.html"], a#popover-profile-link');
  if (!profileLink) {
    profileLink = document.createElement('a');
    profileLink.id = 'popover-profile-link';
    profileLink.href = profileHref;
    profileLink.className = 'btn btn-secondary btn-sm';
    profileLink.style.cssText = 'width:100%;margin-bottom:.5rem;text-decoration:none;justify-content:center;display:flex;align-items:center;gap:0.35rem;';
    profileLink.innerHTML = `<span style="display:inline-flex;align-items:center;">${getSvgIcon('user', 14)}</span><span>My Profile</span>`;

    const divider = popover.querySelector('div[style*="height:1px"], .popover-divider');
    const firstAction = popover.querySelector('a, button');
    if (divider && divider.nextSibling) {
      popover.insertBefore(profileLink, divider.nextSibling);
    } else if (firstAction) {
      popover.insertBefore(profileLink, firstAction);
    } else {
      popover.appendChild(profileLink);
    }
  }

  // If popover has no children or needs structure
  if (!popover.querySelector('#popover-avatar')) {
    popover.innerHTML = `
      <div class="gc-user-avatar" id="popover-avatar" style="width:56px;height:56px;font-size:1.35rem;margin-bottom:.5rem;">${initial}</div>
      <div style="font-weight:700;font-size:.95rem;color:var(--text-main);" id="popover-user-name">${displayName}</div>
      <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:.85rem;" id="popover-user-email">${email}</div>
      <div style="width:100%;height:1px;background:var(--border-color);margin-bottom:.85rem;"></div>
      <a href="${profileHref}" class="btn btn-secondary btn-sm" id="popover-profile-link" style="width:100%;margin-bottom:.5rem;text-decoration:none;justify-content:center;display:flex;align-items:center;gap:0.35rem;">
        <span style="display:inline-flex;align-items:center;">${getSvgIcon('user', 14)}</span>
        <span>My Profile</span>
      </a>
      <button type="button" class="btn btn-secondary btn-sm" style="width:100%;margin-bottom:.5rem;text-decoration:none;justify-content:center;display:flex;align-items:center;gap:0.35rem;" onclick="toggleAppTheme()">
        <span style="display:inline-flex;align-items:center;">${getSvgIcon('moon', 14)}</span>
        <span>Toggle Appearance</span>
      </button>
      <button type="button" class="btn btn-sm" style="width:100%;background:var(--status-absent-bg);color:var(--status-absent);border:1px solid var(--status-absent);display:flex;align-items:center;justify-content:center;gap:0.35rem;" onclick="logout()">
        <span style="display:inline-flex;align-items:center;">${getSvgIcon('logout', 14)}</span>
        <span>Sign Out</span>
      </button>
    `;
  }
}

function _ensureSidebar(profile, user, portalLabel) {
  if (window.DISABLE_SIDEBAR || window.DISABLE_NAV || window.DISABLE_NAVIGATION) return;
  if (document.querySelector('.cw-gclass-nav') || (document.body && document.body.classList.contains('cw-create-body'))) return;

  const currentPath = window.location.pathname.toLowerCase();
  const currentUrl = (window.location.pathname + window.location.search).toLowerCase();

  let sidebar = document.getElementById('app-sidebar');

  if (!sidebar) {
    function buildLinks(sections) {
      return sections.map((section, idx) => {
        let customHtml = section.customContent || '';
        const links = (section.items || []).map(item => {
          const hrefLower = (item.href || '').toLowerCase();
          const itemBase = hrefLower.replace('.html', '').replace('/index', '');
          const pathBase = currentPath.replace('.html', '').replace('/index', '').replace(/\/$/, '');
          const isActive = (hrefLower.includes('?') ? currentUrl === hrefLower : (currentPath === hrefLower || pathBase === itemBase))
            || (item.href.endsWith('dashboard.html') && (currentPath.endsWith('/') || currentPath.includes('dashboard') || currentPath.includes('groups.html')));

          return `
            <a href="${item.href}" ${item.id ? `id="${item.id}"` : ''}
               class="sidebar-item gc-drawer-link ${isActive ? 'active' : ''}"
               onclick="closeSidebar()" style="position:relative;">
              <span class="sidebar-item-icon" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;flex-shrink:0;">${getSvgIcon(item.icon, 18)}</span>
              <span>${item.label}</span>
              ${item.hasBadge ? `<span id="${item.id}-badge" style="display:none;position:absolute;right:0.65rem;top:50%;transform:translateY(-50%);background:var(--status-absent);color:var(--text-white, hsl(0, 0%, 100%));border-radius:9999px;min-width:18px;height:18px;font-size:0.65rem;font-weight:700;align-items:center;justify-content:center;padding:0 5px;"></span>` : ''}
            </a>`;
        }).join('');
        const dividerHtml = idx > 0 ? '<div class="gc-drawer-divider"></div>' : '';
        const labelHtml = section.label ? `<div class="sidebar-section-label gc-drawer-sec-title">${section.label}</div>` : '';
        return `${dividerHtml}${labelHtml}${customHtml}${links}`;
      }).join('');
    }

    const safePortalLabel = String(portalLabel || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const sidebarHtml = `
      <aside id="app-sidebar" class="app-sidebar gc-drawer" aria-label="Site Navigation">
        <!-- Google Classroom Drawer Header -->
        <div class="gc-drawer-header">
          <button type="button" class="gc-menu-btn" onclick="closeSidebar()" title="Close Main Menu" aria-label="Close navigation">
            <span style="display:inline-flex;align-items:center;justify-content:center;">${getSvgIcon('menu', 18)}</span>
          </button>
          <a href="${profile.homeUrl}" class="gc-brand-link" title="VidyaOS ${safePortalLabel}">
            <div class="gc-brand-icon">${getSvgIcon('gradCap', 22)}</div>
            <div class="gc-brand-title">VidyaOS</div>
          </a>
        </div>

        <!-- Scoped Navigation Links -->
        <div class="gc-drawer-body sidebar-links">
          ${buildLinks(profile.sections || [])}
        </div>

        <!-- Institutional Footer Tier -->
        <div class="sidebar-footer">
          <div class="sidebar-footer-row">
            <div class="sidebar-system-pill">
              <span class="sidebar-system-dot"></span>
              <span>VidyaOS &bull; ${safePortalLabel}</span>
            </div>
            <button type="button" class="sidebar-logout-btn" onclick="logout()" title="Sign out of system">
              <span style="display:inline-flex;align-items:center;">${getSvgIcon('logout', 16)}</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
      <div id="sidebar-backdrop" class="sidebar-backdrop gc-drawer-backdrop" onclick="closeSidebar()"></div>
    `;

    document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
    document.body.classList.add('has-sidebar');
  }

  // Initialize and update state
  _initSidebarState();
}

function _ensureMobileBottomNav(profile, currentPath) {
  if (window.DISABLE_BOTTOM_NAV || window.DISABLE_NAV || window.DISABLE_NAVIGATION) {
    const existing = document.querySelector('.mobile-bottom-nav');
    if (existing) existing.remove();
    return;
  }
  if (document.querySelector('.cw-gclass-nav') || (document.body && document.body.classList.contains('cw-create-body'))) return;

  let existing = document.querySelector('.mobile-bottom-nav');
  if (existing) existing.remove();

  const tabs = profile.bottomTabs || [];
  if (!tabs.length) return;

  const itemsHtml = tabs.map(tab => {
    if (tab.isMenu) {
      return `
        <button type="button" class="mobile-nav-item" onclick="toggleSidebar()" aria-label="Open Navigation Menu">
          <span class="mobile-nav-icon">${getSvgIcon(tab.icon, 19)}</span>
          <span class="mobile-nav-label">${tab.label}</span>
        </button>
      `;
    }
    const itemBase = tab.href ? tab.href.toLowerCase().replace('.html', '').replace('/index', '') : '';
    const pathBase = currentPath.replace('.html', '').replace('/index', '').replace(/\/$/, '');
    const isActive = tab.href && (currentPath === tab.href.toLowerCase() || pathBase === itemBase ||
      (tab.href.endsWith('dashboard.html') && (currentPath.endsWith('/') || currentPath.includes('dashboard'))));
    return `
      <a href="${tab.href}" class="mobile-nav-item ${isActive ? 'active' : ''}">
        <span class="mobile-nav-icon">${getSvgIcon(tab.icon, 19)}</span>
        <span class="mobile-nav-label">${tab.label}</span>
      </a>
    `;
  }).join('');

  const navHtml = `
    <nav class="mobile-bottom-nav" aria-label="Mobile Navigation">
      <div class="mobile-bottom-nav-inner">
        ${itemsHtml}
      </div>
    </nav>
  `;
  document.body.insertAdjacentHTML('beforeend', navHtml);
}

// Global backward compatibility wrappers
function renderSidebar() {
  mountNavigationSystem();
}

function renderClassroomNavbar() {
  mountNavigationSystem();
}

function renderMobileBottomNav() {
  mountNavigationSystem();
}

function renderFooter() {
  const existing = document.querySelector('.app-footer');
  if (existing) existing.remove();
}

function renderUserNav() {
  // Backwards compat stub
}

// ─────────────────────────────────────────────────────────
// PENDING REGISTRATION BADGE (Nav Drawer — Class Teachers)
// ─────────────────────────────────────────────────────────
async function _loadNavPendingBadge() {
  try {
    const token = getAuthToken();
    if (!token) return;
    const res = await fetch('/api/v1/students/registrations/count', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const json = await res.json();
    const count = json?.data?.count;
    if (count && count > 0) {
      const badge = document.getElementById('nav-students-item-badge');
      if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
      }
    }
  } catch (_) {
    // silently ignore — badge is a non-critical enhancement
  }
}

// ─────────────────────────────────────────────────────────
// THEME MANAGEMENT (Dark / Light Mode)
// ─────────────────────────────────────────────────────────
function initAppTheme() {
  const savedTheme = localStorage.getItem('app_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeToggleUI(savedTheme);
}

function updateThemeToggleUI(theme) {
  const tag = document.getElementById('theme-mode-tag');
  const icon = document.getElementById('theme-toggle-icon');
  const title = document.getElementById('theme-toggle-title');
  const desc = document.getElementById('theme-toggle-desc');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');

  if (theme === 'dark') {
    if (tag) { tag.textContent = 'DARK'; tag.style.color = 'var(--color-primary-light)'; }
    if (icon) icon.innerHTML = getSvgIcon('sun', 18);
    if (title) title.textContent = 'Light Mode';
    if (desc) desc.textContent = 'Switch to light appearance';
    if (btnThemeToggle) btnThemeToggle.innerHTML = getSvgIcon('sun', 18);
  } else {
    if (tag) { tag.textContent = 'LIGHT'; tag.style.color = 'var(--text-muted)'; }
    if (icon) icon.innerHTML = getSvgIcon('moon', 18);
    if (title) title.textContent = 'Dark Mode';
    if (desc) desc.textContent = 'Switch to dark appearance';
    if (btnThemeToggle) btnThemeToggle.innerHTML = getSvgIcon('moon', 18);
  }
}

function toggleAppTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const nextTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nextTheme);
  localStorage.setItem('app_theme', nextTheme);
  updateThemeToggleUI(nextTheme);
  if (typeof showToast === 'function') {
    showToast(`Appearance changed to ${nextTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}`, 'info', 2000);
  }
}

// ─────────────────────────────────────────────────────────
// USER DROPDOWN CONTROLS
// ─────────────────────────────────────────────────────────
function toggleUserDropdown(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const menu = document.getElementById('user-dropdown-menu');
  const chevron = document.getElementById('top-profile-chevron');
  if (!menu) return;
  const isOpen = menu.classList.toggle('open');
  if (chevron) {
    chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  }
}

function closeUserDropdown() {
  const menu = document.getElementById('user-dropdown-menu');
  const chevron = document.getElementById('top-profile-chevron');
  if (menu) menu.classList.remove('open');
  if (chevron) chevron.style.transform = 'rotate(0deg)';
}

// ─────────────────────────────────────────────────────────
// QUICK PASSWORD CHANGE MODAL
// ─────────────────────────────────────────────────────────
function openQuickPasswordModal() {
  closeUserDropdown();
  let modal = document.getElementById('quick-password-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'quick-password-modal';
    modal.className = 'quick-modal-backdrop';
    modal.onclick = function (e) { if (e.target === modal) closeQuickPasswordModal(); };
    modal.innerHTML = `
      <div class="quick-modal-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
          <div>
            <h2 style="font-size: 1.15rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 0.5rem; color: var(--text-main);">
              <span style="display:inline-flex;align-items:center;">${getSvgIcon('key', 18)}</span>
              <span>Change Account Password</span>
            </h2>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0.2rem 0 0 0;">
              Update your institutional account credentials securely.
            </p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeQuickPasswordModal()" style="border-radius: 50%; width: 30px; height: 30px; padding: 0; display: flex; align-items: center; justify-content: center;" aria-label="Close modal">${getSvgIcon('close', 14)}</button>
        </div>

        <form id="quick-password-form" onsubmit="handleQuickPasswordSubmit(event)">
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" for="quick-curr-pass" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.35rem; display: block;">Current Password</label>
            <div style="position: relative; display: flex; align-items: center;">
              <input type="password" id="quick-curr-pass" class="form-control" required placeholder="••••••••" style="width: 100%; padding-right: 40px;">
              <button type="button" onclick="toggleQuickPassView('quick-curr-pass', this)" style="position: absolute; right: 8px; background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 4px; color: var(--text-muted);" aria-label="Toggle password visibility">${getSvgIcon('eye', 16)}</button>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" for="quick-new-pass" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.35rem; display: block;">New Password (min 8 chars)</label>
            <div style="position: relative; display: flex; align-items: center;">
              <input type="password" id="quick-new-pass" class="form-control" required minlength="8" placeholder="••••••••" style="width: 100%; padding-right: 40px;">
              <button type="button" onclick="toggleQuickPassView('quick-new-pass', this)" style="position: absolute; right: 8px; background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 4px; color: var(--text-muted);" aria-label="Toggle password visibility">${getSvgIcon('eye', 16)}</button>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.25rem;">
            <label class="form-label" for="quick-confirm-pass" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.35rem; display: block;">Confirm New Password</label>
            <div style="position: relative; display: flex; align-items: center;">
              <input type="password" id="quick-confirm-pass" class="form-control" required minlength="8" placeholder="••••••••" style="width: 100%; padding-right: 40px;">
              <button type="button" onclick="toggleQuickPassView('quick-confirm-pass', this)" style="position: absolute; right: 8px; background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 4px; color: var(--text-muted);" aria-label="Toggle password visibility">${getSvgIcon('eye', 16)}</button>
            </div>
          </div>

          <div id="quick-pass-msg" style="display: none; font-size: 0.8rem; padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); margin-bottom: 1rem;"></div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" class="btn btn-secondary" onclick="closeQuickPasswordModal()">Cancel</button>
            <button type="submit" id="quick-pass-btn" class="btn btn-primary" style="font-weight: 700;">Update Password</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  setTimeout(() => {
    const input = document.getElementById('quick-curr-pass');
    if (input) input.focus();
  }, 100);
}

function closeQuickPasswordModal() {
  const modal = document.getElementById('quick-password-modal');
  if (modal) {
    modal.style.display = 'none';
    const form = document.getElementById('quick-password-form');
    if (form) form.reset();
    const msg = document.getElementById('quick-pass-msg');
    if (msg) msg.style.display = 'none';
  }
}

function toggleQuickPassView(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.innerHTML = getSvgIcon('eyeOff', 16);
  } else {
    inp.type = 'password';
    btn.innerHTML = getSvgIcon('eye', 16);
  }
}

async function handleQuickPasswordSubmit(event) {
  event.preventDefault();
  const curr = document.getElementById('quick-curr-pass')?.value || '';
  const newP = document.getElementById('quick-new-pass')?.value || '';
  const conf = document.getElementById('quick-confirm-pass')?.value || '';
  const btn = document.getElementById('quick-pass-btn');
  const msg = document.getElementById('quick-pass-msg');

  if (newP !== conf) {
    if (msg) {
      msg.style.display = 'block';
      msg.style.background = 'var(--status-absent-bg)';
      msg.style.color = 'var(--status-absent)';
      msg.textContent = 'New passwords do not match. Please verify.';
    }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }

  try {
    const token = getAuthToken();
    const res = await fetch('/api/v1/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ current_password: curr, new_password: newP })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.data?.access_token) {
        localStorage.setItem('access_token', data.data.access_token);
      }
      if (typeof showToast === 'function') {
        showToast('Password updated successfully!', 'success');
      }
      closeQuickPasswordModal();
    } else {
      if (msg) {
        msg.style.display = 'block';
        msg.style.background = 'var(--status-absent-bg)';
        msg.style.color = 'var(--status-absent)';
        msg.textContent = data.error?.message || 'Failed to update password.';
      }
    }
  } catch (err) {
    if (msg) {
      msg.style.display = 'block';
      msg.style.background = 'var(--status-absent-bg)';
      msg.style.color = 'var(--status-absent)';
      msg.textContent = err.message || 'Network error updating password.';
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Update Password'; }
  }
}

// ─────────────────────────────────────────────────────────
// EXECUTIVE USER TOP-RIGHT NAV WITH FLOATING DROPDOWN
// ─────────────────────────────────────────────────────────
function renderUserNav() {
  const user = getCurrentUser();
  const navContainer = document.getElementById('user-nav');
  if (!navContainer || !user) return;

  const currentPath = window.location.pathname.toLowerCase();
  const displayName = getUserDisplayName(user);
  const email = user.email || user.username || 'System Account';

  let profileHref = '/index.html';
  let roleChipText = 'USER';
  let roleClass = 'chip-user';
  let avatarRoleClass = 'role-user';
  let avatarContent = 'U';

  if (user.roles?.includes('STUDENT')) {
    profileHref = '/student/profile.html';
    roleChipText = 'Student';
    roleClass = 'chip-student';
    avatarRoleClass = 'role-student';
    avatarContent = 'ST';
  } else if (user.roles?.includes('TEACHER')) {
    profileHref = '/faculty/profile.html';
    if (user.is_hod) {
      roleChipText = 'HOD';
      roleClass = 'chip-hod';
      avatarRoleClass = 'role-hod';
    } else if (user.is_common_faculty_manager && user.roles?.includes('COMMON_FACULTY_MANAGER')) {
      roleChipText = 'Common Mgr';
      roleClass = 'chip-hod';
      avatarRoleClass = 'role-hod';
    } else {
      roleChipText = 'Faculty';
      roleClass = 'chip-faculty';
      avatarRoleClass = 'role-classteacher';
    }
    // Calculate initials
    const cleanName = displayName.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      avatarContent = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length >= 2) {
      avatarContent = parts[0].substring(0, 2).toUpperCase();
    } else {
      avatarContent = 'T';
    }
  } else if (user.roles?.includes('SYSTEM_ADMIN')) {
    profileHref = '/admin/profile.html';
    roleChipText = 'Admin';
    roleClass = 'chip-admin';
    avatarRoleClass = 'role-admin';
    avatarContent = 'SA';
  } else if (currentPath.includes('/admin/')) {
    profileHref = '/admin/profile.html';
    roleChipText = 'Admin';
    roleClass = 'chip-admin';
    avatarRoleClass = 'role-admin';
    avatarContent = 'SA';
  } else if (currentPath.includes('/student/')) {
    profileHref = '/student/profile.html';
    roleChipText = 'Student';
    roleClass = 'chip-student';
    avatarRoleClass = 'role-student';
    avatarContent = 'ST';
  } else if (currentPath.includes('/faculty/')) {
    profileHref = '/faculty/profile.html';
    roleChipText = 'Faculty';
    roleClass = 'chip-faculty';
    avatarRoleClass = 'role-classteacher';
    avatarContent = 'T';
  }

  const isProfileActive = currentPath.endsWith('/profile.html') || currentPath.endsWith('profile.html');

  navContainer.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.65rem;">
      <!-- IN-APP NOTIFICATIONS (Section 55) -->
      <div class="notification-bell-container" id="notification-bell-container">
        <button type="button" class="notification-bell-btn" id="notification-bell-btn" onclick="toggleNotificationDropdown(event)" aria-label="Notifications" title="Notifications">
          <span style="display:inline-flex;align-items:center;">${getSvgIcon('bell', 18)}</span>
          <span class="notification-badge" id="notification-badge" style="display: none;">0</span>
        </button>
        <div class="notification-dropdown-menu" id="notification-dropdown-menu" onclick="event.stopPropagation()">
          <div class="notification-header">
            <div style="display: flex; align-items: center;">
              <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-main);">Notifications</span>
              <span class="notification-unread-tag" id="notification-unread-tag">0 new</span>
            </div>
            <button type="button" class="mark-all-read-btn" onclick="markAllNotificationsRead(event)">Mark all read</button>
          </div>
          <div class="notification-list" id="notification-list">
            <div class="notification-empty">No notifications</div>
          </div>
        </div>
      </div>

      <!-- EXECUTIVE USER PILL -->
      <div class="top-profile-container">
        <button type="button" class="top-profile-pill ${isProfileActive ? 'active' : ''}" id="top-profile-btn" onclick="toggleUserDropdown(event)" aria-haspopup="true" aria-expanded="false" title="Account Menu (${displayName})">
          <div class="top-profile-avatar ${avatarRoleClass}">
            <span>${avatarContent}</span>
            <div class="top-profile-beacon" title="Session Active"></div>
          </div>
          <div class="top-profile-meta">
            <span class="top-profile-name">${displayName}</span>
            <div class="top-profile-role">
              <span class="top-profile-chip ${roleClass}">${roleChipText}</span>
            </div>
          </div>
          <span class="top-profile-chevron" id="top-profile-chevron" aria-hidden="true" style="display:inline-flex;align-items:center;">${getSvgIcon('chevronDown', 12)}</span>
        </button>

        <!-- FLOATING EXECUTIVE USER DROPDOWN -->
        <div class="user-dropdown-menu" id="user-dropdown-menu" aria-labelledby="top-profile-btn">
          <div class="user-dropdown-header">
            <div class="dropdown-avatar-wrap">
              <div class="dropdown-avatar ${avatarRoleClass}">${avatarContent}</div>
            </div>
            <div class="dropdown-user-details">
              <div class="dropdown-user-name">${displayName}</div>
              <div class="dropdown-user-email">${email}</div>
              <div class="dropdown-badge-row">
                <span class="top-profile-chip ${roleClass}">${roleChipText}</span>
              </div>
            </div>
          </div>

          <div class="user-dropdown-divider"></div>

          <div class="user-dropdown-items">
            <a href="${profileHref}" class="user-dropdown-item ${isProfileActive ? 'active-item' : ''}" onclick="closeUserDropdown()">
              <span class="dropdown-item-icon" style="display:inline-flex;align-items:center;">${getSvgIcon('user', 18)}</span>
              <div class="dropdown-item-text">
                <div class="dropdown-item-title">My Profile & Identity</div>
                <div class="dropdown-item-desc">View credentials & allocations</div>
              </div>
            </a>

            <button type="button" class="user-dropdown-item" onclick="openQuickPasswordModal()">
              <span class="dropdown-item-icon" style="display:inline-flex;align-items:center;">${getSvgIcon('key', 18)}</span>
              <div class="dropdown-item-text">
                <div class="dropdown-item-title">Change Password</div>
                <div class="dropdown-item-desc">Quick security update</div>
              </div>
            </button>

            <button type="button" class="user-dropdown-item" onclick="toggleAppTheme()">
              <span class="dropdown-item-icon" id="theme-toggle-icon" style="display:inline-flex;align-items:center;">${getSvgIcon('moon', 18)}</span>
              <div class="dropdown-item-text">
                <div class="dropdown-item-title" id="theme-toggle-title">Dark Mode</div>
                <div class="dropdown-item-desc" id="theme-toggle-desc">Switch color appearance</div>
              </div>
              <span class="theme-mode-tag" id="theme-mode-tag">LIGHT</span>
            </button>
          </div>

          <div class="user-dropdown-divider"></div>

          <div class="user-dropdown-footer">
            <button type="button" class="dropdown-logout-btn" onclick="logout()" title="Sign out of system">
              <span>Sign Out</span>
              <span style="display:inline-flex;align-items:center;margin-left:0.35rem;">${getSvgIcon('logout', 16)}</span>
            </button>
          </div>
        </div>
      </div>

      <button type="button" class="top-logout-btn" onclick="logout()" title="Sign out of system">
        <span>Logout</span>
        <span style="display:inline-flex;align-items:center;margin-left:0.25rem;">${getSvgIcon('logout', 16)}</span>
      </button>
    </div>
  `;

  const savedTheme = localStorage.getItem('app_theme') || 'light';
  updateThemeToggleUI(savedTheme);

  // Poll for unread notification count
  fetchNotificationUnreadCount();
  if (typeof window !== 'undefined' && !window.__notificationPollInterval) {
    window.__notificationPollInterval = setInterval(fetchNotificationUnreadCount, 45000);
  }
}

// ─────────────────────────────────────────────────────────
// IN-APP NOTIFICATIONS POPUP CONTROLLER (Section 55)
// ─────────────────────────────────────────────────────────

function getNotificationIcon(type) {
  switch (type) {
    case 'FACULTY_APPROVAL':
    case 'STUDENT_APPROVAL':
      return getSvgIcon('check', 16);
    case 'GROUP_INVITE':
      return getSvgIcon('users', 16);
    case 'ASSIGNMENT_POSTED':
      return getSvgIcon('book', 16);
    case 'ASSIGNMENT_GRADED':
      return getSvgIcon('star', 16);
    case 'TEST_MARKS_PUBLISHED':
      return getSvgIcon('assignment', 16);
    case 'ATTENDANCE_NOTICE':
      return getSvgIcon('calendar', 16);
    default:
      return getSvgIcon('megaphone', 16);
  }
}

async function fetchNotificationUnreadCount() {
  const token = typeof getAuthToken === 'function' ? getAuthToken() : (typeof getAccessToken === 'function' ? getAccessToken() : localStorage.getItem('access_token'));
  if (!token) return;
  try {
    const res = await fetchApi('/notifications/unread-count');
    if (res && res.success && res.data) {
      updateNotificationBadge(res.data.unreadCount || 0);
    }
  } catch (_) { }
}

function updateNotificationBadge(unreadCount) {
  const badge = document.getElementById('notification-badge');
  const tag = document.getElementById('notification-unread-tag');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
  if (tag) {
    tag.textContent = `${unreadCount} new`;
  }
}

async function loadNotifications() {
  const list = document.getElementById('notification-list');
  if (!list) return;
  list.innerHTML = `<div class="notification-empty" style="padding: 1.5rem;">Loading notifications...</div>`;

  try {
    const res = await fetchApi('/notifications?limit=20');
    if (res && res.success && Array.isArray(res.data)) {
      updateNotificationBadge(res.unreadCount || 0);
      if (res.data.length === 0) {
        list.innerHTML = `<div class="notification-empty">No notifications yet.</div>`;
        return;
      }
      list.innerHTML = res.data.map(n => {
        const timeAgo = formatTimeAgo(n.created_at);
        const icon = getNotificationIcon(n.type);
        const unreadClass = n.is_read ? '' : 'unread';
        const link = n.link_url ? n.link_url : '#';

        return `
          <div class="notification-item ${unreadClass}" onclick="handleNotificationClick(${n.id}, '${link}', event)">
            <div class="notification-item-icon">${icon}</div>
            <div class="notification-item-content">
              <div class="notification-item-title">${escapeAuthHtml(n.title)}</div>
              <div class="notification-item-msg">${escapeAuthHtml(n.message)}</div>
              <div class="notification-item-time">${timeAgo}</div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      list.innerHTML = `<div class="notification-empty">Unable to load notifications.</div>`;
    }
  } catch (_) {
    list.innerHTML = `<div class="notification-empty">Unable to load notifications.</div>`;
  }
}

function toggleNotificationDropdown(e) {
  if (e) e.stopPropagation();
  closeUserDropdown();
  const dropdown = document.getElementById('notification-dropdown-menu');
  if (!dropdown) return;
  const isOpen = dropdown.classList.contains('open');
  if (isOpen) {
    dropdown.classList.remove('open');
  } else {
    dropdown.classList.add('open');
    loadNotifications();
  }
}

function closeNotificationDropdown() {
  const dropdown = document.getElementById('notification-dropdown-menu');
  if (dropdown) dropdown.classList.remove('open');
}

async function markAllNotificationsRead(e) {
  if (e) e.stopPropagation();
  try {
    await fetchApi('/notifications/mark-all-read', { method: 'PUT' });
    updateNotificationBadge(0);
    await loadNotifications();
  } catch (_) { }
}

async function handleNotificationClick(id, linkUrl, e) {
  if (e) e.preventDefault();
  try {
    await fetchApi(`/notifications/${id}/read`, { method: 'PUT' });
  } catch (_) { }
  closeNotificationDropdown();
  if (linkUrl && linkUrl !== '#') {
    window.location.href = linkUrl;
  } else {
    fetchNotificationUnreadCount();
  }
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function escapeAuthHtml(text) {
  if (text == null) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

if (typeof window !== 'undefined') {
  if (!window.esc) window.esc = escapeAuthHtml;
  if (!window.escapeHtml) window.escapeHtml = escapeAuthHtml;
}

// Global outside click listener to close dropdowns
document.addEventListener('click', (e) => {
  if (!e.target.closest('.top-profile-container')) {
    closeUserDropdown();
  }
  if (!e.target.closest('.notification-bell-container')) {
    closeNotificationDropdown();
  }
});

// ─────────────────────────────────────────────────────────
// LEGACY COMPATIBILITY STUBS (Universal AJAX Nav Deprecated)
// All navigation is handled deterministically by mountNavigationSystem()
// ─────────────────────────────────────────────────────────
function loadUniversalNavigation() {
  const p = (window.location && window.location.pathname ? window.location.pathname : '').toLowerCase();
  if (p.startsWith('/admin') || p.startsWith('/faculty') || p.includes('/faculty/')) return;
  if (typeof mountNavigationSystem === 'function') {
    mountNavigationSystem();
  }
}

function toggleAndroidProfileDrawer(forceState) {
  if (typeof toggleUserProfile === 'function') {
    toggleUserProfile();
  }
}

function updateDrawerThemeLabel() {
  // Legacy stub — theme is managed via popover & navbar
}

if (typeof window !== 'undefined') {
  window.logout = logout;
  window.handleLogout = logout;
  window.mountNavigationSystem = mountNavigationSystem;
  window.loadUniversalNavigation = loadUniversalNavigation;
  window.toggleAndroidProfileDrawer = toggleAndroidProfileDrawer;
  window.updateDrawerThemeLabel = updateDrawerThemeLabel;
  window.resolveNavigationRole = resolveNavigationRole;
}

// Auto-initialize theme & sync session on script execution
if (typeof document !== 'undefined') {
  initAppTheme();
  const p = (window.location && window.location.pathname ? window.location.pathname : '').toLowerCase();
  const isIsolated = p.startsWith('/admin') || p.startsWith('/faculty') || p.includes('/faculty/');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      syncCurrentUser();
      if (!isIsolated) mountNavigationSystem();
    });
  } else {
    syncCurrentUser();
    if (!isIsolated) mountNavigationSystem();
  }
}

