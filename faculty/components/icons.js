/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY CENTRALIZED SVG ICON SYSTEM (icons.js)
 * Location: /faculty/components/icons.js
 * 
 * Single Source of Truth for Faculty SVG Icons.
 * 100% Theme Tokenized — Uses currentColor and CSS Variables.
 * Zero Inline SVG Duplication: Pages consume icons by reference name!
 * 
 * Usage in HTML:
 *   <span data-faculty-icon="registers" data-size="20"></span>
 *   <span data-faculty-icon="calendar" data-size="16" class="text-muted"></span>
 * 
 * Usage in JavaScript:
 *   const svgHtml = FacultyIcons.get('dashboard', { size: 20 });
 *   const svgNode = FacultyIcons.create('classes', { size: 18, className: 'icon-primary' });
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  function resolveSize(opts, def = 20) {
    const s = opts.size || opts.s || def;
    const w = opts.width || opts.w || s;
    const h = opts.height || opts.h || s;
    const stroke = opts.stroke || opts.strokeWidth || 1.8;
    const cls = opts.className || opts.cls || '';
    return { w, h, stroke, cls };
  }

  /**
   * Comprehensive SVG Vector Registry
   */
  const ICONS = {
    // ══════════════════════════════════════════════
    // 1. BRANDING & SYSTEM IDENTITY
    // ══════════════════════════════════════════════
    brand: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 22);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>`;
    },

    cube: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 32);
      return `<svg class="${cls || 'faculty-cube-logo'}" width="${w}" height="${h}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M16 3.5L27.5 9.8L16 16.2L4.5 9.8L16 3.5Z" fill="var(--color-primary-light, hsl(215 90% 95%))" stroke="var(--color-primary)" stroke-width="${stroke}" stroke-linejoin="round"/><path d="M4.5 9.8L16 16.2V28.5L4.5 22.2V9.8Z" fill="var(--color-primary, hsl(217 91% 60%))" stroke="var(--color-primary-hover)" stroke-width="${stroke}" stroke-linejoin="round"/><path d="M16 16.2L27.5 9.8V22.2L16 28.5V16.2Z" fill="var(--color-primary-hover, hsl(224 76% 48%))" stroke="var(--color-primary-hover)" stroke-width="${stroke}" stroke-linejoin="round"/><path d="M16 16.5V27.5" stroke="hsl(0 0% 100% / 0.4)" stroke-width="${stroke}" stroke-linecap="round"/><path d="M16.5 16L26.5 10.5" stroke="hsl(0 0% 100% / 0.3)" stroke-width="${stroke}" stroke-linecap="round"/></svg>`;
    },

    institution: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 18);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"></path></svg>`;
    },

    // ══════════════════════════════════════════════
    // 2. NAVIGATION & APP SHELL CONTROLS
    // ══════════════════════════════════════════════
    menu: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    },

    close: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 18);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    },

    appsGrid: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 18);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></svg>`;
    },

    theme: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 18);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    },

    bell: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 18);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
    },

    chevronLeft: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
    },

    chevronRight: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
    },

    chevronDown: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    },

    chevronUp: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
    },

    arrowRight: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
    },

    arrowLeft: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`;
    },

    arrowUpDown: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="7 15 12 20 17 15"></polyline><polyline points="7 9 12 4 17 9"></polyline></svg>`;
    },

    // ══════════════════════════════════════════════
    // 3. ACADEMIC & FACULTY DOMAIN MODULES
    // ══════════════════════════════════════════════
    dashboard: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.25"/><rect x="13.5" y="3" width="7.5" height="4.5" rx="1.5" fill="currentColor" fill-opacity="0.12"/><rect x="13.5" y="10.5" width="7.5" height="10.5" rx="1.5" fill="currentColor" fill-opacity="0.25"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" fill="currentColor" fill-opacity="0.12"/></svg>`;
    },

    classes: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" fill-opacity="0.25"></rect><rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" fill-opacity="0.12"></rect><rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" fill-opacity="0.25"></rect><rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" fill-opacity="0.12"></rect></svg>`;
    },

    registers: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" fill="currentColor" fill-opacity="0.12"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="currentColor" fill-opacity="0.25"></path><line x1="8" y1="7" x2="16" y2="7"></line><line x1="8" y1="11" x2="16" y2="11"></line></svg>`;
    },

    coursework: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" fill="currentColor" fill-opacity="0.12"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`;
    },

    marks: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`;
    },

    evaluation: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="currentColor" fill-opacity="0.12"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>`;
    },

    sheets: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="currentColor" fill-opacity="0.15"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>`;
    },

    reports: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="14" width="3.5" height="7" rx="1" fill="currentColor" fill-opacity="0.25"/><rect x="10.25" y="9.5" width="3.5" height="11.5" rx="1" fill="currentColor" fill-opacity="0.35"/><rect x="16.5" y="5" width="3.5" height="16" rx="1" fill="currentColor" fill-opacity="0.45"/><polyline points="4 9 10 4 19.5 4" stroke="currentColor" stroke-width="${stroke}"/><polyline points="16 2 20 4 16 6" stroke="currentColor" stroke-width="${stroke}"/></svg>`;
    },

    students: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="currentColor" fill-opacity="0.15"></path><circle cx="9" cy="7" r="4" fill="currentColor" fill-opacity="0.25"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
    },

    timetable: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="currentColor" fill-opacity="0.12"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
    },

    leaves: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fill-opacity="0.12"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
    },

    drive: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="currentColor" fill-opacity="0.12"></path></svg>`;
    },

    hodHub: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z" fill="currentColor" fill-opacity="0.12"></path></svg>`;
    },

    espDevices: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="2" fill="currentColor"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>`;
    },

    archive: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;
    },

    // ══════════════════════════════════════════════
    // 4. ACTION & MODAL UTILITIES
    // ══════════════════════════════════════════════
    plus: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    },

    edit: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    },

    trash: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
    },

    search: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
    },

    filter: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`;
    },

    download: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
    },

    upload: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`;
    },

    check: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    },

    refresh: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`;
    },

    copy: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    },

    link: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
    },

    externalLink: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
    },

    lock: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
    },

    key: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L10 10l1.5 1.5L10 13l-1.5-1.5L7 13l1.5 1.5L5 18H2v4h4v-2h2v-2h2l4.5-4.5"></path><circle cx="16.5" cy="7.5" r="2.5"></circle></svg>`;
    },

    calendar: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
    },

    clock: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    },

    // ══════════════════════════════════════════════
    // 5. FILES, DOCUMENTS & MEDIA
    // ══════════════════════════════════════════════
    file: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
    },

    fileText: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
    },

    folder: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
    },

    paperclip: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`;
    },

    formatXlsx: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 24);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="hsl(142 71% 45% / 0.12)"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 13l3 4m0-4l-3 4m5-4h3m-3 2h2m-2 2h3" stroke="hsl(142 71% 45%)"></path></svg>`;
    },

    formatPdf: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 24);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="hsl(0 84% 60% / 0.12)"></path><polyline points="14 2 14 8 20 8"></polyline><text x="7" y="17" font-size="7" font-weight="bold" fill="hsl(0 84% 60%)" stroke="none">PDF</text></svg>`;
    },

    formatDoc: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 24);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="hsl(217 91% 60% / 0.12)"></path><polyline points="14 2 14 8 20 8"></polyline><text x="7" y="17" font-size="7" font-weight="bold" fill="hsl(217 91% 60%)" stroke="none">DOC</text></svg>`;
    },

    // ══════════════════════════════════════════════
    // 6. COMMUNICATION & MESSAGING
    // ══════════════════════════════════════════════
    send: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
    },

    message: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
    },

    mail: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`;
    },

    email: (opts = {}) => ICONS.mail(opts),

    phone: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;
    },

    'file-text': (opts = {}) => ICONS.fileText(opts),

    // ══════════════════════════════════════════════
    // 7. STATUS, FEEDBACK & INFORMATION
    // ══════════════════════════════════════════════
    info: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    },

    help: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    },

    alert: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    },

    checkCircle: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    },

    xCircle: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    },

    award: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 18);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`;
    },

    eye: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    },

    eyeOff: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
    },

    moreVertical: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>`;
    },

    moreHorizontal: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 16);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1.5"></circle><circle cx="19" cy="12" r="1.5"></circle><circle cx="5" cy="12" r="1.5"></circle></svg>`;
    },

    user: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 18);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="currentColor" fill-opacity="0.12"></path><circle cx="12" cy="7" r="4" fill="currentColor" fill-opacity="0.25"></circle></svg>`;
    },

    logout: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 18);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`;
    },

    home: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    },

    dashboard: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 20);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5"></rect><rect x="14" y="3" width="7" height="5" rx="1.5"></rect><rect x="14" y="12" width="7" height="9" rx="1.5"></rect><rect x="3" y="16" width="7" height="5" rx="1.5"></rect></svg>`;
    },

    settings: (opts = {}) => {
      const { w, h, stroke, cls } = resolveSize(opts, 18);
      return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
    }
  };

  /**
   * Helper to retrieve SVG icon string by name
   */
  function getFacultyIcon(name, options = {}) {
    if (typeof options === 'number') {
      options = { size: options };
    }
    if (typeof ICONS[name] === 'function') {
      return ICONS[name](options);
    }
    console.warn(`[FacultyIcons]: Icon "${name}" not found.`);
    return '';
  }

  /**
   * Helper to create SVG DOM node directly
   */
  function createFacultyIcon(name, options = {}) {
    const html = getFacultyIcon(name, options);
    if (!html) return null;
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  /**
   * Auto-hydrates any elements with [data-faculty-icon] or [data-icon]
   */
  function renderFacultyIcons(root = document) {
    if (!root || !root.querySelectorAll) return;
    const elements = root.querySelectorAll('[data-faculty-icon], [data-icon]');
    elements.forEach(el => {
      const iconName = el.getAttribute('data-faculty-icon') || el.getAttribute('data-icon');
      if (iconName && typeof ICONS[iconName] === 'function') {
        const size = parseInt(el.getAttribute('data-size') || el.getAttribute('width') || '20', 10);
        const stroke = parseFloat(el.getAttribute('data-stroke') || '1.8');
        const className = el.getAttribute('data-class') || '';
        el.innerHTML = getFacultyIcon(iconName, { size, stroke, className });
      }
    });
  }

  // Auto-run on DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => renderFacultyIcons());
    } else {
      renderFacultyIcons();
    }
  }

  // Export to window
  const FacultyIcons = {
    get: getFacultyIcon,
    svg: getFacultyIcon,
    create: createFacultyIcon,
    render: renderFacultyIcons,
    raw: ICONS,
    list: () => Object.keys(ICONS)
  };

  window.FacultyIcons = FacultyIcons;
  window.FACULTY_ICONS = ICONS;
  window.getFacultyIcon = getFacultyIcon;
  window.renderFacultyIcons = renderFacultyIcons;
})();
