/**
 * Shared Business Logic Utilities & Formula Helpers
 * Location: /shared/js/utils.js
 */

/**
 * Calculates attendance compliance status client-side for interactive widgets
 */
function calculateAttendanceForecast(conducted, attended, threshold = 75) {
  const C = Number(conducted) || 0;
  const P = Number(attended) || 0;

  if (C === 0) {
    return {
      percentage: 100,
      status: 'SAFE',
      safeAbsences: 0,
      recoveryClasses: 0,
      message: 'No sessions conducted yet'
    };
  }

  const pct = Number(((P / C) * 100).toFixed(2));

  if (pct >= threshold) {
    return {
      percentage: pct,
      status: 'SAFE',
      safeAbsences: 0,
      recoveryClasses: 0,
      message: `Attendance satisfies institutional requirements (≥ ${threshold}%).`
    };
  } else {
    return {
      percentage: pct,
      status: 'DEFICIT',
      safeAbsences: 0,
      recoveryClasses: 0,
      message: `Attendance is below statutory requirement (${threshold}%).`
    };
  }
}

/**
 * Generic CSV Exporter
 * @param {string} filename - Output filename ending in .csv
 * @param {Array<string>} headers - Column headers
 * @param {Array<Array<any>>} rows - 2D data rows
 */
function exportToCsv(filename, headers, rows) {
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map(r => r.map(escapeCsv).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * HTML Escaping utility to prevent XSS in template literals
 * @param {string} str
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function esc(str) {
  return escapeHtml(str);
}

/**
 * Format ISO date to human readable date
 * @param {string} isoString
 */
function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return String(isoString);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Genuine Microsoft Excel (.xlsx) OpenXML Workbook Exporter
 * Converts any DOM Table to an authentic .xlsx binary workbook using ExcelJS
 * @param {HTMLElement} tableOrClone - Table element or cloned DOM table
 * @param {string} filename - Filename without extension
 * @param {string} sheetTitle - Sheet title for the tab
 */
async function exportTableToRealXlsx(tableOrClone, filename, sheetTitle) {
  if (!tableOrClone) return;

  const clone = tableOrClone.cloneNode ? tableOrClone.cloneNode(true) : tableOrClone;
  // Convert nested student cell to readable format
  clone.querySelectorAll('.dyn-student-cell').forEach(cell => {
    const name = cell.querySelector('.dyn-student-name')?.textContent?.trim() || '';
    const enrl = cell.querySelector('.dyn-student-enroll')?.textContent?.trim() || '';
    if (name && enrl) {
      cell.textContent = `${name} (${enrl})`;
    } else if (name) {
      cell.textContent = name;
    }
  });

  // Primary client-side binary OpenXML (.xlsx) generator with ExcelJS
  if (typeof ExcelJS !== 'undefined') {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'VidyaOS Institutional Campus OS';
      wb.created = new Date();

      const cleanSheetName = (sheetTitle || filename || 'Evaluation')
        .replace(/[*?:/\\\[\]]/g, ' ')
        .trim()
        .substring(0, 31) || 'Sheet1';

      const ws = wb.addWorksheet(cleanSheetName, {
        views: [{ showGridLines: true }],
        pageSetup: { orientation: 'landscape', fitToPage: true }
      });

      const borderThin = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };

      const matrix = [];
      let maxCols = 1;
      const trElements = clone.querySelectorAll('tr');

      trElements.forEach((tr, rIdx) => {
        const excelRowIdx = rIdx + 1;
        if (!matrix[excelRowIdx]) matrix[excelRowIdx] = [];
        let excelColIdx = 1;

        const cells = tr.querySelectorAll('th, td');
        cells.forEach(cell => {
          while (matrix[excelRowIdx][excelColIdx]) {
            excelColIdx++;
          }

          const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
          const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);

          const isBlue = cell.classList.contains('excel-hdr-blue') || tr.classList.contains('excel-hdr-blue');
          const isTan = cell.classList.contains('excel-hdr-tan') || tr.classList.contains('excel-hdr-tan');
          const isSub = cell.classList.contains('excel-hdr-sub') || tr.classList.contains('excel-hdr-sub') || cell.classList.contains('excel-hdr-numbers') || tr.classList.contains('excel-hdr-numbers');
          const isSummary = cell.classList.contains('excel-summary-lbl') || cell.classList.contains('excel-summary-avg') || tr.closest('tfoot');
          const isName = cell.classList.contains('cell-student-name') || cell.querySelector('.dyn-student-name');
          const isHeader = cell.tagName.toLowerCase() === 'th' || tr.closest('thead');
          const isAbsent = cell.classList.contains('is-absent');

          let text = cell.textContent.replace(/\s+/g, ' ').trim();
          let val = text;
          if (!isHeader && text !== '' && !isNaN(text) && !text.includes('/') && !text.includes('-') && !(text.length > 1 && text.startsWith('0'))) {
            const num = Number(text);
            if (!isNaN(num)) val = num;
          }

          const excelCell = ws.getCell(excelRowIdx, excelColIdx);
          excelCell.value = val;

          if (isBlue) {
            excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
            excelCell.font = { name: 'Calibri', size: tr.classList.contains('row-1') ? 12 : 10, bold: true, color: { argb: 'FF0369A1' } };
            excelCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          } else if (isTan) {
            excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3C7' } };
            excelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF92400E' } };
            excelCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          } else if (isSub) {
            excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            excelCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF334155' } };
            excelCell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (isSummary) {
            excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cell.classList.contains('excel-summary-lbl') ? 'FFF1F5F9' : 'FFE2E8F0' } };
            excelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
            excelCell.alignment = { horizontal: cell.classList.contains('excel-summary-lbl') ? 'right' : 'center', vertical: 'middle' };
          } else if (isAbsent || text === 'AB' || text === 'A') {
            excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            excelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } };
            excelCell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            excelCell.font = { name: 'Calibri', size: 10, bold: Boolean(isName || isHeader) };
            excelCell.alignment = { horizontal: isName ? 'left' : 'center', vertical: 'middle' };
          }

          if (rowspan > 1 || colspan > 1) {
            const endRow = excelRowIdx + rowspan - 1;
            const endCol = excelColIdx + colspan - 1;
            ws.mergeCells(excelRowIdx, excelColIdx, endRow, endCol);

            for (let r = excelRowIdx; r <= endRow; r++) {
              if (!matrix[r]) matrix[r] = [];
              for (let c = excelColIdx; c <= endCol; c++) {
                matrix[r][c] = true;
                ws.getCell(r, c).border = borderThin;
              }
            }
          } else {
            matrix[excelRowIdx][excelColIdx] = true;
            excelCell.border = borderThin;
          }

          excelColIdx += colspan;
          if (excelColIdx > maxCols) maxCols = excelColIdx;
        });

        const isFirst = rIdx === 0;
        ws.getRow(excelRowIdx).height = isFirst ? 28 : (tr.closest('thead') ? 22 : 20);
      });

      for (let c = 1; c <= maxCols; c++) {
        const col = ws.getColumn(c);
        let maxLen = 8;
        col.eachCell({ includeEmpty: false }, cell => {
          const v = cell.value ? String(cell.value) : '';
          if (v.length > maxLen && v.length < 50) maxLen = v.length;
        });
        col.width = Math.max(9, Math.min(maxLen + 3, 35));
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (clientErr) {
      console.warn('Client-side ExcelJS export failed, trying backend fallback:', clientErr);
    }
  }

  // Backend fallback route
  try {
    const rows = [];
    const trElements = clone.querySelectorAll('tr');
    trElements.forEach(tr => {
      const rowCells = [];
      tr.querySelectorAll('th, td').forEach(c => {
        rowCells.push({
          text: c.textContent.replace(/\s+/g, ' ').trim(),
          colspan: parseInt(c.getAttribute('colspan') || '1', 10),
          rowspan: parseInt(c.getAttribute('rowspan') || '1', 10),
          is_blue: c.classList.contains('excel-hdr-blue') || tr.classList.contains('excel-hdr-blue'),
          is_tan: c.classList.contains('excel-hdr-tan') || tr.classList.contains('excel-hdr-tan'),
          is_sub: c.classList.contains('excel-hdr-sub') || tr.classList.contains('excel-hdr-sub'),
          is_summary: c.classList.contains('excel-summary-lbl') || c.classList.contains('excel-summary-avg') || tr.closest('tfoot'),
          is_label: c.classList.contains('excel-summary-lbl'),
          is_name: c.classList.contains('cell-student-name'),
          is_header: c.tagName.toLowerCase() === 'th' || tr.closest('thead'),
          is_absent: c.classList.contains('is-absent')
        });
      });
      rows.push(rowCells);
    });

    const token = (typeof getAuthToken === 'function' && getAuthToken()) || localStorage.getItem('token') || '';
    const resp = await fetch('/api/v1/faculty/export/table-to-excel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: filename,
        sheet_name: sheetTitle,
        rows: rows
      })
    });

    if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (fallbackErr) {
    console.error('All XLSX export strategies failed:', fallbackErr);
    throw fallbackErr;
  }
}

if (typeof window !== 'undefined') {
  if (!window.escapeHtml) window.escapeHtml = escapeHtml;
  if (!window.esc) window.esc = esc;
  if (!window.formatDate) window.formatDate = formatDate;
  if (!window.exportTableToRealXlsx) window.exportTableToRealXlsx = exportTableToRealXlsx;
}


