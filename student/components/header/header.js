/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS STUDENT TOP HEADER ENGINE (header.js)
 * Location: /frontend/student/components/header/header.js
 * 
 * - Mounts Google Classroom-style unified top app bar
 * - Displays page-context badge & quick actions
 * - 9-Dot Academic Apps launcher with quick links
 * - Dark/Light theme toggle with persistent state
 * - Student profile sync & popover manager
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

  const STUDENT_APPS = [
    { label: 'Classes', href: '/student/dashboard/index.html', icon: 'classes' },
    { label: 'Attendance', href: '/student/attendance/index.html', icon: 'attendance' },
    { label: 'Timetable', href: '/student/timetable/index.html', icon: 'timetable' },
    { label: 'Tasks', href: '/student/assignments/index.html', icon: 'assignments' },
    { label: 'Marks', href: '/student/scores/index.html', icon: 'scores' },
    { label: 'Leave', href: '/student/leave/index.html', icon: 'leave' },
    { label: 'Profile', href: '/student/profile/index.html', icon: 'profile' },
    { label: 'Settings', href: '/student/settings/index.html', icon: 'settings' }
  ];

  function getPageBadgeText() {
    const p = window.location.pathname.toLowerCase();
    if (p.includes('/attendance')) return 'ATTENDANCE';
    if (p.includes('/timetable')) return 'TIMETABLE';
    if (p.includes('/assignments')) return 'COURSEWORK';
    if (p.includes('/scores')) return 'MARKSHEETS';
    if (p.includes('/leave')) return 'LEAVE';
    if (p.includes('/settings')) return 'SETTINGS';
    if (p.includes('/profile')) return 'PROFILE';
    if (p.includes('/theory-classes')) return 'THEORY';
    if (p.includes('/lab-classes')) return 'PRACTICAL';
    if (p.includes('/group-detail')) return 'CLASSROOM';
    if (p.includes('/nba') || p.includes('/assessment')) return 'NBA DOSSIER';
    return 'STUDENT';
  }

  function mountStudentHeader() {
    if (typeof document === 'undefined') return;

    // Check if already mounted
    if (document.getElementById('gc-navbar') || document.querySelector('.student-top-navbar')) {
      syncStudentHeaderIdentity();
      return;
    }

    const badge = getPageBadgeText();
    const isDashboard = window.location.pathname.includes('/dashboard') || window.location.pathname === '/student/' || window.location.pathname === '/student';

    const actionButtonHtml = isDashboard
      ? `<button type="button" class="gc-create-btn" onclick="typeof openStudentJoinModal === 'function' ? openStudentJoinModal() : (window.location.href='/student/dashboard/index.html')" title="Join class using 6-character code">
           <span>+</span> <span class="btn-text">Join Class</span>
         </button>`
      : `<a href="/student/dashboard/index.html" class="student-nav-action-btn" title="Return to Classes Hub">
           <span>←</span> <span class="btn-text">Classes Hub</span>
         </a>`;

    const appsHtml = STUDENT_APPS.map(app => `
      <a href="${app.href}" class="app-launcher-tile" title="${app.label}">
        <div class="app-launcher-icon">${getIcon(app.icon, { width: 20, height: 20 })}</div>
        <span>${app.label}</span>
      </a>
    `).join('');

    const headerHtml = `
      <header class="gc-navbar student-top-navbar" id="gc-navbar" aria-label="Student Navigation Bar">
        <!-- Left Section -->
        <div class="gc-nav-left">
          <button type="button" class="gc-menu-btn" id="btn-menu-toggle" onclick="toggleStudentDrawer()" title="Main Menu" aria-label="Toggle Navigation Drawer">
            ${getIcon('menu', { width: 20, height: 20 })}
          </button>
          <a href="/student/dashboard/index.html" class="gc-brand-link" title="VidyaOS Student Workspace">
            <div class="gc-brand-icon">
              ${getIcon('brand', { width: 22, height: 22 })}
            </div>
            <div class="gc-brand-title">VidyaOS</div>
          </a>
          <span class="gc-page-badge" id="gc-page-badge" style="display:none;" aria-hidden="true">${badge}</span>
        </div>

        <!-- Right Section -->
        <div class="gc-nav-right">
          <button type="button" id="btn-student-apps" style="display:none;" aria-hidden="true"></button>

          <!-- Theme Toggle Button -->
          <button type="button" class="gc-icon-btn" onclick="toggleStudentTheme()" id="btn-student-theme" title="Toggle Light/Dark Theme" aria-label="Toggle Theme">
            <span id="student-theme-icon">${getIcon('moon', { width: 17, height: 17 })}</span>
          </button>

          <!-- Notification Bell Button -->
          <button type="button" class="gc-icon-btn header-bell-btn" onclick="toggleStudentNotifications(event)" id="btn-student-bell" title="Notifications" aria-label="Notifications" style="position:relative;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span class="header-bell-badge" id="student-bell-count" style="display:none;">0</span>
          </button>

          <!-- Round User Avatar -->
          <div class="gc-user-avatar" id="gc-user-avatar" onclick="toggleStudentProfile(event)" title="Student Account" aria-haspopup="true" aria-expanded="false">
            ST
          </div>
        </div>

        <!-- Notifications Dropdown -->
        <div class="header-notifications-dropdown" id="student-notifications-dropdown" aria-hidden="true" onclick="event.stopPropagation()">
          <div class="notif-dropdown-header">
            <span class="notif-header-title">Notifications</span>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="notif-header-badge" id="student-notif-header-badge">0 New</span>
              <button type="button" class="notif-mark-all-btn" onclick="markAllStudentNotificationsAsRead(event)" style="background:transparent; border:none; color:var(--color-primary); font-size:0.75rem; font-weight:600; cursor:pointer;">Mark all read</button>
            </div>
          </div>
          <div class="notif-items-list" id="student-notif-items-list">
            <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Loading notifications...</div>
          </div>
        </div>

        <!-- Apps Launcher Dropdown -->
        <div class="apps-launcher-dropdown" id="student-apps-dropdown" aria-hidden="true" onclick="event.stopPropagation()">
          ${appsHtml}
        </div>

        <!-- User Profile Popover -->
        <div class="user-profile-popover" id="student-profile-popover" aria-hidden="true" onclick="event.stopPropagation()">
          <div class="profile-popover-avatar" id="student-popover-avatar">
            <span id="popover-avatar">ST</span>
          </div>
          <div class="profile-popover-name" id="student-popover-name">
            <span id="popover-user-name">Student Account</span>
          </div>
          <div class="profile-popover-meta" id="student-popover-meta">
            <span id="popover-reg-badge">Roll: — • UBTER: —</span>
          </div>
          <div class="profile-popover-email" id="student-popover-email">
            <span id="popover-user-email">student@college.edu</span>
          </div>
          
          <div class="profile-popover-divider"></div>
          
          <div class="profile-popover-links">
            <a href="/student/profile/index.html" class="profile-popover-item">
              ${getIcon('profile', { width: 17, height: 17 })}
              <span>My Full Profile</span>
            </a>
            <a href="/student/settings/index.html" class="profile-popover-item">
              ${getIcon('settings', { width: 17, height: 17 })}
              <span>Settings & App Updates</span>
            </a>
            <a href="/student/dashboard/index.html" class="profile-popover-item">
              ${getIcon('classes', { width: 17, height: 17 })}
              <span>Enrolled Classes</span>
            </a>
            <button type="button" class="profile-popover-item danger" onclick="handleStudentLogout()">
              ${getIcon('logout', { width: 17, height: 17 })}
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>
    `;

    const mount = document.getElementById('student-header-mount');
    if (mount) {
      mount.innerHTML = headerHtml;
    } else {
      document.body.insertAdjacentHTML('afterbegin', headerHtml);
    }

    updateThemeIcon();
    syncStudentHeaderIdentity();
  }

  /**
   * Syncs student avatar initials, name, and meta from auth / API
   */
  async function syncStudentHeaderIdentity() {
    try {
      let user = null;
      if (typeof getCurrentUser === 'function') {
        user = getCurrentUser();
      }

      let profileData = null;
      if (typeof fetchApi === 'function') {
        try {
          const res = await fetchApi('/students/me');
          if (res && res.success && res.data) {
            profileData = res.data;
          }
        } catch (_) { }
      }

      const name = profileData?.full_name || user?.full_name || user?.name || user?.username || 'Student';
      const email = profileData?.email || user?.email || '';
      const rollNo = profileData?.class_roll_no !== undefined && profileData?.class_roll_no !== null ? profileData.class_roll_no : '—';
      const ubter = profileData?.registration_no || '—';

      // Initials calculation
      const initials = name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'ST';

      // Update Header Avatar
      const navAvatar = document.getElementById('gc-user-avatar');
      if (navAvatar) navAvatar.innerText = initials;

      // Update Popover
      const popAvatar = document.getElementById('student-popover-avatar');
      if (popAvatar) popAvatar.innerText = initials;
      const legAvatar = document.getElementById('popover-avatar');
      if (legAvatar) legAvatar.innerText = initials;

      const popName = document.getElementById('student-popover-name');
      if (popName) popName.innerText = name;
      const legName = document.getElementById('popover-user-name');
      if (legName) legName.innerText = name;

      const popMeta = document.getElementById('student-popover-meta');
      if (popMeta) popMeta.innerText = `Roll: ${rollNo} • UBTER: ${ubter}`;
      const legMeta = document.getElementById('popover-reg-badge');
      if (legMeta) legMeta.innerHTML = `<span class="badge badge-present" style="font-size:0.75rem;">Roll: <strong>${rollNo}</strong> • UBTER Reg: <strong>${ubter}</strong></span>`;

      const popEmail = document.getElementById('student-popover-email');
      if (popEmail) popEmail.innerText = email;
      const legEmail = document.getElementById('popover-user-email');
      if (legEmail) legEmail.innerText = email;
    } catch (err) {
      console.warn('[student-header] Identity sync warning:', err.message);
    }
  }

  /**
   * Toggles the left drawer (delegates to sidebar component if present)
   */
  function toggleStudentDrawer(forceState) {
    if (typeof window.toggleDrawerComponent === 'function') {
      window.toggleDrawerComponent(forceState);
      return;
    }

    // Fallback to existing drawer DOM elements
    const drawer = document.getElementById('gc-drawer') || document.getElementById('student-drawer');
    const backdrop = document.getElementById('gc-drawer-backdrop') || document.getElementById('student-drawer-backdrop');
    if (!drawer || !backdrop) return;

    const isOpen = forceState !== undefined ? forceState : !drawer.classList.contains('open');
    if (isOpen) {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
    } else {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  /**
   * Toggles Notifications Dropdown
   */
  function toggleStudentNotifications(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const dropdown = document.getElementById('student-notifications-dropdown');
    if (!dropdown) return;

    toggleStudentProfile(false);
    const apps = document.getElementById('student-apps-dropdown');
    if (apps) apps.classList.remove('open');

    const isOpen = dropdown.classList.contains('open');
    if (isOpen) {
      dropdown.classList.remove('open');
    } else {
      dropdown.classList.add('open');
      fetchStudentNotifications();
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatRelativeTime(dateInput) {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  }

  async function fetchStudentNotifications() {
    try {
      const res = await fetch('/api/v1/notifications?limit=15', { credentials: 'include' });
      if (!res.ok) return;
      const json = await res.json();
      const items = json.data?.items || json.data || [];
      const unreadCount = json.data?.unreadCount !== undefined ? json.data.unreadCount : (json.unreadCount || 0);

      const badge = document.getElementById('student-bell-count');
      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
          badge.style.display = 'inline-flex';
        } else {
          badge.textContent = '0';
          badge.style.display = 'none';
        }
      }

      const badgeHeader = document.getElementById('student-notif-header-badge');
      if (badgeHeader) {
        badgeHeader.textContent = unreadCount > 0 ? `${unreadCount} New` : 'All Read';
      }

      const list = document.getElementById('student-notif-items-list');
      if (list) {
        if (!items || items.length === 0) {
          list.innerHTML = `<div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No new notifications</div>`;
        } else {
          list.innerHTML = items.map(n => `
            <div class="notif-item ${!n.is_read ? 'unread' : ''}" onclick="handleStudentNotificationClick('${n.id}', '${n.link_url || ''}')" style="display:flex; align-items:flex-start; gap:8px; padding:8px 10px; border-radius:8px; margin-bottom:6px; cursor:pointer; background:var(--bg-surface); border:1px solid var(--border-color);">
              <div class="notif-item-body" style="flex:1; min-width:0;">
                <div class="notif-item-title" style="font-size:0.82rem; font-weight:600; color:var(--text-main);">${escapeHtml(n.title)}</div>
                <div class="notif-item-sub" style="font-size:0.72rem; color:var(--text-muted); margin-top:2px; line-height:1.3;">${escapeHtml(n.message)}</div>
                <div class="notif-item-time" style="font-size:0.68rem; color:var(--text-muted); margin-top:3px;">${formatRelativeTime(n.created_at)}</div>
              </div>
              ${!n.is_read ? '<span style="width:7px; height:7px; border-radius:50%; background:var(--color-primary); flex-shrink:0; margin-top:5px;"></span>' : ''}
            </div>
          `).join('');
        }
      }
    } catch (_) {}
  }

  async function handleStudentNotificationClick(id, linkUrl) {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: 'PUT', credentials: 'include' });
    } catch (_) {}
    if (linkUrl && linkUrl.trim()) {
      window.location.href = linkUrl;
    } else {
      fetchStudentNotifications();
    }
  }

  async function markAllStudentNotificationsAsRead(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      await fetch('/api/v1/notifications/mark-all-read', { method: 'PUT', credentials: 'include' });
      fetchStudentNotifications();
    } catch (_) {}
  }

  window.toggleStudentNotifications = toggleStudentNotifications;
  window.handleStudentNotificationClick = handleStudentNotificationClick;
  window.markAllStudentNotificationsAsRead = markAllStudentNotificationsAsRead;
  window.fetchStudentNotifications = fetchStudentNotifications;

  /**
   * Toggles Apps Launcher
   */
  function toggleStudentApps(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('student-apps-dropdown');
    if (!dropdown) return;

    // Close profile popover
    toggleStudentProfile(false);

    const isOpen = dropdown.classList.contains('open');
    if (isOpen) {
      dropdown.classList.remove('open');
    } else {
      dropdown.classList.add('open');
    }
  }

  /**
   * Toggles Profile Popover
   */
  function toggleStudentProfile(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const pop = document.getElementById('student-profile-popover');
    if (!pop) return;

    if (e !== false) {
      const apps = document.getElementById('student-apps-dropdown');
      if (apps) apps.classList.remove('open');
    }

    const isOpen = typeof e === 'boolean' ? !e : pop.classList.contains('open');
    if (isOpen) {
      pop.classList.remove('open');
    } else {
      pop.classList.add('open');
    }
  }

  /**
   * Toggles Theme
   */
  function toggleStudentTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch (_) { }
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const iconContainer = document.getElementById('student-theme-icon');
    if (iconContainer) {
      iconContainer.innerHTML = isDark
        ? getIcon('sun', { width: 17, height: 17 })
        : getIcon('moon', { width: 17, height: 17 });
    }
  }

  function handleStudentLogout() {
    if (typeof logout === 'function') {
      logout();
    } else {
      try {
        localStorage.removeItem('vidyaos_token');
        localStorage.removeItem('vidyaos_user');
      } catch (_) { }
      window.location.href = '/login/';
    }
  }

  // Global dismiss listeners
  document.addEventListener('click', (e) => {
    const apps = document.getElementById('student-apps-dropdown');
    const appsBtn = document.getElementById('btn-student-apps');
    if (apps && apps.classList.contains('open') && !apps.contains(e.target) && !appsBtn?.contains(e.target)) {
      apps.classList.remove('open');
    }

    const profile = document.getElementById('student-profile-popover');
    const avatar = document.getElementById('gc-user-avatar');
    if (profile && profile.classList.contains('open') && !profile.contains(e.target) && !avatar?.contains(e.target)) {
      profile.classList.remove('open');
    }

    const notif = document.getElementById('student-notifications-dropdown');
    const notifBtn = document.getElementById('btn-student-bell');
    if (notif && notif.classList.contains('open') && !notif.contains(e.target) && !notifBtn?.contains(e.target)) {
      notif.classList.remove('open');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleStudentDrawer(false);
      const apps = document.getElementById('student-apps-dropdown');
      if (apps) apps.classList.remove('open');
      const profile = document.getElementById('student-profile-popover');
      if (profile) profile.classList.remove('open');
      const notif = document.getElementById('student-notifications-dropdown');
      if (notif) notif.classList.remove('open');
    }
  });

  // Export to global window
  window.mountStudentHeader = mountStudentHeader;
  window.toggleStudentDrawer = toggleStudentDrawer;
  window.toggleStudentApps = toggleStudentApps;
  window.toggleStudentProfile = toggleStudentProfile;
  window.toggleStudentTheme = toggleStudentTheme;
  window.handleStudentLogout = handleStudentLogout;

  // Interop aliases for legacy page code
  window.toggleDrawer = toggleStudentDrawer;
  window.toggleAppsLauncher = toggleStudentApps;
  window.toggleUserProfile = toggleStudentProfile;
  window.toggleTheme = toggleStudentTheme;

  function initStudentHeader() {
    mountStudentHeader();
    fetchStudentNotifications();
    setInterval(fetchStudentNotifications, 20000);
  }

  // Auto-mount
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudentHeader);
  } else {
    initStudentHeader();
  }
})();
