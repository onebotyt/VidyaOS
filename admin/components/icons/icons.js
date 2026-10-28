/**
 * Mirror of /admin/components/icons.js
 */
(function() {
  if (typeof window !== 'undefined' && window.ADMIN_ICONS) return;
  const script = document.createElement('script');
  script.src = '/admin/components/icons.js';
  document.head.appendChild(script);
})();
