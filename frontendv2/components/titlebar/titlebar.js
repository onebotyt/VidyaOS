/**
 * Desktop Titlebar Controller
 */

import { Platform } from '../../core/platform.js';
import { getIcon } from '../../assets/icons/icons.js';

export class Titlebar {
  constructor(container) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.render();
  }

  render() {
    if (!this.container) return;

    const isMac = Platform.os === 'macos';

    let controlsHtml = '';
    if (isMac) {
      controlsHtml = `
        <div class="titlebar-controls mac-controls">
          <button class="mac-dot mac-close" id="titlebar-close" title="Close"></button>
          <button class="mac-dot mac-minimize" id="titlebar-minimize" title="Minimize"></button>
          <button class="mac-dot mac-maximize" id="titlebar-maximize" title="Zoom"></button>
        </div>
      `;
    } else {
      controlsHtml = `
        <div class="titlebar-controls win-controls">
          <button class="titlebar-btn" id="titlebar-minimize" title="Minimize">${getIcon('minimize')}</button>
          <button class="titlebar-btn" id="titlebar-maximize" title="Maximize">${getIcon('maximize')}</button>
          <button class="titlebar-btn titlebar-btn-close" id="titlebar-close" title="Close">${getIcon('close')}</button>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="titlebar-inner">
        <div class="titlebar-drag-area">
          <div class="titlebar-brand">
            ${getIcon('graduationCap')}
            <span>VidyaOS</span>
          </div>
        </div>
        ${controlsHtml}
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const minBtn = this.container.querySelector('#titlebar-minimize');
    const maxBtn = this.container.querySelector('#titlebar-maximize');
    const closeBtn = this.container.querySelector('#titlebar-close');

    minBtn?.addEventListener('click', () => Platform.minimizeWindow());
    maxBtn?.addEventListener('click', () => Platform.toggleMaximizeWindow());
    closeBtn?.addEventListener('click', () => Platform.closeWindow());
  }
}

export default Titlebar;
