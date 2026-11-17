/**
 * VIDYAOS FACULTY LEAVE APPROVALS LOGIC (leave-approvals.js)
 * High-performance, lean controller with styled dialog box engine.
 */

(function () {
  'use strict';

  if (typeof guardRoute === 'function') {
    guardRoute({ roles: ['TEACHER', 'HOD'], requireDepartmentFaculty: true });
  }

  let allLeavesData = [];
  let currentStatus = 'PENDING';
  let currentSearchQuery = '';
  let pendingRejectId = null;
  let alertResolve = null;

  const AVATARS = ['avatar-blue', 'avatar-pink', 'avatar-green', 'avatar-orange'];
  const STATUS_MAP = {
    PENDING: { label: 'Pending', cls: 'status-badge-pending', icon: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>' },
    APPROVED: { label: 'Approved', cls: 'status-badge-approved', icon: '<polyline points="20 6 9 17 4 12"></polyline>' },
    REJECTED: { label: 'Rejected', cls: 'status-badge-rejected', icon: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>' }
  };
  const DIALOG_ICONS = {
    success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
    error: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
    warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'
  };

  function initHeroDeptInfo() {
    let u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (!u) {
      try { u = JSON.parse(localStorage.getItem('user') || localStorage.getItem('auth_user') || 'null'); } catch (_) {}
    }
    const dName = document.getElementById('leave-dept-name');
    const dMeta = document.getElementById('leave-dept-meta');
    if (dName && u) dName.textContent = u.department_name || u.department?.name || 'Information Technology';
    if (dMeta && u) dMeta.textContent = `Faculty ID: ${u.employee_id || u.teacher?.employee_id || 'F002'} | Role: ${u.is_hod ? 'HOD' : 'Teacher'}`;
  }

  function formatDisplayDate(s) {
    if (!s || s.startsWith('0000')) return '--';
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
  }

  function calculateDays(from, to) {
    if (!from || !to || from.startsWith('0000') || to.startsWith('0000')) return 1;
    const d1 = new Date(from), d2 = new Date(to);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
    const diff = Math.ceil(Math.abs(d2 - d1) / 86400000) + 1;
    return diff > 0 ? diff : 1;
  }

  function getInitials(name) {
    if (!name) return 'ST';
    const p = name.trim().split(/\s+/).filter(Boolean);
    return (p.length >= 2 ? p[0][0] + p[1][0] : name.substring(0, 2)).toUpperCase();
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  async function loadLeaves() {
    const tbody = document.getElementById('leave-table-tbody');
    if (!tbody) return;
    try {
      const res = await fetchApi('/leave');
      if (res?.success && Array.isArray(res.data)) {
        allLeavesData = res.data;
        updateCounters(res.counts);
        renderTableRows();
      } else {
        tbody.innerHTML = '<tr><td colspan="9" class="leave-empty-cell"><div>No leave requests found.</div></td></tr>';
      }
    } catch (err) {
      console.error('[LeaveApprovals] Error loading applications:', err);
      tbody.innerHTML = '<tr><td colspan="9" class="leave-empty-cell" style="color:var(--status-absent);"><div>Failed to load leave requests. Please check your network or refresh.</div></td></tr>';
    }
  }

  function updateCounters(counts) {
    let p = counts?.pending ?? 0, a = counts?.approved ?? 0, r = counts?.rejected ?? 0;
    if (!counts) {
      p = a = r = 0;
      allLeavesData.forEach(l => {
        const s = (l.status || '').toUpperCase();
        if (s === 'PENDING') p++; else if (s === 'APPROVED') a++; else if (s === 'REJECTED') r++;
      });
    }
    const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setT('badge-pending', p); setT('badge-approved', a); setT('badge-rejected', r);
  }

  function renderTableRows() {
    const tbody = document.getElementById('leave-table-tbody');
    const label = document.getElementById('leave-counter-label');
    if (!tbody) return;

    let rows = allLeavesData;
    if (currentStatus) rows = rows.filter(r => (r.status || '').toUpperCase() === currentStatus.toUpperCase());
    if (currentSearchQuery) {
      const q = currentSearchQuery.toLowerCase();
      rows = rows.filter(r => (r.student_name && r.student_name.toLowerCase().includes(q)) ||
        (r.official_enrollment_no && r.official_enrollment_no.toLowerCase().includes(q)) ||
        (r.reason && r.reason.toLowerCase().includes(q)));
    }

    if (label) label.textContent = `Showing 1 to ${rows.length} of ${rows.length} requests`;
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="leave-empty-cell"><div>No matching leave requests in this view.</div></td></tr>';
      return;
    }

    tbody.innerHTML = rows.map((l, idx) => {
      const avCol = AVATARS[idx % AVATARS.length];
      const initials = getInitials(l.student_name);
      const from = l.from_date || l.start_date;
      const to = l.to_date || l.end_date;
      const days = calculateDays(from, to);
      const lType = (l.leave_type || 'Medical').toLowerCase();
      const typeCls = lType.includes('personal') ? 'type-personal' : lType.includes('emergency') ? 'type-emergency' : (lType.includes('academic') || lType.includes('official')) ? 'type-academic' : 'type-medical';
      const st = STATUS_MAP[(l.status || 'PENDING').toUpperCase()] || STATUS_MAP.PENDING;

      const actions = (l.status || '').toUpperCase() === 'PENDING' ? `
        <div class="leave-action-buttons">
          <button type="button" class="leave-btn-approve" onclick="decideLeave(${l.id}, 'APPROVED')" title="Approve" aria-label="Approve">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Approve</span>
          </button>
          <button type="button" class="leave-btn-reject" onclick="openRejectModal(${l.id})" title="Reject" aria-label="Reject">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            <span>Reject</span>
          </button>
        </div>` : `<span class="leave-reviewed-tag" ${l.review_note ? `title="${escapeHtml(l.review_note)}"` : ''}>Reviewed</span>`;

      return `<tr>
        <td class="td-cb"><input type="checkbox" class="leave-row-checkbox" value="${l.id}" aria-label="Select row"></td>
        <td class="td-student">
          <div class="student-cell-wrap">
            <div class="student-avatar-circle ${avCol}" aria-hidden="true">${initials}</div>
            <div class="student-cell-meta">
              <span class="student-name-text">${escapeHtml(l.student_name || 'Student')}</span>
              <span class="student-roll-text">${escapeHtml(l.official_enrollment_no || '')}</span>
            </div>
          </div>
        </td>
        <td class="td-class">
          <div class="class-cell-wrap">
            <span class="class-sem-text">${l.semester ? `${l.semester}th Semester` : '3rd Semester'}</span>
            <span class="class-sec-text">${escapeHtml(l.section || 'Section A')}</span>
          </div>
        </td>
        <td class="td-type"><span class="leave-type-pill ${typeCls}">${escapeHtml(l.leave_type || 'Medical')}</span></td>
        <td class="td-dates">
          <div class="date-range-wrap">
            <span class="date-from-text">${formatDisplayDate(from)}</span>
            <span class="date-sep">–</span>
            <span class="date-to-text">${formatDisplayDate(to)}</span>
          </div>
          <span class="date-days-pill">${days} ${days === 1 ? 'Day' : 'Days'}</span>
        </td>
        <td class="td-days desktop-only-col">${days}</td>
        <td class="td-reason"><div class="reason-text" title="${escapeHtml(l.reason || '')}">${escapeHtml(l.reason || 'Leave requested')}</div></td>
        <td class="td-status">
          <span class="leave-status-badge ${st.cls}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${st.icon}</svg>
            ${st.label}
          </span>
        </td>
        <td class="td-actions">${actions}</td>
      </tr>`;
    }).join('');
  }

  window.filterByStatus = function (status) {
    currentStatus = status;
    document.querySelectorAll('.leave-tab-btn').forEach(btn => {
      const match = btn.getAttribute('data-status') === status;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
    });
    renderTableRows();
  };

  window.handleSearch = function (q) {
    currentSearchQuery = (q || '').trim();
    renderTableRows();
  };

  /* ── Styled Dialog Box Engine ── */
  window.showLeaveAlert = function ({ title = 'Notice', message = '', type = 'info', confirmText = 'OK', cancelText = null }) {
    return new Promise((resolve) => {
      alertResolve = resolve;
      const modal = document.getElementById('leave-alert-modal');
      const titleEl = document.getElementById('alert-modal-title');
      const msgEl = document.getElementById('alert-modal-message');
      const iconBox = document.getElementById('leave-alert-icon-box');
      const actionsEl = document.getElementById('leave-alert-actions');

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (iconBox) {
        iconBox.className = 'leave-alert-icon-box alert-icon-' + type;
        iconBox.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${DIALOG_ICONS[type] || DIALOG_ICONS.info}</svg>`;
      }
      if (actionsEl) {
        actionsEl.innerHTML = cancelText ? `
          <button type="button" class="btn btn-secondary leave-alert-btn" onclick="closeLeaveAlert(false)">${escapeHtml(cancelText)}</button>
          <button type="button" class="btn btn-primary leave-alert-btn" onclick="closeLeaveAlert(true)">${escapeHtml(confirmText)}</button>` :
          `<button type="button" class="btn btn-primary leave-alert-btn" onclick="closeLeaveAlert(true)">${escapeHtml(confirmText)}</button>`;
      }
      if (modal) { modal.style.display = 'flex'; modal.setAttribute('aria-hidden', 'false'); }
    });
  };

  window.closeLeaveAlert = function (result = false) {
    const modal = document.getElementById('leave-alert-modal');
    if (modal) { modal.style.display = 'none'; modal.setAttribute('aria-hidden', 'true'); }
    if (alertResolve) { alertResolve(result); alertResolve = null; }
  };

  window.decideLeave = async function (id, decision, reviewNote = '') {
    if (decision === 'APPROVED') {
      const ok = await showLeaveAlert({
        title: 'Approve Leave Request',
        message: 'Are you sure you want to approve this student leave application?',
        type: 'info', confirmText: 'Approve', cancelText: 'Cancel'
      });
      if (!ok) return;
    }

    try {
      const res = await fetchApi(`/leave/${id}/decision`, {
        method: 'PUT',
        body: JSON.stringify({ decision, review_note: reviewNote })
      });
      if (res?.success) {
        if (typeof showToast === 'function') showToast(`Leave application ${decision.toLowerCase()} successfully.`, 'success');
        await loadLeaves();
      } else {
        await showLeaveAlert({ title: 'Action Failed', message: res?.error?.message || 'Could not update leave decision.', type: 'error', confirmText: 'Dismiss' });
      }
    } catch (err) {
      console.error('[LeaveApprovals] Update error:', err);
      await showLeaveAlert({ title: 'System Error', message: err?.message || 'Error updating decision. Please try again.', type: 'error', confirmText: 'OK' });
    }
  };

  window.openRejectModal = function (id) {
    pendingRejectId = id;
    const modal = document.getElementById('leave-rejection-modal');
    const input = document.getElementById('rejection-note-input');
    if (input) input.value = '';
    if (modal) { modal.style.display = 'flex'; modal.setAttribute('aria-hidden', 'false'); }
  };

  window.closeRejectModal = function () {
    pendingRejectId = null;
    const modal = document.getElementById('leave-rejection-modal');
    if (modal) { modal.style.display = 'none'; modal.setAttribute('aria-hidden', 'true'); }
  };

  window.confirmReject = async function () {
    if (!pendingRejectId) return;
    const note = (document.getElementById('rejection-note-input')?.value || '').trim();
    const id = pendingRejectId;
    closeRejectModal();
    await decideLeave(id, 'REJECTED', note);
  };

  window.toggleSelectAll = function (el) {
    document.querySelectorAll('.leave-row-checkbox').forEach(cb => cb.checked = el.checked);
  };

  window.toggleAdvancedFilter = function () {
    const inp = document.getElementById('leave-search-input');
    if (inp) { inp.focus(); inp.select(); }
  };

  window.prevPage = function () {};
  window.nextPage = function () {};

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const a = document.getElementById('leave-alert-modal');
      if (a && a.style.display !== 'none') return closeLeaveAlert(false);
      const r = document.getElementById('leave-rejection-modal');
      if (r && r.style.display !== 'none') closeRejectModal();
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target?.classList?.contains('leave-modal-backdrop')) {
      if (e.target.id === 'leave-alert-modal') closeLeaveAlert(false);
      else if (e.target.id === 'leave-rejection-modal') closeRejectModal();
    }
  });

  const init = () => { initHeroDeptInfo(); loadLeaves(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
