/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY DOSSIER ENGINE COMPONENT (dossier.js)
 * Location: /faculty/components/dossier/dossier.js
 *
 * Reusable, strictly isolated Faculty component that powers:
 * - Direct Assessment (/faculty/direct-assessment)
 * - Indirect Assessment (/faculty/indirect-assessment)
 * - Assessment Process (/faculty/assessment-process)
 * - Student Performance Monitoring (/faculty/student-performance)
 * - Theory Classes Dossier (/faculty/theory-classes)
 * - Laboratory Classes Dossier (/faculty/lab-classes)
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

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
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) {
      return dStr;
    }
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

  function notify(msg, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
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

  function mountAssessmentDossier(cfg) {
    const prefix = cfg.prefix;           // e.g. 'direct', 'indirect', 'assess', 'perf'
    const apiBase = cfg.apiBase;         // e.g. '/direct-assessment'
    const label = cfg.label;             // e.g. 'Direct Assessment'
    const sectionTag = cfg.sectionTag;   // e.g. 'DIRECT'
    const totalDefault = cfg.totalDefault || 8;
    const fileKey = cfg.fileKey || 'assessment_file';
    const printFnName = cfg.printFnName;

    const state = {
      currentUser: null,
      isHodOrAdmin: false,
      currentGroupId: null,
      currentSubjectId: null,
      currentRegisterId: null,
      allClasses: [],
      dossierData: null,
      currentCategory: 'all',
      searchQuery: '',
      selectedUploadFile: null,
      activeItemKeyForUpload: null,
      activeItemTitleForUpload: '',
      isReplacingDoc: false,
      activeItemKeyForDelete: null
    };

    document.addEventListener('DOMContentLoaded', async () => {
      try {
        const user = typeof window.guardRoute === 'function' ? await window.guardRoute() : null;
        if (!user) return;
        state.currentUser = user;
        state.isHodOrAdmin = Boolean(
          user.roles?.includes('HOD') ||
          user.roles?.includes('DEPT_HEAD') ||
          user.roles?.includes('SYSTEM_ADMIN') ||
          user.is_hod
        );

        // Parse Query Params - Support all common aliases
        const params = new URLSearchParams(window.location.search);
        const urlGroupId = params.get('group_id') || params.get('groupId') || params.get('class_id') || params.get('classId') || params.get('id');
        const urlSubjectId = params.get('subject_id') || params.get('subjectId');
        const urlRegisterId = params.get('register_id') || params.get('registerId');

        if (urlGroupId) state.currentGroupId = parseInt(urlGroupId, 10);
        if (urlSubjectId) state.currentSubjectId = parseInt(urlSubjectId, 10);
        if (urlRegisterId) state.currentRegisterId = parseInt(urlRegisterId, 10);

        setupDropzone();

        // Load available classes for switcher & fallback
        await loadAvailableClasses();

        // If no group specified in URL, fallback to first active class
        if (!state.currentGroupId && !state.currentSubjectId && state.allClasses?.length > 0) {
          const g = cfg.preferPractical
            ? (state.allClasses.find(x => (x.component || '').toUpperCase() === 'PRACTICAL') || state.allClasses[0])
            : state.allClasses[0];
          state.currentGroupId = g.id;
          state.currentRegisterId = g.register_id || null;
          renderClassSelector();
        }

        await loadDossier();
      } catch (err) {
        console.error(`Initialization error in ${prefix}:`, err);
      }
    });

    async function loadAvailableClasses() {
      try {
        const groupsRes = await apiFetch('/teaching-groups?status=ACTIVE');
        if (groupsRes && groupsRes.success && Array.isArray(groupsRes.data)) {
          state.allClasses = groupsRes.data;
          renderClassSelector();
        }
      } catch (err) {
        console.warn('Could not load teaching groups for class selector:', err);
      }
    }

    function renderClassSelector() {
      const select = document.getElementById('select-class-switch');
      if (!select) return;
      if (!state.allClasses || state.allClasses.length === 0) {
        select.innerHTML = '<option value="">No Active Classes</option>';
        return;
      }
      select.innerHTML = state.allClasses.map(g => `
        <option value="${g.id}" ${g.id === state.currentGroupId ? 'selected' : ''}>
          ${escapeHtml(g.subject_name || g.name || 'Class ' + g.id)} (${escapeHtml(g.component || 'Theory')})
        </option>
      `).join('');
    }

    window.onSwitchClass = async function (groupId) {
      if (!groupId) return;
      state.currentGroupId = parseInt(groupId, 10);
      const url = new URL(window.location.href);
      url.searchParams.set('groupId', groupId);
      window.history.replaceState({}, '', url.toString());

      const selector = document.getElementById('select-class-switch');
      if (selector && selector.value !== String(groupId)) {
        selector.value = String(groupId);
      }

      await loadDossier();
    };

    function renderEmptyState(customMsg) {
      const grid = document.getElementById(`${prefix}-cards-grid`);
      if (grid) {
        grid.innerHTML = `
          <div class="empty-state-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);">
            <div style="font-size: 2.2rem; margin-bottom: 0.75rem; opacity: 0.85;">📂</div>
            <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text-main);">${escapeHtml(customMsg || 'No Active Teaching Classes Found')}</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 440px; margin: 0 auto 1.25rem; line-height: 1.4;">
              Please select an active teaching group from the dropdown or visit Classroom to manage your assigned subjects.
            </p>
            <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
              <a href="/faculty/classes/index.html" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1.2rem; font-size: 0.82rem; font-weight: 600; text-decoration: none; border-radius: var(--radius-sm);">
                <span>Go to Classroom</span>
              </a>
            </div>
          </div>
        `;
      }
    }

    async function loadDossier() {
      if (!state.currentGroupId && !state.currentSubjectId) {
        renderEmptyState('No Active Classes Assigned');
        return;
      }

      try {
        const queryParam = state.currentGroupId
          ? `?group_id=${state.currentGroupId}`
          : `?subject_id=${state.currentSubjectId}`;
        const res = await apiFetch(`${apiBase}${queryParam}`);
        if (!res || !res.success || !res.data) {
          notify(res?.error?.message || `Failed to load ${label} dossier.`, 'error');
          renderEmptyState(res?.error?.message || `Unable to load ${label} dossier`);
          return;
        }
        state.dossierData = res.data;
        if (res.data.group?.register_id && !state.currentRegisterId) {
          state.currentRegisterId = res.data.group.register_id;
        }
        renderHeroBanner();
        renderCardsGrid();
        updateCategoryCounts();
      } catch (err) {
        console.error(`loadDossier (${prefix}) error:`, err);
        renderEmptyState(`Error loading ${label} dossier`);
      }
    }

    function renderHeroBanner() {
      const data = state.dossierData;
      if (!data) return;
      const group = data.group || {};
      const fObj = data[fileKey] || data.assessment_file || data.performance_file || {};

      const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
      setTxt(`${prefix}-hero-title`, group.subject_name || group.name || label);
      setTxt(`${prefix}-hero-code`, group.subject_code || group.code || `CLS-${group.id || 101}`);
      setTxt(`${prefix}-hero-dept`, group.department_name || group.department_code || 'Academic Department');
      setTxt(`${prefix}-hero-teacher`, group.teacher_name || state.currentUser?.full_name || 'Assigned Faculty');
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
      setTxt(`${prefix}-meter-caption`, pct === 100
        ? `All ${total} ${label} documents completed`
        : `${completed} of ${total} completed • Documentation in progress`);

      const gid = group.id || state.currentGroupId || '';
      const rid = group.register_id || state.currentRegisterId || '';
      const rollcallBtn = document.getElementById('btn-quick-rollcall');
      const registerBtn = document.getElementById('btn-quick-register');
      const classworkBtn = document.getElementById('btn-quick-classwork');
      if (rollcallBtn) rollcallBtn.href = `/faculty/registers.html?group_id=${gid}${rid ? '&register_id=' + rid : ''}&action=rollcall`;
      if (registerBtn) registerBtn.href = `/faculty/registers.html?group_id=${gid}${rid ? '&register_id=' + rid : ''}`;
      if (classworkBtn) classworkBtn.href = `/faculty/registers.html?group_id=${gid}${rid ? '&register_id=' + rid : ''}&tab=assignments`;

      const hodTrigger = document.getElementById(`${prefix}-hod-audit-trigger`);
      if (hodTrigger) hodTrigger.style.display = state.isHodOrAdmin ? 'flex' : 'none';

      const remarksBanner = document.getElementById(`${prefix}-remarks-banner`);
      const remarksText = document.getElementById(`${prefix}-remarks-text`);
      const remarksMeta = document.getElementById(`${prefix}-remarks-meta`);
      if (remarksBanner && fObj.hod_remarks) {
        remarksBanner.style.display = 'flex';
        if (remarksText) remarksText.innerText = fObj.hod_remarks;
        if (remarksMeta) remarksMeta.innerText = `Reviewed by: ${fObj.audited_by_name || 'HOD'} on ${formatDateTime(fObj.audited_at)}`;
      } else if (remarksBanner) {
        remarksBanner.style.display = 'none';
      }
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
      const items = state.dossierData?.items || [];
      let filtered = items;
      if (state.currentCategory !== 'all') {
        filtered = filtered.filter(i => i.category === state.currentCategory);
      }
      if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase();
        filtered = filtered.filter(i =>
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.desc && i.desc.toLowerCase().includes(q)) ||
          (i.document?.file_name && i.document.file_name.toLowerCase().includes(q))
        );
      }
      if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg);"><h3 style="color:var(--text-main); margin-bottom: 0.5rem;">No Matching ${escapeHtml(label)} Items</h3><p style="color:var(--text-muted); font-size:0.85rem;">Try clearing your search query or selecting a different category tab.</p></div>`;
        return;
      }

      grid.innerHTML = filtered.map(item => {
        const doc = item.document;
        const isUploaded = Boolean(doc && doc.file_path);
        const isComplete = isUploaded || item.is_completed;
        const hasSystemData = item.has_system_data;
        const tag = escapeHtml(item.section || (item.category ? item.category.toUpperCase().replace(/_/g, ' ') : sectionTag));

        const statusBadgeHtml = isUploaded
          ? `<span class="badge badge-present" style="font-size:0.72rem;">Uploaded (${formatBytes(doc.file_size)})</span>`
          : (hasSystemData
            ? `<span class="badge badge-sem" style="font-size:0.72rem;">Live DB Synced</span>`
            : `<span class="badge badge-late" style="font-size:0.72rem;">Action Required</span>`);

        const sectionBadgeHtml = tag
          ? `<span class="badge" style="background:var(--bg-surface);border:1px solid var(--border-color);font-size:0.68rem;color:var(--text-muted);font-weight:600;">${tag}</span>`
          : '';

        let statusBoxHtml = '';
        if (doc) {
          statusBoxHtml = `
            <div class="cf-card-status-box">
              <div class="cf-doc-info-left">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--status-present);flex-shrink:0;">
                  <path d="M14 2H6a2 2 0 0 1-2 2v16a2 2 0 0 1 2 2h12a2 2 0 0 1 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span class="cf-doc-filename" title="${escapeHtml(doc.file_name)}">${escapeHtml(doc.file_name)}</span>
              </div>
              <span class="cf-doc-meta">${formatBytes(doc.file_size)} &bull; ${formatDateTime(doc.updated_at || doc.created_at)}</span>
            </div>
          `;
        } else {
          statusBoxHtml = `
            <div class="cf-doc-empty-placeholder" style="margin-top:0.35rem;font-size:0.76rem;color:var(--text-muted);display:flex;align-items:center;gap:0.35rem;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>Awaiting PDF upload (.pdf)</span>
            </div>
          `;
        }

        let actionsHtml = '';
        if (isUploaded) {
          actionsHtml = `
            <button type="button" class="cf-card-btn success" onclick="openPreviewModal('${escapeHtml(doc.file_path)}', '${escapeHtml(item.title).replace(/'/g, "\\'")}', '${escapeHtml(doc.file_name).replace(/'/g, "\\'")}')" title="Preview document in viewer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              <span>View</span>
            </button>
            <a href="${escapeHtml(doc.file_path)}" download="${escapeHtml(doc.file_name)}" class="cf-card-btn" title="Download PDF document">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>Download</span>
            </a>
            <button type="button" class="cf-card-btn" onclick="openUploadModal('${escapeHtml(item.key)}', '${escapeHtml(item.title).replace(/'/g, "\\'")}', true)" title="Replace with updated PDF">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span>Replace</span>
            </button>
            <button type="button" class="cf-card-btn danger" onclick="openDeleteModal('${escapeHtml(item.key)}', '${escapeHtml(item.title).replace(/'/g, "\\'")}')" title="Delete uploaded document">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Delete</span>
            </button>
          `;
        } else {
          actionsHtml = `
            <button type="button" class="cf-card-btn primary" onclick="openUploadModal('${escapeHtml(item.key)}', '${escapeHtml(item.title).replace(/'/g, "\\'")}', false)" title="Upload PDF document">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span>Upload PDF</span>
            </button>
          `;
        }

        return `
          <div class="cf-artifact-card ${isComplete ? 'is-complete uploaded' : 'pending'}" data-item-key="${escapeHtml(item.key)}" id="card-artifact-${escapeHtml(item.key)}">
            <div class="cf-card-main-content">
              <span class="cf-card-num">#${item.num}</span>
              <div class="cf-card-header-info">
                <div class="cf-card-title-row">
                  <span class="cf-card-title">${escapeHtml(item.title)}</span>
                  ${statusBadgeHtml}
                  ${sectionBadgeHtml}
                </div>
                ${item.desc ? `<p class="cf-card-desc" style="margin: 0.2rem 0 0; font-size: 0.82rem; color: var(--text-muted); line-height: 1.4;">${escapeHtml(item.desc)}</p>` : ''}
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

    function setupDropzone() {
      const dropzone = document.getElementById('cf-dropzone');
      if (!dropzone) return;
      ['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); }));
      ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); }));
      dropzone.addEventListener('drop', e => {
        if (e.dataTransfer?.files?.length > 0) window.onFileSelected(e.dataTransfer.files);
      });
    }

    window.setCategoryFilter = function (category, btnEl) {
      state.currentCategory = category || 'all';
      document.querySelectorAll('.cf-tab-btn, .cf-tab-pill').forEach(b => b.classList.remove('active'));
      if (btnEl) btnEl.classList.add('active');
      renderCardsGrid();
    };

    window.onSearchDocuments = function (q) {
      state.searchQuery = q || '';
      renderCardsGrid();
    };

    window.openUploadModal = function (itemKey, itemTitle, isReplace = false) {
      state.activeItemKeyForUpload = itemKey;
      state.activeItemTitleForUpload = itemTitle;
      state.isReplacingDoc = isReplace;
      state.selectedUploadFile = null;
      const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
      setTxt('modal-upload-title', isReplace ? `Replace ${itemTitle}` : `Upload ${itemTitle}`);
      setTxt('submit-upload-label', isReplace ? 'Replace Document' : 'Upload Document');
      const notesInput = document.getElementById('doc-notes-input');
      if (notesInput) notesInput.value = '';
      window.clearSelectedFile();
      const overlay = document.getElementById('upload-modal-overlay');
      if (overlay) overlay.style.display = 'flex';
    };

    window.closeUploadModal = function () {
      const overlay = document.getElementById('upload-modal-overlay');
      if (overlay) overlay.style.display = 'none';
      state.selectedUploadFile = null;
      state.activeItemKeyForUpload = null;
    };

    window.onFileSelected = function (files) {
      if (!files || !files.length) return;
      const file = files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        notify('Only PDF files (.pdf) are permitted.', 'error');
        return;
      }
      state.selectedUploadFile = file;
      const dropzone = document.getElementById('cf-dropzone');
      const fileCard = document.getElementById('file-selected-card');
      const nameEl = document.getElementById('selected-filename');
      const sizeEl = document.getElementById('selected-filesize');
      if (dropzone) dropzone.style.display = 'none';
      if (fileCard) fileCard.style.display = 'flex';
      if (nameEl) nameEl.innerText = file.name;
      if (sizeEl) sizeEl.innerText = formatBytes(file.size);
    };

    window.clearSelectedFile = function () {
      state.selectedUploadFile = null;
      const dropzone = document.getElementById('cf-dropzone');
      const fileCard = document.getElementById('file-selected-card');
      const fileInput = document.getElementById('file-input');
      if (dropzone) dropzone.style.display = 'flex';
      if (fileCard) fileCard.style.display = 'none';
      if (fileInput) fileInput.value = '';
    };

    window.handleDocumentUpload = async function (e) {
      if (e && e.preventDefault) e.preventDefault();
      if (!state.selectedUploadFile || !state.activeItemKeyForUpload) {
        notify('Please select a PDF file to upload.', 'warning');
        return;
      }
      const submitBtn = document.getElementById('btn-submit-upload');
      if (submitBtn) submitBtn.disabled = true;
      try {
        const formData = new FormData();
        formData.append('group_id', state.currentGroupId || '');
        formData.append('subject_id', state.currentSubjectId || '');
        formData.append('item_key', state.activeItemKeyForUpload);
        formData.append('file', state.selectedUploadFile);
        const notesInput = document.getElementById('doc-notes-input');
        if (notesInput && notesInput.value.trim()) formData.append('notes', notesInput.value.trim());

        const res = await apiFetch(`${apiBase}/documents`, { method: 'POST', body: formData });
        if (!res || !res.success) {
          notify(res?.error?.message || 'Failed to upload document.', 'error');
          return;
        }
        notify(`${state.activeItemTitleForUpload} uploaded successfully!`, 'success');
        window.closeUploadModal();
        await loadDossier();
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
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

    window.openDeleteModal = function (itemKey, itemTitle) {
      state.activeItemKeyForDelete = itemKey;
      const deleteName = document.getElementById('delete-doc-name');
      if (deleteName) deleteName.innerText = itemTitle || 'this item';
      const overlay = document.getElementById('delete-modal-overlay');
      if (overlay) overlay.style.display = 'flex';
    };

    window.closeDeleteModal = function () {
      const overlay = document.getElementById('delete-modal-overlay');
      if (overlay) overlay.style.display = 'none';
      state.activeItemKeyForDelete = null;
    };

    window.confirmDeleteDocument = async function () {
      if (!state.activeItemKeyForDelete) return;
      const res = await apiFetch(`${apiBase}/documents`, {
        method: 'DELETE',
        body: JSON.stringify({
          group_id: state.currentGroupId || '',
          subject_id: state.currentSubjectId || '',
          item_key: state.activeItemKeyForDelete
        })
      });
      if (!res || !res.success) {
        notify(res?.error?.message || 'Failed to delete document.', 'error');
        return;
      }
      notify('Document deleted successfully.', 'success');
      window.closeDeleteModal();
      await loadDossier();
    };

    window.openHodAuditModal = function () {
      const fObj = state.dossierData?.[fileKey] || state.dossierData?.assessment_file || state.dossierData?.performance_file || {};
      const statusSelect = document.getElementById('audit-status-select');
      const remarksInput = document.getElementById('audit-remarks-input');
      if (statusSelect) statusSelect.value = fObj.status || 'APPROVED';
      if (remarksInput) remarksInput.value = fObj.hod_remarks || '';
      const overlay = document.getElementById('hod-audit-modal-overlay');
      if (overlay) overlay.style.display = 'flex';
    };

    window.closeHodAuditModal = function () {
      const overlay = document.getElementById('hod-audit-modal-overlay');
      if (overlay) overlay.style.display = 'none';
    };

    window.submitHodAudit = async function (e) {
      if (e && e.preventDefault) e.preventDefault();
      const statusSelect = document.getElementById('audit-status-select');
      const checkedRadio = document.querySelector('input[name="audit_status"]:checked');
      const remarksInput = document.getElementById('audit-remarks-input');
      const status = statusSelect ? statusSelect.value : (checkedRadio ? checkedRadio.value : 'APPROVED');
      const remarks = remarksInput ? remarksInput.value.trim() : '';

      const res = await apiFetch(`${apiBase}/audit`, {
        method: 'POST',
        body: JSON.stringify({
          group_id: state.currentGroupId || '',
          subject_id: state.currentSubjectId || '',
          status,
          remarks
        })
      });
      if (!res || !res.success) {
        notify(res?.error?.message || 'Failed to save audit verification.', 'error');
        return;
      }
      notify('Audit status updated successfully.', 'success');
      window.closeHodAuditModal();
      await loadDossier();
    };

    window.closeModalOnOverlay = function (e, overlayId) {
      if (e.target.id === overlayId) {
        const overlay = document.getElementById(overlayId);
        if (overlay) overlay.style.display = 'none';
      }
    };

    // Backward-compatibility aliases
    window.openDirectUploadModal = function (itemKey, itemTitle) {
      window.openUploadModal(itemKey, itemTitle, false);
    };
    window.previewDocument = function (filePath, title, fileName) {
      window.openPreviewModal(filePath, title, fileName);
    };
    window.deleteUploadedDocument = function (itemKey, itemTitle) {
      window.openDeleteModal(itemKey, itemTitle);
    };

    if (printFnName) {
      window[printFnName] = function () { window.print(); };
    }
  }


  function mountClassDeliveryDossier(cfg) {
    const prefix = cfg.prefix; // 'tc' or 'lc'
    const apiBase = cfg.apiBase; // '/theory-classes' or '/lab-classes'
    const dataKey = cfg.dataKey; // 'theory_class' or 'lab_class'
    const defaultComp = cfg.defaultComponent || 'THEORY';
    const label = cfg.label || 'Theory Classes';
    const printFnName = cfg.printFnName;

    const state = {
      currentUser: null,
      isHodOrAdmin: false,
      currentGroupId: null,
      currentSubjectId: null,
      currentRegisterId: null,
      classData: null,
      currentCategory: 'all',
      searchQuery: '',
      selectedUploadFile: null,
      activeItemKeyForUpload: null
    };

    document.addEventListener('DOMContentLoaded', async () => {
      try {
        const user = typeof window.guardRoute === 'function' ? await window.guardRoute() : null;
        if (!user) return;
        state.currentUser = user;
        state.isHodOrAdmin = Boolean(
          user.roles?.includes('HOD') ||
          user.roles?.includes('DEPT_HEAD') ||
          user.roles?.includes('SYSTEM_ADMIN') ||
          user.is_hod
        );

        const params = new URLSearchParams(window.location.search);
        const urlGroupId = params.get('group_id') || params.get('groupId') || params.get('class_id') || params.get('classId') || params.get('id');
        const urlSubjectId = params.get('subject_id') || params.get('subjectId');
        const urlRegisterId = params.get('register_id') || params.get('registerId');

        if (urlGroupId) state.currentGroupId = parseInt(urlGroupId, 10);
        if (urlSubjectId) state.currentSubjectId = parseInt(urlSubjectId, 10);
        if (urlRegisterId) state.currentRegisterId = parseInt(urlRegisterId, 10);

        await loadClassDossier();
      } catch (err) {
        console.error(`Initialization error in ${prefix}:`, err);
      }
    });

    async function loadClassDossier() {
      if (!state.currentGroupId && !state.currentSubjectId) {
        try {
          const groupsRes = await apiFetch('/teaching-groups?status=ACTIVE');
          if (groupsRes && groupsRes.success && groupsRes.data?.length > 0) {
            const g = defaultComp === 'PRACTICAL'
              ? (groupsRes.data.find(x => (x.component || '').toUpperCase() === 'PRACTICAL') || groupsRes.data[0])
              : groupsRes.data[0];
            state.currentGroupId = g.id;
            state.currentRegisterId = g.register_id || null;
          }
        } catch (_) { }
      }
      if (!state.currentGroupId && !state.currentSubjectId) return;

      try {
        const queryParam = state.currentGroupId ? `group_id=${state.currentGroupId}` : `subject_id=${state.currentSubjectId}`;
        const res = await apiFetch(`${apiBase}?${queryParam}`);
        if (res && res.success && res.data) {
          state.classData = res.data;
          if (res.data.group?.register_id && !state.currentRegisterId) {
            state.currentRegisterId = res.data.group.register_id;
          }
          renderHeroBanner();
          renderCategoryCounts();
          renderArtifactCards();
        } else {
          notify(res?.error?.message || `Failed to load ${label} dossier`, 'error');
        }
      } catch (err) {
        console.error(`Error fetching ${label} dossier:`, err);
      }
    }

    function renderHeroBanner() {
      const data = state.classData;
      if (!data) return;
      const g = data.group || {};
      const rec = data[dataKey] || {};
      const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };

      setTxt(`${prefix}-hero-title`, g.subject_name || g.name || label);
      setTxt(`${prefix}-hero-sem`, `Semester ${g.semester || 1}`);
      setTxt(`${prefix}-hero-component`, g.component || defaultComp);
      setTxt(`${prefix}-hero-ay`, `AY ${g.academic_year_label || '2026-27'}`);
      setTxt(`${prefix}-hero-code`, g.subject_code || g.invite_code || '--');
      setTxt(`${prefix}-hero-dept`, g.department_name || 'Academic Dept');
      setTxt(`${prefix}-hero-teacher`, g.teacher_name || 'Faculty In-Charge');

      const statusBadge = document.getElementById(`${prefix}-hero-status-badge`);
      if (statusBadge) {
        statusBadge.innerText = (rec.status || 'IN_PROGRESS').replace(/_/g, ' ');
        statusBadge.className = 'badge ' + (
          rec.status === 'APPROVED' ? 'badge-present' :
            rec.status === 'REVISION_REQUESTED' ? 'badge-absent' :
              rec.status === 'AUDITED' ? 'badge-late' : 'badge-sem'
        );
      }

      const total = rec.total_items || 7;
      const done = rec.completed_items || 0;
      const pct = rec.completion_pct || Math.round((done / total) * 100);
      setTxt(`${prefix}-meter-score`, `${done} / ${total}`);
      setTxt(`${prefix}-meter-pct`, `${pct}%`);
      const barEl = document.getElementById(`${prefix}-meter-bar`);
      if (barEl) {
        barEl.style.width = `${Math.min(100, Math.max(5, pct))}%`;
        barEl.style.background = pct >= 85 ? 'var(--status-present)' : (pct >= 50 ? 'var(--color-primary)' : 'var(--status-late)');
      }
      setTxt(`${prefix}-meter-caption`, pct === 100
        ? 'Complete — 100% Academic Dossier Ready'
        : (pct >= 50 ? 'Satisfactory — Final Reviews Pending' : 'Documentation In Progress'));

      const regParam = state.currentRegisterId ? `?id=${state.currentRegisterId}` : '';
      const rollcallLink = document.getElementById('btn-quick-rollcall');
      const registerLink = document.getElementById('btn-quick-register');
      const classworkLink = document.getElementById('btn-quick-classwork');
      if (rollcallLink) rollcallLink.href = `/faculty/registers.html${regParam}&action=rollcall`;
      if (registerLink) registerLink.href = `/faculty/registers.html${regParam}`;
      if (classworkLink) classworkLink.href = `/faculty/registers.html${regParam}&tab=assignments`;

      const remarksBanner = document.getElementById(`${prefix}-remarks-banner`);
      if (remarksBanner) {
        if (rec.hod_remarks) {
          remarksBanner.style.display = 'flex';
          setTxt(`${prefix}-remarks-title`, `Department HOD Review (${(rec.status || '').replace(/_/g, ' ')})`);
          setTxt(`${prefix}-remarks-text`, rec.hod_remarks);
          setTxt(`${prefix}-remarks-meta`, `Audited on ${formatDateTime(rec.audited_at)}`);
        } else {
          remarksBanner.style.display = 'none';
        }
      }

      const hodTrigger = document.getElementById(`${prefix}-hod-audit-trigger`);
      if (hodTrigger) hodTrigger.style.display = state.isHodOrAdmin ? 'block' : 'none';
    }

    function renderCategoryCounts() {
      const items = state.classData?.items || [];
      const setCnt = (id, n) => { const el = document.getElementById(id); if (el) el.innerText = n; };
      setCnt('count-cat-all', items.length);
      if (cfg.categoryMap) {
        Object.entries(cfg.categoryMap).forEach(([catKey, domId]) => {
          setCnt(domId, items.filter(i => i.category === catKey).length);
        });
      }
    }

    function renderArtifactCards() {
      const container = document.getElementById(`${prefix}-cards-grid`);
      if (!container || !state.classData) return;
      let items = state.classData.items || [];
      if (state.currentCategory !== 'all') items = items.filter(i => i.category === state.currentCategory);
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        items = items.filter(i => i.title.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q) || String(i.num).includes(q));
      }
      if (items.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:3rem 1.5rem;background:var(--bg-card);border:1px dashed var(--border-color);border-radius:var(--radius-lg);"><h4>No matching ${escapeHtml(label)} records</h4></div>`;
        return;
      }

      container.innerHTML = items.map(item => {
        const doc = item.document;
        const isComplete = item.is_completed;
        const hasSystemData = item.has_system_data;
        const statusBadgeHtml = doc
          ? `<span class="badge badge-present" style="font-size:0.7rem;">Uploaded (${formatBytes(doc.file_size)})</span>`
          : (hasSystemData
            ? `<span class="badge badge-sem" style="font-size:0.7rem;">Live DB Synced</span>`
            : `<span class="badge badge-late" style="font-size:0.7rem;">Action Required</span>`);

        const docInfoHtml = doc ? `
          <div class="cf-card-status-box">
            <div class="cf-doc-info-left">
              <span class="cf-doc-filename" title="${escapeHtml(doc.file_name)}">${escapeHtml(doc.file_name)}</span>
            </div>
            <span class="cf-doc-meta">v${doc.version} • ${formatDateTime(doc.updated_at || doc.created_at)}</span>
            <a href="${doc.file_path}" target="_blank" download class="cf-card-btn" style="padding:0.15rem 0.45rem;font-size:0.7rem;">Download</a>
            <button type="button" class="cf-card-btn danger" style="padding:0.15rem 0.45rem;font-size:0.7rem;" onclick="deleteUploadedDocument('${item.key}')">Delete</button>
          </div>
        ` : '';

        const actionsHtml = `
          <button type="button" class="cf-card-btn primary" onclick="openDirectUploadModal('${item.key}', '${escapeHtml(item.title).replace(/'/g, "\\'")}')">
            <span>${doc ? 'Replace PDF' : 'Upload PDF'}</span>
          </button>
        `;

        return `
          <div class="cf-artifact-card ${isComplete ? 'is-complete' : ''}" data-key="${item.key}" data-category="${item.category}">
            <div class="cf-card-main-content">
              <span class="cf-card-num">#${item.num}</span>
              <div class="cf-card-header-info">
                <div class="cf-card-title-row">
                  <span class="cf-card-title">${escapeHtml(item.title)}</span>
                  ${statusBadgeHtml}
                </div>
                <div style="font-size:0.76rem;color:var(--text-muted);">${escapeHtml(item.desc)}</div>
                ${docInfoHtml}
              </div>
            </div>
            <div class="cf-card-actions">${actionsHtml}</div>
          </div>
        `;
      }).join('');
    }

    window.setCategoryFilter = function (cat, btnEl) {
      state.currentCategory = cat;
      document.querySelectorAll('.cf-tab-pill').forEach(btn => btn.classList.remove('active'));
      if (btnEl) btnEl.classList.add('active');
      renderArtifactCards();
    };

    window.onSearchDocuments = function (val) {
      state.searchQuery = (val || '').trim();
      renderArtifactCards();
    };

    window.openDirectUploadModal = function (itemKey, itemTitle) {
      state.activeItemKeyForUpload = itemKey;
      state.selectedUploadFile = null;
      const overlay = document.getElementById('upload-modal-overlay');
      const itemNameEl = document.getElementById('modal-upload-item-name');
      const titleInput = document.getElementById('doc-title-input');
      const notesInput = document.getElementById('doc-notes-input');
      const fileInput = document.getElementById('file-input-element');
      const previewBox = document.getElementById('file-preview-info');
      if (itemNameEl) itemNameEl.innerText = itemTitle || itemKey;
      if (titleInput) titleInput.value = itemTitle || '';
      if (notesInput) notesInput.value = '';
      if (fileInput) fileInput.value = '';
      if (previewBox) previewBox.style.display = 'none';
      if (overlay) overlay.style.display = 'flex';
    };

    window.closeUploadModal = function () {
      const overlay = document.getElementById('upload-modal-overlay');
      if (overlay) overlay.style.display = 'none';
      state.selectedUploadFile = null;
      state.activeItemKeyForUpload = null;
    };

    window.closeModalOnOverlay = function (e, id) {
      if (e.target.id === id) document.getElementById(id).style.display = 'none';
    };

    window.triggerFileInput = function () {
      const input = document.getElementById('file-input-element');
      if (input) input.click();
    };

    window.handleDragOver = function (e) { e.preventDefault(); e.stopPropagation(); };
    window.handleDragLeave = function (e) { e.preventDefault(); e.stopPropagation(); };
    window.handleFileDrop = function (e) {
      e.preventDefault(); e.stopPropagation();
      if (e.dataTransfer?.files?.length > 0) window.handleFileSelected(e.dataTransfer.files);
    };

    window.handleFileSelected = function (files) {
      if (!files || !files.length) return;
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        notify('Only PDF documents are allowed.', 'warning');
        return;
      }
      state.selectedUploadFile = file;
      const previewBox = document.getElementById('file-preview-info');
      const nameEl = document.getElementById('preview-filename');
      const sizeEl = document.getElementById('preview-filesize');
      if (previewBox) previewBox.style.display = 'inline-flex';
      if (nameEl) nameEl.innerText = file.name;
      if (sizeEl) sizeEl.innerText = formatBytes(file.size);
    };

    window.removeSelectedFile = function (e) {
      if (e) e.stopPropagation();
      state.selectedUploadFile = null;
      const fileInput = document.getElementById('file-input-element');
      const previewBox = document.getElementById('file-preview-info');
      if (fileInput) fileInput.value = '';
      if (previewBox) previewBox.style.display = 'none';
    };

    window.submitDocumentUpload = async function (e) {
      e.preventDefault();
      const recId = state.classData?.[dataKey]?.id;
      if (!recId || !state.selectedUploadFile) {
        notify('Please select a PDF file to upload', 'warning');
        return;
      }
      const formData = new FormData();
      formData.append('file', state.selectedUploadFile);
      formData.append('item_key', state.activeItemKeyForUpload);
      const titleVal = document.getElementById('doc-title-input')?.value?.trim();
      const notesVal = document.getElementById('doc-notes-input')?.value?.trim();
      if (titleVal) formData.append('title', titleVal);
      if (notesVal) formData.append('notes', notesVal);

      const submitBtn = document.getElementById('btn-submit-upload');
      if (submitBtn) submitBtn.disabled = true;
      try {
        const res = await apiFetch(`${apiBase}/${recId}/documents`, { method: 'POST', body: formData });
        if (res && res.success) {
          notify('Document uploaded successfully!', 'success');
          window.closeUploadModal();
          await loadClassDossier();
        } else {
          notify(res?.error?.message || 'Upload failed', 'error');
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    };

    window.deleteUploadedDocument = async function (itemKey) {
      if (!confirm('Are you sure you want to delete this uploaded PDF?')) return;
      const recId = state.classData?.[dataKey]?.id;
      if (!recId) return;
      const res = await apiFetch(`${apiBase}/${recId}/documents/${itemKey}`, { method: 'DELETE' });
      if (res && res.success) {
        notify('Document removed successfully', 'success');
        await loadClassDossier();
      } else {
        notify(res?.error?.message || 'Failed to delete document', 'error');
      }
    };

    window.openHodAuditModal = function () {
      const overlay = document.getElementById('hod-audit-modal-overlay');
      if (overlay) overlay.style.display = 'flex';
    };

    window.closeHodAuditModal = function () {
      const overlay = document.getElementById('hod-audit-modal-overlay');
      if (overlay) overlay.style.display = 'none';
    };

    window.submitHodAudit = async function (e) {
      if (e && e.preventDefault) e.preventDefault();
      const recId = state.classData?.[dataKey]?.id;
      if (!recId) return;
      const statusVal = document.querySelector('input[name="audit_status"]:checked')?.value || 'APPROVED';
      const remarksVal = document.getElementById('audit-remarks-input')?.value?.trim();
      const res = await apiFetch(`${apiBase}/${recId}/audit`, {
        method: 'POST',
        body: JSON.stringify({ status: statusVal, remarks: remarksVal })
      });
      if (res && res.success) {
        notify('Audit review saved successfully', 'success');
        window.closeHodAuditModal();
        await loadClassDossier();
      } else {
        notify(res?.error?.message || 'Failed to save audit review', 'error');
      }
    };

    if (printFnName) {
      window[printFnName] = function () { window.print(); };
    }
    window.printRegisterView = function () {
      if (state.currentRegisterId) window.open(`/faculty/registers.html?id=${state.currentRegisterId}`, '_blank');
    };
  }

  window.FacultyDossier = { mount: mountAssessmentDossier, mountDelivery: mountClassDeliveryDossier };
})();
