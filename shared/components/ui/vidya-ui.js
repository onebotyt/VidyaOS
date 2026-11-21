/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS UNIFIED DYNAMIC UI & COMPONENT ENGINE (vidya-ui.js)
 * Location: /shared/components/ui/vidya-ui.js
 * 
 * Declarative, React-like UI System in Pure Vanilla JS:
 * 1. VidyaUI.actionModal(options) / VidyaUI.confirm(options):
 *    - Dynamic action presets: 'delete', 'remove', 'transfer', 'inactive', 'trash', 'restore'
 *    - Mode A: Simple 1-click confirmation
 *    - Mode B: Type-to-confirm verification (e.g. requireConfirmText: 'DELETE' or itemName)
 *    - Mode C: Prompt with custom input/select (e.g. transfer destination, reason)
 * 2. VidyaUI.card.stat(props):
 *    - Reusable status / KPI metric cards
 * 3. VidyaUI.card.entity(props):
 *    - Reusable management profile cards (Faculty & Students roster)
 * 4. VidyaUI.card.classroom(props):
 *    - Reusable classroom cards (Teaching groups & student hubs)
 * 5. VidyaUI.toast(message, type, duration):
 *    - Universal toast alerts with stacking protection
 * 6. VidyaUI.modal.open(id) / VidyaUI.modal.close(id):
 *    - Accessible modal dialog controller
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /**
   * Safe HTML Escaping (Prevents XSS)
   */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getIcon(name, opts = {}) {
    if (window.VidyaIcons && typeof window.VidyaIcons.get === 'function') {
      return window.VidyaIcons.get(name, opts);
    }
    return '';
  }

  /**
   * Universal Toast Notification Container
   */
  function getToastContainer() {
    let container = document.getElementById('vidya-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'vidya-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function toast(message, type = 'info', duration = 3500) {
    if (!message) return;
    const container = getToastContainer();

    // Prevent duplicate spam
    const existing = Array.from(container.querySelectorAll('.vidya-toast-item'));
    existing.forEach(item => {
      if (item.getAttribute('data-msg') === String(message).trim()) {
        item.remove();
      }
    });

    if (existing.length >= 3 && existing[0]?.parentNode) {
      existing[0].remove();
    }

    const item = document.createElement('div');
    item.className = `vidya-toast-item toast-${type}`;
    item.setAttribute('data-msg', String(message).trim());

    let iconSvg = '';
    if (type === 'success') iconSvg = getIcon('check', { width: 16, height: 16 }) || '✓';
    else if (type === 'error' || type === 'warning') iconSvg = getIcon('alert', { width: 16, height: 16 }) || '⚠';
    else iconSvg = getIcon('bell', { width: 16, height: 16 }) || 'ℹ';

    item.innerHTML = `<span style="display:inline-flex;align-items:center;flex-shrink:0;">${iconSvg}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(item);

    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(-6px) scale(0.96)';
      setTimeout(() => {
        if (item.parentNode) item.parentNode.removeChild(item);
      }, 220);
    }, duration);
  }

  /**
   * Accessible Modal Open / Close
   */
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('open', 'active');
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea, button:not(.modal-close-btn)');
    if (firstInput) setTimeout(() => firstInput.focus(), 60);
  }

  function closeModal(modalId) {
    let modal = null;
    if (typeof modalId === 'string') {
      modal = document.getElementById(modalId);
    } else if (modalId && modalId.target) {
      modal = modalId.target.closest('.vidya-modal-backdrop, .modal-backdrop, .modal, .modal-overlay');
    } else if (modalId && modalId.nodeType) {
      modal = modalId;
    }
    if (!modal) return;
    modal.classList.remove('open', 'active');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';

    const remainingOpen = document.querySelectorAll('.vidya-modal-backdrop.open, .modal-backdrop.open, .modal.open');
    if (remainingOpen.length === 0) {
      document.body.style.overflow = '';
    }
  }

  /**
   * ══════════════════════════════════════════════════════════════
   * 1. DYNAMIC ACTION MODAL (Delete, Remove, Transfer, Inactive, Trash, Restore)
   * Supports: Simple Confirmation, Type-to-Confirm Verification, & Input Selection
   * ══════════════════════════════════════════════════════════════
   */
  const ACTION_PRESETS = {
    delete: {
      theme: 'danger',
      title: 'Delete Record',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
      confirmBtnClass: 'btn btn-danger',
      confirmText: 'Delete Permanently'
    },
    remove: {
      theme: 'warning',
      title: 'Remove Member',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>`,
      confirmBtnClass: 'btn btn-danger',
      confirmText: 'Remove'
    },
    transfer: {
      theme: 'primary',
      title: 'Transfer Record',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>`,
      confirmBtnClass: 'btn btn-primary',
      confirmText: 'Transfer'
    },
    inactive: {
      theme: 'warning',
      title: 'Deactivate Account',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="10" y1="15" x2="10" y2="9"></line><line x1="14" y1="15" x2="14" y2="9"></line></svg>`,
      confirmBtnClass: 'btn btn-secondary',
      confirmText: 'Deactivate'
    },
    trash: {
      theme: 'purple',
      title: 'Move to Trash Bin',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
      confirmBtnClass: 'btn btn-danger',
      confirmText: 'Move to Trash'
    },
    restore: {
      theme: 'emerald',
      title: 'Restore Record',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>`,
      confirmBtnClass: 'btn btn-primary',
      confirmText: 'Restore'
    }
  };

  function actionModal(options = {}) {
    return new Promise((resolve) => {
      const actionType = options.action || (options.type === 'danger' ? 'delete' : 'custom');
      const preset = ACTION_PRESETS[actionType] || ACTION_PRESETS.delete;

      const title = options.title || preset.title;
      const itemName = options.itemName || '';
      const message = options.message || (itemName ? `Are you sure you want to proceed with "${itemName}"?` : 'Are you sure you want to proceed?');
      const confirmText = options.confirmText || preset.confirmText;
      const cancelText = options.cancelText || 'Cancel';
      const theme = options.theme || preset.theme;
      const confirmBtnClass = preset.confirmBtnClass || 'btn btn-primary';
      const iconSvg = options.iconSvg || preset.icon;

      // Verification mode (e.g. user must type "DELETE" or item name)
      const requireText = options.requireConfirmText || options.requireText || null;
      const expectedKeyword = requireText === true ? (itemName || 'CONFIRM') : requireText;

      // Optional dynamic input field (e.g. select department or type reason)
      const inputConfig = options.input || null;

      const modalId = 'vidya-action-dynamic-modal';
      let existingModal = document.getElementById(modalId);
      if (existingModal) existingModal.remove();

      // Build Verification Markup if required
      let verifyMarkup = '';
      if (expectedKeyword) {
        verifyMarkup = `
          <div class="vidya-confirm-verify-box">
            <label class="vidya-confirm-verify-label" for="v-action-confirm-input">
              To proceed, please type <span class="vidya-confirm-verify-keyword">${escapeHtml(expectedKeyword)}</span> below:
            </label>
            <input type="text" class="vidya-confirm-input" id="v-action-confirm-input" autocomplete="off" placeholder="Type ${escapeHtml(expectedKeyword)} to confirm">
          </div>
        `;
      }

      // Build Input Markup if requested (e.g. for Transfer or Inactive reason)
      let customInputMarkup = '';
      if (inputConfig) {
        if (inputConfig.type === 'select' && Array.isArray(inputConfig.options)) {
          const optionsHtml = inputConfig.options.map(opt => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const label = typeof opt === 'object' ? opt.label : opt;
            return `<option value="${escapeHtml(val)}">${escapeHtml(label)}</option>`;
          }).join('');
          customInputMarkup = `
            <div class="vidya-dialog-input-group">
              <label class="vidya-confirm-verify-label" for="v-action-custom-input">${escapeHtml(inputConfig.label || 'Select Destination:')}</label>
              <select class="vidya-dialog-select" id="v-action-custom-input">
                ${optionsHtml}
              </select>
            </div>
          `;
        } else {
          customInputMarkup = `
            <div class="vidya-dialog-input-group">
              <label class="vidya-confirm-verify-label" for="v-action-custom-input">${escapeHtml(inputConfig.label || 'Notes / Reason:')}</label>
              <input type="text" class="vidya-dialog-text-input" id="v-action-custom-input" placeholder="${escapeHtml(inputConfig.placeholder || 'Enter details')}">
            </div>
          `;
        }
      }

      const modalHtml = `
        <div class="vidya-modal-backdrop" id="${modalId}" role="dialog" aria-modal="true" aria-labelledby="v-action-title">
          <div class="vidya-modal-dialog">
            <div class="modal-body" style="padding: 1.5rem 1.25rem 1rem;">
              <div class="vidya-dialog-hero">
                <div class="vidya-dialog-icon-wrap ${theme}">
                  ${iconSvg}
                </div>
                <div style="flex:1;min-width:0;">
                  <h3 class="vidya-dialog-title" id="v-action-title">${escapeHtml(title)}</h3>
                  <p class="vidya-dialog-message">${escapeHtml(message)}</p>
                  ${itemName ? `<div class="vidya-dialog-item-chip">${escapeHtml(itemName)}</div>` : ''}
                </div>
              </div>
              ${verifyMarkup}
              ${customInputMarkup}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" id="v-action-cancel">${escapeHtml(cancelText)}</button>
              <button type="button" class="${confirmBtnClass} btn-sm" id="v-action-confirm" ${expectedKeyword ? 'disabled' : ''}>
                ${escapeHtml(confirmText)}
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);
      const modalEl = document.getElementById(modalId);
      const confirmBtn = document.getElementById('v-action-confirm');
      const cancelBtn = document.getElementById('v-action-cancel');
      const verifyInput = document.getElementById('v-action-confirm-input');
      const customInput = document.getElementById('v-action-custom-input');

      const cleanup = () => {
        closeModal(modalEl);
        setTimeout(() => modalEl.remove(), 250);
      };

      // Type-to-confirm input listener
      if (expectedKeyword && verifyInput) {
        verifyInput.addEventListener('input', (e) => {
          const val = e.target.value.trim();
          const matches = val.toLowerCase() === String(expectedKeyword).trim().toLowerCase();
          confirmBtn.disabled = !matches;
          if (matches) {
            verifyInput.classList.add('is-matched');
          } else {
            verifyInput.classList.remove('is-matched');
          }
        });

        verifyInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !confirmBtn.disabled) {
            e.preventDefault();
            confirmBtn.click();
          }
        });
      }

      cancelBtn.onclick = () => {
        cleanup();
        if (typeof options.onCancel === 'function') options.onCancel();
        resolve(false);
      };

      confirmBtn.onclick = async () => {
        const inputVal = customInput ? customInput.value : (verifyInput ? verifyInput.value : true);
        cleanup();
        if (typeof options.onConfirm === 'function') {
          await options.onConfirm(inputVal);
        }
        resolve(inputVal);
      };

      openModal(modalId);
      if (verifyInput) setTimeout(() => verifyInput.focus(), 80);
      else if (customInput) setTimeout(() => customInput.focus(), 80);
    });
  }

  /**
   * Specialized Action Modal Shortcuts
   */
  function deleteConfirm(options = {}) {
    return actionModal({
      action: 'delete',
      ...options
    });
  }

  function removeConfirm(options = {}) {
    return actionModal({
      action: 'remove',
      ...options
    });
  }

  function transferConfirm(options = {}) {
    return actionModal({
      action: 'transfer',
      ...options
    });
  }

  function inactiveConfirm(options = {}) {
    return actionModal({
      action: 'inactive',
      ...options
    });
  }

  /**
   * ══════════════════════════════════════════════════════════════
   * 2. DYNAMIC STATUS / METRIC CARD COMPONENT (VidyaUI.card.stat)
   * ══════════════════════════════════════════════════════════════
   */
  function renderStatCard(props = {}) {
    const title = props.title || 'Metric';
    const value = props.value ?? '—';
    const subtext = props.subtext || '';
    const variant = props.variant || 'primary';
    const iconName = props.icon || 'dashboard';
    const iconSvg = getIcon(iconName, { width: 18, height: 18 });
    const trend = props.trend || null;

    let trendHtml = '';
    if (trend) {
      const isUp = trend.direction === 'up';
      trendHtml = `<span class="vidya-stat-trend ${isUp ? 'up' : 'down'}">${isUp ? '↑' : '↓'} ${escapeHtml(trend.text || trend.value)}</span>`;
    }

    const clickAttr = props.onClick ? 'style="cursor:pointer;"' : '';

    return `
      <div class="vidya-stat-card" data-stat="${escapeHtml(title)}" ${clickAttr}>
        <div class="vidya-stat-card-top">
          <span class="vidya-stat-title">${escapeHtml(title)}</span>
          <div class="vidya-stat-icon-pill ${variant}">${iconSvg}</div>
        </div>
        <div class="vidya-stat-value">${escapeHtml(String(value))}</div>
        ${(subtext || trendHtml) ? `<div class="vidya-stat-subtext">${trendHtml} <span>${escapeHtml(subtext)}</span></div>` : ''}
      </div>
    `.trim();
  }

  /**
   * ══════════════════════════════════════════════════════════════
   * 3. DYNAMIC MANAGEMENT ENTITY CARD (VidyaUI.card.entity)
   * Used for Faculty Management, Student Roster, HOD listings
   * ══════════════════════════════════════════════════════════════
   */
  function renderEntityCard(props = {}) {
    const title = props.title || props.name || 'Member';
    const subtitle = props.subtitle || props.department || '';
    const status = props.status || { label: 'ACTIVE', variant: 'success' };
    const tags = Array.isArray(props.tags) ? props.tags : [];
    const avatar = props.avatar || {};

    let avatarHtml = '';
    if (avatar.image) {
      avatarHtml = `<img src="${escapeHtml(avatar.image)}" alt="${escapeHtml(title)}">`;
    } else {
      const parts = title.replace(/^(dr\.|prof\.|mr\.|ms\.)\s+/i, '').trim().split(/\s+/);
      const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : (title[0] || 'M').toUpperCase();
      avatarHtml = `<span>${initials}</span>`;
    }

    const tagsHtml = tags.map(t => `<span class="vidya-entity-chip">${escapeHtml(t)}</span>`).join('');

    // Actions
    const actions = Array.isArray(props.actions) ? props.actions : [];
    const actionsHtml = actions.map((act, i) => {
      const btnVariant = act.variant ? `btn-${act.variant}` : 'btn-secondary';
      const icon = act.icon ? getIcon(act.icon, { width: 14, height: 14 }) : '';
      return `
        <button type="button" class="btn ${btnVariant} btn-sm" data-action-index="${i}" title="${escapeHtml(act.label)}">
          ${icon} <span>${escapeHtml(act.label)}</span>
        </button>
      `;
    }).join('');

    const statusBadgeCls = status.variant ? `badge-${status.variant}` : 'badge-primary';

    return `
      <div class="vidya-entity-card" data-entity-id="${escapeHtml(String(props.id || ''))}">
        <div class="vidya-entity-header">
          <div class="vidya-entity-avatar">${avatarHtml}</div>
          <div class="vidya-entity-meta">
            <h4 class="vidya-entity-name">${escapeHtml(title)}</h4>
            <div class="vidya-entity-subtitle">${escapeHtml(subtitle)}</div>
          </div>
          <span class="badge ${statusBadgeCls}">${escapeHtml(status.label)}</span>
        </div>
        ${tags.length ? `<div class="vidya-entity-chips">${tagsHtml}</div>` : ''}
        ${actions.length ? `<div class="vidya-entity-actions">${actionsHtml}</div>` : ''}
      </div>
    `.trim();
  }

  /**
   * ══════════════════════════════════════════════════════════════
   * 4. DYNAMIC CLASSROOM CARD (VidyaUI.card.classroom)
   * Used for Faculty Classroom and Student Dashboard
   * ══════════════════════════════════════════════════════════════
   */
  function renderClassroomCard(props = {}) {
    const id = props.id || '';
    const title = props.title || props.name || 'Classroom';
    const code = props.code || `CLS-${id}`;
    const teacher = props.teacher || props.instructor || '';
    const semester = props.semester || '';
    const stats = Array.isArray(props.stats) ? props.stats : [];
    const actions = Array.isArray(props.actions) ? props.actions : [];

    const statsHtml = stats.map(s => `
      <div>
        <span style="display:block;font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">${escapeHtml(s.label)}</span>
        <strong style="font-size:0.95rem;color:var(--text-main);">${escapeHtml(String(s.value))}</strong>
      </div>
    `).join('');

    const actionsHtml = actions.map(act => {
      const cls = act.primary ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
      const icon = act.icon ? getIcon(act.icon, { width: 14, height: 14 }) : '';
      if (act.href) {
        return `<a href="${act.href}" class="${cls}">${icon} <span>${escapeHtml(act.label)}</span></a>`;
      }
      return `<button type="button" class="${cls}">${icon} <span>${escapeHtml(act.label)}</span></button>`;
    }).join('');

    return `
      <div class="vidya-classroom-card" data-classroom-id="${escapeHtml(String(id))}">
        <div class="vidya-classroom-card-banner">
          <span class="vidya-classroom-code-chip">${escapeHtml(code)}</span>
          <h3 class="vidya-classroom-title">${escapeHtml(title)}</h3>
          ${teacher ? `<div class="vidya-classroom-teacher">${escapeHtml(teacher)} • ${escapeHtml(semester)}</div>` : ''}
        </div>
        <div class="vidya-classroom-body">
          ${stats.length ? `<div class="vidya-classroom-stats">${statsHtml}</div>` : ''}
          ${actions.length ? `<div class="vidya-classroom-footer">${actionsHtml}</div>` : ''}
        </div>
      </div>
    `.trim();
  }

  /**
   * Modal Global Dismissal Listeners
   */
  function initModalDismissal() {
    document.addEventListener('click', (e) => {
      if (e.target && (e.target.classList.contains('vidya-modal-backdrop') || e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-overlay'))) {
        closeModal(e.target);
      }
      if (e.target && e.target.closest('[data-modal-close]')) {
        const modal = e.target.closest('.vidya-modal-backdrop, .modal-backdrop, .modal, .modal-overlay');
        if (modal) closeModal(modal);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.vidya-modal-backdrop.open, .modal-backdrop.open, .modal.open');
        openModals.forEach(m => closeModal(m));
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalDismissal);
  } else {
    initModalDismissal();
  }

  // Unified API Object
  const VidyaUI = {
    toast,
    showToast: toast,
    modal: {
      open: openModal,
      close: closeModal
    },
    openModal,
    closeModal,
    actionModal,
    confirm: actionModal,
    deleteConfirm,
    removeConfirm,
    transferConfirm,
    inactiveConfirm,
    card: {
      stat: renderStatCard,
      entity: renderEntityCard,
      classroom: renderClassroomCard
    },
    renderStatCard,
    renderEntityCard,
    renderClassroomCard,
    escapeHtml,
    escHtml: escapeHtml,
    esc: escapeHtml
  };

  // Expose Globally and Backward Compatible Shims
  window.VidyaUI = VidyaUI;
  window.AdminUI = VidyaUI;
  window.FacultyUI = VidyaUI;
  window.StudentUI = VidyaUI;

  window.showToast = toast;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.escapeHtml = escapeHtml;
  window.escHtml = escapeHtml;
  window.esc = escapeHtml;

})();
