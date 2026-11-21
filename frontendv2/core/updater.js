/**
 * VidyaOS Multi-OS Universal Updater Engine
 * Safe SemVer comparison, GitHub release detection, Android APK direct download, and Desktop assets.
 */

import { Platform } from './platform.js';
import { Api } from './api.js';

export function compareSemver(remote, installed) {
  if (!remote || !installed) return 0;
  const parse = (v) => {
    const clean = String(v).replace(/^v/i, '').split('-')[0].trim();
    return clean.split('.').map(n => parseInt(n, 10) || 0);
  };

  const rParts = parse(remote);
  const iParts = parse(installed);
  const len = Math.max(rParts.length, iParts.length);

  for (let i = 0; i < len; i++) {
    const r = rParts[i] || 0;
    const inst = iParts[i] || 0;
    if (r > inst) return 1;  // remote is newer
    if (r < inst) return -1; // installed is newer
  }
  return 0; // strictly identical
}

class UniversalUpdater {
  constructor() {
    this.installedVersion = '1.0.101';
    this.githubRepo = 'onebotyt/VidyaOS';
  }

  async getInstalledVersion() {
    try {
      if (window.Capacitor?.Plugins?.App) {
        const info = await window.Capacitor.Plugins.App.getInfo();
        if (info?.version) {
          this.installedVersion = info.version;
          return this.installedVersion;
        }
      }
    } catch (_) {}

    try {
      const res = await Api.get('/app-version.json', { skipAuth: true, suppressToast: true });
      if (res.success && res.data?.version) {
        this.installedVersion = res.data.version;
      }
    } catch (_) {}

    return this.installedVersion;
  }

  async checkForUpdates() {
    const installed = await this.getInstalledVersion();
    let releaseData = null;

    // Check GitHub Releases
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${this.githubRepo}/releases/latest`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      if (ghRes.ok) {
        releaseData = await ghRes.json();
      }
    } catch (_) {}

    // Fallback to local server /app-version.json
    if (!releaseData) {
      const localRes = await Api.get('/app-version.json', { skipAuth: true, suppressToast: true });
      if (localRes.success && localRes.data) {
        releaseData = {
          tag_name: localRes.data.version,
          name: `VidyaOS v${localRes.data.version}`,
          body: localRes.data.notes || 'Performance enhancements and bug fixes.',
          assets: [
            {
              name: 'app-release.apk',
              browser_download_url: localRes.data.apk_url || '/app-release.apk'
            }
          ]
        };
      }
    }

    if (!releaseData || !releaseData.tag_name) {
      return {
        updateAvailable: false,
        installedVersion: installed,
        message: 'Already on the latest version.'
      };
    }

    const remoteVersion = releaseData.tag_name.replace(/^v/i, '');
    const isNewer = compareSemver(remoteVersion, installed) > 0;

    // Find platform specific download asset
    let downloadUrl = releaseData.html_url;
    let apkAsset = null;

    if (Array.isArray(releaseData.assets)) {
      apkAsset = releaseData.assets.find(a => a.name.endsWith('.apk'));
      if (Platform.os === 'android' && apkAsset) {
        downloadUrl = apkAsset.browser_download_url;
      }
    }

    return {
      updateAvailable: isNewer,
      installedVersion: installed,
      remoteVersion,
      title: releaseData.name || `VidyaOS v${remoteVersion}`,
      notes: releaseData.body || 'New features, UI modernization, and performance stability.',
      downloadUrl,
      publishedAt: releaseData.published_at,
      apkAsset
    };
  }

  async applyUpdate(updateInfo) {
    if (!updateInfo?.downloadUrl) return;

    if (Platform.os === 'android') {
      window.open(updateInfo.downloadUrl, '_system');
    } else {
      window.open(updateInfo.downloadUrl, '_blank');
    }
  }
}

export const Updater = new UniversalUpdater();
export default Updater;
