/**
 * VidyaOS Student Icons Shim -> Delegates to Unified VidyaIcons
 * Location: /frontend/student/components/icons.js
 */
(function () {
  'use strict';
  function init() {
    if (window.VidyaIcons) return;
    const s = document.createElement('script');
    s.src = '/shared/components/icons.js';
    document.head.appendChild(s);
  }
  init();
})();
