/**
 * VidyaOS Mobile Environment & API Bridge
 * Enables native Capacitor Android execution using the existing web codebase.
 * - Proxies /api/v1 and /uploads calls to cloud backend (Render)
 * - In-app update checker against latest GitHub Releases
 * - Native Android Back Button management
 */

(function () {
  'use strict';

  // Current Client App Version (Stamped during CI/CD build)
  window.VIDYAOS_APP_VERSION = '1.0.158';

  // 1. Cloud Backend URL
  const CLOUD_BACKEND_URL = 'https://vidyaos-backend.onrender.com';
  const GITHUB_REPO = 'onebotyt/VidyaOS';
  const GITHUB_VERSION_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/app-version.json`;
  const LATEST_APK_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/VidyaOS.apk`;

  // Detect whether running in Capacitor / Mobile native shell (Strictly false in web browser)
  const isCapacitor = typeof window !== 'undefined' && (
    window.VIDYAOS_FORCE_NATIVE === true ||
    (typeof window.Capacitor !== 'undefined' && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
    window.location.protocol === 'capacitor:' ||
    (window.location.protocol === 'file:' && /android_asset/i.test(window.location.pathname))
  );

  window.VIDYAOS_IS_NATIVE = isCapacitor;
  window.VIDYAOS_API_BASE = isCapacitor ? `${CLOUD_BACKEND_URL}/api/v1` : '/api/v1';
  window.VIDYAOS_CLOUD_BACKEND = CLOUD_BACKEND_URL;

  // Status Bar & System Windows Dynamic Theming (Meesho-Style Clarity)
  function syncSystemBarsWithAppTheme() {
    try {
      const isDark = document.documentElement.classList.contains('dark') ||
                     document.body?.classList.contains('dark') ||
                     document.documentElement.getAttribute('data-theme') === 'dark' ||
                     document.body?.getAttribute('data-theme') === 'dark' ||
                     localStorage.getItem('theme') === 'dark';

      const barColor = isDark ? '#0b1220' : '#ffffff';

      // 1. Native Java Bridge (Sets WindowInsetsControllerCompat appearanceLight)
      if (window.NativeSystemUI && typeof window.NativeSystemUI.setSystemBarTheme === 'function') {
        try {
          window.NativeSystemUI.setSystemBarTheme(isDark, barColor, barColor);
        } catch (_) {}
      }

      // 2. Capacitor StatusBar Plugin
      if (window.Capacitor?.Plugins?.StatusBar) {
        try {
          window.Capacitor.Plugins.StatusBar.setOverlaysWebView({ overlay: false });
          window.Capacitor.Plugins.StatusBar.setBackgroundColor({ color: barColor });
          if (window.Capacitor.Plugins.StatusBar.setStyle) {
            // LIGHT style in Capacitor means light icons (for dark bg)
            // DARK style in Capacitor means dark icons (for light bg, like Meesho)
            window.Capacitor.Plugins.StatusBar.setStyle({ style: isDark ? 'DARK' : 'LIGHT' });
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  // Expose global helper for theme switchers
  window.syncSystemBarsWithAppTheme = syncSystemBarsWithAppTheme;

  // Run immediately and listen for theme changes
  syncSystemBarsWithAppTheme();
  if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
    const themeObserver = new MutationObserver(() => syncSystemBarsWithAppTheme());
    if (document.documentElement) {
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    }
    if (document.body) {
      themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body) {
          themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
        }
        syncSystemBarsWithAppTheme();
      });
    }
  }

  if (isCapacitor) {
    if (document.documentElement) {
      document.documentElement.classList.add('is-native-shell');
    }
  }

  // 2. Fetch Interceptor for Native App Context
  if (isCapacitor) {
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
      if (typeof input === 'string') {
        if (input.startsWith('/api/v1') || input.startsWith('/uploads')) {
          input = CLOUD_BACKEND_URL + input;
        } else if (input.startsWith('api/v1') || input.startsWith('uploads')) {
          input = CLOUD_BACKEND_URL + '/' + input;
        } else if (input.startsWith('https://localhost/api/v1') || input.startsWith('http://localhost/api/v1')) {
          input = input.replace(/^https?:\/\/localhost/, CLOUD_BACKEND_URL);
        } else if (input.startsWith('https://localhost/uploads') || input.startsWith('http://localhost/uploads')) {
          input = input.replace(/^https?:\/\/localhost/, CLOUD_BACKEND_URL);
        }
      } else if (input instanceof Request) {
        try {
          const urlObj = new URL(input.url);
          if (urlObj.pathname.startsWith('/api/v1') || urlObj.pathname.startsWith('/uploads')) {
            const newUrl = CLOUD_BACKEND_URL + urlObj.pathname + urlObj.search;
            input = new Request(newUrl, input);
          }
        } catch (_) { }
      }
      return originalFetch.call(this, input, init);
    };
  }

  // 3. Native Android Back Button Handler
  if (isCapacitor && window.Capacitor?.Plugins?.App) {
    const { App } = window.Capacitor.Plugins;
    App.addListener('backButton', ({ canGoBack }) => {
      const modal = document.querySelector('.modal.active, .gc-modal.active, .drawer.open, #student-drawer.open, #camera-qr-modal:not([style*="display: none"])');
      if (modal) {
        // Close modal first
        if (typeof window.closeCameraQrModal === 'function') window.closeCameraQrModal();
        if (typeof window.closeSelfAttendanceModal === 'function') window.closeSelfAttendanceModal();
        if (typeof window.toggleStudentDrawer === 'function') window.toggleStudentDrawer(false);
        return;
      }

      if (window.history.length > 1 && canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  }

  // 4. In-App Auto-Update Checker (GitHub Releases API + Fallback)
  // Strictly for Native Android / Mobile App (Capacitor shell) — NEVER show on website/browser
  async function checkForAppUpdates(force = false) {
    if (!isCapacitor && !force) {
      return; // Do not display native APK update banners in standard web browser
    }
    try {
      const currentVersion = (window.NativeAppUpdater && typeof window.NativeAppUpdater.getAppVersionName === 'function')
        ? window.NativeAppUpdater.getAppVersionName()
        : (window.VIDYAOS_APP_VERSION || '1.0.119');

      let remoteVersion = null;
      let downloadUrl = LATEST_APK_URL;
      let releaseNotes = '';

      // 1. Primary: Direct GitHub Releases API (Instant, no Fastly CDN cache delay)
      try {
        const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
          headers: { 'Accept': 'application/vnd.github.v3+json' },
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          remoteVersion = (ghData.tag_name || '').replace(/^v/, '').trim();
          releaseNotes = ghData.body || '';
          if (Array.isArray(ghData.assets)) {
            const asset = ghData.assets.find(a => a.name === 'VidyaOS.apk');
            if (asset && asset.browser_download_url) downloadUrl = asset.browser_download_url;
          }
        }
      } catch (_) {}

      // 2. Fallback: Raw GitHub main app-version.json
      if (!remoteVersion) {
        try {
          const res = await fetch(GITHUB_VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            remoteVersion = data.version;
            if (data.apkUrl) downloadUrl = data.apkUrl;
            if (data.releaseNotes) releaseNotes = data.releaseNotes;
          }
        } catch (_) {}
      }

      if (!remoteVersion) return;

      const isNewer = (function (v1, v2) {
        if (!v1 || !v2) return false;
        const p1 = String(v1).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
        const p2 = String(v2).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
        const len = Math.max(p1.length, p2.length);
        for (let i = 0; i < len; i++) {
          const a = p1[i] || 0;
          const b = p2[i] || 0;
          if (a > b) return true;
          if (a < b) return false;
        }
        return false;
      })(remoteVersion, currentVersion);

      if (!isNewer) return;

      // Check if user dismissed this specific version in this session
      if (!force) {
        const dismissedVer = sessionStorage.getItem('vidyaos_dismissed_update');
        if (dismissedVer === remoteVersion) return;
      }

      showUpdateNotification(remoteVersion, downloadUrl, releaseNotes);
    } catch (_) {
      // Non-critical, ignore network error
    }
  }

  function showUpdateNotification(version, apkUrl, releaseNotes) {
    if (!isCapacitor) return; // Do not display native APK update banner on website
    if (document.getElementById('vidyaos-update-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'vidyaos-update-banner';
    banner.setAttribute('style', `
      position: fixed;
      bottom: 24px;
      left: 16px;
      right: 16px;
      margin: 0 auto;
      max-width: 440px;
      background: #1e293b;
      color: #ffffff;
      padding: 16px;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      animation: vidyaSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `);

    banner.innerHTML = `
      <style>
        @keyframes vidyaSlideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      </style>
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">
        <div style="width: 36px; height: 36px; border-radius: 10px; background: #2563eb; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 2px;">Update Available • v${version}</div>
          <div style="font-size: 0.8rem; color: #94a3b8; line-height: 1.35; margin-bottom: 12px;">
            ${releaseNotes || 'A new update of VidyaOS is available with the latest features.'}
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="btn-update-apk" style="
              display: inline-block;
              background: #2563eb;
              color: #ffffff;
              padding: 6px 14px;
              border-radius: 8px;
              border: none;
              font-size: 0.82rem;
              font-weight: 600;
              cursor: pointer;
              text-align: center;
            ">Update Now</button>
            <button id="btn-dismiss-apk" style="
              background: rgba(255, 255, 255, 0.1);
              color: #cbd5e1;
              border: none;
              padding: 6px 12px;
              border-radius: 8px;
              font-size: 0.82rem;
              cursor: pointer;
            ">Later</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    const updateBtn = document.getElementById('btn-update-apk');
    if (updateBtn) {
      window.onNativeUpdateProgress = function (percent) {
        if (updateBtn) {
          updateBtn.textContent = `Downloading ${percent}%...`;
        }
      };
      window.onNativeUpdateComplete = function () {
        if (updateBtn) {
          updateBtn.textContent = `Opening installer...`;
        }
      };
      window.onNativeUpdateError = function () {
        if (updateBtn) {
          updateBtn.disabled = false;
          updateBtn.textContent = `Retry Update`;
          updateBtn.style.opacity = '1';
        }
      };

      updateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.NativeAppUpdater && typeof window.NativeAppUpdater.downloadAndInstall === 'function') {
          updateBtn.textContent = 'Starting download...';
          updateBtn.disabled = true;
          updateBtn.style.opacity = '0.8';
          try {
            window.NativeAppUpdater.downloadAndInstall(apkUrl);
          } catch (_) {
            window.open(apkUrl, '_blank');
          }
        } else {
          window.open(apkUrl, '_blank');
        }
      });
    }

    document.getElementById('btn-dismiss-apk')?.addEventListener('click', () => {
      localStorage.setItem('vidyaos_dismissed_update', version);
      banner.remove();
    });
  }

  // Export to window for in-app settings & UI interactions
  if (typeof window !== 'undefined') {
    window.VidyaOSMobileBridge = {
      checkForAppUpdates,
      showUpdateNotification,
      getCurrentVersion: () => window.VIDYAOS_APP_VERSION || '1.0.103',
      GITHUB_VERSION_URL,
      LATEST_APK_URL
    };

    if (isCapacitor) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(checkForAppUpdates, 2000));
      } else {
        setTimeout(checkForAppUpdates, 2000);
      }
    }
  }

})();
