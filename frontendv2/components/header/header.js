/**
 * Universal App Header Controller
 */

import { Platform } from '../../core/platform.js';
import { Bus } from '../../core/event-bus.js';
import { Auth } from '../../core/auth.js';
import { Router } from '../../core/router.js';
import { Storage } from '../../core/storage.js';
import { getIcon } from '../../assets/icons/icons.js';

export class AppHeader {
  constructor(container) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.currentTheme = 'light';

    Bus.on('route:changed', ({ title }) => this.updateTitle(title));
    Bus.on('auth:stateChanged', () => this.render());
    Bus.on('auth:userUpdated', () => this.render());

    this.initTheme();
    this.render();
  }

  async initTheme() {
    const saved = await Storage.get('vidyaos_theme', 'light');
    this.applyTheme(saved);
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      Platform.setStatusBarColor('#0b0f19', true);
    } else {
      document.documentElement.removeAttribute('data-theme');
      Platform.setStatusBarColor('#ffffff', false);
    }
    Storage.set('vidyaos_theme', theme);
    this.updateThemeButton();
  }

  toggleTheme() {
    Platform.hapticFeedback('light');
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
  }

  render() {
    if (!this.container) return;

    if (!Auth.isAuthenticated()) {
      this.container.style.display = 'none';
      return;
    }
    this.container.style.display = 'flex';

    const user = Auth.getUser() || {};
    const name = user.full_name || user.name || 'Student';
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';

    this.container.innerHTML = `
      <div class="header-left">
        <div class="header-brand-mobile">
          <span class="header-brand-icon">${getIcon('graduationCap')}</span>
          <span>VidyaOS</span>
        </div>
        <div class="header-title-desktop" id="header-desktop-title">Dashboard</div>
      </div>

      <div class="header-right">
        <div class="header-online-status">
          <span class="status-dot"></span>
          <span>ONLINE</span>
        </div>

        <button class="header-action-btn" id="theme-toggle-btn" title="Toggle Theme">
          ${getIcon(this.currentTheme === 'dark' ? 'sun' : 'moon')}
        </button>

        <button class="header-action-btn" id="header-settings-btn" title="Settings">
          ${getIcon('settings')}
        </button>

        <div class="header-avatar-btn" id="header-avatar-btn" title="Profile">
          ${initials}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelector('#theme-toggle-btn')?.addEventListener('click', () => {
      this.toggleTheme();
    });

    this.container.querySelector('#header-settings-btn')?.addEventListener('click', () => {
      Platform.hapticFeedback('light');
      Router.navigate('student/settings');
    });

    this.container.querySelector('#header-avatar-btn')?.addEventListener('click', () => {
      Platform.hapticFeedback('light');
      Router.navigate('student/profile');
    });
  }

  updateTitle(title) {
    const titleEl = this.container?.querySelector('#header-desktop-title');
    if (titleEl && title) {
      titleEl.textContent = title;
    }
  }

  updateThemeButton() {
    const btn = this.container?.querySelector('#theme-toggle-btn');
    if (btn) {
      btn.innerHTML = getIcon(this.currentTheme === 'dark' ? 'sun' : 'moon');
    }
  }
}

export default AppHeader;
