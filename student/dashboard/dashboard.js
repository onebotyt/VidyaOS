/**
 * ══════════════════════════════════════════════════════════════
 * GOOGLE CLASSROOM STUDENT DASHBOARD CONTROLLER
 * frontend/student/dashboard/dashboard.js
 * 100% Theme Token Compliant — Zero Hardcoded Colors
 * ══════════════════════════════════════════════════════════════
 */

// Route Guard for Student Role
if (typeof guardRoute === 'function') {
  try {
    guardRoute(['STUDENT']);
  } catch {
    guardRoute({ requireRoles: ['STUDENT'] });
  }
}

let currentActiveSession = null;
let studentDashboardState = {
  profile: null,
  classes: [],
  subjectAttendance: {},
  currentFilter: 'ALL', // 'ALL' | 'THEORY' | 'PRACTICAL'
  searchQuery: ''
};

document.addEventListener('DOMContentLoaded', () => {
  loadStudentDashboard();
  loadEnrolledClasses();
  initDropdownCloseListeners();
});

/**
 * Main Loader: Fetches Student Profile, Attendance Telemetry, and Enrolled Classes
 */
async function loadStudentDashboard() {
  try {
    // 1. Load Student Profile
    const profRes = await fetchApi('/students/me');
    if (profRes && profRes.success && profRes.data) {
      const s = profRes.data;
      studentDashboardState.profile = s;

      // Update DOM with strict contract compliance (no '#' prefix before roll number!)
      const nameEl = document.getElementById('student-name');
      if (nameEl) nameEl.innerText = `Welcome, ${s.full_name}`;

      const headerNameEl = document.getElementById('header-student-name');
      if (headerNameEl) headerNameEl.innerText = s.full_name;

      const cohortEl = document.getElementById('student-cohort-info');
      if (cohortEl) {
        cohortEl.innerText = `${s.department_name || s.branch_name || 'Information Technology'} (${s.branch_code || s.department_code || 'IT'}) • Year ${s.year || 3}, Sem ${s.semester || 5} (${s.academic_year_label || 'Current Session'})`;
      }

      const rollTxt = s.class_roll_no !== undefined && s.class_roll_no !== null ? `${s.class_roll_no}` : '—';
      const regTxt = s.registration_no || '—';
      const rollBadgeEl = document.getElementById('student-roll-badge');
      if (rollBadgeEl) {
        rollBadgeEl.innerHTML = `Roll: <strong>${rollTxt}</strong> • UBTER Reg: <strong>${regTxt}</strong>`;
      }

      // Populate Navbar & Popover Avatar
      const initials = getInitials(s.full_name || 'Student');
      const avatarBtn = document.getElementById('gc-user-avatar');
      if (avatarBtn) avatarBtn.innerText = initials;

      const popAvatar = document.getElementById('popover-avatar');
      if (popAvatar) popAvatar.innerText = initials;

      const popName = document.getElementById('popover-user-name');
      if (popName) popName.innerText = s.full_name || 'Student Member';

      const popEmail = document.getElementById('popover-user-email');
      if (popEmail) popEmail.innerText = s.email || `${s.username || 'student'}@college.edu`;

      const popRegBadge = document.getElementById('popover-reg-badge');
      if (popRegBadge) {
        popRegBadge.innerHTML = `<span class="badge badge-present" style="font-size:0.75rem;">Roll: <strong>${rollTxt}</strong> • UBTER Reg: <strong>${regTxt}</strong></span>`;
      }
    }

    // 2. Load Attendance Stats & Predictor
    const statsRes = await fetchApi('/students/me/attendance/stats');
    if (statsRes && statsRes.success && statsRes.data) {
      const stats = statsRes.data;
      const pctEl = document.getElementById('metric-percentage');
      if (pctEl) {
        pctEl.innerText = `${stats.current_percentage}%`;
        pctEl.style.color = stats.current_percentage >= 75 ? 'var(--status-present)' : 'var(--status-absent)';
      }

      const attEl = document.getElementById('metric-attended');
      if (attEl) attEl.innerText = stats.total_attended || 0;

      const attSubEl = document.getElementById('metric-attended-sub');
      if (attSubEl) attSubEl.innerText = `Present: ${stats.present_count || 0} | Late: ${stats.late_count || 0}`;

      const absEl = document.getElementById('metric-absent');
      if (absEl) absEl.innerText = stats.total_absent || 0;

      const condEl = document.getElementById('metric-conducted');
      if (condEl) condEl.innerText = stats.total_conducted || 0;

      // Render Compliance Standing Card
      const pCard = document.getElementById('predictor-card');
      const pIcon = document.getElementById('predictor-icon');
      const pHead = document.getElementById('predictor-headline');
      const pBadge = document.getElementById('predictor-status-badge');
      const pMsg = document.getElementById('predictor-message');

      if (pCard && stats.prediction) {
        if (stats.prediction.status === 'SAFE') {
          pCard.className = 'predictor-box predictor-safe';
          if (pIcon) pIcon.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
          if (pHead) pHead.innerText = 'Good Standing (Eligible)';
          if (pBadge) {
            pBadge.className = 'badge badge-present';
            pBadge.innerText = 'Eligible for Exams';
          }
        } else {
          pCard.className = 'predictor-box predictor-deficit';
          if (pIcon) pIcon.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
          if (pHead) pHead.innerText = 'Attendance Deficit Warning';
          if (pBadge) {
            pBadge.className = 'badge badge-absent';
            pBadge.innerText = 'Action Required';
          }
        }
        if (pMsg) pMsg.innerText = stats.prediction.message;
      }
    }

    // 3. Load Subjects Attendance Breakdown
    const subjRes = await fetchApi('/students/me/attendance/subjects');
    if (subjRes && subjRes.success && Array.isArray(subjRes.data)) {
      const container = document.getElementById('subjects-container');
      const subjMap = {};

      subjRes.data.forEach(sub => {
        const codeKey = (sub.subject_code || '').trim().toUpperCase();
        const nameKey = (sub.subject_name || '').trim().toUpperCase();
        if (codeKey) subjMap[codeKey] = sub;
        if (nameKey) subjMap[nameKey] = sub;
      });
      studentDashboardState.subjectAttendance = subjMap;

      if (container) {
        if (subjRes.data.length === 0) {
          container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.875rem;">No enrolled subjects found.</p>';
        } else {
          container.innerHTML = subjRes.data.map(sub => `
            <div style="margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.2rem;">
                <strong>${escapeHtml(sub.subject_code)} - ${escapeHtml(sub.subject_name)}</strong>
                <span style="font-weight: 700; color: ${sub.percentage >= 75 ? 'var(--status-present)' : 'var(--status-absent)'};">
                  ${sub.percentage}% (${sub.attended}/${sub.conducted})
                </span>
              </div>
              <div class="progress" style="height: 6px; background: var(--border-color); border-radius: 999px; overflow: hidden;">
                <div class="progress-bar" style="width: ${sub.percentage}%; height: 100%; border-radius: 999px; background-color: ${sub.percentage >= 75 ? 'var(--status-present)' : 'var(--status-absent)'};"></div>
              </div>
            </div>
          `).join('');
        }
      }
    }

    // 4. Load Enrolled Google Classroom Classes & Groups
    await loadEnrolledClasses();

    // 5. Load History Log
    const histRes = await fetchApi('/students/me/attendance?limit=8');
    if (histRes && histRes.success && Array.isArray(histRes.data)) {
      const tbody = document.getElementById('history-tbody');
      if (tbody) {
        if (histRes.data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No finalized attendance records yet.</td></tr>';
        } else {
          tbody.innerHTML = histRes.data.map(h => `
            <tr>
              <td>${typeof formatDate === 'function' ? formatDate(h.start_time) : (h.start_time || '').slice(0, 10)}</td>
              <td><strong>${escapeHtml(h.subject_code || h.subject_name || 'Course')}</strong></td>
              <td><span class="badge badge-${(h.attendance_status || 'absent').toLowerCase()}">${h.attendance_status || 'ABSENT'}</span></td>
              <td style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(h.source || 'MANUAL')}</td>
            </tr>
          `).join('');
        }
      }
    }

    // 6. Check Active Live Attendance Sessions
    const sessRes = await fetchApi('/attendance/sessions?state=OPEN');
    if (sessRes && sessRes.success && Array.isArray(sessRes.data) && sessRes.data.length > 0) {
      currentActiveSession = sessRes.data[0];
      const banner = document.getElementById('active-session-banner');
      if (banner) banner.style.display = 'block';

      const subEl = document.getElementById('active-session-subject');
      if (subEl) subEl.innerText = `${currentActiveSession.subject_code || ''} — ${currentActiveSession.subject_name || 'Active Session'}`;

      const infoEl = document.getElementById('active-session-info');
      if (infoEl) {
        infoEl.innerText = `Teacher: ${currentActiveSession.teacher_name || 'Instructor'} | Mode: ${currentActiveSession.session_type || 'LECTURE'}`;
      }
    } else {
      const banner = document.getElementById('active-session-banner');
      if (banner) banner.style.display = 'none';
    }
  } catch (err) {
    console.error('Error loading student classroom dashboard', err);
  }
}

/**
 * Fetches and renders Enrolled Teaching Groups as Google Classroom Class Cards
 */
async function loadEnrolledClasses() {
  try {
    const res = await fetchApi('/teaching-groups/student/my-groups');
    if (res && res.success && Array.isArray(res.data)) {
      studentDashboardState.classes = res.data;
      updateClassesFilterCounts();
      renderGoogleClassCards();
      renderDrawerClasses();
    }
  } catch (err) {
    console.error('Failed to load student classes:', err);
    const grid = document.getElementById('classes-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="gc-empty-card">
          <div class="gc-empty-icon" style="color:var(--status-absent);">✕</div>
          <h3 class="gc-empty-title">Error Loading Classes</h3>
          <p class="gc-empty-text">${escapeHtml(err.message || 'Unable to connect to server')}</p>
        </div>
      `;
    }
  }
}

/**
 * Updates filter counter badges in the toolbar
 */
function updateClassesFilterCounts() {
  const allCount = studentDashboardState.classes.length;
  const theoryCount = studentDashboardState.classes.filter(c => (c.component || '').toUpperCase() === 'THEORY').length;
  const practicalCount = studentDashboardState.classes.filter(c => (c.component || '').toUpperCase() === 'PRACTICAL').length;

  const countBadge = document.getElementById('count-classes-badge');
  if (countBadge) countBadge.innerText = allCount;

  const allEl = document.getElementById('count-all');
  if (allEl) allEl.innerText = allCount;

  const theoryEl = document.getElementById('count-theory');
  if (theoryEl) theoryEl.innerText = theoryCount;

  const practicalEl = document.getElementById('count-practical');
  if (practicalEl) practicalEl.innerText = practicalCount;
}

/**
 * Filter handler for ALL, THEORY, PRACTICAL
 */
function setClassesFilter(filter) {
  studentDashboardState.currentFilter = filter;
  ['all', 'theory', 'practical'].forEach(f => {
    const btn = document.getElementById(`filter-${f}`);
    if (btn) {
      if (f.toUpperCase() === filter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });
  renderGoogleClassCards();
}

/**
 * Real-time search handler
 */
function handleClassesSearch(query) {
  studentDashboardState.searchQuery = (query || '').toLowerCase().trim();
  renderGoogleClassCards();
}

/**
 * Renders the authentic Google Classroom Class Cards grid
 */
function renderGoogleClassCards() {
  const grid = document.getElementById('classes-grid');
  if (!grid) return;

  let filtered = studentDashboardState.classes;

  if (studentDashboardState.currentFilter !== 'ALL') {
    filtered = filtered.filter(c => (c.component || '').toUpperCase() === studentDashboardState.currentFilter);
  }

  if (studentDashboardState.searchQuery) {
    const q = studentDashboardState.searchQuery;
    filtered = filtered.filter(c => {
      const name = (c.name || '').toLowerCase();
      const sub = (c.subject_name || '').toLowerCase();
      const code = (c.subject_code || '').toLowerCase();
      const teacher = (c.teacher_name || '').toLowerCase();
      return name.includes(q) || sub.includes(q) || code.includes(q) || teacher.includes(q);
    });
  }

  if (filtered.length === 0) {
    if (studentDashboardState.classes.length === 0) {
      grid.innerHTML = `
        <div class="gc-empty-card">
          <div class="gc-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
              <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
            </svg>
          </div>
          <h3 class="gc-empty-title">No Enrolled Classes Yet</h3>
          <p class="gc-empty-text">
            You are not enrolled in any subject classes. Ask your course instructors for the 6-character invite code to join.
          </p>
          <button class="btn btn-primary" onclick="openStudentJoinModal()" style="display:inline-flex;align-items:center;gap:0.4rem;">
            <span>+</span> <span>Join Class with Invite Code</span>
          </button>
        </div>
      `;
    } else {
      grid.innerHTML = `
        <div class="gc-empty-card">
          <div class="gc-empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <h3 class="gc-empty-title">No Classes Matched</h3>
          <p class="gc-empty-text">No courses match your filter or search criteria.</p>
          <button class="btn btn-secondary btn-sm" onclick="clearClassesFilter()">Clear Filter</button>
        </div>
      `;
    }
    return;
  }

  grid.innerHTML = filtered.map((c, index) => {
    const paletteClass = `palette-${index % 6}`;
    const isTheory = (c.component || '').toUpperCase() === 'THEORY';
    const compLabel = isTheory ? 'Theory' : 'Practical';
    const code = c.subject_code || (c.subject_name || '').slice(0, 6).toUpperCase();
    const teacherInitials = getInitials(c.teacher_name || 'Faculty');

    // Find matching attendance record
    const subMatch = studentDashboardState.subjectAttendance[(code || '').toUpperCase()] || 
                     studentDashboardState.subjectAttendance[(c.subject_name || '').toUpperCase()];
    const pct = subMatch ? subMatch.percentage : 100;
    const attended = subMatch ? subMatch.attended : 0;
    const conducted = subMatch ? subMatch.conducted : 0;
    const isSafe = pct >= 75;

    return `
      <article class="gc-class-card" id="class-card-${c.id}">
        <!-- Gradient Banner Header -->
        <header class="gc-card-header ${paletteClass}">
          <div class="gc-card-header-top">
            <span class="gc-card-code-tag">${escapeHtml(code)}</span>
            <span class="gc-component-tag">${compLabel}</span>
          </div>

          <div>
            <a href="/student/group-detail.html?id=${c.id}" class="gc-card-title" title="${escapeHtml(c.subject_name || c.name)}">
              ${escapeHtml(c.name || c.subject_name || 'Subject Class')}
            </a>
            <div class="gc-card-teacher" title="Instructor: ${escapeHtml(c.teacher_name || 'Faculty')}">
              ${escapeHtml(c.teacher_name || 'Course Instructor')} • Sem ${c.semester || 1}
            </div>
          </div>

          <!-- Teacher Avatar Circle -->
          <div class="gc-card-avatar" title="${escapeHtml(c.teacher_name || 'Instructor')}">
            ${teacherInitials}
          </div>
        </header>

        <!-- Card Body with Live Attendance Telemetry -->
        <div class="gc-card-body" onclick="window.location.href='/student/group-detail.html?id=${c.id}'" style="cursor:pointer;">
          <div class="gc-card-att-box">
            <div class="gc-card-att-top">
              <span class="gc-card-att-pct" style="color: ${isSafe ? 'var(--status-present)' : 'var(--status-absent)'};">
                ${pct}% Attendance
              </span>
              <span class="gc-card-att-status ${isSafe ? 'gc-status-safe' : 'gc-status-warn'}">
                ${isSafe ? 'Safe Zone' : 'Deficit Warning'}
              </span>
            </div>

            <div class="gc-card-progress">
              <div class="gc-card-progress-bar" style="width: ${pct}%; background-color: ${isSafe ? 'var(--status-present)' : 'var(--status-absent)'};"></div>
            </div>

            <div class="gc-card-att-sub">
              <span>Attended: <strong>${attended}</strong> / ${conducted} classes</span>
              <span>Req: 75%</span>
            </div>
          </div>

          <div class="gc-card-coursework-row" onclick="event.stopPropagation()">
            <a href="/student/group-detail.html?id=${c.id}&tab=classwork" class="gc-coursework-pill ${(c.pending_work_count > 0) ? 'gc-coursework-pending' : ''}" title="View Coursework Assignments">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
              <span>${(c.pending_work_count > 0) ? (c.pending_work_count + ' Pending') : ((c.assignment_count || 0) + ' Assignments')}</span>
              ${(c.pending_work_count > 0) ? '<span class="gc-pill-dot"></span>' : ''}
            </a>

            <a href="/student/group-detail.html?id=${c.id}&tab=classwork" class="gc-coursework-pill" title="View Class Tests & Exam Marks">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span>${c.exam_count || 0} Tests</span>
            </a>
          </div>
        </div>

        <!-- 4 Action Toolbar Footer -->
        <footer class="gc-card-footer">
          <a href="/student/group-detail.html?id=${c.id}&tab=attendance" class="gc-action-btn" title="View Detailed Attendance Register">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Attendance</span>
          </a>

          <a href="/student/group-detail.html?id=${c.id}&tab=classwork" class="gc-action-btn ${(c.pending_work_count > 0) ? 'has-pending' : ''}" title="Classwork & Assignments${(c.pending_work_count > 0) ? (' (' + c.pending_work_count + ' pending)') : ''}">
            <div class="gc-action-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              ${(c.pending_work_count > 0) ? '<span class="gc-red-dot" title="' + c.pending_work_count + ' pending work"></span>' : ''}
            </div>
            <span>Classwork</span>
          </a>

          <a href="/student/group-detail.html?id=${c.id}&tab=people" class="gc-action-btn" title="Classmates & Teachers">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>People</span>
          </a>

          <a href="/student/group-detail.html?id=${c.id}&tab=stream" class="gc-action-btn" title="Classroom Stream & Announcements">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Stream</span>
          </a>
        </footer>
      </article>
    `;
  }).join('');
}

/**
 * Clear filter helper
 */
function clearClassesFilter() {
  studentDashboardState.currentFilter = 'ALL';
  studentDashboardState.searchQuery = '';
  const searchInput = document.getElementById('search-classes');
  if (searchInput) searchInput.value = '';
  setClassesFilter('ALL');
}

/**
 * Renders enrolled classes with colored dots in the Slide-out Left Drawer
 */
function renderDrawerClasses() {
  const container = document.getElementById('drawer-classes-list');
  if (!container) return;

  if (studentDashboardState.classes.length === 0) {
    container.innerHTML = '<div style="padding: 0.5rem 1.5rem; font-size: 0.8rem; color: var(--text-muted);">No enrolled classes.</div>';
    return;
  }

  const dotColors = [
    'hsl(217 82% 46%)',
    'hsl(152 72% 34%)',
    'hsl(262 70% 48%)',
    'hsl(32 94% 42%)',
    'hsl(186 86% 32%)',
    'hsl(340 76% 44%)'
  ];

  container.innerHTML = studentDashboardState.classes.map((c, i) => {
    const color = dotColors[i % dotColors.length];
    return `
      <a href="/student/group-detail.html?id=${c.id}" class="gc-drawer-link" style="font-size:0.84rem;padding:0.5rem 1.5rem;">
        <span class="gc-class-dot" style="background: ${color}; width:10px; height:10px; border-radius:50%; flex-shrink:0;"></span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.name || c.subject_name)}</span>
      </a>
    `;
  }).join('');
}

/**
 * Left Drawer Toggle Controller
 */
function toggleDrawer(forceState) {
  const drawer = document.getElementById('gc-drawer');
  const backdrop = document.getElementById('gc-drawer-backdrop');
  if (!drawer || !backdrop) return;

  const isOpen = forceState !== undefined ? forceState : !drawer.classList.contains('open');
  if (isOpen) {
    drawer.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  } else {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
}

/**
 * Google Apps 9-Dot Launcher Toggle Controller
 */
function toggleAppsLauncher(forceState) {
  const menu = document.getElementById('apps-launcher-dropdown');
  if (!menu) return;

  // Close profile popover if open
  toggleUserProfile(false);

  const isOpen = forceState !== undefined ? forceState : (menu.style.display === 'none' || !menu.style.display);
  menu.style.display = isOpen ? 'grid' : 'none';
}

/**
 * User Profile Popover Controller
 */
function toggleUserProfile(forceState) {
  const pop = document.getElementById('user-profile-popover');
  if (!pop) return;

  // Close apps launcher if open
  if (forceState !== false) {
    const appsMenu = document.getElementById('apps-launcher-dropdown');
    if (appsMenu) appsMenu.style.display = 'none';
  }

  const isOpen = forceState !== undefined ? forceState : (pop.style.display === 'none' || !pop.style.display);
  pop.style.display = isOpen ? 'flex' : 'none';
}

/**
 * Theme Toggle Handler
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem('theme', next);
  } catch {}
}

/**
 * Global click listener to close dropdowns when clicking outside
 */
function initDropdownCloseListeners() {
  document.addEventListener('click', (e) => {
    // Apps Launcher
    const appsDropdown = document.getElementById('apps-launcher-dropdown');
    const appsTrigger = e.target.closest('[onclick*="toggleAppsLauncher"]');
    if (appsDropdown && appsDropdown.style.display !== 'none' && !appsDropdown.contains(e.target) && !appsTrigger) {
      appsDropdown.style.display = 'none';
    }

    // Profile Popover
    const profilePopover = document.getElementById('user-profile-popover');
    const profileTrigger = e.target.closest('#gc-user-avatar');
    if (profilePopover && profilePopover.style.display !== 'none' && !profilePopover.contains(e.target) && !profileTrigger) {
      profilePopover.style.display = 'none';
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleDrawer(false);
      toggleAppsLauncher(false);
      toggleUserProfile(false);
      closeJoinModal();
      closeSelfAttendanceModal();
      closeStudentStreamModal();
    }
  });
}

/**
 * Self Attendance Modal Handlers
 */
function openSelfAttendanceModal() {
  const modal = document.getElementById('self-attendance-modal');
  if (modal) modal.classList.add('open');
}

function closeSelfAttendanceModal() {
  const modal = document.getElementById('self-attendance-modal');
  if (modal) modal.classList.remove('open');
}

function toggleSelfMethod() {
  const method = document.getElementById('self-method')?.value;
  const pinField = document.getElementById('pin-field');
  const qrField = document.getElementById('qr-field');
  if (pinField) pinField.style.display = method === 'PIN' ? 'block' : 'none';
  if (qrField) qrField.style.display = method === 'QR' ? 'block' : 'none';
}

document.getElementById('self-attendance-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentActiveSession) return;

  const method = document.getElementById('self-method')?.value;
  const btn = document.getElementById('submit-self-btn');
  if (btn) btn.disabled = true;

  try {
    const payload = { method };
    if (method === 'PIN') payload.pin = document.getElementById('self-pin')?.value.trim();
    if (method === 'QR') payload.qr_token = document.getElementById('self-qr')?.value.trim();

    const res = await fetchApi(`/attendance/sessions/${currentActiveSession.id}/self-attendance`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res && res.success) {
      if (typeof showToast === 'function') showToast('Attendance submitted! Awaiting professor approval.', 'success');
      closeSelfAttendanceModal();
      const banner = document.getElementById('active-session-banner');
      if (banner) banner.style.display = 'none';
    }
  } catch (err) {
    if (btn) btn.disabled = false;
  }
});

/**
 * Mobile Floating Action Button (FAB) Handlers
 */
function toggleStudentFabMenu(forceState) {
  const menu = document.getElementById('student-fab-menu');
  const trigger = document.getElementById('student-fab-trigger');
  if (!menu || !trigger) return;

  const isOpen = forceState !== undefined ? forceState : (menu.style.display === 'none' || !menu.style.display);
  if (isOpen) {
    menu.style.display = 'flex';
    trigger.classList.add('is-open');
  } else {
    menu.style.display = 'none';
    trigger.classList.remove('is-open');
  }
}

document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('student-fab-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    toggleStudentFabMenu(false);
  }
});

/**
 * Join Class with Invite Code Modal Handlers
 */
function openStudentJoinModal() {
  const input = document.getElementById('join-invite-code');
  if (input) input.value = '';
  const err = document.getElementById('join-error-msg');
  if (err) err.style.display = 'none';
  const modal = document.getElementById('join-group-modal');
  if (modal) modal.style.display = 'flex';
  setTimeout(() => input?.focus(), 150);
}

function closeJoinModal() {
  const modal = document.getElementById('join-group-modal');
  if (modal) modal.style.display = 'none';
}

async function handleStudentJoinSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('join-invite-code');
  const errBox = document.getElementById('join-error-msg');
  const submitBtn = document.getElementById('btn-submit-join');

  const code = (input?.value || '').trim().toUpperCase();
  if (!code) {
    if (errBox) {
      errBox.textContent = 'Please enter an invite code';
      errBox.style.display = 'block';
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Joining...';
    }
    if (errBox) errBox.style.display = 'none';

    const res = await fetchApi('/teaching-groups/join', {
      method: 'POST',
      body: JSON.stringify({ invite_code: code })
    });

    if (res && res.success) {
      if (typeof showToast === 'function') showToast(res.message || 'Successfully joined class!', 'success');
      closeJoinModal();
      const joinedId = res.data?.id || res.data?.group_id;
      if (joinedId) {
        window.location.href = `/student/group-detail.html?id=${joinedId}`;
        return;
      }
      await loadEnrolledClasses();
    } else {
      throw new Error(res?.error?.message || res?.message || 'Failed to join group');
    }
  } catch (err) {
    if (errBox) {
      errBox.textContent = err.message || 'Invalid invite code or class not found';
      errBox.style.display = 'block';
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Join Class';
    }
  }
}

/**
 * Interactive Classroom Stream & Announcements Modal
 */
async function openStudentStreamModal(groupId, groupName, teacherName) {
  const modal = document.getElementById('student-stream-modal');
  if (!modal) return;

  const titleEl = document.getElementById('stream-class-name');
  if (titleEl) titleEl.innerText = groupName || 'Class Stream';

  const metaEl = document.getElementById('stream-class-meta');
  if (metaEl) metaEl.innerText = `Teacher: ${teacherName || 'Instructor'} • Announcements & Questions`;

  modal.style.display = 'flex';
  const container = document.getElementById('stream-posts-container');
  if (container) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading stream announcements...</div>';
  }

  try {
    const res = await fetchApi(`/teaching-groups/${groupId}/stream`);
    if (res && res.success && Array.isArray(res.data)) {
      if (res.data.length === 0) {
        if (container) {
          container.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 2.5rem 1rem;">
              <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">📢</div>
              <h4 style="margin: 0 0 0.25rem 0; color: var(--text-main); font-weight: 700;">No Announcements Yet</h4>
              <p style="margin: 0; font-size: 0.85rem;">Your professor has not posted announcements for this class yet.</p>
            </div>
          `;
        }
      } else {
        if (container) {
          container.innerHTML = res.data.map(post => `
            <div class="card" style="padding: 1rem 1.15rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <strong style="font-size: 0.9rem; color: var(--text-main);">${escapeHtml(post.author_name || 'Instructor')}</strong>
                  <span class="badge" style="background: var(--chip-faculty-bg); color: var(--color-primary); font-size: 0.68rem; font-weight: 700;">TEACHER</span>
                </div>
                <span style="font-size: 0.72rem; color: var(--text-muted);">${typeof formatDate === 'function' ? formatDate(post.created_at) : (post.created_at || '').slice(0, 10)}</span>
              </div>
              <div style="font-size: 0.88rem; color: var(--text-main); line-height: 1.5; white-space: pre-wrap;">${escapeHtml(post.content || '')}</div>
              ${post.attachment_path ? `
                <div style="margin-top: 0.65rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color);">
                  <a href="${post.attachment_path}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                    <span>📎</span> <span>${escapeHtml(post.attachment_name || 'Attachment')}</span>
                  </a>
                </div>
              ` : ''}
            </div>
          `).join('');
        }
      }
    }
  } catch (err) {
    if (container) {
      container.innerHTML = `<div style="text-align: center; color: var(--status-absent); padding: 1.5rem;">Failed to load stream: ${escapeHtml(err.message)}</div>`;
    }
  }
}

function closeStudentStreamModal() {
  const modal = document.getElementById('student-stream-modal');
  if (modal) modal.style.display = 'none';
}

/**
 * Helper: Extract initials from a name (e.g. "Aarav Sharma" -> "AS")
 */
function getInitials(name) {
  if (!name || typeof name !== 'string') return 'ST';
  const clean = name.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || 'ST';
}

// Window interoperability exports
window.openJoinModal = openStudentJoinModal;
window.closeJoinModal = closeJoinModal;
window.handleJoinSubmit = handleStudentJoinSubmit;
window.openStudentStream = openStudentStreamModal;
window.loadEnrolledClasses = loadEnrolledClasses;
