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
    if (roles.includes('STUDENT') || u.role === 'STUDENT') { window.location.replace('/student/dashboard/index.html'); return; }
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
    btn.innerHTML = show
      ? '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M1.500 12S5.500 5 12 5s10.500 7 10.500 7-4 7-10.500 7S1.500 12 1.500 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
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
  if (roles.includes('STUDENT') || user.role === 'STUDENT') { window.location.href = '/student/dashboard/index.html'; return; }
  const isMobile = window.innerWidth <= 768;
  const isHod = roles.includes('HOD') || user.role === 'HOD' || Boolean(user.is_hod);
  if (isMobile && isHod) {
    window.location.href = '/faculty/classes/index.html';
    return;
  }
  window.location.href = '/faculty/dashboard/index.html';
}

function resetSubmitBtn() {
  const btn = document.getElementById('submit-btn');
  const text = document.getElementById('submit-text');
  const icon = document.getElementById('signin-icon');
  if (btn) btn.disabled = false;
  if (text) text.textContent = 'Sign In';
  if (icon) icon.innerHTML = '→';
}

/* ── Input events: hide banners ── */
['identifier', 'password'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', hideBanners);
    el.addEventListener('focus', hideBanners);
  }
});

/* ── Main login submit ── */
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('identifier').value.trim();
  const pw = document.getElementById('password').value;
  if (!id || !pw) {
    showInlineMsg('invalid credentials check id and password ', 'err');
    return;
  }

  const btn = document.getElementById('submit-btn');
  const text = document.getElementById('submit-text');
  const icon = document.getElementById('signin-icon');
  btn.disabled = true;
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
  const isNative = (
    typeof window !== 'undefined' && (
      Boolean(window.Capacitor?.isNativePlatform?.()) ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'file:' ||
      window.VIDYAOS_FORCE_NATIVE === true
    )
  );

  if (isNative) {
    alert('Google Sign-In is available via the Web Portal. On mobile, please log in with your email or ID and password.');
    return;
  }

  const btn = document.getElementById('google-signin-btn') || document.getElementById('m-google-btn');
  const txt = document.getElementById('google-btn-text') || btn?.querySelector('span');
  if (btn) btn.disabled = true;
  if (txt) txt.textContent = 'Connecting to Google…';

  try {
    const origin = window.location.origin;
    let res = await fetchApi('/auth/google/url?mode=LOGIN&origin=' + encodeURIComponent(origin)).catch(() => null);
    if (!res || !res.success || !res.data?.url) {
      res = await fetch('https://vidyaos-backend.onrender.com/api/v1/auth/google/url?mode=LOGIN&origin=' + encodeURIComponent(origin)).then(r => r.json()).catch(() => null);
    }

    if (res && res.data?.url) {
      // Direct navigation to Google OAuth with prompt=select_account triggers the native Android account chooser
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
    if (txt) txt.textContent = btn?.id === 'm-google-btn' ? 'Sign In with Google' : 'Continue with Google';
    if (btn) btn.disabled = false;
  }
}

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

window.addEventListener('message', (event) => {
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
