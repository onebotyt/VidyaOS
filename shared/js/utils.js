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
