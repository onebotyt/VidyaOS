/**
 * VidyaOS Universal API Client
 * Automatic auth headers, in-flight deduplication, timeout guards, and error normalizing.
 */

import { Env } from './env.js';
import { Storage } from './storage.js';
import { Bus } from './event-bus.js';

class ApiClient {
  constructor() {
    this._baseUrl = null;
    this._inFlightRequests = new Map();
  }

  async getBaseUrl() {
    if (!this._baseUrl) {
      this._baseUrl = await Env.getApiBaseUrl();
    }
    return this._baseUrl;
  }

  setBaseUrl(url) {
    this._baseUrl = url.replace(/\/+$/, '');
  }

  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      headers = {},
      timeout = 15000,
      suppressToast = false,
      skipAuth = false,
      dedupe = false,
    } = options;

    const baseUrl = await this.getBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = cleanEndpoint.startsWith('http') ? cleanEndpoint : `${baseUrl}${cleanEndpoint}`;

    // Request deduplication for identical GET requests
    const cacheKey = dedupe && method === 'GET' ? `${method}:${url}` : null;
    if (cacheKey && this._inFlightRequests.has(cacheKey)) {
      return this._inFlightRequests.get(cacheKey);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestHeaders = new Headers(headers);
    if (!skipAuth) {
      const token = await Storage.get('auth_token') || await Storage.get('token');
      if (token && !requestHeaders.has('Authorization')) {
        requestHeaders.set('Authorization', `Bearer ${token}`);
      }
    }

    let payload = body;
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      if (!requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json');
      }
      payload = JSON.stringify(body);
    }

    const fetchPromise = (async () => {
      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: payload,
          credentials: 'include',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle Session Expiry or Takeover
        if (response.status === 401) {
          let errData = {};
          try {
            errData = await response.json();
          } catch (_) {}

          if (errData?.error?.code === 'SESSION_TRANSFERRED' || errData?.message?.includes('another device')) {
            Bus.emit('auth:transferred', errData);
          } else {
            Bus.emit('auth:expired', errData);
          }

          if (!suppressToast) {
            Bus.emit('toast:show', {
              message: errData?.error?.message || errData?.message || 'Session expired. Please log in again.',
              type: 'warning'
            });
          }

          return {
            success: false,
            status: 401,
            error: errData?.error || { message: 'Unauthorized' }
          };
        }

        let data;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        if (!response.ok) {
          const message = data?.error?.message || data?.message || `Request failed (${response.status})`;
          if (!suppressToast && response.status !== 404) {
            Bus.emit('toast:show', { message, type: 'error' });
          }
          return {
            success: false,
            status: response.status,
            error: data?.error || { message }
          };
        }

        return {
          success: true,
          status: response.status,
          data: data?.data !== undefined ? data.data : data
        };
      } catch (err) {
        clearTimeout(timeoutId);
        const isAbort = err.name === 'AbortError';
        const message = isAbort ? 'Request timed out' : (err.message || 'Network connection error');

        if (!suppressToast) {
          Bus.emit('toast:show', {
            message,
            type: 'error'
          });
        }

        return {
          success: false,
          status: 0,
          error: { message, isNetworkError: true, isAbort }
        };
      } finally {
        if (cacheKey) {
          this._inFlightRequests.delete(cacheKey);
        }
      }
    })();

    if (cacheKey) {
      this._inFlightRequests.set(cacheKey, fetchPromise);
    }

    return fetchPromise;
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const Api = new ApiClient();
export default Api;
