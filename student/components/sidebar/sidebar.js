/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS STUDENT DUAL-STATE NAVIGATION ENGINE (sidebar.js)
 * Location: /frontend/student/components/sidebar/sidebar.js
 *
 * - Mounts the Desktop 72px Persistent Mini-Rail (#student-rail) on >= 769px
 * - Mounts the 280px Off-Canvas Sliding Drawer (#student-drawer) with Enrolled Classes
 * - Mounts the 5-Tab Mobile Bottom Navigation Dock (.student-mobile-bottom-bar) on <= 768px
 * - Route-aware active state, instant hover tooltips, and Ctrl+B keyboard toggle
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  function getIcon(name, options = {}) {
    if (typeof window.getStudentIcon === 'function') {
      const svg = window.getStudentIcon(name, options);
      if (svg) return svg;
    }
    if (name === 'dossier' || name === 'nba') {
      const w = options.width || 20;
      const h = options.height || 20;
      return `<svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>`;
    }
    return '';
  }

  // Primary Navigation Registry (All 7 Verified Student Modules)
  const NAV_ITEMS = [
    { key: 'classes', label: 'Classes Hub', shortLabel: 'Classes', href: '/student/dashboard/index.html', icon: 'classes' },
    { key: 'attendance', label: 'My Attendance', shortLabel: 'Attend', href: '/student/attendance/index.html', icon: 'attendance' },
    { key: 'timetable', label: 'Weekly Timetable', shortLabel: 'Schedule', href: '/student/timetable/index.html', icon: 'timetable' },
    { key: 'assignments', label: 'Coursework & Tasks', shortLabel: 'Tasks', href: '/student/assignments/index.html', icon: 'assignments' },
    { key: 'scores', label: 'Marks & Scores', shortLabel: 'Scores', href: '/student/scores/index.html', icon: 'scores' },
    { key: 'leave', label: 'Leave Applications', shortLabel: 'Leave', href: '/student/leave/index.html', icon: 'leave' },
    { key: 'profile', label: 'Profile & Dossier', shortLabel: 'Profile', href: '/student/profile/index.html', icon: 'profile' },
    { key: 'settings', label: 'Settings & Account', shortLabel: 'Settings', href: '/student/settings/index.html', icon: 'settings' },
    { key: 'bug-reports', label: 'Report a Bug', shortLabel: 'Bug Report', href: '/student/bug-reports/index.html', icon: 'bug' }
  ];

  // 5 Canonical Mobile Bottom Tabs (Matches native mobile app structure)
  const MOBILE_TABS = [
    { key: 'classes', label: 'Classes', href: '/student/dashboard/index.html', icon: 'classes' },
    { key: 'attendance', label: 'Attendance', href: '/student/attendance/index.html', icon: 'attendance' },
    { key: 'timetable', label: 'Routine', href: '/student/timetable/index.html', icon: 'timetable' },
    { key: 'scores', label: 'Scores', href: '/student/scores/index.html', icon: 'scores' },
    { key: 'settings', label: 'Settings', href: '/student/settings/index.html', icon: 'settings' }
  ];

  function getActiveNavKey() {
    const p = window.location.pathname.toLowerCase();
    if (p.includes('/attendance')) return 'attendance';
    if (p.includes('/timetable')) return 'timetable';
    if (p.includes('/assignments')) return 'assignments';
    if (p.includes('/scores')) return 'scores';
    if (p.includes('/leave')) return 'leave';
    if (p.includes('/settings')) return 'settings';
    if (p.includes('/profile')) return 'settings'; // Highlights Settings tab on mobile, maintains active state
    if (p.includes('/bug-reports')) return 'bug-reports';
    return 'classes';
  }

  function mountStudentSidebar() {
    if (typeof document === 'undefined') return;

    const activeKey = getActiveNavKey();

    // 1. Mount Desktop 72px Mini-Rail + Off-Canvas Drawer if missing
    if (!document.getElementById('gc-drawer') && !document.getElementById('student-drawer')) {
      const railItemsHtml = NAV_ITEMS.map(item => `
        <a href="${item.href}" class="student-rail-item ${item.key === activeKey ? 'active' : ''}" data-tooltip="${item.label}" aria-label="${item.label}">
          <span class="student-rail-icon">${getIcon(item.icon, { width: 20, height: 20 })}</span>
          <span class="student-rail-label">${item.shortLabel}</span>
        </a>
      `).join('');

      const linksHtml = NAV_ITEMS.map(item => `
        <a href="${item.href}" class="student-drawer-link ${item.key === activeKey ? 'active' : ''}">
          <span class="student-drawer-link-icon">${getIcon(item.icon, { width: 19, height: 19 })}</span>
          <span>${item.label}</span>
        </a>
      `).join('');

      const navShellHtml = `
        <!-- Desktop 72px Persistent Navigation Rail (>= 769px) -->
        <aside class="student-desktop-rail" id="student-rail" aria-label="Student Quick Navigation">
          <div class="student-rail-nav">
            ${railItemsHtml}
          </div>
          <div class="student-rail-footer">
            <button type="button" class="student-rail-expand-btn" onclick="toggleDrawerComponent()" data-tooltip="Expand Menu & Classes (Ctrl+B)" aria-label="Expand Navigation Drawer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </aside>

        <!-- Sliding Full Navigation & Enrolled Classes Drawer -->
        <div class="student-drawer-backdrop gc-drawer-backdrop" id="student-drawer-backdrop" onclick="toggleDrawerComponent(false)"></div>
        <aside class="student-drawer gc-drawer" id="student-drawer" aria-label="Student Navigation Drawer">
          <div class="student-drawer-header">
            <a href="/student/dashboard/index.html" class="student-drawer-brand">
              ${getIcon('brand', { width: 22, height: 22 })}
              <span>VidyaOS</span>
              <span class="badge badge-sem" style="font-size:0.65rem;">STUDENT</span>
            </a>
            <button type="button" class="student-drawer-close" onclick="toggleDrawerComponent(false)" aria-label="Close navigation menu">
              ${getIcon('close', { width: 18, height: 18 })}
            </button>
          </div>

          <div class="student-drawer-content">
            <div class="student-drawer-section-title">Academic Modules</div>
            ${linksHtml}

            <div class="student-drawer-section-title" style="margin-top:1rem;">Enrolled Classes</div>
            <div class="student-drawer-classes-list" id="drawer-classes-list">
              <div style="font-size:0.78rem;color:var(--text-muted);padding:0.5rem 0.85rem;">Loading classes...</div>
            </div>
          </div>

          <div class="student-drawer-footer">
            <span>Student Portal v2.5</span>
            <span style="font-weight:700;color:var(--color-primary);">VidyaOS</span>
          </div>
        </aside>
      `;

      const mount = document.getElementById('student-sidebar-mount');
      if (mount) {
        mount.innerHTML = navShellHtml;
      } else {
        document.body.insertAdjacentHTML('beforeend', navShellHtml);
      }
    }

    // 2. Mount Mobile Bottom Navigation Bar if missing
    const isClassDetail = window.location.pathname.includes('/group-detail');
    if (!isClassDetail && !document.querySelector('.student-mobile-bottom-bar') && !document.getElementById('student-mobile-bottom-nav')) {
      const tabsHtml = MOBILE_TABS.map(tab => `
        <a href="${tab.href}" class="student-tab-item ${tab.key === activeKey ? 'active' : ''}">
          <span class="student-tab-icon">${getIcon(tab.icon, { width: 20, height: 20 })}</span>
          <span class="student-tab-label">${tab.label}</span>
        </a>
      `).join('');

      const bottomBarHtml = `
        <nav class="student-mobile-bottom-bar" id="student-mobile-bottom-nav" aria-label="Mobile Navigation Bar">
          ${tabsHtml}
        </nav>
      `;

      document.body.insertAdjacentHTML('beforeend', bottomBarHtml);
    }

    // 3. Load enrolled classes into drawer
    loadDrawerClasses();
  }

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
      const groupsRes = await fetchApi('/teaching-groups/student/my-groups', { suppressToast: true }).catch(() => null);
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
          <a href="/student/group-detail/index.html?id=${c.id}" class="student-class-item" title="${name}">
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

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleDrawerComponent();
    }
  });

  window.toggleDrawerComponent = toggleDrawerComponent;
  window.mountStudentSidebar = mountStudentSidebar;
  window.toggleDrawer = toggleDrawerComponent;
  window.toggleStudentDrawer = toggleDrawerComponent;
  window.toggleSidebar = toggleDrawerComponent;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountStudentSidebar);
  } else {
    mountStudentSidebar();
  }
})();
