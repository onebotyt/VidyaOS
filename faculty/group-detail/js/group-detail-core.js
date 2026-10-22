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
  if (id === 'modal-enter-marks' && window.innerWidth < 768) {
    document.body.classList.add('marks-standalone-page');
    document.documentElement.classList.add('marks-standalone-page');
  }
}

function closeModal(id) {
  const el = ById(id);
  if (!el) return;
  el.classList.remove('open');
  el.style.display = 'none';
  if (id === 'modal-enter-marks') {
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

  const validTabs = ['stream', 'classwork', 'people', 'register', 'marks', 'sheets'];
  if (!validTabs.includes(tab)) tab = 'stream';

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
    if (tab === 'classwork' && window.innerWidth <= 768) {
      cwFab.style.setProperty('display', 'inline-flex', 'important');
    } else {
      cwFab.style.setProperty('display', 'none', 'important');
    }
  }
  const fabMenu = ById('cw-mobile-fab-menu');
  if (fabMenu && tab !== 'classwork') {
    fabMenu.style.setProperty('display', 'none', 'important');
    if (cwFab) cwFab.classList.remove('menu-open');
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
    if (typeof loadClassRegister === 'function') loadClassRegister();
  } else if (tab === 'sheets') {
    if (typeof loadClassSheets === 'function') loadClassSheets(subOption);
  } else if (tab === 'marks') {
    if (typeof renderAllMarksTables === 'function') renderAllMarksTables();
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

function initGroupPage() {
  guardRoute({ requireRoles: ['TEACHER', 'SYSTEM_ADMIN'] });
  const p = new URLSearchParams(window.location.search);
  S.groupId = Number(p.get('id'));
  const initTab = p.get('tab') || 'stream';
  if (!S.groupId) {
    toast('No group specified');
    setTimeout(() => location.href = '/faculty/groups.html', 1500);
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
