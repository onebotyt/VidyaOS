/**
 * Faculty Drive & Media Asset Hub Controller
 * Location: /faculty/media/media.js
 */

(function() {
  'use strict';

  const API = window.API_BASE || '/api/v1';

  async function apiFetch(endpoint, options = {}) {
    if (typeof window.apiFetch === 'function') {
      return window.apiFetch(endpoint, options);
    }
    const token = typeof getToken === 'function' ? getToken() : (localStorage.getItem('access_token') || '');
    const cleanEndpoint = endpoint.startsWith(API) ? endpoint : `${API}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = { ...(options.headers || {}) };
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(cleanEndpoint, { ...options, headers });
    return await res.json().catch(() => ({}));
  }

  let currentCategory = 'ALL';
  let currentSubjectId = '';
  let currentSearchQuery = '';
  let viewMode = 'grid'; // 'grid' | 'list'
  let allAssets = [];
  let userSubjects = [];
  let searchDebounceTimer = null;
  let omniDebounceTimer = null;
  let selectedOmniIndex = -1;

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    try {
      const user = await guardRoute({ requireFaculty: true });
      if (!user) return;

      setupFacultyProfile(user);
      setupKeyboardShortcuts();
      await loadUserSubjects();
      await loadMediaAssets();

      // Check URL parameters for auto-action
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'upload') {
        openUploadModal();
      }
    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  function setupFacultyProfile(user) {
    const avatar = document.getElementById('gc-user-avatar');
    const popAvatar = document.getElementById('popover-avatar');
    const popName = document.getElementById('popover-user-name');
    const popEmail = document.getElementById('popover-user-email');

    const name = user.full_name || user.username || 'Faculty Member';
    const initial = name.charAt(0).toUpperCase();

    if (avatar) avatar.textContent = initial;
    if (popAvatar) popAvatar.textContent = initial;
    if (popName) popName.textContent = name;
    if (popEmail) popEmail.textContent = user.email || '';
  }

  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ctrl + K or Cmd + K opens Omnisearch
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        openOmnisearch();
      }
      if (e.key === 'Escape') {
        closeOmnisearch();
        closePreviewModal();
        closeUploadModal();
      }
    });

    // Setup Drag and Drop events
    const dropzone = document.getElementById('upload-dropzone');
    if (dropzone) {
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
          const fileInput = document.getElementById('file-input');
          fileInput.files = files;
          onFileSelected(fileInput);
        }
      });
    }
  }

  // ==================== ASSET LOADING & DISPLAY ====================

  async function loadUserSubjects() {
    try {
      const res = await apiFetch('/teaching-groups?status=ACTIVE');
      userSubjects = res?.data || [];
      const filterSelect = document.getElementById('drive-subject-select');
      const uploadSelect = document.getElementById('upload-subject');

      filterSelect.innerHTML = '<option value="">All Courses &amp; Subjects</option>';
      uploadSelect.innerHTML = '<option value="">-- General / Departmental --</option>';

      userSubjects.forEach(g => {
        const subId = g.subject_id || g.register_id || g.id;
        const label = `${g.subject_code ? g.subject_code + ' - ' : ''}${g.subject_name || g.name}`;
        const optFilter = document.createElement('option');
        optFilter.value = subId;
        optFilter.textContent = label;
        filterSelect.appendChild(optFilter);

        const optUpload = document.createElement('option');
        optUpload.value = subId;
        optUpload.textContent = label;
        uploadSelect.appendChild(optUpload);
      });
    } catch (err) {
      console.warn('Could not load assigned subjects:', err);
    }
  }

  async function loadMediaAssets() {
    const grid = document.getElementById('media-grid');
    const tbody = document.getElementById('media-table-tbody');

    grid.innerHTML = `
      <div class="drive-loading-state">
        <div class="drive-spinner"></div>
        <p>Loading your faculty files...</p>
      </div>
    `;

    try {
      let qStr = `?category=${encodeURIComponent(currentCategory)}`;
      if (currentSubjectId) qStr += `&subject_id=${encodeURIComponent(currentSubjectId)}`;
      if (currentSearchQuery) qStr += `&search=${encodeURIComponent(currentSearchQuery)}`;

      const res = await apiFetch(`/media${qStr}`);
      allAssets = res?.data || [];
      const stats = res?.stats || {};

      // Update counters
      document.getElementById('count-all').textContent = stats.total_count || 0;
      document.getElementById('count-doc').textContent = stats.doc_count || 0;
      document.getElementById('count-video').textContent = stats.video_count || 0;
      document.getElementById('count-image').textContent = stats.image_count || 0;
      document.getElementById('count-student').textContent = stats.student_doc_count || 0;

      const sizeMb = ((stats.total_bytes || 0) / (1024 * 1024)).toFixed(1);
      document.getElementById('drive-stats-badge').textContent = `${allAssets.length} files • ${sizeMb} MB`;

      renderAssets(allAssets);
    } catch (err) {
      console.error('Failed to load assets:', err);
      grid.innerHTML = `
        <div class="drive-empty-state">
          <p style="color:var(--status-absent);">Failed to load files from server: ${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  }

  function renderAssets(assets) {
    const grid = document.getElementById('media-grid');
    const tbody = document.getElementById('media-table-tbody');

    if (!assets || assets.length === 0) {
      const emptyHtml = `
        <div class="drive-empty-state">
          <div class="drive-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <h3 style="font-size:1.1rem;font-weight:700;color:var(--text-main);margin:0 0 0.35rem 0;">No Files Found</h3>
          <p style="font-size:0.85rem;color:var(--text-muted);margin:0 0 1.25rem 0;">Upload your first lecture notes, lab demo video, or student record to this drive.</p>
          <button type="button" class="btn btn-primary btn-sm" onclick="openUploadModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <span>Upload File</span>
          </button>
        </div>
      `;
      grid.innerHTML = emptyHtml;
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:var(--text-muted);">No assets found.</td></tr>`;
      return;
    }

    // Grid Rendering
    grid.innerHTML = assets.map(a => renderAssetCard(a)).join('');

    // List Table Rendering
    tbody.innerHTML = assets.map(a => renderAssetTableRow(a)).join('');
  }

  function getFileIconClass(type) {
    if (type === 'VIDEO') return 'video';
    if (type === 'IMAGE') return 'image';
    if (type === 'STUDENT_DOC') return 'student';
    return 'doc';
  }

  function getFileIconSvg(type) {
    if (type === 'VIDEO') {
      return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>';
    }
    if (type === 'IMAGE') {
      return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
    }
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function renderAssetCard(a) {
    const iconClass = getFileIconClass(a.file_type);
    const iconSvg = getFileIconSvg(a.file_type);
    const sizeStr = formatBytes(a.file_size);
    const dateStr = formatDate(a.created_at);
    const subjectLabel = a.subject_code ? `${a.subject_code}` : (a.subject_name || 'General');
    const categoryPretty = (a.category || 'LECTURE_NOTES').replace(/_/g, ' ');

    let studentPill = '';
    if (a.student_name) {
      studentPill = `
        <div class="media-student-row">
          <span>🎓</span>
          <span>${escapeHtml(a.student_name)} (Roll ${escapeHtml(a.student_roll_no || '-')})</span>
        </div>
      `;
    }

    return `
      <div class="media-card" id="card-asset-${a.id}">
        <div class="media-card-top">
          <div class="media-icon-box ${iconClass}">
            ${iconSvg}
          </div>
          <div class="media-info">
            <h4 class="media-title" title="${escapeHtml(a.title)}">${escapeHtml(a.title)}</h4>
            <div class="media-original-name" title="${escapeHtml(a.original_name)}">${escapeHtml(a.original_name)}</div>
          </div>
        </div>

        <div class="media-card-middle">
          <div class="media-pills-row">
            <span class="media-pill subject">${escapeHtml(subjectLabel)}</span>
            <span class="media-pill">${escapeHtml(categoryPretty)}</span>
            ${a.is_public_to_students ? '<span class="media-pill" style="color:var(--status-present);background:var(--status-present-bg);">Public</span>' : ''}
          </div>
          ${studentPill}
        </div>

        <div class="media-card-bottom">
          <span class="media-meta-text">${sizeStr} • ${dateStr}</span>
          <div class="media-card-actions">
            <button type="button" class="media-action-icon-btn" onclick="previewAsset(${a.id})" title="Preview File">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <a href="${escapeHtml(a.file_path)}" download="${escapeHtml(a.original_name)}" class="media-action-icon-btn" title="Download">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </a>
            <button type="button" class="media-action-icon-btn delete" onclick="deleteAsset(${a.id}, '${escapeHtml(a.title)}')" title="Delete File">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderAssetTableRow(a) {
    const iconClass = getFileIconClass(a.file_type);
    const sizeStr = formatBytes(a.file_size);
    const dateStr = formatDate(a.created_at);
    const subjectLabel = a.subject_code || a.subject_name || 'General';

    return `
      <tr>
        <td style="text-align:center;">
          <div class="media-icon-box ${iconClass}" style="width:30px;height:30px;font-size:0.85rem;margin:auto;">
            ${getFileIconSvg(a.file_type)}
          </div>
        </td>
        <td>
          <div style="font-weight:700;color:var(--text-main);font-size:0.88rem;">${escapeHtml(a.title)}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(a.original_name)}</div>
        </td>
        <td><span class="media-pill subject">${escapeHtml(subjectLabel)}</span></td>
        <td><span class="media-pill">${escapeHtml((a.category || '').replace(/_/g, ' '))}</span></td>
        <td style="font-size:0.8rem;color:var(--text-muted);">${sizeStr}</td>
        <td style="font-size:0.8rem;color:var(--text-muted);">${dateStr}</td>
        <td style="text-align:right;">
          <div style="display:inline-flex;gap:0.35rem;">
            <button type="button" class="media-action-icon-btn" onclick="previewAsset(${a.id})" title="Preview">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <a href="${escapeHtml(a.file_path)}" download="${escapeHtml(a.original_name)}" class="media-action-icon-btn" title="Download">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </a>
            <button type="button" class="media-action-icon-btn delete" onclick="deleteAsset(${a.id}, '${escapeHtml(a.title)}')" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  // ==================== CATEGORY & FILTER CONTROLS ====================

  window.selectCategory = function(cat) {
    currentCategory = cat;
    document.querySelectorAll('.chip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === cat);
    });
    loadMediaAssets();
  };

  window.onSubjectFilterChange = function() {
    currentSubjectId = document.getElementById('drive-subject-select').value;
    loadMediaAssets();
  };

  window.debounceFilter = function() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentSearchQuery = document.getElementById('drive-search-input').value.trim();
      loadMediaAssets();
    }, 250);
  };

  window.setViewMode = function(mode) {
    viewMode = mode;
    const gridBtn = document.getElementById('btn-view-grid');
    const listBtn = document.getElementById('btn-view-list');
    const grid = document.getElementById('media-grid');
    const tableWrap = document.getElementById('media-table-wrap');

    if (mode === 'grid') {
      gridBtn.classList.add('active');
      listBtn.classList.remove('active');
      grid.style.display = 'grid';
      tableWrap.style.display = 'none';
    } else {
      listBtn.classList.add('active');
      gridBtn.classList.remove('active');
      grid.style.display = 'none';
      tableWrap.style.display = 'block';
    }
  };

  // ==================== UPLOAD MODAL FLOW ====================

  window.openUploadModal = function() {
    document.getElementById('upload-modal').style.display = 'flex';
    document.getElementById('upload-form').reset();
    document.getElementById('dropzone-selected-file').style.display = 'none';
    document.getElementById('dropzone-title').textContent = 'Click to select a file or drag & drop here';
    document.getElementById('upload-progress-wrap').style.display = 'none';
    document.getElementById('btn-submit-upload').disabled = false;
  };

  window.closeUploadModal = function() {
    document.getElementById('upload-modal').style.display = 'none';
  };

  window.onFileSelected = function(input) {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const selectedBox = document.getElementById('dropzone-selected-file');
      selectedBox.textContent = `Selected: ${file.name} (${formatBytes(file.size)})`;
      selectedBox.style.display = 'block';
      document.getElementById('dropzone-title').textContent = 'File ready to upload';

      // Auto-fill title if empty
      const titleInput = document.getElementById('upload-title');
      if (!titleInput.value.trim()) {
        titleInput.value = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      }
    }
  };

  window.handleUploadSubmit = async function(e) {
    e.preventDefault();
    const fileInput = document.getElementById('file-input');
    if (!fileInput.files || !fileInput.files[0]) {
      showToast('Please select a file to upload.', 'warning');
      return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', document.getElementById('upload-title').value.trim() || file.name);
    formData.append('category', document.getElementById('upload-category').value);
    formData.append('subject_id', document.getElementById('upload-subject').value);
    formData.append('tags', document.getElementById('upload-tags').value.trim());
    formData.append('is_public_to_students', document.getElementById('upload-public').checked ? '1' : '0');

    const progressWrap = document.getElementById('upload-progress-wrap');
    const progressFill = document.getElementById('upload-progress-fill');
    const submitBtn = document.getElementById('btn-submit-upload');

    progressWrap.style.display = 'block';
    progressFill.style.width = '30%';
    submitBtn.disabled = true;

    try {
      const token = typeof getToken === 'function' ? getToken() : (localStorage.getItem('access_token') || '');
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API}/media/upload`, true);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = function(evt) {
        if (evt.lengthComputable) {
          const percent = Math.round((evt.loaded / evt.total) * 95);
          progressFill.style.width = `${percent}%`;
          document.getElementById('upload-progress-text').textContent = `Uploading ${percent}%...`;
        }
      };

      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          progressFill.style.width = '100%';
          showToast('File uploaded to Faculty Drive successfully!', 'success');
          closeUploadModal();
          loadMediaAssets();
        } else {
          try {
            const errJson = JSON.parse(xhr.responseText);
            showToast(errJson?.error?.message || 'Upload failed.', 'error');
          } catch (_) {
            showToast('Failed to upload file.', 'error');
          }
          submitBtn.disabled = false;
        }
      };

      xhr.onerror = function() {
        showToast('Network error during upload.', 'error');
        submitBtn.disabled = false;
      };

      xhr.send(formData);
    } catch (err) {
      showToast(err.message || 'Upload error.', 'error');
      submitBtn.disabled = false;
    }
  };

  // ==================== IN-APP PREVIEW FLOW ====================

  window.previewAsset = function(assetId) {
    const asset = allAssets.find(a => a.id === assetId);
    if (!asset) return;

    const modal = document.getElementById('preview-modal');
    const titleEl = document.getElementById('preview-title');
    const metaEl = document.getElementById('preview-meta');
    const downloadBtn = document.getElementById('preview-download-btn');
    const bodyEl = document.getElementById('preview-body');

    titleEl.textContent = asset.title;
    metaEl.textContent = `${asset.original_name} • ${formatBytes(asset.file_size)} • ${asset.mime_type}`;
    downloadBtn.href = asset.file_path;
    downloadBtn.download = asset.original_name;

    bodyEl.innerHTML = '';

    if (asset.file_type === 'IMAGE') {
      bodyEl.innerHTML = `<img src="${escapeHtml(asset.file_path)}" class="preview-image" alt="${escapeHtml(asset.title)}">`;
    } else if (asset.file_type === 'VIDEO') {
      bodyEl.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;width:100%;height:100%;padding:1rem;">
          <video controls autoplay class="preview-video-player" src="${escapeHtml(asset.file_path)}">
            Your browser does not support the video tag.
          </video>
        </div>
      `;
    } else if (asset.mime_type === 'application/pdf' || asset.file_path.toLowerCase().endsWith('.pdf')) {
      bodyEl.innerHTML = `<iframe src="${escapeHtml(asset.file_path)}" class="preview-iframe"></iframe>`;
    } else {
      // Document / Presentation fallback
      bodyEl.innerHTML = `
        <div style="text-align:center;padding:3rem 1rem;color:var(--text-main);">
          <div style="font-size:3rem;margin-bottom:1rem;">📄</div>
          <h3 style="font-size:1.15rem;font-weight:700;margin-bottom:0.4rem;">${escapeHtml(asset.title)}</h3>
          <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1.5rem;">${escapeHtml(asset.original_name)} (${formatBytes(asset.file_size)})</p>
          <a href="${escapeHtml(asset.file_path)}" download="${escapeHtml(asset.original_name)}" class="btn btn-primary">
            Download Document
          </a>
        </div>
      `;
    }

    modal.style.display = 'flex';
  };

  window.closePreviewModal = function() {
    const modal = document.getElementById('preview-modal');
    const bodyEl = document.getElementById('preview-body');
    if (bodyEl) bodyEl.innerHTML = ''; // Stop video playback
    modal.style.display = 'none';
  };

  // ==================== DELETE FLOW ====================

  window.deleteAsset = async function(assetId, assetTitle) {
    if (!confirm(`Are you sure you want to permanently delete "${assetTitle}" from your drive?`)) {
      return;
    }
    try {
      await apiFetch(`/media/${assetId}`, { method: 'DELETE' });
      showToast('File deleted permanently.', 'info');
      loadMediaAssets();
    } catch (err) {
      showToast(err.message || 'Failed to delete file.', 'error');
    }
  };

  // ==================== GLOBAL OMNISEARCH (Ctrl + K) ====================

  window.openOmnisearch = function() {
    const modal = document.getElementById('omnisearch-modal');
    const input = document.getElementById('omnisearch-input');
    modal.style.display = 'flex';
    input.value = '';
    input.focus();
    selectedOmniIndex = -1;
    debounceOmnisearch('');
  };

  window.closeOmnisearch = function() {
    document.getElementById('omnisearch-modal').style.display = 'none';
  };

  window.handleOmnisearchBackdrop = function(e) {
    if (e.target.id === 'omnisearch-modal') {
      closeOmnisearch();
    }
  };

  window.navigateFromOmni = function(url) {
    closeOmnisearch();
    window.location.href = url;
  };

  window.debounceOmnisearch = function(val) {
    clearTimeout(omniDebounceTimer);
    omniDebounceTimer = setTimeout(() => {
      executeOmnisearch(val.trim());
    }, 150);
  };

  async function executeOmnisearch(q) {
    const resultsContainer = document.getElementById('omnisearch-results');
    if (!q) {
      // Default quick actions
      resultsContainer.innerHTML = `
        <div class="omnisearch-hints">
          <div class="omnisearch-group-title">QUICK ACTIONS</div>
          <div class="omnisearch-action-item" onclick="navigateFromOmni('/faculty/media.html?action=upload')">
            <span class="omni-item-icon">📤</span>
            <div class="omni-item-text">
              <span class="omni-title">Upload New Media / Document</span>
              <span class="omni-sub">Add lecture recording, notes, or student records to drive</span>
            </div>
          </div>
          <div class="omnisearch-action-item" onclick="navigateFromOmni('/faculty/registers.html')">
            <span class="omni-item-icon">📅</span>
            <div class="omni-item-text">
              <span class="omni-title">Open Attendance Registers</span>
              <span class="omni-sub">Ledger view, daily sessions, and PIN roll call studio</span>
            </div>
          </div>
          <div class="omnisearch-action-item" onclick="navigateFromOmni('/faculty/students.html')">
            <span class="omni-item-icon">👥</span>
            <div class="omni-item-text">
              <span class="omni-title">Department Students Directory</span>
              <span class="omni-sub">View roster, student dossiers, and self-registration</span>
            </div>
          </div>
        </div>
      `;
      return;
    }

    try {
      const res = await apiFetch(`/media/search/omni?q=${encodeURIComponent(q)}`);
      const data = res?.data || {};

      let html = '';

      // 1. Media Assets Results
      if (data.media && data.media.length > 0) {
        html += `<div class="omnisearch-group-title">📁 MEDIA &amp; DOCUMENTS (${data.media.length})</div>`;
        data.media.forEach(m => {
          const icon = m.file_type === 'VIDEO' ? '🎥' : (m.file_type === 'IMAGE' ? '🖼️' : '📄');
          html += `
            <div class="omnisearch-item" onclick="previewAssetFromOmni(${m.id})">
              <span class="omni-item-icon">${icon}</span>
              <div class="omni-item-text">
                <span class="omni-title">${escapeHtml(m.title)}</span>
                <span class="omni-sub">${escapeHtml(m.subject_name || m.subject_code || 'General')} • ${escapeHtml(m.original_name)}</span>
              </div>
            </div>
          `;
        });
      }

      // 2. Student Results
      if (data.students && data.students.length > 0) {
        html += `<div class="omnisearch-group-title">🎓 STUDENTS (${data.students.length})</div>`;
        data.students.forEach(s => {
          html += `
            <div class="omnisearch-item" onclick="navigateFromOmni('/faculty/students.html?search=${encodeURIComponent(s.official_enrollment_no || s.class_roll_no || s.full_name)}')">
              <span class="omni-item-icon">👤</span>
              <div class="omni-item-text">
                <span class="omni-title">${escapeHtml(s.full_name)}</span>
                <span class="omni-sub">Roll #${escapeHtml(s.class_roll_no || '-')} • Enrollment: ${escapeHtml(s.official_enrollment_no || '-')} • ${escapeHtml(s.department_code || '')}</span>
              </div>
            </div>
          `;
        });
      }

      // 3. Courses & Registers
      if (data.courses && data.courses.length > 0) {
        html += `<div class="omnisearch-group-title">📚 COURSES &amp; REGISTERS (${data.courses.length})</div>`;
        data.courses.forEach(c => {
          const url = c.register_id ? `/faculty/registers.html?id=${c.register_id}` : `/faculty/dashboard.html`;
          html += `
            <div class="omnisearch-item" onclick="navigateFromOmni('${url}')">
              <span class="omni-item-icon">📖</span>
              <div class="omni-item-text">
                <span class="omni-title">${escapeHtml(c.subject_name)} (${escapeHtml(c.subject_code || '')})</span>
                <span class="omni-sub">${escapeHtml(c.register_name || 'Classroom Subject Register')}</span>
              </div>
            </div>
          `;
        });
      }

      // 4. Quick Actions
      if (data.actions && data.actions.length > 0) {
        html += `<div class="omnisearch-group-title">⚡ ACTIONS</div>`;
        data.actions.forEach(a => {
          html += `
            <div class="omnisearch-item" onclick="navigateFromOmni('${a.url}')">
              <span class="omni-item-icon">✨</span>
              <div class="omni-item-text">
                <span class="omni-title">${escapeHtml(a.title)}</span>
                <span class="omni-sub">${escapeHtml(a.category)}</span>
              </div>
            </div>
          `;
        });
      }

      if (!html) {
        html = `
          <div style="text-align:center;padding:2rem 1rem;color:var(--text-muted);">
            No records or media found matching "<strong>${escapeHtml(q)}</strong>".
          </div>
        `;
      }

      resultsContainer.innerHTML = html;
    } catch (err) {
      resultsContainer.innerHTML = `<div style="padding:1rem;color:var(--status-absent);">Search error: ${escapeHtml(err.message)}</div>`;
    }
  }

  window.previewAssetFromOmni = async function(assetId) {
    closeOmnisearch();
    try {
      const res = await apiFetch(`/media/${assetId}`);
      if (res?.data) {
        allAssets = [res.data, ...allAssets.filter(a => a.id !== assetId)];
        previewAsset(assetId);
      }
    } catch (_) {
      window.location.href = `/faculty/media.html`;
    }
  };

  // Navigation Drawer Toggles
  window.toggleDrawer = function() {
    const drawer = document.getElementById('gc-drawer');
    const backdrop = document.getElementById('gc-drawer-backdrop');
    drawer.classList.toggle('open');
    backdrop.classList.toggle('open');
  };

  window.toggleAppsLauncher = function() {
    const menu = document.getElementById('apps-launcher-dropdown');
    menu.style.display = menu.style.display === 'none' ? 'grid' : 'none';
  };

  window.toggleUserProfile = function() {
    const menu = document.getElementById('user-profile-popover');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  };

  window.toggleTheme = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  // Close popovers on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#apps-launcher-dropdown') && !e.target.closest('[onclick="toggleAppsLauncher()"]')) {
      const el = document.getElementById('apps-launcher-dropdown');
      if (el) el.style.display = 'none';
    }
    if (!e.target.closest('#user-profile-popover') && !e.target.closest('#gc-user-avatar')) {
      const el = document.getElementById('user-profile-popover');
      if (el) el.style.display = 'none';
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
