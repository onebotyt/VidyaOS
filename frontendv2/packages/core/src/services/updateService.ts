/**
 * VidyaOS Universal App Update Service
 * Checks GitHub Releases API in real-time for immediate updates.
 */

import versionData from '../version.json';

export interface AppReleaseInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  apkUrl: string;
  v2ApkUrl: string;
  publishedAt: string;
}

export const CURRENT_APP_VERSION = versionData.version || '1.0.119';
export const CURRENT_BUILD_NUMBER = versionData.buildNumber || 119;
export const GITHUB_REPO = 'onebotyt/VidyaOS';

export function compareSemver(remote: string, current: string): boolean {
  if (!remote || !current) return false;
  const r = remote.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const c = current.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(r.length, c.length);
  for (let i = 0; i < len; i++) {
    const a = r[i] || 0;
    const b = c[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

export async function checkUniversalAppUpdate(customCurrentVer?: string): Promise<AppReleaseInfo> {
  const currentVer = customCurrentVer || CURRENT_APP_VERSION;

  // 1. Primary: Query GitHub Releases API for instant release detection (no CDN delay)
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });

    if (res.ok) {
      const data = await res.json();
      const latestTag = (data.tag_name || '').replace(/^v/, '').trim();
      const notes = data.body || 'A new update of VidyaOS is available with the latest features and bug fixes.';

      let v2ApkUrl = `https://github.com/${GITHUB_REPO}/releases/download/${data.tag_name}/v2app.apk`;
      let vidyaApkUrl = `https://github.com/${GITHUB_REPO}/releases/download/${data.tag_name}/VidyaOS.apk`;

      if (Array.isArray(data.assets)) {
        const v2Asset = data.assets.find((a: any) => a.name === 'v2app.apk');
        if (v2Asset?.browser_download_url) v2ApkUrl = v2Asset.browser_download_url;
        const vidyaAsset = data.assets.find((a: any) => a.name === 'VidyaOS.apk');
        if (vidyaAsset?.browser_download_url) vidyaApkUrl = vidyaAsset.browser_download_url;
      }

      const hasUpdate = compareSemver(latestTag, currentVer);
      return {
        hasUpdate,
        currentVersion: currentVer,
        latestVersion: latestTag || currentVer,
        releaseNotes: notes,
        apkUrl: vidyaApkUrl,
        v2ApkUrl: v2ApkUrl,
        publishedAt: data.published_at || new Date().toISOString(),
      };
    }
  } catch (_) {}

  // 2. Fallback: Raw GitHub main branch app-version.json
  try {
    const rawRes = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/app-version.json?t=${Date.now()}`);
    if (rawRes.ok) {
      const j = await rawRes.json();
      const latestVer = (j.version || '').replace(/^v/, '').trim();
      const hasUpdate = compareSemver(latestVer, currentVer);
      return {
        hasUpdate,
        currentVersion: currentVer,
        latestVersion: latestVer || currentVer,
        releaseNotes: j.releaseNotes || 'A new update of VidyaOS is available.',
        apkUrl: j.apkUrl || `https://github.com/${GITHUB_REPO}/releases/latest/download/VidyaOS.apk`,
        v2ApkUrl: `https://github.com/${GITHUB_REPO}/releases/latest/download/v2app.apk`,
        publishedAt: j.releaseDate || new Date().toISOString(),
      };
    }
  } catch (_) {}

  return {
    hasUpdate: false,
    currentVersion: currentVer,
    latestVersion: currentVer,
    releaseNotes: '',
    apkUrl: `https://github.com/${GITHUB_REPO}/releases/latest/download/VidyaOS.apk`,
    v2ApkUrl: `https://github.com/${GITHUB_REPO}/releases/latest/download/v2app.apk`,
    publishedAt: '',
  };
}
