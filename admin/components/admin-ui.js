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

  // Bind to window for admin scripts
  window.showToast = showToast;
  window.adminToast = showToast;
})();

