/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS STUDENTS MANAGEMENT CONTROLLER (students.js)
 * Clean, Compact, Minimal, Mobile-First
 * PC: RollNo, Enrollment, Student Name, Actions (3-Dot Menu)
 * Mobile: RollNo, Student Name, Actions (Zero Horizontal Overflow)
 * Includes 30-Day Trash Bin & Safe Student Recovery System
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // Auth Gate
  if (typeof requireFacultyAuth === 'function') {
    requireFacultyAuth(['TEACHER', 'HOD', 'SYSTEM_ADMIN']);
  } else if (typeof guardRoute === 'function') {
    guardRoute({ roles: ['TEACHER', 'HOD', 'SYSTEM_ADMIN'] });
  }

  let allStudents = [];
  let pendingStudents = [];
  let trashStudents = [];
  let selectedTrashIds = new Set();
  let currentYearFilter = 'ALL';
  let studentRegOpen = false;
  let currentDetailStudentId = null;

  const esc = (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  const notify = (msg, type = 'info') => {
    if (typeof showToast === 'function') showToast(msg, type);
    else alert(msg);
  };

  function getInitials(name) {
    if (!name) return 'ST';
    const clean = name.replace(/^(mr\.|ms\.|mrs\.)\s+/i, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase() || 'ST';
  }

  function formatEnrollmentDisplay(val, status, isHtml = true) {
    const hasVal = Boolean(val && String(val).trim() !== '' && String(val).trim() !== '—');
    const isUnassigned = !hasVal || status === 'Not Assigned';
    if (isUnassigned) {
      return isHtml ? '<span class="stu-badge-unassigned">Not Assigned</span>' : 'Not Assigned';
    }
    return isHtml ? `<span class="stu-code-mono">${esc(val)}</span>` : esc(val);
  }

  function formatRegistrationDisplay(val, isHtml = true) {
    const hasVal = Boolean(val && String(val).trim() !== '' && String(val).trim() !== '—');
    if (!hasVal) {
      return isHtml ? '<span class="stu-sub-mono" style="color:var(--text-muted);">—</span>' : '—';
    }
    return isHtml ? `<span class="stu-code-mono">${esc(val)}</span>` : esc(val);
  }

  async function api(url, opts = {}) {
    if (typeof fetchApi === 'function') return await fetchApi(url, opts);
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const res = await fetch(`/api/v1${url}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(opts.headers || {})
      }
    });
    return await res.json();
  }

  // 1. Initial Load
  async function init() {
    setupEventListeners();
    await Promise.all([
      loadStudentsRoster(),
      loadPendingStudents(),
      loadTrashStudents(),
      loadRegistrationStatus()
    ]);
  }

  // 2. Fetch Data
  async function loadStudentsRoster() {
    try {
      let res = await api('/hod/students-roster');
      if (!res || !res.success) {
        res = await api('/faculty/my-students');
      }

      if (res && res.success && Array.isArray(res.data)) {
        allStudents = res.data;
        updateCounts();
        if (currentYearFilter !== 'PENDING' && currentYearFilter !== 'TRASH') renderTable();
      }
    } catch (err) {
      console.error('[Students] Failed to load student roster:', err);
    }
  }

  async function loadPendingStudents() {
    try {
      const res = await api('/hod/registrations/pending-students');
      if (res && res.success && Array.isArray(res.data)) {
        pendingStudents = res.data;
        updateCounts();
        if (currentYearFilter === 'PENDING') renderTable();
      }
    } catch (_) { }
  }

  async function loadTrashStudents() {
    try {
      const res = await api('/hod/trash/students');
      if (res && res.success && Array.isArray(res.data)) {
        trashStudents = res.data;
      } else {
        trashStudents = [];
      }
      updateCounts();
      if (currentYearFilter === 'TRASH') renderTable();
    } catch (_) {
      trashStudents = [];
      updateCounts();
    }
  }

  async function loadRegistrationStatus() {
    try {
      const res = await api('/hod/student-registration-status');
      if (res && res.success && res.data) {
        studentRegOpen = Boolean(res.data.is_open);
        renderToggleState();
      }
    } catch (_) { }
  }

  function renderToggleState() {
    const toggleEl = document.getElementById('toggle-student-reg');
    const badgeEl = document.getElementById('badge-toggle-student-status');
    if (toggleEl) toggleEl.checked = studentRegOpen;
    if (badgeEl) {
      badgeEl.className = `status-badge-toggle ${studentRegOpen ? 'open' : 'closed'}`;
      badgeEl.textContent = studentRegOpen ? 'OPEN' : 'CLOSED';
    }
  }

  async function toggleRegistration(checked) {
    try {
      const res = await api('/hod/student-registration-toggle', {
        method: 'POST',
        body: JSON.stringify({ is_open: checked })
      });
      if (res && res.success) {
        studentRegOpen = checked;
        renderToggleState();
        notify(`Student self-registration is now ${checked ? 'OPEN' : 'CLOSED'}`, 'success');
      } else {
        throw new Error(res?.error?.message || 'Toggle failed');
      }
    } catch (err) {
      notify(err.message, 'error');
      renderToggleState();
    }
  }

  function updateCounts() {
    const elTotal = document.getElementById('stat-total-students');
    const elDefaulter = document.getElementById('stat-defaulter-students');
    const elPending = document.getElementById('stat-pending-students');
    const badgeAll = document.getElementById('badge-count-all');
    const badgePending = document.getElementById('badge-count-pending');
    const badgeTrash = document.getElementById('badge-count-trash');
    const badgeInactive = document.getElementById('badge-count-inactive');
    const headerTrash = document.getElementById('header-trash-count');

    const total = allStudents.length;
    const enrolledStudents = allStudents.filter(s => (s.enrollment_status || 'ENROLLED') === 'ENROLLED');
    const inactiveStudents = allStudents.filter(s => s.enrollment_status === 'TRANSFERRED' || s.enrollment_status === 'WITHDRAWN' || s.enrollment_status === 'INACTIVE');
    const defaulters = enrolledStudents.filter(s => s.is_defaulter || s.below_threshold).length;
    const pending = pendingStudents.length;
    const trash = trashStudents.length;

    if (elTotal) elTotal.textContent = enrolledStudents.length;
    if (elDefaulter) elDefaulter.textContent = `${defaulters} below 75%`;
    if (elPending) elPending.textContent = pending;
    if (badgeAll) badgeAll.textContent = total;
    if (badgeInactive) badgeInactive.textContent = inactiveStudents.length;
    if (badgePending) badgePending.textContent = pending;
    if (badgeTrash) badgeTrash.textContent = trash;
    if (headerTrash) headerTrash.textContent = trash;

    // Update Year Pill Counts (Enrolled)
    const currentDept = allStudents[0]?.department_name || allStudents[0]?.department_code || '';
    const isPharma = isPharmaDept(currentDept);
    const maxYear = isPharma ? 2 : 3;

    const y3Pill = document.querySelector('.stu-pill[data-year="3"]');
    if (y3Pill) {
      y3Pill.style.display = isPharma ? 'none' : '';
    }

    for (let yr = 1; yr <= maxYear; yr++) {
      const badgeYr = document.getElementById(`badge-count-y${yr}`);
      if (badgeYr) {
        const c = enrolledStudents.filter(s => parseInt(s.year || Math.ceil((s.semester || 1) / 2), 10) === yr).length;
        badgeYr.textContent = c;
      }
    }
  }

  // 3. Switch Tabs
  function switchToPendingTab() {
    document.querySelectorAll('.stu-pill').forEach(b => b.classList.remove('active'));
    const pill = document.getElementById('pill-pending');
    if (pill) pill.classList.add('active');
    currentYearFilter = 'PENDING';
    renderTable();
  }

  function switchToTrashTab() {
    document.querySelectorAll('.stu-pill').forEach(b => b.classList.remove('active'));
    const pill = document.getElementById('pill-trash');
    if (pill) pill.classList.add('active');
    currentYearFilter = 'TRASH';
    renderTable();
  }

  // 4. Render Table (Minimal: PC = Avatar, RollNo, RegNo, Enrollment, Student Name, Actions)
  function renderTable() {
    const tbody = document.getElementById('students-tbody');
    const searchVal = (document.getElementById('student-search')?.value || '').toLowerCase().trim();

    if (!tbody) return;

    // Toggle table header based on Trash mode
    const isTrash = currentYearFilter === 'TRASH';
    const thRetention = document.getElementById('th-retention');
    const thEnrollment = document.getElementById('th-enrollment');
    const thReg = document.getElementById('th-reg');
    const thTrashCheck = document.getElementById('th-trash-check');
    const thActions = document.getElementById('th-actions');
    const theadTr = document.getElementById('stu-thead-tr');

    if (theadTr) theadTr.classList.toggle('trash-active', isTrash);
    if (thRetention) thRetention.style.display = isTrash ? '' : 'none';
    if (thEnrollment) thEnrollment.style.display = isTrash ? 'none' : '';
    if (thReg) thReg.style.display = isTrash ? 'none' : '';
    if (thTrashCheck) thTrashCheck.style.display = isTrash ? '' : 'none';
    if (thActions) thActions.style.width = isTrash ? '150px' : '65px';

    updateTrashBulkBar();

    if (isTrash) {
      renderTrashTable(tbody, searchVal);
      return;
    }

    if (currentYearFilter === 'PENDING') {
      renderPendingTable(tbody, searchVal);
      return;
    }

    let list = allStudents;

    // Tab Filters
    if (currentYearFilter === 'INACTIVE') {
      list = list.filter(s => s.enrollment_status === 'TRANSFERRED' || s.enrollment_status === 'WITHDRAWN' || s.enrollment_status === 'INACTIVE');
    } else if (currentYearFilter !== 'ALL') {
      const targetYr = parseInt(currentYearFilter, 10);
      list = list.filter(s => {
        const isEnrolled = (s.enrollment_status || 'ENROLLED') === 'ENROLLED';
        const y = parseInt(s.year || Math.ceil((s.semester || 1) / 2), 10);
        return isEnrolled && y === targetYr;
      });
    }

    // Live search
    if (searchVal) {
      list = list.filter(s =>
        (s.full_name || '').toLowerCase().includes(searchVal) ||
        String(s.class_roll_no || s.roll_number || '').includes(searchVal) ||
        (s.ubter_roll_no || s.official_enrollment_no || '').toLowerCase().includes(searchVal) ||
        (s.registration_no || '').toLowerCase().includes(searchVal) ||
        (s.email || '').toLowerCase().includes(searchVal)
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            No students found matching current filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((st, idx) => {
      const roll = st.class_roll_no || st.roll_number || (idx + 1);
      const enrollFormatted = formatEnrollmentDisplay(st.ubter_roll_no || st.official_enrollment_no, st.enrollment_no_status, true);
      const regFormatted = formatRegistrationDisplay(st.registration_no, true);
      const name = st.full_name || 'Student';
      const studentId = st.student_id || st.id;
      const isInactive = st.enrollment_status === 'TRANSFERRED' || st.enrollment_status === 'WITHDRAWN';
      const initials = getInitials(name);
      const avatarContent = st.profile_photo
        ? `<img src="${esc(st.profile_photo)}" alt="${esc(name)}" class="stu-avatar-img" onerror="this.parentElement.textContent='${initials}'">`
        : initials;

      let statusChip = '';
      if (st.enrollment_status === 'TRANSFERRED') {
        statusChip = `<span class="stu-status-chip transferred">Transferred</span>`;
      } else if (st.enrollment_status === 'WITHDRAWN') {
        statusChip = `<span class="stu-status-chip withdrawn">Withdrawn</span>`;
      }

      return `
        <tr class="stu-table-row" onclick="viewStudentDetails(${studentId})" style="cursor: pointer;">
          <td class="col-avatar" style="text-align: center;">
            <div class="stu-avatar" title="View ${esc(name)}'s Dossier">
              ${avatarContent}
            </div>
          </td>
          <td class="col-roll"><span class="stu-roll-badge">${roll}</span></td>
          <td class="col-reg">${regFormatted}</td>
          <td class="col-enrollment">${enrollFormatted}</td>
          <td class="col-name">
            <div class="stu-name-wrap">
              <div class="stu-desktop-name-row">
                <a href="#" class="stu-name-cell" onclick="viewStudentDetails(${studentId}); return false;">${esc(name)}</a>
                ${statusChip}
              </div>
              <div class="stu-mobile-card-details">
                <div class="stu-mobile-name-row">
                  <span class="stu-roll-badge-mobile">#${roll}</span>
                  <span class="stu-name-mobile">${esc(name)}</span>
                  ${statusChip}
                </div>
                <div class="stu-mobile-sub-row">
                  ${st.official_enrollment_no ? `<span class="stu-meta-code">${esc(st.official_enrollment_no)}</span>` : (st.registration_no ? `<span class="stu-meta-code">${esc(st.registration_no)}</span>` : '<span class="stu-meta-code pending">Roll Pending</span>')}
                  <span class="stu-meta-dot">&bull;</span>
                  <span class="stu-meta-sem">Sem ${st.semester || (st.year ? (st.year * 2 - 1) : 1)}</span>
                </div>
              </div>
            </div>
          </td>
          <td onclick="event.stopPropagation()">
            <div class="stu-actions-cell">
              <div class="stu-menu-wrap">
                <button type="button" class="btn-kebab" title="Actions" onclick="toggleStudentMenu(event, ${studentId})">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                    <circle cx="12" cy="19" r="2"></circle>
                  </svg>
                </button>
                <div class="stu-dropdown-menu" id="stu-menu-${studentId}">
                  <button type="button" class="stu-menu-item" onclick="viewStudentDetails(${studentId})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <span>View Details</span>
                  </button>
                  <button type="button" class="stu-menu-item" onclick="openEditStudentModal(${studentId})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    <span>Edit Student</span>
                  </button>
                  ${isInactive ? `
                  <button type="button" class="stu-menu-item" onclick="reactivateStudentAction(${studentId}, '${esc(name)}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                    <span>Re-Activate</span>
                  </button>
                  ` : `
                  <button type="button" class="stu-menu-item" onclick="transferStudentAction(${studentId}, '${esc(name)}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                    <span>Transfer Student</span>
                  </button>
                  <button type="button" class="stu-menu-item" onclick="withdrawStudentAction(${studentId}, '${esc(name)}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                    <span>Withdraw Student</span>
                  </button>
                  `}
                  <button type="button" class="stu-menu-item" onclick="resetStudentPassword(${studentId}, '${esc(name)}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    <span>Reset Password</span>
                  </button>
                  <button type="button" class="stu-menu-item danger" onclick="deleteStudentMember(${studentId}, '${esc(name)}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span>Remove Student</span>
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 5. Render Trash Bin Roster (30-day retention & restore action)
  function renderTrashTable(tbody, searchVal) {
    let list = trashStudents;
    if (searchVal) {
      list = list.filter(s =>
        (s.full_name || '').toLowerCase().includes(searchVal) ||
        String(s.class_roll_no || '').includes(searchVal) ||
        (s.ubter_roll_no || s.official_enrollment_no || '').toLowerCase().includes(searchVal) ||
        (s.email || '').toLowerCase().includes(searchVal)
      );
    }

    const masterCheck = document.getElementById('check-all-trash');

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            No students currently in the Trash Bin.
          </td>
        </tr>
      `;
      if (masterCheck) {
        masterCheck.checked = false;
        masterCheck.disabled = true;
      }
      return;
    }

    if (masterCheck) {
      masterCheck.disabled = false;
      const allSelected = list.length > 0 && list.every(s => selectedTrashIds.has(Number(s.student_id || s.id)));
      masterCheck.checked = allSelected;
    }

    tbody.innerHTML = list.map((st, idx) => {
      const roll = st.class_roll_no || (idx + 1);
      const enroll = st.official_enrollment_no || '—';
      const name = st.full_name || 'Student';
      const daysLeft = st.days_left != null ? st.days_left : 30;
      const studentId = Number(st.student_id || st.id);
      const isChecked = selectedTrashIds.has(studentId);
      const initials = getInitials(name);
      const avatarContent = st.profile_photo
        ? `<img src="${esc(st.profile_photo)}" alt="${esc(name)}" class="stu-avatar-img" onerror="this.parentElement.textContent='${initials}'">`
        : initials;

      return `
        <tr class="${isChecked ? 'row-selected' : ''}">
          <td style="width: 38px; text-align: center;">
            <input type="checkbox" class="stu-checkbox trash-row-check" data-id="${studentId}" ${isChecked ? 'checked' : ''} onchange="toggleTrashSelect(${studentId}, this.checked)">
          </td>
          <td class="col-avatar" style="text-align: center;">
            <div class="stu-avatar" style="opacity: 0.8; cursor: pointer;" onclick="viewStudentDetails(${studentId})" title="View ${esc(name)}">
              ${avatarContent}
            </div>
          </td>
          <td class="col-roll"><span class="stu-roll-badge" style="opacity: 0.7;">${roll}</span></td>
          <td class="col-name">
            <div class="stu-name-wrap">
              <span class="stu-name-cell" style="color: var(--text-main); font-weight: 700;">${esc(name)}</span>
              <div class="stu-trash-sub">
                <span>${esc(enroll)}</span>
                &bull;
                <span class="badge-retention-mobile">${daysLeft}d left</span>
              </div>
            </div>
          </td>
          <td class="col-retention">
            <span class="badge-retention">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>${daysLeft} days left</span>
            </span>
          </td>
          <td style="text-align: right;">
            <div class="stu-actions-cell" style="display: flex; gap: 0.4rem; justify-content: flex-end;">
              <button type="button" class="btn-restore-compact" onclick="confirmSingleRestore(${studentId}, '${esc(name)}')" title="Restore student to active roster">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                <span>Restore</span>
              </button>
              <button type="button" class="btn-delete-compact" onclick="confirmSinglePermanentDelete(${studentId}, '${esc(name)}')" title="Permanently delete from database">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span>Delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 6. Render Pending Applications
  function renderPendingTable(tbody, searchVal) {
    let list = pendingStudents;
    if (searchVal) {
      list = list.filter(r =>
        (r.full_name || '').toLowerCase().includes(searchVal) ||
        (r.official_enrollment_no || '').toLowerCase().includes(searchVal) ||
        (r.email || '').toLowerCase().includes(searchVal)
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            No pending student enrollment applications in queue.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(req => {
      const name = req.full_name || 'Applicant';
      const initials = getInitials(name);
      const reg = req.registration_no || req.ubter_reg_no || '';
      const regFormatted = formatRegistrationDisplay(reg, true);

      return `
      <tr>
        <td class="col-avatar" style="text-align: center;">
          <div class="stu-avatar">${initials}</div>
        </td>
        <td class="col-roll"><span class="stu-roll-badge">—</span></td>
        <td class="col-reg">${regFormatted}</td>
        <td class="col-enrollment"><span class="stu-code-mono">${esc(req.official_enrollment_no || 'APPLICANT')}</span></td>
        <td class="col-name">
          <div class="stu-name-wrap">
            <div class="stu-desktop-name-row">
              <strong class="stu-name-cell">${esc(req.full_name)}</strong>
              <span class="stu-sub-mono" style="margin-left: 0.35rem; font-size: 0.72rem; color: var(--text-muted);">${esc(req.email)} &bull; Year ${esc(req.year || 1)}</span>
            </div>
            <div class="stu-mobile-card-details">
              <div class="stu-mobile-name-row">
                <span class="stu-name-mobile">${esc(req.full_name)}</span>
              </div>
              <div class="stu-mobile-sub-row">
                <span class="stu-meta-code">${esc(req.official_enrollment_no || req.email || 'Pending')}</span>
                <span class="stu-meta-dot">&bull;</span>
                <span class="stu-meta-sem">Year ${esc(req.year || 1)}</span>
              </div>
            </div>
          </div>
        </td>
        <td style="text-align: right;">
          <div class="stu-actions-cell" style="gap: 0.35rem;">
            <button type="button" class="btn-stu-compact" style="padding: 0.25rem 0.55rem; font-size: 0.74rem;" onclick="approveStudentRequest(${req.id}, '${esc(req.official_enrollment_no || '')}', this)">Approve</button>
            <button type="button" class="btn-kebab" style="color: var(--status-absent);" title="Reject" onclick="rejectStudentRequest(${req.id}, this)">&times;</button>
          </div>
        </td>
      </tr>
    `}).join('');
  }

  // 7. 3-Dot Dropdown Menu Handlers with Auto Drop-Up Flipping
  function toggleStudentMenu(e, id) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const menu = document.getElementById(`stu-menu-${id}`);
    const btn = e.currentTarget || e.target.closest('.btn-kebab');
    const isAlreadyOpen = menu?.classList.contains('show');
    closeAllMenus();

    if (menu && !isAlreadyOpen) {
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 175) {
          menu.classList.add('drop-up');
        } else {
          menu.classList.remove('drop-up');
        }
      }
      menu.classList.add('show');
    }
  }

  function closeAllMenus() {
    document.querySelectorAll('.stu-dropdown-menu.show').forEach(m => m.classList.remove('show'));
  }

  // 8. View Student Dossier Modal
  function isPharmaDept(deptName) {
    const name = String(deptName || '').toLowerCase();
    return name.includes('pharm') || name.includes('d.pharm') || name.includes('d-pharm');
  }

  function updateSemesterOptions(selectEl, deptName, selectedVal) {
    if (!selectEl) return;
    const isPharma = isPharmaDept(deptName);
    const maxSem = isPharma ? 4 : 6;
    let html = '';
    for (let sem = 1; sem <= maxSem; sem++) {
      const yr = Math.ceil(sem / 2);
      const isSel = String(sem) === String(selectedVal) ? 'selected' : '';
      html += `<option value="${sem}" ${isSel}>Sem ${sem} (Year ${yr})</option>`;
    }
    selectEl.innerHTML = html;
    if (selectedVal && Number(selectedVal) <= maxSem) {
      selectEl.value = String(selectedVal);
    }
  }

  function switchDetailTab(tabName) {
    document.querySelectorAll('#detail-modal-tabs .stu-modal-tab').forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    const panels = ['profile', 'academic', 'attendance', 'contact'];
    panels.forEach(p => {
      const panelEl = document.getElementById(`detail-tab-${p}`);
      if (panelEl) {
        if (p === tabName) {
          panelEl.style.display = 'flex';
          panelEl.classList.add('active');
        } else {
          panelEl.style.display = 'none';
          panelEl.classList.remove('active');
        }
      }
    });
  }

  // ── Unified Student Profile & Edit Modal (Single Modal Architecture) ──
  function setStudentModalEditMode(isEdit) {
    const modal = document.getElementById('modal-student-details');
    if (!modal) return;

    const prefixEl = document.getElementById('detail-modal-mode-prefix');
    if (prefixEl) {
      prefixEl.textContent = isEdit ? 'Edit Student Profile:' : 'Student Profile:';
    }

    // Toggle view vs edit elements
    modal.querySelectorAll('.stu-view-mode').forEach(el => {
      el.style.display = isEdit ? 'none' : '';
    });
    modal.querySelectorAll('.stu-edit-mode').forEach(el => {
      el.style.display = isEdit ? '' : 'none';
    });
    modal.querySelectorAll('.stu-edit-indicator').forEach(el => {
      el.style.display = isEdit ? 'inline' : 'none';
    });

    const footerView = document.getElementById('stu-footer-view');
    const footerEdit = document.getElementById('stu-footer-edit');
    if (footerView) footerView.style.display = isEdit ? 'none' : 'flex';
    if (footerEdit) footerEdit.style.display = isEdit ? 'flex' : 'none';

    const alertBox = document.getElementById('edit-stu-alert');
    if (alertBox) { alertBox.style.display = 'none'; alertBox.textContent = ''; }
    const enrollErr = document.getElementById('edit-stu-enroll-error');
    if (enrollErr) enrollErr.textContent = '';
    const rollErr = document.getElementById('edit-stu-roll-error');
    if (rollErr) rollErr.textContent = '';

    if (isEdit) {
      switchDetailTab('profile');
      document.getElementById('edit-stu-name')?.focus();
    }
  }

  function viewStudentDetails(id, startInEdit = false) {
    closeAllMenus();
    const st = allStudents.find(s => (s.student_id || s.id) === id);
    if (!st) {
      notify('Student record not found.', 'danger');
      return;
    }

    currentDetailStudentId = id;
    const modal = document.getElementById('modal-student-details');
    if (!modal) return;

    const roll = (st.class_roll_no != null && String(st.class_roll_no) !== '') ? String(st.class_roll_no) : (st.roll_number != null ? String(st.roll_number) : '—');
    const yr = st.year || (st.semester ? Math.ceil(st.semester / 2) : 1);
    const sem = st.semester ? `Sem ${st.semester}` : '';
    const pct = typeof st.attendance_pct === 'number' ? `${st.attendance_pct.toFixed(0)}%` : '100%';
    const initials = getInitials(st.full_name);
    const isPharma = isPharmaDept(st.department_name || st.department_code);

    // Common header / avatar
    document.getElementById('detail-stu-avatar').textContent = initials;
    document.getElementById('detail-stu-name').textContent = st.full_name || 'Student';

    // View mode display values
    const displayNameEl = document.getElementById('detail-stu-display-name');
    if (displayNameEl) displayNameEl.textContent = st.full_name || '—';

    document.getElementById('detail-stu-roll').textContent = roll;
    document.getElementById('detail-stu-cohort').textContent = sem ? `${sem} (Year ${yr})` : `Year ${yr}`;

    const academicCohortEl = document.getElementById('detail-academic-cohort');
    if (academicCohortEl) academicCohortEl.textContent = `Year ${yr} • ${sem || 'Sem ' + (yr * 2 - 1)}`;

    const progEl = document.getElementById('detail-academic-prog');
    if (progEl) progEl.textContent = isPharma ? '2-Year Pharmacy Diploma (D.Pharm)' : '3-Year Polytechnic Engineering Diploma';

    const enrollEl = document.getElementById('detail-stu-enroll');
    if (enrollEl) {
      const enrollVal = st.ubter_roll_no || st.official_enrollment_no;
      if (enrollVal && String(enrollVal).trim() !== '' && st.enrollment_no_status !== 'Not Assigned') {
        enrollEl.innerHTML = `<span style="font-family: var(--font-family-mono); color: var(--color-primary); font-weight: 700;">${esc(enrollVal)}</span>`;
      } else {
        enrollEl.innerHTML = `<span class="stu-badge-unassigned">Not Assigned</span>`;
      }
    }

    document.getElementById('detail-stu-reg').textContent = st.registration_no || '—';
    document.getElementById('detail-stu-att').textContent = pct;
    const attStatusEl = document.getElementById('detail-att-status');
    if (attStatusEl) {
      const numPct = typeof st.attendance_pct === 'number' ? st.attendance_pct : 100;
      attStatusEl.textContent = numPct >= 75 ? 'Regular (Good Standing)' : 'At Risk (< 75% Threshold)';
    }

    document.getElementById('detail-stu-dept').textContent = st.department_name || st.department_code || 'Information Technology';
    document.getElementById('detail-stu-email').textContent = st.email || '—';
    document.getElementById('detail-stu-phone').textContent = st.phone || '—';

    // Status badge (view mode)
    const statusBadge = document.getElementById('detail-stu-status-badge');
    const isInactive = st.enrollment_status === 'TRANSFERRED' || st.enrollment_status === 'WITHDRAWN';
    if (statusBadge) {
      if (st.enrollment_status === 'TRANSFERRED') {
        statusBadge.className = 'stu-compact-display-val transferred stu-view-mode';
        statusBadge.textContent = 'Transferred';
      } else if (st.enrollment_status === 'WITHDRAWN') {
        statusBadge.className = 'stu-compact-display-val withdrawn stu-view-mode';
        statusBadge.textContent = 'Withdrawn';
      } else {
        statusBadge.className = 'stu-compact-display-val enrolled stu-view-mode';
        statusBadge.textContent = 'Enrolled (Active)';
      }
    }

    // Toggle view footer action buttons
    const btnTransfer = document.getElementById('detail-btn-transfer');
    const btnWithdraw = document.getElementById('detail-btn-withdraw');
    const btnReactivate = document.getElementById('detail-btn-reactivate');
    if (btnTransfer) btnTransfer.style.display = isInactive ? 'none' : '';
    if (btnWithdraw) btnWithdraw.style.display = isInactive ? 'none' : '';
    if (btnReactivate) btnReactivate.style.display = isInactive ? '' : 'none';

    // Populate Edit Inputs
    document.getElementById('edit-stu-id').value = id;
    const nameInput = document.getElementById('edit-stu-name');
    if (nameInput) nameInput.value = st.full_name || '';

    const statusSelect = document.getElementById('edit-stu-status');
    if (statusSelect) {
      if (st.is_active === 0 || st.is_active === false) {
        statusSelect.value = (st.status === 'Withdrawn' || st.enrollment_status === 'Withdrawn') ? 'Withdrawn' : 'Transferred';
      } else {
        statusSelect.value = 'Active';
      }
    }

    const chkNotAvail = document.getElementById('edit-chk-enroll-not-available');
    const enrollInput = document.getElementById('edit-stu-enroll');
    const enrollReq = document.getElementById('edit-stu-enroll-req');
    const enrollHint = document.getElementById('edit-stu-enroll-hint');

    const curEnrollVal = st.ubter_roll_no || st.official_enrollment_no;
    const isUnassigned = !curEnrollVal || st.enrollment_no_status === 'Not Assigned';
    if (chkNotAvail) chkNotAvail.checked = isUnassigned;

    if (isUnassigned) {
      if (enrollInput) {
        enrollInput.value = '';
        enrollInput.disabled = true;
        enrollInput.placeholder = 'Not Assigned';
        enrollInput.removeAttribute('required');
      }
      if (enrollReq) enrollReq.style.display = 'none';
      if (enrollHint) enrollHint.textContent = 'UBTER roll number status is set to "Not Assigned".';
    } else {
      if (enrollInput) {
        enrollInput.value = curEnrollVal;
        enrollInput.disabled = false;
        enrollInput.placeholder = '11-digit numeric UBTER roll no';
        enrollInput.setAttribute('required', 'required');
      }
      if (enrollReq) enrollReq.style.display = 'inline';
      if (enrollHint) enrollHint.textContent = 'Enter exactly 11 numeric digits (0–9).';
    }

    const regInput = document.getElementById('edit-stu-reg');
    if (regInput) regInput.value = st.registration_no || '';

    const rollInput = document.getElementById('edit-stu-roll');
    if (rollInput) rollInput.value = (st.class_roll_no != null && String(st.class_roll_no) !== '') ? String(st.class_roll_no) : (st.roll_number != null ? String(st.roll_number) : '');

    const semSelect = document.getElementById('edit-stu-sem');
    if (semSelect) {
      const semVal = st.semester || (st.year ? st.year * 2 - 1 : 1);
      updateSemesterOptions(semSelect, st.department_name || st.department_code, semVal);
    }

    setStudentModalEditMode(Boolean(startInEdit));
    switchDetailTab('profile');
    modal.style.display = 'flex';
  }

  function closeStudentDetailsModal() {
    const modal = document.getElementById('modal-student-details');
    if (modal) modal.style.display = 'none';
    currentDetailStudentId = null;
  }

  function detailEditStudent() {
    setStudentModalEditMode(true);
  }

  function openEditStudentModal(id) {
    viewStudentDetails(id, true);
  }

  function closeEditStudentModal() {
    closeStudentDetailsModal();
  }

  function detailResetPassword() {
    if (!currentDetailStudentId) return;
    const st = allStudents.find(s => (s.student_id || s.id) === currentDetailStudentId);
    resetStudentPassword(currentDetailStudentId, st?.full_name || 'Student');
  }

  function detailDeleteStudent() {
    if (!currentDetailStudentId) return;
    const st = allStudents.find(s => (s.student_id || s.id) === currentDetailStudentId);
    deleteStudentMember(currentDetailStudentId, st?.full_name || 'Student');
    closeStudentDetailsModal();
  }

  function detailTransferStudent() {
    if (!currentDetailStudentId) return;
    const st = allStudents.find(s => (s.student_id || s.id) === currentDetailStudentId);
    transferStudentAction(currentDetailStudentId, st?.full_name || 'Student');
    closeStudentDetailsModal();
  }

  function detailWithdrawStudent() {
    if (!currentDetailStudentId) return;
    const st = allStudents.find(s => (s.student_id || s.id) === currentDetailStudentId);
    withdrawStudentAction(currentDetailStudentId, st?.full_name || 'Student');
    closeStudentDetailsModal();
  }

  function detailReactivateStudent() {
    if (!currentDetailStudentId) return;
    const st = allStudents.find(s => (s.student_id || s.id) === currentDetailStudentId);
    reactivateStudentAction(currentDetailStudentId, st?.full_name || 'Student');
    closeStudentDetailsModal();
  }

  // 9. Actions: Reset, Transfer, Withdraw, Reactivate, Delete, Restore, Reindex, Approve, Reject
  async function resetStudentPassword(id, name) {
    closeAllMenus();
    const newPass = prompt(`Enter new password for ${name}:`, 'Password@123');
    if (!newPass) return;
    try {
      const res = await api(`/hod/students/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: newPass })
      });
      if (res && res.success) notify(`Password reset successfully for ${name}`, 'success');
      else throw new Error(res?.error?.message || 'Password reset failed');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  function transferStudentAction(id, name) {
    closeAllMenus();
    if (typeof window.openDeleteModal === 'function') {
      window.openDeleteModal({
        title: 'Transfer Student',
        subtitle: 'Institutional Transfer (Data Preserved)',
        itemName: name,
        message: 'The student will be marked as <strong>TRANSFERRED</strong> and placed in Inactive status. Their academic history, attendance records, exam marks, and uploaded documents will <strong>NOT</strong> be deleted and will remain permanently accessible to teachers.',
        confirmKeyword: 'transfer',
        strictCase: false,
        confirmButtonText: 'Transfer Student',
        onConfirm: async () => {
          const res = await api(`/hod/students/${id}/transfer`, { method: 'POST', body: JSON.stringify({}) });
          if (res && res.success) {
            notify(`${name} transferred successfully. All records preserved.`, 'success');
            await loadStudentsRoster();
          } else {
            throw new Error(res?.error?.message || 'Transfer failed');
          }
        }
      });
      return;
    }

    const val = prompt(`Type "transfer" to transfer ${name} (data preserved):`);
    if (val?.toLowerCase() !== 'transfer') return;
    api(`/hod/students/${id}/transfer`, { method: 'POST', body: JSON.stringify({}) })
      .then(res => {
        if (res && res.success) {
          notify(`${name} transferred successfully. All records preserved.`, 'success');
          loadStudentsRoster();
        } else {
          notify(res?.error?.message || 'Transfer failed', 'error');
        }
      })
      .catch(err => notify(err.message, 'error'));
  }

  function withdrawStudentAction(id, name) {
    closeAllMenus();
    if (typeof window.openDeleteModal === 'function') {
      window.openDeleteModal({
        title: 'Withdraw Student',
        subtitle: 'Formal Withdrawal (Data Preserved)',
        itemName: name,
        message: 'The student will be marked as <strong>WITHDRAWN</strong> and placed in Inactive status. Their academic history, attendance records, exam marks, and uploaded documents will <strong>NOT</strong> be deleted and will remain permanently accessible to teachers.',
        confirmKeyword: 'withdraw',
        strictCase: false,
        confirmButtonText: 'Withdraw Student',
        onConfirm: async () => {
          const res = await api(`/hod/students/${id}/withdraw`, { method: 'POST', body: JSON.stringify({}) });
          if (res && res.success) {
            notify(`${name} marked as withdrawn. All records preserved.`, 'success');
            await loadStudentsRoster();
          } else {
            throw new Error(res?.error?.message || 'Withdrawal failed');
          }
        }
      });
      return;
    }

    const val = prompt(`Type "withdraw" to withdraw ${name} (data preserved):`);
    if (val?.toLowerCase() !== 'withdraw') return;
    api(`/hod/students/${id}/withdraw`, { method: 'POST', body: JSON.stringify({}) })
      .then(res => {
        if (res && res.success) {
          notify(`${name} marked as withdrawn. All records preserved.`, 'success');
          loadStudentsRoster();
        } else {
          notify(res?.error?.message || 'Withdrawal failed', 'error');
        }
      })
      .catch(err => notify(err.message, 'error'));
  }

  async function reactivateStudentAction(id, name) {
    closeAllMenus();
    if (!confirm(`Re-activate ${name} into active enrolled status?`)) return;
    try {
      const res = await api(`/hod/students/${id}/reactivate`, { method: 'POST' });
      if (res && res.success) {
        notify(`${name} re-activated into active enrollment!`, 'success');
        await loadStudentsRoster();
      } else {
        throw new Error(res?.error?.message || 'Re-activation failed');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function deleteStudentMember(id, name) {
    closeAllMenus();
    if (typeof window.openDeleteModal === 'function') {
      window.openDeleteModal({
        title: 'Remove Student',
        subtitle: 'Move to Department Trash Bin',
        itemName: name,
        message: 'This will remove the student from active department cohorts and move them to the Trash Bin. Records in the Trash Bin can be restored or will be permanently purged after 30 days.',
        confirmKeyword: 'remove',
        strictCase: false,
        confirmButtonText: 'Move to Trash Bin',
        onConfirm: async () => {
          const res = await api(`/hod/students/${id}`, { method: 'DELETE' });
          if (res && res.success) {
            notify(`${name} moved to Trash Bin (auto-purges in 30 days)`, 'success');
            await Promise.all([loadStudentsRoster(), loadTrashStudents()]);
          } else {
            throw new Error(res?.error?.message || 'Removal failed');
          }
        }
      });
      return;
    }

    const val = prompt(`Type "remove" to move ${name} to Trash Bin:`);
    if (val?.toLowerCase() !== 'remove') return;
    try {
      const res = await api(`/hod/students/${id}`, { method: 'DELETE' });
      if (res && res.success) {
        notify(`${name} moved to Trash Bin (auto-purges in 30 days)`, 'success');
        await Promise.all([loadStudentsRoster(), loadTrashStudents()]);
      } else {
        throw new Error(res?.error?.message || 'Removal failed');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function restoreStudentMember(id, name) {
    try {
      const res = await api(`/hod/trash/students/${id}/restore`, { method: 'POST' });
      if (res && res.success) {
        notify(`${name} restored successfully!`, 'success');
        selectedTrashIds.delete(Number(id));
        await Promise.all([loadStudentsRoster(), loadTrashStudents()]);
        renderTable();
      } else {
        throw new Error(res?.error?.message || 'Restore failed');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  // ── Trash Selection & Bulk Operations ─────────────────────────
  function toggleTrashSelect(studentId, isChecked) {
    const id = Number(studentId);
    if (isChecked) {
      selectedTrashIds.add(id);
    } else {
      selectedTrashIds.delete(id);
    }
    updateTrashBulkBar();

    const masterCheck = document.getElementById('check-all-trash');
    if (masterCheck) {
      const searchVal = (document.getElementById('student-search')?.value || '').toLowerCase().trim();
      let list = trashStudents;
      if (searchVal) {
        list = list.filter(s =>
          (s.full_name || '').toLowerCase().includes(searchVal) ||
          String(s.class_roll_no || '').includes(searchVal) ||
          (s.ubter_roll_no || s.official_enrollment_no || '').toLowerCase().includes(searchVal) ||
          (s.email || '').toLowerCase().includes(searchVal)
        );
      }
      masterCheck.checked = list.length > 0 && list.every(s => selectedTrashIds.has(Number(s.student_id || s.id)));
    }
  }

  function toggleSelectAllTrash(isChecked) {
    const searchVal = (document.getElementById('student-search')?.value || '').toLowerCase().trim();
    let list = trashStudents;
    if (searchVal) {
      list = list.filter(s =>
        (s.full_name || '').toLowerCase().includes(searchVal) ||
        String(s.class_roll_no || '').includes(searchVal) ||
        (s.ubter_roll_no || s.official_enrollment_no || '').toLowerCase().includes(searchVal) ||
        (s.email || '').toLowerCase().includes(searchVal)
      );
    }

    list.forEach(s => {
      const id = Number(s.student_id || s.id);
      if (isChecked) {
        selectedTrashIds.add(id);
      } else {
        selectedTrashIds.delete(id);
      }
    });

    document.querySelectorAll('.trash-row-check').forEach(cb => {
      const id = Number(cb.dataset.id);
      cb.checked = selectedTrashIds.has(id);
    });

    updateTrashBulkBar();
  }

  function clearTrashSelection() {
    selectedTrashIds.clear();
    const masterCheck = document.getElementById('check-all-trash');
    if (masterCheck) masterCheck.checked = false;
    document.querySelectorAll('.trash-row-check').forEach(cb => { cb.checked = false; });
    updateTrashBulkBar();
  }

  function updateTrashBulkBar() {
    const bulkBar = document.getElementById('trash-bulk-bar');
    const countBadge = document.getElementById('trash-selected-count');
    if (!bulkBar) return;

    const count = selectedTrashIds.size;
    if (countBadge) countBadge.textContent = count;

    if (currentYearFilter === 'TRASH' && count > 0) {
      bulkBar.style.display = 'flex';
    } else {
      bulkBar.style.display = 'none';
    }
  }

  // ── Trash Confirmation Modal ─────────────────────────────────
  function openTrashConfirmModal({ title, iconType, heading, desc, warningText, confirmText, confirmClass, onConfirm }) {
    const modal = document.getElementById('modal-trash-confirm');
    if (!modal) return;

    const titleEl = document.getElementById('trash-confirm-title');
    if (titleEl) titleEl.textContent = title || 'Confirm Action';

    const iconBox = document.getElementById('trash-confirm-icon');
    if (iconBox) {
      iconBox.className = 'trash-confirm-icon-box ' + (iconType || 'restore');
      if (iconType === 'danger') {
        iconBox.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
      } else {
        iconBox.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>`;
      }
    }

    const headingEl = document.getElementById('trash-confirm-heading');
    if (headingEl) headingEl.textContent = heading || '';

    const descEl = document.getElementById('trash-confirm-desc');
    if (descEl) descEl.textContent = desc || '';

    const warnEl = document.getElementById('trash-confirm-warning');
    if (warnEl) {
      if (warningText) {
        warnEl.textContent = warningText;
        warnEl.style.display = 'block';
      } else {
        warnEl.style.display = 'none';
      }
    }

    const btnConfirm = document.getElementById('trash-confirm-btn');
    if (btnConfirm) {
      btnConfirm.textContent = confirmText || 'Confirm';
      btnConfirm.className = 'btn-stu-compact' + (confirmClass ? ' ' + confirmClass : '');
      btnConfirm.onclick = () => {
        closeTrashConfirmModal();
        if (typeof onConfirm === 'function') onConfirm();
      };
    }

    modal.style.display = 'flex';
  }

  function closeTrashConfirmModal() {
    const modal = document.getElementById('modal-trash-confirm');
    if (modal) modal.style.display = 'none';
  }

  function confirmSingleRestore(studentId, name) {
    openTrashConfirmModal({
      title: 'Restore Student',
      iconType: 'restore',
      heading: `Restore ${name}?`,
      desc: 'This will restore the student back to the active department roster.',
      confirmText: 'Yes, Restore',
      onConfirm: () => restoreStudentMember(studentId, name)
    });
  }

  function confirmSinglePermanentDelete(studentId, name) {
    openTrashConfirmModal({
      title: 'Delete Permanently',
      iconType: 'danger',
      heading: `Permanently delete ${name}?`,
      desc: 'This student and all associated records, attendance, and credentials will be permanently erased.',
      warningText: '⚠️ This action is IRREVERSIBLE and cannot be undone!',
      confirmText: 'Yes, Delete Permanently',
      confirmClass: 'danger',
      onConfirm: () => executeSinglePermanentDelete(studentId, name)
    });
  }

  async function executeSinglePermanentDelete(studentId, name) {
    try {
      const res = await api(`/hod/trash/students/${studentId}/permanent`, { method: 'DELETE' });
      if (res && res.success) {
        notify(`${name} permanently deleted from Trash.`, 'success');
        selectedTrashIds.delete(Number(studentId));
        await loadTrashStudents();
        renderTable();
      } else {
        throw new Error(res?.error?.message || 'Failed to permanently delete student');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  function confirmBulkRestore() {
    if (selectedTrashIds.size === 0) {
      notify('No students selected', 'error');
      return;
    }
    const count = selectedTrashIds.size;
    openTrashConfirmModal({
      title: 'Bulk Restore Students',
      iconType: 'restore',
      heading: `Restore ${count} selected student(s)?`,
      desc: `All ${count} selected students will be restored back to their active department rosters.`,
      confirmText: `Yes, Restore (${count})`,
      onConfirm: () => executeBulkRestore()
    });
  }

  async function executeBulkRestore() {
    const ids = Array.from(selectedTrashIds);
    try {
      const res = await api('/hod/trash/students/bulk-restore', {
        method: 'POST',
        body: JSON.stringify({ ids })
      });
      if (res && res.success) {
        notify(`Successfully restored ${res.restored_count || ids.length} student(s)!`, 'success');
        clearTrashSelection();
        await Promise.all([loadStudentsRoster(), loadTrashStudents()]);
        renderTable();
      } else {
        throw new Error(res?.error?.message || 'Failed to bulk restore students');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  function confirmBulkPermanentDelete() {
    if (selectedTrashIds.size === 0) {
      notify('No students selected', 'error');
      return;
    }
    const count = selectedTrashIds.size;
    openTrashConfirmModal({
      title: 'Bulk Delete Permanently',
      iconType: 'danger',
      heading: `Permanently delete ${count} selected student(s)?`,
      desc: `All records, biometric sessions, and profiles for the ${count} selected students will be permanently wiped from the database.`,
      warningText: '⚠️ DANGER: This action is permanent and completely IRREVERSIBLE!',
      confirmText: `Yes, Delete (${count})`,
      confirmClass: 'danger',
      onConfirm: () => executeBulkPermanentDelete()
    });
  }

  async function executeBulkPermanentDelete() {
    const ids = Array.from(selectedTrashIds);
    try {
      const res = await api('/hod/trash/students/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids })
      });
      if (res && res.success) {
        notify(`Permanently deleted ${res.deleted_count || ids.length} student(s) from Trash.`, 'success');
        clearTrashSelection();
        await loadTrashStudents();
        renderTable();
      } else {
        throw new Error(res?.error?.message || 'Failed to permanently delete students');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  // ── Success Celebration Modal ────────────────────────────────
  function showBulkSuccessModal(count, details = null) {
    const modal = document.getElementById('modal-bulk-success');
    if (!modal) return;

    const titleEl = document.getElementById('bulk-success-title');
    const descEl = document.getElementById('bulk-success-desc');
    const detailsEl = document.getElementById('bulk-success-details');

    if (titleEl) titleEl.textContent = 'Students Added Successfully!';
    if (descEl) descEl.textContent = `Successfully imported ${count} student(s) into the department roster.`;

    if (details && detailsEl) {
      detailsEl.innerHTML = details;
      detailsEl.style.display = 'block';
    } else if (detailsEl) {
      detailsEl.style.display = 'none';
    }

    modal.style.display = 'flex';
  }

  function closeBulkSuccessModal() {
    const modal = document.getElementById('modal-bulk-success');
    if (modal) modal.style.display = 'none';
  }

  async function approveStudentRequest(id, officialEnrollmentNo, btnEl) {
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = 'Approving...';
    }
    try {
      const payload = officialEnrollmentNo ? { ubter_roll_no: officialEnrollmentNo, official_enrollment_no: officialEnrollmentNo } : {};
      const res = await api(`/hod/registrations/student/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res && res.success) {
        notify('Student enrollment approved!', 'success');
        await Promise.all([loadStudentsRoster(), loadPendingStudents()]);
      } else {
        throw new Error(res?.error?.message || 'Approval failed');
      }
    } catch (err) {
      notify(err.message, 'error');
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = 'Approve';
      }
    }
  }

  async function rejectStudentRequest(id, btnEl) {
    const reason = prompt('Please enter rejection reason (optional):', 'Criteria not met');
    if (reason === null) return;
    if (btnEl) {
      btnEl.disabled = true;
    }
    try {
      const res = await api(`/hod/registrations/student/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejection_reason: reason })
      });
      if (res && res.success) {
        notify('Student enrollment declined', 'info');
        loadPendingStudents();
      } else {
        throw new Error(res?.error?.message || 'Rejection failed');
      }
    } catch (err) {
      notify(err.message, 'error');
      if (btnEl) {
        btnEl.disabled = false;
      }
    }
  }

  // 10. Add Student Modal
  function openAddModal() {
    const m = document.getElementById('modal-add-student');
    if (m) {
      const errBanner = document.getElementById('add-stu-error-banner');
      if (errBanner) {
        errBanner.style.display = 'none';
        errBanner.textContent = '';
      }
      const addSemSelect = document.getElementById('add-stu-sem');
      if (addSemSelect) {
        const dept = allStudents[0]?.department_name || allStudents[0]?.department_code || '';
        updateSemesterOptions(addSemSelect, dept, addSemSelect.value || 1);
      }
      m.style.display = 'flex';
    }
  }

  function closeAddModal() {
    const m = document.getElementById('modal-add-student');
    if (m) {
      m.style.display = 'none';
      const errBanner = document.getElementById('add-stu-error-banner');
      if (errBanner) {
        errBanner.style.display = 'none';
        errBanner.textContent = '';
      }
    }
  }

  async function submitAddStudent(e) {
    e.preventDefault();
    const errBanner = document.getElementById('add-stu-error-banner');
    if (errBanner) {
      errBanner.style.display = 'none';
      errBanner.textContent = '';
    }

    const full_name = document.getElementById('add-stu-name')?.value.trim();
    const class_roll_no = document.getElementById('add-stu-roll')?.value.trim();
    const official_enrollment_no = document.getElementById('add-stu-enroll')?.value.trim();
    const registration_no = document.getElementById('add-stu-reg')?.value.trim();
    const semester = parseInt(document.getElementById('add-stu-sem')?.value || '1', 10);
    const year = Math.ceil(semester / 2);
    const email = document.getElementById('add-stu-email')?.value.trim() || null;
    const phone = document.getElementById('add-stu-phone')?.value.trim() || null;

    if (!full_name || !official_enrollment_no) {
      const msg = 'Student Name and UBTER Roll No are required.';
      if (errBanner) {
        errBanner.textContent = msg;
        errBanner.style.display = 'block';
      }
      notify(msg, 'error');
      return;
    }

    // Validation: UBTER Roll No limit 11 digits numeric
    const cleanEnroll = official_enrollment_no.replace(/\D/g, '');
    if (!cleanEnroll || cleanEnroll.length > 11) {
      const msg = 'UBTER Roll Number must be numeric and maximum 11 digits.';
      if (errBanner) {
        errBanner.textContent = msg;
        errBanner.style.display = 'block';
      }
      notify(msg, 'error');
      return;
    }

    // Validation: UBTER Reg No limit 8 digits numeric if provided
    let cleanReg = null;
    if (registration_no) {
      cleanReg = registration_no.replace(/\D/g, '');
      if (!cleanReg || cleanReg.length > 8) {
        const msg = 'UBTER Registration Number must be numeric and maximum 8 digits.';
        if (errBanner) {
          errBanner.textContent = msg;
          errBanner.style.display = 'block';
        }
        notify(msg, 'error');
        return;
      }
    }

    // Validation: Phone Number limit 10 digits numeric if provided
    let cleanPhone = null;
    if (phone) {
      cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        const msg = 'Phone Number must be a valid 10-digit mobile number.';
        if (errBanner) {
          errBanner.textContent = msg;
          errBanner.style.display = 'block';
        }
        notify(msg, 'error');
        return;
      }
    }

    const submitBtn = document.querySelector('#form-add-student button[type="submit"]');
    const cancelBtn = document.querySelector('#form-add-student button.btn-stu-outline');
    const origHtml = submitBtn ? submitBtn.innerHTML : 'Enroll Student';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('btn-disabled-loading');
      submitBtn.innerHTML = `
        <svg class="stu-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
        <span>Enrolling Student...</span>
      `;
    }
    if (cancelBtn) cancelBtn.disabled = true;

    try {
      const res = await api('/hod/students', {
        method: 'POST',
        body: JSON.stringify({
          full_name,
          class_roll_no: class_roll_no ? parseInt(class_roll_no, 10) : null,
          ubter_roll_no: cleanEnroll,
          official_enrollment_no: cleanEnroll,
          registration_no: cleanReg,
          semester,
          year,
          email,
          phone: cleanPhone
        })
      });
      if (res && res.success) {
        closeAddModal();
        document.getElementById('form-add-student')?.reset();
        showBulkSuccessModal(1);
        const titleEl = document.getElementById('bulk-success-title');
        const descEl = document.getElementById('bulk-success-desc');
        if (titleEl) titleEl.textContent = 'Student Enrolled Successfully!';
        if (descEl) descEl.textContent = `${full_name} (${cleanEnroll}) has been enrolled into the department roster.`;
        await loadStudentsRoster();
      } else {
        throw new Error(res?.error?.message || 'Failed to add student');
      }
    } catch (err) {
      const errMsg = err?.message || err?.error?.message || 'Failed to add student';
      if (errBanner) {
        errBanner.textContent = errMsg;
        errBanner.style.display = 'block';
      }
      notify(errMsg, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn-disabled-loading');
        submitBtn.innerHTML = origHtml;
      }
      if (cancelBtn) cancelBtn.disabled = false;
    }
  }

  // 10B. Edit Student Modal Compatibility Wrappers (Unified Single Modal Architecture)
  function switchEditTab(tabName) {
    switchDetailTab(tabName);
  }

  function cancelStudentEdit() {
    setStudentModalEditMode(false);
  }

  async function submitEditStudent(e) {
    if (e && e.preventDefault) e.preventDefault();
    const alertBox = document.getElementById('edit-stu-alert');
    const enrollErr = document.getElementById('edit-stu-enroll-error');
    const rollErr = document.getElementById('edit-stu-roll-error');
    const saveBtn = document.getElementById('btn-save-edit-student');

    if (alertBox) { alertBox.style.display = 'none'; alertBox.textContent = ''; }
    if (enrollErr) enrollErr.textContent = '';
    if (rollErr) rollErr.textContent = '';

    const studentId = parseInt(document.getElementById('edit-stu-id')?.value, 10);
    const fullName = document.getElementById('edit-stu-name')?.value.trim();
    const chkNotAvail = Boolean(document.getElementById('edit-chk-enroll-not-available')?.checked);
    const enrollInput = document.getElementById('edit-stu-enroll');
    const regNo = document.getElementById('edit-stu-reg')?.value.trim().toUpperCase() || null;
    const rollInput = document.getElementById('edit-stu-roll')?.value.trim();
    const semester = parseInt(document.getElementById('edit-stu-sem')?.value, 10);

    if (!studentId) {
      notify('Invalid student ID.', 'danger');
      return;
    }
    if (!fullName) {
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.style.background = 'var(--status-absent-bg, rgba(239, 68, 68, 0.1))';
        alertBox.style.color = 'var(--status-absent, #ef4444)';
        alertBox.textContent = 'Full Name is required.';
      }
      return;
    }

    let officialEnroll = null;
    if (chkNotAvail) {
      officialEnroll = null;
    } else {
      const cleanEnroll = (enrollInput?.value || '').trim().replace(/\D/g, '');
      if (!cleanEnroll) {
        if (enrollErr) enrollErr.textContent = 'UBTER Roll Number is required (or check "Not Avail.").';
        enrollInput?.focus();
        return;
      }
      if (cleanEnroll.length !== 11 || !/^\d{11}$/.test(cleanEnroll)) {
        if (enrollErr) enrollErr.textContent = 'UBTER Roll Number must be exactly 11 numeric digits (0–9).';
        enrollInput?.focus();
        return;
      }
      officialEnroll = cleanEnroll;
    }

    let classRoll = null;
    if (rollInput) {
      const cleanRoll = rollInput.replace(/\D/g, '');
      if (!/^\d{1,2}$/.test(cleanRoll)) {
        if (rollErr) rollErr.textContent = 'Class roll number must be numeric and maximum 2 digits.';
        document.getElementById('edit-stu-roll')?.focus();
        return;
      }
      classRoll = parseInt(cleanRoll, 10);
    }

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving Changes...';
      }

      const res = await api('/hod/students/' + studentId, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          ubter_roll_no: officialEnroll,
          official_enrollment_no: officialEnroll,
          enrollment_not_available: chkNotAvail,
          registration_no: regNo,
          class_roll_no: classRoll,
          semester: semester
        })
      });

      if (res && res.success) {
        // Update local student model in allStudents for immediate UI responsiveness
        const idx = allStudents.findIndex(s => (s.student_id || s.id) === studentId);
        if (idx !== -1) {
          allStudents[idx].full_name = fullName;
          allStudents[idx].ubter_roll_no = officialEnroll;
          allStudents[idx].official_enrollment_no = officialEnroll;
          allStudents[idx].enrollment_no_status = chkNotAvail ? 'Not Assigned' : 'ASSIGNED';
          allStudents[idx].registration_no = regNo;
          allStudents[idx].class_roll_no = classRoll;
          allStudents[idx].roll_number = classRoll;
          allStudents[idx].semester = semester;
          allStudents[idx].year = Math.ceil(semester / 2);
          const statusSelect = document.getElementById('edit-stu-status');
          if (statusSelect) {
            const stVal = statusSelect.value;
            if (stVal === 'Active') {
              allStudents[idx].is_active = 1;
              allStudents[idx].enrollment_status = 'ENROLLED';
            } else if (stVal === 'Transferred') {
              allStudents[idx].is_active = 0;
              allStudents[idx].enrollment_status = 'TRANSFERRED';
            } else if (stVal === 'Withdrawn') {
              allStudents[idx].is_active = 0;
              allStudents[idx].enrollment_status = 'WITHDRAWN';
            }
          }
        }

        notify('Student details updated successfully.', 'success');
        renderTable();

        // Keep user in the single modal: seamless transition back to view mode
        viewStudentDetails(studentId, false);
      } else {
        const msg = res?.error?.message || 'Failed to update student details.';
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.style.background = 'var(--status-absent-bg, rgba(239, 68, 68, 0.1))';
          alertBox.style.color = 'var(--status-absent, #ef4444)';
          alertBox.textContent = msg;
        } else {
          notify(msg, 'danger');
        }
      }
    } catch (err) {
      const msg = err.message || 'Network error updating student details.';
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.style.background = 'var(--status-absent-bg, rgba(239, 68, 68, 0.1))';
        alertBox.style.color = 'var(--status-absent, #ef4444)';
        alertBox.textContent = msg;
      } else {
        notify(msg, 'danger');
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    }
  }

  // 11. Bulk CSV Modal
  function openBulkModal() {
    const m = document.getElementById('modal-bulk-csv');
    if (m) m.style.display = 'flex';
  }

  function closeBulkModal() {
    const m = document.getElementById('modal-bulk-csv');
    if (m) m.style.display = 'none';
  }

  async function submitBulkCsv(e) {
    e.preventDefault();
    const csvText = document.getElementById('bulk-csv-text')?.value.trim();
    if (!csvText) {
      notify('Please paste CSV text', 'error');
      return;
    }

    const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
    const students = [];

    const startIdx = lines[0].toLowerCase().includes('name') ? 1 : 0;
    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length >= 2) {
        students.push({
          full_name: parts[0],
          official_enrollment_no: parts[1],
          class_roll_no: parts[2] ? parseInt(parts[2], 10) : null,
          registration_no: parts[3] || null,
          semester: parts[4] ? parseInt(parts[4], 10) : 1,
          year: parts[4] ? Math.ceil(parseInt(parts[4], 10) / 2) : 1
        });
      }
    }

    if (students.length === 0) {
      notify('No valid student rows found in CSV', 'error');
      return;
    }

    const defaultSem = students[0]?.semester || 1;
    const defaultYear = students[0]?.year || Math.ceil(defaultSem / 2);

    const submitBtn = document.querySelector('#form-bulk-csv button[type="submit"]');
    const cancelBtn = document.querySelector('#form-bulk-csv button.btn-stu-outline');
    const origHtml = submitBtn ? submitBtn.innerHTML : 'Import Students';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('btn-disabled-loading');
      submitBtn.innerHTML = `
        <svg class="stu-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
        <span>Importing Students...</span>
      `;
    }
    if (cancelBtn) cancelBtn.disabled = true;

    try {
      const res = await api('/hod/students/bulk', {
        method: 'POST',
        body: JSON.stringify({
          year: defaultYear,
          semester: defaultSem,
          students
        })
      });
      if (res && res.success) {
        closeBulkModal();
        const csvArea = document.getElementById('bulk-csv-text');
        if (csvArea) csvArea.value = '';

        let detailMsg = null;
        if (res.skipped_count || (res.errors && res.errors.length)) {
          detailMsg = `<strong>Enrolled:</strong> ${res.enrolled_count || students.length} student(s)<br>`;
          if (res.skipped_count) detailMsg += `<strong>Skipped (duplicates):</strong> ${res.skipped_count}<br>`;
          if (res.errors && res.errors.length) {
            detailMsg += `<strong>Notes:</strong><br>${res.errors.map(err => `&bull; ${esc(err.message || err)}`).join('<br>')}`;
          }
        }

        showBulkSuccessModal(res.enrolled_count || students.length, detailMsg);
        await loadStudentsRoster();
      } else {
        throw new Error(res?.error?.message || 'Bulk upload failed');
      }
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn-disabled-loading');
        submitBtn.innerHTML = origHtml;
      }
      if (cancelBtn) cancelBtn.disabled = false;
    }
  }

  // 12. Event Listeners
  function setupEventListeners() {
    document.querySelectorAll('.stu-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.stu-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentYearFilter = btn.dataset.year || 'ALL';
        if (currentYearFilter !== 'TRASH') {
          clearTrashSelection();
        }
        renderTable();
      });
    });

    const searchInput = document.getElementById('student-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => renderTable());
    }

    const toggleEl = document.getElementById('toggle-student-reg');
    if (toggleEl) {
      toggleEl.addEventListener('change', (e) => toggleRegistration(e.target.checked));
    }

    const addForm = document.getElementById('form-add-student');
    if (addForm) addForm.addEventListener('submit', submitAddStudent);

    // Live Numeric Input Restrictors for Add Student Modal
    const addEnrollInput = document.getElementById('add-stu-enroll');
    if (addEnrollInput) {
      addEnrollInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
        const err = document.getElementById('add-stu-error-banner');
        if (err) err.style.display = 'none';
      });
    }

    const addRegInput = document.getElementById('add-stu-reg');
    if (addRegInput) {
      addRegInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
        const err = document.getElementById('add-stu-error-banner');
        if (err) err.style.display = 'none';
      });
    }

    const addPhoneInput = document.getElementById('add-stu-phone');
    if (addPhoneInput) {
      addPhoneInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
        const err = document.getElementById('add-stu-error-banner');
        if (err) err.style.display = 'none';
      });
    }

    const bulkForm = document.getElementById('form-bulk-csv');
    if (bulkForm) bulkForm.addEventListener('submit', submitBulkCsv);

    // Edit Student Form Listeners
    const editChkNotAvail = document.getElementById('edit-chk-enroll-not-available');
    const editEnrollInput = document.getElementById('edit-stu-enroll');
    const editEnrollReq = document.getElementById('edit-stu-enroll-req');
    const editEnrollHint = document.getElementById('edit-stu-enroll-hint');
    const editEnrollErr = document.getElementById('edit-stu-enroll-error');
    const editRollInput = document.getElementById('edit-stu-roll');
    const editRollErr = document.getElementById('edit-stu-roll-error');

    if (editChkNotAvail && editEnrollInput) {
      editChkNotAvail.addEventListener('change', () => {
        if (editChkNotAvail.checked) {
          editEnrollInput.value = '';
          editEnrollInput.disabled = true;
          editEnrollInput.placeholder = 'Not Assigned';
          editEnrollInput.removeAttribute('required');
          if (editEnrollReq) editEnrollReq.style.display = 'none';
          if (editEnrollHint) editEnrollHint.textContent = 'UBTER roll number status is set to "Not Assigned".';
          if (editEnrollErr) editEnrollErr.textContent = '';
        } else {
          editEnrollInput.disabled = false;
          editEnrollInput.placeholder = '11-digit numeric UBTER roll no';
          editEnrollInput.setAttribute('required', 'required');
          if (editEnrollReq) editEnrollReq.style.display = 'inline';
          if (editEnrollHint) editEnrollHint.textContent = 'Enter your 11-digit official UBTER roll number (0–9).';
        }
      });
    }

    if (editEnrollInput) {
      editEnrollInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
        if (editEnrollErr && e.target.value.length === 11) {
          editEnrollErr.textContent = '';
        }
      });
      editEnrollInput.addEventListener('blur', (e) => {
        if (editChkNotAvail && editChkNotAvail.checked) return;
        const val = e.target.value.trim();
        if (val && val.length !== 11) {
          if (editEnrollErr) editEnrollErr.textContent = 'UBTER Roll Number must be exactly 11 numeric digits (0–9).';
        } else if (editEnrollErr) {
          editEnrollErr.textContent = '';
        }
      });
    }

    if (editRollInput) {
      editRollInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2);
        if (editRollErr) editRollErr.textContent = '';
      });
      editRollInput.addEventListener('blur', (e) => {
        const val = e.target.value.trim();
        if (val && !/^\d{1,2}$/.test(val)) {
          if (editRollErr) editRollErr.textContent = 'Class roll number must be numeric and maximum 2 digits.';
        } else if (editRollErr) {
          editRollErr.textContent = '';
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.stu-menu-wrap')) {
        closeAllMenus();
      }
    });
  }

  // Window Exports
  window.toggleStudentMenu = toggleStudentMenu;
  window.viewStudentDetails = viewStudentDetails;
  window.closeStudentDetailsModal = closeStudentDetailsModal;
  window.switchDetailTab = switchDetailTab;
  window.setStudentModalEditMode = setStudentModalEditMode;
  window.cancelStudentEdit = cancelStudentEdit;
  window.openEditStudentModal = openEditStudentModal;
  window.closeEditStudentModal = closeEditStudentModal;
  window.switchEditTab = switchEditTab;
  window.detailEditStudent = detailEditStudent;
  window.submitEditStudent = submitEditStudent;
  window.detailResetPassword = detailResetPassword;
  window.detailDeleteStudent = detailDeleteStudent;
  window.detailTransferStudent = detailTransferStudent;
  window.detailWithdrawStudent = detailWithdrawStudent;
  window.detailReactivateStudent = detailReactivateStudent;
  window.transferStudentAction = transferStudentAction;
  window.withdrawStudentAction = withdrawStudentAction;
  window.reactivateStudentAction = reactivateStudentAction;
  window.resetStudentPassword = resetStudentPassword;
  window.deleteStudentMember = deleteStudentMember;
  window.restoreStudentMember = restoreStudentMember;
  window.openAddStudentModal = openAddModal;
  window.closeAddStudentModal = closeAddModal;
  window.openBulkModal = openBulkModal;
  window.closeBulkModal = closeBulkModal;
  window.approveStudentRequest = approveStudentRequest;
  window.rejectStudentRequest = rejectStudentRequest;
  window.switchToPendingTab = switchToPendingTab;
  window.switchToTrashTab = switchToTrashTab;

  // Trash & Bulk Modal Exports
  window.toggleTrashSelect = toggleTrashSelect;
  window.toggleSelectAllTrash = toggleSelectAllTrash;
  window.clearTrashSelection = clearTrashSelection;
  window.confirmBulkRestore = confirmBulkRestore;
  window.confirmBulkPermanentDelete = confirmBulkPermanentDelete;
  window.confirmSingleRestore = confirmSingleRestore;
  window.confirmSinglePermanentDelete = confirmSinglePermanentDelete;
  window.closeTrashConfirmModal = closeTrashConfirmModal;
  window.closeBulkSuccessModal = closeBulkSuccessModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
