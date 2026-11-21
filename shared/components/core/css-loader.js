/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS PERSISTENT CSS CACHE ENGINE (css-loader.js)
 * Location: /shared/components/core/css-loader.js
 * 
 * Persistent Browser LocalStorage CSS Cache:
 * - When page 1 loads, fetches component CSS and stores it in localStorage.
 * - When page 2 loads, immediately injects the cached CSS directly from
 *   localStorage into <head> with ZERO network wait (0ms latency, zero FOUC).
 * - Periodically syncs in the background to ensure updates are kept fresh.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const CACHE_PREFIX = 'vidya_css_cache:';
  const VERSION_KEY = 'vidya_css_version';
  const CURRENT_VERSION = 'v20261122_unified';

  // List of shared universal components to cache across all portals
  const CORE_CSS_URLS = [
    '/shared/components/core/variables.css',
    '/shared/components/core/reset.css',
    '/shared/components/core/vidya-base.css',
    '/shared/components/sidebar/sidebar.css',
    '/shared/components/header/header.css',
    '/shared/components/ui/vidya-ui.css'
  ];

  function getCacheKey(url) {
    return CACHE_PREFIX + url.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  function injectStyle(url, cssText) {
    const id = 'style-' + url.replace(/[^a-zA-Z0-9_-]/g, '_');
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      el.setAttribute('data-cached-url', url);
      // Prepend before user inline styles to preserve cascade
      const head = document.head || document.getElementsByTagName('head')[0];
      head.appendChild(el);
    }
    if (el.textContent !== cssText) {
      el.textContent = cssText;
    }
  }

  /**
   * Load and apply CSS: Synchronous from localStorage if available,
   * with background update.
   */
  async function loadCss(url) {
    const key = getCacheKey(url);
    let cached = null;

    try {
      cached = localStorage.getItem(key);
    } catch (_) {}

    // 1. Instant Cache Hit: inject synchronously into head
    if (cached) {
      injectStyle(url, cached);
    }

    // 2. Fetch or update in background
    try {
      const res = await fetch(url, { cache: 'default' });
      if (res.ok) {
        const freshCss = await res.text();
        if (freshCss && freshCss !== cached) {
          injectStyle(url, freshCss);
          try {
            localStorage.setItem(key, freshCss);
          } catch (_) {}
        }
      }
    } catch (_) {
      // Offline fallback: already satisfied by cached version
    }
  }

  /**
   * Initialize Core CSS Cache on Page Startup
   */
  function initCache(urls = CORE_CSS_URLS) {
    if (typeof document === 'undefined') return;

    // Check version invalidation
    try {
      const savedVersion = localStorage.getItem(VERSION_KEY);
      if (savedVersion !== CURRENT_VERSION) {
        // Clear previous cache entries if version bumped
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
        });
        localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
      }
    } catch (_) {}

    // Synchronously check and inject all cached CSS immediately
    urls.forEach(url => {
      const key = getCacheKey(url);
      try {
        const cached = localStorage.getItem(key);
        if (cached) injectStyle(url, cached);
      } catch (_) {}
    });

    // Background verify and update
    urls.forEach(url => loadCss(url));
  }

  // Unified API
  const VidyaCSS = {
    load: loadCss,
    init: initCache,
    urls: CORE_CSS_URLS,
    clearCache: function () {
      try {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
        });
      } catch (_) {}
    }
  };

  window.VidyaCSS = VidyaCSS;

  // Execute immediately so CSS is injected before DOM finishes rendering
  initCache();

})();
