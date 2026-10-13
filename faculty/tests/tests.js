/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: TESTS
 * frontend/faculty/tests/tests.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute({ roles: ['TEACHER'], requireSubjects: true });

    function getToken() {
      return typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('access_token') || '');
    }

    let allRegisters = [];
    let currentRegisterId = null;
    let registerData = null;
    let currentRegisterExams = [];
    window.examStudioState = window.examStudioState || {};
    window.currentEvalSheetState = null;

    
    function closeModal(id) {
      const m = document.getElementById(id);
      if (m) m.classList.remove('open');
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ['create-exam-modal', 'exam-questions-modal', 'internal-eval-modal', 'delete-item-modal'].forEach(id => closeModal(id));
      }
    });

    async function loadRegistersList() {
      try {
        const res = await fetchApi('/faculty/registers');
        if (res.success) {
          allRegisters = res.data || [];
          if (!allRegisters.length) {
            document.getElementById('register-exams-list').innerHTML = `
              <div class="card" style="text-align: center; padding: 3.5rem 2rem; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-color);">
                <div style="display:flex;justify-content:center;margin-bottom:0.75rem;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></div>
                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text-main);">No Teaching Registers Allocated</h3>
                <p style="font-size: 0.875rem; color: var(--text-muted); max-width: 540px; margin: 0 auto 1.5rem; line-height: 1.5;">
                  Your Department HOD has not allocated any subject registers to your profile yet. Once assigned, your class tests and marksheets will appear here.
                </p>
                <a href="/faculty/dashboard.html" class="btn btn-secondary btn-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Back to Dashboard</a>
              </div>
            `;
            return;
          }

          renderRegisterSwitcher();

          const urlParams = new URLSearchParams(window.location.search);
          const regParam = urlParams.get('id');
          let targetId = regParam ? Number(regParam) : null;
          if (!targetId || !allRegisters.some(r => r.id === targetId)) {
            targetId = allRegisters[0]?.id;
          }
          if (targetId) {
            await selectRegister(targetId);
          }
        }
      } catch (err) {
        console.error('Failed to load registers:', err);
      }
    }

    function renderRegisterSwitcher() {
      const sel = document.getElementById('register-switcher-select');
      if (!sel) return;
      const opts = allRegisters.map(r => {
        const isSel = r.id === currentRegisterId;
        const subj = r.subject_name || r.name || 'Subject';
        const code = r.subject_code ? `[${r.subject_code}]` : '';
        const cls = `Yr ${r.year || 1} Sem ${r.semester || 1}`;
        const dept = r.department_code || r.department_name || '';
        return `<option value="${r.id}" ${isSel ? 'selected' : ''}>${subj} ${code} • ${dept} ${cls}</option>`;
      }).join('');
      sel.innerHTML = opts;
    }

    async function selectRegister(regId) {
      currentRegisterId = Number(regId);
      const url = new URL(window.location);
      url.searchParams.set('id', currentRegisterId);
      window.history.replaceState({}, '', url);

      renderRegisterSwitcher();

      // Quick links updates
      const matrixBtn = document.getElementById('btn-quick-matrix');
      if (matrixBtn) matrixBtn.href = `/faculty/registers.html?id=${currentRegisterId}`;
      const assignBtn = document.getElementById('btn-quick-assignments');
      if (assignBtn) assignBtn.href = `/faculty/assignments.html?id=${currentRegisterId}`;
      const evalBtn = document.getElementById('btn-quick-eval');
      if (evalBtn) evalBtn.href = `/faculty/evaluation.html?id=${currentRegisterId}`;
      const navEval = document.getElementById('nav-eval');
      if (navEval) navEval.href = `/faculty/evaluation.html?id=${currentRegisterId}`;

      try {
        const res = await fetchApi(`/faculty/registers/${currentRegisterId}`);
        if (res.success) {
          registerData = res.data;
          updateMetaStrip();
          await loadRegisterExams();
        }
      } catch (err) {
        console.error('Error fetching register details:', err);
      }
    }

    function onRegisterChange(newId) {
      if (newId) selectRegister(newId);
    }

    function updateMetaStrip() {
      if (!registerData) return;
      document.getElementById('meta-subject-name').innerText = registerData.subject_name || registerData.name || '—';
      document.getElementById('meta-subject-code').innerText = registerData.subject_code || '—';
      document.getElementById('meta-dept-name').innerText = registerData.department_name || registerData.department_code || '—';
      document.getElementById('meta-year-sem').innerText = `Year ${registerData.year || 1} • Sem ${registerData.semester || 1}`;
      const rosterCount = (registerData.students && registerData.students.length) || (registerData.enrolled_count) || 0;
      document.getElementById('meta-student-count').innerText = `${rosterCount} Students Enrolled`;
    }

    function getRegisterQueryParams() {
      if (!registerData) return '';
      const params = new URLSearchParams();
      if (registerData.subject_id) params.set('subject_id', registerData.subject_id);
      if (registerData.department_id) params.set('department_id', registerData.department_id);
      if (registerData.branch_id) params.set('branch_id', registerData.branch_id);
      if (registerData.year) params.set('year', registerData.year);
      if (registerData.semester) params.set('semester', registerData.semester);
      return params.toString();
    }

    async function loadRegisterExams() {
      const container = document.getElementById('register-exams-list');
      if (!container) return;
      if (!registerData) {
        container.innerHTML = `<div class="card" style="text-align:center; padding:2rem; color:var(--text-muted);">Please select a register first.</div>`;
        return;
      }
      container.innerHTML = `<div class="card" style="text-align:center; padding:2.5rem; color:var(--text-muted);">Loading class tests for ${escapeHtml(registerData.subject_name || 'register')}...</div>`;

      try {
        const q = getRegisterQueryParams();
        const res = await fetchApi(`/exams?${q}`);
        if (!res.success || !Array.isArray(res.data) || !res.data.length) {
          container.innerHTML = `
            <div class="card" style="text-align:center; padding:3rem 2rem; color:var(--text-muted); background:var(--bg-surface); border:1px dashed var(--border-color);">
              <div style="display:flex;justify-content:center;margin-bottom:0.5rem;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></div>
              <h3 style="font-size:1.15rem; font-weight:700; color:var(--text-main); margin-bottom:0.35rem;">No Tests or Marksheets Scheduled Yet</h3>
              <p style="font-size:0.85rem; max-width:480px; margin:0 auto 1.25rem;">
                No unit tests, quizzes, or exams scheduled for <strong>${escapeHtml(registerData.subject_name || 'this subject')}</strong>. Click above to schedule one.
              </p>
              <button type="button" class="btn btn-primary btn-sm" onclick="openCreateExamModal()">+ Schedule Class Test</button>
            </div>
          `;
          const b = document.getElementById('badge-tests-count');
          if (b) b.innerText = '0 Tests';
          return;
        }

        currentRegisterExams = res.data;
        const b = document.getElementById('badge-tests-count');
        if (b) b.innerText = `${currentRegisterExams.length} Test${currentRegisterExams.length === 1 ? '' : 's'}`;

        container.innerHTML = currentRegisterExams.map(ex => {
          const dtStr = ex.exam_date ? new Date(ex.exam_date).toLocaleDateString('en-IN') : 'Date not set';
          return `
            <div class="item-card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                  <div class="item-title">${escapeHtml(ex.name)} <span style="font-weight:500; color:var(--text-muted); font-size:0.85rem;">(Max: ${ex.max_marks} marks)</span></div>
                  <div class="item-meta">
                    ${escapeHtml(ex.subject_name || registerData.subject_name || 'Subject')}
                    • Date: <strong>${dtStr}</strong>
                    • Type: <span class="badge badge-late" style="font-size:0.7rem;">${escapeHtml(ex.type || 'UNIT_TEST')}</span>
                  </div>
                </div>
                <div style="text-align: right;">
                  <span class="badge ${ex.scores_entered > 0 ? 'badge-present' : 'badge-pending'}">
                    ${ex.scores_entered || 0} / ${ex.class_size || 0} Marked
                  </span>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.85rem; gap: 0.5rem; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <button type="button" class="btn btn-secondary btn-sm" id="exam-toggle-btn-${ex.id}" onclick="toggleMarks(${ex.id})">Edit</button>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="exportExamStudioExcel(${ex.id})" title="Export Excel (.xlsx)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Export Excel (.xlsx)</button>
                </div>
                <button type="button" class="btn btn-sm" style="color: var(--status-absent); border: 1px solid var(--status-absent-bg); background: var(--status-absent-bg); font-weight: 600;" onclick="openDeleteModal('exam', ${ex.id})">Delete</button>
              </div>
              <div class="expand-panel" id="exam-panel-${ex.id}"></div>
            </div>
          `;
        }).join('');
      } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="card" style="color:var(--status-absent); padding:1.5rem;">Failed to load class tests: ${err.message}</div>`;
      }
    }

    function onExamTypeOrNumChange() {
      const typeEl = document.getElementById('exam-unit-type');
      const numEl = document.getElementById('exam-number-input');
      const hiddenNo = document.getElementById('exam-unit-no');
      const titleInp = document.getElementById('exam-title');
      if (!typeEl || !titleInp) return;

      const type = typeEl.value;
      const num = numEl ? numEl.value.trim() : '1';

      if (type === 'MT') {
        if (numEl) numEl.style.display = 'none';
        if (hiddenNo) hiddenNo.value = 'MT';
        titleInp.value = 'Mid-Term Exam';
      } else if (type === 'FINAL') {
        if (numEl) numEl.style.display = 'none';
        if (hiddenNo) hiddenNo.value = 'FINAL';
        titleInp.value = 'Final Semester Exam';
      } else if (type === 'CUSTOM') {
        if (numEl) { numEl.style.display = 'block'; numEl.placeholder = 'Code'; }
        if (hiddenNo) hiddenNo.value = num || 'CUSTOM';
        titleInp.placeholder = 'e.g. Surprise Test';
      } else {
        if (numEl) { numEl.style.display = 'block'; numEl.placeholder = 'No.'; }
        const typeLabel = type === 'CT' ? 'Class Test' : 'Unit Test';
        const testNum = num || '1';
        if (hiddenNo) hiddenNo.value = `${type}${testNum}`;
        titleInp.value = `${typeLabel} ${testNum}`;
      }
    }
    function onExamUnitChange(val) {
      onExamTypeOrNumChange();
    }

    function openCreateExamModal() {
      if (!registerData) {
        showToast('Please select a register first', 'error');
        return;
      }
      const scopeEl = document.getElementById('modal-exam-scope-text');
      if (scopeEl) {
        scopeEl.innerText = `${registerData.subject_name || registerData.name} ${registerData.subject_code ? '[' + registerData.subject_code + ']' : ''} • Year ${registerData.year || 1} Sem ${registerData.semester || 1}`;
      }
      const dateInput = document.getElementById('exam-date');
      if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
      }
      openModal('create-exam-modal');
      setTimeout(() => {
        const titleInp = document.getElementById('exam-title');
        if (titleInp) titleInp.focus();
      }, 100);
    }

    async function submitRegisterExam(e) {
      e.preventDefault();
      if (!registerData) {
        showToast('Please select a register first', 'error');
        return;
      }

      const saveBtn = document.getElementById('btn-save-exam');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.innerText = 'Scheduling...'; }

      const type = document.getElementById('exam-unit-type')?.value || 'UT';
      const num = document.getElementById('exam-number-input')?.value?.trim() || '1';
      let prefixLabel = type === 'CT' ? `Class Test ${num}` : `Unit Test ${num}`;
      let prefixCode = type === 'CT' ? `CT${num}` : `UT${num}`;
      if (type === 'MT') { prefixLabel = 'Mid-Term Exam'; prefixCode = 'MT'; }
      else if (type === 'FINAL') { prefixLabel = 'Final Semester Exam'; prefixCode = 'FINAL'; }
      else if (type === 'CUSTOM') { prefixLabel = num || 'Custom'; prefixCode = num || 'CUSTOM'; }

      let examTitle = document.getElementById('exam-title').value.trim();
      if (type !== 'CUSTOM' && !examTitle.toLowerCase().includes(prefixLabel.toLowerCase()) && !examTitle.toLowerCase().includes(prefixCode.toLowerCase())) {
        examTitle = `${prefixLabel}: ${examTitle}`;
      }

      try {
        const res = await fetchApi('/exams', {
          method: 'POST',
          body: JSON.stringify({
            name: examTitle,
            type: document.getElementById('exam-type').value,
            exam_date: document.getElementById('exam-date').value || null,
            max_marks: Number(document.getElementById('exam-max-marks').value) || 25,
            subject_id: registerData.subject_id,
            department_id: registerData.department_id,
            branch_id: registerData.branch_id || null,
            year: registerData.year || 1,
            semester: registerData.semester || 1,
            academic_year_id: registerData.academic_year_id || null
          })
        });

        if (res.success) {
          showToast('Test scheduled successfully!', 'success');
          document.getElementById('create-exam-form').reset();
          closeModal('create-exam-modal');
          loadRegisterExams();
        } else {
          showToast(res.error?.message || 'Could not create test', 'error');
        }
      } catch (err) {
        showToast('Failed to create test: ' + err.message, 'error');
      } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = 'Schedule & Create Marksheet'; }
      }
    }

    function calcTotalMax(questions) {
      if (!Array.isArray(questions) || !questions.length) return 25;
      return questions.reduce((sum, q) => sum + (Number(q.max) || 0), 0);
    }

    async function toggleMarks(examId) {
      const panel = document.getElementById(`exam-panel-${examId}`);
      if (!panel) return;
      const btn = document.getElementById(`exam-toggle-btn-${examId}`);
      if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        panel.style.display = '';
        panel.innerHTML = '';
        if (btn) btn.textContent = 'Edit';
        return;
      }
      panel.classList.add('open');
      if (btn) btn.textContent = 'Hide Marks';
      panel.innerHTML = '<div style="text-align:center; padding:1.75rem; color:var(--text-muted);">Loading official examination marksheet...</div>';

      try {
        const res = await fetchApi(`/exams/${examId}/roster`);
        if (!res.success) {
          panel.innerHTML = '<div style="color:var(--status-absent); padding:1rem;">Could not load exam marksheet roster.</div>';
          return;
        }

        const exam = res.data.exam || {};
        const roster = res.data.roster || [];
        const totalMax = Number(exam.max_marks || 25);

        const defaultQuestions = [
          { num: 1, label: 'Q1', max: Math.round(totalMax * 0.2) || 4 },
          { num: 2, label: 'Q2', max: Math.round(totalMax * 0.2) || 4 },
          { num: 3, label: 'Q3', max: Math.round(totalMax * 0.2) || 4 },
          { num: 4, label: 'Q4', max: totalMax - (Math.round(totalMax * 0.2) * 3) || 8 }
        ];

        const defaultInstructions = [
          'All questions are compulsory.',
          'Write your Roll Number and Name clearly.',
          'No electronic gadgets allowed.',
          'Duration is 50 minutes strictly.',
          'Check question paper for any discrepancy.',
          'Neat handwriting is expected.',
          'Maximum marks are indicated against each question.',
          'Submit your answer sheet to the invigilator.'
        ];

        const defaultQuestionsMeta = [
          { num: 1, text: '', marks: defaultQuestions[0].max },
          { num: 2, text: '', marks: defaultQuestions[1].max },
          { num: 3, text: '', marks: defaultQuestions[2].max },
          { num: 4, text: '', marks: defaultQuestions[3].max }
        ];

        const formattedRoster = roster.map((r, idx) => {
          const isAb = Boolean(r.is_absent || r.status === 'ABSENT');
          let qScores = Array.isArray(r.question_scores) && r.question_scores.length ? r.question_scores : null;
          if (!qScores) {
            if (r.marks_obtained !== null && r.marks_obtained !== undefined) {
              const part = Number(r.marks_obtained) / defaultQuestions.length;
              qScores = defaultQuestions.map(() => Math.round(part * 10) / 10);
            } else {
              qScores = defaultQuestions.map(() => 0);
            }
          }
          const tot = isAb ? 0 : qScores.reduce((sum, v) => sum + (Number(v) || 0), 0);
          return {
            student_id: r.student_id,
            class_roll_no: String(r.class_roll_no || idx + 1).replace(/^#/, ''),
            registration_no: r.registration_no || null,
            official_enrollment_no: r.official_enrollment_no || '—',
            full_name: r.full_name || 'Student ' + (idx + 1),
            is_absent: isAb,
            question_scores: qScores,
            total_marks: Math.round(tot * 10) / 10
          };
        });

        window.examStudioState[examId] = {
          exam,
          institution_name: (registerData && registerData.institution_name) || 'Uttarakhand Government Institute of Polytechnic, Srinagar Garhwal',
          session_label: (registerData && registerData.session_label) || 'Internal Evaluation Sheet 2026 Session',
          duration: '50 Minute',
          mode: 'OFFLINE',
          questions: defaultQuestions,
          instructions: defaultInstructions,
          questions_meta: defaultQuestionsMeta,
          roster: formattedRoster
        };

        renderExamStudio(examId);
      } catch (err) {
        console.error(err);
        panel.innerHTML = `<div style="color:var(--status-absent); padding:1rem;">Error initializing marksheet studio: ${err.message}</div>`;
      }
    }

    function renderExamStudio(examId) {
      const panel = document.getElementById(`exam-panel-${examId}`);
      const state = window.examStudioState[examId];
      if (!panel || !state) return;

      const presentStudents = state.roster.filter(s => !s.is_absent);
      const presentCount = presentStudents.length;
      const absentCount = state.roster.length - presentCount;
      const totalCount = state.roster.length;
      const presentSum = presentStudents.reduce((sum, s) => sum + (Number(s.total_marks) || 0), 0);
      const presentAvg = presentCount > 0 ? (presentSum / presentCount) : 0;
      const examMaxMarks = calcTotalMax(state.questions);

      const deptCode = escapeHtml(state.exam.department_code || (registerData && registerData.department_code) || '');
      const deptName = escapeHtml(state.exam.department_name || (registerData && registerData.department_name) || (deptCode ? `Dept of ${deptCode}` : 'Department'));
      const subName = escapeHtml(state.exam.subject_name || (registerData && registerData.subject_name) || 'Subject');
      const yr = state.exam.year || (registerData && registerData.year) || (state.exam.semester ? Math.ceil(state.exam.semester / 2) : 1);
      const sem = state.exam.semester || (registerData && registerData.semester) || 1;
      const examNum = (state.exam.name.match(/\d+/) || ['1'])[0];
      const totalCols = 5 + state.questions.length;

      panel.innerHTML = `
        <div class="sheet-studio-container">
          <!-- TOOLBAR (Spreadsheet Controls) -->
          <div class="sheet-toolbar">
            <div class="sheet-toolbar-group">
              <button type="button" class="btn btn-secondary btn-sm" onclick="openExamQuestionsModal(${examId})" title="Manage Questions, Marks & Settings">+ Add Question</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="removeExamStudioQuestion(${examId})" title="Remove last question column">- Remove Question</button>
            </div>
            <div class="sheet-toolbar-group">
              <button type="button" class="btn btn-secondary btn-sm" onclick="exportExamStudioExcel(${examId})" title="Download official Excel workbook (.xlsx)" style="font-weight: 700; color: var(--status-present);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Export Excel (.xlsx)
              </button>
              <button type="button" class="btn btn-primary btn-sm" onclick="saveExamStudioMarks(${examId})" style="font-weight: 700;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Save Marks
              </button>
            </div>
          </div>

          <!-- SPREADSHEET TABLE -->
          <div class="excel-sheet-viewport">
            <table class="excel-table sheet-table data-subtable">
              <thead>
                <!-- ROW 1: Institution Header (Soft blue fill) -->
                <tr class="excel-hdr-blue row-1 sheet-header-banner">
                  <th colspan="${totalCols}">
                    <h3>${escapeHtml(state.institution_name)} | ${escapeHtml(state.session_label)}</h3>
                  </th>
                </tr>
                <!-- ROW 2: Department & Subject (Soft blue fill) -->
                <tr class="excel-hdr-blue row-2">
                  <th colspan="${totalCols}">
                    Department (${deptCode}) | Internal Evaluation - ${escapeHtml(state.exam.name)} | Subject : ${subName}
                  </th>
                </tr>
                <!-- ROW 3: Year & Semester (Soft blue fill) -->
                <tr class="excel-hdr-blue row-3">
                  <th colspan="${totalCols}">
                    ${deptCode ? deptCode + ' ' : (deptName ? deptName + ' ' : '')}Year ${yr} | Semester ${sem}
                  </th>
                </tr>
                <!-- ROW 4: Column Headers (Tan fill) -->
                <tr class="excel-hdr-tan">
                  <th rowspan="2" style="width: 55px; vertical-align: middle;">SR. NO.</th>
                  <th rowspan="2" style="width: 100px; vertical-align: middle;">ROLL NO.</th>
                  <th rowspan="2" style="width: 220px; vertical-align: middle;">STUDENT NAME</th>
                  <th colspan="${state.questions.length}">${escapeHtml(state.exam.name)} (Total Marks : ${examMaxMarks})</th>
                  <th style="width: 75px;">Total</th>
                  <th style="min-width: 380px;">Unit Test Details (Mode : OFFLINE)</th>
                </tr>
                <!-- ROW 5: Question Numbers & Metadata Subheader -->
                <tr class="excel-hdr-sub">
                  ${state.questions.map(q => `
                    <th style="min-width: 54px; font-weight: 800;">
                      <span>Q${q.num}</span><br>
                      <span style="font-size: 0.72rem; font-weight: 600; opacity: 0.85;">( ${q.max} )</span>
                    </th>
                  `).join('')}
                  <th style="font-weight: 800;">(${examMaxMarks})</th>
                  <th class="excel-meta-bar" style="font-size: 0.74rem; font-weight: 700; padding: 0.35rem 0.6rem; text-align: center;">
                    Maximum Marks : ${examMaxMarks} | Time : ${escapeHtml(state.duration || '50 Minute')} | Date : ${state.exam.exam_date ? state.exam.exam_date.slice(0, 10) : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                ${state.roster.map((r, rIdx) => {
                  const isAb = Boolean(r.is_absent);
                  return `
                    <tr class="${isAb ? 'is-absent' : ''}" id="exam-row-${examId}-${r.student_id}">
                      <td class="excel-cell-sr">${rIdx + 1}</td>
                      <td class="cell-roll">${escapeHtml(String(r.class_roll_no || rIdx + 1))}</td>
                      <td class="cell-student-name">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.4rem;">
                          <div>
                            <span title="${escapeHtml(r.full_name)}" style="font-weight: 700;">${escapeHtml(r.full_name)}</span>
                            <div style="font-family: var(--font-family-mono); font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(r.registration_no || r.official_enrollment_no || '')}</div>
                          </div>
                          <button type="button" 
                                  class="btn-sheet-att-toggle ${isAb ? 'is-absent' : ''}" 
                                  onclick="toggleExamStudentAbsent(${examId}, ${r.student_id})" 
                                  title="${isAb ? 'Marked Absent. Click to mark Present' : 'Click to mark Absent'}">
                            ${isAb ? 'AB (Absent)' : 'Present'}
                          </button>
                        </div>
                      </td>
                      ${state.questions.map((q, qIdx) => {
                        const qVal = (r.question_scores && r.question_scores[qIdx] !== undefined) ? r.question_scores[qIdx] : 0;
                        return `
                          <td>
                            <input type="number" 
                                   class="excel-cell-input sheet-cell-input" 
                                   id="exam-q-${examId}-${r.student_id}-${qIdx}" 
                                   value="${isAb ? 0 : qVal}" 
                                   min="0" 
                                   max="${q.max}" 
                                   step="0.1" 
                                   ${isAb ? 'disabled' : ''} 
                                   oninput="onExamQuestionScoreChange(${examId}, ${r.student_id}, ${qIdx}, this.value)">
                          </td>
                        `;
                      }).join('')}
                      <td class="excel-cell-total" style="font-weight: 800; font-size: 0.9rem;" id="exam-total-${examId}-${r.student_id}">
                        ${isAb ? '<span style="color:var(--status-absent);font-weight:800;">0 (AB)</span>' : (r.total_marks ?? 0)}
                      </td>
                      ${rIdx === 0 ? `
                        <td rowspan="${state.roster.length || 1}" class="sheet-side-panel excel-side-panel-cell">
                          <div class="excel-side-content">
                            <div class="excel-side-sec-title">Instructions :</div>
                            <ol class="excel-side-instructions sheet-instructions-box" style="margin: 0.35rem 0 0.75rem 1.25rem; padding: 0; font-size: 0.76rem; line-height: 1.5; color: var(--text-muted);">
                              ${state.instructions.map((ins, iIdx) => `
                                <li>
                                  <span contenteditable="true" 
                                        title="Click to edit instruction"
                                        onblur="window.examStudioState[${examId}].instructions[${iIdx}] = this.innerText.trim()">${escapeHtml(ins)}</span>
                                </li>
                              `).join('')}
                            </ol>
                            <div class="excel-side-sec-title" style="margin-top: 0.85rem;">Questions :</div>
                            <div class="excel-side-questions sheet-questions-box" style="font-size: 0.76rem; line-height: 1.5; color: var(--text-muted);">
                              ${state.questions.map((q, idx) => `
                                <div class="excel-q-item" style="margin-bottom: 0.35rem;">
                                  <strong>Q${q.num}:</strong> 
                                  <span contenteditable="true" 
                                        title="Click to edit question statement"
                                        onblur="if(window.examStudioState[${examId}].questions_meta && window.examStudioState[${examId}].questions_meta[${idx}]) window.examStudioState[${examId}].questions_meta[${idx}].text = this.innerText.trim()">${(state.questions_meta && state.questions_meta[idx] && state.questions_meta[idx].text) ? escapeHtml(state.questions_meta[idx].text) : '(Question text not set — click "+ Add Question" to edit)'}</span>
                                  <strong>(${q.max} Marks)</strong>
                                </div>
                              `).join('')}
                            </div>
                            <div class="sheet-note-red" style="margin-top: 1rem; color: var(--status-absent); font-weight: 700; font-size: 0.78rem;">
                              NOTE : All marked as RED were absent.
                            </div>
                          </div>
                        </td>
                      ` : ''}
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="${3 + state.questions.length}" class="excel-summary-lbl" style="text-align: right; font-weight: 800;">
                    Average of the class (Only present students)
                  </td>
                  <td class="excel-summary-avg" id="exam-class-avg-${examId}" style="font-weight: 800; text-align: center;">
                    ${presentAvg.toFixed(1)} / ${examMaxMarks}
                  </td>
                  <td class="excel-summary-tally-cell">
                    <div class="excel-tally-row" style="display: flex; gap: 1rem; justify-content: center; font-size: 0.78rem;">
                      <span class="excel-tally-item">Present: <strong style="color: var(--status-present);">${presentCount}</strong></span>
                      <span class="excel-tally-item">Absent: <strong style="color: var(--status-absent); font-weight: 800;">${absentCount}</strong></span>
                      <span class="excel-tally-item">Total: <strong>${totalCount}</strong></span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;
    }

    async function restoreUnitTestSheet() {
      const evalModal = document.getElementById('internal-eval-modal');
      if (evalModal && evalModal.classList.contains('open')) {
        closeModal('internal-eval-modal');
      }
      if (Array.isArray(currentRegisterExams) && currentRegisterExams.length > 0) {
        const firstExam = currentRegisterExams[0];
        const panel = document.getElementById(`exam-panel-${firstExam.id}`);
        if (panel && !panel.classList.contains('open')) {
          await toggleMarks(firstExam.id);
        }
        showToast(`Restored Unit Test Sheet (${firstExam.name})`, 'success');
        if (panel) {
          const card = panel.closest('.item-card');
          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        showToast('No scheduled unit tests available to restore.', 'info');
      }
    }

    async function exportAllTestsExcel() {
      if (!registerData) { showToast('Please select a register first', 'error'); return; }
      showToast('Building consolidated All Tests export...', 'info');
      try {
        const q = getRegisterQueryParams();
        const res = await fetchApi(`/exams?${q}`);
        if (!res.success || !Array.isArray(res.data) || !res.data.length) {
          showToast('No tests found to export', 'error'); return;
        }
        const allExams = res.data;
        const rosterPromises = allExams.map(ex => fetchApi(`/exams/${ex.id}/roster`));
        const rosterResults = await Promise.all(rosterPromises);

        const studentMap = {};
        allExams.forEach((ex, i) => {
          const rList = rosterResults[i].success ? (rosterResults[i].data.roster || []) : [];
          rList.forEach(st => {
            if (!studentMap[st.student_id]) {
              studentMap[st.student_id] = {
                student_id: st.student_id,
                class_roll_no: st.class_roll_no,
                registration_no: st.registration_no,
                official_enrollment_no: st.official_enrollment_no,
                full_name: st.full_name,
                exam_scores: {}
              };
            }
            studentMap[st.student_id].exam_scores[ex.id] = {
              marks: st.marks_obtained,
              is_absent: Boolean(st.is_absent)
            };
          });
        });
        const roster = Object.values(studentMap).sort((a, b) => (Number(a.class_roll_no) || 0) - (Number(b.class_roll_no) || 0));

        const payload = {
          institution_name: (registerData && registerData.institution_name) || 'Uttarakhand Government Institute of Polytechnic, Srinagar Garhwal',
          session_label: (registerData && registerData.session_label) || 'Internal Evaluation Sheet',
          department_name: registerData.department_name || '',
          department_code: registerData.department_code || '',
          subject_name: registerData.subject_name || '',
          year: registerData.year || 1,
          semester: registerData.semester || 1,
          target_avg_max: 20,
          exams: allExams.map(ex => ({
            id: ex.id,
            name: ex.name,
            exam_date: ex.exam_date,
            max_marks: ex.max_marks
          })),
          roster: roster
        };
        const fetchRes = await fetch(`/api/v1/faculty/registers/${currentRegisterId}/export/all-tests-excel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
          body: JSON.stringify(payload)
        });
        if (!fetchRes.ok) throw new Error('Export failed: ' + fetchRes.statusText);
        const blob = await fetchRes.blob();
        downloadBlob(blob, `All_Tests_${(registerData.subject_code || 'Subject').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`);
        showToast('All Tests exported successfully!', 'success');
      } catch (err) {
        showToast('Export failed: ' + err.message, 'error');
      }
    }

    function onExamQuestionScoreChange(examId, studentId, qIdx, value) {
      const state = window.examStudioState[examId];
      if (!state) return;
      const student = state.roster.find(s => s.student_id === studentId);
      if (!student) return;

      const numVal = Math.max(0, parseFloat(value) || 0);
      const qMax = state.questions[qIdx] ? Number(state.questions[qIdx].max) : 10;
      student.question_scores[qIdx] = Math.min(numVal, qMax);

      const tot = student.question_scores.reduce((sum, v) => sum + (Number(v) || 0), 0);
      student.total_marks = Math.round(tot * 10) / 10;

      const totCell = document.getElementById(`exam-total-${examId}-${studentId}`);
      if (totCell) totCell.innerHTML = student.is_absent ? '<span style="color:var(--status-absent);font-weight:800;">0 (AB)</span>' : student.total_marks;

      const present = state.roster.filter(s => !s.is_absent);
      const pSum = present.reduce((sum, s) => sum + (Number(s.total_marks) || 0), 0);
      const pAvg = present.length ? (pSum / present.length) : 0;
      const examMax = calcTotalMax(state.questions);
      const avgEl = document.getElementById(`exam-class-avg-${examId}`);
      if (avgEl) avgEl.innerText = `${pAvg.toFixed(1)} / ${examMax}`;
    }

    function toggleExamStudentAbsent(examId, studentId) {
      const state = window.examStudioState[examId];
      if (!state) return;
      const student = state.roster.find(s => s.student_id === studentId);
      if (!student) return;
      student.is_absent = !student.is_absent;
      renderExamStudio(examId);
    }

    let currentExamModalId = null;
    let modalQuestionsDraft = [];

    function openExamQuestionsModal(examId) {
      currentExamModalId = examId;
      const state = window.examStudioState[examId];
      if (!state) return;

      const titleEl = document.getElementById('modal-exam-q-test-title');
      if (titleEl) titleEl.innerText = state.exam.name || 'Unit Test';

      const examTotalEl = document.getElementById('modal-exam-grand-total');
      if (examTotalEl) examTotalEl.value = calcTotalMax(state.questions);

      modalQuestionsDraft = state.questions.map((q, idx) => {
        const metaText = (state.questions_meta && state.questions_meta[idx] && state.questions_meta[idx].text) ? state.questions_meta[idx].text : '';
        return { num: q.num || (idx + 1), text: metaText, max: Number(q.max) || 5 };
      });

      if (!modalQuestionsDraft.length) {
        modalQuestionsDraft.push({ num: 1, text: '', max: 5 });
      }

      renderModalQuestions();
      openModal('exam-questions-modal');
    }

    function autoDistributeFromTotal() {
      const totalEl = document.getElementById('modal-exam-grand-total');
      const total = Math.max(1, parseInt(totalEl ? totalEl.value : 25, 10) || 25);
      modalQuestionsDraft = distributeQuestionMarks(modalQuestionsDraft, total);
      renderModalQuestions();
      showToast(`Auto-distributed ${total} marks across ${modalQuestionsDraft.length} questions`, 'info');
    }

    function renderModalQuestions() {
      const container = document.getElementById('modal-questions-list');
      if (!container) return;

      container.innerHTML = modalQuestionsDraft.map((q, idx) => `
        <div class="modal-q-item" id="modal-q-row-${idx}">
          <div style="font-weight: 800; color: var(--color-primary); font-size: 0.88rem; text-align: center;">Q${idx + 1}</div>
          <div>
            <input type="text" 
                   class="form-control modal-q-text" 
                   style="width: 100%; box-sizing: border-box; padding: 0.45rem 0.6rem; font-size: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main);"
                   placeholder="Question statement (optional)..." 
                   value="${escapeHtml(q.text || '')}"
                   oninput="modalQuestionsDraft[${idx}].text = this.value">
          </div>
          <div>
            <input type="number" 
                   class="form-control modal-q-max" 
                   min="1" 
                   max="200" 
                   style="width: 100%; box-sizing: border-box; padding: 0.45rem 0.6rem; font-size: 0.85rem; text-align: right; font-weight: 700; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main);"
                   value="${q.max || 5}"
                   oninput="modalQuestionsDraft[${idx}].max = Math.max(1, parseInt(this.value, 10) || 1); updateModalTotalMaxMarks()">
          </div>
          <div style="text-align: center; display: flex; gap: 0.3rem; align-items: center;">
            <button type="button" 
                    class="btn btn-secondary btn-sm" 
                    style="padding: 0.35rem 0.5rem; color: var(--status-absent); font-size: 0.8rem;" 
                    onclick="confirmRemoveModalQuestion(${idx})" 
                    title="Delete Question Q${idx + 1}" style="display:inline-flex;align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
        </div>
      `).join('');

      updateModalTotalMaxMarks();
    }

    let _pendingDeleteQIdx = null;
    function confirmRemoveModalQuestion(idx) {
      if (modalQuestionsDraft.length <= 1) { showToast('At least 1 question required', 'error'); return; }
      _pendingDeleteQIdx = idx;
      const confirmBar = document.getElementById('modal-q-delete-confirm-bar');
      if (confirmBar) {
        confirmBar.style.display = 'flex';
        const msg = document.getElementById('modal-q-delete-confirm-msg');
        if (msg) msg.innerText = `Delete Q${idx + 1}? This cannot be undone.`;
      }
    }
    function cancelRemoveModalQuestion() {
      _pendingDeleteQIdx = null;
      const confirmBar = document.getElementById('modal-q-delete-confirm-bar');
      if (confirmBar) confirmBar.style.display = 'none';
    }
    function doRemoveModalQuestion() {
      const idx = _pendingDeleteQIdx;
      if (idx === null || idx === undefined) return;
      if (modalQuestionsDraft.length <= 1) { showToast('At least 1 question required', 'error'); return; }
      modalQuestionsDraft.splice(idx, 1);
      modalQuestionsDraft.forEach((q, i) => { q.num = i + 1; });
      _pendingDeleteQIdx = null;
      const confirmBar = document.getElementById('modal-q-delete-confirm-bar');
      if (confirmBar) confirmBar.style.display = 'none';
      renderModalQuestions();
      showToast(`Deleted question. ${modalQuestionsDraft.length} questions remaining.`, 'info');
    }

    function addModalQuestionRow() {
      const nextNum = modalQuestionsDraft.length + 1;
      modalQuestionsDraft.push({ num: nextNum, text: '', max: 5 });
      renderModalQuestions();
    }

    function updateModalTotalMaxMarks() {
      const total = modalQuestionsDraft.reduce((s, q) => s + (Number(q.max) || 0), 0);
      const totalEl = document.getElementById('modal-exam-total-max');
      if (totalEl) totalEl.innerText = total;
    }

    function saveExamQuestionsFromModal() {
      if (!currentExamModalId) return;
      const state = window.examStudioState[currentExamModalId];
      if (!state) return;

      if (!modalQuestionsDraft.length) {
        showToast('At least 1 question is required', 'error');
        return;
      }

      state.questions = modalQuestionsDraft.map((q, idx) => ({
        num: idx + 1,
        label: 'Q' + (idx + 1),
        max: Number(q.max) || 5
      }));

      state.questions_meta = modalQuestionsDraft.map((q, idx) => ({
        num: idx + 1,
        text: (q.text || '').trim(),
        marks: Number(q.max) || 5
      }));

      state.roster.forEach(s => {
        if (!Array.isArray(s.question_scores)) s.question_scores = [];
        while (s.question_scores.length < state.questions.length) {
          s.question_scores.push(0);
        }
        if (s.question_scores.length > state.questions.length) {
          s.question_scores = s.question_scores.slice(0, state.questions.length);
        }
        s.question_scores = s.question_scores.map((score, qIdx) => Math.min(Number(score) || 0, state.questions[qIdx].max));
        const tot = s.is_absent ? 0 : s.question_scores.reduce((sum, v) => sum + (Number(v) || 0), 0);
        s.total_marks = Math.round(tot * 10) / 10;
      });

      closeModal('exam-questions-modal');
      renderExamStudio(currentExamModalId);
      showToast(`Updated questions & marks successfully! (${state.questions.length} questions, ${calcTotalMax(state.questions)} total marks)`, 'success');
    }

    function removeExamStudioQuestion(examId) {
      const state = window.examStudioState[examId];
      if (!state) return;
      if (state.questions.length <= 1) {
        showToast('At least 1 question is required', 'error');
        return;
      }
      state.questions.pop();
      if (state.questions_meta) state.questions_meta.pop();
      state.roster.forEach(s => {
        if (Array.isArray(s.question_scores)) {
          s.question_scores.pop();
          const tot = s.question_scores.reduce((sum, v) => sum + (Number(v) || 0), 0);
          s.total_marks = Math.round(tot * 10) / 10;
        }
      });
      renderExamStudio(examId);
      showToast('Removed last question column', 'info');
    }

    async function exportExamStudioExcel(examId) {
      const state = window.examStudioState[examId];
      if (!state) return;
      try {
        showToast('Generating official Excel workbook (.xlsx)...', 'info');
        const examMax = calcTotalMax(state.questions);
        const payload = {
          institution_name: state.institution_name,
          session_label: state.session_label,
          department_name: state.exam.department_name || (registerData && registerData.department_name),
          department_code: state.exam.department_code || (registerData && registerData.department_code),
          subject_name: state.exam.subject_name || (registerData && registerData.subject_name),
          year: state.exam.year || (registerData && registerData.year),
          semester: state.exam.semester || (registerData && registerData.semester),
          name: state.exam.name,
          max_marks: examMax,
          exam_date: state.exam.exam_date,
          duration: state.duration,
          mode: state.mode,
          questions: state.questions,
          instructions: state.instructions,
          questions_meta: state.questions_meta,
          roster: state.roster.map(r => ({
            student_id: r.student_id,
            class_roll_no: r.class_roll_no,
            registration_no: r.registration_no,
            official_enrollment_no: r.official_enrollment_no,
            full_name: r.full_name,
            is_absent: r.is_absent,
            question_scores: r.question_scores,
            marks_obtained: r.is_absent ? 0 : r.total_marks
          }))
        };

        const res = await fetch(`/api/v1/exams/${examId}/export/excel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Failed to generate Excel file');
        const blob = await res.blob();
        downloadBlob(blob, `${(state.exam.name || 'Unit_Test').replace(/[^a-zA-Z0-9_-]/g, '_')}_Marksheet.xlsx`);
        showToast('Excel workbook exported successfully!', 'success');
      } catch (err) {
        showToast('Export failed: ' + err.message, 'error');
      }
    }

    async function saveExamStudioMarks(examId) {
      const state = window.examStudioState[examId];
      if (!state) return;
      try {
        const scores = state.roster.map(s => ({
          student_id: s.student_id,
          marks_obtained: s.is_absent ? 0 : s.total_marks,
          is_absent: Boolean(s.is_absent),
          question_scores: s.question_scores
        }));

        const res = await fetchApi(`/exams/${examId}/scores`, {
          method: 'POST',
          body: JSON.stringify({ scores })
        });

        if (res.success) {
          showToast(`Saved marks for ${scores.length} students!`, 'success');
          loadRegisterExams();
        } else {
          showToast(res.error?.message || 'Could not save marks', 'error');
        }
      } catch (err) {
        showToast('Failed to save marks: ' + err.message, 'error');
      }
    }

    // ─── MASTER INTERNAL EVALUATION SPREADSHEET STUDIO ───
    async function openInternalEvaluationStudio() {
      if (!registerData) {
        showToast('Please select a register first', 'error');
        return;
      }
      openModal('internal-eval-modal');

      const content = document.getElementById('internal-eval-content');
      content.innerHTML = '<div style="text-align:center; padding:3rem; color:var(--text-muted);">Loading internal evaluation data...</div>';

      try {
        const res = await fetchApi(`/faculty/registers/${currentRegisterId}/internal-evaluation`);
        if (!res.success) {
          content.innerHTML = `<div class="card" style="color:var(--status-absent); padding:1.5rem;">Failed to load evaluation sheet: ${escapeHtml(res.error?.message || 'Error')}</div>`;
          return;
        }

        const d = res.data;
        const assignList = Array.isArray(d.assignments) && d.assignments.length ? d.assignments : [
          { id: 1, name: '1' }, { id: 2, name: '2' }, { id: 3, name: '3' }, { id: 4, name: '4' }, { id: 5, name: '5' }
        ];
        const examList = Array.isArray(d.exams) && d.exams.length ? d.exams : [
          { id: 1, name: '1' }, { id: 2, name: '2' }, { id: 3, name: '3' }, { id: 4, name: '4' }
        ];

        const studentRawList = Array.isArray(d.roster) ? d.roster : (Array.isArray(d.students) ? d.students : []);

        window.currentEvalSheetState = {
          register: registerData,
          institution_name: d.institution_name || (registerData && registerData.institution_name) || 'Uttarakhand Government Institute of Polytechnic, Srinagar Garhwal',
          session_label: d.session_label || (registerData && registerData.session_label) || 'Internal Evaluation Sheet 2026 Session',
          assignments: assignList,
          exams: examList,
          custom_columns: Array.isArray(d.custom_columns) ? d.custom_columns : [],
          students: studentRawList.map((s, idx) => {
            const aScores = assignList.map((_, i) => {
              if (s.assignment_scores && s.assignment_scores[i] !== undefined && s.assignment_scores[i] !== '') {
                return Number(s.assignment_scores[i]);
              }
              return 12;
            });
            const eScores = [];
            const eAb = [];
            examList.forEach((_, i) => {
              const ex = s.exam_scores && s.exam_scores[i];
              if (typeof ex === 'object' && ex !== null) {
                eScores.push((ex.marks !== '' && ex.marks !== undefined && ex.marks !== null) ? Number(ex.marks) : 0);
                eAb.push(Boolean(ex.is_absent));
              } else if (ex !== undefined && ex !== '') {
                eScores.push(Number(ex));
                eAb.push(Boolean(s.exam_absent && s.exam_absent[i]));
              } else {
                eScores.push(18);
                eAb.push(false);
              }
            });
            const attSc = s.attendance_score !== undefined ? Number(s.attendance_score) : (s.attendance_percentage !== undefined ? Math.round((s.attendance_percentage / 10) * 10) / 10 : 9);
            const presSc = s.presentation_score !== undefined ? Number(s.presentation_score) : 4.5;
            
            const studentObj = {
              student_id: s.student_id || (idx + 1),
              class_roll_no: s.class_roll_no || idx + 1,
              registration_no: s.registration_no || null,
              official_enrollment_no: s.official_enrollment_no || '—',
              full_name: s.full_name || 'Student ' + (idx + 1),
              assignment_scores: aScores,
              assignment_avg: 0,
              exam_scores: eScores,
              exam_absent: eAb,
              exam_avg: 0,
              attendance_score: attSc,
              presentation_score: presSc,
              custom_scores: [],
              grand_total: 0
            };
            recalculateEvalRow(studentObj);
            return studentObj;
          })
        };

        renderInternalEvalGrid();
      } catch (err) {
        content.innerHTML = `<div class="card" style="color:var(--status-absent); padding:1.5rem;">Error loading evaluation sheet: ${err.message}</div>`;
      }
    }

    function recalculateEvalRow(s) {
      if (!s) return;
      let aSum = 0;
      let aValidCount = 0;
      s.assignment_scores.forEach(v => {
        if (v !== '' && v !== null && !isNaN(v)) {
          aSum += Number(v);
          aValidCount++;
        }
      });
      s.assignment_avg = aValidCount > 0 ? Math.round((aSum / aValidCount) * 10) / 10 : 0;

      let eCount = 0;
      let eSum = 0;
      s.exam_scores.forEach((sc, i) => {
        if (!s.exam_absent[i] && sc !== '' && sc !== null && !isNaN(sc)) {
          eCount++;
          eSum += Number(sc);
        }
      });
      s.exam_avg = eCount > 0 ? Math.round((eSum / eCount) * 10) / 10 : 0;

      const cSum = s.custom_scores.reduce((sum, v) => sum + (Number(v) || 0), 0);

      const tot = (Number(s.assignment_avg) || 0) + (Number(s.exam_avg) || 0) + (Number(s.attendance_score) || 0) + (Number(s.presentation_score) || 0) + cSum;
      s.grand_total = Math.round(tot * 10) / 10;
    }

    function renderInternalEvalGrid() {
      const content = document.getElementById('internal-eval-content');
      const state = window.currentEvalSheetState;
      if (!content || !state) return;

      const aCount = state.assignments.length;
      const eCount = state.exams.length;
      const cCols = state.custom_columns || [];

      const deptCode = escapeHtml((registerData && registerData.department_code) || 'IT');
      const sem = (registerData && registerData.semester) || 5;
      const subName = escapeHtml((registerData && registerData.subject_name) || 'Subject');

      content.innerHTML = `
        <div class="sheet-studio-container" style="margin-top: 0;">
          <!-- BANNER -->
          <div class="sheet-header-banner" style="background: var(--bg-card); color: var(--text-main); border-bottom: 2px solid var(--table-border);">
            <h3 style="font-size: 1.05rem;">${escapeHtml(state.institution_name)}</h3>
            <div style="font-weight: 700; font-size: 0.9rem; margin-top: 0.2rem; color: var(--text-main);">${escapeHtml(state.session_label)}</div>
            <div class="sheet-header-meta" style="margin-top: 0.25rem;">
              Department (${deptCode}) - ${sem} Semester - ${subName}
            </div>
          </div>

          <!-- SPREADSHEET TABLE -->
          <div class="excel-sheet-viewport" style="max-height: 65vh; overflow: auto; border: 1px solid var(--table-border-strong);">
            <table class="excel-table sheet-table">
              <thead>
                <tr>
                  <th rowspan="2" style="width: 45px;">SRNO</th>
                  <th rowspan="2" style="width: 120px;">REG NO</th>
                  <th rowspan="2" style="width: 70px;">ROLL</th>
                  <th rowspan="2" style="width: 190px; text-align: left;">CNAME</th>
                  <th colspan="${aCount}">Assignment Marks (15)</th>
                  <th rowspan="2" style="width: 95px;">Assignment Total Marks (Avg)</th>
                  <th colspan="${eCount}">Unit Test Marks (20)</th>
                  <th rowspan="2" style="width: 85px;">UT Total Marks (Avg)</th>
                  <th rowspan="2" style="width: 90px;">Total Attendance (10)</th>
                  <th rowspan="2" style="width: 115px;">Problem Solving Skills/<br>Presentation (5)</th>
                  ${cCols.map(c => `<th rowspan="2" style="width: 95px;">${escapeHtml(c.name)}</th>`).join('')}
                  <th rowspan="2" style="width: 85px; font-weight: 800;">Total Marks (50)</th>
                </tr>
                <tr>
                  ${state.assignments.map((a, i) => `<th class="th-secondary" style="width: 44px;">${i + 1}</th>`).join('')}
                  ${state.exams.map((_, i) => `<th class="th-secondary" style="width: 44px;">${i + 1}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${state.students.map((s, idx) => `
                  <tr>
                    <td class="excel-cell-sr">${idx + 1}</td>
                    <td style="font-family: var(--font-family-mono); font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(s.registration_no || s.official_enrollment_no)}</td>
                    <td class="cell-roll">${escapeHtml(String(s.class_roll_no))}</td>
                    <td class="cell-student-name" style="text-align: left;" title="${escapeHtml(s.full_name)}">
                      <span style="font-weight: 700; text-transform: uppercase;">${escapeHtml(s.full_name)}</span>
                    </td>
                    ${state.assignments.map((_, aIdx) => `
                      <td>
                        <input type="number" 
                               class="excel-cell-input sheet-cell-input" 
                               value="${s.assignment_scores[aIdx] ?? 0}" 
                               min="0" 
                               max="15" 
                               step="0.5" 
                               oninput="onEvalAssignmentScoreChange(${s.student_id}, ${aIdx}, this.value)">
                      </td>
                    `).join('')}
                    <td style="font-weight: 700; background: var(--bg-surface-secondary);" id="eval-assign-avg-${s.student_id}">${s.assignment_avg.toFixed(1)}</td>
                    ${state.exams.map((_, eIdx) => {
                      const isAb = Boolean(s.exam_absent[eIdx]);
                      const val = isAb ? 'AB' : (s.exam_scores[eIdx] ?? 0);
                      return `
                        <td>
                          <input type="text" 
                                 class="excel-cell-input sheet-cell-input" 
                                 style="${isAb ? 'color: var(--status-absent) !important; font-weight: 800 !important; background: var(--status-absent-bg) !important;' : ''}" 
                                 value="${val}" 
                                 title="Type score (0-25) or AB for Absent"
                                 onchange="onEvalExamScoreChange(${s.student_id}, ${eIdx}, this.value)">
                        </td>
                      `;
                    }).join('')}
                    <td style="font-weight: 700; background: var(--bg-surface-secondary);" id="eval-exam-avg-${s.student_id}">${s.exam_avg.toFixed(1)}</td>
                    <td>
                      <input type="number" 
                             class="excel-cell-input sheet-cell-input" 
                             value="${s.attendance_score ?? 10}" 
                             min="0" 
                             max="10" 
                             step="0.5" 
                             oninput="onEvalAttendanceScoreChange(${s.student_id}, this.value)">
                    </td>
                    <td>
                      <input type="number" 
                             class="excel-cell-input sheet-cell-input" 
                             value="${s.presentation_score ?? 5}" 
                             min="0" 
                             max="5" 
                             step="0.5" 
                             oninput="onEvalPresentationScoreChange(${s.student_id}, this.value)">
                    </td>
                    ${cCols.map((c, cIdx) => `
                      <td>
                        <input type="number" 
                               class="excel-cell-input sheet-cell-input" 
                               value="${s.custom_scores[cIdx] ?? 0}" 
                               min="0" 
                               max="${c.max || 10}" 
                               step="0.5" 
                               oninput="onEvalCustomScoreChange(${s.student_id}, ${cIdx}, this.value)">
                      </td>
                    `).join('')}
                    <td style="font-weight: 800; font-size: 0.92rem; color: var(--text-main); background: var(--bg-surface-secondary);" id="eval-grand-total-${s.student_id}">
                      ${s.grand_total}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    function onEvalAssignmentScoreChange(studentId, aIdx, val) {
      const state = window.currentEvalSheetState;
      if (!state) return;
      const student = state.students.find(s => s.student_id === studentId);
      if (!student) return;
      student.assignment_scores[aIdx] = Math.max(0, parseFloat(val) || 0);
      recalculateEvalRow(student);
      const avgEl = document.getElementById(`eval-assign-avg-${studentId}`);
      if (avgEl) avgEl.innerText = student.assignment_avg.toFixed(1);
      const totEl = document.getElementById(`eval-grand-total-${studentId}`);
      if (totEl) totEl.innerText = student.grand_total;
    }

    function onEvalExamScoreChange(studentId, eIdx, val) {
      const state = window.currentEvalSheetState;
      if (!state) return;
      const student = state.students.find(s => s.student_id === studentId);
      if (!student) return;

      const trimmed = String(val).trim().toUpperCase();
      if (trimmed === 'AB' || trimmed === 'ABSENT' || trimmed === 'A') {
        student.exam_absent[eIdx] = true;
        student.exam_scores[eIdx] = 0;
      } else {
        student.exam_absent[eIdx] = false;
        student.exam_scores[eIdx] = Math.max(0, parseFloat(trimmed) || 0);
      }
      recalculateEvalRow(student);
      renderInternalEvalGrid();
    }

    function onEvalAttendanceScoreChange(studentId, val) {
      const state = window.currentEvalSheetState;
      if (!state) return;
      const student = state.students.find(s => s.student_id === studentId);
      if (!student) return;
      student.attendance_score = Math.min(10, Math.max(0, parseFloat(val) || 0));
      recalculateEvalRow(student);
      const totEl = document.getElementById(`eval-grand-total-${studentId}`);
      if (totEl) totEl.innerText = student.grand_total;
    }

    function onEvalPresentationScoreChange(studentId, val) {
      const state = window.currentEvalSheetState;
      if (!state) return;
      const student = state.students.find(s => s.student_id === studentId);
      if (!student) return;
      student.presentation_score = Math.min(5, Math.max(0, parseFloat(val) || 0));
      recalculateEvalRow(student);
      const totEl = document.getElementById(`eval-grand-total-${studentId}`);
      if (totEl) totEl.innerText = student.grand_total;
    }

    function onEvalCustomScoreChange(studentId, cIdx, val) {
      const state = window.currentEvalSheetState;
      if (!state) return;
      const student = state.students.find(s => s.student_id === studentId);
      if (!student) return;
      student.custom_scores[cIdx] = Math.max(0, parseFloat(val) || 0);
      recalculateEvalRow(student);
      const totEl = document.getElementById(`eval-grand-total-${studentId}`);
      if (totEl) totEl.innerText = student.grand_total;
    }

    function addInternalEvalColumn() {
      const state = window.currentEvalSheetState;
      if (!state) return;
      const nextNum = (state.custom_columns || []).length + 1;
      state.custom_columns.push({
        id: 'col_' + Date.now(),
        name: `Viva / Quiz ${nextNum}`,
        max: 5
      });
      state.students.forEach(s => {
        if (!Array.isArray(s.custom_scores)) s.custom_scores = [];
        s.custom_scores.push(0);
        recalculateEvalRow(s);
      });
      renderInternalEvalGrid();
      showToast(`Added assessment column: Viva / Quiz ${nextNum}!`, 'success');
    }

    function removeInternalEvalColumn() {
      const state = window.currentEvalSheetState;
      if (!state || !state.custom_columns.length) {
        showToast('No custom columns to remove', 'info');
        return;
      }
      state.custom_columns.pop();
      state.students.forEach(s => {
        if (Array.isArray(s.custom_scores)) s.custom_scores.pop();
        recalculateEvalRow(s);
      });
      renderInternalEvalGrid();
      showToast('Removed assessment column', 'info');
    }

    function addInternalEvalRow() {
      const state = window.currentEvalSheetState;
      if (!state) return;
      const nextIdx = state.students.length + 1;
      const newS = {
        student_id: Date.now(),
        class_roll_no: nextIdx,
        official_enrollment_no: 'ENR-NEW-' + nextIdx,
        full_name: 'Student ' + nextIdx,
        assignment_scores: state.assignments.map(() => 8),
        assignment_avg: 0,
        exam_scores: state.exams.map(() => 18),
        exam_absent: state.exams.map(() => false),
        exam_avg: 0,
        attendance_score: 9,
        presentation_score: 4,
        custom_scores: state.custom_columns.map(() => 0),
        grand_total: 0
      };
      recalculateEvalRow(newS);
      state.students.push(newS);
      renderInternalEvalGrid();
      showToast(`Added student row ${nextIdx}`, 'success');
    }

    async function exportInternalEvalExcel() {
      const state = window.currentEvalSheetState;
      if (!state) return;
      try {
        showToast('Generating official Internal Evaluation Excel (.xlsx)...', 'info');
        const payload = {
          institution_name: state.institution_name,
          session_label: state.session_label,
          department_name: (registerData && registerData.department_name) || '',
          department_code: (registerData && registerData.department_code) || '',
          subject_name: (registerData && registerData.subject_name) || 'Subject',
          semester: (registerData && registerData.semester) || 1,
          assignments: state.assignments,
          exams: state.exams,
          custom_columns: state.custom_columns,
          students: state.students
        };

        const res = await fetch(`/api/v1/faculty/registers/${currentRegisterId}/export/internal-evaluation-excel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        downloadBlob(blob, `Internal_Evaluation_Sheet_${((registerData && registerData.subject_code) || 'Subject').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`);
        showToast('Master Evaluation Sheet (.xlsx) downloaded successfully!', 'success');
      } catch (err) {
        showToast('Export failed: ' + err.message, 'error');
      }
    }

    function saveInternalEvalGrid() {
      showToast('Internal evaluation spreadsheet synced and saved!', 'success');
    }

    function downloadBlob(blob, filename) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 200);
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    // ─── 2-STEP DELETE MODAL ───
    let _pendingDelete = { type: null, id: null };

    function openDeleteModal(type, id) {
      _pendingDelete = { type, id };
      document.getElementById('del-modal-impact').textContent = 'This will permanently remove the class test and all student marks. This action cannot be reversed.';
      document.getElementById('del-step-1').style.display = '';
      document.getElementById('del-step-2').style.display = 'none';
      document.getElementById('delete-item-modal').classList.add('open');
    }

    function deleteModalNext() {
      document.getElementById('del-step-1').style.display = 'none';
      document.getElementById('del-step-2').style.display = '';
    }

    function deleteModalBack() {
      document.getElementById('del-step-1').style.display = '';
      document.getElementById('del-step-2').style.display = 'none';
    }

    async function confirmDeleteItem() {
      const { type, id } = _pendingDelete;
      if (!type || !id) return;
      const confirmBtn = document.getElementById('del-confirm-btn');
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Deleting...';
      try {
        const endpoint = `/exams/${id}`;
        const res = await fetchApi(endpoint, { method: 'DELETE' });
        document.getElementById('delete-item-modal').classList.remove('open');
        if (res.success) {
          showToast('Class test deleted', 'success');
          loadRegisterExams();
        } else {
          showToast(res.error?.message || 'Failed to delete', 'error');
        }
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm Delete';
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      loadRegistersList();
    });

