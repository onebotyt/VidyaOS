/**
 * VidyaOS Admin Bug Reports & Complaints Management Engine
 * Location: /admin/bug-reports/admin-bug-reports.js
 */

(function () {
  'use strict';

  let _currentPage = 1;
  let _totalPages = 1;
  let _reportsCache = [];
  let _activeReport = null;
  let _debounceTimer = null;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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

  // ── 1. Load Statistics ──
  async function loadStatistics() {
    try {
      const res = await fetch('/api/v1/bug-reports/admin/statistics', { credentials: 'include' });
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success || !json.data) return;

      const s = json.data;
      document.getElementById('kpi-total').textContent = s.total || 0;
      document.getElementById('kpi-new').textContent = s.new || 0;
      document.getElementById('kpi-under-review').textContent = s.under_review || 0;
      document.getElementById('kpi-in-progress').textContent = s.in_progress || 0;
      document.getElementById('kpi-resolved').textContent = s.resolved || 0;
      document.getElementById('kpi-rejected').textContent = s.rejected || 0;
    } catch (_) {}
  }

  // ── 2. Load All Reports with Filters ──
  async function loadAllReports() {
    const tbody = document.getElementById('admin-reports-tbody');
    const search = document.getElementById('filter-search')?.value?.trim() || '';
    const role = document.getElementById('filter-role')?.value || '';
    const category = document.getElementById('filter-category')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';
    const dateFrom = document.getElementById('filter-date-from')?.value || '';
    const dateTo = document.getElementById('filter-date-to')?.value || '';

    const params = new URLSearchParams({
      page: _currentPage,
      limit: 20
    });

    if (search) params.append('search', search);
    if (role) params.append('role', role);
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);

    try {
      const res = await fetch(`/api/v1/bug-reports/admin/all?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load bug reports');
      const json = await res.json();

      const reports = json.reports || json.data || [];
      _reportsCache = reports;
      _totalPages = json.totalPages || 1;

      // Update Pagination UI
      const total = json.total || 0;
      const start = total === 0 ? 0 : (_currentPage - 1) * 20 + 1;
      const end = Math.min(_currentPage * 20, total);
      document.getElementById('pagination-info').textContent = `Showing ${start}–${end} of ${total} reports (Page ${_currentPage} of ${_totalPages})`;

      document.getElementById('btn-page-prev').disabled = (_currentPage <= 1);
      document.getElementById('btn-page-next').disabled = (_currentPage >= _totalPages);

      if (!reports || reports.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align:center; padding:3rem 1.5rem; color:var(--text-muted);">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 0.5rem; display:block; opacity:0.4;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              <strong>No bug reports match the selected filters.</strong>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = reports.map(r => {
        const isStudent = r.user_role === 'STUDENT';
        const rolePill = isStudent
          ? `<span class="role-pill role-pill-student">Student</span>`
          : `<span class="role-pill role-pill-faculty">Faculty</span>`;

        return `
          <tr>
            <td data-label="Report ID"><span class="report-id-pill">${escapeHtml(r.report_id)}</span></td>
            <td data-label="User">
              <div style="font-weight:700; color:var(--text-main);">${escapeHtml(r.user_name)}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(r.user_email || 'No email')}</div>
            </td>
            <td data-label="Role">${rolePill}</td>
            <td data-label="Issue" style="font-weight:600; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${escapeHtml(r.issue_title)}
            </td>
            <td data-label="Category"><span style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(r.issue_category)}</span></td>
            <td data-label="Submitted"><span style="font-size:0.8rem; color:var(--text-muted);">${formatDate(r.created_at)}</span></td>
            <td data-label="Status">${getStatusBadge(r.status)}</td>
            <td data-label="Actions" style="text-align:right;">
              <button type="button" class="btn-action-manage" onclick="openManageModal('${r.report_id}')">Review & Manage</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:2rem; color:var(--status-absent);">
            Failed to load reports: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }

  // ── 3. Open Admin Manage Modal ──
  async function openManageModal(reportId) {
    let report = _reportsCache.find(r => r.report_id === reportId || String(r.id) === String(reportId));

    if (!report) {
      try {
        const res = await fetch(`/api/v1/bug-reports/admin/${reportId}`, { credentials: 'include' });
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

    _activeReport = report;

    document.getElementById('modal-report-id').textContent = report.report_id;
    document.getElementById('modal-status-badge').innerHTML = getStatusBadge(report.status);
    document.getElementById('modal-user-info').textContent = `${report.user_name} (${report.user_role} • ID: ${report.user_id})`;
    document.getElementById('modal-user-email').textContent = report.user_email || '—';
    document.getElementById('modal-department').textContent = report.department_name || (report.department_id ? `Dept #${report.department_id}` : 'Unassigned');
    document.getElementById('modal-created-at').textContent = formatDate(report.created_at);

    document.getElementById('modal-issue-title').textContent = report.issue_title;
    document.getElementById('modal-category').textContent = report.issue_category;
    document.getElementById('modal-description').textContent = report.description;

    // Screenshot
    const shotWrap = document.getElementById('modal-screenshot-wrap');
    const shotImg = document.getElementById('modal-screenshot-img');
    const shotLink = document.getElementById('modal-screenshot-link');
    if (report.screenshot_url) {
      shotImg.src = report.screenshot_url;
      shotLink.href = report.screenshot_url;
      shotWrap.style.display = 'block';
    } else {
      shotWrap.style.display = 'none';
    }

    // Video
    const vidWrap = document.getElementById('modal-video-wrap');
    const vidPlayer = document.getElementById('modal-video-player');
    if (report.recording_url) {
      vidPlayer.src = report.recording_url;
      vidWrap.style.display = 'block';
    } else {
      vidPlayer.pause();
      vidPlayer.src = '';
      vidWrap.style.display = 'none';
    }

    // Controls
    document.getElementById('action-status-select').value = report.status || 'New';
    document.getElementById('action-admin-response').value = report.admin_response || '';
    document.getElementById('action-rejection-reason').value = report.rejection_reason || '';

    handleStatusSelectChange();
    const modalEl = document.getElementById('modal-manage-report');
    if (modalEl) {
      modalEl.removeAttribute('inert');
      modalEl.classList.add('open');
    }
  }

  function handleStatusSelectChange() {
    const status = document.getElementById('action-status-select')?.value;
    const rejWrap = document.getElementById('action-rejection-wrap');
    if (rejWrap) {
      rejWrap.style.display = (status === 'Rejected') ? 'block' : 'none';
    }
  }

  function quickSetStatus(newStatus) {
    const sel = document.getElementById('action-status-select');
    if (sel) {
      sel.value = newStatus;
      handleStatusSelectChange();
      if (newStatus === 'Rejected') {
        document.getElementById('action-rejection-reason')?.focus();
      } else {
        document.getElementById('action-admin-response')?.focus();
      }
    }
  }

  async function saveAdminReportChanges() {
    if (!_activeReport) return;

    const status = document.getElementById('action-status-select')?.value;
    const adminResponse = document.getElementById('action-admin-response')?.value?.trim();
    const rejectionReason = document.getElementById('action-rejection-reason')?.value?.trim();

    if (status === 'Rejected' && !rejectionReason) {
      alert('Rejection reason is mandatory when rejecting a bug report.');
      document.getElementById('action-rejection-reason')?.focus();
      return;
    }

    const btn = document.getElementById('btn-save-manage');
    btn.disabled = true;
    btn.textContent = 'Saving Changes...';

    try {
      const res = await fetch(`/api/v1/bug-reports/admin/${_activeReport.report_id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status,
          admin_response: adminResponse,
          rejection_reason: rejectionReason
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update report status');
      }

      closeManageModal();
      loadStatistics();
      loadAllReports();
    } catch (err) {
      alert('Error updating report: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  }

  function closeManageModal() {
    const vidPlayer = document.getElementById('modal-video-player');
    if (vidPlayer) {
      vidPlayer.pause();
      vidPlayer.src = '';
    }
    const modalEl = document.getElementById('modal-manage-report');
    if (modalEl) {
      if (document.activeElement && modalEl.contains(document.activeElement)) {
        if (typeof document.activeElement.blur === 'function') document.activeElement.blur();
        if (document.body && typeof document.body.focus === 'function') document.body.focus();
      }
      modalEl.setAttribute('inert', '');
      modalEl.classList.remove('open');
    }
    _activeReport = null;
  }

  // ── Filters & Pagination ──
  function debounceFilter() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
      _currentPage = 1;
      loadAllReports();
    }, 300);
  }

  function applyFilters() {
    _currentPage = 1;
    loadAllReports();
  }

  function resetFilters() {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-role').value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    _currentPage = 1;
    loadAllReports();
  }

  function changePage(delta) {
    const next = _currentPage + delta;
    if (next >= 1 && next <= _totalPages) {
      _currentPage = next;
      loadAllReports();
    }
  }

  // ── Init on DOM Ready ──
  function init() {
    loadStatistics();
    loadAllReports();

    // Auto open if deep-linked
    const urlParams = new URLSearchParams(window.location.search);
    const reportIdParam = urlParams.get('report_id');
    if (reportIdParam) {
      setTimeout(() => {
        openManageModal(reportIdParam);
      }, 350);
    }
  }

  window.loadStatistics = loadStatistics;
  window.loadAllReports = loadAllReports;
  window.openManageModal = openManageModal;
  window.handleStatusSelectChange = handleStatusSelectChange;
  window.quickSetStatus = quickSetStatus;
  window.saveAdminReportChanges = saveAdminReportChanges;
  window.closeManageModal = closeManageModal;
  window.debounceFilter = debounceFilter;
  window.applyFilters = applyFilters;
  window.resetFilters = resetFilters;
  window.changePage = changePage;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

