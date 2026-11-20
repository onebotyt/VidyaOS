/* ══════════════════════════════════════════════════════════════
   OFFICE STUDIO: AUTO-FIT COLUMNS & SCREEN-FIT DISTRIBUTION
   Intelligently proportions columns so institutional sheets & imported
   sheets fit 100% within the user's viewport without horizontal scrolling,
   anchored to the LAST COLUMN THAT CONTAINS DATA (not just 'total').
   ══════════════════════════════════════════════════════════════ */

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
        if (r === 0 && (v.includes('Polytechnic') || v.includes('Institute') || v.includes('Internal Evaluation Sheet'))) {
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

  // Dynamically find the LAST COLUMN THAT HAS DATA across all rows
  const lastDataCol = findLastDataColumn(sheet);
  const activeColCount = Math.max(1, lastDataCol + 1);

  // Calculate content-aware base width for each column up to lastDataCol
  const colMaxChars = {};
  for (let c = 0; c < activeColCount; c++) {
    colMaxChars[c] = 0;
  }

  const sampleRows = Math.min(sheet.rowsCount || 40, 60);
  for (let r = 0; r < sampleRows; r++) {
    for (let c = 0; c < activeColCount; c++) {
      const cell = typeof getCell === 'function' ? getCell(sheet, r, c) : (sheet.cells[`${r},${c}`] || {});
      if (!cell) continue;
      const v = String(cell.v !== undefined && cell.v !== null ? cell.v : (cell.raw || '')).trim();
      // Skip banner row text
      if (r === 0 && (v.includes('Polytechnic') || v.includes('Institute') || v.includes('Internal Evaluation Sheet'))) {
        continue;
      }
      if (v.length > colMaxChars[c] && v.length < 40) {
        colMaxChars[c] = v.length;
      }
    }
  }

  // Base width rules for active data columns
  let totalBaseWidth = 0;
  const baseWidths = [];

  for (let c = 0; c < activeColCount; c++) {
    const chars = Math.max(2, colMaxChars[c] || 4);
    let baseW = 52; // Default for numbers / short marks

    if (c === 0 && chars <= 4) {
      baseW = 40;  // SR. NO.
    } else if (c === 1 && chars <= 6) {
      baseW = 48;  // ROLL NO.
    } else if (c === 2 && chars <= 10) {
      baseW = 76;  // REG. NO.
    } else if (c === 3 && chars <= 14) {
      baseW = 98;  // ENROLLMENT NO.
    } else if (c === 4 && chars <= 28) {
      baseW = 145; // STUDENT NAME
    } else {
      // Data / marks / custom columns
      if (chars <= 5) {
        baseW = 52;
      } else if (chars <= 10) {
        baseW = 62;
      } else if (chars <= 16) {
        baseW = 70;
      } else if (chars <= 25) {
        baseW = 85;
      } else {
        baseW = Math.min(160, chars * 6.5 + 16);
      }
    }

    baseWidths[c] = Math.round(baseW);
    totalBaseWidth += baseWidths[c];
  }

  // Proportional Distribution: Fit columns 0 through lastDataCol to exact screen width
  if (availWidth >= totalBaseWidth) {
    // Screen is wide enough: distribute remaining width
    const extra = availWidth - totalBaseWidth;
    // Give 25% of extra space to student name column (c=4) if present
    const hasNameCol = activeColCount > 4;
    const nameExtra = hasNameCol ? Math.floor(extra * 0.25) : 0;
    const perColExtra = Math.floor((extra - nameExtra) / activeColCount);

    for (let c = 0; c < activeColCount; c++) {
      if (c === 4 && hasNameCol) {
        sheet.colWidths[c] = baseWidths[c] + nameExtra + perColExtra;
      } else {
        sheet.colWidths[c] = baseWidths[c] + perColExtra;
      }
    }
  } else {
    // Screen is narrower: scale down smoothly while respecting minimum readable widths
    const ratio = Math.max(0.68, availWidth / Math.max(totalBaseWidth, 1));
    for (let c = 0; c < activeColCount; c++) {
      const minW = (c === 0) ? 34 : (c === 4 ? 115 : 36);
      sheet.colWidths[c] = Math.max(minW, Math.round(baseWidths[c] * ratio));
    }
  }

  // Unused columns beyond lastDataCol get a compact default width
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
