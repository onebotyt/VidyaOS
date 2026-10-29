/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY LEAVE APPROVALS LOGIC (leave-approvals.js)
 * Location: /frontend/faculty/leave-approvals/leave-approvals.js
 * 
 * - Seamless RBAC access for Faculty & Department HODs
 * - Live segmented filter tabs with dynamic counter badges
 * - Instant client-side search across Student Name & Roll No
 * - Approve / Reject adjudication with custom review note modal
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // 1. Guard route: Allow Teachers and HODs
  if (typeof guardRoute === 'function') {
    guardRoute({ roles: ['TEACHER', 'HOD'], requireDepartmentFaculty: true });
  }

  let allLeavesData = [];
  let currentStatus = 'PENDING';
  let currentSearchQuery = '';
  let pendingRejectId = null;

  // 2. Initialize Department Hero Info
  function initHeroDeptInfo() {
    let user = null;
    if (typeof getCurrentUser === 'function') {
      user = getCurrentUser();
    }
    if (!user) {
      try {
        const stored = localStorage.getItem('user') || localStorage.getItem('auth_user');
        if (stored) user = JSON.parse(stored);
      } catch (_) { }
    }

    const deptNameEl = document.getElementById('leave-dept-name');
    const deptMetaEl = document.getElementById('leave-dept-meta');

    if (deptNameEl && user) {
      deptNameEl.textContent = user.department_name || user.department?.name || 'Information Technology';
    }

    if (deptMetaEl && user) {
      const empId = user.employee_id || user.teacher?.employee_id || 'F002';
      const roleName = user.is_hod ? 'HOD' : 'Teacher';
      deptMetaEl.textContent = `Faculty ID: ${empId} | Role: ${roleName}`;
    }
  }

  // 3. Date Formatting Helpers
  function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function calculateDays(fromDateStr, toDateStr) {
    if (!fromDateStr || !toDateStr) return 1;
    const d1 = new Date(fromDateStr);
    const d2 = new Date(toDateStr);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  }

  function getAvatarColorClass(index) {
    const colors = ['avatar-blue', 'avatar-pink', 'avatar-green', 'avatar-orange'];
    return colors[index % colors.length];
  }

  function getInitials(name) {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // 4. Load Leaves from Backend API
  async function loadLeaves() {
    const tbody = document.getElementById('leave-table-tbody');
    if (!tbody) return;

    try {
      const res = await fetchApi('/leave');
      if (res && res.success && Array.isArray(res.data)) {
        allLeavesData = res.data;

        // Update live counters
        updateCounters(res.counts);

        // Render current filtered subset
        renderTableRows();
      } else {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="leave-empty-cell">
              <div>No leave requests found.</div>
            </td>
          </tr>
        `;
      }
    } catch (err) {
      console.error('[LeaveApprovals] Error loading leave applications:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="leave-empty-cell" style="color:var(--status-absent);">
            <div>Failed to load leave requests. Please check your network or refresh.</div>
          </td>
        </tr>
      `;
    }
  }

  // 5. Update Tab Badge Counters
  function updateCounters(countsObj) {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    if (countsObj) {
      pending = countsObj.pending ?? 0;
      approved = countsObj.approved ?? 0;
      rejected = countsObj.rejected ?? 0;
    } else {
      allLeavesData.forEach(l => {
        const s = (l.status || '').toUpperCase();
        if (s === 'PENDING') pending++;
        else if (s === 'APPROVED') approved++;
        else if (s === 'REJECTED') rejected++;
      });
    }

    const badgePending = document.getElementById('badge-pending');
    const badgeApproved = document.getElementById('badge-approved');
    const badgeRejected = document.getElementById('badge-rejected');

    if (badgePending) badgePending.textContent = pending;
    if (badgeApproved) badgeApproved.textContent = approved;
    if (badgeRejected) badgeRejected.textContent = rejected;
  }

  // 6. Render Filtered Table Rows
  function renderTableRows() {
    const tbody = document.getElementById('leave-table-tbody');
    const counterLabel = document.getElementById('leave-counter-label');
    if (!tbody) return;

    // Filter by tab status
    let rows = allLeavesData;
    if (currentStatus) {
      rows = rows.filter(r => (r.status || '').toUpperCase() === currentStatus.toUpperCase());
    }

    // Filter by search query
    if (currentSearchQuery) {
      const q = currentSearchQuery.toLowerCase();
      rows = rows.filter(r =>
        (r.student_name && r.student_name.toLowerCase().includes(q)) ||
        (r.official_enrollment_no && r.official_enrollment_no.toLowerCase().includes(q)) ||
        (r.reason && r.reason.toLowerCase().includes(q))
      );
    }

    // Update counter label
    if (counterLabel) {
      counterLabel.textContent = `Showing 1 to ${rows.length} of ${rows.length} requests`;
    }

    if (rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="leave-empty-cell">
            <div>No matching leave requests in this view.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map((l, index) => {
      const avatarColor = getAvatarColorClass(index);
      const initials = getInitials(l.student_name);
      const daysCount = calculateDays(l.from_date, l.to_date);
      const formattedFrom = formatDisplayDate(l.from_date);
      const formattedTo = formatDisplayDate(l.to_date);

      // Category Pill type
      const lType = (l.leave_type || 'Medical').toLowerCase();
      let typeClass = 'type-medical';
      if (lType.includes('personal')) typeClass = 'type-personal';
      else if (lType.includes('emergency')) typeClass = 'type-emergency';
      else if (lType.includes('academic') || lType.includes('official')) typeClass = 'type-academic';

      // Status Badge
      const statusUpper = (l.status || 'PENDING').toUpperCase();
      let statusBadgeHtml = '';
      if (statusUpper === 'PENDING') {
        statusBadgeHtml = `
          <span class="leave-status-badge status-badge-pending">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Pending
          </span>
        `;
      } else if (statusUpper === 'APPROVED') {
        statusBadgeHtml = `
          <span class="leave-status-badge status-badge-approved">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Approved
          </span>
        `;
      } else {
        statusBadgeHtml = `
          <span class="leave-status-badge status-badge-rejected">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Rejected
          </span>
        `;
      }

      // Actions Column
      let actionsHtml = '';
      if (statusUpper === 'PENDING') {
        actionsHtml = `
          <div class="leave-action-buttons">
            <button type="button" class="leave-btn-approve" onclick="decideLeave(${l.id}, 'APPROVED')" title="Approve Leave Application" aria-label="Approve">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <button type="button" class="leave-btn-reject" onclick="openRejectModal(${l.id})" title="Reject Leave Application" aria-label="Reject">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        `;
      } else {
        const noteText = l.review_note ? `title="${escapeHtml(l.review_note)}"` : '';
        actionsHtml = `<span class="leave-reviewed-tag" ${noteText}>Reviewed</span>`;
      }

      const semDisplay = l.semester ? `${l.semester}th Semester` : '3rd Semester';
      const secDisplay = l.section || 'Section A';

      return `
        <tr>
          <td class="td-cb">
            <input type="checkbox" class="leave-row-checkbox" value="${l.id}" aria-label="Select row">
          </td>
          <td class="td-student">
            <div class="student-cell-wrap">
              <div class="student-avatar-circle ${avatarColor}" aria-hidden="true">${initials}</div>
              <div class="student-cell-meta">
                <span class="student-name-text">${escapeHtml(l.student_name || 'Student')}</span>
                <span class="student-roll-text">${escapeHtml(l.official_enrollment_no || '')}</span>
              </div>
            </div>
          </td>
          <td class="td-class">
            <div class="class-cell-wrap">
              <span class="class-sem-text">${semDisplay}</span>
              <span class="class-sec-text">${secDisplay}</span>
            </div>
          </td>
          <td class="td-type">
            <span class="leave-type-pill ${typeClass}">${escapeHtml(l.leave_type || 'Medical')}</span>
          </td>
          <td class="td-dates">
            <div class="date-range-wrap">
              <span class="date-from-text">${formattedFrom}</span>
              <span class="date-to-text">– ${formattedTo}</span>
            </div>
          </td>
          <td class="td-days">${daysCount}</td>
          <td class="td-reason">
            <div class="reason-text" title="${escapeHtml(l.reason || '')}">${escapeHtml(l.reason || 'Leave requested')}</div>
          </td>
          <td class="td-status">${statusBadgeHtml}</td>
          <td class="td-actions">${actionsHtml}</td>
        </tr>
      `;
    }).join('');
  }

  // 7. Tab Switching
  window.filterByStatus = function (status) {
    currentStatus = status;
    document.querySelectorAll('.leave-tab-btn').forEach(btn => {
      const isMatch = btn.getAttribute('data-status') === status;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });
    renderTableRows();
  };

  // 8. Instant Search
  window.handleSearch = function (query) {
    currentSearchQuery = (query || '').trim();
    renderTableRows();
  };

  // 9. Adjudication (Approve)
  window.decideLeave = async function (id, decision, reviewNote = '') {
    try {
      const res = await fetchApi(`/leave/${id}/decision`, {
        method: 'PUT',
        body: JSON.stringify({ decision, review_note: reviewNote })
      });

      if (res && res.success) {
        if (typeof showToast === 'function') {
          showToast(`Leave application ${decision.toLowerCase()} successfully.`, 'success');
        }
        await loadLeaves();
      } else {
        alert(res?.error?.message || 'Could not update leave decision.');
      }
    } catch (err) {
      console.error('[LeaveApprovals] Error updating decision:', err);
      alert('Error updating leave decision. Please try again.');
    }
  };

  // 10. Rejection Modal
  window.openRejectModal = function (id) {
    pendingRejectId = id;
    const modal = document.getElementById('leave-rejection-modal');
    const input = document.getElementById('rejection-note-input');
    if (input) input.value = '';
    if (modal) {
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
    }
  };

  window.closeRejectModal = function () {
    pendingRejectId = null;
    const modal = document.getElementById('leave-rejection-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }
  };

  window.confirmReject = async function () {
    if (!pendingRejectId) return;
    const note = (document.getElementById('rejection-note-input')?.value || '').trim();
    const id = pendingRejectId;
    closeRejectModal();
    await decideLeave(id, 'REJECTED', note);
  };

  // 11. Select All Checkbox
  window.toggleSelectAll = function (masterEl) {
    const checked = masterEl.checked;
    document.querySelectorAll('.leave-row-checkbox').forEach(cb => {
      cb.checked = checked;
    });
  };

  window.toggleAdvancedFilter = function () {
    const input = document.getElementById('leave-search-input');
    if (input) {
      input.focus();
      input.select();
    }
  };

  window.prevPage = function () { };
  window.nextPage = function () { };

  // 12. Helper escaping
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 13. Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initHeroDeptInfo();
    loadLeaves();
  });

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initHeroDeptInfo();
    loadLeaves();
  }

})();
