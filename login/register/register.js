/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: REGISTER
 * frontend/login/register/register.js
 * ══════════════════════════════════════════════════════════════
 */

/* ── Theme init ── */
  (function() {
    const t = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.innerHTML = t === 'dark' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
  })();

  function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.innerHTML = next === 'dark' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
  }

  /* ── Global State ── */
  const S = {
    currentRole: 'student',
    facultyType: 'FACULTY',
    departments: []
  };

  /* ── Alert utilities ── */
  function showAlert(msg, type = 'danger') {
    const el = document.getElementById('alert-banner');
    if (!el) return;
    const icon = '';
    el.innerHTML = `<span style="font-size:1.1rem; line-height:1; flex-shrink:0;">${icon}</span><span style="flex:1;">${escapeHtml(msg)}</span>`;
    el.className = 'alert ' + (type === 'success' ? 'success' : (type === 'warning' ? 'warning' : 'danger'));
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function hideAlert() {
    const el = document.getElementById('alert-banner');
    if (el) { el.className = 'alert'; el.innerHTML = ''; }
  }

  /* ── Password visibility toggle ── */
  function togglePwVisibility(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    if (inp.type === 'password') { inp.type = 'text'; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>'; }
    else { inp.type = 'password'; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>'; }
  }

  /* ── Password strength indicator ── */
  function checkStrength(prefix) {
    const pw = document.getElementById(prefix + '-password')?.value || '';
    const bar = document.getElementById(prefix + '-pw-bar');
    const label = document.getElementById(prefix + '-pw-label');
    if (!bar) return;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (pw.length === 0) {
      bar.style.width = '0%';
      if (label) label.textContent = '';
    } else if (score <= 1) {
      bar.style.cssText = 'width:25%;background:var(--reg-danger)';
      if (label) { label.textContent = 'Weak password'; label.style.color = 'var(--reg-danger)'; }
    } else if (score === 2) {
      bar.style.cssText = 'width:55%;background:var(--reg-warn)';
      if (label) { label.textContent = 'Fair password'; label.style.color = 'var(--reg-warn)'; }
    } else {
      bar.style.cssText = 'width:100%;background:var(--reg-success)';
      if (label) { label.textContent = 'Strong password'; label.style.color = 'var(--reg-success)'; }
    }
  }

  /* ── Switch Role Tabs ── */
  function switchRole(role) {
    S.currentRole = role;
    hideAlert();
    const isStu = role === 'student';
    const tabStu = document.getElementById('tab-student');
    const tabFac = document.getElementById('tab-faculty');
    tabStu.classList.toggle('active', isStu);
    tabStu.setAttribute('aria-selected', isStu ? 'true' : 'false');
    tabFac.classList.toggle('active', !isStu);
    tabFac.setAttribute('aria-selected', !isStu ? 'true' : 'false');
    document.getElementById('student-section').classList.toggle('active', isStu);
    document.getElementById('faculty-section').classList.toggle('active', !isStu);
    const heading = document.getElementById('page-heading');
    const sub = document.getElementById('page-subheading');
    if (isStu) {
      heading.textContent = 'Student Registration';
      sub.textContent = 'Submit your enrollment request to your Department Faculty';
    } else {
      heading.textContent = 'Faculty & HOD Onboarding';
      sub.textContent = 'Create your teaching or departmental leadership account';
    }
  }

  /* ── Faculty Account Type ── */
  function setFacultyType(type) {
    S.facultyType = type;
    const isHod = type === 'HOD';
    document.getElementById('fac-btn-role-teacher').classList.toggle('active', !isHod);
    document.getElementById('fac-btn-role-hod').classList.toggle('active', isHod);
    const targetEl = document.getElementById('fac-routing-target');
    const descEl = document.getElementById('fac-routing-desc');
    const deptHint = document.getElementById('fac-dept-hint');
    if (isHod) {
      targetEl.textContent = 'Institutional Administration Review';
      descEl.textContent = 'Your HOD registration will be submitted directly to the System Administrator.';
      if (deptHint) deptHint.textContent = 'Department selection is mandatory for HOD appointments.';
    } else {
      targetEl.textContent = 'Department HOD Review';
      descEl.textContent = 'Your registration will be submitted to the Head of Department for authorization.';
      if (deptHint) deptHint.textContent = 'Select your institutional department or Common Faculty.';
    }
    populateFacultyDepartments();
  }

  /* ── Department Data Loading ── */
  async function loadDepartments() {
    try {
      let res = await fetch('/api/v1/departments').then(r => r.json()).catch(() => null);
      if (!res || !res.success) res = await fetch('/api/v1/auth/departments').then(r => r.json()).catch(() => null);
      if (res && res.success && Array.isArray(res.data)) S.departments = res.data;
    } catch (_) { S.departments = []; }
    populateStudentDepartments();
    populateFacultyDepartments();
  }

  function populateStudentDepartments() {
    const sel = document.getElementById('stu-dept');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select Branch / Department —</option>';
    S.departments.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.name} (${d.code || 'DEPT'})`;
      opt.dataset.duration = d.degree_duration_years || 3;
      sel.appendChild(opt);
    });
  }

  function populateFacultyDepartments() {
    const sel = document.getElementById('fac-dept');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select Department —</option>';
    if (S.facultyType !== 'HOD') {
      const opt = document.createElement('option');
      opt.value = 'COMMON';
      opt.textContent = 'Common Faculty (Multi-Department)';
      sel.appendChild(opt);
    }
    S.departments.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.name} (${d.code || 'DEPT'})`;
      sel.appendChild(opt);
    });
  }

  /* ── Student Dept & Semester Change ── */
  function handleStudentDeptChange() {
    const deptSel = document.getElementById('stu-dept');
    const semSel = document.getElementById('stu-sem');
    const selectedOpt = deptSel.options[deptSel.selectedIndex];
    if (!deptSel.value) {
      semSel.innerHTML = '<option value="">— Select branch first —</option>';
      semSel.disabled = true;
      updateStudentCallout('Department Verification', 'Select your branch and semester.', false);
      return;
    }
    const durationYears = parseInt(selectedOpt.dataset.duration || '3', 10);
    const maxSem = durationYears * 2;
    semSel.innerHTML = '<option value="">— Select semester —</option>';
    for (let s = 1; s <= maxSem; s++) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = `Semester ${s} (Year ${Math.ceil(s / 2)})`;
      semSel.appendChild(opt);
    }
    semSel.disabled = false;
    handleStudentSemChange();
  }

  async function handleStudentSemChange() {
    const deptId = document.getElementById('stu-dept')?.value;
    const sem = document.getElementById('stu-sem')?.value;
    if (!deptId || !sem) return;
    try {
      const res = await fetch(`/api/v1/auth/student/registration/status?department_id=${encodeURIComponent(deptId)}&semester=${encodeURIComponent(sem)}`).then(r => r.json());
      if (res && res.success && res.data) {
        if (res.data.is_open) {
          updateStudentCallout('Registration Open', res.data.reason || 'Applications accepted for this cohort.', true);
        } else {
          updateStudentCallout('Registration Closed', res.data.reason || 'Registration is not open for this cohort.', false, true);
        }
      }
    } catch (_) {
      updateStudentCallout('Department Verification', 'Student registrations require Faculty approval.', false);
    }
  }

  function updateStudentCallout(target, desc, isOpen = false, isClosed = false) {
    const targetEl = document.getElementById('stu-routing-target');
    const descEl = document.getElementById('stu-routing-desc');
    const banner = document.getElementById('stu-routing-banner');
    if (!targetEl || !descEl || !banner) return;
    targetEl.textContent = target;
    descEl.textContent = desc;
    banner.className = 'callout' + (isOpen ? ' open' : isClosed ? ' closed' : '');
  }

  function handleFacultyDeptChange() {
    const val = document.getElementById('fac-dept')?.value;
    const descEl = document.getElementById('fac-routing-desc');
    if (!descEl) return;
    if (val === 'COMMON') descEl.textContent = 'Common faculty registration will be reviewed by Institutional Administration.';
    else if (S.facultyType === 'HOD') descEl.textContent = 'Head of Department registration will be authorized by Institutional Administration.';
    else descEl.textContent = 'Department Faculty registration will be reviewed by the Head of Department.';
  }



  /* ── Form Submissions ── */
  async function handleStudentSubmit(e) {
    e.preventDefault();
    hideAlert();
    const fullName = document.getElementById('stu-name')?.value.trim();
    const enrollNo = document.getElementById('stu-enroll')?.value.trim().toUpperCase();
    const ubterNo = document.getElementById('stu-ubter')?.value.trim().toUpperCase() || null;
    const email = document.getElementById('stu-email')?.value.trim();
    const deptId = document.getElementById('stu-dept')?.value;
    const semester = document.getElementById('stu-sem')?.value;
    const phone = (document.getElementById('stu-phone')?.value || '').replace(/\D/g, '');
    const password = document.getElementById('stu-password')?.value;
    const confirm = document.getElementById('stu-confirm')?.value;
    const submitBtn = document.getElementById('stu-submit-btn');
    if (!fullName || !enrollNo || !email || !deptId || !semester || !password) { showAlert('Please fill in all required fields marked with *', 'danger'); return; }
    if (phone && (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone))) {
      showAlert('If entering a mobile number, it must be a valid 10-digit Indian mobile number.', 'danger');
      return;
    }
    if (password.length < 8) { showAlert('Password must be at least 8 characters long', 'danger'); return; }
    if (password !== confirm) { showAlert('Password and Confirm Password do not match', 'danger'); return; }
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Submitting… <span class="arrow">→</span>';
      const payload = { full_name: fullName, official_enrollment_no: enrollNo, registration_no: ubterNo, email, password, department_id: Number(deptId), semester: Number(semester), phone: phone || null };
      const res = await fetch('/api/v1/auth/student/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());
      if (res && res.success) {
        showSuccessView({ title: 'Student Registration Submitted!', name: fullName, role: 'Student', email, detailLabel: 'Enrollment No.', detailValue: enrollNo, dept: document.getElementById('stu-dept').options[document.getElementById('stu-dept').selectedIndex]?.text });
      } else {
        showAlert(res?.error?.message || 'Registration failed. Please try again.', 'danger');
      }
    } catch (err) { showAlert(err.message || 'Network error submitting registration.', 'danger'); }
    finally { submitBtn.disabled = false; submitBtn.innerHTML = 'Submit Registration <span class="arrow">→</span>'; }
  }

  async function handleFacultySubmit(e) {
    e.preventDefault();
    hideAlert();
    const fullName = document.getElementById('fac-name')?.value.trim();
    const email = document.getElementById('fac-email')?.value.trim();
    const rawDept = document.getElementById('fac-dept')?.value;
    const phone = (document.getElementById('fac-phone')?.value || '').replace(/\D/g, '');
    const empId = document.getElementById('fac-empid')?.value.trim() || null;
    const password = document.getElementById('fac-password')?.value;
    const submitBtn = document.getElementById('fac-submit-btn');
    if (!fullName || !email || !password) { showAlert('Please fill in all required fields marked with *', 'danger'); return; }
    if (S.facultyType === 'HOD' && (!rawDept || rawDept === 'COMMON')) { showAlert('Department selection is required for HOD appointments.', 'danger'); return; }
    if (phone && (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone))) {
      showAlert('If entering a mobile number, it must be a valid 10-digit Indian mobile number.', 'danger');
      return;
    }
    if (password.length < 8) { showAlert('Password must be at least 8 characters long', 'danger'); return; }
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Submitting… <span class="arrow">→</span>';
      const payload = { full_name: fullName, email, password, account_type: S.facultyType, department_id: rawDept === 'COMMON' ? null : (rawDept ? Number(rawDept) : null), phone: phone || null, employee_id: empId };
      const res = await fetch('/api/v1/auth/faculty/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());
      if (res && res.success) {
        showSuccessView({ title: S.facultyType === 'HOD' ? 'HOD Application Submitted!' : 'Faculty Registration Submitted!', name: fullName, role: S.facultyType === 'HOD' ? 'Head of Department (HOD)' : 'Faculty Member', email, detailLabel: 'Employee ID', detailValue: empId || 'N/A', dept: rawDept === 'COMMON' ? 'Common Faculty' : (document.getElementById('fac-dept').options[document.getElementById('fac-dept').selectedIndex]?.text || 'N/A') });
      } else {
        showAlert(res?.error?.message || 'Application failed. Please try again.', 'danger');
      }
    } catch (err) { showAlert(err.message || 'Network error submitting application.', 'danger'); }
    finally { submitBtn.disabled = false; submitBtn.innerHTML = 'Submit Application <span class="arrow">→</span>'; }
  }

  function showSuccessView(info) {
    document.getElementById('form-container').style.display = 'none';
    const view = document.getElementById('success-view');
    view.style.display = 'block';
    document.getElementById('success-summary').innerHTML = `
      <span class="k">Applicant</span><span class="v">${escapeHtml(info.name)}</span>
      <span class="k">Account Role</span><span class="v" style="color:var(--reg-accent)">${escapeHtml(info.role)}</span>
      <span class="k">Department</span><span class="v">${escapeHtml(info.dept)}</span>
      <span class="k">${escapeHtml(info.detailLabel)}</span><span class="v" style="font-family:'JetBrains Mono',monospace">${escapeHtml(info.detailValue)}</span>
      <span class="k">Email</span><span class="v">${escapeHtml(info.email)}</span>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Initialization ── */
  (function init() {
    loadDepartments();
    const params = new URLSearchParams(window.location.search);
    const roleParam = (params.get('role') || '').toLowerCase();
    if (roleParam === 'faculty' || roleParam === 'teacher' || roleParam === 'hod') {
      switchRole('faculty');
      if (roleParam === 'hod') setFacultyType('HOD');
    } else {
      switchRole('student');
    }
  })();

