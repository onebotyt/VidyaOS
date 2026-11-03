/**
 * Student Performance Monitoring — Student Client Logic
 * Location: student/student-performance/student-performance.js
 * VidyaOS Institutional Campus Operating System
 */

(function () {
  'use strict';

  // Application State
  const state = {
    currentUser: null,
    currentGroupId: null,
    enrolledCourses: [],
    performanceData: null,
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
      const user = await window.guardRoute({ allowStudent: true });
      if (!user) return;
      state.currentUser = user;

      // Update avatar
      const userAvatar = document.getElementById('gc-user-avatar');
      if (userAvatar) {
        userAvatar.innerText = (user.full_name || 'ST').charAt(0).toUpperCase();
      }

      // Parse Query Params
      const params = new URLSearchParams(window.location.search);
      const urlGroupId = params.get('groupId') || params.get('group_id') || params.get('id');
      if (urlGroupId) state.currentGroupId = parseInt(urlGroupId, 10);

      await loadStudentCoursesAndDossier();
    } catch (err) {
      console.error('Student performance init error:', err);
    }
  });

  // Load Enrolled Courses & Dossier
  async function loadStudentCoursesAndDossier() {
    try {
      const classesRes = await apiFetch('/student/classes');
      if (classesRes && classesRes.success && Array.isArray(classesRes.data)) {
        state.enrolledCourses = classesRes.data;
      }

      // Populate Course Switcher
      const switcherRow = document.getElementById('perf-switcher-row');
      const selector = document.getElementById('course-selector');
      if (state.enrolledCourses.length > 1 && selector && switcherRow) {
        switcherRow.style.display = 'flex';
        selector.innerHTML = state.enrolledCourses.map(c => `
          <option value="${c.id}" ${c.id === state.currentGroupId ? 'selected' : ''}>
            ${escapeHtml(c.name || c.subject_name || 'Subject')} (${escapeHtml(c.subject_code || c.code || 'CLS')})
          </option>
        `).join('');
      }

      if (!state.currentGroupId && state.enrolledCourses.length > 0) {
        state.currentGroupId = state.enrolledCourses[0].id;
        if (selector) selector.value = state.currentGroupId;
      }

      if (state.currentGroupId) {
        await fetchPerformanceDossier(state.currentGroupId);
      }
    } catch (err) {
      console.error('loadStudentCoursesAndDossier error:', err);
    }
  }

  window.onCourseSwitch = async function (newGroupId) {
    state.currentGroupId = parseInt(newGroupId, 10);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('groupId', newGroupId);
    window.history.replaceState({}, '', newUrl.toString());
    await fetchPerformanceDossier(state.currentGroupId);
  };

  // Fetch Performance Dossier
  async function fetchPerformanceDossier(groupId) {
    try {
      const res = await apiFetch(`/student-performance?group_id=${groupId}`);
      if (!res || !res.success || !res.data) {
        return;
      }

      state.performanceData = res.data;
      renderHeroBanner();
      renderCardsGrid();
      updateCategoryCounts();
    } catch (err) {
      console.error('fetchPerformanceDossier error:', err);
    }
  }

  // Render Hero Banner
  function renderHeroBanner() {
    const data = state.performanceData;
    if (!data) return;

    const group = data.group || {};
    const perfFile = data.performance_file || {};

    const heroTitle = document.getElementById('perf-hero-title');
    const heroCode = document.getElementById('perf-hero-code');
    const heroDept = document.getElementById('perf-hero-dept');
    const heroTeacher = document.getElementById('perf-hero-teacher');
    const heroSem = document.getElementById('perf-hero-sem');
    const heroBranch = document.getElementById('perf-hero-branch');
    const heroAy = document.getElementById('perf-hero-ay');
    const heroStatusBadge = document.getElementById('perf-hero-status-badge');

    if (heroTitle) heroTitle.innerText = group.subject_name || group.name || 'Subject Class';
    if (heroCode) heroCode.innerText = group.subject_code || `CLS-${group.id}`;
    if (heroDept) heroDept.innerText = group.department_name || 'Department';
    if (heroTeacher) heroTeacher.innerText = group.teacher_name || 'Course Instructor';
    if (heroSem) heroSem.innerText = `Semester ${group.semester || 1}`;
    if (heroBranch) heroBranch.innerText = group.department_code || 'Branch';
    if (heroAy) heroAy.innerText = group.academic_year_label || 'AY 2026-27';

    const auditStatus = (perfFile.status || 'IN_PROGRESS').toUpperCase();
    if (heroStatusBadge) {
      heroStatusBadge.innerText = auditStatus.replace('_', ' ');
      heroStatusBadge.className = 'badge ' + (
        auditStatus === 'APPROVED' ? 'badge-status-approved' : 'badge-status-progress'
      );
    }

    const completedCount = perfFile.completed_items || 0;
    const totalItems = perfFile.total_items || 8;
    const pct = Math.round((completedCount / totalItems) * 100);

    const meterScore = document.getElementById('perf-meter-score');
    const meterPct = document.getElementById('perf-meter-pct');
    const meterBar = document.getElementById('perf-meter-bar');
    const meterCaption = document.getElementById('perf-meter-caption');

    if (meterScore) meterScore.innerText = `${completedCount} / ${totalItems}`;
    if (meterPct) meterPct.innerText = `${pct}%`;
    if (meterBar) {
      meterBar.style.width = `${pct}%`;
      if (pct === 100) meterBar.classList.add('is-complete');
      else meterBar.classList.remove('is-complete');
    }
    if (meterCaption) {
      meterCaption.innerText = pct === 100 ? 'All 8 Documents Complete & Verified' : `${completedCount} of ${totalItems} documents available`;
    }
  }

  // Update Category Counts
  function updateCategoryCounts() {
    const data = state.performanceData;
    if (!data || !data.items) return;

    const items = data.items;
    const catCounts = {
      all: items.length,
      advanced_learners: 0,
      slow_learners: 0,
      remedial_measures: 0,
      evidence: 0
    };

    items.forEach(item => {
      if (catCounts[item.category] !== undefined) {
        catCounts[item.category]++;
      }
    });

    const elAll = document.getElementById('count-cat-all');
    const elAdv = document.getElementById('count-cat-advanced');
    const elSlow = document.getElementById('count-cat-slow');
    const elRem = document.getElementById('count-cat-remedial');
    const elEv = document.getElementById('count-cat-evidence');

    if (elAll) elAll.innerText = catCounts.all;
    if (elAdv) elAdv.innerText = catCounts.advanced_learners;
    if (elSlow) elSlow.innerText = catCounts.slow_learners;
    if (elRem) elRem.innerText = catCounts.remedial_measures;
    if (elEv) elEv.innerText = catCounts.evidence;
  }

  // Render Cards Grid (Read-Only)
  function renderCardsGrid() {
    const container = document.getElementById('perf-cards-grid');
    if (!container) return;

    const data = state.performanceData;
    if (!data || !data.items) {
      container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);">No documents available.</div>';
      return;
    }

    let items = data.items;

    if (state.currentCategory !== 'all') {
      items = items.filter(i => i.category === state.currentCategory);
    }

    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      items = items.filter(i => 
        i.title.toLowerCase().includes(q) ||
        i.desc.toLowerCase().includes(q) ||
        (i.document && i.document.file_name.toLowerCase().includes(q))
      );
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:3rem 1.5rem;text-align:center;color:var(--text-muted);">
          <div style="font-weight:700;color:var(--text-main);">No matching documents found</div>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => {
      const isComplete = item.is_completed;
      const doc = item.document;

      let fileInfoHtml = '';
      let actionsHtml = '';

      if (isComplete && doc) {
        fileInfoHtml = `
          <div class="cf-card-status-box">
            <div class="cf-doc-info-left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary);flex-shrink:0;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span class="cf-doc-filename" title="${escapeHtml(doc.file_name)}">${escapeHtml(doc.file_name)}</span>
              <span class="cf-doc-meta">&bull; ${formatBytes(doc.file_size)}</span>
              <span class="cf-doc-meta">&bull; ${formatDateTime(doc.updated_at || doc.created_at)}</span>
            </div>
          </div>
        `;

        actionsHtml = `
          <div class="cf-card-actions">
            <button type="button" class="cf-card-btn" onclick="openPreviewModal('${escapeHtml(doc.file_path)}', '${escapeHtml(item.title).replace(/'/g, "\\'")}', '${escapeHtml(doc.file_name).replace(/'/g, "\\'")}')" title="Preview PDF Document">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span>View PDF</span>
            </button>
            <a href="${escapeHtml(doc.file_path)}" download="${escapeHtml(doc.file_name)}" class="cf-card-btn primary" title="Download PDF File">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Download</span>
            </a>
          </div>
        `;
      } else {
        actionsHtml = `
          <div class="cf-card-actions">
            <span style="font-size:0.75rem;font-weight:600;color:var(--text-muted);padding:0.4rem 0.6rem;background:var(--bg-surface);border-radius:var(--radius-sm);border:1px solid var(--border-color);">
              Pending Faculty Upload
            </span>
          </div>
        `;
      }

      return `
        <article class="cf-artifact-card ${isComplete ? 'is-complete' : ''}" id="card-item-${item.key}">
          <div class="cf-card-main-content">
            <div class="cf-card-num">#${item.num}</div>
            <div class="cf-card-header-info">
              <div class="cf-card-title-row">
                <h3 class="cf-card-title">${escapeHtml(item.title)}</h3>
                <span class="cf-section-pill">${escapeHtml(item.section || '')}</span>
                <span class="cf-status-tag ${isComplete ? 'uploaded' : 'pending'}">
                  ${isComplete ? '&#10003; Uploaded' : 'Pending'}
                </span>
              </div>
              <p class="cf-card-desc">${escapeHtml(item.desc)}</p>
              ${fileInfoHtml}
            </div>
          </div>
          ${actionsHtml}
        </article>
      `;
    }).join('');
  }

  // Filter & Search Handlers
  window.setCategoryFilter = function (category, btnElement) {
    state.currentCategory = category;
    document.querySelectorAll('.cf-tab-pill').forEach(pill => {
      pill.classList.remove('active');
      pill.setAttribute('aria-selected', 'false');
    });
    if (btnElement) {
      btnElement.classList.add('active');
      btnElement.setAttribute('aria-selected', 'true');
    }
    renderCardsGrid();
  };

  window.onSearchDocuments = function (query) {
    state.searchQuery = query || '';
    renderCardsGrid();
  };

  // Preview Modal
  window.openPreviewModal = function (filePath, title, fileName) {
    const modalTitle = document.getElementById('modal-preview-title');
    const modalSubtitle = document.getElementById('modal-preview-subtitle');
    const iframe = document.getElementById('pdf-preview-frame');
    const downloadBtn = document.getElementById('btn-preview-download');

    if (modalTitle) modalTitle.innerText = title;
    if (modalSubtitle) modalSubtitle.innerText = fileName;
    if (iframe) iframe.src = filePath;
    if (downloadBtn) {
      downloadBtn.href = filePath;
      downloadBtn.setAttribute('download', fileName);
    }

    const overlay = document.getElementById('preview-modal-overlay');
    if (overlay) overlay.style.display = 'flex';
  };

  window.closePreviewModal = function () {
    const overlay = document.getElementById('preview-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    const iframe = document.getElementById('pdf-preview-frame');
    if (iframe) iframe.src = '';
  };

  window.closeModalOnOverlay = function (e, overlayId) {
    if (e.target.id === overlayId) {
      if (overlayId === 'preview-modal-overlay') closePreviewModal();
    }
  };

  window.toggleTheme = function () {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

})();

