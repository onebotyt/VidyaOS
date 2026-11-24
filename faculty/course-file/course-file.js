/**
 * Classroom Academic Dossier & Course File — Client Logic
 * Location: frontend/faculty/course-file/course-file.js
 * VidyaOS Institutional Campus Operating System
 * Unified Multi-Module Dynamic Architecture & PDF Merge Export
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
    currentType: 'theory', // 'theory', 'lab', 'nba', 'performance', 'direct', 'indirect', 'all'
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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(dStr) {
    if (!dStr) return '—';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) {
      return dStr;
    }
  }

  function showToast(msg, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    } else {
      console.log(`[Toast ${type}]: ${msg}`);
    }
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

      // Parse Query Params - Support all common aliases
      const params = new URLSearchParams(window.location.search);
      const urlGroupId = params.get('group_id') || params.get('groupId') || params.get('class_id') || params.get('classId') || params.get('id');
      const urlSubjectId = params.get('subject_id') || params.get('subjectId');
      const urlRegisterId = params.get('register_id') || params.get('registerId');
      const urlType = params.get('type') || params.get('tab') || 'theory';

      if (urlGroupId) state.currentGroupId = parseInt(urlGroupId, 10);
      if (urlSubjectId) state.currentSubjectId = parseInt(urlSubjectId, 10);
      if (urlRegisterId) state.currentRegisterId = parseInt(urlRegisterId, 10);
      state.currentType = urlType.toLowerCase();

      // Sync module dropdown
      const typeSelector = document.getElementById('select-dossier-type');
      if (typeSelector) typeSelector.value = state.currentType;

      // 1. First load teacher's active classes to populate selector and find fallback class
      await loadAvailableClasses();

      // 2. If no class was passed in URL, default to first available active class
      if (!state.currentGroupId && state.allClasses && state.allClasses.length > 0) {
        state.currentGroupId = state.allClasses[0].id;
        const selector = document.getElementById('select-class-switch');
        if (selector) selector.value = String(state.currentGroupId);
      }

      // 3. Load Course File / Academic Dossier
      await loadCourseFileDossier();

      // 4. Handle Deep-linked Document and Action (?doc=...&action=...)
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
      'lesson_plan': 'delivery_plan',
      'sample_answer_scripts': 'answer_scripts',
      'internal_assessment': 'internal_assessment_plan'
    };

    const targetKey = aliasMap[rawDoc] || rawDoc;
    const item = state.courseFileData.items.find(i => i.key === targetKey || i.key.includes(targetKey));
    if (!item) return;

    if (action === 'upload') {
      setTimeout(() => openDirectUploadModal(item.key, item.title), 350);
    } else if (action === 'view') {
      setTimeout(() => {
        if (item.document?.file_path) {
          previewDocument(item.document.file_path, item.title);
        } else if (item.key === 'student_list') {
          openStudentRosterModal();
        } else if (item.key === 'assignment_schedule') {
          openAssignmentScheduleModal();
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

        // If no groupId set, pick first available class
        if (!state.currentGroupId && state.allClasses.length > 0) {
          state.currentGroupId = state.allClasses[0].id;
        }

        const selector = document.getElementById('select-class-switch');
        if (selector) {
          if (state.allClasses.length === 0) {
            selector.innerHTML = '<option value="">No classes found</option>';
            return;
          }

          selector.innerHTML = state.allClasses.map(c => `
            <option value="${c.id}" ${c.id === state.currentGroupId ? 'selected' : ''}>
              ${escapeHtml(c.subject_name || c.name)} (Sem ${c.semester || '--'})
            </option>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Failed to load class list', err);
    }
  }

  // Switch class handler
  window.onSwitchClass = async function (newGroupId) {
    if (!newGroupId) return;
    state.currentGroupId = parseInt(newGroupId, 10);
    const url = new URL(window.location.href);
    url.searchParams.set('groupId', newGroupId);
    url.searchParams.set('type', state.currentType);
    window.history.replaceState({}, '', url.toString());

    await loadCourseFileDossier();
  };

  // Switch dossier module handler (theory, lab, nba, performance, direct, indirect, all)
  window.onSwitchDossierType = async function (type) {
    if (!type) return;
    state.currentType = type.toLowerCase();
    state.currentCategory = 'all';

    const selector = document.getElementById('select-dossier-type');
    if (selector && selector.value !== state.currentType) {
      selector.value = state.currentType;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('type', state.currentType);
    if (state.currentGroupId) url.searchParams.set('groupId', state.currentGroupId);
    window.history.replaceState({}, '', url.toString());

    await loadCourseFileDossier();
  };

  // Render Empty State when no classes exist
  function renderEmptyClassState(customMsg) {
    const titleEl = document.getElementById('cf-hero-title');
    const semEl = document.getElementById('cf-hero-sem');
    const compEl = document.getElementById('cf-hero-component');
    const ayEl = document.getElementById('cf-hero-ay');
    const codeEl = document.getElementById('cf-hero-code');
    const deptEl = document.getElementById('cf-hero-dept');
    const teacherEl = document.getElementById('cf-hero-teacher');
    const statusBadge = document.getElementById('cf-hero-status-badge');
    const scoreEl = document.getElementById('cf-meter-score');
    const pctEl = document.getElementById('cf-meter-pct');
    const barEl = document.getElementById('cf-meter-bar');
    const capEl = document.getElementById('cf-meter-caption');
    const container = document.getElementById('cf-cards-grid');

    if (titleEl) titleEl.innerText = customMsg || 'No Active Classes Found';
    if (semEl) semEl.innerText = 'Semester --';
    if (compEl) compEl.innerText = state.currentType.toUpperCase();
    if (ayEl) ayEl.innerText = 'AY 2026-27';
    if (codeEl) codeEl.innerText = '--';
    if (deptEl) deptEl.innerText = 'Academic Dept';
    if (teacherEl) teacherEl.innerText = state.currentUser?.full_name || 'Faculty Member';
    if (statusBadge) {
      statusBadge.innerText = 'NO CLASSES';
      statusBadge.className = 'badge badge-late';
    }
    if (scoreEl) scoreEl.innerText = '0 / 0';
    if (pctEl) pctEl.innerText = '0%';
    if (barEl) barEl.style.width = '0%';
    if (capEl) capEl.innerText = 'No Active Course Selected';

    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1.5rem; background: var(--bg-card); border: 1.5px dashed var(--border-color); border-radius: var(--radius-lg); margin-top: 1rem;">
          <div style="width: 56px; height: 56px; margin: 0 auto 1.25rem; border-radius: 50%; background: var(--bg-surface-hover); display: flex; align-items: center; justify-content: center; color: var(--color-primary);">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">No Dossier Data Available</h3>
          <p style="font-size: 0.88rem; color: var(--text-muted); max-width: 480px; margin: 0 auto 1.5rem; line-height: 1.5;">
            There are no teaching group classes active for your profile. Please check your assigned subjects or contact the department HOD.
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center;">
            <a href="/faculty/classes/index.html" class="btn btn-primary" style="text-decoration:none; display:inline-flex; align-items:center; gap:0.4rem;">
              <span>Go to Classroom</span>
            </a>
          </div>
        </div>
      `;
    }
  }

  // Load Course File Dossier from Backend (Dynamic Multi-Module Engine)
  async function loadCourseFileDossier() {
    if (!state.currentGroupId && !state.currentSubjectId) {
      renderEmptyClassState();
      return;
    }

    try {
      const queryParam = state.currentGroupId
        ? `group_id=${state.currentGroupId}`
        : `subject_id=${state.currentSubjectId}`;

      const res = await apiFetch(`/course-files?${queryParam}&type=${state.currentType}`);
      if (res && res.success && res.data) {
        state.courseFileData = res.data;
        renderHeroBanner();
        renderCategoryTabs();
        renderArtifactCards();
      } else {
        showToast(res?.error?.message || 'Failed to load dossier', 'error');
        renderEmptyClassState(res?.error?.message || 'Unable to load dossier');
      }
    } catch (err) {
      console.error('Error fetching dossier:', err);
      showToast('Error loading dossier', 'error');
      renderEmptyClassState('Error loading dossier');
    }
  }

  // Render Hero Banner Card
  function renderHeroBanner() {
    const data = state.courseFileData;
    if (!data) return;

    const g = data.group || {};
    const cf = data.course_file || {};

    const titleEl = document.getElementById('cf-hero-title');
    const semEl = document.getElementById('cf-hero-sem');
    const compEl = document.getElementById('cf-hero-component');
    const ayEl = document.getElementById('cf-hero-ay');
    const codeEl = document.getElementById('cf-hero-code');
    const deptEl = document.getElementById('cf-hero-dept');
    const teacherEl = document.getElementById('cf-hero-teacher');
    const statusBadge = document.getElementById('cf-hero-status-badge');

    const modLabelMap = {
      theory: 'Theory Classes, Syllabus & Lesson Plans',
      lab: 'Laboratory Classes & Practicals',
      nba: 'NBA / NAAC Course File Dossier',
      performance: 'Student Performance & Remedial Actions',
      direct: 'Direct Assessment & Attainment',
      indirect: 'Indirect Assessment & Stakeholder Feedback',
      all: 'Consolidated Classroom Academic Dossier'
    };

    const displayTitle = data.dossier_title || modLabelMap[state.currentType] || 'Academic Dossier';
    if (titleEl) titleEl.innerText = `${displayTitle} — ${g.subject_name || g.name || 'Classroom'}`;
    if (semEl) semEl.innerText = `Semester ${g.semester || 1}`;
    if (compEl) compEl.innerText = (data.dossier_type || state.currentType).toUpperCase();
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

    const total = cf.total_items || (data.items?.length || 18);
    const done = cf.completed_items || 0;
    const pct = cf.completion_pct != null ? cf.completion_pct : (total > 0 ? Math.round((done / total) * 100) : 0);

    if (scoreEl) scoreEl.innerText = `${done} / ${total}`;
    if (pctEl) pctEl.innerText = `${pct}%`;
    if (barEl) {
      barEl.style.width = `${Math.min(100, Math.max(3, pct))}%`;
      barEl.style.background = pct >= 85 ? 'var(--status-present)' : (pct >= 50 ? 'var(--color-primary)' : 'var(--status-late)');
    }
    if (capEl) {
      capEl.innerText = pct === 100
        ? 'Complete — 100% Audit Ready'
        : (pct >= 70 ? 'Satisfactory — Final Reviews Pending' : 'Documentation In Progress');
    }

    // Quick Toolbar Links
    const rollcallLink = document.getElementById('btn-quick-rollcall');
    const registerLink = document.getElementById('btn-quick-register');
    const classworkLink = document.getElementById('btn-quick-classwork');

    const gid = g.id || state.currentGroupId || '';
    if (rollcallLink) rollcallLink.href = `/faculty/registers/index.html?groupId=${gid}&action=rollcall`;
    if (registerLink) registerLink.href = `/faculty/registers/index.html?groupId=${gid}`;
    if (classworkLink) classworkLink.href = `/faculty/registers/index.html?groupId=${gid}&tab=assignments`;

    // HOD Audit Trigger
    const hodAuditBtn = document.getElementById('cf-hod-audit-trigger');
    if (hodAuditBtn) {
      hodAuditBtn.style.display = state.isHodOrAdmin ? 'block' : 'none';
    }

    // HOD Remarks Banner
    const remarksBanner = document.getElementById('cf-remarks-banner');
    const remarksText = document.getElementById('cf-remarks-text');
    const remarksMeta = document.getElementById('cf-remarks-meta');

    if (remarksBanner && cf.hod_remarks) {
      remarksBanner.style.display = 'flex';
      if (remarksText) remarksText.innerText = cf.hod_remarks;
      if (remarksMeta) remarksMeta.innerText = `Audit review updated on ${formatDate(cf.updated_at)}`;
    } else if (remarksBanner) {
      remarksBanner.style.display = 'none';
    }
  }

  // Dynamic Category Tabs Generator
  function renderCategoryTabs() {
    const container = document.querySelector('.cf-tab-pills');
    if (!container) return;
    const items = state.courseFileData?.items || [];
    const t = state.currentType;

    let categories = [];
    if (t === 'theory') {
      categories = [
        { key: 'all', label: 'All Records' },
        { key: 'attendance', label: 'Attendance & Log' },
        { key: 'instruction', label: 'Curriculum & Coverage' },
        { key: 'pedagogy', label: 'Pedagogy & Assessment' }
      ];
    } else if (t === 'lab') {
      categories = [
        { key: 'all', label: 'All Records' },
        { key: 'attendance', label: 'Attendance & Batches' },
        { key: 'manuals', label: 'Manuals & Setup' },
        { key: 'evaluation', label: 'Evaluation & Viva' }
      ];
    } else if (t === 'performance') {
      categories = [
        { key: 'all', label: 'All Records' },
        { key: 'advanced_learners', label: 'Advanced Learners' },
        { key: 'slow_learners', label: 'Slow Learners' },
        { key: 'remedial_measures', label: 'Remedial Measures' },
        { key: 'evidence', label: 'Evidence & Records' }
      ];
    } else if (t === 'direct') {
      categories = [
        { key: 'all', label: 'All 8 Records' },
        { key: 'exams', label: 'Internal Exams & Tests' },
        { key: 'practicals', label: 'Lab & Projects' },
        { key: 'attainment', label: 'CO Attainment Sheets' }
      ];
    } else if (t === 'indirect') {
      categories = [
        { key: 'all', label: 'All 5 Records' },
        { key: 'surveys', label: 'Student & Alumni Surveys' },
        { key: 'appraisal', label: 'Faculty Self-Appraisal' },
        { key: 'attainment', label: 'Indirect Attainment' }
      ];
    } else if (t === 'all') {
      categories = [
        { key: 'all', label: 'All Modules' },
        { key: 'theory', label: 'Theory Classes' },
        { key: 'lab', label: 'Laboratory' },
        { key: 'nba', label: 'NBA Course File' },
        { key: 'performance', label: 'Performance' },
        { key: 'direct', label: 'Direct' },
        { key: 'indirect', label: 'Indirect' }
      ];
    } else {
      // Default: NBA
      categories = [
        { key: 'all', label: 'All 18 Documents' },
        { key: 'curriculum', label: 'Curriculum & Syllabus' },
        { key: 'students', label: 'Students & Diagnostics' },
        { key: 'assessment', label: 'Assessments & Schedules' },
        { key: 'review', label: 'Review & Attainment' }
      ];
    }

    container.innerHTML = categories.map(c => {
      let count = 0;
      if (c.key === 'all') {
        count = items.length;
      } else if (t === 'all') {
        count = items.filter(i => i.module_type === c.key).length;
      } else {
        count = items.filter(i => i.category === c.key || (i.category && i.category.includes(c.key))).length;
      }
      const isActive = state.currentCategory === c.key;
      return `
        <button type="button" class="cf-tab-pill ${isActive ? 'active' : ''}" onclick="setCategoryFilter('${c.key}', this)" role="tab" aria-selected="${isActive}">
          <span>${escapeHtml(c.label)}</span>
          <span class="cf-tab-count" id="count-cat-${c.key}">${count}</span>
        </button>
      `;
    }).join('');
  }

  // Set Category Filter
  window.setCategoryFilter = function (catKey, btnEl) {
    state.currentCategory = catKey;
    document.querySelectorAll('.cf-tab-pill').forEach(btn => btn.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderArtifactCards();
  };

  // Search input handler
  window.onSearchDocuments = function (query) {
    state.searchQuery = (query || '').trim();
    renderArtifactCards();
  };

  // Render Artifact Cards Grid
  function renderArtifactCards() {
    const container = document.getElementById('cf-cards-grid');
    if (!container || !state.courseFileData) return;

    let items = state.courseFileData.items || [];

    // Filter by Category
    if (state.currentCategory !== 'all') {
      if (state.currentType === 'all') {
        items = items.filter(i => i.module_type === state.currentCategory);
      } else {
        items = items.filter(i => i.category === state.currentCategory || (i.category && i.category.includes(state.currentCategory)));
      }
    }

    // Filter by Search Query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      items = items.filter(i =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.desc || '').toLowerCase().includes(q) ||
        String(i.num || '').includes(q)
      );
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg);">
          <div style="color:var(--text-muted); margin-bottom: 0.5rem;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">No matching dossier artifacts</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0;">Try adjusting your category filter or search terms.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map((item, idx) => {
      const doc = item.document;
      const isComplete = item.is_completed;
      const hasSystemData = item.has_system_data;
      const itemNum = item.num || idx + 1;

      // Status Badge
      let statusBadgeHtml = '';
      if (doc) {
        statusBadgeHtml = `<span class="badge badge-present" style="font-size:0.7rem;display:inline-flex;align-items:center;gap:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Uploaded (${formatBytes(doc.file_size)})</span>`;
      } else if (hasSystemData) {
        statusBadgeHtml = `<span class="badge badge-sem" style="font-size:0.7rem;display:inline-flex;align-items:center;gap:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> Live Synced</span>`;
      } else {
        statusBadgeHtml = `<span class="badge badge-late" style="font-size:0.7rem;display:inline-flex;align-items:center;gap:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Action Required</span>`;
      }

      // Action Buttons
      let actionsHtml = '';

      if (doc && doc.file_path) {
        actionsHtml = `
          <button type="button" class="cf-card-btn primary" onclick="previewDocument('${escapeHtml(doc.file_path)}', '${escapeHtml(item.title)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>View PDF</span>
          </button>
          <a href="${escapeHtml(doc.file_path)}" download class="cf-card-btn" style="text-decoration:none;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Download</span>
          </a>
          <button type="button" class="cf-card-btn" onclick="openDirectUploadModal('${item.key}', '${escapeHtml(item.title)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
            <span>Replace</span>
          </button>
          <button type="button" class="cf-card-btn item-danger" onclick="deleteDocument('${item.key}', '${escapeHtml(item.title)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Delete</span>
          </button>
        `;
      } else {
        // Special modals for items with system data
        let extraBtn = '';
        if (item.key === 'student_list') {
          extraBtn = `<button type="button" class="cf-card-btn" onclick="openStudentRosterModal()">Live Roster</button>`;
        } else if (item.key === 'assignment_schedule') {
          extraBtn = `<button type="button" class="cf-card-btn" onclick="openAssignmentScheduleModal()">Classwork Tasks</button>`;
        }

        actionsHtml = `
          <button type="button" class="cf-card-btn primary" onclick="openDirectUploadModal('${item.key}', '${escapeHtml(item.title)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <span>Upload PDF</span>
          </button>
          ${extraBtn}
        `;
      }

      // Status Box (if uploaded or metadata)
      let docStatusBoxHtml = '';
      if (doc && doc.file_path) {
        docStatusBoxHtml = `
          <div class="cf-card-status-box">
            <div class="cf-doc-info-left">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--status-present);flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              <span class="cf-doc-filename" title="${escapeHtml(doc.file_name || 'Document.pdf')}">${escapeHtml(doc.file_name || 'Document.pdf')}</span>
              <span class="cf-doc-meta">(${formatBytes(doc.file_size || 0)})</span>
            </div>
            ${doc.updated_at ? `<span class="cf-doc-meta">${formatDate(doc.updated_at)}</span>` : ''}
          </div>
        `;
      }

      const modBadgeLabel = item.module_label || item.category_label || item.category || 'Dossier';

      return `
        <div class="cf-artifact-card cf-card ${isComplete ? 'is-complete complete' : ''}" id="artifact-card-${item.key}">
          <div class="cf-card-main-content">
            <div class="cf-card-num">#${itemNum}</div>
            <div class="cf-card-header-info">
              <div class="cf-card-title-row">
                <h4 class="cf-card-title">${escapeHtml(item.title)}</h4>
                <span class="badge" style="background:var(--bg-surface);border:1px solid var(--border-color);font-size:0.7rem;font-weight:600;">${escapeHtml(modBadgeLabel)}</span>
                ${statusBadgeHtml}
              </div>
              ${docStatusBoxHtml}
            </div>
          </div>
          <div class="cf-card-actions">
            ${actionsHtml}
          </div>
        </div>
      `;
    }).join('');
  }

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
    if (modalSubtitle) modalSubtitle.innerText = `Artifact: ${title}`;
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
      showToast('Dossier record not identified', 'error');
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
      const typeParam = state.currentType ? `?type=${state.currentType}` : '';
      const resp = await fetch(`/api/v1/course-files/${courseFileId}/documents${typeParam}`, {
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
      const typeParam = state.currentType ? `?type=${state.currentType}` : '';
      const res = await apiFetch(`/course-files/${courseFileId}/documents/${itemKey}${typeParam}`, {
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

  // ══════════════════════════════════════════════════════════════
  // COMBINE & EXPORT ALL DOCUMENTS ENGINE (MERGE TO ONE PDF)
  // ══════════════════════════════════════════════════════════════

  window.openCombineExportModal = function () {
    openModal('modal-combine-export');
    updateMergeModalPreview();
  };

  window.updateMergeModalPreview = function () {
    const scope = document.querySelector('input[name="export-merge-scope"]:checked')?.value || 'current';
    const items = state.courseFileData?.items || [];
    const t = state.currentType;

    const lblCurrent = document.getElementById('lbl-scope-current');
    const subCurrent = document.getElementById('sub-scope-current');
    if (lblCurrent) {
      lblCurrent.innerText = `Current Module (${t.toUpperCase()})`;
    }
    if (subCurrent) {
      subCurrent.innerText = `Only documents belonging to active module`;
    }

    const container = document.getElementById('merge-docs-checklist-preview');
    const summaryCount = document.getElementById('merge-summary-count');
    const summaryBadge = document.getElementById('merge-summary-badge');

    let targetItems = items;
    const uploaded = targetItems.filter(i => i.document && i.document.file_path);

    if (summaryCount) summaryCount.innerText = `Total Artifacts in Scope: ${targetItems.length}`;
    if (summaryBadge) {
      summaryBadge.innerText = `${uploaded.length} Uploaded (${targetItems.length - uploaded.length} Pending)`;
      summaryBadge.style.background = uploaded.length > 0 ? 'var(--status-present-bg)' : 'var(--status-late-bg)';
      summaryBadge.style.color = uploaded.length > 0 ? 'var(--status-present)' : 'var(--status-late)';
    }

    if (container) {
      if (targetItems.length === 0) {
        container.innerHTML = '<div style="padding:0.5rem;text-align:center;">No documents defined for this scope.</div>';
        return;
      }
      container.innerHTML = targetItems.map((item) => {
        const isUp = Boolean(item.document && item.document.file_path);
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 0.35rem 0.5rem; background: var(--bg-card); border-radius: var(--radius-xs, 4px); border: 1px solid var(--border-color);">
            <div style="display:flex; align-items:center; gap: 0.45rem; overflow:hidden;">
              <span style="font-weight:700; color: ${isUp ? 'var(--status-present)' : 'var(--status-late)'};">
                ${isUp ? '✓' : '○'}
              </span>
              <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 320px; color: var(--text-main);">
                ${escapeHtml(item.title)}
              </span>
            </div>
            <span style="font-size:0.75rem; color: ${isUp ? 'var(--status-present)' : 'var(--text-muted)'};">
              ${isUp ? 'Ready (' + formatBytes(item.document.file_size) + ')' : 'Pending'}
            </span>
          </div>
        `;
      }).join('');
    }
  };

  window.executeCombineExport = function () {
    const scope = document.querySelector('input[name="export-merge-scope"]:checked')?.value || 'current';
    const gid = state.currentGroupId;
    if (!gid) {
      showToast('No active class selected', 'error');
      return;
    }

    const spinner = document.getElementById('merge-btn-spinner');
    const text = document.getElementById('merge-btn-text');
    if (spinner) spinner.style.display = 'inline';
    if (text) text.innerText = 'Compiling Institutional PDF...';

    showToast('Merging and generating institutional PDF dossier...', 'info');

    const downloadUrl = `/api/v1/course-files/merge-export?group_id=${gid}&type=${state.currentType}&scope=${scope}`;

    // Trigger download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.setAttribute('download', '');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      if (spinner) spinner.style.display = 'none';
      if (text) text.innerText = 'Merge & Download Combined PDF';
      closeModal('modal-combine-export');
      showToast('Merged PDF download initiated!', 'success');
    }, 1200);
  };

  // ══════════════════════════════════════════════════════════════
  // EXISTING MODALS & HELPERS (Student Roster, Rubrics, CO-PO, etc.)
  // ══════════════════════════════════════════════════════════════

  // Modal 3: Open Student Roster Modal (Item #7)
  window.openStudentRosterModal = function () {
    const students = state.courseFileData?.system_data?.students || [];
    const tbody = document.getElementById('tbody-students-roster');
    const badge = document.getElementById('roster-count-badge');

    if (badge) badge.innerText = `${students.length} Students`;

    if (tbody) {
      if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-muted);">No enrolled students found in this subject class.</td></tr>`;
      } else {
        tbody.innerHTML = students.map((s, idx) => {
          const rollDisplay = s.roll_no && s.roll_no !== '--' ? s.roll_no : (idx + 1);
          const pct = s.attendance_pct != null ? `${s.attendance_pct}%` : '—';
          const pctClass = s.attendance_pct != null && s.attendance_pct >= 75 ? 'badge-present' : (s.attendance_pct != null ? 'badge-absent' : 'badge-sem');
          return `
            <tr>
              <td style="font-weight:700;font-family:var(--font-family-mono);font-size:0.8rem;text-align:center;width:44px;">${rollDisplay}</td>
              <td><strong style="line-height:1.25;font-size:0.84rem;color:var(--text-main);">${escapeHtml(s.full_name)}</strong></td>
              <td style="text-align:center;font-family:var(--font-family-mono);font-size:0.8rem;white-space:nowrap;">${s.attended_sessions || 0} / ${s.total_sessions || 0}</td>
              <td style="text-align:center;"><span class="badge ${pctClass}" style="font-size:0.7rem;padding:0.15rem 0.4rem;">${pct}</span></td>
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
              <th>Roll No</th><th>Full Name</th><th>Attended</th><th>Attendance %</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((s, idx) => `
              <tr>
                <td>${s.roll_no && s.roll_no !== '--' ? s.roll_no : (idx + 1)}</td>
                <td>${s.full_name || ''}</td>
                <td>${s.attended_sessions || 0} / ${s.total_sessions || 0}</td>
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

    if (badge) badge.innerText = `${assignments.length} Tasks`;

    if (tbody) {
      if (assignments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-muted);">No coursework assignments scheduled for this class.</td></tr>`;
      } else {
        tbody.innerHTML = assignments.map((a, idx) => `
          <tr>
            <td style="font-weight:700;font-family:var(--font-family-mono);font-size:0.8rem;text-align:center;width:35px;">${idx + 1}</td>
            <td>
              <div style="font-weight:600;line-height:1.25;font-size:0.83rem;color:var(--text-main);">${escapeHtml(a.title)}</div>
              <div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px;">
                Due: ${formatDate(a.due_date)}${a.max_marks ? ` • ${a.max_marks} Marks` : ''}
              </div>
            </td>
            <td class="col-marks-desktop" style="text-align:center;font-weight:600;font-size:0.8rem;">${a.max_marks || 100}</td>
            <td style="text-align:center;"><span class="badge badge-sem" style="font-size:0.7rem;padding:0.15rem 0.4rem;white-space:nowrap;">${a.submission_count || 0} Turned In</span></td>
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

  // Recalculate Evaluation Scheme Total
  window.recalcEvalTotal = function () {
    const m = parseInt(document.getElementById('eval-midsem')?.value || '0', 10);
    const a = parseInt(document.getElementById('eval-assignments')?.value || '0', 10);
    const l = parseInt(document.getElementById('eval-lab')?.value || '0', 10);
    const att = parseInt(document.getElementById('eval-attendance')?.value || '0', 10);

    const sum = m + a + l + att;
    const totBadge = document.getElementById('eval-scheme-total');
    if (totBadge) {
      totBadge.innerText = `${sum} Marks`;
      totBadge.className = sum === 50 ? 'badge badge-present' : 'badge badge-late';
    }
  };

  // Save Evaluation Scheme
  window.saveEvaluationScheme = async function (e) {
    e.preventDefault();
    const courseFileId = state.courseFileData?.course_file?.id;
    if (!courseFileId) return;

    const payload = {
      mid_sem: parseInt(document.getElementById('eval-midsem')?.value || '0', 10),
      assignments: parseInt(document.getElementById('eval-assignments')?.value || '0', 10),
      lab_work: parseInt(document.getElementById('eval-lab')?.value || '0', 10),
      attendance: parseInt(document.getElementById('eval-attendance')?.value || '0', 10)
    };
    payload.total = payload.mid_sem + payload.assignments + payload.lab_work + payload.attendance;

    try {
      const res = await apiFetch(`/course-files/${courseFileId}/evaluation-scheme`, {
        method: 'PUT',
        body: payload
      });
      if (res && res.success) {
        showToast('Evaluation scheme saved successfully', 'success');
        closeModal('modal-evaluation-scheme');
        await loadCourseFileDossier();
      } else {
        showToast(res?.error?.message || 'Failed to save evaluation scheme', 'error');
      }
    } catch (err) {
      showToast('Error saving evaluation scheme', 'error');
    }
  };

  // Modal 6: Open CO & CO-PO Matrix Modal (Items #3 & #4)
  window.openCopoMatrixModal = function () {
    const cf = state.courseFileData?.course_file || {};
    const cos = cf.course_outcomes || [
      { code: 'CO1', statement: 'Demonstrate fundamental principles and theoretical concepts.' },
      { code: 'CO2', statement: 'Analyze real-world domain engineering problems and requirements.' },
      { code: 'CO3', statement: 'Design, implement and evaluate software solutions.' },
      { code: 'CO4', statement: 'Apply industry standard tools, techniques and algorithms.' },
      { code: 'CO5', statement: 'Formulate sustainable solutions adhering to professional ethics.' }
    ];

    const coContainer = document.getElementById('co-list-inputs');
    if (coContainer) {
      coContainer.innerHTML = cos.map((c, idx) => `
        <div style="display:flex;gap:0.75rem;align-items:center;margin-bottom:0.6rem;">
          <input type="text" class="form-control" style="width:70px;text-align:center;font-weight:700;" value="${escapeHtml(c.code || 'CO' + (idx + 1))}" id="co-code-${idx}">
          <input type="text" class="form-control" style="flex:1;" value="${escapeHtml(c.statement || '')}" id="co-stmt-${idx}" placeholder="Enter Course Outcome statement...">
        </div>
      `).join('');
    }

    openModal('modal-copo-matrix');
  };

  // Save CO & CO-PO Matrix
  window.saveCopoMatrix = async function (e) {
    e.preventDefault();
    const courseFileId = state.courseFileData?.course_file?.id;
    if (!courseFileId) return;

    const cos = [];
    for (let i = 0; i < 5; i++) {
      const code = document.getElementById(`co-code-${i}`)?.value || `CO${i + 1}`;
      const statement = document.getElementById(`co-stmt-${i}`)?.value || '';
      if (statement.trim()) {
        cos.push({ code, statement });
      }
    }

    try {
      const res = await apiFetch(`/course-files/${courseFileId}/structured-data`, {
        method: 'PUT',
        body: { type: 'course_outcomes', data: cos }
      });
      if (res && res.success) {
        showToast('Course Outcomes saved successfully', 'success');
        closeModal('modal-copo-matrix');
        await loadCourseFileDossier();
      } else {
        showToast(res?.error?.message || 'Failed to save COs', 'error');
      }
    } catch (err) {
      showToast('Error saving Course Outcomes', 'error');
    }
  };

  // Modal 7: Open Learners View Modal (Items #15 & #16)
  window.openLearnersModal = function (type) {
    const isAdv = type === 'advanced_learners';
    const students = isAdv
      ? (state.courseFileData?.system_data?.advanced_learners || [])
      : (state.courseFileData?.system_data?.slow_learners || []);

    const titleEl = document.getElementById('learners-modal-title');
    const tbody = document.getElementById('tbody-learners-roster');
    const uploadBtn = document.getElementById('btn-learners-upload-pdf');

    if (titleEl) {
      titleEl.innerText = isAdv
        ? `Advanced Learners Identification (Attendance ≥ 80%)`
        : `Slow Learners Diagnostic List (Attendance < 75%)`;
    }

    if (uploadBtn) {
      uploadBtn.onclick = () => openDirectUploadModal(type, isAdv ? 'Advanced Learners Plan' : 'Remedial Action Plan');
    }

    if (tbody) {
      if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">No students identified in this category based on current academic attendance metrics.</td></tr>`;
      } else {
        tbody.innerHTML = students.map((s, idx) => `
          <tr>
            <td style="font-weight:700;">${idx + 1}</td>
            <td style="font-family:var(--font-family-mono);">${s.roll_no || '--'}</td>
            <td><strong>${escapeHtml(s.full_name)}</strong></td>
            <td style="text-align:center;"><span class="badge ${isAdv ? 'badge-present' : 'badge-absent'}">${s.attendance_pct}%</span></td>
            <td>${isAdv ? 'Peer tutoring, micro-projects, advanced reading' : 'Remedial tutorials, doubt clearing sessions'}</td>
          </tr>
        `).join('');
      }
    }

    openModal('modal-learners-view');
  };

  // Modal 8: Open HOD Audit Modal
  window.openHodAuditModal = function () {
    const cf = state.courseFileData?.course_file || {};
    const decEl = document.getElementById('audit-decision-status');
    const remEl = document.getElementById('audit-remarks-text');

    if (decEl) decEl.value = cf.status || 'APPROVED';
    if (remEl) remEl.value = cf.hod_remarks || '';

    openModal('modal-hod-audit');
  };

  // Submit HOD Audit Sign-off
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
        showToast(`Dossier signed off as ${status}`, 'success');
        closeModal('modal-hod-audit');
        await loadCourseFileDossier();
      } else {
        showToast(res?.error?.message || 'Audit sign-off failed', 'error');
      }
    } catch (err) {
      showToast('Error during audit sign-off', 'error');
    }
  };

  // Print Complete Dossier Index
  window.printDossierIndex = function () {
    const data = state.courseFileData;
    if (!data) return;

    const g = data.group || {};
    const cf = data.course_file || {};
    const items = data.items || [];

    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Academic Dossier Index — ${g.subject_name || 'VidyaOS'}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2.5rem; color: #111; line-height: 1.4; }
          .inst-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 1rem; margin-bottom: 1.5rem; }
          .inst-header h1 { margin: 0; font-size: 15pt; font-weight: 800; text-transform: uppercase; }
          .inst-header h2 { margin: 4px 0 0; font-size: 11pt; font-weight: 600; color: #333; }
          .dossier-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; background: #f5f5f5; padding: 12px 16px; border: 1px solid #ccc; font-size: 9.5pt; margin-bottom: 1.5rem; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
          th, td { border: 1px solid #222; padding: 6px 10px; font-size: 9pt; }
          th { background: #e0e0e0; font-weight: 700; text-align: left; }
          .status-ok { font-weight: 700; color: #007700; }
          .status-pending { color: #888; font-style: italic; }
          .sig-row { display: flex; justify-content: space-between; margin-top: 3.5rem; padding-top: 1rem; }
          .sig-box { text-align: center; width: 180px; border-top: 1px solid #000; font-size: 9pt; font-weight: 600; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="inst-header">
          <h1>Uttarakhand Government Institute of Polytechnic, Nainital</h1>
          <h2>Department of ${escapeHtml(g.department_name || 'Engineering')} • Institutional Academic Dossier</h2>
          <div style="font-size: 10pt; font-weight: 700; margin-top: 4px;">${escapeHtml(data.dossier_title || 'Academic Dossier')} (Session ${escapeHtml(g.academic_year_label || '2026-27')})</div>
        </div>

        <div class="dossier-meta">
          <div><strong>Subject Name:</strong> ${escapeHtml(g.subject_name || '')} (${escapeHtml(g.subject_code || '')})</div>
          <div><strong>Faculty Member:</strong> ${escapeHtml(g.teacher_name || '')}</div>
          <div><strong>Semester / Branch:</strong> Semester ${g.semester || 1} • ${escapeHtml(g.department_name || '')}</div>
          <div><strong>Component:</strong> ${escapeHtml(g.component || 'Theory')}</div>
          <div><strong>Verification Status:</strong> ${cf.status || 'IN_PROGRESS'}</div>
          <div><strong>Audit Readiness:</strong> ${cf.completed_items || 0} / ${cf.total_items || items.length} Artifacts Verified (${cf.completion_pct || 0}%)</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:40px;text-align:center;">Seq</th>
              <th>Document / Artifact Name</th>
              <th>Category</th>
              <th>Audit Verification Status</th>
              <th>File Name & Size</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => {
      const doc = it.document;
      const isOk = it.is_completed;
      return `
                <tr>
                  <td style="text-align:center;font-weight:700;">${idx + 1}</td>
                  <td><strong>${escapeHtml(it.title)}</strong></td>
                  <td>${escapeHtml(it.module_label || it.category_label || it.category || 'General')}</td>
                  <td class="${isOk ? 'status-ok' : 'status-pending'}">
                    ${isOk ? '✓ Verified / Uploaded' : '○ Pending Verification'}
                  </td>
                  <td style="font-size:8.5pt;">${doc ? `${escapeHtml(doc.file_name)} (${formatBytes(doc.file_size)})` : '—'}</td>
                </tr>
              `;
    }).join('')}
          </tbody>
        </table>

        <div class="sig-row">
          <div class="sig-box">Course Teacher Signature</div>
          <div class="sig-box">Department HOD Review</div>
          <div class="sig-box">Principal / Dean Approval</div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
  };

  // Generic modal openers
  window.openModal = function (modalId) {
    const m = document.getElementById(modalId);
    if (m) {
      m.classList.add('open');
      m.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeModal = function (modalId) {
    const m = document.getElementById(modalId);
    if (m) {
      m.classList.remove('open');
      m.style.display = 'none';
      document.body.style.overflow = '';
    }
  };

})();
