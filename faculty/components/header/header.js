/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY TOP HEADER ENGINE (header.js)
 * Location: /frontend/faculty/components/header/header.js
 * 
 * - Handles top header mounting and hydration inside .faculty-main-wrap
 * - Upgraded to match Admin Header: Right-aligned minimal toolbar,
 *   smooth theme toggle, and interactive round profile avatar
 * - Hover bridge + 220ms exit timer + click toggle + Esc dismissal
 * - Live user profile initials, name, email, and photo sync
 * - Light/Dark theme switching with persistent localStorage
 * - Apps Launcher popover & User profile dropdown management
 * - 100% self-contained inside /frontend/faculty/components/
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  let hoverTimer = null;

  function getIcon(name, options = {}) {
    if (typeof window.getFacultyIcon === 'function') {
      return window.getFacultyIcon(name, options);
    }
    if (window.FACULTY_ICONS && typeof window.FACULTY_ICONS[name] === 'function') {
      const w = options.width || options.w || 20;
      const h = options.height || options.h || w;
      const s = options.stroke || options.strokeWidth || 1.8;
      const c = options.className || options.cls || '';
      return window.FACULTY_ICONS[name](w, h, s, c);
    }
    return '';
  }

  const APPS = [
    { label: 'Classes', href: '/faculty/dashboard.html', icon: 'classes' },
    { label: 'Registers', href: '/faculty/registers.html', icon: 'registers' },
    { label: 'Coursework', href: '/faculty/registers.html?tab=assignments', icon: 'coursework' },
    { label: 'Marksheets', href: '/faculty/registers.html?tab=marks', icon: 'marks' },
    { label: 'Sheets Studio', href: '/faculty/sheets.html', icon: 'sheets' },
    { label: 'Reports', href: '/faculty/reports.html', icon: 'reports' },
    { label: 'Students', href: '/faculty/students.html', icon: 'students' },
    { label: 'Timetable', href: '/faculty/timetable.html', icon: 'timetable' },
    { label: 'Leaves', href: '/faculty/leave-approvals.html', icon: 'leaves' },
    { label: 'Drive', href: '/faculty/media.html', icon: 'drive' },
    { label: 'HOD Hub', href: '/faculty/students.html', icon: 'hodHub', hodOnly: true }
  ];

  function renderAppsLauncherTiles(container, isHod) {
    if (!container) return;
    const tilesHtml = APPS
      .filter(app => !app.hodOnly || isHod)
      .map(app => `
        <a href="${app.href}" class="app-tile ${app.hodOnly ? 'hod-only-tile' : ''}">
          <div class="app-tile-icon">${getIcon(app.icon, { width: 22, height: 22 })}</div>
          <span>${app.label}</span>
        </a>
      `).join('');
    container.innerHTML = tilesHtml;
  }

  /**
   * 1. Synchronize Live User Identity & Photo Avatar
   */
  function syncFacultyHeader() {
    let user = null;
    if (typeof window.getCurrentUser === 'function') {
      user = window.getCurrentUser();
    }
    if (!user) {
      try {
        const stored = localStorage.getItem('user') || localStorage.getItem('auth_user');
        if (stored) user = JSON.parse(stored);
      } catch (_) { }
    }

    const name = user?.full_name || user?.name || user?.username || 'Faculty Member';
    const email = user?.email || 'faculty@college.edu';
    const cleanName = name.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
    const parts = cleanName.split(/\s+/).filter(Boolean);
    const initial = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : (cleanName[0] || 'F').toUpperCase();

    const isHod = Boolean(user && (
      (Array.isArray(user.roles) && user.roles.includes('HOD')) ||
      user.role === 'HOD' ||
      user.is_hod === true ||
      user.is_hod === 1
    ));

    // Populate user initials
    document.querySelectorAll('#header-user-initials, #gc-user-avatar, #popover-avatar, #dropdown-avatar-circle').forEach(el => {
      el.textContent = initial;
    });

    // Populate user name and email
    const nameEls = document.querySelectorAll('#dropdown-full-name, #popover-user-name');
    nameEls.forEach(el => el.textContent = name);

    const emailEls = document.querySelectorAll('#dropdown-email, #popover-user-email');
    emailEls.forEach(el => el.textContent = email);

    // Role pill
    const rolePills = document.querySelectorAll('#dropdown-role-pill');
    rolePills.forEach(el => {
      el.textContent = isHod ? 'Head of Department' : 'Faculty Member';
    });

    // Check for custom uploaded avatar image in localStorage
    try {
      const customAvatar = localStorage.getItem('vidya_faculty_avatar') || localStorage.getItem('vidya_admin_avatar');
      const profileBtn = document.getElementById('header-user-profile');
      if (profileBtn) {
        if (customAvatar) {
          profileBtn.innerHTML = `
            <img src="${customAvatar}" alt="${name}" class="header-avatar-img" id="header-avatar-img" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">
            <span class="avatar-online-dot"></span>
          `;
        } else {
          profileBtn.innerHTML = `
            <span class="user-avatar-initials" id="header-user-initials">${initial}</span>
            <span class="avatar-online-dot"></span>
          `;
        }
      }

      // Also sync drawer avatar
      const drawerAvatar = document.getElementById('sidebar-drawer-avatar');
      if (drawerAvatar && customAvatar) {
        drawerAvatar.innerHTML = `<img src="${customAvatar}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      }
    } catch (_) { }

    // Populate apps launcher grid
    const launcher = document.getElementById('apps-launcher-dropdown');
    if (launcher) {
      renderAppsLauncherTiles(launcher, isHod);
    }
  }

  /**
   * 2. Toggle Theme (Light / Dark)
   */
  function toggleAppTheme() {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';

    root.setAttribute('data-theme', next);
    if (document.body) document.body.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
      localStorage.setItem('vidya_theme', next);
    } catch (_) { }

    // Update theme toggle icons
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    const isDark = theme === 'dark';
    document.querySelectorAll('.icon-theme').forEach(svg => {
      if (isDark) {
        svg.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
      } else {
        svg.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
      }
    });
  }

  /**
   * 3. Profile Popover Hover & Click Engine
   */
  function openProfileMenu() {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    const dropdown = document.getElementById('header-profile-dropdown') || document.getElementById('user-profile-popover');
    const trigger = document.getElementById('header-user-profile');
    if (dropdown) {
      dropdown.classList.add('show');
      dropdown.style.display = 'block';
      dropdown.setAttribute('aria-hidden', 'false');
    }
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'true');
    }
    // Close apps launcher if open
    const launcher = document.getElementById('apps-launcher-dropdown');
    if (launcher) launcher.style.display = 'none';
  }

  function closeProfileMenu() {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    const dropdown = document.getElementById('header-profile-dropdown') || document.getElementById('user-profile-popover');
    const trigger = document.getElementById('header-user-profile');
    if (dropdown) {
      dropdown.classList.remove('show');
      dropdown.style.display = 'none';
      dropdown.setAttribute('aria-hidden', 'true');
    }
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleUserProfile(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const dropdown = document.getElementById('header-profile-dropdown') || document.getElementById('user-profile-popover');
    const isVisible = dropdown && (dropdown.classList.contains('show') || dropdown.style.display === 'block');
    if (isVisible) {
      closeProfileMenu();
    } else {
      openProfileMenu();
    }
  }

  function setupProfileHover() {
    const trigger = document.getElementById('header-user-profile');
    const dropdown = document.getElementById('header-profile-dropdown') || document.getElementById('user-profile-popover');
    if (!trigger || !dropdown) return;

    function handleEnter() {
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
      openProfileMenu();
    }

    function handleLeave() {
      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        closeProfileMenu();
      }, 220); // 220ms grace exit timer
    }

    trigger.addEventListener('mouseenter', handleEnter);
    trigger.addEventListener('mouseleave', handleLeave);
    dropdown.addEventListener('mouseenter', handleEnter);
    dropdown.addEventListener('mouseleave', handleLeave);
  }

  /**
   * 4. Apps Launcher Dropdown Management
   */
  function toggleAppsLauncher(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const launcher = document.getElementById('apps-launcher-dropdown');
    closeProfileMenu();

    if (!launcher) return;
    const isVisible = launcher.style.display === 'grid' || launcher.style.display === 'block';
    if (isVisible) {
      launcher.style.display = 'none';
    } else {
      launcher.style.display = 'grid';
      const user = getUser();
      const isHod = Boolean(user && (
        (Array.isArray(user.roles) && user.roles.includes('HOD')) ||
        user.role === 'HOD' ||
        user.is_hod === true ||
        user.is_hod === 1
      ));
      renderAppsLauncherTiles(launcher, isHod);
    }
  }

  /**
   * 5. Outside Click and Escape Dismissal
   */
  document.addEventListener('click', (e) => {
    const profileDropdown = document.getElementById('header-profile-dropdown') || document.getElementById('user-profile-popover');
    const profileTrigger = document.getElementById('header-user-profile');
    const launcherDropdown = document.getElementById('apps-launcher-dropdown');
    const launcherTrigger = document.getElementById('btn-apps-launcher');

    if (profileDropdown && profileDropdown.classList.contains('show')) {
      if (!profileDropdown.contains(e.target) && (!profileTrigger || !profileTrigger.contains(e.target))) {
        closeProfileMenu();
      }
    }

    if (launcherDropdown && launcherDropdown.style.display !== 'none') {
      if (!launcherDropdown.contains(e.target) && (!launcherTrigger || !launcherTrigger.contains(e.target))) {
        launcherDropdown.style.display = 'none';
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProfileMenu();
      const launcher = document.getElementById('apps-launcher-dropdown');
      if (launcher) launcher.style.display = 'none';
    }
  });

  /**
   * 6. Mount or Hydrate Faculty Header
   */
  function mountFacultyHeader() {
    if (typeof document === 'undefined') return;

    const existing = document.getElementById('faculty-header') || document.getElementById('admin-top-header');
    if (existing) {
      syncFacultyHeader();
      setupProfileHover();
      return;
    }

    const mainWrap = document.querySelector('.faculty-main-wrap') || document.querySelector('.admin-main-wrap') || document.getElementById('faculty-app-layout') || document.body;
    if (!mainWrap) return;

    const headerHtml = `
      <header class="faculty-top-header admin-top-header" id="faculty-header" aria-label="Faculty Header Bar">
        <div class="header-left">
          <span class="header-dept-pill" id="dept-header-name" style="display:none;"></span>
        </div>
        <div class="header-right">
          <!-- Apps Launcher -->
          <button type="button" class="header-icon-btn" onclick="toggleAppsLauncher(event)" id="btn-apps-launcher" title="Academic Apps &amp; Modules" aria-label="Apps Launcher">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
            </svg>
          </button>

          <!-- Theme Toggle -->
          <button type="button" class="header-icon-btn header-theme-toggle" id="theme-toggle-btn" onclick="toggleAppTheme()" title="Toggle Dark/Light Mode" aria-label="Toggle Dark/Light Mode">
            <svg class="icon-theme" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>

          <!-- Round Profile Avatar -->
          <button type="button" class="header-profile-round-btn" id="header-user-profile" onclick="toggleUserProfile(event)" aria-haspopup="true" aria-expanded="false" title="Account Profile" aria-label="Open User Profile Menu">
            <span class="user-avatar-initials" id="header-user-initials">FA</span>
            <span class="avatar-online-dot"></span>
          </button>

          <!-- Apps Launcher Dropdown -->
          <div class="apps-launcher-dropdown" id="apps-launcher-dropdown" style="display:none;" role="menu"></div>

          <!-- Dropdown Profile Menu -->
          <div class="header-profile-dropdown" id="header-profile-dropdown" aria-hidden="true">
            <div class="profile-dropdown-user-card">
              <div class="dropdown-avatar-circle" id="dropdown-avatar-circle" aria-hidden="true">FA</div>
              <div class="dropdown-user-meta">
                <span class="dropdown-full-name" id="dropdown-full-name">Faculty Member</span>
                <span class="dropdown-email" id="dropdown-email">faculty@college.edu</span>
                <span class="dropdown-role-pill" id="dropdown-role-pill">Faculty Member</span>
              </div>
            </div>
            <div class="profile-dropdown-divider"></div>
            <a href="/faculty/profile.html" class="profile-dropdown-item">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>My Profile</span>
            </a>
            <a href="/faculty/timetable.html" class="profile-dropdown-item">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>Weekly Timetable</span>
            </a>
            <div class="profile-dropdown-divider"></div>
            <button type="button" class="profile-dropdown-item dropdown-logout-btn" onclick="logout()">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>
    `;

    mainWrap.insertAdjacentHTML('afterbegin', headerHtml);
    syncFacultyHeader();
    setupProfileHover();
  }

  // Export functions to window
  window.toggleAppTheme = toggleAppTheme;
  window.toggleDashboardTheme = toggleAppTheme;
  window.toggleUserProfile = toggleUserProfile;
  window.toggleAdminProfileMenu = toggleUserProfile;
  window.toggleAppsLauncher = toggleAppsLauncher;
  window.syncFacultyHeader = syncFacultyHeader;
  window.syncHeaderIdentity = syncFacultyHeader;
  window.mountFacultyHeader = mountFacultyHeader;

  function getStoredTheme() {
    try {
      return document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'light';
    } catch (_) {
      return document.documentElement.getAttribute('data-theme') || 'light';
    }
  }

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mountFacultyHeader();
      updateThemeIcon(getStoredTheme());
    });
  } else {
    mountFacultyHeader();
    updateThemeIcon(getStoredTheme());
  }
})();
