/**
 * VidyaOS Faculty Laboratory Classes Page Controller
 * Powered by isolated /faculty/components/dossier/dossier.js
 */
window.FacultyDossier.mountDelivery({
  "prefix": "lc",
  "apiBase": "/lab-classes",
  "dataKey": "lab_class",
  "defaultComponent": "PRACTICAL",
  "label": "Laboratory Classes",
  "printFnName": "printLabDossierIndex",
  "categoryMap": {
    "attendance": "count-cat-attendance",
    "manuals": "count-cat-manuals",
    "evaluation": "count-cat-evaluation"
  }
});
