/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: STUDENT
 * frontend/login/student/student.js
 * ══════════════════════════════════════════════════════════════
 */

// Immediate Client-Side Redirect preserving query parameters
    var curSearch = window.location.search;
    var targetUrl = '/login/index.html?role=student';
    if (curSearch) {
      if (!curSearch.includes('role=')) {
        targetUrl = '/login/index.html' + curSearch + '&role=student';
      } else {
        targetUrl = '/login/index.html' + curSearch;
      }
    }
    window.location.replace(targetUrl);

