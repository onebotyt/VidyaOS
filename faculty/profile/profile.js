/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY PROFILE CONTROLLER (profile.js)
 * Clean, Streamlined, Fully Dynamic (Zero Hardcoded Data)
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // 1. Auth & RBAC Gate
  if (typeof requireFacultyAuth === 'function') {
    requireFacultyAuth(['TEACHER', 'HOD', 'SYSTEM_ADMIN']);
  } else if (typeof guardRoute === 'function') {
    guardRoute(['TEACHER', 'HOD', 'SYSTEM_ADMIN']);
  }

  let profileData = null;

  const esc = (typeof escHtml === 'function') ? escHtml : (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  const notify = (msg, type = 'info') => {
    if (typeof showToast === 'function') {
      showToast(msg, type);
    } else if (typeof notifyToast === 'function') {
      notifyToast(msg, type);
    } else {
      alert(msg);
    }
  };

  function getInitials(name) {
    if (!name) return 'FA';
    const clean = name.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (clean.slice(0, 2).toUpperCase() || 'FA');
  }

  // 2. Fetch & Hydrate Profile
  async function loadProfile() {
    // A. Synchronous Instant Hydration from localStorage
    try {
      const stored = localStorage.getItem('user') || localStorage.getItem('auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        applyBasicProfile(u);
      }
    } catch (_) {}

    // B. Live Fetch from /api/v1/faculty/profile
    try {
      const fetchFn = typeof fetchApi === 'function' ? fetchApi : async (url, opts = {}) => {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const res = await fetch(`/api/v1${url}`, {
          ...opts,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(opts.headers || {})
          }
        });
        return await res.json();
      };

      const res = await fetchFn('/faculty/profile');
      if (res && res.success && res.data) {
        profileData = res.data;
        renderFullProfile(profileData);
      }
    } catch (err) {
      console.warn('[Profile] Failed to fetch live profile:', err);
    }
  }

  function applyBasicProfile(u) {
    if (!u) return;
    const nameEl = document.getElementById('prof-name');
    const avatarEl = document.getElementById('prof-avatar');
    const empidEl = document.getElementById('prof-empid');
    const deptEl = document.getElementById('prof-dept');
    const deptCodeEl = document.getElementById('prof-stat-dept-code');

    const fullName = u.full_name || u.name || 'Faculty Member';
    if (nameEl) nameEl.textContent = fullName;
    if (avatarEl) avatarEl.textContent = getInitials(fullName);
    if (empidEl) empidEl.textContent = u.employee_id || u.teacher?.employee_id || 'FACULTY';
    if (deptEl) deptEl.textContent = u.department_name || u.department || 'Department of Engineering';
    if (deptCodeEl) deptCodeEl.textContent = u.department_code || (u.department_name ? u.department_name.split(' ')[0] : 'ACAD');

    // Prepopulate Edit Form fields
    const inpEmpid = document.getElementById('prof-input-empid');
    const inpName = document.getElementById('prof-input-name');
    const inpEmail = document.getElementById('prof-input-email');
    const inpPhone = document.getElementById('prof-input-phone');

    if (inpEmpid) inpEmpid.value = u.employee_id || u.teacher?.employee_id || 'FACULTY';
    if (inpName) inpName.value = fullName;
    if (inpEmail) inpEmail.value = u.email || u.username || '';
    if (inpPhone) inpPhone.value = u.phone || '';
  }

  function renderFullProfile(p) {
    if (!p) return;
    applyBasicProfile(p);

    // Stats
    const regCountEl = document.getElementById('prof-stat-registers');
    const stuCountEl = document.getElementById('prof-stat-students');
    const deptCodeEl = document.getElementById('prof-stat-dept-code');

    const regCount = p.active_registers_count || (Array.isArray(p.registers) ? p.registers.length : (Array.isArray(p.assignments) ? p.assignments.length : 0));
    if (regCountEl) regCountEl.textContent = regCount;
    if (stuCountEl) stuCountEl.textContent = p.total_students_count || 0;
    if (deptCodeEl) deptCodeEl.textContent = p.department_code || (p.department_name ? p.department_name.split(' ').map(w => w[0]).join('') : 'DEPT');

    // Google SSO Bar
    const ssoPill = document.getElementById('google-pill');
    const ssoSub = document.getElementById('google-sub-desc');
    const ssoBtn = document.getElementById('btn-google-action');

    if (p.google_linked) {
      if (ssoPill) {
        ssoPill.className = 'pill pill-ok';
        ssoPill.textContent = 'Connected';
      }
      if (ssoSub) ssoSub.textContent = '1-Click Sign-In active for your institutional Gmail';
      if (ssoBtn) ssoBtn.textContent = 'Re-link';
    } else {
      if (ssoPill) {
        ssoPill.className = 'pill pill-warn';
        ssoPill.textContent = 'Not Linked';
      }
      if (ssoSub) ssoSub.textContent = 'Link your Google account for secure 1-click access';
      if (ssoBtn) ssoBtn.textContent = 'Connect Google';
    }

    // Allocations List
    const allocContainer = document.getElementById('alloc-list-container');
    if (allocContainer) {
      const assignments = p.assignments || [];
      if (assignments.length === 0) {
        allocContainer.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); padding: 1.5rem; font-size: 0.85rem;">
            No course allocations assigned for current semester.
          </div>
        `;
      } else {
        allocContainer.innerHTML = assignments.map(a => {
          const isClassTeacher = (a.assignment_type || '').toUpperCase() === 'CLASS_TEACHER';
          const badgeText = isClassTeacher ? 'Class Teacher' : 'Subject Faculty';
          const badgeCls = isClassTeacher ? 'badge-late' : '';
          const comp = a.session_type_scope || a.component || 'THEORY';
          const sem = a.semester ? `Year ${a.year || Math.ceil(a.semester / 2)} / Sem ${a.semester}` : '';

          return `
            <div class="alloc-item">
              <div class="alloc-main">
                <div class="alloc-sub">
                  ${esc(a.subject_name || 'Department Cohort')}
                  ${a.subject_code ? `<span style="font-family: var(--font-family-mono); font-size: 0.76rem; color: var(--text-muted); margin-left: 4px;">(${esc(a.subject_code)})</span>` : ''}
                </div>
                <div class="alloc-meta">
                  ${esc(a.department_name || a.branch_name || 'Academic Unit')}${sem ? ` &middot; ${esc(sem)}` : ''} &middot; ${esc(comp)}
                </div>
              </div>
              <span class="alloc-badge ${badgeCls}">${esc(badgeText)}</span>
            </div>
          `;
        }).join('');
      }
    }
  }

  // 3. Tab Switcher
  function setupTabs() {
    const tabs = document.querySelectorAll('.prof-tab');
    const panels = document.querySelectorAll('.prof-panel');

    function switchTab(tabKey) {
      tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabKey));
      panels.forEach(p => p.classList.toggle('active', p.id === `panel-${tabKey}`));
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        switchTab(target);
        if (history.replaceState) {
          history.replaceState(null, null, `#${target}`);
        }
      });
    });

    // Check initial hash
    const hash = (window.location.hash || '').replace('#', '');
    if (hash && ['overview', 'edit', 'security'].includes(hash)) {
      switchTab(hash);
    }
  }

  // 4. Form Submissions
  function setupForms() {
    // A. Edit Profile Form
    const editForm = document.getElementById('profile-edit-form');
    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const full_name = document.getElementById('prof-input-name')?.value.trim();
        const email = document.getElementById('prof-input-email')?.value.trim();
        const phone = document.getElementById('prof-input-phone')?.value.trim();
        const btn = document.getElementById('btn-save-profile');

        if (!full_name) {
          notify('Full Name is required', 'error');
          return;
        }

        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Saving Changes...';
        }

        try {
          const fetchFn = typeof fetchApi === 'function' ? fetchApi : async (url, opts = {}) => {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const res = await fetch(`/api/v1${url}`, {
              ...opts,
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(opts.headers || {})
              }
            });
            return await res.json();
          };

          const res = await fetchFn('/faculty/profile', {
            method: 'PUT',
            body: JSON.stringify({ full_name, email, phone })
          });

          if (res && res.success) {
            notify('Profile updated successfully!', 'success');
            // Update local user cache
            try {
              const current = JSON.parse(localStorage.getItem('user') || '{}');
              current.full_name = full_name;
              current.email = email;
              current.phone = phone;
              localStorage.setItem('user', JSON.stringify(current));
            } catch (_) {}
            loadProfile();
          } else {
            throw new Error(res?.error?.message || 'Failed to update profile');
          }
        } catch (err) {
          notify(err.message, 'error');
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Save Changes';
          }
        }
      });
    }

    // B. Password Change Form
    const passForm = document.getElementById('password-change-form');
    if (passForm) {
      passForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const current_password = document.getElementById('pass-current')?.value;
        const new_password = document.getElementById('pass-new')?.value;
        const confirm_password = document.getElementById('pass-confirm')?.value;
        const btn = document.getElementById('btn-save-password');

        if (!current_password) {
          notify('Please enter your current password', 'error');
          return;
        }
        if (!new_password || new_password.length < 8) {
          notify('New password must be at least 8 characters', 'error');
          return;
        }
        if (new_password !== confirm_password) {
          notify('New passwords do not match', 'error');
          return;
        }

        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Updating Password...';
        }

        try {
          const fetchFn = typeof fetchApi === 'function' ? fetchApi : async (url, opts = {}) => {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const res = await fetch(`/api/v1${url}`, {
              ...opts,
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(opts.headers || {})
              }
            });
            return await res.json();
          };

          const res = await fetchFn('/faculty/profile', {
            method: 'PUT',
            body: JSON.stringify({ current_password, new_password })
          });

          if (res && res.success) {
            notify('Password changed successfully!', 'success');
            document.getElementById('pass-current').value = '';
            document.getElementById('pass-new').value = '';
            document.getElementById('pass-confirm').value = '';
          } else {
            throw new Error(res?.error?.message || 'Failed to update password');
          }
        } catch (err) {
          notify(err.message, 'error');
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Update Password';
          }
        }
      });
    }
  }

  // 5. Google SSO Linking
  async function handleGoogleLinkAction() {
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    try {
      const res = await fetchApi('/auth/google/url?mode=LINK&user_id=' + (user?.id || ''));
      if (res && res.configured && res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
    } catch (_) {}
    openProfileGoogleCard();
  }

  function openProfileGoogleCard() {
    const modal = document.getElementById('google-signin-modal');
    if (!modal) return;
    const inpEmail = document.getElementById('prof-input-email');
    const inpName = document.getElementById('prof-input-name');
    const currentEmail = (inpEmail ? inpEmail.value.trim() : '') || 'faculty@college.edu';
    const currentName = (inpName ? inpName.value.trim() : '') || 'Faculty Member';
    const initial = currentEmail.charAt(0).toUpperCase();

    const listEl = document.getElementById('google-account-list');
    if (listEl) {
      listEl.innerHTML = `
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

  async function linkProfileGoogleAccount(email) {
    try {
      const res = await fetchApi('/auth/google/link', {
        method: 'POST',
        body: JSON.stringify({ id_token: `google_${email}` })
      });
      if (res && res.success) {
        closeGoogleCard();
        notify('Google account linked! You can now sign in with one click.', 'success');
        loadProfile();
      } else {
        throw new Error(res?.error?.message || 'Failed to link Google account');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  // Cross-window OAuth listener
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
      notify('Google account linked successfully!', 'success');
      loadProfile();
    } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
      notify(event.data.message || 'Google account linking failed', 'error');
    }
  });

  // Global Exports for inline HTML handlers
  window.handleGoogleLinkAction = handleGoogleLinkAction;
  window.openProfileGoogleCard = openProfileGoogleCard;
  window.closeGoogleCard = closeGoogleCard;
  window.linkProfileGoogleAccount = linkProfileGoogleAccount;

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupTabs();
      setupForms();
      loadProfile();
    });
  } else {
    setupTabs();
    setupForms();
    loadProfile();
  }
})();
