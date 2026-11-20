/* ══════════════════════════════════════════════════════════════
   OFFICE STUDIO: AUTO-FIT COLUMNS & SCREEN-FIT DISTRIBUTION
   Intelligently proportions columns so institutional sheets & imported
   sheets fit 100% within the user's viewport without horizontal scrolling,
   anchored to the LAST COLUMN THAT CONTAINS DATA (e.g. Grand Total or Test Details).
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

  // 1. Measure available grid container visible width
  const container = document.getElementById('excel-grid-workspace') ||
    document.getElementById('excel-grid-container') ||
    document.querySelector('.excel-grid-workspace') ||
    document.getElementById('sheets-viewport');
  const screenW = container && container.clientWidth > 300 ? container.clientWidth : (typeof window !== 'undefined' ? window.innerWidth - 80 : 1200);
  // Row headers (index numbers A, B, C... / 1, 2, 3...) take 44px + 14px cushion
  const availWidth = Math.max(screenW - 58, 600);

  // 2. Dynamically find the LAST COLUMN THAT HAS DATA across all rows
  const lastDataCol = findLastDataColumn(sheet);
  // On forced screen fit (Fit Screen button), anchor strictly to last column with data
  // On non-forced auto-fit, preserve any newly added empty columns
  const activeColCount = force ? Math.max(1, lastDataCol + 1) : Math.max(sheet.colsCount || 1, lastDataCol + 1);

  // Strictly constrain sheet.colsCount to active columns so phantom empty columns are never rendered
  sheet.colsCount = activeColCount;

  // 3. Compute base & minimum widths for every active column dynamically based on header contents
  const fixedWidthCols = new Set();
  const baseWidths = new Array(activeColCount).fill(60);
  const minWidths = new Array(activeColCount).fill(48);

  let studentNameColIdx = -1;
  let detailsColIdx = -1;
  let hasDetailsCol = false;

  for (let c = 0; c < activeColCount; c++) {
    // Detect column header content to check for Total / Grand Total / Details / Name
    let colHeaderStr = '';
    for (let r = 0; r <= 2; r++) {
      const cell = typeof getCell === 'function' ? getCell(sheet, r, c) : (sheet.cells[`${r},${c}`] || {});
      const txt = String(cell?.v !== undefined && cell?.v !== null ? cell.v : (cell?.raw || '')).trim().toUpperCase();
      if (txt) colHeaderStr += ' ' + txt;
    }
    const isGrandTotal = colHeaderStr.includes('GRAND TOTAL') || (colHeaderStr.includes('GRAND') && colHeaderStr.includes('TOTAL'));
    const isTotal = !isGrandTotal && (colHeaderStr.includes('TOTAL') || colHeaderStr.includes('TOT'));

    if (isGrandTotal) {
      baseWidths[c] = 65; // User explicit requirement: Grand Total = 65px
      minWidths[c] = 65;
      fixedWidthCols.add(c);
    } else if (isTotal) {
      baseWidths[c] = 63; // User explicit requirement: Total = 63px
      minWidths[c] = 63;
      fixedWidthCols.add(c);
    } else if (colHeaderStr.includes('DETAILS') || colHeaderStr.includes('INSTRUCTION') || colHeaderStr.includes('QUESTION NO.')) {
      baseWidths[c] = 300; // Room for question statements and instructions
      minWidths[c] = 180;
      detailsColIdx = c;
      hasDetailsCol = true;
    } else if (colHeaderStr.includes('STUDENT') || colHeaderStr.includes('NAME') || (!colHeaderStr && c === 4)) {
      baseWidths[c] = 145; // STUDENT NAME
      minWidths[c] = 120;
      studentNameColIdx = c;
    } else if (colHeaderStr.includes('ENROLLMENT') || (!colHeaderStr && c === 3)) {
      baseWidths[c] = 102; // ENROLLMENT NO.
      minWidths[c] = 90;
    } else if (colHeaderStr.includes('REG') || (!colHeaderStr && c === 2)) {
      baseWidths[c] = 76; // REG. NO.
      minWidths[c] = 65;
    } else if (colHeaderStr.includes('ROLL') || (!colHeaderStr && c === 1)) {
      baseWidths[c] = 50; // ROLL NO.
      minWidths[c] = 42;
    } else if (colHeaderStr.includes('SR') || (!colHeaderStr && c === 0)) {
      baseWidths[c] = 42; // SR. NO.
      minWidths[c] = 36;
    } else if (colHeaderStr.includes('ATTENDANCE') || colHeaderStr.includes('VIVA')) {
      baseWidths[c] = 54;
      minWidths[c] = 48;
    } else if (/^[0-9]+$/.test(colHeaderStr.trim())) {
      // Individual test questions 1..10
      baseWidths[c] = 48;
      minWidths[c] = 40;
    } else {
      baseWidths[c] = 68; // Assignment, UTs Total, Problem Solving, Lab Record, Creative Work
      minWidths[c] = 52;
    }
  }

  // 4. Calculate total base width
  let totalBaseWidth = 0;
  for (let c = 0; c < activeColCount; c++) {
    totalBaseWidth += baseWidths[c];
  }

  // 5. Intelligent Screen-Fit Distribution:
  // If screen has extra room: Expand scalable columns (Student Name & Details get highest weight).
  // If screen is tighter: Scale down scalable columns towards minWidths.
  // In BOTH cases: Strictly preserve TOTAL = 63px and GRAND TOTAL = 65px!
  if (availWidth >= totalBaseWidth) {
    const extra = availWidth - totalBaseWidth;
    const scalableCols = [];

    for (let c = 0; c < activeColCount; c++) {
      if (!fixedWidthCols.has(c)) {
        scalableCols.push(c);
      }
    }

    const hasNameCol = studentNameColIdx >= 0 && !fixedWidthCols.has(studentNameColIdx);
    const nameExtra = hasNameCol ? Math.floor(extra * 0.25) : 0;
    const detailsExtra = hasDetailsCol && detailsColIdx >= 0 ? Math.floor(extra * 0.35) : 0;
    const remainingExtra = extra - nameExtra - detailsExtra;
    const perColExtra = scalableCols.length > 0 ? Math.floor(remainingExtra / scalableCols.length) : 0;

    for (let c = 0; c < activeColCount; c++) {
      if (fixedWidthCols.has(c)) {
        sheet.colWidths[c] = baseWidths[c]; // Strictly 63px or 65px
      } else if (c === studentNameColIdx && hasNameCol) {
        sheet.colWidths[c] = baseWidths[c] + nameExtra + perColExtra;
      } else if (c === detailsColIdx && hasDetailsCol) {
        sheet.colWidths[c] = baseWidths[c] + detailsExtra + perColExtra;
      } else {
        sheet.colWidths[c] = baseWidths[c] + perColExtra;
      }
    }
  } else {
    // Screen is narrower than base widths:
    // Scale down scalable columns down towards minWidths to fit viewport
    let totalScalableBase = 0;
    let totalScalableMin = 0;
    let fixedWidthSum = 0;

    for (let c = 0; c < activeColCount; c++) {
      if (fixedWidthCols.has(c)) {
        fixedWidthSum += baseWidths[c];
      } else {
        totalScalableBase += baseWidths[c];
        totalScalableMin += minWidths[c];
      }
    }

    const targetScalableWidth = Math.max(availWidth - fixedWidthSum, totalScalableMin);
    const scaleRatio = totalScalableBase > totalScalableMin
      ? Math.max(0, Math.min(1, (targetScalableWidth - totalScalableMin) / (totalScalableBase - totalScalableMin)))
      : 0;

    for (let c = 0; c < activeColCount; c++) {
      if (fixedWidthCols.has(c)) {
        sheet.colWidths[c] = baseWidths[c]; // Strictly 63px or 65px
      } else {
        const scaledW = minWidths[c] + Math.round((baseWidths[c] - minWidths[c]) * scaleRatio);
        sheet.colWidths[c] = Math.max(minWidths[c], scaledW);
      }
    }
  }

  // 6. Delete any lingering column widths beyond activeColCount
  for (const k of Object.keys(sheet.colWidths)) {
    if (Number(k) >= activeColCount) {
      delete sheet.colWidths[k];
    }
  }

  // 7. Update DOM <th> elements directly if table header is present
  const thead = document.getElementById('excel-thead');
  if (thead) {
    for (let c = 0; c < activeColCount; c++) {
      const th = thead.querySelector(`.col-th-${c}`);
      if (th && sheet.colWidths[c]) {
        const w = sheet.colWidths[c];
        th.style.width = `${w}px`;
        th.style.minWidth = `${w}px`;
      }
    }
  }
}

function triggerFitColumnsToScreen() {
  const sheet = typeof getActiveSheet === 'function' ? getActiveSheet() : null;
  if (!sheet) return;

  if (typeof pushUndoState === 'function') pushUndoState('Fit Columns to Screen');

  // 1. Reset zoom to 100% so coordinates are true viewport
  if (typeof setSheetZoom === 'function') {
    setSheetZoom(1.0);
  }

  // 2. Perform intelligent column width auto-fit up to last data column (force = true)
  autoFitSheetColumns(sheet, true);

  // 3. Full structural re-render to apply new column count and <th> widths in DOM
  if (typeof renderExcelGrid === 'function') {
    renderExcelGrid(true);
  }

  // 4. Scroll container all the way to the left
  const container = document.getElementById('excel-grid-workspace');
  if (container) {
    container.scrollLeft = 0;
  }

  // 5. In next animation frame after browser layout, check if zoom scaling is needed
  requestAnimationFrame(() => {
    const table = document.getElementById('excel-grid-table');
    const ws = document.getElementById('excel-grid-workspace');
    if (ws && table) {
      const tableW = table.offsetWidth || table.scrollWidth;
      const wsW = ws.clientWidth;
      if (tableW > wsW && wsW > 250) {
        const fitScale = Math.max(0.35, Math.min(1.0, Math.floor((wsW / (tableW + 4)) * 100) / 100));
        if (typeof setSheetZoom === 'function') {
          setSheetZoom(fitScale);
        }
      }
      ws.scrollLeft = 0;
    }
  });
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
        if (typeof renderExcelGrid === 'function') renderExcelGrid(true);
      }
    }, 150);
  });

  window.findLastDataColumn = findLastDataColumn;
  window.autoFitSheetColumns = autoFitSheetColumns;
  window.sheetStretchingAutoFit = autoFitSheetColumns;
  window.triggerFitColumnsToScreen = triggerFitColumnsToScreen;
}
