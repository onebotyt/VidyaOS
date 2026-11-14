/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS STUDENT UI UTILITIES (student-ui.js)
 * Location: /frontend/student/components/student-ui.js
 * 
 * Provides isolated toast notifications & modal helpers for student pages.
 * 100% self-contained inside /frontend/student/ without calling outside globals.
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
    let container = document.getElementById('student-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'student-toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 1.25rem;
        z-index: 1100;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Universal Toast Notification for Student Portal
   * @param {string} message - Message text
   * @param {'success'|'error'|'info'|'warning'} type - Visual category
   * @param {number} duration - Display time in ms (default: 3500ms)
   */
  function showToast(message, type = 'info', duration = 3500) {
    if (!message) return;
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `student-toast-item toast-${type}`;
    toast.textContent = message;

    const bgMap = {
      success: 'hsl(142 71% 40%)',
      error: 'hsl(0 84% 55%)',
      warning: 'hsl(38 92% 45%)',
      info: 'hsl(217 82% 50%)'
    };

    toast.style.cssText = `
      background-color: ${bgMap[type] || bgMap.info};
      color: #ffffff;
      padding: 0.65rem 1rem;
      border-radius: var(--radius-md, 10px);
      box-shadow: var(--shadow-lg, 0 10px 15px rgba(0,0,0,0.1));
      font-size: 0.85rem;
      font-weight: 600;
      pointer-events: auto;
      max-width: 320px;
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      opacity: 0;
      transform: translateY(8px) scale(0.96);
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0) scale(1)';
    });

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

  function formatDate(d) {
    if (!d) return '—';
    try {
      const date = new Date(d);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {
      return String(d);
    }
  }

  function formatPercentage(num) {
    if (num === null || num === undefined || isNaN(num)) return '0%';
    return `${Math.round(Number(num))}%`;
  }

  // Exports
  window.showToast = showToast;
  window.escapeHtml = escapeHtml;
  window.formatDate = formatDate;
  window.formatPercentage = formatPercentage;
})();
