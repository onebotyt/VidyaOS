/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS ADMIN REUSABLE COMPONENT: DEPT BREAKDOWN (dept-breakdown.js)
 * Location: /frontend/admin/components/dept-breakdown/dept-breakdown.js
 * 
 * Modular engine to render the interactive vertical bar chart
 * of department-level attendance and campus average.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /** @type {any} */
  const win = typeof window !== 'undefined' ? window : {};

  function renderHtml() {
    return `
      <article class="panel-dept-breakdown" aria-label="Department Breakdown">
        <div class="dept-breakdown-header">
          <div class="dept-breakdown-title-group">
            <svg class="dept-breakdown-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            <h3 class="dept-breakdown-title-text">Department Breakdown</h3>
          </div>
          <span class="dept-avg-pill-badge" id="campus-avg-badge">Avg: 0%</span>
        </div>

        <div class="dept-bars-flex-container" id="dept-bars-flex-container">
          <!-- Rendered dynamically -->
          <div style="text-align:center;width:100%;color:var(--text-muted);font-size:0.75rem;padding:1rem 0;">
            Loading departments...
          </div>
        </div>
      </article>
    `;
  }

  function update(depts = [], avgPct = 0) {
    const avgBadge = document.getElementById('campus-avg-badge');
    const container = document.getElementById('dept-bars-flex-container');

    if (avgBadge) {
      avgBadge.textContent = `Avg: ${Math.round(avgPct)}%`;
    }

    if (!container) return;

    if (!depts || depts.length === 0) {
      // Default 6 standard institutional departments if none returned
      depts = [
        { code: 'IT', attendance_pct: 0 },
        { code: 'ECE', attendance_pct: 0 },
        { code: 'EE', attendance_pct: 0 },
        { code: 'ME', attendance_pct: 0 },
        { code: 'CE', attendance_pct: 0 },
        { code: 'PHARM', attendance_pct: 0 }
      ];
    }

    container.innerHTML = depts.map(dept => {
      const pct = Math.round(dept.attendance_pct || 0);
      const height = Math.max(0, Math.min(pct, 100));

      return `
        <div class="dept-bar-column-item" title="${dept.name || dept.code}: ${pct}% attendance">
          <span class="dept-column-pct">${pct}%</span>
          <div class="dept-column-track">
            <div class="dept-column-fill" style="height: ${height}%;"></div>
          </div>
          <span class="dept-column-code">${dept.code || '--'}</span>
        </div>
      `;
    }).join('');
  }

  function mount(target, depts = [], avgPct = 0) {
    const el = (typeof target === 'string') ? document.querySelector(target) : target;
    if (!el) return;
    el.innerHTML = renderHtml();
    update(depts, avgPct);
  }

  win.AdminDeptBreakdown = {
    mount,
    update,
    renderHtml
  };
})();

