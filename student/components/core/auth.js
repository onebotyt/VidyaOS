/**
 * VidyaOS Student Auth Shim -> Delegates to Unified Auth
 * Location: /frontend/student/components/core/auth.js
 */
(function () {
  'use strict';
  if (!window.VidyaAuth) {
    const s = document.createElement('script');
    s.src = '/shared/components/core/auth.js';
    document.head.appendChild(s);
  }
})();
