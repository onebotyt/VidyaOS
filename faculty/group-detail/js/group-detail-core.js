/**
 * ══════════════════════════════════════════════════════════════
 * GROUP-DETAIL: CORE & SHELL CONTROLLER
 * frontend/faculty/group-detail/js/group-detail-core.js
 * ══════════════════════════════════════════════════════════════
 */

var apiFetch = window.apiFetch || ((url, opts) => typeof apiRequest === 'function' ? apiRequest(url, opts) : fetchApi(url.replace(/^\/api\/v1/, ''), opts));

// Global Application State shared across classroom modules
window.S = window.S || {
  groupId: null,
  group: null,
  members: [],
  posts: [],
  assignments: [],
  tests: [],
  tab: 'stream',
  cwFilter: 'all',
  currentTest: null,
  expandedRosters: {},
  marksColumnsVisibility: { srNo: true, enrollmentNo: true, registrationNo: true }
};
var S = window.S;

function ById(id) {
  return document.getElementById(id);
}

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initials(name) {
  if (!name) return '?';
  const p = name.trim().split(/[\s]+/);
  return p.length === 1 ? p[0].substring(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function relTime(ds) {
  if (!ds) return '';
  const d = new Date(ds), now = new Date(), ms = now - d, min = Math.floor(ms / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return min + 'm ago';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h ago';
  const day = Math.floor(hr / 24);
  if (day < 7) return day + 'd ago';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatClassroomDate(ds) {
  if (!ds) return '';
  const d = new Date(ds);
  if (isNaN(d.getTime())) return ds;
  const now = new Date();
  const isSameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(isSameYear ? {} : { year: 'numeric' })
  });
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return bytes + ' B';
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  const mb = kb / 1024;
  return mb.toFixed(1) + ' MB';
}

function getFileTypeMeta(fileName) {
  if (!fileName) return { ext: 'FILE', badgeClass: 'badge-file', badge: 'FILE', cls: 'badge-file' };
  const ext = (fileName.split('.').pop() || 'FILE').toUpperCase();
  let badgeClass = 'badge-file';
  switch (ext) {
    case 'PDF': badgeClass = 'badge-pdf'; break;
    case 'DOC':
    case 'DOCX': badgeClass = 'badge-doc'; break;
    case 'XLS':
    case 'XLSX':
    case 'CSV': badgeClass = 'badge-xls'; break;
    case 'PPT':
    case 'PPTX': badgeClass = 'badge-ppt'; break;
    case 'ZIP':
    case 'RAR':
    case '7Z': badgeClass = 'badge-zip'; break;
    case 'JPG':
    case 'JPEG':
    case 'PNG':
    case 'GIF':
    case 'WEBP': badgeClass = 'badge-img'; break;
    case 'JS':
    case 'HTML':
    case 'CSS':
    case 'PY':
    case 'JAVA':
    case 'C':
    case 'CPP': badgeClass = 'badge-code'; break;
    default: badgeClass = 'badge-file'; break;
  }
  const badge = ext.length > 4 ? ext.slice(0, 4) : ext;
  return { ext, badgeClass, badge, cls: badgeClass };
}

let toastT;
function toast(msg) {
  const t = ById('gd-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 3500);
}

function emptyState(icon, title, desc) {
  const svg = (window.getSvgIcon ? window.getSvgIcon(icon, 36) : '') || icon;
  return '<div class="empty-state"><div class="empty-icon">' + svg + '</div><div class="empty-title">' + title + '</div><p class="empty-desc">' + desc + '</p></div>';
}

function autoResizeTA(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

function openModal(id) {
  const el = ById(id);
  if (!el) return;
  el.classList.add('open');
  el.style.display = 'flex';
  document.body.classList.add('modal-open');
  if ((id === 'modal-enter-marks' || id === 'modal-enter-assignment-marks') && window.innerWidth < 768) {
    document.body.classList.add('marks-standalone-page');
    document.documentElement.classList.add('marks-standalone-page');
  }
}

function closeModal(id) {
  const el = ById(id);
  if (!el) return;
  el.classList.remove('open');
  el.style.display = 'none';
  if (id === 'modal-enter-marks' || id === 'modal-enter-assignment-marks') {
    document.body.classList.remove('marks-standalone-page');
    document.documentElement.classList.remove('marks-standalone-page');
  }
  if (!document.querySelector('.modal-backdrop.open')) {
    document.body.classList.remove('modal-open');
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (typeof closeAnnouncementDetail === 'function') closeAnnouncementDetail();
    if (typeof closeMobileAnnouncementComposer === 'function') closeMobileAnnouncementComposer();
    if (typeof toggleCwFabMenu === 'function') toggleCwFabMenu(false);
    [
      'modal-create-assignment', 'modal-create-practical', 'modal-create-finaldocs',
      'modal-edit-classwork', 'modal-delete-work-direct', 'modal-schedule-test',
      'modal-unit-editor', 'modal-enter-marks', 'modal-archive', 'modal-edit-group', 'modal-add-unenrolled',
      'modal-confirm-delete', 'modal-work-filter', 'esp-confirm-modal', 'add-session-modal'
    ].forEach(closeModal);
    if (typeof closeAllWorkCardMenus === 'function') closeAllWorkCardMenus();
    if (typeof closeRemarkMenu === 'function') closeRemarkMenu();
  }
});

document.addEventListener('click', e => {
  if (e.target && e.target.classList && e.target.classList.contains('modal-backdrop')) {
    const modalId = e.target.id;
    if (modalId && typeof closeModal === 'function') {
      closeModal(modalId);
    } else {
      e.target.classList.remove('open');
      e.target.style.display = 'none';
      if (!document.querySelector('.modal-backdrop.open')) {
        document.body.classList.remove('modal-open');
      }
    }
  }
});

function renderUserAvatar() {
  const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const init = initials(u?.full_name || u?.username || 'T');
  if (ById('compose-av-initials')) ById('compose-av-initials').textContent = init;
  const av = ById('gc-user-avatar');
  if (av) av.textContent = init;
  const avMobile = ById('gc-user-avatar-mobile');
  if (avMobile) avMobile.textContent = init;
  const pName = ById('popover-user-name');
  if (pName && u) pName.textContent = u.full_name || u.username || 'Teacher';
  const pRole = ById('popover-user-role');
  if (pRole && u) pRole.textContent = u.role || 'Faculty';
  const pAv = ById('popover-user-avatar');
  if (pAv) pAv.textContent = init;
}

function populateSidebarStats() {
  const g = S.group;
  if (!g) return;
  if (ById('stat-students')) ById('stat-students').textContent = g.student_count || 0;
  if (ById('stat-assignments')) ById('stat-assignments').textContent = g.assignment_count || 0;
  if (ById('stat-tests')) ById('stat-tests').textContent = g.test_count || 0;
  if (g.register_id) {
    loadAttStat(g.register_id);
  }
}

async function loadAttStat(rid) {
  try {
    const r = await apiFetch('/api/v1/attendance/registers/' + rid + '/summary');
    const pct = r.data?.avg_attendance_pct ?? null;
    if (ById('stat-attendance')) {
      ById('stat-attendance').textContent = pct != null ? parseFloat(pct).toFixed(1) + '%' : '--';
    }
  } catch (err) {}
}

function renderBanner(g) {
  if (!g) return;
  document.title = (g.name || 'Group') + ' — VidyaOS';
  if (ById('navbar-class-name')) ById('navbar-class-name').textContent = g.name || 'Classroom';
  if (ById('navbar-class-sub')) {
    const semTxt = g.semester ? ('Sem ' + g.semester) : '';
    const deptTxt = g.department_name ? (' • ' + g.department_name) : '';
    ById('navbar-class-sub').textContent = (semTxt + deptTxt) || '';
  }
  if (ById('mobile-class-name')) ById('mobile-class-name').textContent = (g.name || 'Classroom') + ' •';
  if (ById('mobile-class-sub')) {
    const semTxt = g.semester ? ('Sem ' + g.semester) : '';
    const deptTxt = g.department_name ? (' • ' + g.department_name) : '';
    ById('mobile-class-sub').textContent = (semTxt + deptTxt) || '';
  }
  if (ById('banner-code-display')) ById('banner-code-display').textContent = g.invite_code || '——';
  if (ById('banner-group-name')) ById('banner-group-name').textContent = g.name || '';
  if (ById('banner-subject-name')) ById('banner-subject-name').textContent = g.subject_name || '';
  if (ById('banner-dept-name')) ById('banner-dept-name').textContent = g.department_name || 'Teaching Group';
  if (ById('dept-header-name')) ById('dept-header-name').textContent = (g.department_name ? (g.department_name + ' • ') : '') + (g.name || 'Classroom Workspace');
  if (ById('banner-component-chip')) ById('banner-component-chip').textContent = g.component === 'THEORY_PRACTICAL' ? 'THEORY + PRACTICAL' : (g.component || 'THEORY');
  if (ById('banner-sem-chip')) ById('banner-sem-chip').textContent = 'Sem ' + (g.semester || 1);
  if (ById('banner-year-chip')) ById('banner-year-chip').textContent = 'Year ' + Math.ceil((g.semester || 1) / 2);
  if (ById('banner-ay-chip')) ById('banner-ay-chip').textContent = g.academic_year_label || '';

  const compStr = String(g.component || '').toUpperCase();
  const hasPractical = compStr.includes('PRACTICAL');
  if (ById('cwcat-practicals')) ById('cwcat-practicals').style.display = hasPractical ? '' : 'none';
  if (ById('cw-dd-practical-item')) ById('cw-dd-practical-item').style.display = hasPractical ? '' : 'none';
  if (ById('cw-fab-practical-item')) ById('cw-fab-practical-item').style.display = hasPractical ? '' : 'none';
  if (ById('banner-subtitle')) {
    const semTxt = g.semester ? ('Sem ' + g.semester) : '';
    const deptTxt = g.department_name ? (' • ' + g.department_name) : '';
    ById('banner-subtitle').textContent = semTxt + deptTxt || 'Classroom';
  }
  if (ById('sidebar-invite-code')) ById('sidebar-invite-code').textContent = g.invite_code || '——';
  if (ById('people-invite-code')) ById('people-invite-code').textContent = g.invite_code || '——';
  if (ById('archive-group-name-confirm')) ById('archive-group-name-confirm').textContent = g.name || '';

  if (ById('info-modal-name')) ById('info-modal-name').textContent = g.name || '—';
  if (ById('info-modal-subject')) ById('info-modal-subject').textContent = g.subject_name || '—';
  if (ById('info-modal-dept')) ById('info-modal-dept').textContent = g.department_name || '—';
  if (ById('info-modal-sem')) ById('info-modal-sem').textContent = (g.semester ? ('Semester ' + g.semester) : '') + (g.component ? (' (' + g.component + ')') : '');
  if (ById('info-modal-teacher')) ById('info-modal-teacher').textContent = g.teacher_name || 'Faculty Member';
  if (ById('info-modal-code')) ById('info-modal-code').textContent = g.invite_code || '——';

  const bannerBg = document.querySelector('.classroom-banner-bg');
  if (bannerBg && g.component === 'PRACTICAL') {
    bannerBg.style.background = 'linear-gradient(135deg,hsl(142,70%,18%) 0%,hsl(155,65%,28%) 45%,hsl(170,60%,38%) 100%)';
  }
  if (ById('banner-icon')) {
    ById('banner-icon').innerHTML = g.component === 'PRACTICAL'
      ? '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.25"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg>'
      : '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.25"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
  }
  if (g.status === 'ARCHIVED') {
    if (bannerBg) bannerBg.style.filter = 'grayscale(.45)';
    if (ById('btn-edit-group')) ById('btn-edit-group').style.display = 'none';
  }
}

function switchTab(tab, subOption) {
  if (typeof closeAnnouncementDetail === 'function') {
    closeAnnouncementDetail();
  }
  if (typeof closeMobileAnnouncementComposer === 'function') {
    closeMobileAnnouncementComposer();
  }
  if (typeof closeWorkInstructionsView === 'function') {
    closeWorkInstructionsView();
  }

  const validTabs = ['stream', 'classwork', 'people', 'register', 'marks', 'sheets', 'attendance'];
  if (!validTabs.includes(tab)) tab = 'stream';
  if (S.isStudent && (tab === 'register' || tab === 'marks' || tab === 'sheets')) {
    tab = 'attendance';
  }

  validTabs.forEach(t => {
    const pane = ById('tab-' + t);
    if (pane) pane.style.display = (t === tab) ? '' : 'none';

    const desktopBtn = ById('tab-btn-' + t);
    if (desktopBtn) {
      desktopBtn.classList.toggle('active', t === tab);
      desktopBtn.setAttribute('aria-selected', t === tab ? 'true' : 'false');
    }

    const mobileBtn = ById('mobile-tab-btn-' + t);
    if (mobileBtn) {
      mobileBtn.classList.toggle('active', t === tab);
    }
  });

  const desktopTabs = ById('classroom-desktop-tabs');
  if (desktopTabs) desktopTabs.style.display = '';
  S.tab = tab;
  document.body.setAttribute('data-active-tab', tab);
  const url = new URL(location);
  url.searchParams.set('tab', tab);
  if (subOption) url.searchParams.set('sheet', subOption);
  history.replaceState({}, '', url);

  const streamActions = ById('mobile-stream-actions');
  if (streamActions) {
    streamActions.classList.toggle('tab-hidden', tab !== 'stream');
    streamActions.style.display = tab === 'stream' ? '' : 'none';
  }

  const banner = ById('classroom-banner');
  if (banner) {
    banner.classList.toggle('tab-hidden', tab !== 'stream');
    banner.style.display = tab === 'stream' ? '' : 'none';
  }

  const cwFab = ById('classwork-mobile-fab');
  if (cwFab) {
    if (!S.isStudent && (tab === 'classwork' || tab === 'marks') && window.innerWidth <= 768) {
      cwFab.style.setProperty('display', 'inline-flex', 'important');
    } else {
      cwFab.style.setProperty('display', 'none', 'important');
    }
  }
  const fabMenu = ById('cw-mobile-fab-menu');
  if (fabMenu && tab !== 'classwork' && tab !== 'marks') {
    fabMenu.style.setProperty('display', 'none', 'important');
    if (cwFab) cwFab.classList.remove('menu-open');
  }

  const mobileBulk = ById('mobile-bulk-bar');
  if (mobileBulk && tab !== 'register') {
    mobileBulk.style.display = 'none';
  }

  const titleEl = ById('mobile-nav-class-title');
  if (titleEl) {
    if (window.innerWidth <= 768 && tab !== 'stream') {
      titleEl.style.display = 'block';
      titleEl.textContent = S.group?.name || 'Classroom';
    } else {
      titleEl.style.display = 'none';
    }
  }

  if (tab === 'classwork' && typeof updateCwFilterCount === 'function') {
    updateCwFilterCount();
  }

  if (tab === 'register') {
    document.body.classList.remove('mobile-full-ledger');
    if (typeof loadClassRegister === 'function') loadClassRegister();
  } else if (tab === 'sheets') {
    if (typeof loadClassSheets === 'function') loadClassSheets(subOption);
  } else if (tab === 'marks') {
    if (typeof renderAllMarksTables === 'function') renderAllMarksTables();
  } else if (tab === 'attendance' && S.isStudent) {
    loadStudentSubjectAttendance();
  }
}

async function loadGroup() {
  try {
    const r = await apiFetch('/api/v1/teaching-groups/' + S.groupId);
    if (r && r.data) {
      S.group = r.data;
      renderBanner(S.group);
      populateSidebarStats();
      const tasks = [];
      if (typeof loadStream === 'function') tasks.push(loadStream());
      if (typeof loadMembers === 'function') tasks.push(loadMembers());
      if (typeof loadAssignments === 'function') tasks.push(loadAssignments());
      if (typeof loadTests === 'function') tasks.push(loadTests());
      await Promise.all(tasks);
    } else {
      toast('Failed to load group: ' + (r?.error?.message || 'Invalid group'));
    }
  } catch (e) {
    toast('Failed to load group: ' + (e.message || 'Network error'));
  }
}

function initStudentModeUI(user) {
  // Update header brand link to Student Dashboard
  const brandLink = document.querySelector('.gc-brand-link');
  if (brandLink) brandLink.href = '/student/dashboard.html';

  const hubBtn = document.querySelector('.gc-create-btn, .gc-classes-hub-btn');
  if (hubBtn) {
    hubBtn.href = '/student/dashboard.html';
    hubBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
      <span>Classes Hub</span>
    `;
  }

  // Update profile popover links
  const profileLink = document.querySelector('#user-profile-popover a[href*="profile.html"]');
  if (profileLink) profileLink.href = '/student/profile.html';

  const pRole = ById('popover-user-role');
  if (pRole) pRole.textContent = 'Student';

  const backBtn = document.querySelector('.back-btn');
  if (backBtn) backBtn.href = '/student/dashboard.html';
}

async function loadStudentSubjectAttendance() {
  try {
    const fetchFn = typeof fetchApi === 'function' ? fetchApi : (url => apiFetch('/api/v1' + url));
    const [subRes, histRes] = await Promise.all([
      fetchFn('/students/me/attendance/subjects'),
      fetchFn(`/students/me/attendance?subject_id=${S.groupId}&limit=100`)
    ]);

    if (subRes && subRes.success && Array.isArray(subRes.data)) {
      const code = (S.group?.subject_code || '').toUpperCase();
      const match = subRes.data.find(s => Number(s.group_id) === Number(S.groupId)) ||
                    subRes.data.find(s => (s.subject_code || '').toUpperCase() === code);
      if (match) {
        const pct = match.percentage ?? 100;
        const attended = match.attended ?? 0;
        const conducted = match.conducted ?? 0;
        const absent = match.absent ?? 0;
        const isSafe = pct >= 75;

        const pctEl = ById('student-att-hero-pct');
        if (pctEl) {
          pctEl.textContent = `${pct}%`;
          pctEl.style.color = isSafe ? 'var(--status-present)' : 'var(--status-absent)';
        }

        const chipEl = ById('student-att-hero-chip');
        if (chipEl) {
          chipEl.textContent = isSafe ? 'Safe Zone (Eligible)' : 'Deficit Warning';
          chipEl.style.background = isSafe ? 'var(--status-present-bg)' : 'var(--status-absent-bg)';
          chipEl.style.color = isSafe ? 'var(--status-present)' : 'var(--status-absent)';
        }

        const attEl = ById('student-att-stat-attended');
        if (attEl) attEl.textContent = attended;

        const condEl = ById('student-att-stat-conducted');
        if (condEl) condEl.textContent = conducted;

        const absEl = ById('student-att-stat-absent');
        if (absEl) absEl.textContent = absent;

        const bufEl = ById('student-att-stat-buffer');
        const descEl = ById('student-att-buffer-desc');
        if (bufEl) {
          if (isSafe) {
            const canMiss = Math.floor((attended - 0.75 * conducted) / 0.75);
            bufEl.textContent = Math.max(0, canMiss);
            bufEl.style.color = 'var(--color-primary)';
            if (descEl) descEl.textContent = 'Classes can safely miss';
          } else {
            const needToAttend = Math.ceil((0.75 * conducted - attended) / 0.25);
            bufEl.textContent = `+${needToAttend}`;
            bufEl.style.color = 'var(--status-absent)';
            if (descEl) descEl.textContent = 'Must attend consecutively';
          }
        }
      }
    }

    if (histRes && histRes.success && Array.isArray(histRes.data)) {
      renderStudentAttendanceHistory(histRes.data);
    }
  } catch (err) {
    console.warn('Could not load student attendance', err);
  }
}

function renderStudentAttendanceHistory(history) {
  const tbody = ById('student-att-history-tbody');
  const countEl = ById('student-att-history-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = `${history.length} sessions recorded`;

  if (history.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color:var(--text-muted); padding:2.5rem;">
          No attendance records registered yet for this course.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = history.map(row => {
    const status = (row.attendance_status || 'ABSENT').toUpperCase();
    let statusClass = 'badge-absent';
    if (status === 'PRESENT') statusClass = 'badge-present';
    if (status === 'LATE') statusClass = 'badge-late';

    const dateStr = row.start_time
      ? new Date(row.start_time).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—';

    return `
      <tr>
        <td><strong>${dateStr}</strong></td>
        <td>${esc(row.label || row.subject_name || 'Class Session')}</td>
        <td><span class="badge" style="background:var(--bg-surface); font-size:0.75rem;">${esc(row.session_type || 'LECTURE')}</span></td>
        <td style="text-align:center;"><span class="badge ${statusClass}">${status}</span></td>
        <td style="font-size:0.8rem; color:var(--text-muted);">${esc(row.source || 'REGISTER')}</td>
      </tr>
    `;
  }).join('');
}

function renderUpcomingWorkSidebar() {
  const container = ById('student-upcoming-list');
  if (!container) return;

  const now = new Date();
  const upcoming = (S.assignments || [])
    .filter(a => a.due_date && new Date(a.due_date) >= now)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 4);

  if (upcoming.length === 0) {
    container.innerHTML = '<div style="font-size:0.82rem; color:var(--text-muted); padding:0.5rem 0;">Woohoo, no work due soon!</div>';
    return;
  }

  container.innerHTML = upcoming.map(item => `
    <div class="upcoming-item" onclick="if(typeof openWorkInstructionsView === 'function') openWorkInstructionsView(${item.id}, '${item._type || 'assignment'}')">
      <div class="upcoming-item-title">${esc(item.title || item.name)}</div>
      <div class="upcoming-item-due">Due ${formatClassroomDueDate(item.due_date)}</div>
    </div>
  `).join('');
}

function initGroupPage() {
  guardRoute({ requireRoles: ['TEACHER', 'SYSTEM_ADMIN', 'STUDENT'] });
  const p = new URLSearchParams(window.location.search);
  S.groupId = Number(p.get('id') || p.get('groupId') || p.get('group'));
  const hashTab = (window.location.hash || '').replace('#', '').trim();
  const validTabs = ['stream', 'classwork', 'attendance', 'people', 'grades', 'analytics'];
  let initTab = p.get('tab') || (validTabs.includes(hashTab) ? hashTab : '') || 'stream';
  const initAction = p.get('action');

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const isStudent = (user?.role === 'STUDENT') || (Array.isArray(user?.roles) && user.roles.includes('STUDENT')) || window.location.pathname.startsWith('/student');
  S.isStudent = isStudent;
  if (isStudent) {
    document.body.classList.add('student-mode');
    document.body.setAttribute('data-user-role', 'STUDENT');
    initStudentModeUI(user);
    if (initTab === 'register' || initTab === 'marks' || initTab === 'sheets') {
      initTab = 'attendance';
    }
  }

  if (!S.groupId) {
    toast('No group specified');
    setTimeout(() => location.href = isStudent ? '/student/dashboard.html' : '/faculty/groups.html', 1500);
    return;
  }
  document.body.setAttribute('data-active-tab', initTab);
  if (window.innerWidth <= 768) {
    document.body.classList.add('mobile-compact-mode');
  }
  const banner = ById('classroom-banner');
  if (banner && initTab !== 'stream') {
    banner.classList.add('tab-hidden');
    banner.style.display = 'none';
  }
  const streamActions = ById('mobile-stream-actions');
  if (streamActions && initTab !== 'stream') {
    streamActions.classList.add('tab-hidden');
    streamActions.style.display = 'none';
  }
  loadGroup().then(() => {
    switchTab(initTab);
    renderUserAvatar();
    if (isStudent) {
      renderUpcomingWorkSidebar();
    }
    if (!isStudent && (initAction === 'rollcall' || initAction === 'attendance')) {
      setTimeout(() => {
        if (typeof openClassRollCallModal === 'function') {
          openClassRollCallModal();
        }
      }, 400);
    }
  });
}

function copyInviteCode() {
  const code = S.group?.invite_code;
  if (!code) return;
  navigator.clipboard.writeText(location.origin + '/student/groups.html?join=' + code).then(() => toast('Invite link copied!'));
}

function copyClassInviteCode() {
  const code = S.group?.invite_code;
  if (!code) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => toast('Class code copied: ' + code));
  } else {
    toast('Class code: ' + code);
  }
}

function toggleDesktopClassSettings(e) {
  if (e) e.stopPropagation();
  const menu = ById('desktop-class-settings-dropdown');
  if (!menu) return;
  menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
}

function closeDesktopClassSettings() {
  const menu = ById('desktop-class-settings-dropdown');
  if (menu) menu.style.display = 'none';
}

function toggleMobileClassroomOverflow(e) {
  if (e) e.stopPropagation();
  const menu = ById('mobile-classroom-overflow-menu');
  if (!menu) return;
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function openSheetStudio(sheetName) {
  const gid = S.groupId || new URLSearchParams(location.search).get('id') || 1;
  let url = '/faculty/sheets.html?id=' + encodeURIComponent(gid);
  if (sheetName) url += '&sheet=' + encodeURIComponent(sheetName);
  window.location.href = url;
}


function openLinkedRegister() {
  if (typeof switchTab === 'function') {
    switchTab('register');
  } else {
    const rid = S.group?.register_id;
    const gid = S.groupId || new URLSearchParams(location.search).get('id');
    if (rid) {
      window.location.href = '/faculty/registers.html?register=' + encodeURIComponent(rid) + (gid ? '&group=' + encodeURIComponent(gid) : '');
    } else if (gid) {
      window.location.href = '/faculty/registers.html?group=' + encodeURIComponent(gid);
    } else {
      window.location.href = '/faculty/registers.html';
    }
  }
}

// Global click listener for closing menus
document.addEventListener('click', (e) => {
  if (!e.target.closest('.work-card-menu-wrap')) {
    if (typeof closeAllWorkCardMenus === 'function') closeAllWorkCardMenus();
  }
  const menu = ById('mobile-classroom-overflow-menu');
  const btn = ById('btn-mobile-overflow');
  if (menu && menu.style.display !== 'none' && !menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
    menu.style.display = 'none';
  }
  const desktopMenu = ById('desktop-class-settings-dropdown');
  const desktopBtn = ById('btn-desktop-class-settings');
  if (desktopMenu && desktopMenu.style.display !== 'none' && !desktopMenu.contains(e.target) && (!desktopBtn || !desktopBtn.contains(e.target))) {
    desktopMenu.style.display = 'none';
  }
  const fabMenu = ById('cw-mobile-fab-menu');
  const fab = ById('classwork-mobile-fab');
  if (fabMenu && fabMenu.style.display !== 'none' && !fabMenu.contains(e.target) && (!fab || !fab.contains(e.target))) {
    if (typeof toggleCwFabMenu === 'function') toggleCwFabMenu(false);
  }
  const marksMenu = ById('marks-create-dropdown-menu');
  const marksBtn = ById('btn-marks-create-main');
  if (marksMenu && marksMenu.style.display !== 'none' && !marksMenu.contains(e.target) && (!marksBtn || !marksBtn.contains(e.target))) {
    marksMenu.style.display = 'none';
  }
});

// Bind core utilities onto window
window.ById = ById;
window.esc = esc;
window.initials = initials;
window.relTime = relTime;
window.formatClassroomDate = formatClassroomDate;
window.formatFileSize = formatFileSize;
window.getFileTypeMeta = getFileTypeMeta;
window.toast = toast;
window.emptyState = emptyState;
window.autoResizeTA = autoResizeTA;
window.openModal = openModal;
window.closeModal = closeModal;
window.renderUserAvatar = renderUserAvatar;
window.populateSidebarStats = populateSidebarStats;
window.renderBanner = renderBanner;
window.switchTab = switchTab;
window.loadGroup = loadGroup;
window.initGroupPage = initGroupPage;
window.copyInviteCode = copyInviteCode;
window.copyClassInviteCode = copyClassInviteCode;
window.toggleDesktopClassSettings = toggleDesktopClassSettings;
window.closeDesktopClassSettings = closeDesktopClassSettings;
window.toggleMobileClassroomOverflow = toggleMobileClassroomOverflow;
window.openSheetStudio = openSheetStudio;
window.openLinkedRegister = openLinkedRegister;
window.initStudentModeUI = initStudentModeUI;
window.loadStudentSubjectAttendance = loadStudentSubjectAttendance;
window.renderStudentAttendanceHistory = renderStudentAttendanceHistory;
window.renderUpcomingWorkSidebar = renderUpcomingWorkSidebar;
