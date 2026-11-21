/**
 * VidyaOS Admin Top Header Shim -> Delegates to Unified VidyaHeader
 * Location: /frontend/admin/components/header/header.js
 */
(function () {
  'use strict';
  function init() {
    if (window.VidyaHeader) {
      window.VidyaHeader.mount({ role: 'admin' });
      return;
    }
    const s = document.createElement('script');
    s.src = '/shared/components/header/header.js';
    s.onload = () => {
      if (window.VidyaHeader) window.VidyaHeader.mount({ role: 'admin' });
    };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
