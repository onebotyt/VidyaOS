/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: REGISTER
 * frontend/login/register/register.js
 * Consolidated Institutional Multi-Role Self-Registration Portal
 * Self-contained: zero external JS dependencies
 * ══════════════════════════════════════════════════════════════
 */

/* ── Utility: HTML escape (inlined — no shared/js/ui.js dependency) ── */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
  departments: [],
  isCohortRegistrationOpen: true,
  googleRegistrationData: null
};

/* ── Alert utilities ── */
function showAlert(msg, type = 'danger') {
  const el = document.getElementById('alert-banner');
  if (!el) return;
  el.innerHTML = `<span style="font-size:1.1rem; line-height:1; flex-shrink:0;"></span><span style="flex:1;">${escapeHtml(msg)}</span>`;
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
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
  } else {
    inp.type = 'password';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  }
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
  S.currentRole = 'student';
  hideAlert();
  const tabStu = document.getElementById('tab-student');
  if (tabStu) {
    tabStu.classList.add('active');
    tabStu.setAttribute('aria-selected', 'true');
  }
  const secStu = document.getElementById('student-section');
  if (secStu) secStu.classList.add('active');

  const heading = document.getElementById('page-heading');
  const sub = document.getElementById('page-subheading');
  if (heading) heading.textContent = 'Student Registration';
  if (sub) sub.textContent = 'Submit your enrollment request to your Department Faculty';

  if (role === 'faculty' || role === 'teacher' || role === 'hod') {
    showAlert('Faculty and HOD accounts cannot self-register. Faculty accounts are provisioned exclusively by Institutional Administrators and Department HODs.', 'warning');
  }
}

/* ── Department Data Loading ── */
async function loadDepartments() {
  try {
    let res = await fetch('/api/v1/departments').then(r => r.json()).catch(() => null);
    if (!res || !res.success) res = await fetch('/api/v1/auth/departments').then(r => r.json()).catch(() => null);
    if (res && res.success && Array.isArray(res.data)) S.departments = res.data;
  } catch (_) { S.departments = []; }
  populateStudentDepartments();
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
        S.isCohortRegistrationOpen = true;
        updateStudentCallout('Registration Open', res.data.reason || 'Applications accepted for this cohort.', true);
        const btn = document.getElementById('stu-submit-btn');
        if (btn) btn.disabled = false;
      } else {
        S.isCohortRegistrationOpen = false;
        updateStudentCallout('Registration Closed', res.data.reason || 'Registration is not currently open for this cohort.', false, true);
        const btn = document.getElementById('stu-submit-btn');
        if (btn) btn.disabled = true;
      }
    }
  } catch (_) {
    S.isCohortRegistrationOpen = true;
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

/* ── Google 1-Click Auto-Fill ── */
async function initiateGoogleSignUp() {
  const btn = document.getElementById('google-signup-btn');
  const btnText = document.getElementById('google-signup-btn-text');
  const originalText = btnText ? btnText.textContent : 'Sign up with Google (Auto-Fill)';
  if (btnText) btnText.textContent = 'Connecting to Google…';
  if (btn) btn.disabled = true;

  // 1. Android Native App: Launch native Google Account Chooser bottom-sheet
  if (window.NativeAuthBridge && typeof window.NativeAuthBridge.launchGoogleSignIn === 'function') {
    try {
      window.NativeAuthBridge.launchGoogleSignIn();
      return;
    } catch (e) {
      console.warn('NativeAuthBridge launch failed in register:', e);
    }
  }

  // 2. Web browser flow (OAuth URL)
  try {
    const origin = (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:') && !window.location.origin.startsWith('capacitor:'))
      ? window.location.origin
      : 'https://vidyaos-pink.vercel.app';
    let res = await fetch(`/api/v1/auth/google/url?mode=STUDENT_REGISTER&origin=${encodeURIComponent(origin)}`).then(r => r.json()).catch(() => null);
    if (!res || !res.success || !res.data?.url) {
      res = await fetch(`https://vidyaos-backend.onrender.com/api/v1/auth/google/url?mode=STUDENT_REGISTER&origin=${encodeURIComponent(origin)}`).then(r => r.json()).catch(() => null);
    }

    if (res && res.data?.url) {
      // Direct navigation to Google OAuth with prompt=select_account triggers the native Android account chooser
      window.location.href = res.data.url;
      return;
    }

    // Direct fallback with official Client ID if backend URL service is unreachable
    const clientId = '147063521055-9044vtuf4ldk39g7c55cgqdcu0r98e3u.apps.googleusercontent.com';
    const redirectUri = 'https://vidyaos-backend.onrender.com/api/v1/auth/google/callback';
    const stateObj = { mode: 'STUDENT_REGISTER', userId: null, frontendOrigin: origin, ts: Date.now() };
    const state = btoa(JSON.stringify(stateObj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const fallbackUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid+email+profile&access_type=offline&prompt=select_account&state=${state}`;
    window.location.href = fallbackUrl;
  } catch (err) {
    console.error('Google Auto-Fill error:', err);
    if (btnText) btnText.textContent = originalText;
    if (btn) btn.disabled = false;
  }
}

/* ── Native Google Sign-Up Callbacks ── */
window.onNativeGoogleSignInSuccess = function(data) {
  try {
    const payload = typeof data === 'string' ? JSON.parse(data) : data;
    const { email, name, sub, idToken } = payload;
    if (email) {
      selectGoogleAccount(email, name, sub);
      if (idToken && S.googleRegistrationData) {
        S.googleRegistrationData.id_token = idToken;
      }
    }
  } catch (err) {
    console.error('Native Google auto-fill error:', err);
  }
};

window.onNativeGoogleSignInError = function(err) {
  console.warn('Native Google sign-up cancelled or error:', err);
  const btn = document.getElementById('google-signup-btn');
  const btnText = document.getElementById('google-signup-btn-text');
  if (btnText) btnText.textContent = 'Sign up with Google (Auto-Fill)';
  if (btn) btn.disabled = false;
};

window.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
    const payload = event.data.payload;
    if (payload) {
      if (payload.already_registered && payload.status === 'ACTIVE') {
        showAlert('An active student account already exists for this Google email. Redirecting to login...', 'warning');
        setTimeout(() => { window.location.href = '/login'; }, 1500);
        return;
      }
      if (payload.action === 'STUDENT_REGISTER' || payload.google_email) {
        selectGoogleAccount(payload.google_email, payload.google_name, payload.google_sub);
      }
    }
  } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
    showAlert(event.data.message || 'Google verification failed or cancelled.', 'warning');
  }
});

function openGoogleCardForRegistration() {
  const modal = document.getElementById('google-signin-modal');
  const errorBox = document.getElementById('google-card-error');
  if (errorBox) errorBox.style.display = 'none';
  const inputView = document.getElementById('google-input-view');
  if (inputView) inputView.style.display = 'block';
  const loadingView = document.getElementById('google-loading-view');
  if (loadingView) loadingView.style.display = 'none';
  const inp = document.getElementById('google-manual-email');
  if (inp) {
    inp.value = '';
    setTimeout(() => inp.focus(), 100);
  }
  if (modal) modal.style.display = 'flex';
}

function closeGoogleCard() {
  const modal = document.getElementById('google-signin-modal');
  if (modal) modal.style.display = 'none';
}

function submitGoogleEmail() {
  const email = document.getElementById('google-manual-email')?.value?.trim();
  if (!email || !email.includes('@')) {
    const errorBox = document.getElementById('google-card-error');
    if (errorBox) { errorBox.innerText = 'Please enter a valid Google email address.'; errorBox.style.display = 'block'; }
    return;
  }
  selectGoogleAccount(email);
}

function selectGoogleAccount(email, customName, googleSub) {
  closeGoogleCard();
  const cleanEmail = email.trim().toLowerCase();
  const displayName = customName || cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  S.googleRegistrationData = {
    email: cleanEmail,
    name: displayName,
    sub: googleSub || ('google_sub_' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16))
  };

  const nameInput = document.getElementById('stu-name');
  const emailInput = document.getElementById('stu-email');
  if (nameInput) {
    nameInput.value = displayName;
    const nameBox = nameInput.closest('.field-input-box');
    if (nameBox) nameBox.style.borderColor = 'var(--reg-success)';
    const nameCheck = document.getElementById('stu-name-check');
    if (nameCheck) nameCheck.style.display = 'flex';
  }
  if (emailInput) {
    emailInput.value = cleanEmail;
    emailInput.readOnly = true;
    const emailBox = emailInput.closest('.field-input-box');
    if (emailBox) emailBox.style.borderColor = 'var(--reg-success)';
    const emailCheck = document.getElementById('stu-email-check');
    if (emailCheck) emailCheck.style.display = 'flex';
  }

  const badge = document.getElementById('google-connected-badge');
  const badgeName = document.getElementById('google-badge-name');
  const badgeEmail = document.getElementById('google-badge-email');
  const btnText = document.getElementById('google-signup-btn-text');
  if (badgeName) badgeName.textContent = displayName;
  if (badgeEmail) badgeEmail.textContent = '(' + cleanEmail + ')';
  if (badge) badge.style.display = 'flex';
  if (btnText) btnText.innerHTML = 'Account Linked with Google ✓';

  const pwLabel = document.querySelector('label[for="stu-password"]');
  const confLabel = document.querySelector('label[for="stu-confirm"]');
  if (pwLabel) pwLabel.innerHTML = 'Create Password <span style="font-size:0.75rem;font-weight:normal;color:var(--reg-muted)">(Optional with Google Sign-In)</span>';
  if (confLabel) confLabel.innerHTML = 'Confirm Password <span style="font-size:0.75rem;font-weight:normal;color:var(--reg-muted)">(Optional)</span>';
  const pwInput = document.getElementById('stu-password');
  const confInput = document.getElementById('stu-confirm');
  if (pwInput) pwInput.removeAttribute('required');
  if (confInput) confInput.removeAttribute('required');

  closeGoogleCard();
  showAlert('Google account linked! Please complete your academic details.', 'success');
}

/* ── Form Submissions ── */
async function handleStudentSubmit(e) {
  e.preventDefault();
  hideAlert();
  if (S.isCohortRegistrationOpen === false) {
    showAlert('Self-registration is currently closed for this department cohort. Please contact your department.', 'danger');
    return;
  }

  const fullName = document.getElementById('stu-name')?.value.trim();
  const isEnrollNotAvailable = Boolean(document.getElementById('chk-enroll-not-available')?.checked);
  const enrollInput = document.getElementById('stu-enroll');
  const enrollError = document.getElementById('stu-enroll-error');
  const rollInput = document.getElementById('stu-class-roll-no');
  const rollError = document.getElementById('stu-roll-error');

  if (enrollError) enrollError.textContent = '';
  if (rollError) rollError.textContent = '';

  let enrollNo = enrollInput?.value.trim().replace(/\D/g, '') || '';
  if (isEnrollNotAvailable) {
    enrollNo = null;
  } else {
    if (!enrollNo) {
      if (enrollError) enrollError.textContent = 'UBTER Roll Number is required (or check "UBTER Roll Number Not Available").';
      showAlert('Please enter your 11-digit official UBTER roll number or check "UBTER Roll Number Not Available".', 'danger');
      enrollInput?.focus();
      return;
    }
    if (enrollNo.length !== 11 || !/^\d{11}$/.test(enrollNo)) {
      if (enrollError) enrollError.textContent = 'UBTER Roll Number must be exactly 11 numeric digits.';
      showAlert('UBTER Roll Number must be exactly 11 numeric digits (0–9).', 'danger');
      enrollInput?.focus();
      return;
    }
  }

  const ubterInput = document.getElementById('stu-ubter');
  const ubterError = document.getElementById('stu-ubter-error');
  if (ubterError) ubterError.textContent = '';
  const rawUbter = ubterInput?.value.trim().toUpperCase() || '';
  let ubterNo = rawUbter || null;
  if (rawUbter) {
    if (rawUbter.length > 8) {
      if (ubterError) ubterError.textContent = 'UBTER Registration number cannot exceed 8 characters.';
      showAlert('UBTER Registration Number cannot exceed 8 characters/digits.', 'danger');
      ubterInput?.focus();
      return;
    }
  }

  const rollNoInput = rollInput?.value.trim();
  let classRollNo = undefined;
  if (rollNoInput) {
    const cleanRoll = rollNoInput.replace(/\D/g, '');
    if (!/^\d{1,2}$/.test(cleanRoll)) {
      if (rollError) rollError.textContent = 'Class roll number must be numeric and maximum 2 digits.';
      showAlert('Class Roll Number must be numeric and maximum 2 digits (e.g. 01 to 99).', 'danger');
      rollInput?.focus();
      return;
    }
    classRollNo = parseInt(cleanRoll, 10);
  }

  const email = document.getElementById('stu-email')?.value.trim();
  const deptId = document.getElementById('stu-dept')?.value;
  const semester = document.getElementById('stu-sem')?.value;
  const phone = (document.getElementById('stu-phone')?.value || '').replace(/\D/g, '');
  const password = document.getElementById('stu-password')?.value;
  const confirm = document.getElementById('stu-confirm')?.value;
  const submitBtn = document.getElementById('stu-submit-btn');

  const isGoogle = Boolean(S.googleRegistrationData?.sub);
  if (!fullName || !email || !deptId || !semester || (!isGoogle && !password)) {
    showAlert('Please fill in all required fields (Name, Branch, Semester, Gmail' + (isGoogle ? '' : ', Password') + ').', 'danger');
    return;
  }
  if (!phone) {
    showAlert('Mobile number is required to identify your account.', 'danger');
    document.getElementById('stu-phone')?.focus();
    return;
  }
  if (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
    showAlert('Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).', 'danger');
    document.getElementById('stu-phone')?.focus();
    return;
  }
  if (password && password.length < 8) {
    showAlert('Password must be at least 8 characters long', 'danger');
    return;
  }
  if (password && password !== confirm) {
    showAlert('Password and Confirm Password do not match', 'danger');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Submitting… <span class="arrow">→</span>';
    const payload = {
      full_name: fullName,
      ubter_roll_no: isEnrollNotAvailable ? null : enrollNo,
      official_enrollment_no: isEnrollNotAvailable ? null : enrollNo,
      ubter_roll_no: isEnrollNotAvailable ? null : enrollNo,
      enrollment_not_available: isEnrollNotAvailable,
      registration_no: ubterNo,
      class_roll_no: classRollNo,
      email,
      password: password || undefined,
      department_id: Number(deptId),
      semester: Number(semester),
      phone: phone || null,
      google_sub: S.googleRegistrationData?.sub || null
    };

    const res = await fetch('/api/v1/auth/student/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res && res.success) {
      showSuccessView({
        title: 'Student Registration Submitted!',
        name: fullName,
        role: 'Student',
        email,
        detailLabel: 'UBTER Roll Status',
        detailValue: isEnrollNotAvailable ? 'Not Assigned' : (enrollNo || (ubterNo ? 'UBTER: ' + ubterNo : 'Not Assigned')),
        dept: document.getElementById('stu-dept').options[document.getElementById('stu-dept').selectedIndex]?.text
      });
    } else {
      showAlert(res?.error?.message || 'Registration failed. Please try again.', 'danger');
    }
  } catch (err) {
    showAlert(err.message || 'Network error submitting registration.', 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Register Now <span class="arrow">→</span>';
  }
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

/* ── Initialization ── */
(function init() {
  loadDepartments();
  const params = new URLSearchParams(window.location.search);
  const roleParam = (params.get('role') || '').toLowerCase();
  switchRole('student');
  if (roleParam === 'faculty' || roleParam === 'teacher' || roleParam === 'hod') {
    showAlert('Faculty and HOD accounts cannot self-register. Faculty accounts are provisioned exclusively by Institutional Administrators and Department HODs.', 'warning');
  }

  const qEmail = params.get('google_email');
  const qName = params.get('google_name');
  const qSub = params.get('google_sub');
  if (qEmail && qEmail.includes('@')) {
    selectGoogleAccount(qEmail, qName, qSub);
  }

  // Enrollment Number Not Available toggle
  const chkEnrollNotAvailable = document.getElementById('chk-enroll-not-available');
  const stuEnrollInput = document.getElementById('stu-enroll');
  const stuEnrollReq = document.getElementById('stu-enroll-req');
  const stuEnrollHint = document.getElementById('stu-enroll-hint');
  const stuEnrollError = document.getElementById('stu-enroll-error');

  if (chkEnrollNotAvailable && stuEnrollInput) {
    chkEnrollNotAvailable.addEventListener('change', () => {
      if (chkEnrollNotAvailable.checked) {
        stuEnrollInput.value = '';
        stuEnrollInput.disabled = true;
        stuEnrollInput.placeholder = 'Not Assigned';
        stuEnrollInput.removeAttribute('required');
        if (stuEnrollReq) stuEnrollReq.style.display = 'none';
        if (stuEnrollHint) stuEnrollHint.textContent = 'UBTER roll status will be registered as "Not Assigned".';
        if (stuEnrollError) stuEnrollError.textContent = '';
        stuEnrollInput.classList.remove('has-error');
      } else {
        stuEnrollInput.disabled = false;
        stuEnrollInput.placeholder = '11-digit numeric UBTER roll no';
        stuEnrollInput.setAttribute('required', 'required');
        if (stuEnrollReq) stuEnrollReq.style.display = 'inline';
        if (stuEnrollHint) stuEnrollHint.textContent = 'Enter your 11-digit official UBTER roll number.';
        if (stuEnrollError) stuEnrollError.textContent = '';
      }
    });
  }

  // Mobile phone 10-digit enforcement
  const stuPhoneInput = document.getElementById('stu-phone');
  const stuPhoneError = document.getElementById('stu-phone-error');
  if (stuPhoneInput) {
    stuPhoneInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
      if (stuPhoneError && e.target.value.length === 10) {
        stuPhoneError.textContent = '';
        stuPhoneInput.classList.remove('has-error');
      }
    });
    stuPhoneInput.addEventListener('blur', (e) => {
      const val = e.target.value.trim();
      if (!val) {
        if (stuPhoneError) stuPhoneError.textContent = 'Mobile number is required.';
        stuPhoneInput.classList.add('has-error');
      } else if (val.length !== 10 || !/^[6-9]\d{9}$/.test(val)) {
        if (stuPhoneError) stuPhoneError.textContent = 'Enter a valid 10-digit mobile number (starts with 6-9).';
        stuPhoneInput.classList.add('has-error');
      } else if (stuPhoneError) {
        stuPhoneError.textContent = '';
        stuPhoneInput.classList.remove('has-error');
      }
    });
  }

  // UBTER Roll Number numeric 11-digit enforcement
  if (stuEnrollInput) {
    stuEnrollInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
      if (stuEnrollError && e.target.value.length === 11) {
        stuEnrollError.textContent = '';
        stuEnrollInput.classList.remove('has-error');
      }
    });
    stuEnrollInput.addEventListener('blur', (e) => {
      if (chkEnrollNotAvailable && chkEnrollNotAvailable.checked) return;
      const val = e.target.value.trim();
      if (val && val.length !== 11) {
        if (stuEnrollError) stuEnrollError.textContent = 'UBTER Roll Number must be exactly 11 numeric digits.';
        stuEnrollInput.classList.add('has-error');
      } else if (stuEnrollError) {
        stuEnrollError.textContent = '';
        stuEnrollInput.classList.remove('has-error');
      }
    });
  }

  // UBTER Reg number max 8 characters enforcement
  const stuUbterInput = document.getElementById('stu-ubter');
  const stuUbterError = document.getElementById('stu-ubter-error');
  if (stuUbterInput) {
    stuUbterInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase().slice(0, 8);
      if (stuUbterError) stuUbterError.textContent = '';
      stuUbterInput.classList.remove('has-error');
    });
    stuUbterInput.addEventListener('blur', (e) => {
      const val = e.target.value.trim();
      if (val && val.length > 8) {
        if (stuUbterError) stuUbterError.textContent = 'UBTER Registration number cannot exceed 8 characters.';
        stuUbterInput.classList.add('has-error');
      } else if (stuUbterError) {
        stuUbterError.textContent = '';
        stuUbterInput.classList.remove('has-error');
      }
    });
  }

  // Class roll number numeric max 2 digits enforcement
  const stuRollInput = document.getElementById('stu-class-roll-no');
  const stuRollError = document.getElementById('stu-roll-error');
  if (stuRollInput) {
    stuRollInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2);
      if (stuRollError) stuRollError.textContent = '';
      stuRollInput.classList.remove('has-error');
    });
    stuRollInput.addEventListener('blur', (e) => {
      const val = e.target.value.trim();
      if (val && !/^\d{1,2}$/.test(val)) {
        if (stuRollError) stuRollError.textContent = 'Class roll number must be numeric and maximum 2 digits.';
        stuRollInput.classList.add('has-error');
      } else if (stuRollError) {
        stuRollError.textContent = '';
        stuRollInput.classList.remove('has-error');
      }
    });
  }
})();
