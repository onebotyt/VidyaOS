/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: FACULTY
 * frontend/admin/faculty-management/faculty.js
 * ══════════════════════════════════════════════════════════════
 */

try {
      if (typeof guardRoute === 'function') guardRoute(['SYSTEM_ADMIN']);
    } catch (_) {}
    const API = '/api/v1';
    var hodData = [];
    var departments = [];
    var selectedTeacherId = null;
    var resetTargetId = null;

    // Faculty Directory State
    var allFacultyList = [];
    var filteredFacultyList = [];
    var activeFacultyRoleFilter = 'ALL';
    var activeFacultyDeptFilter = 'ALL';
    var facultySearchQuery = '';
    var activeFacultyTab = 'all-faculty';

    function cleanFacultyDisplayName(name) {
      if (!name) return '';
      return name
        .replace(/\s*\((?:Common Faculty(?: Manager)?|Common Mgr|HOD(?:\s+[\w\s]+)?|Faculty(?: Teacher)?|Teacher|Prof(?:essor)?|Dean|Lecturer|Staff|Admin)\)/gi, '')
        .trim();
    }

    // Modal Helper
    function showModal(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.display = 'flex';
      el.classList.add('open');
    }
    function hideModal(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('open');
      el.style.display = 'none';
    }
    const openModal = showModal;
    const closeModal = hideModal;

    // ─── Custom Styled Dialog Helpers (GlobalConfirmModal) ────
    // Universal confirm & prompt dialogs are provided by /global-components/confirm-modal/confirm-modal.js
    // window.showStyledConfirm and window.showStyledPrompt delegate directly to GlobalConfirmModal.


    // ─── Bootstrap ────────────────────────────────────────────
    var facultyRosterFilter = null;

    function initFacultyRosterFilter() {
      if (typeof GlobalRosterFilter === 'undefined') return;
      const container = document.getElementById('fac-roster-section');
      if (!container) return;

      facultyRosterFilter = GlobalRosterFilter.create({
        container: container,
        idPrefix: 'faculty',
        searchPlaceholder: 'Search by name, email, employee ID...',
        departments: departments,
        chips: [
          { id: 'ALL', label: 'All', count: 0 },
          { id: 'TEACHER', label: 'Teachers', count: 0 },
          { id: 'HOD', label: 'HODs', count: 0 },
          { id: 'COMMON', label: 'Common', count: 0 },
          { id: 'ACTIVE', label: 'Active', count: 0 },
          { id: 'INACTIVE', label: 'Inactive', count: 0 }
        ],
        onFilterChange: function (filters) {
          facultySearchQuery = filters.search || '';
          activeFacultyDeptFilter = filters.dept || 'ALL';
          activeFacultyRoleFilter = filters.chip || 'ALL';
          applyFacultyFilters();
        }
      });
    }

    (async function init() {
      initFacultyRosterFilter();
      await loadDepartments();
      await loadAllFaculty();
      await loadHODs();
      await loadTrashCount();
    })();

    // ─── All Registered Faculty Roster ─────────────────────────
    async function loadAllFaculty() {
      try {
        const r = await apiFetch(`${API}/admin/teachers`);
        allFacultyList = (r.data || []).filter(f => {
          if (!f) return false;
          const roles = String(f.roles || '');
          const emp = String(f.employee_id || '');
          const email = String(f.gmail || f.email || '');
          const name = String(f.full_name || '');
          if (roles.includes('SYSTEM_ADMIN') || emp === 'ADMIN-01' || email === 'admin@gmail.com' || name.toLowerCase().includes('system administrator')) {
            return false;
          }
          return true;
        });
        updateFacultyCounters();
        populateFacultyDeptFilter();
        applyFacultyFilters();
      } catch (e) {
        console.error('Failed to load faculty roster:', e);
        const wrap = document.getElementById('faculty-table-wrap');
        const mwrap = document.getElementById('faculty-mobile-cards-wrap');
        const errHtml = `<div style="text-align: center; padding: 2rem; color: var(--status-absent);">Failed to load faculty roster: ${escHtml(e.message)}</div>`;
        if (wrap) wrap.innerHTML = errHtml;
        if (mwrap) mwrap.innerHTML = errHtml;
      }
    }

    function updateFacultyCounters() {
      const total = allFacultyList.length;
      const hods = allFacultyList.filter(f => f.is_hod).length;

      const elTotal = document.getElementById('kpi-total-faculty');
      const elHods = document.getElementById('kpi-active-hods');

      if (elTotal) elTotal.textContent = total;
      if (elHods) elHods.textContent = hods;

      const deptCodes = ['CE', 'ECE', 'EE', 'IT', 'ME', 'PHARM'];
      deptCodes.forEach(code => {
        const el = document.getElementById(`kpi-dept-${code}`);
        if (el) {
          const count = allFacultyList.filter(f => 
            (f.department_code && f.department_code.toUpperCase() === code) ||
            (departments && departments.some(d => d.code && d.code.toUpperCase() === code && d.id === f.department_id))
          ).length;
          el.textContent = count;
        }
      });
    }

    function populateFacultyDeptFilter() {
      const sel = document.getElementById('faculty-dept-filter');
      if (!sel) return;
      const current = sel.value;
      sel.innerHTML = '<option value="ALL">All Departments</option>';
      if (!departments || departments.length === 0) return;
      departments.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.name} (${d.code})`;
        if (String(d.id) === String(current)) opt.selected = true;
        sel.appendChild(opt);
      });
    }

    function handleFacultySearch() {
      const input = document.getElementById('faculty-search-input');
      facultySearchQuery = (input ? input.value : '').trim().toLowerCase();
      applyFacultyFilters();
    }
    window.handleFacultySearch = handleFacultySearch;

    function handleFacultyFilterChange() {
      const sel = document.getElementById('faculty-dept-filter');
      activeFacultyDeptFilter = sel ? sel.value : 'ALL';
      applyFacultyFilters();
    }
    window.handleFacultyFilterChange = handleFacultyFilterChange;

    var currentFacultyMainTab = 'directory';

    function switchFacultyMainTab(tab) {
      currentFacultyMainTab = 'directory';
      applyFacultyFilters();
    }
    window.switchFacultyMainTab = switchFacultyMainTab;

    function setFacultyRoleFilter(role) {
      activeFacultyRoleFilter = role;
      const chips = document.querySelectorAll('.fac-chips-row .fac-filter-chip');
      chips.forEach(chip => {
        if (chip.getAttribute('data-role') === role) chip.classList.add('active');
        else chip.classList.remove('active');
      });
      applyFacultyFilters();
    }
    window.setFacultyRoleFilter = setFacultyRoleFilter;

    function applyFacultyFilters() {
      let list = allFacultyList.slice();

      // Update chip counts
      const cAll = list.length;
      const cTeachers = list.filter(f => !f.is_hod && f.department_id !== null && f.department_id !== undefined && f.department_code !== 'COMMON').length;
      const cHods = list.filter(f => f.is_hod).length;
      const cCommon = list.filter(f => !f.department_id || f.department_id === null || f.department_code === 'COMMON' || f.department_name === 'Common').length;
      const cActive = list.filter(f => f.status === 'ACTIVE').length;
      const cInactive = list.filter(f => f.status === 'INACTIVE').length;

      const elCAll = document.getElementById('chip-count-all');
      const elCTeachers = document.getElementById('chip-count-teachers');
      const elCHods = document.getElementById('chip-count-hods');
      const elCCommon = document.getElementById('chip-count-common');
      const elCActive = document.getElementById('chip-count-active');
      const elCInactive = document.getElementById('chip-count-inactive');

      if (elCAll) elCAll.textContent = cAll;
      if (elCTeachers) elCTeachers.textContent = cTeachers;
      if (elCHods) elCHods.textContent = cHods;
      if (elCCommon) elCCommon.textContent = cCommon;
      if (elCActive) elCActive.textContent = cActive;
      if (elCInactive) elCInactive.textContent = cInactive;

      if (facultyRosterFilter) {
        facultyRosterFilter.updateChips([
          { id: 'ALL', label: 'All', count: cAll },
          { id: 'TEACHER', label: 'Teachers', count: cTeachers },
          { id: 'HOD', label: 'HODs', count: cHods },
          { id: 'COMMON', label: 'Common', count: cCommon },
          { id: 'ACTIVE', label: 'Active', count: cActive },
          { id: 'INACTIVE', label: 'Inactive', count: cInactive }
        ]);
      }

      // Filter by department
      if (activeFacultyDeptFilter !== 'ALL') {
        list = list.filter(f => String(f.department_id) === String(activeFacultyDeptFilter));
      }

      // Filter by role chip
      if (activeFacultyRoleFilter === 'TEACHER') {
        list = list.filter(f => !f.is_hod && f.department_id !== null && f.department_code !== 'COMMON');
      } else if (activeFacultyRoleFilter === 'HOD') {
        list = list.filter(f => f.is_hod);
      } else if (activeFacultyRoleFilter === 'COMMON') {
        list = list.filter(f => !f.department_id || f.department_id === null || f.department_code === 'COMMON' || f.department_name === 'Common');
      } else if (activeFacultyRoleFilter === 'ACTIVE') {
        list = list.filter(f => f.status === 'ACTIVE');
      } else if (activeFacultyRoleFilter === 'INACTIVE') {
        list = list.filter(f => f.status === 'INACTIVE');
      }

      // Search query
      if (facultySearchQuery) {
        list = list.filter(f => {
          const name = (f.full_name || '').toLowerCase();
          const email = (f.gmail || '').toLowerCase();
          const emp = (f.employee_id || '').toLowerCase();
          const dept = (f.department_name || '').toLowerCase();
          const code = (f.department_code || '').toLowerCase();
          return name.includes(facultySearchQuery) ||
                 email.includes(facultySearchQuery) ||
                 emp.includes(facultySearchQuery) ||
                 dept.includes(facultySearchQuery) ||
                 code.includes(facultySearchQuery);
        });
      }

      // Sort: Active faculty first, Inactive/Suspended faculty last. Within same status, alphabetical by name.
      list.sort((a, b) => {
        const aInactive = (a.status !== 'ACTIVE') ? 1 : 0;
        const bInactive = (b.status !== 'ACTIVE') ? 1 : 0;
        if (aInactive !== bInactive) return aInactive - bInactive;
        return (a.full_name || '').localeCompare(b.full_name || '');
      });

      filteredFacultyList = list;
      renderAllFaculty();
    }

    function renderAllFaculty() {
      const wrap = document.getElementById('faculty-table-wrap');
      const mwrap = document.getElementById('faculty-mobile-cards-wrap');

      if (!filteredFacultyList.length) {
        const emptyHtml = `
          <div class="fac-empty-state">
            <div class="fac-empty-state-icon"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></div>
            <p class="fac-empty-state-title">No faculty members found</p>
            <p class="fac-empty-state-sub">Try modifying your search or filter criteria, or click "+ Add Faculty".</p>
          </div>`;
        if (wrap) wrap.innerHTML = emptyHtml;
        if (mwrap) mwrap.innerHTML = emptyHtml;
        return;
      }

      // Desktop Table
      if (wrap) {
        wrap.innerHTML = `
          <table class="fac-table">
            <thead>
              <tr>
                <th>Faculty Member</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredFacultyList.map(f => {
                const initial = (f.full_name || 'F').charAt(0).toUpperCase();
                const isCommon = !f.department_id || f.department_code === 'COMMON' || f.department_name === 'Common';
                const deptObj = departments.find(d => d.id === f.department_id || d.code === f.department_code);
                const deptShort = isCommon ? 'COMMON' : (f.department_code || (deptObj ? deptObj.code : (f.department_name ? f.department_name.split(' ').map(w => w[0]).join('').toUpperCase() : '—')));

                let roleBadge = '<span class="fac-role-pill fac-role-teacher">Faculty</span>';
                if (f.is_hod) {
                  roleBadge = '<span class="fac-role-pill fac-role-hod">HOD</span>';
                } else if (isCommon) {
                  roleBadge = '<span class="fac-role-pill fac-role-cfm" style="background:rgba(16,185,129,0.12);color:#059669;border-color:rgba(16,185,129,0.25);">Common</span>';
                }

                const isInactive = f.status !== 'ACTIVE';
                const statusBadge = !isInactive
                  ? `<span class="fac-status-pill active"><span class="fac-status-dot"></span>Active</span>`
                  : `<span class="fac-status-pill inactive"><span class="fac-status-dot"></span>Inactive</span>`;

                return `
                  <tr class="${isInactive ? 'fac-row-inactive' : ''}">
                    <td>
                      <div class="fac-user-cell">
                        <div class="fac-avatar">${initial}</div>
                        <div>
                          <div class="fac-user-name">${escHtml(cleanFacultyDisplayName(f.full_name))}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="fac-empid-pill">${f.employee_id ? escHtml(f.employee_id) : '—'}</span>
                    </td>
                    <td>
                      <span class="fac-dept-badge">${escHtml(deptShort)}</span>
                    </td>
                    <td>
                      ${roleBadge}
                    </td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right; position: relative;">
                      <div class="fac-kebab-wrap" style="display: inline-flex; justify-content: flex-end;">
                        <button type="button" class="fac-kebab-btn" aria-label="Faculty options" onclick="toggleFacultyKebabMenu(${f.teacher_id}, event)">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                        </button>
                        <div class="fac-kebab-menu" id="fac-kebab-menu-table-${f.teacher_id}">
                          <button type="button" class="fac-kebab-item" onclick="handleFacultyAction('view', ${f.teacher_id}, event)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            <span>View Details</span>
                          </button>
                          <button type="button" class="fac-kebab-item" onclick="handleFacultyAction('edit', ${f.teacher_id}, event)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                            <span>Edit Profile</span>
                          </button>
                          <button type="button" class="fac-kebab-item" onclick="openResetFacultyPasswordModal(${f.teacher_id}, '${escHtml(f.full_name)}', '${escHtml(f.gmail)}'); closeAllKebabMenus();">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            <span>Reset Password</span>
                          </button>
                          <button type="button" class="fac-kebab-item primary" onclick="openAssignHodForTeacher(${f.teacher_id}, '${escHtml(f.full_name)}', ${f.department_id || 'null'}, '${escHtml(f.department_name || '')}'); closeAllKebabMenus();">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                            <span>Assign HOD</span>
                          </button>
                          <div class="fac-kebab-divider"></div>
                          <button type="button" class="fac-kebab-item ${f.status === 'ACTIVE' ? 'warning' : 'primary'}" onclick="openSuspendSafetyModal(${f.teacher_id}, '${escHtml(f.full_name)}', '${f.status}'); closeAllKebabMenus();">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                            <span>${f.status === 'ACTIVE' ? 'Suspend Faculty' : 'Activate Faculty'}</span>
                          </button>
                          <button type="button" class="fac-kebab-item danger" onclick="openRemoveSafetyModal(${f.teacher_id}, '${escHtml(f.full_name)}'); closeAllKebabMenus();">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            <span>Remove (Move to Trash)</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
      }

      // Mobile Minimal Cards (profile, name, 3-dot menu | short dept subtext)
      if (mwrap) {
        mwrap.innerHTML = filteredFacultyList.map(f => {
          const initial = (f.full_name || 'F').charAt(0).toUpperCase();
          const isCommon = !f.department_id || f.department_code === 'COMMON' || f.department_name === 'Common';
          const deptObj = departments.find(d => d.id === f.department_id || d.code === f.department_code);
          const deptShort = isCommon ? 'COMMON' : (f.department_code || (deptObj ? deptObj.code : (f.department_name ? f.department_name.split(' ').map(w => w[0]).join('').toUpperCase() : 'GEN')));
          const isInactive = f.status !== 'ACTIVE';

          return `
            <div class="global-mini-card fac-mini-card ${isInactive ? 'fac-card-inactive' : ''}" data-id="${f.teacher_id}">
              <div class="global-mini-main fac-mini-main">
                <div class="global-mini-avatar fac-mini-avatar">${initial}</div>
                <div class="global-mini-info fac-mini-info">
                  <div class="global-mini-name-row fac-mini-name-row">
                    <span class="global-mini-name fac-mini-name">${escHtml(cleanFacultyDisplayName(f.full_name))}</span>
                    ${f.is_hod ? '<span class="global-mini-badge fac-mini-badge hod">HOD</span>' : ''}
                    ${isCommon ? '<span class="global-mini-badge fac-mini-badge" style="background:rgba(16,185,129,0.15);color:#059669;font-weight:600;">Common</span>' : ''}
                    ${isInactive ? '<span class="global-mini-badge fac-mini-badge suspended">Suspended</span>' : ''}
                  </div>
                  <div class="global-mini-subtext fac-mini-subtext">
                    <span class="fac-dept-code">${escHtml(deptShort)}</span>
                    <span class="global-sub-dot fac-sub-dot">•</span>
                    <span class="fac-empid-sub">${f.employee_id ? escHtml(f.employee_id) : 'EMP#' + f.teacher_id}</span>
                  </div>
                </div>
              </div>
              <div class="global-kebab-wrap fac-kebab-wrap">
                <button type="button" class="global-kebab-btn fac-kebab-btn" aria-label="Faculty options" onclick="toggleFacultyKebabMenu(${f.teacher_id}, event)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                </button>
                <div class="global-kebab-menu fac-kebab-menu" id="fac-kebab-menu-${f.teacher_id}">
                  <button type="button" class="global-kebab-item fac-kebab-item" onclick="handleFacultyAction('view', ${f.teacher_id}, event)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span>View Details</span>
                  </button>
                  <button type="button" class="global-kebab-item fac-kebab-item" onclick="handleFacultyAction('edit', ${f.teacher_id}, event)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    <span>Edit Profile</span>
                  </button>
                  <button type="button" class="global-kebab-item fac-kebab-item" onclick="openResetFacultyPasswordModal(${f.teacher_id}, '${escHtml(f.full_name)}', '${escHtml(f.gmail)}'); closeAllKebabMenus();">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    <span>Reset Password</span>
                  </button>
                  <button type="button" class="global-kebab-item fac-kebab-item primary" onclick="openAssignHodForTeacher(${f.teacher_id}, '${escHtml(f.full_name)}', ${f.department_id || 'null'}, '${escHtml(f.department_name || '')}'); closeAllKebabMenus();">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                    <span>Assign HOD</span>
                  </button>
                  <div class="global-kebab-divider fac-kebab-divider"></div>
                  <button type="button" class="global-kebab-item fac-kebab-item ${f.status === 'ACTIVE' ? 'warning' : 'primary'}" onclick="openSuspendSafetyModal(${f.teacher_id}, '${escHtml(f.full_name)}', '${f.status}'); closeAllKebabMenus();">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                    <span>${f.status === 'ACTIVE' ? 'Suspend Faculty' : 'Activate Faculty'}</span>
                  </button>
                  <button type="button" class="global-kebab-item fac-kebab-item danger" onclick="openRemoveSafetyModal(${f.teacher_id}, '${escHtml(f.full_name)}'); closeAllKebabMenus();">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span>Remove (Move to Trash)</span>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }


    // ─── Faculty Management Handlers ───────────────────────────
    function openAddFacultyModal() {
      populateDeptDropdown('add-fac-dept');
      document.getElementById('add-fac-name').value = '';
      document.getElementById('add-fac-email').value = '';
      document.getElementById('add-fac-employee-id').value = '';
      document.getElementById('add-fac-phone').value = '';
      document.getElementById('add-fac-password').value = 'Password@123';
      document.getElementById('add-fac-role').value = 'TEACHER';
      const err = document.getElementById('add-fac-error');
      if (err) { err.style.display = 'none'; err.textContent = ''; }
      showModal('add-faculty-modal');
    }
    function closeAddFacultyModal() {
      hideModal('add-faculty-modal');
    }
    window.openAddFacultyModal = openAddFacultyModal;
    window.closeAddFacultyModal = closeAddFacultyModal;

    async function submitAddFaculty(e) {
      if (e) e.preventDefault();
      const btn = document.getElementById('btn-submit-add-fac');
      const err = document.getElementById('add-fac-error');
      if (err) err.style.display = 'none';

      const fullName = document.getElementById('add-fac-name').value.trim();
      const email = document.getElementById('add-fac-email').value.trim();
      const employeeId = document.getElementById('add-fac-employee-id').value.trim();
      const phone = document.getElementById('add-fac-phone').value.trim();
      const departmentId = document.getElementById('add-fac-dept').value;
      const role = document.getElementById('add-fac-role').value;
      const password = document.getElementById('add-fac-password').value;

      if (!fullName || !email || !password) {
        if (err) {
          err.textContent = 'Please fill in all required fields.';
          err.style.display = 'block';
        }
        return;
      }

      try {
        if (btn) { btn.disabled = true; btn.textContent = 'Registering...'; }
        const res = await apiFetch(`${API}/admin/teachers`, {
          method: 'POST',
          body: JSON.stringify({
            full_name: fullName,
            email,
            employee_id: employeeId,
            phone,
            department_id: departmentId ? parseInt(departmentId, 10) : null,
            role,
            password
          })
        });

        if (res && res.success) {
          closeAddFacultyModal();
          showToast(res.message || 'Faculty registered successfully!', 'success');
          await loadAllFaculty();
          await loadHODs();
        } else {
          throw new Error(res.message || 'Failed to create faculty');
        }
      } catch (ex) {
        if (err) {
          err.textContent = ex.message || 'Error creating faculty.';
          err.style.display = 'block';
        }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Create & Register Faculty'; }
      }
    }
    window.submitAddFaculty = submitAddFaculty;

    // ─── Unified Global Profile Modal (View & Edit) ───────────
    function handleFacultyAction(action, id, event) {
      if (event) {
        event.stopPropagation();
      }
      closeAllKebabMenus();
      setTimeout(() => {
        if (action === 'view') {
          openViewFacultyModal(id);
        } else if (action === 'edit') {
          openEditFacultyModal(id);
        }
      }, 35);
    }
    window.handleFacultyAction = handleFacultyAction;

    function openFacultyProfileModal(id, initialMode = 'view') {
      const fac = allFacultyList.find(f => Number(f.teacher_id) === Number(id));
      if (!fac) {
        console.warn('Faculty not found for id:', id);
        return;
      }

      if (typeof GlobalProfileModal === 'undefined') {
        console.error('GlobalProfileModal not loaded');
        return;
      }

      GlobalProfileModal.open({
        type: 'FACULTY',
        mode: initialMode,
        title: 'Faculty Profile',
        data: {
          id: fac.teacher_id,
          name: cleanFacultyDisplayName(fac.full_name),
          identifierLabel: 'Employee ID',
          identifier: fac.employee_id || '—',
          email: fac.gmail || '—',
          phone: fac.phone || '—',
          departmentLabel: 'Primary Department',
          departmentId: fac.department_id,
          departmentName: fac.department_name || 'Unassigned',
          departmentCode: fac.department_code || '—',
          status: fac.status || 'ACTIVE'
        },
        departments: departments,
        canEdit: true,
        onSave: async (updated) => {
          const res = await apiFetch(`${API}/admin/teachers/${fac.teacher_id}`, {
            method: 'PUT',
            body: JSON.stringify({
              full_name: updated.name,
              employee_id: updated.identifier,
              phone: updated.phone,
              department_id: updated.departmentId ? parseInt(updated.departmentId, 10) : undefined,
              status: updated.status
            })
          });

          if (res && res.success) {
            showToast(res.message || 'Faculty profile updated!', 'success');
            await loadAllFaculty();
            await loadHODs();
          } else {
            throw new Error(res?.message || 'Failed to update faculty');
          }
        }
      });
    }

    function openViewFacultyModal(id) {
      openFacultyProfileModal(id, 'view');
    }
    function openEditFacultyModal(id) {
      openFacultyProfileModal(id, 'edit');
    }
    function closeEditFacultyModal() {
      if (typeof GlobalProfileModal !== 'undefined') GlobalProfileModal.close();
    }
    function closeViewFacultyModal() {
      if (typeof GlobalProfileModal !== 'undefined') GlobalProfileModal.close();
    }

    window.openFacultyProfileModal = openFacultyProfileModal;
    window.openViewFacultyModal = openViewFacultyModal;
    window.openEditFacultyModal = openEditFacultyModal;
    window.closeEditFacultyModal = closeEditFacultyModal;
    window.closeViewFacultyModal = closeViewFacultyModal;

    async function toggleFacultyStatus(id, name, currentStatus) {
      const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      try {
        const res = await apiFetch(`${API}/admin/teachers/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus })
        });
        if (res && res.success) {
          showToast(res.message || `Faculty status updated to ${nextStatus}`, 'success');
          await loadAllFaculty();
          await loadHODs();
        } else {
          throw new Error(res.message || 'Failed to toggle status');
        }
      } catch (err) {
        showToast(err.message || 'Error updating status', 'error');
      }
    }
    window.toggleFacultyStatus = toggleFacultyStatus;

    function openResetFacultyPasswordModal(id, name, email) {
      document.getElementById('reset-fac-id').value = id;
      document.getElementById('reset-fac-target-name').textContent = name || 'Faculty';
      document.getElementById('reset-fac-target-email').textContent = email || '';
      document.getElementById('reset-fac-new-password').value = 'Password@123';
      const err = document.getElementById('reset-fac-error');
      if (err) { err.style.display = 'none'; err.textContent = ''; }
      showModal('reset-faculty-password-modal');
    }
    function closeResetFacultyPasswordModal() {
      hideModal('reset-faculty-password-modal');
    }
    window.openResetFacultyPasswordModal = openResetFacultyPasswordModal;
    window.closeResetFacultyPasswordModal = closeResetFacultyPasswordModal;

    async function submitResetFacultyPassword(e) {
      if (e) e.preventDefault();
      const id = document.getElementById('reset-fac-id').value;
      const newPassword = document.getElementById('reset-fac-new-password').value;
      const btn = document.getElementById('btn-submit-reset-fac');
      const err = document.getElementById('reset-fac-error');
      if (err) err.style.display = 'none';

      if (!newPassword) {
        if (err) { err.textContent = 'Password is required.'; err.style.display = 'block'; }
        return;
      }

      try {
        if (btn) { btn.disabled = true; btn.textContent = 'Resetting...'; }
        const res = await apiFetch(`${API}/admin/teachers/${id}/reset-password`, {
          method: 'POST',
          body: JSON.stringify({ new_password: newPassword })
        });

        if (res && res.success) {
          closeResetFacultyPasswordModal();
          showToast(res.message || 'Password reset successfully!', 'success');
        } else {
          throw new Error(res.message || 'Failed to reset password');
        }
      } catch (ex) {
        if (err) {
          err.textContent = ex.message || 'Error resetting password.';
          err.style.display = 'block';
        }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Confirm Password Reset'; }
      }
    }
    window.submitResetFacultyPassword = submitResetFacultyPassword;





    // ─── Load Departments ─────────────────────────────────────
    async function loadDepartments() {
      try {
        const r = await apiFetch(`${API}/admin/hierarchy`);
        let list = [];
        if (Array.isArray(r.data)) {
          list = r.data;
        } else if (r.data && Array.isArray(r.data.departments)) {
          list = r.data.departments;
        } else if (Array.isArray(r.departments)) {
          list = r.departments;
        } else if (Array.isArray(r)) {
          list = r;
        }

        // Secondary fallback to /auth/departments if empty
        if (!list || list.length === 0) {
          try {
            const authR = await apiFetch(`${API}/auth/departments`);
            if (Array.isArray(authR.data)) list = authR.data;
            else if (authR.data && Array.isArray(authR.data.departments)) list = authR.data.departments;
            else if (Array.isArray(authR)) list = authR;
          } catch (_) {}
        }

        departments = list || [];
        populateDeptDropdown('hod-dept');
        populateDeptDropdown('assign-existing-dept');
        populateDeptDropdown('reassign-dept');
        populateDeptDropdown('add-fac-dept');
        populateDeptDropdown('edit-fac-dept');
        populateFacultyDeptFilter();
        if (facultyRosterFilter) {
          facultyRosterFilter.updateDepartments(departments);
        }
      } catch (e) {
        console.error('Failed to load departments from hierarchy, trying fallback:', e);
        try {
          const authR = await apiFetch(`${API}/auth/departments`);
          departments = Array.isArray(authR.data) ? authR.data : [];
          populateDeptDropdown('hod-dept');
          populateDeptDropdown('assign-existing-dept');
          populateDeptDropdown('reassign-dept');
          populateDeptDropdown('add-fac-dept');
          populateDeptDropdown('edit-fac-dept');
          populateFacultyDeptFilter();
        } catch (_) {}
      }
    }

    function populateDeptDropdown(selectId) {
      const sel = document.getElementById(selectId);
      if (!sel) return;
      const current = sel.value;
      sel.innerHTML = '<option value="">— Select Department —</option>';
      if (!departments || departments.length === 0) return;
      departments.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.name} (${d.code})`;
        if (String(d.id) === String(current)) opt.selected = true;
        sel.appendChild(opt);
      });
    }

    // ─── Load HODs ────────────────────────────────────────────
    async function loadHODs() {
      try {
        const r = await apiFetch(`${API}/admin/hods`);
        hodData = r.data || [];
        updateFacultyCounters();
      } catch (e) {
        console.warn('Failed to load HODs:', e);
      }
    }

    // ─── Helpers ──────────────────────────────────────────────
    function escHtml(str) {
      return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function fmtDate(d) {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    async function apiFetch(url, opts = {}) {
      const token = localStorage.getItem('access_token');
      const r = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...opts
      });
      const data = await r.json();
      if (!r.ok || !data.success) throw new Error(data?.error?.message || `HTTP ${r.status}`);
      return data;
    }
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.fac-kebab-wrap')) {
        closeAllKebabMenus();
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeAllKebabMenus();
      }
    });

    // ─── Minimal Cards & Desktop Table 3-Dot Kebab Handlers ───
    function toggleFacultyKebabMenu(teacherId, event) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      const btn = event ? (event.currentTarget || event.target.closest('.fac-kebab-btn')) : null;
      const wrap = btn ? btn.closest('.fac-kebab-wrap') : null;
      const tr = btn ? btn.closest('tr') : null;
      const miniCard = btn ? btn.closest('.fac-mini-card') : null;
      const targetMenu = (wrap ? wrap.querySelector('.fac-kebab-menu') : null) ||
                         document.getElementById(`fac-kebab-menu-table-${teacherId}`) ||
                         document.getElementById(`fac-kebab-menu-${teacherId}`);
      const wasOpen = targetMenu && targetMenu.classList.contains('open');

      closeAllKebabMenus();

      if (targetMenu && !wasOpen) {
        const refElem = wrap || targetMenu;
        const rect = refElem.getBoundingClientRect();

        // 1. Check if row or card is among the bottom items
        let isNearBottom = false;
        if (tr && tr.parentElement) {
          const allRows = Array.from(tr.parentElement.querySelectorAll('tr'));
          const idx = allRows.indexOf(tr);
          if (idx >= Math.max(0, allRows.length - 2)) {
            isNearBottom = true;
          }
        } else if (miniCard && miniCard.parentElement) {
          const allCards = Array.from(miniCard.parentElement.querySelectorAll('.fac-mini-card'));
          const idx = allCards.indexOf(miniCard);
          if (idx >= Math.max(0, allCards.length - 2)) {
            isNearBottom = true;
          }
        }

        // 2. Check distance to container bottom and viewport bottom
        const card = (wrap || btn).closest('.fac-section-card, .fac-table-wrap, table');
        const cardBottom = card ? card.getBoundingClientRect().bottom : window.innerHeight;
        const spaceBelowCard = cardBottom - rect.bottom;
        const spaceBelowViewport = window.innerHeight - rect.bottom;
        const estimatedMenuHeight = 220;

        // Dropup condition: flip upwards if near bottom or if clearance below is limited,
        // provided there is sufficient room above the trigger
        if ((isNearBottom || spaceBelowCard < estimatedMenuHeight || spaceBelowViewport < estimatedMenuHeight) && rect.top > (estimatedMenuHeight + 50)) {
          targetMenu.classList.add('dropup');
        } else {
          targetMenu.classList.remove('dropup');
        }

        targetMenu.classList.add('open');
        if (wrap) wrap.classList.add('menu-open');
        if (tr) tr.classList.add('row-kebab-open');
        if (miniCard) miniCard.classList.add('menu-open');
      }
    }
    function closeAllKebabMenus() {
      document.querySelectorAll('.fac-kebab-menu.open').forEach(m => {
        m.classList.remove('open');
        m.classList.remove('dropup');
      });
      document.querySelectorAll('.fac-kebab-wrap.menu-open').forEach(w => w.classList.remove('menu-open'));
      document.querySelectorAll('tr.row-kebab-open').forEach(r => r.classList.remove('row-kebab-open'));
      document.querySelectorAll('.fac-mini-card.menu-open').forEach(c => c.classList.remove('menu-open'));
    }
    window.toggleFacultyKebabMenu = toggleFacultyKebabMenu;
    window.closeAllKebabMenus = closeAllKebabMenus;

    // ─── Safety Confirmation: Suspend Faculty (Type SUSPEND) ─────
    function openSuspendSafetyModal(id, name, currentStatus) {
      const isSuspending = currentStatus === 'ACTIVE';
      const nextStatus = isSuspending ? 'INACTIVE' : 'ACTIVE';
      const cleanName = escHtml(cleanFacultyDisplayName(name));

      GlobalConfirmModal.open({
        variant: isSuspending ? 'warning' : 'primary',
        icon: isSuspending ? 'warning' : 'info',
        title: isSuspending ? 'Confirm Account Suspension' : 'Confirm Account Activation',
        message: isSuspending
          ? `You are about to suspend <strong>${cleanName}</strong>. Login access will be blocked immediately.`
          : `You are about to reactivate <strong>${cleanName}</strong>. Login access will be restored immediately.`,
        confirmKeyword: isSuspending ? 'SUSPEND' : '',
        confirmText: isSuspending ? 'Suspend Faculty' : 'Activate Faculty',
        loadingText: 'Updating...',
        onConfirm: async () => {
          const res = await apiFetch(`${API}/admin/teachers/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus })
          });
          if (res && res.success) {
            showToast(res.message || `Faculty marked as ${nextStatus}`, 'success');
            await loadAllFaculty();
            await loadHODs();
          } else {
            throw new Error(res.message || 'Failed to update faculty status');
          }
        }
      });
    }
    window.openSuspendSafetyModal = openSuspendSafetyModal;

    // ─── Safety Confirmation: Remove to Trash (Type REMOVE) ──────
    function openRemoveSafetyModal(id, name) {
      const cleanName = escHtml(cleanFacultyDisplayName(name));

      GlobalConfirmModal.open({
        variant: 'danger',
        icon: 'trash',
        title: 'Move Faculty to Trash',
        message: `You are removing <strong>${cleanName}</strong>. The record will be moved to <strong>Trash</strong> with <strong>30-day recovery retention</strong> before permanent deletion.`,
        confirmKeyword: 'REMOVE',
        confirmText: 'Move to Trash',
        loadingText: 'Moving to Trash...',
        onConfirm: async () => {
          const res = await apiFetch(`${API}/admin/teachers/${id}`, {
            method: 'DELETE'
          });
          if (res && res.success) {
            showToast(res.message || 'Faculty moved to Trash (30 days retention)', 'success');
            await loadAllFaculty();
            await loadHODs();
            await loadTrashCount();
          } else {
            throw new Error(res.message || 'Failed to remove faculty');
          }
        }
      });
    }
    window.openRemoveSafetyModal = openRemoveSafetyModal;

    // ─── HOD ASSIGNMENT MODALS & FLOWS (SEARCH & TYPED CONFIRMATION) ───────────
    let selectedHodSearchCandidate = null;

    function populateHodTargetDeptDropdown(selectedDeptId) {
      const select = document.getElementById('hod-target-department');
      if (!select) return;
      select.innerHTML = '<option value="">— Choose Academic Department —</option>' + 
        departments.map(d => `<option value="${d.id}" ${selectedDeptId == d.id ? 'selected' : ''}>${escHtml(d.name)} (${escHtml(d.code)})</option>`).join('');
    }

    /**
     * Triggered from 3-dot kebab menu on any faculty card or row
     */
    function openAssignHodForTeacher(teacherId, name, deptId, deptName) {
      // Find candidate in allFacultyList
      const candidate = allFacultyList.find(f => f.teacher_id === teacherId) || { teacher_id: teacherId, full_name: name, department_id: deptId, department_name: deptName };
      
      // If department is known, prefill directly into confirmation modal
      if (candidate.department_id) {
        const deptObj = departments.find(d => d.id === candidate.department_id);
        const resolvedDeptName = deptObj ? deptObj.name : (deptName || 'Department');
        openAssignHodSafetyModal(candidate.teacher_id, candidate.full_name, candidate.department_id, resolvedDeptName);
      } else {
        // If department is unset, open search modal with this candidate preselected so admin picks department
        openSearchAssignHodModal();
        selectHodCandidate(candidate);
      }
    }
    window.openAssignHodForTeacher = openAssignHodForTeacher;

    /**
     * Search & Assign HOD Modal logic
     */
    function openSearchAssignHodModal() {
      selectedHodSearchCandidate = null;
      const input = document.getElementById('hod-search-input');
      const resultsWrap = document.getElementById('hod-search-results-list');
      const deptSection = document.getElementById('hod-assign-dept-section');
      const proceedBtn = document.getElementById('btn-proceed-to-confirm-hod');
      const errEl = document.getElementById('hod-search-assign-error');

      if (input) input.value = '';
      if (resultsWrap) {
        resultsWrap.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.82rem; padding: 1.5rem;">Type a name, email, employee ID, or phone to search faculty.</div>';
      }
      if (deptSection) deptSection.style.display = 'none';
      if (proceedBtn) proceedBtn.style.display = 'none';
      if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

      populateHodTargetDeptDropdown(null);
      showModal('search-assign-hod-modal');
      setTimeout(() => input && input.focus(), 100);
    }
    window.openSearchAssignHodModal = openSearchAssignHodModal;

    function closeSearchAssignHodModal() {
      hideModal('search-assign-hod-modal');
    }
    window.closeSearchAssignHodModal = closeSearchAssignHodModal;

    let hodSearchTimeout = null;
    function handleHodLiveSearch() {
      clearTimeout(hodSearchTimeout);
      hodSearchTimeout = setTimeout(async () => {
        const input = document.getElementById('hod-search-input');
        const query = input ? input.value.trim() : '';
        const resultsWrap = document.getElementById('hod-search-results-list');
        if (!resultsWrap) return;

        if (query.length < 1) {
          resultsWrap.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.82rem; padding: 1.5rem;">Type a name, email, employee ID, or phone to search faculty.</div>';
          return;
        }

        try {
          resultsWrap.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.82rem; padding: 1rem;">Searching faculty...</div>';
          const res = await apiFetch(`${API}/admin/faculty/search?search=${encodeURIComponent(query)}`);
          const list = (res && res.data) ? res.data : [];

          if (!list.length) {
            resultsWrap.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.82rem; padding: 1.5rem;">No faculty found matching "' + escHtml(query) + '".</div>';
            return;
          }

          resultsWrap.innerHTML = list.map(f => {
            const initial = (f.full_name || 'F').charAt(0).toUpperCase();
            const deptText = f.department_name ? `${f.department_name} (${f.department_code})` : 'Cross-Department / Common';
            const empText = f.employee_id ? `ID: ${f.employee_id}` : 'No EMP ID';
            const phoneText = f.phone ? ` • 📞 ${f.phone}` : '';
            const emailText = f.email || '';
            const isHod = f.is_current_hod ? '<span style="background: rgba(245, 158, 11, 0.15); color: #d97706; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; margin-left: 0.4rem;">Current HOD</span>' : '';

            return `
              <div class="hod-search-item" onclick="selectHodCandidate(${JSON.stringify(f).replace(/"/g, '&quot;')})">
                <div class="hod-candidate-details">
                  <div class="hod-candidate-avatar">${initial}</div>
                  <div>
                    <div class="hod-candidate-name">${escHtml(cleanFacultyDisplayName(f.full_name))} ${isHod}</div>
                    <div class="hod-candidate-meta"><span>${escHtml(deptText)}</span> • <span style="font-family: monospace;">${escHtml(emailText)}</span> • <span>${escHtml(empText)}</span>${escHtml(phoneText)}</div>
                  </div>
                </div>
                <div>
                  <button type="button" class="btn btn-secondary btn-xs" style="pointer-events: none;">Select</button>
                </div>
              </div>
            `;
          }).join('');
        } catch (err) {
          resultsWrap.innerHTML = `<div style="text-align: center; color: var(--status-absent); font-size: 0.82rem; padding: 1rem;">Search error: ${escHtml(err.message)}</div>`;
        }
      }, 250);
    }
    window.handleHodLiveSearch = handleHodLiveSearch;

    function selectHodCandidate(candidate) {
      selectedHodSearchCandidate = candidate;
      const deptSection = document.getElementById('hod-assign-dept-section');
      const cardEl = document.getElementById('selected-hod-candidate-card');
      const proceedBtn = document.getElementById('btn-proceed-to-confirm-hod');

      if (!deptSection || !cardEl) return;

      const initial = (candidate.full_name || 'F').charAt(0).toUpperCase();
      const empText = candidate.employee_id ? `EMP ID: ${candidate.employee_id}` : '';
      const emailText = candidate.email || candidate.gmail || '';

      cardEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.65rem; background: var(--bg-card); padding: 0.65rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
          <div class="hod-candidate-avatar">${initial}</div>
          <div style="flex: 1;">
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main);">${escHtml(cleanFacultyDisplayName(candidate.full_name))}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escHtml(emailText)} ${empText ? '• ' + escHtml(empText) : ''}</div>
          </div>
        </div>
      `;

      populateHodTargetDeptDropdown(candidate.department_id);
      deptSection.style.display = 'block';
      if (proceedBtn) proceedBtn.style.display = 'inline-flex';
    }
    window.selectHodCandidate = selectHodCandidate;

    function proceedToConfirmHodAssignment() {
      if (!selectedHodSearchCandidate) return;
      const select = document.getElementById('hod-target-department');
      const errEl = document.getElementById('hod-search-assign-error');
      const deptId = select ? select.value : '';

      if (!deptId) {
        if (errEl) {
          errEl.textContent = 'Please select a department to assign this faculty as HOD.';
          errEl.style.display = 'block';
        }
        return;
      }

      const deptObj = departments.find(d => d.id == deptId);
      const deptName = deptObj ? deptObj.name : 'Department';

      closeSearchAssignHodModal();
      openAssignHodSafetyModal(selectedHodSearchCandidate.teacher_id, selectedHodSearchCandidate.full_name, deptId, deptName);
    }
    window.proceedToConfirmHodAssignment = proceedToConfirmHodAssignment;

    /**
     * Typed Safety Confirmation Modal for HOD Appointment
     */
    function openAssignHodSafetyModal(teacherId, name, deptId, deptName) {
      const cleanName = escHtml(cleanFacultyDisplayName(name));
      const cleanDept = escHtml(deptName || 'Selected Department');

      GlobalConfirmModal.open({
        variant: 'primary',
        icon: 'user',
        title: 'Confirm HOD Appointment',
        message: `You are appointing <strong>${cleanName}</strong> as Head of Department for <strong style="color: var(--color-primary, #2563eb);">${cleanDept}</strong>. This elevates their administrative authority.`,
        confirmKeyword: 'CONFIRM',
        confirmText: 'Confirm Appointment',
        loadingText: 'Appointing HOD...',
        onConfirm: async () => {
          const res = await apiFetch(`${API}/admin/hods/assign-existing`, {
            method: 'POST',
            body: JSON.stringify({
              teacher_id: parseInt(teacherId, 10),
              department_id: parseInt(deptId, 10)
            })
          });
          if (res && res.success) {
            showToast(res.message || `Successfully appointed ${cleanName} as HOD of ${cleanDept}!`, 'success');
            await loadAllFaculty();
            await loadHODs();
          } else {
            throw new Error(res.message || 'Failed to appoint HOD');
          }
        }
      });
    }
    window.openAssignHodSafetyModal = openAssignHodSafetyModal;

    // ─── Trash & Restore Handlers (30-day retention) ─────────────
    let trashFacultyList = [];

    async function loadTrashCount() {
      try {
        const res = await apiFetch(`${API}/admin/trash/faculty`);
        const count = (res && res.data) ? res.data.length : 0;
        const badge = document.getElementById('kpi-trash-count');
        if (badge) {
          badge.textContent = count;
          badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
      } catch (err) {
        console.warn('Failed to load trash count:', err);
      }
    }
    window.loadTrashCount = loadTrashCount;

    async function openTrashModal() {
      showModal('trash-faculty-modal');
      const listEl = document.getElementById('trash-list-container');
      const msgEl = document.getElementById('trash-status-msg');
      if (msgEl) msgEl.style.display = 'none';
      if (listEl) listEl.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading trash records...</div>';

      try {
        const res = await apiFetch(`${API}/admin/trash/faculty`);
        trashFacultyList = (res && res.data) ? res.data : [];
        renderTrashList();
        loadTrashCount();
      } catch (err) {
        if (listEl) {
          listEl.innerHTML = `<div style="text-align: center; color: var(--status-absent); padding: 2rem;">Failed to load trash: ${escHtml(err.message)}</div>`;
        }
      }
    }
    window.openTrashModal = openTrashModal;

    function closeTrashModal() {
      hideModal('trash-faculty-modal');
    }
    window.closeTrashModal = closeTrashModal;

    function renderTrashList() {
      const listEl = document.getElementById('trash-list-container');
      if (!listEl) return;

      if (!trashFacultyList || trashFacultyList.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem; opacity: 0.5;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">Trash is empty</div>
            <p style="font-size: 0.8rem; margin: 0.25rem 0 0 0;">No soft-deleted faculty within the 30-day retention window.</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = trashFacultyList.map(item => {
        const initial = (item.full_name || 'F').charAt(0).toUpperCase();
        const daysLeft = item.days_left != null ? item.days_left : 30;
        const isUrgent = daysLeft <= 5;
        return `
          <div class="trash-item-card">
            <div class="trash-item-left">
              <div class="trash-item-avatar">${initial}</div>
              <div class="trash-item-details">
                <div class="trash-item-name">${escHtml(cleanFacultyDisplayName(item.full_name))}</div>
                <div class="trash-item-meta">
                  <span>${escHtml(item.department_code || item.department_name || 'Unassigned')}</span>
                  <span>•</span>
                  <span style="font-family: monospace;">${escHtml(item.gmail)}</span>
                  <span>•</span>
                  <span>Deleted ${fmtDate(item.deleted_at)}</span>
                </div>
              </div>
            </div>
            <div class="trash-item-right">
              <span class="trash-countdown-pill ${isUrgent ? 'urgent' : ''}" title="${daysLeft} days until automatic permanent purge">
                ${daysLeft}d left
              </span>
              <button type="button" class="btn btn-secondary btn-xs" onclick="restoreFacultyRecord(${item.teacher_id})" title="Restore back to active faculty roster">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                <span>Restore</span>
              </button>
              <button type="button" class="btn btn-secondary btn-xs fac-btn-danger-outline" onclick="permanentDeleteFacultyRecord(${item.teacher_id}, '${escHtml(item.full_name)}')" title="Purge permanently from database">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    async function restoreFacultyRecord(teacherId) {
      try {
        const res = await apiFetch(`${API}/admin/trash/faculty/${teacherId}/restore`, {
          method: 'POST'
        });
        if (res && res.success) {
          showToast(res.message || 'Faculty restored successfully!', 'success');
          trashFacultyList = trashFacultyList.filter(x => x.teacher_id != teacherId);
          renderTrashList();
          await loadTrashCount();
          await loadAllFaculty();
          await loadHODs();
        } else {
          throw new Error(res.message || 'Failed to restore faculty');
        }
      } catch (err) {
        showToast(err.message || 'Error restoring faculty', 'error');
      }
    }
    window.restoreFacultyRecord = restoreFacultyRecord;

    async function permanentDeleteFacultyRecord(teacherId, name) {
      const ok = await showStyledConfirm({
        title: 'Permanently Purge Record',
        message: `Are you sure you want to permanently delete ${name}? This record CANNOT be restored.`,
        confirmText: 'Purge Forever',
        isDanger: true,
        icon: 'danger'
      });
      if (!ok) return;

      try {
        const res = await apiFetch(`${API}/admin/trash/faculty/${teacherId}/permanent`, {
          method: 'DELETE'
        });
        if (res && res.success) {
          showToast(res.message || 'Faculty permanently purged', 'info');
          trashFacultyList = trashFacultyList.filter(x => x.teacher_id != teacherId);
          renderTrashList();
          await loadTrashCount();
        } else {
          throw new Error(res.message || 'Failed to permanently delete faculty');
        }
      } catch (err) {
        showToast(err.message || 'Error permanently deleting faculty', 'error');
      }
    }
    window.permanentDeleteFacultyRecord = permanentDeleteFacultyRecord;



