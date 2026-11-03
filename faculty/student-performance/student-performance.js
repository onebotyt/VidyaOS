/**
 * Student Performance Monitoring — Client Logic
 * Location: faculty/student-performance/student-performance.js
 * VidyaOS Institutional Campus Operating System
 */

(function () {
  'use strict';

  // Application State
  const state = {
    currentUser: null,
    isHodOrAdmin: false,
    currentGroupId: null,
    currentSubjectId: null,
    currentRegisterId: null,
    performanceData: null,
    currentCategory: 'all',
    searchQuery: '',
    selectedUploadFile: null,
    activeItemKeyForUpload: null,
    activeItemTitleForUpload: '',
    isReplacingDoc: false,
    activeItemKeyForDelete: null
  };

  // Utility helpers
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
      }) + ', ' + d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      });
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

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
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
      state.isHodOrAdmin = Boolean(
        user.roles?.includes('HOD') || 
        user.roles?.includes('DEPT_HEAD') || 
        user.roles?.includes('SYSTEM_ADMIN') ||
        user.is_hod
      );

      // Top navbar user info
      const userInitials = document.getElementById('header-user-initials');
      const dropAvatar = document.getElementById('dropdown-avatar-circle');
      const dropName = document.getElementById('dropdown-full-name');
      const dropEmail = document.getElementById('dropdown-email');
      const dropRole = document.getElementById('dropdown-role-pill');
      const initial = (user.full_name || 'F').charAt(0).toUpperCase();

      if (userInitials) userInitials.innerText = initial;
      if (dropAvatar) dropAvatar.innerText = initial;
      if (dropName) dropName.innerText = user.full_name || 'Faculty Member';
      if (dropEmail) dropEmail.innerText = user.email || '';
      if (dropRole) dropRole.innerText = state.isHodOrAdmin ? 'HOD / Admin' : 'Faculty Member';

      // Parse Query Parameters
      const params = new URLSearchParams(window.location.search);
      const urlGroupId = params.get('group_id') || params.get('id') || params.get('groupId');
      const urlSubjectId = params.get('subject_id');
      const urlRegisterId = params.get('register_id');

      if (urlGroupId) state.currentGroupId = parseInt(urlGroupId, 10);
      if (urlSubjectId) state.currentSubjectId = parseInt(urlSubjectId, 10);
      if (urlRegisterId) state.currentRegisterId = parseInt(urlRegisterId, 10);

      setupDropzone();
      await loadPerformanceDossier();
    } catch (err) {
      console.error('Initialization error in student-performance:', err);
    }
  });

  // Load Performance Dossier Data
  async function loadPerformanceDossier() {
    if (!state.currentGroupId && !state.currentSubjectId) {
      try {
        const groupsRes = await apiFetch('/teaching-groups?status=ACTIVE');
        if (groupsRes && groupsRes.success && groupsRes.data?.length > 0) {
          const selectedGroup = groupsRes.data[0];
          state.currentGroupId = selectedGroup.id;
          state.currentRegisterId = selectedGroup.register_id || null;
        } else {
          showToast('No active teaching class found. Please select a class from the dashboard.', 'warning');
          return;
        }
      } catch (_) {}
    }

    try {
      const queryParam = state.currentGroupId 
        ? `?group_id=${state.currentGroupId}` 
        : `?subject_id=${state.currentSubjectId}`;
      const res = await apiFetch(`/student-performance${queryParam}`);

      if (!res || !res.success || !res.data) {
        showToast(res?.error?.message || 'Failed to load Student Performance Monitoring dossier.', 'error');
        return;
      }

      state.performanceData = res.data;
      renderHeroBanner();
      renderCardsGrid();
      updateCategoryCounts();
    } catch (err) {
      console.error('loadPerformanceDossier error:', err);
      showToast('An unexpected network error occurred while loading performance data.', 'error');
    }
  }

  // Render Hero Header & Documentation Readiness Meter
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
    if (heroDept) heroDept.innerText = group.department_name || 'Academic Department';
    if (heroTeacher) heroTeacher.innerText = group.teacher_name || 'Assigned Faculty';
    if (heroSem) heroSem.innerText = `Semester ${group.semester || 1}`;
    if (heroBranch) heroBranch.innerText = group.department_code || 'Branch';
    if (heroAy) heroAy.innerText = group.academic_year_label || 'AY 2026-27';

    // Status Badge
    const auditStatus = (perfFile.status || 'IN_PROGRESS').toUpperCase();
    if (heroStatusBadge) {
      heroStatusBadge.innerText = auditStatus.replace('_', ' ');
      heroStatusBadge.className = 'badge ' + (
        auditStatus === 'APPROVED' ? 'badge-status-approved' :
        auditStatus === 'REVISION_REQUESTED' ? 'badge-status-revision' :
        'badge-status-progress'
      );
    }

    // Documentation Readiness Meter
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
      if (pct === 100) {
        meterBar.classList.add('is-complete');
      } else {
        meterBar.classList.remove('is-complete');
      }
    }
    if (meterCaption) {
      if (pct === 100) {
        meterCaption.innerText = 'All 8 Documents Complete & Verified';
      } else {
        meterCaption.innerText = `${completedCount} of ${totalItems} documents uploaded (${totalItems - completedCount} pending)`;
      }
    }

    // Quick Action Links
    const rollcallBtn = document.getElementById('btn-quick-rollcall');
    const registerBtn = document.getElementById('btn-quick-register');
    const classworkBtn = document.getElementById('btn-quick-classwork');

    if (rollcallBtn) {
      rollcallBtn.href = `/faculty/registers.html?group_id=${group.id}&action=rollcall`;
    }
    if (registerBtn) {
      const regParam = group.register_id ? `?register_id=${group.register_id}` : `?group_id=${group.id}`;
      registerBtn.href = `/faculty/registers.html${regParam}`;
    }
    if (classworkBtn) {
      classworkBtn.href = `/faculty/group-detail.html?id=${group.id}&tab=classwork`;
    }

    // HOD Audit Trigger Button Visibility
    const hodAuditTrigger = document.getElementById('perf-hod-audit-trigger');
    if (hodAuditTrigger) {
      hodAuditTrigger.style.display = state.isHodOrAdmin ? 'block' : 'none';
    }

    // HOD Remarks Banner
    const remarksBanner = document.getElementById('perf-remarks-banner');
    const remarksTitle = document.getElementById('perf-remarks-title');
    const remarksText = document.getElementById('perf-remarks-text');
    const remarksMeta = document.getElementById('perf-remarks-meta');

    if (remarksBanner) {
      if (perfFile.hod_remarks) {
        remarksBanner.style.display = 'flex';
        if (remarksTitle) remarksTitle.innerText = `HOD Review (${auditStatus.replace('_', ' ')})`;
        if (remarksText) remarksText.innerText = perfFile.hod_remarks;
        if (remarksMeta) remarksMeta.innerText = perfFile.audited_at ? `Verified on ${formatDateTime(perfFile.audited_at)}` : 'HOD Quality Verification';
      } else {
        remarksBanner.style.display = 'none';
      }
    }
  }

  // Update Category Counts on Filter Pills
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

  // Render 8 Artifact Cards List
  function renderCardsGrid() {
    const container = document.getElementById('perf-cards-grid');
    if (!container) return;

    const data = state.performanceData;
    if (!data || !data.items) {
      container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);">No records found.</div>';
      return;
    }

    let items = data.items;

    // Filter by category
    if (state.currentCategory !== 'all') {
      items = items.filter(i => i.category === state.currentCategory);
    }

    // Filter by search query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      items = items.filter(i => 
        i.title.toLowerCase().includes(q) ||
        i.desc.toLowerCase().includes(q) ||
        (i.section && i.section.toLowerCase().includes(q)) ||
        (i.document && i.document.file_name.toLowerCase().includes(q))
      );
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:3rem 1.5rem;text-align:center;color:var(--text-muted);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 0.75rem;opacity:0.6;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <div style="font-weight:700;color:var(--text-main);font-size:0.95rem;">No matching documents found</div>
          <p style="font-size:0.8rem;margin-top:0.25rem;">Try adjusting your search query or switching category filters.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => {
      const isComplete = item.is_completed;
      const doc = item.document;

      let fileInfoHtml = '';
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
              <span class="cf-version-pill">v${doc.version || 1}</span>
            </div>
          </div>
        `;
      }

      let actionsHtml = '';
      if (isComplete && doc) {
        actionsHtml = `
          <div class="cf-card-actions">
            <button type="button" class="cf-card-btn" onclick="openPreviewModal('${escapeHtml(doc.file_path)}', '${escapeHtml(item.title).replace(/'/g, "\\'")}', '${escapeHtml(doc.file_name).replace(/'/g, "\\'")}')" title="Preview PDF Document">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span>View</span>
            </button>
            <a href="${escapeHtml(doc.file_path)}" download="${escapeHtml(doc.file_name)}" class="cf-card-btn" title="Download PDF File">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Download</span>
            </a>
            <button type="button" class="cf-card-btn" onclick="openUploadModal('${escapeHtml(item.key)}', '${escapeHtml(item.title).replace(/'/g, "\\'")}', true)" title="Replace PDF Document">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>Replace</span>
            </button>
            <button type="button" class="cf-card-btn danger" onclick="openDeleteModal('${escapeHtml(item.key)}', '${escapeHtml(item.title).replace(/'/g, "\\'")}')" title="Delete Uploaded PDF">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete</span>
            </button>
          </div>
        `;
      } else {
        actionsHtml = `
          <div class="cf-card-actions">
            <button type="button" class="cf-card-btn primary" onclick="openUploadModal('${escapeHtml(item.key)}', '${escapeHtml(item.title).replace(/'/g, "\\'")}', false)" title="Upload PDF document for ${escapeHtml(item.title)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>Upload PDF</span>
            </button>
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

  // Filter and Search Handlers
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

  // Upload Modal Management
  window.openUploadModal = function (itemKey, itemTitle, isReplace = false) {
    state.activeItemKeyForUpload = itemKey;
    state.activeItemTitleForUpload = itemTitle;
    state.isReplacingDoc = isReplace;
    state.selectedUploadFile = null;

    const modalTitle = document.getElementById('modal-upload-title');
    const modalSubtitle = document.getElementById('modal-upload-subtitle');
    const submitLabel = document.getElementById('submit-upload-label');
    const fileCard = document.getElementById('file-selected-card');
    const dropzone = document.getElementById('cf-dropzone');
    const notesInput = document.getElementById('doc-notes-input');
    const fileInput = document.getElementById('file-input');

    if (modalTitle) modalTitle.innerText = `${isReplace ? 'Replace' : 'Upload'}: ${itemTitle}`;
    if (modalSubtitle) modalSubtitle.innerText = 'Only PDF documents (.pdf) up to 50MB accepted';
    if (submitLabel) submitLabel.innerText = isReplace ? 'Replace Document' : 'Upload Document';
    if (fileCard) fileCard.style.display = 'none';
    if (dropzone) dropzone.style.display = 'flex';
    if (notesInput) notesInput.value = '';
    if (fileInput) fileInput.value = '';

    const overlay = document.getElementById('upload-modal-overlay');
    if (overlay) overlay.style.display = 'flex';
  };

  window.closeUploadModal = function () {
    const overlay = document.getElementById('upload-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    state.selectedUploadFile = null;
    state.activeItemKeyForUpload = null;
  };

  function setupDropzone() {
    const dropzone = document.getElementById('cf-dropzone');
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-active');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-active');
      }, false);
    });

    dropzone.addEventListener('drop', e => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        onFileSelected(files);
      }
    }, false);
  }

  window.onFileSelected = function (files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate PDF
    const ext = file.name.slice(((file.name.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
    if (ext !== 'pdf' && file.type !== 'application/pdf') {
      showToast('Validation Error: Only PDF files (.pdf) are allowed.', 'error');
      return;
    }

    // Validate size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('Validation Error: File size exceeds the 50MB limit.', 'error');
      return;
    }

    state.selectedUploadFile = file;

    const fileCard = document.getElementById('file-selected-card');
    const dropzone = document.getElementById('cf-dropzone');
    const nameEl = document.getElementById('selected-filename');
    const sizeEl = document.getElementById('selected-filesize');

    if (nameEl) nameEl.innerText = file.name;
    if (sizeEl) sizeEl.innerText = formatBytes(file.size);
    if (dropzone) dropzone.style.display = 'none';
    if (fileCard) fileCard.style.display = 'flex';
  };

  window.clearSelectedFile = function () {
    state.selectedUploadFile = null;
    const fileCard = document.getElementById('file-selected-card');
    const dropzone = document.getElementById('cf-dropzone');
    const fileInput = document.getElementById('file-input');

    if (fileInput) fileInput.value = '';
    if (fileCard) fileCard.style.display = 'none';
    if (dropzone) dropzone.style.display = 'flex';
  };

  window.handleDocumentUpload = async function (e) {
    e.preventDefault();
    if (!state.selectedUploadFile) {
      showToast('Please select a PDF document to upload.', 'warning');
      return;
    }

    const perfFile = state.performanceData?.performance_file;
    if (!perfFile || !perfFile.id) {
      showToast('Performance monitoring record not found.', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-upload');
    const submitLabel = document.getElementById('submit-upload-label');
    const prevText = submitLabel ? submitLabel.innerText : 'Upload';

    try {
      if (submitBtn) submitBtn.disabled = true;
      if (submitLabel) submitLabel.innerText = 'Uploading...';

      const notes = document.getElementById('doc-notes-input')?.value || '';
      const formData = new FormData();
      formData.append('file', state.selectedUploadFile);
      formData.append('item_key', state.activeItemKeyForUpload);
      formData.append('title', state.activeItemTitleForUpload);
      if (notes) formData.append('notes', notes);

      const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/student-performance/${perfFile.id}/documents`, {
        method: 'POST',
        headers,
        body: formData
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok || !resData.success) {
        throw new Error(resData?.error?.message || 'Server failed to process PDF upload.');
      }

      showToast(`${state.activeItemTitleForUpload} uploaded successfully!`, 'success');
      closeUploadModal();
      await loadPerformanceDossier();
    } catch (err) {
      console.error('handleDocumentUpload error:', err);
      showToast(err.message || 'Failed to upload document. Please check your network and try again.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitLabel) submitLabel.innerText = prevText;
    }
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

  // Delete Document Modal
  window.openDeleteModal = function (itemKey, itemTitle) {
    state.activeItemKeyForDelete = itemKey;
    const nameEl = document.getElementById('delete-doc-name');
    if (nameEl) nameEl.innerText = itemTitle;

    const overlay = document.getElementById('delete-modal-overlay');
    if (overlay) overlay.style.display = 'flex';
  };

  window.closeDeleteModal = function () {
    const overlay = document.getElementById('delete-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    state.activeItemKeyForDelete = null;
  };

  window.confirmDeleteDocument = async function () {
    const itemKey = state.activeItemKeyForDelete;
    const perfFile = state.performanceData?.performance_file;
    if (!itemKey || !perfFile || !perfFile.id) return;

    try {
      const res = await apiFetch(`/student-performance/${perfFile.id}/documents/${itemKey}`, {
        method: 'DELETE'
      });

      if (!res || !res.success) {
        throw new Error(res?.error?.message || 'Failed to delete document artifact.');
      }

      showToast('Document deleted successfully.', 'success');
      closeDeleteModal();
      await loadPerformanceDossier();
    } catch (err) {
      console.error('confirmDeleteDocument error:', err);
      showToast(err.message || 'Error deleting document.', 'error');
    }
  };

  // HOD Audit Modal
  window.openHodAuditModal = function () {
    const perfFile = state.performanceData?.performance_file;
    if (!perfFile) return;

    const statusSelect = document.getElementById('audit-status-select');
    const remarksInput = document.getElementById('audit-remarks-input');

    if (statusSelect) statusSelect.value = perfFile.status || 'APPROVED';
    if (remarksInput) remarksInput.value = perfFile.hod_remarks || '';

    const overlay = document.getElementById('hod-audit-modal-overlay');
    if (overlay) overlay.style.display = 'flex';
  };

  window.closeHodAuditModal = function () {
    const overlay = document.getElementById('hod-audit-modal-overlay');
    if (overlay) overlay.style.display = 'none';
  };

  window.submitHodAudit = async function () {
    const perfFile = state.performanceData?.performance_file;
    if (!perfFile || !perfFile.id) return;

    const status = document.getElementById('audit-status-select')?.value || 'APPROVED';
    const remarks = document.getElementById('audit-remarks-input')?.value || '';

    try {
      const res = await apiFetch(`/student-performance/${perfFile.id}/audit`, {
        method: 'POST',
        body: { status, remarks }
      });

      if (!res || !res.success) {
        throw new Error(res?.error?.message || 'Failed to submit audit status.');
      }

      showToast(`Audit verification updated: ${status}`, 'success');
      closeHodAuditModal();
      await loadPerformanceDossier();
    } catch (err) {
      console.error('submitHodAudit error:', err);
      showToast(err.message || 'Error updating audit status.', 'error');
    }
  };

  // Overlay Click Helper
  window.closeModalOnOverlay = function (e, overlayId) {
    if (e.target.id === overlayId) {
      if (overlayId === 'upload-modal-overlay') closeUploadModal();
      if (overlayId === 'preview-modal-overlay') closePreviewModal();
      if (overlayId === 'delete-modal-overlay') closeDeleteModal();
      if (overlayId === 'hod-audit-modal-overlay') closeHodAuditModal();
    }
  };

  // Print Dossier Index Sheet
  window.printPerformanceDossierIndex = function () {
    window.print();
  };

  // Theme & Profile Menus
  window.toggleAppTheme = function () {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  window.toggleUserProfile = function (e) {
    e.stopPropagation();
    const dropdown = document.getElementById('header-profile-dropdown');
    if (dropdown) {
      const isOpen = dropdown.getAttribute('aria-hidden') === 'false';
      dropdown.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
    }
  };

  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('header-profile-dropdown');
    const trigger = document.getElementById('header-user-profile');
    if (dropdown && trigger && !trigger.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.setAttribute('aria-hidden', 'true');
    }
  });

  window.logout = function () {
    if (typeof window.logoutUser === 'function') {
      window.logoutUser();
    } else {
      localStorage.clear();
      window.location.href = '/login.html';
    }
  };

})();
