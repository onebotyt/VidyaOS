/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS DEPARTMENT HERO & INSTITUTION SHOWCASE COMPONENT
 * Location: /faculty/components/dept-hero/dept-hero.js
 * 
 * Reusable dynamic dual-card department header banner component.
 * - 100% Theme Token Compliant (Zero Hardcoded Hex Colors)
 * - Auto-mounts to #dept-hero-container, [data-component="dept-hero"], or <dept-hero>
 * - Live auto-ticking date and clock (interval synced)
 * - Dynamic department name resolution from current user session & hierarchy
 * - Dynamic role detection (HOD Access vs Faculty Access)
 * - Full backward-compatibility with dashboard.js and students.js
 * - Institution branding with Government Polytechnic Nainital showcase
 * ══════════════════════════════════════════════════════════════
 */

(function (root) {
  'use strict';

  // Ensure styles are attached
  function ensureStyles() {
    if (typeof document === 'undefined') return;
    const existing = document.querySelector('link[href*="dept-hero.css"]');
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/faculty/components/dept-hero/dept-hero.css';
      document.head.appendChild(link);
    }
  }

  // Format date: e.g. "Thursday, 29 October 2026"
  function getFormattedDate(d) {
    const date = d || new Date();
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // Format time: e.g. "3:56 AM"
  function getFormattedTime(d) {
    const date = d || new Date();
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // Read current user info safely
  function getSessionUser() {
    try {
      const raw = localStorage.getItem('currentUser') || 
                  localStorage.getItem('user') || 
                  sessionStorage.getItem('currentUser') || 
                  sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Generate HTML template
  function renderTemplate(config) {
    const isHod = config.isHod;
    const roleBadgeText = isHod ? 'HOD Access' : 'Faculty Access';
    const deptName = config.departmentName || 'Academic Department';
    const eyebrow = config.eyebrow || 'DEPARTMENT PORTAL';
    const subtitle = config.subtitle || 'Manage your department faculty, students, classes and academic activities.';
    const instName = config.instName || 'Government Polytechnic Nainital';
    const instMotto = config.instMotto || 'Knowledge • Skills • Better Tomorrow';
    const instQuote = config.instQuote || '“Education creates opportunities.”';
    const campusImg = config.campusImg || '/admin/dashboard/campus-nainital.jpg';

    return `
      <section class="dept-hero-component" aria-label="Department Overview & Institutional Showcase">
        <!-- Left Header Card -->
        <div class="dept-hero-left">
          <div>
            <span class="dept-hero-eyebrow" id="dept-hero-eyebrow">${eyebrow}</span>
            <h1 class="dept-hero-title" id="dept-hero-title">
              <span id="portal-dept-name" class="dept-hero-dept-name-val">${deptName}</span> 💻
            </h1>
            <!-- Hidden mirror elements for backwards compatibility -->
            <span id="dept-hero-dept-name" style="display:none;">${deptName}</span>
            <span id="dept-command-title" style="display:none;">${deptName} 💻</span>

            <p class="dept-hero-subtitle" id="dept-hero-subtitle">
              <span id="dept-subtitle">${subtitle}</span>
              <span id="dept-command-sub" style="display:none;">${subtitle}</span>
            </p>
          </div>
          <div class="dept-hero-pills">
            <span class="dept-hero-pill" id="dept-hero-date-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span id="dept-hero-live-date" class="dept-live-date-text">${getFormattedDate()}</span>
              <span id="live-portal-date" style="display:none;">${getFormattedDate()}</span>
              <span id="live-date-text" style="display:none;">${getFormattedDate()}</span>
            </span>
            <span class="dept-hero-pill" id="dept-hero-time-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span id="dept-hero-live-time" class="dept-live-time-text">${getFormattedTime()}</span>
              <span id="live-portal-time" style="display:none;">${getFormattedTime()}</span>
              <span id="live-time-text" style="display:none;">${getFormattedTime()}</span>
            </span>
            <span class="dept-hero-pill" id="dept-hero-access-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span id="dept-hero-role-label" class="dept-role-label-text">${roleBadgeText}</span>
              <span id="portal-role-label" style="display:none;">${roleBadgeText}</span>
            </span>
          </div>
        </div>

        <!-- Right Institution Showcase Card -->
        <div class="dept-hero-campus-card" aria-label="Institution Profile">
          <div class="dept-hero-campus-content">
            <div class="dept-hero-campus-header">
              <div class="dept-hero-campus-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"></path>
                </svg>
              </div>
              <div>
                <h2 class="dept-hero-campus-name" id="dept-hero-inst-name">${instName}</h2>
                <span class="dept-hero-campus-motto">${instMotto}</span>
              </div>
            </div>
            <div class="dept-hero-campus-quote">
              <span>${instQuote}</span>
            </div>
          </div>
          <div class="dept-hero-campus-img-wrap" aria-hidden="true">
            <img src="${campusImg}" alt="${instName} Campus" class="dept-hero-campus-img"
              onerror="this.onerror=null;this.src='/images/campus-nainital.jpg';">
            <div class="dept-hero-campus-overlay"></div>
          </div>
        </div>
      </section>
    `;
  }

  // Active timer reference
  let liveTimer = null;

  function updateClockElements() {
    const dateStr = getFormattedDate();
    const timeStr = getFormattedTime();

    document.querySelectorAll('.dept-live-date-text, #dept-hero-live-date, #live-portal-date, #live-date-text').forEach(el => {
      if (el) el.textContent = dateStr;
    });

    document.querySelectorAll('.dept-live-time-text, #dept-hero-live-time, #live-portal-time, #live-time-text').forEach(el => {
      if (el) el.textContent = timeStr;
    });
  }

  function startClock() {
    if (!liveTimer) {
      liveTimer = setInterval(updateClockElements, 10000);
    }
  }

  /**
   * Set up MutationObservers so that when legacy scripts update portal-dept-name or dept-command-title,
   * all sibling department name displays update in lockstep!
   */
  function setupSyncObservers(container) {
    if (!container || typeof MutationObserver === 'undefined') return;

    const portalDeptEl = container.querySelector('#portal-dept-name');
    const deptCmdEl = container.querySelector('#dept-command-title');

    if (deptCmdEl && portalDeptEl) {
      const observer = new MutationObserver(() => {
        const raw = (deptCmdEl.textContent || '').replace(/[💻\s]+$/, '').trim();
        if (raw && raw !== portalDeptEl.textContent) {
          portalDeptEl.textContent = raw;
        }
      });
      observer.observe(deptCmdEl, { childList: true, characterData: true, subtree: true });
    }
  }

  /**
   * Mount Department Hero onto a target container
   * @param {string|HTMLElement} target - Container element or CSS selector
   * @param {Object} options - Custom configuration overrides
   */
  function mountDeptHero(target, options = {}) {
    ensureStyles();

    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) return null;

    const user = getSessionUser() || {};
    const role = (user.role || '').toUpperCase();
    const isHod = options.isHod !== undefined 
      ? Boolean(options.isHod) 
      : (role === 'HOD' || (user.roles && user.roles.includes('HOD')) || Boolean(user.is_hod));

    // Resolve Department Name
    let deptName = options.departmentName || container.getAttribute('data-department') || '';
    if (!deptName && user.department_name) deptName = user.department_name;
    if (!deptName && user.department) deptName = user.department;
    if (!deptName) deptName = 'Academic Department';

    const config = {
      eyebrow: options.eyebrow || container.getAttribute('data-eyebrow') || 'DEPARTMENT PORTAL',
      departmentName: deptName,
      subtitle: options.subtitle || container.getAttribute('data-subtitle') || 'Manage your department faculty, students, classes and academic activities.',
      isHod: isHod,
      instName: options.instName || container.getAttribute('data-inst-name') || 'Government Polytechnic Nainital',
      instMotto: options.instMotto || container.getAttribute('data-inst-motto') || 'Knowledge • Skills • Better Tomorrow',
      instQuote: options.instQuote || container.getAttribute('data-inst-quote') || '“Education creates opportunities.”',
      campusImg: options.campusImg || container.getAttribute('data-campus-img') || '/admin/dashboard/campus-nainital.jpg'
    };

    container.innerHTML = renderTemplate(config);
    setupSyncObservers(container);
    updateClockElements();
    startClock();

    return container;
  }

  /**
   * Update Department Name dynamically on all mounted instances
   * @param {string} name 
   */
  function setDepartmentName(name) {
    if (!name) return;
    document.querySelectorAll('.dept-hero-dept-name-val, #dept-hero-dept-name, #portal-dept-name, #dept-command-title').forEach(el => {
      if (el) {
        if (el.id === 'dept-command-title') {
          el.innerHTML = `${name} 💻`;
        } else {
          el.textContent = name;
        }
      }
    });
  }

  /**
   * Auto-scan for containers on DOMContentLoaded
   */
  function autoInit() {
    ensureStyles();

    const targets = document.querySelectorAll(
      '#dept-hero-container, dept-hero, [data-component="dept-hero"], .dept-hero-mount'
    );

    targets.forEach(el => {
      mountDeptHero(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  // Export to window
  root.mountDeptHero = mountDeptHero;
  root.setDepartmentName = setDepartmentName;
  root.updateDeptHeroClock = updateClockElements;

})(typeof window !== 'undefined' ? window : this);
