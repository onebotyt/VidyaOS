/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS ADMIN TOP HEADER ENGINE (header.js)
 * Location: /frontend/admin/components/header/header.js
 * 
 * - Handles Top Header mounting inside .admin-main-wrap
 * - Useful Institutional Context & Session indicators
 * - Theme toggle (Light / Dark mode) with persistence
 * - User Profile popover toggle and outside-click dismissal
 * - Live user name and avatar population
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /**
   * 1. Mount Top Header if missing from .admin-main-wrap
   */
  function mountAdminHeader() {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('admin-top-header');
    if (existing) {
      syncHeaderIdentity();
      setupProfileHover();
      return;
    }

    const layout = document.getElementById('admin-app-layout') || document.body;
    if (!layout) return;

    // Clear old placeholder inside mainWrap if it exists so it takes zero space
    const oldMount = document.getElementById('admin-header-mount');
    if (oldMount) {
      oldMount.style.display = 'none';
      oldMount.innerHTML = '';
    }

    const cubeSvg = `<svg class="header-brand-cube" width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M16 3.5L27.5 9.8L16 16.2L4.5 9.8L16 3.5Z" fill="var(--color-primary-light, hsl(215 90% 95%))" stroke="var(--color-primary)" stroke-width="1.2" stroke-linejoin="round"/><path d="M4.5 9.8L16 16.2V28.5L4.5 22.2V9.8Z" fill="var(--color-primary, hsl(217 91% 60%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/><path d="M16 16.2L27.5 9.8V22.2L16 28.5V16.2Z" fill="var(--color-primary-hover, hsl(224 76% 48%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/><path d="M16 16.5V27.5" stroke="hsl(0 0% 100% / 0.4)" stroke-width="1.2" stroke-linecap="round"/><path d="M16.5 16L26.5 10.5" stroke="hsl(0 0% 100% / 0.3)" stroke-width="1.2" stroke-linecap="round"/></svg>`;

    const hamburgerSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;

    const headerHtml = `
      <header class="admin-top-header" id="admin-top-header" aria-label="Admin Header Bar">
        <div class="header-left">
          <button type="button" class="header-mobile-toggle-btn" id="admin-mobile-nav-toggle" onclick="if(typeof toggleSidebar==='function')toggleSidebar()" aria-label="Toggle Navigation Menu">
            ${hamburgerSvg}
          </button>
          <a href="/admin/dashboard/index.html" class="header-brand-link" aria-label="VidyaOS Dashboard">
            <span class="header-brand-logo">${cubeSvg}</span>
            <div class="header-brand-info">
              <span class="header-brand-title">VidyaOS</span>
              <span class="header-brand-badge">Console</span>
            </div>
          </a>
        </div>

        <div class="header-right">
          <!-- Theme Toggle (Light / Dark) -->
          <button type="button" class="header-icon-btn header-theme-toggle" id="theme-toggle-btn" onclick="toggleDashboardTheme()" title="Toggle Dark/Light Mode" aria-label="Toggle Dark/Light Mode">
            <svg class="icon-theme" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>

          <!-- Notification Bell -->
          <button type="button" class="header-icon-btn header-bell-btn" id="header-bell-btn" onclick="toggleAdminNotifications(event)" title="Notifications" aria-label="Notifications" style="position:relative;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span class="header-bell-badge" id="admin-bell-count" style="display:none;">0</span>
          </button>

          <!-- Notifications Dropdown -->
          <div class="header-notifications-dropdown" id="admin-notifications-dropdown" aria-hidden="true" onclick="event.stopPropagation()">
            <div class="notif-dropdown-header">
              <span class="notif-header-title">Notifications</span>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="notif-header-badge" id="admin-notif-header-badge">0 New</span>
                <button type="button" class="notif-mark-all-btn" onclick="markAllAdminNotificationsAsRead(event)" style="background:transparent; border:none; color:var(--color-primary); font-size:0.75rem; font-weight:600; cursor:pointer;">Mark all read</button>
              </div>
            </div>
            <div class="notif-items-list" id="admin-notif-items-list">
              <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Loading notifications...</div>
            </div>
          </div>

          <!-- Round Profile Avatar Trigger -->
          <button type="button" class="header-profile-round-btn" id="header-user-profile" onclick="toggleAdminProfileMenu(event)" aria-haspopup="true" aria-expanded="false" title="System Administrator Profile" aria-label="Open User Profile Menu">
            <span class="user-avatar-initials" id="header-user-initials">SA</span>
            <span class="avatar-online-dot"></span>
          </button>

          <!-- Dropdown Profile Menu -->
          <div class="header-profile-dropdown" id="header-profile-dropdown" aria-hidden="true">
            <div class="profile-dropdown-user-card">
              <div class="dropdown-avatar-circle" aria-hidden="true">SA</div>
              <div class="dropdown-user-meta">
                <span class="dropdown-full-name">System Administrator</span>
                <span class="dropdown-email">admin@college.edu</span>
              </div>
            </div>
            <div class="profile-dropdown-divider"></div>
            <a href="/admin/profile/index.html" class="profile-dropdown-item">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>My Profile</span>
            </a>
            <a href="/admin/settings/index.html" class="profile-dropdown-item">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>System Settings</span>
            </a>
            <a href="/admin/audit-logs/index.html" class="profile-dropdown-item">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>Audit Trail &amp; Logs</span>
            </a>
            <div class="profile-dropdown-divider"></div>
            <button type="button" class="profile-dropdown-item dropdown-logout-btn" onclick="if(typeof confirmAdminLogout==='function'){confirmAdminLogout();}else if(typeof adminLogout==='function'){adminLogout();}else if(typeof logout==='function'){logout();}">
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
    syncHeaderIdentity();
    setupProfileHover();
  }

  /**
   * 1b. Smooth Profile Hover Engine
   */
  function setupProfileHover() {
    const trigger = document.getElementById('header-user-profile');
    const dropdown = document.getElementById('header-profile-dropdown');
    if (!trigger || !dropdown) return;

    let timer = null;
    function show() {
      clearTimeout(timer);
      dropdown.classList.add('open');
      dropdown.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
    }
    function hide() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        dropdown.classList.remove('open');
        dropdown.setAttribute('aria-hidden', 'true');
        trigger.setAttribute('aria-expanded', 'false');
      }, 160);
    }

    trigger.addEventListener('mouseenter', show);
    trigger.addEventListener('mouseleave', hide);
    dropdown.addEventListener('mouseenter', show);
    dropdown.addEventListener('mouseleave', hide);
  }

  /**
   * 2. Synchronize Header User Identity
   */
  function syncHeaderIdentity() {
    try {
      const user = (typeof window.getCurrentUser === 'function')
        ? window.getCurrentUser()
        : JSON.parse(localStorage.getItem('user') || 'null');

      if (!user) return;

      const name = user.full_name || user.name || user.username || 'System Admin';
      const elName = document.getElementById('top-header-user-name');
      const elInitials = document.getElementById('header-user-initials');

      if (elName) elName.textContent = name;
      if (elInitials) {
        const parts = name.trim().split(/\s+/);
        const initials = parts.length >= 2
          ? (parts[0][0] + parts[1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase();
        elInitials.textContent = initials || 'SA';

        const dropdownAvatar = document.querySelector('.dropdown-avatar-circle');
        if (dropdownAvatar) dropdownAvatar.textContent = initials || 'SA';
      }

      const dropdownName = document.querySelector('.dropdown-full-name');
      if (dropdownName) dropdownName.textContent = name;
      const dropdownEmail = document.querySelector('.dropdown-email');
      if (dropdownEmail && user.email) dropdownEmail.textContent = user.email;

      // Sync custom profile photo from localStorage if present
      const savedPhoto = localStorage.getItem('vidya_admin_avatar');
      if (savedPhoto) {
        if (elInitials) {
          elInitials.innerHTML = `<img src="${savedPhoto}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="Avatar">`;
        }
        const dropdownAvatar = document.querySelector('.dropdown-avatar-circle');
        if (dropdownAvatar) {
          dropdownAvatar.innerHTML = `<img src="${savedPhoto}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="Avatar">`;
        }
      }
    } catch (_) {}
  }

  /**
   * Toggle Notifications Dropdown
   */
  function toggleAdminNotifications(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const dropdown = document.getElementById('admin-notifications-dropdown');
    if (!dropdown) return;

    const prof = document.getElementById('header-profile-dropdown');
    if (prof) prof.classList.remove('open');

    const isOpen = dropdown.classList.contains('open');
    if (isOpen) {
      dropdown.classList.remove('open');
      dropdown.setAttribute('aria-hidden', 'true');
    } else {
      dropdown.classList.add('open');
      dropdown.setAttribute('aria-hidden', 'false');
      fetchAdminNotifications();
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

  async function fetchAdminNotifications() {
    try {
      const res = await fetch('/api/v1/notifications?limit=15', { credentials: 'include' });
      if (!res.ok) return;
      const json = await res.json();
      const items = json.data?.items || json.data || [];
      const unreadCount = json.data?.unreadCount !== undefined ? json.data.unreadCount : (json.unreadCount || 0);

      const badge = document.getElementById('admin-bell-count');
      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
          badge.style.display = 'inline-flex';
        } else {
          badge.textContent = '0';
          badge.style.display = 'none';
        }
      }

      const badgeHeader = document.getElementById('admin-notif-header-badge');
      if (badgeHeader) {
        badgeHeader.textContent = unreadCount > 0 ? `${unreadCount} New` : 'All Read';
      }

      const list = document.getElementById('admin-notif-items-list');
      if (list) {
        if (!items || items.length === 0) {
          list.innerHTML = `<div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No new notifications</div>`;
        } else {
          list.innerHTML = items.map(n => `
            <div class="notif-item ${!n.is_read ? 'unread' : ''}" onclick="handleAdminNotificationClick('${n.id}', '${n.link_url || ''}')" style="display:flex; align-items:flex-start; gap:8px; padding:8px 10px; border-radius:8px; margin-bottom:6px; cursor:pointer; background:var(--bg-surface); border:1px solid var(--border-color);">
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

  async function handleAdminNotificationClick(id, linkUrl) {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: 'PUT', credentials: 'include' });
    } catch (_) {}
    if (linkUrl && linkUrl.trim()) {
      window.location.href = linkUrl;
    } else {
      fetchAdminNotifications();
    }
  }

  async function markAllAdminNotificationsAsRead(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      await fetch('/api/v1/notifications/mark-all-read', { method: 'PUT', credentials: 'include' });
      fetchAdminNotifications();
    } catch (_) {}
  }

  window.toggleAdminNotifications = toggleAdminNotifications;
  window.handleAdminNotificationClick = handleAdminNotificationClick;
  window.markAllAdminNotificationsAsRead = markAllAdminNotificationsAsRead;
  window.fetchAdminNotifications = fetchAdminNotifications;

  /**
   * 3. Toggle Profile Dropdown
   */
  function toggleAdminProfileMenu(e) {
    if (e) {
      if (e.stopPropagation) e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
    }
    const dropdown = document.getElementById('header-profile-dropdown');
    const trigger = document.getElementById('header-user-profile');
    if (!dropdown || !trigger) return;

    // Close notifications dropdown if open
    const notif = document.getElementById('admin-notifications-dropdown');
    if (notif && notif.classList.contains('open')) {
      notif.classList.remove('open');
      notif.setAttribute('aria-hidden', 'true');
    }

    const isOpen = dropdown.classList.contains('open');
    if (isOpen) {
      dropdown.classList.remove('open');
      dropdown.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
    } else {
      dropdown.classList.add('open');
      dropdown.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
    }
  }

  // Dismiss dropdown on outside click
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('header-profile-dropdown');
    const trigger = document.getElementById('header-user-profile');
    if (dropdown && dropdown.classList.contains('open')) {
      if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
        dropdown.classList.remove('open');
        dropdown.setAttribute('aria-hidden', 'true');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    }

    const notif = document.getElementById('admin-notifications-dropdown');
    const notifBtn = document.getElementById('header-bell-btn');
    if (notif && notif.classList.contains('open')) {
      if (!notif.contains(e.target) && !notifBtn?.contains(e.target)) {
        notif.classList.remove('open');
        notif.setAttribute('aria-hidden', 'true');
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const dropdown = document.getElementById('header-profile-dropdown');
      if (dropdown) dropdown.classList.remove('open');
      const notif = document.getElementById('admin-notifications-dropdown');
      if (notif) notif.classList.remove('open');
    }
  });

  /**
   * 4. Theme Toggle Engine
   */
  function toggleDashboardTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('app_theme') || localStorage.getItem('theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('theme', nextTheme);
      localStorage.setItem('app_theme', nextTheme);
      localStorage.setItem('vidya_theme', nextTheme);
    } catch (_) {}
  }

  // Attach to window
  window.mountAdminHeader = mountAdminHeader;
  window.syncHeaderIdentity = syncHeaderIdentity;
  window.toggleAdminProfileMenu = toggleAdminProfileMenu;
  window.toggleDashboardTheme = toggleDashboardTheme;
  window.toggleAppTheme = toggleDashboardTheme;
  window.toggleUserProfile = toggleAdminProfileMenu;

  function initAdminHeader() {
    mountAdminHeader();
    fetchAdminNotifications();
    setInterval(fetchAdminNotifications, 20000);
  }

  // Mount on DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAdminHeader);
    } else {
      initAdminHeader();
    }
  }
})();
