/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS ADMIN UI UTILITIES (admin-ui.js)
 * Location: /frontend/admin/components/admin-ui.js
 * 
 * Provides isolated toast notifications & modal helpers for admin pages.
 * 100% self-contained inside /frontend/admin/ without calling /js/ui.js.
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
    let container = document.getElementById('admin-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'admin-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Universal Toast Notification for Admin Console
   * @param {string} message - Message text
   * @param {'success'|'error'|'info'|'warning'} type - Visual category
   * @param {number} duration - Display time in ms (default: 3500ms)
   */
  function showToast(message, type = 'info', duration = 3500) {
    if (!message) return;
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `admin-toast-item toast-${type}`;
    toast.textContent = message;

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
   * Accessible Modal Open / Close for Admin Console
   */
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('open', 'active');
    modal.style.display = 'flex';
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
      modal = modalId.target.closest('.modal-backdrop, .modal, .modal-overlay');
    } else if (modalId && modalId.nodeType) {
      modal = modalId;
    }
    if (!modal) return;
    modal.classList.remove('open', 'active');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  /**
   * Global modal dismissal listener (Backdrop click & Escape key)
   */
  function initModalDismissal() {
    document.addEventListener('click', (e) => {
      if (e.target && (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-overlay'))) {
        closeModal(e.target);
      }
      if (e.target && e.target.closest('[data-modal-close]')) {
        const modal = e.target.closest('.modal-backdrop, .modal, .modal-overlay');
        if (modal) closeModal(modal);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal-backdrop.open, .modal-backdrop.active, .modal.open, .modal-overlay.open');
        openModals.forEach(m => closeModal(m));
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalDismissal);
  } else {
    initModalDismissal();
  }

  // Bind to window for admin scripts
  window.escapeHtml = escapeHtml;
  window.escHtml = escapeHtml;
  window.esc = escapeHtml;
  window.showToast = showToast;
  window.adminToast = showToast;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.AdminUI = {
    escapeHtml,
    escHtml: escapeHtml,
    esc: escapeHtml,
    showToast,
    openModal,
    closeModal
  };
})();
