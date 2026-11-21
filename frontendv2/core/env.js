/**
 * VidyaOS Multi-OS Environment Configuration
 * Automatically detects origin or falls back to configured backend servers.
 */

import { Storage } from './storage.js';
import { Platform } from './platform.js';

class EnvironmentConfig {
  constructor() {
    this.DEFAULT_PORT = 3000;
    this.DEFAULT_PROD_URL = 'https://vidyaos-backend.onrender.com';
  }

  async getApiBaseUrl() {
    // 1. Check if user configured a custom server in settings
    const customServer = await Storage.get('vidyaos_custom_server');
    if (customServer && customServer.startsWith('http')) {
      return customServer.replace(/\/+$/, '');
    }

    // 2. If running on native mobile (Capacitor) or file:// protocol
    if (Platform.runtime === 'capacitor' || window.location.protocol === 'file:') {
      // In Android emulator or physical device with local dev backend
      const savedEnv = await Storage.get('vidyaos_env_mode', 'auto');
      if (savedEnv === 'local') {
        return Platform.os === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
      }
      // If we are in local browser testing
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `http://${window.location.hostname}:3000`;
      }
      return this.DEFAULT_PROD_URL;
    }

    // 3. Web or Desktop browser
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://${window.location.hostname}:3000`;
    }

    // Default to current web host
    return window.location.origin;
  }
}

export const Env = new EnvironmentConfig();
export default Env;
