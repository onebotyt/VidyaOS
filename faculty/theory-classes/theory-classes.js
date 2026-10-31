/**
 * Theory Classes Academic Dossier — Client Logic
 * Location: faculty/theory-classes/theory-classes.js
 * VidyaOS Institutional Campus Operating System
 */

(function () {
  'use strict';

  // State
  const state = {
    currentUser: null,
    isHodOrAdmin: false,
    currentGroupId: null,
    currentSubjectId: null,
    currentRegisterId: null,
    theoryClassData: null,
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

  function formatDate(dStr) {
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

      // Parse Query Params
      const params = new URLSearchParams(window.location.search);
      const urlGroupId = params.get('group_id') || params.get('id');
      const urlSubjectId = params.get('subject_id');
      const urlRegisterId = params.get('register_id');

      if (urlGroupId) state.currentGroupId = parseInt(urlGroupId, 10);
      if (urlSubjectId) state.currentSubjectId = parseInt(urlSubjectId, 10);
      if (urlRegisterId) state.currentRegisterId = parseInt(urlRegisterId, 10);

      await loadTheoryClassDossier();
    } catch (err) {
      console.error('Initialization error in theory-classes:', err);
    }
  });

  // Load Theory Class Dossier Data
  async function loadTheoryClassDossier() {
    if (!state.currentGroupId && !state.currentSubjectId) {
      // Fallback: If no group specified in URL, fetch teacher's first active class
      try {
        const groupsRes = await apiFetch('/teaching-groups?status=ACTIVE');
        if (groupsRes && groupsRes.success && groupsRes.data?.length > 0) {
          const firstGroup = groupsRes.data[0];
          state.currentGroupId = firstGroup.id;
          state.currentRegisterId = firstGroup.register_id || null;
        } else {
          showToast('No active class found. Please select a class from the dashboard.', 'warning');
          return;
        }
      } catch (_) {}
    }

    try {
      const queryParam = state.currentGroupId 
        ? `group_id=${state.currentGroupId}` 
        : `subject_id=${state.currentSubjectId}`;
      
      const res = await apiFetch(`/theory-classes?${queryParam}`);
      if (res && res.success && res.data) {
        state.theoryClassData = res.data;
        if (res.data.group?.register_id && !state.currentRegisterId) {
          state.currentRegisterId = res.data.group.register_id;
        }
        renderHeroBanner();
        renderArtifactCards();
        renderCategoryCounts();
      } else {
        showToast(res?.error?.message || 'Failed to load theory class dossier', 'error');
      }
    } catch (err) {
      console.error('Error fetching theory class dossier:', err);
      showToast('Error loading theory class dossier', 'error');
    }
  }

  // Render Hero Banner Card
  function renderHeroBanner() {
    const data = state.theoryClassData;
    if (!data) return;

    const g = data.group;
    const tc = data.theory_class;

    const titleEl = document.getElementById('tc-hero-title');
    const semEl = document.getElementById('tc-hero-sem');
    const compEl = document.getElementById('tc-hero-component');
    const ayEl = document.getElementById('tc-hero-ay');
    const codeEl = document.getElementById('tc-hero-code');
    const deptEl = document.getElementById('tc-hero-dept');
    const teacherEl = document.getElementById('tc-hero-teacher');
    const statusBadge = document.getElementById('tc-hero-status-badge');

    if (titleEl) titleEl.innerText = g.subject_name || g.name || 'Subject Theory Classes';
    if (semEl) semEl.innerText = `Semester ${g.semester || 1}`;
    if (compEl) compEl.innerText = g.component || 'THEORY';
    if (ayEl) ayEl.innerText = `AY ${g.academic_year_label || '2026-27'}`;
    if (codeEl) codeEl.innerText = g.subject_code || g.invite_code || '--';
    if (deptEl) deptEl.innerText = g.department_name || 'Academic Dept';
    if (teacherEl) teacherEl.innerText = g.teacher_name || 'Faculty Member';

    // Status Badge
    if (statusBadge) {
      statusBadge.innerText = (tc.status || 'IN_PROGRESS').replace(/_/g, ' ');
      statusBadge.className = 'badge';
      if (tc.status === 'APPROVED') {
        statusBadge.classList.add('badge-present');
      } else if (tc.status === 'REVISION_REQUESTED') {
        statusBadge.classList.add('badge-absent');
      } else if (tc.status === 'AUDITED') {
        statusBadge.classList.add('badge-late');
      } else {
        statusBadge.classList.add('badge-sem');
      }
    }

    // Progress Score Meter
    const scoreEl = document.getElementById('tc-meter-score');
    const pctEl = document.getElementById('tc-meter-pct');
    const barEl = document.getElementById('tc-meter-bar');
    const capEl = document.getElementById('tc-meter-caption');

    const total = tc.total_items || 7;
    const done = tc.completed_items || 0;
    const pct = tc.completion_pct || Math.round((done / total) * 100);

    if (scoreEl) scoreEl.innerText = `${done} / ${total}`;
    if (pctEl) pctEl.innerText = `${pct}%`;
    if (barEl) {
      barEl.style.width = `${Math.min(100, Math.max(5, pct))}%`;
      barEl.style.background = pct >= 85 ? 'var(--status-present)' : (pct >= 50 ? 'var(--color-primary)' : 'var(--status-late)');
    }
    if (capEl) {
      capEl.innerText = pct === 100 
        ? 'Complete — 100% Academic Dossier Ready' 
        : (pct >= 50 ? 'Satisfactory — Final Reviews Pending' : 'Documentation In Progress');
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
    const remarksBanner = document.getElementById('tc-remarks-banner');
    const remarksTitle = document.getElementById('tc-remarks-title');
    const remarksText = document.getElementById('tc-remarks-text');
    const remarksMeta = document.getElementById('tc-remarks-meta');

    if (remarksBanner) {
      if (tc.hod_remarks) {
        remarksBanner.style.display = 'flex';
        if (remarksTitle) remarksTitle.innerText = `Department HOD Review (${(tc.status || '').replace(/_/g, ' ')})`;
        if (remarksText) remarksText.innerText = tc.hod_remarks;
        if (remarksMeta) remarksMeta.innerText = `Audited on ${formatDate(tc.audited_at)}`;
      } else {
        remarksBanner.style.display = 'none';
      }
    }

    // Show HOD Audit trigger if user is HOD/Admin
    const hodTrigger = document.getElementById('tc-hod-audit-trigger');
    if (hodTrigger) {
      hodTrigger.style.display = state.isHodOrAdmin ? 'block' : 'none';
    }
  }

  // Render Category Counts in Filter Tabs
  function renderCategoryCounts() {
    const items = state.theoryClassData?.items || [];
    const countAll = items.length;
    const countAttendance = items.filter(i => i.category === 'attendance').length;
    const countInstruction = items.filter(i => i.category === 'instruction').length;
    const countPedagogy = items.filter(i => i.category === 'pedagogy').length;

    const elAll = document.getElementById('count-cat-all');
    const elAtt = document.getElementById('count-cat-attendance');
    const elInst = document.getElementById('count-cat-instruction');
    const elPed = document.getElementById('count-cat-pedagogy');

    if (elAll) elAll.innerText = countAll;
    if (elAtt) elAtt.innerText = countAttendance;
    if (elInst) elInst.innerText = countInstruction;
    if (elPed) elPed.innerText = countPedagogy;
  }

  // Render 7 Artifact Cards Grid
  function renderArtifactCards() {
    const container = document.getElementById('tc-cards-grid');
    if (!container || !state.theoryClassData) return;

    let items = state.theoryClassData.items || [];

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
        <div style="text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg);">
          <div style="color:var(--text-muted); margin-bottom: 0.5rem;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">No matching theory class records</h4>
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
        statusBadgeHtml = `
          <span class="badge badge-present" style="font-size:0.7rem;display:inline-flex;align-items:center;gap:3px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Uploaded (${formatBytes(doc.file_size)})
          </span>
        `;
      } else if (hasSystemData) {
        statusBadgeHtml = `
          <span class="badge badge-sem" style="font-size:0.7rem;display:inline-flex;align-items:center;gap:3px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            Live DB Synced
          </span>
        `;
      } else {
        statusBadgeHtml = `
          <span class="badge badge-late" style="font-size:0.7rem;display:inline-flex;align-items:center;gap:3px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Action Required
          </span>
        `;
      }

      // Inline Document Box if uploaded
      let docInfoHtml = '';
      if (doc) {
        docInfoHtml = `
          <div class="cf-card-status-box">
            <div class="cf-doc-info-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span class="cf-doc-filename" title="${escapeHtml(doc.file_name)}">${escapeHtml(doc.file_name)}</span>
            </div>
            <span class="cf-doc-meta">v${doc.version} • ${formatDate(doc.updated_at || doc.created_at)}</span>
            <a href="${doc.file_path}" target="_blank" download class="cf-card-btn" style="padding:0.15rem 0.45rem;font-size:0.7rem;" title="Download PDF">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download
            </a>
            <button type="button" class="cf-card-btn danger" style="padding:0.15rem 0.45rem;font-size:0.7rem;" onclick="deleteUploadedDocument('${item.key}')" title="Delete document">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        `;
      }

      // Contextual Action Buttons depending on Item key
      let actionsHtml = '';

      if (item.key === 'attendance_register') {
        const regParam = state.currentRegisterId ? `?id=${state.currentRegisterId}` : '';
        actionsHtml = `
          <a href="/faculty/registers.html${regParam}" class="cf-card-btn primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            <span>View Live Register</span>
          </a>
          <button type="button" class="cf-card-btn" onclick="printRegisterView()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>Print</span>
          </button>
          <button type="button" class="cf-card-btn" onclick="openDirectUploadModal('${item.key}', '${escapeHtml(item.title)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>${doc ? 'Replace PDF' : 'Upload Signed PDF'}</span>
          </button>
        `;
      } else if (item.key === 'assignment_records') {
        const regParam = state.currentRegisterId ? `?id=${state.currentRegisterId}&tab=assignments` : '?tab=assignments';
        const assCount = state.theoryClassData.system_data?.assignments?.length || 0;
        actionsHtml = `
          <a href="/faculty/registers.html${regParam}" class="cf-card-btn primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>View Submissions (${assCount})</span>
          </a>
          <button type="button" class="cf-card-btn" onclick="openDirectUploadModal('${item.key}', '${escapeHtml(item.title)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>${doc ? 'Replace PDF' : 'Upload Signed PDF'}</span>
          </button>
        `;
      } else {
        // Standard PDF Upload items
        actionsHtml = `
          <button type="button" class="cf-card-btn primary" onclick="openDirectUploadModal('${item.key}', '${escapeHtml(item.title)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>${doc ? 'Replace PDF' : 'Upload PDF'}</span>
          </button>
        `;
      }

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
          <div class="cf-card-actions">
            ${actionsHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  // Filter Categories
  window.setCategoryFilter = function (cat, btnEl) {
    state.currentCategory = cat;
    document.querySelectorAll('.cf-tab-pill').forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    });
    if (btnEl) {
      btnEl.classList.add('active');
      btnEl.setAttribute('aria-selected', 'true');
    }
    renderArtifactCards();
  };

  // Search Documents Filter
  window.onSearchDocuments = function (val) {
    state.searchQuery = val.trim();
    renderArtifactCards();
  };

  // Upload Modal Handlers
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
    if (e.target.id === id) {
      document.getElementById(id).style.display = 'none';
    }
  };

  window.triggerFileInput = function () {
    const input = document.getElementById('file-input-element');
    if (input) input.click();
  };

  window.handleDragOver = function (e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById('file-dropzone');
    if (dropzone) dropzone.classList.add('drag-active');
  };

  window.handleDragLeave = function (e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById('file-dropzone');
    if (dropzone) dropzone.classList.remove('drag-active');
  };

  window.handleFileDrop = function (e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById('file-dropzone');
    if (dropzone) dropzone.classList.remove('drag-active');

    if (e.dataTransfer?.files?.length > 0) {
      handleFileSelected(e.dataTransfer.files);
    }
  };

  window.handleFileSelected = function (files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (ext !== '.pdf') {
      showToast('Only PDF documents are allowed for Theory Classes records.', 'warning');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showToast('File size exceeds the 100 MB limit.', 'warning');
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

  // Submit Document Upload
  window.submitDocumentUpload = async function (e) {
    e.preventDefault();
    if (!state.theoryClassData?.theory_class?.id) {
      showToast('No active theory class session found', 'error');
      return;
    }
    if (!state.selectedUploadFile) {
      showToast('Please select a PDF file to upload', 'warning');
      return;
    }

    const tcId = state.theoryClassData.theory_class.id;
    const itemKey = state.activeItemKeyForUpload;
    const titleVal = document.getElementById('doc-title-input')?.value?.trim();
    const notesVal = document.getElementById('doc-notes-input')?.value?.trim();
    const submitBtn = document.getElementById('btn-submit-upload');

    const formData = new FormData();
    formData.append('file', state.selectedUploadFile);
    formData.append('item_key', itemKey);
    if (titleVal) formData.append('title', titleVal);
    if (notesVal) formData.append('notes', notesVal);

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Uploading...';
    }

    try {
      const res = await apiFetch(`/theory-classes/${tcId}/documents`, {
        method: 'POST',
        body: formData
      });

      if (res && res.success) {
        showToast('Document uploaded successfully!', 'success');
        closeUploadModal();
        await loadTheoryClassDossier();
      } else {
        showToast(res?.error?.message || 'Upload failed', 'error');
      }
    } catch (err) {
      console.error('Upload submission error:', err);
      showToast('Error uploading document', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>Upload Document</span>
        `;
      }
    }
  };

  // Delete Document
  window.deleteUploadedDocument = async function (itemKey) {
    if (!confirm('Are you sure you want to delete this uploaded PDF?')) return;
    const tcId = state.theoryClassData?.theory_class?.id;
    if (!tcId) return;

    try {
      const res = await apiFetch(`/theory-classes/${tcId}/documents/${itemKey}`, {
        method: 'DELETE'
      });
      if (res && res.success) {
        showToast('Document removed successfully', 'success');
        await loadTheoryClassDossier();
      } else {
        showToast(res?.error?.message || 'Failed to delete document', 'error');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Error deleting document', 'error');
    }
  };

  // HOD Audit Modal Handlers
  window.openHodAuditModal = function () {
    const overlay = document.getElementById('hod-audit-modal-overlay');
    if (overlay) overlay.style.display = 'flex';
  };

  window.closeHodAuditModal = function () {
    const overlay = document.getElementById('hod-audit-modal-overlay');
    if (overlay) overlay.style.display = 'none';
  };

  window.submitHodAudit = async function (e) {
    e.preventDefault();
    const tcId = state.theoryClassData?.theory_class?.id;
    if (!tcId) return;

    const statusVal = document.querySelector('input[name="audit_status"]:checked')?.value || 'APPROVED';
    const remarksVal = document.getElementById('audit-remarks-input')?.value?.trim();

    try {
      const res = await apiFetch(`/theory-classes/${tcId}/audit`, {
        method: 'POST',
        body: { status: statusVal, remarks: remarksVal }
      });
      if (res && res.success) {
        showToast('Audit review saved successfully', 'success');
        closeHodAuditModal();
        await loadTheoryClassDossier();
      } else {
        showToast(res?.error?.message || 'Failed to save audit review', 'error');
      }
    } catch (err) {
      console.error('Audit submission error:', err);
      showToast('Error saving audit review', 'error');
    }
  };

  // Print Theory Dossier Index & Cover Sheet
  window.printTheoryDossierIndex = function () {
    const data = state.theoryClassData;
    if (!data) return;

    const g = data.group;
    const tc = data.theory_class;
    const items = data.items || [];

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const rowsHtml = items.map(i => {
      const doc = i.document;
      const statusText = doc ? `Uploaded (${formatBytes(doc.file_size)}, v${doc.version})` : (i.has_system_data ? 'Live DB Synced' : 'Pending');
      return `
        <tr>
          <td style="text-align:center;font-weight:bold;padding:8px;border:1px solid #cbd5e1;">#${i.num}</td>
          <td style="padding:8px;border:1px solid #cbd5e1;font-weight:600;">${escapeHtml(i.title)}</td>
          <td style="padding:8px;border:1px solid #cbd5e1;">${escapeHtml(i.category.toUpperCase())}</td>
          <td style="padding:8px;border:1px solid #cbd5e1;">${statusText}</td>
          <td style="padding:8px;border:1px solid #cbd5e1;">${doc ? escapeHtml(doc.file_name) : '--'}</td>
          <td style="text-align:center;padding:8px;border:1px solid #cbd5e1;">${doc ? 'Verified' : ''}</td>
        </tr>
      `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Theory Classes Academic Dossier — ${escapeHtml(g.subject_name || g.name)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .header h2 { margin: 0; font-size: 1.3rem; text-transform: uppercase; }
          .header h4 { margin: 4px 0 0; color: #475569; font-size: 0.95rem; }
          .meta-table { width: 100%; margin-bottom: 20px; font-size: 0.9rem; }
          .meta-table td { padding: 4px 8px; }
          table.records { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 10px; }
          th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 0.85rem; }
          .sig-box { text-align: center; width: 200px; border-top: 1px solid #0f172a; padding-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Government Polytechnic Nainital</h2>
          <h4>Theory Classes Academic Dossier &amp; Delivery Register</h4>
        </div>
        <table class="meta-table">
          <tr>
            <td><strong>Subject:</strong> ${escapeHtml(g.subject_name || g.name)} (${escapeHtml(g.subject_code || '--')})</td>
            <td><strong>Semester:</strong> ${g.semester || 1} (${escapeHtml(g.component || 'THEORY')})</td>
          </tr>
          <tr>
            <td><strong>Department:</strong> ${escapeHtml(g.department_name || '--')}</td>
            <td><strong>Academic Year:</strong> ${escapeHtml(g.academic_year_label || '2026-27')}</td>
          </tr>
          <tr>
            <td><strong>Teacher In-Charge:</strong> ${escapeHtml(g.teacher_name || '--')}</td>
            <td><strong>Compliance Status:</strong> ${tc.completed_items || 0} / ${tc.total_items || 7} (${tc.completion_pct || 0}%)</td>
          </tr>
        </table>
        <table class="records">
          <thead>
            <tr>
              <th style="width:40px;text-align:center;">#</th>
              <th>Record Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Artifact / File</th>
              <th style="width:80px;text-align:center;">Sign</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer">
          <div class="sig-box">Faculty In-Charge</div>
          <div class="sig-box">Head of Department (HOD)</div>
          <div class="sig-box">Academic Dean / Principal</div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  window.printRegisterView = function () {
    if (state.currentRegisterId) {
      window.open(`/faculty/registers.html?id=${state.currentRegisterId}`, '_blank');
    }
  };

})();

