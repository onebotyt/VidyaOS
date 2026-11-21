/**
 * VidyaOS Admin Sidebar Shim -> Delegates to Unified VidyaSidebar
 * Location: /frontend/admin/components/sidebar/sidebar.js
 */
(function () {
  'use strict';
  function init() {
    if (window.VidyaSidebar) {
      window.VidyaSidebar.mount({ role: 'admin' });
      return;
    }
    const s = document.createElement('script');
    s.src = '/shared/components/sidebar/sidebar.js';
    s.onload = () => {
      if (window.VidyaSidebar) window.VidyaSidebar.mount({ role: 'admin' });
    };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
