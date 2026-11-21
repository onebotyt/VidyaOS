/**
 * VidyaOS Admin UI Shim -> Delegates to Unified VidyaUI
 * Location: /frontend/admin/components/admin-ui.js
 */
(function () {
  'use strict';
  function init() {
    if (window.VidyaUI) {
      window.AdminUI = window.VidyaUI;
      return;
    }
    const s = document.createElement('script');
    s.src = '/shared/components/ui/vidya-ui.js';
    s.onload = () => {
      window.AdminUI = window.VidyaUI;
    };
    document.head.appendChild(s);
  }
  init();
})();
