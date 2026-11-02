/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS ADMIN REUSABLE COMPONENT: HERO SHOWCASE (hero.js)
 * Location: /frontend/admin/components/hero/hero.js
 * 
 * Modular engine to render institutional greeting, live clock,
 * session user identity, and college showcase.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  let clockInterval = null;

  function formatCurrentDateTime() {
    const now = new Date();
    const optionsDate = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    const dateStr = now.toLocaleDateString('en-GB', optionsDate);
    const optionsTime = { hour: 'numeric', minute: '2-digit', hour12: true };
    const timeStr = now.toLocaleTimeString('en-US', optionsTime);
    return { dateStr, timeStr };
  }

  function startClock() {
    if (clockInterval) clearInterval(clockInterval);

    function tick() {
      const { dateStr, timeStr } = formatCurrentDateTime();
      const elDate = document.getElementById('live-date-text');
      const elTime = document.getElementById('live-time-text');
      if (elDate) elDate.textContent = dateStr;
      if (elTime) elTime.textContent = timeStr;
    }

    tick();
    clockInterval = setInterval(tick, 1000);
  }

  function getSessionAdminName() {
    try {
      const user = (typeof window.getCurrentUser === 'function')
        ? window.getCurrentUser()
        : JSON.parse(localStorage.getItem('user') || 'null');
      return user?.full_name || user?.name || user?.username || 'System Administrator';
    } catch (_) {
      return 'System Administrator';
    }
  }

  function renderHeroHtml(options = {}) {
    const badge = options.badge || 'ADMIN PORTAL';
    const titlePrefix = options.titlePrefix || 'Welcome back,';
    const adminName = options.name || getSessionAdminName();
    const subtitle = options.subtitle || 'Manage your college, monitor academic activities, track attendance, and keep everything running smoothly.';
    const campusImg = options.campusImg || '/admin/dashboard/campus-nainital.jpg';
    const { dateStr, timeStr } = formatCurrentDateTime();

    return `
      <section class="admin-welcome-hero" aria-label="Welcome Overview">
        <div class="hero-left-content">
          <span class="hero-portal-badge">${badge}</span>
          <h1 class="hero-title">${titlePrefix}<br><span id="admin-hero-name">${adminName}</span></h1>
          <p class="hero-subtitle">${subtitle}</p>
          <div class="hero-live-badges">
            <span class="hero-live-chip hero-date-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span id="live-date-text">${dateStr}</span>
            </span>
            <span class="hero-live-chip hero-time-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span id="live-time-text">${timeStr}</span>
            </span>
          </div>
        </div>
        <div class="hero-campus-photo-wrap" aria-hidden="true">
          <img src="${campusImg}" alt="Campus Architecture" class="hero-campus-img" onerror="this.style.display='none'">
          <div class="hero-campus-overlay"></div>
        </div>
      </section>
    `;
  }

  function mount(target, options = {}) {
    const el = (typeof target === 'string') ? document.querySelector(target) : target;
    if (!el) return;
    el.innerHTML = renderHeroHtml(options);
    startClock();
  }

  // Auto-init on page load if mount container exists or elements present
  document.addEventListener('DOMContentLoaded', () => {
    const mountPoint = document.querySelector('.admin-hero-mount');
    if (mountPoint && !mountPoint.hasChildNodes()) {
      const badge = mountPoint.getAttribute('data-badge');
      const subtitle = mountPoint.getAttribute('data-subtitle');
      mount(mountPoint, { badge, subtitle });
    } else {
      startClock();
    }
  });

  window.AdminHero = {
    mount,
    startClock,
    renderHeroHtml
  };
})();

