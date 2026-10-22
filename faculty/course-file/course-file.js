/**
 * Course File Preparation (NBA/NAAC) — Client Logic
 * Location: frontend/faculty/course-file/course-file.js
 * VidyaOS Institutional Campus Operating System
 */

(function () {
  'use strict';

  // State
  const state = {
    currentUser: null,
    isHodOrAdmin: false,
    allClasses: [],
    currentGroupId: null,
    currentSubjectId: null,
    currentRegisterId: null,
    courseFileData: null,
    currentCategory: 'all',
    searchQuery: '',
    selectedUploadFile: null,
    activeItemKeyForUpload: null
  };

  // Helper functions
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Robust API Fetch with Automatic Token Injection & Error Handling
  async function apiFetch(endpoint, opts = {}) {
    if (typeof window.fetchApi === 'function') {
      try {
        return await window.fetchApi(endpoint, opts);
      } catch (err) {
        return { success: false, error: err };
      }
    }
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const body = opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)
      ? JSON.stringify(opts.body)
      : opts.body;
    try {
      const r = await fetch('/api/v1' + endpoint, { ...opts, headers, body });
      const data = await r.json().catch(() => ({}));
      return data;
    } catch (err) {
      return { success: false, error: err };
    }
  }

  // Lifecycle Initialization
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const user = await window.guardRoute();
      if (!user) return;
      state.currentUser = user;
      state.isHodOrAdmin = user.roles?.includes('HOD') || user.roles?.includes('DEPT_HEAD') || user.roles?.includes('SYSTEM_ADMIN');

      // Update navbar user avatar
      const userAvatar = document.getElementById('gc-user-avatar');
      const dropAvatar = document.getElementById('dropdown-avatar');
      const dropName = document.getElementById('dropdown-user-name');
      const dropEmail = document.getElementById('dropdown-user-email');
      const dropRole = document.getElementById('dropdown-user-role');
      const initial = (user.full_name || 'F').charAt(0).toUpperCase();

      if (userAvatar) userAvatar.innerText = initial;
      if (dropAvatar) dropAvatar.innerText = initial;
      if (dropName) dropName.innerText = user.full_name || 'Faculty Member';
      if (dropEmail) dropEmail.innerText = user.email || '';
      if (dropRole) dropRole.innerText = state.isHodOrAdmin ? 'HOD / Admin' : 'Faculty Member';

      // Parse Query Params
      const params = new URLSearchParams(window.location.search);
      const urlGroupId = params.get('group_id') || params.get('id');
      const urlSubjectId = params.get('subject_id');
      const urlRegisterId = params.get('register_id');

      if (urlGroupId) state.currentGroupId = parseInt(urlGroupId, 10);
      if (urlSubjectId) state.currentSubjectId = parseInt(urlSubjectId, 10);
      if (urlRegisterId) state.currentRegisterId = parseInt(urlRegisterId, 10);

      // 1. Load Teacher's Active Classes for Class Switcher in background
      loadAvailableClasses().catch(e => console.warn('Could not load classes list:', e));

      // 2. Load Course File Dossier
      await loadCourseFileDossier();

      // 3. Handle Deep-linked Document and Action (?doc=...&action=...)
      handleDeepLinkAction(params);

    } catch (err) {
      console.error('Initialization error in course-file:', err);
    }
  });

  // Handle Deep-Linked Document and Action from Dashboard Cards
  function handleDeepLinkAction(params) {
    const rawDoc = params.get('doc');
    const action = params.get('action'); // 'view', 'upload', 'delete'
    if (!rawDoc || !state.courseFileData?.items) return;

    // Normalization mapping for slugs and aliases
    const aliasMap = {
      'co_po_mapping': 'copo_matrix',
      'class_timetable': 'timetable',
      'prev_result_analysis': 'result_analysis',
      'lab_plan': 'laboratory_plan',
      'sample_question_papers': 'question_papers_cos',
      'corrective_action': 'corrective_actions'
    };
    const targetKey = aliasMap[rawDoc] || rawDoc;

    const item = state.courseFileData.items.find(i => i.key === targetKey);
    if (!item) return;

    // 1. Scroll to and highlight card
    setTimeout(() => {
      const cardEl = document.getElementById(`card-artifact-${item.key}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardEl.classList.add('highlight-pulse');
        setTimeout(() => cardEl.classList.remove('highlight-pulse'), 5000);
      }
    }, 250);

    // 2. Perform requested action
    if (action === 'upload') {
      setTimeout(() => {
        openDirectUploadModal(item.key, item.title);
      }, 350);
    } else if (action === 'view') {
      setTimeout(() => {
        if (item.document && item.document.file_path) {
          previewDocument(item.document.file_path, item.title);
        } else if (item.key === 'student_list') {
          openStudentRosterModal();
        } else if (item.key === 'assignment_schedule') {
          openAssignmentScheduleModal();
        } else if (item.key === 'internal_assessment_plan') {
          openEvaluationSchemeModal();
        } else if (item.key === 'copo_matrix' || item.key === 'course_outcomes') {
          openCopoMatrixModal();
        } else if (item.key === 'advanced_learners' || item.key === 'slow_learners') {
          openLearnersModal(item.key);
        } else {
          showToast(`No document uploaded yet for "${item.title}". Please upload the PDF.`, 'info');
          openDirectUploadModal(item.key, item.title);
        }
      }, 350);
    } else if (action === 'delete') {
      setTimeout(() => {
        if (item.document) {
          deleteDocument(item.key, item.title);
        } else {
          showToast(`No uploaded file to delete for "${item.title}".`, 'info');
        }
      }, 350);
    }
  }

  // Load available teaching groups for dropdown switcher
  async function loadAvailableClasses() {
    try {
      const res = await apiFetch('/teaching-groups?status=ACTIVE');
      if (res && res.success && Array.isArray(res.data)) {
        state.allClasses = res.data;
        const selector = document.getElementById('select-class-switch');
        if (selector) {
          if (state.allClasses.length === 0) {
            selector.innerHTML = '<option value="">No classes found</option>';
            return;
          }

          // If no groupId in URL, pick the first class
          if (!state.currentGroupId && state.allClasses.length > 0) {
            state.currentGroupId = state.allClasses[0].id;
          }

          selector.innerHTML = state.allClasses.map(c => `
            <option value="${c.id}" ${c.id === state.currentGroupId ? 'selected' : ''}>
              ${escapeHtml(c.subject_name || c.name)} (Sem ${c.semester})
            </option>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Failed to load class list', err);
    }
  }

  // Load Course File Dossier from Backend
  async function loadCourseFileDossier() {
    if (!state.currentGroupId && !state.currentSubjectId) return;

    try {
      const queryParam = state.currentGroupId 
        ? `group_id=${state.currentGroupId}` 
        : `subject_id=${state.currentSubjectId}`;
      
      const res = await apiFetch(`/course-files?${queryParam}`);
      if (res && res.success && res.data) {
        state.courseFileData = res.data;
        renderHeroBanner();
        renderArtifactCards();
        renderCategoryCounts();
      } else {
        showToast(res?.error?.message || 'Failed to load course file', 'error');
      }
    } catch (err) {
      console.error('Error fetching course file dossier:', err);
      showToast('Error loading course file dossier', 'error');
    }
  }

  // Render Hero Banner Card
  function renderHeroBanner() {
    const data = state.courseFileData;
    if (!data) return;

    const g = data.group;
    const cf = data.course_file;

    // Titles and tags
    const titleEl = document.getElementById('cf-hero-title');
    const semEl = document.getElementById('cf-hero-sem');
    const compEl = document.getElementById('cf-hero-component');
    const ayEl = document.getElementById('cf-hero-ay');
    const codeEl = document.getElementById('cf-hero-code');
    const deptEl = document.getElementById('cf-hero-dept');
    const teacherEl = document.getElementById('cf-hero-teacher');
    const statusBadge = document.getElementById('cf-hero-status-badge');

    if (titleEl) titleEl.innerText = g.subject_name || g.name || 'Subject Course File';
    if (semEl) semEl.innerText = `Semester ${g.semester || 1}`;
    if (compEl) compEl.innerText = g.component || 'THEORY';
    if (ayEl) ayEl.innerText = `AY ${g.academic_year_label || '2026-27'}`;
    if (codeEl) codeEl.innerText = g.subject_code || g.invite_code || '--';
    if (deptEl) deptEl.innerText = g.department_name || 'Academic Dept';
    if (teacherEl) teacherEl.innerText = g.teacher_name || 'Faculty Member';

    // Status Badge
    if (statusBadge) {
      statusBadge.innerText = (cf.status || 'IN_PROGRESS').replace(/_/g, ' ');
      statusBadge.className = 'badge';
      if (cf.status === 'APPROVED') {
        statusBadge.classList.add('badge-present');
      } else if (cf.status === 'REVISION_REQUESTED') {
        statusBadge.classList.add('badge-absent');
      } else if (cf.status === 'AUDITED') {
        statusBadge.classList.add('badge-late');
      } else {
        statusBadge.classList.add('badge-sem');
      }
    }

    // Progress Score Meter
    const scoreEl = document.getElementById('cf-meter-score');
    const pctEl = document.getElementById('cf-meter-pct');
    const barEl = document.getElementById('cf-meter-bar');
    const capEl = document.getElementById('cf-meter-caption');

    const total = cf.total_items || 18;
    const done = cf.completed_items || 0;
    const pct = cf.completion_pct || Math.round((done / total) * 100);

    if (scoreEl) scoreEl.innerText = `${done} / ${total}`;
    if (pctEl) pctEl.innerText = `${pct}%`;
    if (barEl) {
      barEl.style.width = `${Math.min(100, Math.max(3, pct))}%`;
      barEl.style.background = pct >= 85 ? 'var(--status-present)' : (pct >= 50 ? 'var(--color-primary)' : 'var(--status-late)');
    }
    if (capEl) {
      capEl.innerText = pct === 100 
        ? '✓ Complete — 100% NBA/NAAC Ready' 
        : (pct >= 70 ? 'Satisfactory — Final Reviews Pending' : 'Documentation In Progress');
    }

    // Quick Toolbar Links
    const rollcallLink = document.getElementById('btn-quick-rollcall');
    const registerLink = document.getElementById('btn-quick-register');
    const classworkLink = document.getElementById('btn-quick-classwork');

    const regParam = state.currentRegisterId ? `?id=${state.currentRegisterId}` : '';
    if (rollcallLink) rollcallLink.href = `/faculty/registers.html${regParam}&action=rollcall`;
    if (registerLink) registerLink.href = `/faculty/registers.html${regParam}`;
    if (classworkLink) classworkLink.href = `/faculty/registers.html${regParam}&tab=assignments`;

    // HOD Remarks Banner
    const remarksBanner = document.getElementById('cf-remarks-banner');
    const remarksTitle = document.getElementById('cf-remarks-title');
    const remarksText = document.getElementById('cf-remarks-text');
    const remarksMeta = document.getElementById('cf-remarks-meta');

    if (remarksBanner) {
      if (cf.hod_remarks) {
        remarksBanner.style.display = 'flex';
        if (remarksTitle) remarksTitle.innerText = `Department HOD Review (${(cf.status || '').replace(/_/g, ' ')})`;
        if (remarksText) remarksText.innerText = cf.hod_remarks;
        if (remarksMeta) remarksMeta.innerText = `Audited by ${cf.auditor_name || 'Dept Head'} on ${formatDate(cf.audited_at)}`;
      } else {
        remarksBanner.style.display = 'none';
      }
    }

    // Show HOD Audit button if user is HOD or Admin
    const hodTrigger = document.getElementById('cf-hod-audit-trigger');
    if (hodTrigger) {
      hodTrigger.style.display = state.isHodOrAdmin ? 'block' : 'none';
    }
  }

  // Render Category Counts in Filter Tabs
  function renderCategoryCounts() {
    const items = state.courseFileData?.items || [];
    const countAll = items.length;
    const countCurriculum = items.filter(i => i.category === 'curriculum').length;
    const countStudents = items.filter(i => i.category === 'students').length;
    const countAssessment = items.filter(i => i.category === 'assessment').length;
    const countReview = items.filter(i => i.category === 'review').length;

    const elAll = document.getElementById('count-cat-all');
    const elCurr = document.getElementById('count-cat-curriculum');
    const elStud = document.getElementById('count-cat-students');
    const elAss = document.getElementById('count-cat-assessment');
    const elRev = document.getElementById('count-cat-review');

    if (elAll) elAll.innerText = countAll;
    if (elCurr) elCurr.innerText = countCurriculum;
    if (elStud) elStud.innerText = countStudents;
    if (elAss) elAss.innerText = countAssessment;
    if (elRev) elRev.innerText = countReview;
  }

  // Render 18 Artifact Cards Grid
  function renderArtifactCards() {
    const container = document.getElementById('cf-cards-grid');
    if (!container || !state.courseFileData) return;

    let items = state.courseFileData.items || [];

    // Filter by Category
    if (state.currentCategory !== 'all') {
      items = items.filter(i => i.category === state.currentCategory);
    }

    // Filter by Search Query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      items = items.filter(i => 
        i.title.toLowerCase().includes(q) || 
        i.desc.toLowerCase().includes(q) ||
        String(i.num).includes(q)
      );
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg);">
          <div style="color:var(--text-muted); margin-bottom: 0.5rem;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></div>
          <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">No matching course file artifacts</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0;">Try adjusting your category filter or search terms.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => {
      const doc = item.document;
      const isComplete = item.is_completed;
      const hasSystemData = item.has_system_data;

      // Status Badge
      let statusBadgeHtml = '';
      if (doc) {
        statusBadgeHtml = `<span class="badge badge-present" style="font-size:0.7rem;display:inline-flex;align-items:center;gap:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Uploaded (${formatBytes(doc.file_size)})</span>`;
      } else if (hasSystemData) {
        statusBadgeHtml = `<span class="badge badge-sem" style="font-size:0.7rem;display:inline-flex;align-items:center;gap:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> Live DB Synced</span>`;
      } else {
        statusBadgeHtml = `<span class="badge badge-late" style="font-size:0.7rem;display:inline-flex;align-items:center;gap:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Action Required</span>`;
      }

      // Contextual Action Buttons depending on Item type
      let actionsHtml = '';

      // Item 7: Student List
      if (item.key === 'student_list') {
        const studentCount = state.courseFileData.system_data?.students?.length || 0;
        actionsHtml = `
          <button type="button" class="cf-card-btn primary" onclick="openStudentRosterModal()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
            <span>View Live Roster (${studentCount})</span>
          </button>
          <button type="button" class="cf-card-btn" onclick="printStudentRoster()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            <span>Print</span>
          </button>
          <button type="button" class="cf-card-btn" onclick="openDirectUploadModal('${item.key}', '${escapeHtml(item.title)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
            <span>${doc ? 'Replace PDF' : 'Upload Signed PDF'}</span>
          </button>
        `;
      }
      // Item 14: Assignment & Tutorial Schedule
      else if (item.key === 'assignment_schedule') {
        const assCount = state.courseFileData.system_data?.assignments?.length || 0;
        actionsHtml = `
          <button type="button" class="cf-card-btn primary" onclick="openAssignmentScheduleModal()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>View Classwork (${assCount})</span>
          </button>
          <button type="button" class="cf-card-btn" onclick="printAssignmentSchedule()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            <span>Print</span>
          </button>
          <button type="button" class="cf-card-btn" onclick="openDirectUploadModal('${item.key}', '${escapeHtml(item.title)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
            <span>${doc ? 'Replace PDF' : 'Upload Signed PDF'}</span>
          </button>
        `;
      }
      // Item 12: Internal Assessment Plan
      else if (item.key === 'internal_assessment_plan') {
        actionsHtml = `
          <button type="button" class="cf-card-btn primary" onclick="openEvaluationSchemeModal()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            <span>Configure Rubric Scheme</span>
          </button>
          <button type="button" class="cf-card-btn" onclick="openDirectUploadModal('${item.key}', '${escapeHtml(item.title)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
            <span>${doc ? 'Replace PDF' : 'Upload Signed Plan'}</span>
          </button>
        `;
      }
      // Items 3 & 4: Course Outcomes & CO-PO Matrix
      else if (item.key === 'course_outcomes' || item.key === 'copo_matrix') {
        actionsHtml = `
          <button type="button" class="cf-card-btn primary" onclick="openCopoMatrixModal()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span>Manage CO &amp; Matrix</span>
          </button>
          <button type="button" class="cf-card-btn" onclick="openDirectUploadModal('${item.key}', '${escapeHtml(item.title)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
            <span>${doc ? 'Replace PDF' : 'Upload PDF'}</span>
          </button>
        `;
      }
      // Items 9 & 10: Advanced & Slow Learners
      else if (item.key === 'advanced_learners' || item.key === 'slow_learners') {
        actionsHtml = `
          <button type="button" class="cf-card-btn primary" onclick="openLearnersModal('${item.key}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
            <span>View Diagnosed List</span>
          </button>
          <button type="button" class="cf-card-btn" onclick="openDirectUploadModal('${item.key}', '${escapeHtml(item.title)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
            <span>${doc ? 'Replace PDF' : 'Upload PDF'}</span>
          </button>
        `;
      }
      // Default: PDF Upload Artifact
      else {
        actionsHtml = `
          <button type="button" class="cf-card-btn primary" onclick="openDirectUploadModal('${item.key}', '${escapeHtml(item.title)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <span>${doc ? 'Replace PDF' : 'Upload PDF'}</span>
          </button>
        `;
      }

      // If document exists, add View and Download actions (Delete button excised)
      if (doc) {
        actionsHtml += `
          <button type="button" class="cf-card-btn success" onclick="previewDocument('${doc.file_path}', '${escapeHtml(item.title)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>View</span>
          </button>
          <a href="${doc.file_path}" class="cf-card-btn" download="${escapeHtml(doc.file_name)}" title="Download PDF">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Download</span>
          </a>
        `;
      }

      // Status Info Box
      let statusBoxHtml = '';
      if (doc) {
        statusBoxHtml = `
          <div class="cf-card-status-box">
            <div class="cf-doc-info-left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--status-present);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              <span class="cf-doc-filename" title="${escapeHtml(doc.file_name)}">${escapeHtml(doc.file_name)}</span>
            </div>
            <span class="cf-doc-meta">${formatDate(doc.created_at)}</span>
          </div>
        `;
      } else if (hasSystemData) {
        statusBoxHtml = `
          <div class="cf-card-status-box" style="border-left: 3px solid var(--color-primary);">
            <div class="cf-doc-info-left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary);"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span style="font-weight:600;color:var(--text-main);">Auto-Generated from VidyaOS</span>
            </div>
            <span class="cf-doc-meta">Always Fresh</span>
          </div>
        `;
      }

      return `
        <div class="cf-artifact-card ${isComplete ? 'is-complete' : ''}" id="card-artifact-${item.key}">
          <div class="cf-card-main-content">
            <span class="cf-card-num">#${item.num}</span>
            <div class="cf-card-header-info">
              <div class="cf-card-title-row">
                <span class="cf-card-title">${escapeHtml(item.title)}</span>
                ${statusBadgeHtml}
              </div>
              ${statusBoxHtml}
            </div>
          </div>
          <div class="cf-card-actions">
            ${actionsHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  // Filter Category Handler
  window.setCategoryFilter = function (cat, btnEl) {
    state.currentCategory = cat;
    document.querySelectorAll('.cf-tab-pill').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    if (btnEl) {
      btnEl.classList.add('active');
      btnEl.setAttribute('aria-selected', 'true');
    }
    renderArtifactCards();
  };

  // Search Filter Handler
  window.onSearchDocuments = function (query) {
    state.searchQuery = (query || '').trim();
    renderArtifactCards();
  };

  // Switch Active Class
  window.onSwitchClass = function (groupId) {
    if (!groupId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('group_id', groupId);
    window.location.href = url.toString();
  };

  // Open Direct Upload Modal
  window.openDirectUploadModal = function (itemKey, title) {
    state.activeItemKeyForUpload = itemKey;
    state.selectedUploadFile = null;

    const modalTitle = document.getElementById('upload-modal-title');
    const modalSubtitle = document.getElementById('upload-modal-subtitle');
    const itemKeyField = document.getElementById('upload-item-key');
    const titleField = document.getElementById('upload-doc-title');
    const notesField = document.getElementById('upload-doc-notes');
    const selectedFileName = document.getElementById('upload-selected-file-name');

    if (modalTitle) modalTitle.innerText = `Upload ${title}`;
    if (modalSubtitle) modalSubtitle.innerText = `Artifact #${state.courseFileData?.items?.find(i => i.key === itemKey)?.num || ''}`;
    if (itemKeyField) itemKeyField.value = itemKey;
    if (titleField) titleField.value = title;
    if (notesField) notesField.value = '';
    if (selectedFileName) {
      selectedFileName.innerText = '';
      selectedFileName.style.display = 'none';
    }

    openModal('modal-upload-doc');
  };

  // Handle Modal File Pick
  window.onModalFileSelected = function (input) {
    if (input.files && input.files[0]) {
      state.selectedUploadFile = input.files[0];
      const fnEl = document.getElementById('upload-selected-file-name');
      if (fnEl) {
        fnEl.innerText = `Selected: ${input.files[0].name} (${formatBytes(input.files[0].size)})`;
        fnEl.style.display = 'block';
      }
    }
  };

  // Submit Document Upload to Backend
  window.submitDocumentUpload = async function (e) {
    e.preventDefault();
    const courseFileId = state.courseFileData?.course_file?.id;
    const itemKey = document.getElementById('upload-item-key')?.value;
    const title = document.getElementById('upload-doc-title')?.value;
    const notes = document.getElementById('upload-doc-notes')?.value;

    if (!courseFileId || !itemKey) {
      showToast('Course file not identified', 'error');
      return;
    }

    if (!state.selectedUploadFile) {
      showToast('Please select a PDF document to upload', 'error');
      return;
    }

    const btn = document.getElementById('btn-submit-upload');
    if (btn) btn.disabled = true;

    try {
      const formData = new FormData();
      formData.append('file', state.selectedUploadFile);
      formData.append('item_key', itemKey);
      formData.append('title', title);
      if (notes) formData.append('notes', notes);

      const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
      const resp = await fetch(`/api/v1/course-files/${courseFileId}/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await resp.json();

      if (data && data.success) {
        showToast(data.message || 'Document uploaded successfully', 'success');
        closeModal('modal-upload-doc');
        await loadCourseFileDossier();
      } else {
        showToast(data?.error?.message || 'Upload failed', 'error');
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      showToast('Network error during upload', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // Preview Document Modal
  window.previewDocument = function (filePath, title) {
    const frame = document.getElementById('pdf-preview-frame');
    const titleEl = document.getElementById('preview-modal-title');
    const dlBtn = document.getElementById('btn-preview-download');

    if (titleEl) titleEl.innerText = title;
    if (dlBtn) dlBtn.href = filePath;
    if (frame) frame.src = filePath;

    openModal('modal-pdf-preview');
  };

  // Delete Document
  window.deleteDocument = async function (itemKey, title) {
    if (!confirm(`Are you sure you want to remove the uploaded document for "${title}"?`)) return;

    const courseFileId = state.courseFileData?.course_file?.id;
    if (!courseFileId) return;

    try {
      const res = await apiFetch(`/course-files/${courseFileId}/documents/${itemKey}`, {
        method: 'DELETE'
      });
      if (res && res.success) {
        showToast('Document deleted', 'info');
        await loadCourseFileDossier();
      } else {
        showToast(res?.error?.message || 'Failed to delete document', 'error');
      }
    } catch (err) {
      showToast('Error deleting document', 'error');
    }
  };

  // Modal 3: Open Student Roster Modal (Item #7)
  window.openStudentRosterModal = function () {
    const students = state.courseFileData?.system_data?.students || [];
    const tbody = document.getElementById('tbody-students-roster');
    const badge = document.getElementById('roster-count-badge');

    if (badge) badge.innerText = `${students.length} Students Enrolled`;

    if (tbody) {
      if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No enrolled students found in this subject class.</td></tr>`;
      } else {
        tbody.innerHTML = students.map(s => {
          const pct = s.attendance_pct != null ? `${s.attendance_pct}%` : '—';
          const pctClass = s.attendance_pct != null && s.attendance_pct >= 75 ? 'badge-present' : (s.attendance_pct != null ? 'badge-absent' : 'badge-sem');
          return `
            <tr>
              <td style="font-weight:700;font-family:var(--font-family-mono);">${s.roll_no || '--'}</td>
              <td style="font-family:var(--font-family-mono);color:var(--text-muted);">${escapeHtml(s.enrollment_no || '--')}</td>
              <td><strong>${escapeHtml(s.full_name)}</strong></td>
              <td style="color:var(--text-muted);font-size:0.8rem;">${escapeHtml(s.email || '--')}</td>
              <td style="text-align:center;font-family:var(--font-family-mono);">${s.attended_sessions} / ${s.total_sessions}</td>
              <td style="text-align:center;"><span class="badge ${pctClass}">${pct}</span></td>
            </tr>
          `;
        }).join('');
      }
    }

    openModal('modal-student-roster');
  };

  // Print Student Roster
  window.printStudentRoster = function () {
    const students = state.courseFileData?.system_data?.students || [];
    const g = state.courseFileData?.group || {};

    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student List — ${g.subject_name || 'Course File'}</title>
        <style>
          body { font-family: sans-serif; padding: 2rem; color: #111; }
          h2, h3 { margin: 0 0 0.5rem; }
          table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
          th, td { border: 1px solid #333; padding: 6px 10px; font-size: 10pt; }
          th { background: #eee; }
        </style>
      </head>
      <body>
        <h2>Institutional Course File — Student List (Item #7)</h2>
        <h3>${escapeHtml(g.subject_name || '')} (${escapeHtml(g.subject_code || '')})</h3>
        <p>Faculty: ${escapeHtml(g.teacher_name || '')} | Semester: ${g.semester || 1} | Dept: ${escapeHtml(g.department_name || '')}</p>
        <table>
          <thead>
            <tr>
              <th>Roll No</th><th>Enrollment No</th><th>Full Name</th><th>Email</th><th>Attended</th><th>Attendance %</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => `
              <tr>
                <td>${s.roll_no || ''}</td>
                <td>${s.enrollment_no || ''}</td>
                <td>${s.full_name || ''}</td>
                <td>${s.email || ''}</td>
                <td>${s.attended_sessions} / ${s.total_sessions}</td>
                <td>${s.attendance_pct != null ? s.attendance_pct + '%' : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 3rem; display: flex; justify-content: space-between;">
          <div>Faculty Signature: __________________</div>
          <div>HOD Signature: __________________</div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
  };

  // Modal 4: Open Assignment Schedule Modal (Item #14)
  window.openAssignmentScheduleModal = function () {
    const assignments = state.courseFileData?.system_data?.assignments || [];
    const tbody = document.getElementById('tbody-assignments-schedule');
    const badge = document.getElementById('schedule-count-badge');

    if (badge) badge.innerText = `${assignments.length} Coursework Assignments Issued`;

    if (tbody) {
      if (assignments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No assignments or tutorial coursework created for this subject yet.</td></tr>`;
      } else {
        tbody.innerHTML = assignments.map((a, idx) => `
          <tr>
            <td style="font-weight:700;font-family:var(--font-family-mono);">${idx + 1}</td>
            <td><strong>${escapeHtml(a.title)}</strong></td>
            <td style="font-size:0.8rem;color:var(--text-muted);">${formatDate(a.created_at)}</td>
            <td style="font-size:0.8rem;font-weight:600;">${formatDate(a.due_date)}</td>
            <td style="text-align:center;font-family:var(--font-family-mono);">${a.max_marks || 100}</td>
            <td style="text-align:center;"><span class="badge badge-sem">${a.submission_count || 0} Turned in</span></td>
          </tr>
        `).join('');
      }
    }

    openModal('modal-assignment-schedule');
  };

  // Print Assignment Schedule
  window.printAssignmentSchedule = function () {
    const assignments = state.courseFileData?.system_data?.assignments || [];
    const g = state.courseFileData?.group || {};

    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Assignment & Tutorial Schedule — ${g.subject_name || 'Course File'}</title>
        <style>
          body { font-family: sans-serif; padding: 2rem; color: #111; }
          h2, h3 { margin: 0 0 0.5rem; }
          table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
          th, td { border: 1px solid #333; padding: 6px 10px; font-size: 10pt; }
          th { background: #eee; }
        </style>
      </head>
      <body>
        <h2>Institutional Course File — Assignment and Tutorial Schedule (Item #14)</h2>
        <h3>${escapeHtml(g.subject_name || '')} (${escapeHtml(g.subject_code || '')})</h3>
        <p>Faculty: ${escapeHtml(g.teacher_name || '')} | Semester: ${g.semester || 1} | Dept: ${escapeHtml(g.department_name || '')}</p>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Assignment / Tutorial Title</th><th>Issue Date</th><th>Submission Deadline</th><th>Max Marks</th><th>Turned In</th>
            </tr>
          </thead>
          <tbody>
            ${assignments.map((a, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${a.title || ''}</td>
                <td>${formatDate(a.created_at)}</td>
                <td>${formatDate(a.due_date)}</td>
                <td>${a.max_marks || 100}</td>
                <td>${a.submission_count || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 3rem; display: flex; justify-content: space-between;">
          <div>Faculty Signature: __________________</div>
          <div>HOD Signature: __________________</div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
  };

  // Modal 5: Open Evaluation Scheme Modal (Item #12)
  window.openEvaluationSchemeModal = function () {
    const scheme = state.courseFileData?.course_file?.evaluation_scheme || {
      mid_sem: 20,
      assignments: 10,
      lab_work: 15,
      attendance: 5,
      total: 50
    };

    const midInput = document.getElementById('eval-midsem');
    const assInput = document.getElementById('eval-assignments');
    const labInput = document.getElementById('eval-lab');
    const attInput = document.getElementById('eval-attendance');

    if (midInput) midInput.value = scheme.mid_sem ?? 20;
    if (assInput) assInput.value = scheme.assignments ?? 10;
    if (labInput) labInput.value = scheme.lab_work ?? 15;
    if (attInput) attInput.value = scheme.attendance ?? 5;

    recalcEvalTotal();
    openModal('modal-evaluation-scheme');
  };

  window.recalcEvalTotal = function () {
    const mid = parseInt(document.getElementById('eval-midsem')?.value || '0', 10);
    const ass = parseInt(document.getElementById('eval-assignments')?.value || '0', 10);
    const lab = parseInt(document.getElementById('eval-lab')?.value || '0', 10);
    const att = parseInt(document.getElementById('eval-attendance')?.value || '0', 10);
    const total = mid + ass + lab + att;

    const display = document.getElementById('eval-total-display');
    if (display) display.innerText = `${total} Marks`;
  };

  window.saveEvaluationScheme = async function (e) {
    e.preventDefault();
    const courseFileId = state.courseFileData?.course_file?.id;
    if (!courseFileId) return;

    const scheme = {
      mid_sem: parseInt(document.getElementById('eval-midsem')?.value || '0', 10),
      assignments: parseInt(document.getElementById('eval-assignments')?.value || '0', 10),
      lab_work: parseInt(document.getElementById('eval-lab')?.value || '0', 10),
      attendance: parseInt(document.getElementById('eval-attendance')?.value || '0', 10),
      total: 0
    };
    scheme.total = scheme.mid_sem + scheme.assignments + scheme.lab_work + scheme.attendance;

    try {
      const res = await apiFetch(`/course-files/${courseFileId}/evaluation-scheme`, {
        method: 'PUT',
        body: scheme
      });
      if (res && res.success) {
        showToast('Evaluation scheme updated successfully', 'success');
        closeModal('modal-evaluation-scheme');
        await loadCourseFileDossier();
      } else {
        showToast(res?.error?.message || 'Failed to save scheme', 'error');
      }
    } catch (err) {
      showToast('Error saving evaluation scheme', 'error');
    }
  };

  // Modal 6: Course Outcomes & Matrix (Items #3 & #4)
  window.openCopoMatrixModal = function () {
    const cf = state.courseFileData?.course_file || {};
    const defaultCos = [
      { code: 'CO1', text: 'Understand core principles, fundamental syntax and architectural concepts', bloom: 'L2 (Understand)' },
      { code: 'CO2', text: 'Apply algorithmic methodologies and data structures to practical computing problems', bloom: 'L3 (Apply)' },
      { code: 'CO3', text: 'Analyze system constraints, performance bottlenecks and execution complexities', bloom: 'L4 (Analyze)' },
      { code: 'CO4', text: 'Design and implement robust modular software components complying with technical standards', bloom: 'L6 (Create)' },
      { code: 'CO5', text: 'Evaluate testing metrics, continuous assessment test results and system outputs', bloom: 'L5 (Evaluate)' },
      { code: 'CO6', text: 'Collaborate ethically in engineering teams and articulate technical documentation', bloom: 'L3 (Apply)' }
    ];

    const cos = cf.course_outcomes || defaultCos;
    const coListContainer = document.getElementById('co-list-inputs');

    if (coListContainer) {
      coListContainer.innerHTML = cos.map((co, idx) => `
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <strong style="width:50px;font-family:var(--font-family-mono);color:var(--color-primary);">${co.code}:</strong>
          <input type="text" class="form-control" style="flex:1;" id="co-text-${idx}" value="${escapeHtml(co.text)}">
          <input type="text" class="form-control" style="width:130px;" id="co-bloom-${idx}" value="${escapeHtml(co.bloom)}">
        </div>
      `).join('');
    }

    // Matrix
    const savedMatrix = cf.copo_matrix || {};
    const tbody = document.getElementById('tbody-copo-matrix');
    const pos = ['PO1','PO2','PO3','PO4','PO5','PO6','PO7','PO8','PO9','PO10','PO11','PO12','PSO1','PSO2'];

    if (tbody) {
      tbody.innerHTML = [1,2,3,4,5,6].map(coNum => {
        const coKey = `CO${coNum}`;
        const cells = pos.map(po => {
          const val = savedMatrix[coKey]?.[po] || '';
          return `<td><input type="number" min="1" max="3" class="form-control" style="width:36px;padding:2px;text-align:center;font-size:0.75rem;" id="mat-${coKey}-${po}" value="${val}"></td>`;
        }).join('');
        return `<tr><td style="font-weight:700;font-family:var(--font-family-mono);">${coKey}</td>${cells}</tr>`;
      }).join('');
    }

    openModal('modal-copo-matrix');
  };

  window.saveCopoData = async function () {
    const courseFileId = state.courseFileData?.course_file?.id;
    if (!courseFileId) return;

    const cos = [1,2,3,4,5,6].map((num, idx) => ({
      code: `CO${num}`,
      text: document.getElementById(`co-text-${idx}`)?.value || '',
      bloom: document.getElementById(`co-bloom-${idx}`)?.value || ''
    }));

    const pos = ['PO1','PO2','PO3','PO4','PO5','PO6','PO7','PO8','PO9','PO10','PO11','PO12','PSO1','PSO2'];
    const copo_matrix = {};
    [1,2,3,4,5,6].forEach(num => {
      const coKey = `CO${num}`;
      copo_matrix[coKey] = {};
      pos.forEach(po => {
        const val = document.getElementById(`mat-${coKey}-${po}`)?.value;
        if (val) copo_matrix[coKey][po] = parseInt(val, 10);
      });
    });

    try {
      const res = await apiFetch(`/course-files/${courseFileId}/structured-data`, {
        method: 'PUT',
        body: { cos, copo_matrix }
      });
      if (res && res.success) {
        showToast('Outcomes & Matrix saved successfully', 'success');
        closeModal('modal-copo-matrix');
        await loadCourseFileDossier();
      } else {
        showToast(res?.error?.message || 'Failed to save outcomes', 'error');
      }
    } catch (err) {
      showToast('Error saving data', 'error');
    }
  };

  // Modal 7: Learners Diagnostic View (Items #9 & #10)
  window.openLearnersModal = function (typeKey) {
    const isAdvanced = typeKey === 'advanced_learners';
    const students = isAdvanced 
      ? (state.courseFileData?.system_data?.advanced_learners || [])
      : (state.courseFileData?.system_data?.slow_learners || []);

    const titleEl = document.getElementById('learners-modal-title');
    const subEl = document.getElementById('learners-modal-subtitle');
    const tbody = document.getElementById('tbody-learners-roster');
    const uploadBtn = document.getElementById('btn-learners-upload-pdf');

    if (titleEl) titleEl.innerText = isAdvanced ? 'List of Advanced Learners (Item #9)' : 'List of Slow Learners (Item #10)';
    if (subEl) subEl.innerText = isAdvanced 
      ? 'Students exhibiting superior engagement & regular attendance (> 80%)'
      : 'Students requiring remedial coaching & academic counseling (< 75% attendance)';

    if (uploadBtn) {
      uploadBtn.onclick = () => openDirectUploadModal(typeKey, isAdvanced ? 'Advanced Learners PDF' : 'Slow Learners Remedial Plan PDF');
    }

    if (tbody) {
      if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">No students categorized under this criterion currently.</td></tr>`;
      } else {
        tbody.innerHTML = students.map(s => `
          <tr>
            <td style="font-weight:700;font-family:var(--font-family-mono);">${s.roll_no || '--'}</td>
            <td style="font-family:var(--font-family-mono);color:var(--text-muted);">${escapeHtml(s.enrollment_no || '--')}</td>
            <td><strong>${escapeHtml(s.full_name)}</strong></td>
            <td style="text-align:center;"><span class="badge ${isAdvanced ? 'badge-present' : 'badge-absent'}">${s.attendance_pct != null ? s.attendance_pct + '%' : '—'}</span></td>
            <td>${isAdvanced ? '✓ Special GATE / competitive task mentoring assigned' : '⚠️ Remedial counseling & extra classes scheduled'}</td>
          </tr>
        `).join('');
      }
    }

    openModal('modal-learners-view');
  };

  // Modal 8: HOD Audit Sign-Off
  window.openHodAuditModal = function () {
    const cf = state.courseFileData?.course_file || {};
    const statusSelect = document.getElementById('audit-decision-status');
    const remarksField = document.getElementById('audit-remarks-text');

    if (statusSelect) statusSelect.value = cf.status === 'APPROVED' ? 'APPROVED' : (cf.status === 'REVISION_REQUESTED' ? 'REVISION_REQUESTED' : 'APPROVED');
    if (remarksField) remarksField.value = cf.hod_remarks || '';

    openModal('modal-hod-audit');
  };

  window.submitHodAudit = async function (e) {
    e.preventDefault();
    const courseFileId = state.courseFileData?.course_file?.id;
    if (!courseFileId) return;

    const status = document.getElementById('audit-decision-status')?.value;
    const remarks = document.getElementById('audit-remarks-text')?.value;

    try {
      const res = await apiFetch(`/course-files/${courseFileId}/audit`, {
        method: 'POST',
        body: { status, remarks }
      });
      if (res && res.success) {
        showToast(`Course file decision saved: ${status}`, 'success');
        closeModal('modal-hod-audit');
        await loadCourseFileDossier();
      } else {
        showToast(res?.error?.message || 'Audit sign-off failed', 'error');
      }
    } catch (err) {
      showToast('Error saving audit decision', 'error');
    }
  };

  // 1-Click Institutional Dossier Cover & Index Sheet Print
  window.printDossierIndex = function () {
    const data = state.courseFileData;
    if (!data) return;

    const g = data.group;
    const cf = data.course_file;
    const items = data.items;

    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Course File Dossier — ${escapeHtml(g.subject_name || '')}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 2rem; color: #000; line-height: 1.4; }
          .cover-page { page-break-after: always; text-align: center; border: 3px double #000; padding: 3rem 2rem; min-height: 85vh; display: flex; flex-direction: column; justify-content: space-between; }
          .inst-title { font-size: 22pt; font-weight: bold; text-transform: uppercase; margin-bottom: 0.5rem; }
          .inst-sub { font-size: 13pt; margin-bottom: 1.5rem; font-style: italic; }
          .cf-main-badge { font-size: 20pt; font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000; display: inline-block; padding: 0.5rem 2rem; margin: 2rem 0; letter-spacing: 0.1em; }
          .course-details-box { text-align: left; margin: 2rem auto; width: 85%; font-size: 13pt; border: 1px solid #000; padding: 1.25rem 2rem; }
          .course-details-box td { padding: 6px 12px; }
          .sign-footer { display: flex; justify-content: space-between; margin-top: 3rem; font-size: 12pt; }
          .index-page { margin-top: 2rem; }
          .index-title { text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 1rem; text-transform: uppercase; }
          table.index-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
          table.index-table th, table.index-table td { border: 1px solid #000; padding: 7px 10px; font-size: 10pt; }
          table.index-table th { background: #f0f0f0; text-align: center; }
          .badge-print { font-weight: bold; font-size: 9pt; }
        </style>
      </head>
      <body>
        <!-- Page 1: Official Institutional Dossier Cover -->
        <div class="cover-page">
          <div>
            <div class="inst-title">FACULTY OF ENGINEERING &amp; TECHNOLOGY</div>
            <div class="inst-sub">Department of ${escapeHtml(g.department_name || 'Information Technology')}</div>
            <div class="cf-main-badge">COURSE FILE DOSSIER</div>
            <div style="font-size: 11pt; color: #444;">Accredited in accordance with NBA / NAAC Tier-I &amp; Tier-II Quality Standards</div>
          </div>

          <table class="course-details-box">
            <tr><td><strong>Subject Title:</strong></td><td>${escapeHtml(g.subject_name || '')}</td></tr>
            <tr><td><strong>Subject Code:</strong></td><td>${escapeHtml(g.subject_code || '--')}</td></tr>
            <tr><td><strong>Component / Type:</strong></td><td>${escapeHtml(g.component || 'THEORY')}</td></tr>
            <tr><td><strong>Semester:</strong></td><td>Semester ${g.semester || 1}</td></tr>
            <tr><td><strong>Academic Year:</strong></td><td>${escapeHtml(g.academic_year_label || '2026-27')}</td></tr>
            <tr><td><strong>Faculty In-Charge:</strong></td><td>${escapeHtml(g.teacher_name || '')} (${escapeHtml(g.teacher_code || 'FACULTY')})</td></tr>
            <tr><td><strong>Audit Status:</strong></td><td><strong>${(cf.status || 'IN_PROGRESS').replace(/_/g, ' ')}</strong></td></tr>
            <tr><td><strong>Compliance Score:</strong></td><td><strong>${cf.completed_items} / ${cf.total_items} Artifacts (${cf.completion_pct}%)</strong></td></tr>
          </table>

          <div>
            <div class="sign-footer">
              <div>Faculty Member Signature<br><br>___________________________</div>
              <div>Head of Department (HOD)<br><br>___________________________</div>
              <div>Principal / Dean Quality Assurance<br><br>___________________________</div>
            </div>
            <div style="margin-top: 2rem; font-size: 9pt; color: #666;">Generated via VidyaOS Institutional Campus OS on ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}</div>
          </div>
        </div>

        <!-- Page 2: Table of Contents & Compliance Checklist -->
        <div class="index-page">
          <div class="index-title">Course File Table of Contents &amp; Compliance Audit Checklist</div>
          <table class="index-table">
            <thead>
              <tr>
                <th style="width: 40px;">S.No</th>
                <th style="width: 250px;">Mandatory Artifact Item</th>
                <th>Standard Description</th>
                <th style="width: 100px;">Format / Sync</th>
                <th style="width: 90px;">Status</th>
                <th style="width: 90px;">Auditor Sign</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const doc = item.document;
                const statusStr = doc ? `✓ ${doc.file_name.slice(-18)}` : (item.has_system_data ? '⚡ Auto-Synced' : '— Missing');
                return `
                  <tr>
                    <td style="text-align: center; font-weight: bold;">${item.num}</td>
                    <td><strong>${escapeHtml(item.title)}</strong></td>
                    <td style="font-size: 9pt;">${escapeHtml(item.desc)}</td>
                    <td style="text-align: center; font-size: 9pt;">${escapeHtml(item.type)}</td>
                    <td style="text-align: center;" class="badge-print">${statusStr}</td>
                    <td></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div style="margin-top: 2rem; font-size: 10pt;">
            <p><strong>Department HOD Remarks / ATR:</strong> ${escapeHtml(cf.hod_remarks || 'All required artifacts reviewed in compliance with university syllabus and internal quality assurance guidelines.')}</p>
          </div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
  };

  // Modal helpers
  window.openModal = function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    // Close other modals if open
    document.querySelectorAll('.modal.open').forEach(m => {
      if (m.id !== id) {
        m.classList.remove('open');
        m.style.display = 'none';
      }
    });
    el.classList.add('open');
    el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  window.closeModal = function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('open');
      el.style.display = 'none';
    }
    if (id === 'modal-pdf-preview') {
      const frame = document.getElementById('pdf-preview-frame');
      if (frame) frame.src = 'about:blank';
    }
    if (!document.querySelector('.modal.open')) {
      document.body.style.overflow = '';
    }
  };

  // Keyboard shortcut: Escape closes topmost modal
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      const activeModal = document.querySelector('.modal.open');
      if (activeModal && activeModal.id) {
        window.closeModal(activeModal.id);
      }
    }
  });

  // Nav toggles
  window.toggleAppsLauncher = function () {
    const d = document.getElementById('apps-launcher-dropdown');
    if (d) d.style.display = d.style.display === 'none' ? 'grid' : 'none';
  };

  window.toggleUserProfile = function () {
    const d = document.getElementById('gc-profile-dropdown');
    if (d) d.style.display = d.style.display === 'none' ? 'block' : 'none';
  };

  window.toggleTheme = function () {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  window.handleLogout = function () {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
  };

})();
