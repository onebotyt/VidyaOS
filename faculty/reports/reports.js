/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: REPORTS
 * frontend/faculty/reports/reports.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute({ roles: ['TEACHER'], requireSubjects: true });

async function loadAnalytics() {
  try {
    const res = await fetchApi('/reports/analytics');
    if (!res.success) return;
    const { classes, trend, defaulter_count, below_threshold_count } = res.data;

    const user = getCurrentUser();
    const hasSubjects = Boolean(classes.length > 0 || user?.is_hod);
    if (!hasSubjects) {
      ['nav-reg', 'nav-assign', 'nav-reports'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });

      document.querySelector('main.container').innerHTML = `
        <div class="page-header" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 class="page-title">Attendance Reports & Analytics</h1>
            <p class="page-subtitle">Unified insights and attendance trends</p>
          </div>
          <a href="/faculty/dashboard.html" class="btn btn-secondary btn-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Back to Dashboard</a>
        </div>
        <div class="card" style="text-align: center; padding: 3.5rem 2rem; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-color);">
          <div style="display:flex;justify-content:center;margin-bottom:0.75rem;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></div>
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text-main);">No Teaching Subjects Allocated Yet</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); max-width: 540px; margin: 0 auto 1.5rem; line-height: 1.5;">
            Your Department HOD has not allocated any course subjects to your profile yet. Once assigned, your class attendance analytics, trend charts, low-attendance alerts, and hardware scan logs will automatically appear here.
          </p>
          <a href="/faculty/dashboard.html" class="btn btn-secondary btn-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Back to Dashboard</a>
        </div>
      `;
      return;
    }

    const overall = classes.length
      ? (classes.reduce((sum, c) => sum + c.attendance_percentage, 0) / classes.length).toFixed(1)
      : '—';
    const totalSessions = classes.reduce((sum, c) => sum + c.sessions_conducted, 0);
    const belowCount = below_threshold_count !== undefined ? below_threshold_count : (defaulter_count || 0);

    document.getElementById('kpi-row').innerHTML = `
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
        <div class="kpi-value">${classes.length}</div>
        <div class="kpi-label">Assigned Classes</div>
      </div>
    `;

    document.getElementById('class-bars').innerHTML = classes.length ? classes.map(c => `
      <div class="class-bar-row">
        <div class="class-bar-label">${c.subject_name}</div>
        <div class="class-bar-track">
          <div class="class-bar-fill ${c.attendance_percentage < 75 ? 'low' : ''}" style="width:${Math.max(c.attendance_percentage, 8)}%;">
            <span>${c.attendance_percentage}%</span>
          </div>
        </div>
      </div>
    `).join('') : `<div style="color:var(--text-muted); text-align:center; padding:1.5rem;">No finalized class attendance recorded yet.</div>`;

    const maxPct = Math.max(...trend.map(t => t.attendance_percentage), 100);
    document.getElementById('trend-row').innerHTML = trend.length ? trend.map(t => `
      <div class="trend-bar-wrap" title="${t.date}: ${t.attendance_percentage}% attendance">
        <div class="trend-bar" style="height:${Math.max((t.attendance_percentage / maxPct) * 100, 5)}%;"></div>
        <div class="trend-date">${new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
      </div>
    `).join('') : `<div style="color:var(--text-muted); text-align:center; padding:1.5rem; width:100%;">No recent sessions to display.</div>`;
  } catch (err) {
    console.error(err);
  }
}

async function loadEsp32Scans() {
  try {
    const res = await fetchApi('/reports/esp32-presence?limit=50');
    const tbody = document.getElementById('esp32-tbody');
    if (res.success) {
      if (!res.data.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No biometric scans recorded recently.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.data.map(e => `
        <tr>
          <td style="font-family: var(--font-family-mono); font-size: 0.8rem; color: var(--text-muted);">${new Date(e.scan_time).toLocaleString()}</td>
          <td style="font-weight: 600;">${e.full_name}</td>
          <td style="font-family: var(--font-family-mono); font-size: 0.8rem;">${e.official_enrollment_no}</td>
          <td><span class="badge badge-pending" style="font-family: var(--font-family-mono);">${e.device_uid}</span></td>
          <td>${e.device_name || 'Classroom Terminal'}</td>
          <td style="text-align: right;"><span class="badge badge-present">TOUCH RECORDED</span></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

function switchTab(tab) {
  document.getElementById('tab-analytics-panel').style.display = tab === 'analytics' ? 'block' : 'none';
  document.getElementById('tab-esp32-panel').style.display = tab === 'esp32' ? 'block' : 'none';

  document.getElementById('tab-analytics-btn').className = tab === 'analytics' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  document.getElementById('tab-esp32-btn').className = tab === 'esp32' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';

  if (tab === 'analytics') loadAnalytics();
  if (tab === 'esp32') loadEsp32Scans();
}

// Check query params for tab
const urlParams = new URLSearchParams(window.location.search);
const initialTab = urlParams.get('tab') || 'analytics';
switchTab(initialTab);
