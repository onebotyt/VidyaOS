/**
 * VidyaOS StatCard Component
 * Location: /components/stat-card.js
 *
 * Renders executive KPI summary cards with icons, badges, and trends.
 */

(function (window) {
  'use strict';

  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Render a Stat Card HTML string
   * @param {Object} opts
   * @param {string} opts.title - Metric title
   * @param {string|number} opts.value - Metric value
   * @param {string} [opts.subtext] - Subtitle or explanation
   * @param {string} [opts.badge] - Badge text (e.g., 'ONLINE', 'HEADCOUNT')
   * @param {string} [opts.badgeType] - 'success' | 'warning' | 'primary' | 'muted'
   * @param {string} [opts.icon] - SVG icon markup
   * @param {string} [opts.color] - Status color token
   */
  function renderStatCard(opts) {
    const badgeColorMap = {
      success: 'background:var(--status-present-bg);color:var(--status-present);',
      warning: 'background:var(--status-late-bg);color:var(--status-late);',
      danger: 'background:var(--status-absent-bg);color:var(--status-absent);',
      primary: 'background:var(--color-primary-light);color:var(--color-primary);',
      muted: 'background:var(--bg-surface);color:var(--text-muted);'
    };

    const badgeStyle = badgeColorMap[opts.badgeType || 'primary'] || badgeColorMap.primary;
    const badgeHtml = opts.badge
      ? `<span class="badge" style="font-size:0.7rem;font-weight:700;${badgeStyle}">${esc(opts.badge)}</span>`
      : '';

    const iconHtml = opts.icon
      ? `<div style="width:38px;height:38px;border-radius:var(--radius-md);background:var(--bg-surface);display:flex;align-items:center;justify-content:center;color:var(--color-primary);flex-shrink:0;">${opts.icon}</div>`
      : '';

    return `
      <article class="card stat-card" style="padding:1.25rem 1.35rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;">
          <div>
            <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-muted);margin-bottom:0.25rem;">
              ${esc(opts.title)}
            </div>
            ${badgeHtml}
          </div>
          ${iconHtml}
        </div>
        <div>
          <div class="stat-value" style="font-size:1.85rem;font-weight:800;color:var(--text-main);line-height:1.1;letter-spacing:-0.03em;">
            ${esc(opts.value !== undefined ? opts.value : '—')}
          </div>
          ${opts.subtext ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.4rem;">${esc(opts.subtext)}</div>` : ''}
        </div>
      </article>
    `;
  }

  /**
   * Render a responsive Grid of Stat Cards into a container
   * @param {HTMLElement|string} container
   * @param {Array<Object>} cards
   * @param {number} [columns=4]
   */
  function renderStatGrid(container, cards = [], columns = 4) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return;

    el.className = el.className || 'stats-grid';
    el.style.display = 'grid';
    el.style.gridTemplateColumns = `repeat(auto-fit, minmax(220px, 1fr))`;
    el.style.gap = '1rem';
    el.style.marginBottom = '1.5rem';

    el.innerHTML = cards.map(c => renderStatCard(c)).join('');
  }

  window.renderStatCard = renderStatCard;
  window.renderStatGrid = renderStatGrid;
  window.StatCard = renderStatCard;

})(typeof window !== 'undefined' ? window : this);
