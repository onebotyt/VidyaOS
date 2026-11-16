/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: REPORTS & ANALYTICS
 * Location: /faculty/reports/reports.js
 * 
 * Strict Domain Isolation: Encapsulated IIFE execution.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // Auth & RBAC Gate
  if (typeof requireFacultyAuth === 'function') {
    requireFacultyAuth(['TEACHER', 'HOD']);
  } else if (typeof guardRoute === 'function') {
    guardRoute({ roles: ['TEACHER'], requireSubjects: true });
  }

  const esc = (typeof escHtml === 'function') ? escHtml : (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  const getIcon = (name, opts) => (window.FacultyIcons && typeof window.FacultyIcons.get === 'function') ? window.FacultyIcons.get(name, opts) : '';

  async function loadAnalytics() {
    try {
      const res = await fetchApi('/reports/analytics');
      if (!res.success) return;
      const { classes, trend, defaulter_count, below_threshold_count } = res.data;

      const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
      const hasSubjects = Boolean((classes && classes.length > 0) || user?.is_hod);
      if (!hasSubjects) {
        ['nav-reg', 'nav-assign', 'nav-reports'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.display = 'none';
        });

        const mainContainer = document.querySelector('main.container');
        if (mainContainer) {
          mainContainer.innerHTML = `
            <div class="page-header" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h1 class="page-title">Attendance Reports & Analytics</h1>
                <p class="page-subtitle">Unified insights and attendance trends</p>
              </div>
              <a href="/faculty/dashboard.html" class="btn btn-secondary btn-sm">${getIcon('arrowLeft', { size: 14 })} Back to Dashboard</a>
            </div>
            <div class="card" style="text-align: center; padding: 3.5rem 2rem; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-color);">
              <div style="display:flex;justify-content:center;margin-bottom:0.75rem;">${getIcon('reports', { size: 48 })}</div>
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text-main);">No Teaching Subjects Allocated Yet</h3>
              <p style="font-size: 0.875rem; color: var(--text-muted); max-width: 540px; margin: 0 auto 1.5rem; line-height: 1.5;">
                Your Department HOD has not allocated any course subjects to your profile yet. Once assigned, your class attendance analytics, trend charts, low-attendance alerts, and hardware scan logs will automatically appear here.
              </p>
              <a href="/faculty/dashboard.html" class="btn btn-secondary btn-sm">${getIcon('arrowLeft', { size: 14 })} Back to Dashboard</a>
            </div>
          `;
        }
        return;
      }

      const overall = (classes && classes.length)
        ? (classes.reduce((sum, c) => sum + (c.attendance_percentage || 0), 0) / classes.length).toFixed(1)
        : '—';
      const totalSessions = (classes || []).reduce((sum, c) => sum + (c.sessions_conducted || 0), 0);
      const belowCount = below_threshold_count !== undefined ? below_threshold_count : (defaulter_count || 0);

      const kpiRow = document.getElementById('kpi-row');
      if (kpiRow) {
        kpiRow.innerHTML = `
          <div class="kpi-card">
            <div class="kpi-value ${overall >= 75 ? 'success' : 'danger'}">${overall}${overall !== '—' ? '%' : ''}</div>
            <div class="kpi-label">Overall Attendance</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${totalSessions}</div>
            <div class="kpi-label">Classes Conducted</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value ${belowCount > 0 ? 'danger' : 'success'}">${belowCount}</div>
            <div class="kpi-label">Students Below 75%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${classes ? classes.length : 0}</div>
            <div class="kpi-label">Assigned Classes</div>
          </div>
        `;
      }

      const classBars = document.getElementById('class-bars');
      if (classBars) {
        classBars.innerHTML = (classes && classes.length) ? classes.map(c => `
          <div class="class-bar-row">
            <div class="class-bar-label">${esc(c.subject_name)}</div>
            <div class="class-bar-track">
              <div class="class-bar-fill ${c.attendance_percentage < 75 ? 'low' : ''}" style="width:${Math.max(c.attendance_percentage, 8)}%;">
                <span>${esc(c.attendance_percentage)}%</span>
              </div>
            </div>
          </div>
        `).join('') : `<div style="color:var(--text-muted); text-align:center; padding:1.5rem;">No finalized class attendance recorded yet.</div>`;
      }

      const trendRow = document.getElementById('trend-row');
      if (trendRow) {
        const trendList = trend || [];
        const maxPct = Math.max(...trendList.map(t => t.attendance_percentage || 0), 100);
        trendRow.innerHTML = trendList.length ? trendList.map(t => `
          <div class="trend-bar-wrap" title="${esc(t.date)}: ${esc(t.attendance_percentage)}% attendance">
            <div class="trend-bar" style="height:${Math.max(((t.attendance_percentage || 0) / maxPct) * 100, 5)}%;"></div>
            <div class="trend-date">${new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
          </div>
        `).join('') : `<div style="color:var(--text-muted); text-align:center; padding:1.5rem; width:100%;">No recent sessions to display.</div>`;
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadEsp32Scans() {
    try {
      const res = await fetchApi('/reports/esp32-presence?limit=50');
      const tbody = document.getElementById('esp32-tbody');
      if (!tbody) return;
      if (res.success) {
        if (!res.data.length) {
          tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No biometric scans recorded recently.</td></tr>`;
          return;
        }

        tbody.innerHTML = res.data.map(e => `
          <tr>
            <td style="font-family: var(--font-family-mono); font-size: 0.8rem; color: var(--text-muted);">${new Date(e.scan_time).toLocaleString()}</td>
            <td style="font-weight: 600;">${esc(e.full_name)}</td>
            <td style="font-family: var(--font-family-mono); font-size: 0.8rem;">${esc(e.official_enrollment_no)}</td>
            <td><span class="badge badge-pending" style="font-family: var(--font-family-mono);">${esc(e.device_uid)}</span></td>
            <td>${esc(e.device_name || 'Classroom Terminal')}</td>
            <td style="text-align: right;"><span class="badge badge-present">TOUCH RECORDED</span></td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error(err);
    }
  }

  function switchTab(tab) {
    const pnlAnalytics = document.getElementById('tab-analytics-panel');
    const pnlEsp32 = document.getElementById('tab-esp32-panel');
    const btnAnalytics = document.getElementById('tab-analytics-btn');
    const btnEsp32 = document.getElementById('tab-esp32-btn');

    if (pnlAnalytics) pnlAnalytics.style.display = tab === 'analytics' ? 'block' : 'none';
    if (pnlEsp32) pnlEsp32.style.display = tab === 'esp32' ? 'block' : 'none';

    if (btnAnalytics) btnAnalytics.className = tab === 'analytics' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    if (btnEsp32) btnEsp32.className = tab === 'esp32' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';

    if (tab === 'analytics') loadAnalytics();
    if (tab === 'esp32') loadEsp32Scans();
  }

  // Export functions bound to DOM
  window.switchTab = switchTab;
  window.loadAnalytics = loadAnalytics;
  window.loadEsp32Scans = loadEsp32Scans;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const initialTab = urlParams.get('tab') || 'analytics';
      switchTab(initialTab);
    });
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab') || 'analytics';
    switchTab(initialTab);
  }
})();
