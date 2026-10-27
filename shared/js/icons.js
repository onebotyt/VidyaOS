/**
 * ════════════════════════════════════════════════════════════════
 * VIDYAOS UNIVERSAL SVG ICON REGISTRY
 * frontend/shared/js/icons.js (Accessible as /js/icons.js and /shared/js/icons.js)
 * ════════════════════════════════════════════════════════════════
 * Clean, lightweight, professional SVG icon repository.
 * Zero raw emojis. Zero bloated HTML inline SVGs.
 *
 * Usage in HTML:
 *   <span data-icon="check"></span>
 *   <button data-icon="close" title="Close"></button>
 *   <span data-icon="calendar" data-icon-size="16"></span>
 *
 * Usage in JavaScript:
 *   const svgHtml = window.getSvgIcon('check', 18);
 *   window.renderSvgIcons(containerElement);
 */

(function () {
  'use strict';

  // Base SVG wrapper generator
  function svg(pathContent, size = 18, className = '', viewBox = '0 0 24 24', strokeWidth = 2) {
    const cls = className ? ` class="vidya-svg-icon ${className}"` : ' class="vidya-svg-icon"';
    return `<svg width="${size}" height="${size}" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${cls} aria-hidden="true">${pathContent}</svg>`;
  }

  const VIDYA_ICONS = {
    // Navigation & Layout
    dashboard: (s=18, c='') => svg('<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>', s, c),
    academic: (s=18, c='') => svg('<path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/>', s, c),
    home: (s=18, c='') => svg('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>', s, c),
    apps: (s=18, c='') => svg('<circle cx="4" cy="4" r="1.5"/><circle cx="12" cy="4" r="1.5"/><circle cx="20" cy="4" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="20" cy="12" r="1.5"/><circle cx="4" cy="20" r="1.5"/><circle cx="12" cy="20" r="1.5"/><circle cx="20" cy="20" r="1.5"/>', s, c),
    menu: (s=18, c='') => svg('<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>', s, c),
    settings: (s=18, c='') => svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>', s, c),
    logout: (s=18, c='') => svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>', s, c),
    bell: (s=18, c='') => svg('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>', s, c),
    moon: (s=18, c='') => svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>', s, c),
    sun: (s=18, c='') => svg('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>', s, c),
    chevronDown: (s=14, c='') => svg('<polyline points="6 9 12 15 18 9"/>', s, c, '0 0 24 24', 2.2),
    chevronUp: (s=14, c='') => svg('<polyline points="18 15 12 9 6 15"/>', s, c, '0 0 24 24', 2.2),
    chevronLeft: (s=14, c='') => svg('<polyline points="15 18 9 12 15 6"/>', s, c, '0 0 24 24', 2.2),
    chevronRight: (s=14, c='') => svg('<polyline points="9 18 15 12 9 6"/>', s, c, '0 0 24 24', 2.2),
    arrowRight: (s=14, c='') => svg('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>', s, c, '0 0 24 24', 2.2),

    // Common Actions & Form Controls
    close: (s=16, c='') => svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', s, c, '0 0 24 24', 2.2),
    check: (s=16, c='') => svg('<polyline points="20 6 9 17 4 12"/>', s, c, '0 0 24 24', 2.4),
    checkCircle: (s=18, c='') => svg('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>', s, c),
    alert: (s=16, c='') => svg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', s, c),
    plus: (s=16, c='') => svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', s, c, '0 0 24 24', 2.4),
    edit: (s=16, c='') => svg('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>', s, c),
    trash: (s=16, c='') => svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>', s, c),
    search: (s=16, c='') => svg('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>', s, c),
    refresh: (s=16, c='') => svg('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>', s, c),
    save: (s=16, c='') => svg('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>', s, c),
    upload: (s=16, c='') => svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>', s, c, '0 0 24 24', 2.2),
    download: (s=16, c='') => svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>', s, c),
    copy: (s=16, c='') => svg('<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>', s, c),
    scan: (s=16, c='') => svg('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>', s, c, '0 0 24 24', 2.2),
    printer: (s=16, c='') => svg('<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>', s, c),
    eye: (s=16, c='') => svg('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', s, c),
    eyeOff: (s=16, c='') => svg('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>', s, c),

    // Academic & Classroom
    assignment: (s=18, c='') => svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>', s, c, '0 0 24 24', 2.2),
    test: (s=18, c='') => svg('<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/>', s, c, '0 0 24 24', 2.2),
    lab: (s=18, c='') => svg('<path d="M10 2v7.31L4.17 19.14A2 2 0 0 0 5.86 22h12.28a2 2 0 0 0 1.69-2.86L14 9.31V2"/><line x1="8.5" y1="2" x2="15.5" y2="2"/><line x1="6.5" y1="15" x2="17.5" y2="15"/>', s, c, '0 0 24 24', 2.2),
    practical: (s=18, c='') => svg('<path d="M10 2v7.31L4.17 19.14A2 2 0 0 0 5.86 22h12.28a2 2 0 0 0 1.69-2.86L14 9.31V2"/><line x1="8.5" y1="2" x2="15.5" y2="2"/><line x1="6.5" y1="15" x2="17.5" y2="15"/>', s, c, '0 0 24 24', 2.2),
    finaldocs: (s=18, c='') => svg('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>', s, c),
    folder: (s=18, c='') => svg('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>', s, c),
    book: (s=18, c='') => svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>', s, c),
    unit: (s=18, c='') => svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>', s, c, '0 0 24 24', 2.2),
    gradCap: (s=18, c='') => svg('<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>', s, c),
    hod: (s=18, c='') => svg('<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>', s, c),
    user: (s=18, c='') => svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', s, c),
    users: (s=18, c='') => svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', s, c),
    students: (s=18, c='') => svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', s, c),
    stream: (s=18, c='') => svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', s, c),
    devices: (s=18, c='') => svg('<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>', s, c),
    table: (s=18, c='') => svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>', s, c),
    reports: (s=18, c='') => svg('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>', s, c),
    archive: (s=18, c='') => svg('<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>', s, c),

    // Date, Time & Status
    calendar: (s=16, c='') => svg('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>', s, c, '0 0 24 24', 2.2),
    clock: (s=16, c='') => svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', s, c, '0 0 24 24', 2.2),
    zap: (s=16, c='') => svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>', s, c),
    sparkle: (s=16, c='') => svg('<path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>', s, c, '0 0 24 24', 2.2),
    star: (s=16, c='') => svg('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>', s, c),
    target: (s=16, c='') => svg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>', s, c),
    scale: (s=16, c='') => svg('<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>', s, c),

    // Media & Communication
    document: (s=16, c='') => svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>', s, c, '0 0 24 24', 2.2),
    filePdf: (s=16, c='') => svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>', s, c, '0 0 24 24', 2.2),
    image: (s=16, c='') => svg('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>', s, c),
    video: (s=16, c='') => svg('<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>', s, c),
    megaphone: (s=16, c='') => svg('<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>', s, c),
    paperclip: (s=16, c='') => svg('<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>', s, c),
    comment: (s=16, c='') => svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', s, c),
    list: (s=14, c='') => svg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>', s, c, '0 0 24 24', 2.2),
    template: (s=13, c='') => svg('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>', s, c),
    trendingUp: (s=18, c='') => svg('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>', s, c),
    trendingDown: (s=18, c='') => svg('<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>', s, c)
  };

  // Canonical Emoji to SVG Key Mapping (Allows seamless legacy lookup)
  const EMOJI_MAP = {
    '\u2713': 'check',
    '\u2705': 'checkCircle',
    '\u2715': 'close',
    '\u2794': 'arrowRight',
    '\u2192': 'arrowRight',
    '\u26A0\uFE0F': 'alert',
    '\u26A0': 'alert',
    '\u26A1': 'zap',
    '\u270F\uFE0F': 'edit',
    '\u270F': 'edit',
    '\u23F0': 'clock',
    '\u23F1\uFE0F': 'clock',
    '\u23F3': 'clock',
    '\u231B': 'clock',
    '\u2B50': 'star',
    '\u2728': 'sparkle',
    '\uD83C\uDF89': 'star',
    '\uD83D\uDCC5': 'calendar',
    '\uD83D\uDDD3\uFE0F': 'calendar',
    '\uD83D\uDDD3': 'calendar',
    '\uD83D\uDCDA': 'book',
    '\uD83D\uDCD6': 'book',
    '\uD83D\uDCDD': 'assignment',
    '\uD83D\uDCCB': 'assignment',
    '\uD83D\uDCC4': 'document',
    '\uD83D\uDCC1': 'folder',
    '\uD83C\uDF93': 'gradCap',
    '\uD83D\uDC64': 'user',
    '\uD83D\uDC65': 'users',
    '\uD83D\uDCE4': 'upload',
    '\uD83D\uDCE5': 'download',
    '\uD83D\uDCF1': 'devices',
    '\uD83D\uDCE2': 'megaphone',
    '\uD83D\uDCAC': 'comment',
    '\uD83D\uDCCE': 'paperclip',
    '\uD83C\uDFAF': 'target',
    '\uD83C\uDFA5': 'video',
    '\uD83D\uDDBC\uFE0F': 'image',
    '\uD83D\uDDBC': 'image',
    '\uD83D\uDD0E': 'search',
    '\uD83D\uDD0D': 'search',
    '\u2795': 'plus',
    '\uD83D\uDDD1\uFE0F': 'trash',
    '\uD83D\uDDD1': 'trash',
    '\u2699\uFE0F': 'settings',
    '\uD83C\uDFEB': 'home',
    '\uD83C\uDFE0': 'home',
    '\uD83D\uDCCA': 'reports'
  };

  /**
   * Retrieves an SVG icon string by canonical name or legacy key
   * @param {string} name - e.g. 'check', 'calendar', or icon key
   * @param {number} [size=18] - width and height in px
   * @param {string} [className=''] - optional CSS classes
   * @returns {string} - Complete <svg> markup
   */
  function getSvgIcon(name, size = 18, className = '') {
    if (!name) return '';
    if (typeof name === 'string' && name.trim().startsWith('<svg')) return name;

    const key = EMOJI_MAP[name] || name;
    const fn = VIDYA_ICONS[key];
    if (typeof fn === 'function') {
      return fn(size, className);
    }
    // Fallback if not found
    return VIDYA_ICONS.assignment ? VIDYA_ICONS.assignment(size, className) : '';
  }

  /**
   * Scans a DOM node (defaults to document) and replaces all [data-icon]
   * elements with their registered SVGs.
   * @param {HTMLElement|Document} [root=document]
   */
  function renderSvgIcons(root) {
    const scope = root || document;
    if (!scope || !scope.querySelectorAll) return;

    scope.querySelectorAll('[data-icon]').forEach(el => {
      const iconKey = el.getAttribute('data-icon');
      const sizeAttr = el.getAttribute('data-icon-size');
      const size = sizeAttr ? parseInt(sizeAttr, 10) : 16;
      const svgMarkup = getSvgIcon(iconKey, size);
      if (svgMarkup) {
        el.innerHTML = svgMarkup;
      }
    });
  }

  // Export to window global scope
  window.VIDYA_ICONS = VIDYA_ICONS;
  window.SVG_ICONS = VIDYA_ICONS;
  window.getSvgIcon = getSvgIcon;
  window.renderSvgIcons = renderSvgIcons;

  // Auto-render icons when document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => renderSvgIcons(document));
  } else {
    renderSvgIcons(document);
  }

})();
