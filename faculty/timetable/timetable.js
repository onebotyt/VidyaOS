/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY TIMETABLE ENGINE (timetable.js)
 * Simple Year-Based PDF Timetable Management System
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  let allTimetables = [];
  let currentYearFilter = 'ALL';

  function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function formatDate(isoStr) {
    if (!isoStr) return 'Recently';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) {
      return isoStr;
    }
  }

  function getYearLabel(year) {
    const y = parseInt(year, 10);
    if (y === 1) return '1st Year';
    if (y === 2) return '2nd Year';
    if (y === 3) return '3rd Year';
    return `${year}th Year`;
  }

  // ── 1. Fetch Timetable PDFs ──
  async function loadTimetables() {
    const container = document.getElementById('timetable-cards-container');
    if (!container) return;

    try {
      const res = await window.fetchApi('/timetable/pdf');
      if (res && res.success && Array.isArray(res.data)) {
        allTimetables = res.data;
        updateYearCounts();
        renderTimetableCards();
      } else {
        container.innerHTML = `
          <div class="tt-empty-state" style="grid-column: 1 / -1;">
            <div class="tt-empty-title">Unable to load timetables</div>
            <div class="tt-empty-desc">${res?.error?.message || 'Server returned an error'}</div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="loadTimetables()">Retry</button>
          </div>
        `;
      }
    } catch (err) {
      container.innerHTML = `
        <div class="tt-empty-state" style="grid-column: 1 / -1;">
          <div class="tt-empty-title">Error Loading Timetables</div>
          <div class="tt-empty-desc">${err.message}</div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="loadTimetables()">Retry</button>
        </div>
      `;
    }
  }

  // ── 2. Update Badge Counts ──
  function updateYearCounts() {
    const counts = { ALL: allTimetables.length, 1: 0, 2: 0, 3: 0 };
    allTimetables.forEach(t => {
      const y = parseInt(t.year, 10);
      if (counts[y] !== undefined) counts[y]++;
    });

    const badgeAll = document.getElementById('badge-count-all');
    if (badgeAll) badgeAll.textContent = counts.ALL;
    for (let i = 1; i <= 3; i++) {
      const b = document.getElementById(`badge-count-${i}`);
      if (b) b.textContent = counts[i] || 0;
    }
  }

  // ── 3. Render Cards ──
  function renderTimetableCards() {
    const container = document.getElementById('timetable-cards-container');
    if (!container) return;

    let filtered = allTimetables;
    if (currentYearFilter !== 'ALL') {
      const y = parseInt(currentYearFilter, 10);
      filtered = allTimetables.filter(t => parseInt(t.year, 10) === y);
    }

    if (filtered.length === 0) {
      const yearText = currentYearFilter === 'ALL' ? 'any year' : getYearLabel(currentYearFilter);
      container.innerHTML = `
        <div class="tt-empty-state" style="grid-column: 1 / -1;">
          <div class="tt-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <h3 class="tt-empty-title">No Timetable PDF Uploaded for ${yearText}</h3>
          <p class="tt-empty-desc">Upload the official academic timetable PDF for students of this year to view and download.</p>
          <button type="button" class="btn btn-primary" onclick="openUploadTimetableModal(${currentYearFilter !== 'ALL' ? currentYearFilter : "''"})">
            <span>+ Upload ${yearText !== 'any year' ? yearText : ''} Timetable PDF</span>
          </button>
        </div>
      `;
      return;
    }

    const cardsHtml = filtered.map(t => {
      const yearLabel = getYearLabel(t.year);
      const formattedSize = formatBytes(t.file_size);
      const uploadDate = formatDate(t.created_at);
      const uploader = t.uploader_name || 'Faculty Member';
      const deptName = t.department_name || t.department_code || 'All Branches';

      return `
        <article class="tt-card" id="tt-card-${t.id}">
          <div>
            <div class="tt-card-top">
              <div class="tt-pdf-badge-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
              </div>
              <div class="tt-card-meta">
                <div class="tt-card-badges">
                  <span class="tt-badge-year">${yearLabel}</span>
                  <span class="tt-badge-dept">${deptName}</span>
                </div>
                <h3 class="tt-card-title" title="${t.title}">${t.title}</h3>
                <div class="tt-card-filename" title="${t.file_name}">
                  <span>${t.file_name}</span>
                  <span>&bull; ${formattedSize}</span>
                </div>
              </div>
            </div>

            <div class="tt-card-details">
              <div class="tt-detail-row">
                <span>Published By</span>
                <strong style="color:var(--text-main);">${uploader}</strong>
              </div>
              <div class="tt-detail-row">
                <span>Uploaded Date</span>
                <span style="color:var(--text-main); font-weight:500;">${uploadDate}</span>
              </div>
            </div>
          </div>

          <div class="tt-card-actions">
            <button type="button" class="tt-btn-view" onclick="openPdfViewer('${t.file_path}', '${t.title}')" title="Preview Timetable PDF">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span>View PDF</span>
            </button>
            <a href="${t.file_path}" download="${t.file_name}" class="tt-btn-download" title="Download Timetable PDF">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </a>
            <button type="button" class="tt-btn-delete" onclick="deleteTimetablePdf(${t.id}, '${t.title}')" title="Delete Timetable PDF">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </article>
      `;
    }).join('');

    container.innerHTML = cardsHtml;
  }

  // ── 4. Year Filter Switching ──
  function filterTimetableByYear(year) {
    currentYearFilter = year;
    document.querySelectorAll('.tt-year-pill').forEach(pill => {
      const pYear = pill.getAttribute('data-year');
      if (String(pYear) === String(year)) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
    renderTimetableCards();
  }

  // ── 5. Modal Operations ──
  function openUploadTimetableModal(preselectYear = '') {
    const modal = document.getElementById('modal-upload-timetable');
    if (!modal) return;
    const form = document.getElementById('form-upload-timetable');
    if (form) form.reset();

    const fileInfo = document.getElementById('tt-selected-file-info');
    if (fileInfo) fileInfo.style.display = 'none';

    const yearSelect = document.getElementById('tt-upload-year');
    if (yearSelect && preselectYear) {
      yearSelect.value = preselectYear;
      onUploadYearChange();
    }

    modal.classList.add('open');
  }

  function closeUploadTimetableModal() {
    const modal = document.getElementById('modal-upload-timetable');
    if (modal) modal.classList.remove('open');
  }

  function onUploadYearChange() {
    const yearSelect = document.getElementById('tt-upload-year');
    const titleInput = document.getElementById('tt-upload-title');
    if (yearSelect && titleInput && !titleInput.value) {
      const val = yearSelect.value;
      if (val) {
        titleInput.placeholder = `${getYearLabel(val)} Academic Timetable`;
      }
    }
  }

  function handleFileSelect(input) {
    const file = input?.files?.[0];
    const infoBox = document.getElementById('tt-selected-file-info');
    const nameLabel = document.getElementById('tt-file-name-label');
    const sizeLabel = document.getElementById('tt-file-size-label');

    if (file && infoBox) {
      if (nameLabel) nameLabel.textContent = file.name;
      if (sizeLabel) sizeLabel.textContent = `(${formatBytes(file.size)})`;
      infoBox.style.display = 'flex';
    }
  }

  // ── 6. Submit Timetable Upload ──
  async function submitTimetablePdf(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-upload');
    const yearSelect = document.getElementById('tt-upload-year');
    const titleInput = document.getElementById('tt-upload-title');
    const fileInput = document.getElementById('tt-file-input');

    if (!yearSelect?.value) {
      alert('Please select an Academic Year');
      return;
    }
    const file = fileInput?.files?.[0];
    if (!file) {
      alert('Please choose a PDF file to upload');
      return;
    }

    if (file.type && !file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only PDF files are accepted');
      return;
    }

    const formData = new FormData();
    formData.append('year', yearSelect.value);
    formData.append('title', (titleInput?.value || '').trim() || `${getYearLabel(yearSelect.value)} Academic Timetable`);
    formData.append('file', file);

    const prevHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Uploading...</span>';
    }

    try {
      const token = localStorage.getItem('auth_token') || '';
      const response = await fetch('/api/v1/timetable/pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const res = await response.json();
      if (res && res.success) {
        closeUploadTimetableModal();
        await loadTimetables();
        alert(res.message || 'Timetable PDF uploaded successfully');
      } else {
        alert(res?.error?.message || 'Failed to upload timetable');
      }
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = prevHtml;
      }
    }
  }

  // ── 7. Delete Timetable PDF ──
  async function deleteTimetablePdf(id, title) {
    if (!confirm(`Are you sure you want to delete "${title}"? Students of this year will no longer see this timetable.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token') || '';
      const response = await fetch(`/api/v1/timetable/pdf/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const res = await response.json();
      if (res && res.success) {
        allTimetables = allTimetables.filter(t => t.id !== id);
        updateYearCounts();
        renderTimetableCards();
      } else {
        alert(res?.error?.message || 'Failed to delete timetable');
      }
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  }

  // ── 8. PDF Preview Modal ──
  function openPdfViewer(filePath, title) {
    const modal = document.getElementById('modal-pdf-viewer');
    const frame = document.getElementById('pdf-viewer-frame');
    const titleEl = document.getElementById('viewer-title');
    const extLink = document.getElementById('viewer-external-link');

    if (titleEl) titleEl.textContent = title || 'Timetable Preview';
    if (frame) frame.src = filePath;
    if (extLink) extLink.href = filePath;
    if (modal) modal.classList.add('open');
  }

  function closePdfViewerModal() {
    const modal = document.getElementById('modal-pdf-viewer');
    const frame = document.getElementById('pdf-viewer-frame');
    if (frame) frame.src = 'about:blank';
    if (modal) modal.classList.remove('open');
  }

  // Window Exports
  window.filterTimetableByYear = filterTimetableByYear;
  window.openUploadTimetableModal = openUploadTimetableModal;
  window.closeUploadTimetableModal = closeUploadTimetableModal;
  window.onUploadYearChange = onUploadYearChange;
  window.handleFileSelect = handleFileSelect;
  window.submitTimetablePdf = submitTimetablePdf;
  window.deleteTimetablePdf = deleteTimetablePdf;
  window.openPdfViewer = openPdfViewer;
  window.closePdfViewerModal = closePdfViewerModal;
  window.loadTimetables = loadTimetables;

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTimetables);
  } else {
    loadTimetables();
  }
})();
