/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: HOD-REPORTS
 * frontend/faculty/hod-reports/hod-reports.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute({ roles: ['TEACHER'], requireHOD: true });

    const API = '/api/v1/hod';
    let departmentData = null;
    let currentReportData = null;
    let allRecords = [];

    // Self-healing API client with automatic token refresh
    async function apiFetch(url, options = {}) {
      let token = getAuthToken();
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res = await fetch(url, { ...options, headers });

      if (res.status === 401) {
        try {
          const refreshRes = await fetch('/api/v1/auth/refresh', { method: 'POST' });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData.success && refreshData.data?.access_token) {
              localStorage.setItem('auth_token', refreshData.data.access_token);
              headers['Authorization'] = `Bearer ${refreshData.data.access_token}`;
              res = await fetch(url, { ...options, headers });
            }
          } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('current_user');
            window.location.href = '/index.html?error=session_expired';
            throw new Error('Session expired. Please log in again.');
          }
        } catch (e) {
          window.location.href = '/index.html?error=session_expired';
          throw e;
        }
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `Request failed (${res.status})`);
      }
      return data;
    }

    async function init() {
      const user = getCurrentUser();
      if (user) {
        const isHod = !!user.is_hod;
        const roleBadge = document.getElementById('role-badge');
        if (roleBadge) {
          roleBadge.innerText = isHod ? 'HOD' : 'FACULTY';
          roleBadge.style.background = 'var(--color-primary)';
        }
        if (isHod) {
          const tLink = document.getElementById('nav-teachers-link');
          const sLink = document.getElementById('nav-subjects-link');
          if (tLink) tLink.style.display = '';
          if (sLink) sLink.style.display = '';
        }
      }

      try {
        const hierRes = await apiFetch(`${API}/hierarchy`);
        if (hierRes.success && hierRes.data) {
          departmentData = hierRes.data;
          document.getElementById('dept-header-name').innerText = departmentData.department_name || 'Department Portal';
          document.getElementById('dept-subtitle').innerText =
            `Biometric ESP32 terminal attendance logs, presence trends, and verified physical scans for ${departmentData.department_name || 'Department'}.`;
        }
      } catch (err) {
        console.warn('Hierarchy load warning:', err.message);
      }

      await loadReports();
    }

    function resetFilters() {
      document.getElementById('filter-year').value = '';
      document.getElementById('filter-sem').value = '';
      document.getElementById('filter-date-preset').value = 'all';
      document.getElementById('filter-search').value = '';
      loadReports();
    }

    async function loadReports() {
      const year = document.getElementById('filter-year').value;
      const sem = document.getElementById('filter-sem').value;
      const datePreset = document.getElementById('filter-date-preset').value;

      let qs = [];
      if (year) qs.push(`year=${year}`);
      if (sem) qs.push(`semester=${sem}`);
      if (datePreset) qs.push(`date_preset=${datePreset}`);

      const url = `${API}/reports${qs.length ? '?' + qs.join('&') : ''}`;

      try {
        const res = await apiFetch(url);
        if (res.success && res.data) {
          currentReportData = res.data;
          allRecords = res.data.records || [];
          renderAnalysisBoard(res.data);
          applySearchFilter();
        } else {
          showEmptyState('No attendance scan records found.');
        }
      } catch (err) {
        document.getElementById('table-wrap').innerHTML = `
          <div style="text-align: center; color: var(--status-absent); padding: 3rem;">
            Failed to load department report: ${err.message}
          </div>`;
      }
    }

    function renderAnalysisBoard(data) {
      const k = data.kpis || {};
      document.getElementById('kpi-scans').textContent = (k.total_scans || 0).toLocaleString();
      document.getElementById('kpi-students').textContent = (k.unique_students || 0).toLocaleString();
      document.getElementById('kpi-terminals').textContent = (k.active_terminals || 0).toLocaleString();
      document.getElementById('kpi-today').textContent = (k.today_scans || 0).toLocaleString();

      // Render Bar Chart: Daily Trend
      renderDailyTrendChart(data.daily_trend || []);

      // Render Cohort Breakdown
      renderCohortDistribution(data.cohort_distribution || []);
    }

    function renderDailyTrendChart(trend) {
      const chart = document.getElementById('daily-trend-chart');
      if (!trend.length) {
        chart.innerHTML = `<div style="margin: auto; color: var(--text-muted); font-size: 0.85rem;">No historical scans recorded for this selection.</div>`;
        return;
      }

      const maxVal = Math.max(...trend.map(t => t.scan_count), 1);

      chart.innerHTML = trend.map(t => {
        const heightPct = Math.round((t.scan_count / maxVal) * 85) + 5;
        const dateObj = new Date(t.date + 'T00:00:00');
        const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return `
          <div class="bar-col">
            <div class="bar-tooltip">
              ${label}: ${t.scan_count} scans (${t.unique_students} students)
            </div>
            <div class="bar-fill" style="height: ${heightPct}%;"></div>
            <div class="bar-label">${label}</div>
          </div>
        `;
      }).join('');
    }

    function renderCohortDistribution(dist) {
      const container = document.getElementById('cohort-dist-container');
      if (!dist.length) {
        container.innerHTML = `<div style="margin: auto; color: var(--text-muted); font-size: 0.85rem;">No cohort breakdown available.</div>`;
        return;
      }

      const total = dist.reduce((acc, d) => acc + d.scan_count, 0) || 1;

      container.innerHTML = dist.slice(0, 5).map(d => {
        const pct = Math.round((d.scan_count / total) * 100);
        return `
          <div class="dist-row">
            <div class="dist-header">
              <span style="font-weight: 700; color: var(--text-main); font-size: 0.8rem;">
                ${esc(d.branch_code || d.branch_name)} (Y${d.year} S${d.semester})
              </span>
              <span style="font-weight: 700; color: var(--color-primary); font-size: 0.8rem;">
                ${d.scan_count} scans (${pct}%)
              </span>
            </div>
            <div class="dist-bar-bg">
              <div class="dist-bar-fill" style="width: ${pct}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    function applySearchFilter() {
      const q = document.getElementById('filter-search').value.toLowerCase().trim();
      let filtered = allRecords;

      if (q) {
        filtered = allRecords.filter(r => 
          (r.student_name || '').toLowerCase().includes(q) ||
          (r.official_enrollment_no || '').toLowerCase().includes(q) ||
          (r.device_uid || '').toLowerCase().includes(q) ||
          (r.device_name || '').toLowerCase().includes(q)
        );
      }

      renderRecordsTable(filtered);
    }

    function renderRecordsTable(records) {
      const wrap = document.getElementById('table-wrap');
      document.getElementById('record-count-badge').innerText = `${records.length} Scans`;

      if (!records.length) {
        wrap.innerHTML = `
          <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <div style="display:flex;justify-content:center;margin-bottom:0.5rem;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg></div>
            <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-main);">No ESP32 Biometric Scans Found</div>
            <div style="font-size: 0.85rem; margin-top: 0.25rem;">No attendance scans match your search or filter criteria.</div>
          </div>`;
        return;
      }

      wrap.innerHTML = `
        <table class="custom-table">
          <thead>
            <tr>
              <th style="width: 180px;">Scan Timestamp</th>
              <th>Student Name</th>
              <th style="width: 140px;">Enrollment No</th>
              <th style="width: 140px;">Program &amp; Cohort</th>
              <th style="width: 160px;">Terminal Reader</th>
              <th style="width: 110px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td>
                  <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; font-weight: 700; color: var(--text-main);">
                    ${formatTimestamp(r.scan_time)}
                  </span>
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-weight: 700; color: var(--text-main); font-size: 0.92rem;">
                      ${esc(r.student_name)}
                    </span>
                    ${r.class_roll_no ? `<span style="font-size: 0.72rem; background: var(--bg-surface); color: var(--text-muted); font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 4px;">${r.class_roll_no}</span>` : ''}
                  </div>
                </td>
                <td>
                  <span style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--color-primary); background: var(--color-primary-light); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">
                    ${esc(r.official_enrollment_no)}
                  </span>
                </td>
                <td>
                  <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-main);">
                    ${esc(r.branch_code || r.branch_name || 'IT')}
                  </span>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">
                    Year ${r.year || 3} • Sem ${r.semester || 5}
                  </div>
                </td>
                <td>
                  <div class="esp-badge">
                    <span class="esp-pulse"></span>
                    ${esc(r.device_uid || 'ESP32_READER')}
                  </div>
                </td>
                <td style="text-align: center;">
                  <span style="font-size: 0.75rem; font-weight: 800; color: var(--status-present); background: var(--status-present-bg); padding: 0.2rem 0.6rem; border-radius: 999px;">
                    VERIFIED
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    function formatTimestamp(ts) {
      if (!ts) return '—';
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
             d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function exportCsv() {
      if (!allRecords.length) {
        showToast('No attendance scan records available to export.', 'info');
        return;
      }
      const headers = ['Scan ID', 'Event ID', 'Scan Timestamp', 'Student Name', 'Class Roll No', 'Enrollment No', 'Department / Program', 'Year', 'Semester', 'Device UID', 'Status'];
      const rows = allRecords.map(r => [
        r.scan_id || '',
        r.event_id || '',
        r.scan_time || '',
        `"${(r.student_name || '').replace(/"/g, '""')}"`,
        r.class_roll_no || '',
        r.official_enrollment_no || '',
        `"${(r.department_name || r.branch_name || '').replace(/"/g, '""')}"`,
        r.year || '',
        r.semester || '',
        r.device_uid || '',
        r.status || 'PRESENT'
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `ESP_Dept_Attendance_Report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    

    init();

