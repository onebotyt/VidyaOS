/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS ADMIN DYNAMIC NAVIGATION COMPONENT (sidebar.js)
 * Location: /frontend/admin/components/sidebar/sidebar.js
 * 
 * - Dynamically mounts .admin-top-navbar, #app-sidebar, and #sidebar-backdrop
 * - Automatically detects and highlights the active route
 * - Flyout overlay drawer toggle with zero content layout shift
 * - Theme toggle (Light / Dark) persistence
 * - Keyboard shortcuts: Ctrl+B (Toggle), Escape (Dismiss)
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // Navigation module registry for Admin portal
  const ADMIN_NAV_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', href: '/admin/dashboard.html', icon: 'dashboard' },
    { key: 'academics', label: 'Academic Structure', href: '/admin/academic-structure.html', icon: 'academicStructure' },
    { key: 'faculty', label: 'HOD Management', href: '/admin/faculty.html', icon: 'hodManagement' },
    { key: 'reports', label: 'Reports & Analytics', href: '/admin/reports.html', icon: 'reports' },
    { key: 'settings', label: 'System Settings', href: '/admin/settings.html', icon: 'settings' },
    { key: 'audit', label: 'Audit Logs', href: '/admin/audit-logs.html', icon: 'audit' }
  ];

  // Dynamically inject top navbar, overlay drawer, and backdrop if not present
  function mountAdminNavigation() {
    if (typeof document === 'undefined') return;
    const layout = document.getElementById('admin-app-layout') || document.body;
    if (!layout) return;

    const currentPath = (window.location.pathname || '').toLowerCase();

    // 1. Mount Top Navbar if missing
    if (!document.getElementById('admin-top-navbar')) {
      const cubeSvg = (window.ADMIN_ICONS && window.ADMIN_ICONS.cube)
        ? window.ADMIN_ICONS.cube(28, 28, 'admin-cube-icon')
        : `<svg class="admin-cube-icon" width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 3L28 9.5L16 16L4 9.5L16 3Z" fill="var(--color-primary-light, hsl(215 90% 95%))"/><path d="M4 9.5L16 16V29L4 22.5V9.5Z" fill="var(--color-primary, hsl(217 91% 60%))"/><path d="M16 16L28 9.5V22.5L16 29V16Z" fill="var(--color-primary-hover, hsl(224 76% 48%))"/></svg>`;

      const menuSvg = (window.ADMIN_ICONS && window.ADMIN_ICONS.menu)
        ? window.ADMIN_ICONS.menu(20, 20, 2.2)
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;

      const moonSvg = `<svg class="theme-icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

      const bellSvg = (window.ADMIN_ICONS && window.ADMIN_ICONS.bell)
        ? window.ADMIN_ICONS.bell(18, 18, 2)
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;

      const navbarHtml = `
        <header class="admin-top-navbar" id="admin-top-navbar">
          <div class="admin-nav-left">
            <button type="button" class="admin-hamburger-btn" id="sidebar-toggle-btn" onclick="toggleSidebar()" aria-label="Toggle Navigation Menu" title="Main Menu (Ctrl+B)">
              ${menuSvg}
            </button>
            <a href="/admin/dashboard.html" class="admin-brand-link">
              <span class="admin-brand-icon">${cubeSvg}</span>
              <span class="admin-brand-title">VidyaOS</span>
              <span class="admin-brand-badge">ADMIN CONSOLE</span>
            </a>
          </div>

          <div class="admin-nav-right">
            <button type="button" class="admin-nav-icon-btn" id="admin-theme-btn" onclick="toggleAdminTheme()" aria-label="Toggle Theme" title="Toggle Light/Dark Theme">
              ${moonSvg}
            </button>

            <button type="button" class="admin-nav-icon-btn admin-bell-btn" onclick="toggleNotifications(event)" aria-label="Notifications" title="Notifications">
              ${bellSvg}
              <span class="admin-bell-badge">1</span>
            </button>

            <div class="admin-avatar-btn" id="admin-avatar-badge" title="System Administrator">
              <span class="admin-avatar-initials">SA</span>
            </div>
          </div>
        </header>
      `;
      layout.insertAdjacentHTML('afterbegin', navbarHtml);
    }

    // 2. Mount Overlay Drawer if missing
    if (!document.getElementById('app-sidebar')) {
      const drawerCubeSvg = (window.ADMIN_ICONS && window.ADMIN_ICONS.cube)
        ? window.ADMIN_ICONS.cube(22, 22)
        : `<svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 3L28 9.5L16 16L4 9.5L16 3Z" fill="var(--color-primary-light, hsl(215 90% 95%))"/><path d="M4 9.5L16 16V29L4 22.5V9.5Z" fill="var(--color-primary, hsl(217 91% 60%))"/><path d="M16 16L28 9.5V22.5L16 29V16Z" fill="var(--color-primary-hover, hsl(224 76% 48%))"/></svg>`;

      const closeSvg = (window.ADMIN_ICONS && window.ADMIN_ICONS.close)
        ? window.ADMIN_ICONS.close(18, 18, 2.2)
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

      const signoutSvg = (window.ADMIN_ICONS && window.ADMIN_ICONS.logout)
        ? window.ADMIN_ICONS.logout(18, 18, 2)
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`;

      const navItemsHtml = ADMIN_NAV_ITEMS.map(item => {
        const isActive = currentPath.endsWith(item.href) ||
                         currentPath.endsWith(item.href.replace('.html', '')) ||
                         (item.key === 'dashboard' && (currentPath === '/admin/' || currentPath.endsWith('/admin') || currentPath.endsWith('/admin/dashboard.html') || currentPath.endsWith('/admin/dashboard')));

        const itemIcon = (window.ADMIN_ICONS && window.ADMIN_ICONS[item.icon])
          ? window.ADMIN_ICONS[item.icon](20, 20, 2)
          : '';

        return `
          <a href="${item.href}" class="sidebar-nav-item ${isActive ? 'active' : ''}" data-nav="${item.key}">
            <span class="sidebar-nav-icon">${itemIcon}</span>
            <span class="sidebar-nav-label">${item.label}</span>
          </a>
        `;
      }).join('');

      const sidebarHtml = `
        <aside id="app-sidebar" class="admin-sidebar" aria-label="Admin Navigation">
          <div class="sidebar-drawer-header">
            <div class="sidebar-drawer-title-group">
              ${drawerCubeSvg}
              <span class="sidebar-drawer-title">VidyaOS Console</span>
            </div>
            <button type="button" class="sidebar-close-btn" onclick="closeSidebar()" aria-label="Close navigation" title="Close Menu (Esc)">
              ${closeSvg}
            </button>
          </div>

          <nav class="sidebar-nav-body" aria-label="Admin Modules">
            ${navItemsHtml}
          </nav>

          <div class="sidebar-drawer-footer">
            <span class="sidebar-brand-credit">VidyaOS • Admin</span>
            <button type="button" class="sidebar-signout-btn" onclick="handleLogout()" title="Sign Out">
              ${signoutSvg}
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      `;
      layout.insertAdjacentHTML('afterbegin', sidebarHtml);
    }

    // 3. Mount Backdrop if missing
    if (!document.getElementById('sidebar-backdrop')) {
      const backdropHtml = `<div id="sidebar-backdrop" class="sidebar-backdrop" onclick="closeSidebar()" aria-hidden="true"></div>`;
      layout.insertAdjacentHTML('afterbegin', backdropHtml);
    }
  }

  // Toggle overlay hamburger drawer
  function toggleSidebar(forceState) {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;

    const isCurrentlyOpen = sidebar.classList.contains('sidebar-open') || sidebar.classList.contains('open');
    const shouldOpen = typeof forceState === 'boolean' ? forceState : !isCurrentlyOpen;

    if (shouldOpen) {
      sidebar.classList.add('sidebar-open', 'open');
      if (backdrop) backdrop.classList.add('active', 'open');
      document.body.classList.add('sidebar-open');
    } else {
      sidebar.classList.remove('sidebar-open', 'open');
      if (backdrop) backdrop.classList.remove('active', 'open');
      document.body.classList.remove('sidebar-open');
    }
  }

  // Close overlay drawer
  function closeSidebar() {
    toggleSidebar(false);
  }

  // Theme switcher (Light <-> Dark)
  function toggleAdminTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    html.setAttribute('data-theme', newTheme);
    try {
      localStorage.setItem('theme', newTheme);
      localStorage.setItem('app_theme', newTheme);
    } catch (_) {}

    updateThemeIcon(newTheme);
  }

  function updateThemeIcon(theme) {
    const btn = document.getElementById('admin-theme-btn');
    if (!btn) return;
    if (theme === 'dark') {
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    } else {
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    }
  }

  // Notifications feedback
  function toggleNotifications(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (typeof window.showToast === 'function') {
      window.showToast('All system services active. 0 critical security alerts.', 'info');
    } else {
      alert('VidyaOS Notifications: All institutional modules nominal. 0 pending alerts.');
    }
  }

  // Sign out handler
  function handleLogout() {
    if (typeof window.logout === 'function') {
      window.logout();
    } else {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (_) {}
      window.location.href = '/login/';
    }
  }

  // Populate user initials in avatar badge
  function populateUserAvatar() {
    const avatar = document.getElementById('admin-avatar-badge');
    if (!avatar) return;
    try {
      const user = (typeof window.getCurrentUser === 'function') ? window.getCurrentUser() : null;
      if (user && (user.full_name || user.name)) {
        const name = (user.full_name || user.name).trim();
        const parts = name.split(/\s+/);
        let initials = parts[0][0];
        if (parts.length > 1) initials += parts[parts.length - 1][0];
        avatar.innerHTML = `<span class="admin-avatar-initials">${initials.toUpperCase()}</span>`;
      }
    } catch (_) {}
  }

  // Expose global methods
  window.toggleSidebar = toggleSidebar;
  window.closeSidebar = closeSidebar;
  window.toggleAdminSidebar = toggleSidebar;
  window.closeAdminSidebar = closeSidebar;
  window.toggleAdminTheme = toggleAdminTheme;
  window.toggleNotifications = toggleNotifications;
  window.handleLogout = handleLogout;
  window.mountAdminNavigation = mountAdminNavigation;

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    // 1. Toggle Sidebar: Ctrl+B or Cmd+B
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebar();
      return;
    }

    // 2. Escape: Close drawer
    if (e.key === 'Escape') {
      closeSidebar();
    }
  });

  // Self-mounting on ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        mountAdminNavigation();
        const savedTheme = localStorage.getItem('theme') || localStorage.getItem('app_theme') || 'light';
        updateThemeIcon(savedTheme);
        populateUserAvatar();
      });
    } else {
      mountAdminNavigation();
      const savedTheme = localStorage.getItem('theme') || localStorage.getItem('app_theme') || 'light';
      updateThemeIcon(savedTheme);
      populateUserAvatar();
    }
  }
})();
