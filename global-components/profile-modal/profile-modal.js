/**
 * ══════════════════════════════════════════════════════════════
 * GLOBAL DYNAMIC PROFILE MODAL (VIEW & EDIT)
 * frontend/global-components/profile-modal/profile-modal.js
 * ══════════════════════════════════════════════════════════════
 * Reusable modal for Faculty & Student profiles.
 * Fully theme-token compliant and accessible.
 */

(function () {
  'use strict';

  let currentConfig = null;
  let currentMode = 'view';
  let modalEl = null;

  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureModalMounted() {
    if (modalEl && document.body.contains(modalEl)) return;

    modalEl = document.getElementById('global-profile-modal');
    if (modalEl) {
      bindModalEvents();
      return;
    }

    const div = document.createElement('div');
    div.id = 'global-profile-modal';
    div.className = 'global-modal-backdrop';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-modal', 'true');
    div.setAttribute('aria-hidden', 'true');
    div.style.display = 'none';

    div.innerHTML = `
      <div class="global-profile-card" id="global-profile-card" data-mode="view" data-type="FACULTY">
        <!-- Header Banner -->
        <div class="global-profile-header">
          <div class="global-profile-header-left">
            <span class="global-profile-header-icon" id="global-profile-header-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18C5 19.94 8.13 22 12 22C15.87 22 19 19.94 19 17.18V13.18L12 17L5 13.18Z"/>
              </svg>
            </span>
            <h2 class="global-profile-header-title" id="global-profile-title">Faculty Profile</h2>
          </div>
          <button type="button" class="global-profile-close-btn" id="global-profile-close-btn" aria-label="Close modal">&times;</button>
        </div>

        <!-- Modal Body -->
        <div class="global-profile-body">
          <!-- Top Row: Avatar on Left, Name & IDs on Right -->
          <div class="global-profile-top">
            <div class="global-profile-avatar-wrap">
              <div class="global-profile-avatar" id="global-profile-avatar">DR</div>
              <button type="button" class="global-profile-photo-btn" id="global-profile-photo-btn" title="Change photo">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span>Change Photo</span>
              </button>
              <input type="file" id="global-profile-photo-input" accept="image/*" style="display:none;">
            </div>

            <div class="global-profile-top-fields">
              <div class="global-field-box">
                <label class="global-field-label" for="global-profile-name-input">Name</label>
                <div class="global-field-val view-only" id="global-profile-name-val">—</div>
                <input type="text" class="global-field-input edit-only" id="global-profile-name-input" placeholder="Full Name" required>
              </div>

              <div class="global-field-box">
                <label class="global-field-label" id="global-profile-id-label" for="global-profile-id-input">Employee ID</label>
                <div class="global-field-val view-only mono" id="global-profile-id-val">—</div>
                <input type="text" class="global-field-input edit-only mono" id="global-profile-id-input" placeholder="Identifier">
              </div>
            </div>
          </div>

          <!-- 2-Column Info Grid -->
          <div class="global-profile-grid">
            <!-- Email Box -->
            <div class="global-field-box">
              <label class="global-field-label">Email id</label>
              <div class="global-field-val with-icon view-only" id="global-profile-email-val">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <span id="global-profile-email-text">—</span>
              </div>
              <input type="email" class="global-field-input edit-only" id="global-profile-email-input" readonly style="opacity:0.85; cursor:not-allowed;">
            </div>

            <!-- Phone Box -->
            <div class="global-field-box">
              <label class="global-field-label">Phone Number</label>
              <div class="global-field-val with-icon view-only" id="global-profile-phone-val">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span id="global-profile-phone-text">—</span>
              </div>
              <input type="tel" class="global-field-input edit-only" id="global-profile-phone-input" placeholder="10-digit number">
            </div>

            <!-- Department Box -->
            <div class="global-field-box">
              <label class="global-field-label" id="global-profile-dept-label">Primary Department</label>
              <div class="global-field-val with-icon view-only" id="global-profile-dept-val">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="2"/><line x1="15" y1="22" x2="15" y2="2"/></svg>
                <span id="global-profile-dept-text">—</span>
              </div>
              <select class="global-field-select edit-only" id="global-profile-dept-select">
                <option value="">— Select Department —</option>
              </select>
            </div>

            <!-- Student Only: Year / Semester / Class -->
            <div class="global-field-box student-only-field" id="global-profile-academic-box" style="display:none;">
              <label class="global-field-label" id="global-profile-academic-label">Year / Semester / Class</label>
              <div class="global-field-val view-only" id="global-profile-academic-val">—</div>
              <input type="text" class="global-field-input edit-only" id="global-profile-academic-input" placeholder="e.g. 3rd Year / 5th Sem">
            </div>

            <!-- Account Status Box -->
            <div class="global-field-box">
              <label class="global-field-label">Account Status</label>
              <div class="view-only" id="global-profile-status-val">
                <span class="global-status-pill active" id="global-profile-status-pill">
                  <span class="global-status-dot"></span>
                  <span id="global-profile-status-text">Active</span>
                </span>
              </div>
              <div class="edit-only">
                <select class="global-status-select" id="global-profile-status-select">
                  <option value="ACTIVE">🟢 Active</option>
                  <option value="INACTIVE">🔴 Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Error / Message Banner -->
          <div class="global-profile-msg" id="global-profile-msg" style="display:none;"></div>
        </div>

        <!-- Footer Actions -->
        <div class="global-profile-footer">
          <!-- View Mode Footer -->
          <div class="global-profile-footer-view view-only">
            <button type="button" class="btn btn-secondary btn-sm" id="global-profile-btn-close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <span>Close</span>
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="global-profile-btn-edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              <span>Edit</span>
            </button>
          </div>

          <!-- Edit Mode Footer -->
          <div class="global-profile-footer-edit edit-only">
            <button type="button" class="btn btn-secondary btn-sm" id="global-profile-btn-cancel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <span>Cancel</span>
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="global-profile-btn-save">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(div);
    modalEl = div;
    bindModalEvents();
  }

  function bindModalEvents() {
    if (!modalEl) return;

    // Backdrop click
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) {
        GlobalProfileModal.close();
      }
    });

    // Close buttons
    const closeBtn = document.getElementById('global-profile-close-btn');
    if (closeBtn) closeBtn.onclick = () => GlobalProfileModal.close();

    const viewCloseBtn = document.getElementById('global-profile-btn-close');
    if (viewCloseBtn) viewCloseBtn.onclick = () => GlobalProfileModal.close();

    // Edit button -> Switch to Edit mode
    const editBtn = document.getElementById('global-profile-btn-edit');
    if (editBtn) {
      editBtn.onclick = () => {
        GlobalProfileModal.setMode('edit');
      };
    }

    // Cancel button -> Revert to View mode
    const cancelBtn = document.getElementById('global-profile-btn-cancel');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        hideMessage();
        GlobalProfileModal.setMode('view');
      };
    }

    // Save button
    const saveBtn = document.getElementById('global-profile-btn-save');
    if (saveBtn) {
      saveBtn.onclick = async () => {
        await handleSave();
      };
    }

    // Photo button
    const photoBtn = document.getElementById('global-profile-photo-btn');
    const photoInput = document.getElementById('global-profile-photo-input');
    if (photoBtn && photoInput) {
      photoBtn.onclick = () => photoInput.click();
      photoInput.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file && currentConfig && typeof currentConfig.onPhotoUpload === 'function') {
          currentConfig.onPhotoUpload(file);
        }
      };
    }

    // Keyboard Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalEl && modalEl.classList.contains('open')) {
        GlobalProfileModal.close();
      }
    });
  }

  function showMessage(msg, isError = true) {
    const el = document.getElementById('global-profile-msg');
    if (!el) return;
    el.textContent = msg;
    el.className = isError ? 'global-profile-msg error' : 'global-profile-msg success';
    el.style.display = 'block';
  }

  function hideMessage() {
    const el = document.getElementById('global-profile-msg');
    if (el) {
      el.textContent = '';
      el.style.display = 'none';
    }
  }

  async function handleSave() {
    if (!currentConfig || typeof currentConfig.onSave !== 'function') return;

    const nameInput = document.getElementById('global-profile-name-input');
    const idInput = document.getElementById('global-profile-id-input');
    const phoneInput = document.getElementById('global-profile-phone-input');
    const deptSelect = document.getElementById('global-profile-dept-select');
    const academicInput = document.getElementById('global-profile-academic-input');
    const statusSelect = document.getElementById('global-profile-status-select');
    const saveBtn = document.getElementById('global-profile-btn-save');

    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      showMessage('Please enter a valid full name.', true);
      nameInput.focus();
      return;
    }

    const payload = {
      id: currentConfig.data ? currentConfig.data.id : null,
      name,
      identifier: idInput ? idInput.value.trim() : '',
      phone: phoneInput ? phoneInput.value.trim() : '',
      departmentId: deptSelect ? deptSelect.value : '',
      academic: academicInput ? academicInput.value.trim() : '',
      status: statusSelect ? statusSelect.value : 'ACTIVE'
    };

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span>Saving...</span>`;
      }
      hideMessage();

      await currentConfig.onSave(payload);

      // Update internal data so view mode reflects changes immediately
      if (currentConfig.data) {
        currentConfig.data.name = payload.name;
        currentConfig.data.identifier = payload.identifier;
        currentConfig.data.phone = payload.phone;
        currentConfig.data.departmentId = payload.departmentId;
        if (deptSelect && deptSelect.selectedIndex >= 0) {
          currentConfig.data.departmentName = deptSelect.options[deptSelect.selectedIndex].text;
        }
        currentConfig.data.status = payload.status;
      }

      GlobalProfileModal.setMode('view');
      populateData(currentConfig);
    } catch (err) {
      showMessage(err.message || 'Error saving changes.', true);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>Save Changes</span>
        `;
      }
    }
  }

  function populateData(config) {
    const d = config.data || {};
    const type = config.type || 'FACULTY'; // 'FACULTY' | 'STUDENT'
    const card = document.getElementById('global-profile-card');
    if (card) {
      card.setAttribute('data-type', type);
    }

    // Title
    const titleEl = document.getElementById('global-profile-title');
    if (titleEl) {
      titleEl.textContent = config.title || (type === 'STUDENT' ? 'Student Profile' : 'Faculty Profile');
    }

    // Avatar
    const avatarEl = document.getElementById('global-profile-avatar');
    if (avatarEl) {
      if (d.avatarUrl) {
        avatarEl.innerHTML = `<img src="${esc(d.avatarUrl)}" alt="${esc(d.name)}">`;
      } else {
        const initials = (d.name || (type === 'STUDENT' ? 'ST' : 'FA'))
          .split(' ')
          .filter(Boolean)
          .map(w => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'P';
        avatarEl.textContent = initials;
      }
    }

    // Name
    const nameVal = document.getElementById('global-profile-name-val');
    const nameInp = document.getElementById('global-profile-name-input');
    if (nameVal) nameVal.textContent = d.name || '—';
    if (nameInp) nameInp.value = d.name || '';

    // Identifier (Employee ID vs UBTER Roll No)
    const idLabel = document.getElementById('global-profile-id-label');
    const idVal = document.getElementById('global-profile-id-val');
    const idInp = document.getElementById('global-profile-id-input');
    const idLabelText = d.identifierLabel || (type === 'STUDENT' ? 'UBTER Roll No' : 'Employee ID');
    if (idLabel) idLabel.textContent = idLabelText;
    if (idVal) idVal.textContent = d.identifier || '—';
    if (idInp) {
      idInp.value = d.identifier || '';
      idInp.placeholder = idLabelText;
    }

    // Email
    const emailTxt = document.getElementById('global-profile-email-text');
    const emailInp = document.getElementById('global-profile-email-input');
    if (emailTxt) emailTxt.textContent = d.email || '—';
    if (emailInp) emailInp.value = d.email || '';

    // Phone
    const phoneTxt = document.getElementById('global-profile-phone-text');
    const phoneInp = document.getElementById('global-profile-phone-input');
    if (phoneTxt) phoneTxt.textContent = d.phone || '—';
    if (phoneInp) phoneInp.value = d.phone || '';

    // Department
    const deptLabel = document.getElementById('global-profile-dept-label');
    const deptTxt = document.getElementById('global-profile-dept-text');
    const deptSelect = document.getElementById('global-profile-dept-select');
    const deptLabelText = d.departmentLabel || (type === 'STUDENT' ? 'Department / Branch' : 'Primary Department');
    if (deptLabel) deptLabel.textContent = deptLabelText;
    if (deptTxt) deptTxt.textContent = d.departmentName || d.departmentCode || '—';

    // Populate department options
    if (deptSelect && config.departments && Array.isArray(config.departments)) {
      deptSelect.innerHTML = '<option value="">— Select Department —</option>' +
        config.departments.map(dept => {
          const id = dept.id || dept.department_id;
          const name = dept.name || dept.department_name;
          const code = dept.code || dept.department_code;
          const isSelected = (id == d.departmentId || code == d.departmentCode) ? 'selected' : '';
          return `<option value="${esc(id)}" ${isSelected}>${esc(name || code)}</option>`;
        }).join('');
      if (config.canEditDepartment === false) {
        deptSelect.disabled = true;
        deptSelect.style.opacity = '0.75';
        deptSelect.style.cursor = 'not-allowed';
      } else {
        deptSelect.disabled = false;
        deptSelect.style.opacity = '';
        deptSelect.style.cursor = '';
      }
    }

    // Student specific: Academic (Year / Semester / Class)
    const academicBox = document.getElementById('global-profile-academic-box');
    const academicVal = document.getElementById('global-profile-academic-val');
    const academicInp = document.getElementById('global-profile-academic-input');
    if (type === 'STUDENT') {
      if (academicBox) academicBox.style.display = 'flex';
      if (academicVal) academicVal.textContent = d.academicValue || '—';
      if (academicInp) academicInp.value = d.academicValue || '';
    } else {
      if (academicBox) academicBox.style.display = 'none';
    }

    // Status
    const statusPill = document.getElementById('global-profile-status-pill');
    const statusTxt = document.getElementById('global-profile-status-text');
    const statusSelect = document.getElementById('global-profile-status-select');
    const isInactive = (d.status === 'INACTIVE' || d.status === 'SUSPENDED');
    if (statusPill) {
      statusPill.className = isInactive ? 'global-status-pill inactive' : 'global-status-pill active';
    }
    if (statusTxt) {
      statusTxt.textContent = isInactive ? 'Inactive' : 'Active';
    }
    if (statusSelect) {
      statusSelect.value = isInactive ? 'INACTIVE' : 'ACTIVE';
    }

    // Can Edit permission check
    const editBtn = document.getElementById('global-profile-btn-edit');
    if (editBtn) {
      editBtn.style.display = (config.canEdit !== false) ? 'inline-flex' : 'none';
    }
  }

  const GlobalProfileModal = {
    open(config) {
      ensureModalMounted();
      currentConfig = config || {};
      hideMessage();
      populateData(currentConfig);
      this.setMode(config.mode || 'view');

      modalEl.removeAttribute('inert');
      modalEl.style.display = 'flex';
      modalEl.classList.add('open');
      modalEl.setAttribute('aria-hidden', 'false');
    },

    setMode(mode) {
      currentMode = (mode === 'edit') ? 'edit' : 'view';
      const card = document.getElementById('global-profile-card');
      if (card) {
        card.setAttribute('data-mode', currentMode);
      }
    },

    close() {
      if (!modalEl) return;
      // Prevent browser "Blocked aria-hidden because descendant retained focus" console warning
      if (document.activeElement && modalEl.contains(document.activeElement)) {
        if (typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }
        if (document.body && typeof document.body.focus === 'function') {
          document.body.focus();
        }
      }
      modalEl.setAttribute('inert', '');
      modalEl.classList.remove('open');
      modalEl.setAttribute('aria-hidden', 'true');
      setTimeout(() => {
        if (!modalEl.classList.contains('open')) {
          modalEl.style.display = 'none';
          hideMessage();
        }
      }, 200);
    }
  };

  window.GlobalProfileModal = GlobalProfileModal;
})();
