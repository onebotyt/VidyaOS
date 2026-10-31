/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS REUSABLE CONFIRM & DELETE DIALOG COMPONENT
 * Location: /faculty/components/confirm-dialog/confirm-dialog.js
 * 
 * Centralized, bulletproof confirmation & deletion dialog.
 * - 100% Theme Token Compliant (Zero Hardcoded Hex Colors)
 * - Auto-injects styles and reusable DOM element on demand
 * - Handles asynchronous actions with loading states
 * - Escape key & backdrop click dismissal
 * - Clean state restoration (prevents zombie overlays)
 * ══════════════════════════════════════════════════════════════
 */

(function (root) {
  'use strict';

  function ensureStyles() {
    if (typeof document === 'undefined') return;
    const existing = document.querySelector('link[href*="confirm-dialog.css"]');
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/faculty/components/confirm-dialog/confirm-dialog.css';
      document.head.appendChild(link);
    }
  }

  let dialogElement = null;
  let activeConfig = null;

  function createDialogDOM() {
    if (document.getElementById('vidya-global-confirm-dialog')) {
      dialogElement = document.getElementById('vidya-global-confirm-dialog');
      return dialogElement;
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'vidya-global-confirm-dialog';
    backdrop.className = 'vidya-confirm-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-hidden', 'true');

    backdrop.innerHTML = `
      <div class="vidya-confirm-card" onclick="event.stopPropagation()">
        <div class="vidya-confirm-icon-wrap" id="vidya-confirm-icon">
          <!-- Default Danger Icon -->
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h2 class="vidya-confirm-title" id="vidya-confirm-title">Confirm Action</h2>
        <div class="vidya-confirm-message" id="vidya-confirm-message">Are you sure you want to proceed?</div>
        
        <div class="vidya-confirm-input-wrap" id="vidya-confirm-input-wrap" style="display: none;">
          <label class="vidya-confirm-input-label" id="vidya-confirm-input-label">Type DELETE to confirm:</label>
          <input type="text" class="vidya-confirm-input" id="vidya-confirm-input" placeholder="DELETE" autocomplete="off">
        </div>

        <div class="vidya-confirm-actions">
          <button type="button" class="vidya-confirm-btn vidya-confirm-btn-cancel" id="vidya-confirm-cancel-btn" onclick="window.closeConfirmDialog ? window.closeConfirmDialog() : (this.closest('.vidya-confirm-backdrop').style.display='none')">Cancel</button>
          <button type="button" class="vidya-confirm-btn vidya-confirm-btn-danger" id="vidya-confirm-ok-btn">Confirm</button>
        </div>
      </div>
    `;

    // Dismiss on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeConfirmDialog();
      }
    });

    document.body.appendChild(backdrop);
    dialogElement = backdrop;
    return dialogElement;
  }

  function closeConfirmDialog() {
    if (!dialogElement) {
      dialogElement = document.getElementById('vidya-global-confirm-dialog');
    }
    if (dialogElement) {
      dialogElement.classList.remove('open', 'active');
      dialogElement.style.display = 'none';
      dialogElement.style.removeProperty('display');
      dialogElement.setAttribute('aria-hidden', 'true');
    }
    activeConfig = null;

    const input = document.getElementById('vidya-confirm-input');
    if (input) input.value = '';

    const okBtn = document.getElementById('vidya-confirm-ok-btn');
    if (okBtn) {
      okBtn.disabled = false;
      okBtn.textContent = 'Confirm';
    }
  }

  // Keyboard shortcut (Escape to dismiss)
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dialogElement && dialogElement.classList.contains('open')) {
        closeConfirmDialog();
      }
    });
  }

  /**
   * Main API: Show Confirmation / Delete Dialog
   * @param {Object} options
   */
  function showConfirmDialog(options = {}) {
    ensureStyles();
    createDialogDOM();

    activeConfig = {
      title: options.title || 'Confirm Action',
      message: options.message || 'Are you sure you want to proceed?',
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      variant: options.variant || 'danger', // 'danger' | 'warning' | 'primary'
      requireInput: options.requireInput || null, // e.g. "DELETE"
      onConfirm: options.onConfirm || (() => {}),
      onCancel: options.onCancel || (() => {})
    };

    const titleEl = document.getElementById('vidya-confirm-title');
    const msgEl = document.getElementById('vidya-confirm-message');
    const iconEl = document.getElementById('vidya-confirm-icon');
    const okBtn = document.getElementById('vidya-confirm-ok-btn');
    const cancelBtn = document.getElementById('vidya-confirm-cancel-btn');
    const inputWrap = document.getElementById('vidya-confirm-input-wrap');
    const inputEl = document.getElementById('vidya-confirm-input');

    titleEl.textContent = activeConfig.title;
    titleEl.className = `vidya-confirm-title ${activeConfig.variant === 'danger' ? 'danger' : ''}`;
    msgEl.innerHTML = activeConfig.message;

    // Icon variant
    iconEl.className = `vidya-confirm-icon-wrap ${activeConfig.variant}`;

    // Action buttons
    okBtn.textContent = activeConfig.confirmText;
    okBtn.className = `vidya-confirm-btn vidya-confirm-btn-${activeConfig.variant === 'primary' ? 'primary' : 'danger'}`;
    cancelBtn.textContent = activeConfig.cancelText;

    // Optional confirmation text requirement (e.g. Type DELETE)
    if (activeConfig.requireInput) {
      inputWrap.style.display = 'block';
      inputEl.value = '';
      okBtn.disabled = true;
      inputEl.oninput = () => {
        okBtn.disabled = (inputEl.value.trim().toUpperCase() !== activeConfig.requireInput.toUpperCase());
      };
      setTimeout(() => inputEl.focus(), 60);
    } else {
      inputWrap.style.display = 'none';
      okBtn.disabled = false;
      setTimeout(() => cancelBtn.focus(), 60);
    }

    cancelBtn.onclick = () => {
      const cb = activeConfig?.onCancel;
      closeConfirmDialog();
      if (typeof cb === 'function') cb();
    };

    okBtn.onclick = async () => {
      if (okBtn.disabled) return;
      const originalText = okBtn.textContent;
      okBtn.disabled = true;
      cancelBtn.disabled = true;
      okBtn.textContent = 'Processing...';

      try {
        if (typeof activeConfig.onConfirm === 'function') {
          await activeConfig.onConfirm();
        }
        closeConfirmDialog();
      } catch (err) {
        console.error('Confirm action failed:', err);
        okBtn.disabled = false;
        cancelBtn.disabled = false;
        okBtn.textContent = originalText;
        if (window.showToast) {
          window.showToast(err.message || 'Operation failed. Please try again.', 'error');
        }
      }
    };

    dialogElement.style.display = 'flex';
    // Trigger transition
    requestAnimationFrame(() => {
      dialogElement.classList.add('open');
      dialogElement.setAttribute('aria-hidden', 'false');
    });
  }

  /**
   * Helper: Student Withdrawal Confirmation
   */
  function confirmStudentWithdrawal(studentId, studentName, onCompleted) {
    if (window.VidyaDeleteModal) {
      window.VidyaDeleteModal.open({
        title: 'Student Withdrawal / Left College?',
        itemName: studentName,
        message: `Withdraw <strong>${studentName}</strong> from department roster?<br><span style="font-size:0.82rem;color:var(--text-muted);display:block;margin-top:0.4rem;">Class roll numbers for their cohort will automatically re-index sequentially without gaps.</span>`,
        confirmButtonText: 'Confirm Withdrawal',
        confirmKeyword: 'DELETE',
        onConfirm: async () => {
          const res = await (window.apiFetch || fetch)(`/hod/students/${studentId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
          const data = res.json ? await res.json() : res;
          if (window.showToast) {
            window.showToast(`Student ${studentName} withdrawn successfully.`, 'info');
          }
          if (typeof onCompleted === 'function') {
            onCompleted(data);
          }
        }
      });
      return;
    }

    showConfirmDialog({
      title: 'Student Withdrawal / Left College?',
      message: `Withdraw <strong>${studentName}</strong> from department roster?<br><span style="font-size:0.82rem;color:var(--text-muted);display:block;margin-top:0.4rem;">Class roll numbers for their cohort will automatically re-index sequentially without gaps.</span>`,
      confirmText: 'Confirm Withdrawal',
      variant: 'danger',
      requireInput: 'DELETE',
      onConfirm: async () => {
        const res = await (window.apiFetch || fetch)(`/hod/students/${studentId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = res.json ? await res.json() : res;
        if (window.showToast) {
          window.showToast(`Student ${studentName} withdrawn successfully.`, 'info');
        }
        if (typeof onCompleted === 'function') {
          onCompleted(data);
        }
      }
    });
  }

  /**
   * Helper: Faculty / Teacher Account Deletion
   */
  function confirmTeacherDelete(teacherId, teacherName, onCompleted) {
    if (window.VidyaDeleteModal) {
      window.VidyaDeleteModal.open({
        title: 'Delete Faculty Account?',
        itemName: teacherName,
        message: `Permanently delete faculty record for <strong>${teacherName}</strong>?<br><span style="font-size:0.82rem;color:var(--text-muted);display:block;margin-top:0.4rem;">All assigned course registers and class associations will be unlinked.</span>`,
        confirmButtonText: 'Permanently Delete',
        confirmKeyword: 'DELETE',
        onConfirm: async () => {
          const res = await (window.apiFetch || fetch)(`/hod/teachers/${teacherId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
          const data = res.json ? await res.json() : res;
          if (window.showToast) {
            window.showToast(`Faculty account for ${teacherName} deleted.`, 'info');
          }
          if (typeof onCompleted === 'function') {
            onCompleted(data);
          }
        }
      });
      return;
    }

    showConfirmDialog({
      title: 'Delete Faculty Account?',
      message: `Permanently delete faculty record for <strong>${teacherName}</strong>?<br><span style="font-size:0.82rem;color:var(--text-muted);display:block;margin-top:0.4rem;">All assigned course registers and class associations will be unlinked.</span>`,
      confirmText: 'Permanently Delete',
      variant: 'danger',
      requireInput: 'DELETE',
      onConfirm: async () => {
        const res = await (window.apiFetch || fetch)(`/hod/teachers/${teacherId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = res.json ? await res.json() : res;
        if (window.showToast) {
          window.showToast(`Faculty account for ${teacherName} deleted.`, 'info');
        }
        if (typeof onCompleted === 'function') {
          onCompleted(data);
        }
      }
    });
  }

  // Exports
  root.showConfirmDialog = showConfirmDialog;
  root.closeConfirmDialog = closeConfirmDialog;
  root.confirmStudentWithdrawal = confirmStudentWithdrawal;
  root.confirmTeacherDelete = confirmTeacherDelete;

})(typeof window !== 'undefined' ? window : this);

