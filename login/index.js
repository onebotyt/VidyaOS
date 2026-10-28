/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: INDEX
 * frontend/login/index/index.js
 * ══════════════════════════════════════════════════════════════
 */

/* ── Redirect if already logged in ── */
  (function checkExistingSession() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token') || sessionStorage.getItem('authToken');
    if (!token) return;
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('auth_user') || 'null');
      if (!u) return;
      const roles = u.roles || [];
      if (roles.includes('SYSTEM_ADMIN'))  { window.location.replace('/admin/dashboard.html');     return; }
      if (roles.includes('STUDENT'))       { window.location.replace('/student/dashboard.html');   return; }
      window.location.replace('/faculty/dashboard.html');
    } catch (_) {}
  })();

  /* ── Dark mode ── */
  document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');

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
      } catch (_) {}

      if (!notice && reason) {
        if (reason === 'session_transferred') {
          notice = 'Your session has ended because this account was logged into from another device.';
        } else if (reason === 'session_expired') {
          notice = 'Your session expired due to 30 minutes of inactivity. Please sign in again.';
        }
      }

      if (notice) {
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
    } catch (_) {}
  })();

  /* ── Role compatibility (Unified single login for all roles) ── */
  function setRole(role) {
    hideBanners();
  }

  function hideBanners() {
    const cb = document.getElementById('conflict-banner');
    const pb = document.getElementById('pending-banner');
    const sb = document.getElementById('status-alert-banner');
    if (cb) cb.style.display = 'none';
    if (pb) pb.style.display = 'none';
    if (sb) sb.style.display = 'none';
  }

  /* ── Password toggle ── */
  function togglePw() {
    const inp = document.getElementById('password');
    const btn = document.getElementById('pw-toggle-btn');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.innerHTML = inp.type === 'password' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
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
    const roles = user.roles || [];
    if (roles.includes('SYSTEM_ADMIN'))  { window.location.href = '/admin/dashboard.html';   return; }
    if (roles.includes('STUDENT'))       { window.location.href = '/student/dashboard.html'; return; }
    window.location.href = '/faculty/dashboard.html';
  }

  /* ── Form reset helper ── */
  function resetSubmitBtn() {
    const btn  = document.getElementById('submit-btn');
    const text = document.getElementById('submit-text');
    if (btn)  btn.disabled = false;
    if (text) text.textContent = 'Sign In →';
  }

  /* ── Input events: hide banners ── */
  document.getElementById('identifier').addEventListener('input', hideBanners);
  document.getElementById('password').addEventListener('input', hideBanners);

  /* ── Main login submit ── */
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('identifier').value.trim();
    const pw = document.getElementById('password').value;
    if (!id || !pw) return;

    const btn  = document.getElementById('submit-btn');
    const text = document.getElementById('submit-text');
    btn.disabled = true;
    text.textContent = 'Verifying...';
    hideBanners();

    try {
      const deviceId = getVidyaDeviceId();
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        suppressToast: true,
        body: JSON.stringify({
          email: id, phone: id, credential: id,
          identifier: id, username: id, enrollment_no: id,
          password: pw,
          device_id: deviceId
        })
      });

      if (res.success) {
        if (res.data.must_change_password) {
          currentActivationToken = res.data.activation_token;
          document.getElementById('act-name').textContent  = res.data.user?.full_name || res.data.user?.email || 'Faculty';
          document.getElementById('act-email').textContent = res.data.user?.email || 'your account';
          document.getElementById('activation-modal').style.display = 'flex';
          resetSubmitBtn();
          return;
        }
        setAuthSession(res.data.access_token, res.data.user, res.data.refresh_token);
        try { if (typeof showToast === 'function') showToast('Login successful! Redirecting…', 'success'); } catch(_) {}
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
            bodyEl.textContent = err.message + " You will be able to sign in as soon as your account is approved.";
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
      try {
        if (typeof showToast === 'function') showToast(err?.message || 'Invalid credentials. Please try again.', 'error');
      } catch(_) {}
    }
  });

  /* ── Force login (session takeover) ── */
  async function submitForceLogin() {
    const id  = document.getElementById('identifier').value.trim();
    const pw  = document.getElementById('password').value;
    const btn = document.getElementById('force-login-btn');
    btn.disabled    = true;
    btn.textContent = 'Disconnecting…';

    try {
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        suppressToast: true,
        body: JSON.stringify({
          email: id, phone: id, credential: id,
          identifier: id, username: id, enrollment_no: id,
          password: pw,
          device_id: getVidyaDeviceId(),
          force_logout: true
        })
      });
      if (res.success) {
        setAuthSession(res.data.access_token, res.data.user, res.data.refresh_token);
        try { if (typeof showToast === 'function') showToast('Previous session disconnected. Signing in…', 'success'); } catch(_) {}
        setTimeout(() => redirectAfterLogin(res.data.user), 350);
      }
    } catch (err) {
      try { if (typeof showToast === 'function') showToast(err?.message || 'Force login failed.', 'error'); } catch(_) {}
      btn.disabled    = false;
      btn.textContent = 'Disconnect Other Device & Sign In Here';
    }
  }

  /* ── Activation modal submit ── */
  document.getElementById('activation-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPw  = document.getElementById('act-new-pw').value;
    const confPw = document.getElementById('act-confirm-pw').value;

    if (newPw !== confPw) {
      try { if (typeof showToast === 'function') showToast('Passwords do not match!', 'error'); } catch(_) {}
      return;
    }

    const btn  = document.getElementById('act-submit-btn');
    const text = document.getElementById('act-submit-text');
    btn.disabled      = true;
    text.textContent  = 'Activating…';

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
        try { if (typeof showToast === 'function') showToast('Account activated! Welcome to VidyaOS.', 'success'); } catch(_) {}
        setTimeout(() => redirectAfterLogin(r.data.user), 600);
      } else {
        throw { message: r.error?.message || 'Activation failed' };
      }
    } catch (err) {
      try { if (typeof showToast === 'function') showToast(err?.message || 'Activation failed', 'error'); } catch(_) {}
      btn.disabled     = false;
      text.textContent = 'Save & Enter Portal →';
    }
  });

  /* ── Google OAuth ── */
  async function handleGoogleSignIn() {
    const btn = document.getElementById('google-signin-btn');
    const txt = document.getElementById('google-btn-text');
    btn.disabled = true;
    txt.textContent = 'Connecting…';
    try {
      const res = await fetchApi('/auth/google/url?mode=LOGIN');
      if (res.configured && res.data?.url) {
        const w = 500, h = 650;
        const l = window.screenX + (window.outerWidth  - w) / 2;
        const t = window.screenY + (window.outerHeight - h) / 2;
        const popup = window.open(res.data.url, 'vidyaos_google_login', `width=${w},height=${h},left=${l},top=${t},status=0,menubar=0,toolbar=0`);
        if (popup) popup.focus(); else window.location.href = res.data.url;
      } else {
        try { if (typeof showToast === 'function') showToast('Google OAuth not configured. Please use email login.', 'info'); } catch(_) {}
      }
    } catch (_) {
      try { if (typeof showToast === 'function') showToast('Google sign-in unavailable. Please use email login.', 'info'); } catch(_) {}
    } finally {
      btn.disabled    = false;
      txt.textContent = 'Continue with Google';
    }
  }

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
      const { payload } = event.data;
      if (payload?.access_token) {
        setAuthSession(payload.access_token, payload.user, payload.refresh_token);
        try { if (typeof showToast === 'function') showToast('Google login successful!', 'success'); } catch(_) {}
        setTimeout(() => redirectAfterLogin(payload.user), 400);
      }
    } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
      try { if (typeof showToast === 'function') showToast(event.data.message || 'Google authentication failed', 'error'); } catch(_) {}
    }
  });

  /* ── Forgot password ── */
  function handleForgotPassword() {
    try {
      if (typeof showToast === 'function') showToast('To reset your password, contact your HOD or System Administrator.', 'info');
    } catch(_) {}
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
    if (msg) {
      try { if (typeof showToast === 'function') showToast(decodeURIComponent(msg), 'info'); } catch(_) {}
    }
    const errMsg = params.get('error');
    if (errMsg) {
      try { if (typeof showToast === 'function') showToast(decodeURIComponent(errMsg), 'error'); } catch(_) {}
    }
  })();

