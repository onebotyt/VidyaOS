/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: DEPARTMENT ATTENDANCE & TELEMETRY REPORTS
 * frontend/admin/reports/reports.js
 * High-density reporting, Chart.js visualizations & mobile cards
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['SYSTEM_ADMIN']);

// ─────────────────────────────────────────────────────────────
// STATE MANAGEMENT
// ─────────────────────────────────────────────────────────────
let departments = [];
let currentReportData = null;
let cohortSummaries = [];
let chartDailyTrendInstance = null;
let chartCohortDistInstance = null;
let activeMobileChart = 'trend';

// Segmented Mobile Chart Switcher
window.switchReportChart = function(chartKey) {
  activeMobileChart = chartKey;
  const btnTrend = document.getElementById('btn-chart-trend');
  const btnCohort = document.getElementById('btn-chart-cohort');
  const cardTrend = document.getElementById('chart-card-trend');
  const cardCohort = document.getElementById('chart-card-cohort');

  if (chartKey === 'cohort') {
    if (btnCohort) btnCohort.classList.add('active');
    if (btnTrend) btnTrend.classList.remove('active');
    if (cardCohort) cardCohort.classList.remove('mob-hidden');
    if (cardTrend) cardTrend.classList.add('mob-hidden');
    if (chartCohortDistInstance) chartCohortDistInstance.resize();
  } else {
    if (btnTrend) btnTrend.classList.add('active');
    if (btnCohort) btnCohort.classList.remove('active');
    if (cardTrend) cardTrend.classList.remove('mob-hidden');
    if (cardCohort) cardCohort.classList.add('mob-hidden');
    if (chartDailyTrendInstance) chartDailyTrendInstance.resize();
  }
};

// Backwards-compatibility no-op shim for switchReportTab
window.switchReportTab = function() {
  // Single-view page: no tabs needed
};

// ─────────────────────────────────────────────────────────────
// HELPER: Theme CSS Variable Extractor
// ─────────────────────────────────────────────────────────────
function getCssVar(varName, fallback = '#3b82f6') {
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return val || fallback;
}

function getDeptIcon(code) {
  const c = (code || '').toUpperCase();
  if (c.includes('CS') || c.includes('IT')) {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
  }
  if (c.includes('ME') || c.includes('AUTO')) {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
  }
  if (c.includes('EE') || c.includes('EC')) {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
  }
  if (c.includes('CE') || c.includes('CIVIL')) {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"></path></svg>`;
  }
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
}

// ─────────────────────────────────────────────────────────────
// 1. INITIALIZATION
// ─────────────────────────────────────────────────────────────
async function init() {
  try {
    const dRes = await fetchApi('/admin/departments');
    if (dRes && dRes.success) {
      departments = dRes.data || [];
      renderDeptDropdown();
    }
  } catch (err) {
    console.error('Failed to load departments:', err);
  }

  if (window.innerWidth <= 768) {
    switchReportChart('trend');
  }

  updateFilterBadge();
  loadDeptReport();
}

// ─────────────────────────────────────────────────────────────
// COLLAPSIBLE FILTER DRAWER & BADGE HELPERS
// ─────────────────────────────────────────────────────────────
window.toggleFilterDrawer = function(forceOpen = null) {
  const panel = document.getElementById('filter-drawer-panel');
  const btn = document.getElementById('btn-toggle-filters');
  if (!panel) return;
  const isCurrentlyOpen = panel.classList.contains('is-open');
  const shouldOpen = forceOpen !== null ? forceOpen : !isCurrentlyOpen;
  if (shouldOpen) {
    panel.classList.add('is-open');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  } else {
    panel.classList.remove('is-open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
};

window.updateFilterBadge = function() {
  const dept = document.getElementById('report-dept')?.value || '';
  const datePreset = document.getElementById('report-date-preset')?.value || 'all';
  const year = document.getElementById('report-year')?.value || '';
  const sem = document.getElementById('report-sem')?.value || '';
  let count = 0;
  if (dept) count++;
  if (datePreset !== 'all') count++;
  if (year) count++;
  if (sem) count++;

  const badge = document.getElementById('filter-active-count');
  const btn = document.getElementById('btn-toggle-filters');
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
  if (btn) {
    if (count > 0) {
      btn.classList.add('has-active');
    } else {
      btn.classList.remove('has-active');
    }
  }
};

function renderDeptDropdown() {
  const deptSelect = document.getElementById('report-dept');
  if (!deptSelect) return;
  deptSelect.innerHTML = '<option value="">All Departments (Institutional)</option>';
  departments.forEach(d => {
    deptSelect.innerHTML += `<option value="${d.id}">${esc(d.name)} (${esc(d.code)})</option>`;
  });
  deptSelect.value = '';
}

function onDeptSelectChange() {
  updateFilterBadge();
  loadDeptReport();
}

function resetFilters() {
  const deptSelect = document.getElementById('report-dept');
  if (deptSelect) deptSelect.value = '';
  const yr = document.getElementById('report-year');
  if (yr) yr.value = '';
  const sem = document.getElementById('report-sem');
  if (sem) sem.value = '';
  const dt = document.getElementById('report-date-preset');
  if (dt) dt.value = 'all';
  const srch = document.getElementById('report-search');
  if (srch) srch.value = '';
  const clr = document.getElementById('clear-search-btn');
  if (clr) clr.style.display = 'none';

  updateFilterBadge();
  loadDeptReport();
}

function clearSearchInput() {
  const srch = document.getElementById('report-search');
  if (srch) srch.value = '';
  const clr = document.getElementById('clear-search-btn');
  if (clr) clr.style.display = 'none';
  applySearchFilter();
}

// ─────────────────────────────────────────────────────────────
// 2. DATA LOADING & API FETCH
// ─────────────────────────────────────────────────────────────
async function loadDeptReport(forceRefresh = false) {
  const deptId = document.getElementById('report-dept')?.value || '';
  const year = document.getElementById('report-year')?.value || '';
  const sem = document.getElementById('report-sem')?.value || '';
  const datePreset = document.getElementById('report-date-preset')?.value || 'all';

  let url = `/admin/reports/department?date_preset=${encodeURIComponent(datePreset)}`;
  if (deptId) url += `&department_id=${encodeURIComponent(deptId)}`;
  if (year) url += `&year=${encodeURIComponent(year)}`;
  if (sem) url += `&semester=${encodeURIComponent(sem)}`;
  if (forceRefresh) url += `&_t=${Date.now()}`;

  const tableWrap = document.getElementById('table-wrap');
  const mobileCardsWrap = document.getElementById('cohort-mobile-cards-wrap');
  if (tableWrap) {
    tableWrap.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
        Loading department attendance summary...
      </div>`;
  }
  if (mobileCardsWrap) {
    mobileCardsWrap.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        Loading cohorts...
      </div>`;
  }

  try {
    const res = await fetchApi(url);
    if (!res || !res.success) {
      throw new Error(res?.error?.message || 'Failed to fetch attendance reports');
    }

    currentReportData = res.data || {};
    cohortSummaries = currentReportData.cohort_summary || currentReportData.cohort_summaries || [];

    renderAnalysisBoard(currentReportData);
    applySearchFilter();
  } catch (err) {
    console.error('Error loading department report:', err);
    if (tableWrap) {
      tableWrap.innerHTML = `
        <div style="text-align: center; color: var(--status-absent); padding: 3rem;">
          Failed to load department report: ${esc(err.message)}
        </div>`;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 3. KPI CARDS & CHART.JS VISUALIZATIONS
// ─────────────────────────────────────────────────────────────
function renderAnalysisBoard(data) {
  const k = data.kpis || {};
  const kScans = document.getElementById('kpi-scans');
  if (kScans) kScans.textContent = (k.total_scans || 0).toLocaleString();
  const kStudents = document.getElementById('kpi-students');
  if (kStudents) kStudents.textContent = (k.unique_students || 0).toLocaleString();
  const kTerminals = document.getElementById('kpi-terminals');
  if (kTerminals) kTerminals.textContent = (k.active_terminals || 0).toLocaleString();
  const kToday = document.getElementById('kpi-today');
  if (kToday) kToday.textContent = (k.today_scans || 0).toLocaleString();

  renderDailyTrendChart(data.daily_trend || []);
  renderCohortDistributionChart(data.cohort_distribution || []);
}

function renderDailyTrendChart(trend) {
  const canvas = document.getElementById('chart-daily-trend');
  const peakBadge = document.getElementById('trend-peak-badge');
  const daysBadge = document.getElementById('trend-days-badge');
  if (!canvas || typeof Chart === 'undefined') return;

  if (!trend || !trend.length) {
    if (chartDailyTrendInstance) {
      chartDailyTrendInstance.destroy();
      chartDailyTrendInstance = null;
    }
    if (peakBadge) peakBadge.textContent = 'Peak: 0 scans';
    if (daysBadge) daysBadge.textContent = 'Active: 0 days';
    return;
  }

  const maxVal = Math.max(...trend.map(t => t.scan_count), 0);
  if (peakBadge) peakBadge.textContent = `Peak: ${maxVal.toLocaleString()} scans/day`;
  if (daysBadge) daysBadge.textContent = `Active: ${trend.length} recorded day${trend.length !== 1 ? 's' : ''}`;

  const labels = trend.map(t => {
    const dateObj = new Date(t.date + 'T00:00:00');
    return isNaN(dateObj.getTime()) ? t.date : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const scanData = trend.map(t => t.scan_count || 0);
  const studentData = trend.map(t => t.unique_students || 0);

  const colPrimary = getCssVar('--color-primary', '#2563eb');
  const colPresent = getCssVar('--status-present', '#16a34a');
  const colTextMuted = getCssVar('--text-muted', '#64748b');
  const colBorder = getCssVar('--border-color', '#e2e8f0');

  const ctx = canvas.getContext('2d');
  if (chartDailyTrendInstance) {
    chartDailyTrendInstance.destroy();
  }

  chartDailyTrendInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Scans',
          data: scanData,
          backgroundColor: colPrimary,
          borderRadius: 4,
          order: 2
        },
        {
          label: 'Unique Students',
          data: studentData,
          type: 'line',
          borderColor: colPresent,
          backgroundColor: colPresent,
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            font: { size: 11, family: 'Inter' },
            color: colTextMuted
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${context.raw.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colTextMuted, font: { size: 10 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: colBorder },
          ticks: { precision: 0, color: colTextMuted, font: { size: 10 } }
        }
      }
    }
  });
}

function renderCohortDistributionChart(dist) {
  const canvas = document.getElementById('chart-cohort-breakdown');
  const countBadge = document.getElementById('cohort-dist-count-badge');
  if (!canvas || typeof Chart === 'undefined') return;

  if (countBadge) {
    countBadge.textContent = `${dist ? dist.length : 0} Cohort${dist && dist.length !== 1 ? 's' : ''}`;
  }

  if (!dist || !dist.length) {
    if (chartCohortDistInstance) {
      chartCohortDistInstance.destroy();
      chartCohortDistInstance = null;
    }
    return;
  }

  const topDist = dist.slice(0, 6);
  const labels = topDist.map(d => `${d.branch_code || d.branch_name} (Y${d.year || 3}S${d.semester || 5})`);
  const counts = topDist.map(d => d.scan_count || 0);

  const colPrimary = getCssVar('--color-primary', '#2563eb');
  const colPresent = getCssVar('--status-present', '#16a34a');
  const colLate = getCssVar('--status-late', '#eab308');
  const colBorder = getCssVar('--border-color', '#e2e8f0');
  const colTextMuted = getCssVar('--text-muted', '#64748b');

  const palette = [
    colPrimary,
    colPresent,
    colLate,
    getCssVar('--status-present-bg', '#dcfce7'),
    getCssVar('--color-primary-light', '#eff6ff'),
    colBorder
  ];

  const ctx = canvas.getContext('2d');
  if (chartCohortDistInstance) {
    chartCohortDistInstance.destroy();
  }

  chartCohortDistInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: counts,
        backgroundColor: palette.slice(0, counts.length),
        borderWidth: 2,
        borderColor: getCssVar('--bg-card', '#ffffff')
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: window.innerWidth <= 768 ? 'bottom' : 'right',
          labels: {
            boxWidth: 10,
            font: { size: 10, family: 'Inter' },
            color: colTextMuted
          }
        }
      },
      cutout: '60%'
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 4. SEARCH & COHORT SUMMARY TABLE / MOBILE CARDS
// ─────────────────────────────────────────────────────────────
function applySearchFilter() {
  const q = (document.getElementById('report-search')?.value || '').toLowerCase().trim();
  const clearBtn = document.getElementById('clear-search-btn');
  if (clearBtn) clearBtn.style.display = q ? 'inline-flex' : 'none';

  let filtered = cohortSummaries;

  if (q) {
    filtered = cohortSummaries.filter(c => 
      (c.department_name || '').toLowerCase().includes(q) ||
      (c.department_code || '').toLowerCase().includes(q) ||
      (c.branch_name || '').toLowerCase().includes(q) ||
      (c.branch_code || '').toLowerCase().includes(q) ||
      String(c.year || '').includes(q) ||
      String(c.semester || '').includes(q)
    );
  }

  renderCohortTableAndCards(filtered);
}

function renderCohortTableAndCards(cohorts) {
  const tableWrap = document.getElementById('table-wrap');
  const mobileCardsWrap = document.getElementById('cohort-mobile-cards-wrap');
  const countBadge = document.getElementById('record-count-badge');
  const turnoutBadge = document.getElementById('avg-turnout-badge');

  if (countBadge) countBadge.textContent = `${cohorts.length} Cohort${cohorts.length !== 1 ? 's' : ''}`;

  if (!cohorts || !cohorts.length) {
    if (tableWrap) {
      tableWrap.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
          No cohorts found matching the current filters.
        </div>`;
    }
    if (mobileCardsWrap) {
      mobileCardsWrap.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No cohorts found matching filters.
        </div>`;
    }
    if (turnoutBadge) turnoutBadge.textContent = 'Avg Turnout: —';
    return;
  }

  const validTurnouts = cohorts.map(c => Number(c.turnout_rate ?? c.attendance_percentage ?? 0));
  const avgTurnout = validTurnouts.length
    ? Math.round(validTurnouts.reduce((a, b) => a + b, 0) / validTurnouts.length)
    : 0;

  if (turnoutBadge) turnoutBadge.textContent = `Avg Turnout: ${avgTurnout}%`;

  // 1. Desktop Table HTML
  if (tableWrap) {
    tableWrap.innerHTML = `
      <table class="custom-table">
        <thead>
          <tr>
            <th>Department / Program</th>
            <th style="text-align: center;">Cohort</th>
            <th style="text-align: center;">Enrolled</th>
            <th style="text-align: center;">Scanned (Present)</th>
            <th style="text-align: center;">Total Scans</th>
            <th style="text-align: center;">Turnout Rate</th>
            <th style="text-align: center;">Terminals</th>
            <th style="text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${cohorts.map(c => {
            const turnout = Math.round(Number(c.turnout_rate ?? c.attendance_percentage ?? 0));
            const enrolled = Number(c.enrolled_students ?? c.total_students ?? 0);
            const present = Number(c.present_students ?? c.scanned_students ?? 0);
            const totalScans = Number(c.total_scans ?? 0);

            let statusClass = 'badge-present';
            let statusText = 'HIGH TURNOUT';
            let barColor = 'var(--status-present)';

            if (turnout < 50) {
              statusClass = 'badge-absent';
              statusText = 'CRITICAL ATTENTION';
              barColor = 'var(--status-absent)';
            } else if (turnout < 75) {
              statusClass = 'badge-late';
              statusText = 'MODERATE';
              barColor = 'var(--status-late)';
            }

            const terminals = c.terminal_uids || c.devices || [];
            const terminalCount = terminals.length || Number(c.active_terminals || 0);
            const terminalList = terminals.length ? terminals.join(', ') : 'ESP32 Scanners';

            return `
              <tr>
                <td>
                  <div style="font-weight: 700; color: var(--text-main); font-size: 0.9rem;">
                    ${esc(c.department_name || c.branch_name || 'Department')}
                  </div>
                  <div style="font-size: 0.74rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem; margin-top: 0.15rem;">
                    <span>${getDeptIcon(c.department_code || c.branch_code)}</span>
                    <span>${esc(c.department_code || c.branch_code || '')}</span>
                  </div>
                </td>
                <td style="text-align: center;">
                  <span class="badge" style="background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-main); font-weight: 700;">
                    Y${c.year || 3} • S${c.semester || 5}
                  </span>
                </td>
                <td style="text-align: center; font-weight: 600;">${enrolled}</td>
                <td style="text-align: center; font-weight: 700; color: var(--status-present);">${present}</td>
                <td style="text-align: center; font-weight: 700;">${totalScans.toLocaleString()}</td>
                <td style="text-align: center;">
                  <div class="turnout-wrap">
                    <span class="turnout-val" style="color: ${barColor};">${turnout}%</span>
                    <div class="turnout-bar-bg">
                      <div class="turnout-bar-fill" style="width: ${turnout}%; background: ${barColor};"></div>
                    </div>
                  </div>
                </td>
                <td style="text-align: center;">
                  <span class="terminal-count-badge" title="Active hardware: ${esc(terminalList)}">
                    <span style="width:6px;height:6px;border-radius:50%;background:var(--status-present);display:inline-block;"></span>
                    <span>${terminalCount} Scanner${terminalCount !== 1 ? 's' : ''}</span>
                  </span>
                </td>
                <td style="text-align: center;">
                  <span class="badge ${statusClass}" style="font-size: 0.7rem;">${statusText}</span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // 2. Mobile Cards HTML
  if (mobileCardsWrap) {
    mobileCardsWrap.innerHTML = cohorts.map(c => {
      const turnout = Math.round(Number(c.turnout_rate ?? c.attendance_percentage ?? 0));
      const enrolled = Number(c.enrolled_students ?? c.total_students ?? 0);
      const present = Number(c.present_students ?? c.scanned_students ?? 0);
      const totalScans = Number(c.total_scans ?? 0);

      let statusClass = 'badge-present';
      let statusText = 'HIGH TURNOUT';
      let barColor = 'var(--status-present)';

      if (turnout < 50) {
        statusClass = 'badge-absent';
        statusText = 'CRITICAL ATTENTION';
        barColor = 'var(--status-absent)';
      } else if (turnout < 75) {
        statusClass = 'badge-late';
        statusText = 'MODERATE';
        barColor = 'var(--status-late)';
      }

      const terminals = c.terminal_uids || c.devices || [];
      const terminalCount = terminals.length || Number(c.active_terminals || 0);

      return `
        <div class="cohort-mob-card">
          <div class="cohort-mob-header">
            <div>
              <div class="cohort-mob-dept">${esc(c.department_name || c.branch_name || 'Department')}</div>
              <div class="cohort-mob-sub">${esc(c.department_code || c.branch_code || '')} &bull; Year ${c.year || 3}, Sem ${c.semester || 5}</div>
            </div>
            <span class="badge ${statusClass}" style="font-size: 0.68rem;">${statusText}</span>
          </div>

          <div class="cohort-mob-stats-grid">
            <div>
              <div class="cohort-mob-stat-lbl">Enrolled</div>
              <div class="cohort-mob-stat-val">${enrolled}</div>
            </div>
            <div>
              <div class="cohort-mob-stat-lbl">Present</div>
              <div class="cohort-mob-stat-val" style="color: var(--status-present);">${present}</div>
            </div>
            <div>
              <div class="cohort-mob-stat-lbl">Turnout</div>
              <div class="cohort-mob-stat-val" style="color: ${barColor};">${turnout}%</div>
            </div>
          </div>

          <div class="cohort-mob-footer">
            <span class="terminal-count-badge" style="font-size: 0.72rem;">
              <span style="width:6px;height:6px;border-radius:50%;background:var(--status-present);display:inline-block;"></span>
              <span>${terminalCount} Terminal${terminalCount !== 1 ? 's' : ''} Online</span>
            </span>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">
              ${totalScans.toLocaleString()} total scans
            </span>
          </div>
        </div>
      `;
    }).join('');
  }
}

// ─────────────────────────────────────────────────────────────
// 5. EXPORT EXCEL ANALYTICS WORKBOOK (.xlsx)
// ─────────────────────────────────────────────────────────────
// 5. EXPORT EXCEL ANALYTICS WORKBOOK (.xlsx) WITH NATIVE CHARTS
// ─────────────────────────────────────────────────────────────
async function exportReport(format = 'excel') {
  const exportBtn = document.getElementById('btn-export-excel') || document.querySelector('button[onclick*="exportReport"]');
  const origHtml = exportBtn ? exportBtn.innerHTML : '';
  if (exportBtn) {
    exportBtn.disabled = true;
    exportBtn.innerHTML = `
      <svg class="spin-anim" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
      <span>Generating Excel Dashboard...</span>
    `;
  }

  try {
    const deptId = document.getElementById('report-dept')?.value || '';
    const year = document.getElementById('report-year')?.value || '';
    const sem = document.getElementById('report-sem')?.value || '';
    const datePreset = document.getElementById('report-date-preset')?.value || 'all';

    // Retrieve authentication token across all supported storage keys
    const token = (typeof getToken === 'function' ? getToken() : null) || 
                  (typeof getAuthToken === 'function' ? getAuthToken() : null) || 
                  localStorage.getItem('access_token') || 
                  localStorage.getItem('token') || '';

    const payload = {
      format,
      date_preset: datePreset
    };
    if (deptId) payload.department_id = deptId;
    if (year) payload.year = year;
    if (sem) payload.semester = sem;

    let url = `/api/v1/admin/reports/export?format=${encodeURIComponent(format)}&date_preset=${encodeURIComponent(datePreset)}`;
    if (deptId) url += `&department_id=${encodeURIComponent(deptId)}`;
    if (year) url += `&year=${encodeURIComponent(year)}`;
    if (sem) url += `&semester=${encodeURIComponent(sem)}`;
    if (token) url += `&token=${encodeURIComponent(token)}`;

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let errJson;
      try { errJson = await res.json(); } catch (_) {}
      const errMsg = (errJson && errJson.error && errJson.error.message) || `HTTP Error ${res.status}`;
      throw new Error(errMsg);
    }

    const disposition = res.headers.get('content-disposition') || '';
    let filename = format === 'csv' ? 'Attendance-Report.csv' : 'Attendance-Analytics-Report.xlsx';
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);

    if (typeof showToast === 'function') {
      showToast(`Excel Analytics Dashboard downloaded (${filename})`, 'success');
    }
  } catch (err) {
    console.error('Export report error:', err);
    if (typeof showToast === 'function') {
      showToast(`Export failed: ${err.message}`, 'error');
    } else {
      alert(`Export failed: ${err.message}`);
    }
  } finally {
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.innerHTML = origHtml;
    }
  }
}
window.exportReport = exportReport;
window.exportCsv = exportReport;

// ─────────────────────────────────────────────────────────────
// 6. DOM BOOTSTRAP
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
