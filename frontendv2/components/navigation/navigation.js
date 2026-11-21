/**
 * Multi-OS Navigation Controller
 * Manages both Mobile 4-Tab Dock and Desktop/Tablet Sidebar.
 */

import { Platform } from '../../core/platform.js';
import { Bus } from '../../core/event-bus.js';
import { Router } from '../../core/router.js';
import { Auth } from '../../core/auth.js';
import { getIcon } from '../../assets/icons/icons.js';

export class NavigationManager {
  constructor() {
    this.mobileDock = document.querySelector('#mobile-nav-dock');
    this.sidebar = document.querySelector('#sidebar-nav-container');

    this.navItems = [
      { key: 'student/home', label: 'Home', icon: 'home', hash: 'student/home' },
      { key: 'student/classes', label: 'Classes', icon: 'classes', hash: 'student/classes' },
      { key: 'student/classwork', label: 'Classwork', icon: 'classwork', hash: 'student/classwork' },
      { key: 'student/settings', label: 'Settings', icon: 'settings', hash: 'student/settings' },
    ];

    Bus.on('route:changed', ({ path }) => this.updateActiveTab(path));
    Bus.on('auth:stateChanged', () => this.render());
    Bus.on('auth:userUpdated', () => this.render());

    this.render();
  }

  render() {
    this.renderMobileDock();
    this.renderSidebar();
  }

  renderMobileDock() {
    if (!this.mobileDock) return;

    // Only render student tabs if authenticated
    if (!Auth.isAuthenticated()) {
      this.mobileDock.style.display = 'none';
      return;
    }
    this.mobileDock.style.display = 'flex';

    this.mobileDock.innerHTML = this.navItems.map(item => `
      <a href="#${item.hash}" class="mobile-nav-item" data-route="${item.key}">
        <div class="mobile-nav-icon-wrap">
          ${getIcon(item.icon)}
        </div>
        <span class="mobile-nav-label">${item.label}</span>
      </a>
    `).join('');

    this.mobileDock.querySelectorAll('.mobile-nav-item').forEach(el => {
      el.addEventListener('click', () => {
        Platform.hapticFeedback('light');
      });
    });

    const current = Router.getCurrentRoute();
    if (current) this.updateActiveTab(current);
  }

  renderSidebar() {
    if (!this.sidebar) return;

    if (!Auth.isAuthenticated()) {
      this.sidebar.style.display = 'none';
      return;
    }
    this.sidebar.style.display = 'flex';

    const user = Auth.getUser() || {};
    const name = user.full_name || user.name || 'Student';
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
    const roleLabel = (Auth.getRole() || 'Student').toUpperCase();

    this.sidebar.innerHTML = `
      <div class="sidebar-inner">
        <div class="sidebar-brand">
          <div class="sidebar-brand-icon">
            ${getIcon('graduationCap')}
          </div>
          <div class="sidebar-brand-text">
            <span class="sidebar-brand-title">VidyaOS</span>
            <span class="sidebar-brand-subtitle">Academic Suite</span>
          </div>
        </div>

        <ul class="sidebar-nav-list">
          ${this.navItems.map(item => `
            <li class="sidebar-nav-item" data-route="${item.key}">
              <a href="#${item.hash}">
                ${getIcon(item.icon)}
                <span class="sidebar-nav-label">${item.label}</span>
              </a>
            </li>
          `).join('')}
        </ul>

        <div class="sidebar-footer">
          <div class="sidebar-user-card" id="sidebar-user-profile-btn" title="View Profile">
            <div class="sidebar-user-avatar">${initials}</div>
            <div class="sidebar-user-info">
              <span class="sidebar-user-name">${name}</span>
              <span class="sidebar-user-role">${roleLabel}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.sidebar.querySelector('#sidebar-user-profile-btn')?.addEventListener('click', () => {
      Router.navigate('student/profile');
    });

    const current = Router.getCurrentRoute();
    if (current) this.updateActiveTab(current);
  }

  updateActiveTab(path) {
    if (!path) return;

    // Highlight mobile dock item
    if (this.mobileDock) {
      this.mobileDock.querySelectorAll('.mobile-nav-item').forEach(el => {
        const route = el.dataset.route;
        if (path === route || path.startsWith(route)) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
    }

    // Highlight sidebar item
    if (this.sidebar) {
      this.sidebar.querySelectorAll('.sidebar-nav-item').forEach(el => {
        const route = el.dataset.route;
        if (path === route || path.startsWith(route)) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
    }
  }
}

export default NavigationManager;
