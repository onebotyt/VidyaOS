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
    home: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor" fill-opacity="0.15"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    dashboard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5" fill="currentColor" fill-opacity="0.2"></rect><rect x="14" y="3" width="7" height="5" rx="1.5" fill="currentColor" fill-opacity="0.15"></rect><rect x="14" y="12" width="7" height="9" rx="1.5" fill="currentColor" fill-opacity="0.2"></rect><rect x="3" y="16" width="7" height="5" rx="1.5" fill="currentColor" fill-opacity="0.15"></rect></svg>`,
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

  // Canonical Faculty Navigation modules
  const FACULTY_NAV_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', shortLabel: 'Home', href: '/faculty/dashboard/index.html', icon: 'home' },
    { key: 'classes', label: 'Classroom', shortLabel: 'Classes', href: '/faculty/classes/index.html', icon: 'classes' },
    { key: 'attendance', label: 'Attendance Register', shortLabel: 'Register', href: '/faculty/registers/index.html', icon: 'registers' },
    { key: 'sheets', label: 'Sheet Studio', shortLabel: 'Sheets', href: '/faculty/sheets/index.html', icon: 'sheets' },
    { key: 'leaves', label: 'Leave Request', shortLabel: 'Leave', href: '/faculty/leave-approvals/index.html', icon: 'leaves' },
    { key: 'students', label: 'Faculty & Students Management', shortLabel: 'Students', href: '/faculty/students/index.html', icon: 'students' },
    { key: 'esp32', label: 'ESP32 Biometric Terminals', shortLabel: 'ESP32', href: '/faculty/esp32-devices/index.html', icon: 'settings' },
    { key: 'timetable', label: 'Timetable', shortLabel: 'Timetable', href: '/faculty/timetable/index.html', icon: 'timetable' },
    { key: 'drive', label: 'Faculty Drive', shortLabel: 'Drive', href: '/faculty/media/index.html', icon: 'drive' },
    { key: 'reports', label: 'Report & Analysis', shortLabel: 'Reports', href: '/faculty/reports/index.html', icon: 'reports' }
  ];

  // Faculty Mobile Bottom Navigation Tabs (5 Canonical Tabs Matching Image 3: Home, Classes, Students, Reports, Settings)
  const FACULTY_MOBILE_TABS = [
    { key: 'home', label: 'Home', href: '/faculty/dashboard/index.html', icon: 'home' },
    { key: 'classes', label: 'Classes', href: '/faculty/classes/index.html', icon: 'classes' },
    { key: 'students', label: 'Students', href: '/faculty/students/index.html', icon: 'students' },
    { key: 'reports', label: 'Reports', href: '/faculty/reports/index.html', icon: 'reports' },
    { key: 'settings', label: 'Settings', href: '/faculty/profile/index.html', icon: 'settings' }
  ];

  // HOD specific navigation items (Setting link removed per user instruction)
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
    if (window.innerWidth <= 768) {
      toggleSidebar();
      return;
    }
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

  function handleBackdropClick(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    closeSidebar();
  }

  /**
   * 4. Theme & Notifications
   */
  function toggleAppTheme() {
    if (typeof window.toggleFacultyTheme === 'function') {
      window.toggleFacultyTheme();
      return;
    }
    const root = document.documentElement;
    const current = root.getAttribute('data-theme') || (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    if (document.body) document.body.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
      localStorage.setItem('vidya_theme', next);
    } catch (_) { }

    const isDark = next === 'dark';
    document.querySelectorAll('.icon-theme').forEach(svg => {
      if (isDark) {
        svg.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
      } else {
        svg.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
      }
    });
  }

  if (!window.toggleAppTheme) {
    window.toggleAppTheme = toggleAppTheme;
  }

  function toggleNotifications(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (typeof window.showToast === 'function') {
      window.showToast('All academic systems & schedules operating normally.', 'info');
    } else {
      alert('Academic Notifications: All institutional systems operating normally.');
    }
  }

  /**
   * 5. Logout Session Function & Confirmation Modal
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

  function confirmFacultyLogout() {
    let modal = document.getElementById('faculty-logout-modal');
    if (!modal) {
      const modalHtml = `
        <div id="faculty-logout-modal" class="modal-backdrop faculty-logout-modal" style="display:none;" aria-hidden="true">
          <div class="modal-dialog modal-dialog-sm faculty-logout-dialog" role="dialog" aria-modal="true" aria-labelledby="faculty-logout-modal-title">
            <div class="faculty-logout-dialog-header">
              <div class="faculty-logout-icon-bubble">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </div>
              <div class="faculty-logout-text-wrap">
                <h3 id="faculty-logout-modal-title" class="faculty-logout-title">Sign Out of VidyaOS?</h3>
                <p class="faculty-logout-subtitle">Are you sure you want to end your academic session?</p>
              </div>
            </div>
            <div class="faculty-logout-actions">
              <button type="button" class="btn btn-secondary faculty-logout-cancel-btn" onclick="closeFacultyLogoutModal()">Cancel</button>
              <button type="button" class="btn btn-danger faculty-logout-confirm-btn" onclick="facultyLogout()">Sign Out</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      modal = document.getElementById('faculty-logout-modal');

      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeFacultyLogoutModal();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
          closeFacultyLogoutModal();
        }
      });
    }

    modal.classList.add('open');
    modal.style.setProperty('display', 'flex', 'important');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeFacultyLogoutModal() {
    const modal = document.getElementById('faculty-logout-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.setProperty('display', 'none', 'important');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  window.facultyLogout = facultyLogout;
  window.confirmFacultyLogout = confirmFacultyLogout;
  window.closeFacultyLogoutModal = closeFacultyLogoutModal;
  window.confirmLogout = confirmFacultyLogout;

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

    // ── A. Ensure Unified Full-Size Top Header is Mounted ──
    if (typeof window.mountFacultyHeader === 'function' && !document.getElementById('faculty-header')) {
      window.mountFacultyHeader();
    }
    // Clean up any obsolete duplicate mobile headers
    document.querySelectorAll('.faculty-mobile-top-header, #faculty-mobile-top-header').forEach(el => el.remove());

    // ── B. Mount Dual-State Sidebar (#faculty-sidebar) if missing ──
    if (!getSidebar()) {
      const expandChevronSvg = getIcon('chevronRight', { width: 15, height: 15, stroke: 2.8 });
      const signoutSvg = getIcon('logout', { width: 20, height: 20, stroke: 2 });

      // Render standard items
      const standardItemsHtml = FACULTY_NAV_ITEMS.map(item => {
        let label = item.label;
        if (item.key === 'students') {
          label = isHod ? 'Faculty & Students Management' : 'Students Management';
        }

        const isActive = currentPath.endsWith(item.href) ||
          currentPath.endsWith(item.href.replace('.html', '')) ||
          currentPath.includes(item.key) ||
          (item.key === 'dashboard' && (currentPath === '/faculty/' || currentPath.endsWith('/faculty') || currentPath.endsWith('/faculty/dashboard.html') || currentPath.endsWith('/faculty/dashboard')));

        const activeCls = isActive ? ' active' : '';
        const itemSvg = getIcon(item.icon, { width: 20, height: 20, stroke: 1.8 });

        return `
          <a href="${item.href}" class="sidebar-nav-item drawer-link${activeCls}" data-nav="${item.key}" data-tooltip="${label}" aria-label="${label}" onclick="if(window.innerWidth<=768)closeSidebar()">
            <span class="sidebar-nav-icon">${itemSvg}</span>
            <span class="sidebar-nav-short-label">${item.shortLabel || label}</span>
            <span class="sidebar-nav-label">${label}</span>
          </a>
        `;
      }).join('');

      // Expand/Collapse Rail Toggle item positioned inside sidebar navigation links (desktop rail only)
      const toggleItemHtml = `
        <button type="button" class="sidebar-nav-item sidebar-rail-toggle-item" onclick="toggleDesktopSidebar()" data-tooltip="Expand Menu" aria-label="Expand Navigation Menu">
          <span class="sidebar-nav-icon sidebar-toggle-icon">${expandChevronSvg}</span>
          <span class="sidebar-nav-short-label">Expand</span>
          <span class="sidebar-nav-label">Collapse Menu</span>
        </button>
      `;

      const sidebarHtml = `
        <aside id="faculty-sidebar" class="faculty-sidebar vidya-faculty-sidebar" data-component="vidya-faculty-sidebar" aria-label="Faculty Navigation">
          <!-- Navigation Links (Scrollable if overflowing) -->
          <nav class="sidebar-nav-body" aria-label="Faculty Navigation Links">
            ${standardItemsHtml}
            ${toggleItemHtml}
          </nav>

          <!-- Sidebar Footer: User Profile & Sign Out -->
          <div class="sidebar-expanded-footer">
            <a href="/faculty/profile/index.html" class="sidebar-user-card" id="sidebar-user-profile-link" data-tooltip="${name}" aria-label="User Profile" onclick="if(window.innerWidth<=768)closeSidebar()">
              <div class="sidebar-user-avatar" id="sidebar-drawer-avatar" aria-hidden="true">
                <span>${initial}</span>
              </div>
              <div class="sidebar-user-meta">
                <span class="sidebar-user-name" id="sidebar-drawer-name">${name}</span>
                <span class="sidebar-user-sub" id="sidebar-drawer-sub">${deptRole}</span>
              </div>
            </a>
            <button type="button" class="sidebar-signout-card-btn" onclick="confirmFacultyLogout()" data-tooltip="Sign Out" title="Sign Out" aria-label="Sign Out">
              ${signoutSvg}
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        <!-- Backdrop Overlay for Desktop Flyout & Mobile Drawer -->
        <div id="faculty-sidebar-backdrop" class="gc-drawer-backdrop sidebar-backdrop faculty-sidebar-backdrop" onclick="handleBackdropClick(event)"></div>
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
        (key && currentPath.includes(key)) ||
        (key === 'dashboard' && (currentPath === '/faculty/' || currentPath.endsWith('/faculty') || currentPath.endsWith('/faculty/dashboard.html') || currentPath.endsWith('/faculty/dashboard')));

      if (isMatch) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // ── D. Mount Mobile Bottom Navbar (<= 768px only) if missing ──
    // Suppress global bottom navbar completely on classroom workspace pages (e.g. group-detail)
    const isClassroomGroup = currentPath.includes('group-detail') || Boolean(document.getElementById('classroom-mobile-bottom-nav'));
    if (isClassroomGroup) {
      const existingNav = document.querySelector('.faculty-mobile-bottom-nav');
      if (existingNav) existingNav.remove();
      syncMobileUserIdentity();
      return;
    }

    if (!document.querySelector('.mobile-bottom-nav')) {
      const tabsToRender = isHod ? [
        { key: 'classes', label: 'Classes', href: '/faculty/classes/index.html', icon: 'classes' },
        { key: 'attendance', label: 'Attendance', href: '/faculty/registers/index.html', icon: 'registers' },
        { key: 'students', label: 'Students', href: '/faculty/students/index.html', icon: 'students' },
        { key: 'reports', label: 'Reports', href: '/faculty/reports/index.html', icon: 'reports' },
        { key: 'settings', label: 'Settings', href: '/faculty/profile/index.html', icon: 'settings' }
      ] : FACULTY_MOBILE_TABS;

      const bottomNavItemsHtml = tabsToRender.map(tab => {
        let isActive = false;
        if (tab.key === 'classes') {
          isActive = currentPath.includes('/faculty/classes') || currentPath.includes('/faculty/groups') || (isHod && (currentPath === '/faculty' || currentPath === '/faculty/' || currentPath.endsWith('/faculty/index.html')));
        } else if (tab.key === 'attendance') {
          isActive = currentPath.includes('/faculty/registers');
        } else if (tab.key === 'students') {
          isActive = currentPath.includes('/faculty/students');
        } else if (tab.key === 'reports') {
          isActive = currentPath.includes('/faculty/reports');
        } else if (tab.key === 'settings') {
          isActive = currentPath.includes('/faculty/profile');
        } else if (tab.key === 'home') {
          isActive = currentPath === '/faculty' || currentPath === '/faculty/' || currentPath.includes('/faculty/dashboard') || currentPath.endsWith('/faculty/index.html');
        }

        const activeCls = isActive ? ' active' : '';
        const tabSvg = getIcon(tab.icon, { width: 20, height: 20, stroke: 1.9 });

        return `
          <a href="${tab.href}" class="mobile-nav-item${activeCls}" data-tab="${tab.key}" aria-label="${tab.label}">
            <span class="mobile-nav-icon">${tabSvg}</span>
            <span class="mobile-nav-label">${tab.label}</span>
            <span class="mobile-nav-indicator"></span>
          </a>
        `;
      }).join('');

      const bottomNavHtml = `
        <nav class="mobile-bottom-nav faculty-mobile-bottom-nav" aria-label="Faculty Mobile Navigation">
          <div class="mobile-bottom-nav-inner">
            ${bottomNavItemsHtml}
          </div>
        </nav>
      `;

      if (layout) {
        layout.insertAdjacentHTML('beforeend', bottomNavHtml);
      } else {
        document.body.insertAdjacentHTML('beforeend', bottomNavHtml);
      }
    }

    syncMobileUserIdentity();

    // Tooltips are handled cleanly via high-performance CSS pseudo-elements (0 latency)
  }

  /**
   * 7. User Identity Synchronization (Avatar Initials & Names)
   */
  function syncMobileUserIdentity() {
    try {
      const user = getUser();
      if (!user) return;
      const name = user.full_name || user.name || user.username || 'Faculty Member';
      const cleanName = name.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
      const parts = cleanName.split(/\s+/).filter(Boolean);
      const initial = parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : (cleanName[0] || 'F').toUpperCase();
      const isHod = Boolean(user && (
        (Array.isArray(user.roles) && user.roles.includes('HOD')) ||
        user.role === 'HOD' ||
        user.is_hod === true ||
        user.is_hod === 1
      ));
      const deptRole = isHod ? 'Head of Department' : 'Faculty Member';

      const mobileInitials = document.getElementById('mobile-user-initials');
      if (mobileInitials) mobileInitials.textContent = initial;

      const mobileAvatarBtn = document.getElementById('mobile-header-avatar');
      if (mobileAvatarBtn) mobileAvatarBtn.setAttribute('title', name);

      const drawerAvatarSpans = document.querySelectorAll('#sidebar-drawer-avatar span');
      drawerAvatarSpans.forEach(el => el.textContent = initial);

      const drawerName = document.getElementById('sidebar-drawer-name');
      if (drawerName) drawerName.textContent = name;

      const drawerSub = document.getElementById('sidebar-drawer-sub');
      if (drawerSub) drawerSub.textContent = deptRole;

      const railInitials = document.querySelector('.rail-user-circle');
      if (railInitials) railInitials.textContent = initial;

      // Sync custom avatar photo if set in localStorage
      const customAvatar = localStorage.getItem('vidya_faculty_avatar');
      if (customAvatar) {
        const mobAvatar = document.getElementById('mobile-header-avatar');
        if (mobAvatar) {
          mobAvatar.innerHTML = `<img src="${customAvatar}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"><span class="mobile-avatar-dot"></span>`;
        }
        const sideAvatar = document.getElementById('sidebar-drawer-avatar');
        if (sideAvatar) {
          sideAvatar.innerHTML = `<img src="${customAvatar}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        }
      }
    } catch (_) { }
  }

  // Handle tap or click anywhere outside the sidebar to close it immediately on mobile
  function handleOutsideSidebarTap(e) {
    const sidebar = getSidebar();
    if (!sidebar) return;

    const isMobileOpen = sidebar.classList.contains('open') || sidebar.classList.contains('sidebar-open');
    const isDesktopOpen = sidebar.classList.contains('desktop-open');

    if (!isMobileOpen && !isDesktopOpen) return;

    // If click/tap is inside the sidebar itself, allow normal interaction
    if (sidebar.contains(e.target)) return;

    // If click/tap is on the toggle triggers, let their click handlers handle it
    const mobileToggleBtn = document.getElementById('mobile-sidebar-toggle-btn') || document.getElementById('faculty-nav-toggle') || document.getElementById('admin-mobile-nav-toggle');
    if (mobileToggleBtn && (mobileToggleBtn === e.target || mobileToggleBtn.contains(e.target))) return;

    const railToggleItem = e.target && e.target.closest && (e.target.closest('.sidebar-rail-toggle-item') || e.target.closest('.rail-expand-btn'));
    if (railToggleItem) return;

    // Tap on mobile bottom nav item 'menu' handled by its own onclick
    const bottomNavMenuBtn = e.target && e.target.closest && e.target.closest('[data-tab="menu"]');
    if (bottomNavMenuBtn) return;

    // User clicked outside the open sidebar: close it immediately
    closeSidebar();
  }

  document.addEventListener('click', handleOutsideSidebarTap, true);

  /**
   * 8. Global Keyboard Accessibility
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
  window.handleBackdropClick = handleBackdropClick;
  window.mountFacultySidebar = mountFacultyNavigation;
  window.mountSidebar = mountFacultyNavigation;
  window.toggleNotifications = toggleNotifications;
  window.toggleAppTheme = window.toggleAppTheme || toggleAppTheme;
  window.syncMobileUserIdentity = syncMobileUserIdentity;
  window.facultyLogout = facultyLogout;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountFacultyNavigation);
  } else {
    mountFacultyNavigation();
  }
})();
