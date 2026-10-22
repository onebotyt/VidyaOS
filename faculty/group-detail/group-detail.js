/**
 * group-detail.js
 * 
 * Classroom Workspace Master Orchestrator
 * Modularized Architecture for High Maintainability:
 * 
 * - js/group-detail-core.js     : Global State (S), Auth guards, classroom banner, tab switching router, common helpers & modals
 * - js/group-detail-stream.js   : Stream feed, announcement composer, file attachments, comment threads, full-page view studio
 * - js/group-detail-classwork.js: Coursework items (Assignments/Tests/Practicals), creation dialogs, submissions drawer, grading panel & marks ledger
 * - js/group-detail-people.js   : Faculty & student rosters, batch enrollment dialogs, student removal, promotion & archive actions
 * - js/group-detail-register.js : Institutional physical 31-day attendance matrix, ultra-compact mobile daily matrix, digital pen (P/A/L), ESP32 sync & live roll-call studio
 * - js/group-detail-sheets.js   : Embedded spreadsheet studio, evaluation marksheets, class tests & assignment ledgers, CSV & PDF export
 */

(function () {
  'use strict';

  const MODULE_SCRIPTS = [
    '/faculty/group-detail/js/group-detail-core.js',
    '/faculty/group-detail/js/group-detail-stream.js',
    '/faculty/group-detail/js/group-detail-people.js',
    '/faculty/group-detail/js/group-detail-classwork.js',
    '/faculty/group-detail/js/group-detail-register.js',
    '/faculty/group-detail/js/group-detail-sheets.js'
  ];

  /**
   * Load any missing modules dynamically if not already present via script tags.
   */
  async function ensureModulesLoaded() {
    if (typeof window.initGroupPage === 'function' &&
        typeof window.loadStream === 'function' &&
        typeof window.loadMembers === 'function' &&
        typeof window.loadAssignments === 'function' &&
        typeof window.loadClassRegister === 'function' &&
        typeof window.loadClassSheets === 'function') {
      return;
    }

    // Sequentially load missing modules
    for (const src of MODULE_SCRIPTS) {
      const alreadyLoaded = Array.from(document.querySelectorAll('script')).some(
        s => s.src && s.src.includes(src.split('/').pop())
      );
      if (!alreadyLoaded) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src + '?v=20261022';
          script.async = false;
          script.onload = resolve;
          script.onerror = () => {
            console.error(`Failed to load module script: ${src}`);
            resolve(); // proceed even if one fails
          };
          document.head.appendChild(script);
        });
      }
    }
  }

  /**
   * Bootstrap classroom application
   */
  async function bootstrapClassroom() {
    try {
      await ensureModulesLoaded();
      if (typeof window.initGroupPage === 'function') {
        window.initGroupPage();
      } else {
        console.error('initGroupPage function not found after loading modules.');
      }
    } catch (err) {
      console.error('Error bootstrapping classroom workspace:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapClassroom);
  } else {
    bootstrapClassroom();
  }
})();
