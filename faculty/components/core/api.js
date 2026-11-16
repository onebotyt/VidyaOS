/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY API CLIENT (api.js)
 * Location: /faculty/components/core/api.js
 * 
 * Strict Domain Isolation: Autonomous API client for Faculty Portal.
 * Transparent Bearer Token Injection, Device Identification,
 * Token Refresh Handling, and Cloud Sleep Recovery.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const API_BASE = '/api/v1';

  /**
   * Helper to safely retrieve access token with backward compatibility
   */
  function getAccessToken() {
    try {
      return localStorage.getItem('access_token') || 
             localStorage.getItem('token') || 
             localStorage.getItem('authToken') || 
             '';
    } catch (_) {
      return '';
    }
  }

  /**
   * Helper to retrieve or generate device ID
   */
  function getDeviceId() {
    try {
      if (typeof window.getDeviceId === 'function') {
        return window.getDeviceId();
      }
      let deviceId = localStorage.getItem('vidyaos_device_id');
      if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
        localStorage.setItem('vidyaos_device_id', deviceId);
      }
      return deviceId;
    } catch (_) {
      return 'dev_fallback_' + Date.now();
    }
  }

  /**
   * Safe toast dispatcher
   */
  function notify(msg, type = 'error') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    } else if (window.FacultyUI && typeof window.FacultyUI.toast === 'function') {
      window.FacultyUI.toast(msg, type);
    } else {
      console.warn(`[Faculty API ${type.toUpperCase()}]: ${msg}`);
    }
  }

  /**
   * Transparent Bearer token injection API client
   */
  async function fetchApi(endpoint, options = {}) {
    const token = getAccessToken();
    const headers = {
      ...(options.headers || {})
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const deviceId = getDeviceId();
    if (deviceId) {
      headers['X-Device-Id'] = deviceId;
    }

    const config = {
      ...options,
      credentials: options.credentials || 'include',
      headers
    };

    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          if (data?.error?.code === 'SESSION_REVOKED') {
            if (typeof window.handleSessionRevocation === 'function') {
              window.handleSessionRevocation('session_transferred');
              return;
            }
            clearAuthData();
            window.location.replace('/login/index.html?reason=session_transferred');
            return;
          }

          if (!endpoint.includes('/auth/')) {
            // Attempt token refresh
            const refreshed = await attemptTokenRefresh();
            if (refreshed) {
              headers['Authorization'] = `Bearer ${getAccessToken()}`;
              const retryRes = await fetch(url, { ...options, headers });
              return await retryRes.json();
            } else {
              if (typeof window.handleSessionRevocation === 'function') {
                window.handleSessionRevocation('session_expired');
                return;
              }
              clearAuthData();
              window.location.replace('/login/index.html?reason=session_expired');
              return;
            }
          }
        }

        const isSleep = response.status === 502 || response.status === 503 || response.status === 504;
        const defaultMsg = isSleep
          ? 'Cloud server is waking up from idle sleep (Render instance). Reconnecting...'
          : `Request failed with status ${response.status}`;
        
        const errObj = (data && data.error)
          ? Object.assign(data.error, { status: response.status, message: data.error.message || defaultMsg })
          : { message: defaultMsg, status: response.status };
        
        throw errObj;
      }

      return data;
    } catch (err) {
      if (!options.suppressToast) {
        notify(err.message || 'Network request failed', 'error');
      }
      throw err;
    }
  }

  /**
   * Attempt token refresh using refresh_token
   */
  async function attemptTokenRefresh() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return false;

      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refresh_token: refreshToken, refreshToken })
      });

      if (!res.ok) return false;
      const data = await res.json();
      const newToken = data.access_token || data.token || data.data?.access_token || data.data?.token;
      if (newToken) {
        localStorage.setItem('access_token', newToken);
        try { localStorage.setItem('token', newToken); } catch (_) {}
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  function clearAuthData() {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_user');
      sessionStorage.clear();
    } catch (_) {}
  }

  // Export FacultyAPI namespace and fetchApi
  const FacultyAPI = {
    fetch: fetchApi,
    request: fetchApi,
    get: (ep, opt = {}) => fetchApi(ep, { ...opt, method: 'GET' }),
    post: (ep, body, opt = {}) => fetchApi(ep, { 
      ...opt, 
      method: 'POST', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
    put: (ep, body, opt = {}) => fetchApi(ep, { 
      ...opt, 
      method: 'PUT', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
    delete: (ep, opt = {}) => fetchApi(ep, { ...opt, method: 'DELETE' }),
    getToken: getAccessToken,
    getDeviceId,
    clearAuth: clearAuthData,
    refresh: attemptTokenRefresh
  };

  window.FacultyAPI = FacultyAPI;
  window.fetchApi = fetchApi;
  window.apiFetch = fetchApi;
})();
