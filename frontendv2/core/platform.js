/**
 * VidyaOS Multi-OS Universal Platform Abstraction Layer
 * Supports: Android (Capacitor/WebView), iOS, Windows, macOS, Linux (Electron/Tauri/Browser), and Web/PWA.
 */

class PlatformBridge {
  constructor() {
    this.os = this.detectOS();
    this.runtime = this.detectRuntime();
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.isMobileViewport = window.innerWidth < 768;
    this.isTabletViewport = window.innerWidth >= 768 && window.innerWidth < 1024;
    this.isDesktopViewport = window.innerWidth >= 1024;

    this._backButtonListeners = [];
    this._resizeListeners = [];

    this.initEventListeners();
    this.applyPlatformClasses();
  }

  detectOS() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
    const platform = navigator.platform || '';

    // Capacitor or Android detection
    if (/android/i.test(userAgent) || /android/i.test(platform)) {
      return 'android';
    }

    // iOS detection (iPhone, iPad, iPod)
    if (/iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      return 'ios';
    }

    // Windows detection
    if (/Win/i.test(platform) || /Windows/i.test(userAgent)) {
      return 'windows';
    }

    // macOS detection
    if (/Mac/i.test(platform) || /Macintosh/i.test(userAgent)) {
      return 'macos';
    }

    // Linux detection
    if (/Linux/i.test(platform) || /X11/i.test(userAgent)) {
      return 'linux';
    }

    return 'web';
  }

  detectRuntime() {
    // 1. Capacitor Native Environment
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
      return 'capacitor';
    }
    if (window.Capacitor) {
      return 'capacitor';
    }

    // 2. Electron Desktop Environment
    if (window.process && window.process.type === 'renderer') {
      return 'electron';
    }
    if (navigator.userAgent.toLowerCase().includes('electron')) {
      return 'electron';
    }

    // 3. Tauri Desktop Environment
    if (window.__TAURI__) {
      return 'tauri';
    }

    // 4. Progressive Web App (Standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      return 'pwa';
    }

    // 5. Standard Browser
    return 'browser';
  }

  get isMobile() {
    return this.os === 'android' || this.os === 'ios' || this.isMobileViewport;
  }

  get isDesktop() {
    return (this.os === 'windows' || this.os === 'macos' || this.os === 'linux') && !this.isTouch;
  }

  get isNative() {
    return this.runtime === 'capacitor' || this.runtime === 'electron' || this.runtime === 'tauri';
  }

  get isPWA() {
    return this.runtime === 'pwa';
  }

  applyPlatformClasses() {
    const root = document.documentElement;
    root.classList.remove('platform-android', 'platform-ios', 'platform-windows', 'platform-macos', 'platform-linux', 'platform-web');
    root.classList.remove('runtime-capacitor', 'runtime-electron', 'runtime-tauri', 'runtime-pwa', 'runtime-browser');
    root.classList.remove('device-mobile', 'device-tablet', 'device-desktop');

    root.classList.add(`platform-${this.os}`);
    root.classList.add(`runtime-${this.runtime}`);

    if (this.isMobileViewport) {
      root.classList.add('device-mobile');
    } else if (this.isTabletViewport) {
      root.classList.add('device-tablet');
    } else {
      root.classList.add('device-desktop');
    }

    if (this.isTouch) {
      root.classList.add('has-touch');
    } else {
      root.classList.add('no-touch');
    }

    // Set CSS custom property for OS
    root.style.setProperty('--current-os', this.os);
    root.style.setProperty('--current-runtime', this.runtime);
  }

  initEventListeners() {
    // Responsive layout resize handler
    window.addEventListener('resize', () => {
      const prevMobile = this.isMobileViewport;
      const prevTablet = this.isTabletViewport;
      const prevDesktop = this.isDesktopViewport;

      this.isMobileViewport = window.innerWidth < 768;
      this.isTabletViewport = window.innerWidth >= 768 && window.innerWidth < 1024;
      this.isDesktopViewport = window.innerWidth >= 1024;

      if (prevMobile !== this.isMobileViewport || prevTablet !== this.isTabletViewport || prevDesktop !== this.isDesktopViewport) {
        this.applyPlatformClasses();
        this._resizeListeners.forEach(fn => fn({
          isMobile: this.isMobileViewport,
          isTablet: this.isTabletViewport,
          isDesktop: this.isDesktopViewport,
          width: window.innerWidth,
          height: window.innerHeight
        }));
      }
    });

    // Hardware / Native Back Button handler (Android / Capacitor)
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.addListener('backButton', (data) => {
        this.triggerBackButton(data);
      });
    }
  }

  onResize(listener) {
    if (typeof listener === 'function') {
      this._resizeListeners.push(listener);
    }
  }

  onBackButton(handler) {
    if (typeof handler === 'function') {
      this._backButtonListeners.push(handler);
    }
  }

  offBackButton(handler) {
    this._backButtonListeners = this._backButtonListeners.filter(h => h !== handler);
  }

  triggerBackButton(event) {
    // Let listeners process back navigation in LIFO order (modal first, then view, then app minimize)
    for (let i = this._backButtonListeners.length - 1; i >= 0; i--) {
      const handled = this._backButtonListeners[i](event);
      if (handled === true) {
        return true;
      }
    }
    return false;
  }

  // Native Haptics Feedback (Light, Medium, Heavy, Success, Warning, Error)
  async hapticFeedback(style = 'light') {
    try {
      if (window.Capacitor?.Plugins?.Haptics) {
        const { Haptics } = window.Capacitor.Plugins;
        if (style === 'success' || style === 'warning' || style === 'error') {
          await Haptics.notification({ type: style.toUpperCase() });
        } else {
          await Haptics.impact({ style: style.toUpperCase() });
        }
        return;
      }
    } catch (_) {}

    // Fallback to Web Vibration API if supported
    if ('vibrate' in navigator) {
      if (style === 'light') navigator.vibrate(10);
      else if (style === 'medium') navigator.vibrate(25);
      else if (style === 'heavy') navigator.vibrate(50);
      else if (style === 'error') navigator.vibrate([40, 40, 40]);
      else if (style === 'success') navigator.vibrate([20, 30, 20]);
    }
  }

  // Status Bar Coloring for Android & iOS
  async setStatusBarColor(colorHex, isDark = false) {
    try {
      if (window.Capacitor?.Plugins?.StatusBar) {
        const { StatusBar, Style } = window.Capacitor.Plugins;
        await StatusBar.setBackgroundColor({ color: colorHex });
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
      }
    } catch (_) {}

    // Update browser theme-color meta tag
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = colorHex;
  }

  // Desktop Window Controls (Minimize, Maximize, Close)
  async minimizeWindow() {
    if (this.runtime === 'electron' && window.electronAPI?.minimize) {
      window.electronAPI.minimize();
    } else if (this.runtime === 'tauri' && window.__TAURI__?.window) {
      window.__TAURI__.window.appWindow.minimize();
    }
  }

  async toggleMaximizeWindow() {
    if (this.runtime === 'electron' && window.electronAPI?.toggleMaximize) {
      window.electronAPI.toggleMaximize();
    } else if (this.runtime === 'tauri' && window.__TAURI__?.window) {
      window.__TAURI__.window.appWindow.toggleMaximize();
    }
  }

  async closeWindow() {
    if (this.runtime === 'electron' && window.electronAPI?.close) {
      window.electronAPI.close();
    } else if (this.runtime === 'tauri' && window.__TAURI__?.window) {
      window.__TAURI__.window.appWindow.close();
    } else if (this.runtime === 'capacitor' && window.Capacitor?.Plugins?.App?.exitApp) {
      window.Capacitor.Plugins.App.exitApp();
    }
  }
}

export const Platform = new PlatformBridge();
export default Platform;
