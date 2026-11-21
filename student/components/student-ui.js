/**
 * VidyaOS Student UI Shim -> Delegates to Unified VidyaUI
 * Location: /frontend/student/components/student-ui.js
 */
(function () {
  'use strict';
  function init() {
    if (window.VidyaUI) {
      window.StudentUI = window.VidyaUI;
      return;
    }
    const s = document.createElement('script');
    s.src = '/shared/components/ui/vidya-ui.js';
    s.onload = () => {
      window.StudentUI = window.VidyaUI;
    };
    document.head.appendChild(s);
  }
  init();
})();
