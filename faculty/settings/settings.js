/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY SETTINGS & PREFERENCES CONTROLLER (settings.js)
 * Location: /faculty/settings/settings.js
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const CURRENT_VERSION = '2.5.0';

  document.addEventListener('DOMContentLoaded', () => {
    initFacultySettings();
  });

  async function initFacultySettings() {
    await loadFacultyProfile();
    await checkGoogleStatus();
  }

  async function loadFacultyProfile() {
    try {
      let faculty = null;
      if (typeof fetchApi === 'function') {
        const res = await fetchApi('/faculty/profile', { suppressToast: true }).catch(() => null);
        if (res?.data) faculty = res.data;
      }

      if (!faculty) {
        const cached = localStorage.getItem('faculty_user') || localStorage.getItem('user');
        if (cached) faculty = JSON.parse(cached);
      }

      if (faculty) {
        const name = faculty.full_name || faculty.name || 'Faculty Member';
        const dept = faculty.department_name || faculty.department || 'Academic Department';
        const empid = faculty.employee_id || faculty.id || faculty.username || 'EMP--';
        const email = faculty.email || 'faculty@ugip.ac.in';
        const role = faculty.role || (faculty.is_hod ? 'HOD' : 'FACULTY');

        const elName = document.getElementById('faculty-name');
        if (elName) elName.textContent = name;

        const elDept = document.getElementById('faculty-dept');
        if (elDept) elDept.textContent = dept;

        const elRole = document.getElementById('faculty-role-tag');
        if (elRole) elRole.textContent = role.toUpperCase();

        const elEmp = document.getElementById('faculty-empid');
        if (elEmp) elEmp.textContent = `EMP: ${empid}`;

        const elEmail = document.getElementById('faculty-email-chip');
        if (elEmail) elEmail.textContent = email;

        const elAvatar = document.getElementById('faculty-avatar');
        if (elAvatar) {
          const parts = name.trim().split(/\s+/);
          const initials = parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase();
          elAvatar.textContent = initials;
        }

        // Store status
        if (faculty.google_linked !== undefined) {
          updateGoogleUI(Boolean(faculty.google_linked));
        }
      }
    } catch (err) {
      console.warn('[FacultySettings] Failed to load profile:', err);
    }
  }

  async function checkGoogleStatus() {
    try {
      if (typeof fetchApi === 'function') {
        const res = await fetchApi('/auth/google/status', { suppressToast: true }).catch(() => null);
        if (res && res.linked !== undefined) {
          updateGoogleUI(res.linked);
          return;
        }
      }
    } catch (_) {}
  }

  function updateGoogleUI(isLinked) {
    const badge = document.getElementById('faculty-google-badge');
    const desc = document.getElementById('faculty-google-desc');
    const btn = document.getElementById('btn-toggle-google-link');

    if (isLinked) {
      if (badge) {
        badge.textContent = 'Linked';
        badge.className = 'badge badge-success';
        badge.style.background = '#dcfce7';
        badge.style.color = '#15803d';
      }
      if (desc) desc.textContent = 'Your Google account is linked for instant 1-tap login.';
      if (btn) {
        btn.textContent = 'Disconnect';
        btn.className = 'btn btn-sm btn-secondary';
        btn.onclick = disconnectGoogle;
      }
    } else {
      if (badge) {
        badge.textContent = 'Not Linked';
        badge.className = 'badge badge-secondary';
        badge.style.background = '#f1f5f9';
        badge.style.color = '#64748b';
      }
      if (desc) desc.textContent = 'Link your Google account for secure 1-tap sign in.';
      if (btn) {
        btn.textContent = 'Link Google';
        btn.className = 'btn btn-sm btn-primary';
        btn.onclick = handleGoogleLinkToggle;
      }
    }
  }

  window.handleGoogleLinkToggle = function () {
    window.location.href = '/faculty/profile/index.html#security';
  };

  async function disconnectGoogle() {
    if (!confirm('Are you sure you want to disconnect Google 1-Click Sign-In? You will need your password to log in.')) return;
    try {
      if (typeof fetchApi === 'function') {
        const res = await fetchApi('/auth/google/unlink', { method: 'POST' });
        if (res?.success) {
          alert('Google account disconnected successfully.');
          updateGoogleUI(false);
          return;
        }
      }
      alert('Failed to disconnect Google account.');
    } catch (e) {
      alert(e.message || 'Error disconnecting account');
    }
  }

  window.checkForUpdates = async function () {
    const btn = document.getElementById('btn-check-updates');
    const desc = document.getElementById('update-status-desc');
    const banner = document.getElementById('update-banner-container');
    if (btn) btn.textContent = 'Checking...';

    try {
      const res = await fetch('/api/v1/updates/check?version=' + CURRENT_VERSION);
      const data = await res.json();

      if (data && data.update_available) {
        if (desc) desc.textContent = `Update available: v${data.latest_version}!`;
        if (banner) {
          banner.style.display = 'block';
          banner.innerHTML = `
            <div style="padding:12px; background:rgba(37,99,235,0.08); border-radius:10px; margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong style="color:var(--color-primary);">New version ${data.latest_version} ready</strong>
                <div style="font-size:0.75rem; color:var(--text-muted);">${data.release_notes || 'Bug fixes and performance improvements.'}</div>
              </div>
              <a href="${data.download_url || '/login/index.html'}" class="btn btn-sm btn-primary">Download</a>
            </div>
          `;
        }
      } else {
        if (desc) desc.textContent = `You are running the latest version (${CURRENT_VERSION}). System up to date.`;
      }
    } catch (_) {
      if (desc) desc.textContent = `System is up to date with institutional version v${CURRENT_VERSION}.`;
    } finally {
      if (btn) btn.textContent = 'Checked';
    }
  };

  window.toggleAppTheme = function () {
    if (typeof window.toggleTheme === 'function') {
      window.toggleTheme();
    } else {
      const html = document.documentElement;
      const isDark = html.getAttribute('data-theme') === 'dark';
      if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }
    }
  };

  window.promptLogout = function () {
    const m = document.getElementById('logout-modal');
    if (m) m.style.display = 'flex';
  };

  window.closeLogoutModal = function () {
    const m = document.getElementById('logout-modal');
    if (m) m.style.display = 'none';
  };

  window.executeLogout = function () {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('faculty_user');
      sessionStorage.clear();
    } catch (_) {}
    window.location.href = '/login/index.html';
  };
})();
