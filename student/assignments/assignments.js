/**
 * ══════════════════════════════════════════════════════════════
 * GOOGLE CLASSROOM STUDENT TO-DO HUB LOGIC
 * frontend/student/assignments/assignments.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute({ roles: ['STUDENT'] });

const S = {
  activeTab: 'assigned',
  selectedClass: 'ALL',
  assignments: [],
  exams: [],
  classes: [],
  collapsedSections: new Set()
};

document.addEventListener('DOMContentLoaded', async () => {
  initUserProfile();
  initThemeState();
  initOutsideClickListeners();

  // Load Enrolled Classes and Work in parallel
  await Promise.all([
    loadEnrolledClasses(),
    loadStudentWorkData()
  ]);
});

function initUserProfile() {
  const user = getCurrentUser();
  if (!user) return;

  const displayName = getUserDisplayName(user);
  const initials = (displayName || 'ST')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('') || 'ST';

  const avEl = document.getElementById('gc-user-avatar');
  if (avEl) avEl.innerText = initials;

  const popAv = document.getElementById('popover-avatar');
  if (popAv) popAv.innerText = initials;

  const popName = document.getElementById('popover-user-name');
  if (popName) popName.innerText = displayName;

  const popEmail = document.getElementById('popover-user-email');
  if (popEmail) popEmail.innerText = user.email || user.username || '';

  const regEl = document.getElementById('popover-reg-badge');
  if (regEl) {
    const roll = user.class_roll_no !== undefined ? `Roll: ${user.class_roll_no}` : '';
    const reg = user.registration_no || user.official_enrollment_no ? `Reg: ${user.registration_no || user.official_enrollment_no}` : '';
    const meta = [roll, reg].filter(Boolean).join(' • ');
    regEl.innerHTML = `<span class="badge" style="background:var(--col-att-group-bg); color:var(--status-present); font-size:0.75rem;">${escapeHtml(meta || 'Student Member')}</span>`;
  }
}

/**
 * Loads student enrolled classes for filter dropdown and slide-out drawer
 */
async function loadEnrolledClasses() {
  try {
    const res = await fetchApi('/teaching-groups/student/my-groups');
    if (res && res.success && Array.isArray(res.data)) {
      S.classes = res.data;
      populateClassFilter(res.data);
      renderDrawerClasses(res.data);
    }
  } catch (err) {
    console.warn('Failed to load enrolled classes', err);
  }
}

function populateClassFilter(classes) {
  const sel = document.getElementById('todo-class-filter');
  if (!sel) return;

  let html = '<option value="ALL">All classes</option>';
  classes.forEach(c => {
    const name = c.name || c.subject_name || `Class ${c.id}`;
    const sem = c.semester ? ` (Sem ${c.semester})` : '';
    html += `<option value="${c.id}">${escapeHtml(name + sem)}</option>`;
  });
  sel.innerHTML = html;
}

function renderDrawerClasses(classes) {
  const list = document.getElementById('drawer-classes-list');
  if (!list) return;

  if (classes.length === 0) {
    list.innerHTML = '<div style="padding:0.5rem 1.5rem; font-size:0.8rem; color:var(--text-muted);">No enrolled classes found.</div>';
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

  list.innerHTML = classes.map((c, idx) => {
    const color = dotColors[idx % dotColors.length];
    const name = c.name || c.subject_name || 'Classroom';
    return `
      <a href="/student/group-detail.html?id=${c.id}" class="gc-drawer-class-item">
        <span class="gc-drawer-class-dot" style="background:${color};"></span>
        <span class="gc-drawer-class-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
      </a>
    `;
  }).join('');
}

/**
 * Loads all coursework assignments and tests
 */
async function loadStudentWorkData() {
  try {
    const [asgRes, examRes] = await Promise.all([
      fetchApi('/assignments').catch(() => ({ success: false, data: [] })),
      fetchApi('/exams').catch(() => ({ success: false, data: [] }))
    ]);

    const assignments = (asgRes && asgRes.success && Array.isArray(asgRes.data)) ? asgRes.data : [];
    const exams = (examRes && examRes.success && Array.isArray(examRes.data)) ? examRes.data : [];

    S.assignments = assignments.map(a => ({
      ...a,
      item_kind: a.type || 'ASSIGNMENT',
      clean_due_date: a.due_date ? new Date(a.due_date) : null
    }));

    S.exams = exams.map(e => ({
      ...e,
      item_kind: 'TEST',
      title: e.name || 'Class Evaluation',
      due_date: e.exam_date || e.created_at,
      clean_due_date: (e.exam_date || e.created_at) ? new Date(e.exam_date || e.created_at) : null
    }));

    renderTodoHub();
  } catch (err) {
    console.error('Failed to load student work data', err);
    showEmptyState('assigned', 'Error loading coursework', err.message);
  }
}

/**
 * Categorizes and Renders the 3 To-do tabs
 */
function renderTodoHub() {
  const allItems = [...S.assignments, ...S.exams];

  // Apply Class Filter if selected
  const filteredItems = (S.selectedClass === 'ALL')
    ? allItems
    : allItems.filter(item => {
        const gId = item.group_id || item.teaching_group_id;
        return Number(gId) === Number(S.selectedClass);
      });

  const now = Date.now();

  const assignedList = [];
  const missingList = [];
  const doneList = [];

  filteredItems.forEach(item => {
    const isTest = (item.item_kind === 'TEST');
    const isSubmitted = isTest
      ? (item.marks_obtained !== null && item.marks_obtained !== undefined)
      : Boolean(item.my_status === 'SUBMITTED' || item.my_status === 'LATE' || item.my_status === 'GRADED' || item.my_file_path);

    const hasDueDate = Boolean(item.clean_due_date && !isNaN(item.clean_due_date.getTime()));
    const isPastDue = hasDueDate && (item.clean_due_date.getTime() < now);

    if (isSubmitted) {
      doneList.push(item);
    } else if (isPastDue) {
      missingList.push(item);
    } else {
      assignedList.push(item);
    }
  });

  // Update tab counter badges
  const bAssigned = document.getElementById('badge-assigned');
  if (bAssigned) bAssigned.innerText = assignedList.length;

  const bMissing = document.getElementById('badge-missing');
  const btnMissing = document.getElementById('tab-btn-missing');
  if (bMissing) {
    bMissing.innerText = missingList.length;
    if (btnMissing) {
      if (missingList.length > 0) btnMissing.classList.add('has-missing');
      else btnMissing.classList.remove('has-missing');
    }
  }

  const bDone = document.getElementById('badge-done');
  if (bDone) bDone.innerText = doneList.length;

  // Render Panes
  renderAssignedPane(assignedList);
  renderMissingPane(missingList);
  renderDonePane(doneList);
}

/* ─────────────────────────────────────────────────────────────
   PANE 1: ASSIGNED (Upcoming work)
   ───────────────────────────────────────────────────────────── */
function renderAssignedPane(items) {
  const container = document.getElementById('todo-list-assigned');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="todo-empty-state">
        <div class="todo-empty-icon" style="color:var(--status-present);">${window.getSvgIcon('checkCircle', 48)}</div>
        <div class="todo-empty-title">Woohoo, no work due!</div>
        <div class="todo-empty-desc">You don't have any upcoming coursework or pending assessments right now.</div>
      </div>
    `;
    return;
  }

  const now = new Date();
  const startOfThisWeek = getStartOfWeek(now);
  const endOfThisWeek = getEndOfWeek(now);
  const startOfNextWeek = new Date(endOfThisWeek.getTime() + 1);
  const endOfNextWeek = getEndOfWeek(startOfNextWeek);

  const groups = {
    'No due date': [],
    'This week': [],
    'Next week': [],
    'Later': []
  };

  items.forEach(item => {
    if (!item.clean_due_date) {
      groups['No due date'].push(item);
    } else if (item.clean_due_date <= endOfThisWeek) {
      groups['This week'].push(item);
    } else if (item.clean_due_date <= endOfNextWeek) {
      groups['Next week'].push(item);
    } else {
      groups['Later'].push(item);
    }
  });

  container.innerHTML = Object.entries(groups).map(([sectionKey, secItems]) => {
    if (secItems.length === 0) return '';
    return renderSection('assigned', sectionKey, secItems, renderAssignedRow);
  }).join('');
}

function renderAssignedRow(item) {
  const isTest = (item.item_kind === 'TEST');
  const targetUrl = item.group_id
    ? `/student/group-detail.html?id=${item.group_id}&work=${item.id}&kind=${item.item_kind}`
    : `/student/group-detail.html?id=1`;

  const dueText = item.clean_due_date
    ? `Due ${formatDateRelative(item.clean_due_date)}`
    : 'No due date';

  const ptsText = item.max_marks ? `${item.max_marks} pts` : 'Coursework';

  return `
    <a href="${targetUrl}" class="todo-item-row" title="Open ${escapeHtml(item.title)}">
      <div class="todo-item-left">
        <div class="todo-item-icon-box ${isTest ? 'is-test' : ''}">
          ${isTest ? getSvgIcon('exam', 20) : getSvgIcon('clipboard', 20)}
        </div>
        <div class="todo-item-details">
          <div class="todo-item-course-badge">
            <span class="dot"></span>
            <span>${escapeHtml(item.subject_name || 'Course Class')}</span>
          </div>
          <h3 class="todo-item-title">${escapeHtml(item.title)}</h3>
          <div class="todo-item-meta-strip">
            <span class="due-date">${dueText}</span>
            <span>•</span>
            <span>${ptsText}</span>
          </div>
        </div>
      </div>
      <div class="todo-item-right">
        <span class="todo-status-pill status-assigned">Assigned</span>
        <div class="todo-action-arrow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    </a>
  `;
}

/* ─────────────────────────────────────────────────────────────
   PANE 2: MISSING (Past-due unsubmitted work)
   ───────────────────────────────────────────────────────────── */
function renderMissingPane(items) {
  const container = document.getElementById('todo-list-missing');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="todo-empty-state">
        <div class="todo-empty-icon" style="color:var(--color-primary);">${window.getSvgIcon('sparkle', 48)}</div>
        <div class="todo-empty-title">Nothing missing!</div>
        <div class="todo-empty-desc">Great job! You have zero overdue unsubmitted assignments. Keep it up!</div>
      </div>
    `;
    return;
  }

  const now = new Date();
  const startOfThisWeek = getStartOfWeek(now);
  const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups = {
    'This week': [],
    'Last week': [],
    'Earlier': []
  };

  items.forEach(item => {
    if (!item.clean_due_date) {
      groups['Earlier'].push(item);
    } else if (item.clean_due_date >= startOfThisWeek) {
      groups['This week'].push(item);
    } else if (item.clean_due_date >= startOfLastWeek) {
      groups['Last week'].push(item);
    } else {
      groups['Earlier'].push(item);
    }
  });

  container.innerHTML = Object.entries(groups).map(([sectionKey, secItems]) => {
    if (secItems.length === 0) return '';
    return renderSection('missing', sectionKey, secItems, renderMissingRow);
  }).join('');
}

function renderMissingRow(item) {
  const isTest = (item.item_kind === 'TEST');
  const targetUrl = item.group_id
    ? `/student/group-detail.html?id=${item.group_id}&work=${item.id}&kind=${item.item_kind}`
    : `/student/group-detail.html?id=1`;

  const dueText = item.clean_due_date
    ? `Due ${item.clean_due_date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}, ${item.clean_due_date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Past deadline';

  return `
    <a href="${targetUrl}" class="todo-item-row" title="Submit late: ${escapeHtml(item.title)}">
      <div class="todo-item-left">
        <div class="todo-item-icon-box is-missing">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div class="todo-item-details">
          <div class="todo-item-course-badge" style="color:var(--status-absent);">
            <span class="dot" style="background:var(--status-absent);"></span>
            <span>${escapeHtml(item.subject_name || 'Course Class')}</span>
          </div>
          <h3 class="todo-item-title">${escapeHtml(item.title)}</h3>
          <div class="todo-item-meta-strip">
            <span class="due-date is-overdue">${dueText}</span>
            <span>•</span>
            <span>${item.max_marks || 20} pts</span>
          </div>
        </div>
      </div>
      <div class="todo-item-right">
        <span class="todo-status-pill status-missing">Missing</span>
        <div class="todo-action-arrow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    </a>
  `;
}

/* ─────────────────────────────────────────────────────────────
   PANE 3: DONE (Turned-in & Graded work)
   ───────────────────────────────────────────────────────────── */
function renderDonePane(items) {
  const container = document.getElementById('todo-list-done');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="todo-empty-state">
        <div class="todo-empty-icon" style="color:var(--text-muted);">${window.getSvgIcon('assignment', 48)}</div>
        <div class="todo-empty-title">No completed work yet</div>
        <div class="todo-empty-desc">When you turn in coursework or receive exam grades, they will appear here.</div>
      </div>
    `;
    return;
  }

  const now = new Date();
  const startOfThisWeek = getStartOfWeek(now);

  const groups = {
    'No due date': [],
    'Done late': [],
    'This week': [],
    'Earlier': []
  };

  items.forEach(item => {
    const isLate = (item.my_status === 'LATE');
    if (isLate) {
      groups['Done late'].push(item);
    } else if (!item.clean_due_date) {
      groups['No due date'].push(item);
    } else if (item.clean_due_date >= startOfThisWeek) {
      groups['This week'].push(item);
    } else {
      groups['Earlier'].push(item);
    }
  });

  container.innerHTML = Object.entries(groups).map(([sectionKey, secItems]) => {
    if (secItems.length === 0) return '';
    return renderSection('done', sectionKey, secItems, renderDoneRow);
  }).join('');
}

function renderDoneRow(item) {
  const isTest = (item.item_kind === 'TEST');
  const targetUrl = item.group_id
    ? `/student/group-detail.html?id=${item.group_id}&work=${item.id}&kind=${item.item_kind}`
    : `/student/group-detail.html?id=1`;

  const score = isTest ? item.marks_obtained : item.my_marks;
  const max = item.max_marks || (isTest ? 20 : 10);
  const isGraded = (score !== null && score !== undefined);

  let statusBadge = '';
  if (isGraded) {
    statusBadge = `<span class="todo-status-pill status-graded">${score}/${max}</span>`;
  } else if (item.my_status === 'LATE') {
    statusBadge = `<span class="todo-status-pill status-submitted" style="background:var(--status-late-bg); color:var(--status-late);">Done late</span>`;
  } else {
    statusBadge = `<span class="todo-status-pill status-turned-in">Turned in</span>`;
  }

  const dateText = item.clean_due_date
    ? `Due ${item.clean_due_date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`
    : 'Turned in';

  const feedbackSnippet = item.my_feedback
    ? `<span style="color:var(--color-primary); font-weight:600; display:inline-flex; align-items:center; gap:0.25rem;">${window.getSvgIcon('comment', 14)} Teacher feedback</span>`
    : '';

  return `
    <a href="${targetUrl}" class="todo-item-row" title="View submitted work: ${escapeHtml(item.title)}">
      <div class="todo-item-left">
        <div class="todo-item-icon-box is-done">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="todo-item-details">
          <div class="todo-item-course-badge" style="color:var(--status-present);">
            <span class="dot" style="background:var(--status-present);"></span>
            <span>${escapeHtml(item.subject_name || 'Course Class')}</span>
          </div>
          <h3 class="todo-item-title">${escapeHtml(item.title)}</h3>
          <div class="todo-item-meta-strip">
            <span class="due-date">${dateText}</span>
            ${feedbackSnippet ? `<span>•</span>${feedbackSnippet}` : ''}
          </div>
        </div>
      </div>
      <div class="todo-item-right">
        ${statusBadge}
        <div class="todo-action-arrow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    </a>
  `;
}

/**
 * Renders a collapsible section with count and item rows
 */
function renderSection(tabName, sectionTitle, items, rowRenderer) {
  const sectionId = `${tabName}-${sectionTitle.replace(/\s+/g, '-').toLowerCase()}`;
  const isCollapsed = S.collapsedSections.has(sectionId);

  return `
    <div class="todo-section ${isCollapsed ? 'is-collapsed' : ''}" id="${sectionId}">
      <div class="todo-section-hdr" onclick="toggleSectionAccordion('${sectionId}')">
        <div class="todo-section-title-wrap">
          <h2 class="todo-section-title">${escapeHtml(sectionTitle)}</h2>
          <span class="todo-section-count">${items.length}</span>
        </div>
        <div class="todo-section-toggle-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      <div class="todo-section-items">
        ${items.map(it => rowRenderer(it)).join('')}
      </div>
    </div>
  `;
}

function toggleSectionAccordion(sectionId) {
  const sec = document.getElementById(sectionId);
  if (!sec) return;

  if (S.collapsedSections.has(sectionId)) {
    S.collapsedSections.delete(sectionId);
    sec.classList.remove('is-collapsed');
  } else {
    S.collapsedSections.add(sectionId);
    sec.classList.add('is-collapsed');
  }
}

/**
 * Tab Switching (Assigned, Missing, Done)
 */
function switchTodoTab(tabName) {
  const validTabs = ['assigned', 'missing', 'done'];
  if (!validTabs.includes(tabName)) tabName = 'assigned';
  S.activeTab = tabName;

  validTabs.forEach(t => {
    const pane = document.getElementById(`tab-pane-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (pane) {
      if (t === tabName) pane.classList.add('active');
      else pane.classList.remove('active');
    }
    if (btn) {
      if (t === tabName) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabName);
    window.history.replaceState({}, '', url.toString());
  } catch (_) {}
}

/**
 * Filter change handler
 */
function handleClassFilterChange(groupId) {
  S.selectedClass = groupId;
  renderTodoHub();
}

/**
 * Drawer & Popover UI controls
 */
function toggleStudentDrawer(forceState) {
  if (typeof toggleSidebar === 'function') {
    return toggleSidebar(forceState);
  }
  const drawer = document.getElementById('gc-drawer');
  const backdrop = document.getElementById('gc-drawer-backdrop');
  if (!drawer) return;

  const isOpen = forceState !== undefined ? forceState : !drawer.classList.contains('open');
  if (isOpen) {
    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  } else {
    drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }
  if (typeof _updateMenuToggleButtons === 'function') {
    _updateMenuToggleButtons(isOpen);
  }
}

function toggleAppsLauncher(forceState) {
  const menu = document.getElementById('apps-launcher-dropdown');
  if (!menu) return;
  toggleUserProfile(false);
  const isOpen = forceState !== undefined ? forceState : (menu.style.display === 'none' || !menu.style.display);
  menu.style.display = isOpen ? 'grid' : 'none';
}

function toggleUserProfile(forceState) {
  const pop = document.getElementById('user-profile-popover');
  if (!pop) return;
  if (forceState !== false) {
    const apps = document.getElementById('apps-launcher-dropdown');
    if (apps) apps.style.display = 'none';
  }
  const isOpen = forceState !== undefined ? forceState : (pop.style.display === 'none' || !pop.style.display);
  pop.style.display = isOpen ? 'flex' : 'none';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch (_) {}
}

function initThemeState() {
  try {
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  } catch (_) {}
}

function initOutsideClickListeners() {
  document.addEventListener('click', (e) => {
    const appsDropdown = document.getElementById('apps-launcher-dropdown');
    const appsTrigger = e.target.closest('[onclick*="toggleAppsLauncher"]');
    if (appsDropdown && appsDropdown.style.display !== 'none' && !appsDropdown.contains(e.target) && !appsTrigger) {
      appsDropdown.style.display = 'none';
    }

    const profilePopover = document.getElementById('user-profile-popover');
    const profileTrigger = e.target.closest('#gc-user-avatar');
    if (profilePopover && profilePopover.style.display !== 'none' && !profilePopover.contains(e.target) && !profileTrigger) {
      profilePopover.style.display = 'none';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleStudentDrawer(false);
      toggleAppsLauncher(false);
      toggleUserProfile(false);
    }
  });
}

function showEmptyState(tabName, title, message) {
  const container = document.getElementById(`todo-list-${tabName}`);
  if (container) {
    container.innerHTML = `
      <div class="todo-empty-state">
        <div class="todo-empty-icon" style="color:var(--status-absent);">${window.getSvgIcon('alert', 48)}</div>
        <div class="todo-empty-title">${escapeHtml(title)}</div>
        <div class="todo-empty-desc">${escapeHtml(message)}</div>
      </div>
    `;
  }
}

/* ─────────────────────────────────────────────────────────────
   Date Utility Helpers
   ───────────────────────────────────────────────────────────── */
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (6 - day);
  d.setDate(diff);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDateRelative(d) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = (d.toDateString() === now.toDateString());
  const isTomorrow = (d.toDateString() === tomorrow.toDateString());

  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Today, ${timeStr}`;
  if (isTomorrow) return `Tomorrow, ${timeStr}`;
  return `${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}, ${timeStr}`;
}

function getSvgIcon(type, size = 18) {
  if (type === 'clipboard') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`;
  }
  if (type === 'exam') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
  }
  return '';
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
