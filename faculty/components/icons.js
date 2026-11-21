/**
 * VidyaOS Faculty Icons Shim -> Delegates to Unified VidyaIcons
 * Location: /frontend/faculty/components/icons.js
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
