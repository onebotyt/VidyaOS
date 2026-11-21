/**
 * Student Scores & Gradebook View
 */

import { Api } from '../../../core/api.js';
import { Platform } from '../../../core/platform.js';
import { getIcon } from '../../../assets/icons/icons.js';

const MOCK_SCORES = [
  { id: 1, code: 'IT-501', title: 'Database Management Systems', type: 'Sessional 1', semester: 5, obtained: 26, max: 30, grade: 'A', remarks: 'Excellent SQL normalization concepts' },
  { id: 2, code: 'IT-502', title: 'Web Development & Frameworks', type: 'Sessional 1', semester: 5, obtained: 28, max: 30, grade: 'A+', remarks: 'Outstanding full-stack REST API project' },
  { id: 3, code: 'IT-503', title: 'Operating Systems & Linux CLI', type: 'Sessional 1', semester: 5, obtained: 24, max: 30, grade: 'A', remarks: 'Good grasp of memory management' },
  { id: 4, code: 'IT-504', title: 'Computer Networks & Protocols', type: 'Sessional 1', semester: 5, obtained: 22, max: 30, grade: 'B+', remarks: 'Review TCP sliding window mechanics' },
  { id: 5, code: 'IT-505P', title: 'Web Dev & API Laboratory', type: 'Midterm Practical', semester: 5, obtained: 46, max: 50, grade: 'A+', remarks: 'Flawless viva & code execution' },
  { id: 6, code: 'IT-506P', title: 'DBMS SQL & Transactions Lab', type: 'Midterm Practical', semester: 5, obtained: 44, max: 50, grade: 'A', remarks: 'Well-structured queries and triggers' },
  { id: 7, code: 'IT-401', title: 'Core Java Programming', type: 'Semester Final', semester: 4, obtained: 86, max: 100, grade: 'A', remarks: 'Board examination result' },
  { id: 8, code: 'IT-402', title: 'Data Structures & Algorithms', type: 'Semester Final', semester: 4, obtained: 88, max: 100, grade: 'A+', remarks: 'Board examination result' }
];

export async function renderStudentScores(container) {
  let activeSemester = 'ALL';

  container.innerHTML = `
    <div class="view-container">
      <div class="scores-header-bar">
        <div>
          <h2 style="font-size: 22px; font-weight: 700;">Academic Scores & Gradebook</h2>
          <p style="font-size: 13.5px; color: var(--text-muted);">Sessional assessments, internal marks, and university transcripts</p>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" class="btn btn-outline" id="btn-export-grades">
            ${getIcon('download')} Export Transcript PDF
          </button>
        </div>
      </div>

      <!-- Dossier Summary Card -->
      <div class="academic-summary-card">
        <div>
          <div style="display:flex; align-items:center; gap:10px;">
            <h3 style="font-size: 18px; font-weight: 700;" id="scores-student-name">Student Full Name</h3>
            <span class="badge badge-present" id="scores-status-badge">REGULAR</span>
          </div>
          <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;" id="scores-dept-text">
            Information Technology • Year 3 (Semester 5) • Session 2026-27
          </div>

          <div class="summary-meta-grid">
            <div class="summary-meta-item">
              <span class="summary-meta-label">UBTER Roll No</span>
              <span class="summary-meta-value" id="scores-ubter-roll">2100501001</span>
            </div>
            <div class="summary-meta-item">
              <span class="summary-meta-label">Registration No</span>
              <span class="summary-meta-value" id="scores-reg-no">REG-2024-8841</span>
            </div>
            <div class="summary-meta-item">
              <span class="summary-meta-label">Class Roll</span>
              <span class="summary-meta-value" id="scores-class-roll">01</span>
            </div>
            <div class="summary-meta-item">
              <span class="summary-meta-label">Credits Earned</span>
              <span class="summary-meta-value">92.0 / 120</span>
            </div>
          </div>
        </div>

        <div class="gpa-circle-badge">
          <span class="gpa-number">8.65</span>
          <span class="gpa-label">Cumulative GPA</span>
        </div>
      </div>

      <!-- Semester Filter Pills -->
      <div class="sem-filter-pills" id="sem-filter-pills">
        <button type="button" class="sem-pill active" data-sem="ALL">All Semesters</button>
        <button type="button" class="sem-pill" data-sem="5">Semester 5 (Current)</button>
        <button type="button" class="sem-pill" data-sem="4">Semester 4</button>
        <button type="button" class="sem-pill" data-sem="3">Semester 3</button>
        <button type="button" class="sem-pill" data-sem="2">Semester 2</button>
        <button type="button" class="sem-pill" data-sem="1">Semester 1</button>
      </div>

      <!-- Scores Grid -->
      <div class="scores-cards-grid" id="scores-grid">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;

  // Function to render scorecards
  function renderList(semFilter) {
    const grid = container.querySelector('#scores-grid');
    if (!grid) return;

    const filtered = semFilter === 'ALL'
      ? MOCK_SCORES
      : MOCK_SCORES.filter(s => String(s.semester) === String(semFilter));

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          No assessment scores recorded for Semester ${semFilter}.
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(item => {
      const pct = ((item.obtained / item.max) * 100).toFixed(0);
      const gradeClass = item.grade.startsWith('A') ? 'grade-a' : (item.grade.startsWith('B') ? 'grade-b' : 'grade-c');

      return `
        <div class="score-card">
          <div class="score-card-header">
            <div>
              <span class="subject-code-badge" style="font-size: 10.5px; padding: 2px 6px;">${item.code}</span>
              <h4 class="score-subject-name" style="margin-top: 4px;">${item.title}</h4>
            </div>
            <span class="score-exam-type">${item.type}</span>
          </div>

          <div class="score-metrics-row">
            <div>
              <span class="score-marks-obtained">${item.obtained}</span>
              <span class="score-marks-total">/ ${item.max}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 13px; font-weight: 700; color: var(--text-muted);">${pct}%</span>
              <span class="score-grade-badge ${gradeClass}">${item.grade}</span>
            </div>
          </div>

          <div class="score-progress-bar-wrap">
            <div class="score-progress-bar-fill" style="width: ${pct}%"></div>
          </div>

          <div style="font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
            <span>💬</span>
            <span style="font-style: italic;">"${item.remarks}"</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Setup semester filter clicks
  const pills = container.querySelectorAll('.sem-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeSemester = pill.dataset.sem;
      renderList(activeSemester);
      Platform.hapticFeedback('light');
    });
  });

  // Render initial list
  renderList(activeSemester);

  // Load student profile via API if available
  try {
    const res = await Api.get('/api/v1/students/me', { suppressToast: true });
    if (res && res.success && res.data) {
      const s = res.data;
      const nameEl = container.querySelector('#scores-student-name');
      const deptEl = container.querySelector('#scores-dept-text');
      const ubterEl = container.querySelector('#scores-ubter-roll');
      const regEl = container.querySelector('#scores-reg-no');
      const rollEl = container.querySelector('#scores-class-roll');

      if (nameEl) nameEl.textContent = s.full_name || 'Student';
      if (deptEl) deptEl.textContent = `${s.department_name || 'Information Technology'} • Year ${s.year || 3} (Semester ${s.semester || 5})`;
      if (ubterEl) ubterEl.textContent = s.ubter_roll_no || s.official_enrollment_no || '2100501001';
      if (regEl) regEl.textContent = s.registration_no || 'REG-2024-8841';
      if (rollEl) rollEl.textContent = s.class_roll_no ? String(s.class_roll_no) : '01';
    }
  } catch (_) {}
}
