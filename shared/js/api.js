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

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/')) {
        // Attempt token refresh
        const refreshed = await attemptTokenRefresh();
        if (refreshed) {
          // Retry original request once
          headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
          const retryRes = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
          return await retryRes.json();
        } else {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/index.html';
        }
      }
      throw data.error || { message: `Request failed with status ${response.status}` };
    }

    return data;
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast(err.message || 'Network request failed', 'error');
    }
    throw err;
  }
}

async function attemptTokenRefresh() {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.success && data.data?.access_token) {
      localStorage.setItem('access_token', data.data.access_token);
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

if (typeof window !== 'undefined') {
  window.fetchApi = fetchApi;
  window.apiRequest = apiRequest;
}
