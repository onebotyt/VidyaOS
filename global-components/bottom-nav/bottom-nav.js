/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS GLOBAL MOBILE BOTTOM NAVIGATION (bottom-nav.js)
 * Location: /frontend/global-components/bottom-nav/bottom-nav.js
 * 
 * Standalone Mobile Navigation Dock Controller
 * Synchronized with Sidebar module to guarantee seamless 1-dock invariant
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const DEFAULT_TABS = [
    { key: 'dashboard', label: 'Home', href: '/admin/dashboard/index.html', icon: 'home' },
    { key: 'academics', label: 'Structure', href: '/admin/academic-structure/index.html', icon: 'structure' },
    { key: 'faculty', label: 'Faculty', href: '/admin/faculty-management/index.html', icon: 'faculty' },
    { key: 'bugs', label: 'Bugs', href: '/admin/bug-reports/index.html', icon: 'bugs' },
    { key: 'settings', label: 'Settings', href: '/admin/settings/index.html', icon: 'settings' }
  ];

  function highlightActiveBottomTab() {
    const currentPath = window.location.pathname;
    const items = document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item');
    if (!items.length) return;

    items.forEach(item => {
      const tab = item.getAttribute('data-tab');
      let active = false;
      if (tab === 'dashboard' && (currentPath === '/admin' || currentPath.includes('/dashboard'))) active = true;
      else if (tab === 'academics' && currentPath.includes('/academic-structure')) active = true;
      else if (tab === 'faculty' && currentPath.includes('/faculty-management')) active = true;
      else if (tab === 'bugs' && currentPath.includes('/bug-reports')) active = true;
      else if (tab === 'settings' && (currentPath.includes('/settings') || currentPath.includes('/admin/app-settings'))) active = true;

      if (active) item.classList.add('active');
      else item.classList.remove('active');
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', highlightActiveBottomTab);
    } else {
      highlightActiveBottomTab();
    }
  }

  window.highlightActiveBottomTab = highlightActiveBottomTab;
})();
