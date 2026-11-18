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

    // ─── Custom Styled Dialog Helpers (Confirm & Prompt) ───────
    function showStyledConfirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false, icon = 'warning' }) {
      return new Promise((resolve) => {
        const modal = document.getElementById('custom-dialog-modal');
        const titleEl = document.getElementById('custom-dialog-title');
        const msgEl = document.getElementById('custom-dialog-message');
        const iconWrap = document.getElementById('custom-dialog-icon-wrap');
        const inputWrap = document.getElementById('custom-dialog-input-wrap');
        const confirmBtn = document.getElementById('custom-dialog-confirm-btn');
        const cancelBtn = document.getElementById('custom-dialog-cancel-btn');

        if (titleEl) titleEl.textContent = title || 'Confirm Action';
        if (msgEl) msgEl.textContent = message || '';
        if (inputWrap) inputWrap.style.display = 'none';

        if (confirmBtn) {
          confirmBtn.textContent = confirmText;
          confirmBtn.className = isDanger ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm';
        }
        if (cancelBtn) cancelBtn.textContent = cancelText;

        if (iconWrap) {
          if (isDanger || icon === 'danger') {
            iconWrap.className = 'fac-dialog-icon-wrap danger';
            iconWrap.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
          } else if (icon === 'warning') {
            iconWrap.className = 'fac-dialog-icon-wrap warning';
            iconWrap.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
          } else {
            iconWrap.className = 'fac-dialog-icon-wrap info';
            iconWrap.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
          }
        }

        const cleanup = () => {
          if (modal) modal.style.display = 'none';
          if (confirmBtn) confirmBtn.onclick = null;
          if (cancelBtn) cancelBtn.onclick = null;
        };

        if (confirmBtn) {
          confirmBtn.onclick = () => {
            cleanup();
            resolve(true);
          };
        }
        if (cancelBtn) {
          cancelBtn.onclick = () => {
            cleanup();
            resolve(false);
          };
        }

        if (modal) modal.style.display = 'flex';
      });
    }

    function showStyledPrompt({ title, message, defaultValue = '', placeholder = '', label = 'Reason', confirmText = 'Submit', cancelText = 'Cancel', isDanger = false }) {
      return new Promise((resolve) => {
        const modal = document.getElementById('custom-dialog-modal');
        const titleEl = document.getElementById('custom-dialog-title');
        const msgEl = document.getElementById('custom-dialog-message');
        const iconWrap = document.getElementById('custom-dialog-icon-wrap');
        const inputWrap = document.getElementById('custom-dialog-input-wrap');
        const inputEl = document.getElementById('custom-dialog-input');
        const labelEl = document.getElementById('custom-dialog-input-label');
        const confirmBtn = document.getElementById('custom-dialog-confirm-btn');
        const cancelBtn = document.getElementById('custom-dialog-cancel-btn');

        if (titleEl) titleEl.textContent = title || 'Input Required';
        if (msgEl) msgEl.textContent = message || '';
        if (labelEl) labelEl.textContent = label;
        if (inputEl) {
          inputEl.value = defaultValue;
          inputEl.placeholder = placeholder;
        }
        if (inputWrap) inputWrap.style.display = 'block';

        if (confirmBtn) {
          confirmBtn.textContent = confirmText;
          confirmBtn.className = isDanger ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm';
        }
        if (cancelBtn) cancelBtn.textContent = cancelText;

        if (iconWrap) {
          iconWrap.className = isDanger ? 'fac-dialog-icon-wrap danger' : 'fac-dialog-icon-wrap info';
          iconWrap.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
        }

        const cleanup = () => {
          if (modal) modal.style.display = 'none';
          if (confirmBtn) confirmBtn.onclick = null;
          if (cancelBtn) cancelBtn.onclick = null;
          if (inputEl) inputEl.onkeydown = null;
        };

        const handleConfirm = () => {
          const val = inputEl ? inputEl.value : '';
          cleanup();
          resolve(val);
        };

        if (confirmBtn) confirmBtn.onclick = handleConfirm;
        if (cancelBtn) {
          cancelBtn.onclick = () => {
            cleanup();
            resolve(null);
          };
        }
        if (inputEl) {
          inputEl.onkeydown = (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleConfirm();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cleanup();
              resolve(null);
            }
          };
        }

        if (modal) modal.style.display = 'flex';
        setTimeout(() => { if (inputEl) inputEl.focus(); }, 50);
      });
    }

    // ─── Tab Switching ─────────────────────────────────────────
    function switchFacultyTab(tabName) {
      activeFacultyTab = tabName;
      const tabs = ['all-faculty', 'hods', 'pending', 'governance'];
      tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        const pane = document.getElementById(`pane-${t}`);
        if (btn) {
          if (t === tabName) btn.classList.add('active');
          else btn.classList.remove('active');
        }
        if (pane) {
          pane.style.display = (t === tabName) ? 'block' : 'none';
        }
      });
    }
    window.switchFacultyTab = switchFacultyTab;

    // ─── Bootstrap ────────────────────────────────────────────
    (async function init() {
      await loadDepartments();
      await loadAllFaculty();
      await loadHODs();
      await loadRegistrationGates();
      await loadTrashCount();
      await loadPendingHods();
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

    var currentFacultyMainTab = 'directory'; // 'directory' | 'approvals'

    function switchFacultyMainTab(tab) {
      currentFacultyMainTab = (tab === 'approvals') ? 'approvals' : 'directory';
      const tabBtnDir = document.getElementById('tab-btn-directory');
      const tabBtnApp = document.getElementById('tab-btn-approvals');
      const approvalsBtn = document.getElementById('approvals-tab-btn');
      const pendingCard = document.getElementById('pending-hods-card');
      const dirWorkspace = document.getElementById('fac-directory-workspace');
      const chips = document.querySelectorAll('.fac-chips-row .fac-filter-chip');

      if (currentFacultyMainTab === 'approvals') {
        if (tabBtnDir) { tabBtnDir.classList.remove('active'); tabBtnDir.setAttribute('aria-selected', 'false'); }
        if (tabBtnApp) { tabBtnApp.classList.add('active'); tabBtnApp.setAttribute('aria-selected', 'true'); }
        if (approvalsBtn) approvalsBtn.classList.add('active');

        activeFacultyRoleFilter = 'PENDING';
        chips.forEach(chip => {
          if (chip.getAttribute('data-role') === 'PENDING') chip.classList.add('active');
          else chip.classList.remove('active');
        });

        if (dirWorkspace) dirWorkspace.style.display = 'none';
        if (pendingCard) {
          pendingCard.style.display = 'block';
          pendingCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        renderPendingHods();
      } else {
        if (tabBtnDir) { tabBtnDir.classList.add('active'); tabBtnDir.setAttribute('aria-selected', 'true'); }
        if (tabBtnApp) { tabBtnApp.classList.remove('active'); tabBtnApp.setAttribute('aria-selected', 'false'); }
        if (approvalsBtn) approvalsBtn.classList.remove('active');

        if (dirWorkspace) dirWorkspace.style.display = 'block';
        if (pendingCard) pendingCard.style.display = 'none';

        if (activeFacultyRoleFilter === 'PENDING') {
          activeFacultyRoleFilter = 'ALL';
        }
        chips.forEach(chip => {
          if (chip.getAttribute('data-role') === activeFacultyRoleFilter) chip.classList.add('active');
          else chip.classList.remove('active');
        });
        applyFacultyFilters();
      }
    }
    window.switchFacultyMainTab = switchFacultyMainTab;
    window.openApprovalsTab = () => switchFacultyMainTab('approvals');

    function setFacultyRoleFilter(role) {
      if (role === 'PENDING') {
        switchFacultyMainTab('approvals');
        return;
      }
      if (currentFacultyMainTab === 'approvals') {
        switchFacultyMainTab('directory');
      }
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
      const cPending = (pendingHodsList || []).length;
      const cActive = list.filter(f => f.status === 'ACTIVE').length;
      const cInactive = list.filter(f => f.status === 'INACTIVE').length;

      const elCAll = document.getElementById('chip-count-all');
      const elCTeachers = document.getElementById('chip-count-teachers');
      const elCHods = document.getElementById('chip-count-hods');
      const elCCommon = document.getElementById('chip-count-common');
      const elCPending = document.getElementById('chip-count-pending');
      const elCActive = document.getElementById('chip-count-active');
      const elCInactive = document.getElementById('chip-count-inactive');

      if (elCAll) elCAll.textContent = cAll;
      if (elCTeachers) elCTeachers.textContent = cTeachers;
      if (elCHods) elCHods.textContent = cHods;
      if (elCCommon) elCCommon.textContent = cCommon;
      if (elCPending) elCPending.textContent = cPending;
      if (elCActive) elCActive.textContent = cActive;
      if (elCInactive) elCInactive.textContent = cInactive;

      // Update main tab badges and top action badge
      const elTabBadgeDir = document.getElementById('tab-badge-directory');
      const elTabBadgeApp = document.getElementById('tab-badge-approvals');
      const elKpiBadgeApp = document.getElementById('kpi-approvals-badge');
      if (elTabBadgeDir) elTabBadgeDir.textContent = cAll;
      if (elTabBadgeApp) {
        elTabBadgeApp.textContent = cPending;
        if (cPending > 0) elTabBadgeApp.classList.add('has-pending');
        else elTabBadgeApp.classList.remove('has-pending');
      }
      if (elKpiBadgeApp) {
        elKpiBadgeApp.textContent = cPending;
        if (cPending > 0) elKpiBadgeApp.classList.add('has-pending');
        else elKpiBadgeApp.classList.remove('has-pending');
      }

      // Handle PENDING queue display
      const pendingCard = document.getElementById('pending-hods-card');
      if (currentFacultyMainTab === 'approvals' || activeFacultyRoleFilter === 'PENDING') {
        if (pendingCard) {
          pendingCard.style.display = 'block';
          pendingCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        list = []; // Focus on pending queue
      } else {
        if (pendingCard) {
          pendingCard.style.display = (pendingHodsList && pendingHodsList.length > 0) ? 'block' : 'none';
        }
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
                          <button type="button" class="fac-kebab-item" onclick="openViewFacultyModal(${f.teacher_id}); closeAllKebabMenus();">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            <span>View Details</span>
                          </button>
                          <button type="button" class="fac-kebab-item" onclick="openEditFacultyModal(${f.teacher_id}); closeAllKebabMenus();">
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
            <div class="fac-mini-card ${isInactive ? 'fac-card-inactive' : ''}" data-id="${f.teacher_id}">
              <div class="fac-mini-main">
                <div class="fac-mini-avatar">${initial}</div>
                <div class="fac-mini-info">
                  <div class="fac-mini-name-row">
                    <span class="fac-mini-name">${escHtml(cleanFacultyDisplayName(f.full_name))}</span>
                    ${f.is_hod ? '<span class="fac-mini-badge hod">HOD</span>' : ''}
                    ${isCommon ? '<span class="fac-mini-badge" style="background:rgba(16,185,129,0.15);color:#059669;font-weight:600;">Common</span>' : ''}
                    ${isInactive ? '<span class="fac-mini-badge suspended">Suspended</span>' : ''}
                  </div>
                  <div class="fac-mini-subtext">
                    <span class="fac-dept-code">${escHtml(deptShort)}</span>
                    <span class="fac-sub-dot">•</span>
                    <span class="fac-empid-sub">${f.employee_id ? escHtml(f.employee_id) : 'EMP#' + f.teacher_id}</span>
                  </div>
                </div>
              </div>
              <div class="fac-kebab-wrap">
                <button type="button" class="fac-kebab-btn" aria-label="Faculty options" onclick="toggleFacultyKebabMenu(${f.teacher_id}, event)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                </button>
                <div class="fac-kebab-menu" id="fac-kebab-menu-${f.teacher_id}">
                  <button type="button" class="fac-kebab-item" onclick="openViewFacultyModal(${f.teacher_id}); closeAllKebabMenus();">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span>View Details</span>
                  </button>
                  <button type="button" class="fac-kebab-item" onclick="openEditFacultyModal(${f.teacher_id}); closeAllKebabMenus();">
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

    function openEditFacultyModal(id) {
      const fac = allFacultyList.find(f => f.teacher_id == id);
      if (!fac) return;
      populateDeptDropdown('edit-fac-dept');
      document.getElementById('edit-fac-id').value = fac.teacher_id;
      document.getElementById('edit-fac-name').value = fac.full_name || '';
      document.getElementById('edit-fac-email').value = fac.gmail || '';
      document.getElementById('edit-fac-employee-id').value = fac.employee_id || '';
      document.getElementById('edit-fac-phone').value = fac.phone || '';
      document.getElementById('edit-fac-dept').value = fac.department_id || '';
      document.getElementById('edit-fac-status').value = fac.status || 'ACTIVE';

      const err = document.getElementById('edit-fac-error');
      if (err) { err.style.display = 'none'; err.textContent = ''; }
      showModal('edit-faculty-modal');
    }
    function closeEditFacultyModal() {
      hideModal('edit-faculty-modal');
    }
    window.openEditFacultyModal = openEditFacultyModal;
    window.closeEditFacultyModal = closeEditFacultyModal;

    async function submitEditFaculty(e) {
      if (e) e.preventDefault();
      const id = document.getElementById('edit-fac-id').value;
      const fullName = document.getElementById('edit-fac-name').value.trim();
      const employeeId = document.getElementById('edit-fac-employee-id').value.trim();
      const phone = document.getElementById('edit-fac-phone').value.trim();
      const departmentId = document.getElementById('edit-fac-dept').value;
      const status = document.getElementById('edit-fac-status').value;
      const btn = document.getElementById('btn-submit-edit-fac');
      const err = document.getElementById('edit-fac-error');
      if (err) err.style.display = 'none';

      try {
        if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
        const res = await apiFetch(`${API}/admin/teachers/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            full_name: fullName,
            employee_id: employeeId,
            phone,
            department_id: departmentId ? parseInt(departmentId, 10) : undefined,
            status
          })
        });

        if (res && res.success) {
          closeEditFacultyModal();
          showToast(res.message || 'Faculty profile updated!', 'success');
          await loadAllFaculty();
          await loadHODs();
        } else {
          throw new Error(res.message || 'Failed to update faculty');
        }
      } catch (ex) {
        if (err) {
          err.textContent = ex.message || 'Error updating faculty.';
          err.style.display = 'block';
        }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
      }
    }
    window.submitEditFaculty = submitEditFaculty;

    function openViewFacultyModal(id) {
      const fac = allFacultyList.find(f => f.teacher_id == id);
      if (!fac) return;
      const body = document.getElementById('view-faculty-body');
      if (!body) return;

      const roleBadges = [];
      if (fac.is_hod) roleBadges.push(`<span class="fac-role-pill fac-role-hod">Head of Department (${escHtml(fac.hod_department_name || fac.department_name || '')})</span>`);
      if (!fac.department_id || fac.department_code === 'COMMON' || fac.department_name === 'Common') {
        roleBadges.push(`<span class="fac-role-pill fac-role-cfm" style="background:rgba(16,185,129,0.12);color:#059669;border-color:rgba(16,185,129,0.25);">Common Faculty</span>`);
      } else {
        roleBadges.push(`<span class="fac-role-pill fac-role-teacher">Faculty Teacher</span>`);
      }

      const statusBadge = fac.status === 'ACTIVE'
        ? `<span class="fac-status-pill active"><span class="fac-status-dot"></span>Active</span>`
        : `<span class="fac-status-pill inactive"><span class="fac-status-dot"></span>Inactive</span>`;

      body.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.85rem; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--color-primary-light); color: var(--color-primary); font-weight: 700; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${(fac.full_name || 'F').charAt(0).toUpperCase()}
          </div>
          <div style="flex: 1; min-width: 0;">
            <h3 style="margin: 0 0 0.25rem 0; font-size: 1.05rem; font-weight: 700; color: var(--text-main);">${escHtml(cleanFacultyDisplayName(fac.full_name))}</h3>
            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center;">
              ${roleBadges.join(' ')}
              ${statusBadge}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 0.65rem; font-size: 0.85rem;">
          <div style="display: flex; justify-content: space-between; padding: 0.6rem 0.8rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
            <span style="color: var(--text-muted);">Department</span>
            <strong style="color: var(--text-main);">${escHtml(fac.department_name || 'Unassigned')} (${escHtml(fac.department_code || '—')})</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 0.6rem 0.8rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
            <span style="color: var(--text-muted);">Institutional Gmail</span>
            <span style="color: var(--color-primary); font-family: monospace; font-weight: 600;">${escHtml(fac.gmail || '—')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 0.6rem 0.8rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
            <span style="color: var(--text-muted);">Employee / Staff Code</span>
            <span style="font-family: monospace; font-weight: 600; color: var(--text-main);">${escHtml(fac.employee_id || 'Not specified')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 0.6rem 0.8rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
            <span style="color: var(--text-muted);">Phone Number</span>
            <span style="font-weight: 600; color: var(--text-main);">${escHtml(fac.phone || 'Not specified')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 0.6rem 0.8rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
            <span style="color: var(--text-muted);">Registered Since</span>
            <span style="color: var(--text-muted);">${fmtDate(fac.created_at)}</span>
          </div>
        </div>
      `;

      const editBtn = document.getElementById('view-fac-edit-btn');
      if (editBtn) {
        editBtn.onclick = function() {
          closeViewFacultyModal();
          openEditFacultyModal(fac.teacher_id);
        };
      }

      showModal('view-faculty-modal');
    }
    function closeViewFacultyModal() {
      hideModal('view-faculty-modal');
    }
    window.openViewFacultyModal = openViewFacultyModal;
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

    function openDeleteFacultyConfirmModal(id, name) {
      document.getElementById('delete-fac-target-id').value = id;
      document.getElementById('delete-fac-confirm-name').textContent = name || 'Faculty Member';
      const err = document.getElementById('delete-fac-error');
      if (err) { err.style.display = 'none'; err.textContent = ''; }
      showModal('delete-faculty-confirm-modal');
    }
    function closeDeleteFacultyConfirmModal() {
      hideModal('delete-faculty-confirm-modal');
    }
    window.openDeleteFacultyConfirmModal = openDeleteFacultyConfirmModal;
    window.closeDeleteFacultyConfirmModal = closeDeleteFacultyConfirmModal;

    async function submitDeleteFacultyConfirm() {
      const id = document.getElementById('delete-fac-target-id').value;
      const btn = document.getElementById('btn-submit-delete-fac');
      const err = document.getElementById('delete-fac-error');
      if (err) err.style.display = 'none';

      try {
        if (btn) { btn.disabled = true; btn.textContent = 'Deactivating...'; }
        const res = await apiFetch(`${API}/admin/teachers/${id}`, {
          method: 'DELETE'
        });

        if (res && res.success) {
          closeDeleteFacultyConfirmModal();
          showToast(res.message || 'Faculty deactivated successfully.', 'success');
          await loadAllFaculty();
          await loadHODs();
        } else {
          throw new Error(res.message || 'Failed to deactivate faculty');
        }
      } catch (ex) {
        if (err) {
          err.textContent = ex.message || 'Error deactivating faculty.';
          err.style.display = 'block';
        }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Deactivate Faculty'; }
      }
    }
    window.submitDeleteFacultyConfirm = submitDeleteFacultyConfirm;

    // ─── Registration Gates Controls & Modal ─────────────────────
    let adminGates = {
      all_open: false,
      open_departments: [],
      hod_open: false,
      common_faculty_open: false
    };

    async function loadRegistrationGates() {
      try {
        const res = await apiFetch(`${API}/admin/registration-gates`);
        if (res && res.success && res.data) {
          adminGates = {
            all_open: Boolean(res.data.all_open),
            open_departments: Array.isArray(res.data.open_departments) ? res.data.open_departments : [],
            hod_open: Boolean(res.data.hod_open),
            common_faculty_open: Boolean(res.data.common_faculty_open)
          };
          renderGateTags();
        }
      } catch (err) {
        console.warn('Failed to load admin registration gates:', err);
        renderGateTags();
      }
    }
    window.loadRegistrationGates = loadRegistrationGates;

    function renderGateTags() {
      const container = document.getElementById('fac-gate-tags-container');
      if (!container) return;

      const tags = [];
      const totalDeptCount = (departments && departments.length) ? departments.length : 6;

      if (adminGates.all_open) {
        tags.push(`<span class="fac-gate-tag open"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>All Departments Open</span>`);
      } else if (adminGates.open_departments && adminGates.open_departments.length > 0) {
        const uniqueCodes = new Set();
        adminGates.open_departments.forEach(item => {
          if (!item) return;
          if (isNaN(item)) {
            uniqueCodes.add(String(item).toUpperCase());
          } else {
            const found = departments?.find(d => Number(d.id) === Number(item));
            if (found && found.code) uniqueCodes.add(found.code.toUpperCase());
          }
        });

        if (uniqueCodes.size >= totalDeptCount && totalDeptCount > 0) {
          tags.push(`<span class="fac-gate-tag open"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>All Departments Open</span>`);
        } else if (uniqueCodes.size > 0) {
          const codesArr = Array.from(uniqueCodes).sort();
          tags.push(`<span class="fac-gate-tag open"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>Open: ${codesArr.join(', ')}</span>`);
        }
      }

      if (adminGates.hod_open) {
        tags.push(`<span class="fac-gate-tag hod"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>HODs Open</span>`);
      }
      if (adminGates.common_faculty_open) {
        tags.push(`<span class="fac-gate-tag cfm"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>Common Open</span>`);
      }

      if (tags.length === 0) {
        tags.push(`<span class="fac-gate-tag closed"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>Registration Closed</span>`);
      }

      container.innerHTML = tags.join('');
    }
    window.renderGateTags = renderGateTags;

    function openRegGatesModal() {
      const allCheckbox = document.getElementById('gate-open-all');
      const hodCheckbox = document.getElementById('gate-open-hod');
      const cfmCheckbox = document.getElementById('gate-open-cfm');
      const grid = document.getElementById('gate-dept-checkboxes-grid');
      const errEl = document.getElementById('reg-gates-error');
      if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

      if (allCheckbox) allCheckbox.checked = Boolean(adminGates.all_open);
      if (hodCheckbox) hodCheckbox.checked = Boolean(adminGates.hod_open);
      if (cfmCheckbox) cfmCheckbox.checked = Boolean(adminGates.common_faculty_open);

      if (grid) {
        grid.innerHTML = (departments || []).map(d => {
          const code = d.code;
          const isChecked = adminGates.all_open || (adminGates.open_departments && (adminGates.open_departments.includes(code) || adminGates.open_departments.includes(d.id) || adminGates.open_departments.includes(String(d.id))));
          return `
            <label class="fac-gate-dept-pill ${isChecked ? 'active' : ''}">
              <input type="checkbox" class="gate-dept-item-checkbox" value="${escHtml(code)}" ${isChecked ? 'checked' : ''} onchange="this.parentElement.classList.toggle('active', this.checked)">
              <span class="dept-code">${escHtml(d.code)}</span>
            </label>
          `;
        }).join('');
      }

      showModal('reg-gates-modal');
    }
    window.openRegGatesModal = openRegGatesModal;

    function closeRegGatesModal() {
      hideModal('reg-gates-modal');
    }
    window.closeRegGatesModal = closeRegGatesModal;

    function handleGateAllChange() {
      const isAll = Boolean(document.getElementById('gate-open-all')?.checked);
      const itemCheckboxes = document.querySelectorAll('.gate-dept-item-checkbox');
      itemCheckboxes.forEach(cb => {
        cb.checked = isAll;
        cb.parentElement?.classList.toggle('active', isAll);
      });
    }
    window.handleGateAllChange = handleGateAllChange;

    async function submitSaveGatesConfig(e) {
      if (e) e.preventDefault();
      const btn = document.getElementById('btn-save-gates');
      const errEl = document.getElementById('reg-gates-error');
      if (errEl) errEl.style.display = 'none';

      const allOpen = Boolean(document.getElementById('gate-open-all')?.checked);
      const hodOpen = Boolean(document.getElementById('gate-open-hod')?.checked);
      const cfmOpen = Boolean(document.getElementById('gate-open-cfm')?.checked);

      const selectedDepts = [];
      document.querySelectorAll('.gate-dept-item-checkbox:checked').forEach(cb => {
        if (cb.value) selectedDepts.push(cb.value);
      });

      try {
        if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
        const res = await apiFetch(`${API}/admin/registration-gates`, {
          method: 'PUT',
          body: JSON.stringify({
            all_open: allOpen,
            open_departments: selectedDepts,
            hod_open: hodOpen,
            common_faculty_open: cfmOpen
          })
        });

        if (res && res.success) {
          adminGates = {
            all_open: allOpen,
            open_departments: selectedDepts,
            hod_open: hodOpen,
            common_faculty_open: cfmOpen
          };
          renderGateTags();
          closeRegGatesModal();
          showToast(res.message || 'Self-registration gates updated!', 'success');
        } else {
          throw new Error(res.message || 'Failed to update gates');
        }
      } catch (err) {
        if (errEl) {
          errEl.textContent = err.message || 'Error updating registration gates.';
          errEl.style.display = 'block';
        }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Gate Settings'; }
      }
    }
    window.submitSaveGatesConfig = submitSaveGatesConfig;


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
        renderHODs();
      } catch (e) {
        const errHtml = `<div style="text-align: center; padding: 2rem; color: var(--status-absent);">Failed to load HODs: ${e.message}</div>`;
        const wrap = document.getElementById('hod-table-wrap');
        const mwrap = document.getElementById('hod-mobile-cards-wrap');
        if (wrap) wrap.innerHTML = errHtml;
        if (mwrap) mwrap.innerHTML = errHtml;
      }
    }

    function renderHODs() {
      const wrap = document.getElementById('hod-table-wrap');
      const mwrap = document.getElementById('hod-mobile-cards-wrap');
      const badge = document.getElementById('hod-count-badge');
      if (badge) badge.textContent = `${hodData.length} HOD${hodData.length !== 1 ? 's' : ''}`;
      const tabBadgeHods = document.getElementById('tab-badge-hods');
      if (tabBadgeHods) tabBadgeHods.textContent = hodData.length;

      if (!hodData.length) {
        const emptyHtml = `
          <div class="fac-empty-state">
            <div class="fac-empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></div>
            <p class="fac-empty-state-title">No HODs created yet</p>
            <p class="fac-empty-state-sub">Create the first HOD account to get started.</p>
          </div>`;
        if (wrap) wrap.innerHTML = emptyHtml;
        if (mwrap) mwrap.innerHTML = emptyHtml;
        return;
      }

      // ── Desktop Table ─────────────────────────────────────────
      if (wrap) {
        wrap.innerHTML = `
          <table class="hod-desktop-table">
            <thead>
              <tr>
                <th>HOD</th>
                <th>Department</th>
                <th class="th-gmail d-desktop-only">Gmail (Login ID)</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="hod-tbody">
              ${hodData.map(h => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--color-primary-light); color: var(--color-primary); font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0;">
                        ${(h.full_name || 'H').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style="font-weight: 600; color: var(--text-main);">${escHtml(cleanFacultyDisplayName(h.full_name))}</div>
                        ${h.employee_id ? `<div style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">${escHtml(h.employee_id)}</div>` : ''}
                      </div>
                    </div>
                  </td>
                  <td>
                    ${h.department_name
                      ? `<span class="hod-dept-tag-pill" style="background: var(--status-present-bg); color: var(--status-present); border-radius: var(--radius-sm); padding: 0.25rem 0.65rem; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center;">${escHtml(h.department_name)}</span>`
                      : `<span style="color: var(--text-muted); font-size: 0.8rem;">Unassigned</span>`}
                  </td>
                  <td class="td-gmail d-desktop-only" style="font-family: monospace; font-size: 0.85rem; color: var(--color-primary);">${escHtml(h.gmail || '')}</td>
                  <td style="text-align: right;">
                    <div class="kebab-menu-container" id="kebab-${h.teacher_id}">
                      <button type="button" class="kebab-btn" aria-haspopup="true" aria-expanded="false" title="Actions" onclick="toggleHodKebab(event, 'kebab-${h.teacher_id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="1.5"></circle>
                          <circle cx="12" cy="5" r="1.5"></circle>
                          <circle cx="12" cy="19" r="1.5"></circle>
                        </svg>
                      </button>
                      <div class="kebab-dropdown">
                        <button type="button" class="kebab-item" onclick="openHodDetailModal(${h.teacher_id}); closeAllKebabs();">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          <span>View Details</span>
                        </button>
                        <button type="button" class="kebab-item" onclick="openReassignModal(${h.teacher_id}, '${escHtml(h.full_name)}'); closeAllKebabs();">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
                          <span>Reassign Dept</span>
                        </button>
                        <button type="button" class="kebab-item" onclick="openResetModal(${h.teacher_id}, '${escHtml(h.full_name)}'); closeAllKebabs();">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          <span>Reset Password</span>
                        </button>
                        <div class="kebab-divider"></div>
                        <button type="button" class="kebab-item danger" onclick="openDeleteModal(${h.teacher_id}, '${escHtml(h.full_name)}'); closeAllKebabs();">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>`;
      }

      // ── Mobile Card Stack ─────────────────────────────────────
      if (mwrap) {
        mwrap.innerHTML = hodData.map(h => {
          const initial = (h.full_name || 'H').charAt(0).toUpperCase();
          const deptBadge = h.department_name
            ? `<span class="hod-dept-tag">${escHtml(h.department_name)}</span>`
            : `<span class="hod-dept-unassigned">Unassigned</span>`;
          return `
            <div class="hod-mobile-card">
              <div class="hod-mobile-card-header">
                <div class="hod-mobile-avatar">${initial}</div>
                <div class="hod-mobile-name-block">
                  <div class="hod-mobile-name">${escHtml(cleanFacultyDisplayName(h.full_name))}</div>
                  <div class="hod-mobile-sub">
                    ${deptBadge}
                    ${h.employee_id ? `<span class="hod-empid-tag">${escHtml(h.employee_id)}</span>` : ''}
                  </div>
                </div>
                <div class="kebab-menu-container" id="kebab-m-${h.teacher_id}" style="margin-left: auto;">
                  <button type="button" class="kebab-btn" aria-haspopup="true" aria-expanded="false" title="Actions" onclick="toggleHodKebab(event, 'kebab-m-${h.teacher_id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="1.5"></circle>
                      <circle cx="12" cy="5" r="1.5"></circle>
                      <circle cx="12" cy="19" r="1.5"></circle>
                    </svg>
                  </button>
                  <div class="kebab-dropdown">
                    <button type="button" class="kebab-item" onclick="openHodDetailModal(${h.teacher_id}); closeAllKebabs();">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      <span>View Details</span>
                    </button>
                    <button type="button" class="kebab-item" onclick="openReassignModal(${h.teacher_id}, '${escHtml(h.full_name)}'); closeAllKebabs();">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
                      <span>Reassign Dept</span>
                    </button>
                    <button type="button" class="kebab-item" onclick="openResetModal(${h.teacher_id}, '${escHtml(h.full_name)}'); closeAllKebabs();">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      <span>Reset Password</span>
                    </button>
                    <div class="kebab-divider"></div>
                    <button type="button" class="kebab-item danger" onclick="openDeleteModal(${h.teacher_id}, '${escHtml(h.full_name)}'); closeAllKebabs();">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
              <div class="hod-mobile-contact">
                <span class="hod-mobile-gmail">${escHtml(h.gmail || '—')}</span>
              </div>
            </div>`;
        }).join('');
      }
    }

    // ─── Create / Appoint HOD ─────────────────────────────────
    var currentHODMode = 'search';
    var currentFoundFaculty = null;

    function openCreateModal() {
      setHODModalMode('search');
      document.getElementById('search-faculty-email').value = '';
      document.getElementById('search-status-box').style.display = 'none';
      document.getElementById('found-faculty-card').style.display = 'none';
      document.getElementById('assign-existing-dept').value = '';
      document.getElementById('assign-error').style.display = 'none';
      document.getElementById('btn-submit-assign').disabled = true;
      currentFoundFaculty = null;

      document.getElementById('create-hod-form').reset();
      document.getElementById('create-error').style.display = 'none';

      if (!departments || departments.length === 0) {
        loadDepartments();
      } else {
        populateDeptDropdown('hod-dept');
        populateDeptDropdown('assign-existing-dept');
      }

      showModal('create-modal');
    }
    function closeCreateModal() { hideModal('create-modal'); }

    function setHODModalMode(mode) {
      currentHODMode = mode;
      const btnSearch = document.getElementById('tab-btn-search');
      const btnCreate = document.getElementById('tab-btn-create');
      const secSearch = document.getElementById('section-search-faculty');
      const secCreate = document.getElementById('section-create-new');

      if (mode === 'search') {
        btnSearch.style.background = 'var(--color-primary)';
        btnSearch.style.color = 'var(--text-white)';
        btnCreate.style.background = 'transparent';
        btnCreate.style.color = 'var(--text-muted)';
        secSearch.style.display = 'block';
        secCreate.style.display = 'none';
        document.getElementById('modal-title-hod').textContent = 'Appoint Head of Department';
        document.getElementById('modal-sub-hod').textContent = 'Search faculty by Gmail to assign HOD powers while keeping their existing roles.';
      } else {
        btnCreate.style.background = 'var(--color-primary)';
        btnCreate.style.color = 'var(--text-white)';
        btnSearch.style.background = 'transparent';
        btnSearch.style.color = 'var(--text-muted)';
        secSearch.style.display = 'none';
        secCreate.style.display = 'block';
        document.getElementById('modal-title-hod').textContent = 'Create New HOD Account';
        document.getElementById('modal-sub-hod').textContent = 'Creates a brand-new teacher account and appoints them as HOD for a department.';
      }

      if (departments && departments.length > 0) {
        populateDeptDropdown('hod-dept');
        populateDeptDropdown('assign-existing-dept');
      } else {
        loadDepartments();
      }
    }

    async function searchFacultyByEmail() {
      const email = document.getElementById('search-faculty-email').value.trim();
      const statusBox = document.getElementById('search-status-box');
      const foundCard = document.getElementById('found-faculty-card');
      const submitBtn = document.getElementById('btn-submit-assign');
      const searchBtn = document.getElementById('btn-search-faculty');

      if (!email) {
        statusBox.textContent = 'Please enter a faculty Gmail address.';
        statusBox.style.display = 'block';
        statusBox.style.background = 'var(--status-absent-bg)';
        statusBox.style.color = 'var(--status-absent)';
        statusBox.style.border = '1px solid var(--status-absent)';
        foundCard.style.display = 'none';
        submitBtn.disabled = true;
        currentFoundFaculty = null;
        return;
      }

      searchBtn.disabled = true;
      searchBtn.textContent = 'Finding...';
      statusBox.style.display = 'none';
      foundCard.style.display = 'none';
      submitBtn.disabled = true;
      currentFoundFaculty = null;

      try {
        const r = await apiFetch(`${API}/admin/faculty/search?email=${encodeURIComponent(email)}`);
        const f = r.data;
        currentFoundFaculty = f;

        document.getElementById('found-avatar').textContent = (f.full_name || 'F').charAt(0).toUpperCase();
        document.getElementById('found-name').textContent = f.full_name;
        document.getElementById('found-gmail').textContent = f.gmail;
        document.getElementById('found-dept').textContent = f.department_name || 'Unassigned';
        document.getElementById('found-roles').textContent = f.current_roles || 'Faculty Member';
        
        // If they belong to a department, auto-select it in the dropdown
        if (f.department_id) {
          document.getElementById('assign-existing-dept').value = f.department_id;
        }

        foundCard.style.display = 'block';
        submitBtn.disabled = false;
      } catch (err) {
        statusBox.textContent = err.message || 'No faculty found with this Gmail. Check spelling or use "Create New Account" tab.';
        statusBox.style.display = 'block';
        statusBox.style.background = 'var(--status-absent-bg)';
        statusBox.style.color = 'var(--status-absent)';
        statusBox.style.border = '1px solid var(--status-absent)';
      } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = 'Find';
      }
    }

    async function submitAssignExistingHOD() {
      if (!currentFoundFaculty) return;
      const deptId = document.getElementById('assign-existing-dept').value;
      const errEl = document.getElementById('assign-error');
      const btn = document.getElementById('btn-submit-assign');

      if (!deptId) {
        errEl.textContent = 'Please select a department to lead as HOD.';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Appointing...';
      errEl.style.display = 'none';

      try {
        const r = await apiFetch(`${API}/admin/hods/assign-existing`, {
          method: 'POST',
          body: JSON.stringify({
            teacher_id: currentFoundFaculty.teacher_id,
            department_id: parseInt(deptId)
          })
        });

        const d = r.data;
        const dept = departments.find(dep => dep.id === parseInt(deptId));

        document.getElementById('cred-title').textContent = 'HOD Role Appointed!';
        document.getElementById('cred-sub').textContent = `${d.full_name} now holds full HOD powers while retaining all their existing faculty roles.`;
        document.getElementById('slip-name').textContent = d.full_name;
        document.getElementById('slip-dept').textContent = dept?.name || `Dept #${deptId}`;
        document.getElementById('slip-gmail').textContent = d.gmail;
        document.getElementById('slip-temp-row').innerHTML =
          `<span style="color: var(--text-muted); font-family: var(--font-family-sans);">Access Status:</span>` +
          `<strong style="color: var(--status-present); float: right; font-family: var(--font-family-sans);">Active (Existing Credentials)</strong>`;

        closeCreateModal();
        showModal('cred-modal');
        showToast('HOD role assigned successfully!', 'success');
        await loadHODs();
        await loadDepartments();
      } catch (err) {
        errEl.textContent = err.message || 'Failed to assign HOD role.';
        errEl.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Assign HOD Role';
      }
    }

    async function submitCreateHOD(e) {
      e.preventDefault();
      const btn = document.getElementById('create-submit-btn');
      const errEl = document.getElementById('create-error');
      btn.disabled = true; btn.textContent = 'Creating...';
      errEl.style.display = 'none';

      const payload = {
        full_name: document.getElementById('hod-name').value.trim(),
        email: document.getElementById('hod-email').value.trim(),
        password: document.getElementById('hod-password').value.trim(),
        phone: document.getElementById('hod-phone').value.trim() || undefined,
        department_id: parseInt(document.getElementById('hod-dept').value)
      };

      if (!payload.full_name || !payload.email || !payload.password || !payload.department_id) {
        errEl.textContent = 'Please fill out all required fields (*).';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Generate HOD Account & Temp Password';
        return;
      }

      try {
        const r = await apiFetch(`${API}/admin/hods`, { method: 'POST', body: JSON.stringify(payload) });
        const d = r.data;
        const dept = departments.find(dep => dep.id === payload.department_id);
        document.getElementById('cred-title').textContent = 'HOD Account Created!';
        document.getElementById('cred-sub').textContent = 'Share these credentials with the HOD. They will connect Google on first login.';
        document.getElementById('slip-name').textContent = d.full_name;
        document.getElementById('slip-dept').textContent = dept?.name || `Dept #${payload.department_id}`;
        document.getElementById('slip-gmail').textContent = d.gmail;
        document.getElementById('slip-temp-row').innerHTML =
          `<span style="color: var(--text-muted); font-family: var(--font-family-sans);">Temp Password:</span>` +
          `<strong id="slip-temp" style="color: var(--status-absent); font-size: 1.1rem; float: right; letter-spacing: 0.1em;">${escHtml(d.temporary_password)}</strong>`;
        closeCreateModal();
        showModal('cred-modal');
        showToast('HOD account created successfully!', 'success');
        await loadHODs();
        await loadDepartments();
      } catch (err) {
        errEl.textContent = err.message || 'Failed to create HOD account.';
        errEl.style.display = 'block';
      } finally {
        btn.disabled = false; btn.textContent = 'Generate HOD Account & Temp Password';
      }
    }

    // ─── Credentials Slip ─────────────────────────────────────
    function closeCredModal() { hideModal('cred-modal'); }

    function copyCredentials() {
      const name = document.getElementById('slip-name').textContent;
      const dept = document.getElementById('slip-dept').textContent;
      const gmail = document.getElementById('slip-gmail').textContent;
      const tempEl = document.getElementById('slip-temp');
      const temp = tempEl ? tempEl.textContent : 'Existing Password';

      const text = `Name: ${name}\n` +
                   `Department: ${dept}\n` +
                   `Login ID (Gmail): ${gmail}\n` +
                   `Password / Access: ${temp}`;
      navigator.clipboard.writeText(text).then(() => showToast('Details copied to clipboard!', 'success'));
    }

    // ─── Reassign Department (2-Step Flow) ────────────────────
    var currentReassignHod = null;

    function setReassignStep(step) {
      const s1 = document.getElementById('reassign-step-1');
      const s2 = document.getElementById('reassign-step-2');
      const step1Indicator = document.getElementById('reassign-stepper-1');
      const step2Indicator = document.getElementById('reassign-stepper-2');

      if (step === 1) {
        if (s1) s1.style.display = 'block';
        if (s2) s2.style.display = 'none';
        if (step1Indicator) {
          step1Indicator.style.color = 'var(--color-primary)';
          step1Indicator.innerHTML = `<span style="width: 20px; height: 20px; border-radius: 50%; background: var(--color-primary); color: var(--text-white); display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem;">1</span><span>Select Dept</span>`;
        }
        if (step2Indicator) {
          step2Indicator.style.color = 'var(--text-muted)';
          step2Indicator.innerHTML = `<span style="width: 20px; height: 20px; border-radius: 50%; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem;">2</span><span>Review &amp; Transfer</span>`;
        }
      } else {
        if (s1) s1.style.display = 'none';
        if (s2) s2.style.display = 'block';
        if (step1Indicator) {
          step1Indicator.style.color = 'var(--status-present)';
          step1Indicator.innerHTML = `<span style="width: 20px; height: 20px; border-radius: 50%; background: var(--status-present); color: var(--text-white); display: inline-flex; align-items: center; justify-content: center; "><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span><span>Selected</span>`;
        }
        if (step2Indicator) {
          step2Indicator.style.color = 'var(--color-primary)';
          step2Indicator.innerHTML = `<span style="width: 20px; height: 20px; border-radius: 50%; background: var(--color-primary); color: var(--text-white); display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem;">2</span><span>Review &amp; Transfer</span>`;
        }
      }
    }

    function clearReassignStep1Error() {
      const err = document.getElementById('reassign-step1-err');
      if (err) err.style.display = 'none';
    }

    function openReassignModal(teacherId, name) {
      selectedTeacherId = teacherId;
      currentReassignHod = hodData.find(h => h.teacher_id === teacherId);
      const currentDept = currentReassignHod ? (currentReassignHod.department_name || 'Unassigned') : 'Unassigned';

      document.getElementById('reassign-hod-name').textContent = name;
      document.getElementById('reassign-current-dept').textContent = currentDept;
      document.getElementById('reassign-dept').value = '';
      clearReassignStep1Error();
      document.getElementById('reassign-error').style.display = 'none';

      if (!departments || departments.length === 0) {
        loadDepartments().then(() => populateDeptDropdown('reassign-dept'));
      } else {
        populateDeptDropdown('reassign-dept');
      }

      setReassignStep(1);
      showModal('reassign-modal');
    }

    function closeReassignModal() {
      hideModal('reassign-modal');
      selectedTeacherId = null;
      currentReassignHod = null;
    }

    function goToReassignStep2() {
      const deptId = document.getElementById('reassign-dept').value;
      const err = document.getElementById('reassign-step1-err');

      if (!deptId) {
        err.textContent = 'Please select a target department to proceed.';
        err.style.display = 'block';
        return;
      }

      const targetDeptId = parseInt(deptId);
      const currentDeptId = currentReassignHod?.department_id;
      if (currentDeptId && targetDeptId === currentDeptId) {
        err.textContent = 'Faculty is already assigned to this department. Please choose a different department.';
        err.style.display = 'block';
        return;
      }

      err.style.display = 'none';
      const targetDept = departments.find(d => d.id === targetDeptId);
      const fromDeptName = currentReassignHod ? (currentReassignHod.department_name || 'Unassigned') : 'Unassigned';
      const toDeptName = targetDept ? targetDept.name : `Dept #${targetDeptId}`;
      const hodName = currentReassignHod ? currentReassignHod.full_name : document.getElementById('reassign-hod-name').textContent;

      document.getElementById('reassign-preview-from').textContent = fromDeptName;
      document.getElementById('reassign-preview-to').textContent = toDeptName;
      document.getElementById('reassign-protect-dept').textContent = fromDeptName;
      document.getElementById('reassign-preview-name').textContent = hodName;
      document.getElementById('reassign-error').style.display = 'none';

      setReassignStep(2);
    }

    function goToReassignStep1() {
      setReassignStep(1);
    }

    async function submitReassign() {
      const deptId = document.getElementById('reassign-dept').value;
      if (!deptId) { goToReassignStep1(); return; }
      const btn = document.getElementById('reassign-submit-btn');
      const errEl = document.getElementById('reassign-error');
      btn.disabled = true; btn.textContent = 'Reassigning...';
      errEl.style.display = 'none';
      try {
        await apiFetch(`${API}/admin/hods/${selectedTeacherId}/department`, {
          method: 'PUT', body: JSON.stringify({ department_id: parseInt(deptId) })
        });
        closeReassignModal();
        showToast('HOD reassigned successfully', 'success');
        await loadHODs();
        await loadDepartments();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
      } finally {
        btn.disabled = false; btn.textContent = 'Confirm Reassignment';
      }
    }

    // ─── Reset Password (2-Step Flow) ─────────────────────────
    var currentResetHod = null;
    var isResetPassRevealed = false;
    var validatedResetPassword = '';

    function setResetStep(step) {
      const s1 = document.getElementById('reset-step-1');
      const s2 = document.getElementById('reset-step-2');
      const step1Indicator = document.getElementById('reset-stepper-1');
      const step2Indicator = document.getElementById('reset-stepper-2');

      if (step === 1) {
        if (s1) s1.style.display = 'block';
        if (s2) s2.style.display = 'none';
        if (step1Indicator) {
          step1Indicator.style.color = 'var(--color-primary)';
          step1Indicator.innerHTML = `<span style="width: 20px; height: 20px; border-radius: 50%; background: var(--color-primary); color: var(--text-white); display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem;">1</span><span>Set Password</span>`;
        }
        if (step2Indicator) {
          step2Indicator.style.color = 'var(--text-muted)';
          step2Indicator.innerHTML = `<span style="width: 20px; height: 20px; border-radius: 50%; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem;">2</span><span>Security Review</span>`;
        }
      } else {
        if (s1) s1.style.display = 'none';
        if (s2) s2.style.display = 'block';
        if (step1Indicator) {
          step1Indicator.style.color = 'var(--status-present)';
          step1Indicator.innerHTML = `<span style="width: 20px; height: 20px; border-radius: 50%; background: var(--status-present); color: var(--text-white); display: inline-flex; align-items: center; justify-content: center; "><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span><span>Password Set</span>`;
        }
        if (step2Indicator) {
          step2Indicator.style.color = 'var(--color-primary)';
          step2Indicator.innerHTML = `<span style="width: 20px; height: 20px; border-radius: 50%; background: var(--color-primary); color: var(--text-white); display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem;">2</span><span>Security Review</span>`;
        }
      }
    }

    function clearResetStep1Error() {
      const err = document.getElementById('reset-step1-err');
      if (err) err.style.display = 'none';
    }

    function togglePassVisibility(inputId, btn) {
      const inp = document.getElementById(inputId);
      if (!inp) return;
      if (inp.type === 'password') {
        inp.type = 'text';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
      } else {
        inp.type = 'password';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      }
    }

    function toggleResetPassPreview() {
      const previewEl = document.getElementById('reset-preview-pass');
      const btn = document.getElementById('reset-preview-eye-btn');
      isResetPassRevealed = !isResetPassRevealed;
      if (isResetPassRevealed) {
        previewEl.textContent = validatedResetPassword;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:0.25rem;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>Hide</span>';
      } else {
        previewEl.textContent = '••••••••';
        btn.textContent = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> <span>Reveal</span>';
      }
    }

    function generateRandomResetPassword() {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const pass = `Faculty@${randomSuffix}`;
      document.getElementById('reset-password').value = pass;
      document.getElementById('reset-password-confirm').value = pass;
      clearResetStep1Error();
    }

    function openResetModal(teacherId, name) {
      resetTargetId = teacherId;
      currentResetHod = hodData.find(h => h.teacher_id === teacherId);

      document.getElementById('reset-name').textContent = name;
      document.getElementById('reset-gmail').textContent = currentResetHod ? (currentResetHod.gmail || '—') : '—';
      document.getElementById('reset-password').value = 'Password@123';
      document.getElementById('reset-password-confirm').value = 'Password@123';
      clearResetStep1Error();
      document.getElementById('reset-error').style.display = 'none';
      isResetPassRevealed = false;

      setResetStep(1);
      showModal('reset-modal');
    }

    function closeResetModal() {
      hideModal('reset-modal');
      resetTargetId = null;
      currentResetHod = null;
      validatedResetPassword = '';
    }

    function goToResetStep2() {
      const p1 = document.getElementById('reset-password').value.trim();
      const p2 = document.getElementById('reset-password-confirm').value.trim();
      const err = document.getElementById('reset-step1-err');

      if (!p1) {
        err.textContent = 'Please enter a new password.';
        err.style.display = 'block';
        return;
      }
      if (p1.length < 6) {
        err.textContent = 'Password must be at least 6 characters long.';
        err.style.display = 'block';
        return;
      }
      if (p1 !== p2) {
        err.textContent = 'Passwords do not match. Please re-check confirm password.';
        err.style.display = 'block';
        return;
      }

      err.style.display = 'none';
      validatedResetPassword = p1;

      const hodName = currentResetHod ? currentResetHod.full_name : document.getElementById('reset-name').textContent;
      const hodGmail = currentResetHod ? currentResetHod.gmail : '';
      document.getElementById('reset-preview-user').textContent = `${hodName} (${hodGmail})`;

      isResetPassRevealed = false;
      document.getElementById('reset-preview-pass').textContent = '••••••••';
      document.getElementById('reset-preview-eye-btn').textContent = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> <span>Reveal</span>';
      document.getElementById('reset-error').style.display = 'none';

      setResetStep(2);
    }

    function goToResetStep1() {
      setResetStep(1);
    }

    function handleResetFormSubmit(e) {
      e.preventDefault();
      // If currently on step 1, advance to step 2
      const s1 = document.getElementById('reset-step-1');
      if (s1 && s1.style.display !== 'none') {
        goToResetStep2();
      } else {
        submitReset();
      }
    }

    async function submitReset(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (!resetTargetId || !validatedResetPassword) {
        goToResetStep1();
        return;
      }
      const btn = document.getElementById('reset-btn');
      const errEl = document.getElementById('reset-error');
      btn.disabled = true; btn.textContent = 'Resetting...';
      errEl.style.display = 'none';

      try {
        const r = await apiFetch(`${API}/admin/hods/${resetTargetId}/reset-password`, { 
          method: 'POST', 
          body: JSON.stringify({ new_password: validatedResetPassword })
        });
        showToast(r.message || 'Password reset successfully.', 'success');
        closeResetModal();
        await loadHODs();
      } catch (err) {
        errEl.textContent = `Failed: ${err.message}`;
        errEl.style.display = 'block';
      } finally {
        btn.disabled = false; btn.textContent = 'Confirm & Reset Password';
      }
    }

    // ─── Delete HOD (2-Step Safeguard Flow) ───────────────────
    var deleteTargetId = null;
    var currentDeleteHod = null;

    function setDeleteStep(step) {
      const s1 = document.getElementById('delete-step-1');
      const s2 = document.getElementById('delete-step-2');
      const step1Indicator = document.getElementById('delete-stepper-1');
      const step2Indicator = document.getElementById('delete-stepper-2');

      if (step === 1) {
        if (s1) s1.style.display = 'block';
        if (s2) s2.style.display = 'none';
        if (step1Indicator) {
          step1Indicator.style.color = 'var(--status-absent)';
          step1Indicator.innerHTML = `<span style="width: 20px; height: 20px; border-radius: 50%; background: var(--status-absent); color: var(--text-white); display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem;">1</span><span>Impact Assessment</span>`;
        }
        if (step2Indicator) {
          step2Indicator.style.color = 'var(--text-muted)';
          step2Indicator.innerHTML = `<span style="width: 20px; height: 20px; border-radius: 50%; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem;">2</span><span>Safeguard Confirmation</span>`;
        }
      } else {
        if (s1) s1.style.display = 'none';
        if (s2) s2.style.display = 'block';
        if (step1Indicator) {
          step1Indicator.style.color = 'var(--status-present)';
          step1Indicator.innerHTML = `<span style="width: 20px; height: 20px; border-radius: 50%; background: var(--status-present); color: var(--text-white); display: inline-flex; align-items: center; justify-content: center; "><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span><span>Impact Reviewed</span>`;
        }
        if (step2Indicator) {
          step2Indicator.style.color = 'var(--status-absent)';
          step2Indicator.innerHTML = `<span style="width: 20px; height: 20px; border-radius: 50%; background: var(--status-absent); color: var(--text-white); display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem;">2</span><span>Safeguard Confirmation</span>`;
        }
      }
    }

    function checkDeleteConfirmation() {
      const val = (document.getElementById('delete-confirm-input').value || '').trim();
      const btn = document.getElementById('delete-btn');
      if (val === 'DELETE') {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      } else {
        btn.disabled = true;
        btn.style.opacity = '0.45';
        btn.style.cursor = 'not-allowed';
      }
    }

    function openDeleteModal(teacherId, name) {
      deleteTargetId = teacherId;
      currentDeleteHod = hodData.find(h => h.teacher_id === teacherId);
      const deptName = currentDeleteHod ? (currentDeleteHod.department_name || 'Unassigned') : 'Unassigned';

      if (window.VidyaDeleteModal) {
        window.VidyaDeleteModal.open({
          title: 'Delete HOD Account',
          itemName: `${name} (${deptName})`,
          message: `Permanently delete Head of Department account for <strong>${name}</strong>? All departmental administrative associations will be revoked. This cannot be undone.`,
          confirmKeyword: 'DELETE',
          confirmButtonText: 'Permanently Delete HOD',
          onConfirm: async () => {
            const r = await apiFetch(`${API}/admin/hods/${teacherId}`, { method: 'DELETE' });
            showToast(r.message || 'HOD account deleted successfully.', 'success');
            await loadHODs();
          }
        });
        return;
      }

      document.getElementById('delete-hod-name').textContent = name;
      document.getElementById('delete-step2-name').textContent = name;
      document.getElementById('delete-dept-name').textContent = deptName;
      document.getElementById('delete-confirm-input').value = '';
      document.getElementById('delete-error').style.display = 'none';

      checkDeleteConfirmation();
      setDeleteStep(1);
      showModal('delete-modal');
    }

    function closeDeleteModal() {
      hideModal('delete-modal');
      deleteTargetId = null;
      currentDeleteHod = null;
    }

    function goToDeleteStep2() {
      document.getElementById('delete-confirm-input').value = '';
      checkDeleteConfirmation();
      document.getElementById('delete-error').style.display = 'none';
      setDeleteStep(2);
      setTimeout(() => {
        const inp = document.getElementById('delete-confirm-input');
        if (inp) inp.focus();
      }, 50);
    }

    function goToDeleteStep1() {
      setDeleteStep(1);
    }

    async function submitDeleteHOD() {
      if (!deleteTargetId) return;
      const confirmVal = (document.getElementById('delete-confirm-input').value || '').trim();
      if (confirmVal !== 'DELETE') {
        const errEl = document.getElementById('delete-error');
        errEl.textContent = 'Please type DELETE into the confirmation box to proceed.';
        errEl.style.display = 'block';
        return;
      }

      const btn = document.getElementById('delete-btn');
      const errEl = document.getElementById('delete-error');
      btn.disabled = true;
      btn.textContent = 'Removing...';
      errEl.style.display = 'none';

      try {
        const r = await apiFetch(`${API}/admin/hods/${deleteTargetId}`, { method: 'DELETE' });
        closeDeleteModal();
        showToast(r.message || 'HOD removed successfully', 'success');
        await loadHODs();
        await loadDepartments();
      } catch (err) {
        if (err.message && (err.message.includes('not found') || err.message.includes('cleared'))) {
          closeDeleteModal();
          showToast('HOD record updated.', 'info');
          await loadHODs();
          await loadDepartments();
        } else {
          errEl.textContent = err.message || 'Failed to delete HOD';
          errEl.style.display = 'block';
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Permanently Remove HOD';
        checkDeleteConfirmation();
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
    // ─── Pending HOD Registrations ───────────────────────────
    var pendingHodsList = [];
    var targetApproveHodId = null;
    var allTeachersList = [];

    async function loadPendingHods() {
      try {
        const r = await apiFetch(`${API}/admin/registrations/pending-hods`);
        pendingHodsList = r.data || [];
        renderPendingHods();
        applyFacultyFilters();
      } catch (e) {
        console.error('Failed to load pending HODs:', e);
        const wrap = document.getElementById('pending-hods-wrap');
        if (wrap) {
          wrap.innerHTML = `<div style="color: var(--status-absent); font-size: 0.85rem; text-align: center; padding: 1rem;">Failed to load pending registrations: ${escHtml(e.message)}</div>`;
        }
      }
    }

    function renderPendingHods() {
      const card = document.getElementById('pending-hods-card');
      const badge = document.getElementById('pending-hods-badge');
      const wrap = document.getElementById('pending-hods-wrap');
      const count = (pendingHodsList || []).length;

      if (badge) badge.textContent = `${count} Pending`;

      const tabBadgeApp = document.getElementById('tab-badge-approvals');
      if (tabBadgeApp) {
        tabBadgeApp.textContent = count;
        if (count > 0) tabBadgeApp.classList.add('has-pending');
        else tabBadgeApp.classList.remove('has-pending');
      }

      const kpiBadgeApp = document.getElementById('kpi-approvals-badge');
      if (kpiBadgeApp) {
        kpiBadgeApp.textContent = count;
        if (count > 0) kpiBadgeApp.classList.add('has-pending');
        else kpiBadgeApp.classList.remove('has-pending');
      }

      const chipBadge = document.getElementById('chip-count-pending');
      if (chipBadge) chipBadge.textContent = count;

      if (!count) {
        if (card) {
          if (currentFacultyMainTab === 'approvals' || activeFacultyRoleFilter === 'PENDING') {
            card.style.display = 'block';
            if (wrap) {
              wrap.innerHTML = `
                <div class="fac-empty-state" style="padding: 2.5rem 1.25rem; text-align: center;">
                  <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--status-present-bg, rgba(16, 185, 129, 0.12)); color: var(--status-present, #10b981); display: flex; align-items: center; justify-content: center; margin: 0 auto 0.85rem auto;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin: 0 0 0.35rem 0;">No Pending Registration Approvals</h3>
                  <p style="font-size: 0.84rem; color: var(--text-muted); max-width: 440px; margin: 0 auto 1.25rem auto; line-height: 1.5;">
                    All candidate self-registration requests have been reviewed. When prospective faculty or HOD candidates apply through the registration portal, their requests will appear here for administrator verification.
                  </p>
                  <div class="fac-approvals-empty-actions">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="openRegGatesModal()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                      <span>Check Registration Gates</span>
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="loadPendingHods()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>
              `;
            }
          } else {
            card.style.display = 'none';
          }
        }
        return;
      }

      if (card) card.style.display = 'block';
      if (!wrap) return;

      wrap.innerHTML = `
        <div class="fac-desktop-approvals-table" style="overflow-x: auto;">
          <table class="table" style="margin: 0; font-size: 0.85rem;">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Requested Dept</th>
                <th>Institutional Gmail</th>
                <th>Phone</th>
                <th>Governance Impact</th>
                <th>Applied On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${pendingHodsList.map(item => {
                const hasCurrentHod = !!item.current_hod;
                const impactTag = hasCurrentHod
                  ? `<span style="display: inline-flex; align-items: center; gap: 0.3rem; background: var(--status-late-bg); color: var(--status-late); border-radius: var(--radius-sm); padding: 0.2rem 0.55rem; font-size: 0.76rem; font-weight: 600;">Replaces ${escHtml(item.current_hod.full_name)}</span>`
                  : `<span style="display: inline-flex; align-items: center; gap: 0.3rem; background: var(--status-present-bg); color: var(--status-present); border-radius: var(--radius-sm); padding: 0.2rem 0.55rem; font-size: 0.76rem; font-weight: 600;">Vacant Department</span>`;

                return `
                  <tr>
                    <td>
                      <div style="font-weight: 600; color: var(--text-main);">${escHtml(item.full_name)}</div>
                      ${item.employee_id ? `<div style="font-size: 0.74rem; color: var(--text-muted); font-family: monospace;">Emp ID: ${escHtml(item.employee_id)}</div>` : ''}
                    </td>
                    <td>
                      <span style="font-weight: 700; color: var(--color-primary);">${escHtml(item.department_name || '')} (${escHtml(item.department_code || '')})</span>
                    </td>
                    <td style="font-family: monospace; font-size: 0.82rem; color: var(--color-primary);">${escHtml(item.email)}</td>
                    <td style="font-size: 0.8rem; color: var(--text-muted);">${escHtml(item.phone || '—')}</td>
                    <td>${impactTag}</td>
                    <td style="font-size: 0.78rem; color: var(--text-muted);">${fmtDate(item.created_at)}</td>
                    <td>
                      <div style="display: flex; gap: 0.4rem; align-items: center;">
                        <button type="button" class="btn btn-primary btn-sm" onclick="openApproveHodModal(${item.id})">Approve</button>
                        <button type="button" class="btn btn-secondary btn-sm" style="color: var(--status-absent); border-color: var(--status-absent);" onclick="promptRejectHod(${item.id}, '${escHtml(item.full_name)}')">Reject</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="fac-mobile-approvals-cards">
          ${pendingHodsList.map(item => {
            const hasCurrentHod = !!item.current_hod;
            const impactTag = hasCurrentHod
              ? `<span style="display: inline-flex; align-items: center; gap: 0.3rem; background: var(--status-late-bg); color: var(--status-late); border-radius: var(--radius-sm); padding: 0.2rem 0.55rem; font-size: 0.76rem; font-weight: 600;">Replaces ${escHtml(item.current_hod.full_name)}</span>`
              : `<span style="display: inline-flex; align-items: center; gap: 0.3rem; background: var(--status-present-bg); color: var(--status-present); border-radius: var(--radius-sm); padding: 0.2rem 0.55rem; font-size: 0.76rem; font-weight: 600;">Vacant Department</span>`;

            return `
              <div class="fac-mini-card" style="padding: 0.85rem; border-left: 3px solid var(--status-late, #f59e0b);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
                  <div>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${escHtml(item.full_name)}</div>
                    <div style="font-size: 0.76rem; color: var(--color-primary); font-family: monospace;">${escHtml(item.email)}</div>
                  </div>
                  <span class="fac-dept-badge">${escHtml(item.department_code || item.department_name || '')}</span>
                </div>
                <div style="margin-bottom: 0.6rem;">
                  ${impactTag}
                </div>
                <div style="display: flex; gap: 0.4rem;">
                  <button type="button" class="btn btn-primary btn-sm" style="flex: 1;" onclick="openApproveHodModal(${item.id})">Approve</button>
                  <button type="button" class="btn btn-secondary btn-sm" style="flex: 1; color: var(--status-absent); border-color: var(--status-absent);" onclick="promptRejectHod(${item.id}, '${escHtml(item.full_name)}')">Reject</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    function openApproveHodModal(reqId) {
      targetApproveHodId = reqId;
      const item = pendingHodsList.find(p => p.id === reqId);
      if (!item) return;

      const errEl = document.getElementById('approve-hod-err');
      errEl.style.display = 'none';

      const hasCurrentHod = !!item.current_hod;
      document.getElementById('approve-hod-body').innerHTML = `
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Candidate</span>
            <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${escHtml(item.full_name)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">Institutional Gmail:</span>
            <span style="font-family: monospace; font-size: 0.85rem; color: var(--color-primary); font-weight: 600;">${escHtml(item.email)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">Department:</span>
            <span style="font-weight: 700; color: var(--color-primary);">${escHtml(item.department_name)} (${escHtml(item.department_code)})</span>
          </div>
        </div>

        ${hasCurrentHod ? `
          <div style="background: var(--status-late-bg); border: 1px solid var(--status-late); border-radius: var(--radius-sm); padding: 0.85rem; margin-bottom: 1rem; font-size: 0.82rem; color: var(--text-main); line-height: 1.45;">
            <div style="font-weight: 700; color: var(--status-late); margin-bottom: 0.25rem;">Active HOD Replacement Notice (1 HOD Invariant)</div>
            <div>Department <strong>${escHtml(item.department_name)}</strong> is currently led by <strong>${escHtml(item.current_hod.full_name)}</strong> (${escHtml(item.current_hod.gmail)}). Approving this candidate will automatically deactivate the prior HOD appointment and transfer official department leadership to <strong>${escHtml(item.full_name)}</strong>.</div>
          </div>
        ` : `
          <div style="background: var(--status-present-bg); border: 1px solid var(--status-present); border-radius: var(--radius-sm); padding: 0.75rem; margin-bottom: 1rem; font-size: 0.82rem; color: var(--text-main); line-height: 1.45;">
            <div style="font-weight: 700; color: var(--status-present); margin-bottom: 0.2rem;">Vacant Department Leadership</div>
            <div>This department currently has no active HOD. Approving will activate the user account and appoint them as the sole official Head of Department.</div>
          </div>
        `}
      `;

      showModal('approve-hod-modal');
    }

    function closeApproveHodModal() {
      hideModal('approve-hod-modal');
      targetApproveHodId = null;
    }

    async function confirmApproveHod() {
      if (!targetApproveHodId) return;
      const btn = document.getElementById('btn-confirm-approve-hod');
      const errEl = document.getElementById('approve-hod-err');
      btn.disabled = true;
      btn.textContent = 'Activating...';
      errEl.style.display = 'none';

      try {
        const res = await apiFetch(`${API}/admin/registrations/hods/${targetApproveHodId}/approve`, {
          method: 'POST'
        });
        closeApproveHodModal();
        showToast(res.message || 'Registration approved and activated successfully!', 'success');
        await loadPendingHods();
        await loadHODs();
        await loadAllFaculty();
      } catch (err) {
        errEl.textContent = err.message || 'Failed to approve registration.';
        errEl.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm & Activate Account';
      }
    }

    async function promptRejectHod(reqId, name) {
      const reason = await showStyledPrompt({
        title: 'Reject Registration Application',
        message: `Enter rejection reason for prospective faculty/HOD ${name}:`,
        defaultValue: 'Application requirements not met',
        label: 'Rejection Reason',
        confirmText: 'Reject Application',
        isDanger: true
      });
      if (reason === null) return;

      try {
        const res = await apiFetch(`${API}/admin/registrations/hods/${reqId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason.trim() || 'Application not approved' })
        });
        showToast(res.message || 'Registration rejected.', 'info');
        await loadPendingHods();
        await loadAllFaculty();
      } catch (err) {
        showToast(err.message || 'Failed to reject registration.', 'error');
      }
    }

    // ─── Common Faculty Management: Managed directly by Admin ───
    async function loadCommonFacultyManager() {}
    function renderCommonFacultyManager() {}
    async function openAppointCommonMgrModal() {}
    function closeAppointCommonMgrModal() {}
    async function submitAppointCommonMgr() {}
    async function removeCommonMgr() {}

    // ─── 3-Dot Kebab Action Menu Helper ───────────────────────
    function toggleHodKebab(event, containerId) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      const container = document.getElementById(containerId);
      const isOpen = container ? container.classList.contains('open') : false;
      closeAllKebabs();
      if (container && !isOpen) {
        container.classList.add('open');
        const btn = container.querySelector('.kebab-btn');
        if (btn) btn.setAttribute('aria-expanded', 'true');
      }
    }

    function closeAllKebabs() {
      document.querySelectorAll('.kebab-menu-container.open').forEach(el => {
        el.classList.remove('open');
        const btn = el.querySelector('.kebab-btn');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }

    // ─── View Full HOD Information Modal ─────────────────────
    function openHodDetailModal(teacherId) {
      const h = hodData.find(x => x.teacher_id === teacherId);
      if (!h) return;

      let modal = document.getElementById('hod-detail-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'hod-detail-modal';
        modal.className = 'modal-backdrop';
        modal.style.display = 'none';
        modal.innerHTML = `
          <div class="modal-card" style="max-width: 480px; width: 92%; margin: auto; max-height: calc(100vh - 2.5rem); max-height: calc(100dvh - 2.5rem); overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
              <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--text-main);">HOD Full Information</h2>
              <button type="button" onclick="closeHodDetailModal()" style="font-size: 1.4rem; color: var(--text-muted); background: none; border: none; cursor: pointer; line-height: 1;">&times;</button>
            </div>
            <div id="hod-detail-content"></div>
            <div style="display: flex; gap: 0.6rem; justify-content: flex-end; margin-top: 1.5rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary" onclick="closeHodDetailModal()">Close</button>
              <button type="button" class="btn btn-primary" id="hod-detail-reassign-btn">Reassign Dept</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      const initial = (h.full_name || 'H').charAt(0).toUpperCase();
      const statusBadge = h.must_change_password
        ? `<span class="badge badge-warning">Pending Login</span>`
        : `<span class="badge badge-present">Active</span>`;
      const googleDisplay = h.google_linked
        ? `<span style="color: var(--status-present); font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>Linked</span>`
        : `<span style="color: var(--text-muted);">Not linked</span>`;

      const content = document.getElementById('hod-detail-content');
      if (content) {
        content.innerHTML = `
          <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--bg-surface); border-radius: var(--radius-md, 8px); border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--color-primary-light); color: var(--color-primary); font-size: 1.2rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${initial}
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); line-height: 1.2;">${escHtml(cleanFacultyDisplayName(h.full_name))}</div>
              <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.3rem; flex-wrap: wrap;">
                ${h.employee_id ? `<span style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace; background: var(--bg-card); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color);">${escHtml(h.employee_id)}</span>` : ''}
                <span style="font-size: 0.78rem; font-weight: 600; color: var(--color-primary); background: var(--color-primary-light); padding: 2px 8px; border-radius: 4px;">${escHtml(h.department_name || 'Unassigned')}</span>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr; gap: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm, 6px);">
              <span style="font-size: 0.82rem; color: var(--text-muted);">Department</span>
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">${escHtml(h.department_name || 'Unassigned')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm, 6px);">
              <span style="font-size: 0.82rem; color: var(--text-muted);">Institutional Gmail</span>
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-primary); font-family: monospace;">${escHtml(h.gmail || '—')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm, 6px);">
              <span style="font-size: 0.82rem; color: var(--text-muted);">Account Status</span>
              <div>${statusBadge}</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm, 6px);">
              <span style="font-size: 0.82rem; color: var(--text-muted);">Google Account</span>
              <div>${googleDisplay}</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm, 6px);">
              <span style="font-size: 0.82rem; color: var(--text-muted);">Phone Number</span>
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">${escHtml(h.phone || 'Not specified')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm, 6px);">
              <span style="font-size: 0.82rem; color: var(--text-muted);">Appointed Since</span>
              <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-muted);">${fmtDate(h.created_at)}</span>
            </div>
          </div>
        `;
      }

      const reassignBtn = document.getElementById('hod-detail-reassign-btn');
      if (reassignBtn) {
        reassignBtn.onclick = function() {
          closeHodDetailModal();
          openReassignModal(h.teacher_id, h.full_name);
        };
      }

      openModal('hod-detail-modal');
    }

    function closeHodDetailModal() {
      closeModal('hod-detail-modal');
    }

    window.openHodDetailModal = openHodDetailModal;
    window.closeHodDetailModal = closeHodDetailModal;

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.kebab-menu-container')) {
        closeAllKebabs();
      }
      if (!e.target.closest('.fac-kebab-wrap')) {
        closeAllKebabMenus();
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeAllKebabs();
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
    let safetySuspendTarget = { id: null, name: '', status: '' };

    function openSuspendSafetyModal(id, name, currentStatus) {
      safetySuspendTarget = { id, name, status: currentStatus };
      const targetNameEl = document.getElementById('suspend-target-name');
      const inputEl = document.getElementById('suspend-confirm-input');
      const btn = document.getElementById('btn-confirm-safety-suspend');
      const errEl = document.getElementById('suspend-safety-error');

      if (targetNameEl) targetNameEl.textContent = name || 'Faculty';
      if (inputEl) inputEl.value = '';
      if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

      const isSuspending = currentStatus === 'ACTIVE';
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.45';
        btn.style.cursor = 'not-allowed';
        btn.textContent = isSuspending ? 'Suspend Faculty' : 'Activate Faculty';
        btn.style.background = isSuspending ? '#d97706' : 'var(--color-primary)';
        btn.style.borderColor = isSuspending ? '#d97706' : 'var(--color-primary)';
      }

      showModal('safety-suspend-modal');
      setTimeout(() => inputEl && inputEl.focus(), 100);
    }
    function closeSuspendSafetyModal() {
      hideModal('safety-suspend-modal');
    }
    window.openSuspendSafetyModal = openSuspendSafetyModal;
    window.closeSuspendSafetyModal = closeSuspendSafetyModal;

    function checkSuspendSafetyInput() {
      const inputEl = document.getElementById('suspend-confirm-input');
      const btn = document.getElementById('btn-confirm-safety-suspend');
      if (!inputEl || !btn) return;
      const val = inputEl.value.trim().toUpperCase();
      if (val === 'SUSPEND') {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      } else {
        btn.disabled = true;
        btn.style.opacity = '0.45';
        btn.style.cursor = 'not-allowed';
      }
    }
    window.checkSuspendSafetyInput = checkSuspendSafetyInput;

    async function submitSuspendSafetyConfirm() {
      if (!safetySuspendTarget.id) return;
      const btn = document.getElementById('btn-confirm-safety-suspend');
      const errEl = document.getElementById('suspend-safety-error');
      if (errEl) errEl.style.display = 'none';

      const nextStatus = safetySuspendTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

      try {
        if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }
        const res = await apiFetch(`${API}/admin/teachers/${safetySuspendTarget.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus })
        });

        if (res && res.success) {
          closeSuspendSafetyModal();
          showToast(res.message || `Faculty marked as ${nextStatus}`, 'success');
          await loadAllFaculty();
          await loadHODs();
        } else {
          throw new Error(res.message || 'Failed to update faculty status');
        }
      } catch (err) {
        if (errEl) {
          errEl.textContent = err.message || 'Error updating status.';
          errEl.style.display = 'block';
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = safetySuspendTarget.status === 'ACTIVE' ? 'Suspend Faculty' : 'Activate Faculty';
        }
      }
    }
    window.submitSuspendSafetyConfirm = submitSuspendSafetyConfirm;

    // ─── Safety Confirmation: Remove to Trash (Type REMOVE) ──────
    let safetyRemoveTarget = { id: null, name: '' };

    function openRemoveSafetyModal(id, name) {
      safetyRemoveTarget = { id, name };
      const targetNameEl = document.getElementById('remove-target-name');
      const inputEl = document.getElementById('remove-confirm-input');
      const btn = document.getElementById('btn-confirm-safety-remove');
      const errEl = document.getElementById('remove-safety-error');

      if (targetNameEl) targetNameEl.textContent = name || 'Faculty Member';
      if (inputEl) inputEl.value = '';
      if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.45';
        btn.style.cursor = 'not-allowed';
        btn.textContent = 'Move to Trash';
      }

      showModal('safety-remove-modal');
      setTimeout(() => inputEl && inputEl.focus(), 100);
    }
    function closeRemoveSafetyModal() {
      hideModal('safety-remove-modal');
    }
    window.openRemoveSafetyModal = openRemoveSafetyModal;
    window.closeRemoveSafetyModal = closeRemoveSafetyModal;

    function checkRemoveSafetyInput() {
      const inputEl = document.getElementById('remove-confirm-input');
      const btn = document.getElementById('btn-confirm-safety-remove');
      if (!inputEl || !btn) return;
      const val = inputEl.value.trim().toUpperCase();
      if (val === 'REMOVE') {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      } else {
        btn.disabled = true;
        btn.style.opacity = '0.45';
        btn.style.cursor = 'not-allowed';
      }
    }
    window.checkRemoveSafetyInput = checkRemoveSafetyInput;

    async function submitRemoveSafetyConfirm() {
      if (!safetyRemoveTarget.id) return;
      const btn = document.getElementById('btn-confirm-safety-remove');
      const errEl = document.getElementById('remove-safety-error');
      if (errEl) errEl.style.display = 'none';

      try {
        if (btn) { btn.disabled = true; btn.textContent = 'Moving to Trash...'; }
        const res = await apiFetch(`${API}/admin/teachers/${safetyRemoveTarget.id}`, {
          method: 'DELETE'
        });

        if (res && res.success) {
          closeRemoveSafetyModal();
          showToast(res.message || 'Faculty moved to Trash (30 days retention)', 'success');
          await loadAllFaculty();
          await loadHODs();
          await loadTrashCount();
        } else {
          throw new Error(res.message || 'Failed to remove faculty');
        }
      } catch (err) {
        if (errEl) {
          errEl.textContent = err.message || 'Error moving faculty to Trash.';
          errEl.style.display = 'block';
        }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Move to Trash'; }
      }
    }
    window.submitRemoveSafetyConfirm = submitRemoveSafetyConfirm;

    // ─── HOD ASSIGNMENT MODALS & FLOWS (SEARCH & TYPED CONFIRMATION) ───────────
    let assignHodTarget = { teacherId: null, name: '', deptId: null, deptName: '' };
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
     * Typed Safety Confirmation Modal for HOD Assignment
     */
    function openAssignHodSafetyModal(teacherId, name, deptId, deptName) {
      assignHodTarget = { teacherId, name, deptId, deptName };

      const nameEl = document.getElementById('assign-hod-target-name');
      const deptEl = document.getElementById('assign-hod-target-dept');
      const inputEl = document.getElementById('assign-hod-confirm-input');
      const btn = document.getElementById('btn-confirm-safety-assign-hod');
      const errEl = document.getElementById('assign-hod-safety-error');

      if (nameEl) nameEl.textContent = name || 'Faculty';
      if (deptEl) deptEl.textContent = deptName || 'Selected Department';
      if (inputEl) inputEl.value = '';
      if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.45';
        btn.style.cursor = 'not-allowed';
      }

      showModal('safety-assign-hod-modal');
      setTimeout(() => inputEl && inputEl.focus(), 100);
    }
    window.openAssignHodSafetyModal = openAssignHodSafetyModal;

    function closeAssignHodSafetyModal() {
      hideModal('safety-assign-hod-modal');
    }
    window.closeAssignHodSafetyModal = closeAssignHodSafetyModal;

    function checkAssignHodSafetyInput() {
      const inputEl = document.getElementById('assign-hod-confirm-input');
      const btn = document.getElementById('btn-confirm-safety-assign-hod');
      if (!inputEl || !btn) return;
      const val = inputEl.value.trim().toUpperCase();
      if (val === 'CONFIRM') {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      } else {
        btn.disabled = true;
        btn.style.opacity = '0.45';
        btn.style.cursor = 'not-allowed';
      }
    }
    window.checkAssignHodSafetyInput = checkAssignHodSafetyInput;

    async function submitAssignHodSafetyConfirm() {
      if (!assignHodTarget.teacherId || !assignHodTarget.deptId) return;
      const btn = document.getElementById('btn-confirm-safety-assign-hod');
      const errEl = document.getElementById('assign-hod-safety-error');
      if (errEl) errEl.style.display = 'none';

      try {
        if (btn) { btn.disabled = true; btn.textContent = 'Appointing HOD...'; }
        const res = await apiFetch(`${API}/admin/hods/assign-existing`, {
          method: 'POST',
          body: JSON.stringify({
            teacher_id: parseInt(assignHodTarget.teacherId, 10),
            department_id: parseInt(assignHodTarget.deptId, 10)
          })
        });

        if (res && res.success) {
          closeAssignHodSafetyModal();
          showToast(res.message || `Successfully appointed ${assignHodTarget.name} as HOD of ${assignHodTarget.deptName}!`, 'success');
          await loadAllFaculty();
          await loadHODs();
        } else {
          throw new Error(res.message || 'Failed to appoint HOD');
        }
      } catch (err) {
        if (errEl) {
          errEl.textContent = err.message || 'Error appointing HOD.';
          errEl.style.display = 'block';
        }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Confirm Appointment'; }
      }
    }
    window.submitAssignHodSafetyConfirm = submitAssignHodSafetyConfirm;

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

    // Window bindings for pending registrations & common faculty manager
    window.loadPendingHods = loadPendingHods;
    window.renderPendingHods = renderPendingHods;
    window.openApproveHodModal = openApproveHodModal;
    window.closeApproveHodModal = closeApproveHodModal;
    window.confirmApproveHod = confirmApproveHod;
    window.promptRejectHod = promptRejectHod;
    window.loadCommonFacultyManager = loadCommonFacultyManager;
    window.renderCommonFacultyManager = renderCommonFacultyManager;
    window.openAppointCommonMgrModal = openAppointCommonMgrModal;
    window.closeAppointCommonMgrModal = closeAppointCommonMgrModal;
    window.submitAppointCommonMgr = submitAppointCommonMgr;
    window.removeCommonMgr = removeCommonMgr;


