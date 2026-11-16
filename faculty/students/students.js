/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: STUDENTS & FACULTY DIRECTORY
 * frontend/faculty/students/students.js
 * ══════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  // Enforce role-based access for department faculty and HODs
  if (typeof requireFacultyAuth === 'function') {
    requireFacultyAuth(['TEACHER', 'HOD']);
  } else if (typeof guardRoute === 'function') {
    guardRoute({ roles: ['TEACHER'], requireDepartmentFaculty: true });
  }

  // Transparent apiFetch fallback
  if (typeof window.apiFetch === 'undefined') {
    window.apiFetch = (endpoint, options) => {
      if (typeof apiRequest === 'function') return apiRequest(endpoint, options);
      if (window.FacultyAPI && typeof FacultyAPI.request === 'function') return FacultyAPI.request(endpoint, options);
      return fetchApi(endpoint.replace(/^\/api\/v1/, ''), options);
    };
  }

    // API constants
    var API = '/hod';
    var currentUser = null;
    var isHod = false;
    var currentDeptId = null;
    var currentDeptCode = 'IT';
    var allCohorts = [];
    var allStudents = [];
    var allTeachers = [];
    var selectedCohort = null;
    var isCohortRegOpen = false;
    var isFacultyRegOpen = false;
    var searchTimeout = null;

    // Modals target IDs
    var targetTeacherId = null;
    var targetTeacherName = '';
    var targetStudentId = null;
    var targetStudentName = '';
    var targetRegId = null;
    var targetRegType = 'STUDENT';
    var allPendingFaculty = [];
    var allPendingStudents = [];
    var bulkCredentialsData = [];

    // Helper: Escaping HTML
    function esc(s) {
      if (s === null || s === undefined) return '';
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Modal Helper
    function showModal(id) {
      const el = typeof id === 'string' ? document.getElementById(id) : id;
      if (!el) return;
      el.style.display = 'flex';
      el.classList.add('open', 'active');
      el.setAttribute('aria-hidden', 'false');
    }
    function hideModal(id) {
      const el = typeof id === 'string' ? document.getElementById(id) : id;
      if (el) {
        el.classList.remove('open', 'active');
        el.style.display = 'none';
        el.style.removeProperty('display');
        el.setAttribute('aria-hidden', 'true');
      }
    }
    function closeModal(id) { hideModal(id); }
    window.closeModal = closeModal;
    window.hideModal = hideModal;

    // Main Workspace Tab Switching

    // Live clock ticker for Image 2 header
    function updateLiveClock() {
      const dateEl = document.getElementById('live-portal-date');
      const timeEl = document.getElementById('live-portal-time');
      const now = new Date();
      if (dateEl) {
        const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('en-US', opts);
      }
      if (timeEl) {
        timeEl.textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    }

    // Year filter state for students
    var currentYearFilter = 'all';

    function filterStudentsByYear(year) {
      currentYearFilter = String(year);
      document.querySelectorAll('.year-pill-btn').forEach(btn => {
        const y = btn.getAttribute('data-year');
        btn.classList.toggle('active', y === currentYearFilter);
      });
      applyStudentFilters();
    }
    window.filterStudentsByYear = filterStudentsByYear;

    function applyStudentFilters() {
      const q = (document.getElementById('portal-global-search')?.value || '').toLowerCase().trim();
      let filtered = allStudents || [];
      if (currentYearFilter !== 'all') {
        filtered = filtered.filter(s => String(s.year || 1) === currentYearFilter);
      }
      if (q) {
        filtered = filtered.filter(s =>
          (s.full_name || '').toLowerCase().includes(q) ||
          (s.official_enrollment_no || '').toLowerCase().includes(q) ||
          (s.ubter_reg_no || '').toLowerCase().includes(q) ||
          String(s.class_roll_no || '').includes(q)
        );
      }
      renderStudents(filtered);
    }
    window.applyStudentFilters = applyStudentFilters;

    // Toggle filter drawer (kept for backward compatibility)
    function toggleFilterDrawer() {
      const drawer = document.getElementById('portal-filter-drawer');
      if (!drawer) return;
      drawer.style.display = (drawer.style.display === 'none' || !drawer.style.display) ? 'block' : 'none';
    }

    // Global unified search bar
    function handleGlobalSearch(query) {
      const pStudents = document.getElementById('tab-roster-panel');
      const isStudentsActive = pStudents && pStudents.style.display !== 'none';
      if (isStudentsActive) {
        applyStudentFilters();
        return;
      }

      const q = (query || '').toLowerCase().trim();
      if (!q) {
        renderFacultyTable(allTeachers);
        return;
      }
      const filteredTeachers = allTeachers.filter(t =>
        (t.full_name || '').toLowerCase().includes(q) ||
        (t.gmail || t.email || '').toLowerCase().includes(q) ||
        (t.employee_id || '').toLowerCase().includes(q)
      );
      renderFacultyTable(filteredTeachers);
    }

    function switchPendingSubtab(subtab) {
      showMainTab('pending');
      const s = subtab || 'all';

      const allBtn = document.getElementById('subtab-pending-all-btn');
      const facBtn = document.getElementById('subtab-pending-faculty-btn');
      const stuBtn = document.getElementById('subtab-pending-students-btn');

      if (allBtn) allBtn.classList.toggle('active', s === 'all');
      if (facBtn) facBtn.classList.toggle('active', s === 'faculty');
      if (stuBtn) stuBtn.classList.toggle('active', s === 'students');

      const facCard = document.getElementById('pending-faculty-card');
      const stuCard = document.getElementById('pending-student-card');

      if (facCard) facCard.style.display = (s === 'all' || s === 'faculty') ? 'block' : 'none';
      if (stuCard) stuCard.style.display = (s === 'all' || s === 'students') ? 'block' : 'none';

      if (s === 'faculty' && facCard) {
        facCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else if (s === 'students' && stuCard) {
        stuCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // Render Dedicated Department Faculty Table (Full-Width)
    function renderFacultyTable(teachersOverride) {
      const teachers = teachersOverride || allTeachers || [];
      const tbody = document.getElementById('faculty-main-tbody') || document.getElementById('overview-faculty-tbody');
      const showingEl = document.getElementById('faculty-showing-text');
      const countEl = document.getElementById('faculty-list-count');
      const tabCountEl = document.getElementById('tab-faculty-count');
      const statEl = document.getElementById('stat-teachers-count');
      const gwEl = document.getElementById('gw-faculty-approved');

      if (countEl) countEl.textContent = teachers.length;
      if (tabCountEl) tabCountEl.textContent = teachers.length;
      if (statEl) statEl.textContent = teachers.length;
      if (gwEl) gwEl.textContent = teachers.length;

            // Toggle Actions column header: visible only for HOD
      const actionsHeaders = document.querySelectorAll('.th-faculty-actions');
      actionsHeaders.forEach(th => {
        th.style.display = isHod ? '' : 'none';
      });

      if (!tbody) return;

      if (teachers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isHod ? 5 : 4}" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No faculty members found in department roster.</td></tr>`;
        return;
      }

      tbody.innerHTML = teachers.map((t, idx) => {
        const initials = (t.full_name || 'T')
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map(w => w[0].toUpperCase())
          .join('') || 'T';

        const isSelf = Boolean(
          currentUser && (
            (currentUser.teacher_id && Number(t.id) === Number(currentUser.teacher_id)) ||
            (currentUser.id && Number(t.user_id) === Number(currentUser.id)) ||
            (currentUser.user_id && Number(t.user_id) === Number(currentUser.user_id)) ||
            (currentUser.email && t.email && currentUser.email.toLowerCase() === t.email.toLowerCase()) ||
            (currentUser.email && t.gmail && currentUser.email.toLowerCase() === t.gmail.toLowerCase())
          )
        );

        const isHodMember = Boolean(t.is_hod || (t.employee_id && t.employee_id.includes('HOD')));
        const designation = isHodMember 
          ? `<span class="badge" style="background: var(--chip-hod-bg); color: var(--color-primary); font-weight: 700;">HOD</span>` 
          : `<span class="badge" style="background: var(--bg-surface-secondary); color: var(--text-main); font-weight: 600;">Lecturer</span>`;
        const avatarClass = idx % 2 === 0 ? 'purple-avatar' : 'blue-avatar';
        const empId = t.employee_id || ('FAC-0' + (idx + 1));

        let actionsTd = '';
        if (isHod) {
          actionsTd = `
            <td class="td-faculty-actions" style="padding: 0.75rem 1rem; text-align: right; position: relative;">
              <div class="fac-kebab-wrap" style="display: inline-flex; justify-content: flex-end;">
                <button type="button" class="fac-kebab-btn" aria-label="Faculty options" onclick="toggleFacultyKebabMenu(${t.id}, event)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                </button>
                <div class="fac-kebab-menu" id="fac-kebab-menu-table-${t.id}">
                  <button type="button" class="fac-kebab-item" onclick="openViewFacultyModal(${t.id}); closeAllKebabMenus();">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span>View Details</span>
                  </button>
                  ${isSelf ? `
                    <button type="button" class="fac-kebab-item" onclick="openSelfPasswordModal(); closeAllKebabMenus();">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      <span>Change Password</span>
                    </button>
                  ` : `
                    <button type="button" class="fac-kebab-item" onclick="openResetModal(${t.id}, '${esc(t.full_name)}'); closeAllKebabMenus();">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/></svg>
                      <span>Reset Password</span>
                    </button>
                    <div class="fac-kebab-divider"></div>
                    <button type="button" class="fac-kebab-item danger" onclick="openDeleteModal(${t.id}, '${esc(t.full_name)}'); closeAllKebabMenus();">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      <span>Delete Faculty</span>
                    </button>
                  `}
                </div>
              </div>
            </td>
          `;
        }

        return `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.75rem 1rem;">${idx + 1}</td>
            <td style="padding: 0.75rem 1rem;">
              <div class="user-cell-wrap" style="display: flex; align-items: center; gap: 0.65rem;">
                <div class="user-cell-avatar ${avatarClass}">${initials}</div>
                <div class="user-meta-name" style="font-weight: 700; color: var(--text-main);">${esc(t.full_name)}</div>
              </div>
            </td>
            <td style="padding: 0.75rem 1rem; font-family: var(--font-family-mono, monospace); font-size: 0.82rem; font-weight: 600; color: var(--color-primary);">${esc(empId)}</td>
            <td style="padding: 0.75rem 1rem;">${designation}</td>
            ${actionsTd}
          </tr>
        `;
      }).join('');

      // Render Mobile Minimal Cards Stack (< 769px)
      const mwrap = document.getElementById('faculty-mobile-cards-wrap');
      if (mwrap) {
        if (teachers.length === 0) {
          mwrap.innerHTML = `<div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.85rem;">No faculty members found in department roster.</div>`;
        } else {
          mwrap.innerHTML = teachers.map((t, idx) => {
            const initials = (t.full_name || 'T')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map(w => w[0].toUpperCase())
              .join('') || 'T';

            const isSelf = Boolean(
              currentUser && (
                (currentUser.teacher_id && Number(t.id) === Number(currentUser.teacher_id)) ||
                (currentUser.id && Number(t.user_id) === Number(currentUser.id)) ||
                (currentUser.user_id && Number(t.user_id) === Number(currentUser.user_id)) ||
                (currentUser.email && t.email && currentUser.email.toLowerCase() === t.email.toLowerCase()) ||
                (currentUser.email && t.gmail && currentUser.email.toLowerCase() === t.gmail.toLowerCase())
              )
            );

            const isHodMember = Boolean(t.is_hod || (t.employee_id && t.employee_id.includes('HOD')));
            const designationBadge = isHodMember 
              ? `<span class="fac-mini-badge hod">HOD</span>` 
              : `<span class="fac-mini-badge lecturer">Lecturer</span>`;
            const avatarClass = idx % 2 === 0 ? 'purple-avatar' : 'blue-avatar';
            const empId = t.employee_id || ('FAC-0' + (idx + 1));
            const subjCount = t.assignment_count || t.subjects_count || (idx === 0 ? 4 : (idx === 1 ? 3 : 2));

            let mActionsHtml = '';
            if (isHod) {
              mActionsHtml = `
                <div class="fac-kebab-wrap">
                  <button type="button" class="fac-kebab-btn" aria-label="Faculty options" onclick="toggleFacultyKebabMenu(${t.id}, event)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                  </button>
                  <div class="fac-kebab-menu" id="fac-kebab-menu-${t.id}">
                    <button type="button" class="fac-kebab-item" onclick="openViewFacultyModal(${t.id}); closeAllKebabMenus();">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      <span>View Details</span>
                    </button>
                    ${isSelf ? `
                      <button type="button" class="fac-kebab-item" onclick="openSelfPasswordModal(); closeAllKebabMenus();">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        <span>Change Password</span>
                      </button>
                    ` : `
                      <button type="button" class="fac-kebab-item" onclick="openResetModal(${t.id}, '${esc(t.full_name)}'); closeAllKebabMenus();">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/></svg>
                        <span>Reset Password</span>
                      </button>
                      <div class="fac-kebab-divider"></div>
                      <button type="button" class="fac-kebab-item danger" onclick="openDeleteModal(${t.id}, '${esc(t.full_name)}'); closeAllKebabMenus();">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        <span>Delete Faculty</span>
                      </button>
                    `}
                  </div>
                </div>
              `;
            }

            return `
              <div class="fac-mini-card" data-id="${t.id}">
                <div class="fac-mini-main">
                  <div class="fac-mini-avatar ${avatarClass}">${initials}</div>
                  <div class="fac-mini-info">
                    <div class="fac-mini-name-row">
                      <span class="fac-mini-name">${esc(t.full_name)}</span>
                      ${designationBadge}
                    </div>
                    <div class="fac-mini-subtext">
                      <span class="fac-dept-code">${esc(empId)}</span>
                    </div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0;">
                  ${mActionsHtml}
                </div>
              </div>
            `;
          }).join('');
        }
      }

      if (showingEl) showingEl.textContent = `Showing 1 to ${teachers.length} of ${teachers.length} faculty members`;
    }

    // Alias for backwards compatibility
    function renderOverviewTables(teachersOverride, studentsOverride) {
      renderFacultyTable(teachersOverride);
      const students = studentsOverride || allStudents || [];
      const sCount = document.getElementById('student-list-count');
      const tabSCount = document.getElementById('tab-students-count');
      const statTotal = document.getElementById('stat-total');
      const gwStu = document.getElementById('gw-student-approved');
      if (sCount) sCount.textContent = students.length;
      if (tabSCount) tabSCount.textContent = students.length;
      if (statTotal) statTotal.textContent = students.length;
      if (gwStu) gwStu.textContent = students.length;
    }

    // Main Workspace Tab Switching
    function showMainTab(tab) {
      const isFaculty = tab === 'faculty' || tab === 'teachers' || tab === 'overview' || (!tab && !['students', 'roster', 'pending', 'lifecycle', 'analytics'].includes(tab));
      const isStudents = tab === 'students' || tab === 'roster';
      const isPending = tab === 'pending';
      const isLifecycle = tab === 'lifecycle';
      const isAnalytics = tab === 'analytics';

      const pFaculty = document.getElementById('tab-faculty-panel') || document.getElementById('tab-teachers-panel');
      const pStudents = document.getElementById('tab-roster-panel');
      const pPending = document.getElementById('tab-pending-panel');
      const pLifecycle = document.getElementById('tab-lifecycle-panel');
      const pAnalytics = document.getElementById('tab-analytics-panel');

      if (pFaculty) pFaculty.style.display = isFaculty ? 'block' : 'none';
      if (pStudents) pStudents.style.display = isStudents ? 'block' : 'none';
      if (pPending) pPending.style.display = isPending ? 'block' : 'none';
      if (pLifecycle) pLifecycle.style.display = isLifecycle ? 'block' : 'none';
      if (pAnalytics) pAnalytics.style.display = isAnalytics ? 'block' : 'none';

      // Update tab buttons
      const tabBtns = [
        { id: 'tab-faculty-btn', active: isFaculty },
        { id: 'tab-overview-btn', active: isFaculty },
        { id: 'tab-teachers-btn', active: isFaculty },
        { id: 'tab-students-btn', active: isStudents },
        { id: 'tab-roster-btn', active: isStudents },
        { id: 'tab-pending-btn', active: isPending },
        { id: 'tab-lifecycle-btn', active: isLifecycle },
        { id: 'tab-analytics-btn', active: isAnalytics }
      ];
      tabBtns.forEach(t => {
        const el = document.getElementById(t.id);
        if (el) {
          if (t.active) el.classList.add('active');
          else el.classList.remove('active');
        }
      });

      // Search actions container & year filter visibility
      const searchActions = document.getElementById('portal-nav-actions');
      const searchInput = document.getElementById('portal-global-search');
      const yearPills = document.getElementById('student-year-filter-pills');

      if (isPending) {
        if (searchActions) searchActions.style.display = 'none';
      } else {
        if (searchActions) searchActions.style.display = 'flex';
        if (isFaculty) {
          if (yearPills) yearPills.style.display = 'none';
          if (searchInput) searchInput.placeholder = 'Search faculty by name, ID...';
        } else if (isStudents) {
          if (yearPills) yearPills.style.display = 'inline-flex';
          if (searchInput) searchInput.placeholder = 'Search students by name, roll no, PRN...';
        }
      }

      if (isFaculty) {
        renderFacultyTable();
        loadTeachers();
      } else if (isStudents) {
        loadStudents();
      } else if (isPending) {
        loadAllPendingData();
      }
    }

    // Compatibility for older test assertions & migration:
    function populateSubjectDropdowns() {
      const rSub = document.getElementById('reassign-subject');
      if (!rSub) return;
      rSub.innerHTML = '<option value="">-- Select Subject --</option>';
      const subs = window.subjects || [];
      subs.forEach(s => {
        if (!currentDeptId || String(s.department_id) === String(currentDeptId) || s.department_id) {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = `${s.code} - ${s.name}`;
          opt.dataset.year = s.year;
          opt.dataset.sem = s.semester;
          rSub.appendChild(opt);
        }
      });
    }

    function onReassignSubjectChange(val) {
      const rSub = document.getElementById('reassign-subject');
      const rYear = document.getElementById('reassign-year');
      const rSem = document.getElementById('reassign-sem');
      if (!rSub || !rYear || !rSem) return;
      const subs = window.subjects || [];
      const s = subs.find(sub => String(sub.id) === String(val));
      if (s) {
        rYear.value = s.year;
        rSem.value = s.semester;
      }
    }

    function openReassignModal(id, name) {
      targetTeacherId = id;
      const elName = document.getElementById('reassign-name');
      if (elName) elName.textContent = name;
      showModal('reassign-modal');
    }

    async function deleteAssignment(assignmentId) {
      console.log('deleteAssignment deprecated - managed in Teaching Groups', assignmentId);
      // Legacy caller stub: deleteAssignment(id);
    }

    // Initialization
    (async function init() {
      try {
        // Start live header clock
        updateLiveClock();
        setInterval(updateLiveClock, 30000);

        currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        isHod = Boolean(currentUser && (currentUser.is_hod || currentUser.role === 'HOD' || currentUser.roles?.includes('HOD') || currentUser.roles?.includes('SYSTEM_ADMIN')));

        if (isHod) {
          document.body.classList.add('is-hod');
          document.body.classList.remove('is-faculty');
        } else {
          document.body.classList.remove('is-hod');
          document.body.classList.add('is-faculty');
        }

        const roleLabel = document.getElementById('portal-role-label');
        if (roleLabel) roleLabel.textContent = isHod ? 'HOD Access' : 'Faculty Access';

        if (isHod) {
          const hodBadge = document.getElementById('hod-badge');
          if (hodBadge) hodBadge.style.display = 'inline-block';
          const brandBadge = document.getElementById('brand-role-badge');
          if (brandBadge) brandBadge.textContent = 'HOD';
          const hodNav = document.getElementById('hod-nav-links');
          if (hodNav) hodNav.style.display = 'inline-flex';
          
          // Show HOD buttons
          ['btn-add-teacher', 'btn-add-student', 'btn-bulk-csv', 'btn-promotion', 'btn-reindex-roll', 'btn-archive-link'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'inline-flex';
          });
        } else {
          ['btn-add-teacher', 'btn-add-student', 'btn-bulk-csv', 'btn-promotion', 'btn-reindex-roll', 'btn-archive-link'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
          });
          const notice = document.getElementById('faculty-provision-notice');
          if (notice) notice.style.display = 'inline-block';
        }

        // Load Department Hierarchy
        try {
          const hRes = await apiFetch(`${API}/hierarchy`);
          if (hRes && hRes.data) {
            currentDeptId = hRes.data.department_id || hRes.data.id;
            currentDeptCode = hRes.data.department_code || hRes.data.code || 'IT';
            const deptName = hRes.data.department_name || hRes.data.name || 'Department of Computer Science';
            const portalDeptEl = document.getElementById('portal-dept-name');
            if (portalDeptEl) portalDeptEl.textContent = deptName;
            const titleEl = document.getElementById('dept-header-name');
            if (titleEl) titleEl.textContent = `${deptName} — Portal`;
            const subEl = document.getElementById('dept-subtitle');
            if (subEl) subEl.textContent = `Manage your department faculty, students, classes and academic activities.`;

            const subCountEl = document.getElementById('stat-subjects-count');
            if (subCountEl && hRes.data.subjects) {
              subCountEl.textContent = hRes.data.subjects.length;
            }
            const codeLbl = document.getElementById('promo-dept-code-label');
            if (codeLbl) codeLbl.textContent = currentDeptCode;
          }
        } catch (_) {}

        // Load Cohorts, Teachers, Students & Gateways
        await loadCohorts();
        await loadTeachers();
        await loadStudents();
        await loadFacultyRegistrationStatus();
        await updateRegistrationStatusBadge();
        await loadAllPendingData();

        // Check URL tab parameter or default to overview (Image 2)
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        if (tabParam === 'teachers' || tabParam === 'faculty' || window.location.pathname.includes('hod-teachers')) {
          showMainTab('teachers');
        } else if (tabParam === 'roster' || tabParam === 'students') {
          showMainTab('roster');
        } else if (tabParam === 'pending' || tabParam === 'approvals') {
          showMainTab('pending');
        } else if (tabParam === 'lifecycle') {
          showMainTab('lifecycle');
        } else if (tabParam === 'analytics') {
          showMainTab('analytics');
        } else {
          showMainTab('overview');
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    })();

    // ==================== TEACHER CONTROLLERS ====================

    async function loadTeachers() {
      const grid = document.getElementById('teacher-grid');
      try {
        const res = await apiFetch(`${API}/teachers`);
        const rawTeachers = res?.data || [];
        // Strictly filter out any Admin account and isolate to same department only
        allTeachers = rawTeachers.filter(t => {
          const isSystemAdmin = t.user_id === 1 ||
            t.role === 'SYSTEM_ADMIN' ||
            (t.gmail && t.gmail.toLowerCase().includes('admin')) ||
            (t.email && t.email.toLowerCase().includes('admin')) ||
            (t.username && t.username.toLowerCase().includes('admin')) ||
            (t.full_name && t.full_name.toLowerCase().includes('administrator')) ||
            (t.full_name && t.full_name.toLowerCase() === 'admin');
          if (isSystemAdmin) return false;

          // Department isolation: if department_id is present, must match currentDeptId
          if (currentDeptId && t.department_id && String(t.department_id) !== String(currentDeptId)) {
            return false;
          }
          return true;
        });
        renderTeachers(allTeachers);
        renderOverviewTables();
        const countEl = document.getElementById('stat-teachers-count');
        if (countEl) countEl.textContent = allTeachers.length;
      } catch (err) {
        console.error('Failed to load teachers:', err);
        grid.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--status-absent); grid-column: 1 / -1;">Failed to load faculty directory.</div>`;
      }
    }

    function renderTeachers(teachers) {
      const grid = document.getElementById('teacher-grid');
      if (!teachers || teachers.length === 0) {
        grid.innerHTML = `<div style="text-align: center; padding: 2.5rem; color: var(--text-muted); grid-column: 1 / -1;">No faculty members found in this department.</div>`;
        return;
      }

      grid.innerHTML = teachers.map(t => {
        const initials = (t.full_name || 'T')
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map(w => w[0].toUpperCase())
          .join('') || 'T';

        const isHodMember = Boolean(t.is_hod || t.user_id === currentUser?.user_id);
        const roleBadge = isHodMember
          ? `<span class="badge" style="background: var(--chip-hod-bg); color: var(--color-primary); font-weight: 700;">HOD</span>`
          : `<span class="badge" style="background: var(--bg-surface-secondary); color: var(--text-main); font-weight: 600;">Faculty Member</span>`;

        return `
          <div class="teacher-card">
            <div>
              <div class="tc-header">
                <div style="display: flex; gap: 0.75rem; align-items: center;">
                  <div class="tc-avatar">${initials}</div>
                  <div>
                    <div class="tc-name">${esc(t.full_name)}</div>
                    ${t.employee_id ? `<div class="tc-empid">EMP #${esc(t.employee_id)}</div>` : ''}
                  </div>
                </div>
                <div>${roleBadge}</div>
              </div>

              <div class="tc-meta">
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  ${window.FacultyIcons ? FacultyIcons.get('mail', { size: 14 }) : ''}
                  <span style="font-family: var(--font-family-mono, monospace); color: var(--text-main);">${esc(t.gmail || t.email)}</span>
                </div>
                ${t.phone ? `
                  <div style="display: flex; align-items: center; gap: 0.4rem;">
                    ${window.FacultyIcons ? FacultyIcons.get('phone', { size: 14 }) : ''}
                    <span>${esc(t.phone)}</span>
                  </div>` : ''}
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--status-present);"></span>
                  <span>Status: <strong style="color: var(--status-present);">${esc(t.status || 'ACTIVE')}</strong></span>
                </div>
              </div>
            </div>

            ${Boolean(currentUser && ((currentUser.teacher_id && Number(t.id) === Number(currentUser.teacher_id)) || (currentUser.id && Number(t.user_id) === Number(currentUser.id)) || (currentUser.user_id && Number(t.user_id) === Number(currentUser.user_id)) || (currentUser.email && (t.email || t.gmail) && currentUser.email.toLowerCase() === (t.email || t.gmail).toLowerCase()))) ? `
              <div class="tc-actions" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="openSelfPasswordModal()" title="Change My Password" style="color: var(--color-primary); display: inline-flex; align-items: center; gap: 0.35rem;">
                  ${window.FacultyIcons ? FacultyIcons.get('key', { size: 14 }) : ''}
                  <span>Change Password</span>
                </button>
              </div>
            ` : (isHod ? `
              <div class="tc-actions" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="openResetModal(${t.id}, '${esc(t.full_name)}')" title="Reset faculty password">
                  ${window.FacultyIcons ? FacultyIcons.get('key', { size: 14 }) : ''}
                  <span>Reset</span>
                </button>
                <button type="button" class="btn btn-secondary btn-sm" style="color: var(--status-absent);" onclick="openDeleteModal(${t.id}, '${esc(t.full_name)}')" title="Remove faculty from department">
                  ${window.FacultyIcons ? FacultyIcons.get('trash', { size: 14 }) : ''}
                  <span>Remove</span>
                </button>
              </div>
            ` : '')}
          </div>
        `;
      }).join('');
    }

    function filterTeachers(query) {
      const q = (query || '').toLowerCase().trim();
      if (!q) {
        renderTeachers(allTeachers);
        renderFacultyTable(allTeachers);
        return;
      }
      const filtered = allTeachers.filter(t => 
        (t.full_name || '').toLowerCase().includes(q) ||
        (t.gmail || t.email || '').toLowerCase().includes(q) ||
        (t.employee_id || '').toLowerCase().includes(q)
      );
      renderTeachers(filtered);
      renderFacultyTable(filtered);
    }

    async function loadFacultyRegistrationStatus() {
      try {
        const res = await apiFetch(`${API}/faculty-registration-status`);
        isFacultyRegOpen = Boolean(res?.data?.is_open);
        renderFacultyRegButton();
      } catch (err) {
        console.warn('Failed to load faculty registration gate status:', err);
      }
    }

    function renderFacultyRegButton() {
      const btn = document.getElementById('hod-faculty-reg-btn');
      const ind = document.getElementById('hod-reg-indicator');
      const txt = document.getElementById('hod-reg-text');
      if (btn && txt) {
        if (isFacultyRegOpen) {
          if (ind) ind.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--status-present);"></span>';
          txt.textContent = 'Faculty Reg: OPEN';
          btn.style.borderColor = 'var(--status-present)';
          btn.style.color = 'var(--status-present)';
        } else {
          if (ind) ind.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--status-absent);"></span>';
          txt.textContent = 'Faculty Reg: CLOSED';
          btn.style.borderColor = 'var(--status-absent)';
          btn.style.color = 'var(--status-absent)';
        }
      }

      // Update Quick Registration Gateway Hub elements
      const qBadge = document.getElementById('quick-teacher-reg-badge');
      const qBtn = document.getElementById('quick-teacher-reg-toggle-btn');
      const chkFac = document.getElementById('chk-faculty-reg');
      if (chkFac) chkFac.checked = Boolean(isFacultyRegOpen);

      if (qBadge) {
        if (isFacultyRegOpen) {
          qBadge.className = 'badge-status-pill open';
          qBadge.innerHTML = '● OPEN';
          qBadge.style.background = '';
          qBadge.style.color = '';
        } else {
          qBadge.className = 'badge-status-pill closed';
          qBadge.innerHTML = '● CLOSED';
          qBadge.style.background = '';
          qBadge.style.color = '';
        }
      }
      if (qBtn) {
        qBtn.textContent = isFacultyRegOpen ? 'Close Teacher Reg' : 'Open Teacher Reg';
        qBtn.style.color = isFacultyRegOpen ? 'var(--status-absent)' : 'var(--status-present)';
        qBtn.style.borderColor = isFacultyRegOpen ? 'var(--status-absent)' : 'var(--status-present)';
      }
    }

    async function toggleFacultyRegistration() {
      const newStatus = !isFacultyRegOpen;
      try {
        const res = await apiFetch(`${API}/faculty-registration-toggle`, {
          method: 'POST',
          body: JSON.stringify({ open: newStatus })
        });
        isFacultyRegOpen = Boolean(res?.data?.is_open);
        renderFacultyRegButton();
        showToast(`Faculty registration is now ${isFacultyRegOpen ? 'OPEN' : 'CLOSED'}.`, 'success');
      } catch (err) {
        showToast(err.message || 'Failed to toggle faculty registration.', 'error');
      }
    }

    async function loadPendingFaculty() {
      const tbody = document.getElementById('pending-faculty-tbody');
      const mcards = document.getElementById('pending-faculty-mobile-cards');
      const badge = document.getElementById('pending-faculty-badge');
      const countEl = document.getElementById('pending-faculty-count');
      const tabBadge = document.getElementById('pending-faculty-badge-tab');
      const gwEl = document.getElementById('gw-faculty-pending');

      try {
        const res = await apiFetch(`${API}/faculty-registrations/pending`);
        allPendingFaculty = res?.data || [];

        if (badge) badge.textContent = `${allPendingFaculty.length} Pending`;
        if (countEl) countEl.textContent = allPendingFaculty.length;
        if (gwEl) gwEl.textContent = allPendingFaculty.length;
        if (tabBadge) {
          tabBadge.textContent = allPendingFaculty.length;
          tabBadge.style.display = allPendingFaculty.length > 0 ? 'inline-block' : 'none';
        }

        if (allPendingFaculty.length === 0) {
          const emptyHtml = `
            <div class="pending-empty-state">
              <div class="pending-empty-icon">✓</div>
              <div class="pending-empty-title">Faculty Queue is Clear</div>
              <div class="pending-empty-text">No pending faculty applications awaiting adjudication.</div>
            </div>
          `;
          if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="padding: 0;">${emptyHtml}</td></tr>`;
          if (mcards) mcards.innerHTML = emptyHtml;
          return;
        }

        // Render Desktop Table
        if (tbody) {
          tbody.innerHTML = allPendingFaculty.map((f, idx) => {
            const initials = (f.full_name || 'T')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map(w => w[0].toUpperCase())
              .join('') || 'T';
            const appliedDate = new Date(f.created_at || Date.now()).toLocaleDateString();

            return `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem 1rem;">${idx + 1}</td>
                <td style="padding: 0.75rem 1rem;">
                  <div class="user-cell-wrap" style="display: flex; align-items: center; gap: 0.65rem;">
                    <div class="user-cell-avatar purple-avatar">${initials}</div>
                    <div>
                      <div style="font-weight: 700; color: var(--text-main);">${esc(f.full_name)}</div>
                      <div style="font-size: 0.72rem; color: var(--text-muted);">${esc(f.department_name || currentDeptCode || 'IT')} Faculty</div>
                    </div>
                  </div>
                </td>
                <td style="padding: 0.75rem 1rem; font-family: var(--font-family-mono, monospace); font-size: 0.82rem;">${esc(f.email || '—')}</td>
                <td style="padding: 0.75rem 1rem; font-size: 0.82rem;">${esc(f.phone || '—')}</td>
                <td style="padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--text-muted);">${appliedDate}</td>
                <td style="padding: 0.75rem 1rem; text-align: right;">
                  <div style="display: inline-flex; gap: 0.4rem; justify-content: flex-end;">
                    <button type="button" class="btn btn-primary btn-sm" onclick="approveFaculty(${f.id}, '${esc(f.full_name)}')">Approve</button>
                    <button type="button" class="btn btn-secondary btn-sm" style="color: var(--status-absent);" onclick="openRejectModal(${f.id}, '${esc(f.full_name)}', 'FACULTY')">Reject</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('');
        }

        // Render Mobile Cards
        if (mcards) {
          mcards.innerHTML = allPendingFaculty.map(f => {
            const initials = (f.full_name || 'T')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map(w => w[0].toUpperCase())
              .join('') || 'T';
            const appliedDate = new Date(f.created_at || Date.now()).toLocaleDateString();

            return `
              <div class="pending-mini-card">
                <div class="pending-mini-top">
                  <div class="user-cell-avatar purple-avatar" style="width: 40px; height: 40px; font-size: 0.95rem;">${initials}</div>
                  <div class="pending-mini-info">
                    <div class="pending-mini-name">
                      <span>${esc(f.full_name)}</span>
                      <span class="fac-mini-badge lecturer">Faculty Applicant</span>
                    </div>
                    <div class="pending-mini-sub">${esc(f.email || '—')} • ${esc(f.phone || 'No phone')}</div>
                  </div>
                  <span class="pending-pill-badge orange" style="font-size: 0.65rem;">PENDING</span>
                </div>
                <div class="pending-mini-actions">
                  <span style="font-size: 0.72rem; color: var(--text-muted); margin-right: auto;">Applied: ${appliedDate}</span>
                  <button type="button" class="btn btn-primary btn-sm" onclick="approveFaculty(${f.id}, '${esc(f.full_name)}')">✓ Approve</button>
                  <button type="button" class="btn btn-secondary btn-sm" style="color: var(--status-absent);" onclick="openRejectModal(${f.id}, '${esc(f.full_name)}', 'FACULTY')">✕ Reject</button>
                </div>
              </div>
            `;
          }).join('');
        }
      } catch (err) {
        console.warn('Failed to load pending faculty registrations:', err);
      }
    }

    async function approveFaculty(id, name) {
      try {
        await apiFetch(`${API}/faculty-registrations/${id}/adjudicate`, {
          method: 'POST',
          body: JSON.stringify({ action: 'APPROVE' })
        });
        showToast(`Approved teacher ${name}!`, 'success');
        loadAllPendingData();
        loadTeachers();
      } catch (err) {
        showToast(err.message || 'Failed to approve teacher.', 'error');
      }
    }

    async function rejectFaculty(id, name) {
      openRejectModal(id, name || 'Faculty Applicant', 'FACULTY');
    }

    // Teacher Modal Openers
    function openCreateModal() {
      document.getElementById('create-form').reset();
      document.getElementById('t-password').value = 'Password@123';
      const err = document.getElementById('create-error');
      if (err) err.style.display = 'none';
      showModal('create-modal');
    }
    function closeCreateModal() { hideModal('create-modal'); }

    async function submitCreateTeacher(e) {
      e.preventDefault();
      const btn = document.getElementById('create-btn');
      btn.disabled = true;
      btn.textContent = 'Creating...';

      const payload = {
        full_name: document.getElementById('t-name').value.trim(),
        email: document.getElementById('t-email').value.trim(),
        password: document.getElementById('t-password').value.trim(),
        phone: document.getElementById('t-phone').value.trim() || undefined,
        employee_id: document.getElementById('t-empid').value.trim() || undefined
      };

      try {
        const res = await apiFetch(`${API}/teachers`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        closeCreateModal();
        loadTeachers();

        // Show credentials slip
        document.getElementById('slip-name').textContent = payload.full_name;
        document.getElementById('slip-gmail').textContent = payload.email;
        document.getElementById('slip-temp').textContent = payload.password;
        showModal('cred-modal');
      } catch (err) {
        const errDiv = document.getElementById('create-error');
        if (errDiv) {
          errDiv.textContent = err.message || 'Failed to create teacher account.';
          errDiv.style.display = 'block';
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create Teacher Account';
      }
    }

    function openSelfPasswordModal() {
      const form = document.getElementById('self-password-form');
      if (form) form.reset();
      const err = document.getElementById('self-password-error');
      if (err) { err.textContent = ''; err.style.display = 'none'; }
      showModal('self-password-modal');
    }
    function closeSelfPasswordModal() {
      hideModal('self-password-modal');
    }

    async function submitSelfPassword(e) {
      e.preventDefault();
      const btn = document.getElementById('self-pass-btn');
      const errDiv = document.getElementById('self-password-error');
      const current_password = document.getElementById('self-curr-pass').value;
      const new_password = document.getElementById('self-new-pass').value;
      const confirm_password = document.getElementById('self-confirm-pass').value;

      if (errDiv) { errDiv.textContent = ''; errDiv.style.display = 'none'; }

      if (new_password !== confirm_password) {
        if (errDiv) {
          errDiv.textContent = 'New passwords do not match.';
          errDiv.style.display = 'block';
        } else {
          showToast('New passwords do not match.', 'error');
        }
        return;
      }

      if (new_password.length < 8) {
        if (errDiv) {
          errDiv.textContent = 'New password must be at least 8 characters.';
          errDiv.style.display = 'block';
        } else {
          showToast('New password must be at least 8 characters.', 'error');
        }
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Updating...';

      try {
        await apiFetch('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ current_password, new_password })
        });
        showToast('Your password has been changed successfully!', 'success');
        closeSelfPasswordModal();
      } catch (err) {
        if (errDiv) {
          errDiv.textContent = err.message || 'Failed to update password. Please check your current password.';
          errDiv.style.display = 'block';
        } else {
          showToast(err.message || 'Failed to update password.', 'error');
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Update Password';
      }
    }

    function openResetModal(id, name) {
      targetTeacherId = id;
      document.getElementById('reset-name').textContent = name;
      document.getElementById('reset-password').value = 'Password@123';
      showModal('reset-modal');
    }
    function closeResetModal() { hideModal('reset-modal'); targetTeacherId = null; }

    async function submitReset(e) {
      e.preventDefault();
      const btn = document.getElementById('reset-btn');
      btn.disabled = true;
      const pass = document.getElementById('reset-password').value;

      try {
        await apiFetch(`${API}/teachers/${targetTeacherId}/reset-password`, {
          method: 'POST',
          body: JSON.stringify({ new_password: pass })
        });
        showToast('Password reset successfully!', 'success');
        closeResetModal();
      } catch (err) {
        showToast(err.message || 'Failed to reset password.', 'error');
      } finally {
        btn.disabled = false;
      }
    }

    function openDeleteModal(id, name) {
      if (window.confirmTeacherDelete) {
        window.confirmTeacherDelete(id, name, () => {
          loadTeachers();
        });
        return;
      }
      targetTeacherId = id;
      const nameEl = document.getElementById('del-name');
      if (nameEl) nameEl.textContent = name;
      const inp = document.getElementById('del-confirm-input');
      if (inp) inp.value = '';
      const btn = document.getElementById('del-btn');
      if (btn) btn.disabled = true;
      showModal('delete-modal');
    }
    function closeDeleteModal() { hideModal('delete-modal'); targetTeacherId = null; }

    function checkDeleteInput() {
      const val = document.getElementById('del-confirm-input').value.trim();
      document.getElementById('del-btn').disabled = (val !== 'DELETE');
    }

    async function submitDelete() {
      const btn = document.getElementById('del-btn');
      btn.disabled = true;
      btn.textContent = 'Deleting...';

      try {
        await apiFetch(`${API}/teachers/${targetTeacherId}`, { method: 'DELETE' });
        showToast('Teacher account deleted.', 'info');
        closeDeleteModal();
        loadTeachers();
      } catch (err) {
        showToast(err.message || 'Failed to delete teacher.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Permanently Delete';
      }
    }

    function copyCredentials() {
      const name = document.getElementById('slip-name').textContent;
      const gmail = document.getElementById('slip-gmail').textContent;
      const pass = document.getElementById('slip-temp').textContent;
      const text = `VidyaOS Faculty Login Credentials:\nName: ${name}\nLogin Gmail: ${gmail}\nPassword: ${pass}\nPortal: ${window.location.origin}/login`;
      navigator.clipboard.writeText(text);
      showToast('Credentials copied to clipboard!', 'success');
    }
    function closeCredModal() { hideModal('cred-modal'); }

    // ==================== STUDENT CONTROLLERS ====================

    async function loadCohorts() {
      try {
        const res = await apiFetch('/faculty/cohorts');
        const rawCohorts = res?.data || [];
        
        // Isolate to same department only & exclude admin pseudo-department
        allCohorts = rawCohorts.filter(c => {
          const deptNameLower = (c.department_name || '').toLowerCase();
          const deptCodeLower = (c.department_code || '').toLowerCase();
          if (deptNameLower.includes('admin') || deptCodeLower.includes('admin')) return false;

          if (currentDeptId) {
            return String(c.department_id) === String(currentDeptId);
          }
          return true;
        });

        const select = document.getElementById('cohort-select');
        select.innerHTML = '<option value="">All Department Cohorts</option>';

        allCohorts.forEach(c => {
          const opt = document.createElement('option');
          opt.value = `${c.department_id}_${c.year}_${c.semester}`;
          opt.textContent = `${c.department_code || c.department_name || 'Dept'} • Year ${c.year} Sem ${c.semester}`;
          opt.dataset.deptId = c.department_id;
          opt.dataset.year = c.year;
          opt.dataset.sem = c.semester;
          select.appendChild(opt);
        });

        if (allCohorts.length > 0) {
          select.value = `${allCohorts[0].department_id}_${allCohorts[0].year}_${allCohorts[0].semester}`;
          selectedCohort = allCohorts[0];
          updateRegistrationStatusBadge();
        }
      } catch (err) {
        console.error('Failed to load cohorts:', err);
      }
    }

    function onCohortSelectChange() {
      const select = document.getElementById('cohort-select');
      const val = select.value;
      if (!val) {
        selectedCohort = null;
      } else {
        const [dId, yr, sm] = val.split('_');
        selectedCohort = { department_id: parseInt(dId), year: parseInt(yr), semester: parseInt(sm) };
      }
      updateRegistrationStatusBadge();
      loadStudents();
    }

    var isDeptRegOpen = false;

    async function updateRegistrationStatusBadge() {
      const statusBadge = document.getElementById('reg-toggle-status');
      const toggleBtn = document.getElementById('reg-toggle-btn');
      const rosterBadge = document.getElementById('tab-roster-reg-status');
      const rosterBtn = document.getElementById('tab-roster-reg-toggle-btn');
      const rosterDeptBtn = document.getElementById('tab-roster-dept-reg-toggle-btn');
      const quickBadge = document.getElementById('quick-student-reg-badge');
      const quickBtn = document.getElementById('quick-student-reg-toggle-btn');
      const quickDeptBtn = document.getElementById('quick-dept-student-reg-toggle-btn');

      const deptId = currentDeptId || (selectedCohort ? selectedCohort.department_id : (currentUser?.department_id || 4));

      try {
        const res = await apiFetch(`/faculty/cohorts/registration-status?department_id=${deptId}`);
        isDeptRegOpen = Boolean(res?.data?.is_dept_open || res?.data?.is_open);
        isCohortRegOpen = isDeptRegOpen;

        // Dedicated Top Gateway Hub (Student Gateway)
        const chkStu = document.getElementById('chk-student-reg');
        if (chkStu) chkStu.checked = Boolean(isDeptRegOpen);

        if (quickBadge) {
          if (isDeptRegOpen) {
            quickBadge.className = 'badge-status-pill open';
            quickBadge.textContent = '● OPEN';
            quickBadge.style.background = '';
            quickBadge.style.color = '';
          } else {
            quickBadge.className = 'badge-status-pill closed';
            quickBadge.textContent = '● CLOSED';
            quickBadge.style.background = '';
            quickBadge.style.color = '';
          }
        }
        if (quickBtn) {
          quickBtn.textContent = isDeptRegOpen ? 'Close Student Reg' : 'Open All Semesters';
          quickBtn.style.color = isDeptRegOpen ? 'var(--status-absent)' : 'var(--status-present)';
          quickBtn.style.borderColor = isDeptRegOpen ? 'var(--status-absent)' : 'var(--status-present)';
          quickBtn.disabled = false;
        }
        if (quickDeptBtn) {
          quickDeptBtn.textContent = isDeptRegOpen ? 'Close Student Reg' : 'Open All Semesters';
          quickDeptBtn.style.color = isDeptRegOpen ? 'var(--status-absent)' : 'var(--status-present)';
          quickDeptBtn.style.borderColor = isDeptRegOpen ? 'var(--status-absent)' : 'var(--status-present)';
          quickDeptBtn.disabled = false;
        }

        // Tab 2 Roster Controls Bar
        if (rosterBadge) {
          if (isDeptRegOpen) {
            rosterBadge.textContent = 'OPEN (ALL SEMESTERS)';
            rosterBadge.style.background = 'var(--status-present-bg)';
            rosterBadge.style.color = 'var(--status-present)';
          } else {
            rosterBadge.textContent = 'CLOSED (BLOCKED)';
            rosterBadge.style.background = 'var(--chip-admin-bg)';
            rosterBadge.style.color = 'var(--status-absent)';
          }
        }
        if (rosterDeptBtn) {
          rosterDeptBtn.textContent = isDeptRegOpen ? 'Close All Semesters' : 'Open All Semesters';
          rosterDeptBtn.style.color = isDeptRegOpen ? 'var(--status-absent)' : 'var(--status-present)';
          rosterDeptBtn.style.borderColor = isDeptRegOpen ? 'var(--status-absent)' : 'var(--status-present)';
          rosterDeptBtn.disabled = false;
        }
        if (rosterBtn) {
          rosterBtn.textContent = isDeptRegOpen ? 'Close All Semesters' : 'Open All Semesters';
          rosterBtn.style.color = isDeptRegOpen ? 'var(--status-absent)' : 'var(--status-present)';
          rosterBtn.style.borderColor = isDeptRegOpen ? 'var(--status-absent)' : 'var(--status-present)';
          rosterBtn.disabled = false;
        }

        // Tab 3 Badge & Button
        if (statusBadge) {
          if (isDeptRegOpen) {
            statusBadge.textContent = 'Student Reg: OPEN (All Semesters)';
            statusBadge.className = 'badge badge-present';
            statusBadge.style.background = 'var(--status-present-bg)';
            statusBadge.style.color = 'var(--status-present)';
          } else {
            statusBadge.textContent = 'Student Reg: CLOSED (BLOCKED)';
            statusBadge.className = 'badge badge-absent';
            statusBadge.style.background = 'var(--chip-admin-bg)';
            statusBadge.style.color = 'var(--status-absent)';
          }
        }
        if (toggleBtn) {
          toggleBtn.textContent = isDeptRegOpen ? 'Close All Semesters' : 'Open All Semesters';
          toggleBtn.disabled = false;
        }
      } catch (err) {
        console.warn('Failed to fetch registration status:', err);
      }
    }

    async function toggleDepartmentStudentRegistration() {
      const deptId = currentDeptId || (selectedCohort ? selectedCohort.department_id : (currentUser?.department_id || 4));
      if (!deptId) {
        showToast('Department ID not found.', 'info');
        return;
      }
      const newStatus = !isDeptRegOpen;
      try {
        const res = await apiFetch('/faculty/cohorts/registration-toggle', {
          method: 'POST',
          body: JSON.stringify({
            department_id: deptId,
            department_wide: true,
            open: newStatus
          })
        });
        isDeptRegOpen = Boolean(res?.data?.is_open);
        isCohortRegOpen = isDeptRegOpen;
        await updateRegistrationStatusBadge();
        showToast(`Student registration is now ${isDeptRegOpen ? 'OPEN' : 'CLOSED'} for ALL semesters in this department.`, 'success');
      } catch (err) {
        showToast(err.message || 'Failed to toggle department student registration.', 'error');
      }
    }

    async function toggleCohortRegistration() {
      // 1-Click department-wide toggle for all semesters
      return toggleDepartmentStudentRegistration();
    }

    async function loadStudents() {
      const tbody = document.getElementById('students-tbody');
      const yr = document.getElementById('filter-year').value;
      const sem = document.getElementById('filter-sem').value;

      let queryParams = [];
      if (selectedCohort) {
        queryParams.push(`year=${selectedCohort.year}`);
        queryParams.push(`semester=${selectedCohort.semester}`);
      } else {
        if (yr) queryParams.push(`year=${yr}`);
        if (sem) queryParams.push(`semester=${sem}`);
      }
      if (currentDeptId) {
        queryParams.push(`department_id=${currentDeptId}`);
      }

      const qStr = queryParams.length ? '?' + queryParams.join('&') : '';

      try {
        const endpoint = isHod ? `${API}/students${qStr}` : `/students${qStr}`;
        const res = await apiFetch(endpoint);
        const rawStudents = res?.data || [];
        // Strictly filter out any Admin account and isolate to same department only
        allStudents = rawStudents.filter(s => {
          if (s.user_id === 1 || s.full_name?.toLowerCase().includes('administrator') || (s.email && s.email.toLowerCase().includes('admin'))) {
            return false;
          }
          if (currentDeptId && s.department_id && String(s.department_id) !== String(currentDeptId)) {
            return false;
          }
          return true;
        });
        applyStudentFilters();
        renderOverviewTables();
      } catch (err) {
        console.error('Failed to load students:', err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--status-absent);">Failed to load student roster.</td></tr>`;
      }
    }

    function renderStudents(students) {
      const tbody = document.getElementById('students-tbody');
      const countLabel = document.getElementById('table-count-label');

      // Update Top Stats
      const totalStudents = students.length;
      const activeAccounts = students.filter(s => s.user_status === 'ACTIVE' || s.status === 'ENROLLED' || s.status === 'ACTIVE').length;
      const googleCount = students.filter(s => s.google_linked).length;

      const allCount = allStudents ? allStudents.length : totalStudents;
      const statTotalEl = document.getElementById('stat-total');
      if (statTotalEl) statTotalEl.textContent = allCount;
      document.getElementById('stat-active').textContent = activeAccounts;
      document.getElementById('stat-google').textContent = googleCount;
      if (countLabel) countLabel.textContent = `Showing ${totalStudents} students`;

      const smwrap = document.getElementById('students-mobile-cards-wrap');

      if (totalStudents === 0) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No students found matching current filters.</td></tr>`;
        if (smwrap) smwrap.innerHTML = `<div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.85rem;">No students found matching current filters.</div>`;
        return;
      }

      tbody.innerHTML = students.map(s => {
        const rollDisplay = s.class_roll_no ? `<span style="font-weight: 700; color: var(--color-primary);">${s.class_roll_no}</span>` : '<span style="color: var(--text-muted);">—</span>';
        const ubterDisplay = s.ubter_reg_no ? `<span style="font-family: monospace; font-size: 0.85rem;">${esc(s.ubter_reg_no)}</span>` : '<span style="color: var(--text-muted);">—</span>';
        const enrollDisplay = `<span style="font-family: monospace; font-weight: 600; color: var(--text-main); font-size: 0.85rem;">${esc(s.official_enrollment_no)}</span>`;

        return `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.75rem 1rem;">${rollDisplay}</td>
            <td style="padding: 0.75rem 1rem;">${ubterDisplay}</td>
            <td style="padding: 0.75rem 1rem;">${enrollDisplay}</td>
            <td style="padding: 0.75rem 1rem; font-weight: 600; color: var(--text-main);">
              <a href="javascript:void(0)" onclick="openStudentDossier(${s.id})" style="color: var(--text-main); text-decoration: none; border-bottom: 1px dotted var(--color-primary);" title="Click to view full Academic Dossier &amp; Vault">
                ${esc(s.full_name)}
              </a>
            </td>
            <td style="padding: 0.75rem 1rem; font-size: 0.85rem; color: var(--text-muted);">Y${s.year || 1} • Sem ${s.semester || 1}</td>
            <td class="td-faculty-actions" style="padding: 0.75rem 1rem; text-align: right; position: relative;">
              <div class="fac-kebab-wrap" style="display: inline-flex; justify-content: flex-end;">
                <button type="button" class="fac-kebab-btn" aria-label="Student options" onclick="toggleStudentKebabMenu(${s.id}, event)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                </button>
                <div class="fac-kebab-menu" id="student-kebab-menu-table-${s.id}">
                  <button type="button" class="fac-kebab-item" onclick="openStudentDossier(${s.id}); closeAllStudentKebabMenus();">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    <span>Academic Dossier</span>
                  </button>
                  ${isHod ? `
                    <button type="button" class="fac-kebab-item" onclick="openResetStudentModal(${s.id}, '${esc(s.full_name)}'); closeAllStudentKebabMenus();">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/></svg>
                      <span>Reset Password</span>
                    </button>
                    <div class="fac-kebab-divider"></div>
                    <button type="button" class="fac-kebab-item danger" onclick="openDeleteStudentModal(${s.id}, '${esc(s.full_name)}'); closeAllStudentKebabMenus();">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      <span>Withdraw Student</span>
                    </button>
                  ` : ''}
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Render Mobile Minimal Cards for Students (< 769px)
      if (smwrap) {
        if (totalStudents === 0) {
          smwrap.innerHTML = `<div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.85rem;">No students found matching current filters.</div>`;
        } else {
          smwrap.innerHTML = students.map(s => {
            const rollDisplay = s.class_roll_no ? `Roll #${s.class_roll_no}` : 'No Roll #';
            const enrollDisplay = s.official_enrollment_no || '—';
            const rollBadge = s.class_roll_no ? String(s.class_roll_no).padStart(2, '0') : 'ST';

            let sActionsHtml = '';
            if (isHod) {
              sActionsHtml = `
                <div class="fac-kebab-wrap">
                  <button type="button" class="fac-kebab-btn" aria-label="Student options" onclick="toggleStudentKebabMenu(${s.id}, event)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                  </button>
                  <div class="fac-kebab-menu" id="student-kebab-menu-${s.id}">
                    <button type="button" class="fac-kebab-item" onclick="openStudentDossier(${s.id}); closeAllStudentKebabMenus();">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                      <span>Academic Dossier</span>
                    </button>
                    <button type="button" class="fac-kebab-item" onclick="openResetStudentModal(${s.id}, '${esc(s.full_name)}'); closeAllStudentKebabMenus();">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/></svg>
                      <span>Reset Password</span>
                    </button>
                    <div class="fac-kebab-divider"></div>
                    <button type="button" class="fac-kebab-item danger" onclick="openDeleteStudentModal(${s.id}, '${esc(s.full_name)}'); closeAllStudentKebabMenus();">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      <span>Withdraw Student</span>
                    </button>
                  </div>
                </div>
              `;
            }

            return `
              <div class="fac-mini-card" data-id="${s.id}">
                <div class="fac-mini-main">
                  <div class="fac-mini-avatar" style="background:var(--color-primary-light);color:var(--color-primary);font-size:0.75rem;font-weight:700;">
                    ${rollBadge}
                  </div>
                  <div class="fac-mini-info">
                    <div class="fac-mini-name-row">
                      <a href="javascript:void(0)" onclick="openStudentDossier(${s.id})" class="fac-mini-name" style="text-decoration:none;">${esc(s.full_name)}</a>
                      <span class="fac-mini-badge" style="background:var(--status-present-bg);color:var(--status-present);">Y${s.year || 1} S${s.semester || 1}</span>
                    </div>
                    <div class="fac-mini-subtext">
                      <span class="fac-dept-code">${esc(enrollDisplay)}</span>
                      <span class="fac-sub-dot">•</span>
                      <span>${esc(rollDisplay)}</span>
                    </div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:0.35rem;flex-shrink:0;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="openStudentDossier(${s.id})" title="Dossier" style="padding:0.25rem 0.55rem;font-size:0.75rem;font-weight:600;">
                    Dossier
                  </button>
                  ${sActionsHtml}
                </div>
              </div>
            `;
          }).join('');
        }
      }
    }

    function debounceSearch() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const q = (document.getElementById('search-input').value || '').toLowerCase().trim();
        if (!q) {
          renderStudents(allStudents);
          return;
        }
        const filtered = allStudents.filter(s =>
          (s.full_name || '').toLowerCase().includes(q) ||
          (s.official_enrollment_no || '').toLowerCase().includes(q) ||
          (s.ubter_reg_no || '').toLowerCase().includes(q) ||
          String(s.class_roll_no || '').includes(q)
        );
        renderStudents(filtered);
      }, 200);
    }

    function resetFilters() {
      document.getElementById('search-input').value = '';
      document.getElementById('filter-year').value = '';
      document.getElementById('filter-sem').value = '';
      document.getElementById('cohort-select').value = '';
      selectedCohort = null;
      updateRegistrationStatusBadge();
      loadStudents();
    }

    // Student Modals Openers
    function openAddModal() {
      document.getElementById('add-form').reset();
      if (selectedCohort) {
        document.getElementById('add-year').value = selectedCohort.year;
        document.getElementById('add-sem').value = selectedCohort.semester;
      }
      showModal('add-modal');
    }

    async function submitAddStudent(e) {
      e.preventDefault();
      const btn = document.getElementById('add-btn');
      btn.disabled = true;

      const payload = {
        full_name: document.getElementById('add-name').value.trim(),
        official_enrollment_no: document.getElementById('add-enroll').value.trim(),
        ubter_reg_no: document.getElementById('add-ubter').value.trim() || undefined,
        email: document.getElementById('add-email').value.trim() || undefined,
        year: parseInt(document.getElementById('add-year').value),
        semester: parseInt(document.getElementById('add-sem').value)
      };

      try {
        const res = await apiFetch(`${API}/students`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        closeModal('add-modal');
        loadStudents();

        document.getElementById('student-slip-name').textContent = payload.full_name;
        document.getElementById('student-slip-enroll').textContent = payload.official_enrollment_no;
        document.getElementById('student-slip-pass').textContent = res?.data?.temporary_password || 'Password@123';
        showModal('slip-modal');
      } catch (err) {
        showToast(err.message || 'Failed to admit student.', 'error');
      } finally {
        btn.disabled = false;
      }
    }

    function copyStudentSlip() {
      const name = document.getElementById('student-slip-name').textContent;
      const enroll = document.getElementById('student-slip-enroll').textContent;
      const pass = document.getElementById('student-slip-pass').textContent;
      const text = `VidyaOS Student Admission Slip:\nName: ${name}\nOfficial Enrollment #: ${enroll}\nTemporary Password: ${pass}\nPortal: ${window.location.origin}/login`;
      navigator.clipboard.writeText(text);
      showToast('Student slip copied to clipboard!', 'success');
    }

    function openBulkModal() {
      document.getElementById('bulk-form').reset();
      if (selectedCohort) {
        document.getElementById('bulk-year').value = selectedCohort.year;
        document.getElementById('bulk-sem').value = selectedCohort.semester;
      }
      showModal('bulk-modal');
    }

    async function submitBulk(e) {
      e.preventDefault();
      const btn = document.getElementById('bulk-btn');
      btn.disabled = true;

      const year = parseInt(document.getElementById('bulk-year').value);
      const semester = parseInt(document.getElementById('bulk-sem').value);
      const csvText = document.getElementById('bulk-csv').value.trim();

      const lines = csvText.split('\n').filter(Boolean);
      const students = lines.map(line => {
        const parts = line.split(',').map(p => p.trim());
        return {
          full_name: parts[0],
          official_enrollment_no: parts[1],
          ubter_reg_no: parts[2] || undefined,
          email: parts[3] || undefined
        };
      }).filter(s => s.full_name && s.official_enrollment_no);

      try {
        const res = await apiFetch(`${API}/students/bulk`, {
          method: 'POST',
          body: JSON.stringify({ year, semester, students })
        });

        closeModal('bulk-modal');
        loadStudents();

        bulkCredentialsData = res?.data?.created || [];
        const tbody = document.getElementById('bulk-tbody');
        tbody.innerHTML = bulkCredentialsData.map(s => `
          <tr>
            <td style="padding: 0.4rem 0.6rem;">${s.class_roll_no || '—'}</td>
            <td style="padding: 0.4rem 0.6rem; font-weight: 600;">${esc(s.full_name)}</td>
            <td style="padding: 0.4rem 0.6rem; font-family: monospace;">${esc(s.official_enrollment_no)}</td>
            <td style="padding: 0.4rem 0.6rem; font-family: monospace; font-weight: 700;">${esc(s.temporary_password)}</td>
          </tr>
        `).join('');

        showModal('bulk-result-modal');
      } catch (err) {
        showToast(err.message || 'Failed to process bulk import.', 'error');
      } finally {
        btn.disabled = false;
      }
    }

    function copyBulkCredentials() {
      const tsv = ['Roll\tName\tEnrollment\tPassword', ...bulkCredentialsData.map(s => `${s.class_roll_no}\t${s.full_name}\t${s.official_enrollment_no}\t${s.temporary_password}`)].join('\n');
      navigator.clipboard.writeText(tsv);
      showToast('Bulk credentials copied to clipboard!', 'success');
    }

    let currentPromotionData = null;
    let selectedStudentIds = new Set();

    function openPromotionModal() {
      const pForm = document.getElementById('promotion-form');
      if (pForm) pForm.reset();
      const codeEl = document.getElementById('promo-confirm-code');
      if (codeEl) codeEl.value = '';
      selectedStudentIds.clear();
      switchPromotionTab('promote');
      showModal('promotion-modal');
    }

    function switchPromotionTab(tab) {
      const promoteTab = document.getElementById('tab-promo-promote');
      const demoteTab = document.getElementById('tab-promo-demote');
      const promoteSec = document.getElementById('promo-promote-section');
      const demoteSec = document.getElementById('promo-demote-section');

      if (tab === 'promote') {
        if (promoteTab) { promoteTab.className = 'btn btn-sm btn-primary'; }
        if (demoteTab) { demoteTab.className = 'btn btn-sm btn-secondary'; }
        if (promoteSec) promoteSec.style.display = 'block';
        if (demoteSec) demoteSec.style.display = 'none';
        loadPromotionPreview();
      } else {
        if (promoteTab) { promoteTab.className = 'btn btn-sm btn-secondary'; }
        if (demoteTab) { demoteTab.className = 'btn btn-sm btn-primary'; }
        if (promoteSec) promoteSec.style.display = 'none';
        if (demoteSec) demoteSec.style.display = 'block';
        loadDemotionPreview();
      }
    }

    async function loadPromotionPreview() {
      const box = document.getElementById('promo-preview-table-wrap') || document.getElementById('promotion-preview-box');
      if (!box) return;
      const actionEl = document.getElementById('promo-action');
      const action = actionEl ? actionEl.value : 'PROMOTE';
      const cohortFilter = document.getElementById('promo-cohort-filter');
      box.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);"><span class="spinner" style="display:inline-block;margin-right:6px;"></span>Loading cohort progression preview...</div>';

      try {
        const res = await apiFetch(`${API}/promotion/preview?action=${action}`);
        const data = res?.data;
        currentPromotionData = data;
        if (!data || !data.cohorts || data.cohorts.length === 0) {
          box.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No active student cohorts eligible for progression.</div>';
          if (cohortFilter) cohortFilter.innerHTML = '<option value="ALL">No Cohorts</option>';
          updatePromotionSummary();
          return;
        }

        // Set safety confirmation code label
        const codeLabel = document.getElementById('promo-dept-code-label');
        if (codeLabel && data.department_code) {
          codeLabel.innerText = data.department_code;
        }

        // Populate cohort filter dropdown
        if (cohortFilter) {
          cohortFilter.innerHTML = '<option value="ALL">All Eligible Cohorts (' + (data.total_students || 0) + ' Students)</option>' +
            data.cohorts.map((c, idx) => {
              const yr = c.current_year || c.year || 1;
              const sem = c.current_sem || c.semester || 1;
              const stCount = (c.students || []).length;
              return `<option value="${idx}">Year ${yr} Sem ${sem} (${stCount} Students)</option>`;
            }).join('');
        }

        // By default, ALL eligible students are selected (checked) to be promoted
        selectedStudentIds.clear();
        data.cohorts.forEach(c => {
          (c.students || []).forEach(s => {
            selectedStudentIds.add(Number(s.student_id));
          });
        });

        renderPromotionStudents();
      } catch (err) {
        box.innerHTML = `<div style="color: var(--status-absent); padding: 1rem;">Failed to load preview: ${esc(err.message)}</div>`;
      }
    }

    async function loadDemotionPreview() {
      const box = document.getElementById('demote-preview-table-wrap');
      if (!box) return;
      box.innerHTML = '<div style="text-align: center; padding: 1.5rem; color: var(--text-muted);"><span class="spinner" style="display:inline-block;margin-right:6px;"></span>Loading reversal breakdown...</div>';
      try {
        const res = await apiFetch(`${API}/promotion/preview?action=DEMOTE`);
        const data = res?.data;
        if (!data || !data.cohorts || data.cohorts.length === 0) {
          box.innerHTML = '<div style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No cohorts eligible for reversal.</div>';
          return;
        }
        let html = '<table class="table" style="width: 100%; font-size: 0.82rem;"><thead><tr><th>Cohort</th><th>Current Sem</th><th>Rollback Sem</th><th>Students</th></tr></thead><tbody>';
        data.cohorts.forEach(c => {
          const yr = c.current_year || c.year || 1;
          const sem = c.current_sem || c.semester || 1;
          const prevSem = sem > 1 ? sem - 1 : 1;
          const count = (c.students || []).length;
          html += `<tr><td>Year ${esc(yr)}</td><td>Sem ${esc(sem)}</td><td>Sem ${esc(prevSem)}</td><td>${esc(count)}</td></tr>`;
        });
        html += '</tbody></table>';
        box.innerHTML = html;
      } catch (err) {
        box.innerHTML = `<div style="color: var(--status-absent); padding: 1rem;">Failed to load reversal preview: ${esc(err.message)}</div>`;
      }
    }

    function filterPromotionCohort() {
      renderPromotionStudents();
    }

    function renderPromotionStudents() {
      const box = document.getElementById('promotion-preview-box');
      if (!currentPromotionData || !currentPromotionData.cohorts) return;

      const action = document.getElementById('promo-action').value;
      const filterVal = document.getElementById('promo-cohort-filter').value;
      const cohorts = filterVal === 'ALL' 
        ? currentPromotionData.cohorts 
        : [currentPromotionData.cohorts[parseInt(filterVal, 10)]].filter(Boolean);

      const deptCode = currentPromotionData.department_code || 'IT';
      const activeTerm = currentPromotionData.current_active_term || currentPromotionData.active_term || 'ODD';

      let html = `
        <div style="margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <strong style="color: var(--text-main);">Department: ${esc(deptCode)}</strong> &bull; <span style="color: var(--text-muted);">Active Term: <strong>${esc(activeTerm)}</strong></span>
          </div>
          <div style="display: flex; gap: 0.4rem;">
            <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.74rem; padding: 0.2rem 0.55rem;" onclick="toggleAllPromotionStudents(true)">Select All (Pass)</button>
            <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.74rem; padding: 0.2rem 0.55rem;" onclick="toggleAllPromotionStudents(false)">Clear All</button>
          </div>
        </div>
      `;

      if (cohorts.length === 0) {
        html += '<div style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No students in selected cohort.</div>';
      }

      cohorts.forEach(c => {
        const yr = c.current_year || c.year || 1;
        const sem = c.current_sem || c.semester || 1;
        const targetYr = c.target_year || yr;
        const targetSem = c.target_sem || (sem + 1);
        const isGrad = c.is_graduating || sem >= ((currentPromotionData.degree_duration_years || 3) * 2);
        const students = c.students || [];

        const targetDesc = isGrad ? 'Graduate to Alumni' : (action === 'demote' ? `Rollback to Sem ${targetSem}` : `Advance to Year ${targetYr} Sem ${targetSem}`);

        html += `
          <div style="margin-bottom: 0.85rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); overflow: hidden;">
            <div style="background: var(--bg-surface-secondary); padding: 0.45rem 0.75rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: var(--color-primary); font-size: 0.85rem;">Year ${yr} Semester ${sem}</strong>
                <span style="color: var(--text-muted); font-size: 0.76rem;"> &rarr; ${esc(targetDesc)}</span>
              </div>
              <span class="badge" style="background: var(--chip-faculty-bg); color: var(--chip-faculty-color); font-size: 0.72rem; font-weight: 700;">
                ${students.length} Students
              </span>
            </div>

            <div style="max-height: 190px; overflow-y: auto;">
              <table class="table" style="font-size: 0.79rem; margin: 0; width: 100%;">
                <thead>
                  <tr style="position: sticky; top: 0; background: var(--bg-surface); z-index: 1;">
                    <th style="width: 44px; text-align: center; padding: 0.35rem;">Pass?</th>
                    <th style="width: 45px; text-align: center; padding: 0.35rem;">Roll</th>
                    <th style="padding: 0.35rem;">Enrollment No</th>
                    <th style="padding: 0.35rem;">Student Name</th>
                    <th style="width: 140px; text-align: right; padding: 0.35rem;">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  ${students.map(s => {
                    const stId = Number(s.student_id);
                    const isChecked = selectedStudentIds.has(stId);
                    const checkIcon = window.FacultyIcons ? FacultyIcons.get('check', { size: 11 }) : '✓';
                    const closeIcon = window.FacultyIcons ? FacultyIcons.get('close', { size: 11 }) : '✕';
                    const decisionTag = isChecked
                      ? `<span class="badge badge-present" style="font-size: 0.68rem; padding: 0.2rem 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem;">${checkIcon} Pass &bull; ${isGrad ? 'Graduate' : 'Promote'}</span>`
                      : `<span class="badge badge-absent" style="font-size: 0.68rem; padding: 0.2rem 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem;">${closeIcon} Retain in Sem ${sem}</span>`;

                    return `
                      <tr style="background: ${isChecked ? 'transparent' : 'var(--status-absent-bg)'};">
                        <td style="text-align: center; padding: 0.35rem;">
                          <input type="checkbox" class="promo-student-cb" value="${stId}" ${isChecked ? 'checked' : ''} onchange="onStudentPromoToggle(${stId}, this.checked)">
                        </td>
                        <td style="text-align: center; font-weight: 700; padding: 0.35rem;">${esc(s.class_roll_no || '—')}</td>
                        <td style="font-family: var(--font-family-mono); font-size: 0.74rem; padding: 0.35rem;">${esc(s.official_enrollment_no)}</td>
                        <td style="font-weight: 600; color: var(--text-main); padding: 0.35rem;">${esc(s.full_name)}</td>
                        <td style="text-align: right; padding: 0.35rem;">${decisionTag}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      });

      box.innerHTML = html;
      updatePromotionSummary();
    }

    function onStudentPromoToggle(studentId, isChecked) {
      if (isChecked) {
        selectedStudentIds.add(Number(studentId));
      } else {
        selectedStudentIds.delete(Number(studentId));
      }
      renderPromotionStudents();
    }

    function toggleAllPromotionStudents(selectAll) {
      if (!currentPromotionData || !currentPromotionData.cohorts) return;
      const cohortFilterEl = document.getElementById('promo-cohort-filter');
      const filterVal = cohortFilterEl ? cohortFilterEl.value : 'ALL';
      const cohorts = filterVal === 'ALL' 
        ? currentPromotionData.cohorts 
        : [currentPromotionData.cohorts[parseInt(filterVal, 10)]].filter(Boolean);

      cohorts.forEach(c => {
        (c.students || []).forEach(s => {
          const stId = Number(s.student_id);
          if (selectAll) {
            selectedStudentIds.add(stId);
          } else {
            selectedStudentIds.delete(stId);
          }
        });
      });
      renderPromotionStudents();
    }

    function updatePromotionSummary() {
      const badge = document.getElementById('promo-summary-badge');
      const submitBtn = document.getElementById('btn-execute-promotion') || document.getElementById('promo-submit-btn');
      if (!currentPromotionData) return;

      const total = currentPromotionData.total_students || 0;
      const selected = selectedStudentIds.size;
      const unselected = Math.max(0, total - selected);

      if (badge) {
        badge.innerHTML = `<strong>${selected}</strong> Passed &bull; <strong>${unselected}</strong> Retained (of ${total} total)`;
      }
      if (submitBtn) {
        submitBtn.innerHTML = `Confirm &amp; Advance All Cohorts (${selected} Passed) &rarr;`;
      }
    }

    async function executePromotion(e) {
      if (e && e.preventDefault) e.preventDefault();
      const btn = document.getElementById('btn-execute-promotion') || document.getElementById('promo-submit-btn');
      if (btn) btn.disabled = true;

      const actionEl = document.getElementById('promo-action');
      const action = actionEl ? actionEl.value : 'PROMOTE';
      const codeEl = document.getElementById('promo-confirm-code');
      const confirm_code = codeEl ? codeEl.value.trim().toUpperCase() : (currentPromotionData?.department_code || currentDeptCode || 'IT');

      const promotedIds = Array.from(selectedStudentIds);
      const allStudentIds = [];
      if (currentPromotionData && currentPromotionData.cohorts) {
        currentPromotionData.cohorts.forEach(c => {
          (c.students || []).forEach(s => allStudentIds.push(Number(s.student_id)));
        });
      }
      const exceptions = allStudentIds.filter(id => !selectedStudentIds.has(id));

      try {
        const res = await apiFetch(`${API}/promotion/execute`, {
          method: 'POST',
          body: JSON.stringify({ 
            action, 
            confirm_code,
            promoted_student_ids: promotedIds,
            selected_student_ids: promotedIds,
            exceptions: exceptions
          })
        });

        showToast(res.message || 'Semester progression successfully executed!', 'success');
        closeModal('promotion-modal');
        loadStudents();
      } catch (err) {
        showToast(err.message || 'Progression execution failed.', 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function submitPromotion(e) {
      return executePromotion(e);
    }

    async function submitDemotion(e) {
      if (e && e.preventDefault) e.preventDefault();
      const btn = document.getElementById('btn-execute-demotion');
      if (btn) btn.disabled = true;
      try {
        const res = await apiFetch(`${API}/promotion/execute`, {
          method: 'POST',
          body: JSON.stringify({ action: 'DEMOTE' })
        });
        showToast(res.message || 'Semester rollback successfully executed!', 'success');
        closeModal('promotion-modal');
        loadStudents();
      } catch (err) {
        showToast(err.message || 'Failed to execute rollback.', 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    function openReindexModal() {
      if (selectedCohort) {
        const yearEl = document.getElementById('reindex-year');
        if (yearEl) yearEl.value = selectedCohort.year;
        const semEl = document.getElementById('reindex-sem');
        if (semEl) semEl.value = selectedCohort.semester;
      }
      showModal('reindex-modal');
    }

    async function submitReindexRoll(e) {
      if (e && e.preventDefault) e.preventDefault();
      const yearEl = document.getElementById('reindex-year');
      const semEl = document.getElementById('reindex-sem');
      const year = yearEl ? parseInt(yearEl.value, 10) : (selectedCohort?.year || 1);
      const semester = semEl ? parseInt(semEl.value, 10) : (selectedCohort?.semester || 1);

      try {
        await apiFetch(`${API}/students/reindex-roll`, {
          method: 'POST',
          body: JSON.stringify({ year, semester })
        });
        showToast('Roll numbers re-sequenced alphabetically (A–Z)!', 'success');
        closeModal('reindex-modal');
        loadStudents();
      } catch (err) {
        showToast(err.message || 'Failed to re-index roll numbers.', 'error');
      }
    }

    function submitReindex(e) {
      return submitReindexRoll(e);
    }

    function openResetStudentModal(id, name) {
      targetStudentId = id;
      document.getElementById('reset-student-name').textContent = name;
      document.getElementById('reset-student-pass').value = 'Password@123';
      showModal('reset-student-modal');
    }

    async function submitResetStudent(e) {
      e.preventDefault();
      const pass = document.getElementById('reset-student-pass').value;
      try {
        await apiFetch(`${API}/students/${targetStudentId}/reset-password`, {
          method: 'POST',
          body: JSON.stringify({ new_password: pass })
        });
        showToast('Student password updated successfully!', 'success');
        closeModal('reset-student-modal');
      } catch (err) {
        showToast(err.message || 'Failed to reset student password.', 'error');
      }
    }

    function openDeleteStudentModal(id, name) {
      if (window.confirmStudentWithdrawal) {
        window.confirmStudentWithdrawal(id, name, () => {
          loadStudents();
          loadCohorts();
        });
        return;
      }
      targetStudentId = id;
      const nameEl = document.getElementById('del-student-name');
      if (nameEl) nameEl.textContent = name;
      showModal('delete-student-modal');
    }

    async function submitDeleteStudent() {
      try {
        await apiFetch(`${API}/students/${targetStudentId}`, { method: 'DELETE' });
        showToast('Student withdrawn from roster.', 'info');
        closeModal('delete-student-modal');
        loadStudents();
      } catch (err) {
        showToast(err.message || 'Failed to withdraw student.', 'error');
      }
    }

    // ==================== PENDING REGISTRATIONS ====================

    async function loadPendingRegistrations() {
      const tbody = document.getElementById('pending-tbody');
      const mcards = document.getElementById('pending-student-mobile-cards');
      const label = document.getElementById('pending-count-label');
      const countEl = document.getElementById('pending-students-count');
      const gwEl = document.getElementById('gw-student-pending');

      try {
        const res = await apiFetch('/students/registrations/pending');
        allPendingStudents = res?.data || [];

        if (label) label.textContent = `${allPendingStudents.length} requests pending`;
        if (countEl) countEl.textContent = allPendingStudents.length;
        if (gwEl) gwEl.textContent = allPendingStudents.length;

        if (allPendingStudents.length === 0) {
          const emptyHtml = `
            <div class="pending-empty-state">
              <div class="pending-empty-icon">✓</div>
              <div class="pending-empty-title">Student Queue is Clear</div>
              <div class="pending-empty-text">All student self-registration requests have been adjudicated.</div>
            </div>
          `;
          if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="padding: 0;">${emptyHtml}</td></tr>`;
          if (mcards) mcards.innerHTML = emptyHtml;
          return;
        }

        // Render Desktop Table
        if (tbody) {
          tbody.innerHTML = allPendingStudents.map((r, idx) => {
            const appliedDate = new Date(r.registered_at || r.created_at || Date.now()).toLocaleDateString();
            const enrollNo = r.official_enrollment_no || r.enrollment_no || '—';

            return `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem 1rem;">${idx + 1}</td>
                <td style="padding: 0.75rem 1rem; font-weight: 700; color: var(--text-main);">${esc(r.full_name)}</td>
                <td style="padding: 0.75rem 1rem; font-family: var(--font-family-mono, monospace); font-weight: 600; color: var(--color-primary);">${esc(enrollNo)}</td>
                <td style="padding: 0.75rem 1rem; font-family: var(--font-family-mono, monospace); font-size: 0.82rem;">${esc(r.email)}</td>
                <td style="padding: 0.75rem 1rem; font-size: 0.82rem;"><span class="fac-mini-badge" style="background: var(--status-present-bg); color: var(--status-present);">Y${r.year || 1} S${r.semester || 1}</span></td>
                <td style="padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--text-muted);">${appliedDate}</td>
                <td style="padding: 0.75rem 1rem; text-align: right;">
                  <div style="display: inline-flex; gap: 0.4rem; justify-content: flex-end;">
                    <button type="button" class="btn btn-primary btn-sm" onclick="openApproveModal(${r.student_id || r.id}, '${esc(r.full_name)}', '${esc(enrollNo)}')">Approve</button>
                    <button type="button" class="btn btn-secondary btn-sm" style="color: var(--status-absent);" onclick="openRejectModal(${r.student_id || r.id}, '${esc(r.full_name)}', 'STUDENT')">Reject</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('');
        }

        // Render Mobile Cards
        if (mcards) {
          mcards.innerHTML = allPendingStudents.map(r => {
            const appliedDate = new Date(r.registered_at || r.created_at || Date.now()).toLocaleDateString();
            const enrollNo = r.official_enrollment_no || r.enrollment_no || 'Pending';

            return `
              <div class="pending-mini-card">
                <div class="pending-mini-top">
                  <div class="user-cell-avatar blue-avatar" style="width: 40px; height: 40px; font-size: 0.85rem; font-weight: 700;">
                    ${r.class_roll_no ? String(r.class_roll_no).padStart(2, '0') : 'ST'}
                  </div>
                  <div class="pending-mini-info">
                    <div class="pending-mini-name">
                      <span>${esc(r.full_name)}</span>
                      <span class="fac-mini-badge" style="background: var(--status-present-bg); color: var(--status-present);">Y${r.year || 1} S${r.semester || 1}</span>
                    </div>
                    <div class="pending-mini-sub">${esc(enrollNo)} • ${esc(r.email)}</div>
                  </div>
                  <span class="pending-pill-badge green" style="font-size: 0.65rem;">PENDING</span>
                </div>
                <div class="pending-mini-actions">
                  <span style="font-size: 0.72rem; color: var(--text-muted); margin-right: auto;">Applied: ${appliedDate}</span>
                  <button type="button" class="btn btn-primary btn-sm" onclick="openApproveModal(${r.student_id || r.id}, '${esc(r.full_name)}', '${esc(enrollNo)}')">✓ Approve</button>
                  <button type="button" class="btn btn-secondary btn-sm" style="color: var(--status-absent);" onclick="openRejectModal(${r.student_id || r.id}, '${esc(r.full_name)}', 'STUDENT')">✕ Reject</button>
                </div>
              </div>
            `;
          }).join('');
        }
      } catch (err) {
        console.error('Failed to load pending registrations:', err);
      }
    }

    async function loadAllPendingData() {
      await Promise.all([loadPendingFaculty(), loadPendingRegistrations()]);
      const totalPending = allPendingFaculty.length + allPendingStudents.length;

      const allCountEl = document.getElementById('pending-all-count');
      const badge = document.getElementById('pending-badge');
      const statBadge = document.getElementById('stat-pending');

      if (allCountEl) allCountEl.textContent = totalPending;
      if (badge) {
        badge.textContent = totalPending;
        badge.style.display = totalPending > 0 ? 'inline-block' : 'none';
      }
      if (statBadge) statBadge.textContent = totalPending;
    }

    function openApproveModal(id, name, enrollNo) {
      targetRegId = id;
      document.getElementById('approve-name').textContent = name;
      document.getElementById('approve-enroll').value = enrollNo || '';
      showModal('approve-modal');
    }

    async function submitApproveRegistration(e) {
      e.preventDefault();
      const enrollNo = document.getElementById('approve-enroll').value.trim();
      try {
        await apiFetch(`/students/registrations/${targetRegId}/adjudicate`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'APPROVE',
            official_enrollment_no: enrollNo
          })
        });
        showToast('Student registration approved!', 'success');
        closeModal('approve-modal');
        loadAllPendingData();
        loadStudents();
      } catch (err) {
        showToast(err.message || 'Failed to approve student.', 'error');
      }
    }

    function openRejectModal(id, name, type) {
      targetRegId = id;
      targetRegType = type || 'STUDENT';
      const nameEl = document.getElementById('reject-name');
      if (nameEl) nameEl.textContent = name;
      const reasonEl = document.getElementById('reject-reason');
      if (reasonEl) reasonEl.value = '';
      showModal('reject-modal');
    }

    async function submitRejectRegistration(e) {
      e.preventDefault();
      const reason = (document.getElementById('reject-reason').value || '').trim();
      try {
        if (targetRegType === 'FACULTY') {
          await apiFetch(`${API}/faculty-registrations/${targetRegId}/adjudicate`, {
            method: 'POST',
            body: JSON.stringify({ action: 'REJECT', rejection_reason: reason })
          });
          showToast('Faculty registration rejected.', 'info');
        } else {
          await apiFetch(`/students/registrations/${targetRegId}/adjudicate`, {
            method: 'POST',
            body: JSON.stringify({ action: 'REJECT', rejection_reason: reason })
          });
          showToast('Student registration rejected.', 'info');
        }
        closeModal('reject-modal');
        loadAllPendingData();
      } catch (err) {
        showToast(err.message || 'Failed to reject registration.', 'error');
      }
    }

    // Kebab Menu Handlers
    function toggleFacultyKebabMenu(teacherId, event) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      const btn = event ? (event.currentTarget || event.target.closest('.fac-kebab-btn')) : null;
      const wrap = btn ? btn.closest('.fac-kebab-wrap') : null;
      const targetMenu = (wrap ? wrap.querySelector('.fac-kebab-menu') : null) ||
                         document.getElementById(`fac-kebab-menu-table-${teacherId}`) ||
                         document.getElementById(`fac-kebab-menu-${teacherId}`);
      const wasOpen = targetMenu && targetMenu.classList.contains('open');

      closeAllKebabMenus();

      if (targetMenu && !wasOpen) {
        targetMenu.classList.add('open');
        if (wrap) wrap.classList.add('menu-open');
      }
    }

    function toggleStudentKebabMenu(studentId, event) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      const btn = event ? (event.currentTarget || event.target.closest('.fac-kebab-btn')) : null;
      const wrap = btn ? btn.closest('.fac-kebab-wrap') : null;
      const targetMenu = (wrap ? wrap.querySelector('.fac-kebab-menu') : null) ||
                         document.getElementById(`student-kebab-menu-table-${studentId}`) ||
                         document.getElementById(`student-kebab-menu-${studentId}`);
      const wasOpen = targetMenu && targetMenu.classList.contains('open');

      closeAllKebabMenus();

      if (targetMenu && !wasOpen) {
        targetMenu.classList.add('open');
        if (wrap) wrap.classList.add('menu-open');
      }
    }

    function closeAllKebabMenus() {
      document.querySelectorAll('.fac-kebab-menu.open').forEach(m => {
        m.classList.remove('open');
      });
      document.querySelectorAll('.fac-kebab-wrap.menu-open').forEach(w => w.classList.remove('menu-open'));
    }

    function closeAllStudentKebabMenus() {
      closeAllKebabMenus();
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.fac-kebab-wrap')) {
        closeAllKebabMenus();
      }
    });

    // View Faculty Modal Controller
    async function openViewFacultyModal(teacherId) {
      const teacher = (allTeachers || []).find(t => Number(t.id) === Number(teacherId)) || {};
      const initials = (teacher.full_name || 'T')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('') || 'T';
      const isHodMember = Boolean(teacher.is_hod || (teacher.employee_id && teacher.employee_id.includes('HOD')));
      const designation = teacher.designation || (isHodMember ? 'Head of Department' : 'Lecturer');
      const empId = teacher.employee_id || `FAC-0${teacher.id || 1}`;
      const email = teacher.email || teacher.gmail || 'Not provided';
      const phone = teacher.phone || teacher.mobile || 'Not provided';
      const username = teacher.username || (email ? email.split('@')[0] : 'faculty');
      const deptName = teacher.department_name || teacher.dept_name || 'Information Technology';
      const createdDate = teacher.created_at ? new Date(teacher.created_at).toLocaleDateString() : 'Active Department Staff';
      const isGoogleLinked = Boolean(teacher.google_linked);
      const isSelf = Boolean(
        currentUser && (
          (currentUser.teacher_id && Number(teacher.id) === Number(currentUser.teacher_id)) ||
          (currentUser.id && Number(teacher.user_id) === Number(currentUser.id)) ||
          (currentUser.user_id && Number(teacher.user_id) === Number(currentUser.user_id)) ||
          (currentUser.email && teacher.email && currentUser.email.toLowerCase() === teacher.email.toLowerCase()) ||
          (currentUser.email && teacher.gmail && currentUser.email.toLowerCase() === teacher.gmail.toLowerCase())
        )
      );

      const statusHtml = (teacher.status === 'INACTIVE' || teacher.is_active === false)
        ? '<span style="color: var(--status-absent, #ef4444); font-weight: 700; font-size: 0.78rem;">● Inactive</span>'
        : '<span style="color: var(--status-present, #10b981); font-weight: 700; font-size: 0.78rem;">● Active Member</span>';

      const body = document.getElementById('view-faculty-body');
      if (body) {
        body.innerHTML = `
          <!-- Hero Profile Card -->
          <div class="fac-profile-hero">
            <div class="fac-profile-avatar-wrap">
              <div class="fac-profile-avatar ${isHodMember ? 'purple-avatar' : 'blue-avatar'}">
                ${initials}
              </div>
            </div>
            <div class="fac-profile-meta">
              <div class="fac-profile-name">${esc(teacher.full_name || 'Faculty Member')}</div>
              <div class="fac-profile-badges">
                <span class="fac-mini-badge ${isHodMember ? 'hod' : 'lecturer'}">${designation}</span>
                <span style="font-family: var(--font-family-mono, monospace); font-size: 0.78rem; font-weight: 700; color: var(--color-primary); background: var(--color-primary-light); padding: 0.15rem 0.5rem; border-radius: var(--radius-sm, 4px);">${esc(empId)}</span>
                ${statusHtml}
              </div>
            </div>
          </div>

          <!-- Academic & Department Overview -->
          <div class="fac-profile-section">
            <div class="fac-profile-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              <span>Academic &amp; Departmental Placement</span>
            </div>
            <div class="fac-profile-grid">
              <div class="fac-profile-item">
                <span class="fac-profile-label">Department</span>
                <span class="fac-profile-val">${esc(deptName)}</span>
              </div>
              <div class="fac-profile-item">
                <span class="fac-profile-label">Institutional Role</span>
                <span class="fac-profile-val">${isHodMember ? 'Head of Department' : 'Teaching Faculty'}</span>
              </div>
              <div class="fac-profile-item">
                <span class="fac-profile-label">Employee ID Code</span>
                <span class="fac-profile-val" style="font-family: var(--font-family-mono, monospace); color: var(--color-primary);">${esc(empId)}</span>
              </div>
              <div class="fac-profile-item">
                <span class="fac-profile-label">Member Since</span>
                <span class="fac-profile-val">${createdDate}</span>
              </div>
            </div>
          </div>

          <!-- Contact & Credentials -->
          <div class="fac-profile-section">
            <div class="fac-profile-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              <span>Contact &amp; Identity Credentials</span>
            </div>
            <div class="fac-profile-grid">
              <div class="fac-profile-item">
                <span class="fac-profile-label">Institutional / Login Email</span>
                <span class="fac-profile-val">${esc(email)}</span>
              </div>
              <div class="fac-profile-item">
                <span class="fac-profile-label">System Username</span>
                <span class="fac-profile-val" style="font-family: var(--font-family-mono, monospace);">${esc(username)}</span>
              </div>
              <div class="fac-profile-item">
                <span class="fac-profile-label">Contact Phone</span>
                <span class="fac-profile-val">${esc(phone)}</span>
              </div>
              <div class="fac-profile-item">
                <span class="fac-profile-label">Authentication Method</span>
                <span class="fac-profile-val">${isGoogleLinked ? '<span style="color: var(--status-present);">✓ Google SSO Linked</span>' : 'Standard Password Auth'}</span>
              </div>
            </div>
          </div>

          <!-- Active Teaching Assignments -->
          <div class="fac-profile-section">
            <div class="fac-profile-section-title" style="justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                <span>Assigned Courses &amp; Teaching Load</span>
              </div>
              <span id="fac-modal-assign-count" class="subtab-badge" style="background: var(--color-primary-light); color: var(--color-primary); font-size: 0.72rem;">Loading...</span>
            </div>
            <div id="fac-modal-assignments-list">
              <div style="text-align: center; padding: 1rem; color: var(--text-muted); font-size: 0.82rem;">Loading course assignments...</div>
            </div>
          </div>
        `;
      }

      const extraActionWrap = document.getElementById('view-faculty-extra-action');
      if (extraActionWrap) {
        if (isSelf) {
          extraActionWrap.innerHTML = `
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeViewFacultyModal(); openSelfPasswordModal();" style="display: inline-flex; align-items: center; gap: 0.35rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>Change Password</span>
            </button>
          `;
        } else if (isHod) {
          extraActionWrap.innerHTML = `
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeViewFacultyModal(); openResetModal(${teacher.id}, '${esc(teacher.full_name)}');" style="display: inline-flex; align-items: center; gap: 0.35rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/></svg>
              <span>Reset Password</span>
            </button>
          `;
        } else {
          extraActionWrap.innerHTML = '';
        }
      }

      showModal('view-faculty-modal');

      // Asynchronously fetch full assignments list
      try {
        const detailRes = await apiFetch(`${API}/teachers/${teacherId}`);
        const assignments = detailRes?.data?.assignments || [];
        const countBadge = document.getElementById('fac-modal-assign-count');
        const listContainer = document.getElementById('fac-modal-assignments-list');

        if (countBadge) countBadge.textContent = `${assignments.length} Courses`;

        if (listContainer) {
          if (assignments.length === 0) {
            listContainer.innerHTML = `<div style="text-align: center; padding: 0.75rem; color: var(--text-muted); font-size: 0.82rem;">No active course assignments linked for this academic year.</div>`;
          } else {
            listContainer.innerHTML = assignments.map(a => {
              const code = a.subject_code || (a.code || 'CRS');
              const name = a.subject_name || (a.name || 'Assigned Subject');
              const type = a.assignment_type || (a.type || 'THEORY');
              const regName = a.register_name || (a.register_id ? `Register #${a.register_id}` : '');
              const ay = a.academic_year_label || 'AY 2026–27';

              return `
                <div class="fac-subject-item">
                  <span class="fac-subject-code">${esc(code)}</span>
                  <span class="fac-subject-name" title="${esc(name)}">${esc(name)}</span>
                  <div style="display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0;">
                    <span class="fac-subject-badge">${esc(type)}</span>
                    <span class="fac-subject-badge" style="background: var(--color-primary-light); color: var(--color-primary);">${esc(ay)}</span>
                    ${regName ? `<span class="fac-subject-badge" style="background: var(--status-present-bg); color: var(--status-present);">${esc(regName)}</span>` : ''}
                  </div>
                </div>
              `;
            }).join('');
          }
        }
      } catch (err) {
        console.warn('Could not load detailed assignments for faculty:', err);
        const countBadge = document.getElementById('fac-modal-assign-count');
        const listContainer = document.getElementById('fac-modal-assignments-list');
        if (countBadge) countBadge.textContent = 'Active Staff';
        if (listContainer) {
          listContainer.innerHTML = `<div style="text-align: center; padding: 0.75rem; color: var(--text-muted); font-size: 0.82rem;">Teaching assignments active in department curriculum.</div>`;
        }
      }
    }

    function closeViewFacultyModal() {
      closeModal('view-faculty-modal');
    }

  // Bridge aliases for buttons and forms
  function submitResetTeacher(e) { return submitReset(e); }
  function submitBulkUpload(e) { return submitBulk(e); }
  function applyFilters() { loadStudents(); }
  function onCohortChange() { onCohortSelectChange(); }

  const exported = {
    // Kebab Menus
    toggleFacultyKebabMenu,
    toggleStudentKebabMenu,
    closeAllKebabMenus,
    closeAllStudentKebabMenus,

    // Faculty Details Modal
    openViewFacultyModal,
    closeViewFacultyModal,
    toggleFacultyKebabMenu,
    toggleStudentKebabMenu,
    closeAllKebabMenus,
    closeAllStudentKebabMenus,

    // Navigation & Tabs
    showMainTab,
    switchPendingSubtab,
    toggleFilterDrawer,
    resetFilters,
    onCohortChange,
    onCohortSelectChange,
    applyFilters,
    handleGlobalSearch,
    debounceSearch,

    // Faculty Management
    toggleFacultyRegistration,
    approveFaculty,
    rejectFaculty,
    openCreateModal,
    closeCreateModal,
    submitCreateTeacher,
    openResetModal,
    closeResetModal,
    submitReset,
    submitResetTeacher,
    openDeleteModal,
    closeDeleteModal,
    checkDeleteInput,
    submitDelete,
    copyCredentials,
    closeCredModal,

    // Student Management
    toggleDepartmentStudentRegistration,
    toggleCohortRegistration,
    openAddModal,
    closeModal,
    showModal,
    hideModal,
    submitAddStudent,
    copyStudentSlip,
    openBulkModal,
    submitBulk,
    submitBulkUpload,
    copyBulkCredentials,
    openResetStudentModal,
    submitResetStudent,
    openDeleteStudentModal,
    submitDeleteStudent,

    // Promotion & Progression
    openPromotionModal,
    switchPromotionTab,
    submitPromotion,
    submitDemotion,
    executePromotion,
    filterPromotionCohort,
    onStudentPromoToggle,
    toggleAllPromotionStudents,
    updatePromotionSummary,
    loadPromotionPreview,
    loadDemotionPreview,

    // Roll Number Re-Indexing
    openReindexModal,
    submitReindexRoll,
    submitReindex,

    // Pending Registrations Adjudication
    loadAllPendingData,
    loadPendingFaculty,
    loadPendingRegistrations,
    openApproveModal,
    submitApproveRegistration,
    openRejectModal,
    submitRejectRegistration,

    // Password & Session Self-Service
    openSelfPasswordModal,
    closeSelfPasswordModal,
    submitSelfPassword,

    // Data Loaders
    loadStudents,
    loadCohorts,
    loadTeachers
  };

  Object.assign(window, exported);
})();
