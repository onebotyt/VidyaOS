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
  window.VIDYAOS_APP_VERSION = '1.0.1';

  // 1. Cloud Backend URL
  const CLOUD_BACKEND_URL = 'https://vidyaos-backend.onrender.com';
  const GITHUB_REPO = 'onebotyt/VidyaOS';
  const GITHUB_VERSION_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/app-version.json`;
  const LATEST_APK_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/VidyaOS.apk`;

  // Detect whether running in Capacitor / Mobile native shell
  const isCapacitor = typeof window !== 'undefined' && (
    window.VIDYAOS_FORCE_NATIVE === true ||
    window.VIDYAOS_IS_NATIVE === true ||
    Boolean(window.Capacitor?.isNativePlatform?.()) ||
    Boolean(window.Capacitor) ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:'
  );

  window.VIDYAOS_IS_NATIVE = isCapacitor;
  window.VIDYAOS_API_BASE = isCapacitor ? `${CLOUD_BACKEND_URL}/api/v1` : '/api/v1';
  window.VIDYAOS_CLOUD_BACKEND = CLOUD_BACKEND_URL;

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

  // 4. In-App Auto-Update Checker
  async function checkForAppUpdates() {
    try {
      // Strictly restrict update checks and banner notifications to native Android APK
      // Never show mobile update banner on desktop web browser
      const isRealNativeApp = (
        typeof window !== 'undefined' && (
          Boolean(window.Capacitor?.isNativePlatform?.()) ||
          window.location.protocol === 'capacitor:' ||
          window.location.protocol === 'file:' ||
          window.VIDYAOS_FORCE_NATIVE === true
        )
      );
      if (!isRealNativeApp) {
        return;
      }

      const currentVersion = window.VIDYAOS_APP_VERSION || '1.0.0';
      const res = await fetch(GITHUB_VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();
      const remoteVersion = data.version;
      const downloadUrl = data.apkUrl || LATEST_APK_URL;

      if (!remoteVersion || remoteVersion === currentVersion) return;

      // Check if user dismissed this specific version recently
      const dismissedVer = localStorage.getItem('vidyaos_dismissed_update');
      if (dismissedVer === remoteVersion) return;

      showUpdateNotification(remoteVersion, downloadUrl, data.releaseNotes);
    } catch (_) {
      // Non-critical, ignore network error
    }
  }

  function showUpdateNotification(version, apkUrl, releaseNotes) {
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
          <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 2px;">Update Available â€¢ v${version}</div>
          <div style="font-size: 0.8rem; color: #94a3b8; line-height: 1.35; margin-bottom: 12px;">
            ${releaseNotes || 'A new update of VidyaOS is available with the latest features.'}
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="${apkUrl}" target="_blank" id="btn-update-apk" style="
              display: inline-block;
              background: #2563eb;
              color: #ffffff;
              padding: 6px 14px;
              border-radius: 8px;
              font-size: 0.82rem;
              font-weight: 600;
              text-decoration: none;
              text-align: center;
            ">Download Update</a>
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

    document.getElementById('btn-dismiss-apk')?.addEventListener('click', () => {
      localStorage.setItem('vidyaos_dismissed_update', version);
      banner.remove();
    });
  }

  // Check for updates shortly after document loads
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(checkForAppUpdates, 2000));
    } else {
      setTimeout(checkForAppUpdates, 2000);
    }
  }

})();
