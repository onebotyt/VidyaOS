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
  window.showToast = function(message, type = 'info', duration = 4000) {
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
  } catch (_) {}
}

function handleSessionRevocation() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  alert('Your session has ended because this account was logged into from another PC/device or signed out.');
  window.location.href = '/index.html';
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
    } catch (_) {}
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
    }).catch(() => {});
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
      } catch (_) {}
      if (typeof showToast === 'function') {
        showToast('Access Denied: You do not have permission to view this portal.', 'error');
      }
      if (user.roles?.includes('STUDENT')) {
        window.location.href = '/student/dashboard.html';
      } else if (user.roles?.includes('TEACHER')) {
        window.location.href = '/faculty/dashboard.html';
      } else if (user.roles?.includes('SYSTEM_ADMIN')) {
        window.location.href = '/admin/dashboard.html';
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
      } catch (_) {}
      window.location.href = '/faculty/dashboard.html';
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
      } catch (_) {}
      window.location.href = '/faculty/dashboard.html';
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
      } catch (_) {}
      window.location.href = '/faculty/dashboard.html';
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
      } catch (_) {}
      window.location.href = '/faculty/dashboard.html';
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
  } catch (_) {}

  try {
    renderSidebar();
  } catch (err) {
    console.error('Error in renderSidebar:', err);
  }

  try {
    renderFooter();
  } catch (err) {
    console.error('Error in renderFooter:', err);
  }

  try {
    renderMobileBottomNav(user);
  } catch (err) {
    console.error('Error in renderMobileBottomNav:', err);
  }

  try {
    renderUserNav();
  } catch (err) {
    console.error('Error in renderUserNav:', err);
  }

  try {
    renderClassroomNavbar();
  } catch (err) {
    console.error('Error in renderClassroomNavbar:', err);
  }

  try {
    loadUniversalNavigation();
  } catch (err) {
    console.error('Error in loadUniversalNavigation:', err);
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
  return localStorage.getItem('sidebar_open') !== 'false';
}

function _setSidebarState(open) {
  localStorage.setItem('sidebar_open', open ? 'true' : 'false');
}

function toggleSidebar() {
  const sidebar = document.getElementById('app-sidebar') || document.getElementById('classroom-drawer');
  const backdrop = document.getElementById('sidebar-backdrop') || document.getElementById('classroom-drawer-backdrop');
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle('sidebar-open');
  sidebar.classList.toggle('open', isOpen);
  document.body.classList.toggle('sidebar-open', isOpen);
  if (backdrop) {
    backdrop.classList.toggle('active', isOpen);
    backdrop.classList.toggle('open', isOpen);
  }
  _setSidebarState(isOpen);
  // Update toggle button icon
  const btn = document.getElementById('sidebar-toggle-btn') || document.getElementById('btn-menu-toggle');
  if (btn) btn.setAttribute('aria-pressed', isOpen ? 'true' : 'false');
}

function closeSidebar() {
  const sidebar = document.getElementById('app-sidebar') || document.getElementById('classroom-drawer');
  const backdrop = document.getElementById('sidebar-backdrop') || document.getElementById('classroom-drawer-backdrop');
  if (!sidebar) return;
  sidebar.classList.remove('sidebar-open');
  sidebar.classList.remove('open');
  document.body.classList.remove('sidebar-open');
  if (backdrop) {
    backdrop.classList.remove('active');
    backdrop.classList.remove('open');
  }
  _setSidebarState(false);
}

// Global aliases to ensure all faculty pages work with either function name
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.toggleDrawer = toggleSidebar;
window.closeDrawer = closeSidebar;

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
      const safeName = String(g.name || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      return `
        <a href="${href}" class="sidebar-item gc-drawer-link ${isActive ? 'active' : ''}" title="${safeName}" style="padding:0.45rem 1.25rem;">
          <span style="width:24px; height:24px; border-radius:50%; background:var(--color-primary); color:var(--text-white); display:inline-flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; flex-shrink:0;">${initial}</span>
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeName}</span>
        </a>
      `;
    }).join('');
  } catch (_) {}
}

function renderClassroomNavbar() {
  const user = getCurrentUser();
  if (!user) return;
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
  dashboard: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`,
  academic: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/></svg>`,
  hod: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>`,
  students: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  reports: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  trendingUp: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  trendingDown: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
  settings: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  audit: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  home: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  calendar: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  book: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  assignment: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 10h6"/><path d="M9 18h4"/></svg>`,
  test: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  practical: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31L4.17 19.14A2 2 0 0 0 5.86 22h12.28a2 2 0 0 0 1.69-2.86L14 9.31V2"/><line x1="8.5" y1="2" x2="15.5" y2="2"/><line x1="6.5" y1="15" x2="17.5" y2="15"/></svg>`,
  finaldocs: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  leave: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>`,
  commonFaculty: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  devices: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>`,
  archive: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
  trash: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  gradCap: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  stream: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  users: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  user: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  key: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-1.5 1.5L14 9l-2-2-4 4 2 2-4 4-2-2-2 2 4 4 6-6 1-1 4-4 2-2z"/><circle cx="7.5" cy="16.5" r="1.5"/></svg>`,
  logout: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  bell: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  moon: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  sun: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  apps: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="4" cy="4" r="1.5"/><circle cx="12" cy="4" r="1.5"/><circle cx="20" cy="4" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="20" cy="12" r="1.5"/><circle cx="4" cy="20" r="1.5"/><circle cx="12" cy="20" r="1.5"/><circle cx="20" cy="20" r="1.5"/></svg>`,
  menu: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  close: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  check: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  alert: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  chevronDown: (s=12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  eye: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  edit: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  copy: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  plus: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  send: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  video: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  paperclip: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`,
  link: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  comment: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  megaphone: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`,
  refresh: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  printer: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
  download: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  upload: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  table: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`,
  star: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  save: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  zap: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  search: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  clock: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  scale: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>`
};

const EMOJI_TO_SVG = {
  '⏳': 'clock',
  '⌛': 'clock',
  '⚖️': 'scale',
  '✓': 'check',
  '✕': 'close',
  '📊': 'reports',
  '🏛️': 'academic',
  '👨‍🏫': 'hod',
  '👥': 'students',
  '📈': 'trendingUp',
  '⚙️': 'settings',
  '🛡️': 'audit',
  '🏠': 'home',
  '📅': 'calendar',
  '📖': 'book',
  '📝': 'assignment',
  '📉': 'trendingDown',
  '🧾': 'leave',
  '🌐': 'commonFaculty',
  '📡': 'devices',
  '📦': 'archive',
  '🗑️': 'trash',
  '🗑': 'trash',
  '🏫': 'home',
  '🗓️': 'calendar',
  '🧮': 'reports',
  '🎓': 'gradCap',
  '👤': 'user',
  '🔑': 'key',
  '🚪': 'logout',
  '🔔': 'bell',
  '🌙': 'moon',
  '☀️': 'sun',
  '🌓': 'moon',
  '✱': 'apps',
  '☰': 'menu',
  '✕': 'close',
  '✅': 'check',
  '⚠️': 'alert',
  '✏️': 'edit',
  '📋': 'assignment',
  '📢': 'megaphone',
  '🧪': 'practical',
  '💾': 'save',
  '⭐': 'star',
  '🔄': 'refresh',
  '🖨️': 'printer',
  '📥': 'download',
  '📤': 'upload',
  '👁️': 'eye',
  '🙈': 'eyeOff',
  '⚡': 'zap',
  '🔍': 'search',
  '➕': 'plus',
  '📱': 'devices',
  '🔢': 'table',
  '📚': 'book',
  '💡': 'alert',
  '🛑': 'alert',
  '🎉': 'star',
  '✨': 'star',
  '✍️': 'edit',
  '📄': 'assignment',
  '💬': 'comment',
  '💯': 'star',
  '⏱️': 'calendar',
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
  const key = EMOJI_TO_SVG[icon] || icon;
  if (SVG_ICONS[key]) return SVG_ICONS[key](size);
  return icon;
}

if (typeof window !== 'undefined') {
  window.SVG_ICONS = SVG_ICONS;
  window.getSvgIcon = getSvgIcon;
}

function renderSidebar() {
  const user = getCurrentUser();
  const header = document.querySelector('.app-header, .gc-navbar');
  if (!header || !user) return;

  // 1. Inject toggle button into header left
  if (!document.getElementById('sidebar-toggle-btn') && !document.getElementById('btn-menu-toggle')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'sidebar-toggle-btn';
    toggleBtn.className = 'sidebar-toggle-btn gc-menu-btn';
    toggleBtn.type = 'button';
    toggleBtn.onclick = toggleSidebar;
    toggleBtn.setAttribute('aria-label', 'Toggle navigation sidebar');
    toggleBtn.setAttribute('aria-pressed', 'false');
    toggleBtn.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;">${getSvgIcon('menu', 18)}</span>`;

    const brand = header.querySelector('.brand, .gc-brand-link');
    let leftWrap = header.querySelector('.header-left, .gc-nav-left');
    if (!leftWrap) {
      leftWrap = document.createElement('div');
      leftWrap.className = 'header-left';
      if (brand) {
        brand.parentNode.insertBefore(leftWrap, brand);
        leftWrap.appendChild(toggleBtn);
        leftWrap.appendChild(brand);
      } else {
        header.insertBefore(leftWrap, header.firstChild);
        leftWrap.appendChild(toggleBtn);
      }
    } else {
      leftWrap.insertBefore(toggleBtn, leftWrap.firstChild);
    }
  }

  // 2. Build sidebar if not present
  if (document.getElementById('app-sidebar')) return;

  const currentPath = window.location.pathname.toLowerCase();
  const currentUrl = (window.location.pathname + window.location.search).toLowerCase();
  let roleBadge = 'USER';
  if (user.roles?.includes('SYSTEM_ADMIN')) {
    roleBadge = 'ADMIN';
  } else if (user.is_hod) {
    roleBadge = 'HOD';
  } else if (user.is_common_faculty_manager && user.roles?.includes('COMMON_FACULTY_MANAGER')) {
    roleBadge = 'COMMON MGR';
  } else if (user.roles?.includes('TEACHER') || user.is_class_teacher) {
    roleBadge = 'FACULTY';
  } else if (user.roles?.includes('STUDENT')) {
    roleBadge = 'STUDENT';
  } else if (user.roles && user.roles[0]) {
    roleBadge = user.roles[0];
  }
  const displayName = getUserDisplayName(user);
  const email = user.email || user.username || 'System Account';

  let navSections = [];
  let portalLabel = 'College Portal';

  if (user.roles?.includes('SYSTEM_ADMIN') || currentPath.includes('/admin/')) {
    portalLabel = 'Administration';
    navSections = [{
      label: 'Admin',
      items: [
        { icon: 'dashboard', label: 'Dashboard', href: '/admin/dashboard.html' },
        { icon: 'academic', label: 'Academic Structure', href: '/admin/academic-structure.html' },
        { icon: 'hod', label: 'HOD Management', href: '/admin/faculty.html' },
        { icon: 'reports', label: 'Reports & Analytics', href: '/admin/reports.html' },
        { icon: 'settings', label: 'System Settings', href: '/admin/settings.html' },
        { icon: 'audit', label: 'Audit Logs', href: '/admin/audit-logs.html' }
      ]
    }];
  } else if (user.roles?.includes('TEACHER') || currentPath.includes('/faculty/')) {
    portalLabel = user.is_hod ? `HOD — ${user.hod_department_name || 'Dept'}` : 'Faculty Portal';

    const isDeptFaculty = Boolean(user.department_id || user.teacher?.department_id || user.is_class_teacher || user.is_hod || (user.roles?.includes('TEACHER') && !user.is_common_faculty_manager));
    const isHodUser = Boolean(user.is_hod || currentPath.includes('hod-'));

    // Top Level: Google Classroom Style
    navSections.push({
      label: '',
      items: [
        { icon: '🏠', label: 'Classes', href: '/faculty/dashboard.html' },
        { icon: '📁', label: 'Faculty Drive & Vault', href: '/faculty/media.html', id: 'nav-drive' },
        { icon: '📅', label: 'Calendar & Timetable', href: '/faculty/timetable.html' }
      ]
    });

    // Teaching Classes List
    navSections.push({
      label: 'Teaching Classes',
      customContent: '<div id="drawer-classes-list"><div style="padding:0.4rem 1.25rem;color:var(--text-muted);font-size:0.78rem;">Loading classes...</div></div>',
      items: []
    });

    // Academic Tools
    const academicTools = [
      { icon: '📖', label: 'Attendance Registers', href: '/faculty/registers.html', id: 'nav-reg' },
      { icon: '📝', label: 'Coursework & Assignments', href: '/faculty/assignments.html', id: 'nav-assign' },
      { icon: '📊', label: 'Marks & Tests', href: '/faculty/tests.html', id: 'nav-marks' },
      { icon: '📈', label: 'Internal Evaluation', href: '/faculty/evaluation.html', id: 'nav-eval' },
      { icon: '📉', label: 'Reports & Analytics', href: '/faculty/reports.html', id: 'nav-reports' },
      { icon: '🧾', label: 'Leave Requests', href: '/faculty/leave-approvals.html' }
    ];

    if (isDeptFaculty || isHodUser) {
      academicTools.push({ icon: '👥', label: 'Faculty & Students', href: '/faculty/students.html', id: 'nav-students-item', hasBadge: true });
    }
    if (user.is_common_faculty_manager && user.roles?.includes('COMMON_FACULTY_MANAGER')) {
      academicTools.push({ icon: '🌐', label: 'Common Faculty', href: '/faculty/common-teachers.html' });
    }
    navSections.push({ label: 'Academic Tools', items: academicTools });

    // HOD Exclusive Management Section (Only 2 exclusive links here + HOD Dashboard on Classes)
    if (isHodUser) {
      navSections.push({
        label: 'HOD Management',
        items: [
          { icon: '👨‍🏫', label: 'Department Faculty', href: '/faculty/hod-teachers.html' },
          { icon: '⚙️', label: 'Department Settings', href: '/faculty/hod-settings.html' }
        ]
      });
    }

    navSections.push({
      label: 'Archive & Safety',
      items: [
        { icon: '📦', label: 'Archived Classes', href: '/faculty/dashboard.html?filter=ARCHIVED' },
        { icon: '🗑️', label: 'Trash Bin (7d Recovery)', href: '/faculty/dashboard.html?trash=1' },
        { icon: '⚙️', label: 'Settings', href: isHodUser ? '/faculty/hod-settings.html' : '/faculty/profile.html' }
      ]
    });
  } else if (user.roles?.includes('STUDENT') || currentPath.includes('/student/')) {
    portalLabel = 'Student Portal';
    navSections = [{
      label: 'Student',
      items: [
        { icon: '📊', label: 'Dashboard', href: '/student/dashboard.html' },
        { icon: '🏫', label: 'Teaching Groups', href: '/student/groups.html' },
        { icon: '📅', label: 'Attendance & Calendar', href: '/student/attendance.html' },
        { icon: '🗓️', label: 'My Timetable', href: '/student/timetable.html' },
        { icon: '📝', label: 'My Assignments', href: '/student/assignments.html' },
        { icon: '🧾', label: 'Apply for Leave', href: '/student/leave.html' },
        { icon: '🧮', label: 'My Test Scores', href: '/student/scores.html' }
      ]
    }];
  }

  // Build link HTML
  function buildLinks(sections) {
    return sections.map((section, idx) => {
      let customHtml = '';
      if (section.customContent) {
        customHtml = section.customContent;
      }
      const links = (section.items || []).map(item => {
        const hrefLower = (item.href || '').toLowerCase();
        const itemBase = hrefLower.replace('.html', '').replace('/index', '');
        const pathBase = currentPath.replace('.html', '').replace('/index', '').replace(/\/$/, '');
        const isActive = (hrefLower.includes('?') ? currentUrl === hrefLower : (currentPath === hrefLower || pathBase === itemBase))
          || (item.href.endsWith('dashboard.html') && (currentPath.endsWith('/') || currentPath.includes('dashboard') || currentPath.includes('groups.html')));
        return `
          <a href="${item.href}" ${item.id ? `id="${item.id}"` : ''}
             class="sidebar-item gc-drawer-link ${isActive ? 'active' : ''}"
             onclick="if(window.innerWidth<=768)closeSidebar()" style="position:relative;">
            <span class="sidebar-item-icon" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;flex-shrink:0;">${getSvgIcon(item.icon, 18)}</span>
            <span>${item.label}</span>
            ${item.hasBadge ? `<span id="${item.id}-badge" style="display:none;position:absolute;right:0.65rem;top:50%;transform:translateY(-50%);background:var(--status-absent);color:var(--text-white, hsl(0, 0%, 100%));border-radius:9999px;min-width:18px;height:18px;font-size:0.65rem;font-weight:700;align-items:center;justify-content:center;padding:0 5px;"></span>` : ''}
          </a>`;
      }).join('');
      const dividerHtml = isDrawerPortal && idx > 0 ? '<div class="gc-drawer-divider"></div>' : '';
      const labelHtml = section.label ? `<div class="sidebar-section-label gc-drawer-sec-title">${section.label}</div>` : '';
      return `${dividerHtml}${labelHtml}${customHtml}${links}`;
    }).join('');
  }

  // Safe escape helper for HTML attributes
  const safeAttr = (s) => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Extract initials for executive avatar
  const userInitials = (displayName || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('') || 'U';

  const isFacultyPortal = currentPath.includes('/faculty/');
  const isAdminPortal = currentPath.includes('/admin/');
  const isDrawerPortal = isFacultyPortal || isAdminPortal;

  let sidebarHeaderHtml = '';
  if (isFacultyPortal) {
    sidebarHeaderHtml = `
      <!-- Brand Header / Drawer Header -->
      <div class="gc-drawer-header sidebar-user-card" style="display:flex;align-items:center;justify-content:space-between;padding:0.85rem 1rem;border-bottom:1px solid var(--border-color);gap:0.65rem;">
        <a href="/faculty/dashboard.html" class="gc-brand-link" style="display:flex;align-items:center;gap:0.6rem;text-decoration:none;flex:1;min-width:0;">
          <div style="width:34px;height:34px;font-size:1.1rem;border-radius:9px;background:linear-gradient(135deg,var(--color-primary),var(--color-primary-hover));color:var(--text-white, hsl(0, 0%, 100%));display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:var(--shadow-sm);">${getSvgIcon('gradCap', 20)}</div>
          <div style="display:flex;flex-direction:column;line-height:1.1;">
            <span style="font-size:0.9rem;font-weight:800;color:var(--text-main);letter-spacing:-0.01em;">Classroom</span>
            <span style="font-size:0.62rem;font-weight:700;letter-spacing:0.06em;color:var(--color-primary);text-transform:uppercase;">VidyaOS</span>
          </div>
        </a>
        <button type="button" class="sidebar-close-btn gc-menu-btn" onclick="closeSidebar()" aria-label="Close sidebar" title="Close sidebar" style="display:inline-flex;align-items:center;justify-content:center;">${getSvgIcon('close', 16)}</button>
      </div>
    `;
  } else if (isAdminPortal) {
    sidebarHeaderHtml = `
      <!-- Admin Drawer Header -->
      <div class="gc-drawer-header sidebar-user-card" style="display:flex;align-items:center;justify-content:space-between;padding:0.85rem 1rem;border-bottom:1px solid var(--border-color);gap:0.65rem;">
        <a href="/admin/dashboard.html" class="gc-brand-link" style="display:flex;align-items:center;gap:0.6rem;text-decoration:none;flex:1;min-width:0;">
          <div style="width:34px;height:34px;font-size:1.1rem;border-radius:9px;background:linear-gradient(135deg,var(--color-primary),var(--color-primary-hover));color:var(--text-white, hsl(0, 0%, 100%));display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:var(--shadow-sm);">${getSvgIcon('academic', 20)}</div>
          <div style="display:flex;flex-direction:column;line-height:1.1;">
            <span style="font-size:0.9rem;font-weight:800;color:var(--text-main);letter-spacing:-0.01em;">Admin Console</span>
            <span style="font-size:0.62rem;font-weight:700;letter-spacing:0.06em;color:var(--color-primary);text-transform:uppercase;">VidyaOS</span>
          </div>
        </a>
        <button type="button" class="sidebar-close-btn gc-menu-btn" onclick="closeSidebar()" aria-label="Close sidebar" title="Close sidebar" style="display:inline-flex;align-items:center;justify-content:center;">${getSvgIcon('close', 16)}</button>
      </div>
    `;
  } else {
    sidebarHeaderHtml = `
      <!-- Executive Profile Card -->
      <div class="sidebar-user-card">
        <div class="sidebar-avatar" style="background:linear-gradient(135deg,var(--color-primary),var(--color-primary-hover));">
          <span>${userInitials}</span>
          <div class="sidebar-avatar-status"></div>
        </div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${safeAttr(displayName)}</div>
          <div class="sidebar-user-role-badge">
            <span class="user-role-chip">${roleBadge}</span>
          </div>
        </div>
        <button type="button" class="sidebar-close-btn" onclick="closeSidebar()" aria-label="Close sidebar" title="Close sidebar" style="display:inline-flex;align-items:center;justify-content:center;">${getSvgIcon('close', 16)}</button>
      </div>
    `;
  }

  const sidebarHtml = `
    <aside id="app-sidebar" class="app-sidebar ${isDrawerPortal ? 'gc-drawer' : ''}" aria-label="Site Navigation">
      ${sidebarHeaderHtml}

      <!-- Scoped Navigation Links -->
      <div class="${isDrawerPortal ? 'gc-drawer-body ' : ''}sidebar-links">
        ${buildLinks(navSections)}
      </div>

      <!-- Institutional Footer Tier -->
      <div class="sidebar-footer">
        <div class="sidebar-footer-row">
          <div class="sidebar-system-pill">
            <span class="sidebar-system-dot"></span>
            <span>VidyaOS &bull; ${safeAttr(portalLabel)}</span>
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

  // Restore sidebar state (drawer closed by default for faculty and admin, open on desktop by default for student)
  const isDesktop = window.innerWidth >= 769;
  const savedOpen = _getSidebarState();
  const shouldOpen = isDrawerPortal ? false : (isDesktop ? (savedOpen !== false) : false);
  if (shouldOpen) {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.add('sidebar-open');
    document.body.classList.add('sidebar-open');
    const btn = document.getElementById('sidebar-toggle-btn') || document.getElementById('btn-menu-toggle');
    if (btn) btn.setAttribute('aria-pressed', 'true');
  } else if (isDrawerPortal) {
    document.body.classList.remove('sidebar-open');
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  // Async: load pending registration count badge for Department Faculty / HODs
  if (user.roles?.includes('TEACHER') || user.department_id || user.teacher?.department_id || user.is_hod || user.is_class_teacher) {
    _loadNavPendingBadge();
  }

  // Async: load teaching classes into drawer
  _loadDrawerTeachingClasses();
}

// ─────────────────────────────────────────────────────────
// UNIVERSAL INSTITUTIONAL PAGE FOOTER (.app-footer)
// ─────────────────────────────────────────────────────────
function renderFooter() {
  // Institutional page footer removed across all pages per user specification
  const existing = document.querySelector('.app-footer');
  if (existing) existing.remove();
}

// ─────────────────────────────────────────────────────────
// MOBILE BOTTOM NAVIGATION BAR (.mobile-bottom-nav)
// ─────────────────────────────────────────────────────────
function renderMobileBottomNav(user) {
  if (document.querySelector('.mobile-bottom-nav') || !user) return;
  const currentPath = window.location.pathname.toLowerCase();

  let tabs = [];
  const svgHome = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
  const svgRegisters = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`;
  const svgUsers = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
  const svgStructure = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"></path></svg>`;
  const svgAttendance = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
  const svgScores = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`;
  const svgMenu = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;

  if (user.roles?.includes('SYSTEM_ADMIN') || currentPath.includes('/admin/')) {
    tabs = [
      { icon: svgHome, label: 'Home', href: '/admin/dashboard.html' },
      { icon: svgStructure, label: 'Structure', href: '/admin/academic-structure.html' },
      { icon: svgUsers, label: 'Faculty', href: '/admin/faculty.html' },
      { icon: svgMenu, label: 'Menu', isMenu: true }
    ];
  } else if (user.roles?.includes('TEACHER') || currentPath.includes('/faculty/')) {
    tabs = [
      { icon: svgHome, label: 'Home', href: '/faculty/dashboard.html' },
      { icon: svgRegisters, label: 'Registers', href: '/faculty/registers.html' },
      { icon: svgUsers, label: 'Students', href: '/faculty/students.html' },
      { icon: svgMenu, label: 'Menu', isMenu: true }
    ];
  } else if (user.roles?.includes('STUDENT') || currentPath.includes('/student/')) {
    tabs = [
      { icon: svgHome, label: 'Home', href: '/student/dashboard.html' },
      { icon: svgAttendance, label: 'Attendance', href: '/student/attendance.html' },
      { icon: svgScores, label: 'Scores', href: '/student/scores.html' },
      { icon: svgMenu, label: 'Menu', isMenu: true }
    ];
  }

  if (!tabs.length) return;

  const itemsHtml = tabs.map(tab => {
    if (tab.isMenu) {
      return `
        <button type="button" class="mobile-nav-item" onclick="toggleSidebar()" aria-label="Open Navigation Menu">
          <span class="mobile-nav-icon">${tab.icon}</span>
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
        <span class="mobile-nav-icon">${tab.icon}</span>
        <span class="mobile-nav-label">${tab.label}</span>
      </a>
    `;
  }).join('');

  const navHtml = `
    <nav class="mobile-bottom-nav" aria-label="Mobile Quick Navigation">
      <div class="mobile-bottom-nav-inner">
        ${itemsHtml}
      </div>
    </nav>
  `;
  document.body.insertAdjacentHTML('beforeend', navHtml);
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
    modal.onclick = function(e) { if (e.target === modal) closeQuickPasswordModal(); };
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
  let avatarContent = '👤';

  if (user.roles?.includes('STUDENT')) {
    profileHref = '/student/profile.html';
    roleChipText = 'Student';
    roleClass = 'chip-student';
    avatarRoleClass = 'role-student';
    avatarContent = '🎓';
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
    avatarContent = '🎓';
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
  } catch (_) {}
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
  } catch (_) {}
}

async function handleNotificationClick(id, linkUrl, e) {
  if (e) e.preventDefault();
  try {
    await fetchApi(`/notifications/${id}/read`, { method: 'PUT' });
  } catch (_) {}
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
// UNIVERSAL AJAX NAVIGATION COMPONENT (Header, Bottom Nav & Profile Drawer)
// ─────────────────────────────────────────────────────────
let _navLoadingPromise = null;

async function loadUniversalNavigation() {
  if (typeof document === 'undefined') return;

  const currentPath = (window.location && window.location.pathname ? window.location.pathname : '').toLowerCase();
  const isPublicAuthPage = currentPath.includes('/login/') || 
                           currentPath.startsWith('/login') || 
                           currentPath.startsWith('/register') || 
                           currentPath.includes('student-register') ||
                           currentPath === '/' || 
                           currentPath === '/index.html';
  
  const token = typeof getAuthToken === 'function' ? getAuthToken() : null;
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const isPortalPage = (currentPath.includes('/faculty/') || 
                        currentPath.includes('/admin/') || 
                        currentPath.includes('/student/')) && !isPublicAuthPage;

  // ── Design Preview Mode ──────────────────────────────────────────────────
  // When opened via Live Server (port 5500) or dev-server (port 5000) on a
  // portal page, inject the nav with a mock "Designer Preview" user so the
  // full UI renders without a backend. A small badge indicates preview mode.
  const serverPort = window.location.port;
  const isPreviewMode = isPortalPage &&
    (!token || !user) &&
    serverPort !== '' && serverPort !== '3000' && serverPort !== '80' && serverPort !== '443';

  if (isPreviewMode && !window._vidyaosPreviewNavInjected) {
    window._vidyaosPreviewNavInjected = true;
    window._vidyaosPreviewUser = {
      name: 'Designer Preview',
      email: 'designer@college.edu',
      roles: ['TEACHER'],
      is_class_teacher: true,
      is_hod: false
    };
    // Monkey-patch getCurrentUser so _initNavigationState can populate avatars
    const _origGetCurrentUser = typeof getCurrentUser === 'function' ? getCurrentUser : null;
    window._previewGetCurrentUser = () => window._vidyaosPreviewUser;
    // Inject a floating preview-mode badge (bottom-left, non-intrusive)
    if (!document.getElementById('vidyaos-preview-badge')) {
      const badge = document.createElement('div');
      badge.id = 'vidyaos-preview-badge';
      badge.title = 'Design Preview Mode — CSS & UI only. API calls disabled.';
      badge.style.cssText = [
        'position:fixed', 'bottom:72px', 'left:8px', 'z-index:99999',
        'background:var(--primary-color,#6366f1)', 'color:#fff',
        'font:700 10px/1 system-ui,sans-serif', 'padding:4px 8px',
        'border-radius:20px', 'pointer-events:none', 'letter-spacing:0.5px',
        'box-shadow:0 2px 8px rgba(0,0,0,0.25)', 'opacity:0.85'
      ].join(';');
      badge.textContent = '🎨 Preview';
      document.body.appendChild(badge);
    }
    // Fall through to the main loading logic below with overridden user
  } else if (!isPreviewMode) {
    // Normal production path: bail if not authed on a portal page
    if (isPublicAuthPage || !isPortalPage || !token || !user) {
      const orphanBottom = document.getElementById('universal-bottom-nav');
      if (orphanBottom) orphanBottom.remove();
      const orphanDrawer = document.getElementById('android-profile-drawer');
      if (orphanDrawer) orphanDrawer.remove();
      const orphanBackdrop = document.getElementById('android-profile-backdrop');
      if (orphanBackdrop) orphanBackdrop.remove();
      const orphanHeader = document.getElementById('universal-app-header');
      if (orphanHeader) orphanHeader.remove();
      document.body.classList.remove('has-bottom-nav');
      return;
    }
  }

  // For Student Portal or pages with Google Classroom navigation (.gc-navbar), do NOT mount faculty universal-bottom-nav
  const isStudentPortal = currentPath.includes('/student/') || (user && user.roles && user.roles.includes('STUDENT') && !user.roles.includes('TEACHER'));
  if (isStudentPortal || document.querySelector('.gc-navbar')) {
    const orphanBottom = document.getElementById('universal-bottom-nav') || document.getElementById('studio-main-bottom-menu');
    if (orphanBottom) orphanBottom.remove();
    const orphanDrawer = document.getElementById('android-profile-drawer');
    if (orphanDrawer) orphanDrawer.remove();
    const orphanBackdrop = document.getElementById('android-profile-backdrop');
    if (orphanBackdrop) orphanBackdrop.remove();
    const orphanHeader = document.getElementById('universal-app-header');
    if (orphanHeader) orphanHeader.remove();
    document.body.classList.remove('has-bottom-nav');
    return;
  }

  // Add spacing class to body immediately so content is not obscured
  document.body.classList.add('has-bottom-nav');

  // If already loaded and mounted, simply update states
  if (document.getElementById('universal-bottom-nav') || document.getElementById('studio-main-bottom-menu')) {
    _initNavigationState();
    return;
  }

  if (_navLoadingPromise) return _navLoadingPromise;

  _navLoadingPromise = (async () => {
    try {
      // Completely secure, zero-AJAX local navigation builder (no external HTML fetches)
      const html = _buildFallbackUniversalNavigation();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 1. Mount Universal Top Header if page has no header at all
      if (!document.getElementById('universal-app-header') && !document.getElementById('app-header') && !document.querySelector('.gc-navbar') && !document.querySelector('.app-header')) {
        const header = doc.getElementById('universal-app-header') || doc.querySelector('.app-header');
        if (header) {
          document.body.insertBefore(document.importNode(header, true), document.body.firstChild);
        }
      }

      // 2. Mount Universal Bottom Nav if not present
      if (!document.getElementById('universal-bottom-nav') && !document.getElementById('studio-main-bottom-menu')) {
        const bottomNav = doc.getElementById('universal-bottom-nav') || doc.querySelector('.universal-bottom-nav') || doc.querySelector('.studio-bottom-nav');
        if (bottomNav) {
          document.body.appendChild(document.importNode(bottomNav, true));
        }
      }

      // 3. Mount Android Profile Drawer & Backdrop if not present
      if (!document.getElementById('android-profile-drawer')) {
        const backdrop = doc.getElementById('android-profile-backdrop') || doc.querySelector('.android-profile-backdrop');
        const drawer = doc.getElementById('android-profile-drawer') || doc.querySelector('.android-profile-drawer');
        if (backdrop) document.body.appendChild(document.importNode(backdrop, true));
        if (drawer) document.body.appendChild(document.importNode(drawer, true));
      }

      // Initialize navigation state & profile details
      _initNavigationState();
    } catch (e) {
      console.error('loadUniversalNavigation error:', e);
    } finally {
      _navLoadingPromise = null;
    }
  })();

  return _navLoadingPromise;
}

function _initNavigationState() {
  const user = getCurrentUser();
  const currentPath = window.location.pathname.toLowerCase();

  // 1. Determine active navigation tab
  const bottomNav = document.getElementById('universal-bottom-nav') || document.getElementById('studio-main-bottom-menu');
  if (bottomNav) {
    const items = bottomNav.querySelectorAll('.bottom-nav-item');
    items.forEach(item => {
      const href = (item.getAttribute('href') || '').toLowerCase();
      const route = item.getAttribute('data-route') || '';

      let isActive = false;
      if (route === 'home' || href.includes('dashboard.html')) {
        isActive = currentPath.includes('dashboard.html');
      } else if (route === 'work' || href.includes('groups.html')) {
        isActive = currentPath.includes('groups.html') || currentPath.includes('group-detail.html');
      } else if (route === 'register' || href.includes('registers.html')) {
        isActive = currentPath.includes('registers.html');
      } else if (route === 'sheets' || href.includes('sheets.html')) {
        isActive = currentPath.includes('sheets.html') || currentPath.includes('tests.html') || currentPath.includes('assignments.html') || currentPath.includes('evaluation.html');
      }

      if (isActive) {
        item.classList.add('active');
      } else if (!item.classList.contains('bottom-nav-profile-btn') && item.id !== 'btn-profile-bottom' && item.id !== 'btn-universal-profile-bottom') {
        item.classList.remove('active');
      }
    });
  }

  // 2. Populate User Profile details into Drawer & Avatars
  // In preview mode, use the injected mock user
  const effectiveUser = user || (window._vidyaosPreviewUser) || null;
  if (effectiveUser) {
    const user = effectiveUser; // shadow param for rest of block
    const displayName = getUserDisplayName(user);
    const email = user.email || user.username || 'faculty@college.edu';
    const cleanName = displayName.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
    const parts = cleanName.split(/\s+/).filter(Boolean);
    const initial = parts.length > 0 ? (parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase()) : 'DS';

    // Top Header Avatar
    const univTopAvatar = document.getElementById('universal-user-avatar');
    if (univTopAvatar) univTopAvatar.textContent = initial;

    // Bottom Navigation Bar Avatar
    const bottomAvatar = document.getElementById('universal-bottom-avatar') || document.getElementById('bottom-avatar-circle');
    if (bottomAvatar) bottomAvatar.textContent = initial;

    // Drawer Avatar & Text
    const drawerAvatar = document.getElementById('drawer-user-avatar');
    if (drawerAvatar) drawerAvatar.textContent = initial;

    const drawerName = document.getElementById('drawer-user-name');
    if (drawerName) drawerName.textContent = displayName;

    const drawerEmail = document.getElementById('drawer-user-email');
    if (drawerEmail) drawerEmail.textContent = email;

    const drawerRole = document.getElementById('drawer-user-role');
    if (drawerRole) {
      if (user.roles?.includes('SYSTEM_ADMIN')) {
        drawerRole.textContent = 'System Administrator';
      } else if (user.is_hod) {
        drawerRole.textContent = 'Head of Department (HOD)';
      } else if (user.roles?.includes('TEACHER') || user.is_class_teacher) {
        drawerRole.textContent = 'Faculty Member';
      } else if (user.roles?.includes('STUDENT')) {
        drawerRole.textContent = 'Student';
      }
    }
  } // end effectiveUser block

  updateDrawerThemeLabel();
}

function toggleAndroidProfileDrawer(forceState) {
  const drawer = document.getElementById('android-profile-drawer');
  const backdrop = document.getElementById('android-profile-backdrop');
  if (!drawer) return;

  const isOpen = typeof forceState === 'boolean' ? forceState : !drawer.classList.contains('open');

  if (isOpen) {
    drawer.style.display = 'block';
    if (backdrop) backdrop.style.display = 'block';
    const scheduleFrame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn => setTimeout(fn, 16));
    scheduleFrame(() => {
      drawer.classList.add('open');
      if (backdrop) backdrop.classList.add('active');
    });
    updateDrawerThemeLabel();
  } else {
    drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    setTimeout(() => {
      if (!drawer.classList.contains('open')) {
        drawer.style.display = 'none';
        if (backdrop) backdrop.style.display = 'none';
      }
    }, 260);
  }
}

function updateDrawerThemeLabel() {
  const label = document.getElementById('drawer-theme-label');
  if (!label) return;
  const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('app_theme') || 'light';
  if (currentTheme === 'dark') {
    label.textContent = 'Dark Mode Active (Tap to switch to Light)';
  } else {
    label.textContent = 'Light Mode Active (Tap to switch to Dark)';
  }
}

function _buildFallbackUniversalNavigation() {
  return `
<nav class="studio-bottom-nav universal-bottom-nav" id="universal-bottom-nav" aria-label="Main Site Navigation">
  <a href="/faculty/dashboard.html" class="bottom-nav-item" data-route="home">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
    <span>Home</span>
  </a>

  <a href="/faculty/registers.html" class="bottom-nav-item" data-route="register">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    </svg>
    <span>Register</span>
  </a>

  <a href="/faculty/sheets.html" class="bottom-nav-item" data-route="sheets">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="3" y1="9" x2="21" y2="9"></line>
      <line x1="3" y1="15" x2="21" y2="15"></line>
      <line x1="9" y1="3" x2="9" y2="21"></line>
      <line x1="15" y1="3" x2="15" y2="21"></line>
    </svg>
    <span>Sheet Studio</span>
  </a>

  <button type="button" class="bottom-nav-item bottom-nav-profile-btn" id="btn-universal-profile-bottom" onclick="toggleAndroidProfileDrawer()" style="background:none;border:none;">
    <div class="bottom-profile-avatar" id="universal-bottom-avatar">DS</div>
    <span>Profile</span>
  </button>
</nav>

<div class="android-profile-backdrop" id="android-profile-backdrop" onclick="toggleAndroidProfileDrawer(false)" style="display:none;"></div>
<div class="android-profile-drawer" id="android-profile-drawer" style="display:none;">
  <div class="drawer-handle-pill" onclick="toggleAndroidProfileDrawer(false)"></div>
  <div class="profile-drawer-header">
    <div class="profile-drawer-avatar" id="drawer-user-avatar">DS</div>
    <div class="profile-drawer-info">
      <h4 id="drawer-user-name" style="margin:0;font-size:0.95rem;font-weight:800;color:var(--text-main);">Faculty Member</h4>
      <div id="drawer-user-email" style="font-size:0.75rem;color:var(--text-muted);margin-top:0.15rem;">faculty@college.edu</div>
      <div style="display:flex;gap:0.35rem;margin-top:0.35rem;">
        <span class="badge" id="drawer-user-role" style="background:var(--color-primary-light);color:var(--color-primary);font-size:0.68rem;font-weight:700;padding:0.15rem 0.45rem;border-radius:var(--radius-pill);">Faculty Member</span>
      </div>
    </div>
    <button type="button" class="drawer-close-btn" onclick="toggleAndroidProfileDrawer(false)">✕</button>
  </div>

  <div class="profile-quick-links-list">
    <button type="button" class="quick-link-item" onclick="if(typeof toggleTheme === 'function'){ toggleTheme(); } else if(typeof toggleAppTheme === 'function'){ toggleAppTheme(); } if(typeof updateDrawerThemeLabel === 'function'){ updateDrawerThemeLabel(); }">
      <div class="quick-link-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
      </div>
      <div class="quick-link-text">
        <span class="quick-link-title">App Theme</span>
        <span class="quick-link-subtitle" id="drawer-theme-label">Switch Dark / Light Mode</span>
      </div>
      <div class="quick-link-arrow">➔</div>
    </button>

    <a href="/faculty/groups.html" class="quick-link-item">
      <div class="quick-link-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
      </div>
      <div class="quick-link-text">
        <span class="quick-link-title">My Classes &amp; Teaching Groups</span>
        <span class="quick-link-subtitle">Google Classroom-style teaching groups</span>
      </div>
      <div class="quick-link-arrow">➔</div>
    </a>

    <a href="/faculty/registers.html" class="quick-link-item">
      <div class="quick-link-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
      </div>
      <div class="quick-link-text">
        <span class="quick-link-title">Attendance Registers &amp; Live Studio</span>
        <span class="quick-link-subtitle">Dynamic QR roll call &amp; monthly ledger</span>
      </div>
      <div class="quick-link-arrow">➔</div>
    </a>

    <a href="/faculty/tests.html" class="quick-link-item">
      <div class="quick-link-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
      </div>
      <div class="quick-link-text">
        <span class="quick-link-title">Class Tests &amp; Periodic Exams</span>
        <span class="quick-link-subtitle">Question-wise marks entry &amp; gradebooks</span>
      </div>
      <div class="quick-link-arrow">➔</div>
    </a>

    <a href="/faculty/assignments.html" class="quick-link-item">
      <div class="quick-link-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
      </div>
      <div class="quick-link-text">
        <span class="quick-link-title">Coursework Assignments</span>
        <span class="quick-link-subtitle">Assignment grading &amp; submissions</span>
      </div>
      <div class="quick-link-arrow">➔</div>
    </a>

    <a href="/faculty/sheets.html" class="quick-link-item">
      <div class="quick-link-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
      </div>
      <div class="quick-link-text">
        <span class="quick-link-title">Unified Sheet Studio</span>
        <span class="quick-link-subtitle">Master evaluations &amp; spreadsheet gradebooks</span>
      </div>
      <div class="quick-link-arrow">➔</div>
    </a>

    <a href="/faculty/profile.html" class="quick-link-item">
      <div class="quick-link-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
      </div>
      <div class="quick-link-text">
        <span class="quick-link-title">Account Settings</span>
        <span class="quick-link-subtitle">Profile details &amp; preferences</span>
      </div>
      <div class="quick-link-arrow">➔</div>
    </a>

    <button type="button" class="quick-link-item quick-link-logout" onclick="logout()">
      <div class="quick-link-icon" style="color:var(--status-absent);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </div>
      <div class="quick-link-text">
        <span class="quick-link-title" style="color:var(--status-absent);">Sign Out of VidyaOS</span>
        <span class="quick-link-subtitle">Safely terminate active session</span>
      </div>
      <div class="quick-link-arrow" style="color:var(--status-absent);">➔</div>
    </button>
  </div>
</div>
`;
}

if (typeof window !== 'undefined') {
  window.loadUniversalNavigation = loadUniversalNavigation;
  window.toggleAndroidProfileDrawer = toggleAndroidProfileDrawer;
  window.updateDrawerThemeLabel = updateDrawerThemeLabel;
}

// Auto-initialize theme & sync session on script execution
if (typeof document !== 'undefined') {
  initAppTheme();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { 
      syncCurrentUser(); 
      loadUniversalNavigation();
    });
  } else {
    syncCurrentUser();
    loadUniversalNavigation();
  }
}
