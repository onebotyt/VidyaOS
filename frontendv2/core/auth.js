/**
 * VidyaOS Multi-OS Universal Authentication Service
 * Seamless token management, multi-role support, and automated session takeover handling.
 */

import { Storage } from './storage.js';
import { Api } from './api.js';
import { Bus } from './event-bus.js';

class AuthService {
  constructor() {
    this._user = null;
    this._token = null;
    this._role = null;
    this._initialized = false;

    // Listen to session takeover or expiration events from API
    Bus.on('auth:expired', () => this.handleSessionTerminated('Session expired. Please log in again.'));
    Bus.on('auth:transferred', () => this.handleSessionTerminated('Logged in from another device. Active session moved.'));
  }

  async init() {
    if (this._initialized) return;

    this._token = await Storage.get('auth_token') || await Storage.get('token');
    this._role = await Storage.get('user_role');
    this._user = await Storage.get('user_data');

    this._initialized = true;
    Bus.emit('auth:stateChanged', {
      isAuthenticated: this.isAuthenticated(),
      user: this._user,
      role: this._role
    });

    if (this._token && !this._user) {
      await this.refreshProfile();
    }
  }

  isAuthenticated() {
    return Boolean(this._token);
  }

  getUser() {
    return this._user;
  }

  getRole() {
    return this._role || this._user?.role || 'student';
  }

  getToken() {
    return this._token;
  }

  async login(role, credentials) {
    let endpoint = '/api/v1/auth/login';
    let payload = credentials;

    if (role === 'student') {
      endpoint = '/api/v1/auth/student-login';
      payload = {
        identifier: credentials.identifier || credentials.email,
        password: credentials.password
      };
    } else if (role === 'faculty') {
      endpoint = '/api/v1/auth/faculty-login';
      payload = {
        email: credentials.email,
        password: credentials.password
      };
    } else if (role === 'admin') {
      endpoint = '/api/v1/auth/admin-login';
      payload = {
        email: credentials.email,
        password: credentials.password
      };
    }

    const res = await Api.post(endpoint, payload, { skipAuth: true });
    if (!res.success) {
      return res;
    }

    const data = res.data;
    const token = data.token || data.accessToken || data.jwt;
    const user = data.user || data.student || data.faculty || data.admin || {};
    const detectedRole = role || user.role || 'student';

    this._token = token;
    this._user = user;
    this._role = detectedRole;

    await Storage.set('auth_token', token);
    await Storage.set('token', token);
    await Storage.set('user_role', detectedRole);
    await Storage.set('user_data', user);

    Bus.emit('auth:loginSuccess', { user: this._user, role: this._role, token });
    Bus.emit('auth:stateChanged', { isAuthenticated: true, user: this._user, role: this._role });

    return { success: true, user: this._user, role: this._role };
  }

  async setSession(token, user, role = 'student') {
    this._token = token;
    this._user = user;
    this._role = role;

    await Storage.set('auth_token', token);
    await Storage.set('token', token);
    await Storage.set('user_role', role);
    await Storage.set('user_data', user);

    Bus.emit('auth:loginSuccess', { user: this._user, role: this._role, token });
    Bus.emit('auth:stateChanged', { isAuthenticated: true, user: this._user, role: this._role });
  }

  async refreshProfile() {
    if (!this._token) return null;

    const role = this.getRole();
    let endpoint = '/api/v1/students/me';
    if (role === 'faculty') endpoint = '/api/v1/faculty/me';
    if (role === 'admin') endpoint = '/api/v1/admin/me';

    const res = await Api.get(endpoint, { suppressToast: true });
    if (res.success && res.data) {
      this._user = { ...this._user, ...res.data };
      await Storage.set('user_data', this._user);
      Bus.emit('auth:userUpdated', this._user);
      return this._user;
    }
    return this._user;
  }

  async logout() {
    try {
      await Api.post('/api/v1/auth/logout', {}, { suppressToast: true });
    } catch (_) {}

    await Storage.remove('auth_token');
    await Storage.remove('token');
    await Storage.remove('user_data');
    await Storage.remove('user_role');

    this._token = null;
    this._user = null;
    this._role = null;

    Bus.emit('auth:logout');
    Bus.emit('auth:stateChanged', { isAuthenticated: false, user: null, role: null });
  }

  handleSessionTerminated(reason) {
    this._token = null;
    this._user = null;
    this._role = null;
    Storage.remove('auth_token');
    Storage.remove('token');
    Storage.remove('user_data');

    Bus.emit('auth:terminated', { reason });
  }
}

export const Auth = new AuthService();
export default Auth;
