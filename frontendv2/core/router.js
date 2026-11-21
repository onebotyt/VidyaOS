/**
 * VidyaOS Multi-OS Universal Client-Side Router
 * Works flawlessly in file://, capacitor://, http://, and electron:// environments.
 */

import { Platform } from './platform.js';
import { Bus } from './event-bus.js';
import { Auth } from './auth.js';

class UniversalRouter {
  constructor() {
    this._routes = new Map();
    this._currentRoute = null;
    this._routeHistory = [];
    this._viewContainer = null;
    this._defaultRoute = 'student/home';

    // Hardware / Native Back Button integration
    Platform.onBackButton((e) => {
      if (this._routeHistory.length > 1) {
        this.back();
        return true; // handled
      }
      return false; // let app exit or minimize
    });
  }

  init(containerSelector = '#view-mount-point', defaultRoute = 'student/home') {
    this._viewContainer = document.querySelector(containerSelector);
    this._defaultRoute = defaultRoute;

    window.addEventListener('hashchange', () => this._handleLocationChange());

    // Listen to login/logout events to reroute
    Bus.on('auth:logout', () => this.navigate('auth/login'));
    Bus.on('auth:terminated', () => this.navigate('auth/login'));

    this._handleLocationChange();
  }

  register(path, viewHandler, options = {}) {
    const cleanPath = path.replace(/^#?\/?/, '').replace(/\/+$/, '');
    this._routes.set(cleanPath, {
      handler: viewHandler,
      requireAuth: options.requireAuth !== false,
      role: options.role || null,
      title: options.title || 'VidyaOS',
    });
  }

  async navigate(path, options = {}) {
    const cleanPath = path.replace(/^#?\/?/, '').replace(/\/+$/, '');
    const newHash = `#${cleanPath}`;

    if (window.location.hash !== newHash) {
      if (options.replace) {
        const urlWithoutHash = window.location.href.split('#')[0];
        window.location.replace(`${urlWithoutHash}${newHash}`);
      } else {
        window.location.hash = newHash;
      }
    } else {
      await this._handleLocationChange();
    }
  }

  back() {
    if (this._routeHistory.length > 1) {
      this._routeHistory.pop(); // Remove current
      const prevRoute = this._routeHistory.pop(); // Get previous
      if (prevRoute) {
        this.navigate(prevRoute);
        return;
      }
    }
    window.history.back();
  }

  getCurrentRoute() {
    return this._currentRoute;
  }

  async _handleLocationChange() {
    let hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (!hash) {
      hash = Auth.isAuthenticated() ? this._defaultRoute : 'auth/login';
    }

    // Extract query params if any
    const [path, queryString] = hash.split('?');
    const params = new URLSearchParams(queryString || '');

    const routeConfig = this._routes.get(path);

    // Auth Guard
    if (routeConfig && routeConfig.requireAuth && !Auth.isAuthenticated()) {
      this.navigate('auth/login', { replace: true });
      return;
    }

    // If authenticated and trying to access login, redirect to home
    if (path === 'auth/login' && Auth.isAuthenticated()) {
      this.navigate(this._defaultRoute, { replace: true });
      return;
    }

    if (!routeConfig) {
      console.warn(`[Router] No route registered for: "${path}". Falling back to default.`);
      this.navigate(Auth.isAuthenticated() ? this._defaultRoute : 'auth/login', { replace: true });
      return;
    }

    // Update document title
    if (routeConfig.title) {
      document.title = `${routeConfig.title} | VidyaOS`;
    }

    this._currentRoute = path;
    this._routeHistory.push(path);

    // Render view
    if (this._viewContainer && typeof routeConfig.handler === 'function') {
      try {
        await routeConfig.handler(this._viewContainer, params);
      } catch (err) {
        console.error(`[Router] Error mounting view for "${path}":`, err);
      }
    }

    Bus.emit('route:changed', { path, params, title: routeConfig.title });
  }
}

export const Router = new UniversalRouter();
export default Router;
