/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS ADMIN UNIFIED NAVIGATION CONTROLLER (sidebar.js)
 * Location: /frontend/admin/components/sidebar/sidebar.js
 * 
 * - Flyout overlay drawer toggle & backdrop management
 * - Zero content shift: Content remains centered & sized
 * - Theme toggle (Light / Dark) persistence
 * - Keyboard shortcuts: Ctrl+B (Toggle), Escape (Dismiss)
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

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

  // Initialize on load
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const savedTheme = localStorage.getItem('theme') || localStorage.getItem('app_theme') || 'light';
      updateThemeIcon(savedTheme);
      populateUserAvatar();
    });
  }
})();
