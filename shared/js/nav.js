/**
 * ══════════════════════════════════════════════════════════════════════════
 * VIDYAOS INSTITUTIONAL NAVIGATION & HEADER ENGINE
 * Location: /frontend/shared/nav/nav.js
 * (Also mirrored to /frontend/shared/js/nav.js for backward-compatible paths)
 *
 * Provides:
 * - 4-Role Unified Navigation (Admin, HOD, Faculty, Student)
 * - Persistent App Header (.gc-navbar)
 * - Persistent Collapsible Sidebar (#app-sidebar / .gc-drawer)
 * - Mobile Bottom Navigation (.mobile-bottom-nav)
 * - Apps Launcher Dropdown (#apps-launcher-dropdown)
 * - User Profile Popover (#user-profile-popover)
 * - Native View Transitions wiring & instant progress indicator
 * - 100% Theme Tokenized — Zero Hardcoded Hex Colors
 * ══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────
// SIDEBAR NAVIGATION STATE & TOGGLES
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
  } catch (_) {}
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
  let sidebar = document.getElementById('app-sidebar') || document.getElementById('classroom-drawer') || document.getElementById('gc-drawer');
  let backdrop = document.getElementById('sidebar-backdrop') || document.getElementById('classroom-drawer-backdrop') || document.getElementById('gc-drawer-backdrop');
  if (!sidebar) {
    if (typeof mountNavigationSystem === 'function') {
      mountNavigationSystem();
      sidebar = document.getElementById('app-sidebar') || document.getElementById('classroom-drawer') || document.getElementById('gc-drawer');
      backdrop = document.getElementById('sidebar-backdrop') || document.getElementById('classroom-drawer-backdrop') || document.getElementById('gc-drawer-backdrop');
    }
  }
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
  const sidebar = document.getElementById('app-sidebar') || document.getElementById('classroom-drawer') || document.getElementById('gc-drawer');
  const backdrop = document.getElementById('sidebar-backdrop') || document.getElementById('classroom-drawer-backdrop') || document.getElementById('gc-drawer-backdrop');

  // Overlay slide-out navigation starts closed by default across all pages
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

// ─────────────────────────────────────────────────────────
// APPS LAUNCHER & USER PROFILE POPOVER
// ─────────────────────────────────────────────────────────

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
    if (typeof window.closeUserDropdown === 'function') window.closeUserDropdown();
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
    if (typeof window.closeUserDropdown === 'function') window.closeUserDropdown();
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
  window.toggleSidebar = toggleSidebar;
  window.closeSidebar = closeSidebar;
  window.toggleDrawer = toggleSidebar;
  window.closeDrawer = closeSidebar;
  window.toggleStudentDrawer = toggleSidebar;
  window._updateMenuToggleButtons = _updateMenuToggleButtons;
  window._initSidebarState = _initSidebarState;
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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSidebar();
      closeAppsLauncher();
      closeUserProfile();
    }
  });
}

// ─────────────────────────────────────────────────────────
// TEACHING CLASSES DYNAMIC LOADER (Faculty & HOD)
// ─────────────────────────────────────────────────────────

async function _loadDrawerTeachingClasses() {
  const container = document.getElementById('drawer-classes-list');
  if (!container) return;
  const token = typeof window.getAuthToken === 'function' ? window.getAuthToken() : localStorage.getItem('token');
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
          <span style="width:24px; height:24px; border-radius:50%; background:var(--color-primary); color:var(--text-white, hsl(0,0%,100%)); display:inline-flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; flex-shrink:0;">${initial}</span>
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeName}</span>
        </a>
      `;
    }).join('');
  } catch (_) {}
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
  folder: (s=18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
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
// Profiles: Admin, HOD, Faculty, Student
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

// ─────────────────────────────────────────────────────────
// MOUNT NAVIGATION SYSTEM
// ─────────────────────────────────────────────────────────

function mountNavigationSystem(options = {}) {
  if (typeof document === 'undefined') return;

  const currentPath = (window.location && window.location.pathname ? window.location.pathname : '').toLowerCase();
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
    document.body.setAttribute('data-nav-ready', '1');
    const injectedNav = document.querySelectorAll('.gc-navbar, #app-sidebar, #sidebar-backdrop, .mobile-bottom-nav');
    injectedNav.forEach(el => el.remove());
    return;
  }

  let user = typeof window.getCurrentUser === 'function' ? window.getCurrentUser() : null;
  if (!user) {
    if (currentPath.includes('/admin/')) {
      user = { full_name: 'Administrator', username: 'admin', roles: ['SYSTEM_ADMIN'] };
    } else {
      document.body.setAttribute('data-nav-ready', '1');
      return;
    }
  }

  const roleKey = options.role || resolveNavigationRole(user, currentPath);
  const profile = NAVIGATION_PROFILES[roleKey] || NAVIGATION_PROFILES.faculty;

  const displayName = typeof window.getUserDisplayName === 'function' ? window.getUserDisplayName(user) : (user.full_name || user.username || 'User');
  const email = user.email || user.username || `${roleKey}@college.edu`;
  const cleanName = displayName.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  const initial = parts.length > 0 ? (parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase()) : roleKey.slice(0, 2).toUpperCase();

  const portalLabel = typeof profile.portalLabel === 'function' ? profile.portalLabel(user) : profile.portalLabel;

  // 2. HEADER (.gc-navbar)
  _ensureHeader(profile, user, initial, displayName, email, portalLabel);

  // 3. SIDEBAR (#app-sidebar)
  _ensureSidebar(profile, user, portalLabel);

  // 4. APP WORKSPACE WRAPPER (#app-workspace)
  _ensureWorkspace();

  // 5. MOBILE BOTTOM NAV (.mobile-bottom-nav)
  _ensureMobileBottomNav(profile, currentPath);

  // 5. Navigation progress bar & View Transitions wiring
  _ensureNavProgress();

  // 6. Signal that navigation shell is ready to prevent FOUC
  document.body.setAttribute('data-nav-ready', '1');

  // 7. Async enrichments for faculty & HOD
  if (roleKey === 'faculty' || roleKey === 'hod') {
    _loadDrawerTeachingClasses();
    _loadNavPendingBadge();
  }
}

// ─────────────────────────────────────────────────────────
// NAVIGATION PROGRESS BAR (Non-Blocking, No e.intercept())
// ─────────────────────────────────────────────────────────

let _navProgressInitialized = false;
function _ensureNavProgress() {
  if (_navProgressInitialized) return;
  _navProgressInitialized = true;

  if (!document.getElementById('vidyaos-nav-progress')) {
    const bar = document.createElement('div');
    bar.id = 'vidyaos-nav-progress';
    document.body.insertAdjacentElement('afterbegin', bar);
  }

  const bar = document.getElementById('vidyaos-nav-progress');
  if (!bar) return;

  function _showProgress() {
    bar.className = '';
    void bar.offsetWidth; // force reflow
    bar.classList.add('loading');
  }
  function _doneProgress() {
    bar.classList.remove('loading');
    bar.classList.add('done');
    setTimeout(() => { bar.className = ''; }, 400);
  }

  // View Transitions events (Chrome 126+)
  if ('onpageswap' in window) {
    window.addEventListener('pageswap', (e) => {
      if (e.viewTransition) _showProgress();
    });
  }
  if ('onpagereveal' in window) {
    window.addEventListener('pagereveal', (e) => {
      if (e.viewTransition) {
        e.viewTransition.ready.then(_doneProgress).catch(_doneProgress);
      }
    });
  }

  // Navigation API listener (notify only, NEVER call e.intercept)
  if (typeof navigation !== 'undefined' && navigation.addEventListener) {
    navigation.addEventListener('navigate', (e) => {
      if (e.hashChange || e.downloadRequest) return;
      try {
        const url = new URL(e.destination.url);
        if (url.origin !== location.origin) return;
      } catch (_) { return; }
      _showProgress();
    });
  }

  // Instant click listener for all links
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

// ─────────────────────────────────────────────────────────
// HEADER INJECTION & UPDATES
// ─────────────────────────────────────────────────────────

function _ensureHeader(profile, user, initial, displayName, email, portalLabel) {
  if (window.DISABLE_HEADER || window.DISABLE_NAV || window.DISABLE_NAVIGATION) return;
  if (document.querySelector('.cw-gclass-nav') || (document.body && document.body.classList.contains('cw-create-body'))) return;
  let header = document.querySelector('.gc-navbar, .app-header, .cw-gclass-nav');
  if (header && header.classList.contains('cw-gclass-nav')) {
    // Dedicated editor header already active (e.g. classwork create)
    return;
  }
  
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
          <button type="button" class="gc-icon-btn" onclick="if(typeof toggleAppTheme==='function')toggleAppTheme()" id="btn-theme-toggle" title="Toggle Theme" aria-label="Toggle Theme">
            ${getSvgIcon('moon', 18)}
          </button>
          <div class="gc-user-avatar" id="gc-user-avatar" onclick="toggleUserProfile(event)" title="Account Profile">${initial}</div>
        </div>
      </header>
    `;
    document.body.insertAdjacentHTML('afterbegin', headerHtml);
    header = document.querySelector('.gc-navbar');
  }

  // Ensure toggle button & role badge in left wrap
  const leftWrap = header.querySelector('.gc-nav-left, .header-left');
  if (leftWrap) {
    let toggleBtn = document.getElementById('sidebar-toggle-btn') || document.getElementById('btn-menu-toggle') || leftWrap.querySelector('.gc-menu-btn');
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.id = 'sidebar-toggle-btn';
      toggleBtn.className = 'sidebar-toggle-btn gc-menu-btn';
      toggleBtn.type = 'button';
      toggleBtn.onclick = toggleSidebar;
      toggleBtn.setAttribute('aria-label', 'Toggle navigation');
      leftWrap.insertBefore(toggleBtn, leftWrap.firstChild);
    }
    toggleBtn.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;">${getSvgIcon('menu', 18)}</span>`;
    toggleBtn.onclick = toggleSidebar;

    // Ensure Page Badge is present and updated
    let badge = leftWrap.querySelector('.gc-page-badge, #app-header-page-title');
    if (!badge && profile.pageBadge) {
      badge = document.createElement('span');
      badge.className = `gc-page-badge ${profile.badgeClass || ''}`;
      badge.id = 'app-header-page-title';
      badge.textContent = profile.pageBadge;
      leftWrap.appendChild(badge);
    } else if (badge && profile.pageBadge) {
      badge.className = `gc-page-badge ${profile.badgeClass || ''}`;
      badge.textContent = profile.pageBadge;
      badge.style.display = 'inline-flex';
    }
  }

  // Ensure 9-dot apps button & theme button in right wrap
  const navRight = header.querySelector('.gc-nav-right, .header-right') || header;
  const appsBtn = navRight.querySelector('#btn-apps-launcher, .gc-icon-btn[onclick*="toggleAppsLauncher"]');
  if (appsBtn) {
    appsBtn.id = 'btn-apps-launcher';
    appsBtn.innerHTML = getSvgIcon('apps', 18);
    appsBtn.setAttribute('title', 'Apps & Modules');
    appsBtn.setAttribute('aria-label', 'Apps Launcher');
    appsBtn.setAttribute('onclick', 'toggleAppsLauncher(event)');
  }

  const themeBtn = navRight.querySelector('#btn-theme-toggle, .gc-icon-btn[onclick*="toggleTheme"], .gc-icon-btn[onclick*="toggleAppTheme"]');
  if (themeBtn) {
    themeBtn.id = 'btn-theme-toggle';
    themeBtn.setAttribute('onclick', 'if(typeof toggleAppTheme==="function")toggleAppTheme();else if(typeof toggleTheme==="function")toggleTheme();');
    themeBtn.innerHTML = getSvgIcon('moon', 18);
  }

  // Update Avatar
  const avatarEl = document.getElementById('gc-user-avatar') || header.querySelector('.gc-user-avatar');
  if (avatarEl) {
    avatarEl.textContent = initial;
    avatarEl.setAttribute('onclick', 'toggleUserProfile(event)');
  }

  _ensureAppsLauncher(header, profile);
  _ensureUserProfilePopover(header, user, initial, displayName, email, portalLabel);

  if (typeof window.updateThemeToggleUI === 'function') {
    const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('app_theme') || 'light';
    window.updateThemeToggleUI(currentTheme);
  }
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

  if (!popover.querySelector('#popover-avatar')) {
    popover.innerHTML = `
      <div class="gc-user-avatar" id="popover-avatar" style="width:56px;height:56px;font-size:1.35rem;margin-bottom:.5rem;">${initial}</div>
      <div style="font-weight:700;font-size:.95rem;color:var(--text-main);" id="popover-user-name">${displayName}</div>
      <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:.85rem;" id="popover-user-email">${email}</div>
      <div style="width:100%;height:1px;background:var(--border-color);margin-bottom:.85rem;"></div>
      <button type="button" class="btn btn-secondary btn-sm" style="width:100%;margin-bottom:.5rem;text-decoration:none;justify-content:center;display:flex;align-items:center;gap:0.35rem;" onclick="if(typeof toggleAppTheme==='function')toggleAppTheme()">
        <span style="display:inline-flex;align-items:center;">${getSvgIcon('moon', 14)}</span>
        <span>Toggle Appearance</span>
      </button>
      <button type="button" class="btn btn-sm" style="width:100%;background:var(--status-absent-bg);color:var(--status-absent);border:1px solid var(--status-absent);display:flex;align-items:center;justify-content:center;gap:0.35rem;" onclick="if(typeof logout==='function')logout()">
        <span style="display:inline-flex;align-items:center;">${getSvgIcon('logout', 14)}</span>
        <span>Sign Out</span>
      </button>
    `;
  }
}

// ─────────────────────────────────────────────────────────
// SIDEBAR INJECTION & UPDATES
// ─────────────────────────────────────────────────────────

function _ensureSidebar(profile, user, portalLabel) {
  if (window.DISABLE_SIDEBAR || window.DISABLE_NAV || window.DISABLE_NAVIGATION) return;
  if (document.querySelector('.cw-gclass-nav') || (document.body && document.body.classList.contains('cw-create-body'))) return;

  const currentPath = window.location.pathname.toLowerCase();
  const currentUrl = (window.location.pathname + window.location.search).toLowerCase();

  let sidebar = document.getElementById('app-sidebar');

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

  const safePortalLabel = String(portalLabel || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const sidebarInnerHtml = `
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
        <button type="button" class="sidebar-logout-btn" onclick="if(typeof logout==='function')logout()" title="Sign out of system">
          <span style="display:inline-flex;align-items:center;">${getSvgIcon('logout', 16)}</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  `;

  if (!sidebar) {
    const sidebarHtml = `
      <aside id="app-sidebar" class="app-sidebar gc-drawer" aria-label="Site Navigation">
        ${sidebarInnerHtml}
      </aside>
      <div id="sidebar-backdrop" class="sidebar-backdrop gc-drawer-backdrop" onclick="closeSidebar()"></div>
    `;
    document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
    document.body.classList.add('has-sidebar');
  } else if (!sidebar.querySelector('.sidebar-footer') || !sidebar.querySelector('.sidebar-item-icon')) {
    // Upgrade existing skeleton to rich SVG icons & institutional footer
    sidebar.className = 'app-sidebar gc-drawer';
    sidebar.innerHTML = sidebarInnerHtml;
    if (!document.getElementById('sidebar-backdrop')) {
      document.body.insertAdjacentHTML('beforeend', '<div id="sidebar-backdrop" class="sidebar-backdrop gc-drawer-backdrop" onclick="closeSidebar()"></div>');
    }
    document.body.classList.add('has-sidebar');
  }

  _initSidebarState();
}

// ─────────────────────────────────────────────────────────
// MOBILE BOTTOM NAVIGATION INJECTION
// ─────────────────────────────────────────────────────────

function _ensureMobileBottomNav(profile, currentPath) {
  if (window.DISABLE_BOTTOM_NAV || window.DISABLE_NAV || window.DISABLE_NAVIGATION) {
    let existing = document.querySelector('.mobile-bottom-nav');
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

// ─────────────────────────────────────────────────────────
// APP WORKSPACE WRAPPER INJECTION
// ─────────────────────────────────────────────────────────

function _ensureWorkspace() {
  if (window.DISABLE_NAV || window.DISABLE_NAVIGATION || document.querySelector('.cw-gclass-nav') || (document.body && document.body.classList.contains('cw-create-body'))) return;
  let workspace = document.getElementById('app-workspace');
  if (!workspace) {
    const main = document.querySelector('body > main, body > .main-content, body > .page-container');
    if (main && !main.classList.contains('app-workspace') && main.id !== 'app-workspace') {
      workspace = document.createElement('div');
      workspace.id = 'app-workspace';
      workspace.className = 'app-workspace';
      main.parentNode.insertBefore(workspace, main);
      workspace.appendChild(main);
    }
  }
}

// ─────────────────────────────────────────────────────────
// PENDING REGISTRATION BADGE (Class Teachers)
// ─────────────────────────────────────────────────────────

async function _loadNavPendingBadge() {
  try {
    const token = typeof window.getAuthToken === 'function' ? window.getAuthToken() : localStorage.getItem('token');
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
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────
// LEGACY COMPATIBILITY STUBS
// ─────────────────────────────────────────────────────────

function renderSidebar() { mountNavigationSystem(); }
function renderClassroomNavbar() { mountNavigationSystem(); }
function renderMobileBottomNav() { mountNavigationSystem(); }
function renderFooter() {
  const existing = document.querySelector('.app-footer');
  if (existing) existing.remove();
}
function renderUserNav() {}
function loadUniversalNavigation() { mountNavigationSystem(); }
function toggleAndroidProfileDrawer() { toggleUserProfile(); }
function updateDrawerThemeLabel() {}

// Global Exports
if (typeof window !== 'undefined') {
  if (typeof window.handleLogout !== 'function') {
    window.handleLogout = function () {
      if (typeof window.logout === 'function') {
        window.logout();
      } else if (typeof logout === 'function') {
        logout();
      } else {
        try {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
        } catch (_) {}
        window.location.href = '/index.html';
      }
    };
  }
  if (typeof window.logout !== 'function') {
    window.logout = window.handleLogout;
  }
  window.NAVIGATION_PROFILES = NAVIGATION_PROFILES;
  window.resolveNavigationRole = resolveNavigationRole;
  window.mountNavigationSystem = mountNavigationSystem;
  window.loadUniversalNavigation = loadUniversalNavigation;
  window.toggleAndroidProfileDrawer = toggleAndroidProfileDrawer;
  window.updateDrawerThemeLabel = updateDrawerThemeLabel;
  window.renderSidebar = renderSidebar;
  window.renderClassroomNavbar = renderClassroomNavbar;
  window.renderMobileBottomNav = renderMobileBottomNav;
  window.renderFooter = renderFooter;
  window.renderUserNav = renderUserNav;
}

// Auto-initialize when loaded as standalone module
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mountNavigationSystem();
    });
  } else {
    mountNavigationSystem();
  }
}
