/**
 * ══════════════════════════════════════════════════════════════
 * COMPONENT: MODAL & BOTTOM SHEET (frontend/components/modal/modal.js)
 * Standardized Modal Controller Lifecycle & Focus Management
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  function getModalEl(idOrEl) {
    if (!idOrEl) return null;
    return typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  }

  function openModal(idOrEl) {
    const el = getModalEl(idOrEl);
    if (!el) return;
    el.classList.add('open');
    el.style.display = 'flex';
    document.body.classList.add('modal-open');

    // Auto-focus first input or action button
    const focusable = el.querySelector('input, select, textarea, button:not(.btn-secondary)');
    if (focusable) {
      setTimeout(() => focusable.focus(), 50);
    }
  }

  function closeModal(idOrEl) {
    const el = getModalEl(idOrEl);
    if (!el) return;
    el.classList.remove('open');
    el.style.display = 'none';

    // Remove modal-open if no other modals remain active
    if (!document.querySelector('.modal-backdrop.open')) {
      document.body.classList.remove('modal-open');
    }
  }

  // Global Keydown (Escape) Dismissal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModals = document.querySelectorAll('.modal-backdrop.open');
      openModals.forEach((m) => closeModal(m));
    }
  });

  // Global Backdrop Click Dismissal
  document.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('modal-backdrop')) {
      closeModal(e.target);
    }
  });

  // Expose to window
  window.openModal = openModal;
  window.closeModal = closeModal;
})();
