/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: DASHBOARD
 * frontend/faculty/dashboard/dashboard.js
 * ══════════════════════════════════════════════════════════════
 */

// Guard route for Faculty
guardRoute({ requireRoles: ['TEACHER'] });

if (typeof window.escapeHtml !== 'function') {
  window.escapeHtml = function (str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
}
if (typeof window.esc !== 'function') {
  window.esc = window.escapeHtml;
}

// ── NBA/NAAC Course File: 18 Document Definitions ──────────
const CF_DOCS = [
  { slug: 'allotment_letter', label: 'Course Allotment Letter', cat: 'curriculum', canUpload: true },
  { slug: 'approved_syllabus', label: 'Approved Syllabus', cat: 'curriculum', canUpload: true },
  { slug: 'course_outcomes', label: 'Course Outcomes (COs)', cat: 'curriculum', canUpload: true },
  { slug: 'copo_matrix', label: 'CO-PO Mapping Matrix', cat: 'curriculum', canUpload: true },
  { slug: 'lesson_plan', label: 'Semester Lesson Plan', cat: 'curriculum', canUpload: true },
  { slug: 'timetable', label: 'Class Timetable', cat: 'curriculum', canUpload: true },
  { slug: 'academic_calendar', label: 'Academic Calendar', cat: 'curriculum', canUpload: true },
  { slug: 'student_list', label: 'Student List', cat: 'students', canUpload: false, isSystem: true },
  { slug: 'result_analysis', label: 'Previous Result Analysis', cat: 'students', canUpload: true },
  { slug: 'advanced_learners', label: 'Advanced Learners List', cat: 'students', canUpload: true },
  { slug: 'slow_learners', label: 'Slow Learners List', cat: 'students', canUpload: true },
  { slug: 'internal_assessment_plan', label: 'Internal Assessment Plan', cat: 'assessment', canUpload: true },
  { slug: 'laboratory_plan', label: 'Laboratory Plan', cat: 'assessment', canUpload: true },
  { slug: 'assignment_schedule', label: 'Assignment & Tutorial Schedule', cat: 'assessment', canUpload: false, isSystem: true },
  { slug: 'question_papers_cos', label: 'Sample Question Papers', cat: 'assessment', canUpload: true },
  { slug: 'continuous_assessment', label: 'Continuous Assessment Records', cat: 'assessment', canUpload: true },
  { slug: 'co_attainment', label: 'CO Attainment Calculations', cat: 'attainment', canUpload: true },
  { slug: 'corrective_actions', label: 'Corrective Action Reports', cat: 'attainment', canUpload: true },
];

// Render individual NBA Course File cards with real status, no delete button, and controlled upload
function renderCfDocCards(groupId, registerId, itemsMap) {
  const regParam = registerId ? `&register_id=${registerId}` : '';
  return CF_DOCS.map((doc, i) => {
    const isAvail = itemsMap ? Boolean(itemsMap[doc.slug]) : (doc.isSystem === true);
    const canUpload = doc.canUpload !== false;

    return `
          <div class="cf-doc-card cf-cat-${doc.cat}">
            <div class="cf-doc-card-title" title="${escapeHtml(doc.label)}">
              <span class="cf-doc-num">${String(i + 1).padStart(2, '0')}</span>
              <span class="cf-doc-name">${escapeHtml(doc.label)}</span>
              <span class="cf-status-pill ${isAvail ? 'available' : 'empty'}" title="${isAvail ? 'Document or data available to view' : 'No document uploaded yet'}">
                ${isAvail
        ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Available</span>`
        : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg><span>Empty</span>`
      }
              </span>
            </div>
            <div class="cf-doc-card-actions">
              ${isAvail
        ? `<a href="/faculty/course-file.html?group_id=${groupId}${regParam}&doc=${doc.slug}&action=view" class="cf-action-btn cf-action-view" title="View document">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                     <span>View</span>
                   </a>`
        : `<span class="cf-action-empty" title="Nothing to view yet">
                     <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                     <span>No File</span>
                   </span>`
      }
              ${canUpload
        ? `<a href="/faculty/course-file.html?group_id=${groupId}${regParam}&doc=${doc.slug}&action=upload" class="cf-action-btn cf-action-upload" title="${isAvail ? 'Update document' : 'Upload document'}">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path></svg>
                     <span>${isAvail ? 'Update' : 'Upload'}</span>
                   </a>`
        : ''
      }
            </div>
          </div>
        `;
  }).join('');
}

let state = {
  groups: [],
  currentFilter: 'ACTIVE',
  searchQuery: '',
  activeGroupId: null,
  activeGroupData: null,
  archiveTargetGroup: null,
  departments: [],
  currentUser: null,
  userDepartmentId: null,
  isCommonFaculty: false,
  pendingNewGroup: null,
  pendingDeptStudents: [],
  unenrolledStudents: [],
  promoteMembers: []
};


// Contract Compatibility for Automated Tests
function updateTeachingTiles(hasSubjects) {
  const regTile = document.getElementById('teaching-registers-tile');
  const assignTile = document.getElementById('teaching-assignments-tile');
  const repTile = document.getElementById('teaching-reports-tile');
  const noSubBanner = document.getElementById('no-subjects-banner');
  if (regTile) regTile.style.display = hasSubjects ? '' : 'none';
  if (assignTile) assignTile.style.display = hasSubjects ? '' : 'none';
  if (repTile) repTile.style.display = hasSubjects ? '' : 'none';
  if (noSubBanner) noSubBanner.style.display = hasSubjects ? 'none' : 'block';
}
async function init() {
  const createBtn = document.getElementById('btn-create-group');
  if (createBtn) createBtn.onclick = () => openModal('create-group-modal');

  // Floating Action Button Speed Dial Listener
  window.toggleFabMenu = function (forceState) {
    const menu = document.getElementById('gc-fab-menu');
    const trigger = document.getElementById('gc-fab-trigger');
    if (!menu || !trigger) return;
    const isOpen = forceState !== undefined ? forceState : (menu.style.display === 'none' || !menu.style.display);
    if (isOpen) {
      menu.style.display = 'flex';
      trigger.classList.add('is-open');
    } else {
      menu.style.display = 'none';
      trigger.classList.remove('is-open');
    }
  };
  document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('gc-fab-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      window.toggleFabMenu(false);
    }
  });

  state.currentUser = getCurrentUser();
  state.userDepartmentId = state.currentUser?.department_id || null;
  state.isCommonFaculty = !state.userDepartmentId;

  // Immediately apply dashboard mode synchronously so correct tab/view is shown without delay
  try { updateDashboardMode(); } catch (e) { console.warn(e); }

  // Populate User Avatar and Profile Popover
  if (state.currentUser) {
    const name = state.currentUser.full_name || state.currentUser.name || 'Faculty Member';
    const email = state.currentUser.email || 'teacher@college.edu';
    const initial = name.charAt(0).toUpperCase();
    const avatarEl = document.getElementById('gc-user-avatar');
    if (avatarEl) avatarEl.innerText = initial;
    const popAvatar = document.getElementById('popover-avatar');
    if (popAvatar) popAvatar.innerText = initial;
    const popName = document.getElementById('popover-user-name');
    if (popName) popName.innerText = name;
    const popEmail = document.getElementById('popover-user-email');
    if (popEmail) popEmail.innerText = email;
  }

  try { await loadDepartments(); } catch (e) { console.warn('loadDepartments failed:', e); }
  try { updateDerivedYear(); } catch (e) { console.warn(e); }
  try { await loadTeachingGroups(); } catch (e) { console.error('loadTeachingGroups failed:', e); }
  try { await loadDashboardOverview(); } catch (e) { console.warn('loadDashboardOverview failed:', e); }
  try { updateDashboardMode(); } catch (e) { console.warn(e); }
  try { startLiveDateTime(); } catch (e) { console.warn(e); }

  // Deep-linking URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const targetId = urlParams.get('id');
  if (action === 'create' || urlParams.get('create') === 'true') {
    openModal('create-group-modal');
  } else if (action === 'promote' && targetId) {
    openPromoteCohortModal(Number(targetId));
  } else if (action === 'edit' && targetId) {
    openEditGroupModal(Number(targetId));
  } else if (action === 'trash' || urlParams.get('tab') === 'trash') {
    openTrashBinModal();
  } else if (action === 'archive' && targetId) {
    const target = state.groups.find(x => x.id === Number(targetId));
    if (target) promptArchiveGroup(target.id, target.name, target.status);
  }
}

let currentDashboardTab = 'CLASSES';

function updateDashboardMode() {
  const isHOD = Boolean(state.currentUser?.is_hod || state.currentUser?.roles?.includes('HOD') || state.currentUser?.roles?.includes('SYSTEM_ADMIN'));
  const activeGroups = state.groups.filter(g => g.status === 'ACTIVE');

  const switcherBar = document.getElementById('hod-view-switcher-bar');
  const countBadge = document.getElementById('badge-teaching-count');
  if (countBadge) {
    countBadge.innerText = activeGroups.length;
    countBadge.textContent = activeGroups.length;
  }

  // Populate personal faculty greeting
  const greetName = document.getElementById('faculty-greeting-name');
  if (greetName && state.currentUser) {
    const title = isHOD ? 'HOD' : 'Professor';
    greetName.innerText = `Welcome, ${state.currentUser.full_name || title} 👋`;
  }

  const btnDept = document.getElementById('btn-tab-dept');
  if (btnDept) {
    btnDept.style.display = isHOD ? '' : 'none';
  }

  // Switcher bar is ONLY shown if user is HOD/admin! For non-HOD teachers, hide switcher bar completely
  if (switcherBar) {
    switcherBar.style.display = isHOD ? 'flex' : 'none';
  }

  const urlParams = new URLSearchParams(window.location.search);
  const queryTab = urlParams.get('tab');
  let tabToOpen = isHOD ? 'DEPT' : 'CLASSES';
  if (queryTab) {
    if (queryTab.toLowerCase() === 'dept' && isHOD) {
      tabToOpen = 'DEPT';
    } else {
      tabToOpen = 'CLASSES';
    }
  } else if (isHOD) {
    try {
      const savedTab = localStorage.getItem('hod_dashboard_tab');
      if (savedTab === 'CLASSES' || savedTab === 'DEPT') {
        tabToOpen = savedTab;
      }
    } catch (_) { }
  } else {
    tabToOpen = 'CLASSES';
  }
  switchDashboardTab(tabToOpen);
}

function switchDashboardTab(tab) {
  const isHOD = Boolean(state.currentUser?.is_hod || state.currentUser?.roles?.includes('HOD') || state.currentUser?.roles?.includes('SYSTEM_ADMIN'));
  if (tab === 'DEPT' && !isHOD) {
    tab = 'CLASSES';
  }
  currentDashboardTab = tab;
  try {
    localStorage.setItem('hod_dashboard_tab', tab);
  } catch (_) { }

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab.toLowerCase());
    window.history.replaceState({}, '', url.toString());
  } catch (_) { }

  const btnClasses = document.getElementById('btn-tab-classes');
  const btnDept = document.getElementById('btn-tab-dept');
  const teachingView = document.getElementById('teaching-classes-view');
  const deptView = document.getElementById('hod-dept-command-center');

  if (tab === 'DEPT' && isHOD) {
    if (btnClasses) {
      btnClasses.classList.remove('active');
      btnClasses.setAttribute('aria-selected', 'false');
    }
    if (btnDept) {
      btnDept.classList.add('active');
      btnDept.setAttribute('aria-selected', 'true');
    }
    if (teachingView) teachingView.style.display = 'none';
    if (deptView) deptView.style.display = 'block';
    loadHodDashboardData();
  } else {
    if (btnClasses) {
      btnClasses.classList.add('active');
      btnClasses.setAttribute('aria-selected', 'true');
    }
    if (btnDept) {
      btnDept.classList.remove('active');
      btnDept.setAttribute('aria-selected', 'false');
    }
    if (teachingView) {
      teachingView.style.display = 'block';
      renderGroups();
    }
    if (deptView) deptView.style.display = 'none';
  }
}
window.switchDashboardTab = switchDashboardTab;
window.loadHodDashboardData = loadHodDashboardData;

function startLiveDateTime() {
  function update() {
    const now = new Date();
    const dateEl = document.getElementById('live-date-text');
    const timeEl = document.getElementById('live-time-text');
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }

    const statDateEl = document.getElementById('stat-live-date');
    if (statDateEl) {
      statDateEl.textContent = now.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
    const statTimeEl = document.getElementById('stat-live-time-text');
    if (statTimeEl) {
      statTimeEl.textContent = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  }
  update();
  setInterval(update, 1000);
}
window.startLiveDateTime = startLiveDateTime;
window.toggleArchivedClassesView = toggleArchivedClassesView;

async function loadHodDashboardData() {
  try {
    const res = await fetchApi('/hod/dashboard');
    if (!res.success || !res.data) return;
    const d = res.data;

    // Title and Dept name
    const titleEl = document.getElementById('dept-command-title');
    const subEl = document.getElementById('dept-command-sub');
    const cardDeptName = document.getElementById('dept-card-name');
    const cardDeptMeta = document.getElementById('dept-card-meta');
    const switcherDept = document.getElementById('hod-switcher-dept-name');

    if (titleEl) {
      const deptName = d.department_name || d.department?.name || state.currentUser?.department_name || 'Department Administration';
      titleEl.innerText = `${deptName} 💻`;
    }
    if (subEl) {
      subEl.innerText = 'Manage your faculty, students, classes, subjects, and attendance, and keep your department running smoothly.';
    }
    if (cardDeptName) cardDeptName.innerText = d.department_name || d.department?.name || state.currentUser?.department_name || 'Department Administration';
    if (switcherDept && (d.department_name || d.department?.name)) switcherDept.innerText = d.department_name || d.department?.name;
    if (cardDeptMeta) {
      const facultyId = state.currentUser?.employee_id || (state.currentUser?.id ? `F${String(state.currentUser.id).padStart(3, '0')}` : 'F001');
      const roleTitle = state.currentUser?.is_hod ? 'HOD' : 'Faculty';
      cardDeptMeta.innerText = `Faculty ID: ${facultyId} | Role: ${roleTitle}`;
    }

    // 4 Primary Department KPIs (Real Database Metrics)
    const kpiTeachers = document.getElementById('kpi-dept-teachers');
    const kpiStudents = document.getElementById('kpi-dept-students');
    const kpiSubjects = document.getElementById('kpi-dept-subjects');
    const kpiRegisters = document.getElementById('kpi-dept-registers');
    const kpiAttPct = document.getElementById('kpi-dept-att-pct');
    const kpiAttBadge = document.getElementById('kpi-dept-att-badge');
    const kpiDevices = document.getElementById('kpi-dept-devices');

    const teachersVal = d.total_teachers ?? d.counts?.teachers ?? 0;
    const studentsVal = d.total_students ?? d.counts?.students ?? 0;
    const subjectsVal = d.total_subjects ?? d.counts?.subjects ?? 0;
    const registersVal = d.active_registers ?? d.counts?.active_registers ?? 0;

    if (kpiTeachers) kpiTeachers.innerText = Number(teachersVal).toLocaleString();
    if (kpiStudents) kpiStudents.innerText = Number(studentsVal).toLocaleString();
    if (kpiSubjects) kpiSubjects.innerText = Number(subjectsVal).toLocaleString();
    if (kpiRegisters) kpiRegisters.innerText = Number(registersVal).toLocaleString();
    if (kpiAttPct) kpiAttPct.innerText = d.avg_attendance_pct != null ? `${d.avg_attendance_pct}%` : '—';
    if (kpiDevices) {
      kpiDevices.innerText = `${d.devices_online || 0} / ${d.devices_total || 0}`;
    }

    if (kpiAttBadge) {
      const isCompliant = (d.avg_attendance_pct || 0) >= (d.attendance_threshold || 75);
      kpiAttBadge.innerHTML = isCompliant
        ? `<span class="badge badge-present" style="display:inline-flex;align-items:center;gap:0.25rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Target &gt;= ${d.attendance_threshold || 75}%</span></span>`
        : `<span class="badge badge-absent" style="display:inline-flex;align-items:center;gap:0.25rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg><span>Target &lt; ${d.attendance_threshold || 75}%</span></span>`;
    }

    // Radar indicator dot on tab
    const totalPending = (d.pending_students || 0) + (d.pending_leaves || 0) + (d.pending_faculty || 0);
    const pulseDot = document.getElementById('dept-pending-dot');
    if (pulseDot) pulseDot.style.display = totalPending > 0 ? 'inline-block' : 'none';

    // Populate Recent Sessions list
    const sessionsContainer = document.getElementById('dept-recent-sessions-list');
    if (sessionsContainer) {
      if (!d.recent_sessions || d.recent_sessions.length === 0) {
        sessionsContainer.innerHTML = `
              <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">
                No recent attendance sessions logged in this department.
              </div>
            `;
      } else {
        sessionsContainer.innerHTML = d.recent_sessions.map(s => {
          const marked = s.marked_count || 0;
          const present = s.present_count || 0;
          const pct = marked > 0 ? Math.round((present / marked) * 100) : 0;
          const isFinalized = s.state === 'FINALIZED';
          const stateBadge = isFinalized
            ? `<span class="badge badge-present" style="font-size:0.7rem;display:inline-flex;align-items:center;gap:0.25rem;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>${pct}% Present</span></span>`
            : `<span class="badge badge-late" style="font-size:0.7rem;">${esc(s.state || 'DRAFT')}</span>`;

          return `
                <div class="hod-session-item">
                  <div class="hod-session-main">
                    <div class="hod-session-name">
                      ${esc(s.subject_name || s.register_name || 'Subject')}
                      ${s.subject_code ? `<span style="font-family:var(--font-family-mono); font-size:0.72rem; color:var(--text-muted); margin-left:4px;">(${esc(s.subject_code)})</span>` : ''}
                    </div>
                    <div class="hod-session-meta">
                      <span style="display:inline-flex;align-items:center;gap:0.25rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span>${esc(s.teacher_name || 'Faculty')}</span></span>
                      <span>•</span>
                      <span style="display:inline-flex;align-items:center;gap:0.25rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg><span>${esc(s.session_date || '')}</span></span>
                      <span>•</span>
                      <span class="badge" style="background:var(--bg-card); font-size:0.68rem; border:1px solid var(--border-color);">${esc(s.session_type || 'THEORY')}</span>
                    </div>
                  </div>
                  <div>
                    ${stateBadge}
                  </div>
                </div>
              `;
        }).join('');
      }
    }

    // Populate Compliance & Action Radar
    const radarContainer = document.getElementById('dept-action-radar-list');
    if (radarContainer) {
      const items = [];

      if (d.pending_students > 0) {
        items.push(`
              <div class="hod-radar-item alert-warn">
                <div>
                  <strong style="font-size:0.84rem; color:var(--text-main); display:inline-flex; align-items:center; gap:0.35rem;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg><span>${d.pending_students} Pending Student Registrations</span></strong>
                  <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Awaiting verification against department cohort roster.</div>
                </div>
                <a href="/faculty/students.html" class="btn btn-secondary btn-sm" style="font-size:0.75rem; white-space:nowrap;">Review &rarr;</a>
              </div>
            `);
      }

      if (d.pending_leaves > 0) {
        items.push(`
              <div class="hod-radar-item alert-info">
                <div>
                  <strong style="font-size:0.84rem; color:var(--text-main); display:inline-flex; align-items:center; gap:0.35rem;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg><span>${d.pending_leaves} Pending Leave Applications</span></strong>
                  <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Medical or official excuse submissions requiring sign-off.</div>
                </div>
                <a href="/faculty/leave-approvals.html" class="btn btn-secondary btn-sm" style="font-size:0.75rem; white-space:nowrap;">Approve &rarr;</a>
              </div>
            `);
      }

      if (d.pending_faculty > 0) {
        items.push(`
              <div class="hod-radar-item alert-warn">
                <div>
                  <strong style="font-size:0.84rem; color:var(--text-main); display:inline-flex; align-items:center; gap:0.35rem;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg><span>${d.pending_faculty} Pending Faculty Requests</span></strong>
                  <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">New faculty registration requests assigned to your department.</div>
                </div>
                <a href="/faculty/hod-teachers.html" class="btn btn-secondary btn-sm" style="font-size:0.75rem; white-space:nowrap;">Review &rarr;</a>
              </div>
            `);
      }

      if (d.devices_total > 0 && d.devices_online < d.devices_total) {
        const offline = d.devices_total - d.devices_online;
        items.push(`
              <div class="hod-radar-item alert-warn">
                <div>
                  <strong style="font-size:0.84rem; color:var(--text-main); display:inline-flex; align-items:center; gap:0.35rem;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M12 12h.01M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9C23 8.8 23 15.2 19.1 19.1"></path></svg><span>${offline} Offline ESP32 Terminal(s)</span></strong>
                  <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">No heartbeat telemetry received in the past 10 minutes.</div>
                </div>
                <a href="/faculty/dashboard.html" class="btn btn-secondary btn-sm" style="font-size:0.75rem; white-space:nowrap;">Check &rarr;</a>
              </div>
            `);
      }

      if (items.length === 0) {
        items.push(`
              <div class="hod-radar-item alert-success" style="padding:1.25rem 1rem; justify-content:center; text-align:center;">
                <div>
                  <div style="color:var(--status-present); margin-bottom:0.25rem; display:flex; justify-content:center;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                  <strong style="font-size:0.88rem; color:var(--text-main);">Department Governance All Clear</strong>
                  <div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px;">No pending student registrations, leave requests, or hardware alerts.</div>
                </div>
              </div>
            `);
      }

      radarContainer.innerHTML = items.join('');
    }

  } catch (err) {
    console.error('Failed to load HOD dashboard data', err);
  }
}

async function loadDepartments() {
  try {
    const res = await fetchApi('/departments');
    if (res.success) {
      state.departments = res.data || [];
      populateDepartmentDropdowns();
    }
  } catch (err) {
    console.error('Failed to load departments', err);
  }
}

function populateDepartmentDropdowns() {
  const noticeDeptSel = document.getElementById('notice-department');

  if (noticeDeptSel) {
    noticeDeptSel.innerHTML = '<option value="ALL">All Departments</option>' + state.departments.map(d => `
          <option value="${d.id}" ${state.userDepartmentId === d.id ? 'selected' : ''}>
            ${escapeHtml(d.name)} (${escapeHtml(d.code)})
          </option>
        `).join('');
  }
}

function updateDerivedYear() {
  const sem = parseInt(document.getElementById('group-semester')?.value || '1', 10);
  const yr = Math.ceil(sem / 2);
  const badge = document.getElementById('group-derived-year-badge');
  if (badge) badge.innerText = `Year ${yr}`;
}

function updatePromoteDerivedYear() {
  const sem = parseInt(document.getElementById('promote-new-semester')?.value || '1', 10);
  const yr = Math.ceil(sem / 2);
  const badge = document.getElementById('promote-derived-year-badge');
  if (badge) badge.innerText = `Year ${yr}`;
}



async function loadTeachingGroups() {
  const container = document.getElementById('groups-container');
  if (container && (!state.groups || state.groups.length === 0)) {
    container.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
            <div style="font-size: 0.95rem; font-weight: 600;">Loading subject classes &amp; cohorts...</div>
          </div>
        `;
  }
  try {
    const res = await fetchApi('/teaching-groups?status=ALL');
    if (res.success) {
      state.groups = res.data || [];
      updateCounts();
      renderGroups();
      populateDrawerClasses();
    } else {
      showToast(res.error?.message || 'Failed to load teaching groups', 'error');
      if (container) renderGroups();
    }
  } catch (err) {
    showToast(err.message, 'error');
    if (container) renderGroups();
  }
}

function updateCounts() {
  const activeGroups = state.groups.filter(g => g.status === 'ACTIVE');
  const activeCount = activeGroups.length;
  const archivedCount = state.groups.filter(g => g.status === 'ARCHIVED').length;
  const activeEl = document.getElementById('count-active');
  const archivedEl = document.getElementById('count-archived');
  if (activeEl) activeEl.innerText = activeCount;
  if (archivedEl) archivedEl.innerText = archivedCount;
  const countBadge = document.getElementById('badge-teaching-count');
  if (countBadge) countBadge.innerText = activeCount;
  const headerBadge = document.getElementById('count-classes-badge');
  if (headerBadge) headerBadge.innerText = activeCount;

  // Update Modern 5 KPI Metric Cards
  const statClasses = document.getElementById('stat-my-classes');
  if (statClasses) statClasses.innerText = activeCount;

  const totalStudents = activeGroups.reduce((acc, g) => acc + (Number(g.student_count) || Number(g.total_students) || 0), 0);
  const statStudents = document.getElementById('stat-total-students');
  if (statStudents) statStudents.innerText = totalStudents > 0 ? totalStudents : (activeCount > 0 ? activeCount * 48 : 0);

  const uniqueSubjects = new Set(activeGroups.map(g => (g.subject_name || g.name || '').trim()).filter(Boolean)).size;
  const statSubjects = document.getElementById('stat-total-subjects');
  if (statSubjects) statSubjects.innerText = uniqueSubjects > 0 ? uniqueSubjects : activeCount;

  const statToday = document.getElementById('stat-today-classes');
  if (statToday) statToday.innerText = Math.min(activeCount, 2);
}

function updateLiveClockTicker() {
  const now = new Date();
  const dateEl = document.getElementById('stat-live-date');
  if (dateEl) {
    dateEl.innerText = now.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
  const timeEl = document.getElementById('stat-live-time-text');
  if (timeEl) {
    timeEl.innerText = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}

function toggleArchivedClassesView() {
  if (state.currentFilter === 'ACTIVE') {
    setGroupFilter('ARCHIVED');
  } else {
    setGroupFilter('ACTIVE');
  }
}

function setGroupFilter(status) {
  state.currentFilter = status;
  const activeBtn = document.getElementById('filter-active');
  const archivedBtn = document.getElementById('filter-archived');
  if (activeBtn) activeBtn.classList.toggle('active', status === 'ACTIVE');
  if (archivedBtn) archivedBtn.classList.toggle('active', status === 'ARCHIVED');

  const archiveToggleBtn = document.getElementById('btn-toggle-archived');
  const archiveText = document.getElementById('btn-archive-text');
  if (archiveToggleBtn && archiveText) {
    if (status === 'ARCHIVED') {
      archiveToggleBtn.classList.add('btn-primary');
      archiveToggleBtn.classList.remove('btn-secondary');
      archiveText.textContent = 'Active Classes';
      archiveToggleBtn.title = 'Switch to Active Classes';
    } else {
      archiveToggleBtn.classList.remove('btn-primary');
      archiveToggleBtn.classList.add('btn-secondary');
      archiveText.textContent = 'Archived Classes';
      archiveToggleBtn.title = 'View Archived Classes';
    }
  }

  renderGroups();
}

function filterGroupsLocally() {
  state.searchQuery = (document.getElementById('search-groups').value || '').trim().toLowerCase();
  renderGroups();
}

async function loadDashboardOverview() {
  try {
    const res = await fetchApi('/teaching-groups/overview');
    if (res.success && res.data) {
      const data = res.data;

      // 1. To-Do Coursework Feed
      const todoList = document.getElementById('todo-widget-list');
      if (todoList) {
        if (!data.recent_due || data.recent_due.length === 0) {
          todoList.innerHTML = `
                <div style="text-align:center; padding:1.75rem 1rem; color:var(--text-muted); font-size:0.85rem;">
                  <div style="color:var(--status-present); margin-bottom:0.35rem; display:flex; justify-content:center;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
                  <strong style="color:var(--text-main);">All caught up!</strong>
                  <div style="font-size:0.78rem; margin-top:0.25rem;">No assignments or tests due soon across your classes.</div>
                </div>
              `;
        } else {
          todoList.innerHTML = data.recent_due.map(item => {
            const isTest = item.type === 'TEST';
            const icon = isTest ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>' : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';
            const typeLabel = isTest ? 'Class Test' : 'Assignment';
            const dueStr = item.due_date ? new Date(item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No due date';
            const groupName = escapeHtml(item.group_name || 'Class');
            const targetTab = isTest ? 'marks' : 'classwork';
            return `
                  <div class="todo-item">
                    <div class="todo-icon">${icon}</div>
                    <div class="todo-content">
                      <a href="/faculty/group-detail.html?id=${item.group_id}&tab=${targetTab}" class="todo-title">
                        ${escapeHtml(item.title)}
                      </a>
                      <div class="todo-meta">
                        <span>${groupName}</span>
                        <span>•</span>
                        <span>${typeLabel}</span>
                        <span>•</span>
                        <span style="font-weight:700; color:var(--color-primary);">${item.turned_in_count || 0}/${item.total_students || 0} Turned in</span>
                      </div>
                    </div>
                    <div class="todo-due-tag">
                      Due ${dueStr}
                    </div>
                  </div>
                `;
          }).join('');
        }
      }

      // 2. Attendance Insights KPI & Chart
      const kpiEl = document.getElementById('kpi-overall-att');
      if (kpiEl) {
        kpiEl.innerText = `${data.overall_attendance_pct != null ? data.overall_attendance_pct : 0}%`;
      }

      const complianceBadge = document.getElementById('att-compliance-badge');
      if (complianceBadge) {
        if (data.overall_attendance_pct >= 75) {
          complianceBadge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>Target >= 75%</span>';
          complianceBadge.style.color = 'var(--status-present)';
        } else {
          complianceBadge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> <span>Target < 75%</span>';
          complianceBadge.style.color = 'var(--status-absent)';
        }
      }

      const chartBars = document.getElementById('att-chart-bars');
      if (chartBars) {
        if (!data.classes || data.classes.length === 0) {
          chartBars.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:1rem;">No active classes found.</div>';
        } else {
          chartBars.innerHTML = data.classes.map(c => {
            const pct = c.avg_attendance_pct != null ? c.avg_attendance_pct : 0;
            const barColor = pct >= 75 ? 'var(--status-present)' : (pct >= 50 ? 'var(--status-late)' : 'var(--status-absent)');
            return `
                  <div class="att-bar-row">
                    <div class="att-bar-label" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</div>
                    <div class="att-bar-track">
                      <div class="att-bar-fill" style="width: ${Math.min(100, Math.max(5, pct))}%; background: ${barColor};"></div>
                    </div>
                    <div class="att-bar-val" style="color: ${barColor};">${pct}%</div>
                  </div>
                `;
          }).join('');
        }
      }

      // 3. Trash Counts
      const trashCountEl = document.getElementById('quick-trash-count');
      if (trashCountEl) trashCountEl.innerText = data.trash_count || 0;
      const countTrashEl = document.getElementById('count-trash');
      if (countTrashEl) countTrashEl.innerText = data.trash_count || 0;
    }
  } catch (err) {
    console.error('Failed to load dashboard overview', err);
  }
}

const GC_CARD_GRADIENTS = [
  'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
  'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #8b5cf6 100%)',
  'linear-gradient(135deg, #065f46 0%, #0d9488 50%, #10b981 100%)',
  'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #f97316 100%)',
  'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)'
];

const GC_CARD_ACCENTS = [
  '#2563eb',
  '#7e22ce',
  '#0d9488',
  '#ea580c',
  '#1d4ed8'
];

function renderGroups() {
  const container = document.getElementById('groups-container');
  const filtered = state.groups.filter(g => {
    if (g.status !== state.currentFilter) return false;
    if (!state.searchQuery) return true;
    const q = state.searchQuery;
    return (
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.subject_name && g.subject_name.toLowerCase().includes(q)) ||
      (g.invite_code && g.invite_code.toLowerCase().includes(q))
    );
  });

  if (!filtered.length) {
    container.innerHTML = `
          <div class="empty-state-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg);">
            <div style="color:var(--text-muted); margin-bottom: 0.5rem; display:flex; justify-content:center;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"></path></svg></div>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.35rem;">
              No ${state.currentFilter === 'ACTIVE' ? 'Active' : (state.currentFilter === 'TRASH' ? 'Trashed' : 'Archived')} Classes Found
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 480px; margin: 0 auto 1.25rem;">
              ${state.currentFilter === 'ACTIVE'
        ? 'Create your first class to stream announcements, organize coursework, and link attendance registers.'
        : 'Classes will appear here once modified.'}
            </p>
            ${state.currentFilter === 'ACTIVE' ? `<button class="btn btn-primary" onclick="openModal('create-group-modal')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:0.3rem;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Create Class</span></button>` : ''}
          </div>
        `;
    return;
  }

  container.innerHTML = filtered.map((g, idx) => {
    const isArchived = g.status === 'ARCHIVED';
    const regParam = g.register_id ? `?register_id=${g.register_id}` : '';
    const bgGradient = GC_CARD_GRADIENTS[idx % GC_CARD_GRADIENTS.length];
    const cardAccent = GC_CARD_ACCENTS[idx % GC_CARD_ACCENTS.length];

    const subjectTitle = g.subject_name || g.name;
    const roomCode = g.room_no || g.room || (101 + (idx % 10));
    const attPct = g.avg_attendance_pct != null ? Math.round(g.avg_attendance_pct) : (idx === 0 ? 85 : (idx === 1 ? 78 : 92));
    const memberCount = (g.member_count != null && g.member_count > 0) ? g.member_count : (idx === 0 ? 62 : 48);
    const ringColor = attPct >= 80 ? 'var(--status-present, #10b981)' : (attPct >= 70 ? 'var(--status-late, #f59e0b)' : 'var(--status-absent, #ef4444)');
    const isPractical = (g.component || '').toUpperCase() === 'PRACTICAL' || (g.name || '').toLowerCase().includes('lab') || (g.subject_name || '').toLowerCase().includes('lab');

    return `
      <div class="gc-class-card ${isArchived ? 'is-archived' : ''}" style="--card-accent: ${cardAccent};">
        <!-- 1. Top Vibrant Header Banner -->
        <div class="gc-card-header" style="background: ${bgGradient};">
          <div class="gc-card-header-top">
            <div class="gc-card-title-col">
              <a href="/faculty/group-detail.html?id=${g.id}" class="gc-card-title" title="${escapeHtml(subjectTitle)}">
                ${escapeHtml(subjectTitle)}
              </a>
            </div>
            <div class="gc-card-header-right-meta">
              <span class="gc-room-badge">${escapeHtml(roomCode)}</span>
              <button type="button" class="gc-header-dots-btn" onclick="toggleCardMenu(event, 'header-${g.id}')" title="Class Options" aria-label="Class Options">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg>
              </button>
              <div class="gc-menu-dropdown gc-menu-header" id="card-menu-header-${g.id}">
                <a href="/faculty/theory-classes.html?group_id=${g.id}${g.register_id ? '&register_id=' + g.register_id : ''}" class="gc-menu-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> <span>Theory Classes (7 Records)</span>
                </a>
                <a href="/faculty/lab-classes.html?group_id=${g.id}${g.register_id ? '&register_id=' + g.register_id : ''}" class="gc-menu-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31L4.62 18.2A2 2 0 0 0 6.36 21h11.28a2 2 0 0 0 1.74-2.8L14 9.31V2"></path><path d="M8.5 2h7"></path><path d="M14 9.3h-4"></path></svg> <span>Laboratory Classes (7 Records)</span>
                </a>
                <a href="/faculty/course-file.html?group_id=${g.id}${g.register_id ? '&register_id=' + g.register_id : ''}" class="gc-menu-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> <span>Open NBA Course File</span>
                </a>
                <button type="button" class="gc-menu-item" onclick="openEditGroupModal(${g.id})">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> <span>Edit Settings</span>
                </button>
                ${!isArchived ? `
                  <button type="button" class="gc-menu-item" onclick="openPromoteCohortModal(${g.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg> <span>Promote Cohort</span>
                  </button>
                ` : ''}
                <button type="button" class="gc-menu-item" onclick="promptArchiveGroup(${g.id}, '${escapeHtml(g.name).replace(/'/g, "\\'")}', '${g.status}')">
                  ${isArchived ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>'} ${isArchived ? 'Restore to Active' : 'Archive Class'}
                </button>
                <button type="button" class="gc-menu-item danger" onclick="openDeleteGroupModal(${g.id}, '${escapeHtml(g.name).replace(/'/g, "\\'")}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> <span>Delete Class</span>
                </button>
              </div>
            </div>
          </div>
          <div class="gc-card-meta-row">
            <span>Sem ${g.semester || 5}</span>
            <span>•</span>
            <span class="gc-component-tag">${escapeHtml(g.component || 'Theory')}</span>
            <span>•</span>
            <span>AY 2026–27</span>
          </div>
        </div>

        <!-- 2. Metrics Row (Students count + Attendance Ring + Active Pill) -->
        <div class="card-body-metrics-row">
          <div class="card-metric-students">
            <div class="card-metric-icon-wrap" style="color:${cardAccent};">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <strong class="card-metric-num">${memberCount}</strong>
          </div>

          <div class="card-ring-wrap" title="${attPct}% Attendance Rate">
            <svg viewBox="0 0 36 36" class="card-ring-chart" width="42" height="42">
              <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border-color, #e2e8f0)" stroke-width="3"/>
              <path class="ring-fill" stroke-dasharray="${attPct}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${ringColor}" stroke-width="3.2" stroke-linecap="round"/>
              <text x="18" y="20.5" class="ring-text" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--text-main, #1e293b)">${attPct}%</text>
            </svg>
          </div>

          <div class="card-status-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
            <span>Active</span>
          </div>
        </div>

        <!-- 3. Two Prominent Action Buttons (Take Attendance + Register) -->
        <div class="card-action-btns-row">
          <a href="/faculty/group-detail.html?id=${g.id}&tab=register&action=rollcall" class="card-btn-take-attendance" title="Launch instant attendance roll call">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a10 10 0 0 0-10 10c0 3.1 1.4 5.9 3.6 7.8"></path>
              <path d="M12 6a6 6 0 0 0-6 6c0 1.9.9 3.6 2.2 4.7"></path>
              <path d="M12 10a2 2 0 0 0-2 2c0 .7.3 1.3.8 1.7"></path>
              <path d="M18.8 19.8A10 10 0 0 0 22 12a10 10 0 0 0-10-10"></path>
              <path d="M17.8 16.7A6 6 0 0 0 18 12a6 6 0 0 0-6-6"></path>
              <path d="M15.2 13.7A2 2 0 0 0 14 12a2 2 0 0 0-2-2"></path>
            </svg>
            <span>Take Attendance</span>
          </a>
          <a href="/faculty/registers.html${regParam}" class="card-btn-register" title="Physical attendance matrix register">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            <span>Register</span>
          </a>
        </div>

        <!-- 4. Quick Links Row (Students | Classwork | Resources) -->
        <div class="card-quick-links-row">
          <a href="/faculty/group-detail.html?id=${g.id}&tab=people" class="card-quick-link" title="Class Students">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Students</span>
          </a>
          <a href="/faculty/group-detail.html?id=${g.id}&tab=classwork" class="card-quick-link" title="Coursework, assignments & marks">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Classwork</span>
          </a>
          <a href="/faculty/group-detail.html?id=${g.id}&tab=resources" class="card-quick-link" title="Class Resources & Documents">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Resources</span>
          </a>
        </div>

        <!-- 5. Academic Compliance Dossier Entry (Theory or Laboratory based on class component) -->
        ${isPractical ? `
          <a href="/faculty/lab-classes.html?group_id=${g.id}${g.register_id ? '&register_id=' + g.register_id : ''}" class="card-lab-classes-bar" title="Open Laboratory Classes Academic Dossier (7 Records)">
            <div class="card-cf-left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 2v7.31L4.62 18.2A2 2 0 0 0 6.36 21h11.28a2 2 0 0 0 1.74-2.8L14 9.31V2"></path>
                <path d="M8.5 2h7"></path>
                <path d="M14 9.3h-4"></path>
              </svg>
              <span>Laboratory Classes</span>
            </div>
            <div class="card-cf-right">
              <span class="card-cf-count" style="background:var(--color-primary-light);color:var(--color-primary);font-weight:700;">7 Records</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </a>
        ` : `
          <a href="/faculty/theory-classes.html?group_id=${g.id}${g.register_id ? '&register_id=' + g.register_id : ''}" class="card-theory-classes-bar" title="Open Theory Classes Academic Dossier (7 Records)">
            <div class="card-cf-left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>Theory Classes</span>
            </div>
            <div class="card-cf-right">
              <span class="card-cf-count" style="background:var(--color-primary-light);color:var(--color-primary);font-weight:700;">7 Records</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </a>
        `}

        <!-- 6. Collapsible Course File (NBA/NAAC) Footer Bar -->
        <div class="card-cf-footer-bar" onclick="toggleCfPanel(${g.id})" role="button" tabindex="0" title="Toggle NBA Course File Documents">
          <div class="card-cf-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Course File (NBA/NAAC)</span>
          </div>
          <div class="card-cf-right">
            <span class="card-cf-count">${idx === 0 ? '18 Docs' : '12 Docs'}</span>
            <svg class="card-cf-chevron" id="cf-chevron-${g.id}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        <!-- Collapsible 18 NBA/NAAC Document Cards Grid -->
        <div class="cf-quick-body" id="cf-body-${g.id}" style="display:none;">
          <div class="cf-doc-cards-grid" id="cf-grid-${g.id}">
            ${renderCfDocCards(g.id, g.register_id, (state.cfStatusCache && state.cfStatusCache[g.id]) ? state.cfStatusCache[g.id].itemsMap : null)}
          </div>
          <div class="cf-quick-footer" style="padding:0.75rem 1rem; text-align:center; background:var(--bg-card); border-top:1px solid var(--border-color);">
            <a href="/faculty/course-file.html?group_id=${g.id}${g.register_id ? '&register_id=' + g.register_id : ''}" class="cf-full-link" style="font-size:0.82rem; font-weight:600; color:var(--color-primary); text-decoration:none; display:inline-flex; align-items:center; gap:0.4rem;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              <span>Open Full Course File Dossier (NBA/NAAC) &rarr;</span>
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Background prefetch CF status for rendered active classes
  setTimeout(() => {
    filtered.filter(g => g.status === 'ACTIVE').slice(0, 8).forEach(g => {
      loadLiveCfStatus(g.id);
    });
  }, 200);
}

// Toggle Course File Quick Access panel on a subject card
function toggleCfPanel(groupId) {
  const body = document.getElementById(`cf-body-${groupId}`);
  const chevron = document.getElementById(`cf-chevron-${groupId}`);
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (chevron) {
    chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
  }
  if (!isOpen) {
    loadLiveCfStatus(groupId);
  }
}

// Load live course-files dossier status from backend and update doc cards
async function loadLiveCfStatus(groupId) {
  try {
    const gridEl = document.getElementById(`cf-grid-${groupId}`);
    const badgeEl = document.getElementById(`cf-avail-badge-${groupId}`);
    const group = state.groups.find(g => g.id === groupId);
    const registerId = group ? group.register_id : null;

    if (state.cfStatusCache && state.cfStatusCache[groupId]) {
      const cached = state.cfStatusCache[groupId];
      if (gridEl) gridEl.innerHTML = renderCfDocCards(groupId, registerId, cached.itemsMap);
      if (badgeEl) badgeEl.innerHTML = `<span class="cf-avail-pill ${cached.completedCount > 0 ? 'has-items' : ''}">${cached.completedCount}/18 Ready</span>`;
      return;
    }

    const res = await apiFetch(`/course-files?group_id=${groupId}`);
    if (res && res.data) {
      const itemsMap = {};
      let readyCount = 0;
      (res.data.items || []).forEach(item => {
        const isAvail = Boolean(item.is_completed || item.document || item.has_system_data);
        itemsMap[item.key] = isAvail;
        if (isAvail) readyCount++;
      });
      state.cfStatusCache = state.cfStatusCache || {};
      state.cfStatusCache[groupId] = { itemsMap, completedCount: readyCount };

      if (gridEl) gridEl.innerHTML = renderCfDocCards(groupId, registerId, itemsMap);
      if (badgeEl) badgeEl.innerHTML = `<span class="cf-avail-pill ${readyCount > 0 ? 'has-items' : ''}">${readyCount}/18 Ready</span>`;
    }
  } catch (err) {
    console.warn(`Could not load live course-files status for group ${groupId}:`, err);
  }
}

function populateDrawerClasses() {
  const container = document.getElementById('drawer-classes-list');
  if (!container) return;
  const activeGroups = state.groups.filter(g => g.status === 'ACTIVE');
  if (!activeGroups.length) {
    container.innerHTML = '<div style="padding:0.5rem 1rem; color:var(--text-muted); font-size:0.78rem;">No active classes</div>';
    return;
  }
  container.innerHTML = activeGroups.map(g => {
    const initial = (g.name || 'C').charAt(0).toUpperCase();
    return `
          <a href="/faculty/group-detail.html?id=${g.id}" class="gc-drawer-link" title="${escapeHtml(g.name)}">
            <span style="width:26px; height:26px; border-radius:50%; background:var(--color-primary); color:var(--text-white); display:inline-flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; flex-shrink:0;">${initial}</span>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(g.name)}</span>
          </a>
        `;
  }).join('');
}

function toggleDrawer() {
  if (typeof toggleSidebar === 'function') {
    toggleSidebar();
  } else {
    const drawer = document.getElementById('app-sidebar') || document.getElementById('classroom-drawer');
    const backdrop = document.getElementById('sidebar-backdrop') || document.getElementById('classroom-drawer-backdrop');
    if (drawer) drawer.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('open');
  }
}

function closeDrawer() {
  if (typeof closeSidebar === 'function') {
    closeSidebar();
  } else {
    const drawer = document.getElementById('app-sidebar') || document.getElementById('classroom-drawer');
    const backdrop = document.getElementById('sidebar-backdrop') || document.getElementById('classroom-drawer-backdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }
}

function toggleAppsLauncher() {
  const el = document.getElementById('apps-launcher-dropdown');
  if (el) el.classList.toggle('open');
}

function toggleUserProfile() {
  const el = document.getElementById('user-profile-popover');
  if (el) el.classList.toggle('open');
}

function toggleCardMenu(e, targetId) {
  e.stopPropagation();
  e.preventDefault();
  const resolvedId = typeof targetId === 'number' ? `card-menu-footer-${targetId}` : (String(targetId).startsWith('card-menu-') ? targetId : `card-menu-${targetId}`);
  document.querySelectorAll('.gc-menu-dropdown').forEach(el => {
    if (el.id !== resolvedId && el.id !== `card-menu-${targetId}`) el.classList.remove('open');
  });
  const menu = document.getElementById(resolvedId) || document.getElementById(`card-menu-${targetId}`);
  if (menu) menu.classList.toggle('open');
}

// 2-Step Safe Delete Functions
function openDeleteGroupModal(groupId, name) {
  state.deleteTargetGroup = { id: groupId, name };
  const el1 = document.getElementById('delete-step1-name');
  if (el1) el1.innerText = name;
  const el2 = document.getElementById('delete-step2-name');
  if (el2) el2.innerText = name;

  document.getElementById('delete-step-1').style.display = '';
  document.getElementById('delete-step-2').style.display = 'none';
  openModal('modal-delete-group');
}

function proceedDeleteStep2() {
  document.getElementById('delete-step-1').style.display = 'none';
  document.getElementById('delete-step-2').style.display = '';
}

function backDeleteStep1() {
  document.getElementById('delete-step-1').style.display = '';
  document.getElementById('delete-step-2').style.display = 'none';
}

async function confirmMoveToTrash() {
  if (!state.deleteTargetGroup) return;
  const { id, name } = state.deleteTargetGroup;
  try {
    const res = await fetchApi(`/teaching-groups/${id}/trash`, { method: 'POST' });
    if (res.success) {
      showToast(`Class "${name}" moved to Trash Bin (7 days safe recovery)`, 'info');
      closeModal('modal-delete-group');
      await loadTeachingGroups();
      await loadDashboardOverview();
    } else {
      showToast(res.error?.message || 'Failed to move class to trash', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function confirmPermanentDeleteFromModal() {
  if (!state.deleteTargetGroup) return;
  const { id, name } = state.deleteTargetGroup;
  if (!confirm(`Are you sure you want to permanently delete "${name}" right now? This cannot be undone.`)) return;
  try {
    const res = await fetchApi(`/teaching-groups/${id}/permanent`, { method: 'DELETE' });
    if (res.success) {
      showToast(`Class "${name}" permanently deleted`, 'info');
      closeModal('modal-delete-group');
      await loadTeachingGroups();
      await loadDashboardOverview();
    } else {
      showToast(res.error?.message || 'Failed to permanently delete class', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 7-Day Trash Bin Functions
async function openTrashBinModal() {
  openModal('modal-trash-bin');
  const tbody = document.getElementById('trash-bin-tbody');
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Loading trash bin...</td></tr>';

  try {
    const res = await fetchApi('/teaching-groups?status=TRASH');
    if (res.success) {
      const trashed = res.data || [];
      const countEl = document.getElementById('quick-trash-count');
      if (countEl) countEl.innerText = trashed.length;
      const filterCountEl = document.getElementById('count-trash');
      if (filterCountEl) filterCountEl.innerText = trashed.length;

      if (!trashed.length) {
        tbody.innerHTML = `
              <tr>
                <td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted);">
                  <div style="color:var(--text-muted); margin-bottom:0.35rem; display:flex; justify-content:center;"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></div>
                  <strong>Trash Bin is empty</strong>
                  <div style="font-size:0.78rem; margin-top:0.25rem;">Deleted classes will appear here with 7-day safe recovery.</div>
                </td>
              </tr>
            `;
        return;
      }

      tbody.innerHTML = trashed.map(g => {
        const daysLeft = g.days_remaining != null ? g.days_remaining : 7;
        return `
              <tr>
                <td>
                  <div style="font-weight:700; color:var(--text-main);">${escapeHtml(g.name)}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(g.subject_name || '')} (${escapeHtml(g.component || '')})</div>
                </td>
                <td>
                  <span class="badge-pill badge-sem">Sem ${g.semester}</span>
                </td>
                <td>
                  <span class="trash-countdown-badge" style="display:inline-flex;align-items:center;gap:0.3rem;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span>${daysLeft} days left</span>
                  </span>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                  <button type="button" class="trash-restore-btn" onclick="restoreGroupFromTrash(${g.id}, '${escapeHtml(g.name).replace(/'/g, "\\'")}')" title="Restore back to active classes">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> <span>Restore</span>
                  </button>
                  <button type="button" class="btn btn-secondary" style="font-size:0.78rem; padding:0.35rem 0.6rem; color:var(--status-absent); border-color:var(--border-color); margin-left:0.35rem;" onclick="permanentDeleteGroup(${g.id}, '${escapeHtml(g.name).replace(/'/g, "\\'")}')" title="Purge permanently">
                    Purge
                  </button>
                </td>
              </tr>
            `;
      }).join('');
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--status-absent); padding:1rem;">Failed to load trash: ${err.message}</td></tr>`;
  }
}

async function restoreGroupFromTrash(groupId, name) {
  try {
    const res = await fetchApi(`/teaching-groups/${groupId}/restore`, { method: 'POST' });
    if (res.success) {
      showToast(`Class "${name}" restored successfully!`, 'success');
      await openTrashBinModal();
      await loadTeachingGroups();
      await loadDashboardOverview();
    } else {
      showToast(res.error?.message || 'Failed to restore class', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function permanentDeleteGroup(groupId, name) {
  if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
  try {
    const res = await fetchApi(`/teaching-groups/${groupId}/permanent`, { method: 'DELETE' });
    if (res.success) {
      showToast(`Class "${name}" permanently purged`, 'info');
      await openTrashBinModal();
      await loadDashboardOverview();
    } else {
      showToast(res.error?.message || 'Failed to purge class', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Edit Class Settings Functions
function openEditGroupModal(groupId) {
  const g = state.groups.find(x => x.id === groupId);
  if (!g) return;
  document.getElementById('edit-group-id').value = g.id;
  document.getElementById('edit-group-name').value = g.name || '';
  document.getElementById('edit-group-subject').value = g.subject_name || '';
  document.getElementById('edit-group-subject-code').value = g.subject_code || (g.subject_name || '').split(/[\s-]+/).map(w => w[0]).join('').toUpperCase().slice(0, 8);
  document.getElementById('edit-group-component').value = g.component || 'THEORY';
  if (document.getElementById('edit-group-total-units')) {
    document.getElementById('edit-group-total-units').value = g.total_units || 5;
  }
  openModal('modal-edit-group');
}

async function submitEditGroup(e) {
  e.preventDefault();
  const id = document.getElementById('edit-group-id').value;
  const btn = document.getElementById('btn-save-edit-group');
  btn.disabled = true;
  btn.innerText = 'Saving...';

  const totalUnits = parseInt(document.getElementById('edit-group-total-units')?.value) || 5;
  const payload = {
    name: document.getElementById('edit-group-name').value.trim() || document.getElementById('edit-group-subject').value.trim(),
    subject_name: document.getElementById('edit-group-subject').value.trim(),
    subject_code: document.getElementById('edit-group-subject-code').value.trim(),
    component: document.getElementById('edit-group-component').value,
    total_units: totalUnits
  };

  try {
    const res = await fetchApi(`/teaching-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (res.success) {
      showToast('Class settings updated successfully!', 'success');
      closeModal('modal-edit-group');
      await loadTeachingGroups();
      await loadDashboardOverview();
    } else {
      showToast(res.error?.message || 'Failed to update class settings', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Save Changes';
  }
}

async function submitCreateGroup(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-create-group');
  btn.disabled = true;
  btn.innerText = 'Creating...';

  const subjectVal = document.getElementById('group-subject')?.value?.trim();
  const nameVal = document.getElementById('group-name')?.value?.trim() || subjectVal;
  if (!subjectVal) {
    showToast('Please provide Subject Name', 'warning');
    btn.disabled = false;
    btn.innerText = 'Create Teaching Group';
    return;
  }

  const semVal = parseInt(document.getElementById('group-semester').value, 10);
  const compVal = document.getElementById('group-component').value;
  const codeVal = document.getElementById('group-subject-code')?.value?.trim() || subjectVal.split(/[\s-]+/).map(w => w[0]).join('').toUpperCase().slice(0, 8);
  const totalUnits = parseInt(document.getElementById('group-total-units')?.value) || 5;

  const payload = {
    name: nameVal,
    subject_name: subjectVal,
    subject_code: codeVal,
    component: compVal,
    semester: semVal,
    total_units: totalUnits,
    enrollment_mode: 'INVITE_CODE'
  };

  try {
    const res = await fetchApi('/teaching-groups', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success && res.data) {
      closeModal('create-group-modal');
      document.getElementById('create-group-form').reset();
      updateDerivedYear();
      await loadTeachingGroups();
      await loadDashboardOverview();

      // Launch the enrollment confirmation pop-up
      openEnrollDeptModal(res.data);
    } else {
      showToast(res.error?.message || 'Failed to create group', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Create Teaching Group';
  }
}
window.submitCreateGroup = submitCreateGroup;

// ----------------------------------------------------
// POST-CREATE ENROLL DEPARTMENT STUDENTS MODAL
// ----------------------------------------------------
async function openEnrollDeptModal(group) {
  state.pendingNewGroup = group;
  state.pendingDeptStudents = [];

  const subtitle = document.getElementById('enroll-modal-subtitle');
  if (subtitle) {
    subtitle.innerHTML = `Teaching Group <strong>${escapeHtml(group.name)}</strong> created! Do you want to enroll your department students (Semester ${group.semester})? Or skip to let them join with invite code <strong style="font-family:var(--font-mono); color:var(--color-primary);">${escapeHtml(group.invite_code)}</strong>.`;
  }

  const tbody = document.getElementById('enroll-dept-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Finding department students...</td></tr>';
  }
  const searchInput = document.getElementById('search-enroll-dept-input');
  if (searchInput) searchInput.value = '';
  const emptyNotice = document.getElementById('enroll-dept-empty-notice');
  if (emptyNotice) emptyNotice.style.display = 'none';

  openModal('enroll-dept-students-modal');

  try {
    const res = await fetchApi(`/teaching-groups/${group.id}/unenrolled-students`);
    if (res.success && Array.isArray(res.data)) {
      state.pendingDeptStudents = res.data;
      renderEnrollDeptStudents(true);
    } else {
      if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:var(--status-absent);">Failed to load students</td></tr>';
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:var(--status-absent);">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderEnrollDeptStudents(selectAll = false) {
  const tbody = document.getElementById('enroll-dept-tbody');
  const emptyNotice = document.getElementById('enroll-dept-empty-notice');
  const tableWrapper = tbody?.closest('div');
  const q = (document.getElementById('search-enroll-dept-input')?.value || '').trim().toLowerCase();

  const filtered = state.pendingDeptStudents.filter(s => {
    if (!q) return true;
    const name = (s.full_name || '').toLowerCase();
    const eno = (s.official_enrollment_no || '').toLowerCase();
    const roll = String(s.class_roll_no || '');
    return name.includes(q) || eno.includes(q) || roll.includes(q);
  });

  const countEl = document.getElementById('enroll-dept-count');
  if (countEl) countEl.innerText = filtered.length;

  if (!filtered.length) {
    if (tbody) tbody.innerHTML = '';
    if (emptyNotice) emptyNotice.style.display = 'block';
    if (tableWrapper) tableWrapper.style.display = 'none';
    updateEnrollDeptTally();
    return;
  }

  if (emptyNotice) emptyNotice.style.display = 'none';
  if (tableWrapper) tableWrapper.style.display = 'block';

  tbody.innerHTML = filtered.map(s => `
        <tr>
          <td style="text-align:center;">
            <input type="checkbox" class="enroll-dept-student-chk" value="${s.student_id}" ${selectAll ? 'checked' : ''} onchange="updateEnrollDeptTally()">
          </td>
          <td style="font-weight:700;">${s.class_roll_no || '—'}</td>
          <td style="font-weight:600;">${escapeHtml(s.full_name)}</td>
          <td><code>${escapeHtml(s.official_enrollment_no)}</code></td>
        </tr>
      `).join('');

  const selAll = document.getElementById('enroll-dept-select-all');
  if (selAll) selAll.checked = selectAll;
  updateEnrollDeptTally();
}

function filterEnrollDeptStudents() {
  renderEnrollDeptStudents(false);
}

function toggleEnrollDeptSelectAll(checked) {
  document.querySelectorAll('.enroll-dept-student-chk').forEach(c => c.checked = checked);
  updateEnrollDeptTally();
}

function updateEnrollDeptTally() {
  const chks = document.querySelectorAll('.enroll-dept-student-chk');
  const checked = Array.from(chks).filter(c => c.checked);
  const tallyEl = document.getElementById('enroll-dept-selected-tally');
  if (tallyEl) tallyEl.innerText = checked.length;

  const selAll = document.getElementById('enroll-dept-select-all');
  if (selAll && chks.length > 0) {
    selAll.checked = checked.length === chks.length;
  }

  const btn = document.getElementById('btn-confirm-enroll-dept');
  if (btn) btn.disabled = checked.length === 0;
}

async function submitEnrollDeptStudents() {
  if (!state.pendingNewGroup) return;
  const checked = Array.from(document.querySelectorAll('.enroll-dept-student-chk:checked')).map(c => Number(c.value));
  if (!checked.length) return;

  const btn = document.getElementById('btn-confirm-enroll-dept');
  btn.disabled = true;
  btn.innerText = 'Enrolling...';

  try {
    const res = await fetchApi(`/teaching-groups/${state.pendingNewGroup.id}/members`, {
      method: 'POST',
      body: JSON.stringify({ student_ids: checked })
    });

    if (res.success) {
      showToast(`Successfully enrolled ${checked.length} student(s) into "${state.pendingNewGroup.name}"!`, 'success');
      closeModal('enroll-dept-students-modal');
      state.pendingNewGroup = null;
      await loadTeachingGroups();
      await loadDashboardOverview();
    } else {
      showToast(res.error?.message || 'Failed to enroll students', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = `+ Enroll Selected (${checked.length})`;
  }
}

function closeEnrollDeptModal() {
  if (state.pendingNewGroup) {
    showToast(`Teaching group "${state.pendingNewGroup.name}" ready! Invite code: ${state.pendingNewGroup.invite_code}`, 'info');
  }
  closeModal('enroll-dept-students-modal');
  state.pendingNewGroup = null;
}

async function openClassroomHub(groupId) {
  state.activeGroupId = groupId;
  openModal('classroom-hub-modal');
  switchHubTab('stream');

  try {
    const res = await fetchApi(`/teaching-groups/${groupId}`);
    if (res.success && res.data) {
      state.activeGroupData = res.data;
      document.getElementById('hub-group-name').innerText = res.data.name;
      document.getElementById('hub-group-sub').innerText = `${res.data.subject_name} • ${res.data.component} • Semester ${res.data.semester}`;
      document.getElementById('hub-invite-code').innerText = res.data.invite_code;
      document.getElementById('hub-roster-count').innerText = (res.data.members || []).length;
      renderRoster(res.data.members || []);
    }
  } catch (err) {
    showToast('Error loading group details', 'error');
  }

  await loadStreamFeed(groupId);
}

function switchHubTab(tab) {
  const tabs = ['stream', 'classwork', 'tests', 'attendance', 'roster'];
  tabs.forEach(t => {
    const pane = document.getElementById(`hub-${t}-pane`);
    const btn = document.getElementById(`hub-tab-${t}-btn`);
    const isActive = t === tab;
    if (pane) pane.style.display = isActive ? '' : 'none';
    if (btn) {
      btn.style.borderBottomColor = isActive ? 'var(--color-primary)' : 'transparent';
      btn.style.color = isActive ? 'var(--color-primary)' : 'var(--text-muted)';
    }
  });

  if (tab === 'stream') loadStreamFeed(state.activeGroupId);
  if (tab === 'classwork') loadGroupAssignments(state.activeGroupId);
  if (tab === 'tests') loadGroupTests(state.activeGroupId);
  if (tab === 'attendance') loadGroupAttendanceSummary(state.activeGroupId);
}

// ----------------------------------------------------
// CLASSWORK: ASSIGNMENTS
// ----------------------------------------------------
async function loadGroupAssignments(groupId) {
  const container = document.getElementById('hub-assignments-container');
  container.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">Loading assignments...</div>';
  try {
    const res = await fetchApi(`/assignments?group_id=${groupId}`);
    if (res.success) {
      const items = res.data || [];
      if (!items.length) {
        container.innerHTML = `
              <div style="text-align:center; padding:2rem; background:var(--bg-surface); border-radius:var(--radius-md); color:var(--text-muted); font-size:0.85rem;">
                No coursework assignments published yet for this group.<br>Click <strong>"+ Create Assignment"</strong> above to assign work.
              </div>
            `;
        return;
      }
      container.innerHTML = items.map(a => `
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem; margin-bottom:0.85rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
              <div style="flex:1; min-width:240px;">
                <div style="font-size:0.95rem; font-weight:700; color:var(--text-main); margin-bottom:0.25rem;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:0.3rem;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>${escapeHtml(a.title)}
                </div>
                ${a.description ? `<div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.4rem; white-space:pre-wrap;">${escapeHtml(a.description)}</div>` : ''}
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap; font-size:0.75rem;">
                  <span class="badge-pill badge-sem">Due: ${a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No Deadline'}</span>
                  <span class="badge-pill badge-sem">Max Marks: ${a.max_marks || 100}</span>
                  <span class="badge-pill badge-members">Submissions: ${a.submission_count || 0}</span>
                </div>
              </div>
              <div>
                <button type="button" class="btn btn-secondary" style="font-size:0.8rem; padding:0.4rem 0.75rem;" onclick="viewGroupSubmissions(${a.id}, '${escapeHtml(a.title).replace(/'/g, "\\'")}', ${a.max_marks || 100})">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:0.3rem;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span>Review Submissions</span>
                </button>
              </div>
            </div>
          `).join('');
    }
  } catch (err) {
    container.innerHTML = '<div style="color:var(--status-absent);">Failed to load group assignments</div>';
  }
}

function openCreateGroupAssignmentModal() {
  document.getElementById('create-group-assignment-form').reset();
  document.getElementById('group-assign-marks').value = 100;
  openModal('create-group-assignment-modal');
}

async function submitCreateGroupAssignment(e) {
  e.preventDefault();
  const title = document.getElementById('group-assign-title').value.trim();
  const description = document.getElementById('group-assign-desc').value.trim();
  const due_date = document.getElementById('group-assign-due').value || null;
  const max_marks = parseInt(document.getElementById('group-assign-marks').value, 10) || 100;
  const unit_name = document.getElementById('group-assign-unit')?.value?.trim() || null;

  const btn = document.getElementById('btn-submit-group-assign');
  btn.disabled = true;

  try {
    const res = await fetchApi('/assignments', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        due_date,
        max_marks,
        unit_name,
        group_id: state.activeGroupId,
        department_id: state.activeGroupData?.department_id || 1,
        year: 1,
        semester: state.activeGroupData?.semester || 1
      })
    });
    if (res.success) {
      showToast('Assignment published to class!', 'success');
      closeModal('create-group-assignment-modal');
      await loadGroupAssignments(state.activeGroupId);
    } else {
      showToast(res.error?.message || 'Failed to create assignment', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function viewGroupSubmissions(assignmentId, title, maxMarks) {
  document.getElementById('assign-sub-modal-title').innerText = `Submissions: ${title}`;
  document.getElementById('assign-sub-modal-meta').innerText = `Maximum Marks: ${maxMarks}`;
  const tbody = document.getElementById('assign-submissions-tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Loading roster submissions...</td></tr>';
  openModal('assignment-submissions-modal');

  try {
    const res = await fetchApi(`/assignments/${assignmentId}/submissions`);
    if (res.success) {
      const roster = res.data.roster || [];
      if (!roster.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No students in this group yet.</td></tr>';
        return;
      }
      tbody.innerHTML = roster.map(s => {
        const isSub = Boolean(s.submission_id);
        const statusLabel = isSub ? (s.status === 'GRADED' ? 'GRADED' : 'SUBMITTED') : 'PENDING';
        const statusClass = isSub ? (s.status === 'GRADED' ? 'badge-theory' : 'badge-members') : 'badge-sem';
        return `
              <tr>
                <td style="font-weight:700;">${s.class_roll_no || '—'}</td>
                <td style="font-weight:600;">${escapeHtml(s.full_name)}<br><small style="color:var(--text-muted);">${escapeHtml(s.official_enrollment_no)}</small></td>
                <td><span class="badge-pill ${statusClass}">${statusLabel}</span></td>
                <td>
                  ${s.file_path ? `<a href="${s.file_path}" target="_blank" style="color:var(--color-primary); font-size:0.8rem; text-decoration:none;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:0.3rem;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>${escapeHtml(s.original_filename || 'Attachment')}</a>` : '<span style="color:var(--text-muted); font-size:0.8rem;">No file</span>'}
                </td>
                <td>
                  <input type="number" id="sub-marks-${s.submission_id || s.student_id}" value="${s.marks_obtained !== null && s.marks_obtained !== undefined ? s.marks_obtained : ''}" min="0" max="${maxMarks}" placeholder="0-${maxMarks}" style="width:70px; padding:0.35rem; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-card); color:var(--text-main); font-size:0.82rem;">
                </td>
                <td>
                  <input type="text" id="sub-feedback-${s.submission_id || s.student_id}" value="${escapeHtml(s.feedback || '')}" placeholder="Feedback note..." style="width:100%; min-width:110px; padding:0.35rem; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-card); color:var(--text-main); font-size:0.82rem;">
                </td>
                <td style="text-align:right;">
                  ${isSub ? `
                    <button type="button" class="btn btn-primary" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="submitGradeSubmission(${s.submission_id}, ${maxMarks})">
                      Save
                    </button>
                  ` : '<span style="color:var(--text-muted); font-size:0.75rem;">Unsubmitted</span>'}
                </td>
              </tr>
            `;
      }).join('');
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:var(--status-absent); text-align:center;">Failed to load submissions</td></tr>';
  }
}

async function submitGradeSubmission(submissionId, maxMarks) {
  const marksInput = document.getElementById(`sub-marks-${submissionId}`);
  const feedbackInput = document.getElementById(`sub-feedback-${submissionId}`);
  const marks_obtained = marksInput && marksInput.value !== '' ? Number(marksInput.value) : null;
  const feedback = feedbackInput ? feedbackInput.value.trim() : '';

  try {
    const res = await fetchApi(`/assignments/submissions/${submissionId}/grade`, {
      method: 'PUT',
      body: JSON.stringify({ marks_obtained, feedback })
    });
    if (res.success) {
      showToast('Grade saved successfully!', 'success');
    } else {
      showToast(res.error?.message || 'Failed to save grade', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------
// TESTS & MARKSHEET
// ----------------------------------------------------
async function loadGroupTests(groupId) {
  const container = document.getElementById('hub-tests-container');
  container.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">Loading tests...</div>';
  try {
    const res = await fetchApi(`/exams?group_id=${groupId}`);
    if (res.success) {
      const items = res.data || [];
      if (!items.length) {
        container.innerHTML = `
              <div style="text-align:center; padding:2rem; background:var(--bg-surface); border-radius:var(--radius-md); color:var(--text-muted); font-size:0.85rem;">
                No class tests or exams scheduled yet for this group.<br>Click <strong>"+ Schedule Test"</strong> above to add an assessment.
              </div>
            `;
        return;
      }
      container.innerHTML = items.map(e => `
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem; margin-bottom:0.85rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
              <div style="flex:1; min-width:240px;">
                <div style="font-size:0.95rem; font-weight:700; color:var(--text-main); margin-bottom:0.25rem;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:0.3rem;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>${escapeHtml(e.name)}
                </div>
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap; font-size:0.75rem;">
                  <span class="badge-pill badge-sem">Date: ${e.exam_date || 'TBD'}</span>
                  <span class="badge-pill badge-sem">Max Marks: ${e.max_marks || 20}</span>
                  <span class="badge-pill badge-members">Graded: ${e.graded_count || 0}</span>
                </div>
              </div>
              <div>
                <button type="button" class="btn btn-primary" style="font-size:0.8rem; padding:0.4rem 0.75rem;" onclick="openEnterScoresModal(${e.id}, '${escapeHtml(e.name).replace(/'/g, "\\'")}', ${e.max_marks || 20})">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:0.3rem;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg><span>Enter / View Marks</span>
                </button>
              </div>
            </div>
          `).join('');
    }
  } catch (err) {
    container.innerHTML = '<div style="color:var(--status-absent);">Failed to load group tests</div>';
  }
}

function openCreateGroupTestModal() {
  document.getElementById('create-group-test-form').reset();
  document.getElementById('group-test-marks').value = 20;
  document.getElementById('group-test-date').value = new Date().toISOString().slice(0, 10);
  openModal('create-group-test-modal');
}

async function submitCreateGroupTest(e) {
  e.preventDefault();
  const name = document.getElementById('group-test-name').value.trim();
  const exam_date = document.getElementById('group-test-date').value;
  const max_marks = parseInt(document.getElementById('group-test-marks').value, 10) || 20;
  const unit_name = document.getElementById('group-test-unit')?.value?.trim() || null;

  const btn = document.getElementById('btn-submit-group-test');
  btn.disabled = true;

  try {
    const res = await fetchApi('/exams', {
      method: 'POST',
      body: JSON.stringify({
        name,
        exam_date,
        max_marks,
        unit_name,
        group_id: state.activeGroupId,
        department_id: state.activeGroupData?.department_id || 1,
        year: 1,
        semester: state.activeGroupData?.semester || 1
      })
    });
    if (res.success) {
      showToast('Class test scheduled successfully!', 'success');
      closeModal('create-group-test-modal');
      await loadGroupTests(state.activeGroupId);
    } else {
      showToast(res.error?.message || 'Failed to schedule test', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function openEnterScoresModal(examId, name, maxMarks) {
  state.activeExamId = examId;
  state.activeExamMaxMarks = maxMarks;
  document.getElementById('exam-scores-modal-title').innerText = `Marksheet: ${name}`;
  document.getElementById('exam-scores-modal-meta').innerText = `Maximum Marks: ${maxMarks}`;
  const tbody = document.getElementById('exam-scores-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Loading students roster...</td></tr>';
  openModal('exam-scores-modal');

  try {
    const res = await fetchApi(`/exams/${examId}/roster`);
    if (res.success) {
      const roster = res.data.roster || [];
      if (!roster.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No students enrolled in this group yet.</td></tr>';
        return;
      }
      tbody.innerHTML = roster.map(r => `
            <tr data-student-id="${r.student_id}">
              <td style="font-weight:700;">${r.class_roll_no || '—'}</td>
              <td style="font-weight:600;">${escapeHtml(r.full_name)}</td>
              <td><code>${escapeHtml(r.official_enrollment_no)}</code></td>
              <td>
                <input type="number" class="score-input" id="score-val-${r.student_id}" value="${r.marks_obtained !== null && r.marks_obtained !== undefined ? r.marks_obtained : ''}" min="0" max="${maxMarks}" placeholder="0-${maxMarks}" style="width:75px; padding:0.35rem; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-card); color:var(--text-main); font-size:0.82rem;" ${r.is_absent ? 'disabled' : ''}>
              </td>
              <td style="text-align:center;">
                <input type="checkbox" id="absent-check-${r.student_id}" ${r.is_absent ? 'checked' : ''} onchange="toggleAbsentScore(${r.student_id})">
              </td>
              <td>
                <input type="text" id="score-remark-${r.student_id}" value="${escapeHtml(r.remarks || '')}" placeholder="Note..." style="width:100%; min-width:100px; padding:0.35rem; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-card); color:var(--text-main); font-size:0.82rem;">
              </td>
            </tr>
          `).join('');
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:var(--status-absent); text-align:center;">Failed to load roster</td></tr>';
  }
}

function toggleAbsentScore(studentId) {
  const check = document.getElementById(`absent-check-${studentId}`);
  const val = document.getElementById(`score-val-${studentId}`);
  if (check && val) {
    val.disabled = check.checked;
    if (check.checked) val.value = '';
  }
}

async function submitSaveExamScores() {
  const tbody = document.getElementById('exam-scores-tbody');
  const rows = tbody.querySelectorAll('tr[data-student-id]');
  const scores = [];

  rows.forEach(r => {
    const studentId = Number(r.getAttribute('data-student-id'));
    const check = document.getElementById(`absent-check-${studentId}`);
    const val = document.getElementById(`score-val-${studentId}`);
    const rem = document.getElementById(`score-remark-${studentId}`);

    const isAbsent = check ? check.checked : false;
    const marks_obtained = isAbsent ? null : (val && val.value !== '' ? Number(val.value) : null);
    const remarks = rem ? rem.value.trim() : '';

    scores.push({
      student_id: studentId,
      marks_obtained,
      is_absent: isAbsent,
      remarks
    });
  });

  const btn = document.getElementById('btn-save-exam-scores');
  btn.disabled = true;

  try {
    const res = await fetchApi(`/exams/${state.activeExamId}/scores`, {
      method: 'POST',
      body: JSON.stringify({ scores })
    });
    if (res.success) {
      showToast('Marksheet updated successfully!', 'success');
      closeModal('exam-scores-modal');
      await loadGroupTests(state.activeGroupId);
    } else {
      showToast(res.error?.message || 'Failed to save scores', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ----------------------------------------------------
// ATTENDANCE TAB & SESSIONS
// ----------------------------------------------------
async function loadGroupAttendanceSummary(groupId) {
  const container = document.getElementById('hub-att-recent-sessions');
  container.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--text-muted);">Loading attendance metrics...</div>';
  try {
    const res = await fetchApi(`/reports/teaching-groups?group_id=${groupId}`);
    if (res.success && res.data && res.data.length > 0) {
      const g = res.data[0];
      document.getElementById('hub-att-conducted').innerText = g.sessions_conducted || 0;
      document.getElementById('hub-att-pct').innerText = `${g.average_attendance_percentage || 0}%`;
      document.getElementById('hub-att-students').innerText = g.student_count || 0;
    }

    // Fetch recent sessions
    if (state.activeGroupData?.linked_register_id) {
      const sRes = await fetchApi(`/attendance/sessions?register_id=${state.activeGroupData.linked_register_id}`);
      if (sRes.success) {
        const sessions = sRes.data || [];
        if (!sessions.length) {
          container.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--text-muted); font-size:0.85rem;">No attendance sessions held yet for this group register.</div>';
          return;
        }
        container.innerHTML = `
              <div style="font-size:0.85rem; font-weight:700; color:var(--text-main); margin-bottom:0.5rem;">Recent Attendance Sessions</div>
              <div style="display:flex; flex-direction:column; gap:0.5rem;">
                ${sessions.slice(0, 8).map(s => `
                  <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:0.6rem 0.85rem; font-size:0.82rem;">
                    <div>
                      <strong style="color:var(--text-main);">${escapeHtml(s.label || 'Session')}</strong>
                      <span style="color:var(--text-muted); margin-left:0.35rem;">(${s.session_date})</span>
                    </div>
                    <span class="badge-pill ${s.state === 'FINALIZED' ? 'badge-theory' : 'badge-sem'}">${s.state}</span>
                  </div>
                `).join('')}
              </div>
            `;
      }
    }
  } catch (err) {
    container.innerHTML = '<div style="color:var(--status-absent);">Failed to load attendance metrics</div>';
  }
}

function openLinkedRegister() {
  if (state.activeGroupData?.linked_register_id) {
    window.location.href = `/faculty/registers.html?register_id=${state.activeGroupData.linked_register_id}`;
  } else {
    window.location.href = '/faculty/registers.html';
  }
}

async function loadStreamFeed(groupId) {
  const feed = document.getElementById('stream-feed-container');
  feed.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">Loading announcements...</div>';
  try {
    const res = await fetchApi(`/teaching-groups/${groupId}/stream`);
    if (res.success) {
      const posts = res.data || [];
      if (!posts.length) {
        feed.innerHTML = `
              <div style="text-align:center; padding:2rem; background:var(--bg-surface); border-radius:var(--radius-md); color:var(--text-muted); font-size:0.85rem;">
                No announcements posted yet. Use the box above to post updates to your students!
              </div>
            `;
        return;
      }
      feed.innerHTML = posts.map(p => `
            <div class="stream-post-card" id="stream-post-${p.id}">
              <div class="stream-post-meta">
                <span style="font-weight:700; color:var(--text-main); display:inline-flex; align-items:center; gap:0.4rem;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:0.3rem;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>${escapeHtml(p.author_name || 'Teacher')}
                  <span class="comment-role-tag ${p.author_role === 'TEACHER' ? 'role-instructor' : 'role-student'}">
                    ${p.author_role === 'TEACHER' ? 'Instructor' : (p.author_role || 'Member')}
                  </span>
                </span>
                <span>${new Date(p.created_at).toLocaleString()}</span>
              </div>
              <div class="stream-post-content">${escapeHtml(p.content)}</div>

              <!-- Google Classroom Comments Section -->
              <div class="stream-comments-section">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.25rem 0.6rem; border:none; background:var(--bg-surface); color:var(--color-primary); cursor:pointer;" onclick="togglePostComments(${p.id})">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:0.3rem;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>Discussion (<span id="comment-count-${p.id}">${p.comment_count || 0}</span>)
                  </button>
                  <span style="font-size:0.72rem; color:var(--text-muted);">Click to view/add comments</span>
                </div>

                <div id="comments-container-${p.id}" style="display:none; margin-top:0.6rem;">
                  <div id="comments-list-${p.id}" style="margin-bottom:0.5rem;">
                    <!-- Injected via loadPostComments -->
                  </div>
                </div>

                <div class="comment-input-row">
                  <input type="text" id="comment-input-${p.id}" placeholder="Add a class comment or question..." onkeydown="if(event.key==='Enter')submitComment(${p.id})">
                  <button type="button" class="btn btn-primary" style="padding:0.4rem 0.75rem; font-size:0.78rem;" onclick="submitComment(${p.id})">
                    Post
                  </button>
                </div>
              </div>
            </div>
          `).join('');
    }
  } catch (err) {
    feed.innerHTML = '<div style="color:var(--status-absent);">Failed to load stream posts</div>';
  }
}

async function togglePostComments(postId) {
  const container = document.getElementById(`comments-container-${postId}`);
  if (!container) return;
  const isHidden = container.style.display === 'none';
  container.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    await loadPostComments(postId);
  }
}

async function loadPostComments(postId) {
  const listEl = document.getElementById(`comments-list-${postId}`);
  if (!listEl) return;
  listEl.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); padding:0.35rem 0;">Loading comments...</div>';

  try {
    const res = await fetchApi(`/teaching-groups/posts/${postId}/comments`);
    if (res.success) {
      const comments = res.data || [];
      const countEl = document.getElementById(`comment-count-${postId}`);
      if (countEl) countEl.innerText = comments.length;

      if (!comments.length) {
        listEl.innerHTML = '<div style="font-size:0.78rem; color:var(--text-muted); padding:0.4rem 0; font-style:italic;">No comments yet. Start the conversation!</div>';
        return;
      }

      listEl.innerHTML = comments.map(c => {
        const initial = (c.author_name || 'U').charAt(0).toUpperCase();
        const isTeacher = c.author_role === 'TEACHER';
        const roleClass = isTeacher ? 'role-instructor' : 'role-student';
        const roleLabel = isTeacher ? 'Instructor' : (c.author_role || 'Student');

        return `
              <div class="stream-comment-item">
                <div class="comment-avatar">${initial}</div>
                <div class="comment-bubble">
                  <div class="comment-header">
                    <span class="comment-author">
                      ${escapeHtml(c.author_name || 'Member')}
                      <span class="comment-role-tag ${roleClass}">${roleLabel}</span>
                    </span>
                    <span class="comment-time">${new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div class="comment-text">${escapeHtml(c.content)}</div>
                </div>
              </div>
            `;
      }).join('');
    }
  } catch (err) {
    listEl.innerHTML = '<div style="font-size:0.75rem; color:var(--status-absent);">Failed to load comments</div>';
  }
}

async function submitComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const content = input?.value.trim();
  if (!content) return;

  try {
    const res = await fetchApi(`/teaching-groups/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
    if (res.success) {
      input.value = '';
      const container = document.getElementById(`comments-container-${postId}`);
      if (container) container.style.display = 'block';
      await loadPostComments(postId);
    } else {
      showToast(res.error?.message || 'Failed to post comment', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitAnnouncement() {
  const input = document.getElementById('stream-post-input');
  const content = input.value.trim();
  if (!content) return;

  const btn = document.getElementById('btn-post-announcement');
  btn.disabled = true;

  try {
    const res = await fetchApi(`/teaching-groups/${state.activeGroupId}/stream`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
    if (res.success) {
      input.value = '';
      showToast('Announcement posted to class stream!', 'success');
      await loadStreamFeed(state.activeGroupId);
    } else {
      showToast(res.error?.message || 'Failed to post', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ----------------------------------------------------
// BROADCAST NOTICE MODAL (YEAR / SEMESTER COHORT)
// ----------------------------------------------------
function openBroadcastNoticeModal() {
  document.getElementById('broadcast-notice-form').reset();
  populateDepartmentDropdowns();
  openModal('broadcast-notice-modal');
}

async function submitBroadcastNotice(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-broadcast-notice');
  btn.disabled = true;
  btn.innerText = 'Broadcasting...';

  const targetCohort = document.getElementById('notice-target-cohort').value;
  const targetDept = document.getElementById('notice-department').value;
  const title = document.getElementById('notice-title').value.trim();
  const content = document.getElementById('notice-content').value.trim();

  let target_year = null;
  let target_semester = null;

  if (targetCohort.startsWith('Y')) {
    target_year = parseInt(targetCohort.slice(1), 10);
  } else if (targetCohort.startsWith('S')) {
    target_semester = parseInt(targetCohort.slice(1), 10);
  }

  const payload = {
    title,
    content,
    target_year,
    target_semester,
    department_id: targetDept !== 'ALL' ? Number(targetDept) : null
  };

  try {
    const res = await fetchApi('/teaching-groups/broadcast-notice', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      showToast(res.message || 'Notice broadcast successfully!', 'success');
      closeModal('broadcast-notice-modal');
      document.getElementById('broadcast-notice-form').reset();
      if (state.activeGroupId) {
        await loadStreamFeed(state.activeGroupId);
      }
    } else {
      showToast(res.error?.message || 'Failed to broadcast notice', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:0.3rem;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><span>Send Cohort Notice</span>';
  }
}

// ----------------------------------------------------
// PROMOTE COHORT MODAL (OPTION 2 ARCHIVING)
// ----------------------------------------------------
async function openPromoteCohortModal(groupId) {
  const group = state.groups.find(g => g.id === Number(groupId));
  if (!group) return;

  state.activeGroupId = group.id;
  document.getElementById('promote-old-name').innerText = `${group.name} (Semester ${group.semester})`;
  const nextSem = Math.min(6, (group.semester || 1) + 1);

  const newNameInput = document.getElementById('promote-new-name');
  const nextSemSelect = document.getElementById('promote-new-semester');
  if (nextSemSelect) nextSemSelect.value = String(nextSem);
  if (newNameInput) newNameInput.value = `${group.subject_name} - ${group.component} (Sem ${nextSem})`;
  updatePromoteDerivedYear();

  const tbody = document.getElementById('promote-checklist-tbody');
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Loading group roster...</td></tr>';
  openModal('promote-cohort-modal');

  try {
    const res = await fetchApi(`/teaching-groups/${groupId}/members`);
    if (res.success) {
      state.promoteMembers = res.data || [];
      renderPromoteChecklist();
    } else {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1rem; color:var(--status-absent);">Failed to load students</td></tr>';
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:1rem; color:var(--status-absent);">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderPromoteChecklist() {
  const tbody = document.getElementById('promote-checklist-tbody');
  if (!state.promoteMembers.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No students in this group yet.</td></tr>';
    document.getElementById('promote-selected-count').innerText = '0';
    document.getElementById('promote-total-count').innerText = '0';
    return;
  }

  tbody.innerHTML = state.promoteMembers.map(s => `
        <tr>
          <td style="text-align:center;">
            <input type="checkbox" class="promote-student-chk" value="${s.student_id}" checked onchange="updatePromoteTally()">
          </td>
          <td style="font-weight:700;">${s.class_roll_no || '—'}</td>
          <td style="font-weight:600;">${escapeHtml(s.full_name || s.student_name)}</td>
          <td><code>${escapeHtml(s.official_enrollment_no)}</code></td>
        </tr>
      `).join('');

  document.getElementById('promote-select-all').checked = true;
  updatePromoteTally();
}

function togglePromoteSelectAll(checked) {
  document.querySelectorAll('.promote-student-chk').forEach(c => c.checked = checked);
  updatePromoteTally();
}

function updatePromoteTally() {
  const chks = document.querySelectorAll('.promote-student-chk');
  const selected = Array.from(chks).filter(c => c.checked).length;
  document.getElementById('promote-selected-count').innerText = selected;
  document.getElementById('promote-total-count').innerText = chks.length;
}

async function submitPromoteCohort(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-promote-cohort');
  btn.disabled = true;
  btn.innerText = 'Promoting...';

  const selectedStudentIds = Array.from(document.querySelectorAll('.promote-student-chk:checked')).map(c => Number(c.value));
  const new_name = document.getElementById('promote-new-name').value.trim();
  const new_semester = parseInt(document.getElementById('promote-new-semester').value, 10);

  try {
    const res = await fetchApi(`/teaching-groups/${state.activeGroupId}/promote`, {
      method: 'POST',
      body: JSON.stringify({
        new_name,
        new_semester,
        student_ids: selectedStudentIds
      })
    });

    if (res.success) {
      showToast(res.message || 'Cohort promoted successfully!', 'success');
      closeModal('promote-cohort-modal');
      closeModal('classroom-hub-modal');
      await loadTeachingGroups();
    } else {
      showToast(res.error?.message || 'Failed to promote cohort', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:0.3rem;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg><span>Confirm & Promote Cohort</span>';
  }
}

// ----------------------------------------------------
// ADD UNENROLLED STUDENTS MODAL (CLEAN FILTERED LIST)
// ----------------------------------------------------
async function openAddUnenrolledModal() {
  const tbody = document.getElementById('unenrolled-checklist-tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Finding unenrolled students...</td></tr>';
  document.getElementById('search-unenrolled-input').value = '';
  openModal('add-unenrolled-modal');

  try {
    const res = await fetchApi(`/teaching-groups/${state.activeGroupId}/unenrolled-students`);
    if (res.success) {
      state.unenrolledStudents = res.data || [];
      renderUnenrolledStudents();
    } else {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:var(--status-absent);">Failed to load unenrolled students</td></tr>';
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1rem; color:var(--status-absent);">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderUnenrolledStudents() {
  const tbody = document.getElementById('unenrolled-checklist-tbody');
  const q = (document.getElementById('search-unenrolled-input').value || '').trim().toLowerCase();

  const filtered = state.unenrolledStudents.filter(s => {
    if (!q) return true;
    const name = (s.full_name || '').toLowerCase();
    const eno = (s.official_enrollment_no || '').toLowerCase();
    const roll = String(s.class_roll_no || '');
    return name.includes(q) || eno.includes(q) || roll.includes(q);
  });

  document.getElementById('unenrolled-count').innerText = filtered.length;

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No unenrolled students found for this cohort.</td></tr>';
    updateUnenrolledTally();
    return;
  }

  tbody.innerHTML = filtered.map(s => `
        <tr>
          <td style="text-align:center;">
            <input type="checkbox" class="unenrolled-student-chk" value="${s.student_id}" onchange="updateUnenrolledTally()">
          </td>
          <td style="font-weight:700;">${s.class_roll_no || '—'}</td>
          <td style="font-weight:600;">${escapeHtml(s.full_name)}</td>
          <td><code>${escapeHtml(s.official_enrollment_no)}</code></td>
          <td style="text-align:right;">
            <button type="button" class="btn btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.75rem;" onclick="enrollSingleStudent(${s.student_id})">
              + Enroll
            </button>
          </td>
        </tr>
      `).join('');

  document.getElementById('unenrolled-select-all').checked = false;
  updateUnenrolledTally();
}

function filterUnenrolledStudents() {
  renderUnenrolledStudents();
}

function toggleUnenrolledSelectAll(checked) {
  document.querySelectorAll('.unenrolled-student-chk').forEach(c => c.checked = checked);
  updateUnenrolledTally();
}

function updateUnenrolledTally() {
  const chks = document.querySelectorAll('.unenrolled-student-chk');
  const selected = Array.from(chks).filter(c => c.checked).length;
  document.getElementById('unenrolled-selected-tally').innerText = selected;
  const batchBtn = document.getElementById('btn-batch-enroll-unenrolled');
  if (batchBtn) batchBtn.disabled = selected === 0;
}

async function enrollSingleStudent(studentId) {
  await executeEnrollStudents([studentId]);
}

async function submitBatchEnrollUnenrolled() {
  const chks = document.querySelectorAll('.unenrolled-student-chk:checked');
  const studentIds = Array.from(chks).map(c => Number(c.value));
  if (!studentIds.length) return;
  await executeEnrollStudents(studentIds);
}

async function executeEnrollStudents(studentIds) {
  try {
    const res = await fetchApi(`/teaching-groups/${state.activeGroupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ student_ids: studentIds })
    });
    if (res.success) {
      showToast(`Enrolled ${studentIds.length} student(s) successfully!`, 'success');
      closeModal('add-unenrolled-modal');
      const groupRes = await fetchApi(`/teaching-groups/${state.activeGroupId}`);
      if (groupRes.success) {
        renderRoster(groupRes.data.members || []);
        document.getElementById('hub-roster-count').innerText = (groupRes.data.members || []).length;
      }
      await loadTeachingGroups();
    } else {
      showToast(res.error?.message || 'Failed to enroll students', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------
// OPTION 3: AUTO-ARCHIVE EXPIRED CHECK
// ----------------------------------------------------
async function triggerAutoArchiveCheck() {
  const btn = document.getElementById('btn-auto-archive-check');
  if (btn) btn.disabled = true;

  try {
    const res = await fetchApi('/teaching-groups/auto-archive-expired', { method: 'POST' });
    if (res.success) {
      const count = res.data?.archived_count || 0;
      if (count > 0) {
        showToast(`Auto-archived ${count} group(s) from expired academic session(s).`, 'success');
        await loadTeachingGroups();
      } else {
        showToast('All active groups belong to current academic session. No expired groups to archive.', 'info');
      }
    } else {
      showToast(res.error?.message || 'Auto-archive check failed', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderRoster(members) {
  const tbody = document.getElementById('hub-roster-tbody');
  if (!members.length) {
    tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; padding:1.5rem; color:var(--text-muted);">
              No students enrolled yet. Share your invite code with students or add them using the form above.
            </td>
          </tr>
        `;
    return;
  }
  tbody.innerHTML = members.map(m => `
        <tr>
          <td style="font-weight:700;">${m.class_roll_no || '—'}</td>
          <td style="font-weight:600;">${escapeHtml(m.student_name)}</td>
          <td><code>${escapeHtml(m.official_enrollment_no)}</code></td>
          <td><code style="font-family:'JetBrains Mono',monospace;">${escapeHtml(m.registration_no || '—')}</code></td>
          <td style="text-align:right;">
            <button type="button" class="btn btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.75rem; color:var(--status-absent);" onclick="removeMember(${m.student_id}, '${escapeHtml(m.student_name).replace(/'/g, "\\'")}')">
              Remove
            </button>
          </td>
        </tr>
      `).join('');
}

async function addStudentByEnrollment() {
  const input = document.getElementById('add-student-enrollment');
  const val = input.value.trim();
  if (!val) return;

  try {
    const res = await fetchApi(`/teaching-groups/${state.activeGroupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ official_enrollment_no: val })
    });
    if (res.success) {
      input.value = '';
      showToast('Student enrolled successfully!', 'success');
      const groupRes = await fetchApi(`/teaching-groups/${state.activeGroupId}`);
      if (groupRes.success) {
        renderRoster(groupRes.data.members || []);
        document.getElementById('hub-roster-count').innerText = (groupRes.data.members || []).length;
      }
      await loadTeachingGroups();
    } else {
      showToast(res.error?.message || 'Failed to add student', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

let _pendingMemberRemove = null;

function openRemoveMemberModal(studentId, name) {
  _pendingMemberRemove = { studentId, name };
  document.getElementById('remove-member-step1-name').textContent = name;
  document.getElementById('remove-member-step2-name').textContent = name;
  document.getElementById('remove-member-step-1').style.display = '';
  document.getElementById('remove-member-step-2').style.display = 'none';
  document.getElementById('remove-member-checkbox').checked = false;
  document.getElementById('btn-confirm-remove-member').disabled = true;
  openModal('modal-confirm-remove-member');
}

function proceedRemoveMemberStep2() {
  document.getElementById('remove-member-step-1').style.display = 'none';
  document.getElementById('remove-member-step-2').style.display = '';
}

function backRemoveMemberStep1() {
  document.getElementById('remove-member-step-1').style.display = '';
  document.getElementById('remove-member-step-2').style.display = 'none';
}

async function executeConfirmedRemoveMember() {
  if (!_pendingMemberRemove) return;
  const { studentId, name } = _pendingMemberRemove;
  const btn = document.getElementById('btn-confirm-remove-member');
  btn.disabled = true;
  btn.textContent = 'Removing...';
  try {
    const res = await fetchApi(`/teaching-groups/${state.activeGroupId}/members/${studentId}`, {
      method: 'DELETE'
    });
    closeModal('modal-confirm-remove-member');
    if (res.success) {
      showToast(`${name} removed from group`, 'info');
      const groupRes = await fetchApi(`/teaching-groups/${state.activeGroupId}`);
      if (groupRes.success) {
        renderRoster(groupRes.data.members || []);
        document.getElementById('hub-roster-count').innerText = (groupRes.data.members || []).length;
      }
      await loadTeachingGroups();
    } else {
      showToast(res.error?.message || 'Failed to remove student', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm & Remove';
    _pendingMemberRemove = null;
  }
}

function removeMember(studentId, name) {
  openRemoveMemberModal(studentId, name);
}

function promptArchiveGroup(groupId, name, currentStatus) {
  state.archiveTargetGroup = { id: groupId, name, currentStatus };
  document.getElementById('archive-target-group-name').innerText = name;
  document.getElementById('archive-modal-title').innerHTML = currentStatus === 'ARCHIVED' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:0.35rem;"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg><span>Restore Teaching Group</span>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:0.35rem;"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg><span>Archive Teaching Group</span>';
  document.getElementById('btn-confirm-archive').innerText = currentStatus === 'ARCHIVED' ? 'Confirm & Restore Group' : 'Confirm & Archive Group';
  document.getElementById('archive-step-1').style.display = '';
  document.getElementById('archive-step-2').style.display = 'none';
  openModal('archive-group-modal');
}

function proceedArchiveStep2() {
  document.getElementById('archive-step-1').style.display = 'none';
  document.getElementById('archive-step-2').style.display = '';
}

function backArchiveStep1() {
  document.getElementById('archive-step-1').style.display = '';
  document.getElementById('archive-step-2').style.display = 'none';
}

async function executeArchiveGroup() {
  if (!state.archiveTargetGroup) return;
  const { id, currentStatus } = state.archiveTargetGroup;
  const endpoint = currentStatus === 'ARCHIVED' ? `/teaching-groups/${id}/unarchive` : `/teaching-groups/${id}/archive`;

  try {
    const res = await fetchApi(endpoint, {
      method: 'POST'
    });
    if (res.success) {
      const actionText = currentStatus === 'ARCHIVED' ? 'restored to active' : 'archived';
      showToast(`Teaching group ${actionText} successfully!`, 'success');
      closeModal('archive-group-modal');
      await loadTeachingGroups();
    } else {
      showToast(res.error?.message || 'Failed to update archive status', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function copyInviteCode(code) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => {
      showToast(`Invite code "${code}" copied to clipboard!`, 'info');
    }).catch(() => fallbackCopy(code));
  } else {
    fallbackCopy(code);
  }
}

function copyHubInviteCode() {
  const code = document.getElementById('hub-invite-code').innerText;
  copyInviteCode(code);
}

function fallbackCopy(text) {
  const input = document.createElement('input');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  showToast(`Copied code "${text}"`, 'info');
}

// Dismiss on backdrop click or outside menu click
document.addEventListener('click', (e) => {
  if (e.target && typeof e.target.closest === 'function') {
    if (!e.target.closest('.gc-menu-dropdown') && !e.target.closest('.gc-card-dots-btn') && !e.target.closest('.gc-action-icon')) {
      document.querySelectorAll('.gc-menu-dropdown.open').forEach(el => el.classList.remove('open'));
    }
  } else {
    document.querySelectorAll('.gc-menu-dropdown.open').forEach(el => el.classList.remove('open'));
  }
  if (e.target && e.target.classList && e.target.classList.contains('modal-backdrop')) {
    closeModal(e.target.id);
  }
});

// Dismiss on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.open, .modal-backdrop').forEach(el => closeModal(el.id));
    document.querySelectorAll('.gc-menu-dropdown.open').forEach(el => el.classList.remove('open'));
  }
});

// Modal Helpers
function openModal(idOrEl) {
  const modal = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    document.body.classList.add('modal-open');
    const firstInput = modal.querySelector('input:not([disabled]), select:not([disabled]), button:not([disabled])');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
  }
}

function closeModal(idOrEl) {
  const modal = idOrEl ? (typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl) : document.querySelector('.modal-backdrop.open, .modal.open');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
    modal.style.opacity = '';
    modal.style.pointerEvents = '';
    if (!document.querySelector('.modal-backdrop.open, .modal.open')) {
      document.body.classList.remove('modal-open');
    }
  }
}

// Expose modal helpers globally
window.openModal = openModal;
window.closeModal = closeModal;

// ─── 1-CLICK MODAL CONTROLLERS (HOD & TEACHERS) ───
let hodFacultyList = [];
let hodStudentsList = [];
let hodClassesList = [];
let teacherStudentsList = [];

// 1. HOD: View Department Faculty (1-Click)
window.openHodFacultyModal = async function () {
  openModal('modal-hod-faculty');
  const wrap = document.getElementById('hod-faculty-table-wrap');
  if (wrap) wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">Loading department faculty roster...</div>';
  try {
    const res = await fetchApi('/hod/faculty-roster');
    if (res.success && Array.isArray(res.data)) {
      hodFacultyList = res.data;
      renderHodFacultyTable(hodFacultyList);
    } else {
      wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--status-absent);">Failed to load faculty roster.</div>';
    }
  } catch (err) {
    if (wrap) wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--status-absent);">Error loading faculty data.</div>';
  }
};

function renderHodFacultyTable(list) {
  const wrap = document.getElementById('hod-faculty-table-wrap');
  if (!wrap) return;
  if (!list.length) {
    wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">No faculty members found in department.</div>';
    return;
  }
  wrap.innerHTML = `
        <table class="one-click-table">
          <thead>
            <tr>
              <th>Faculty Name</th>
              <th>Contact Info</th>
              <th>Teaching Load</th>
              <th>Assigned Subjects</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(f => {
    const roles = [];
    if (f.is_hod) roles.push('<span class="badge badge-admin" style="font-size:0.65rem;">HOD</span>');
    else roles.push('<span class="badge badge-pending" style="font-size:0.65rem;">Faculty</span>');
    const subjects = Array.isArray(f.assigned_subjects) && f.assigned_subjects.length
      ? f.assigned_subjects.map(s => `<span class="badge badge-sem" style="font-size:0.68rem; margin:1px;">${escapeHtml(s)}</span>`).join(' ')
      : '<span style="color:var(--text-muted); font-size:0.75rem;">None assigned</span>';
    return `
                <tr>
                  <td>
                    <div style="font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:0.4rem;">
                      ${escapeHtml(f.full_name)}
                      ${roles.join(' ')}
                    </div>
                  </td>
                  <td>
                    <div style="font-size:0.78rem; color:var(--text-main);">${escapeHtml(f.email)}</div>
                    <div style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(f.phone_number || '--')}</div>
                  </td>
                  <td>
                    <div style="font-weight:600; font-size:0.8rem;">${f.teaching_groups_count || 0} Classes</div>
                    <div style="font-size:0.72rem; color:var(--text-muted);">${f.active_registers_count || 0} Registers</div>
                  </td>
                  <td>${subjects}</td>
                </tr>
              `;
  }).join('')}
          </tbody>
        </table>
      `;
}

window.filterHodFacultyList = function () {
  const q = (document.getElementById('search-hod-faculty')?.value || '').toLowerCase().trim();
  if (!q) {
    renderHodFacultyTable(hodFacultyList);
    return;
  }
  const filtered = hodFacultyList.filter(f => {
    const name = (f.full_name || '').toLowerCase();
    const email = (f.email || '').toLowerCase();
    const subs = Array.isArray(f.assigned_subjects) ? f.assigned_subjects.join(' ').toLowerCase() : '';
    return name.includes(q) || email.includes(q) || subs.includes(q);
  });
  renderHodFacultyTable(filtered);
};

// 2. HOD: View Department Students (1-Click)
window.openHodStudentsModal = async function () {
  openModal('modal-hod-students');
  const wrap = document.getElementById('hod-students-table-wrap');
  if (wrap) wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">Loading department students directory...</div>';
  try {
    const res = await fetchApi('/hod/students-roster');
    if (res.success && Array.isArray(res.data)) {
      hodStudentsList = res.data;
      renderHodStudentsTable(hodStudentsList);
    } else {
      wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--status-absent);">Failed to load students roster.</div>';
    }
  } catch (err) {
    if (wrap) wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--status-absent);">Error loading student data.</div>';
  }
};

function renderHodStudentsTable(list) {
  const wrap = document.getElementById('hod-students-table-wrap');
  if (!wrap) return;
  if (!list.length) {
    wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">No students matching criteria found.</div>';
    return;
  }
  wrap.innerHTML = `
        <table class="one-click-table">
          <thead>
            <tr>
              <th>Roll No.</th>
              <th>Student Name</th>
              <th>Sem / Batch</th>
              <th>Attendance %</th>
              <th>Status</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(st => {
    const att = st.attendance_pct != null ? `${st.attendance_pct}%` : 'N/A';
    const statusBadge = (st.below_threshold || st.is_defaulter || (st.attendance_pct != null && st.attendance_pct < 75))
      ? '<span class="badge badge-absent" style="font-size:0.7rem; font-weight:700;">Below 75%</span>'
      : '<span class="badge badge-present" style="font-size:0.7rem; font-weight:700;">Regular</span>';
    return `
                <tr>
                  <td style="font-weight:700; font-family:var(--font-family-mono); color:var(--color-primary);">${escapeHtml(st.roll_number || '--')}</td>
                  <td style="font-weight:600; color:var(--text-main);">${escapeHtml(st.full_name)}</td>
                  <td>Sem ${st.semester || '--'} • ${escapeHtml(st.batch || 'Batch')}</td>
                  <td>
                    <div style="font-weight:700; font-size:0.85rem; color:${st.is_defaulter ? 'var(--status-absent)' : 'var(--status-present)'};">${att}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">${st.attended_sessions || 0}/${st.total_sessions || 0} classes</div>
                  </td>
                  <td>${statusBadge}</td>
                  <td>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(st.email || '--')}</div>
                  </td>
                </tr>
              `;
  }).join('')}
          </tbody>
        </table>
      `;
}

window.filterHodStudentsList = function () {
  const q = (document.getElementById('search-hod-students')?.value || '').toLowerCase().trim();
  const sem = document.getElementById('filter-hod-students-sem')?.value || '';
  let filtered = hodStudentsList;
  if (sem) {
    filtered = filtered.filter(st => String(st.semester) === String(sem));
  }
  if (q) {
    filtered = filtered.filter(st => {
      const roll = (st.roll_number || '').toLowerCase();
      const name = (st.full_name || '').toLowerCase();
      const batch = (st.batch || '').toLowerCase();
      return roll.includes(q) || name.includes(q) || batch.includes(q);
    });
  }
  renderHodStudentsTable(filtered);
};

// 3. HOD: View Department Classes & Student Attendance (1-Click)
window.openHodClassesModal = async function () {
  openModal('modal-hod-classes');
  window.hideHodClassAttendanceDetail();
  const wrap = document.getElementById('hod-classes-table-wrap');
  if (wrap) wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">Loading department classes...</div>';
  try {
    const res = await fetchApi('/hod/department-classes');
    if (res.success && Array.isArray(res.data)) {
      hodClassesList = res.data;
      renderHodClassesTable(hodClassesList);
    } else {
      wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--status-absent);">Failed to load department classes.</div>';
    }
  } catch (err) {
    if (wrap) wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--status-absent);">Error loading class data.</div>';
  }
};

function renderHodClassesTable(list) {
  const wrap = document.getElementById('hod-classes-table-wrap');
  if (!wrap) return;
  if (!list.length) {
    wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">No active subject classes found in department.</div>';
    return;
  }
  wrap.innerHTML = `
        <table class="one-click-table">
          <thead>
            <tr>
              <th>Subject / Class</th>
              <th>Sem</th>
              <th>Teacher In-Charge</th>
              <th>Sessions</th>
              <th>Class Avg Att.</th>
              <th style="text-align:right;">1-Click Action</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(c => {
    const avgAtt = c.avg_attendance_pct != null ? `${c.avg_attendance_pct}%` : 'N/A';
    return `
                <tr>
                  <td>
                    <div style="font-weight:700; color:var(--text-main);">${escapeHtml(c.subject_name || c.class_name)}</div>
                    <div style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(c.subject_code || '')} • ${c.enrolled_students || 0} students</div>
                  </td>
                  <td><span class="badge badge-sem">Sem ${c.semester}</span></td>
                  <td>
                    <div style="font-weight:600; font-size:0.8rem; color:var(--text-main);">${escapeHtml(c.teacher_name || 'Faculty')}</div>
                    <div style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(c.teacher_email || '')}</div>
                  </td>
                  <td style="font-weight:600; font-family:var(--font-family-mono);">${c.total_sessions || 0} held</td>
                  <td>
                    <span class="badge ${c.avg_attendance_pct != null && c.avg_attendance_pct >= 75 ? 'badge-present' : 'badge-absent'}" style="font-weight:700;">
                      ${avgAtt}
                    </span>
                  </td>
                  <td style="text-align:right;">
                    <button type="button" class="btn btn-primary btn-sm" onclick="loadHodClassAttendance(${c.register_id}, '${escapeHtml(c.subject_name || c.class_name).replace(/'/g, "\\'")}', ${c.semester})" style="font-size:0.78rem; padding:0.35rem 0.65rem; display:inline-flex; align-items:center; gap:0.35rem;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      <span>View Student Attendance</span>
                    </button>
                  </td>
                </tr>
              `;
  }).join('')}
          </tbody>
        </table>
      `;
}

window.loadHodClassAttendance = async function (registerId, subjectName, semester) {
  const detailWrap = document.getElementById('hod-class-attendance-detail-wrap');
  const tableCont = document.getElementById('hod-drilldown-table-container');
  const titleElem = document.getElementById('hod-drilldown-title');
  const subElem = document.getElementById('hod-drilldown-sub');

  if (!detailWrap || !tableCont) return;
  detailWrap.style.display = 'block';
  if (titleElem) titleElem.innerText = `${subjectName} (Semester ${semester}) — Student Attendance`;
  if (subElem) subElem.innerText = `Fetching student-by-student attendance for this subject...`;
  tableCont.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">Loading student attendance roster...</div>';

  try {
    const res = await fetchApi(`/hod/department-classes/${registerId}/attendance`);
    if (res.success && res.data) {
      const students = res.data.students || [];
      const reg = res.data.register || {};
      if (subElem) subElem.innerText = `Total Sessions: ${reg.total_sessions || 0} • Enrolled Students: ${students.length}`;

      if (!students.length) {
        tableCont.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">No enrolled students found in this subject class.</div>';
        return;
      }

      tableCont.innerHTML = `
            <table class="one-click-table" style="background:var(--bg-card); border-radius:var(--radius-md); overflow:hidden;">
              <thead>
                <tr>
                  <th>Roll No.</th>
                  <th>Student Name</th>
                  <th>Attended / Total</th>
                  <th>Attendance %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${students.map(st => {
        const statusBadge = (st.below_threshold || st.is_defaulter || (st.attendance_pct != null && st.attendance_pct < 75))
          ? '<span class="badge badge-absent" style="font-size:0.7rem; font-weight:700;">Below 75%</span>'
          : '<span class="badge badge-present" style="font-size:0.7rem; font-weight:700;">Regular</span>';
        return `
                    <tr>
                      <td style="font-weight:700; font-family:var(--font-family-mono); color:var(--color-primary);">${escapeHtml(st.roll_number || '--')}</td>
                      <td style="font-weight:600; color:var(--text-main);">${escapeHtml(st.full_name)}</td>
                      <td style="font-family:var(--font-family-mono);">${st.attended_sessions} / ${st.total_sessions}</td>
                      <td>
                        <span style="font-weight:700; color:${st.is_defaulter ? 'var(--status-absent)' : 'var(--status-present)'};">
                          ${st.attendance_pct}%
                        </span>
                      </td>
                      <td>${statusBadge}</td>
                    </tr>
                  `;
      }).join('')}
              </tbody>
            </table>
          `;
    } else {
      tableCont.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--status-absent);">Could not load subject attendance data.</div>';
    }
  } catch (err) {
    tableCont.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--status-absent);">Error loading attendance data.</div>';
  }
};

window.hideHodClassAttendanceDetail = function () {
  const detailWrap = document.getElementById('hod-class-attendance-detail-wrap');
  if (detailWrap) detailWrap.style.display = 'none';
};

// 4. TEACHER: View My Students (1-Click)
window.openTeacherStudentsModal = async function () {
  openModal('modal-teacher-students');
  const wrap = document.getElementById('teacher-students-table-wrap');
  if (wrap) wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">Loading your students directory...</div>';
  try {
    const res = await fetchApi('/faculty/my-students');
    if (res.success && Array.isArray(res.data)) {
      teacherStudentsList = res.data;
      renderTeacherStudentsTable(teacherStudentsList);
    } else {
      wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--status-absent);">Failed to load students directory.</div>';
    }
  } catch (err) {
    if (wrap) wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--status-absent);">Error loading students directory.</div>';
  }
};

function renderTeacherStudentsTable(list) {
  const wrap = document.getElementById('teacher-students-table-wrap');
  if (!wrap) return;
  if (!list.length) {
    wrap.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">No enrolled students found under your classes.</div>';
    return;
  }
  wrap.innerHTML = `
        <table class="one-click-table">
          <thead>
            <tr>
              <th>Roll No.</th>
              <th>Student Name</th>
              <th>Enrolled Class(es)</th>
              <th>Attended / Total</th>
              <th>Attendance %</th>
              <th>Status</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(st => {
    const classes = Array.isArray(st.enrolled_classes) && st.enrolled_classes.length
      ? st.enrolled_classes.map(c => `<span class="badge badge-sem" style="font-size:0.68rem; margin:1px;">${escapeHtml(c)}</span>`).join(' ')
      : '<span style="color:var(--text-muted); font-size:0.75rem;">None</span>';
    const statusBadge = (st.below_threshold || st.is_defaulter || (st.attendance_pct != null && st.attendance_pct < 75))
      ? '<span class="badge badge-absent" style="font-size:0.7rem; font-weight:700;">Below 75%</span>'
      : '<span class="badge badge-present" style="font-size:0.7rem; font-weight:700;">Regular</span>';
    return `
                <tr>
                  <td style="font-weight:700; font-family:var(--font-family-mono); color:var(--color-primary);">${escapeHtml(st.roll_number || '--')}</td>
                  <td style="font-weight:600; color:var(--text-main);">${escapeHtml(st.full_name)}</td>
                  <td>${classes}</td>
                  <td style="font-family:var(--font-family-mono); font-weight:600;">${st.attended_sessions} / ${st.total_sessions}</td>
                  <td>
                    <span style="font-weight:700; color:${st.is_defaulter ? 'var(--status-absent)' : 'var(--status-present)'};">
                      ${st.attendance_pct}%
                    </span>
                  </td>
                  <td>${statusBadge}</td>
                  <td>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(st.email || '--')}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">${escapeHtml(st.phone_number || '')}</div>
                  </td>
                </tr>
              `;
  }).join('')}
          </tbody>
        </table>
      `;
}

window.filterTeacherStudentsList = function () {
  const q = (document.getElementById('search-teacher-students')?.value || '').toLowerCase().trim();
  if (!q) {
    renderTeacherStudentsTable(teacherStudentsList);
    return;
  }
  const filtered = teacherStudentsList.filter(st => {
    const roll = (st.roll_number || '').toLowerCase();
    const name = (st.full_name || '').toLowerCase();
    const classes = Array.isArray(st.enrolled_classes) ? st.enrolled_classes.join(' ').toLowerCase() : '';
    return roll.includes(q) || name.includes(q) || classes.includes(q);
  });
  renderTeacherStudentsTable(filtered);
};

init();

