/**
 * VidyaOS Student Sidebar Shim -> Delegates to Unified VidyaSidebar
 * Location: /frontend/student/components/sidebar/sidebar.js
 */
(function () {
  'use strict';
  function init() {
    if (window.VidyaSidebar) {
      window.VidyaSidebar.mount({ role: 'student' });
      return;
    }
    const s = document.createElement('script');
    s.src = '/shared/components/sidebar/sidebar.js';
    s.onload = () => {
      if (window.VidyaSidebar) window.VidyaSidebar.mount({ role: 'student' });
    };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
