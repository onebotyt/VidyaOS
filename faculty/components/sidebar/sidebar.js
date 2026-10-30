/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY DUAL-STATE NAVIGATION ENGINE (sidebar.js)
 * Location: /frontend/faculty/components/sidebar/sidebar.js
 * 
 * - Dynamically mounts:
 *   1. .mobile-top-header (Mobile only, <= 768px)
 *   2. #vidya-faculty-sidebar (Desktop 72px rail / 260px flyout overlay drawer / Mobile 280px drawer)
 *   3. #faculty-sidebar-backdrop (Desktop flyout & mobile drawer overlay)
 * - Zero desktop layout shift: page content stays permanently at margin-left: 72px
 * - Menu bar expands as a floating hamburger overlay drawer without squishing content
 * - Rail header has ONLY the expand arrow button beside the brand logo
 * - 3D Tactile squircles & clean vector navigation icons
 * - Dynamic HOD Management section for users with HOD role
 * - Always starts CLOSED on page load/open
 * - Keyboard shortcuts: Ctrl+B (Toggle), Escape (Dismiss)
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // Remove any legacy injected navigation elements
  function cleanLegacyNav() {
    if (typeof document === 'undefined') return;
    const legacySelectors = [
      '.mobile-bottom-nav',
      '#universal-bottom-nav',
      '#app-sidebar:not(.faculty-sidebar)',
      '.app-sidebar:not(.faculty-sidebar)'
    ];
    legacySelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });
  }

  // Reliable inline clean modern SVGs for fallback
  const FALLBACK_ICONS = {
    cube: `<svg class="rail-cube-logo" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M16 3.5L27.5 9.8L16 16.2L4.5 9.8L16 3.5Z" fill="var(--color-primary-light, hsl(215 90% 95%))" stroke="var(--color-primary)" stroke-width="1.2" stroke-linejoin="round"/><path d="M4.5 9.8L16 16.2V28.5L4.5 22.2V9.8Z" fill="var(--color-primary, hsl(217 91% 60%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/><path d="M16 16.2L27.5 9.8V22.2L16 28.5V16.2Z" fill="var(--color-primary-hover, hsl(224 76% 48%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/><path d="M16 16.5V27.5" stroke="hsl(0 0% 100% / 0.4)" stroke-width="1.2" stroke-linecap="round"/><path d="M16.5 16L26.5 10.5" stroke="hsl(0 0% 100% / 0.3)" stroke-width="1.2" stroke-linecap="round"/></svg>`,
    chevronRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
    chevronLeft: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
    menu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
    close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="currentColor" fill-opacity="0.15"/><circle cx="12" cy="7" r="4" fill="currentColor" fill-opacity="0.25"/></svg>`,
    logout: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
    bell: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
    institution: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"></path></svg>`,
    classes: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.25"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.12"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.25"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.12"/></svg>`,
    registers: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" fill="currentColor" fill-opacity="0.12"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="currentColor" fill-opacity="0.25"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/></svg>`,
    evaluation: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" fill-opacity="0.18"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
    sheets: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" fill-opacity="0.2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
    reports: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="14" width="3.5" height="7" rx="1" fill="currentColor" fill-opacity="0.25"/><rect x="10.25" y="9.5" width="3.5" height="11.5" rx="1" fill="currentColor" fill-opacity="0.35"/><rect x="16.5" y="5" width="3.5" height="16" rx="1" fill="currentColor" fill-opacity="0.45"/><polyline points="4 9 10 4 19.5 4" stroke="currentColor" stroke-width="1.8"/><polyline points="16 2 20 4 16 6" stroke="currentColor" stroke-width="1.8"/></svg>`,
    students: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="currentColor" fill-opacity="0.2"/><circle cx="9" cy="7" r="4" fill="currentColor" fill-opacity="0.3"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    timetable: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" fill="currentColor" fill-opacity="0.2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    leaves: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fill-opacity="0.22"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    drive: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="currentColor" fill-opacity="0.22"/></svg>`,
    settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
  };

  // Faculty Navigation modules (Consolidated: registers.html hosts coursework & marks tabs)
  const FACULTY_NAV_ITEMS = [
    { key: 'dashboard', label: 'Classes & Cohorts', shortLabel: 'Classes', href: '/faculty/dashboard.html', icon: 'classes' },
    { key: 'registers', label: 'Attendance Registers', shortLabel: 'Attend', href: '/faculty/registers.html', icon: 'registers' },
    { key: 'students', label: 'Faculty & Student Roster', shortLabel: 'Students', href: '/faculty/students.html', icon: 'students' },
    { key: 'sheets', label: 'Sheets Studio', shortLabel: 'Sheets', href: '/faculty/sheets.html', icon: 'sheets' },
    { key: 'reports', label: 'Analytics & Reports', shortLabel: 'Results', href: '/faculty/reports.html', icon: 'reports' },
    { key: 'timetable', label: 'Weekly Timetable', shortLabel: 'Time', href: '/faculty/timetable.html', icon: 'timetable' },
    { key: 'leaves', label: 'Leave Requests', shortLabel: 'Leave', href: '/faculty/leave-approvals.html', icon: 'leaves' },
    { key: 'media', label: 'Faculty Drive', shortLabel: 'Drive', href: '/faculty/media.html', icon: 'drive' }
  ];

  // HOD specific navigation items (empty - settings consolidated/removed per institutional policy)
  const HOD_NAV_ITEMS = [];

  /**
   * Helper to retrieve rendered SVG markup
   */
  function getIcon(name, options = {}) {
    if (typeof window.getFacultyIcon === 'function') {
      const svg = window.getFacultyIcon(name, options);
      if (svg) return svg;
    }
    if (window.FACULTY_ICONS && typeof window.FACULTY_ICONS[name] === 'function') {
      const w = options.width || options.w || 20;
      const h = options.height || options.h || w;
      const s = options.stroke || options.strokeWidth || 1.8;
      const c = options.className || options.cls || '';
      return window.FACULTY_ICONS[name](w, h, s, c);
    }
    return FALLBACK_ICONS[name] || '';
  }

  /**
   * Helper to retrieve active user
   */
  function getUser() {
    let user = null;
    if (typeof window.getCurrentUser === 'function') {
      user = window.getCurrentUser();
    }
    if (!user) {
      try {
        const stored = localStorage.getItem('user') || localStorage.getItem('auth_user');
        if (stored) user = JSON.parse(stored);
      } catch (_) { }
    }
    return user;
  }

  /**
   * Helper: Retrieve the active Faculty Sidebar element
   */
  function getSidebar() {
    return document.getElementById('faculty-sidebar') || document.getElementById('vidya-faculty-sidebar');
  }

  function getBackdrop() {
    return document.getElementById('faculty-sidebar-backdrop') || document.getElementById('sidebar-backdrop');
  }

  /**
   * 1. Initialize Desktop Sidebar State (Always default to CLOSED / 72px collapsed rail on open)
   */
  function initDesktopState() {
    try {
      const sidebar = getSidebar();
      const backdrop = getBackdrop();
      if (sidebar) sidebar.classList.remove('desktop-open', 'open', 'sidebar-open');
      if (backdrop) backdrop.classList.remove('active', 'open');
      if (window.innerWidth >= 769) {
        document.documentElement.classList.add('sidebar-collapsed');
        document.body.classList.add('sidebar-collapsed');
        const layout = document.getElementById('faculty-app-layout') || document.getElementById('admin-app-layout');
        if (layout) layout.classList.add('sidebar-collapsed');
      }
    } catch (_) { }
  }

  initDesktopState();

  /**
   * 2. Toggle Desktop Sidebar Flyout Overlay (72px Rail <-> 260px Overlay Drawer)
   * The page content remains fixed at margin-left: 72px without any layout shift.
   */
  function toggleDesktopSidebar() {
    const layout = document.getElementById('faculty-app-layout') || document.body;
    const sidebar = getSidebar();
    const backdrop = getBackdrop();
    if (!sidebar) return;

    const isCurrentlyOpen = sidebar.classList.contains('desktop-open');

    if (isCurrentlyOpen) {
      // CLOSE back to mini-rail
      sidebar.classList.remove('desktop-open');
      if (backdrop) backdrop.classList.remove('active', 'open');
      document.documentElement.classList.add('sidebar-collapsed');
      document.body.classList.add('sidebar-collapsed');
      if (layout) layout.classList.add('sidebar-collapsed');
    } else {
      // OPEN overlay flyout drawer
      sidebar.classList.add('desktop-open');
      if (backdrop) backdrop.classList.add('active', 'open');
      document.documentElement.classList.remove('sidebar-collapsed');
      document.body.classList.remove('sidebar-collapsed');
      if (layout) layout.classList.remove('sidebar-collapsed');
    }
  }

  /**
   * 3. Toggle Mobile Drawer (<= 768px)
   */
  function toggleSidebar() {
    if (window.innerWidth >= 769) {
      toggleDesktopSidebar();
      return;
    }
    const sidebar = getSidebar();
    if (!sidebar) return;

    const isOpen = sidebar.classList.contains('open') || sidebar.classList.contains('sidebar-open');
    if (isOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  function openSidebar() {
    const sidebar = getSidebar();
    const backdrop = getBackdrop();
    if (sidebar) {
      sidebar.classList.add('open', 'sidebar-open');
    }
    if (backdrop) {
      backdrop.classList.add('open', 'active');
    }
    document.body.style.overflow = (window.innerWidth <= 768) ? 'hidden' : '';
  }

  function closeSidebar() {
    const sidebar = getSidebar();
    const backdrop = getBackdrop();

    // Close mobile drawer
    if (sidebar) {
      sidebar.classList.remove('open', 'sidebar-open', 'desktop-open');
    }
    if (backdrop) {
      backdrop.classList.remove('open', 'active');
    }
    document.body.style.overflow = '';

    // If on desktop and expanded, collapse back to 72px rail
    if (window.innerWidth >= 769) {
      document.documentElement.classList.add('sidebar-collapsed');
      document.body.classList.add('sidebar-collapsed');
      const layout = document.getElementById('faculty-app-layout');
      if (layout) layout.classList.add('sidebar-collapsed');
    }
  }

  /**
   * 4. Notifications Feedback
   */
  function toggleNotifications(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (typeof window.showToast === 'function') {
      window.showToast('All academic systems & schedules operating normally.', 'info');
    } else {
      alert('Academic Notifications: All institutional systems operating normally.');
    }
  }

  /**
   * 5. Logout Session Function
   */
  function facultyLogout() {
    if (typeof window.logout === 'function') {
      window.logout();
      return;
    }
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    if (token || refreshToken) {
      try {
        fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refresh_token: refreshToken || '' }),
          keepalive: true,
          credentials: 'include'
        }).catch(() => { });
      } catch (_) { }
    }
    const keys = ['access_token', 'refresh_token', 'authToken', 'auth_token', 'token', 'user', 'currentUser', 'auth_user', 'user_profile', 'user_roles', 'role', 'roles', 'session_id'];
    keys.forEach(k => { try { localStorage.removeItem(k); } catch (_) { } });
    try { sessionStorage.clear(); } catch (_) { }
    try { sessionStorage.setItem('vidya_logged_out_flag', '1'); } catch (_) { }
    window.location.replace('/login');
  }

  /**
   * 6. Dynamic Component Mounting Engine
   */
  function mountFacultyNavigation() {
    if (typeof document === 'undefined') return;
    cleanLegacyNav();
    const layout = document.getElementById('faculty-app-layout') || document.body;
    if (!layout) return;

    const currentPath = (window.location.pathname || '').toLowerCase();
    const user = getUser();
    const isHod = Boolean(user && (
      (Array.isArray(user.roles) && user.roles.includes('HOD')) ||
      user.role === 'HOD' ||
      user.is_hod === true ||
      user.is_hod === 1
    ));

    const name = user?.full_name || user?.name || user?.username || 'Faculty Member';
    const cleanName = name.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
    const parts = cleanName.split(/\s+/).filter(Boolean);
    const initial = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : (cleanName[0] || 'F').toUpperCase();
    const deptRole = isHod ? 'Head of Department' : 'Faculty Member';

    // ── A. Mount Mobile Top Header (<= 768px only) if missing ──
    if (!document.getElementById('mobile-top-header') && !document.getElementById('faculty-mobile-top-header')) {
      const menuSvg = getIcon('menu', { width: 20, height: 20, stroke: 2.2 });
      const instSvg = getIcon('institution', { width: 18, height: 18, stroke: 2 }) || getIcon('brand', { width: 18, height: 18 });
      const bellSvg = getIcon('bell', { width: 18, height: 18, stroke: 2 });

      const mobileHeaderHtml = `
        <header class="mobile-top-header faculty-mobile-top-header" id="faculty-mobile-top-header">
          <div class="mobile-header-left">
            <button type="button" class="mobile-hamburger-btn" id="mobile-sidebar-toggle-btn" onclick="toggleSidebar()" aria-label="Open Navigation Menu">
              ${menuSvg}
            </button>
          </div>
          <div class="mobile-header-center">
            <a href="/faculty/dashboard.html" class="mobile-brand-link">
              <span class="mobile-brand-icon">${instSvg}</span>
              <span class="mobile-brand-text">VidyaOS</span>
            </a>
          </div>
          <div class="mobile-header-right">
            <button type="button" class="mobile-header-icon-btn mobile-bell-btn" onclick="toggleNotifications(event)" aria-label="Notifications">
              ${bellSvg}
              <span class="mobile-bell-badge">1</span>
            </button>
          </div>
        </header>
      `;
      layout.insertAdjacentHTML('afterbegin', mobileHeaderHtml);
    }

    // ── B. Mount Dual-State Sidebar (#vidya-faculty-sidebar) if missing ──
    if (!getSidebar()) {
      const cubeSvg = getIcon('cube', { width: 32, height: 32, className: 'rail-cube-logo' });
      const headerCubeSvg = getIcon('cube', { width: 24, height: 24, className: 'header-cube-logo' });
      const expandChevronSvg = getIcon('chevronRight', { width: 15, height: 15, stroke: 2.8 });
      const collapseChevronSvg = getIcon('chevronLeft', { width: 14, height: 14, stroke: 2.5 });
      const closeSvg = getIcon('close', { width: 18, height: 18, stroke: 2.2 });
      const userSvg = getIcon('user', { width: 20, height: 20, stroke: 2 });
      const signoutSvg = getIcon('logout', { width: 20, height: 20, stroke: 2 });

      // Render standard items
      const standardItemsHtml = FACULTY_NAV_ITEMS.map(item => {
        const isActive = currentPath.endsWith(item.href) ||
          currentPath.endsWith(item.href.replace('.html', '')) ||
          (item.key === 'dashboard' && (currentPath === '/faculty/' || currentPath.endsWith('/faculty') || currentPath.endsWith('/faculty/dashboard.html') || currentPath.endsWith('/faculty/dashboard')));

        const activeCls = isActive ? ' active' : '';
        const itemSvg = getIcon(item.icon, { width: 20, height: 20, stroke: 1.8 });

        return `
          <a href="${item.href}" class="sidebar-nav-item drawer-link${activeCls}" data-nav="${item.key}" data-tooltip="${item.label}" aria-label="${item.label}">
            <span class="sidebar-nav-icon">${itemSvg}</span>
            <span class="sidebar-nav-short-label">${item.shortLabel || item.label}</span>
            <span class="sidebar-nav-label">${item.label}</span>
          </a>
        `;
      }).join('');

      // Render HOD items if user has HOD privileges and there are active HOD items
      let hodItemsHtml = '';
      if (isHod && HOD_NAV_ITEMS.length > 0) {
        hodItemsHtml = `
          <div class="sidebar-section-header">HOD MANAGEMENT</div>
        ` + HOD_NAV_ITEMS.map(item => {
          const isActive = currentPath.endsWith(item.href) || currentPath.endsWith(item.href.replace('.html', ''));
          const activeCls = isActive ? ' active' : '';
          const itemSvg = getIcon(item.icon, { width: 20, height: 20, stroke: 1.8 });

          return `
            <a href="${item.href}" class="sidebar-nav-item drawer-link${activeCls}" data-nav="${item.key}" data-tooltip="${item.label}" aria-label="${item.label}">
              <span class="sidebar-nav-icon">${itemSvg}</span>
              <span class="sidebar-nav-short-label">${item.shortLabel || item.label}</span>
              <span class="sidebar-nav-label">${item.label}</span>
            </a>
          `;
        }).join('');
      }

      const sidebarHtml = `
        <aside id="faculty-sidebar" class="faculty-sidebar vidya-faculty-sidebar" data-component="vidya-faculty-sidebar" aria-label="Faculty Navigation">
          <!-- A. Rail Header (Desktop Collapsed 72px Rail) -->
          <div class="sidebar-rail-header" aria-hidden="true">
            <div class="rail-brand-row">
              <a href="/faculty/dashboard.html" class="rail-logo-link" data-tooltip="VidyaOS Academic Workspace" aria-label="VidyaOS Academic Workspace">
                ${cubeSvg}
              </a>
              <!-- Fast Expand Arrow button right on side of logo -->
              <button type="button" class="rail-expand-btn" onclick="toggleDesktopSidebar()" data-tooltip="Expand Menu" aria-label="Open Navigation Menu">
                ${expandChevronSvg}
              </button>
            </div>
          </div>

          <!-- B. Expanded Header (Desktop Flyout Drawer & Mobile Drawer) -->
          <div class="sidebar-expanded-header">
            <div class="sidebar-header-left">
              <span class="sidebar-header-cube-icon" aria-hidden="true">${headerCubeSvg}</span>
              <span class="sidebar-header-title">VidyaOS Academic</span>
            </div>
            <!-- Desktop Collapse Button: Chevron Left < -->
            <button type="button" class="sidebar-desktop-collapse-btn" onclick="toggleDesktopSidebar()" title="Collapse navigation" aria-label="Collapse navigation">
              ${collapseChevronSvg}
            </button>
            <button type="button" class="sidebar-mobile-close-btn" onclick="closeSidebar()" title="Close menu" aria-label="Close menu">
              ${closeSvg}
            </button>
          </div>

          <!-- C. Navigation Links -->
          <nav class="sidebar-nav-body" aria-label="Faculty Navigation Links">
            ${standardItemsHtml}
            ${hodItemsHtml}
          </nav>

          <!-- D. Sidebar Footers -->
          <div class="sidebar-expanded-footer">
            <div class="sidebar-user-card">
              <div class="sidebar-user-avatar" id="sidebar-drawer-avatar" aria-hidden="true">
                <span>${initial}</span>
              </div>
              <div class="sidebar-user-meta">
                <span class="sidebar-user-name" id="sidebar-drawer-name">${name}</span>
                <span class="sidebar-user-sub" id="sidebar-drawer-sub">${deptRole}</span>
              </div>
            </div>
            <button type="button" class="sidebar-signout-card-btn" onclick="facultyLogout()" title="Sign Out" aria-label="Sign Out">
              ${signoutSvg}
              <span>Sign Out</span>
            </button>
          </div>

          <div class="sidebar-rail-footer" aria-hidden="true">
            <a href="/faculty/profile.html" class="rail-footer-btn" data-tooltip="Faculty Profile" aria-label="Faculty Profile">
              <span class="rail-user-circle">${initial}</span>
              <span class="sidebar-nav-short-label">Profile</span>
            </a>
            <button type="button" class="rail-footer-btn rail-signout-btn" onclick="facultyLogout()" data-tooltip="Sign Out" aria-label="Sign Out">
              ${signoutSvg}
              <span class="sidebar-nav-short-label">Logout</span>
            </button>
          </div>
        </aside>

        <!-- Backdrop Overlay for Desktop Flyout & Mobile Drawer -->
        <div id="faculty-sidebar-backdrop" class="gc-drawer-backdrop sidebar-backdrop faculty-sidebar-backdrop" onclick="toggleDesktopSidebar()"></div>
      `;

      // Insert sidebar immediately before .faculty-main-wrap, .admin-main-wrap or prepend to layout
      const mainWrap = document.querySelector('.faculty-main-wrap') || document.querySelector('.admin-main-wrap');
      if (mainWrap) {
        mainWrap.insertAdjacentHTML('beforebegin', sidebarHtml);
      } else {
        layout.insertAdjacentHTML('afterbegin', sidebarHtml);
      }
    }

    // ── C. Ensure Tooltip Attribute & Highlight Active Item ──
    const navItems = document.querySelectorAll('.sidebar-nav-item');
    navItems.forEach(item => {
      const href = (item.getAttribute('href') || '').toLowerCase();
      const key = item.getAttribute('data-nav');
      const isMatch = (href && (currentPath.endsWith(href) || currentPath.endsWith(href.replace('.html', '')))) ||
        (key === 'dashboard' && (currentPath === '/faculty/' || currentPath.endsWith('/faculty') || currentPath.endsWith('/faculty/dashboard.html') || currentPath.endsWith('/faculty/dashboard')));

      if (isMatch) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Tooltips are handled cleanly via high-performance CSS pseudo-elements (0 latency)

    // Sync avatar photo if stored in localStorage
    try {
      const customAvatar = localStorage.getItem('vidya_faculty_avatar');
      if (customAvatar) {
        const drawerAvatar = document.getElementById('sidebar-drawer-avatar');
        if (drawerAvatar) {
          drawerAvatar.innerHTML = `<img src="${customAvatar}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        }
      }
    } catch (_) { }
  }

  /**
   * 7. Global Keyboard Accessibility
   */
  document.addEventListener('keydown', (e) => {
    // ESC to close drawer or flyout
    if (e.key === 'Escape') {
      const sidebar = getSidebar();
      const isMobileOpen = sidebar && (sidebar.classList.contains('open') || sidebar.classList.contains('sidebar-open'));
      const isDesktopExpanded = !document.documentElement.classList.contains('sidebar-collapsed');

      if (isMobileOpen) {
        closeSidebar();
      } else if (isDesktopExpanded && window.innerWidth >= 769) {
        toggleDesktopSidebar();
      }
    }

    // Ctrl+B to toggle sidebar flyout on desktop
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      toggleSidebar();
    }
  });

  // Handle window resizing
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 769) {
      document.body.style.overflow = '';
      const sidebar = getSidebar();
      if (sidebar && sidebar.classList.contains('open') && !sidebar.classList.contains('desktop-open')) {
        closeSidebar();
      }
    }
  });

  // Export functions to global scope
  window.toggleSidebar = toggleSidebar;
  window.toggleDesktopSidebar = toggleDesktopSidebar;
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
  window.mountFacultySidebar = mountFacultyNavigation;
  window.mountSidebar = mountFacultyNavigation;
  window.toggleNotifications = toggleNotifications;
  window.facultyLogout = facultyLogout;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountFacultyNavigation);
  } else {
    mountFacultyNavigation();
  }
})();
