/**
 * ══════════════════════════════════════════════════════════════
 * PAGE: COURSEWORK & ASSIGNMENTS (frontend/faculty/assignments/assignments.js)
 * Clean Modular JavaScript with Event Listeners & Zero Inline Handlers
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  guardRoute({ roles: ['TEACHER'], requireSubjects: true });

  let allRegisters = [];
  let currentRegisterId = null;
  let registerData = null;
  let currentRegisterAssignments = [];
  let pendingDeleteId = null;

  const escapeHtml = window.escapeHtml || (typeof esc !== 'undefined' ? esc : (s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')));

  function getRegisterQueryParams() {
    if (!registerData) return '';
    const params = new URLSearchParams();
    if (registerData.subject_id) params.set('subject_id', registerData.subject_id);
    if (registerData.department_id) params.set('department_id', registerData.department_id);
    if (registerData.year) params.set('year', registerData.year);
    if (registerData.semester) params.set('semester', registerData.semester);
    if (registerData.branch_id) params.set('branch_id', registerData.branch_id);
    if (registerData.academic_year_id) params.set('academic_year_id', registerData.academic_year_id);
    if (currentRegisterId) params.set('register_id', currentRegisterId);
    return params.toString();
  }

  async function loadRegistersList() {
    try {
      const res = await fetchApi('/faculty/registers');
      if (res.success) {
        allRegisters = res.data || [];
        const selectEl = document.getElementById('assignment-switcher-select');
        const listEl = document.getElementById('register-assignments-list');
        if (!selectEl) return;

        if (!allRegisters.length) {
          selectEl.innerHTML = '<option value="">No teaching registers assigned</option>';
          if (listEl) {
            listEl.innerHTML = `
              <div class="assignments-empty-card">
                <div class="empty-card-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                </div>
                <h3 class="empty-card-title">No Assigned Registers</h3>
                <p class="empty-card-desc">No teaching classes or subjects have been assigned to your profile yet.</p>
              </div>
            `;
          }
          return;
        }

        selectEl.innerHTML = allRegisters.map((r) => {
          const yr = r.year ? `Year ${r.year}` : '';
          const sem = r.semester ? `Sem ${r.semester}` : '';
          const sec = r.section ? `Sec ${r.section}` : '';
          const cohortInfo = [yr, sem, sec].filter(Boolean).join(' • ');
          const label = `${r.subject_name || r.name} [${r.subject_code || 'SUBJ'}] (${r.type || 'THEORY'} • ${r.department_name || 'Dept'}${cohortInfo ? ' • ' + cohortInfo : ''})`;
          return `<option value="${r.id}">${escapeHtml(label)}</option>`;
        }).join('');

        // Read ?id= from URL or default to first register
        const u = new URL(window.location.href);
        const requestedId = u.searchParams.get('id');
        const matched = allRegisters.find((r) => String(r.id) === String(requestedId));
        const targetId = matched ? matched.id : allRegisters[0].id;
        selectEl.value = targetId;
        await selectRegister(targetId);
      }
    } catch (err) {
      console.error('Failed to load registers list:', err);
    }
  }

  async function onRegisterSelectChange(regId) {
    if (!regId) return;
    const u = new URL(window.location.href);
    u.searchParams.set('id', regId);
    window.history.replaceState(null, '', u.toString());
    await selectRegister(regId);
  }

  async function selectRegister(regId) {
    currentRegisterId = regId;
    try {
      const res = await fetchApi(`/faculty/registers/${regId}`);
      if (res.success) {
        registerData = res.data.register;
        updateHeaderMeta(registerData);
        updateNavLinks(regId);
        await loadRegisterAssignments();
      }
    } catch (err) {
      console.error('Error selecting register:', err);
    }
  }

  function updateNavLinks(regId) {
    const setHref = (id, url) => {
      const el = document.getElementById(id);
      if (el) el.href = `${url}?id=${regId}`;
    };
    setHref('link-to-register', '/faculty/registers.html');
    setHref('link-to-tests', '/faculty/tests.html');
    setHref('btn-quick-matrix', '/faculty/registers.html');
    setHref('btn-quick-tests', '/faculty/tests.html');
    setHref('btn-quick-eval', '/faculty/evaluation.html');
    setHref('nav-eval', '/faculty/evaluation.html');
  }

  function updateHeaderMeta(reg) {
    if (!reg) return;
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    setText('meta-subject-name', `${reg.subject_name || reg.name} (${reg.subject_code || '—'})`);
    setText('meta-class-name', `${reg.department_name || 'Dept'} • Year ${reg.year || 1} Sem ${reg.semester || 1}`);
    setText('meta-session-name', reg.academic_year_label || '2026-27 (Odd Semester)');
    setText('meta-cohort-size', reg.enrolled_count || '0');
    setText('modal-assign-scope-text', `${reg.subject_name || reg.name} [${reg.subject_code || ''}] • Year ${reg.year || 1} Sem ${reg.semester || 1}`);
  }

  async function loadRegisterAssignments() {
    const container = document.getElementById('register-assignments-list');
    if (!container) return;
    if (!registerData) {
      container.innerHTML = `<div class="assignments-loading-card">Please select a subject register first.</div>`;
      return;
    }
    container.innerHTML = `<div class="assignments-loading-card">Loading assignments for ${escapeHtml(registerData.subject_name || 'subject')}...</div>`;

    try {
      const q = getRegisterQueryParams();
      const res = await fetchApi(`/assignments?${q}`);
      if (!res.success || !Array.isArray(res.data) || !res.data.length) {
        container.innerHTML = `
          <div class="assignments-empty-card">
            <div class="empty-card-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </div>
            <h3 class="empty-card-title">No Assignments Created Yet</h3>
            <p class="empty-card-desc">No homework or coursework tasks have been published for <strong>${escapeHtml(registerData.subject_name || 'this subject')}</strong>.</p>
            <button type="button" class="btn btn-primary btn-sm btn-create-empty-trigger">+ Create Assignment</button>
          </div>
        `;
        const b = document.getElementById('badge-assignments-count');
        if (b) b.innerText = '0';
        const emptyBtn = container.querySelector('.btn-create-empty-trigger');
        if (emptyBtn) emptyBtn.addEventListener('click', openCreateAssignmentModal);
        return;
      }

      currentRegisterAssignments = res.data;
      const b = document.getElementById('badge-assignments-count');
      if (b) b.innerText = currentRegisterAssignments.length;

      container.innerHTML = currentRegisterAssignments.map((a) => {
        const dtStr = a.due_date ? new Date(a.due_date).toLocaleDateString('en-IN') : 'No due date';
        const subCount = a.submissions_count || 0;
        const classSize = a.class_size || (registerData.enrolled_count || 0);
        return `
          <div class="item-card assignment-card" data-assignment-id="${a.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <div class="item-title">${escapeHtml(a.title)} <span style="font-weight:500; color:var(--text-muted); font-size:0.85rem;">(Max: ${a.max_marks} marks)</span></div>
                <div class="item-meta">
                  ${escapeHtml(a.subject_name || registerData.subject_name || 'Subject')} • Due: <strong>${dtStr}</strong>
                </div>
                ${a.description ? `<p style="font-size:0.82rem; color:var(--text-main); margin:0.45rem 0 0 0; line-height:1.4;">${escapeHtml(a.description)}</p>` : ''}
                ${a.attachment_path ? `<div style="margin-top:0.35rem;"><a class="file-link" href="${a.attachment_path}" target="_blank"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg> ${escapeHtml(a.original_filename || 'Download Attached File')}</a></div>` : ''}
              </div>
              <div style="text-align: right;">
                <span class="badge ${subCount > 0 ? 'badge-present' : 'badge-pending'}">
                  ${subCount} / ${classSize} Submitted
                </span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.85rem; gap: 0.5rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary btn-sm btn-toggle-submissions" data-id="${a.id}">View Submissions / Grade</button>
              <button type="button" class="card-danger-btn btn-delete-assignment" data-id="${a.id}">Delete</button>
            </div>
            <div class="expand-panel" id="assign-panel-${a.id}"></div>
          </div>
        `;
      }).join('');

      // Attach event listeners to card action buttons
      container.querySelectorAll('.btn-toggle-submissions').forEach((btn) => {
        btn.addEventListener('click', () => toggleSubmissions(btn.getAttribute('data-id')));
      });
      container.querySelectorAll('.btn-delete-assignment').forEach((btn) => {
        btn.addEventListener('click', () => openDeleteModal('assignment', btn.getAttribute('data-id')));
      });
    } catch (err) {
      console.error(err);
      container.innerHTML = `<div class="assignments-loading-card" style="color:var(--status-absent);">Failed to load assignments: ${err.message}</div>`;
    }
  }

  function onAssignNumChange(val) {
    const titleInp = document.getElementById('assign-title');
    if (!titleInp) return;
    if (val && val !== 'CUSTOM') {
      const curVal = titleInp.value.trim();
      if (!curVal || /^Assignment\s*\d+/i.test(curVal)) {
        titleInp.value = `Assignment ${val}`;
      }
    }
  }

  function openCreateAssignmentModal() {
    if (currentRegisterId) {
      window.location.href = `/faculty/classwork/create.html?type=assignment&register=${encodeURIComponent(currentRegisterId)}`;
      return;
    }
    if (!registerData) {
      if (typeof showToast === 'function') showToast('Please select a subject register first', 'error');
      return;
    }
    openModal('create-assignment-modal');
  }

  async function submitRegisterAssignment(e) {
    e.preventDefault();
    if (!registerData) {
      if (typeof showToast === 'function') showToast('Please select a subject register first', 'error');
      return;
    }

    const saveBtn = document.getElementById('btn-save-assignment');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerText = 'Publishing...'; }

    const numVal = document.getElementById('assign-num-select')?.value || '1';
    let title = document.getElementById('assign-title').value.trim();
    if (numVal !== 'CUSTOM' && !/^(?:Assignment|Assign|A)\s*\d+/i.test(title)) {
      title = `Assignment ${numVal}: ${title}`;
    }

    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', document.getElementById('assign-instructions').value.trim());
    fd.append('due_date', document.getElementById('assign-due-date').value || '');
    fd.append('max_marks', document.getElementById('assign-max-marks').value || 25);
    fd.append('subject_id', registerData.subject_id);
    fd.append('department_id', registerData.department_id);
    if (registerData.branch_id) fd.append('branch_id', registerData.branch_id);
    fd.append('year', registerData.year || 1);
    fd.append('semester', registerData.semester || 1);
    if (registerData.academic_year_id) fd.append('academic_year_id', registerData.academic_year_id);

    const fileInput = document.getElementById('assign-file');
    if (fileInput && fileInput.files[0]) {
      fd.append('attachment', fileInput.files[0]);
    }

    try {
      const res = await fetchApi('/assignments', {
        method: 'POST',
        body: fd
      });
      if (res.success) {
        if (typeof showToast === 'function') showToast('Assignment published successfully!', 'success');
        document.getElementById('create-assignment-form').reset();
        closeModal('create-assignment-modal');
        loadRegisterAssignments();
      } else {
        if (typeof showToast === 'function') showToast(res.error?.message || 'Could not publish assignment', 'error');
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast('Failed to publish assignment: ' + err.message, 'error');
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = 'Publish Assignment'; }
    }
  }

  async function toggleSubmissions(id) {
    const panel = document.getElementById(`assign-panel-${id}`);
    if (!panel) return;
    if (panel.classList.contains('open')) {
      panel.classList.remove('open');
      return;
    }
    panel.classList.add('open');
    panel.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">Loading student submissions...</div>';

    try {
      const res = await fetchApi(`/assignments/${id}/submissions`);
      if (!res.success) {
        panel.innerHTML = '<div style="color:var(--status-absent); padding:1rem;">Could not load submissions roster.</div>';
        return;
      }

      const roster = res.data.roster || [];
      if (!roster.length) {
        panel.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">No enrolled students in this register cohort roster.</div>';
        return;
      }

      panel.innerHTML = `
        <div style="overflow-x: auto; margin-top:0.75rem;">
          <table class="data-subtable">
            <thead>
              <tr>
                <th style="width: 65px;">Roll No</th>
                <th style="width: 130px;">UBTER Reg No</th>
                <th>Student Full Name</th>
                <th style="width: 140px;">Uploaded File</th>
                <th style="width: 100px;">Status</th>
                <th style="width: 130px;">Score</th>
                <th style="width: 90px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${roster.map((r) => `
                <tr>
                  <td style="font-weight: 700;">${String(r.class_roll_no || '—').replace(/^#/, '')}</td>
                  <td style="font-family: var(--font-family-mono); font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(r.registration_no || r.official_enrollment_no || '—')}</td>
                  <td style="font-weight: 600;">${escapeHtml(r.full_name)}</td>
                  <td>
                    ${r.file_path ? `<a class="file-link" href="${r.file_path}" target="_blank"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> ${escapeHtml(r.original_filename || 'Download')}</a>` : '<span style="color:var(--text-muted);">None</span>'}
                  </td>
                  <td><span class="status-tag ${r.status || 'MISSING'}">${r.status || 'MISSING'}</span></td>
                  <td>
                    ${r.submission_id ? `<input type="number" class="grade-input" id="marks-${r.submission_id}" value="${r.marks_obtained ?? ''}" placeholder="—">` : '<span style="color:var(--text-muted);">—</span>'}
                  </td>
                  <td style="text-align: right;">
                    ${r.submission_id ? `<button type="button" class="btn btn-primary btn-sm btn-grade-submission" data-sub-id="${r.submission_id}">Grade</button>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      panel.querySelectorAll('.btn-grade-submission').forEach((btn) => {
        btn.addEventListener('click', () => saveGrade(btn.getAttribute('data-sub-id')));
      });
    } catch (err) {
      panel.innerHTML = '<div style="color:var(--status-absent); padding:1rem;">Error fetching submissions.</div>';
    }
  }

  async function saveGrade(submissionId) {
    const inputEl = document.getElementById(`marks-${submissionId}`);
    const marksVal = inputEl ? inputEl.value : '';
    try {
      const res = await fetchApi(`/assignments/submissions/${submissionId}/grade`, {
        method: 'PUT',
        body: JSON.stringify({ marks_obtained: marksVal === '' ? null : Number(marksVal) })
      });
      if (res.success) {
        if (typeof showToast === 'function') showToast('Grade saved successfully!', 'success');
      } else {
        if (typeof showToast === 'function') showToast(res.error?.message || 'Could not save grade', 'error');
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast('Failed to save grade', 'error');
    }
  }

  function openDeleteModal(type, id) {
    pendingDeleteId = id;
    openModal('delete-modal');
  }

  async function executeDelete() {
    if (!pendingDeleteId) return;
    const btn = document.getElementById('btn-confirm-delete');
    if (btn) { btn.disabled = true; btn.innerText = 'Deleting...'; }
    try {
      const res = await fetchApi(`/assignments/${pendingDeleteId}`, { method: 'DELETE' });
      if (res.success) {
        if (typeof showToast === 'function') showToast('Assignment deleted successfully', 'success');
        closeModal('delete-modal');
        loadRegisterAssignments();
      } else {
        if (typeof showToast === 'function') showToast(res.error?.message || 'Could not delete assignment', 'error');
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast('Delete failed: ' + err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = 'Delete Assignment'; }
      pendingDeleteId = null;
    }
  }

  // Initialize Page Event Listeners
  document.addEventListener('DOMContentLoaded', () => {
    loadRegistersList();

    const switcher = document.getElementById('assignment-switcher-select');
    if (switcher) {
      switcher.addEventListener('change', (e) => onRegisterSelectChange(e.target.value));
    }

    const openCreateBtn = document.getElementById('btn-open-create-assignment');
    if (openCreateBtn) {
      openCreateBtn.addEventListener('click', openCreateAssignmentModal);
    }

    const createForm = document.getElementById('create-assignment-form');
    if (createForm) {
      createForm.addEventListener('submit', submitRegisterAssignment);
    }

    const assignNumSelect = document.getElementById('assign-num-select');
    if (assignNumSelect) {
      assignNumSelect.addEventListener('change', (e) => onAssignNumChange(e.target.value));
    }

    const cancelCreateBtn = document.getElementById('btn-cancel-create');
    if (cancelCreateBtn) {
      cancelCreateBtn.addEventListener('click', () => closeModal('create-assignment-modal'));
    }

    const cancelDeleteBtn = document.getElementById('btn-cancel-delete');
    if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener('click', () => closeModal('delete-modal'));
    }

    const confirmDeleteBtn = document.getElementById('btn-confirm-delete');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', executeDelete);
    }
  });

  // Expose necessary functions globally for compatibility
  window.loadRegisterAssignments = loadRegisterAssignments;
  window.openCreateAssignmentModal = openCreateAssignmentModal;
})();
