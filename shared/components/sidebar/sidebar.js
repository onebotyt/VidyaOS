/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS UNIFIED DUAL-STATE NAVIGATION ENGINE (sidebar.js)
 * Location: /shared/components/sidebar/sidebar.js
 * 
 * Declarative, React-like Component in Pure Vanilla JS:
 * - VidyaSidebar.mount({ role, activeKey })
 * - VidyaSidebar.toggle() / VidyaSidebar.open() / VidyaSidebar.close()
 * - VidyaSidebar.toggleDesktop() / VidyaSidebar.updateToggleIcon(isOpen)
 * 
 * Multi-Platform & Role Aware:
 * - Admin, Faculty, and Student registry support
 * - Desktop 72px persistent mini-rail & 260px flyout overlay drawer
 * - Zero Desktop Layout Shift (content stays at margin-left: 72px)
 * - Mobile off-canvas drawer & 5-tab touch bottom dock
 * - Student dynamic enrolled classes auto-load
 * - Keyboard shortcuts: Ctrl+B (Toggle), Escape (Close)
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // Navigation Registries
  const NAV_REGISTRY = {
    admin: [
      { key: 'dashboard', label: 'Dashboard', shortLabel: 'Overview', href: '/admin/dashboard/index.html', icon: 'dashboard' },
      { key: 'academics', label: 'Academic Structure', shortLabel: 'Structure', href: '/admin/academic-structure/index.html', icon: 'academicStructure' },
      { key: 'faculty', label: 'Faculty Management', shortLabel: 'Faculty', href: '/admin/faculty-management/index.html', icon: 'hodManagement' },
      { key: 'settings', label: 'System Settings', shortLabel: 'Settings', href: '/admin/settings/index.html', icon: 'settings' },
      { key: 'audit', label: 'Audit Logs', shortLabel: 'Audit', href: '/admin/audit-logs/index.html', icon: 'audit' },
      { key: 'bug-reports', label: 'Bug Reports / Complaints', shortLabel: 'Bugs', href: '/admin/bug-reports/index.html', icon: 'bugReports' }
    ],
    faculty: [
      { key: 'dashboard', label: 'Dashboard', shortLabel: 'Home', href: '/faculty/dashboard/index.html', icon: 'home' },
      { key: 'classes', label: 'Classroom', shortLabel: 'Classes', href: '/faculty/classes/index.html', icon: 'classes' },
      { key: 'records', label: 'Student Records', shortLabel: 'Records', href: '/faculty/student-records/index.html', icon: 'registers' },
      { key: 'sheets', label: 'Sheet Studio', shortLabel: 'Sheets', href: '/faculty/sheets/index.html', icon: 'sheets' },
      { key: 'leaves', label: 'Leave Request', shortLabel: 'Leave', href: '/faculty/leave-approvals/index.html', icon: 'leaves' },
      { key: 'students', label: 'Students Management', shortLabel: 'Students', href: '/faculty/students/index.html', icon: 'students' },
      { key: 'faculty', label: 'Faculty Management', shortLabel: 'Faculty', href: '/faculty/faculty/index.html', icon: 'faculty', hodOnly: true },
      { key: 'esp32', label: 'ESP32 Biometric Terminals', shortLabel: 'ESP32', href: '/faculty/esp32-devices/index.html', icon: 'settings' },
      { key: 'timetable', label: 'Timetable', shortLabel: 'Timetable', href: '/faculty/timetable/index.html', icon: 'timetable' },
      { key: 'drive', label: 'Faculty Drive', shortLabel: 'Drive', href: '/faculty/media/index.html', icon: 'drive' },
      { key: 'settings', label: 'Faculty Settings', shortLabel: 'Settings', href: '/faculty/settings/index.html', icon: 'settings' },
      { key: 'bug-reports', label: 'Report a Bug', shortLabel: 'Bug Report', href: '/faculty/bug-reports/index.html', icon: 'bugReports' }
    ],
    student: [
      { key: 'home', label: 'Home Dashboard', shortLabel: 'Home', href: '/student/home/index.html', icon: 'home' },
      { key: 'classes', label: 'Classes Hub', shortLabel: 'Classes', href: '/student/dashboard/index.html', icon: 'classes' },
      { key: 'attendance', label: 'My Attendance', shortLabel: 'Attend', href: '/student/attendance/index.html', icon: 'attendance' },
      { key: 'timetable', label: 'Weekly Timetable', shortLabel: 'Schedule', href: '/student/timetable/index.html', icon: 'timetable' },
      { key: 'assignments', label: 'Coursework & Tasks', shortLabel: 'Tasks', href: '/student/assignments/index.html', icon: 'assignments' },
      { key: 'scores', label: 'Marks & Scores', shortLabel: 'Scores', href: '/student/scores/index.html', icon: 'scores' },
      { key: 'leave', label: 'Leave Applications', shortLabel: 'Leave', href: '/student/leave/index.html', icon: 'leave' },
      { key: 'profile', label: 'Profile & Dossier', shortLabel: 'Profile', href: '/student/profile/index.html', icon: 'profile' },
      { key: 'settings', label: 'Settings & Account', shortLabel: 'Settings', href: '/student/settings/index.html', icon: 'settings' },
      { key: 'bug-reports', label: 'Report a Bug', shortLabel: 'Bug Report', href: '/student/bug-reports/index.html', icon: 'bugReports' }
    ]
  };

  // Mobile Bottom Tabs
  const MOBILE_TABS = {
    admin: [
      { key: 'dashboard', label: 'Home', href: '/admin/dashboard/index.html', icon: 'home' },
      { key: 'academics', label: 'Structure', href: '/admin/academic-structure/index.html', icon: 'academicStructure' },
      { key: 'faculty', label: 'Faculty', href: '/admin/faculty-management/index.html', icon: 'hodManagement' },
      { key: 'audit', label: 'Audit', href: '/admin/audit-logs/index.html', icon: 'audit' },
      { key: 'settings', label: 'Settings', href: '/admin/settings/index.html', icon: 'settings' }
    ],
    faculty: [
      { key: 'dashboard', label: 'Home', href: '/faculty/dashboard/index.html', icon: 'home' },
      { key: 'classes', label: 'Classes', href: '/faculty/classes/index.html', icon: 'classes' },
      { key: 'records', label: 'Records', href: '/faculty/student-records/index.html', icon: 'registers' },
      { key: 'students', label: 'Students', href: '/faculty/students/index.html', icon: 'students' },
      { key: 'settings', label: 'Settings', href: '/faculty/settings/index.html', icon: 'settings' }
    ],
    student: [
      { key: 'home', label: 'Home', href: '/student/home/index.html', icon: 'home' },
      { key: 'classes', label: 'Classes', href: '/student/dashboard/index.html', icon: 'classes' },
      { key: 'assignments', label: 'Tasks', href: '/student/assignments/index.html', icon: 'assignments' },
      { key: 'settings', label: 'Settings', href: '/student/settings/index.html', icon: 'settings' }
    ]
  };

  /**
   * Helper: Get current role based on URL path or explicit parameter
   */
  function detectRole(explicitRole) {
    if (explicitRole) return explicitRole.toLowerCase();
    const p = (window.location.pathname || '').toLowerCase();
    if (p.includes('/admin/')) return 'admin';
    if (p.includes('/faculty/')) return 'faculty';
    if (p.includes('/student/')) return 'student';
    return 'admin';
  }

  /**
   * Helper: Retrieve SVG markup from unified icons registry
   */
  function getIcon(name, opts = {}) {
    if (window.VidyaIcons && typeof window.VidyaIcons.get === 'function') {
      return window.VidyaIcons.get(name, opts);
    }
    if (typeof window.getAdminIcon === 'function') return window.getAdminIcon(name, opts);
    if (typeof window.getFacultyIcon === 'function') return window.getFacultyIcon(name, opts);
    if (typeof window.getStudentIcon === 'function') return window.getStudentIcon(name, opts);
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"></circle></svg>`;
  }

  /**
   * Helper: Get active sidebar DOM element
   */
  function getSidebar() {
    return document.getElementById('vidya-sidebar') ||
      document.getElementById('vidya-admin-sidebar') ||
      document.getElementById('app-sidebar') ||
      document.getElementById('faculty-sidebar') ||
      document.getElementById('student-rail');
  }

  function getBackdrop() {
    return document.getElementById('vidya-sidebar-backdrop') ||
      document.getElementById('sidebar-backdrop') ||
      document.getElementById('faculty-sidebar-backdrop') ||
      document.getElementById('student-drawer-backdrop');
  }

  /**
   * Update Hamburger / Close Icon on buttons
   */
  function updateNavToggleIcon(isOpen) {
    const btns = document.querySelectorAll('#admin-mobile-nav-toggle, #faculty-nav-toggle, #btn-menu-toggle, .header-nav-toggle-btn');
    const hamburgerSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    const closeSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    btns.forEach(btn => {
      btn.innerHTML = isOpen ? closeSvg : hamburgerSvg;
      btn.title = isOpen ? 'Close Menu' : 'Open Menu';
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen) btn.classList.add('is-open');
      else btn.classList.remove('is-open');
    });
  }

  /**
   * Desktop 72px Rail <-> 260px Flyout Drawer Toggle
   */
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
      document.documentElement.classList.add('sidebar-collapsed');
      document.body.classList.add('sidebar-collapsed');
      updateNavToggleIcon(false);
    } else {
      sb.classList.add('desktop-open');
      if (bd) bd.classList.add('active', 'open');
      document.documentElement.classList.remove('sidebar-collapsed');
      document.body.classList.remove('sidebar-collapsed');
      updateNavToggleIcon(true);
    }
  }

  /**
   * Mobile Drawer Toggle
   */
  function toggleSidebar() {
    if (window.innerWidth >= 769) {
      toggleDesktopSidebar();
      return;
    }
    const sb = getSidebar();
    if (!sb) return;
    const isOpen = sb.classList.contains('open') || sb.classList.contains('sidebar-open');
    if (isOpen) closeSidebar();
    else openSidebar();
  }

  function openSidebar() {
    const sb = getSidebar();
    const bd = getBackdrop();
    if (sb) sb.classList.add('open', 'sidebar-open');
    if (bd) bd.classList.add('active', 'open');
    if (window.innerWidth <= 768) document.body.style.overflow = 'hidden';
    updateNavToggleIcon(true);
  }

  function closeSidebar() {
    const sb = getSidebar();
    const bd = getBackdrop();
    if (sb) sb.classList.remove('open', 'sidebar-open', 'desktop-open');
    if (bd) bd.classList.remove('active', 'open');
    document.body.style.overflow = '';
    updateNavToggleIcon(false);
  }

  function unmountSidebar() {
    const sb = document.getElementById('vidya-sidebar');
    if (sb) sb.remove();
    const bd = document.getElementById('vidya-sidebar-backdrop');
    if (bd) bd.remove();
    const mb = document.querySelector('.vidya-mobile-bottom-bar');
    if (mb) mb.remove();
    document.documentElement.classList.remove('sidebar-collapsed');
    document.body.classList.remove('sidebar-collapsed');
  }

  /**
   * Declarative Mount Function (React-like component mount)
   */
  function mountSidebar(props = {}) {
    if (typeof document === 'undefined') return;
    if (props.forceRemount) unmountSidebar();
    if (document.getElementById('vidya-sidebar')) return;

    const role = detectRole(props.role);
    const navItems = props.items || NAV_REGISTRY[role] || NAV_REGISTRY.admin;
    const mobileTabs = props.mobileTabs || MOBILE_TABS[role] || MOBILE_TABS.admin;
    const currentPath = (window.location.hash || window.location.pathname || '').toLowerCase();

    // Check for user roles (e.g. HOD check for faculty)
    let isHod = false;
    try {
      const u = JSON.parse(localStorage.getItem('user') || localStorage.getItem('auth_user') || '{}');
      isHod = Boolean(u && ((Array.isArray(u.roles) && u.roles.includes('HOD')) || u.role === 'HOD' || u.is_hod));
    } catch (_) {}

    // Filter items
    const visibleItems = navItems.filter(item => !item.hodOnly || isHod);

    // Build Nav Items HTML
    const navHtml = visibleItems.map(item => {
      let isActive = false;
      if (props.activeKey) {
        isActive = item.key === props.activeKey;
      } else {
        isActive = currentPath.endsWith(item.href) ||
          currentPath.endsWith(item.href.replace('.html', '')) ||
          currentPath.includes(`/${item.key}/`) ||
          (item.key === 'dashboard' && (currentPath.endsWith('/dashboard') || currentPath.endsWith('/dashboard/index.html') || currentPath.endsWith(`/${role}/`)));
      }

      const activeCls = isActive ? ' active' : '';
      const svg = getIcon(item.icon, { width: 20, height: 20 });

      return `
        <a href="${item.href}" class="sidebar-nav-item${activeCls}" data-nav="${item.key}" title="${item.label}" aria-label="${item.label}" onclick="if(window.innerWidth<=768)VidyaSidebar.close()">
          <span class="sidebar-nav-icon">${svg}</span>
          <span class="sidebar-nav-short-label">${item.shortLabel}</span>
          <span class="sidebar-nav-label">${item.label}</span>
        </a>
      `;
    }).join('');

    // Optional Enrolled Classes for Student Drawer
    const studentClassesHtml = role === 'student' ? `
      <div class="sidebar-student-classes" style="padding:0.75rem 0.5rem 0.25rem;">
        <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.4rem;padding-left:0.5rem;">My Classes</div>
        <div id="drawer-classes-list"><div style="font-size:0.75rem;color:var(--text-muted);padding:0.4rem 0.5rem;">Loading...</div></div>
      </div>
    ` : '';

    // Shell HTML
    const sidebarHtml = `
      <!-- Backdrop Overlay -->
      <div id="vidya-sidebar-backdrop" onclick="VidyaSidebar.close()"></div>

      <!-- Dual-State Sidebar -->
      <aside id="vidya-sidebar" class="${role}-sidebar" aria-label="Main Navigation">
        <div class="sidebar-nav-body">
          ${navHtml}
          ${studentClassesHtml}
        </div>
        <div class="sidebar-footer">
          <button type="button" class="sidebar-expand-btn" onclick="VidyaSidebar.toggleDesktop()" title="Expand / Collapse Sidebar (Ctrl+B)" aria-label="Toggle Navigation Rail">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </aside>
    `;

    // Mobile Bottom Dock HTML
    const bottomTabsHtml = mobileTabs.map(tab => {
      const isActive = currentPath.endsWith(tab.href) || currentPath.endsWith(tab.href.replace('.html', ''));
      const activeCls = isActive ? ' active' : '';
      const svg = getIcon(tab.icon, { width: 20, height: 20 });
      return `
        <a href="${tab.href}" class="vidya-bottom-tab-item${activeCls}" data-tab="${tab.key}">
          <span class="vidya-bottom-tab-icon">${svg}</span>
          <span>${tab.label}</span>
        </a>
      `;
    }).join('');

    const bottomDockHtml = `
      <nav class="vidya-mobile-bottom-bar" aria-label="Mobile Bottom Navigation">
        ${bottomTabsHtml}
      </nav>
    `;

    document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
    document.body.insertAdjacentHTML('beforeend', bottomDockHtml);

    // Initial desktop state: collapsed 72px rail
    if (window.innerWidth >= 769) {
      document.documentElement.classList.add('sidebar-collapsed');
      document.body.classList.add('sidebar-collapsed');
    }

    // Keyboard bindings
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSidebar();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleDesktopSidebar();
      }
    });

    // Auto-load student classes if student
    if (role === 'student') loadStudentClasses();
  }

  async function loadStudentClasses() {
    const container = document.getElementById('drawer-classes-list');
    if (!container || typeof fetchApi !== 'function') return;
    try {
      const res = await fetchApi('/teaching-groups/student/my-groups', { suppressToast: true }).catch(() => null);
      const groups = res?.data || [];
      if (!groups.length) {
        container.innerHTML = '<div style="font-size:0.75rem;color:var(--text-muted);padding:0.4rem 0.5rem;">No enrolled classes.</div>';
        return;
      }
      container.innerHTML = groups.map(g => `
        <a href="/student/group-detail/index.html?id=${g.id}" class="sidebar-nav-item" style="height:36px;min-height:36px;font-size:0.8rem;padding-left:0.5rem;" title="${g.name}">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--color-primary);margin-right:8px;flex-shrink:0;"></span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${g.name}</span>
        </a>
      `).join('');
    } catch (_) {}
  }

  // Unified Component Export
  const VidyaSidebar = {
    mount: mountSidebar,
    unmount: unmountSidebar,
    toggle: toggleSidebar,
    open: openSidebar,
    close: closeSidebar,
    toggleDesktop: toggleDesktopSidebar,
    updateToggleIcon: updateNavToggleIcon
  };

  window.VidyaSidebar = VidyaSidebar;

  // Backward compatibility globals
  window.toggleSidebar = toggleSidebar;
  window.closeSidebar = closeSidebar;
  window.openSidebar = openSidebar;
  window.toggleDesktopSidebar = toggleDesktopSidebar;
  window.updateNavToggleIcon = updateNavToggleIcon;

  // Auto-mount on DOM ready if not manually mounted
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountSidebar());
  } else {
    mountSidebar();
  }

})();
