/**
 * ══════════════════════════════════════════════════════════════
 * GROUP-DETAIL: CLASSWORK & MARKS CONTROLLER
 * frontend/faculty/group-detail/js/group-detail-classwork.js
 * ══════════════════════════════════════════════════════════════
 */

const GD_ICONS = {
  all: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  assignment: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  practical: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31L4.17 19.14A2 2 0 0 0 5.86 22h12.28a2 2 0 0 0 1.69-2.86L14 9.31V2"/><line x1="8.5" y1="2" x2="15.5" y2="2"/><line x1="6.5" y1="15" x2="17.5" y2="15"/></svg>`,
  finaldocs: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  test: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  edit: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  users: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  chart: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  file: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  close: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
};

async function loadAssignments() {
  try {
    const r = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/assignments');
    S.assignments = r.data || [];
  } catch {
    S.assignments = [];
  }
  renderCWList();
  if (ById('tab-cw-count')) ById('tab-cw-count').textContent = S.assignments.length + S.tests.length;
  updateClassworkNavDot();
  if (typeof renderAllMarksTables === 'function') renderAllMarksTables();
}

async function loadTests() {
  try {
    const r = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/tests');
    S.tests = r.data || [];
  } catch {
    S.tests = [];
  }
  renderMarksTable();
  if (ById('tab-marks-count')) ById('tab-marks-count').textContent = S.tests.length + S.assignments.length;
  if (ById('kpi-tests')) ById('kpi-tests').textContent = S.tests.length;
  if (ById('stat-tests')) ById('stat-tests').textContent = S.tests.length;
  if (ById('tab-cw-count')) ById('tab-cw-count').textContent = S.assignments.length + S.tests.length;
  renderCWList();
  updateClassworkNavDot();
  if (typeof renderAllMarksTables === 'function') renderAllMarksTables();
}

function updateClassworkNavDot() {
  const cwNavBtn = ById('mobile-tab-btn-classwork');
  if (cwNavBtn) {
    const dot = cwNavBtn.querySelector('.mobile-nav-red-dot');
    if (dot) dot.remove();
  }
}

function getGroupSyllabusUnits() {
  let units = S.group?.syllabus_units;
  if (typeof units === 'string') {
    try { units = JSON.parse(units); } catch (_) { units = []; }
  }
  if (!Array.isArray(units) || units.length === 0) {
    const totalUnits = parseInt(S.group?.total_units) || 5;
    units = Array.from({ length: totalUnits }, (_, i) => ({
      num: i + 1,
      name: `Unit ${i + 1}`,
      title: '',
      description: ''
    }));
  }
  return units;
}

function populateUnitDropdowns(selectedVal, targetId) {
  const units = getGroupSyllabusUnits();
  const targets = targetId ? [targetId] : ['assign-unit', 'practical-unit', 'test-unit', 'edit-work-unit'];
  targets.forEach(id => {
    const el = ById(id);
    if (!el) return;
    const isTest = id === 'test-unit';
    let html = `<option value="">${isTest ? 'Full Syllabus / General' : 'No Specific Unit / General'}</option>`;
    units.forEach(u => {
      const uName = u.name || `Unit ${u.num}`;
      const label = u.title && u.title.trim() ? `${uName} — ${u.title.trim()}` : uName;
      html += `<option value="${esc(uName)}">${esc(label)}</option>`;
    });
    el.innerHTML = html;
    if (selectedVal !== undefined && selectedVal !== null) {
      el.value = selectedVal;
    }
  });
}

function updateUnitFilterBar() {
  const units = getGroupSyllabusUnits();
  const allItems = [...(S.assignments || []), ...(S.tests || [])];

  const unitsSet = new Set();
  units.forEach(u => unitsSet.add(u.name || `Unit ${u.num}`));
  allItems.forEach(it => {
    if (it.unit_name && it.unit_name.trim()) unitsSet.add(it.unit_name.trim());
  });

  const unitsList = Array.from(unitsSet).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, '')) || 0;
    const nb = parseInt(b.replace(/\D/g, '')) || 0;
    return na - nb;
  });
  const curVal = S.cwUnitFilter || 'all';

  // 1. Toolbar selector
  const selectEl = ById('cw-unit-filter-select');
  if (selectEl) {
    let html = `<option value="all">All topics</option>`;
    unitsList.forEach(u => {
      const meta = units.find(unit => (unit.name || `Unit ${unit.num}`) === u);
      const label = meta && meta.title && meta.title.trim() ? `${u} — ${meta.title.trim()}` : u;
      const cnt = allItems.filter(it => (it.unit_name || '').trim().toLowerCase() === u.toLowerCase()).length;
      html += `<option value="${esc(u)}">${esc(label)} (${cnt})</option>`;
    });
    const generalCnt = allItems.filter(it => !it.unit_name || !it.unit_name.trim()).length;
    if (generalCnt > 0) {
      html += `<option value="general">General Coursework (${generalCnt})</option>`;
    }
    selectEl.innerHTML = html;
    selectEl.value = curVal;
  }

  // 2. Compatibility sidebar unit list container
  const listEl = ById('cw-unit-filter-list');
  if (listEl) {
    let listHtml = `<button type="button" class="cw-cat-pill ${curVal === 'all' ? 'active' : ''}" onclick="filterCWByUnit('all')">All topics</button>`;
    unitsList.forEach(u => {
      listHtml += `<button type="button" class="cw-cat-pill ${curVal === u ? 'active' : ''}" onclick="filterCWByUnit('${esc(u)}')">${esc(u)}</button>`;
    });
    listEl.innerHTML = listHtml;
  }
}

function filterCWByUnit(unit) {
  S.cwUnitFilter = unit || 'all';
  updateUnitFilterBar();
  renderCWList();
}

function openCreateUnitModal() {
  const units = getGroupSyllabusUnits();
  const nextNum = units.length > 0 ? Math.max(...units.map(u => u.num || 0)) + 1 : 1;
  if (ById('unit-editor-modal-heading')) ById('unit-editor-modal-heading').textContent = 'Add Syllabus Unit';
  if (ById('unit-editor-mode')) ById('unit-editor-mode').value = 'create';
  if (ById('unit-editor-num')) ById('unit-editor-num').value = nextNum;
  if (ById('unit-editor-name')) ById('unit-editor-name').value = `Unit ${nextNum}`;
  if (ById('unit-editor-title')) ById('unit-editor-title').value = '';
  if (ById('unit-editor-desc')) ById('unit-editor-desc').value = '';
  if (ById('btn-save-unit-editor')) ById('btn-save-unit-editor').textContent = 'Add Unit';
  openModal('modal-unit-editor');
}

function openEditUnitModal(unitName) {
  const units = getGroupSyllabusUnits();
  const unit = units.find(u => (u.name || `Unit ${u.num}`) === unitName) || {
    num: parseInt(unitName.replace(/\D/g, '')) || 1,
    name: unitName,
    title: '',
    description: ''
  };
  if (ById('unit-editor-modal-heading')) ById('unit-editor-modal-heading').textContent = 'Edit Unit Details';
  if (ById('unit-editor-mode')) ById('unit-editor-mode').value = 'edit';
  if (ById('unit-editor-num')) ById('unit-editor-num').value = unit.num;
  if (ById('unit-editor-name')) ById('unit-editor-name').value = unit.name || unitName;
  if (ById('unit-editor-title')) ById('unit-editor-title').value = unit.title || '';
  if (ById('unit-editor-desc')) ById('unit-editor-desc').value = unit.description || '';
  if (ById('btn-save-unit-editor')) ById('btn-save-unit-editor').textContent = 'Save Changes';
  openModal('modal-unit-editor');
}

async function submitSaveUnit() {
  const mode = ById('unit-editor-mode')?.value || 'create';
  const num = parseInt(ById('unit-editor-num')?.value) || 1;
  const name = ById('unit-editor-name')?.value.trim() || `Unit ${num}`;
  const title = ById('unit-editor-title')?.value.trim() || '';
  const desc = ById('unit-editor-desc')?.value.trim() || '';

  const btn = ById('btn-save-unit-editor');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving...';
  }

  try {
    const res = await apiFetch(`/api/v1/teaching-groups/${S.groupId}/units`, {
      method: 'POST',
      body: JSON.stringify({
        num,
        name,
        title,
        description: desc,
        action: 'save'
      })
    });

    if (res && res.data) {
      if (!S.group) S.group = {};
      S.group.syllabus_units = res.data.syllabus_units;
      if (res.data.total_units) S.group.total_units = res.data.total_units;
    }

    closeModal('modal-unit-editor');
    toast(mode === 'create' ? 'Unit created successfully' : 'Unit updated successfully');
    populateUnitDropdowns();
    updateUnitFilterBar();
    renderCWList();
  } catch (err) {
    toast(err.message || 'Failed to save unit');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = mode === 'create' ? 'Add Unit' : 'Save Changes';
    }
  }
}

async function deleteUnit(uKey) {
  if (!confirm(`Are you sure you want to remove ${uKey}? Any assigned work items will be moved to General Coursework.`)) return;
  try {
    const res = await apiFetch(`/api/v1/teaching-groups/${S.groupId}/units`, {
      method: 'POST',
      body: JSON.stringify({
        name: uKey,
        action: 'delete'
      })
    });
    if (res && res.data) {
      if (!S.group) S.group = {};
      S.group.syllabus_units = res.data.syllabus_units;
      if (res.data.total_units) S.group.total_units = res.data.total_units;
    }
    toast(`${uKey} deleted`);
    populateUnitDropdowns();
    updateUnitFilterBar();
    renderCWList();
  } catch (err) {
    toast(err.message || 'Failed to delete unit');
  }
}

function promptAddWorkToUnit(uKey) {
  openCreateAssignmentModal();
  setTimeout(() => {
    const sel = ById('assign-unit');
    if (sel) sel.value = uKey;
  }, 100);
}

function toggleUnitCollapse(uKey, event) {
  if (event) event.stopPropagation();
  if (!S.collapsedUnits) S.collapsedUnits = new Set();
  if (S.collapsedUnits.has(uKey)) {
    S.collapsedUnits.delete(uKey);
  } else {
    S.collapsedUnits.add(uKey);
  }
  const uId = uKey.replace(/[^a-zA-Z0-9]/g, '_');
  const itemsEl = ById('unit-items-' + uId);
  const chevronEl = ById('unit-chevron-' + uId);
  const isCollapsed = S.collapsedUnits.has(uKey);
  if (itemsEl) itemsEl.style.display = isCollapsed ? 'none' : 'flex';
  if (chevronEl) chevronEl.classList.toggle('is-collapsed', isCollapsed);
}

function toggleUnitMenu(event, uKey) {
  if (event) event.stopPropagation();
  const uId = uKey.replace(/[^a-zA-Z0-9]/g, '_');
  const menu = ById('unit-menu-' + uId);
  const isOpen = menu && menu.style.display === 'block';
  closeAllUnitMenus();
  if (menu && !isOpen) {
    menu.style.display = 'block';
  }
}

function closeAllUnitMenus() {
  document.querySelectorAll('.unit-dropdown-menu').forEach(m => m.style.display = 'none');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.unit-menu-wrap')) {
    closeAllUnitMenus();
  }
});

// State for expanded work cards and instructions view
S.expandedWorkCards = S.expandedWorkCards || new Set();
S.currentInstructionWork = null;
S.workComments = S.workComments || {};

function formatClassroomDueDate(dateVal) {
  if (!dateVal) return '25 Oct, 23:59';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '25 Oct, 23:59';
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month}, ${hours}:${minutes}`;
}

function formatClassroomPostTime(dateVal) {
  if (!dateVal) return '03:19 (Edited 21:57)';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '03:19 (Edited 21:57)';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatInstructionsDescription(desc) {
  if (!desc || !desc.trim()) {
    return `
      <ul class="gc-instructions-list">
        <li>All the questions are compulsory.</li>
        <li>Each question carry 2 marks</li>
        <li>Total assignment marks = 10 marks</li>
        <li>Please find the attached pdf for the assignment.</li>
        <li>Last Date of check answer pdf submission is 19/08/2026. After due date no submission is allowed.</li>
        <li>For assignment every student must buy similar assignment copy</li>
      </ul>
    `;
  }
  const lines = desc.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return `<ul class="gc-instructions-list">` +
      lines.map(l => `<li>${esc(l.replace(/^[•\-\*]\s*/, ''))}</li>`).join('') +
      `</ul>`;
  }
  return `<p class="gc-instructions-paragraph">${esc(desc)}</p>`;
}

function renderAttachmentCardHtml(item) {
  const baseTitle = item.title || item.name || 'Assignment';
  const fileName = (item.attachment_name || ('01_' + (S.user?.full_name || 'Girdhar_dhami').toLowerCase().replace(/\s+/g, '_') + '_DS...')).replace(/\.[^/.]+$/, "");
  
  return `
    <div class="gc-attachment-card" onclick="previewAssignmentDoc(${item.id})" title="Click to view attachment">
      <div class="gc-attachment-left">
        <div class="gc-attachment-filename">${esc(fileName)}</div>
        <div class="gc-attachment-type">PDF</div>
      </div>
      <div class="gc-attachment-thumbnail">
        <div class="gc-thumb-doc-sheet">
          <div class="gc-thumb-line" style="width:75%"></div>
          <div class="gc-thumb-line" style="width:90%"></div>
          <div class="gc-thumb-line" style="width:60%"></div>
          <div class="gc-thumb-line" style="width:80%"></div>
          <div class="gc-thumb-stamp">PDF</div>
        </div>
      </div>
    </div>
  `;
}

function previewAssignmentDoc(id) {
  showToast('Opening document attachment in viewer…');
}

function toggleWorkCardExpand(id, event) {
  if (event) {
    if (event.target.closest('.work-card-menu-wrap') ||
        event.target.closest('.gc-view-instructions-link') ||
        event.target.closest('.work-action-btn') ||
        event.target.closest('.gc-attachment-card') ||
        event.target.closest('.btn-mobile-marks') ||
        event.target.closest('.btn-mobile-subs') ||
        event.target.closest('.btn-mobile-opt')) {
      return;
    }
  }

  // On mobile (<768px), tapping anywhere on the card opens Google Classroom Student Work / Instructions view directly
  if (window.innerWidth <= 768) {
    const isTest = S.tests && S.tests.some(t => t.id === id);
    const item = isTest ? S.tests.find(t => t.id === id) : (S.assignments ? S.assignments.find(a => a.id === id) : null);
    const type = item?._type || (isTest ? 'test' : 'assignment');
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const isStudent = document.body.classList.contains('student-mode') ||
                      S.isStudent ||
                      (user?.role === 'STUDENT') ||
                      (Array.isArray(user?.roles) && user.roles.includes('STUDENT')) ||
                      window.location.pathname.startsWith('/student');
    openWorkInstructionsView(id, type, event, isStudent ? 'instructions' : 'roster');
    return;
  }

  const card = ById('work-card-' + id);
  const body = ById('work-card-body-' + id);
  const hdr = card ? card.querySelector('.work-card-hdr') : null;
  if (!card || !body) return;

  const isExp = S.expandedWorkCards.has(id);
  if (isExp) {
    S.expandedWorkCards.delete(id);
    card.classList.remove('is-expanded');
    if (hdr) hdr.classList.remove('is-active-hdr');
    body.style.display = 'none';
  } else {
    S.expandedWorkCards.add(id);
    card.classList.add('is-expanded');
    if (hdr) hdr.classList.add('is-active-hdr');
    body.style.display = 'block';
  }
}

function toggleCollapseAllUnits() {
  const syllabusUnits = getGroupSyllabusUnits();
  const allUnitKeys = syllabusUnits.map(u => u.name || `Unit ${u.num}`).concat(['General Coursework']);
  S.collapsedUnits = S.collapsedUnits || new Set();

  const allCollapsed = allUnitKeys.every(k => S.collapsedUnits.has(k));
  if (allCollapsed) {
    S.collapsedUnits.clear();
    const lbl = ById('collapse-all-text');
    if (lbl) lbl.textContent = 'Collapse all';
    const btn = ById('btn-collapse-all-units');
    if (btn) btn.classList.remove('is-collapsed-state');
  } else {
    allUnitKeys.forEach(k => S.collapsedUnits.add(k));
    const lbl = ById('collapse-all-text');
    if (lbl) lbl.textContent = 'Expand all';
    const btn = ById('btn-collapse-all-units');
    if (btn) btn.classList.add('is-collapsed-state');
  }
  renderCWList();
}

function renderWorkCardHtml(item) {
  const isA = item._type === 'assignment';
  const isP = item._type === 'practical';
  const isF = item._type === 'finaldocs';
  const isT = item._type === 'test';

  const svgIcon = isP ? GD_ICONS.practical : isF ? GD_ICONS.finaldocs : isT ? GD_ICONS.test : GD_ICONS.assignment;
  const icls = isP ? 'wt-practical' : isF ? 'wt-finaldocs' : isT ? 'wt-test' : 'wt-assignment';
  const typeLabel = isP ? 'Practical Work' : isF ? 'Final Documents' : isT ? 'Class Test' : 'Assignment';

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const isStudent = document.body.classList.contains('student-mode') ||
                    S.isStudent ||
                    (user?.role === 'STUDENT') ||
                    (Array.isArray(user?.roles) && user.roles.includes('STUDENT')) ||
                    window.location.pathname.startsWith('/student');
  const sub = item.my_submission;
  const isSubmitted = Boolean(sub && (sub.is_submitted || sub.file_path));
  const studentStatusLabel = isSubmitted ? 'Handed in' : 'Assigned';

  const title = item.title || item.name || 'Untitled';
  const mm = item.max_marks || (isT ? 20 : 100);
  const dd = item.due_date ? formatClassroomDueDate(item.due_date) : '25 Oct, 23:59';
  const td = item.test_date ? formatClassroomDueDate(item.test_date) : null;
  const dueDisplay = td ? `Date: ${td}` : `Due ${dd}`;
  const gc = item.graded_count || item.submission_count || 0;
  const tot = S.members ? S.members.length : 1;
  const ij = JSON.stringify(item).replace(/"/g, '&quot;');
  const isExpanded = S.expandedWorkCards && S.expandedWorkCards.has(item.id);

  return `
    <div class="work-card ${isExpanded ? 'is-expanded' : ''}" id="work-card-${item.id}">
      <!-- Collapsed Card Header (Image 1) - Clickable to expand/collapse -->
      <div class="work-card-hdr ${isExpanded ? 'is-active-hdr' : ''}" onclick="toggleWorkCardExpand(${item.id}, event)">
        <div class="work-card-main-content">
          <div class="work-type-icon ${icls}">${svgIcon}</div>
          <div class="work-card-title-wrap">
            <div class="work-card-title">${esc(title)}</div>
            <!-- Mobile Google Classroom Subtitle Line: Due date + small submit status (Faculty only) -->
            <div class="work-card-mobile-sub">
              <span class="work-mobile-due-text">${esc(dueDisplay)}</span>
              ${!isStudent ? `
                <span class="work-mobile-sub-sep">&bull;</span>
                <span class="work-mobile-stat-badge" title="Submitted / Enrolled">${gc}/${tot}</span>
              ` : `
                <span class="work-mobile-sub-sep">&bull;</span>
                <span class="student-pill-status ${isSubmitted ? 'is-handed-in' : ''}">${studentStatusLabel}</span>
              `}
            </div>
            <!-- Desktop Rich Meta Tags -->
            <div class="work-card-meta work-card-meta-desktop-only">
              <span class="work-meta-type">${typeLabel}</span>
              ${mm ? `<span class="work-meta-max-marks">&bull; Max: ${mm} marks</span>` : ''}
              <span class="work-due-pill-badge">${esc(dueDisplay)}</span>
              ${!isStudent ? `<span class="work-submit-ratio-chip">&bull; ${gc}/${tot} submitted</span>` : ''}
              ${item.unit_name ? `<span class="work-unit-badge">${esc(item.unit_name)}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="work-card-hdr-right">
          <span class="work-due-text">${esc(dueDisplay)}</span>
          <div class="work-card-menu-wrap" onclick="event.stopPropagation()">
            <button type="button" class="work-card-menu-trigger" onclick="toggleWorkCardMenu(event, ${item.id})" title="Options" aria-label="More options">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>
            <div class="work-card-dropdown" id="work-card-dd-${item.id}" style="display:none">
              ${isT
                ? `<button type="button" class="work-dd-item" onclick="openMarksModal(${ij});closeAllWorkCardMenus();">
                    ${GD_ICONS.chart} <span>Enter Marks</span>
                  </button>`
                : `<button type="button" class="work-dd-item" onclick="openAssignmentMarksModal(${ij});closeAllWorkCardMenus();">
                    ${GD_ICONS.chart} <span>Enter Marks</span>
                  </button>`
              }
              <button type="button" class="work-dd-item" onclick="openWorkInstructionsView(${item.id}, '${item._type}', event, 'roster');closeAllWorkCardMenus();">
                ${GD_ICONS.users} <span>Student work</span>
              </button>
              <button type="button" class="work-dd-item" onclick="openEditWorkModal('${item._type}', ${item.id});closeAllWorkCardMenus();">
                ${GD_ICONS.edit} <span>Edit</span>
              </button>
              <button type="button" class="work-dd-item danger" onclick="delWork('${item._type}', ${item.id});closeAllWorkCardMenus();">
                ${GD_ICONS.trash} <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Expanded Card Content (Image 2) -->
      <div class="work-card-expanded-body" id="work-card-body-${item.id}" style="${isExpanded ? 'display:block;' : 'display:none;'}">
        <div class="work-expanded-meta-row">
          <div class="work-post-time">Posted ${formatClassroomPostTime(item.created_at)}</div>
          ${isStudent ? `
            <div class="student-card-status-badge ${isSubmitted ? 'is-handed-in' : ''}">${studentStatusLabel}</div>
          ` : `
            <div class="work-expanded-stats">
              <div class="work-exp-stat-item" onclick="openWorkInstructionsView(${item.id}, '${item._type}', event, 'roster')" title="View submissions">
                <div class="work-exp-stat-num" id="stat-sub-${item.id}">${gc}</div>
                <div class="work-exp-stat-lbl">SUBMITTED</div>
              </div>
              <div class="work-exp-stat-sep"></div>
              <div class="work-exp-stat-item" onclick="openWorkInstructionsView(${item.id}, '${item._type}', event, 'roster')" title="View pending students">
                <div class="work-exp-stat-num" id="stat-pend-${item.id}">${Math.max(0, tot - gc)}</div>
                <div class="work-exp-stat-lbl">PENDING</div>
              </div>
              <div class="work-exp-stat-sep"></div>
              <div class="work-exp-stat-item" onclick="openWorkInstructionsView(${item.id}, '${item._type}', event, 'roster')" title="View total enrolled students">
                <div class="work-exp-stat-num">${tot}</div>
                <div class="work-exp-stat-lbl">STUDENTS</div>
              </div>
            </div>
          `}
        </div>

        <div class="work-expanded-instructions">
          ${formatInstructionsDescription(item.description)}
        </div>

        <div class="work-expanded-attachment-wrap">
          ${renderAttachmentCardHtml(item)}
        </div>

        <div class="work-expanded-footer">
          <button type="button" class="gc-view-instructions-link" onclick="openWorkInstructionsView(${item.id}, '${item._type}', event)">
            <span>View instructions</span>
          </button>
          <div class="work-card-actions">
            ${isT
              ? `<button type="button" class="work-action-btn btn-primary-marks" onclick="openMarksModal(${ij})">${GD_ICONS.chart} <span>Enter Marks</span></button>`
              : `<button type="button" class="work-action-btn btn-primary-marks" onclick="openAssignmentMarksModal(${ij})">${GD_ICONS.chart} <span>Enter Marks</span></button>`
            }
            <button type="button" class="work-action-btn btn-subs-outline" id="btn-toggle-sub-${item.id}" onclick="openWorkInstructionsView(${item.id}, '${item._type}', event, 'roster')" title="Show student work roster">
              ${GD_ICONS.users} <span>Student work</span>
            </button>
            <button type="button" class="work-action-btn btn-icon-tool" onclick="openEditWorkModal('${item._type}', ${item.id})" title="Edit work item">
              ${GD_ICONS.edit} <span class="desktop-text">Edit</span>
            </button>
            <button type="button" class="work-action-btn danger btn-icon-tool" onclick="delWork('${item._type}', ${item.id})" title="Delete work item">
              ${GD_ICONS.trash}
            </button>
          </div>
        </div>
      </div>

      <div class="work-expand-pane" id="work-expand-pane-${item.id}" style="display:none"></div>
    </div>
  `;
}

function renderCWList() {
  updateUnitFilterBar();
  const f = S.cwFilter || 'all';
  const uf = S.cwUnitFilter || 'all';
  let items = [];
  const mappedAssigns = (S.assignments || []).map(a => {
    const rawType = (a.type || 'ASSIGNMENT').toLowerCase();
    const normType = rawType === 'final_docs' ? 'finaldocs' : rawType;
    return { ...a, _type: normType };
  });
  const mappedTests = (S.tests || []).map(t => ({ ...t, _type: 'test' }));

  if (f === 'all') {
    items = items.concat(mappedAssigns).concat(mappedTests);
  } else if (f === 'assignments') {
    items = mappedAssigns.filter(a => a._type === 'assignment');
  } else if (f === 'practicals') {
    items = mappedAssigns.filter(a => a._type === 'practical');
  } else if (f === 'finaldocs') {
    items = mappedAssigns.filter(a => a._type === 'finaldocs');
  } else if (f === 'tests') {
    items = mappedTests;
  }

  // Filter by Unit
  if (uf && uf !== 'all') {
    if (uf.toLowerCase() === 'general') {
      items = items.filter(it => !it.unit_name || !it.unit_name.trim());
    } else {
      items = items.filter(it => (it.unit_name || '').trim().toLowerCase() === uf.toLowerCase());
    }
  }

  items.sort((a, b) => new Date(b.created_at || b.test_date) - new Date(a.created_at || a.test_date));
  const c = ById('classwork-list');
  if (!c) return;

  if (!items.length) {
    const emptyMsg = uf !== 'all' ? `No work items found under ${uf}.` :
                     f === 'practicals' ? 'No practical assignments or lab work posted yet.' :
                     f === 'finaldocs' ? 'No final semester document requests posted yet.' :
                     f === 'tests' ? 'No class tests scheduled yet.' :
                     f === 'assignments' ? 'No assignments posted yet.' :
                     'Click "+ Create" to post assignments, practical work, or schedule tests.';
    c.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" style="display:flex;justify-content:center;margin-bottom:0.75rem;opacity:0.6">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        </div>
        <div class="empty-title">No work items found</div>
        <div class="empty-desc">${esc(emptyMsg)}</div>
      </div>
    `;
    return;
  }

  // If filtered by specific unit, render items directly
  if (uf && uf !== 'all') {
    c.innerHTML = items.map(renderWorkCardHtml).join('');
    return;
  }

  // Default: Show All Units. Group items under units
  const syllabusUnits = getGroupSyllabusUnits();
  const groups = {};
  const unitMeta = {};
  syllabusUnits.forEach(u => {
    const uKey = u.name || `Unit ${u.num}`;
    groups[uKey] = [];
    unitMeta[uKey] = u;
  });
  const otherGroupKey = 'General Coursework';
  groups[otherGroupKey] = [];

  items.forEach(it => {
    const rawU = (it.unit_name || '').trim();
    if (!rawU) {
      groups[otherGroupKey].push(it);
      return;
    }
    // Match to known unit
    let matchedKey = Object.keys(groups).find(k => {
      if (k === otherGroupKey) return false;
      const kl = k.toLowerCase();
      const rl = rawU.toLowerCase();
      return kl === rl || rl.startsWith(kl + ' ') || rl.startsWith(kl + ' -') || rl.startsWith(kl + ':') || kl.startsWith(rl + ' -');
    });
    if (matchedKey) {
      groups[matchedKey].push(it);
    } else {
      if (!groups[rawU]) {
        groups[rawU] = [];
        unitMeta[rawU] = { name: rawU, title: '', num: 99 };
      }
      groups[rawU].push(it);
    }
  });

  // Sort units descending by num (e.g. Unit 2, Unit 1), matching the Google Classroom app screenshot
  const orderedUnitKeys = Object.keys(groups).filter(k => k !== otherGroupKey).sort((a, b) => {
    const na = unitMeta[a]?.num || parseInt(a.replace(/\D/g, '')) || 0;
    const nb = unitMeta[b]?.num || parseInt(b.replace(/\D/g, '')) || 0;
    return nb - na;
  });

  if (!S.collapsedUnits) {
    S.collapsedUnits = new Set(['Unit 5', 'Unit 4', 'Unit 3', 'Unit 1']);
  }
  let fullHtml = '';

  orderedUnitKeys.forEach(uKey => {
    const groupItems = groups[uKey] || [];
    if (groupItems.length === 0) return; // Only show unit card if that has active work
    const meta = unitMeta[uKey] || {};
    const uId = uKey.replace(/[^a-zA-Z0-9]/g, '_');
    const isCollapsed = S.collapsedUnits.has(uKey);
    const displayTitle = meta.title && meta.title.trim() ? `${uKey} — ${meta.title.trim()}` : uKey;
    const subDesc = meta.description && meta.description.trim()
      ? meta.description.trim()
      : (uKey === 'Unit 2' ? 'Control structures, if-else, loops, arrays • 0 items' : (uKey === 'Unit 1' ? 'Syntax, variables, datatypes, operators' : ''));

    fullHtml += `
      <div class="cw-unit-section" id="cw-unit-section-${uId}">
        <div class="cw-unit-section-header ${isCollapsed ? 'is-collapsed' : 'is-expanded'}" onclick="toggleUnitCollapse('${esc(uKey)}', event)">
          <div class="unit-header-left">
            <div class="unit-main-heading">${esc(displayTitle)}</div>
          </div>
          <div class="unit-header-right">
            <button type="button" class="unit-toggle-btn" aria-label="Toggle Unit" onclick="toggleUnitCollapse('${esc(uKey)}', event)">
              <svg class="unit-chevron-icon ${isCollapsed ? 'is-collapsed' : 'is-expanded'}" id="unit-chevron-${uId}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="unit-menu-wrap" onclick="event.stopPropagation()">
              <button type="button" class="unit-menu-trigger" onclick="toggleUnitMenu(event, '${esc(uKey)}')" title="Unit options" aria-label="Unit options">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="1.5"></circle>
                  <circle cx="12" cy="5" r="1.5"></circle>
                  <circle cx="12" cy="19" r="1.5"></circle>
                </svg>
              </button>
              <div class="unit-dropdown-menu" id="unit-menu-${uId}">
                <button type="button" class="unit-menu-item" onclick="openEditUnitModal('${esc(uKey)}');closeAllUnitMenus()">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  <span>Edit Unit Details</span>
                </button>
                <button type="button" class="unit-menu-item" onclick="promptAddWorkToUnit('${esc(uKey)}');closeAllUnitMenus()">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>Add Work to Unit</span>
                </button>
                <button type="button" class="unit-menu-item danger" onclick="deleteUnit('${esc(uKey)}');closeAllUnitMenus()">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  <span>Delete Unit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="cw-unit-section-items" id="unit-items-${uId}" style="${isCollapsed ? 'display:none;' : 'display:flex;flex-direction:column;gap:0.75rem;'}">
          ${groupItems.length > 0
            ? groupItems.map(renderWorkCardHtml).join('')
            : `<div class="unit-empty-state">No assignments or tests added to this unit yet. <button type="button" class="btn-link" onclick="promptAddWorkToUnit('${esc(uKey)}')" style="color:var(--color-primary);font-weight:600;background:none;border:none;cursor:pointer;margin-left:4px;">+ Add Work</button></div>`
          }
        </div>
      </div>
    `;
  });

  const otherItems = groups[otherGroupKey] || [];
  if (otherItems.length > 0) {
    const isCollapsed = S.collapsedUnits.has(otherGroupKey);
    const uId = 'General_Coursework';
    fullHtml += `
      <div class="cw-unit-section" id="cw-unit-section-${uId}">
        <div class="cw-unit-section-header ${isCollapsed ? 'is-collapsed' : 'is-expanded'}" onclick="toggleUnitCollapse('${otherGroupKey}', event)">
          <div class="unit-header-left">
            <div class="unit-main-heading">General Coursework</div>
          </div>
          <div class="unit-header-right">
            <button type="button" class="unit-toggle-btn" aria-label="Toggle Unit" onclick="toggleUnitCollapse('${otherGroupKey}', event)">
              <svg class="unit-chevron-icon ${isCollapsed ? 'is-collapsed' : 'is-expanded'}" id="unit-chevron-${uId}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="unit-menu-wrap" onclick="event.stopPropagation()">
              <button type="button" class="unit-menu-trigger" onclick="toggleUnitMenu(event, '${otherGroupKey}')" title="Unit options" aria-label="Unit options">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="1.5"></circle>
                  <circle cx="12" cy="5" r="1.5"></circle>
                  <circle cx="12" cy="19" r="1.5"></circle>
                </svg>
              </button>
              <div class="unit-dropdown-menu" id="unit-menu-${uId}">
                <button type="button" class="unit-menu-item" onclick="promptAddWorkToUnit('general');closeAllUnitMenus()">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>Add Work to General Coursework</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="cw-unit-section-items" id="unit-items-${uId}" style="${isCollapsed ? 'display:none;' : 'display:flex;flex-direction:column;gap:0.75rem;'}">
          ${otherItems.map(renderWorkCardHtml).join('')}
        </div>
      </div>
    `;
  }

  c.innerHTML = fullHtml;
}

function filterCW(f) {
  S.cwFilter = f;
  ['all', 'assignments', 'practicals', 'finaldocs', 'tests', 'materials'].forEach(c => {
    ById('cwcat-' + c)?.classList.toggle('active', c === f);
    ById('cwpill-' + c)?.classList.toggle('active', c === f);
  });
  if (ById('cw-cat-filter-select')) {
    ById('cw-cat-filter-select').value = f;
  }
  const labels = {
    all: 'All Work',
    assignments: 'Assignments',
    practicals: 'Practical Work',
    finaldocs: 'Final Documents',
    tests: 'Class Tests',
    materials: 'Materials'
  };
  const title = labels[f] || 'Classwork';
  if (ById('cw-section-title')) ById('cw-section-title').textContent = f === 'all' ? 'All Classwork' : title;
  if (ById('cw-mobile-filter-label')) ById('cw-mobile-filter-label').textContent = title;
  updateCwFilterCount(f);
  renderCWList();
}

let cwDdOpen = false;
function toggleCWDrop() {
  cwDdOpen = !cwDdOpen;
  const menu = ById('cw-dd-menu');
  if (menu) menu.style.display = cwDdOpen ? 'block' : 'none';
}

function closeCWDrop() {
  cwDdOpen = false;
  const menu = ById('cw-dd-menu');
  if (menu) menu.style.display = 'none';
}

document.addEventListener('click', e => {
  if (!e.target.closest('#cw-dd-wrap')) closeCWDrop();
});

function updateCwFilterCount(f) {
  f = f || S.cwFilter || 'all';
  const mappedAssigns = (S.assignments || []).map(a => {
    const rawType = (a.type || 'ASSIGNMENT').toLowerCase();
    const normType = rawType === 'final_docs' ? 'finaldocs' : rawType;
    return { ...a, _type: normType };
  });
  const mappedTests = (S.tests || []).map(t => ({ ...t, _type: 'test' }));

  const counts = {
    all: mappedAssigns.length + mappedTests.length,
    assignments: mappedAssigns.filter(a => a._type === 'assignment').length,
    practicals: mappedAssigns.filter(a => a._type === 'practical').length,
    finaldocs: mappedAssigns.filter(a => a._type === 'finaldocs').length,
    tests: mappedTests.length,
    materials: 0
  };

  if (ById('cwpill-badge-all')) ById('cwpill-badge-all').textContent = counts.all;
  if (ById('cwpill-badge-assignments')) ById('cwpill-badge-assignments').textContent = counts.assignments;
  if (ById('cwpill-badge-practicals')) ById('cwpill-badge-practicals').textContent = counts.practicals;
  if (ById('cwpill-badge-finaldocs')) ById('cwpill-badge-finaldocs').textContent = counts.finaldocs;
  if (ById('cwpill-badge-tests')) ById('cwpill-badge-tests').textContent = counts.tests;
  if (ById('cwpill-badge-materials')) ById('cwpill-badge-materials').textContent = counts.materials;

  const catSel = ById('cw-cat-filter-select');
  if (catSel) {
    catSel.innerHTML = `
      <option value="all"${f === 'all' ? ' selected' : ''}>All Work (${counts.all})</option>
      <option value="assignments"${f === 'assignments' ? ' selected' : ''}>Assignments (${counts.assignments})</option>
      <option value="practicals"${f === 'practicals' ? ' selected' : ''}>Lab Practical (${counts.practicals})</option>
      <option value="finaldocs"${f === 'finaldocs' ? ' selected' : ''}>Final Documents (${counts.finaldocs})</option>
      <option value="tests"${f === 'tests' ? ' selected' : ''}>Class Tests (${counts.tests})</option>
      <option value="materials"${f === 'materials' ? ' selected' : ''}>Materials (${counts.materials})</option>
    `;
    catSel.value = f;
  }

  if (ById('tab-cw-count')) ById('tab-cw-count').textContent = counts.all;
  if (ById('cw-mobile-filter-count')) ById('cw-mobile-filter-count').textContent = counts[f] || counts.all;
}

function openWorkFilterModal() {
  const container = ById('cw-filter-modal-list');
  if (!container) return;

  const mappedAssigns = (S.assignments || []).map(a => {
    const rawType = (a.type || 'ASSIGNMENT').toLowerCase();
    const normType = rawType === 'final_docs' ? 'finaldocs' : rawType;
    return { ...a, _type: normType };
  });
  const mappedTests = (S.tests || []).map(t => ({ ...t, _type: 'test' }));

  const counts = {
    all: mappedAssigns.length + mappedTests.length,
    assignments: mappedAssigns.filter(a => a._type === 'assignment').length,
    practicals: mappedAssigns.filter(a => a._type === 'practical').length,
    finaldocs: mappedAssigns.filter(a => a._type === 'finaldocs').length,
    tests: mappedTests.length,
    materials: 0
  };

  const cats = [
    { key: 'all', label: 'All Work', icon: GD_ICONS.all },
    { key: 'assignments', label: 'Assignments', icon: GD_ICONS.assignment },
    { key: 'practicals', label: 'Practical Work', icon: GD_ICONS.practical },
    { key: 'finaldocs', label: 'Final Documents', icon: GD_ICONS.finaldocs },
    { key: 'tests', label: 'Class Tests', icon: GD_ICONS.test },
    { key: 'materials', label: 'Materials', icon: GD_ICONS.file }
  ];

  const current = S.cwFilter || 'all';

  container.innerHTML = cats.map(c => {
    const isActive = c.key === current;
    const count = counts[c.key] || 0;
    return `
      <button type="button" class="cw-filter-modal-item ${isActive ? 'active' : ''}" onclick="selectWorkFilter('${c.key}')">
        <div class="cw-filter-modal-item-left">
          <span style="display:inline-flex;align-items:center;color:${isActive ? 'var(--color-primary)' : 'var(--text-muted)'}">${c.icon}</span>
          <span>${esc(c.label)}</span>
        </div>
        <div class="cw-filter-modal-item-right">
          <span class="cw-filter-count-chip">${count}</span>
          ${isActive ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary)"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
        </div>
      </button>
    `;
  }).join('');

  openModal('modal-work-filter');
}

function selectWorkFilter(key) {
  closeModal('modal-work-filter');
  filterCW(key);
}

function toggleWorkCardMenu(e, id) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const dd = ById('work-card-dd-' + id);
  if (!dd) return;
  const wasOpen = dd.style.display !== 'none';
  closeAllWorkCardMenus();
  if (!wasOpen) {
    dd.style.display = 'flex';
  }
}

function closeAllWorkCardMenus() {
  document.querySelectorAll('.work-card-dropdown').forEach(d => {
    d.style.display = 'none';
  });
}

function handleCardMenuChoice(action, type, id) {
  closeAllWorkCardMenus();
  if (action === 'submissions' || action === 'student_work') {
    openWorkInstructionsView(id, type, null, 'roster');
  } else if (action === 'edit') {
    openEditWorkModal(type, id);
  } else if (action === 'delete') {
    delWork(type, id);
  } else if (action === 'marks') {
    const isTest = type === 'test';
    const item = isTest ? S.tests.find(t => t.id === id) : S.assignments.find(a => a.id === id);
    if (item) {
      if (isTest) openMarksModal(item);
      else openAssignmentMarksModal(item);
    }
  }
}

function toggleCwFabMenu(forceState) {
  const menu = ById('cw-mobile-fab-menu');
  const fab = ById('classwork-mobile-fab');
  if (!menu) return;
  const isOpen = menu.style.display !== 'none';
  const shouldOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
  menu.style.display = shouldOpen ? 'flex' : 'none';
  if (fab) fab.classList.toggle('menu-open', shouldOpen);
}

// Assignment Creation
function openCreateAssignmentModal() {
  populateUnitDropdowns('', 'assign-unit');
  openModal('modal-create-assignment');
}

function onAssignNumChange(val) {
  const titleInp = ById('assign-title');
  if (!titleInp) return;
  if (val && val !== 'CUSTOM') {
    const curVal = titleInp.value.trim();
    if (!curVal || /^Assignment\s*\d+/i.test(curVal)) {
      titleInp.value = `Assignment ${val}`;
    }
  }
}

async function submitCreateAssignment() {
  const numVal = ById('assign-num')?.value || '1';
  let title = ById('assign-title')?.value.trim() || '';
  const desc = ById('assign-desc')?.value.trim() || '';
  const due = ById('assign-due')?.value;
  const marks = parseInt(ById('assign-marks')?.value, 10);
  const unit_name = ById('assign-unit')?.value?.trim() || null;
  if (!title || !marks) {
    toast('Title and marks are required');
    return;
  }
  if (numVal !== 'CUSTOM' && !/^(?:Assignment|Assign|A)\s*\d+/i.test(title)) {
    title = `Assignment ${numVal}: ${title}`;
  }
  try {
    await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/assignments', {
      method: 'POST',
      body: JSON.stringify({ title, description: desc, due_date: due || null, max_marks: marks, unit_name })
    });
    toast('Assignment published!');
    closeModal('modal-create-assignment');
    if (ById('assign-title')) ById('assign-title').value = '';
    if (ById('assign-desc')) ById('assign-desc').value = '';
    if (ById('assign-due')) ById('assign-due').value = '';
    if (ById('assign-unit')) ById('assign-unit').value = '';
    await loadAssignments();
  } catch (e) {
    toast(e.message);
  }
}

// Practical Creation
function openCreatePracticalModal() {
  if (ById('practical-title')) ById('practical-title').value = '';
  if (ById('practical-desc')) ById('practical-desc').value = '';
  if (ById('practical-due')) ById('practical-due').value = '';
  if (ById('practical-marks')) ById('practical-marks').value = '25';
  populateUnitDropdowns('', 'practical-unit');
  openModal('modal-create-practical');
}

async function submitCreatePractical() {
  const title = ById('practical-title')?.value.trim();
  if (!title) { toast('Please enter practical title'); return; }
  const desc = ById('practical-desc')?.value.trim() || '';
  const due = ById('practical-due')?.value;
  const marks = parseFloat(ById('practical-marks')?.value) || 25;
  const postStream = ById('practical-post-stream')?.checked;
  const unit_name = ById('practical-unit')?.value?.trim() || null;

  const btn = ById('btn-submit-practical');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Publishing...';
  }
  try {
    await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/assignments', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description: desc,
        due_date: due || null,
        max_marks: marks,
        type: 'PRACTICAL',
        post_to_stream: postStream,
        unit_name
      })
    });
    toast('Practical work published & announcement sent!');
    closeModal('modal-create-practical');
    await loadAssignments();
    if (postStream && typeof loadStream === 'function') await loadStream();
  } catch (e) {
    toast(e.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:middle"><path d="M10 2v7.31L4.65 18.23A2 2 0 0 0 6.38 21h11.24a2 2 0 0 0 1.73-2.77L14 9.31V2"/></svg><span>Publish Practical Work</span>';
    }
  }
}

// Test Creation
function onTestTypeOrNumChange() {
  const typeEl = ById('test-unit-type');
  const numEl = ById('test-number-input');
  const hiddenNo = ById('test-unit-no');
  const titleInp = ById('test-title');
  if (!typeEl || !titleInp) return;

  const type = typeEl.value;
  const num = numEl ? numEl.value.trim() : '1';

  if (type === 'MT') {
    if (numEl) numEl.style.display = 'none';
    if (hiddenNo) hiddenNo.value = 'MT';
    titleInp.value = 'Mid-Term Exam';
  } else if (type === 'PB') {
    if (numEl) numEl.style.display = 'none';
    if (hiddenNo) hiddenNo.value = 'PB';
    titleInp.value = 'Pre-Board Exam';
  } else if (type === 'CUSTOM') {
    if (numEl) { numEl.style.display = 'block'; numEl.placeholder = 'Code'; }
    if (hiddenNo) hiddenNo.value = num || 'CUSTOM';
    titleInp.placeholder = 'e.g. Special Evaluation';
  } else {
    if (numEl) { numEl.style.display = 'block'; numEl.placeholder = 'No.'; }
    const typeLabel = type === 'CT' ? 'Class Test' : 'Unit Test';
    const testNum = num || '1';
    if (hiddenNo) hiddenNo.value = `${type}${testNum}`;
    titleInp.value = `${typeLabel} ${testNum}`;
  }
}

function onTestUnitChange(val) {
  onTestTypeOrNumChange();
}

function updateScheduleTestQPreview() {
  const marksInp = ById('test-marks');
  const numQInp = ById('test-num-questions');
  const totalMarks = marksInp ? (parseFloat(marksInp.value) || 20) : 20;
  const numQ = numQInp ? Math.max(1, Math.min(50, parseInt(numQInp.value, 10) || 4)) : 4;
  const perQ = Math.round((totalMarks / numQ) * 10) / 10;

  if (!S.scheduleTestQuestions || S.scheduleTestQuestions.length !== numQ) {
    S.scheduleTestQuestions = Array.from({ length: numQ }, (_, i) => ({
      num: i + 1,
      label: 'Q' + (i + 1),
      max: perQ,
      text: ''
    }));
  }

  const dispEl = ById('test-marks-per-q-display');
  if (dispEl) dispEl.textContent = perQ + ' pts / question';

  renderScheduleQRows();
}

function renderScheduleQRows() {
  const container = ById('test-schedule-q-rows');
  if (!container || !S.scheduleTestQuestions) return;
  const total = Math.round(S.scheduleTestQuestions.reduce((sum, q) => sum + (Number(q.max) || 0), 0) * 10) / 10;
  const sumBadge = ById('test-q-summary-badge');
  if (sumBadge) sumBadge.textContent = S.scheduleTestQuestions.length + ' questions • ' + total + ' marks total';

  container.innerHTML = S.scheduleTestQuestions.map((q, idx) => `
    <div style="display:flex;align-items:center;gap:0.4rem;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:0.35rem 0.5rem">
      <span style="font-weight:750;font-size:0.78rem;color:var(--color-primary);min-width:28px">${esc(q.label)}</span>
      <input type="text" class="form-input" style="flex:1;padding:0.25rem 0.45rem;font-size:0.78rem;min-height:30px" placeholder="Question topic / text (optional)..." value="${esc(q.text || '')}" oninput="updateScheduleQRowText(${idx}, this.value)">
      <div style="display:flex;align-items:center;gap:0.2rem">
        <input type="number" min="0.5" max="500" step="0.5" value="${q.max}" style="width:48px;padding:0.25rem 0.2rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-surface);color:var(--color-primary);font-weight:750;font-size:0.8rem;text-align:center" onchange="updateScheduleQRowMarks(${idx}, this.value)">
        <span style="font-size:0.7rem;color:var(--text-muted);font-weight:600">pts</span>
      </div>
      <button type="button" onclick="removeScheduleQRow(${idx})" style="background:none;border:none;color:var(--status-absent);cursor:pointer;padding:0.2rem;display:inline-flex;align-items:center;font-size:0.95rem" title="Remove question">&times;</button>
    </div>
  `).join('');
}

function updateScheduleQRowMarks(idx, val) {
  const q = S.scheduleTestQuestions?.[idx];
  if (!q) return;
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) {
    toast('Please enter a valid positive number');
    renderScheduleQRows();
    return;
  }
  q.max = Math.round(num * 10) / 10;
  const newTotal = S.scheduleTestQuestions.reduce((sum, item) => sum + (Number(item.max) || 0), 0);
  const roundedTotal = Math.round(newTotal * 10) / 10;
  if (ById('test-marks')) ById('test-marks').value = roundedTotal;
  const sumBadge = ById('test-q-summary-badge');
  if (sumBadge) sumBadge.textContent = S.scheduleTestQuestions.length + ' questions • ' + roundedTotal + ' marks total';
}

function updateScheduleQRowText(idx, val) {
  if (S.scheduleTestQuestions?.[idx]) {
    S.scheduleTestQuestions[idx].text = val.trim();
  }
}

function addScheduleTestQuestion() {
  if (!S.scheduleTestQuestions) S.scheduleTestQuestions = [];
  const nextNum = S.scheduleTestQuestions.length + 1;
  const totalMarks = parseFloat(ById('test-marks')?.value) || 20;
  const perQ = Math.round((totalMarks / nextNum) * 10) / 10;
  S.scheduleTestQuestions.push({
    num: nextNum,
    label: 'Q' + nextNum,
    max: perQ,
    text: ''
  });
  if (ById('test-num-questions')) ById('test-num-questions').value = S.scheduleTestQuestions.length;
  renderScheduleQRows();
}

function removeScheduleQRow(idx) {
  if (!S.scheduleTestQuestions || S.scheduleTestQuestions.length <= 1) return;
  S.scheduleTestQuestions.splice(idx, 1);
  S.scheduleTestQuestions.forEach((q, i) => {
    q.num = i + 1;
    q.label = 'Q' + (i + 1);
  });
  if (ById('test-num-questions')) ById('test-num-questions').value = S.scheduleTestQuestions.length;
  renderScheduleQRows();
}

function autoSplitScheduleQuestions() {
  if (!S.scheduleTestQuestions || !S.scheduleTestQuestions.length) return;
  const totalMarks = parseFloat(ById('test-marks')?.value) || 20;
  const perQ = Math.round((totalMarks / S.scheduleTestQuestions.length) * 10) / 10;
  S.scheduleTestQuestions.forEach(q => { q.max = perQ; });
  renderScheduleQRows();
}

function openScheduleTestModal() {
  populateUnitDropdowns('', 'test-unit');
  updateScheduleTestQPreview();
  openModal('modal-schedule-test');
}

async function submitScheduleTest() {
  const type = ById('test-unit-type')?.value || 'UT';
  const num = ById('test-number-input')?.value?.trim() || '1';
  let prefixLabel = type === 'CT' ? `Class Test ${num}` : `Unit Test ${num}`;
  let prefixCode = type === 'CT' ? `CT${num}` : `UT${num}`;
  if (type === 'MT') { prefixLabel = 'Mid-Term Exam'; prefixCode = 'MT'; }
  else if (type === 'PB') { prefixLabel = 'Pre-Board Exam'; prefixCode = 'PB'; }
  else if (type === 'CUSTOM') { prefixLabel = num || 'Custom'; prefixCode = num || 'CUSTOM'; }

  let name = ById('test-title')?.value.trim() || '';
  const date = ById('test-date')?.value;
  const marks = parseFloat(ById('test-marks')?.value);
  const numQ = parseInt(ById('test-num-questions')?.value, 10) || (S.scheduleTestQuestions?.length || 4);
  const desc = ById('test-desc')?.value.trim() || '';
  const unit_name = ById('test-unit')?.value?.trim() || null;
  if (!name || !date || !marks) {
    toast('Title, date and marks are required');
    return;
  }
  if (type !== 'CUSTOM' && !name.toLowerCase().includes(prefixLabel.toLowerCase()) && !name.toLowerCase().includes(prefixCode.toLowerCase())) {
    name = `${prefixLabel}: ${name}`;
  }

  const questions = (S.scheduleTestQuestions && S.scheduleTestQuestions.length > 0)
    ? S.scheduleTestQuestions
    : Array.from({ length: numQ }, (_, i) => ({
        num: i + 1,
        label: 'Q' + (i + 1),
        max: Math.round((marks / numQ) * 10) / 10
      }));

  try {
    await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/tests', {
      method: 'POST',
      body: JSON.stringify({
        name,
        test_date: date,
        max_marks: marks,
        num_questions: numQ,
        questions,
        unit_name,
        description: desc || null
      })
    });
    toast('Test scheduled with ' + questions.length + ' questions!');
    closeModal('modal-schedule-test');
    if (ById('test-title')) ById('test-title').value = '';
    if (ById('test-date')) ById('test-date').value = '';
    if (ById('test-unit')) ById('test-unit').value = '';
    if (ById('test-marks')) ById('test-marks').value = '20';
    if (ById('test-num-questions')) ById('test-num-questions').value = '4';
    await loadTests();
    switchTab('marks');
  } catch (e) {
    toast(e.message || 'Failed to schedule test');
  }
}

// Final Docs Modal Logic
S.finalDocReqs = [
  'Total Assignments PDF Records (Consolidated)',
  'Class Test Records / Question Paper Solutions',
  'Practical / Lab Journal Records & Implementation',
  'Viva Voce / Micro-Project Documentation'
];
S.editingFinalDocIdx = null;

function renderFinalDocRequirements() {
  const container = ById('finaldocs-req-items');
  if (!container) return;
  if (!S.finalDocReqs.length) {
    container.innerHTML = '<div style="font-size:0.8rem;color:var(--text-muted);padding:0.35rem 0">No document requirements added yet. Type a requirement and click Add.</div>';
    return;
  }
  container.innerHTML = S.finalDocReqs.map((req, idx) => {
    if (S.editingFinalDocIdx === idx) {
      return `
        <div class="req-item-pill" style="padding:0.35rem 0.5rem;background:var(--bg-card);border:1px solid var(--color-primary);display:flex;gap:0.4rem;align-items:center;">
          <input type="text" id="input-create-req-${idx}" class="form-input" value="${esc(req)}" style="font-size:0.82rem;padding:0.3rem 0.5rem;flex:1;background:var(--bg-surface);color:var(--text-main);" onkeydown="if(event.key==='Enter'){event.preventDefault();saveCreateFinalDocRequirement(${idx});}if(event.key==='Escape'){event.preventDefault();cancelEditCreateFinalDocRequirement();}">
          <button type="button" class="btn btn-primary btn-sm" onclick="saveCreateFinalDocRequirement(${idx})" style="padding:0.25rem 0.55rem;font-size:0.75rem;">Save</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="cancelEditCreateFinalDocRequirement()" style="padding:0.25rem 0.55rem;font-size:0.75rem;">Cancel</button>
        </div>
      `;
    }
    return `
      <div class="req-item-pill">
        <span style="font-weight:600;font-size:0.82rem;word-break:break-word;flex:1;cursor:pointer;" onclick="startEditCreateFinalDocRequirement(${idx})" title="Click to edit">• ${esc(req)}</span>
        <div style="display:flex;align-items:center;gap:0.35rem;">
          <button type="button" class="req-item-edit-btn" onclick="startEditCreateFinalDocRequirement(${idx})" title="Edit requirement" style="background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;padding:2px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button type="button" class="req-item-del-btn" onclick="removeFinalDocRequirement(${idx})" title="Remove requirement">
            ${GD_ICONS.close}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function startEditCreateFinalDocRequirement(idx) {
  S.editingFinalDocIdx = idx;
  renderFinalDocRequirements();
  const inp = ById(`input-create-req-${idx}`);
  if (inp) { inp.focus(); inp.select(); }
}

function saveCreateFinalDocRequirement(idx) {
  const inp = ById(`input-create-req-${idx}`);
  const val = (inp?.value || '').trim();
  if (!val) { toast('Requirement title cannot be empty'); return; }
  S.finalDocReqs[idx] = val;
  S.editingFinalDocIdx = null;
  renderFinalDocRequirements();
}

function cancelEditCreateFinalDocRequirement() {
  S.editingFinalDocIdx = null;
  renderFinalDocRequirements();
}

function addFinalDocRequirement() {
  const inp = ById('finaldocs-new-req-input');
  const val = (inp?.value || '').trim();
  if (!val) { toast('Please type requirement title'); return; }
  S.finalDocReqs.push(val);
  inp.value = '';
  renderFinalDocRequirements();
}

function removeFinalDocRequirement(idx) {
  S.finalDocReqs.splice(idx, 1);
  if (S.editingFinalDocIdx === idx) S.editingFinalDocIdx = null;
  renderFinalDocRequirements();
}

function openFinalDocsModal() {
  if (ById('finaldocs-title')) ById('finaldocs-title').value = 'Semester-End Final Academic Documents Submission';
  if (ById('finaldocs-desc')) ById('finaldocs-desc').value = 'Please compile and upload your total semester coursework records.';
  if (ById('finaldocs-due')) ById('finaldocs-due').value = '';
  S.editingFinalDocIdx = null;
  if (!Array.isArray(S.finalDocReqs) || S.finalDocReqs.length === 0) {
    S.finalDocReqs = [
      'Total Assignments PDF Records (Consolidated)',
      'Class Test Records / Question Paper Solutions',
      'Practical / Lab Journal Records & Implementation',
      'Viva Voce / Micro-Project Documentation'
    ];
  }
  renderFinalDocRequirements();
  openModal('modal-create-finaldocs');
}

async function submitCreateFinalDocs() {
  const title = ById('finaldocs-title')?.value.trim();
  if (!title) { toast('Please enter request title'); return; }
  if (!S.finalDocReqs || S.finalDocReqs.length === 0) {
    toast('Please add at least one required document');
    return;
  }
  const due = ById('finaldocs-due')?.value;
  const customDesc = ById('finaldocs-desc')?.value.trim();
  const postStream = ById('finaldocs-post-stream')?.checked;

  const btn = ById('btn-submit-finaldocs');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Publishing...';
  }
  try {
    await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/assignments', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description: customDesc || null,
        due_date: due || null,
        type: 'FINAL_DOCS',
        questions: S.finalDocReqs,
        post_to_stream: postStream
      })
    });
    toast('Final documents request published & students notified!');
    closeModal('modal-create-finaldocs');
    await loadAssignments();
    if (postStream && typeof loadStream === 'function') await loadStream();
  } catch (e) {
    toast(e.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Request Final Documents';
    }
  }
}

// Edit Work Modal
S.editWorkItem = null;
S.editFinalDocReqs = [];
S.editingEditFinalDocIdx = null;

function renderEditFinalDocRequirements() {
  const container = ById('edit-finaldocs-req-items');
  if (!container) return;
  if (!S.editFinalDocReqs.length) {
    container.innerHTML = '<div style="font-size:0.8rem;color:var(--text-muted);padding:0.35rem 0">No document requirements. Type and click Add.</div>';
    return;
  }
  container.innerHTML = S.editFinalDocReqs.map((req, idx) => {
    if (S.editingEditFinalDocIdx === idx) {
      return `
        <div class="req-item-pill" style="padding:0.35rem 0.5rem;background:var(--bg-card);border:1px solid var(--color-primary);display:flex;gap:0.4rem;align-items:center;">
          <input type="text" id="input-edit-req-${idx}" class="form-input" value="${esc(req)}" style="font-size:0.82rem;padding:0.3rem 0.5rem;flex:1;background:var(--bg-surface);color:var(--text-main);" onkeydown="if(event.key==='Enter'){event.preventDefault();saveEditFinalDocRequirement(${idx});}if(event.key==='Escape'){event.preventDefault();cancelEditFinalDocRequirement();}">
          <button type="button" class="btn btn-primary btn-sm" onclick="saveEditFinalDocRequirement(${idx})" style="padding:0.25rem 0.55rem;font-size:0.75rem;">Save</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="cancelEditFinalDocRequirement()" style="padding:0.25rem 0.55rem;font-size:0.75rem;">Cancel</button>
        </div>
      `;
    }
    return `
      <div class="req-item-pill">
        <span style="font-weight:600;font-size:0.82rem;word-break:break-word;flex:1;cursor:pointer;" onclick="startEditFinalDocRequirement(${idx})" title="Click to edit">• ${esc(req)}</span>
        <div style="display:flex;align-items:center;gap:0.35rem;">
          <button type="button" class="req-item-edit-btn" onclick="startEditFinalDocRequirement(${idx})" title="Edit requirement" style="background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;padding:2px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button type="button" class="req-item-del-btn" onclick="removeEditFinalDocRequirement(${idx})" title="Remove requirement">
            ${GD_ICONS.close}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function startEditFinalDocRequirement(idx) {
  S.editingEditFinalDocIdx = idx;
  renderEditFinalDocRequirements();
  const inp = ById(`input-edit-req-${idx}`);
  if (inp) { inp.focus(); inp.select(); }
}

function saveEditFinalDocRequirement(idx) {
  const inp = ById(`input-edit-req-${idx}`);
  const val = (inp?.value || '').trim();
  if (!val) { toast('Requirement title cannot be empty'); return; }
  S.editFinalDocReqs[idx] = val;
  S.editingEditFinalDocIdx = null;
  renderEditFinalDocRequirements();
}

function cancelEditFinalDocRequirement() {
  S.editingEditFinalDocIdx = null;
  renderEditFinalDocRequirements();
}

function addEditFinalDocRequirement() {
  const inp = ById('edit-finaldocs-new-req-input');
  const val = (inp?.value || '').trim();
  if (!val) { toast('Please type requirement title'); return; }
  S.editFinalDocReqs.push(val);
  inp.value = '';
  renderEditFinalDocRequirements();
}

function removeEditFinalDocRequirement(idx) {
  S.editFinalDocReqs.splice(idx, 1);
  if (S.editingEditFinalDocIdx === idx) S.editingEditFinalDocIdx = null;
  renderEditFinalDocRequirements();
}

function openEditWorkModal(type, id) {
  openWorkEditPage(type, id);
}

function openWorkEditPage(type, id) {
  const isTest = type === 'test';
  const item = isTest ? S.tests.find(t => t.id === id) : S.assignments.find(a => a.id === id);
  if (!item) { toast('Item not found'); return; }
  S.editWorkItem = item;
  S.editingWorkType = type;
  S.editingWorkId = id;

  if (ById('edit-work-id')) ById('edit-work-id').value = id;
  if (ById('edit-work-type')) ById('edit-work-type').value = type;
  if (ById('edit-work-title')) ById('edit-work-title').value = item.title || item.name || '';
  if (ById('edit-work-desc')) ById('edit-work-desc').value = item.description || '';

  const due = item.due_date || item.test_date;
  const dueVal = due ? due.slice(0, 10) : '';
  if (ById('edit-work-due')) ById('edit-work-due').value = dueVal;
  if (ById('edit-work-due-mobile')) ById('edit-work-due-mobile').value = dueVal;

  const selDesk = ById('edit-work-unit');
  if (selDesk) {
    if (selDesk.tagName === 'SELECT') populateUnitDropdowns(item.unit_name || '', 'edit-work-unit');
    else selDesk.value = item.unit_name || '';
  }
  const selMob = ById('edit-work-unit-mobile');
  if (selMob) {
    if (selMob.tagName === 'SELECT') populateUnitDropdowns(item.unit_name || '', 'edit-work-unit-mobile');
    else selMob.value = item.unit_name || '';
  }

  if (ById('edit-work-page-heading')) {
    ById('edit-work-page-heading').textContent = isTest ? 'Class Test' : type === 'finaldocs' ? 'Final Documents' : type === 'practical' ? 'Practical Work' : 'Assignment';
  }
  if (ById('edit-work-due-label')) {
    ById('edit-work-due-label').textContent = isTest ? 'Test Date' : 'Due';
  }

  const marksVal = (item.max_marks !== null && item.max_marks !== undefined) ? item.max_marks : 100;
  if (ById('edit-work-marks')) ById('edit-work-marks').value = marksVal;
  if (ById('edit-work-marks-mobile')) ById('edit-work-marks-mobile').value = marksVal;

  // Sync mobile and desktop inputs
  const marksMob = ById('edit-work-marks-mobile');
  const marksDesk = ById('edit-work-marks');
  if (marksMob && marksDesk) {
    marksMob.oninput = () => { marksDesk.value = marksMob.value; };
    marksDesk.oninput = () => { marksMob.value = marksDesk.value; };
  }
  const dueMob = ById('edit-work-due-mobile');
  const dueDesk = ById('edit-work-due');
  if (dueMob && dueDesk) {
    dueMob.onchange = () => { dueDesk.value = dueMob.value; };
    dueDesk.onchange = () => { dueMob.value = dueDesk.value; };
  }
  const unitMob = ById('edit-work-unit-mobile');
  const unitDesk = ById('edit-work-unit');
  if (unitMob && unitDesk) {
    unitMob.onchange = () => { unitDesk.value = unitMob.value; };
    unitDesk.onchange = () => { unitMob.value = unitDesk.value; };
  }

  if (type === 'finaldocs') {
    if (ById('edit-work-marks-wrap')) ById('edit-work-marks-wrap').style.display = 'none';
    if (ById('edit-work-marks-wrap-mobile')) ById('edit-work-marks-wrap-mobile').style.display = 'none';
    if (ById('edit-work-req-container')) ById('edit-work-req-container').style.display = 'block';
    S.editingEditFinalDocIdx = null;

    let reqs = [];
    if (Array.isArray(item.questions)) reqs = [...item.questions];
    else if (typeof item.questions === 'string') {
      try { reqs = JSON.parse(item.questions); } catch (_) { reqs = []; }
    }
    if (!reqs.length) {
      reqs = ['Consolidated Assignments PDF Records', 'Class Test Records & Solutions', 'Practical / Lab Journal Records'];
    }
    S.editFinalDocReqs = reqs;
    renderEditFinalDocRequirements();
  } else {
    if (ById('edit-work-marks-wrap')) ById('edit-work-marks-wrap').style.display = '';
    if (ById('edit-work-marks-wrap-mobile')) ById('edit-work-marks-wrap-mobile').style.display = '';
    if (ById('edit-work-req-container')) ById('edit-work-req-container').style.display = 'none';
  }

  // Update attachment filename
  const attachName = (item.attachment_name || ('01_' + (S.user?.full_name || 'Girdhar_dhami').toLowerCase().replace(/\s+/g, '_') + '_DSUC_01.pdf'));
  if (ById('edit-work-attach-name')) ById('edit-work-attach-name').textContent = attachName;

  // Hide other views and show edit page view
  const editPage = ById('work-edit-page-view');
  const instView = ById('work-instructions-view');
  const cwLayout = document.querySelector('.classwork-layout') || document.querySelector('.cw-layout');

  if (instView) instView.style.display = 'none';
  if (cwLayout) cwLayout.style.display = 'none';
  if (editPage) editPage.style.display = 'block';

  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    document.body.classList.add('work-standalone-page', 'work-edit-standalone');
    document.documentElement.classList.add('work-standalone-page', 'work-edit-standalone');
    document.body.classList.remove('work-instructions-standalone');
    document.documentElement.classList.remove('work-instructions-standalone');
    try { window.history.pushState({ workEditPage: true }, ''); } catch {}
    const cwFab = ById('classwork-mobile-fab');
    if (cwFab) cwFab.style.setProperty('display', 'none', 'important');
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
}

function closeWorkEditPage(fromPopstate) {
  const editPage = ById('work-edit-page-view');
  if (editPage) editPage.style.display = 'none';

  document.body.classList.remove('work-edit-standalone');
  document.documentElement.classList.remove('work-edit-standalone');

  if (S.currentInstructionWork) {
    const instView = ById('work-instructions-view');
    if (instView) instView.style.display = 'block';
    const { id, type } = S.currentInstructionWork;
    openWorkInstructionsView(id, type, S.workInstActiveTab || 'instructions');
  } else {
    const cwLayout = document.querySelector('.classwork-layout') || document.querySelector('.cw-layout');
    if (cwLayout) cwLayout.style.display = '';
    if (document.body.classList.contains('work-standalone-page')) {
      document.body.classList.remove('work-standalone-page');
      document.documentElement.classList.remove('work-standalone-page');
      if (!fromPopstate && window.history.state?.workEditPage) {
        try { window.history.back(); } catch {}
      }
    }
  }

  const cwFab = ById('classwork-mobile-fab');
  if (cwFab && S.activeTab === 'classwork' && window.innerWidth <= 768 && !S.currentInstructionWork) {
    cwFab.style.setProperty('display', 'inline-flex', 'important');
  }
}

function formatEditDesc(cmd) {
  const ta = ById('edit-work-desc');
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const val = ta.value;
  const sel = val.substring(start, end);

  if (cmd === 'bold') {
    ta.value = val.substring(0, start) + '**' + (sel || 'bold text') + '**' + val.substring(end);
  } else if (cmd === 'italic') {
    ta.value = val.substring(0, start) + '*' + (sel || 'italic text') + '*' + val.substring(end);
  } else if (cmd === 'underline') {
    ta.value = val.substring(0, start) + '<u>' + (sel || 'underlined text') + '</u>' + val.substring(end);
  } else if (cmd === 'bullet') {
    ta.value = val.substring(0, start) + '\n• ' + (sel || 'list item') + val.substring(end);
  } else if (cmd === 'clear') {
    ta.value = val.replace(/\*\*|\*|<u>|<\/u>/g, '');
  }
  ta.focus();
}

function promptAddAttachment(type) {
  toast('Attachment tool: ' + type.toUpperCase() + ' ready');
}

async function submitEditWork() {
  const id = Number(ById('edit-work-id')?.value);
  const type = ById('edit-work-type')?.value;
  const isTest = type === 'test';
  const title = ById('edit-work-title')?.value.trim();
  if (!title) { toast('Title is required'); return; }

  const desc = ById('edit-work-desc')?.value.trim();
  const due = ById('edit-work-due')?.value;
  const marks = ById('edit-work-marks')?.value;
  const unit_name = ById('edit-work-unit')?.value?.trim() || null;

  const btn = ById('btn-save-edit-work');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving...';
  }

  try {
    if (isTest) {
      await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/tests/' + id, {
        method: 'PUT',
        body: JSON.stringify({
          name: title,
          description: desc || null,
          test_date: due || null,
          max_marks: marks ? parseFloat(marks) : null,
          unit_name
        })
      });
      toast('Class test updated successfully');
      await loadTests();
    } else {
      const bodyPayload = {
        title,
        description: desc || null,
        due_date: due || null,
        max_marks: type === 'finaldocs' ? null : (marks ? parseFloat(marks) : null),
        unit_name
      };
      if (type === 'finaldocs') {
        bodyPayload.questions = S.editFinalDocReqs;
      }
      await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/assignments/' + id, {
        method: 'PUT',
        body: JSON.stringify(bodyPayload)
      });
      toast('Assignment updated successfully');
      await loadAssignments();
    }
    closeWorkEditPage();
  } catch (err) {
    toast(err.message || 'Failed to update item');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Save';
    }
  }
}

// Delete Work Items
let _workToDelete = null;

function delWork(type, id) {
  const isTest = type === 'test';
  const label = type === 'practical' ? 'Practical Work' : type === 'finaldocs' ? 'Final Documents Request' : isTest ? 'Class Test' : 'Assignment';
  const item = isTest ? S.tests.find(t => t.id === id) : S.assignments.find(a => a.id === id);
  const title = item ? (item.title || item.name) : label;

  _workToDelete = { type, id, isTest, label, title };
  if (ById('del-work-title')) ById('del-work-title').textContent = title;
  if (ById('del-work-type-label')) ById('del-work-type-label').textContent = label;
  openModal('modal-delete-work-direct');
}

async function confirmDirectDeleteWork() {
  if (!_workToDelete) return;
  const { isTest, id, label } = _workToDelete;
  const btn = ById('btn-confirm-delete-work');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Deleting...';
  }
  try {
    const deleteFiles = Boolean(document.getElementById('del-work-delete-files')?.checked);
    const ep = isTest 
      ? '/api/v1/teaching-groups/' + S.groupId + '/tests/' + id + '?delete_files=' + deleteFiles
      : '/api/v1/teaching-groups/' + S.groupId + '/assignments/' + id + '?delete_files=' + deleteFiles;
    await apiFetch(ep, { method: 'DELETE' });
    toast(label + ' deleted successfully');
    closeModal('modal-delete-work-direct');
    if (isTest) await loadTests(); else await loadAssignments();
  } catch (err) {
    toast(err.message || 'Failed to delete');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Delete';
    }
    _workToDelete = null;
  }
}

function proceedDeleteStep2() {
  if (ById('del-step-1')) ById('del-step-1').style.display = 'none';
  if (ById('del-step-2')) ById('del-step-2').style.display = '';
}

function backDeleteStep1() {
  if (ById('del-step-1')) ById('del-step-1').style.display = '';
  if (ById('del-step-2')) ById('del-step-2').style.display = 'none';
}

async function executeConfirmedDelete() {
  if (!window._pendingDelete || typeof window._pendingDelete.execute !== 'function') return;
  const btn = ById('btn-final-delete-confirm');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Processing...';
  }
  try {
    await window._pendingDelete.execute();
    closeModal('modal-confirm-delete');
  } catch (err) {
    toast(err.message || 'Action failed');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Confirm & Remove';
    }
    window._pendingDelete = null;
  }
}

// Submissions Drawer & Expansion
S.expandedRosters = {};

async function toggleWorkSubmissionsExpand(id, type) {
  const pane = ById('work-expand-pane-' + id);
  if (!pane) return;

  if (pane.style.display !== 'none' && pane.innerHTML.trim().length > 0) {
    pane.style.display = 'none';
    return;
  }

  pane.style.display = 'block';
  pane.innerHTML = `
    <div style="padding:1.25rem;text-align:center;color:var(--text-muted);font-size:0.85rem">
      Loading student submissions roster...
    </div>
  `;

  try {
    const isTest = type === 'test';
    let data = null;

    if (isTest) {
      const sr = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/tests/' + id + '/scores');
      const scoreMap = {};
      (sr.data || []).forEach(s => { scoreMap[s.student_id] = s; });

      const testObj = S.tests.find(t => t.id === id);
      const roster = (S.members || []).map((m, idx) => {
        const sc = scoreMap[m.student_id];
        const hasGraded = sc && sc.marks_obtained !== null && sc.marks_obtained !== undefined;
        return {
          student_id: m.student_id,
          class_roll_no: m.class_roll_no || (idx + 1),
          full_name: m.full_name,
          official_enrollment_no: m.official_enrollment_no,
          is_submitted: Boolean(hasGraded),
          status: hasGraded ? 'GRADED' : 'PENDING',
          submitted_at: sc?.updated_at || null,
          marks_obtained: sc?.marks_obtained,
          documents: []
        };
      });

      const subCount = roster.filter(r => r.is_submitted).length;
      data = {
        assignment_id: id,
        title: testObj?.name || 'Class Test',
        type: 'EXAM',
        total_students: roster.length,
        submitted_count: subCount,
        not_submitted_count: roster.length - subCount,
        roster
      };
    } else {
      const res = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/assignments/' + id + '/submissions');
      data = res.data;
    }

    S.expandedRosters[id] = { data, filter: 'all' };
    renderWorkSubmissionsPanel(id);

    const statSub = ById('stat-sub-' + id);
    const statPend = ById('stat-pend-' + id);
    if (statSub) statSub.textContent = data.submitted_count;
    if (statPend) statPend.textContent = data.not_submitted_count;
  } catch (err) {
    pane.innerHTML = `
      <div style="padding:1rem;color:var(--status-absent);font-size:0.83rem;text-align:center">
        Failed to load submissions: ${esc(err.message)}
      </div>
    `;
  }
}

// ── Work Instructions View (Google Classroom Image 3) ──────────────────────
// This is the full-page dedicated view that shows when clicking "View instructions"
// or tapping on a work card title. It shows:
//   Tab 1 – Instructions (description, attachment, class comments)
//   Tab 2 – Student Work (roster of submitted / assigned students)

async function openWorkInstructionsView(arg1, arg2, arg3, arg4) {
  let id, type, event, initialTab;

  // Flexible argument handling:
  // (id, type, event, initialTab) OR (id, type, initialTab) OR (type, id, ...)
  if (typeof arg1 === 'number' || (typeof arg1 === 'string' && !isNaN(Number(arg1)))) {
    id = Number(arg1);
    type = arg2;
    if (typeof arg3 === 'string') {
      initialTab = arg3;
      event = arg4;
    } else {
      event = arg3;
      initialTab = arg4;
    }
  } else if (typeof arg2 === 'number' || (typeof arg2 === 'string' && !isNaN(Number(arg2)))) {
    type = arg1;
    id = Number(arg2);
    if (typeof arg3 === 'string') {
      initialTab = arg3;
      event = arg4;
    } else {
      event = arg3;
      initialTab = arg4;
    }
  } else {
    id = arg1;
    type = arg2;
    event = arg3;
    initialTab = arg4;
  }

  if (window.event && typeof window.event.stopPropagation === 'function') {
    try { window.event.stopPropagation(); } catch {}
  }
  if (event && typeof event.stopPropagation === 'function') {
    try { event.stopPropagation(); } catch {}
  }

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const isStudent = document.body.classList.contains('student-mode') ||
                    S.isStudent ||
                    (user?.role === 'STUDENT') ||
                    (Array.isArray(user?.roles) && user.roles.includes('STUDENT')) ||
                    window.location.pathname.startsWith('/student');

  if (isStudent) {
    initialTab = 'instructions';
  }

  let item = null;
  if (type === 'test') {
    item = (S.tests || []).find(t => Number(t.id) === Number(id));
  } else if (type) {
    item = (S.assignments || []).find(a => Number(a.id) === Number(id));
  }
  if (!item) {
    item = (S.assignments || []).find(a => Number(a.id) === Number(id)) ||
           (S.tests || []).find(t => Number(t.id) === Number(id));
  }

  if (!item) {
    console.warn('openWorkInstructionsView: Item not found', { id, type });
    return;
  }

  if (!type && item) {
    type = item._type || ((S.tests || []).some(t => Number(t.id) === Number(id)) ? 'test' : 'assignment');
  }

  S.currentInstructionWork = { id, type, item };

  // Switch to classwork tab if not active
  if (typeof switchTab === 'function' && S.activeTab !== 'classwork') {
    switchTab('classwork');
  }

  // Explicitly ensure edit page view and all card menus are closed
  const editPage = ById('work-edit-page-view');
  if (editPage) editPage.style.display = 'none';
  closeAllWorkCardMenus();
  closeWorkInstDropdown();

  const view = ById('work-instructions-view');
  const cwLayout = document.querySelector('.classwork-layout') || document.querySelector('.cw-layout');
  if (!view) return;

  // Hide the main classwork list, show instructions view
  if (cwLayout) cwLayout.style.display = 'none';
  view.style.display = 'block';

  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    document.body.classList.add('work-standalone-page', 'work-instructions-standalone');
    document.documentElement.classList.add('work-standalone-page', 'work-instructions-standalone');
    document.body.classList.remove('work-edit-standalone');
    document.documentElement.classList.remove('work-edit-standalone');
    try {
      window.history.pushState({ workInstructionsPage: true }, '');
    } catch {}
    const cwFab = ById('classwork-mobile-fab');
    if (cwFab) cwFab.style.setProperty('display', 'none', 'important');
  }

  window.scrollTo({ top: 0, behavior: 'instant' });

  // Reset tabs to requested tab (defaults to instructions)
  switchWorkInstTab(initialTab || 'instructions');

  // Hard guarantee that Instructions pane is visible in student mode
  if (isStudent) {
    const paneInst = ById('pane-work-instructions');
    const paneRoster = ById('pane-work-roster');
    if (paneInst) paneInst.style.display = 'block';
    if (paneRoster) paneRoster.style.display = 'none';
    const btnInst = ById('btn-inst-tab-instructions');
    if (btnInst) {
      btnInst.classList.add('active');
      btnInst.setAttribute('aria-selected', 'true');
    }
  }

  // --- Populate Instructions tab (Google Classroom Image 4 Layout) ---
  const title = item.title || item.name || 'Untitled';
  const mm = item.max_marks;
  const dueDisplay = item.due_date
    ? `Due ${formatClassroomDueDate(item.due_date)}`
    : item.test_date
      ? `Date: ${formatClassroomDueDate(item.test_date)}`
      : 'No due date';

  const isP = type === 'practical';
  const isF = type === 'finaldocs';
  const isTest = type === 'test' || item._type === 'test';
  const typeLabel = isP ? 'Practical Work' : isF ? 'Final Documents' : isTest ? 'Class Test' : 'Assignment';

  // Reset comment composer inputs
  const inlineInp = ById('work-inst-comment-input-' + id);
  if (inlineInp) inlineInp.value = '';
  const bottomInp = ById('work-inst-bottom-comment-input');
  if (bottomInp) bottomInp.value = '';

  const storedComments = getWorkComments(id);
  const combinedComments = [...(item._comments || []), ...storedComments];
  const seenComments = new Set();
  const comments = combinedComments.filter(c => {
    const k = (c.author || '') + '|' + (c.text || '') + '|' + (c.time || '');
    if (seenComments.has(k)) return false;
    seenComments.add(k);
    return true;
  });

  const commentsHtml = comments.length > 0
    ? comments.map(c => `
      <div class="work-inst-comment-item">
        <div class="work-inst-comment-avatar">${esc(c.avatar || 'U')}</div>
        <div class="work-inst-comment-body">
          <div class="work-inst-comment-author">${esc(c.author || 'User')}</div>
          <div class="work-inst-comment-text">${esc(c.text || '')}</div>
          <div class="work-inst-comment-time">${esc(c.time || 'Just now')}</div>
        </div>
      </div>
    `).join('')
    : `<div class="work-inst-no-comments" style="color:var(--text-muted);font-size:0.83rem;padding:0.5rem 0;">No comments yet</div>`;

  const rosterTabBtn = ById('btn-inst-tab-roster');
  if (rosterTabBtn) {
    rosterTabBtn.style.setProperty('display', isStudent ? 'none' : 'inline-flex', 'important');
  }

  const sub = item.my_submission;
  const isSubmitted = Boolean(sub && (sub.is_submitted || sub.file_path));

  const currentUser = S.user || {};
  const currentUserName = currentUser.full_name || currentUser.name || (isStudent ? 'Student' : 'Faculty');
  const userAvatarChar = (currentUserName.charAt(0) || (isStudent ? 'S' : 'F')).toUpperCase();

  const instructionsHtml = `
    <!-- Google Classroom Native Header (Image 4) -->
    <div class="work-inst-gc-header">
      <div class="work-inst-due-block">
        <div class="work-inst-due-text">${esc(dueDisplay)}</div>
        ${item.due_date ? '<div class="work-inst-due-policy">Work cannot be turned in after the due date</div>' : ''}
      </div>
      <h1 class="work-inst-gc-title">${esc(title)}</h1>
      <div class="work-inst-gc-points" id="work-inst-points-text">${mm ? `${mm} points` : '100 points'}${item.unit_name ? ` &bull; ${esc(item.unit_name)}` : ''} &bull; ${typeLabel}</div>
    </div>

    <hr class="work-inst-divider"/>

    <!-- Instructions Body -->
    <div class="work-inst-body">
      ${formatInstructionsDescription(item.description)}
    </div>

    <!-- Attachment Section (Image 4) -->
    <div class="work-inst-attachment-section" style="margin-top:1.5rem;">
      <h3 class="work-inst-section-heading" style="font-size:0.95rem;font-weight:700;margin-bottom:0.6rem;color:var(--text-main);">Attachments</h3>
      ${renderAttachmentCardHtml(item)}
    </div>

    <hr class="work-inst-divider" style="margin-top:2rem;"/>

    <!-- Class Comments Section -->
    <div class="work-inst-comments-section">
      <h2 class="work-inst-comments-heading">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <span>Class comments</span>
      </h2>
      <div class="work-inst-comments-list" id="work-inst-comments-list-${id}">
        ${commentsHtml}
      </div>

      <!-- Desktop Inline Comment Composer (Native Google Classroom Flow) -->
      <div class="work-inst-inline-composer" id="work-inst-inline-composer">
        <div class="work-inst-comment-avatar" style="width:32px;height:32px;font-size:0.82rem;flex-shrink:0;">${esc(userAvatarChar)}</div>
        <div class="work-inst-comment-composer" style="flex:1;">
          <input type="text" class="work-inst-comment-input" id="work-inst-comment-input-${id}"
            placeholder="Add class comment…"
            aria-label="Add class comment"
            onkeydown="if(event.key==='Enter') submitWorkInstComment(${id}, '${type}')" />
          <button type="button" class="work-inst-send-btn" onclick="submitWorkInstComment(${id}, '${type}')" title="Send comment" aria-label="Send comment">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  const content = ById('work-instructions-content');
  if (content) {
    if (isStudent && window.innerWidth > 768) {
      // Desktop 2-Column layout with "Your work" card on the right
      content.innerHTML = `
        <div class="pc-work-details-grid" style="display:grid; grid-template-columns:1fr 340px; gap:2rem; align-items:flex-start;">
          <div class="pwd-main-col">
            ${instructionsHtml}
          </div>
          <div class="pwd-sidebar-col">
            <div class="pwd-sidebar-card">
              <div class="pwd-sidebar-hdr">
                <h2 class="pwd-sidebar-title">Your work</h2>
                <span class="pwd-status-text ${isSubmitted ? 'is-submitted' : ''}" id="pc-your-work-status">${isSubmitted ? 'Handed in' : 'Assigned'}</span>
              </div>

              <div id="pc-your-work-body">
                ${renderStudentYourWorkHtml(item, false)}
              </div>
              <p class="pwd-due-notice">Work cannot be turned in after the due date</p>
            </div>
          </div>
        </div>
      `;
    } else if (isStudent && window.innerWidth <= 768) {
      // Mobile layout with elevated bottom sheet
      content.innerHTML = `
        <div class="mobile-work-details-content">
          ${instructionsHtml}
          <div class="mobile-your-work-sheet" id="mobile-your-work-sheet">
            <div class="sheet-drag-handle"></div>
            <div class="sheet-header-row">
              <h2 class="sheet-title">Your work</h2>
              <span class="sheet-status ${isSubmitted ? 'is-turned-in' : ''}" id="mobile-your-work-status">${isSubmitted ? 'Turned in' : 'Assigned'}</span>
            </div>
            <div id="mobile-your-work-body">
              ${renderStudentYourWorkHtml(item, true)}
            </div>
          </div>
        </div>
      `;
    } else {
      // Teacher mode
      content.innerHTML = instructionsHtml;
    }
  }

  // Populate "Student work" badge count
  const badge = ById('inst-sub-count-badge');
  const gc = item.graded_count || item.submission_count || 0;
  const tot = S.members ? S.members.length : 0;
  if (badge) badge.textContent = gc + '/' + tot;

  // Load roster in background for Student work tab (if teacher)
  if (!isStudent) {
    loadWorkInstRoster(id, type);
  }
}

window.S_stagedStudentFile = null;
window.S_stagedAssignmentId = null;

function formatStudentFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function previewStagedStudentFile() {
  if (!window.S_stagedStudentFile) return;
  try {
    const url = URL.createObjectURL(window.S_stagedStudentFile);
    window.open(url, '_blank');
  } catch (err) {
    toast('Unable to preview file');
  }
}

function handleStudentCancelStagedFile(assignmentId) {
  window.S_stagedStudentFile = null;
  window.S_stagedAssignmentId = null;
  const mobInp = ById('mobile-work-file-input');
  if (mobInp) mobInp.value = '';
  const pcInp = ById('pc-work-file-input');
  if (pcInp) pcInp.value = '';
  renderStudentYourWorkSection(assignmentId);
}

function renderStudentYourWorkHtml(item, isMobile) {
  const sub = item.my_submission;
  const isSubmitted = Boolean(sub && (sub.is_submitted || sub.file_path));
  const stagedFile = (window.S_stagedAssignmentId === Number(item.id)) ? window.S_stagedStudentFile : null;

  if (isSubmitted) {
    // 1. Turned in / Handed in
    return `
      <div class="your-work-submitted-view">
        <a href="${esc(sub?.file_path || '#')}" target="_blank" class="gc-submitted-file-row" title="Click to view submitted document">
          <div class="gc-file-icon-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div class="gc-file-meta-wrap">
            <div class="gc-file-name">${esc(sub?.original_filename || 'Submission.pdf')}</div>
            <div class="gc-file-subtext">PDF &bull; Turned in</div>
          </div>
          <div class="gc-file-view-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </div>
        </a>
        <button type="button" class="btn-pwd-unsubmit" onclick="handleStudentUnsubmitWork(${item.id})">
          Unsubmit
        </button>
      </div>
    `;
  }

  if (stagedFile) {
    // 2. File selected by student: Preview, Cancel (✕), or Turn in
    const fileName = stagedFile.name || 'Attachment.pdf';
    const fileSize = formatStudentFileSize(stagedFile.size);
    return `
      <div class="your-work-staged-view">
        <div class="gc-staged-file-card">
          <div class="gc-staged-file-preview-clickable" onclick="previewStagedStudentFile()" title="Click to preview file">
            <div class="gc-file-icon-badge staged">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div class="gc-file-meta-wrap">
              <div class="gc-file-name">${esc(fileName)}</div>
              <div class="gc-file-subtext">${esc(fileSize)} &bull; <span class="gc-preview-hint">Tap to preview</span></div>
            </div>
          </div>
          <button type="button" class="btn-cancel-staged-file" onclick="handleStudentCancelStagedFile(${item.id})" title="Cancel selection and choose another file" aria-label="Cancel file">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <button type="button" class="btn-pwd-turnin" id="${isMobile ? 'mobile' : 'pc'}-btn-turnin" onclick="handleStudentWorkSubmitClick(${item.id})">
          Turn in
        </button>

        <label class="btn-change-different-file" style="cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.35rem; margin-top:0.65rem; font-size:0.84rem; font-weight:600; color:var(--color-primary);">
          <span>Select different file</span>
          <input type="file" id="${isMobile ? 'mobile' : 'pc'}-work-file-input" onchange="handleStudentWorkFileSelected(event, ${item.id})" style="display:none;">
        </label>
      </div>
    `;
  }

  // 3. No file staged yet: Add work button only (no empty Mark as done button)
  return `
    <div class="your-work-empty-view">
      <label class="${isMobile ? 'btn-mobile-add-work' : 'btn btn-secondary btn-desktop-add-work'}" style="${!isMobile ? 'width:100%; box-sizing:border-box; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.5rem; padding:0.75rem; font-weight:700;' : ''}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>${isMobile ? 'Add work' : 'Add or create'}</span>
        <input type="file" id="${isMobile ? 'mobile' : 'pc'}-work-file-input" onchange="handleStudentWorkFileSelected(event, ${item.id})" style="display:none;">
      </label>
    </div>
  `;
}

function renderStudentYourWorkSection(assignmentId) {
  const item = (S.assignments || []).find(a => Number(a.id) === Number(assignmentId)) ||
               (S.tests || []).find(t => Number(t.id) === Number(assignmentId));
  if (!item) return;

  const mobBody = ById('mobile-your-work-body');
  const pcBody = ById('pc-your-work-body');
  const mobStatus = ById('mobile-your-work-status');
  const pcStatus = ById('pc-your-work-status');

  const sub = item.my_submission;
  const isSubmitted = Boolean(sub && (sub.is_submitted || sub.file_path));
  const statusLabel = isSubmitted ? 'Turned in' : 'Assigned';

  if (mobStatus) {
    mobStatus.textContent = statusLabel;
    mobStatus.className = `sheet-status ${isSubmitted ? 'is-turned-in' : ''}`;
  }
  if (pcStatus) {
    pcStatus.textContent = isSubmitted ? 'Handed in' : 'Assigned';
    pcStatus.className = `pwd-status-text ${isSubmitted ? 'is-submitted' : ''}`;
  }

  if (mobBody) mobBody.innerHTML = renderStudentYourWorkHtml(item, true);
  if (pcBody) pcBody.innerHTML = renderStudentYourWorkHtml(item, false);
}

function handleStudentWorkFileSelected(event, assignmentId) {
  const file = event.target.files?.[0];
  if (!file) return;
  window.S_stagedStudentFile = file;
  window.S_stagedAssignmentId = Number(assignmentId);
  renderStudentYourWorkSection(assignmentId);
}

async function handleStudentWorkSubmitClick(assignmentId) {
  const file = (window.S_stagedAssignmentId === Number(assignmentId)) ? window.S_stagedStudentFile : null;
  if (!file) {
    showToast('Please attach a file before turning in');
    return;
  }
  await executeStudentWorkUpload(assignmentId, file);
}

async function executeStudentWorkUpload(assignmentId, file) {
  const btnPc = ById('pc-btn-turnin');
  const btnMobile = ById('mobile-btn-turnin');
  try {
    if (btnPc) { btnPc.disabled = true; btnPc.textContent = 'Uploading…'; }
    if (btnMobile) { btnMobile.disabled = true; btnMobile.textContent = 'Uploading…'; }

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }

    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const res = await fetch(`/api/v1/assignments/${assignmentId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (data && data.success) {
      toast('Work turned in successfully!');
      window.S_stagedStudentFile = null;
      window.S_stagedAssignmentId = null;
      await loadAssignments();
      openWorkInstructionsView(assignmentId, 'assignment');
    } else {
      throw new Error(data?.error?.message || data?.message || 'Failed to submit work');
    }
  } catch (err) {
    toast(err.message || 'Submission failed');
  } finally {
    if (btnPc) { btnPc.disabled = false; btnPc.textContent = 'Turn in'; }
    if (btnMobile) { btnMobile.disabled = false; btnMobile.textContent = 'Turn in'; }
  }
}

async function handleStudentUnsubmitWork(assignmentId) {
  if (!confirm("Unsubmit to add or change attachments? Don't forget to resubmit once you're done.")) return;
  try {
    const res = await apiFetch(`/api/v1/assignments/${assignmentId}/unsubmit`, {
      method: 'POST'
    });
    if (res && res.success) {
      toast('Work unsubmitted');
      window.S_stagedStudentFile = null;
      window.S_stagedAssignmentId = null;
      await loadAssignments();
      openWorkInstructionsView(assignmentId, 'assignment');
    } else {
      throw new Error(res?.error?.message || 'Failed to unsubmit work');
    }
  } catch (err) {
    toast(err.message || 'Unsubmit failed');
  }
}


function closeWorkInstructionsView(fromPopstate) {
  const view = ById('work-instructions-view');
  const cwLayout = document.querySelector('.classwork-layout') || document.querySelector('.cw-layout');
  if (view) view.style.display = 'none';
  if (cwLayout) cwLayout.style.display = '';
  S.currentInstructionWork = null;

  document.body.classList.remove('work-instructions-standalone');
  document.documentElement.classList.remove('work-instructions-standalone');

  if (document.body.classList.contains('work-standalone-page')) {
    document.body.classList.remove('work-standalone-page');
    document.documentElement.classList.remove('work-standalone-page');
    if (!fromPopstate && window.history.state?.workInstructionsPage) {
      try { window.history.back(); } catch {}
    }
  }

  const cwFab = ById('classwork-mobile-fab');
  if (cwFab && S.activeTab === 'classwork' && window.innerWidth <= 768) {
    cwFab.style.setProperty('display', 'inline-flex', 'important');
  }
}

function switchWorkInstTab(tab) {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const isStudent = document.body.classList.contains('student-mode') ||
                    S.isStudent ||
                    (user?.role === 'STUDENT') ||
                    (Array.isArray(user?.roles) && user.roles.includes('STUDENT')) ||
                    window.location.pathname.startsWith('/student');

  if (isStudent) {
    tab = 'instructions';
  }

  const panes = ['instructions', 'roster'];
  panes.forEach(t => {
    const pane = ById('pane-work-' + t);
    const btn = ById('btn-inst-tab-' + t);
    if (pane) pane.style.display = (t === tab) ? 'block' : 'none';
    if (btn) {
      btn.classList.toggle('active', t === tab);
      btn.setAttribute('aria-selected', t === tab ? 'true' : 'false');
    }
  });

  // Toggle visibility of sticky bottom comment bar (only visible on mobile screens <= 768px on Instructions tab)
  const bottomBar = ById('work-inst-bottom-bar');
  if (bottomBar) {
    const isMobile = window.innerWidth <= 768;
    bottomBar.style.display = (!isStudent && isMobile && tab === 'instructions') ? '' : 'none';
  }

  S.workInstActiveTab = tab;
}

function openEditWorkFromInstructions() {
  if (!S.currentInstructionWork) return;
  const { type, id } = S.currentInstructionWork;
  closeWorkInstDropdown();
  openWorkEditPage(type, id);
}

function toggleWorkInstMoreMenu(event) {
  if (event) event.stopPropagation();
  const dd = ById('work-inst-dropdown');
  if (!dd) return;
  const isShown = dd.style.display === 'block';
  closeAllWorkCardMenus();
  dd.style.display = isShown ? 'none' : 'block';
}

function closeWorkInstDropdown() {
  const dd = ById('work-inst-dropdown');
  if (dd) dd.style.display = 'none';
}

function deleteWorkFromInstructions() {
  if (!S.currentInstructionWork) return;
  const { type, id } = S.currentInstructionWork;
  closeWorkInstDropdown();
  closeWorkInstructionsView();
  setTimeout(() => delWork(type, id), 120);
}

async function loadWorkInstRoster(id, type) {
  const content = ById('work-roster-content');
  if (!content) return;
  content.innerHTML = `<div class="work-roster-loading">Loading student roster…</div>`;

  try {
    const isTest = type === 'test';
    let data = null;

    if (isTest) {
      const sr = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/tests/' + id + '/scores');
      const scoreMap = {};
      (sr.data || []).forEach(s => { scoreMap[s.student_id] = s; });
      const testObj = S.tests.find(t => t.id === id);
      const roster = (S.members || []).map((m, idx) => {
        const sc = scoreMap[m.student_id];
        const hasGraded = sc && sc.marks_obtained !== null && sc.marks_obtained !== undefined;
        return {
          student_id: m.student_id,
          class_roll_no: m.class_roll_no || (idx + 1),
          full_name: m.full_name,
          official_enrollment_no: m.official_enrollment_no,
          is_submitted: Boolean(hasGraded),
          status: hasGraded ? 'GRADED' : 'PENDING',
          submitted_at: sc?.updated_at || null,
          marks_obtained: sc?.marks_obtained,
          documents: []
        };
      });
      const subCount = roster.filter(r => r.is_submitted).length;
      data = {
        assignment_id: id,
        title: testObj?.name || 'Class Test',
        type: 'EXAM',
        total_students: roster.length,
        submitted_count: subCount,
        not_submitted_count: roster.length - subCount,
        roster
      };
    } else {
      const res = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/assignments/' + id + '/submissions');
      data = res.data;
    }

    S.expandedRosters[id] = { data, filter: 'all' };
    renderWorkInstRoster(id);

    // Update badge
    const badge = ById('inst-sub-count-badge');
    if (badge && data) badge.textContent = (data.submitted_count || 0) + '/' + (data.total_students || 0);

    // Update stat counters on the card too
    const statSub = ById('stat-sub-' + id);
    const statPend = ById('stat-pend-' + id);
    if (statSub && data) statSub.textContent = data.submitted_count;
    if (statPend && data) statPend.textContent = data.not_submitted_count;
  } catch (err) {
    if (content) content.innerHTML = `<div class="work-roster-error">Failed to load roster: ${esc(err.message)}</div>`;
  }
}

function renderWorkInstRoster(id) {
  const state = S.expandedRosters[id];
  if (!state) return;
  const { data, filter } = state;
  const content = ById('work-roster-content');
  if (!content) return;

  const roster = data.roster || [];
  const filtered = roster.filter(s => {
    if (filter === 'submitted') return s.is_submitted;
    if (filter === 'notsubmitted') return !s.is_submitted;
    return true;
  });

  const tot = data.total_students || roster.length;
  const sub = data.submitted_count || 0;
  const unSub = data.not_submitted_count || 0;

  content.innerHTML = `
    <div class="work-roster-summary-row">
      <button class="work-roster-filter-btn ${!filter || filter === 'all' ? 'active' : ''}"
        onclick="filterWorkInstRoster(${id}, 'all')">All (${tot})</button>
      <button class="work-roster-filter-btn ${filter === 'submitted' ? 'active' : ''}"
        onclick="filterWorkInstRoster(${id}, 'submitted')">Handed in (${sub})</button>
      <button class="work-roster-filter-btn ${filter === 'notsubmitted' ? 'active' : ''}"
        onclick="filterWorkInstRoster(${id}, 'notsubmitted')">Assigned (${unSub})</button>
    </div>
    <div class="work-roster-list">
      ${filtered.length === 0
        ? `<div class="work-roster-empty">No students in this filter.</div>`
        : filtered.map((s, idx) => `
          <div class="work-roster-row ${s.is_submitted ? 'is-submitted' : ''}">
            <div class="work-roster-roll">${s.class_roll_no || (idx + 1)}</div>
            <div class="work-roster-avatar">${(s.full_name || 'S').charAt(0).toUpperCase()}</div>
            <div class="work-roster-name-wrap">
              <div class="work-roster-name">${esc(s.full_name || 'Student')}</div>
              <div class="work-roster-enroll">${esc(s.official_enrollment_no || '')}</div>
            </div>
            <div class="work-roster-status-col">
              ${s.is_submitted
                ? `<span class="work-roster-status-chip submitted">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    ${s.marks_obtained !== undefined && s.marks_obtained !== null ? s.marks_obtained + ' marks' : 'Submitted'}
                  </span>`
                : `<span class="work-roster-status-chip pending">Assigned</span>`
              }
            </div>
          </div>
        `).join('')
      }
    </div>
  `;
}

function filterWorkInstRoster(id, filter) {
  if (S.expandedRosters[id]) {
    S.expandedRosters[id].filter = filter;
    renderWorkInstRoster(id);
  }
}

function getWorkComments(workId) {
  try {
    const raw = localStorage.getItem('vidya_work_comments_' + workId);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveWorkComment(workId, commentObj) {
  try {
    const list = getWorkComments(workId);
    list.push(commentObj);
    localStorage.setItem('vidya_work_comments_' + workId, JSON.stringify(list));
    return list;
  } catch {}
  return [commentObj];
}

function submitWorkInstActiveComment(source) {
  if (!S.currentInstructionWork) return;
  const { id, type } = S.currentInstructionWork;
  submitWorkInstComment(id, type, source);
}

function submitWorkInstComment(id, type, source) {
  const inlineInp = ById('work-inst-comment-input-' + id);
  const bottomInp = ById('work-inst-bottom-comment-input');
  const targetInp = (source === 'desktop' ? inlineInp : (bottomInp && bottomInp.value.trim() ? bottomInp : inlineInp)) || inlineInp || bottomInp;
  if (!targetInp || !targetInp.value.trim()) return;
  const text = targetInp.value.trim();

  // Clear inputs
  if (inlineInp) inlineInp.value = '';
  if (bottomInp) bottomInp.value = '';

  const user = typeof getCurrentUser === 'function' ? (getCurrentUser() || S.user || {}) : (S.user || {});
  const isStudent = document.body.classList.contains('student-mode') || S.isStudent;
  const authorName = user.full_name || user.name || (isStudent ? 'Student' : 'Faculty');
  const authorRole = user.role || (isStudent ? 'student' : 'faculty');

  const commentObj = {
    id: Date.now(),
    author: authorName,
    role: authorRole,
    text,
    time: 'Just now',
    avatar: (authorName.charAt(0) || (isStudent ? 'S' : 'F')).toUpperCase(),
    created_at: new Date().toISOString()
  };

  const item = S.currentInstructionWork?.item;
  if (item) {
    if (!item._comments) item._comments = [];
    item._comments.push(commentObj);
  }

  // Persist to local storage
  saveWorkComment(id, commentObj);

  const list = ById('work-inst-comments-list-' + id);
  if (list) {
    const div = document.createElement('div');
    div.className = 'work-inst-comment-item';
    div.innerHTML = `
      <div class="work-inst-comment-avatar">${esc(commentObj.avatar)}</div>
      <div class="work-inst-comment-body">
        <div class="work-inst-comment-author">${esc(commentObj.author)}</div>
        <div class="work-inst-comment-text">${esc(commentObj.text)}</div>
        <div class="work-inst-comment-time">${esc(commentObj.time)}</div>
      </div>
    `;
    const placeholder = list.querySelector('.work-inst-no-comments') || list.querySelector('div[style]');
    if (placeholder) placeholder.remove();
    list.appendChild(div);
    try { div.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch {}
  }
  showToast('Comment posted');
}

function renderWorkSubmissionsPanel(id) {
  const state = S.expandedRosters[id];
  if (!state) return;
  const { data, filter } = state;
  const pane = ById('work-expand-pane-' + id);
  if (!pane) return;

  const roster = data.roster || [];
  const filtered = roster.filter(s => {
    if (filter === 'submitted') return s.is_submitted;
    if (filter === 'notsubmitted') return !s.is_submitted;
    return true;
  });

  const tot = data.total_students || roster.length;
  const sub = data.submitted_count || 0;
  const unSub = data.not_submitted_count || 0;

  pane.innerHTML = `
    <div class="expand-filter-bar">
      <div style="font-size:0.85rem;font-weight:700;color:var(--text-main);display:flex;align-items:center;gap:0.4rem">
        ${GD_ICONS.users}
        <span>Student Submissions Roster</span>
      </div>
      <div class="expand-filter-btns">
        <button type="button" class="expand-filter-btn ${filter === 'all' ? 'active' : ''}" onclick="filterSubmissionsRoster(${id}, 'all')">
          <span>All Students</span>
          <span class="badge-count">${tot}</span>
        </button>
        <button type="button" class="expand-filter-btn ${filter === 'submitted' ? 'active' : ''}" onclick="filterSubmissionsRoster(${id}, 'submitted')">
          <span>Submitted</span>
          <span class="badge-count">${sub}</span>
        </button>
        <button type="button" class="expand-filter-btn ${filter === 'notsubmitted' ? 'active' : ''}" onclick="filterSubmissionsRoster(${id}, 'notsubmitted')">
          <span>Not Submitted</span>
          <span class="badge-count">${unSub}</span>
        </button>
      </div>
    </div>

    <div style="overflow-x:auto">
      <table class="expand-roster-table">
        <thead>
          <tr>
            <th style="width:40px;text-align:center">#</th>
            <th style="width:65px">Roll</th>
            <th style="min-width:160px">Student Name</th>
            <th style="width:120px">Status</th>
            <th style="width:140px">Submitted On</th>
            <th>Submitted Document(s)</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length === 0 ? `
            <tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--text-muted)">No students match this filter.</td></tr>
          ` : filtered.map((st, idx) => {
            const roll = String(st.class_roll_no || (idx + 1)).replace(/^#/, '');
            const subDate = st.submitted_at ? new Date(st.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
            const statusBadge = st.is_submitted
              ? `<span class="badge" style="background:var(--status-present-bg);color:var(--status-present);border:1px solid var(--status-present);font-weight:700;padding:0.2rem 0.5rem;border-radius:var(--radius-sm);font-size:0.75rem">Submitted</span>`
              : `<span class="badge" style="background:var(--status-absent-bg);color:var(--status-absent);border:1px solid var(--status-absent);font-weight:700;padding:0.2rem 0.5rem;border-radius:var(--radius-sm);font-size:0.75rem">Not Submitted</span>`;

            let docsHtml = '';
            if (st.documents && st.documents.length > 0) {
              docsHtml = st.documents.map(d => `
                <a href="${esc(d.file_path)}" target="_blank" class="doc-link-pill" title="Click to view/download ${esc(d.requirement_name || d.original_filename)}">
                  ${GD_ICONS.file}
                  <span>${esc(d.requirement_name || d.original_filename || 'Document')}</span>
                </a>
              `).join(' ');
            } else if (st.is_submitted && st.marks_obtained !== null && st.marks_obtained !== undefined) {
              docsHtml = `<span style="font-weight:700;color:var(--color-primary)">Scored ${st.marks_obtained} pts</span>`;
            } else {
              docsHtml = `<span style="color:var(--text-muted);font-size:0.78rem">No document uploaded</span>`;
            }

            return `
              <tr>
                <td style="text-align:center;font-weight:600;color:var(--text-muted)">${idx + 1}</td>
                <td style="font-family:var(--font-family-mono);font-weight:700">${esc(roll)}</td>
                <td style="font-weight:700;color:var(--text-main)">${esc(st.full_name)}</td>
                <td>${statusBadge}</td>
                <td style="font-size:0.76rem;color:var(--text-muted)">${subDate}</td>
                <td>${docsHtml}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function filterSubmissionsRoster(id, filterMode) {
  if (!S.expandedRosters[id]) return;
  S.expandedRosters[id].filter = filterMode;
  renderWorkSubmissionsPanel(id);
}

// Dual Marks Tables in Marks Workspace (Tests & Assignments)
function renderAllMarksTables() {
  const testsCount = (S.tests || []).length;
  const assignCount = (S.assignments || []).length;
  const membersCount = (S.members || []).length;

  if (ById('kpi-tests')) ById('kpi-tests').textContent = testsCount;
  if (ById('kpi-assignments')) ById('kpi-assignments').textContent = assignCount;
  if (ById('kpi-students')) ById('kpi-students').textContent = membersCount;
  if (ById('tab-marks-count')) ById('tab-marks-count').textContent = testsCount + assignCount;
  if (ById('badge-marks-all-count')) ById('badge-marks-all-count').textContent = testsCount + assignCount;
  if (ById('badge-marks-tests-count')) ById('badge-marks-tests-count').textContent = testsCount;
  if (ById('badge-marks-assign-count')) ById('badge-marks-assign-count').textContent = assignCount;
  if (ById('badge-tests-count')) ById('badge-tests-count').textContent = testsCount + (testsCount === 1 ? ' test' : ' tests');
  if (ById('badge-assign-count')) ById('badge-assign-count').textContent = assignCount + (assignCount === 1 ? ' item' : ' items');

  // Mobile section counts & parentheses (Image 4 & 5)
  if (ById('badge-tests-count-paren')) ById('badge-tests-count-paren').textContent = '(' + testsCount + ')';
  if (ById('badge-tests-mobile-count')) ById('badge-tests-mobile-count').textContent = testsCount + ' ' + (testsCount === 1 ? 'Test' : 'Tests');
  if (ById('badge-assign-count-paren')) ById('badge-assign-count-paren').textContent = '(' + assignCount + ')';
  if (ById('badge-assign-mobile-count')) ById('badge-assign-mobile-count').textContent = assignCount + ' ' + (assignCount === 1 ? 'Item' : 'Items');

  // Mobile mini ticker counts (Image 5)
  if (ById('mob-kpi-tests')) ById('mob-kpi-tests').textContent = testsCount;
  if (ById('mob-kpi-assignments')) ById('mob-kpi-assignments').textContent = assignCount;
  if (ById('mob-kpi-students')) ById('mob-kpi-students').textContent = membersCount;

  // Compute tests average
  let testsAvg = null;
  const scoredTests = (S.tests || []).filter(t => t.avg_score != null);
  if (scoredTests.length > 0) {
    const sum = scoredTests.reduce((acc, t) => acc + (parseFloat(t.avg_score) / (t.max_marks || 20)) * 100, 0);
    testsAvg = Math.round((sum / scoredTests.length) * 10) / 10;
  }
  const avgStr = testsAvg != null ? (testsAvg + '%') : '—';
  if (ById('kpi-avg-score')) ById('kpi-avg-score').textContent = avgStr;
  if (ById('mob-kpi-avg')) ById('mob-kpi-avg').textContent = avgStr;

  // Compute assignments average
  let assignAvg = null;
  const scoredAssigns = (S.assignments || []).filter(a => a.avg_score != null);
  if (scoredAssigns.length > 0) {
    const sum = scoredAssigns.reduce((acc, a) => acc + (parseFloat(a.avg_score) / (a.max_marks || 100)) * 100, 0);
    assignAvg = Math.round((sum / scoredAssigns.length) * 10) / 10;
  }
  if (ById('kpi-assign-avg-score')) ById('kpi-assign-avg-score').textContent = assignAvg != null ? (assignAvg + '%') : '—';

  // Compute pending grading count
  let pendingCount = 0;
  (S.tests || []).forEach(t => {
    if ((t.graded_count || 0) < membersCount) pendingCount++;
  });
  (S.assignments || []).forEach(a => {
    if ((a.graded_count || 0) < membersCount) pendingCount++;
  });
  if (ById('kpi-pending')) ById('kpi-pending').textContent = pendingCount;

  renderMarksTable();
  renderAssignmentMarksTable();
}

function renderMarksTable() {
  const tbody = ById('marks-tests-tbody');
  const mobList = ById('marks-tests-mobile-list');
  if (!tbody && !mobList) return;

  if (!S.tests || !S.tests.length) {
    const emptyHtml = emptyState('test', 'No tests scheduled yet', 'Click Schedule Test to create your first class test.');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2.5rem">' + emptyHtml + '</td></tr>';
    if (mobList) mobList.innerHTML = '<div style="text-align:center;padding:2rem">' + emptyHtml + '</div>';
    return;
  }

  const membersCount = (S.members || []).length;

  // Desktop Table Rows (Image 4): 6 columns (#, TEST NAME, DATE, MAX MARKS, GRADED, ACTIONS)
  if (tbody) {
    tbody.innerHTML = S.tests.map((t, i) => {
      const ds = t.test_date ? new Date(t.test_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';
      const gc = t.graded_count || 0;
      const isGraded = gc > 0;
      const badgeCls = isGraded ? 'marks-graded-badge is-graded' : 'marks-graded-badge';
      const ij = JSON.stringify(t).replace(/"/g, '&quot;');
      const maxMarks = t.max_marks || 20;

      return '<tr>' +
        '<td style="font-weight:700;color:var(--text-muted);text-align:center">' + (i + 1) + '</td>' +
        '<td style="font-weight:700;color:var(--text-main)">' + esc(t.name || t.title || 'Test') + '</td>' +
        '<td style="color:var(--text-muted);font-size:0.85rem">' + ds + '</td>' +
        '<td style="font-weight:700;font-family:var(--font-family-mono)">' + maxMarks + '</td>' +
        '<td><span class="' + badgeCls + '">' + gc + '/' + membersCount + '</span></td>' +
        '<td style="text-align:right;white-space:nowrap">' +
          '<button class="btn-enter-marks-action" onclick="openMarksModal(' + ij + ')">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' +
            '<span>Enter Marks</span>' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  // Mobile Cards List (Image 5)
  if (mobList) {
    mobList.innerHTML = S.tests.map((t) => {
      const ds = t.test_date ? new Date(t.test_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';
      const gc = t.graded_count || 0;
      const isGraded = gc > 0;
      const badgeCls = isGraded ? 'marks-graded-badge is-graded' : 'marks-graded-badge';
      const ij = JSON.stringify(t).replace(/"/g, '&quot;');
      const maxMarks = t.max_marks || 20;

      return '<div class="marks-mobile-item" data-search-text="' + esc((t.name || t.title || '') + ' ' + ds).toLowerCase() + '">' +
        '<div class="marks-mobile-item-top">' +
          '<div class="marks-mobile-item-title">' + esc(t.name || t.title || 'Test') + '</div>' +
          '<button class="btn-enter-marks-action mob-btn" onclick="openMarksModal(' + ij + ')">' +
            '<span>Enter Marks</span>' +
          '</button>' +
        '</div>' +
        '<div class="marks-mobile-item-meta">' + ds + ' &bull; ' + maxMarks + ' Max Marks</div>' +
        '<div class="marks-mobile-item-status">' +
          '<span class="' + badgeCls + '">' + gc + '/' + membersCount + ' Graded</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }
}

function renderAssignmentMarksTable() {
  const tbody = ById('marks-assignments-tbody');
  const mobList = ById('marks-assignments-mobile-list');
  if (!tbody && !mobList) return;

  if (!S.assignments || !S.assignments.length) {
    const emptyHtml = emptyState('assignment', 'No assignments or coursework created yet', 'Click + New Assignment to publish your first coursework item.');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2.5rem">' + emptyHtml + '</td></tr>';
    if (mobList) mobList.innerHTML = '<div style="text-align:center;padding:2rem">' + emptyHtml + '</div>';
    return;
  }

  const membersCount = (S.members || []).length;

  // Desktop Table Rows (Image 4): 8 columns
  if (tbody) {
    tbody.innerHTML = S.assignments.map((a, i) => {
      const rawType = (a.type || 'ASSIGNMENT').toUpperCase();
      const typeLabel = rawType === 'FINAL_DOCS' ? 'Final Docs' : (rawType === 'PRACTICAL' ? 'Lab Practical' : 'Assignment');
      const typePillClass = rawType === 'FINAL_DOCS' ? 'finaldocs' : (rawType === 'PRACTICAL' ? 'practical' : 'assignment');
      const dd = a.due_date ? new Date(a.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No due date';
      const subCount = a.submission_count || 0;
      const gradedCount = a.graded_count || 0;
      const maxMarks = a.max_marks || 100;
      const isGraded = gradedCount > 0;
      const badgeCls = isGraded ? 'marks-graded-badge is-graded' : 'marks-graded-badge';
      const ij = JSON.stringify(a).replace(/"/g, '&quot;');

      return '<tr>' +
        '<td style="font-weight:700;color:var(--text-muted);text-align:center">' + (i + 1) + '</td>' +
        '<td>' +
          '<div style="font-weight:700;color:var(--text-main)">' + esc(a.title || 'Coursework') + '</div>' +
          (a.description ? '<div style="font-size:0.75rem;color:var(--text-muted);max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(a.description) + '</div>' : '') +
        '</td>' +
        '<td><span class="work-type-pill ' + typePillClass + '" style="font-size:0.7rem;padding:0.15rem 0.5rem;border-radius:var(--radius-pill);font-weight:700">' + typeLabel + '</span></td>' +
        '<td style="font-size:0.8rem;color:var(--text-muted)">' + dd + '</td>' +
        '<td style="font-weight:700;font-family:var(--font-family-mono)">' + maxMarks + '</td>' +
        '<td><span style="font-weight:600">' + subCount + '</span><span style="color:var(--text-muted);font-size:0.78rem">/' + membersCount + '</span></td>' +
        '<td><span class="' + badgeCls + '">' + gradedCount + '/' + membersCount + '</span></td>' +
        '<td style="text-align:right;white-space:nowrap">' +
          '<button class="btn-enter-marks-action" onclick="openAssignmentMarksModal(' + ij + ')">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' +
            '<span>Enter Marks</span>' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  // Mobile Cards List (Image 5 style for assignments)
  if (mobList) {
    mobList.innerHTML = S.assignments.map((a) => {
      const rawType = (a.type || 'ASSIGNMENT').toUpperCase();
      const typeLabel = rawType === 'FINAL_DOCS' ? 'Final Docs' : (rawType === 'PRACTICAL' ? 'Lab Practical' : 'Assignment');
      const typePillClass = rawType === 'FINAL_DOCS' ? 'finaldocs' : (rawType === 'PRACTICAL' ? 'practical' : 'assignment');
      const dd = a.due_date ? new Date(a.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No due date';
      const gradedCount = a.graded_count || 0;
      const maxMarks = a.max_marks || 100;
      const isGraded = gradedCount > 0;
      const badgeCls = isGraded ? 'marks-graded-badge is-graded' : 'marks-graded-badge';
      const ij = JSON.stringify(a).replace(/"/g, '&quot;');

      return '<div class="marks-mobile-item" data-search-text="' + esc((a.title || '') + ' ' + dd + ' ' + typeLabel).toLowerCase() + '">' +
        '<div class="marks-mobile-item-top">' +
          '<div class="marks-mobile-item-title">' + esc(a.title || 'Coursework') + '</div>' +
          '<button class="btn-enter-marks-action mob-btn" onclick="openAssignmentMarksModal(' + ij + ')">' +
            '<span>Enter Marks</span>' +
          '</button>' +
        '</div>' +
        '<div class="marks-mobile-item-meta">' + dd + ' &bull; ' + maxMarks + ' Max Marks</div>' +
        '<div class="marks-mobile-item-status" style="display:flex;justify-content:space-between;align-items:center">' +
          '<span class="work-type-pill ' + typePillClass + '" style="font-size:0.68rem;padding:0.12rem 0.45rem;border-radius:var(--radius-pill);font-weight:700">' + typeLabel + '</span>' +
          '<span class="' + badgeCls + '">' + gradedCount + '/' + membersCount + ' Graded</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }
}

function filterMarksCategory(cat) {
  ['all', 'tests', 'assignments'].forEach(c => {
    const btn = ById('btn-marks-cat-' + c);
    if (btn) btn.classList.toggle('active', c === cat);
  });
  const secTests = ById('marks-tests-section');
  const secAssign = ById('marks-assignments-section');
  if (secTests) secTests.style.display = (cat === 'all' || cat === 'tests') ? '' : 'none';
  if (secAssign) secAssign.style.display = (cat === 'all' || cat === 'assignments') ? '' : 'none';
}

function filterAllMarks(q) {
  const term = (q || '').toLowerCase();
  // Filter desktop tables
  document.querySelectorAll('#marks-tests-tbody tr').forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
  document.querySelectorAll('#marks-assignments-tbody tr').forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
  // Filter mobile cards
  document.querySelectorAll('#marks-tests-mobile-list .marks-mobile-item').forEach(card => {
    const text = card.getAttribute('data-search-text') || card.textContent.toLowerCase();
    card.style.display = text.includes(term) ? '' : 'none';
  });
  document.querySelectorAll('#marks-assignments-mobile-list .marks-mobile-item').forEach(card => {
    const text = card.getAttribute('data-search-text') || card.textContent.toLowerCase();
    card.style.display = text.includes(term) ? '' : 'none';
  });
}

function filterMarksTable(q) {
  filterAllMarks(q);
}

// Marks Entry Modal Functions
S.currentTestQuestions = [];
S.currentTestInstructions = [];
S.cachedTestScores = {};
S.marksColumnsVisibility = { srNo: false, enrollmentNo: false, registrationNo: false };

const DEFAULT_TEST_INSTRUCTIONS = [
  "All questions are compulsory.",
  "Write your Roll Number and Name clearly.",
  "Check question marks against each column.",
  "Neat handwriting and clear steps expected."
];

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 150);
}

function toggleMarksColFilterMenu(e) {
  if (e) e.stopPropagation();
  const dd = ById('marks-col-filter-dropdown');
  if (!dd) return;
  const isOpen = dd.style.display === 'block';
  closeAllMarksDropdowns();
  dd.style.display = isOpen ? 'none' : 'block';
}

function toggleMarksExportMenu(e) {
  if (e) e.stopPropagation();
  const dd = ById('marks-export-dropdown');
  if (!dd) return;
  const isOpen = dd.style.display === 'block';
  closeAllMarksDropdowns();
  dd.style.display = isOpen ? 'none' : 'block';
}

function closeAllMarksDropdowns() {
  const ddFilter = ById('marks-col-filter-dropdown');
  const ddExport = ById('marks-export-dropdown');
  if (ddFilter) ddFilter.style.display = 'none';
  if (ddExport) ddExport.style.display = 'none';
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('#marks-col-filter-wrapper') && !e.target.closest('#marks-export-wrapper')) {
    closeAllMarksDropdowns();
  }
});

function toggleMarksColumn(colKey, isChecked) {
  if (!S.marksColumnsVisibility) S.marksColumnsVisibility = {};
  S.marksColumnsVisibility[colKey] = Boolean(isChecked);
  updateColumnsVisibilityUI();
  renderMarksEntryTable(true);
}

function updateColumnsVisibilityUI() {
  const vis = S.marksColumnsVisibility || {};
  const chkSr = ById('chk-show-sr');
  const chkEnroll = ById('chk-show-enroll');
  const chkReg = ById('chk-show-reg');
  if (chkSr) chkSr.checked = Boolean(vis.srNo);
  if (chkEnroll) chkEnroll.checked = Boolean(vis.enrollmentNo);
  if (chkReg) chkReg.checked = Boolean(vis.registrationNo);

  const activeCount = (vis.srNo ? 1 : 0) + (vis.enrollmentNo ? 1 : 0) + (vis.registrationNo ? 1 : 0);
  const cntEl = ById('marks-col-filter-count');
  if (cntEl) {
    cntEl.textContent = activeCount;
    cntEl.style.display = activeCount > 0 ? 'inline-block' : 'none';
  }
}

function updateModalInstruction(idx, text) {
  if (S.currentTestInstructions && S.currentTestInstructions[idx] !== undefined) {
    S.currentTestInstructions[idx] = text.trim();
  }
}

function addModalInstruction() {
  if (!S.currentTestInstructions) S.currentTestInstructions = [];
  S.currentTestInstructions.push("New instruction (click to edit)");
  renderMarksEntryTable(true);
}

function removeModalInstruction(idx) {
  if (!S.currentTestInstructions || S.currentTestInstructions.length <= 1) return;
  S.currentTestInstructions.splice(idx, 1);
  renderMarksEntryTable(true);
}

function updateModalQuestionText(qIdx, text) {
  if (S.currentTestQuestions && S.currentTestQuestions[qIdx]) {
    S.currentTestQuestions[qIdx].text = text.trim();
  }
}

function toggleModalStudentAbsent(sid) {
  if (!S.cachedTestScores[sid]) {
    S.cachedTestScores[sid] = { student_id: sid, is_absent: false };
  }
  const cur = Boolean(S.cachedTestScores[sid].is_absent);
  S.cachedTestScores[sid].is_absent = !cur;
  recalcStudentTotal(sid);
  renderMarksEntryTable(true);
}

async function openMarksModal(test) {
  S.currentTest = test;
  if (ById('marks-modal-title')) {
    ById('marks-modal-title').textContent = (test.name || test.title || 'Unit Test');
  }
  const ds = test.test_date ? new Date(test.test_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '15 Oct 2026';
  if (ById('marks-modal-meta')) {
    ById('marks-modal-meta').textContent = `Max Marks: ${test.max_marks || 20} • ${ds}`;
  }
  let userInitials = 'DS';
  try {
    const u = (typeof getUser === 'function') ? getUser() : JSON.parse(localStorage.getItem('user') || '{}');
    const name = u.full_name || u.name || u.username || '';
    if (name) {
      const parts = name.trim().split(/\s+/);
      userInitials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
    }
  } catch {}
  const avatarEl = ById('marks-modal-user-avatar');
  if (avatarEl) avatarEl.textContent = userInitials;

  let scores = {};
  let attMeta = null;
  try {
    const sr = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/tests/' + test.id + '/scores');
    (sr.data || []).forEach(s => { scores[s.student_id] = s; });
    attMeta = sr.meta || null;
  } catch {}
  S.cachedTestScores = scores;

  // Digital Register Attendance Correlation Banner
  const attBanner = ById('marks-register-att-banner');
  if (attBanner) {
    if (attMeta && attMeta.attendance_session_found) {
      attBanner.style.display = 'flex';
      const textEl = ById('marks-register-att-text');
      const countEl = ById('marks-register-att-count');
      if (textEl) {
        textEl.textContent = `Digital Register: Attendance checked on exam date (${attMeta.test_date || ''}). Absent students are automatically marked AB.`;
      }
      if (countEl) {
        countEl.textContent = `${attMeta.absent_from_register_count || 0} Absent`;
      }
    } else {
      attBanner.style.display = 'none';
    }
  }

  let initialQuestions = null;
  const firstSavedQuestions = Object.values(scores).find(s => Array.isArray(s.questions) && s.questions.length > 0)?.questions;
  if (firstSavedQuestions && firstSavedQuestions.length > 0) {
    initialQuestions = firstSavedQuestions;
  } else if (test.questions) {
    try {
      initialQuestions = typeof test.questions === 'string' ? JSON.parse(test.questions) : test.questions;
    } catch {}
  }

  if (Array.isArray(initialQuestions) && initialQuestions.length > 0) {
    S.currentTestQuestions = initialQuestions.map((q, idx) => ({
      num: idx + 1,
      label: q.label || ('Q' + (idx + 1)),
      max: Number(q.max) || Math.round(((Number(test.max_marks) || 20) / initialQuestions.length) * 10) / 10,
      text: q.text || ''
    }));
  } else {
    const firstQScore = Object.values(scores).find(s => Array.isArray(s.question_scores) && s.question_scores.length > 0)?.question_scores;
    const qCount = firstQScore ? firstQScore.length : (Number(test.num_questions) || (test.max_marks >= 25 ? 5 : (test.max_marks >= 20 ? 4 : (test.max_marks >= 10 ? 2 : 1))));
    const marksPerQ = Math.max(1, Math.round(((Number(test.max_marks) || 20) / qCount) * 10) / 10);
    S.currentTestQuestions = [];
    for (let i = 1; i <= qCount; i++) {
      S.currentTestQuestions.push({ num: i, label: 'Q' + i, max: marksPerQ, text: '' });
    }
  }

  let initialInstructions = null;
  if (test.instructions) {
    try {
      initialInstructions = typeof test.instructions === 'string' ? JSON.parse(test.instructions) : test.instructions;
    } catch {}
  }
  if (!Array.isArray(initialInstructions) || initialInstructions.length === 0) {
    const firstSavedInst = Object.values(scores).find(s => Array.isArray(s.instructions) && s.instructions.length > 0)?.instructions;
    if (firstSavedInst && firstSavedInst.length > 0) initialInstructions = firstSavedInst;
  }
  S.currentTestInstructions = (Array.isArray(initialInstructions) && initialInstructions.length > 0) ? [...initialInstructions] : [...DEFAULT_TEST_INSTRUCTIONS];

  if (!S.marksColumnsVisibility) {
    S.marksColumnsVisibility = { srNo: false, enrollmentNo: false, registrationNo: false };
  }
  updateColumnsVisibilityUI();

  const totalMax = S.currentTestQuestions.reduce((s, q) => s + (Number(q.max) || 0), 0);
  const ftMax = ById('marks-footer-max');
  if (ftMax) ftMax.textContent = test.max_marks || totalMax || 20;

  const isMobileScreen = window.innerWidth < 768;
  const savedMode = localStorage.getItem('vidyaos_marks_view_mode');
  if (isMobileScreen) {
    S.marksViewMode = 'table';
  } else if (savedMode === 'excel' || savedMode === 'table') {
    S.marksViewMode = savedMode;
  } else {
    S.marksViewMode = (window.innerWidth >= 900) ? 'excel' : 'table';
  }
  updateViewModeUI();
  renderMarksEntryTable(false);
  openModal('modal-enter-marks');
  if (isMobileScreen) {
    document.body.classList.add('marks-standalone-page');
    document.documentElement.classList.add('marks-standalone-page');
    try {
      window.history.pushState({ marksPage: true }, '');
    } catch {}
  }
}

window.addEventListener('popstate', (e) => {
  if (document.body.classList.contains('marks-standalone-page')) {
    closeModal('modal-enter-marks');
  }
  const editPage = ById('work-edit-page-view');
  if (editPage && editPage.style.display !== 'none') {
    closeWorkEditPage(true);
    return;
  }
  if (document.body.classList.contains('work-standalone-page')) {
    closeWorkInstructionsView(true);
  }
});

document.addEventListener('click', () => {
  closeWorkInstDropdown();
});

function setMarksModalView(mode) {
  S.marksViewMode = (mode === 'excel') ? 'excel' : 'table';
  updateViewModeUI();
  renderMarksEntryTable(true);
}

function updateViewModeUI() {
  const btnExcel = ById('btn-view-excel');
  const btnTable = ById('btn-view-table');
  if (btnExcel) btnExcel.classList.toggle('active', S.marksViewMode === 'excel');
  if (btnTable) btnTable.classList.toggle('active', S.marksViewMode === 'table');
}

function saveCurrentViewAsDefault() {
  localStorage.setItem('vidyaos_marks_view_mode', S.marksViewMode);
  toast((S.marksViewMode === 'excel' ? 'Excel Sheet' : 'Normal Table') + ' saved as default view!');
  const btn = ById('btn-set-default-view');
  if (btn) {
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:0.35rem"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--status-present)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Saved as Default</span></span>';
    setTimeout(() => {
      if (btn) btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:0.35rem"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span>Set as Default</span></span>';
    }, 2200);
  }
}

function addModalQuestion() {
  const nextNum = S.currentTestQuestions.length + 1;
  const testMax = Number(S.currentTest?.max_marks) || 20;
  const defaultPerQ = Math.max(1, Math.round((testMax / nextNum) * 10) / 10);
  S.currentTestQuestions.push({ num: nextNum, label: 'Q' + nextNum, max: defaultPerQ, text: '' });
  renderMarksEntryTable(true);
}

function removeModalQuestion() {
  if (S.currentTestQuestions.length <= 1) return;
  S.currentTestQuestions.pop();
  renderMarksEntryTable(true);
}

function extractUnitTestNumber(title) {
  if (!title) return 'Unit Test';
  const str = String(title).trim();
  const m = str.match(/^(?:Unit\s*Test|Test|UT)\s*\d+/i);
  if (m) return m[0].replace(/^UT\s*/i, 'Unit Test ').replace(/^Test\s*/i, 'Unit Test ');
  const parts = str.split(/[—–\:\-]/);
  if (parts.length > 1 && parts[0].trim().length > 0) return parts[0].trim();
  return str;
}

function getSessionStorageKey(sessionKey) {
  const k = sessionKey ? String(sessionKey).replace(/[^a-zA-Z0-9]/g, '_') : 'current';
  return `vidyaos_inst_header_session_${k}`;
}

function getGlobalInstituteHeader(sessionKey) {
  const defaultHeader = 'Uttarakhand Government Institute of Polytechnic, Nainital | Internal Evaluation Sheet 2026 Session';
  const key = getSessionStorageKey(sessionKey);
  return localStorage.getItem(key) || localStorage.getItem('vidyaos_institution_marks_header') || defaultHeader;
}

function updateGlobalInstituteHeader(newText, sessionKey) {
  const clean = (newText || '').trim().replace(/\s+/g, ' ');
  if (!clean) return;
  const key = getSessionStorageKey(sessionKey);
  localStorage.setItem(key, clean);
  localStorage.setItem('vidyaos_institution_marks_header', clean);

  if (typeof apiFetch === 'function') {
    const ayId = S.group?.academic_year_id;
    apiFetch('/api/v1/faculty/session-header', {
      method: 'PUT',
      body: JSON.stringify({ header: clean, academic_year_id: ayId })
    }).catch(() => {});
  }

  document.querySelectorAll('.excel-editable-inst-header').forEach(el => {
    if (el.innerText !== clean) el.innerText = clean;
  });
  toast('Institution header updated for this session across all sheets!');
}

function renderMarksEntryTable(preserveInputs = false) {
  const table = ById('marks-entry-table');
  const thead = ById('marks-entry-thead');
  const tbody = ById('marks-entry-tbody');
  const tfoot = ById('marks-entry-tfoot');
  if (!table || !thead || !tbody) return;

  const totalMax = S.currentTestQuestions.reduce((sum, q) => sum + (Number(q.max) || 0), 0);
  if (ById('marks-footer-max')) ById('marks-footer-max').textContent = totalMax;
  if (ById('btn-remove-q')) ById('btn-remove-q').disabled = S.currentTestQuestions.length <= 1;

  const savedInputValues = {};
  if (preserveInputs) {
    document.querySelectorAll('.q-score-input').forEach(inp => {
      const sid = inp.getAttribute('data-student');
      const q = inp.getAttribute('data-q');
      if (!savedInputValues[sid]) savedInputValues[sid] = {};
      savedInputValues[sid][q] = inp.value;
    });
  }

  const test = S.currentTest || {};
  const g = S.group || {};
  const sessionKey = g.academic_year_id || g.academic_year_label || '2026';
  const deptCode = esc(g.department_code || '');
  const deptName = esc(g.department_name || (g.department_code ? `Dept of ${g.department_code}` : 'Department'));
  const subName = esc(g.subject_name || g.name || 'Subject');
  const yr = g.semester ? Math.ceil(g.semester / 2) : 1;
  const sem = g.semester || 1;
  const rawTitle = test.name || test.title || 'Unit Test';
  const unitTestOnly = esc(extractUnitTestNumber(rawTitle));
  const testDate = test.test_date ? new Date(test.test_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const instHeader = esc(getGlobalInstituteHeader(sessionKey));

  const showSr = Boolean(S.marksColumnsVisibility?.srNo);
  const showEnroll = Boolean(S.marksColumnsVisibility?.enrollmentNo);
  const showReg = Boolean(S.marksColumnsVisibility?.registrationNo);
  const extraCols = (showSr ? 1 : 0) + (showEnroll ? 1 : 0) + (showReg ? 1 : 0);

  const tableViewport = ById('marks-table-viewport');
  if (tableViewport) tableViewport.style.display = 'block';

  if (S.marksViewMode === 'excel') {
    table.className = 'excel-table sheet-table data-subtable';
      const totalCols = 4 + extraCols + S.currentTestQuestions.length;

      thead.innerHTML = `
        <tr class="excel-hdr-blue row-1">
          <th colspan="${totalCols}" style="padding:0.4rem 0.75rem">
            <div style="display:flex;align-items:center;justify-content:center;gap:0.45rem;position:relative">
              <h3 class="excel-editable-inst-header"
                  contenteditable="true"
                  spellcheck="false"
                  title="Click to edit institute header (changes sync automatically across all tests & registers in this session)"
                  onblur="updateGlobalInstituteHeader(this.innerText, '${sessionKey}')"
                  onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
                  style="margin:0;font-size:1.02rem;font-weight:700;letter-spacing:0.02em;color:var(--text-main);outline:none;cursor:text;padding:0.15rem 0.5rem;border-radius:var(--radius-sm);border:1px dashed transparent;transition:all 0.15s ease"
                  onfocus="this.style.borderColor='var(--color-primary)';this.style.background='var(--bg-card)';"
              >${instHeader}</h3>
              <span title="Click text to edit header. Automatically updates all tests." style="cursor:pointer;display:inline-flex;align-items:center;opacity:0.75;" onclick="const h=this.previousElementSibling;if(h)h.focus()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </span>
            </div>
          </th>
        </tr>
        <tr class="excel-hdr-blue row-2">
          <th colspan="${totalCols}">
            Internal Evaluation - ${unitTestOnly} | Subject : ${subName}
          </th>
        </tr>
        <tr class="excel-hdr-blue row-3">
          <th colspan="${totalCols}">
            ${deptCode ? deptCode + ' ' : (deptName ? deptName + ' ' : '')}Year ${yr} | Semester ${sem}
          </th>
        </tr>
        <tr class="excel-hdr-tan">
          ${showSr ? '<th rowspan="2" style="width:48px;vertical-align:middle">SR. NO.</th>' : ''}
          <th rowspan="2" style="width:75px;vertical-align:middle">ROLL NO.</th>
          ${showEnroll ? '<th rowspan="2" style="width:115px;vertical-align:middle">ENROLLMENT NO.</th>' : ''}
          ${showReg ? '<th rowspan="2" style="width:115px;vertical-align:middle">REGISTRATION NO.</th>' : ''}
          <th rowspan="2" style="min-width:180px;vertical-align:middle">STUDENT NAME</th>
          <th colspan="${S.currentTestQuestions.length}">${unitTestOnly} (Total Marks : ${totalMax})</th>
          <th style="width:75px">Total</th>
          <th style="min-width:320px">Unit Test Details (Mode : OFFLINE)</th>
        </tr>
        <tr class="excel-hdr-sub">
          ${S.currentTestQuestions.map(q => `
            <th style="min-width:54px;font-weight:800">
              <span>${esc(q.label)}</span><br>
              <span style="font-size:0.72rem;font-weight:600;opacity:0.85">( ${q.max} )</span>
            </th>
          `).join('')}
          <th style="font-weight:800">(${totalMax})</th>
          <th style="font-size:0.74rem;font-weight:700;padding:0.35rem 0.6rem;text-align:center">
            Maximum Marks : ${totalMax} | Date : ${testDate}
          </th>
        </tr>
      `;

      if (!S.members.length) {
        tbody.innerHTML = `<tr><td colspan="${totalCols}" style="text-align:center;padding:2rem;color:var(--text-muted)">No students enrolled in this group.</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
      }

      tbody.innerHTML = S.members.map((m, rIdx) => {
        const ex = S.cachedTestScores[m.student_id] || {};
        const isAb = Boolean(ex.is_absent);
        let qTds = '';
        S.currentTestQuestions.forEach((q, qIdx) => {
          let val = '';
          if (preserveInputs && savedInputValues[m.student_id]?.[qIdx] !== undefined) {
            val = savedInputValues[m.student_id][qIdx];
          } else if (Array.isArray(ex.question_scores) && ex.question_scores[qIdx] !== undefined && ex.question_scores[qIdx] !== null) {
            val = ex.question_scores[qIdx];
          } else if (!preserveInputs && ex.marks_obtained != null && S.currentTestQuestions.length === 1 && qIdx === 0) {
            val = ex.marks_obtained;
          }
          qTds += `<td><input type="number" class="sheet-cell-input q-score-input" id="q-${m.student_id}-${qIdx}" data-student="${m.student_id}" data-q="${qIdx}" min="0" max="${q.max}" step="0.5" value="${isAb ? 0 : val}" ${isAb ? 'disabled' : ''} placeholder="0" oninput="recalcStudentTotal(${m.student_id})"></td>`;
        });

        const rollStr = String(m.class_roll_no || (rIdx + 1)).replace(/^#/, '');

        const sideDetailsTd = (rIdx === 0) ? `
          <td rowspan="${S.members.length}" style="vertical-align:top;background:var(--bg-card);text-align:left;padding:0.75rem;font-size:0.75rem;line-height:1.55;color:var(--text-muted);border:1px solid var(--border-color)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.35rem">
              <strong style="color:var(--text-main);font-size:0.8rem">Instructions:</strong>
              <button type="button" onclick="addModalInstruction()" style="background:none;border:none;color:var(--color-primary);font-size:0.72rem;font-weight:700;cursor:pointer;padding:0" title="Add an instruction line">+ Add Line</button>
            </div>
            <ol class="sheet-instructions-box" style="margin:0 0 0.75rem 1.2rem;padding:0;font-size:0.75rem;color:var(--text-muted)">
              ${S.currentTestInstructions.map((ins, iIdx) => `
                <li style="margin-bottom:0.25rem">
                  <span contenteditable="true"
                        spellcheck="false"
                        title="Click to edit instruction"
                        onblur="updateModalInstruction(${iIdx}, this.innerText)"
                        style="outline:none;border-bottom:1px dashed transparent;transition:border-color 0.15s ease"
                        onfocus="this.style.borderBottomColor='var(--color-primary)'">${esc(ins)}</span>
                  ${S.currentTestInstructions.length > 1 ? `<span onclick="removeModalInstruction(${iIdx})" style="cursor:pointer;margin-left:4px;color:var(--text-muted);opacity:0.6;font-size:0.75rem" title="Remove this line">&times;</span>` : ''}
                </li>
              `).join('')}
            </ol>

            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.35rem">
              <strong style="color:var(--text-main);font-size:0.8rem">Questions Breakdown:</strong>
              <button type="button" onclick="openEditQuestionsModal()" style="background:none;border:none;color:var(--color-primary);font-size:0.72rem;font-weight:700;cursor:pointer;padding:0" title="Edit questions and marks distribution">Edit Questions</button>
            </div>
            <div style="font-size:0.75rem;line-height:1.5">
              ${S.currentTestQuestions.map((q, qIdx) => `
                <div style="margin-bottom:0.35rem;display:flex;align-items:flex-start;gap:0.3rem">
                  <strong style="white-space:nowrap">${esc(q.label)}:</strong>
                  <span contenteditable="true"
                        spellcheck="false"
                        title="Click to edit question statement / topic"
                        onblur="updateModalQuestionText(${qIdx}, this.innerText)"
                        style="flex:1;outline:none;border-bottom:1px dashed var(--border-color);padding:0 2px"
                        onfocus="this.style.borderBottomColor='var(--color-primary)'">${esc(q.text || ('(Click to set topic)'))}</span>
                  <strong style="white-space:nowrap;color:var(--color-primary)">(${q.max} pts)</strong>
                </div>
              `).join('')}
            </div>

            <div style="margin-top:0.75rem;color:var(--status-absent);font-weight:700;font-size:0.74rem">
              NOTE : All marked as AB were absent.
            </div>

            <div style="margin-top:0.75rem;padding:0.4rem;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.72rem;display:flex;align-items:center;gap:0.35rem">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span>Totals calculate automatically as marks are entered.</span>
            </div>
          </td>
        ` : '';

        return `
          <tr class="${isAb ? 'is-absent' : ''}" style="${isAb ? 'background:var(--status-absent-bg);' : ''}">
            ${showSr ? `<td class="excel-cell-sr">${rIdx + 1}</td>` : ''}
            <td class="cell-roll">${esc(rollStr)}</td>
            ${showEnroll ? `<td style="font-family:var(--font-family-mono);font-size:0.74rem;text-align:center">${esc(m.official_enrollment_no || '--')}</td>` : ''}
            ${showReg ? `<td style="font-family:var(--font-family-mono);font-size:0.74rem;text-align:center">${esc(m.registration_no || '--')}</td>` : ''}
            <td class="cell-student-name">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:0.4rem">
                <span style="font-weight:700;color:var(--text-main)">${esc(m.full_name)}</span>
                <button type="button" 
                        class="btn-sheet-att-toggle ${isAb ? 'is-absent' : ''}" 
                        onclick="toggleModalStudentAbsent(${m.student_id})" 
                        title="${isAb ? 'Marked Absent. Click to mark Present' : 'Click to mark Absent'}"
                        style="font-size:0.7rem;padding:0.12rem 0.4rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--bg-surface);color:${isAb ? 'var(--status-absent)' : 'var(--text-muted)'};cursor:pointer;font-weight:700">
                  ${isAb ? 'AB' : 'P'}
                </button>
              </div>
            </td>
            ${qTds}
            <td><span id="tot-${m.student_id}" class="excel-cell-total" style="${isAb ? 'color:var(--status-absent);font-weight:800' : ''}">${isAb ? '0 (AB)' : '--'}</span></td>
            ${sideDetailsTd}
          </tr>
        `;
      }).join('');

      if (tfoot) {
        tfoot.innerHTML = `
          <tr>
            <th colspan="${1 + extraCols + 1 + 1}" style="text-align:right;padding:.5rem .75rem;background:var(--bg-surface);font-weight:800;border:1px solid var(--border-color)">
              Average of the class (Only present students)
            </th>
            <th colspan="${S.currentTestQuestions.length + 1}" style="background:var(--bg-surface);font-weight:800;color:var(--color-primary);text-align:center;border:1px solid var(--border-color)" id="excel-class-avg">
              -- / ${totalMax}
            </th>
            <th style="background:var(--bg-surface);font-size:.76rem;color:var(--text-muted);text-align:center;border:1px solid var(--border-color)" id="excel-class-tally">
              Total: ${S.members.length} Students
            </th>
          </tr>
        `;
      }

    } else {
      table.className = 'marks-table minimal-marks-table';
      if (tfoot) tfoot.innerHTML = '';

      thead.innerHTML = `
        <tr id="marks-table-header-row">
          ${showSr ? '<th class="col-sr" style="width:36px;position:sticky;top:0;z-index:10;background:var(--bg-surface)">SR</th>' : ''}
          <th class="col-roll col-student-hdr" style="width:32px;position:sticky;top:0;left:0;z-index:20;background:var(--bg-surface)">
            <span class="desktop-text">Roll</span>
            <span class="mobile-text">R.N</span>
          </th>
          ${showEnroll ? '<th class="col-enroll" style="width:115px;position:sticky;top:0;z-index:10;background:var(--bg-surface)">Enrollment No.</th>' : ''}
          ${showReg ? '<th class="col-reg" style="width:115px;position:sticky;top:0;z-index:10;background:var(--bg-surface)">Reg No.</th>' : ''}
          <th class="col-name" style="position:sticky;top:0;left:32px;z-index:18;background:var(--bg-surface)">
            <span class="desktop-text">Student Name</span>
            <span class="mobile-text">STUDENT</span>
          </th>
          <th class="col-att-hdr" style="width:32px;text-align:center;position:sticky;top:0;z-index:10;background:var(--bg-surface)">P</th>
          ${S.currentTestQuestions.map(q => `
            <th class="col-q" style="text-align:center;position:sticky;top:0;z-index:10;background:var(--bg-surface)">
              <span class="q-hdr-label">${esc(q.label)}</span>
              <span class="q-hdr-max desktop-text" style="font-size:.68rem;color:var(--text-muted);display:block;font-weight:normal">/${q.max}</span>
            </th>
          `).join('')}
          <th class="col-total" style="text-align:right;background:var(--bg-surface);font-weight:700;color:var(--text-muted);position:sticky;top:0;right:0;z-index:20;padding-right:0.75rem">
            TOTAL
          </th>
        </tr>
      `;

      if (!S.members.length) {
        tbody.innerHTML = `<tr><td colspan="${S.currentTestQuestions.length + 4 + extraCols}" style="text-align:center;padding:1.5rem;color:var(--text-muted)">No students enrolled.</td></tr>`;
        return;
      }

      tbody.innerHTML = S.members.map((m, rIdx) => {
        const ex = S.cachedTestScores[m.student_id] || {};
        const isAb = Boolean(ex.is_absent);
        let qTds = '';
        S.currentTestQuestions.forEach((q, qIdx) => {
          let val = '';
          if (preserveInputs && savedInputValues[m.student_id]?.[qIdx] !== undefined) {
            val = savedInputValues[m.student_id][qIdx];
          } else if (Array.isArray(ex.question_scores) && ex.question_scores[qIdx] !== undefined && ex.question_scores[qIdx] !== null) {
            val = ex.question_scores[qIdx];
          } else if (!preserveInputs && ex.marks_obtained != null && S.currentTestQuestions.length === 1 && qIdx === 0) {
            val = ex.marks_obtained;
          }
          const displayVal = (val !== '' && val !== null && val !== undefined) ? val : 0;
          qTds += `<td class="cell-q-score" style="text-align:center"><input type="number" inputmode="decimal" class="minimal-q-input marks-input-cell q-score-input" id="q-${m.student_id}-${qIdx}" data-student="${m.student_id}" data-q="${qIdx}" min="0" max="${q.max}" step="0.5" value="${isAb ? 0 : displayVal}" ${isAb ? 'disabled' : ''} placeholder="0" onfocus="this.select()" oninput="recalcStudentTotal(${m.student_id})"></td>`;
        });

        const rollNum = parseInt(String(m.class_roll_no || (rIdx + 1)).replace(/^#/, ''), 10);
        const rollStr = !isNaN(rollNum) ? String(rollNum).padStart(2, '0') : String(m.class_roll_no || (rIdx + 1)).replace(/^#/, '');

        return `
          <tr class="${isAb ? 'is-absent' : ''}" style="${isAb ? 'background:var(--status-absent-bg);' : ''}">
            ${showSr ? `<td class="cell-sr" style="font-weight:700;color:var(--text-muted)">${rIdx + 1}</td>` : ''}
            <td class="cell-roll cell-roll-minimal">${esc(rollStr)}</td>
            ${showEnroll ? `<td class="cell-enroll" style="font-family:var(--font-family-mono);font-size:0.75rem">${esc(m.official_enrollment_no || '--')}</td>` : ''}
            ${showReg ? `<td class="cell-reg" style="font-family:var(--font-family-mono);font-size:0.75rem">${esc(m.registration_no || '--')}</td>` : ''}
            <td class="cell-student-name cell-name-minimal">
              <div class="student-name-flex">
                <span class="student-name-text">${esc(m.full_name)}</span>
              </div>
            </td>
            <td class="cell-att cell-att-minimal" style="text-align:center">
              <button type="button" 
                      class="btn-sheet-att-toggle minimal-att-dot ${isAb ? 'is-absent' : 'is-present'}" 
                      onclick="toggleModalStudentAbsent(${m.student_id})" 
                      title="${isAb ? 'Marked Absent. Click to mark Present' : 'Click to mark Absent'}"
                      aria-label="${isAb ? 'Absent' : 'Present'}">
              </button>
            </td>
            ${qTds}
            <td class="cell-total cell-total-minimal"><span id="tot-${m.student_id}" class="auto-total-badge minimal-total-text ${isAb ? 'is-absent' : ''}">${isAb ? '0/' + totalMax : '0/' + totalMax}</span></td>
          </tr>
        `;
      }).join('');
    }

  S.members.forEach(m => recalcStudentTotal(m.student_id));
}

function recalcStudentTotal(sid) {
  const isAb = Boolean(S.cachedTestScores[sid]?.is_absent);
  let sum = 0;
  let hasAny = false;
  document.querySelectorAll(`.q-score-input[data-student="${sid}"]`).forEach(inp => {
    const v = parseFloat(inp.value);
    if (!isNaN(v)) {
      sum += v;
      hasAny = true;
    }
  });

  const totEl = ById('tot-' + sid);
  const totalMax = S.currentTestQuestions.reduce((s, q) => s + (Number(q.max) || 0), 0);
  if (totEl) {
    if (isAb) {
      totEl.textContent = `0/${totalMax}`;
      totEl.classList.add('is-absent');
      totEl.style.color = 'var(--status-absent)';
      totEl.style.borderColor = 'transparent';
      totEl.title = 'Student marked Absent';
    } else {
      totEl.classList.remove('is-absent');
      const rounded = Math.round(sum * 10) / 10;
      totEl.textContent = `${hasAny ? rounded : 0}/${totalMax}`;
      if (hasAny && sum > totalMax) {
        totEl.style.color = 'var(--status-absent)';
        totEl.style.borderColor = 'var(--status-absent)';
        totEl.title = 'Total exceeds maximum marks (' + totalMax + ')';
      } else {
        totEl.style.color = 'var(--text-muted)';
        totEl.style.borderColor = 'transparent';
        totEl.title = '';
      }
    }
  }

  const mCard = ById('m-card-' + sid);
  if (mCard) {
    mCard.classList.toggle('is-absent', isAb);
  }

  const avgEl = ById('excel-class-avg');
  const tallyEl = ById('excel-class-tally');
  const allScores = [];
  let presentCount = 0;
  let absentCount = 0;

  S.members.forEach(m => {
    const mAbsent = Boolean(S.cachedTestScores[m.student_id]?.is_absent);
    if (mAbsent) {
      absentCount++;
    } else {
      presentCount++;
      let sTot = 0, sHas = false;
      document.querySelectorAll(`.q-score-input[data-student="${m.student_id}"]`).forEach(inp => {
        const v = parseFloat(inp.value);
        if (!isNaN(v)) { sTot += v; sHas = true; }
      });
      if (sHas) allScores.push(sTot);
    }
  });

  if (avgEl) {
    if (allScores.length > 0) {
      const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      avgEl.textContent = (Math.round(avg * 10) / 10) + ' / ' + totalMax;
    } else {
      avgEl.textContent = '-- / ' + totalMax;
    }
  }

  if (tallyEl) {
    tallyEl.innerHTML = `P: <strong>${presentCount}</strong> | AB: <strong style="color:var(--status-absent)">${absentCount}</strong> | Tot: <strong>${S.members.length}</strong>`;
  }
}

// ==========================================
// Question Editor Modal Engine (Mobile & Desktop)
// ==========================================
S.editingTestQuestions = [];

function openEditQuestionsModal() {
  if (!S.currentTestQuestions || S.currentTestQuestions.length === 0) {
    const test = S.currentTest || {};
    const testMax = Number(test.max_marks) || 20;
    let initialQuestions = null;
    if (test.questions) {
      try {
        initialQuestions = typeof test.questions === 'string' ? JSON.parse(test.questions) : test.questions;
      } catch {}
    }
    if (Array.isArray(initialQuestions) && initialQuestions.length > 0) {
      S.currentTestQuestions = initialQuestions.map((q, idx) => ({
        num: idx + 1,
        label: q.label || ('Q' + (idx + 1)),
        max: Number(q.max) || Math.round((testMax / initialQuestions.length) * 10) / 10,
        text: q.text || ''
      }));
    } else {
      const qCount = Math.max(1, Number(test.num_questions) || (testMax >= 25 ? 5 : (testMax >= 20 ? 4 : (testMax >= 10 ? 2 : 1))));
      const marksPerQ = Math.max(0.5, Math.round((testMax / qCount) * 10) / 10);
      S.currentTestQuestions = [];
      for (let i = 1; i <= qCount; i++) {
        S.currentTestQuestions.push({ num: i, label: 'Q' + i, max: marksPerQ, text: '' });
      }
    }
  }
  S.editingTestQuestions = S.currentTestQuestions.map((q, i) => ({
    num: i + 1,
    label: q.label || ('Q' + (i + 1)),
    max: Number(q.max) || 5,
    text: q.text || ''
  }));
  renderEditQuestionRows();
  openModal('modal-edit-questions');
}

function renderEditQuestionRows() {
  const container = ById('edit-questions-rows-container');
  if (!container) return;
  const totalMax = S.editingTestQuestions.reduce((s, q) => s + (Number(q.max) || 0), 0);
  const roundedMax = Math.round(totalMax * 10) / 10;
  if (ById('edit-q-total-max')) ById('edit-q-total-max').textContent = roundedMax;

  container.innerHTML = S.editingTestQuestions.map((q, idx) => `
    <div class="edit-q-row">
      <div class="edit-q-row-top">
        <div class="edit-q-badge-wrap">
          <span class="edit-q-row-label">${esc(q.label)}</span>
        </div>
        <div class="edit-q-meta-wrap">
          <div class="edit-q-marks-pill">
            <span class="edit-q-marks-tag">Marks:</span>
            <input type="number" min="0.5" max="500" step="0.5" class="edit-q-row-marks" value="${q.max}" onchange="updateEditQuestionMarks(${idx}, this.value)" title="Max marks for ${esc(q.label)}">
            <span class="edit-q-pts-tag">pts</span>
          </div>
          <button type="button" class="edit-q-del-btn" onclick="removeEditQuestionRow(${idx})" ${S.editingTestQuestions.length <= 1 ? 'disabled' : ''} title="Delete question">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="edit-q-row-bottom">
        <textarea rows="2" class="edit-q-row-text" placeholder="Question topic or description (e.g., Relational Algebra, SQL Joins, Triggers)..." oninput="updateEditQuestionText(${idx}, this.value)">${esc(q.text || '')}</textarea>
      </div>
    </div>
  `).join('');
}

function updateEditQuestionText(idx, val) {
  if (S.editingTestQuestions[idx]) {
    S.editingTestQuestions[idx].text = val;
  }
}

function updateEditQuestionMarks(idx, val) {
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) {
    toast('Please enter a valid positive number');
    renderEditQuestionRows();
    return;
  }
  if (S.editingTestQuestions[idx]) {
    S.editingTestQuestions[idx].max = Math.round(num * 10) / 10;
  }
  const totalMax = S.editingTestQuestions.reduce((s, q) => s + (Number(q.max) || 0), 0);
  if (ById('edit-q-total-max')) ById('edit-q-total-max').textContent = Math.round(totalMax * 10) / 10;
}

function addEditQuestionRow() {
  const nextNum = S.editingTestQuestions.length + 1;
  const defaultPerQ = S.editingTestQuestions.length > 0 ? S.editingTestQuestions[0].max : 5;
  S.editingTestQuestions.push({
    num: nextNum,
    label: 'Q' + nextNum,
    max: defaultPerQ,
    text: ''
  });
  renderEditQuestionRows();
}

function removeEditQuestionRow(idx) {
  if (S.editingTestQuestions.length <= 1) return;
  S.editingTestQuestions.splice(idx, 1);
  S.editingTestQuestions.forEach((q, i) => {
    q.num = i + 1;
    q.label = 'Q' + (i + 1);
  });
  renderEditQuestionRows();
}

function distributeEditQuestionsEvenly() {
  if (!S.editingTestQuestions.length) return;
  const currentTotal = S.editingTestQuestions.reduce((s, q) => s + (Number(q.max) || 0), 0) || Number(S.currentTest?.max_marks) || 20;
  const perQ = Math.round((currentTotal / S.editingTestQuestions.length) * 10) / 10;
  S.editingTestQuestions.forEach(q => { q.max = perQ; });
  renderEditQuestionRows();
}

async function saveEditedQuestions() {
  if (!S.editingTestQuestions || S.editingTestQuestions.length === 0) {
    toast('At least one question is required');
    return;
  }
  const newTotalMax = Math.round(S.editingTestQuestions.reduce((s, q) => s + (Number(q.max) || 0), 0) * 10) / 10;
  S.currentTestQuestions = S.editingTestQuestions.map((q, i) => ({
    num: i + 1,
    label: q.label || ('Q' + (i + 1)),
    max: Number(q.max) || 5,
    text: q.text || ''
  }));

  if (S.currentTest) {
    S.currentTest.questions = JSON.stringify(S.currentTestQuestions);
    S.currentTest.max_marks = newTotalMax;
  }

  try {
    await apiFetch(`/api/v1/teaching-groups/${S.groupId}/tests/${S.currentTest.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        questions: S.currentTestQuestions,
        max_marks: newTotalMax
      })
    });
  } catch (err) {
    console.warn('Could not persist question update immediately to backend:', err.message);
  }

  closeModal('modal-edit-questions');
  renderMarksEntryTable(true);
  toast('Questions updated! (' + S.currentTestQuestions.length + ' questions, ' + newTotalMax + ' marks total)');
}

async function exportGroupTestMarks(format) {
  closeAllMarksDropdowns();
  const test = S.currentTest;
  if (!test) return;
  const g = S.group || {};
  const sessionKey = g.academic_year_id || g.academic_year_label || '2026';
  const instHeader = getGlobalInstituteHeader(sessionKey);
  const sessionLabel = g.academic_year_label ? `Internal Evaluation Sheet ${g.academic_year_label}` : 'Internal Evaluation Sheet 2026 Session';
  const totalMax = S.currentTestQuestions.reduce((s, q) => s + (Number(q.max) || 0), 0);

  const roster = S.members.map((m, rIdx) => {
    const isAb = Boolean(S.cachedTestScores[m.student_id]?.is_absent);
    const qScores = S.currentTestQuestions.map((q, qIdx) => {
      const inp = document.getElementById(`q-${m.student_id}-${qIdx}`);
      const v = inp ? parseFloat(inp.value) : null;
      return isAb ? 0 : (isNaN(v) || v === null ? 0 : v);
    });
    const total = isAb ? 0 : qScores.reduce((a, b) => a + b, 0);
    return {
      student_id: m.student_id,
      class_roll_no: String(m.class_roll_no || (rIdx + 1)).replace(/^#/, ''),
      official_enrollment_no: m.official_enrollment_no || '',
      registration_no: m.registration_no || '',
      full_name: m.full_name,
      is_absent: isAb,
      question_scores: qScores,
      marks_obtained: isAb ? 0 : (Math.round(total * 10) / 10)
    };
  });

  const payload = {
    institution_name: instHeader,
    session_label: sessionLabel,
    department_name: g.department_name || '',
    department_code: g.department_code || '',
    subject_name: g.subject_name || test.name || 'Subject',
    year: g.semester ? Math.ceil(g.semester / 2) : 1,
    semester: g.semester || 1,
    title: test.name || test.title || 'Unit Test',
    max_marks: totalMax,
    exam_date: test.test_date || new Date().toISOString().slice(0, 10),
    duration: '50 minutes',
    mode: 'OFFLINE',
    questions: S.currentTestQuestions,
    instructions: S.currentTestInstructions,
    question_texts: S.currentTestQuestions.map(q => `${q.label}: ${q.text || ''}`),
    roster
  };

  const btn = ById('btn-marks-export');
  const origHtml = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '<span style="opacity:0.8">Exporting...</span>';

  try {
    const res = await fetch(`/api/v1/teaching-groups/${S.groupId}/tests/${test.id}/export/${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${typeof getToken === 'function' ? getToken() : ''}`
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to export marksheet');
    const blob = await res.blob();
    const safeTitle = (payload.title || 'Unit_Test').replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = format === 'pdf' ? 'pdf' : (format === 'doc' || format === 'docx' || format === 'word' ? 'doc' : 'xlsx');
    downloadBlob(blob, `${safeTitle}_Marksheet.${ext}`);
    toast(`Marksheet exported as ${ext.toUpperCase()} successfully!`);
  } catch (err) {
    toast('Export failed: ' + err.message);
  } finally {
    if (btn) btn.innerHTML = origHtml;
  }
}

async function saveMarksEntry() {
  const test = S.currentTest;
  if (!test) return;
  const btn = ById('btn-save-marks-entry');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving...';
  }

  const entries = S.members.map(m => {
    const isAb = Boolean(S.cachedTestScores[m.student_id]?.is_absent);
    const qInputs = document.querySelectorAll(`.q-score-input[data-student="${m.student_id}"]`);
    const qScores = Array.from(qInputs).map(inp => {
      const v = parseFloat(inp.value);
      return isNaN(v) ? null : v;
    });
    const hasAny = qScores.some(v => v !== null);
    const total = hasAny ? qScores.reduce((sum, v) => sum + (v || 0), 0) : null;
    return {
      student_id: m.student_id,
      marks_obtained: isAb ? 0 : (total !== null ? (Math.round(total * 10) / 10) : null),
      is_absent: isAb,
      question_scores: qScores,
      questions: S.currentTestQuestions
    };
  });

  try {
    await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/tests/' + test.id + '/scores', {
      method: 'POST',
      body: JSON.stringify({
        scores: entries,
        questions: S.currentTestQuestions,
        instructions: S.currentTestInstructions
      })
    });
    toast('Marks saved successfully!');
    closeModal('modal-enter-marks');
    await loadTests();
  } catch (e) {
    toast(e.message || 'Failed to save marks');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:middle"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg><span>Save Marks</span>';
    }
  }
}

// ==========================================
// Assignment Marks Entry Modal Engine
// ==========================================
S.currentAssignment = null;
S.cachedAssignmentRoster = [];
S.assignModalFilter = 'all';

async function openAssignmentMarksModal(assign) {
  S.currentAssignment = assign;
  S.assignModalFilter = 'all';
  if (ById('assign-marks-search')) ById('assign-marks-search').value = '';

  const rawType = (assign.type || 'ASSIGNMENT').toUpperCase();
  const typeLabel = rawType === 'FINAL_DOCS' ? 'Final Docs' : (rawType === 'PRACTICAL' ? 'Lab Practical' : 'Assignment');
  const dd = assign.due_date ? new Date(assign.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No due date';
  const maxMarks = assign.max_marks || 100;

  if (ById('assign-marks-modal-title')) {
    ById('assign-marks-modal-title').innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:0.4rem"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      <span>Enter Marks: ${esc(assign.title || 'Assignment')}</span>
    `;
  }

  if (ById('assign-marks-modal-meta')) {
    ById('assign-marks-modal-meta').textContent = `${typeLabel} • Max Marks: ${maxMarks} • Due Date: ${dd}`;
  }

  if (ById('assign-marks-footer-max')) {
    ById('assign-marks-footer-max').textContent = maxMarks;
  }

  openModal('modal-enter-assignment-marks');

  const tbody = ById('assign-marks-entry-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2.5rem"><div class="shimmer" style="height:24px;width:300px;margin:0 auto"></div></td></tr>';
  }

  try {
    const res = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/assignments/' + assign.id + '/submissions');
    const roster = res?.data?.roster || [];
    // Ensure all enrolled group members are represented
    const memberMap = {};
    (S.members || []).forEach((m, idx) => {
      memberMap[m.student_id] = {
        student_id: m.student_id,
        class_roll_no: m.class_roll_no || (idx + 1),
        full_name: m.full_name || m.name,
        official_enrollment_no: m.official_enrollment_no,
        registration_no: m.registration_no,
        is_submitted: false,
        marks_obtained: null,
        is_absent: false,
        feedback: '',
        documents: []
      };
    });
    roster.forEach(r => {
      if (memberMap[r.student_id]) {
        memberMap[r.student_id].submission_id = r.submission_id;
        memberMap[r.student_id].is_submitted = Boolean(r.is_submitted);
        memberMap[r.student_id].submitted_at = r.submitted_at;
        memberMap[r.student_id].marks_obtained = (r.marks_obtained !== undefined && r.marks_obtained !== null) ? Number(r.marks_obtained) : null;
        memberMap[r.student_id].is_absent = (r.submission_status === 'ABSENT' || r.status === 'ABSENT');
        memberMap[r.student_id].feedback = r.feedback || '';
        memberMap[r.student_id].documents = r.documents || [];
      } else {
        memberMap[r.student_id] = {
          student_id: r.student_id,
          class_roll_no: r.class_roll_no || 999,
          full_name: r.full_name,
          official_enrollment_no: r.official_enrollment_no,
          registration_no: r.registration_no,
          submission_id: r.submission_id,
          is_submitted: Boolean(r.is_submitted),
          submitted_at: r.submitted_at,
          marks_obtained: (r.marks_obtained !== undefined && r.marks_obtained !== null) ? Number(r.marks_obtained) : null,
          is_absent: (r.submission_status === 'ABSENT' || r.status === 'ABSENT'),
          feedback: r.feedback || '',
          documents: r.documents || []
        };
      }
    });
    S.cachedAssignmentRoster = Object.values(memberMap).sort((a, b) => (Number(a.class_roll_no) || 9999) - (Number(b.class_roll_no) || 9999));
    renderAssignMarksModalTable();
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--status-absent)">Failed to load assignment submissions roster: ' + esc(err.message) + '</td></tr>';
    }
  }
}

function filterAssignModalStatus(mode) {
  S.assignModalFilter = mode || 'all';
  ['all', 'sub', 'unsub', 'ungraded'].forEach(m => {
    const btn = ById('btn-am-filter-' + m);
    if (btn) btn.classList.toggle('active', (m === 'all' && mode === 'all') || (m === 'sub' && mode === 'submitted') || (m === 'unsub' && mode === 'unsubmitted') || (m === 'ungraded' && mode === 'ungraded'));
  });
  renderAssignMarksModalTable();
}

function filterAssignMarksModalRoster(q) {
  const term = (q || '').toLowerCase();
  document.querySelectorAll('#assign-marks-entry-tbody tr').forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
}

function renderAssignMarksModalTable() {
  const tbody = ById('assign-marks-entry-tbody');
  if (!tbody || !S.currentAssignment) return;

  const roster = S.cachedAssignmentRoster || [];
  const maxMarks = Number(S.currentAssignment.max_marks) || 100;

  const total = roster.length;
  const submitted = roster.filter(s => s.is_submitted).length;
  const unsubmitted = total - submitted;
  const graded = roster.filter(s => s.is_absent || (s.marks_obtained !== null && s.marks_obtained !== undefined)).length;
  const ungraded = total - graded;

  if (ById('am-cnt-all')) ById('am-cnt-all').textContent = total;
  if (ById('am-cnt-sub')) ById('am-cnt-sub').textContent = submitted;
  if (ById('am-cnt-unsub')) ById('am-cnt-unsub').textContent = unsubmitted;
  if (ById('am-cnt-ungraded')) ById('am-cnt-ungraded').textContent = ungraded;
  if (ById('assign-marks-footer-graded')) ById('assign-marks-footer-graded').textContent = `${graded}/${total}`;

  const filtered = roster.filter(s => {
    if (S.assignModalFilter === 'submitted') return s.is_submitted;
    if (S.assignModalFilter === 'unsubmitted') return !s.is_submitted;
    if (S.assignModalFilter === 'ungraded') return !s.is_absent && (s.marks_obtained === null || s.marks_obtained === undefined);
    return true;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No students match this filter criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((st, idx) => {
    const isAb = Boolean(st.is_absent);
    const markVal = (st.marks_obtained !== null && st.marks_obtained !== undefined) ? st.marks_obtained : '';
    const roll = String(st.class_roll_no || (idx + 1)).replace(/^#/, '');

    let subBadge = '';
    if (st.is_submitted) {
      let fileLink = '';
      if (st.documents && st.documents.length > 0) {
        fileLink = st.documents.map(d => `
          <a href="${esc(d.file_path)}" target="_blank" class="doc-link-pill" style="font-size:0.72rem;padding:0.15rem 0.45rem;display:inline-flex;align-items:center;gap:0.3rem" title="View ${esc(d.original_filename || 'document')}">
            ${GD_ICONS.file}
            <span style="max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.requirement_name || d.original_filename || 'File')}</span>
          </a>
        `).join('');
      }
      subBadge = `
        <div style="display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap">
          <span class="badge" style="background:var(--status-present-bg);color:var(--status-present);border:1px solid var(--status-present);font-size:0.72rem;font-weight:700;padding:0.15rem 0.45rem;border-radius:var(--radius-sm)">Submitted</span>
          ${fileLink}
        </div>
      `;
    } else {
      subBadge = `<span class="badge" style="background:var(--status-absent-bg);color:var(--status-absent);border:1px solid var(--status-absent);font-size:0.72rem;font-weight:700;padding:0.15rem 0.45rem;border-radius:var(--radius-sm)">Not Submitted</span>`;
    }

    return `
      <tr class="${isAb ? 'is-absent-row' : ''}" style="${isAb ? 'background:var(--status-absent-bg);opacity:0.9' : ''}">
        <td style="text-align:center;font-weight:700;color:var(--text-muted)">${idx + 1}</td>
        <td style="font-weight:700;font-family:var(--font-family-mono)">${esc(roll)}</td>
        <td>
          <div style="font-weight:700;color:var(--text-main)">${esc(st.full_name)}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);font-family:var(--font-family-mono)">${esc(st.official_enrollment_no || '')}</div>
        </td>
        <td>${subBadge}</td>
        <td style="text-align:center">
          <input type="number" step="0.5" min="0" max="${maxMarks}" class="marks-input-cell assign-score-input"
            data-student="${st.student_id}"
            value="${markVal}"
            placeholder="0-${maxMarks}"
            ${isAb ? 'disabled style="background:var(--bg-surface);color:var(--text-muted);border-color:var(--border-color);"' : ''}
            oninput="onAssignScoreChange(${st.student_id}, this.value)">
        </td>
        <td style="text-align:center">
          <button type="button" class="btn btn-sm"
            onclick="toggleAssignStudentAbsent(${st.student_id})"
            style="font-size:0.72rem;padding:0.2rem 0.55rem;font-weight:800;border-radius:var(--radius-sm);background:${isAb ? 'var(--status-absent)' : 'var(--bg-surface)'};color:${isAb ? 'var(--text-white)' : 'var(--text-muted)'};border:1px solid ${isAb ? 'var(--status-absent)' : 'var(--border-color)'}"
            title="${isAb ? 'Mark Present' : 'Mark Absent (AB)'}">
            ${isAb ? 'AB' : '—'}
          </button>
        </td>
        <td>
          <input type="text" class="form-input assign-remark-input"
            data-student="${st.student_id}"
            value="${esc(st.feedback || '')}"
            placeholder="Feedback / notes…"
            style="padding:0.3rem 0.55rem;font-size:0.8rem;width:100%"
            oninput="onAssignRemarkChange(${st.student_id}, this.value)">
        </td>
      </tr>
    `;
  }).join('');
}

function onAssignScoreChange(sid, val) {
  const st = (S.cachedAssignmentRoster || []).find(s => s.student_id === sid);
  if (!st) return;
  const max = Number(S.currentAssignment?.max_marks) || 100;
  if (val === '' || val === null || val === undefined) {
    st.marks_obtained = null;
  } else {
    let num = parseFloat(val);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > max) num = max;
    st.marks_obtained = num;
  }
  // If score entered, mark as not absent
  if (st.marks_obtained !== null && st.is_absent) {
    st.is_absent = false;
  }
  const total = S.cachedAssignmentRoster.length;
  const graded = S.cachedAssignmentRoster.filter(s => s.is_absent || (s.marks_obtained !== null && s.marks_obtained !== undefined)).length;
  if (ById('assign-marks-footer-graded')) ById('assign-marks-footer-graded').textContent = `${graded}/${total}`;
  if (ById('am-cnt-ungraded')) ById('am-cnt-ungraded').textContent = total - graded;
}

function onAssignRemarkChange(sid, val) {
  const st = (S.cachedAssignmentRoster || []).find(s => s.student_id === sid);
  if (st) st.feedback = val;
}

function toggleAssignStudentAbsent(sid) {
  const st = (S.cachedAssignmentRoster || []).find(s => s.student_id === sid);
  if (!st) return;
  st.is_absent = !st.is_absent;
  if (st.is_absent) {
    st.marks_obtained = null;
  }
  renderAssignMarksModalTable();
}

function bulkMarkAssignNotSubmittedAbsent() {
  (S.cachedAssignmentRoster || []).forEach(st => {
    if (!st.is_submitted) {
      st.is_absent = true;
      st.marks_obtained = null;
    }
  });
  renderAssignMarksModalTable();
  toast('Marked all non-submitted students as Absent (AB).');
}

function bulkFillAssignMaxMarks() {
  const max = Number(S.currentAssignment?.max_marks) || 100;
  let count = 0;
  (S.cachedAssignmentRoster || []).forEach(st => {
    if (!st.is_absent && (st.marks_obtained === null || st.marks_obtained === undefined)) {
      st.marks_obtained = max;
      count++;
    }
  });
  renderAssignMarksModalTable();
  toast(`Filled full marks (${max} pts) for ${count} students.`);
}

async function saveAssignmentMarksEntry() {
  const assign = S.currentAssignment;
  if (!assign) return;
  const btn = ById('btn-save-assign-marks');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin .6s linear infinite;margin-right:4px"></span> Saving...';
  }

  const scores = (S.cachedAssignmentRoster || []).map(st => ({
    student_id: st.student_id,
    marks_obtained: st.is_absent ? null : st.marks_obtained,
    is_absent: Boolean(st.is_absent),
    remarks: st.feedback || ''
  }));

  try {
    await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/assignments/' + assign.id + '/scores', {
      method: 'POST',
      body: JSON.stringify({ scores })
    });
    toast('Assignment marks saved successfully!');
    closeModal('modal-enter-assignment-marks');
    await loadAssignments();
  } catch (err) {
    toast('Failed to save marks: ' + (err.message || 'Server error'));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg><span>Save Assignment Marks</span>';
    }
  }
}

// Bind classwork methods to window
window.loadAssignments = loadAssignments;
window.loadTests = loadTests;
window.updateClassworkNavDot = updateClassworkNavDot;
window.renderCWList = renderCWList;
window.filterCW = filterCW;
window.updateCwFilterCount = updateCwFilterCount;
window.openWorkFilterModal = openWorkFilterModal;
window.selectWorkFilter = selectWorkFilter;
window.toggleCWDrop = toggleCWDrop;
window.closeCWDrop = closeCWDrop;
window.toggleWorkCardMenu = toggleWorkCardMenu;
window.closeAllWorkCardMenus = closeAllWorkCardMenus;
window.handleCardMenuChoice = handleCardMenuChoice;
window.toggleCwFabMenu = toggleCwFabMenu;
window.openCreateAssignmentModal = openCreateAssignmentModal;
window.onAssignNumChange = onAssignNumChange;
window.submitCreateAssignment = submitCreateAssignment;
window.openCreatePracticalModal = openCreatePracticalModal;
window.submitCreatePractical = submitCreatePractical;
window.onTestTypeOrNumChange = onTestTypeOrNumChange;
window.onTestUnitChange = onTestUnitChange;
window.updateScheduleTestQPreview = updateScheduleTestQPreview;
window.openScheduleTestModal = openScheduleTestModal;
window.submitScheduleTest = submitScheduleTest;
window.renderFinalDocRequirements = renderFinalDocRequirements;
window.startEditCreateFinalDocRequirement = startEditCreateFinalDocRequirement;
window.saveCreateFinalDocRequirement = saveCreateFinalDocRequirement;
window.cancelEditCreateFinalDocRequirement = cancelEditCreateFinalDocRequirement;
window.addFinalDocRequirement = addFinalDocRequirement;
window.removeFinalDocRequirement = removeFinalDocRequirement;
window.openFinalDocsModal = openFinalDocsModal;
window.submitCreateFinalDocs = submitCreateFinalDocs;
window.renderEditFinalDocRequirements = renderEditFinalDocRequirements;
window.startEditFinalDocRequirement = startEditFinalDocRequirement;
window.saveEditFinalDocRequirement = saveEditFinalDocRequirement;
window.cancelEditFinalDocRequirement = cancelEditFinalDocRequirement;
window.addEditFinalDocRequirement = addEditFinalDocRequirement;
window.removeEditFinalDocRequirement = removeEditFinalDocRequirement;
window.openEditWorkModal = openEditWorkModal;
window.submitEditWork = submitEditWork;
window.delWork = delWork;
window.confirmDirectDeleteWork = confirmDirectDeleteWork;
window.proceedDeleteStep2 = proceedDeleteStep2;
window.backDeleteStep1 = backDeleteStep1;
window.executeConfirmedDelete = executeConfirmedDelete;
window.toggleWorkSubmissionsExpand = toggleWorkSubmissionsExpand;
window.renderWorkSubmissionsPanel = renderWorkSubmissionsPanel;
window.filterSubmissionsRoster = filterSubmissionsRoster;
window.renderAllMarksTables = renderAllMarksTables;
window.renderMarksTable = renderMarksTable;
window.renderAssignmentMarksTable = renderAssignmentMarksTable;
window.filterMarksCategory = filterMarksCategory;
window.filterAllMarks = filterAllMarks;
window.filterMarksTable = filterMarksTable;
window.openAssignmentMarksModal = openAssignmentMarksModal;
window.filterAssignModalStatus = filterAssignModalStatus;
window.filterAssignMarksModalRoster = filterAssignMarksModalRoster;
window.renderAssignMarksModalTable = renderAssignMarksModalTable;
window.onAssignScoreChange = onAssignScoreChange;
window.onAssignRemarkChange = onAssignRemarkChange;
window.toggleAssignStudentAbsent = toggleAssignStudentAbsent;
window.bulkMarkAssignNotSubmittedAbsent = bulkMarkAssignNotSubmittedAbsent;
window.bulkFillAssignMaxMarks = bulkFillAssignMaxMarks;
window.saveAssignmentMarksEntry = saveAssignmentMarksEntry;
window.downloadBlob = downloadBlob;
window.toggleMarksColFilterMenu = toggleMarksColFilterMenu;
window.toggleMarksExportMenu = toggleMarksExportMenu;
window.closeAllMarksDropdowns = closeAllMarksDropdowns;
window.toggleMarksColumn = toggleMarksColumn;
window.updateColumnsVisibilityUI = updateColumnsVisibilityUI;
window.updateModalInstruction = updateModalInstruction;
window.addModalInstruction = addModalInstruction;
window.removeModalInstruction = removeModalInstruction;
window.updateModalQuestionText = updateModalQuestionText;
window.toggleModalStudentAbsent = toggleModalStudentAbsent;
window.openMarksModal = openMarksModal;
window.setMarksModalView = setMarksModalView;
window.updateViewModeUI = updateViewModeUI;
window.saveCurrentViewAsDefault = saveCurrentViewAsDefault;
window.addModalQuestion = addModalQuestion;
window.removeModalQuestion = removeModalQuestion;
window.extractUnitTestNumber = extractUnitTestNumber;
window.getSessionStorageKey = getSessionStorageKey;
window.getGlobalInstituteHeader = getGlobalInstituteHeader;
window.updateGlobalInstituteHeader = updateGlobalInstituteHeader;
window.renderMarksEntryTable = renderMarksEntryTable;
window.recalcStudentTotal = recalcStudentTotal;
window.exportGroupTestMarks = exportGroupTestMarks;
window.saveMarksEntry = saveMarksEntry;
window.openEditQuestionsModal = openEditQuestionsModal;
window.renderEditQuestionRows = renderEditQuestionRows;
window.updateEditQuestionText = updateEditQuestionText;
window.updateEditQuestionMarks = updateEditQuestionMarks;
window.addEditQuestionRow = addEditQuestionRow;
window.removeEditQuestionRow = removeEditQuestionRow;
window.distributeEditQuestionsEvenly = distributeEditQuestionsEvenly;
window.saveEditedQuestions = saveEditedQuestions;
window.addScheduleTestQuestion = addScheduleTestQuestion;
window.removeScheduleQRow = removeScheduleQRow;
window.autoSplitScheduleQuestions = autoSplitScheduleQuestions;
window.updateScheduleQRowMarks = updateScheduleQRowMarks;
window.updateScheduleQRowText = updateScheduleQRowText;
window.filterCWByUnit = filterCWByUnit;
window.populateUnitDropdowns = populateUnitDropdowns;
window.updateUnitFilterBar = updateUnitFilterBar;
window.openCreateUnitModal = openCreateUnitModal;
window.openEditUnitModal = openEditUnitModal;
window.submitSaveUnit = submitSaveUnit;
window.deleteUnit = deleteUnit;
window.promptAddWorkToUnit = promptAddWorkToUnit;
window.toggleUnitCollapse = toggleUnitCollapse;
window.toggleUnitMenu = toggleUnitMenu;
window.closeAllUnitMenus = closeAllUnitMenus;
window.getGroupSyllabusUnits = getGroupSyllabusUnits;
window.toggleWorkCardExpand = toggleWorkCardExpand;
window.toggleCollapseAllUnits = toggleCollapseAllUnits;
window.openWorkInstructionsView = openWorkInstructionsView;
window.closeWorkInstructionsView = closeWorkInstructionsView;
window.switchWorkInstTab = switchWorkInstTab;
window.openEditWorkFromInstructions = openEditWorkFromInstructions;
window.toggleWorkInstMoreMenu = toggleWorkInstMoreMenu;
window.closeWorkInstDropdown = closeWorkInstDropdown;
window.deleteWorkFromInstructions = deleteWorkFromInstructions;
window.openWorkEditPage = openWorkEditPage;
window.closeWorkEditPage = closeWorkEditPage;
window.formatEditDesc = formatEditDesc;
window.promptAddAttachment = promptAddAttachment;
window.loadWorkInstRoster = loadWorkInstRoster;
window.renderWorkInstRoster = renderWorkInstRoster;
window.filterWorkInstRoster = filterWorkInstRoster;
window.submitWorkInstComment = submitWorkInstComment;
window.submitWorkInstActiveComment = submitWorkInstActiveComment;
window.getWorkComments = getWorkComments;
window.saveWorkComment = saveWorkComment;
window.previewAssignmentDoc = previewAssignmentDoc;
window.formatStudentFileSize = formatStudentFileSize;
window.previewStagedStudentFile = previewStagedStudentFile;
window.handleStudentCancelStagedFile = handleStudentCancelStagedFile;
window.renderStudentYourWorkHtml = renderStudentYourWorkHtml;
window.renderStudentYourWorkSection = renderStudentYourWorkSection;
window.handleStudentWorkFileSelected = handleStudentWorkFileSelected;
window.handleStudentWorkSubmitClick = handleStudentWorkSubmitClick;
window.executeStudentWorkUpload = executeStudentWorkUpload;
window.handleStudentUnsubmitWork = handleStudentUnsubmitWork;

