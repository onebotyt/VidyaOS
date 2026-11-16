/**
 * VidyaOS Faculty Assessment Process Page Controller
 * Powered by isolated /faculty/components/dossier/dossier.js
 */
window.FacultyDossier.mount({
  "prefix": "assess",
  "apiBase": "/assessment-process",
  "label": "Assessment Process",
  "sectionTag": "ASSESSMENT",
  "totalDefault": 13,
  "fileKey": "assessment_file",
  "printFnName": "printAssessmentDossierIndex",
  "categoryMap": {
    "direct": "count-cat-direct",
    "indirect": "count-cat-indirect"
  }
});
