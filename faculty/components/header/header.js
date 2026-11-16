/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY TOP HEADER ENGINE (header.js)
 * Optimized & Streamlined (Zero Redundancy, 100% Theme Tokenized)
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  function getUser() {
    if (typeof window.getCurrentUser === 'function') return window.getCurrentUser();
    try {
      const stored = localStorage.getItem('user') || localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  }

  // ── 1. Synchronize Live User Identity & Avatar ──
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

    // Update avatar initials and text across all mounts
    document.querySelectorAll('#header-user-initials, #gc-user-avatar, #popover-avatar, #dropdown-avatar-circle').forEach(el => {
      el.textContent = initial;
    });

    document.querySelectorAll('#dropdown-full-name, #popover-user-name').forEach(el => el.textContent = name);
    document.querySelectorAll('#dropdown-email, #popover-user-email').forEach(el => el.textContent = email);
    document.querySelectorAll('#dropdown-role-pill').forEach(el => {
      el.textContent = isHod ? 'Head of Department' : 'Faculty Member';
    });

    // Brand link destination
    const brandLink = document.getElementById('header-brand-link');
    if (brandLink) {
      brandLink.href = (window.innerWidth <= 768 && isHod) ? '/faculty/classes/index.html' : '/faculty/dashboard/index.html';
    }

    // Custom avatar image if uploaded
    try {
      const customAvatar = localStorage.getItem('vidya_faculty_avatar') || localStorage.getItem('vidya_admin_avatar');
      const profileBtn = document.getElementById('header-user-profile') || document.querySelector('.header-profile-round-btn');
      if (profileBtn && customAvatar) {
        profileBtn.innerHTML = `
          <img src="${customAvatar}" alt="${name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">
          <span class="avatar-online-dot"></span>
        `;
      }
    } catch (_) { }

    // Guarantee expand toggle button exists before logo in header-left
    const headerLeft = document.querySelector('.faculty-top-header .header-left, .admin-top-header .header-left');
    if (headerLeft && !headerLeft.querySelector('#faculty-nav-toggle')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'header-nav-toggle-btn';
      btn.id = 'faculty-nav-toggle';
      btn.title = 'Toggle Navigation Menu';
      btn.setAttribute('aria-label', 'Toggle Navigation Menu');
      btn.onclick = () => {
        if (window.innerWidth >= 769 && typeof toggleDesktopSidebar === 'function') {
          toggleDesktopSidebar();
        } else if (typeof toggleSidebar === 'function') {
          toggleSidebar();
        }
      };
      btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
      headerLeft.prepend(btn);
    }
  }

  // ── 2. Theme Toggle (Light / Dark) ──
  function toggleAppTheme() {
    const root = document.documentElement;
    const next = (root.getAttribute('data-theme') || 'light') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
      localStorage.setItem('vidya_theme', next);
    } catch (_) { }
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    const isDark = theme === 'dark';
    document.querySelectorAll('.icon-theme').forEach(svg => {
      svg.innerHTML = isDark
        ? '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    });
  }

  // ── 3. Dropdown Toggles ──
  function toggleUserProfile(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('header-profile-dropdown') || document.querySelector('.user-profile-popover');
    if (!menu) return;
    const isShown = menu.classList.contains('show');
    closeAllPopovers();
    if (!isShown) menu.classList.add('show');
  }

  function toggleNotifications(e) {
    if (e) e.stopPropagation();
    const notif = document.getElementById('header-notifications-dropdown');
    if (!notif) return;
    const isShown = notif.classList.contains('show');
    closeAllPopovers();
    if (!isShown) notif.classList.add('show');
  }

  function toggleAppsLauncher(e) {
    if (e) e.stopPropagation();
    const launcher = document.getElementById('apps-launcher-dropdown');
    if (!launcher) return;
    const isShown = launcher.style.display === 'block';
    closeAllPopovers();
    launcher.style.display = isShown ? 'none' : 'block';
  }

  function closeAllPopovers() {
    document.querySelectorAll('.header-profile-dropdown, .user-profile-popover, .header-notifications-dropdown').forEach(el => el.classList.remove('show', 'open'));
    const launcher = document.getElementById('apps-launcher-dropdown');
    if (launcher) launcher.style.display = 'none';
  }

  // ── 4. Mount Top Header ──
  function mountFacultyHeader() {
    if (typeof document === 'undefined') return;

    const existing = document.getElementById('faculty-header') || document.querySelector('.faculty-top-header, .admin-top-header');
    if (existing) {
      syncFacultyHeader();
      return;
    }

    const user = getUser();
    const isHod = Boolean(user && (
      (Array.isArray(user.roles) && user.roles.includes('HOD')) ||
      user.role === 'HOD' ||
      user.is_hod === true ||
      user.is_hod === 1
    ));
    const homeHref = (isHod && window.innerWidth <= 768) ? '/faculty/classes/index.html' : '/faculty/dashboard/index.html';

    const headerHtml = `
      <header class="faculty-top-header admin-top-header" id="faculty-header" aria-label="Faculty Header Bar">
        <div class="header-left">
          <button type="button" class="header-nav-toggle-btn" id="faculty-nav-toggle" onclick="if(window.innerWidth>=769&&typeof toggleDesktopSidebar==='function'){toggleDesktopSidebar();}else if(typeof toggleSidebar==='function'){toggleSidebar();}" aria-label="Toggle Navigation Menu" title="Toggle Navigation Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <a href="${homeHref}" class="header-brand-link" id="header-brand-link" aria-label="VidyaOS Dashboard">
            <span class="header-brand-logo">
              <svg class="header-brand-cube" width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M16 3.5L27.5 9.8L16 16.2L4.5 9.8L16 3.5Z" fill="var(--color-primary-light, hsl(215 90% 95%))" stroke="var(--color-primary)" stroke-width="1.2" stroke-linejoin="round"/>
                <path d="M4.5 9.8L16 16.2V28.5L4.5 22.2V9.8Z" fill="var(--color-primary, hsl(217 91% 60%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/>
                <path d="M16 16.2L27.5 9.8V22.2L16 28.5V16.2Z" fill="var(--color-primary-hover, hsl(224 76% 48%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/>
              </svg>
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

          <!-- Notification Bell -->
          <button type="button" class="header-icon-btn header-bell-btn" id="header-bell-btn" onclick="toggleNotifications(event)" title="Notifications" aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span class="header-bell-badge" id="header-bell-count">3</span>
          </button>

          <!-- Notifications Dropdown -->
          <div class="header-notifications-dropdown" id="header-notifications-dropdown">
            <div class="notif-dropdown-header">
              <span class="notif-header-title">Notifications</span>
              <span class="notif-header-badge">3 New</span>
            </div>
            <div class="notif-items-list">
              <div class="notif-item">
                <div class="notif-item-body">
                  <div class="notif-item-title">Attendance Matrix Synchronized</div>
                  <div class="notif-item-sub">ESP32 terminal batch logged 42 scans</div>
                </div>
              </div>
            </div>
          </div>

          <!-- User Profile Avatar Trigger -->
          <button type="button" class="header-profile-round-btn gc-user-avatar" id="header-user-profile" onclick="toggleUserProfile(event)" title="Account Profile" aria-label="Account Profile">
            <span class="user-avatar-initials" id="header-user-initials">RS</span>
            <span class="avatar-online-dot"></span>
          </button>

          <!-- Profile Dropdown Popover -->
          <div class="header-profile-dropdown" id="header-profile-dropdown">
            <div class="profile-dropdown-user-card">
              <div class="dropdown-avatar-circle" id="dropdown-avatar-circle">RS</div>
              <div class="dropdown-user-meta">
                <div class="dropdown-full-name" id="dropdown-full-name">Faculty Member</div>
                <div class="dropdown-email" id="dropdown-email">faculty@college.edu</div>
                <span class="dropdown-role-pill" id="dropdown-role-pill">Faculty Member</span>
              </div>
            </div>
            <div class="profile-dropdown-divider"></div>
            <a href="/faculty/profile/index.html" class="profile-dropdown-item">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>My Profile</span>
            </a>
            <a href="/faculty/timetable/index.html" class="profile-dropdown-item">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>Weekly Timetable</span>
            </a>
            <div class="profile-dropdown-divider"></div>
            <button type="button" class="profile-dropdown-item dropdown-logout-btn" onclick="if(typeof confirmFacultyLogout==='function'){confirmFacultyLogout();}else if(typeof facultyLogout==='function'){facultyLogout();}else if(typeof logout==='function'){logout();}">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>
    `;

    const layout = document.getElementById('faculty-app-layout') || document.body;
    layout.insertAdjacentHTML('afterbegin', headerHtml);
    syncFacultyHeader();
  }

  // Global listeners
  document.addEventListener('click', (e) => {
    const profMenu = document.getElementById('header-profile-dropdown');
    const profBtn = document.getElementById('header-user-profile');
    const notifMenu = document.getElementById('header-notifications-dropdown');
    const notifBtn = document.getElementById('header-bell-btn');

    if (profMenu && profMenu.classList.contains('show')) {
      if (!profMenu.contains(e.target) && (!profBtn || !profBtn.contains(e.target))) {
        profMenu.classList.remove('show');
      }
    }
    if (notifMenu && notifMenu.classList.contains('show')) {
      if (!notifMenu.contains(e.target) && (!notifBtn || !notifBtn.contains(e.target))) {
        notifMenu.classList.remove('show');
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllPopovers();
  });

  window.toggleAppTheme = toggleAppTheme;
  window.toggleUserProfile = toggleUserProfile;
  window.toggleNotifications = toggleNotifications;
  window.toggleAppsLauncher = toggleAppsLauncher;
  window.syncFacultyHeader = syncFacultyHeader;
  window.mountFacultyHeader = mountFacultyHeader;

  const currentTheme = localStorage.getItem('theme') || localStorage.getItem('vidya_theme') || 'light';
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mountFacultyHeader();
      updateThemeIcon(currentTheme);
    });
  } else {
    mountFacultyHeader();
    updateThemeIcon(currentTheme);
  }
})();
