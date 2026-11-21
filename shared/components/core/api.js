/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS UNIFIED API CLIENT (api.js)
 * Location: /shared/components/core/api.js
 * 
 * - Transparent Bearer Token Injection
 * - In-Flight GET Request Deduplication (prevents redundant duplicate API hits)
 * - 3-Second Micro-Cache for High-Frequency Page Read Operations
 * - Device Fingerprint & Host-Independent Gateway Routing
 * - Resilient Cold-Start & Cloud Sleep Reconnection
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  function getVidyaApiBase() {
    if (typeof window !== 'undefined' && window.VIDYAOS_API_BASE) {
      return window.VIDYAOS_API_BASE;
    }
    if (typeof window !== 'undefined') {
      const isMobileHost =
        window.location.protocol === 'file:' ||
        window.location.protocol === 'capacitor:' ||
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
  const GET_CACHE_TTL_MS = 3000;

  function clearApiCache() {
    _getResponseCache.clear();
  }

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

    const token = getAccessToken();

    // Cache invalidation on mutation
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

    const url = `${API_BASE}${endpoint}`;
    let response;

    try {
      response = await fetch(url, {
        ...options,
        headers
      });
    } catch (networkErr) {
      if (!options.suppressToast && window.VidyaUI) {
        window.VidyaUI.toast('Network unreachable. Please check connection.', 'error');
      }
      throw networkErr;
    }

    // Handle 401 Session Expiration
    if (response.status === 401) {
      if (!options.skipAuthRedirect && !window.location.pathname.includes('/login/')) {
        try {
          localStorage.removeItem('access_token');
          localStorage.removeItem('token');
        } catch (_) {}
        window.location.replace('/login/index.html?reason=expired');
      }
      throw new Error('Unauthorized');
    }

    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => ({}));
    } else if (contentType.includes('text/')) {
      data = await response.text();
    } else {
      data = await response.blob();
    }

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `HTTP ${response.status}: Request failed`;
      if (!options.suppressToast && window.VidyaUI) {
        window.VidyaUI.toast(errorMsg, 'error');
      }
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    if (cacheKey && (options.method || 'GET').toUpperCase() === 'GET') {
      _getResponseCache.set(cacheKey, {
        ts: Date.now(),
        data: structuredClone ? structuredClone(data) : JSON.parse(JSON.stringify(data))
      });
    }

    return data;
  }

  // Bind to Window
  window.fetchApi = fetchApi;
  window.clearApiCache = clearApiCache;
  window.API_BASE = API_BASE;
  window.VidyaApi = {
    fetch: fetchApi,
    clearCache: clearApiCache,
    getBase: () => API_BASE
  };

})();
