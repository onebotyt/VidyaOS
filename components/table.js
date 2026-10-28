/**
 * VidyaOS Reusable Data Table Component
 * Location: /components/table.js
 *
 * Renders high-density tables that automatically transform into
 * responsive cards on mobile screens (< 768px).
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
   * Render a Data Table into a container
   * @param {Object} opts
   * @param {HTMLElement|string} opts.container - Target DOM container
   * @param {Array<{key: string, label: string, render?: Function, width?: string, align?: string}>} opts.columns
   * @param {Array<Object>} opts.data - Array of row items
   * @param {string} [opts.emptyMessage] - Text when data is empty
   * @param {Array<{label: string, icon?: string, variant?: string, onClick: Function, show?: Function}>} [opts.actions]
   */
  function renderDataTable(opts) {
    const container = typeof opts.container === 'string' ? document.getElementById(opts.container) : opts.container;
    if (!container) return;

    if (!opts.data || opts.data.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:3rem 1.5rem;color:var(--text-muted);background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-lg);">
          <div style="font-size:2rem;margin-bottom:0.5rem;opacity:0.6;">📋</div>
          <div style="font-weight:600;font-size:0.95rem;color:var(--text-main);">${opts.emptyMessage || 'No records found'}</div>
          <div style="font-size:0.8125rem;margin-top:0.25rem;">Try adjusting filters or adding a new record.</div>
        </div>
      `;
      return;
    }

    let html = `
      <div class="table-container">
        <table class="data-table data-table-responsive">
          <thead>
            <tr>
    `;

    opts.columns.forEach((col) => {
      const style = [];
      if (col.width) style.push(`width:${col.width}`);
      if (col.align) style.push(`text-align:${col.align}`);
      html += `<th style="${style.join(';')}">${esc(col.label)}</th>`;
    });

    if (opts.actions && opts.actions.length > 0) {
      html += `<th style="text-align:right;width:160px;">Actions</th>`;
    }

    html += `
            </tr>
          </thead>
          <tbody>
    `;

    opts.data.forEach((row, idx) => {
      html += `<tr>`;
      opts.columns.forEach((col) => {
        let content = '';
        if (typeof col.render === 'function') {
          content = col.render(row[col.key], row, idx);
        } else {
          content = esc(row[col.key] !== undefined ? row[col.key] : '—');
        }

        const align = col.align ? `text-align:${col.align};` : '';
        html += `<td data-label="${esc(col.label)}" style="${align}">${content}</td>`;
      });

      if (opts.actions && opts.actions.length > 0) {
        html += `<td data-label="Actions" style="text-align:right;">`;
        html += `<div style="display:inline-flex;gap:0.4rem;justify-content:flex-end;">`;
        opts.actions.forEach((act, actIdx) => {
          if (typeof act.show === 'function' && !act.show(row, idx)) return;

          const variant = act.variant || 'secondary';
          const iconHtml = act.icon ? `<span style="display:inline-flex;align-items:center;">${act.icon}</span>` : '';
          html += `
            <button type="button" class="btn btn-${variant} btn-sm action-btn-${idx}-${actIdx}" 
              data-row-idx="${idx}" data-act-idx="${actIdx}" title="${esc(act.label)}">
              ${iconHtml}
              ${act.hideLabelOnDesktop ? `<span class="mobile-only-inline">${esc(act.label)}</span>` : `<span>${esc(act.label)}</span>`}
            </button>
          `;
        });
        html += `</div></td>`;
      }

      html += `</tr>`;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;

    // Attach event listeners safely
    if (opts.actions && opts.actions.length > 0) {
      opts.actions.forEach((act, actIdx) => {
        const btns = container.querySelectorAll(`button[data-act-idx="${actIdx}"]`);
        btns.forEach((btn) => {
          btn.addEventListener('click', (e) => {
            const rowIdx = parseInt(btn.getAttribute('data-row-idx'), 10);
            if (!isNaN(rowIdx) && opts.data[rowIdx]) {
              act.onClick(opts.data[rowIdx], rowIdx, e);
            }
          });
        });
      });
    }
  }

  // Export to global scope
  window.renderDataTable = renderDataTable;
  window.DataTable = renderDataTable;

})(typeof window !== 'undefined' ? window : this);
