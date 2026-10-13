/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: FACULTY-REGISTER
 * frontend/login/faculty-register/faculty-register.js
 * ══════════════════════════════════════════════════════════════
 */

// ─── Theme Initialization & Switcher ────────────────────
    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      var icon = document.getElementById('theme-icon');
      var text = document.getElementById('theme-text');
      if (icon && text) {
        if (theme === 'dark') {
          icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
          text.textContent = 'Light Mode';
        } else {
          icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
          text.textContent = 'Dark Mode';
        }
      }
    }

    function toggleTheme() {
      var cur = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(cur === 'dark' ? 'light' : 'dark');
    }

    var savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    let currentType = 'FACULTY';
    let departmentsList = [];
    let registrationGates = null;
    let isGateOpen = false;
    let gateClosedReason = '';

    document.addEventListener('DOMContentLoaded', async () => {
      await Promise.allSettled([
        loadRegistrationGates(),
        loadDepartments()
      ]);
      updateRoutingDisplay();
    });

    async function loadRegistrationGates() {
      try {
        const res = await apiRequest('/api/v1/auth/registration-gates');
        registrationGates = res?.data;
      } catch (err) {
        console.warn('Could not load registration gates:', err);
      }
    }

    async function loadDepartments() {
      const select = document.getElementById('department_id');
      try {
        const res = await apiRequest('/api/v1/departments');
        departmentsList = res?.data || [];
        populateDepartmentDropdown();
      } catch (err) {
        departmentsList = [
          { id: 4, name: 'Information Technology', code: 'IT' },
          { id: 2, name: 'Electronics & Communication Engineering', code: 'ECE' },
          { id: 3, name: 'Electrical Engineering', code: 'EE' },
          { id: 5, name: 'Mechanical Engineering', code: 'ME' },
          { id: 6, name: 'Civil Engineering', code: 'CE' },
          { id: 7, name: 'Pharmacy', code: 'PHARM' }
        ];
        populateDepartmentDropdown();
      }
    }

    function populateDepartmentDropdown() {
      const select = document.getElementById('department_id');
      if (!select) return;

      let html = '<option value="">-- Select Department --</option>';
      departmentsList.forEach(dept => {
        html += '<option value="' + dept.id + '">' + escapeHtml(dept.name) + ' (' + dept.code + ')</option>';
      });

      if (currentType === 'FACULTY') {
        html += '<option value="COMMON">No Department / Common Faculty (General & First Year)</option>';
      }

      select.innerHTML = html;
    }

    function setAccountType(type) {
      currentType = type;
      const btnFac = document.getElementById('btn-type-faculty');
      const btnHod = document.getElementById('btn-type-hod');
      const deptHint = document.getElementById('dept-hint');

      if (type === 'FACULTY') {
        btnFac?.classList.add('active');
        btnHod?.classList.remove('active');
        if (deptHint) deptHint.textContent = 'Select your institutional department or Common Faculty for inter-disciplinary subjects.';
      } else {
        btnHod?.classList.add('active');
        btnFac?.classList.remove('active');
        if (deptHint) deptHint.textContent = 'Department selection is mandatory for Head of Department appointments.';
      }

      populateDepartmentDropdown();
      updateRoutingDisplay();
    }

    function updateRoutingDisplay() {
      const deptSelect = document.getElementById('department_id');
      const selectedVal = deptSelect?.value;
      const callout = document.getElementById('routing-callout');
      const iconEl = callout ? callout.querySelector('.routing-icon') : null;
      const authEl = document.getElementById('routing-authority-text');
      const expEl = document.getElementById('routing-explanation-text');

      if (callout) {
        callout.style.background = 'var(--bg-card)';
        callout.style.borderColor = 'var(--border-color)';
      }

      if (currentType === 'HOD') {
        const isHodOpen = registrationGates?.admin?.hod_registration_open;
        if (isHodOpen === false) {
          isGateOpen = false;
          gateClosedReason = 'HOD Registration Closed';
          if (iconEl) iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
          if (callout) {
            callout.style.background = 'var(--chip-admin-bg)';
            callout.style.borderColor = 'var(--status-absent)';
          }
          if (authEl) authEl.textContent = 'Registration Closed';
          if (expEl) expEl.textContent = registrationGates?.admin?.hod_closed_reason || 'Institutional Administration has not opened Head of Department (HOD) registration at this time.';
          updateSubmitButtonState();
          return;
        }

        isGateOpen = true;
        if (iconEl) iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"></path></svg>';
        if (authEl) authEl.textContent = 'System Administrator Review (Open)';
        if (expEl) expEl.textContent = 'HOD appointments must be directly verified and authorized by the System Administrator.';
        updateSubmitButtonState();
      } else {
        if (selectedVal === 'COMMON') {
          const isCommonOpen = registrationGates?.admin?.common_faculty_registration_open;
          if (isCommonOpen === false) {
            isGateOpen = false;
            gateClosedReason = 'Common Faculty Registration Closed';
            if (iconEl) iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
            if (callout) {
              callout.style.background = 'var(--chip-admin-bg)';
              callout.style.borderColor = 'var(--status-absent)';
            }
            if (authEl) authEl.textContent = 'Registration Closed';
            if (expEl) expEl.textContent = registrationGates?.admin?.common_faculty_closed_reason || 'Institutional Administration has not opened Common Faculty registration at this time.';
            updateSubmitButtonState();
            return;
          }

          isGateOpen = true;
          if (iconEl) iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
          if (authEl) authEl.textContent = 'Common Faculty Manager Review (Open)';
          if (expEl) expEl.textContent = 'Common faculty registrations are reviewed by the Common Faculty Manager for inter-departmental teaching.';
          updateSubmitButtonState();
        } else if (selectedVal) {
          const dept = (registrationGates?.departments || []).find(d => String(d.id) === String(selectedVal)) ||
                       departmentsList.find(d => String(d.id) === String(selectedVal));
          const deptName = dept ? dept.name : 'Department';

          if (dept && dept.hod_active === false) {
            isGateOpen = false;
            gateClosedReason = 'Registration Closed (No HOD)';
            if (iconEl) iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
            if (callout) {
              callout.style.background = 'var(--chip-admin-bg)';
              callout.style.borderColor = 'var(--status-absent)';
            }
            if (authEl) authEl.textContent = 'Registration Closed (No Active HOD)';
            if (expEl) expEl.textContent = dept.faculty_closed_reason || ('No active Head of Department (HOD) is currently appointed for ' + deptName + ' to open registration. Applications cannot be submitted until an HOD is appointed.');
            updateSubmitButtonState();
            return;
          }

          if (dept && dept.faculty_registration_open === false) {
            isGateOpen = false;
            gateClosedReason = 'Faculty Registration Closed';
            if (iconEl) iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
            if (callout) {
              callout.style.background = 'var(--chip-admin-bg)';
              callout.style.borderColor = 'var(--status-absent)';
            }
            if (authEl) authEl.textContent = 'Registration Closed';
            if (expEl) expEl.textContent = dept.faculty_closed_reason || ('The ' + deptName + ' Head of Department has not opened faculty registration at this time.');
            updateSubmitButtonState();
            return;
          }

          isGateOpen = true;
          if (iconEl) iconEl.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--status-present);"></span>';
          if (callout) {
            callout.style.background = 'var(--status-present-bg)';
            callout.style.borderColor = 'var(--status-present)';
          }
          if (authEl) authEl.textContent = deptName + ' HOD Review (Open)';
          if (expEl) expEl.textContent = 'Your faculty registration will be reviewed and approved by the ' + deptName + ' Head of Department (' + (dept?.hod_name || 'HOD') + ').';
          updateSubmitButtonState();
        } else {
          isGateOpen = false;
          gateClosedReason = 'Select Department';
          if (iconEl) iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>';
          if (authEl) authEl.textContent = 'Departmental Authorization';
          if (expEl) expEl.textContent = 'Select a department above to check if faculty registration is open.';
          updateSubmitButtonState();
        }
      }
    }

    function updateSubmitButtonState() {
      const submitBtn = document.getElementById('btn-submit');
      if (!submitBtn) return;

      if (!isGateOpen) {
        submitBtn.disabled = true;
        submitBtn.textContent = gateClosedReason ? gateClosedReason : 'Registration Closed';
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Registration Request →';
      }
    }

    async function handleRegistration(e) {
      e.preventDefault();
      const alertBox = document.getElementById('alert-box');
      const submitBtn = document.getElementById('btn-submit');

      const fullName = document.getElementById('full_name')?.value.trim();
      const email = document.getElementById('email')?.value.trim();
      const deptVal = document.getElementById('department_id')?.value;
      const empId = document.getElementById('employee_id')?.value.trim();
      const rawPhone = document.getElementById('phone')?.value.trim() || '';
      const cleanPhone = rawPhone.replace(/\D/g, '');
      const password = document.getElementById('password')?.value;

      if (!fullName || !email || !password) {
        showAlert('Please fill in all mandatory fields.', 'danger');
        return;
      }

      if (cleanPhone && (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone))) {
        showAlert('If entering a phone number, it must be a valid 10-digit Indian mobile number.', 'danger');
        document.getElementById('phone')?.focus();
        return;
      }

      if (currentType === 'HOD' && (!deptVal || deptVal === 'COMMON')) {
        showAlert('Department selection is mandatory for HOD registration.', 'danger');
        return;
      }

      if (!deptVal) {
        showAlert('Please select your department or choose Common Faculty.', 'danger');
        return;
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting Request...';
        }
        if (alertBox) alertBox.style.display = 'none';

        const payload = {
          full_name: fullName,
          email,
          password,
          account_type: currentType,
          department_id: deptVal === 'COMMON' ? null : Number(deptVal),
          employee_id: empId || undefined,
          phone: cleanPhone || null
        };

        const res = await apiRequest('/api/v1/auth/faculty/register', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (res && res.success) {
          showSuccessView(res.data, res.message, cleanPhone);
        } else {
          throw new Error(res?.error?.message || 'Registration failed');
        }
      } catch (err) {
        showAlert(err.message || 'Registration request failed. Please check details.', 'danger');
        await loadRegistrationGates();
        updateRoutingDisplay();
      } finally {
        if (submitBtn && submitBtn.textContent === 'Submitting Request...') {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Registration Request →';
        }
      }
    }

    function showSuccessView(data, message, phoneNum) {
      phoneNum = phoneNum || '';
      const form = document.getElementById('faculty-reg-form');
      const successView = document.getElementById('success-view');

      if (form) form.style.display = 'none';
      if (successView) successView.style.display = 'block';

      const desc = document.getElementById('success-desc');
      const rName = document.getElementById('res-name');
      const rEmail = document.getElementById('res-email');
      const rPhone = document.getElementById('res-phone');
      const rType = document.getElementById('res-type');
      const rAuth = document.getElementById('res-authority');

      if (rPhone) {
        const ph = data?.phone || phoneNum;
        rPhone.textContent = ph ? ('+91 ' + ph) : '--';
      }

      if (desc && message) desc.textContent = message;
      if (rName) rName.textContent = data.full_name;
      if (rEmail) rEmail.textContent = data.email;
      if (rType) rType.textContent = data.account_type === 'HOD' ? 'Head of Department' : 'Faculty Member';

      if (rAuth) {
        if (data.approval_type === 'ADMIN') rAuth.textContent = 'System Administrator';
        else if (data.approval_type === 'COMMON_FACULTY_MANAGER') rAuth.textContent = 'Common Faculty Manager';
        else rAuth.textContent = 'Department HOD';
      }
    }

    function showAlert(msg, type) {
      const alertBox = document.getElementById('alert-box');
      if (!alertBox) return;
      const icon = '';
      alertBox.innerHTML = '<span style="font-size:1.1rem; line-height:1; flex-shrink:0;">' + icon + '</span><span style="flex:1;">' + escapeHtml(msg) + '</span>';
      alertBox.style.display = 'flex';
      alertBox.style.alignItems = 'flex-start';
      alertBox.style.gap = '0.55rem';
      if (type === 'danger') {
        alertBox.style.background = 'var(--status-absent-bg)';
        alertBox.style.color = 'var(--status-absent)';
        alertBox.style.border = '1px solid var(--status-absent)';
      } else {
        alertBox.style.background = 'var(--status-present-bg)';
        alertBox.style.color = 'var(--status-present)';
        alertBox.style.border = '1px solid var(--status-present)';
      }
      alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function togglePw(id, btn) {
      const input = document.getElementById(id);
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      } else {
        input.type = 'password';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
      }
    }

    var escapeHtml = window.escapeHtml || (typeof esc !== 'undefined' ? esc : (s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m])));

