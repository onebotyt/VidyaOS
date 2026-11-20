/* ══════════════════════════════════════════════════════════════
   OFFICE STUDIO: AUTO-FIT COLUMNS & CONTAINER WIDTH DISTRIBUTION
   Eliminates unnecessary empty space and ensures clean full-width grid
   ══════════════════════════════════════════════════════════════ */

function autoFitSheetColumns(sheet) {
  if (!sheet || !sheet.cells) return;
  if (!sheet.colWidths) sheet.colWidths = {};

  const colMaxLen = {};
  for (let c = 0; c < sheet.colsCount; c++) {
    colMaxLen[c] = 0;
  }

  const sampleRows = Math.min(sheet.rowsCount || 50, 100);
  for (let r = 0; r < sampleRows; r++) {
    for (let c = 0; c < sheet.colsCount; c++) {
      const cell = typeof getCell === 'function' ? getCell(sheet, r, c) : (sheet.cells[`${r},${c}`] || {});
      const val = String(cell.v !== undefined && cell.v !== null ? cell.v : (cell.raw || ''));
      if (!val) continue;
      const effectiveLen = (r === 0 && val.length > 28) ? Math.ceil(val.length / 2) : (val.length > 40 ? 30 : val.length);
      if (effectiveLen > colMaxLen[c]) {
        colMaxLen[c] = effectiveLen;
      }
    }
  }

  // Calculate base required widths
  let totalBaseWidth = 0;
  for (let c = 0; c < sheet.colsCount; c++) {
    const maxChars = colMaxLen[c] || 6;
    let autoW = Math.max(70, Math.min(360, maxChars * 8.5 + 24));
    if (c === 0) autoW = Math.max(autoW, 55);  // SR. NO.
    if (c === 1) autoW = Math.max(autoW, 75);  // ROLL NO.
    if (c === 2) autoW = Math.max(autoW, 125); // REG. NO.
    if (c === 3) autoW = Math.max(autoW, 125); // ENROLLMENT NO.
    if (c === 4) autoW = Math.max(autoW, 190); // STUDENT NAME
    sheet.colWidths[c] = Math.round(autoW);
    totalBaseWidth += sheet.colWidths[c];
  }

  // Distribute remaining screen width to eliminate right-side void
  try {
    const container = document.getElementById('excel-grid-container') || document.querySelector('.excel-grid-container');
    const screenW = container ? container.clientWidth : (typeof window !== 'undefined' ? window.innerWidth - 80 : 1200);
    const availWidth = Math.max(screenW - 48, 800); // 48px for row header (42px) + scroll margin

    if (availWidth > totalBaseWidth && sheet.colsCount > 0) {
      const remainingVoid = availWidth - totalBaseWidth;
      const extraPerCol = Math.floor(remainingVoid / sheet.colsCount);
      const addPerCol = Math.min(extraPerCol, 36);
      if (addPerCol > 0) {
        for (let c = 0; c < sheet.colsCount; c++) {
          sheet.colWidths[c] += addPerCol;
        }
      }
    }
  } catch (_) { }
}

if (typeof window !== 'undefined') {
  window.autoFitSheetColumns = autoFitSheetColumns;
}
