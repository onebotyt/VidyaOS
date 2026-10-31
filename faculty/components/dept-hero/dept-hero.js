/**
 * VIDYAOS REUSABLE INSTITUTIONAL HERO BANNER COMPONENT
 * Location: /faculty/components/dept-hero/dept-hero.js
 * 
 * Reusable dynamic header banner component matching modern institutional design:
 * - Dynamic college logo, name, tagline, and panoramic campus image from Admin Settings
 * - Seamless zero-flicker hydration via localStorage cache
 * - Live update on 'institution-settings-updated' custom event
 * - Configurable page title and subtitle per view (Faculty Dashboard, Classes, etc.)
 * - 100% Theme Token Compliant (Zero Hardcoded Hex Colors)
 */

(function (root) {
  'use strict';

  const DEFAULTS = {
    institution_name: 'Government Polytechnic Nainital',
    institution_tagline: 'Uttarakhand | Completely Adhered to NBA Guidelines',
    institution_code: 'GP-UBTER-101',
    institution_logo_url: '/images/college-logo.svg',
    institution_banner_url: '/admin/dashboard/campus-nainital.jpg',
    page_title: 'Faculty Dashboard',
    page_subtitle: 'Manage your classes, attendance, students and more.'
  };

  function ensureStyles() {
    if (typeof document === 'undefined') return;
    const existing = document.querySelector('link[href*="dept-hero.css"]');
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/faculty/components/dept-hero/dept-hero.css?v=20261031_v6';
      document.head.appendChild(link);
    }
  }

  function getCachedSettings() {
    try {
      const raw = localStorage.getItem('institutionSettings');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function renderTemplate(config) {
    const instName = config.institution_name || DEFAULTS.institution_name;
    const tagline = config.institution_tagline || DEFAULTS.institution_tagline;
    const logoUrl = config.institution_logo_url || DEFAULTS.institution_logo_url;
    const bannerUrl = config.institution_banner_url || DEFAULTS.institution_banner_url;
    const pageTitle = config.page_title || DEFAULTS.page_title;
    const pageSubtitle = config.page_subtitle || DEFAULTS.page_subtitle;

    return `
      <section class="dept-hero-component" aria-label="Institutional Campus Showcase & Faculty Command Header">
        <!-- Left Side: College Identity & Page Meta -->
        <div class="hero-left-col">
          <!-- College Circular Logo -->
          <div class="hero-logo-circle-wrap" aria-hidden="true">
            <img class="hero-inst-logo-img hero-inst-logo-val" src="${logoUrl}" alt="College Logo"
              onerror="this.onerror=null;this.src='/images/college-logo.svg';">
          </div>

          <!-- College Name & Subtitle -->
          <div class="hero-inst-text-block">
            <h2 class="hero-inst-name hero-inst-name-val">${escapeHtml(instName)}</h2>
            <p class="hero-inst-tagline hero-inst-tagline-val">${escapeHtml(tagline)}</p>
          </div>

          <!-- Vertical Divider -->
          <div class="hero-vertical-divider" aria-hidden="true"></div>

          <!-- Page Title & Subtitle -->
          <div class="hero-page-text-block">
            <h1 class="hero-page-title hero-page-title-val">${escapeHtml(pageTitle)}</h1>
            <p class="hero-page-subtitle hero-page-subtitle-val">${escapeHtml(pageSubtitle)}</p>
          </div>
        </div>

        <!-- Right Side: Panoramic College Campus Building Photo -->
        <div class="hero-right-col" aria-hidden="true">
          <div class="hero-campus-photo-wrap">
            <img class="hero-campus-photo hero-campus-photo-val" src="${bannerUrl}" alt="${escapeHtml(instName)} Campus"
              onerror="this.onerror=null;this.src='/admin/dashboard/campus-nainital.jpg';">
            <div class="hero-campus-photo-overlay"></div>
          </div>
        </div>

        <!-- Backward Compatibility Hidden Anchors -->
        <span id="portal-dept-name" style="display:none;">${escapeHtml(instName)}</span>
        <span id="dept-hero-dept-name" style="display:none;">${escapeHtml(instName)}</span>
        <span id="dept-hero-inst-name" style="display:none;">${escapeHtml(instName)}</span>
        <span id="dept-command-title" style="display:none;">${escapeHtml(instName)}</span>
      </section>
    `;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Update DOM in all mounted instances
  function applyBrandingToDOM(settings) {
    if (!settings) return;
    const instName = settings.institution_name || DEFAULTS.institution_name;
    const tagline = settings.institution_tagline || DEFAULTS.institution_tagline;
    const logoUrl = settings.institution_logo_url || DEFAULTS.institution_logo_url;
    const bannerUrl = settings.institution_banner_url || DEFAULTS.institution_banner_url;

    document.querySelectorAll('.hero-inst-name-val, #hero-inst-name, #dept-hero-inst-name').forEach(el => {
      el.textContent = instName;
    });
    document.querySelectorAll('.hero-inst-tagline-val, #hero-inst-tagline').forEach(el => {
      el.textContent = tagline;
    });
    document.querySelectorAll('.hero-inst-logo-val, #hero-inst-logo').forEach(el => {
      if (el.tagName === 'IMG') el.src = logoUrl;
    });
    document.querySelectorAll('.hero-campus-photo-val, #hero-campus-img').forEach(el => {
      if (el.tagName === 'IMG') el.src = bannerUrl;
    });
  }

  // Fetch settings from API with fallback
  async function fetchInstitutionBranding() {
    try {
      const res = await fetch('/api/v1/settings/institution');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const s = json.data;
          try {
            localStorage.setItem('institutionSettings', JSON.stringify(s));
          } catch (_) {}
          applyBrandingToDOM(s);
          return s;
        }
      }
    } catch (_) {}
    return null;
  }

  /**
   * Mount Institutional Hero Banner onto a target container
   * @param {string|HTMLElement} target - Container element or CSS selector
   * @param {Object} options - Custom configuration overrides (page_title, page_subtitle, etc.)
   */
  function mountDeptHero(target, options = {}) {
    ensureStyles();

    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) return null;

    const cached = getCachedSettings() || {};
    const pageTitle = options.title || options.page_title || container.getAttribute('data-title') || DEFAULTS.page_title;
    const pageSubtitle = options.subtitle || options.page_subtitle || container.getAttribute('data-subtitle') || DEFAULTS.page_subtitle;

    const config = {
      institution_name: options.institution_name || cached.institution_name || DEFAULTS.institution_name,
      institution_tagline: options.institution_tagline || cached.institution_tagline || DEFAULTS.institution_tagline,
      institution_logo_url: options.institution_logo_url || cached.institution_logo_url || DEFAULTS.institution_logo_url,
      institution_banner_url: options.institution_banner_url || cached.institution_banner_url || DEFAULTS.institution_banner_url,
      page_title: pageTitle,
      page_subtitle: pageSubtitle
    };

    container.innerHTML = renderTemplate(config);

    // Refresh async from API in background
    fetchInstitutionBranding();

    return container;
  }

  function setDepartmentName(name) {
    if (!name) return;
    document.querySelectorAll('#portal-dept-name, #dept-hero-dept-name').forEach(el => {
      el.textContent = name;
    });
  }

  function autoInit() {
    ensureStyles();
    const targets = document.querySelectorAll(
      '#dept-hero-container, dept-hero, [data-component="dept-hero"], .dept-hero-mount'
    );
    targets.forEach(el => mountDeptHero(el));
  }

  // Listen for admin settings updates
  if (typeof window !== 'undefined') {
    window.addEventListener('institution-settings-updated', (e) => {
      if (e.detail) applyBrandingToDOM(e.detail);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  // Export to window
  root.mountDeptHero = mountDeptHero;
  root.setDepartmentName = setDepartmentName;
  root.fetchInstitutionBranding = fetchInstitutionBranding;

})(typeof window !== 'undefined' ? window : this);
