/**
 * VidyaOS Faculty Theory Classes Page Controller
 * Powered by isolated /faculty/components/dossier/dossier.js
 */
window.FacultyDossier.mountDelivery({
  "prefix": "tc",
  "apiBase": "/theory-classes",
  "dataKey": "theory_class",
  "defaultComponent": "THEORY",
  "label": "Theory Classes",
  "printFnName": "printTheoryDossierIndex",
  "categoryMap": {
    "attendance": "count-cat-attendance",
    "instruction": "count-cat-instruction",
    "pedagogy": "count-cat-pedagogy"
  }
});
