/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS ADMIN REUSABLE COMPONENT: ATTENDANCE OVERVIEW (attendance-overview.js)
 * Location: /frontend/admin/components/attendance-overview/attendance-overview.js
 * 
 * Modular engine to render the circular attendance ring gauge,
 * real-time counts (Present, Absent, Total), and department filtering.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  let cachedData = null;

  function renderHtml() {
    return `
      <article class="panel-attendance-overview" aria-label="Today's Attendance Overview">
        <div class="panel-header-row">
          <div class="panel-title-group">
            <svg class="panel-title-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            <h3 class="panel-title-text">Today's Attendance Overview</h3>
          </div>
          <select class="dept-pill-select" id="overview-dept-filter" aria-label="Filter by Department">
            <option value="ALL">All Dept. ▾</option>
          </select>
        </div>

        <div class="attendance-overview-body-grid">
          <!-- Left: Circular Donut Ring -->
          <div class="donut-gauge-wrap">
            <svg class="donut-gauge-svg" viewBox="0 0 120 120">
              <circle class="donut-track" cx="60" cy="60" r="48"></circle>
              <circle class="donut-fill-present" id="donut-gauge-circle" cx="60" cy="60" r="48"
                stroke-dasharray="301.6" stroke-dashoffset="301.6"></circle>
            </svg>
            <div class="donut-gauge-center">
              <span class="donut-gauge-pct" id="donut-pct-text">0%</span>
              <span class="donut-gauge-label">Present</span>
            </div>
          </div>

          <!-- Right: Metric Count Rows -->
          <div class="attendance-counts-list">
            <!-- Present -->
            <div class="att-count-row">
              <div class="att-count-left">
                <span class="att-row-icon icon-present">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <polyline points="16 11 18 13 22 9"></polyline>
                  </svg>
                </span>
                <span class="att-row-label">Present</span>
              </div>
              <span class="att-row-value" id="att-present-val">0</span>
            </div>

            <!-- Absent -->
            <div class="att-count-row">
              <div class="att-count-left">
                <span class="att-row-icon icon-absent">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <line x1="17" y1="10" x2="21" y2="14"></line>
                    <line x1="21" y1="10" x2="17" y2="14"></line>
                  </svg>
                </span>
                <span class="att-row-label">Absent</span>
              </div>
              <span class="att-row-value" id="att-absent-val">0</span>
            </div>

            <!-- Total Students -->
            <div class="att-count-row">
              <div class="att-count-left">
                <span class="att-row-icon icon-total">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </span>
                <span class="att-row-label">Total Students</span>
              </div>
              <span class="att-row-value" id="att-total-val">0</span>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function update(stats = {}, filterDeptCode = 'ALL') {
    cachedData = stats;
    const donutPct = document.getElementById('donut-pct-text');
    const donutCircle = document.getElementById('donut-gauge-circle');
    const elPresent = document.getElementById('att-present-val');
    const elAbsent = document.getElementById('att-absent-val');
    const elTotal = document.getElementById('att-total-val');

    let pct = 0;
    let presentCount = 0;
    let absentCount = 0;
    let totalCount = 0;

    const totalStudents = Number(stats.total_enrolled_students ?? stats.total_students ?? 0);

    if (filterDeptCode === 'ALL') {
      const att = stats.today_attendance || {};
      const hasRecords = Boolean(att.has_records && att.total_records > 0);
      pct = hasRecords ? Math.round(att.attendance_pct) : 0;
      presentCount = Number(att.present_count ?? 0);
      absentCount = Number(att.absent_count ?? 0);
      totalCount = Number(att.total_records ?? totalStudents);
    } else {
      const dept = (stats.department_breakdown || []).find(x => x.code === filterDeptCode);
      if (dept && dept.total_records > 0) {
        pct = Math.round(dept.attendance_pct);
        presentCount = Number(dept.present_count ?? 0);
        absentCount = Math.max(0, Number(dept.total_records) - presentCount);
        totalCount = Number(dept.total_records);
      } else if (dept) {
        totalCount = Number(dept.student_count ?? 0);
      }
    }

    if (donutPct) donutPct.textContent = `${pct}%`;
    if (elPresent) elPresent.textContent = presentCount.toLocaleString();
    if (elAbsent) elAbsent.textContent = absentCount.toLocaleString();
    if (elTotal) elTotal.textContent = totalCount.toLocaleString();

    // Calculate ring offset
    const circumference = 301.6;
    if (donutCircle) {
      const offset = circumference * (1 - Math.min(Math.max(pct, 0), 100) / 100);
      donutCircle.style.strokeDashoffset = offset;
    }

    // Populate department select dropdown if not populated
    populateDeptDropdown(stats.department_breakdown || []);
  }

  function populateDeptDropdown(depts) {
    const sel = document.getElementById('overview-dept-filter');
    if (!sel || sel.options.length > 1) return;

    depts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.code;
      opt.textContent = `${d.code} (${d.name || d.code})`;
      sel.appendChild(opt);
    });

    sel.onchange = () => {
      if (cachedData) update(cachedData, sel.value);
    };
  }

  function mount(target, stats = {}) {
    const el = (typeof target === 'string') ? document.querySelector(target) : target;
    if (!el) return;
    el.innerHTML = renderHtml();
    update(stats);
  }

  window.AdminAttendanceOverview = {
    mount,
    update,
    renderHtml
  };
})();

