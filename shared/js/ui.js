/**
 * Shared UI Helpers & DOM Utilities
 * Location: /shared/js/ui.js
 */

/**
 * Global Toast Notification
 * @param {string} message - Text message
 * @param {'info'|'success'|'error'|'warning'} type - Toast type
 * @param {number} duration - Milliseconds before auto-dismiss (default 4000ms)
 */
function showToast(message, type = 'info', duration = 4000) {
  // Support both #toast-container and legacy #toast element
  let container = document.getElementById('toast-container');
  if (!container) {
    const legacyToast = document.getElementById('toast');
    if (legacyToast) {
      legacyToast.textContent = message;
      legacyToast.style.display = 'block';
      legacyToast.style.position = 'fixed';
      legacyToast.style.bottom = 'calc(64px + 1.25rem + env(safe-area-inset-bottom, 0px))';
      legacyToast.style.right = '1.5rem';
      legacyToast.style.zIndex = '99999';
      legacyToast.style.background = type === 'error' ? 'var(--status-absent)' : (type === 'success' ? 'var(--status-present)' : (type === 'warning' ? 'var(--status-late)' : 'var(--color-primary)'));
      legacyToast.style.color = 'var(--text-white)';
      clearTimeout(legacyToast._timeout);
      legacyToast._timeout = setTimeout(() => { legacyToast.style.display = 'none'; }, duration);
      return;
    }
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:calc(64px + 1.25rem + env(safe-area-inset-bottom, 0px));right:1.5rem;display:flex;flex-direction:column;gap:0.6rem;z-index:99999;max-width:400px;pointer-events:none;';
    document.body.appendChild(container);
  } else if (!container.style.position) {
    container.style.cssText = 'position:fixed;bottom:calc(64px + 1.25rem + env(safe-area-inset-bottom, 0px));right:1.5rem;display:flex;flex-direction:column;gap:0.6rem;z-index:99999;max-width:400px;pointer-events:none;';
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.cssText = 'pointer-events:auto;background:var(--bg-card);color:var(--text-main);border:1px solid var(--border-color);box-shadow:var(--shadow-md);padding:0.75rem 1.15rem;border-radius:var(--radius-md);font-size:0.875rem;font-weight:500;line-height:1.4;display:flex;align-items:center;gap:0.6rem;animation:fadeIn 0.2s ease-out;';
  if (type === 'error') {
    toast.style.borderLeft = '4px solid var(--status-absent)';
  } else if (type === 'success') {
    toast.style.borderLeft = '4px solid var(--status-present)';
  } else if (type === 'warning') {
    toast.style.borderLeft = '4px solid var(--status-late)';
  } else {
    toast.style.borderLeft = '4px solid var(--color-primary)';
  }
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/**
 * HTML Escaping utility to prevent XSS in template literals
 * @param {string} str
 */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Modal opener
 * @param {string|HTMLElement} idOrEl
 */
function openModal(idOrEl) {
  const modal = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    document.body.classList.add('modal-open');
    // Trap focus / autofocus first input
    const firstInput = modal.querySelector('input:not([disabled]), select:not([disabled]), button:not([disabled])');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
  }
}

/**
 * Modal closer
 * @param {string|HTMLElement} [idOrEl]
 */
function closeModal(idOrEl) {
  const modal = idOrEl ? (typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl) : document.querySelector('.modal-backdrop.open, .modal.open');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
    modal.style.opacity = '';
    modal.style.pointerEvents = '';
    if (!document.querySelector('.modal-backdrop.open, .modal.open')) {
      document.body.classList.remove('modal-open');
    }
  }
}

/**
 * Modal hide alias
 * @param {string|HTMLElement} idOrEl
 */
function hideModal(idOrEl) {
  closeModal(idOrEl);
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModals = document.querySelectorAll('.modal-backdrop.open, .modal.open');
      openModals.forEach((m) => closeModal(m));
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('modal-backdrop')) {
      closeModal(e.target);
    }
  });
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
 * Format ISO time to HH:MM AM/PM
 * @param {string} isoString
 */
function formatTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return String(isoString);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format number to percentage string with color class
 * @param {number} num
 * @param {number} threshold (default 75)
 */
function formatPercentage(num, threshold = 75) {
  const val = Number(num) || 0;
  return {
    value: val.toFixed(1) + '%',
    isSafe: val >= threshold,
    className: val >= threshold ? 'text-success' : 'text-danger'
  };
}

/**
 * Safe HTML string escape alias (compatible with esc)
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return esc(str);
}

/**
 * Calculate total maximum marks from an array of question objects
 * @param {Array<{max: number|string}>} questions
 * @param {number} [defaultVal=25]
 * @returns {number}
 */
function calcTotalMax(questions, defaultVal = 25) {
  if (!Array.isArray(questions) || !questions.length) return defaultVal;
  return questions.reduce((sum, q) => sum + (Number(q.max) || 0), 0);
}

/**
 * Distribute total marks evenly across question drafts
 * @param {Array<{max: number|string}>} questionsDraft
 * @param {number} totalMarks
 * @returns {Array<{max: number}>}
 */
function distributeQuestionMarks(questionsDraft, totalMarks) {
  const total = Math.max(1, parseInt(totalMarks, 10) || 25);
  const n = (questionsDraft && questionsDraft.length) ? questionsDraft.length : 1;
  const perItem = Math.floor(total / n);
  const remainder = total - (perItem * n);
  return questionsDraft.map((q, i) => ({
    ...q,
    max: perItem + (i === n - 1 ? remainder : 0)
  }));
}

/**
 * Clamp a numerical score within [min, max]
 * @param {number|string} val
 * @param {number} [min=0]
 * @param {number} [max=100]
 * @returns {number}
 */
function clampScore(val, min = 0, max = 100) {
  const num = parseFloat(val);
  if (isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

/**
 * Universal Student Multi-Semester Academic Dossier & Vault Viewer
 * Opens an interactive modal displaying student master details, cumulative metrics,
 * and a semester-by-semester breakdown of attendance, submitted coursework files, and test scores.
 * @param {number|string} studentId
 */
async function openStudentDossier(studentId) {
  let modal = document.getElementById('student-dossier-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'student-dossier-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(10,15,30,0.65);z-index:99990;display:flex;align-items:center;justify-content:center;padding:1rem;';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.onclick = (e) => {
      if (e.target === modal) closeStudentDossier();
    };
    document.body.appendChild(modal);
  }

  modal.style.display = 'flex';
  modal.innerHTML = `
    <div style="background:var(--bg-card);color:var(--text-main);border:1px solid var(--border-color);border-radius:var(--radius-lg);max-width:880px;width:100%;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-lg);">
      <div style="padding:2.5rem;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--text-muted);gap:0.75rem;">
        <span style="display:inline-flex;align-items:center;justify-content:center;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>
        <span style="font-weight:600;">Loading Student Academic Dossier &amp; Vault...</span>
      </div>
    </div>
  `;

  try {
    const token = (typeof getToken === 'function' ? getToken() : (localStorage.getItem('access_token') || ''));
    const res = await fetch(`/api/v1/students/${studentId}/academic-dossier`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body?.error?.message || 'Failed to retrieve academic dossier.');
    }
    const { student, summary, semesters } = body.data;
    renderStudentDossierContent(modal, student, summary, semesters);
  } catch (err) {
    modal.innerHTML = `
      <div style="background:var(--bg-card);color:var(--text-main);border:1px solid var(--border-color);border-radius:var(--radius-lg);max-width:520px;width:100%;padding:1.75rem;text-align:center;box-shadow:var(--shadow-lg);">
        <div style="display:flex;justify-content:center;margin-bottom:0.75rem;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--status-absent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
        <h3 style="margin:0 0 0.5rem 0;color:var(--status-absent);">Unable to Open Dossier</h3>
        <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:1.25rem;">${esc(err.message)}</p>
        <button type="button" class="btn btn-secondary" onclick="closeStudentDossier()">Close</button>
      </div>
    `;
  }
}

function closeStudentDossier() {
  const modal = document.getElementById('student-dossier-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function renderStudentDossierContent(modal, student, summary, semesters) {
  const initial = (student.full_name || 'S').charAt(0).toUpperCase();
  const isAlumni = student.enrollment_status === 'COMPLETED' || student.enrollment_status === 'GRADUATED' || student.user_status === 'ALUMNI';
  const statusColor = isAlumni ? 'var(--color-primary)' : 'var(--status-present)';
  const statusBg = isAlumni ? 'var(--chip-hod-bg)' : 'var(--status-present-bg)';
  const statusText = isAlumni ? 'PASSOUT / ALUMNI' : 'ACTIVE';

  let currentSemIndex = 0;

  function renderInner(selectedSemIdx) {
    currentSemIndex = selectedSemIdx;
    const curSem = (semesters && semesters[selectedSemIdx]) || (semesters && semesters[0]) || { semester: 1, attendance: { by_subject: [] }, assignments: [], exams: [] };

    // Semester Selector Pills
    const semPillsHtml = (semesters && semesters.length) ? semesters.map((s, idx) => `
      <button type="button" class="btn btn-sm" onclick="window._switchDossierSem(${idx})" style="
        font-weight: 700;
        font-size: 0.8rem;
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
        border: 1px solid var(--border-color);
        background: ${idx === currentSemIndex ? 'var(--color-primary)' : 'var(--bg-surface)'};
        color: ${idx === currentSemIndex ? 'var(--text-white)' : 'var(--text-main)'};
        cursor: pointer;
        transition: all 0.15s ease;
      ">
        Semester ${s.semester}
      </button>
    `).join('') : '<span style="font-size:0.8rem;color:var(--text-muted);">No recorded terms</span>';

    // Attendance breakdown
    const attPct = curSem.attendance?.percentage || 0;
    const attHeld = curSem.attendance?.total_held || 0;
    const attPres = curSem.attendance?.total_present || 0;
    const attSubjects = curSem.attendance?.by_subject || [];

    const attRowsHtml = attSubjects.length ? attSubjects.map(sub => `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 0.55rem 0.75rem; font-family: var(--font-family-mono); font-weight: 700; color: var(--color-primary); font-size: 0.82rem;">${esc(sub.subject_code)}</td>
        <td style="padding: 0.55rem 0.75rem; font-weight: 600; font-size: 0.85rem; color: var(--text-main);">${esc(sub.subject_name)}</td>
        <td style="padding: 0.55rem 0.75rem; font-size: 0.82rem; text-align: center;">${sub.attended} / ${sub.held}</td>
        <td style="padding: 0.55rem 0.75rem; text-align: right;">
          <span class="badge" style="
            font-weight: 700; font-size: 0.78rem;
            background: ${sub.percentage >= 75 ? 'var(--status-present-bg)' : 'var(--status-absent-bg)'};
            color: ${sub.percentage >= 75 ? 'var(--status-present)' : 'var(--status-absent)'};
          ">${sub.percentage}%</span>
        </td>
      </tr>
    `).join('') : `
      <tr>
        <td colspan="4" style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem;">
          No subject attendance sessions recorded for Semester ${curSem.semester}.
        </td>
      </tr>
    `;

    // Assignments Vault
    const assignments = curSem.assignments || [];
    const assignmentsHtml = assignments.length ? assignments.map(a => {
      const fileBtn = a.file_path ? `
        <a href="${esc(a.file_path)}" target="_blank" download class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.2rem 0.6rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;" title="Download submitted project / assignment">
          <span style="display:inline-flex;align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></span><span>Download File</span>
        </a>
      ` : '<span style="color: var(--text-muted); font-size: 0.75rem;">Text / Online entry</span>';

      const marksDisplay = a.marks_obtained != null ? `<span style="font-weight: 700; color: var(--color-primary);">${a.marks_obtained}</span> / ${a.max_marks || 100}` : '<span style="color: var(--status-late);">Pending Grade</span>';

      return `
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 0.65rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap;">
            <div>
              <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">${esc(a.title)}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.15rem;">
                ${esc(a.subject_name || 'Subject')} • <span class="badge" style="background: var(--bg-surface-secondary); font-size: 0.7rem; padding: 0.1rem 0.4rem;">${esc(a.component || 'THEORY')}</span>
                ${a.submitted_at ? ` • Submitted: ${new Date(a.submitted_at).toLocaleDateString()}` : ''}
              </div>
            </div>
            <div style="text-align: right; display: flex; align-items: center; gap: 0.75rem;">
              <div style="font-size: 0.82rem;">Score: ${marksDisplay}</div>
              ${fileBtn}
            </div>
          </div>
          ${a.feedback ? `<div style="margin-top: 0.5rem; font-size: 0.78rem; background: var(--bg-card); padding: 0.4rem 0.65rem; border-radius: var(--radius-sm); border-left: 3px solid var(--color-primary); color: var(--text-main);"><strong>Teacher Feedback:</strong> ${esc(a.feedback)}</div>` : ''}
        </div>
      `;
    }).join('') : `
      <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
        No submitted coursework or project uploads for Semester ${curSem.semester}.
      </div>
    `;

    // Exams & Class Tests
    const exams = curSem.exams || [];
    const examsHtml = exams.length ? exams.map(e => {
      const marksDisp = e.marks_obtained != null ? `<span style="font-weight: 700; color: var(--color-primary);">${e.marks_obtained}</span> / ${e.max_marks}` : '—';
      const pctDisp = e.percentage != null ? `${e.percentage}%` : '—';
      const statusPill = e.result_status === 'PASS' 
        ? `<span class="badge" style="background: var(--status-present-bg); color: var(--status-present); font-weight: 700; font-size: 0.75rem;">PASS</span>`
        : (e.result_status === 'FAIL' 
            ? `<span class="badge" style="background: var(--status-absent-bg); color: var(--status-absent); font-weight: 700; font-size: 0.75rem;">FAIL</span>`
            : `<span class="badge" style="background: var(--bg-surface-secondary); color: var(--text-muted); font-size: 0.75rem;">—</span>`);

      return `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 0.55rem 0.75rem; font-weight: 600; font-size: 0.85rem; color: var(--text-main);">${esc(e.test_title)}</td>
          <td style="padding: 0.55rem 0.75rem; font-size: 0.82rem; color: var(--text-muted);">${esc(e.subject_name || '—')}</td>
          <td style="padding: 0.55rem 0.75rem; font-size: 0.82rem; text-align: center;">${marksDisp}</td>
          <td style="padding: 0.55rem 0.75rem; font-size: 0.82rem; text-align: center; font-weight: 600;">${pctDisp}</td>
          <td style="padding: 0.55rem 0.75rem; text-align: right;">${statusPill}</td>
        </tr>
      `;
    }).join('') : `
      <tr>
        <td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem;">
          No class tests or examination records for Semester ${curSem.semester}.
        </td>
      </tr>
    `;

    modal.innerHTML = `
      <div style="background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color); border-radius: var(--radius-lg); max-width: 880px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--shadow-lg);">
        <!-- Modal Header -->
        <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <div style="width: 46px; height: 46px; border-radius: 50%; background: var(--color-primary); color: var(--text-white); font-weight: 700; font-size: 1.25rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: var(--shadow-sm);">
              ${esc(initial)}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--text-main);">${esc(student.full_name)}</h2>
                <span class="badge" style="background: ${statusBg}; color: ${statusColor}; font-weight: 700; font-size: 0.75rem;">${statusText}</span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <span>Enrollment: <strong style="font-family: var(--font-family-mono); color: var(--text-main);">${esc(student.official_enrollment_no)}</strong></span>
                <span>Roll: <strong style="color: var(--color-primary);">${student.class_roll_no || '—'}</strong></span>
                <span>${esc(student.department_name || 'Department')}</span>
              </div>
            </div>
          </div>
          <button type="button" onclick="closeStudentDossier()" style="background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; padding: 0.25rem 0.5rem; line-height: 1;" title="Close Dossier">&times;</button>
        </div>

        <!-- Scrollable Modal Body -->
        <div style="padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1;">
          <!-- Summary Metric Cards -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.85rem; margin-bottom: 1.5rem;">
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem; text-align: center;">
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Recorded Semesters</div>
              <div style="font-size: 1.4rem; font-weight: 800; color: var(--color-primary); margin-top: 0.2rem;">${summary.total_semesters_recorded}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Terms with activity</div>
            </div>
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem; text-align: center;">
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Overall Attendance</div>
              <div style="font-size: 1.4rem; font-weight: 800; color: ${summary.overall_attendance_percentage >= 75 ? 'var(--status-present)' : 'var(--status-absent)'}; margin-top: 0.2rem;">
                ${summary.overall_attendance_percentage}%
              </div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${summary.overall_attendance_present} / ${summary.overall_attendance_held} attended</div>
            </div>
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem; text-align: center;">
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Assignments Vault</div>
              <div style="font-size: 1.4rem; font-weight: 800; color: var(--color-primary); margin-top: 0.2rem;">${summary.total_assignments_submitted}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Submitted files &amp; work</div>
            </div>
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem; text-align: center;">
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Class Tests &amp; Exams</div>
              <div style="font-size: 1.4rem; font-weight: 800; color: var(--color-primary); margin-top: 0.2rem;">${summary.total_exams_recorded}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Evaluation records</div>
            </div>
          </div>

          <!-- Multi-Semester Navigation Pills -->
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Select Semester:</span>
            ${semPillsHtml}
          </div>

          <!-- SECTION 1: ATTENDANCE -->
          <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
              <h3 style="font-size: 0.95rem; font-weight: 700; margin: 0; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
                <span style="display:inline-flex;align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span><span>Semester ${curSem.semester} Attendance Ledger</span>
              </h3>
              <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted);">
                Term Attendance: <span style="font-weight: 700; color: ${attPct >= 75 ? 'var(--status-present)' : 'var(--status-absent)'};">${attPct}%</span> (${attPres}/${attHeld} classes)
              </div>
            </div>
            <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <thead>
                  <tr style="background: var(--table-th-bg); border-bottom: 1px solid var(--border-color); text-align: left;">
                    <th style="padding: 0.55rem 0.75rem; font-size: 0.75rem; text-transform: uppercase;">Code</th>
                    <th style="padding: 0.55rem 0.75rem; font-size: 0.75rem; text-transform: uppercase;">Subject Name</th>
                    <th style="padding: 0.55rem 0.75rem; font-size: 0.75rem; text-transform: uppercase; text-align: center;">Attended / Held</th>
                    <th style="padding: 0.55rem 0.75rem; font-size: 0.75rem; text-transform: uppercase; text-align: right;">Rate</th>
                  </tr>
                </thead>
                <tbody>${attRowsHtml}</tbody>
              </table>
            </div>
          </div>

          <!-- SECTION 2: COURSEWORK & SUBMISSIONS VAULT -->
          <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <h3 style="font-size: 0.95rem; font-weight: 700; margin: 0; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
                <span style="display:inline-flex;align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></span><span>Coursework &amp; Projects Vault (Semester ${curSem.semester})</span>
              </h3>
              <span style="font-size: 0.8rem; color: var(--text-muted);">${assignments.length} submission(s)</span>
            </div>
            ${assignmentsHtml}
          </div>

          <!-- SECTION 3: CLASS TESTS & EXAMS -->
          <div style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <h3 style="font-size: 0.95rem; font-weight: 700; margin: 0; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
                <span style="display:inline-flex;align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></span><span>Class Tests &amp; Marks (Semester ${curSem.semester})</span>
              </h3>
              <span style="font-size: 0.8rem; color: var(--text-muted);">${exams.length} test(s)</span>
            </div>
            <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <thead>
                  <tr style="background: var(--table-th-bg); border-bottom: 1px solid var(--border-color); text-align: left;">
                    <th style="padding: 0.55rem 0.75rem; font-size: 0.75rem; text-transform: uppercase;">Exam / Test Title</th>
                    <th style="padding: 0.55rem 0.75rem; font-size: 0.75rem; text-transform: uppercase;">Subject</th>
                    <th style="padding: 0.55rem 0.75rem; font-size: 0.75rem; text-transform: uppercase; text-align: center;">Score</th>
                    <th style="padding: 0.55rem 0.75rem; font-size: 0.75rem; text-transform: uppercase; text-align: center;">%</th>
                    <th style="padding: 0.55rem 0.75rem; font-size: 0.75rem; text-transform: uppercase; text-align: right;">Result</th>
                  </tr>
                </thead>
                <tbody>${examsHtml}</tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div style="padding: 0.85rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface);">
          <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem;">
            <span style="display:inline-flex;align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span><span>Student Data Sovereignty: Academic records belong to the student and are permanently preserved.</span>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeStudentDossier()">Close</button>
        </div>
      </div>
    `;
  }

  window._switchDossierSem = (semIdx) => {
    renderInner(semIdx);
  };

  renderInner(0);
}

if (typeof window !== 'undefined') {
  window.openStudentDossier = openStudentDossier;
  window.closeStudentDossier = closeStudentDossier;
  window.esc = esc;
  window.escapeHtml = escapeHtml;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.hideModal = hideModal;
  window.showToast = showToast;
  window.formatDate = formatDate;
  window.formatTime = formatTime;
}

// ─────────────────────────────────────────────────────────
// UNIVERSAL GOOGLE CLASSROOM NAVIGATION CONTROLLER
// ─────────────────────────────────────────────────────────
function toggleDrawer(forceState) {
  const drawer = document.getElementById('gc-drawer');
  const backdrop = document.getElementById('gc-drawer-backdrop');
  if (!drawer) return;
  const isOpen = forceState !== undefined ? forceState : !drawer.classList.contains('open');
  if (isOpen) {
    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  } else {
    drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function toggleAppsLauncher(forceState) {
  const menu = document.getElementById('apps-launcher-dropdown');
  if (!menu) return;
  if (typeof toggleUserProfile === 'function') toggleUserProfile(false);
  const isOpen = forceState !== undefined ? forceState : (menu.style.display === 'none' || !menu.style.display);
  menu.style.display = isOpen ? 'grid' : 'none';
}

function toggleUserProfile(forceState) {
  const pop = document.getElementById('user-profile-popover');
  if (!pop) return;
  if (forceState !== false) {
    const appsMenu = document.getElementById('apps-launcher-dropdown');
    if (appsMenu) appsMenu.style.display = 'none';
  }
  const isOpen = forceState !== undefined ? forceState : (pop.style.display === 'none' || !pop.style.display);
  pop.style.display = isOpen ? 'flex' : 'none';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch {}
}

if (typeof window !== 'undefined') {
  window.toggleDrawer = toggleDrawer;
  window.toggleAppsLauncher = toggleAppsLauncher;
  window.toggleUserProfile = toggleUserProfile;
  window.toggleTheme = toggleTheme;

  document.addEventListener('DOMContentLoaded', () => {
    try {
      const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
      if (user) {
        const avatarEl = document.getElementById('gc-user-avatar');
        const popAvatarEl = document.getElementById('popover-avatar');
        const popNameEl = document.getElementById('popover-user-name');
        const popEmailEl = document.getElementById('popover-user-email');
        const name = user.full_name || user.name || user.username || 'User';
        const clean = name.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
        const parts = clean.split(/\s+/).filter(Boolean);
        const initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : clean.slice(0, 2).toUpperCase();
        if (avatarEl && (!avatarEl.innerText || avatarEl.innerText.length <= 1)) avatarEl.innerText = initials || 'U';
        if (popAvatarEl && (!popAvatarEl.innerText || popAvatarEl.innerText.length <= 1)) popAvatarEl.innerText = initials || 'U';
        if (popNameEl && popNameEl.innerText.includes('Member')) popNameEl.innerText = name;
        if (popEmailEl && popEmailEl.innerText.includes('@')) popEmailEl.innerText = user.email || `${user.username}@college.edu`;
      }
    } catch {}

    document.addEventListener('click', (e) => {
      const appsDropdown = document.getElementById('apps-launcher-dropdown');
      const appsTrigger = e.target.closest('[onclick*="toggleAppsLauncher"]');
      if (appsDropdown && appsDropdown.style.display !== 'none' && !appsDropdown.contains(e.target) && !appsTrigger) {
        appsDropdown.style.display = 'none';
      }
      const profilePopover = document.getElementById('user-profile-popover');
      const profileTrigger = e.target.closest('#gc-user-avatar');
      if (profilePopover && profilePopover.style.display !== 'none' && !profilePopover.contains(e.target) && !profileTrigger) {
        profilePopover.style.display = 'none';
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        if (typeof window.openOmnisearch === 'function') {
          e.preventDefault();
          window.openOmnisearch();
        } else if (window.location.pathname.startsWith('/faculty/')) {
          e.preventDefault();
          window.location.href = '/faculty/media.html';
        }
      }
      if (e.key === 'Escape') {
        if (typeof window.closeOmnisearch === 'function') {
          window.closeOmnisearch();
        }
        toggleDrawer(false);
        toggleAppsLauncher(false);
        toggleUserProfile(false);
      }
    });
  });
}


