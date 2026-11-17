/**
 * Shared API Client with Transparent Bearer Token Injection, In-Flight GET Deduplication & Error Handling
 * Location: /shared/js/api.js
 */

function getVidyaApiBase() {
  if (typeof window !== 'undefined' && window.VIDYAOS_API_BASE) {
    return window.VIDYAOS_API_BASE;
  }
  if (typeof window !== 'undefined') {
    const isMobileHost =
      window.location.protocol === 'file:' ||
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && (!window.location.port || window.location.protocol === 'https:')) ||
      (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent) && window.location.hostname === 'localhost') ||
      Boolean(window.VIDYAOS_FORCE_NATIVE) ||
      Boolean(window.VIDYAOS_IS_NATIVE);
    if (isMobileHost) {
      return 'https://vidyaos-backend.onrender.com/api/v1';
    }
  }
  return '/api/v1';
}

const API_BASE = getVidyaApiBase();
const _inflightGetRequests = new Map();
const _getResponseCache = new Map();
const GET_CACHE_TTL_MS = 3000; // 3s micro-cache coalesces duplicate page-load calls (/students/me, /auth/me, etc.)

function clearApiCache() {
  _getResponseCache.clear();
}

async function fetchApi(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  let cleanEp = endpoint;
  if (cleanEp.startsWith('https://vidyaos-backend.onrender.com/api/v1')) {
    cleanEp = cleanEp.slice('https://vidyaos-backend.onrender.com/api/v1'.length);
  } else if (cleanEp.startsWith(API_BASE)) {
    cleanEp = cleanEp.slice(API_BASE.length);
  } else if (cleanEp.startsWith('/api/v1')) {
    cleanEp = cleanEp.slice(7);
  } else if (cleanEp.startsWith('api/v1')) {
    cleanEp = cleanEp.slice(6);
  }
  if (!cleanEp.startsWith('/')) {
    cleanEp = '/' + cleanEp;
  }
  const token = localStorage.getItem('access_token') || '';

  if (method !== 'GET') {
    clearApiCache();
  } else if (!options.noCache) {
    const cacheKey = `${token.slice(-12)}:${cleanEp}`;
    const cached = _getResponseCache.get(cacheKey);
    if (cached && (Date.now() - cached.ts) < GET_CACHE_TTL_MS) {
      return structuredClone ? structuredClone(cached.data) : JSON.parse(JSON.stringify(cached.data));
    }
    if (_inflightGetRequests.has(cacheKey)) {
      return _inflightGetRequests.get(cacheKey);
    }
    const reqPromise = _executeFetchApi(cleanEp, options, cacheKey).finally(() => {
      _inflightGetRequests.delete(cacheKey);
    });
    _inflightGetRequests.set(cacheKey, reqPromise);
    return reqPromise;
  }

  return _executeFetchApi(cleanEp, options, null);
}

async function _executeFetchApi(endpoint, options = {}, cacheKey = null) {
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
    credentials: options.credentials || 'include',
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
          if (typeof window.handleSessionRevocation === 'function') {
            window.handleSessionRevocation('session_transferred');
            return;
          }
          ['access_token', 'accessToken', 'token', 'authToken', 'user', 'currentUser', 'auth_user', 'vidyaos_token', 'vidyaos_user'].forEach(k => {
            try { localStorage.removeItem(k); } catch (_) {}
          });
          try { sessionStorage.clear(); } catch (_) {}
          window.location.replace('/login/index.html?reason=session_transferred');
          return;
        }
        if (!endpoint.includes('/auth/')) {
          const refreshed = await attemptTokenRefresh();
          if (refreshed) {
            headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
            const retryRes = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
            return await retryRes.json();
          } else {
            if (typeof handleSessionRevocation === 'function') {
              handleSessionRevocation('session_expired');
              return;
            }
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            try { sessionStorage.clear(); } catch (_) {}
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

    if (cacheKey && data && data.success !== false) {
      _getResponseCache.set(cacheKey, { ts: Date.now(), data });
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
  window.clearApiCache = clearApiCache;
}
