/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS ADMIN DUAL-STATE NAVIGATION ENGINE (sidebar.js)
 * Location: /frontend/admin/components/sidebar/sidebar.js
 * 
 * - Dynamically mounts:
 *   1. .mobile-top-header (Mobile only, <= 768px)
 *   2. #app-sidebar (Desktop 72px rail / 260px flyout overlay drawer / Mobile 280px drawer)
 *   3. #sidebar-backdrop (Desktop flyout & mobile drawer overlay)
 * - Zero desktop layout shift: page content stays permanently at margin-left: 72px
 * - Menu bar expands as a floating hamburger overlay drawer without squishing content
 * - Rail header has ONLY the expand arrow button (three lines removed)
 * - 3D Isometric navigation vectors with multi-facet lighting & tactile squircle depth
 * - Always starts CLOSED on page load/open
 * - Keyboard shortcuts: Ctrl+B (Toggle), Escape (Dismiss)
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /** @type {any} */
  const win = typeof window !== 'undefined' ? window : {};

  // Reliable inline clean modern SVGs for all admin controls and modules
  const FALLBACK_ICONS = {
    cube: `<svg class="rail-cube-logo" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M16 3.5L27.5 9.8L16 16.2L4.5 9.8L16 3.5Z" fill="var(--color-primary-light, hsl(215 90% 95%))" stroke="var(--color-primary)" stroke-width="1.2" stroke-linejoin="round"/><path d="M4.5 9.8L16 16.2V28.5L4.5 22.2V9.8Z" fill="var(--color-primary, hsl(217 91% 60%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/><path d="M16 16.2L27.5 9.8V22.2L16 28.5V16.2Z" fill="var(--color-primary-hover, hsl(224 76% 48%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/><path d="M16 16.5V27.5" stroke="hsl(0 0% 100% / 0.4)" stroke-width="1.2" stroke-linecap="round"/><path d="M16.5 16L26.5 10.5" stroke="hsl(0 0% 100% / 0.3)" stroke-width="1.2" stroke-linecap="round"/></svg>`,
    chevronRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
    chevronLeft: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
    menu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
    close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    home: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    dashboard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.25"/><rect x="13.5" y="3" width="7.5" height="4.5" rx="1.5" fill="currentColor" fill-opacity="0.12"/><rect x="13.5" y="10.5" width="7.5" height="10.5" rx="1.5" fill="currentColor" fill-opacity="0.25"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.12"/></svg>`,
    academicStructure: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 3 21 7.5 12 12 3 7.5" fill="currentColor" fill-opacity="0.25"/><path d="M4 11.5L12 16L20 11.5" fill="none"/><path d="M4 11.5V13.5L12 18L20 13.5V11.5" fill="currentColor" fill-opacity="0.15"/><path d="M4 16L12 20.5L20 16" fill="none"/></svg>`,
    hodManagement: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5L19.5 5.5V11C19.5 16 16 19.8 12 21.5C8 19.8 4.5 16 4.5 11V5.5L12 2.5Z" fill="currentColor" fill-opacity="0.15"/><circle cx="12" cy="9" r="2.5" fill="currentColor" fill-opacity="0.5"/><path d="M8.5 15.5C8.5 13.5 10 12.2 12 12.2C14 12.2 15.5 13.5 15.5 15.5" stroke="currentColor" stroke-width="1.8"/></svg>`,
    reports: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="14" width="3.5" height="7" rx="1" fill="currentColor" fill-opacity="0.25"/><rect x="10.25" y="9.5" width="3.5" height="11.5" rx="1" fill="currentColor" fill-opacity="0.35"/><rect x="16.5" y="5" width="3.5" height="16" rx="1" fill="currentColor" fill-opacity="0.45"/><polyline points="4 9 10 4 19.5 4" stroke="currentColor" stroke-width="2"/><polyline points="16 2 20 4 16 6" stroke="currentColor" stroke-width="2"/></svg>`,
    settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor" fill-opacity="0.25"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    audit: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fill-opacity="0.15"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/><circle cx="9" cy="9" r="1" fill="currentColor"/></svg>`,
    user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="currentColor" fill-opacity="0.15"/><circle cx="12" cy="7" r="4" fill="currentColor" fill-opacity="0.25"/></svg>`,
    logout: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
    bell: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
    search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    institution: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"></path></svg>`,
    bugReports: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M18 13h4M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>`
  };

  // Navigation module registry for Admin portal
  const ADMIN_NAV_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', shortLabel: 'Overview', href: '/admin/dashboard/index.html', icon: 'dashboard' },
    { key: 'academics', label: 'Academic Structure', shortLabel: 'Structure', href: '/admin/academic-structure/index.html', icon: 'academicStructure' },
    { key: 'faculty', label: 'Faculty Management', shortLabel: 'Faculty', href: '/admin/faculty-management/index.html', icon: 'hodManagement' },
    { key: 'settings', label: 'System Settings', shortLabel: 'Settings', href: '/admin/settings/index.html', icon: 'settings' },
    { key: 'audit', label: 'Audit Logs', shortLabel: 'Audit', href: '/admin/audit-logs/index.html', icon: 'audit' },
    { key: 'bug-reports', label: 'Bug Reports / Complaints', shortLabel: 'Bugs', href: '/admin/bug-reports/index.html', icon: 'bugReports' }
  ];

  // Mobile Bottom Navigation Tabs (5 Canonical Tabs Matching Mobile App Reference)
  const ADMIN_MOBILE_TABS = [
    { key: 'dashboard', label: 'Home', href: '/admin/dashboard/index.html', icon: 'home' },
    { key: 'academics', label: 'Structure', href: '/admin/academic-structure/index.html', icon: 'academicStructure' },
    { key: 'faculty', label: 'Faculty', href: '/admin/faculty-management/index.html', icon: 'hodManagement' },
    { key: 'bugs', label: 'Bugs', href: '/admin/bug-reports/index.html', icon: 'bugReports' },
    { key: 'settings', label: 'Settings', href: '/admin/settings/index.html', icon: 'settings' }
  ];

  /**
   * Helper to retrieve rendered SVG markup with automatic fallback
   */
  function getIcon(name, options = {}) {
    if (typeof win.getAdminIcon === 'function') {
      const svg = win.getAdminIcon(name, options);
      if (svg) return svg;
    }
    if (win.ADMIN_ICONS) {
      if (typeof win.ADMIN_ICONS.get === 'function') {
        const svg = win.ADMIN_ICONS.get(name, options);
        if (svg) return svg;
      }
      if (typeof win.ADMIN_ICONS[name] === 'function') {
        const w = options.width || options.w || 20;
        const h = options.height || options.h || w;
        const s = options.stroke || options.strokeWidth || 2;
        const c = options.className || options.cls || '';
        return win.ADMIN_ICONS[name](w, h, s, c);
      }
    }
    return FALLBACK_ICONS[name] || '';
  }

  /**
   * Helper: Retrieve the active Admin Sidebar element (supports isolated ID and legacy fallback)
   */
  function getSidebar() {
    return document.getElementById('vidya-admin-sidebar') || document.getElementById('app-sidebar');
  }

  /**
   * 1. Initialize Desktop Sidebar State (Always default to CLOSED / 72px collapsed rail on open)
   */
  function initDesktopState() {
    try {
      const sidebar = getSidebar();
      const backdrop = document.getElementById('sidebar-backdrop');
      if (sidebar) sidebar.classList.remove('desktop-open', 'open', 'sidebar-open');
      if (backdrop) backdrop.classList.remove('active', 'open');
      if (window.innerWidth >= 769) {
        document.documentElement.classList.add('sidebar-collapsed');
        document.body.classList.add('sidebar-collapsed');
        const layout = document.getElementById('admin-app-layout');
        if (layout) layout.classList.add('sidebar-collapsed');
      }
    } catch (_) { }
  }

  // Run instant state detection immediately
  initDesktopState();

  /**
   * 2. Toggle Desktop Sidebar Flyout Overlay (72px Rail <-> 260px Overlay Drawer)
   * The page content (.admin-main-wrap) remains fixed at margin-left: 72px without any layout shift.
   */
  function toggleDesktopSidebar() {
    if (window.innerWidth <= 768) {
      toggleSidebar();
      return;
    }
    const sidebar = getSidebar();
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;

    const isCurrentlyOpen = sidebar.classList.contains('desktop-open');

    if (isCurrentlyOpen) {
      // Smooth CLOSE back to mini-rail
      sidebar.classList.remove('desktop-open');
      if (backdrop) backdrop.classList.remove('active', 'open');
    } else {
      // Smooth OPEN overlay flyout drawer
      sidebar.classList.add('desktop-open');
      if (backdrop) backdrop.classList.add('active', 'open');
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
    const backdrop = document.getElementById('sidebar-backdrop');
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
    const backdrop = document.getElementById('sidebar-backdrop');

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
      const layout = document.getElementById('admin-app-layout');
      if (layout) layout.classList.add('sidebar-collapsed');
    }
  }

  function handleBackdropClick(e) {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    closeSidebar();
  }

  /**
   * 4. Notifications Popover / Alert Feedback
   */
  function toggleNotifications(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    alert('Administrative notifications: All institutional systems operating normally.');
  }

  /**
   * 5. Logout Session Function
   */
  function adminLogout() {
    if (typeof win.logout === 'function') {
      win.logout();
      return;
    }
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
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
    const keys = ['access_token', 'refresh_token', 'authToken', 'auth_token', 'token', 'user', 'currentUser', 'auth_user', 'user_profile', 'user_roles', 'role', 'roles', 'session_id'];
    keys.forEach(k => { try { localStorage.removeItem(k); } catch (_) { } });
    try { sessionStorage.clear(); } catch (_) { }
    try { sessionStorage.setItem('vidya_logged_out_flag', '1'); } catch (_) { }
    window.location.replace('/login');
  }

  function confirmAdminLogout() {
    let modal = document.getElementById('admin-logout-modal');
    if (!modal) {
      const modalHtml = `
        <div id="admin-logout-modal" class="modal-backdrop admin-logout-modal" style="display:none;" aria-hidden="true">
          <div class="modal-dialog modal-dialog-sm admin-logout-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-logout-modal-title">
            <div class="admin-logout-dialog-header">
              <div class="admin-logout-icon-bubble">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </div>
              <div class="admin-logout-text-wrap">
                <h3 id="admin-logout-modal-title" class="admin-logout-title">Sign Out of VidyaOS?</h3>
                <p class="admin-logout-subtitle">Are you sure you want to end your administrative session?</p>
              </div>
            </div>
            <div class="admin-logout-actions">
              <button type="button" class="btn btn-secondary admin-logout-cancel-btn" onclick="closeAdminLogoutModal()">Cancel</button>
              <button type="button" class="btn btn-danger admin-logout-confirm-btn" onclick="adminLogout()">Sign Out</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      modal = document.getElementById('admin-logout-modal');

      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAdminLogoutModal();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
          closeAdminLogoutModal();
        }
      });
    }

    modal.classList.add('open');
    modal.style.setProperty('display', 'flex', 'important');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeAdminLogoutModal() {
    const modal = document.getElementById('admin-logout-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.setProperty('display', 'none', 'important');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  win.confirmAdminLogout = confirmAdminLogout;
  win.closeAdminLogoutModal = closeAdminLogoutModal;

  /**
   * 6. User Identity Synchronization (Avatar Initials & Names)
   */
  function syncMobileUserIdentity() {
    try {
      const user = (typeof win.getCurrentUser === 'function')
        ? win.getCurrentUser()
        : JSON.parse(localStorage.getItem('user') || 'null');
      if (!user) return;
      const name = user.full_name || user.name || user.username || 'Admin';
      const cleanName = name.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
      const parts = cleanName.split(/\s+/).filter(Boolean);
      const initials = parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : (cleanName.slice(0, 2).toUpperCase() || 'A');

      const el = document.getElementById('mobile-user-initials');
      if (el) el.textContent = initials;
      const railInitials = document.querySelector('.rail-user-circle');
      if (railInitials) railInitials.textContent = initials;
      const sidebarAvatarSpan = document.querySelector('.sidebar-user-avatar span');
      if (sidebarAvatarSpan) sidebarAvatarSpan.textContent = initials;
      const sidebarUserName = document.querySelector('.sidebar-user-name');
      if (sidebarUserName) sidebarUserName.textContent = name;
    } catch (_) { }
  }

  /**
   * 7. Dynamic Component Mounting Engine
   */
  function mountAdminNavigation() {
    if (typeof document === 'undefined') return;
    const layout = document.getElementById('admin-app-layout') || document.body;
    if (!layout) return;

    const currentPath = (window.location.pathname || '').toLowerCase();

    // ── B. Mount Dual-State Sidebar (#vidya-admin-sidebar) if missing ──
    if (!getSidebar()) {
      const expandChevronSvg = getIcon('chevronRight', { width: 15, height: 15, stroke: 2.8 });
      const collapseChevronSvg = getIcon('chevronLeft', { width: 14, height: 14, stroke: 2.5 });
      const closeSvg = getIcon('close', { width: 18, height: 18, stroke: 2.2 });
      const signoutSvg = getIcon('logout', { width: 20, height: 20, stroke: 2 });

      // Render Navigation items with high-speed CSS tooltip
      const navItemsHtml = ADMIN_NAV_ITEMS.map(item => {
        const isActive = currentPath.endsWith(item.href) ||
          currentPath.endsWith(item.href.replace('.html', '')) ||
          currentPath.includes(item.key) ||
          (item.key === 'dashboard' && (currentPath === '/admin/' || currentPath.endsWith('/admin') || currentPath.endsWith('/admin/dashboard.html') || currentPath.endsWith('/admin/dashboard')));

        const activeCls = isActive ? ' active' : '';
        const itemSvg = getIcon(item.icon, { width: 20, height: 20, stroke: 1.8 });

        return `
          <a href="${item.href}" class="sidebar-nav-item${activeCls}" data-nav="${item.key}" data-tooltip="${item.label}" aria-label="${item.label}" onclick="if(window.innerWidth<=768)closeSidebar()">
            <span class="sidebar-nav-icon">${itemSvg}</span>
            <span class="sidebar-nav-short-label">${item.shortLabel || item.label}</span>
            <span class="sidebar-nav-label">${item.label}</span>
          </a>
        `;
      }).join('');

      // Expand/Collapse toggle button placed directly with navigation links
      const toggleItemHtml = `
        <button type="button" class="sidebar-nav-item sidebar-rail-toggle-item" onclick="toggleDesktopSidebar()" data-tooltip="Expand Menu" aria-label="Expand Navigation Menu">
          <span class="sidebar-nav-icon sidebar-toggle-icon">${expandChevronSvg}</span>
          <span class="sidebar-nav-short-label">Expand</span>
          <span class="sidebar-nav-label">Collapse Menu</span>
        </button>
      `;

      const sidebarHtml = `
        <aside id="vidya-admin-sidebar" class="admin-sidebar vidya-admin-sidebar" data-component="vidya-admin-sidebar" aria-label="Admin Navigation">
          <!-- Navigation Links (Scrollable if overflowing) -->
          <nav class="sidebar-nav-body" aria-label="Admin Navigation Links">
            ${navItemsHtml}
            ${toggleItemHtml}
          </nav>

          <!-- Sidebar Footer: Clickable Profile & Confirmation Logout -->
          <div class="sidebar-expanded-footer">
            <a href="/admin/profile/index.html" class="sidebar-user-card" id="sidebar-user-profile-link" title="Open Admin Profile" aria-label="Open Admin Profile" onclick="if(window.innerWidth<=768)closeSidebar()">
              <div class="sidebar-user-avatar">
                <span class="sidebar-user-avatar-initials">SA</span>
                <span class="avatar-online-dot"></span>
              </div>
              <div class="sidebar-user-meta">
                <span class="sidebar-user-name">System Administrator</span>
                <span class="sidebar-user-sub">Super Admin &bull; Profile</span>
              </div>
              <div class="sidebar-user-arrow" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            </a>
            <button type="button" class="sidebar-signout-card-btn" onclick="confirmAdminLogout()" title="Sign Out" aria-label="Sign Out">
              ${signoutSvg}
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        <!-- Backdrop Overlay for Desktop Flyout & Mobile Drawer -->
        <div id="sidebar-backdrop" class="gc-drawer-backdrop sidebar-backdrop" onclick="handleBackdropClick(event)"></div>
      `;

      // Insert sidebar immediately before .admin-main-wrap or append
      const mainWrap = document.querySelector('.admin-main-wrap');
      if (mainWrap) {
        mainWrap.insertAdjacentHTML('beforebegin', sidebarHtml);
      } else {
        layout.insertAdjacentHTML('beforeend', sidebarHtml);
      }
    }

    // ── C. Ensure Tooltip Attribute & Highlight Active Item ──
    const navItems = document.querySelectorAll('.sidebar-nav-item');
    navItems.forEach(item => {
      const href = (item.getAttribute('href') || '').toLowerCase();
      const key = item.getAttribute('data-nav');
      const isMatch = (href && (currentPath.endsWith(href) || currentPath.endsWith(href.replace('.html', '')))) ||
        (key === 'dashboard' && (currentPath === '/admin/' || currentPath.endsWith('/admin') || currentPath.endsWith('/admin/dashboard.html') || currentPath.endsWith('/admin/dashboard')));

      if (isMatch) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // ── D. Mount Mobile Bottom Navbar (<= 768px only) if missing ──
    if (!document.querySelector('.mobile-bottom-nav')) {
      const bottomNavItemsHtml = ADMIN_MOBILE_TABS.map(tab => {
        let isActive = false;
        if (tab.key === 'dashboard') {
          isActive = (currentPath === '/admin' || currentPath === '/admin/' || currentPath.includes('/admin/dashboard') || currentPath.endsWith('/admin/index.html'));
        } else if (tab.key === 'academics') {
          isActive = (currentPath.includes('/admin/academic-structure') || currentPath.includes('/academic-structure.html') || currentPath.includes('/admin/structure'));
        } else if (tab.key === 'faculty') {
          isActive = (currentPath.includes('/admin/faculty') || currentPath.includes('/admin/faculty-management') || currentPath.includes('/faculty.html'));
        } else if (tab.key === 'bugs' || tab.key === 'bug-reports') {
          isActive = (currentPath.includes('/admin/bug-reports') || currentPath.includes('/bug-reports.html') || currentPath.includes('/bug-reports/'));
        } else if (tab.key === 'settings') {
          isActive = (currentPath.includes('/admin/settings') || currentPath.includes('/settings.html') || currentPath.includes('/admin/app-settings'));
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
        <nav class="mobile-bottom-nav" aria-label="Admin Mobile Navigation">
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
   * 7. Global Keyboard Accessibility
   */
  document.addEventListener('keydown', (e) => {
    // ESC to close drawer or flyout
    if (e.key === 'Escape') {
      const sidebar = getSidebar();
      const backdrop = document.getElementById('sidebar-backdrop');
      const isMobileOpen = sidebar && (sidebar.classList.contains('open') || sidebar.classList.contains('sidebar-open'));
      const isDesktopExpanded = !document.documentElement.classList.contains('sidebar-collapsed');

      if (isMobileOpen) {
        closeSidebar();
      } else if (isDesktopExpanded && window.innerWidth >= 769) {
        toggleDesktopSidebar();
      }
    }
    // Ctrl + B or Cmd + B to toggle navigation
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      toggleSidebar();
    }
  });

  // Handle tap or click anywhere outside the sidebar to close it immediately
  function handleOutsideSidebarTap(e) {
    const sidebar = getSidebar();
    if (!sidebar) return;

    const isMobileOpen = sidebar.classList.contains('open') || sidebar.classList.contains('sidebar-open');
    const isDesktopOpen = sidebar.classList.contains('desktop-open');

    if (!isMobileOpen && !isDesktopOpen) return;

    // If click/tap is inside the sidebar itself, allow normal interaction
    if (sidebar.contains(e.target)) return;

    // If click/tap is on the toggle triggers, let their click handlers handle it
    const mobileToggleBtn = document.getElementById('mobile-sidebar-toggle-btn');
    if (mobileToggleBtn && (mobileToggleBtn === e.target || mobileToggleBtn.contains(e.target))) return;

    const railExpandBtn = document.querySelector('.rail-expand-btn');
    if (railExpandBtn && (railExpandBtn === e.target || railExpandBtn.contains(e.target))) return;

    // User clicked outside the open sidebar: close it immediately
    closeSidebar();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', handleOutsideSidebarTap, true);
    document.addEventListener('touchstart', handleOutsideSidebarTap, { passive: true, capture: true });
  }

  // Attach methods to window for inline onclick handlers & outside access
  win.toggleSidebar = toggleSidebar;
  win.openSidebar = openSidebar;
  win.closeSidebar = closeSidebar;
  win.toggleDesktopSidebar = toggleDesktopSidebar;
  win.handleBackdropClick = handleBackdropClick;
  win.toggleNotifications = toggleNotifications;
  win.adminLogout = adminLogout;
  win.mountAdminNavigation = mountAdminNavigation;
  win.openAdminSearchModal = function () {
    const term = prompt('Search Admin Portal (Department, Faculty, Settings):');
    if (term && term.trim()) {
      window.location.href = `/admin/academic-structure.html?search=${encodeURIComponent(term.trim())}`;
    }
  };

  // Mount components when DOM is loaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountAdminNavigation);
    } else {
      mountAdminNavigation();
    }
  }
})();
