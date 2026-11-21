/**
 * VidyaOS Universal API Client
 * Compatible with Web (browser), Desktop (Tauri), and Native Mobile (React Native).
 */

export interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  suppressToast?: boolean;
}

class UniversalApiClient {
  private baseUrl: string = '';
  private token: string | null = null;
  private tokenListeners: Set<(token: string | null) => void> = new Set();

  constructor() {
    this.initTokenFromStorage();
  }

  private initTokenFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        this.token = localStorage.getItem('access_token') || localStorage.getItem('token');
      }
    } catch (_) {}
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public setToken(token: string | null) {
    this.token = token;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (token) {
          localStorage.setItem('access_token', token);
          localStorage.setItem('token', token);
        } else {
          localStorage.removeItem('access_token');
          localStorage.removeItem('token');
        }
      }
    } catch (_) {}
    this.tokenListeners.forEach(fn => fn(token));
  }

  public getToken(): string | null {
    return this.token;
  }

  public onTokenChange(fn: (token: string | null) => void) {
    this.tokenListeners.add(fn);
    return () => this.tokenListeners.delete(fn);
  }

  public async request<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${this.baseUrl}/api/v1${cleanEndpoint}`;

    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) searchParams.append(key, String(val));
      });
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.setToken(null);
      throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || data.error || `HTTP error ${res.status}`);
    }

    return data as T;
  }

  public get<T = any>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T = any>(endpoint: string, body?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T = any>(endpoint: string, body?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T = any>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new UniversalApiClient();
export default api;
