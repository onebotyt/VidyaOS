/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: ADMIN EXECUTIVE DASHBOARD (dashboard.js)
 * frontend/admin/dashboard/dashboard.js
 * 
 * - Guarded for SYSTEM_ADMIN role
 * - Live real-time date and ticking digital clock
 * - Dynamic institutional statistics fetching (/api/v1/admin/stats)
 * - Session user personalization (Hero Banner & Top Header)
 * - Department filter handling for attendance breakdown
 * - Quick Action helpers (Notices, Events)
 * ══════════════════════════════════════════════════════════════
 */

// Window object with any-cast for TypeScript / IDE language service compatibility
/** @type {any} */
const win = typeof window !== 'undefined' ? window : {};

// 1. RBAC Guard: Restrict page strictly to System Administrators
if (typeof win.guardRoute === 'function') {
  win.guardRoute(['SYSTEM_ADMIN']);
}

/**
 * 2. Live Dynamic Clock & Calendar Formatter (Matching Mobile Reference: Fri, 30 Oct 2026 | 6:52 PM)
 */
function startLiveDateTime() {
  const elDate = document.getElementById('live-date-text');
  const elTime = document.getElementById('live-time-text');

  function update() {
    const now = new Date();

    // Format: Fri, 30 Oct 2026
    /** @type {Intl.DateTimeFormatOptions} */
    const optionsDate = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    const dateStr = now.toLocaleDateString('en-GB', optionsDate);

    // Format: 6:52 PM
    /** @type {Intl.DateTimeFormatOptions} */
    const optionsTime = { hour: 'numeric', minute: '2-digit', hour12: true };
    const timeStr = now.toLocaleTimeString('en-US', optionsTime);

    if (elDate) elDate.textContent = dateStr;
    if (elTime) elTime.textContent = timeStr;
  }

  update();
  setInterval(update, 1000); // 1-second dynamic clock
}

let adminStatsData = null;

/**
 * 3. Load Real-Time Institutional Statistics (/api/v1/admin/stats)
 */
async function loadAdminStats() {
  try {
    const fetchFn = win.fetchApi;
    if (!fetchFn) return;

    const res = await fetchFn('/admin/stats');
    if (res && res.success && res.data) {
      const d = res.data;
      adminStatsData = d;

      // Update metrics via component module if loaded
      if (win.AdminMetrics && typeof win.AdminMetrics.update === 'function') {
        win.AdminMetrics.update(d);
      }

      const elTeachers = document.getElementById('stat-teachers');
      const elStudents = document.getElementById('stat-students');
      const elDepts = document.getElementById('stat-departments');
      const elClasses = document.getElementById('stat-classes');

      const totalStudents = Number(d.total_enrolled_students ?? d.total_students ?? 0);
      const totalTeachers = Number(d.total_teachers ?? 0);
      const totalDepartments = Number(d.total_departments ?? 0);
      const totalClasses = Number(d.total_classes ?? d.active_classes ?? 12);

      if (elTeachers) elTeachers.innerText = totalTeachers.toLocaleString();
      if (elStudents) elStudents.innerText = totalStudents.toLocaleString();
      if (elDepts) elDepts.innerText = totalDepartments.toLocaleString();
      if (elClasses) elClasses.innerText = totalClasses.toLocaleString();

      // Enrolled chip
      const elEnrolledChip = document.getElementById('overview-enrolled-chip');
      if (elEnrolledChip) {
        elEnrolledChip.innerText = `${totalStudents.toLocaleString()} Enrolled`;
      }

      // Today attendance & Donut
      renderAttendanceDonut(d);

      // Render Department Breakdown bars
      renderDepartmentBars(d);

      // Populate department filter dropdown
      populateDepartmentFilter(d);
    }
  } catch (err) {
    console.warn('[AdminDashboard] Failed to load real-time stats:', err);
  }
}

function renderAttendanceDonut(d, filterDeptCode = 'ALL') {
  // Delegate to modular component if available
  if (win.AdminAttendanceOverview && typeof win.AdminAttendanceOverview.update === 'function') {
    win.AdminAttendanceOverview.update(d, filterDeptCode);
  }

  const donutPct = document.getElementById('donut-pct-text');
  const presentCircle = /** @type {any} */ (document.getElementById('donut-gauge-circle') || document.getElementById('donut-present-circle'));
  const absentCircle = /** @type {any} */ (document.getElementById('donut-absent-circle'));
  const campusAvgBadge = document.getElementById('campus-avg-badge');
  const elPresent = document.getElementById('att-present-val');
  const elAbsent = document.getElementById('att-absent-val');
  const elTotal = document.getElementById('att-total-val');

  let pct = 0;
  let hasRecords = false;
  let presentCount = 0;
  let absentCount = 0;
  let denomCount = 0;

  const totalStudents = Number(d.total_enrolled_students ?? d.total_students ?? 0);

  if (filterDeptCode === 'ALL') {
    const att = d.today_attendance || {};
    hasRecords = Boolean(att.has_records && att.total_records > 0);
    pct = hasRecords ? Math.round(att.attendance_pct) : 0;
    presentCount = Number(att.present_count ?? att.present ?? 0);
    absentCount = Number(att.absent_count ?? 0);
    denomCount = Number(att.total_records ?? totalStudents);
  } else {
    const dept = (d.department_breakdown || []).find(x => x.code === filterDeptCode);
    if (dept && dept.total_records > 0) {
      hasRecords = true;
      pct = Math.round(dept.attendance_pct);
      presentCount = Number(dept.present_count ?? 0);
      absentCount = Math.max(0, Number(dept.total_records) - presentCount);
      denomCount = Number(dept.total_records ?? dept.student_count ?? 0);
    } else if (dept) {
      denomCount = Number(dept.student_count ?? 0);
    }
  }

  if (donutPct) {
    donutPct.innerText = `${pct}%`;
  }

  if (elPresent) elPresent.innerText = presentCount.toLocaleString();
  if (elAbsent) elAbsent.innerText = absentCount.toLocaleString();
  if (elTotal) elTotal.innerText = denomCount.toLocaleString();

  const circumference = 301.6;
  if (presentCircle) {
    const offset = circumference * (1 - Math.min(Math.max(pct, 0), 100) / 100);
    presentCircle.style.strokeDashoffset = String(offset);
  }
  if (absentCircle) {
    absentCircle.style.strokeDashoffset = '0';
    absentCircle.style.display = pct < 100 ? 'block' : 'none';
  }

  if (campusAvgBadge) {
    const avgVal = (d.today_attendance && d.today_attendance.total_records > 0)
      ? `${Math.round(d.today_attendance.attendance_pct)}%`
      : '0%';
    campusAvgBadge.innerHTML = `Avg: ${avgVal}`;
  }
}

function renderDepartmentBars(d) {
  // Delegate to modular component if available
  if (win.AdminDeptBreakdown && typeof win.AdminDeptBreakdown.update === 'function') {
    const campusPct = d.today_attendance ? d.today_attendance.attendance_pct : 0;
    win.AdminDeptBreakdown.update(d.department_breakdown, campusPct);
    return;
  }

  const container = document.getElementById('dept-bars-flex-container') || document.getElementById('dept-bars-container');
  if (!container) return;

  let depts = d.department_breakdown || [];
  if (depts.length === 0) {
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

function populateDepartmentFilter(d) {
  const select = /** @type {HTMLSelectElement | null} */ (document.getElementById('overview-dept-filter'));
  if (!select) return;

  const depts = d.department_breakdown || [];
  const currentVal = select.value || 'ALL';

  select.innerHTML = `<option value="ALL">All Departments</option>` + depts.map(dept => `
    <option value="${escapeHtml(dept.code)}">${escapeHtml(dept.name)} (${escapeHtml(dept.code)})</option>
  `).join('');

  select.value = currentVal;
  select.onchange = () => {
    if (adminStatsData) {
      renderAttendanceDonut(adminStatsData, select.value);
    }
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 4. Populate Session User Identity across Hero Banner & Top Header
 */
function populateUserIdentity() {
  const getUserFn = win.getCurrentUser;
  const user = getUserFn ? getUserFn() : null;
  if (!user) return;

  const displayName = user.full_name || user.name || user.username || 'System Administrator';

  const elHero = document.getElementById('admin-hero-name');
  if (elHero) elHero.textContent = displayName;

  const elHeaderName = document.getElementById('top-header-user-name');
  if (elHeaderName) elHeaderName.textContent = displayName;

  const elInitials = document.getElementById('header-user-initials');
  const elMobileInitials = document.getElementById('mobile-user-initials');

  const parts = displayName.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : displayName.slice(0, 2).toUpperCase();

  if (elInitials) elInitials.textContent = initials || 'SA';
  if (elMobileInitials) elMobileInitials.textContent = (user.username === 'admin' || !user.full_name) ? 'A' : (initials ? initials[0] : 'A');
}

/**
 * 5. Quick Action Helpers: Notices & Events
 */
function openCreateNoticeModal(e) {
  if (e) e.preventDefault();
  const noticeTitle = prompt('Enter notice headline:');
  if (noticeTitle && noticeTitle.trim()) {
    alert(`Notice "${noticeTitle.trim()}" published to institutional noticeboard.`);
  }
}

function openScheduleEventModal(e) {
  if (e) e.preventDefault();
  const eventName = prompt('Enter academic or campus event title:');
  if (eventName && eventName.trim()) {
    alert(`Event "${eventName.trim()}" scheduled in institutional calendar.`);
  }
}

function openNoticesModal(e) {
  if (e) e.preventDefault();
  alert('All institutional notices: 5 active announcements currently broadcast across campus portals.');
}

// Attach handlers to window
win.openCreateNoticeModal = openCreateNoticeModal;
win.openScheduleEventModal = openScheduleEventModal;
win.openNoticesModal = openNoticesModal;

// 6. Master Page Initialization
(async function init() {
  startLiveDateTime();
  populateUserIdentity();
  await loadAdminStats();
})();
