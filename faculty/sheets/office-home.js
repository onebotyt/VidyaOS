/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VIDYAOS OFFICE STUDIO — LIGHTWEIGHT START SCREEN & MODULAR LAZY LOADER
 * File: frontend/faculty/sheets/office-home.js
 * 
 * Purpose:
 *   - Boots the Office Studio Home Screen in < 50ms with a < 20 KB footprint.
 *   - Defers heavy spreadsheet calculation engine (sheets.js ~450 KB) and
 *     ExcelJS (exceljs.min.js ~800 KB) until the user actually opens a sheet.
 *   - Provides visual tactile feedback, animated transitions, and session caching.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Global Shared State (Shared seamlessly with sheets.js when loaded)
var S = window.S = window.S || {
  groupId: null,
  registerId: null,
  allGroups: [],
  group: null,
  user: null,
  activeSheet: 'evaluation'
};

var OFFICE_RECENTS_KEY = window.OFFICE_RECENTS_KEY = window.OFFICE_RECENTS_KEY || 'vidya_office_recents_v1';

/**
 * Helper to escape HTML safely
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Dynamic Script Loader Utility (Promise-based with cache check)
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    // Check if script already injected in DOM
    const existing = document.querySelector(`script[src*="${src}"]`);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        return resolve();
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = (err) => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

function showOfficeScreenLoader(msg = 'Loading...') {
  const loader = document.getElementById('office-engine-loader');
  const txt = document.getElementById('office-loader-status');
  if (txt) txt.textContent = msg;
  if (loader) {
    loader.style.display = 'flex';
    loader.classList.remove('hidden');
    // Clear any previous timer
    if (window._officeLoaderTimer) clearTimeout(window._officeLoaderTimer);
    // Hard safety ceiling: loader can NEVER stay visible for more than 2500ms under any circumstance
    window._officeLoaderTimer = setTimeout(() => {
      hideOfficeScreenLoader();
    }, 2500);
  }
}

function hideOfficeScreenLoader() {
  const loader = document.getElementById('office-engine-loader');
  if (loader) {
    loader.style.display = 'none';
    loader.classList.add('hidden');
  }
  if (window._officeLoaderTimer) {
    clearTimeout(window._officeLoaderTimer);
    window._officeLoaderTimer = null;
  }
}

/**
 * Lazy Loads the Full Spreadsheet Engine (ExcelJS + sheets.js)
 * Caches in memory so subsequent launches are instantaneous (0ms network request).
 */
async function loadSpreadsheetEngine(onReady) {
  if (window.__OFFICE_ENGINE_LOADED) {
    if (typeof onReady === 'function') {
      await onReady();
    }
    return;
  }

  showOfficeScreenLoader('Loading...');

  try {
    // 1. Load ExcelJS if not already present
    if (typeof ExcelJS === 'undefined') {
      await loadScript('/faculty/components/core/exceljs.min.js');
    }

    // 2. Load the main Sheets Studio engine
    await loadScript('/faculty/sheets/sheets.js?v=20261120_real');

    window.__OFFICE_ENGINE_LOADED = true;

    if (typeof onReady === 'function') {
      await onReady();
    }

    // Safety fallback to hide loader quickly so buttons never freeze
    setTimeout(() => {
      hideOfficeScreenLoader();
    }, 1200);
  } catch (err) {
    console.error('Fatal error loading spreadsheet engine:', err);
    hideOfficeScreenLoader();
    if (typeof showToast === 'function') {
      showToast('Could not load spreadsheet engine. Check your connection.', 'error', 4000);
    }
  }
}

// Allow Escape key to dismiss stuck loader at any time
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideOfficeScreenLoader();
  }
});

/**
 * Recent Workbooks Management
 */
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
      path: `${S.group?.class_name || 'Academic Class'} ${S.group?.semester ? '• Sem ' + S.group.semester : ''}`,
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
    listEl.innerHTML = `<div class="office-recent-empty">No recent sheets. Select a subject below to begin.</div>`;
    return;
  }

  listEl.innerHTML = recents.map(item => `
    <div class="office-recent-item" onclick="selectSubjectAndSheet(${item.groupId}, '${item.sheetKey}', this)" title="${escapeHtml(item.title)}">
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

/**
 * Render Ultra-Compact Teaching Subject Cards
 */
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
        </div>
        <h3 class="office-subject-name" title="${escapeHtml(grp.subject_name || 'Subject')}">${escapeHtml(grp.subject_name || 'Academic Subject')}</h3>
      </div>
      <div class="office-subject-actions-panel">
        <div class="office-actions-label">Open Worksheet:</div>
        <div class="office-sheet-quick-actions">
          <button type="button" class="office-sheet-btn" onclick="selectSubjectAndSheet(${grp.id}, 'evaluation', this)" title="Consolidated Internal Evaluation">
            <svg class="office-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            <span>Master Evaluation</span>
          </button>
          <button type="button" class="office-sheet-btn" onclick="selectSubjectAndSheet(${grp.id}, 'tests', this)" title="Unit Tests (UT1..UT10)">
            <svg class="office-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span>Class Tests (UT1-10)</span>
          </button>
          <button type="button" class="office-sheet-btn" onclick="selectSubjectAndSheet(${grp.id}, 'assignments', this)" title="Assignments Ledger">
            <svg class="office-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span>Coursework</span>
          </button>
          <button type="button" class="office-sheet-btn" onclick="selectSubjectAndSheet(${grp.id}, 'practicals', this)" title="Practicals & Laboratory Records">
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
    const input = document.getElementById('office-subject-search');
    q = input ? input.value : '';
  }
  renderOfficeSubjectsGrid(q);
}

/**
 * Start Screen Open / Close State Management
 */
function openOfficeHomeScreen() {
  const scr = document.getElementById('office-home-screen');
  const hdr = document.getElementById('faculty-header');
  if (scr) scr.style.display = 'flex';
  if (hdr) hdr.classList.add('in-home-view');
  renderOfficeRecentList();
  renderOfficeSubjectsGrid();
  const searchInput = document.getElementById('office-subject-search');
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

/**
 * Click Handlers with Visual Tactile Feedback & Lazy Loading
 */
async function selectSubjectAndSheet(groupId, sheetKey, clickedEl) {
  if (clickedEl && clickedEl.classList) {
    clickedEl.classList.add('office-btn-pulse');
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

  showOfficeScreenLoader('Loading...');

  // Small delay allows tactile button pulse to be seen and felt
  setTimeout(() => {
    loadSpreadsheetEngine(async () => {
      closeOfficeHomeScreen();
      const targetGroupId = Number(groupId);
      S.groupId = targetGroupId;
      const grp = (S.allGroups || []).find(g => Number(g.id) === targetGroupId);
      if (grp) S.group = grp;

      const title = grp ? `${grp.subject_code || 'SUB'} - ${grp.subject_name}` : `Subject ${targetGroupId}`;
      recordRecentWorkbook(title, sheetKey, targetGroupId);

      const topSel = document.getElementById('group-switcher-select') || document.getElementById('subject-selector');
      if (topSel) topSel.value = String(targetGroupId);

      const url = new URL(window.location.href);
      url.searchParams.set('groupId', targetGroupId);
      if (sheetKey && sheetKey !== 'blank') {
        url.searchParams.set('sheet', sheetKey);
      } else {
        url.searchParams.delete('sheet');
      }
      url.searchParams.delete('view');
      window.history.replaceState({}, '', url.toString());

      // Directly load authentic classroom metadata and students from database
      if (typeof window.loadGroupMetadata === 'function') {
        await window.loadGroupMetadata(targetGroupId);
      } else if (typeof window.onSwitchGroup === 'function') {
        await window.onSwitchGroup(targetGroupId, true);
      }
      if (sheetKey === 'blank') {
        if (typeof createNewWorksheet === 'function') createNewWorksheet('Blank Sheet');
      } else if (typeof switchSheetTab === 'function') {
        await switchSheetTab(sheetKey, true);
      }
      hideOfficeScreenLoader();
    });
  }, 40);
}

function createNewWorksheetFromHome(clickedEl) {
  if (clickedEl && clickedEl.classList) {
    clickedEl.classList.add('office-btn-pulse');
  }
  showOfficeScreenLoader('Loading...');
  if (typeof showToast === 'function') {
    showToast('Creating new blank worksheet...', 'info', 2000);
  }
  setTimeout(() => {
    loadSpreadsheetEngine(() => {
      closeOfficeHomeScreen();
      if (typeof createNewWorksheet === 'function') createNewWorksheet('Blank Sheet');
      hideOfficeScreenLoader();
    });
  }, 40);
}

function openBlankWorkbookFromHome(clickedEl) {
  createNewWorksheetFromHome(clickedEl);
}

function openSubjectSheetDirect(groupId, sheetKeyOrIdx, clickedEl) {
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

/**
 * Global Tactile Visual Feedback on Clicks
 */
document.addEventListener('click', (e) => {
  const target = e.target.closest('.office-sheet-btn, .office-template-card, .office-recent-item, .header-office-home-btn, #btn-office-open-file');
  if (target) {
    target.classList.add('office-click-active');
    setTimeout(() => target.classList.remove('office-click-active'), 320);
  }
}, { passive: true });

/**
 * Fast Boot Initialization (< 40ms)
 */
async function initOfficePortal() {
  try {
    if (typeof requireFacultyAuth === 'function') {
      requireFacultyAuth(['TEACHER', 'HOD']);
    } else if (typeof guardRoute === 'function') {
      guardRoute({ requireRoles: ['TEACHER', 'SYSTEM_ADMIN'] });
    }

    S.user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (S.user) {
      const av = document.getElementById('gc-user-avatar');
      if (av) {
        const initials = (name) => (name || 'DS').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        av.textContent = initials(S.user.full_name || S.user.username || 'DS');
      }
    }

    const params = new URLSearchParams(window.location.search);
    const qId = params.get('groupId') || params.get('group_id') || params.get('id');
    if (qId) S.groupId = Number(qId);
    const qReg = params.get('registerId') || params.get('register_id') || params.get('register');
    if (qReg) S.registerId = Number(qReg);
    const viewParam = params.get('view');
    const isHomeStart = viewParam === 'home' || (!qId && !params.get('sheet'));

    // Purge any stale mock items from localStorage on startup
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith('vidyaos_excel_wb') || k.startsWith('vidyaos_inst_header') || k === 'vidyaos_institution_marks_header') {
          const val = localStorage.getItem(k);
          if (val && (val.includes('24011F') || val.includes('HARSHIT JOSHI') || val.includes('KAPIL BISHT') || val.includes('MANISH TIWARI') || val.includes('8.3') || val.includes('1.82'))) {
            keysToRemove.push(k);
          }
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (_) { }

    // Fetch teaching groups lightweight in background without blocking sheet launch
    apiFetch('/teaching-groups?status=ACTIVE')
      .then(res => {
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          S.allGroups = res.data;
          if (!S.groupId && S.allGroups.length > 0) {
            S.groupId = S.allGroups[0].id;
          }
          if (typeof renderOfficeSubjectsGrid === 'function') {
            renderOfficeSubjectsGrid();
          }
          if (typeof renderGroupSwitcherOptions === 'function') {
            renderGroupSwitcherOptions();
          }
        }
      })
      .catch(err => {
        console.warn('Could not load groups via apiFetch, using offline fallback', err);
      });

    if (isHomeStart) {
      openOfficeHomeScreen();
      hideOfficeScreenLoader();
    } else {
      // Direct deep link to specific sheet -> immediately close home, show brief loader and boot spreadsheet engine
      closeOfficeHomeScreen();
      showOfficeScreenLoader('Loading...');
      loadSpreadsheetEngine();
    }
  } catch (err) {
    console.error('Portal boot error:', err);
    openOfficeHomeScreen();
    hideOfficeScreenLoader();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOfficePortal);
} else {
  initOfficePortal();
}

function navigateBackFromSheets() {
  const params = new URLSearchParams(window.location.search);
  const regId = (window.S && window.S.registerId) || params.get('registerId') || params.get('register_id') || params.get('register');
  const grpId = (window.S && window.S.groupId) || params.get('groupId') || params.get('group_id') || params.get('id');

  if (regId && document.referrer.includes('registers')) {
    window.location.href = `/faculty/registers/index.html?register_id=${regId}`;
  } else if (grpId) {
    window.location.href = `/faculty/classes/index.html?id=${grpId}`;
  } else if (window.history.length > 1 && document.referrer) {
    window.history.back();
  } else {
    window.location.href = '/faculty/dashboard/index.html';
  }
}

function triggerExcelImport() {
  loadSpreadsheetEngine(() => {
    const fileInput = document.getElementById('excel-file-importer');
    if (fileInput) fileInput.click();
    else if (typeof window.importSpreadsheetFile === 'function') window.importSpreadsheetFile();
  });
}

// Global Exports
window.showOfficeScreenLoader = showOfficeScreenLoader;
window.hideOfficeScreenLoader = hideOfficeScreenLoader;
window.openOfficeHomeScreen = openOfficeHomeScreen;
window.closeOfficeHomeScreen = closeOfficeHomeScreen;
window.toggleOfficeHomeScreen = toggleOfficeHomeScreen;
window.renderOfficeRecentList = renderOfficeRecentList;
window.renderOfficeSubjectsGrid = renderOfficeSubjectsGrid;
window.filterOfficeSubjects = filterOfficeSubjects;
window.selectSubjectAndSheet = selectSubjectAndSheet;
window.createNewWorksheetFromHome = createNewWorksheetFromHome;
window.openBlankWorkbookFromHome = openBlankWorkbookFromHome;
window.openSubjectSheetDirect = openSubjectSheetDirect;
window.loadSpreadsheetEngine = loadSpreadsheetEngine;
window.navigateBackFromSheets = navigateBackFromSheets;
window.triggerExcelImport = triggerExcelImport;
