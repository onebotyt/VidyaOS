/**
 * VidyaOS Universal Storage Layer
 * Adapts transparently between Capacitor Preferences (native Android/iOS),
 * LocalStorage (Web/Desktop), and Memory storage.
 */

class UniversalStorage {
  constructor() {
    this._memoryStore = new Map();
    this._hasCapacitorPreferences = false;
    this.checkCapacitor();
  }

  checkCapacitor() {
    this._hasCapacitorPreferences = Boolean(
      window.Capacitor?.Plugins?.Preferences
    );
  }

  async get(key, defaultValue = null) {
    try {
      if (this._hasCapacitorPreferences) {
        const { value } = await window.Capacitor.Plugins.Preferences.get({ key });
        if (value !== null && value !== undefined) {
          try {
            return JSON.parse(value);
          } catch (_) {
            return value;
          }
        }
      }
    } catch (_) {}

    try {
      const item = localStorage.getItem(key);
      if (item !== null && item !== undefined) {
        try {
          return JSON.parse(item);
        } catch (_) {
          return item;
        }
      }
    } catch (_) {}

    return this._memoryStore.has(key) ? this._memoryStore.get(key) : defaultValue;
  }

  async set(key, value) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    try {
      if (this._hasCapacitorPreferences) {
        await window.Capacitor.Plugins.Preferences.set({ key, value: serialized });
      }
    } catch (_) {}

    try {
      localStorage.setItem(key, serialized);
    } catch (_) {}

    this._memoryStore.set(key, value);
    return true;
  }

  async remove(key) {
    try {
      if (this._hasCapacitorPreferences) {
        await window.Capacitor.Plugins.Preferences.remove({ key });
      }
    } catch (_) {}

    try {
      localStorage.removeItem(key);
    } catch (_) {}

    this._memoryStore.delete(key);
    return true;
  }

  async clear() {
    try {
      if (this._hasCapacitorPreferences) {
        await window.Capacitor.Plugins.Preferences.clear();
      }
    } catch (_) {}

    try {
      localStorage.clear();
    } catch (_) {}

    this._memoryStore.clear();
    return true;
  }
}

export const Storage = new UniversalStorage();
export default Storage;
