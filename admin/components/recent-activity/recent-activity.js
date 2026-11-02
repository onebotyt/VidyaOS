/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS ADMIN REUSABLE COMPONENT: RECENT ACTIVITY (recent-activity.js)
 * Location: /frontend/admin/components/recent-activity/recent-activity.js
 * 
 * Modular engine to render institutional audit and activity feed.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /** @type {any} */
  const win = typeof window !== 'undefined' ? window : {};

  const DEFAULT_ACTIVITIES = [
    {
      type: 'create',
      icon: 'plus',
      color: 'icon-green',
      title: 'New class created: IT Sem 5',
      time: 'Today, 09:42 PM'
    },
    {
      type: 'update',
      icon: 'user',
      color: 'icon-blue',
      title: 'Faculty updated: Dr. Rajesh Kumar',
      time: 'Today, 08:15 PM'
    }
  ];

  function getIconSvg(name) {
    if (name === 'plus') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    }
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
  }

  function renderHtml(items = DEFAULT_ACTIVITIES) {
    const listHtml = items.map(item => `
      <div class="activity-item-card">
        <div class="activity-icon-squircle ${item.color || 'icon-green'}">
          ${getIconSvg(item.icon)}
        </div>
        <div class="activity-item-meta">
          <div class="activity-item-title">${item.title}</div>
          <div class="activity-item-time">${item.time}</div>
        </div>
      </div>
    `).join('');

    return `
      <section class="section-recent-activity" aria-label="Recent Activity">
        <div class="section-header-row">
          <div class="section-title-group">
            <svg class="section-title-icon-purple" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <h3 class="section-title-text">Recent Activity</h3>
          </div>
          <a href="/admin/audit-logs.html" class="section-view-all-link">View All &rarr;</a>
        </div>
        <div class="activity-items-list" id="activity-items-list">
          ${listHtml}
        </div>
      </section>
    `;
  }

  async function fetchAndRender(target) {
    const el = (typeof target === 'string') ? document.querySelector(target) : target;
    if (!el) return;
    el.innerHTML = renderHtml(DEFAULT_ACTIVITIES);

    try {
      if (typeof win.fetchApi === 'function') {
        const res = await win.fetchApi('/admin/audit-logs?limit=4');
        if (res && res.success && res.data && res.data.length > 0) {
          const mapped = res.data.map(log => {
            const isCreate = (log.action || '').toLowerCase().includes('create') || (log.action || '').toLowerCase().includes('add');
            const dateObj = new Date(log.created_at || Date.now());
            /** @type {Intl.DateTimeFormatOptions} */
            const timeOpts = { hour: '2-digit', minute: '2-digit', hour12: true };
            const timeStr = dateObj.toLocaleTimeString('en-US', timeOpts);

            return {
              type: isCreate ? 'create' : 'update',
              icon: isCreate ? 'plus' : 'user',
              color: isCreate ? 'icon-green' : 'icon-blue',
              title: log.description || `${log.action}: ${log.entity_type || 'System'}`,
              time: `Today, ${timeStr}`
            };
          });

          el.innerHTML = renderHtml(mapped);
        }
      }
    } catch (_) {
      // Fallback stays in place
    }
  }

  function mount(target, items = DEFAULT_ACTIVITIES) {
    const el = (typeof target === 'string') ? document.querySelector(target) : target;
    if (!el) return;
    el.innerHTML = renderHtml(items);
  }

  win.AdminRecentActivity = {
    mount,
    fetchAndRender,
    renderHtml
  };
})();

