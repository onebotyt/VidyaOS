/* ══════════════════════════════════════════════════════════════
   EXCEL STUDIO: COLOR FORMATTING & CONDITIONAL STYLING TOOLS
   ══════════════════════════════════════════════════════════════ */

function positionFloatingDropdown(popup, button) {
  if (!popup || !button) return;
  const rect = button.getBoundingClientRect();
  const popupW = popup.offsetWidth || 260;
  const leftPos = Math.max(8, Math.min(rect.left, window.innerWidth - popupW - 16));
  const topPos = rect.bottom + 4;
  popup.style.position = 'fixed';
  popup.style.top = topPos + 'px';
  popup.style.left = leftPos + 'px';
  popup.style.zIndex = '9999999';
}

function toggleColorPalette(type, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const fillPalette = document.getElementById('palette-fill-color');
  const fontPalette = document.getElementById('palette-font-color');
  const condMenu = document.getElementById('excel-conditional-menu');

  if (condMenu) condMenu.style.display = 'none';

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

  if (fillPalette) fillPalette.style.display = 'none';
  if (fontPalette) fontPalette.style.display = 'none';

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

function closeAllColorPalettes() {
  const fillPalette = document.getElementById('palette-fill-color');
  const fontPalette = document.getElementById('palette-font-color');
  const condMenu = document.getElementById('excel-conditional-menu');
  if (fillPalette) fillPalette.style.display = 'none';
  if (fontPalette) fontPalette.style.display = 'none';
  if (condMenu) condMenu.style.display = 'none';
}

// Close color palettes on outside click or window resize/scroll
document.addEventListener('click', (e) => {
  if (
    !e.target.closest('.excel-color-btn-wrapper') &&
    !e.target.closest('.excel-color-palette-popup') &&
    !e.target.closest('#btn-conditional-formatting') &&
    !e.target.closest('.excel-conditional-dropdown')
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

  if (typeof pushUndoState === 'function') pushUndoState('Preset: ' + type);

  const selectedRange = typeof getActiveSelectionRange === 'function' ? getActiveSelectionRange() : null;

  const startR = selectedRange ? selectedRange.startR : (EXCEL_WB?.activeCell?.r || 3);
  const endR = selectedRange ? selectedRange.endR : (sheet.rowsCount ? sheet.rowsCount - 1 : 25);
  const startC = selectedRange ? selectedRange.startC : (EXCEL_WB?.activeCell?.c || 5);
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
  } else if (type === 'absent') {
    bg = '#f1f5f9'; // Soft Slate
    color = '#64748b'; // Muted Slate
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
  if (typeof showToast === 'function') showToast(`Applied ${type.toUpperCase()} conditional format`, 'success');
}

function applyColorScale(scaleType) {
  closeAllColorPalettes();
  const sheet = typeof getActiveSheet === 'function' ? getActiveSheet() : null;
  if (!sheet) return;

  if (typeof pushUndoState === 'function') pushUndoState('Color Scale: ' + scaleType);

  const selectedRange = typeof getActiveSelectionRange === 'function' ? getActiveSelectionRange() : null;

  const startR = selectedRange ? selectedRange.startR : 3;
  const endR = selectedRange ? selectedRange.endR : Math.min(sheet.rowsCount || 25, 45);
  const startC = selectedRange ? selectedRange.startC : 5;
  const endC = selectedRange ? selectedRange.endC : (sheet.colsCount ? sheet.colsCount - 1 : 15);

  // Collect numeric values
  const numericCells = [];
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let r = startR; r <= endR; r++) {
    for (let c = startC; c <= endC; c++) {
      const cell = getCell(sheet, r, c);
      const num = Number(cell.v);
      if (!isNaN(num) && cell.v !== '' && cell.v !== null && cell.v !== undefined) {
        numericCells.push({ r, c, val: num });
        if (num < minVal) minVal = num;
        if (num > maxVal) maxVal = num;
      }
    }
  }

  if (!numericCells.length || minVal === maxVal) {
    if (typeof showToast === 'function') showToast('Select numeric cells to apply Color Scale', 'info');
    return;
  }

  numericCells.forEach(item => {
    const ratio = (item.val - minVal) / (maxVal - minVal); // 0.0 (min) to 1.0 (max)
    let bg = '';
    let textColor = '#0f172a';

    if (scaleType === 'green-yellow-red') {
      // High = green, mid = yellow, low = red
      if (ratio >= 0.75) {
        bg = '#dcfce7'; textColor = '#166534';
      } else if (ratio >= 0.5) {
        bg = '#fef3c7'; textColor = '#854d0e';
      } else if (ratio >= 0.25) {
        bg = '#ffedd5'; textColor = '#9a3412';
      } else {
        bg = '#fee2e2'; textColor = '#991b1b';
      }
    } else if (scaleType === 'red-yellow-green') {
      // High = red, mid = yellow, low = green
      if (ratio >= 0.75) {
        bg = '#fee2e2'; textColor = '#991b1b';
      } else if (ratio >= 0.5) {
        bg = '#ffedd5'; textColor = '#9a3412';
      } else if (ratio >= 0.25) {
        bg = '#fef3c7'; textColor = '#854d0e';
      } else {
        bg = '#dcfce7'; textColor = '#166534';
      }
    } else if (scaleType === 'blue-white-red') {
      if (ratio >= 0.66) {
        bg = '#fee2e2'; textColor = '#991b1b';
      } else if (ratio >= 0.33) {
        bg = '#ffffff'; textColor = '#0f172a';
      } else {
        bg = '#dbeafe'; textColor = '#1e40af';
      }
    }

    const cell = getCell(sheet, item.r, item.c);
    cell.s = cell.s || {};
    if (bg) cell.s.bg = bg;
    if (textColor) cell.s.color = textColor;
    setCell(sheet, item.r, item.c, cell);
  });

  if (typeof renderExcelGrid === 'function') renderExcelGrid(false);
  if (typeof triggerAutoSaveIndicator === 'function') triggerAutoSaveIndicator();
  if (typeof showToast === 'function') showToast('Color Scale applied', 'success');
}

function clearFormattingRules(scope = 'selection') {
  closeAllColorPalettes();
  const sheet = typeof getActiveSheet === 'function' ? getActiveSheet() : null;
  if (!sheet) return;

  if (typeof pushUndoState === 'function') pushUndoState('Clear Formatting');

  let startR = 3;
  let endR = sheet.rowsCount ? sheet.rowsCount - 1 : 25;
  let startC = 0;
  let endC = sheet.colsCount ? sheet.colsCount - 1 : 15;

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
window.closeAllColorPalettes = closeAllColorPalettes;
window.selectFillColor = selectFillColor;
window.selectFontColor = selectFontColor;
window.applyPresetFormatting = applyPresetFormatting;
window.applyColorScale = applyColorScale;
window.clearFormattingRules = clearFormattingRules;
window.applyFillColor = selectFillColor;
window.applyFontColor = selectFontColor;
