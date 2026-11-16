/**
 * VidyaOS Public Auth UI Helpers (Isolated for /login)
 */
(function () {
  'use strict';
  function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;display:flex;flex-direction:column;gap:0.6rem;z-index:99999;max-width:400px;pointer-events:none;';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = 'pointer-events:auto;margin-bottom:8px;padding:10px 16px;border-radius:6px;font-size:0.875rem;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,0.18);';
    toast.style.background = type === 'error' ? 'var(--status-absent, #ef4444)' : (type === 'success' ? 'var(--status-present, #22c55e)' : 'var(--color-primary, #2563eb)');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }
  window.showToast = showToast;
})();
