/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: ACADEMIC-STRUCTURE
 * frontend/admin/academic-structure/academic-structure.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['SYSTEM_ADMIN']);

    let allDepartments = [];
    let hodInfoMap = {};
    let currentSessionData = null;

    // ─── Bootstrap ────────────────────────────────────────────
    async function init() {
      await Promise.all([loadAllData(), loadSessionStatus()]);
    }

    // ─── Load Session Automation Status ───────────────────────
    async function loadSessionStatus() {
      try {
        const res = await fetchApi('/admin/session/status');
        if (res.success && res.data) {
          currentSessionData = res.data;
          const s = res.data;
          const activeEl = document.getElementById('session-active-label');
          if (activeEl) activeEl.textContent = s.session_label;
          const datesEl = document.getElementById('session-dates-label');
          if (datesEl) datesEl.textContent = `(${s.start_date} to ${s.end_date})`;
          const rollEl = document.getElementById('session-rollover-text');
          if (rollEl) {
            rollEl.innerHTML = `Automatic Calendar Rollover: Advances to <strong>${esc(s.next_session_label)}</strong> on ${esc(s.next_rollover_date)} (in ${s.days_remaining} days)`;
          }
          const statTermEl = document.getElementById('stat-session-term');
          if (statTermEl) {
            statTermEl.textContent = s.session_label.includes('Odd Semester') ? 'Odd Semester' : s.session_label.includes('Even Semester') ? 'Even Semester' : s.session_label;
          }
        }
      } catch (err) {
        console.warn('Could not load session status:', err);
      }
    }

    // ─── Load All Master Data ─────────────────────────────────
    async function loadAllData() {
      try {
        const [deptsRes, hodsRes] = await Promise.all([
          fetchApi('/admin/departments'),
          fetchApi('/admin/hods')
        ]);

        allDepartments = deptsRes.data || [];

        // Map HODs by department_id
        hodInfoMap = {};
        const hodsList = hodsRes.data || [];
        hodsList.forEach(h => {
          if (h.department_id) {
            hodInfoMap[h.department_id] = h;
          }
        });

        // Update stats
        const deptCountEl = document.getElementById('stat-dept-count');
        if (deptCountEl) deptCountEl.textContent = allDepartments.length;
        
        const appointedHodsCount = Object.keys(hodInfoMap).length;
        const hodCountEl = document.getElementById('stat-hod-count');
        if (hodCountEl) hodCountEl.textContent = `${appointedHodsCount} / ${allDepartments.length}`;

        const badgeEl = document.getElementById('catalog-count-badge');
        if (badgeEl) {
          badgeEl.textContent = `${allDepartments.length} ${allDepartments.length === 1 ? 'Program' : 'Programs'}`;
        }

        renderDepartments();
      } catch (err) {
        showToast('Failed to load departments: ' + err.message, 'error');
      }
    }

    // Helper: Institutional Department Icon Mapper
    const HARDCODED_DEPT_CODES = ['CE', 'EE', 'ECE', 'IT', 'ME', 'PHARM'];

    function isHardcodedDept(code) {
      if (!code) return false;
      return HARDCODED_DEPT_CODES.includes(String(code).toUpperCase().trim());
    }

    function getDeptIcon(code, name) {
      const c = (code || '').toUpperCase();
      const n = (name || '').toLowerCase();
      const svgWrap = (path) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    if (c.includes('EC') || n.includes('electronics')) return svgWrap('<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M12 12h.01M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9C23 8.8 23 15.2 19.1 19.1"></path>');
    if (c.includes('EE') || n.includes('electrical')) return svgWrap('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>');
    if (c.includes('IT') || n.includes('information')) return svgWrap('<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>');
    if (c.includes('ME') || n.includes('mechanical')) return svgWrap('<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>');
    if (c.includes('CE') || c.includes('CL') || n.includes('civil')) return svgWrap('<path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"></path>');
    if (c.includes('PHARM') || n.includes('pharmacy')) return svgWrap('<path d="M10 2v7.31L4.89 17A2 2 0 0 0 6.62 20h10.76a2 2 0 0 0 1.73-3L14 9.31V2"></path><line x1="8.5" y1="2" x2="15.5" y2="2"></line><line x1="7" y1="14" x2="17" y2="14"></line>');
    return svgWrap('<path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"></path>');
    }

    function applyDeptPreset(val) {
      if (!val) return;
      const [code, name, duration] = val.split('|');
      const codeEl = document.getElementById('dept-code');
      const nameEl = document.getElementById('dept-name');
      const durEl = document.getElementById('dept-duration');
      if (codeEl && !codeEl.readOnly) codeEl.value = code;
      if (nameEl) nameEl.value = name;
      if (durEl) durEl.value = duration || '4';
    }

    // ─── Render Departments ───────────────────────────────────
    function renderDepartments() {
      const q = (document.getElementById('dept-search').value || '').toLowerCase().trim();
      const filtered = allDepartments.filter(d => 
        (d.name || '').toLowerCase().includes(q) || 
        (d.code || '').toLowerCase().includes(q)
      );

      const tbody = document.getElementById('dept-tbody');
      if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">${q ? 'No matching departments found.' : 'No departments configured yet.'}</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(d => {
        const hod = hodInfoMap[d.id];
        const deptIcon = getDeptIcon(d.code, d.name);
        const hodDisplay = hod
          ? `<div style="font-weight: 600; color: var(--text-main); font-size: 0.88rem; display:inline-flex; align-items:center; gap:0.35rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span>${esc(hod.full_name)}</span></div>
             <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.1rem;">${esc(hod.email || hod.username)}</div>`
          : `<span class="badge" style="background: var(--bg-surface); color: var(--text-muted); font-weight: 500; font-size: 0.72rem;">Unassigned</span>`;

        const statusBadge = d.is_archived === 1
          ? `<span class="badge" style="background: var(--bg-surface-secondary); color: var(--text-muted); font-size: 0.75rem; border: 1px solid var(--border-color); display: inline-flex; align-items: center; gap: 0.3rem;"><span style="width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted);"></span>Archived</span>`
          : d.is_active
            ? `<span class="badge badge-present" style="display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.75rem;"><span style="width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span>Active</span>`
            : `<span class="badge badge-absent" style="display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.75rem;"><span style="width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span>Inactive</span>`;

        const progLabel = d.code === 'PHARM' ? 'Diploma in Pharmacy (D.Pharm)' : 'Diploma in Engineering';
        const progDuration = d.degree_duration_years || (d.code === 'PHARM' ? 2 : 3);
        const isHardcoded = d.is_hardcoded === 1 || isHardcodedDept(d.code);

        return `
          <tr class="dept-row-card">
            <td class="td-mobile-header">
              <div style="display: flex; align-items: center; gap: 0.45rem; min-width: 0; flex: 1;">
                <span class="code-badge">${esc(d.code)}</span>
                <span class="d-mobile-only" style="font-weight: 700; font-size: 0.88rem; color: var(--text-main); display: inline-flex; align-items: center; gap: 0.35rem; min-width: 0; overflow: hidden;">
                  <span style="display:inline-flex;align-items:center;flex-shrink:0;">${deptIcon}</span>
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(d.name)}</span>
                </span>
              </div>
              <span class="d-mobile-only" style="flex-shrink: 0;">${statusBadge}</span>
            </td>
            <td class="td-mobile-title d-desktop-only">
              <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem; display: flex; align-items: center; gap: 0.4rem;">
                <span style="font-size: 1.05rem;">${deptIcon}</span>
                <span>${esc(d.name)}</span>
              </div>
              <div style="font-size: 0.725rem; color: var(--text-muted); margin-top: 0.1rem;">${progDuration} Years • ${progLabel}</div>
            </td>
            <td class="td-mobile-hod">
              <div class="d-mobile-only" style="display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; width: 100%;">
                <span style="font-size: 0.73rem; color: var(--text-muted); font-weight: 500;">${progDuration} Yrs • ${progLabel}</span>
                <span>${hodDisplay}</span>
              </div>
              <div class="d-desktop-only">${hodDisplay}</div>
            </td>
            <td class="d-desktop-only" style="text-align: center;">
              ${statusBadge}
            </td>
            <td class="td-mobile-actions">
              ${isHardcoded
                ? `<div class="row-actions-group">
                    <button class="btn btn-secondary btn-sm" onclick="editDepartment(${d.id})" style="padding: 0.25rem 0.55rem; font-size: 0.8rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> <span>Edit</span>
                    </button>
                    <span class="badge badge-core-lock" title="Standard institutional department cannot be deleted">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> <span>Core</span>
                    </span>
                  </div>`
                : `<div class="row-actions-group">
                    <button class="btn btn-secondary btn-sm" onclick="editDepartment(${d.id})" style="padding: 0.25rem 0.55rem; font-size: 0.8rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> <span>Edit</span>
                    </button>
                    <button class="btn-danger-soft" onclick="deleteDepartment(${d.id}, '${esc(d.name)}', '${esc(d.code)}')" title="${d.is_archived === 1 ? 'Permanently Delete Archived Department' : 'Delete Department (Requires Archiving First)'}">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> <span>Delete</span>
                    </button>
                  </div>`
              }
            </td>
          </tr>
        `;
      }).join('');
    }

    // ─── Department Modal Actions ─────────────────────────────
    function openDeptModal(id = null) {
      const form = document.getElementById('dept-form');
      form.reset();
      document.getElementById('dept-modal-err').style.display = 'none';
      document.getElementById('dept-status-group').style.display = 'none';
      if (!id) return;
      const d = allDepartments.find(item => item.id === id);
      if (!d) return;
      const delBtn = document.getElementById('dept-delete-btn');
      const durationEl = document.getElementById('dept-duration');

      document.getElementById('dept-modal-title').textContent = 'Edit Department';
      document.getElementById('dept-id').value = d.id;
      document.getElementById('dept-code').value = d.code;
      document.getElementById('dept-code').readOnly = true;
      document.getElementById('dept-name').value = d.name;
      if (durationEl) durationEl.value = String(d.degree_duration_years || 3);
      document.getElementById('dept-status').value = d.is_active ? '1' : '0';
      document.getElementById('dept-status-group').style.display = 'block';
      const isHardcoded = d.is_hardcoded === 1 || isHardcodedDept(d.code);
      if (delBtn) delBtn.style.display = isHardcoded ? 'none' : 'inline-flex';

      const modal = document.getElementById('dept-modal');
      modal.classList.add('open');
      modal.style.display = 'flex';
      setTimeout(() => document.getElementById('dept-name').focus(), 100);
    }

    function closeDeptModal() {
      const modal = document.getElementById('dept-modal');
      modal.classList.remove('open');
      modal.style.display = 'none';
    }

    async function editDepartment(id) {
      openDeptModal(id);
    }

    let pendingDeleteDept = null;

    // ─── Delete Department Flow (In-App Modal, Zero Native Prompts) ──
    function deleteDepartment(id, name, code) {
      if (isHardcodedDept(code)) {
        showToast(`Standard institutional department "${name}" (${code}) is protected and cannot be deleted.`, 'error');
        return;
      }
      openDeleteModal(id, name, code);
    }

    function openDeleteModal(id, name, code) {
      if (isHardcodedDept(code)) {
        showToast(`Standard institutional department "${name}" (${code}) is protected and cannot be deleted.`, 'error');
        return;
      }
      const dept = allDepartments.find(d => d.id === parseInt(id, 10));
      const isArchived = dept ? dept.is_archived === 1 : false;

      pendingDeleteDept = { id: parseInt(id, 10), name: name || code || 'this department', code: code || '', isArchived };
      const nameEl = document.getElementById('delete-modal-dept-name');
      if (nameEl) nameEl.textContent = `"${pendingDeleteDept.name}" (${pendingDeleteDept.code})`;

      const archiveNotice = document.getElementById('delete-modal-archive-notice');
      const typeConfirm = document.getElementById('delete-modal-type-confirm');
      const targetSpan = document.getElementById('delete-modal-confirm-target');
      const codeInput = document.getElementById('delete-modal-code-input');
      const btn = document.getElementById('delete-modal-confirm-btn');
      const btnLabel = document.getElementById('delete-modal-btn-label');
      const btnIcon = document.getElementById('delete-modal-btn-icon');
      const titleEl = document.getElementById('delete-modal-title');
      const iconEl = document.getElementById('delete-modal-icon');
      const warningEl = document.getElementById('delete-modal-warning');
      if (warningEl) { warningEl.style.display = 'none'; warningEl.innerHTML = ''; }

      if (!isArchived) {
        // Stage 1: Must archive department first
        if (titleEl) titleEl.textContent = 'Archive Department Data';
        if (iconEl) iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>';
        if (archiveNotice) archiveNotice.style.display = 'block';
        if (typeConfirm) typeConfirm.style.display = 'none';
        if (btn) btn.disabled = false;
        if (btnLabel) btnLabel.textContent = 'Archive Department First';
        if (btnIcon) btnIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>';
      } else {
        // Stage 2: Already archived -> Require typed confirmation of code (not in 1 click!)
        if (titleEl) titleEl.textContent = 'Permanent Deletion';
        if (iconEl) iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        if (archiveNotice) archiveNotice.style.display = 'none';
        if (typeConfirm) typeConfirm.style.display = 'block';
        if (targetSpan) targetSpan.textContent = pendingDeleteDept.code;
        if (codeInput) { codeInput.value = ''; }
        if (btn) btn.disabled = true; // disabled until typed!
        if (btnLabel) btnLabel.textContent = 'Permanently Delete';
        if (btnIcon) btnIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
      }

      const modal = document.getElementById('delete-confirm-modal');
      if (modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
      }
    }

    function handleDeleteCodeInput(val) {
      const btn = document.getElementById('delete-modal-confirm-btn');
      if (!pendingDeleteDept || !btn) return;
      if (val.trim().toUpperCase() === pendingDeleteDept.code.toUpperCase()) {
        btn.disabled = false;
      } else {
        btn.disabled = true;
      }
    }

    function closeDeleteModal() {
      const modal = document.getElementById('delete-confirm-modal');
      if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
      }
      pendingDeleteDept = null;
    }

    async function executeDeleteDepartment() {
      if (!pendingDeleteDept) return;

      const btn = document.getElementById('delete-modal-confirm-btn');
      const btnLabel = document.getElementById('delete-modal-btn-label');
      const warningEl = document.getElementById('delete-modal-warning');

      if (!pendingDeleteDept.isArchived) {
        // Step 1: Archive department first
        btn.disabled = true;
        btnLabel.textContent = 'Archiving...';
        try {
          const res = await fetchApi(`/admin/departments/${pendingDeleteDept.id}/archive`, { method: 'POST' });
          if (res.success) {
            closeDeleteModal();
            showToast(res.message || 'Department archived successfully', 'success');
            await loadAllData();
          } else {
            showToast(res.error?.message || 'Failed to archive department', 'error');
            btn.disabled = false;
            btnLabel.textContent = 'Archive Department First';
          }
        } catch (err) {
          showToast(err.message || 'Failed to archive department', 'error');
          btn.disabled = false;
          btnLabel.textContent = 'Archive Department First';
        }
      } else {
        // Step 2: Delete archived department with typed confirmation
        btn.disabled = true;
        btnLabel.textContent = 'Deleting...';
        const codeInput = document.getElementById('delete-modal-code-input');
        const typedCode = codeInput ? codeInput.value.trim() : pendingDeleteDept.code;

        try {
          const res = await fetchApi(`/admin/departments/${pendingDeleteDept.id}`, {
            method: 'DELETE',
            body: JSON.stringify({ confirm_code: typedCode })
          });
          if (res.success) {
            closeDeleteModal();
            showToast(res.message || `Department "${pendingDeleteDept.code}" permanently deleted`, 'success');
            await loadAllData();
          } else {
            showToast(res.error?.message || 'Failed to delete department', 'error');
            btn.disabled = false;
            btnLabel.textContent = 'Permanently Delete';
          }
        } catch (err) {
          showToast(err.message || 'Failed to delete department', 'error');
          btn.disabled = false;
          btnLabel.textContent = 'Permanently Delete';
        }
      }
    }

    async function deleteCurrentDeptFromModal() {
      const id = document.getElementById('dept-id').value;
      if (!id) return;
      const d = allDepartments.find(item => item.id === parseInt(id, 10));
      closeDeptModal();
      openDeleteModal(id, d?.name, d?.code);
    }

    async function saveDepartment(e) {
      e.preventDefault();
      const id = document.getElementById('dept-id').value;
      if (!id) {
        showToast('Department creation is disabled', 'error');
        return;
      }
      const name = document.getElementById('dept-name').value.trim();
      const is_active = document.getElementById('dept-status').value === '1';
      const durationEl = document.getElementById('dept-duration');
      const degree_duration_years = durationEl ? parseInt(durationEl.value, 10) : 3;

      const btn = document.getElementById('dept-submit-btn');
      const errEl = document.getElementById('dept-modal-err');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      errEl.style.display = 'none';

      try {
        await fetchApi(`/admin/departments/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ name, is_active, degree_duration_years })
        });
        showToast('Department updated successfully', 'success');
        closeDeptModal();
        await loadAllData();
      } catch (err) {
        errEl.textContent = err.message || 'Failed to update department';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Save Changes';
      }
    }

    // Modal backdrop click & escape key listeners
    document.addEventListener('DOMContentLoaded', () => {
      const deptModal = document.getElementById('dept-modal');
      if (deptModal) {
        deptModal.addEventListener('click', (e) => {
          if (e.target === deptModal) closeDeptModal();
        });
      }
      const delModal = document.getElementById('delete-confirm-modal');
      if (delModal) {
        delModal.addEventListener('click', (e) => {
          if (e.target === delModal) closeDeleteModal();
        });
      }
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeDeptModal();
          closeDeleteModal();
        }
      });
    });

    init();


