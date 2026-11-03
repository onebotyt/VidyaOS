/**
 * Assessment Process Module — Student Client Logic
 * Location: student/assessment-process/assessment-process.js
 * VidyaOS Institutional Campus Operating System
 *
 * Implements read-only view of 13 Direct & Indirect Assessment artifact cards,
 * course switcher for multi-course enrollment, PDF previews in iframe modal,
 * and direct PDF downloads.
 */

(function () {
  'use strict';

  // Application State
  const state = {
    currentUser: null,
    currentGroupId: null,
    enrolledCourses: [],
    assessmentData: null,
    currentCategory: 'all',
    searchQuery: '',
    selectedDoc: null
  };

  // Helper Functions
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDateTime(dStr) {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (_) {
      return dStr;
    }
  }

  // API Fetch Helper
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
    try {
      const r = await fetch('/api/v1' + endpoint, { ...opts, headers });
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

      // Student Avatar Initial
      const avatarEl = document.getElementById('gc-user-avatar');
      if (avatarEl) {
        const initial = (user.full_name || user.name || 'S').charAt(0).toUpperCase();
        avatarEl.innerText = initial;
      }

      // Check URL parameters for group ID
      const params = new URLSearchParams(window.location.search);
      const urlGroupId = params.get('groupId') || params.get('group_id') || params.get('id');

      if (urlGroupId) {
        state.currentGroupId = parseInt(urlGroupId, 10);
      }

      // Load Enrolled Courses
      await loadEnrolledCourses();

      // Load Dossier
      if (state.currentGroupId) {
        await loadAssessmentDossier(state.currentGroupId);
      }
    } catch (err) {
      console.error('Initialization error in student assessment-process:', err);
    }
  });

  // Fetch Enrolled Courses
  async function loadEnrolledCourses() {
    try {
      let res = await apiFetch('/student/courses');
      if (!res || !res.success || !res.data || res.data.length === 0) {
        res = await apiFetch('/teaching-groups/my-classes');
      }

      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        state.enrolledCourses = res.data;

        // If no group id specified in URL, default to first enrolled course
        if (!state.currentGroupId) {
          state.currentGroupId = state.enrolledCourses[0].id || state.enrolledCourses[0].group_id;
        }

        renderCourseSelector();
      }
    } catch (err) {
      console.warn('Could not load student courses list:', err);
    }
  }

  // Render Enrolled Courses Selector Dropdown
  function renderCourseSelector() {
    const switcherRow = document.getElementById('assess-switcher-row');
    const selector = document.getElementById('course-selector');
    if (!switcherRow || !selector) return;

    if (state.enrolledCourses.length <= 1) {
      switcherRow.style.display = 'none';
      return;
    }

    switcherRow.style.display = 'flex';
    selector.innerHTML = state.enrolledCourses.map(course => {
      const cid = course.id || course.group_id;
      const cname = course.subject_name || course.name || `Class #${cid}`;
      const ccode = course.subject_code ? ` (${course.subject_code})` : '';
      const isSelected = cid === state.currentGroupId ? 'selected' : '';
      return `<option value="${cid}" ${isSelected}>${escapeHtml(cname + ccode)}</option>`;
    }).join('');
  }

  // Switch Course Handler
  window.onCourseSwitch = async function (newGroupId) {
    if (!newGroupId) return;
    state.currentGroupId = parseInt(newGroupId, 10);
    const newUrl = `${window.location.pathname}?groupId=${state.currentGroupId}`;
    window.history.replaceState(null, '', newUrl);
    await loadAssessmentDossier(state.currentGroupId);
  };

  // Load Dossier for Student
  async function loadAssessmentDossier(groupId) {
    try {
      const res = await apiFetch(`/assessment-process?group_id=${groupId}`);

      if (!res || !res.success || !res.data) {
        renderEmptyState('Failed to load Assessment Process dossier for this subject.');
        return;
      }

      state.assessmentData = res.data;
      renderHeroBanner();
      renderCardsGrid();
      updateCategoryCounts();
    } catch (err) {
      console.error('loadAssessmentDossier error:', err);
      renderEmptyState('An unexpected error occurred while loading assessment documents.');
    }
  }

  // Render Hero Header & Readiness Meter
  function renderHeroBanner() {
    const data = state.assessmentData;
    if (!data) return;

    const group = data.group || {};
    const assessFile = data.assessment_file || {};

    const heroTitle = document.getElementById('assess-hero-title');
    const heroCode = document.getElementById('assess-hero-code');
    const heroDept = document.getElementById('assess-hero-dept');
    const heroTeacher = document.getElementById('assess-hero-teacher');
    const heroSem = document.getElementById('assess-hero-sem');
    const heroBranch = document.getElementById('assess-hero-branch');
    const heroAy = document.getElementById('assess-hero-ay');
    const statusBadge = document.getElementById('assess-hero-status-badge');

    if (heroTitle) heroTitle.innerText = group.subject_name || group.name || 'Assessment Process';
    if (heroCode) heroCode.innerText = group.subject_code || group.code || 'SUB-101';
    if (heroDept) heroDept.innerText = group.department_name || group.department_code || 'Academic Department';
    if (heroTeacher) heroTeacher.innerText = group.teacher_name || 'Course Instructor';
    if (heroSem) heroSem.innerText = `Semester ${group.semester || 1}`;
    if (heroBranch) heroBranch.innerText = group.branch || group.department_name || 'Engineering';
    if (heroAy) heroAy.innerText = group.academic_year || 'AY 2026-27';

    // Status Badge
    if (statusBadge) {
      const status = assessFile.status || 'IN_PROGRESS';
      statusBadge.innerText = status.replace(/_/g, ' ');
      statusBadge.className = `badge badge-status-${status.toLowerCase()}`;
    }

    // Readiness Meter
    const readiness = assessFile.readiness || {
      completed: 0,
      total: 13,
      pct: 0,
      direct_completed: 0,
      direct_total: 8,
      indirect_completed: 0,
      indirect_total: 5
    };

    const meterScore = document.getElementById('assess-meter-score');
    const meterPct = document.getElementById('assess-meter-pct');
    const meterBar = document.getElementById('assess-meter-bar');
    const meterCaption = document.getElementById('assess-meter-caption');

    if (meterScore) meterScore.innerText = `${readiness.completed} / ${readiness.total}`;
    if (meterPct) meterPct.innerText = `${readiness.pct}%`;
    if (meterBar) meterBar.style.width = `${readiness.pct}%`;
    if (meterCaption) {
      meterCaption.innerText = `Direct: ${readiness.direct_completed || 0}/8 • Indirect: ${readiness.indirect_completed || 0}/5 uploaded`;
    }
  }

  // Update Category Counts on Tab Pills
  function updateCategoryCounts() {
    const data = state.assessmentData;
    if (!data || !data.items) return;

    const items = data.items;
    const countAll = items.length;
    const countDirect = items.filter(i => i.category === 'direct_assessment').length;
    const countIndirect = items.filter(i => i.category === 'indirect_assessment').length;

    const countAllEl = document.getElementById('count-cat-all');
    const countDirectEl = document.getElementById('count-cat-direct');
    const countIndirectEl = document.getElementById('count-cat-indirect');

    if (countAllEl) countAllEl.innerText = countAll;
    if (countDirectEl) countDirectEl.innerText = countDirect;
    if (countIndirectEl) countIndirectEl.innerText = countIndirect;
  }

  // Render 13 Artifact Cards
  function renderCardsGrid() {
    const data = state.assessmentData;
    const grid = document.getElementById('assess-cards-grid');
    if (!grid) return;

    if (!data || !data.items || data.items.length === 0) {
      renderEmptyState('No assessment documents configured for this subject.');
      return;
    }

    let filtered = data.items;
    if (state.currentCategory && state.currentCategory !== 'all') {
      filtered = filtered.filter(item => item.category === state.currentCategory);
    }
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.desc && item.desc.toLowerCase().includes(q)) ||
        (item.document?.file_name && item.document.file_name.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1 / -1;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3>No Matching Assessment Items</h3>
          <p>No documents found matching "${escapeHtml(state.searchQuery)}".</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(item => {
      const doc = item.document;
      const isUploaded = Boolean(doc && doc.file_path);
      const isDirect = item.category === 'direct_assessment';

      return `
        <article class="cf-doc-card ${isUploaded ? 'uploaded' : 'pending'}">
          <div class="cf-doc-card-header">
            <div class="cf-doc-number-badge">
              <span>#${item.num}</span>
              <span class="cf-section-tag">${escapeHtml(item.section_code || (isDirect ? 'DIRECT' : 'INDIRECT'))}</span>
            </div>
            <div class="cf-doc-status-badge ${isUploaded ? 'status-uploaded' : 'status-pending'}">
              ${isUploaded ? `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Available
              ` : `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Pending
              `}
            </div>
          </div>

          <div class="cf-doc-card-body">
            <div class="cf-doc-type-icon ${isDirect ? 'icon-direct' : 'icon-indirect'}">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="m9 15 2 2 4-4"></path>
              </svg>
            </div>
            <h3 class="cf-doc-title">${escapeHtml(item.title)}</h3>
            <p class="cf-doc-desc">${escapeHtml(item.desc || '')}</p>

            ${isUploaded ? `
              <div class="cf-doc-file-info">
                <div class="cf-doc-filename" title="${escapeHtml(doc.file_name)}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <span>${escapeHtml(doc.file_name)}</span>
                </div>
                <div class="cf-doc-meta">
                  <span>${formatBytes(doc.file_size)}</span>
                  <span>&bull;</span>
                  <span>${formatDateTime(doc.updated_at || doc.created_at)}</span>
                </div>
                ${doc.notes ? `
                  <div class="cf-doc-notes" title="${escapeHtml(doc.notes)}">
                    <em>"${escapeHtml(doc.notes)}"</em>
                  </div>
                ` : ''}
              </div>
            ` : `
              <div class="cf-doc-empty-placeholder">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Awaiting instructor upload (.pdf)</span>
              </div>
            `}
          </div>

          <div class="cf-doc-card-footer">
            ${isUploaded ? `
              <button type="button" class="cf-card-btn cf-card-btn-primary" onclick="openPreviewModal('${escapeHtml(doc.file_path)}', '${escapeHtml(item.title)}', '${escapeHtml(doc.file_name)}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                View PDF
              </button>
              <a href="${escapeHtml(doc.file_path)}" download="${escapeHtml(doc.file_name)}" class="cf-card-btn" title="Download this PDF">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download
              </a>
            ` : `
              <span style="font-size:0.75rem;color:var(--text-muted);">Not yet published</span>
            `}
          </div>
        </article>
      `;
    }).join('');
  }

  function renderEmptyState(message) {
    const grid = document.getElementById('assess-cards-grid');
    if (!grid) return;
    grid.innerHTML = `
      <div class="empty-state-card" style="grid-column: 1 / -1;">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <h3>No Assessment Records</h3>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  // Filter Categories
  window.setCategoryFilter = function (category, btnElement) {
    state.currentCategory = category;
    const allButtons = document.querySelectorAll('.cf-tab-pill');
    allButtons.forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    renderCardsGrid();
  };

  // Search input handler
  window.onSearchDocuments = function (query) {
    state.searchQuery = query || '';
    renderCardsGrid();
  };

  // Preview Modal Open
  window.openPreviewModal = function (filePath, title, fileName) {
    const modalTitle = document.getElementById('modal-preview-title');
    const modalSubtitle = document.getElementById('modal-preview-subtitle');
    const previewFrame = document.getElementById('pdf-preview-frame');
    const downloadBtn = document.getElementById('btn-preview-download');

    if (modalTitle) modalTitle.innerText = title || 'Document Preview';
    if (modalSubtitle) modalSubtitle.innerText = fileName || 'PDF Preview';
    if (downloadBtn) {
      downloadBtn.href = filePath;
      downloadBtn.setAttribute('download', fileName || 'document.pdf');
    }
    if (previewFrame) previewFrame.src = filePath;

    const overlay = document.getElementById('preview-modal-overlay');
    if (overlay) overlay.style.display = 'flex';
  };

  // Preview Modal Close
  window.closePreviewModal = function () {
    const overlay = document.getElementById('preview-modal-overlay');
    const previewFrame = document.getElementById('pdf-preview-frame');
    if (overlay) overlay.style.display = 'none';
    if (previewFrame) previewFrame.src = '';
  };

  // Close modals on overlay backdrop click
  window.closeModalOnOverlay = function (e, overlayId) {
    if (e.target.id === overlayId) {
      window.closePreviewModal();
    }
  };

  // Theme Toggle
  window.toggleTheme = function () {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

})();
