/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: STUDENT SCORES & DECOUPLED ACADEMIC ASSESSMENTS
 * frontend/student/scores/scores.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['STUDENT']);

let allScores = [];
let activeSemFilter = 'ALL';
let activeTypeFilter = 'ALL';

async function init() {
  await loadProfileHeader();
  await loadScores();
}

async function loadProfileHeader() {
  try {
    const res = await fetchApi('/students/me', { suppressToast: true });
    if (res && res.success && res.data) {
      const s = res.data;
      const nameEl = document.getElementById('scores-student-name');
      const cohortBadge = document.getElementById('scores-cohort-badge');
      const deptEl = document.getElementById('scores-dept-info');
      const rollEl = document.getElementById('scores-roll-no');
      const regEl = document.getElementById('scores-reg-no');
      const enrollEl = document.getElementById('scores-enrollment-no');

      if (nameEl) nameEl.textContent = s.full_name || 'Student';
      if (cohortBadge) cohortBadge.textContent = `Year ${s.year || 1} • Sem ${s.semester || 1}`;
      if (deptEl) deptEl.textContent = `${s.department_name || 'Department'} (${s.branch_code || s.department_code || ''}) • ${s.academic_year_label || 'Current Session'}`;
      if (rollEl) rollEl.textContent = s.class_roll_no ? `${s.class_roll_no}` : '—';
      if (regEl) regEl.textContent = s.registration_no || '—';
      if (enrollEl) enrollEl.textContent = s.ubter_roll_no || s.official_enrollment_no || '—';
      
      const card = document.getElementById('student-id-card');
      if (card) card.style.display = 'block';
    }
  } catch (err) {
    console.warn('Could not load student profile header:', err);
  }
}

async function loadScores() {
  const wrap = document.getElementById('scores-wrap');
  try {
    let combined = [];

    // 1. Fetch decoupled persistent academic assessments from student dossier
    try {
      const dossierRes = await fetchApi('/students/me/dossier', { suppressToast: true });
      if (dossierRes && dossierRes.success && dossierRes.data && Array.isArray(dossierRes.data.assessments)) {
        dossierRes.data.assessments.forEach(a => {
          combined.push({
            id: a.assessment_id || a.id,
            title: a.title || 'Assessment',
            type: (a.type || 'EXAM').toUpperCase(),
            semester: a.semester ? Number(a.semester) : null,
            year: a.year ? Number(a.year) : null,
            subject_name: a.subject_name || 'General Course',
            subject_code: a.subject_code || '',
            marks_obtained: a.marks_obtained !== null && a.marks_obtained !== undefined ? Number(a.marks_obtained) : null,
            max_marks: Number(a.max_marks || 0),
            submission_status: a.submission_status || 'GRADED',
            date: a.submitted_at || a.created_at || null,
            remarks: a.remarks || ''
          });
        });
      }
    } catch (e) {
      console.warn('Could not fetch student dossier assessments:', e);
    }

    // 2. Fetch /exams as fallback or complementary source
    try {
      const examsRes = await fetchApi('/exams', { suppressToast: true });
      if (examsRes && examsRes.success && Array.isArray(examsRes.data)) {
        examsRes.data.forEach(ex => {
          const already = combined.some(c => String(c.id) === String(ex.id) || (c.title === ex.name && c.subject_name === ex.subject_name));
          if (!already) {
            combined.push({
              id: ex.id,
              title: ex.name || 'Assessment',
              type: 'EXAM',
              semester: ex.semester ? Number(ex.semester) : null,
              year: ex.year ? Number(ex.year) : null,
              subject_name: ex.subject_name || 'General Course',
              subject_code: ex.subject_code || '',
              marks_obtained: ex.marks_obtained !== null && ex.marks_obtained !== undefined ? Number(ex.marks_obtained) : null,
              max_marks: Number(ex.max_marks || 0),
              submission_status: ex.marks_obtained !== null && ex.marks_obtained !== undefined ? 'GRADED' : 'PENDING',
              date: ex.exam_date || null,
              remarks: ex.remarks || ''
            });
          }
        });
      }
    } catch (e) {
      console.warn('Could not fetch exams:', e);
    }

    allScores = combined;
    updateCounts();
    updateScoresKpis();
    filterScoresView();
  } catch (err) {
    if (wrap) {
      wrap.innerHTML = `<div class="card" style="color: var(--status-absent); padding: 1.5rem;">Failed to load test scores: ${escapeHtml(err.message)}</div>`;
    }
  }
}

function updateCounts() {
  const countAll = document.getElementById('count-all');
  const countExams = document.getElementById('count-exams');
  const countAssignments = document.getElementById('count-assignments');

  if (countAll) countAll.textContent = String(allScores.length);
  if (countExams) countExams.textContent = String(allScores.filter(s => s.type === 'EXAM').length);
  if (countAssignments) countAssignments.textContent = String(allScores.filter(s => s.type === 'ASSIGNMENT').length);
}

function updateScoresKpis() {
  const totalEl = document.getElementById('kpi-scores-total');
  const avgEl = document.getElementById('kpi-scores-avg');
  const bestEl = document.getElementById('kpi-scores-best');

  if (totalEl) totalEl.textContent = String(allScores.length);

  const graded = allScores.filter(ex => ex.marks_obtained !== null && ex.marks_obtained !== undefined && Number(ex.max_marks) > 0);
  if (!graded.length) {
    if (avgEl) avgEl.textContent = 'Pending';
    if (bestEl) bestEl.textContent = '—';
    return;
  }

  const pcts = graded.map(ex => (Number(ex.marks_obtained) / Number(ex.max_marks)) * 100);
  const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
  const best = Math.max(...pcts);

  if (avgEl) avgEl.textContent = `${Math.round(avg)}%`;
  if (bestEl) bestEl.textContent = `${Math.round(best)}%`;
}

function setSemesterFilter(sem) {
  activeSemFilter = sem;
  const buttons = document.querySelectorAll('#semester-filters button');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-sem') === String(sem));
  });
  filterScoresView();
}

function setTypeFilter(type) {
  activeTypeFilter = type;
  const buttons = document.querySelectorAll('#type-filters button');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-type') === String(type));
  });
  filterScoresView();
}

function filterScoresView() {
  const q = (document.getElementById('scores-search-input')?.value || '').trim().toLowerCase();
  
  let filtered = allScores;

  // Filter by Semester
  if (activeSemFilter !== 'ALL') {
    const semNum = Number(activeSemFilter);
    filtered = filtered.filter(item => item.semester === semNum);
  }

  // Filter by Type
  if (activeTypeFilter !== 'ALL') {
    filtered = filtered.filter(item => item.type === activeTypeFilter);
  }

  // Filter by Search Query
  if (q) {
    filtered = filtered.filter(item =>
      String(item.title || '').toLowerCase().includes(q) ||
      String(item.subject_name || '').toLowerCase().includes(q) ||
      String(item.subject_code || '').toLowerCase().includes(q)
    );
  }

  renderScoresList(filtered);
}

function renderScoresList(list) {
  const wrap = document.getElementById('scores-wrap');
  if (!wrap) return;

  if (!list.length) {
    wrap.innerHTML = `<div class="card" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No matching assessments or test scores found for the selected criteria.</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="table-responsive scores-table-wrap">
      <table class="scores-table">
        <thead>
          <tr>
            <th>Test / Assessment</th>
            <th>Subject &amp; Code</th>
            <th>Type &amp; Date</th>
            <th>Percentage</th>
            <th style="text-align: right;">Score Obtained</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(ex => {
            const hasScore = ex.marks_obtained !== null && ex.marks_obtained !== undefined;
            const pct = hasScore && ex.max_marks ? Math.round((Number(ex.marks_obtained) / Number(ex.max_marks)) * 100) : null;
            const isGood = pct !== null && pct >= 40;
            const dateStr = ex.date ? new Date(ex.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
            const isExam = ex.type === 'EXAM';
            return `
              <tr>
                <td data-label="Assessment" style="font-weight: 700; color: var(--text-main);">
                  <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                    <span>${escapeHtml(ex.title || 'Assessment')}</span>
                    ${ex.semester ? `<span class="badge-sem">Sem ${ex.semester}</span>` : ''}
                    <span class="badge-type ${isExam ? 'type-exam' : 'type-assignment'}">${isExam ? 'EXAM' : 'ASSIGNMENT'}</span>
                  </div>
                  ${ex.remarks ? `<div style="font-size:0.75rem; color:var(--text-muted); font-weight:500; margin-top:3px;">Note: ${escapeHtml(ex.remarks)}</div>` : ''}
                </td>
                <td data-label="Subject">
                  <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(ex.subject_name || 'Subject')}</div>
                  ${ex.subject_code ? `<span class="code-badge" style="margin-top: 2px; font-size: 0.74rem;">${escapeHtml(ex.subject_code)}</span>` : ''}
                </td>
                <td data-label="Type & Date">
                  <div style="font-size: 0.85rem; color: var(--text-main); font-weight: 600;">${dateStr}</div>
                  <div style="font-size: 0.74rem; color: var(--text-muted); text-transform: capitalize;">${escapeHtml(String(ex.submission_status || 'Graded').toLowerCase())}</div>
                </td>
                <td data-label="Percentage">
                  ${pct !== null ? `
                    <div class="score-pct-wrap">
                      <div class="score-pct-bar"><div class="score-pct-fill ${isGood ? 'good' : 'low'}" style="width:${Math.min(100, Math.max(0, pct))}%;"></div></div>
                      <span class="badge ${isGood ? 'badge-present' : 'badge-absent'}">${pct}%</span>
                    </div>
                  ` : '<span class="badge badge-pending">Awaiting Marks</span>'}
                </td>
                <td data-label="Score" style="text-align: right;" class="score-value ${pct !== null ? (isGood ? 'good' : 'low') : ''}">
                  ${hasScore ? `${ex.marks_obtained} / ${ex.max_marks}` : '<span style="color: var(--text-muted); font-weight: 500; font-size: 0.8rem;">Pending Entry</span>'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

var escapeHtml = window.escapeHtml || (typeof esc !== 'undefined' ? esc : (s => s ? String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]) : ''));
window.filterScoresView = filterScoresView;
window.setSemesterFilter = setSemesterFilter;
window.setTypeFilter = setTypeFilter;

init();
