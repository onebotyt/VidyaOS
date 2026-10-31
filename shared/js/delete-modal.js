/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS REUSABLE DELETE CONFIRMATION MODAL (delete-modal.js)
 * Location: admin / faculty / student / shared
 * 
 * Provides a universal, highly secure delete confirmation box
 * that requires explicit keyword confirmation before unlocking.
 * ══════════════════════════════════════════════════════════════
 */

(function (root) {
  'use strict';

  let modalBackdrop = null;
  let activeOptions = null;
  let resolvePromise = null;

  /**
   * Automatically ensure stylesheet is injected
   */
  function ensureStyles() {
    if (typeof document === 'undefined') return;
    const existing = document.querySelector('link[data-vidya-delete-modal="true"]');
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.setAttribute('data-vidya-delete-modal', 'true');

      // Resolve relative to current portal or fallback to shared
      const path = window.location.pathname || '';
      if (path.startsWith('/admin')) {
        link.href = '/admin/components/delete-modal/delete-modal.css';
      } else if (path.startsWith('/faculty')) {
        link.href = '/faculty/components/delete-modal/delete-modal.css';
      } else if (path.startsWith('/student')) {
        link.href = '/student/components/delete-modal/delete-modal.css';
      } else {
        link.href = '/shared/css/delete-modal.css';
      }
      document.head.appendChild(link);
    }
  }

  /**
   * Helper SVG icons
   */
  const ICONS = {
    trash: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
    targetTrash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`
  };

  /**
   * Build or retrieve DOM Modal structure
   */
  function getModalDOM() {
    if (document.getElementById('vidya-delete-modal-root')) {
      modalBackdrop = document.getElementById('vidya-delete-modal-root');
      return modalBackdrop;
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'vidya-delete-modal-root';
    backdrop.className = 'v-delete-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-hidden', 'true');

    backdrop.innerHTML = `
      <div class="v-delete-card" onclick="event.stopPropagation()">
        <!-- Header -->
        <div class="v-delete-header">
          <div class="v-delete-header-left">
            <div class="v-delete-icon-badge">
              ${ICONS.trash}
            </div>
            <div class="v-delete-title-group">
              <h3 class="v-delete-title" id="v-delete-title">Confirm Deletion</h3>
              <p class="v-delete-subtitle" id="v-delete-subtitle">Irreversible system action</p>
            </div>
          </div>
          <button type="button" class="v-delete-close-btn" id="v-delete-close-btn" aria-label="Close dialog">
            ${ICONS.close}
          </button>
        </div>

        <!-- Body -->
        <div class="v-delete-body">
          <div class="v-delete-callout">
            <div class="v-delete-target-pill">
              <span class="v-delete-target-icon">${ICONS.targetTrash}</span>
              <span id="v-delete-item-name">Selected Item</span>
            </div>
            <p class="v-delete-warning-text" id="v-delete-message">
              Are you sure you want to delete this record? This action cannot be undone.
            </p>
          </div>

          <div class="v-delete-input-group">
            <label class="v-delete-label" for="v-delete-confirmation-input">
              To verify, type <strong class="v-delete-keyword-tag" id="v-delete-keyword-display">DELETE</strong> below:
            </label>
            <div class="v-delete-input-wrapper">
              <input type="text"
                class="v-delete-input"
                id="v-delete-confirmation-input"
                placeholder="Type DELETE to confirm"
                autocomplete="off"
                spellcheck="false">
              <span class="v-delete-input-status-icon" aria-hidden="true">
                ${ICONS.check}
              </span>
            </div>
            <span class="v-delete-feedback" id="v-delete-feedback">Please enter the confirmation text</span>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="v-delete-footer">
          <button type="button" class="v-delete-btn v-delete-btn-cancel" id="v-delete-cancel-btn">
            Cancel
          </button>
          <button type="button" class="v-delete-btn v-delete-btn-danger" id="v-delete-confirm-btn" disabled>
            <span id="v-delete-confirm-btn-text">Permanently Delete</span>
          </button>
        </div>
      </div>
    `;

    // Dismiss on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeDeleteModal(false);
      }
    });

    document.body.appendChild(backdrop);
    modalBackdrop = backdrop;

    // Attach listeners
    const closeBtn = document.getElementById('v-delete-close-btn');
    const cancelBtn = document.getElementById('v-delete-cancel-btn');
    const confirmBtn = document.getElementById('v-delete-confirm-btn');
    const input = document.getElementById('v-delete-confirmation-input');

    if (closeBtn) closeBtn.onclick = () => closeDeleteModal(false);
    if (cancelBtn) cancelBtn.onclick = () => closeDeleteModal(false);

    if (input) {
      input.addEventListener('input', handleInputChange);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !confirmBtn.disabled) {
          e.preventDefault();
          executeConfirm();
        }
      });
    }

    if (confirmBtn) {
      confirmBtn.onclick = executeConfirm;
    }

    return modalBackdrop;
  }

  /**
   * Handle real-time user input validation
   */
  function handleInputChange() {
    if (!activeOptions) return;
    const input = document.getElementById('v-delete-confirmation-input');
    const confirmBtn = document.getElementById('v-delete-confirm-btn');
    const feedback = document.getElementById('v-delete-feedback');
    if (!input || !confirmBtn || !feedback) return;

    const val = input.value.trim();
    const expected = (activeOptions.confirmKeyword || 'DELETE').trim();
    const isStrict = Boolean(activeOptions.strictCase);

    const isMatched = isStrict ? (val === expected) : (val.toUpperCase() === expected.toUpperCase());

    if (val === '') {
      input.classList.remove('matched');
      confirmBtn.disabled = true;
      feedback.textContent = `Type "${expected}" to unlock delete button`;
      feedback.classList.remove('matched');
    } else if (isMatched) {
      input.classList.add('matched');
      confirmBtn.disabled = false;
      feedback.textContent = `Confirmation text matched`;
      feedback.classList.add('matched');
    } else {
      input.classList.remove('matched');
      confirmBtn.disabled = true;
      feedback.textContent = `Text does not match ("${expected}")`;
      feedback.classList.remove('matched');
    }
  }

  /**
   * Execute confirmation action
   */
  async function executeConfirm() {
    const confirmBtn = document.getElementById('v-delete-confirm-btn');
    const cancelBtn = document.getElementById('v-delete-cancel-btn');
    const closeBtn = document.getElementById('v-delete-close-btn');
    const btnText = document.getElementById('v-delete-confirm-btn-text');

    if (!confirmBtn || confirmBtn.disabled) return;

    confirmBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    if (closeBtn) closeBtn.disabled = true;

    const originalText = btnText ? btnText.textContent : 'Permanently Delete';
    if (btnText) {
      btnText.innerHTML = `<span class="v-delete-spinner"></span> <span>Deleting...</span>`;
    }

    try {
      if (typeof activeOptions.onConfirm === 'function') {
        await activeOptions.onConfirm();
      }

      const res = resolvePromise;
      closeDeleteModal(true);
      if (typeof res === 'function') res(true);

    } catch (err) {
      console.error('[VidyaDeleteModal] Deletion failed:', err);
      confirmBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      if (closeBtn) closeBtn.disabled = false;
      if (btnText) btnText.textContent = originalText;

      const feedback = document.getElementById('v-delete-feedback');
      if (feedback) {
        feedback.textContent = err.message || 'Deletion failed. Please try again.';
        feedback.style.color = 'var(--status-absent)';
      }

      if (typeof window.showToast === 'function') {
        window.showToast(err.message || 'Failed to complete deletion.', 'error');
      }
    }
  }

  /**
   * Dismiss modal and clean up state
   */
  function closeDeleteModal(wasConfirmed = false) {
    if (!modalBackdrop) {
      modalBackdrop = document.getElementById('vidya-delete-modal-root');
    }
    if (modalBackdrop) {
      modalBackdrop.classList.remove('open', 'active');
      modalBackdrop.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';

    const input = document.getElementById('v-delete-confirmation-input');
    if (input) {
      input.value = '';
      input.classList.remove('matched');
    }

    const confirmBtn = document.getElementById('v-delete-confirm-btn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
    }

    if (!wasConfirmed && typeof resolvePromise === 'function') {
      resolvePromise(false);
    }

    resolvePromise = null;
    activeOptions = null;
  }

  /**
   * Escape key listener
   */
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalBackdrop && modalBackdrop.classList.contains('open')) {
        closeDeleteModal(false);
      }
    });
  }

  /**
   * Open Delete Modal with configuration options
   * 
   * @param {Object} options
   *   title: Header title (default: 'Confirm Deletion')
   *   subtitle: Small header subtitle (default: 'Irreversible system action')
   *   itemName: Name of target being deleted (e.g., 'Information Technology')
   *   message: Warning message text
   *   confirmKeyword: Text user must type to confirm (default: 'DELETE')
   *   strictCase: boolean (default: false)
   *   confirmButtonText: Text on danger button (default: 'Permanently Delete')
   *   onConfirm: Async callback executed upon confirmed button click
   * 
   * @returns {Promise<boolean>}
   */
  function openDeleteModal(options = {}) {
    ensureStyles();
    getModalDOM();

    activeOptions = {
      title: options.title || 'Confirm Deletion',
      subtitle: options.subtitle || 'Irreversible system action',
      itemName: options.itemName || options.name || 'Selected Record',
      message: options.message || 'Are you sure you want to delete this record? This action cannot be undone.',
      confirmKeyword: options.confirmKeyword || options.keyword || 'DELETE',
      strictCase: Boolean(options.strictCase),
      confirmButtonText: options.confirmButtonText || options.confirmText || 'Permanently Delete',
      onConfirm: options.onConfirm || null
    };

    const titleEl = document.getElementById('v-delete-title');
    const subtitleEl = document.getElementById('v-delete-subtitle');
    const itemEl = document.getElementById('v-delete-item-name');
    const msgEl = document.getElementById('v-delete-message');
    const keywordEl = document.getElementById('v-delete-keyword-display');
    const input = document.getElementById('v-delete-confirmation-input');
    const feedback = document.getElementById('v-delete-feedback');
    const btnText = document.getElementById('v-delete-confirm-btn-text');
    const confirmBtn = document.getElementById('v-delete-confirm-btn');
    const cancelBtn = document.getElementById('v-delete-cancel-btn');
    const closeBtn = document.getElementById('v-delete-close-btn');

    if (titleEl) titleEl.textContent = activeOptions.title;
    if (subtitleEl) subtitleEl.textContent = activeOptions.subtitle;
    if (itemEl) itemEl.textContent = activeOptions.itemName;
    if (msgEl) msgEl.innerHTML = activeOptions.message;
    if (keywordEl) keywordEl.textContent = activeOptions.confirmKeyword;

    if (btnText) btnText.textContent = activeOptions.confirmButtonText;
    if (confirmBtn) confirmBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = false;
    if (closeBtn) closeBtn.disabled = false;

    if (input) {
      input.value = '';
      input.classList.remove('matched');
      input.placeholder = `Type ${activeOptions.confirmKeyword} to confirm`;
    }

    if (feedback) {
      feedback.textContent = `Please enter the confirmation text`;
      feedback.classList.remove('matched');
      feedback.style.color = '';
    }

    document.body.style.overflow = 'hidden';

    // Show modal
    requestAnimationFrame(() => {
      modalBackdrop.classList.add('open', 'active');
      modalBackdrop.setAttribute('aria-hidden', 'false');
      if (input) {
        setTimeout(() => input.focus(), 80);
      }
    });

    return new Promise((resolve) => {
      resolvePromise = resolve;
    });
  }

  // Export globally
  const DeleteModalComponent = {
    open: openDeleteModal,
    confirm: openDeleteModal,
    close: closeDeleteModal
  };

  root.VidyaDeleteModal = DeleteModalComponent;
  root.openDeleteModal = openDeleteModal;
  root.confirmDelete = openDeleteModal;

})(typeof window !== 'undefined' ? window : this);
