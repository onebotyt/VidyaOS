/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: FACULTY
 * frontend/login/faculty/faculty.js
 * ══════════════════════════════════════════════════════════════
 */

// Immediate Client-Side Redirect preserving query parameters
    var curSearch = window.location.search;
    var targetUrl = '/login/index.html?role=faculty';
    if (curSearch) {
      if (!curSearch.includes('role=')) {
        targetUrl = '/login/index.html' + curSearch + '&role=faculty';
      } else {
        targetUrl = '/login/index.html' + curSearch;
      }
    }
    window.location.replace(targetUrl);

