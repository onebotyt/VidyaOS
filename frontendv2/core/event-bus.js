/**
 * VidyaOS Lightweight Universal Event Bus
 */

class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }

  off(event, callback) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(callback);
    }
  }

  emit(event, ...args) {
    if (this._listeners.has(event)) {
      for (const callback of Array.from(this._listeners.get(event))) {
        try {
          callback(...args);
        } catch (err) {
          console.error(`[EventBus] Error in listener for "${event}":`, err);
        }
      }
    }
  }
}

export const Bus = new EventBus();
export default Bus;
