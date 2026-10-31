/**
 * Laboratory Classes Academic Dossier — Client Logic
 * Location: faculty/lab-classes/lab-classes.js
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
    labClassData: null,
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

      await loadLabClassDossier();
    } catch (err) {
      console.error('Initialization error in lab-classes:', err);
    }
  });

  // Load Laboratory Class Dossier Data
  async function loadLabClassDossier() {
    if (!state.currentGroupId && !state.currentSubjectId) {
      // Fallback: If no group specified in URL, fetch teacher's first active class (prefer practical/lab)
      try {
        const groupsRes = await apiFetch('/teaching-groups?status=ACTIVE');
        if (groupsRes && groupsRes.success && groupsRes.data?.length > 0) {
          const practicalGroup = groupsRes.data.find(g => (g.component || '').toUpperCase() === 'PRACTICAL') || groupsRes.data[0];
          state.currentGroupId = practicalGroup.id;
          state.currentRegisterId = practicalGroup.register_id || null;
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
      
      const res = await apiFetch(`/lab-classes?${queryParam}`);
      if (res && res.success && res.data) {
        state.labClassData = res.data;
        if (res.data.group?.register_id && !state.currentRegisterId) {
          state.currentRegisterId = res.data.group.register_id;
        }
        renderHeroBanner();
        renderArtifactCards();
        renderCategoryCounts();
      } else {
        showToast(res?.error?.message || 'Failed to load laboratory class dossier', 'error');
      }
    } catch (err) {
      console.error('Error fetching laboratory class dossier:', err);
      showToast('Error loading laboratory class dossier', 'error');
    }
  }

  // Render Hero Banner Card
  function renderHeroBanner() {
    const data = state.labClassData;
    if (!data) return;

    const g = data.group;
    const lc = data.lab_class;

    const titleEl = document.getElementById('lc-hero-title');
    const semEl = document.getElementById('lc-hero-sem');
    const compEl = document.getElementById('lc-hero-component');
    const ayEl = document.getElementById('lc-hero-ay');
    const codeEl = document.getElementById('lc-hero-code');
    const deptEl = document.getElementById('lc-hero-dept');
    const teacherEl = document.getElementById('lc-hero-teacher');
    const statusBadge = document.getElementById('lc-hero-status-badge');

    if (titleEl) titleEl.innerText = g.subject_name || g.name || 'Subject Laboratory Classes';
    if (semEl) semEl.innerText = `Semester ${g.semester || 1}`;
    if (compEl) compEl.innerText = g.component || 'PRACTICAL';
    if (ayEl) ayEl.innerText = `AY ${g.academic_year_label || '2026-27'}`;
    if (codeEl) codeEl.innerText = g.subject_code || g.invite_code || '--';
    if (deptEl) deptEl.innerText = g.department_name || 'Academic Dept';
    if (teacherEl) teacherEl.innerText = g.teacher_name || 'Faculty In-Charge';

    // Status Badge
    if (statusBadge) {
      statusBadge.innerText = (lc.status || 'IN_PROGRESS').replace(/_/g, ' ');
      statusBadge.className = 'badge';
      if (lc.status === 'APPROVED') {
        statusBadge.classList.add('badge-present');
      } else if (lc.status === 'REVISION_REQUESTED') {
        statusBadge.classList.add('badge-absent');
      } else if (lc.status === 'AUDITED') {
        statusBadge.classList.add('badge-late');
      } else {
        statusBadge.classList.add('badge-sem');
      }
    }

    // Progress Score Meter
    const scoreEl = document.getElementById('lc-meter-score');
    const pctEl = document.getElementById('lc-meter-pct');
    const barEl = document.getElementById('lc-meter-bar');
    const capEl = document.getElementById('lc-meter-caption');

    const total = lc.total_items || 7;
    const done = lc.completed_items || 0;
    const pct = lc.completion_pct || Math.round((done / total) * 100);

    if (scoreEl) scoreEl.innerText = `${done} / ${total}`;
    if (pctEl) pctEl.innerText = `${pct}%`;
    if (barEl) {
      barEl.style.width = `${Math.min(100, Math.max(5, pct))}%`;
      barEl.style.background = pct >= 85 ? 'var(--status-present)' : (pct >= 50 ? 'var(--color-primary)' : 'var(--status-late)');
    }
    if (capEl) {
      capEl.innerText = pct === 100 
        ? 'Complete — 100% Laboratory Dossier Ready' 
        : (pct >= 50 ? 'Satisfactory — Final Practical Reviews Pending' : 'Documentation In Progress');
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
    const remarksBanner = document.getElementById('lc-remarks-banner');
    const remarksTitle = document.getElementById('lc-remarks-title');
    const remarksText = document.getElementById('lc-remarks-text');
    const remarksMeta = document.getElementById('lc-remarks-meta');

    if (remarksBanner) {
      if (lc.hod_remarks) {
        remarksBanner.style.display = 'flex';
        if (remarksTitle) remarksTitle.innerText = `Department HOD Review (${(lc.status || '').replace(/_/g, ' ')})`;
        if (remarksText) remarksText.innerText = lc.hod_remarks;
        if (remarksMeta) remarksMeta.innerText = `Audited on ${formatDate(lc.audited_at)}`;
      } else {
        remarksBanner.style.display = 'none';
      }
    }

    // Show HOD Audit trigger if user is HOD/Admin
    const hodTrigger = document.getElementById('lc-hod-audit-trigger');
    if (hodTrigger) {
      hodTrigger.style.display = state.isHodOrAdmin ? 'block' : 'none';
    }
  }

  // Render Category Counts in Filter Tabs
  function renderCategoryCounts() {
    const items = state.labClassData?.items || [];
    const countAll = items.length;
    const countAttendance = items.filter(i => i.category === 'attendance').length;
    const countExperimentation = items.filter(i => i.category === 'experimentation').length;
    const countAssessment = items.filter(i => i.category === 'assessment').length;

    const elAll = document.getElementById('count-cat-all');
    const elAtt = document.getElementById('count-cat-attendance');
    const elExp = document.getElementById('count-cat-experimentation');
    const elAss = document.getElementById('count-cat-assessment');

    if (elAll) elAll.innerText = countAll;
    if (elAtt) elAtt.innerText = countAttendance;
    if (elExp) elExp.innerText = countExperimentation;
    if (elAss) elAss.innerText = countAssessment;
  }

  // Render 7 Artifact Cards Grid
  function renderArtifactCards() {
    const container = document.getElementById('lc-cards-grid');
    if (!container || !state.labClassData) return;

    let items = state.labClassData.items || [];

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
          <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">No matching laboratory class records</h4>
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
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Action Required
          </span>
        `;
      }

      // Action Buttons
      let actionButtonsHtml = '';
      if (item.can_upload) {
        actionButtonsHtml += `
          <button type="button" class="btn btn-primary btn-sm" onclick="openUploadModal('${item.key}')" title="Upload official signed PDF record">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>${doc ? 'Replace PDF' : 'Upload PDF'}</span>
          </button>
        `;
      }

      if (item.action_url) {
        actionButtonsHtml += `
          <a href="${item.action_url}" class="btn btn-outline btn-sm" title="${item.action_label || 'View in System'}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>${item.action_label || 'View in System'}</span>
          </a>
        `;
      }

      if (doc) {
        actionButtonsHtml += `
          <a href="${doc.file_path}" target="_blank" class="btn btn-secondary btn-sm" title="View uploaded PDF document">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <span>View PDF</span>
          </a>
          <button type="button" class="btn btn-secondary btn-sm" onclick="deleteDocument(${doc.id}, '${item.key}')" title="Delete document" style="color:var(--status-absent);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        `;
      }

      return `
        <div class="cf-doc-row" id="item-row-${item.key}">
          <div class="cf-doc-left">
            <div class="cf-doc-num ${isComplete ? 'completed' : ''}">${item.num}</div>
            <div class="cf-doc-info">
              <div class="cf-doc-label-row">
                <span class="cf-doc-title">${escapeHtml(item.title)}</span>
                ${statusBadgeHtml}
              </div>
              <div class="cf-doc-desc">${escapeHtml(item.desc)}</div>
              ${doc ? `
                <div style="font-size:0.73rem; color:var(--text-muted); margin-top:2px;">
                  Uploaded by <strong>${escapeHtml(doc.uploaded_by_name || 'Faculty')}</strong> on ${formatDate(doc.uploaded_at || doc.created_at)}
                  ${doc.notes ? ` • Note: ${escapeHtml(doc.notes)}` : ''}
                </div>
              ` : ''}
            </div>
          </div>
          <div class="cf-doc-right">
            ${actionButtonsHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  // Filter Categories
  window.setCategoryFilter = function (cat) {
    state.currentCategory = cat;
    document.querySelectorAll('.cf-filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-cat') === cat);
    });
    renderArtifactCards();
  };

  // Search Filter
  window.filterRecords = function () {
    const input = document.getElementById('search-records');
    state.searchQuery = (input?.value || '').trim();
    renderArtifactCards();
  };

  // Upload Modal Functions
  window.openUploadModal = function (itemKey) {
    const item = state.labClassData?.items?.find(i => i.key === itemKey);
    if (!item) return;

    state.activeItemKeyForUpload = itemKey;
    state.selectedUploadFile = null;

    const modal = document.getElementById('upload-doc-modal');
    const titleEl = document.getElementById('modal-upload-title');
    const inputEl = document.getElementById('file-upload-input');
    const previewEl = document.getElementById('dropzone-preview');
    const notesEl = document.getElementById('upload-notes');
    const btnSubmit = document.getElementById('btn-submit-upload');

    if (titleEl) titleEl.innerText = `Upload ${item.title}`;
    if (inputEl) inputEl.value = '';
    if (previewEl) previewEl.style.display = 'none';
    if (notesEl) notesEl.value = '';
    if (btnSubmit) btnSubmit.disabled = true;

    if (modal) modal.style.display = 'flex';
  };

  window.closeUploadModal = function () {
    const modal = document.getElementById('upload-doc-modal');
    if (modal) modal.style.display = 'none';
    state.selectedUploadFile = null;
    state.activeItemKeyForUpload = null;
  };

  window.handleFileSelect = function (e) {
    const files = e.target.files;
    if (files && files[0]) {
      processSelectedFile(files[0]);
    }
  };

  function processSelectedFile(file) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please select a valid PDF file.', 'warning');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast('File size exceeds maximum institutional limit of 25MB.', 'warning');
      return;
    }

    state.selectedUploadFile = file;
    const previewEl = document.getElementById('dropzone-preview');
    const nameEl = document.getElementById('preview-file-name');
    const sizeEl = document.getElementById('preview-file-size');
    const btnSubmit = document.getElementById('btn-submit-upload');

    if (nameEl) nameEl.innerText = file.name;
    if (sizeEl) sizeEl.innerText = `(${formatBytes(file.size)})`;
    if (previewEl) previewEl.style.display = 'inline-flex';
    if (btnSubmit) btnSubmit.disabled = false;
  }

  window.removeSelectedFile = function () {
    state.selectedUploadFile = null;
    const inputEl = document.getElementById('file-upload-input');
    const previewEl = document.getElementById('dropzone-preview');
    const btnSubmit = document.getElementById('btn-submit-upload');

    if (inputEl) inputEl.value = '';
    if (previewEl) previewEl.style.display = 'none';
    if (btnSubmit) btnSubmit.disabled = true;
  };

  // Submit Upload
  window.submitUpload = async function () {
    if (!state.selectedUploadFile || !state.activeItemKeyForUpload || !state.labClassData) {
      showToast('Please select a PDF file to upload.', 'warning');
      return;
    }

    const labClassId = state.labClassData.lab_class.id;
    const btnSubmit = document.getElementById('btn-submit-upload');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerText = 'Uploading...';
    }

    try {
      const formData = new FormData();
      formData.append('file', state.selectedUploadFile);
      formData.append('lab_class_id', labClassId);
      formData.append('item_key', state.activeItemKeyForUpload);
      formData.append('notes', document.getElementById('upload-notes')?.value || '');

      const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
      const r = await fetch('/api/v1/lab-classes/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      const res = await r.json().catch(() => ({}));
      if (res && res.success) {
        showToast('Document uploaded successfully!', 'success');
        closeUploadModal();
        await loadLabClassDossier();
      } else {
        showToast(res?.error?.message || 'Failed to upload document', 'error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Error uploading document file.', 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Upload Document';
      }
    }
  };

  // Delete Document
  window.deleteDocument = async function (docId, itemKey) {
    if (!confirm('Are you sure you want to remove this uploaded document record?')) return;
    try {
      const res = await apiFetch(`/lab-classes/documents/${docId}`, { method: 'DELETE' });
      if (res && res.success) {
        showToast('Document removed successfully.', 'info');
        await loadLabClassDossier();
      } else {
        showToast(res?.error?.message || 'Failed to remove document', 'error');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Error deleting document.', 'error');
    }
  };

  // HOD Audit Modal
  window.openHodAuditModal = function () {
    const modal = document.getElementById('hod-audit-modal');
    const tc = state.labClassData?.lab_class;
    if (!modal || !tc) return;

    const statusSel = document.getElementById('audit-status-select');
    const remarksInput = document.getElementById('audit-remarks-input');

    if (statusSel) statusSel.value = tc.status || 'AUDITED';
    if (remarksInput) remarksInput.value = tc.hod_remarks || '';

    modal.style.display = 'flex';
  };

  window.closeHodAuditModal = function () {
    const modal = document.getElementById('hod-audit-modal');
    if (modal) modal.style.display = 'none';
  };

  window.submitHodAudit = async function () {
    const tc = state.labClassData?.lab_class;
    if (!tc) return;

    const statusSel = document.getElementById('audit-status-select');
    const remarksInput = document.getElementById('audit-remarks-input');
    const btnSubmit = document.getElementById('btn-submit-audit');

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerText = 'Submitting...';
    }

    try {
      const res = await apiFetch(`/lab-classes/${tc.id}/audit`, {
        method: 'PUT',
        body: {
          status: statusSel?.value || 'AUDITED',
          hod_remarks: remarksInput?.value || ''
        }
      });

      if (res && res.success) {
        showToast('Audit remarks saved successfully!', 'success');
        closeHodAuditModal();
        await loadLabClassDossier();
      } else {
        showToast(res?.error?.message || 'Failed to save audit remarks', 'error');
      }
    } catch (err) {
      console.error('Audit submit error:', err);
      showToast('Error saving audit remarks.', 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Submit Audit Verification';
      }
    }
  };

  // Print Institutional Laboratory Class Index Sheet
  window.printLabDossierIndex = function () {
    if (!state.labClassData) return;
    const g = state.labClassData.group;
    const tc = state.labClassData.lab_class;
    const items = state.labClassData.items || [];

    const printWin = window.open('', '_blank', 'width=900,height=750');
    if (!printWin) {
      alert('Please allow popups to print the dossier index.');
      return;
    }

    const rowsHtml = items.map(i => {
      const isDone = i.is_completed;
      const doc = i.document;
      return `
        <tr>
          <td style="text-align:center;font-weight:700;padding:8px;border:1px solid #cbd5e1;">#${i.num}</td>
          <td style="font-weight:600;padding:8px;border:1px solid #cbd5e1;">${escapeHtml(i.title)}</td>
          <td style="padding:8px;border:1px solid #cbd5e1;font-size:12px;color:#475569;">${escapeHtml(i.desc)}</td>
          <td style="text-align:center;padding:8px;border:1px solid #cbd5e1;font-weight:700;color:${isDone ? '#166534' : '#991b1b'};">
            ${isDone ? 'COMPLETE' : 'PENDING'}
          </td>
          <td style="padding:8px;border:1px solid #cbd5e1;font-size:11px;color:#64748b;">
            ${doc ? `File: ${escapeHtml(doc.original_filename)} (${formatBytes(doc.file_size)})` : (i.has_system_data ? 'Live DB Synced' : 'Action Required')}
          </td>
        </tr>
      `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laboratory Classes Compliance Dossier Index — ${escapeHtml(g.subject_name || g.name)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          .inst { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
          .subinst { font-size: 12px; color: #475569; margin-top: 4px; }
          .dossier-title { font-size: 16px; font-weight: 700; margin-top: 10px; color: #1e3a8a; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; margin-bottom: 20px; background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; font-weight: 700; text-align: left; }
          .footer { margin-top: 36px; display: flex; justify-content: space-between; font-size: 12px; color: #334155; }
          .sign-box { border-top: 1px solid #64748b; padding-top: 4px; min-width: 180px; text-align: center; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="inst">Government Polytechnic Nainital</div>
          <div class="subinst">Department of ${escapeHtml(g.department_name || 'Technical Education')} • Academic Compliance Cell</div>
          <div class="dossier-title">LABORATORY CLASSES ACADEMIC COMPLIANCE DOSSIER (7 MANDATORY RECORDS)</div>
        </div>

        <div class="meta-grid">
          <div><strong>Subject:</strong> ${escapeHtml(g.subject_name || g.name)} (${escapeHtml(g.subject_code || 'LAB')})</div>
          <div><strong>Academic Year:</strong> ${escapeHtml(g.academic_year_label || '2026-27')}</div>
          <div><strong>Semester &amp; Branch:</strong> Sem ${g.semester || '--'} • ${escapeHtml(g.department_name || 'Engineering')}</div>
          <div><strong>Faculty In-Charge:</strong> ${escapeHtml(g.teacher_name || 'Faculty Member')}</div>
          <div><strong>Component:</strong> PRACTICAL / LABORATORY</div>
          <div><strong>Compliance Readiness:</strong> ${tc.completed_items || 0} / ${tc.total_items || 7} Records (${tc.completion_pct || 0}%)</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:40px;text-align:center;">#</th>
              <th style="width:230px;">Mandatory Record Title</th>
              <th>Description &amp; Purpose</th>
              <th style="width:90px;text-align:center;">Status</th>
              <th style="width:190px;">Verification Artifact</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div class="sign-box">Faculty In-Charge Signature</div>
          <div class="sign-box">Head of Department (HOD)</div>
          <div class="sign-box">Institutional Academic Cell</div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

})();
