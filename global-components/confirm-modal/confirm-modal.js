/**
 * ══════════════════════════════════════════════════════════════
 * GLOBAL CONFIRM & SAFETY MODAL COMPONENT (confirm-modal.js)
 * VidyaOS Global UI Component Suite
 * Location: /global-components/confirm-modal/
 * ══════════════════════════════════════════════════════════════
 */

(function (global) {
  'use strict';

  let modalBackdrop = null;
  let activeOptions = null;
  let activeResolve = null;

  const ICONS = {
    trash: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    warning: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    user: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>`,
    info: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    check: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
  };

  function ensureStyles() {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('global-confirm-modal-css')) {
      const link = document.createElement('link');
      link.id = 'global-confirm-modal-css';
      link.rel = 'stylesheet';
      link.href = '/global-components/confirm-modal/confirm-modal.css?v=20261122';
      document.head.appendChild(link);
    }
  }

  function getModalDOM() {
    if (modalBackdrop && document.body.contains(modalBackdrop)) {
      return modalBackdrop;
    }

    ensureStyles();

    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'global-confirm-modal-root';
    modalBackdrop.className = 'g-confirm-backdrop';
    modalBackdrop.setAttribute('role', 'dialog');
    modalBackdrop.setAttribute('aria-modal', 'true');
    modalBackdrop.setAttribute('aria-hidden', 'true');

    modalBackdrop.innerHTML = `
      <div class="g-confirm-card" onclick="event.stopPropagation()">
        <div class="g-confirm-icon-badge" id="g-confirm-icon-badge"></div>
        <h3 class="g-confirm-title" id="g-confirm-title"></h3>
        <p class="g-confirm-message" id="g-confirm-message"></p>

        <div class="g-confirm-unlock-box" id="g-confirm-unlock-box" style="display: none;">
          <label class="g-confirm-unlock-label" id="g-confirm-unlock-label" for="g-confirm-input"></label>
          <input type="text" class="g-confirm-input" id="g-confirm-input" autocomplete="off" />
        </div>

        <div class="g-confirm-error" id="g-confirm-error"></div>

        <div class="g-confirm-actions">
          <button type="button" class="g-confirm-btn g-confirm-btn-cancel" id="g-confirm-cancel-btn">Cancel</button>
          <button type="button" class="g-confirm-btn g-confirm-btn-confirm" id="g-confirm-submit-btn">Confirm</button>
        </div>
      </div>
    `;

    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop && activeOptions && !activeOptions.preventBackdropClose) {
        close(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (modalBackdrop && modalBackdrop.classList.contains('active')) {
        if (e.key === 'Escape') {
          e.preventDefault();
          close(false);
        }
      }
    });

    document.body.appendChild(modalBackdrop);
    return modalBackdrop;
  }

  function close(result = false) {
    if (modalBackdrop) {
      if (document.activeElement && modalBackdrop.contains(document.activeElement)) {
        if (typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }
        if (document.body && typeof document.body.focus === 'function') {
          document.body.focus();
        }
      }
      modalBackdrop.setAttribute('inert', '');
      modalBackdrop.classList.remove('active');
      modalBackdrop.setAttribute('aria-hidden', 'true');
    }

    const res = activeResolve;
    const opts = activeOptions;
    activeResolve = null;
    activeOptions = null;

    if (opts) {
      if (result && typeof opts.onSuccess === 'function') {
        opts.onSuccess();
      } else if (!result && typeof opts.onCancel === 'function') {
        opts.onCancel();
      }
    }

    if (res) {
      res(result);
    }
  }

  function open(options = {}) {
    return new Promise((resolve) => {
      activeResolve = resolve;
      activeOptions = options;

      const dom = getModalDOM();
      const badge = dom.querySelector('#g-confirm-icon-badge');
      const titleEl = dom.querySelector('#g-confirm-title');
      const msgEl = dom.querySelector('#g-confirm-message');
      const unlockBox = dom.querySelector('#g-confirm-unlock-box');
      const unlockLabel = dom.querySelector('#g-confirm-unlock-label');
      const inputEl = dom.querySelector('#g-confirm-input');
      const errorEl = dom.querySelector('#g-confirm-error');
      const cancelBtn = dom.querySelector('#g-confirm-cancel-btn');
      const submitBtn = dom.querySelector('#g-confirm-submit-btn');

      // Clear error
      errorEl.style.display = 'none';
      errorEl.textContent = '';

      // Determine variant (danger, warning, primary, info, success)
      const variant = options.variant || options.type || (options.isDanger ? 'danger' : 'primary');
      const iconKey = options.icon || (variant === 'danger' ? 'trash' : variant === 'warning' ? 'warning' : 'info');

      // Icon badge
      badge.className = `g-confirm-icon-badge ${variant}`;
      badge.innerHTML = ICONS[iconKey] || options.iconSvg || ICONS.info;

      // Title & Message
      titleEl.className = `g-confirm-title ${variant === 'danger' ? 'danger' : ''}`;
      titleEl.textContent = options.title || 'Confirm Action';
      msgEl.innerHTML = options.message || options.text || 'Are you sure you want to proceed?';

      // Unlock Keyword or Prompt Input
      const keyword = (options.confirmKeyword || options.keyword || '').trim().toUpperCase();
      const isPrompt = Boolean(options.isPrompt);

      if (keyword) {
        unlockBox.style.display = 'block';
        unlockLabel.innerHTML = options.keywordLabel || `Type <code class="g-confirm-kw-pill ${variant}">${keyword}</code> to unlock:`;
        inputEl.className = 'g-confirm-input';
        inputEl.placeholder = options.keywordPlaceholder || `Type ${keyword}`;
        inputEl.value = '';
        inputEl.style.display = 'block';

        // Submit button starts locked
        submitBtn.disabled = true;
      } else if (isPrompt) {
        unlockBox.style.display = 'block';
        unlockLabel.textContent = options.promptLabel || options.inputLabel || 'Reason / Details:';
        inputEl.className = 'g-confirm-input prompt-mode';
        inputEl.placeholder = options.promptPlaceholder || options.placeholder || 'Enter details...';
        inputEl.value = options.defaultValue || '';
        inputEl.style.display = 'block';

        submitBtn.disabled = false;
      } else {
        unlockBox.style.display = 'none';
        inputEl.value = '';
        submitBtn.disabled = false;
      }

      // Buttons text & variants
      cancelBtn.textContent = options.cancelText || 'Cancel';
      submitBtn.textContent = options.confirmText || 'Confirm';
      submitBtn.className = `g-confirm-btn g-confirm-btn-confirm ${variant}`;

      // Live validation for keyword
      inputEl.oninput = () => {
        if (keyword) {
          const val = inputEl.value.trim().toUpperCase();
          if (val === keyword) {
            submitBtn.disabled = false;
          } else {
            submitBtn.disabled = true;
          }
        }
      };

      inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (!submitBtn.disabled) {
            submitBtn.click();
          }
        }
      };

      // Button clicks
      cancelBtn.onclick = () => close(false);

      submitBtn.onclick = async () => {
        if (keyword) {
          const val = inputEl.value.trim().toUpperCase();
          if (val !== keyword) {
            errorEl.textContent = `Please type ${keyword} to confirm.`;
            errorEl.style.display = 'block';
            return;
          }
        }

        const inputVal = inputEl.value.trim();

        if (typeof options.onConfirm === 'function') {
          try {
            submitBtn.disabled = true;
            const originalText = submitBtn.textContent;
            submitBtn.textContent = options.loadingText || 'Processing...';

            await options.onConfirm(inputVal);
            close(isPrompt ? inputVal : true);
          } catch (err) {
            errorEl.textContent = err.message || 'Operation failed. Please try again.';
            errorEl.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = options.confirmText || 'Confirm';
          }
        } else {
          close(isPrompt ? inputVal : true);
        }
      };

      // Show modal
      dom.removeAttribute('inert');
      dom.classList.add('active');
      dom.setAttribute('aria-hidden', 'false');

      setTimeout(() => {
        if (keyword || isPrompt) {
          inputEl.focus();
        } else {
          submitBtn.focus();
        }
      }, 60);
    });
  }

  // Promise helpers
  function confirm(options = {}) {
    return open({
      ...options,
      isPrompt: false
    });
  }

  function prompt(options = {}) {
    return open({
      ...options,
      isPrompt: true
    });
  }

  const GlobalConfirmModal = {
    open,
    confirm,
    prompt,
    close: () => close(false)
  };

  // Export to global window
  global.GlobalConfirmModal = GlobalConfirmModal;

  // Convenient window bindings
  if (typeof window !== 'undefined') {
    window.GlobalConfirmModal = GlobalConfirmModal;
    window.showStyledConfirm = function (opts) {
      return GlobalConfirmModal.confirm(opts);
    };
    window.showStyledPrompt = function (opts) {
      return GlobalConfirmModal.prompt(opts);
    };
  }
})(typeof window !== 'undefined' ? window : this);
