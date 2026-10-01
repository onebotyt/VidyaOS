/**
 * Shared UI Helpers & DOM Utilities
 * Location: /shared/js/ui.js
 */

/**
 * Global Toast Notification
 * @param {string} message - Text message
 * @param {'info'|'success'|'error'|'warning'} type - Toast type
 * @param {number} duration - Milliseconds before auto-dismiss (default 4000ms)
 */
function showToast(message, type = 'info', duration = 4000) {
  // Support both #toast-container and legacy #toast element
  let container = document.getElementById('toast-container');
  if (!container) {
    const legacyToast = document.getElementById('toast');
    if (legacyToast) {
      legacyToast.textContent = message;
      legacyToast.style.display = 'block';
      legacyToast.style.background = type === 'error' ? 'var(--status-absent)' : (type === 'success' ? 'var(--status-present)' : (type === 'warning' ? 'var(--status-late)' : 'var(--color-primary)'));
      legacyToast.style.color = 'var(--text-white)';
      clearTimeout(legacyToast._timeout);
      legacyToast._timeout = setTimeout(() => { legacyToast.style.display = 'none'; }, duration);
      return;
    }
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.animation = 'fadeIn 0.2s ease-out';
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/**
 * HTML Escaping utility to prevent XSS in template literals
 * @param {string} str
 */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Modal opener
 * @param {string} modalId
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
    // Trap focus / autofocus first input
    const firstInput = modal.querySelector('input:not([disabled]), select:not([disabled]), button:not([disabled])');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
  }
}

/**
 * Modal closer
 * @param {string} modalId
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

/**
 * Format ISO date to human readable date
 * @param {string} isoString
 */
function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return String(isoString);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format ISO time to HH:MM AM/PM
 * @param {string} isoString
 */
function formatTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return String(isoString);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format number to percentage string with color class
 * @param {number} num
 * @param {number} threshold (default 75)
 */
function formatPercentage(num, threshold = 75) {
  const val = Number(num) || 0;
  return {
    value: val.toFixed(1) + '%',
    isSafe: val >= threshold,
    className: val >= threshold ? 'text-success' : 'text-danger'
  };
}
