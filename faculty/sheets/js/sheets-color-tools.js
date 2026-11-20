/* ══════════════════════════════════════════════════════════════
   EXCEL STUDIO: COLOR FORMATTING, PALETTES & COLOR TEMPLATES SUITE
   ══════════════════════════════════════════════════════════════ */

function positionFloatingDropdown(popup, button) {
  if (!popup || !button) return;

  // DOM Portal: Attach popup directly to document.body to completely bypass all ancestor overflow/clipping/stacking contexts
  if (popup.parentElement !== document.body) {
    document.body.appendChild(popup);
  }

  const rect = button.getBoundingClientRect();
  const popupW = popup.offsetWidth || 330;
  const leftPos = Math.max(8, Math.min(rect.left, window.innerWidth - popupW - 16));
  const topPos = rect.bottom + 4;

  const maxAvailHeight = Math.max(200, window.innerHeight - topPos - 16);
  popup.style.maxHeight = maxAvailHeight + 'px';
  popup.style.overflowY = 'auto';

  popup.style.position = 'fixed';
  popup.style.top = topPos + 'px';
  popup.style.left = leftPos + 'px';
  popup.style.zIndex = '99999999';

  // Ensure scroll is reset to very top so header and top cards are fully visible
  popup.scrollTop = 0;
}

function toggleColorPalette(type, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const fillPalette = document.getElementById('palette-fill-color');
  const fontPalette = document.getElementById('palette-font-color');
  const condMenu = document.getElementById('excel-conditional-menu');
  const templMenu = document.getElementById('excel-templates-menu');

  if (condMenu) condMenu.style.display = 'none';
  if (templMenu) templMenu.style.display = 'none';

  if (type === 'fill') {
    if (fontPalette) fontPalette.style.display = 'none';
    if (fillPalette) {
      const isVisible = fillPalette.style.display === 'flex';
      if (isVisible) {
        fillPalette.style.display = 'none';
      } else {
        fillPalette.style.display = 'flex';
        const btn = document.getElementById('btn-fill-color-picker');
        positionFloatingDropdown(fillPalette, btn);
      }
    }
  } else if (type === 'font') {
    if (fillPalette) fillPalette.style.display = 'none';
    if (fontPalette) {
      const isVisible = fontPalette.style.display === 'flex';
      if (isVisible) {
        fontPalette.style.display = 'none';
      } else {
        fontPalette.style.display = 'flex';
        const btn = document.getElementById('btn-font-color-picker');
        positionFloatingDropdown(fontPalette, btn);
      }
    }
  }
}

function toggleConditionalFormattingMenu(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const fillPalette = document.getElementById('palette-fill-color');
  const fontPalette = document.getElementById('palette-font-color');
  const condMenu = document.getElementById('excel-conditional-menu');
  const templMenu = document.getElementById('excel-templates-menu');

  if (fillPalette) fillPalette.style.display = 'none';
  if (fontPalette) fontPalette.style.display = 'none';
  if (templMenu) templMenu.style.display = 'none';

  if (condMenu) {
    const isVisible = condMenu.style.display === 'flex';
    if (isVisible) {
      condMenu.style.display = 'none';
    } else {
      condMenu.style.display = 'flex';
      const btn = document.getElementById('btn-conditional-formatting');
      positionFloatingDropdown(condMenu, btn);
    }
  }
}

function toggleColorTemplatesMenu(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const fillPalette = document.getElementById('palette-fill-color');
  const fontPalette = document.getElementById('palette-font-color');
  const condMenu = document.getElementById('excel-conditional-menu');
  const templMenu = document.getElementById('excel-templates-menu');

  if (fillPalette) fillPalette.style.display = 'none';
  if (fontPalette) fontPalette.style.display = 'none';
  if (condMenu) condMenu.style.display = 'none';

  if (templMenu) {
    const isVisible = templMenu.style.display === 'flex';
    if (isVisible) {
      templMenu.style.display = 'none';
    } else {
      templMenu.style.display = 'flex';
      const btn = document.getElementById('btn-color-templates');
      positionFloatingDropdown(templMenu, btn);
    }
  }
}

function closeAllColorPalettes() {
  const fillPalette = document.getElementById('palette-fill-color');
  const fontPalette = document.getElementById('palette-font-color');
  const condMenu = document.getElementById('excel-conditional-menu');
  const templMenu = document.getElementById('excel-templates-menu');
  if (fillPalette) fillPalette.style.display = 'none';
  if (fontPalette) fontPalette.style.display = 'none';
  if (condMenu) condMenu.style.display = 'none';
  if (templMenu) templMenu.style.display = 'none';
}

// Close color palettes on outside click or window resize/scroll
document.addEventListener('click', (e) => {
  if (
    !e.target.closest('.excel-color-btn-wrapper') &&
    !e.target.closest('.excel-color-palette-popup') &&
    !e.target.closest('#btn-conditional-formatting') &&
    !e.target.closest('.excel-conditional-dropdown') &&
    !e.target.closest('#btn-color-templates') &&
    !e.target.closest('.excel-templates-dropdown')
  ) {
    closeAllColorPalettes();
  }
});

window.addEventListener('resize', closeAllColorPalettes);

function selectFillColor(color) {
  closeAllColorPalettes();
  const bar = document.getElementById('fill-color-bar');
  if (bar) bar.style.backgroundColor = color || 'transparent';

  const sheet = typeof getActiveSheet === 'function' ? getActiveSheet() : null;
  if (!sheet) {
    if (typeof showToast === 'function') {
      showToast('Please open an academic workbook first to apply color templates!', 'info');
    }
    return;
  }

  if (typeof pushUndoState === 'function') pushUndoState('Fill Color');

  const selectedRange = typeof getActiveSelectionRange === 'function' ? getActiveSelectionRange() : null;

  if (selectedRange && (selectedRange.startR !== selectedRange.endR || selectedRange.startC !== selectedRange.endC)) {
    for (let r = selectedRange.startR; r <= selectedRange.endR; r++) {
      for (let c = selectedRange.startC; c <= selectedRange.endC; c++) {
        const cell = getCell(sheet, r, c);
        cell.s = cell.s || {};
        if (color) {
          cell.s.bg = color;
        } else {
          delete cell.s.bg;
        }
        setCell(sheet, r, c, cell);
      }
    }
  } else if (EXCEL_WB?.activeCell) {
    const { r, c } = EXCEL_WB.activeCell;
    const cell = getCell(sheet, r, c);
    cell.s = cell.s || {};
    if (color) {
      cell.s.bg = color;
    } else {
      delete cell.s.bg;
    }
    setCell(sheet, r, c, cell);
  }

  if (typeof renderExcelGrid === 'function') renderExcelGrid(false);
  if (typeof triggerAutoSaveIndicator === 'function') triggerAutoSaveIndicator();
}

function selectFontColor(color) {
  closeAllColorPalettes();
  const bar = document.getElementById('font-color-bar');
  if (bar) bar.style.backgroundColor = color || 'inherit';

  const sheet = typeof getActiveSheet === 'function' ? getActiveSheet() : null;
  if (!sheet) {
    if (typeof showToast === 'function') {
      showToast('Please open an academic workbook first to apply color templates!', 'info');
    }
    return;
  }

  if (typeof pushUndoState === 'function') pushUndoState('Font Color');

  const selectedRange = typeof getActiveSelectionRange === 'function' ? getActiveSelectionRange() : null;

  if (selectedRange && (selectedRange.startR !== selectedRange.endR || selectedRange.startC !== selectedRange.endC)) {
    for (let r = selectedRange.startR; r <= selectedRange.endR; r++) {
      for (let c = selectedRange.startC; c <= selectedRange.endC; c++) {
        const cell = getCell(sheet, r, c);
        cell.s = cell.s || {};
        if (color) {
          cell.s.color = color;
        } else {
          delete cell.s.color;
        }
        setCell(sheet, r, c, cell);
      }
    }
  } else if (EXCEL_WB?.activeCell) {
    const { r, c } = EXCEL_WB.activeCell;
    const cell = getCell(sheet, r, c);
    cell.s = cell.s || {};
    if (color) {
      cell.s.color = color;
    } else {
      delete cell.s.color;
    }
    setCell(sheet, r, c, cell);
  }

  if (typeof renderExcelGrid === 'function') renderExcelGrid(false);
  if (typeof triggerAutoSaveIndicator === 'function') triggerAutoSaveIndicator();
}

/* ══════════════════════════════════════════════════════════════
   EXCEL SHEET COLOR TEMPLATES DEFINITIONS & APPLICATION
   ══════════════════════════════════════════════════════════════ */
const SHEET_COLOR_TEMPLATES = {
  navy: {
    name: 'Executive Navy',
    headerBg: '#1e3a8a',
    headerColor: '#ffffff',
    stripeBg: '#f0f7ff',
    whiteBg: '#ffffff',
    totalBg: '#dbeafe',
    totalColor: '#1e3a8a'
  },
  emerald: {
    name: 'Forest Emerald',
    headerBg: '#14532d',
    headerColor: '#ffffff',
    stripeBg: '#f0fdf4',
    whiteBg: '#ffffff',
    totalBg: '#dcfce7',
    totalColor: '#14532d'
  },
  cobalt: {
    name: 'Royal Cobalt',
    headerBg: '#1d4ed8',
    headerColor: '#ffffff',
    stripeBg: '#eff6ff',
    whiteBg: '#ffffff',
    totalBg: '#bfdbfe',
    totalColor: '#1d4ed8'
  },
  slate: {
    name: 'Slate Charcoal',
    headerBg: '#0f172a',
    headerColor: '#ffffff',
    stripeBg: '#f8fafc',
    whiteBg: '#ffffff',
    totalBg: '#e2e8f0',
    totalColor: '#0f172a'
  },
  amber: {
    name: 'Warm Amber',
    headerBg: '#78350f',
    headerColor: '#ffffff',
    stripeBg: '#fffbeb',
    whiteBg: '#ffffff',
    totalBg: '#fef3c7',
    totalColor: '#78350f'
  },
  purple: {
    name: 'Royal Purple',
    headerBg: '#581c87',
    headerColor: '#ffffff',
    stripeBg: '#faf5ff',
    whiteBg: '#ffffff',
    totalBg: '#ede9fe',
    totalColor: '#581c87'
  },
  teal: {
    name: 'Modern Teal',
    headerBg: '#134e4a',
    headerColor: '#ffffff',
    stripeBg: '#f0fdfa',
    whiteBg: '#ffffff',
    totalBg: '#ccfbf1',
    totalColor: '#134e4a'
  },
  crimson: {
    name: 'Crimson Wine',
    headerBg: '#881337',
    headerColor: '#ffffff',
    stripeBg: '#fff1f2',
    whiteBg: '#ffffff',
    totalBg: '#ffe4e6',
    totalColor: '#881337'
  }
};

function applySheetColorTemplate(templateKey) {
  closeAllColorPalettes();
  const sheet = typeof getActiveSheet === 'function' ? getActiveSheet() : null;
  if (!sheet) {
    if (typeof showToast === 'function') {
      showToast('Please open an academic workbook first to apply color templates!', 'info');
    }
    return;
  }

  if (typeof pushUndoState === 'function') pushUndoState('Apply Color Template');

  const selectedRange = typeof getActiveSelectionRange === 'function' ? getActiveSelectionRange() : null;
  const isMultiSelection = selectedRange && (selectedRange.endR > selectedRange.startR || selectedRange.endC > selectedRange.startC);

  if (templateKey === 'plain' || !templateKey) {
    // Reset background and font colors to clean plain grid
    let startR = isMultiSelection ? selectedRange.startR : 0;
    let endR = isMultiSelection ? selectedRange.endR : (sheet.rowsCount ? sheet.rowsCount - 1 : 45);
    let startC = isMultiSelection ? selectedRange.startC : 0;
    let endC = isMultiSelection ? selectedRange.endC : (sheet.colsCount ? sheet.colsCount - 1 : 25);

    for (let r = startR; r <= endR; r++) {
      for (let c = startC; c <= endC; c++) {
        const cell = getCell(sheet, r, c);
        if (cell && cell.s) {
          delete cell.s.bg;
          delete cell.s.color;
          setCell(sheet, r, c, cell);
        }
      }
    }
    if (typeof renderExcelGrid === 'function') renderExcelGrid(false);
    if (typeof triggerAutoSaveIndicator === 'function') triggerAutoSaveIndicator();
    if (typeof showToast === 'function') showToast('Color template reset to Plain Grid', 'info');
    return;
  }

  const theme = SHEET_COLOR_TEMPLATES[templateKey];
  if (!theme) return;

  let headerRow = 1;
  let startDataRow = 2;
  let endDataRow = sheet.rowsCount ? sheet.rowsCount - 1 : 30;
  let startC = 0;
  let endC = sheet.colsCount ? sheet.colsCount - 1 : 12;

  if (isMultiSelection) {
    headerRow = selectedRange.startR;
    startDataRow = selectedRange.startR + 1;
    endDataRow = selectedRange.endR;
    startC = selectedRange.startC;
    endC = selectedRange.endC;
  } else {
    // Intelligently detect header row in sheet: look for SR. NO. / ROLL NO. in rows 0-3
    for (let r = 0; r <= 3; r++) {
      for (let c = 0; c <= 4; c++) {
        const val = String(getCell(sheet, r, c)?.v || '').toUpperCase();
        if (val.includes('SR') || val.includes('ROLL') || val.includes('NAME') || val.includes('THEORY')) {
          headerRow = r;
          startDataRow = r + 1;
          break;
        }
      }
    }
    // Find the last row with student data
    for (let r = startDataRow; r < (sheet.rowsCount || 60); r++) {
      const val = getCell(sheet, r, 0)?.v || getCell(sheet, r, 1)?.v;
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        endDataRow = r;
      }
    }
  }

  // 1. Style Header Row(s)
  for (let c = startC; c <= endC; c++) {
    const cell = getCell(sheet, headerRow, c);
    cell.s = cell.s || {};
    cell.s.bg = theme.headerBg;
    cell.s.color = theme.headerColor;
    cell.s.bold = true;
    cell.s.align = cell.s.align || 'center';
    setCell(sheet, headerRow, c, cell);
  }

  // Identify Total columns (e.g. TOTAL or SUMMARY in header)
  const totalCols = new Set();
  for (let c = startC; c <= endC; c++) {
    const val = String(getCell(sheet, headerRow, c)?.v || '').toUpperCase();
    if (val.includes('TOTAL') || val.includes('SUM')) {
      totalCols.add(c);
    }
  }

  // 2. Style Data Rows (Zebra striping + Total column highlighting)
  let dataIndex = 0;
  for (let r = startDataRow; r <= endDataRow; r++) {
    const isEven = dataIndex % 2 === 0;
    const rowBg = isEven ? theme.whiteBg : theme.stripeBg;
    dataIndex++;

    for (let c = startC; c <= endC; c++) {
      const cell = getCell(sheet, r, c);
      cell.s = cell.s || {};
      if (totalCols.has(c)) {
        cell.s.bg = theme.totalBg;
        cell.s.color = theme.totalColor;
        cell.s.bold = true;
      } else {
        cell.s.bg = rowBg;
        if (!cell.s.color || cell.s.color === '#ffffff') {
          delete cell.s.color;
        }
      }
      setCell(sheet, r, c, cell);
    }
  }

  if (typeof renderExcelGrid === 'function') renderExcelGrid(false);
  if (typeof triggerAutoSaveIndicator === 'function') triggerAutoSaveIndicator();
  if (typeof showToast === 'function') showToast(`Applied ${theme.name} Color Template!`, 'success');
}

/* ══════════════════════════════════════════════════════════════
   CONDITIONAL FORMATTING PRESETS & HEATMAP COLOR SCALES
   ══════════════════════════════════════════════════════════════ */
function applyPresetFormatting(type) {
  closeAllColorPalettes();
  const sheet = typeof getActiveSheet === 'function' ? getActiveSheet() : null;
  if (!sheet) {
    if (typeof showToast === 'function') {
      showToast('Please open an academic workbook first to apply color templates!', 'info');
    }
    return;
  }

  if (typeof pushUndoState === 'function') pushUndoState(`Apply Preset: ${type}`);

  let startR = 3;
  let endR = sheet.rowsCount ? sheet.rowsCount - 1 : 25;
  let startC = 3;
  let endC = sheet.colsCount ? sheet.colsCount - 1 : 15;

  const selectedRange = typeof getActiveSelectionRange === 'function' ? getActiveSelectionRange() : null;
  if (selectedRange && (selectedRange.startR !== selectedRange.endR || selectedRange.startC !== selectedRange.endC)) {
    startR = selectedRange.startR;
    endR = selectedRange.endR;
    startC = selectedRange.startC;
    endC = selectedRange.endC;
  }

  let count = 0;
  for (let r = startR; r <= endR; r++) {
    for (let c = startC; c <= endC; c++) {
      const cell = getCell(sheet, r, c);
      if (!cell || cell.v === undefined || cell.v === null || cell.v === '') continue;

      const num = parseFloat(cell.v);
      if (isNaN(num)) continue;

      cell.s = cell.s || {};

      if (type === 'pass' && num >= 75) {
        cell.s.bg = '#dcfce7';
        cell.s.color = '#166534';
        cell.s.bold = true;
        count++;
      } else if (type === 'avg' && num >= 50 && num < 75) {
        cell.s.bg = '#fef3c7';
        cell.s.color = '#854d0e';
        count++;
      } else if (type === 'fail' && num < 50 && num > 0) {
        cell.s.bg = '#fee2e2';
        cell.s.color = '#991b1b';
        cell.s.bold = true;
        count++;
      } else if (type === 'absent' && num === 0) {
        cell.s.bg = '#f1f5f9';
        cell.s.color = '#64748b';
        count++;
      }

      setCell(sheet, r, c, cell);
    }
  }

  if (typeof renderExcelGrid === 'function') renderExcelGrid(false);
  if (typeof triggerAutoSaveIndicator === 'function') triggerAutoSaveIndicator();
  if (typeof showToast === 'function') showToast(`Formatted ${count} cells with rule`, 'info');
}

function applyColorScale(scaleType) {
  closeAllColorPalettes();
  const sheet = typeof getActiveSheet === 'function' ? getActiveSheet() : null;
  if (!sheet) {
    if (typeof showToast === 'function') {
      showToast('Please open an academic workbook first to apply color templates!', 'info');
    }
    return;
  }

  if (typeof pushUndoState === 'function') pushUndoState(`Apply Color Scale: ${scaleType}`);

  let startR = 3;
  let endR = sheet.rowsCount ? sheet.rowsCount - 1 : 25;
  let startC = 3;
  let endC = sheet.colsCount ? sheet.colsCount - 1 : 15;

  const selectedRange = typeof getActiveSelectionRange === 'function' ? getActiveSelectionRange() : null;
  if (selectedRange && (selectedRange.startR !== selectedRange.endR || selectedRange.startC !== selectedRange.endC)) {
    startR = selectedRange.startR;
    endR = selectedRange.endR;
    startC = selectedRange.startC;
    endC = selectedRange.endC;
  }

  // Find min and max
  let min = Infinity;
  let max = -Infinity;
  const numericCells = [];

  for (let r = startR; r <= endR; r++) {
    for (let c = startC; c <= endC; c++) {
      const cell = getCell(sheet, r, c);
      if (!cell || cell.v === undefined || cell.v === null || cell.v === '') continue;
      const num = parseFloat(cell.v);
      if (!isNaN(num)) {
        if (num < min) min = num;
        if (num > max) max = num;
        numericCells.push({ r, c, val: num, cell });
      }
    }
  }

  if (numericCells.length === 0 || min === max) {
    if (typeof showToast === 'function') showToast('No varied numbers in range for color scale', 'warning');
    return;
  }

  numericCells.forEach(({ r, c, val, cell }) => {
    const ratio = (val - min) / (max - min); // 0 (min) to 1 (max)
    let bg = '';
    let color = '#0f172a';

    if (scaleType === 'gyr') {
      // Green (High) -> Yellow -> Red (Low)
      if (ratio >= 0.7) {
        bg = '#dcfce7'; // green
        color = '#14532d';
      } else if (ratio >= 0.4) {
        bg = '#fef3c7'; // yellow/amber
        color = '#78350f';
      } else {
        bg = '#fee2e2'; // red
        color = '#7f1d1d';
      }
    } else if (scaleType === 'ryg') {
      // Red (High) -> Yellow -> Green (Low)
      if (ratio >= 0.7) {
        bg = '#fee2e2';
        color = '#7f1d1d';
      } else if (ratio >= 0.4) {
        bg = '#fef3c7';
        color = '#78350f';
      } else {
        bg = '#dcfce7';
        color = '#14532d';
      }
    } else if (scaleType === 'bwr') {
      // Blue -> White -> Red
      if (ratio >= 0.65) {
        bg = '#dbeafe';
        color = '#1e3a8a';
      } else if (ratio >= 0.35) {
        bg = '#ffffff';
        color = '#334155';
      } else {
        bg = '#fee2e2';
        color = '#7f1d1d';
      }
    }

    cell.s = cell.s || {};
    cell.s.bg = bg;
    cell.s.color = color;
    setCell(sheet, r, c, cell);
  });

  if (typeof renderExcelGrid === 'function') renderExcelGrid(false);
  if (typeof triggerAutoSaveIndicator === 'function') triggerAutoSaveIndicator();
  if (typeof showToast === 'function') showToast(`Applied ${scaleType.toUpperCase()} Heatmap Scale to ${numericCells.length} cells`, 'info');
}

function clearFormattingRules(scope) {
  closeAllColorPalettes();
  const sheet = typeof getActiveSheet === 'function' ? getActiveSheet() : null;
  if (!sheet) {
    if (typeof showToast === 'function') {
      showToast('Please open an academic workbook first to apply color templates!', 'info');
    }
    return;
  }

  if (typeof pushUndoState === 'function') pushUndoState('Clear Formatting');

  let startR = 0;
  let endR = sheet.rowsCount ? sheet.rowsCount - 1 : 35;
  let startC = 0;
  let endC = sheet.colsCount ? sheet.colsCount - 1 : 20;

  if (scope === 'selection') {
    const selectedRange = typeof getActiveSelectionRange === 'function' ? getActiveSelectionRange() : null;
    if (selectedRange) {
      startR = selectedRange.startR;
      endR = selectedRange.endR;
      startC = selectedRange.startC;
      endC = selectedRange.endC;
    } else if (EXCEL_WB?.activeCell) {
      startR = endR = EXCEL_WB.activeCell.r;
      startC = endC = EXCEL_WB.activeCell.c;
    }
  }

  for (let r = startR; r <= endR; r++) {
    for (let c = startC; c <= endC; c++) {
      const cell = getCell(sheet, r, c);
      if (cell && cell.s) {
        delete cell.s.bg;
        delete cell.s.color;
        setCell(sheet, r, c, cell);
      }
    }
  }

  if (typeof renderExcelGrid === 'function') renderExcelGrid(false);
  if (typeof triggerAutoSaveIndicator === 'function') triggerAutoSaveIndicator();
  if (typeof showToast === 'function') showToast('Formatting cleared', 'info');
}

// Window Globals
window.toggleColorPalette = toggleColorPalette;
window.toggleConditionalFormattingMenu = toggleConditionalFormattingMenu;
window.toggleColorTemplatesMenu = toggleColorTemplatesMenu;
window.closeAllColorPalettes = closeAllColorPalettes;
window.selectFillColor = selectFillColor;
window.selectFontColor = selectFontColor;
window.applySheetColorTemplate = applySheetColorTemplate;
window.applyPresetFormatting = applyPresetFormatting;
window.applyColorScale = applyColorScale;
window.clearFormattingRules = clearFormattingRules;
window.applyFillColor = selectFillColor;
window.applyFontColor = selectFontColor;
