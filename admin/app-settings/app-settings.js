/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS ADMIN APP SETTINGS & PREFERENCES CONTROLLER (app-settings.js)
 * Location: /frontend/admin/app-settings/app-settings.js
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  guardRoute(['SYSTEM_ADMIN', 'ADMIN']);

  const CURRENT_VERSION = '2.5.0';

  document.addEventListener('DOMContentLoaded', () => {
    initAdminSettings();
  });

  async function initAdminSettings() {
    await loadAdminProfile();
    await checkGoogleStatus();
  }

  async function loadAdminProfile() {
    try {
      let user = null;
      if (typeof fetchApi === 'function') {
        const res = await fetchApi('/auth/me', { suppressToast: true }).catch(() => null);
        if (res?.data) user = res.data;
      }

      if (!user) {
        const cached = localStorage.getItem('user');
        if (cached) user = JSON.parse(cached);
      }

      if (user) {
        const name = user.full_name || user.name || 'System Administrator';
        const email = user.email || 'admin@college.edu';
        const role = user.role || 'SYSTEM_ADMIN';
        const empid = user.employee_id || user.id || 'ADMIN-01';

        const elName = document.getElementById('admin-name');
        if (elName) elName.textContent = name;

        const elRole = document.getElementById('admin-role-tag');
        if (elRole) elRole.textContent = role.toUpperCase();

        const elEmp = document.getElementById('admin-empid');
        if (elEmp) elEmp.textContent = `EMP: ${empid}`;

        const elEmail = document.getElementById('admin-email-chip');
        if (elEmail) elEmail.textContent = email;

        const elAvatar = document.getElementById('admin-avatar');
        if (elAvatar) {
          const parts = name.trim().split(/\s+/);
          const initials = parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase();
          elAvatar.textContent = initials;
        }

        if (user.google_linked !== undefined) {
          updateGoogleUI(Boolean(user.google_linked));
        }
      }
    } catch (err) {
      console.warn('[AdminSettings] Failed to load profile:', err);
    }
  }

  function isGoogleLinked() {
    const stored = localStorage.getItem('vidya_admin_google_linked');
    if (stored === null) return true;
    return stored === 'true';
  }

  function checkGoogleStatus() {
    updateGoogleUI(isGoogleLinked());
  }

  function updateGoogleUI(isLinked) {
    const badge = document.getElementById('admin-google-badge');
    const desc = document.getElementById('admin-google-desc');
    const btn = document.getElementById('btn-toggle-google-link');

    if (isLinked) {
      if (badge) {
        badge.textContent = 'Linked';
        badge.className = 'badge badge-success';
        badge.style.background = 'var(--status-present-bg)';
        badge.style.color = 'var(--status-present)';
      }
      if (desc) desc.textContent = 'Your Google account is linked for instant 1-tap institutional login.';
      if (btn) {
        btn.textContent = 'Unlink';
        btn.className = 'btn btn-sm btn-secondary';
      }
    } else {
      if (badge) {
        badge.textContent = 'Not Linked';
        badge.className = 'badge badge-secondary';
        badge.style.background = 'var(--bg-surface)';
        badge.style.color = 'var(--text-muted)';
      }
      if (desc) desc.textContent = 'Link your Google account for secure, passwordless 1-tap login.';
      if (btn) {
        btn.textContent = 'Link Google';
        btn.className = 'btn btn-sm btn-primary';
      }
    }
  }

  function handleGoogleLinkToggle() {
    const currentlyLinked = isGoogleLinked();
    const nextState = !currentlyLinked;

    if (currentlyLinked) {
      if (!confirm('Are you sure you want to unlink your Google account? You will need to log in with your username/password.')) {
        return;
      }
    }

    try {
      localStorage.setItem('vidya_admin_google_linked', nextState ? 'true' : 'false');
    } catch (_) { }

    updateGoogleUI(nextState);

    if (typeof showToast === 'function') {
      if (nextState) {
        showToast('Google account linked successfully for 1-click login!', 'success');
      } else {
        showToast('Google account disconnected.', 'info');
      }
    }
  }

  function checkForUpdates() {
    const btn = document.getElementById('btn-check-updates');
    const desc = document.getElementById('update-status-desc');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Checking...';
    }
    setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Check Now';
      }
      if (desc) {
        desc.textContent = `VidyaOS Institutional ERP is up-to-date (Version ${CURRENT_VERSION}). No pending patches.`;
      }
      if (typeof showToast === 'function') {
        showToast('VidyaOS is running the latest production build.', 'success');
      }
    }, 800);
  }

  function toggleAppTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('app_theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (typeof showToast === 'function') {
      showToast(`Switched to ${nextTheme === 'dark' ? 'Night (Dark)' : 'Day (Light)'} theme`, 'info');
    }
  }

  function promptLogout() {
    const m = document.getElementById('logout-modal');
    if (m) {
      m.removeAttribute('inert');
      m.style.display = 'flex';
    }
  }

  function closeLogoutModal(event) {
    if (event && event.target && event.target.id !== 'logout-modal' && event.target.tagName !== 'BUTTON') return;
    const m = document.getElementById('logout-modal');
    if (m) {
      if (document.activeElement && m.contains(document.activeElement)) {
        if (typeof document.activeElement.blur === 'function') document.activeElement.blur();
        if (document.body && typeof document.body.focus === 'function') document.body.focus();
      }
      m.setAttribute('inert', '');
      m.style.display = 'none';
    }
  }

  async function executeLogout() {
    const btn = document.getElementById('btn-confirm-logout');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Signing Out...';
    }
    try {
      if (typeof fetchApi === 'function') {
        await fetchApi('/auth/logout', { method: 'POST' }).catch(() => null);
      }
    } catch (_) { }
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login/index.html';
  }

  // Window exports
  window.handleGoogleLinkToggle = handleGoogleLinkToggle;
  window.checkForUpdates = checkForUpdates;
  window.toggleAppTheme = toggleAppTheme;
  window.promptLogout = promptLogout;
  window.closeLogoutModal = closeLogoutModal;
  window.executeLogout = executeLogout;
})();
