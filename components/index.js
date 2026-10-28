/**
 * VidyaOS Unified UI Components & AJAX Library
 * Location: /components/index.js
 *
 * Master entrypoint for all VidyaOS reusable UI components:
 * - Network: ajax, fetchApi (components/ajax.js)
 * - Dialogs: ConfirmDialog, DynamicFormDialog, DetailDialog (components/dialog.js)
 * - Notifications: Toast, showToast (components/toast.js)
 * - Tables: DataTable, renderDataTable (components/table.js)
 * - Metrics: StatCard, renderStatGrid (components/stat-card.js)
 *
 * Include this single script in any page to access all components:
 * <script src="/components/index.js"></script>
 */

(function () {
  'use strict';

  const componentScripts = [
    '/components/ajax.js',
    '/components/toast.js',
    '/components/dialog.js',
    '/components/table.js',
    '/components/stat-card.js'
  ];

  // Helper to load component scripts dynamically if not already loaded
  function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  }

  // Preload sub-components
  componentScripts.forEach(loadScript);

})();
