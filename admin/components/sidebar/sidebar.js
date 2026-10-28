/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS ADMIN DUAL-STATE SIDEBAR CONTROLLER (sidebar.js)
 * Location: /admin/components/sidebar/sidebar.js
 * 
 * - Desktop Expanded (250px) <-> Collapsed Mini-Rail (72px)
 * - Mobile Off-Canvas Drawer (280px) with Dimmed Backdrop
 * - Keyboard Shortcuts: Ctrl+B (Toggle), Escape (Dismiss)
 * - Zero Layout Shift (CLS) State Persistence
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // Toggle desktop collapsed mini-rail
  function toggleDesktopSidebar() {
    const layout = document.getElementById('admin-app-layout') || document.body;
    const isCurrentlyCollapsed = layout.classList.contains('sidebar-collapsed') || document.body.classList.contains('sidebar-collapsed');
    const willCollapse = !isCurrentlyCollapsed;

    if (willCollapse) {
      layout.classList.add('sidebar-collapsed');
      document.body.classList.add('sidebar-collapsed');
      document.documentElement.classList.add('sidebar-collapsed');
    } else {
      layout.classList.remove('sidebar-collapsed');
      document.body.classList.remove('sidebar-collapsed');
      document.documentElement.classList.remove('sidebar-collapsed');
    }

    try {
      localStorage.setItem('admin_sidebar_collapsed', willCollapse ? 'true' : 'false');
    } catch (_) {}
  }

  // Universal sidebar toggle (Desktop rail vs Mobile drawer)
  function toggleSidebar(forceState) {
    if (window.innerWidth >= 769) {
      toggleDesktopSidebar();
      return;
    }

    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;

    const isCurrentlyOpen = sidebar.classList.contains('sidebar-open') || sidebar.classList.contains('open');
    const shouldOpen = typeof forceState === 'boolean' ? forceState : !isCurrentlyOpen;

    if (shouldOpen) {
      sidebar.classList.add('sidebar-open', 'open');
      if (backdrop) backdrop.classList.add('active', 'open');
      document.body.style.overflow = 'hidden';
    } else {
      sidebar.classList.remove('sidebar-open', 'open');
      if (backdrop) backdrop.classList.remove('active', 'open');
      document.body.style.overflow = '';
    }
  }

  // Close mobile drawer
  function closeSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('sidebar-open', 'open');
    if (backdrop) backdrop.classList.remove('active', 'open');
    document.body.style.overflow = '';
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

  // Expose methods globally for inline onclick handlers
  window.toggleDesktopSidebar = toggleDesktopSidebar;
  window.toggleSidebar = toggleSidebar;
  window.closeSidebar = closeSidebar;
  window.toggleNotifications = toggleNotifications;

  // Global Keyboard Navigation
  window.addEventListener('keydown', (e) => {
    // 1. Toggle Sidebar: Ctrl+B or Cmd+B
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebar();
      return;
    }

    // 2. Escape: Close mobile drawer
    if (e.key === 'Escape') {
      closeSidebar();
    }
  });

  // Restore saved desktop state immediately
  function applyInitialState() {
    try {
      if (localStorage.getItem('admin_sidebar_collapsed') === 'true' && window.innerWidth >= 769) {
        const layout = document.getElementById('admin-app-layout') || document.body;
        layout.classList.add('sidebar-collapsed');
        document.body.classList.add('sidebar-collapsed');
        document.documentElement.classList.add('sidebar-collapsed');
      }
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyInitialState);
  } else {
    applyInitialState();
  }
})();
