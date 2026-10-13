/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: SCORES
 * frontend/student/scores/scores.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['STUDENT']);

    async function init() {
      await loadProfileHeader();
      await loadScores();
    }

    async function loadProfileHeader() {
      try {
        const res = await fetchApi('/students/me');
        if (res.success && res.data) {
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
        if (!res.success || !res.data || !res.data.length) {
          wrap.innerHTML = `<div class="card" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No exams or unit test scores have been recorded yet.</div>`;
          return;
        }

        wrap.innerHTML = `
          <table class="scores-table">
            <thead>
              <tr>
                <th>Test / Examination</th>
                <th>Subject &amp; Code</th>
                <th style="width: 130px;">Exam Date</th>
                <th style="width: 140px; text-align: right;">Score Obtained</th>
              </tr>
            </thead>
            <tbody>
              ${res.data.map(ex => {
                const hasScore = ex.marks_obtained !== null && ex.marks_obtained !== undefined;
                const pct = hasScore && ex.max_marks ? (ex.marks_obtained / ex.max_marks) * 100 : null;
                const isGood = pct !== null && pct >= 40;
                return `
                <tr>
                  <td style="font-weight: 600; color: var(--text-main);">${escapeHtml(ex.name)}</td>
                  <td>${escapeHtml(ex.subject_name || '')} <span class="code-badge" style="font-size: 0.72rem;">${escapeHtml(ex.subject_code || '')}</span></td>
                  <td>${ex.exam_date ? new Date(ex.exam_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                  <td style="text-align: right;" class="score-value ${pct !== null ? (isGood ? 'good' : 'low') : ''}">
                    ${hasScore ? `${ex.marks_obtained} / ${ex.max_marks}` : '<span style="color: var(--text-muted); font-weight: normal; font-size: 0.8rem;">Pending Entry</span>'}
                  </td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        `;
      } catch (err) {
        wrap.innerHTML = `<div class="card" style="color: var(--status-absent); padding: 1.5rem;">Failed to load test scores: ${escapeHtml(err.message)}</div>`;
      }
    }

    var escapeHtml = window.escapeHtml || (typeof esc !== 'undefined' ? esc : (s => s));


    init();

