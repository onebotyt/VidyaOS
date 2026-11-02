/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS ADMIN REUSABLE COMPONENT: QUICK ACCESS (quick-actions.js)
 * Location: /frontend/admin/components/quick-actions/quick-actions.js
 * 
 * Modular engine to render direct access tiles to all admin modules:
 * 1. Academic Structure
 * 2. HOD Management
 * 3. Reports & Analytics
 * 4. Audit Logs
 * 5. System Settings
 * 6. Admin Profile
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /** @type {any} */
  const win = typeof window !== 'undefined' ? window : {};

  function renderHtml() {
    return `
      <section class="section-quick-actions" aria-label="Quick Access Portals">
        <div class="section-header-row">
          <div class="section-title-group">
            <svg class="section-title-icon-purple" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <h3 class="section-title-text">Quick Access</h3>
          </div>
          <span class="section-badge-count">6 Portals</span>
        </div>

        <div class="quick-access-grid">
          <!-- 1. Academic Structure -->
          <a href="/admin/academic-structure.html" class="quick-action-tile" title="Manage Departments, Classes &amp; Sections">
            <div class="action-tile-icon-wrap icon-blue" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <span class="action-tile-label">Academic<br>Structure</span>
          </a>

          <!-- 2. HOD Management -->
          <a href="/admin/faculty.html" class="quick-action-tile" title="Manage HODs &amp; Department Appointments">
            <div class="action-tile-icon-wrap icon-purple" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <span class="action-tile-label">HOD<br>Management</span>
          </a>

          <!-- 3. Reports & Analytics -->
          <a href="/admin/reports.html" class="quick-action-tile" title="Campus Analytics &amp; Reports">
            <div class="action-tile-icon-wrap icon-green" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <span class="action-tile-label">Reports &amp;<br>Analytics</span>
          </a>

          <!-- 4. Audit Logs -->
          <a href="/admin/audit-logs.html" class="quick-action-tile" title="System Audit Trail &amp; Activity Logs">
            <div class="action-tile-icon-wrap icon-amber" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <span class="action-tile-label">Audit<br>Logs</span>
          </a>

          <!-- 5. System Settings -->
          <a href="/admin/settings.html" class="quick-action-tile" title="Institution Configuration &amp; Branding">
            <div class="action-tile-icon-wrap icon-slate" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
            <span class="action-tile-label">System<br>Settings</span>
          </a>

          <!-- 6. Admin Profile -->
          <a href="/admin/profile.html" class="quick-action-tile" title="Administrator Profile &amp; Security">
            <div class="action-tile-icon-wrap icon-purple" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <span class="action-tile-label">Admin<br>Profile</span>
          </a>
        </div>
      </section>
    `;
  }

  function mount(target) {
    const el = (typeof target === 'string') ? document.querySelector(target) : target;
    if (!el) return;
    el.innerHTML = renderHtml();
  }

  win.AdminQuickActions = {
    mount,
    renderHtml
  };
})();
