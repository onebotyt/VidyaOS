/**
 * Declarative Dynamic Dialog Controller (DEC-001)
 * Replaces hardcoded modals with schema-driven, accessible dialogs.
 */

import { Platform } from '../../core/platform.js';
import { getIcon } from '../../assets/icons/icons.js';

class DialogService {
  constructor() {
    this.container = null;
    this._activeBackHandler = null;
  }

  getContainer() {
    if (!this.container) {
      this.container = document.querySelector('#dialog-container');
    }
    return this.container;
  }

  close() {
    const el = this.getContainer();
    if (el) {
      el.classList.remove('active');
      el.innerHTML = '';
    }
    if (this._activeBackHandler) {
      Platform.offBackButton(this._activeBackHandler);
      this._activeBackHandler = null;
    }
  }

  confirm({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'primary', // 'primary' | 'danger'
    onConfirm = null,
    onCancel = null,
  }) {
    const container = this.getContainer();
    if (!container) return;

    Platform.hapticFeedback('medium');

    container.innerHTML = `
      <div class="dialog-card" role="dialog" aria-modal="true">
        <div class="dialog-header">
          <h3 class="dialog-title">${title}</h3>
          <button class="dialog-close-btn" id="dialog-btn-x">${getIcon('close')}</button>
        </div>
        <div class="dialog-body">
          <p>${message}</p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" id="dialog-btn-cancel">${cancelText}</button>
          <button class="btn btn-${confirmVariant}" id="dialog-btn-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    container.classList.add('active');

    const handleConfirm = () => {
      this.close();
      if (typeof onConfirm === 'function') onConfirm();
    };

    const handleCancel = () => {
      this.close();
      if (typeof onCancel === 'function') onCancel();
    };

    container.querySelector('#dialog-btn-confirm')?.addEventListener('click', handleConfirm);
    container.querySelector('#dialog-btn-cancel')?.addEventListener('click', handleCancel);
    container.querySelector('#dialog-btn-x')?.addEventListener('click', handleCancel);

    // Trap hardware back button on Android
    this._activeBackHandler = () => {
      handleCancel();
      return true; // prevent router navigation
    };
    Platform.onBackButton(this._activeBackHandler);
  }

  form({
    title = 'Edit Item',
    fields = [],
    initialValues = {},
    submitText = 'Save Changes',
    cancelText = 'Cancel',
    onSubmit = null,
  }) {
    const container = this.getContainer();
    if (!container) return;

    Platform.hapticFeedback('light');

    const fieldsHtml = fields.map(f => {
      const val = initialValues[f.name] !== undefined ? initialValues[f.name] : '';
      if (f.type === 'select') {
        const opts = (f.options || []).map(opt => {
          const optVal = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : opt;
          return `<option value="${optVal}" ${optVal == val ? 'selected' : ''}>${optLabel}</option>`;
        }).join('');

        return `
          <div class="form-group">
            <label class="form-label" for="field-${f.name}">${f.label} ${f.required ? '*' : ''}</label>
            <select class="form-select" id="field-${f.name}" name="${f.name}" ${f.required ? 'required' : ''}>
              ${opts}
            </select>
          </div>
        `;
      }

      if (f.type === 'textarea') {
        return `
          <div class="form-group">
            <label class="form-label" for="field-${f.name}">${f.label} ${f.required ? '*' : ''}</label>
            <textarea class="form-textarea" id="field-${f.name}" name="${f.name}" rows="${f.rows || 3}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''}>${val}</textarea>
          </div>
        `;
      }

      return `
        <div class="form-group">
          <label class="form-label" for="field-${f.name}">${f.label} ${f.required ? '*' : ''}</label>
          <input class="form-input" id="field-${f.name}" name="${f.name}" type="${f.type || 'text'}" value="${val}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''} />
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="dialog-card" role="dialog" aria-modal="true">
        <div class="dialog-header">
          <h3 class="dialog-title">${title}</h3>
          <button class="dialog-close-btn" id="dialog-form-x">${getIcon('close')}</button>
        </div>
        <form id="dialog-dynamic-form">
          <div class="dialog-body">
            ${fieldsHtml}
          </div>
          <div class="dialog-footer">
            <button type="button" class="btn btn-secondary" id="dialog-form-cancel">${cancelText}</button>
            <button type="submit" class="btn btn-primary" id="dialog-form-submit">${submitText}</button>
          </div>
        </form>
      </div>
    `;

    container.classList.add('active');

    const formEl = container.querySelector('#dialog-dynamic-form');
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(formEl);
      const values = {};
      for (const [key, val] of formData.entries()) {
        values[key] = val;
      }

      const submitBtn = container.querySelector('#dialog-form-submit');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
      }

      try {
        if (typeof onSubmit === 'function') {
          await onSubmit(values);
        }
        this.close();
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitText;
        }
      }
    });

    const handleCancel = () => this.close();
    container.querySelector('#dialog-form-cancel')?.addEventListener('click', handleCancel);
    container.querySelector('#dialog-form-x')?.addEventListener('click', handleCancel);

    this._activeBackHandler = () => {
      handleCancel();
      return true;
    };
    Platform.onBackButton(this._activeBackHandler);
  }
}

export const Dialog = new DialogService();
export default Dialog;
