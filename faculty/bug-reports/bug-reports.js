/**
 * VidyaOS Faculty Bug Reporting & Technical Support Engine
 * Location: /faculty/bug-reports/bug-reports.js
 */

(function () {
  'use strict';

  let _selectedScreenshot = null;
  let _selectedRecording = null;
  let _myReportsCache = [];

  function getUser() {
    try {
      const stored = localStorage.getItem('user') || localStorage.getItem('auth_user') || localStorage.getItem('vidyaos_user');
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
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

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(dStr) {
    if (!dStr) return '—';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return dStr;
    }
  }

  function getStatusBadge(status) {
    const s = String(status || 'New').trim();
    if (s === 'New') {
      return `<span class="badge-status badge-status-new">New</span>`;
    } else if (s === 'Under Review') {
      return `<span class="badge-status badge-status-under-review">Under Review</span>`;
    } else if (s === 'In Progress') {
      return `<span class="badge-status badge-status-in-progress">In Progress</span>`;
    } else if (s === 'Resolved') {
      return `<span class="badge-status badge-status-resolved">Resolved</span>`;
    } else if (s === 'Rejected') {
      return `<span class="badge-status badge-status-rejected">Rejected</span>`;
    }
    return `<span class="badge-status badge-status-new">${escapeHtml(s)}</span>`;
  }

  // ── Tab Switching ──
  function switchBugTab(tab) {
    const btnSubmit = document.getElementById('tab-btn-submit');
    const btnMy = document.getElementById('tab-btn-my-reports');
    const panelSubmit = document.getElementById('panel-submit-bug');
    const panelMy = document.getElementById('panel-my-reports');

    if (tab === 'my-reports') {
      btnSubmit?.classList.remove('active');
      btnMy?.classList.add('active');
      if (panelSubmit) panelSubmit.style.display = 'none';
      if (panelMy) panelMy.style.display = 'block';
      loadMyReports();
    } else {
      btnMy?.classList.remove('active');
      btnSubmit?.classList.add('active');
      if (panelMy) panelMy.style.display = 'none';
      if (panelSubmit) panelSubmit.style.display = 'block';
    }
  }

  // ── File Selection Handlers ──
  function handleScreenshotSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
      alert('Invalid image format. Only PNG, JPG, and JPEG files are supported.');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Screenshot is too large. Maximum allowed size is 10MB.');
      e.target.value = '';
      return;
    }

    _selectedScreenshot = file;
    document.getElementById('error-screenshot').style.display = 'none';
    document.getElementById('dropzone-screenshot').style.display = 'none';

    const preview = document.getElementById('preview-screenshot');
    const thumb = document.getElementById('thumb-screenshot');
    const nameEl = document.getElementById('name-screenshot');
    const sizeEl = document.getElementById('size-screenshot');

    nameEl.textContent = file.name;
    sizeEl.textContent = formatFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (evt) => {
      thumb.src = evt.target.result;
      preview.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  }

  function clearScreenshot(e) {
    if (e) e.stopPropagation();
    _selectedScreenshot = null;
    const input = document.getElementById('input-screenshot');
    if (input) input.value = '';
    const preview = document.getElementById('preview-screenshot');
    if (preview) preview.style.display = 'none';
    const dropzone = document.getElementById('dropzone-screenshot');
    if (dropzone) dropzone.style.display = 'block';
  }

  function handleRecordingSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.mp4', '.webm'].includes(ext)) {
      alert('Invalid video format. Only MP4 and WebM videos are supported.');
      e.target.value = '';
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('Screen recording is too large. Maximum allowed size is 50MB.');
      e.target.value = '';
      return;
    }

    _selectedRecording = file;
    document.getElementById('dropzone-recording').style.display = 'none';

    const preview = document.getElementById('preview-recording');
    const nameEl = document.getElementById('name-recording');
    const sizeEl = document.getElementById('size-recording');

    nameEl.textContent = file.name;
    sizeEl.textContent = formatFileSize(file.size);
    preview.style.display = 'flex';
  }

  function clearRecording(e) {
    if (e) e.stopPropagation();
    _selectedRecording = null;
    const input = document.getElementById('input-recording');
    if (input) input.value = '';
    const preview = document.getElementById('preview-recording');
    if (preview) preview.style.display = 'none';
    const dropzone = document.getElementById('dropzone-recording');
    if (dropzone) dropzone.style.display = 'block';
  }

  // ── Drag & Drop Listeners ──
  function setupDragAndDrop() {
    const shotBox = document.getElementById('dropzone-screenshot');
    if (shotBox) {
      ['dragenter', 'dragover'].forEach(n => shotBox.addEventListener(n, (e) => { e.preventDefault(); shotBox.classList.add('dragover'); }));
      ['dragleave', 'drop'].forEach(n => shotBox.addEventListener(n, (e) => { e.preventDefault(); shotBox.classList.remove('dragover'); }));
      shotBox.addEventListener('drop', (e) => {
        const file = e.dataTransfer?.files?.[0];
        if (file) {
          const input = document.getElementById('input-screenshot');
          input.files = e.dataTransfer.files;
          handleScreenshotSelect({ target: input });
        }
      });
    }

    const recBox = document.getElementById('dropzone-recording');
    if (recBox) {
      ['dragenter', 'dragover'].forEach(n => recBox.addEventListener(n, (e) => { e.preventDefault(); recBox.classList.add('dragover'); }));
      ['dragleave', 'drop'].forEach(n => recBox.addEventListener(n, (e) => { e.preventDefault(); recBox.classList.remove('dragover'); }));
      recBox.addEventListener('drop', (e) => {
        const file = e.dataTransfer?.files?.[0];
        if (file) {
          const input = document.getElementById('input-recording');
          input.files = e.dataTransfer.files;
          handleRecordingSelect({ target: input });
        }
      });
    }
  }

  // ── Form Submit Handler ──
  async function handleBugReportSubmit(e) {
    e.preventDefault();

    const titleInput = document.getElementById('bug-title');
    const categorySelect = document.getElementById('bug-category');
    const descTextarea = document.getElementById('bug-description');
    const errScreenshot = document.getElementById('error-screenshot');

    const title = titleInput?.value?.trim() || '';
    const category = categorySelect?.value || '';
    const description = descTextarea?.value?.trim() || '';

    if (!title) {
      alert('Please provide an Issue Title.');
      titleInput?.focus();
      return;
    }

    if (!category) {
      alert('Please select an Issue Category.');
      categorySelect?.focus();
      return;
    }

    if (!description) {
      alert('Please describe the problem in detail.');
      descTextarea?.focus();
      return;
    }

    if (!_selectedScreenshot) {
      errScreenshot.style.display = 'block';
      document.getElementById('dropzone-screenshot')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const submitBtn = document.getElementById('btn-submit-bug');
    const submitText = document.getElementById('btn-submit-text');
    submitBtn.disabled = true;
    submitText.textContent = 'Submitting Bug Report...';

    try {
      const formData = new FormData();
      formData.append('issue_title', title);
      formData.append('issue_category', category);
      formData.append('description', description);
      formData.append('screenshot', _selectedScreenshot);

      if (_selectedRecording) {
        formData.append('recording', _selectedRecording);
      }

      const res = await fetch('/api/v1/bug-reports', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to submit bug report');
      }

      const report = json.data;

      // Reset form
      document.getElementById('form-report-bug').reset();
      clearScreenshot();
      clearRecording();

      // Show success modal
      document.getElementById('success-report-id').textContent = report.report_id || 'BR-101';
      document.getElementById('modal-submit-success').classList.add('open');

      // Refresh reports count
      loadMyReports();
    } catch (err) {
      alert('Error submitting bug report: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitText.textContent = 'Submit Bug Report';
    }
  }

  function closeSuccessModal() {
    document.getElementById('modal-submit-success')?.classList.remove('open');
    switchBugTab('my-reports');
  }

  // ── Load My Reports ──
  async function loadMyReports() {
    const tbody = document.getElementById('my-reports-tbody');
    const countBadge = document.getElementById('badge-my-count');

    try {
      const res = await fetch('/api/v1/bug-reports/my', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load reports');
      const json = await res.json();
      const reports = json.data || [];
      _myReportsCache = reports;

      if (countBadge) countBadge.textContent = reports.length;

      if (!reports || reports.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center; padding:3rem 1.5rem; color:var(--text-muted);">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 0.5rem; display:block; opacity:0.4;">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="m9 12 2 2 4-4"></path>
              </svg>
              <strong>No bug reports submitted yet.</strong>
              <div style="font-size:0.8rem; margin-top:4px;">When you report technical glitches, you can track their review status and resolution here.</div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = reports.map(r => `
        <tr>
          <td><span class="report-id-chip">${escapeHtml(r.report_id)}</span></td>
          <td style="font-weight:600; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${escapeHtml(r.issue_title)}
          </td>
          <td><span style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(r.issue_category)}</span></td>
          <td><span style="font-size:0.8rem; color:var(--text-muted);">${formatDate(r.created_at)}</span></td>
          <td>${getStatusBadge(r.status)}</td>
          <td style="text-align:right;">
            <button type="button" class="btn-view-report" onclick="viewReportDetails('${r.report_id}')">View Details</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:2rem; color:var(--status-absent);">
            Failed to load reports: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }

  // ── View Report Details Modal ──
  async function viewReportDetails(reportId) {
    let report = _myReportsCache.find(r => r.report_id === reportId || String(r.id) === String(reportId));

    if (!report) {
      try {
        const res = await fetch(`/api/v1/bug-reports/my/${reportId}`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          report = json.data;
        }
      } catch (_) {}
    }

    if (!report) {
      alert('Unable to load report details.');
      return;
    }

    document.getElementById('detail-report-id').textContent = report.report_id;
    document.getElementById('detail-status-slot').innerHTML = getStatusBadge(report.status);
    document.getElementById('detail-issue-title').textContent = report.issue_title;
    document.getElementById('detail-category').textContent = report.issue_category;
    document.getElementById('detail-submitted-at').textContent = formatDate(report.created_at);
    document.getElementById('detail-user-name').textContent = `${report.user_name} (${report.user_role})`;
    document.getElementById('detail-department').textContent = report.department_name || 'Department Unassigned';
    document.getElementById('detail-description').textContent = report.description;

    // Screenshot
    const shotWrap = document.getElementById('detail-screenshot-wrap');
    const shotImg = document.getElementById('detail-screenshot-img');
    const shotLink = document.getElementById('detail-screenshot-link');
    if (report.screenshot_url) {
      shotImg.src = report.screenshot_url;
      shotLink.href = report.screenshot_url;
      shotWrap.style.display = 'block';
    } else {
      shotWrap.style.display = 'none';
    }

    // Video
    const vidWrap = document.getElementById('detail-video-wrap');
    const vidPlayer = document.getElementById('detail-video-player');
    if (report.recording_url) {
      vidPlayer.src = report.recording_url;
      vidWrap.style.display = 'block';
    } else {
      vidPlayer.pause();
      vidPlayer.src = '';
      vidWrap.style.display = 'none';
    }

    // Admin response
    const adminBox = document.getElementById('detail-admin-response-box');
    const adminText = document.getElementById('detail-admin-response-text');
    if (report.admin_response && report.admin_response.trim()) {
      adminText.textContent = report.admin_response;
      adminBox.style.display = 'block';
    } else {
      adminBox.style.display = 'none';
    }

    // Rejection reason
    const rejBox = document.getElementById('detail-rejection-box');
    const rejText = document.getElementById('detail-rejection-text');
    if (report.status === 'Rejected' && report.rejection_reason && report.rejection_reason.trim()) {
      rejText.textContent = report.rejection_reason;
      rejBox.style.display = 'block';
    } else {
      rejBox.style.display = 'none';
    }

    document.getElementById('modal-view-report').classList.add('open');
  }

  function closeViewModal() {
    const vidPlayer = document.getElementById('detail-video-player');
    if (vidPlayer) {
      vidPlayer.pause();
      vidPlayer.src = '';
    }
    document.getElementById('modal-view-report')?.classList.remove('open');
  }

  // ── Init on DOM Ready ──
  function init() {
    const user = getUser();
    const previewEl = document.getElementById('bug-user-preview');
    if (previewEl && user) {
      const name = user.full_name || user.name || user.username || 'Faculty Member';
      const role = 'Faculty';
      const dept = user.department_name || (user.department_id ? `Dept #${user.department_id}` : 'Department');
      previewEl.value = `${name} (${role} • ${dept})`;
    }

    setupDragAndDrop();
    loadMyReports();

    // Check for deep-link in URL query (?report_id=BR-101)
    const urlParams = new URLSearchParams(window.location.search);
    const reportIdParam = urlParams.get('report_id');
    if (reportIdParam) {
      switchBugTab('my-reports');
      setTimeout(() => {
        viewReportDetails(reportIdParam);
      }, 300);
    }
  }

  window.switchBugTab = switchBugTab;
  window.handleScreenshotSelect = handleScreenshotSelect;
  window.clearScreenshot = clearScreenshot;
  window.handleRecordingSelect = handleRecordingSelect;
  window.clearRecording = clearRecording;
  window.handleBugReportSubmit = handleBugReportSubmit;
  window.closeSuccessModal = closeSuccessModal;
  window.loadMyReports = loadMyReports;
  window.viewReportDetails = viewReportDetails;
  window.closeViewModal = closeViewModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
