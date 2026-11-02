/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS ADMIN REUSABLE COMPONENT: PAGE HEADER (page-header.js)
 * Location: /frontend/admin/components/page-header/page-header.js
 * 
 * Reusable Page Header with squircle icon, title, subtitle,
 * optional compliance pill, and action buttons slot.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /** @type {any} */
  const win = typeof window !== 'undefined' ? window : {};

  /**
   * Render Page Header
   * @param {Object} options
   * @param {string} options.title - Page Title
   * @param {string} options.subtitle - Page Subtitle
   * @param {string} [options.icon] - SVG icon markup or icon name
   * @param {string} [options.iconColor] - 'blue' | 'green' | 'purple' | 'amber' | 'slate'
   * @param {string} [options.compliancePill] - e.g. 'SECTION 54 COMPLIANT | Immutable System Audit Trail'
   * @param {string} [options.actionsHtml] - Action buttons HTML
   * @returns {string} HTML string
   */
  function render(options = {}) {
    const {
      title = '',
      subtitle = '',
      icon = '',
      iconColor = 'blue',
      compliancePill = '',
      actionsHtml = ''
    } = options;

    const complianceMarkup = compliancePill
      ? `<div class="admin-header-compliance-pill">${compliancePill}</div>`
      : '';

    const actionsMarkup = actionsHtml
      ? `<div class="admin-header-actions-row">${actionsHtml}</div>`
      : '';

    return `
      <section class="admin-page-header" aria-label="${title}">
        ${complianceMarkup}
        <div class="admin-header-main-row">
          <div class="admin-header-squircle-icon icon-${iconColor}" aria-hidden="true">
            ${icon}
          </div>
          <div class="admin-header-title-col">
            <h1 class="admin-header-title">${title}</h1>
            <p class="admin-header-subtitle">${subtitle}</p>
          </div>
        </div>
        ${actionsMarkup}
      </section>
    `.trim();
  }

  win.AdminPageHeader = {
    render
  };
})();

