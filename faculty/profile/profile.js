/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: PROFILE
 * frontend/faculty/profile/profile.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['TEACHER']);

    let profileData = null;

    function togglePassVisibility(inputId, btn) {
      const inp = document.getElementById(inputId);
      if (!inp) return;
      if (inp.type === 'password') {
        inp.type = 'text';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
      } else {
        inp.type = 'password';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      }
    }

    async function loadProfile() {
      try {
        const res = await fetchApi('/faculty/profile');
        if (res.success && res.data) {
          profileData = res.data;

          // 1. Hero card
          const fullName = profileData.full_name || 'Faculty Member';
          document.getElementById('hero-name').innerText = fullName;
          document.getElementById('hero-empid').innerText = profileData.employee_id || '—';
          document.getElementById('hero-dept').innerText = profileData.department_name || 'Department of Information Technology';

          // Avatar initials (strip honorifics so Dr. Rajesh Sharma => RS)
          const cleanName = fullName.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
          const nameParts = cleanName.split(/\s+/).filter(Boolean);
          const initials = nameParts.length >= 2 
            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
            : (cleanName.slice(0, 2).toUpperCase() || 'FA');
          document.getElementById('hero-avatar').innerText = initials;

          // Dynamic badges
          const badgesContainer = document.getElementById('hero-badges');
          let badgesHtml = '<span class="role-chip verified"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Verified Account</span>';
          if (profileData.is_hod) {
            badgesHtml += `<span class="role-chip hod">Head of Department (${profileData.hod_department_name || profileData.department_code || 'Dept'})</span>`;
          }
          if (profileData.department_name || profileData.department_code) {
            badgesHtml += `<span class="role-chip class-teacher">${profileData.department_code || 'Dept'} Faculty</span>`;
          }
          badgesHtml += `<span class="role-chip subject"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> Subject Faculty</span>`;
          badgesContainer.innerHTML = badgesHtml;

          // 2. Metrics strip
          document.getElementById('stat-registers').innerText = profileData.active_registers_count || profileData.registers?.length || 0;
          document.getElementById('stat-students').innerText = profileData.total_students_count || 'Cohort';
          document.getElementById('stat-dept').innerText = profileData.department_name || 'Faculty';
          document.getElementById('stat-dept-code').innerText = `Code: ${profileData.department_code || 'CS'}`;

          // Form fields
          document.getElementById('prof-empid').value = profileData.employee_id || '—';
          document.getElementById('prof-name').value = fullName;
          document.getElementById('prof-email').value = profileData.email || profileData.username || '';
          document.getElementById('prof-phone').value = profileData.phone || '';

          // 3. Google Status
          const badge = document.getElementById('google-status-badge');
          const statGoogle = document.getElementById('stat-google');
          const btn = document.getElementById('btn-google-action');
          if (profileData.google_linked) {
            badge.className = 'badge badge-present';
            badge.innerHTML = '<span style="display:inline-flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Connected</span>';
            statGoogle.innerHTML = '<span style="display:inline-flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Connected</span>';
            statGoogle.style.color = '#16a34a';
            btn.className = 'btn btn-secondary btn-sm';
            btn.innerText = 'Re-link Google';
          } else {
            badge.className = 'badge badge-absent';
            badge.innerText = 'Not Connected';
            statGoogle.innerText = 'Not Linked';
            statGoogle.style.color = '#dc2626';
            btn.className = 'btn btn-primary btn-sm';
            btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg><span>Connect Google Account</span></span>';
          }

          // 4. Teaching allocations table
          const tbody = document.getElementById('assignments-tbody');
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
                  ${a.subject_name || 'Full Cohort Roster'}
                  ${a.subject_code ? `<span style="font-family: var(--font-family-mono); font-size: 0.75rem; color: #64748b; margin-left: 4px;">(${a.subject_code})</span>` : ''}
                </td>
                <td>${a.department_name || a.branch_name || 'Engineering'}</td>
                <td style="text-align: center; font-weight: 700;">Year ${a.year} / Sem ${a.semester}</td>
                <td style="text-align: center;">
                  <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.7rem;">
                    ${a.session_type_scope || 'THEORY'}
                  </span>
                </td>
              </tr>
            `).join('');
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    async function handleGoogleLinkAction() {
      const user = getCurrentUser();
      try {
        const res = await fetchApi('/auth/google/url?mode=LINK&user_id=' + (user?.id || ''));
        if (res.configured && res.data?.url) {
          window.location.href = res.data.url;
          return;
        }
      } catch {}
      openProfileGoogleCard();
    }

    // Listen for OAuth completion
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        showToast('Google account linked successfully!', 'success');
        loadProfile();
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        showToast(event.data.message || 'Google account linking failed', 'error');
      }
    });

    function openProfileGoogleCard() {
      const modal = document.getElementById('google-signin-modal');
      const errorBox = document.getElementById('google-card-error');
      errorBox.style.display = 'none';

      document.getElementById('google-accounts-view').style.display = 'block';
      document.getElementById('google-input-view').style.display = 'none';
      document.getElementById('google-loading-view').style.display = 'none';
      document.getElementById('google-manual-email').value = '';

      const currentEmail = document.getElementById('prof-email').value.trim() || 'faculty@college.edu';
      const currentName = document.getElementById('prof-name').value.trim() || 'Faculty Member';
      const initial = currentEmail.charAt(0).toUpperCase();

      const accountList = document.getElementById('google-account-list');
      accountList.innerHTML = `
        <li class="google-account-item" onclick="linkProfileGoogleAccount('${currentEmail}')">
          <div class="google-account-avatar">${initial}</div>
          <div class="google-account-details">
            <div class="google-account-name">${currentName}</div>
            <div class="google-account-email">${currentEmail}</div>
          </div>
          <span class="google-signed-in-badge">Matching Profile</span>
        </li>
      `;

      modal.style.display = 'flex';
    }

    function closeGoogleCard() {
      document.getElementById('google-signin-modal').style.display = 'none';
    }

    function showGoogleEmailInput() {
      document.getElementById('google-accounts-view').style.display = 'none';
      document.getElementById('google-input-view').style.display = 'block';
      document.getElementById('google-manual-email').focus();
    }

    function showGoogleAccountList() {
      document.getElementById('google-input-view').style.display = 'none';
      document.getElementById('google-accounts-view').style.display = 'block';
      document.getElementById('google-card-error').style.display = 'none';
    }

    function submitProfileGoogleEmail() {
      const email = document.getElementById('google-manual-email').value.trim();
      if (!email || !email.includes('@')) {
        const errorBox = document.getElementById('google-card-error');
        errorBox.innerText = 'Please enter a valid Google email address.';
        errorBox.style.display = 'block';
        return;
      }
      linkProfileGoogleAccount(email);
    }

    async function linkProfileGoogleAccount(email) {
      document.getElementById('google-accounts-view').style.display = 'none';
      document.getElementById('google-input-view').style.display = 'none';
      document.getElementById('google-loading-view').style.display = 'block';
      document.getElementById('google-card-error').style.display = 'none';

      try {
        const res = await fetchApi('/auth/google/link', {
          method: 'POST',
          body: JSON.stringify({ id_token: `google_${email}` })
        });

        if (res.success) {
          closeGoogleCard();
          showToast('Google account linked! You can now sign in with one click.', 'success');
          loadProfile();
        }
      } catch (err) {
        document.getElementById('google-loading-view').style.display = 'none';
        document.getElementById('google-accounts-view').style.display = 'block';
        const errorBox = document.getElementById('google-card-error');
        errorBox.innerText = err.message || 'Google account linking failed. Google email must match your registered faculty email.';
        errorBox.style.display = 'block';
      }
    }

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const full_name = document.getElementById('prof-name').value.trim();
      const email = document.getElementById('prof-email').value.trim();
      const phone = document.getElementById('prof-phone').value.trim();
      const btn = document.getElementById('save-prof-btn');
      btn.disabled = true;

      try {
        const res = await fetchApi('/faculty/profile', {
          method: 'PUT',
          body: JSON.stringify({ full_name, email, phone })
        });
        if (res.success) {
          showToast('Profile updated successfully', 'success');
          loadProfile();
        }
      } catch (err) {
        // Handled by toast
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('password-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const current_password = document.getElementById('pass-current').value;
      const new_password = document.getElementById('pass-new').value;
      const confirm_password = document.getElementById('pass-confirm').value;

      if (new_password !== confirm_password) {
        showToast('New passwords do not match', 'error');
        return;
      }

      const btn = document.getElementById('save-pass-btn');
      btn.disabled = true;

      try {
        const res = await fetchApi('/faculty/profile', {
          method: 'PUT',
          body: JSON.stringify({ current_password, new_password })
        });
        if (res.success) {
          showToast('Password changed successfully!', 'success');
          document.getElementById('pass-current').value = '';
          document.getElementById('pass-new').value = '';
          document.getElementById('pass-confirm').value = '';
        }
      } catch (err) {
        // Handled by toast
      } finally {
        btn.disabled = false;
      }
    });

    loadProfile();

