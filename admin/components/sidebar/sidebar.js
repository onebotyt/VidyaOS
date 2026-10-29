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

  // Reliable inline clean modern SVGs for all admin controls and modules
  const FALLBACK_ICONS = {
    cube: `<svg class="rail-cube-logo" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M16 3.5L27.5 9.8L16 16.2L4.5 9.8L16 3.5Z" fill="var(--color-primary-light, hsl(215 90% 95%))" stroke="var(--color-primary)" stroke-width="1.2" stroke-linejoin="round"/><path d="M4.5 9.8L16 16.2V28.5L4.5 22.2V9.8Z" fill="var(--color-primary, hsl(217 91% 60%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/><path d="M16 16.2L27.5 9.8V22.2L16 28.5V16.2Z" fill="var(--color-primary-hover, hsl(224 76% 48%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/><path d="M16 16.5V27.5" stroke="hsl(0 0% 100% / 0.4)" stroke-width="1.2" stroke-linecap="round"/><path d="M16.5 16L26.5 10.5" stroke="hsl(0 0% 100% / 0.3)" stroke-width="1.2" stroke-linecap="round"/></svg>`,
    chevronRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
    chevronLeft: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
    menu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
    close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    dashboard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.25"/><rect x="13.5" y="3" width="7.5" height="4.5" rx="1.5" fill="currentColor" fill-opacity="0.12"/><rect x="13.5" y="10.5" width="7.5" height="10.5" rx="1.5" fill="currentColor" fill-opacity="0.25"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.12"/></svg>`,
    academicStructure: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 3 21 7.5 12 12 3 7.5" fill="currentColor" fill-opacity="0.25"/><path d="M4 11.5L12 16L20 11.5" fill="none"/><path d="M4 11.5V13.5L12 18L20 13.5V11.5" fill="currentColor" fill-opacity="0.15"/><path d="M4 16L12 20.5L20 16" fill="none"/></svg>`,
    hodManagement: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5L19.5 5.5V11C19.5 16 16 19.8 12 21.5C8 19.8 4.5 16 4.5 11V5.5L12 2.5Z" fill="currentColor" fill-opacity="0.15"/><circle cx="12" cy="9" r="2.5" fill="currentColor" fill-opacity="0.5"/><path d="M8.5 15.5C8.5 13.5 10 12.2 12 12.2C14 12.2 15.5 13.5 15.5 15.5" stroke="currentColor" stroke-width="1.8"/></svg>`,
    reports: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="14" width="3.5" height="7" rx="1" fill="currentColor" fill-opacity="0.25"/><rect x="10.25" y="9.5" width="3.5" height="11.5" rx="1" fill="currentColor" fill-opacity="0.35"/><rect x="16.5" y="5" width="3.5" height="16" rx="1" fill="currentColor" fill-opacity="0.45"/><polyline points="4 9 10 4 19.5 4" stroke="currentColor" stroke-width="2"/><polyline points="16 2 20 4 16 6" stroke="currentColor" stroke-width="2"/></svg>`,
    settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor" fill-opacity="0.25"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    audit: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fill-opacity="0.15"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/><circle cx="9" cy="9" r="1" fill="currentColor"/></svg>`,
    user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="currentColor" fill-opacity="0.15"/><circle cx="12" cy="7" r="4" fill="currentColor" fill-opacity="0.25"/></svg>`,
    logout: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
    bell: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
    institution: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"></path></svg>`
  };

  // Navigation module registry for Admin portal
  const ADMIN_NAV_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', shortLabel: 'Overview', href: '/admin/dashboard.html', icon: 'dashboard' },
    { key: 'academics', label: 'Academic Structure', shortLabel: 'Structure', href: '/admin/academic-structure.html', icon: 'academicStructure' },
    { key: 'faculty', label: 'HOD Management', shortLabel: 'Faculty', href: '/admin/faculty.html', icon: 'hodManagement' },
    { key: 'reports', label: 'Reports & Analytics', shortLabel: 'Reports', href: '/admin/reports.html', icon: 'reports' },
    { key: 'settings', label: 'System Settings', shortLabel: 'Settings', href: '/admin/settings.html', icon: 'settings' },
    { key: 'audit', label: 'Audit Logs', shortLabel: 'Audit', href: '/admin/audit-logs.html', icon: 'audit' }
  ];

  /**
   * Helper to retrieve rendered SVG markup with automatic fallback
   */
  function getIcon(name, options = {}) {
    if (typeof window.getAdminIcon === 'function') {
      const svg = window.getAdminIcon(name, options);
      if (svg) return svg;
    }
    if (window.ADMIN_ICONS) {
      if (typeof window.ADMIN_ICONS.get === 'function') {
        const svg = window.ADMIN_ICONS.get(name, options);
        if (svg) return svg;
      }
      if (typeof window.ADMIN_ICONS[name] === 'function') {
        const w = options.width || options.w || 20;
        const h = options.height || options.h || w;
        const s = options.stroke || options.strokeWidth || 2;
        const c = options.className || options.cls || '';
        return window.ADMIN_ICONS[name](w, h, s, c);
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
    const layout = document.getElementById('admin-app-layout') || document.body;
    const sidebar = getSidebar();
    const backdrop = document.getElementById('sidebar-backdrop');
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
    if (typeof window.logout === 'function') {
      window.logout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login.html';
    }
  }

  /**
   * 6. Dynamic Component Mounting Engine
   */
  function mountAdminNavigation() {
    if (typeof document === 'undefined') return;
    const layout = document.getElementById('admin-app-layout') || document.body;
    if (!layout) return;

    const currentPath = (window.location.pathname || '').toLowerCase();

    // ── A. Mount Mobile Top Header (<= 768px only) if missing ──
    if (!document.getElementById('mobile-top-header')) {
      const menuSvg = getIcon('menu', { width: 20, height: 20, stroke: 2.2 });
      const instSvg = getIcon('institution', { width: 18, height: 18, stroke: 2 });
      const bellSvg = getIcon('bell', { width: 18, height: 18, stroke: 2 });

      const mobileHeaderHtml = `
        <header class="mobile-top-header" id="mobile-top-header">
          <div class="mobile-header-left">
            <button type="button" class="mobile-hamburger-btn" id="mobile-sidebar-toggle-btn" onclick="toggleSidebar()" aria-label="Open Navigation Menu">
              ${menuSvg}
            </button>
          </div>
          <div class="mobile-header-center">
            <a href="/admin/dashboard.html" class="mobile-brand-link">
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

    // ── B. Mount Dual-State Sidebar (#vidya-admin-sidebar) if missing ──
    if (!getSidebar()) {
      const cubeSvg = getIcon('cube', { width: 32, height: 32, className: 'rail-cube-logo' });
      const headerCubeSvg = getIcon('cube', { width: 24, height: 24, className: 'header-cube-logo' });
      const expandChevronSvg = getIcon('chevronRight', { width: 15, height: 15, stroke: 2.8 });
      const collapseChevronSvg = getIcon('chevronLeft', { width: 14, height: 14, stroke: 2.5 });
      const closeSvg = getIcon('close', { width: 18, height: 18, stroke: 2.2 });
      const userSvg = getIcon('user', { width: 20, height: 20, stroke: 2 });
      const signoutSvg = getIcon('logout', { width: 20, height: 20, stroke: 2 });

      // Render 3D Navigation items with high-speed CSS tooltip and zero native title delay
      const navItemsHtml = ADMIN_NAV_ITEMS.map(item => {
        const isActive = currentPath.endsWith(item.href) ||
          currentPath.endsWith(item.href.replace('.html', '')) ||
          (item.key === 'dashboard' && (currentPath === '/admin/' || currentPath.endsWith('/admin') || currentPath.endsWith('/admin/dashboard.html') || currentPath.endsWith('/admin/dashboard')));

        const activeCls = isActive ? ' active' : '';
        const itemSvg = getIcon(item.icon, { width: 20, height: 20, stroke: 1.8 });

        return `
          <a href="${item.href}" class="sidebar-nav-item${activeCls}" data-nav="${item.key}" data-tooltip="${item.label}" aria-label="${item.label}">
            <span class="sidebar-nav-icon">${itemSvg}</span>
            <span class="sidebar-nav-short-label">${item.shortLabel || item.label}</span>
            <span class="sidebar-nav-label">${item.label}</span>
          </a>
        `;
      }).join('');

      const sidebarHtml = `
        <aside id="vidya-admin-sidebar" class="admin-sidebar vidya-admin-sidebar" data-component="vidya-admin-sidebar" aria-label="Admin Navigation">
          <!-- A. Rail Header (Desktop Collapsed 72px Rail) -->
          <div class="sidebar-rail-header" aria-hidden="true">
            <div class="rail-brand-row">
              <a href="/admin/dashboard.html" class="rail-logo-link" data-tooltip="VidyaOS Dashboard" aria-label="VidyaOS Dashboard">
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
              <span class="sidebar-header-title">VidyaOS Console</span>
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
          <nav class="sidebar-nav-body" aria-label="Admin Navigation Links">
            ${navItemsHtml}
          </nav>

          <!-- D. Sidebar Footers -->
          <div class="sidebar-expanded-footer">
            <div class="sidebar-user-card">
              <div class="sidebar-user-avatar" aria-hidden="true">
                <span>SA</span>
              </div>
              <div class="sidebar-user-meta">
                <span class="sidebar-user-name">System Administrator</span>
                <span class="sidebar-user-sub">VidyaOS Console</span>
              </div>
            </div>
            <button type="button" class="sidebar-signout-card-btn" onclick="adminLogout()" title="Sign Out" aria-label="Sign Out">
              ${signoutSvg}
              <span>Sign Out</span>
            </button>
          </div>

          <div class="sidebar-rail-footer" aria-hidden="true">
            <a href="/admin/profile.html" class="rail-footer-btn" data-tooltip="Admin Profile" aria-label="Admin Profile">
              <span class="rail-user-circle">SA</span>
              <span class="sidebar-nav-short-label">Profile</span>
            </a>
            <button type="button" class="rail-footer-btn rail-signout-btn" onclick="adminLogout()" data-tooltip="Sign Out" aria-label="Sign Out">
              ${signoutSvg}
              <span class="sidebar-nav-short-label">Logout</span>
            </button>
          </div>
        </aside>

        <!-- Backdrop Overlay for Desktop Flyout & Mobile Drawer -->
        <div id="sidebar-backdrop" class="gc-drawer-backdrop sidebar-backdrop" onclick="toggleDesktopSidebar()"></div>
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

  // Attach methods to window for inline onclick handlers & outside access
  window.toggleSidebar = toggleSidebar;
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
  window.toggleDesktopSidebar = toggleDesktopSidebar;
  window.toggleNotifications = toggleNotifications;
  window.adminLogout = adminLogout;
  window.mountAdminNavigation = mountAdminNavigation;

  // Mount components when DOM is loaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountAdminNavigation);
    } else {
      mountAdminNavigation();
    }
  }
})();
