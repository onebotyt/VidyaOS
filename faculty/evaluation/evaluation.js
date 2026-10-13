/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: EVALUATION
 * frontend/faculty/evaluation/evaluation.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute({ roles: ['TEACHER'], requireSubjects: true });

    function getToken() {
      return typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('access_token') || '');
    }

    let allRegisters = [];
    let currentRegisterId = null;
    let registerData = null;
    window.currentEvalSheetState = null;
    let isEditMode = false;
    window.isEditMode = false;

    async function loadRegistersList() {
      try {
        const res = await fetchApi('/faculty/registers');
        if (res.success) {
          allRegisters = res.data || [];
          if (!allRegisters.length) {
            document.getElementById('internal-eval-content').innerHTML = `
              <div class="card" style="text-align: center; padding: 3.5rem 2rem; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-color);">
                <div style="color: var(--text-muted); margin-bottom: 0.75rem; display: flex; justify-content: center;">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text-main);">No Teaching Registers Allocated</h3>
                <p style="font-size: 0.875rem; color: var(--text-muted); max-width: 540px; margin: 0 auto 1.5rem; line-height: 1.5;">
                  Your Department HOD has not allocated any subject registers to your profile yet. Once assigned, your internal evaluation sheets will appear here.
                </p>
                <a href="/faculty/dashboard.html" class="btn btn-secondary btn-sm">← Back to Dashboard</a>
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
      const aliasSel = document.getElementById('eval-switcher-select');
      if (!sel) return;
      const opts = allRegisters.map(r => {
        const isSel = r.id === currentRegisterId;
        const subj = r.subject_name || r.name || 'Subject';
        const code = r.subject_code ? `[${r.subject_code}]` : '';
        return `<option value="${r.id}" ${isSel ? 'selected' : ''}>${subj} ${code}</option>`;
      }).join('');
      sel.innerHTML = opts;
      if (aliasSel) aliasSel.innerHTML = opts;
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
      const testBtn = document.getElementById('btn-quick-tests');
      if (testBtn) testBtn.href = `/faculty/tests.html?id=${currentRegisterId}`;

      try {
        const res = await fetchApi(`/faculty/registers/${currentRegisterId}`);
        if (res.success) {
          const raw = res.data;
          registerData = raw.register || raw;
          if (raw.grid && raw.grid.students) {
            registerData.students = raw.grid.students;
          }
          updateMetaStrip();
          await loadInternalEvaluationData();
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

    function getSessionKey() {
      if (registerData) {
        return registerData.academic_year_id || registerData.academic_year_label || '2026';
      }
      return '2026';
    }

    function getSessionInstituteHeader() {
      const sk = getSessionKey();
      const storeKey = `vidyaos_inst_header_session_${String(sk).replace(/[^a-zA-Z0-9]/g, '_')}`;
      const defaultHeader = 'Uttarakhand Government Institute of Polytechnic, Nainital | Internal Evaluation Sheet 2026 Session';
      return localStorage.getItem(storeKey) || localStorage.getItem('vidyaos_institution_marks_header') || (window.currentEvalSheetState && window.currentEvalSheetState.institution_header) || defaultHeader;
    }

    function updateSessionInstituteHeader(text) {
      const clean = (text || '').trim().replace(/\s+/g, ' ');
      if (!clean) return;
      const sk = getSessionKey();
      const storeKey = `vidyaos_inst_header_session_${String(sk).replace(/[^a-zA-Z0-9]/g, '_')}`;
      localStorage.setItem(storeKey, clean);
      localStorage.setItem('vidyaos_institution_marks_header', clean);
      if (window.currentEvalSheetState) {
        window.currentEvalSheetState.institution_header = clean;
      }
      if (typeof fetchApi === 'function') {
        fetchApi('/faculty/session-header', {
          method: 'PUT',
          body: JSON.stringify({ header: clean, academic_year_id: sk })
        }).catch(err => console.warn('Could not save session header to backend:', err));
      }
      document.querySelectorAll('.excel-editable-inst-header').forEach(el => {
        if (el.innerText !== clean) el.innerText = clean;
      });
      showToast('Institution header updated across all sheets in this session!', 'success');
    }

    window.addEventListener('storage', (e) => {
      const sk = getSessionKey();
      const storeKey = `vidyaos_inst_header_session_${String(sk).replace(/[^a-zA-Z0-9]/g, '_')}`;
      if (e.key === storeKey || e.key === 'vidyaos_institution_marks_header') {
        const val = e.newValue;
        if (val) {
          document.querySelectorAll('.excel-editable-inst-header').forEach(el => {
            if (el.innerText !== val) el.innerText = val;
          });
          if (window.currentEvalSheetState) {
            window.currentEvalSheetState.institution_header = val;
          }
        }
      }
    });

    async function loadInternalEvaluationData() {
      if (!registerData) return;
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

        const deptCode = (registerData && (registerData.department_code || registerData.department_name)) || 'IT';
        const sem = (registerData && registerData.semester) || 5;

        // Determine whether subject/class has practical
        const hasPractical = Boolean(
          d.has_practical || 
          (registerData && (
            registerData.has_practical === 1 || 
            registerData.group_component === 'THEORY_PRACTICAL' || 
            registerData.session_type_scope === 'THEORY_PRACTICAL' || 
            registerData.group_component === 'PRACTICAL' || 
            registerData.session_type_scope === 'PRACTICAL'
          ))
        );

        // Continuous assessment columns based on practical component:
        // When subject has practical: Lab Record, Viva Voce, Creative Work, Attendance (65 marks scheme)
        // When theory only: Attendance (40 marks scheme)
        const practicalCols = [
          { id: 'lab_record', name: 'Lab Record', max: 10, defaultScore: 8.5 },
          { id: 'viva_voce', name: 'Viva Voce', max: 5, defaultScore: 4.0 },
          { id: 'creative_work', name: 'Creative Work (Model/Chart/Project)', max: 10, defaultScore: 8.5 },
          { id: 'attendance', name: 'Attendance', max: 5, isAttendance: true }
        ];
        const theoryCols = [
          { id: 'attendance', name: 'Attendance', max: 5, isAttendance: true }
        ];
        const defaultAssessmentCols = hasPractical ? practicalCols : theoryCols;

        let cachedState = null;
        try {
          const cached = localStorage.getItem(`eval_sheet_state_${currentRegisterId}`);
          if (cached) cachedState = JSON.parse(cached);
        } catch (e) {}

        let initialAssessmentCols = defaultAssessmentCols;
        if (cachedState && Array.isArray(cachedState.assessment_columns) && cachedState.assessment_columns.length > 0) {
          if (!hasPractical) {
            // Strip out practical-specific columns if the subject is theory-only
            initialAssessmentCols = cachedState.assessment_columns.filter(c => !['lab_record', 'viva_voce', 'creative_work'].includes(c.id));
            if (!initialAssessmentCols.length) initialAssessmentCols = theoryCols;
          } else {
            initialAssessmentCols = cachedState.assessment_columns;
            const hasLab = initialAssessmentCols.some(c => c.id === 'lab_record');
            if (!hasLab) {
              initialAssessmentCols = practicalCols;
            }
          }
        }

        const assignAvgMax = (cachedState && cachedState.scheme && cachedState.scheme.assign_avg_max) || 15;
        const examAvgMax = (cachedState && cachedState.scheme && cachedState.scheme.exam_avg_max) || 20;
        const assessTotalMax = initialAssessmentCols.reduce((sum, c) => sum + (Number(c.max) || 0), 0);
        const grandTotalMax = assignAvgMax + examAvgMax + assessTotalMax;

        const sessionHeader = (d && d.institution_header) || getSessionInstituteHeader();
        const sessionKey = getSessionKey();
        localStorage.setItem(`vidyaos_inst_header_session_${String(sessionKey).replace(/[^a-zA-Z0-9]/g, '_')}`, sessionHeader);

        window.currentEvalSheetState = {
          register: registerData,
          institution_name: d.institution_name || (registerData && registerData.institution_name) || 'Uttarakhand Government Institute of Polytechnic, Nainital',
          institution_header: sessionHeader,
          session_label: d.session_label || (registerData && registerData.session_label) || 'Internal Evaluation Sheet 2026 Session',
          dept_semester_text: d.dept_semester_text || `Department (${deptCode}) - ${sem} Semester`,
          has_practical: hasPractical,
          scheme: {
            assign_avg_max: assignAvgMax,
            exam_avg_max: examAvgMax,
            total_max: grandTotalMax
          },
          assignments: assignList,
          exams: examList,
          assessment_columns: initialAssessmentCols,
          custom_columns: initialAssessmentCols,
          students: studentRawList.map((s, idx) => {
            const aScores = assignList.map((a, i) => {
              if (s.assignment_scores && s.assignment_scores[i] !== undefined && s.assignment_scores[i] !== '') {
                return Number(s.assignment_scores[i]);
              }
              return Math.round((a.max_marks || 25) * 0.6);
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
                eScores.push(Math.round((examList[i].max_marks || 25) * 0.6));
                eAb.push(false);
              }
            });

            const attPct = s.attendance_percentage !== undefined ? s.attendance_percentage : 85;

            // Load assessment scores
            const savedStudent = cachedState && cachedState.students && cachedState.students.find(x => x.student_id === (s.student_id || idx + 1));
            let studentAssessScores = [];
            if (savedStudent && Array.isArray(savedStudent.assessment_scores) && savedStudent.assessment_scores.length === initialAssessmentCols.length) {
              studentAssessScores = savedStudent.assessment_scores.map(Number);
            } else {
              studentAssessScores = initialAssessmentCols.map(col => {
                if (col.isAttendance || col.id === 'attendance') {
                  return Math.round(((attPct / 100) * (col.max || 5)) * 10) / 10;
                }
                return col.defaultScore !== undefined ? col.defaultScore : Math.round((col.max || 10) * 0.8 * 10) / 10;
              });
            }

            const studentObj = {
              student_id: s.student_id || (idx + 1),
              class_roll_no: s.class_roll_no || idx + 1,
              registration_no: s.registration_no || null,
              official_enrollment_no: s.official_enrollment_no || '—',
              full_name: s.full_name || 'Student ' + (idx + 1),
              attendance_percentage: attPct,
              assignment_scores: aScores,
              assignment_avg: 0,
              exam_scores: eScores,
              exam_absent: eAb,
              exam_avg: 0,
              assessment_scores: studentAssessScores,
              grand_total: 0
            };
            recalculateEvalRow(studentObj);
            return studentObj;
          })
        };

        try {
          if (cachedState) {
            if (cachedState.institution_header) window.currentEvalSheetState.institution_header = cachedState.institution_header;
            if (cachedState.institution_name) window.currentEvalSheetState.institution_name = cachedState.institution_name;
            if (cachedState.session_label) window.currentEvalSheetState.session_label = cachedState.session_label;
            if (cachedState.dept_semester_text) window.currentEvalSheetState.dept_semester_text = cachedState.dept_semester_text;
            if (cachedState.scheme) window.currentEvalSheetState.scheme = cachedState.scheme;
          }

          const cachedWidths = localStorage.getItem(`eval_col_widths_${currentRegisterId}`);
          if (cachedWidths) window.currentColWidths = JSON.parse(cachedWidths);
          else window.currentColWidths = {};

          const cachedScales = localStorage.getItem(`eval_col_font_scales_${currentRegisterId}`);
          if (cachedScales) window.currentColFontScales = JSON.parse(cachedScales);
          else window.currentColFontScales = {};

          const cachedZoom = localStorage.getItem('eval_sheet_zoom');
          if (cachedZoom) window.currentSheetZoom = parseInt(cachedZoom, 10);
          else window.currentSheetZoom = 100;

          const cachedFont = localStorage.getItem('eval_sheet_font_scale');
          if (cachedFont) window.currentSheetFontScale = parseFloat(cachedFont);
          else window.currentSheetFontScale = 1.0;
        } catch (e) {}

        renderInternalEvalGrid();
      } catch (err) {
        content.innerHTML = `<div class="card" style="color:var(--status-absent); padding:1.5rem;">Error loading evaluation sheet: ${err.message}</div>`;
      }
    }

    function recalculateEvalRow(s) {
      if (!s) return;
      const state = window.currentEvalSheetState;
      const scheme = (state && state.scheme) || {
        assign_avg_max: 15,
        exam_avg_max: 20,
        att_max: 10,
        pres_max: 5,
        total_max: 50
      };
      // Scheme avg max weights (target weight of average in final marks)
      const assignAvgMax = Number(scheme.assign_avg_max || scheme.assign_max || 15);
      const examAvgMax = Number(scheme.exam_avg_max || scheme.exam_max || 20);

      // Assignments: scale earned/possible to assignAvgMax
      const assignments = (state && state.assignments) || [];
      let aEarned = 0;
      let aPossible = 0;
      s.assignment_scores.forEach((v, i) => {
        if (v !== '' && v !== null && !isNaN(v)) {
          const aMax = Number((assignments[i] && assignments[i].max_marks) || 25);
          aEarned += Number(v);
          aPossible += aMax;
        }
      });
      // Scaled assignment avg: (earned / possible) * assignAvgMax
      s.assignment_avg = aPossible > 0
        ? Math.round((aEarned / aPossible) * assignAvgMax * 10) / 10
        : 0;

      // Exams: scale earned/possible to examAvgMax
      const exams = (state && state.exams) || [];
      let eEarned = 0;
      let ePossible = 0;
      s.exam_scores.forEach((sc, i) => {
        if (!s.exam_absent[i] && sc !== '' && sc !== null && !isNaN(sc)) {
          const eMax = Number((exams[i] && exams[i].max_marks) || 25);
          eEarned += Number(sc);
          ePossible += eMax;
        }
      });
      // Scaled exam avg: (earned / possible) * examAvgMax
      s.exam_avg = ePossible > 0
        ? Math.round((eEarned / ePossible) * examAvgMax * 10) / 10
        : 0;

      const assessSum = (s.assessment_scores || s.custom_scores || []).reduce((sum, v) => sum + (Number(v) || 0), 0);

      const tot = (Number(s.assignment_avg) || 0) + (Number(s.exam_avg) || 0) + assessSum;
      s.grand_total = Math.round(tot * 10) / 10;

      const tr = document.getElementById(`eval-student-row-${s.student_id}`);
      if (tr) {
        tr.setAttribute('data-total', s.grand_total);
        const attVal = s.assessment_scores ? (s.assessment_scores[3] ?? s.assessment_scores[0] ?? 5) : 5;
        tr.setAttribute('data-att', attVal);
        tr.setAttribute('data-has-absent', Boolean(s.exam_absent && s.exam_absent.some(Boolean)));
      }
    }

    /* ---- Interactive Webpage Student Search, Marks Filter & Sorting ---- */
    window.evalSearchQuery = '';
    window.evalMarksFilter = 'ALL';
    window.evalSortOrder = 'ROLL_ASC';

    function onEvalSearchInput(query) {
      window.evalSearchQuery = (query || '').trim();
      applyEvalFilters();
    }

    function clearEvalSearch() {
      window.evalSearchQuery = '';
      const input = document.getElementById('eval-search-input');
      if (input) input.value = '';
      applyEvalFilters();
    }

    function onEvalMarksFilterChange(filterVal) {
      window.evalMarksFilter = filterVal || 'ALL';
      applyEvalFilters();
    }

    function onEvalSortChange(sortVal) {
      window.evalSortOrder = sortVal || 'ROLL_ASC';
      sortEvalTableRows(window.evalSortOrder);
    }

    function toggleEvalSort(colType) {
      if (isEditMode) return; // In edit mode, allow contenteditable focus
      let nextOrder = 'ROLL_ASC';
      if (colType === 'roll') {
        nextOrder = window.evalSortOrder === 'ROLL_ASC' ? 'ROLL_DESC' : 'ROLL_ASC';
      } else if (colType === 'name') {
        nextOrder = window.evalSortOrder === 'NAME_ASC' ? 'NAME_DESC' : 'NAME_ASC';
      } else if (colType === 'total') {
        nextOrder = window.evalSortOrder === 'TOTAL_DESC' ? 'TOTAL_ASC' : 'TOTAL_DESC';
      } else if (colType === 'att') {
        nextOrder = window.evalSortOrder === 'ATT_DESC' ? 'ATT_ASC' : 'ATT_DESC';
      }
      window.evalSortOrder = nextOrder;
      const select = document.getElementById('eval-sort-select');
      if (select) select.value = nextOrder;
      sortEvalTableRows(nextOrder);
    }

    function sortEvalTableRows(sortOrder) {
      const tbody = document.querySelector('#eval-table tbody');
      if (!tbody) return;
      const rows = Array.from(tbody.querySelectorAll('.eval-student-row'));
      if (!rows.length) return;

      rows.sort((a, b) => {
        if (sortOrder === 'ROLL_ASC') {
          return (parseInt(a.getAttribute('data-roll')) || 0) - (parseInt(b.getAttribute('data-roll')) || 0);
        } else if (sortOrder === 'ROLL_DESC') {
          return (parseInt(b.getAttribute('data-roll')) || 0) - (parseInt(a.getAttribute('data-roll')) || 0);
        } else if (sortOrder === 'NAME_ASC') {
          return (a.getAttribute('data-name') || '').localeCompare(b.getAttribute('data-name') || '');
        } else if (sortOrder === 'NAME_DESC') {
          return (b.getAttribute('data-name') || '').localeCompare(a.getAttribute('data-name') || '');
        } else if (sortOrder === 'TOTAL_DESC') {
          return (parseFloat(b.getAttribute('data-total')) || 0) - (parseFloat(a.getAttribute('data-total')) || 0);
        } else if (sortOrder === 'TOTAL_ASC') {
          return (parseFloat(a.getAttribute('data-total')) || 0) - (parseFloat(b.getAttribute('data-total')) || 0);
        } else if (sortOrder === 'ATT_DESC') {
          return (parseFloat(b.getAttribute('data-att')) || 0) - (parseFloat(a.getAttribute('data-att')) || 0);
        } else if (sortOrder === 'ATT_ASC') {
          return (parseFloat(a.getAttribute('data-att')) || 0) - (parseFloat(b.getAttribute('data-att')) || 0);
        }
        return 0;
      });

      const noMatchRow = document.getElementById('eval-no-filter-match-row');
      rows.forEach(r => tbody.appendChild(r));
      if (noMatchRow) tbody.appendChild(noMatchRow);

      applyEvalFilters();
    }

    function resetAllEvalFilters() {
      window.evalSearchQuery = '';
      window.evalMarksFilter = 'ALL';
      window.evalSortOrder = 'ROLL_ASC';
      const searchInput = document.getElementById('eval-search-input');
      if (searchInput) searchInput.value = '';
      const filterSelect = document.getElementById('eval-marks-filter-select');
      if (filterSelect) filterSelect.value = 'ALL';
      const sortSelect = document.getElementById('eval-sort-select');
      if (sortSelect) sortSelect.value = 'ROLL_ASC';
      sortEvalTableRows('ROLL_ASC');
    }

    function applyEvalFilters() {
      const query = (window.evalSearchQuery || '').toLowerCase().trim();
      const filterType = window.evalMarksFilter || 'ALL';
      const rows = document.querySelectorAll('.eval-student-row');
      const state = window.currentEvalSheetState;
      const totalMax = (state && state.scheme && state.scheme.total_max) ? Number(state.scheme.total_max) : 50;
      const attMax = (state && state.scheme && state.scheme.att_max) ? Number(state.scheme.att_max) : 10;

      let visibleCount = 0;
      const totalCount = rows.length;

      rows.forEach(row => {
        const name = (row.getAttribute('data-name') || '').toLowerCase();
        const roll = (row.getAttribute('data-roll') || '').toLowerCase();
        const enr = (row.getAttribute('data-enrollment') || '').toLowerCase();
        const reg = (row.getAttribute('data-reg') || '').toLowerCase();
        const total = parseFloat(row.getAttribute('data-total') || '0');
        const att = parseFloat(row.getAttribute('data-att') || '0');
        const hasAbsent = row.getAttribute('data-has-absent') === 'true';

        // 1. Text Search matching name, roll, enrollment, reg
        let matchesSearch = true;
        if (query) {
          matchesSearch = name.includes(query) || roll.includes(query) || enr.includes(query) || reg.includes(query);
        }

        // 2. Marks & Performance threshold filter
        let matchesFilter = true;
        if (filterType === 'TOP') {
          matchesFilter = total >= (0.75 * totalMax);
        } else if (filterType === 'AVERAGE') {
          matchesFilter = total >= (0.50 * totalMax) && total < (0.75 * totalMax);
        } else if (filterType === 'LOW') {
          matchesFilter = total < (0.50 * totalMax);
        } else if (filterType === 'ATT_LOW') {
          matchesFilter = att < (0.75 * attMax);
        } else if (filterType === 'UT_AB') {
          matchesFilter = hasAbsent;
        }

        const isVisible = matchesSearch && matchesFilter;
        row.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
      });

      // Update counter badge
      const countEl = document.getElementById('eval-visible-count');
      if (countEl) countEl.innerText = visibleCount;

      // Toggle clear search button
      const clearBtn = document.getElementById('btn-eval-search-clear');
      if (clearBtn) clearBtn.style.display = query ? 'inline-flex' : 'none';

      // Toggle reset filter button
      const resetBtn = document.getElementById('btn-reset-eval-filter');
      const isFiltered = Boolean(query || filterType !== 'ALL' || (window.evalSortOrder && window.evalSortOrder !== 'ROLL_ASC'));
      if (resetBtn) resetBtn.style.display = isFiltered ? 'inline-flex' : 'none';

      // Show empty state row when no students match
      const noMatchRow = document.getElementById('eval-no-filter-match-row');
      if (noMatchRow) {
        noMatchRow.style.display = (visibleCount === 0 && totalCount > 0) ? '' : 'none';
      }
    }

    function handleEditSaveClick(force = false) {
      if (!isEditMode) {
        window.evalSheetBackupState = JSON.parse(JSON.stringify(window.currentEvalSheetState));
        isEditMode = true;
        window.isEditMode = true;
        renderInternalEvalGrid();
        showToast('Edit Mode Active: Headers, scheme in ( ), scores, and column controls are now editable.', 'info');
      } else {
        if (force) {
          confirmSaveEvaluation();
        } else {
          openSaveConfirmModal();
        }
      }
    }

    function cancelEditMode(force = false) {
      if (force) {
        confirmCancelEdit();
      } else {
        openCancelConfirmModal();
      }
    }

    function openSaveConfirmModal() {
      const modal = document.getElementById('save-confirm-modal');
      if (!modal) return;
      const state = window.currentEvalSheetState;
      const regSel = document.getElementById('register-switcher-select');
      const subjName = regSel?.options[regSel.selectedIndex]?.text || 'Active Register';
      const subjEl = document.getElementById('save-modal-subject-name');
      if (subjEl) subjEl.innerText = subjName;
      const countEl = document.getElementById('save-modal-student-count');
      if (countEl) countEl.innerText = (state?.students?.length || 0) + ' Students';
      const totalEl = document.getElementById('save-modal-scheme-total');
      if (totalEl) totalEl.innerText = (state?.scheme?.total_max || 50) + ' Marks';
      modal.style.display = 'flex';
      modal.classList.add('open');
    }

    function closeSaveConfirmModal() {
      const modal = document.getElementById('save-confirm-modal');
      if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
      }
    }

    function confirmSaveEvaluation() {
      saveInternalEvalGrid();
      window.evalSheetBackupState = null;
      isEditMode = false;
      window.isEditMode = false;
      closeSaveConfirmModal();
      renderInternalEvalGrid();
      showToast('Evaluation saved successfully! View mode locked.', 'success');
    }

    function openCancelConfirmModal() {
      const modal = document.getElementById('cancel-confirm-modal');
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('open');
      }
    }

    function closeCancelConfirmModal() {
      const modal = document.getElementById('cancel-confirm-modal');
      if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
      }
    }

    function confirmCancelEdit() {
      if (window.evalSheetBackupState) {
        window.currentEvalSheetState = JSON.parse(JSON.stringify(window.evalSheetBackupState));
        window.evalSheetBackupState = null;
      }
      isEditMode = false;
      window.isEditMode = false;
      closeCancelConfirmModal();
      renderInternalEvalGrid();
      showToast('Exited edit mode without saving changes.', 'info');
    }

    function onHeaderLabelChange(field, val) {
      const state = window.currentEvalSheetState;
      if (!state) return;
      if (!state.scheme) state.scheme = {};
      state.scheme[field] = val;
    }

    /* ---- Header Edit: Expand on Focus, Collapse on Blur ---- */
    function expandHeaderForEdit(div) {
      const th = div.closest('th');
      if (!th) return;
      const colIdx = parseInt(th.getAttribute('data-col-idx'));
      if (isNaN(colIdx)) return;

      // Remember original column width to restore on blur
      div._editColIdx = colIdx;
      div._editOrigWidth = th.offsetWidth;

      // Remove text wrap so full text is visible as one line
      div.style.whiteSpace = 'nowrap';
      div.style.overflow = 'visible';
      th.style.overflow = 'visible';

      // Measure text-based ideal width
      const text = (div.innerText || '').replace(/\n/g, ' ').trim();
      const textBasedWidth = Math.round(text.length * 9.5 + 48);

      // Calculate available space from the th's left edge to the viewport right edge
      // getBoundingClientRect returns zoomed visual coordinates, so divide by zoom
      const viewport = document.querySelector('.excel-sheet-viewport');
      const currentZoom = (window.currentSheetZoom || 100) / 100;
      const thRect = th.getBoundingClientRect();
      const vpRect = viewport ? viewport.getBoundingClientRect() : { right: window.innerWidth };

      // Visual pixels available → convert to unzoomed CSS pixels for setColumnWidth
      const availableVisualPx = vpRect.right - thRect.left - 10; // 10px breathing room
      const maxFromEdge = Math.max(div._editOrigWidth, Math.round(availableVisualPx / currentZoom));

      const targetWidth = Math.min(maxFromEdge, Math.max(div._editOrigWidth, textBasedWidth));

      // Use temp setter — does NOT persist to localStorage so refresh restores original
      setColumnWidthTemp(colIdx, targetWidth);

      // Scroll the viewport so the expanded column is fully visible
      setTimeout(() => {
        if (!viewport) return;
        const expandedRect = th.getBoundingClientRect();
        const vpR = viewport.getBoundingClientRect();
        if (expandedRect.right > vpR.right) {
          // Column right edge is off screen — scroll just enough to bring it in
          viewport.scrollLeft += Math.ceil((expandedRect.right - vpR.right) / currentZoom) + 8;
        }
      }, 30);
    }

    function collapseHeaderAfterEdit(div) {
      // Restore text wrap
      div.style.whiteSpace = '';
      div.style.overflow = '';
      const th = div.closest('th');
      if (th) th.style.overflow = '';

      // Restore original column width so wrapped layout is preserved
      const colIdx = div._editColIdx;
      const origWidth = div._editOrigWidth;
      if (!isNaN(colIdx) && origWidth > 0) {
        setTimeout(() => setColumnWidth(colIdx, origWidth), 30);
      }
    }

    function initHeaderEditBehavior() {
      const table = document.getElementById('eval-table');
      if (!table) return;

      table.addEventListener('focusin', (e) => {
        const div = e.target.closest('.sheet-th-input[contenteditable]');
        if (div) expandHeaderForEdit(div);
      });

      table.addEventListener('focusout', (e) => {
        const div = e.target.closest('.sheet-th-input[contenteditable]');
        if (div) collapseHeaderAfterEdit(div);
      });
    }


    function onCustomColumnNameChange(idx, val) {
      const state = window.currentEvalSheetState;
      if (!state || !state.scheme || !state.scheme.custom_columns) return;
      if (state.scheme.custom_columns[idx]) {
        state.scheme.custom_columns[idx].name = val;
      }
      if (state.custom_columns && state.custom_columns[idx]) {
        state.custom_columns[idx].name = val;
      }
      const labelEl = document.querySelector(`#scheme-ctrl-custom-${idx} .scheme-custom-name-label`);
      if (labelEl) labelEl.innerText = `${val}:`;
    }

    function onAssignmentTitleChange(idx, val) {
      const state = window.currentEvalSheetState;
      if (!state || !state.assignments) return;
      if (state.assignments[idx]) {
        state.assignments[idx].title = val;
      }
    }

    function onExamTitleChange(idx, val) {
      const state = window.currentEvalSheetState;
      if (!state || !state.exams) return;
      if (state.exams[idx]) {
        state.exams[idx].title = val;
      }
    }

    function toggleEditMode() {
      handleEditSaveClick();
    }

    function onInstTitleChange(val) {
      const state = window.currentEvalSheetState;
      if (state) state.institution_name = val.trim();
    }

    function onSessionTitleChange(val) {
      const state = window.currentEvalSheetState;
      if (state) state.session_label = val.trim();
    }

    function onDeptMetaChange(val) {
      const state = window.currentEvalSheetState;
      if (state) state.dept_semester_text = val.trim();
    }

    function updateSchemeTotalMax() {
      const state = window.currentEvalSheetState;
      if (!state || !state.scheme) return;
      const assignAvgMax = Number(state.scheme.assign_avg_max || 15);
      const examAvgMax = Number(state.scheme.exam_avg_max || 20);
      const assessSum = (state.assessment_columns || []).reduce((sum, c) => sum + (Number(c.max) || 0), 0);
      state.scheme.total_max = assignAvgMax + examAvgMax + assessSum;

      const badgeTot = document.getElementById('scheme-grand-total-max');
      if (badgeTot) badgeTot.innerText = String(state.scheme.total_max);

      const modalTot = document.getElementById('modal-scheme-total-display');
      if (modalTot) modalTot.innerText = String(state.scheme.total_max);
      const saveModalTot = document.getElementById('save-modal-scheme-total');
      if (saveModalTot) saveModalTot.innerText = String(state.scheme.total_max);

      const thTot = document.getElementById('th-total-group');
      if (thTot) thTot.innerText = `Total Marks (${state.scheme.total_max})`;
    }

    function onAssessmentColumnNameChange(idx, val) {
      const state = window.currentEvalSheetState;
      if (!state || !state.assessment_columns || !state.assessment_columns[idx]) return;
      state.assessment_columns[idx].name = val;
    }

    function onAssessmentColumnMaxChange(cIdx, val) {
      const state = window.currentEvalSheetState;
      if (!state || !state.assessment_columns || !state.assessment_columns[cIdx]) return;
      const num = Math.max(1, parseFloat(val) || 0);
      state.assessment_columns[cIdx].max = num;

      document.querySelectorAll(`input[data-col="assess_${cIdx}"]`).forEach(inp => {
        inp.setAttribute('max', num);
        if (parseFloat(inp.value) > num) inp.value = num;
      });

      updateSchemeTotalMax();

      state.students.forEach(st => {
        if (Array.isArray(st.assessment_scores) && st.assessment_scores[cIdx] > num) {
          st.assessment_scores[cIdx] = num;
        }
        recalculateEvalRow(st);
        const cell = document.getElementById(`eval-grand-total-${st.student_id}`);
        if (cell) cell.innerText = st.grand_total;
      });
    }

    function onCustomSchemeMarksChange(cIdx, val) {
      onAssessmentColumnMaxChange(cIdx, val);
    }

    function deleteAssessmentColumn(idx) {
      const state = window.currentEvalSheetState;
      if (!state || !state.assessment_columns || !state.assessment_columns[idx]) return;
      const col = state.assessment_columns[idx];
      state.assessment_columns.splice(idx, 1);
      state.students.forEach(s => {
        if (Array.isArray(s.assessment_scores)) {
          s.assessment_scores.splice(idx, 1);
        }
        recalculateEvalRow(s);
      });
      updateSchemeTotalMax();
      saveInternalEvalGrid();
      renderInternalEvalGrid();
      populateManageColumnsList();
      showToast(`Removed assessment column: ${col.name}`, 'info');
    }

    function openEditMarksModal() {
      populateEditMarksModal();
      const modal = document.getElementById('edit-total-marks-modal');
      if (modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
      }
    }

    function closeEditMarksModal() {
      const modal = document.getElementById('edit-total-marks-modal');
      if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
      }
    }

    function applyAndCloseEditMarksModal() {
      closeEditMarksModal();
      showToast('Evaluation scheme marks updated successfully!', 'success');
    }

    function populateEditMarksModal() {
      const state = window.currentEvalSheetState;
      if (!state || !state.scheme) return;

      const aInp = document.getElementById('scheme-assign-max');
      if (aInp) aInp.value = state.scheme.assign_avg_max || 15;
      const eInp = document.getElementById('scheme-exam-max');
      if (eInp) eInp.value = state.scheme.exam_avg_max || 20;

      const cContainer = document.getElementById('modal-custom-cols-container');
      if (cContainer) {
        const cols = state.assessment_columns || [];
        if (cols.length === 0) {
          cContainer.innerHTML = '';
        } else {
          cContainer.innerHTML = `
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); margin-top: 0.2rem; text-transform: uppercase; letter-spacing: 0.5px;">Continuous Assessment / Practical Columns</div>
            <div class="scheme-form-grid" style="display: grid; grid-template-columns: 1fr auto; gap: 0.75rem; align-items: center; background: var(--bg-surface); padding: 0.85rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
              ${cols.map((c, cIdx) => `
                <div id="scheme-ctrl-custom-${cIdx}">
                  <label for="scheme-custom-max-${cIdx}" style="display: block; font-size: 0.84rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.15rem;">
                    <span class="scheme-custom-name-label">${escapeHtml(c.name)}</span> Max Marks
                  </label>
                  <div style="font-size: 0.74rem; color: var(--text-muted); display:flex; align-items:center; gap:0.4rem;">
                    Assessment Column
                    <button type="button" onclick="deleteAssessmentColumn(${cIdx}); closeEditMarksModal();" style="background:transparent; border:none; color:var(--status-absent); font-weight:700; cursor:pointer; font-size:0.72rem; padding:0;">(Delete)</button>
                  </div>
                </div>
                <div>
                  <input type="number" id="scheme-custom-max-${cIdx}" class="scheme-ctrl-input" style="width: 60px; padding: 0.35rem; font-size: 0.88rem;" value="${c.max || 10}" min="1" max="100" oninput="onAssessmentColumnMaxChange(${cIdx}, this.value)">
                </div>
              `).join('')}
            </div>
          `;
        }
      }

      updateSchemeTotalMax();
    }

    function openAddColumnModal() {
      const modal = document.getElementById('add-column-modal');
      if (!modal) return;
      const state = window.currentEvalSheetState;
      const nextNum = ((state && state.assessment_columns) || []).length + 1;
      const titleInput = document.getElementById('new-col-title');
      const maxInput = document.getElementById('new-col-max');
      if (titleInput) titleInput.value = `Assessment ${nextNum}`;
      if (maxInput) maxInput.value = '10';
      modal.style.display = 'flex';
      modal.classList.add('open');
      setTimeout(() => {
        if (titleInput) titleInput.focus();
      }, 50);
    }

    function closeAddColumnModal() {
      const modal = document.getElementById('add-column-modal');
      if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
      }
    }

    function confirmAddInternalEvalColumn() {
      const state = window.currentEvalSheetState;
      if (!state) return;
      const titleInput = document.getElementById('new-col-title');
      const maxInput = document.getElementById('new-col-max');

      const title = (titleInput && titleInput.value.trim()) || `Assessment ${(state.assessment_columns || []).length + 1}`;
      const maxMarks = Math.max(1, parseInt(maxInput && maxInput.value, 10) || 10);

      if (!Array.isArray(state.assessment_columns)) state.assessment_columns = [];
      state.assessment_columns.push({
        id: 'col_' + Date.now(),
        name: title,
        max: maxMarks
      });

      state.students.forEach(s => {
        if (!Array.isArray(s.assessment_scores)) s.assessment_scores = [];
        s.assessment_scores.push(0);
        recalculateEvalRow(s);
      });

      updateSchemeTotalMax();
      closeAddColumnModal();
      saveInternalEvalGrid();
      renderInternalEvalGrid();
      showToast(`Added assessment column: ${title} (${maxMarks} marks)!`, 'success');
    }

    function addInternalEvalColumn() {
      openAddColumnModal();
    }

    function formatEvalSubheader(title, fallbackType, index) {
      if (!title) return `${fallbackType} ${index + 1}`;
      const str = String(title).trim();
      // If it's already short (e.g. "1", "2", "Assign 1", "UT 1"), return cleanly
      if (/^(Assign\s*\d+|UT\s*\d+|\d+|Q\d+)$/i.test(str)) return str;

      // Check for Assignment number: "Assignment 1: Relational Algebra & SQL Joins" -> "Assign 1"
      const assignMatch = str.match(/(?:Assignment|Assign|ASG)\s*#?\s*(\d+)/i);
      if (assignMatch) return `Assign ${assignMatch[1]}`;

      // Check for Unit Test / UT number: "Unit Test 1 — Database Systems" -> "UT 1"
      const utMatch = str.match(/(?:Unit\s*Test|UT|Test)\s*#?\s*(\d+)/i);
      if (utMatch) return `UT ${utMatch[1]}`;

      if (/mid[- ]?term/i.test(str)) return 'Mid-Term';
      if (/final|end[- ]?sem/i.test(str)) return 'Final';

      // If reasonably short, keep it
      if (str.length <= 10) return str;
      return `${fallbackType} ${index + 1}`;
    }

    function openManageColumnsModal() {
      populateManageColumnsList();
      const modal = document.getElementById('manage-columns-modal');
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('open');
      }
    }

    function closeManageColumnsModal() {
      const modal = document.getElementById('manage-columns-modal');
      if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
      }
    }

    function populateManageColumnsList() {
      const listEl = document.getElementById('manage-cols-list');
      if (!listEl) return;
      const state = window.currentEvalSheetState;
      const cols = (state && state.assessment_columns) || [];

      if (cols.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.86rem; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
            No continuous assessment columns currently configured.<br>
            Click <strong>+ Add New Column</strong> to add Lab Record, Viva, Project, etc.
          </div>
        `;
        return;
      }

      listEl.innerHTML = cols.map((col, idx) => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius-sm); background: var(--color-primary-subtle); color: var(--color-primary); font-size: 0.8rem; font-weight: 800;">
              ${idx + 1}
            </span>
            <div>
              <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-main);">
                ${escapeHtml(col.name)}
              </div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">
                Max Marks: <strong style="color: var(--color-primary);">${col.max || 10}</strong>
              </div>
            </div>
          </div>
          <div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="deleteAssessmentColumn(${idx})" title="Delete '${escapeHtml(col.name)}' column" style="color: var(--status-absent); border-color: var(--status-absent); font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      `).join('');
    }

    function openRemoveColumnModal() {
      openManageColumnsModal();
    }

    function closeRemoveColumnModal() {
      closeManageColumnsModal();
    }

    function confirmRemoveInternalEvalColumn() {
      const state = window.currentEvalSheetState;
      if (!state || !state.assessment_columns || !state.assessment_columns.length) {
        closeRemoveColumnModal();
        return;
      }
      const removedCol = state.assessment_columns.pop();
      state.students.forEach(s => {
        if (Array.isArray(s.assessment_scores)) s.assessment_scores.pop();
        recalculateEvalRow(s);
      });

      updateSchemeTotalMax();
      closeRemoveColumnModal();
      saveInternalEvalGrid();
      renderInternalEvalGrid();
      showToast(`Removed assessment column: ${removedCol.name}`, 'info');
    }

    function removeInternalEvalColumn() {
      openRemoveColumnModal();
    }

    function onSchemeMarksChange(type, val) {
      const state = window.currentEvalSheetState;
      if (!state || !state.scheme) return;
      const num = Math.max(1, parseFloat(val) || 0);
      if (type === 'assign') {
        state.scheme.assign_avg_max = num;
      }
      if (type === 'exam') {
        state.scheme.exam_avg_max = num;
      }

      updateSchemeTotalMax();

      state.students.forEach(st => {
        recalculateEvalRow(st);
        const cell = document.getElementById(`eval-grand-total-${st.student_id}`);
        if (cell) cell.innerText = st.grand_total;
        const avgElA = document.getElementById(`eval-assign-avg-${st.student_id}`);
        if (avgElA) avgElA.innerText = st.assignment_avg.toFixed(1);
        const avgElE = document.getElementById(`eval-exam-avg-${st.student_id}`);
        if (avgElE) avgElE.innerText = st.exam_avg.toFixed(1);
      });
    }

    function renderInternalEvalGrid() {
      const content = document.getElementById('internal-eval-content');
      const state = window.currentEvalSheetState;
      if (!content || !state) return;

      const aCount = state.assignments.length;
      const eCount = state.exams.length;
      const assessCols = state.assessment_columns || state.custom_columns || [];

      const deptCode = escapeHtml((registerData && (registerData.department_code || registerData.department_name)) || '');
      const deptFullName = escapeHtml((registerData && (registerData.department_name || registerData.branch_name)) || (deptCode ? `Dept of ${deptCode}` : 'Department'));
      const sem = (registerData && registerData.semester) || 1;
      const yr = (registerData && registerData.year) || Math.ceil(sem / 2) || 1;
      const sessionHeader = getSessionInstituteHeader();

      const registerOpts = allRegisters.map(r => {
        const isSel = r.id === currentRegisterId;
        const subj = r.subject_name || r.name || 'Subject';
        const code = r.subject_code ? `[${r.subject_code}]` : '';
        return `<option value="${r.id}" ${isSel ? 'selected' : ''}>${subj} ${code}</option>`;
      }).join('');

      const leafCols = getEvalLeafColumns();
      const savedWidths = window.currentColWidths || {};

      content.innerHTML = `
        <div class="sheet-studio-container">
          
          <!-- STICKY COMMAND BAR (ON TOP OF SHEET HEADER, STICKS TO TOP) -->
          <div class="eval-command-bar sticky-top-bar" id="eval-sticky-command-bar">
            <!-- Dynamic Column Controls & Edit Active Badge (Shown in Edit Mode) -->
            <div class="eval-command-actions">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-add-column" onclick="openAddColumnModal()" title="Add custom evaluation column (e.g. Lab, Viva, Quiz, Project)" style="${isEditMode ? 'display: inline-flex;' : 'display: none;'}">
                + Add Column
              </button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-manage-columns" onclick="openManageColumnsModal()" title="Manage or delete assessment columns" style="${isEditMode ? 'display: inline-flex; align-items: center; gap: 0.35rem;' : 'display: none;'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span>Delete / Manage Columns</span>
              </button>
              <span id="edit-mode-badge" style="${isEditMode ? 'display: inline-flex;' : 'display: none;'} font-size: 0.72rem; font-weight: 800; color: var(--color-primary); background: var(--color-primary-subtle); padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); align-items: center; gap: 0.25rem;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                <span>EDIT MODE ACTIVE</span>
              </span>
            </div>

            <!-- Edit Total Marks Button & Scheme Summary Badge -->
            <div class="eval-scheme-summary" style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-edit-total-marks" onclick="openEditMarksModal()" title="Edit total evaluation marks & breakdown scheme" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                <span>Edit Total Marks</span>
              </button>
              <div class="eval-scheme-badge" style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; font-weight: 700; color: var(--text-main); background: var(--bg-card); padding: 0.22rem 0.6rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <span style="color: var(--text-muted); font-size: 0.74rem;">Marks in ( ):</span>
                <strong id="scheme-grand-total-max" style="color: var(--color-primary); font-size: 0.88rem;">${state.scheme.total_max}</strong>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="eval-command-actions">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-eval" onclick="loadInternalEvaluationData()" title="Reload data" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                <span>Refresh</span>
              </button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-export-excel" onclick="exportInternalEvalExcel()" title="Export directly to native Microsoft Excel / Google Sheets (.xlsx)" style="font-weight: 700; color: var(--status-present); display: inline-flex; align-items: center; gap: 0.35rem;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Export</span>
              </button>
              ${isEditMode ? `
                <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-edit" onclick="cancelEditMode()" title="Exit edit mode without saving changes" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  <span>Cancel</span>
                </button>
              ` : ''}
              <button type="button" class="btn ${isEditMode ? 'btn-primary' : 'btn-secondary'} btn-sm" id="btn-toggle-edit" onclick="handleEditSaveClick()" title="${isEditMode ? 'Save evaluation and lock view' : 'Edit headers, marks in ( ), scores, and columns'}" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
                ${isEditMode 
                  ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg><span>Save</span>`
                  : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg><span>Edit</span>`
                }
              </button>
              <button type="button" id="btn-save-eval" onclick="handleEditSaveClick(true)" style="display: none;"></button>
            </div>
          </div>

          <!-- INSTITUTIONAL SHEET HEADER BANNER (3-Row Layout Matching Image 1) -->
          <div class="sheet-header-banner excel-hdr-banner">
            <!-- ROW 1: Institution Header (Soft blue fill, Editable inline) -->
            <div class="excel-hdr-blue row-1">
              <div style="display:flex;align-items:center;justify-content:center;gap:0.45rem;">
                <h2 class="excel-editable-inst-header"
                    contenteditable="true"
                    spellcheck="false"
                    id="eval-heading-inst-title"
                    title="Click to edit institute header (changes sync automatically across all tests & registers in this session)"
                    onblur="updateSessionInstituteHeader(this.innerText)"
                    onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
                >${escapeHtml(sessionHeader)}</h2>
                <span title="Click text to edit header. Automatically updates all tests & registers." style="cursor:pointer; display:inline-flex; align-items:center; opacity:0.8;" onclick="const h=document.getElementById('eval-heading-inst-title');if(h)h.focus()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </span>
              </div>
            </div>

            <!-- ROW 2: Department & Subject with Class Switcher Dropdown & Theory+Practical Badge -->
            <div class="excel-hdr-blue row-2" style="display:flex;align-items:center;justify-content:center;gap:0.6rem;flex-wrap:wrap;">
              <span>Department (${deptCode}) | Subject :</span>
              <select id="register-switcher-select" class="sheet-subject-select" onchange="onRegisterChange(this.value)" title="Switch Subject Register / Class">
                ${registerOpts}
              </select>
              <select id="eval-switcher-select" style="display: none;" aria-hidden="true">${registerOpts}</select>
              <span class="theory-practical-badge" style="font-size:0.72rem;padding:0.18rem 0.5rem;border-radius:var(--radius-sm);background:var(--color-primary-subtle);color:var(--color-primary);font-weight:700;border:1px solid var(--border-color);display:inline-flex;align-items:center;gap:0.3rem;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                <span>${state.has_practical ? 'Theory + Practical Integrated' : 'Theory Course'}</span>
              </span>
            </div>

            <!-- ROW 3: Department Full Name, Year, and Semester -->
            <div class="excel-hdr-blue row-3">
              ${deptFullName} Year ${yr} | Semester ${sem}
            </div>
          </div>

          <!-- INTERACTIVE WEBPAGE FILTER & SEARCH STRIP -->
          <div class="eval-filter-toolbar" id="eval-filter-toolbar">
            <div class="eval-filter-left">
              <div class="eval-search-input-wrap">
                <span class="eval-search-icon" style="display:inline-flex;align-items:center;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </span>
                <input type="text" 
                       id="eval-search-input" 
                       class="eval-search-input" 
                       placeholder="Filter by student name, roll no, enrollment, reg no..." 
                       value="${escapeHtml(window.evalSearchQuery || '')}"
                       oninput="onEvalSearchInput(this.value)"
                       autocomplete="off">
                <button type="button" 
                       class="eval-search-clear-btn" 
                       id="btn-eval-search-clear" 
                       onclick="clearEvalSearch()" 
                       style="${window.evalSearchQuery ? 'display: inline-flex; align-items: center; justify-content: center;' : 'display: none;'}" 
                       title="Clear search">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <div class="eval-quick-filter-wrap">
                <label for="eval-marks-filter-select" class="eval-filter-label">Filter:</label>
                <select id="eval-marks-filter-select" class="eval-filter-select" onchange="onEvalMarksFilterChange(this.value)" title="Filter by student performance">
                  <option value="ALL" ${(!window.evalMarksFilter || window.evalMarksFilter === 'ALL') ? 'selected' : ''}>All Students</option>
                  <option value="TOP" ${window.evalMarksFilter === 'TOP' ? 'selected' : ''}>Top Marks (≥ 75%)</option>
                  <option value="AVERAGE" ${window.evalMarksFilter === 'AVERAGE' ? 'selected' : ''}>Average (50% – 74%)</option>
                  <option value="LOW" ${window.evalMarksFilter === 'LOW' ? 'selected' : ''}>Low Marks (&lt; 50%)</option>
                  <option value="ATT_LOW" ${window.evalMarksFilter === 'ATT_LOW' ? 'selected' : ''}>Low Attendance (&lt; 75%)</option>
                  <option value="UT_AB" ${window.evalMarksFilter === 'UT_AB' ? 'selected' : ''}>Absent in Any Test</option>
                </select>
              </div>

              <div class="eval-quick-sort-wrap">
                <label for="eval-sort-select" class="eval-filter-label">Sort:</label>
                <select id="eval-sort-select" class="eval-filter-select" onchange="onEvalSortChange(this.value)" title="Sort student roster">
                  <option value="ROLL_ASC" ${(!window.evalSortOrder || window.evalSortOrder === 'ROLL_ASC') ? 'selected' : ''}>Roll No (Ascending)</option>
                  <option value="ROLL_DESC" ${window.evalSortOrder === 'ROLL_DESC' ? 'selected' : ''}>Roll No (Descending)</option>
                  <option value="NAME_ASC" ${window.evalSortOrder === 'NAME_ASC' ? 'selected' : ''}>Name (A → Z)</option>
                  <option value="NAME_DESC" ${window.evalSortOrder === 'NAME_DESC' ? 'selected' : ''}>Name (Z → A)</option>
                  <option value="TOTAL_DESC" ${window.evalSortOrder === 'TOTAL_DESC' ? 'selected' : ''}>Total Marks (High → Low)</option>
                  <option value="TOTAL_ASC" ${window.evalSortOrder === 'TOTAL_ASC' ? 'selected' : ''}>Total Marks (Low → High)</option>
                  <option value="ATT_DESC" ${window.evalSortOrder === 'ATT_DESC' ? 'selected' : ''}>Attendance (High → Low)</option>
                  <option value="ATT_ASC" ${window.evalSortOrder === 'ATT_ASC' ? 'selected' : ''}>Attendance (Low → High)</option>
                </select>
              </div>
            </div>

            <div class="eval-filter-right">
              <span class="eval-filter-badge" id="eval-filter-status-badge">
                Showing <strong id="eval-visible-count">${state.students.length}</strong> of ${state.students.length} students
              </span>
              <button type="button" 
                      class="btn btn-secondary btn-sm" 
                      id="btn-reset-eval-filter" 
                      onclick="resetAllEvalFilters()" 
                      style="${(window.evalSearchQuery || (window.evalMarksFilter && window.evalMarksFilter !== 'ALL') || (window.evalSortOrder && window.evalSortOrder !== 'ROLL_ASC')) ? 'display: inline-flex; align-items: center; gap: 0.3rem;' : 'display: none;'} font-size: 0.72rem; padding: 0.2rem 0.5rem;"
                      title="Reset all filters">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                <span>Reset</span>
              </button>
            </div>
          </div>

          <!-- SPREADSHEET TABLE -->
          <div class="excel-sheet-viewport">
            <table class="excel-table sheet-table" id="eval-table">
              <colgroup id="eval-colgroup">
                ${leafCols.map((col, idx) => {
                  const w = (savedWidths && savedWidths[idx]) || col.defaultWidth;
                  return `<col id="eval-col-${idx}" style="width: ${w}px;">`;
                }).join('')}
              </colgroup>
              <thead>
                <!-- ROW 4: Column Headers (Tan fill) -->
                <tr class="excel-hdr-tan">
                  <th rowspan="2" class="excel-hdr-tan resizable-th" data-col-idx="0" style="width: ${(savedWidths && savedWidths[0]) || 70}px;" ondblclick="autoFitColumn(0)" title="Double-click to auto-fit">
                    ${isEditMode 
                      ? `<div class="sheet-th-input" contenteditable="true" oninput="onHeaderLabelChange('roll_label', this.innerText.trim())" onkeydown="if(event.key==='Enter'){event.preventDefault();}" title="Edit Roll No Header" style="font-weight: 700; font-size: 0.72rem;">${escapeHtml(state.scheme.roll_label || 'ROLL NO')}</div>`
                      : `${escapeHtml(state.scheme.roll_label || 'ROLL NO')}`
                    }
                  </th>
                  <th rowspan="2" class="excel-hdr-tan resizable-th" data-col-idx="1" style="width: ${(savedWidths && savedWidths[1]) || 135}px;" ondblclick="autoFitColumn(1)" title="Double-click to auto-fit">
                    ${isEditMode 
                      ? `<div class="sheet-th-input" contenteditable="true" oninput="onHeaderLabelChange('enroll_label', this.innerText.trim())" onkeydown="if(event.key==='Enter'){event.preventDefault();}" title="Edit Enrollment No Header" style="font-weight: 700; font-size: 0.72rem;">${escapeHtml(state.scheme.enroll_label || 'ENROLLMENT NO')}</div>`
                      : `${escapeHtml(state.scheme.enroll_label || 'ENROLLMENT NO')}`
                    }
                  </th>
                  <th rowspan="2" class="excel-hdr-tan resizable-th" data-col-idx="2" style="width: ${(savedWidths && savedWidths[2]) || 135}px;" ondblclick="autoFitColumn(2)" title="Double-click to auto-fit">
                    ${isEditMode 
                      ? `<div class="sheet-th-input" contenteditable="true" oninput="onHeaderLabelChange('reg_label', this.innerText.trim())" onkeydown="if(event.key==='Enter'){event.preventDefault();}" title="Edit Reg No Header" style="font-weight: 700; font-size: 0.72rem;">${escapeHtml(state.scheme.reg_label || 'REG NO')}</div>`
                      : `${escapeHtml(state.scheme.reg_label || 'REG NO')}`
                    }
                  </th>
                  <th rowspan="2" class="excel-hdr-tan resizable-th" data-col-idx="3" style="width: ${(savedWidths && savedWidths[3]) || 200}px; text-align: left;" ondblclick="autoFitColumn(3)" title="Double-click to auto-fit">
                    ${isEditMode 
                      ? `<div class="sheet-th-input" contenteditable="true" oninput="onHeaderLabelChange('name_label', this.innerText.trim())" onkeydown="if(event.key==='Enter'){event.preventDefault();}" title="Edit Student Name Header" style="font-weight: 700; font-size: 0.72rem; text-align: left;">${escapeHtml(state.scheme.name_label || 'STUDENT NAME')}</div>`
                      : `${escapeHtml(state.scheme.name_label || 'STUDENT NAME')}`
                    }
                  </th>
                  <th colspan="${aCount}" class="excel-hdr-tan" id="th-assign-group">
                    ${isEditMode 
                      ? `<div class="sheet-th-input" contenteditable="true" oninput="onHeaderLabelChange('assign_label', this.innerText.trim())" onkeydown="if(event.key==='Enter'){event.preventDefault();}" title="Edit Assignment Header" style="font-weight: 700; font-size: 0.75rem; width: auto; max-width: 140px; display: inline-block;">${escapeHtml(state.scheme.assign_label || 'Assignment Marks')}</div>`
                      : `${escapeHtml(state.scheme.assign_label || 'Assignment Marks')}`
                    }
                  </th>
                  <th rowspan="2" class="excel-hdr-tan resizable-th" data-col-idx="${4 + aCount}" style="width: ${(savedWidths && savedWidths[4 + aCount]) || 95}px;" ondblclick="autoFitColumn(${4 + aCount})" title="Double-click to auto-fit">
                    ${isEditMode 
                      ? `<div class="sheet-th-input" contenteditable="true" oninput="onHeaderLabelChange('assign_avg_label', this.innerText.trim())" onkeydown="if(event.key==='Enter'){event.preventDefault();}" title="Edit Assignment Avg Header" style="font-weight: 700; font-size: 0.70rem;">${escapeHtml(state.scheme.assign_avg_label || 'Assign Avg')}</div> (${state.scheme.assign_avg_max || 15})`
                      : `${escapeHtml(state.scheme.assign_avg_label || 'Assign Avg')} (${state.scheme.assign_avg_max || 15})`
                    }
                  </th>
                  <th colspan="${eCount}" class="excel-hdr-tan" id="th-exam-group">
                    ${isEditMode 
                      ? `<div class="sheet-th-input" contenteditable="true" oninput="onHeaderLabelChange('exam_label', this.innerText.trim())" onkeydown="if(event.key==='Enter'){event.preventDefault();}" title="Edit Unit Test Header" style="font-weight: 700; font-size: 0.75rem; width: auto; max-width: 120px; display: inline-block;">${escapeHtml(state.scheme.exam_label || 'Unit Test Marks')}</div>`
                      : `${escapeHtml(state.scheme.exam_label || 'Unit Test Marks')}`
                    }
                  </th>
                  <th rowspan="2" class="excel-hdr-tan resizable-th" data-col-idx="${5 + aCount + eCount}" style="width: ${(savedWidths && savedWidths[5 + aCount + eCount]) || 85}px;" ondblclick="autoFitColumn(${5 + aCount + eCount})" title="Double-click to auto-fit">
                    ${isEditMode 
                      ? `<div class="sheet-th-input" contenteditable="true" oninput="onHeaderLabelChange('exam_avg_label', this.innerText.trim())" onkeydown="if(event.key==='Enter'){event.preventDefault();}" title="Edit UT Avg Header" style="font-weight: 700; font-size: 0.70rem;">${escapeHtml(state.scheme.exam_avg_label || 'UT Avg')}</div> (${state.scheme.exam_avg_max || 20})`
                      : `${escapeHtml(state.scheme.exam_avg_label || 'UT Avg')} (${state.scheme.exam_avg_max || 20})`
                    }
                  </th>
                  ${assessCols.map((c, idx) => {
                    const colIdx = 6 + aCount + eCount + idx;
                    const w = (savedWidths && savedWidths[colIdx]) || 110;
                    return `
                      <th rowspan="2" class="excel-hdr-tan resizable-th" data-col-idx="${colIdx}" style="width: ${w}px;" id="th-assess-col-${idx}" ondblclick="autoFitColumn(${colIdx})" title="Double-click to auto-fit">
                        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.2rem; position:relative;">
                          <div style="display:flex; align-items:center; justify-content:center; gap:0.25rem; width:100%;">
                            ${isEditMode 
                              ? `<div class="sheet-th-input" contenteditable="true" oninput="onAssessmentColumnNameChange(${idx}, this.innerText.trim())" onkeydown="if(event.key==='Enter'){event.preventDefault();}" title="Edit Column Name" style="font-weight: 700; font-size: 0.72rem; width: 90%;">${escapeHtml(c.name)}</div>`
                              : `<span style="font-weight: 700; font-size: 0.76rem;">${escapeHtml(c.name)}</span>`
                            }
                          </div>
                          <span style="font-size:0.74rem; font-weight:700; color:var(--text-muted);">( ${c.max || 10} )</span>
                        </div>
                      </th>
                    `;
                  }).join('')}
                  <th rowspan="2" class="excel-hdr-tan resizable-th" data-col-idx="${6 + aCount + eCount + assessCols.length}" style="width: ${(savedWidths && savedWidths[6 + aCount + eCount + assessCols.length]) || 85}px; font-weight: 800;" id="th-total-group" ondblclick="autoFitColumn(${6 + aCount + eCount + assessCols.length})" title="Double-click to auto-fit">
                    ${isEditMode 
                      ? `<div class="sheet-th-input" contenteditable="true" oninput="onHeaderLabelChange('total_label', this.innerText.trim())" onkeydown="if(event.key==='Enter'){event.preventDefault();}" title="Edit Total Marks Header" style="font-weight: 800; font-size: 0.72rem;">${escapeHtml(state.scheme.total_label || 'Total Marks')}</div> (${state.scheme.total_max})`
                      : `${escapeHtml(state.scheme.total_label || 'Total Marks')} (${state.scheme.total_max})`
                    }
                  </th>
                </tr>
                <!-- ROW 5: Question/Assignment Subheaders -->
                <tr class="excel-hdr-sub">
                  ${state.assignments.map((a, i) => {
                    const colIdx = 4 + i;
                    const w = (savedWidths && savedWidths[colIdx]) || 50;
                    const aMaxMark = a.max_marks || 25;
                    const rawTitle = a.title || a.name || `Assignment ${i + 1}`;
                    const shortTitle = formatEvalSubheader(rawTitle, 'Assign', i);
                    return `
                      <th class="th-secondary resizable-th" data-col-idx="${colIdx}" style="width: ${w}px;" ondblclick="autoFitColumn(${colIdx})" title="${escapeHtml(rawTitle)} (${aMaxMark} Marks) - Double-click to auto-fit">
                        ${isEditMode 
                          ? `<input type="text" class="sheet-th-sub-input" value="${escapeHtml(shortTitle)}" oninput="onAssignmentTitleChange(${i}, this.value)" title="${escapeHtml(rawTitle)}"> <span style='font-size:0.65rem;opacity:0.7'>(${aMaxMark})</span>`
                          : `<span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(shortTitle)}</span><span style='font-size:0.7rem;opacity:0.75'>(${aMaxMark})</span>`
                        }
                      </th>
                    `;
                  }).join('')}
                  ${state.exams.map((e, i) => {
                    const colIdx = 5 + aCount + i;
                    const w = (savedWidths && savedWidths[colIdx]) || 50;
                    const eMaxMark = e.max_marks || 25;
                    const rawTitle = e.title || e.name || `Unit Test ${i + 1}`;
                    const shortTitle = formatEvalSubheader(rawTitle, 'UT', i);
                    return `
                      <th class="th-secondary resizable-th" data-col-idx="${colIdx}" style="width: ${w}px;" ondblclick="autoFitColumn(${colIdx})" title="${escapeHtml(rawTitle)} (${eMaxMark} Marks) - Double-click to auto-fit">
                        ${isEditMode 
                          ? `<input type="text" class="sheet-th-sub-input" value="${escapeHtml(shortTitle)}" oninput="onExamTitleChange(${i}, this.value)" title="${escapeHtml(rawTitle)}"> <span style='font-size:0.65rem;opacity:0.7'>(${eMaxMark})</span>`
                          : `<span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(shortTitle)}</span><span style='font-size:0.7rem;opacity:0.75'>(${eMaxMark})</span>`
                        }
                      </th>
                    `;
                  }).join('')}
                </tr>
              </thead>
              <tbody>
                ${state.students.map((s, idx) => `
                  <tr class="eval-student-row" id="eval-student-row-${s.student_id}"
                      data-student-id="${s.student_id}"
                      data-name="${escapeHtml(s.full_name || '').toLowerCase()}"
                      data-roll="${escapeHtml(String(s.class_roll_no || '')).toLowerCase()}"
                      data-enrollment="${escapeHtml(s.official_enrollment_no || '').toLowerCase()}"
                      data-reg="${escapeHtml(s.registration_no || '').toLowerCase()}"
                      data-total="${s.grand_total}"
                      data-att="${s.assessment_scores ? (s.assessment_scores[3] ?? 5) : 5}"
                      data-has-absent="${Boolean(s.exam_absent && s.exam_absent.some(Boolean))}">
                    <td class="cell-roll col-cell col-idx-0" data-col-idx="0">
                      ${escapeHtml(String(s.class_roll_no))}
                    </td>
                    <td class="col-cell col-idx-1" data-col-idx="1" style="font-family: var(--font-family-mono); font-size: 0.78rem; color: var(--text-muted);">
                      ${escapeHtml(s.official_enrollment_no || '—')}
                    </td>
                    <td class="col-cell col-idx-2" data-col-idx="2" style="font-family: var(--font-family-mono); font-size: 0.78rem; color: var(--text-muted);">
                      ${escapeHtml(s.registration_no || '—')}
                    </td>
                    <td class="cell-student-name col-cell col-idx-3" data-col-idx="3" title="${escapeHtml(s.full_name)}">
                      <span style="font-weight: 700; text-transform: uppercase;">${escapeHtml(s.full_name)}</span>
                    </td>
                    ${state.assignments.map((a, aIdx) => `
                      <td class="col-cell col-idx-${4 + aIdx}" data-col-idx="${4 + aIdx}">
                        <input type="number" 
                               class="excel-cell-input sheet-cell-input ${isEditMode ? 'is-editable' : ''}" 
                               data-col="a${aIdx + 1}"
                               data-student-assign="${s.student_id}_${aIdx}"
                               value="${s.assignment_scores[aIdx] ?? 0}" 
                               min="0" 
                               max="${a.max_marks || 25}" 
                               step="0.5" 
                               ${isEditMode ? '' : 'readonly'}
                               oninput="onEvalAssignmentScoreChange(${s.student_id}, ${aIdx}, this.value, this)">
                      </td>
                    `).join('')}
                    <td class="col-cell col-idx-${4 + aCount}" data-col-idx="${4 + aCount}" style="font-weight: 700; background: var(--bg-surface-secondary);" id="eval-assign-avg-${s.student_id}">${s.assignment_avg.toFixed(1)}</td>
                    ${state.exams.map((_, eIdx) => {
                      const isAb = Boolean(s.exam_absent[eIdx]);
                      const val = isAb ? 'AB' : (s.exam_scores[eIdx] ?? 0);
                      return `
                        <td class="col-cell col-idx-${5 + aCount + eIdx}" data-col-idx="${5 + aCount + eIdx}">
                          <input type="text" 
                                 class="excel-cell-input sheet-cell-input ${isEditMode ? 'is-editable' : ''}" 
                                 data-col="ut${eIdx + 1}"
                                 data-student-exam="${s.student_id}_${eIdx}"
                                 style="${isAb ? 'color: var(--status-absent) !important; font-weight: 800 !important; background: var(--status-absent-bg) !important;' : ''}" 
                                 value="${val}" 
                                 ${isEditMode ? '' : 'readonly'}
                                 title="Type score (0-${state.scheme.exam_avg_max || 20}) or AB for Absent"
                                 oninput="onEvalExamScoreChange(${s.student_id}, ${eIdx}, this.value, this)"
                                 onchange="onEvalExamScoreChange(${s.student_id}, ${eIdx}, this.value, this)">
                        </td>
                      `;
                    }).join('')}
                    <td class="col-cell col-idx-${5 + aCount + eCount}" data-col-idx="${5 + aCount + eCount}" style="font-weight: 700; background: var(--bg-surface-secondary);" id="eval-exam-avg-${s.student_id}">${s.exam_avg.toFixed(1)}</td>
                    ${assessCols.map((c, cIdx) => {
                      const colIdx = 6 + aCount + eCount + cIdx;
                      const val = s.assessment_scores ? (s.assessment_scores[cIdx] ?? 0) : 0;
                      return `
                        <td class="col-cell col-idx-${colIdx}" data-col-idx="${colIdx}">
                          <input type="number" 
                                 class="excel-cell-input sheet-cell-input ${isEditMode ? 'is-editable' : ''}" 
                                 data-col="assess_${cIdx}"
                                 data-student-assess="${s.student_id}_${cIdx}"
                                 value="${val}" 
                                 min="0" 
                                 max="${c.max || 10}" 
                                 step="0.5" 
                                 ${isEditMode ? '' : 'readonly'}
                                 oninput="onEvalAssessmentScoreChange(${s.student_id}, ${cIdx}, this.value, this)">
                        </td>
                      `;
                    }).join('')}
                    <td class="cell-total col-cell col-idx-${6 + aCount + eCount + assessCols.length}" data-col-idx="${6 + aCount + eCount + assessCols.length}" id="eval-grand-total-${s.student_id}">
                      ${s.grand_total}
                    </td>
                  </tr>
                `).join('')}
                <tr id="eval-no-filter-match-row" style="display: none;">
                  <td colspan="${leafCols.length}" style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-weight: 700; font-size: 0.88rem; background: var(--bg-surface);">
                    <span style="display: inline-flex; align-items: center; gap: 0.35rem;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      <span>No students match the filter criteria.</span>
                    </span>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="resetAllEvalFilters()" style="margin-left: 0.5rem; font-weight: 700;">Reset Filters</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- EXCEL-STYLE STATUS BAR FOOTER WITH ZOOM SLIDER -->
          <div class="sheet-statusbar">
            <div class="sheet-statusbar-left">
              <span>Ready. ${isEditMode 
                ? '<span style="display:inline-flex;align-items:center;gap:0.25rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg><span>Edit Mode Active</span></span>' 
                : 'View Mode'}</span>
              <span>•</span>
              <span>Cohort Roster: <strong>${state.students.length} Students</strong></span>
              <span>•</span>
              <span id="sheet-save-indicator" style="color: var(--color-primary); font-weight: 700;">Synced</span>
            </div>
            <div class="sheet-statusbar-right">

              <!-- Zoom Slider Container -->
              <div class="excel-zoom-slider-container" title="Zoom Sheet (Ctrl + Scroll / Ctrl +/-)">
                <button type="button" class="btn-excel-tool" onclick="adjustSheetZoom(-10)" title="Zoom Out (Ctrl -)" style="display:inline-flex;align-items:center;justify-content:center;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <input type="range" class="zoom-slider-range" id="zoom-slider" min="50" max="150" step="5" value="${window.currentSheetZoom || 100}" oninput="setSheetZoom(this.value)">
                <button type="button" class="btn-excel-tool" onclick="adjustSheetZoom(10)" title="Zoom In (Ctrl +)" style="display:inline-flex;align-items:center;justify-content:center;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <span class="excel-tool-display" id="zoom-status-display" onclick="setSheetZoom(100)" title="Click to reset zoom to 100%">${window.currentSheetZoom || 100}%</span>
                <button type="button" class="btn-excel-tool" onclick="fitSheetToWindow()" title="Fit sheet to screen width" style="display:inline-flex;align-items:center;gap:0.25rem;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                  <span>Fit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      initColumnResize();
      applyColFontScales();
      populateEditMarksModal();
      initHeaderEditBehavior();

      const curZoom = window.currentSheetZoom || 100;
      const curFont = window.currentSheetFontScale || 1.0;
      const vp = document.querySelector('.excel-sheet-viewport');
      const tbl = document.getElementById('eval-table');
      if (vp) {
        vp.style.setProperty('--sheet-zoom', curZoom / 100);
        vp.style.setProperty('--sheet-font-scale', curFont);
      }
      if (tbl) {
        tbl.style.zoom = curZoom / 100;
      }

      initViewportAutoFitObserver();
      applyEvalFilters();

      setTimeout(() => {
        recalcHeaderRowHeights();
        fitSheetToWindow(true);
      }, 50);
    }

    function getEvalLeafColumns() {
      const state = window.currentEvalSheetState;
      if (!state) return [];
      const aCount = state.assignments.length;
      const eCount = state.exams.length;
      const assessCols = state.assessment_columns || state.custom_columns || [];

      const cols = [
        { key: 'roll', label: 'ROLL NO', defaultWidth: 70, minWidth: 50 },
        { key: 'enrollment', label: 'ENROLLMENT NO', defaultWidth: 135, minWidth: 85 },
        { key: 'reg', label: 'REG NO', defaultWidth: 135, minWidth: 85 },
        { key: 'name', label: 'STUDENT NAME', defaultWidth: 200, minWidth: 120, align: 'left' }
      ];

      for (let i = 0; i < aCount; i++) {
        cols.push({
          key: `assign_${i}`,
          label: `Assign ${i + 1}`,
          shortLabel: `${i + 1}`,
          defaultWidth: 46,
          minWidth: 36
        });
      }

      cols.push({
        key: 'assign_avg',
        label: `Assign Avg (${state.scheme.assign_avg_max || 15})`,
        shortLabel: 'Avg',
        defaultWidth: 95,
        minWidth: 65
      });

      for (let i = 0; i < eCount; i++) {
        cols.push({
          key: `exam_${i}`,
          label: `UT ${i + 1}`,
          shortLabel: `${i + 1}`,
          defaultWidth: 46,
          minWidth: 36
        });
      }

      cols.push({
        key: 'exam_avg',
        label: `UT Avg (${state.scheme.exam_avg_max || 20})`,
        shortLabel: 'UT Avg',
        defaultWidth: 85,
        minWidth: 65
      });

      assessCols.forEach((c, idx) => {
        cols.push({
          key: `assess_${idx}`,
          label: `${c.name} (${c.max || 10})`,
          shortLabel: c.name,
          defaultWidth: 110,
          minWidth: 75
        });
      });

      cols.push({
        key: 'total',
        label: `Total Marks (${state.scheme.total_max})`,
        shortLabel: 'Total',
        defaultWidth: 85,
        minWidth: 70
      });

      return cols;
    }

    function setColumnWidth(colIdx, width) {
      const leafCols = getEvalLeafColumns();
      if (!leafCols[colIdx]) return;
      const minW = leafCols[colIdx].minWidth || 36;
      const finalW = Math.max(minW, Math.round(width));

      const colEl = document.getElementById(`eval-col-${colIdx}`);
      if (colEl) colEl.style.width = finalW + 'px';

      const thEl = document.querySelector(`th[data-col-idx="${colIdx}"]`);
      if (thEl) {
        thEl.style.width = finalW + 'px';
        thEl.style.minWidth = finalW + 'px';
      }

      if (!window.currentColWidths) window.currentColWidths = {};
      window.currentColWidths[colIdx] = finalW;

      try {
        if (currentRegisterId) {
          localStorage.setItem(`eval_col_widths_${currentRegisterId}`, JSON.stringify(window.currentColWidths));
        }
      } catch (e) {}
    }

    // Temporary visual-only width: does NOT save to localStorage or currentColWidths.
    // Used for the focus-expand animation so the expanded state never persists on refresh.
    function setColumnWidthTemp(colIdx, width) {
      const leafCols = getEvalLeafColumns();
      if (!leafCols[colIdx]) return;
      const minW = leafCols[colIdx].minWidth || 36;
      const finalW = Math.max(minW, Math.round(width));

      const colEl = document.getElementById(`eval-col-${colIdx}`);
      if (colEl) colEl.style.width = finalW + 'px';

      const thEl = document.querySelector(`th[data-col-idx="${colIdx}"]`);
      if (thEl) {
        thEl.style.width = finalW + 'px';
        thEl.style.minWidth = finalW + 'px';
      }
      // Intentionally no localStorage save
    }

    function resetColumnWidths() {
      if (currentRegisterId) {
        try {
          localStorage.removeItem(`eval_col_widths_${currentRegisterId}`);
        } catch (e) {}
      }
      window.currentColWidths = {};
      const leafCols = getEvalLeafColumns();
      leafCols.forEach((col, idx) => {
        const colEl = document.getElementById(`eval-col-${idx}`);
        const thEl = document.querySelector(`th[data-col-idx="${idx}"]`);
        if (colEl) colEl.style.width = col.defaultWidth + 'px';
        if (thEl) {
          thEl.style.width = col.defaultWidth + 'px';
          thEl.style.minWidth = col.minWidth + 'px';
        }
      });
      showToast('Column widths reset to institutional defaults', 'info');
    }

    function resetSingleColumnWidth(colIdx) {
      const leafCols = getEvalLeafColumns();
      if (!leafCols[colIdx]) return;
      const defW = leafCols[colIdx].defaultWidth;
      setColumnWidth(colIdx, defW);
      showToast(`Reset "${leafCols[colIdx].label}" width to ${defW}px`, 'info');
    }

    function autoFitColumn(colIdx) {
      const leafCols = getEvalLeafColumns();
      if (colIdx < 0 || colIdx >= leafCols.length) return;
      const colDef = leafCols[colIdx];
      const table = document.getElementById('eval-table');
      if (!table) return;

      const viewport = document.querySelector('.excel-sheet-viewport');
      const viewportWidth = viewport ? viewport.clientWidth : window.innerWidth;

      const cells = table.querySelectorAll(`.col-idx-${colIdx}`);

      // Measure data cells only — headers already wrap so don't drive column width
      let maxContentWidth = Math.max(colDef.minWidth || 36, 50);

      cells.forEach(cell => {
        const input = cell.querySelector('input');
        if (input) {
          const valLen = String(input.value || '').length;
          maxContentWidth = Math.max(maxContentWidth, valLen * 9 + 22);
        } else {
          const textLen = (cell.innerText || '').trim().length;
          maxContentWidth = Math.max(maxContentWidth, textLen * 8.5 + 24);
        }
      });

      // Cap at 30% of viewport so one column never dominates the sheet
      const maxAllowed = Math.round(viewportWidth * 0.30);
      const finalWidth = Math.min(maxAllowed, Math.max(colDef.minWidth, Math.round(maxContentWidth)));
      setColumnWidth(colIdx, finalWidth);
      showToast(`Auto-fitted "${colDef.label || 'Column'}" to ${finalWidth}px`, 'info');
    }


    let isResizing = false;
    let currentResizingColIdx = null;
    let resizeStartX = 0;
    let resizeStartWidth = 0;

    function initColumnResize() {
      // Column drag handles eliminated in favor of auto-fit and fixed/responsive sizing.
    }

    function adjustSheetZoom(delta) {
      const current = window.currentSheetZoom || 100;
      const next = Math.min(150, Math.max(50, Math.round(current + delta)));
      setSheetZoom(next);
    }

    function setSheetZoom(val) {
      const zoomNum = Math.min(150, Math.max(50, parseInt(val, 10) || 100));
      window.currentSheetZoom = zoomNum;
      const scale = zoomNum / 100;

      const viewport = document.querySelector('.excel-sheet-viewport');
      const table = document.getElementById('eval-table');
      if (viewport) viewport.style.setProperty('--sheet-zoom', scale);
      if (table) {
        table.style.zoom = scale;
        const firstRowTh = table.querySelector('thead tr:first-child th[colspan]');
        if (firstRowTh && firstRowTh.offsetHeight > 0) {
          table.style.setProperty('--th-row1-height', `${firstRowTh.offsetHeight}px`);
        }
      }

      const slider = document.getElementById('zoom-slider');
      if (slider) slider.value = zoomNum;

      const statusDisp = document.getElementById('zoom-status-display');
      if (statusDisp) statusDisp.innerText = `${zoomNum}%`;

      try {
        localStorage.setItem('eval_sheet_zoom', zoomNum);
      } catch (e) {}
    }

    function fitSheetToWindow(silent = false) {
      const viewport = document.querySelector('.excel-sheet-viewport');
      const table = document.getElementById('eval-table');
      if (!viewport || !table) return;

      viewport.style.setProperty('--sheet-zoom', 1);
      table.style.zoom = 1;

      const viewportWidth = viewport.clientWidth - 4;
      const tableWidth = table.scrollWidth;

      if (tableWidth > 0 && viewportWidth > 0) {
        let optimalZoom = Math.round((viewportWidth / tableWidth) * 100);
        // Never shrink below 75% — keeps data rows readable
        optimalZoom = Math.min(125, Math.max(75, optimalZoom));
        setSheetZoom(optimalZoom);
        if (!silent) {
          showToast(`Fitted sheet to screen (${optimalZoom}%)`, 'info');
        }
      } else {
        setSheetZoom(100);
      }
    }

    function recalcHeaderRowHeights() {
      const table = document.getElementById('eval-table');
      if (!table) return;
      const firstRowTh = table.querySelector('thead tr:first-child th[colspan]');
      if (firstRowTh && firstRowTh.offsetHeight > 0) {
        table.style.setProperty('--th-row1-height', `${firstRowTh.offsetHeight}px`);
      }
    }

    let autoFitResizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(autoFitResizeTimer);
      autoFitResizeTimer = setTimeout(() => {
        recalcHeaderRowHeights();
        fitSheetToWindow(true);
      }, 120);
    });

    let vpResizeObserver = null;
    function initViewportAutoFitObserver() {
      const vp = document.querySelector('.excel-sheet-viewport');
      if (!vp || vpResizeObserver) return;
      let lastWidth = vp.clientWidth;
      vpResizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const newW = entry.contentRect.width;
          if (Math.abs(newW - lastWidth) > 10) {
            lastWidth = newW;
            clearTimeout(autoFitResizeTimer);
            autoFitResizeTimer = setTimeout(() => {
              recalcHeaderRowHeights();
              fitSheetToWindow(true);
            }, 120);
          }
        }
      });
      vpResizeObserver.observe(vp);
    }

    function adjustSheetFontScale(delta) {
      const current = window.currentSheetFontScale || 1.0;
      const next = Math.min(1.4, Math.max(0.7, Math.round((current + delta) * 100) / 100));
      setSheetFontScale(next);
    }

    function setSheetFontScale(scale) {
      const val = Math.min(1.4, Math.max(0.7, parseFloat(scale) || 1.0));
      window.currentSheetFontScale = val;

      const viewport = document.querySelector('.excel-sheet-viewport');
      if (viewport) viewport.style.setProperty('--sheet-font-scale', val);

      const disp = document.getElementById('sheet-font-scale-display');
      if (disp) disp.innerText = `${Math.round(val * 100)}%`;

      applyColFontScales();

      const tbl = document.getElementById('eval-table');
      if (tbl) {
        const firstRowTh = tbl.querySelector('thead tr:first-child th[colspan]');
        if (firstRowTh && firstRowTh.offsetHeight > 0) {
          tbl.style.setProperty('--th-row1-height', `${firstRowTh.offsetHeight}px`);
        }
      }

      try {
        localStorage.setItem('eval_sheet_font_scale', val);
      } catch (e) {}
    }

    function setColumnFontScale(colIdx, scale) {
      if (colIdx === undefined || colIdx === null) return;
      if (!window.currentColFontScales) window.currentColFontScales = {};

      if (scale === 1.0 || !scale) {
        delete window.currentColFontScales[colIdx];
      } else {
        window.currentColFontScales[colIdx] = scale;
      }

      applyColFontScales();
      closeColMenu();

      try {
        if (currentRegisterId) {
          localStorage.setItem(`eval_col_font_scales_${currentRegisterId}`, JSON.stringify(window.currentColFontScales));
        }
      } catch (e) {}

      const leafCols = getEvalLeafColumns();
      const label = (leafCols[colIdx] && leafCols[colIdx].label) || 'Column';
      showToast(`Set text size for "${label}" to ${Math.round((scale || 1) * 100)}%`, 'info');
    }

    function applyColFontScales() {
      const leafCols = getEvalLeafColumns();
      const fontScales = window.currentColFontScales || {};
      const baseScale = window.currentSheetFontScale || 1.0;

      let styleEl = document.getElementById('eval-dynamic-col-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'eval-dynamic-col-styles';
        document.head.appendChild(styleEl);
      }

      let css = '';
      leafCols.forEach((col, idx) => {
        const scale = fontScales[idx];
        if (scale && scale !== 1.0) {
          css += `
            #eval-table .col-idx-${idx},
            #eval-table .col-idx-${idx} input {
              font-size: calc(0.82rem * ${baseScale} * ${scale}) !important;
            }
          `;
        }
      });
      styleEl.textContent = css;
    }

    let activePopoverColIdx = null;

    function openColMenu(event, colIdx) {
      // Column popover menu eliminated. Text scale is managed globally in footer status bar.
    }

    function closeColMenu() {
      // Clean no-op
    }

    function onEvalAssignmentScoreChange(studentId, aIdx, val, inputEl) {
      const state = window.currentEvalSheetState;
      if (!state) return;
      const student = state.students.find(s => s.student_id === studentId);
      if (!student) return;

      // Clamp to the individual assignment's own max_marks, not the scheme avg weight
      const assignment = state.assignments && state.assignments[aIdx];
      const max = Number((assignment && assignment.max_marks) || 25);
      let num = parseFloat(val);
      if (isNaN(num) || val === '') {
        num = 0;
      } else if (num > max) {
        num = max;
        if (inputEl) inputEl.value = max;
        else {
          const inp = document.querySelector(`input[data-student-assign="${studentId}_${aIdx}"]`);
          if (inp) inp.value = max;
        }
      } else if (num < 0) {
        num = 0;
        if (inputEl) inputEl.value = 0;
      }

      student.assignment_scores[aIdx] = num;
      recalculateEvalRow(student);
      const avgEl = document.getElementById(`eval-assign-avg-${studentId}`);
      if (avgEl) avgEl.innerText = student.assignment_avg.toFixed(1);
      const totEl = document.getElementById(`eval-grand-total-${studentId}`);
      if (totEl) totEl.innerText = student.grand_total;
    }

    function onEvalExamScoreChange(studentId, eIdx, val, inputEl) {
      const state = window.currentEvalSheetState;
      if (!state) return;
      const student = state.students.find(s => s.student_id === studentId);
      if (!student) return;

      const trimmed = String(val).trim().toUpperCase();
      if (trimmed === 'AB' || trimmed === 'ABSENT' || trimmed === 'A') {
        student.exam_absent[eIdx] = true;
        student.exam_scores[eIdx] = 0;
        if (inputEl) {
          inputEl.style.color = 'var(--status-absent)';
          inputEl.style.fontWeight = '800';
          inputEl.style.background = 'var(--status-absent-bg)';
        }
      } else {
        student.exam_absent[eIdx] = false;
        if (inputEl) {
          inputEl.style.color = '';
          inputEl.style.fontWeight = '';
          inputEl.style.background = '';
        }
        // Clamp to the individual exam's own max_marks, not the scheme avg weight
        const exam = state.exams && state.exams[eIdx];
        const max = Number((exam && exam.max_marks) || 25);
        let num = parseFloat(trimmed);
        if (isNaN(num) || val === '') {
          num = 0;
        } else if (num > max) {
          num = max;
          if (inputEl) inputEl.value = max;
          else {
            const inp = document.querySelector(`input[data-student-exam="${studentId}_${eIdx}"]`);
            if (inp) inp.value = max;
          }
        } else if (num < 0) {
          num = 0;
          if (inputEl) inputEl.value = 0;
        }
        student.exam_scores[eIdx] = num;
      }

      recalculateEvalRow(student);
      const avgEl = document.getElementById(`eval-exam-avg-${studentId}`);
      if (avgEl) avgEl.innerText = student.exam_avg.toFixed(1);
      const totEl = document.getElementById(`eval-grand-total-${studentId}`);
      if (totEl) totEl.innerText = student.grand_total;
    }

    function onEvalAssessmentScoreChange(studentId, cIdx, val, inputEl) {
      const state = window.currentEvalSheetState;
      if (!state) return;
      const student = state.students.find(s => s.student_id === studentId);
      if (!student) return;

      const cols = state.assessment_columns || state.custom_columns || [];
      const col = cols[cIdx];
      const max = Number((col && col.max) || 10);
      let num = parseFloat(val);
      if (isNaN(num) || val === '') {
        num = 0;
      } else if (num > max) {
        num = max;
        if (inputEl) inputEl.value = max;
        else {
          const inp = document.querySelector(`input[data-student-assess="${studentId}_${cIdx}"]`);
          if (inp) inp.value = max;
        }
      } else if (num < 0) {
        num = 0;
        if (inputEl) inputEl.value = 0;
      }

      if (!Array.isArray(student.assessment_scores)) student.assessment_scores = [];
      student.assessment_scores[cIdx] = num;
      recalculateEvalRow(student);
      const totEl = document.getElementById(`eval-grand-total-${studentId}`);
      if (totEl) totEl.innerText = student.grand_total;
    }

    // Backward-compatible aliases for legacy callers
    function onEvalAttendanceScoreChange(studentId, val, inputEl) {
      onEvalAssessmentScoreChange(studentId, 3, val, inputEl);
    }

    function onEvalPresentationScoreChange(studentId, val, inputEl) {
      onEvalAssessmentScoreChange(studentId, 1, val, inputEl);
    }

    function onEvalCustomScoreChange(studentId, cIdx, val, inputEl) {
      onEvalAssessmentScoreChange(studentId, cIdx, val, inputEl);
    }

    async function exportInternalEvalExcel() {
      const state = window.currentEvalSheetState;
      if (!state) return;
      try {
        showToast('Generating official Internal Evaluation Excel (.xlsx)...', 'info');
        const assessCols = state.assessment_columns || state.custom_columns || [];
        const payload = {
          institution_name: getSessionInstituteHeader() || state.institution_name,
          institution_header: getSessionInstituteHeader(),
          session_label: state.session_label,
          dept_semester_text: state.dept_semester_text,
          department_name: (registerData && (registerData.department_name || registerData.branch_name)) || '',
          department_code: (registerData && registerData.department_code) || '',
          subject_name: (registerData && registerData.subject_name) || 'Subject',
          semester: (registerData && registerData.semester) || 1,
          year: (registerData && registerData.year) || (registerData && registerData.semester ? Math.ceil(registerData.semester / 2) : 1),
          assignments: state.assignments,
          exams: state.exams,
          assessment_columns: assessCols,
          custom_columns: assessCols,
          marks_scheme: state.scheme,
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
      try {
        const state = window.currentEvalSheetState;
        if (state && currentRegisterId) {
          const assessCols = state.assessment_columns || state.custom_columns || [];
          localStorage.setItem(`eval_sheet_state_${currentRegisterId}`, JSON.stringify({
            institution_name: state.institution_name,
            institution_header: getSessionInstituteHeader(),
            session_label: state.session_label,
            dept_semester_text: state.dept_semester_text,
            scheme: state.scheme,
            assessment_columns: assessCols,
            custom_columns: assessCols,
            students: state.students
          }));
        }
      } catch (e) {
        console.warn('Failed to save evaluation state in local storage:', e);
      }
      showToast('Internal evaluation spreadsheet synced and saved!', 'success');
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAddColumnModal();
        closeRemoveColumnModal();
        closeSaveConfirmModal();
        closeCancelConfirmModal();
        closeEditMarksModal();
        closeColMenu();
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          adjustSheetZoom(10);
        } else if (e.key === '-') {
          e.preventDefault();
          adjustSheetZoom(-10);
        } else if (e.key === '0') {
          e.preventDefault();
          setSheetZoom(100);
        }
      }
    });

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

    document.addEventListener('DOMContentLoaded', () => {
      loadRegistersList();
    });

