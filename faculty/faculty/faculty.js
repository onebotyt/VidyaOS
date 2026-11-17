/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY MANAGEMENT CONTROLLER (faculty.js)
 * Clean, Compact, Dynamic (Zero Redundant Code)
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // HOD RBAC Check
  if (typeof requireFacultyAuth === 'function') {
    requireFacultyAuth(['HOD', 'SYSTEM_ADMIN']);
  } else if (typeof guardRoute === 'function') {
    guardRoute({ roles: ['HOD', 'SYSTEM_ADMIN'], redirectUrl: '/faculty/dashboard/index.html' });
  }

  let allFaculty = [];
  let pendingFaculty = [];
  let trashFaculty = [];
  let currentFilter = 'ALL';
  let regOpen = false;
  let currentDetailFacultyId = null;

  const esc = (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  const notify = (msg, type = 'info') => {
    if (typeof showToast === 'function') showToast(msg, type);
    else alert(msg);
  };

  function getInitials(name) {
    if (!name) return 'FA';
    const clean = name.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase() || 'FA';
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
      loadFacultyRoster(),
      loadPendingFaculty(),
      loadTrashFaculty(),
      loadRegistrationStatus()
    ]);
  }

  // 2. Fetch Data
  async function loadFacultyRoster() {
    try {
      const res = await api('/hod/faculty-roster');
      if (res && res.success && Array.isArray(res.data)) {
        allFaculty = res.data;
        updateCounts();
        if (currentFilter !== 'PENDING' && currentFilter !== 'TRASH') renderTable();
      }
    } catch (err) {
      console.error('[Faculty] Failed to load faculty roster:', err);
    }
  }

  async function loadPendingFaculty() {
    try {
      const res = await api('/hod/registrations/pending-faculty');
      if (res && res.success && Array.isArray(res.data)) {
        pendingFaculty = res.data;
        updateCounts();
        if (currentFilter === 'PENDING') renderTable();
      }
    } catch (err) {
      console.warn('[Faculty] Pending registrations check:', err.message);
    }
  }

  async function loadTrashFaculty() {
    try {
      const res = await api('/hod/trash/faculty');
      if (res && res.success && Array.isArray(res.data)) {
        trashFaculty = res.data;
        updateCounts();
        if (currentFilter === 'TRASH') renderTable();
      }
    } catch (err) {
      console.warn('[Faculty] Trash fetch:', err.message);
    }
  }

  async function loadRegistrationStatus() {
    try {
      const res = await api('/hod/faculty-registration-status');
      if (res && res.success && res.data) {
        regOpen = Boolean(res.data.is_open);
        renderToggleState();
      }
    } catch (_) {}
  }

  function renderToggleState() {
    const toggleEl = document.getElementById('toggle-faculty-reg');
    const badgeEl = document.getElementById('badge-toggle-status');
    if (toggleEl) toggleEl.checked = regOpen;
    if (badgeEl) {
      badgeEl.className = `status-badge-toggle ${regOpen ? 'open' : 'closed'}`;
      badgeEl.textContent = regOpen ? 'OPEN' : 'CLOSED';
    }
  }

  async function toggleRegistration(checked) {
    try {
      const res = await api('/hod/faculty-registration-toggle', {
        method: 'POST',
        body: JSON.stringify({ is_open: checked })
      });
      if (res && res.success) {
        regOpen = checked;
        renderToggleState();
        notify(`Faculty self-registration is now ${checked ? 'OPEN' : 'CLOSED'}`, 'success');
      } else {
        throw new Error(res?.error?.message || 'Toggle failed');
      }
    } catch (err) {
      notify(err.message, 'error');
      renderToggleState();
    }
  }

  function updateCounts() {
    const elTotal = document.getElementById('stat-total-faculty');
    const elActive = document.getElementById('stat-active-faculty');
    const elPending = document.getElementById('stat-pending-faculty');
    const badgeAll = document.getElementById('badge-count-all');
    const badgePending = document.getElementById('badge-count-pending');
    const badgeTrash = document.getElementById('badge-count-trash');
    const headerTrash = document.getElementById('header-trash-count');
    const subText = document.getElementById('stat-pending-sub');

    const total = allFaculty.length;
    const active = allFaculty.filter(f => f.status === 'ACTIVE').length;
    const pending = pendingFaculty.length;
    const trash = trashFaculty.length;

    if (elTotal) elTotal.textContent = total;
    if (elActive) elActive.textContent = `${active} active`;
    if (elPending) elPending.textContent = pending;
    if (badgeAll) badgeAll.textContent = total;
    if (badgePending) badgePending.textContent = pending;
    if (badgeTrash) badgeTrash.textContent = trash;
    if (headerTrash) headerTrash.textContent = trash;
    if (subText) subText.textContent = pending > 0 ? `${pending} awaiting clearance` : 'All applications verified';
  }

  // 3. Switch Tabs
  function switchToPendingTab() {
    document.querySelectorAll('.fac-pill').forEach(b => b.classList.remove('active'));
    const pill = document.getElementById('pill-pending');
    if (pill) pill.classList.add('active');
    currentFilter = 'PENDING';
    renderTable();
  }

  function switchToTrashTab() {
    document.querySelectorAll('.fac-pill').forEach(b => b.classList.remove('active'));
    const pill = document.getElementById('pill-trash');
    if (pill) pill.classList.add('active');
    currentFilter = 'TRASH';
    renderTable();
  }

  // 4. Render Table (Active, Pending, and Trash Bin Views)
  function renderTable() {
    const tbody = document.getElementById('faculty-tbody');
    const searchVal = (document.getElementById('faculty-search')?.value || '').toLowerCase().trim();

    if (!tbody) return;

    // Toggle table headers based on mode
    const thRetention = document.getElementById('th-retention');
    const thRole = document.getElementById('th-role');
    if (thRetention) thRetention.style.display = currentFilter === 'TRASH' ? '' : 'none';
    if (thRole) thRole.style.display = currentFilter === 'TRASH' ? 'none' : '';

    // Handle Trash Tab View
    if (currentFilter === 'TRASH') {
      renderTrashRoster(tbody, searchVal);
      return;
    }

    // Handle Pending Tab View
    if (currentFilter === 'PENDING') {
      renderPendingRoster(tbody, searchVal);
      return;
    }

    let list = allFaculty;

    // Filter by role: HOD vs LECTURER
    if (currentFilter === 'HOD') {
      list = list.filter(f => (f.employee_id || '').toUpperCase().includes('HOD') || (f.role || '').toUpperCase() === 'HOD');
    } else if (currentFilter === 'LECTURER') {
      list = list.filter(f => !(f.employee_id || '').toUpperCase().includes('HOD') && (f.role || '').toUpperCase() !== 'HOD');
    }

    // Search query filter
    if (searchVal) {
      list = list.filter(f =>
        (f.full_name || '').toLowerCase().includes(searchVal) ||
        (f.employee_id || '').toLowerCase().includes(searchVal) ||
        (f.email || '').toLowerCase().includes(searchVal) ||
        (f.phone || '').toLowerCase().includes(searchVal)
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            No faculty members match current filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((f, idx) => {
      const isHod = (f.employee_id || '').toUpperCase().includes('HOD') || (f.role || '').toUpperCase() === 'HOD';
      const roleBadge = isHod
        ? '<span class="fac-role-chip hod">HOD</span>'
        : '<span class="fac-role-chip lecturer">Lecturer</span>';

      const initials = getInitials(f.full_name);

      return `
        <tr>
          <td style="color: var(--text-muted); font-size: 0.75rem; width: 36px;">${idx + 1}</td>
          <td>
            <div class="fac-member-cell">
              <div class="fac-avatar" style="cursor:pointer;" onclick="viewFacultyDetails(${f.id})">${initials}</div>
              <a href="#" class="fac-member-link" onclick="viewFacultyDetails(${f.id}); return false;">${esc(f.full_name)}</a>
            </div>
          </td>
          <td class="col-empid"><span class="fac-emp-code">${esc(f.employee_id || '—')}</span></td>
          <td class="col-role">${roleBadge}</td>
          <td>
            <div class="fac-actions-cell">
              <div class="fac-menu-wrap">
                <button type="button" class="btn-icon-action btn-kebab" title="Actions" onclick="toggleFacultyMenu(event, ${f.id})">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                    <circle cx="12" cy="19" r="2"></circle>
                  </svg>
                </button>
                <div class="fac-dropdown-menu" id="fac-menu-${f.id}">
                  <button type="button" class="fac-menu-item" onclick="viewFacultyDetails(${f.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <span>View Details</span>
                  </button>
                  <button type="button" class="fac-menu-item" onclick="resetFacultyPassword(${f.id}, '${esc(f.full_name)}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    <span>Reset Password</span>
                  </button>
                  ${!isHod ? `
                    <button type="button" class="fac-menu-item danger" onclick="deleteFacultyMember(${f.id}, '${esc(f.full_name)}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      <span>Remove Faculty</span>
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 5. Render Pending Tab Roster
  function renderPendingRoster(tbody, searchVal) {
    let list = pendingFaculty;
    if (searchVal) {
      list = list.filter(r =>
        (r.full_name || '').toLowerCase().includes(searchVal) ||
        (r.employee_id || '').toLowerCase().includes(searchVal) ||
        (r.email || '').toLowerCase().includes(searchVal)
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            No pending faculty registration requests in queue.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((req, idx) => `
      <tr>
        <td style="color: var(--text-muted); font-size: 0.75rem; width: 36px;">${idx + 1}</td>
        <td>
          <div class="fac-member-cell">
            <div class="fac-avatar">${getInitials(req.full_name)}</div>
            <span class="fac-member-name">${esc(req.full_name)}</span>
          </div>
        </td>
        <td class="col-empid"><span class="fac-emp-code">${esc(req.employee_id || 'PENDING')}</span></td>
        <td class="col-role"><span class="fac-role-chip" style="background:var(--status-late-bg); color:var(--status-late);">Pending Verification</span></td>
        <td>
          <div class="fac-actions-cell">
            <button type="button" class="btn-primary-compact" style="padding:0.25rem 0.65rem; font-size:0.72rem;" onclick="approveRequest(${req.id})">
              ✓ Approve
            </button>
            <button type="button" class="btn-icon-action danger" title="Reject Application" onclick="rejectRequest(${req.id})">
              &times;
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // 6. Render Trash Bin Roster (30-day retention & restore action)
  function renderTrashRoster(tbody, searchVal) {
    let list = trashFaculty;
    if (searchVal) {
      list = list.filter(f =>
        (f.full_name || '').toLowerCase().includes(searchVal) ||
        (f.employee_id || '').toLowerCase().includes(searchVal) ||
        (f.email || f.gmail || '').toLowerCase().includes(searchVal)
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            No faculty members currently in the Trash Bin.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((f, idx) => {
      const initials = getInitials(f.full_name);
      const daysLeft = f.days_left != null ? f.days_left : 30;

      return `
        <tr>
          <td style="color: var(--text-muted); font-size: 0.75rem; width: 36px;">${idx + 1}</td>
          <td>
            <div class="fac-member-cell">
              <div class="fac-avatar" style="opacity: 0.85;">${initials}</div>
              <div>
                <span class="fac-member-name">${esc(f.full_name)}</span>
                <div class="fac-trash-sub">
                  <span>${esc(f.employee_id || 'ID N/A')}</span>
                  &bull;
                  <span class="badge-retention-mobile">${daysLeft}d left</span>
                </div>
              </div>
            </div>
          </td>
          <td class="col-empid"><span class="fac-emp-code">${esc(f.employee_id || '—')}</span></td>
          <td class="col-retention">
            <span class="badge-retention">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>${daysLeft} days left</span>
            </span>
          </td>
          <td style="text-align: right;">
            <div class="fac-actions-cell" style="justify-content: flex-end;">
              <button type="button" class="btn-restore-compact" onclick="restoreFacultyMember(${f.id}, '${esc(f.full_name)}')" title="Restore faculty data">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                <span>Restore</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 6. 3-Dot Dropdown Menu Handlers with Auto Drop-Up Flipping
  function toggleFacultyMenu(e, id) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const menu = document.getElementById(`fac-menu-${id}`);
    const btn = e.currentTarget || e.target.closest('.btn-kebab');
    const isAlreadyOpen = menu?.classList.contains('show');
    closeAllMenus();

    if (menu && !isAlreadyOpen) {
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        // If less than 175px below, flip the menu upwards to prevent bottom cutting
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
    document.querySelectorAll('.fac-dropdown-menu.show').forEach(m => m.classList.remove('show'));
  }

  // 7. View Faculty Complete Details Modal
  function viewFacultyDetails(id) {
    closeAllMenus();
    const f = allFaculty.find(item => item.id === id);
    if (!f) return;

    currentDetailFacultyId = f.id;
    const isHod = (f.employee_id || '').toUpperCase().includes('HOD') || (f.role || '').toUpperCase() === 'HOD';

    const modal = document.getElementById('modal-faculty-details');
    if (!modal) return;

    // Avatar and titles
    document.getElementById('detail-fac-avatar').textContent = getInitials(f.full_name);
    document.getElementById('detail-fac-name').textContent = f.full_name || 'Faculty Member';
    document.getElementById('detail-fac-empid').textContent = f.employee_id || '—';

    const roleBadge = document.getElementById('detail-fac-badge');
    if (roleBadge) {
      roleBadge.className = `fac-role-chip ${isHod ? 'hod' : 'lecturer'}`;
      roleBadge.textContent = isHod ? 'HOD' : 'Lecturer';
    }

    document.getElementById('detail-fac-role').textContent = isHod ? 'Head of Department (HOD)' : (f.designation || 'Lecturer');
    document.getElementById('detail-fac-email').textContent = f.email || f.gmail || '—';
    document.getElementById('detail-fac-phone').textContent = f.phone || '—';
    document.getElementById('detail-fac-dept').textContent = f.department_name || f.department_code || 'Department Faculty';
    document.getElementById('detail-fac-created').textContent = f.created_at ? new Date(f.created_at).toLocaleDateString() : 'Active Member';

    // Subjects
    const subjectsEl = document.getElementById('detail-fac-subjects');
    if (subjectsEl) {
      if (Array.isArray(f.subjects) && f.subjects.length > 0) {
        subjectsEl.innerHTML = `<ul style="margin:0; padding-left:1.1rem; display:flex; flex-direction:column; gap:0.25rem;">` +
          f.subjects.map(s => `<li><strong>${esc(s.name || s.subject_name || s.code)}</strong> <span style="color:var(--text-muted); font-size:0.75rem;">(${esc(s.code || '')})</span></li>`).join('') +
          `</ul>`;
      } else if (f.assignment_count > 0) {
        subjectsEl.textContent = `${f.assignment_count} active teaching subject assignment(s)`;
      } else {
        subjectsEl.textContent = 'No current teaching subjects assigned to this faculty member.';
      }
    }

    // Hide remove button if this is HOD
    const delBtn = document.getElementById('detail-btn-delete');
    if (delBtn) delBtn.style.display = isHod ? 'none' : 'inline-flex';

    modal.style.display = 'flex';
  }

  function closeFacultyDetailsModal() {
    const modal = document.getElementById('modal-faculty-details');
    if (modal) modal.style.display = 'none';
    currentDetailFacultyId = null;
  }

  function detailResetPassword() {
    if (!currentDetailFacultyId) return;
    const f = allFaculty.find(item => item.id === currentDetailFacultyId);
    resetFacultyPassword(currentDetailFacultyId, f?.full_name || 'Faculty');
  }

  function detailDeleteFaculty() {
    if (!currentDetailFacultyId) return;
    const f = allFaculty.find(item => item.id === currentDetailFacultyId);
    deleteFacultyMember(currentDetailFacultyId, f?.full_name || 'Faculty');
    closeFacultyDetailsModal();
  }

  // 8. Actions: Reset, Delete, Approve, Reject
  async function resetFacultyPassword(id, name) {
    closeAllMenus();
    const newPass = prompt(`Enter new password for ${name}:`, 'Welcome@123');
    if (!newPass) return;
    try {
      const res = await api(`/hod/teachers/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: newPass })
      });
      if (res && res.success) notify(`Password reset successfully for ${name}`, 'success');
      else throw new Error(res?.error?.message || 'Password reset failed');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function deleteFacultyMember(id, name) {
    closeAllMenus();
    if (typeof window.openDeleteModal === 'function') {
      window.openDeleteModal({
        title: 'Remove Faculty Member',
        subtitle: 'Move to Department Trash Bin',
        itemName: name,
        message: 'This will remove the faculty member from active department teaching and move them to the Trash Bin. Records in the Trash Bin are automatically permanently deleted after 30 days.',
        confirmKeyword: 'remove',
        strictCase: false,
        confirmButtonText: 'Move to Trash Bin',
        onConfirm: async () => {
          const res = await api(`/hod/teachers/${id}`, { method: 'DELETE' });
          if (res && res.success) {
            notify(`${name} moved to Trash Bin (auto-purges in 30 days)`, 'success');
            await Promise.all([loadFacultyRoster(), loadTrashFaculty()]);
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
      const res = await api(`/hod/teachers/${id}`, { method: 'DELETE' });
      if (res && res.success) {
        notify(`${name} moved to Trash Bin (auto-purges in 30 days)`, 'success');
        await Promise.all([loadFacultyRoster(), loadTrashFaculty()]);
      } else {
        throw new Error(res?.error?.message || 'Removal failed');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function restoreFacultyMember(id, name) {
    try {
      const res = await api(`/hod/trash/faculty/${id}/restore`, { method: 'POST' });
      if (res && res.success) {
        notify(`${name} restored successfully!`, 'success');
        await Promise.all([loadFacultyRoster(), loadTrashFaculty()]);
      } else {
        throw new Error(res?.error?.message || 'Restore failed');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function approveRequest(id) {
    try {
      const res = await api(`/hod/registrations/faculty/${id}/approve`, { method: 'POST' });
      if (res && res.success) {
        notify('Faculty request approved successfully!', 'success');
        loadFacultyRoster();
        loadPendingFaculty();
      } else throw new Error(res?.error?.message || 'Approval failed');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function rejectRequest(id) {
    const reason = prompt('Optional rejection reason:') || 'Registration request declined';
    try {
      const res = await api(`/hod/registrations/faculty/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      if (res && res.success) {
        notify('Faculty request rejected', 'info');
        loadPendingFaculty();
      } else throw new Error(res?.error?.message || 'Rejection failed');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  // 9. Add Faculty Modal
  function openAddModal() {
    const m = document.getElementById('modal-add-faculty');
    if (m) m.style.display = 'flex';
  }

  function closeAddModal() {
    const m = document.getElementById('modal-add-faculty');
    if (m) m.style.display = 'none';
  }

  async function submitAddFaculty(e) {
    e.preventDefault();
    const full_name = document.getElementById('add-fac-name')?.value.trim();
    const employee_id = document.getElementById('add-fac-empid')?.value.trim();
    const email = document.getElementById('add-fac-email')?.value.trim();
    const phone = document.getElementById('add-fac-phone')?.value.trim();
    const password = document.getElementById('add-fac-pass')?.value || 'Welcome@123';

    if (!full_name || !employee_id || !email) {
      notify('Full name, Employee ID, and Email are required', 'error');
      return;
    }

    try {
      const res = await api('/hod/teachers', {
        method: 'POST',
        body: JSON.stringify({ full_name, employee_id, email, phone, password })
      });
      if (res && res.success) {
        notify('Faculty member onboarded successfully!', 'success');
        closeAddModal();
        document.getElementById('form-add-faculty')?.reset();
        loadFacultyRoster();
      } else {
        throw new Error(res?.error?.message || 'Failed to add faculty');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  // Event Listeners
  function setupEventListeners() {
    // Pills
    document.querySelectorAll('.fac-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.fac-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter || 'ALL';
        renderTable();
      });
    });

    // Live Search
    const searchInput = document.getElementById('faculty-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => renderTable());
    }

    // Toggle switch
    const toggleEl = document.getElementById('toggle-faculty-reg');
    if (toggleEl) {
      toggleEl.addEventListener('change', (e) => toggleRegistration(e.target.checked));
    }

    // Modal Form
    const addForm = document.getElementById('form-add-faculty');
    if (addForm) {
      addForm.addEventListener('submit', submitAddFaculty);
    }

    // Dismiss 3-dot menus on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.fac-menu-wrap')) {
        closeAllMenus();
      }
    });
  }

  // Window Exports for inline calls
  window.toggleFacultyMenu = toggleFacultyMenu;
  window.viewFacultyDetails = viewFacultyDetails;
  window.closeFacultyDetailsModal = closeFacultyDetailsModal;
  window.detailResetPassword = detailResetPassword;
  window.detailDeleteFaculty = detailDeleteFaculty;
  window.resetFacultyPassword = resetFacultyPassword;
  window.deleteFacultyMember = deleteFacultyMember;
  window.approveRequest = approveRequest;
  window.rejectRequest = rejectRequest;
  window.openAddFacultyModal = openAddModal;
  window.closeAddFacultyModal = closeAddModal;
  window.switchToPendingTab = switchToPendingTab;
  window.switchToTrashTab = switchToTrashTab;
  window.restoreFacultyMember = restoreFacultyMember;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
