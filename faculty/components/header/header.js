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
    { label: 'HOD Hub', href: '/faculty/students/index.html', icon: 'hodHub', hodOnly: true },
    { label: 'ESP32 Biometrics', href: '/faculty/esp32-devices/index.html', icon: 'hodHub' }
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
   * Helper to retrieve active user
   */
  function getUser() {
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
    return user;
  }

  /**
   * 1. Synchronize Live User Identity & Photo Avatar
   */
  function syncFacultyHeader() {
    const user = getUser();

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

    const brandLink = document.getElementById('header-brand-link');
    if (brandLink) {
      if (window.innerWidth <= 768 && isHod) {
        brandLink.href = '/faculty/classes/index.html';
      } else {
        brandLink.href = '/faculty/dashboard/index.html';
      }
    }

    // Ensure header expand button exists before logo
    const headerLeft = document.querySelector('#faculty-header .header-left, .faculty-top-header .header-left, .admin-top-header .header-left');
    if (headerLeft && !headerLeft.querySelector('#faculty-nav-toggle')) {
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'header-mobile-toggle-btn header-nav-toggle-btn';
      toggleBtn.id = 'faculty-nav-toggle';
      toggleBtn.title = 'Toggle Navigation Menu';
      toggleBtn.setAttribute('aria-label', 'Toggle Navigation Menu');
      toggleBtn.onclick = function() {
        if (window.innerWidth >= 769 && typeof toggleDesktopSidebar === 'function') {
          toggleDesktopSidebar();
        } else if (typeof toggleSidebar === 'function') {
          toggleSidebar();
        }
      };
      toggleBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      `;
      headerLeft.prepend(toggleBtn);
    }

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
      dropdown.classList.add('show', 'open');
      dropdown.style.setProperty('display', 'flex', 'important');
      dropdown.style.setProperty('opacity', '1', 'important');
      dropdown.style.setProperty('visibility', 'visible', 'important');
      dropdown.setAttribute('aria-hidden', 'false');
    }
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'true');
    }
    // Close notifications and apps launcher if open
    const notifDesktop = document.getElementById('header-notifications-dropdown');
    if (notifDesktop) notifDesktop.style.display = 'none';
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
      dropdown.classList.remove('show', 'open');
      dropdown.style.setProperty('display', 'none', 'important');
      dropdown.setAttribute('aria-hidden', 'true');
    }
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleUserProfile(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    const dropdown = document.getElementById('header-profile-dropdown') || document.getElementById('user-profile-popover');
    if (!dropdown) return;
    const isVisible = dropdown.classList.contains('show') || dropdown.classList.contains('open') || dropdown.style.display === 'flex' || dropdown.style.display === 'block';
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

    // Only attach mouseenter/mouseleave hover listeners on Desktop devices
    // Touch devices (Android / iOS) trigger simulated mouseenter followed immediately by mouseleave on tap,
    // which was closing the profile menu instantly on mobile!
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }

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
   * 4b. Notifications Dropdown Toggle (Desktop & Mobile)
   */
  function toggleNotifications(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const isMobile = window.innerWidth <= 768;
    const notifDropdown = isMobile
      ? (document.getElementById('mobile-notifications-dropdown') || document.getElementById('header-notifications-dropdown'))
      : document.getElementById('header-notifications-dropdown');
    if (!notifDropdown) return;
    const isVisible = notifDropdown.style.display === 'flex' || notifDropdown.style.display === 'block' || notifDropdown.classList.contains('show');
    if (isVisible) {
      notifDropdown.style.display = 'none';
      notifDropdown.classList.remove('show');
      notifDropdown.setAttribute('aria-hidden', 'true');
    } else {
      closeProfileMenu();
      const launcher = document.getElementById('apps-launcher-dropdown');
      if (launcher) launcher.style.display = 'none';
      notifDropdown.style.display = isMobile ? 'block' : 'flex';
      notifDropdown.classList.add('show');
      notifDropdown.setAttribute('aria-hidden', 'false');
    }
  }

  function closeNotifications() {
    ['header-notifications-dropdown', 'mobile-notifications-dropdown'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = 'none';
        el.classList.remove('show');
        el.setAttribute('aria-hidden', 'true');
      }
    });
  }

  /**
   * 5. Outside Click and Escape Dismissal
   */
  document.addEventListener('click', (e) => {
    const profileDropdown = document.getElementById('header-profile-dropdown') || document.getElementById('user-profile-popover');
    const profileTrigger = document.getElementById('header-user-profile');
    const notifDesktop = document.getElementById('header-notifications-dropdown');
    const notifMobile = document.getElementById('mobile-notifications-dropdown');
    const bellBtn = document.getElementById('header-bell-btn') || document.getElementById('mobile-bell-btn');
    const launcherDropdown = document.getElementById('apps-launcher-dropdown');
    const launcherTrigger = document.getElementById('btn-apps-launcher');

    if (profileDropdown && profileDropdown.classList.contains('show')) {
      if (!profileDropdown.contains(e.target) && (!profileTrigger || !profileTrigger.contains(e.target))) {
        closeProfileMenu();
      }
    }

    if (notifDesktop && (notifDesktop.classList.contains('show') || notifDesktop.style.display === 'flex')) {
      if (!notifDesktop.contains(e.target) && (!bellBtn || !bellBtn.contains(e.target))) {
        closeNotifications();
      }
    }

    if (notifMobile && (notifMobile.classList.contains('show') || notifMobile.style.display === 'block')) {
      if (!notifMobile.contains(e.target) && (!bellBtn || !bellBtn.contains(e.target))) {
        closeNotifications();
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
      closeNotifications();
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

    const layout = document.getElementById('faculty-app-layout') || document.getElementById('admin-app-layout') || document.body;
    if (!layout) return;

    // Clear old placeholder inside mainWrap if it exists so it takes zero space
    const oldMount = document.getElementById('faculty-header-mount');
    if (oldMount) {
      oldMount.style.display = 'none';
      oldMount.innerHTML = '';
    }

    // Clean duplicate mobile header elements
    document.querySelectorAll('.mobile-top-header, .faculty-mobile-top-header').forEach(el => el.remove());

    const user = getUser();
    const isHod = Boolean(user && (
      (Array.isArray(user.roles) && user.roles.includes('HOD')) ||
      user.role === 'HOD' ||
      user.is_hod === true ||
      user.is_hod === 1
    ));
    const isMobile = window.innerWidth <= 768;
    const homeHref = (isHod && isMobile) ? '/faculty/classes/index.html' : '/faculty/dashboard/index.html';
    const badgeText = isHod ? 'HOD Portal' : 'Faculty Portal';

    const headerHtml = `
      <header class="faculty-top-header admin-top-header" id="faculty-header" aria-label="Faculty Header Bar">
        <div class="header-left">
          <button type="button" class="header-mobile-toggle-btn header-nav-toggle-btn" id="faculty-nav-toggle" onclick="if(window.innerWidth>=769&&typeof toggleDesktopSidebar==='function'){toggleDesktopSidebar();}else if(typeof toggleSidebar==='function'){toggleSidebar();}" aria-label="Toggle Navigation Menu" title="Toggle Navigation Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <a href="${homeHref}" class="header-brand-link" id="header-brand-link" aria-label="VidyaOS Dashboard">
            <span class="header-brand-logo">
              <svg class="header-brand-cube" width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M16 3.5L27.5 9.8L16 16.2L4.5 9.8L16 3.5Z" fill="var(--color-primary-light, hsl(215 90% 95%))" stroke="var(--color-primary)" stroke-width="1.2" stroke-linejoin="round"/><path d="M4.5 9.8L16 16.2V28.5L4.5 22.2V9.8Z" fill="var(--color-primary, hsl(217 91% 60%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/><path d="M16 16.2L27.5 9.8V22.2L16 28.5V16.2Z" fill="var(--color-primary-hover, hsl(224 76% 48%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/><path d="M16 16.5V27.5" stroke="hsl(0 0% 100% / 0.4)" stroke-width="1.2" stroke-linecap="round"/><path d="M16.5 16L26.5 10.5" stroke="hsl(0 0% 100% / 0.3)" stroke-width="1.2" stroke-linecap="round"/></svg>
            </span>
            <div class="header-brand-info">
              <span class="header-brand-title">VidyaOS</span>
            </div>
          </a>
        </div>
        <div class="header-right">
          <!-- Theme Toggle -->
          <button type="button" class="header-icon-btn header-theme-toggle" id="theme-toggle-btn" onclick="toggleAppTheme()" title="Toggle Dark/Light Mode" aria-label="Toggle Dark/Light Mode">
            <svg class="icon-theme" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>

          <!-- Notification Bell Button with Red Badge (3) -->
          <button type="button" class="header-icon-btn header-bell-btn" id="header-bell-btn" onclick="if(typeof toggleNotifications==='function'){toggleNotifications(event);}else{alert('Academic Notifications: All institutional systems operating normally.');}" aria-label="Notifications" title="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span class="header-bell-badge" id="header-bell-badge-count">3</span>
          </button>

          <!-- Notifications Dropdown Menu -->
          <div class="header-notifications-dropdown" id="header-notifications-dropdown" aria-hidden="true" style="display:none;">
            <div class="notif-dropdown-header">
              <div class="notif-header-title">Notifications</div>
              <span class="notif-header-badge">3 New</span>
            </div>
            <div class="notif-items-list">
              <div class="notif-item unread">
                <div class="notif-icon-circle icon-blue">📋</div>
                <div class="notif-item-body">
                  <div class="notif-item-title">Mid-Term Marks Verification</div>
                  <div class="notif-item-sub">15 mins ago • IT Department</div>
                </div>
              </div>
              <div class="notif-item unread">
                <div class="notif-icon-circle icon-green">🏛️</div>
                <div class="notif-item-body">
                  <div class="notif-item-title">NBA Self-Assessment Report Due</div>
                  <div class="notif-item-sub">2 hours ago • Academic Cell</div>
                </div>
              </div>
              <div class="notif-item unread">
                <div class="notif-icon-circle icon-purple">👥</div>
                <div class="notif-item-body">
                  <div class="notif-item-title">Department Meeting Tomorrow 10 AM</div>
                  <div class="notif-item-sub">Today • HOD Office</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Round Profile Avatar -->
          <button type="button" class="header-profile-round-btn" id="header-user-profile" onclick="toggleUserProfile(event)" aria-haspopup="true" aria-expanded="false" title="Account Profile" aria-label="Open User Profile Menu">
            <span class="user-avatar-initials" id="header-user-initials">NM</span>
            <span class="avatar-online-dot"></span>
          </button>

          <!-- Dropdown Profile Menu -->
          <div class="header-profile-dropdown" id="header-profile-dropdown" aria-hidden="true">
            <div class="profile-dropdown-user-card">
              <div class="dropdown-avatar-circle" id="dropdown-avatar-circle" aria-hidden="true">NM</div>
              <div class="dropdown-user-meta">
                <span class="dropdown-full-name" id="dropdown-full-name">Faculty Member</span>
                <span class="dropdown-email" id="dropdown-email">faculty@college.edu</span>
                <span class="dropdown-role-pill" id="dropdown-role-pill">Faculty Member</span>
              </div>
            </div>
            <div class="profile-dropdown-divider"></div>
            <a href="/faculty/profile/index.html" class="profile-dropdown-item">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>My Profile</span>
            </a>
            <a href="/faculty/timetable/index.html" class="profile-dropdown-item">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>Weekly Timetable</span>
            </a>
            <div class="profile-dropdown-divider"></div>
            <button type="button" class="profile-dropdown-item dropdown-logout-btn" onclick="if(typeof confirmFacultyLogout==='function'){confirmFacultyLogout();}else if(typeof facultyLogout==='function'){facultyLogout();}else if(typeof logout==='function'){logout();}">
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

    layout.insertAdjacentHTML('afterbegin', headerHtml);
    syncFacultyHeader();
    setupProfileHover();
  }

  // Export functions to window
  window.toggleAppTheme = toggleAppTheme;
  window.toggleDashboardTheme = toggleAppTheme;
  window.toggleUserProfile = toggleUserProfile;
  window.toggleAdminProfileMenu = toggleUserProfile;
  window.toggleNotifications = toggleNotifications;
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
