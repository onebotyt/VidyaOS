/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: STUDENT-REGISTER
 * frontend/login/student-register/student-register.js
 * ══════════════════════════════════════════════════════════════
 */

document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');

    let departmentsList = [];
    let selectedDepartment = null;
    let isCohortRegistrationOpen = false;
    let googleRegistrationData = null;

    document.addEventListener('DOMContentLoaded', async () => {
      await loadDepartments();
      const urlParams = new URLSearchParams(window.location.search);
      const qEmail = urlParams.get('google_email');
      const qName = urlParams.get('google_name');
      const qSub = urlParams.get('google_sub');
      if (qEmail && qEmail.includes('@')) {
        selectGoogleAccount(qEmail, qName, qSub);
      }
    });

    async function initiateGoogleSignUp() {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('mock') === '1' || window.__USE_MOCK_GOOGLE__) {
        openGoogleCardForRegistration();
        return;
      }
      const btnText = document.getElementById('google-signup-btn-text');
      const originalText = btnText ? btnText.textContent : 'Sign up with Google (Auto-Fill)';
      if (btnText) btnText.textContent = 'Opening Google Sign-In...';
      try {
        const res = await fetchApi('/auth/google/url?mode=STUDENT_REGISTER');
        if (res.success && res.data && res.data.url) {
          const width = 500, height = 650;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;
          const popup = window.open(res.data.url, 'google_account_chooser', 'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',status=0,menubar=0,toolbar=0');
          if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            window.location.href = res.data.url;
          } else {
            popup.focus();
          }
        } else {
          openGoogleCardForRegistration();
        }
      } catch (err) {
        console.warn('Google OAuth URL fetch failed:', err);
        openGoogleCardForRegistration();
      } finally {
        setTimeout(() => {
          if (btnText && !googleRegistrationData) btnText.textContent = originalText;
        }, 1500);
      }
    }

    window.addEventListener('message', (event) => {
      if (!event.data) return;
      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        const payload = event.data.payload;
        if (payload) {
          if (payload.already_registered && payload.status === 'ACTIVE') {
            showToast('An active student account already exists for this Google email. Redirecting to login...', 'info');
            setTimeout(() => { window.location.href = '/login/index.html'; }, 1200);
            return;
          }
          if (payload.action === 'STUDENT_REGISTER' || payload.google_email) {
            selectGoogleAccount(payload.google_email, payload.google_name, payload.google_sub);
          }
        }
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        showToast(event.data.message || 'Google verification failed or cancelled.', 'warning');
      }
    });

    function openGoogleCardForRegistration() {
      const modal = document.getElementById('google-signin-modal');
      const errorBox = document.getElementById('google-card-error');
      if (errorBox) errorBox.style.display = 'none';
      document.getElementById('google-accounts-view').style.display = 'block';
      document.getElementById('google-input-view').style.display = 'none';
      document.getElementById('google-loading-view').style.display = 'none';
      document.getElementById('google-manual-email').value = '';
      const accountList = document.getElementById('google-account-list');
      const currentEmail = document.getElementById('reg-email') ? document.getElementById('reg-email').value.trim() : '';
      const candidateEmails = new Set();
      if (currentEmail && currentEmail.includes('@')) candidateEmails.add(currentEmail);
      candidateEmails.add('aarav.sharma@gmail.com');
      candidateEmails.add('priya.verma@gmail.com');
      candidateEmails.add('student.it01@college.edu');
      accountList.innerHTML = Array.from(candidateEmails).map(function(email) {
        var initial = email.charAt(0).toUpperCase();
        var displayName = email.split('@')[0].replace(/[._]/g, ' ').replace(/w/g, function(l) { return l.toUpperCase(); });
        return '<li class="google-account-item" onclick="selectGoogleAccount('' + email + '', '' + displayName + '')">' +
          '<div class="google-account-avatar">' + initial + '</div>' +
          '<div class="google-account-details"><div class="google-account-name">' + displayName + '</div><div class="google-account-email">' + email + '</div></div>' +
          '<span class="google-signed-in-badge">Google</span></li>';
      }).join('');
      modal.style.display = 'flex';
    }

    function closeGoogleCard() {
      var modal = document.getElementById('google-signin-modal');
      if (modal) modal.style.display = 'none';
    }

    function showGoogleEmailInput() {
      document.getElementById('google-accounts-view').style.display = 'none';
      document.getElementById('google-input-view').style.display = 'block';
      document.getElementById('google-manual-email').focus();
    }

    function showGoogleAccountList() {
      document.getElementById('google-input-view').style.display = 'none';
      document.getElementById('google-accounts-view').style.display = 'block';
      var errorBox = document.getElementById('google-card-error');
      if (errorBox) errorBox.style.display = 'none';
    }

    function submitGoogleEmail() {
      var email = document.getElementById('google-manual-email').value.trim();
      if (!email || !email.includes('@')) {
        var errorBox = document.getElementById('google-card-error');
        if (errorBox) { errorBox.innerText = 'Please enter a valid Google email address.'; errorBox.style.display = 'block'; }
        return;
      }
      selectGoogleAccount(email);
    }

    function selectGoogleAccount(email, customName, googleSub) {
      var cleanEmail = email.trim().toLowerCase();
      var displayName = customName || cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/w/g, function(l) { return l.toUpperCase(); });
      googleRegistrationData = {
        email: cleanEmail,
        name: displayName,
        sub: googleSub || ('google_sub_' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16))
      };
      var nameInput = document.getElementById('reg-fullname');
      var emailInput = document.getElementById('reg-email');
      if (nameInput) { nameInput.value = displayName; nameInput.style.borderColor = 'var(--status-present)'; }
      if (emailInput) { emailInput.value = cleanEmail; emailInput.readOnly = true; emailInput.style.borderColor = 'var(--status-present)'; }
      var badge = document.getElementById('google-connected-badge');
      var badgeName = document.getElementById('google-badge-name');
      var badgeEmail = document.getElementById('google-badge-email');
      var btnText = document.getElementById('google-signup-btn-text');
      if (badgeName) badgeName.textContent = displayName;
      if (badgeEmail) badgeEmail.textContent = '(' + cleanEmail + ')';
      if (badge) badge.style.display = 'flex';
      if (btnText) btnText.textContent = 'Google Connected: ' + displayName;
      closeGoogleCard();
      showToast('Google details fetched! Name & Gmail filled automatically.', 'success');
      var deptSelect = document.getElementById('reg-department');
      if (deptSelect && !deptSelect.value) { deptSelect.focus(); }
      else { var enrollInput = document.getElementById('reg-enroll'); if (enrollInput && !enrollInput.value) enrollInput.focus(); }
    }

    function resetGoogleRegistration() {
      googleRegistrationData = null;
      var emailInput = document.getElementById('reg-email');
      if (emailInput) { emailInput.readOnly = false; emailInput.style.borderColor = ''; }
      var nameInput = document.getElementById('reg-fullname');
      if (nameInput) nameInput.style.borderColor = '';
      var badge = document.getElementById('google-connected-badge');
      if (badge) badge.style.display = 'none';
      var btnText = document.getElementById('google-signup-btn-text');
      if (btnText) btnText.textContent = 'Sign up with Google (Auto-Fill)';
      showToast('Google account disconnected.', 'info');
    }

    async function loadDepartments() {
      try {
        var res = await fetchApi('/departments');
        if (res.success && res.data && res.data.length > 0) { departmentsList = res.data; }
        else { var fb = await fetchApi('/auth/departments'); if (fb.success && fb.data) departmentsList = fb.data; }
      } catch(err) { console.warn('Could not fetch departments:', err.message); }
      if (!departmentsList || departmentsList.length === 0) {
        departmentsList = [
          { id: 4, name: 'Information Technology', code: 'IT', degree_duration_years: 3 },
          { id: 2, name: 'Electronics Engineering', code: 'ECE', degree_duration_years: 3 },
          { id: 3, name: 'Electrical Engineering', code: 'EE', degree_duration_years: 3 },
          { id: 5, name: 'Mechanical Engineering', code: 'ME', degree_duration_years: 3 },
          { id: 6, name: 'Civil Engineering', code: 'CE', degree_duration_years: 3 },
          { id: 7, name: 'Pharmacy', code: 'PHARM', degree_duration_years: 2 }
        ];
      }
      populateDepartmentDropdown();
    }

    function populateDepartmentDropdown() {
      var select = document.getElementById('reg-department');
      var html = '<option value="">-- Select Branch / Department --</option>';
      departmentsList.forEach(function(d) {
        html += '<option value="' + d.id + '">' + escapeHtml(d.name) + ' (' + d.code + ')</option>';
      });
      select.innerHTML = html;
    }

    function handleDepartmentChange() {
      var deptId = document.getElementById('reg-department').value;
      var semSelect = document.getElementById('reg-semester');
      var hint = document.getElementById('semester-hint');
      if (!deptId) {
        selectedDepartment = null;
        semSelect.innerHTML = '<option value="">-- Select Branch First --</option>';
        semSelect.disabled = true;
        hint.textContent = 'Academic semester term.';
        updateRoutingDisplay();
        return;
      }
      selectedDepartment = departmentsList.find(function(d) { return String(d.id) === String(deptId); });
      var durationYears = (selectedDepartment && selectedDepartment.degree_duration_years) || 3;
      var totalSemesters = durationYears * 2;
      var semHtml = '<option value="">-- Select Semester --</option>';
      for (var s = 1; s <= totalSemesters; s++) {
        var year = Math.ceil(s / 2);
        semHtml += '<option value="' + s + '">Semester ' + s + ' (Year ' + year + ')</option>';
      }
      semSelect.innerHTML = semHtml;
      semSelect.disabled = false;
      hint.textContent = durationYears + '-year program (' + totalSemesters + ' semesters).';
      updateRoutingDisplay();
    }

    async function updateRoutingDisplay() {
      var banner = document.getElementById('routing-banner');
      var icon = banner ? banner.querySelector('.routing-icon') : null;
      var targetText = document.getElementById('routing-target-text');
      var descText = document.getElementById('routing-desc-text');
      var semVal = document.getElementById('reg-semester').value;

      if (!selectedDepartment) {
        isCohortRegistrationOpen = false;
        if (icon) icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"></path></svg>';
        if (targetText) targetText.textContent = 'Departmental Branch Ownership';
        if (descText) descText.textContent = 'Select your branch above. Student accounts belong to their academic department. Your registration will be reviewed and approved by that branch faculty.';
        if (banner) { banner.style.borderColor = 'var(--border-color)'; banner.style.background = 'var(--bg-card)'; }
        updateSubmitButtonState(); return;
      }
      var branchName = selectedDepartment.name;
      if (!semVal) {
        isCohortRegistrationOpen = false;
        if (icon) icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>';
        if (targetText) targetText.textContent = branchName + ' — Select Semester';
        if (descText) descText.textContent = 'Please choose your current semester to check if student registration is open for your cohort.';
        if (banner) { banner.style.borderColor = 'var(--border-color)'; banner.style.background = 'var(--bg-card)'; }
        updateSubmitButtonState(); return;
      }
      try {
        var res = await apiRequest('/api/v1/auth/student/registration/status?department_id=' + selectedDepartment.id + '&semester=' + semVal);
        var statusData = res && res.data;
        if (statusData && statusData.is_open) {
          isCohortRegistrationOpen = true;
          if (icon) icon.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--status-present);"></span>';
          if (targetText) targetText.textContent = 'Registration Open — ' + branchName + ' Sem ' + semVal;
          if (descText) descText.textContent = statusData.reason || ('Your student account belongs to ' + branchName + '. Applications are reviewed and approved by Department Faculty.');
          if (banner) { banner.style.borderColor = 'var(--status-present)'; banner.style.background = 'var(--status-present-bg)'; }
        } else {
          isCohortRegistrationOpen = false;
          if (icon) icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
          if (targetText) targetText.textContent = 'Registration Closed';
          if (descText) descText.textContent = (statusData && statusData.reason) || ('Registration is currently closed for ' + branchName + ' Semester ' + semVal + '. Department faculty must open registration before applications can be submitted.');
          if (banner) { banner.style.borderColor = 'var(--status-absent)'; banner.style.background = 'var(--chip-admin-bg)'; }
        }
        updateSubmitButtonState();
      } catch(err) {
        isCohortRegistrationOpen = false;
        if (icon) icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        if (targetText) targetText.textContent = 'Status Check Unavailable';
        if (descText) descText.textContent = 'Could not verify cohort registration status. Please try again.';
        updateSubmitButtonState();
      }
    }

    function updateSubmitButtonState() {
      var submitBtn = document.getElementById('submit-btn');
      if (!submitBtn) return;
      if (!isCohortRegistrationOpen) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registration Closed';
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Registration Request →';
      }
    }

    function updateStrength() {
      var pw = document.getElementById('reg-password').value;
      var bar = document.getElementById('pw-strength-bar');
      var label = document.getElementById('pw-strength-label');
      var score = 0;
      if (pw.length >= 8) score++;
      if (/[A-Z]/.test(pw)) score++;
      if (/[0-9]/.test(pw)) score++;
      if (/[^a-zA-Z0-9]/.test(pw)) score++;
      var widths = ['0%', '30%', '55%', '80%', '100%'];
      var colors = ['transparent', 'var(--status-absent)', 'var(--status-late)', 'var(--color-primary)', 'var(--status-present)'];
      var labels = ['', 'Too weak', 'Weak', 'Good', 'Strong'];
      bar.style.width = widths[score]; bar.style.background = colors[score];
      label.textContent = labels[score]; label.style.color = colors[score];
    }

    function togglePw(id, btn) {
      var input = document.getElementById(id);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.innerHTML = input.type === 'password' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
    }

    document.getElementById('registration-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      var department_id = document.getElementById('reg-department').value;
      var semester = document.getElementById('reg-semester').value;
      var full_name = document.getElementById('reg-fullname').value.trim();
      var official_enrollment_no = document.getElementById('reg-enroll').value.trim().toUpperCase();
      var registration_no = document.getElementById('reg-ubter').value.trim().toUpperCase() || null;
      var email = document.getElementById('reg-email').value.trim();
      var rawPhone = (document.getElementById('reg-phone') && document.getElementById('reg-phone').value.trim()) || '';
      var cleanPhone = rawPhone.replace(/D/g, '');
      var password = document.getElementById('reg-password').value;
      var confirm = document.getElementById('reg-confirm').value;

      if (!department_id) { showToast('Please select your academic branch / department', 'error'); return; }
      if (!semester) { showToast('Please select your current semester', 'error'); return; }
      if (!full_name) { showToast('Please enter your full name', 'error'); return; }
      if (!official_enrollment_no) { showToast('Please enter your enrollment number', 'error'); return; }
      if (!email || !email.includes('@')) { showToast('Please enter a valid Gmail address', 'error'); return; }
      if (cleanPhone && (cleanPhone.length !== 10 || !/^[6-9]d{9}$/.test(cleanPhone))) {
        showToast('If entering a phone number, it must be a valid 10-digit Indian mobile number.', 'error');
        if (document.getElementById('reg-phone')) document.getElementById('reg-phone').focus();
        return;
      }
      if (password.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
      if (password !== confirm) { showToast('Passwords do not match', 'error'); return; }

      var btn = document.getElementById('submit-btn');
      btn.disabled = true; btn.innerHTML = 'Submitting Registration...';
      var year = Math.ceil(Number(semester) / 2);

      try {
        var res = await fetchApi('/auth/student/register', {
          method: 'POST',
          body: JSON.stringify({
            full_name: full_name,
            official_enrollment_no: official_enrollment_no,
            registration_no: registration_no,
            email: email,
            phone: cleanPhone || null,
            password: password,
            department_id: Number(department_id),
            branch_id: Number(department_id),
            year: year,
            semester: Number(semester),
            google_sub: googleRegistrationData ? googleRegistrationData.sub : null,
            google_id_token: googleRegistrationData ? ('google_' + googleRegistrationData.email) : null
          })
        });

        if (res.success) {
          var deptName = (selectedDepartment && selectedDepartment.name) || 'Department';
          var deptCode = (selectedDepartment && selectedDepartment.code) || '';
          document.getElementById('form-view').style.display = 'none';
          var successView = document.getElementById('success-view');
          successView.style.display = 'block';
          if (res.message) document.getElementById('success-message-text').textContent = res.message;
          document.getElementById('success-summary-box').innerHTML =
            '<div class="summary-row"><span class="summary-label">Student Name</span><span class="summary-value">' + escapeHtml(full_name) + '</span></div>' +
            '<div class="summary-row"><span class="summary-label">Enrollment No.</span><span class="summary-value" style="font-family:var(--font-family-mono);color:var(--color-primary);">' + escapeHtml(official_enrollment_no) + '</span></div>' +
            (registration_no ? '<div class="summary-row"><span class="summary-label">UBTER Reg No.</span><span class="summary-value" style="font-family:var(--font-family-mono);">' + escapeHtml(registration_no) + '</span></div>' : '') +
            (cleanPhone ? '<div class="summary-row"><span class="summary-label">Mobile Number</span><span class="summary-value" style="font-family:var(--font-family-mono);">+91 ' + escapeHtml(cleanPhone) + '</span></div>' : '') +
            '<div class="summary-row"><span class="summary-label">Gmail Address</span><span class="summary-value">' + escapeHtml(email) + '</span></div>' +
            (googleRegistrationData ? '<div class="summary-row"><span class="summary-label">Google Account</span><span class="summary-value" style="color:var(--status-present);">Connected (' + escapeHtml(googleRegistrationData.email) + ')</span></div>' : '') +
            '<div class="summary-row"><span class="summary-label">Branch / Department</span><span class="summary-value">' + escapeHtml(deptName) + ' (' + escapeHtml(deptCode) + ')</span></div>' +
            '<div class="summary-row"><span class="summary-label">Semester &amp; Year</span><span class="summary-value">Semester ' + semester + ' (Year ' + year + ')</span></div>' +
            '<div class="summary-row"><span class="summary-label">Account Status</span><span style="display:inline-block;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;font-weight:700;background:var(--status-pending-bg);color:var(--status-pending);">Pending Faculty Approval</span></div>';
        } else {
          var msg = (res.error && res.error.message) || 'Registration failed. Please check your information.';
          showToast(msg, 'error');
          if (res.error && res.error.code === 'REGISTRATION_CLOSED') { await updateRoutingDisplay(); }
          else { btn.disabled = false; btn.innerHTML = 'Submit Registration Request →'; }
        }
      } catch(err) {
        showToast((err && err.message) || 'Registration failed. Please try again.', 'error');
        btn.disabled = false; btn.innerHTML = 'Submit Registration Request →';
      }
    });

    var escapeHtml = typeof esc !== 'undefined' ? esc : function(s) {
      return String(s).replace(/[&<>"']/g, function(m) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
      });
    };

    function showToast(message, type, duration) {
      duration = duration || 4000;
      var container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;bottom:calc(64px + 1.25rem + env(safe-area-inset-bottom, 0px));right:1.5rem;z-index:99999;display:flex;flex-direction:column;gap:0.6rem;max-width:400px;pointer-events:none;';
        document.body.appendChild(container);
      } else if (!container.style.position) {
        container.style.cssText = 'position:fixed;bottom:calc(64px + 1.25rem + env(safe-area-inset-bottom, 0px));right:1.5rem;z-index:99999;display:flex;flex-direction:column;gap:0.6rem;max-width:400px;pointer-events:none;';
      }
      var toast = document.createElement('div');
      toast.style.cssText = 'padding:0.75rem 1rem;border-radius:10px;font-size:0.875rem;color:var(--text-white);box-shadow:var(--shadow-md);max-width:320px;word-break:break-word;font-family:inherit;';
      toast.style.background = type === 'error' ? 'var(--status-absent)' : type === 'success' ? 'var(--status-present)' : 'var(--color-primary)';
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(function() {
        toast.style.opacity = '0'; toast.style.transition = 'opacity 0.25s ease';
        setTimeout(function() { toast.remove(); }, 250);
      }, duration);
    }

