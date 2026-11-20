/* ══════════════════════════════════════════════════════════════
   EXCEL STUDIO: COLOR FORMATTING & CONDITIONAL STYLING TOOLS
   ══════════════════════════════════════════════════════════════ */

function toggleColorPalette(type, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const fillPalette = document.getElementById('palette-fill-color');
  const fontPalette = document.getElementById('palette-font-color');

  if (type === 'fill') {
    if (fontPalette) fontPalette.style.display = 'none';
    if (fillPalette) {
      fillPalette.style.display = fillPalette.style.display === 'none' ? 'flex' : 'none';
    }
  } else if (type === 'font') {
    if (fillPalette) fillPalette.style.display = 'none';
    if (fontPalette) {
      fontPalette.style.display = fontPalette.style.display === 'none' ? 'flex' : 'none';
    }
  }
}

function closeAllColorPalettes() {
  const fillPalette = document.getElementById('palette-fill-color');
  const fontPalette = document.getElementById('palette-font-color');
  if (fillPalette) fillPalette.style.display = 'none';
  if (fontPalette) fontPalette.style.display = 'none';
}

// Close color palettes on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.excel-color-btn-wrapper') && !e.target.closest('.excel-color-palette-popup')) {
    closeAllColorPalettes();
  }
});

function selectFillColor(color) {
  closeAllColorPalettes();
  const bar = document.getElementById('fill-color-bar');
  if (bar) bar.style.backgroundColor = color || 'transparent';

  // Apply to active cell or selection
  const sheet = typeof getActiveSheet === 'function' ? getActiveSheet() : null;
  if (!sheet) return;

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
  if (!sheet) return;

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

function applyPresetFormatting(type) {
  closeAllColorPalettes();
  const sheet = typeof getActiveSheet === 'function' ? getActiveSheet() : null;
  if (!sheet) return;

  if (typeof pushUndoState === 'function') pushUndoState('Preset Formatting: ' + type);

  const selectedRange = typeof getActiveSelectionRange === 'function' ? getActiveSelectionRange() : null;

  const startR = selectedRange ? selectedRange.startR : (EXCEL_WB?.activeCell?.r || 0);
  const endR = selectedRange ? selectedRange.endR : startR;
  const startC = selectedRange ? selectedRange.startC : (EXCEL_WB?.activeCell?.c || 0);
  const endC = selectedRange ? selectedRange.endC : startC;

  let bg = '';
  let color = '';

  if (type === 'pass') {
    bg = '#dcfce7'; // Soft Green
    color = '#166534'; // Dark Green
  } else if (type === 'avg') {
    bg = '#fef3c7'; // Soft Amber
    color = '#854d0e'; // Dark Amber
  } else if (type === 'fail') {
    bg = '#fee2e2'; // Soft Red
    color = '#991b1b'; // Dark Red
  }

  for (let r = startR; r <= endR; r++) {
    for (let c = startC; c <= endC; c++) {
      const cell = getCell(sheet, r, c);
      cell.s = cell.s || {};
      if (bg) cell.s.bg = bg;
      if (color) cell.s.color = color;
      setCell(sheet, r, c, cell);
    }
  }

  if (typeof renderExcelGrid === 'function') renderExcelGrid(false);
  if (typeof triggerAutoSaveIndicator === 'function') triggerAutoSaveIndicator();
  if (typeof showToast === 'function') showToast(`Applied ${type.toUpperCase()} color preset`, 'success');
}

// Window Globals
window.toggleColorPalette = toggleColorPalette;
window.closeAllColorPalettes = closeAllColorPalettes;
window.selectFillColor = selectFillColor;
window.selectFontColor = selectFontColor;
window.applyPresetFormatting = applyPresetFormatting;
window.applyFillColor = selectFillColor;
window.applyFontColor = selectFontColor;
