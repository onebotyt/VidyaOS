/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS STUDENT SETTINGS & APP HUB (settings.js)
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  let currentStudentData = null;

  document.addEventListener('DOMContentLoaded', initSettings);

  async function initSettings() {
    // 1. Check authentication
    if (typeof StudentAuth !== 'undefined' && typeof StudentAuth.requireAuth === 'function') {
      try { StudentAuth.requireAuth(); } catch (_) { }
    }

    // 2. Load student profile & advisor info
    await loadStudentProfile();

    // 3. Initialize theme switch state
    initThemeSwitch();

    // 4. Initialize app version display
    initVersionDisplay();

    // 5. Check active bug reports count
    loadActiveReportsCount();
  }

  /**
   * Loads student profile details and updates cards
   */
  async function loadStudentProfile() {
    try {
      let data = null;
      if (typeof fetchApi === 'function') {
        try {
          const res = await fetchApi('/students/me');
          if (res && res.success && res.data) {
            data = res.data;
          }
        } catch (_) { }
      }

      if (!data && typeof getCurrentUser === 'function') {
        data = getCurrentUser();
      }

      currentStudentData = data || {};

      const name = data?.full_name || data?.name || 'Student';
      const email = data?.email || 'student@ugip.ac.in';
      const regNo = data?.registration_no || data?.enrollment_no || 'UBTER2024';
      const rollNo = data?.class_roll_no !== undefined && data?.class_roll_no !== null ? data.class_roll_no : (data?.roll_no || '—');
      const dept = data?.department_name || (data?.department_id === 4 ? 'Information Technology' : 'Engineering Department');
      const sem = data?.semester ? `Sem ${data.semester}` : 'Sem 5';
      const yr = data?.year ? `Year ${data.year}` : 'Year 3';

      // Initials
      const initials = name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'ST';

      // Update UI elements
      const elAvatar = document.getElementById('settings-avatar');
      if (elAvatar) elAvatar.textContent = initials;

      const elName = document.getElementById('settings-name');
      if (elName) elName.textContent = name;

      const elDept = document.getElementById('settings-dept');
      if (elDept) elDept.textContent = dept;

      const elReg = document.getElementById('settings-reg-no');
      if (elReg) elReg.textContent = `Reg: ${regNo}`;

      const elYrSem = document.getElementById('settings-year-sem');
      if (elYrSem) elYrSem.textContent = `${yr} • ${sem}`;

      const elRoll = document.getElementById('settings-roll-no');
      if (elRoll) elRoll.textContent = `Roll: ${rollNo}`;

      const elLogoutEmail = document.getElementById('logout-user-email');
      if (elLogoutEmail) elLogoutEmail.textContent = email;

      // Update Advisor info
      if (data?.class_teacher || data?.faculty_advisor) {
        const advisorName = data.class_teacher || data.faculty_advisor;
        const elAdvSub = document.getElementById('settings-advisor-sub');
        if (elAdvSub) elAdvSub.textContent = `Assigned Advisor: ${advisorName}`;

        const elAdvModalName = document.getElementById('advisor-modal-name');
        if (elAdvModalName) elAdvModalName.textContent = advisorName;
      }
    } catch (err) {
      console.warn('Failed to load profile in settings:', err);
    }
  }

  /**
   * Version check & display
   */
  async function initVersionDisplay() {
    let ver = window.VIDYAOS_APP_VERSION || '1.0.95';
    try {
      const r = await fetch('/app-version.json?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        if (j.version) ver = j.version;
      }
    } catch (_) { }

    const label = document.getElementById('app-version-label');
    if (label) {
      label.textContent = `Installed: VidyaOS v${ver} • Release: Stable`;
    }

    const buildStr = document.getElementById('footer-build-string');
    if (buildStr) {
      buildStr.textContent = `Version ${ver} (Build ${new Date().toISOString().slice(0, 10).replace(/-/g, '')}) • All Rights Reserved`;
    }
  }

  /**
   * Manual Check for Updates
   */
  window.checkAppUpdatesManually = async function () {
    const panel = document.getElementById('update-status-panel');
    const inner = document.getElementById('update-status-inner');
    const btn = document.getElementById('btn-check-updates');
    const btnText = document.getElementById('btn-update-text');

    if (!panel || !inner) return;

    panel.style.display = 'block';
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Checking…';

    inner.innerHTML = `
      <div class="update-loading-row">
        <div class="update-spinner"></div>
        <span>Checking institutional release servers for updates…</span>
      </div>
    `;

    try {
      const currentVer = window.VIDYAOS_APP_VERSION || '1.0.95';
      let remoteVer = null;
      let downloadUrl = 'https://github.com/onebotyt/VidyaOS/releases';
      let notes = 'Latest performance optimizations and classroom features.';

      // Try local app-version.json or GitHub API
      try {
        const r = await fetch('/app-version.json?t=' + Date.now(), { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json();
          remoteVer = j.version;
          if (j.apkUrl) downloadUrl = j.apkUrl;
          if (j.releaseNotes) notes = j.releaseNotes;
        }
      } catch (_) { }

      if (!remoteVer && window.VidyaOSMobileBridge) {
        try {
          const r = await fetch(window.VidyaOSMobileBridge.GITHUB_VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' });
          if (r.ok) {
            const j = await r.json();
            remoteVer = j.version;
            if (j.apkUrl) downloadUrl = j.apkUrl;
            if (j.releaseNotes) notes = j.releaseNotes;
          }
        } catch (_) { }
      }

      await new Promise(res => setTimeout(res, 800)); // Smooth feedback

      if (remoteVer && remoteVer !== currentVer) {
        inner.innerHTML = `
          <div class="update-available-box">
            <div style="font-weight:700; color:var(--text-main); font-size:0.92rem; display:flex; align-items:center; gap:6px;">
              <span>🎉</span>
              <span>New Update Available: v${escapeHtml(remoteVer)}</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.4;">${escapeHtml(notes)}</div>
            <div style="margin-top:6px; display:flex; gap:8px;">
              <button type="button" class="btn btn-sm btn-primary" onclick="installUpdate('${escapeHtml(downloadUrl)}')" style="font-weight:700; border-radius:8px;">
                Download &amp; Install Now
              </button>
            </div>
          </div>
        `;
        if (btnText) btnText.textContent = 'Update Available';
      } else {
        inner.innerHTML = `
          <div class="update-success-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>You're running the latest release of VidyaOS (v${escapeHtml(currentVer)})</span>
          </div>
        `;
        if (btnText) btnText.textContent = 'Up to Date';
      }
    } catch (e) {
      inner.innerHTML = `
        <div style="color:var(--text-muted); font-size:0.82rem;">
          Could not reach update server. You are running version ${escapeHtml(window.VIDYAOS_APP_VERSION || '1.0.95')}.
        </div>
      `;
      if (btnText) btnText.textContent = 'Check Updates';
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.installUpdate = function (apkUrl) {
    if (window.NativeAppUpdater && typeof window.NativeAppUpdater.downloadAndInstall === 'function') {
      try {
        window.NativeAppUpdater.downloadAndInstall(apkUrl);
        return;
      } catch (_) { }
    }
    window.open(apkUrl, '_blank');
  };

  /**
   * Theme switcher
   */
  function initThemeSwitch() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'light';
    const label = document.getElementById('theme-mode-text');
    if (label) {
      label.textContent = currentTheme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled';
    }
  }

  window.toggleSettingsTheme = function () {
    const current = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);

    const label = document.getElementById('theme-mode-text');
    if (label) {
      label.textContent = next === 'dark' ? 'Dark mode enabled' : 'Light mode enabled';
    }

    if (typeof window.applySystemBarAppearance === 'function') {
      window.applySystemBarAppearance(next === 'dark');
    }
  };

  /**
   * Load active bug reports count
   */
  async function loadActiveReportsCount() {
    try {
      if (typeof fetchApi !== 'function') return;
      const res = await fetchApi('/bug-reports/my-reports');
      if (res && res.success && Array.isArray(res.data)) {
        const badge = document.getElementById('active-reports-badge');
        if (badge && res.data.length > 0) {
          badge.textContent = res.data.length;
          badge.style.display = 'inline-block';
        }
      }
    } catch (_) { }
  }

  /**
   * Modals Management
   */
  window.promptLogoutConfirmation = function () {
    const m = document.getElementById('logout-modal');
    if (m) m.style.display = 'flex';
  };

  window.closeLogoutModal = function () {
    const m = document.getElementById('logout-modal');
    if (m) m.style.display = 'none';
  };

  window.executeLogout = function () {
    const btn = document.getElementById('btn-confirm-logout');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Signing out…';
    }

    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('student_profile');
      sessionStorage.clear();
    } catch (_) { }

    window.location.href = '/login/index.html';
  };

  window.openAdvisorModal = function () {
    const m = document.getElementById('advisor-modal');
    if (m) m.style.display = 'flex';
  };

  window.closeAdvisorModal = function () {
    const m = document.getElementById('advisor-modal');
    if (m) m.style.display = 'none';
  };

  window.openAttendanceRulesModal = function () {
    const m = document.getElementById('rules-modal');
    if (m) m.style.display = 'flex';
  };

  window.closeAttendanceRulesModal = function () {
    const m = document.getElementById('rules-modal');
    if (m) m.style.display = 'none';
  };

  window.openFeedbackModal = function () {
    window.location.href = '/student/bug-reports/index.html';
  };

  window.downloadOfficialDossier = function () {
    window.location.href = '/student/profile/index.html#docs';
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
