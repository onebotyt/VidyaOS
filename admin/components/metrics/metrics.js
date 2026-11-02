/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS ADMIN REUSABLE COMPONENT: METRICS GRID (metrics.js)
 * Location: /frontend/admin/components/metrics/metrics.js
 * 
 * Modular engine to render and dynamically update the 4 institutional
 * key performance indicators (Students, Faculty, Departments, Classes).
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /** @type {any} */
  const win = typeof window !== 'undefined' ? window : {};

  function renderMetricsHtml(stats = {}) {
    const students = Number(stats.total_enrolled_students ?? stats.total_students ?? 5).toLocaleString();
    const faculty = Number(stats.total_teachers ?? 5).toLocaleString();
    const depts = Number(stats.total_departments ?? 6).toLocaleString();
    const classes = Number(stats.total_classes ?? stats.active_classes ?? 12).toLocaleString();

    return `
      <section class="admin-metrics-grid" aria-label="Key Performance Indicators">
        <!-- 1. Total Students -->
        <article class="kpi-metric-card" id="metric-card-students">
          <div class="kpi-card-header-row">
            <div class="kpi-squircle-icon icon-blue" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <span class="kpi-card-title">Total Students</span>
          </div>
          <div class="kpi-card-value" id="stat-students">${students}</div>
          <div class="kpi-card-trend"><span>&uarr; 0% vs last month</span></div>
        </article>

        <!-- 2. Total Faculty -->
        <article class="kpi-metric-card" id="metric-card-faculty">
          <div class="kpi-card-header-row">
            <div class="kpi-squircle-icon icon-green" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
              </svg>
            </div>
            <span class="kpi-card-title">Total Faculty</span>
          </div>
          <div class="kpi-card-value" id="stat-teachers">${faculty}</div>
          <div class="kpi-card-trend"><span>&uarr; 0% vs last month</span></div>
        </article>

        <!-- 3. Departments -->
        <article class="kpi-metric-card" id="metric-card-departments">
          <div class="kpi-card-header-row">
            <div class="kpi-squircle-icon icon-purple" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                <line x1="9" y1="22" x2="9" y2="22.01"></line>
                <line x1="15" y1="22" x2="15" y2="22.01"></line>
                <line x1="9" y1="6" x2="9" y2="6.01"></line>
                <line x1="15" y1="6" x2="15" y2="6.01"></line>
                <line x1="9" y1="10" x2="9" y2="10.01"></line>
                <line x1="15" y1="10" x2="15" y2="10.01"></line>
                <line x1="9" y1="14" x2="9" y2="14.01"></line>
                <line x1="15" y1="14" x2="15" y2="14.01"></line>
              </svg>
            </div>
            <span class="kpi-card-title">Departments</span>
          </div>
          <div class="kpi-card-value" id="stat-departments">${depts}</div>
          <div class="kpi-card-trend"><span>&uarr; 0% vs last month</span></div>
        </article>

        <!-- 4. Active Classes -->
        <article class="kpi-metric-card" id="metric-card-classes">
          <div class="kpi-card-header-row">
            <div class="kpi-squircle-icon icon-amber" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <span class="kpi-card-title">Active Classes</span>
          </div>
          <div class="kpi-card-value" id="stat-classes">${classes}</div>
          <div class="kpi-card-trend"><span>&uarr; 0% vs last month</span></div>
        </article>
      </section>
    `;
  }

  function mount(target, stats = {}) {
    const el = (typeof target === 'string') ? document.querySelector(target) : target;
    if (!el) return;
    el.innerHTML = renderMetricsHtml(stats);
  }

  function update(stats = {}) {
    const elStudents = document.getElementById('stat-students');
    const elTeachers = document.getElementById('stat-teachers');
    const elDepts = document.getElementById('stat-departments');
    const elClasses = document.getElementById('stat-classes');

    if (elStudents && stats.total_students !== undefined) {
      elStudents.textContent = Number(stats.total_enrolled_students ?? stats.total_students).toLocaleString();
    }
    if (elTeachers && stats.total_teachers !== undefined) {
      elTeachers.textContent = Number(stats.total_teachers).toLocaleString();
    }
    if (elDepts && stats.total_departments !== undefined) {
      elDepts.textContent = Number(stats.total_departments).toLocaleString();
    }
    if (elClasses && (stats.total_classes !== undefined || stats.active_classes !== undefined)) {
      elClasses.textContent = Number(stats.total_classes ?? stats.active_classes).toLocaleString();
    }
  }

  win.AdminMetrics = {
    mount,
    update,
    renderMetricsHtml
  };
})();

