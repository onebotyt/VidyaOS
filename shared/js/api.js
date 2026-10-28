/**
 * Shared API Client with Transparent Bearer Token Injection & Error Handling
 * Location: /shared/js/api.js
 */

const API_BASE = '/api/v1';

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

  const deviceId = typeof getDeviceId === 'function' ? getDeviceId() : (typeof localStorage !== 'undefined' ? localStorage.getItem('vidyaos_device_id') : null);
  if (deviceId) {
    headers['X-Device-Id'] = deviceId;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        if (data?.error?.code === 'SESSION_REVOKED') {
          if (typeof handleSessionRevocation === 'function') {
            handleSessionRevocation('session_transferred');
            return;
          }
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login/index.html?reason=session_transferred';
          return;
        }
        if (!endpoint.includes('/auth/')) {
          // Attempt token refresh
          const refreshed = await attemptTokenRefresh();
          if (refreshed) {
            // Retry original request once
            headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
            const retryRes = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
            return await retryRes.json();
          } else {
            if (typeof handleSessionRevocation === 'function') {
              handleSessionRevocation('session_expired');
              return;
            }
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/login/index.html?reason=session_expired';
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
    if (!options.suppressToast && typeof showToast === 'function') {
      showToast(err.message || 'Network request failed', 'error');
    }
    throw err;
  }
}

async function attemptTokenRefresh() {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refresh_token: refreshToken, refreshToken })
    });
    if (!res.ok) return false;
    const data = await res.json();
    const newAccess = data.data?.access_token || data.data?.accessToken;
    const newRefresh = data.data?.refresh_token || data.data?.refreshToken;
    if (newAccess) {
      localStorage.setItem('access_token', newAccess);
      if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function apiRequest(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith(API_BASE) ? endpoint.slice(API_BASE.length) : endpoint;
  return fetchApi(cleanEndpoint, options);
}

async function apiFetch(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith(API_BASE) ? endpoint.slice(API_BASE.length) : endpoint;
  return fetchApi(cleanEndpoint, options);
}

if (typeof window !== 'undefined') {
  window.fetchApi = fetchApi;
  window.apiRequest = apiRequest;
  window.apiFetch = apiFetch;
  window.attemptTokenRefresh = attemptTokenRefresh;
}
