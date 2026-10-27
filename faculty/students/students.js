/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: STUDENTS
 * frontend/faculty/students/students.js
 * ══════════════════════════════════════════════════════════════
 */

// Enforce role-based access for department faculty and HODs
    if (typeof guardRoute === 'function') {
      guardRoute({ roles: ['TEACHER'], requireDepartmentFaculty: true });
    }
    
    // Transparent apiFetch fallback
    if (typeof window.apiFetch === 'undefined') {
      window.apiFetch = (endpoint, options) => typeof apiRequest === 'function' 
        ? apiRequest(endpoint, options) 
        : fetchApi(endpoint.replace(/^\/api\/v1/, ''), options);
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
      const el = document.getElementById(id);
      if (!el) return;
      el.style.display = 'flex';
      el.classList.add('open');
    }
    function hideModal(id) {
      if (window.closeModal) window.closeModal(id);
      else {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('open'); el.style.display = 'none'; }
      }
    }
    function closeModal(id) { hideModal(id); }

    // Main Workspace Tab Switching

    // Main Workspace Tab Switching
    function showMainTab(tab) {
      const isTeachers = tab === 'teachers';
      const isRoster = tab === 'roster';
      const isPending = tab === 'pending';

      document.getElementById('tab-teachers-panel').style.display = isTeachers ? 'block' : 'none';
      document.getElementById('tab-roster-panel').style.display = isRoster ? 'block' : 'none';
      document.getElementById('tab-pending-panel').style.display = isPending ? 'block' : 'none';

      document.getElementById('tab-teachers-btn').className = isTeachers ? 'workspace-tab-btn active' : 'workspace-tab-btn';
      document.getElementById('tab-roster-btn').className = isRoster ? 'workspace-tab-btn active' : 'workspace-tab-btn';
      document.getElementById('tab-pending-btn').className = isPending ? 'workspace-tab-btn active' : 'workspace-tab-btn';

      if (isTeachers) {
        loadTeachers();
        loadPendingFaculty();
      } else if (isPending) {
        loadPendingRegistrations();
      } else if (isRoster) {
        loadStudents();
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
        currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        isHod = Boolean(currentUser && (currentUser.is_hod));

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
          const notice = document.getElementById('faculty-provision-notice');
          if (notice) notice.style.display = 'inline-block';
        }

        // Load Department Hierarchy
        try {
          const hRes = await apiFetch(`${API}/hierarchy`);
          if (hRes && hRes.data) {
            currentDeptId = hRes.data.department_id || hRes.data.id;
            currentDeptCode = hRes.data.department_code || hRes.data.code || 'IT';
            const deptName = hRes.data.department_name || hRes.data.name || 'Department';
            document.getElementById('dept-header-name').textContent = `${deptName} — Portal`;
            document.getElementById('dept-subtitle').textContent = `Directory for ${deptName}: faculty members, student enrollment, and progression.`;
            const codeLbl = document.getElementById('promo-dept-code-label');
            if (codeLbl) codeLbl.textContent = currentDeptCode;
          }
        } catch (_) {}

        // Load Cohorts & Teachers
        await loadCohorts();
        await loadTeachers();
        await loadFacultyRegistrationStatus();
        await updateRegistrationStatusBadge();

        // Check URL tab parameter or default to roster
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        if (tabParam === 'teachers' || tabParam === 'faculty' || window.location.pathname.includes('hod-teachers')) {
          showMainTab('teachers');
        } else if (tabParam === 'pending' || tabParam === 'approvals') {
          showMainTab('pending');
        } else {
          showMainTab('roster');
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
        allTeachers = res?.data || [];
        renderTeachers(allTeachers);
        document.getElementById('stat-teachers-count').textContent = allTeachers.length;
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
          ? `<span class="badge" style="background: var(--chip-hod-bg); color: var(--color-primary); font-weight: 700;">Head of Department</span>`
          : `<span class="badge" style="background: var(--bg-surface-secondary); color: var(--text-main); font-weight: 600;">Faculty Member</span>`;

        return `
          <div class="teacher-card">
            <div>
              <div class="tc-header">
                <div style="display: flex; gap: 0.75rem; align-items: center;">
                  <div class="tc-avatar">${initials}</div>
                  <div>
                    <div class="tc-name">${esc(t.full_name)}</div>
                    ${t.employee_id ? `<div class="tc-empid">EMP: ${esc(t.employee_id)}</div>` : ''}
                  </div>
                </div>
                <div>${roleBadge}</div>
              </div>

              <div class="tc-meta">
                <div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> <span style="font-family: monospace; color: var(--text-main);">${esc(t.gmail || t.email)}</span></div>
                ${t.phone ? `<div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> <span>${esc(t.phone)}</span></div>` : ''}
                <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--status-present);margin-right:6px;"></span> Account: <span style="font-weight: 600; color: var(--status-present);">${esc(t.status || 'ACTIVE')}</span></div>
              </div>
            </div>

            ${isHod ? `
              <div style="display: flex; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.5rem; justify-content: flex-end;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="openResetModal(${t.id}, '${esc(t.full_name)}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="M21 2l-9.6 9.6M15.5 7.5l2.5 2.5M18.5 4.5l2.5 2.5"></path></svg> Reset Password</button>
                <button type="button" class="btn btn-secondary btn-sm" style="color: var(--status-absent);" onclick="openDeleteModal(${t.id}, '${esc(t.full_name)}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Remove</button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    }

    function filterTeachers(query) {
      const q = (query || '').toLowerCase().trim();
      if (!q) {
        renderTeachers(allTeachers);
        return;
      }
      const filtered = allTeachers.filter(t => 
        (t.full_name || '').toLowerCase().includes(q) ||
        (t.gmail || t.email || '').toLowerCase().includes(q) ||
        (t.employee_id || '').toLowerCase().includes(q)
      );
      renderTeachers(filtered);
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
      if (qBadge) {
        if (isFacultyRegOpen) {
          qBadge.innerHTML = 'OPEN (Accepting)';
          qBadge.style.background = 'var(--status-present-bg)';
          qBadge.style.color = 'var(--status-present)';
        } else {
          qBadge.innerHTML = 'CLOSED (Blocked)';
          qBadge.style.background = 'var(--chip-admin-bg)';
          qBadge.style.color = 'var(--status-absent)';
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
      const card = document.getElementById('pending-faculty-card');
      const wrap = document.getElementById('pending-faculty-wrap');
      const badge = document.getElementById('pending-faculty-badge');
      const tabBadge = document.getElementById('pending-faculty-badge-tab');
      if (!card || !wrap) return;

      try {
        const res = await apiFetch(`${API}/faculty-registrations/pending`);
        const list = res?.data || [];

        if (list.length === 0) {
          card.style.display = 'none';
          if (tabBadge) tabBadge.style.display = 'none';
          return;
        }

        card.style.display = 'block';
        if (badge) badge.textContent = `${list.length} Pending`;
        if (tabBadge) {
          tabBadge.textContent = list.length;
          tabBadge.style.display = 'inline-block';
        }

        wrap.innerHTML = `
          <table class="table" style="width: 100%; margin: 0;">
            <thead>
              <tr style="background: var(--table-th-bg);">
                <th style="padding: 0.5rem 0.75rem;">Applicant Name</th>
                <th style="padding: 0.5rem 0.75rem;">Institutional Gmail</th>
                <th style="padding: 0.5rem 0.75rem;">Phone</th>
                <th style="padding: 0.5rem 0.75rem; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(f => `
                <tr>
                  <td style="padding: 0.5rem 0.75rem; font-weight: 600;">${esc(f.full_name)}</td>
                  <td style="padding: 0.5rem 0.75rem; font-family: monospace;">${esc(f.email)}</td>
                  <td style="padding: 0.5rem 0.75rem;">${esc(f.phone || '—')}</td>
                  <td style="padding: 0.5rem 0.75rem; text-align: right;">
                    <button class="btn btn-primary btn-sm" onclick="approveFaculty(${f.id}, '${esc(f.full_name)}')">Approve</button>
                    <button class="btn btn-secondary btn-sm" style="color: var(--status-absent);" onclick="rejectFaculty(${f.id})">Reject</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } catch (err) {
        console.warn('Failed to load pending faculty registrations:', err);
      }
    }

    async function approveFaculty(id, name) {
      if (!confirm(`Approve teacher registration for ${name}?`)) return;
      try {
        await apiFetch(`${API}/faculty-registrations/${id}/adjudicate`, {
          method: 'POST',
          body: JSON.stringify({ action: 'APPROVE' })
        });
        showToast(`Approved teacher ${name}!`, 'success');
        loadPendingFaculty();
        loadTeachers();
      } catch (err) {
        showToast(err.message || 'Failed to approve teacher.', 'error');
      }
    }

    async function rejectFaculty(id) {
      const reason = prompt('Enter rejection reason:');
      if (!reason) return;
      try {
        await apiFetch(`${API}/faculty-registrations/${id}/adjudicate`, {
          method: 'POST',
          body: JSON.stringify({ action: 'REJECT', rejection_reason: reason })
        });
        showToast('Registration rejected.', 'info');
        loadPendingFaculty();
      } catch (err) {
        showToast(err.message || 'Failed to reject registration.', 'error');
      }
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
      targetTeacherId = id;
      document.getElementById('del-name').textContent = name;
      document.getElementById('del-confirm-input').value = '';
      document.getElementById('del-btn').disabled = true;
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
        allCohorts = res?.data || [];
        const select = document.getElementById('cohort-select');
        select.innerHTML = '<option value="">All Department Cohorts</option>';

        allCohorts.forEach(c => {
          const opt = document.createElement('option');
          opt.value = `${c.department_id}_${c.year}_${c.semester}`;
          opt.textContent = `${c.department_name || 'Dept'} • Year ${c.year} Sem ${c.semester}`;
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
        if (quickBadge) {
          if (isDeptRegOpen) {
            quickBadge.textContent = 'OPEN (ALL SEMESTERS)';
            quickBadge.style.background = 'var(--status-present-bg)';
            quickBadge.style.color = 'var(--status-present)';
          } else {
            quickBadge.textContent = 'CLOSED (BLOCKED)';
            quickBadge.style.background = 'var(--chip-admin-bg)';
            quickBadge.style.color = 'var(--status-absent)';
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

      const qStr = queryParams.length ? '?' + queryParams.join('&') : '';

      try {
        const endpoint = isHod ? `${API}/students${qStr}` : `/students${qStr}`;
        const res = await apiFetch(endpoint);
        allStudents = res?.data || [];
        renderStudents(allStudents);
      } catch (err) {
        console.error('Failed to load students:', err);
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--status-absent);">Failed to load student roster.</td></tr>`;
      }
    }

    function renderStudents(students) {
      const tbody = document.getElementById('students-tbody');
      const countLabel = document.getElementById('table-count-label');

      // Update Top Stats
      const totalStudents = students.length;
      const activeAccounts = students.filter(s => s.user_status === 'ACTIVE' || s.status === 'ENROLLED' || s.status === 'ACTIVE').length;
      const googleCount = students.filter(s => s.google_linked).length;

      document.getElementById('stat-total').textContent = totalStudents;
      document.getElementById('stat-active').textContent = activeAccounts;
      document.getElementById('stat-google').textContent = googleCount;
      if (countLabel) countLabel.textContent = `Showing ${totalStudents} students`;

      if (totalStudents === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No students found matching current filters.</td></tr>`;
        return;
      }

      tbody.innerHTML = students.map(s => {
        const rollDisplay = s.class_roll_no ? `<span style="font-weight: 700; color: var(--color-primary);">${s.class_roll_no}</span>` : '<span style="color: var(--text-muted);">—</span>';
        const ubterDisplay = s.ubter_reg_no ? `<span style="font-family: monospace; font-size: 0.85rem;">${esc(s.ubter_reg_no)}</span>` : '<span style="color: var(--text-muted);">—</span>';
        const enrollDisplay = `<span style="font-family: monospace; font-weight: 600; color: var(--text-main); font-size: 0.85rem;">${esc(s.official_enrollment_no)}</span>`;
        const bioDisplay = s.biometric_slot ? `<span class="badge" style="background: var(--bg-surface-secondary); color: var(--text-main);">Slot #${s.biometric_slot}</span>` : '<span style="color: var(--text-muted); font-size: 0.8rem;">Unassigned</span>';
        const googleDisplay = s.google_linked ? `<span title="Google Linked" style="color: var(--color-primary); font-weight: 700;">Linked</span>` : '<span style="color: var(--text-muted);">No</span>';
        
        const statusBadge = (s.status === 'DETAINED')
          ? `<span class="badge" style="background: var(--status-absent-bg); color: var(--status-absent); font-weight: 700;">DETAINED</span>`
          : (s.status === 'COMPLETED' || s.status === 'GRADUATED'
              ? `<span class="badge" style="background: var(--chip-hod-bg); color: var(--color-primary); font-weight: 700;">ALUMNI</span>`
              : `<span class="badge" style="background: var(--status-present-bg); color: var(--status-present); font-weight: 700;">ENROLLED</span>`);

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
            <td style="padding: 0.75rem 1rem;">${bioDisplay}</td>
            <td style="padding: 0.75rem 1rem;">${statusBadge}</td>
            <td style="padding: 0.75rem 1rem; font-size: 0.85rem;">${googleDisplay}</td>
            <td style="padding: 0.75rem 1rem; text-align: right;">
              <div style="display: inline-flex; gap: 0.35rem; align-items: center;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="openStudentDossier(${s.id})" title="View Student Academic Dossier &amp; Vault" style="font-weight: 600; font-size: 0.8rem; padding: 0.25rem 0.6rem;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> Dossier
                </button>
                ${isHod ? `
                  <button type="button" class="btn btn-secondary btn-sm" onclick="openResetStudentModal(${s.id}, '${esc(s.full_name)}')" title="Reset Password"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="M21 2l-9.6 9.6M15.5 7.5l2.5 2.5M18.5 4.5l2.5 2.5"></path></svg></button>
                  <button type="button" class="btn btn-secondary btn-sm" style="color: var(--status-absent);" onclick="openDeleteStudentModal(${s.id}, '${esc(s.full_name)}')" title="Withdraw Student">Withdraw</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
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
      document.getElementById('promotion-form').reset();
      document.getElementById('promo-confirm-code').value = '';
      selectedStudentIds.clear();
      loadPromotionPreview();
      showModal('promotion-modal');
    }

    async function loadPromotionPreview() {
      const box = document.getElementById('promotion-preview-box');
      const action = document.getElementById('promo-action').value;
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
                    const decisionTag = isChecked
                      ? `<span class="badge badge-present" style="font-size: 0.68rem; padding: 0.2rem 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem;">${window.getSvgIcon('check', 11)} Pass &bull; ${isGrad ? 'Graduate' : 'Promote'}</span>`
                      : `<span class="badge badge-absent" style="font-size: 0.68rem; padding: 0.2rem 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem;">${window.getSvgIcon('close', 11)} Retain in Sem ${sem}</span>`;

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
      const filterVal = document.getElementById('promo-cohort-filter').value;
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
      const submitBtn = document.getElementById('promo-submit-btn');
      if (!currentPromotionData) return;

      const total = currentPromotionData.total_students || 0;
      const selected = selectedStudentIds.size;
      const unselected = Math.max(0, total - selected);

      if (badge) {
        badge.innerHTML = `<strong>${selected}</strong> Passed &bull; <strong>${unselected}</strong> Retained (of ${total} total)`;
      }
      if (submitBtn) {
        submitBtn.innerHTML = `Execute Progression (${selected} Passed) &rarr;`;
      }
    }

    async function executePromotion(e) {
      e.preventDefault();
      const btn = document.getElementById('promo-submit-btn');
      btn.disabled = true;

      const action = document.getElementById('promo-action').value;
      const confirm_code = document.getElementById('promo-confirm-code').value.trim().toUpperCase();

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
        showToast(err.message || 'Safety code verification failed.', 'error');
      } finally {
        btn.disabled = false;
      }
    }

    function openReindexModal() {
      if (selectedCohort) {
        document.getElementById('reindex-year').value = selectedCohort.year;
        document.getElementById('reindex-sem').value = selectedCohort.semester;
      }
      showModal('reindex-modal');
    }

    async function submitReindex(e) {
      e.preventDefault();
      const year = parseInt(document.getElementById('reindex-year').value);
      const semester = parseInt(document.getElementById('reindex-sem').value);

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
      targetStudentId = id;
      document.getElementById('del-student-name').textContent = name;
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
      const badge = document.getElementById('pending-badge');
      const statBadge = document.getElementById('stat-pending');

      try {
        const res = await apiFetch('/students/registrations/pending');
        const list = res?.data || [];

        if (badge) {
          badge.textContent = list.length;
          badge.style.display = list.length > 0 ? 'inline-block' : 'none';
        }
        if (statBadge) statBadge.textContent = list.length;
        document.getElementById('pending-count-label').textContent = `${list.length} requests pending`;

        if (list.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No pending student registrations.</td></tr>`;
          return;
        }

        tbody.innerHTML = list.map(r => `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.75rem 1rem; font-weight: 600;">${esc(r.full_name)}</td>
            <td style="padding: 0.75rem 1rem; font-family: monospace;">${esc(r.official_enrollment_no || r.enrollment_no)}</td>
            <td style="padding: 0.75rem 1rem; font-family: monospace; font-size: 0.85rem;">${esc(r.email)}</td>
            <td style="padding: 0.75rem 1rem; font-size: 0.85rem;">${esc(r.department_name || 'IT')} Y${r.year} S${r.semester}</td>
            <td style="padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--text-muted);">${new Date(r.registered_at || r.created_at || Date.now()).toLocaleDateString()}</td>
            <td style="padding: 0.75rem 1rem; text-align: right;">
              <button class="btn btn-primary btn-sm" onclick="openApproveModal(${r.student_id || r.id}, '${esc(r.full_name)}', '${esc(r.official_enrollment_no || r.enrollment_no)}')">Approve</button>
              <button class="btn btn-secondary btn-sm" style="color: var(--status-absent);" onclick="openRejectModal(${r.student_id || r.id}, '${esc(r.full_name)}')">Reject</button>
            </td>
          </tr>
        `).join('');
      } catch (err) {
        console.error('Failed to load pending registrations:', err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--status-absent);">Failed to load pending registrations queue.</td></tr>`;
      }
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
        loadPendingRegistrations();
        loadStudents();
      } catch (err) {
        showToast(err.message || 'Failed to approve student.', 'error');
      }
    }

    function openRejectModal(id, name) {
      targetRegId = id;
      document.getElementById('reject-name').textContent = name;
      document.getElementById('reject-reason').value = '';
      showModal('reject-modal');
    }

    async function submitRejectRegistration(e) {
      e.preventDefault();
      const reason = document.getElementById('reject-reason').value.trim();
      try {
        await apiFetch(`/students/registrations/${targetRegId}/adjudicate`, {
          method: 'POST',
          body: JSON.stringify({ action: 'REJECT', rejection_reason: reason })
        });
        showToast('Registration rejected.', 'info');
        closeModal('reject-modal');
        loadPendingRegistrations();
      } catch (err) {
        showToast(err.message || 'Failed to reject registration.', 'error');
      }
    }

