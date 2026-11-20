/* ══════════════════════════════════════════════════════════════
   OFFICE STUDIO: AUTO-FIT COLUMNS & SCREEN-FIT DISTRIBUTION
   Intelligently proportions columns so institutional sheets & imported
   sheets fit 100% within the user's viewport without horizontal scrolling,
   anchored to the LAST COLUMN THAT CONTAINS DATA (not just 'total').
   ══════════════════════════════════════════════════════════════ */

function getCellColSpan(sheet, r, c) {
  if (!sheet || !sheet.merges || !sheet.merges.length) return 1;
  for (const m of sheet.merges) {
    if (r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c) {
      return Math.max(1, (m.e.c - m.s.c + 1));
    }
  }
  return 1;
}

function findLastDataColumn(sheet) {
  if (!sheet || !sheet.cells) return 0;
  const totalCols = sheet.colsCount || 26;
  const totalRows = Math.min(sheet.rowsCount || 60, 200);

  // Scan backwards from the rightmost column to find the first column with content
  for (let c = totalCols - 1; c >= 0; c--) {
    for (let r = 0; r < totalRows; r++) {
      const cell = typeof getCell === 'function' ? getCell(sheet, r, c) : (sheet.cells[`${r},${c}`] || {});
      if (!cell) continue;

      const v = cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : '';
      const raw = cell.raw !== undefined && cell.raw !== null ? String(cell.raw).trim() : '';

      if (v !== '' || raw !== '') {
        // Exclude full-width institutional banner row from determining column width
        if (r === 0 && (v.includes('Polytechnic') || v.includes('Institute') || v.includes('Internal Evaluation Sheet') || v.includes('Uttarakhand'))) {
          continue;
        }
        return c; // Found the last column with actual data!
      }
    }
  }
  return 0;
}

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

  // 1. Dynamically find the LAST COLUMN THAT HAS DATA across all rows
  const lastDataCol = findLastDataColumn(sheet);
  const activeColCount = Math.max(1, lastDataCol + 1);

  // 2. Measure max content characters for every column from 0 to lastDataCol
  const colMaxChars = {};
  for (let c = 0; c < activeColCount; c++) {
    colMaxChars[c] = 0;
  }

  const sampleRows = Math.min(sheet.rowsCount || 60, 100);
  for (let r = 0; r < sampleRows; r++) {
    for (let c = 0; c < activeColCount; c++) {
      const cell = typeof getCell === 'function' ? getCell(sheet, r, c) : (sheet.cells[`${r},${c}`] || {});
      if (!cell) continue;
      const v = String(cell.v !== undefined && cell.v !== null ? cell.v : (cell.raw || '')).trim();
      if (!v) continue;

      // Skip full-width institutional banner row from determining column width
      if (r === 0 && (v.includes('Polytechnic') || v.includes('Institute') || v.includes('Internal Evaluation Sheet') || v.includes('Uttarakhand'))) {
        continue;
      }

      // Check if this cell is merged across multiple columns
      const span = getCellColSpan(sheet, r, c);
      const effChars = span > 1 ? Math.ceil(v.length / span) : v.length;

      if (effChars > colMaxChars[c]) {
        colMaxChars[c] = effChars;
      }
    }
  }

  // 3. Compute the required non-overlapping base width for every active column
  let totalBaseWidth = 0;
  const baseWidths = [];

  for (let c = 0; c < activeColCount; c++) {
    const chars = Math.max(2, colMaxChars[c] || 4);
    let baseW = 54;

    if (c === 0 && chars <= 7) {
      baseW = 44; // SR. NO.
    } else if (c === 1 && chars <= 8) {
      baseW = 50; // ROLL NO.
    } else if (c === 2 && chars <= 10) {
      baseW = 82; // REG. NO.
    } else if (c === 3 && chars <= 14) {
      baseW = 114; // ENROLLMENT NO. (fits 11-12 digit numbers without '...')
    } else if (c === 4 && chars <= 30) {
      baseW = Math.max(165, Math.min(220, chars * 7 + 24)); // STUDENT NAME
    } else {
      // Questions / Marks / Totals / Custom details columns
      if (chars <= 4) {
        baseW = 50; // Q1..Q4, small numbers
      } else if (chars <= 7) {
        baseW = 66; // Total, Viva
      } else if (chars <= 12) {
        baseW = 82; // Theory, Practical, Attendance
      } else if (chars <= 18) {
        baseW = 100; // Lab Record File, Problem Solving
      } else if (chars <= 25) {
        baseW = 135; // Creative Work (Project)
      } else {
        // Detailed headers / notes (e.g. Unit Test Details...)
        // Supports multiline wrapping with sufficient legibility width
        baseW = Math.min(340, Math.max(180, Math.ceil(chars / 2) * 7.5 + 24));
      }
    }

    baseWidths[c] = Math.round(baseW);
    totalBaseWidth += baseWidths[c];
  }

  // 4. Distribution: Guarantee NO OVERLAP under any circumstance
  if (availWidth >= totalBaseWidth) {
    // Screen is wide enough: distribute extra pixels proportionally
    const extra = availWidth - totalBaseWidth;
    const hasNameCol = activeColCount > 4;
    const nameExtra = hasNameCol ? Math.floor(extra * 0.25) : 0;
    const remainingExtra = extra - nameExtra;
    const perColExtra = Math.floor(remainingExtra / activeColCount);

    for (let c = 0; c < activeColCount; c++) {
      if (c === 4 && hasNameCol) {
        sheet.colWidths[c] = baseWidths[c] + nameExtra + perColExtra;
      } else {
        sheet.colWidths[c] = baseWidths[c] + perColExtra;
      }
    }
  } else {
    // Screen is narrower than required data width:
    // Retain full baseWidths so no column's content overlaps or truncates!
    for (let c = 0; c < activeColCount; c++) {
      sheet.colWidths[c] = baseWidths[c];
    }
  }

  // 5. Unused columns beyond lastDataCol get a compact default width
  for (let c = activeColCount; c < sheet.colsCount; c++) {
    sheet.colWidths[c] = 55;
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
    showToast('Columns fitted to screen (up to last data column)!', 'success');
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

  window.findLastDataColumn = findLastDataColumn;
  window.autoFitSheetColumns = autoFitSheetColumns;
  window.triggerFitColumnsToScreen = triggerFitColumnsToScreen;
}
