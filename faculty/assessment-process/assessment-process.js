/**
 * Assessment Process Module ?" Client Logic
 * Location: faculty/assessment-process/assessment-process.js
 * VidyaOS Institutional Campus Operating System
 *
 * Implements 13 Direct & Indirect Assessment artifact cards,
 * PDF uploads, preview iframe, download, replace, delete with confirmation,
 * readiness meter calculation (Direct: X/8, Indirect: Y/5, Total: Z/13),
 * search filtering, category filtering, and HOD audit verification.
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
    assessmentData: null,
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
      await loadAssessmentDossier();
    } catch (err) {
      console.error('Initialization error in assessment-process:', err);
    }
  });

  // Load Assessment Dossier Data
  async function loadAssessmentDossier() {
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
      const res = await apiFetch(`/assessment-process${queryParam}`);

      if (!res || !res.success || !res.data) {
        showToast(res?.error?.message || 'Failed to load Assessment Process dossier.', 'error');
        return;
      }

      state.assessmentData = res.data;
      renderHeroBanner();
      renderCardsGrid();
      updateCategoryCounts();
    } catch (err) {
      console.error('loadAssessmentDossier error:', err);
      showToast('An unexpected network error occurred while loading assessment data.', 'error');
    }
  }

  // Render Hero Header & Documentation Readiness Meter
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
    if (heroTeacher) heroTeacher.innerText = group.teacher_name || state.currentUser?.full_name || 'Assigned Faculty';
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

    // Quick Action Links
    const gid = state.currentGroupId || group.id;
    const rid = state.currentRegisterId || group.register_id;
    const rollcallBtn = document.getElementById('btn-quick-rollcall');
    const registerBtn = document.getElementById('btn-quick-register');
    const classworkBtn = document.getElementById('btn-quick-classwork');

    if (rollcallBtn) {
      rollcallBtn.href = `/faculty/registers.html?group_id=${gid}${rid ? '&register_id=' + rid : ''}&action=rollcall`;
    }
    if (registerBtn) {
      registerBtn.href = `/faculty/registers.html?group_id=${gid}${rid ? '&register_id=' + rid : ''}`;
    }
    if (classworkBtn) {
      classworkBtn.href = `/faculty/registers.html?group_id=${gid}${rid ? '&register_id=' + rid : ''}&tab=assignments`;
    }

    // HOD Audit Trigger Button
    const hodAuditTrigger = document.getElementById('assess-hod-audit-trigger');
    if (hodAuditTrigger) {
      hodAuditTrigger.style.display = state.isHodOrAdmin ? 'flex' : 'none';
    }

    // Remarks Banner
    const remarksBanner = document.getElementById('assess-remarks-banner');
    const remarksText = document.getElementById('assess-remarks-text');
    const remarksMeta = document.getElementById('assess-remarks-meta');
    if (remarksBanner && assessFile.remarks) {
      remarksBanner.style.display = 'block';
      if (remarksText) remarksText.innerText = assessFile.remarks;
      if (remarksMeta) {
        remarksMeta.innerText = `Reviewed by: ${assessFile.audited_by_name || 'HOD'} on ${formatDateTime(assessFile.audited_at)}`;
      }
    } else if (remarksBanner) {
      remarksBanner.style.display = 'none';
    }
  }

  // Update Category Counts on Filter Tabs
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

  // Render Assessment Artifact Cards Grid
  function renderCardsGrid() {
    const data = state.assessmentData;
    const grid = document.getElementById('assess-cards-grid');
    if (!grid) return;

    if (!data || !data.items || data.items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1 / -1;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <h3>No Assessment Items Configured</h3>
          <p>Please contact the system administrator or check subject syllabus mappings.</p>
        </div>
      `;
      return;
    }

    // Filter items based on selected category and search query
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
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3>No Matching Assessment Items</h3>
          <p>No documents found matching "${escapeHtml(state.searchQuery)}". Try another keyword or clear filter.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(item => {
      const doc = item.document;
      const isUploaded = Boolean(doc && doc.file_path);
      const isDirect = item.category === 'direct_assessment';

      return `
        <article class="cf-doc-card ${isUploaded ? 'uploaded' : 'pending'}" data-item-key="${escapeHtml(item.key)}">
          <div class="cf-doc-card-header">
            <div class="cf-doc-number-badge ${isDirect ? 'direct' : 'indirect'}">
              <span>#${item.num}</span>
              <span class="cf-section-tag">${escapeHtml(item.section_code || (isDirect ? 'DIRECT' : 'INDIRECT'))}</span>
            </div>
            <div class="cf-doc-status-badge ${isUploaded ? 'status-uploaded' : 'status-pending'}">
              ${isUploaded ? `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Uploaded
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <span>Document awaiting faculty submission (.pdf)</span>
              </div>
            `}
          </div>

          <div class="cf-doc-card-footer">
            ${isUploaded ? `
              <div class="btn-group-row">
                <button type="button" class="btn btn-sm btn-outline" onclick="openPreviewModal('${escapeHtml(doc.file_path)}', '${escapeHtml(item.title)}', '${escapeHtml(doc.file_name)}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  View
                </button>
                <a href="${escapeHtml(doc.file_path)}" download="${escapeHtml(doc.file_name)}" class="btn btn-sm btn-outline" title="Download PDF">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download
                </a>
                <button type="button" class="btn btn-sm btn-secondary" onclick="openUploadModal('${escapeHtml(item.key)}', '${escapeHtml(item.title)}', true)" title="Replace with updated PDF">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                  Replace
                </button>
                <button type="button" class="btn btn-sm btn-danger-ghost" onclick="openDeleteModal('${escapeHtml(item.key)}', '${escapeHtml(item.title)}')" title="Delete uploaded document">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            ` : `
              <button type="button" class="btn btn-sm btn-primary btn-block" onclick="openUploadModal('${escapeHtml(item.key)}', '${escapeHtml(item.title)}', false)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload PDF
              </button>
            `}
          </div>
        </article>
      `;
    }).join('');
  }

  // Filter category tab switch
  window.setCategoryFilter = function (category, btnElement) {
    state.currentCategory = category;
    const allButtons = document.querySelectorAll('.cf-tab-btn');
    allButtons.forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    renderCardsGrid();
  };

  // Search input handler
  window.onSearchDocuments = function (query) {
    state.searchQuery = query || '';
    renderCardsGrid();
  };

  // Upload Modal Open
  window.openUploadModal = function (itemKey, itemTitle, isReplace = false) {
    state.activeItemKeyForUpload = itemKey;
    state.activeItemTitleForUpload = itemTitle;
    state.isReplacingDoc = isReplace;
    state.selectedUploadFile = null;

    const modalTitle = document.getElementById('modal-upload-title');
    const modalSubtitle = document.getElementById('modal-upload-subtitle');
    const submitLabel = document.getElementById('submit-upload-label');
    const notesInput = document.getElementById('doc-notes-input');
    const fileInput = document.getElementById('file-input');

    if (modalTitle) modalTitle.innerText = isReplace ? `Replace ${itemTitle}` : `Upload ${itemTitle}`;
    if (modalSubtitle) modalSubtitle.innerText = isReplace ? 'Upload updated PDF file to replace the existing version' : 'Select PDF documentation file (max 50MB)';
    if (submitLabel) submitLabel.innerText = isReplace ? 'Replace Document' : 'Upload Document';
    if (notesInput) notesInput.value = '';
    if (fileInput) fileInput.value = '';

    window.clearSelectedFile();

    const overlay = document.getElementById('upload-modal-overlay');
    if (overlay) overlay.style.display = 'flex';
  };

  // Upload Modal Close
  window.closeUploadModal = function () {
    const overlay = document.getElementById('upload-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    state.selectedUploadFile = null;
    state.activeItemKeyForUpload = null;
  };

  // Drag and Drop Zone Setup
  function setupDropzone() {
    const dropzone = document.getElementById('cf-dropzone');
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        window.onFileSelected(files);
      }
    }, false);
  }

  // File selection callback
  window.onFileSelected = function (files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate PDF
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      showToast('Only PDF files (.pdf) are permitted.', 'error');
      return;
    }

    // Validate size (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('File size exceeds the 50MB limit.', 'error');
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

  // Clear selected file
  window.clearSelectedFile = function () {
    state.selectedUploadFile = null;
    const dropzone = document.getElementById('cf-dropzone');
    const fileCard = document.getElementById('file-selected-card');
    const fileInput = document.getElementById('file-input');

    if (dropzone) dropzone.style.display = 'flex';
    if (fileCard) fileCard.style.display = 'none';
    if (fileInput) fileInput.value = '';
  };

  // Submit Upload Handler
  window.handleDocumentUpload = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    if (!state.selectedUploadFile) {
      showToast('Please select a PDF file to upload.', 'warning');
      return;
    }

    if (!state.activeItemKeyForUpload) {
      showToast('No active item selected for upload.', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-upload');
    const submitLabel = document.getElementById('submit-upload-label');
    const originalLabel = submitLabel ? submitLabel.innerText : 'Upload';

    try {
      if (submitBtn) submitBtn.disabled = true;
      if (submitLabel) submitLabel.innerText = 'Uploading...';

      const formData = new FormData();
      formData.append('group_id', state.currentGroupId || '');
      formData.append('subject_id', state.currentSubjectId || '');
      formData.append('item_key', state.activeItemKeyForUpload);
      formData.append('file', state.selectedUploadFile);

      const notesInput = document.getElementById('doc-notes-input');
      if (notesInput && notesInput.value.trim()) {
        formData.append('notes', notesInput.value.trim());
      }

      const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/assessment-process/documents', {
        method: 'POST',
        headers,
        body: formData
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        showToast(json?.error?.message || 'Failed to upload assessment document.', 'error');
        return;
      }

      showToast(`${state.activeItemTitleForUpload} uploaded successfully!`, 'success');
      window.closeUploadModal();
      await loadAssessmentDossier();
    } catch (err) {
      console.error('handleDocumentUpload error:', err);
      showToast('Network error while uploading file.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitLabel) submitLabel.innerText = originalLabel;
    }
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

  // Delete Modal Open
  window.openDeleteModal = function (itemKey, itemTitle) {
    state.activeItemKeyForDelete = itemKey;
    const deleteName = document.getElementById('delete-doc-name');
    if (deleteName) deleteName.innerText = itemTitle || 'this item';

    const overlay = document.getElementById('delete-modal-overlay');
    if (overlay) overlay.style.display = 'flex';
  };

  // Delete Modal Close
  window.closeDeleteModal = function () {
    const overlay = document.getElementById('delete-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    state.activeItemKeyForDelete = null;
  };

  // Confirm Delete Action
  window.confirmDeleteDocument = async function () {
    if (!state.activeItemKeyForDelete) return;

    try {
      const res = await apiFetch('/assessment-process/documents', {
        method: 'DELETE',
        body: {
          group_id: state.currentGroupId || '',
          subject_id: state.currentSubjectId || '',
          item_key: state.activeItemKeyForDelete
        }
      });

      if (!res || !res.success) {
        showToast(res?.error?.message || 'Failed to delete assessment document.', 'error');
        return;
      }

      showToast('Document deleted successfully.', 'success');
      window.closeDeleteModal();
      await loadAssessmentDossier();
    } catch (err) {
      console.error('confirmDeleteDocument error:', err);
      showToast('Network error while deleting document.', 'error');
    }
  };

  // HOD Audit Modal Open
  window.openHodAuditModal = function () {
    const data = state.assessmentData;
    const assessFile = data?.assessment_file || {};

    const statusSelect = document.getElementById('audit-status-select');
    const remarksInput = document.getElementById('audit-remarks-input');

    if (statusSelect) statusSelect.value = assessFile.status || 'APPROVED';
    if (remarksInput) remarksInput.value = assessFile.remarks || '';

    const overlay = document.getElementById('hod-audit-modal-overlay');
    if (overlay) overlay.style.display = 'flex';
  };

  // HOD Audit Modal Close
  window.closeHodAuditModal = function () {
    const overlay = document.getElementById('hod-audit-modal-overlay');
    if (overlay) overlay.style.display = 'none';
  };

  // Submit HOD Audit
  window.submitHodAudit = async function () {
    const statusSelect = document.getElementById('audit-status-select');
    const remarksInput = document.getElementById('audit-remarks-input');

    const status = statusSelect ? statusSelect.value : 'APPROVED';
    const remarks = remarksInput ? remarksInput.value.trim() : '';

    try {
      const res = await apiFetch('/assessment-process/audit', {
        method: 'POST',
        body: {
          group_id: state.currentGroupId || '',
          subject_id: state.currentSubjectId || '',
          status,
          remarks
        }
      });

      if (!res || !res.success) {
        showToast(res?.error?.message || 'Failed to save audit verification.', 'error');
        return;
      }

      showToast('Audit status updated successfully.', 'success');
      window.closeHodAuditModal();
      await loadAssessmentDossier();
    } catch (err) {
      console.error('submitHodAudit error:', err);
      showToast('Network error while saving audit verification.', 'error');
    }
  };

  // Close modals on overlay backdrop click
  window.closeModalOnOverlay = function (e, overlayId) {
    if (e.target.id === overlayId) {
      const overlay = document.getElementById(overlayId);
      if (overlay) overlay.style.display = 'none';
      if (overlayId === 'preview-modal-overlay') {
        const previewFrame = document.getElementById('pdf-preview-frame');
        if (previewFrame) previewFrame.src = '';
      }
    }
  };

  // Print Dossier Index
  window.printAssessmentDossierIndex = function () {
    window.print();
  };

  // Theme Toggle
  window.toggleAppTheme = function () {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  // User Profile Dropdown Toggle
  window.toggleUserProfile = function (e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const dropdown = document.getElementById('header-profile-dropdown');
    if (!dropdown) return;
    const isShown = dropdown.classList.contains('show');
    dropdown.classList.toggle('show', !isShown);
    dropdown.setAttribute('aria-hidden', isShown ? 'true' : 'false');
  };

  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('header-profile-dropdown');
    const trigger = document.getElementById('header-user-profile');
    if (dropdown && dropdown.classList.contains('show')) {
      if (trigger && !trigger.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('show');
        dropdown.setAttribute('aria-hidden', 'true');
      }
    }
  });

  // Logout
  window.logout = function () {
    if (typeof window.authService?.logout === 'function') {
      window.authService.logout();
    } else {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login.html';
    }
  };

})();

