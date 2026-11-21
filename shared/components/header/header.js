/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS UNIFIED TOP HEADER ENGINE (header.js)
 * Location: /shared/components/header/header.js
 * 
 * Declarative, React-like Component in Pure Vanilla JS:
 * - VidyaHeader.mount({ role, pageBadge })
 * - VidyaHeader.syncIdentity()
 * - VidyaHeader.toggleTheme()
 * - VidyaHeader.toggleProfile(event)
 * - VidyaHeader.toggleNotifications(event)
 * 
 * Features:
 * - Context badges: Administration / Faculty / Student
 * - Live user profile avatar, name, and email sync from localStorage
 * - Dark / Light theme toggle with persistence across sessions
 * - Dynamic notification bell dropdown & profile popover
 * - Automatic sign out confirmation & redirect
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  function detectRole(explicitRole) {
    if (explicitRole) return explicitRole.toLowerCase();
    const p = (window.location.pathname || '').toLowerCase();
    if (p.includes('/admin/')) return 'admin';
    if (p.includes('/faculty/')) return 'faculty';
    if (p.includes('/student/')) return 'student';
    return 'admin';
  }

  function getUser() {
    try {
      if (typeof window.getCurrentUser === 'function') return window.getCurrentUser();
      const stored = localStorage.getItem('user') || localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  }

  function getIcon(name, opts = {}) {
    if (window.VidyaIcons && typeof window.VidyaIcons.get === 'function') {
      return window.VidyaIcons.get(name, opts);
    }
    if (typeof window.getAdminIcon === 'function') return window.getAdminIcon(name, opts);
    if (typeof window.getFacultyIcon === 'function') return window.getFacultyIcon(name, opts);
    if (typeof window.getStudentIcon === 'function') return window.getStudentIcon(name, opts);
    return '';
  }

  /**
   * Theme Switcher (Light / Dark)
   */
  function toggleTheme() {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
      localStorage.setItem('vidya_theme', next);
      localStorage.setItem('app_theme', next);
    } catch (_) {}
    updateThemeIcon(next);
    if (window.VidyaUI && typeof window.VidyaUI.toast === 'function') {
      window.VidyaUI.toast(`Switched to ${next === 'dark' ? 'Dark' : 'Light'} Mode`, 'info', 1800);
    }
  }

  function updateThemeIcon(theme) {
    const isDark = theme === 'dark';
    const moonSvg = `<svg class="icon-theme" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    const sunSvg = `<svg class="icon-theme" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

    document.querySelectorAll('#theme-toggle-btn, #btn-student-theme').forEach(btn => {
      btn.innerHTML = isDark ? sunSvg : moonSvg;
    });
  }

  /**
   * Sync Live User Identity into Header
   */
  function syncIdentity() {
    const user = getUser();
    const name = user?.full_name || user?.name || user?.username || 'VidyaOS User';
    const email = user?.email || 'user@college.edu';
    const cleanName = name.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
    const parts = cleanName.split(/\s+/).filter(Boolean);
    const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : (cleanName[0] || 'U').toUpperCase();

    document.querySelectorAll('#header-user-initials, #gc-user-avatar, .user-avatar-initials, .dropdown-avatar-circle, #popover-avatar').forEach(el => {
      el.textContent = initials;
    });

    document.querySelectorAll('.dropdown-full-name, #popover-user-name, #student-popover-name').forEach(el => el.textContent = name);
    document.querySelectorAll('.dropdown-email, #popover-user-email, #student-popover-email').forEach(el => el.textContent = email);
  }

  /**
   * Dropdown Toggles
   */
  function toggleProfile(e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById('header-profile-dropdown') || document.getElementById('student-profile-popover');
    if (!dd) return;
    const isShown = dd.classList.contains('show');
    closeAllPopovers();
    if (!isShown) dd.classList.add('show');
  }

  function toggleNotifications(e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById('admin-notifications-dropdown') ||
      document.getElementById('faculty-notifications-dropdown') ||
      document.getElementById('student-notifications-dropdown') ||
      document.getElementById('header-notifications-dropdown');
    if (!dd) return;
    const isShown = dd.classList.contains('show');
    closeAllPopovers();
    if (!isShown) dd.classList.add('show');
  }

  function closeAllPopovers() {
    document.querySelectorAll('.header-profile-dropdown, .header-notifications-dropdown, .user-profile-popover').forEach(el => {
      el.classList.remove('show');
    });
  }

  /**
   * Safe Sign Out Handler
   */
  function handleSignOut() {
    if (window.VidyaUI && typeof window.VidyaUI.confirm === 'function') {
      window.VidyaUI.confirm({
        title: 'Sign Out',
        message: 'Are you sure you want to end your VidyaOS session?',
        confirmText: 'Sign Out',
        cancelText: 'Cancel',
        type: 'danger',
        onConfirm: () => executeLogout()
      });
    } else {
      executeLogout();
    }
  }

  function executeLogout() {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_user');
      sessionStorage.clear();
    } catch (_) {}
    window.location.replace('/login/index.html?reason=logout');
  }

  /**
   * Declarative Mount Function (React-like component mount)
   */
  function mountHeader(props = {}) {
    if (typeof document === 'undefined') return;
    if (document.getElementById('vidya-header')) return;

    const role = detectRole(props.role);
    const roleBadges = {
      admin: 'ADMIN',
      faculty: 'FACULTY',
      student: 'STUDENT'
    };
    const badgeText = props.pageBadge || roleBadges[role] || 'PORTAL';
    const brandLinkHref = `/${role}/dashboard/index.html`;

    const cubeSvg = `<svg class="header-brand-cube" width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M16 3.5L27.5 9.8L16 16.2L4.5 9.8L16 3.5Z" fill="var(--color-primary-light, hsl(215 90% 95%))" stroke="var(--color-primary)" stroke-width="1.2" stroke-linejoin="round"/><path d="M4.5 9.8L16 16.2V28.5L4.5 22.2V9.8Z" fill="var(--color-primary, hsl(217 91% 60%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/><path d="M16 16.2L27.5 9.8V22.2L16 28.5V16.2Z" fill="var(--color-primary-hover, hsl(224 76% 48%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/><path d="M16 16.5V27.5" stroke="hsl(0 0% 100% / 0.4)" stroke-width="1.2" stroke-linecap="round"/><path d="M16.5 16L26.5 10.5" stroke="hsl(0 0% 100% / 0.3)" stroke-width="1.2" stroke-linecap="round"/></svg>`;

    const hamburgerSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;

    const headerHtml = `
      <header id="vidya-header" class="${role}-top-header" aria-label="Main Application Header">
        <div class="header-left">
          <button type="button" class="header-mobile-toggle-btn" id="admin-mobile-nav-toggle" onclick="if(window.VidyaSidebar)VidyaSidebar.toggle()" aria-label="Toggle Navigation Menu">
            ${hamburgerSvg}
          </button>
          <a href="${brandLinkHref}" class="header-brand-link" aria-label="VidyaOS Dashboard">
            <span class="header-brand-logo">${cubeSvg}</span>
            <span class="header-brand-title">VidyaOS</span>
            <span class="header-brand-badge">${badgeText}</span>
          </a>
        </div>

        <div class="header-right">
          <!-- Theme Toggle -->
          <button type="button" class="header-icon-btn" id="theme-toggle-btn" onclick="VidyaHeader.toggleTheme()" title="Toggle Theme" aria-label="Toggle Dark/Light Mode">
            <svg class="icon-theme" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          </button>

          <!-- Notification Bell -->
          <button type="button" class="header-icon-btn" id="header-bell-btn" onclick="VidyaHeader.toggleNotifications(event)" title="Notifications" aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span class="header-bell-badge" id="header-bell-count" style="display:none;">0</span>
          </button>

          <!-- Notifications Dropdown -->
          <div class="header-notifications-dropdown" id="header-notifications-dropdown" onclick="event.stopPropagation()">
            <div style="padding:10px 14px;border-bottom:1px solid var(--border-color);font-weight:600;font-size:0.85rem;display:flex;justify-content:space-between;align-items:center;">
              <span>Notifications</span>
              <span style="font-size:0.75rem;color:var(--text-muted);">0 New</span>
            </div>
            <div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.85rem;">No new notifications.</div>
          </div>

          <!-- Profile Avatar Trigger -->
          <button type="button" class="header-profile-round-btn" id="header-user-profile" onclick="VidyaHeader.toggleProfile(event)" aria-haspopup="true" aria-expanded="false" title="Account Profile" aria-label="Open Account Profile">
            <span class="user-avatar-initials" id="header-user-initials">U</span>
            <span class="avatar-online-dot"></span>
          </button>

          <!-- Profile Dropdown Menu -->
          <div class="header-profile-dropdown" id="header-profile-dropdown" onclick="event.stopPropagation()">
            <div class="profile-dropdown-user-card">
              <div class="dropdown-avatar-circle">U</div>
              <div class="dropdown-user-meta">
                <span class="dropdown-full-name">VidyaOS User</span>
                <span class="dropdown-email">user@college.edu</span>
              </div>
            </div>
            <a href="/${role}/settings/index.html" class="profile-dropdown-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <span>Settings</span>
            </a>
            <div class="profile-dropdown-divider"></div>
            <button type="button" class="profile-dropdown-item dropdown-logout-btn" onclick="VidyaHeader.signOut()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>
    `;

    document.body.insertAdjacentHTML('afterbegin', headerHtml);
    syncIdentity();

    // Outside click dismissal
    document.addEventListener('click', closeAllPopovers);
  }

  // Unified Component Export
  const VidyaHeader = {
    mount: mountHeader,
    syncIdentity,
    toggleTheme,
    toggleProfile,
    toggleNotifications,
    signOut: handleSignOut
  };

  window.VidyaHeader = VidyaHeader;

  // Backward compatibility globals
  window.mountAdminHeader = () => mountHeader({ role: 'admin' });
  window.mountFacultyHeader = () => mountHeader({ role: 'faculty' });
  window.mountStudentHeader = () => mountHeader({ role: 'student' });
  window.syncHeaderIdentity = syncIdentity;
  window.syncFacultyHeader = syncIdentity;
  window.syncStudentHeaderIdentity = syncIdentity;
  window.toggleDashboardTheme = toggleTheme;
  window.toggleAppTheme = toggleTheme;
  window.toggleStudentTheme = toggleTheme;

  // Auto-mount on DOM ready if not manually mounted
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountHeader());
  } else {
    mountHeader();
  }

})();
