/**
 * VidyaOS Institutional AJAX & Network Client
 * Location: /components/ajax.js
 * (Also mirrored to /shared/js/ajax.js)
 *
 * Bridges the classic AJAX API patterns ($.ajax, ajax.get, ajax.post)
 * with the modern, secure Native Fetch API.
 *
 * Features:
 * - Transparent Bearer JWT token injection
 * - Transparent device UUID telemetry injection
 * - Automated 401 token refresh retry loop
 * - Automatic JSON serialization and header management
 * - Uniform error notification toasts
 */

(function (window) {
  'use strict';

  const API_BASE = '/api/v1';

  /**
   * Core Fetch Engine with transparent Bearer authentication and token refreshing
   */
  async function fetchApi(endpoint, options = {}) {
    const token = localStorage.getItem('access_token');
    const headers = {
      ...(options.headers || {})
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const deviceId = typeof window.getDeviceId === 'function' 
      ? window.getDeviceId() 
      : (typeof localStorage !== 'undefined' ? localStorage.getItem('vidyaos_device_id') : null);

    if (deviceId) {
      headers['X-Device-Id'] = deviceId;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const url = endpoint.startsWith(API_BASE) ? endpoint : `${API_BASE}${endpoint}`;
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          if (data?.error?.code === 'SESSION_REVOKED') {
            if (typeof window.handleSessionRevocation === 'function') {
              window.handleSessionRevocation('session_transferred');
              return;
            }
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/login/index.html?reason=session_transferred';
            return;
          }

          if (!endpoint.includes('/auth/')) {
            const refreshed = await attemptTokenRefresh();
            if (refreshed) {
              headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
              const retryRes = await fetch(url, { ...options, headers });
              return await retryRes.json();
            } else {
              if (typeof window.handleSessionRevocation === 'function') {
                window.handleSessionRevocation('session_expired');
                return;
              }
              localStorage.removeItem('access_token');
              localStorage.removeItem('user');
              window.location.href = '/login/index.html?reason=session_expired';
              return;
            }
          }
        }

        const errorMsg = data.message || data.error?.message || `HTTP ${response.status} Error`;
        if (typeof window.showToast === 'function') {
          window.showToast(errorMsg, 'error');
        }
        return { success: false, error: errorMsg, status: response.status, data: null };
      }

      return data;
    } catch (err) {
      console.error('[AJAX Network Failure]:', err);
      const errorMsg = err.message || 'Network disconnected or server offline';
      if (typeof window.showToast === 'function') {
        window.showToast(errorMsg, 'error');
      }
      return { success: false, error: errorMsg, data: null };
    }
  }

  async function attemptTokenRefresh() {
    const refreshToken = localStorage.getItem('refresh_token');

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken, refresh_token: refreshToken })
      });

      if (res.ok) {
        const json = await res.json();
        const newToken = json.data?.accessToken || json.data?.token || json.accessToken || json.data?.access_token;
        const newRefresh = json.data?.refreshToken || json.data?.refresh_token;
        if (newToken) {
          localStorage.setItem('access_token', newToken);
          if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
          return true;
        }
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /**
   * Unified AJAX function
   * @param {string|Object} urlOrOptions 
   * @param {Object} [options]
   */
  async function ajax(urlOrOptions, options = {}) {
    if (typeof urlOrOptions === 'string') {
      return fetchApi(urlOrOptions, options);
    }
    const { url, ...rest } = urlOrOptions || {};
    return fetchApi(url, rest);
  }

  // Convenience Verb Methods
  ajax.get = function (url, options = {}) {
    return fetchApi(url, { ...options, method: 'GET' });
  };

  ajax.post = function (url, body = {}, options = {}) {
    const isFormData = body instanceof FormData;
    return fetchApi(url, {
      ...options,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body)
    });
  };

  ajax.put = function (url, body = {}, options = {}) {
    const isFormData = body instanceof FormData;
    return fetchApi(url, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body)
    });
  };

  ajax.patch = function (url, body = {}, options = {}) {
    const isFormData = body instanceof FormData;
    return fetchApi(url, {
      ...options,
      method: 'PATCH',
      body: isFormData ? body : JSON.stringify(body)
    });
  };

  ajax.delete = function (url, options = {}) {
    return fetchApi(url, { ...options, method: 'DELETE' });
  };

  // Standalone Aliases for Maximum Compatibility
  window.API_BASE = API_BASE;
  window.fetchApi = fetchApi;
  window.ajax = ajax;
  window.ajaxGet = ajax.get;
  window.ajaxPost = ajax.post;
  window.ajaxPut = ajax.put;
  window.ajaxPatch = ajax.patch;
  window.ajaxDelete = ajax.delete;

})(typeof window !== 'undefined' ? window : this);
