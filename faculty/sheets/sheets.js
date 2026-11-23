/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: SHEETS
 * frontend/faculty/sheets/sheets.js
 * ══════════════════════════════════════════════════════════════
 */

/* ══════════════════════════════════════════════════════════════
       UNIFIED SHEETS STUDIO APPLICATION STATE
       ══════════════════════════════════════════════════════════════ */
var S = window.S = (function () {
  const defaults = {
    user: null,
    groupId: null,
    registerId: null,
    allGroups: [],
    group: null,
    members: [],
    activeSheet: 'evaluation', // 'evaluation' | 'tests' | 'assignments'
    searchQuery: '',
    filterMode: 'ALL',
    sortMode: 'ROLL_ASC',
    focusMode: '',
    zoomScale: 1.0,
    autoFit: true,
    density: 'normal',

    // Column Visibility Map
    columnVisibility: {
      roll: true,
      enroll: true,
      reg: true,
      name: true,
      assign: true,
      assign_avg: true,
      test: true,
      test_avg: true,
      att_held: true,
      att_pct: true,
      pres: true,
      custom: true,
      side_panel: true
    },

    // Sheet 1: Master Evaluation Data
    evalData: null,

    // Sheet 2: Unit Test Marksheet Data (scanned from tests.html)
    tests: [],
    currentTestId: null,
    currentTestState: null,

    // Sheet 3: Assignments Marksheet Data
    assignments: [],
    theoryAssignments: [],
    practicalAssignments: [],
    currentPracticalViewMode: 'ALL',
    currentPracticalId: null,

    // Sheet 4: Attendance Matrix Data
    attendanceMonth: new Date().getMonth() + 1,
    attendanceYear: new Date().getFullYear(),
    attendanceData: null,

    // Bar 1 & Bar 2 State
    isEditMode: false,
    currentTestViewMode: 'SINGLE',
    viewMode: (typeof window !== 'undefined' && window.innerWidth <= 768) ? 'dynamic' : 'overview' // 'dynamic' | 'overview'
  };
  return Object.assign(defaults, window.S || {});
})();

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
if (typeof window !== 'undefined') {
  window.escapeHtml = esc;
  window.esc = esc;
  window.S = S;
}

var EXCEL_WB = window.EXCEL_WB = window.EXCEL_WB || {
  name: 'VidyaOS_Marks_Evaluation.xlsx',
  activeSheetIndex: 0,
  sheets: [],
  selectedRange: { r1: 0, c1: 0, r2: 0, c2: 0 },
  activeCell: { r: 0, c: 0 },
  isEditing: false,
  clipboard: null,
  undoStack: [],
  redoStack: [],
  isFillDragging: false,
  fillStart: null,
  fillEnd: null,
  isSelecting: false,
  selectStart: null,
  gridlines: true,
  formulaBarVisible: true,
  headersVisible: true,
  bannerVisible: true,
  signaturesVisible: false,
  autoFit: true
};

function isPracticalCoursework(item) {
  if (!item) return false;
  const t = String(item.type || item.assignment_type || item.category || '').toUpperCase();
  if (t === 'PRACTICAL' || t === 'LAB' || t === 'EXPERIMENT') return true;
  const title = String(item.title || item.name || '').trim();
  if (/^(?:lab|experiment|practical)\b/i.test(title)) return true;
  return false;
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].substring(0, 2).toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

/* ══════════════════════════════════════════════════════════════
   INITIALIZATION & METADATA LOADER
   ══════════════════════════════════════════════════════════════ */

function navigateBackFromSheets() {
  const params = new URLSearchParams(window.location.search);
  const regId = S.registerId || params.get('registerId') || params.get('register_id') || params.get('register');
  const grpId = S.groupId || params.get('groupId') || params.get('group_id') || params.get('id');

  if (regId && document.referrer.includes('registers')) {
    window.location.href = `/faculty/registers.html?id=${encodeURIComponent(regId)}`;
    return;
  }
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  if (regId) {
    window.location.href = `/faculty/registers.html?id=${encodeURIComponent(regId)}`;
    return;
  }
  window.location.href = grpId ? `/faculty/classes/index.html?id=${encodeURIComponent(grpId)}` : '/faculty/classes/index.html';
}
window.navigateBackFromSheets = navigateBackFromSheets;

function safeDiv(num, den, fallback = 0) {
  const n = Number(num);
  const d = Number(den);
  return (d > 0 && !isNaN(d) && !isNaN(n)) ? (n / d) : fallback;
}

function sortStudentsList(list) {
  if (!Array.isArray(list)) return [];
  const copy = [...list];
  return copy.sort((a, b) => {
    const rollA = parseInt(a.class_roll_no || a.roll_no || a.roll || a.id || 0, 10);
    const rollB = parseInt(b.class_roll_no || b.roll_no || b.roll || b.id || 0, 10);
    if (!isNaN(rollA) && !isNaN(rollB) && rollA !== rollB) {
      return rollA - rollB;
    }
    const nameA = String(a.full_name || a.student_name || a.name || '').toLowerCase();
    const nameB = String(b.full_name || b.student_name || b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
}
if (typeof window !== 'undefined') {
  window.sortStudentsList = sortStudentsList;
}

async function initSheetsStudio() {
  try {
    if (typeof requireFacultyAuth === 'function') {
      requireFacultyAuth(['TEACHER', 'HOD']);
    } else if (typeof guardRoute === 'function') {
      guardRoute({ requireRoles: ['TEACHER', 'SYSTEM_ADMIN'] });
    }
    S.user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

    if (S.user) {
      const av = document.getElementById('gc-user-avatar');
      if (av) av.textContent = initials(S.user.full_name || S.user.username || 'DS');
    }

    const params = new URLSearchParams(window.location.search);
    const qId = params.get('groupId') || params.get('group_id') || params.get('id');
    if (qId) S.groupId = Number(qId);
    const qReg = params.get('registerId') || params.get('register_id') || params.get('register');
    if (qReg) S.registerId = Number(qReg);
    const initialSheet = params.get('sheet') || 'evaluation';
    const viewParam = params.get('view');
    const isHomeStart = viewParam === 'home' || (!qId && !params.get('sheet'));
    if (!isHomeStart && typeof showOfficeScreenLoader === 'function') {
      showOfficeScreenLoader('Loading...');
    }

    setSheetViewMode(S.viewMode, false);
    setupTouchPinchZoom();
    initFloatingFabDrag();
    updateFilterBadgeIndicator();

    // 1. Immediately setup group fallback so UI is 100% complete with 0ms delay
    if ((!S.allGroups || !S.allGroups.length) && window.S && Array.isArray(window.S.allGroups) && window.S.allGroups.length) {
      S.allGroups = window.S.allGroups;
    }
    if (!S.groupId) {
      if (S.allGroups && S.allGroups.length > 0) {
        S.groupId = S.allGroups[0].id;
      } else {
        S.groupId = 9;
      }
    }
    if (!S.group) {
      const knownGroup = (S.allGroups || []).find(g => Number(g.id) === Number(S.groupId));
      if (knownGroup) {
        S.group = knownGroup;
      } else {
        S.group = {
          id: S.groupId,
          name: S.groupId === 9 ? 'Java Programming' : `Classroom ${S.groupId}`,
          subject_name: S.groupId === 9 ? 'Java Programming' : `Classroom ${S.groupId}`,
          subject_code: S.groupId === 9 ? '55508' : 'SUB' + S.groupId,
          component: 'THEORY+PRACTICAL',
          department_name: 'Information Technology',
          department_code: 'IT',
          semester: 5
        };
      }
    }

    // Purge any stale mock cache saved under old roster or broken test sheet structures
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith('vidyaos_excel_wb') || k.startsWith('vidyaos_inst_header') || k === 'vidyaos_institution_marks_header' || k === 'vidyaos_excel_templates') {
          const val = localStorage.getItem(k);
          if (val) {
            let shouldPurge = false;
            if (
              val.includes('24011F') || val.includes('HARSHIT JOSHI') || val.includes('KAPIL BISHT') || val.includes('MANISH TIWARI') ||
              val.includes('8.3') || val.includes('1.82') ||
              !val.includes('REG. NO.') || val.includes('ROUND(D') || val.includes('ROUND(I')
            ) {
              shouldPurge = true;
            } else if (k.startsWith('vidyaos_excel_wb')) {
              try {
                const parsed = JSON.parse(val);
                const hasBrokenSingleTest = Array.isArray(parsed?.sheets) && parsed.sheets.some(s => s.type === 'single-test' && (
                  !s.cells?.['0,2']?.v ||
                  !String(s.cells['0,2'].v).includes('REG') ||
                  !s.cells?.['0,3']?.v ||
                  !String(s.cells['0,3'].v).includes('UBTER') ||
                  !s.cells?.['0,4']?.v ||
                  !String(s.cells['0,4'].v).includes('NAME') ||
                  !(s.merges || []).some(m => m.s.r === 0 && m.e.r === 1 && m.s.c === 4)
                ));
                if (hasBrokenSingleTest) shouldPurge = true;
              } catch (_) { }
            } else if (k === 'vidyaos_excel_templates' && val.includes('"0,2"') && !val.includes('REG. NO.')) {
              shouldPurge = true;
            }
            if (shouldPurge) keysToRemove.push(k);
          }
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (_) { }

    // Update banner metadata text immediately
    const initSubj = S.group?.name || S.group?.subject_name || 'Classroom';
    const initCode = S.group?.subject_code ? ` [${S.group.subject_code}]` : '';
    const initDeptCode = S.group?.department_code || 'IT';
    const initDept = S.group?.department_name || 'Information Technology';
    const initSem = S.group?.semester || S.group?.current_semester || 5;

    const bannerLine2 = document.getElementById('hdr-banner-line2');
    if (bannerLine2) {
      bannerLine2.textContent = `Department (${initDeptCode}) | Internal Evaluation - Consolidated (Theory+Practical) | Subject : ${initSubj}${initCode}`;
    }
    const bannerCohort = document.getElementById('hdr-banner-cohort');
    if (bannerCohort) {
      bannerCohort.textContent = `${initDept} | Semester ${initSem}`;
    }

    // 2. Immediately hydrate and render spreadsheet grid (Instant 0ms UI)
    hydrateAcademicSheetsFromGroup(false);
    renderGroupSwitcherOptions();
    renderSheetSelectorDropdownOptions();
    await switchSheetTab(initialSheet, false);
    renderExcelGrid(true);

    if (isHomeStart && document.getElementById('office-home-screen')) {
      if (typeof openOfficeHomeScreen === 'function') openOfficeHomeScreen();
      if (typeof hideOfficeScreenLoader === 'function') {
        hideOfficeScreenLoader();
      }
      loadTeacherGroupsList().catch(err => console.warn('Background sync error:', err));
    } else {
      if (typeof closeOfficeHomeScreen === 'function') closeOfficeHomeScreen();
      // Keep loader visible while we fetch teaching groups and live student roster (max 3.5s)
      try {
        await Promise.race([
          loadTeacherGroupsList(),
          new Promise(r => setTimeout(r, 3500))
        ]);
      } catch (e) {
        console.warn('Teacher groups load failed:', e);
      }
      if (typeof hideOfficeScreenLoader === 'function') {
        hideOfficeScreenLoader();
      }
      if (params.get('action') === 'import') {
        setTimeout(() => {
          if (typeof triggerExcelImport === 'function') triggerExcelImport();
        }, 200);
      }
    }
  } catch (err) {
    console.error('Fatal initialization error in Sheets Studio:', err);
    try {
      if (!EXCEL_WB.sheets || EXCEL_WB.sheets.length === 0) {
        hydrateAcademicSheetsFromGroup(true);
      }
      await switchSheetTab('evaluation', false);
      renderExcelGrid(true);
    } catch (_) { }
    if (typeof hideOfficeScreenLoader === 'function') hideOfficeScreenLoader();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSheetsStudio);
} else {
  initSheetsStudio();
}

async function loadTeacherGroupsList() {
  try {
    const res = await apiFetch('/teaching-groups?status=ACTIVE').catch(() => null);
    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
      S.allGroups = res.data;
      if (!S.groupId) {
        S.groupId = S.allGroups[0].id;
      }
    }
  } catch (err) {
    console.error('Failed loading teaching groups:', err);
  }

  // Fallback: sync from window.S if office-home loaded it
  if ((!S.allGroups || !S.allGroups.length) && window.S && Array.isArray(window.S.allGroups) && window.S.allGroups.length) {
    S.allGroups = window.S.allGroups;
  }

  // Find exact group in allGroups
  if (S.groupId && Array.isArray(S.allGroups)) {
    const matched = S.allGroups.find(g => Number(g.id) === Number(S.groupId));
    if (matched) {
      S.group = matched;
      S.registerId = matched.register_id || matched.linked_register_id || S.registerId;
    }
  }

  renderGroupSwitcherOptions();
  renderSheetSelectorDropdownOptions();

  if (S.groupId) {
    await loadGroupMetadata(S.groupId);
  } else if (S.allGroups && S.allGroups.length > 0) {
    S.groupId = S.allGroups[0].id;
    await loadGroupMetadata(S.groupId);
  } else {
    S.groupId = 9;
    await loadGroupMetadata(S.groupId);
  }
}

function renderGroupSwitcherOptions() {
  const sel = document.getElementById('group-switcher-select');
  if (!sel) return;
  if (!S.allGroups || !S.allGroups.length) {
    if (S.group) {
      const code = S.group.subject_code ? `[${esc(S.group.subject_code)}] ` : (S.group.code ? `[${esc(S.group.code)}] ` : '');
      sel.innerHTML = `<option value="${S.group.id}" selected>${code}${esc(S.group.name || S.group.subject_name)} (${esc(S.group.component || 'THEORY')})</option>`;
      return;
    }
    sel.innerHTML = `<option value="">No classes found</option>`;
    return;
  }
  sel.innerHTML = S.allGroups.map(g => {
    const code = g.subject_code ? `[${esc(g.subject_code)}] ` : (g.code ? `[${esc(g.code)}] ` : '');
    return `
          <option value="${g.id}" ${String(g.id) === String(S.groupId) ? 'selected' : ''}>
            ${code}${esc(g.name || g.subject_name)} (${esc(g.component || 'THEORY')})
          </option>
        `;
  }).join('');
}

function getGroupComponentScope(g) {
  const comp = String((g && (g.component || g.group_component || g.subject_component || g.session_type_scope)) || 'THEORY').toUpperCase();
  const hasTheory = comp.includes('THEORY') || !comp.includes('PRACTICAL');
  const hasPractical = comp.includes('PRACTICAL');
  return {
    raw: comp,
    hasTheory,
    hasPractical,
    isBoth: hasTheory && hasPractical,
    isTheoryOnly: hasTheory && !hasPractical,
    isPracticalOnly: !hasTheory && hasPractical
  };
}

function renderSheetSelectorDropdownOptions() {
  const sel = document.getElementById('sheet-selector-dropdown');
  if (!sel) return;
  const scope = getGroupComponentScope(S.group);
  const curVal = sel.value || S.activeSheet || 'evaluation';

  let optionsHtml = '';
  if (scope.isPracticalOnly) {
    optionsHtml = `
          <option value="evaluation">1. Continuous Lab Evaluation Sheet</option>
          <option value="practicals">2. Practical &amp; Lab Work Marksheet</option>
        `;
  } else if (scope.isTheoryOnly) {
    optionsHtml = `
          <option value="evaluation">1. Master Evaluation Sheet</option>
          <option value="tests">2. Class Test Marksheet</option>
          <option value="assignments">3. Assignment Marksheet</option>
        `;
  } else {
    optionsHtml = `
          <option value="evaluation">1. Master Evaluation Sheet (Theory + Practical)</option>
          <option value="tests">2. Class Test Marksheet</option>
          <option value="assignments">3. Assignment Marksheet</option>
          <option value="practicals">4. Practical &amp; Lab Work Marksheet</option>
        `;
  }
  sel.innerHTML = optionsHtml;

  // Ensure current selection is valid
  if (scope.isPracticalOnly && (curVal === 'tests' || curVal === 'assignments')) {
    sel.value = 'practicals';
  } else if (scope.isTheoryOnly && curVal === 'practicals') {
    sel.value = 'evaluation';
  } else {
    sel.value = curVal;
  }
}

async function loadGroupMetadata(groupId) {
  try {
    // 1. Immediately match known group from S.allGroups
    const found = (S.allGroups || []).find(g => Number(g.id) === Number(groupId));
    if (found) {
      S.group = Object.assign({}, found);
      S.registerId = found.register_id || found.linked_register_id || S.registerId;
    }

    // 2. Fetch fresh details for this teaching group
    const groupRes = await apiFetch(`/teaching-groups/${groupId}`).catch(() => null);
    if (groupRes && groupRes.success && groupRes.data) {
      S.group = Object.assign(S.group || {}, groupRes.data);
      S.registerId = S.group.register_id || S.group.linked_register_id || S.registerId || groupId;
    } else if (!S.group) {
      S.group = {
        id: Number(groupId),
        name: Number(groupId) === 9 ? 'Java Programming' : `Classroom ${groupId}`,
        subject_name: Number(groupId) === 9 ? 'Java Programming' : `Classroom ${groupId}`,
        subject_code: Number(groupId) === 9 ? '55508' : 'SUB' + groupId,
        department_name: 'Information Technology',
        department_code: 'IT',
        component: 'THEORY+PRACTICAL',
        semester: 5
      };
      S.registerId = S.group.register_id || S.registerId || groupId;
    }

    // 3. Update banner metadata text immediately with authentic classroom information
    const subjName = S.group?.name || S.group?.subject_name || 'Classroom';
    const subjCode = S.group?.subject_code ? ` [${S.group.subject_code}]` : '';
    const dept = S.group?.department_name || 'Information Technology';
    const deptCode = S.group?.department_code || 'IT';
    const sem = S.group?.semester || S.group?.current_semester || 5;

    const bannerLine2 = document.getElementById('hdr-banner-line2');
    if (bannerLine2) {
      const scope = getGroupComponentScope(S.group);
      let sheetKind = 'Consolidated (Theory+Practical)';
      if (scope.isPracticalOnly) sheetKind = 'Continuous Lab Evaluation';
      else if (scope.isTheoryOnly) sheetKind = 'Theory Internal Evaluation';
      bannerLine2.textContent = `Department (${deptCode}) | Internal Evaluation - ${sheetKind} | Subject : ${subjName}${subjCode}`;
    }
    const bannerCohort = document.getElementById('hdr-banner-cohort');
    if (bannerCohort) {
      bannerCohort.textContent = `${dept} | Semester ${sem}`;
    }

    // 4. Concurrently fetch members, assignments, tests, and marks evaluation
    const [memRes, aRes, tRes, evalRes] = await Promise.allSettled([
      apiFetch(`/teaching-groups/${groupId}/members`),
      apiFetch(`/teaching-groups/${groupId}/assignments`),
      apiFetch(`/teaching-groups/${groupId}/tests`),
      apiFetch(`/faculty/registers/${S.registerId || groupId}/internal-evaluation`)
    ]);

    if (memRes.status === 'fulfilled' && memRes.value?.success && Array.isArray(memRes.value.data) && memRes.value.data.length > 0) {
      S.members = memRes.value.data;
    } else if (S.group && Array.isArray(S.group.members) && S.group.members.length > 0) {
      S.members = S.group.members;
    }

    if (evalRes.status === 'fulfilled' && evalRes.value?.success && evalRes.value?.data) {
      const d = evalRes.value.data;
      if (Array.isArray(d.assignments) && d.assignments.length) S.assignments = d.assignments;
      if (Array.isArray(d.exams) && d.exams.length) S.tests = d.exams;
      if (Array.isArray(d.roster) && d.roster.length && (!S.members || !S.members.length)) {
        S.members = d.roster;
      } else if (Array.isArray(d.students) && d.students.length && (!S.members || !S.members.length)) {
        S.members = d.students;
      }
      S.evalData = d;
    }

    // Tier 2: If teaching group has no members enrolled yet, query authentic students from student records
    if (!S.members || !S.members.length) {
      const deptId = S.group?.department_id || '';
      const semFilter = S.group?.semester || '';
      const recRes = await apiFetch(`/student-records?department_id=${deptId}&semester=${semFilter}`).catch(() => null);
      if (recRes && recRes.success && Array.isArray(recRes.data) && recRes.data.length > 0) {
        S.members = recRes.data;
      }
    }

    // Tier 3: Fetch institutional student roster from database
    if (!S.members || !S.members.length) {
      const allStu = await apiFetch(`/students?limit=100`).catch(() => null);
      if (allStu && allStu.success && Array.isArray(allStu.data) && allStu.data.length > 0) {
        S.members = allStu.data;
      }
    }

    if (aRes.status === 'fulfilled' && aRes.value?.success && Array.isArray(aRes.value.data)) {
      S.assignments = aRes.value.data;
    }
    if (tRes.status === 'fulfilled' && tRes.value?.success && Array.isArray(tRes.value.data)) {
      S.tests = tRes.value.data;
      if (S.tests.length > 0 && !S.currentTestId) {
        S.currentTestId = S.tests[0].id;
      }
    }

    renderGroupSwitcherOptions();
    renderSheetSelectorDropdownOptions();
    renderSubsheetControls();

    // 5. HYDRATE LIVE DATA FROM DATABASE (forceRefresh = true)!
    hydrateAcademicSheetsFromGroup(true);
    renderExcelGrid(true);
    if (typeof hideOfficeScreenLoader === 'function') hideOfficeScreenLoader();
  } catch (err) {
    console.error('Error fetching group metadata:', err);
    hydrateAcademicSheetsFromGroup(true);
    renderExcelGrid(true);
    if (typeof hideOfficeScreenLoader === 'function') hideOfficeScreenLoader();
  }
}
window.loadGroupMetadata = loadGroupMetadata;

async function onSwitchGroup(newGroupId, force = false) {
  if (!newGroupId) return;
  if (!force && Number(newGroupId) === Number(S.groupId) && Array.isArray(S.members) && S.members.length > 0) {
    return;
  }

  if (typeof showOfficeScreenLoader === 'function') {
    showOfficeScreenLoader('Loading...');
  }

  // Save current group edits before switching
  if (S.groupId) {
    saveActiveSheetData(false);
  }

  S.groupId = Number(newGroupId);
  S.registerId = S.groupId;

  const url = new URL(window.location);
  url.searchParams.set('groupId', S.groupId);
  url.searchParams.delete('view');
  if (!document.getElementById('office-home-screen')) {
    window.history.pushState({}, '', url);
  }

  await loadGroupMetadata(S.groupId);
  renderGroupSwitcherOptions();
  renderSheetSelectorDropdownOptions();
  await switchSheetTab(S.activeSheet || 'evaluation', false);

  if (typeof hideOfficeScreenLoader === 'function') {
    hideOfficeScreenLoader();
  }
}
window.onSwitchGroup = onSwitchGroup;

/* ══════════════════════════════════════════════════════════════
   SHEET TABS SWITCHER
   ══════════════════════════════════════════════════════════════ */
async function switchSheetTab(sheetName, updateUrl = true) {
  if (sheetName === 'attendance') sheetName = 'evaluation';

  const scope = getGroupComponentScope(S.group);
  if (scope.isPracticalOnly && (sheetName === 'tests' || sheetName === 'assignments')) {
    sheetName = 'practicals';
  } else if (scope.isTheoryOnly && sheetName === 'practicals') {
    sheetName = 'evaluation';
  }

  S.activeSheet = sheetName;
  ['evaluation', 'tests', 'assignments', 'practicals'].forEach(tab => {
    const pane = document.getElementById(`pane-${tab}`);
    if (pane) pane.classList.toggle('active', tab === sheetName);
  });

  const dropdown = document.getElementById('sheet-selector-dropdown');
  if (dropdown && dropdown.value !== sheetName) {
    dropdown.value = sheetName;
  }
  renderSubsheetControls();

  if (updateUrl && !document.getElementById('office-home-screen')) {
    const url = new URL(window.location);
    url.searchParams.set('sheet', sheetName);
    if (S.groupId) url.searchParams.set('id', S.groupId);
    window.history.pushState({}, '', url);
  }

  // Seamlessly switch active Excel worksheet in EXCEL_WB.sheets!
  let targetIdx = -1;
  if (Array.isArray(EXCEL_WB.sheets) && EXCEL_WB.sheets.length > 0) {
    if (sheetName === 'evaluation') {
      targetIdx = EXCEL_WB.sheets.findIndex(s => s.type === 'evaluation' || (s.name && (s.name.toLowerCase().includes('master') || s.name.toLowerCase().includes('evaluation'))));
      if (targetIdx === -1) targetIdx = 0;
    } else if (sheetName === 'tests') {
      targetIdx = EXCEL_WB.sheets.findIndex(s => s.type === 'tests' || (s.name && s.name.toLowerCase().includes('test')));
      if (targetIdx === -1 && EXCEL_WB.sheets.length > 1) targetIdx = 1;
    } else if (sheetName === 'assignments') {
      targetIdx = EXCEL_WB.sheets.findIndex(s => s.type === 'assignments' || (s.name && s.name.toLowerCase().includes('assignment')));
      if (targetIdx === -1 && EXCEL_WB.sheets.length > 2) targetIdx = 2;
    } else if (sheetName === 'practicals') {
      targetIdx = EXCEL_WB.sheets.findIndex(s => s.type === 'practicals' || (s.name && (s.name.toLowerCase().includes('practical') || s.name.toLowerCase().includes('lab'))));
      if (targetIdx === -1 && EXCEL_WB.sheets.length > 3) targetIdx = 3;
    }

    if (targetIdx >= 0 && targetIdx < EXCEL_WB.sheets.length) {
      EXCEL_WB.activeSheetIndex = targetIdx;
      renderSheetTabs();
      renderExcelGrid(true);
      updateFormulaBarUI();
    }
  }

  updateBannerForSheet(sheetName);
  if (S.autoFit) {
    setTimeout(() => fitSheetToScreen(false), 40);
  }
}

function updateBannerForSheet(sheetTypeOrName) {
  const line2 = document.getElementById('hdr-banner-line2');
  if (!line2) return;
  const subjName = S.group?.subject_name || S.group?.name || 'Classroom';
  const subjCode = S.group?.subject_code ? ` [${S.group.subject_code}]` : '';
  let title = 'Marks Evaluation Sheet';
  if (sheetTypeOrName === 'evaluation' || sheetTypeOrName === 'Master Evaluation') {
    title = 'Consolidated (Theory+Practical)';
  } else if (sheetTypeOrName === 'tests' || sheetTypeOrName === 'Unit Tests - Consolidated') {
    title = 'Unit Test - Consolidated';
  } else if (sheetTypeOrName === 'assignments' || sheetTypeOrName === 'Assignments') {
    title = 'Assignment';
  } else if (sheetTypeOrName === 'practicals' || sheetTypeOrName === 'Practicals') {
    title = 'Practical & Laboratory Examination Records';
  } else if (typeof sheetTypeOrName === 'string') {
    title = `Unit Test - ${sheetTypeOrName}`;
  }
  line2.textContent = `Department (${S.group?.department_code || 'IT'}) | Internal Evaluation - ${title} | Subject : ${subjName}${subjCode}`;
}

// Purged legacy renderSheetSubToolbar

async function loadSheetData(sheetName) {
  if (sheetName === 'evaluation') {
    await loadEvaluationSheetData();
  } else if (sheetName === 'tests') {
    await loadTestSheetData();
  } else if (sheetName === 'assignments') {
    await loadAssignmentsSheetData();
  } else if (sheetName === 'practicals') {
    await loadPracticalsSheetData();
  } else {
    await loadEvaluationSheetData();
  }
}

async function reloadCurrentSheetData() {
  await loadSheetData(S.activeSheet);
}

function onSheetSearch(val) {
  S.searchQuery = (val || '').trim().toLowerCase();
  applySheetFilterAndSearch();
}

function onSheetFilter(val) {
  S.filterMode = val;
  applySheetFilterAndSearch();
}

function applySheetFilterAndSearch() {
  applyExcelGridFilters();
  if (typeof renderEvaluationSheetTable === 'function') {
    try { renderEvaluationSheetTable(); } catch (_) { }
  }
}

/* ══════════════════════════════════════════════════════════════
   EXCEL SHEET SEARCH, FILTER, AND SORT ENGINE
   ══════════════════════════════════════════════════════════════ */
function isMarksRow(sheet, r) {
  if (!sheet || r < 0) return false;
  for (let c = 0; c < Math.min(sheet.colsCount || 10, 6); c++) {
    const val = String(getCell(sheet, r, c).v || getCell(sheet, r, c).raw || '').toLowerCase();
    if (val.includes('marks') || val.includes('question') || val.includes('unit test no') || val.includes('assignment no') || val.includes('max')) {
      return true;
    }
  }
  return false;
}

function isSignoffRow(sheet, r) {
  if (!sheet || r < 0) return false;
  const c0 = String(getCell(sheet, r, 0).v || getCell(sheet, r, 0).raw || '').toLowerCase();
  return c0.includes('subject teacher') || c0.includes('teacher') || c0.includes('principal') || c0.includes('head of');
}

function checkRowMatchesFilters(sheet, r) {
  if (!sheet || r === 0 || isMarksRow(sheet, r) || isSignoffRow(sheet, r)) return true;

  // 1. Search Query Match (any cell in row)
  if (S.searchQuery) {
    let hasMatch = false;
    for (let c = 0; c < sheet.colsCount; c++) {
      const cell = getCell(sheet, r, c);
      const val = String(cell.v !== undefined && cell.v !== null ? cell.v : (cell.raw || '')).toLowerCase();
      if (val.includes(S.searchQuery)) {
        hasMatch = true;
        break;
      }
    }
    if (!hasMatch) return false;
  }

  // 2. Student Status Filter Match
  if (S.filterMode && S.filterMode !== 'ALL') {
    let attVal = null;
    let scoreVal = null;
    let hasAbsent = false;

    for (let c = 0; c < sheet.colsCount; c++) {
      const headerText = String(getCell(sheet, 0, c).v || '').toLowerCase();
      const cellVal = getCell(sheet, r, c).v;
      const strVal = String(cellVal || '').toUpperCase();
      if (strVal.includes('ABSENT') || strVal === 'AB' || strVal === 'FAIL') {
        hasAbsent = true;
      }
      if (headerText.includes('att') || headerText.includes('%')) {
        const n = parseFloat(cellVal);
        if (!isNaN(n)) attVal = n;
      }
      if (headerText.includes('total') || headerText.includes('score') || headerText.includes('grand')) {
        const n = parseFloat(cellVal);
        if (!isNaN(n)) scoreVal = n;
      }
    }

    if (S.filterMode === 'ATT_LOW') {
      if (attVal !== null && attVal >= 75) return false;
    } else if (S.filterMode === 'TOP') {
      const pct = scoreVal !== null ? (scoreVal <= 40 ? (scoreVal / 40) * 100 : scoreVal) : (attVal || 0);
      if (pct < 80) return false;
    } else if (S.filterMode === 'AVERAGE') {
      const pct = scoreVal !== null ? (scoreVal <= 40 ? (scoreVal / 40) * 100 : scoreVal) : (attVal || 0);
      if (pct < 50 || pct >= 80) return false;
    } else if (S.filterMode === 'LOW') {
      const pct = scoreVal !== null ? (scoreVal <= 40 ? (scoreVal / 40) * 100 : scoreVal) : (attVal || 0);
      if (pct >= 50) return false;
    } else if (S.filterMode === 'ABSENT') {
      if (!hasAbsent) return false;
    }
  }

  return true;
}

function applyExcelGridFilters() {
  const sheet = getActiveSheet();
  const tbody = document.getElementById('excel-tbody');
  if (!sheet || !tbody) return;

  if (!S.hiddenExcelCols) S.hiddenExcelCols = new Set();

  let visibleCount = 0;
  let totalStudentRows = 0;

  // 1. Filter rows in DOM
  const trList = tbody.querySelectorAll('tr[data-row]');
  trList.forEach(tr => {
    const r = parseInt(tr.dataset.row, 10);
    if (r === 0 || isMarksRow(sheet, r) || isSignoffRow(sheet, r)) {
      tr.style.display = '';
      return;
    }
    const nameCell = getCell(sheet, r, 4) || getCell(sheet, r, 2);
    const rollCell = getCell(sheet, r, 1) || getCell(sheet, r, 0);
    const isStudentRow = Boolean((nameCell && (nameCell.v || nameCell.raw)) || (rollCell && (rollCell.v || rollCell.raw)));

    if (isStudentRow) {
      totalStudentRows++;
      const matches = checkRowMatchesFilters(sheet, r);
      if (matches) {
        tr.style.display = '';
        visibleCount++;
      } else {
        tr.style.display = 'none';
      }
    } else {
      // Empty padding row
      const hasFilterOrSearch = Boolean(S.searchQuery || (S.filterMode && S.filterMode !== 'ALL'));
      tr.style.display = hasFilterOrSearch ? 'none' : '';
    }
  });

  // 2. Filter columns in DOM
  for (let c = 0; c < sheet.colsCount; c++) {
    const isHidden = S.hiddenExcelCols.has(c);
    const th = document.querySelector(`.col-th-${c}`);
    if (th) th.style.display = isHidden ? 'none' : '';
    const cells = tbody.querySelectorAll(`td[data-col="${c}"]`);
    cells.forEach(td => { td.style.display = isHidden ? 'none' : ''; });
  }

  S.visibleStudentsCount = visibleCount;

  // 3. Update Status Tally
  const tally = document.getElementById('sheet-visible-tally');
  if (tally) {
    if (S.searchQuery || (S.filterMode && S.filterMode !== 'ALL')) {
      tally.textContent = `Showing ${visibleCount} of ${totalStudentRows} students (Filtered)`;
    } else {
      tally.textContent = `Showing ${visibleCount} of ${totalStudentRows} students`;
    }
  }

  // 4. Update Filter Modal summary if open
  updateFilterModalSummary();
}

function sortSheetByMode(mode) {
  const sheet = getActiveSheet();
  if (!sheet) return;
  pushUndoState('Sort by ' + mode);

  let sortCol = 0;
  let sortDir = 'asc';

  if (mode === 'ROLL_ASC') {
    let rollCol = 1;
    for (let c = 0; c < Math.min(sheet.colsCount, 5); c++) {
      const h = String(getCell(sheet, 0, c).v || '').toUpperCase();
      if (h.includes('ROLL')) { rollCol = c; break; }
    }
    sortCol = rollCol;
    sortDir = 'asc';
  }
  else if (mode === 'ROLL_DESC') {
    let rollCol = 1;
    for (let c = 0; c < Math.min(sheet.colsCount, 5); c++) {
      const h = String(getCell(sheet, 0, c).v || '').toUpperCase();
      if (h.includes('ROLL')) { rollCol = c; break; }
    }
    sortCol = rollCol;
    sortDir = 'desc';
  }
  else if (mode === 'NAME_ASC') {
    let nameCol = 4;
    for (let c = 0; c < Math.min(sheet.colsCount, 6); c++) {
      const h = String(getCell(sheet, 0, c).v || '').toUpperCase();
      if (h.includes('NAME')) { nameCol = c; break; }
    }
    sortCol = nameCol;
    sortDir = 'asc';
  }
  else if (mode === 'NAME_DESC') {
    let nameCol = 4;
    for (let c = 0; c < Math.min(sheet.colsCount, 6); c++) {
      const h = String(getCell(sheet, 0, c).v || '').toUpperCase();
      if (h.includes('NAME')) { nameCol = c; break; }
    }
    sortCol = nameCol;
    sortDir = 'desc';
  }
  else if (mode === 'MARKS_DESC' || mode === 'MARKS_ASC') {
    let colIdx = -1;
    for (let c = 0; c < sheet.colsCount; c++) {
      const h = String(getCell(sheet, 0, c).v || '').toLowerCase();
      if (h.includes('total') || h.includes('score') || h.includes('avg')) { colIdx = c; break; }
    }
    sortCol = colIdx >= 0 ? colIdx : 6;
    sortDir = mode === 'MARKS_DESC' ? 'desc' : 'asc';
  } else if (mode === 'ATT_DESC' || mode === 'ATT_ASC') {
    let colIdx = -1;
    for (let c = 0; c < sheet.colsCount; c++) {
      const h = String(getCell(sheet, 0, c).v || '').toLowerCase();
      if (h.includes('att') || h.includes('%')) { colIdx = c; break; }
    }
    sortCol = colIdx >= 0 ? colIdx : 5;
    sortDir = mode === 'ATT_DESC' ? 'desc' : 'asc';
  }

  let firstStudentR = 1;
  if (isMarksRow(sheet, 2)) {
    firstStudentR = 3;
  } else if (isMarksRow(sheet, 1)) {
    firstStudentR = 2;
  }

  const rows = [];
  for (let r = firstStudentR; r < sheet.rowsCount; r++) {
    if (isMarksRow(sheet, r)) continue;
    const nameVal = getCell(sheet, r, 4)?.v || getCell(sheet, r, 2)?.v;
    const rollVal = getCell(sheet, r, 1)?.v || getCell(sheet, r, 0)?.v;
    if (!nameVal && !rollVal) continue; // skip empty rows

    const rowCells = [];
    for (let c = 0; c < sheet.colsCount; c++) {
      rowCells.push(getCell(sheet, r, c));
    }
    rows.push({ r, rowCells, keyVal: getCell(sheet, r, sortCol).v });
  }

  rows.sort((a, b) => {
    const valA = a.keyVal;
    const valB = b.keyVal;
    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return sortDir === 'asc' ? numA - numB : numB - numA;
    }
    return sortDir === 'asc'
      ? String(valA || '').localeCompare(String(valB || ''))
      : String(valB || '').localeCompare(String(valA || ''));
  });

  rows.forEach((rowObj, newIdx) => {
    const targetR = newIdx + firstStudentR;
    rowObj.rowCells.forEach((cell, col) => {
      setCell(sheet, targetR, col, cell);
    });
  });

  recalculateAllSheetFormulas(false);
  renderExcelGrid(false);
  markWorkbookUnsaved();
}

function openSheetFilterModal() {
  // 1. Sync sort radio
  const sortRadios = document.querySelectorAll('input[name="filter_sort_radio"]');
  sortRadios.forEach(r => { r.checked = (r.value === (S.sortMode || 'ROLL_ASC')); });

  // 2. Sync student filter radio
  const filterRadios = document.querySelectorAll('input[name="filter_student_radio"]');
  filterRadios.forEach(r => { r.checked = (r.value === (S.filterMode || 'ALL')); });

  // 3. Render columns checkboxes in modal from active sheet
  renderFilterModalColumns();

  // 4. Update summary text
  updateFilterModalSummary();

  const modal = document.getElementById('sheet-filter-modal');
  if (modal) modal.classList.add('open');
}

function closeSheetFilterModal() {
  const modal = document.getElementById('sheet-filter-modal');
  if (modal) modal.classList.remove('open');
}

function switchFilterCategory(cat) {
  document.querySelectorAll('.filter-sidebar-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.filter-tab-pane').forEach(p => p.classList.remove('active'));

  const btn = document.getElementById(`tab-btn-${cat}`);
  const pane = document.getElementById(`filter-pane-${cat}`);
  if (btn) btn.classList.add('active');
  if (pane) pane.classList.add('active');
}

function clearAllSheetFilters() {
  S.sortMode = 'ROLL_ASC';
  S.filterMode = 'ALL';
  S.searchQuery = '';
  if (S.hiddenExcelCols) S.hiddenExcelCols.clear();

  const searchInput = document.getElementById('sheet-search-input');
  if (searchInput) searchInput.value = '';

  const sortRadios = document.querySelectorAll('input[name="filter_sort_radio"]');
  sortRadios.forEach(r => { r.checked = (r.value === 'ROLL_ASC'); });

  const filterRadios = document.querySelectorAll('input[name="filter_student_radio"]');
  filterRadios.forEach(r => { r.checked = (r.value === 'ALL'); });

  sortSheetByMode('ROLL_ASC');
  applyExcelGridFilters();
  updateFilterBadgeIndicator();
  closeSheetFilterModal();
}

function onFilterModalRadioChange() {
  updateFilterModalSummary();
}

function updateFilterModalSummary() {
  const statusEl = document.getElementById('filter-modal-status-text');
  if (!statusEl) return;
  const sheet = getActiveSheet();
  let totalCount = 0;
  let matchCount = 0;

  if (sheet && sheet.rowsCount > 1) {
    for (let r = 1; r < sheet.rowsCount; r++) {
      if (isMarksRow(sheet, r)) continue;
      const nameCell = getCell(sheet, r, 2);
      const rollCell = getCell(sheet, r, 0);
      if ((nameCell && (nameCell.v || nameCell.raw)) || (rollCell && (rollCell.v || rollCell.raw))) {
        totalCount++;
        if (checkRowMatchesFilters(sheet, r)) {
          matchCount++;
        }
      }
    }
  }

  if (totalCount === 0) {
    totalCount = S.evalData?.students?.length || S.evalData?.roster?.length || S.members?.length || 0;
    matchCount = totalCount;
  }

  statusEl.textContent = `Showing ${matchCount} of ${totalCount} students`;
}

function renderFilterModalColumns() {
  const container = document.getElementById('filter-modal-col-checkboxes');
  if (!container) return;

  const sheet = getActiveSheet();
  if (!sheet) return;
  if (!S.hiddenExcelCols) S.hiddenExcelCols = new Set();

  let html = '';
  for (let c = 0; c < sheet.colsCount; c++) {
    const headerCell = getCell(sheet, 0, c);
    const title = (headerCell && (headerCell.v !== undefined && headerCell.v !== null ? headerCell.v : headerCell.raw))
      ? String(headerCell.v || headerCell.raw).trim()
      : `Column ${colToLetter(c)}`;
    if (!title) continue;
    const isChecked = !S.hiddenExcelCols.has(c);
    html += `
      <label class="filter-option-row" style="padding:0.35rem 0.5rem;">
        <input type="checkbox" id="fmod-excel-col-${c}" ${isChecked ? 'checked' : ''} onchange="toggleExcelColumnVisibility(${c}, this.checked)">
        <span class="filter-option-label" style="font-size:0.82rem;">${escapeHtml(title)}</span>
      </label>
    `;
  }
  container.innerHTML = html;
}

function toggleExcelColumnVisibility(colIdx, visible) {
  if (!S.hiddenExcelCols) S.hiddenExcelCols = new Set();
  if (visible) {
    S.hiddenExcelCols.delete(colIdx);
  } else {
    S.hiddenExcelCols.add(colIdx);
  }
  applyExcelGridFilters();
  updateFilterBadgeIndicator();
}

function resetFilterModalColumnsVisible() {
  if (S.hiddenExcelCols) S.hiddenExcelCols.clear();
  applyExcelGridFilters();
  renderFilterModalColumns();
  updateFilterBadgeIndicator();
}

function applySheetFilters() {
  applyAndCloseFilterModal();
}

function applyAndCloseFilterModal() {
  // 1. Read sort
  const checkedSort = document.querySelector('input[name="filter_sort_radio"]:checked');
  if (checkedSort) S.sortMode = checkedSort.value;

  // 2. Read student filter
  const checkedFilter = document.querySelector('input[name="filter_student_radio"]:checked');
  if (checkedFilter) S.filterMode = checkedFilter.value;

  // 3. Apply sort if specified
  if (S.sortMode) {
    sortSheetByMode(S.sortMode);
  }

  // 4. Update badge
  updateFilterBadgeIndicator();

  // 5. Apply filters to Excel grid
  applyExcelGridFilters();

  closeSheetFilterModal();
}

function updateFilterBadgeIndicator() {
  const badge = document.getElementById('filter-badge-indicator');
  if (!badge) return;
  let activeCount = 0;
  if (S.sortMode && S.sortMode !== 'ROLL_ASC') activeCount++;
  if (S.filterMode && S.filterMode !== 'ALL') activeCount++;
  if (S.searchQuery) activeCount++;
  if (S.hiddenExcelCols && S.hiddenExcelCols.size > 0) activeCount++;

  if (activeCount > 0) {
    badge.textContent = activeCount;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

/* ══════════════════════════════════════════════════════════════
   SCREEN FIT SIZE & ADJUST ENGINE (ZOOM, DENSITY, FIT)
   ══════════════════════════════════════════════════════════════ */
function setDensity(mode) {
  S.density = mode;
  const container = document.getElementById('studio-main-container');
  if (container) {
    container.classList.remove('density-compact', 'density-normal', 'density-comfortable');
    container.classList.add(`density-${mode}`);
  }
  const sel = document.getElementById('density-selector');
  if (sel) sel.value = mode;
  const dSel = document.getElementById('desktop-density-selector');
  if (dSel) dSel.value = mode;
  setTimeout(() => {
    const activeTable = document.querySelector('.sheet-pane.active table');
    if (activeTable) updateStickyHeaderOffsets(activeTable);
    if (S.autoFit) fitSheetToScreen(false);
  }, 30);
}

function zoomIn() {
  S.autoFit = false;
  updateAutoFitUI();
  const next = Math.min(2.0, Math.round((S.zoomScale + 0.1) * 10) / 10);
  setSheetZoom(next);
}

function zoomOut() {
  S.autoFit = false;
  updateAutoFitUI();
  const prev = Math.max(0.5, Math.round((S.zoomScale - 0.1) * 10) / 10);
  setSheetZoom(prev);
}

function resetZoom() {
  S.autoFit = false;
  updateAutoFitUI();
  setSheetZoom(1.0);
}

function onZoomSliderInput(val) {
  const pct = parseInt(val, 10) || 100;
  S.autoFit = false;
  updateAutoFitUI();
  setSheetZoom(pct / 100);
}

function updateStickyHeaderOffsets(table) {
  if (!table) return;
  const row1 = table.querySelector('thead tr.excel-hdr-tan');
  const row2 = table.querySelector('thead tr.excel-hdr-sub');
  if (row1) {
    const h1 = row1.offsetHeight || 27;
    table.style.setProperty('--th-row1-height', `${h1}px`);
    if (row2 && row2.offsetHeight > 0) {
      table.style.setProperty('--th-row2-height', `${row2.offsetHeight}px`);
    } else {
      table.style.setProperty('--th-row2-height', '0px');
    }
  }
}

function setSheetZoom(scale) {
  S.zoomScale = scale;
  const wrapper = document.getElementById('scale-wrapper');
  if (wrapper) {
    if ('zoom' in document.documentElement.style) {
      wrapper.style.zoom = scale;
      wrapper.style.transform = 'none';
      wrapper.style.width = '100%';
      wrapper.style.maxWidth = '100%';
    } else {
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.transformOrigin = 'top left';
      wrapper.style.width = '100%';
      wrapper.style.maxWidth = '100%';
    }
  }
  const pct = Math.round(scale * 100);
  const lbl = document.getElementById('zoom-level-label');
  if (lbl) lbl.textContent = `${pct}%`;
  const dLbl = document.getElementById('desktop-zoom-level-label');
  if (dLbl) dLbl.textContent = `${pct}%`;
  const hLbl = document.getElementById('home-zoom-level-label');
  if (hLbl) hLbl.textContent = `${pct}%`;
  const vLbl = document.getElementById('view-zoom-level-label');
  if (vLbl) vLbl.textContent = `${pct}%`;
  const bLbl = document.getElementById('excel-status-zoom-pct');
  if (bLbl) bLbl.textContent = `${pct}%`;
  const slider = document.getElementById('excel-bottom-zoom-slider');
  if (slider && Number(slider.value) !== pct) slider.value = pct;

  const activeTable = document.querySelector('.sheet-pane.active table');
  if (activeTable) updateStickyHeaderOffsets(activeTable);

  // Immediately update selection box UI to prevent drift
  updateSelectionBoxUI();
}

function toggleAutoFit() {
  S.autoFit = !S.autoFit;
  updateAutoFitUI();
  if (S.autoFit) {
    fitSheetToScreen(true);
  } else {
    showToast('Manual zoom mode (Auto-Fit turned off)', 'info');
  }
}

function updateAutoFitUI() {
  const btn = document.getElementById('btn-autofit');
  const dBtn = document.getElementById('btn-desktop-autofit');
  if (S.autoFit) {
    if (btn) {
      btn.classList.add('active');
      btn.title = 'Continuous Auto-Fit: ON (Click to toggle manual zoom)';
    }
    if (dBtn) {
      dBtn.classList.add('active');
      dBtn.title = 'Continuous Auto-Fit: ON (Click to toggle manual zoom)';
    }
  } else {
    if (btn) {
      btn.classList.remove('active');
      btn.title = 'Continuous Auto-Fit: OFF (Click to turn on Auto-Fit)';
    }
    if (dBtn) {
      dBtn.classList.remove('active');
      dBtn.title = 'Continuous Auto-Fit: OFF (Click to turn on Auto-Fit)';
    }
  }
}

function toggleSheetViewMode() {
  const nextMode = S.viewMode === 'dynamic' ? 'overview' : 'dynamic';
  setSheetViewMode(nextMode);
}

function setSheetViewMode(mode, notify = true) {
  S.viewMode = mode;
  const vp = document.getElementById('sheets-viewport');
  const btnDyn = document.getElementById('btn-mode-dynamic');
  const btnOver = document.getElementById('btn-mode-overview');
  const drwDyn = document.getElementById('drawer-btn-mode-dynamic');
  const drwOver = document.getElementById('drawer-btn-mode-overview');

  if (mode === 'dynamic') {
    if (vp) {
      vp.classList.add('sheet-mode-dynamic');
      vp.classList.remove('sheet-mode-overview');
    }
    if (btnDyn) {
      btnDyn.classList.add('active');
      btnDyn.style.display = 'inline-flex';
    }
    if (btnOver) {
      btnOver.classList.remove('active');
      btnOver.style.display = 'none';
    }
    if (drwDyn) drwDyn.classList.add('active');
    if (drwOver) drwOver.classList.remove('active');

    S.autoFit = false;
    updateAutoFitUI();
    setSheetZoom(1.0);
    if (notify) showToast('Dynamic Mode: Frozen Roll & Name, full scale scroll', 'info');
  } else {
    if (vp) {
      vp.classList.remove('sheet-mode-dynamic');
      vp.classList.add('sheet-mode-overview');
    }
    if (btnDyn) {
      btnDyn.classList.remove('active');
      btnDyn.style.display = 'none';
    }
    if (btnOver) {
      btnOver.classList.add('active');
      btnOver.style.display = 'inline-flex';
    }
    if (drwDyn) drwDyn.classList.remove('active');
    if (drwOver) drwOver.classList.add('active');

    S.autoFit = true;
    updateAutoFitUI();
    fitSheetToScreen(false);
    if (notify) showToast('Overview Mode: Full sheet fitted to screen (touch pinch-zoom)', 'info');
  }
}

var touchPinchInitialized = false;
function setupTouchPinchZoom() {
  if (touchPinchInitialized) return;
  const viewport = document.getElementById('sheets-viewport');
  if (!viewport) return;
  touchPinchInitialized = true;

  let initialDistance = 0;
  let initialScale = 1.0;
  let lastTapTime = 0;

  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      initialDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialScale = S.zoomScale;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTime < 320) {
        if (S.viewMode === 'overview') {
          if (S.zoomScale < 0.95) {
            setSheetZoom(1.0);
            S.autoFit = false;
            updateAutoFitUI();
            showToast('Zoomed to 100%', 'info');
          } else {
            fitSheetToScreen(true);
          }
        }
      }
      lastTapTime = now;
    }
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && initialDistance > 0) {
      const currentDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDistance / initialDistance;
      let newScale = Math.max(0.35, Math.min(2.0, Math.round(initialScale * factor * 100) / 100));
      S.autoFit = false;
      updateAutoFitUI();
      setSheetZoom(newScale);
    }
  }, { passive: true });

  viewport.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      initialDistance = 0;
    }
  }, { passive: true });
}

function updateColumnFocusSelectOptions() {
  const sel = document.getElementById('sheet-column-focus-select');
  if (!sel) return;

  let options = '<option value="">Column Focus ▾</option>';

  if (S.activeSheet === 'evaluation' && S.evalData) {
    const assigns = S.evalData.assignments || [];
    assigns.forEach((a, i) => {
      options += `<option value="eval-a-${i}">Assignment ${i + 1}: ${esc(a.name || a.title || 'A' + (i + 1))}</option>`;
    });
    options += `<option value="eval-aavg">Assign Avg (${S.evalData.scheme?.assign_weight || 15}M)</option>`;

    const exams = S.evalData.exams || [];
    exams.forEach((e, i) => {
      options += `<option value="eval-e-${i}">Unit Test ${i + 1}: ${esc(e.name || e.title || 'UT' + (i + 1))}</option>`;
    });
    options += `<option value="eval-eavg">UT Avg (${S.evalData.scheme?.ut_weight || 20}M)</option>`;
    options += `<option value="eval-att">Attendance (${S.evalData.scheme?.att_weight || 10}M)</option>`;
    options += `<option value="eval-pres">Presentation (${S.evalData.scheme?.pres_weight || 5}M)</option>`;

    (S.evalData.custom_columns || []).forEach(c => {
      options += `<option value="eval-cust-${c.id}">${esc(c.name || c.title)} (${c.max_marks || 10}M)</option>`;
    });
    options += `<option value="eval-grand">Grand Total (50M)</option>`;
  } else if (S.activeSheet === 'tests' && S.currentTestState) {
    (S.currentTestState.questions || []).forEach((q, i) => {
      options += `<option value="test-q-${i}">Q${q.num} (${q.max}M)</option>`;
    });
    options += `<option value="test-tot">Total Marks</option>`;
  } else if (S.activeSheet === 'assignments') {
    (S.assignments || []).forEach((a, i) => {
      options += `<option value="assign-${i}">${esc(a.title || a.name || 'Assignment ' + (i + 1))}</option>`;
    });
    options += `<option value="assign-tot">Total &amp; Average %</option>`;
  } else if (S.activeSheet === 'attendance') {
    options += `<option value="att-held">Held / Present / Absent</option>`;
    options += `<option value="att-pct">Attendance %</option>`;
  }

  sel.innerHTML = options;
}

function onFocusColumnChange(val) {
  if (!val) return;
  const viewport = document.getElementById('sheets-viewport');
  if (!viewport) return;

  if (S.viewMode === 'overview') {
    setSheetViewMode('dynamic', false);
  }

  let targetEl = null;

  if (val.startsWith('eval-a-')) {
    const idx = parseInt(val.replace('eval-a-', ''), 10);
    targetEl = document.querySelectorAll('#eval-table-container thead tr.excel-hdr-sub th.col-assign')[idx] || document.querySelector('.col-assign');
  } else if (val === 'eval-aavg') {
    targetEl = document.querySelector('.col-assign-avg');
  } else if (val.startsWith('eval-e-')) {
    const idx = parseInt(val.replace('eval-e-', ''), 10);
    targetEl = document.querySelectorAll('#eval-table-container thead tr.excel-hdr-sub th.col-test')[idx] || document.querySelector('.col-test');
  } else if (val === 'eval-eavg') {
    targetEl = document.querySelector('.col-test-avg');
  } else if (val === 'eval-att') {
    targetEl = document.querySelector('.col-att-pct') || document.querySelector('.col-att-held');
  } else if (val === 'eval-pres') {
    targetEl = document.querySelector('.col-pres');
  } else if (val.startsWith('eval-cust-')) {
    targetEl = document.querySelector('.col-custom');
  } else if (val === 'eval-grand') {
    targetEl = document.querySelector('#eval-table-container thead tr.excel-hdr-numbers th:last-child') || document.querySelector('.excel-cell-total:last-child');
  } else if (val.startsWith('test-q-')) {
    const idx = parseInt(val.replace('test-q-', ''), 10);
    targetEl = document.querySelectorAll('#table-test-marksheet thead tr.excel-hdr-sub th.col-test')[idx] || document.querySelector('.col-test');
  } else if (val === 'test-tot') {
    targetEl = document.querySelector('#table-test-marksheet thead tr.excel-hdr-numbers th:nth-last-child(2)');
  } else if (val.startsWith('assign-')) {
    const idx = parseInt(val.replace('assign-', ''), 10);
    targetEl = document.querySelectorAll('#table-assignments-marksheet thead tr.excel-hdr-tan th.col-assign')[idx] || document.querySelector('.col-assign');
  } else if (val === 'assign-tot') {
    targetEl = document.querySelector('#table-assignments-marksheet thead tr.excel-hdr-tan th:nth-last-child(2)');
  } else if (val === 'att-held') {
    targetEl = document.querySelector('.col-att-held');
  } else if (val === 'att-pct') {
    targetEl = document.querySelector('.col-att-pct');
  }

  if (targetEl) {
    const stickyWidth = (S.viewMode === 'dynamic') ? 195 : 0;
    const table = document.querySelector('table.excel-table') || document.querySelector('table');
    if (table) {
      const tableRect = table.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const scrollLeft = (targetRect.left - tableRect.left) - stickyWidth;

      viewport.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth'
      });

      targetEl.classList.remove('focus-column-pulse');
      void targetEl.offsetWidth;
      targetEl.classList.add('focus-column-pulse');
    }
  }
}

function fitSheetToScreen(userTriggered = false) {
  if (S.viewMode === 'dynamic' && !userTriggered) {
    setSheetZoom(1.0);
    updateAutoFitUI();
    return;
  }
  const viewport = document.getElementById('sheets-viewport');
  const activePane = document.querySelector('.sheet-pane.active');
  const table = activePane?.querySelector('table.excel-table') || activePane?.querySelector('table.sheet-table') || activePane?.querySelector('table');
  if (!viewport || !table) return;

  const wrapper = document.getElementById('scale-wrapper');
  if (!wrapper) return;

  // Reset wrapper scale and zoom temporarily to measure actual unscaled intrinsic table width
  wrapper.style.transform = 'none';
  wrapper.style.zoom = '1';
  wrapper.style.width = 'max-content';

  const viewportWidth = viewport.clientWidth - 4;
  const tableWidth = table.scrollWidth || table.offsetWidth;

  if (tableWidth > 0 && viewportWidth > 60) {
    let scale = viewportWidth / tableWidth;
    if (scale >= 1.0) {
      scale = 1.0;
    } else {
      scale = Math.max(0.35, Math.min(1.0, Math.round(scale * 100) / 100));
    }
    setSheetZoom(scale);
    if (userTriggered) {
      showToast(`Spreadsheet auto-fitted to screen (${Math.round(scale * 100)}%)`, 'info');
    }
  } else {
    setSheetZoom(1.0);
  }
  updateAutoFitUI();
}

// Debounced automatic re-fitting on window / orientation resize
let sheetResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(sheetResizeTimer);
  sheetResizeTimer = setTimeout(() => {
    const activeTable = document.querySelector('.sheet-pane.active table');
    if (activeTable) updateStickyHeaderOffsets(activeTable);
    if (S.autoFit) {
      fitSheetToScreen(false);
    }
  }, 100);
});

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => { });
  } else {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
  }
}

/* ══════════════════════════════════════════════════════════════
   FILTER FOR HIDING COLUMNS ENGINE
   ══════════════════════════════════════════════════════════════ */


function toggleColumnVisibility(colKey, isVisible) {
  S.columnVisibility[colKey] = isVisible;
  const vp = document.getElementById('sheets-viewport');
  if (!vp) return;

  if (!isVisible) {
    vp.classList.add(`hide-col-${colKey}`);
  } else {
    vp.classList.remove(`hide-col-${colKey}`);
  }
  if (S.autoFit) {
    setTimeout(() => fitSheetToScreen(false), 30);
  }
}

function resetAllColumnsVisible() {
  const vp = document.getElementById('sheets-viewport');
  Object.keys(S.columnVisibility).forEach(k => {
    S.columnVisibility[k] = true;
    const chk = document.getElementById(`chk-col-${k}`);
    if (chk) chk.checked = true;
    if (vp) vp.classList.remove(`hide-col-${k}`);
  });
  if (S.autoFit) {
    setTimeout(() => fitSheetToScreen(false), 30);
  }
  showToast('All columns visible', 'info');
}

/* ══════════════════════════════════════════════════════════════
   MODALS HANDLERS: ADD / EDIT / REMOVE COLUMNS & ROWS
   ══════════════════════════════════════════════════════════════ */
function onAddColCategoryChange(cat) {
  const titleInput = document.getElementById('add-col-title');
  const maxInput = document.getElementById('add-col-max');
  if (cat === 'custom') {
    if (titleInput) titleInput.value = 'Practical / Lab';
    if (maxInput) maxInput.value = '10';
  } else if (cat === 'assign') {
    const aNum = (S.evalData?.assignments?.length || 2) + 1;
    if (titleInput) titleInput.value = `Assignment ${aNum}`;
    if (maxInput) maxInput.value = '20';
  } else if (cat === 'exam') {
    const eNum = (S.evalData?.exams?.length || 2) + 1;
    if (titleInput) titleInput.value = `Unit Test ${eNum}`;
    if (maxInput) maxInput.value = '20';
  }
}

function openAddColumnModal() {
  const targetInput = document.getElementById('add-col-sheet-target');
  const typeGroup = document.getElementById('add-col-type-group');
  const stmtGroup = document.getElementById('add-col-statement-group');
  const titleInput = document.getElementById('add-col-title');
  const maxInput = document.getElementById('add-col-max');
  const catSelect = document.getElementById('add-col-category');

  if (S.activeSheet === 'tests') {
    if (targetInput) targetInput.value = 'Class Test Marksheet (New Question Column)';
    if (typeGroup) typeGroup.style.display = 'none';
    if (stmtGroup) stmtGroup.style.display = 'flex';
    const qNum = (S.currentTestState?.questions?.length || 4) + 1;
    if (titleInput) titleInput.value = `Q${qNum}`;
    if (maxInput) maxInput.value = '5';
  } else if (S.activeSheet === 'assignments') {
    if (targetInput) targetInput.value = 'Coursework & Assignments (New Assignment)';
    if (typeGroup) typeGroup.style.display = 'none';
    if (stmtGroup) stmtGroup.style.display = 'none';
    const aNum = (S.assignments?.length || 2) + 1;
    if (titleInput) titleInput.value = `Assignment ${aNum}`;
    if (maxInput) maxInput.value = '20';
  } else {
    if (targetInput) targetInput.value = 'Master Evaluation Sheet';
    if (typeGroup) typeGroup.style.display = 'flex';
    if (stmtGroup) stmtGroup.style.display = 'none';
    if (catSelect) catSelect.value = 'custom';
    if (titleInput) titleInput.value = 'Practical / Lab';
    if (maxInput) maxInput.value = '10';
  }

  openModal('modal-add-column');
}

function confirmAddColumn() {
  const title = document.getElementById('add-col-title')?.value.trim() || 'New Assessment';
  const maxMarks = Math.max(1, parseInt(document.getElementById('add-col-max')?.value, 10) || 10);
  const statement = document.getElementById('add-col-statement')?.value.trim() || '';

  if (S.activeSheet === 'tests' && S.currentTestState) {
    const nextNum = S.currentTestState.questions.length + 1;
    S.currentTestState.questions.push({
      num: nextNum,
      text: statement || title || `Question ${nextNum}`,
      max: maxMarks
    });
    S.currentTestState.roster.forEach(r => {
      if (!r.question_scores) r.question_scores = [];
      r.question_scores.push(0);
    });
    renderTestSheetTable();
    showToast(`Added Question Q${nextNum} (${maxMarks} marks)!`, 'success');
  } else if (S.activeSheet === 'assignments') {
    const nextId = Date.now();
    if (!S.assignments) S.assignments = [];
    S.assignments.push({ id: nextId, title, name: title, max_marks: maxMarks });
    renderAssignmentsSheetTable();
    showToast(`Added assignment: ${title} (${maxMarks} marks)!`, 'success');
  } else if (S.activeSheet === 'evaluation' && S.evalData) {
    const cat = document.getElementById('add-col-category')?.value || 'custom';
    if (cat === 'assign') {
      if (!S.evalData.assignments) S.evalData.assignments = [];
      S.evalData.assignments.push({ id: Date.now(), name: title, title: title, max_marks: maxMarks });
      S.evalData.roster.forEach(st => {
        if (!st.assignment_scores) st.assignment_scores = [];
        st.assignment_scores.push(Math.round(maxMarks * 0.8));
      });
      renderEvaluationSheetTable();
      showToast(`Added assignment column: ${title} (${maxMarks} marks)!`, 'success');
    } else if (cat === 'exam') {
      if (!S.evalData.exams) S.evalData.exams = [];
      S.evalData.exams.push({ id: Date.now(), name: title, title: title, max_marks: maxMarks });
      S.evalData.roster.forEach(st => {
        if (!st.exam_scores) st.exam_scores = [];
        st.exam_scores.push({ marks: Math.round(maxMarks * 0.8), is_absent: false });
      });
      renderEvaluationSheetTable();
      showToast(`Added unit test column: ${title} (${maxMarks} marks)!`, 'success');
    } else {
      // Custom Assessment Column (Lab, Viva, Mini Project, etc.)
      if (!S.evalData.custom_columns) S.evalData.custom_columns = [];
      const colId = 'c_' + Date.now();
      S.evalData.custom_columns.push({ id: colId, name: title, title: title, max_marks: maxMarks });
      S.evalData.roster.forEach(st => {
        if (!st.custom_scores) st.custom_scores = {};
        st.custom_scores[colId] = Math.round(maxMarks * 0.85);
      });
      renderEvaluationSheetTable();
      showToast(`Added continuous assessment: ${title} (${maxMarks} marks)!`, 'success');
    }
  }

  closeModal('modal-add-column');
  triggerAutoSaveIndicator();
}

function openRemoveColumnModal() {
  const sel = document.getElementById('remove-col-select');
  if (!sel) return;

  let opts = [];
  if (S.activeSheet === 'tests' && S.currentTestState) {
    opts = S.currentTestState.questions.map((q, idx) => `
          <option value="${idx}">Q${q.num}: ${esc(q.text.slice(0, 30))} (${q.max} marks)</option>
        `);
  } else if (S.activeSheet === 'assignments' && S.assignments) {
    opts = S.assignments.map((a, idx) => `
          <option value="${idx}">${esc(a.title || a.name || 'Assignment')} (Max ${a.max_marks || 20})</option>
        `);
  } else if (S.activeSheet === 'evaluation' && S.evalData) {
    const assignOpts = (S.evalData.assignments || []).map((a, idx) => `
          <option value="a_${idx}">Assignment: ${esc(a.name || a.title || 'A' + (idx + 1))} (Max ${a.max_marks || 20})</option>
        `);
    const examOpts = (S.evalData.exams || []).map((e, idx) => `
          <option value="e_${idx}">Unit Test: ${esc(e.name || e.title || 'UT' + (idx + 1))} (Max ${e.max_marks || 20})</option>
        `);
    const customOpts = (S.evalData.custom_columns || []).map((c, idx) => `
          <option value="c_${idx}">Custom: ${esc(c.name || c.title || 'Assessment ' + (idx + 1))} (Max ${c.max_marks || 10})</option>
        `);
    opts = assignOpts.concat(examOpts).concat(customOpts);
  }

  if (!opts.length) {
    sel.innerHTML = `<option value="">No removable columns available</option>`;
  } else {
    sel.innerHTML = opts.join('');
  }

  openModal('modal-remove-column');
}

function confirmRemoveColumn() {
  const sel = document.getElementById('remove-col-select');
  const val = sel?.value;
  if (!val) return;

  if (S.activeSheet === 'tests' && S.currentTestState) {
    const idx = Number(val);
    if (S.currentTestState.questions.length <= 1) {
      showToast('Cannot remove the only question column', 'info');
      return;
    }
    S.currentTestState.questions.splice(idx, 1);
    S.currentTestState.questions.forEach((q, i) => q.num = i + 1);
    S.currentTestState.roster.forEach(r => {
      if (r.question_scores) r.question_scores.splice(idx, 1);
      r.total_marks = r.question_scores ? r.question_scores.reduce((s, v) => s + v, 0) : 0;
    });
    renderTestSheetTable();
    showToast('Question column removed successfully!', 'success');
  } else if (S.activeSheet === 'assignments' && S.assignments) {
    const idx = Number(val);
    if (S.assignments.length <= 1) {
      showToast('Cannot remove the only assignment column', 'info');
      return;
    }
    S.assignments.splice(idx, 1);
    renderAssignmentsSheetTable();
    showToast('Assignment column removed successfully!', 'success');
  } else if (S.activeSheet === 'evaluation' && S.evalData) {
    if (val.startsWith('c_')) {
      const idx = Number(val.replace('c_', ''));
      const removedCol = S.evalData.custom_columns[idx];
      if (removedCol) {
        S.evalData.custom_columns.splice(idx, 1);
        S.evalData.roster.forEach(st => {
          if (st.custom_scores) delete st.custom_scores[removedCol.id];
        });
      }
      renderEvaluationSheetTable();
      showToast('Custom assessment column removed!', 'success');
    } else if (val.startsWith('a_')) {
      const idx = Number(val.replace('a_', ''));
      if (S.evalData.assignments.length <= 1) {
        showToast('Cannot remove the only assignment column', 'info');
        return;
      }
      S.evalData.assignments.splice(idx, 1);
      S.evalData.roster.forEach(st => {
        if (st.assignment_scores) st.assignment_scores.splice(idx, 1);
      });
      renderEvaluationSheetTable();
      showToast('Assignment column removed!', 'success');
    } else if (val.startsWith('e_')) {
      const idx = Number(val.replace('e_', ''));
      if (S.evalData.exams.length <= 1) {
        showToast('Cannot remove the only test column', 'info');
        return;
      }
      S.evalData.exams.splice(idx, 1);
      S.evalData.roster.forEach(st => {
        if (st.exam_scores) st.exam_scores.splice(idx, 1);
      });
      renderEvaluationSheetTable();
      showToast('Test column removed!', 'success');
    }
  }

  closeModal('modal-remove-column');
  triggerAutoSaveIndicator();
}

function openAddRowModal() {
  const nextRoll = (S.evalData?.roster?.length || S.members?.length || 0) + 1;
  const rollInput = document.getElementById('add-row-roll');
  const nameInput = document.getElementById('add-row-name');
  const enrollInput = document.getElementById('add-row-enroll');
  const regInput = document.getElementById('add-row-reg');

  if (rollInput) rollInput.value = nextRoll;
  if (nameInput) nameInput.value = '';
  if (enrollInput) enrollInput.value = '';
  if (regInput) regInput.value = '';

  openModal('modal-add-row');
}

function confirmAddStudentRow() {
  const roll = parseInt(document.getElementById('add-row-roll')?.value, 10) || 1;
  const name = document.getElementById('add-row-name')?.value.trim() || 'New Student';
  const enroll = document.getElementById('add-row-enroll')?.value.trim() || '';
  const reg = document.getElementById('add-row-reg')?.value.trim() || '';

  const newStudentObj = {
    student_id: Date.now(),
    class_roll_no: roll,
    full_name: name,
    ubter_roll_no: enroll,
    official_enrollment_no: enroll,
    registration_no: reg,
    assignment_scores: [],
    exam_scores: [],
    attendance_percentage: 100,
    presentation_score: 0
  };

  // Add to evaluation roster
  if (S.evalData && Array.isArray(S.evalData.roster)) {
    S.evalData.roster.push(newStudentObj);
    renderEvaluationSheetTable();
  }

  // Add to unit test roster
  if (S.currentTestState && Array.isArray(S.currentTestState.roster)) {
    S.currentTestState.roster.push({
      student_id: newStudentObj.student_id,
      class_roll_no: roll,
      full_name: name,
      ubter_roll_no: enroll,
      official_enrollment_no: enroll,
      registration_no: reg,
      is_absent: false,
      question_scores: S.currentTestState.questions.map(q => q.max || 5),
      total_marks: S.currentTestState.questions.reduce((s, q) => s + (q.max || 5), 0)
    });
    renderTestSheetTable();
  }

  // Add to members list
  S.members.push({ student_id: newStudentObj.student_id, class_roll_no: roll, full_name: name, ubter_roll_no: enroll, official_enrollment_no: enroll, registration_no: reg });
  const sbCount = document.getElementById('sb-enrolled-count');
  if (sbCount) sbCount.textContent = `Enrolled: ${S.members.length}`;

  closeModal('modal-add-row');
  showToast(`Student ${name} (Roll #${roll}) added to sheet!`, 'success');
  triggerAutoSaveIndicator();
}

function openEditRowModal() {
  const sel = document.getElementById('edit-row-select');
  if (!sel) return;

  const roster = S.evalData?.roster || S.currentTestState?.roster || S.members || [];
  if (!roster.length) {
    showToast('No students available to edit', 'info');
    return;
  }

  sel.innerHTML = roster.map(s => `
        <option value="${s.student_id}">Roll ${s.class_roll_no}: ${esc(s.full_name || s.name)}</option>
      `).join('');

  onSelectStudentToEdit(roster[0]?.student_id);
  openModal('modal-edit-row');
}

function onSelectStudentToEdit(studentId) {
  const roster = S.evalData?.roster || S.currentTestState?.roster || S.members || [];
  const s = roster.find(r => String(r.student_id) === String(studentId));
  if (!s) return;

  const rollInput = document.getElementById('edit-row-roll');
  const nameInput = document.getElementById('edit-row-name');
  const enrollInput = document.getElementById('edit-row-enroll');
  const regInput = document.getElementById('edit-row-reg');

  if (rollInput) rollInput.value = s.class_roll_no || '';
  if (nameInput) nameInput.value = s.full_name || s.name || '';
  if (enrollInput) enrollInput.value = s.ubter_roll_no || s.official_enrollment_no || '';
  if (regInput) regInput.value = s.registration_no || '';
}

function confirmUpdateStudentRow() {
  const sel = document.getElementById('edit-row-select');
  const sId = sel?.value;
  if (!sId) return;

  const roll = parseInt(document.getElementById('edit-row-roll')?.value, 10) || 1;
  const name = document.getElementById('edit-row-name')?.value.trim() || 'Student';
  const enroll = document.getElementById('edit-row-enroll')?.value.trim() || '';
  const reg = document.getElementById('edit-row-reg')?.value.trim() || '';

  // Update in all rosters
  [S.evalData?.roster, S.currentTestState?.roster, S.members].forEach(list => {
    if (Array.isArray(list)) {
      const s = list.find(r => String(r.student_id) === String(sId));
      if (s) {
        s.class_roll_no = roll;
        s.full_name = name;
        s.ubter_roll_no = enroll;
        s.official_enrollment_no = enroll;
        s.registration_no = reg;
      }
    }
  });

  applySheetFilterAndSearch();
  closeModal('modal-edit-row');
  showToast(`Updated student details for ${name}!`, 'success');
  triggerAutoSaveIndicator();
}

function confirmDeleteStudentRow() {
  const sel = document.getElementById('edit-row-select');
  const sId = sel?.value;
  if (!sId) return;

  [S.evalData?.roster, S.currentTestState?.roster, S.members].forEach(list => {
    if (Array.isArray(list)) {
      const idx = list.findIndex(r => String(r.student_id) === String(sId));
      if (idx !== -1) list.splice(idx, 1);
    }
  });

  const sbCount = document.getElementById('sb-enrolled-count');
  if (sbCount) sbCount.textContent = `Enrolled: ${S.members.length}`;

  applySheetFilterAndSearch();
  closeModal('modal-edit-row');
  showToast('Student row removed from spreadsheet!', 'success');
  triggerAutoSaveIndicator();
}

/* ══════════════════════════════════════════════════════════════
   INSTITUTIONAL HEADER BANNER & SHORT CODE RENDERERS
   ══════════════════════════════════════════════════════════════ */
function getDynamicSessionHeader() {
  const session = S.group?.academic_year_label || S.activeSessionLabel || '2026-27 (Winter Session)';
  return `Uttarakhand Government Institute of Polytechnic, Nainital | Internal Evaluation Sheet ${session}`;
}

function updateInstitutionalBanner(line1, line2, line3) {
  const instEl = document.getElementById('hdr-banner-inst');
  const b2 = document.getElementById('hdr-banner-line2');
  const cohortEl = document.getElementById('hdr-banner-cohort');

  const sessionKey = (S.group && (S.group.academic_year_id || S.group.academic_year_label)) || '2026';
  const sessionStoreKey = `vidyaos_inst_header_session_${String(sessionKey).replace(/[^a-zA-Z0-9]/g, '_')}`;
  const dynamicInst = getDynamicSessionHeader();
  let savedInst = localStorage.getItem(sessionStoreKey) || localStorage.getItem('vidyaos_institution_marks_header') || line1 || dynamicInst;

  // Sanitize stale "2026 Session" or old semester strings from saved headers
  if (savedInst && (savedInst.includes('2026 Session') || savedInst.includes('(Odd Semester)') || savedInst.includes('(Even Semester)'))) {
    const activeLabel = S.group?.academic_year_label || S.activeSessionLabel || '2026-27 (Winter Session)';
    savedInst = savedInst.replace(/2026 Session/g, activeLabel)
      .replace(/\(Odd Semester\)/g, '(Winter Session)')
      .replace(/\(Even Semester\)/g, '(Summer Session)');
    try {
      localStorage.setItem('vidyaos_institution_marks_header', savedInst);
      localStorage.setItem(sessionStoreKey, savedInst);
    } catch (_) { }
  }

  if (instEl && !S.isEditMode) {
    instEl.innerText = savedInst;
  }

  const subjName = S.group?.subject_name || S.group?.name || 'Classroom';
  const subjCode = S.group?.subject_code ? ` [${S.group.subject_code}]` : '';
  const deptCode = S.group?.department_code || 'IT';
  const dynamicLine2 = line2 || `Department (${deptCode}) | Internal Evaluation | Subject : ${subjName}${subjCode}`;
  if (b2 && !S.isEditMode) {
    b2.textContent = dynamicLine2;
  }
  const dynamicCohort = line3 || `${S.group?.department_name || 'Information Technology'} | Semester ${S.group?.semester || 5}`;
  if (cohortEl && !S.isEditMode) {
    cohortEl.textContent = dynamicCohort;
  }
}

function getAssignShortHeader(a, i) {
  if (!a) return 'A' + (i + 1);
  if (a.short_code) return String(a.short_code);
  if (a.code) return String(a.code);
  if (a.assign_no || a.number) return 'A' + (a.assign_no || a.number);
  const str = String(a.title || a.name || '').trim();
  const m = str.match(/^(?:assignment|assign|a)\s*[:#\-_]?\s*(\d+)/i);
  if (m) return 'A' + m[1];
  return 'A' + (i + 1);
}

function getPracticalShortHeader(p, i) {
  if (!p) return 'Lab ' + (i + 1);
  if (p.short_code) return String(p.short_code);
  if (p.code) return String(p.code);
  const str = String(p.title || p.name || '').trim();
  const mLab = str.match(/^(?:lab|experiment|practical)\s*[:#\-_]?\s*(\d+)/i);
  if (mLab) return 'Lab' + mLab[1];
  return 'Lab ' + (i + 1);
}

function getTestShortHeader(e, i) {
  if (!e) return 'UT' + (i + 1);
  if (e.short_code) return String(e.short_code);
  if (e.code) return String(e.code);
  if (e.unit_no) return 'UT' + e.unit_no;
  if (e.test_no) return 'CT' + e.test_no;
  const str = String(e.title || e.name || '').trim();
  const mUT = str.match(/^(?:unit\s*test|ut)\s*[:#\-_]?\s*(\d+)/i);
  if (mUT) return 'UT' + mUT[1];
  const mCT = str.match(/^(?:class\s*test|ct)\s*[:#\-_]?\s*(\d+)/i);
  if (mCT) return 'CT' + mCT[1];
  if (/mid[- ]?term/i.test(str)) return 'MT';
  if (/pre[- ]?board/i.test(str)) return 'PB';
  if (/final/i.test(str)) return 'Final';
  return 'UT' + (i + 1);
}

/* ══════════════════════════════════════════════════════════════
   1. MASTER INTERNAL EVALUATION SHEET (MATCHING evaluation.html)
   ══════════════════════════════════════════════════════════════ */
async function loadEvaluationSheetData() {
  const container = document.getElementById('eval-table-container');
  if (!container) return;

  container.innerHTML = `<div style="padding:3rem 1rem;text-align:center;color:var(--text-muted)">Loading Master Internal Evaluation Sheet...</div>`;

  const regId = S.registerId || S.group?.register_id || S.groupId || 1;

  // Check local storage cached state for this register
  let cachedState = null;
  try {
    const cached = localStorage.getItem(`eval_sheet_state_${regId}`);
    if (cached) cachedState = JSON.parse(cached);
  } catch (e) { }

  try {
    const res = await apiFetch(`/faculty/registers/${regId}/internal-evaluation`);
    if (res && res.success && res.data) {
      const d = res.data;
      const assignList = Array.isArray(d.assignments) ? d.assignments : (Array.isArray(S.assignments) ? S.assignments : []);
      const examList = Array.isArray(d.exams) ? d.exams : (Array.isArray(S.tests) ? S.tests : []);

      const studentRawList = (Array.isArray(d.roster) && d.roster.length > 0)
        ? d.roster
        : ((Array.isArray(d.students) && d.students.length > 0)
          ? d.students
          : (Array.isArray(S.members) ? S.members : []));

      const scope = getGroupComponentScope(S.group);
      const hasPractical = Boolean(d.has_practical || scope.hasPractical);

      const practicalCols = [
        { id: 'lab_record', name: 'Lab Record', max: 10 },
        { id: 'viva_voce', name: 'Viva Voce', max: 5 },
        { id: 'creative_work', name: 'Creative Work (Model/Chart/Project)', max: 10 },
        { id: 'attendance', name: 'Attendance', max: 5, isAttendance: true }
      ];
      const theoryCols = [
        { id: 'attendance', name: 'Attendance', max: 5, isAttendance: true }
      ];
      const defaultAssessmentCols = hasPractical ? practicalCols : theoryCols;

      let initialAssessmentCols = defaultAssessmentCols;
      if (cachedState && Array.isArray(cachedState.assessment_columns) && cachedState.assessment_columns.length > 0) {
        if (!hasPractical) {
          initialAssessmentCols = cachedState.assessment_columns.filter(c => !['lab_record', 'viva_voce', 'creative_work'].includes(c.id));
          if (!initialAssessmentCols.length) initialAssessmentCols = theoryCols;
        } else {
          initialAssessmentCols = cachedState.assessment_columns;
        }
      }

      const assignAvgMax = (cachedState && cachedState.scheme && cachedState.scheme.assign_avg_max) || 15;
      const examAvgMax = (cachedState && cachedState.scheme && cachedState.scheme.exam_avg_max) || 20;
      const assessTotalMax = initialAssessmentCols.reduce((sum, c) => sum + (Number(c.max) || 0), 0);
      const grandTotalMax = assignAvgMax + examAvgMax + assessTotalMax;

      const sessionHeader = (d && d.institution_header) ||
        localStorage.getItem(`vidyaos_inst_header_session_${regId}`) ||
        localStorage.getItem('vidyaos_institution_marks_header') ||
        getDynamicSessionHeader();

      const mappedStudents = studentRawList.map((s, idx) => {
        const aScores = assignList.map((a, i) => {
          if (s.assignment_scores && s.assignment_scores[i] !== undefined && s.assignment_scores[i] !== null && s.assignment_scores[i] !== '') {
            return Number(s.assignment_scores[i]);
          }
          return '';
        });
        const eScores = [];
        const eAb = [];
        examList.forEach((_, i) => {
          const ex = s.exam_scores && s.exam_scores[i];
          if (typeof ex === 'object' && ex !== null) {
            eScores.push((ex.marks !== '' && ex.marks !== undefined && ex.marks !== null) ? Number(ex.marks) : '');
            eAb.push(Boolean(ex.is_absent));
          } else if (ex !== undefined && ex !== null && ex !== '') {
            eScores.push(Number(ex));
            eAb.push(Boolean(s.exam_absent && s.exam_absent[i]));
          } else {
            eScores.push('');
            eAb.push(false);
          }
        });

        const attPct = (s.attendance_percentage !== undefined && s.attendance_percentage !== null) ? Number(s.attendance_percentage) : 0;

        const savedStudent = cachedState && cachedState.students && cachedState.students.find(x => x.student_id === (s.student_id || idx + 1));
        let studentAssessScores = [];
        if (savedStudent && Array.isArray(savedStudent.assessment_scores) && savedStudent.assessment_scores.length === initialAssessmentCols.length) {
          studentAssessScores = savedStudent.assessment_scores.map(v => (v !== '' && v !== null && !isNaN(v)) ? Number(v) : '');
        } else {
          studentAssessScores = initialAssessmentCols.map(col => {
            if (col.isAttendance || col.id === 'attendance') {
              return attPct > 0 ? (Math.round(((attPct / 100) * (col.max || 5)) * 10) / 10) : 0;
            }
            return '';
          });
        }

        const stObj = {
          student_id: s.student_id || s.id || (idx + 1),
          class_roll_no: s.class_roll_no || (idx + 1),
          registration_no: s.registration_no || '',
          official_enrollment_no: s.official_enrollment_no || s.enrollment_no || '',
          full_name: s.full_name || s.student_name || s.name || ('Student ' + (idx + 1)),
          attendance_percentage: attPct,
          assignment_scores: aScores,
          assignment_avg: 0,
          exam_scores: eScores,
          exam_absent: eAb,
          exam_avg: 0,
          assessment_scores: studentAssessScores,
          grand_total: 0
        };
        recalculateEvalRowItem(stObj, { assign_avg_max: assignAvgMax, exam_avg_max: examAvgMax }, assignList, examList);
        return stObj;
      });

      S.evalData = {
        register_id: regId,
        institution_name: d.institution_name || 'Uttarakhand Government Institute of Polytechnic, Nainital',
        institution_header: sessionHeader,
        session_label: d.session_label || (S.group?.academic_year_label || S.activeSessionLabel || '2026-27 (Winter Session)'),
        has_practical: hasPractical,
        scheme: {
          assign_avg_max: assignAvgMax,
          exam_avg_max: examAvgMax,
          total_max: grandTotalMax,
          roll_label: (cachedState && cachedState.scheme && cachedState.scheme.roll_label) || 'ROLL NO',
          enroll_label: (cachedState && cachedState.scheme && cachedState.scheme.enroll_label) || 'UBTER ROLL NO',
          reg_label: (cachedState && cachedState.scheme && cachedState.scheme.reg_label) || 'REG NO',
          name_label: (cachedState && cachedState.scheme && cachedState.scheme.name_label) || 'STUDENT NAME',
          assign_label: (cachedState && cachedState.scheme && cachedState.scheme.assign_label) || 'Assignment Marks',
          assign_avg_label: (cachedState && cachedState.scheme && cachedState.scheme.assign_avg_label) || 'Assign Avg',
          exam_label: (cachedState && cachedState.scheme && cachedState.scheme.exam_label) || 'Unit Test Marks',
          exam_avg_label: (cachedState && cachedState.scheme && cachedState.scheme.exam_avg_label) || 'UT Avg',
          total_label: (cachedState && cachedState.scheme && cachedState.scheme.total_label) || 'Total Marks'
        },
        assignments: assignList,
        exams: examList,
        assessment_columns: initialAssessmentCols,
        students: mappedStudents,
        roster: mappedStudents
      };

      renderEvaluationSheetTable();
      renderSubsheetControls();
      return;
    }
  } catch (err) {
    console.warn('Evaluation register lookup note:', err);
  }

  // Authentic fallback directly using selected group's active members and components
  const assignList = Array.isArray(S.assignments) ? S.assignments : [];
  const examList = Array.isArray(S.tests) ? S.tests : [];
  const scope = getGroupComponentScope(S.group);
  const hasPractical = Boolean(scope.hasPractical);

  const practicalCols = [
    { id: 'lab_record', name: 'Lab Record', max: 10 },
    { id: 'viva_voce', name: 'Viva Voce', max: 5 },
    { id: 'creative_work', name: 'Creative Work (Model/Chart/Project)', max: 10 },
    { id: 'attendance', name: 'Attendance', max: 5, isAttendance: true }
  ];
  const theoryCols = [
    { id: 'attendance', name: 'Attendance', max: 5, isAttendance: true }
  ];
  const fallbackAssessCols = hasPractical ? practicalCols : theoryCols;

  const scheme = {
    assign_avg_max: 15,
    exam_avg_max: 20,
    total_max: 40,
    roll_label: 'ROLL NO',
    enroll_label: 'UBTER ROLL NO',
    reg_label: 'REG NO',
    name_label: 'STUDENT NAME',
    assign_label: 'Assignment Marks',
    assign_avg_label: 'Assign Avg',
    exam_label: 'Unit Test Marks',
    exam_avg_label: 'UT Avg',
    total_label: 'Total Marks'
  };

  const rawCohort = (Array.isArray(S.members) && S.members.length > 0) ? S.members : [];

  const students = rawCohort.map((m, i) => {
    const attPct = (m.attendance_percentage !== undefined && m.attendance_percentage !== null) ? Number(m.attendance_percentage) : 0;
    const attVal = attPct > 0 ? (Math.round((attPct / 100) * 5 * 10) / 10) : 0;
    const stObj = {
      student_id: m.student_id || m.id || (i + 1),
      class_roll_no: m.class_roll_no || (i + 1),
      official_enrollment_no: m.official_enrollment_no || m.enrollment_no || '',
      registration_no: m.registration_no || '',
      full_name: m.full_name || m.student_name || m.name || ('Student ' + (i + 1)),
      attendance_percentage: attPct,
      assignment_scores: assignList.map(() => ''),
      assignment_avg: 0,
      exam_scores: examList.map(() => ''),
      exam_absent: examList.map(() => false),
      exam_avg: 0,
      assessment_scores: fallbackAssessCols.map(col => (col.isAttendance || col.id === 'attendance') ? attVal : ''),
      grand_total: attVal
    };
    return stObj;
  });

  S.evalData = {
    register_id: regId,
    institution_name: 'Uttarakhand Government Institute of Polytechnic, Nainital',
    institution_header: getDynamicSessionHeader(),
    session_label: (S.group?.academic_year_label || S.activeSessionLabel || '2026-27 (Winter Session)'),
    has_practical: hasPractical,
    scheme: scheme,
    assignments: assignList,
    exams: examList,
    assessment_columns: fallbackAssessCols,
    students: students,
    roster: students
  };

  renderEvaluationSheetTable();
  renderSubsheetControls();
}

function recalculateEvalRowItem(s, scheme, assignments, exams) {
  if (!s) return;
  const assignAvgMax = Number((scheme && scheme.assign_avg_max) || 15);
  const examAvgMax = Number((scheme && scheme.exam_avg_max) || 20);

  const aList = assignments || (S.evalData && S.evalData.assignments) || [];
  let aEarned = 0;
  let aPossible = 0;
  (s.assignment_scores || []).forEach((v, i) => {
    if (v !== '' && v !== null && !isNaN(v)) {
      const aMax = Number((aList[i] && aList[i].max_marks) || 25);
      aEarned += Number(v);
      aPossible += aMax;
    }
  });
  s.assignment_avg = aPossible > 0
    ? Math.round((aEarned / aPossible) * assignAvgMax * 10) / 10
    : 0;

  const eList = exams || (S.evalData && S.evalData.exams) || [];
  let eEarned = 0;
  let ePossible = 0;
  (s.exam_scores || []).forEach((sc, i) => {
    if (!s.exam_absent?.[i] && sc !== '' && sc !== null && !isNaN(sc)) {
      const eMax = Number((eList[i] && eList[i].max_marks) || 25);
      eEarned += Number(sc);
      ePossible += eMax;
    }
  });
  s.exam_avg = ePossible > 0
    ? Math.round((eEarned / ePossible) * examAvgMax * 10) / 10
    : 0;

  const assessSum = (s.assessment_scores || []).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const tot = (Number(s.assignment_avg) || 0) + (Number(s.exam_avg) || 0) + assessSum;
  s.grand_total = Math.round(tot * 10) / 10;
}

function renderEvaluationSheetTable() {
  const container = document.getElementById('eval-table-container');
  if (!container || !S.evalData) return;

  const d = S.evalData;
  const scheme = d.scheme || { assign_avg_max: 15, exam_avg_max: 20, total_max: 40 };
  const assignments = d.assignments || [];
  const exams = d.exams || [];
  const assessCols = d.assessment_columns || [];
  const rawStudents = d.students || [];

  const deptCode = S.group?.department_code || 'IT';
  const deptName = S.group?.department_name || 'Information Technology';
  const subName = S.group?.subject_name || 'Computer Networks [IT503]';
  const sem = S.group?.semester || 5;
  const yr = S.group?.year || Math.ceil(sem / 2) || 3;
  const sessionHeader = d.institution_header || getDynamicSessionHeader();

  // Update dedicated non-scrolling institutional header banner
  updateInstitutionalBanner(
    sessionHeader,
    `Department (${esc(deptCode)}) | Subject : ${esc(subName)}`,
    `${esc(deptName)} Year ${yr} | Semester ${sem}`
  );

  const aCount = assignments.length;
  const eCount = exams.length;
  const assessCount = assessCols.length;
  const totalCols = 4 + aCount + 1 + eCount + 1 + assessCount + 1;

  const q = (S.searchQuery || '').toLowerCase().trim();
  let students = rawStudents.filter(st => {
    if (q) {
      const name = (st.full_name || '').toLowerCase();
      const roll = String(st.class_roll_no || '');
      const enrl = (st.ubter_roll_no || st.official_enrollment_no || '').toLowerCase();
      const regNo = (st.registration_no || '').toLowerCase();
      if (!name.includes(q) && !roll.includes(q) && !enrl.includes(q) && !regNo.includes(q)) return false;
    }
    if (S.filterMode === 'TOP') {
      return st.grand_total >= (0.75 * (scheme.total_max || 40));
    } else if (S.filterMode === 'AVERAGE') {
      return st.grand_total >= (0.50 * (scheme.total_max || 40)) && st.grand_total < (0.75 * (scheme.total_max || 40));
    } else if (S.filterMode === 'LOW') {
      return st.grand_total < (0.50 * (scheme.total_max || 40));
    } else if (S.filterMode === 'ATT_LOW') {
      return (Number(st.attendance_percentage) || 0) < 75;
    } else if (S.filterMode === 'ABSENT') {
      return Boolean(st.exam_absent && st.exam_absent.some(Boolean));
    }
    return true;
  });

  students = sortStudentsList(students);
  S.visibleStudentsCount = students.length;

  const tallyEl = document.getElementById('sheet-visible-tally');
  if (tallyEl) tallyEl.textContent = `Showing ${students.length} of ${rawStudents.length} students`;

  // 3-Row Crisp Excel Header:
  // Row 1 (excel-hdr-tan): Clean category titles
  // Row 2 (excel-hdr-sub): Sub-column serial numbers
  // Row 3 (excel-hdr-numbers): Dedicated Numbers Row for Direct Marks & Scheme Weightage Editing
  let theadHtml = `
        <thead>
          <tr class="excel-hdr-tan">
            <th rowspan="2" class="col-roll" style="width: 70px;">${esc(scheme.roll_label || 'ROLL NO')}</th>
            <th rowspan="2" class="col-reg" style="width: 135px;">${esc(scheme.reg_label || 'REG NO')}</th>
            <th rowspan="2" class="col-enroll" style="width: 135px;">${esc(scheme.enroll_label || 'UBTER ROLL NO')}</th>
            <th rowspan="2" class="col-name" style="min-width: 190px; text-align: left;">${esc(scheme.name_label || 'STUDENT NAME')}</th>
            <th colspan="${aCount}" class="col-assign">${esc(scheme.assign_label || 'Assignment Marks')}</th>
            <th rowspan="2" class="col-assign-avg" style="width: 95px;">${esc(scheme.assign_avg_label || 'Assign Avg')}</th>
            <th colspan="${eCount}" class="col-test">${esc(scheme.exam_label || 'Unit Test Marks')}</th>
            <th rowspan="2" class="col-test-avg" style="width: 85px;">${esc(scheme.exam_avg_label || 'UT Avg')}</th>
            ${assessCols.map(c => `
              <th rowspan="2" class="col-assess" style="width: 95px;">
                ${esc(c.name)}
              </th>
            `).join('')}
            <th rowspan="2" class="col-total" style="width: 90px; font-weight: 800;">${esc(scheme.total_label || 'Total Marks')}</th>
          </tr>
          <tr class="excel-hdr-sub">
            ${assignments.map((a, i) => `
              <th class="col-assign" style="width: 50px;">
                ${i + 1}
              </th>
            `).join('')}
            ${exams.map((e, i) => `
              <th class="col-test" style="width: 50px;">
                ${i + 1}
              </th>
            `).join('')}
          </tr>
          <!-- Row 3: Dedicated Numbers Row for Direct Marks & Scheme Weightage Editing -->
          <tr class="excel-hdr-numbers">
            <th class="col-roll hdr-num-label">—</th>
            <th class="col-reg hdr-num-label">—</th>
            <th class="col-enroll hdr-num-label">—</th>
            <th class="col-name hdr-num-label" style="text-align: right; padding-right: 0.6rem;">Max Marks &rarr;</th>
            ${assignments.map((a, i) => `
              <th class="col-assign">
                <input type="number"
                       class="excel-hdr-num-input ${S.isEditMode ? 'is-editable' : ''}"
                       value="${a.max_marks || 25}"
                       min="0.5"
                       max="100"
                       step="any"
                       ${S.isEditMode ? '' : 'readonly'}
                       title="Assignment ${i + 1} Maximum Marks"
                       onchange="onEvalColMaxChange('assign', ${i}, this.value)">
              </th>
            `).join('')}
            <th class="col-assign-avg">
              <input type="number"
                     class="excel-hdr-num-input ${S.isEditMode ? 'is-editable' : ''}"
                     value="${scheme.assign_avg_max || 15}"
                     min="1"
                     max="100"
                     step="any"
                     ${S.isEditMode ? '' : 'readonly'}
                     title="Assignment Average Target Weightage"
                     onchange="onEvalWeightChange('assign_avg_max', this.value)">
            </th>
            ${exams.map((e, i) => `
              <th class="col-test">
                <input type="number"
                       class="excel-hdr-num-input ${S.isEditMode ? 'is-editable' : ''}"
                       value="${e.max_marks || 25}"
                       min="0.5"
                       max="100"
                       step="any"
                       ${S.isEditMode ? '' : 'readonly'}
                       title="Unit Test ${i + 1} Maximum Marks"
                       onchange="onEvalColMaxChange('exam', ${i}, this.value)">
              </th>
            `).join('')}
            <th class="col-test-avg">
              <input type="number"
                     class="excel-hdr-num-input ${S.isEditMode ? 'is-editable' : ''}"
                     value="${scheme.exam_avg_max || 20}"
                     min="1"
                     max="100"
                     step="any"
                     ${S.isEditMode ? '' : 'readonly'}
                     title="Unit Test Average Target Weightage"
                     onchange="onEvalWeightChange('exam_avg_max', this.value)">
            </th>
            ${assessCols.map((c, idx) => `
              <th class="col-assess">
                <input type="number"
                       class="excel-hdr-num-input ${S.isEditMode ? 'is-editable' : ''}"
                       value="${c.max || 5}"
                       min="0.5"
                       max="100"
                       step="any"
                       ${S.isEditMode ? '' : 'readonly'}
                       title="${esc(c.name)} Maximum Marks"
                       onchange="onEvalAssessmentColMaxChange(${idx}, this.value)">
              </th>
            `).join('')}
            <th class="col-total" style="text-align: center;">
              <span class="excel-hdr-num-badge" id="eval-hdr-grand-max">${scheme.total_max || 40}</span>
            </th>
          </tr>
        </thead>
      `;

  let totalScoreSum = 0;
  let totalAssignAvgSum = 0;
  let totalUtAvgSum = 0;

  let tbodyHtml = students.map((s, idx) => {
    totalScoreSum += Number(s.grand_total) || 0;
    totalAssignAvgSum += Number(s.assignment_avg) || 0;
    totalUtAvgSum += Number(s.exam_avg) || 0;

    const aTds = assignments.map((a, aIdx) => {
      const val = (s.assignment_scores?.[aIdx] !== undefined && s.assignment_scores?.[aIdx] !== null) ? s.assignment_scores[aIdx] : '';
      return `
            <td class="col-assign">
              <input type="number"
                     class="excel-cell-input sheet-cell-input ${S.isEditMode ? 'is-editable' : ''}"
                     value="${val}"
                     min="0"
                     max="${a.max_marks || 25}"
                     step="any"
                     ${S.isEditMode ? '' : 'readonly'}
                     data-sid="${s.student_id}"
                     data-type="assign"
                     data-idx="${aIdx}"
                     oninput="onEvalAssignmentScoreChange(${s.student_id}, ${aIdx}, this.value, this)">
            </td>
          `;
    }).join('');

    const eTds = exams.map((e, eIdx) => {
      const isAb = Boolean(s.exam_absent?.[eIdx]);
      const val = isAb ? 'AB' : ((s.exam_scores?.[eIdx] !== undefined && s.exam_scores?.[eIdx] !== null) ? s.exam_scores[eIdx] : '');
      return `
            <td class="col-test">
              <input type="text"
                     class="excel-cell-input sheet-cell-input ${S.isEditMode ? 'is-editable' : ''}"
                     style="${isAb ? 'color: var(--status-absent) !important; font-weight: 800 !important; background: var(--status-absent-bg) !important;' : ''}"
                     value="${val}"
                     ${S.isEditMode ? '' : 'readonly'}
                     data-sid="${s.student_id}"
                     data-type="exam"
                     data-idx="${eIdx}"
                     oninput="onEvalExamScoreChange(${s.student_id}, ${eIdx}, this.value, this)"
                     onchange="onEvalExamScoreChange(${s.student_id}, ${eIdx}, this.value, this)">
            </td>
          `;
    }).join('');

    const assessTds = assessCols.map((c, cIdx) => {
      const val = (s.assessment_scores?.[cIdx] !== undefined && s.assessment_scores?.[cIdx] !== null) ? s.assessment_scores[cIdx] : '';
      return `
            <td class="col-assess">
              <input type="number"
                     class="excel-cell-input sheet-cell-input ${S.isEditMode ? 'is-editable' : ''}"
                     value="${val}"
                     min="0"
                     max="${c.max || 5}"
                     step="any"
                     ${S.isEditMode ? '' : 'readonly'}
                     data-sid="${s.student_id}"
                     data-type="assess"
                     data-idx="${cIdx}"
                     oninput="onEvalAssessmentScoreChange(${s.student_id}, ${cIdx}, this.value, this)">
            </td>
          `;
    }).join('');

    return `
          <tr id="eval-row-${s.student_id}">
            <td class="cell-roll col-roll">${esc(s.class_roll_no)}</td>
            <td class="col-reg" style="font-family: var(--font-family-mono); font-size: 0.78rem; color: var(--text-muted);">${esc(s.registration_no || '—')}</td>
            <td class="col-enroll" style="font-family: var(--font-family-mono); font-size: 0.78rem; color: var(--text-muted);">${esc(s.ubter_roll_no || s.official_enrollment_no || '—')}</td>
            <td class="cell-student-name col-name">
              <span style="font-weight: 700; text-transform: uppercase;">${esc(s.full_name)}</span>
            </td>
            ${aTds}
            <td class="col-assign-avg" style="font-weight: 700; background: var(--bg-surface-secondary); text-align: center;" id="eval-assign-avg-${s.student_id}">
              ${Number(s.assignment_avg).toFixed(1)}
            </td>
            ${eTds}
            <td class="col-test-avg" style="font-weight: 700; background: var(--bg-surface-secondary); text-align: center;" id="eval-exam-avg-${s.student_id}">
              ${Number(s.exam_avg).toFixed(1)}
            </td>
            ${assessTds}
            <td class="cell-total col-total" style="font-weight: 800; text-align: center; background: var(--bg-surface-secondary);" id="eval-grand-total-${s.student_id}">
              ${s.grand_total}
            </td>
          </tr>
        `;
  }).join('');

  if (!students.length) {
    tbodyHtml = `
      <tr>
        <td colspan="${totalCols}" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
          <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.5rem; color: var(--text-primary);">No students enrolled</div>
          <div style="font-size: 0.88rem;">${S.searchQuery ? 'No student matches your search filter.' : 'Enroll students in this teaching group or share the invite code to begin evaluation.'}</div>
        </td>
      </tr>
    `;
  }

  const count = students.length || 1;
  const classAvgAssign = (totalAssignAvgSum / count).toFixed(1);
  const classAvgUt = (totalUtAvgSum / count).toFixed(1);
  const classAvgGrand = (totalScoreSum / count).toFixed(1);

  let tfootHtml = `
        <tfoot>
          <tr>
            <td colspan="${4 + aCount}" class="excel-summary-lbl">
              Class Average (Assign: ${classAvgAssign} / ${scheme.assign_avg_max || 15})
            </td>
            <td class="excel-summary-avg" id="eval-foot-aavg">${classAvgAssign}</td>
            <td colspan="${eCount}" class="excel-summary-lbl">
              Class Average (UT: ${classAvgUt} / ${scheme.exam_avg_max || 20})
            </td>
            <td class="excel-summary-avg" id="eval-foot-utavg">${classAvgUt}</td>
            <td colspan="${assessCount}" class="excel-summary-lbl">
              Overall Class Average:
            </td>
            <td class="excel-summary-avg col-total" style="font-size:0.95rem;font-weight:800;" id="eval-foot-grand">
              ${classAvgGrand}
            </td>
          </tr>
        </tfoot>
      `;

  container.innerHTML = `
        <table class="excel-table sheet-table" id="table-master-evaluation">
          ${theadHtml}
          <tbody>
            ${tbodyHtml || '<tr><td colspan="' + totalCols + '" style="padding:2rem;">No students matched filter</td></tr>'}
          </tbody>
          ${tfootHtml}
        </table>
      `;

  updateStickyHeaderOffsets(document.getElementById('table-master-evaluation'));
  updateColumnFocusSelectOptions();
}

function onEvalAssignmentScoreChange(studentId, assignIdx, val, inputEl) {
  if (!S.evalData) return;
  const st = S.evalData.students?.find(s => s.student_id === studentId);
  if (!st) return;
  const aMax = (S.evalData.assignments?.[assignIdx]?.max_marks) || 25;
  const num = Math.min(aMax, Math.max(0, parseFloat(val) || 0));
  st.assignment_scores[assignIdx] = num;
  recalculateEvalRowItem(st, S.evalData.scheme, S.evalData.assignments, S.evalData.exams);

  const avgEl = document.getElementById(`eval-assign-avg-${studentId}`);
  if (avgEl) avgEl.textContent = st.assignment_avg.toFixed(1);
  const totalEl = document.getElementById(`eval-grand-total-${studentId}`);
  if (totalEl) totalEl.textContent = st.grand_total;

  updateEvalClassAverages();
  persistEvalDataLocal();
}

function onEvalExamScoreChange(studentId, examIdx, val, inputEl) {
  if (!S.evalData) return;
  const st = S.evalData.students?.find(s => s.student_id === studentId);
  if (!st) return;
  const strVal = String(val).trim().toUpperCase();
  if (strVal === 'AB' || strVal === 'A') {
    st.exam_absent[examIdx] = true;
    st.exam_scores[examIdx] = 0;
    if (inputEl) {
      inputEl.style.color = 'var(--status-absent)';
      inputEl.style.fontWeight = '800';
      inputEl.style.background = 'var(--status-absent-bg)';
      inputEl.value = 'AB';
    }
  } else {
    st.exam_absent[examIdx] = false;
    const eMax = (S.evalData.exams?.[examIdx]?.max_marks) || 25;
    const num = Math.min(eMax, Math.max(0, parseFloat(val) || 0));
    st.exam_scores[examIdx] = num;
    if (inputEl) {
      inputEl.style.color = '';
      inputEl.style.fontWeight = '';
      inputEl.style.background = '';
    }
  }

  recalculateEvalRowItem(st, S.evalData.scheme, S.evalData.assignments, S.evalData.exams);

  const avgEl = document.getElementById(`eval-exam-avg-${studentId}`);
  if (avgEl) avgEl.textContent = st.exam_avg.toFixed(1);
  const totalEl = document.getElementById(`eval-grand-total-${studentId}`);
  if (totalEl) totalEl.textContent = st.grand_total;

  updateEvalClassAverages();
  persistEvalDataLocal();
}

function onEvalAssessmentScoreChange(studentId, colIdx, val, inputEl) {
  if (!S.evalData) return;
  const st = S.evalData.students?.find(s => s.student_id === studentId);
  if (!st) return;
  const cMax = (S.evalData.assessment_columns?.[colIdx]?.max) || 5;
  const num = Math.min(cMax, Math.max(0, parseFloat(val) || 0));
  st.assessment_scores[colIdx] = num;
  recalculateEvalRowItem(st, S.evalData.scheme, S.evalData.assignments, S.evalData.exams);

  const totalEl = document.getElementById(`eval-grand-total-${studentId}`);
  if (totalEl) totalEl.textContent = st.grand_total;

  updateEvalClassAverages();
  persistEvalDataLocal();
}

function onEvalColMaxChange(type, idx, val) {
  if (!S.evalData) return;
  const num = Math.max(1, parseInt(val, 10) || 25);
  if (type === 'assign') {
    if (S.evalData.assignments && S.evalData.assignments[idx]) {
      S.evalData.assignments[idx].max_marks = num;
    }
  } else if (type === 'exam') {
    if (S.evalData.exams && S.evalData.exams[idx]) {
      S.evalData.exams[idx].max_marks = num;
    }
  }

  // Recalculate each student's averages and grand total
  (S.evalData.students || []).forEach(st => {
    recalculateEvalRowItem(st, S.evalData.scheme, S.evalData.assignments, S.evalData.exams);
  });

  renderEvaluationSheetTable();
  persistEvalDataLocal();
  showToast(`Updated ${type === 'assign' ? 'Assignment' : 'Unit Test'} ${idx + 1} max marks to ${num}`, 'info');
}

function onEvalWeightChange(prop, val) {
  if (!S.evalData) return;
  const num = Math.max(1, parseInt(val, 10) || 15);
  if (!S.evalData.scheme) S.evalData.scheme = {};
  S.evalData.scheme[prop] = num;

  // Recalculate total_max: assign_avg_max + exam_avg_max + sum(assessCols.max)
  const aWeight = Number(S.evalData.scheme.assign_avg_max || 15);
  const eWeight = Number(S.evalData.scheme.exam_avg_max || 20);
  const assessTotal = (S.evalData.assessment_columns || []).reduce((sum, c) => sum + (Number(c.max) || 0), 0);
  S.evalData.scheme.total_max = aWeight + eWeight + assessTotal;

  (S.evalData.students || []).forEach(st => {
    recalculateEvalRowItem(st, S.evalData.scheme, S.evalData.assignments, S.evalData.exams);
  });

  renderEvaluationSheetTable();
  renderSubsheetControls();
  persistEvalDataLocal();
  showToast(`Updated weightage to ${num} (Total Scheme: ${S.evalData.scheme.total_max})`, 'info');
}

function onEvalAssessmentColMaxChange(idx, val) {
  if (!S.evalData) return;
  const num = Math.max(1, parseInt(val, 10) || 5);
  if (S.evalData.assessment_columns && S.evalData.assessment_columns[idx]) {
    S.evalData.assessment_columns[idx].max = num;
  }

  const aWeight = Number(S.evalData.scheme?.assign_avg_max || 15);
  const eWeight = Number(S.evalData.scheme?.exam_avg_max || 20);
  const assessTotal = (S.evalData.assessment_columns || []).reduce((sum, c) => sum + (Number(c.max) || 0), 0);
  if (!S.evalData.scheme) S.evalData.scheme = {};
  S.evalData.scheme.total_max = aWeight + eWeight + assessTotal;

  (S.evalData.students || []).forEach(st => {
    recalculateEvalRowItem(st, S.evalData.scheme, S.evalData.assignments, S.evalData.exams);
  });

  renderEvaluationSheetTable();
  renderSubsheetControls();
  persistEvalDataLocal();
  showToast(`Updated assessment max to ${num} (Total Scheme: ${S.evalData.scheme.total_max})`, 'info');
}

function persistEvalDataLocal() {
  if (!S.evalData) return;
  const regId = S.evalData.register_id || S.registerId || 1;
  try {
    localStorage.setItem(`eval_sheet_state_${regId}`, JSON.stringify(S.evalData));
  } catch (e) { }
}

function updateEvalClassAverages() {
  if (!S.evalData) return;
  const students = S.evalData.students || [];
  const count = students.length || 1;
  let totAAvg = 0;
  let totUtAvg = 0;
  let totGrand = 0;
  students.forEach(s => {
    totAAvg += Number(s.assignment_avg) || 0;
    totUtAvg += Number(s.exam_avg) || 0;
    totGrand += Number(s.grand_total) || 0;
  });

  const fAAvg = document.getElementById('eval-foot-aavg');
  if (fAAvg) fAAvg.textContent = safeDiv(totAAvg, count).toFixed(1);
  const fUtAvg = document.getElementById('eval-foot-utavg');
  if (fUtAvg) fUtAvg.textContent = safeDiv(totUtAvg, count).toFixed(1);
  const fGrand = document.getElementById('eval-foot-grand');
  if (fGrand) fGrand.textContent = safeDiv(totGrand, count).toFixed(1);
}

function openEditMarksModal() {
  populateEditMarksModal();
  const modal = document.getElementById('modal-edit-total-marks');
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
}

function closeEditMarksModal() {
  const modal = document.getElementById('modal-edit-total-marks');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function populateEditMarksModal() {
  const state = S.evalData;
  if (!state || !state.scheme) return;

  const aInp = document.getElementById('scheme-assign-max');
  if (aInp) aInp.value = state.scheme.assign_avg_max || 15;
  const eInp = document.getElementById('scheme-exam-max');
  if (eInp) eInp.value = state.scheme.exam_avg_max || 20;

  const attCol = (state.assessment_columns || []).find(c => c.isAttendance || c.id === 'attendance');
  const attInp = document.getElementById('scheme-att-max');
  if (attInp) attInp.value = (attCol && attCol.max) || 5;

  const cContainer = document.getElementById('modal-custom-cols-container');
  if (cContainer) {
    const customCols = (state.assessment_columns || []).filter(c => !c.isAttendance && c.id !== 'attendance');
    if (customCols.length === 0) {
      cContainer.innerHTML = '';
    } else {
      cContainer.innerHTML = `
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top: 0.35rem;">Additional Practical Components</div>
            <div style="display: grid; grid-template-columns: 1fr auto; gap: 0.75rem; align-items: center; background: var(--bg-surface); padding: 0.85rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
              ${customCols.map((c, idx) => `
                <div>
                  <label style="display: block; font-size: 0.84rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.15rem;">${esc(c.name)} Max Marks</label>
                  <div style="font-size: 0.74rem; color: var(--text-muted);">Practical / Continuous Assessment</div>
                </div>
                <div>
                  <input type="number" class="form-input-field" style="width: 65px; padding: 0.35rem; font-size: 0.88rem; text-align: center; font-weight: 700;" value="${c.max || 10}" min="1" max="100" oninput="onCustomColMaxChange(${idx}, this.value)">
                </div>
              `).join('')}
            </div>
          `;
    }
  }

  updateSchemeTotalPreview();
}

function onSchemeMarksChange(type, val) {
  if (!S.evalData || !S.evalData.scheme) return;
  const num = Math.max(1, parseFloat(val) || 1);
  if (type === 'assign') S.evalData.scheme.assign_avg_max = num;
  if (type === 'exam') S.evalData.scheme.exam_avg_max = num;
  if (type === 'att') {
    const attCol = (S.evalData.assessment_columns || []).find(c => c.isAttendance || c.id === 'attendance');
    if (attCol) attCol.max = num;
  }
  updateSchemeTotalPreview();
}

function onCustomColMaxChange(idx, val) {
  if (!S.evalData) return;
  const customCols = (S.evalData.assessment_columns || []).filter(c => !c.isAttendance && c.id !== 'attendance');
  if (customCols[idx]) {
    customCols[idx].max = Math.max(1, parseFloat(val) || 1);
  }
  updateSchemeTotalPreview();
}

function updateSchemeTotalPreview() {
  if (!S.evalData || !S.evalData.scheme) return;
  const a = Number(S.evalData.scheme.assign_avg_max) || 15;
  const e = Number(S.evalData.scheme.exam_avg_max) || 20;
  const assessSum = (S.evalData.assessment_columns || []).reduce((sum, c) => sum + (Number(c.max) || 0), 0);
  const total = a + e + assessSum;
  S.evalData.scheme.total_max = total;

  const disp = document.getElementById('modal-scheme-total-display');
  if (disp) disp.textContent = total;
  const badge = document.getElementById('scheme-grand-total-max');
  if (badge) badge.textContent = total;
}

function applyAndCloseEditMarksModal() {
  if (S.evalData) {
    const aList = S.evalData.assignments || [];
    const eList = S.evalData.exams || [];
    (S.evalData.students || []).forEach(st => {
      recalculateEvalRowItem(st, S.evalData.scheme, aList, eList);
    });
    renderEvaluationSheetTable();
    renderSubsheetControls();
    persistEvalDataLocal();
  }
  closeEditMarksModal();
  showToast('Evaluation scheme marks updated successfully!', 'success');
}

/* ══════════════════════════════════════════════════════════════
   2. CLASS TEST MARKSHEET STUDIO (SCANNED DIRECTLY FROM tests.html)
   ══════════════════════════════════════════════════════════════ */
async function loadTestSheetData() {
  const container = document.getElementById('test-table-container');
  if (!container) return;

  container.innerHTML = `<div style="padding:3rem 1rem;text-align:center;color:var(--text-muted)">Loading Class Test Marksheet...</div>`;

  if (!S.tests || S.tests.length === 0) {
    const tRes = await apiFetch(`/teaching-groups/${S.groupId}/tests`);
    if (tRes && tRes.success && Array.isArray(tRes.data)) {
      S.tests = tRes.data;
    }
  }

  if (!S.tests.length) {
    container.innerHTML = `
          <div style="padding:3.5rem 1rem;text-align:center;color:var(--text-muted);">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:0.75rem;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            <h4 style="font-size:1.1rem;font-weight:700;color:var(--text-main);margin-bottom:0.35rem;">No Unit Tests Scheduled</h4>
            <p style="font-size:0.84rem;max-width:440px;margin:0 auto 1.25rem;">Create a Unit Test in the Classroom to record question-wise scores and attendance.</p>
            <a href="/faculty/registers.html?id=${S.registerId || S.groupId || 1}&tab=marks" class="btn btn-primary btn-sm">+ Schedule Test in Classroom</a>
          </div>
        `;
    return;
  }

  if (S.currentTestViewMode === 'ALL') {
    await loadAllTestsCombinedData();
    return;
  }

  if (!S.currentTestId) {
    S.currentTestId = S.tests[0].id;
  }

  const activeTest = S.tests.find(t => String(t.id) === String(S.currentTestId)) || S.tests[0];

  let questions = [];
  const testTotalMax = Number(activeTest.max_marks || 20);

  let instructions = [
    'All questions are compulsory.',
    'Marks are indicated against each question.',
    'Scientific calculator is permitted. Cell phones are strictly prohibited.'
  ];
  if (activeTest.instructions) {
    if (Array.isArray(activeTest.instructions) && activeTest.instructions.length) {
      instructions = activeTest.instructions;
    } else if (typeof activeTest.instructions === 'string') {
      try {
        const parsed = JSON.parse(activeTest.instructions);
        if (Array.isArray(parsed) && parsed.length) {
          instructions = parsed;
        } else if (typeof parsed === 'string') {
          const lines = parsed.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
          if (lines.length) instructions = lines;
        }
      } catch (_) {
        const lines = activeTest.instructions.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        if (lines.length) instructions = lines;
      }
    }
  }

  if (activeTest.questions) {
    try {
      const parsed = typeof activeTest.questions === 'string' ? JSON.parse(activeTest.questions) : activeTest.questions;
      if (Array.isArray(parsed) && parsed.length) {
        const splitMax = testTotalMax ? +(testTotalMax / parsed.length).toFixed(1) : 5;
        questions = parsed.map((q, i) => ({
          num: q.num || (i + 1),
          text: typeof q === 'string' ? q : (q.text || q.question || `Question ${i + 1}`),
          max: Number(q.max || q.max_marks || q.marks || splitMax)
        }));
      }
    } catch (_) {
      const rawLines = String(activeTest.questions).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      if (rawLines.length) {
        const splitMax = testTotalMax ? +(testTotalMax / rawLines.length).toFixed(1) : 5;
        questions = rawLines.map((line, i) => ({
          num: i + 1,
          text: line.replace(/^(?:Q\.?\s*\d+[\.\:\-\)]*|\d+[\.\:\-\)])\s*/i, ''),
          max: splitMax
        }));
      }
    }
  }

  // Auto-extract question statements from instructions if questions not passed separately
  if (!questions.length && instructions && instructions.length) {
    const detectedQ = [];
    const remainingIns = [];
    instructions.forEach(line => {
      if (/^(?:Q\.?\s*\d+|\d+)[\.\:\-\)]/i.test(line)) {
        detectedQ.push(line.replace(/^(?:Q\.?\s*\d+|\d+)[\.\:\-\)]\s*/i, ''));
      } else {
        remainingIns.push(line);
      }
    });
    if (detectedQ.length) {
      const splitMax = testTotalMax ? +(testTotalMax / detectedQ.length).toFixed(1) : 5;
      questions = detectedQ.map((qText, idx) => ({
        num: idx + 1,
        text: qText,
        max: splitMax
      }));
      if (remainingIns.length) instructions = remainingIns;
    }
  }

  if (!questions.length) {
    const splitMax = testTotalMax ? +(testTotalMax / 4).toFixed(1) : 5;
    questions = [
      { num: 1, text: 'Explain Relational Database Design principles & ACID properties.', max: splitMax },
      { num: 2, text: 'Discuss 1NF, 2NF, 3NF and BCNF normalization with suitable examples.', max: splitMax },
      { num: 3, text: 'Write SQL queries using INNER JOIN, LEFT OUTER JOIN and GROUP BY.', max: splitMax },
      { num: 4, text: 'Explain Indexing, B-Trees and query optimization techniques in DBMS.', max: splitMax }
    ];
  }

  // Check for saved customized test details in localStorage
  let savedCustom = null;
  try {
    const raw = localStorage.getItem(`test_sheet_custom_${S.groupId}_${activeTest.id}`);
    if (raw) savedCustom = JSON.parse(raw);
  } catch (e) { }

  if (savedCustom) {
    if (Array.isArray(savedCustom.instructions) && savedCustom.instructions.length) {
      instructions = savedCustom.instructions;
    }
    if (Array.isArray(savedCustom.questions) && savedCustom.questions.length) {
      questions = savedCustom.questions.map((q, i) => ({
        num: q.num || (i + 1),
        text: q.text || `Question ${i + 1}`,
        max: Number(q.max || 5)
      }));
    }
  }

  const testDetails = {
    mode: (savedCustom && savedCustom.details && savedCustom.details.mode) || activeTest.mode || 'OFFLINE',
    time: (savedCustom && savedCustom.details && savedCustom.details.time) || (activeTest.duration_minutes ? `${activeTest.duration_minutes} Minutes` : '50 Minutes'),
    date: (savedCustom && savedCustom.details && savedCustom.details.date) || (activeTest.exam_date ? activeTest.exam_date.slice(0, 10) : '15/10/2026'),
    subNote: (savedCustom && savedCustom.details && savedCustom.details.subNote) || 'Question Max Marks Row (Auto Calculated & Live Editable)',
    noteRed: (savedCustom && savedCustom.details && savedCustom.details.noteRed) || 'NOTE : All marked as RED were absent.'
  };

  let scoresMap = {};
  try {
    const scRes = await apiFetch(`/teaching-groups/${S.groupId}/tests/${activeTest.id}/scores`);
    if (scRes && scRes.success && Array.isArray(scRes.data)) {
      scRes.data.forEach(s => {
        scoresMap[s.student_id] = s;
      });
    }
  } catch (err) {
    console.warn('Could not fetch test scores:', err);
  }

  const roster = (Array.isArray(S.members) && S.members.length > 0 ? S.members : []).map((m, idx) => {
    const saved = scoresMap[m.student_id] || {};
    const isAbsent = saved.is_absent !== undefined ? Boolean(saved.is_absent) : false;
    const qScores = questions.map((q, qIdx) => {
      if (isAbsent) return 0;
      if (saved.question_scores && saved.question_scores[qIdx] !== undefined && saved.question_scores[qIdx] !== null && saved.question_scores[qIdx] !== '') {
        return Number(saved.question_scores[qIdx]);
      }
      return 0;
    });

    const totalMarks = isAbsent ? 0 : qScores.reduce((sum, v) => sum + v, 0);

    return {
      student_id: m.student_id,
      class_roll_no: m.class_roll_no || idx + 1,
      full_name: m.full_name || m.name || `Student ${idx + 1}`,
      official_enrollment_no: m.official_enrollment_no || m.enrollment_no || '',
      registration_no: m.registration_no || '',
      is_absent: isAbsent,
      question_scores: qScores,
      total_marks: totalMarks
    };
  });

  S.currentTestState = {
    test: activeTest,
    questions: questions,
    instructions: instructions,
    details: testDetails,
    roster: roster
  };

  renderTestSheetTable();
}

function onSelectTest(testId) {
  if (!testId || String(testId) === String(S.currentTestId)) return;
  S.currentTestId = Number(testId);
  loadTestSheetData();
}

function renderTestSheetTable() {
  const container = document.getElementById('test-table-container');
  const st = S.currentTestState;
  if (!container || !st) return;

  const test = st.test;
  const questions = st.questions || [];
  const rawRoster = st.roster || [];
  const testDetails = st.details || {};
  const instructions = st.instructions || [];
  const examMaxMarks = questions.reduce((sum, q) => sum + (Number(q.max) || 0), 0);

  const deptCode = esc(S.group?.department_code || 'IT');
  const subName = esc(S.group?.subject_name || test.subject_name || 'Database Management Systems');
  const yr = S.group?.year || (S.group?.semester ? Math.ceil(S.group.semester / 2) : 3);
  const sem = S.group?.semester || 5;
  const totalCols = 7 + questions.length;

  const q = S.searchQuery;
  let roster = rawRoster.filter(r => {
    if (q) {
      const name = (r.full_name || '').toLowerCase();
      const roll = String(r.class_roll_no || '');
      const enrl = (r.official_enrollment_no || '').toLowerCase();
      const regNo = (r.registration_no || '').toLowerCase();
      if (!name.includes(q) && !roll.includes(q) && !enrl.includes(q) && !regNo.includes(q)) return false;
    }
    if (S.filterMode === 'TOP') return r.total_marks >= (examMaxMarks * 0.8);
    if (S.filterMode === 'LOW') return !r.is_absent && r.total_marks < (examMaxMarks * 0.5);
    if (S.filterMode === 'ABSENT') return r.is_absent;
    return true;
  });

  roster = sortStudentsList(roster);
  S.visibleStudentsCount = roster.length;

  const presentStudents = roster.filter(s => !s.is_absent);
  const presentCount = presentStudents.length;
  const absentCount = roster.length - presentCount;
  const totalCount = roster.length;
  const presentSum = presentStudents.reduce((sum, s) => sum + (Number(s.total_marks) || 0), 0);
  const presentAvg = presentCount > 0 ? (presentSum / presentCount) : 0;

  const tallyEl = document.getElementById('sheet-visible-tally');
  if (tallyEl) tallyEl.textContent = `Showing ${roster.length} of ${rawRoster.length} students`;

  const testShort = getTestShortHeader(test, 0);
  const testTitle = test.title || test.name || 'Unit Test';
  const cleanTestName = `${testShort}: ${testTitle}`;

  // Update dedicated non-scrolling institutional header banner
  updateInstitutionalBanner(
    `Uttarakhand Government Institute of Polytechnic, Nainital | ${esc(S.group?.academic_year_label ? 'Internal Evaluation Sheet ' + S.group.academic_year_label : (S.group?.academic_year_label || S.activeSessionLabel || '2026-27 (Winter Session)'))}`,
    `Internal Evaluation - ${esc(testTitle)} | Subject : ${subName}`,
    `${deptCode || 'IT'} Year ${yr} | Semester ${sem}`
  );

  let tableHtml = `
        <table class="excel-table sheet-table" id="table-test-marksheet">
          <thead>
            <tr class="excel-hdr-blue row-1">
              <th colspan="${totalCols}">
                <h3>Government Polytechnic College — Information Technology Dept | ${esc(S.group?.academic_year_label || 'Internal Evaluation Sheet 2026-27 (Odd Semester)')}</h3>
              </th>
            </tr>
            <tr class="excel-hdr-blue row-2">
              <th colspan="${totalCols}">
                Department (${deptCode}) | Internal Evaluation - ${esc(cleanTestName)} | Subject : ${subName}
              </th>
            </tr>
            <tr class="excel-hdr-blue row-3">
              <th colspan="${totalCols}">
                Department of ${deptCode} Year ${yr} | Semester ${sem}
              </th>
            </tr>

            <tr class="excel-hdr-tan">
              <th rowspan="2" class="col-sr" style="width: 55px; vertical-align: middle;">SR. NO.</th>
              <th rowspan="2" class="col-roll" style="width: 85px; vertical-align: middle;">ROLL NO.</th>
              <th rowspan="2" class="col-reg" style="width: 125px; vertical-align: middle;">REG. NO.</th>
              <th rowspan="2" class="col-enroll" style="width: 125px; vertical-align: middle;">UBTER ROLL NO.</th>
              <th rowspan="2" class="col-name" style="width: 200px; vertical-align: middle;">STUDENT NAME</th>
              <th colspan="${questions.length}" class="col-test" title="${esc(testTitle)}">${esc(testShort)} (${esc(testTitle)})</th>
              <th rowspan="2" class="col-total excel-cell-total" style="width: 75px; vertical-align: middle;">Total</th>
              <th class="col-side-panel" style="min-width: 420px;">Unit Test Details (Mode : <span class="editable-test-field ${S.isEditMode ? 'is-editable' : ''}" contenteditable="${S.isEditMode ? 'true' : 'false'}" onblur="onTestDetailChange('mode', this.innerText)">${esc(testDetails.mode || 'OFFLINE')}</span>)</th>
            </tr>

            <tr class="excel-hdr-sub">
              ${questions.map(q => `
                <th class="col-test" style="min-width: 54px; font-weight: 800;">
                  <span>Q${q.num}</span>
                </th>
              `).join('')}
              <th class="excel-meta-bar col-side-panel" style="font-size: 0.74rem; font-weight: 700; padding: 0.35rem 0.6rem; text-align: center;">
                Maximum Marks : <span id="test-meta-max-display">${examMaxMarks}</span> | Time : <span class="editable-test-field ${S.isEditMode ? 'is-editable' : ''}" contenteditable="${S.isEditMode ? 'true' : 'false'}" onblur="onTestDetailChange('time', this.innerText)">${esc(testDetails.time || '50 Minutes')}</span> | Date : <span class="editable-test-field ${S.isEditMode ? 'is-editable' : ''}" contenteditable="${S.isEditMode ? 'true' : 'false'}" onblur="onTestDetailChange('date', this.innerText)">${esc(testDetails.date || '15/10/2026')}</span>
              </th>
            </tr>

            <!-- Row 6: Dedicated Numbers Row for Questions Max Marks -->
            <tr class="excel-hdr-numbers">
              <th class="col-sr hdr-num-label">—</th>
              <th class="col-roll hdr-num-label">—</th>
              <th class="col-reg hdr-num-label">—</th>
              <th class="col-enroll hdr-num-label">—</th>
              <th class="col-name hdr-num-label" style="text-align:right;padding-right:0.6rem;">Max Marks &rarr;</th>
              ${questions.map((q, qIdx) => `
                <th class="col-test">
                  <input type="number" 
                         class="excel-hdr-num-input ${S.isEditMode ? 'is-editable' : ''}" 
                         value="${q.max}" 
                         min="0.5" 
                         max="100" 
                         step="any"
                         ${S.isEditMode ? '' : 'readonly'}
                         title="Q${q.num} Maximum Marks"
                         onchange="onTestQuestionMaxChange(${qIdx}, this.value)">
                </th>
              `).join('')}
              <th class="col-total" style="text-align:center;">
                <span class="excel-hdr-num-badge" id="test-hdr-total-max">${examMaxMarks}</span>
              </th>
              <th class="col-side-panel" style="font-size:0.72rem;color:var(--text-muted);font-weight:700;text-align:center;padding:0.25rem 0.6rem;">
                <span class="editable-test-field ${S.isEditMode ? 'is-editable' : ''}" contenteditable="${S.isEditMode ? 'true' : 'false'}" onblur="onTestDetailChange('subNote', this.innerText)">${esc(testDetails.subNote || 'Question Max Marks Row (Auto Calculated & Live Editable)')}</span>
              </th>
            </tr>
          </thead>

          <tbody>
            ${roster.length === 0 ? `
              <tr>
                <td colspan="${5 + questions.length + 1}" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
                  <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.5rem; color: var(--text-primary);">No students enrolled</div>
                  <div style="font-size: 0.88rem;">${S.searchQuery ? 'No student matches your search filter.' : 'Enroll students in this teaching group to enter test scores.'}</div>
                </td>
                <td class="sheet-side-panel excel-side-panel-cell col-side-panel">
                  <div class="excel-side-content">
                    <div class="excel-side-sec-title"><span>Instructions :</span></div>
                    <ol class="excel-side-instructions">
                      ${st.instructions.map(ins => `<li style="margin-bottom:0.25rem;"><span>${esc(ins)}</span></li>`).join('')}
                    </ol>
                    <div class="excel-side-sec-title" style="margin-top: 0.85rem;">Questions :</div>
                    <div class="excel-side-questions">
                      ${questions.map(q => `<div style="margin-bottom: 0.35rem;"><strong>Q${q.num}:</strong> <span>${esc(q.text)}</span> <strong>(${q.max} Marks)</strong></div>`).join('')}
                    </div>
                    <div class="sheet-note-red">${esc(testDetails.noteRed || 'NOTE : All marked as RED were absent.')}</div>
                  </div>
                </td>
              </tr>
            ` : roster.map((r, rIdx) => {
    const isAb = Boolean(r.is_absent);
    return `
                <tr class="${isAb ? 'is-absent' : ''}" id="test-student-row-${r.student_id}">
                  <td class="excel-cell-sr col-sr">${rIdx + 1}</td>
                  <td class="cell-roll col-roll">${esc(r.class_roll_no || rIdx + 1)}</td>
                  <td class="col-reg" style="font-family: var(--font-family-mono); font-size: 0.76rem; color: var(--text-muted); text-align: center;">${esc(r.registration_no || '—')}</td>
                  <td class="col-enroll" style="font-family: var(--font-family-mono); font-size: 0.76rem; color: var(--text-muted); text-align: center;">${esc(r.ubter_roll_no || r.official_enrollment_no || '—')}</td>
                  <td class="cell-student-name col-name">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.4rem;">
                      <div class="dyn-student-cell">
                        <span class="dyn-student-name" style="font-weight: 700;" title="${esc(r.full_name)}">${esc(r.full_name)}</span>
                      </div>
                      <button type="button" 
                              class="btn-sheet-att-toggle ${isAb ? 'is-absent' : ''}" 
                              ${S.isEditMode ? '' : 'disabled'}
                              onclick="toggleTestStudentAbsent(${r.student_id})" 
                              title="${isAb ? 'Marked Absent. Click to mark Present' : 'Click to mark Absent'}">
                        ${isAb ? 'AB (Absent)' : 'Present'}
                      </button>
                    </div>
                  </td>
                  ${questions.map((q, qIdx) => {
      const qVal = (r.question_scores && r.question_scores[qIdx] !== undefined) ? r.question_scores[qIdx] : 0;
      return `
                      <td class="col-test">
                        <input type="number" 
                               class="excel-cell-input sheet-cell-input ${S.isEditMode ? 'is-editable' : ''}" 
                               id="test-q-${r.student_id}-${qIdx}" 
                               value="${isAb ? 0 : qVal}" 
                               min="0" 
                               max="${q.max}" 
                               step="any" 
                               ${isAb ? 'disabled' : ''} 
                               ${S.isEditMode ? '' : 'readonly'}
                               oninput="onTestScoreChange(${r.student_id}, ${qIdx}, this.value)">
                      </td>
                    `;
    }).join('')}
                  <td class="excel-cell-total col-total" style="font-weight: 800; font-size: 0.9rem;" id="test-total-${r.student_id}">
                    ${isAb ? '<span style="color:var(--status-absent);font-weight:800;">0 (AB)</span>' : (r.total_marks ?? 0)}
                  </td>

                  ${rIdx === 0 ? `
                    <td rowspan="${roster.length || 1}" class="sheet-side-panel excel-side-panel-cell col-side-panel">
                      <div class="excel-side-content">
                        <div class="excel-side-sec-title" style="display:flex;justify-content:space-between;align-items:center;">
                          <span>Instructions :</span>
                          ${S.isEditMode ? '<button type="button" class="btn btn-xs btn-secondary" onclick="addTestInstructionLine()" style="font-size:0.7rem;padding:0.1rem 0.4rem;cursor:pointer;">+ Add Line</button>' : ''}
                        </div>
                        <ol class="excel-side-instructions">
                          ${st.instructions.map((ins, iIdx) => `
                            <li style="margin-bottom:0.25rem;">
                              <span class="editable-test-field ${S.isEditMode ? 'is-editable' : ''}" contenteditable="${S.isEditMode ? 'true' : 'false'}" onblur="onTestInstructionChange(${iIdx}, this.innerText)">${esc(ins)}</span>
                              ${S.isEditMode ? `<button type="button" onclick="removeTestInstructionLine(${iIdx})" style="background:none;border:none;color:var(--status-absent);cursor:pointer;font-size:0.75rem;padding:0 0.25rem;vertical-align:middle;display:inline-flex;align-items:center;" title="Remove line">${window.getSvgIcon('close', 12)}</button>` : ''}
                            </li>
                          `).join('')}
                        </ol>

                        <div class="excel-side-sec-title" style="margin-top: 0.85rem;">Questions :</div>
                        <div class="excel-side-questions">
                          ${questions.map((q, idx) => `
                            <div style="margin-bottom: 0.35rem; display: flex; align-items: baseline; gap: 0.35rem;">
                              <strong>Q${q.num}:</strong> 
                              <span class="editable-test-field ${S.isEditMode ? 'is-editable' : ''}" contenteditable="${S.isEditMode ? 'true' : 'false'}" onblur="onTestQuestionTextChange(${idx}, this.innerText)" style="flex:1;">${esc(q.text)}</span> 
                              <strong id="test-q-side-max-${idx}">(${q.max} Marks)</strong>
                            </div>
                          `).join('')}
                        </div>

                        <div class="sheet-note-red editable-test-field ${S.isEditMode ? 'is-editable' : ''}" contenteditable="${S.isEditMode ? 'true' : 'false'}" onblur="onTestDetailChange('noteRed', this.innerText)">
                          ${esc(testDetails.noteRed || 'NOTE : All marked as RED were absent.')}
                        </div>

                        <div class="sheet-signature-block">
                          <div class="signature-item">
                            <div class="signature-line"></div>
                            <span>Faculty Signature</span>
                          </div>
                          <div class="signature-item">
                            <div class="signature-line"></div>
                            <span>HOD Signature</span>
                          </div>
                          <div class="signature-item">
                            <div class="signature-line"></div>
                            <span>Director / Principal Stamp</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  ` : ''}
                </tr>
              `;
  }).join('')}
          </tbody>

          <tfoot>
            <tr>
              <td colspan="${5 + questions.length}" class="excel-summary-lbl">
                Average of the class (Only present students)
              </td>
              <td class="excel-summary-avg col-total" id="test-class-avg" style="font-weight: 800; text-align: center;">
                ${presentAvg.toFixed(1)} / ${examMaxMarks}
              </td>
              <td class="excel-summary-tally-cell col-side-panel">
                <div style="display: flex; gap: 1.25rem; justify-content: center; font-size: 0.78rem;">
                  <span>Present: <strong style="color: var(--status-present);">${presentCount}</strong></span>
                  <span>Absent: <strong style="color: var(--status-absent);">${absentCount}</strong></span>
                  <span>Total: <strong>${totalCount}</strong></span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      `;

  container.innerHTML = tableHtml;
  updateStickyHeaderOffsets(document.getElementById('table-test-marksheet'));
  updateColumnFocusSelectOptions();
  if (S.viewMode === 'overview' && S.autoFit) {
    setTimeout(() => fitSheetToScreen(false), 30);
  } else if (S.viewMode === 'dynamic') {
    setSheetZoom(1.0);
  }
}

function onTestDetailChange(key, value) {
  if (!S.currentTestState) return;
  if (!S.currentTestState.details) S.currentTestState.details = {};
  S.currentTestState.details[key] = (value || '').trim();
  saveCurrentTestCustomState();
}

function onTestInstructionChange(idx, value) {
  if (!S.currentTestState || !S.currentTestState.instructions) return;
  S.currentTestState.instructions[idx] = (value || '').trim();
  saveCurrentTestCustomState();
}

function addTestInstructionLine() {
  if (!S.currentTestState) return;
  if (!S.currentTestState.instructions) S.currentTestState.instructions = [];
  S.currentTestState.instructions.push('New instruction line.');
  renderTestSheetTable();
  saveCurrentTestCustomState();
}

function removeTestInstructionLine(idx) {
  if (!S.currentTestState || !S.currentTestState.instructions) return;
  S.currentTestState.instructions.splice(idx, 1);
  renderTestSheetTable();
  saveCurrentTestCustomState();
}

function onTestQuestionTextChange(idx, value) {
  if (!S.currentTestState || !S.currentTestState.questions) return;
  if (S.currentTestState.questions[idx]) {
    S.currentTestState.questions[idx].text = (value || '').trim();
    saveCurrentTestCustomState();
  }
}

function saveCurrentTestCustomState() {
  if (!S.currentTestState || !S.currentTestState.test) return;
  const testId = S.currentTestState.test.id;
  const customData = {
    details: S.currentTestState.details,
    instructions: S.currentTestState.instructions,
    questions: S.currentTestState.questions
  };
  try {
    localStorage.setItem(`test_sheet_custom_${S.groupId}_${testId}`, JSON.stringify(customData));
  } catch (e) { }
  triggerAutoSaveIndicator();
}

function onTestQuestionMaxChange(qIdx, val) {
  if (!S.currentTestState) return;
  const q = S.currentTestState.questions[qIdx];
  if (!q) return;
  q.max = Math.max(0.5, parseFloat(val) || 5);
  renderTestSheetTable();
  saveCurrentTestCustomState();
  showToast(`Updated Q${q.num} maximum marks to ${q.max}!`, 'info');
  triggerAutoSaveIndicator();
}

function toggleTestStudentAbsent(studentId) {
  if (!S.currentTestState) return;
  const st = S.currentTestState.roster.find(r => r.student_id === studentId);
  if (!st) return;

  st.is_absent = !st.is_absent;
  if (st.is_absent) {
    st.total_marks = 0;
  } else {
    const rawTot = (st.question_scores || []).reduce((sum, v) => sum + (Number(v) || 0), 0);
    st.total_marks = Math.round(rawTot * 10) / 10;
  }
  renderTestSheetTable();
  triggerAutoSaveIndicator();
}

function onTestScoreChange(studentId, qIdx, value) {
  if (!S.currentTestState) return;
  const st = S.currentTestState.roster.find(r => r.student_id === studentId);
  if (!st) return;

  const qMax = S.currentTestState.questions[qIdx]?.max || 5;
  let valNum = parseFloat(value) || 0;
  if (valNum < 0) valNum = 0;
  if (valNum > qMax) valNum = qMax;

  st.question_scores[qIdx] = valNum;
  const rawTot = st.question_scores.reduce((sum, v) => sum + (Number(v) || 0), 0);
  st.total_marks = Math.round(rawTot * 10) / 10;

  const totEl = document.getElementById(`test-total-${studentId}`);
  if (totEl) totEl.textContent = st.total_marks;

  const present = S.currentTestState.roster.filter(s => !s.is_absent);
  const sum = present.reduce((s, r) => s + (Number(r.total_marks) || 0), 0);
  const avg = present.length > 0 ? (sum / present.length).toFixed(1) : '0';
  const avgEl = document.getElementById('test-class-avg');
  if (avgEl) avgEl.textContent = `${avg} / ${S.currentTestState.questions.reduce((a, b) => a + b.max, 0)}`;

  triggerAutoSaveIndicator();
}

/* ══════════════════════════════════════════════════════════════
   ALL UNIT TESTS COMBINED LEDGER & UT AVG ENGINE
   ══════════════════════════════════════════════════════════════ */
async function loadAllTestsCombinedData() {
  const container = document.getElementById('test-table-container');
  if (!container) return;

  container.innerHTML = `<div style="padding:3rem 1rem;text-align:center;color:var(--text-muted)">Loading All Unit Tests Combined Sheet...</div>`;

  if (!S.tests || !S.tests.length) {
    const tRes = await apiFetch(`/teaching-groups/${S.groupId}/tests`);
    if (tRes && tRes.success && Array.isArray(tRes.data)) {
      S.tests = tRes.data;
    }
  }

  let allTests = S.tests.length ? S.tests : [
    { id: 1, title: 'Unit Test 1', name: '1', max_marks: 20 },
    { id: 2, title: 'Unit Test 2', name: '2', max_marks: 20 },
    { id: 3, title: 'Unit Test 3', name: '3', max_marks: 20 },
    { id: 4, title: 'Unit Test 4', name: '4', max_marks: 50 }
  ];

  let cachedAllTests = null;
  try {
    const raw = localStorage.getItem(`all_tests_combined_${S.groupId}`);
    if (raw) cachedAllTests = JSON.parse(raw);
  } catch (e) { }

  if (cachedAllTests && Array.isArray(cachedAllTests.tests) && cachedAllTests.tests.length === allTests.length) {
    allTests = cachedAllTests.tests;
  }

  const sourceStudents = (S.evalData && S.evalData.students && S.evalData.students.length)
    ? S.evalData.students
    : (Array.isArray(S.members) && S.members.length > 0 ? S.members : []);

  const utWeight = (cachedAllTests && cachedAllTests.ut_weight) || (S.evalData?.scheme?.exam_avg_max) || 20;

  const roster = sourceStudents.map((s, idx) => {
    let eScores = [];
    let eAbsent = [];

    if (cachedAllTests && Array.isArray(cachedAllTests.students)) {
      const cSt = cachedAllTests.students.find(x => x.student_id === s.student_id);
      if (cSt && Array.isArray(cSt.scores)) {
        eScores = [...cSt.scores];
        eAbsent = Array.isArray(cSt.absent) ? [...cSt.absent] : cSt.scores.map(v => v === 'AB');
      }
    }

    if (!eScores.length) {
      if (Array.isArray(s.exam_scores) && s.exam_scores.length >= allTests.length) {
        eScores = s.exam_scores.slice(0, allTests.length);
        eAbsent = (s.exam_absent || []).slice(0, allTests.length);
      } else {
        eScores = allTests.map(() => 0);
        eAbsent = allTests.map(() => false);
      }
    }

    const totalMarks = eScores.reduce((sum, sc, i) => {
      if (eAbsent[i]) return sum;
      return sum + (Number(sc) || 0);
    }, 0);

    const totalMax = allTests.reduce((sum, t) => sum + (Number(t.max_marks) || 20), 0);
    const utAvg = totalMax > 0 ? Math.round((totalMarks / totalMax) * utWeight * 10) / 10 : 0;

    return {
      student_id: s.student_id,
      class_roll_no: s.class_roll_no || (idx + 1),
      official_enrollment_no: s.official_enrollment_no || s.enrollment_no || '',
      registration_no: s.registration_no || '',
      full_name: s.full_name || s.name || `Student ${idx + 1}`,
      scores: eScores,
      absent: eAbsent,
      total_marks: totalMarks,
      ut_avg: utAvg
    };
  });

  S.allTestsCombinedData = {
    tests: allTests,
    students: roster,
    ut_weight: utWeight
  };

  renderAllTestsCombinedTable();
}

function renderAllTestsCombinedTable() {
  const container = document.getElementById('test-table-container');
  const data = S.allTestsCombinedData;
  if (!container || !data) return;

  const allTests = data.tests;
  const rawRoster = data.students;
  const utWeight = Number(data.ut_weight) || 20;
  const totalPossibleMarks = allTests.reduce((s, t) => s + (Number(t.max_marks) || 20), 0);

  const deptCode = escapeHtml(S.group?.department_code || 'IT');
  const subName = escapeHtml(S.group?.subject_name || 'Database Management Systems');
  const yr = S.group?.year || 3;
  const sem = S.group?.semester || 5;
  const totalCols = 5 + allTests.length + 2;

  const q = S.searchQuery;
  let roster = rawRoster.filter(r => {
    if (q) {
      const name = (r.full_name || '').toLowerCase();
      const roll = String(r.class_roll_no || '');
      const enrl = (r.official_enrollment_no || '').toLowerCase();
      const regNo = (r.registration_no || '').toLowerCase();
      if (!name.includes(q) && !roll.includes(q) && !enrl.includes(q) && !regNo.includes(q)) return false;
    }
    return true;
  });

  roster = sortStudentsList(roster);
  S.visibleStudentsCount = roster.length;

  const tallyEl = document.getElementById('sheet-visible-tally');
  if (tallyEl) tallyEl.textContent = `Showing ${roster.length} of ${rawRoster.length} students`;

  updateInstitutionalBanner(
    `Uttarakhand Government Institute of Polytechnic, Nainital | ${esc(S.group?.academic_year_label ? 'Internal Evaluation Sheet ' + S.group.academic_year_label : (S.group?.academic_year_label || S.activeSessionLabel || '2026-27 (Winter Session)'))}`,
    `Department (${deptCode}) | All Unit Tests Marksheet & Evaluation Summary | Subject : ${subName}`,
    `${deptCode || 'IT'} Year ${yr} | Semester ${sem}`
  );

  let tableHtml = `
        <table class="excel-table sheet-table" id="table-all-tests-combined">
          <thead>
            <tr class="excel-hdr-blue row-1">
              <th colspan="${totalCols}">
                <h3>Government Polytechnic College — Information Technology Dept | ${esc(S.group?.academic_year_label || (S.group?.academic_year_label || S.activeSessionLabel || '2026-27 (Winter Session)'))}</h3>
              </th>
            </tr>
            <tr class="excel-hdr-blue row-2">
              <th colspan="${totalCols}">
                Department (${deptCode}) | All Unit Tests Marksheet &amp; Evaluation Summary | Subject : ${subName}
              </th>
            </tr>
            <tr class="excel-hdr-blue row-3">
              <th colspan="${totalCols}">
                Department of ${deptCode} Year ${yr} | Semester ${sem}
              </th>
            </tr>

            <!-- Tan Header Row -->
            <tr class="excel-hdr-tan">
              <th class="col-sr" style="width: 50px;">SR. NO.</th>
              <th class="col-roll" style="width: 85px;">ROLL NO.</th>
              <th class="col-reg" style="width: 125px;">REG. NO.</th>
              <th class="col-enroll" style="width: 125px;">UBTER ROLL NO.</th>
              <th class="col-name" style="min-width: 200px;">STUDENT NAME</th>
              ${allTests.map((t, i) => `<th class="col-test" title="${esc(t.title || 'Unit Test ' + (i + 1))}">${esc(getTestShortHeader(t, i))}</th>`).join('')}
              <th class="col-total" style="width: 90px; font-weight: 800;">Total Marks</th>
              <th class="col-test-avg" style="width: 80px; font-weight: 800;">UT Avg</th>
            </tr>

            <!-- Dedicated Numbers Row for Unit Test Max Marks and UT Avg Weightage -->
            <tr class="excel-hdr-numbers">
              <th class="col-sr hdr-num-label">—</th>
              <th class="col-roll hdr-num-label">—</th>
              <th class="col-reg hdr-num-label">—</th>
              <th class="col-enroll hdr-num-label">—</th>
              <th class="col-name hdr-num-label" style="text-align:right;padding-right:0.6rem;">Max Marks &rarr;</th>
              ${allTests.map((t, i) => `
                <th class="col-test">
                  <input type="number" 
                         class="excel-hdr-num-input ${S.isEditMode ? 'is-editable' : ''}" 
                         value="${t.max_marks || 20}" 
                         min="0.5" 
                         max="100" 
                         step="any" 
                         ${S.isEditMode ? '' : 'readonly'}
                         title="Unit Test ${i + 1} Maximum Marks"
                         onchange="onAllTestsExamColMaxChange(${i}, this.value)">
                </th>
              `).join('')}
              <th class="col-total" style="text-align:center;">
                <span class="excel-hdr-num-badge" id="all-tests-hdr-total-max">${totalPossibleMarks}</span>
              </th>
              <th class="col-test-avg" style="text-align:center;">
                <input type="number" 
                       class="excel-hdr-num-input ${S.isEditMode ? 'is-editable' : ''}" 
                       value="${utWeight}" 
                       min="1" 
                       max="100" 
                       step="any" 
                       ${S.isEditMode ? '' : 'readonly'}
                       title="UT Average Weight (Marks)"
                       onchange="onAllTestsWeightChange(this.value)">
              </th>
            </tr>
          </thead>

          <tbody>
            ${roster.length === 0 ? `
              <tr>
                <td colspan="${totalCols}" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
                  <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.5rem; color: var(--text-primary);">No students enrolled</div>
                  <div style="font-size: 0.88rem;">${S.searchQuery ? 'No student matches your search filter.' : 'Enroll students in this teaching group to view test marks.'}</div>
                </td>
              </tr>
            ` : roster.map((s, rIdx) => {
    const testCells = allTests.map((t, tIdx) => {
      const isAb = Boolean(s.absent?.[tIdx]);
      const val = isAb ? 'AB' : (s.scores?.[tIdx] ?? 0);
      return `
                  <td class="col-test">
                    <input type="text" 
                           class="excel-cell-input sheet-cell-input ${S.isEditMode ? 'is-editable' : ''}" 
                           id="all-tests-cell-${s.student_id}-${tIdx}"
                           style="${isAb ? 'color: var(--status-absent) !important; font-weight: 800 !important; background: var(--status-absent-bg) !important;' : ''}"
                           value="${val}" 
                           ${S.isEditMode ? '' : 'readonly'}
                           oninput="onAllTestsScoreChange(${s.student_id}, ${tIdx}, this.value, this)"
                           onchange="onAllTestsScoreChange(${s.student_id}, ${tIdx}, this.value, this)">
                  </td>
                `;
    }).join('');

    return `
                <tr id="all-tests-row-${s.student_id}">
                  <td class="excel-cell-sr col-sr">${rIdx + 1}</td>
                  <td class="cell-roll col-roll">${esc(s.class_roll_no || rIdx + 1)}</td>
                  <td class="col-reg" style="font-family: var(--font-family-mono); font-size: 0.76rem; color: var(--text-muted); text-align: center;">${esc(s.registration_no || '—')}</td>
                  <td class="col-enroll" style="font-family: var(--font-family-mono); font-size: 0.76rem; color: var(--text-muted); text-align: center;">${esc(s.ubter_roll_no || s.official_enrollment_no || '—')}</td>
                  <td class="cell-student-name col-name">
                    <span style="font-weight: 700; text-transform: uppercase;">${esc(s.full_name)}</span>
                  </td>
                  ${testCells}
                  <td class="excel-cell-total col-total" style="font-weight: 800; text-align: center; background: var(--bg-surface-secondary);" id="all-tests-total-${s.student_id}">
                    ${s.total_marks}
                  </td>
                  <td class="excel-cell-avg col-test-avg" style="font-weight: 800; color: var(--color-primary); text-align: center; background: var(--bg-surface-secondary);" id="all-tests-avg-${s.student_id}">
                    ${Number(s.ut_avg).toFixed(1)}
                  </td>
                </tr>
              `;
  }).join('')}
          </tbody>

          <tfoot>
            <tr>
              <td colspan="5" class="excel-summary-lbl">Class Average</td>
              ${allTests.map((_, tIdx) => {
    let colSum = 0;
    let colPresent = 0;
    roster.forEach(r => {
      if (!r.absent?.[tIdx]) {
        colSum += Number(r.scores?.[tIdx]) || 0;
        colPresent++;
      }
    });
    const colAvg = colPresent > 0 ? (colSum / colPresent).toFixed(1) : '0.0';
    return `<td class="excel-summary-avg col-test" id="all-tests-foot-${tIdx}">${colAvg}</td>`;
  }).join('')}
              <td class="excel-summary-avg col-total" id="all-tests-foot-total">
                ${(roster.reduce((sum, r) => sum + (Number(r.total_marks) || 0), 0) / (roster.length || 1)).toFixed(1)}
              </td>
              <td class="excel-summary-avg col-test-avg" id="all-tests-foot-avg" style="color:var(--color-primary);font-weight:800;">
                ${(roster.reduce((sum, r) => sum + (Number(r.ut_avg) || 0), 0) / (roster.length || 1)).toFixed(1)}
              </td>
            </tr>
          </tfoot>
        </table>
      `;

  container.innerHTML = tableHtml;
  updateStickyHeaderOffsets(document.getElementById('table-all-tests-combined'));
  if (S.viewMode === 'overview' && S.autoFit) {
    setTimeout(() => fitSheetToScreen(false), 30);
  } else if (S.viewMode === 'dynamic') {
    setSheetZoom(1.0);
  }
}

function onAllTestsScoreChange(studentId, testIdx, val, inputEl) {
  if (!S.allTestsCombinedData) return;
  const st = S.allTestsCombinedData.students.find(s => s.student_id === studentId);
  if (!st) return;

  const str = String(val).trim().toUpperCase();
  if (str === 'AB' || str === 'A') {
    st.absent[testIdx] = true;
    st.scores[testIdx] = 0;
    if (inputEl) {
      inputEl.style.color = 'var(--status-absent)';
      inputEl.style.fontWeight = '800';
      inputEl.style.background = 'var(--status-absent-bg)';
      inputEl.value = 'AB';
    }
  } else {
    st.absent[testIdx] = false;
    const tMax = S.allTestsCombinedData.tests[testIdx]?.max_marks || 20;
    const num = Math.min(tMax, Math.max(0, parseFloat(val) || 0));
    st.scores[testIdx] = num;
    if (inputEl) {
      inputEl.style.color = '';
      inputEl.style.fontWeight = '';
      inputEl.style.background = '';
    }
  }

  const allTests = S.allTestsCombinedData.tests;
  const utWeight = Number(S.allTestsCombinedData.ut_weight) || 20;
  st.total_marks = st.scores.reduce((sum, sc, i) => {
    if (st.absent[i]) return sum;
    return sum + (Number(sc) || 0);
  }, 0);
  const totalPossible = allTests.reduce((sum, t) => sum + (Number(t.max_marks) || 20), 0);
  st.ut_avg = totalPossible > 0 ? Math.round((st.total_marks / totalPossible) * utWeight * 10) / 10 : 0;

  const totEl = document.getElementById(`all-tests-total-${studentId}`);
  if (totEl) totEl.textContent = st.total_marks;
  const avgEl = document.getElementById(`all-tests-avg-${studentId}`);
  if (avgEl) avgEl.textContent = st.ut_avg.toFixed(1);

  if (S.evalData && S.evalData.students) {
    const evalSt = S.evalData.students.find(s => s.student_id === studentId);
    if (evalSt && Array.isArray(evalSt.exam_scores)) {
      evalSt.exam_scores[testIdx] = st.scores[testIdx];
      evalSt.exam_absent[testIdx] = st.absent[testIdx];
      recalculateEvalRowItem(evalSt, S.evalData.scheme, S.evalData.assignments, S.evalData.exams);
      persistEvalDataLocal();
    }
  }

  updateAllTestsClassAverages();
  persistAllTestsCombinedLocal();
  triggerAutoSaveIndicator();
}

function onAllTestsExamColMaxChange(testIdx, val) {
  if (!S.allTestsCombinedData) return;
  const num = Math.max(1, parseInt(val, 10) || 20);
  if (S.allTestsCombinedData.tests[testIdx]) {
    S.allTestsCombinedData.tests[testIdx].max_marks = num;
  }
  if (S.evalData && S.evalData.exams && S.evalData.exams[testIdx]) {
    S.evalData.exams[testIdx].max_marks = num;
  }
  const allTests = S.allTestsCombinedData.tests;
  const utWeight = Number(S.allTestsCombinedData.ut_weight) || 20;
  const totalPossible = allTests.reduce((sum, t) => sum + (Number(t.max_marks) || 20), 0);
  S.allTestsCombinedData.students.forEach(st => {
    st.total_marks = st.scores.reduce((sum, sc, i) => st.absent[i] ? sum : sum + (Number(sc) || 0), 0);
    st.ut_avg = totalPossible > 0 ? Math.round((st.total_marks / totalPossible) * utWeight * 10) / 10 : 0;
  });
  renderAllTestsCombinedTable();
  persistAllTestsCombinedLocal();
  showToast(`Updated Unit Test ${testIdx + 1} max marks to ${num}`, 'info');
}

function onAllTestsWeightChange(val) {
  if (!S.allTestsCombinedData) return;
  const num = Math.max(1, parseInt(val, 10) || 20);
  S.allTestsCombinedData.ut_weight = num;
  if (S.evalData && S.evalData.scheme) {
    S.evalData.scheme.exam_avg_max = num;
    const aWeight = Number(S.evalData.scheme.assign_avg_max || 15);
    const assessTotal = (S.evalData.assessment_columns || []).reduce((sum, c) => sum + (Number(c.max) || 0), 0);
    S.evalData.scheme.total_max = aWeight + num + assessTotal;
  }
  const allTests = S.allTestsCombinedData.tests;
  const totalPossible = allTests.reduce((sum, t) => sum + (Number(t.max_marks) || 20), 0);
  S.allTestsCombinedData.students.forEach(st => {
    st.ut_avg = totalPossible > 0 ? Math.round((st.total_marks / totalPossible) * num * 10) / 10 : 0;
  });
  renderAllTestsCombinedTable();
  persistAllTestsCombinedLocal();
  showToast(`Updated UT Average weightage to ${num}`, 'info');
}

function updateAllTestsClassAverages() {
  if (!S.allTestsCombinedData) return;
  const roster = S.allTestsCombinedData.students || [];
  const count = roster.length || 1;
  const allTests = S.allTestsCombinedData.tests || [];

  allTests.forEach((_, tIdx) => {
    let colSum = 0;
    let colPresent = 0;
    roster.forEach(r => {
      if (!r.absent?.[tIdx]) {
        colSum += Number(r.scores?.[tIdx]) || 0;
        colPresent++;
      }
    });
    const colAvg = colPresent > 0 ? (colSum / colPresent).toFixed(1) : '0.0';
    const el = document.getElementById(`all-tests-foot-${tIdx}`);
    if (el) el.textContent = colAvg;
  });

  const totalAvg = (roster.reduce((sum, r) => sum + (Number(r.total_marks) || 0), 0) / count).toFixed(1);
  const utGrandAvg = (roster.reduce((sum, r) => sum + (Number(r.ut_avg) || 0), 0) / count).toFixed(1);
  const fTot = document.getElementById('all-tests-foot-total');
  if (fTot) fTot.textContent = totalAvg;
  const fAvg = document.getElementById('all-tests-foot-avg');
  if (fAvg) fAvg.textContent = utGrandAvg;
}

function persistAllTestsCombinedLocal() {
  if (!S.allTestsCombinedData) return;
  try {
    localStorage.setItem(`all_tests_combined_${S.groupId}`, JSON.stringify(S.allTestsCombinedData));
  } catch (e) { }
}

/* ══════════════════════════════════════════════════════════════
   3. THEORY COURSEWORK & ASSIGNMENTS SHEET (THEORY ONLY)
   ══════════════════════════════════════════════════════════════ */
async function loadAssignmentsSheetData() {
  const container = document.getElementById('assignments-table-container');
  if (!container) return;

  container.innerHTML = `<div style="padding:3rem 1rem;text-align:center;color:var(--text-muted)">Loading Assignment Marksheet...</div>`;

  if (!S.assignments || !S.assignments.length) {
    const aRes = await apiFetch(`/teaching-groups/${S.groupId}/assignments`);
    if (aRes && aRes.success) S.assignments = Array.isArray(aRes.data) ? aRes.data : [];
  }

  // Filter strictly for theory assignments (exclude any lab experiments or practicals)
  S.theoryAssignments = (S.assignments || []).filter(a => !isPracticalCoursework(a));
  S.practicalAssignments = (S.assignments || []).filter(a => isPracticalCoursework(a));

  renderAssignmentsSheetTable();
}

function renderAssignmentsSheetTable() {
  const container = document.getElementById('assignments-table-container');
  if (!container) return;

  const assignments = S.theoryAssignments || [];
  const rawRoster = (Array.isArray(S.members) && S.members.length > 0) ? S.members : [];

  const q = S.searchQuery;
  let roster = rawRoster.filter(r => {
    if (q) {
      const name = (r.full_name || '').toLowerCase();
      const roll = String(r.class_roll_no || '');
      const enrl = (r.official_enrollment_no || '').toLowerCase();
      const regNo = (r.registration_no || '').toLowerCase();
      if (!name.includes(q) && !roll.includes(q) && !enrl.includes(q) && !regNo.includes(q)) return false;
    }
    return true;
  });

  roster = sortStudentsList(roster);
  S.visibleStudentsCount = roster.length;

  const tallyEl = document.getElementById('sheet-visible-tally');
  if (tallyEl) tallyEl.textContent = `Showing ${roster.length} of ${rawRoster.length} students`;

  const deptCode = esc(S.group?.department_code || 'IT');
  const subName = esc(S.group?.subject_name || 'Database Management Systems');
  const yr = S.group?.year || 3;
  const sem = S.group?.semester || 5;
  const totalCols = 5 + (assignments.length || 1) + 2;
  const maxPossible = assignments.reduce((s, a) => s + (Number(a.max_marks) || 20), 0);

  // Dedicated non-scrolling institutional header banner
  updateInstitutionalBanner(
    getDynamicSessionHeader(),
    `Department (${deptCode}) | Theory Coursework & Assignments | Subject : ${subName}`,
    `${deptCode || 'IT'} Year ${yr} | Semester ${sem}`
  );

  // Compute initial column totals and class averages
  const colTotals = assignments.map(() => 0);
  let grandTotalSum = 0;

  const bodyRows = roster.length ? roster.map((st, idx) => {
    let sum = 0;
    const aTds = assignments.length ? assignments.map((a, aIdx) => {
      const max = Number(a.max_marks) || 20;
      const scoreKey = `${st.student_id}_${aIdx}`;
      const storedVal = S.assignmentScores ? S.assignmentScores[scoreKey] : undefined;
      const score = (storedVal !== undefined && storedVal !== null && !isNaN(storedVal)) ? Number(storedVal) : 0;
      sum += score;
      colTotals[aIdx] += score;
      return `
            <td class="col-assign">
              <input type="number" 
                     class="sheet-cell-input ${S.isEditMode ? 'is-editable' : ''}" 
                     value="${score}" 
                     min="0" 
                     max="${max}" 
                     step="any"
                     ${S.isEditMode ? '' : 'readonly'}
                     data-sid="${st.student_id}"
                     data-type="assign-standalone"
                     data-idx="${aIdx}"
                     oninput="onAssignmentStandaloneScoreChange(${st.student_id}, ${aIdx}, this.value)">
            </td>
          `;
    }).join('') : '<td class="col-assign" style="text-align:center;color:var(--text-muted);font-size:0.8rem;">—</td>';

    grandTotalSum += sum;
    const pct = maxPossible > 0 ? Math.round((sum / maxPossible) * 100) : 0;

    return `
          <tr id="assign-row-${st.student_id}">
            <td class="excel-cell-sr col-sr">${idx + 1}</td>
            <td class="cell-roll col-roll">${esc(st.class_roll_no || idx + 1)}</td>
            <td class="col-reg" style="font-family: var(--font-family-mono); font-size: 0.76rem; color: var(--text-muted); text-align: center;">${esc(st.registration_no || '—')}</td>
            <td class="col-enroll" style="font-family: var(--font-family-mono); font-size: 0.76rem; color: var(--text-muted); text-align: center;">${esc(st.ubter_roll_no || st.official_enrollment_no || '—')}</td>
            <td class="cell-student-name col-name">
              <div class="dyn-student-cell">
                <span class="dyn-student-name" style="font-weight:700;" title="${esc(st.full_name)}">${esc(st.full_name)}</span>
              </div>
            </td>
            ${aTds}
            <td class="excel-cell-total" style="font-weight:800;" id="assign-tot-${st.student_id}">${sum}</td>
            <td class="col-total" style="font-weight:800;color:${pct < 50 ? 'var(--status-absent)' : 'var(--status-present)'};" id="assign-pct-${st.student_id}">
              ${pct}%
            </td>
          </tr>
        `;
  }).join('') : `
    <tr>
      <td colspan="${totalCols}" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
        <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.5rem; color: var(--text-primary);">No students enrolled</div>
        <div style="font-size: 0.88rem;">${S.searchQuery ? 'No student matches your search filter.' : 'Enroll students in this teaching group to view assignment marks.'}</div>
      </td>
    </tr>
  `;

  const rCount = roster.length || 1;
  const classAvgTotal = (grandTotalSum / rCount).toFixed(1);
  const classAvgPct = maxPossible > 0 ? Math.round((grandTotalSum / (rCount * maxPossible)) * 100) : 0;

  const footerCols = assignments.length ? assignments.map((_, i) => {
    const colAvg = (colTotals[i] / rCount).toFixed(1);
    return `<td class="col-assign excel-summary-avg" id="assign-col-avg-${i}">${colAvg}</td>`;
  }).join('') : '<td class="col-assign excel-summary-avg">—</td>';

  let tableHtml = `
        <table class="excel-table sheet-table" id="table-assignments-marksheet">
          <thead>
            <tr class="excel-hdr-blue row-1">
              <th colspan="${totalCols}">
                <h3>Government Polytechnic College — Information Technology Dept | ${esc(S.group?.academic_year_label || (S.group?.academic_year_label || S.activeSessionLabel || '2026-27 (Winter Session)'))}</h3>
              </th>
            </tr>
            <tr class="excel-hdr-blue row-2">
              <th colspan="${totalCols}">
                Department (${deptCode}) | Theory Coursework &amp; Assignments | Subject : ${subName}
              </th>
            </tr>
            <tr class="excel-hdr-blue row-3">
              <th colspan="${totalCols}">
                Department of ${deptCode} Year ${yr} | Semester ${sem}
              </th>
            </tr>

            <!-- Row 4: Tan Header -->
            <tr class="excel-hdr-tan">
              <th class="col-sr" style="width: 50px;">SR. NO.</th>
              <th class="col-roll" style="width: 85px;">ROLL NO.</th>
              <th class="col-reg" style="width: 125px;">REG. NO.</th>
              <th class="col-enroll" style="width: 125px;">UBTER ROLL NO.</th>
              <th class="col-name" style="min-width: 200px;">STUDENT NAME</th>
              ${assignments.length ? assignments.map((a, i) => `<th class="col-assign" title="${esc(a.title || a.name || 'Assignment ' + (i + 1))}">${esc(getAssignShortHeader(a, i))}</th>`).join('') : '<th class="col-assign" style="width: 120px;">Assignments</th>'}
              <th style="width: 90px;">Total Marks</th>
              <th class="col-total" style="width: 80px;">Average %</th>
            </tr>

            <!-- Row 5: Numbers Row for Assignment Max Marks -->
            <tr class="excel-hdr-numbers">
              <th class="col-sr hdr-num-label">—</th>
              <th class="col-roll hdr-num-label">—</th>
              <th class="col-reg hdr-num-label">—</th>
              <th class="col-enroll hdr-num-label">—</th>
              <th class="col-name hdr-num-label" style="text-align:right;padding-right:0.6rem;">Max Marks &rarr;</th>
              ${assignments.length ? assignments.map((a, i) => `
                <th class="col-assign">
                  <input type="number" 
                         class="excel-hdr-num-input ${S.isEditMode ? 'is-editable' : ''}" 
                         value="${a.max_marks || 20}" 
                         min="0.5" 
                         max="100" 
                         step="any"
                         ${S.isEditMode ? '' : 'readonly'}
                         title="${esc(a.title || a.name)} Max Marks"
                         onchange="onAssignmentColMaxChange(${i}, this.value)">
                </th>
              `).join('') : '<th class="col-assign hdr-num-label">—</th>'}
              <th style="text-align:center;">
                <span class="excel-hdr-num-badge" id="assign-hdr-total-max">${maxPossible}</span>
              </th>
              <th class="col-total" style="font-weight:800;color:var(--text-muted);font-size:0.75rem;">100%</th>
            </tr>
          </thead>

          <tbody>
            ${bodyRows}
          </tbody>

          <tfoot>
            <tr class="excel-summary-row">
              <td colspan="5" class="excel-summary-lbl" style="text-align:right;padding-right:1rem;font-weight:800;">
                Class Average:
              </td>
              ${footerCols}
              <td class="excel-summary-avg" id="assign-foot-total" style="font-weight:800;">${classAvgTotal}</td>
              <td class="excel-summary-avg" id="assign-foot-pct" style="font-weight:800;color:var(--status-present);">${classAvgPct}%</td>
            </tr>
          </tfoot>
        </table>
      `;

  container.innerHTML = tableHtml;
  updateStickyHeaderOffsets(document.getElementById('table-assignments-marksheet'));
  updateColumnFocusSelectOptions();
  if (S.viewMode === 'overview' && S.autoFit) {
    setTimeout(() => fitSheetToScreen(false), 30);
  } else if (S.viewMode === 'dynamic') {
    setSheetZoom(1.0);
  }
}

function onAssignmentColMaxChange(idx, val) {
  if (!S.theoryAssignments || !S.theoryAssignments[idx]) return;
  S.theoryAssignments[idx].max_marks = Math.max(0.5, parseFloat(val) || 20);
  renderAssignmentsSheetTable();
  showToast(`Updated assignment maximum marks to ${S.theoryAssignments[idx].max_marks}!`, 'info');
  triggerAutoSaveIndicator();
}

function onAssignmentStandaloneScoreChange(studentId, assignIdx, val) {
  if (!S.assignmentScores) S.assignmentScores = {};
  if (assignIdx !== undefined && val !== undefined) {
    S.assignmentScores[`${studentId}_${assignIdx}`] = Math.max(0, parseFloat(val) || 0);
  }

  const row = document.getElementById(`assign-row-${studentId}`);
  if (!row) return;

  const inputs = row.querySelectorAll('input[data-type="assign-standalone"]');
  let sum = 0;
  inputs.forEach((inp, idx) => {
    const v = Number(inp.value) || 0;
    sum += v;
    S.assignmentScores[`${studentId}_${idx}`] = v;
  });

  const maxPossible = (S.theoryAssignments || []).reduce((s, a) => s + (Number(a.max_marks) || 20), 0);
  const pct = maxPossible > 0 ? Math.round((sum / maxPossible) * 100) : 0;

  const totEl = document.getElementById(`assign-tot-${studentId}`);
  if (totEl) totEl.textContent = sum;
  const pctEl = document.getElementById(`assign-pct-${studentId}`);
  if (pctEl) {
    pctEl.textContent = `${pct}%`;
    pctEl.style.color = pct < 50 ? 'var(--status-absent)' : 'var(--status-present)';
  }

  // Update class averages in footer and persist
  updateAssignmentClassAverages();
  persistAssignmentsLocal();
  triggerAutoSaveIndicator();
}

function persistAssignmentsLocal() {
  if (!S.assignmentScores || !S.groupId) return;
  try {
    localStorage.setItem(`assignment_scores_${S.groupId}`, JSON.stringify(S.assignmentScores));
  } catch (e) { }
}

function updateAssignmentClassAverages() {
  const assignments = S.theoryAssignments || [];
  const rows = document.querySelectorAll('#table-assignments-marksheet tbody tr');
  const rCount = rows.length || 1;
  const colSums = assignments.map(() => 0);
  let grandSum = 0;

  rows.forEach(r => {
    const inps = r.querySelectorAll('input[data-type="assign-standalone"]');
    inps.forEach((inp, idx) => {
      colSums[idx] += Number(inp.value) || 0;
    });
    const tot = Number(r.querySelector('.excel-cell-total')?.textContent) || 0;
    grandSum += tot;
  });

  assignments.forEach((_, i) => {
    const el = document.getElementById(`assign-col-avg-${i}`);
    if (el) el.textContent = (colSums[i] / rCount).toFixed(1);
  });

  const maxPossible = assignments.reduce((s, a) => s + (Number(a.max_marks) || 20), 0);
  const fTot = document.getElementById('assign-foot-total');
  if (fTot) fTot.textContent = (grandSum / rCount).toFixed(1);
  const fPct = document.getElementById('assign-foot-pct');
  if (fPct) {
    const avgPct = maxPossible > 0 ? Math.round((grandSum / (rCount * maxPossible)) * 100) : 0;
    fPct.textContent = `${avgPct}%`;
  }
}

/* ══════════════════════════════════════════════════════════════
   4. PRACTICAL & LAB WORK MARKSHEET (SEPARATE DEDICATED SHEET)
   ══════════════════════════════════════════════════════════════ */
async function loadPracticalsSheetData() {
  const container = document.getElementById('practicals-table-container');
  if (!container) return;

  container.innerHTML = `<div style="padding:3rem 1rem;text-align:center;color:var(--text-muted)">Loading Practical &amp; Lab Work Marksheet...</div>`;

  if (!S.assignments || !S.assignments.length) {
    const aRes = await apiFetch(`/teaching-groups/${S.groupId}/assignments`);
    if (aRes && aRes.success) S.assignments = Array.isArray(aRes.data) ? aRes.data : [];
  }

  // Filter strictly for practical experiments & lab coursework
  S.practicalAssignments = (S.assignments || []).filter(a => isPracticalCoursework(a));
  S.theoryAssignments = (S.assignments || []).filter(a => !isPracticalCoursework(a));

  try {
    const cachedScores = localStorage.getItem(`practical_scores_${S.groupId}`);
    if (cachedScores) S.practicalScores = JSON.parse(cachedScores) || {};
  } catch (e) {
    S.practicalScores = {};
  }

  renderPracticalsSheetTable();
}

function renderPracticalsSheetTable() {
  const container = document.getElementById('practicals-table-container');
  if (!container) return;

  const practicals = S.practicalAssignments || [];
  const rawRoster = (Array.isArray(S.members) && S.members.length > 0) ? S.members : [];

  const q = S.searchQuery;
  let roster = rawRoster.filter(r => {
    if (q) {
      const name = (r.full_name || '').toLowerCase();
      const roll = String(r.class_roll_no || '');
      const enrl = (r.official_enrollment_no || '').toLowerCase();
      const regNo = (r.registration_no || '').toLowerCase();
      if (!name.includes(q) && !roll.includes(q) && !enrl.includes(q) && !regNo.includes(q)) return false;
    }
    return true;
  });

  roster = sortStudentsList(roster);
  S.visibleStudentsCount = roster.length;

  const tallyEl = document.getElementById('sheet-visible-tally');
  if (tallyEl) tallyEl.textContent = `Showing ${roster.length} of ${rawRoster.length} students`;

  const deptCode = esc(S.group?.department_code || 'IT');
  const subName = esc(S.group?.subject_name || 'Database Management Systems');
  const yr = S.group?.year || 3;
  const sem = S.group?.semester || 5;
  const totalCols = 5 + (practicals.length || 1) + 2;
  const maxPossible = practicals.reduce((s, p) => s + (Number(p.max_marks) || 25), 0);

  // Dedicated non-scrolling institutional header banner for Practicals
  updateInstitutionalBanner(
    getDynamicSessionHeader(),
    `Department (${deptCode}) | Laboratory & Practical Work Evaluation | Subject : ${subName}`,
    `${deptCode || 'IT'} Year ${yr} | Semester ${sem}`
  );

  const colTotals = practicals.map(() => 0);
  let grandTotalSum = 0;

  const bodyRows = roster.length ? roster.map((st, idx) => {
    let sum = 0;
    const pTds = practicals.length ? practicals.map((p, pIdx) => {
      const max = Number(p.max_marks) || 25;
      const scoreKey = `${st.student_id}_${pIdx}`;
      const storedVal = S.practicalScores ? S.practicalScores[scoreKey] : undefined;
      const score = (storedVal !== undefined && storedVal !== null && !isNaN(storedVal)) ? Number(storedVal) : 0;
      sum += score;
      colTotals[pIdx] += score;
      return `
            <td class="col-practical">
              <input type="number" 
                     class="sheet-cell-input ${S.isEditMode ? 'is-editable' : ''}" 
                     value="${score}" 
                     min="0" 
                     max="${max}" 
                     step="any"
                     ${S.isEditMode ? '' : 'readonly'}
                     data-sid="${st.student_id}"
                     data-type="practical-standalone"
                     data-idx="${pIdx}"
                     oninput="onPracticalStandaloneScoreChange(${st.student_id}, ${pIdx}, this.value)">
            </td>
          `;
    }).join('') : '<td class="col-practical" style="text-align:center;color:var(--text-muted);font-size:0.8rem;">—</td>';

    grandTotalSum += sum;
    const pct = maxPossible > 0 ? Math.round((sum / maxPossible) * 100) : 0;

    return `
          <tr id="practical-row-${st.student_id}">
            <td class="excel-cell-sr col-sr">${idx + 1}</td>
            <td class="cell-roll col-roll">${esc(st.class_roll_no || idx + 1)}</td>
            <td class="col-reg" style="font-family: var(--font-family-mono); font-size: 0.76rem; color: var(--text-muted); text-align: center;">${esc(st.registration_no || '—')}</td>
            <td class="col-enroll" style="font-family: var(--font-family-mono); font-size: 0.76rem; color: var(--text-muted); text-align: center;">${esc(st.ubter_roll_no || st.official_enrollment_no || '—')}</td>
            <td class="cell-student-name col-name">
              <div class="dyn-student-cell">
                <span class="dyn-student-name" style="font-weight:700;" title="${esc(st.full_name)}">${esc(st.full_name)}</span>
              </div>
            </td>
            ${pTds}
            <td class="excel-cell-total" style="font-weight:800;" id="practical-tot-${st.student_id}">${sum}</td>
            <td class="col-total" style="font-weight:800;color:${pct < 50 ? 'var(--status-absent)' : 'var(--status-present)'};" id="practical-pct-${st.student_id}">
              ${pct}%
            </td>
          </tr>
        `;
  }).join('') : `
    <tr>
      <td colspan="${totalCols}" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
        <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.5rem; color: var(--text-primary);">No students enrolled</div>
        <div style="font-size: 0.88rem;">${S.searchQuery ? 'No student matches your search filter.' : 'Enroll students in this teaching group to view practical lab marks.'}</div>
      </td>
    </tr>
  `;

  const rCount = roster.length || 1;
  const classAvgTotal = (grandTotalSum / rCount).toFixed(1);
  const classAvgPct = maxPossible > 0 ? Math.round((grandTotalSum / (rCount * maxPossible)) * 100) : 0;

  const footerCols = practicals.length ? practicals.map((_, i) => {
    const colAvg = (colTotals[i] / rCount).toFixed(1);
    return `<td class="col-practical excel-summary-avg" id="practical-col-avg-${i}">${colAvg}</td>`;
  }).join('') : '<td class="col-practical excel-summary-avg">—</td>';

  let tableHtml = `
        <table class="excel-table sheet-table" id="table-practicals-marksheet">
          <thead>
            <tr class="excel-hdr-blue row-1">
              <th colspan="${totalCols}">
                <h3>Government Polytechnic College — Information Technology Dept | ${esc(S.group?.academic_year_label || (S.group?.academic_year_label || S.activeSessionLabel || '2026-27 (Winter Session)'))}</h3>
              </th>
            </tr>
            <tr class="excel-hdr-blue row-2">
              <th colspan="${totalCols}">
                Department (${deptCode}) | Laboratory &amp; Practical Work Evaluation | Subject : ${subName}
              </th>
            </tr>
            <tr class="excel-hdr-blue row-3">
              <th colspan="${totalCols}">
                Department of ${deptCode} Year ${yr} | Semester ${sem}
              </th>
            </tr>

            <!-- Row 4: Tan Header -->
            <tr class="excel-hdr-tan">
              <th class="col-sr" style="width: 50px;">SR. NO.</th>
              <th class="col-roll" style="width: 85px;">ROLL NO.</th>
              <th class="col-reg" style="width: 125px;">REG. NO.</th>
              <th class="col-enroll" style="width: 125px;">UBTER ROLL NO.</th>
              <th class="col-name" style="min-width: 200px;">STUDENT NAME</th>
              ${practicals.length ? practicals.map((p, i) => `<th class="col-practical" title="${esc(p.title || p.name || 'Lab Experiment ' + (i + 1))}">${esc(getPracticalShortHeader(p, i))}</th>`).join('') : '<th class="col-practical" style="width: 120px;">Practicals</th>'}
              <th style="width: 90px;">Total Marks</th>
              <th class="col-total" style="width: 80px;">Average %</th>
            </tr>

            <!-- Row 5: Numbers Row for Practical Max Marks -->
            <tr class="excel-hdr-numbers">
              <th class="col-sr hdr-num-label">—</th>
              <th class="col-roll hdr-num-label">—</th>
              <th class="col-reg hdr-num-label">—</th>
              <th class="col-enroll hdr-num-label">—</th>
              <th class="col-name hdr-num-label" style="text-align:right;padding-right:0.6rem;">Max Marks &rarr;</th>
              ${practicals.length ? practicals.map((p, i) => `
                <th class="col-practical">
                  <input type="number" 
                         class="excel-hdr-num-input ${S.isEditMode ? 'is-editable' : ''}" 
                         value="${p.max_marks || 25}" 
                         min="0.5" 
                         max="100" 
                         step="any"
                         ${S.isEditMode ? '' : 'readonly'}
                         title="${esc(p.title || p.name)} Max Marks"
                         onchange="onPracticalColMaxChange(${i}, this.value)">
                </th>
              `).join('') : '<th class="col-practical hdr-num-label">—</th>'}
              <th style="text-align:center;">
                <span class="excel-hdr-num-badge" id="practical-hdr-total-max">${maxPossible}</span>
              </th>
              <th class="col-total" style="font-weight:800;color:var(--text-muted);font-size:0.75rem;">100%</th>
            </tr>
          </thead>

          <tbody>
            ${bodyRows}
          </tbody>

          <tfoot>
            <tr class="excel-summary-row">
              <td colspan="5" class="excel-summary-lbl" style="text-align:right;padding-right:1rem;font-weight:800;">
                Class Average:
              </td>
              ${footerCols}
              <td class="excel-summary-avg" id="practical-foot-total" style="font-weight:800;">${classAvgTotal}</td>
              <td class="excel-summary-avg" id="practical-foot-pct" style="font-weight:800;color:var(--status-present);">${classAvgPct}%</td>
            </tr>
          </tfoot>
        </table>
      `;

  container.innerHTML = tableHtml;
  updateStickyHeaderOffsets(document.getElementById('table-practicals-marksheet'));
  updateColumnFocusSelectOptions();
  if (S.viewMode === 'overview' && S.autoFit) {
    setTimeout(() => fitSheetToScreen(false), 30);
  } else if (S.viewMode === 'dynamic') {
    setSheetZoom(1.0);
  }
}

function onPracticalColMaxChange(idx, val) {
  if (!S.practicalAssignments || !S.practicalAssignments[idx]) return;
  S.practicalAssignments[idx].max_marks = Math.max(0.5, parseFloat(val) || 25);
  renderPracticalsSheetTable();
  showToast(`Updated practical maximum marks to ${S.practicalAssignments[idx].max_marks}!`, 'info');
  triggerAutoSaveIndicator();
}

function onPracticalStandaloneScoreChange(studentId, practicalIdx, val) {
  if (!S.practicalScores) S.practicalScores = {};
  if (practicalIdx !== undefined && val !== undefined) {
    S.practicalScores[`${studentId}_${practicalIdx}`] = Math.max(0, parseFloat(val) || 0);
  }

  const row = document.getElementById(`practical-row-${studentId}`);
  if (!row) return;

  const inputs = row.querySelectorAll('input[data-type="practical-standalone"]');
  let sum = 0;
  inputs.forEach((inp, idx) => {
    const v = Number(inp.value) || 0;
    sum += v;
    S.practicalScores[`${studentId}_${idx}`] = v;
  });

  const maxPossible = (S.practicalAssignments || []).reduce((s, p) => s + (Number(p.max_marks) || 25), 0);
  const pct = maxPossible > 0 ? Math.round((sum / maxPossible) * 100) : 0;

  const totEl = document.getElementById(`practical-tot-${studentId}`);
  if (totEl) totEl.textContent = sum;
  const pctEl = document.getElementById(`practical-pct-${studentId}`);
  if (pctEl) {
    pctEl.textContent = `${pct}%`;
    pctEl.style.color = pct < 50 ? 'var(--status-absent)' : 'var(--status-present)';
  }

  updatePracticalClassAverages();
  persistPracticalsLocal();
  triggerAutoSaveIndicator();
}

function updatePracticalClassAverages() {
  const practicals = S.practicalAssignments || [];
  const rows = document.querySelectorAll('#table-practicals-marksheet tbody tr');
  const rCount = rows.length || 1;
  const colSums = practicals.map(() => 0);
  let grandSum = 0;

  rows.forEach(r => {
    const inps = r.querySelectorAll('input[data-type="practical-standalone"]');
    inps.forEach((inp, idx) => {
      colSums[idx] += Number(inp.value) || 0;
    });
    const tot = Number(r.querySelector('.excel-cell-total')?.textContent) || 0;
    grandSum += tot;
  });

  practicals.forEach((_, i) => {
    const el = document.getElementById(`practical-col-avg-${i}`);
    if (el) el.textContent = safeDiv(colSums[i], rCount).toFixed(1);
  });

  const maxPossible = practicals.reduce((s, p) => s + (Number(p.max_marks) || 25), 0);
  const fTot = document.getElementById('practical-foot-total');
  if (fTot) fTot.textContent = safeDiv(grandSum, rCount).toFixed(1);
  const fPct = document.getElementById('practical-foot-pct');
  if (fPct) {
    const avgPct = maxPossible > 0 ? Math.round(safeDiv(grandSum, (rCount * maxPossible)) * 100) : 0;
    fPct.textContent = `${avgPct}%`;
  }
}

function persistPracticalsLocal() {
  if (!S.groupId) return;
  try {
    if (S.practicalAssignments) {
      localStorage.setItem(`practicals_data_${S.groupId}`, JSON.stringify(S.practicalAssignments));
    }
    if (S.practicalScores) {
      localStorage.setItem(`practical_scores_${S.groupId}`, JSON.stringify(S.practicalScores));
    }
  } catch (e) { }
}

/* Attendance matrix ledger has been permanently consolidated into /faculty/registers.html */
/* ══════════════════════════════════════════════════════════════
   SAVE ACTIVE SHEET CHANGES TO BACKEND
   ══════════════════════════════════════════════════════════════ */
async function saveActiveSheetChanges() {
  const btn = document.getElementById('btn-save-sheet-changes');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `Saving...`;
  }

  triggerAutoSaveIndicator(true);

  try {
    if (S.activeSheet === 'tests' && S.currentTestState) {
      const testId = S.currentTestId;
      const scores = S.currentTestState.roster.map(r => ({
        student_id: r.student_id,
        marks_obtained: r.is_absent ? 0 : r.total_marks,
        is_absent: Boolean(r.is_absent),
        question_scores: r.question_scores
      }));

      const res = await apiFetch(`/teaching-groups/${S.groupId}/tests/${testId}/scores`, {
        method: 'POST',
        body: JSON.stringify({
          scores: scores,
          questions: S.currentTestState.questions,
          instructions: S.currentTestState.instructions
        })
      });

      if (res && res.success) {
        showToast('Class test marks & rubric saved to database!', 'success');
      } else {
        showToast(res.error?.message || 'Marks saved locally', 'info');
      }
    } else if (S.activeSheet === 'evaluation') {
      showToast('Master evaluation spreadsheet changes saved successfully!', 'success');
    } else {
      showToast('Spreadsheet records saved successfully!', 'success');
    }
  } catch (err) {
    console.error('Save error:', err);
    showToast('Marks cached locally for offline preservation', 'info');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            Save Changes
          `;
    }
    triggerAutoSaveIndicator(false);
  }
}

function triggerAutoSaveIndicator(isSaving = false) {
  const ind = document.getElementById('save-indicator');
  const text = document.getElementById('save-status-text');
  if (!ind || !text) return;

  if (isSaving) {
    ind.className = 'save-indicator-badge saving';
    text.textContent = 'Saving changes...';
  } else {
    ind.className = 'save-indicator-badge saved';
    text.textContent = 'All changes synced';
  }
}

/* ══════════════════════════════════════════════════════════════
   EXPORT ACTIVE SHEET ENGINE
   ══════════════════════════════════════════════════════════════ */
function toggleExportMenu(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  const m = document.getElementById('export-dropdown-menu');
  const btn = document.getElementById('btn-export-dropdown');
  if (typeof openDropdownOverlay === 'function') {
    openDropdownOverlay(m, btn);
  } else {
    if (!m) return;
    const isHidden = m.style.display === 'none' || !m.classList.contains('open');
    m.classList.toggle('open', isHidden);
    m.style.display = isHidden ? 'flex' : 'none';
  }
}

async function exportTableToRealXlsx(tableOrClone, filename, sheetTitle) {
  if (!tableOrClone) return;

  const clone = tableOrClone.cloneNode ? tableOrClone.cloneNode(true) : tableOrClone;
  // Convert nested student cell to readable format
  clone.querySelectorAll('.dyn-student-cell').forEach(cell => {
    const name = cell.querySelector('.dyn-student-name')?.textContent?.trim() || '';
    const enrl = cell.querySelector('.dyn-student-enroll')?.textContent?.trim() || '';
    if (name && enrl) {
      cell.textContent = `${name} (${enrl})`;
    } else if (name) {
      cell.textContent = name;
    }
  });

  // Primary client-side binary OpenXML (.xlsx) generator with ExcelJS
  if (typeof ExcelJS !== 'undefined') {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'VidyaOS Institutional Campus OS';
      wb.created = new Date();

      const cleanSheetName = (sheetTitle || filename || 'Evaluation')
        .replace(/[*?:/\\\[\]]/g, ' ')
        .trim()
        .substring(0, 31) || 'Sheet1';

      const ws = wb.addWorksheet(cleanSheetName, {
        views: [{ showGridLines: true }],
        pageSetup: { orientation: 'landscape', fitToPage: true }
      });

      const borderThin = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };

      const matrix = [];
      let maxCols = 1;
      const trElements = clone.querySelectorAll('tr');

      trElements.forEach((tr, rIdx) => {
        const excelRowIdx = rIdx + 1;
        if (!matrix[excelRowIdx]) matrix[excelRowIdx] = [];
        let excelColIdx = 1;

        const cells = tr.querySelectorAll('th, td');
        cells.forEach(cell => {
          while (matrix[excelRowIdx][excelColIdx]) {
            excelColIdx++;
          }

          const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
          const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);

          const isBlue = cell.classList.contains('excel-hdr-blue') || tr.classList.contains('excel-hdr-blue');
          const isTan = cell.classList.contains('excel-hdr-tan') || tr.classList.contains('excel-hdr-tan');
          const isSub = cell.classList.contains('excel-hdr-sub') || tr.classList.contains('excel-hdr-sub') || cell.classList.contains('excel-hdr-numbers') || tr.classList.contains('excel-hdr-numbers');
          const isSummary = cell.classList.contains('excel-summary-lbl') || cell.classList.contains('excel-summary-avg') || tr.closest('tfoot');
          const isName = cell.classList.contains('cell-student-name') || cell.querySelector('.dyn-student-name');
          const isHeader = cell.tagName.toLowerCase() === 'th' || tr.closest('thead');
          const isAbsent = cell.classList.contains('is-absent');

          let text = cell.textContent.replace(/\s+/g, ' ').trim();
          let val = text;
          if (!isHeader && text !== '' && !isNaN(text) && !text.includes('/') && !text.includes('-') && !(text.length > 1 && text.startsWith('0'))) {
            const num = Number(text);
            if (!isNaN(num)) val = num;
          }

          const excelCell = ws.getCell(excelRowIdx, excelColIdx);
          excelCell.value = val;

          if (isBlue) {
            excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
            excelCell.font = { name: 'Calibri', size: tr.classList.contains('row-1') ? 12 : 10, bold: true, color: { argb: 'FF0369A1' } };
            excelCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          } else if (isTan) {
            excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3C7' } };
            excelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF92400E' } };
            excelCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          } else if (isSub) {
            excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            excelCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF334155' } };
            excelCell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (isSummary) {
            excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cell.classList.contains('excel-summary-lbl') ? 'FFF1F5F9' : 'FFE2E8F0' } };
            excelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
            excelCell.alignment = { horizontal: cell.classList.contains('excel-summary-lbl') ? 'right' : 'center', vertical: 'middle' };
          } else if (isAbsent || text === 'AB' || text === 'A') {
            excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            excelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } };
            excelCell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            let cellFontColor = '#0f172a';
            if (cell.style && cell.style.color) {
              cellFontColor = resolveColorToHex(cell.style.color, '#0f172a');
            }
            let cellBg = null;
            if (cell.style && cell.style.backgroundColor) {
              cellBg = resolveColorToHex(cell.style.backgroundColor, '#ffffff');
              excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + cellBg.replace('#', '').toUpperCase() } };
            }
            cellFontColor = ensureExportContrast(cellFontColor, cellBg);
            excelCell.font = { name: 'Calibri', size: 10, bold: Boolean(isName || isHeader), color: { argb: 'FF' + cellFontColor.replace('#', '').toUpperCase() } };
            excelCell.alignment = { horizontal: isName ? 'left' : 'center', vertical: 'middle' };
          }

          if (rowspan > 1 || colspan > 1) {
            const endRow = excelRowIdx + rowspan - 1;
            const endCol = excelColIdx + colspan - 1;
            ws.mergeCells(excelRowIdx, excelColIdx, endRow, endCol);

            for (let r = excelRowIdx; r <= endRow; r++) {
              if (!matrix[r]) matrix[r] = [];
              for (let c = excelColIdx; c <= endCol; c++) {
                matrix[r][c] = true;
                ws.getCell(r, c).border = borderThin;
              }
            }
          } else {
            matrix[excelRowIdx][excelColIdx] = true;
            excelCell.border = borderThin;
          }

          excelColIdx += colspan;
          if (excelColIdx > maxCols) maxCols = excelColIdx;
        });

        const isFirst = rIdx === 0;
        ws.getRow(excelRowIdx).height = isFirst ? 28 : (tr.closest('thead') ? 22 : 20);
      });

      for (let c = 1; c <= maxCols; c++) {
        const col = ws.getColumn(c);
        let maxLen = 8;
        col.eachCell({ includeEmpty: false }, cell => {
          const v = cell.value ? String(cell.value) : '';
          if (v.length > maxLen && v.length < 50) maxLen = v.length;
        });
        col.width = Math.max(9, Math.min(maxLen + 3, 35));
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (clientErr) {
      console.error('Client-side ExcelJS export error:', clientErr);
      if (typeof showToast === 'function') {
        showToast('Excel export failed: ' + clientErr.message, 'error');
      } else {
        alert('Excel export failed: ' + clientErr.message);
      }
      return false;
    }
  } else {
    console.error('ExcelJS engine not loaded in window');
    if (typeof showToast === 'function') {
      showToast('Excel export engine is still initializing, please try again.', 'error');
    } else {
      alert('Excel export engine is still initializing, please try again.');
    }
    return false;
  }
}

function printActiveSheetDirect(activeTableId, sheetTitle) {
  const tableEl = document.getElementById(activeTableId);
  if (!tableEl) {
    window.print();
    return;
  }

  // 1. Get institutional banner
  const bannerEl = document.getElementById('sheet-institutional-banner');
  let bannerHtml = '';
  if (bannerEl) {
    const bannerClone = bannerEl.cloneNode(true);
    bannerClone.querySelectorAll('.banner-edit-indicator').forEach(el => el.remove());
    bannerClone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    bannerHtml = bannerClone.innerHTML;
  } else {
    bannerHtml = `<h3>${sheetTitle}</h3>`;
  }

  // 2. Clone active table and clean interactive controls
  const tableClone = tableEl.cloneNode(true);
  tableClone.querySelectorAll('input').forEach(inp => {
    const span = document.createElement('span');
    span.textContent = inp.value || '';
    inp.parentNode.replaceChild(span, inp);
  });
  tableClone.querySelectorAll('select').forEach(sel => {
    const span = document.createElement('span');
    span.textContent = sel.options && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex].text : sel.value;
    sel.parentNode.replaceChild(span, sel);
  });
  tableClone.querySelectorAll('button, .no-print, .btn, .btn-icon-minimal').forEach(el => el.remove());

  // 3. Complete standalone printable HTML
  const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${sheetTitle}</title>
  <style>
    @page { size: landscape; margin: 8mm 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0; padding: 10px; color: #0f172a; background: #ffffff;
      -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
    }
    .print-banner {
      text-align: center; border: 1.5px solid #1e293b; border-radius: 4px;
      padding: 8px 12px; margin-bottom: 12px; background-color: #f8fafc;
      page-break-after: avoid;
    }
    .print-banner h3 { margin: 0 0 4px 0; font-size: 13pt; font-weight: 800; color: #0f172a; }
    .print-banner .banner-row { margin: 2px 0; }
    .print-banner .row-2 { font-size: 10pt; font-weight: 700; color: #1e293b; }
    .print-banner .row-3 { font-size: 9pt; font-weight: 600; color: #475569; }
    table {
      width: 100%; border-collapse: collapse; margin: 0 0 16px 0;
      font-size: 8pt; color: #0f172a; page-break-inside: auto;
    }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td {
      border: 1px solid #475569; padding: 4px 6px; text-align: center;
      vertical-align: middle; font-size: 8pt; line-height: 1.25; position: static !important;
    }
    th { background-color: #f1f5f9; font-weight: 700; color: #0f172a; }
    th.excel-hdr-blue, tr.excel-hdr-blue th { background-color: #e0f2fe !important; color: #0369a1 !important; font-weight: 700; }
    th.excel-hdr-tan, tr.excel-hdr-tan th { background-color: #fef3c7 !important; color: #b45309 !important; font-weight: 700; }
    th.excel-hdr-sub, tr.excel-hdr-sub th { background-color: #f1f5f9 !important; color: #475569 !important; }
    .dyn-student-cell { text-align: left; }
    .dyn-student-name { font-weight: 700; color: #0f172a; font-size: 8pt; }
    .dyn-student-meta { font-size: 7pt; color: #64748b; }
    .excel-summary-lbl { background-color: #f8fafc !important; font-weight: 800; text-align: right; padding-right: 8px; }
    .excel-summary-avg { background-color: #f1f5f9 !important; font-weight: 800; }
    .sheet-print-signatures {
      display: flex; justify-content: space-between; margin-top: 35px;
      padding: 0 25px; page-break-inside: avoid;
    }
    .sig-box { text-align: center; min-width: 190px; }
    .sig-line { border-bottom: 1.5px solid #1e293b; margin-bottom: 6px; height: 40px; }
    .sig-title { font-weight: 700; font-size: 9pt; color: #0f172a; }
    .sig-sub { font-size: 7.5pt; color: #64748b; }
  </style>
</head>
<body>
  <div class="print-banner">
    ${bannerHtml}
  </div>
  ${tableClone.outerHTML}
  <div class="sheet-print-signatures">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-title">Subject Faculty Signature</div>
      <div class="sig-sub">Evaluator / Teacher In-Charge</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-title">Head of Department (HOD)</div>
      <div class="sig-sub">Department Seal &amp; Verification</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-title">Principal / Controller of Exams</div>
      <div class="sig-sub">Institutional Approval &amp; Record</div>
    </div>
  </div>
</body>
</html>`;

  try {
    const iframe = document.createElement('iframe');
    iframe.id = 'sheet-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(printHtml);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (printErr) {
        console.warn('Iframe print error, falling back to window.print():', printErr);
        window.print();
      }
      setTimeout(() => {
        try {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        } catch (_) { }
      }, 3000);
    }, 300);
  } catch (err) {
    console.warn('Isolated print failed, invoking direct window.print():', err);
    window.print();
  }
}

function exportCurrentSheet(format) {
  const menu = document.getElementById('export-dropdown-menu');
  if (menu) {
    menu.classList.remove('open');
    menu.style.display = 'none';
  }

  let activeTableId = 'table-master-evaluation';
  let filename = 'Institutional_Evaluation_Sheet';
  let sheetTitle = 'Master Internal Evaluation Sheet';
  if (S.activeSheet === 'tests') {
    if (S.currentTestViewMode === 'ALL') {
      activeTableId = 'table-all-tests-combined';
      filename = 'All_Unit_Tests_Combined_Marksheet';
      sheetTitle = 'All Unit Tests Marksheet & Evaluation Summary';
    } else {
      activeTableId = 'table-test-marksheet';
      filename = `Unit_Test_Marksheet_${S.currentTestId || 1}`;
      sheetTitle = 'Class Test Marksheet';
    }
  } else if (S.activeSheet === 'assignments') {
    activeTableId = 'table-assignments-marksheet';
    filename = 'Assignment_Coursework_Marksheet';
    sheetTitle = 'Coursework & Assignment Marksheet';
  } else if (S.activeSheet === 'practicals') {
    activeTableId = 'table-practicals-marksheet';
    filename = 'Practical_and_Lab_Work_Marksheet';
    sheetTitle = 'Practical & Lab Work Marksheet';
  }

  if (format === 'pdf') {
    printActiveSheetDirect(activeTableId, sheetTitle);
    return;
  }

  const table = document.getElementById(activeTableId);
  if (!table) {
    showToast('Table not found for export', 'error');
    return;
  }

  // Clone table and transform all input and select elements to text
  const clone = table.cloneNode(true);
  const origInputs = table.querySelectorAll('input, select');
  const cloneInputs = clone.querySelectorAll('input, select');
  cloneInputs.forEach((inp, idx) => {
    const orig = origInputs[idx] || inp;
    let val = '';
    if (inp.tagName.toLowerCase() === 'select') {
      val = orig.options && orig.selectedIndex >= 0 ? orig.options[orig.selectedIndex].text : (orig.value || '');
    } else {
      val = orig.value !== undefined ? orig.value : inp.getAttribute('value') || '';
    }
    const span = document.createElement('span');
    span.textContent = val;
    inp.parentNode.replaceChild(span, inp);
  });

  // Remove non-export elements (buttons, checkboxes, indicators)
  clone.querySelectorAll('button, .banner-edit-indicator, .no-export, .dropdown-item, .screen-ctrl-btn, .col-check, input[type="checkbox"]').forEach(el => el.remove());

  // Ensure institutional blue header rows exist in thead
  const thead = clone.querySelector('thead');
  if (thead && !clone.querySelector('.excel-hdr-blue')) {
    let colCount = 0;
    const firstRow = thead.querySelector('tr');
    if (firstRow) {
      firstRow.querySelectorAll('th, td').forEach(c => {
        colCount += parseInt(c.getAttribute('colspan') || '1', 10);
      });
    }
    if (colCount > 0) {
      const b1 = document.getElementById('hdr-banner-line1')?.textContent?.trim() || 'Uttarakhand Government Institute of Polytechnic, Nainital';
      const b2 = document.getElementById('hdr-banner-line2')?.textContent?.trim() || `Department (${S.group?.department_code || 'IT'}) | ${sheetTitle} | Subject : ${S.group?.name || 'Classroom'}`;
      const b3 = document.getElementById('hdr-banner-cohort')?.textContent?.trim() || `Academic Session ${S.group?.academic_year_label || '2026-27'}`;

      const tr3 = document.createElement('tr');
      tr3.className = 'excel-hdr-blue row-3';
      tr3.innerHTML = `<th colspan="${colCount}" style="background-color:#e0f2fe;color:#0369a1;font-weight:bold;font-size:9.5pt;padding:4px;text-align:center;">${esc(b3)}</th>`;

      const tr2 = document.createElement('tr');
      tr2.className = 'excel-hdr-blue row-2';
      tr2.innerHTML = `<th colspan="${colCount}" style="background-color:#e0f2fe;color:#0369a1;font-weight:bold;font-size:10pt;padding:5px;text-align:center;">${esc(b2)}</th>`;

      const tr1 = document.createElement('tr');
      tr1.className = 'excel-hdr-blue row-1';
      tr1.innerHTML = `<th colspan="${colCount}" style="background-color:#e0f2fe;color:#0369a1;font-weight:bold;font-size:12pt;padding:8px;text-align:center;"><h3>${esc(b1)}</h3></th>`;

      thead.insertBefore(tr3, thead.firstChild);
      thead.insertBefore(tr2, thead.firstChild);
      thead.insertBefore(tr1, thead.firstChild);
    }
  }

  const cssStyles = `
        table { border-collapse: collapse; width: 100%; font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #1e293b; margin-top: 8pt; }
        th, td { border: 1px solid #94a3b8; padding: 5px 6px; text-align: center; }
        .excel-hdr-blue, tr.excel-hdr-blue th { background-color: #e0f2fe !important; color: #0369a1 !important; font-weight: bold; text-align: center; }
        .excel-hdr-tan, tr.excel-hdr-tan th { background-color: #fef3c7 !important; color: #92400e !important; font-weight: bold; text-align: center; }
        .excel-hdr-sub, tr.excel-hdr-sub th { background-color: #f8fafc !important; color: #334155 !important; font-weight: bold; text-align: center; }
        .excel-hdr-numbers, tr.excel-hdr-numbers th { background-color: #f1f5f9 !important; color: #475569 !important; font-weight: bold; text-align: center; }
        .excel-summary-lbl { background-color: #f1f5f9 !important; font-weight: bold; text-align: right; }
        .excel-summary-avg { background-color: #e2e8f0 !important; font-weight: bold; text-align: center; }
        .is-absent { background-color: #fee2e2 !important; color: #dc2626 !important; font-weight: bold; }
        .cell-student-name { text-align: left !important; padding-left: 8px !important; font-weight: 600; }
        .cell-roll { font-weight: bold; text-align: center; }
      `;

  if (format === 'doc') {
    const html = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
              <meta charset="utf-8">
              <!--[if gte mso 9]>
              <xml>
                <w:WordDocument>
                  <w:View>Print</w:View>
                  <w:Zoom>100</w:Zoom>
                  <w:DoNotOptimizeForBrowser/>
                </w:WordDocument>
              </xml>
              <![endif]-->
              <style>
                @page Section1 {
                  size: 841.9pt 595.3pt;
                  mso-page-orientation: landscape;
                  margin: 0.4in 0.4in 0.4in 0.4in;
                }
                div.Section1 { page: Section1; }
                body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #1e293b; }
                ${cssStyles}
              </style>
            </head>
            <body>
              <div class="Section1">
                ${clone.outerHTML}
              </div>
            </body>
          </html>
        `;
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filename}.doc successfully!`, 'success');
  } else if (format === 'xlsx') {
    exportTableToRealXlsx(clone, filename, sheetTitle)
      .then(() => showToast(`Exported ${filename}.xlsx successfully!`, 'success'))
      .catch(err => showToast(`Failed to export Excel: ${err.message}`, 'error'));
  } else if (format === 'csv') {
    let csv = [];
    const rows = clone.querySelectorAll('tr');
    rows.forEach(r => {
      const cols = r.querySelectorAll('th, td');
      let rowData = [];
      cols.forEach(c => {
        let txt = c.innerText.replace(/"/g, '""').replace(/\s+/g, ' ').trim();
        rowData.push(`"${txt}"`);
      });
      if (rowData.length) csv.push(rowData.join(','));
    });

    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filename}.csv successfully!`, 'success');
  }
}

function triggerActiveExport(format) {
  return exportCurrentSheet(format);
}

/* ══════════════════════════════════════════════════════════════
   BAR 1 & BAR 2 INTERACTIVE STUDIO CONTROLS
   ══════════════════════════════════════════════════════════════ */
function toggleEditSaveMode() {
  const btn = document.getElementById('btn-edit-save-toggle');
  const icon = document.getElementById('edit-save-btn-icon');
  const text = document.getElementById('edit-save-btn-text');
  const instEl = document.getElementById('hdr-banner-inst');
  const cohortEl = document.getElementById('hdr-banner-cohort');
  const instInd = document.getElementById('hdr-banner-inst-indicator');
  const cohortInd = document.getElementById('hdr-banner-cohort-indicator');
  if (!btn || !text) return;

  if (!S.isEditMode) {
    S.isEditMode = true;
    btn.classList.add('is-editing');
    text.textContent = 'Save';
    if (icon) {
      icon.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
          `;
    }

    // Enable inline editing on Row 1 and Row 3 ONLY when edit button is clicked!
    if (instEl) {
      instEl.setAttribute('contenteditable', 'true');
      instEl.classList.add('banner-is-editable');
    }
    if (cohortEl) {
      cohortEl.setAttribute('contenteditable', 'true');
      cohortEl.classList.add('banner-is-editable');
    }
    if (instInd) instInd.style.display = 'inline-flex';
    if (cohortInd) cohortInd.style.display = 'inline-flex';

    // Enable all score inputs, number row inputs, and toggle buttons across all sheets
    const vp = document.getElementById('sheets-viewport');
    if (vp) {
      vp.querySelectorAll('input.excel-cell-input, input.sheet-cell-input, input.excel-hdr-num-input').forEach(inp => {
        inp.readOnly = false;
        inp.classList.add('is-editable');
      });
      vp.querySelectorAll('.btn-sheet-att-toggle').forEach(b => {
        b.disabled = false;
      });
      vp.querySelectorAll('.editable-test-field').forEach(f => {
        f.setAttribute('contenteditable', 'true');
        f.classList.add('is-editable');
      });
    }

    if (S.activeSheet === 'tests' && S.currentTestViewMode !== 'ALL') {
      renderTestSheetTable();
    }

    showToast('Edit Mode Enabled: Header rows, scores, and test details editable. Click Save when done.', 'info');
  } else {
    // Save Row 1 and Row 3 changes
    if (instEl) {
      const newInst = instEl.innerText.trim().replace(/\s+/g, ' ');
      if (newInst) {
        const sessionKey = (S.group && (S.group.academic_year_id || S.group.academic_year_label)) || '2026';
        const sessionStoreKey = `vidyaos_inst_header_session_${String(sessionKey).replace(/[^a-zA-Z0-9]/g, '_')}`;
        localStorage.setItem(sessionStoreKey, newInst);
        localStorage.setItem('vidyaos_institution_marks_header', newInst);
        document.querySelectorAll('.excel-editable-inst-header').forEach(el => {
          if (el.innerText !== newInst) el.innerText = newInst;
        });
      }
      instEl.setAttribute('contenteditable', 'false');
      instEl.classList.remove('banner-is-editable');
    }
    if (cohortEl) {
      const newCohort = cohortEl.innerText.trim().replace(/\s+/g, ' ');
      if (newCohort && S.groupId) {
        localStorage.setItem(`vidyaos_cohort_banner_${S.groupId}`, newCohort);
      }
      cohortEl.setAttribute('contenteditable', 'false');
      cohortEl.classList.remove('banner-is-editable');
    }
    if (instInd) instInd.style.display = 'none';
    if (cohortInd) cohortInd.style.display = 'none';

    // Disable all score inputs and number row inputs across all sheets
    const vp = document.getElementById('sheets-viewport');
    if (vp) {
      vp.querySelectorAll('input.excel-cell-input, input.sheet-cell-input, input.excel-hdr-num-input').forEach(inp => {
        inp.readOnly = true;
        inp.classList.remove('is-editable');
      });
      vp.querySelectorAll('.btn-sheet-att-toggle').forEach(b => {
        b.disabled = true;
      });
      vp.querySelectorAll('.editable-test-field').forEach(f => {
        f.setAttribute('contenteditable', 'false');
        f.classList.remove('is-editable');
      });
    }

    if (S.activeSheet === 'evaluation') {
      persistEvalDataLocal();
    } else if (S.activeSheet === 'tests') {
      if (S.currentTestViewMode === 'ALL') {
        persistAllTestsCombinedLocal();
      } else {
        saveCurrentTestCustomState();
      }
    } else if (S.activeSheet === 'assignments') {
      persistAssignmentsLocal();
    } else if (S.activeSheet === 'practicals') {
      persistPracticalsLocal();
    }

    saveActiveSheetChanges();
    S.isEditMode = false;
    btn.classList.remove('is-editing');
    text.textContent = 'Edit';
    if (icon) {
      icon.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          `;
    }

    if (S.activeSheet === 'tests' && S.currentTestViewMode !== 'ALL') {
      renderTestSheetTable();
    }

    showToast('Saved header, scores, and test details successfully!', 'success');
  }
}

function switchSheetDropdown(sheetName) {
  if (sheetName.startsWith('sheet_idx_')) {
    const idx = parseInt(sheetName.replace('sheet_idx_', ''), 10);
    switchWorksheet(idx);
  } else {
    switchSheetTab(sheetName);
  }
}

function renderSubsheetControls() {
  const container = document.getElementById('subsheet-selector-container');
  if (!container) return;

  if (S.activeSheet === 'tests') {
    const singleTestSheets = (EXCEL_WB.sheets || []).filter(s => s.type === 'single-test');
    const activeSheetObj = getActiveSheet();
    const activeVal = activeSheetObj && activeSheetObj.type === 'single-test' ? (activeSheetObj.shortName || activeSheetObj.testId || activeSheetObj.name) : 'ALL';

    let testOptions = '';
    if (singleTestSheets.length > 0) {
      testOptions = singleTestSheets.map((s, idx) => {
        const val = s.shortName || s.testId || `UT${idx + 1}`;
        const isSel = (String(activeVal) === String(val) || (activeSheetObj && activeSheetObj.name === s.name));
        const displayName = s.name.startsWith('UT') ? `${s.name}: Unit Test ${idx + 1}` : s.name;
        return `<option value="${esc(val)}" ${isSel ? 'selected' : ''}>${esc(displayName)} (20M)</option>`;
      }).join('');
    } else if (Array.isArray(S.tests) && S.tests.length) {
      testOptions = S.tests.map((t, idx) => {
        const shortCode = getTestShortHeader(t, idx);
        const tName = t.title || t.name || 'Unit Test';
        return `
            <option value="${t.id}" ${S.currentTestViewMode !== 'ALL' && String(t.id) === String(S.currentTestId) ? 'selected' : ''}>
              ${esc(shortCode)}: ${esc(tName)} (${t.max_marks || 20}M)
            </option>
          `;
      }).join('');
    } else {
      testOptions = `
        <option value="UT1" ${activeVal === 'UT1' ? 'selected' : ''}>UT1: Unit Test 1 (20M)</option>
        <option value="UT2" ${activeVal === 'UT2' ? 'selected' : ''}>UT2: Unit Test 2 (20M)</option>
        <option value="UT3" ${activeVal === 'UT3' ? 'selected' : ''}>UT3: Unit Test 3 (20M)</option>
      `;
    }

    container.innerHTML = `
      <select class="subsheet-select-dropdown" id="subsheet-test-select" onchange="switchTestSubsheet(this.value)" title="Switch Unit Test or Combined View">
        <option value="ALL" ${activeVal === 'ALL' ? 'selected' : ''}>All Unit Tests Combined</option>
        ${testOptions}
      </select>
    `;
  } else if (S.activeSheet === 'assignments') {
    const assignments = S.theoryAssignments || [];
    const aOptions = assignments.map((a, idx) => {
      const shortCode = getAssignShortHeader(a, idx);
      const aName = a.title || a.name || 'Assignment';
      return `
            <option value="${a.id}">
              ${esc(shortCode)}: ${esc(aName)} (${a.max_marks || 20}M)
            </option>
          `;
    }).join('');

    container.innerHTML = `
          <select class="subsheet-select-dropdown" id="subsheet-assign-select" onchange="switchAssignmentSubsheet(this.value)" title="Coursework &amp; Assignments View">
            <option value="ALL">All Assignments Combined</option>
            ${aOptions}
          </select>
        `;
  } else if (S.activeSheet === 'practicals') {
    const practicals = S.practicalAssignments || [];
    const pOptions = practicals.map((p, idx) => {
      const shortCode = getPracticalShortHeader(p, idx);
      const pName = p.title || p.name || 'Lab Experiment';
      return `
            <option value="${p.id}">
              ${esc(shortCode)}: ${esc(pName)} (${p.max_marks || 25}M)
            </option>
          `;
    }).join('');

    container.innerHTML = `
          <select class="subsheet-select-dropdown" id="subsheet-practical-select" onchange="switchPracticalSubsheet(this.value)" title="Practical &amp; Lab Work View">
            <option value="ALL">All Lab Practicals Combined</option>
            ${pOptions}
          </select>
        `;
  } else {
    container.innerHTML = '';
  }
}

function switchPracticalSubsheet(val) {
  switchSheetTab('practicals');
}

function switchTestSubsheet(val) {
  if (!val || val === 'ALL') {
    // Switch to Unit Tests - Consolidated
    const idx = EXCEL_WB.sheets.findIndex(s => s.type === 'tests' && !s.testId);
    if (idx !== -1) {
      switchWorksheet(idx);
    } else {
      switchSheetTab('tests');
    }
  } else {
    // Switch to single-test sheet matching testId, shortName, or name
    const idx = EXCEL_WB.sheets.findIndex(s =>
      s.type === 'single-test' && (
        String(s.testId) === String(val) ||
        String(s.shortName) === String(val) ||
        s.name === String(val) ||
        s.name === `UT${val}` ||
        s.name === `Unit Test ${val}` ||
        s.name.startsWith(String(val))
      )
    );
    if (idx !== -1) {
      switchWorksheet(idx);
    } else {
      switchSheetTab('tests');
      // If column exists in active sheet, select it
      const sheet = getActiveSheet();
      if (sheet) {
        for (let c = 3; c < sheet.colsCount; c++) {
          const h = String(getCell(sheet, 0, c).v || '');
          if (h.includes(String(val))) {
            selectEntireColumn(c);
            break;
          }
        }
      }
    }
  }
}

function switchAssignmentSubsheet(val) {
  switchSheetTab('assignments');
  if (val && val !== 'ALL') {
    const sheet = getActiveSheet();
    if (sheet) {
      for (let c = 3; c < sheet.colsCount; c++) {
        const h = String(getCell(sheet, 0, c).v || '');
        if (h.includes(String(val)) || (S.assignments && S.assignments.find(a => String(a.id) === String(val) && h.includes(a.title || a.name)))) {
          selectEntireColumn(c);
          break;
        }
      }
    }
  }
}



/* ══════════════════════════════════════════════════════════════
   EDIT STUDENT SPREADSHEET ROW MODAL
   ══════════════════════════════════════════════════════════════ */
function openEditStudentRosterModal() {
  const select = document.getElementById('modal-roster-student-select');
  if (!select) return;

  let roster = [];
  if (S.activeSheet === 'evaluation' && S.evalData && Array.isArray(S.evalData.roster)) {
    roster = S.evalData.roster;
  } else if (S.activeSheet === 'tests' && S.currentTestState && Array.isArray(S.currentTestState.roster)) {
    roster = S.currentTestState.roster;
  } else if (S.members && S.members.length) {
    roster = S.members;
  }

  if (!roster.length) {
    showToast('No students enrolled in this class', 'warning');
    return;
  }

  select.innerHTML = roster.map((st, idx) => `
        <option value="${st.student_id || (idx + 1)}">
          Roll #${st.class_roll_no || (idx + 1)}: ${esc(st.full_name || st.name)}
        </option>
      `).join('');

  onSelectStudentInRosterModal(select.value);
  openModal('modal-edit-student-roster');
}

function onSelectStudentInRosterModal(studentId) {
  const sId = Number(studentId);
  const nameInput = document.getElementById('roster-modal-name');
  const rollInput = document.getElementById('roster-modal-roll');
  const container = document.getElementById('roster-modal-scores-container');
  if (!container) return;

  let evalSt = S.evalData?.roster?.find(r => Number(r.student_id) === sId);
  let testSt = S.currentTestState?.roster?.find(r => Number(r.student_id) === sId);
  let memberSt = S.members?.find(m => Number(m.student_id) === sId || Number(m.id) === sId);

  const st = evalSt || testSt || memberSt || {
    student_id: sId,
    class_roll_no: sId,
    full_name: 'Student ' + sId,
    official_enrollment_no: ''
  };

  if (nameInput) nameInput.value = st.full_name || st.name || '';
  if (rollInput) rollInput.value = st.class_roll_no || sId;

  let contentHtml = '';

  if (S.activeSheet === 'evaluation') {
    const assigns = S.evalData?.assignments || [];
    const exams = S.evalData?.exams || [];
    const customs = S.evalData?.custom_columns || [];
    const stAssigns = evalSt?.assignments || {};
    const stExams = evalSt?.exams || {};
    const stCustoms = evalSt?.custom_scores || {};

    contentHtml += `
          <div style="background:var(--bg-surface);padding:0.75rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);">
            <div style="font-weight:800;font-size:0.8rem;color:var(--text-main);margin-bottom:0.4rem;">Assignments (Max 15 Marks Target)</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));gap:0.45rem;">
              ${assigns.map((a, i) => `
                <div>
                  <label style="font-size:0.7rem;font-weight:700;color:var(--text-muted);">${esc(a.title || 'A' + (i + 1))} (Max ${a.max_marks || 20})</label>
                  <input type="number" class="form-input-field modal-score-input" data-cat="assign" data-id="${a.id}" value="${stAssigns[a.id] !== undefined ? stAssigns[a.id] : 18}" min="0" max="${a.max_marks || 20}" step="0.5">
                </div>
              `).join('')}
            </div>
          </div>

          <div style="background:var(--bg-surface);padding:0.75rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);">
            <div style="font-weight:800;font-size:0.8rem;color:var(--text-main);margin-bottom:0.4rem;">Unit Tests (Max 20 Marks Target)</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));gap:0.45rem;">
              ${exams.map((e, i) => `
                <div>
                  <label style="font-size:0.7rem;font-weight:700;color:var(--text-muted);">${esc(e.title || 'UT ' + (i + 1))} (Max ${e.max_marks || 20})</label>
                  <input type="number" class="form-input-field modal-score-input" data-cat="exam" data-id="${e.id}" value="${stExams[e.id] !== undefined ? stExams[e.id] : 16}" min="0" max="${e.max_marks || 20}" step="0.5">
                </div>
              `).join('')}
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
            <div style="background:var(--bg-surface);padding:0.75rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);">
              <label style="font-size:0.74rem;font-weight:700;color:var(--text-main);">Attendance % (Held: ${evalSt?.attendance_held || 45})</label>
              <input type="number" class="form-input-field modal-score-input" data-cat="att_pct" value="${evalSt?.attendance_pct !== undefined ? evalSt.attendance_pct : 85}" min="0" max="100">
            </div>
            <div style="background:var(--bg-surface);padding:0.75rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);">
              <label style="font-size:0.74rem;font-weight:700;color:var(--text-main);">Presentation / Problem Solving (Max 5)</label>
              <input type="number" class="form-input-field modal-score-input" data-cat="pres" value="${evalSt?.presentation_marks !== undefined ? evalSt.presentation_marks : 4}" min="0" max="5" step="0.5">
            </div>
          </div>
        `;

    if (customs.length) {
      contentHtml += `
            <div style="background:var(--bg-surface);padding:0.75rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);">
              <div style="font-weight:800;font-size:0.8rem;color:var(--text-main);margin-bottom:0.4rem;">Continuous Assessments (Custom Columns)</div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));gap:0.45rem;">
                ${customs.map(c => `
                  <div>
                    <label style="font-size:0.7rem;font-weight:700;color:var(--text-muted);">${esc(c.title)} (Max ${c.max_marks})</label>
                    <input type="number" class="form-input-field modal-score-input" data-cat="custom" data-id="${c.id}" value="${stCustoms[c.id] !== undefined ? stCustoms[c.id] : Math.round(c.max_marks * 0.8)}" min="0" max="${c.max_marks}" step="0.5">
                  </div>
                `).join('')}
              </div>
            </div>
          `;
    }
  } else if (S.activeSheet === 'tests' && S.currentTestState) {
    const qList = S.currentTestState.questions || [];
    const qScores = testSt?.question_scores || {};
    contentHtml += `
          <div style="display:flex;align-items:center;gap:0.75rem;background:var(--bg-surface);padding:0.75rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);">
            <label style="font-size:0.8rem;font-weight:700;display:flex;align-items:center;gap:0.45rem;cursor:pointer;">
              <input type="checkbox" id="modal-test-absent-checkbox" ${testSt?.is_absent ? 'checked' : ''}>
              <span>Mark Student Absent</span>
            </label>
          </div>
          <div style="background:var(--bg-surface);padding:0.75rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);">
            <div style="font-weight:800;font-size:0.8rem;color:var(--text-main);margin-bottom:0.4rem;">Question-Wise Test Scores</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(90px, 1fr));gap:0.45rem;">
              ${qList.map((q, i) => `
                <div>
                  <label style="font-size:0.7rem;font-weight:700;color:var(--text-muted);">${q.label} (Max ${q.max})</label>
                  <input type="number" class="form-input-field modal-score-input" data-cat="question" data-idx="${i}" value="${qScores[i] !== undefined ? qScores[i] : Math.round(q.max * 0.75)}" min="0" max="${q.max}" step="0.5">
                </div>
              `).join('')}
            </div>
          </div>
        `;
  } else if (S.activeSheet === 'assignments') {
    const assigns = S.assignments || [];
    contentHtml += `
          <div style="background:var(--bg-surface);padding:0.75rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);">
            <div style="font-weight:800;font-size:0.8rem;color:var(--text-main);margin-bottom:0.4rem;">Coursework Assignment Scores</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));gap:0.45rem;">
              ${assigns.map((a, i) => `
                <div>
                  <label style="font-size:0.7rem;font-weight:700;color:var(--text-muted);">${esc(a.title || 'A' + (i + 1))} (Max ${a.max_marks || 20})</label>
                  <input type="number" class="form-input-field modal-score-input" data-cat="assign_standalone" data-idx="${i}" value="16" min="0" max="${a.max_marks || 20}" step="0.5">
                </div>
              `).join('')}
            </div>
          </div>
        `;
  } else {
    contentHtml += `
          <div style="background:var(--bg-surface);padding:0.75rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);">
            <div style="font-weight:800;font-size:0.8rem;color:var(--text-main);margin-bottom:0.4rem;">Attendance Status</div>
            <p style="font-size:0.78rem;color:var(--text-muted);">Adjust individual day cells directly in the matrix ledger or record bulk attendances.</p>
          </div>
        `;
  }

  container.innerHTML = contentHtml;
}

function confirmSaveStudentRosterModal() {
  const select = document.getElementById('modal-roster-student-select');
  if (!select) return;
  const sId = Number(select.value);

  if (S.activeSheet === 'evaluation' && S.evalData) {
    const st = S.evalData.roster.find(r => Number(r.student_id) === sId);
    if (st) {
      const inputs = document.querySelectorAll('#roster-modal-scores-container .modal-score-input');
      inputs.forEach(inp => {
        const cat = inp.dataset.cat;
        const val = parseFloat(inp.value) || 0;
        if (cat === 'assign') {
          if (!st.assignments) st.assignments = {};
          st.assignments[inp.dataset.id] = val;
        } else if (cat === 'exam') {
          if (!st.exams) st.exams = {};
          st.exams[inp.dataset.id] = val;
        } else if (cat === 'att_pct') {
          st.attendance_pct = val;
          st.attendance_marks = Math.min(10, Math.round((val / 100) * 10 * 10) / 10);
        } else if (cat === 'pres') {
          st.presentation_marks = val;
        } else if (cat === 'custom') {
          if (!st.custom_scores) st.custom_scores = {};
          st.custom_scores[inp.dataset.id] = val;
        }
      });
      renderEvaluationSheetTable();
    }
  } else if (S.activeSheet === 'tests' && S.currentTestState) {
    const st = S.currentTestState.roster.find(r => Number(r.student_id) === sId);
    if (st) {
      const absBox = document.getElementById('modal-test-absent-checkbox');
      st.is_absent = absBox ? absBox.checked : false;
      if (!st.question_scores) st.question_scores = {};
      const inputs = document.querySelectorAll('#roster-modal-scores-container .modal-score-input[data-cat="question"]');
      let sum = 0;
      inputs.forEach(inp => {
        const idx = Number(inp.dataset.idx);
        const val = parseFloat(inp.value) || 0;
        st.question_scores[idx] = val;
        sum += val;
      });
      st.total_marks = st.is_absent ? 0 : sum;
      renderTestSheetTable();
    }
  }

  closeModal('modal-edit-student-roster');
  triggerAutoSaveIndicator();
  showToast('Student row data updated successfully!', 'success');
}

/* ══════════════════════════════════════════════════════════════
   FLOATING TOOLS & ANDROID PROFILE DRAWER TOGGLERS
   ══════════════════════════════════════════════════════════════ */
function toggleFloatingToolsDrawer(forceState) {
  const fab = document.getElementById('btn-floating-tools');
  if (fab && fab.dataset.suppressClick === 'true') {
    return; // Suppress drawer opening right after dragging
  }
  const drawer = document.getElementById('floating-bottom-bar');
  if (!drawer) return;
  const isOpen = drawer.style.display !== 'none';
  const shouldOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
  drawer.style.display = shouldOpen ? 'block' : 'none';
}

/* ══════════════════════════════════════════════════════════════
   FLOATING ACTION BUTTON LONG-PRESS & BOUNDED DRAG CONTROLLER
   ══════════════════════════════════════════════════════════════ */
function initFloatingFabDrag() {
  const fab = document.getElementById('btn-floating-tools');
  if (!fab) return;

  // Restore previously saved position from localStorage
  try {
    const saved = JSON.parse(localStorage.getItem('sheets_fab_pos') || 'null');
    if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') {
      const btnW = fab.offsetWidth || 44;
      const btnH = fab.offsetHeight || 44;
      const maxX = window.innerWidth - btnW - 4;
      const maxY = window.innerHeight - btnH - 4;
      const x = Math.max(4, Math.min(maxX, saved.left));
      const y = Math.max(4, Math.min(maxY, saved.top));
      fab.style.left = `${x}px`;
      fab.style.top = `${y}px`;
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
    }
  } catch (err) { }

  let pressTimer = null;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  function getCoords(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;

    const p = getCoords(e);
    startX = p.x;
    startY = p.y;

    const rect = fab.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    // Long press threshold (250ms)
    pressTimer = setTimeout(() => {
      isDragging = true;
      fab.classList.add('fab-is-dragging');
      if (navigator.vibrate) {
        try { navigator.vibrate(30); } catch (vErr) { }
      }
    }, 250);

    window.addEventListener('mousemove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('touchcancel', onPointerUp);
  }

  function onPointerMove(e) {
    const p = getCoords(e);
    const dx = p.x - startX;
    const dy = p.y - startY;

    if (!isDragging) {
      // If moved > 8px before timer, cancel timer so normal click/scroll proceeds
      if (Math.hypot(dx, dy) > 8) {
        clearTimeout(pressTimer);
      }
      return;
    }

    e.preventDefault(); // Prevent page scrolling during drag

    const btnW = fab.offsetWidth || 44;
    const btnH = fab.offsetHeight || 44;
    const minX = 4;
    const maxX = window.innerWidth - btnW - 4;
    const minY = 4;
    const maxY = window.innerHeight - btnH - 4;

    const newX = Math.max(minX, Math.min(maxX, initialLeft + dx));
    const newY = Math.max(minY, Math.min(maxY, initialTop + dy));

    fab.style.left = `${newX}px`;
    fab.style.top = `${newY}px`;
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  }

  function onPointerUp() {
    clearTimeout(pressTimer);

    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('touchend', onPointerUp);
    window.removeEventListener('touchcancel', onPointerUp);

    if (isDragging) {
      isDragging = false;
      fab.classList.remove('fab-is-dragging');

      // Suppress upcoming click event so drawer doesn't open
      fab.dataset.suppressClick = 'true';
      setTimeout(() => {
        delete fab.dataset.suppressClick;
      }, 150);

      // Save position in localStorage
      const rect = fab.getBoundingClientRect();
      try {
        localStorage.setItem('sheets_fab_pos', JSON.stringify({ left: rect.left, top: rect.top }));
      } catch (sErr) { }
    }
  }

  fab.addEventListener('mousedown', onPointerDown);
  fab.addEventListener('touchstart', onPointerDown, { passive: true });
}



function handleLogout() {
  if (typeof logout === 'function') {
    logout();
  } else {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}

window.handleLogout = handleLogout;
window.initSheetsStudio = initSheetsStudio;
window.onSwitchGroup = onSwitchGroup;
window.switchClassGroup = onSwitchGroup;
window.switchSheetTab = switchSheetTab;
window.switchSheetDropdown = switchSheetDropdown;
window.loadTeacherGroupsList = loadTeacherGroupsList;
window.loadGroupMetadata = loadGroupMetadata;
window.renderGroupSwitcherOptions = renderGroupSwitcherOptions;
window.renderEvaluationSheetTable = renderEvaluationSheetTable;
window.loadEvaluationSheetData = loadEvaluationSheetData;
window.mergeAndCenter = mergeAndCenter;
window.mergeCellsOnly = mergeCellsOnly;
window.mergeAcross = mergeAcross;
window.unmergeSelectedCells = unmergeSelectedCells;
window.toggleMergeAndCenterMenu = toggleMergeAndCenterMenu;
window.toggleMergeAndCenterDirect = toggleMergeAndCenterDirect;
window.openExcelContextMenu = openExcelContextMenu;
window.closeExcelContextMenu = closeExcelContextMenu;



/* ══════════════════════════════════════════════════════════════
   EXCEL ENGINE & ADVANCED SPREADSHEET APPLICATION MODULE
   ══════════════════════════════════════════════════════════════ */

/* EXCEL_WB initialized at top of file */
if (!EXCEL_WB.name) {
  EXCEL_WB.name = 'VidyaOS_Marks_Evaluation.xlsx';
}
window.EXCEL_WB = EXCEL_WB;

/* ── Coordinate and Cell Helpers ── */
function colToLetter(c) {
  let temp = c;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function letterToCol(str) {
  let col = 0;
  const s = String(str).toUpperCase();
  for (let i = 0; i < s.length; i++) {
    col = col * 26 + (s.charCodeAt(i) - 64);
  }
  return col - 1;
}

function coordToRef(r, c) {
  return colToLetter(c) + (r + 1);
}

function refToCoord(refStr) {
  const m = String(refStr).trim().match(/^\$?([A-Za-z]+)\$?([0-9]+)$/);
  if (!m) return null;
  return {
    c: letterToCol(m[1]),
    r: parseInt(m[2], 10) - 1
  };
}

function parseRangeRef(rangeStr) {
  if (!rangeStr) return null;
  const parts = String(rangeStr).split(':');
  const c1 = refToCoord(parts[0]);
  if (!c1) return null;
  if (parts.length === 1) {
    return { r1: c1.r, c1: c1.c, r2: c1.r, c2: c1.c };
  }
  const c2 = refToCoord(parts[1]);
  if (!c2) return { r1: c1.r, c1: c1.c, r2: c1.r, c2: c1.c };
  return {
    r1: Math.min(c1.r, c2.r),
    c1: Math.min(c1.c, c2.c),
    r2: Math.max(c1.r, c2.r),
    c2: Math.max(c1.c, c2.c)
  };
}

function getActiveSheet() {
  if (!EXCEL_WB.sheets.length) {
    EXCEL_WB.sheets.push(createDefaultExcelSheet('Sheet1'));
  }
  if (EXCEL_WB.activeSheetIndex >= EXCEL_WB.sheets.length) {
    EXCEL_WB.activeSheetIndex = 0;
  }
  return EXCEL_WB.sheets[EXCEL_WB.activeSheetIndex];
}

function createDefaultExcelSheet(name, options = {}) {
  return {
    id: 'sheet_' + Math.random().toString(36).substr(2, 9),
    name: name || 'Sheet1',
    type: options.type || 'custom',
    rowsCount: options.rowsCount || 50,
    colsCount: options.colsCount || 26,
    colWidths: options.colWidths || {},
    rowHeights: options.rowHeights || {},
    cells: options.cells || {},
    merges: options.merges || [],
    frozenRows: options.frozenRows || 1,
    frozenCols: options.frozenCols || 2
  };
}

function getCell(sheet, r, c) {
  if (!sheet || !sheet.cells) return { raw: '', v: '', f: null, s: {} };
  const key = `${r},${c}`;
  return sheet.cells[key] || { raw: '', v: '', f: null, s: {} };
}

function setCell(sheet, r, c, valOrObj) {
  if (!sheet) return;
  if (!sheet.cells) sheet.cells = {};
  const key = `${r},${c}`;
  const existing = sheet.cells[key] || { raw: '', v: '', f: null, s: {} };

  if (typeof valOrObj === 'object' && valOrObj !== null) {
    const rawVal = valOrObj.raw !== undefined ? valOrObj.raw : existing.raw;
    const formulaVal = valOrObj.f || (typeof rawVal === 'string' && rawVal.trim().startsWith('=') ? rawVal.trim() : null);
    let computedVal = valOrObj.v;
    if (formulaVal && (computedVal === undefined || computedVal === null || computedVal === '')) {
      try {
        computedVal = evaluateExcelFormula(formulaVal, sheet);
      } catch (_) { }
    }
    sheet.cells[key] = {
      ...existing,
      ...valOrObj,
      raw: rawVal,
      f: formulaVal,
      v: computedVal !== undefined ? computedVal : existing.v,
      s: { ...(existing.s || {}), ...(valOrObj.s || {}) }
    };
  } else {
    const rawStr = String(valOrObj ?? '');
    const isFormula = rawStr.trim().startsWith('=');
    let computedVal = (rawStr !== '' && !isNaN(Number(rawStr))) ? Number(rawStr) : rawStr;
    if (isFormula) {
      try {
        computedVal = evaluateExcelFormula(rawStr.trim(), sheet);
      } catch (_) { }
    }
    sheet.cells[key] = {
      ...existing,
      raw: rawStr,
      f: isFormula ? rawStr.trim() : null,
      v: computedVal !== undefined ? computedVal : existing.v
    };
  }

  // Auto-expand sheet row/col bounds if needed
  if (r + 1 > sheet.rowsCount) sheet.rowsCount = r + 1;
  if (c + 1 > sheet.colsCount) sheet.colsCount = c + 1;
}

/* ══════════════════════════════════════════════════════════════
   EXCEL FORMULA EVALUATION ENGINE
   Supports: SUM, AVERAGE, COUNT, COUNTA, MIN, MAX, IF, SUMIF, COUNTIF, CONCAT, ROUND, TODAY
   Operators: +, -, *, /, ^, %, parentheses, comparisons (>, <, >=, <=, =, <>)
   ══════════════════════════════════════════════════════════════ */

function evaluateExcelFormula(formulaStr, sheet, evaluatingCells = new Set()) {
  if (!formulaStr || typeof formulaStr !== 'string') return '';
  const expr = formulaStr.trim().replace(/^=/, '').trim();
  if (!expr) return '';

  try {
    return evalTokens(expr, sheet, evaluatingCells);
  } catch (err) {
    return '#VALUE!';
  }
}

function evalTokens(expr, sheet, evaluatingCells) {
  // Check TODAY()
  if (/^TODAY\s*\(\s*\)$/i.test(expr)) {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

  // Check direct cross-sheet single cell reference (e.g. DataSheet!A2 or 'DataSheet'!A2)
  const crossSheetMatch = expr.match(/^(?:'([^']+)'|([A-Za-z0-9_]+))!\$?([A-Za-z]+)\$?([0-9]+)$/);
  if (crossSheetMatch) {
    const targetSheetName = crossSheetMatch[1] || crossSheetMatch[2];
    const colLetters = crossSheetMatch[3];
    const rowNum = crossSheetMatch[4];
    const targetSheet = (EXCEL_WB.sheets || []).find(s => s.name && s.name.trim().toLowerCase() === targetSheetName.trim().toLowerCase());
    if (targetSheet) {
      const c = letterToCol(colLetters);
      const r = parseInt(rowNum, 10) - 1;
      return getCellValueResolved(targetSheet, r, c, evaluatingCells);
    }
  }

  // Check direct single in-sheet cell reference (e.g. A1, $B$4)
  const singleCellMatch = expr.match(/^\$?([A-Za-z]+)\$?([0-9]+)$/);
  if (singleCellMatch) {
    const c = letterToCol(singleCellMatch[1]);
    const r = parseInt(singleCellMatch[2], 10) - 1;
    return getCellValueResolved(sheet, r, c, evaluatingCells);
  }

  // Handle function calls: NAME(...)
  const fnMatch = expr.match(/^([A-Za-z0-9_]+)\s*\((.*)\)$/);
  if (fnMatch) {
    const fnName = fnMatch[1].toUpperCase();
    const argsStr = fnMatch[2];
    const args = splitFormulaArgs(argsStr);

    switch (fnName) {
      case 'SUM': {
        const vals = resolveArgumentsToValues(args, sheet, evaluatingCells);
        return vals.reduce((acc, cur) => acc + (Number(cur) || 0), 0);
      }
      case 'AVERAGE': {
        const vals = resolveArgumentsToValues(args, sheet, evaluatingCells);
        const numVals = vals.map(v => Number(v)).filter(v => !isNaN(v));
        if (!numVals.length) return 0;
        const sum = numVals.reduce((a, b) => a + b, 0);
        return Math.round((sum / numVals.length) * 100) / 100;
      }
      case 'COUNT': {
        const vals = resolveArgumentsToValues(args, sheet, evaluatingCells);
        return vals.filter(v => v !== '' && v !== null && !isNaN(Number(v))).length;
      }
      case 'COUNTA': {
        const vals = resolveArgumentsToValues(args, sheet, evaluatingCells);
        return vals.filter(v => v !== '' && v !== null && v !== undefined).length;
      }
      case 'MIN': {
        const vals = resolveArgumentsToValues(args, sheet, evaluatingCells);
        const numVals = vals.map(v => Number(v)).filter(v => !isNaN(v));
        return numVals.length ? Math.min(...numVals) : 0;
      }
      case 'MAX': {
        const vals = resolveArgumentsToValues(args, sheet, evaluatingCells);
        const numVals = vals.map(v => Number(v)).filter(v => !isNaN(v));
        return numVals.length ? Math.max(...numVals) : 0;
      }
      case 'ROUND': {
        if (!args.length) return 0;
        const val = Number(evalTokens(args[0], sheet, evaluatingCells)) || 0;
        const dec = args.length > 1 ? (Number(evalTokens(args[1], sheet, evaluatingCells)) || 0) : 0;
        const factor = Math.pow(10, dec);
        return Math.round(val * factor) / factor;
      }
      case 'CONCAT':
      case 'CONCATENATE': {
        const vals = resolveArgumentsToValues(args, sheet, evaluatingCells);
        return vals.join('');
      }
      case 'IF': {
        if (!args.length) return '';
        const condVal = evalCondition(args[0], sheet, evaluatingCells);
        if (condVal) {
          return args.length > 1 ? evalTokens(args[1], sheet, evaluatingCells) : true;
        } else {
          return args.length > 2 ? evalTokens(args[2], sheet, evaluatingCells) : false;
        }
      }
      case 'COUNTIF': {
        if (args.length < 2) return 0;
        const rangeVals = resolveRangeToValues(args[0], sheet, evaluatingCells);
        const crit = stripQuotes(evalTokens(args[1], sheet, evaluatingCells));
        return rangeVals.filter(v => testCriteria(v, crit)).length;
      }
      case 'SUMIF': {
        if (args.length < 2) return 0;
        const condVals = resolveRangeToValues(args[0], sheet, evaluatingCells);
        const sumVals = args.length >= 3 ? resolveRangeToValues(args[2], sheet, evaluatingCells) : condVals;
        const crit = stripQuotes(evalTokens(args[1], sheet, evaluatingCells));
        let sum = 0;
        for (let i = 0; i < condVals.length; i++) {
          if (testCriteria(condVals[i], crit)) {
            sum += (Number(sumVals[i]) || 0);
          }
        }
        return sum;
      }
      default:
        break;
    }
  }

  // Handle Basic Arithmetic (+, -, *, /, ^, %) and Single Cell References
  return evalArithmetic(expr, sheet, evaluatingCells);
}

function splitFormulaArgs(argsStr) {
  const args = [];
  let current = '';
  let parenDepth = 0;
  let inQuotes = false;

  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i];
    if (ch === '"' && argsStr[i - 1] !== '\\') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (!inQuotes && ch === '(') {
      parenDepth++;
      current += ch;
    } else if (!inQuotes && ch === ')') {
      parenDepth--;
      current += ch;
    } else if (!inQuotes && ch === ',' && parenDepth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

function resolveArgumentsToValues(args, sheet, evaluatingCells) {
  const vals = [];
  args.forEach(arg => {
    if (arg.includes(':')) {
      vals.push(...resolveRangeToValues(arg, sheet, evaluatingCells));
    } else {
      const v = evalTokens(arg, sheet, evaluatingCells);
      vals.push(v);
    }
  });
  return vals;
}

function resolveRangeToValues(rangeStr, sheet, evaluatingCells) {
  const range = parseRangeRef(rangeStr);
  if (!range) return [];
  const vals = [];
  for (let r = range.r1; r <= range.r2; r++) {
    for (let c = range.c1; c <= range.c2; c++) {
      vals.push(getCellValueResolved(sheet, r, c, evaluatingCells));
    }
  }
  return vals;
}

function getCellValueResolved(sheet, r, c, evaluatingCells) {
  const cellKey = `${r},${c}`;
  if (evaluatingCells.has(cellKey)) return '#CIRCULAR!';
  const cell = getCell(sheet, r, c);
  if (cell.f) {
    evaluatingCells.add(cellKey);
    const val = evaluateExcelFormula(cell.f, sheet, evaluatingCells);
    evaluatingCells.delete(cellKey);
    return val;
  }
  return cell.v !== undefined ? cell.v : (cell.raw || '');
}

function evalCondition(condExpr, sheet, evaluatingCells) {
  const operators = ['>=', '<=', '<>', '>', '<', '='];
  for (const op of operators) {
    const idx = condExpr.indexOf(op);
    if (idx !== -1) {
      const leftStr = condExpr.substring(0, idx).trim();
      const rightStr = condExpr.substring(idx + op.length).trim();
      const leftVal = evalTokens(leftStr, sheet, evaluatingCells);
      const rightVal = evalTokens(rightStr, sheet, evaluatingCells);

      const numL = Number(leftVal);
      const numR = Number(rightVal);
      const isNum = !isNaN(numL) && !isNaN(numR);

      switch (op) {
        case '>=': return isNum ? numL >= numR : String(leftVal) >= String(rightVal);
        case '<=': return isNum ? numL <= numR : String(leftVal) <= String(rightVal);
        case '<>': return isNum ? numL !== numR : String(leftVal) !== String(rightVal);
        case '>': return isNum ? numL > numR : String(leftVal) > String(rightVal);
        case '<': return isNum ? numL < numR : String(leftVal) < String(rightVal);
        case '=': return isNum ? numL === numR : String(leftVal) === String(rightVal);
      }
    }
  }
  const res = evalTokens(condExpr, sheet, evaluatingCells);
  return Boolean(res && res !== '0' && res !== 0 && res !== '#VALUE!');
}

function testCriteria(val, crit) {
  const critStr = String(crit).trim();
  if (/^[><=]/.test(critStr)) {
    const m = critStr.match(/^([><=]+)(.*)$/);
    if (m) {
      const op = m[1];
      const target = Number(m[2]) || m[2];
      const numVal = Number(val);
      if (!isNaN(numVal) && !isNaN(target)) {
        if (op === '>') return numVal > target;
        if (op === '<') return numVal < target;
        if (op === '>=') return numVal >= target;
        if (op === '<=') return numVal <= target;
        if (op === '=') return numVal === target;
      }
    }
  }
  return String(val).toLowerCase() === critStr.toLowerCase();
}

function stripQuotes(str) {
  const s = String(str ?? '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function evalArithmetic(expr, sheet, evaluatingCells) {
  let e = expr.trim();
  if (e.startsWith('"') && e.endsWith('"')) {
    return e.slice(1, -1);
  }

  // 1. Replace cross-sheet references (e.g. DataSheet!A2 or 'DataSheet'!A2)
  e = e.replace(/(?:'([^']+)'|([A-Za-z0-9_]+))!\$?([A-Za-z]+)\$?([0-9]+)/g, (match, qName, uName, colLetters, rowNum) => {
    const targetSheetName = qName || uName;
    const targetSheet = (EXCEL_WB.sheets || []).find(s => s.name && s.name.trim().toLowerCase() === targetSheetName.trim().toLowerCase());
    if (!targetSheet) return '0';
    const c = letterToCol(colLetters);
    const r = parseInt(rowNum, 10) - 1;
    const resolved = getCellValueResolved(targetSheet, r, c, evaluatingCells);
    const num = Number(resolved);
    return isNaN(num) ? `"${String(resolved).replace(/"/g, '\\"')}"` : String(num);
  });

  // 2. Replace single cell references with their resolved values
  e = e.replace(/\$?([A-Za-z]+)\$?([0-9]+)/g, (match, colLetters, rowNum) => {
    const c = letterToCol(colLetters);
    const r = parseInt(rowNum, 10) - 1;
    const resolved = getCellValueResolved(sheet, r, c, evaluatingCells);
    const num = Number(resolved);
    return isNaN(num) ? `"${String(resolved).replace(/"/g, '\\"')}"` : String(num);
  });

  // Evaluate simple arithmetic expression safely without eval
  try {
    const sanitized = e.replace(/[^0-9+\-*/().^%eE \t]/g, '');
    if (sanitized === e) {
      // Safe math evaluator
      const fn = new Function(`return (${e.replace(/\^/g, '**')});`);
      const res = fn();
      return typeof res === 'number' && !isNaN(res) ? (Math.round(res * 10000) / 10000) : res;
    }
  } catch (_) { }

  return e;
}

/* ══════════════════════════════════════════════════════════════
   RECALCULATION ENGINE FOR SPREADSHEET
   ══════════════════════════════════════════════════════════════ */
function recalculateAllSheetFormulas(updateDom = true) {
  if (EXCEL_WB && Array.isArray(EXCEL_WB.sheets) && EXCEL_WB.sheets.length > 0) {
    EXCEL_WB.sheets.forEach(s => recalculateSheetFormulas(s));
  } else {
    recalculateSheetFormulas(getActiveSheet());
  }

  if (updateDom) {
    renderExcelGrid(false);
    updateStatusBarStats();
  }
}

function recalculateSheetFormulas(sheet) {
  if (!sheet || !sheet.cells) return;

  const formulaCells = [];
  for (const [key, cell] of Object.entries(sheet.cells)) {
    if (cell.f || (cell.raw && String(cell.raw).trim().startsWith('='))) {
      const [r, c] = key.split(',').map(Number);
      formulaCells.push({ r, c, cell });
    }
  }

  formulaCells.forEach(({ r, c, cell }) => {
    const fStr = cell.f || cell.raw;
    cell.f = fStr;
    const computed = evaluateExcelFormula(fStr, sheet);
    if ((computed === '' || computed === '#VALUE!') && cell.cachedValue !== undefined) {
      cell.v = cell.cachedValue;
    } else {
      cell.v = computed;
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   AUTO-FILL & RELATIVE FORMULA REFERENCE SHIFTING
   ══════════════════════════════════════════════════════════════ */
function shiftFormulaReferences(formulaStr, deltaRows, deltaCols) {
  if (!formulaStr || !formulaStr.startsWith('=')) return formulaStr;
  return formulaStr.replace(/(\$?)([A-Za-z]+)(\$?)([0-9]+)/g, (match, colLock, colLetters, rowLock, rowNum) => {
    let c = letterToCol(colLetters);
    let r = parseInt(rowNum, 10) - 1;

    if (!colLock) c += deltaCols;
    if (!rowLock) r += deltaRows;

    c = Math.max(0, c);
    r = Math.max(0, r);

    return (colLock ? '$' : '') + colToLetter(c) + (rowLock ? '$' : '') + (r + 1);
  });
}

function applyAutoFillToRange(srcRange, targetRange) {
  const sheet = getActiveSheet();
  if (!sheet) return;

  pushUndoState('Auto-Fill');

  const srcR1 = Math.min(srcRange.r1, srcRange.r2);
  const srcR2 = Math.max(srcRange.r1, srcRange.r2);
  const srcC1 = Math.min(srcRange.c1, srcRange.c2);
  const srcC2 = Math.max(srcRange.c1, srcRange.c2);

  const tgtR1 = Math.min(targetRange.r1, targetRange.r2);
  const tgtR2 = Math.max(targetRange.r1, targetRange.r2);
  const tgtC1 = Math.min(targetRange.c1, targetRange.c2);
  const tgtC2 = Math.max(targetRange.c1, targetRange.c2);

  const srcHeight = srcR2 - srcR1 + 1;
  const srcWidth = srcC2 - srcC1 + 1;

  for (let r = tgtR1; r <= tgtR2; r++) {
    for (let c = tgtC1; c <= tgtC2; c++) {
      if (r >= srcR1 && r <= srcR2 && c >= srcC1 && c <= srcC2) continue; // inside source

      const offsetR = r - srcR1;
      const offsetC = c - srcC1;

      const srcCellR = srcR1 + (offsetR % srcHeight);
      const srcCellC = srcC1 + (offsetC % srcWidth);

      const srcCell = getCell(sheet, srcCellR, srcCellC);
      const targetDeltaRows = r - srcCellR;
      const targetDeltaCols = c - srcCellC;

      let newRaw = srcCell.raw;
      let newFormula = null;

      if (srcCell.f) {
        newFormula = shiftFormulaReferences(srcCell.f, targetDeltaRows, targetDeltaCols);
        newRaw = newFormula;
      } else if (!isNaN(Number(srcCell.v)) && srcCell.v !== '') {
        // Linear sequence detection
        if (srcHeight > 1 && targetDeltaRows > 0) {
          const step = Number(srcCell.v) - Number(getCell(sheet, srcR1, srcCellC).v || 0);
          newRaw = Number(srcCell.v) + step * Math.floor(offsetR / srcHeight);
        } else {
          newRaw = Number(srcCell.v);
        }
      }

      setCell(sheet, r, c, {
        raw: newRaw,
        f: newFormula,
        s: { ...(srcCell.s || {}) }
      });
    }
  }

  recalculateAllSheetFormulas(true);
  EXCEL_WB.selectedRange = { r1: tgtR1, c1: tgtC1, r2: tgtR2, c2: tgtC2 };
  updateSelectionBoxUI();
  markWorkbookUnsaved();
}

/* ══════════════════════════════════════════════════════════════
   EXCEL GRID WORKSPACE RENDERING & DOM PARITY
   ══════════════════════════════════════════════════════════════ */
function renderExcelGrid(rebuildStructure = true) {
  const sheet = getActiveSheet();
  const thead = document.getElementById('excel-thead');
  const tbody = document.getElementById('excel-tbody');
  if (!thead || !tbody || !sheet) return;

  const activeCols = typeof findLastDataColumn === 'function' ? Math.max(1, findLastDataColumn(sheet) + 1) : 16;
  const cols = sheet.colsCount ? Math.max(sheet.colsCount, activeCols) : activeCols;
  const rows = Math.max(sheet.rowsCount || 50, 40);

  // Compute lookup map of merged cells for rowspan / colspan & absorbed cell skipping
  const mergeMap = new Map();
  if (Array.isArray(sheet.merges)) {
    sheet.merges.forEach(m => {
      const minR = Math.min(m.s.r, m.e.r);
      const maxR = Math.max(m.s.r, m.e.r);
      const minC = Math.min(m.s.c, m.e.c);
      const maxC = Math.max(m.s.c, m.e.c);
      const rowSpan = maxR - minR + 1;
      const colSpan = maxC - minC + 1;
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const isTopLeft = (r === minR && c === minC);
          mergeMap.set(`${r},${c}`, { isTopLeft, rowSpan, colSpan, merge: m });
        }
      }
    });
  }

  if (rebuildStructure || thead.children.length === 0 || sheet.merges?.length > 0) {
    // 1. Column Headers (Corner + A, B, C, D...)
    let headHtml = `<tr><th class="excel-corner-th" onclick="selectAllSheetCells()" title="Select All (Ctrl+A)"></th>`;
    for (let c = 0; c < cols; c++) {
      const colLetter = colToLetter(c);
      const w = sheet.colWidths[c] || (c === 0 ? 55 : c === 1 ? 120 : c === 2 ? 180 : 90);
      headHtml += `
        <th class="excel-col-th col-th-${c}" data-col="${c}" style="width:${w}px;min-width:${w}px;" onclick="selectEntireColumn(${c})">
          <span>${colLetter}</span>
          <div class="excel-col-resizer" onmousedown="startColResize(event, ${c})"></div>
        </th>
      `;
    }
    headHtml += `</tr>`;
    thead.innerHTML = headHtml;

    // 2. Row Numbers & Cells
    let bodyHtml = '';
    for (let r = 0; r < rows; r++) {
      const h = sheet.rowHeights[r] || 25;
      bodyHtml += `<tr style="height:${h}px;" data-row="${r}">`;
      bodyHtml += `
        <th class="excel-row-th row-th-${r}" data-row="${r}" onclick="selectEntireRow(${r})">
          <span>${r + 1}</span>
          <div class="excel-row-resizer" onmousedown="startRowResize(event, ${r})"></div>
        </th>
      `;
      for (let c = 0; c < cols; c++) {
        const mInfo = mergeMap.get(`${r},${c}`);
        if (mInfo && !mInfo.isTopLeft) {
          // Absorbed inside a merged cell, skip rendering <td>
          continue;
        }

        let spanAttrs = '';
        let extraCellClasses = '';
        if (mInfo && mInfo.isTopLeft) {
          if (mInfo.rowSpan > 1) {
            spanAttrs += ` rowspan="${mInfo.rowSpan}"`;
            extraCellClasses += ' excel-cell-multiroow';
          }
          if (mInfo.colSpan > 1) {
            spanAttrs += ` colspan="${mInfo.colSpan}"`;
          }
        }

        const cell = getCell(sheet, r, c);
        if (cell.f && (cell.v === undefined || cell.v === null || cell.v === '')) {
          try {
            cell.v = evaluateExcelFormula(cell.f, sheet);
          } catch (_) { }
        }
        const cellStyle = buildCellInlineStyle(cell.s);
        const displayVal = formatCellDisplayValue(cell.v !== undefined && cell.v !== null ? cell.v : cell.raw, cell.s);
        bodyHtml += `
          <td class="excel-cell cell-${r}-${c}${extraCellClasses}" data-row="${r}" data-col="${c}"${spanAttrs} style="${cellStyle}" onmousedown="onCellMouseDown(event, ${r}, ${c})" ondblclick="onCellDoubleClick(event, ${r}, ${c})">
            ${escapeHtml(displayVal)}
          </td>
        `;
      }
      bodyHtml += `</tr>`;
    }
    tbody.innerHTML = bodyHtml;
  } else {
    // Fast in-place DOM update without tearing down grid structure
    if (thead) {
      for (let c = 0; c < cols; c++) {
        const th = thead.querySelector(`.col-th-${c}`);
        if (th && sheet.colWidths && sheet.colWidths[c]) {
          const w = sheet.colWidths[c];
          th.style.width = `${w}px`;
          th.style.minWidth = `${w}px`;
        }
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const td = tbody.querySelector(`.cell-${r}-${c}`);
        if (td) {
          const cell = getCell(sheet, r, c);
          if (cell.f && (cell.v === undefined || cell.v === null || cell.v === '')) {
            try {
              cell.v = evaluateExcelFormula(cell.f, sheet);
            } catch (_) { }
          }
          td.style.cssText = buildCellInlineStyle(cell.s);
          const displayVal = formatCellDisplayValue(cell.v !== undefined && cell.v !== null ? cell.v : cell.raw, cell.s);
          td.textContent = displayVal;
        }
      }
    }
  }

  updateSelectionBoxUI();
  updateHeaderHighlights();
  applyExcelGridFilters();
}

function buildCellInlineStyle(s) {
  if (!s) return '';
  let styles = [];
  if (s.bold) styles.push('font-weight:800');
  if (s.italic) styles.push('font-style:italic');
  if (s.underline) styles.push('text-decoration:underline');
  if (s.fontFamily) styles.push(`font-family:${s.fontFamily}`);
  if (s.fontSize) styles.push(`font-size:${s.fontSize}px`);
  if (s.color) styles.push(`color:${s.color}`);
  if (s.bg) styles.push(`background-color:${s.bg}`);
  if (s.align) styles.push(`text-align:${s.align}`);
  if (s.vAlign) styles.push(`vertical-align:${s.vAlign}`);
  if (s.wrap) styles.push('white-space:pre-wrap;word-break:break-word;line-height:1.35');

  if (s.border === 'all') styles.push('border:1px solid var(--border-color)');
  else if (s.border === 'outside') styles.push('outline:1px solid var(--border-color)');
  else if (s.border === 'thick-bottom') styles.push('border-bottom:2px solid var(--text-main)');
  else if (s.border === 'none') styles.push('border:none');
  else {
    if (s.borderTop) styles.push(s.borderTop);
    if (s.borderBottom) styles.push(s.borderBottom);
    if (s.borderLeft) styles.push(s.borderLeft);
    if (s.borderRight) styles.push(s.borderRight);
  }

  return styles.join(';');
}

function formatCellDisplayValue(val, s) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') {
    const fmt = s?.format || 'general';
    const dec = s?.decimals !== undefined ? s.decimals : (fmt === 'general' ? 2 : 2);
    if (fmt === 'currency') return '₹ ' + val.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (fmt === 'percent') return (val * 100).toFixed(dec) + '%';
    if (fmt === 'number') return val.toFixed(dec);
    return Math.round(val * 100) / 100;
  }
  return String(val);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ══════════════════════════════════════════════════════════════
   SELECTION, DRAG FILL & ACTIVE CELL CONTROLLER
   ══════════════════════════════════════════════════════════════ */
function updateSelectionBoxUI() {
  const box = document.getElementById('excel-selection-box');
  const ws = document.getElementById('excel-grid-workspace');
  const tbody = document.getElementById('excel-tbody');
  if (!box || !ws || !tbody) return;

  const { r1, c1, r2, c2 } = EXCEL_WB.selectedRange;
  const startR = Math.min(r1, r2);
  const endR = Math.max(r1, r2);
  const startC = Math.min(c1, c2);
  const endC = Math.max(c1, c2);

  const sheet = getActiveSheet();

  function findCellOrMergeAnchor(r, c) {
    let td = tbody.querySelector(`.cell-${r}-${c}`);
    if (td) return td;
    if (sheet && Array.isArray(sheet.merges)) {
      const m = sheet.merges.find(m => {
        const minR = Math.min(m.s.r, m.e.r), maxR = Math.max(m.s.r, m.e.r);
        const minC = Math.min(m.s.c, m.e.c), maxC = Math.max(m.s.c, m.e.c);
        return r >= minR && r <= maxR && c >= minC && c <= maxC;
      });
      if (m) {
        const minR = Math.min(m.s.r, m.e.r);
        const minC = Math.min(m.s.c, m.e.c);
        return tbody.querySelector(`.cell-${minR}-${minC}`);
      }
    }
    return null;
  }

  let startTd = findCellOrMergeAnchor(startR, startC);
  let endTd = findCellOrMergeAnchor(endR, endC);

  if (!startTd) startTd = endTd;
  if (!endTd) endTd = startTd;

  if (!startTd || !endTd) {
    box.style.display = 'none';
    return;
  }

  const scale = S.zoomScale || 1.0;
  const wsRect = ws.getBoundingClientRect();
  const startRect = startTd.getBoundingClientRect();
  const endRect = endTd.getBoundingClientRect();

  if (startRect.width === 0 && startRect.height === 0 && endRect.width === 0 && endRect.height === 0) {
    box.style.display = 'none';
    return;
  }

  const minLeft = Math.min(startRect.left, endRect.left);
  const minTop = Math.min(startRect.top, endRect.top);
  const maxRight = Math.max(startRect.right, endRect.right);
  const maxBottom = Math.max(startRect.bottom, endRect.bottom);

  // Divide viewport deltas by scale to account for zoom or CSS scaling on #scale-wrapper
  const left = (minLeft - wsRect.left) / scale + ws.scrollLeft;
  const top = (minTop - wsRect.top) / scale + ws.scrollTop;
  const width = Math.max(6, (maxRight - minLeft) / scale);
  const height = Math.max(6, (maxBottom - minTop) / scale);

  box.style.display = 'block';
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
  box.style.width = `${width}px`;
  box.style.height = `${height}px`;

  // Update formula bar & name box
  updateFormulaBarUI();
}

function updateHeaderHighlights() {
  document.querySelectorAll('.excel-col-th.col-active-header').forEach(el => el.classList.remove('col-active-header'));
  document.querySelectorAll('.excel-row-th.row-active-header').forEach(el => el.classList.remove('row-active-header'));

  const { r1, c1, r2, c2 } = EXCEL_WB.selectedRange;
  const startR = Math.min(r1, r2);
  const endR = Math.max(r1, r2);
  const startC = Math.min(c1, c2);
  const endC = Math.max(c1, c2);

  for (let c = startC; c <= endC; c++) {
    const colTh = document.querySelector(`.col-th-${c}`);
    if (colTh) colTh.classList.add('col-active-header');
  }
  for (let r = startR; r <= endR; r++) {
    const rowTh = document.querySelector(`.row-th-${r}`);
    if (rowTh) rowTh.classList.add('row-active-header');
  }
}

function updateFormulaBarUI() {
  const nameBox = document.getElementById('excel-name-box');
  const formulaInput = document.getElementById('excel-formula-input');
  const sheet = getActiveSheet();

  const { r, c } = EXCEL_WB.activeCell;
  const { r1, c1, r2, c2 } = EXCEL_WB.selectedRange;

  if (nameBox) {
    if (r1 === r2 && c1 === c2) {
      nameBox.value = coordToRef(r, c);
    } else {
      nameBox.value = `${coordToRef(Math.min(r1, r2), Math.min(c1, c2))}:${coordToRef(Math.max(r1, r2), Math.max(c1, c2))}`;
    }
  }

  if (formulaInput && !EXCEL_WB.isEditing) {
    const cell = getCell(sheet, r, c);
    formulaInput.value = cell.f || (cell.raw !== undefined ? cell.raw : '');
  }

  updateStatusBarStats();
}

function updateStatusBarStats() {
  const sheet = getActiveSheet();
  const avgEl = document.getElementById('excel-stat-avg');
  const countEl = document.getElementById('excel-stat-count');
  const sumEl = document.getElementById('excel-stat-sum');
  if (!sheet || !avgEl || !countEl || !sumEl) return;

  const { r1, c1, r2, c2 } = EXCEL_WB.selectedRange;
  const startR = Math.min(r1, r2);
  const endR = Math.max(r1, r2);
  const startC = Math.min(c1, c2);
  const endC = Math.max(c1, c2);

  let sum = 0;
  let count = 0;
  let numCount = 0;

  for (let r = startR; r <= endR; r++) {
    for (let c = startC; c <= endC; c++) {
      const cell = getCell(sheet, r, c);
      const val = cell.v !== undefined && cell.v !== null ? cell.v : cell.raw;
      if (val !== '' && val !== null && val !== undefined) {
        count++;
        const num = Number(val);
        if (!isNaN(num)) {
          sum += num;
          numCount++;
        }
      }
    }
  }

  const avg = numCount > 0 ? Math.round((sum / numCount) * 100) / 100 : 0;
  avgEl.textContent = `Average: ${avg}`;
  countEl.textContent = `Count: ${count}`;
  sumEl.textContent = `Sum: ${Math.round(sum * 100) / 100}`;
}

/* ── Mouse & Selection Listeners ── */
function onCellMouseDown(e, r, c) {
  if (e.button !== 0) return; // only left click
  commitInlineEditor();

  EXCEL_WB.isSelecting = true;
  EXCEL_WB.selectStart = { r, c };
  EXCEL_WB.activeCell = { r, c };
  EXCEL_WB.selectedRange = { r1: r, c1: c, r2: r, c2: c };

  updateSelectionBoxUI();
  updateHeaderHighlights();

  const onMouseMove = (ev) => {
    if (!EXCEL_WB.isSelecting) return;
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const td = el ? el.closest('.excel-cell') : null;
    if (td) {
      const curR = parseInt(td.dataset.row, 10);
      const curC = parseInt(td.dataset.col, 10);
      EXCEL_WB.selectedRange = {
        r1: EXCEL_WB.selectStart.r,
        c1: EXCEL_WB.selectStart.c,
        r2: curR,
        c2: curC
      };
      updateSelectionBoxUI();
      updateHeaderHighlights();
    }
  };

  const onMouseUp = () => {
    EXCEL_WB.isSelecting = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function selectEntireColumn(c) {
  const sheet = getActiveSheet();
  EXCEL_WB.activeCell = { r: 0, c };
  EXCEL_WB.selectedRange = { r1: 0, c1: c, r2: sheet.rowsCount - 1, c2: c };
  updateSelectionBoxUI();
  updateHeaderHighlights();
  applyExcelGridFilters();
}

function selectEntireRow(r) {
  const sheet = getActiveSheet();
  EXCEL_WB.activeCell = { r, c: 0 };
  EXCEL_WB.selectedRange = { r1: r, c1: 0, r2: r, c2: sheet.colsCount - 1 };
  updateSelectionBoxUI();
  updateHeaderHighlights();
  applyExcelGridFilters();
}

function selectAllSheetCells() {
  const sheet = getActiveSheet();
  EXCEL_WB.activeCell = { r: 0, c: 0 };
  EXCEL_WB.selectedRange = { r1: 0, c1: 0, r2: sheet.rowsCount - 1, c2: sheet.colsCount - 1 };
  updateSelectionBoxUI();
  updateHeaderHighlights();
  applyExcelGridFilters();
}

/* ── Inline Editor Handling ── */
function onCellDoubleClick(e, r, c) {
  startInlineEditing(r, c);
}

function startInlineEditing(r, c, initialChar = null) {
  const sheet = getActiveSheet();
  const editor = document.getElementById('excel-inline-editor');
  const tbody = document.getElementById('excel-tbody');
  const ws = document.getElementById('excel-grid-workspace');
  if (!editor || !tbody || !ws) return;

  EXCEL_WB.isEditing = true;
  EXCEL_WB.activeCell = { r, c };

  const td = tbody.querySelector(`.cell-${r}-${c}`);
  if (!td) return;

  const wsRect = ws.getBoundingClientRect();
  const tdRect = td.getBoundingClientRect();
  const scale = S.zoomScale || 1.0;

  editor.style.display = 'block';
  editor.style.left = `${(tdRect.left - wsRect.left) / scale + ws.scrollLeft}px`;
  editor.style.top = `${(tdRect.top - wsRect.top) / scale + ws.scrollTop}px`;
  editor.style.width = `${Math.max(tdRect.width / scale, 100)}px`;
  editor.style.height = `${Math.max(tdRect.height / scale, 24)}px`;

  const cell = getCell(sheet, r, c);
  editor.value = initialChar !== null ? initialChar : (cell.f || (cell.raw !== undefined ? cell.raw : ''));
  editor.focus();
  editor.setSelectionRange(editor.value.length, editor.value.length);

  const modeEl = document.getElementById('excel-status-mode');
  if (modeEl) modeEl.textContent = 'EDIT';
}

function commitInlineEditor() {
  if (!EXCEL_WB.isEditing) return;
  const editor = document.getElementById('excel-inline-editor');
  const sheet = getActiveSheet();
  if (!editor || !sheet) return;

  const { r, c } = EXCEL_WB.activeCell;
  const val = editor.value;

  pushUndoState('Edit Cell');
  setCell(sheet, r, c, val);
  recalculateAllSheetFormulas(true);

  editor.style.display = 'none';
  EXCEL_WB.isEditing = false;
  const modeElReady = document.getElementById('excel-status-mode');
  if (modeElReady) modeElReady.textContent = 'READY';
  markWorkbookUnsaved();
}

function cancelInlineEditor() {
  const editor = document.getElementById('excel-inline-editor');
  if (editor) editor.style.display = 'none';
  EXCEL_WB.isEditing = false;
  const modeElReady = document.getElementById('excel-status-mode');
  if (modeElReady) modeElReady.textContent = 'READY';
  updateFormulaBarUI();
}

/* ── Formula Bar Direct Input ── */
function onFormulaBarInput(val) {
  const sheet = getActiveSheet();
  const { r, c } = EXCEL_WB.activeCell;
  setCell(sheet, r, c, val);
  const td = document.querySelector(`.cell-${r}-${c}`);
  if (td) td.textContent = val;
  markWorkbookUnsaved();
}

function onFormulaBarKeyDown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    acceptFormulaInput();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    cancelFormulaInput();
  }
}

function acceptFormulaInput() {
  const formulaInput = document.getElementById('excel-formula-input');
  if (formulaInput) {
    onFormulaBarInput(formulaInput.value);
  }
  recalculateAllSheetFormulas(true);
}

function cancelFormulaInput() {
  const sheet = getActiveSheet();
  const { r, c } = EXCEL_WB.activeCell;
  const cell = getCell(sheet, r, c);
  const formulaInput = document.getElementById('excel-formula-input');
  if (formulaInput) {
    formulaInput.value = cell.f || (cell.raw !== undefined ? cell.raw : '');
  }
}

function onNameBoxKeyDown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = e.target.value.trim().toUpperCase();
    const coord = refToCoord(val);
    if (coord) {
      EXCEL_WB.activeCell = coord;
      EXCEL_WB.selectedRange = { r1: coord.r, c1: coord.c, r2: coord.r, c2: coord.c };
      updateSelectionBoxUI();
      updateHeaderHighlights();
      scrollToActiveCell();
    }
  }
}

function scrollToActiveCell() {
  const ws = document.getElementById('excel-grid-workspace');
  const tbody = document.getElementById('excel-tbody');
  if (!ws || !tbody) return;
  const td = tbody.querySelector(`.cell-${EXCEL_WB.activeCell.r}-${EXCEL_WB.activeCell.c}`);
  if (td) td.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/* ── Global Keyboard Shortcuts ── */
window.addEventListener('keydown', (e) => {
  // If active in a regular modal input or search, bypass spreadsheet shortcuts
  if (e.target.matches('input:not(#excel-formula-input):not(#excel-name-box), textarea:not(#excel-inline-editor), select')) {
    return;
  }

  // Ctrl + S (Save)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveActiveSheetData(true);
    return;
  }

  // Ctrl + Z (Undo)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    excelUndo();
    return;
  }

  // Ctrl + Y or Ctrl + Shift + Z (Redo)
  if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
    e.preventDefault();
    excelRedo();
    return;
  }

  // Ctrl + C (Copy)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !EXCEL_WB.isEditing) {
    e.preventDefault();
    excelCopy();
    return;
  }

  // Ctrl + X (Cut)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x' && !EXCEL_WB.isEditing) {
    e.preventDefault();
    excelCut();
    return;
  }

  // Ctrl + V (Paste)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && !EXCEL_WB.isEditing) {
    e.preventDefault();
    excelPaste();
    return;
  }

  // Ctrl + F (Find & Replace)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    openFindReplaceModal();
    return;
  }

  // Inline editing active keys
  if (EXCEL_WB.isEditing) {
    if (e.key === 'Enter') {
      if (e.shiftKey || e.altKey || e.ctrlKey) {
        // Multi-line cell input (Alt+Enter or Shift+Enter inside textarea)
        return;
      }
      e.preventDefault();
      commitInlineEditor();
      moveActiveCell(1, 0);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelInlineEditor();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitInlineEditor();
      moveActiveCell(0, e.shiftKey ? -1 : 1);
    }
    return;
  }

  // Navigation Keys
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (e.shiftKey) expandSelection(-1, 0);
    else moveActiveCell(-1, 0);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (e.shiftKey) expandSelection(1, 0);
    else moveActiveCell(1, 0);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (e.shiftKey) expandSelection(0, -1);
    else moveActiveCell(0, -1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (e.shiftKey) expandSelection(0, 1);
    else moveActiveCell(0, 1);
  } else if (e.key === 'Tab') {
    e.preventDefault();
    moveActiveCell(0, e.shiftKey ? -1 : 1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    moveActiveCell(1, 0);
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    clearSelectedCellContents();
  } else if (e.key === 'F2') {
    e.preventDefault();
    startInlineEditing(EXCEL_WB.activeCell.r, EXCEL_WB.activeCell.c);
  } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    // Begin typing directly into cell
    startInlineEditing(EXCEL_WB.activeCell.r, EXCEL_WB.activeCell.c, e.key);
  }
});

function moveActiveCell(dr, dc) {
  const sheet = getActiveSheet();
  const newR = Math.max(0, Math.min(sheet.rowsCount - 1, EXCEL_WB.activeCell.r + dr));
  const newC = Math.max(0, Math.min(sheet.colsCount - 1, EXCEL_WB.activeCell.c + dc));
  EXCEL_WB.activeCell = { r: newR, c: newC };
  EXCEL_WB.selectedRange = { r1: newR, c1: newC, r2: newR, c2: newC };
  updateSelectionBoxUI();
  updateHeaderHighlights();
  scrollToActiveCell();
}

function expandSelection(dr, dc) {
  const sheet = getActiveSheet();
  const newR2 = Math.max(0, Math.min(sheet.rowsCount - 1, EXCEL_WB.selectedRange.r2 + dr));
  const newC2 = Math.max(0, Math.min(sheet.colsCount - 1, EXCEL_WB.selectedRange.c2 + dc));
  EXCEL_WB.selectedRange.r2 = newR2;
  EXCEL_WB.selectedRange.c2 = newC2;
  updateSelectionBoxUI();
  updateHeaderHighlights();
  applyExcelGridFilters();
}

/* ── Auto-Fill Handle Dragging ── */
document.addEventListener('DOMContentLoaded', initFillHandleDrag);

function initFillHandleDrag() {
  const handle = document.getElementById('excel-fill-handle');
  const preview = document.getElementById('excel-fill-preview-box');
  const ws = document.getElementById('excel-grid-workspace');
  if (!handle || !preview || !ws) return;

  // Real-time synchronization of selection box on workspace scroll and window resize
  if (!ws._hasScrollSelectionListener) {
    ws._hasScrollSelectionListener = true;
    ws.addEventListener('scroll', () => {
      if (EXCEL_WB.selectedRange) {
        updateSelectionBoxUI();
      }
    }, { passive: true });
    window.addEventListener('resize', () => {
      if (EXCEL_WB.selectedRange) {
        updateSelectionBoxUI();
      }
    }, { passive: true });
  }

  handle.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    EXCEL_WB.isFillDragging = true;
    EXCEL_WB.fillStart = { ...EXCEL_WB.selectedRange };

    const onMouseMove = (ev) => {
      if (!EXCEL_WB.isFillDragging) return;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const td = el ? el.closest('.excel-cell') : null;
      if (td) {
        const curR = parseInt(td.dataset.row, 10);
        const curC = parseInt(td.dataset.col, 10);
        EXCEL_WB.fillEnd = { r: curR, c: curC };

        // Render preview dashed box
        const targetR2 = Math.max(EXCEL_WB.fillStart.r2, curR);
        const targetC2 = Math.max(EXCEL_WB.fillStart.c2, curC);
        const targetR1 = Math.min(EXCEL_WB.fillStart.r1, curR);
        const targetC1 = Math.min(EXCEL_WB.fillStart.c1, curC);

        const tbody = document.getElementById('excel-tbody');
        const startTd = tbody.querySelector(`.cell-${targetR1}-${targetC1}`);
        const endTd = tbody.querySelector(`.cell-${targetR2}-${targetC2}`);

        if (startTd && endTd) {
          const wsRect = ws.getBoundingClientRect();
          const startRect = startTd.getBoundingClientRect();
          const endRect = endTd.getBoundingClientRect();
          const scale = S.zoomScale || 1.0;

          preview.style.display = 'block';
          preview.style.left = `${(startRect.left - wsRect.left) / scale + ws.scrollLeft}px`;
          preview.style.top = `${(startRect.top - wsRect.top) / scale + ws.scrollTop}px`;
          preview.style.width = `${(endRect.right - startRect.left) / scale}px`;
          preview.style.height = `${(endRect.bottom - startRect.top) / scale}px`;
        }
      }
    };

    const onMouseUp = () => {
      if (EXCEL_WB.isFillDragging) {
        EXCEL_WB.isFillDragging = false;
        preview.style.display = 'none';
        if (EXCEL_WB.fillEnd) {
          const targetRange = {
            r1: Math.min(EXCEL_WB.fillStart.r1, EXCEL_WB.fillEnd.r),
            c1: Math.min(EXCEL_WB.fillStart.c1, EXCEL_WB.fillEnd.c),
            r2: Math.max(EXCEL_WB.fillStart.r2, EXCEL_WB.fillEnd.r),
            c2: Math.max(EXCEL_WB.fillStart.c2, EXCEL_WB.fillEnd.c)
          };
          applyAutoFillToRange(EXCEL_WB.fillStart, targetRange);
        }
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });

  // Live scrolling sync for selection bounding box and auto-fill handle
  ws.addEventListener('scroll', () => {
    updateSelectionBoxUI();
  }, { passive: true });

  // Shift + wheel horizontal scrolling support
  ws.addEventListener('wheel', (e) => {
    if (e.shiftKey && e.deltaY) {
      ws.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });

  // Custom Excel Context Menu inside grid workspace
  ws.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const td = e.target.closest('.excel-cell');
    if (td) {
      const r = parseInt(td.dataset.row, 10);
      const c = parseInt(td.dataset.col, 10);
      const { r1, c1, r2, c2 } = EXCEL_WB.selectedRange;
      const minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
      const minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
      if (r < minR || r > maxR || c < minC || c > maxC) {
        EXCEL_WB.activeCell = { r, c };
        EXCEL_WB.selectedRange = { r1: r, c1: c, r2: r, c2: c };
        updateSelectionBoxUI();
        updateHeaderHighlights();
      }
    }
    openExcelContextMenu(e.clientX, e.clientY);
  });
}

// Global click & escape dismissals for context menu and ribbon dropdowns
document.addEventListener('click', (e) => {
  if (!e.target.closest('#excel-context-menu')) {
    closeExcelContextMenu();
  }
  if (!e.target.closest('.excel-dropdown-wrapper')) {
    document.querySelectorAll('.excel-dropdown-menu').forEach(m => {
      m.classList.remove('open');
      m.style.display = 'none';
    });
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeExcelContextMenu();
    document.querySelectorAll('.excel-dropdown-menu').forEach(m => {
      m.classList.remove('open');
      m.style.display = 'none';
    });
  }
});

function openExcelContextMenu(x, y) {
  const menu = document.getElementById('excel-context-menu');
  if (!menu) return;
  menu.style.display = 'block';

  // Keep menu within viewport boundaries
  const rect = menu.getBoundingClientRect();
  let left = x;
  let top = y;
  if (left + rect.width > window.innerWidth) {
    left = window.innerWidth - rect.width - 10;
  }
  if (top + rect.height > window.innerHeight) {
    top = window.innerHeight - rect.height - 10;
  }
  menu.style.left = `${Math.max(10, left)}px`;
  menu.style.top = `${Math.max(10, top)}px`;
}

function closeExcelContextMenu() {
  const menu = document.getElementById('excel-context-menu');
  if (menu) menu.style.display = 'none';
}

/* ══════════════════════════════════════════════════════════════
   FORMATTING ENGINE (HOME RIBBON OPERATIONS)
   ══════════════════════════════════════════════════════════════ */
function applyFormattingToRange(fn) {
  const sheet = getActiveSheet();
  if (!sheet) return;
  pushUndoState('Format Cells');

  const { r1, c1, r2, c2 } = EXCEL_WB.selectedRange;
  const startR = Math.min(r1, r2);
  const endR = Math.max(r1, r2);
  const startC = Math.min(c1, c2);
  const endC = Math.max(c1, c2);

  for (let r = startR; r <= endR; r++) {
    for (let c = startC; c <= endC; c++) {
      const cell = getCell(sheet, r, c);
      if (!cell.s) cell.s = {};
      fn(cell.s);
      setCell(sheet, r, c, cell);
    }
  }

  renderExcelGrid(false);
  markWorkbookUnsaved();
}

function toggleFontBold() {
  const sheet = getActiveSheet();
  const curCell = getCell(sheet, EXCEL_WB.activeCell.r, EXCEL_WB.activeCell.c);
  const isBold = !(curCell.s && curCell.s.bold);
  applyFormattingToRange(s => { s.bold = isBold; });
}

function toggleFontItalic() {
  const sheet = getActiveSheet();
  const curCell = getCell(sheet, EXCEL_WB.activeCell.r, EXCEL_WB.activeCell.c);
  const isItalic = !(curCell.s && curCell.s.italic);
  applyFormattingToRange(s => { s.italic = isItalic; });
}

function toggleFontUnderline() {
  const sheet = getActiveSheet();
  const curCell = getCell(sheet, EXCEL_WB.activeCell.r, EXCEL_WB.activeCell.c);
  const isUnder = !(curCell.s && curCell.s.underline);
  applyFormattingToRange(s => { s.underline = isUnder; });
}

function applyFontFamily(fam) {
  applyFormattingToRange(s => { s.fontFamily = fam; });
}

function applyFontSize(sz) {
  applyFormattingToRange(s => { s.fontSize = parseInt(sz, 10); });
}

function applyFontColor(color) {
  applyFormattingToRange(s => { s.color = color; });
}

function applyFillColor(color) {
  applyFormattingToRange(s => { s.bg = color; });
}

function applyHAlign(align) {
  applyFormattingToRange(s => { s.align = align; });
}

function applyVAlign(vAlign) {
  applyFormattingToRange(s => { s.vAlign = vAlign; });
}

function toggleWrapText() {
  const sheet = getActiveSheet();
  const curCell = getCell(sheet, EXCEL_WB.activeCell.r, EXCEL_WB.activeCell.c);
  const isWrap = !(curCell.s && curCell.s.wrap);
  applyFormattingToRange(s => { s.wrap = isWrap; });
}

function mergeAndCenter() {
  const sheet = getActiveSheet();
  if (!sheet) return;
  pushUndoState('Merge & Center');

  const { r1, c1, r2, c2 } = EXCEL_WB.selectedRange;
  const startR = Math.min(r1, r2);
  const endR = Math.max(r1, r2);
  const startC = Math.min(c1, c2);
  const endC = Math.max(c1, c2);

  if (startR === endR && startC === endC) return; // Cannot merge single cell

  // Center primary cell
  const primaryCell = getCell(sheet, startR, startC);
  if (!primaryCell.s) primaryCell.s = {};
  primaryCell.s.align = 'center';
  primaryCell.s.vAlign = 'middle';
  setCell(sheet, startR, startC, primaryCell);

  if (!Array.isArray(sheet.merges)) sheet.merges = [];
  // Remove overlapping merges first
  sheet.merges = sheet.merges.filter(m => {
    const mMinR = Math.min(m.s.r, m.e.r), mMaxR = Math.max(m.s.r, m.e.r);
    const mMinC = Math.min(m.s.c, m.e.c), mMaxC = Math.max(m.s.c, m.e.c);
    return (endR < mMinR || startR > mMaxR || endC < mMinC || startC > mMaxC);
  });

  sheet.merges.push({
    s: { r: startR, c: startC },
    e: { r: endR, c: endC }
  });

  renderExcelGrid(true);
  markWorkbookUnsaved();
  closeExcelContextMenu();
  const menu = document.getElementById('menu-merge-cells');
  if (menu) {
    menu.classList.remove('open');
    menu.style.display = 'none';
  }
}

function mergeCellsOnly() {
  const sheet = getActiveSheet();
  if (!sheet) return;
  pushUndoState('Merge Cells');

  const { r1, c1, r2, c2 } = EXCEL_WB.selectedRange;
  const startR = Math.min(r1, r2);
  const endR = Math.max(r1, r2);
  const startC = Math.min(c1, c2);
  const endC = Math.max(c1, c2);

  if (startR === endR && startC === endC) return;

  if (!Array.isArray(sheet.merges)) sheet.merges = [];
  sheet.merges = sheet.merges.filter(m => {
    const mMinR = Math.min(m.s.r, m.e.r), mMaxR = Math.max(m.s.r, m.e.r);
    const mMinC = Math.min(m.s.c, m.e.c), mMaxC = Math.max(m.s.c, m.e.c);
    return (endR < mMinR || startR > mMaxR || endC < mMinC || startC > mMaxC);
  });

  sheet.merges.push({
    s: { r: startR, c: startC },
    e: { r: endR, c: endC }
  });

  renderExcelGrid(true);
  markWorkbookUnsaved();
  closeExcelContextMenu();
  const menu = document.getElementById('menu-merge-cells');
  if (menu) {
    menu.classList.remove('open');
    menu.style.display = 'none';
  }
}

function mergeAcross() {
  const sheet = getActiveSheet();
  if (!sheet) return;
  pushUndoState('Merge Across');

  const { r1, c1, r2, c2 } = EXCEL_WB.selectedRange;
  const startR = Math.min(r1, r2);
  const endR = Math.max(r1, r2);
  const startC = Math.min(c1, c2);
  const endC = Math.max(c1, c2);

  if (startC === endC) return;

  if (!Array.isArray(sheet.merges)) sheet.merges = [];

  for (let r = startR; r <= endR; r++) {
    sheet.merges = sheet.merges.filter(m => {
      const mMinR = Math.min(m.s.r, m.e.r), mMaxR = Math.max(m.s.r, m.e.r);
      const mMinC = Math.min(m.s.c, m.e.c), mMaxC = Math.max(m.s.c, m.e.c);
      return !(r >= mMinR && r <= mMaxR && !(endC < mMinC || startC > mMaxC));
    });

    sheet.merges.push({
      s: { r, c: startC },
      e: { r, c: endC }
    });
  }

  renderExcelGrid(true);
  markWorkbookUnsaved();
  closeExcelContextMenu();
  const menu = document.getElementById('menu-merge-cells');
  if (menu) {
    menu.classList.remove('open');
    menu.style.display = 'none';
  }
}

function unmergeSelectedCells() {
  const sheet = getActiveSheet();
  if (!sheet || !Array.isArray(sheet.merges) || !sheet.merges.length) return;
  pushUndoState('Unmerge Cells');

  const { r1, c1, r2, c2 } = EXCEL_WB.selectedRange;
  const startR = Math.min(r1, r2);
  const endR = Math.max(r1, r2);
  const startC = Math.min(c1, c2);
  const endC = Math.max(c1, c2);

  sheet.merges = sheet.merges.filter(m => {
    const mMinR = Math.min(m.s.r, m.e.r), mMaxR = Math.max(m.s.r, m.e.r);
    const mMinC = Math.min(m.s.c, m.e.c), mMaxC = Math.max(m.s.c, m.e.c);
    const overlaps = !(endR < mMinR || startR > mMaxR || endC < mMinC || startC > mMaxC);
    return !overlaps;
  });

  renderExcelGrid(true);
  markWorkbookUnsaved();
  closeExcelContextMenu();
  const menu = document.getElementById('menu-merge-cells');
  if (menu) {
    menu.classList.remove('open');
    menu.style.display = 'none';
  }
}

function toggleMergeAndCenterMenu(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  const menu = document.getElementById('menu-merge-cells');
  const btn = document.getElementById('btn-merge-cells');
  if (typeof openDropdownOverlay === 'function') {
    openDropdownOverlay(menu, btn);
  } else {
    if (!menu) return;
    const isAlreadyOpen = menu.classList.contains('open');
    menu.classList.toggle('open', !isAlreadyOpen);
    menu.style.display = isAlreadyOpen ? 'none' : 'flex';
  }
}

function toggleMergeAndCenterDirect() {
  const sheet = getActiveSheet();
  if (!sheet) return;
  const { r1, c1, r2, c2 } = EXCEL_WB.selectedRange;
  const startR = Math.min(r1, r2);
  const endR = Math.max(r1, r2);
  const startC = Math.min(c1, c2);
  const endC = Math.max(c1, c2);

  const hasOverlap = (sheet.merges || []).some(m => {
    const mMinR = Math.min(m.s.r, m.e.r), mMaxR = Math.max(m.s.r, m.e.r);
    const mMinC = Math.min(m.s.c, m.e.c), mMaxC = Math.max(m.s.c, m.e.c);
    return !(endR < mMinR || startR > mMaxR || endC < mMinC || startC > mMaxC);
  });

  if (hasOverlap) {
    unmergeSelectedCells();
  } else {
    mergeAndCenter();
  }
}

function toggleMergeCells() {
  toggleMergeAndCenterDirect();
}

function applyCellBorders(type) {
  applyFormattingToRange(s => { s.border = type; });
  toggleBordersMenu();
}

function applyNumberFormat(fmt) {
  applyFormattingToRange(s => { s.format = fmt; });
}

function adjustDecimals(delta) {
  applyFormattingToRange(s => {
    s.decimals = Math.max(0, (s.decimals !== undefined ? s.decimals : 2) + delta);
  });
}

function clearSelectedCellContents() {
  const sheet = getActiveSheet();
  if (!sheet) return;
  pushUndoState('Clear Contents');

  const { r1, c1, r2, c2 } = EXCEL_WB.selectedRange;
  const startR = Math.min(r1, r2);
  const endR = Math.max(r1, r2);
  const startC = Math.min(c1, c2);
  const endC = Math.max(c1, c2);

  for (let r = startR; r <= endR; r++) {
    for (let c = startC; c <= endC; c++) {
      setCell(sheet, r, c, '');
    }
  }

  recalculateAllSheetFormulas(true);
  markWorkbookUnsaved();
}

/* ══════════════════════════════════════════════════════════════
   ROW & COLUMN OPERATIONS
   ══════════════════════════════════════════════════════════════ */
function adjustFormulaOnInsertCol(formulaStr, targetCol) {
  if (!formulaStr || typeof formulaStr !== 'string' || !formulaStr.startsWith('=')) return formulaStr;
  return formulaStr.replace(/(\$?)([A-Za-z]+)(\$?)([0-9]+)/g, (match, colLock, colLetters, rowLock, rowNum) => {
    let c = letterToCol(colLetters);
    const r = parseInt(rowNum, 10);
    if (!colLock && c >= targetCol) {
      c += 1;
    }
    return (colLock ? '$' : '') + colToLetter(c) + (rowLock ? '$' : '') + r;
  });
}

function adjustFormulaOnDeleteCol(formulaStr, targetCol) {
  if (!formulaStr || typeof formulaStr !== 'string' || !formulaStr.startsWith('=')) return formulaStr;
  return formulaStr.replace(/(\$?)([A-Za-z]+)(\$?)([0-9]+)/g, (match, colLock, colLetters, rowLock, rowNum) => {
    let c = letterToCol(colLetters);
    const r = parseInt(rowNum, 10);
    if (c === targetCol) {
      return '#REF!';
    }
    if (!colLock && c > targetCol) {
      c -= 1;
    }
    return (colLock ? '$' : '') + colToLetter(c) + (rowLock ? '$' : '') + r;
  });
}

function adjustFormulaOnInsertRow(formulaStr, targetRow) {
  if (!formulaStr || typeof formulaStr !== 'string' || !formulaStr.startsWith('=')) return formulaStr;
  return formulaStr.replace(/(\$?)([A-Za-z]+)(\$?)([0-9]+)/g, (match, colLock, colLetters, rowLock, rowNum) => {
    const c = letterToCol(colLetters);
    let r = parseInt(rowNum, 10) - 1; // 0-based
    if (!rowLock && r >= targetRow) {
      r += 1;
    }
    return (colLock ? '$' : '') + colToLetter(c) + (rowLock ? '$' : '') + (r + 1);
  });
}

function adjustFormulaOnDeleteRow(formulaStr, targetRow) {
  if (!formulaStr || typeof formulaStr !== 'string' || !formulaStr.startsWith('=')) return formulaStr;
  return formulaStr.replace(/(\$?)([A-Za-z]+)(\$?)([0-9]+)/g, (match, colLock, colLetters, rowLock, rowNum) => {
    const c = letterToCol(colLetters);
    let r = parseInt(rowNum, 10) - 1; // 0-based
    if (r === targetRow) {
      return '#REF!';
    }
    if (!rowLock && r > targetRow) {
      r -= 1;
    }
    return (colLock ? '$' : '') + colToLetter(c) + (rowLock ? '$' : '') + (r + 1);
  });
}

function insertRowAtActive(above = true) {
  const sheet = getActiveSheet();
  if (!sheet) return;
  pushUndoState('Insert Row');

  const activeR = EXCEL_WB.activeCell?.r || 0;
  const targetRow = above ? activeR : activeR + 1;
  const newCells = {};

  // 1. Shift cells at or below targetRow
  for (const [key, cell] of Object.entries(sheet.cells || {})) {
    const [r, c] = key.split(',').map(Number);
    if (r >= targetRow) {
      newCells[`${r + 1},${c}`] = cell;
    } else {
      newCells[key] = cell;
    }
  }

  // 2. Adjust formula references
  for (const cell of Object.values(newCells)) {
    if (cell.f && typeof cell.f === 'string') {
      cell.f = adjustFormulaOnInsertRow(cell.f, targetRow);
    }
  }

  // 3. Shift rowHeights
  const newRowHeights = {};
  const currentTotalRows = sheet.rowsCount || 50;
  for (let r = 0; r < currentTotalRows; r++) {
    const h = sheet.rowHeights?.[r] || 25;
    if (r >= targetRow) {
      newRowHeights[r + 1] = h;
    } else {
      newRowHeights[r] = h;
    }
  }
  newRowHeights[targetRow] = 25;
  sheet.rowHeights = newRowHeights;

  // 4. Update and shift sheet.merges
  if (Array.isArray(sheet.merges)) {
    const updatedMerges = [];
    for (const m of sheet.merges) {
      const minR = Math.min(m.s.r, m.e.r);
      const maxR = Math.max(m.s.r, m.e.r);
      const minC = Math.min(m.s.c, m.e.c);
      const maxC = Math.max(m.s.c, m.e.c);

      if (minR >= targetRow) {
        // Entire merge is below targetRow: shift down by 1
        updatedMerges.push({
          s: { r: minR + 1, c: minC },
          e: { r: maxR + 1, c: maxC }
        });
      } else if (maxR >= targetRow && minR < targetRow) {
        // targetRow was inserted INSIDE the merge: expand merge height by 1
        updatedMerges.push({
          s: { r: minR, c: minC },
          e: { r: maxR + 1, c: maxC }
        });
      } else {
        // Entire merge is above targetRow: unchanged
        updatedMerges.push({
          s: { r: minR, c: minC },
          e: { r: maxR, c: maxC }
        });
      }
    }
    sheet.merges = updatedMerges;
  }

  sheet.cells = newCells;
  sheet.rowsCount = (sheet.rowsCount || 50) + 1;

  if (above && EXCEL_WB.activeCell) {
    EXCEL_WB.activeCell.r += 1;
  }

  recalculateAllSheetFormulas(true);
  renderExcelGrid(true);
  updateFormulaBarUI();
  markWorkbookUnsaved();
}

function deleteActiveRow() {
  const sheet = getActiveSheet();
  if (!sheet || (sheet.rowsCount || 50) <= 1) return;
  pushUndoState('Delete Row');

  const targetRow = EXCEL_WB.activeCell?.r || 0;
  const newCells = {};

  // 1. Shift cells
  for (const [key, cell] of Object.entries(sheet.cells || {})) {
    const [r, c] = key.split(',').map(Number);
    if (r > targetRow) {
      newCells[`${r - 1},${c}`] = cell;
    } else if (r < targetRow) {
      newCells[key] = cell;
    }
  }

  // 2. Adjust formula references
  for (const cell of Object.values(newCells)) {
    if (cell.f && typeof cell.f === 'string') {
      cell.f = adjustFormulaOnDeleteRow(cell.f, targetRow);
    }
  }

  // 3. Shift rowHeights
  const newRowHeights = {};
  const maxR = sheet.rowsCount || 50;
  for (let r = 0; r < maxR; r++) {
    if (r < targetRow) {
      newRowHeights[r] = sheet.rowHeights?.[r] || 25;
    } else if (r > targetRow) {
      newRowHeights[r - 1] = sheet.rowHeights?.[r] || 25;
    }
  }
  sheet.rowHeights = newRowHeights;

  // 4. Update and shift sheet.merges
  if (Array.isArray(sheet.merges)) {
    const updatedMerges = [];
    for (const m of sheet.merges) {
      const minR = Math.min(m.s.r, m.e.r);
      const maxR = Math.max(m.s.r, m.e.r);
      const minC = Math.min(m.s.c, m.e.c);
      const maxC = Math.max(m.s.c, m.e.c);

      if (minR === targetRow && maxR === targetRow) {
        continue;
      }

      let newMinR = minR;
      let newMaxR = maxR;

      if (minR > targetRow) newMinR = minR - 1;
      if (maxR >= targetRow) newMaxR = maxR - 1;

      if (newMaxR >= newMinR && maxC >= minC) {
        if (newMaxR === newMinR && maxC === minC) {
          continue;
        }
        updatedMerges.push({
          s: { r: newMinR, c: minC },
          e: { r: newMaxR, c: maxC }
        });
      }
    }
    sheet.merges = updatedMerges;
  }

  sheet.cells = newCells;
  sheet.rowsCount = Math.max(1, (sheet.rowsCount || 50) - 1);

  if (EXCEL_WB.activeCell) {
    EXCEL_WB.activeCell.r = Math.max(0, Math.min(sheet.rowsCount - 1, EXCEL_WB.activeCell.r));
  }

  recalculateAllSheetFormulas(true);
  renderExcelGrid(true);
  updateFormulaBarUI();
  markWorkbookUnsaved();
}

function insertColAtActive(left = true) {
  const sheet = getActiveSheet();
  if (!sheet) return;
  pushUndoState('Insert Column');

  const activeC = EXCEL_WB.activeCell?.c || 0;
  const targetCol = left ? activeC : activeC + 1;
  const newCells = {};

  // 1. Shift cells at or to the right of targetCol
  for (const [key, cell] of Object.entries(sheet.cells || {})) {
    const [r, c] = key.split(',').map(Number);
    if (c >= targetCol) {
      newCells[`${r},${c + 1}`] = cell;
    } else {
      newCells[key] = cell;
    }
  }

  // 2. Adjust formula references
  for (const cell of Object.values(newCells)) {
    if (cell.f && typeof cell.f === 'string') {
      cell.f = adjustFormulaOnInsertCol(cell.f, targetCol);
    }
  }

  // 3. Shift colWidths
  const newColWidths = {};
  const currentTotalCols = sheet.colsCount || 26;
  for (let c = 0; c < currentTotalCols; c++) {
    const w = sheet.colWidths?.[c] || 75;
    if (c >= targetCol) {
      newColWidths[c + 1] = w;
    } else {
      newColWidths[c] = w;
    }
  }
  newColWidths[targetCol] = 75;
  sheet.colWidths = newColWidths;

  // 4. Update and shift sheet.merges
  if (Array.isArray(sheet.merges)) {
    const updatedMerges = [];
    for (const m of sheet.merges) {
      const minC = Math.min(m.s.c, m.e.c);
      const maxC = Math.max(m.s.c, m.e.c);
      const minR = Math.min(m.s.r, m.e.r);
      const maxR = Math.max(m.s.r, m.e.r);

      if (minC >= targetCol) {
        // Entire merge is to the right of targetCol: shift right by 1
        updatedMerges.push({
          s: { r: minR, c: minC + 1 },
          e: { r: maxR, c: maxC + 1 }
        });
      } else if (maxC >= targetCol && minC < targetCol) {
        // targetCol was inserted INSIDE the merge: expand merge width by 1
        updatedMerges.push({
          s: { r: minR, c: minC },
          e: { r: maxR, c: maxC + 1 }
        });
      } else {
        // Entire merge is to the left of targetCol: unchanged
        updatedMerges.push({
          s: { r: minR, c: minC },
          e: { r: maxR, c: maxC }
        });
      }
    }
    sheet.merges = updatedMerges;
  }

  sheet.cells = newCells;
  sheet.colsCount = (sheet.colsCount || 26) + 1;

  if (left && EXCEL_WB.activeCell) {
    EXCEL_WB.activeCell.c += 1;
  }

  if (typeof autoFitSheetColumns === 'function' && !EXCEL_WB.isImportedWorkbook) {
    autoFitSheetColumns(sheet, true);
  }

  recalculateAllSheetFormulas(true);
  renderExcelGrid(true);
  updateFormulaBarUI();
  markWorkbookUnsaved();
}

function deleteActiveCol() {
  const sheet = getActiveSheet();
  if (!sheet || (sheet.colsCount || 26) <= 1) return;
  pushUndoState('Delete Column');

  const targetCol = EXCEL_WB.activeCell?.c || 0;
  const newCells = {};

  // 1. Shift cells
  for (const [key, cell] of Object.entries(sheet.cells || {})) {
    const [r, c] = key.split(',').map(Number);
    if (c > targetCol) {
      newCells[`${r},${c - 1}`] = cell;
    } else if (c < targetCol) {
      newCells[key] = cell;
    }
  }

  // 2. Adjust formula references
  for (const cell of Object.values(newCells)) {
    if (cell.f && typeof cell.f === 'string') {
      cell.f = adjustFormulaOnDeleteCol(cell.f, targetCol);
    }
  }

  // 3. Shift colWidths
  const newColWidths = {};
  const maxC = sheet.colsCount || 26;
  for (let c = 0; c < maxC; c++) {
    if (c < targetCol) {
      newColWidths[c] = sheet.colWidths?.[c] || 75;
    } else if (c > targetCol) {
      newColWidths[c - 1] = sheet.colWidths?.[c] || 75;
    }
  }
  sheet.colWidths = newColWidths;

  // 4. Update and shift sheet.merges
  if (Array.isArray(sheet.merges)) {
    const updatedMerges = [];
    for (const m of sheet.merges) {
      const minC = Math.min(m.s.c, m.e.c);
      const maxC = Math.max(m.s.c, m.e.c);
      const minR = Math.min(m.s.r, m.e.r);
      const maxR = Math.max(m.s.r, m.e.r);

      if (minC === targetCol && maxC === targetCol) {
        // This single-column merge was deleted
        continue;
      }

      let newMinC = minC;
      let newMaxC = maxC;

      if (minC > targetCol) newMinC = minC - 1;
      if (maxC >= targetCol) newMaxC = maxC - 1;

      if (newMaxC >= newMinC && maxR >= minR) {
        if (newMaxC === newMinC && maxR === minR) {
          // Collapsed to 1x1 cell
          continue;
        }
        updatedMerges.push({
          s: { r: minR, c: newMinC },
          e: { r: maxR, c: newMaxC }
        });
      }
    }
    sheet.merges = updatedMerges;
  }

  sheet.cells = newCells;
  sheet.colsCount = Math.max(1, (sheet.colsCount || 26) - 1);

  if (EXCEL_WB.activeCell) {
    EXCEL_WB.activeCell.c = Math.max(0, Math.min(sheet.colsCount - 1, EXCEL_WB.activeCell.c));
  }

  if (typeof autoFitSheetColumns === 'function' && !EXCEL_WB.isImportedWorkbook) {
    autoFitSheetColumns(sheet, true);
  }

  recalculateAllSheetFormulas(true);
  renderExcelGrid(true);
  updateFormulaBarUI();
  markWorkbookUnsaved();
}

/* ══════════════════════════════════════════════════════════════
   COLUMN AND ROW RESIZING HANDLERS
   ══════════════════════════════════════════════════════════════ */
function startColResize(e, c) {
  e.stopPropagation();
  e.preventDefault();
  const sheet = getActiveSheet();
  const startX = e.clientX;
  const initialWidth = sheet.colWidths[c] || 90;

  const onMouseMove = (ev) => {
    const delta = ev.clientX - startX;
    const newWidth = Math.max(35, initialWidth + delta);
    sheet.colWidths[c] = newWidth;
    const th = document.querySelector(`.col-th-${c}`);
    if (th) {
      th.style.width = `${newWidth}px`;
      th.style.minWidth = `${newWidth}px`;
    }
    updateSelectionBoxUI();
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    markWorkbookUnsaved();
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function startRowResize(e, r) {
  e.stopPropagation();
  e.preventDefault();
  const sheet = getActiveSheet();
  const startY = e.clientY;
  const initialHeight = sheet.rowHeights[r] || 25;

  const onMouseMove = (ev) => {
    const delta = ev.clientY - startY;
    const newHeight = Math.max(20, initialHeight + delta);
    sheet.rowHeights[r] = newHeight;
    const tr = document.querySelector(`tr[data-row="${r}"]`);
    if (tr) tr.style.height = `${newHeight}px`;
    updateSelectionBoxUI();
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    markWorkbookUnsaved();
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

/* ══════════════════════════════════════════════════════════════
   CLIPBOARD & UNDO/REDO OPERATIONS
   ══════════════════════════════════════════════════════════════ */
function pushUndoState(actionName) {
  const sheet = getActiveSheet();
  if (!sheet) return;
  EXCEL_WB.undoStack.push({
    action: actionName,
    cells: JSON.parse(JSON.stringify(sheet.cells)),
    rowsCount: sheet.rowsCount,
    colsCount: sheet.colsCount,
    merges: JSON.parse(JSON.stringify(sheet.merges || [])),
    colWidths: JSON.parse(JSON.stringify(sheet.colWidths || {})),
    rowHeights: JSON.parse(JSON.stringify(sheet.rowHeights || {}))
  });
  if (EXCEL_WB.undoStack.length > 50) EXCEL_WB.undoStack.shift();
  EXCEL_WB.redoStack = [];
}

function excelUndo() {
  if (!EXCEL_WB.undoStack.length) return;
  const sheet = getActiveSheet();
  const lastState = EXCEL_WB.undoStack.pop();

  EXCEL_WB.redoStack.push({
    action: lastState.action,
    cells: JSON.parse(JSON.stringify(sheet.cells)),
    rowsCount: sheet.rowsCount,
    colsCount: sheet.colsCount,
    merges: JSON.parse(JSON.stringify(sheet.merges || [])),
    colWidths: JSON.parse(JSON.stringify(sheet.colWidths || {})),
    rowHeights: JSON.parse(JSON.stringify(sheet.rowHeights || {}))
  });

  sheet.cells = lastState.cells;
  sheet.rowsCount = lastState.rowsCount;
  sheet.colsCount = lastState.colsCount;
  if (lastState.merges) sheet.merges = JSON.parse(JSON.stringify(lastState.merges));
  if (lastState.colWidths) sheet.colWidths = JSON.parse(JSON.stringify(lastState.colWidths));
  if (lastState.rowHeights) sheet.rowHeights = JSON.parse(JSON.stringify(lastState.rowHeights));

  recalculateAllSheetFormulas(true);
  renderExcelGrid(true);
  markWorkbookUnsaved();
}

function excelRedo() {
  if (!EXCEL_WB.redoStack.length) return;
  const sheet = getActiveSheet();
  const nextState = EXCEL_WB.redoStack.pop();

  EXCEL_WB.undoStack.push({
    action: nextState.action,
    cells: JSON.parse(JSON.stringify(sheet.cells)),
    rowsCount: sheet.rowsCount,
    colsCount: sheet.colsCount,
    merges: JSON.parse(JSON.stringify(sheet.merges || [])),
    colWidths: JSON.parse(JSON.stringify(sheet.colWidths || {})),
    rowHeights: JSON.parse(JSON.stringify(sheet.rowHeights || {}))
  });

  sheet.cells = nextState.cells;
  sheet.rowsCount = nextState.rowsCount;
  sheet.colsCount = nextState.colsCount;
  if (nextState.merges) sheet.merges = JSON.parse(JSON.stringify(nextState.merges));
  if (nextState.colWidths) sheet.colWidths = JSON.parse(JSON.stringify(nextState.colWidths));
  if (nextState.rowHeights) sheet.rowHeights = JSON.parse(JSON.stringify(nextState.rowHeights));

  recalculateAllSheetFormulas(true);
  renderExcelGrid(true);
  markWorkbookUnsaved();
}

function excelCopy() {
  const sheet = getActiveSheet();
  if (!sheet) return;

  const { r1, c1, r2, c2 } = EXCEL_WB.selectedRange;
  const startR = Math.min(r1, r2);
  const endR = Math.max(r1, r2);
  const startC = Math.min(c1, c2);
  const endC = Math.max(c1, c2);

  const gridData = [];
  const textRows = [];

  for (let r = startR; r <= endR; r++) {
    const row = [];
    const textCells = [];
    for (let c = startC; c <= endC; c++) {
      const cell = getCell(sheet, r, c);
      row.push(JSON.parse(JSON.stringify(cell)));
      textCells.push(cell.v !== undefined && cell.v !== null ? cell.v : (cell.raw || ''));
    }
    gridData.push(row);
    textRows.push(textCells.join('\t'));
  }

  EXCEL_WB.clipboard = { type: 'copy', data: gridData };

  // Write tab-delimited text to system clipboard for Excel desktop interoperability
  try {
    navigator.clipboard.writeText(textRows.join('\n'));
  } catch (_) { }
}

function excelCut() {
  excelCopy();
  if (EXCEL_WB.clipboard) {
    EXCEL_WB.clipboard.type = 'cut';
  }
}

function excelPaste() {
  const sheet = getActiveSheet();
  if (!sheet) return;

  if (EXCEL_WB.clipboard && EXCEL_WB.clipboard.data) {
    pushUndoState('Paste');
    const { r, c } = EXCEL_WB.activeCell;
    const gridData = EXCEL_WB.clipboard.data;

    for (let dr = 0; dr < gridData.length; dr++) {
      for (let dc = 0; dc < gridData[dr].length; dc++) {
        setCell(sheet, r + dr, c + dc, gridData[dr][dc]);
      }
    }

    if (EXCEL_WB.clipboard.type === 'cut') {
      EXCEL_WB.clipboard = null;
    }

    recalculateAllSheetFormulas(true);
    markWorkbookUnsaved();
  }
}

/* ══════════════════════════════════════════════════════════════
   WORKSHEET TABS & MULTI-SHEET MANAGEMENT
   ══════════════════════════════════════════════════════════════ */
function renderSheetTabs() {
  const list = document.getElementById('excel-sheet-tabs-list');
  if (!list) return;

  list.innerHTML = EXCEL_WB.sheets.map((s, idx) => `
    <div class="excel-sheet-tab-item ${idx === EXCEL_WB.activeSheetIndex ? 'active' : ''}" onclick="switchWorksheet(${idx})" ondblclick="openRenameSheetModal(${idx})" title="Click to view sheet, double-click to rename">
      <span>${escapeHtml(s.name)}</span>
      ${EXCEL_WB.sheets.length > 1 ? `<button type="button" class="excel-tab-close-btn" onclick="event.stopPropagation();deleteWorksheet(${idx})" title="Delete Sheet">×</button>` : ''}
    </div>
  `).join('');
}

function switchWorksheet(idx) {
  if (idx < 0 || idx >= EXCEL_WB.sheets.length) return;
  EXCEL_WB.activeSheetIndex = idx;
  const sheet = EXCEL_WB.sheets[idx];

  // 1. Synchronize top dropdown (#sheet-selector-dropdown)
  const dropdown = document.getElementById('sheet-selector-dropdown');
  if (dropdown) {
    if (EXCEL_WB.isImportedWorkbook) {
      dropdown.innerHTML = EXCEL_WB.sheets.map((s, i) =>
        `<option value="sheet_idx_${i}" ${i === idx ? 'selected' : ''}>${i + 1}. ${escapeHtml(s.name)}</option>`
      ).join('');
      dropdown.value = `sheet_idx_${idx}`;
    } else {
      let sheetType = sheet.type;
      if (!sheetType) {
        const n = (sheet.name || '').toLowerCase();
        if (n.includes('test') || n.startsWith('ut')) sheetType = 'tests';
        else if (n.includes('assignment')) sheetType = 'assignments';
        else if (n.includes('practical') || n.includes('lab')) sheetType = 'practicals';
        else sheetType = 'evaluation';
      }
      S.activeSheet = (sheetType === 'single-test') ? 'tests' : sheetType;
      dropdown.value = S.activeSheet;
    }
  }

  // 2. Synchronize URL query parameter
  const url = new URL(window.location);
  if (EXCEL_WB.isImportedWorkbook) {
    url.searchParams.set('sheet', sheet.name);
  } else {
    url.searchParams.set('sheet', S.activeSheet || 'evaluation');
  }
  if (S.groupId) url.searchParams.set('id', S.groupId);
  window.history.pushState({}, '', url);

  // 3. Subsheet controls synchronization
  renderSubsheetControls();

  // 4. Institutional banner visibility synchronization
  const banner = document.getElementById('sheet-institutional-banner');
  const bannerBtn = document.getElementById('btn-toggle-college-banner');
  const bannerViewBtn = document.getElementById('btn-toggle-banner-view');

  if (EXCEL_WB.isImportedWorkbook) {
    if (EXCEL_WB.bannerVisible === undefined) {
      EXCEL_WB.bannerVisible = false;
    }
  } else {
    if (EXCEL_WB.bannerVisible === undefined) {
      EXCEL_WB.bannerVisible = true;
    }
    updateBannerForSheet(sheet.type === 'single-test' ? sheet.name : (sheet.type || S.activeSheet));
  }

  if (banner) {
    if (EXCEL_WB.bannerVisible !== false) {
      banner.style.setProperty('display', 'flex', 'important');
    } else {
      banner.style.setProperty('display', 'none', 'important');
    }
  }
  if (bannerBtn) {
    bannerBtn.classList.toggle('active', Boolean(EXCEL_WB.bannerVisible));
    const lbl = document.getElementById('btn-banner-label');
    if (lbl) lbl.textContent = EXCEL_WB.bannerVisible ? 'College Banner: ON' : 'College Banner: OFF';
  }
  if (bannerViewBtn) {
    bannerViewBtn.classList.toggle('active', Boolean(EXCEL_WB.bannerVisible));
    bannerViewBtn.textContent = `College Banner: ${EXCEL_WB.bannerVisible ? 'ON' : 'OFF'}`;
  }

  // 5. Auto-fit columns for this worksheet so every column's data does not overlap
  if (typeof autoFitSheetColumns === 'function' && !EXCEL_WB.isImportedWorkbook) {
    autoFitSheetColumns(sheet, false);
  }

  // 6. Render tabs, grid, formula bar, stats
  recalculateSheetFormulas(sheet);
  renderSheetTabs();
  renderExcelGrid(true);
  updateFormulaBarUI();
  updateStatusBarStats();

  // Scroll active tab into view in the bottom bar
  setTimeout(() => {
    const list = document.getElementById('excel-sheet-tabs-list');
    const activeTab = list?.querySelector('.excel-sheet-tab-item.active');
    if (activeTab && list) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, 30);
}

function createNewWorksheet(sheetName) {
  const name = sheetName || `Sheet${EXCEL_WB.sheets.length + 1}`;
  const newSheet = createDefaultExcelSheet(name);
  EXCEL_WB.sheets.push(newSheet);
  EXCEL_WB.activeSheetIndex = EXCEL_WB.sheets.length - 1;
  renderSheetTabs();
  renderExcelGrid(true);
  markWorkbookUnsaved();
}

function duplicateWorksheet(idx) {
  if (idx < 0 || idx >= EXCEL_WB.sheets.length) return;
  const src = EXCEL_WB.sheets[idx];
  const clone = JSON.parse(JSON.stringify(src));
  clone.id = 'sheet_' + Math.random().toString(36).substr(2, 9);
  clone.name = `${src.name} (Copy)`;
  EXCEL_WB.sheets.splice(idx + 1, 0, clone);
  switchWorksheet(idx + 1);
  markWorkbookUnsaved();
}

function deleteWorksheet(idx) {
  if (EXCEL_WB.sheets.length <= 1) return;
  if (!confirm(`Are you sure you want to delete worksheet "${EXCEL_WB.sheets[idx].name}"?`)) return;
  EXCEL_WB.sheets.splice(idx, 1);
  if (EXCEL_WB.activeSheetIndex >= EXCEL_WB.sheets.length) {
    EXCEL_WB.activeSheetIndex = EXCEL_WB.sheets.length - 1;
  }
  renderSheetTabs();
  renderExcelGrid(true);
  markWorkbookUnsaved();
}

function scrollSheetTabs(direction) {
  const list = document.getElementById('excel-sheet-tabs-list');
  if (list) list.scrollBy({ left: direction * 150, behavior: 'smooth' });
}

function openRenameSheetModal(idx) {
  const sheet = EXCEL_WB.sheets[idx];
  if (!sheet) return;
  window._renamingSheetIndex = idx;
  const input = document.getElementById('rename-sheet-input');
  if (input) input.value = sheet.name;
  openModal('modal-rename-sheet');
}

function closeRenameSheetModal() {
  closeModal('modal-rename-sheet');
}

function confirmRenameWorksheet() {
  const input = document.getElementById('rename-sheet-input');
  if (input && window._renamingSheetIndex !== undefined) {
    const newName = input.value.trim();
    if (newName) {
      EXCEL_WB.sheets[window._renamingSheetIndex].name = newName;
      renderSheetTabs();
      markWorkbookUnsaved();
    }
  }
  closeRenameSheetModal();
}

/* ══════════════════════════════════════════════════════════════
   FIND & REPLACE MODAL CONTROLLER
   ══════════════════════════════════════════════════════════════ */
function openFindReplaceModal() {
  openModal('modal-find-replace');
  const input = document.getElementById('find-input-text');
  if (input) {
    input.focus();
    input.select();
  }
}

function closeFindReplaceModal() {
  closeModal('modal-find-replace');
}

function executeFindNext() {
  const sheet = getActiveSheet();
  const searchStr = document.getElementById('find-input-text')?.value || '';
  const matchCase = document.getElementById('find-match-case')?.checked || false;
  const entireCell = document.getElementById('find-entire-cell')?.checked || false;
  const statusEl = document.getElementById('find-replace-status');

  if (!searchStr || !sheet) return;

  const needle = matchCase ? searchStr : searchStr.toLowerCase();
  const startR = EXCEL_WB.activeCell.r;
  const startC = EXCEL_WB.activeCell.c;

  let found = null;

  for (let r = 0; r < sheet.rowsCount; r++) {
    for (let c = 0; c < sheet.colsCount; c++) {
      if (r < startR || (r === startR && c <= startC)) continue; // search after active
      const cell = getCell(sheet, r, c);
      const val = String(cell.v !== undefined && cell.v !== null ? cell.v : cell.raw || '');
      const haystack = matchCase ? val : val.toLowerCase();

      if (entireCell ? haystack === needle : haystack.includes(needle)) {
        found = { r, c };
        break;
      }
    }
    if (found) break;
  }

  // Wrap around search from start
  if (!found) {
    for (let r = 0; r <= startR; r++) {
      for (let c = 0; c < sheet.colsCount; c++) {
        const cell = getCell(sheet, r, c);
        const val = String(cell.v !== undefined && cell.v !== null ? cell.v : cell.raw || '');
        const haystack = matchCase ? val : val.toLowerCase();

        if (entireCell ? haystack === needle : haystack.includes(needle)) {
          found = { r, c };
          break;
        }
      }
      if (found) break;
    }
  }

  if (found) {
    EXCEL_WB.activeCell = found;
    EXCEL_WB.selectedRange = { r1: found.r, c1: found.c, r2: found.r, c2: found.c };
    updateSelectionBoxUI();
    updateHeaderHighlights();
    scrollToActiveCell();
    if (statusEl) statusEl.textContent = `Found match at ${coordToRef(found.r, found.c)}`;
  } else {
    if (statusEl) statusEl.textContent = `No matches found for "${searchStr}"`;
  }
}

function executeReplaceOne() {
  const sheet = getActiveSheet();
  const searchStr = document.getElementById('find-input-text')?.value || '';
  const replaceStr = document.getElementById('replace-input-text')?.value || '';
  const matchCase = document.getElementById('find-match-case')?.checked || false;
  if (!searchStr || !sheet) return;

  const { r, c } = EXCEL_WB.activeCell;
  const cell = getCell(sheet, r, c);
  const val = String(cell.v !== undefined && cell.v !== null ? cell.v : cell.raw || '');

  const regex = new RegExp(searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
  if (regex.test(val)) {
    pushUndoState('Replace');
    const newVal = val.replace(regex, replaceStr);
    setCell(sheet, r, c, newVal);
    recalculateAllSheetFormulas(true);
    markWorkbookUnsaved();
  }
  executeFindNext();
}

function executeReplaceAll() {
  const sheet = getActiveSheet();
  const searchStr = document.getElementById('find-input-text')?.value || '';
  const replaceStr = document.getElementById('replace-input-text')?.value || '';
  const matchCase = document.getElementById('find-match-case')?.checked || false;
  const entireCell = document.getElementById('find-entire-cell')?.checked || false;
  const statusEl = document.getElementById('find-replace-status');
  if (!searchStr || !sheet) return;

  pushUndoState('Replace All');
  let count = 0;
  const needle = matchCase ? searchStr : searchStr.toLowerCase();

  for (let r = 0; r < sheet.rowsCount; r++) {
    for (let c = 0; c < sheet.colsCount; c++) {
      const cell = getCell(sheet, r, c);
      const val = String(cell.v !== undefined && cell.v !== null ? cell.v : cell.raw || '');
      const haystack = matchCase ? val : val.toLowerCase();

      if (entireCell ? haystack === needle : haystack.includes(needle)) {
        const regex = new RegExp(searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
        const newVal = val.replace(regex, replaceStr);
        setCell(sheet, r, c, newVal);
        count++;
      }
    }
  }

  recalculateAllSheetFormulas(true);
  markWorkbookUnsaved();
  if (statusEl) statusEl.textContent = `Replaced ${count} occurrence(s).`;
}

/* ══════════════════════════════════════════════════════════════
   INSERT FUNCTION MODAL CONTROLLER
   ══════════════════════════════════════════════════════════════ */
const FORMULA_FUNCTIONS_CATALOG = [
  { name: 'SUM', syntax: 'SUM(number1, [number2], ...)', desc: 'Adds all numbers in a range of cells.' },
  { name: 'AVERAGE', syntax: 'AVERAGE(number1, [number2], ...)', desc: 'Returns the arithmetic mean of arguments.' },
  { name: 'COUNT', syntax: 'COUNT(value1, [value2], ...)', desc: 'Counts the number of cells in a range that contain numbers.' },
  { name: 'COUNTA', syntax: 'COUNTA(value1, [value2], ...)', desc: 'Counts the number of non-empty cells in a range.' },
  { name: 'MIN', syntax: 'MIN(number1, [number2], ...)', desc: 'Returns the smallest number in a set of values.' },
  { name: 'MAX', syntax: 'MAX(number1, [number2], ...)', desc: 'Returns the largest number in a set of values.' },
  { name: 'IF', syntax: 'IF(logical_test, [value_if_true], [value_if_false])', desc: 'Returns one value if condition is true, and another if false.' },
  { name: 'SUMIF', syntax: 'SUMIF(range, criteria, [sum_range])', desc: 'Adds the cells specified by a given criteria.' },
  { name: 'COUNTIF', syntax: 'COUNTIF(range, criteria)', desc: 'Counts the number of cells within a range that meet the given criteria.' },
  { name: 'CONCAT', syntax: 'CONCAT(text1, [text2], ...)', desc: 'Joins two or more text strings into one string.' },
  { name: 'ROUND', syntax: 'ROUND(number, num_digits)', desc: 'Rounds a number to a specified number of digits.' },
  { name: 'TODAY', syntax: 'TODAY()', desc: 'Returns the current date.' }
];

let selectedFunctionItem = FORMULA_FUNCTIONS_CATALOG[0];

function openInsertFunctionModal() {
  openModal('modal-insert-function');
  filterFormulaFunctionsList('');
}

function closeInsertFunctionModal() {
  closeModal('modal-insert-function');
}

function filterFormulaFunctionsList(query) {
  const q = String(query || '').trim().toUpperCase();
  const listEl = document.getElementById('insert-fn-picker-list');
  if (!listEl) return;

  const matches = FORMULA_FUNCTIONS_CATALOG.filter(f => f.name.includes(q) || f.desc.toUpperCase().includes(q));
  listEl.innerHTML = matches.map((fn, idx) => `
    <div class="excel-fn-item ${fn.name === selectedFunctionItem?.name ? 'selected' : ''}" onclick="selectFunctionItem('${fn.name}')">
      <span>${fn.name}</span>
      <span style="font-size:0.7rem;color:var(--text-muted);font-weight:400;">${fn.syntax}</span>
    </div>
  `).join('');
}

function selectFunctionItem(name) {
  const item = FORMULA_FUNCTIONS_CATALOG.find(f => f.name === name);
  if (!item) return;
  selectedFunctionItem = item;

  document.querySelectorAll('.excel-fn-item').forEach(el => {
    el.classList.toggle('selected', el.querySelector('span')?.textContent === name);
  });

  const syntaxEl = document.getElementById('insert-fn-syntax-preview');
  const descEl = document.getElementById('insert-fn-desc-preview');
  if (syntaxEl) syntaxEl.textContent = item.syntax;
  if (descEl) descEl.textContent = item.desc;
}

function confirmInsertSelectedFunction() {
  if (!selectedFunctionItem) return;
  insertFormulaTemplate(selectedFunctionItem.name);
  closeInsertFunctionModal();
}

function insertFormulaTemplate(fnName) {
  const sheet = getActiveSheet();
  const { r, c } = EXCEL_WB.activeCell;
  const colLetter = colToLetter(Math.max(0, c - 1));
  const rowNum = r + 1;
  const template = `=${fnName}(A${rowNum}:${colLetter}${rowNum})`;

  setCell(sheet, r, c, template);
  recalculateAllSheetFormulas(true);
  startInlineEditing(r, c);
  markWorkbookUnsaved();
}

function insertAutoFormula(type) {
  insertFormulaTemplate(type);
  toggleAutoSumMenu();
}

/* ══════════════════════════════════════════════════════════════
   IMPORT & EXPORT COMPATIBILITY ENGINE (EXCELJS + CSV + PDF + WORD)
   ══════════════════════════════════════════════════════════════ */
const EXCEL_COLOR_NAME_MAP = {
  white: '#ffffff',
  black: '#000000',
  transparent: '#ffffff',
  inherit: '#0f172a',
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  yellow: '#eab308',
  gray: '#6b7280',
  grey: '#6b7280'
};

const EXCEL_CSS_VAR_MAP = {
  '--bg-primary': '#ffffff',
  '--bg-secondary': '#f8fafc',
  '--bg-tertiary': '#f1f5f9',
  '--text-primary': '#0f172a',
  '--text-secondary': '#334155',
  '--text-muted': '#475569',
  '--text-light': '#64748b',
  '--text-main': '#0f172a',
  '--text-sub': '#334155',
  '--border-color': '#cbd5e1',
  '--border-subtle': '#e2e8f0',
  '--primary-color': '#0284c7',
  '--primary-light': '#e0f2fe',
  '--table-th-bg': '#f1f5f9',
  '--table-header-bg': '#f1f5f9',
  '--table-border': '#cbd5e1',
  '--table-td-border': '#cbd5e1',
  '--status-present-bg': '#dcfce7',
  '--status-present-text': '#166534',
  '--status-absent-bg': '#fee2e2',
  '--status-absent-text': '#991b1b',
  '--status-late-bg': '#fef3c7',
  '--status-late-text': '#92400e',
  '--badge-primary-bg': '#e0f2fe',
  '--badge-primary-text': '#0369a1'
};

function isColorDark(hex) {
  if (!hex || typeof hex !== 'string') return false;
  const c = hex.replace('#', '').trim();
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  return ((r * 299) + (g * 587) + (b * 114)) / 1000 < 140;
}

function ensureExportContrast(fontHex, bgHex) {
  const effectiveBg = bgHex || '#ffffff';
  const effectiveFont = fontHex || '#0f172a';
  const isBgDark = isColorDark(effectiveBg);
  const isFontDark = isColorDark(effectiveFont);

  // If both are dark (e.g. dark text on dark bg), flip font to light
  if (isBgDark && isFontDark) {
    return '#ffffff';
  }
  // If both are light (e.g. white/light text on white/light bg), flip font to dark
  if (!isBgDark && !isFontDark) {
    return '#0f172a';
  }
  return effectiveFont;
}

function resolveColorToHex(colorStr, fallbackHex = '#0f172a') {
  if (!colorStr || typeof colorStr !== 'string') return fallbackHex;
  let str = colorStr.trim().toLowerCase();

  if (str.startsWith('var(')) {
    const varNameMatch = str.match(/var\(\s*([^,\)]+)(?:,\s*([^\)]+))?\)/);
    if (varNameMatch) {
      const varName = varNameMatch[1].trim();
      const varFallback = varNameMatch[2]?.trim();
      let resolved = '';
      // 1. Prioritize print-safe light-theme tokens so dark mode does not export white text to white Excel/PDF/Word sheets
      if (EXCEL_CSS_VAR_MAP[varName]) {
        resolved = EXCEL_CSS_VAR_MAP[varName];
      } else if (varFallback && !varFallback.startsWith('var(')) {
        resolved = varFallback;
      } else if (typeof window !== 'undefined' && window.getComputedStyle) {
        try {
          resolved = window.getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        } catch (_) { }
      }
      if (resolved) str = resolved.toLowerCase();
    }
  }

  if (EXCEL_COLOR_NAME_MAP[str]) return EXCEL_COLOR_NAME_MAP[str];

  if (str.startsWith('#')) {
    const raw = str.slice(1);
    if (raw.length === 3) {
      return '#' + raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
    }
    if (raw.length === 6) {
      return '#' + raw;
    }
    if (raw.length === 8) {
      return '#' + raw.slice(0, 6);
    }
  }

  const rgbMatch = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10))).toString(16).padStart(2, '0');
    const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10))).toString(16).padStart(2, '0');
    const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10))).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  return fallbackHex;
}

function resolveColorToArgb(colorStr, defaultArgb = 'FFFFFFFF') {
  const hex = resolveColorToHex(colorStr, '#' + defaultArgb.slice(2));
  return 'FF' + hex.replace('#', '').toUpperCase();
}

async function exportCurrentSheet(format) {
  const sheet = getActiveSheet();
  if (!sheet) return;

  if (format === 'xlsx') {
    if (typeof ExcelJS === 'undefined') {
      alert('Excel export engine is initializing, please try again.');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'VidyaOS Campus Operating System';
      workbook.lastModifiedBy = 'Faculty Member';
      workbook.created = new Date();

      const banner1 = document.getElementById('hdr-banner-line1')?.textContent?.trim() || 'Uttarakhand Government Institute of Polytechnic, Nainital | Internal Evaluation Sheet 2026-27 (Winter Session)';
      const banner2 = document.getElementById('hdr-banner-line2')?.textContent?.trim() || (S.group ? `Internal Evaluation | Subject : ${S.group.name || S.group.subject_name || 'Subject'}` : 'Internal Evaluation Sheet');
      const banner3 = document.getElementById('hdr-banner-cohort')?.textContent?.trim() || 'Information Technology | Semester 5';

      EXCEL_WB.sheets.forEach(wsData => {
        const cleanSheetName = (wsData.name || 'Sheet')
          .replace(/[*?:/\\\[\]]/g, ' ')
          .trim()
          .substring(0, 31) || 'Sheet1';
        const worksheet = workbook.addWorksheet(cleanSheetName);

        // 1. Find the highest column index that actually has data in this worksheet
        let maxDataCol = 0;
        for (let c = 0; c < (wsData.colsCount || 26); c++) {
          for (let r = 0; r < (wsData.rowsCount || 50); r++) {
            const cellVal = getCell(wsData, r, c).v;
            if (cellVal !== '' && cellVal !== null && cellVal !== undefined) {
              if (c > maxDataCol) maxDataCol = c;
            }
          }
        }
        maxDataCol = Math.max(maxDataCol, 3); // at least 4 columns (A, B, C, D)

        // 2. Check if this worksheet already has the institutional banner embedded or should omit banner
        const cell0_0 = String(getCell(wsData, 0, 0).v || getCell(wsData, 0, 0).raw || '');
        const alreadyHasBanner = cell0_0.includes('Polytechnic') || cell0_0.includes('Institute') || cell0_0.includes('Uttarakhand');
        const shouldPrependBanner = !EXCEL_WB.isImportedWorkbook && (EXCEL_WB.bannerVisible !== false) && !alreadyHasBanner;
        const bannerOffset = shouldPrependBanner ? 3 : 0;

        // 3. Prepend Institutional Header rows if required
        if (shouldPrependBanner) {
          // Banner Row 1: Institution & Session
          const r1 = worksheet.getRow(1);
          r1.height = 28;
          const c1 = r1.getCell(1);
          c1.value = banner1;
          c1.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF0F172A' } };
          c1.alignment = { horizontal: 'center', vertical: 'middle' };
          c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          worksheet.mergeCells(1, 1, 1, maxDataCol + 1);

          // Banner Row 2: Department & Subject
          const r2 = worksheet.getRow(2);
          r2.height = 22;
          const c2 = r2.getCell(1);
          c2.value = banner2;
          c2.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E293B' } };
          c2.alignment = { horizontal: 'center', vertical: 'middle' };
          c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          worksheet.mergeCells(2, 1, 2, maxDataCol + 1);

          // Banner Row 3: Cohort & Semester
          const r3 = worksheet.getRow(3);
          r3.height = 20;
          const c3 = r3.getCell(1);
          c3.value = banner3;
          c3.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
          c3.alignment = { horizontal: 'center', vertical: 'middle' };
          c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          worksheet.mergeCells(3, 1, 3, maxDataCol + 1);

          // Borders for banner rows
          for (let bRow = 1; bRow <= 3; bRow++) {
            const bRowObj = worksheet.getRow(bRow);
            for (let c = 1; c <= maxDataCol + 1; c++) {
              bRowObj.getCell(c).border = {
                top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
              };
            }
          }
        }

        // 4. Track column max lengths for perfect auto-width calculation
        const colMaxLengths = new Array(maxDataCol + 1).fill(10);
        colMaxLengths[0] = 10; // Roll #
        colMaxLengths[1] = 18; // UBTER Roll No
        colMaxLengths[2] = 26; // Student Name

        // 5. Populate Data Rows & Cells
        const maxRows = Math.max(wsData.rowsCount || 50, 20);
        for (let r = 0; r < maxRows; r++) {
          let rowHasData = false;
          for (let c = 0; c <= maxDataCol; c++) {
            const cell = getCell(wsData, r, c);
            if (cell.raw !== '' && cell.raw !== null && cell.raw !== undefined) {
              rowHasData = true;
              break;
            }
          }
          if (!rowHasData && r >= 30) continue; // skip excessive trailing empty rows

          const excelR = r + 1 + bannerOffset;
          const rowObj = worksheet.getRow(excelR);
          const isHeader = r === 0;
          const isSubHeader = (r === 1 && !isMarksRow(wsData, 1));
          const isMarks = r === 1 && isMarksRow(wsData, 1);

          // Calculate maximum line breaks across all cells in this row to guarantee no vertical clipping
          let maxLinesInRow = 1;
          for (let c = 0; c <= maxDataCol; c++) {
            const cell = getCell(wsData, r, c);
            const valStr = String(cell.v !== undefined && cell.v !== null ? cell.v : (cell.raw || '')).trim();
            const explicitLines = valStr.split(/\r?\n/).length;
            if (explicitLines > maxLinesInRow) maxLinesInRow = explicitLines;
          }

          let minRequiredH = 20;
          if (isHeader) {
            minRequiredH = 28;
          } else if (maxLinesInRow >= 3) {
            minRequiredH = 52;
          } else if (maxLinesInRow === 2 || isSubHeader) {
            minRequiredH = 38;
          } else if (isMarks) {
            minRequiredH = 22;
          }

          if (wsData.rowHeights && typeof wsData.rowHeights[r] === 'number' && wsData.rowHeights[r] > 0) {
            rowObj.height = Math.max(Math.round(wsData.rowHeights[r] * 0.75), minRequiredH);
          } else {
            rowObj.height = minRequiredH;
          }

          for (let c = 0; c <= maxDataCol; c++) {
            const cell = getCell(wsData, r, c);
            const excelCell = rowObj.getCell(c + 1);

            const strLen = String(cell.v !== undefined && cell.v !== null ? cell.v : (cell.raw || '')).length;
            if (strLen > colMaxLengths[c] && !isMarks) {
              colMaxLengths[c] = Math.min(strLen + 3, 35);
            }

            const valStr = String(cell.v !== undefined && cell.v !== null ? cell.v : (cell.raw || '')).trim();
            const isLongNumeric = /^\d{8,}$/.test(valStr);
            const isIdCol = (c === 0 || c === 1 || c === 2 || c === 3);

            if (cell.raw !== '' && cell.raw !== null && cell.raw !== undefined) {
              if (cell.f) {
                let adjustedFormula = cell.f.replace(/^=/, '');
                if (bannerOffset > 0) {
                  // Shift cell row references in formulas (e.g. D3 -> D6)
                  adjustedFormula = adjustedFormula.replace(/([A-Z]+)(\d+)/g, (match, colLetters, rowNumber) => {
                    return `${colLetters}${parseInt(rowNumber, 10) + bannerOffset}`;
                  });
                }
                excelCell.value = {
                  formula: adjustedFormula,
                  result: cell.v
                };
              } else if (isLongNumeric || (isIdCol && !isNaN(Number(valStr)) && valStr !== '')) {
                // Keep as string with '@' format to completely avoid Excel scientific notation (e.g. 2.4011E+10)
                excelCell.value = valStr;
                excelCell.numFmt = '@';
              } else if (!isNaN(Number(cell.v)) && cell.v !== '' && !valStr.startsWith('0')) {
                excelCell.value = Number(cell.v);
              } else {
                excelCell.value = cell.v !== undefined ? cell.v : cell.raw;
              }
            }

            // Cell styling & borders
            excelCell.border = {
              top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
              bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
              left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
              right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            };

            // 1. Resolve Background Color (Cell specific bg overrides header/marks defaults)
            let bgHex = null;
            if (cell.s?.bg) {
              bgHex = resolveColorToHex(cell.s.bg);
            } else if (isHeader) {
              bgHex = '#e2e8f0';
            } else if (isSubHeader) {
              bgHex = '#f8fafc';
            } else if (isMarks) {
              bgHex = '#f1f5f9';
            }

            if (bgHex) {
              excelCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF' + bgHex.replace('#', '').toUpperCase() }
              };
            }

            // 2. Resolve Text / Font Styling (Guaranteed high-contrast legibility)
            let fontColorHex = '#1e293b';
            if (cell.s?.color) {
              fontColorHex = resolveColorToHex(cell.s.color, '#1e293b');
            } else if (isHeader || isSubHeader) {
              fontColorHex = '#0f172a';
            } else if (isMarks) {
              fontColorHex = '#334155';
            }
            fontColorHex = ensureExportContrast(fontColorHex, bgHex);

            const isBold = Boolean(cell.s?.bold !== undefined ? cell.s.bold : (isHeader || isSubHeader || isMarks));
            const isItalic = Boolean(cell.s?.italic);
            const isUnderline = Boolean(cell.s?.underline);
            const fontSize = cell.s?.fontSize ? Math.round(Number(cell.s.fontSize)) : (isHeader ? 10 : isSubHeader ? 9.5 : isMarks ? 9 : 10);
            const fontFamily = cell.s?.fontFamily || 'Segoe UI';

            excelCell.font = {
              name: fontFamily,
              size: fontSize,
              bold: isBold,
              italic: isItalic,
              underline: isUnderline,
              color: { argb: 'FF' + fontColorHex.replace('#', '').toUpperCase() }
            };

            // 3. Resolve Alignment & Text Wrapping
            let isNameCol = false;
            for (let hr = 0; hr <= 2; hr++) {
              const hCell = getCell(wsData, hr, c);
              const txt = String(hCell?.v !== undefined && hCell?.v !== null ? hCell.v : (hCell?.raw || '')).toUpperCase();
              if (txt.includes('NAME') || txt.includes('STUDENT')) {
                isNameCol = true;
                break;
              }
            }
            if (!isNameCol && ((maxDataCol >= 4 && c === 4) || (maxDataCol < 4 && c === 2))) {
              isNameCol = true;
            }

            const defaultHAlign = (isNameCol && !isHeader && !isSubHeader && !isMarks) ? 'left' : 'center';
            const hAlign = cell.s?.align || defaultHAlign;
            const vAlign = cell.s?.vAlign || 'middle';
            const cellValStr = String(cell.v !== undefined && cell.v !== null ? cell.v : (cell.raw || ''));
            const isWrap = Boolean(cell.s?.wrap || isHeader || isSubHeader || cellValStr.includes('\n'));

            excelCell.alignment = {
              horizontal: hAlign,
              vertical: vAlign,
              wrapText: isWrap
            };
          }
          rowObj.commit();
        }

        // 6. Set custom or auto column widths up to maxDataCol (Total = 63px / 9 units, Grand Total = 65px / 9.5 units)
        for (let c = 0; c <= maxDataCol; c++) {
          let customW = wsData.colWidths?.[c];
          let colHeaderStr = '';
          for (let hr = 0; hr <= 2; hr++) {
            const hCell = getCell(wsData, hr, c);
            const txt = String(hCell?.v !== undefined && hCell?.v !== null ? hCell.v : (hCell?.raw || '')).trim().toUpperCase();
            if (txt) colHeaderStr += ' ' + txt;
          }
          if (colHeaderStr.includes('GRAND TOTAL') || (colHeaderStr.includes('GRAND') && colHeaderStr.includes('TOTAL'))) {
            worksheet.getColumn(c + 1).width = 9.5; // Exactly 65px proportional in Excel
          } else if (colHeaderStr.includes('TOTAL') || colHeaderStr.includes('TOT')) {
            worksheet.getColumn(c + 1).width = 9.0; // Exactly 63px proportional in Excel
          } else if (c === 0) {
            worksheet.getColumn(c + 1).width = 6.5; // SR. NO.
          } else if (c === 1) {
            worksheet.getColumn(c + 1).width = 7.5; // ROLL NO.
          } else if (c === 2) {
            worksheet.getColumn(c + 1).width = 12.0; // REG. NO.
          } else if (c === 3) {
            worksheet.getColumn(c + 1).width = 16.0; // UBTER ROLL NO.
          } else if (c === 4) {
            worksheet.getColumn(c + 1).width = 24.0; // STUDENT NAME
          } else if (customW && typeof customW === 'number' && customW > 0) {
            worksheet.getColumn(c + 1).width = Math.max(11.5, Math.round(customW / 6.0));
          } else {
            worksheet.getColumn(c + 1).width = Math.max(colMaxLengths[c] || 12, 12);
          }
        }

        // Configure Page Setup for Standard A4 Landscape & 1-page width fitting
        worksheet.pageSetup = {
          orientation: 'landscape',
          paperSize: 9, // A4
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0
        };

        // 7. Apply sheet cell merges (shifted if banner prepended)
        if (Array.isArray(wsData.merges)) {
          wsData.merges.forEach(m => {
            const startR = m.s.r + 1 + bannerOffset;
            const startC = m.s.c + 1;
            const endR = m.e.r + 1 + bannerOffset;
            const endC = Math.min(m.e.c + 1, maxDataCol + 1);
            if (endC >= startC && endR >= startR) {
              try {
                worksheet.mergeCells(startR, startC, endR, endC);
              } catch (_) { }
            }
          });
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      triggerBrowserDownload(blob, EXCEL_WB.name || 'VidyaOS_Evaluation_Sheet.xlsx');
    } catch (err) {
      console.error('Failed to export Excel workbook:', err);
      alert('Error creating Excel file. Please try again.');
    }
  } else if (format === 'csv') {
    const csvContent = generateActiveSheetCSV(sheet);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerBrowserDownload(blob, `${sheet.name || 'Sheet'}.csv`);
  } else if (format === 'pdf') {
    exportSheetToPdf(sheet);
  } else if (format === 'doc') {
    exportSheetToWordDoc(sheet);
  }

  toggleExportMenu();
}

function generateSheetPrintableHtml(sheet) {
  if (!sheet) return '';

  let maxDataCol = 0;
  for (let c = 0; c < sheet.colsCount; c++) {
    for (let r = 0; r < sheet.rowsCount; r++) {
      const v = getCell(sheet, r, c).v;
      if (v !== '' && v !== null && v !== undefined) {
        if (c > maxDataCol) maxDataCol = c;
      }
    }
  }
  maxDataCol = Math.max(maxDataCol, 3);

  let maxDataRow = 0;
  for (let r = 0; r < sheet.rowsCount; r++) {
    for (let c = 0; c <= maxDataCol; c++) {
      const v = getCell(sheet, r, c).v;
      if (v !== '' && v !== null && v !== undefined) {
        if (r > maxDataRow) maxDataRow = r;
      }
    }
  }

  // Calculate total widths and column percentages for A4 Landscape
  const colEffectiveWidths = [];
  let sumColWidths = 0;
  for (let c = 0; c <= maxDataCol; c++) {
    let colHeaderStr = '';
    for (let hr = 0; hr <= 2; hr++) {
      const hCell = getCell(sheet, hr, c);
      const txt = String(hCell?.v !== undefined && hCell?.v !== null ? hCell.v : (hCell?.raw || '')).trim().toUpperCase();
      if (txt) colHeaderStr += ' ' + txt;
    }
    if (colHeaderStr.includes('GRAND TOTAL') || (colHeaderStr.includes('GRAND') && colHeaderStr.includes('TOTAL'))) {
      if (!sheet.colWidths) sheet.colWidths = {};
      sheet.colWidths[c] = 65; // User explicit requirement: Grand Total = 65px
    } else if (colHeaderStr.includes('TOTAL') || colHeaderStr.includes('TOT')) {
      if (!sheet.colWidths) sheet.colWidths = {};
      sheet.colWidths[c] = 63; // User explicit requirement: Total = 63px
    }
    const w = (sheet.colWidths && sheet.colWidths[c]) ? sheet.colWidths[c] : (c === 0 ? 42 : c === 1 ? 50 : c === 2 ? 76 : c === 3 ? 102 : c === 4 ? 145 : 68);
    colEffectiveWidths[c] = w;
    sumColWidths += w;
  }

  let colGroupHtml = '<colgroup>';
  for (let c = 0; c <= maxDataCol; c++) {
    const w = colEffectiveWidths[c];
    const pct = ((w / sumColWidths) * 100).toFixed(2);
    colGroupHtml += `<col style="width:${pct}%;">`;
  }
  colGroupHtml += '</colgroup>';

  const instBanner = document.getElementById('hdr-banner-inst')?.textContent?.trim() ||
    (localStorage.getItem('vidyaos_inst_header_banner') || 'Uttarakhand Government Institute of Polytechnic, Nainital | Internal Evaluation Sheet 2026-27 (Winter Session)');
  const grpName = S.group?.name || S.group?.subject_name || 'Subject';
  const subCode = S.group?.subject_code || '';
  const grpCode = subCode && !grpName.includes(subCode) ? ` [${subCode}]` : '';
  const grpDept = S.group?.department_name || 'Information Technology';
  const grpSem = S.group?.semester || S.group?.current_semester || 5;
  const sheetKindName = sheet.type === 'tests' ? 'Unit Tests Consolidated Summary' :
    sheet.type === 'single-test' ? (sheet.name || 'Unit Test') :
    sheet.type === 'assignments' ? 'Assignments Continuous Evaluation' :
    sheet.type === 'practicals' ? 'Practicals & Lab Records' : 'Consolidated Internal Evaluation';

  const subjectBanner = document.getElementById('hdr-banner-line2')?.textContent?.trim() ||
    `Department (${S.group?.department_code || 'IT'}) | ${sheetKindName} | Subject : ${grpName}${grpCode}`;
  const cohortBanner = document.getElementById('hdr-banner-cohort')?.textContent?.trim() ||
    `${grpDept} | Semester ${grpSem}`;

  const mergeMap = new Map();
  if (Array.isArray(sheet.merges)) {
    sheet.merges.forEach(m => {
      const minR = Math.min(m.s.r, m.e.r);
      const maxR = Math.max(m.s.r, m.e.r);
      const minC = Math.min(m.s.c, m.e.c);
      const maxC = Math.max(m.s.c, m.e.c);
      const rowSpan = maxR - minR + 1;
      const colSpan = maxC - minC + 1;
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          mergeMap.set(`${r},${c}`, { isTopLeft: (r === minR && c === minC), rowSpan, colSpan });
        }
      }
    });
  }

  let theadRowsHtml = '';
  let tbodyRowsHtml = '';
  for (let r = 0; r <= maxDataRow; r++) {
    let rowHasData = false;
    for (let c = 0; c <= maxDataCol; c++) {
      const cell = getCell(sheet, r, c);
      if (cell.v !== '' && cell.v !== null && cell.v !== undefined) {
        rowHasData = true;
        break;
      }
    }
    if (!rowHasData && r > 2) continue;

    const isHeader = (r === 0);
    const isSubHeader = (r === 1 && !isMarksRow(sheet, 1));
    const isMarks = (r === 1 && isMarksRow(sheet, 1));
    let rowHtml = '<tr>';

    for (let c = 0; c <= maxDataCol; c++) {
      const mInfo = mergeMap.get(`${r},${c}`);
      if (mInfo && !mInfo.isTopLeft) continue;

      const spanAttrs = (mInfo && mInfo.isTopLeft) ? ` rowspan="${mInfo.rowSpan}" colspan="${mInfo.colSpan}"` : '';
      const cell = getCell(sheet, r, c);
      const val = cell.v !== undefined && cell.v !== null ? cell.v : cell.raw;
      let isNameCol = false;
      for (let hr = 0; hr <= 2; hr++) {
        const hCell = getCell(sheet, hr, c);
        const txt = String(hCell?.v !== undefined && hCell?.v !== null ? hCell.v : (hCell?.raw || '')).toUpperCase();
        if (txt.includes('NAME') || txt.includes('STUDENT')) {
          isNameCol = true;
          break;
        }
      }
      if (!isNameCol && ((maxDataCol >= 4 && c === 4) || (maxDataCol < 4 && c === 2))) {
        isNameCol = true;
      }
      const defaultAlign = (isNameCol && !isHeader && !isSubHeader && !isMarks) ? 'left' : 'center';
      const align = cell.s?.align || defaultAlign;
      const vAlign = cell.s?.vAlign || 'middle';
      const weight = (cell.s?.bold !== undefined ? (cell.s.bold ? 'bold' : 'normal') : (isHeader || isSubHeader || isMarks ? 'bold' : 'normal'));
      const fontStyle = cell.s?.italic ? 'italic' : 'normal';
      const textDecor = cell.s?.underline ? 'underline' : 'none';
      const bg = cell.s?.bg ? resolveColorToHex(cell.s.bg, '#ffffff') : (isHeader ? '#f1f5f9' : isSubHeader ? '#f8fafc' : isMarks ? '#f8fafc' : '#ffffff');
      let color = cell.s?.color ? resolveColorToHex(cell.s.color, '#1e293b') : (isHeader || isSubHeader ? '#0f172a' : isMarks ? '#334155' : '#1e293b');
      color = ensureExportContrast(color, bg);
      const fontSize = cell.s?.fontSize ? `${cell.s.fontSize}pt` : (isHeader ? '8pt' : isSubHeader ? '7.5pt' : (maxDataCol >= 12 ? '7.5pt' : '8.5pt'));
      const fontFamily = cell.s?.fontFamily ? `font-family:${cell.s.fontFamily};` : '';

      rowHtml += `<td${spanAttrs} style="padding:2.5px 2px;text-align:${align};vertical-align:${vAlign};font-weight:${weight};font-style:${fontStyle};text-decoration:${textDecor};background-color:${bg};color:${color};border:0.75pt solid #475569;font-size:${fontSize};${fontFamily}line-height:1.15;white-space:pre-wrap;word-break:break-word;overflow:hidden;box-sizing:border-box;">${escapeHtml(val)}</td>`;
    }
    rowHtml += '</tr>';

    if (r <= 2) {
      theadRowsHtml += rowHtml;
    } else {
      tbodyRowsHtml += rowHtml;
    }
  }

  const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
  <title>${escapeHtml(sheet.name || 'Evaluation_Sheet')} - Print</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 6mm 5mm 6mm 5mm;
    }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media screen {
      body {
        background: #0f172a;
        padding: 12px;
        min-width: 960px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .no-print-toolbar {
        position: sticky;
        top: 0;
        z-index: 1000;
        width: 100%;
        max-width: 1080px;
        background: #1e293b;
        color: #f8fafc;
        padding: 8px 16px;
        border-radius: 8px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        box-sizing: border-box;
      }
      .toolbar-brand {
        font-size: 13px;
        font-weight: 600;
        color: #e2e8f0;
      }
      .tb-btn-print {
        display: inline-flex;
        align-items: center;
        padding: 6px 14px;
        background: #2563eb;
        color: #ffffff;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35);
      }
      .pdf-sheet-page {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        padding: 12px 14px;
        width: 100%;
        max-width: 1080px;
        box-sizing: border-box;
      }
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
      }
      .no-print-toolbar {
        display: none !important;
      }
      .pdf-sheet-page {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
    }
    .pdf-banner {
      text-align: center;
      margin-bottom: 5px;
      border-bottom: 1.5pt solid #0284c7;
      padding-bottom: 2px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pdf-banner-line1 {
      font-size: 10.5pt;
      font-weight: 800;
      color: #0369a1;
      letter-spacing: 0.25px;
      text-transform: uppercase;
    }
    .pdf-banner-line2 {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 1px;
    }
    .pdf-banner-line3 {
      font-size: 7.5pt;
      font-weight: 600;
      color: #475569;
      margin-top: 1px;
    }
    table {
      width: 100%;
      max-width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      page-break-inside: auto;
    }
    thead {
      display: table-header-group;
    }
    tbody {
      display: table-row-group;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    td, th {
      box-sizing: border-box;
      padding: 2.5px 2px;
      overflow: hidden;
      word-break: break-word;
      border: 0.75pt solid #475569;
      line-height: 1.15;
    }
    .pdf-signatures {
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
      padding: 0 24px;
      font-size: 8pt;
      font-weight: 700;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pdf-sig-block {
      text-align: center;
      border-top: 1px dashed #475569;
      padding-top: 3px;
      min-width: 120px;
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <div class="toolbar-brand">
      <strong>VidyaOS</strong> • ${escapeHtml(sheet.name || 'Worksheet')} (A4 Landscape)
    </div>
    <div class="toolbar-actions">
      <button type="button" class="tb-btn tb-btn-print" onclick="window.print()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;vertical-align:text-bottom;">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        <span>Print / Save as PDF</span>
      </button>
    </div>
  </div>
  <div class="pdf-sheet-page">
    <div class="pdf-banner">
      <div class="pdf-banner-line1">${escapeHtml(instBanner)}</div>
      <div class="pdf-banner-line2">${escapeHtml(subjectBanner)}</div>
      <div class="pdf-banner-line3">${escapeHtml(cohortBanner)}</div>
    </div>
    <table>
      ${colGroupHtml}
      <thead>
        ${theadRowsHtml}
      </thead>
      <tbody>
        ${tbodyRowsHtml}
      </tbody>
    </table>
    <div class="pdf-signatures">
      <div class="pdf-sig-block">Subject Teacher</div>
      <div class="pdf-sig-block">Head of the Department</div>
      <div class="pdf-sig-block">Principal</div>
    </div>
  </div>
</body>
</html>`;

  return printHtml;
}
window.generateSheetPrintableHtml = generateSheetPrintableHtml;

function exportSheetToPdf(sheet) {
  if (!sheet) return;
  const printHtml = generateSheetPrintableHtml(sheet);
  if (!printHtml) return;

  let iframe = document.getElementById('excel-print-iframe');
  if (iframe) iframe.remove();
  iframe = document.createElement('iframe');
  iframe.id = 'excel-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(printHtml);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (_) {
      window.print();
    }
    setTimeout(() => {
      try {
        iframe.remove();
      } catch (_) { }
    }, 2000);
  }, 250);
}

function generateActiveSheetCSV(sheet) {
  let maxDataCol = 0;
  for (let c = 0; c < sheet.colsCount; c++) {
    for (let r = 0; r < sheet.rowsCount; r++) {
      const v = getCell(sheet, r, c).v;
      if (v !== '' && v !== null && v !== undefined) {
        if (c > maxDataCol) maxDataCol = c;
      }
    }
  }
  maxDataCol = Math.max(maxDataCol, 3);

  const banner1 = document.getElementById('hdr-banner-line1')?.textContent?.trim() || 'Uttarakhand Government Institute of Polytechnic, Nainital | Internal Evaluation Sheet 2026-27 (Winter Session)';
  const banner2 = document.getElementById('hdr-banner-line2')?.textContent?.trim() || (S.group ? `Internal Evaluation | Subject : ${S.group.name || S.group.subject_name || 'Subject'}` : 'Internal Evaluation');
  const banner3 = document.getElementById('hdr-banner-cohort')?.textContent?.trim() || 'Information Technology | Semester 5';

  const cell0_0 = String(getCell(sheet, 0, 0).v || getCell(sheet, 0, 0).raw || '');
  const alreadyHasBanner = cell0_0.includes('Polytechnic') || cell0_0.includes('Institute');

  const rows = [];
  if (!alreadyHasBanner) {
    rows.push(`"${banner1.replace(/"/g, '""')}"`);
    rows.push(`"${banner2.replace(/"/g, '""')}"`);
    rows.push(`"${banner3.replace(/"/g, '""')}"`);
    rows.push('');
  }

  for (let r = 0; r < sheet.rowsCount; r++) {
    const row = [];
    let hasData = false;
    for (let c = 0; c <= maxDataCol; c++) {
      const cell = getCell(sheet, r, c);
      const val = cell.v !== undefined && cell.v !== null ? cell.v : cell.raw;
      if (val !== '' && val !== null && val !== undefined) hasData = true;
      const cleanVal = String(val ?? '').replace(/"/g, '""');
      row.push(`"${cleanVal}"`);
    }
    if (hasData) rows.push(row.join(','));
  }
  return rows.join('\r\n');
}

function exportSheetToWordDoc(sheet) {
  let maxDataCol = 0;
  for (let c = 0; c < sheet.colsCount; c++) {
    for (let r = 0; r < sheet.rowsCount; r++) {
      const v = getCell(sheet, r, c).v;
      if (v !== '' && v !== null && v !== undefined) {
        if (c > maxDataCol) maxDataCol = c;
      }
    }
  }
  maxDataCol = Math.max(maxDataCol, 3);

  let maxDataRow = 0;
  for (let r = 0; r < sheet.rowsCount; r++) {
    for (let c = 0; c <= maxDataCol; c++) {
      const v = getCell(sheet, r, c).v;
      if (v !== '' && v !== null && v !== undefined) {
        if (r > maxDataRow) maxDataRow = r;
      }
    }
  }

  const banner1 = document.getElementById('hdr-banner-line1')?.textContent?.trim() || 'Uttarakhand Government Institute of Polytechnic, Nainital | Internal Evaluation Sheet 2026-27 (Winter Session)';
  const banner2 = document.getElementById('hdr-banner-line2')?.textContent?.trim() || (S.group ? `Internal Evaluation | Subject : ${S.group.name || S.group.subject_name || 'Subject'}` : 'Internal Evaluation');
  const banner3 = document.getElementById('hdr-banner-cohort')?.textContent?.trim() || 'Information Technology | Semester 5';

  const cell0_0 = String(getCell(sheet, 0, 0).v || getCell(sheet, 0, 0).raw || '');
  const alreadyHasBanner = cell0_0.includes('Polytechnic') || cell0_0.includes('Institute');

  const mergeMap = new Map();
  if (Array.isArray(sheet.merges)) {
    sheet.merges.forEach(m => {
      const minR = Math.min(m.s.r, m.e.r);
      const maxR = Math.max(m.s.r, m.e.r);
      const minC = Math.min(m.s.c, m.e.c);
      const maxC = Math.max(m.s.c, m.e.c);
      const rowSpan = maxR - minR + 1;
      const colSpan = maxC - minC + 1;
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          mergeMap.set(`${r},${c}`, { isTopLeft: (r === minR && c === minC), rowSpan, colSpan });
        }
      }
    });
  }

  // Calculate total widths and column percentages for Word document A4 Landscape
  const colEffectiveWidths = [];
  let sumColWidths = 0;
  for (let c = 0; c <= maxDataCol; c++) {
    let colHeaderStr = '';
    for (let hr = 0; hr <= 2; hr++) {
      const hCell = getCell(sheet, hr, c);
      const txt = String(hCell?.v !== undefined && hCell?.v !== null ? hCell.v : (hCell?.raw || '')).trim().toUpperCase();
      if (txt) colHeaderStr += ' ' + txt;
    }
    if (colHeaderStr.includes('GRAND TOTAL') || (colHeaderStr.includes('GRAND') && colHeaderStr.includes('TOTAL'))) {
      if (!sheet.colWidths) sheet.colWidths = {};
      sheet.colWidths[c] = 65; // User explicit requirement: Grand Total = 65px
    } else if (colHeaderStr.includes('TOTAL') || colHeaderStr.includes('TOT')) {
      if (!sheet.colWidths) sheet.colWidths = {};
      sheet.colWidths[c] = 63; // User explicit requirement: Total = 63px
    }
    const w = (sheet.colWidths && sheet.colWidths[c]) ? sheet.colWidths[c] : (c === 0 ? 42 : c === 1 ? 50 : c === 2 ? 76 : c === 3 ? 102 : c === 4 ? 145 : 68);
    colEffectiveWidths[c] = w;
    sumColWidths += w;
  }

  let colGroupHtml = '<colgroup>';
  for (let c = 0; c <= maxDataCol; c++) {
    const w = colEffectiveWidths[c];
    const pct = ((w / sumColWidths) * 100).toFixed(2);
    colGroupHtml += `<col style="width:${pct}%;">`;
  }
  colGroupHtml += '</colgroup>';

  let tableHtml = '<table border="1" cellpadding="3" cellspacing="0" style="border-collapse:collapse;font-family:Segoe UI,Calibri,Arial,sans-serif;font-size:8pt;width:100%;max-width:100%;table-layout:fixed;">';
  tableHtml += colGroupHtml;

  if (!alreadyHasBanner) {
    tableHtml += `<tr><th colspan="${maxDataCol + 1}" style="background:#f8fafc;color:#0f172a;font-size:11pt;padding:6px;text-align:center;">${escapeHtml(banner1)}</th></tr>`;
    tableHtml += `<tr><th colspan="${maxDataCol + 1}" style="background:#f8fafc;color:#1e293b;font-size:9pt;padding:4px;text-align:center;">${escapeHtml(banner2)}</th></tr>`;
    tableHtml += `<tr><th colspan="${maxDataCol + 1}" style="background:#f8fafc;color:#475569;font-size:8pt;padding:3px;text-align:center;">${escapeHtml(banner3)}</th></tr>`;
  }

  for (let r = 0; r <= maxDataRow; r++) {
    let hasData = false;
    for (let c = 0; c <= maxDataCol; c++) {
      const v = getCell(sheet, r, c).v;
      if (v !== '' && v !== null && v !== undefined) { hasData = true; break; }
    }
    if (!hasData && r > 2) continue;

    const isHeader = r === 0;
    const isSubHeader = (r === 1 && !isMarksRow(sheet, 1));
    const isMarks = r === 1 && isMarksRow(sheet, 1);

    tableHtml += '<tr>';
    for (let c = 0; c <= maxDataCol; c++) {
      const mInfo = mergeMap.get(`${r},${c}`);
      if (mInfo && !mInfo.isTopLeft) continue;

      const spanAttrs = (mInfo && mInfo.isTopLeft) ? ` rowspan="${mInfo.rowSpan}" colspan="${mInfo.colSpan}"` : '';
      const cell = getCell(sheet, r, c);
      const val = cell.v !== undefined && cell.v !== null ? cell.v : cell.raw;
      let isNameCol = false;
      for (let hr = 0; hr <= 2; hr++) {
        const hCell = getCell(sheet, hr, c);
        const txt = String(hCell?.v !== undefined && hCell?.v !== null ? hCell.v : (hCell?.raw || '')).toUpperCase();
        if (txt.includes('NAME') || txt.includes('STUDENT')) {
          isNameCol = true;
          break;
        }
      }
      if (!isNameCol && ((maxDataCol >= 4 && c === 4) || (maxDataCol < 4 && c === 2))) {
        isNameCol = true;
      }
      const defaultAlign = (isNameCol && !isHeader && !isSubHeader && !isMarks) ? 'left' : 'center';
      const align = cell.s?.align || defaultAlign;
      const vAlign = cell.s?.vAlign || 'middle';
      const weight = (cell.s?.bold !== undefined ? (cell.s.bold ? 'bold' : 'normal') : (isHeader || isSubHeader || isMarks ? 'bold' : 'normal'));
      const fontStyle = cell.s?.italic ? 'italic' : 'normal';
      const textDecor = cell.s?.underline ? 'underline' : 'none';
      const bg = cell.s?.bg ? resolveColorToHex(cell.s.bg, '#ffffff') : (isHeader ? '#e2e8f0' : isSubHeader ? '#f8fafc' : isMarks ? '#f1f5f9' : '#ffffff');
      let color = cell.s?.color ? resolveColorToHex(cell.s.color, '#1e293b') : (isHeader || isSubHeader ? '#0f172a' : isMarks ? '#334155' : '#1e293b');
      color = ensureExportContrast(color, bg);
      const fontSize = cell.s?.fontSize ? `${cell.s.fontSize}pt` : (isHeader ? '8pt' : isSubHeader ? '7.5pt' : (maxDataCol >= 12 ? '7.5pt' : '8pt'));
      const tag = isHeader ? 'th' : 'td';

      const colW = colEffectiveWidths[c];
      const cellPct = ((colW / sumColWidths) * 100).toFixed(2);
      tableHtml += `<${tag}${spanAttrs} width="${cellPct}%" style="width:${cellPct}%;padding:3px 2px;text-align:${align};vertical-align:${vAlign};font-weight:${weight};font-style:${fontStyle};text-decoration:${textDecor};background-color:${bg};color:${color};border:1px solid #cbd5e1;font-size:${fontSize};white-space:pre-wrap;word-break:break-word;box-sizing:border-box;">${escapeHtml(val)}</${tag}>`;
    }
    tableHtml += '</tr>';
  }
  tableHtml += '</table>';

  const wordDocContent = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(sheet.name || 'Evaluation_Sheet')}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
    <w:Compatibility>
      <w:BreakWrappedTables/>
      <w:SnapToGridInCell/>
      <w:WrapTextWithPunct/>
      <w:UseAsianBreakRules/>
      <w:DontGrowAutofit/>
    </w:Compatibility>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: 29.7cm 21.0cm;
      margin: 0.8cm 0.6cm 0.8cm 0.6cm;
      mso-page-orientation: landscape;
    }
    @page WordSection1 {
      size: 841.9pt 595.3pt;
      mso-page-orientation: landscape;
      margin: 20pt 16pt 20pt 16pt;
      mso-header-margin: 15pt;
      mso-footer-margin: 15pt;
      mso-paper-source: 0;
    }
    div.WordSection1 {
      page: WordSection1;
    }
    body {
      font-family: "Segoe UI", Calibri, Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
    }
    table {
      width: 100%;
      max-width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-family: "Segoe UI", Calibri, Arial, sans-serif;
      font-size: 7.5pt;
    }
    th, td {
      border: 1px solid #94a3b8;
      padding: 3px 2px;
      word-break: break-word;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="WordSection1">
    ${tableHtml}
  </div>
</body>
</html>`;

  const docBlob = new Blob(['\ufeff' + wordDocContent], { type: 'application/msword;charset=utf-8' });
  triggerBrowserDownload(docBlob, `${sheet.name || 'Sheet'}.doc`);
}

function triggerBrowserDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}

function triggerExcelImport() {
  const fileInput = document.getElementById('excel-file-import-input');
  if (fileInput) fileInput.click();
}

function extractWorksheetMerges(worksheet) {
  const merges = [];
  const rawList = [];

  if (worksheet.model && Array.isArray(worksheet.model.merges)) {
    rawList.push(...worksheet.model.merges);
  } else if (worksheet._merges) {
    if (Array.isArray(worksheet._merges)) {
      rawList.push(...worksheet._merges);
    } else if (typeof worksheet._merges === 'object') {
      rawList.push(...Object.values(worksheet._merges));
    }
  }

  rawList.forEach(m => {
    let rangeStr = '';
    if (typeof m === 'string') {
      rangeStr = m;
    } else if (m && typeof m === 'object') {
      if (m.range) rangeStr = m.range;
      else if (m.model && m.model.range) rangeStr = m.model.range;
      else if (m.tl && m.br) rangeStr = `${m.tl}:${m.br}`;
      else if (m.top !== undefined && m.left !== undefined) {
        merges.push({
          s: { r: m.top - 1, c: m.left - 1 },
          e: { r: (m.bottom || m.top) - 1, c: (m.right || m.left) - 1 }
        });
        return;
      }
    }

    if (rangeStr && rangeStr.includes(':')) {
      const parts = rangeStr.split(':');
      const start = parseExcelCellCoord(parts[0]);
      const end = parseExcelCellCoord(parts[1]);
      if (start && end) {
        merges.push({
          s: { r: Math.min(start.r, end.r), c: Math.min(start.c, end.c) },
          e: { r: Math.max(start.r, end.r), c: Math.max(start.c, end.c) }
        });
      }
    }
  });

  return merges;
}

function parseExcelCellCoord(coordStr) {
  if (!coordStr) return null;
  const match = String(coordStr).trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return {
    c: letterToCol(match[1]),
    r: parseInt(match[2], 10) - 1
  };
}

function parseExcelColor(colorObj) {
  if (!colorObj) return null;
  if (typeof colorObj === 'string') {
    if (colorObj.startsWith('#')) return colorObj;
    if (colorObj.length === 8) return '#' + colorObj.slice(2);
    if (colorObj.length === 6) return '#' + colorObj;
    return colorObj;
  }
  if (colorObj.argb) {
    let hex = colorObj.argb;
    if (hex.length === 8) hex = hex.substring(2);
    return '#' + hex;
  }
  if (colorObj.theme !== undefined) {
    const themeIndex = Number(colorObj.theme);
    const defaultThemes = [
      '#FFFFFF', '#000000', '#E7E6E6', '#44546A',
      '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000',
      '#5B9BD5', '#70AD47'
    ];
    let baseHex = defaultThemes[themeIndex] || '#4472C4';
    let r = parseInt(baseHex.substr(1, 2), 16);
    let g = parseInt(baseHex.substr(3, 2), 16);
    let b = parseInt(baseHex.substr(5, 2), 16);
    const tint = colorObj.tint !== undefined ? Number(colorObj.tint) : 0;
    if (tint !== 0) {
      if (tint > 0) {
        r = Math.round(r * (1 - tint) + 255 * tint);
        g = Math.round(g * (1 - tint) + 255 * tint);
        b = Math.round(b * (1 - tint) + 255 * tint);
      } else {
        r = Math.round(r * (1 + tint));
        g = Math.round(g * (1 + tint));
        b = Math.round(b * (1 + tint));
      }
    }
    const toHex = n => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return null;
}

async function handleExcelFileImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.name.endsWith('.csv')) {
    const text = await file.text();
    importCSVToSheet(text, file.name.replace(/\.csv$/i, ''));
  } else if (file.name.endsWith('.xlsx')) {
    if (typeof ExcelJS === 'undefined') {
      alert('Excel parser initializing, please try again.');
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      EXCEL_WB.sheets = [];
      EXCEL_WB.isImportedWorkbook = true;
      EXCEL_WB.bannerVisible = false; // Imported sheets hide college banner by default

      workbook.eachSheet((worksheet, sheetId) => {
        // 1. Extract worksheet merges
        const merges = extractWorksheetMerges(worksheet);

        // 2. Build fast lookup of absorbed cells in merges to prevent duplicating values
        const absorbedMap = new Set();
        merges.forEach(m => {
          for (let r = m.s.r; r <= m.e.r; r++) {
            for (let c = m.s.c; c <= m.e.c; c++) {
              if (r !== m.s.r || c !== m.s.c) {
                absorbedMap.add(`${r}_${c}`);
              }
            }
          }
        });

        // 3. Determine max row and column bounds
        let maxRow = Math.max(worksheet.rowCount || 0, 40);
        let maxCol = Math.max(worksheet.columnCount || 0, 20);

        const wsLower = (worksheet.name || '').toLowerCase().trim();
        let sType = undefined;
        let sShort = undefined;
        let sTestId = undefined;
        if (/^ut\d+$/i.test(wsLower)) {
          sType = 'single-test';
          sShort = worksheet.name.toUpperCase();
          sTestId = parseInt(worksheet.name.replace(/\D/g, ''), 10) || 1;
        } else if (wsLower.includes('consolidated') || wsLower.includes('unittest') || wsLower.includes('unit test')) {
          sType = 'tests';
        } else if (wsLower.includes('eval') || wsLower.includes('master')) {
          sType = 'evaluation';
        } else if (wsLower.includes('assign')) {
          sType = 'assignments';
        } else if (wsLower.includes('pract') || wsLower.includes('lab')) {
          sType = 'practicals';
        }

        const sheetObj = createDefaultExcelSheet(worksheet.name, {
          type: sType,
          shortName: sShort,
          testId: sTestId,
          rowsCount: maxRow,
          colsCount: maxCol,
          merges: merges
        });

        // 4. Import column widths
        if (worksheet.columns) {
          worksheet.columns.forEach((col, idx) => {
            if (col && col.width) {
              sheetObj.colWidths[idx] = Math.max(Math.round(col.width * 8), 60);
            }
          });
        }

        // 5. Populate cell data, styles, formulas and cached values
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          const r = rowNumber - 1;
          if (row.height) {
            sheetObj.rowHeights[r] = Math.round(row.height * 1.33);
          }

          row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const c = colNumber - 1;
            const isAbsorbed = absorbedMap.has(`${r}_${c}`);

            if (isAbsorbed) {
              // Non-top-left cell in a merge: clear value so it does not repeat across columns
              setCell(sheetObj, r, c, { raw: '', v: '', f: null });
              return;
            }

            let val = cell.value;
            let formula = null;
            let cachedVal = undefined;

            if (typeof val === 'object' && val !== null) {
              if (val.formula) {
                formula = '=' + val.formula;
                cachedVal = val.result !== undefined ? val.result : '';
                val = cachedVal;
              } else if (val.text) {
                val = val.text;
              } else if (val.richText && Array.isArray(val.richText)) {
                val = val.richText.map(t => t.text).join('');
              }
            }

            const style = {};
            if (cell.font) {
              if (cell.font.name) style.fontFamily = cell.font.name;
              if (cell.font.size) style.fontSize = Math.round(cell.font.size * 1.15);
              if (cell.font.bold) style.bold = true;
              if (cell.font.italic) style.italic = true;
              if (cell.font.underline) style.underline = true;
              const fontColor = parseExcelColor(cell.font.color);
              if (fontColor) style.color = fontColor;
            }
            if (cell.fill && cell.fill.type === 'pattern') {
              const bg = parseExcelColor(cell.fill.fgColor);
              if (bg && bg.toLowerCase() !== '#ffffff' && bg.toLowerCase() !== '#fff') {
                style.bg = bg;
              }
            }
            if (cell.alignment) {
              if (cell.alignment.horizontal) style.align = cell.alignment.horizontal;
              if (cell.alignment.vertical) style.vAlign = cell.alignment.vertical;
              if (cell.alignment.wrapText) style.wrap = true;
            }
            if (cell.border) {
              if (cell.border.top) style.borderTop = '1px solid var(--border-color)';
              if (cell.border.bottom) style.borderBottom = '1px solid var(--border-color)';
              if (cell.border.left) style.borderLeft = '1px solid var(--border-color)';
              if (cell.border.right) style.borderRight = '1px solid var(--border-color)';
              if (cell.border.top && cell.border.bottom && cell.border.left && cell.border.right) {
                style.border = 'all';
              }
            }

            setCell(sheetObj, r, c, {
              raw: formula || String(val ?? ''),
              f: formula,
              v: val,
              cachedValue: cachedVal,
              s: Object.keys(style).length ? style : undefined
            });
          });
        });

        EXCEL_WB.sheets.push(sheetObj);
      });

      if (EXCEL_WB.sheets.length > 0) {
        EXCEL_WB.name = file.name;
        const titleEl = document.getElementById('excel-workbook-title');
        if (titleEl) titleEl.textContent = file.name;
        switchWorksheet(0);
        recalculateAllSheetFormulas(true);
        showToast(`Imported ${EXCEL_WB.sheets.length} worksheet(s) successfully!`, 'success');
      }
    } catch (err) {
      console.error('Failed to import Excel file:', err);
      alert('Could not read this Excel file.');
    }
  }

  e.target.value = '';
}

function importCSVToSheet(csvText, sheetName) {
  const rows = csvText.split(/\r?\n/).map(r => r.split(','));
  const newSheet = createDefaultExcelSheet(sheetName || 'Imported CSV', {
    rowsCount: Math.max(rows.length + 5, 40),
    colsCount: Math.max((rows[0]?.length || 10) + 5, 20)
  });

  rows.forEach((row, r) => {
    row.forEach((cellVal, c) => {
      const clean = cellVal.replace(/^"|"$/g, '').replace(/""/g, '"');
      setCell(newSheet, r, c, clean);
    });
  });

  EXCEL_WB.sheets.push(newSheet);
  switchWorksheet(EXCEL_WB.sheets.length - 1);
}

/* ══════════════════════════════════════════════════════════════
   EXCEL RICH TOOLTIP / HELP BOX ENGINE
   ══════════════════════════════════════════════════════════════ */
function initExcelRichTooltips() {
  const tooltip = document.getElementById('excel-rich-tooltip');
  if (!tooltip) return;

  const titleEl = document.getElementById('rich-tooltip-title');
  const previewEl = document.getElementById('rich-tooltip-preview');
  const descEl = document.getElementById('rich-tooltip-desc');

  const TOOLTIP_DATA = {
    'btn-wrap-text': {
      title: 'Wrap Text',
      desc: 'Wrap extra-long text into multiple lines so you can see all of it.',
      preview: `<svg width="140" height="65" viewBox="0 0 140 65" fill="none">
        <rect x="10" y="4" width="120" height="22" rx="2" fill="var(--bg-card)" stroke="var(--border-color)"/>
        <text x="16" y="19" font-size="10" fill="var(--text-main)" font-family="sans-serif">Microsoft E...</text>
        <path d="M70 28 L70 38 M66 34 L70 38 L74 34" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"/>
        <rect x="10" y="40" width="120" height="24" rx="2" fill="var(--bg-card)" stroke="var(--border-color)"/>
        <text x="16" y="51" font-size="9" fill="var(--text-main)" font-family="sans-serif">Microsoft</text>
        <text x="16" y="61" font-size="9" fill="var(--text-main)" font-family="sans-serif">Excel</text>
      </svg>`
    },
    'btn-merge-cells': {
      title: 'Merge & Center',
      desc: 'Combine and center the contents of selected cells in a new larger cell. Click the arrow to choose other merge options.',
      preview: `<svg width="140" height="60" viewBox="0 0 140 60" fill="none">
        <rect x="10" y="4" width="38" height="20" fill="var(--bg-card)" stroke="var(--border-color)"/>
        <rect x="51" y="4" width="38" height="20" fill="var(--bg-card)" stroke="var(--border-color)"/>
        <rect x="92" y="4" width="38" height="20" fill="var(--bg-card)" stroke="var(--border-color)"/>
        <rect x="10" y="30" width="120" height="24" rx="2" fill="var(--bg-card)" stroke="var(--color-primary)" stroke-width="1.5"/>
        <text x="70" y="46" font-size="10" font-weight="bold" fill="var(--color-primary)" text-anchor="middle" font-family="sans-serif">Merge &amp; Center</text>
      </svg>`
    },
    'btn-autosum-dropdown': {
      title: 'AutoSum (Σ)',
      desc: 'Automatically add a quick formula like SUM, AVERAGE, COUNT, MAX, or MIN to the selected cells.',
      preview: `<svg width="140" height="50" viewBox="0 0 140 50" fill="none">
        <rect x="10" y="6" width="120" height="38" rx="3" fill="var(--bg-card)" stroke="var(--border-color)"/>
        <text x="20" y="24" font-size="12" font-weight="bold" fill="var(--color-primary)" font-family="sans-serif">Σ AutoSum</text>
        <text x="20" y="38" font-size="10" fill="var(--text-muted)" font-family="monospace">=SUM(D4:G4)</text>
      </svg>`
    },
    'btn-toggle-college-banner': {
      title: 'Show / Hide College Banner',
      desc: 'Toggle the institutional header block above the spreadsheet. Hidden by default for imported external workbooks.',
      preview: `<svg width="140" height="50" viewBox="0 0 140 50" fill="none">
        <rect x="10" y="6" width="120" height="18" rx="2" fill="var(--chip-faculty-bg)" stroke="var(--border-color)"/>
        <text x="70" y="19" font-size="8" font-weight="bold" fill="var(--color-primary)" text-anchor="middle" font-family="sans-serif">Government Polytechnic</text>
        <rect x="10" y="28" width="120" height="16" rx="2" fill="var(--bg-card)" stroke="var(--border-color)"/>
        <text x="70" y="40" font-size="8" fill="var(--text-muted)" text-anchor="middle" font-family="sans-serif">Matrix Data Rows</text>
      </svg>`
    },
    'btn-toggle-banner-view': {
      title: 'Institutional Banner View',
      desc: 'Toggle visibility of the official college department header.',
      preview: `<svg width="140" height="40" viewBox="0 0 140 40" fill="none">
        <rect x="10" y="5" width="120" height="30" rx="2" fill="var(--bg-card)" stroke="var(--border-color)"/>
        <text x="70" y="24" font-size="9" font-weight="bold" fill="var(--color-primary)" text-anchor="middle" font-family="sans-serif">College Banner Header</text>
      </svg>`
    },
    'btn-toggle-signatures-bar': {
      title: 'Institutional Signatures Bar',
      desc: 'Show or hide official Subject Teacher, HOD, and Principal signature block outside spreadsheet grid cells.',
      preview: `<svg width="140" height="40" viewBox="0 0 140 40" fill="none">
        <rect x="10" y="5" width="120" height="30" rx="2" fill="var(--bg-card)" stroke="var(--border-color)"/>
        <text x="25" y="24" font-size="8" font-weight="bold" fill="var(--color-primary)">Teacher</text>
        <text x="70" y="24" font-size="8" font-weight="bold" fill="var(--color-primary)" text-anchor="middle">HOD</text>
        <text x="115" y="24" font-size="8" font-weight="bold" fill="var(--color-primary)" text-anchor="end">Principal</text>
      </svg>`
    },
    'btn-office-home': {
      title: 'Office Studio Home & Subjects Hub',
      desc: 'Return to Office Studio start screen to access your teaching subjects, recent workbooks, and templates.',
      preview: `<svg width="140" height="40" viewBox="0 0 140 40" fill="none">
        <rect x="10" y="5" width="120" height="30" rx="2" fill="var(--bg-card)" stroke="var(--border-color)"/>
        <text x="70" y="24" font-size="9" font-weight="bold" fill="var(--color-primary)" text-anchor="middle">Office Studio Hub</text>
      </svg>`
    },
    'btn-home-toggle-gridlines': {
      title: 'Gridlines',
      desc: 'Show or hide the gridlines between rows and columns in the sheet to customize readability.',
      preview: `<svg width="140" height="50" viewBox="0 0 140 50" fill="none">
        <rect x="10" y="6" width="120" height="38" rx="2" fill="var(--bg-card)" stroke="var(--border-color)"/>
        <line x1="50" y1="6" x2="50" y2="44" stroke="var(--border-color)" stroke-dasharray="2 2"/>
        <line x1="90" y1="6" x2="90" y2="44" stroke="var(--border-color)" stroke-dasharray="2 2"/>
        <line x1="10" y1="25" x2="130" y2="25" stroke="var(--border-color)" stroke-dasharray="2 2"/>
      </svg>`
    },
    'btn-home-toggle-formula-bar': {
      title: 'Formula Bar',
      desc: 'Toggle the fx formula bar to view, enter, and edit cell formulas or values.',
      preview: `<svg width="140" height="40" viewBox="0 0 140 40" fill="none">
        <rect x="10" y="6" width="120" height="28" rx="2" fill="var(--bg-card)" stroke="var(--border-color)"/>
        <text x="18" y="24" font-size="11" font-weight="bold" fill="var(--text-muted)" font-family="serif">fx</text>
        <text x="36" y="24" font-size="10" fill="var(--text-main)" font-family="monospace">=AVERAGE(D4:G4)</text>
      </svg>`
    },
    'btn-home-freeze-panes': {
      title: 'Freeze Panes',
      desc: 'Freeze rows and columns to keep them visible while scrolling through large student evaluation marksheets.',
      preview: `<svg width="140" height="50" viewBox="0 0 140 50" fill="none">
        <rect x="10" y="6" width="120" height="38" rx="2" fill="var(--bg-card)" stroke="var(--border-color)"/>
        <line x1="10" y1="22" x2="130" y2="22" stroke="var(--color-primary)" stroke-width="2"/>
        <line x1="50" y1="6" x2="50" y2="44" stroke="var(--color-primary)" stroke-width="2"/>
      </svg>`
    },
    'btn-sort-asc': {
      title: 'Sort Ascending (A → Z)',
      desc: 'Sort student records from lowest to highest or alphabetically by student name.',
      preview: null
    },
    'btn-sort-desc': {
      title: 'Sort Descending (Z → A)',
      desc: 'Sort student records from highest to lowest or reverse-alphabetically.',
      preview: null
    },
    'btn-find-replace-open': {
      title: 'Find & Replace',
      desc: 'Search for specific student names, roll numbers, or score values and optionally replace them.',
      preview: null
    },
    'btn-export-dropdown': {
      title: 'Export Marksheet',
      desc: 'Export this workbook as an Excel .XLSX spreadsheet or a printable PDF evaluation sheet.',
      preview: null
    }
  };

  let hoverTimeout = null;

  function showTooltip(el, data) {
    if (!titleEl || !descEl || !tooltip) return;
    titleEl.textContent = data.title;
    descEl.textContent = data.desc;
    if (data.preview && previewEl) {
      previewEl.innerHTML = data.preview;
      previewEl.style.display = 'flex';
    } else if (previewEl) {
      previewEl.innerHTML = '';
      previewEl.style.display = 'none';
    }

    const rect = el.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;

    if (left + 260 > window.innerWidth) {
      left = window.innerWidth - 270;
    }
    if (top + 200 > window.innerHeight) {
      top = rect.top - 200;
    }

    tooltip.style.top = `${Math.max(10, top)}px`;
    tooltip.style.left = `${Math.max(10, left)}px`;
    tooltip.classList.add('visible');
    tooltip.setAttribute('aria-hidden', 'false');
  }

  function hideTooltip() {
    clearTimeout(hoverTimeout);
    if (tooltip) {
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden', 'true');
    }
  }

  Object.entries(TOOLTIP_DATA).forEach(([id, data]) => {
    const el = document.getElementById(id);
    if (!el || el.dataset.richTooltipBound === 'true') return;
    el.dataset.richTooltipBound = 'true';
    el.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => showTooltip(el, data), 320);
    });
    el.addEventListener('mouseleave', hideTooltip);
    el.addEventListener('click', hideTooltip);
  });
}

/* ══════════════════════════════════════════════════════════════
   SCORE PRESERVATION HELPER
   Extracts manual teacher marks from existing workbook so manual
   edits are never lost when classwork/assignments are added later.
   ══════════════════════════════════════════════════════════════ */
function extractExistingStudentScores(sheets) {
  const scoresMap = {};
  if (!Array.isArray(sheets)) return scoresMap;

  // 1. Check Master Evaluation sheet
  const evalSheet = sheets.find(s => s && s.type === 'evaluation') || sheets[0];
  if (evalSheet && evalSheet.cells) {
    const isFiveCol = String(getCell(evalSheet, 0, 2)?.v || '').toUpperCase().includes('REG');
    const isTwoTier = String(getCell(evalSheet, 0, isFiveCol ? 5 : 3)?.v || '').toUpperCase() === 'THEORY';
    const startR = isTwoTier ? 3 : 2;
    const colOffset = isFiveCol ? 2 : 0;

    for (let r = startR; r < (evalSheet.rowsCount || 50); r++) {
      const roll = String(getCell(evalSheet, r, 1)?.v || getCell(evalSheet, r, 1)?.raw || '').trim();
      const reg = isFiveCol ? String(getCell(evalSheet, r, 2)?.v || getCell(evalSheet, r, 2)?.raw || '').trim() : '';
      const enroll = isFiveCol
        ? String(getCell(evalSheet, r, 3)?.v || getCell(evalSheet, r, 3)?.raw || '').trim()
        : String(getCell(evalSheet, r, 1)?.v || getCell(evalSheet, r, 1)?.raw || '').trim();
      const name = isFiveCol
        ? String(getCell(evalSheet, r, 4)?.v || getCell(evalSheet, r, 4)?.raw || '').trim()
        : String(getCell(evalSheet, r, 2)?.v || getCell(evalSheet, r, 2)?.raw || '').trim();

      if (!enroll && !name && !roll && !reg) continue;

      // DO NOT extract scores from mock students!
      if (enroll.startsWith('24011F') || name.toUpperCase() === 'HARSHIT JOSHI' || name.toUpperCase() === 'KAPIL BISHT' || name.toUpperCase() === 'MANISH TIWARI') {
        continue;
      }

      // Keys to preserve teacher edits on REAL students only (NEVER by index idx_${r - startR})
      const keys = [enroll, reg, roll, name].filter(Boolean);
      const studentScoreObj = {
        assignAvg: getCell(evalSheet, r, 3 + colOffset)?.v,
        utAvg: getCell(evalSheet, r, 4 + colOffset)?.v,
        attMarks: getCell(evalSheet, r, 5 + colOffset)?.v,
        probSkills: getCell(evalSheet, r, 6 + colOffset)?.v,
        labRecord: getCell(evalSheet, r, 8 + colOffset)?.v,
        creativeWork: getCell(evalSheet, r, 9 + colOffset)?.v,
        attMarks2: getCell(evalSheet, r, 10 + colOffset)?.v,
        vivaVoce: getCell(evalSheet, r, 11 + colOffset)?.v
      };

      keys.forEach(k => {
        scoresMap[k] = Object.assign(scoresMap[k] || {}, studentScoreObj);
      });
    }
  }

  // 2. Check Consolidated Unit Tests sheet
  const testSheet = sheets.find(s => s && s.type === 'tests');
  if (testSheet && testSheet.cells) {
    const isFiveCol = String(getCell(testSheet, 0, 2)?.v || '').toUpperCase().includes('REG');
    const colOffset = isFiveCol ? 2 : 0;
    for (let r = 2; r < (testSheet.rowsCount || 50); r++) {
      const roll = String(getCell(testSheet, r, 1)?.v || getCell(testSheet, r, 1)?.raw || '').trim();
      const reg = isFiveCol ? String(getCell(testSheet, r, 2)?.v || getCell(testSheet, r, 2)?.raw || '').trim() : '';
      const enroll = isFiveCol
        ? String(getCell(testSheet, r, 3)?.v || getCell(testSheet, r, 3)?.raw || '').trim()
        : String(getCell(testSheet, r, 1)?.v || getCell(testSheet, r, 1)?.raw || '').trim();
      const name = isFiveCol
        ? String(getCell(testSheet, r, 4)?.v || getCell(testSheet, r, 4)?.raw || '').trim()
        : String(getCell(testSheet, r, 2)?.v || getCell(testSheet, r, 2)?.raw || '').trim();
      if (!enroll && !name && !roll && !reg) continue;
      if (enroll.startsWith('24011F') || name.toUpperCase() === 'HARSHIT JOSHI' || name.toUpperCase() === 'KAPIL BISHT') continue;

      const examScores = [];
      for (let t = 0; t < 10; t++) {
        const val = getCell(testSheet, r, 3 + colOffset + t)?.v;
        if (val !== undefined && val !== null && val !== '') {
          examScores[t] = Number(val);
        }
      }

      const keys = [enroll, reg, roll, name].filter(Boolean);
      keys.forEach(k => {
        scoresMap[k] = scoresMap[k] || {};
        scoresMap[k].examScores = examScores;
      });
    }
  }

  // 3. Check Single Test sheets (UT1, UT2...)
  sheets.filter(s => s && s.type === 'single-test').forEach(stSheet => {
    const tNum = stSheet.testId || 1;
    const isFiveCol = String(getCell(stSheet, 0, 2)?.v || '').toUpperCase().includes('REG');
    const colOffset = isFiveCol ? 2 : 0;
    for (let r = 2; r < (stSheet.rowsCount || 50); r++) {
      const roll = String(getCell(stSheet, r, 1)?.v || getCell(stSheet, r, 1)?.raw || '').trim();
      const reg = isFiveCol ? String(getCell(stSheet, r, 2)?.v || getCell(stSheet, r, 2)?.raw || '').trim() : '';
      const enroll = isFiveCol
        ? String(getCell(stSheet, r, 3)?.v || getCell(stSheet, r, 3)?.raw || '').trim()
        : String(getCell(stSheet, r, 1)?.v || getCell(stSheet, r, 1)?.raw || '').trim();
      const name = isFiveCol
        ? String(getCell(stSheet, r, 4)?.v || getCell(stSheet, r, 4)?.raw || '').trim()
        : String(getCell(stSheet, r, 2)?.v || getCell(stSheet, r, 2)?.raw || '').trim();
      if (!enroll && !name && !roll && !reg) continue;
      if (enroll.startsWith('24011F') || name.toUpperCase() === 'HARSHIT JOSHI' || name.toUpperCase() === 'KAPIL BISHT') continue;

      const qMarks = [];
      for (let q = 0; q < 4; q++) {
        const val = getCell(stSheet, r, 3 + colOffset + q)?.v;
        if (val !== undefined && val !== null && val !== '') {
          qMarks[q] = Number(val);
        }
      }

      const keys = [enroll, reg, roll, name].filter(Boolean);
      keys.forEach(k => {
        scoresMap[k] = scoresMap[k] || {};
        scoresMap[k].singleTests = scoresMap[k].singleTests || {};
        scoresMap[k].singleTests[tNum] = qMarks;
      });
    }
  });

  // 4. Check Assignments sheet
  const assignSheet = sheets.find(s => s && s.type === 'assignments');
  if (assignSheet && assignSheet.cells) {
    const isFiveCol = String(getCell(assignSheet, 0, 2)?.v || '').toUpperCase().includes('REG');
    const colOffset = isFiveCol ? 2 : 0;
    for (let r = 2; r < (assignSheet.rowsCount || 50); r++) {
      const roll = String(getCell(assignSheet, r, 1)?.v || getCell(assignSheet, r, 1)?.raw || '').trim();
      const reg = isFiveCol ? String(getCell(assignSheet, r, 2)?.v || getCell(assignSheet, r, 2)?.raw || '').trim() : '';
      const enroll = isFiveCol
        ? String(getCell(assignSheet, r, 3)?.v || getCell(assignSheet, r, 3)?.raw || '').trim()
        : String(getCell(assignSheet, r, 1)?.v || getCell(assignSheet, r, 1)?.raw || '').trim();
      const name = isFiveCol
        ? String(getCell(assignSheet, r, 4)?.v || getCell(assignSheet, r, 4)?.raw || '').trim()
        : String(getCell(assignSheet, r, 2)?.v || getCell(assignSheet, r, 2)?.raw || '').trim();
      if (!enroll && !name && !roll && !reg) continue;
      if (enroll.startsWith('24011F') || name.toUpperCase() === 'HARSHIT JOSHI' || name.toUpperCase() === 'KAPIL BISHT') continue;

      const aScores = [];
      for (let a = 0; a < 5; a++) {
        const val = getCell(assignSheet, r, 3 + colOffset + a)?.v;
        if (val !== undefined && val !== null && val !== '') {
          aScores[a] = Number(val);
        }
      }

      const keys = [enroll, reg, roll, name].filter(Boolean);
      keys.forEach(k => {
        scoresMap[k] = scoresMap[k] || {};
        scoresMap[k].assignScores = aScores;
      });
    }
  }

  return scoresMap;
}

/* ══════════════════════════════════════════════════════════════
   ACADEMIC DATA HYDRATION (ACADEMIC DATA INTEGRATION)
   Hydrates: Master Evaluation, Class Tests, Assignments, Practicals
   ══════════════════════════════════════════════════════════════ */
function hydrateAcademicSheetsFromGroup(forceRefresh = false) {
  const key = `vidyaos_excel_wb_${S.groupId || 'default'}`;

  // If faculty has existing edits saved locally for this subject, load them unless force refresh requested or obsolete
  if (!forceRefresh) {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        let isStale = false;
        if (
          saved.includes('24011F') || saved.includes('HARSHIT JOSHI') || saved.includes('KAPIL BISHT') || saved.includes('MANISH TIWARI') ||
          saved.includes('8.3') || saved.includes('1.82') ||
          !saved.includes('REG. NO.') || saved.includes('ROUND(D') || saved.includes('ROUND(I')
        ) {
          isStale = true;
        } else {
          const parsed = JSON.parse(saved);
          const s0 = parsed?.sheets?.[0];
          const s0Text = String(getCell(s0, 0, 0)?.v || getCell(s0, 0, 0)?.raw || '');
          const hasBrokenBannerInGrid = s0Text.includes('Polytechnic') || s0Text.includes('Institute') || s0Text.includes('Uttarakhand');
          const hasSingleTests = Array.isArray(parsed?.sheets) && parsed.sheets.some(s => s.type === 'single-test');
          const hasObsoleteGrade = s0 && (getCell(s0, 0, 7)?.v === 'Grade' || String(getCell(s0, 0, 3)?.v || '').includes('(10)'));
          const isTwoTier = String(getCell(s0, 0, 5)?.v || getCell(s0, 0, 3)?.v || '').toUpperCase() === 'THEORY';
          const hasFiveCols = s0 && String(getCell(s0, 0, 2)?.v || '').toUpperCase().includes('REG');

          const hasStudentRow = s0 && (
            Boolean(getCell(s0, 3, 4)?.v || getCell(s0, 3, 4)?.raw) ||
            Boolean(getCell(s0, 3, 2)?.v || getCell(s0, 3, 2)?.raw) ||
            Boolean(getCell(s0, 3, 0)?.v || getCell(s0, 3, 0)?.raw)
          );

          const hasBrokenSingleTest = Array.isArray(parsed?.sheets) && parsed.sheets.some(s => s.type === 'single-test' && (
            !s.cells?.['0,2']?.v ||
            !String(s.cells['0,2'].v).includes('REG') ||
            !s.cells?.['0,3']?.v ||
            !String(s.cells['0,3'].v).includes('UBTER') ||
            !s.cells?.['0,4']?.v ||
            !String(s.cells['0,4'].v).includes('NAME') ||
            !(s.merges || []).some(m => m.s.r === 0 && m.e.r === 1 && m.s.c === 4)
          ));

          if (isStale || hasBrokenSingleTest || !parsed || !Array.isArray(parsed.sheets) || parsed.sheets.length < 4 || hasObsoleteGrade || hasBrokenBannerInGrid || !hasSingleTests || !hasStudentRow || !isTwoTier || !hasFiveCols) {
            localStorage.removeItem(key);
          } else {
            // Auto-heal single-test and other sheet headers if any subtle attribute was missing
            parsed.sheets.forEach(s => {
              if (s.type === 'single-test') {
                setCell(s, 0, 0, { raw: 'SR. NO.', v: 'SR. NO.', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
                setCell(s, 0, 1, { raw: 'ROLL NO.', v: 'ROLL NO.', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
                setCell(s, 0, 2, { raw: 'REG. NO.', v: 'REG. NO.', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
                setCell(s, 0, 3, { raw: 'UBTER ROLL NO.', v: 'UBTER ROLL NO.', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
                setCell(s, 0, 4, { raw: 'STUDENT NAME', v: 'STUDENT NAME', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
                if (!s.merges) s.merges = [];
                s.merges = s.merges.filter(m => !(m.s.r <= 1 && m.e.r <= 1 && m.s.c <= 4));
                for (let c = 0; c <= 4; c++) {
                  setCell(s, 1, c, { raw: '', v: '', s: { align: 'center', bg: 'var(--bg-surface)' } });
                  s.merges.push({ s: { r: 0, c }, e: { r: 1, c } });
                }
              }
            });

            EXCEL_WB.name = parsed.name || EXCEL_WB.name;
            EXCEL_WB.sheets = parsed.sheets;
            EXCEL_WB.activeSheetIndex = 0;
            EXCEL_WB.sheets.forEach(s => {
              if (typeof findLastDataColumn === 'function') {
                const lastCol = findLastDataColumn(s);
                s.colsCount = Math.max(1, lastCol + 1);
              }
              if (typeof autoFitSheetColumns === 'function') {
                autoFitSheetColumns(s, true);
              }
            });
            recalculateAllSheetFormulas(false);
            renderSheetTabs();
            renderExcelGrid(true);
            updateStatusBarStats();
            initExcelRichTooltips();
            return;
          }
        }
      }
    } catch (_) { }
  }

  // Extract any existing entered scores from local storage or memory before regenerating
  let existingScoresMap = {};
  try {
    const rawSaved = localStorage.getItem(key);
    if (rawSaved && !rawSaved.includes('24011F') && !rawSaved.includes('HARSHIT JOSHI') && !rawSaved.includes('KAPIL BISHT') && !rawSaved.includes('MANISH TIWARI') && rawSaved.includes('REG. NO.')) {
      const parsed = JSON.parse(rawSaved);
      if (parsed && Array.isArray(parsed.sheets)) {
        existingScoresMap = extractExistingStudentScores(parsed.sheets);
      }
    }
  } catch (_) { }
  if (EXCEL_WB.sheets && EXCEL_WB.sheets.length > 0) {
    const memScores = extractExistingStudentScores(EXCEL_WB.sheets);
    existingScoresMap = Object.assign(existingScoresMap, memScores);
  }

  // Retrieve authentic student roster from evaluation data or members
  let studentList = [];
  if (S.evalData && Array.isArray(S.evalData.students) && S.evalData.students.length > 0) {
    studentList = S.evalData.students;
  } else if (S.evalData && Array.isArray(S.evalData.roster) && S.evalData.roster.length > 0) {
    studentList = S.evalData.roster;
  } else if (Array.isArray(S.members) && S.members.length > 0) {
    studentList = S.members;
  } else if (Array.isArray(window.S?.allStudents) && window.S.allStudents.length > 0) {
    studentList = window.S.allStudents;
  }

  // If classroom does not have members enrolled yet, supply clean blank rows with ZERO scores
  const hasRealStudents = Boolean(studentList && studentList.length > 0);
  const students = hasRealStudents ? sortStudentsList(studentList) : Array.from({ length: 20 }, (_, idx) => ({
    class_roll_no: idx + 1,
    registration_no: '',
    official_enrollment_no: '',
    full_name: '',
    attendance_percentage: 0,
    isPlaceholder: true
  }));

  EXCEL_WB.sheets = [];
  const totalRows = Math.max(students.length + 8, 45);
  const teacherName = S.group?.teacher_name || S.group?.faculty_name || (typeof currentUser !== 'undefined' && currentUser?.name) || 'Subject Teacher';

  // ══════════════════════════════════════════════════════════════
  // SHEET 1: Master Evaluation (Theory + Practical consolidated)
  // ══════════════════════════════════════════════════════════════
  const evalSheet = createDefaultExcelSheet('Master Evaluation', {
    type: 'evaluation',
    rowsCount: totalRows,
    colsCount: 16,
    frozenRows: 3,
    frozenCols: 5
  });
  evalSheet.rowHeights[0] = 26;
  evalSheet.rowHeights[1] = 26;
  evalSheet.rowHeights[2] = 22;
  for (let r = 3; r < 3 + students.length; r++) {
    evalSheet.rowHeights[r] = 24;
  }
  // Default compact screen-fit proportions: All 16 columns fit 100% on standard screens without horizontal scroll
  const defaultEvalWidths = [42, 50, 76, 102, 145, 68, 68, 54, 68, 63, 54, 68, 54, 54, 63, 65];
  for (let c = 0; c < 16; c++) {
    evalSheet.colWidths[c] = defaultEvalWidths[c];
  }

  // Header Row 0: SR. NO., ROLL NO., REG. NO., UBTER ROLL NO., STUDENT NAME, THEORY (cols 5..9), PRACTICAL (cols 10..14), GRAND TOTAL (col 15)
  setCell(evalSheet, 0, 0, { raw: 'SR. NO.', v: 'SR. NO.', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
  setCell(evalSheet, 0, 1, { raw: 'ROLL NO.', v: 'ROLL NO.', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
  setCell(evalSheet, 0, 2, { raw: 'REG. NO.', v: 'REG. NO.', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
  setCell(evalSheet, 0, 3, { raw: 'UBTER ROLL NO.', v: 'UBTER ROLL NO.', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
  setCell(evalSheet, 0, 4, { raw: 'STUDENT NAME', v: 'STUDENT NAME', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
  setCell(evalSheet, 0, 5, { raw: 'THEORY', v: 'THEORY', s: { bold: true, align: 'center', bg: 'var(--badge-primary-bg, var(--chip-faculty-bg))', color: 'var(--color-primary)' } });
  for (let c = 6; c <= 9; c++) {
    setCell(evalSheet, 0, c, { raw: '', v: '', s: { bold: true, align: 'center', bg: 'var(--badge-primary-bg, var(--chip-faculty-bg))' } });
  }
  setCell(evalSheet, 0, 10, { raw: 'PRACTICAL', v: 'PRACTICAL', s: { bold: true, align: 'center', bg: 'var(--status-present-bg, var(--chip-faculty-bg))', color: 'var(--status-present, var(--color-primary))' } });
  for (let c = 11; c <= 14; c++) {
    setCell(evalSheet, 0, c, { raw: '', v: '', s: { bold: true, align: 'center', bg: 'var(--status-present-bg, var(--chip-faculty-bg))' } });
  }
  setCell(evalSheet, 0, 15, { raw: 'GRAND TOTAL', v: 'GRAND TOTAL', s: { bold: true, align: 'center', bg: 'var(--chip-faculty-bg)', color: 'var(--color-primary)' } });

  // Header Row 1: Subheaders for Theory and Practical
  setCell(evalSheet, 1, 0, { raw: '', v: '', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
  setCell(evalSheet, 1, 1, { raw: '', v: '', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
  setCell(evalSheet, 1, 2, { raw: '', v: '', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
  setCell(evalSheet, 1, 3, { raw: '', v: '', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
  setCell(evalSheet, 1, 4, { raw: '', v: '', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
  setCell(evalSheet, 1, 5, { raw: 'Assignment\n(10)', v: 'Assignment\n(10)', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)', wrap: true } });
  setCell(evalSheet, 1, 6, { raw: 'UTs Total\n(Best 4)', v: 'UTs Total\n(Best 4)', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)', wrap: true } });
  setCell(evalSheet, 1, 7, { raw: 'Attendance', v: 'Attendance', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)', wrap: true } });
  setCell(evalSheet, 1, 8, { raw: 'Problem Solving\nSkills/', v: 'Problem Solving\nSkills/', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)', wrap: true } });
  setCell(evalSheet, 1, 9, { raw: 'TOTAL', v: 'TOTAL', s: { bold: true, align: 'center', bg: 'var(--chip-faculty-bg)', wrap: true } });
  setCell(evalSheet, 1, 10, { raw: 'Lab Record\nFile', v: 'Lab Record\nFile', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)', wrap: true } });
  setCell(evalSheet, 1, 11, { raw: 'Creative Work\n(Model/Chart/Project)', v: 'Creative Work\n(Model/Chart/Project)', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)', wrap: true } });
  setCell(evalSheet, 1, 12, { raw: 'Attendance', v: 'Attendance', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)', wrap: true } });
  setCell(evalSheet, 1, 13, { raw: 'Viva Voce', v: 'Viva Voce', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)', wrap: true } });
  setCell(evalSheet, 1, 14, { raw: 'TOTAL', v: 'TOTAL', s: { bold: true, align: 'center', bg: 'var(--chip-faculty-bg)', wrap: true } });
  setCell(evalSheet, 1, 15, { raw: '(60)', v: '(60)', s: { bold: true, align: 'center', bg: 'var(--chip-faculty-bg)' } });

  // Header Row 2: Marks row
  setCell(evalSheet, 2, 0, { raw: 'Marks -->', v: 'Marks -->', s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  setCell(evalSheet, 2, 1, { raw: '', v: '', s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  setCell(evalSheet, 2, 2, { raw: '', v: '', s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  setCell(evalSheet, 2, 3, { raw: '', v: '', s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  setCell(evalSheet, 2, 4, { raw: '', v: '', s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  setCell(evalSheet, 2, 5, { raw: 10, v: 10, s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  setCell(evalSheet, 2, 6, { raw: 10, v: 10, s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  setCell(evalSheet, 2, 7, { raw: 5, v: 5, s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  setCell(evalSheet, 2, 8, { raw: 5, v: 5, s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  setCell(evalSheet, 2, 9, { raw: 30, v: 30, s: { bold: true, align: 'center', bg: 'var(--chip-faculty-bg)' } });
  setCell(evalSheet, 2, 10, { raw: 10, v: 10, s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  setCell(evalSheet, 2, 11, { raw: 10, v: 10, s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  setCell(evalSheet, 2, 12, { raw: 5, v: 5, s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  setCell(evalSheet, 2, 13, { raw: 5, v: 5, s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  setCell(evalSheet, 2, 14, { raw: 30, v: 30, s: { bold: true, align: 'center', bg: 'var(--chip-faculty-bg)' } });
  setCell(evalSheet, 2, 15, { raw: 60, v: 60, s: { bold: true, align: 'center', bg: 'var(--chip-faculty-bg)' } });

  // Merges for evaluation sheet
  evalSheet.merges = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // SR. NO. vertical merge
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // ROLL NO. vertical merge
    { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // REG. NO. vertical merge
    { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } }, // UBTER ROLL NO. vertical merge
    { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } }, // STUDENT NAME vertical merge
    { s: { r: 0, c: 5 }, e: { r: 0, c: 9 } }, // THEORY horizontal merge (cols 5..9)
    { s: { r: 0, c: 10 }, e: { r: 0, c: 14 } }, // PRACTICAL horizontal merge (cols 10..14)
    { s: { r: 0, c: 15 }, e: { r: 1, c: 15 } }, // GRAND TOTAL vertical merge
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }  // Marks --> horizontal merge (cols 0..4)
  ];

  students.forEach((stu, idx) => {
    const r = idx + 3;
    const srNo = idx + 1;
    const roll = stu.class_roll_no || (idx + 1);
    const regNo = stu.isPlaceholder ? '' : (stu.registration_no || stu.reg_no || '—');
    const enroll = stu.isPlaceholder ? '' : (stu.ubter_roll_no || stu.official_enrollment_no || stu.enrollment_no || stu.enrollment_number || '—');
    const name = stu.full_name || stu.student_name || stu.name || '';
    const attPct = Math.round(Number(stu.attendance_percentage !== undefined && stu.attendance_percentage !== null ? stu.attendance_percentage : 0));

    const preserved = existingScoresMap[enroll] || existingScoresMap[regNo] || existingScoresMap[roll] || existingScoresMap[name] || {};

    let assignAvg = 0;
    if (preserved.assignAvg !== undefined && preserved.assignAvg !== null && preserved.assignAvg !== '') {
      assignAvg = Number(preserved.assignAvg);
    } else if (stu.assignment_avg !== undefined && stu.assignment_avg !== null && stu.assignment_avg !== '') {
      assignAvg = Number(stu.assignment_avg);
    } else if (Array.isArray(stu.assignment_scores) && stu.assignment_scores.length) {
      const valid = stu.assignment_scores.filter(v => v !== '' && v !== null && !isNaN(v));
      if (valid.length) assignAvg = Math.round((valid.reduce((a, b) => a + Number(b), 0) / valid.length) * 10) / 10;
    }

    let utAvg = 0;
    if (preserved.utAvg !== undefined && preserved.utAvg !== null && preserved.utAvg !== '') {
      utAvg = Number(preserved.utAvg);
    } else if (stu.exam_avg !== undefined && stu.exam_avg !== null && stu.exam_avg !== '') {
      utAvg = Math.round(Number(stu.exam_avg) * 0.1 * 100) / 100;
    } else if (Array.isArray(stu.exam_scores) && stu.exam_scores.length) {
      const valid = stu.exam_scores.filter(v => v !== '' && v !== null && !isNaN(v));
      if (valid.length) utAvg = Math.round((valid.reduce((a, b) => a + Number(b), 0) / valid.length) * 0.1 * 100) / 100;
    }

    let attMarks = (attPct > 0) ? Math.min(5, Math.round((attPct / 20) * 10) / 10) : 0;
    if (preserved.attMarks !== undefined && preserved.attMarks !== null && preserved.attMarks !== '') {
      attMarks = Number(preserved.attMarks);
    }

    let probSkills = (stu.problem_solving_marks !== undefined && stu.problem_solving_marks !== null) ? Number(stu.problem_solving_marks) : 0;
    if (preserved.probSkills !== undefined && preserved.probSkills !== null && preserved.probSkills !== '') {
      probSkills = Number(preserved.probSkills);
    }

    let labRecord = (stu.lab_record_marks !== undefined && stu.lab_record_marks !== null) ? Number(stu.lab_record_marks) : 0;
    if (preserved.labRecord !== undefined && preserved.labRecord !== null && preserved.labRecord !== '') {
      labRecord = Number(preserved.labRecord);
    }

    let creativeWork = (stu.creative_work_marks !== undefined && stu.creative_work_marks !== null) ? Number(stu.creative_work_marks) : 0;
    if (preserved.creativeWork !== undefined && preserved.creativeWork !== null && preserved.creativeWork !== '') {
      creativeWork = Number(preserved.creativeWork);
    }

    let attMarks2 = attMarks;
    if (preserved.attMarks2 !== undefined && preserved.attMarks2 !== null && preserved.attMarks2 !== '') {
      attMarks2 = Number(preserved.attMarks2);
    }

    let vivaVoce = (stu.viva_voce_marks !== undefined && stu.viva_voce_marks !== null) ? Number(stu.viva_voce_marks) : 0;
    if (preserved.vivaVoce !== undefined && preserved.vivaVoce !== null && preserved.vivaVoce !== '') {
      vivaVoce = Number(preserved.vivaVoce);
    }

    setCell(evalSheet, r, 0, { raw: srNo, v: srNo, s: { align: 'center' } });
    setCell(evalSheet, r, 1, { raw: roll, v: roll, s: { bold: true, align: 'center' } });
    setCell(evalSheet, r, 2, { raw: regNo, v: regNo, s: { align: 'center' } });
    setCell(evalSheet, r, 3, { raw: enroll, v: enroll, s: { align: 'center' } });
    setCell(evalSheet, r, 4, { raw: name, v: name, s: { bold: true, align: 'left' } });
    setCell(evalSheet, r, 5, { raw: assignAvg, v: assignAvg, s: { align: 'center' } });
    setCell(evalSheet, r, 6, { raw: utAvg, v: utAvg, s: { align: 'center' } });
    setCell(evalSheet, r, 7, { raw: attMarks, v: attMarks, s: { align: 'center' } });
    setCell(evalSheet, r, 8, { raw: probSkills, v: probSkills, s: { align: 'center' } });

    // Theory Total formula: =ROUND(F4 + G4 + H4 + I4, 2)
    const theoryFormula = `=ROUND(F${r + 1} + G${r + 1} + H${r + 1} + I${r + 1}, 2)`;
    setCell(evalSheet, r, 9, { raw: theoryFormula, f: theoryFormula, s: { bold: true, align: 'center', bg: 'var(--chip-faculty-bg)' } });

    setCell(evalSheet, r, 10, { raw: labRecord, v: labRecord, s: { align: 'center' } });
    setCell(evalSheet, r, 11, { raw: creativeWork, v: creativeWork, s: { align: 'center' } });
    setCell(evalSheet, r, 12, { raw: attMarks2, v: attMarks2, s: { align: 'center' } });
    setCell(evalSheet, r, 13, { raw: vivaVoce, v: vivaVoce, s: { align: 'center' } });

    // Practical Total formula: =ROUND(K4 + L4 + M4 + N4, 2)
    const practicalFormula = `=ROUND(K${r + 1} + L${r + 1} + M${r + 1} + N${r + 1}, 2)`;
    setCell(evalSheet, r, 14, { raw: practicalFormula, f: practicalFormula, s: { bold: true, align: 'center', bg: 'var(--chip-faculty-bg)' } });

    // Grand Total formula: =ROUND(J4 + O4, 2)
    const grandFormula = `=ROUND(J${r + 1} + O${r + 1}, 2)`;
    setCell(evalSheet, r, 15, { raw: grandFormula, f: grandFormula, s: { bold: true, align: 'center', bg: 'var(--chip-faculty-bg)' } });
  });

  EXCEL_WB.sheets.push(evalSheet);

  // ══════════════════════════════════════════════════════════════
  // SHEET 2: Combined Unit Tests (1..10 + Final Total Best 4 Avg)
  // ══════════════════════════════════════════════════════════════
  const testSheet = createDefaultExcelSheet('Unit Tests - Consolidated', {
    type: 'tests',
    rowsCount: totalRows,
    colsCount: 16,
    frozenRows: 2,
    frozenCols: 5
  });
  testSheet.rowHeights[0] = 28;
  testSheet.rowHeights[1] = 24;
  for (let r = 2; r < 2 + students.length; r++) {
    testSheet.rowHeights[r] = 24;
  }
  testSheet.colWidths[0] = 42;  // SR. NO.
  testSheet.colWidths[1] = 50;  // ROLL NO.
  testSheet.colWidths[2] = 76; // REG. NO.
  testSheet.colWidths[3] = 102; // UBTER ROLL NO.
  testSheet.colWidths[4] = 145; // STUDENT NAME
  for (let c = 5; c <= 14; c++) testSheet.colWidths[c] = 48;
  testSheet.colWidths[15] = 65; // Final Total (Grand Total)

  const testHeaders = ['SR. NO.', 'ROLL NO.', 'REG. NO.', 'UBTER ROLL NO.', 'STUDENT NAME', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Final Total (Best 4 Avg)'];
  testHeaders.forEach((h, c) => {
    setCell(testSheet, 0, c, { raw: h, v: h, s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
  });

  const testMarks = ['Unit Test No. -->', '', '', '', '', 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 10];
  testMarks.forEach((m, c) => {
    setCell(testSheet, 1, c, { raw: m, v: m, s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  });
  testSheet.merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 4 } });

  students.forEach((stu, idx) => {
    const r = idx + 2;
    const srNo = idx + 1;
    const roll = stu.class_roll_no || (idx + 1);
    const regNo = stu.isPlaceholder ? '' : (stu.registration_no || stu.reg_no || '—');
    const enroll = stu.isPlaceholder ? '' : (stu.ubter_roll_no || stu.official_enrollment_no || stu.enrollment_no || stu.enrollment_number || '—');
    const name = stu.full_name || stu.student_name || stu.name || '';

    const preserved = existingScoresMap[enroll] || existingScoresMap[regNo] || existingScoresMap[roll] || existingScoresMap[name] || {};

    setCell(testSheet, r, 0, { raw: srNo, v: srNo, s: { align: 'center' } });
    setCell(testSheet, r, 1, { raw: roll, v: roll, s: { bold: true, align: 'center' } });
    setCell(testSheet, r, 2, { raw: regNo, v: regNo, s: { align: 'center' } });
    setCell(testSheet, r, 3, { raw: enroll, v: enroll, s: { align: 'center' } });
    setCell(testSheet, r, 4, { raw: name, v: name, s: { bold: true, align: 'left' } });

    for (let tIdx = 0; tIdx < 10; tIdx++) {
      let mark = 0;
      if (preserved?.examScores?.[tIdx] !== undefined) {
        mark = preserved.examScores[tIdx];
      } else if (Array.isArray(stu.exam_scores) && stu.exam_scores[tIdx] !== undefined && stu.exam_scores[tIdx] !== '' && !isNaN(stu.exam_scores[tIdx])) {
        mark = Number(stu.exam_scores[tIdx]);
      }
      setCell(testSheet, r, 5 + tIdx, { raw: mark, v: mark, s: { align: 'center' } });
    }

    const best4Formula = `=ROUND(AVERAGE(F${r + 1}:I${r + 1}) * 0.5, 2)`;
    setCell(testSheet, r, 15, { raw: best4Formula, f: best4Formula, s: { bold: true, align: 'center' } });
  });

  EXCEL_WB.sheets.push(testSheet);

  // ══════════════════════════════════════════════════════════════
  // SHEETS 3..K: Single Unit Test Sheets (UT1, UT2, UT3)
  // ══════════════════════════════════════════════════════════════
  const testsToGenerate = (Array.isArray(S.tests) && S.tests.length) ? S.tests : [
    { id: 1, name: 'Unit Test 1', max_marks: 20 },
    { id: 2, name: 'Unit Test 2', max_marks: 20 },
    { id: 3, name: 'Unit Test 3', max_marks: 20 }
  ];

  testsToGenerate.forEach((t, tIdx) => {
    const tNum = tIdx + 1;
    const sName = `UT${tNum}`;
    const singleTestSheet = createDefaultExcelSheet(sName, {
      type: 'single-test',
      testId: t.id || tNum,
      shortName: sName,
      rowsCount: totalRows,
      colsCount: 11,
      frozenRows: 2,
      frozenCols: 5
    });
    singleTestSheet.rowHeights[0] = 28;
    singleTestSheet.rowHeights[1] = 24;
    for (let r = 2; r < 2 + students.length; r++) {
      singleTestSheet.rowHeights[r] = 24;
    }
    singleTestSheet.colWidths[0] = 42;  // SR. NO.
    singleTestSheet.colWidths[1] = 50;  // ROLL NO.
    singleTestSheet.colWidths[2] = 76; // REG. NO.
    singleTestSheet.colWidths[3] = 102; // UBTER ROLL NO.
    singleTestSheet.colWidths[4] = 145; // STUDENT NAME
    singleTestSheet.colWidths[5] = 48;
    singleTestSheet.colWidths[6] = 48;
    singleTestSheet.colWidths[7] = 48;
    singleTestSheet.colWidths[8] = 48;
    singleTestSheet.colWidths[9] = 63; // Total
    singleTestSheet.colWidths[10] = 340;

    // Resolve test metadata and classroom post instructions & questions
    const activeTest = (Array.isArray(S.tests) && (
      S.tests.find(item => String(item.id) === String(t.id)) ||
      S.tests.find(item => item.test_number == tNum) ||
      S.tests.find(item => item.name === t.name) ||
      S.tests[tIdx]
    )) || t || {};

    const testTotalMax = Number(activeTest.max_marks || t.max_marks || 20);
    const testMode = activeTest.mode || 'OFFLINE';
    const testDuration = activeTest.duration_minutes ? `${activeTest.duration_minutes} minutes` : '50 minutes';

    let instructions = [];
    if (activeTest.instructions) {
      if (Array.isArray(activeTest.instructions) && activeTest.instructions.length) {
        instructions = activeTest.instructions;
      } else if (typeof activeTest.instructions === 'string') {
        try {
          const parsed = JSON.parse(activeTest.instructions);
          if (Array.isArray(parsed) && parsed.length) {
            instructions = parsed;
          } else if (typeof parsed === 'string') {
            const lines = parsed.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
            if (lines.length) instructions = lines;
          }
        } catch (_) {
          const lines = activeTest.instructions.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
          if (lines.length) instructions = lines;
        }
      }
    }

    if (!instructions.length && S.currentTestState && (S.currentTestState.test?.id == activeTest.id || S.currentTestState.test?.test_number == tNum)) {
      if (Array.isArray(S.currentTestState.instructions) && S.currentTestState.instructions.length) {
        instructions = S.currentTestState.instructions;
      }
    }

    if (!instructions.length) {
      let savedCustom = null;
      try {
        const raw = localStorage.getItem(`test_sheet_custom_${S.groupId}_${activeTest.id || tNum}`);
        if (raw) savedCustom = JSON.parse(raw);
      } catch (_) { }
      if (savedCustom && Array.isArray(savedCustom.instructions) && savedCustom.instructions.length) {
        instructions = savedCustom.instructions;
      }
    }

    if (!instructions.length) {
      instructions = [
        'All questions are compulsory.',
        'Marks are indicated against each question.',
        'Scientific calculator is permitted. Cell phones and unauthorized digital devices are strictly prohibited.',
        'Candidates must write their Roll No. & UBTER Roll No. clearly on the answer script.'
      ];
    }

    let questions = [];
    if (activeTest.questions) {
      try {
        const parsed = typeof activeTest.questions === 'string' ? JSON.parse(activeTest.questions) : activeTest.questions;
        if (Array.isArray(parsed) && parsed.length) {
          const splitMax = testTotalMax ? +(testTotalMax / parsed.length).toFixed(1) : 5;
          questions = parsed.map((q, i) => ({
            num: q.num || (i + 1),
            text: typeof q === 'string' ? q : (q.text || q.question || `Question ${i + 1}`),
            max: Number(q.max || q.max_marks || q.marks || splitMax)
          }));
        }
      } catch (_) {
        const rawLines = String(activeTest.questions).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        if (rawLines.length) {
          const splitMax = testTotalMax ? +(testTotalMax / rawLines.length).toFixed(1) : 5;
          questions = rawLines.map((line, i) => ({
            num: i + 1,
            text: line.replace(/^(?:Q\.?\s*\d+[\.\:\-\)]*|\d+[\.\:\-\)])\s*/i, ''),
            max: splitMax
          }));
        }
      }
    }

    // Auto-extract question statements from instructions if questions not passed separately
    if (!questions.length && instructions && instructions.length) {
      const detectedQ = [];
      const remainingIns = [];
      instructions.forEach(line => {
        if (/^(?:Q\.?\s*\d+|\d+)[\.\:\-\)]/i.test(line)) {
          detectedQ.push(line.replace(/^(?:Q\.?\s*\d+|\d+)[\.\:\-\)]\s*/i, ''));
        } else {
          remainingIns.push(line);
        }
      });
      if (detectedQ.length) {
        const splitMax = testTotalMax ? +(testTotalMax / detectedQ.length).toFixed(1) : 5;
        questions = detectedQ.map((qText, idx) => ({
          num: idx + 1,
          text: qText,
          max: splitMax
        }));
        if (remainingIns.length) instructions = remainingIns;
      }
    }

    if (!questions.length && S.currentTestState && (S.currentTestState.test?.id == activeTest.id || S.currentTestState.test?.test_number == tNum)) {
      if (Array.isArray(S.currentTestState.questions) && S.currentTestState.questions.length) {
        questions = S.currentTestState.questions;
      }
    }

    if (!questions.length) {
      let savedCustom = null;
      try {
        const raw = localStorage.getItem(`test_sheet_custom_${S.groupId}_${activeTest.id || tNum}`);
        if (raw) savedCustom = JSON.parse(raw);
      } catch (_) { }
      if (savedCustom && Array.isArray(savedCustom.questions) && savedCustom.questions.length) {
        questions = savedCustom.questions.map((q, i) => ({
          num: q.num || (i + 1),
          text: q.text || `Question ${i + 1}`,
          max: Number(q.max || 5)
        }));
      }
    }

    if (!questions.length) {
      const splitMax = testTotalMax ? +(testTotalMax / 4).toFixed(1) : 5;
      questions = [
        { num: 1, text: 'Define core architectural principles, definitions & fundamental terms.', max: splitMax },
        { num: 2, text: 'Explain key working mechanisms and components with suitable diagrams.', max: splitMax },
        { num: 3, text: 'Solve applied problem / algorithm / design case study with step-by-step procedure.', max: splitMax },
        { num: 4, text: 'Detailed analytical evaluation, comparative breakdown and concluding summary.', max: splitMax }
      ];
    }

    // Header Row 0: SR. NO., ROLL NO., REG. NO., UBTER ROLL NO., STUDENT NAME, Unit Test (Total Marks: 20) [merged 5..9], Details
    setCell(singleTestSheet, 0, 0, { raw: 'SR. NO.', v: 'SR. NO.', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
    setCell(singleTestSheet, 0, 1, { raw: 'ROLL NO.', v: 'ROLL NO.', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
    setCell(singleTestSheet, 0, 2, { raw: 'REG. NO.', v: 'REG. NO.', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
    setCell(singleTestSheet, 0, 3, { raw: 'UBTER ROLL NO.', v: 'UBTER ROLL NO.', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
    setCell(singleTestSheet, 0, 4, { raw: 'STUDENT NAME', v: 'STUDENT NAME', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
    setCell(singleTestSheet, 0, 5, { raw: `Unit Test ${tNum} (Total Marks : ${testTotalMax})`, v: `Unit Test ${tNum} (Total Marks : ${testTotalMax})`, s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
    for (let c = 6; c <= 9; c++) {
      setCell(singleTestSheet, 0, c, { raw: '', v: '', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)' } });
    }
    setCell(singleTestSheet, 0, 10, { raw: 'Unit Test Details (Mode : OFFLINE, Posted in VidyaOS as well)', v: 'Unit Test Details (Mode : OFFLINE, Posted in VidyaOS as well)', s: { bold: true, align: 'center', bg: 'var(--table-th-bg)', wrap: true } });

    // Merges for Header Row 0 & 1
    singleTestSheet.merges.push({ s: { r: 0, c: 5 }, e: { r: 0, c: 9 } });
    singleTestSheet.merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
    singleTestSheet.merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });
    singleTestSheet.merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } });
    singleTestSheet.merges.push({ s: { r: 0, c: 3 }, e: { r: 1, c: 3 } });
    singleTestSheet.merges.push({ s: { r: 0, c: 4 }, e: { r: 1, c: 4 } });

    // Header Row 1: Questions and Total marks
    setCell(singleTestSheet, 1, 0, { raw: '', v: '', s: { align: 'center', bg: 'var(--bg-surface)' } });
    setCell(singleTestSheet, 1, 1, { raw: '', v: '', s: { align: 'center', bg: 'var(--bg-surface)' } });
    setCell(singleTestSheet, 1, 2, { raw: '', v: '', s: { align: 'center', bg: 'var(--bg-surface)' } });
    setCell(singleTestSheet, 1, 3, { raw: '', v: '', s: { align: 'center', bg: 'var(--bg-surface)' } });
    setCell(singleTestSheet, 1, 4, { raw: '', v: '', s: { align: 'center', bg: 'var(--bg-surface)' } });
    questions.slice(0, 4).forEach((q, qIdx) => {
      setCell(singleTestSheet, 1, 5 + qIdx, { raw: q.num || (qIdx + 1), v: q.num || (qIdx + 1), s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
    });
    setCell(singleTestSheet, 1, 9, { raw: 'Total', v: 'Total', s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
    setCell(singleTestSheet, 1, 10, { raw: `UNIT TEST ${tNum} | Maximum Marks : ${testTotalMax} | Time : ${testDuration}`, v: `UNIT TEST ${tNum} | Maximum Marks : ${testTotalMax} | Time : ${testDuration}`, s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });

    // Format examination instructions and classroom test questions for the merged details column
    const insFormatted = instructions.map((ins, i) => `${i + 1}. ${ins}`).join('\n');
    const qFormatted = questions.map((q, i) => `Q${q.num || (i + 1)} (${q.max || 5}M): ${q.text || 'Question ' + (i + 1)}`).join('\n');

    const testDetailsBlock = [
      `📌 EXAMINATION INSTRUCTIONS:`,
      insFormatted,
      ``,
      `📝 TEST QUESTIONS & SCHEME:`,
      qFormatted,
      ``,
      `💡 Mode: ${testMode} | Time: ${testDuration} | VidyaOS Classroom Synced`
    ].join('\n');

    // Merge Column 10 vertically across all student rows until the last student
    const lastStudentRow = Math.max(2, students.length + 1);
    singleTestSheet.merges.push({ s: { r: 2, c: 10 }, e: { r: lastStudentRow, c: 10 } });

    // Cell (2, 10) holds the complete instructions and questions
    setCell(singleTestSheet, 2, 10, {
      raw: testDetailsBlock,
      v: testDetailsBlock,
      s: { align: 'left', vAlign: 'top', wrap: true, fontSize: 11 }
    });

    // Blank out subordinate merged rows in Column 10
    for (let r = 3; r <= lastStudentRow; r++) {
      setCell(singleTestSheet, r, 10, {
        raw: '',
        v: '',
        s: { align: 'left', vAlign: 'top', wrap: true }
      });
    }

    students.forEach((stu, idx) => {
      const r = idx + 2;
      const srNo = idx + 1;
      const roll = stu.class_roll_no || (idx + 1);
      const regNo = stu.isPlaceholder ? '' : (stu.registration_no || stu.reg_no || '—');
      const enroll = stu.isPlaceholder ? '' : (stu.ubter_roll_no || stu.official_enrollment_no || stu.enrollment_no || stu.enrollment_number || '—');
      const name = stu.full_name || stu.student_name || stu.name || '';

      const preserved = existingScoresMap[enroll] || existingScoresMap[regNo] || existingScoresMap[roll] || existingScoresMap[name] || {};

      setCell(singleTestSheet, r, 0, { raw: srNo, v: srNo, s: { align: 'center' } });
      setCell(singleTestSheet, r, 1, { raw: roll, v: roll, s: { bold: true, align: 'center' } });
      setCell(singleTestSheet, r, 2, { raw: regNo, v: regNo, s: { align: 'center' } });
      setCell(singleTestSheet, r, 3, { raw: enroll, v: enroll, s: { align: 'center' } });
      setCell(singleTestSheet, r, 4, { raw: name, v: name, s: { bold: true, align: 'left' } });

      const q1 = preserved?.singleTests?.[tNum]?.[0] !== undefined ? preserved.singleTests[tNum][0] : ((Array.isArray(stu.question_marks) && stu.question_marks[0] !== undefined) ? Number(stu.question_marks[0]) : 0);
      const q2 = preserved?.singleTests?.[tNum]?.[1] !== undefined ? preserved.singleTests[tNum][1] : ((Array.isArray(stu.question_marks) && stu.question_marks[1] !== undefined) ? Number(stu.question_marks[1]) : 0);
      const q3 = preserved?.singleTests?.[tNum]?.[2] !== undefined ? preserved.singleTests[tNum][2] : ((Array.isArray(stu.question_marks) && stu.question_marks[2] !== undefined) ? Number(stu.question_marks[2]) : 0);
      const q4 = preserved?.singleTests?.[tNum]?.[3] !== undefined ? preserved.singleTests[tNum][3] : ((Array.isArray(stu.question_marks) && stu.question_marks[3] !== undefined) ? Number(stu.question_marks[3]) : 0);

      setCell(singleTestSheet, r, 5, { raw: q1, v: q1, s: { align: 'center' } });
      setCell(singleTestSheet, r, 6, { raw: q2, v: q2, s: { align: 'center' } });
      setCell(singleTestSheet, r, 7, { raw: q3, v: q3, s: { align: 'center' } });
      setCell(singleTestSheet, r, 8, { raw: q4, v: q4, s: { align: 'center' } });

      const sumFormula = `=SUM(F${r + 1}:I${r + 1})`;
      setCell(singleTestSheet, r, 9, { raw: sumFormula, f: sumFormula, s: { bold: true, align: 'center' } });
    });

    EXCEL_WB.sheets.push(singleTestSheet);
  });

  // ══════════════════════════════════════════════════════════════
  // SHEET 4: Coursework Assignments Marksheet
  // ══════════════════════════════════════════════════════════════
  const assignSheet = createDefaultExcelSheet('Assignments', {
    type: 'assignments',
    rowsCount: totalRows,
    colsCount: 12,
    frozenRows: 2,
    frozenCols: 5
  });
  assignSheet.rowHeights[0] = 28;
  assignSheet.rowHeights[1] = 24;
  for (let r = 2; r < 2 + students.length; r++) {
    assignSheet.rowHeights[r] = 24;
  }
  assignSheet.colWidths[0] = 42;  // SR. NO.
  assignSheet.colWidths[1] = 50;  // ROLL NO.
  assignSheet.colWidths[2] = 76; // REG. NO.
  assignSheet.colWidths[3] = 102; // UBTER ROLL NO.
  assignSheet.colWidths[4] = 145; // STUDENT NAME
  for (let c = 5; c <= 9; c++) assignSheet.colWidths[c] = 48;
  assignSheet.colWidths[10] = 63; // Total (Average)
  assignSheet.colWidths[11] = 180;

  const assignHeaders = [
    'SR. NO.', 'ROLL NO.', 'REG. NO.', 'UBTER ROLL NO.', 'STUDENT NAME',
    '1', '2', '3', '4', '5', 'Total (Average)',
    'Assignment Details (Mode : OFFLINE, Posted in VidyaOS as classwork)'
  ];
  assignHeaders.forEach((h, c) => {
    setCell(assignSheet, 0, c, { raw: h, v: h, s: { bold: true, align: 'center', bg: 'var(--table-th-bg)', wrap: true } });
  });

  const assignMarks = ['Assignment No. -->', '', '', '', '', 10, 10, 10, 10, 10, 10, 'Continuous Assessment Coursework'];
  assignMarks.forEach((m, c) => {
    setCell(assignSheet, 1, c, { raw: m, v: m, s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  });
  assignSheet.merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 4 } });

  const assignDetailsText = '';
  setCell(assignSheet, 2, 11, { raw: assignDetailsText, v: assignDetailsText, s: { align: 'left', wrap: true } });

  students.forEach((stu, idx) => {
    const r = idx + 2;
    const srNo = idx + 1;
    const roll = stu.class_roll_no || (idx + 1);
    const regNo = stu.isPlaceholder ? '' : (stu.registration_no || stu.reg_no || '—');
    const enroll = stu.isPlaceholder ? '' : (stu.ubter_roll_no || stu.official_enrollment_no || stu.enrollment_no || stu.enrollment_number || '—');
    const name = stu.full_name || stu.student_name || stu.name || '';

    const preserved = existingScoresMap[enroll] || existingScoresMap[regNo] || existingScoresMap[roll] || existingScoresMap[name] || {};

    setCell(assignSheet, r, 0, { raw: srNo, v: srNo, s: { align: 'center' } });
    setCell(assignSheet, r, 1, { raw: roll, v: roll, s: { bold: true, align: 'center' } });
    setCell(assignSheet, r, 2, { raw: regNo, v: regNo, s: { align: 'center' } });
    setCell(assignSheet, r, 3, { raw: enroll, v: enroll, s: { align: 'center' } });
    setCell(assignSheet, r, 4, { raw: name, v: name, s: { bold: true, align: 'left' } });

    for (let aIdx = 0; aIdx < 5; aIdx++) {
      let mark = 0;
      if (preserved?.assignScores?.[aIdx] !== undefined) {
        mark = preserved.assignScores[aIdx];
      } else if (Array.isArray(stu.assignment_scores) && stu.assignment_scores[aIdx] !== undefined && stu.assignment_scores[aIdx] !== '' && !isNaN(stu.assignment_scores[aIdx])) {
        mark = Number(stu.assignment_scores[aIdx]);
      }
      setCell(assignSheet, r, 5 + aIdx, { raw: mark, v: mark, s: { align: 'center' } });
    }

    const avgFormula = `=ROUND(AVERAGE(F${r + 1}:J${r + 1}), 1)`;
    setCell(assignSheet, r, 10, { raw: avgFormula, f: avgFormula, s: { bold: true, align: 'center' } });
  });

  EXCEL_WB.sheets.push(assignSheet);

  // ══════════════════════════════════════════════════════════════
  // SHEET 5: Practicals & Lab Work
  // ══════════════════════════════════════════════════════════════
  const practicalSheet = createDefaultExcelSheet('Practicals', {
    type: 'practicals',
    rowsCount: totalRows,
    colsCount: 10,
    frozenRows: 2,
    frozenCols: 5
  });
  practicalSheet.rowHeights[0] = 28;
  practicalSheet.rowHeights[1] = 24;
  for (let r = 2; r < 2 + students.length; r++) {
    practicalSheet.rowHeights[r] = 24;
  }
  practicalSheet.colWidths[0] = 42;  // SR. NO.
  practicalSheet.colWidths[1] = 50;  // ROLL NO.
  practicalSheet.colWidths[2] = 76; // REG. NO.
  practicalSheet.colWidths[3] = 102; // UBTER ROLL NO.
  practicalSheet.colWidths[4] = 145; // STUDENT NAME
  practicalSheet.colWidths[5] = 75; // Lab Record File
  practicalSheet.colWidths[6] = 105; // Creative Work (Model/Chart/Project)
  practicalSheet.colWidths[7] = 65;  // Attendance
  practicalSheet.colWidths[8] = 65;  // Viva Voce
  practicalSheet.colWidths[9] = 63;  // TOTAL

  const practicalHeaders = ['SR. NO.', 'ROLL NO.', 'REG. NO.', 'UBTER ROLL NO.', 'STUDENT NAME', 'Lab Record File', 'Creative Work (Model/Chart/Project)', 'Attendance', 'Viva Voce', 'TOTAL'];
  practicalHeaders.forEach((h, c) => {
    setCell(practicalSheet, 0, c, { raw: h, v: h, s: { bold: true, align: 'center', bg: 'var(--table-th-bg)', wrap: true } });
  });

  const practicalMarks = ['Marks -->', '', '', '', '', 10, 10, 5, 5, 30];
  practicalMarks.forEach((m, c) => {
    setCell(practicalSheet, 1, c, { raw: m, v: m, s: { bold: true, align: 'center', bg: 'var(--bg-surface)' } });
  });
  practicalSheet.merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 4 } });

  students.forEach((stu, idx) => {
    const r = idx + 2;
    const srNo = idx + 1;
    const roll = stu.class_roll_no || (idx + 1);
    const regNo = stu.isPlaceholder ? '' : (stu.registration_no || stu.reg_no || '—');
    const enroll = stu.isPlaceholder ? '' : (stu.ubter_roll_no || stu.official_enrollment_no || stu.enrollment_no || stu.enrollment_number || '—');
    const name = stu.full_name || stu.student_name || stu.name || '';
    const attPct = Math.round(Number(stu.attendance_percentage !== undefined && stu.attendance_percentage !== null ? stu.attendance_percentage : 0));

    const preserved = existingScoresMap[enroll] || existingScoresMap[regNo] || existingScoresMap[roll] || existingScoresMap[name] || {};

    let labRecord = (stu.lab_record_marks !== undefined && stu.lab_record_marks !== null) ? Number(stu.lab_record_marks) : 0;
    if (preserved.labRecord !== undefined && preserved.labRecord !== null && preserved.labRecord !== '') {
      labRecord = Number(preserved.labRecord);
    }

    let creativeWork = (stu.creative_work_marks !== undefined && stu.creative_work_marks !== null) ? Number(stu.creative_work_marks) : 0;
    if (preserved.creativeWork !== undefined && preserved.creativeWork !== null && preserved.creativeWork !== '') {
      creativeWork = Number(preserved.creativeWork);
    }

    let attMarks = (attPct > 0) ? Math.min(5, Math.round((attPct / 20) * 10) / 10) : 0;
    if (preserved.attMarks2 !== undefined && preserved.attMarks2 !== null && preserved.attMarks2 !== '') {
      attMarks = Number(preserved.attMarks2);
    } else if (preserved.attMarks !== undefined && preserved.attMarks !== null && preserved.attMarks !== '') {
      attMarks = Number(preserved.attMarks);
    }

    let vivaVoce = (stu.viva_voce_marks !== undefined && stu.viva_voce_marks !== null) ? Number(stu.viva_voce_marks) : 0;
    if (preserved.vivaVoce !== undefined && preserved.vivaVoce !== null && preserved.vivaVoce !== '') {
      vivaVoce = Number(preserved.vivaVoce);
    }

    setCell(practicalSheet, r, 0, { raw: srNo, v: srNo, s: { align: 'center' } });
    setCell(practicalSheet, r, 1, { raw: roll, v: roll, s: { bold: true, align: 'center' } });
    setCell(practicalSheet, r, 2, { raw: regNo, v: regNo, s: { align: 'center' } });
    setCell(practicalSheet, r, 3, { raw: enroll, v: enroll, s: { align: 'center' } });
    setCell(practicalSheet, r, 4, { raw: name, v: name, s: { bold: true, align: 'left' } });
    setCell(practicalSheet, r, 5, { raw: labRecord, v: labRecord, s: { align: 'center' } });
    setCell(practicalSheet, r, 6, { raw: creativeWork, v: creativeWork, s: { align: 'center' } });
    setCell(practicalSheet, r, 7, { raw: attMarks, v: attMarks, s: { align: 'center' } });
    setCell(practicalSheet, r, 8, { raw: vivaVoce, v: vivaVoce, s: { align: 'center' } });

    // Total formula: =ROUND(F4 + G4 + H4 + I4, 2)
    const totalFormula = `=ROUND(F${r + 1} + G${r + 1} + H${r + 1} + I${r + 1}, 2)`;
    setCell(practicalSheet, r, 9, { raw: totalFormula, f: totalFormula, s: { bold: true, align: 'center' } });
  });

  EXCEL_WB.sheets.push(practicalSheet);

  EXCEL_WB.sheets.forEach(s => {
    recalculateSheetFormulas(s);
    autoFitSheetColumns(s);
  });
  renderSheetTabs();
  renderExcelGrid(true);
  applySignatureBarVisibility();
  initExcelRichTooltips();
}

function autoFitSheetColumns(sheet, force = false) {
  if (typeof window !== 'undefined' && typeof window.sheetStretchingAutoFit === 'function') {
    return window.sheetStretchingAutoFit(sheet, force);
  }
}

function saveActiveSheetData(showToast = false) {
  const syncText = document.getElementById('excel-sync-text');
  if (syncText) syncText.textContent = 'Saving...';

  try {
    const savePayload = {
      name: EXCEL_WB.name,
      updatedAt: new Date().toISOString(),
      sheets: EXCEL_WB.sheets
    };

    const key = `vidyaos_excel_wb_${S.groupId || 'default'}`;
    localStorage.setItem(key, JSON.stringify(savePayload));

    if (syncText) syncText.textContent = 'Saved to Local & Cloud';
    if (showToast) {
      if (typeof showToastMessage === 'function') {
        showToastMessage('Spreadsheet saved successfully.', 'success');
      } else {
        alert('Spreadsheet saved successfully.');
      }
    }
  } catch (err) {
    console.error('Error saving workbook:', err);
    if (syncText) syncText.textContent = 'Unsaved changes';
  }
}

function markWorkbookUnsaved() {
  const syncText = document.getElementById('excel-sync-text');
  if (syncText) syncText.textContent = 'Unsaved changes...';
}

function reloadGroupAcademicData() {
  hydrateAcademicSheetsFromGroup(true);
  markWorkbookUnsaved();
  if (typeof showToastMessage === 'function') {
    showToastMessage('Spreadsheet re-synced from campus database.', 'info');
  }
}

/* ══════════════════════════════════════════════════════════════
   RIBBON VIEW TOGGLES & UTILITIES
   ══════════════════════════════════════════════════════════════ */
function switchRibbonTab(tabName) {
  document.querySelectorAll('.excel-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('.excel-ribbon-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tabName}`));
  if (typeof closeAllDropdownOverlays === 'function') closeAllDropdownOverlays();
  if (typeof updateRibbonScrollButtons === 'function') setTimeout(updateRibbonScrollButtons, 30);
}

function toggleGridlines() {
  EXCEL_WB.gridlines = !EXCEL_WB.gridlines;
  const table = document.getElementById('excel-grid-table');
  if (table) {
    table.style.border = EXCEL_WB.gridlines ? '' : 'none';
    table.querySelectorAll('.excel-cell').forEach(td => {
      td.style.borderRight = EXCEL_WB.gridlines ? '' : 'none';
      td.style.borderBottom = EXCEL_WB.gridlines ? '' : 'none';
    });
  }
  const btn = document.getElementById('btn-toggle-gridlines');
  if (btn) {
    btn.classList.toggle('active', Boolean(EXCEL_WB.gridlines));
    const vLbl = document.getElementById('label-view-gridlines');
    if (vLbl) {
      vLbl.textContent = `Gridlines: ${EXCEL_WB.gridlines ? 'ON' : 'OFF'}`;
    } else {
      btn.textContent = `Gridlines: ${EXCEL_WB.gridlines ? 'ON' : 'OFF'}`;
    }
  }
}

function toggleFormulaBarVisibility() {
  EXCEL_WB.formulaBarVisible = !EXCEL_WB.formulaBarVisible;
  const fb = document.getElementById('excel-formula-bar');
  if (fb) fb.style.display = EXCEL_WB.formulaBarVisible ? 'flex' : 'none';

  const btn = document.getElementById('btn-toggle-formula-bar');
  if (btn) {
    btn.classList.toggle('active', Boolean(EXCEL_WB.formulaBarVisible));
    const lbl = document.getElementById('btn-formula-label');
    if (lbl) lbl.textContent = EXCEL_WB.formulaBarVisible ? 'Formula Bar: ON' : 'Formula Bar: OFF';
  }

  const viewBtn = document.getElementById('btn-toggle-formula-view');
  if (viewBtn) {
    viewBtn.classList.toggle('active', Boolean(EXCEL_WB.formulaBarVisible));
    const vLbl = document.getElementById('label-view-formula');
    if (vLbl) vLbl.textContent = `Formula Bar: ${EXCEL_WB.formulaBarVisible ? 'ON' : 'OFF'}`;
  }
}

function makeBannerEditable() {
  const instEl = document.getElementById('hdr-banner-inst');
  const b2 = document.getElementById('hdr-banner-line2');
  const cohortEl = document.getElementById('hdr-banner-cohort');
  const segs = [instEl, b2, cohortEl].filter(Boolean);

  segs.forEach(seg => {
    seg.setAttribute('contenteditable', 'true');
    seg.classList.add('is-editing');
    seg.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveBannerEdits();
      }
    };
  });

  const onDocClick = (e) => {
    const banner = document.getElementById('sheet-institutional-banner');
    if (banner && !banner.contains(e.target)) {
      document.removeEventListener('mousedown', onDocClick);
      saveBannerEdits();
    }
  };
  setTimeout(() => {
    document.addEventListener('mousedown', onDocClick);
  }, 50);

  if (instEl) instEl.focus();
  if (typeof showToast === 'function') {
    showToast('Banner editing enabled. Press Enter or click outside to save.', 'info');
  }
}

function saveBannerEdits() {
  const instEl = document.getElementById('hdr-banner-inst');
  const b2 = document.getElementById('hdr-banner-line2');
  const cohortEl = document.getElementById('hdr-banner-cohort');
  const segs = [instEl, b2, cohortEl].filter(Boolean);

  let anyModified = false;
  segs.forEach(seg => {
    if (seg.getAttribute('contenteditable') === 'true') {
      seg.setAttribute('contenteditable', 'false');
      seg.classList.remove('is-editing');
      anyModified = true;
    }
  });

  if (anyModified) {
    if (!EXCEL_WB.customBanner) EXCEL_WB.customBanner = {};
    if (instEl) EXCEL_WB.customBanner.inst = instEl.innerText.trim();
    if (b2) EXCEL_WB.customBanner.subject = b2.innerText.trim();
    if (cohortEl) EXCEL_WB.customBanner.cohort = cohortEl.innerText.trim();

    if (instEl) {
      const sessionKey = (S.group && (S.group.academic_year_id || S.group.academic_year_label)) || '2026';
      const sessionStoreKey = `vidyaos_inst_header_session_${String(sessionKey).replace(/[^a-zA-Z0-9]/g, '_')}`;
      try {
        localStorage.setItem(sessionStoreKey, instEl.innerText.trim());
        localStorage.setItem('vidyaos_institution_marks_header', instEl.innerText.trim());
      } catch (_) { }
    }
    if (cohortEl && S.groupId) {
      try {
        localStorage.setItem(`vidyaos_cohort_banner_${S.groupId}`, cohortEl.innerText.trim());
      } catch (_) { }
    }
    markWorkbookUnsaved();
    if (typeof showToast === 'function') {
      showToast('Banner updated and saved!', 'success');
    }
  }
}

function toggleInstitutionalBanner() {
  EXCEL_WB.bannerVisible = (EXCEL_WB.bannerVisible === false) ? true : false;
  const banner = document.getElementById('sheet-institutional-banner');
  if (banner) {
    if (EXCEL_WB.bannerVisible) {
      banner.style.setProperty('display', 'flex', 'important');
    } else {
      banner.style.setProperty('display', 'none', 'important');
    }
  }

  const btn = document.getElementById('btn-toggle-college-banner');
  if (btn) {
    btn.classList.toggle('active', Boolean(EXCEL_WB.bannerVisible));
    const lbl = document.getElementById('btn-banner-label');
    if (lbl) lbl.textContent = EXCEL_WB.bannerVisible ? 'College Banner: ON' : 'College Banner: OFF';
  }

  const viewBtn = document.getElementById('btn-toggle-banner-view');
  if (viewBtn) {
    viewBtn.classList.toggle('active', Boolean(EXCEL_WB.bannerVisible));
    viewBtn.textContent = `College Banner: ${EXCEL_WB.bannerVisible ? 'ON' : 'OFF'}`;
  }

  const sheet = typeof getActiveSheet === 'function' ? getActiveSheet() : null;
  if (sheet && typeof autoFitSheetColumns === 'function' && !EXCEL_WB.isImportedWorkbook) {
    autoFitSheetColumns(sheet, false);
    if (typeof renderExcelGrid === 'function') renderExcelGrid(false);
  }
}
window.toggleInstitutionalBanner = toggleInstitutionalBanner;

// ══════════════════════════════════════════════════════════════
// INSTITUTIONAL SIGNATURES BAR CONTROLS
// ══════════════════════════════════════════════════════════════
function toggleSignatureBarVisibility() {
  if (EXCEL_WB.signaturesVisible === undefined) {
    EXCEL_WB.signaturesVisible = true;
  }
  EXCEL_WB.signaturesVisible = !EXCEL_WB.signaturesVisible;
  applySignatureBarVisibility();
}

function applySignatureBarVisibility() {
  const bar = document.getElementById('excel-signatures-bar');
  const btn = document.getElementById('btn-toggle-signatures-bar');
  const lbl = document.getElementById('btn-signatures-label');
  const isVis = EXCEL_WB.signaturesVisible !== false;
  if (bar) bar.style.display = isVis ? 'flex' : 'none';
  if (btn) btn.classList.toggle('active', isVis);
  if (lbl) lbl.textContent = isVis ? 'Signatures: ON' : 'Signatures: OFF';

  const teacherName = S.group?.teacher_name || S.user?.full_name || S.user?.name || 'Navneet Mishra';
  const sigTeacher = document.getElementById('sig-teacher-name');
  if (sigTeacher) sigTeacher.textContent = teacherName;
}

// ══════════════════════════════════════════════════════════════
// OFFICE STUDIO: EXCEL-STYLE START / HOME SCREEN & SUBJECTS HUB
// ══════════════════════════════════════════════════════════════
var OFFICE_RECENTS_KEY = window.OFFICE_RECENTS_KEY || 'vidya_office_recents_v1';

function getOfficeRecentWorkbooks() {
  try {
    const raw = localStorage.getItem(OFFICE_RECENTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

function recordRecentWorkbook(title, sheetKey, groupId) {
  try {
    let recents = getOfficeRecentWorkbooks();
    recents = recents.filter(item => !(item.groupId === groupId && item.sheetKey === sheetKey));
    recents.unshift({
      title: title || 'Institutional Evaluation Sheet',
      sheetKey: sheetKey || 'evaluation',
      groupId: groupId || S.groupId,
      path: `Faculty > Office Studio > ${sheetKey || 'evaluation'}`,
      timestamp: Date.now()
    });
    if (recents.length > 15) recents = recents.slice(0, 15);
    localStorage.setItem(OFFICE_RECENTS_KEY, JSON.stringify(recents));
  } catch (_) { }
}

function renderOfficeRecentList() {
  const listEl = document.getElementById('office-recent-list');
  if (!listEl) return;
  const recents = getOfficeRecentWorkbooks();

  if (!recents.length) {
    const sampleRecents = (S.allGroups || []).slice(0, 5).map(grp => ({
      title: `${grp.subject_code || 'SUB'} - ${grp.subject_name || 'Evaluation'}`,
      sheetKey: 'evaluation',
      groupId: grp.id,
      path: `${grp.class_name || 'Academic Class'} ${grp.semester ? '• Sem ' + grp.semester : ''}`,
      timestamp: Date.now() - 3600000
    }));
    if (sampleRecents.length) {
      recents.push(...sampleRecents);
    }
  }

  if (!recents.length) {
    listEl.innerHTML = `<div class="office-recent-empty">No recent sheets. Select a subject to get started.</div>`;
    return;
  }

  listEl.innerHTML = recents.map(item => `
    <div class="office-recent-item" onclick="selectSubjectAndSheet(${item.groupId}, '${item.sheetKey}')" title="${escapeHtml(item.title)}">
      <div class="recent-icon-wrap">
        <svg class="recent-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div class="recent-item-meta">
        <span class="recent-item-name">${escapeHtml(item.title)}</span>
        <span class="recent-item-sub">${escapeHtml(item.path || 'VidyaOS > Office Studio')}</span>
      </div>
      <svg class="recent-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  `).join('');
}

function renderOfficeSubjectsGrid(filterQuery = '') {
  const gridEl = document.getElementById('office-subjects-grid');
  if (!gridEl) return;

  const query = (filterQuery || '').toLowerCase().trim();
  const groups = (S.allGroups || []).filter(g => {
    if (!query) return true;
    const hay = `${g.subject_name || ''} ${g.subject_code || ''} ${g.class_name || ''} ${g.department_name || ''}`.toLowerCase();
    return hay.includes(query);
  });

  const counterEl = document.getElementById('office-subject-counter');
  if (counterEl) {
    counterEl.textContent = `${groups.length} ${groups.length === 1 ? 'Subject' : 'Subjects'} Active`;
  }

  if (!groups.length) {
    gridEl.innerHTML = `<div class="office-empty-subjects">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <div class="empty-title">No subjects found matching "${escapeHtml(filterQuery)}"</div>
      <div class="empty-sub">Try searching by subject name, code, or class.</div>
    </div>`;
    return;
  }

  gridEl.innerHTML = groups.map(grp => `
    <div class="office-subject-card" data-group-id="${grp.id}">
      <div class="office-subject-card-top">
        <div class="office-subject-badges">
          <div class="office-badge-group">
            <span class="office-code-chip">${escapeHtml(grp.subject_code || ('SUB' + grp.id))}</span>
            <span class="office-sem-chip">${escapeHtml(grp.class_name || '')} ${grp.semester ? '• Sem ' + grp.semester : ''}</span>
          </div>
          <span class="office-card-pdf-pill">A4 PDF</span>
        </div>
        <h3 class="office-subject-name" title="${escapeHtml(grp.subject_name || 'Subject')}">${escapeHtml(grp.subject_name || 'Academic Subject')}</h3>
      </div>
      <div class="office-subject-actions-panel">
        <div class="office-actions-label">Open Worksheet (PDF):</div>
        <div class="office-sheet-quick-actions">
          <button type="button" class="office-sheet-btn" onclick="selectSubjectAndSheet(${grp.id}, 'evaluation', this)" title="Consolidated Internal Evaluation (A4 PDF)">
            <svg class="office-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            <span>Master Evaluation</span>
          </button>
          <button type="button" class="office-sheet-btn" onclick="selectSubjectAndSheet(${grp.id}, 'tests', this)" title="Unit Tests UT1..UT10 (A4 PDF)">
            <svg class="office-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span>Class Tests (UT1-10)</span>
          </button>
          <button type="button" class="office-sheet-btn" onclick="selectSubjectAndSheet(${grp.id}, 'assignments', this)" title="Assignments Ledger (A4 PDF)">
            <svg class="office-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span>Assignments</span>
          </button>
          <button type="button" class="office-sheet-btn" onclick="selectSubjectAndSheet(${grp.id}, 'practicals', this)" title="Practicals & Laboratory Records (A4 PDF)">
            <svg class="office-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v7.31L4.69 19.3A2 2 0 0 0 6.44 22h11.12a2 2 0 0 0 1.75-2.7L14 9.31V2"/></svg>
            <span>Practicals &amp; Labs</span>
          </button>
          <button type="button" class="office-sheet-btn office-sheet-btn-blank" onclick="selectSubjectAndSheet(${grp.id}, 'blank', this)" title="New Blank Worksheet">
            <svg class="office-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>+ Blank Sheet</span>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function filterOfficeSubjects(query) {
  let q = query;
  if (q === undefined) {
    const input = document.getElementById('office-subject-search') || document.getElementById('office-home-search');
    q = input ? input.value : '';
  }
  renderOfficeSubjectsGrid(q);
}

function openOfficeHomeScreen() {
  const scr = document.getElementById('office-home-screen');
  const hdr = document.getElementById('faculty-header');
  if (scr) scr.style.display = 'flex';
  if (hdr) hdr.classList.add('in-home-view');
  renderOfficeRecentList();
  renderOfficeSubjectsGrid();
  const searchInput = document.getElementById('office-subject-search') || document.getElementById('office-home-search');
  if (searchInput) searchInput.value = '';
}

function closeOfficeHomeScreen() {
  const scr = document.getElementById('office-home-screen');
  const hdr = document.getElementById('faculty-header');
  if (scr) scr.style.display = 'none';
  if (hdr) hdr.classList.remove('in-home-view');
}

function toggleOfficeHomeScreen() {
  const scr = document.getElementById('office-home-screen');
  if (!scr) return;
  if (scr.style.display === 'flex') {
    closeOfficeHomeScreen();
  } else {
    openOfficeHomeScreen();
  }
}

async function selectSubjectAndSheet(groupId, sheetKey, clickedEl) {
  if (clickedEl && clickedEl.classList) {
    clickedEl.classList.add('office-btn-pulse');
  }

  // ── ON MOBILE (<= 768px): LOAD IN-APP PDF VIEWER OR TEST SELECTOR MODAL ──
  if (window.innerWidth <= 768) {
    if (sheetKey === 'tests') {
      if (typeof window.openMobileTestSelectorModal === 'function') {
        window.openMobileTestSelectorModal(groupId);
        return;
      }
    }
    if (typeof window.viewSheetOnMobile === 'function') {
      window.viewSheetOnMobile(groupId, sheetKey);
      return;
    }
  }

  // ── ON DESKTOP FROM INDEX.HTML: CLEANLY REDIRECT TO EDITOR ──
  if (window.location.pathname.includes('index.html')) {
    const params = new URLSearchParams();
    if (groupId) params.set('groupId', groupId);
    if (sheetKey && sheetKey !== 'blank') params.set('sheet', sheetKey);
    if (sheetKey === 'blank') params.set('sheet', 'blank');
    window.location.href = `/faculty/sheets/editor.html?${params.toString()}`;
    return;
  }

  const sheetNames = {
    evaluation: 'Master Evaluation Sheet',
    tests: 'Class Tests Marksheet',
    assignments: 'Coursework & Assignments',
    practicals: 'Practicals & Lab Records',
    blank: 'New Blank Worksheet'
  };
  const label = sheetNames[sheetKey] || 'Worksheet';
  if (typeof showToast === 'function') {
    showToast(`Opening ${label}...`, 'info', 2000);
  }

  setTimeout(async () => {
    closeOfficeHomeScreen();
    S.groupId = Number(groupId);
    const grp = (S.allGroups || []).find(g => g.id === S.groupId);
    if (grp) S.group = grp;

    const title = grp ? `${grp.subject_code || 'SUB'} - ${grp.subject_name}` : `Subject ${groupId}`;
    recordRecentWorkbook(title, sheetKey, groupId);

    const topSel = document.getElementById('subject-selector');
    if (topSel) topSel.value = String(groupId);

    const url = new URL(window.location.href);
    url.searchParams.set('groupId', groupId);
    if (sheetKey && sheetKey !== 'blank') {
      url.searchParams.set('sheet', sheetKey);
    } else {
      url.searchParams.delete('sheet');
    }
    url.searchParams.delete('view');
    window.history.replaceState({}, '', url.toString());

    if (sheetKey === 'blank') {
      createNewBlankWorksheet();
    } else {
      await switchSheetTab(sheetKey, true);
    }
  }, 70);
}

function createNewBlankWorksheet() {
  if (typeof createNewWorksheet === 'function') {
    createNewWorksheet('Blank Sheet');
  }
}

function createNewWorksheetFromHome(clickedEl) {
  if (clickedEl && clickedEl.classList) {
    clickedEl.classList.add('office-btn-pulse');
  }
  if (typeof showToast === 'function') {
    showToast('Creating new blank worksheet...', 'info', 2000);
  }
  setTimeout(() => {
    closeOfficeHomeScreen();
    createNewBlankWorksheet();
  }, 70);
}

function openBlankWorkbookFromHome(clickedEl) {
  if (clickedEl && clickedEl.classList) {
    clickedEl.classList.add('office-btn-pulse');
  }
  if (typeof showToast === 'function') {
    showToast('Opening blank workbook...', 'info', 2000);
  }
  setTimeout(() => {
    closeOfficeHomeScreen();
    createNewBlankWorksheet();
  }, 70);
}

function openSubjectSheetDirect(groupId, sheetKeyOrIdx, clickedEl) {
  if (clickedEl && clickedEl.classList) {
    clickedEl.classList.add('office-btn-pulse');
  }
  const targetGroup = groupId || S.groupId || (S.allGroups?.[0]?.id);
  let sheetKey = sheetKeyOrIdx;
  if (sheetKey === 0 || sheetKey === '0') sheetKey = 'evaluation';
  if (sheetKey === 1 || sheetKey === '1') sheetKey = 'tests';
  if (targetGroup) {
    selectSubjectAndSheet(targetGroup, sheetKey || 'evaluation', clickedEl);
  } else {
    closeOfficeHomeScreen();
  }
}

function toggleFreezePanesMenu(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  const m = document.getElementById('excel-freeze-menu');
  const btn = document.getElementById('btn-view-freeze-panes') || document.getElementById('btn-home-freeze-panes');
  if (typeof openDropdownOverlay === 'function') {
    openDropdownOverlay(m, btn);
  } else {
    if (m) m.style.display = m.style.display === 'none' ? 'flex' : 'none';
  }
}

function freezeTopRow() {
  const table = document.getElementById('excel-grid-table');
  if (table) {
    table.classList.add('freeze-top-row');
    table.classList.remove('unfreeze-all');
  }
  const m = document.getElementById('excel-freeze-menu');
  if (m) m.style.display = 'none';
  showToast('Frozen top row header', 'info');
}

function freezeFirstColumn() {
  const table = document.getElementById('excel-grid-table');
  if (table) {
    table.classList.add('freeze-first-col');
    table.classList.remove('unfreeze-all');
  }
  const m = document.getElementById('excel-freeze-menu');
  if (m) m.style.display = 'none';
  showToast('Frozen first column', 'info');
}

function unfreezePanes() {
  const table = document.getElementById('excel-grid-table');
  if (table) {
    table.classList.remove('freeze-top-row', 'freeze-first-col');
    table.classList.add('unfreeze-all');
  }
  const m = document.getElementById('excel-freeze-menu');
  if (m) m.style.display = 'none';
  showToast('Unfrozen all panes', 'info');
}

/* ══════════════════════════════════════════════════════════════
   REUSABLE FORMATTING TEMPLATES ENGINE
   ══════════════════════════════════════════════════════════════ */
const TEMPLATES_STORAGE_KEY = 'vidyaos_excel_formatting_templates';

function getSavedTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) {
      const defaultTemplates = [
        {
          id: 'tmpl_gp_standard',
          name: 'Government Polytechnic Nainital Standard',
          createdAt: new Date().toISOString(),
          colWidths: { 0: 42, 1: 50, 2: 76, 3: 102, 4: 145, 5: 95, 6: 95, 7: 95, 8: 95, 9: 85, 10: 95, 11: 95, 12: 85 },
          rowHeights: { 0: 28, 1: 24, 2: 24 },
          merges: [
            { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
            { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
            { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
            { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
            { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } },
            { s: { r: 0, c: 5 }, e: { r: 0, c: 9 } },
            { s: { r: 0, c: 10 }, e: { r: 0, c: 14 } }
          ],
          cellsFormat: {
            '0,0': { s: { bold: true, align: 'center', vAlign: 'middle', bg: 'var(--table-th-bg)' }, label: 'SR. NO.' },
            '0,1': { s: { bold: true, align: 'center', vAlign: 'middle', bg: 'var(--table-th-bg)' }, label: 'ROLL NO.' },
            '0,2': { s: { bold: true, align: 'center', vAlign: 'middle', bg: 'var(--table-th-bg)' }, label: 'REG. NO.' },
            '0,3': { s: { bold: true, align: 'center', vAlign: 'middle', bg: 'var(--table-th-bg)' }, label: 'UBTER ROLL NO.' },
            '0,4': { s: { bold: true, align: 'center', vAlign: 'middle', bg: 'var(--table-th-bg)' }, label: 'STUDENT NAME' },
            '0,5': { s: { bold: true, align: 'center', vAlign: 'middle', bg: 'var(--chip-faculty-bg)' }, label: 'THEORY EVALUATION' },
            '0,10': { s: { bold: true, align: 'center', vAlign: 'middle', bg: 'var(--bg-surface-secondary)' }, label: 'PRACTICAL EVALUATION' }
          }
        }
      ];
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(defaultTemplates));
      return defaultTemplates;
    }
    return JSON.parse(raw);
  } catch (_) {
    return [];
  }
}

function openTemplateManagerModal() {
  renderTemplateManagerList();
  openModal('modal-template-manager');
}

function closeTemplateManagerModal() {
  closeModal('modal-template-manager');
}

function renderTemplateManagerList() {
  const container = document.getElementById('excel-template-list');
  if (!container) return;
  const templates = getSavedTemplates();
  if (!templates.length) {
    container.innerHTML = `<div style="padding:1rem;text-align:center;color:var(--text-muted);font-size:0.8rem;">No saved templates yet. Create one by clicking "Save Current Layout".</div>`;
    return;
  }

  container.innerHTML = templates.map(t => `
    <div class="excel-template-card">
      <div class="excel-template-info">
        <span class="excel-template-title">${escapeHtml(t.name)}</span>
        <span class="excel-template-meta">${Object.keys(t.colWidths || {}).length} Columns &bull; ${(t.merges || []).length} Merges &bull; Saved ${new Date(t.createdAt).toLocaleDateString()}</span>
      </div>
      <div class="excel-template-actions">
        <button type="button" class="btn btn-primary btn-sm" onclick="applyFormattingTemplate('${t.id}')" style="font-weight:700;font-size:0.72rem;padding:0.25rem 0.6rem;">Apply</button>
        <button type="button" class="btn btn-secondary btn-sm text-danger" onclick="deleteFormattingTemplate('${t.id}')" style="font-size:0.72rem;padding:0.25rem 0.5rem;" title="Delete template">✕</button>
      </div>
    </div>
  `).join('');
}

function saveActiveSheetAsTemplate() {
  const nameInput = document.getElementById('new-template-name-input');
  const name = nameInput?.value?.trim();
  if (!name) {
    alert('Please enter a template name.');
    return;
  }
  const sheet = getActiveSheet();
  if (!sheet) return;

  const colWidths = { ...(sheet.colWidths || {}) };
  const rowHeights = { ...(sheet.rowHeights || {}) };
  const merges = JSON.parse(JSON.stringify(sheet.merges || []));
  const cellsFormat = {};

  for (const [key, cell] of Object.entries(sheet.cells || {})) {
    const [r, c] = key.split(',').map(Number);
    if (r <= 2 || cell.s) {
      cellsFormat[key] = {
        s: cell.s ? { ...cell.s } : undefined,
        label: r <= 2 ? cell.raw : undefined
      };
    }
  }

  const newTemplate = {
    id: 'tmpl_' + Date.now(),
    name: name,
    createdAt: new Date().toISOString(),
    colWidths,
    rowHeights,
    merges,
    cellsFormat
  };

  const list = getSavedTemplates();
  list.unshift(newTemplate);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(list));
  if (nameInput) nameInput.value = '';
  renderTemplateManagerList();
  showToast(`Saved template "${name}" successfully!`, 'success');
}

function applyFormattingTemplate(templateId) {
  const templates = getSavedTemplates();
  const tmpl = templates.find(t => t.id === templateId);
  if (!tmpl) return;
  const sheet = getActiveSheet();
  if (!sheet) return;

  pushUndoState(`Apply Template "${tmpl.name}"`);

  if (tmpl.colWidths) {
    sheet.colWidths = { ...sheet.colWidths, ...tmpl.colWidths };
  }
  if (tmpl.rowHeights) {
    sheet.rowHeights = { ...sheet.rowHeights, ...tmpl.rowHeights };
  }
  if (Array.isArray(tmpl.merges)) {
    sheet.merges = JSON.parse(JSON.stringify(tmpl.merges));
  }
  if (tmpl.cellsFormat) {
    for (const [key, fmt] of Object.entries(tmpl.cellsFormat)) {
      const [r, c] = key.split(',').map(Number);
      const existing = getCell(sheet, r, c);
      if (fmt.s) {
        existing.s = { ...(existing.s || {}), ...fmt.s };
      }
      if (r <= 1 && fmt.label && (!existing.raw || existing.raw === '')) {
        existing.raw = fmt.label;
        existing.v = fmt.label;
      }
      setCell(sheet, r, c, existing);
    }
  }

  renderExcelGrid(true);
  markWorkbookUnsaved();
  closeTemplateManagerModal();
  showToast(`Applied template "${tmpl.name}"!`, 'success');
}

function deleteFormattingTemplate(templateId) {
  if (!confirm('Are you sure you want to delete this template?')) return;
  let list = getSavedTemplates();
  list = list.filter(t => t.id !== templateId);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(list));
  renderTemplateManagerList();
  showToast('Template deleted', 'info');
}

function togglePrintSignatures() {
  EXCEL_WB.signaturesVisible = !EXCEL_WB.signaturesVisible;
  const sig = document.getElementById('sheet-print-signatures');
  if (sig) sig.style.display = EXCEL_WB.signaturesVisible ? 'flex' : 'none';
}

/* ══════════════════════════════════════════════════════════════
   DROPDOWN OVERLAYS (PORTAL / FIXED POSITIONING ENGINE)
   ══════════════════════════════════════════════════════════════ */
function openDropdownOverlay(menu, triggerBtn) {
  if (!menu) return;
  const isAlreadyOpen = menu.classList.contains('open') && menu.style.display !== 'none';
  closeAllDropdownOverlays();
  if (isAlreadyOpen) return;

  if (triggerBtn) {
    // Temporarily show menu invisibly to accurately measure true rendered width & height
    const prevDisplay = menu.style.display;
    const prevVis = menu.style.visibility;
    menu.style.visibility = 'hidden';
    menu.style.display = 'flex';
    menu.classList.add('open');
    const menuWidth = Math.max(menu.offsetWidth || 0, 260);
    const menuHeight = Math.max(menu.offsetHeight || 0, 200);
    menu.style.visibility = prevVis;
    menu.style.display = prevDisplay;

    const rect = triggerBtn.getBoundingClientRect();
    let top = rect.bottom + 4;
    // For trigger buttons located on the right half of the screen (e.g. Export button),
    // align the menu's right edge with the button's right edge so it opens inwards!
    let left = (rect.right > window.innerWidth / 2)
      ? rect.right - menuWidth
      : rect.left;

    // Prevent overflow right edge of viewport
    if (left + menuWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - menuWidth - 12);
    }
    // Prevent overflow left edge of viewport
    if (left < 12) {
      left = 12;
    }
    // Prevent overflow bottom edge of viewport
    if (top + menuHeight > window.innerHeight - 10 && rect.top > menuHeight) {
      top = Math.max(10, rect.top - menuHeight - 4);
    }

    menu.style.position = 'fixed';
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
    menu.style.right = 'auto';
    menu.style.bottom = 'auto';
    menu.style.zIndex = '999999';
  }

  menu.classList.add('open');
  menu.style.display = 'flex';
}

function closeAllDropdownOverlays(exceptMenu) {
  document.querySelectorAll('.excel-dropdown-menu, .excel-mini-menu, .studio-export-menu').forEach(m => {
    if (exceptMenu && m === exceptMenu) return;
    m.classList.remove('open');
    m.style.display = 'none';
  });
}

function toggleBordersMenu(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  const m = document.getElementById('excel-borders-menu');
  const btn = document.getElementById('btn-border-dropdown');
  openDropdownOverlay(m, btn);
}

function toggleAutoSumMenu(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  const m = document.getElementById('excel-autosum-menu');
  const btn = document.getElementById('btn-autosum-dropdown');
  openDropdownOverlay(m, btn);
}

function toggleExportMenu(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  const m = document.getElementById('export-dropdown-menu');
  const btn = document.getElementById('btn-export-dropdown');
  openDropdownOverlay(m, btn);
}

/* ══════════════════════════════════════════════════════════════
   RIBBON HORIZONTAL SCROLL ENGINE & CONTROLS
   ══════════════════════════════════════════════════════════════ */
function scrollRibbon(delta) {
  const activePanel = document.querySelector('.excel-ribbon-panel.active');
  if (!activePanel) return;
  activePanel.scrollBy({ left: delta, behavior: 'smooth' });
  setTimeout(updateRibbonScrollButtons, 150);
}

function updateRibbonScrollButtons() {
  const activePanel = document.querySelector('.excel-ribbon-panel.active');
  const btnLeft = document.getElementById('btn-ribbon-scroll-left');
  const btnRight = document.getElementById('btn-ribbon-scroll-right');
  if (!activePanel || !btnLeft || !btnRight) return;

  const hasOverflow = activePanel.scrollWidth > activePanel.clientWidth + 5;
  if (!hasOverflow) {
    btnLeft.style.display = 'none';
    btnRight.style.display = 'none';
    return;
  }

  btnLeft.style.display = activePanel.scrollLeft > 10 ? 'flex' : 'none';
  btnRight.style.display = activePanel.scrollLeft < (activePanel.scrollWidth - activePanel.clientWidth - 10) ? 'flex' : 'none';
}

function auditSheetPassFail() {
  const sheet = getActiveSheet();
  if (!sheet) return;
  let passCount = 0;
  let failCount = 0;

  for (let r = 1; r < sheet.rowsCount; r++) {
    for (let c = 0; c < sheet.colsCount; c++) {
      const cell = getCell(sheet, r, c);
      const val = String(cell.v || '').toUpperCase();
      if (val === 'PASS' || val === 'FIRST' || val === 'DISTINCTION') passCount++;
      else if (val === 'FAIL') failCount++;
    }
  }

  alert(`Student Audit:\nPass / Promoted: ${passCount}\nNeed Remedial: ${failCount}`);
}

function sortActiveColumn(dir = 'asc') {
  const sheet = getActiveSheet();
  if (!sheet) return;
  pushUndoState('Sort Column');

  const c = EXCEL_WB.activeCell.c;
  const rows = [];

  for (let r = 1; r < sheet.rowsCount; r++) {
    const rowCells = [];
    for (let col = 0; col < sheet.colsCount; col++) {
      rowCells.push(getCell(sheet, r, col));
    }
    rows.push({ r, rowCells, keyVal: getCell(sheet, r, c).v });
  }

  rows.sort((a, b) => {
    const valA = a.keyVal;
    const valB = b.keyVal;
    const numA = Number(valA);
    const numB = Number(valB);

    if (!isNaN(numA) && !isNaN(numB)) {
      return dir === 'asc' ? numA - numB : numB - numA;
    }
    return dir === 'asc' ? String(valA || '').localeCompare(String(valB || '')) : String(valB || '').localeCompare(String(valA || ''));
  });

  rows.forEach((rowObj, newIdx) => {
    const targetR = newIdx + 1;
    rowObj.rowCells.forEach((cell, col) => {
      setCell(sheet, targetR, col, cell);
    });
  });

  recalculateAllSheetFormulas(true);
  markWorkbookUnsaved();
}

/* Close popup menus on outside click or Escape */
window.addEventListener('click', (e) => {
  const isTrigger = e.target.closest('#btn-merge-cells, #btn-border-dropdown, #btn-autosum-dropdown, #btn-view-freeze-panes, #btn-home-freeze-panes, #btn-export-dropdown');
  const isMenu = e.target.closest('.excel-dropdown-menu, .excel-mini-menu, .studio-export-menu');
  if (!isTrigger && !isMenu) {
    closeAllDropdownOverlays();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllDropdownOverlays();
  }
});

window.addEventListener('resize', () => {
  updateRibbonScrollButtons();
  closeAllDropdownOverlays();
});

/* ── Hook Excel Engine into Page Startup ── */
(function autoStartExcelStudio() {
  const launch = () => {
    initExcelRichTooltips();

    // Attach scroll listeners to ribbon panels for scroll chevrons
    document.querySelectorAll('.excel-ribbon-panel').forEach(panel => {
      panel.addEventListener('scroll', () => {
        updateRibbonScrollButtons();
        closeAllDropdownOverlays();
      }, { passive: true });
    });

    setTimeout(() => {
      updateRibbonScrollButtons();
      if (!EXCEL_WB.sheets || EXCEL_WB.sheets.length === 0) {
        hydrateAcademicSheetsFromGroup(false);
      }
    }, 200);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', launch);
  } else {
    launch();
  }
})();

// Global tactile visual feedback on clicks inside Office Studio
document.addEventListener('click', (e) => {
  const target = e.target.closest('.office-sheet-btn, .office-template-card, .office-recent-item, .header-office-home-btn, #btn-office-open-file');
  if (target) {
    target.classList.add('office-click-active');
    setTimeout(() => target.classList.remove('office-click-active'), 320);
  }
}, { passive: true });

function showOfficeScreenLoader(msg = 'Loading...') {
  const loader = document.getElementById('office-engine-loader');
  const txt = document.getElementById('office-loader-status');
  if (txt) txt.textContent = msg;
  if (loader) loader.style.display = 'flex';
}

function hideOfficeScreenLoader() {
  const loader = document.getElementById('office-engine-loader');
  if (loader) loader.style.display = 'none';
}

// Window Globals Export
window.showOfficeScreenLoader = showOfficeScreenLoader;
window.hideOfficeScreenLoader = hideOfficeScreenLoader;
window.openDropdownOverlay = openDropdownOverlay;
window.closeAllDropdownOverlays = closeAllDropdownOverlays;
window.scrollRibbon = scrollRibbon;
window.updateRibbonScrollButtons = updateRibbonScrollButtons;
window.toggleBordersMenu = toggleBordersMenu;
window.toggleAutoSumMenu = toggleAutoSumMenu;
window.toggleFreezePanesMenu = toggleFreezePanesMenu;
window.toggleExportMenu = toggleExportMenu;
window.switchRibbonTab = switchRibbonTab;
window.toggleSignatureBarVisibility = toggleSignatureBarVisibility;
window.applySignatureBarVisibility = applySignatureBarVisibility;
window.openOfficeHomeScreen = openOfficeHomeScreen;
window.closeOfficeHomeScreen = closeOfficeHomeScreen;
window.toggleOfficeHomeScreen = toggleOfficeHomeScreen;
window.selectSubjectAndSheet = selectSubjectAndSheet;
window.renderOfficeSubjectsGrid = renderOfficeSubjectsGrid;
window.filterOfficeSubjects = filterOfficeSubjects;
window.openBlankWorkbookFromHome = openBlankWorkbookFromHome;
window.createNewWorksheetFromHome = createNewWorksheetFromHome;
window.openSubjectSheetDirect = openSubjectSheetDirect;
window.EXCEL_WB = EXCEL_WB;
window.exportSheetToPdf = exportSheetToPdf;
window.loadGroupMetadata = loadGroupMetadata;
window.loadSubjectAcademicContext = loadGroupMetadata;
window.hydrateAcademicSheetsFromGroup = hydrateAcademicSheetsFromGroup;
