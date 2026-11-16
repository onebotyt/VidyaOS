/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: STUDENT SCORES (Responsive Table + Mobile Card View)
 * frontend/student/scores/scores.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['STUDENT']);

let allExamScores = [];

async function init() {
  await loadProfileHeader();
  await loadScores();
}

async function loadProfileHeader() {
  try {
    const res = await fetchApi('/students/me', { suppressToast: true });
    if (res && res.success && res.data) {
      const s = res.data;
      document.getElementById('scores-student-name').textContent = s.full_name || 'Student';
      document.getElementById('scores-cohort-badge').textContent = `Year ${s.year || 1} • Sem ${s.semester || 1}`;
      document.getElementById('scores-dept-info').textContent = `${s.department_name || 'Department'} (${s.branch_code || s.department_code || ''}) • ${s.academic_year_label || 'Current Session'}`;
      document.getElementById('scores-roll-no').textContent = s.class_roll_no ? `${s.class_roll_no}` : '—';
      document.getElementById('scores-reg-no').textContent = s.registration_no || '—';
      document.getElementById('scores-enrollment-no').textContent = s.official_enrollment_no || '—';
      document.getElementById('student-id-card').style.display = 'block';
    }
  } catch (err) {
    console.warn('Could not load student profile header:', err);
  }
}

async function loadScores() {
  const wrap = document.getElementById('scores-wrap');
  try {
    const res = await fetchApi('/exams');
    allExamScores = res && res.success && Array.isArray(res.data) ? res.data : [];
    updateScoresKpis();
    renderScoresList(allExamScores);
  } catch (err) {
    wrap.innerHTML = `<div class="card" style="color: var(--status-absent); padding: 1.5rem;">Failed to load test scores: ${escapeHtml(err.message)}</div>`;
  }
}

function updateScoresKpis() {
  const totalEl = document.getElementById('kpi-scores-total');
  const avgEl = document.getElementById('kpi-scores-avg');
  const bestEl = document.getElementById('kpi-scores-best');

  if (totalEl) totalEl.textContent = String(allExamScores.length);

  const graded = allExamScores.filter(ex => ex.marks_obtained !== null && ex.marks_obtained !== undefined && Number(ex.max_marks) > 0);
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

function filterScoresView() {
  const q = (document.getElementById('scores-search-input')?.value || '').trim().toLowerCase();
  if (!q) {
    renderScoresList(allExamScores);
    return;
  }
  const filtered = allExamScores.filter(ex =>
    String(ex.name || '').toLowerCase().includes(q) ||
    String(ex.subject_name || '').toLowerCase().includes(q) ||
    String(ex.subject_code || '').toLowerCase().includes(q)
  );
  renderScoresList(filtered);
}

function renderScoresList(list) {
  const wrap = document.getElementById('scores-wrap');
  if (!wrap) return;

  if (!list.length) {
    wrap.innerHTML = `<div class="card" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No matching exam or unit test scores found.</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="table-responsive scores-table-wrap">
      <table class="scores-table">
        <thead>
          <tr>
            <th>Test / Examination</th>
            <th>Subject &amp; Code</th>
            <th>Exam Date</th>
            <th>Percentage</th>
            <th style="text-align: right;">Score Obtained</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(ex => {
            const hasScore = ex.marks_obtained !== null && ex.marks_obtained !== undefined;
            const pct = hasScore && ex.max_marks ? Math.round((Number(ex.marks_obtained) / Number(ex.max_marks)) * 100) : null;
            const isGood = pct !== null && pct >= 40;
            const dateStr = ex.exam_date ? new Date(ex.exam_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
            return `
              <tr>
                <td data-label="Examination" style="font-weight: 700; color: var(--text-main);">
                  <div>${escapeHtml(ex.name || 'Assessment')}</div>
                  ${ex.remarks ? `<div style="font-size:0.75rem; color:var(--text-muted); font-weight:500; margin-top:2px;">Note: ${escapeHtml(ex.remarks)}</div>` : ''}
                </td>
                <td data-label="Subject">
                  <span>${escapeHtml(ex.subject_name || 'Subject')}</span>
                  ${ex.subject_code ? `<span class="code-badge" style="margin-left:0.35rem;">${escapeHtml(ex.subject_code)}</span>` : ''}
                </td>
                <td data-label="Exam Date">${dateStr}</td>
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

var escapeHtml = window.escapeHtml || (typeof esc !== 'undefined' ? esc : (s => s));
window.filterScoresView = filterScoresView;

init();
