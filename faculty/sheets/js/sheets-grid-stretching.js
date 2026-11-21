/* ══════════════════════════════════════════════════════════════
   OFFICE STUDIO: AUTO-FIT COLUMNS & SCREEN-FIT DISTRIBUTION
   Intelligently proportions columns so institutional sheets & imported
   sheets fit 100% within the user's viewport without horizontal scrolling,
   anchored to the LAST COLUMN THAT CONTAINS DATA (e.g. Grand Total or Test Details).
   
   ALGORITHM:
   1. Check last column that has actual data.
   2. Scan every data cell in all columns to measure largest text/number,
      sizing Student Name and data columns strictly to their longest values
      instead of wasting excessive empty whitespace.
   3. Analyze headers: allocate available screen space to columns with
      multiline/word-heavy headers (e.g. Assignment, Attendance, Creative Work)
      so headers remain clean without awkward word breaks (e.g. "Assignmen-t").
   4. Total is strictly 63px, Grand Total is strictly 65px.
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

  // 2. Step 1: Dynamically find the LAST COLUMN THAT HAS DATA across all rows
  const lastDataCol = findLastDataColumn(sheet);
  // On forced screen fit (Fit Screen button), anchor strictly to last column with data
  // On non-forced auto-fit, preserve any newly added empty columns
  const activeColCount = force ? Math.max(1, lastDataCol + 1) : Math.max(sheet.colsCount || 1, lastDataCol + 1);

  // Strictly constrain sheet.colsCount to active columns so phantom empty columns are never rendered
  sheet.colsCount = activeColCount;

  // 3. Step 2: Check every data cell in all columns for text / numbers and find largest
  const totalRows = Math.min(sheet.rowsCount || 60, 200);
  const dataMaxChars = new Array(activeColCount).fill(0);
  const dataMaxWords = new Array(activeColCount).fill(0);

  // Scan data rows (r >= 2, skipping header rows 0 & 1)
  for (let r = 2; r < totalRows; r++) {
    for (let c = 0; c < activeColCount; c++) {
      const cell = typeof getCell === 'function' ? getCell(sheet, r, c) : (sheet.cells[`${r},${c}`] || {});
      if (!cell) continue;
      const v = String(cell.v !== undefined && cell.v !== null ? cell.v : (cell.raw || '')).trim();
      if (!v) continue;

      // Skip full-width banner
      if (v.includes('Polytechnic') || v.includes('Institute') || v.includes('Internal Evaluation Sheet') || v.includes('Uttarakhand')) continue;

      let span = getCellColSpan(sheet, r, c);
      // If cell is merged across multiple columns or multi-row instructions, skip for single column data width
      if (span > 1 || (r >= 2 && c >= 10 && (v.includes('EXAMINATION INSTRUCTIONS') || v.includes('TEST QUESTIONS')))) continue;

      const len = v.length;
      if (len > dataMaxChars[c]) dataMaxChars[c] = len;

      const words = v.split(/\s+/);
      for (const w of words) {
        if (w.length > dataMaxWords[c]) dataMaxWords[c] = w.length;
      }
    }
  }

  // 4. Step 3: Analyze header cells (r = 0, 1, 2) to find clean widths and prevent word wrapping
  const headerCleanWidths = new Array(activeColCount).fill(48);
  const dataNeededWidths = new Array(activeColCount).fill(48);
  const fixedWidthCols = new Set();
  let detailsColIdx = -1;
  let hasDetailsCol = false;
  let nameColIdx = -1;

  for (let c = 0; c < activeColCount; c++) {
    let headerFullStr = '';
    let maxHeaderWordLen = 0;
    let maxHeaderLineLen = 0;

    for (let r = 0; r <= 2; r++) {
      const cell = typeof getCell === 'function' ? getCell(sheet, r, c) : (sheet.cells[`${r},${c}`] || {});
      const rawText = String(cell?.v !== undefined && cell?.v !== null ? cell.v : (cell?.raw || '')).trim();
      if (!rawText) continue;
      if (rawText.includes('Polytechnic') || rawText.includes('Institute') || rawText.includes('Internal Evaluation Sheet')) continue;

      headerFullStr += ' ' + rawText.toUpperCase();

      const lines = rawText.split(/\r?\n/);
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length > maxHeaderLineLen) maxHeaderLineLen = trimmedLine.length;
        const words = trimmedLine.split(/[\s\/\(\)]+/).filter(Boolean);
        for (const w of words) {
          if (w.length > maxHeaderWordLen) maxHeaderWordLen = w.length;
        }
      }
    }

    const isGrandTotal = headerFullStr.includes('GRAND TOTAL') || (headerFullStr.includes('GRAND') && headerFullStr.includes('TOTAL'));
    const isTotal = !isGrandTotal && (headerFullStr.includes('TOTAL') || headerFullStr.includes('TOT'));

    if (isGrandTotal) {
      dataNeededWidths[c] = 65; // User explicit requirement: Grand Total = 65px
      headerCleanWidths[c] = 65;
      fixedWidthCols.add(c);
    } else if (isTotal) {
      dataNeededWidths[c] = 63; // User explicit requirement: Total = 63px
      headerCleanWidths[c] = 63;
      fixedWidthCols.add(c);
    } else if (headerFullStr.includes('DETAILS') || headerFullStr.includes('INSTRUCTION') || (c === 10 && activeColCount === 11)) {
      dataNeededWidths[c] = 280;
      headerCleanWidths[c] = 340; // Room for question statements and instructions
      detailsColIdx = c;
      hasDetailsCol = true;
    } else if (headerFullStr.includes('STUDENT') || headerFullStr.includes('NAME') || (!headerFullStr && c === 4)) {
      nameColIdx = c;
      // Size student name strictly according to actual longest student name
      const nameChars = Math.max(14, dataMaxChars[c] || 16);
      const measuredNameW = Math.round(nameChars * 7.2 + 20);
      dataNeededWidths[c] = Math.max(120, Math.min(150, measuredNameW));
      headerCleanWidths[c] = dataNeededWidths[c]; // "STUDENT NAME" header is compact and fits within name column
    } else if (headerFullStr.includes('UBTER ROLL') || headerFullStr.includes('UBTER') || headerFullStr.includes('ENROLLMENT') || (!headerFullStr && c === 3)) {
      const enrollChars = Math.max(11, dataMaxChars[c] || 11);
      dataNeededWidths[c] = Math.round(enrollChars * 7.5 + 16); // ~98-102px
      headerCleanWidths[c] = Math.max(dataNeededWidths[c], 102);
    } else if (headerFullStr.includes('REG') || (!headerFullStr && c === 2)) {
      const regChars = Math.max(8, dataMaxChars[c] || 9);
      dataNeededWidths[c] = Math.round(regChars * 7.5 + 16); // ~76px
      headerCleanWidths[c] = Math.max(dataNeededWidths[c], 76);
    } else if ((headerFullStr.includes('ROLL') && !headerFullStr.includes('UBTER')) || (!headerFullStr && c === 1)) {
      dataNeededWidths[c] = 48;
      headerCleanWidths[c] = 50;
    } else if (headerFullStr.includes('SR') || (!headerFullStr && c === 0)) {
      dataNeededWidths[c] = 42;
      headerCleanWidths[c] = 44;
    } else {
      // Data columns (Assignment, UTs Total, Attendance, Problem Solving, Lab Record, Creative Work, Viva, Tests)
      const dChars = Math.max(1, dataMaxChars[c] || 2);
      dataNeededWidths[c] = Math.max(46, Math.round(dChars * 7.5 + 18));

      // Header clean width: Calculate width so longest word in header does not break or wrap awkwardly
      let wordW = Math.round(maxHeaderWordLen * 7.8 + 16);
      let lineW = Math.round(maxHeaderLineLen * 7.2 + 14);
      let targetHeaderW = Math.max(wordW, Math.min(lineW, 110));

      if (headerFullStr.includes('ASSIGNMENT')) {
        targetHeaderW = Math.max(targetHeaderW, 92); // Prevents "Assignmen-t" break
      } else if (headerFullStr.includes('ATTENDANCE')) {
        targetHeaderW = Math.max(targetHeaderW, 88); // Prevents "Attendan-ce" break
      } else if (headerFullStr.includes('CREATIVE')) {
        targetHeaderW = Math.max(targetHeaderW, 105); // Clean "Creative Work"
      } else if (headerFullStr.includes('PROBLEM') || headerFullStr.includes('SOLVING')) {
        targetHeaderW = Math.max(targetHeaderW, 88); // Clean "Problem Solving"
      } else if (headerFullStr.includes('LAB') || headerFullStr.includes('RECORD')) {
        targetHeaderW = Math.max(targetHeaderW, 80); // Clean "Lab Record"
      } else if (headerFullStr.includes('VIVA')) {
        targetHeaderW = Math.max(targetHeaderW, 74); // Clean "Viva Voce"
      } else if (headerFullStr.includes('UTS') || headerFullStr.includes('BEST')) {
        targetHeaderW = Math.max(targetHeaderW, 78);
      } else if (/^[0-9]+$/.test(headerFullStr.trim())) {
        targetHeaderW = Math.max(46, targetHeaderW);
      }

      headerCleanWidths[c] = Math.max(dataNeededWidths[c], targetHeaderW);
    }
  }

  // 5. Step 4: Proportional Screen Space Distribution
  let totalDataWidth = 0;
  let totalHeaderCleanWidth = 0;
  for (let c = 0; c < activeColCount; c++) {
    totalDataWidth += dataNeededWidths[c];
    totalHeaderCleanWidth += headerCleanWidths[c];
  }

  if (availWidth >= totalHeaderCleanWidth) {
    // Screen has extra space beyond what all clean headers need:
    // Expand remaining room smoothly; Details column gets highest share if present
    const extra = availWidth - totalHeaderCleanWidth;
    const scalableCols = [];
    for (let c = 0; c < activeColCount; c++) {
      if (!fixedWidthCols.has(c)) scalableCols.push(c);
    }

    const detailsExtra = hasDetailsCol && detailsColIdx >= 0 ? Math.floor(extra * 0.40) : 0;
    const remainingExtra = extra - detailsExtra;
    const perCol = scalableCols.length > 0 ? Math.floor(remainingExtra / scalableCols.length) : 0;

    for (let c = 0; c < activeColCount; c++) {
      if (fixedWidthCols.has(c)) {
        sheet.colWidths[c] = headerCleanWidths[c]; // Strictly 63px or 65px
      } else if (c === detailsColIdx && hasDetailsCol) {
        sheet.colWidths[c] = headerCleanWidths[c] + detailsExtra + perCol;
      } else {
        sheet.colWidths[c] = headerCleanWidths[c] + perCol;
      }
    }
  } else if (availWidth >= totalDataWidth) {
    // Screen has enough space for all data cells, and partial space to expand headers towards ideal widths!
    // Allocate dataNeededWidths[c] as floor, and interpolate headerCleanWidths[c] with available room
    const extraForHeaders = availWidth - totalDataWidth;
    const headerDeficit = totalHeaderCleanWidth - totalDataWidth;
    const expandRatio = headerDeficit > 0 ? Math.min(1.0, extraForHeaders / headerDeficit) : 1.0;

    for (let c = 0; c < activeColCount; c++) {
      if (fixedWidthCols.has(c)) {
        sheet.colWidths[c] = headerCleanWidths[c]; // Strictly 63px or 65px
      } else {
        const bonus = Math.round((headerCleanWidths[c] - dataNeededWidths[c]) * expandRatio);
        sheet.colWidths[c] = dataNeededWidths[c] + bonus;
      }
    }
  } else {
    // Screen is tighter than total data widths: scale down scalable columns proportionally
    let scalableDataSum = 0;
    let fixedSum = 0;
    for (let c = 0; c < activeColCount; c++) {
      if (fixedWidthCols.has(c)) fixedSum += headerCleanWidths[c];
      else scalableDataSum += dataNeededWidths[c];
    }
    const targetScalable = Math.max(100, availWidth - fixedSum);
    const scale = scalableDataSum > 0 ? (targetScalable / scalableDataSum) : 1;

    for (let c = 0; c < activeColCount; c++) {
      if (fixedWidthCols.has(c)) {
        sheet.colWidths[c] = headerCleanWidths[c];
      } else {
        sheet.colWidths[c] = Math.max(38, Math.round(dataNeededWidths[c] * scale));
      }
    }
  }

  // 6. Final containment check: ensure sum of all columns + corner (44px) does not exceed container
  let currentSum = 44;
  for (let c = 0; c < activeColCount; c++) {
    currentSum += (sheet.colWidths[c] || 50);
  }
  if (currentSum > screenW && screenW > 400) {
    const diff = currentSum - (screenW - 2);
    const scalableCols = [];
    for (let c = 0; c < activeColCount; c++) {
      if (!fixedWidthCols.has(c) && (sheet.colWidths[c] || 50) > 50) scalableCols.push(c);
    }
    if (scalableCols.length > 0) {
      const trimPerCol = Math.ceil(diff / scalableCols.length);
      for (const sc of scalableCols) {
        sheet.colWidths[sc] = Math.max(46, sheet.colWidths[sc] - trimPerCol);
      }
    }
  }

  // 7. Delete any lingering column widths beyond activeColCount
  for (const k of Object.keys(sheet.colWidths)) {
    if (Number(k) >= activeColCount) {
      delete sheet.colWidths[k];
    }
  }

  // 8. Update DOM <th> elements directly if table header is present
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
