/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY UI UTILITIES (faculty-ui.js)
 * Location: /frontend/faculty/components/faculty-ui.js
 * 
 * Provides isolated toast notifications, accessible modal helpers,
 * dropdown popover toggles, and dynamic dialogs for faculty pages.
 * 100% self-contained inside /frontend/faculty/ without calling /js/ui.js.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getToastContainer() {
    let container = document.getElementById('faculty-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'faculty-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Universal Toast Notification for Faculty Console
   * @param {string} message - Message text
   * @param {'success'|'error'|'info'|'warning'} type - Visual category
   * @param {number} duration - Display time in ms (default: 3500ms)
   */
  function showToast(message, type = 'info', duration = 3500) {
    if (!message) return;
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `faculty-toast-item toast-${type}`;

    // Optional status icon
    let iconSvg = '';
    if (typeof window.getFacultyIcon === 'function') {
      if (type === 'success') iconSvg = window.getFacultyIcon('check', { width: 16, height: 16 });
      else if (type === 'error') iconSvg = window.getFacultyIcon('alert', { width: 16, height: 16 });
      else if (type === 'warning') iconSvg = window.getFacultyIcon('alert', { width: 16, height: 16 });
      else iconSvg = window.getFacultyIcon('bell', { width: 16, height: 16 });
    }

    if (iconSvg) {
      toast.innerHTML = `<span style="display:inline-flex;align-items:center;flex-shrink:0;">${iconSvg}</span><span>${message}</span>`;
    } else {
      toast.textContent = message;
    }

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px) scale(0.96)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 220);
    }, duration);
  }

  /**
   * Accessible Modal Open / Close
   */
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('open', 'active');
    modal.setAttribute('aria-hidden', 'false');
    const firstInput = modal.querySelector('input, select, textarea, button:not(.modal-close-btn)');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 60);
    }
  }

  function closeModal(modalId) {
    let modal = null;
    if (typeof modalId === 'string') {
      modal = document.getElementById(modalId);
    } else if (modalId && modalId.target) {
      modal = modalId.target.closest('.modal-backdrop, .modal');
    } else if (modalId && modalId.nodeType) {
      modal = modalId;
    }
    if (!modal) return;
    modal.classList.remove('open', 'active');
    modal.setAttribute('aria-hidden', 'true');
  }

  /**
   * Global modal dismissal listener (Backdrop click & Escape key)
   */
  function initModalDismissal() {
    document.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('modal-backdrop')) {
        closeModal(e.target);
      }
      if (e.target && e.target.closest('[data-modal-close]')) {
        const modal = e.target.closest('.modal-backdrop, .modal');
        if (modal) closeModal(modal);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal-backdrop.open, .modal-backdrop.active, .modal.open');
        openModals.forEach(m => closeModal(m));

        // Also dismiss any open dropdowns
        const openDropdowns = document.querySelectorAll('.apps-launcher-dropdown, .user-profile-popover, .header-profile-dropdown');
        openDropdowns.forEach(d => { d.style.display = 'none'; });
      }
    });
  }

  /**
   * Dynamic Confirm Dialog (Eliminates redundant delete confirmation markup)
   */
  function confirmAction(options = {}) {
    const {
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      variant = 'danger',
      onConfirm = () => {}
    } = options;

    let modal = document.getElementById('faculty-dynamic-confirm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'faculty-dynamic-confirm-modal';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal-card" style="max-width: 440px;">
          <div class="modal-header">
            <h3 class="modal-title" id="faculty-confirm-title">Confirm Action</h3>
            <button type="button" class="modal-close-btn" onclick="closeModal('faculty-dynamic-confirm-modal')" aria-label="Close">&times;</button>
          </div>
          <div class="modal-body" id="faculty-confirm-message" style="font-size:0.95rem;line-height:1.5;"></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" id="faculty-confirm-cancel-btn">${cancelText}</button>
            <button type="button" class="btn btn-${variant} btn-sm" id="faculty-confirm-ok-btn">${confirmText}</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    document.getElementById('faculty-confirm-title').textContent = title;
    document.getElementById('faculty-confirm-message').textContent = message;
    const okBtn = document.getElementById('faculty-confirm-ok-btn');
    const cancelBtn = document.getElementById('faculty-confirm-cancel-btn');

    okBtn.className = `btn btn-${variant} btn-sm`;
    okBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    const cleanup = () => {
      closeModal('faculty-dynamic-confirm-modal');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    okBtn.onclick = () => {
      cleanup();
      try { onConfirm(); } catch (err) { console.error(err); }
    };
    cancelBtn.onclick = cleanup;

    openModal('faculty-dynamic-confirm-modal');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalDismissal);
  } else {
    initModalDismissal();
  }

  // Export to global scope
  window.escapeHtml = escapeHtml;
  window.esc = escapeHtml;
  window.showToast = showToast;
  window.facultyToast = showToast;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.confirmAction = confirmAction;
  window.FacultyUI = {
    escapeHtml,
    esc: escapeHtml,
    showToast,
    openModal,
    closeModal,
    confirmAction
  };
})();

