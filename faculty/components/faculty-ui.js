/**
 * VidyaOS Faculty UI Shim -> Delegates to Unified VidyaUI
 * Location: /frontend/faculty/components/faculty-ui.js
 */
(function () {
  'use strict';
  function init() {
    if (window.VidyaUI) {
      window.FacultyUI = window.VidyaUI;
      return;
    }
    const s = document.createElement('script');
    s.src = '/shared/components/ui/vidya-ui.js';
    s.onload = () => {
      window.FacultyUI = window.VidyaUI;
    };
    document.head.appendChild(s);
  }
  init();
})();
