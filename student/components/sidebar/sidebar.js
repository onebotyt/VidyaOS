/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS STUDENT NAVIGATION SIDEBAR & MOBILE BAR (sidebar.js)
 * Location: /frontend/student/components/sidebar/sidebar.js
 * 
 * - Mounts the off-canvas navigation drawer
 * - Mounts the 5-tab native-style mobile bottom navigation bar
 * - Dynamically loads enrolled classes into drawer list
 * - Route-aware active tab and link highlighting
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  function getIcon(name, options = {}) {
    if (typeof window.getStudentIcon === 'function') {
      return window.getStudentIcon(name, options);
    }
    return '';
  }

  // Primary Navigation Registry
  const NAV_ITEMS = [
    { key: 'classes', label: 'Classes Hub', href: '/student/dashboard.html', icon: 'classes' },
    { key: 'attendance', label: 'My Attendance', href: '/student/attendance.html', icon: 'attendance' },
    { key: 'timetable', label: 'Weekly Timetable', href: '/student/timetable.html', icon: 'timetable' },
    { key: 'assignments', label: 'Coursework & Tasks', href: '/student/assignments.html', icon: 'assignments' },
    { key: 'scores', label: 'Marks & Scores', href: '/student/scores.html', icon: 'scores' },
    { key: 'leave', label: 'Leave Applications', href: '/student/leave.html', icon: 'leave' },
    { key: 'profile', label: 'Student Profile', href: '/student/profile.html', icon: 'profile' }
  ];

  // 5 Canonical Mobile Bottom Tabs
  const MOBILE_TABS = [
    { key: 'classes', label: 'Classes', href: '/student/dashboard.html', icon: 'classes' },
    { key: 'attendance', label: 'Attendance', href: '/student/attendance.html', icon: 'attendance' },
    { key: 'timetable', label: 'Routine', href: '/student/timetable.html', icon: 'timetable' },
    { key: 'assignments', label: 'Tasks', href: '/student/assignments.html', icon: 'assignments' },
    { key: 'profile', label: 'Profile', href: '/student/profile.html', icon: 'profile' }
  ];

  function getActiveNavKey() {
    const p = window.location.pathname.toLowerCase();
    if (p.includes('/attendance')) return 'attendance';
    if (p.includes('/timetable')) return 'timetable';
    if (p.includes('/assignments')) return 'assignments';
    if (p.includes('/scores')) return 'scores';
    if (p.includes('/leave')) return 'leave';
    if (p.includes('/profile')) return 'profile';
    return 'classes';
  }

  function mountStudentSidebar() {
    if (typeof document === 'undefined') return;

    // 1. Mount Off-Canvas Drawer if missing
    if (!document.getElementById('gc-drawer') && !document.getElementById('student-drawer')) {
      const activeKey = getActiveNavKey();

      const linksHtml = NAV_ITEMS.map(item => `
        <a href="${item.href}" class="student-drawer-link ${item.key === activeKey ? 'active' : ''}">
          <span class="student-drawer-link-icon">${getIcon(item.icon, { width: 19, height: 19 })}</span>
          <span>${item.label}</span>
        </a>
      `).join('');

      const drawerHtml = `
        <div class="student-drawer-backdrop gc-drawer-backdrop" id="student-drawer-backdrop" onclick="toggleDrawerComponent(false)"></div>
        <aside class="student-drawer gc-drawer" id="student-drawer" aria-label="Student Navigation Drawer">
          <div class="student-drawer-header">
            <a href="/student/dashboard.html" class="student-drawer-brand">
              ${getIcon('brand', { width: 22, height: 22 })}
              <span>VidyaOS</span>
            </a>
            <button type="button" class="student-drawer-close" onclick="toggleDrawerComponent(false)" aria-label="Close navigation menu">
              ${getIcon('close', { width: 18, height: 18 })}
            </button>
          </div>

          <div class="student-drawer-content">
            <div class="student-drawer-section-title">Navigation</div>
            ${linksHtml}

            <div class="student-drawer-section-title" style="margin-top:1rem;">Enrolled Classes</div>
            <div class="student-drawer-classes-list" id="drawer-classes-list">
              <div style="font-size:0.78rem;color:var(--text-muted);padding:0.5rem 0.85rem;">Loading classes...</div>
            </div>
          </div>

          <div class="student-drawer-footer">
            <span>Student Portal v2.0</span>
            <span style="font-weight:600;color:var(--color-primary);">VidyaOS</span>
          </div>
        </aside>
      `;

      const mount = document.getElementById('student-sidebar-mount');
      if (mount) {
        mount.innerHTML = drawerHtml;
      } else {
        document.body.insertAdjacentHTML('beforeend', drawerHtml);
      }
    }

    // 2. Mount Mobile Bottom Navigation Bar if missing
    const isClassDetail = window.location.pathname.includes('/group-detail');
    if (!isClassDetail && !document.querySelector('.student-mobile-bottom-bar') && !document.getElementById('student-mobile-bottom-nav')) {
      const activeKey = getActiveNavKey();

      const tabsHtml = MOBILE_TABS.map(tab => `
        <a href="${tab.href}" class="student-tab-item ${tab.key === activeKey ? 'active' : ''}">
          <span class="student-tab-icon">${getIcon(tab.icon, { width: 20, height: 20 })}</span>
          <span>${tab.label}</span>
        </a>
      `).join('');

      const bottomBarHtml = `
        <nav class="student-mobile-bottom-bar" aria-label="Mobile Navigation Bar">
          ${tabsHtml}
        </nav>
      `;

      document.body.insertAdjacentHTML('beforeend', bottomBarHtml);
    }

    // Load classes dynamically into drawer
    loadDrawerClasses();
  }

  /**
   * Loads enrolled classes into drawer list
   */
  async function loadDrawerClasses() {
    const container = document.getElementById('drawer-classes-list');
    if (!container) return;

    const dotColors = [
      'hsl(217 82% 52%)',
      'hsl(152 72% 40%)',
      'hsl(262 70% 55%)',
      'hsl(32 94% 48%)',
      'hsl(186 86% 38%)',
      'hsl(340 76% 50%)'
    ];

    try {
      if (typeof fetchApi !== 'function') return;
      const res = await fetchApi('/students/me');
      if (!res || !res.success) return;

      // Query enrolled teaching groups
      const groupsRes = await fetchApi('/students/teaching-groups').catch(() => null);
      const classes = groupsRes?.data || [];

      if (!classes || classes.length === 0) {
        container.innerHTML = `
          <div style="font-size:0.78rem;color:var(--text-muted);padding:0.4rem 0.85rem;">
            No enrolled classes yet.
          </div>
        `;
        return;
      }

      container.innerHTML = classes.map((c, i) => {
        const color = dotColors[i % dotColors.length];
        const name = c.name || c.subject_name || `Class ${c.id}`;
        return `
          <a href="/student/group-detail.html?id=${c.id}" class="student-class-item" title="${name}">
            <span class="student-class-dot" style="background-color: ${color};"></span>
            <span class="student-class-name">${name}</span>
          </a>
        `;
      }).join('');
    } catch (_) {
      container.innerHTML = `
        <div style="font-size:0.78rem;color:var(--text-muted);padding:0.4rem 0.85rem;">
          Classes loaded from dashboard.
        </div>
      `;
    }
  }

  /**
   * Toggles the off-canvas drawer
   */
  function toggleDrawerComponent(forceState) {
    const drawer = document.getElementById('student-drawer') || document.getElementById('gc-drawer');
    const backdrop = document.getElementById('student-drawer-backdrop') || document.getElementById('gc-drawer-backdrop');
    if (!drawer) return;

    const isOpen = forceState !== undefined ? forceState : !drawer.classList.contains('open');
    if (isOpen) {
      drawer.classList.add('open');
      if (backdrop) backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
    } else {
      drawer.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  // Export to window
  window.toggleDrawerComponent = toggleDrawerComponent;
  window.mountStudentSidebar = mountStudentSidebar;

  // Interop alias
  window.toggleDrawer = toggleDrawerComponent;

  // Auto-mount
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountStudentSidebar);
  } else {
    mountStudentSidebar();
  }
})();
