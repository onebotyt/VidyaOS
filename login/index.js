/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: INDEX (UGIP Nainital PC-First Login)
 * frontend/login/index.js
 * ══════════════════════════════════════════════════════════════
 */

const ALL_AUTH_STORAGE_KEYS = [
  'access_token', 'accessToken', 'token', 'authToken', 'auth_token', 'vidyaos_token',
  'user', 'currentUser', 'auth_user', 'vidyaos_user', 'user_profile', 'user_roles',
  'role', 'roles', 'session_id'
];

function purgeAllStoredAuth() {
  try {
    const savedTheme = localStorage.getItem('vidya_theme') || localStorage.getItem('theme');
    ALL_AUTH_STORAGE_KEYS.forEach(k => {
      try { localStorage.removeItem(k); } catch (_) { }
    });
    try { sessionStorage.clear(); } catch (_) { }
    try {
      document.cookie.split(";").forEach(c => {
        const name = c.split("=")[0].trim();
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname};`;
        }
      });
    } catch (_) { }
    if (typeof window !== 'undefined' && window.caches && window.caches.keys) {
      window.caches.keys().then(names => names.forEach(name => window.caches.delete(name))).catch(() => {});
    }
    if (savedTheme) {
      try { localStorage.setItem('vidya_theme', savedTheme); } catch (_) {}
    }
  } catch (_) {}
}

/* ── Redirect if already logged in ── */
(function checkExistingSession() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (sessionStorage.getItem('vidya_logged_out_flag') || params.has('reason') || params.has('logged_out')) {
      purgeAllStoredAuth();
      return;
    }
  } catch (_) { }

  const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (!token) {
    purgeAllStoredAuth();
    return;
  }

  // Client-side JWT expiration check
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && (payload.exp * 1000) <= Date.now()) {
        purgeAllStoredAuth();
        return;
      }
    }
  } catch (_) { }

  try {
    const u = JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser') || 'null');
    if (!u) return;
    const roles = Array.isArray(u.roles) ? u.roles : [];
    const isAdmin = roles.includes('SYSTEM_ADMIN') || roles.includes('ADMIN') || u.role === 'SYSTEM_ADMIN' || u.role === 'ADMIN' || Boolean(u.is_admin);
    if (isAdmin) { window.location.replace('/admin/dashboard/index.html'); return; }
    if (roles.includes('STUDENT') || u.role === 'STUDENT') { window.location.replace('/student/home/index.html'); return; }
    const isMobile = window.innerWidth <= 768;
    const isHod = roles.includes('HOD') || u.role === 'HOD' || Boolean(u.is_hod);
    if (isMobile && isHod) {
      window.location.replace('/faculty/classes/index.html');
      return;
    }
    window.location.replace('/faculty/dashboard/index.html');
  } catch (_) { }
})();

/* ── State ── */
let currentActivationToken = null;

/* ── Check for session revocation or logout notice ── */
(function checkSessionNotice() {
  try {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('reason');
    let notice = '';
    try {
      notice = sessionStorage.getItem('vidya_logout_notice') || '';
      sessionStorage.removeItem('vidya_logout_notice');
    } catch (_) { }

    if (!notice && reason) {
      if (reason === 'session_transferred') {
        notice = 'Your session has ended because this account was logged into from another device or signed out.';
      } else if (reason === 'session_expired') {
        notice = 'Your session expired due to inactivity. Please sign in again.';
      }
    }

    if (notice) {
      purgeAllStoredAuth();
      const sb = document.getElementById('status-alert-banner');
      if (sb) {
        const titleEl = document.getElementById('status-alert-title');
        const bodyEl = document.getElementById('status-alert-body');
        const linkEl = document.getElementById('status-alert-link');
        if (titleEl) titleEl.textContent = reason === 'session_expired' ? 'Session Expired' : 'Session Transferred';
        if (bodyEl) bodyEl.textContent = notice;
        if (linkEl) linkEl.style.display = 'none';
        sb.style.display = 'block';
      }
      if (window.history && window.history.replaceState && reason) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  } catch (_) { }
})();

/* ── Background Server Wake-Up Pre-Warming ── */
(function wakeUpServerPreWarm() {
  function pingHealth() {
    try {
      fetch('/api/v1/health', { cache: 'no-store' }).catch(() => { });
      fetch('https://vidyaos-backend.onrender.com/api/v1/health', { mode: 'no-cors', cache: 'no-store' }).catch(() => { });
    } catch (_) { }
  }
  pingHealth();
  setInterval(pingHealth, 120000);
})();

/* ── Cold-Start Retry Engine ── */
async function executeLoginWithRetry(payload, maxAttempts = 15) {
  const text = document.getElementById('submit-text');
  const sb = document.getElementById('status-alert-banner');
  const titleEl = document.getElementById('status-alert-title');
  const bodyEl = document.getElementById('status-alert-body');
  const linkEl = document.getElementById('status-alert-link');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        const elapsed = (attempt - 1) * 3;
        if (text) text.textContent = `Server waking up (${elapsed}s)...`;
        fetch('https://vidyaos-backend.onrender.com/api/v1/health', { mode: 'no-cors', cache: 'no-store' }).catch(() => { });
      }
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        suppressToast: true,
        body: JSON.stringify(payload)
      });
      if (sb) sb.style.display = 'none';
      return res;
    } catch (err) {
      const isColdStart =
        err?.status === 502 ||
        err?.status === 503 ||
        err?.status === 504 ||
        (err?.message && (
          err.message.includes('502') ||
          err.message.includes('503') ||
          err.message.includes('504') ||
          err.message.includes('Failed to fetch') ||
          err.message.includes('Network') ||
          err.message.includes('waking up')
        ));

      if (isColdStart && attempt < maxAttempts) {
        const elapsed = attempt * 3;
        if (text) text.textContent = `Server waking up (${elapsed}s)...`;
        if (sb) {
          if (titleEl) titleEl.textContent = '⚡ Cloud Server Spinning Up';
          if (bodyEl) bodyEl.textContent = `The institutional backend on Render is waking from idle sleep (~30-45s cold start). Connecting automatically (attempt ${attempt}/${maxAttempts})...`;
          if (linkEl) linkEl.style.display = 'none';
          sb.style.display = 'block';
        }
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      throw err;
    }
  }
}

function hideBanners() {
  const cb = document.getElementById('conflict-banner');
  const pb = document.getElementById('pending-banner');
  const sb = document.getElementById('status-alert-banner');
  const msg = document.getElementById('msg');
  if (cb) cb.style.display = 'none';
  if (pb) pb.style.display = 'none';
  if (sb) sb.style.display = 'none';
  if (msg) { msg.textContent = ''; msg.className = 'msg'; }
}

function showInlineMsg(text, type = 'err') {
  const msg = document.getElementById('msg');
  if (!msg) return;
  msg.textContent = text;
  msg.className = 'msg ' + (type === 'ok' ? 'ok' : 'err');
}

/* ── Password Toggle ── */
function togglePw() {
  const inp = document.getElementById('password');
  const btn = document.getElementById('pw-toggle-btn');
  if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  if (btn) {
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    btn.classList.toggle('text-blue-700', show);
    btn.classList.toggle('text-blue-600', !show);
    btn.innerHTML = show
      ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
         </svg>`
      : `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
           <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
         </svg>`;
  }
}

/* ── Device ID ── */
function getVidyaDeviceId() {
  if (typeof getDeviceId === 'function') return getDeviceId();
  let id = localStorage.getItem('vidyaos_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
    localStorage.setItem('vidyaos_device_id', id);
  }
  return id;
}

/* ── Post-login redirect ── */
function redirectAfterLogin(user) {
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const isAdmin = roles.includes('SYSTEM_ADMIN') || roles.includes('ADMIN') || user.role === 'SYSTEM_ADMIN' || user.role === 'ADMIN' || Boolean(user.is_admin);
  if (isAdmin) { window.location.href = '/admin/dashboard/index.html'; return; }
  if (roles.includes('STUDENT') || user.role === 'STUDENT') { window.location.href = '/student/home/index.html'; return; }
  const isMobile = window.innerWidth <= 768;
  const isHod = roles.includes('HOD') || user.role === 'HOD' || Boolean(user.is_hod);
  if (isMobile && isHod) {
    window.location.href = '/faculty/classes/index.html';
    return;
  }
  window.location.href = '/faculty/dashboard/index.html';
}

function setSocialButtonsDisabled(disabled) {
  const btns = [
    document.getElementById('google-signin-btn'),
    document.getElementById('m-google-btn')
  ];
  btns.forEach(b => {
    if (b) {
      b.disabled = disabled;
      if (disabled) {
        b.classList.add('disabled');
        b.setAttribute('aria-disabled', 'true');
      } else {
        b.classList.remove('disabled');
        b.removeAttribute('aria-disabled');
      }
    }
  });
}

function resetSubmitBtn() {
  const btn = document.getElementById('submit-btn');
  const text = document.getElementById('submit-text');
  const icon = document.getElementById('signin-icon');
  if (btn) btn.disabled = false;
  if (text) text.textContent = 'Sign In';
  if (icon) icon.innerHTML = '→';
  setSocialButtonsDisabled(false);
}

/* ── Input events: hide banners ── */
['identifier', 'password'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', hideBanners);
    el.addEventListener('focus', hideBanners);
  }
});

/* ── Instant lock on Sign In click ── */
const submitBtnEl = document.getElementById('submit-btn');
if (submitBtnEl) {
  submitBtnEl.addEventListener('click', () => {
    setSocialButtonsDisabled(true);
  });
}

/* ── Main login submit ── */
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('identifier').value.trim();
  const pw = document.getElementById('password').value;
  if (!id || !pw) {
    showInlineMsg('invalid credentials check id and password ', 'err');
    setSocialButtonsDisabled(false);
    return;
  }

  const btn = document.getElementById('submit-btn');
  const text = document.getElementById('submit-text');
  const icon = document.getElementById('signin-icon');
  btn.disabled = true;
  setSocialButtonsDisabled(true);
  text.textContent = 'Verifying…';
  if (icon) icon.innerHTML = '<span class="spinner"></span>';
  hideBanners();

  try {
    const deviceId = getVidyaDeviceId();
    const res = await executeLoginWithRetry({
      email: id, phone: id, credential: id,
      identifier: id, username: id, enrollment_no: id, ubter_roll_no: id,
      official_enrollment_no: id, registration_no: id, ubter_roll_no: id,
      official_enrollment_no: id, registration_no: id,
      password: pw,
      device_id: deviceId
    });

    if (res.success) {
      hideBanners();
      showInlineMsg('Sign-in verified! Redirecting…', 'ok');
      if (res.data.must_change_password) {
        currentActivationToken = res.data.activation_token;
        document.getElementById('act-name').textContent = res.data.user?.full_name || res.data.user?.email || 'Faculty';
        document.getElementById('act-email').textContent = res.data.user?.email || 'your account';
        document.getElementById('activation-modal').style.display = 'flex';
        resetSubmitBtn();
        return;
      }
      if (res.data?.user) {
        if (!res.data.user.google_linked) {
          localStorage.setItem('vidya_notify_google_connect', '1');
          localStorage.setItem('vidya_google_unlinked', '1');
        } else {
          localStorage.removeItem('vidya_notify_google_connect');
          localStorage.removeItem('vidya_google_unlinked');
        }
      }
      setAuthSession(res.data.access_token, res.data.user, res.data.refresh_token);
      setTimeout(() => redirectAfterLogin(res.data.user), 350);
    }
  } catch (err) {
    resetSubmitBtn();
    if (err?.code === 'ACCOUNT_ALREADY_ACTIVE') {
      document.getElementById('conflict-banner').style.display = 'block';
      return;
    }
    if (err?.code === 'PENDING_APPROVAL') {
      const pb = document.getElementById('pending-banner');
      if (pb) {
        const bodyEl = document.getElementById('pending-banner-text');
        if (bodyEl && err.message) {
          bodyEl.textContent = err.message + ' You will be able to sign in once approved.';
        }
        pb.style.display = 'block';
      }
      return;
    }
    if (err?.code === 'REGISTRATION_REJECTED' || (err?.code === 'FORBIDDEN' && err?.message && err.message.toLowerCase().includes('reject'))) {
      const sb = document.getElementById('status-alert-banner');
      if (sb) {
        document.getElementById('status-alert-title').textContent = 'Registration Rejected';
        document.getElementById('status-alert-body').textContent = err.message || 'Your registration request was rejected by institutional administration.';
        const link = document.getElementById('status-alert-link');
        if (link) link.style.display = 'inline-flex';
        sb.style.display = 'block';
      }
      return;
    }
    if (err?.code === 'FORBIDDEN') {
      const sb = document.getElementById('status-alert-banner');
      if (sb) {
        document.getElementById('status-alert-title').textContent = 'Access Restricted';
        document.getElementById('status-alert-body').textContent = err.message || 'Account access has been restricted. Please contact your department administration.';
        sb.style.display = 'block';
      }
      return;
    }

    // Unified security message on any credential failure
    const genericAuthError = 'Invalid credentials. Please check your username/email and password.';
    showInlineMsg(genericAuthError, 'err');
    try {
      if (typeof showToast === 'function') showToast(genericAuthError, 'error');
    } catch (_) { }
  }
});

/* ── Mobile Login Handlers (Modern Edu UI/UX Layout) ── */
function isMobileAppUser() {
  return typeof window !== 'undefined' && (
    Boolean(window.Capacitor?.isNativePlatform?.()) ||
    Boolean(window.Capacitor) ||
    window.VIDYAOS_IS_NATIVE === true ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    window.VIDYAOS_FORCE_NATIVE === true
  );
}

function handleMobileBack() {
  if (isMobileAppUser()) {
    showMobileSplashView();
  } else {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  }
}
window.handleMobileBack = handleMobileBack;

function showMobileLoginView() {
  const splash = document.getElementById('m-splash-view');
  const login = document.getElementById('m-login-view');
  if (splash && login) {
    splash.style.display = 'none';
    login.style.display = 'flex';
  }
}
window.showMobileLoginView = showMobileLoginView;

function showMobileSplashView() {
  const params = new URLSearchParams(window.location.search);
  const isPreview = params.get('preview') === 'splash';
  // Strictly for mobile application users (e.g. Capacitor APK shell)
  if (!isMobileAppUser() && !isPreview) {
    showMobileLoginView();
    return;
  }
  const splash = document.getElementById('m-splash-view');
  const login = document.getElementById('m-login-view');
  if (splash && login) {
    login.style.display = 'none';
    splash.style.display = 'flex';
  }
}
window.showMobileSplashView = showMobileSplashView;

(function setupMobileLoginForm() {
  // Check if running inside mobile application APK
  if (isMobileAppUser()) {
    const seenSplash = sessionStorage.getItem('vidya_mobile_splash_seen');
    if (!seenSplash) {
      showMobileSplashView();
      sessionStorage.setItem('vidya_mobile_splash_seen', '1');
    } else {
      showMobileLoginView();
    }
  } else {
    // Web users always see Login view directly
    showMobileLoginView();
  }

  const mToggleBtn = document.getElementById('m-togglePassword');
  const mPasswordInput = document.getElementById('m-password');
  if (mToggleBtn && mPasswordInput) {
    mToggleBtn.addEventListener('click', () => {
      const show = mPasswordInput.type === 'password';
      mPasswordInput.type = show ? 'text' : 'password';
      mToggleBtn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      mToggleBtn.setAttribute('aria-pressed', String(show));
      mToggleBtn.innerHTML = show
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
             <path d="M3 3L21 21M10.6 10.6A2 2 0 0 0 13.4 13.4M9.9 5.2A10.8 10.8 0 0 1 12 5C18.4 5 22 12 22 12S18.4 19 12 19C10.9 19 9.9 18.8 9 18.5" stroke-linecap="round"/>
           </svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
             <path d="M2 12S5.6 6 12 6S22 12 22 12S18.4 18 12 18S2 12 2 12Z"/>
             <circle cx="12" cy="12" r="3"/>
           </svg>`;
    });
  }

  // Live validation for email/identifier checkmark badge & Remember Me restoration
  const mIdInput = document.getElementById('m-identifier');
  const mCheckBadge = document.getElementById('m-identifier-check');
  const mRememberBox = document.getElementById('m-remember');

  if (mIdInput) {
    const updateCheckBadge = () => {
      const val = mIdInput.value.trim();
      if (mCheckBadge) {
        const isEmail = val.includes('@') && val.includes('.');
        const isPhone = /^(?:\+91|0)?[6-9]\d{9}$/.test(val);
        const isRoll = /^\d{11}$/.test(val);
        if (isEmail || isPhone || isRoll) {
          mCheckBadge.classList.add('visible');
        } else {
          mCheckBadge.classList.remove('visible');
        }
      }
    };

    mIdInput.addEventListener('input', updateCheckBadge);
    mIdInput.addEventListener('change', updateCheckBadge);

    // Restore remembered identifier
    try {
      const savedId = localStorage.getItem('vidya_remember_id');
      if (savedId) {
        mIdInput.value = savedId;
        if (mRememberBox) mRememberBox.checked = true;
        updateCheckBadge();
      }
    } catch (_) { }
  }

  const mLoginForm = document.getElementById('mobile-login-form');
  if (mLoginForm) {
    mLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = (document.getElementById('m-identifier')?.value || '').trim();
      const pw = document.getElementById('m-password')?.value || '';
      if (!id || !pw) return;

      // Handle Remember Me
      if (mRememberBox && mRememberBox.checked) {
        try { localStorage.setItem('vidya_remember_id', id); } catch (_) { }
      } else {
        try { localStorage.removeItem('vidya_remember_id'); } catch (_) { }
      }

      const btn = document.getElementById('m-submit-btn');
      const text = document.getElementById('m-submit-text');
      const msg = document.getElementById('m-message');
      if (btn) btn.disabled = true;
      if (text) text.textContent = 'Verifying...';
      if (msg) {
        msg.textContent = '';
        msg.className = 'm-message';
      }

      try {
        const deviceId = getVidyaDeviceId();
        const res = await executeLoginWithRetry({
          email: id, phone: id, credential: id,
          identifier: id, username: id, enrollment_no: id, ubter_roll_no: id,
      official_enrollment_no: id, registration_no: id, ubter_roll_no: id,
          official_enrollment_no: id, registration_no: id,
          password: pw,
          device_id: deviceId
        });

        if (res.success) {
          if (res.data.must_change_password) {
            currentActivationToken = res.data.activation_token;
            document.getElementById('act-name').textContent = res.data.user?.full_name || res.data.user?.email || 'Faculty';
            document.getElementById('act-email').textContent = res.data.user?.email || 'your account';
            document.getElementById('activation-modal').style.display = 'flex';
            if (btn) btn.disabled = false;
            if (text) text.textContent = 'Login Now';
            return;
          }
          if (res.data?.user) {
            if (!res.data.user.google_linked) {
              localStorage.setItem('vidya_notify_google_connect', '1');
              localStorage.setItem('vidya_google_unlinked', '1');
            } else {
              localStorage.removeItem('vidya_notify_google_connect');
              localStorage.removeItem('vidya_google_unlinked');
            }
          }
          setAuthSession(res.data.access_token, res.data.user, res.data.refresh_token);
          if (msg) {
            msg.textContent = 'Login successful! Redirecting...';
            msg.className = 'm-message success';
          }
          try { if (typeof showToast === 'function') showToast('Login successful! Redirecting…', 'success'); } catch (_) { }
          setTimeout(() => redirectAfterLogin(res.data.user), 350);
        }
      } catch (err) {
        if (btn) btn.disabled = false;
        if (text) text.textContent = 'Login Now';

        const genericError = 'Invalid credentials. Please check your username/email and password.';
        const isRestricted = err?.code === 'FORBIDDEN' || err?.message?.toLowerCase().includes('suspend') || err?.message?.toLowerCase().includes('restrict');
        const errMsg = isRestricted ? (err.message || 'Account access has been restricted. Please contact administration.') : genericError;

        if (msg) {
          msg.textContent = errMsg;
          msg.className = 'm-message error';
        }
        try {
          if (typeof showToast === 'function') showToast(errMsg, 'error');
        } catch (_) { }
      }
    });
  }
})();

/* ── Force login (session takeover) ── */
async function submitForceLogin() {
  const id = document.getElementById('identifier').value.trim();
  const pw = document.getElementById('password').value;
  const btn = document.getElementById('force-login-btn');
  btn.disabled = true;
  btn.textContent = 'Disconnecting…';

  try {
    const res = await executeLoginWithRetry({
      email: id, phone: id, credential: id,
      identifier: id, username: id, enrollment_no: id, ubter_roll_no: id,
      official_enrollment_no: id, registration_no: id,
      password: pw,
      device_id: getVidyaDeviceId(),
      force_logout: true
    });
    if (res.success) {
      hideBanners();
      setAuthSession(res.data.access_token, res.data.user, res.data.refresh_token);
      showInlineMsg('Previous session disconnected. Signing in…', 'ok');
      setTimeout(() => redirectAfterLogin(res.data.user), 350);
    }
  } catch (err) {
    showInlineMsg('invalid credentials check id and password ', 'err');
    btn.disabled = false;
    btn.textContent = 'Disconnect Other Device & Sign In Here';
  }
}

/* ── Activation modal submit ── */
document.getElementById('activation-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPw = document.getElementById('act-new-pw').value;
  const confPw = document.getElementById('act-confirm-pw').value;

  if (newPw !== confPw) {
    alert('Passwords do not match!');
    return;
  }

  const btn = document.getElementById('act-submit-btn');
  const text = document.getElementById('act-submit-text');
  btn.disabled = true;
  text.textContent = 'Activating…';

  try {
    const r = await fetch('/api/v1/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentActivationToken}`
      },
      body: JSON.stringify({ new_password: newPw })
    }).then(x => x.json());

    if (r.success) {
      setAuthSession(r.data.access_token, r.data.user, r.data.refresh_token);
      alert('Account activated! Welcome to VidyaOS.');
      setTimeout(() => redirectAfterLogin(r.data.user), 400);
    } else {
      throw { message: r.error?.message || 'Activation failed' };
    }
  } catch (err) {
    alert(err?.message || 'Activation failed');
    btn.disabled = false;
    text.textContent = 'Save & Enter Portal →';
  }
});

/* ── Google OAuth & Chooser Modal ── */
async function handleGoogleSignIn() {
  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn && submitBtn.disabled) return;

  const btn = document.getElementById('google-signin-btn') || document.getElementById('m-google-btn');
  if (btn && (btn.disabled || btn.classList.contains('disabled'))) return;

  const txt = document.getElementById('google-btn-text') || btn?.querySelector('span');
  if (btn) btn.disabled = true;
  if (txt) txt.textContent = 'Connecting to Google…';

  // 1. Android Native App: Launch native Google Account Chooser bottom-sheet
  if (window.NativeAuthBridge && typeof window.NativeAuthBridge.launchGoogleSignIn === 'function') {
    try {
      window.NativeAuthBridge.launchGoogleSignIn();
      return;
    } catch (e) {
      console.warn('NativeAuthBridge.launchGoogleSignIn failed, falling back to web flow:', e);
    }
  }

  // 2. Web browser flow (OAuth URL)
  try {
    const origin = (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:') && !window.location.origin.startsWith('capacitor:'))
      ? window.location.origin
      : 'https://vidyaos-pink.vercel.app';

    let res = await fetchApi('/auth/google/url?mode=LOGIN&origin=' + encodeURIComponent(origin)).catch(() => null);
    if (!res || !res.success || !res.data?.url) {
      res = await fetch('https://vidyaos-backend.onrender.com/api/v1/auth/google/url?mode=LOGIN&origin=' + encodeURIComponent(origin)).then(r => r.json()).catch(() => null);
    }

    if (res && res.data?.url) {
      // Direct navigation to Google OAuth with prompt=select_account triggers the Android Google account chooser
      window.location.href = res.data.url;
      return;
    }

    // Direct fallback with official Client ID if backend URL service is unreachable
    const clientId = '147063521055-9044vtuf4ldk39g7c55cgqdcu0r98e3u.apps.googleusercontent.com';
    const redirectUri = 'https://vidyaos-backend.onrender.com/api/v1/auth/google/callback';
    const stateObj = { mode: 'LOGIN', userId: null, frontendOrigin: origin, ts: Date.now() };
    const state = btoa(JSON.stringify(stateObj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const fallbackUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid+email+profile&access_type=offline&prompt=select_account&state=${state}`;
    window.location.href = fallbackUrl;
  } catch (err) {
    console.error('Google Sign-In initialization failed:', err);
    resetGoogleButtons();
  }
}

function resetGoogleButtons() {
  const btn = document.getElementById('google-signin-btn');
  const mBtn = document.getElementById('m-google-btn');
  const txt = document.getElementById('google-btn-text');
  if (btn) btn.disabled = false;
  if (mBtn) mBtn.disabled = false;
  if (txt) txt.textContent = 'Continue with Google';
  if (mBtn) {
    const mTxt = mBtn.querySelector('span');
    if (mTxt) mTxt.textContent = 'Sign In with Google';
  }
}

/* ── Native Google Sign-In Callbacks (from Android Google Play Services) ── */
window.onNativeGoogleSignInSuccess = async function(data) {
  const btn = document.getElementById('google-signin-btn') || document.getElementById('m-google-btn');
  const txt = document.getElementById('google-btn-text') || btn?.querySelector('span');
  if (txt) txt.textContent = 'Verifying account…';

  try {
    const payload = typeof data === 'string' ? JSON.parse(data) : data;
    const { idToken, email, name, sub } = payload;
    const deviceId = getVidyaDeviceId();
    const apiBase = window.VIDYAOS_API_BASE || '/api/v1';

    let res = null;
    try {
      const response = await fetch(`${apiBase}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_token: idToken || ('google_' + (email || '').toLowerCase()),
          email: email,
          name: name,
          sub: sub,
          device_id: deviceId
        })
      });
      res = await response.json();
    } catch (_) {
      const response = await fetch('https://vidyaos-backend.onrender.com/api/v1/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_token: idToken || ('google_' + (email || '').toLowerCase()),
          email: email,
          name: name,
          sub: sub,
          device_id: deviceId
        })
      });
      res = await response.json();
    }

    if (res && res.requires_password) {
      resetGoogleButtons();
      openGoogleLinkPwdModal(res.data || { email, google_sub: sub, google_name: name, google_token: idToken });
      return;
    }

    if (res && res.success && res.data?.access_token) {
      setAuthSession(res.data.access_token, res.data.user, res.data.refresh_token);
      showInlineMsg('Google Sign-In verified! Redirecting…', 'ok');
      setTimeout(() => redirectAfterLogin(res.data.user), 350);
    } else if (res && (res.error?.code === 'UNAUTHORIZED' || res.error?.code === 'NOT_REGISTERED' || (res.error?.message && res.error.message.includes('No account found')))) {
      // Direct routing to student registration with prefilled Google account!
      window.location.href = `/login/register/index.html?role=student&google_email=${encodeURIComponent(email || '')}&google_name=${encodeURIComponent(name || '')}&google_sub=${encodeURIComponent(sub || '')}&google_id_token=${encodeURIComponent(idToken || '')}`;
    } else if (res && res.error?.code === 'PENDING_APPROVAL') {
      window.location.href = `/login/index.html?role=student&google_pending=1&email=${encodeURIComponent(email || '')}`;
    } else {
      const msg = res?.error?.message || 'invalid credentials check id and password ';
      showInlineMsg(msg, 'err');
      resetGoogleButtons();
    }
  } catch (err) {
    console.error('Native Google Sign-In processing error:', err);
    showInlineMsg(err.message || 'Google login failed', 'err');
    resetGoogleButtons();
  }
};

window.onNativeGoogleSignInError = function(err) {
  console.warn('Native Google Sign-In cancelled or error:', err);
  resetGoogleButtons();
};

function openGoogleSignInModal() {
  const modal = document.getElementById('google-signin-modal');
  const errBox = document.getElementById('google-login-card-error');
  if (errBox) errBox.style.display = 'none';
  const inp = document.getElementById('google-manual-email');
  if (inp) {
    inp.value = '';
    setTimeout(() => inp.focus(), 100);
  }
  if (modal) modal.style.display = 'flex';
}

function closeGoogleSignInModal() {
  const modal = document.getElementById('google-signin-modal');
  if (modal) modal.style.display = 'none';
}

function submitGoogleManualLogin() {
  const inp = document.getElementById('google-manual-email');
  const email = inp ? inp.value.trim() : '';
  if (!email || !email.includes('@')) {
    const errBox = document.getElementById('google-login-card-error');
    if (errBox) {
      errBox.textContent = 'Please enter a valid Google email address.';
      errBox.style.display = 'block';
    }
    return;
  }
  loginWithGoogleEmail(email);
}

async function loginWithGoogleEmail(email) {
  const errBox = document.getElementById('google-login-card-error');
  if (errBox) errBox.style.display = 'none';

  try {
    const deviceId = getVidyaDeviceId();
    const res = await fetch('/api/v1/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_token: 'google_' + email.toLowerCase(),
        device_id: deviceId
      })
    }).then(r => r.json());

    if (res.requires_password) {
      closeGoogleSignInModal();
      openGoogleLinkPwdModal(res.data || { email: email, google_token: 'google_' + email.toLowerCase() });
      return;
    }

    if (res.success && res.data?.access_token) {
      closeGoogleSignInModal();
      setAuthSession(res.data.access_token, res.data.user, res.data.refresh_token);
      showInlineMsg('Google login successful! Redirecting…', 'ok');
      setTimeout(() => redirectAfterLogin(res.data.user), 350);
    } else {
      const msg = res.error?.message || 'invalid credentials check id and password ';
      if (errBox) {
        errBox.textContent = msg;
        errBox.style.display = 'block';
      } else {
        alert(msg);
      }
    }
  } catch (err) {
    if (errBox) {
      errBox.textContent = err.message || 'invalid credentials check id and password ';
      errBox.style.display = 'block';
    }
  }
}

/* ── Google Account Password Verification Modal for 1-Click Linking ── */
let pendingGoogleLinkData = null;

function openGoogleLinkPwdModal(data) {
  pendingGoogleLinkData = data || {};
  const modal = document.getElementById('google-link-pwd-modal');
  if (!modal) return;

  const email = pendingGoogleLinkData.email || '';
  const name = pendingGoogleLinkData.google_name || pendingGoogleLinkData.username || (email.includes('@') ? email.split('@')[0] : 'User Account');
  const initial = (name.charAt(0) || email.charAt(0) || 'G').toUpperCase();

  const nameEl = document.getElementById('glp-name');
  const emailEl = document.getElementById('glp-email');
  const avatarEl = document.getElementById('glp-avatar');
  const pwdInp = document.getElementById('glp-password');
  const errBox = document.getElementById('glp-error');
  const submitBtn = document.getElementById('glp-submit-btn');
  const submitText = document.getElementById('glp-submit-text');

  if (nameEl) nameEl.textContent = name;
  if (emailEl) emailEl.textContent = email;
  if (avatarEl) avatarEl.textContent = initial;
  if (pwdInp) pwdInp.value = '';
  if (errBox) { errBox.textContent = ''; errBox.style.display = 'none'; }
  if (submitBtn) submitBtn.disabled = false;
  if (submitText) submitText.textContent = 'Verify & Link Google';

  modal.style.display = 'flex';
  setTimeout(() => { if (pwdInp) pwdInp.focus(); }, 150);
}

function closeGoogleLinkPwdModal() {
  const modal = document.getElementById('google-link-pwd-modal');
  if (modal) modal.style.display = 'none';
  pendingGoogleLinkData = null;
  resetGoogleButtons();
}

function toggleGlpPasswordVisibility() {
  const inp = document.getElementById('glp-password');
  if (!inp) return;
  inp.type = (inp.type === 'password') ? 'text' : 'password';
}

async function submitGooglePasswordLink() {
  if (!pendingGoogleLinkData) return;
  const pwdInp = document.getElementById('glp-password');
  const errBox = document.getElementById('glp-error');
  const submitBtn = document.getElementById('glp-submit-btn');
  const submitText = document.getElementById('glp-submit-text');

  const password = pwdInp ? pwdInp.value.trim() : '';
  if (!password) {
    if (errBox) {
      errBox.textContent = 'Please enter your VidyaOS account password.';
      errBox.style.display = 'block';
    }
    if (pwdInp) pwdInp.focus();
    return;
  }

  if (errBox) errBox.style.display = 'none';
  if (submitBtn) submitBtn.disabled = true;
  if (submitText) submitText.textContent = 'Verifying & Linking…';

  try {
    const deviceId = getVidyaDeviceId();
    const token = pendingGoogleLinkData.google_token || pendingGoogleLinkData.id_token || ('google_' + (pendingGoogleLinkData.email || '').toLowerCase());
    const apiBase = window.VIDYAOS_API_BASE || '/api/v1';

    let res = null;
    try {
      const response = await fetch(`${apiBase}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_token: token,
          email: pendingGoogleLinkData.email,
          password: password,
          sub: pendingGoogleLinkData.google_sub,
          device_id: deviceId
        })
      });
      res = await response.json();
    } catch (_) {
      const response = await fetch('https://vidyaos-backend.onrender.com/api/v1/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_token: token,
          email: pendingGoogleLinkData.email,
          password: password,
          sub: pendingGoogleLinkData.google_sub,
          device_id: deviceId
        })
      });
      res = await response.json();
    }

    if (res && res.success && res.data?.access_token) {
      closeGoogleLinkPwdModal();
      setAuthSession(res.data.access_token, res.data.user, res.data.refresh_token);
      showInlineMsg('Google 1-click login enabled! Redirecting…', 'ok');
      setTimeout(() => redirectAfterLogin(res.data.user), 350);
    } else {
      const msg = res?.error?.message || 'Incorrect account password. Please verify and try again.';
      if (errBox) {
        errBox.textContent = msg;
        errBox.style.display = 'block';
      }
      if (submitBtn) submitBtn.disabled = false;
      if (submitText) submitText.textContent = 'Verify & Link Google';
    }
  } catch (err) {
    if (errBox) {
      errBox.textContent = err.message || 'Verification failed. Please check network connection and try again.';
      errBox.style.display = 'block';
    }
    if (submitBtn) submitBtn.disabled = false;
    if (submitText) submitText.textContent = 'Verify & Link Google';
  }
}

window.addEventListener('message', (event) => {
  if (event.data?.type === 'GOOGLE_REQUIRE_PASSWORD_LINK') {
    openGoogleLinkPwdModal(event.data.payload);
    return;
  }
  if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
    const { payload } = event.data;
    if (payload?.access_token) {
      setAuthSession(payload.access_token, payload.user, payload.refresh_token);
      showInlineMsg('Google login successful! Redirecting…', 'ok');
      setTimeout(() => redirectAfterLogin(payload.user), 400);
    }
  } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
    showInlineMsg(event.data.message || 'invalid credentials check id and password ', 'err');
  }
});

/* ── Forgot Password ── */
function handleForgotPassword() {
  alert('To reset your password, contact your Department HOD or System Administrator.');
}

/* ── Check URL parameters for pending status or messages ── */
(function handleUrlParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('require_password_link') === '1') {
    openGoogleLinkPwdModal({
      email: params.get('email'),
      google_sub: params.get('google_sub'),
      google_name: params.get('google_name'),
      google_token: params.get('google_token') || params.get('id_token')
    });
  }
  if (params.get('pending') === '1' || params.get('google_pending') === '1' || params.get('status') === 'pending') {
    const pb = document.getElementById('pending-banner');
    if (pb) {
      const email = params.get('email');
      if (email) {
        const bodyEl = document.getElementById('pending-banner-text');
        if (bodyEl) {
          bodyEl.textContent = `The registration request for "${email}" is currently under review by Department Faculty. You will be able to sign in once approved.`;
        }
      }
      pb.style.display = 'block';
    }
  }
  const msg = params.get('message');
  if (msg) showInlineMsg(decodeURIComponent(msg), 'ok');
  const errMsg = params.get('error');
  if (errMsg) showInlineMsg('Invalid credentials. Please check your username/email and password.', 'err');
})();

/* ── Dynamic College Campus Banner (Fetched from Admin Settings) ── */
function resolveBrandingUrl(url, fallback) {
  if (!url) return fallback;
  if (typeof window !== 'undefined' && (window.VIDYAOS_IS_NATIVE || window.VIDYAOS_FORCE_NATIVE)) {
    if (url.startsWith('/uploads')) {
      return (window.VIDYAOS_CLOUD_BACKEND || 'https://vidyaos-backend.onrender.com') + url;
    }
  }
  return url;
}

async function loadDynamicCampusBanner() {
  function applyBanner(bannerUrl) {
    if (!bannerUrl) return;
    const resolvedUrl = resolveBrandingUrl(bannerUrl, '/login/campus.jpg');

    // 1. Mobile top background (.m-background)
    const mBg = document.querySelector('.m-background') || document.querySelector('.background');
    if (mBg) {
      mBg.style.backgroundImage = `linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 0%, rgba(237, 244, 255, 0.35) 25%, rgba(237, 244, 255, 0.94) 53%, #edf4ff 75%), url("${resolvedUrl}")`;
    }

    // 2. Desktop slideshow first slide (.slide.s1)
    const dSlide1 = document.querySelector('.slide.s1');
    if (dSlide1) {
      dSlide1.style.backgroundImage = `url("${resolvedUrl}")`;
    }
  }

  // A. Paint instantly from localStorage cache if available
  try {
    const cached = JSON.parse(localStorage.getItem('institutionSettings') || localStorage.getItem('adminSettings') || '{}');
    if (cached.institution_banner_url || cached.banner_url) {
      applyBanner(cached.institution_banner_url || cached.banner_url);
    }
  } catch (_) {}

  // B. Fetch live settings from backend branding API
  try {
    const res = await fetch('/api/v1/auth/branding').then(r => r.json());
    if (res.success && res.data) {
      const banner = res.data.institution_banner_url;
      if (banner) {
        applyBanner(banner);
        try {
          const prev = JSON.parse(localStorage.getItem('institutionSettings') || '{}');
          localStorage.setItem('institutionSettings', JSON.stringify({ ...prev, ...res.data }));
        } catch (_) {}
      }
    }
  } catch (_) {
    // Fallback: attempt admin settings
    try {
      const res = await fetch('/api/v1/admin/settings').then(r => r.json());
      if (res.success && res.data?.institution_banner_url) {
        applyBanner(res.data.institution_banner_url);
      }
    } catch (_) {}
  }
}

// Ensure APK download buttons are strictly hidden when running inside the mobile APK
function hideApkButtonsInNativeApp() {
  const isNativeApp = (
    window.VIDYAOS_IS_NATIVE === true ||
    window.VIDYAOS_FORCE_NATIVE === true ||
    Boolean(window.Capacitor?.isNativePlatform?.()) ||
    Boolean(window.Capacitor) ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:'
  );
  if (isNativeApp) {
    document.querySelectorAll('.apk-btn, .m-btn-apk').forEach(el => {
      el.style.setProperty('display', 'none', 'important');
    });
  }
}

// Call on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadDynamicCampusBanner();
    hideApkButtonsInNativeApp();
  });
} else {
  loadDynamicCampusBanner();
  hideApkButtonsInNativeApp();
}

// ── Download App Modal Handlers (Android APK & iOS PWA) ──
function openDownloadAppModal(defaultPlatform) {
  const modal = document.getElementById('download-app-modal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    const platformToSelect = defaultPlatform || (window.innerWidth <= 768 ? 'android' : 'pc');
    switchDownloadTab(platformToSelect);
  }
}

function closeDownloadAppModal() {
  const modal = document.getElementById('download-app-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
}

function switchDownloadTab(platform) {
  const pcTab = document.getElementById('tab-btn-pc');
  const androidTab = document.getElementById('tab-btn-android');
  const iosTab = document.getElementById('tab-btn-ios');
  const pcPanel = document.getElementById('download-panel-pc');
  const androidPanel = document.getElementById('download-panel-android');
  const iosPanel = document.getElementById('download-panel-ios');

  [pcTab, androidTab, iosTab].forEach(tab => {
    if (tab) {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    }
  });

  [pcPanel, androidPanel, iosPanel].forEach(panel => {
    if (panel) panel.style.display = 'none';
  });

  if (platform === 'android') {
    if (androidTab) { androidTab.classList.add('active'); androidTab.setAttribute('aria-selected', 'true'); }
    if (androidPanel) androidPanel.style.display = 'flex';
  } else if (platform === 'ios') {
    if (iosTab) { iosTab.classList.add('active'); iosTab.setAttribute('aria-selected', 'true'); }
    if (iosPanel) iosPanel.style.display = 'flex';
  } else {
    if (pcTab) { pcTab.classList.add('active'); pcTab.setAttribute('aria-selected', 'true'); }
    if (pcPanel) pcPanel.style.display = 'flex';
  }
}

function copyCurrentWebUrl(btn) {
  const url = window.location.origin || window.location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      const label = document.getElementById('copy-btn-label');
      if (label) {
        const orig = label.innerText;
        label.innerText = '✓ Link Copied to Clipboard!';
        setTimeout(() => { label.innerText = orig; }, 2500);
      }
    }).catch(() => {
      prompt('Copy this website link for Safari:', url);
    });
  } else {
    prompt('Copy this website link for Safari:', url);
  }
}

// Global keyboard handler for Esc key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDownloadAppModal();
  }
});

window.openDownloadAppModal = openDownloadAppModal;
window.closeDownloadAppModal = closeDownloadAppModal;
window.switchDownloadTab = switchDownloadTab;
window.copyCurrentWebUrl = copyCurrentWebUrl;

/* ══════════════════════════════════════════════════════════════
   UGIP NAINITAL CAMPUS PHOTO GALLERY & STAFF UPLOAD ENGINE
   (Dev 4 Interactive Campus Photo Gallery Implementation)
   ══════════════════════════════════════════════════════════════ */
(() => {
  const collections = {
    campus: {
      title: 'Our Campus',
      description: 'Campus views, facilities and surroundings',
      images: [
        ['/login/images/gallery-campus.jpg', 'UGIP Nainital campus entrance'],
        ['/login/images/bg1-campus.jpg', 'Campus overview'],
        ['/login/images/bg3-building.jpg', 'Institutional building'],
        ['/login/images/image.png', 'Academic and administrative block'],
        ['/login/images/all.jpg', 'Campus environment']
      ]
    },
    nainital: {
      title: 'Nainital',
      description: 'Nainital views and the Himalayan region',
      images: [
        ['/login/images/gallery-nainital.jpg', 'Nainital lake and Himalayan peaks'],
        ['/login/images/bg4-himalaya.jpg', 'Himalayan mountain view'],
        ['/login/images/gallery-natural-beauty.jpg', 'Natural beauty near Nainital'],
        ['/login/images/academic.png', 'Himalayan landscape']
      ]
    },
    academic: {
      title: 'Academic Block',
      description: 'Classrooms, administrative blocks and academic areas',
      images: [
        ['/login/images/bg3-building.jpg', 'UGIP Institutional and Administrative building'],
        ['/login/images/image.png', 'Administrative and academic block'],
        ['/login/images/academic.png', 'Academic facilities'],
        ['/login/images/all.jpg', 'Campus view']
      ]
    },
    nature: {
      title: 'Natural Beauty',
      description: 'Scenic beauty, surrounding mountains and lake city landscape',
      images: [
        ['/login/images/gallery-natural-beauty.jpg', 'Nature and Himalayan scenic beauty near Nainital'],
        ['/login/images/bg4-himalaya.jpg', 'Himalaya range'],
        ['/login/images/gallery-nainital.jpg', 'Nainital town'],
        ['/login/images/academic.png', 'Himalayan landscape near Nainital']
      ]
    }
  };

  const modal = document.getElementById('galleryModal');
  if (!modal) return;
  const title = document.getElementById('galleryTitle');
  const description = document.getElementById('galleryDescription');
  const mainImage = document.getElementById('galleryMainImage');
  const counter = document.getElementById('galleryCounter');
  const thumbs = document.getElementById('galleryThumbs');
  const closeButton = document.getElementById('galleryClose');
  const modalUploadButton = document.getElementById('galleryUploadBtn');
  const modalUploadInput = document.getElementById('galleryModalUpload');

  let currentCollection = null;
  let currentIndex = 0;
  let lastTrigger = null;

  function render() {
    if (!currentCollection || !collections[currentCollection]) return;
    const current = collections[currentCollection];
    const item = current.images[currentIndex];
    if (!item) return;
    mainImage.src = item[0];
    mainImage.alt = item[1];
    counter.textContent = `${currentIndex + 1} / ${current.images.length}`;

    thumbs.innerHTML = '';
    current.images.forEach((img, idx) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `gallery-thumb${idx === currentIndex ? ' active' : ''}`;
      button.innerHTML = `<img src="${img[0]}" alt="${img[1]}"><span>${img[1]}</span>`;
      button.addEventListener('click', () => {
        currentIndex = idx;
        render();
      });
      thumbs.appendChild(button);
    });
  }

  function openGallery(name, trigger) {
    if (!collections[name]) return;
    currentCollection = name;
    currentIndex = 0;
    lastTrigger = trigger || null;
    title.textContent = collections[name].title;
    description.textContent = collections[name].description;
    render();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gallery-open');
    if (closeButton) closeButton.focus();
  }

  function closeGallery() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gallery-open');
    if (lastTrigger) lastTrigger.focus();
  }

  document.querySelectorAll('[data-gallery]').forEach(button => {
    button.addEventListener('click', () => openGallery(button.dataset.gallery, button));
  });
  if (closeButton) closeButton.addEventListener('click', closeGallery);

  const prevBtn = document.getElementById('galleryPrev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (!currentCollection || !collections[currentCollection]) return;
      const count = collections[currentCollection].images.length;
      currentIndex = (currentIndex - 1 + count) % count;
      render();
    });
  }

  const nextBtn = document.getElementById('galleryNext');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!currentCollection || !collections[currentCollection]) return;
      const count = collections[currentCollection].images.length;
      currentIndex = (currentIndex + 1) % count;
      render();
    });
  }

  modal.addEventListener('click', event => {
    if (event.target === modal) closeGallery();
  });

  document.addEventListener('keydown', event => {
    if (!modal.classList.contains('open')) return;
    if (event.key === 'Escape') closeGallery();
    if (event.key === 'ArrowLeft' && prevBtn) prevBtn.click();
    if (event.key === 'ArrowRight' && nextBtn) nextBtn.click();
  });

  // Modal upload button (staff permission confirmation)
  if (modalUploadButton && modalUploadInput) {
    modalUploadButton.addEventListener('click', () => {
      const confirmed = window.confirm('Restricted action: only teachers, faculty or administrators may upload or change gallery images. Confirm that you are authorized to continue.');
      if (confirmed) modalUploadInput.click();
    });
    modalUploadInput.addEventListener('change', () => {
      const files = Array.from(modalUploadInput.files || []).filter(file => file.type.startsWith('image/'));
      if (!files.length || !currentCollection) return;
      files.forEach(file => {
        const url = URL.createObjectURL(file);
        collections[currentCollection].images.push([url, file.name || 'Uploaded photo']);
      });
      currentIndex = collections[currentCollection].images.length - files.length;
      render();
      description.textContent = `${collections[currentCollection].description} • ${files.length} photo(s) added for this session`;
      modalUploadInput.value = '';
    });
  }

  window.vidyaGalleryCollections = collections;
  window.vidyaOpenGallery = openGallery;
})();

/* Local image upload for the campus gallery (session-only previews) */
(() => {
  const uploadButton = document.getElementById('uploadImagesBtn');
  const uploadInput = document.getElementById('galleryUpload');
  const galleryGrid = document.querySelector('.gallery');
  if (!uploadButton || !uploadInput || !galleryGrid) return;
  let uploadedCard = null;
  const uploadedUrls = [];

  uploadButton.addEventListener('click', () => {
    const confirmed = window.confirm('Restricted action: only teachers, faculty or administrators may upload or change gallery images. Confirm that you are authorized to continue.');
    if (confirmed) uploadInput.click();
  });

  uploadInput.addEventListener('change', () => {
    const selected = Array.from(uploadInput.files || []).filter(file => file.type.startsWith('image/'));
    if (!selected.length) return;
    const collections = window.vidyaGalleryCollections;
    if (!collections) return;
    if (!collections.uploaded) {
      collections.uploaded = {
        title: 'My Uploads',
        description: 'Images you added from this device',
        images: []
      };
    }
    selected.forEach(file => {
      const url = URL.createObjectURL(file);
      uploadedUrls.push(url);
      collections.uploaded.images.push([url, file.name || 'Uploaded image']);
    });
    if (!uploadedCard) {
      uploadedCard = document.createElement('button');
      uploadedCard.type = 'button';
      uploadedCard.className = 'card uploaded-card';
      uploadedCard.dataset.gallery = 'uploaded';
      uploadedCard.setAttribute('aria-label', 'Open My Uploads gallery');
      uploadedCard.innerHTML = '<img alt="Your uploaded images"><span><i>★</i>My Uploads <b class="card-more">View gallery ↗</b></span>';
      galleryGrid.appendChild(uploadedCard);
      uploadedCard.addEventListener('click', () => window.vidyaOpenGallery('uploaded', uploadedCard));
    }
    uploadedCard.querySelector('img').src = collections.uploaded.images[0][0];
    uploadedCard.querySelector('img').alt = 'Your uploaded images';
    uploadButton.innerHTML = '<span>＋</span> Add More Images';
    uploadInput.value = '';
  });

  window.addEventListener('beforeunload', () => uploadedUrls.forEach(URL.revokeObjectURL));
})();

/* ══════════════════════════════════════════════════════════════
   SHOWCASE CLEAN CENTER IMAGE ENGINE (80/20 Presentation)
   ══════════════════════════════════════════════════════════════ */
(() => {
  window.switchCleanImage = function(src, title, subtitle, btn) {
    const img = document.getElementById('showcaseCleanImg');
    const capTitle = document.getElementById('captionTitle');
    const capSub = document.getElementById('captionSub');
    if (!img) return;
    img.style.opacity = '0';
    img.style.transform = 'scale(0.985)';
    setTimeout(() => {
      img.src = src;
      if (capTitle && title) capTitle.textContent = title;
      if (capSub && subtitle) capSub.textContent = subtitle;
      img.style.opacity = '1';
      img.style.transform = 'scale(1)';
    }, 160);
    if (btn && btn.parentElement) {
      btn.parentElement.querySelectorAll('.img-pill, .card').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
    }
  };

  window.selectShowcaseCard = function(src, title, subtitle, cardEl) {
    window.switchCleanImage(src, title, subtitle);
    if (cardEl && cardEl.parentElement) {
      cardEl.parentElement.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
      cardEl.classList.add('active');
    }
  };

  const uploadBtn = document.getElementById('uploadImagesBtn');
  const uploadInput = document.getElementById('galleryUpload');
  if (uploadBtn && uploadInput) {
    uploadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      uploadInput.click();
    });
    uploadInput.addEventListener('change', () => {
      const selected = Array.from(uploadInput.files || []).filter(f => f.type.startsWith('image/'));
      if (selected.length) {
        const url = URL.createObjectURL(selected[0]);
        const name = selected[0].name.replace(/\.[^/.]+$/, "");
        window.switchCleanImage(url, name, 'Uploaded Campus Photo', uploadBtn);
      }
    });
  }
})();

/* ══════════════════════════════════════════════════════════════════════════
   MODERN DUAL-TONE 70/30 CAROUSEL, PROJECT TEAM & LIGHTBOX ENGINE
   ══════════════════════════════════════════════════════════════════════════ */
const DEFAULT_CAMPUS_IMAGES = [
  {
    id: 'campus',
    title: 'UGIP Main Campus',
    subtitle: 'Government Polytechnic Nainital, Uttarakhand',
    category: 'Our Campus',
    tag: 'Campus & Facilities',
    src: '/login/images/bg1-campus.jpg',
    fallback: '/login/images/all.jpg'
  },
  {
    id: 'nainital',
    title: 'Nainital Lake',
    subtitle: 'Scenic Naini Lake, Uttarakhand',
    category: 'Nainital Lake',
    tag: 'Nainital',
    src: '/login/images/gallery-nainital.jpg',
    fallback: '/login/images/bg4-himalaya.jpg'
  },
  {
    id: 'academic',
    title: 'Academic Block',
    subtitle: 'Government Polytechnic Nainital (UGIP)',
    category: 'Academic Block',
    tag: 'Academic Block',
    src: '/login/images/bg3-building.jpg',
    fallback: '/login/images/academic.png'
  },
  {
    id: 'lab',
    title: 'IT & Computing Lab',
    subtitle: 'Mountain-View Workstations',
    category: 'IT & Computing Lab',
    tag: 'Labs & Library',
    src: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
    fallback: '/login/images/all.jpg'
  },
  {
    id: 'nature',
    title: 'Natural Beauty',
    subtitle: 'Snow-Capped Himalayan Views',
    category: 'Natural Beauty',
    tag: 'Natural Beauty',
    src: '/login/images/gallery-natural-beauty.jpg',
    fallback: '/login/images/bg4-himalaya.jpg'
  }
];

const PROJECT_TEAM = [
  {
    id: 'team-lead',
    title: 'Team Lead',
    subtitle: 'Full-Stack Architecture',
    name: 'Navneet Mishra',
    role: 'Team Lead',
    category: 'Team Lead',
    tag: 'Lead Architect',
    src: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80',
    fallback: '/login/images/bg1-campus.jpg',
    bio: 'Lead system architect overseeing frontend & backend campus ERP pipelines, database modeling, and institutional deployments at UGIP Nainital.',
    highlights: ['System Design & Architecture', 'Node.js & MySQL Core APIs', 'Docker & Production Hosting', 'Security & RBAC Enforcement']
  },
  {
    id: 'backend-dev',
    title: 'Backend Developer',
    subtitle: 'Node.js & MySQL APIs',
    name: 'Backend Engineering Team',
    role: 'Backend Developer',
    category: 'Backend Developer',
    tag: 'APIs & Database',
    src: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    fallback: '/login/images/academic.png',
    bio: 'Engineered scalable RESTful microservices, JWT authentication, role-based access control (RBAC), and automated NBA calculation engines.',
    highlights: ['Express.js REST Endpoints', 'Normalized MySQL Schemas', 'JWT Auth & Session Takeover', 'NBA Rubric Engine']
  },
  {
    id: 'frontend-dev',
    title: 'Frontend Developer',
    subtitle: 'Web Portals & UI',
    name: 'Frontend Engineering Team',
    role: 'Frontend Developer',
    category: 'Frontend Developer',
    tag: 'UI & Portals',
    src: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=600&q=80',
    fallback: '/login/images/all.jpg',
    bio: 'Designed responsive user interfaces, accessible forms, mobile course dossiers, and dynamic interactive SVG charts.',
    highlights: ['Responsive 70/30 Split Layout', 'TailwindCSS & Modern Design', 'Mobile Touch-Optimized UX', 'PWA & Hybrid App Support']
  },
  {
    id: 'hardware-iot',
    title: 'Hardware & IoT',
    subtitle: 'ESP32 Biometric Systems',
    name: 'IoT & Embedded Systems Lab',
    role: 'Hardware & IoT',
    tag: 'Biometrics & Hardware',
    category: 'Hardware & IoT',
    src: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    fallback: '/login/images/bg3-building.jpg',
    bio: 'Integrated biometric fingerprint scanners, RFID smart attendance hardware, and ESP32 WiFi gateway firmware with VidyaOS cloud.',
    highlights: ['ESP32 WiFi Gateways', 'Optical Fingerprint Modules', 'Real-Time MQTT Sync', 'Offline Attendance Cache']
  },
  {
    id: 'ui-qa',
    title: 'UI & QA Engineer',
    subtitle: 'Design & Testing',
    name: 'Quality Assurance & Design',
    role: 'UI & QA Engineer',
    tag: 'Design & QA',
    category: 'UI & QA Engineer',
    src: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80',
    fallback: '/login/images/image.png',
    bio: 'Conducted cross-browser audits, accessibility (a11y) conformance, responsive testing, and end-to-end verification across devices.',
    highlights: ['WCAG 2.1 Accessibility', 'Cross-Browser Verification', 'Automated E2E Test Suites', 'Performance Optimization']
  }
];

let CAMPUS_IMAGES = [...DEFAULT_CAMPUS_IMAGES];
// Unified slide list combining all campus images AND all 5 project team cards
let slides = [...CAMPUS_IMAGES, ...PROJECT_TEAM];

let carouselSwitchSpeed = 3600; // 3.6s auto-advance
let carouselAutoplayEnabled = true;
let activeSlideIndex = 0;
let carouselTimer = null;
let isCarouselHovered = false;
let lastAnimationIndex = -1;

const ANIMATION_CLASSES = [
  'anim-y-flip',
  'anim-x-pitch',
  'anim-scatter',
  'anim-diagonal',
  'anim-zoom-drop',
  'anim-skew-whip',
  'anim-twist',
  'anim-elastic-pop'
];

// Load persisted carousel configuration
function loadCarouselConfig() {
  try {
    const raw = localStorage.getItem('vidyaos_carousel_config');
    if (raw) {
      const cfg = JSON.parse(raw);
      if (Array.isArray(cfg.images) && cfg.images.length > 0) {
        CAMPUS_IMAGES = cfg.images;
        slides = [...CAMPUS_IMAGES, ...PROJECT_TEAM];
      }
      if (typeof cfg.switch_speed === 'number' && cfg.switch_speed >= 1000) {
        carouselSwitchSpeed = cfg.switch_speed;
      }
      if (typeof cfg.autoplay === 'boolean') {
        carouselAutoplayEnabled = cfg.autoplay;
      }
    }
  } catch (_) {}

  // Fetch from public backend API asynchronously
  if (typeof fetch === 'function') {
    fetch('/api/v1/auth/carousel', { cache: 'no-store' })
      .then(r => r.json())
      .then(res => {
        if (res && res.success && res.data) {
          let needsUpdate = false;
          if (Array.isArray(res.data.images) && res.data.images.length > 0) {
            CAMPUS_IMAGES = res.data.images;
            slides = [...CAMPUS_IMAGES, ...PROJECT_TEAM];
            needsUpdate = true;
          }
          if (typeof res.data.switch_speed === 'number' && res.data.switch_speed >= 1000) {
            carouselSwitchSpeed = res.data.switch_speed;
            needsUpdate = true;
          }
          if (typeof res.data.autoplay === 'boolean') {
            carouselAutoplayEnabled = res.data.autoplay;
            needsUpdate = true;
          }
          if (needsUpdate) {
            renderSlides();
            renderBottomCards();
            startCarouselAutoplay();
          }
        }
      })
      .catch(() => {});
  }
}

function renderSlides() {
  const track = document.getElementById('carouselTrack');
  const mobileStrip = document.getElementById('mobileStrip');
  const dotsContainer = document.getElementById('carouselDots');
  if (!track) return;

  track.innerHTML = '';
  if (dotsContainer) dotsContainer.innerHTML = '';
  if (mobileStrip) mobileStrip.innerHTML = '';

  const total = slides.length;

  // Render desktop 3D peek slides
  slides.forEach((item, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'slide-wrapper';
    wrapper.dataset.index = index;

    wrapper.innerHTML = `
      <div class="slide-card group">
        <img
          src="${item.src}"
          alt="${item.title}"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onerror="this.onerror=null; this.src='${item.fallback}';"
        />
        <div class="card-sheen"></div>
        <div class="absolute top-3 left-3 z-10">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900/60 text-white backdrop-blur-xs border border-white/20 shadow-xs">
            ${item.tag || item.category}
          </span>
        </div>
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-4 sm:p-5 text-white z-10 pointer-events-none">
          <h3 class="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">${item.title}</h3>
          <p class="text-xs text-slate-200 mt-0.5">${item.subtitle}</p>
        </div>
      </div>
    `;

    // 3D Tilt and sheen dynamics on hover
    const card = wrapper.querySelector('.slide-card');
    if (card) {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mx', `${x}px`);
        card.style.setProperty('--my', `${y}px`);
        if (index === activeSlideIndex) {
          const rotX = -((y - rect.height / 2) / (rect.height / 2)) * 6;
          const rotY = ((x - rect.width / 2) / (rect.width / 2)) * 6;
          card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.01, 1.01, 1.01)`;
        }
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    }

    wrapper.addEventListener('click', () => {
      if (index === activeSlideIndex) {
        openLightboxModal(index);
      } else {
        updateCarousel(index);
      }
    });

    track.appendChild(wrapper);

    // Render dot indicator
    if (dotsContainer) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
      dot.className = index === activeSlideIndex
        ? 'w-5 h-1.5 rounded-full bg-blue-600 transition-all duration-300'
        : 'w-1.5 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 transition-all cursor-pointer';
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        updateCarousel(index);
      });
      dotsContainer.appendChild(dot);
    }

    // Render mobile strip item
    if (mobileStrip) {
      const mItem = document.createElement('div');
      mItem.className = 'shrink-0 w-[240px] aspect-[16/10] rounded-xl overflow-hidden shadow-md relative snap-center cursor-pointer';
      mItem.innerHTML = `
        <img src="${item.src}" alt="${item.title}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='${item.fallback}';" />
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white">
          <div class="text-xs font-bold truncate">${item.title}</div>
          <div class="text-[10px] text-slate-300 truncate">${item.subtitle}</div>
        </div>
      `;
      mItem.addEventListener('click', () => openLightboxModal(index));
      mobileStrip.appendChild(mItem);
    }
  });

  updateSlidePositions(true);
}

function updateSlidePositions(isInitial = false) {
  const track = document.getElementById('carouselTrack');
  if (!track) return;
  const wrappers = track.querySelectorAll('.slide-wrapper');
  const total = slides.length;

  wrappers.forEach((w) => {
    const idx = parseInt(w.dataset.index, 10);
    const diff = (idx - activeSlideIndex + total) % total;
    const card = w.querySelector('.slide-card');

    if (diff === 0) {
      // Center active slide: 58% width, 16:10 aspect, crisp white border, 3D
      w.style.width = '58%';
      w.style.maxWidth = '560px';
      w.style.left = '50%';
      w.style.top = '50%';
      w.style.transform = 'translate(-50%, -50%) scale(1) translateZ(0)';
      w.style.zIndex = '30';
      w.style.opacity = '1';
      w.style.pointerEvents = 'auto';

      // Apply random switch animation if not initial render
      if (!isInitial && card) {
        let nextAnim;
        do {
          nextAnim = Math.floor(Math.random() * ANIMATION_CLASSES.length);
        } while (nextAnim === lastAnimationIndex && ANIMATION_CLASSES.length > 1);
        lastAnimationIndex = nextAnim;

        ANIMATION_CLASSES.forEach(cls => card.classList.remove(cls));
        void card.offsetWidth; // Force CSS reflow to re-trigger keyframe
        card.classList.add(ANIMATION_CLASSES[nextAnim]);
      }
    } else if (diff === 1) {
      // Right side peek: 28% width, rotateY -18deg, scale 0.86, opacity 0.78
      w.style.width = '28%';
      w.style.maxWidth = '270px';
      w.style.left = '86%';
      w.style.top = '50%';
      w.style.transform = 'translate(-50%, -50%) scale(0.86) rotateY(-18deg) translateZ(-60px)';
      w.style.zIndex = '20';
      w.style.opacity = '0.78';
      w.style.pointerEvents = 'auto';
      if (card) ANIMATION_CLASSES.forEach(cls => card.classList.remove(cls));
    } else if (diff === total - 1) {
      // Left side peek: 28% width, rotateY +18deg, scale 0.86, opacity 0.78
      w.style.width = '28%';
      w.style.maxWidth = '270px';
      w.style.left = '14%';
      w.style.top = '50%';
      w.style.transform = 'translate(-50%, -50%) scale(0.86) rotateY(18deg) translateZ(-60px)';
      w.style.zIndex = '20';
      w.style.opacity = '0.78';
      w.style.pointerEvents = 'auto';
      if (card) ANIMATION_CLASSES.forEach(cls => card.classList.remove(cls));
    } else {
      // Hidden behind in 3D perspective
      w.style.width = '28%';
      w.style.left = '50%';
      w.style.top = '50%';
      w.style.transform = 'translate(-50%, -50%) scale(0.6) translateZ(-200px)';
      w.style.zIndex = '10';
      w.style.opacity = '0';
      w.style.pointerEvents = 'none';
      if (card) ANIMATION_CLASSES.forEach(cls => card.classList.remove(cls));
    }
  });

  // Update dots indicator
  const dotsContainer = document.getElementById('carouselDots');
  if (dotsContainer) {
    const dots = dotsContainer.querySelectorAll('button');
    dots.forEach((dot, idx) => {
      dot.className = idx === activeSlideIndex
        ? 'w-5 h-1.5 rounded-full bg-blue-600 transition-all duration-300'
        : 'w-1.5 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 transition-all cursor-pointer';
    });
  }

  // Update fixed bottom team cards active highlight
  // Project team slides start at index 5 (slides 5, 6, 7, 8, 9)
  const bottomCards = document.querySelectorAll('#bottomCards .bottom-team-card');
  bottomCards.forEach((card, idx) => {
    const isMatchingTeamMember = activeSlideIndex === 5 + idx;
    if (isMatchingTeamMember) {
      card.classList.add('ring-2', 'ring-blue-600', 'shadow-lg', '-translate-y-1', 'border-blue-600');
      card.classList.remove('border-white/90');
    } else {
      card.classList.remove('ring-2', 'ring-blue-600', 'shadow-lg', '-translate-y-1', 'border-blue-600');
      card.classList.add('border-white/90');
    }
  });
}

function updateCarousel(index) {
  const total = slides.length;
  activeSlideIndex = (index + total) % total;
  updateSlidePositions(false);
}

function nextCarouselSlide() {
  updateCarousel(activeSlideIndex + 1);
}

function prevCarouselSlide() {
  updateCarousel(activeSlideIndex - 1);
}

function startCarouselAutoplay() {
  if (carouselTimer) clearInterval(carouselTimer);
  if (!carouselAutoplayEnabled) return;
  carouselTimer = setInterval(() => {
    if (!isCarouselHovered) {
      nextCarouselSlide();
    }
  }, carouselSwitchSpeed);
}

function initCarousel() {
  loadCarouselConfig();
  renderSlides();

  const prevBtn = document.getElementById('carouselPrevBtn');
  const nextBtn = document.getElementById('carouselNextBtn');
  if (prevBtn) prevBtn.addEventListener('click', prevCarouselSlide);
  if (nextBtn) nextBtn.addEventListener('click', nextCarouselSlide);

  const stage = document.getElementById('carouselStage');
  if (stage) {
    stage.addEventListener('mouseenter', () => { isCarouselHovered = true; });
    stage.addEventListener('mouseleave', () => { isCarouselHovered = false; });
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (document.getElementById('lightboxModal')?.classList.contains('flex')) return;
    if (e.key === 'ArrowLeft') prevCarouselSlide();
    if (e.key === 'ArrowRight') nextCarouselSlide();
  });

  // Autoplay (3.6s)
  startCarouselAutoplay();

  // Cross-tab synchronization via storage events
  window.addEventListener('storage', (e) => {
    if (e.key === 'vidyaos_carousel_config') {
      loadCarouselConfig();
      renderSlides();
      renderBottomCards();
      startCarouselAutoplay();
    }
  });
}

/* ── Fixed 5-Card Bottom Project Team Row ── */
function renderBottomCards() {
  const container = document.getElementById('bottomCards');
  if (!container) return;
  container.innerHTML = '';

  PROJECT_TEAM.forEach((item, index) => {
    const card = document.createElement('div');
    const isMatchingActive = activeSlideIndex === 5 + index;

    card.className = `bottom-team-card bottom-card-enter group relative aspect-[16/10] rounded-xl overflow-hidden shadow-xs hover:shadow-lg border-2 ${
      isMatchingActive ? 'border-blue-600 ring-2 ring-blue-600 shadow-lg -translate-y-1' : 'border-white/90 hover:border-blue-500'
    } transition-all duration-300 cursor-pointer bg-slate-900`;
    card.setAttribute('title', `${item.title}: ${item.subtitle}`);
    card.dataset.teamIndex = index;

    card.innerHTML = `
      <img
        src="${item.src}"
        alt="${item.title}"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        onerror="this.onerror=null; this.src='${item.fallback}';"
      />
      <span class="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded text-[8.5px] font-semibold bg-slate-900/70 text-slate-200 backdrop-blur-xs border border-white/10">
        ${item.tag}
      </span>
      <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent p-2 text-white pointer-events-none">
        <div class="text-[11px] font-bold leading-tight truncate text-white">${item.title}</div>
        <div class="text-[9.5px] text-slate-300 truncate">${item.subtitle}</div>
      </div>
    `;

    // Clicking fixed bottom card jumps main carousel to that team member's slide
    card.addEventListener('click', () => {
      updateCarousel(5 + index);
    });

    container.appendChild(card);
  });
}

function showTeamMemberModal(id) {
  const m = PROJECT_TEAM.find(t => t.id === id);
  if (!m) return;

  const titleEl = document.getElementById('infoModalTitle');
  const bodyEl = document.getElementById('infoModalBody');
  const modal = document.getElementById('infoModal');

  if (titleEl) titleEl.textContent = `${m.role} — ${m.name}`;
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="flex items-center gap-3 p-3 bg-blue-50/70 rounded-xl border border-blue-100 mb-3">
        <img src="${m.src}" alt="${m.role}" class="w-14 h-14 rounded-lg object-cover border border-blue-200 shrink-0" onerror="this.onerror=null; this.src='${m.fallback}';" />
        <div>
          <div class="text-xs font-bold text-blue-900">${m.subtitle}</div>
          <div class="text-[11px] text-blue-700/80 mt-0.5">VidyaOS Institutional Engineering Team</div>
        </div>
      </div>
      <p class="text-xs text-slate-600 leading-relaxed mb-3">${m.bio}</p>
      <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Core Technical Contributions</div>
      <ul class="space-y-1.5 text-xs text-slate-700">
        ${m.highlights.map(h => `<li class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span><span>${h}</span></li>`).join('')}
      </ul>
    `;
  }
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function showNbaGuidelinesModal() {
  const titleEl = document.getElementById('infoModalTitle');
  const bodyEl = document.getElementById('infoModalBody');
  const modal = document.getElementById('infoModal');

  if (titleEl) titleEl.textContent = 'National Board of Accreditation (NBA) Compliance';
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="p-3 bg-amber-50/80 rounded-xl border border-amber-200 mb-3 text-amber-900">
        <div class="text-xs font-bold flex items-center gap-1.5">
          <svg class="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Outcome Based Education (OBE) Automated Compliance
        </div>
        <p class="text-[11px] text-amber-800 mt-1">VidyaOS is engineered specifically to adhere to Tier-I and Tier-II institutional accreditation standards.</p>
      </div>
      <div class="space-y-2 text-xs text-slate-700 leading-relaxed">
        <p><strong>Criterion 3 — Program Outcomes (POs) & Course Outcomes (COs):</strong> Direct assessment rubrics, CO-PO mapping matrix, and target attainment calculations are computed automatically from student exam records.</p>
        <p><strong>Criterion 4 — Continuous Internal Evaluation (CIE):</strong> Mid-term assessments, tutorials, and assignment tracking with certified PDF dossier generation.</p>
        <p><strong>Criterion 5 & 6 — Faculty Workload & Department Dossiers:</strong> Auto-compilation of theory class logs, laboratory batches, lesson plans, and HOD approvals.</p>
      </div>
    `;
  }
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeInfoModal() {
  const modal = document.getElementById('infoModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

/* ── Lightbox Modal Engine ── */
let currentLightboxIndex = 0;

function openLightboxModal(index) {
  const item = slides[index];
  if (!item) return;
  currentLightboxIndex = index;

  const img = document.getElementById('lightboxImg');
  const cat = document.getElementById('lightboxCategory');
  const title = document.getElementById('lightboxTitle');
  const sub = document.getElementById('lightboxSubtitle');
  const counter = document.getElementById('lightboxCounter');
  const modal = document.getElementById('lightboxModal');

  if (img) {
    img.src = item.src;
    img.onerror = () => { img.src = item.fallback; };
  }
  if (cat) cat.textContent = item.tag || item.category;
  if (title) title.textContent = item.title;
  if (sub) sub.textContent = item.subtitle;
  if (counter) counter.textContent = `${index + 1} / ${slides.length}`;

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeLightboxModal() {
  const modal = document.getElementById('lightboxModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function nextLightboxSlide() {
  const nextIdx = (currentLightboxIndex + 1) % slides.length;
  openLightboxModal(nextIdx);
}

function prevLightboxSlide() {
  const prevIdx = (currentLightboxIndex - 1 + slides.length) % slides.length;
  openLightboxModal(prevIdx);
}

// Lightbox keyboard and click-outside listeners
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('lightboxModal');
  if (modal && modal.classList.contains('flex')) {
    if (e.key === 'Escape') closeLightboxModal();
    if (e.key === 'ArrowLeft') prevLightboxSlide();
    if (e.key === 'ArrowRight') nextLightboxSlide();
  }
  const infoModal = document.getElementById('infoModal');
  if (infoModal && infoModal.classList.contains('flex')) {
    if (e.key === 'Escape') closeInfoModal();
  }
});

const lbModal = document.getElementById('lightboxModal');
if (lbModal) {
  lbModal.addEventListener('click', (e) => {
    if (e.target === lbModal) closeLightboxModal();
  });
}

const ifModal = document.getElementById('infoModal');
if (ifModal) {
  ifModal.addEventListener('click', (e) => {
    if (e.target === ifModal) closeInfoModal();
  });
}

/* ── Ambient Particles Canvas ── */
function initAmbientCanvas() {
  const canvas = document.getElementById('ambientCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = canvas.offsetWidth || window.innerWidth * 0.7;
  let height = canvas.height = canvas.offsetHeight || window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = canvas.offsetWidth || window.innerWidth * 0.7;
    height = canvas.height = canvas.offsetHeight || window.innerHeight;
  });

  const particles = Array.from({ length: 26 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 2 + 1,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    alpha: Math.random() * 0.35 + 0.15
  }));

  function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(37, 99, 235, ${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(animate);
  }
  animate();
}

/* ── In-Panel Student Registration Controller (Replaces Login Area) ── */
let regDepartments = [];

async function loadRegistrationDepartments() {
  const sel = document.getElementById('reg-dept');
  if (!sel) return;
  try {
    const res = await fetch('/api/v1/auth/departments').then(r => r.json()).catch(() => null);
    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
      regDepartments = res.data;
      sel.innerHTML = '<option value="">— Select Branch —</option>';
      res.data.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.name} (${d.code || 'DEPT'})`;
        opt.dataset.duration = d.degree_duration_years || 3;
        sel.appendChild(opt);
      });
      // Default to Information Technology if present
      const itOpt = Array.from(sel.options).find(o => o.text.includes('Information Technology'));
      if (itOpt) {
        itOpt.selected = true;
        handleRegDeptChange();
      }
    }
  } catch (_) {}
}

function handleRegDeptChange() {
  const deptSel = document.getElementById('reg-dept');
  const semSel = document.getElementById('reg-sem');
  if (!deptSel || !semSel) return;
  const opt = deptSel.options[deptSel.selectedIndex];
  if (!deptSel.value) {
    semSel.innerHTML = '<option value="">— Select branch first —</option>';
    return;
  }
  const duration = parseInt(opt?.dataset?.duration || '3', 10);
  const maxSem = duration * 2;
  semSel.innerHTML = '';
  for (let s = 1; s <= maxSem; s++) {
    const o = document.createElement('option');
    o.value = s;
    o.textContent = `Semester ${s} (Year ${Math.ceil(s / 2)})`;
    if (s === 5 || (s === maxSem && maxSem < 5)) o.selected = true;
    semSel.appendChild(o);
  }
}

function toggleRollNotAvailable(checked) {
  const inp = document.getElementById('reg-ubter-roll');
  if (!inp) return;
  if (checked) {
    inp.value = '';
    inp.disabled = true;
    inp.placeholder = 'Not Assigned Yet (Roll pending)';
    inp.classList.add('bg-slate-100', 'text-slate-400');
  } else {
    inp.disabled = false;
    inp.placeholder = '11-digit numeric UBTER roll no';
    inp.classList.remove('bg-slate-100', 'text-slate-400');
    inp.focus();
  }
}

function toggleRegPw(inputId, btnId) {
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  if (btn) {
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    btn.classList.toggle('text-blue-700', show);
    btn.classList.toggle('text-blue-600', !show);
    btn.innerHTML = show
      ? `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
         </svg>`
      : `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
           <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
         </svg>`;
  }
}

function showSignUpView() {
  const signInView = document.getElementById('signInView');
  const signUpView = document.getElementById('signUpView');
  const panel = document.getElementById('desktopLoginPanel');
  if (signInView && signUpView) {
    signInView.classList.add('hidden');
    signUpView.classList.remove('hidden');
    if (panel) panel.scrollTop = 0;
    loadRegistrationDepartments();
  }
}

function showSignInView() {
  const signInView = document.getElementById('signInView');
  const signUpView = document.getElementById('signUpView');
  const panel = document.getElementById('desktopLoginPanel');
  if (signInView && signUpView) {
    signUpView.classList.add('hidden');
    signInView.classList.remove('hidden');
    if (panel) panel.scrollTop = 0;
  }
}

async function handleStudentRegisterSubmit(e) {
  e.preventDefault();
  const msgBox = document.getElementById('reg-msg');
  const submitBtn = document.getElementById('reg-submit-btn');
  const submitText = document.getElementById('reg-submit-text');

  const fullName = document.getElementById('reg-full-name')?.value?.trim();
  const deptId = document.getElementById('reg-dept')?.value;
  const semester = document.getElementById('reg-sem')?.value;
  const email = document.getElementById('reg-email')?.value?.trim();
  const phone = document.getElementById('reg-phone')?.value?.trim();
  const isRollPending = Boolean(document.getElementById('reg-roll-not-available')?.checked);
  const ubterRoll = document.getElementById('reg-ubter-roll')?.value?.trim();
  const password = document.getElementById('reg-password')?.value;
  const confirmPassword = document.getElementById('reg-confirm-password')?.value;
  const ubterRegNo = document.getElementById('reg-ubter-reg')?.value?.trim();
  const classRollNo = document.getElementById('reg-class-roll')?.value?.trim();

  function showRegError(text) {
    if (msgBox) {
      msgBox.className = 'p-2.5 rounded-lg text-xs leading-tight font-medium bg-rose-50 text-rose-800 border border-rose-200 block';
      msgBox.innerHTML = `<strong>Error:</strong> ${text}`;
      msgBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  if (!fullName || !deptId || !semester || !email || !phone || !password || !confirmPassword) {
    showRegError('Please complete all required fields.');
    return;
  }

  if (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
    showRegError('Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).');
    document.getElementById('reg-phone')?.focus();
    return;
  }

  if (!isRollPending) {
    if (!ubterRoll) {
      showRegError('UBTER Roll number required (or check "Roll number not available yet").');
      document.getElementById('reg-ubter-roll')?.focus();
      return;
    }
    if (!/^\d{11}$/.test(ubterRoll)) {
      showRegError('UBTER Roll number must be exactly 11 numeric digits (e.g. 2401050012).');
      document.getElementById('reg-ubter-roll')?.focus();
      return;
    }
  }

  if (password.length < 8) {
    showRegError('Password must be at least 8 characters long.');
    document.getElementById('reg-password')?.focus();
    return;
  }

  if (password !== confirmPassword) {
    showRegError('Password and Confirm Password do not match.');
    document.getElementById('reg-confirm-password')?.focus();
    return;
  }

  try {
    if (submitBtn) submitBtn.disabled = true;
    if (submitText) submitText.textContent = 'Submitting Request...';

    const payload = {
      full_name: fullName,
      department_id: Number(deptId),
      semester: Number(semester),
      email: email,
      phone: phone,
      ubter_roll_no: isRollPending ? null : ubterRoll,
      official_enrollment_no: isRollPending ? null : ubterRoll,
      enrollment_not_available: isRollPending,
      password: password,
      registration_no: ubterRegNo || null,
      class_roll_no: classRollNo || null
    };

    const res = await fetch('/api/v1/auth/student/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res && res.success) {
      const signUpView = document.getElementById('signUpView');
      if (signUpView) {
        signUpView.innerHTML = `
          <div class="text-center py-6 space-y-4">
            <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-slate-900">Registration Submitted!</h3>
              <p class="text-xs text-slate-500 mt-1">Your enrollment request has been submitted to your Department Faculty for review.</p>
            </div>
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1">
              <div><span class="text-slate-400">Student:</span> <strong class="text-slate-800">${fullName}</strong></div>
              <div><span class="text-slate-400">Email:</span> <strong class="text-slate-800">${email}</strong></div>
              <div><span class="text-slate-400">Roll No:</span> <strong class="text-slate-800">${isRollPending ? 'Pending Assignment' : ubterRoll}</strong></div>
            </div>
            <button
              type="button"
              onclick="showSignInView()"
              class="w-full h-9 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>
        `;
      }
    } else {
      showRegError(res?.error?.message || 'Registration failed. Please check your details and try again.');
    }
  } catch (err) {
    showRegError(err.message || 'Network error while submitting registration. Please try again.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (submitText) submitText.textContent = 'Register Now';
  }
}

function handleQuickRegistration(e) {
  if (e && e.preventDefault) e.preventDefault();
  const name = document.getElementById('reg-quick-fullname')?.value?.trim() || '';
  const identifier = document.getElementById('reg-quick-identifier')?.value?.trim() || '';
  const role = document.getElementById('reg-quick-role')?.value || 'student';
  const msg = document.getElementById('reg-quick-msg');

  if (role === 'student') {
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (identifier) params.set('roll', identifier);
    params.set('role', 'student');
    window.location.href = `/login/register/index.html?${params.toString()}`;
  } else {
    if (msg) {
      msg.className = 'p-2.5 rounded-lg text-xs leading-tight font-medium bg-amber-50 text-amber-800 border border-amber-200 block mb-2';
      msg.innerHTML = `<strong>Institutional Account:</strong> ${role.toUpperCase()} accounts are provisioned directly by Institution Administration. Please sign in or contact the UGIP Office.`;
      msg.classList.remove('hidden');
    }
  }
}

// Global exports
window.showNbaGuidelinesModal = showNbaGuidelinesModal;
window.renderBottomCards = renderBottomCards;
window.closeInfoModal = closeInfoModal;
window.openLightboxModal = openLightboxModal;
window.closeLightboxModal = closeLightboxModal;
window.nextLightboxSlide = nextLightboxSlide;
window.prevLightboxSlide = prevLightboxSlide;
window.showSignUpView = showSignUpView;
window.showSignInView = showSignInView;
window.handleRegDeptChange = handleRegDeptChange;
window.toggleRollNotAvailable = toggleRollNotAvailable;
window.toggleRegPw = toggleRegPw;
window.handleStudentRegisterSubmit = handleStudentRegisterSubmit;
window.handleQuickRegistration = handleQuickRegistration;

// Initializer
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initCarousel();
    renderBottomCards();
    initAmbientCanvas();
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'register' || window.location.hash === '#register') {
      showSignUpView();
    }
  });
} else {
  initCarousel();
  renderBottomCards();
  initAmbientCanvas();
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'register' || window.location.hash === '#register') {
    showSignUpView();
  }
}
