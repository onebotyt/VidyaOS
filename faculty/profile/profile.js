/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: PROFILE
 * Location: /faculty/profile/profile.js
 * 
 * Strict Domain Isolation: Encapsulated IIFE execution.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // Auth & RBAC Gate
  if (typeof requireFacultyAuth === 'function') {
    requireFacultyAuth(['TEACHER', 'HOD']);
  } else if (typeof guardRoute === 'function') {
    guardRoute(['TEACHER']);
  }

  let profileData = null;

  const esc = (typeof escHtml === 'function') ? escHtml : (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  const getIcon = (name, opts) => (window.FacultyIcons && typeof window.FacultyIcons.get === 'function') ? window.FacultyIcons.get(name, opts) : '';

  function togglePassVisibility(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp || !btn) return;
    if (inp.type === 'password') {
      inp.type = 'text';
      btn.innerHTML = getIcon('eyeOff', { size: 14 }) || '🙈';
    } else {
      inp.type = 'password';
      btn.innerHTML = getIcon('eye', { size: 14 }) || '👁️';
    }
  }

  async function loadProfile() {
    try {
      const res = await fetchApi('/faculty/profile');
      if (res.success && res.data) {
        profileData = res.data;

        // 1. Hero card
        const fullName = profileData.full_name || 'Faculty Member';
        const elHeroName = document.getElementById('hero-name');
        const elHeroEmpid = document.getElementById('hero-empid');
        const elHeroDept = document.getElementById('hero-dept');
        const elHeroAvatar = document.getElementById('hero-avatar');

        if (elHeroName) elHeroName.textContent = fullName;
        if (elHeroEmpid) elHeroEmpid.textContent = profileData.employee_id || '—';
        if (elHeroDept) elHeroDept.textContent = profileData.department_name || 'Department of Information Technology';

        // Avatar initials
        const cleanName = fullName.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
        const nameParts = cleanName.split(/\s+/).filter(Boolean);
        const initials = nameParts.length >= 2
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : (cleanName.slice(0, 2).toUpperCase() || 'FA');
        if (elHeroAvatar) elHeroAvatar.textContent = initials;

        // Dynamic badges
        const badgesContainer = document.getElementById('hero-badges');
        if (badgesContainer) {
          let badgesHtml = `<span class="role-chip verified">${getIcon('check', { size: 14 })} Verified Account</span>`;
          if (profileData.is_hod) {
            badgesHtml += `<span class="role-chip hod">Head of Department (${esc(profileData.hod_department_name || profileData.department_code || 'Dept')})</span>`;
          }
          if (profileData.department_name || profileData.department_code) {
            badgesHtml += `<span class="role-chip class-teacher">${esc(profileData.department_code || 'Dept')} Faculty</span>`;
          }
          badgesHtml += `<span class="role-chip subject">${getIcon('registers', { size: 14 })} Subject Faculty</span>`;
          badgesContainer.innerHTML = badgesHtml;
        }

        // 2. Metrics strip
        const elStatReg = document.getElementById('stat-registers');
        const elStatStu = document.getElementById('stat-students');
        const elStatDept = document.getElementById('stat-dept');
        const elStatDeptCode = document.getElementById('stat-dept-code');

        if (elStatReg) elStatReg.textContent = profileData.active_registers_count || profileData.registers?.length || 0;
        if (elStatStu) elStatStu.textContent = profileData.total_students_count || 'Cohort';
        if (elStatDept) elStatDept.textContent = profileData.department_name || 'Faculty';
        if (elStatDeptCode) elStatDeptCode.textContent = `Code: ${profileData.department_code || 'CS'}`;

        // Form fields
        const elEmpId = document.getElementById('prof-empid');
        const elProfName = document.getElementById('prof-name');
        const elProfEmail = document.getElementById('prof-email');
        const elProfPhone = document.getElementById('prof-phone');

        if (elEmpId) elEmpId.value = profileData.employee_id || '—';
        if (elProfName) elProfName.value = fullName;
        if (elProfEmail) elProfEmail.value = profileData.email || profileData.username || '';
        if (elProfPhone) elProfPhone.value = profileData.phone || '';

        // 3. Google Status
        const badge = document.getElementById('google-status-badge');
        const statGoogle = document.getElementById('stat-google');
        const btn = document.getElementById('btn-google-action');
        if (badge && statGoogle && btn) {
          if (profileData.google_linked) {
            badge.className = 'badge badge-present';
            badge.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;">${getIcon('check', { size: 14 })} Connected</span>`;
            statGoogle.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;">${getIcon('check', { size: 14 })} Connected</span>`;
            statGoogle.style.color = '#16a34a';
            btn.className = 'btn btn-secondary btn-sm';
            btn.textContent = 'Re-link Google';
          } else {
            badge.className = 'badge badge-absent';
            badge.textContent = 'Not Connected';
            statGoogle.textContent = 'Not Linked';
            statGoogle.style.color = '#dc2626';
            btn.className = 'btn btn-primary btn-sm';
            btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;">${getIcon('link', { size: 14 })}<span>Connect Google Account</span></span>`;
          }
        }

        // 4. Teaching allocations table
        const tbody = document.getElementById('assignments-tbody');
        if (tbody) {
          const assignments = profileData.assignments || [];
          if (!assignments.length) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No active course teaching allocations found.</td></tr>`;
          } else {
            tbody.innerHTML = assignments.map(a => `
              <tr>
                <td>
                  <span class="badge ${a.assignment_type === 'CLASS_TEACHER' ? 'badge-late' : 'badge-present'}" style="font-size: 0.72rem;">
                    ${a.assignment_type === 'CLASS_TEACHER' ? 'Class Teacher' : 'Subject Faculty'}
                  </span>
                </td>
                <td style="font-weight: 700;">
                  ${esc(a.subject_name || 'Full Cohort Roster')}
                  ${a.subject_code ? `<span style="font-family: var(--font-family-mono); font-size: 0.75rem; color: #64748b; margin-left: 4px;">(${esc(a.subject_code)})</span>` : ''}
                </td>
                <td>${esc(a.department_name || a.branch_name || 'Engineering')}</td>
                <td style="text-align: center; font-weight: 700;">Year ${esc(a.year)} / Sem ${esc(a.semester)}</td>
                <td style="text-align: center;">
                  <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.7rem;">
                    ${esc(a.session_type_scope || 'THEORY')}
                  </span>
                </td>
              </tr>
            `).join('');
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleGoogleLinkAction() {
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    try {
      const res = await fetchApi('/auth/google/url?mode=LINK&user_id=' + (user?.id || ''));
      if (res.configured && res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
    } catch (_) {}
    openProfileGoogleCard();
  }

  function openProfileGoogleCard() {
    const modal = document.getElementById('google-signin-modal');
    const errorBox = document.getElementById('google-card-error');
    if (!modal) return;
    if (errorBox) errorBox.style.display = 'none';

    const acctView = document.getElementById('google-accounts-view');
    const inputView = document.getElementById('google-input-view');
    const loadView = document.getElementById('google-loading-view');
    const manEmail = document.getElementById('google-manual-email');

    if (acctView) acctView.style.display = 'block';
    if (inputView) inputView.style.display = 'none';
    if (loadView) loadView.style.display = 'none';
    if (manEmail) manEmail.value = '';

    const elEmail = document.getElementById('prof-email');
    const elName = document.getElementById('prof-name');
    const currentEmail = (elEmail ? elEmail.value.trim() : '') || 'faculty@college.edu';
    const currentName = (elName ? elName.value.trim() : '') || 'Faculty Member';
    const initial = currentEmail.charAt(0).toUpperCase();

    const accountList = document.getElementById('google-account-list');
    if (accountList) {
      accountList.innerHTML = `
        <li class="google-account-item" onclick="linkProfileGoogleAccount('${esc(currentEmail)}')">
          <div class="google-account-avatar">${esc(initial)}</div>
          <div class="google-account-details">
            <div class="google-account-name">${esc(currentName)}</div>
            <div class="google-account-email">${esc(currentEmail)}</div>
          </div>
          <span class="google-signed-in-badge">Matching Profile</span>
        </li>
      `;
    }

    modal.style.display = 'flex';
  }

  function closeGoogleCard() {
    const modal = document.getElementById('google-signin-modal');
    if (modal) modal.style.display = 'none';
  }

  function showGoogleEmailInput() {
    const acct = document.getElementById('google-accounts-view');
    const inp = document.getElementById('google-input-view');
    const man = document.getElementById('google-manual-email');
    if (acct) acct.style.display = 'none';
    if (inp) inp.style.display = 'block';
    if (man) man.focus();
  }

  function showGoogleAccountList() {
    const inp = document.getElementById('google-input-view');
    const acct = document.getElementById('google-accounts-view');
    const err = document.getElementById('google-card-error');
    if (inp) inp.style.display = 'none';
    if (acct) acct.style.display = 'block';
    if (err) err.style.display = 'none';
  }

  function submitProfileGoogleEmail() {
    const el = document.getElementById('google-manual-email');
    const email = el ? el.value.trim() : '';
    if (!email || !email.includes('@')) {
      const errorBox = document.getElementById('google-card-error');
      if (errorBox) {
        errorBox.textContent = 'Please enter a valid Google email address.';
        errorBox.style.display = 'block';
      }
      return;
    }
    linkProfileGoogleAccount(email);
  }

  async function linkProfileGoogleAccount(email) {
    const acct = document.getElementById('google-accounts-view');
    const inp = document.getElementById('google-input-view');
    const load = document.getElementById('google-loading-view');
    const err = document.getElementById('google-card-error');

    if (acct) acct.style.display = 'none';
    if (inp) inp.style.display = 'none';
    if (load) load.style.display = 'block';
    if (err) err.style.display = 'none';

    try {
      const res = await fetchApi('/auth/google/link', {
        method: 'POST',
        body: JSON.stringify({ id_token: `google_${email}` })
      });

      if (res.success) {
        closeGoogleCard();
        if (typeof showToast === 'function') {
          showToast('Google account linked! You can now sign in with one click.', 'success');
        }
        loadProfile();
      }
    } catch (error) {
      if (load) load.style.display = 'none';
      if (acct) acct.style.display = 'block';
      if (err) {
        err.textContent = error.message || 'Google account linking failed. Google email must match your registered faculty email.';
        err.style.display = 'block';
      }
    }
  }

  // Bind forms
  function setupForms() {
    const profForm = document.getElementById('profile-form');
    if (profForm) {
      profForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const full_name = document.getElementById('prof-name')?.value.trim();
        const email = document.getElementById('prof-email')?.value.trim();
        const phone = document.getElementById('prof-phone')?.value.trim();
        const btn = document.getElementById('save-prof-btn');
        if (btn) btn.disabled = true;

        try {
          const res = await fetchApi('/faculty/profile', {
            method: 'PUT',
            body: JSON.stringify({ full_name, email, phone })
          });
          if (res.success) {
            if (typeof showToast === 'function') showToast('Profile updated successfully', 'success');
            loadProfile();
          }
        } catch (_) {
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }

    const passForm = document.getElementById('password-form');
    if (passForm) {
      passForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const current_password = document.getElementById('pass-current')?.value;
        const new_password = document.getElementById('pass-new')?.value;
        const confirm_password = document.getElementById('pass-confirm')?.value;

        if (new_password !== confirm_password) {
          if (typeof showToast === 'function') showToast('New passwords do not match', 'error');
          return;
        }

        const btn = document.getElementById('save-pass-btn');
        if (btn) btn.disabled = true;

        try {
          const res = await fetchApi('/faculty/profile', {
            method: 'PUT',
            body: JSON.stringify({ current_password, new_password })
          });
          if (res.success) {
            if (typeof showToast === 'function') showToast('Password changed successfully!', 'success');
            const p1 = document.getElementById('pass-current');
            const p2 = document.getElementById('pass-new');
            const p3 = document.getElementById('pass-confirm');
            if (p1) p1.value = '';
            if (p2) p2.value = '';
            if (p3) p3.value = '';
          }
        } catch (_) {
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }
  }

  // Cross-window OAuth listener
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
      if (typeof showToast === 'function') showToast('Google account linked successfully!', 'success');
      loadProfile();
    } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
      if (typeof showToast === 'function') showToast(event.data.message || 'Google account linking failed', 'error');
    }
  });

  // Export functions bound to DOM events
  window.togglePassVisibility = togglePassVisibility;
  window.handleGoogleLinkAction = handleGoogleLinkAction;
  window.openProfileGoogleCard = openProfileGoogleCard;
  window.closeGoogleCard = closeGoogleCard;
  window.showGoogleEmailInput = showGoogleEmailInput;
  window.showGoogleAccountList = showGoogleAccountList;
  window.submitProfileGoogleEmail = submitProfileGoogleEmail;
  window.linkProfileGoogleAccount = linkProfileGoogleAccount;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupForms();
      loadProfile();
    });
  } else {
    setupForms();
    loadProfile();
  }
})();
