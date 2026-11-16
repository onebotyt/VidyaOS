/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS STUDENT DOSSIER ENGINE COMPONENT (dossier.js)
 * Location: /student/components/dossier/dossier.js
 *
 * Reusable, strictly isolated Student component that powers:
 * - Direct Assessment (/student/direct-assessment)
 * - Indirect Assessment (/student/indirect-assessment)
 * - Assessment Process (/student/assessment-process)
 * - Student Performance Monitoring (/student/student-performance)
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

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
      return new Date(dStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) {
      return dStr;
    }
  }

  async function apiFetch(endpoint, opts = {}) {
    if (typeof window.fetchApi === 'function') {
      try {
        return await window.fetchApi(endpoint, opts);
      } catch (err) {
        return { success: false, error: err };
      }
    }
    return { success: false, error: { message: 'API client unavailable' } };
  }

  function mountStudentDossier(cfg) {
    const prefix = cfg.prefix;           // 'direct', 'indirect', 'assess', 'perf'
    const apiBase = cfg.apiBase;         // '/direct-assessment'
    const label = cfg.label;             // 'Direct Assessment'
    const sectionTag = cfg.sectionTag;   // 'DIRECT'
    const totalDefault = cfg.totalDefault || 8;
    const fileKey = cfg.fileKey || 'assessment_file';

    const state = {
      currentUser: null,
      currentGroupId: null,
      enrolledCourses: [],
      dossierData: null,
      currentCategory: 'all',
      searchQuery: ''
    };

    document.addEventListener('DOMContentLoaded', async () => {
      try {
        const user = typeof window.guardRoute === 'function' ? await window.guardRoute(['STUDENT']) : null;
        if (!user) return;
        state.currentUser = user;

        const avatarEl = document.getElementById('gc-user-avatar');
        if (avatarEl) {
          avatarEl.innerText = (user.full_name || user.name || 'S').charAt(0).toUpperCase();
        }

        const params = new URLSearchParams(window.location.search);
        const urlGroupId = params.get('groupId') || params.get('group_id') || params.get('id');
        if (urlGroupId) state.currentGroupId = parseInt(urlGroupId, 10);

        await loadEnrolledCourses();
        if (state.currentGroupId) {
          await loadDossier(state.currentGroupId);
        }
      } catch (err) {
        console.error(`Initialization error in student ${prefix}:`, err);
      }
    });

    async function loadEnrolledCourses() {
      try {
        const res = await apiFetch('/teaching-groups/student/my-groups');
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          state.enrolledCourses = res.data;
          if (!state.currentGroupId) {
            state.currentGroupId = state.enrolledCourses[0].id || state.enrolledCourses[0].group_id;
          }
          renderCourseSelector();
        }
      } catch (err) {
        console.warn('Could not load student courses list:', err);
      }
    }

    function renderCourseSelector() {
      const switcherRow = document.getElementById(`${prefix}-switcher-row`);
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

    window.onCourseSwitch = async function (newGroupId) {
      if (!newGroupId) return;
      state.currentGroupId = parseInt(newGroupId, 10);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('groupId', newGroupId);
      window.history.replaceState({}, '', newUrl.toString());
      await loadDossier(state.currentGroupId);
    };

    async function loadDossier(groupId) {
      try {
        const res = await apiFetch(`${apiBase}?group_id=${groupId}`);
        if (!res || !res.success || !res.data) return;
        state.dossierData = res.data;
        renderHeroBanner();
        renderCardsGrid();
        updateCategoryCounts();
      } catch (err) {
        console.error(`loadDossier (${prefix}) error:`, err);
      }
    }

    function renderHeroBanner() {
      const data = state.dossierData;
      if (!data) return;
      const group = data.group || {};
      const fObj = data[fileKey] || data.assessment_file || data.performance_file || {};
      const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };

      setTxt(`${prefix}-hero-title`, group.subject_name || group.name || label);
      setTxt(`${prefix}-hero-code`, group.subject_code || group.code || `CLS-${group.id || 101}`);
      setTxt(`${prefix}-hero-dept`, group.department_name || group.department_code || 'Academic Department');
      setTxt(`${prefix}-hero-teacher`, group.teacher_name || 'Course Instructor');
      setTxt(`${prefix}-hero-sem`, `Semester ${group.semester || 1}`);
      setTxt(`${prefix}-hero-branch`, group.branch || group.department_code || group.department_name || 'Engineering');
      setTxt(`${prefix}-hero-ay`, group.academic_year || group.academic_year_label || 'AY 2026-27');

      const statusBadge = document.getElementById(`${prefix}-hero-status-badge`);
      const status = (fObj.status || 'IN_PROGRESS').toUpperCase();
      if (statusBadge) {
        statusBadge.innerText = status.replace(/_/g, ' ');
        statusBadge.className = `badge badge-status-${status.toLowerCase()}`;
      }

      const completed = fObj.readiness ? fObj.readiness.completed : (fObj.completed_items || 0);
      const total = fObj.readiness ? (fObj.readiness.total || totalDefault) : (fObj.total_items || totalDefault);
      const pct = fObj.readiness?.pct ?? Math.round((completed / Math.max(total, 1)) * 100);

      setTxt(`${prefix}-meter-score`, `${completed} / ${total}`);
      setTxt(`${prefix}-meter-pct`, `${pct}%`);
      const meterBar = document.getElementById(`${prefix}-meter-bar`);
      if (meterBar) {
        meterBar.style.width = `${pct}%`;
        meterBar.classList.toggle('is-complete', pct === 100);
      }
      setTxt(`${prefix}-meter-caption`, `${label}: ${completed} of ${total} documents available`);
    }

    function updateCategoryCounts() {
      const items = state.dossierData?.items || [];
      const setCnt = (id, n) => { const el = document.getElementById(id); if (el) el.innerText = n; };
      setCnt('count-cat-all', items.length);
      if (cfg.categoryMap) {
        Object.entries(cfg.categoryMap).forEach(([catKey, domId]) => {
          setCnt(domId, items.filter(i => i.category === catKey).length);
        });
      }
    }

    function renderCardsGrid() {
      const grid = document.getElementById(`${prefix}-cards-grid`);
      if (!grid) return;
      let items = state.dossierData?.items || [];
      if (state.currentCategory !== 'all') {
        items = items.filter(i => i.category === state.currentCategory);
      }
      if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase();
        items = items.filter(i =>
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.desc && i.desc.toLowerCase().includes(q)) ||
          (i.document?.file_name && i.document.file_name.toLowerCase().includes(q))
        );
      }
      if (items.length === 0) {
        grid.innerHTML = `<div class="empty-state-card" style="grid-column: 1 / -1;"><h3>No Matching ${escapeHtml(label)} Records</h3></div>`;
        return;
      }

      grid.innerHTML = items.map(item => {
        const doc = item.document;
        const isUploaded = Boolean(doc && doc.file_path);
        const tag = escapeHtml(item.section || (item.category ? item.category.toUpperCase() : sectionTag));
        return `
          <article class="cf-doc-card ${isUploaded ? 'uploaded' : 'pending'}">
            <div class="cf-doc-card-header">
              <div class="cf-doc-number-badge">
                <span>#${item.num}</span>
                <span class="cf-section-tag">${tag}</span>
              </div>
              <div class="cf-doc-status-badge ${isUploaded ? 'status-uploaded' : 'status-pending'}">
                ${isUploaded ? 'Available' : 'Pending'}
              </div>
            </div>
            <div class="cf-doc-card-body">
              <h3 class="cf-doc-title">${escapeHtml(item.title)}</h3>
              <p class="cf-doc-desc">${escapeHtml(item.desc || '')}</p>
              ${isUploaded ? `
                <div class="cf-doc-file-info">
                  <div class="cf-doc-filename" title="${escapeHtml(doc.file_name)}"><span>${escapeHtml(doc.file_name)}</span></div>
                  <div class="cf-doc-meta"><span>${formatBytes(doc.file_size)}</span> &bull; <span>${formatDateTime(doc.updated_at || doc.created_at)}</span></div>
                </div>
              ` : `<div class="cf-doc-empty-placeholder"><span>Awaiting instructor upload (.pdf)</span></div>`}
            </div>
            <div class="cf-doc-card-footer">
              ${isUploaded ? `
                <button type="button" class="cf-card-btn cf-card-btn-primary" onclick="openPreviewModal('${escapeHtml(doc.file_path)}', '${escapeHtml(item.title).replace(/'/g, "\\'")}', '${escapeHtml(doc.file_name).replace(/'/g, "\\'")}')">View PDF</button>
                <a href="${escapeHtml(doc.file_path)}" download="${escapeHtml(doc.file_name)}" class="cf-card-btn">Download</a>
              ` : `<span style="font-size:0.75rem;color:var(--text-muted);">Not yet published</span>`}
            </div>
          </article>
        `;
      }).join('');
    }

    window.setCategoryFilter = function (category, btnEl) {
      state.currentCategory = category || 'all';
      document.querySelectorAll('.cf-tab-pill, .cf-tab-btn').forEach(b => b.classList.remove('active'));
      if (btnEl) btnEl.classList.add('active');
      renderCardsGrid();
    };

    window.onSearchDocuments = function (q) {
      state.searchQuery = q || '';
      renderCardsGrid();
    };

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

    window.closePreviewModal = function () {
      const overlay = document.getElementById('preview-modal-overlay');
      const previewFrame = document.getElementById('pdf-preview-frame');
      if (overlay) overlay.style.display = 'none';
      if (previewFrame) previewFrame.src = '';
    };

    window.closeModalOnOverlay = function (e, overlayId) {
      if (e.target.id === overlayId) window.closePreviewModal();
    };
  }

  window.StudentDossier = { mount: mountStudentDossier };
})();
