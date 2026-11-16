/**
 * VidyaOS Faculty Student Performance Page Controller
 * Powered by isolated /faculty/components/dossier/dossier.js
 */
window.FacultyDossier.mount({
  "prefix": "perf",
  "apiBase": "/student-performance",
  "label": "Student Performance",
  "sectionTag": "PERFORMANCE",
  "totalDefault": 8,
  "fileKey": "performance_file",
  "printFnName": "printPerformanceDossierIndex",
  "categoryMap": {
    "advanced_learners": "count-cat-advanced",
    "slow_learners": "count-cat-slow",
    "remedial_measures": "count-cat-remedial",
    "evidence": "count-cat-evidence"
  }
});
