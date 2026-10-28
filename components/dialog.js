/**
 * VidyaOS Reusable Dialog & Modal Engine
 * Location: /components/dialog.js
 *
 * Provides declarative, zero-markup dynamic modals:
 *  - ConfirmDialog(options) / openConfirm(options)
 *  - DynamicFormDialog(options) / openDynamicForm(options)
 *  - openDetailDialog(options)
 *
 * Replaces repetitive modal HTML across 30+ pages, reducing template code by ~70%.
 */

(function (window) {
  'use strict';

  let activeDialog = null;

  function trapFocus(dialogEl) {
    const focusable = dialogEl.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    setTimeout(() => first.focus(), 50);

    dialogEl.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === 'Escape') {
        closeActiveDialog();
      }
    });
  }

  function closeActiveDialog() {
    if (!activeDialog) return;
    activeDialog.classList.remove('open');
    document.body.classList.remove('modal-open');
    setTimeout(() => {
      if (activeDialog && activeDialog.parentNode) {
        activeDialog.parentNode.removeChild(activeDialog);
      }
      activeDialog = null;
    }, 200);
  }

  /**
   * Open a Dynamic Schema-Driven Form Dialog
   * @param {Object} opts
   * @param {string} opts.title - Modal title
   * @param {string} [opts.subtitle] - Modal subtitle / helper text
   * @param {Array<{name: string, label: string, type: string, required?: boolean, options?: Array<any>, placeholder?: string, help?: string, uppercase?: boolean}>} opts.fields
   * @param {Object} [opts.initialValues] - Existing values for editing
   * @param {string} [opts.submitLabel] - Label for submit button (default: 'Save')
   * @param {string} [opts.submitVariant] - 'primary' | 'danger' (default: 'primary')
   * @param {Function} opts.onSubmit - Async callback receiving form values object
   */
  function openDynamicForm(opts) {
    closeActiveDialog();

    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop open';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', opts.title || 'Form Dialog');

    const fieldsHtml = (opts.fields || []).map((f) => {
      const val = opts.initialValues && opts.initialValues[f.name] !== undefined ? opts.initialValues[f.name] : '';
      const reqStar = f.required ? '<span style="color:var(--status-absent);margin-left:2px;">*</span>' : '';
      const hint = f.help ? `<span class="form-hint">${f.help}</span>` : '';

      if (f.type === 'select') {
        const optionsHtml = (f.options || []).map((opt) => {
          const optVal = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : opt;
          const isSelected = String(val) === String(optVal) ? 'selected' : '';
          return `<option value="${optVal}" ${isSelected}>${optLabel}</option>`;
        }).join('');

        return `
          <div class="form-group" style="margin-bottom:1rem;">
            <label class="form-label" for="df-${f.name}">${f.label} ${reqStar}</label>
            <select class="form-control" id="df-${f.name}" name="${f.name}" ${f.required ? 'required' : ''}>
              ${f.placeholder ? `<option value="">${f.placeholder}</option>` : ''}
              ${optionsHtml}
            </select>
            ${hint}
          </div>
        `;
      }

      if (f.type === 'textarea') {
        return `
          <div class="form-group" style="margin-bottom:1rem;">
            <label class="form-label" for="df-${f.name}">${f.label} ${reqStar}</label>
            <textarea class="form-control" id="df-${f.name}" name="${f.name}" rows="${f.rows || 3}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''}>${val}</textarea>
            ${hint}
          </div>
        `;
      }

      const upperStyle = f.uppercase ? 'text-transform:uppercase;font-family:var(--font-family-mono);' : '';

      return `
        <div class="form-group" style="margin-bottom:1rem;">
          <label class="form-label" for="df-${f.name}">${f.label} ${reqStar}</label>
          <input type="${f.type || 'text'}" class="form-control" id="df-${f.name}" name="${f.name}" value="${val}"
            placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''} style="${upperStyle}">
          ${hint}
        </div>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="modal-card" style="max-width:${opts.maxWidth || '520px'};width:94%;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" style="margin:0;font-size:1.15rem;font-weight:700;">${opts.title}</h3>
            ${opts.subtitle ? `<p style="margin:0.25rem 0 0;font-size:0.8125rem;color:var(--text-muted);">${opts.subtitle}</p>` : ''}
          </div>
          <button type="button" class="modal-close-btn" aria-label="Close dialog">&times;</button>
        </div>
        <form id="dynamic-form-inner" style="margin:0;">
          <div class="modal-body" style="max-height:68vh;overflow-y:auto;padding:1.25rem 1.5rem;">
            ${fieldsHtml}
          </div>
          <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:0.75rem;padding:1rem 1.5rem;border-top:1px solid var(--border-color);background:var(--bg-surface);">
            <button type="button" class="btn btn-secondary btn-cancel">Cancel</button>
            <button type="submit" class="btn btn-${opts.submitVariant || 'primary'}" id="df-submit-btn">${opts.submitLabel || 'Save'}</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');
    activeDialog = overlay;

    trapFocus(overlay);

    overlay.querySelector('.modal-close-btn').onclick = closeActiveDialog;
    overlay.querySelector('.btn-cancel').onclick = closeActiveDialog;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeActiveDialog();
    };

    const form = overlay.querySelector('#dynamic-form-inner');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = overlay.querySelector('#df-submit-btn');
      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Saving...';

      const formData = new FormData(form);
      const values = {};
      formData.forEach((val, key) => {
        values[key] = val;
      });

      try {
        if (opts.onSubmit) {
          const success = await opts.onSubmit(values, closeActiveDialog);
          if (success !== false) {
            closeActiveDialog();
          }
        } else {
          closeActiveDialog();
        }
      } catch (err) {
        console.error('[DynamicForm Error]', err);
        if (typeof window.showToast === 'function') {
          window.showToast(err.message || 'Operation failed', 'error');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      }
    };
  }

  /**
   * Open a Destructive / Action Confirmation Dialog
   * @param {Object} opts
   * @param {string} opts.title
   * @param {string} opts.message
   * @param {string} [opts.confirmText] - Button label (default: 'Delete')
   * @param {string} [opts.confirmVariant] - 'danger' | 'primary' (default: 'danger')
   * @param {string} [opts.requireTypedConfirm] - If set, user must type this exact string to confirm
   * @param {Function} opts.onConfirm - Callback when confirmed
   */
  function openConfirm(opts) {
    closeActiveDialog();

    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop open';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');

    const variant = opts.confirmVariant || 'danger';
    const isDanger = variant === 'danger';

    const iconSvg = isDanger
      ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--status-absent);"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
      : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary);"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

    const typedInputHtml = opts.requireTypedConfirm ? `
      <div style="margin-top:1rem;background:var(--bg-surface);padding:0.75rem 1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);">
        <label style="font-size:0.75rem;font-weight:700;display:block;margin-bottom:0.35rem;color:var(--text-main);">
          Please type <span style="font-family:var(--font-family-mono);color:var(--status-absent);">${opts.requireTypedConfirm}</span> to confirm:
        </label>
        <input type="text" id="confirm-type-input" class="form-control" autocomplete="off" placeholder="${opts.requireTypedConfirm}">
      </div>
    ` : '';

    overlay.innerHTML = `
      <div class="modal-card" style="max-width:440px;width:92%;">
        <div class="modal-body" style="padding:1.75rem 1.5rem 1.25rem;">
          <div style="display:flex;gap:1rem;align-items:flex-start;">
            <div style="width:44px;height:44px;border-radius:var(--radius-full);background:${isDanger ? 'var(--status-absent-bg)' : 'var(--bg-surface)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${iconSvg}
            </div>
            <div>
              <h3 style="margin:0 0 0.4rem 0;font-size:1.1rem;font-weight:700;color:var(--text-main);">${opts.title || 'Are you sure?'}</h3>
              <p style="margin:0;font-size:0.875rem;color:var(--text-muted);line-height:1.45;">${opts.message || 'This action cannot be undone.'}</p>
            </div>
          </div>
          ${typedInputHtml}
        </div>
        <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:0.65rem;padding:0.85rem 1.5rem 1.25rem;border:none;">
          <button type="button" class="btn btn-secondary btn-cancel">Cancel</button>
          <button type="button" class="btn btn-${variant}" id="confirm-action-btn" ${opts.requireTypedConfirm ? 'disabled' : ''}>
            ${opts.confirmText || (isDanger ? 'Delete' : 'Confirm')}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');
    activeDialog = overlay;

    trapFocus(overlay);

    overlay.querySelector('.btn-cancel').onclick = closeActiveDialog;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeActiveDialog();
    };

    const confirmBtn = overlay.querySelector('#confirm-action-btn');

    if (opts.requireTypedConfirm) {
      const input = overlay.querySelector('#confirm-type-input');
      input.oninput = () => {
        confirmBtn.disabled = input.value.trim() !== opts.requireTypedConfirm;
      };
    }

    confirmBtn.onclick = async () => {
      confirmBtn.disabled = true;
      const originalText = confirmBtn.innerHTML;
      confirmBtn.innerHTML = 'Processing...';

      try {
        if (opts.onConfirm) {
          const res = await opts.onConfirm(closeActiveDialog);
          if (res !== false) closeActiveDialog();
        } else {
          closeActiveDialog();
        }
      } catch (err) {
        console.error('[ConfirmDialog Error]', err);
        if (typeof window.showToast === 'function') {
          window.showToast(err.message || 'Action failed', 'error');
        }
      } finally {
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = originalText;
        }
      }
    };
  }

  /**
   * Open a JSON / Details Inspector Dialog
   * @param {Object} opts
   * @param {string} opts.title
   * @param {string} [opts.subtitle]
   * @param {Object|string} opts.content
   */
  function openDetailDialog(opts) {
    closeActiveDialog();

    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop open';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    let formattedContent = '';
    if (typeof opts.content === 'object') {
      formattedContent = `<pre style="background:var(--bg-surface);padding:1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);overflow-x:auto;font-family:var(--font-family-mono);font-size:0.8125rem;color:var(--text-main);max-height:55vh;">${JSON.stringify(opts.content, null, 2)}</pre>`;
    } else {
      formattedContent = `<div style="font-size:0.875rem;color:var(--text-main);line-height:1.5;">${opts.content}</div>`;
    }

    overlay.innerHTML = `
      <div class="modal-card" style="max-width:580px;width:94%;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" style="margin:0;font-size:1.15rem;font-weight:700;">${opts.title || 'Details'}</h3>
            ${opts.subtitle ? `<p style="margin:0.25rem 0 0;font-size:0.8125rem;color:var(--text-muted);">${opts.subtitle}</p>` : ''}
          </div>
          <button type="button" class="modal-close-btn" aria-label="Close dialog">&times;</button>
        </div>
        <div class="modal-body" style="padding:1.25rem 1.5rem;overflow-y:auto;max-height:65vh;">
          ${formattedContent}
        </div>
        <div class="modal-footer" style="display:flex;justify-content:flex-end;padding:0.85rem 1.5rem;border-top:1px solid var(--border-color);background:var(--bg-surface);">
          <button type="button" class="btn btn-secondary btn-close">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');
    activeDialog = overlay;

    trapFocus(overlay);

    overlay.querySelector('.modal-close-btn').onclick = closeActiveDialog;
    overlay.querySelector('.btn-close').onclick = closeActiveDialog;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeActiveDialog();
    };
  }

  // Export functions to global scope
  window.openDynamicForm = openDynamicForm;
  window.openConfirm = openConfirm;
  window.openDetailDialog = openDetailDialog;
  window.closeActiveDialog = closeActiveDialog;

  // React-like Component Aliases
  window.ConfirmDialog = openConfirm;
  window.DynamicFormDialog = openDynamicForm;
  window.DetailDialog = openDetailDialog;

})(typeof window !== 'undefined' ? window : this);
