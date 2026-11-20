/* ══════════════════════════════════════════════════════════════
   OFFICE STUDIO: AUTO-FIT COLUMNS & SCREEN-FIT DISTRIBUTION
   Intelligently proportions columns so institutional sheets & imported
   sheets fit 100% within the user's viewport without horizontal scrolling.
   ══════════════════════════════════════════════════════════════ */

function autoFitSheetColumns(sheet, force = false) {
  if (!sheet || !sheet.cells) return;
  if (!sheet.colWidths) sheet.colWidths = {};

  const isImported = Boolean(window.EXCEL_WB?.isImportedWorkbook);
  // For imported workbooks, only auto-fit when explicitly requested by user (force = true)
  if (isImported && !force) {
    return;
  }

  // Measure available grid container width
  const container = document.getElementById('excel-grid-workspace') ||
    document.getElementById('excel-grid-container') ||
    document.querySelector('.excel-grid-workspace') ||
    document.getElementById('sheets-viewport');
  const screenW = container ? container.clientWidth : (typeof window !== 'undefined' ? window.innerWidth - 80 : 1200);
  // Subtract row header (42px) + scrollbar/border cushion (16px)
  const availWidth = Math.max(screenW - 58, 640);

  // Identify last active column with content or headers (ignoring merged banner rows)
  let lastCol = 0;
  for (let c = 0; c < sheet.colsCount; c++) {
    for (let r = 0; r < Math.min(sheet.rowsCount || 50, 6); r++) {
      const cell = typeof getCell === 'function' ? getCell(sheet, r, c) : (sheet.cells[`${r},${c}`] || {});
      const val = cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : String(cell.raw || '').trim();
      if (val) {
        lastCol = Math.max(lastCol, c);
      }
    }
  }

  const activeColCount = Math.max(1, lastCol + 1);

  // 1. MASTER EVALUATION SHEET (16 Columns: SR, Roll, Reg, Enroll, Name, Theory cols 5..9, Practical cols 10..14, Grand Total col 15)
  if (sheet.type === 'evaluation' || (!sheet.type && activeColCount >= 14 && activeColCount <= 18)) {
    // Curated compact base widths modeled from optimal 100% browser viewport
    // Baseline sum = 42 + 50 + 76 + 102 + 145 + 68 + 68 + 54 + 68 + 52 + 54 + 68 + 54 + 54 + 52 + 65 = 972px
    const baseWidths = [42, 50, 76, 102, 145, 68, 68, 54, 68, 52, 54, 68, 54, 54, 52, 65];
    const sumBase = baseWidths.reduce((a, b) => a + b, 0); // 972px

    if (availWidth >= sumBase) {
      // Screen is wide enough: distribute extra width gracefully, prioritizing student name
      const extra = availWidth - sumBase;
      const nameExtra = Math.floor(extra * 0.28);
      const perColExtra = Math.floor((extra - nameExtra) / 15);
      for (let c = 0; c < 16; c++) {
        if (c === 4) {
          sheet.colWidths[c] = baseWidths[c] + nameExtra;
        } else {
          sheet.colWidths[c] = baseWidths[c] + perColExtra;
        }
      }
    } else {
      // Screen is narrower (e.g. tablet or split-screen): scale down smoothly while preserving legibility
      const ratio = Math.max(0.72, availWidth / sumBase);
      for (let c = 0; c < 16; c++) {
        sheet.colWidths[c] = Math.max(34, Math.round(baseWidths[c] * ratio));
      }
    }
    return;
  }

  // 2. UNIT TESTS / COURSEWORK / PRACTICALS / GENERIC INSTITUTIONAL OR IMPORTED SHEETS
  // Proportionally distribute available width so all active columns through lastCol fit exactly on screen!
  const colMaxLen = {};
  for (let c = 0; c < activeColCount; c++) {
    colMaxLen[c] = 0;
  }

  const sampleRows = Math.min(sheet.rowsCount || 40, 50);
  for (let r = 1; r < sampleRows; r++) { // skip row 0 (may contain full-width banner text)
    for (let c = 0; c < activeColCount; c++) {
      const cell = typeof getCell === 'function' ? getCell(sheet, r, c) : (sheet.cells[`${r},${c}`] || {});
      const val = String(cell.v !== undefined && cell.v !== null ? cell.v : (cell.raw || ''));
      if (val.length > colMaxLen[c] && val.length < 35) {
        colMaxLen[c] = val.length;
      }
    }
  }

  let totalBaseWidth = 0;
  const initialWidths = [];
  for (let c = 0; c < activeColCount; c++) {
    const chars = Math.max(3, colMaxLen[c] || 5);
    let autoW = Math.max(45, Math.min(220, chars * 7.5 + 18));
    if (c === 0 && chars <= 4) autoW = 40;  // SR. NO.
    if (c === 1 && chars <= 6) autoW = 50;  // ROLL NO.
    if (c === 2 && chars <= 10) autoW = 76; // REG. NO.
    if (c === 3 && chars <= 14) autoW = 100; // ENROLL NO.
    if (c === 4 && chars <= 25) autoW = 145; // NAME
    initialWidths[c] = autoW;
    totalBaseWidth += autoW;
  }

  // Scale all columns so their sum equals available width (or minimum readable width)
  const scaleFactor = availWidth / Math.max(totalBaseWidth, 1);
  for (let c = 0; c < activeColCount; c++) {
    sheet.colWidths[c] = Math.max(36, Math.round(initialWidths[c] * scaleFactor));
  }
}

function triggerFitColumnsToScreen() {
  const sheet = typeof getActiveSheet === 'function' ? getActiveSheet() : null;
  if (!sheet) {
    if (typeof showToast === 'function') showToast('Please open an academic workbook first!', 'info');
    return;
  }

  if (typeof pushUndoState === 'function') pushUndoState('Fit Columns to Screen');

  autoFitSheetColumns(sheet, true); // force = true so it works on any sheet including imported

  if (typeof renderExcelGrid === 'function') {
    renderExcelGrid(false);
  }

  if (typeof showToast === 'function') {
    showToast('Spreadsheet columns fitted to screen width without scrolling!', 'success');
  }
}

// Automatic debounced re-fit on window resize
let gridResizeTimer = null;
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    clearTimeout(gridResizeTimer);
    gridResizeTimer = setTimeout(() => {
      const sheet = typeof getActiveSheet === 'function' ? getActiveSheet() : null;
      if (sheet && (!window.EXCEL_WB?.isImportedWorkbook)) {
        autoFitSheetColumns(sheet, false);
        if (typeof renderExcelGrid === 'function') renderExcelGrid(false);
      }
    }, 150);
  });

  window.autoFitSheetColumns = autoFitSheetColumns;
  window.triggerFitColumnsToScreen = triggerFitColumnsToScreen;
}
