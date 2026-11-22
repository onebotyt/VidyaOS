/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY MANAGEMENT CONTROLLER (faculty.js)
 * Clean, Compact, Dynamic, High-Performance Architecture
 * Integrated with GlobalRosterFilter and GlobalConfirmModal
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // HOD RBAC Authorization Guard
  if (typeof requireFacultyAuth === 'function') {
    requireFacultyAuth(['HOD', 'SYSTEM_ADMIN']);
  } else if (typeof guardRoute === 'function') {
    guardRoute({ roles: ['HOD', 'SYSTEM_ADMIN'], redirectUrl: '/faculty/dashboard/index.html' });
  }

  let allFaculty = [];
  let trashFaculty = [];
  let departments = [];
  let currentFilter = 'ALL';
  let activeDeptFilter = 'ALL';
  let searchQuery = '';
  let currentDetailFacultyId = null;
  let facultyRosterFilter = null;

  const esc = (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  
  const notify = (msg, type = 'info') => {
    if (typeof showToast === 'function') showToast(msg, type);
    else alert(msg);
  };

  function checkIsHod() {
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('auth_user') || localStorage.getItem('currentUser');
      if (!raw) return false;
      const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!user) return false;
      if (user.is_hod === true || user.is_hod === 1 || user.is_hod === '1') return true;
      if (user.role && String(user.role).toUpperCase() === 'HOD') return true;
      if (Array.isArray(user.roles)) {
        const uRoles = user.roles.map(r => String(r).toUpperCase());
        if (uRoles.includes('HOD') || uRoles.includes('DEPT_HEAD') || uRoles.includes('SYSTEM_ADMIN')) return true;
      }
    } catch (_) {}
    return false;
  }

  function cleanFacultyDisplayName(name) {
    if (!name) return '';
    return name
      .replace(/\s*\((?:Common Faculty(?: Manager)?|Common Mgr|HOD(?:\s+[\w\s]+)?|Faculty(?: Teacher)?|Teacher|Prof(?:essor)?|Dean|Lecturer|Staff|Admin)\)/gi, '')
      .trim();
  }

  function getInitials(name) {
    if (!name) return 'FA';
    const clean = name.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase() || 'FA';
  }

  function isTargetHod(f) {
    if (!f) return false;
    return Boolean(
      f.is_hod === true ||
      f.is_hod === 1 ||
      f.is_hod === '1' ||
      (f.employee_id || '').toUpperCase().includes('HOD') ||
      (f.role || '').toUpperCase() === 'HOD' ||
      (f.designation || '').toLowerCase().includes('head')
    );
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

  // 1. Initial Load & Setup
  async function init() {
    initFacultyRosterFilter();
    setupEventListeners();
    await Promise.all([
      loadDepartments(),
      loadFacultyRoster(),
      loadTrashFaculty()
    ]);
  }

  function initFacultyRosterFilter() {
    if (typeof GlobalRosterFilter === 'undefined') return;
    const container = document.getElementById('fac-roster-section');
    if (!container) return;

    facultyRosterFilter = GlobalRosterFilter.create({
      container: container,
      idPrefix: 'faculty',
      searchPlaceholder: 'Search department faculty by name, email, employee ID...',
      hideDepartmentFilter: true,
      chips: [
        { id: 'ALL', label: 'All', count: 0 },
        { id: 'TEACHER', label: 'Teachers', count: 0 },
        { id: 'ACTIVE', label: 'Active', count: 0 },
        { id: 'TRASH', label: 'Trash', count: 0 }
      ],
      onFilterChange: function (filters) {
        searchQuery = (filters.search || '').trim().toLowerCase();
        activeDeptFilter = filters.dept || 'ALL';
        currentFilter = filters.chip || 'ALL';
        applyFacultyFilters();
      }
    });
  }

  // 2. Fetch Data
  async function loadDepartments() {
    try {
      const res = await api('/auth/departments');
      if (res && res.success && Array.isArray(res.data)) {
        departments = res.data;
      }
    } catch (err) {
      console.warn('[Faculty] Failed to load departments:', err.message);
    }
  }

  function getLoggedInUserId() {
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('auth_user') || localStorage.getItem('currentUser');
      if (!raw) return null;
      const u = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return {
        userId: u?.id || u?.user_id || null,
        teacherId: u?.teacher_id || u?.teacher?.id || null,
        employeeId: (u?.employee_id || u?.teacher?.employee_id || '').trim().toLowerCase()
      };
    } catch (_) { return null; }
  }

  async function loadFacultyRoster() {
    try {
      const res = await api('/hod/faculty-roster');
      if (res && res.success && Array.isArray(res.data)) {
        const self = getLoggedInUserId();
        allFaculty = res.data.filter(f => {
          if (!self) return true;
          if (self.userId && (f.user_id === self.userId || f.id === self.userId)) return false;
          if (self.teacherId && f.id === self.teacherId) return false;
          if (self.employeeId && f.employee_id && f.employee_id.trim().toLowerCase() === self.employeeId) return false;
          return true;
        });
        applyFacultyFilters();
      }
    } catch (err) {
      console.error('[Faculty] Failed to load faculty roster:', err);
    }
  }

  async function loadTrashFaculty() {
    try {
      const res = await api('/hod/trash/faculty');
      if (res && res.success && Array.isArray(res.data)) {
        const self = getLoggedInUserId();
        trashFaculty = res.data.filter(f => {
          if (!self) return true;
          if (self.userId && (f.user_id === self.userId || f.id === self.userId)) return false;
          if (self.teacherId && f.id === self.teacherId) return false;
          if (self.employeeId && f.employee_id && f.employee_id.trim().toLowerCase() === self.employeeId) return false;
          return true;
        });
        applyFacultyFilters();
      }
    } catch (err) {
      console.warn('[Faculty] Failed to load trash:', err.message);
    }
  }

  // 3. Filter Application & KPI Synchronization
  function applyFacultyFilters() {
    const total = allFaculty.length;
    const active = allFaculty.filter(f => (f.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
    const teachers = allFaculty.filter(f => !isTargetHod(f) && (f.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
    const hods = allFaculty.filter(f => isTargetHod(f)).length;
    const trash = trashFaculty.length;

    // Synchronize Compatibility Counters
    const elTotal = document.getElementById('stat-total-faculty');
    const elActive = document.getElementById('stat-active-faculty');
    const elActiveTeachers = document.getElementById('stat-active-teachers');
    const badgeAll = document.getElementById('badge-count-all');
    const badgeTrash = document.getElementById('badge-count-trash');
    const headerTrash = document.getElementById('header-trash-count');
    const kpiTrash = document.getElementById('kpi-trash-count');

    if (elTotal) elTotal.textContent = total;
    if (elActive) elActive.textContent = `${active} active`;
    if (elActiveTeachers) elActiveTeachers.textContent = teachers;
    if (badgeAll) badgeAll.textContent = total;
    if (badgeTrash) badgeTrash.textContent = trash;
    if (headerTrash) headerTrash.textContent = trash;
    if (kpiTrash) kpiTrash.textContent = trash;

    // Synchronize Filter Chips
    if (facultyRosterFilter) {
      const chipList = [
        { id: 'ALL', label: 'All', count: total },
        { id: 'TEACHER', label: 'Teachers', count: teachers }
      ];
      if (hods > 0) {
        chipList.push({ id: 'HOD', label: 'HODs', count: hods });
      }
      chipList.push(
        { id: 'ACTIVE', label: 'Active', count: active },
        { id: 'TRASH', label: 'Trash', count: trash }
      );
      facultyRosterFilter.updateChips(chipList);
    }

    // Toggle Trash button in header
    const pillTrash = document.getElementById('pill-trash');
    if (pillTrash) {
      if (currentFilter === 'TRASH') pillTrash.classList.add('active');
      else pillTrash.classList.remove('active');
    }

    // Render corresponding view
    if (currentFilter === 'TRASH') {
      renderTrashView();
    } else {
      renderActiveRosterView();
    }
  }

  // 4. Render Active Faculty Roster (Desktop Table & Mobile Mini Cards)
  function renderActiveRosterView() {
    const tableWrap = document.getElementById('faculty-table-wrap');
    const cardsWrap = document.getElementById('faculty-mobile-cards-wrap');

    let list = allFaculty.slice();

    // Role Chip Filter
    if (currentFilter === 'TEACHER') {
      list = list.filter(f => !isTargetHod(f));
    } else if (currentFilter === 'HOD') {
      list = list.filter(f => isTargetHod(f));
    } else if (currentFilter === 'ACTIVE') {
      list = list.filter(f => (f.status || 'ACTIVE').toUpperCase() === 'ACTIVE');
    }

    // Department Filter
    if (activeDeptFilter !== 'ALL') {
      list = list.filter(f => String(f.department_id) === String(activeDeptFilter));
    }

    // Search Query Filter
    if (searchQuery) {
      list = list.filter(f => {
        const name = (f.full_name || '').toLowerCase();
        const emp = (f.employee_id || '').toLowerCase();
        const email = (f.email || f.gmail || '').toLowerCase();
        const phone = (f.phone || '').toLowerCase();
        const dept = (f.department_name || f.department_code || '').toLowerCase();
        return name.includes(searchQuery) ||
               emp.includes(searchQuery) ||
               email.includes(searchQuery) ||
               phone.includes(searchQuery) ||
               dept.includes(searchQuery);
      });
    }

    // Sort: Active first, then alphabetical by full name
    list.sort((a, b) => {
      const aInactive = (a.status !== 'ACTIVE') ? 1 : 0;
      const bInactive = (b.status !== 'ACTIVE') ? 1 : 0;
      if (aInactive !== bInactive) return aInactive - bInactive;
      return (a.full_name || '').localeCompare(b.full_name || '');
    });

    if (list.length === 0) {
      const emptyHtml = `
        <div class="global-roster-empty" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 0.5rem; opacity: 0.4; display: block;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <strong>No faculty members found</strong>
          <p style="margin: 0.35rem 0 0; font-size: 0.8rem;">Try adjusting your search query, department filter, or role chip.</p>
        </div>
      `;
      if (tableWrap) tableWrap.innerHTML = emptyHtml;
      if (cardsWrap) cardsWrap.innerHTML = emptyHtml;
      return;
    }

    const isCurrentUserHod = checkIsHod();

    // ── Desktop Table (>= 769px) ──
    if (tableWrap) {
      tableWrap.innerHTML = `
        <table class="fac-table">
          <thead>
            <tr>
              <th style="width: 38px; text-align: center;">#</th>
              <th>Faculty Member</th>
              <th>Employee ID</th>
              <th>Designation / Role</th>
              <th>Status</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody id="faculty-tbody">
            ${list.map((f, idx) => {
              const targetIsHod = isTargetHod(f);
              const initials = getInitials(f.full_name);
              const cleanName = cleanFacultyDisplayName(f.full_name);
              const teachingLoadCount = f.teaching_load || (Array.isArray(f.classes) ? f.classes.length : (Array.isArray(f.subjects) ? f.subjects.length : 0));
              const roleBadge = targetIsHod
                ? '<span class="fac-role-chip hod">HOD</span>'
                : `<span class="fac-role-chip lecturer">${esc(f.designation || 'Lecturer')}</span>`;
              const status = (f.status || 'ACTIVE').toUpperCase();
              const statusBadge = status === 'ACTIVE'
                ? '<span class="fac-status-indicator active">● Active</span>'
                : `<span class="fac-status-indicator inactive">● ${esc(status)}</span>`;

              return `
                <tr class="fac-table-row" onclick="viewFacultyDetails(${f.id})" style="cursor: pointer;">
                  <td style="color: var(--text-muted); font-size: 0.75rem; text-align: center;">${idx + 1}</td>
                  <td>
                    <div class="fac-member-cell">
                      <div class="fac-avatar ${targetIsHod ? 'hod' : 'lecturer'}" title="${esc(f.full_name)}">${initials}</div>
                      <div class="fac-member-info">
                        <span class="fac-member-link">${esc(cleanName)}</span>
                        ${teachingLoadCount ? `<span class="fac-load-pill">${teachingLoadCount} ${teachingLoadCount === 1 ? 'class' : 'classes'}</span>` : ''}
                      </div>
                    </div>
                  </td>
                  <td class="col-empid"><span class="fac-emp-code mono">${esc(f.employee_id || '—')}</span></td>
                  <td>${roleBadge}</td>
                  <td>${statusBadge}</td>
                  <td onclick="event.stopPropagation()" style="text-align: right; position: relative;">
                    <div class="global-kebab-wrap fac-kebab-wrap" style="display: inline-flex; justify-content: flex-end;">
                      <button type="button" class="global-kebab-btn fac-kebab-btn" aria-label="Faculty options" onclick="toggleFacultyKebabMenu(${f.id}, event)">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="1.5"></circle>
                          <circle cx="12" cy="5" r="1.5"></circle>
                          <circle cx="12" cy="19" r="1.5"></circle>
                        </svg>
                      </button>
                      <div class="global-kebab-menu fac-kebab-menu" id="fac-kebab-menu-table-${f.id}">
                        <button type="button" class="global-kebab-item fac-kebab-item" onclick="viewFacultyDetails(${f.id}, 'view')">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          <span>View Details</span>
                        </button>
                        ${isCurrentUserHod ? `
                          <button type="button" class="global-kebab-item fac-kebab-item" onclick="viewFacultyDetails(${f.id}, 'edit')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <span>Edit Faculty</span>
                          </button>
                        ` : ''}
                        <button type="button" class="global-kebab-item fac-kebab-item" onclick="resetFacultyPassword(${f.id}, '${esc(f.full_name)}')">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                          <span>Reset Password</span>
                        </button>
                        <div class="global-kebab-divider fac-kebab-divider"></div>
                        <button type="button" class="global-kebab-item fac-kebab-item ${status === 'ACTIVE' ? 'warning' : 'primary'}" onclick="toggleFacultySuspendStatus(${f.id}, '${esc(f.full_name)}', '${status}')">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                          <span>${status === 'ACTIVE' ? 'Suspend Faculty' : 'Activate Faculty'}</span>
                        </button>
                        <button type="button" class="global-kebab-item fac-kebab-item danger" onclick="deleteFacultyMember(${f.id}, '${esc(f.full_name)}')">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          <span>Remove Faculty</span>
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

    // ── Mobile Minimal Cards (< 769px) ──
    if (cardsWrap) {
      cardsWrap.innerHTML = list.map(f => {
        const targetIsHod = isTargetHod(f);
        const initial = (f.full_name || 'F').trim().charAt(0).toUpperCase();
        const cleanName = cleanFacultyDisplayName(f.full_name);
        const deptShort = f.department_code || (f.department_name ? f.department_name.split(' ').map(w => w[0]).join('').toUpperCase() : 'DEPT');
        const isInactive = (f.status || 'ACTIVE').toUpperCase() !== 'ACTIVE';

        return `
          <div class="global-mini-card fac-mini-card ${isInactive ? 'fac-card-inactive' : ''}" data-id="${f.id}" onclick="viewFacultyDetails(${f.id})">
            <div class="global-mini-main fac-mini-main">
              <div class="global-mini-avatar fac-mini-avatar ${targetIsHod ? 'hod' : ''}">${initial}</div>
              <div class="global-mini-info fac-mini-info">
                <div class="global-mini-name-row fac-mini-name-row">
                  <span class="global-mini-name fac-mini-name">${esc(cleanName)}</span>
                  ${targetIsHod ? '<span class="global-mini-badge fac-mini-badge hod">HOD</span>' : ''}
                  ${isInactive ? `<span class="global-mini-badge fac-mini-badge suspended">${esc(f.status)}</span>` : ''}
                </div>
                <div class="global-mini-subtext fac-mini-subtext">
                  <span class="fac-dept-code">${esc(deptShort)}</span>
                  <span class="global-sub-dot fac-sub-dot">•</span>
                  <span class="fac-empid-sub mono">${esc(f.employee_id || '—')}</span>
                </div>
              </div>
            </div>
            <div class="global-kebab-wrap fac-kebab-wrap" onclick="event.stopPropagation()">
              <button type="button" class="global-kebab-btn fac-kebab-btn" aria-label="Faculty options" onclick="toggleFacultyKebabMenu(${f.id}, event)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="1.5"></circle>
                  <circle cx="12" cy="5" r="1.5"></circle>
                  <circle cx="12" cy="19" r="1.5"></circle>
                </svg>
              </button>
              <div class="global-kebab-menu fac-kebab-menu" id="fac-kebab-menu-${f.id}">
                <button type="button" class="global-kebab-item fac-kebab-item" onclick="viewFacultyDetails(${f.id}, 'view')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  <span>View Details</span>
                </button>
                ${isCurrentUserHod ? `
                  <button type="button" class="global-kebab-item fac-kebab-item" onclick="viewFacultyDetails(${f.id}, 'edit')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    <span>Edit Faculty</span>
                  </button>
                ` : ''}
                <button type="button" class="global-kebab-item fac-kebab-item" onclick="resetFacultyPassword(${f.id}, '${esc(f.full_name)}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  <span>Reset Password</span>
                </button>
                <div class="fac-kebab-divider" style="height:1px; background:var(--border-color); margin:0.25rem 0;"></div>
                <button type="button" class="global-kebab-item fac-kebab-item ${isInactive ? 'primary' : 'warning'}" onclick="toggleFacultySuspendStatus(${f.id}, '${esc(f.full_name)}', '${f.status}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                  <span>${isInactive ? 'Activate Faculty' : 'Suspend Faculty'}</span>
                </button>
                <button type="button" class="global-kebab-item fac-kebab-item danger" onclick="deleteFacultyMember(${f.id}, '${esc(f.full_name)}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>Remove Faculty</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 5. Render Trash Bin Roster (30-day Retention)
  function renderTrashView() {
    const tableWrap = document.getElementById('faculty-table-wrap');
    const cardsWrap = document.getElementById('faculty-mobile-cards-wrap');

    let list = trashFaculty.slice();

    if (searchQuery) {
      list = list.filter(f => {
        const name = (f.full_name || '').toLowerCase();
        const emp = (f.employee_id || '').toLowerCase();
        const email = (f.email || f.gmail || '').toLowerCase();
        return name.includes(searchQuery) || emp.includes(searchQuery) || email.includes(searchQuery);
      });
    }

    if (list.length === 0) {
      const emptyHtml = `
        <div class="global-roster-empty" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="margin: 0 auto 0.5rem; opacity: 0.4; display: block;">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <strong>No faculty members in Trash</strong>
          <p style="margin: 0.35rem 0 0; font-size: 0.8rem;">Removed faculty records are stored here for 30 days before permanent purging.</p>
        </div>
      `;
      if (tableWrap) tableWrap.innerHTML = emptyHtml;
      if (cardsWrap) cardsWrap.innerHTML = emptyHtml;
      return;
    }

    // ── Desktop Table ──
    if (tableWrap) {
      tableWrap.innerHTML = `
        <table class="fac-table">
          <thead>
            <tr>
              <th style="width: 38px; text-align: center;">#</th>
              <th>Faculty Member</th>
              <th>Employee ID</th>
              <th>Retention Status</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((f, idx) => {
              const initials = getInitials(f.full_name);
              const daysLeft = f.days_left != null ? f.days_left : 30;
              return `
                <tr>
                  <td style="color: var(--text-muted); font-size: 0.75rem; text-align: center;">${idx + 1}</td>
                  <td>
                    <div class="fac-member-cell">
                      <div class="fac-avatar lecturer" style="opacity: 0.85;">${initials}</div>
                      <div class="fac-member-info">
                        <span class="fac-member-name">${esc(f.full_name)}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${esc(f.email || f.gmail || '')}</span>
                      </div>
                    </div>
                  </td>
                  <td class="col-empid"><span class="fac-emp-code mono">${esc(f.employee_id || '—')}</span></td>
                  <td>
                    <span class="badge-retention" style="display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.25rem 0.6rem; border-radius: 999px; background: rgba(239, 68, 68, 0.1); color: var(--status-absent, #ef4444); font-size: 0.75rem; font-weight: 700;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      <span>${daysLeft} days left</span>
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <button type="button" class="btn-restore-compact" onclick="restoreFacultyMember(${f.id}, '${esc(f.full_name)}')" title="Restore faculty data" style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-main); font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                      <span>Restore</span>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    // ── Mobile Cards ──
    if (cardsWrap) {
      cardsWrap.innerHTML = list.map(f => {
        const initial = (f.full_name || 'F').trim().charAt(0).toUpperCase();
        const daysLeft = f.days_left != null ? f.days_left : 30;
        return `
          <div class="global-mini-card fac-mini-card" data-id="${f.id}">
            <div class="global-mini-main fac-mini-main">
              <div class="global-mini-avatar fac-mini-avatar" style="opacity: 0.85;">${initial}</div>
              <div class="global-mini-info fac-mini-info">
                <div class="global-mini-name-row fac-mini-name-row">
                  <span class="global-mini-name fac-mini-name">${esc(f.full_name)}</span>
                </div>
                <div class="global-mini-subtext fac-mini-subtext">
                  <span class="fac-empid-sub mono">${esc(f.employee_id || '—')}</span>
                  <span class="global-sub-dot fac-sub-dot">•</span>
                  <span style="color: var(--status-absent, #ef4444); font-weight: 700;">${daysLeft}d retention left</span>
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="restoreFacultyMember(${f.id}, '${esc(f.full_name)}')" style="padding: 0.35rem 0.65rem; font-size: 0.76rem; font-weight: 600;">
                Restore
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 6. Navigation Actions: Switch to Trash & Filter HODs
  function switchToTrashTab() {
    if (facultyRosterFilter) {
      facultyRosterFilter.setChip('TRASH');
    } else {
      currentFilter = 'TRASH';
      applyFacultyFilters();
    }
  }

  function filterByHodOnly() {
    if (facultyRosterFilter) {
      const nextChip = (facultyRosterFilter.activeChip === 'HOD') ? 'ALL' : 'HOD';
      facultyRosterFilter.setChip(nextChip);
    } else {
      currentFilter = (currentFilter === 'HOD') ? 'ALL' : 'HOD';
      applyFacultyFilters();
    }
  }

  // 7. 3-Dot Kebab Menu Handlers (Delegated directly to shared GlobalRosterFilter)
  function toggleFacultyKebabMenu(teacherId, event) {
    if (typeof window.toggleGlobalKebabMenu === 'function') {
      window.toggleGlobalKebabMenu(teacherId, event);
    }
  }

  function closeAllKebabMenus() {
    if (typeof window.closeAllGlobalKebabMenus === 'function') {
      window.closeAllGlobalKebabMenus();
    }
  }

  function toggleFacultyMenu(event, id) {
    toggleFacultyKebabMenu(id, event);
  }

  // 8. Global Styled Dialog Actions (Universal Password Reset, Remove, Restore)
  async function resetFacultyPassword(id, name) {
    closeAllKebabMenus();
    const cleanName = cleanFacultyDisplayName(name);
    let newPass = null;

    if (typeof window.showStyledPrompt === 'function') {
      newPass = await window.showStyledPrompt({
        title: 'Reset Faculty Password',
        promptLabel: `Enter new credentials for ${cleanName}:`,
        defaultValue: 'Welcome@123',
        promptPlaceholder: 'Enter new password',
        confirmText: 'Reset Password',
        cancelText: 'Cancel',
        variant: 'primary'
      });
    } else {
      newPass = prompt(`Enter new password for ${cleanName}:`, 'Welcome@123');
    }

    if (!newPass) return;

    try {
      const res = await api(`/hod/teachers/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: newPass })
      });
      if (res && res.success) {
        notify(`Password reset successfully for ${cleanName}`, 'success');
      } else {
        throw new Error(res?.error?.message || 'Password reset failed');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function toggleFacultySuspendStatus(id, name, currentStatus) {
    closeAllKebabMenus();
    const cleanName = cleanFacultyDisplayName(name);
    const isCurrentlyActive = (currentStatus || 'ACTIVE').toUpperCase() === 'ACTIVE';
    const newStatus = isCurrentlyActive ? 'INACTIVE' : 'ACTIVE';
    const actionWord = isCurrentlyActive ? 'Suspend' : 'Activate';

    let confirmed = false;
    if (typeof window.showStyledConfirm === 'function') {
      confirmed = await window.showStyledConfirm({
        title: `${actionWord} Faculty Member`,
        message: isCurrentlyActive
          ? `Are you sure you want to suspend <strong>${esc(cleanName)}</strong>? The faculty member will not be able to log in or manage courses until reactivated.`
          : `Reactivate <strong>${esc(cleanName)}</strong>? The faculty member will immediately regain full access to their courses and portal.`,
        confirmText: `${actionWord} Faculty`,
        cancelText: 'Cancel',
        variant: isCurrentlyActive ? 'warning' : 'primary'
      });
    } else {
      confirmed = confirm(`Are you sure you want to ${actionWord.toLowerCase()} ${cleanName}?`);
    }

    if (!confirmed) return;

    try {
      const res = await api(`/hod/teachers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res && res.success) {
        notify(`Faculty member ${cleanName} ${isCurrentlyActive ? 'suspended' : 'activated'} successfully!`, 'success');
        await loadFacultyRoster();
      } else {
        throw new Error(res?.error?.message || `Failed to ${actionWord.toLowerCase()} faculty member`);
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function deleteFacultyMember(id, name) {
    closeAllKebabMenus();
    const cleanName = cleanFacultyDisplayName(name);
    let confirmed = false;

    if (typeof window.showStyledConfirm === 'function') {
      confirmed = await window.showStyledConfirm({
        title: 'Move Faculty to Trash',
        message: `You are removing <strong>${esc(cleanName)}</strong>. The record will be moved to <strong>Trash</strong> with <strong>30-day retention</strong> before permanent purge.`,
        confirmKeyword: 'REMOVE',
        keywordLabel: 'Type <code class="g-confirm-kw-pill danger">REMOVE</code> to confirm:',
        keywordPlaceholder: 'Type REMOVE',
        confirmText: 'Move to Trash',
        cancelText: 'Keep Faculty',
        variant: 'danger'
      });
    } else {
      const val = prompt(`Type "REMOVE" to move ${cleanName} to Trash:`);
      confirmed = (val?.toUpperCase() === 'REMOVE');
    }

    if (!confirmed) return;

    try {
      const res = await api(`/hod/teachers/${id}`, { method: 'DELETE' });
      if (res && res.success) {
        notify(`${cleanName} moved to Trash (30 days retention)`, 'success');
        await Promise.all([loadFacultyRoster(), loadTrashFaculty()]);
      } else {
        throw new Error(res?.error?.message || 'Removal failed');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function restoreFacultyMember(id, name) {
    const cleanName = cleanFacultyDisplayName(name);
    try {
      const res = await api(`/hod/trash/faculty/${id}/restore`, { method: 'POST' });
      if (res && res.success) {
        notify(`${cleanName} restored successfully!`, 'success');
        await Promise.all([loadFacultyRoster(), loadTrashFaculty()]);
      } else {
        throw new Error(res?.error?.message || 'Restore failed');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  // 9. Dynamic GlobalProfileModal View & Edit
  async function viewFacultyDetails(id, mode = 'view') {
    closeAllKebabMenus();
    currentDetailFacultyId = id;

    let f = allFaculty.find(item => Number(item.id) === Number(id));
    const isCurrentUserHod = checkIsHod();

    let detailData = f || { id };
    try {
      const res = await api(`/hod/teachers/${id}`);
      if (res && res.success && res.data) {
        detailData = { ...detailData, ...res.data };
      }
    } catch (err) {
      console.warn('[Faculty] Failed to fetch fresh details:', err.message);
    }

    if (typeof GlobalProfileModal !== 'undefined') {
      const dept = departments.find(d => Number(d.id) === Number(detailData.department_id) || Number(d.id) === Number(detailData.departmentId));
      const deptName = detailData.department_name || (dept ? (dept.name || dept.department_name) : 'Information Technology');
      const deptCode = detailData.department_code || (dept ? (dept.code || dept.department_code) : 'IT');

      GlobalProfileModal.open({
        type: 'FACULTY',
        mode: mode,
        title: 'Faculty Profile',
        data: {
          id: detailData.id,
          name: cleanFacultyDisplayName(detailData.full_name || detailData.name),
          identifierLabel: 'Employee ID',
          identifier: detailData.employee_id || '—',
          email: detailData.email || detailData.gmail || '—',
          phone: detailData.phone || '—',
          departmentLabel: 'Primary Department',
          departmentId: detailData.department_id || (dept ? dept.id : null),
          departmentName: deptName,
          departmentCode: deptCode,
          status: (detailData.status || 'ACTIVE').toUpperCase()
        },
        departments: departments,
        canEdit: isCurrentUserHod,
        canEditDepartment: false,
        onSave: async (updated) => {
          const res = await api(`/hod/teachers/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
              full_name: updated.name,
              employee_id: updated.identifier,
              phone: updated.phone,
              status: updated.status,
              email: detailData.email || detailData.gmail
            })
          });

          if (res && res.success) {
            notify('Faculty profile updated successfully!', 'success');
            await loadFacultyRoster();
          } else {
            throw new Error(res?.error?.message || 'Failed to update faculty profile');
          }
        }
      });
    }
  }

  function closeFacultyDetailsModal() {
    if (typeof GlobalProfileModal !== 'undefined') {
      GlobalProfileModal.close();
    }
    currentDetailFacultyId = null;
  }

  // 10. Add New Faculty Modal
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
        await loadFacultyRoster();
      } else {
        throw new Error(res?.error?.message || 'Failed to add faculty');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  // 11. Event Listeners Setup
  function setupEventListeners() {
    // Hidden compatibility search input
    const legacySearch = document.getElementById('faculty-search');
    if (legacySearch) {
      legacySearch.addEventListener('input', () => {
        searchQuery = legacySearch.value.trim().toLowerCase();
        applyFacultyFilters();
      });
    }

    // Modal Add Form
    const addForm = document.getElementById('form-add-faculty');
    if (addForm) {
      addForm.addEventListener('submit', submitAddFaculty);
    }

    // Outside click dismiss for kebab menus
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.global-kebab-wrap') && !e.target.closest('.fac-kebab-wrap')) {
        closeAllKebabMenus();
      }
    });

    // Escape key dismiss
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllKebabMenus();
        closeAddModal();
        closeFacultyDetailsModal();
      }
    });
  }

  // 12. Global Window Exports
  window.toggleFacultyKebabMenu = toggleFacultyKebabMenu;
  window.toggleFacultyMenu = toggleFacultyMenu;
  window.closeAllKebabMenus = closeAllKebabMenus;
  window.closeAllMenus = closeAllKebabMenus;
  window.viewFacultyDetails = viewFacultyDetails;
  window.openFacultyProfileModal = viewFacultyDetails;
  window.openViewFacultyModal = (id) => viewFacultyDetails(id, 'view');
  window.openEditFacultyModal = (id) => viewFacultyDetails(id, 'edit');
  window.closeFacultyDetailsModal = closeFacultyDetailsModal;
  window.checkIsHod = checkIsHod;
  window.resetFacultyPassword = resetFacultyPassword;
  window.toggleFacultySuspendStatus = toggleFacultySuspendStatus;
  window.deleteFacultyMember = deleteFacultyMember;
  window.openAddFacultyModal = openAddModal;
  window.closeAddFacultyModal = closeAddModal;
  window.switchToTrashTab = switchToTrashTab;
  window.filterByHodOnly = filterByHodOnly;
  window.restoreFacultyMember = restoreFacultyMember;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
