/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS UNIFIED ATTENDANCE REGISTER STUDIO CONTROLLER (registers.js)
 * High-performance subject switching & register management
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // Global helper fallbacks
  window.ById = window.ById || (id => document.getElementById(id));
  window.openModal = window.openModal || (id => {
    const el = window.ById(id);
    if (el) {
      el.classList.add('open');
      el.style.display = 'flex';
      document.body.classList.add('modal-open');
    }
  });
  window.closeModal = window.closeModal || (id => {
    const el = window.ById(id);
    if (el) {
      el.classList.remove('open');
      el.style.display = 'none';
      if (!document.querySelector('.modal-backdrop.open')) {
        document.body.classList.remove('modal-open');
      }
    }
  });
  window.escapeHtml = window.escapeHtml || (s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));

  let _allTeacherRegisters = [];
  let _activeRegister = null;

  async function initUnifiedRegisterStudio() {
    try {
      // Guard route
      if (typeof window.guardRoute === 'function') {
        const canAccess = await window.guardRoute({ requireSubjects: true });
        if (!canAccess) return;
      }

      // Initialize state container
      window.S = window.S || { groupId: null, group: null, members: [] };
      window.classRegState = window.classRegState || {};

      // Fetch all registers assigned to teacher
      const resp = await apiFetch('/faculty/registers');
      if (!resp || !resp.success || !Array.isArray(resp.data) || resp.data.length === 0) {
        renderNoRegistersState();
        return;
      }

      _allTeacherRegisters = resp.data;

      // Parse URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const paramRegId = Number(urlParams.get('register_id'));
      const paramGroupId = Number(urlParams.get('id') || urlParams.get('group_id'));

      let defaultReg = null;
      if (paramRegId) {
        defaultReg = _allTeacherRegisters.find(r => r.id === paramRegId);
      }
      if (!defaultReg && paramGroupId) {
        defaultReg = _allTeacherRegisters.find(r => r.group_id === paramGroupId);
      }
      if (!defaultReg) {
        defaultReg = _allTeacherRegisters[0];
      }

      // Populate subject switcher dropdown
      renderSubjectDropdown(defaultReg.id);

      // Select active register
      await selectRegister(defaultReg);

    } catch (err) {
      console.error('[UnifiedRegister] Initialization error:', err);
      const container = document.getElementById('unified-reg-mount');
      if (container) {
        container.innerHTML = `
          <div style="text-align:center; padding:3rem; color:var(--status-absent);">
            <h3>Unable to load Attendance Registers</h3>
            <p style="color:var(--text-muted); font-size:0.85rem;">${err.message || 'Network error'}</p>
            <button class="btn btn-primary btn-sm" onclick="location.reload()" style="margin-top:1rem;">Retry</button>
          </div>
        `;
      }
    }
  }

  function renderSubjectDropdown(selectedRegId) {
    const selectEl = document.getElementById('unified-subject-select');
    if (!selectEl) return;

    selectEl.innerHTML = _allTeacherRegisters.map(r => {
      const isSel = r.id === selectedRegId;
      const sName = r.name || r.subject_name || 'Subject';
      const sCode = (r.subject_code && !sName.includes(r.subject_code)) ? `[${r.subject_code}]` : '';
      const sSem = r.semester ? `Sem ${r.semester}` : '';
      const sScope = (r.session_type_scope || 'THEORY').toUpperCase();
      const parts = [sName, sCode, sSem, sScope].filter(Boolean);
      const label = parts.join(' • ').replace(' • [', ' [');
      return `<option value="${r.id}" ${isSel ? 'selected' : ''}>${label}</option>`;
    }).join('');
  }

  async function selectRegister(reg) {
    if (!reg) return;
    _activeRegister = reg;

    // Update global state S
    window.S.groupId = reg.group_id;
    window.S.group = reg;
    window.classRegState = window.classRegState || {};
    window.classRegState.registerId = reg.id;
    window.classRegState.registerData = reg;

    // Fetch members if group_id is available
    if (reg.group_id) {
      try {
        const gRes = await apiFetch(`/teaching-groups/${reg.group_id}`);
        if (gRes && gRes.success && gRes.data) {
          window.S.group = { ...reg, ...gRes.data };
          window.S.members = gRes.data.students || [];
        }
      } catch (_) {}
    }

    // Update URL query string without reloading page
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('id', reg.group_id || reg.id);
    newUrl.searchParams.set('register_id', reg.id);
    window.history.replaceState({}, '', newUrl);

    // Call tested group-detail register loader
    if (typeof window.loadClassRegister === 'function') {
      await window.loadClassRegister(window.classRegState.currentMonth);
    }
  }

  async function onUnifiedSubjectSelectChange(regIdStr) {
    const regId = Number(regIdStr);
    const reg = _allTeacherRegisters.find(r => r.id === regId);
    if (reg) {
      await selectRegister(reg);
    }
  }

  function renderNoRegistersState() {
    const container = document.getElementById('unified-reg-mount');
    if (container) {
      container.innerHTML = `
        <div style="text-align:center; padding:4rem 1.5rem; color:var(--text-muted); background:var(--bg-card); border-radius:var(--radius-md); border:1px solid var(--border-color); margin-top:1.5rem;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted); margin-bottom:1rem;">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin-bottom:0.4rem;">No Attendance Registers Assigned</h3>
          <p style="font-size:0.85rem; max-width:420px; margin:0 auto 1.5rem;">You do not currently have any active subjects or teaching registers assigned. Please contact your Head of Department.</p>
          <a href="/faculty/dashboard/index.html" class="btn btn-primary btn-sm">Return to Dashboard</a>
        </div>
      `;
    }
  }

  // Window exports
  window.initUnifiedRegisterStudio = initUnifiedRegisterStudio;
  window.onUnifiedSubjectSelectChange = onUnifiedSubjectSelectChange;

  // Compatibility & Integration bridges
  function triggerEspDaySync(e) {
    if (typeof window.triggerClassEspDaySync === 'function') return window.triggerClassEspDaySync(e);
  }
  function checkEspStatus() {
    if (typeof window.checkClassEspStatus === 'function') return window.checkClassEspStatus();
  }
  function submitEspConfirmation() {
    if (typeof window.submitClassEspConfirmation === 'function') return window.submitClassEspConfirmation();
  }
  function switchRegisterTab(tab) {
    if (tab === 'assignments') {
      window.location.href = `/faculty/group-detail/index.html?id=${(window.S && window.S.groupId) || ''}&tab=classwork`;
    } else if (tab === 'marks') {
      window.location.href = `/faculty/group-detail/index.html?id=${(window.S && window.S.groupId) || ''}&tab=marks`;
    }
  }
  function openCreateAssignmentModal() {
    const m = window.ById('create-assignment-modal');
    if (m) window.openModal('create-assignment-modal');
  }
  function openCreateExamModal() {
    const m = window.ById('create-exam-modal');
    if (m) window.openModal('create-exam-modal');
  }
  function loadRegisterAssignments() {}
  function loadRegisterExams() {}
  function initLiveAttendanceTogether() {
    if (typeof window.openClassRollCallModal === 'function') return window.openClassRollCallModal();
  }
  function switchRollCallMode(mode) {
    if (typeof window.switchClassRollCallMode === 'function') return window.switchClassRollCallMode(mode);
  }
  function generateNewQr() {}
  function generateNewPin() {}
  function copyPinCode() {}
  function copyQrToken() {}
  function finalizeClaimsAttendance() {
    if (typeof window.submitClassRollCall === 'function') return window.submitClassRollCall();
  }

  window.triggerEspDaySync = triggerEspDaySync;
  window.checkEspStatus = checkEspStatus;
  window.submitEspConfirmation = submitEspConfirmation;
  window.switchRegisterTab = switchRegisterTab;
  window.openCreateAssignmentModal = openCreateAssignmentModal;
  window.openCreateExamModal = openCreateExamModal;
  window.loadRegisterAssignments = loadRegisterAssignments;
  window.loadRegisterExams = loadRegisterExams;
  window.initLiveAttendanceTogether = initLiveAttendanceTogether;
  window.switchRollCallMode = switchRollCallMode;
  window.generateNewQr = generateNewQr;
  window.generateNewPin = generateNewPin;
  window.copyPinCode = copyPinCode;
  window.copyQrToken = copyQrToken;
  window.finalizeClaimsAttendance = finalizeClaimsAttendance;

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUnifiedRegisterStudio);
  } else {
    initUnifiedRegisterStudio();
  }

})();
