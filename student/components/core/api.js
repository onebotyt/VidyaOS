/**
 * VidyaOS Student API Client Shim -> Delegates to Unified Api
 * Location: /frontend/student/components/core/api.js
 */
(function () {
  'use strict';
  if (!window.VidyaApi) {
    const s = document.createElement('script');
    s.src = '/shared/components/core/api.js';
    document.head.appendChild(s);
  }
})();
