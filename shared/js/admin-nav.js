/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS INSTITUTIONAL ADMIN NAVIGATION SYSTEM (admin-nav.js)
 * Location: /js/admin-nav.js  (and /shared/js/admin-nav.js)
 * 
 * Standalone, zero-AJAX controller for:
 * 1. Admin Top App Bar (.gc-navbar)
 * 2. Admin Slide-out Drawer Navigation (#app-sidebar)
 * 3. Admin Mobile Bottom Navigation Bar (.mobile-bottom-nav)
 * 
 * Key Principles:
 * - 100% Pure Inline SVG Icons (Zero raw emojis)
 * - Zero external HTML fetches (eliminates AJAX security & CORS vectors)
 * - Immediate zero-layout-shift initialization
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // 1. PURE SVG ICON DICTIONARY (Zero Raw Emojis)
  // All navigation controls, tabs, and drawer items strictly use
  // these lightweight, theme-tokenized institutional SVG vectors.
  // ─────────────────────────────────────────────────────────────
  const ADMIN_ICONS = {
    menu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
    close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    building: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"/></svg>`,
    apps: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
    moon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    sun: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    dashboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`,
    structure: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/></svg>`,
    faculty: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>`,
    students: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    reports: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    audit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    home: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    logout: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    profile: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    key: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l2.5 2.5M18.5 4.5l2.5 2.5"/></svg>`
  };

  // ─────────────────────────────────────────────────────────────
  // 2. ADMIN MODULE CONFIGURATION
  // Master list of administrative modules used for active route
  // matching and fallback drawer rendering.
  // ─────────────────────────────────────────────────────────────
  const ADMIN_MODULES = [
    { key: 'dashboard', label: 'Dashboard', href: '/admin/dashboard.html', icon: ADMIN_ICONS.dashboard },
    { key: 'academics', label: 'Academic Structure', href: '/admin/academic-structure.html', icon: ADMIN_ICONS.structure },
    { key: 'faculty', label: 'HOD Management', href: '/admin/faculty.html', icon: ADMIN_ICONS.faculty },
    { key: 'reports', label: 'Reports & Analytics', href: '/admin/reports.html', icon: ADMIN_ICONS.reports },
    { key: 'settings', label: 'System Settings', href: '/admin/settings.html', icon: ADMIN_ICONS.settings },
    { key: 'audit', label: 'Audit Logs', href: '/admin/audit-logs.html', icon: ADMIN_ICONS.audit }
  ];

  const ADMIN_BOTTOM_TABS = [
    { label: 'Home', href: '/admin/dashboard.html', icon: ADMIN_ICONS.home },
    { label: 'Structure', href: '/admin/academic-structure.html', icon: ADMIN_ICONS.structure },
    { label: 'Faculty', href: '/admin/faculty.html', icon: ADMIN_ICONS.faculty },
    { label: 'Menu', isMenu: true, icon: ADMIN_ICONS.menu }
  ];

  // Helper: Sanitize string for attribute output
  function safeAttr(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Helper: Check if a URL matches the current page (handles both .html and directory forms)
  function isRouteActive(href) {
    if (!href) return false;
    const currentPath = window.location.pathname.toLowerCase();
    const hrefLower = href.toLowerCase();
    const pathBase = currentPath.replace('.html', '').replace('/index', '').replace(/\/$/, '');
    const itemBase = hrefLower.replace('.html', '').replace('/index', '').replace(/\/$/, '');

    if (itemBase.endsWith('dashboard')) {
      return pathBase.endsWith('dashboard') || pathBase === '/admin' || currentPath === '/admin/';
    }
    if (itemBase.endsWith('reports')) {
      return pathBase.endsWith('reports') || pathBase.endsWith('students');
    }
    return currentPath === hrefLower || pathBase === itemBase;
  }

  // ─────────────────────────────────────────────────────────────
  // 3. DRAWER CONTROLS (#app-sidebar)
  // Opens/closes the slide-out navigation drawer and synchronizes
  // body scrolling and backdrop visibility.
  // ─────────────────────────────────────────────────────────────
  function toggleSidebar(forceState) {
    const sidebar = document.getElementById('app-sidebar') || document.getElementById('classroom-drawer') || document.getElementById('gc-drawer');
    const backdrop = document.getElementById('sidebar-backdrop') || document.getElementById('classroom-drawer-backdrop') || document.getElementById('gc-drawer-backdrop');
    if (!sidebar) return;

    const isDesktop = window.innerWidth >= 769;
    const isCurrentlyOpen = isDesktop
      ? !document.body.classList.contains('sidebar-closed') && (sidebar.classList.contains('sidebar-open') || sidebar.classList.contains('open'))
      : (sidebar.classList.contains('sidebar-open') || sidebar.classList.contains('open'));

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

    try {
      localStorage.setItem('sidebar_open', shouldOpen ? 'true' : 'false');
    } catch (_) {}

    const btn = document.getElementById('sidebar-toggle-btn') || document.getElementById('btn-menu-toggle');
    if (btn) btn.setAttribute('aria-pressed', shouldOpen ? 'true' : 'false');
  }

  function closeSidebar() {
    toggleSidebar(false);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. HEADER POPOVER CONTROLS (Apps Launcher & Profile)
  // Toggles dropdown menus with exclusive state and click-away
  // dismissal.
  // ─────────────────────────────────────────────────────────────
  function toggleAppsLauncher(event) {
    if (event) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }
    const launcher = document.getElementById('apps-launcher-dropdown');
    if (!launcher) return;
    const isOpen = launcher.classList.toggle('open');
    launcher.style.display = isOpen ? 'grid' : 'none';
    if (isOpen) {
      const popover = document.getElementById('user-profile-popover');
      if (popover) {
        popover.classList.remove('open');
        popover.style.display = 'none';
      }
    }
  }

  function toggleUserProfile(event) {
    if (event) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }
    const popover = document.getElementById('user-profile-popover');
    if (!popover) return;
    const isOpen = popover.classList.toggle('open');
    popover.style.display = isOpen ? 'flex' : 'none';
    if (isOpen) {
      const launcher = document.getElementById('apps-launcher-dropdown');
      if (launcher) {
        launcher.classList.remove('open');
        launcher.style.display = 'none';
      }
    }
  }

  // Dark/Light appearance toggle
  function toggleTheme() {
    if (typeof window.toggleAppTheme === 'function' && window.toggleAppTheme !== toggleTheme) {
      window.toggleAppTheme();
      return;
    }
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    try { localStorage.setItem('app_theme', next); } catch (_) {}
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.innerHTML = next === 'dark' ? ADMIN_ICONS.sun : ADMIN_ICONS.moon;
  }

  // Global click-away listener to dismiss popovers
  document.addEventListener('click', function (e) {
    const launcher = document.getElementById('apps-launcher-dropdown');
    const popover = document.getElementById('user-profile-popover');
    if (launcher && launcher.classList.contains('open')) {
      if (!e.target.closest('#apps-launcher-dropdown') && !e.target.closest('[onclick*="toggleAppsLauncher"]')) {
        launcher.classList.remove('open');
        launcher.style.display = 'none';
      }
    }
    if (popover && popover.classList.contains('open')) {
      if (!e.target.closest('#user-profile-popover') && !e.target.closest('#gc-user-avatar') && !e.target.closest('[onclick*="toggleUserProfile"]')) {
        popover.classList.remove('open');
        popover.style.display = 'none';
      }
    }
  });

  // Global Escape key dismissals
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeSidebar();
      const launcher = document.getElementById('apps-launcher-dropdown');
      if (launcher) { launcher.classList.remove('open'); launcher.style.display = 'none'; }
      const popover = document.getElementById('user-profile-popover');
      if (popover) { popover.classList.remove('open'); popover.style.display = 'none'; }
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 5. ACTIVE ROUTE HIGHLIGHTING
  // Scans static HTML links on drawer and mobile bottom nav,
  // marking the current active page cleanly.
  // ─────────────────────────────────────────────────────────────
  function highlightActiveNavLinks() {
    // Drawer links
    document.querySelectorAll('#app-sidebar .gc-drawer-link').forEach(link => {
      const href = link.getAttribute('href');
      if (isRouteActive(href)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Mobile bottom nav items
    document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item').forEach(item => {
      const href = item.getAttribute('href');
      if (href && isRouteActive(href)) {
        item.classList.add('active');
      } else if (href) {
        item.classList.remove('active');
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 6. ENHANCE HEADER WITH SESSION USER METADATA
  // Populates administrative initials and user info into avatar
  // and profile popovers.
  // ─────────────────────────────────────────────────────────────
  function enhanceAdminHeader() {
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    let displayName = 'Administrator';
    let email = 'admin@college.edu';
    let initials = 'SA';

    if (user) {
      if (typeof getUserDisplayName === 'function') displayName = getUserDisplayName(user);
      else if (user.name) displayName = user.name;
      if (user.email) email = user.email;

      const cleanName = displayName.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
      const parts = cleanName.split(/\s+/).filter(Boolean);
      initials = parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : (cleanName.slice(0, 2).toUpperCase() || 'SA');
    }

    const avatarEl = document.getElementById('gc-user-avatar');
    if (avatarEl) avatarEl.textContent = initials;

    const popoverAvatar = document.getElementById('popover-avatar');
    if (popoverAvatar) popoverAvatar.textContent = initials;
    const popoverName = document.getElementById('popover-user-name');
    if (popoverName) popoverName.textContent = displayName;
    const popoverEmail = document.getElementById('popover-user-email');
    if (popoverEmail) popoverEmail.textContent = email;

    // Enforce Minimal Universal Header Bar (Logo, VidyaOS, Tools, Profile)
    document.querySelectorAll('.gc-navbar .gc-brand-title').forEach(el => {
      el.textContent = 'VidyaOS';
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 7. FALLBACK MOUNTERS (Defensive Safeguards)
  // If an admin page does not yet have static HTML for drawer or
  // bottom nav, mounts them smoothly.
  // ─────────────────────────────────────────────────────────────
  function mountAdminSidebar() {
    if (document.getElementById('app-sidebar')) return;

    const linksHtml = ADMIN_MODULES.map(item => {
      const active = isRouteActive(item.href);
      return `
        <a href="${item.href}" class="gc-drawer-link ${active ? 'active' : ''}" onclick="window.closeSidebar()">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;">${item.icon}</span>
          <span>${safeAttr(item.label)}</span>
        </a>
      `;
    }).join('');

    const sidebarHtml = `
      <aside id="app-sidebar" class="app-sidebar gc-drawer" aria-label="Admin Navigation">
        <div class="gc-drawer-header">
          <a href="/admin/dashboard.html" class="gc-brand-link" style="display:flex;align-items:center;gap:0.6rem;text-decoration:none;flex:1;min-width:0;">
            <div class="gc-brand-icon">${ADMIN_ICONS.building}</div>
            <div style="display:flex;flex-direction:column;line-height:1.1;">
              <span style="font-size:0.92rem;font-weight:800;color:var(--text-main);letter-spacing:-0.01em;">Admin Console</span>
              <span style="font-size:0.62rem;font-weight:700;letter-spacing:0.06em;color:var(--color-primary);text-transform:uppercase;">VidyaOS</span>
            </div>
          </a>
          <button type="button" class="gc-menu-btn" onclick="window.closeSidebar()" aria-label="Close menu" title="Close menu">
            ${ADMIN_ICONS.close}
          </button>
        </div>
        <div class="gc-drawer-body">
          <div class="gc-drawer-sec-title">Administrative Modules</div>
          ${linksHtml}
        </div>
        <div class="gc-drawer-footer">
          <div class="gc-drawer-status-pill">
            <span class="gc-drawer-dot"></span>
            <span>VidyaOS &bull; Admin</span>
          </div>
          <button type="button" class="gc-drawer-logout-btn" onclick="if(typeof logout==='function'){logout();}else{localStorage.clear();window.location.href='/index.html';}">
            ${ADMIN_ICONS.logout}
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      <div id="sidebar-backdrop" class="gc-drawer-backdrop sidebar-backdrop" onclick="window.closeSidebar()"></div>
    `;

    document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
  }

  function mountAdminBottomNav() {
    if (document.querySelector('.mobile-bottom-nav')) return;

    const itemsHtml = ADMIN_BOTTOM_TABS.map(tab => {
      if (tab.isMenu) {
        return `
          <button type="button" class="mobile-nav-item" onclick="window.toggleSidebar()" aria-label="Open Navigation Menu">
            <span class="mobile-nav-icon">${tab.icon}</span>
            <span class="mobile-nav-label">${safeAttr(tab.label)}</span>
          </button>
        `;
      }
      const active = isRouteActive(tab.href);
      return `
        <a href="${tab.href}" class="mobile-nav-item ${active ? 'active' : ''}">
          <span class="mobile-nav-icon">${tab.icon}</span>
          <span class="mobile-nav-label">${safeAttr(tab.label)}</span>
        </a>
      `;
    }).join('');

    const navHtml = `
      <nav class="mobile-bottom-nav" aria-label="Admin Mobile Navigation">
        <div class="mobile-bottom-nav-inner">
          ${itemsHtml}
        </div>
      </nav>
    `;

    document.body.insertAdjacentHTML('beforeend', navHtml);
  }

  function initAdminNav() {
    if (typeof window.mountNavigationSystem === 'function') {
      window.mountNavigationSystem({ role: 'admin' });
      return;
    }
    mountAdminSidebar();
    mountAdminBottomNav();
    enhanceAdminHeader();
    highlightActiveNavLinks();
  }

  // Expose global methods
  window.toggleSidebar = toggleSidebar;
  window.closeSidebar = closeSidebar;
  window.toggleAdminSidebar = toggleSidebar;
  window.closeAdminSidebar = closeSidebar;
  window.toggleAppsLauncher = toggleAppsLauncher;
  window.toggleUserProfile = toggleUserProfile;
  window.initAdminNav = initAdminNav;
  if (!window.toggleAppTheme) window.toggleAppTheme = toggleTheme;

  // Auto-run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminNav);
  } else {
    initAdminNav();
  }
})();
