/**
 * ══════════════════════════════════════════════════════════════
 * GLOBAL INSTITUTION SHOWCASE HERO LOGIC (institution-hero.js)
 * Location: /frontend/global-components/institution-hero/institution-hero.js
 * 
 * Dynamically loads and synchronizes institutional branding
 * (College Name, Tagline, Logo, Campus Banner) across all portals.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const DEFAULT_BRANDING = {
    institution_name: 'Government Polytechnic College',
    institution_tagline: 'Uttarakhand | NBA Compliant',
    institution_logo_url: '/uploads/branding/college_logo_1794620864273_107645.png',
    institution_banner_url: '/admin/dashboard/campus-nainital.jpg'
  };

  function resolveBrandingUrl(url, fallback) {
    if (!url) return fallback;
    if (typeof window !== 'undefined' && (window.VIDYAOS_IS_NATIVE || window.VIDYAOS_FORCE_NATIVE)) {
      if (url.startsWith('/uploads')) {
        return (window.VIDYAOS_CLOUD_BACKEND || 'https://vidyaos-backend.onrender.com') + url;
      }
    }
    return url;
  }

  function applyBrandingData(s) {
    if (!s) return;

    const elName = document.getElementById('dash-inst-name');
    const elTagline = document.getElementById('dash-inst-tagline');
    const elLogo = document.getElementById('dash-inst-logo');
    const elBanner = document.getElementById('dash-inst-banner');

    const name = s.institution_name || DEFAULT_BRANDING.institution_name;
    const tagline = s.institution_tagline || DEFAULT_BRANDING.institution_tagline;
    const logoUrl = resolveBrandingUrl(s.institution_logo_url || DEFAULT_BRANDING.institution_logo_url, '/images/collegelogo.jpeg');
    const bannerUrl = resolveBrandingUrl(s.institution_banner_url || DEFAULT_BRANDING.institution_banner_url, '/admin/dashboard/campus-nainital.jpg');

    if (elName) elName.textContent = name;
    if (elTagline) elTagline.textContent = tagline;

    if (elLogo && logoUrl) {
      elLogo.src = logoUrl;
      elLogo.onerror = function () {
        elLogo.onerror = null;
        elLogo.src = '/images/collegelogo.jpeg';
      };
    }

    if (elBanner && bannerUrl) {
      elBanner.src = bannerUrl;
      elBanner.onerror = function () {
        elBanner.onerror = null;
        elBanner.src = '/admin/dashboard/campus-nainital.jpg';
      };
    }
  }

  async function syncInstitutionBranding() {
    // 1. Instant paint from cache
    try {
      const cached = localStorage.getItem('institutionSettings');
      if (cached) {
        applyBrandingData(JSON.parse(cached));
      }
    } catch (_) { }

    // 2. Fetch fresh from public branding API (accessible to students, faculty, admin & visitors)
    try {
      let res = null;
      if (typeof window.fetchApi === 'function') {
        res = await window.fetchApi('/auth/branding', { suppressToast: true }).catch(() => null);
      }
      if (!res || !res.success) {
        res = await fetch('/api/v1/auth/branding', { credentials: 'include' }).then(r => r.json()).catch(() => null);
      }

      if (res && res.success && res.data) {
        const s = res.data.map || res.data || {};
        const payload = {
          institution_name: s.institution_name || DEFAULT_BRANDING.institution_name,
          institution_tagline: s.institution_tagline || DEFAULT_BRANDING.institution_tagline,
          institution_logo_url: s.institution_logo_url || DEFAULT_BRANDING.institution_logo_url,
          institution_banner_url: s.institution_banner_url || DEFAULT_BRANDING.institution_banner_url
        };
        try {
          localStorage.setItem('institutionSettings', JSON.stringify(payload));
        } catch (_) { }
        applyBrandingData(payload);
      }
    } catch (e) {
      console.warn('[InstitutionHero] Failed to refresh branding settings:', e);
    }
  }

  function mountInstitutionHero(targetOrSelector) {
    const target = typeof targetOrSelector === 'string'
      ? document.querySelector(targetOrSelector)
      : (targetOrSelector || document.getElementById('global-hero-mount'));

    if (!target) return;

    if (!document.getElementById('global-inst-hero')) {
      target.innerHTML = `
        <section class="global-inst-hero-card dash-hero-card" id="global-inst-hero" aria-label="Institutional Showcase">
          <div class="dash-hero-brand-group">
            <div class="dash-hero-logo-badge">
              <img id="dash-inst-logo" src="/images/collegelogo.jpeg" alt="Institutional Logo"
                onerror="this.onerror=null;this.src='/images/collegelogo.jpeg'">
            </div>
            <div class="dash-hero-vdivider"></div>
            <div class="dash-hero-text">
              <h1 id="dash-inst-name" class="dash-hero-title">Government Polytechnic College</h1>
              <p id="dash-inst-tagline" class="dash-hero-subtitle">Uttarakhand | NBA Compliant</p>
            </div>
          </div>
          <div class="dash-hero-banner-wrap" aria-hidden="true">
            <img id="dash-inst-banner" src="/admin/dashboard/campus-nainital.jpg" alt="College Campus"
              class="dash-hero-banner-img" onerror="this.onerror=null;this.src='/admin/dashboard/campus-nainital.jpg'">
            <div class="dash-hero-banner-glow"></div>
          </div>
        </section>
      `;
    }
    syncInstitutionBranding();
  }

  // Auto-init on load if mount exists or hero elements already in DOM
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('global-hero-mount')) mountInstitutionHero();
        else if (document.getElementById('dash-inst-name')) syncInstitutionBranding();
      });
    } else {
      if (document.getElementById('global-hero-mount')) mountInstitutionHero();
      else if (document.getElementById('dash-inst-name')) syncInstitutionBranding();
    }
  }

  window.syncInstitutionBranding = syncInstitutionBranding;
  window.mountInstitutionHero = mountInstitutionHero;
  window.applyBrandingData = applyBrandingData;
})();
