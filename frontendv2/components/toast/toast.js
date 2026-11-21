/**
 * Toast Notification Controller
 */

import { Bus } from '../../core/event-bus.js';
import { Platform } from '../../core/platform.js';
import { getIcon } from '../../assets/icons/icons.js';

export class ToastManager {
  constructor(container) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;

    Bus.on('toast:show', (opts) => this.show(opts));
  }

  show({ message, type = 'info', duration = 4000 }) {
    if (!this.container || !message) return;

    if (type === 'error') {
      Platform.hapticFeedback('error');
    } else if (type === 'success') {
      Platform.hapticFeedback('success');
    }

    let iconKey = 'info';
    if (type === 'success') iconKey = 'check';
    if (type === 'error' || type === 'warning') iconKey = 'alertCircle';

    const toastEl = document.createElement('div');
    toastEl.className = `toast-item toast-${type}`;
    toastEl.innerHTML = `
      <div class="toast-icon-wrap">${getIcon(iconKey)}</div>
      <div class="toast-message">${message}</div>
    `;

    const dismiss = () => {
      if (toastEl.classList.contains('toast-out')) return;
      toastEl.classList.add('toast-out');
      setTimeout(() => {
        toastEl.remove();
      }, 200);
    };

    toastEl.addEventListener('click', dismiss);
    this.container.appendChild(toastEl);

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }
  }
}

export function showToast(message, type = 'info', duration = 4000) {
  Bus.emit('toast:show', { message, type, duration });
}

export default ToastManager;
