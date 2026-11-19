/**
 * VidyaOS Student Academic Records & Dossiers Controller
 * Replaces Unified Register with a clean, decoupled student records archive.
 * Features:
 * - Filter by Session, Year, Semester, Dynamic Batch, and Search
 * - View full student academic dossier (Demographics, Tests, Attendance, Documents)
 * - Dynamic Semester filtering via checkboxes
 * - Multi-Format Export Engine (Single Student & Full Cohort: Excel, PDF, Word DOC)
 * - Passout and Active cohort handling
 */

(function () {
  'use strict';

  // Auth Gate: Enforce TEACHER / HOD / SYSTEM_ADMIN authentication immediately
  if (typeof requireFacultyAuth === 'function') {
    const user = requireFacultyAuth(['TEACHER', 'HOD', 'SYSTEM_ADMIN', 'FACULTY', 'COMMON_FACULTY_MANAGER']);
    if (!user) return;
  } else if (typeof guardRoute === 'function') {
    const user = guardRoute({ roles: ['TEACHER', 'HOD', 'SYSTEM_ADMIN', 'FACULTY', 'COMMON_FACULTY_MANAGER'] });
    if (!user) return;
  }

  // Unified API helper with transparent token injection, credentials, & auto-refresh
  async function api(url, opts = {}) {
    if (typeof fetchApi === 'function') return await fetchApi(url, opts);
    if (typeof window.FacultyAPI?.fetch === 'function') return await window.FacultyAPI.fetch(url, opts);
    const token = (typeof getAuthToken === 'function' ? getAuthToken() : '') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('authToken');
    const fullUrl = url.startsWith('/api/') ? url : `/api/v1${url.startsWith('/') ? url : '/' + url}`;
    const res = await fetch(fullUrl, {
      ...opts,
      credentials: opts.credentials || 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(opts.headers || {})
      }
    });
    return await res.json();
  }

  // Global State
  const state = {
    filters: {
      session_id: '',
      year: '',
      semester: '',
      batch: '',
      status: 'active',
      search: ''
    },
    filterOptions: {
      sessions: [],
      years: [1, 2, 3],
      semesters: [1, 2, 3, 4, 5, 6],
      batches: []
    },
    students: [],
    activeDossier: null,
    selectedDossierSemesters: [1, 2, 3, 4, 5, 6],
    activeDossierTab: 'tests',
    searchDebounce: null
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `<span>${escapeHtml(msg)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-fade');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  // 1. Load Filter Options
  async function loadFilterOptions() {
    try {
      const json = await api('/student-records/filters');
      if (json && json.success && json.data) {
        state.filterOptions = json.data;
        renderFilterDropdowns();
      }
    } catch (err) {
      console.warn('Failed to load filter options:', err);
    }
  }

  function renderFilterDropdowns() {
    const sessionSelect = document.getElementById('filter-session');
    const batchSelect = document.getElementById('filter-batch');
    const cohortSessionSelect = document.getElementById('export-cohort-session');
    const cohortBatchSelect = document.getElementById('export-cohort-batch');

    // Populate Sessions
    if (sessionSelect && state.filterOptions.sessions) {
      sessionSelect.innerHTML = '<option value="">All Sessions</option>' +
        state.filterOptions.sessions.map(s =>
          `<option value="${s.id}" ${s.is_current ? 'selected' : ''}>${escapeHtml(s.name || s.label)}</option>`
        ).join('');
      const current = state.filterOptions.sessions.find(s => s.is_current);
      if (current) state.filters.session_id = current.id;
    }

    if (cohortSessionSelect && state.filterOptions.sessions) {
      cohortSessionSelect.innerHTML = '<option value="">All Sessions</option>' +
        state.filterOptions.sessions.map(s =>
          `<option value="${s.id}" ${s.is_current ? 'selected' : ''}>${escapeHtml(s.name || s.label)}</option>`
        ).join('');
    }

    // Populate Batches
    if (batchSelect && state.filterOptions.batches) {
      batchSelect.innerHTML = '<option value="">All Batches</option>' +
        state.filterOptions.batches.map(b =>
          `<option value="${b.passing_year}">${escapeHtml(b.label)}</option>`
        ).join('');
    }

    if (cohortBatchSelect && state.filterOptions.batches) {
      cohortBatchSelect.innerHTML = '<option value="">All Batches</option>' +
        state.filterOptions.batches.map(b =>
          `<option value="${b.passing_year}">${escapeHtml(b.label)}</option>`
        ).join('');
    }
  }

  // 2. Load Student Records
  async function loadStudentRecords() {
    const tbody = document.getElementById('rec-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="rec-loading-cell">
            <div class="rec-spinner"></div>
            <span>Fetching academic records...</span>
          </td>
        </tr>
      `;
    }

    try {
      const params = new URLSearchParams();
      if (state.filters.session_id) params.set('academic_year_id', state.filters.session_id);
      if (state.filters.year) params.set('year', state.filters.year);
      if (state.filters.semester) params.set('semester', state.filters.semester);
      if (state.filters.batch) params.set('batch', state.filters.batch);
      if (state.filters.status) params.set('status', state.filters.status);
      if (state.filters.search) params.set('search', state.filters.search);

      const json = await api(`/student-records?${params.toString()}`);

      if (json && json.success) {
        state.students = json.students || (json.meta?.is_work_search ? [] : json.data) || [];
        state.records = json.records || (json.meta?.is_work_search ? json.data : []) || [];
        state.isWorkSearch = Boolean(json.meta?.is_work_search);
        state.searchMeta = json.meta || null;
        renderStudentRecords(state.students, state.records);
      } else {
        state.students = [];
        state.records = [];
        state.isWorkSearch = false;
        state.searchMeta = null;
        renderStudentRecords([], []);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
      renderStudentRecords([], []);
    }
  }

  function renderStudentRecords(students, records = []) {
    // 1. SECTION 1: Showing Students
    const tbody = document.getElementById('rec-table-body');
    const stuCountEl = document.getElementById('rec-students-count') || document.getElementById('rec-records-count');
    const cohortTag = document.getElementById('rec-active-cohort-tag');

    if (stuCountEl) {
      stuCountEl.textContent = `Showing ${students.length} student${students.length === 1 ? '' : 's'}`;
    }

    if (cohortTag) {
      let desc = 'All Cohorts';
      if (state.filters.search && state.filters.search.trim()) {
        desc = `Search • ${escapeHtml(state.filters.search.trim())}`;
      } else if (state.filters.semester) {
        desc = `Semester ${state.filters.semester}`;
      } else if (state.filters.year) {
        desc = `Year ${state.filters.year}`;
      }
      if (state.filters.batch) desc += ` • Batch ${state.filters.batch}`;
      cohortTag.textContent = desc;
    }

    if (tbody) {
      if (!students || students.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="rec-empty-cell">
              No student records found matching the active filters.
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = students.map((s, idx) => {
          const roll = s.class_roll_no || idx + 1;
          const enroll = s.official_enrollment_no || '--';
          const name = s.full_name || 'Unnamed Student';
          const reg = s.registration_no ? `Reg: ${s.registration_no}` : '';
          const cohort = s.current_semester ? `Y${s.current_year || Math.ceil(s.current_semester / 2)} • Sem ${s.current_semester}` : '--';
          const batch = s.batch_label || (s.admission_year ? `Batch ${s.admission_year}` : '--');
          const attPct = typeof s.attendance_percentage === 'number' ? s.attendance_percentage : 100;

          let badgeClass = '';
          if (attPct < 75) badgeClass = 'low';
          else if (attPct < 80) badgeClass = 'warning';

          return `
            <tr id="student-row-${s.id}">
              <td class="rec-roll-cell">${escapeHtml(String(roll))}</td>
              <td class="col-enrollment rec-enroll-cell">${escapeHtml(enroll)}</td>
              <td>
                <div class="rec-name-cell">
                  <span class="rec-student-name">${escapeHtml(name)}</span>
                  ${reg ? `<span class="rec-student-reg">${escapeHtml(reg)}</span>` : ''}
                </div>
              </td>
              <td class="col-cohort">${cohort}</td>
              <td class="col-batch">${escapeHtml(batch)}</td>
              <td>
                <span class="rec-att-badge ${badgeClass}">${attPct}%</span>
              </td>
              <td class="rec-action-cell">
                <button type="button" class="rec-kebab-btn" onclick="toggleRecordKebab(event, ${s.id})" title="Actions" aria-label="Actions">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                    <circle cx="12" cy="19" r="2"></circle>
                  </svg>
                </button>
                <div class="rec-dropdown-menu" id="rec-dropdown-${s.id}">
                  <button type="button" class="rec-dropdown-item" onclick="openStudentDossier(${s.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <span>View Academic Dossier</span>
                  </button>
                  <button type="button" class="rec-dropdown-item" onclick="quickExportBioData(${s.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Export Personal Details (Bio-Data)</span>
                  </button>
                  <button type="button" class="rec-dropdown-item" onclick="quickExportStudent(${s.id}, 'excel')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <span>Export Dossier (.xlsx)</span>
                  </button>
                  <button type="button" class="rec-dropdown-item" onclick="quickExportStudent(${s.id}, 'doc')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    <span>Export Dossier (.doc)</span>
                  </button>
                  <button type="button" class="rec-dropdown-item" onclick="quickExportStudent(${s.id}, 'pdf')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 6 2 18 2 18 9"></polyline>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                      <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    <span>Export / Print Dossier (PDF)</span>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // 2. SECTION 2: Showing Records
    const secRecords = document.getElementById('sec-showing-records');
    const recCountEl = document.getElementById('rec-records-count');
    const workBadgeEl = document.getElementById('rec-work-badge');
    const workTbody = document.getElementById('rec-work-table-body');

    const hasActiveSearch = Boolean(state.filters.search && state.filters.search.trim());

    if (secRecords && workTbody) {
      if (records && records.length > 0) {
        secRecords.style.display = 'block';

        if (recCountEl) {
          const wt = state.searchMeta?.work_type ? state.searchMeta.work_type.toLowerCase() : 'coursework';
          const subj = state.searchMeta?.subject ? ` for ${state.searchMeta.subject.toUpperCase()}` : '';
          recCountEl.textContent = `Showing ${records.length} ${wt} record${records.length === 1 ? '' : 's'}${subj}`;
        }

        if (workBadgeEl) {
          workBadgeEl.textContent = state.searchMeta?.work_type ? `Work Search • ${state.searchMeta.work_type}` : 'All Class Work';
        }

        workTbody.innerHTML = records.map((item, idx) => {
          const roll = item.class_roll_no || idx + 1;
          const enroll = item.official_enrollment_no || '--';
          const name = item.full_name || 'Student';
          const cohort = item.current_semester ? `Y${item.current_year || Math.ceil(item.current_semester / 2)} • Sem ${item.current_semester}` : '--';
          const batch = item.batch_label || '--';
          const workTitle = item.assessment_title || 'Coursework Item';
          const subName = item.subject_name || '';
          const docPath = item.file_path;
          const docName = item.original_filename || `${roll}_${slugifyToken(name)}_${slugifyToken(workTitle)}.pdf`;
          const hasDoc = Boolean(docPath);
          const marks = item.marks_obtained;
          const maxMarks = item.max_marks || 100;
          const marksText = marks !== null && marks !== undefined ? `${marks} / ${maxMarks}` : 'Ungraded';

          return `
            <tr id="work-item-row-${item.assessment_id}-${item.student_id}">
              <td class="rec-roll-cell">${escapeHtml(String(roll))}</td>
              <td class="col-enrollment rec-enroll-cell">${escapeHtml(enroll)}</td>
              <td>
                <div class="rec-name-cell">
                  <span class="rec-student-name">${escapeHtml(name)}</span>
                  <span class="rec-work-badge" title="${escapeHtml(workTitle)}">
                    ${escapeHtml(workTitle)}${subName ? ` • ${escapeHtml(subName)}` : ''}
                  </span>
                </div>
              </td>
              <td class="col-cohort">${cohort}</td>
              <td class="col-batch">${escapeHtml(batch)}</td>
              <td class="rec-doc-cell" style="text-align: center;">
                ${hasDoc ? `
                  <div class="rec-doc-actions">
                    <button type="button" class="btn-rec-doc btn-rec-view" onclick="openDocumentPreview('${escapeHtml(docPath)}', '${escapeHtml(docName)}', '${escapeHtml(name)}', '${escapeHtml(workTitle)}')" title="Preview file without downloading">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <span>View</span>
                    </button>
                    <a href="${escapeHtml(docPath)}" download="${escapeHtml(docName)}" class="btn-rec-doc btn-rec-download" title="Download ${escapeHtml(docName)}">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      <span>Download</span>
                    </a>
                  </div>
                ` : `
                  <span class="rec-doc-pending">No submission</span>
                `}
              </td>
              <td class="rec-marks-cell" style="text-align: center;">
                <button type="button" class="btn-rec-marks" onclick="handleMarksClick(${item.student_id}, ${item.assessment_id}, '${escapeHtml(name)}', '${escapeHtml(workTitle)}', ${marks !== null && marks !== undefined ? marks : 'null'}, ${maxMarks}, '${escapeHtml(item.submission_status || 'PENDING')}', '${escapeHtml(item.feedback || '')}')" title="Click to view evaluation sheet">
                  <span class="marks-score ${marks !== null && marks !== undefined ? 'has-score' : 'pending-score'}">${marksText}</span>
                </button>
              </td>
            </tr>
          `;
        }).join('');
      } else if (hasActiveSearch) {
        secRecords.style.display = 'block';
        if (recCountEl) recCountEl.textContent = 'Showing 0 records';
        if (workBadgeEl) workBadgeEl.textContent = 'No Records Found';
        workTbody.innerHTML = `
          <tr>
            <td colspan="7" class="rec-empty-cell">
              No coursework records found matching the active search query.
            </td>
          </tr>
        `;
      } else {
        secRecords.style.display = 'none';
      }
    }
  }

  function slugifyToken(str) {
    if (!str) return 'item';
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 15);
  }

  // Document In-Browser Preview
  window.openDocumentPreview = function (filePath, fileName, studentName, assessmentTitle) {
    const modal = document.getElementById('modal-document-preview');
    const titleEl = document.getElementById('preview-doc-title');
    const metaEl = document.getElementById('preview-doc-meta');
    const bodyEl = document.getElementById('preview-doc-body');
    const dlBtn = document.getElementById('preview-doc-download-btn');
    if (!modal || !bodyEl) return;

    if (titleEl) titleEl.textContent = fileName || 'Document Preview';
    if (metaEl) metaEl.textContent = `Submitted by ${studentName || 'Student'} • ${assessmentTitle || 'Coursework'}`;
    if (dlBtn) {
      dlBtn.href = filePath;
      dlBtn.download = fileName || 'document.pdf';
    }

    const cleanPath = (filePath || '').split('?')[0];
    const ext = cleanPath.split('.').pop().toLowerCase();

    if (ext === 'pdf') {
      bodyEl.innerHTML = `
        <iframe src="${filePath}#toolbar=1" style="width:100%; height:100%; border:none; background:#ffffff;"></iframe>
      `;
    } else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      bodyEl.innerHTML = `
        <div style="padding:1.5rem; display:flex; align-items:center; justify-content:center; width:100%; height:100%;">
          <img src="${filePath}" alt="${escapeHtml(fileName)}" style="max-width:100%; max-height:100%; border-radius:8px; object-fit:contain; box-shadow:0 4px 20px rgba(0,0,0,0.15);" />
        </div>
      `;
    } else {
      bodyEl.innerHTML = `
        <div style="text-align:center; padding:3rem 1.5rem; color:var(--text-main);">
          <div style="font-size:3.5rem; margin-bottom:1rem;">📄</div>
          <h4 style="margin:0 0 0.5rem 0; font-size:1.1rem; font-weight:700;">${escapeHtml(fileName)}</h4>
          <p style="color:var(--text-muted); margin:0 0 1.5rem 0; font-size:0.88rem;">Direct in-browser preview is not supported for this file format.</p>
          <a href="${filePath}" download="${escapeHtml(fileName)}" class="btn-rec-doc btn-rec-download" style="padding:0.6rem 1.25rem; font-size:0.9rem; display:inline-flex;">
            Download File (${ext.toUpperCase()})
          </a>
        </div>
      `;
    }

    modal.style.display = 'flex';
  };

  window.closeDocumentPreview = function () {
    const modal = document.getElementById('modal-document-preview');
    if (modal) modal.style.display = 'none';
    const bodyEl = document.getElementById('preview-doc-body');
    if (bodyEl) bodyEl.innerHTML = '';
  };

  // Marks Click Handler (Mobile Table vs PC Excel Sheet)
  window.handleMarksClick = function (studentId, assessmentId, studentName, assessmentTitle, marks, maxMarks, status, feedback) {
    if (window.innerWidth < 769) {
      // Mobile: Show Marks Table modal!
      openMobileMarksModal({ studentId, assessmentId, studentName, assessmentTitle, marks, maxMarks, status, feedback });
    } else {
      // PC: Open High-Fidelity Evaluation Sheet Studio!
      const lower = (assessmentTitle || '').toLowerCase();
      let cwType = 'TEST_1';
      if (lower.includes('assignment') || lower.includes('assinment')) cwType = 'ASSIGNMENT';
      else if (lower.includes('lab') || lower.includes('practical')) cwType = 'PRACTICAL';
      else if (lower.includes('test 2') || lower.includes('ut2')) cwType = 'TEST_2';

      window.openClassworkViewDirect(cwType, state.filters.semester || 5);
    }
  };

  /* ══════════════════════════════════════════════════════════════
     CLASSWORK EVALUATION SHEETS & MULTI-FORMAT EXPORT STUDIO
     ══════════════════════════════════════════════════════════════ */

  window.openClassworkExportModal = function () {
    const modal = document.getElementById('modal-export-records');
    if (!modal) return;
    const semSelect = document.getElementById('export-classwork-semester');
    if (semSelect && state.filters.semester) {
      semSelect.value = state.filters.semester;
    }
    modal.style.display = 'flex';
  };

  window.closeClassworkExportModal = function () {
    const modal = document.getElementById('modal-export-records');
    if (modal) modal.style.display = 'none';
  };

  window.onExportClassworkTypeChange = function (val) {
    // Dynamic reaction if needed
  };

  window.openClassworkViewDirect = async function (type = 'TEST_1', sem = 5) {
    try {
      showToast('Loading evaluation sheet studio...', 'info');
      const json = await api(`/student-records/classwork-sheet?semester=${sem}&classwork_type=${type}`);
      if (json && json.success && json.data) {
        window.renderSheetPreview(json.data);
        const modal = document.getElementById('modal-sheet-preview');
        if (modal) modal.style.display = 'flex';
      } else {
        showToast('Unable to load evaluation sheet data', 'error');
      }
    } catch (err) {
      console.error('Failed to load classwork sheet:', err);
      showToast('Error loading evaluation sheet: ' + err.message, 'error');
    }
  };

  window.triggerViewClassworkSheet = async function () {
    const typeSelect = document.getElementById('export-classwork-type');
    const semSelect = document.getElementById('export-classwork-semester');
    const classworkType = typeSelect ? typeSelect.value : 'TEST_1';
    const semester = semSelect ? semSelect.value : (state.filters.semester || '5');

    window.closeClassworkExportModal();
    await window.openClassworkViewDirect(classworkType, semester);
  };

  window.triggerExportClassworkSheet = async function () {
    const typeSelect = document.getElementById('export-classwork-type');
    const semSelect = document.getElementById('export-classwork-semester');
    const classworkType = typeSelect ? typeSelect.value : 'TEST_1';
    const semester = semSelect ? semSelect.value : (state.filters.semester || '5');

    let fmt = 'xlsx';
    const fmtRadio = document.querySelector('input[name="export-classwork-fmt"]:checked');
    if (fmtRadio) fmt = fmtRadio.value;

    window.closeClassworkExportModal();

    try {
      showToast(`Generating ${fmt.toUpperCase()} evaluation sheet...`, 'info');
      const json = await api(`/student-records/classwork-sheet?semester=${semester}&classwork_type=${classworkType}`);
      if (json && json.success && json.data) {
        await window.executeClassworkExport(fmt, json.data);
      } else {
        showToast('Unable to generate export data', 'error');
      }
    } catch (err) {
      console.error('Failed to export classwork sheet:', err);
      showToast('Export failed: ' + err.message, 'error');
    }
  };

  window.closeSheetPreviewModal = function () {
    const modal = document.getElementById('modal-sheet-preview');
    if (modal) modal.style.display = 'none';
  };

  window.downloadPreviewSheet = async function (format) {
    if (!state.activePreviewSheetData) {
      showToast('No active evaluation sheet loaded', 'warning');
      return;
    }
    await window.executeClassworkExport(format, state.activePreviewSheetData);
  };

  window.renderSheetPreview = function (sheetData) {
    state.activePreviewSheetData = sheetData;
    const titleEl = document.getElementById('preview-sheet-title');
    const subtitleEl = document.getElementById('preview-sheet-subtitle');
    const container = document.getElementById('sheet-preview-container');
    if (!container) return;

    if (titleEl) {
      titleEl.textContent = sheetData.meta.title || 'Internal Evaluation Sheet';
    }
    if (subtitleEl) {
      subtitleEl.textContent = `${sheetData.meta.institution_name} • ${sheetData.meta.session_label} • Sem ${sheetData.meta.semester}`;
    }

    container.innerHTML = window.generateEvaluationSheetHtml(sheetData);
  };

  window.generateEvaluationSheetHtml = function (sheetData) {
    if (!sheetData) return '<div style="padding:2rem;text-align:center;">No data available</div>';

    const meta = sheetData.meta || {};
    const roster = sheetData.roster || [];

    // Case 1: Single Unit Test (Image 3 design)
    if (sheetData.type === 'SINGLE_TEST') {
      const test = sheetData.test || {};
      const questions = test.questions || [];
      const instructions = test.instructions || [];
      const details = test.details || {};
      const totalCols = 5 + questions.length + 1 + 1;

      return `
        <table class="excel-table sheet-table" id="table-sheet-preview-single-test">
          <thead>
            <tr class="excel-hdr-blue row-1">
              <th colspan="${totalCols}">
                <h3>${escapeHtml(meta.institution_name)} | ${escapeHtml(meta.session_label)}</h3>
              </th>
            </tr>
            <tr class="excel-hdr-blue row-2">
              <th colspan="${totalCols}">
                Internal Evaluation - ${escapeHtml(test.title)} | Subject : ${escapeHtml(meta.subject_name)}
              </th>
            </tr>
            <tr class="excel-hdr-blue row-3">
              <th colspan="${totalCols}">
                ${escapeHtml(meta.department_code)} Year ${meta.year} | Semester ${meta.semester}
              </th>
            </tr>

            <tr class="excel-hdr-tan">
              <th rowspan="2" class="col-sr" style="width:50px; vertical-align:middle;">SR. NO.</th>
              <th rowspan="2" class="col-roll" style="width:80px; vertical-align:middle;">ROLL NO.</th>
              <th rowspan="2" class="col-reg" style="width:120px; vertical-align:middle;">REG. NO.</th>
              <th rowspan="2" class="col-enroll" style="width:120px; vertical-align:middle;">ENROLLMENT NO.</th>
              <th rowspan="2" class="col-name" style="width:200px; vertical-align:middle;">STUDENT NAME</th>
              <th colspan="${questions.length}" class="col-test" style="text-align:center;">${escapeHtml(test.short_title)} (${escapeHtml(test.title)})</th>
              <th rowspan="2" class="col-total" style="width:70px; vertical-align:middle; text-align:center;">Total</th>
              <th class="col-side-panel" style="min-width:380px; text-align:center;">Unit Test Details (Mode : ${escapeHtml(details.mode || 'OFFLINE')})</th>
            </tr>

            <tr class="excel-hdr-sub">
              ${questions.map(q => `
                <th class="col-test" style="min-width:50px; font-weight:800; text-align:center;">Q${q.num}</th>
              `).join('')}
              <th class="excel-meta-bar col-side-panel" style="font-size:0.74rem; font-weight:700; padding:0.35rem 0.6rem; text-align:center;">
                Maximum Marks : ${test.max_marks} | Time : ${escapeHtml(details.time || '50 Minutes')} | Date : ${escapeHtml(details.date || '15/10/2026')}
              </th>
            </tr>

            <tr class="excel-hdr-numbers">
              <th class="col-sr">—</th>
              <th class="col-roll">—</th>
              <th class="col-reg">—</th>
              <th class="col-enroll">—</th>
              <th class="col-name" style="text-align:right; padding-right:0.6rem; font-weight:700;">Max Marks &rarr;</th>
              ${questions.map(q => `
                <th class="col-test" style="text-align:center; color:var(--color-primary); font-weight:800;">${q.max}</th>
              `).join('')}
              <th class="col-total" style="text-align:center;">
                <span class="excel-hdr-num-badge">${test.max_marks}</span>
              </th>
              <th class="col-side-panel" style="font-size:0.72rem; color:var(--text-muted); font-weight:700; text-align:center; padding:0.25rem 0.6rem;">
                ${escapeHtml(details.subNote || 'Question Max Marks Row (Auto Calculated & Live Editable)')}
              </th>
            </tr>
          </thead>
          <tbody>
            ${roster.map((r, rIdx) => {
              const isAb = Boolean(r.is_absent);
              return `
                <tr class="${isAb ? 'is-absent' : ''}">
                  <td class="col-sr cell-read-only">${rIdx + 1}</td>
                  <td class="col-roll cell-read-only" style="font-weight:700; color:var(--color-primary);">${escapeHtml(String(r.class_roll_no || rIdx + 1))}</td>
                  <td class="col-reg cell-read-only" style="font-family:var(--font-family-mono); font-size:0.76rem; color:var(--text-muted);">${escapeHtml(r.registration_no || '—')}</td>
                  <td class="col-enroll cell-read-only" style="font-family:var(--font-family-mono); font-size:0.76rem; color:var(--text-muted);">${escapeHtml(r.official_enrollment_no || '—')}</td>
                  <td class="col-name" style="font-weight:700;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span>${escapeHtml(r.full_name)}</span>
                      <span style="font-size:0.7rem; color:${isAb ? 'var(--status-absent)' : 'var(--status-present)'};">${isAb ? 'Absent' : 'Present'}</span>
                    </div>
                  </td>
                  ${questions.map((q, qIdx) => {
                    const score = isAb ? 0 : (r.question_scores ? r.question_scores[qIdx] : 0);
                    return `<td class="col-test cell-read-only">${score}</td>`;
                  }).join('')}
                  <td class="col-total cell-read-only" style="font-weight:800; ${isAb ? 'color:var(--status-absent);' : ''}">${isAb ? '0 (AB)' : r.total_marks}</td>
                  ${rIdx === 0 ? `
                    <td rowspan="${roster.length || 1}" class="col-side-panel">
                      <div class="excel-side-content">
                        <div class="excel-side-sec-title">Instructions :</div>
                        <ol class="excel-side-instructions">
                          ${instructions.map(ins => `<li style="margin-bottom:0.25rem;">${escapeHtml(ins)}</li>`).join('')}
                        </ol>
                        <div class="excel-side-sec-title" style="margin-top:0.85rem;">Questions :</div>
                        <div class="excel-side-questions">
                          ${questions.map(q => `<div style="margin-bottom:0.35rem;"><strong>Q${q.num}:</strong> <span>${escapeHtml(q.text)}</span> <strong>(${q.max} Marks)</strong></div>`).join('')}
                        </div>
                        <div class="sheet-note-red">${escapeHtml(details.noteRed || 'NOTE : All marked as RED were absent.')}</div>
                      </div>
                    </td>
                  ` : ''}
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr class="excel-summary-row">
              <td colspan="5" style="text-align:right; font-weight:700;">Average of the class (Only present students)</td>
              <td colspan="${questions.length + 1}" style="text-align:center; font-weight:800; color:var(--color-primary);">${meta.class_average} / ${test.max_marks}</td>
              <td style="text-align:center; font-size:0.76rem; font-weight:700; color:var(--text-muted);">
                Present: ${meta.present_count} &nbsp;|&nbsp; Absent: ${meta.absent_count} &nbsp;|&nbsp; Total: ${meta.total_students}
              </td>
            </tr>
          </tfoot>
        </table>
      `;
    }

    // Case 2, 3, 4: All Tests, Assignments, or Labs (Image 4 design)
    const items = sheetData.items || [];
    const totalCols = 5 + items.length + 2;

    return `
      <table class="excel-table sheet-table" id="table-sheet-preview-multi">
        <thead>
          <tr class="excel-hdr-blue row-1">
            <th colspan="${totalCols}">
              <h3>${escapeHtml(meta.institution_name)} | ${escapeHtml(meta.session_label)}</h3>
            </th>
          </tr>
          <tr class="excel-hdr-blue row-2">
            <th colspan="${totalCols}">
              Department (${escapeHtml(meta.department_code)}) | ${escapeHtml(meta.title)} | Subject : ${escapeHtml(meta.subject_name)}
            </th>
          </tr>
          <tr class="excel-hdr-blue row-3">
            <th colspan="${totalCols}">
              ${escapeHtml(meta.department_code)} Year ${meta.year} | Semester ${meta.semester}
            </th>
          </tr>

          <!-- Tan Header Row -->
          <tr class="excel-hdr-tan">
            <th class="col-sr" style="width:50px;">SR. NO.</th>
            <th class="col-roll" style="width:80px;">ROLL NO.</th>
            <th class="col-reg" style="width:120px;">REG. NO.</th>
            <th class="col-enroll" style="width:120px;">ENROLLMENT NO.</th>
            <th class="col-name" style="min-width:200px;">STUDENT NAME</th>
            ${items.map(it => `<th class="col-test" title="${escapeHtml(it.title)}">${escapeHtml(it.short_title)}</th>`).join('')}
            <th class="col-total" style="width:90px; font-weight:800;">Total Marks</th>
            <th class="col-total" style="width:80px; font-weight:800;">Average %</th>
          </tr>

          <!-- Numbers Row -->
          <tr class="excel-hdr-numbers">
            <th class="col-sr">—</th>
            <th class="col-roll">—</th>
            <th class="col-reg">—</th>
            <th class="col-enroll">—</th>
            <th class="col-name" style="text-align:right; padding-right:0.6rem; font-weight:700;">Max Marks &rarr;</th>
            ${items.map(it => `<th class="col-test" style="text-align:center; color:var(--color-primary); font-weight:800;">${it.max_marks}</th>`).join('')}
            <th class="col-total" style="text-align:center;"><span class="excel-hdr-num-badge">${meta.total_max}</span></th>
            <th class="col-total" style="text-align:center;">100%</th>
          </tr>
        </thead>
        <tbody>
          ${roster.map((r, rIdx) => `
            <tr>
              <td class="col-sr cell-read-only">${rIdx + 1}</td>
              <td class="col-roll cell-read-only" style="font-weight:700; color:var(--color-primary);">${escapeHtml(String(r.class_roll_no || rIdx + 1))}</td>
              <td class="col-reg cell-read-only" style="font-family:var(--font-family-mono); font-size:0.76rem; color:var(--text-muted);">${escapeHtml(r.registration_no || '—')}</td>
              <td class="col-enroll cell-read-only" style="font-family:var(--font-family-mono); font-size:0.76rem; color:var(--text-muted);">${escapeHtml(r.official_enrollment_no || '—')}</td>
              <td class="col-name" style="font-weight:700;">${escapeHtml(r.full_name)}</td>
              ${items.map(it => {
                const score = (r.scores && r.scores[it.id] !== undefined) ? r.scores[it.id] : 0;
                return `<td class="col-test cell-read-only">${score}</td>`;
              }).join('')}
              <td class="col-total cell-read-only" style="font-weight:800;">${r.total_marks}</td>
              <td class="col-total cell-read-only" style="font-weight:800; color:${r.average_pct < 50 ? 'var(--status-absent)' : 'var(--status-present)'};">${r.average_pct}%</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="excel-summary-row">
            <td colspan="5" style="text-align:right; font-weight:700;">Class Average:</td>
            ${(meta.col_averages || []).map(avg => `<td class="col-test cell-read-only" style="font-weight:800; color:var(--color-primary);">${avg}</td>`).join('')}
            <td class="col-total cell-read-only" style="font-weight:800;">${meta.class_avg_total}</td>
            <td class="col-total cell-read-only" style="font-weight:800; color:var(--status-present);">${meta.class_avg_pct}%</td>
          </tr>
        </tfoot>
      </table>
    `;
  };

  window.executeClassworkExport = async function (format, sheetData) {
    if (!sheetData) return;
    if (format === 'xlsx') {
      await exportClassworkExcel(sheetData);
    } else if (format === 'pdf') {
      exportClassworkPdf(sheetData);
    } else if (format === 'docx' || format === 'doc') {
      exportClassworkWord(sheetData);
    }
  };

  async function exportClassworkExcel(sheetData) {
    if (typeof ExcelJS === 'undefined') {
      showToast('Excel library loading, please try again', 'info');
      return;
    }
    const wb = new ExcelJS.Workbook();
    wb.creator = 'VidyaOS';
    wb.created = new Date();
    const ws = wb.addWorksheet(sheetData.meta.short_title || 'Evaluation Sheet');

    const colCount = sheetData.type === 'SINGLE_TEST' 
      ? 5 + (sheetData.test?.questions?.length || 4) + 1 
      : 5 + (sheetData.items?.length || 1) + 2;

    const r1 = ws.addRow([`${sheetData.meta.institution_name} | ${sheetData.meta.session_label}`]);
    r1.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    r1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    r1.alignment = { horizontal: 'center' };
    ws.mergeCells(1, 1, 1, colCount);

    const r2 = ws.addRow([`${sheetData.meta.title} | Subject : ${sheetData.meta.subject_name}`]);
    r2.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    r2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    r2.alignment = { horizontal: 'center' };
    ws.mergeCells(2, 1, 2, colCount);

    const r3 = ws.addRow([`${sheetData.meta.department_code} Year ${sheetData.meta.year} | Semester ${sheetData.meta.semester}`]);
    r3.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    r3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    r3.alignment = { horizontal: 'center' };
    ws.mergeCells(3, 1, 3, colCount);

    if (sheetData.type === 'SINGLE_TEST') {
      const qList = sheetData.test?.questions || [];
      const hdr = ['SR. NO.', 'ROLL NO.', 'REG. NO.', 'ENROLLMENT NO.', 'STUDENT NAME', ...qList.map(q => `Q${q.num}`), 'Total'];
      const rHdr = ws.addRow(hdr);
      rHdr.font = { bold: true };
      rHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };

      const maxHdr = ['—', '—', '—', '—', 'Max Marks ->', ...qList.map(q => q.max), sheetData.test.max_marks];
      const rMax = ws.addRow(maxHdr);
      rMax.font = { bold: true };
      rMax.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

      sheetData.roster.forEach((st, idx) => {
        const row = [
          idx + 1,
          st.class_roll_no || idx + 1,
          st.registration_no || '—',
          st.official_enrollment_no || '—',
          st.full_name,
          ...(st.question_scores || [0, 0, 0, 0]),
          st.is_absent ? '0 (AB)' : st.total_marks
        ];
        ws.addRow(row);
      });
    } else {
      const items = sheetData.items || [];
      const hdr = ['SR. NO.', 'ROLL NO.', 'REG. NO.', 'ENROLLMENT NO.', 'STUDENT NAME', ...items.map(it => it.short_title), 'Total Marks', 'Average %'];
      const rHdr = ws.addRow(hdr);
      rHdr.font = { bold: true };
      rHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };

      const maxHdr = ['—', '—', '—', '—', 'Max Marks ->', ...items.map(it => it.max_marks), sheetData.meta.total_max, '100%'];
      const rMax = ws.addRow(maxHdr);
      rMax.font = { bold: true };
      rMax.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

      sheetData.roster.forEach((st, idx) => {
        const scores = items.map(it => (st.scores && st.scores[it.id] !== undefined ? st.scores[it.id] : 0));
        const row = [
          idx + 1,
          st.class_roll_no || idx + 1,
          st.registration_no || '—',
          st.official_enrollment_no || '—',
          st.full_name,
          ...scores,
          st.total_marks,
          `${st.average_pct}%`
        ];
        ws.addRow(row);
      });
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugifyToken(sheetData.meta.title)}_Sem${sheetData.meta.semester}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Excel evaluation sheet downloaded successfully', 'success');
  }

  function exportClassworkPdf(sheetData) {
    const tableHtml = window.generateEvaluationSheetHtml(sheetData);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${escapeHtml(sheetData.meta.title)}</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 0; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
          th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; }
          .excel-hdr-blue th { background: #dbeafe !important; color: #1e3a8a !important; text-align: center; }
          .excel-hdr-tan th { background: #fef3c7 !important; color: #78350f !important; text-align: center; font-weight: bold; }
          .excel-hdr-sub th { background: #f8fafc !important; text-align: center; font-weight: bold; }
          .excel-hdr-numbers th { background: #f1f5f9 !important; text-align: center; font-weight: bold; }
          .cell-read-only { text-align: center; }
          .excel-summary-row { background: #f8fafc; font-weight: bold; }
          .col-side-panel { font-size: 7.5pt; vertical-align: top; }
        </style>
      </head>
      <body>
        ${tableHtml}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1200);
    }, 400);
    showToast('PDF print preview launched', 'info');
  }

  function exportClassworkWord(sheetData) {
    const tableHtml = window.generateEvaluationSheetHtml(sheetData);
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${escapeHtml(sheetData.meta.title)}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 9.5pt; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #999; padding: 4px 6px; }
        .excel-hdr-blue th { background-color: #dbeafe; color: #1e3a8a; text-align: center; }
        .excel-hdr-tan th { background-color: #fef3c7; color: #78350f; text-align: center; font-weight: bold; }
        .excel-hdr-numbers th { background-color: #f1f5f9; text-align: center; font-weight: bold; }
        .cell-read-only { text-align: center; }
      </style>
      </head>
      <body>
        ${tableHtml}
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugifyToken(sheetData.meta.title)}_Sem${sheetData.meta.semester}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Word evaluation sheet downloaded successfully', 'success');
  }

  window.openMobileMarksModal = function (details) {
    const modal = document.getElementById('modal-marks-mobile');
    if (!modal) return;

    const studentEl = document.getElementById('mob-marks-student');
    const assessEl = document.getElementById('mob-marks-assessment');
    const scoreEl = document.getElementById('mob-marks-score');
    const pctEl = document.getElementById('mob-marks-pct');
    const statusEl = document.getElementById('mob-marks-status');
    const feedbackEl = document.getElementById('mob-marks-feedback');
    const dossierBtn = document.getElementById('mob-marks-open-dossier');

    if (studentEl) studentEl.textContent = details.studentName || 'Student';
    if (assessEl) assessEl.textContent = details.assessmentTitle || 'Coursework Item';
    if (scoreEl) {
      if (details.marks !== null && details.marks !== undefined) {
        scoreEl.textContent = `${details.marks} / ${details.maxMarks}`;
      } else {
        scoreEl.textContent = 'Ungraded';
      }
    }
    if (pctEl) {
      if (details.marks !== null && details.marks !== undefined && details.maxMarks > 0) {
        const pct = Math.round((details.marks * 100) / details.maxMarks);
        pctEl.textContent = `${pct}%`;
      } else {
        pctEl.textContent = '--';
      }
    }
    if (statusEl) statusEl.textContent = details.status || 'SUBMITTED';
    if (feedbackEl) feedbackEl.textContent = details.feedback || 'No teacher feedback recorded.';

    if (dossierBtn) {
      dossierBtn.onclick = function () {
        closeMobileMarksModal();
        openStudentDossier(details.studentId, 'tests');
      };
    }

    modal.style.display = 'flex';
  };

  window.closeMobileMarksModal = function () {
    const modal = document.getElementById('modal-marks-mobile');
    if (modal) modal.style.display = 'none';
  };

  // 3. Dropdown Menu Toggle with Dynamic Flip-up
  window.toggleRecordKebab = function (e, id) {
    e.stopPropagation();
    const allDropdowns = document.querySelectorAll('.rec-dropdown-menu');
    const target = document.getElementById(`rec-dropdown-${id}`);

    allDropdowns.forEach(d => {
      if (d !== target) d.classList.remove('show', 'flip-up');
    });

    if (target) {
      const isVisible = target.classList.contains('show');
      if (!isVisible) {
        const btnRect = e.currentTarget.getBoundingClientRect();
        const spaceBelow = window.innerHeight - btnRect.bottom;
        if (spaceBelow < 180) {
          target.classList.add('flip-up');
        } else {
          target.classList.remove('flip-up');
        }
        target.classList.add('show');
      } else {
        target.classList.remove('show', 'flip-up');
      }
    }
  };

  document.addEventListener('click', () => {
    document.querySelectorAll('.rec-dropdown-menu').forEach(d => d.classList.remove('show', 'flip-up'));
  });

  // 4. Filter Handlers
  window.onFilterChange = function () {
    const session = document.getElementById('filter-session')?.value || '';
    const sem = document.getElementById('filter-semester')?.value || '';
    const batch = document.getElementById('filter-batch')?.value || '';
    const status = document.getElementById('filter-status')?.value || 'active';

    state.filters.session_id = session;
    state.filters.semester = sem;
    state.filters.batch = batch;
    state.filters.status = status;

    loadStudentRecords();
  };

  window.onYearFilterChange = function () {
    const yr = document.getElementById('filter-year')?.value || '';
    state.filters.year = yr;

    // Dynamically adjust semester dropdown based on selected year
    const semSelect = document.getElementById('filter-semester');
    if (semSelect) {
      if (yr === '1') {
        semSelect.innerHTML = '<option value="">All Semesters (Year 1)</option><option value="1">Sem 1</option><option value="2">Sem 2</option>';
      } else if (yr === '2') {
        semSelect.innerHTML = '<option value="">All Semesters (Year 2)</option><option value="3">Sem 3</option><option value="4">Sem 4</option>';
      } else if (yr === '3') {
        semSelect.innerHTML = '<option value="">All Semesters (Year 3)</option><option value="5">Sem 5</option><option value="6">Sem 6</option>';
      } else {
        semSelect.innerHTML = `
          <option value="">All Semesters</option>
          <option value="1">Sem 1</option><option value="2">Sem 2</option>
          <option value="3">Sem 3</option><option value="4">Sem 4</option>
          <option value="5">Sem 5</option><option value="6">Sem 6</option>
        `;
      }
      semSelect.value = '';
      state.filters.semester = '';
    }

    loadStudentRecords();
  };

  window.onSearchInput = function (val) {
    clearTimeout(state.searchDebounce);
    state.searchDebounce = setTimeout(() => {
      state.filters.search = (val || '').trim();
      loadStudentRecords();
    }, 280);
  };

  window.resetFilters = function () {
    const sessionSelect = document.getElementById('filter-session');
    const yearSelect = document.getElementById('filter-year');
    const semSelect = document.getElementById('filter-semester');
    const batchSelect = document.getElementById('filter-batch');
    const statusSelect = document.getElementById('filter-status');
    const searchInput = document.getElementById('rec-search-input');

    if (sessionSelect) {
      const current = state.filterOptions.sessions?.find(s => s.is_current);
      sessionSelect.value = current ? current.id : '';
    }
    if (yearSelect) yearSelect.value = '';
    if (semSelect) semSelect.value = '';
    if (batchSelect) batchSelect.value = '';
    if (statusSelect) statusSelect.value = 'active';
    if (searchInput) searchInput.value = '';

    state.filters = {
      session_id: sessionSelect?.value || '',
      year: '',
      semester: '',
      batch: '',
      status: 'active',
      search: ''
    };

    loadStudentRecords();
  };

  // 5. Single Student Dossier Modal
  window.openStudentDossier = async function (studentId) {
    const modal = document.getElementById('modal-student-dossier');
    if (modal) modal.style.display = 'flex';

    state.selectedDossierSemesters = [1, 2, 3, 4, 5, 6];
    document.querySelectorAll('.check-sem-item').forEach(c => c.checked = true);
    const allCheck = document.getElementById('check-sem-all');
    if (allCheck) allCheck.checked = true;

    try {
      const json = await api(`/student-records/${studentId}/dossier`);

      if (json && json.success && json.data) {
        state.activeDossier = json.data;
        populateDossierModal(json.data);
      } else {
        showToast('Could not load student dossier', 'error');
        closeDossierModal();
      }
    } catch (err) {
      console.error(err);
      showToast('Network error loading dossier', 'error');
      closeDossierModal();
    }
  };

  // Assessment Classifier Helper (Mutually exclusive: LAB, ASSIGNMENT, TEST)
  function classifyAssessment(a) {
    const type = String(a.type || '').toUpperCase();
    const title = String(a.title || '').toUpperCase();
    if (type === 'PRACTICAL' || type.includes('LAB') || title.includes('LAB') || title.includes('PRACTICAL') || title.includes('EXPERIMENT')) {
      return 'LAB';
    }
    if (type === 'ASSIGNMENT' || type.includes('ASSIGN') || type.includes('HOMEWORK') || title.includes('ASSIGNMENT') || title.includes('PROJECT')) {
      return 'ASSIGNMENT';
    }
    return 'TEST'; // EXAM, TEST, UNIT_TEST, MID_TERM, etc.
  }

  function populateDossierModal(dossier) {
    state.activeDossier = dossier;
    const p = dossier.profile || {};

    // 1. Avatar Initials
    const avatarEl = document.getElementById('dossier-avatar');
    if (avatarEl) {
      const parts = (p.full_name || 'ST').trim().split(/\s+/);
      avatarEl.textContent = (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
    }

    // 2. Header Title & Identifiers (Clean Unicode bullets)
    const nameEl = document.getElementById('dossier-modal-name');
    if (nameEl) nameEl.textContent = `${p.full_name || 'Student Profile'} - Academic Dossier`;

    const enrollEl = document.getElementById('dossier-enrollment-val');
    if (enrollEl) enrollEl.textContent = p.official_enrollment_no || '--';

    const rollEl = document.getElementById('dossier-roll-val');
    if (rollEl) rollEl.textContent = p.class_roll_no || '--';

    const regEl = document.getElementById('dossier-reg-val');
    if (regEl) regEl.textContent = p.registration_no || '--';

    const batchEl = document.getElementById('dossier-batch-val');
    if (batchEl) batchEl.textContent = p.batch_label ? `Batch ${p.batch_label}` : 'Batch --';

    const cohortEl = document.getElementById('dossier-cohort-val');
    if (cohortEl) cohortEl.textContent = `Sem ${p.current_semester || '--'} (Yr ${p.current_year || '--'})`;

    // 3. Separate Assessments by Category
    const allAssessments = dossier.assessments || [];
    const assignments = allAssessments.filter(a => classifyAssessment(a) === 'ASSIGNMENT');
    const tests = allAssessments.filter(a => classifyAssessment(a) === 'TEST');
    const labs = allAssessments.filter(a => classifyAssessment(a) === 'LAB');

    // 4. Attendance Sessions & Calculations
    const sessions = dossier.attendanceSessions || [];
    const totalHeld = sessions.length;
    const totalAttended = sessions.filter(s => s.attendance_status === 'PRESENT' || s.attendance_status === 'LATE').length;
    const overallPct = totalHeld > 0 ? Math.round((totalAttended * 100) / totalHeld) : 100;

    // 5. Non-Assignment Documents
    const nonAssignDocs = (dossier.documents || []).filter(d => {
      const dtype = String(d.document_type || '').toUpperCase();
      const dtitle = String(d.title || '').toUpperCase();
      return !dtype.includes('ASSIGN') && !dtitle.includes('ASSIGN') && !dtitle.includes('HOMEWORK');
    });

    // 6. Update Status Cards Metrics
    const mAssign = document.getElementById('card-metric-assignments');
    const sAssign = document.getElementById('card-sub-assignments');
    if (mAssign) {
      const evalCount = assignments.filter(a => a.submission_status === 'GRADED' || a.marks_obtained !== null).length;
      mAssign.textContent = `${evalCount}/${assignments.length || 0}`;
      if (sAssign) sAssign.textContent = `${assignments.length} Assigned`;
    }

    const mTests = document.getElementById('card-metric-tests');
    const sTests = document.getElementById('card-sub-tests');
    if (mTests) {
      const scoredCount = tests.filter(t => t.marks_obtained !== null && t.marks_obtained !== undefined).length;
      mTests.textContent = `${scoredCount}/${tests.length || 0}`;
      if (sTests) sTests.textContent = `${tests.length} Scheduled`;
    }

    const mLabs = document.getElementById('card-metric-labs');
    const sLabs = document.getElementById('card-sub-labs');
    if (mLabs) {
      const verifiedCount = labs.filter(l => l.marks_obtained !== null && l.marks_obtained !== undefined).length;
      mLabs.textContent = `${verifiedCount}/${labs.length || 0}`;
      if (sLabs) sLabs.textContent = `${labs.length} Practicals`;
    }

    const mAtt = document.getElementById('card-metric-attendance');
    const sAtt = document.getElementById('card-sub-attendance');
    if (mAtt) {
      mAtt.textContent = `${overallPct}%`;
      if (sAtt) sAtt.textContent = overallPct >= 75 ? 'Eligible' : 'Defaulter';
    }

    const mDocs = document.getElementById('card-metric-documents');
    if (mDocs) {
      mDocs.textContent = `${nonAssignDocs.length} Files`;
    }

    // Set default view to 'assignments'
    selectDossierSection(state.activeDossierSection || 'assignments');
  }
  window.populateDossierModal = populateDossierModal;

  // Active Dossier Section Switcher
  window.selectDossierSection = function (section) {
    state.activeDossierSection = section;

    const cards = ['assignments', 'tests', 'labs', 'attendance', 'documents'];
    cards.forEach(c => {
      const cardEl = document.getElementById(`card-status-${c}`);
      if (cardEl) cardEl.classList.toggle('active', c === section);

      const studioEl = document.getElementById(`section-studio-${c}`);
      if (studioEl) {
        if (c === section) {
          studioEl.classList.add('active');
          studioEl.style.display = 'flex';
        } else {
          studioEl.classList.remove('active');
          studioEl.style.display = 'none';
        }
      }
    });

    renderActiveDossierStudio();
  };

  function renderActiveDossierStudio() {
    if (!state.activeDossier) return;
    const section = state.activeDossierSection || 'assignments';
    const selectedSems = state.selectedDossierSemesters || [1, 2, 3, 4, 5, 6];
    const allAssessments = state.activeDossier.assessments || [];

    if (section === 'assignments') {
      renderAssignmentsStudio(allAssessments.filter(a => classifyAssessment(a) === 'ASSIGNMENT' && selectedSems.includes(Number(a.semester))));
    } else if (section === 'tests') {
      renderTestsStudio(allAssessments.filter(a => classifyAssessment(a) === 'TEST' && selectedSems.includes(Number(a.semester))));
    } else if (section === 'labs') {
      renderLabsStudio(allAssessments.filter(a => classifyAssessment(a) === 'LAB' && selectedSems.includes(Number(a.semester))));
    } else if (section === 'attendance') {
      renderAttendanceMatrixStudio((state.activeDossier.attendanceSessions || []).filter(s => selectedSems.includes(Number(s.semester))));
    } else if (section === 'documents') {
      renderOtherDocumentsStudio(state.activeDossier.documents || []);
    }
  }

  // 1. Assignments Studio & Uploads Renderer
  function renderAssignmentsStudio(assignments) {
    const tbody = document.getElementById('dossier-assignments-body');
    const tfoot = document.getElementById('dossier-assignments-foot');
    const uploadsGrid = document.getElementById('student-assignment-uploads-grid');
    const uploadsCount = document.getElementById('student-assignment-uploads-count');

    if (tbody) {
      if (assignments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="rec-empty-cell">No assignments recorded for selected semesters.</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
      } else {
        let totalMax = 0;
        let totalScored = 0;
        let scoredCount = 0;

        tbody.innerHTML = assignments.map((a, idx) => {
          const max = Number(a.max_marks) || 100;
          totalMax += max;
          const hasScore = a.marks_obtained !== null && a.marks_obtained !== undefined;
          const scored = hasScore ? Number(a.marks_obtained) : null;
          if (hasScore) {
            totalScored += scored;
            scoredCount++;
          }
          const pct = hasScore ? Math.round((scored / max) * 100) : null;
          const status = a.submission_status || (hasScore ? 'GRADED' : 'PENDING');
          const statusClass = status === 'GRADED' ? 'evaluated' : (status === 'SUBMITTED' ? 'submitted' : 'pending');
          const dateStr = a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : '--';

          return `
            <tr>
              <td class="td-num">${idx + 1}</td>
              <td><strong>Sem ${a.semester || '--'}</strong></td>
              <td><code>${escapeHtml(a.subject_code || '--')}</code></td>
              <td>${escapeHtml(a.subject_name || '--')}</td>
              <td><strong>${escapeHtml(a.title || '--')}</strong></td>
              <td class="td-num">${max}</td>
              <td class="td-num">${hasScore ? scored : '--'}</td>
              <td class="td-num">${hasScore ? `${pct}%` : '--'}</td>
              <td><span class="rec-status-pill ${statusClass}">${escapeHtml(status)}</span></td>
              <td>${dateStr}</td>
            </tr>
          `;
        }).join('');

        if (tfoot) {
          const avgPct = scoredCount > 0 ? Math.round((totalScored / (scoredCount * (totalMax / assignments.length))) * 100) : '--';
          tfoot.innerHTML = `
            <tr>
              <td colspan="5" style="text-align:right;"><strong>Total / Evaluation Summary:</strong></td>
              <td class="td-num">${totalMax}</td>
              <td class="td-num">${totalScored}</td>
              <td class="td-num">${avgPct !== '--' ? `${avgPct}%` : '--'}</td>
              <td colspan="2"><strong>${scoredCount} of ${assignments.length} Evaluated</strong></td>
            </tr>
          `;
        }
      }
    }

    // Uploaded Assignment Submissions Grid (Below Excel Sheet)
    if (uploadsGrid) {
      const uploadedAssignments = assignments.filter(a => a.file_path || a.original_filename || a.submission_status === 'SUBMITTED' || a.submission_status === 'GRADED');
      if (uploadsCount) uploadsCount.textContent = `${uploadedAssignments.length} Uploads`;

      if (uploadedAssignments.length === 0) {
        uploadsGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align:center; padding: 2rem; color:var(--text-muted); font-style:italic;">
            No digital assignment files or submission documents uploaded for selected semesters.
          </div>
        `;
      } else {
        uploadsGrid.innerHTML = uploadedAssignments.map(a => {
          let feedbackObj = null;
          if (a.feedback) {
            try {
              feedbackObj = typeof a.feedback === 'string' ? JSON.parse(a.feedback) : a.feedback;
            } catch (e) {
              feedbackObj = { remarks: a.feedback };
            }
          }
          const remarks = feedbackObj?.remarks || (typeof a.feedback === 'string' && !a.feedback.startsWith('{') ? a.feedback : null);
          const fileName = a.original_filename || (a.file_path ? a.file_path.split(/[\/\\]/).pop() : 'Assignment_Submission.pdf');
          const status = a.submission_status || 'SUBMITTED';

          return `
            <div class="rec-upload-card">
              <div class="rec-upload-card-top">
                <div class="rec-upload-file-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <div class="rec-upload-details">
                  <div class="rec-upload-title" title="${escapeHtml(a.title || 'Assignment')}">${escapeHtml(a.title || 'Assignment')}</div>
                  <div class="rec-upload-meta">
                    <span>${escapeHtml(a.subject_code || '')} • Sem ${a.semester}</span>
                    <span>• ${a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : 'Uploaded'}</span>
                  </div>
                </div>
                <span class="rec-status-pill ${status.toLowerCase()}">${escapeHtml(status)}</span>
              </div>
              ${remarks ? `<div class="rec-upload-feedback"><strong>Teacher Remarks:</strong> ${escapeHtml(remarks)}</div>` : ''}
              <div class="rec-upload-actions">
                <span style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-family-mono, monospace);">
                  Marks: <strong>${a.marks_obtained !== null && a.marks_obtained !== undefined ? a.marks_obtained : '--'}</strong> / ${a.max_marks || 100}
                </span>
                <a href="${escapeHtml(a.file_path || '#')}" target="_blank" download="${escapeHtml(fileName)}" class="btn-rec-download-file">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  <span>${escapeHtml(fileName)}</span>
                </a>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // 2. Class Tests & Exams Studio Renderer
  function renderTestsStudio(tests) {
    const tbody = document.getElementById('dossier-tests-body');
    const tfoot = document.getElementById('dossier-tests-foot');
    if (!tbody) return;

    if (tests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="rec-empty-cell">No test or exam records found for selected semesters.</td></tr>`;
      if (tfoot) tfoot.innerHTML = '';
      return;
    }

    let totalMax = 0;
    let totalScored = 0;
    let scoredCount = 0;

    tbody.innerHTML = tests.map((t, idx) => {
      const max = Number(t.max_marks) || 100;
      totalMax += max;
      const hasScore = t.marks_obtained !== null && t.marks_obtained !== undefined;
      const scored = hasScore ? Number(t.marks_obtained) : null;
      if (hasScore) {
        totalScored += scored;
        scoredCount++;
      }
      const pct = hasScore ? Math.round((scored / max) * 100) : null;
      let grade = '--';
      if (pct !== null) {
        if (pct >= 90) grade = 'A+';
        else if (pct >= 80) grade = 'A';
        else if (pct >= 70) grade = 'B+';
        else if (pct >= 60) grade = 'B';
        else if (pct >= 50) grade = 'C';
        else if (pct >= 40) grade = 'Pass';
        else grade = 'Fail';
      }

      return `
        <tr>
          <td class="td-num">${idx + 1}</td>
          <td><strong>Sem ${t.semester || '--'}</strong></td>
          <td><code>${escapeHtml(t.subject_code || '--')}</code></td>
          <td>${escapeHtml(t.subject_name || '--')}</td>
          <td><strong>${escapeHtml(t.title || '--')}</strong></td>
          <td><span class="rec-meta-badge">${escapeHtml(t.component || 'THEORY')}</span></td>
          <td class="td-num">${max}</td>
          <td class="td-num">${hasScore ? scored : '--'}</td>
          <td class="td-num">${hasScore ? `${pct}%` : '--'}</td>
          <td><span class="rec-att-badge ${pct !== null && pct < 40 ? 'low' : ''}">${grade}</span></td>
        </tr>
      `;
    }).join('');

    if (tfoot) {
      const avgPct = scoredCount > 0 ? Math.round((totalScored / totalMax) * 100) : '--';
      tfoot.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:right;"><strong>Total Sessional Marks / Overall Grade:</strong></td>
          <td class="td-num">${totalMax}</td>
          <td class="td-num">${totalScored}</td>
          <td class="td-num">${avgPct !== '--' ? `${avgPct}%` : '--'}</td>
          <td><strong>${scoredCount} Scored</strong></td>
        </tr>
      `;
    }
  }

  // 3. Lab Records Studio Renderer
  function renderLabsStudio(labs) {
    const tbody = document.getElementById('dossier-labs-body');
    const tfoot = document.getElementById('dossier-labs-foot');
    if (!tbody) return;

    if (labs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="rec-empty-cell">No practical or lab records found for selected semesters.</td></tr>`;
      if (tfoot) tfoot.innerHTML = '';
      return;
    }

    let totalMax = 0;
    let totalScored = 0;
    let scoredCount = 0;

    tbody.innerHTML = labs.map((l, idx) => {
      const max = Number(l.max_marks) || 50;
      totalMax += max;
      const hasScore = l.marks_obtained !== null && l.marks_obtained !== undefined;
      const scored = hasScore ? Number(l.marks_obtained) : null;
      if (hasScore) {
        totalScored += scored;
        scoredCount++;
      }
      const pct = hasScore ? Math.round((scored / max) * 100) : null;
      const status = hasScore ? 'Verified' : 'Pending Verification';
      const statusClass = hasScore ? 'evaluated' : 'pending';

      return `
        <tr>
          <td class="td-num">${idx + 1}</td>
          <td><strong>Sem ${l.semester || '--'}</strong></td>
          <td><code>${escapeHtml(l.subject_code || '--')}</code></td>
          <td>${escapeHtml(l.subject_name || '--')}</td>
          <td><strong>${escapeHtml(l.title || '--')}</strong></td>
          <td><span class="rec-meta-badge">PRACTICAL</span></td>
          <td class="td-num">${max}</td>
          <td class="td-num">${hasScore ? scored : '--'}</td>
          <td class="td-num">${hasScore ? `${pct}%` : '--'}</td>
          <td><span class="rec-status-pill ${statusClass}">${status}</span></td>
        </tr>
      `;
    }).join('');

    if (tfoot) {
      const avgPct = scoredCount > 0 ? Math.round((totalScored / totalMax) * 100) : '--';
      tfoot.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:right;"><strong>Total Practical Record Marks:</strong></td>
          <td class="td-num">${totalMax}</td>
          <td class="td-num">${totalScored}</td>
          <td class="td-num">${avgPct !== '--' ? `${avgPct}%` : '--'}</td>
          <td><strong>${scoredCount} Verified</strong></td>
        </tr>
      `;
    }
  }

  // 4. Monthly Attendance Matrix (Day 1 - 31 Grid) Studio Renderer
  function renderAttendanceMatrixStudio(sessions) {
    const headerRow = document.getElementById('matrix-header-row');
    const tbody = document.getElementById('dossier-matrix-body');
    const tfoot = document.getElementById('dossier-matrix-foot');
    if (!tbody) return;

    if (headerRow) {
      let dayCols = '';
      for (let d = 1; d <= 31; d++) {
        dayCols += `<th style="width:24px; min-width:24px; padding:0.4rem 0.15rem;">${d}</th>`;
      }
      headerRow.innerHTML = `
        <th class="col-pinned-left" style="min-width:130px;">Month / Session</th>
        <th style="min-width:140px;">Subject Name</th>
        <th>Code</th>
        ${dayCols}
        <th>Held</th>
        <th>Attended</th>
        <th>Absent</th>
        <th>Att %</th>
        <th>Status</th>
      `;
    }

    if (sessions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="39" class="rec-empty-cell">No attendance recorded for selected semesters.</td></tr>`;
      if (tfoot) tfoot.innerHTML = '';
      return;
    }

    const groups = {};
    sessions.forEach(s => {
      const dateStr = String(s.session_date || '').split('T')[0];
      const monthKey = dateStr ? dateStr.slice(0, 7) : 'Unknown';
      const subKey = s.subject_code || 'General';
      const groupKey = `${monthKey}__${subKey}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          monthKey,
          subject_name: s.subject_name || 'Subject',
          subject_code: s.subject_code || '--',
          days: {},
          held: 0,
          attended: 0,
          absent: 0
        };
      }

      if (dateStr) {
        const dayNum = parseInt(dateStr.slice(8, 10), 10);
        const status = String(s.attendance_status || '').toUpperCase();
        groups[groupKey].days[dayNum] = status;
        groups[groupKey].held++;
        if (status === 'PRESENT' || status === 'LATE') {
          groups[groupKey].attended++;
        } else {
          groups[groupKey].absent++;
        }
      }
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let grandHeld = 0;
    let grandAtt = 0;
    let grandAbs = 0;

    const rows = Object.values(groups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    tbody.innerHTML = rows.map(g => {
      grandHeld += g.held;
      grandAtt += g.attended;
      grandAbs += g.absent;
      const pct = g.held > 0 ? Math.round((g.attended * 100) / g.held) : 100;

      let monthLabel = g.monthKey;
      if (g.monthKey && g.monthKey.includes('-')) {
        const [yr, mo] = g.monthKey.split('-');
        const mIdx = parseInt(mo, 10) - 1;
        monthLabel = `${monthNames[mIdx] || mo} ${yr}`;
      }

      let dayCells = '';
      for (let d = 1; d <= 31; d++) {
        const st = g.days[d];
        if (st === 'PRESENT') {
          dayCells += `<td class="att-day-cell att-p" title="Day ${d}: Present">P</td>`;
        } else if (st === 'ABSENT') {
          dayCells += `<td class="att-day-cell att-a" title="Day ${d}: Absent">A</td>`;
        } else if (st === 'LATE') {
          dayCells += `<td class="att-day-cell att-l" title="Day ${d}: Late">L</td>`;
        } else {
          dayCells += `<td class="att-day-cell att-empty">-</td>`;
        }
      }

      return `
        <tr>
          <td class="col-pinned-left"><strong>${monthLabel}</strong></td>
          <td>${escapeHtml(g.subject_name)}</td>
          <td><code>${escapeHtml(g.subject_code)}</code></td>
          ${dayCells}
          <td class="td-num">${g.held}</td>
          <td class="td-num"><strong>${g.attended}</strong></td>
          <td class="td-num">${g.absent}</td>
          <td><span class="rec-att-badge ${pct < 75 ? 'low' : ''}">${pct}%</span></td>
          <td>${pct >= 75 ? '<span style="color:var(--status-present); font-weight:700;">Eligible</span>' : '<span style="color:var(--status-absent); font-weight:700;">Defaulter</span>'}</td>
        </tr>
      `;
    }).join('');

    if (tfoot) {
      const overallPct = grandHeld > 0 ? Math.round((grandAtt * 100) / grandHeld) : 100;
      tfoot.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:right;"><strong>Total Monthly Attendance Summary:</strong></td>
          <td colspan="31" style="font-size:0.75rem; color:var(--text-muted); text-align:center;">Day 1 to 31 Lecture Attendance Ledger</td>
          <td class="td-num">${grandHeld}</td>
          <td class="td-num"><strong>${grandAtt}</strong></td>
          <td class="td-num">${grandAbs}</td>
          <td><span class="rec-att-badge ${overallPct < 75 ? 'low' : ''}">${overallPct}%</span></td>
          <td><strong>${overallPct >= 75 ? 'Eligible' : 'Defaulter'}</strong></td>
        </tr>
      `;
    }
  }

  // 5. Official Documents Studio Renderer (Excluding assignments)
  function renderOtherDocumentsStudio(documents) {
    const tbody = document.getElementById('dossier-docs-body');
    const countTag = document.getElementById('other-docs-count-tag');
    if (!tbody) return;

    const nonAssignDocs = (documents || []).filter(d => {
      const dtype = String(d.document_type || '').toUpperCase();
      const dtitle = String(d.title || '').toUpperCase();
      return !dtype.includes('ASSIGN') && !dtitle.includes('ASSIGN') && !dtitle.includes('HOMEWORK');
    });

    if (countTag) countTag.textContent = `${nonAssignDocs.length} Official Documents`;

    if (nonAssignDocs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="rec-empty-cell">No official student documents uploaded (excluding assignments).</td></tr>`;
      return;
    }

    tbody.innerHTML = nonAssignDocs.map(d => `
      <tr>
        <td><strong>${escapeHtml(d.title || '--')}</strong></td>
        <td><span class="rec-meta-badge">${escapeHtml(d.document_type || 'DOCUMENT')}</span></td>
        <td>${escapeHtml(d.file_name || '--')}</td>
        <td>${d.file_size ? `${Math.round(d.file_size / 1024)} KB` : '--'}</td>
        <td>${d.created_at ? new Date(d.created_at).toLocaleDateString() : '--'}</td>
        <td>
          <a href="${escapeHtml(d.file_path)}" target="_blank" class="btn-rec-outline" style="text-decoration:none; padding:0.25rem 0.65rem; font-size:0.76rem;">View File</a>
        </td>
      </tr>
    `).join('');
  }

  // Semester Checkbox Handlers (Reactive Dynamic Filtering)
  window.toggleSelectAllSemesters = function (checked) {
    document.querySelectorAll('.check-sem-item').forEach(c => c.checked = checked);
    if (checked) {
      state.selectedDossierSemesters = [1, 2, 3, 4, 5, 6];
    } else {
      state.selectedDossierSemesters = [];
    }
    renderActiveDossierStudio();
  };

  window.onSemesterCheckboxToggle = function () {
    const checked = [];
    document.querySelectorAll('.check-sem-item:checked').forEach(c => {
      checked.push(parseInt(c.value, 10));
    });
    state.selectedDossierSemesters = checked;
    const allBox = document.getElementById('check-sem-all');
    if (allBox) allBox.checked = checked.length === 6;
    renderActiveDossierStudio();
  };

  window.closeDossierModal = function () {
    const modal = document.getElementById('modal-student-dossier');
    if (modal) modal.style.display = 'none';
    state.activeDossier = null;
    const menu = document.getElementById('profile-export-menu');
    if (menu) menu.style.display = 'none';
  };

  // Profile Export Dropdown Menu Toggle
  window.toggleProfileExportMenu = function (e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('profile-export-menu');
    if (!menu) return;
    const isShown = menu.style.display !== 'none';
    menu.style.display = isShown ? 'none' : 'flex';
  };

  window.addEventListener('click', (e) => {
    const menu = document.getElementById('profile-export-menu');
    if (menu && !e.target.closest('.rec-export-btn-group')) {
      menu.style.display = 'none';
    }
  });

  // Dedicated Student Personal Details (Bio-Data) Export
  window.exportStudentPersonalDetails = async function (format = 'pdf') {
    const p = state.activeDossier?.profile;
    if (!p) {
      showToast('Student personal details not available for export', 'error');
      return;
    }
    const menu = document.getElementById('profile-export-menu');
    if (menu) menu.style.display = 'none';

    if (format === 'excel') await exportPersonalDetailsExcel(p);
    else if (format === 'doc') exportPersonalDetailsDoc(p);
    else exportPersonalDetailsPdf(p);
  };

  window.quickExportStudentProfile = async function (studentId, format = 'pdf') {
    try {
      const json = await api(`/student-records/${studentId}/dossier`);
      if (!json || !json.success || !json.data || !json.data.profile) {
        showToast('Could not retrieve student personal details', 'error');
        return;
      }
      const p = json.data.profile;
      if (format === 'excel') await exportPersonalDetailsExcel(p);
      else if (format === 'doc') exportPersonalDetailsDoc(p);
      else exportPersonalDetailsPdf(p);
    } catch (err) {
      console.error(err);
      showToast('Failed to export student personal details', 'error');
    }
  };

  // Dedicated Personal Details Excel Engine
  async function exportPersonalDetailsExcel(p) {
    if (typeof ExcelJS === 'undefined') {
      showToast('Excel engine loading, please try again', 'info');
      return;
    }
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'VidyaOS';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Student Bio-Data');
    ws.columns = [
      { header: 'Profile Field', key: 'field', width: 28 },
      { header: 'Student Detail / KYC Information', key: 'value', width: 45 }
    ];

    ws.addRows([
      { field: 'Full Student Name', value: p.full_name || '--' },
      { field: 'Class Roll No', value: p.class_roll_no || '--' },
      { field: 'Official Enrollment No', value: p.official_enrollment_no || '--' },
      { field: 'UBTER Registration No', value: p.registration_no || '--' },
      { field: "Father's Name", value: p.father_name || '--' },
      { field: "Mother's Name", value: p.mother_name || '--' },
      { field: 'Date of Birth (DOB)', value: p.dob || '--' },
      { field: 'Gender', value: p.gender || '--' },
      { field: 'Category', value: p.category || 'General' },
      { field: 'Aadhar Number', value: p.aadhar_number || '--' },
      { field: 'Contact Email', value: p.email || '--' },
      { field: 'Contact Phone', value: p.phone || '--' },
      { field: 'Permanent Address', value: p.address || '--' },
      { field: 'Department', value: p.department_name || '--' },
      { field: 'Current Cohort', value: `Semester ${p.current_semester || '--'} (Year ${p.current_year || '--'})` },
      { field: 'Academic Batch', value: p.batch_label || '--' },
      { field: 'Admission Year', value: p.admission_year || '--' },
      { field: 'Passing Year', value: p.passing_year || '--' },
      { field: 'Enrollment Status', value: p.status || 'Active' }
    ]);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Student_BioData_${p.class_roll_no || p.id}_${(p.full_name || 'student').replace(/\s+/g, '_')}.xlsx`;
    link.click();
    showToast('Student personal details (.xlsx) exported successfully', 'success');
  }

  // Dedicated Personal Details Word Engine
  function exportPersonalDetailsDoc(p) {
    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Student Bio-Data</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; margin: 2rem; }
        h1 { color: #1e3a8a; font-size: 18pt; margin-bottom: 0.2rem; }
        h2 { color: #2563eb; font-size: 13pt; margin-top: 1.5rem; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 10pt; text-align: left; }
        th { background-color: #f1f5f9; font-weight: bold; width: 30%; color: #334155; }
        td { width: 70%; }
        .meta { font-size: 9pt; color: #64748b; margin-top: 0.25rem; }
        .sig-table { margin-top: 3rem; border: none; }
        .sig-table td { border: none; padding-top: 40px; }
      </style>
      </head>
      <body>
        <h1>VidyaOS — Official Student Personal Profile &amp; Bio-Data</h1>
        <p class="meta">Uttarakhand Board of Technical Education • Department of ${escapeHtml(p.department_name || 'Technical Education')} • Generated: ${new Date().toLocaleDateString()}</p>

        <h2>Student KYC &amp; Demographic Profile</h2>
        <table>
          <tr><th>Full Student Name</th><td><b>${escapeHtml(p.full_name || '--')}</b></td></tr>
          <tr><th>Class Roll Number</th><td><b>${escapeHtml(p.class_roll_no || '--')}</b></td></tr>
          <tr><th>Official Enrollment Number</th><td>${escapeHtml(p.official_enrollment_no || '--')}</td></tr>
          <tr><th>UBTER Registration Number</th><td>${escapeHtml(p.registration_no || '--')}</td></tr>
          <tr><th>Father's Name</th><td>${escapeHtml(p.father_name || '--')}</td></tr>
          <tr><th>Mother's Name</th><td>${escapeHtml(p.mother_name || '--')}</td></tr>
          <tr><th>Date of Birth (DOB)</th><td>${p.dob || '--'}</td></tr>
          <tr><th>Gender / Category</th><td>${escapeHtml(p.gender || '--')} / ${escapeHtml(p.category || 'General')}</td></tr>
          <tr><th>Aadhar Number</th><td>${escapeHtml(p.aadhar_number || '--')}</td></tr>
          <tr><th>Contact Phone</th><td>${escapeHtml(p.phone || '--')}</td></tr>
          <tr><th>Contact Email</th><td>${escapeHtml(p.email || '--')}</td></tr>
          <tr><th>Permanent Address</th><td>${escapeHtml(p.address || '--')}</td></tr>
          <tr><th>Department</th><td>${escapeHtml(p.department_name || '--')}</td></tr>
          <tr><th>Current Cohort</th><td>Semester ${p.current_semester || '--'} (Year ${p.current_year || '--'})</td></tr>
          <tr><th>Academic Batch</th><td>${escapeHtml(p.batch_label || '--')}</td></tr>
          <tr><th>Admission Year / Passing Year</th><td>${p.admission_year || '--'} / ${p.passing_year || '--'}</td></tr>
          <tr><th>Enrollment Status</th><td>${escapeHtml(p.status || 'Active')}</td></tr>
        </table>

        <table class="sig-table">
          <tr>
            <td align="center">_______________________<br><b>Student Signature</b></td>
            <td align="center">_______________________<br><b>Class Counselor / Faculty</b></td>
            <td align="center">_______________________<br><b>Head of Department (HOD)</b></td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Student_BioData_${p.class_roll_no || p.id}_${(p.full_name || 'student').replace(/\s+/g, '_')}.doc`;
    link.click();
    showToast('Student personal details (.doc) exported successfully', 'success');
  }

  // Dedicated Personal Details PDF Engine
  function exportPersonalDetailsPdf(p) {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      showToast('Popup blocker prevented PDF print window. Please allow popups.', 'error');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student Personal Profile &amp; Bio-Data — ${escapeHtml(p.full_name)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; padding: 2rem; margin: 0; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 0.75rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end; }
          .header h1 { margin: 0; font-size: 1.45rem; color: #1e3a8a; }
          .header p { margin: 0.25rem 0 0; font-size: 0.85rem; color: #64748b; }
          .bio-grid { width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-size: 0.88rem; }
          .bio-grid th, .bio-grid td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          .bio-grid th { background: #f8fafc; font-weight: 700; color: #334155; width: 30%; }
          .bio-grid td { width: 70%; }
          .sig-row { display: flex; justify-content: space-between; margin-top: 3.5rem; padding: 0 1rem; }
          .sig-box { text-align: center; border-top: 1px solid #94a3b8; padding-top: 0.5rem; font-size: 0.82rem; width: 180px; }
          @media print {
            body { padding: 0.5rem; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>VidyaOS — Official Student Personal Record &amp; Bio-Data</h1>
            <p>Institution: Uttarakhand Board of Technical Education • Department of ${escapeHtml(p.department_name || 'Information Technology')}</p>
          </div>
          <div><p style="font-size:0.8rem; color:#64748b;">Printed: ${new Date().toLocaleDateString()}</p></div>
        </div>

        <table class="bio-grid">
          <tr><th>Full Student Name</th><td><b>${escapeHtml(p.full_name || '--')}</b></td></tr>
          <tr><th>Class Roll Number</th><td><b>${escapeHtml(p.class_roll_no || '--')}</b></td></tr>
          <tr><th>Official Enrollment No</th><td>${escapeHtml(p.official_enrollment_no || '--')}</td></tr>
          <tr><th>UBTER Registration No</th><td>${escapeHtml(p.registration_no || '--')}</td></tr>
          <tr><th>Father's Name</th><td>${escapeHtml(p.father_name || '--')}</td></tr>
          <tr><th>Mother's Name</th><td>${escapeHtml(p.mother_name || '--')}</td></tr>
          <tr><th>Date of Birth (DOB)</th><td>${p.dob || '--'}</td></tr>
          <tr><th>Gender / Category</th><td>${escapeHtml(p.gender || '--')} / ${escapeHtml(p.category || 'General')}</td></tr>
          <tr><th>Aadhar Number</th><td>${escapeHtml(p.aadhar_number || '--')}</td></tr>
          <tr><th>Contact Phone</th><td>${escapeHtml(p.phone || '--')}</td></tr>
          <tr><th>Contact Email</th><td>${escapeHtml(p.email || '--')}</td></tr>
          <tr><th>Permanent Address</th><td>${escapeHtml(p.address || '--')}</td></tr>
          <tr><th>Department</th><td>${escapeHtml(p.department_name || '--')}</td></tr>
          <tr><th>Current Cohort</th><td>Semester ${p.current_semester || '--'} (Year ${p.current_year || '--'})</td></tr>
          <tr><th>Academic Batch</th><td>${escapeHtml(p.batch_label || '--')}</td></tr>
          <tr><th>Admission / Passing Year</th><td>${p.admission_year || '--'} / ${p.passing_year || '--'}</td></tr>
          <tr><th>Enrollment Status</th><td>${escapeHtml(p.status || 'Active')}</td></tr>
        </table>

        <div class="sig-row">
          <div class="sig-box">Student Signature</div>
          <div class="sig-box">Faculty In-Charge</div>
          <div class="sig-box">Head of Department (Seal)</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
    showToast('Opening print dialog for Student Personal Details...', 'info');
  }

  // 6. Comprehensive Dossier Export Engines
  window.executeSingleStudentExport = function () {
    if (!state.activeDossier) return;

    const doPdf = document.getElementById('export-single-pdf')?.checked;
    const doDoc = document.getElementById('export-single-doc')?.checked;
    const doExcel = document.getElementById('export-single-excel')?.checked;

    if (!doPdf && !doDoc && !doExcel) {
      showToast('Please select at least one format to export', 'warning');
      return;
    }

    const incProfile = document.getElementById('export-inc-profile')?.checked ?? true;
    const incTests = document.getElementById('export-inc-tests')?.checked ?? true;
    const incAssignments = document.getElementById('export-inc-assignments')?.checked ?? true;
    const incLabs = document.getElementById('export-inc-labs')?.checked ?? true;
    const incAttendance = document.getElementById('export-inc-attendance')?.checked ?? true;
    const incDocuments = document.getElementById('export-inc-documents')?.checked ?? true;

    if (!incProfile && !incTests && !incAssignments && !incLabs && !incAttendance && !incDocuments) {
      showToast('Please select at least one data section to include in the dossier', 'warning');
      return;
    }

    const options = {
      incProfile,
      incTests,
      incAssignments,
      incLabs,
      incAttendance,
      incDocuments,
      selectedSemesters: state.selectedDossierSemesters || [1, 2, 3, 4, 5, 6]
    };

    if (doExcel) exportSingleStudentExcel(state.activeDossier, options);
    if (doDoc) exportSingleStudentDoc(state.activeDossier, options);
    if (doPdf) exportSingleStudentPdf(state.activeDossier, options);
  };

  window.quickExportStudent = async function (studentId, format) {
    try {
      const json = await api(`/student-records/${studentId}/dossier`);
      if (!json || !json.success || !json.data) {
        showToast('Could not retrieve student data for export', 'error');
        return;
      }
      const defaultOptions = {
        incProfile: true,
        incTests: true,
        incAssignments: true,
        incLabs: true,
        incAttendance: true,
        incDocuments: true,
        selectedSemesters: [1, 2, 3, 4, 5, 6]
      };
      if (format === 'excel') exportSingleStudentExcel(json.data, defaultOptions);
      else if (format === 'doc') exportSingleStudentDoc(json.data, defaultOptions);
      else if (format === 'pdf') exportSingleStudentPdf(json.data, defaultOptions);
    } catch (err) {
      showToast('Export failed', 'error');
    }
  };

  // Single Student Excel via ExcelJS with selective sections
  async function exportSingleStudentExcel(dossier, options = {}) {
    if (typeof ExcelJS === 'undefined') {
      showToast('Excel engine loading, please try again', 'info');
      return;
    }
    const p = dossier.profile || {};
    const selectedSems = options.selectedSemesters || state.selectedDossierSemesters || [1, 2, 3, 4, 5, 6];
    const allAssessments = dossier.assessments || [];
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'VidyaOS';
    workbook.created = new Date();

    // Sheet 1: Demographic Profile
    if (options.incProfile !== false) {
      const wsProfile = workbook.addWorksheet('Student Profile');
      wsProfile.columns = [
        { header: 'Profile Field', key: 'field', width: 28 },
        { header: 'Student Detail', key: 'value', width: 40 }
      ];
      wsProfile.addRows([
        { field: 'Full Student Name', value: p.full_name || '' },
        { field: 'Class Roll No', value: p.class_roll_no || '' },
        { field: 'Official Enrollment No', value: p.official_enrollment_no || '' },
        { field: 'UBTER Registration No', value: p.registration_no || '' },
        { field: "Father's Name", value: p.father_name || '' },
        { field: "Mother's Name", value: p.mother_name || '' },
        { field: 'Date of Birth (DOB)', value: p.dob || '' },
        { field: 'Gender', value: p.gender || '' },
        { field: 'Category', value: p.category || '' },
        { field: 'Aadhar Number', value: p.aadhar_number || '' },
        { field: 'Contact Email', value: p.email || '' },
        { field: 'Contact Phone', value: p.phone || '' },
        { field: 'Permanent Address', value: p.address || '' },
        { field: 'Department', value: p.department_name || '' },
        { field: 'Current Cohort', value: `Semester ${p.current_semester || ''}` },
        { field: 'Academic Batch', value: p.batch_label || '' }
      ]);
    }

    // Sheet 2: Assessment & Tests
    if (options.incTests !== false) {
      const wsTests = workbook.addWorksheet('Tests & Exams');
      wsTests.columns = [
        { header: 'Semester', key: 'sem', width: 14 },
        { header: 'Subject Code', key: 'code', width: 16 },
        { header: 'Subject Name', key: 'sub', width: 30 },
        { header: 'Assessment Title', key: 'title', width: 35 },
        { header: 'Component', key: 'type', width: 16 },
        { header: 'Max Marks', key: 'max', width: 14 },
        { header: 'Marks Scored', key: 'scored', width: 16 },
        { header: 'Score %', key: 'pct', width: 14 }
      ];
      allAssessments
        .filter(t => classifyAssessment(t) === 'TEST' && selectedSems.includes(Number(t.semester)))
        .forEach(t => {
          const max = t.max_marks || 100;
          const scored = t.marks_obtained !== null ? t.marks_obtained : '--';
          const pct = scored !== '--' ? `${Math.round((scored / max) * 100)}%` : '--';
          wsTests.addRow({
            sem: `Sem ${t.semester || ''}`,
            code: t.subject_code || '',
            sub: t.subject_name || '',
            title: t.title || '',
            type: t.component || 'THEORY',
            max: max,
            scored: scored,
            pct: pct
          });
        });
    }

    // Sheet 3: Coursework & Assignments
    if (options.incAssignments !== false) {
      const wsAssignments = workbook.addWorksheet('Assignments');
      wsAssignments.columns = [
        { header: 'Semester', key: 'sem', width: 14 },
        { header: 'Subject Code', key: 'code', width: 16 },
        { header: 'Subject Name', key: 'sub', width: 30 },
        { header: 'Assignment Title', key: 'title', width: 35 },
        { header: 'Max Marks', key: 'max', width: 14 },
        { header: 'Marks Scored', key: 'scored', width: 16 },
        { header: 'Status', key: 'status', width: 16 },
        { header: 'Submission File', key: 'file', width: 30 }
      ];
      allAssessments
        .filter(a => classifyAssessment(a) === 'ASSIGNMENT' && selectedSems.includes(Number(a.semester)))
        .forEach(a => {
          wsAssignments.addRow({
            sem: `Sem ${a.semester || ''}`,
            code: a.subject_code || '',
            sub: a.subject_name || '',
            title: a.title || '',
            max: a.max_marks || 100,
            scored: a.marks_obtained !== null ? a.marks_obtained : '--',
            status: a.submission_status || 'PENDING',
            file: a.original_filename || (a.file_path ? a.file_path.split(/[\/\\]/).pop() : '--')
          });
        });
    }

    // Sheet 4: Lab Practical Records
    if (options.incLabs !== false) {
      const wsLabs = workbook.addWorksheet('Lab Records');
      wsLabs.columns = [
        { header: 'Semester', key: 'sem', width: 14 },
        { header: 'Subject Code', key: 'code', width: 16 },
        { header: 'Lab Subject Name', key: 'sub', width: 30 },
        { header: 'Practical / Experiment Title', key: 'title', width: 35 },
        { header: 'Max Marks', key: 'max', width: 14 },
        { header: 'Marks Scored', key: 'scored', width: 16 },
        { header: 'Verification Status', key: 'status', width: 20 }
      ];
      allAssessments
        .filter(l => classifyAssessment(l) === 'LAB' && selectedSems.includes(Number(l.semester)))
        .forEach(l => {
          wsLabs.addRow({
            sem: `Sem ${l.semester || ''}`,
            code: l.subject_code || '',
            sub: l.subject_name || '',
            title: l.title || '',
            max: l.max_marks || 50,
            scored: l.marks_obtained !== null ? l.marks_obtained : '--',
            status: l.marks_obtained !== null ? 'Verified' : 'Pending Verification'
          });
        });
    }

    // Sheet 5: Monthly Attendance Matrix Ledger
    if (options.incAttendance !== false) {
      const wsAtt = workbook.addWorksheet('Attendance Ledger');
      wsAtt.columns = [
        { header: 'Semester', key: 'sem', width: 14 },
        { header: 'Subject Name', key: 'sub', width: 32 },
        { header: 'Subject Code', key: 'code', width: 18 },
        { header: 'Total Held', key: 'total', width: 16 },
        { header: 'Attended', key: 'attended', width: 18 },
        { header: 'Absent', key: 'absent', width: 16 },
        { header: 'Attendance %', key: 'pct', width: 16 },
        { header: 'Eligibility Status', key: 'status', width: 18 }
      ];
      (dossier.attendance || [])
        .filter(a => selectedSems.includes(Number(a.semester)))
        .forEach(a => {
          const tot = Number(a.total_sessions) || 0;
          const pres = Number(a.attended_sessions) || 0;
          const abs = tot - pres >= 0 ? tot - pres : 0;
          const pct = tot > 0 ? Math.round((pres * 100) / tot) : 100;
          wsAtt.addRow({
            sem: `Sem ${a.semester || ''}`,
            sub: a.subject_name || '',
            code: a.subject_code || '',
            total: tot,
            attended: pres,
            absent: abs,
            pct: `${pct}%`,
            status: pct >= 75 ? 'Eligible' : 'Defaulter'
          });
        });
    }

    // Sheet 6: Official Documents (Excluding Coursework Assignments)
    if (options.incDocuments !== false) {
      const nonAssignDocs = (dossier.documents || []).filter(d => {
        const dtype = String(d.document_type || '').toUpperCase();
        const dtitle = String(d.title || '').toUpperCase();
        return !dtype.includes('ASSIGN') && !dtitle.includes('ASSIGN') && !dtitle.includes('HOMEWORK');
      });
      if (nonAssignDocs.length) {
        const wsDocs = workbook.addWorksheet('Official Documents');
        wsDocs.columns = [
          { header: 'Document Title', key: 'title', width: 30 },
          { header: 'Category', key: 'cat', width: 20 },
          { header: 'File Name', key: 'file', width: 35 },
          { header: 'Size (KB)', key: 'size', width: 14 },
          { header: 'Uploaded Date', key: 'date', width: 18 }
        ];
        nonAssignDocs.forEach(d => {
          wsDocs.addRow({
            title: d.title || '',
            cat: d.document_type || '',
            file: d.file_name || '',
            size: d.file_size ? Math.round(d.file_size / 1024) : '--',
            date: d.created_at ? new Date(d.created_at).toLocaleDateString() : ''
          });
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Student_Dossier_${p.class_roll_no || p.id}_${(p.full_name || 'student').replace(/\s+/g, '_')}.xlsx`;
    link.click();
    showToast('Excel dossier exported successfully', 'success');
  }

  // Single Student Word (.doc) Export with selective sections
  function exportSingleStudentDoc(dossier, options = {}) {
    const p = dossier.profile || {};
    const selectedSems = options.selectedSemesters || state.selectedDossierSemesters || [1, 2, 3, 4, 5, 6];
    const allAssessments = dossier.assessments || [];
    const tests = allAssessments.filter(t => classifyAssessment(t) === 'TEST' && selectedSems.includes(Number(t.semester)));
    const assignments = allAssessments.filter(a => classifyAssessment(a) === 'ASSIGNMENT' && selectedSems.includes(Number(a.semester)));
    const labs = allAssessments.filter(l => classifyAssessment(l) === 'LAB' && selectedSems.includes(Number(l.semester)));
    const atts = (dossier.attendance || []).filter(a => selectedSems.includes(Number(a.semester)));

    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Student Dossier</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; margin: 2rem; }
        h1 { color: #1e3a8a; font-size: 18pt; margin-bottom: 0.2rem; }
        h2 { color: #2563eb; font-size: 13pt; margin-top: 1.5rem; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10pt; text-align: left; }
        th { background-color: #f1f5f9; font-weight: bold; }
      </style>
      </head>
      <body>
        <h1>VidyaOS — Official Student Academic Dossier</h1>
        <p>Generated: ${new Date().toLocaleDateString()} • Department of ${p.department_name || 'Technical Education'}</p>
    `;

    if (options.incProfile !== false) {
      html += `
        <h2>1. Student Demographic Profile</h2>
        <table>
          <tr><th width="25%">Full Student Name</th><td width="25%"><b>${escapeHtml(p.full_name || '')}</b></td><th width="25%">Class Roll Number</th><td width="25%"><b>${escapeHtml(p.class_roll_no || '')}</b></td></tr>
          <tr><th>Official Enrollment No</th><td>${escapeHtml(p.official_enrollment_no || '')}</td><th>UBTER Registration No</th><td>${escapeHtml(p.registration_no || '')}</td></tr>
          <tr><th>Father's Name</th><td>${escapeHtml(p.father_name || '')}</td><th>Mother's Name</th><td>${escapeHtml(p.mother_name || '')}</td></tr>
          <tr><th>Date of Birth</th><td>${p.dob || ''}</td><th>Gender / Category</th><td>${escapeHtml(p.gender || '')} / ${escapeHtml(p.category || '')}</td></tr>
          <tr><th>Aadhar Number</th><td>${escapeHtml(p.aadhar_number || '')}</td><th>Contact Phone</th><td>${escapeHtml(p.phone || '')}</td></tr>
          <tr><th>Contact Email</th><td>${escapeHtml(p.email || '')}</td><th>Academic Batch</th><td>${escapeHtml(p.batch_label || '')}</td></tr>
          <tr><th>Permanent Address</th><td colspan="3">${escapeHtml(p.address || '')}</td></tr>
        </table>
      `;
    }

    if (options.incTests !== false) {
      html += `
        <h2>2. Class Tests &amp; Sessional Examination Marks Ledger</h2>
        <table>
          <tr><th>Semester</th><th>Subject</th><th>Assessment Title</th><th>Component</th><th>Max Marks</th><th>Scored Marks</th></tr>
          ${tests.map(t => `
            <tr>
              <td>Sem ${t.semester || ''}</td>
              <td>${escapeHtml(t.subject_name || '')}</td>
              <td>${escapeHtml(t.title || '')}</td>
              <td>${escapeHtml(t.component || 'THEORY')}</td>
              <td>${t.max_marks || 0}</td>
              <td><b>${t.marks_obtained !== null ? t.marks_obtained : 0}</b></td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    if (options.incAssignments !== false) {
      html += `
        <h2>3. Coursework &amp; Assignment Evaluation Ledger</h2>
        <table>
          <tr><th>Semester</th><th>Subject</th><th>Assignment Title</th><th>Max Marks</th><th>Scored Marks</th><th>Status</th></tr>
          ${assignments.map(a => `
            <tr>
              <td>Sem ${a.semester || ''}</td>
              <td>${escapeHtml(a.subject_name || '')}</td>
              <td>${escapeHtml(a.title || '')}</td>
              <td>${a.max_marks || 0}</td>
              <td><b>${a.marks_obtained !== null ? a.marks_obtained : '--'}</b></td>
              <td>${escapeHtml(a.submission_status || 'SUBMITTED')}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    if (options.incLabs !== false) {
      html += `
        <h2>4. Lab Practical Records, Experiments &amp; Viva Ledger</h2>
        <table>
          <tr><th>Semester</th><th>Subject</th><th>Experiment / Practical Title</th><th>Max Marks</th><th>Scored Marks</th><th>Status</th></tr>
          ${labs.map(l => `
            <tr>
              <td>Sem ${l.semester || ''}</td>
              <td>${escapeHtml(l.subject_name || '')}</td>
              <td>${escapeHtml(l.title || '')}</td>
              <td>${l.max_marks || 0}</td>
              <td><b>${l.marks_obtained !== null ? l.marks_obtained : '--'}</b></td>
              <td>${l.marks_obtained !== null ? 'Verified' : 'Pending'}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    if (options.incAttendance !== false) {
      html += `
        <h2>5. Monthly Attendance Matrix &amp; Lecture Summary</h2>
        <table>
          <tr><th>Semester</th><th>Subject Name</th><th>Code</th><th>Total Lectures</th><th>Attended</th><th>Percentage</th><th>Eligibility</th></tr>
          ${atts.map(a => {
        const tot = Number(a.total_sessions) || 0;
        const pres = Number(a.attended_sessions) || 0;
        const pct = tot > 0 ? Math.round((pres * 100) / tot) : 100;
        return `
              <tr>
                <td>Sem ${a.semester || ''}</td>
                <td>${escapeHtml(a.subject_name || '')}</td>
                <td>${escapeHtml(a.subject_code || '')}</td>
                <td>${tot}</td>
                <td><b>${pres}</b></td>
                <td><b>${pct}%</b></td>
                <td>${pct >= 75 ? 'Eligible' : 'Defaulter'}</td>
              </tr>
            `;
      }).join('')}
        </table>
      `;
    }

    html += `
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Student_Dossier_${p.class_roll_no || p.id}_${(p.full_name || 'student').replace(/\s+/g, '_')}.doc`;
    link.click();
    showToast('Word dossier (.doc) exported successfully', 'success');
  }

  // Single Student PDF Export with selective sections
  function exportSingleStudentPdf(dossier, options = {}) {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      showToast('Popup blocker prevented PDF print window. Please allow popups.', 'error');
      return;
    }
    const p = dossier.profile || {};
    const selectedSems = options.selectedSemesters || state.selectedDossierSemesters || [1, 2, 3, 4, 5, 6];
    const allAssessments = dossier.assessments || [];
    const tests = allAssessments.filter(t => classifyAssessment(t) === 'TEST' && selectedSems.includes(Number(t.semester)));
    const assignments = allAssessments.filter(a => classifyAssessment(a) === 'ASSIGNMENT' && selectedSems.includes(Number(a.semester)));
    const labs = allAssessments.filter(l => classifyAssessment(l) === 'LAB' && selectedSems.includes(Number(l.semester)));
    const atts = (dossier.attendance || []).filter(a => selectedSems.includes(Number(a.semester)));

    let sectionsHtml = '';

    if (options.incProfile !== false) {
      sectionsHtml += `
        <h2>Student Demographics</h2>
        <table>
          <tr><th>Name</th><td><b>${escapeHtml(p.full_name || '')}</b></td><th>Class Roll #</th><td><b>${escapeHtml(p.class_roll_no || '')}</b></td></tr>
          <tr><th>Enrollment #</th><td>${escapeHtml(p.official_enrollment_no || '')}</td><th>Registration #</th><td>${escapeHtml(p.registration_no || '')}</td></tr>
          <tr><th>Father's Name</th><td>${escapeHtml(p.father_name || '')}</td><th>Mother's Name</th><td>${escapeHtml(p.mother_name || '')}</td></tr>
          <tr><th>DOB</th><td>${p.dob || ''}</td><th>Gender / Category</th><td>${escapeHtml(p.gender || '')} / ${escapeHtml(p.category || '')}</td></tr>
          <tr><th>Aadhar #</th><td>${escapeHtml(p.aadhar_number || '')}</td><th>Phone / Email</th><td>${escapeHtml(p.phone || '')} • ${escapeHtml(p.email || '')}</td></tr>
          <tr><th>Address</th><td colspan="3">${escapeHtml(p.address || '')}</td></tr>
        </table>
      `;
    }

    if (options.incTests !== false) {
      sectionsHtml += `
        <h2>Class Tests &amp; Examinations</h2>
        <table>
          <tr><th>Semester</th><th>Subject</th><th>Title</th><th>Component</th><th>Max</th><th>Scored</th></tr>
          ${tests.map(t => `
            <tr>
              <td>Sem ${t.semester || ''}</td>
              <td>${escapeHtml(t.subject_name || '')}</td>
              <td>${escapeHtml(t.title || '')}</td>
              <td>${escapeHtml(t.component || 'THEORY')}</td>
              <td>${t.max_marks || 0}</td>
              <td><b>${t.marks_obtained !== null ? t.marks_obtained : 0}</b></td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    if (options.incAssignments !== false) {
      sectionsHtml += `
        <h2>Coursework &amp; Assignments</h2>
        <table>
          <tr><th>Semester</th><th>Subject</th><th>Title</th><th>Max</th><th>Scored</th><th>Status</th></tr>
          ${assignments.map(a => `
            <tr>
              <td>Sem ${a.semester || ''}</td>
              <td>${escapeHtml(a.subject_name || '')}</td>
              <td>${escapeHtml(a.title || '')}</td>
              <td>${a.max_marks || 0}</td>
              <td><b>${a.marks_obtained !== null ? a.marks_obtained : '--'}</b></td>
              <td>${escapeHtml(a.submission_status || 'SUBMITTED')}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    if (options.incLabs !== false) {
      sectionsHtml += `
        <h2>Lab Practicals &amp; Experiments</h2>
        <table>
          <tr><th>Semester</th><th>Subject</th><th>Title</th><th>Max</th><th>Scored</th><th>Status</th></tr>
          ${labs.map(l => `
            <tr>
              <td>Sem ${l.semester || ''}</td>
              <td>${escapeHtml(l.subject_name || '')}</td>
              <td>${escapeHtml(l.title || '')}</td>
              <td>${l.max_marks || 0}</td>
              <td><b>${l.marks_obtained !== null ? l.marks_obtained : '--'}</b></td>
              <td>${l.marks_obtained !== null ? 'Verified' : 'Pending'}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    if (options.incAttendance !== false) {
      sectionsHtml += `
        <h2>Attendance Summary</h2>
        <table>
          <tr><th>Semester</th><th>Subject Name</th><th>Code</th><th>Total</th><th>Attended</th><th>Percentage</th><th>Status</th></tr>
          ${atts.map(a => {
        const tot = Number(a.total_sessions) || 0;
        const pres = Number(a.attended_sessions) || 0;
        const pct = tot > 0 ? Math.round((pres * 100) / tot) : 100;
        return `
              <tr>
                <td>Sem ${a.semester || ''}</td>
                <td>${escapeHtml(a.subject_name || '')}</td>
                <td>${escapeHtml(a.subject_code || '')}</td>
                <td>${tot}</td>
                <td><b>${pres}</b></td>
                <td><b>${pct}%</b></td>
                <td>${pct >= 75 ? 'Eligible' : 'Defaulter'}</td>
              </tr>
            `;
      }).join('')}
        </table>
      `;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student Academic Dossier — ${escapeHtml(p.full_name)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; padding: 2rem; margin: 0; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 0.75rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end; }
          .header h1 { margin: 0; font-size: 1.5rem; color: #1e3a8a; }
          .header p { margin: 0.25rem 0 0; font-size: 0.85rem; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 0.85rem; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
          th { background: #f8fafc; font-weight: 700; color: #334155; }
          h2 { font-size: 1.05rem; color: #1e3a8a; margin: 1rem 0 0.5rem; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Official Student Academic Dossier</h1>
            <p>Institution: Uttarakhand Board of Technical Education • Department of ${escapeHtml(p.department_name || 'IT')}</p>
          </div>
          <div><p>Date: ${new Date().toLocaleDateString()}</p></div>
        </div>

        ${sectionsHtml}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
    showToast('Opening print dialog for Academic Dossier...', 'info');
  }

  // 7. Cohort Batch Export (Export All)
  window.openCohortExportModal = function () {
    const modal = document.getElementById('modal-cohort-export');
    if (!modal) return;
    modal.style.display = 'flex';

    // Pre-fill active filters
    const sessSelect = document.getElementById('export-cohort-session');
    const yrSelect = document.getElementById('export-cohort-year');
    const semSelect = document.getElementById('export-cohort-semester');
    const batchSelect = document.getElementById('export-cohort-batch');

    if (sessSelect) sessSelect.value = state.filters.session_id || '';
    if (yrSelect) yrSelect.value = state.filters.year || '';
    if (semSelect) semSelect.value = state.filters.semester || '';
    if (batchSelect) batchSelect.value = state.filters.batch || '';
  };

  window.closeCohortExportModal = function () {
    const modal = document.getElementById('modal-cohort-export');
    if (modal) modal.style.display = 'none';
  };

  window.executeCohortExport = async function (e) {
    e.preventDefault();
    const session = document.getElementById('export-cohort-session')?.value || '';
    const yr = document.getElementById('export-cohort-year')?.value || '';
    const sem = document.getElementById('export-cohort-semester')?.value || '';
    const batch = document.getElementById('export-cohort-batch')?.value || '';

    const doExcel = document.getElementById('cohort-fmt-excel')?.checked;
    const doPdf = document.getElementById('cohort-fmt-pdf')?.checked;
    const doDoc = document.getElementById('cohort-fmt-doc')?.checked;

    if (!doExcel && !doPdf && !doDoc) {
      showToast('Please select at least one export format', 'warning');
      return;
    }

    try {
      const params = new URLSearchParams();
      if (session) params.set('academic_year_id', session);
      if (yr) params.set('year', yr);
      if (sem) params.set('semester', sem);
      if (batch) params.set('batch', batch);

      const json = await api(`/student-records/export?${params.toString()}`);
      if (!json || !json.success || !json.data || json.data.length === 0) {
        showToast('No student records found to export', 'warning');
        return;
      }

      const cohort = json.data;

      if (doExcel) exportCohortExcel(cohort, { session, yr, sem, batch });
      if (doDoc) exportCohortDoc(cohort, { session, yr, sem, batch });
      if (doPdf) exportCohortPdf(cohort, { session, yr, sem, batch });

      closeCohortExportModal();
    } catch (err) {
      console.error(err);
      showToast('Failed to export cohort data', 'error');
    }
  };

  async function exportCohortExcel(students, meta) {
    if (typeof ExcelJS === 'undefined') {
      showToast('Excel library not loaded', 'error');
      return;
    }
    const wb = new ExcelJS.Workbook();
    wb.creator = 'VidyaOS';
    const ws = wb.addWorksheet('Cohort Records');

    ws.columns = [
      { header: 'Roll #', key: 'roll', width: 10 },
      { header: 'Enrollment No', key: 'enroll', width: 18 },
      { header: 'UBTER Reg No', key: 'reg', width: 18 },
      { header: 'Full Student Name', key: 'name', width: 28 },
      { header: 'Gender', key: 'gender', width: 12 },
      { header: 'Category', key: 'cat', width: 14 },
      { header: "Father's Name", key: 'father', width: 24 },
      { header: "Mother's Name", key: 'mother', width: 24 },
      { header: 'DOB', key: 'dob', width: 14 },
      { header: 'Aadhar Number', key: 'aadhar', width: 18 },
      { header: 'Contact Phone', key: 'phone', width: 16 },
      { header: 'Email Address', key: 'email', width: 28 },
      { header: 'Permanent Address', key: 'address', width: 35 },
      { header: 'Semester', key: 'sem', width: 12 },
      { header: 'Year', key: 'yr', width: 10 },
      { header: 'Batch', key: 'batch', width: 16 },
      { header: 'Attendance %', key: 'att', width: 16 },
      { header: 'Status', key: 'status', width: 14 }
    ];

    students.forEach((s, idx) => {
      ws.addRow({
        roll: s.class_roll_no || idx + 1,
        enroll: s.official_enrollment_no || '',
        reg: s.registration_no || '',
        name: s.full_name || '',
        gender: s.gender || '',
        cat: s.category || '',
        father: s.father_name || '',
        mother: s.mother_name || '',
        dob: s.dob || '',
        aadhar: s.aadhar_number || '',
        phone: s.phone || '',
        email: s.email || '',
        address: s.address || '',
        sem: s.current_semester ? `Sem ${s.current_semester}` : '',
        yr: s.current_year ? `Year ${s.current_year}` : '',
        batch: s.batch_label || '',
        att: `${s.attendance_percentage || 100}%`,
        status: s.status || 'ACTIVE'
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Cohort_Student_Records_${meta.sem ? 'Sem' + meta.sem : 'All'}_${Date.now()}.xlsx`;
    link.click();
    showToast(`Exported ${students.length} student records to Excel`, 'success');
  }

  function exportCohortDoc(students, meta) {
    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Cohort Roster</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #111; margin: 1.5rem; }
        h1 { color: #1e3a8a; font-size: 16pt; margin-bottom: 0.2rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 9pt; text-align: left; }
        th { background-color: #f1f5f9; font-weight: bold; }
      </style>
      </head>
      <body>
        <h1>VidyaOS — Complete Department Student Cohort Roster</h1>
        <p>Total Records: ${students.length} • Generated: ${new Date().toLocaleDateString()}</p>
        <table>
          <tr>
            <th>Roll #</th><th>Enrollment No</th><th>UBTER Reg</th><th>Student Full Name</th>
            <th>Father's Name</th><th>DOB</th><th>Phone</th><th>Cohort</th><th>Batch</th><th>Att %</th>
          </tr>
          ${students.map((s, idx) => `
            <tr>
              <td><b>${s.class_roll_no || idx + 1}</b></td>
              <td>${escapeHtml(s.official_enrollment_no || '')}</td>
              <td>${escapeHtml(s.registration_no || '')}</td>
              <td><b>${escapeHtml(s.full_name || '')}</b></td>
              <td>${escapeHtml(s.father_name || '')}</td>
              <td>${s.dob || ''}</td>
              <td>${escapeHtml(s.phone || '')}</td>
              <td>Sem ${s.current_semester || ''}</td>
              <td>${escapeHtml(s.batch_label || '')}</td>
              <td><b>${s.attendance_percentage || 100}%</b></td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Cohort_Student_Records_${Date.now()}.doc`;
    link.click();
    showToast(`Exported ${students.length} student records to Word (.doc)`, 'success');
  }

  function exportCohortPdf(students, meta) {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      showToast('Popup blocker prevented PDF print window. Please allow popups.', 'error');
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student Cohort Records Roster</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; padding: 1.5rem; margin: 0; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 0.5rem; margin-bottom: 1rem; display:flex; justify-content:space-between; }
          .header h1 { margin: 0; font-size: 1.3rem; color: #1e3a8a; }
          table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
          th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; }
          th { background: #f8fafc; font-weight: 700; color: #334155; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Department Student Cohort Academic Records</h1>
            <p>Total Records: ${students.length} • Generated: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Roll #</th><th>Enrollment No</th><th>Student Name</th>
              <th>Father's Name</th><th>DOB</th><th>Phone</th><th>Cohort</th><th>Batch</th><th>Attendance %</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((s, idx) => `
              <tr>
                <td><b>${s.class_roll_no || idx + 1}</b></td>
                <td>${escapeHtml(s.official_enrollment_no || '')}</td>
                <td><b>${escapeHtml(s.full_name || '')}</b></td>
                <td>${escapeHtml(s.father_name || '')}</td>
                <td>${s.dob || ''}</td>
                <td>${escapeHtml(s.phone || '')}</td>
                <td>Sem ${s.current_semester || ''}</td>
                <td>${escapeHtml(s.batch_label || '')}</td>
                <td><b>${s.attendance_percentage || 100}%</b></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  // 8. Bootstrap & Init
  async function init() {
    if (typeof requireFacultyAuth === 'function') {
      const user = requireFacultyAuth(['TEACHER', 'HOD', 'SYSTEM_ADMIN', 'FACULTY', 'COMMON_FACULTY_MANAGER']);
      if (!user) return;
    } else if (typeof guardRoute === 'function') {
      const user = guardRoute({ roles: ['TEACHER', 'HOD', 'SYSTEM_ADMIN', 'FACULTY', 'COMMON_FACULTY_MANAGER'] });
      if (!user) return;
    }
    await loadFilterOptions();
    await loadStudentRecords();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
