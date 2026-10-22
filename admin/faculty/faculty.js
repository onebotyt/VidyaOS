/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: FACULTY
 * frontend/admin/faculty/faculty.js
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

    // ─── Bootstrap ────────────────────────────────────────────
    (async function init() {
      await loadDepartments();
      await loadHODs();
      await loadPendingHods();
      await loadCommonFacultyManager();
      await loadRegistrationGates();
    })();

    // ─── Anti-Spam Registration Gates ─────────────────────────
    let adminGates = {
      hod_open: false,
      common_faculty_open: false
    };

    async function loadRegistrationGates() {
      try {
        const res = await apiFetch(`${API}/admin/registration-gates`);
        if (res && res.success && res.data) {
          adminGates = res.data;
          renderRegistrationGates();
        }
      } catch (err) {
        console.warn('Failed to load admin registration gates:', err);
      }
    }

    function renderRegistrationGates() {
      // HOD Gate UI
      const hodBtn = document.getElementById('btn-toggle-hod-gate');
      const hodIcon = document.getElementById('hod-gate-icon');
      const hodLabel = document.getElementById('hod-gate-label');
      if (hodBtn && hodIcon && hodLabel) {
        if (adminGates.hod_open) {
          hodIcon.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="var(--status-present)" stroke="none"><circle cx="12" cy="12" r="8"></circle></svg>';
          hodLabel.textContent = 'Open';
          hodBtn.style.borderColor = 'var(--status-present)';
          hodBtn.style.color = 'var(--status-present)';
        } else {
          hodIcon.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
          hodLabel.textContent = 'Closed';
          hodBtn.style.borderColor = 'var(--status-absent)';
          hodBtn.style.color = 'var(--status-absent)';
        }
      }

      // Common Faculty Gate UI
      const comBtn = document.getElementById('btn-toggle-common-gate');
      const comIcon = document.getElementById('common-gate-icon');
      const comLabel = document.getElementById('common-gate-label');
      if (comBtn && comIcon && comLabel) {
        if (adminGates.common_faculty_open) {
          comIcon.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="var(--status-present)" stroke="none"><circle cx="12" cy="12" r="8"></circle></svg>';
          comLabel.textContent = 'Open';
          comBtn.style.borderColor = 'var(--status-present)';
          comBtn.style.color = 'var(--status-present)';
        } else {
          comIcon.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
          comLabel.textContent = 'Closed';
          comBtn.style.borderColor = 'var(--status-absent)';
          comBtn.style.color = 'var(--status-absent)';
        }
      }
    }

    async function toggleAdminGate(target) {
      const isHod = target === 'HOD';
      const btn = document.getElementById(isHod ? 'btn-toggle-hod-gate' : 'btn-toggle-common-gate');
      const label = document.getElementById(isHod ? 'hod-gate-label' : 'common-gate-label');
      const current = isHod ? adminGates.hod_open : adminGates.common_faculty_open;
      const next = !current;

      try {
        if (btn) btn.disabled = true;
        if (label) label.textContent = 'Updating...';

        const res = await apiFetch(`${API}/admin/registration-gates/toggle`, {
          method: 'POST',
          body: JSON.stringify({ target, open: next })
        });

        if (res && res.success) {
          if (isHod) {
            adminGates.hod_open = Boolean(res.data?.is_open);
          } else {
            adminGates.common_faculty_open = Boolean(res.data?.is_open);
          }
          renderRegistrationGates();
          showToast(res.message || `${isHod ? 'HOD' : 'Common Faculty'} registration updated!`, 'success');
        }
      } catch (err) {
        renderRegistrationGates();
        showToast(err.message || 'Failed to toggle registration gate.', 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    // ─── Load Departments ─────────────────────────────────────
    async function loadDepartments() {
      try {
        const r = await apiFetch(`${API}/admin/hierarchy`);
        departments = r.data.departments || [];
        populateDeptDropdown('hod-dept');
        populateDeptDropdown('assign-existing-dept');
        populateDeptDropdown('reassign-dept');
      } catch (e) {
        console.error('Failed to load departments:', e);
      }
    }

    function populateDeptDropdown(selectId) {
      const sel = document.getElementById(selectId);
      const current = sel.value;
      sel.innerHTML = '<option value="">— Select Department —</option>';
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
                <th>Gmail (Login ID)</th>
                <th>Status</th>
                <th>Google</th>
                <th>Since</th>
                <th>Actions</th>
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
                        <div style="font-weight: 600; color: var(--text-main);">${escHtml(h.full_name)}</div>
                        ${h.employee_id ? `<div style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">${escHtml(h.employee_id)}</div>` : ''}
                      </div>
                    </div>
                  </td>
                  <td>
                    ${h.department_name
                      ? `<span style="background: var(--status-present-bg); color: var(--status-present); border-radius: var(--radius-sm); padding: 0.2rem 0.6rem; font-size: 0.8rem; font-weight: 600;">${escHtml(h.department_name)}</span>`
                      : `<span style="color: var(--text-muted); font-size: 0.8rem;">Unassigned</span>`}
                  </td>
                  <td style="font-family: monospace; font-size: 0.85rem; color: var(--color-primary);">${escHtml(h.gmail || '')}</td>
                  <td>
                    ${h.must_change_password
                      ? `<span class="badge badge-warning">Pending Login</span>`
                      : `<span class="badge badge-present">Active</span>`}
                  </td>
                  <td>
                    ${h.google_linked
                      ? `<span style="color: var(--status-present); font-size: 0.8rem; display:inline-flex; align-items:center; gap:0.25rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Linked</span></span>`
                      : `<span style="color: var(--text-muted); font-size: 0.8rem;">Not linked</span>`}
                  </td>
                  <td style="font-size: 0.8rem; color: var(--text-muted);">${fmtDate(h.created_at)}</td>
                  <td>
                    <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                      <button class="btn btn-secondary btn-sm" onclick="openReassignModal(${h.teacher_id}, '${escHtml(h.full_name)}')">Reassign Dept</button>
                      <button class="btn btn-secondary btn-sm" onclick="openResetModal(${h.teacher_id}, '${escHtml(h.full_name)}')">Reset Pwd</button>
                      <button class="btn btn-secondary btn-sm" style="color: var(--status-absent); border-color: var(--status-absent);" onclick="openDeleteModal(${h.teacher_id}, '${escHtml(h.full_name)}')">Delete</button>
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
          const statusBadge = h.must_change_password
            ? `<span class="badge badge-warning" style="font-size:0.68rem; padding:0.1rem 0.4rem;">Pending Login</span>`
            : `<span class="badge badge-present" style="font-size:0.68rem; padding:0.1rem 0.4rem;">Active</span>`;
          return `
            <div class="hod-mobile-card">
              <div class="hod-mobile-card-header">
                <div class="hod-mobile-avatar">${initial}</div>
                <div class="hod-mobile-name-block">
                  <div class="hod-mobile-name">${escHtml(h.full_name)}</div>
                  <div class="hod-mobile-sub">
                    ${deptBadge}
                    ${h.employee_id ? `<span class="hod-empid-tag">${escHtml(h.employee_id)}</span>` : ''}
                  </div>
                </div>
                ${statusBadge}
              </div>
              <div class="hod-mobile-contact">
                <span class="hod-mobile-gmail">${escHtml(h.gmail || '—')}</span>
                <span class="hod-mobile-date">Joined ${fmtDate(h.created_at)}</span>
              </div>
              <div class="hod-mobile-actions">
                <button class="btn btn-secondary btn-sm" onclick="openReassignModal(${h.teacher_id}, '${escHtml(h.full_name)}')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
                  <span>Reassign</span>
                </button>
                <button class="btn btn-secondary btn-sm" onclick="openResetModal(${h.teacher_id}, '${escHtml(h.full_name)}')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span>Reset Pwd</span>
                </button>
                <button class="btn btn-secondary btn-sm fac-btn-delete" onclick="openDeleteModal(${h.teacher_id}, '${escHtml(h.full_name)}')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  <span>Delete</span>
                </button>
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

      document.getElementById('delete-hod-name').textContent = name;
      document.getElementById('delete-step2-name').textContent = name;
      document.getElementById('delete-dept-name').textContent = currentDeleteHod ? (currentDeleteHod.department_name || 'Unassigned') : 'Unassigned';
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
      } catch (e) {
        console.error('Failed to load pending HODs:', e);
        document.getElementById('pending-hods-wrap').innerHTML =
          `<div style="color: var(--status-absent); font-size: 0.85rem; text-align: center; padding: 1rem;">Failed to load pending HODs: ${escHtml(e.message)}</div>`;
      }
    }

    function renderPendingHods() {
      const card = document.getElementById('pending-hods-card');
      const badge = document.getElementById('pending-hods-badge');
      const wrap = document.getElementById('pending-hods-wrap');
      if (badge) badge.textContent = `${pendingHodsList.length} Pending`;

      if (!pendingHodsList.length) {
        if (card) card.style.display = 'none';
        return;
      }

      if (card) card.style.display = '';

      wrap.innerHTML = `
        <div style="overflow-x: auto;">
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
                        <button type="button" class="btn btn-primary btn-sm" onclick="openApproveHodModal(${item.id})">Approve HOD</button>
                        <button type="button" class="btn btn-secondary btn-sm" style="color: var(--status-absent); border-color: var(--status-absent);" onclick="promptRejectHod(${item.id}, '${escHtml(item.full_name)}')">Reject</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>`;
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
        showToast(res.message || 'HOD approved and activated successfully!', 'success');
        await loadPendingHods();
        await loadHODs();
      } catch (err) {
        errEl.textContent = err.message || 'Failed to approve HOD registration.';
        errEl.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm & Activate HOD';
      }
    }

    async function promptRejectHod(reqId, name) {
      const reason = prompt(`Enter rejection reason for prospective HOD ${name}:`, 'Application requirements not met');
      if (reason === null) return;

      try {
        const res = await apiFetch(`${API}/admin/registrations/hods/${reqId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason.trim() || 'Application not approved' })
        });
        showToast(res.message || 'HOD registration rejected.', 'info');
        await loadPendingHods();
      } catch (err) {
        showToast(err.message || 'Failed to reject registration.', 'error');
      }
    }

    // ─── Common Faculty Manager ──────────────────────────────
    async function loadCommonFacultyManager() {
      try {
        const r = await apiFetch(`${API}/admin/common-faculty-manager`);
        renderCommonFacultyManager(r.data);
      } catch (e) {
        console.error('Failed to load Common Faculty Manager:', e);
        document.getElementById('common-mgr-content').innerHTML =
          `<div style="color: var(--status-absent); font-size: 0.85rem;">Failed to load manager: ${escHtml(e.message)}</div>`;
      }
    }

    function renderCommonFacultyManager(manager) {
      const wrap = document.getElementById('common-mgr-content');
      if (!manager) {
        wrap.innerHTML = `
          <div class="fac-mgr-compact-box">
            <div class="fac-mgr-compact-info">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>No manager appointed (cross-department courses)</span>
            </div>
            <button type="button" class="btn btn-primary btn-sm" onclick="openAppointCommonMgrModal()">+ Appoint</button>
          </div>`;
        return;
      }

      wrap.innerHTML = `
        <div class="fac-mgr-appointed-box">
          <div class="fac-mgr-appointed-left">
            <div class="fac-mgr-avatar">
              ${(manager.full_name || 'M').charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="fac-mgr-name-row">
                <strong>${escHtml(manager.full_name)}</strong>
                <span class="badge badge-present" style="font-size:0.68rem; padding:0.1rem 0.35rem;">Active Manager</span>
                ${manager.department_name ? `<span class="fac-mgr-dept">(${escHtml(manager.department_name)})</span>` : ''}
              </div>
              <div class="fac-mgr-meta-row">
                <span>${escHtml(manager.gmail)}</span>
                ${manager.employee_id ? `<span style="color:var(--text-muted);"> • ID: ${escHtml(manager.employee_id)}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="fac-mgr-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="openAppointCommonMgrModal()">Change</button>
            <button type="button" class="btn btn-secondary btn-sm fac-btn-danger-outline" onclick="removeCommonMgr('${escHtml(manager.full_name)}')">Remove</button>
          </div>
        </div>`;
    }

    async function openAppointCommonMgrModal() {
      const select = document.getElementById('common-mgr-teacher-select');
      const errEl = document.getElementById('appoint-common-mgr-err');
      errEl.style.display = 'none';
      select.innerHTML = '<option value="">Loading faculty list...</option>';
      showModal('appoint-common-mgr-modal');

      try {
        const r = await apiFetch(`${API}/admin/teachers`);
        allTeachersList = r.data || [];
        select.innerHTML = '<option value="">— Select an active faculty member —</option>';
        allTeachersList.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.teacher_id;
          opt.textContent = `${t.full_name} (${t.gmail})${t.department_name ? ' — ' + t.department_name : ' — Common'}`;
          select.appendChild(opt);
        });
      } catch (e) {
        select.innerHTML = '<option value="">Failed to load teachers</option>';
        errEl.textContent = e.message || 'Could not load faculty list.';
        errEl.style.display = 'block';
      }
    }

    function closeAppointCommonMgrModal() {
      hideModal('appoint-common-mgr-modal');
    }

    async function submitAppointCommonMgr() {
      const select = document.getElementById('common-mgr-teacher-select');
      const teacherId = select.value;
      const errEl = document.getElementById('appoint-common-mgr-err');
      const btn = document.getElementById('btn-submit-common-mgr');

      if (!teacherId) {
        errEl.textContent = 'Please select a faculty member.';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Saving...';
      errEl.style.display = 'none';

      try {
        const res = await apiFetch(`${API}/admin/common-faculty-manager`, {
          method: 'POST',
          body: JSON.stringify({ teacher_id: parseInt(teacherId) })
        });
        closeAppointCommonMgrModal();
        showToast(res.message || 'Common Faculty Manager appointed successfully!', 'success');
        await loadCommonFacultyManager();
      } catch (err) {
        errEl.textContent = err.message || 'Failed to appoint Common Faculty Manager.';
        errEl.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Appointment';
      }
    }

    async function removeCommonMgr(name) {
      if (!confirm(`Are you sure you want to remove ${name} from the Common Faculty Manager role?`)) return;

      try {
        const res = await apiFetch(`${API}/admin/common-faculty-manager`, { method: 'DELETE' });
        showToast(res.message || 'Common Faculty Manager removed.', 'info');
        await loadCommonFacultyManager();
      } catch (err) {
        showToast(err.message || 'Failed to remove manager.', 'error');
      }
    }

