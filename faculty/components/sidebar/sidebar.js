/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY DUAL-STATE NAVIGATION ENGINE (sidebar.js)
 * Optimized & Streamlined (Zero Redundancy, Instant Performance)
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const ICONS = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor" fill-opacity="0.15"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
    classes: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.25"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.12"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.25"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.12"/>',
    registers: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" fill="currentColor" fill-opacity="0.12"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="currentColor" fill-opacity="0.25"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/>',
    sheets: '<rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" fill-opacity="0.2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>',
    leaves: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fill-opacity="0.22"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    students: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="currentColor" fill-opacity="0.2"/><circle cx="9" cy="7" r="4" fill="currentColor" fill-opacity="0.3"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    timetable: '<rect x="3" y="4" width="18" height="18" rx="2" fill="currentColor" fill-opacity="0.2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    drive: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="currentColor" fill-opacity="0.22"/>',
    reports: '<rect x="4" y="14" width="3.5" height="7" rx="1" fill="currentColor" fill-opacity="0.25"/><rect x="10.25" y="9.5" width="3.5" height="11.5" rx="1" fill="currentColor" fill-opacity="0.35"/><rect x="16.5" y="5" width="3.5" height="16" rx="1" fill="currentColor" fill-opacity="0.45"/><polyline points="4 9 10 4 19.5 4" stroke="currentColor" stroke-width="1.8"/><polyline points="16 2 20 4 16 6" stroke="currentColor" stroke-width="1.8"/>'
  };

  function renderSvg(name, size = 20) {
    const body = ICONS[name] || ICONS.home;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

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

  const FACULTY_MOBILE_TABS = [
    { key: 'home', label: 'Home', href: '/faculty/dashboard/index.html', icon: 'home' },
    { key: 'classes', label: 'Classes', href: '/faculty/classes/index.html', icon: 'classes' },
    { key: 'students', label: 'Students', href: '/faculty/students/index.html', icon: 'students' },
    { key: 'reports', label: 'Reports', href: '/faculty/reports/index.html', icon: 'reports' },
    { key: 'settings', label: 'Settings', href: '/faculty/profile/index.html', icon: 'settings' }
  ];

  function getSidebar() {
    return document.getElementById('faculty-sidebar') || document.querySelector('.faculty-sidebar');
  }

  function getBackdrop() {
    return document.getElementById('faculty-sidebar-backdrop');
  }

  function getUser() {
    if (typeof window.getCurrentUser === 'function') return window.getCurrentUser();
    try {
      const stored = localStorage.getItem('user') || localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  }

  // ── Desktop Flyout Toggle (72px Rail <-> 260px Overlay) ──
  function toggleDesktopSidebar() {
    if (window.innerWidth <= 768) {
      toggleSidebar();
      return;
    }
    const sb = getSidebar();
    const bd = getBackdrop();
    if (!sb) return;

    const isOpen = sb.classList.contains('desktop-open');
    if (isOpen) {
      sb.classList.remove('desktop-open');
      if (bd) bd.classList.remove('active', 'open');
    } else {
      sb.classList.add('desktop-open');
      if (bd) bd.classList.add('active', 'open');
    }
  }

  // ── Mobile Drawer Toggle (<= 768px) ──
  function toggleSidebar() {
    if (window.innerWidth >= 769) {
      toggleDesktopSidebar();
      return;
    }
    const sb = getSidebar();
    const bd = getBackdrop();
    if (!sb) return;

    const isOpen = sb.classList.contains('open') || sb.classList.contains('sidebar-open');
    if (isOpen) {
      closeSidebar();
    } else {
      sb.classList.add('open', 'sidebar-open');
      if (bd) bd.classList.add('active', 'open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeSidebar() {
    const sb = getSidebar();
    const bd = getBackdrop();
    if (sb) {
      sb.classList.remove('open', 'sidebar-open', 'desktop-open');
    }
    if (bd) {
      bd.classList.remove('active', 'open');
    }
    document.body.style.overflow = '';
  }

  function handleBackdropClick(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    closeSidebar();
  }

  // ── Mount Navigation Core ──
  function mountFacultyNavigation() {
    if (typeof document === 'undefined') return;

    // Mount header first if missing
    if (typeof window.mountFacultyHeader === 'function' && !document.getElementById('faculty-header')) {
      window.mountFacultyHeader();
    }

    const currentPath = (window.location.pathname || '').toLowerCase();
    const user = getUser();
    const isHod = Boolean(user && (
      (Array.isArray(user.roles) && user.roles.includes('HOD')) ||
      user.role === 'HOD' ||
      user.is_hod === true ||
      user.is_hod === 1
    ));

    // 1. Build Navigation HTML
    const navItemsHtml = FACULTY_NAV_ITEMS.map(item => {
      let label = item.label;
      if (item.key === 'students') {
        label = isHod ? 'Faculty & Students Management' : 'Students Management';
      }

      const isActive = currentPath.endsWith(item.href) ||
        currentPath.endsWith(item.href.replace('.html', '')) ||
        currentPath.includes(item.key) ||
        (item.key === 'dashboard' && (currentPath === '/faculty/' || currentPath.endsWith('/faculty') || currentPath.endsWith('/faculty/dashboard.html')));

      const activeCls = isActive ? ' active' : '';
      const svg = renderSvg(item.icon, 20);

      return `
        <a href="${item.href}" class="sidebar-nav-item${activeCls}" data-nav="${item.key}" data-tooltip="${label}" aria-label="${label}" onclick="if(window.innerWidth<=768)closeSidebar()">
          <span class="sidebar-nav-icon">${svg}</span>
          <span class="sidebar-nav-short-label">${item.shortLabel}</span>
          <span class="sidebar-nav-label">${label}</span>
        </a>
      `;
    }).join('');

    // 2. Mount Sidebar into DOM
    let sb = getSidebar();
    if (sb) {
      sb.querySelectorAll('.sidebar-rail-toggle-item, .sidebar-expanded-footer, .sidebar-rail-footer').forEach(el => el.remove());
      const body = sb.querySelector('.sidebar-nav-body');
      if (body) body.innerHTML = navItemsHtml;
    } else {
      const sbHtml = `
        <aside id="faculty-sidebar" class="faculty-sidebar" aria-label="Faculty Navigation">
          <nav class="sidebar-nav-body" aria-label="Faculty Navigation Links">
            ${navItemsHtml}
          </nav>
        </aside>
      `;
      const layout = document.getElementById('faculty-app-layout') || document.querySelector('.faculty-main-wrap') || document.body;
      layout.insertAdjacentHTML('afterbegin', sbHtml);
    }

    // 3. Ensure Backdrop Overlay Exists
    if (!getBackdrop()) {
      const bd = document.createElement('div');
      bd.id = 'faculty-sidebar-backdrop';
      bd.className = 'sidebar-backdrop faculty-sidebar-backdrop';
      bd.onclick = handleBackdropClick;
      document.body.appendChild(bd);
    }

    // 4. Mount Mobile Bottom Bar (<= 768px)
    const isClassroom = currentPath.includes('group-detail') || Boolean(document.getElementById('classroom-mobile-bottom-nav'));
    if (!isClassroom && !document.querySelector('.mobile-bottom-nav')) {
      const tabs = isHod ? [
        { key: 'classes', label: 'Classes', href: '/faculty/classes/index.html', icon: 'classes' },
        { key: 'attendance', label: 'Attendance', href: '/faculty/registers/index.html', icon: 'registers' },
        { key: 'students', label: 'Students', href: '/faculty/students/index.html', icon: 'students' },
        { key: 'reports', label: 'Reports', href: '/faculty/reports/index.html', icon: 'reports' },
        { key: 'settings', label: 'Settings', href: '/faculty/profile/index.html', icon: 'settings' }
      ] : FACULTY_MOBILE_TABS;

      const tabsHtml = tabs.map(tab => {
        let isActive = false;
        if (tab.key === 'classes') isActive = currentPath.includes('/faculty/classes') || currentPath.includes('/faculty/groups');
        else if (tab.key === 'attendance') isActive = currentPath.includes('/faculty/registers');
        else if (tab.key === 'students') isActive = currentPath.includes('/faculty/students');
        else if (tab.key === 'reports') isActive = currentPath.includes('/faculty/reports');
        else if (tab.key === 'settings') isActive = currentPath.includes('/faculty/profile');
        else if (tab.key === 'home') isActive = currentPath === '/faculty' || currentPath.includes('/faculty/dashboard');

        const activeCls = isActive ? ' active' : '';
        const svg = renderSvg(tab.icon, 20);

        return `
          <a href="${tab.href}" class="mobile-nav-item${activeCls}" data-tab="${tab.key}" aria-label="${tab.label}">
            <span class="mobile-nav-icon">${svg}</span>
            <span class="mobile-nav-label">${tab.label}</span>
          </a>
        `;
      }).join('');

      document.body.insertAdjacentHTML('beforeend', `
        <nav class="mobile-bottom-nav faculty-mobile-bottom-nav" aria-label="Faculty Mobile Navigation">
          <div class="mobile-bottom-nav-inner">${tabsHtml}</div>
        </nav>
      `);
    }

    // Clean stray footers or toggles
    document.querySelectorAll('.sidebar-rail-toggle-item, .sidebar-expanded-footer, .sidebar-rail-footer').forEach(el => el.remove());
  }

  // ── Keyboard Shortcuts (Ctrl+B / Esc) ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      toggleSidebar();
    }
  });

  // Global Exports
  window.toggleSidebar = toggleSidebar;
  window.toggleDesktopSidebar = toggleDesktopSidebar;
  window.closeSidebar = closeSidebar;
  window.handleBackdropClick = handleBackdropClick;
  window.mountFacultySidebar = mountFacultyNavigation;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountFacultyNavigation);
  } else {
    mountFacultyNavigation();
  }
})();
