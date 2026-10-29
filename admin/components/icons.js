/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS ADMIN SVG ICON SYSTEM (icons.js)
 * Location: /frontend/admin/components/icons.js
 *
 * Dedicated, self-contained SVG icon registry for the Admin Portal.
 * 100% Theme Tokenized — Uses currentColor and CSS Variables.
 * Ultra-clean, crisp, modern vectors with subtle 3D depth and zero visual clutter.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /**
   * Pure SVG icon paths & clean modern vector builders
   */
  const ICONS = {
    // 1. VidyaOS Crisp 3D Isometric Cube Logo
    cube: (w = 32, h = 32, stroke = 2, cls = 'rail-cube-logo') => `
      <svg class="${cls || 'rail-cube-logo'}" width="${w}" height="${h}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Top Face (Highlight) -->
        <path d="M16 3.5L27.5 9.8L16 16.2L4.5 9.8L16 3.5Z" fill="var(--color-primary-light, hsl(215 90% 95%))" stroke="var(--color-primary)" stroke-width="1.2" stroke-linejoin="round"/>
        <!-- Left Face (Midtone Primary) -->
        <path d="M4.5 9.8L16 16.2V28.5L4.5 22.2V9.8Z" fill="var(--color-primary, hsl(217 91% 60%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/>
        <!-- Right Face (Deep Primary) -->
        <path d="M16 16.2L27.5 9.8V22.2L16 28.5V16.2Z" fill="var(--color-primary-hover, hsl(224 76% 48%))" stroke="var(--color-primary-hover)" stroke-width="1.2" stroke-linejoin="round"/>
        <!-- Subtle Specular Highlights -->
        <path d="M16 16.5V27.5" stroke="hsl(0 0% 100% / 0.4)" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M16.5 16L26.5 10.5" stroke="hsl(0 0% 100% / 0.3)" stroke-width="1.2" stroke-linecap="round"/>
      </svg>`.trim(),

    // 2. Navigation & Header Controls
    menu: (w = 20, h = 20, stroke = 2.2, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>`.trim(),

    chevronLeft: (w = 14, h = 14, stroke = 2.5, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>`.trim(),

    chevronRight: (w = 14, h = 14, stroke = 2.5, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>`.trim(),

    close: (w = 18, h = 18, stroke = 2.2, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`.trim(),

    bell: (w = 18, h = 18, stroke = 2, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>`.trim(),

    // 3. Crisp Modern Clean Navigation Icons
    // 3A. Dashboard: Clean Modern Grid with 3D Primary Deck
    dashboard: (w = 20, h = 20, stroke = 1.8, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.25"/>
        <rect x="13.5" y="3" width="7.5" height="4.5" rx="1.5" fill="currentColor" fill-opacity="0.12"/>
        <rect x="13.5" y="10.5" width="7.5" height="10.5" rx="1.5" fill="currentColor" fill-opacity="0.25"/>
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.12"/>
      </svg>`.trim(),

    // 3B. Academic Structure: Clean Layered Curriculum Architecture
    academicStructure: (w = 20, h = 20, stroke = 1.8, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <!-- Top Tier -->
        <polygon points="12 3 21 7.5 12 12 3 7.5" fill="currentColor" fill-opacity="0.25"/>
        <!-- Mid Tier -->
        <path d="M4 11.5L12 16L20 11.5" fill="none"/>
        <path d="M4 11.5V13.5L12 18L20 13.5V11.5" fill="currentColor" fill-opacity="0.15"/>
        <!-- Bottom Tier -->
        <path d="M4 16L12 20.5L20 16" fill="none"/>
      </svg>`.trim(),

    // 3C. HOD Management: Crisp Executive Shield & Portrait
    hodManagement: (w = 20, h = 20, stroke = 1.8, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 2.5L19.5 5.5V11C19.5 16 16 19.8 12 21.5C8 19.8 4.5 16 4.5 11V5.5L12 2.5Z" fill="currentColor" fill-opacity="0.15"/>
        <circle cx="12" cy="9" r="2.5" fill="currentColor" fill-opacity="0.5"/>
        <path d="M8.5 15.5C8.5 13.5 10 12.2 12 12.2C14 12.2 15.5 13.5 15.5 15.5" stroke="currentColor" stroke-width="${stroke}"/>
      </svg>`.trim(),

    // 3D. Reports & Analytics: Crisp Ascending Telemetry Bars with Trend Arrow
    reports: (w = 20, h = 20, stroke = 1.8, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="4" y="14" width="3.5" height="7" rx="1" fill="currentColor" fill-opacity="0.25"/>
        <rect x="10.25" y="9.5" width="3.5" height="11.5" rx="1" fill="currentColor" fill-opacity="0.35"/>
        <rect x="16.5" y="5" width="3.5" height="16" rx="1" fill="currentColor" fill-opacity="0.45"/>
        <polyline points="4 9 10 4 19.5 4" stroke="currentColor" stroke-width="2"/>
        <polyline points="16 2 20 4 16 6" stroke="currentColor" stroke-width="2"/>
      </svg>`.trim(),

    // 3E. System Settings: Precision 6-Tooth Mechanical Gear
    settings: (w = 20, h = 20, stroke = 1.8, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" fill="currentColor" fill-opacity="0.25"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>`.trim(),

    // 3F. Audit Logs: Cryptographic Security Ledger
    audit: (w = 20, h = 20, stroke = 1.8, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fill-opacity="0.15"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="14" y2="17"/>
        <circle cx="9" cy="9" r="1" fill="currentColor"/>
      </svg>`.trim(),

    // 4. Session & Identity Icons
    user: (w = 20, h = 20, stroke = 1.8, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="currentColor" fill-opacity="0.15"/>
        <circle cx="12" cy="7" r="4" fill="currentColor" fill-opacity="0.25"/>
      </svg>`.trim(),

    logout: (w = 20, h = 20, stroke = 1.8, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>`.trim(),

    institution: (w = 24, h = 24, stroke = 2, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"></path>
      </svg>`.trim(),

    arrowRight: (w = 14, h = 14, stroke = 2.2, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>`.trim(),

    // 5. Profile & Linking Icons
    camera: (w = 16, h = 16, stroke = 2, cls = '') => `
      <svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>`.trim(),

    google: (w = 18, h = 18) => `
      <svg width="${w}" height="${h}" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>`.trim(),

    shield: (w = 14, h = 14, stroke = 2) => `
      <svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>`.trim(),

    crown: (w = 14, h = 14, stroke = 2) => `
      <svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
        <circle cx="12" cy="19" r="1"/>
      </svg>`.trim(),

    mail: (w = 14, h = 14, stroke = 2) => `
      <svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>`.trim()
  };

  /**
   * Helper to retrieve SVG icon string by name
   */
  function getIcon(name, options = {}) {
    const { width = 20, height = 20, stroke = 1.8, className = '' } = options;
    if (typeof ICONS[name] === 'function') {
      return ICONS[name](width, height, stroke, className);
    }
    return '';
  }

  // Export to window
  window.AdminIcons = {
    get: getIcon,
    raw: ICONS
  };
  window.getAdminIcon = getIcon;
})();
