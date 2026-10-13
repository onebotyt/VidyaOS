/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: REGISTERS
 * frontend/faculty/registers/registers.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute({ roles: ['TEACHER'], requireSubjects: true });

    function getToken() {
      return typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('access_token') || '');
    }

    let allRegisters = [];
    let currentRegisterId = null;
    let registerData = null;
    let gridData = null;
    let sessionsList = [];
    let currentScansList = [];
    let manualAbsentSet = new Set();
    let currentActiveExamId = null; // Tracks the currently open exam studio

    // Set today's date in picker
    const todayStr = new Date().toISOString().slice(0, 10);
    document.getElementById('sync-date').value = todayStr;

    async function loadRegistersList() {
      try {
        const res = await fetchApi('/faculty/registers');
        if (res.success) {
          allRegisters = res.data || [];
          
          const user = getCurrentUser();
          const hasSubjects = Boolean(allRegisters.length > 0 || user?.is_hod);
          if (!hasSubjects) {
            ['nav-reg', 'nav-assign', 'nav-reports'].forEach(id => {
              const el = document.getElementById(id);
              if (el) el.style.display = 'none';
            });
            document.getElementById('view-register-container').innerHTML = `
              <div class="page-header" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <h1 class="page-title">Digital Attendance Registers</h1>
                  <p class="page-subtitle">Subject register books and attendance management</p>
                </div>
                <a href="/faculty/dashboard.html" class="btn btn-secondary btn-sm">&larr; Back to Dashboard</a>
              </div>
              <div class="card" style="text-align: center; padding: 3.5rem 2rem; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-color); margin-top: 1.5rem;">
                <div style="margin-bottom: 0.75rem; color: var(--color-primary); display: flex; justify-content: center;">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text-main);">No Teaching Registers Allocated Yet</h3>
                <p style="font-size: 0.875rem; color: var(--text-muted); max-width: 540px; margin: 0 auto 1.5rem; line-height: 1.5;">
                  Your Department HOD has not allocated any course subjects or official attendance registers to your profile yet. Once assigned, your digital register books will appear here automatically.
                </p>
                <a href="/faculty/dashboard.html" class="btn btn-secondary btn-sm">&larr; Back to Dashboard</a>
              </div>
            `;
            return;
          }

          // Populate the register switcher dropdown
          renderRegisterSwitcher();

          // DIRECT REGISTER OPEN:
          // Check if URL has ?id=... and if it exists in allRegisters
          const urlParams = new URLSearchParams(window.location.search);
          const regParam = urlParams.get('id');
          let targetId = regParam ? Number(regParam) : null;
          if (!targetId || !allRegisters.some(r => r.id === targetId)) {
            targetId = allRegisters[0]?.id;
          }

          const tabParam = urlParams.get('tab');
          if (tabParam) {
            switchRegisterTab(tabParam);
          }
          if (targetId) {
            await openRegister(targetId);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    function renderRegisterSwitcher() {
      const sel = document.getElementById('register-switcher-select');
      if (!sel) return;
      if (!allRegisters.length) {
        sel.innerHTML = '<option value="">No Registers Allocated</option>';
        return;
      }
      sel.innerHTML = allRegisters.map(r => {
        const isSel = r.id === currentRegisterId;
        const subj = r.subject_name || r.name || 'Subject';
        const code = r.subject_code ? ` [${r.subject_code}]` : '';
        const scope = r.session_type_scope || 'THEORY';
        const dept = r.department_name ? ` • ${r.department_name}` : '';
        const sem = r.semester ? ` Sem ${r.semester}` : '';
        const label = `${subj}${code} (${scope}${dept}${sem})`;
        return `<option value="${r.id}" ${isSel ? 'selected' : ''}>${label}</option>`;
      }).join('');
    }

    function renderRegisterCards() {
      // Legacy compatibility stub
      const grid = document.getElementById('registers-grid');
      if (grid) grid.innerHTML = '';
    }

    async function openRegister(registerId) {
      if (currentRegisterId !== registerId) {
        isLiveSessionStarted = false;
        currentRollCallSession = null;
        activePinCode = null;
        activeQrToken = null;
      }
      currentRegisterId = registerId;
      const tabSuffix = (currentActiveTab && currentActiveTab !== 'matrix') ? `&tab=${currentActiveTab}` : '';
      window.history.replaceState(null, '', `/faculty/registers.html?id=${registerId}${tabSuffix}`);
      document.getElementById('view-register-container').style.display = 'block';

      // Keep dropdown in sync
      const sel = document.getElementById('register-switcher-select');
      if (sel && sel.value !== String(registerId)) {
        sel.value = registerId;
      }

      const navAssign = document.getElementById('nav-assign');
      if (navAssign) navAssign.href = `/faculty/assignments.html?id=${registerId}`;
      const navMarks = document.getElementById('nav-marks');
      if (navMarks) navMarks.href = `/faculty/tests.html?id=${registerId}`;
      const navEval = document.getElementById('nav-eval');
      if (navEval) navEval.href = `/faculty/evaluation.html?id=${registerId}`;

      await loadRegisterDetail();
      updateRegisterScopeBadges();
      loadRegisterTabsCount();
      if (currentActiveTab === 'assignments') {
        loadRegisterAssignments();
      } else if (currentActiveTab === 'exams') {
        loadRegisterExams();
      }
    }

    async function openRegisterAndSync(registerId) {
      await openRegister(registerId);
      triggerEspDaySync();
    }

    function backToCards() {
      // Compatibility stub: keeps active register
      if (allRegisters.length) openRegister(allRegisters[0].id);
    }

    let currentSelectedMonth = null;
    let pageSpreadMode = 'FULL'; // 'FULL' | 'PAGE_1' | 'PAGE_2'

    async function loadRegisterDetail(monthToLoad) {
      try {
        if (monthToLoad) currentSelectedMonth = monthToLoad;
        const qStr = currentSelectedMonth ? `?month=${currentSelectedMonth}` : '';
        const res = await fetchApi(`/faculty/registers/${currentRegisterId}${qStr}`);
        if (res.success) {
          registerData = res.data.register;
          gridData = res.data.grid;
          sessionsList = res.data.sessions || [];
          if (gridData.month) currentSelectedMonth = gridData.month;

          renderRegisterHeader();
          renderGridMatrix();
          renderSessionsList();
          checkEspStatus();
          updateRegisterScopeBadges();
        }
      } catch (err) {
        console.error(err);
      }
    }

    function renderRegisterHeader() {
      // Physical Book Metadata Fields (100% English)
      const subjEl = document.getElementById('reg-meta-subject');
      if (subjEl) subjEl.innerText = `${registerData.subject_name || registerData.name} ${registerData.subject_code ? '(' + registerData.subject_code + ')' : ''}`;
      
      const paperEl = document.getElementById('reg-meta-paper');
      if (paperEl) paperEl.innerText = registerData.session_type_scope || 'THEORY';

      const classEl = document.getElementById('reg-meta-class');
      if (classEl) classEl.innerText = registerData.department_name || registerData.branch_name || 'Academic Cohort';

      const secEl = document.getElementById('reg-meta-section');
      const sessLabel = registerData.academic_year_label || 'Current Session';
      if (secEl) secEl.innerText = `${sessLabel} • Sem ${registerData.semester || 1}`;

      const officialBadge = document.getElementById('reg-badge-official');
      if (officialBadge) officialBadge.innerText = registerData.is_official ? 'Official Register' : 'Personal Register';

      const scopeBadge = document.getElementById('reg-badge-scope');
      if (scopeBadge) scopeBadge.innerText = registerData.session_type_scope || 'THEORY';

      // Month formatting (e.g. "2026-09" -> "September 2026")
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const formatMonthLabel = (mStr) => {
        if (!mStr) return '';
        const [yr, mo] = mStr.split('-').map(Number);
        return `${monthNames[mo - 1]} ${yr}`;
      };

      const monthLabel = formatMonthLabel(gridData.month || currentSelectedMonth);
      const currMonthDisp = document.getElementById('current-month-display');
      if (currMonthDisp) currMonthDisp.innerText = monthLabel;

      const prntMonthTxt = document.getElementById('print-month-text');
      if (prntMonthTxt) prntMonthTxt.innerText = monthLabel.toUpperCase();

      // Month select options
      const hiddenPicker = document.getElementById('hidden-month-picker');
      if (hiddenPicker) {
        hiddenPicker.value = gridData.month || currentSelectedMonth || todayStr.slice(0, 7);
      }
    }

    function openMonthPicker() {
      const inp = document.getElementById('hidden-month-picker');
      if (!inp) return;
      inp.value = currentSelectedMonth || todayStr.slice(0, 7);
      try {
        if (typeof inp.showPicker === 'function') {
          inp.showPicker();
        } else {
          inp.click();
        }
      } catch (err) {
        console.warn('showPicker:', err);
      }
    }

    function jumpToCurrentMonth() {
      const thisMonth = todayStr.slice(0, 7);
      if (currentSelectedMonth !== thisMonth) {
        changeRegisterMonth(thisMonth);
      }
    }

    function changeRegisterMonth(val) {
      if (!val || val === currentSelectedMonth) return;
      loadRegisterDetail(val);
    }

    function navigateMonth(delta) {
      if (!gridData || !gridData.available_months) return;
      const months = gridData.available_months;
      let currIdx = months.indexOf(currentSelectedMonth);
      if (currIdx === -1) currIdx = 0;
      let nextIdx = currIdx + delta;
      if (nextIdx >= 0 && nextIdx < months.length) {
        changeRegisterMonth(months[nextIdx]);
      } else {
        const [yr, mo] = (currentSelectedMonth || todayStr.slice(0, 7)).split('-').map(Number);
        const nextDt = new Date(yr, mo - 1 + delta, 1);
        const y = nextDt.getFullYear();
        const m = String(nextDt.getMonth() + 1).padStart(2, '0');
        changeRegisterMonth(`${y}-${m}`);
      }
    }

    function cyclePageSpreadMode() {
      if (pageSpreadMode === 'FULL') pageSpreadMode = 'PAGE_1';
      else if (pageSpreadMode === 'PAGE_1') pageSpreadMode = 'PAGE_2';
      else pageSpreadMode = 'FULL';

      const lbl = document.getElementById('spread-mode-label');
      if (lbl) {
        if (pageSpreadMode === 'PAGE_1') lbl.innerText = 'Page 1 (Days 1–22)';
        else if (pageSpreadMode === 'PAGE_2') lbl.innerText = 'Page 2 (Days 23–31 + Totals)';
        else lbl.innerText = 'Full Month';
      }
      renderGridMatrix();
    }

    // ─── PHYSICAL MATRIX RENDERING ───
    function renderGridMatrix() {
      const thead = document.getElementById('matrix-head');
      const tbody = document.getElementById('matrix-body');
      const tfoot = document.getElementById('matrix-foot');

      if (!gridData || !gridData.students || !gridData.students.length) {
        thead.innerHTML = '';
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No enrolled students found in cohort roster.</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
      }

      const allDays = gridData.month_days || [];
      let daysToShow = allDays;
      const showSummaryColumns = (pageSpreadMode === 'FULL' || pageSpreadMode === 'PAGE_2');

      if (pageSpreadMode === 'PAGE_1') {
        daysToShow = allDays.filter(d => d.day <= 22);
      } else if (pageSpreadMode === 'PAGE_2') {
        daysToShow = allDays.filter(d => d.day >= 23);
      }

      // Expand daysToShow into multi-period columns when multiple class periods exist on a date
      const finalizedSessions = gridData.finalized_sessions || [];
      const matrixCols = [];
      daysToShow.forEach(d => {
        const daySessions = finalizedSessions.filter(s => s.session_date === d.date);
        if (daySessions.length > 1) {
          daySessions.forEach((s, sIdx) => {
            const pNum = s.period_number || (sIdx + 1);
            matrixCols.push({
              ...d,
              period_number: pNum,
              session_id: s.id,
              col_key: `${d.date}_${pNum}`,
              session_key: `sess_${s.id}`,
              display_day: `${d.day} [P${pNum}]`,
              display_title: `${d.date} (${d.day_name}) — Period ${pNum}${s.label ? ': ' + s.label : ''}`,
              is_multi: true
            });
          });
        } else if (daySessions.length === 1) {
          const s = daySessions[0];
          const pNum = s.period_number || 1;
          matrixCols.push({
            ...d,
            period_number: pNum,
            session_id: s.id,
            col_key: d.date,
            session_key: `sess_${s.id}`,
            display_day: pNum > 1 ? `${d.day} [P${pNum}]` : `${d.day}`,
            display_title: `${d.date} (${d.day_name})${pNum > 1 ? ' — Period ' + pNum : ''}${d.holiday_label ? ' - ' + d.holiday_label : ''}`,
            is_multi: false
          });
        } else {
          matrixCols.push({
            ...d,
            period_number: 1,
            session_id: null,
            col_key: d.date,
            session_key: null,
            display_day: `${d.day}`,
            display_title: `${d.date} (${d.day_name})${d.holiday_label ? ' - ' + d.holiday_label : ''}`,
            is_multi: false
          });
        }
      });

      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const [yr, mo] = (gridData.month || todayStr.slice(0, 7)).split('-').map(Number);
      const monthTitle = `${monthNames[mo - 1]?.toUpperCase() || ''} ${yr}`;

      // 1. BUILD TWO-TIER THEAD
      let headHtml = `
        <tr>
          <th class="sticky-col-1" rowspan="2" style="width: 36px; font-size: 0.65rem; padding: 0.2rem;">Roll<br>No.</th>
          <th class="sticky-col-2" rowspan="2" style="width: 148px; min-width: 148px; max-width: 170px; font-size: 0.74rem; padding: 0.2rem 0.45rem;">Name</th>
          <th colspan="${matrixCols.length}" style="background: var(--table-th-bg); color: var(--table-th-color); font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.2rem;">
            DATES OF LECTURE — ${monthTitle}
          </th>
      `;

      if (showSummaryColumns) {
        headHtml += `
          <th class="sticky-r-att-group" colspan="3" style="background: var(--col-att-group-bg); color: var(--col-att-group-color); font-size: 0.65rem; font-weight: 800; letter-spacing: 0.04em; padding: 0.2rem 0.1rem; width: 96px; text-align: center;">ATTENDED</th>
          <th class="sticky-r-abs-group" colspan="3" style="background: var(--col-abs-group-bg); color: var(--col-abs-group-color); font-size: 0.65rem; font-weight: 800; letter-spacing: 0.04em; padding: 0.2rem 0.1rem; width: 96px; text-align: center;">ABSENT</th>
          <th class="sticky-r-7" rowspan="2" style="background: var(--table-sticky-th-bg); color: var(--table-th-color); font-size: 0.65rem; padding: 0.2rem; width: 44px; text-align: center;">%</th>
          <th class="sticky-r-8" rowspan="2" style="background: var(--table-sticky-th-bg); color: var(--table-th-color); font-size: 0.65rem; padding: 0.2rem; width: 78px; text-align: center;">Remarks</th>
        `;
      }
      headHtml += `</tr><tr>`;

      // Sub-headers for Matrix Columns
      matrixCols.forEach(col => {
        const isNonInst = col.is_holiday;
        const bg = isNonInst ? 'var(--col-holiday-bg)' : 'var(--table-bg)';
        const fg = isNonInst ? 'var(--col-holiday-color)' : 'var(--text-main)';
        const eventTag = col.event_label ? `
          <div style="font-size: 0.5rem; color: var(--col-holiday-color); font-weight: 800; line-height: 1; margin-top: 1px; text-transform: uppercase;" title="${col.event_label}">
            ${col.event_label.length > 8 ? col.event_label.slice(0, 7) + '…' : col.event_label}
          </div>
        ` : '';

        const isToday = col.date === todayStr;

        if (isToday) {
          // Today's column: bold blue header with indicator dot
          headHtml += `
            <th data-today="true" style="min-width: 28px; max-width: 38px; padding: 0.15rem 0.1rem;
                background: linear-gradient(180deg, var(--color-primary-hover) 0%, var(--color-primary) 100%);
                color: var(--text-white);
                position: relative;
                box-shadow: 0 0 0 2px var(--color-primary) inset;"
                title="${col.display_title}">
              <div style="font-size: 0.68rem; font-weight: 900; font-family: var(--font-family-mono);">${col.display_day}</div>
              <div style="font-size: 0.52rem; font-weight: 700; opacity: 0.85;">${col.day_name.slice(0,3)}</div>
              <div style="position:absolute; bottom: 2px; left:50%; transform:translateX(-50%);
                          width: 5px; height: 5px; background: var(--status-late); border-radius: 50%;"></div>
            </th>
          `;
        } else {
          headHtml += `
            <th style="min-width: 28px; max-width: 38px; padding: 0.15rem 0.1rem; background: ${bg}; color: ${fg};" title="${col.display_title}">
              <div style="font-size: 0.68rem; font-weight: 800; font-family: var(--font-family-mono);">${col.display_day}</div>
              <div style="font-size: 0.52rem; font-weight: 600; opacity: 0.75;">${col.day_name.slice(0,3)}</div>
              ${eventTag}
            </th>
          `;
        }
      });

      // Sub-headers for Attendance Breakdowns
      if (showSummaryColumns) {
        headHtml += `
          <th class="sticky-r-1" style="background: var(--col-att-mo-bg); color: var(--col-att-mo-color); font-size: 0.6rem; padding: 0.15rem;" title="Attended in current month">Mo</th>
          <th class="sticky-r-2" style="background: var(--col-att-pr-bg); color: var(--col-att-pr-color); font-size: 0.6rem; padding: 0.15rem;" title="Attended prior to this month">Pr</th>
          <th class="sticky-r-3" style="background: var(--col-att-tt-bg); color: var(--col-att-tt-color); font-size: 0.62rem; font-weight: 900; padding: 0.15rem;" title="Total attended in session">Tt</th>
          <th class="sticky-r-4" style="background: var(--col-abs-mo-bg); color: var(--col-abs-mo-color); font-size: 0.6rem; padding: 0.15rem;" title="Absent in current month">Mo</th>
          <th class="sticky-r-5" style="background: var(--col-abs-pr-bg); color: var(--col-abs-pr-color); font-size: 0.6rem; padding: 0.15rem;" title="Absent prior to this month">Pr</th>
          <th class="sticky-r-6" style="background: var(--col-abs-tt-bg); color: var(--col-abs-tt-color); font-size: 0.62rem; font-weight: 900; padding: 0.15rem;" title="Total absent in session">Tt</th>
        `;
      }
      headHtml += `</tr>`;
      thead.innerHTML = headHtml;


      // 2. IDENTIFY SUNDAYS/HOLIDAYS WITH NO CLASS HELD (FOR FULL-HEIGHT VERTICAL SPAN)
      const nonInstructionalSpans = new Set();
      daysToShow.forEach(d => {
        if (d.is_holiday) {
          const hasAnyRecord = gridData.students.some(st => Boolean(st.attendance_marks?.[d.date]));
          if (!hasAnyRecord) {
            nonInstructionalSpans.add(d.date);
          }
        }
      });

      // 3. BUILD TBODY WITH ACCURATE PEN MARKS & TALL COLUMNS
      const totalStudents = gridData.students.length;
      tbody.innerHTML = gridData.students.map((st, sIdx) => {
        const isTransferred = st.enrollment_status === 'TRANSFERRED';
        const isDropped = st.enrollment_status === 'DROPPED';
        const rowClass = isTransferred ? 'row-transferred' : (isDropped ? 'row-dropped' : '');

        let cellsHtml = '';
        matrixCols.forEach(col => {
          if (nonInstructionalSpans.has(col.date)) {
            // Render the tall vertical holiday banner on row 0 only!
            if (sIdx === 0) {
              const labelWords = (col.holiday_label || 'HOLIDAY').split(' ');
              const formattedLabel = labelWords.map(w => w.split('').join(' ')).join('   ');
              cellsHtml += `
                <td rowspan="${totalStudents}" class="vertical-holiday-cell" title="${col.holiday_label} (${col.date})">
                  <div class="vertical-holiday-text">
                    <span class="vertical-arrow-cap">↑</span>
                    <span>${formattedLabel}</span>
                    <span class="vertical-arrow-cap">↓</span>
                  </div>
                </td>
              `;
            }
            // Other rows skip this cell because of rowspan
            return;
          }

          // Regular lecture cell with digital pen interaction
          let mark = null;
          if (col.session_key && st.attendance_marks?.[col.session_key]) {
            mark = st.attendance_marks[col.session_key];
          } else if (col.col_key && st.attendance_marks?.[col.col_key]) {
            mark = st.attendance_marks[col.col_key];
          } else if (st.attendance_marks?.[col.date]) {
            mark = st.attendance_marks[col.date];
          }

          let penClass = 'empty';
          let penChar = '·';
          if (mark === 'PRESENT') { penClass = 'p'; penChar = 'P'; }
          else if (mark === 'ABSENT') { penClass = 'a'; penChar = 'A'; }
          else if (mark === 'LATE') { penClass = 'l'; penChar = 'L'; }

          if (isTransferred) {
            cellsHtml += `<td style="color: var(--text-muted); font-size: 0.7rem;${col.date === todayStr ? ' background: var(--color-primary-light);' : ''}">—</td>`;
          } else {
            const isTodayCell = col.date === todayStr;
            cellsHtml += `
              <td style="padding: 2px;${isTodayCell ? ' background: var(--color-primary-light); border-left: 2px solid var(--color-primary) !important; border-right: 2px solid var(--color-primary) !important;' : ''}">
                <span class="pen-mark ${penClass}" 
                      onclick="toggleDigitalPen('${col.date}', ${st.student_id}, this, ${col.period_number}, ${col.session_id || 'null'})"
                      title="${st.full_name} on ${col.date} (Period ${col.period_number}): ${mark || 'Unmarked'}. Click to toggle: P → A → L → Clear">
                  ${penChar}
                </span>
              </td>
            `;
          }
        });

        // Summary columns
        let summaryHtml = '';
        if (showSummaryColumns) {
          const isDefaulter = st.is_defaulter;
          const pctColor = isDefaulter ? 'var(--status-absent)' : 'var(--status-present)';
          const pctBg = isDefaulter ? 'var(--status-absent-bg)' : 'var(--status-present-bg)';
          summaryHtml = `
            <td class="sticky-r-1" style="font-weight: 700; color: var(--col-att-mo-color); background: var(--col-att-mo-bg);">${st.month_attended}</td>
            <td class="sticky-r-2" style="color: var(--col-att-pr-color); background: var(--col-att-pr-bg);">${st.prev_attended}</td>
            <td class="sticky-r-3" style="font-weight: 900; color: var(--col-att-tt-color); background: var(--col-att-tt-bg);">${st.total_attended}</td>
            <td class="sticky-r-4" style="font-weight: 700; color: var(--col-abs-mo-color); background: var(--col-abs-mo-bg);">${st.month_absent}</td>
            <td class="sticky-r-5" style="color: var(--col-abs-pr-color); background: var(--col-abs-pr-bg);">${st.prev_absent}</td>
            <td class="sticky-r-6" style="font-weight: 900; color: var(--col-abs-tt-color); background: var(--col-abs-tt-bg);">${st.total_absent}</td>
            <td class="sticky-r-7" style="font-weight: 900; color: ${pctColor}; background: ${pctBg}; letter-spacing: -0.02em;">
              ${st.percentage}%
            </td>
            <td class="sticky-r-8" style="padding: 2px 3px; background: var(--table-stripe-bg); text-align: center;">
              ${(() => {
                let badgeClass = 'regular';
                let badgeLabel = 'Regular';
                const status = st.enrollment_status || 'ENROLLED';
                if (isTransferred) {
                  badgeClass = 'transferred';
                  badgeLabel = 'Xfer';
                } else if (isDropped) {
                  badgeClass = 'dropped';
                  badgeLabel = 'Drop';
                } else {
                  const pct = parseFloat(st.percentage);
                  if (pct >= 75) {
                    badgeClass = 'regular';
                    badgeLabel = 'Regular';
                  } else if (pct >= 65) {
                    badgeClass = 'short';
                    badgeLabel = 'Short';
                  } else {
                    badgeClass = 'defaulter';
                    badgeLabel = 'Defaulter';
                  }
                }
                const safeName = (st.full_name || '').replace(/'/g, "\\'");
                return `
                  <div class="remark-cell-wrap">
                    <button type="button" class="remark-badge ${badgeClass}"
                            onclick="openRemarkMenu(event, ${st.student_id}, '${status}', '${safeName}')"
                            title="Status: ${badgeLabel}. Click to change student status">
                      <span class="remark-dot"></span>
                      <span class="remark-text">${badgeLabel}</span>
                      <span class="remark-arrow">▾</span>
                    </button>
                  </div>
                `;
              })()}
            </td>
          `;
        }

        const rollBadge = isTransferred ? `<span class="badge-transferred" title="Transferred Student">T</span>` : '';
        const cleanRoll = String(st.class_roll_no != null && String(st.class_roll_no) !== 'null' ? st.class_roll_no : (st.roll_number ? st.roll_number : (sIdx + 1))).replace(/^#/, '');
        const idSubtitle = `${st.registration_no ? `<span style="font-weight: 600; color: var(--text-main);">${escapeHtml(st.registration_no)}</span> • ` : ''}${escapeHtml(st.official_enrollment_no || '—')}`;
        const nameContent = isTransferred ? `
          <div style="text-decoration: line-through; color: var(--status-absent); font-weight: 700; font-size: 0.74rem; line-height: 1.2; white-space: nowrap;">${escapeHtml(st.full_name)}</div>
          <div style="font-size: 0.58rem; color: var(--status-absent); border-top: 1px solid var(--border-color); margin-top: 2px; padding-top: 2px; white-space: nowrap;">TRANSFERRED</div>
        ` : `
          <div style="font-weight: 700; color: var(--text-main); font-size: 0.74rem; line-height: 1.2; white-space: nowrap;">${escapeHtml(st.full_name)}</div>
          <div style="font-size: 0.6rem; color: var(--text-muted); font-family: var(--font-family-mono);
                      border-top: 1px solid var(--border-color); margin-top: 2px; padding-top: 2px;
                      letter-spacing: 0.01em; white-space: nowrap;" title="UBTER Reg: ${escapeHtml(st.registration_no || '—')} | Enroll: ${escapeHtml(st.official_enrollment_no || '—')}">${idSubtitle}</div>
        `;

        return `
          <tr class="${rowClass}">
            <td class="sticky-col-1" style="text-align: center; font-weight: 800; background: var(--table-sticky-bg); color: var(--text-main); font-size: 0.72rem; padding: 0.2rem;">
              ${rollBadge}${cleanRoll}
            </td>
            <td class="sticky-col-2" style="background: var(--table-sticky-bg); color: var(--text-main); padding: 0.2rem 0.45rem; width: 148px; min-width: 148px; max-width: 170px;" title="${escapeHtml(st.full_name)} (${st.registration_no ? 'UBTER: ' + st.registration_no + ' • ' : ''}${st.official_enrollment_no || ''})">
              ${nameContent}
            </td>
            ${cellsHtml}
            ${summaryHtml}
          </tr>
        `;
      }).join('');

      // 4. BUILD TFOOT DAILY PRESENT & ABSENT TOTALS
      if (tfoot) {
        let footP = `
          <tr>
            <th class="sticky-col-1"></th>
            <th class="sticky-col-2" style="font-size: 0.68rem; color: var(--status-present); font-weight: 800; text-align: left; padding: 0.2rem 0.45rem; width: 148px; min-width: 148px; max-width: 170px; line-height: 1.1; background: var(--table-sticky-th-bg);" title="Total Present (P)">
              Total Present (P)
            </th>
        `;
        let footA = `
          <tr>
            <th class="sticky-col-1"></th>
            <th class="sticky-col-2" style="font-size: 0.68rem; color: var(--status-absent); font-weight: 800; text-align: left; padding: 0.2rem 0.45rem; width: 148px; min-width: 148px; max-width: 170px; line-height: 1.1; background: var(--table-sticky-th-bg);" title="Total Absent (A)">
              Total Absent (A)
            </th>
        `;

        let totalMonthP = 0;
        let totalMonthA = 0;

        matrixCols.forEach(col => {
          if (nonInstructionalSpans.has(col.date)) {
            footP += `<td class="vertical-holiday-cell" style="font-size: 0.7rem; color: var(--col-holiday-color);">—</td>`;
            footA += `<td class="vertical-holiday-cell" style="font-size: 0.7rem; color: var(--col-holiday-color);">—</td>`;
            return;
          }

          const daily = (col.session_key && gridData.daily_totals?.[col.session_key]) ||
                        (col.col_key && gridData.daily_totals?.[col.col_key]) ||
                        gridData.daily_totals?.[col.date];
          if (daily) {
            footP += `<td style="font-weight: 900; color: var(--status-present); font-size: 0.75rem;">P: ${daily.present}</td>`;
            footA += `<td style="font-weight: 900; color: var(--status-absent); font-size: 0.75rem;">A: ${daily.absent}</td>`;
            totalMonthP += daily.present;
            totalMonthA += daily.absent;
          } else {
            footP += `<td style="color: var(--text-muted); font-size: 0.75rem;">—</td>`;
            footA += `<td style="color: var(--text-muted); font-size: 0.75rem;">—</td>`;
          }
        });

        if (showSummaryColumns) {
          footP += `
            <td class="sticky-r-1" style="font-weight: 900; color: var(--col-att-mo-color); background: var(--col-att-mo-bg);">${totalMonthP}</td>
            <td class="sticky-r-2" style="color: var(--text-muted);">—</td>
            <td class="sticky-r-3" style="font-weight: 900; color: var(--col-att-tt-color); background: var(--col-att-tt-bg);">—</td>
            <td class="sticky-r-4" style="color: var(--text-muted);">—</td>
            <td class="sticky-r-5" style="color: var(--text-muted);">—</td>
            <td class="sticky-r-6" style="color: var(--text-muted);">—</td>
            <td class="sticky-r-7"></td>
            <td class="sticky-r-8"></td>
          `;
          footA += `
            <td class="sticky-r-1" style="color: var(--text-muted);">—</td>
            <td class="sticky-r-2" style="color: var(--text-muted);">—</td>
            <td class="sticky-r-3" style="color: var(--text-muted);">—</td>
            <td class="sticky-r-4" style="font-weight: 900; color: var(--col-abs-mo-color); background: var(--col-abs-mo-bg);">${totalMonthA}</td>
            <td class="sticky-r-5" style="color: var(--text-muted);">—</td>
            <td class="sticky-r-6" style="font-weight: 900; color: var(--col-abs-tt-color); background: var(--col-abs-tt-bg);">—</td>
            <td class="sticky-r-7"></td>
            <td class="sticky-r-8"></td>
          `;
        }

        footP += `</tr>`;
        footA += `</tr>`;
        tfoot.innerHTML = footP + footA;
      }

      // AUTO-SCROLL to today's date column (positioned just before the sticky summary)
      setTimeout(() => {
        const wrapper = document.getElementById('matrix-scroll-wrapper');
        const todayTh = thead.querySelector('th[data-today="true"]');
        if (wrapper && todayTh) {
          // Total width of sticky-right summary panel (r1..r8 + some breathing room)
          const stickyRightWidth = 314 + 10;
          // Scroll so today's col is at the right edge minus the sticky summary
          const thLeft = todayTh.offsetLeft;
          const thWidth = todayTh.offsetWidth;
          const target = thLeft - (wrapper.clientWidth - stickyRightWidth - thWidth - 6);
          wrapper.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
        }
      }, 50);

      // 5. RENDER ACADEMIC EVENTS LEDGER
      const eventsContainer = document.getElementById('academic-events-list');
      if (eventsContainer) {
        const events = gridData.academic_events || [];
        if (!events.length) {
          eventsContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem;">No class tests or assignments scheduled for ${monthTitle}.</div>`;
        } else {
          eventsContainer.innerHTML = events.map(ev => `
            <div class="timeline-event-item">
              <div>
                <strong style="color: var(--text-main);">${ev.title}</strong>
                <span style="margin-left: 6px; font-size: 0.75rem; color: var(--text-muted);">(Date: ${ev.date})</span>
              </div>
              <span class="badge ${ev.type === 'EXAM' ? 'badge-late' : 'badge-present'}" style="font-size: 0.7rem;">
                ${ev.type === 'EXAM' ? 'Max Marks: ' + ev.max_marks : 'Assignment'}
              </span>
            </div>
          `).join('');
        }
      }
    }

    // ─── DIGITAL PEN MARK TOGGLE (SUPPORTS MULTI-PERIOD SESSIONS) ───
    async function toggleDigitalPen(date, studentId, el, periodNumber, sessionId) {
      const currentMark = el.innerText.trim();
      let nextStatus = 'PRESENT';
      if (currentMark === 'P') nextStatus = 'ABSENT';
      else if (currentMark === 'A') nextStatus = 'LATE';
      else if (currentMark === 'L') nextStatus = 'CLEAR';
      else nextStatus = 'PRESENT';

      // Immediate optimistic visual update
      el.className = 'pen-mark ' + (nextStatus === 'CLEAR' ? 'empty' : nextStatus.toLowerCase());
      el.innerText = nextStatus === 'CLEAR' ? '·' : (nextStatus === 'PRESENT' ? 'P' : (nextStatus === 'ABSENT' ? 'A' : 'L'));

      try {
        const payload = {
          date,
          student_id: studentId,
          status: nextStatus
        };
        if (periodNumber) payload.period_number = periodNumber;
        if (sessionId) payload.session_id = sessionId;

        const res = await fetchApi(`/faculty/registers/${currentRegisterId}/mark-cell`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        if (res.success) {
          const st = gridData.students.find(s => s.student_id === studentId);
          if (st) {
            const markKey = periodNumber && periodNumber > 1 ? `${date}_${periodNumber}` : date;
            if (nextStatus === 'CLEAR') {
              delete st.attendance_marks[markKey];
              if (sessionId) delete st.attendance_marks[`sess_${sessionId}`];
            } else {
              st.attendance_marks[markKey] = nextStatus;
              if (sessionId) st.attendance_marks[`sess_${sessionId}`] = nextStatus;
            }
          }
          if (res.data.daily_totals) {
            if (!gridData.daily_totals) gridData.daily_totals = {};
            gridData.daily_totals[date] = res.data.daily_totals;
          }
          // Quietly recompute totals & refresh footer counts
          loadRegisterDetail(currentSelectedMonth);
        } else {
          showToast(res.error?.message || 'Could not update mark', 'error');
          loadRegisterDetail(currentSelectedMonth);
        }
      } catch (err) {
        showToast('Error updating attendance mark', 'error');
        loadRegisterDetail(currentSelectedMonth);
      }
    }

    async function changeStudentStatus(studentId, newStatus) {
      try {
        const res = await fetchApi(`/faculty/registers/${currentRegisterId}/student-status`, {
          method: 'PUT',
          body: JSON.stringify({ student_id: studentId, status: newStatus })
        });
        if (res.success) {
          showToast(`Student status updated to ${newStatus}`, 'success');
          loadRegisterDetail(currentSelectedMonth);
        } else {
          showToast(res.error?.message || 'Could not update student status', 'error');
        }
      } catch (err) {
        showToast('Error updating status', 'error');
      }
    }

    function renderSessionsList() {
      const tbody = document.getElementById('sessions-table-body');
      if (!sessionsList.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No sessions recorded in this register yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = sessionsList.map(s => `
        <tr>
          <td style="font-weight: 700; font-family: var(--font-family-mono);">${s.session_date}</td>
          <td>
            <div style="font-weight: 600;">${s.label || 'Class Session'}</div>
            <span class="badge badge-sem" style="font-size: 0.68rem; margin-top: 2px;">Period ${s.period_number || 1}</span>
          </td>
          <td><span class="badge badge-late" style="font-size: 0.75rem;">${s.session_type}</span></td>
          <td>
            <span class="badge ${s.state === 'FINALIZED' ? 'badge-present' : (s.state === 'OPEN' ? 'badge-pending' : 'badge-absent')}">
              ${s.state}
            </span>
          </td>
          <td style="text-align: center; font-weight: 600;">${gridData?.students?.length || 0}</td>
          <td style="text-align: right;">
            ${s.state !== 'FINALIZED' ? `
              <button class="btn btn-success btn-sm" onclick="finalizeSession(${s.id})">Finalize</button>
            ` : `<span style="color:var(--status-present); font-size:0.8rem; font-weight:700; display:inline-flex; align-items:center; gap:0.25rem;">${window.getSvgIcon('check', 14)}<span>Saved to Register</span></span>`}
          </td>
        </tr>
      `).join('');
    }

    async function finalizeSession(sessionId) {
      if (!confirm('Finalize this class attendance session and lock it into the register?')) return;
      try {
        const res = await fetchApi(`/attendance/sessions/${sessionId}/state`, {
          method: 'PUT',
          body: JSON.stringify({ state: 'FINALIZED' })
        });
        if (res.success) {
          showToast('Session finalized and locked into register!', 'success');
          loadRegisterDetail();
        }
      } catch (err) {}
    }

    function switchRegisterSubView(view) {
      document.getElementById('subview-grid-container').style.display = view === 'grid' ? 'block' : 'none';
      document.getElementById('subview-sessions-container').style.display = view === 'sessions' ? 'block' : 'none';
      document.getElementById('btn-view-grid').classList.toggle('active', view === 'grid');
      document.getElementById('btn-view-sessions').classList.toggle('active', view === 'sessions');
    }

    // ─── MANUAL SESSIONS & ROLL CALL ───
    function openAddSessionModal() {
      document.getElementById('sess-date').value = todayStr;
      document.getElementById('sess-label').value = `Class ${sessionsList.length + 1}`;
      if (document.getElementById('sess-period')) {
        document.getElementById('sess-period').value = '1';
      }
      document.getElementById('add-session-modal').classList.add('open');
    }

    async function createManualSession(e) {
      e.preventDefault();
      const session_date = document.getElementById('sess-date').value;
      const label = document.getElementById('sess-label').value.trim();
      const session_type = document.getElementById('sess-type').value;
      const period_number = parseInt(document.getElementById('sess-period')?.value) || 1;

      try {
        const res = await fetchApi(`/faculty/registers/${currentRegisterId}/sessions`, {
          method: 'POST',
          body: JSON.stringify({ session_date, label, session_type, period_number })
        });
        if (res.success) {
          showToast('Class record added for date!', 'success');
          closeModal('add-session-modal');
          loadRegisterDetail();
        }
      } catch (err) {}
    }

    // ─── ROLL CALL STUDIO (DYNAMIC QR + PIN TOGETHER & MANUAL ROSTER) ───
    let currentRollCallMode = 'live';
    let currentRollCallSession = null;
    let rollCallClaimsPollTimer = null;
    let rollCallExpiryTimer = null;
    let activePinCode = null;
    let activeQrToken = null;
    let isLiveSessionStarted = false;

    async function openQuickMarkModal() {
      const students = gridData?.students || [];
      if (!students.length) {
        showToast('No students enrolled in this cohort.', 'error');
        return;
      }
      
      const date = document.getElementById('sync-date')?.value || todayStr;
      const subName = registerData?.subject_name || 'Register Cohort';
      const semLabel = registerData ? `Year ${registerData.year} / Sem ${registerData.semester}` : '';
      
      const subjElem = document.getElementById('rc-modal-subject');
      const dateElem = document.getElementById('rc-modal-date');
      if (subjElem) subjElem.innerText = `${subName} (${semLabel})`;
      if (dateElem) dateElem.innerText = date;
      
      manualAbsentSet.clear();
      document.getElementById('manual-roll-modal').classList.add('open');
      await switchRollCallMode('live');
    }

    function closeRollCallModal() {
      if (rollCallClaimsPollTimer) {
        clearInterval(rollCallClaimsPollTimer);
        rollCallClaimsPollTimer = null;
      }
      if (rollCallExpiryTimer) {
        clearInterval(rollCallExpiryTimer);
        rollCallExpiryTimer = null;
      }
      document.getElementById('manual-roll-modal').classList.remove('open');
    }

    async function switchRollCallMode(mode) {
      currentRollCallMode = mode;
      
      // Update tab buttons
      const tabLive = document.getElementById('rc-tab-btn-live');
      const tabManual = document.getElementById('rc-tab-btn-manual');
      if (tabLive) tabLive.classList.toggle('active', mode === 'live');
      if (tabManual) tabManual.classList.toggle('active', mode === 'manual');
      
      // Update subviews
      const viewLive = document.getElementById('rc-view-live');
      const viewManual = document.getElementById('rc-view-manual');
      if (viewLive) viewLive.style.display = mode === 'live' ? 'block' : 'none';
      if (viewManual) viewManual.style.display = mode === 'manual' ? 'block' : 'none';

      // Update fixed footers
      const footerLive = document.getElementById('rc-footer-live');
      const footerManual = document.getElementById('rc-footer-manual');
      if (footerLive) footerLive.style.display = mode === 'live' ? 'flex' : 'none';
      if (footerManual) footerManual.style.display = mode === 'manual' ? 'flex' : 'none';
      
      if (mode === 'live') {
        renderLiveAttendanceState();
        if (isLiveSessionStarted && currentRollCallSession) {
          startClaimsPolling(currentRollCallSession.id);
        }
      } else {
        renderQuickRoster();
      }
    }

    function renderLiveAttendanceState() {
      const banner = document.getElementById('rc-live-starter-banner');
      const activeCont = document.getElementById('rc-live-active-container');
      
      if (!isLiveSessionStarted) {
        if (banner) banner.style.display = 'block';
        if (activeCont) activeCont.style.display = 'none';
      } else {
        if (banner) banner.style.display = 'none';
        if (activeCont) activeCont.style.display = 'block';
      }
    }

    async function startLiveAttendanceSession() {
      const btn = document.getElementById('btn-generate-live-session');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = window.getSvgIcon('clock', 15) + '<span>Generating Session...</span>';
      }
      try {
        const sess = await ensureActiveRollCallSession();
        if (!sess) {
          showToast('Unable to open live class session', 'error');
          return;
        }
        await Promise.all([
          generateNewQr(false),
          generateNewPin(false)
        ]);
        isLiveSessionStarted = true;
        renderLiveAttendanceState();
        startClaimsPolling(sess.id);
        showToast('Dynamic QR & 6-Digit PIN generated successfully!', 'success');
      } catch (err) {
        showToast('Failed to start live session: ' + err.message, 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = window.getSvgIcon('zap', 15) + '<span>Generate QR & PIN to Begin</span>';
        }
      }
    }

    async function regenerateLiveAttendanceSession() {
      const btn = document.getElementById('btn-refresh-live-session');
      const origHtml = btn ? btn.innerHTML : (window.getSvgIcon('refresh', 13) + '<span>Refresh</span>');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = window.getSvgIcon('clock', 13) + '<span>Refreshing...</span>';
      }
      try {
        await Promise.all([
          generateNewQr(false),
          generateNewPin(false)
        ]);
        showToast('QR Code & 6-Digit PIN refreshed!', 'success');
      } catch (err) {
        showToast('Failed to refresh session: ' + err.message, 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origHtml;
        }
      }
    }

    async function ensureActiveRollCallSession() {
      if (!currentRegisterId) return null;
      const date = document.getElementById('sync-date')?.value || todayStr;
      const periodNum = parseInt(document.getElementById('rc-modal-period')?.value) || 1;
      
      let sess = sessionsList?.find(s => s.session_date === date && ((s.period_number || 1) === periodNum));
      if (!sess) {
        try {
          const res = await fetchApi(`/faculty/registers/${currentRegisterId}/sessions`, {
            method: 'POST',
            body: JSON.stringify({
              session_date: date,
              session_type: registerData?.session_type_scope || 'THEORY',
              label: `Class ${(sessionsList?.length || 0) + 1} (Period ${periodNum})`,
              period_number: periodNum
            })
          });
          if (res.success && res.data) {
            sess = res.data;
            if (sessionsList) sessionsList.push(sess);
          }
        } catch (err) {
          console.warn('Could not auto-create session:', err);
        }
      }
      
      if (sess && sess.state === 'DRAFT') {
        try {
          await fetchApi(`/attendance/sessions/${sess.id}/state`, {
            method: 'PUT',
            body: JSON.stringify({ state: 'OPEN' })
          });
          sess.state = 'OPEN';
        } catch (e) {}
      }
      
      currentRollCallSession = sess;
      return sess;
    }

    window.onRollCallPeriodChange = async function() {
      currentRollCallSession = null;
      isLiveSessionStarted = false;
      if (rollCallClaimsPollTimer) {
        clearInterval(rollCallClaimsPollTimer);
        rollCallClaimsPollTimer = null;
      }
      if (rollCallExpiryTimer) {
        clearInterval(rollCallExpiryTimer);
        rollCallExpiryTimer = null;
      }
      renderLiveAttendanceState();
      if (currentRollCallMode === 'manual') {
        renderQuickRoster();
      }
    };

    async function initLiveAttendanceTogether() {
      // Legacy compatibility stub
      renderLiveAttendanceState();
    }

    function renderQuickRoster() {
      const grid = document.getElementById('quick-roster-grid');
      if (!grid) return;
      const students = gridData?.students || [];
      grid.innerHTML = students.map(st => {
        const isAbsent = manualAbsentSet.has(st.student_id);
        const rollDisplay = (st.class_roll_no != null && String(st.class_roll_no) !== 'null') ? String(st.class_roll_no).replace(/^#/, '') : '—';
        const cardTitle = `${st.full_name}${st.registration_no ? ' • UBTER: ' + st.registration_no : ''}${st.official_enrollment_no ? ' • ' + st.official_enrollment_no : ''}`;
        return `
          <div onclick="toggleManualAbsent(${st.student_id})" title="${escapeHtml(cardTitle)}" style="
            border: 2px solid ${isAbsent ? 'var(--status-absent)' : 'var(--status-present)'};
            background: ${isAbsent ? 'var(--status-absent-bg)' : 'var(--status-present-bg)'};
            padding: 0.65rem 0.45rem;
            border-radius: var(--radius-md);
            cursor: pointer;
            text-align: center;
            user-select: none;
            transition: transform 0.1s ease, box-shadow 0.1s ease;
          ">
            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">Roll ${rollDisplay}</div>
            <div style="font-weight: 700; font-size: 0.84rem; margin: 0.15rem 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(st.full_name.split(' ')[0])}</div>
            ${st.registration_no ? `<div style="font-size: 0.62rem; color: var(--text-muted); font-family: var(--font-family-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(st.registration_no)}</div>` : ''}
            <div style="font-size: 0.7rem; font-weight: 800; color: ${isAbsent ? 'var(--status-absent)' : 'var(--status-present)'}; margin-top: 0.15rem;">
              ${isAbsent ? 'ABSENT' : 'PRESENT'}
            </div>
          </div>
        `;
      }).join('');

      const total = students.length;
      const absent = manualAbsentSet.size;
      const pCount = document.getElementById('q-present-count');
      const aCount = document.getElementById('q-absent-count');
      const tCount = document.getElementById('q-total-count');
      if (pCount) pCount.innerText = total - absent;
      if (aCount) aCount.innerText = absent;
      if (tCount) tCount.innerText = total;
    }

    function toggleManualAbsent(studentId) {
      if (manualAbsentSet.has(studentId)) {
        manualAbsentSet.delete(studentId);
      } else {
        manualAbsentSet.add(studentId);
      }
      renderQuickRoster();
    }

    function markAllManual(isAbsent) {
      manualAbsentSet.clear();
      if (isAbsent) {
        (gridData?.students || []).forEach(st => manualAbsentSet.add(st.student_id));
      }
      renderQuickRoster();
    }

    async function submitManualAttendance() {
      const date = document.getElementById('sync-date')?.value || todayStr;
      const students = gridData?.students || [];
      const presentIds = students.filter(st => !manualAbsentSet.has(st.student_id)).map(st => st.student_id);

      const btn = document.getElementById('btn-save-manual-rc');
      if (btn) btn.disabled = true;

      try {
        const res = await fetchApi(`/attendance/registers/${currentRegisterId}/confirm-day-attendance`, {
          method: 'POST',
          body: JSON.stringify({
            date,
            student_ids: presentIds
          })
        });
        if (res.success) {
          showToast(`Saved attendance for ${presentIds.length} present of ${students.length} students on ${date}!`, 'success');
          closeRollCallModal();
          loadRegisterDetail();
        }
      } catch (err) {
        showToast('Failed to save attendance: ' + err.message, 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    // ─── DYNAMIC QR CODE METHODS ───
    async function generateNewQr(showSuccessToast = true) {
      const sess = await ensureActiveRollCallSession();
      if (!sess) return;
      try {
        const res = await fetchApi(`/attendance/sessions/${sess.id}/qr`, { method: 'POST' });
        if (res.success && res.data) {
          const { token_hash, expires_at, payload } = res.data;
          activeQrToken = token_hash;
          const tokenDisplay = document.getElementById('rc-qr-token-display');
          if (tokenDisplay) {
            tokenDisplay.innerText = token_hash ? `${token_hash.slice(0, 10)}...${token_hash.slice(-6)}` : '—';
            tokenDisplay.title = token_hash || '';
          }
          
          // Render QR code
          const encoded = encodeURIComponent(payload);
          const qrImg = document.getElementById('rc-qr-code-img');
          if (qrImg) {
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}&margin=6`;
          }
          
          startCountdownTimer(expires_at, 'rc-expiry-timer');
          if (showSuccessToast) showToast('Dynamic QR code refreshed!', 'success');
        }
      } catch (err) {
        showToast('Failed to generate dynamic QR: ' + err.message, 'error');
      }
    }

    function copyQrToken() {
      if (!activeQrToken) return;
      navigator.clipboard.writeText(activeQrToken).then(() => {
        showToast('QR Token copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Token: ' + activeQrToken, 'info');
      });
    }

    // ─── 6-DIGIT PIN METHODS ───
    async function generateNewPin(showSuccessToast = true) {
      const sess = await ensureActiveRollCallSession();
      if (!sess) return;
      try {
        const res = await fetchApi(`/attendance/sessions/${sess.id}/pin`, { method: 'POST' });
        if (res.success && res.data) {
          const { pin, expires_at } = res.data;
          activePinCode = pin;
          renderPinBoxes(pin);
          startCountdownTimer(expires_at, 'rc-expiry-timer');
          if (showSuccessToast) showToast(`Generated 6-Digit PIN: ${pin}`, 'success');
        }
      } catch (err) {
        showToast('Failed to generate 6-digit PIN: ' + err.message, 'error');
      }
    }

    function renderPinBoxes(pin) {
      const container = document.getElementById('pin-digits-container');
      if (container) {
        const digits = String(pin || '000000').padStart(6, '0').split('');
        container.innerHTML = digits.map(d => `<span class="pin-digit-box">${d}</span>`).join('');
      }
      const qrPinElem = document.getElementById('rc-qr-pin-display');
      if (qrPinElem) {
        qrPinElem.innerText = pin ? `PIN: ${pin}` : 'PIN: —';
        qrPinElem.title = pin ? `6-Digit Session PIN: ${pin}` : '6-Digit Session PIN';
      }
    }

    function copyPinCode() {
      if (!activePinCode) return;
      navigator.clipboard.writeText(activePinCode).then(() => {
        showToast(`PIN Code ${activePinCode} copied!`, 'success');
      }).catch(() => {
        showToast('PIN: ' + activePinCode, 'info');
      });
    }

    // ─── COUNTDOWN TIMER ───
    function startCountdownTimer(expiresAt, elementId) {
      if (rollCallExpiryTimer) clearInterval(rollCallExpiryTimer);
      const targetTime = new Date(expiresAt).getTime();
      
      const updateDisplay = () => {
        const remainingMs = targetTime - Date.now();
        const elem = document.getElementById(elementId);
        if (!elem) return;
        if (remainingMs <= 0) {
          elem.innerText = 'EXPIRED';
          elem.style.color = 'var(--status-absent)';
          clearInterval(rollCallExpiryTimer);
          isLiveSessionStarted = false;
          return;
        }
        elem.style.color = 'var(--color-primary)';
        const totalSec = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        elem.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      };
      
      updateDisplay();
      rollCallExpiryTimer = setInterval(updateDisplay, 1000);
    }

    // ─── CLAIMS POLLING (LIVE QR & PIN TOGETHER) ───
    function startClaimsPolling(sessionId) {
      if (rollCallClaimsPollTimer) clearInterval(rollCallClaimsPollTimer);
      
      const poll = async () => {
        try {
          const res = await fetchApi(`/attendance/sessions/${sessionId}/self-attendance`);
          if (res.success && Array.isArray(res.data)) {
            const count = res.data.length;
            const countElem = document.getElementById('rc-claim-count');
            const rosterElem = document.getElementById('rc-claims-roster');
            const statusElem = document.getElementById('rc-claims-status');
            
            if (countElem) countElem.innerText = count;
            if (statusElem) statusElem.innerText = `${count} student(s) marked attendance`;
            
            if (rosterElem) {
              if (count === 0) {
                rosterElem.innerHTML = `
                  <div style="height: 100%; min-height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); text-align: center; gap: 0.4rem; padding: 1rem;">
                    <div style="color: var(--text-muted); opacity: 0.7; margin-bottom: 0.2rem;">
                      ${window.getSvgIcon('devices', 36)}
                    </div>
                    <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-main);">No check-ins yet</div>
                    <div style="font-size: 0.74rem;">Students scanning the QR code or entering the PIN will appear here live in real-time.</div>
                  </div>
                `;
              } else {
                rosterElem.innerHTML = res.data.map(req => {
                  const rollDisp = req.class_roll_no != null && String(req.class_roll_no) !== 'null' ? `Roll ${String(req.class_roll_no).replace(/^#/, '')}` : '';
                  const isQr = (req.verification_method || '').toUpperCase().includes('QR');
                  const methodIcon = isQr ? window.getSvgIcon('devices', 15) : window.getSvgIcon('key', 15);
                  const methodLabel = isQr ? 'QR Scan' : 'PIN Entry';
                  const timeStr = req.timestamp ? new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now';
                  const idDisp = req.registration_no || req.official_enrollment_no ? ` • ${escapeHtml(req.registration_no || req.official_enrollment_no)}` : '';
                  return `
                    <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.45rem 0.65rem; transition: background 0.2s ease;">
                      <div style="display: flex; align-items: center; gap: 0.55rem; text-align: left;">
                        <span style="font-size: 1rem; display:inline-flex; align-items:center;" title="${methodLabel}">${methodIcon}</span>
                        <div>
                          <div style="font-weight: 700; color: var(--text-main); font-size: 0.82rem; line-height: 1.2;">${rollDisp ? rollDisp + ' • ' : ''}${escapeHtml(req.full_name)}</div>
                          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.1rem;">${methodLabel}${idDisp} • ${timeStr}</div>
                        </div>
                      </div>
                      <span class="badge badge-present" style="font-size: 0.68rem; padding: 0.15rem 0.45rem; font-weight: 700; display:inline-flex; align-items:center; gap:0.25rem;">
                        ${window.getSvgIcon('check', 11)}
                        <span>Present</span>
                      </span>
                    </div>
                  `;
                }).join('');
              }
            }
          }
        } catch (e) {}
      };

      poll();
      rollCallClaimsPollTimer = setInterval(poll, 3500);
    }

    async function finalizeClaimsAttendance(source) {
      const sess = currentRollCallSession;
      const date = document.getElementById('sync-date')?.value || todayStr;
      
      try {
        let claims = [];
        if (sess) {
          const cRes = await fetchApi(`/attendance/sessions/${sess.id}/self-attendance`);
          if (cRes.success) claims = cRes.data || [];
        }
        
        const claimedStudentIds = new Set(claims.map(c => c.student_id));
        const students = gridData?.students || [];
        
        let presentIds = [];
        if (source === 'LIVE') {
          if (claimedStudentIds.size === 0) {
            showToast('No students have checked in via QR or PIN yet.', 'warning');
            return;
          }
          presentIds = Array.from(claimedStudentIds);
        } else {
          // Manual roll call
          presentIds = students
            .filter(st => !manualAbsentSet.has(st.student_id))
            .map(st => st.student_id);
        }

        const res = await fetchApi(`/attendance/registers/${currentRegisterId}/confirm-day-attendance`, {
          method: 'POST',
          body: JSON.stringify({
            date,
            student_ids: presentIds
          })
        });

        if (res.success) {
          showToast(`Successfully confirmed ${presentIds.length} student attendance records for ${date}!`, 'success');
          isLiveSessionStarted = false;
          closeRollCallModal();
          loadRegisterDetail();
        }
      } catch (err) {
        showToast('Error finalizing attendance: ' + err.message, 'error');
      }
    }

    // ─── ESP32 DAY-ATTENDANCE SYNC LOGIC ───
    async function checkEspStatus() {
      const badge = document.getElementById('esp-status-badge');
      if (!badge || !currentRegisterId) return;
      try {
        const date = document.getElementById('sync-date')?.value || todayStr;
        const res = await fetchApi(`/attendance/registers/${currentRegisterId}/esp32-day-scans?date=${date}`);
        if (res.success && res.data) {
          const isOnline = res.data.device?.is_online;
          const scanCount = res.data.scans?.length || 0;
          if (isOnline) {
            badge.innerHTML = `<span class="badge badge-present" style="font-size: 0.68rem; padding: 0.15rem 0.45rem; display: inline-flex; align-items: center; gap: 4px;" title="ESP32 hardware is online & communicating"><span style="width:5px; height:5px; border-radius:50%; background:currentColor;"></span> Online (${scanCount})</span>`;
          } else {
            badge.innerHTML = `<span class="badge badge-pending" style="font-size: 0.68rem; padding: 0.15rem 0.45rem;" title="ESP32 terminal in standby mode">Standby (${scanCount})</span>`;
          }
        } else {
          badge.innerHTML = `<span class="badge badge-pending" style="font-size: 0.68rem; padding: 0.15rem 0.45rem;">Ready</span>`;
        }
      } catch (err) {
        badge.innerHTML = `<span class="badge badge-pending" style="font-size: 0.68rem; padding: 0.15rem 0.45rem;">Ready</span>`;
      }
    }

    async function triggerEspDaySync() {
      if (!currentRegisterId) {
        showToast('Please select a register first', 'error');
        return;
      }
      const syncDate = document.getElementById('sync-date')?.value || todayStr;
      const btn = document.getElementById('btn-esp-sync');
      if (btn) { btn.disabled = true; btn.innerText = 'Syncing...'; }

      try {
        const res = await fetchApi(`/attendance/registers/${currentRegisterId}/esp32-day-scans?date=${syncDate}`);
        if (res.success) {
          currentScansList = res.data?.scans || [];
          const countEl = document.getElementById('esp-scanned-count');
          if (countEl) countEl.innerText = currentScansList.length;

          const desc = document.getElementById('esp-confirm-desc');
          if (desc) {
            desc.innerHTML = `Found <strong>${currentScansList.length}</strong> scan records for <strong>${syncDate}</strong>. Verify students, then click <strong>Confirm & Add to Register</strong>.`;
          }

          const tbody = document.getElementById('esp-scans-tbody');
          if (!currentScansList.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No scans recorded on ${syncDate} for this cohort.</td></tr>`;
          } else {
            tbody.innerHTML = currentScansList.map((s, idx) => `
              <tr>
                <td style="text-align: center;">
                  <input type="checkbox" class="esp-chk" value="${s.student_id}" checked>
                </td>
                <td style="font-weight: 700;">${String(s.class_roll_no || (idx + 1)).replace(/^#/, '')}</td>
                <td style="font-family: var(--font-family-mono); font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(s.registration_no || '—')}</td>
                <td style="font-weight: 600;">${escapeHtml(s.full_name)}</td>
                <td style="font-family: var(--font-family-mono); font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(s.official_enrollment_no || '—')}</td>
                <td style="text-align: right; font-family: var(--font-family-mono); font-size: 0.78rem;">${s.scan_time ? s.scan_time.slice(11, 19) : '—'}</td>
              </tr>
            `).join('');
          }

          document.getElementById('esp-confirm-modal').classList.add('open');
        } else {
          showToast(res.error?.message || 'Failed to fetch ESP scans', 'error');
        }
      } catch (err) {
        showToast('Error syncing ESP scans: ' + err.message, 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = window.getSvgIcon('zap', 13) + '<span>Sync ESP Scans</span>'; }
      }
    }

    function toggleAllEspCheckboxes(checked) {
      document.querySelectorAll('.esp-chk').forEach(cb => cb.checked = checked);
    }

    async function submitEspConfirmation() {
      const syncDate = document.getElementById('sync-date')?.value || todayStr;
      const checkedBoxes = Array.from(document.querySelectorAll('.esp-chk:checked'));
      const studentIds = checkedBoxes.map(cb => Number(cb.value));

      const btn = document.getElementById('btn-confirm-save-esp');
      if (btn) { btn.disabled = true; btn.innerText = 'Saving...'; }

      try {
        const res = await fetchApi(`/attendance/registers/${currentRegisterId}/confirm-day-attendance`, {
          method: 'POST',
          body: JSON.stringify({
            date: syncDate,
            student_ids: studentIds
          })
        });

        if (res.success) {
          showToast(`Successfully confirmed attendance for ${studentIds.length} students on ${syncDate}!`, 'success');
          closeModal('esp-confirm-modal');
          loadRegisterDetail(currentSelectedMonth);
        } else {
          showToast(res.error?.message || 'Could not save attendance', 'error');
        }
      } catch (err) {
        showToast('Failed to confirm attendance: ' + err.message, 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = window.getSvgIcon('check', 14) + '<span>Confirm & Add to Register</span>'; }
      }
    }

    function openCreatePersonalModal() {
      document.getElementById('personal-modal').classList.add('open');
    }

    async function createPersonalRegister(e) {
      e.preventDefault();
      const name = document.getElementById('p-reg-name').value.trim();
      const session_type_scope = document.getElementById('p-reg-scope').value;

      try {
        const res = await fetchApi('/faculty/registers', {
          method: 'POST',
          body: JSON.stringify({ name, session_type_scope })
        });
        if (res.success) {
          showToast('Personal register created!', 'success');
          closeModal('personal-modal');
          loadRegistersList();
        }
      } catch (err) {}
    }

    function openModal(modalId) {
      const el = document.getElementById(modalId);
      if (el) {
        el.classList.add('open');
        const firstInput = el.querySelector('input:not([disabled]), select:not([disabled]), button:not([disabled])');
        if (firstInput) setTimeout(() => firstInput.focus(), 50);
      }
    }

    function closeModal(modalId) {
      const el = document.getElementById(modalId);
      if (el) el.classList.remove('open');
    }

    // Floating Remark Action Popover Management
    let activePopoverStudentId = null;

    function openRemarkMenu(e, studentId, currentStatus, studentName) {
      if (e) e.stopPropagation();
      activePopoverStudentId = studentId;
      const popover = document.getElementById('remark-action-popover');
      if (!popover) return;

      const titleEl = document.getElementById('popover-student-name');
      if (titleEl) titleEl.innerText = studentName || 'Student Status';

      const st = currentStatus || 'ENROLLED';
      ['ENROLLED', 'TRANSFERRED', 'DROPPED'].forEach(s => {
        const el = document.getElementById('check-' + s);
        if (el) el.classList.toggle('active', s === st);
      });

      const rect = e.currentTarget.getBoundingClientRect();
      let top = rect.bottom + 4;
      let left = rect.left - 130;

      if (left + 235 > window.innerWidth - 10) {
        left = window.innerWidth - 245;
      }
      if (left < 10) left = 10;
      if (top + 180 > window.innerHeight - 10) {
        top = rect.top - 175;
      }

      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
      popover.style.display = 'block';
    }

    function closeRemarkMenu() {
      const popover = document.getElementById('remark-action-popover');
      if (popover) popover.style.display = 'none';
      activePopoverStudentId = null;
    }

    async function applyStudentStatus(status) {
      if (!activePopoverStudentId) return;
      const sId = activePopoverStudentId;
      closeRemarkMenu();
      await changeStudentStatus(sId, status);
    }

    document.addEventListener('click', (e) => {
      const popover = document.getElementById('remark-action-popover');
      if (popover && popover.style.display !== 'none' && !popover.contains(e.target)) {
        closeRemarkMenu();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeRemarkMenu();
        document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
      }
    });

    // ══════════════════════════════════════════════════════════════════
    // CONSOLIDATED REGISTER TABS: COURSEWORK & TEST MARKS LOGIC
    // ══════════════════════════════════════════════════════════════════
    let currentActiveTab = 'matrix'; // 'matrix' | 'assignments' | 'exams'

    function switchRegisterTab(tabName) {
      if (tabName === 'marks') tabName = 'exams'; // Normalize marks alias
      if (!['matrix', 'assignments', 'exams'].includes(tabName)) tabName = 'matrix';
      currentActiveTab = tabName;

      // Update Tab Buttons
      const tabMatrix = document.getElementById('tab-btn-matrix');
      const tabAssign = document.getElementById('tab-btn-assignments');
      const tabExams = document.getElementById('tab-btn-exams');

      if (tabMatrix) {
        tabMatrix.classList.toggle('active', tabName === 'matrix');
        tabMatrix.setAttribute('aria-selected', tabName === 'matrix');
      }
      if (tabAssign) {
        tabAssign.classList.toggle('active', tabName === 'assignments');
        tabAssign.setAttribute('aria-selected', tabName === 'assignments');
      }
      if (tabExams) {
        tabExams.classList.toggle('active', tabName === 'exams');
        tabExams.setAttribute('aria-selected', tabName === 'exams');
      }

      // Update Tab Panels
      const pMatrix = document.getElementById('tab-panel-matrix');
      const pAssign = document.getElementById('tab-panel-assignments');
      const pExams = document.getElementById('tab-panel-exams');

      if (pMatrix) pMatrix.style.display = tabName === 'matrix' ? 'block' : 'none';
      if (pAssign) pAssign.style.display = tabName === 'assignments' ? 'block' : 'none';
      if (pExams) pExams.style.display = tabName === 'exams' ? 'block' : 'none';

      // Update Quick Controls in Command Bar
      const mControls = document.getElementById('matrix-quick-controls');
      const aControls = document.getElementById('assignments-quick-controls');
      const eControls = document.getElementById('exams-quick-controls');
      if (mControls) mControls.style.display = tabName === 'matrix' ? 'inline-flex' : 'none';
      if (aControls) aControls.style.display = tabName === 'assignments' ? 'inline-flex' : 'none';
      if (eControls) eControls.style.display = tabName === 'exams' ? 'inline-flex' : 'none';

      // Update URL search params
      const u = new URL(window.location.href);
      if (currentRegisterId) u.searchParams.set('id', currentRegisterId);
      if (tabName === 'matrix') {
        u.searchParams.delete('tab');
      } else {
        u.searchParams.set('tab', tabName);
      }
      window.history.replaceState(null, '', u.toString());

      // Load data for active tab
      if (tabName === 'assignments') {
        loadRegisterAssignments();
      } else if (tabName === 'exams') {
        loadRegisterExams();
      }
    }

    function updateRegisterScopeBadges() {
      if (!registerData) return;
      const subjText = `${registerData.subject_name || registerData.name} ${registerData.subject_code ? '[' + registerData.subject_code + ']' : ''} • Year ${registerData.year || 1} Sem ${registerData.semester || 1}`;
      
      const aBadge = document.getElementById('assign-scope-badge');
      if (aBadge) aBadge.innerText = subjText;
      
      const eBadge = document.getElementById('exam-scope-badge');
      if (eBadge) eBadge.innerText = subjText;

      const aFormSubj = document.getElementById('form-assign-subject-name');
      if (aFormSubj) aFormSubj.innerText = `${registerData.subject_name || registerData.name} (${registerData.department_name || ''})`;

      const eFormSubj = document.getElementById('form-exam-subject-name');
      if (eFormSubj) eFormSubj.innerText = `${registerData.subject_name || registerData.name} (${registerData.department_name || ''})`;
    }

    function getRegisterQueryParams() {
      if (!registerData) return '';
      const params = new URLSearchParams();
      if (registerData.subject_id) params.set('subject_id', registerData.subject_id);
      if (registerData.department_id) params.set('department_id', registerData.department_id);
      if (registerData.branch_id) params.set('branch_id', registerData.branch_id);
      if (registerData.year) params.set('year', registerData.year);
      if (registerData.semester) params.set('semester', registerData.semester);
      if (registerData.academic_year_id) params.set('academic_year_id', registerData.academic_year_id);
      return params.toString();
    }

    async function loadRegisterTabsCount() {
      if (!registerData) return;
      const q = getRegisterQueryParams();
      try {
        const [assignRes, examRes] = await Promise.all([
          fetchApi(`/assignments?${q}`),
          fetchApi(`/exams?${q}`)
        ]);

        const assignCount = (assignRes.success && Array.isArray(assignRes.data)) ? assignRes.data.length : 0;
        const examCount = (examRes.success && Array.isArray(examRes.data)) ? examRes.data.length : 0;

        const bAssign = document.getElementById('badge-assignments-count');
        if (bAssign) bAssign.innerText = assignCount;
        const bExam = document.getElementById('badge-exams-count');
        if (bExam) bExam.innerText = examCount;

        // Populate academic milestones ledger in attendance matrix bottom panel
        const ledgerList = document.getElementById('academic-events-list');
        if (ledgerList) {
          const events = [];
          if (assignRes.success && assignRes.data) {
            assignRes.data.slice(0, 3).forEach(a => {
              const due = a.due_date ? new Date(a.due_date).toLocaleDateString('en-IN') : 'No deadline';
              events.push(`<div style="margin-bottom:0.35rem; display:flex; align-items:center; justify-content:space-between; gap:0.5rem; cursor:pointer;" onclick="switchRegisterTab('assignments')">
                <span style="display:inline-flex; align-items:center; gap:0.35rem;">${window.getSvgIcon('assignment', 14)}<strong>${escapeHtml(a.title)}</strong> (Due: ${due})</span>
                <span class="badge ${a.submission_count > 0 ? 'badge-present' : 'badge-pending'}" style="font-size:0.68rem;">${a.submission_count || 0} Submitted</span>
              </div>`);
            });
          }
          if (examRes.success && examRes.data) {
            examRes.data.slice(0, 3).forEach(e => {
              const dt = e.exam_date ? new Date(e.exam_date).toLocaleDateString('en-IN') : 'TBD';
              events.push(`<div style="margin-bottom:0.35rem; display:flex; align-items:center; justify-content:space-between; gap:0.5rem; cursor:pointer;" onclick="switchRegisterTab('exams')">
                <span style="display:inline-flex; align-items:center; gap:0.35rem;">${window.getSvgIcon('test', 14)}<strong>${escapeHtml(e.name)}</strong> (${dt} • Max ${e.max_marks})</span>
                <span class="badge ${e.scores_entered > 0 ? 'badge-present' : 'badge-pending'}" style="font-size:0.68rem;">${e.scores_entered || 0} Marked</span>
              </div>`);
            });
          }

          if (events.length) {
            ledgerList.innerHTML = events.join('');
          } else {
            ledgerList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem;">No class tests or assignments recorded for this subject register yet.</div>`;
          }
        }
      } catch (err) {
        console.error('Error loading tab counts:', err);
      }
    }

    // ─── REGISTER COURSEWORK / ASSIGNMENTS ───
    let currentRegisterAssignments = [];

    async function loadRegisterAssignments() {
      const container = document.getElementById('register-assignments-list');
      if (!container) return;
      if (!registerData) {
        container.innerHTML = `<div class="card" style="text-align:center; padding:2rem; color:var(--text-muted);">Please select a register first.</div>`;
        return;
      }
      container.innerHTML = `<div class="card" style="text-align:center; padding:2.5rem; color:var(--text-muted);">Loading assignments for ${escapeHtml(registerData.subject_name || 'register')}...</div>`;

      try {
        const q = getRegisterQueryParams();
        const res = await fetchApi(`/assignments?${q}`);
        if (!res.success || !Array.isArray(res.data) || !res.data.length) {
          container.innerHTML = `
            <div class="card" style="text-align:center; padding:3rem 2rem; color:var(--text-muted); background:var(--bg-surface); border:1px dashed var(--border-color);">
              <div style="margin-bottom:0.5rem; color:var(--color-primary); display:flex; justify-content:center;">${window.getSvgIcon('assignment', 40)}</div>
              <h3 style="font-size:1.15rem; font-weight:700; color:var(--text-main); margin-bottom:0.35rem;">No Assignments Created Yet</h3>
              <p style="font-size:0.85rem; max-width:480px; margin:0 auto 1.25rem;">
                No homework or coursework tasks have been published for <strong>${escapeHtml(registerData.subject_name || 'this subject')}</strong>. Click above to create one.
              </p>
              <button type="button" class="btn btn-primary btn-sm" onclick="openCreateAssignmentModal()">+ Create Assignment</button>
            </div>
          `;
          const b = document.getElementById('badge-assignments-count');
          if (b) b.innerText = '0';
          return;
        }

        currentRegisterAssignments = res.data;
        const b = document.getElementById('badge-assignments-count');
        if (b) b.innerText = currentRegisterAssignments.length;

        container.innerHTML = currentRegisterAssignments.map(a => {
          const dueStr = a.due_date ? new Date(a.due_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'No deadline';
          return `
            <div class="item-card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                  <div class="item-title">${escapeHtml(a.title)}</div>
                  <div class="item-meta">
                    ${escapeHtml(a.subject_name || registerData.subject_name || 'Subject')}
                    • <span style="color: var(--status-late); font-weight: 600;">Due: ${dueStr}</span>
                    • Max Marks: <strong>${a.max_marks || 100}</strong>
                  </div>
                  ${a.description ? `<p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.4rem 0 0; line-height: 1.5;">${escapeHtml(a.description)}</p>` : ''}
                </div>
                <div style="text-align: right;">
                  <span class="badge ${a.submission_count > 0 ? 'badge-present' : 'badge-pending'}">
                    ${a.submission_count || 0} / ${a.class_size || 0} Submitted
                  </span>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.85rem; gap: 0.5rem;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="toggleSubmissions(${a.id})">Edit</button>
                <button type="button" class="btn btn-sm" style="color: var(--status-absent); border: 1px solid var(--status-absent-bg); background: var(--status-absent-bg); font-weight: 600;" onclick="openDeleteModal('assignment', ${a.id})">Delete</button>
              </div>
              <div class="expand-panel" id="assign-panel-${a.id}"></div>
            </div>
          `;
        }).join('');
      } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="card" style="color:var(--status-absent); padding:1.5rem;">Failed to load assignments: ${err.message}</div>`;
      }
    }

    function openCreateAssignmentModal() {
      if (!registerData) {
        showToast('Please select a register first', 'error');
        return;
      }
      updateRegisterScopeBadges();
      const scopeEl = document.getElementById('modal-assign-scope-text');
      if (scopeEl) {
        scopeEl.innerText = `${registerData.subject_name || registerData.name} ${registerData.subject_code ? '[' + registerData.subject_code + ']' : ''} • Year ${registerData.year || 1} Sem ${registerData.semester || 1}`;
      }
      const dueInput = document.getElementById('assign-due-date');
      if (dueInput && !dueInput.value) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 0, 0);
        dueInput.value = tomorrow.toISOString().slice(0, 16);
      }
      document.getElementById('create-assignment-modal').classList.add('open');
      setTimeout(() => {
        const titleInp = document.getElementById('assign-title');
        if (titleInp) titleInp.focus();
      }, 100);
    }

    function onRegisterAssignNumChange(val) {
      const titleInp = document.getElementById('assign-title');
      if (!titleInp) return;
      if (val && val !== 'CUSTOM') {
        const curVal = titleInp.value.trim();
        if (!curVal || /^Assignment\s*\d+/i.test(curVal)) {
          titleInp.value = `Assignment ${val}`;
        }
      }
    }

    function toggleNewAssignmentForm() {
      openCreateAssignmentModal();
    }

    async function submitRegisterAssignment(e) {
      e.preventDefault();
      if (!registerData) {
        showToast('Please select a register first', 'error');
        return;
      }

      const saveBtn = document.getElementById('btn-save-assignment');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.innerText = 'Publishing...'; }

      const numVal = document.getElementById('assign-num-select')?.value || '1';
      let title = document.getElementById('assign-title').value.trim();
      if (numVal !== 'CUSTOM' && !/^(?:Assignment|Assign|A)\s*\d+/i.test(title)) {
        title = `Assignment ${numVal}: ${title}`;
      }

      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', document.getElementById('assign-desc').value.trim());
      fd.append('due_date', document.getElementById('assign-due-date').value || '');
      fd.append('max_marks', document.getElementById('assign-total-marks').value || 20);
      fd.append('subject_id', registerData.subject_id);
      fd.append('department_id', registerData.department_id);
      fd.append('branch_id', registerData.branch_id || '');
      fd.append('year', registerData.year || 1);
      fd.append('semester', registerData.semester || 1);
      if (registerData.academic_year_id) fd.append('academic_year_id', registerData.academic_year_id);

      const fileInput = document.getElementById('assign-file');
      if (fileInput && fileInput.files[0]) {
        fd.append('attachment', fileInput.files[0]);
      }

      try {
        const res = await fetchApi('/assignments', {
          method: 'POST',
          body: fd
        });
        if (res.success) {
          showToast('Assignment published successfully!', 'success');
          document.getElementById('create-assignment-form').reset();
          closeModal('create-assignment-modal');
          loadRegisterAssignments();
          loadRegisterTabsCount();
        } else {
          showToast(res.error?.message || 'Could not publish assignment', 'error');
        }
      } catch (err) {
        showToast('Failed to publish assignment: ' + err.message, 'error');
      } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = 'Publish Assignment'; }
      }
    }

    async function toggleSubmissions(id) {
      const panel = document.getElementById(`assign-panel-${id}`);
      if (!panel) return;
      if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        return;
      }
      panel.classList.add('open');
      panel.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">Loading student submissions...</div>';

      try {
        const res = await fetchApi(`/assignments/${id}/submissions`);
        if (!res.success) {
          panel.innerHTML = '<div style="color:var(--status-absent); padding:1rem;">Could not load submissions roster.</div>';
          return;
        }

        const roster = res.data.roster || [];
        if (!roster.length) {
          panel.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">No enrolled students in this register cohort roster.</div>';
          return;
        }

        panel.innerHTML = `
          <div style="overflow-x: auto; margin-top:0.75rem;">
            <table class="data-subtable">
              <thead>
                <tr>
                  <th style="width: 65px;">Roll No</th>
                  <th style="width: 130px;">UBTER Reg No</th>
                  <th>Student Full Name</th>
                  <th style="width: 140px;">Uploaded File</th>
                  <th style="width: 100px;">Status</th>
                  <th style="width: 130px;">Score</th>
                  <th style="width: 90px; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${roster.map(r => `
                  <tr>
                    <td style="font-weight: 700;">${String(r.class_roll_no || '—').replace(/^#/, '')}</td>
                    <td style="font-family: var(--font-family-mono); font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(r.registration_no || r.official_enrollment_no || '—')}</td>
                    <td style="font-weight: 600;">${escapeHtml(r.full_name)}</td>
                    <td>
                      ${r.file_path ? `<a class="file-link" href="${r.file_path}" target="_blank" style="display:inline-flex; align-items:center; gap:0.25rem;">${window.getSvgIcon('download', 13)}<span>${escapeHtml(r.original_filename || 'Download')}</span></a>` : '<span style="color:var(--text-muted);">None</span>'}
                    </td>
                    <td><span class="status-tag ${r.status || 'MISSING'}">${r.status || 'MISSING'}</span></td>
                    <td>
                      ${r.submission_id ? `<input type="number" id="marks-${r.submission_id}" value="${r.marks_obtained ?? ''}" placeholder="—" style="width:75px;">` : '<span style="color:var(--text-muted);">—</span>'}
                    </td>
                    <td style="text-align: right;">
                      ${r.submission_id ? `<button type="button" class="btn btn-primary btn-sm" onclick="saveGrade(${r.submission_id})">Grade</button>` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } catch (err) {
        panel.innerHTML = '<div style="color:var(--status-absent); padding:1rem;">Error fetching submissions.</div>';
      }
    }

    async function saveGrade(submissionId) {
      const inputEl = document.getElementById(`marks-${submissionId}`);
      const marksVal = inputEl ? inputEl.value : '';
      try {
        const res = await fetchApi(`/assignments/submissions/${submissionId}/grade`, {
          method: 'PUT',
          body: JSON.stringify({ marks_obtained: marksVal === '' ? null : Number(marksVal) })
        });
        if (res.success) {
          showToast('Grade saved successfully!', 'success');
        } else {
          showToast(res.error?.message || 'Could not save grade', 'error');
        }
      } catch (err) {
        showToast('Failed to save grade', 'error');
      }
    }

    // ─── REGISTER CLASS TESTS & MARKS ───
    let currentRegisterExams = [];

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
              <div style="margin-bottom:0.5rem; color:var(--color-primary); display:flex; justify-content:center;">${window.getSvgIcon('test', 40)}</div>
              <h3 style="font-size:1.15rem; font-weight:700; color:var(--text-main); margin-bottom:0.35rem;">No Tests or Marksheets Scheduled Yet</h3>
              <p style="font-size:0.85rem; max-width:480px; margin:0 auto 1.25rem;">
                No unit tests, quizzes, or exams scheduled for <strong>${escapeHtml(registerData.subject_name || 'this subject')}</strong>. Click above to schedule one.
              </p>
              <button type="button" class="btn btn-primary btn-sm" onclick="openCreateExamModal()">+ Schedule Class Test</button>
            </div>
          `;
          const b = document.getElementById('badge-exams-count');
          if (b) b.innerText = '0';
          return;
        }

        currentRegisterExams = res.data;
        const b = document.getElementById('badge-exams-count');
        if (b) b.innerText = currentRegisterExams.length;

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
                  <button type="button" class="btn btn-secondary btn-sm" onclick="exportExamStudioExcel(${ex.id})" title="Export Excel (.xlsx)" style="display:inline-flex; align-items:center; gap:0.3rem;">
                    ${window.getSvgIcon('download', 13)}
                    <span>Export Excel (.xlsx)</span>
                  </button>
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
    function openCreateExamModal() {
      if (!registerData) {
        showToast('Please select a register first', 'error');
        return;
      }
      updateRegisterScopeBadges();
      const scopeEl = document.getElementById('modal-exam-scope-text');
      if (scopeEl) {
        scopeEl.innerText = `${registerData.subject_name || registerData.name} ${registerData.subject_code ? '[' + registerData.subject_code + ']' : ''} • Year ${registerData.year || 1} Sem ${registerData.semester || 1}`;
      }
      const dateInput = document.getElementById('exam-date');
      if (dateInput && !dateInput.value) {
        dateInput.value = todayStr;
      }
      document.getElementById('create-exam-modal').classList.add('open');
      setTimeout(() => {
        const titleInp = document.getElementById('exam-title');
        if (titleInp) titleInp.focus();
      }, 100);
    }

    function onRegisterExamTypeOrNumChange() {
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
    function onRegisterExamUnitChange(val) {
      onRegisterExamTypeOrNumChange();
    }

    function toggleNewExamForm() {
      openCreateExamModal();
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

      let title = document.getElementById('exam-title').value.trim();
      if (type !== 'CUSTOM' && !title.toLowerCase().includes(prefixLabel.toLowerCase()) && !title.toLowerCase().includes(prefixCode.toLowerCase())) {
        title = `${prefixLabel}: ${title}`;
      }

      try {
        const res = await fetchApi('/exams', {
          method: 'POST',
          body: JSON.stringify({
            name: title,
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
          loadRegisterTabsCount();
        } else {
          showToast(res.error?.message || 'Could not create test', 'error');
        }
      } catch (err) {
        showToast('Failed to create test: ' + err.message, 'error');
      } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = 'Schedule & Create Marksheet'; }
      }
    }

    // ─── INSTITUTIONAL SPREADSHEET STUDIOS (EXAMS & EVALUATION) ───
    window.examStudioState = window.examStudioState || {};
    window.currentEvalSheetState = null;

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

        // Standard institutional question breakdown (Q1..Q4 matching Image 3)
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

        // Teacher defines question statements and marks via "+ Add Question" modal
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
      const cleanExamName = (function(title) {
        if (!title) return 'Unit Test';
        const str = String(title).trim();
        const m = str.match(/^(?:Unit\s*Test|Test|UT)\s*\d+/i);
        if (m) return m[0].replace(/^UT\s*/i, 'Unit Test ').replace(/^Test\s*/i, 'Unit Test ');
        const parts = str.split(/[—–\:\-]/);
        if (parts.length > 1 && parts[0].trim().length > 0) return parts[0].trim();
        return str;
      })(state.exam.name);
      const totalCols = 5 + state.questions.length;
      const sessionKey = (registerData && (registerData.academic_year_id || registerData.academic_year_label)) || '2026';
      const sessionStoreKey = `vidyaos_inst_header_session_${String(sessionKey).replace(/[^a-zA-Z0-9]/g, '_')}`;
      const defaultInstHeader = 'Uttarakhand Government Institute of Polytechnic, Nainital | Internal Evaluation Sheet 2026 Session';
      const savedInstHeader = localStorage.getItem(sessionStoreKey) || localStorage.getItem('vidyaos_institution_marks_header') || defaultInstHeader;

      panel.innerHTML = `
        <div class="sheet-studio-container">
          <!-- TOOLBAR (Spreadsheet Controls matching Image 3) -->
          <div class="sheet-toolbar">
            <div class="sheet-toolbar-group">
              <button type="button" class="btn btn-secondary btn-sm" onclick="openExamQuestionsModal(${examId})" title="Manage Questions, Marks & Settings">+ Add Question</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="removeExamStudioQuestion(${examId})" title="Remove last question column">- Remove Question</button>
            </div>
            <div class="sheet-toolbar-group">
              <button type="button" class="btn btn-secondary btn-sm" onclick="exportExamStudioExcel(${examId})" title="Download official Excel workbook (.xlsx)" style="font-weight: 700; color: var(--status-present); display:inline-flex; align-items:center; gap:0.35rem;">
                ${window.getSvgIcon('download', 13)}
                <span>Export Excel (.xlsx)</span>
              </button>
              <button type="button" class="btn btn-primary btn-sm" onclick="saveExamStudioMarks(${examId})" style="font-weight: 700; display:inline-flex; align-items:center; gap:0.35rem;">
                ${window.getSvgIcon('save', 13)}
                <span>Save Marks</span>
              </button>
            </div>
          </div>

          <!-- SPREADSHEET TABLE (Image 3 authentic replica) -->
          <div class="excel-sheet-viewport">
            <table class="excel-table sheet-table data-subtable">
              <thead>
                <!-- ROW 1: Institution Header (Soft blue fill) -->
                <tr class="excel-hdr-blue row-1 sheet-header-banner">
                  <th colspan="${totalCols}" style="padding:0.4rem 0.75rem">
                    <div style="display:flex;align-items:center;justify-content:center;gap:0.45rem;position:relative">
                      <h3 class="excel-editable-inst-header"
                          contenteditable="true"
                          spellcheck="false"
                          title="Click to edit institute header (changes sync automatically across all tests & registers in this session)"
                          onblur="(function(t){const c=(t||'').trim().replace(/\\s+/g,' ');if(c){localStorage.setItem('${sessionStoreKey}',c);localStorage.setItem('vidyaos_institution_marks_header',c);if(typeof apiFetch==='function'){apiFetch('/api/v1/faculty/session-header',{method:'PUT',body:JSON.stringify({header:c,academic_year_id:'${sessionKey}'})}).catch(()=>{});}document.querySelectorAll('.excel-editable-inst-header').forEach(el=>{if(el.innerText!==c)el.innerText=c;});showToast('Institution header updated across all tests!');}})(this.innerText)"
                          onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
                          style="margin:0;font-size:1.02rem;font-weight:700;letter-spacing:0.02em;color:var(--text-main);outline:none;cursor:text;padding:0.15rem 0.5rem;border-radius:var(--radius-sm);border:1px dashed transparent;transition:all 0.15s ease"
                          onfocus="this.style.borderColor='var(--color-primary)';this.style.background='var(--bg-card)';"
                      >${escapeHtml(savedInstHeader)}</h3>
                      <span title="Click text to edit header. Automatically updates all tests." style="cursor:pointer;opacity:0.75;display:inline-flex;align-items:center;" onclick="const h=this.previousElementSibling;if(h)h.focus()">${window.getSvgIcon('edit', 13)}</span>
                    </div>
                  </th>
                </tr>
                <!-- ROW 2: Department & Subject (Soft blue fill) -->
                <tr class="excel-hdr-blue row-2">
                  <th colspan="${totalCols}">
                    Internal Evaluation - ${escapeHtml(cleanExamName)} | Subject : ${subName}
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
                  <th colspan="${state.questions.length}">${escapeHtml(cleanExamName)} (Total Marks : ${examMaxMarks})</th>
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

    // ─── RESTORE UNIT TEST SHEET ───
    async function restoreUnitTestSheet() {
      const evalModal = document.getElementById('internal-eval-modal');
      if (evalModal && evalModal.classList.contains('open')) {
        closeModal('internal-eval-modal');
      }
      if (currentActiveTab !== 'exams') {
        switchRegisterTab('exams');
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

    // ─── EXPORT ALL TESTS ───
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

      // Update class average
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
                    style="padding: 0.35rem 0.5rem; color: var(--status-absent); font-size: 0.8rem; display:inline-flex; align-items:center;" 
                    onclick="confirmRemoveModalQuestion(${idx})" 
                    title="Delete Question Q${idx + 1}">${window.getSvgIcon('trash', 13)}</button>
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

    function removeModalQuestionRow(idx) {
      if (modalQuestionsDraft.length <= 1) {
        showToast('At least 1 question is required', 'error');
        return;
      }
      modalQuestionsDraft.splice(idx, 1);
      modalQuestionsDraft.forEach((q, i) => { q.num = i + 1; });
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

    function onExamQuestionMaxChange(examId, qIdx, value) {
      const state = window.examStudioState[examId];
      if (!state) return;
      const newMax = Math.max(1, parseInt(value, 10) || 1);

      if (state.questions[qIdx]) state.questions[qIdx].max = newMax;
      if (state.questions_meta && state.questions_meta[qIdx]) state.questions_meta[qIdx].marks = newMax;

      state.roster.forEach(s => {
        if (Array.isArray(s.question_scores)) {
          if (s.question_scores[qIdx] > newMax) {
            s.question_scores[qIdx] = newMax;
            const tot = s.is_absent ? 0 : s.question_scores.reduce((sum, v) => sum + (Number(v) || 0), 0);
            s.total_marks = Math.round(tot * 10) / 10;
            const inputEl = document.getElementById(`exam-q-${examId}-${s.student_id}-${qIdx}`);
            if (inputEl) { inputEl.value = newMax; inputEl.max = newMax; }
            const totEl = document.getElementById(`exam-total-${examId}-${s.student_id}`);
            if (totEl) totEl.innerText = s.is_absent ? '0 (AB)' : s.total_marks;
          } else {
            const inputEl = document.getElementById(`exam-q-${examId}-${s.student_id}-${qIdx}`);
            if (inputEl) inputEl.max = newMax;
          }
        }
      });

      const examMaxMarks = calcTotalMax(state.questions);
      const totalHdr = document.getElementById(`exam-hdr-max-${examId}`);
      if (totalHdr) totalHdr.innerText = `${state.exam.name} (Total Marks : ${examMaxMarks})`;
      const qTotHdr = document.getElementById(`exam-qtotal-hdr-${examId}`);
      if (qTotHdr) qTotHdr.innerText = `(${examMaxMarks})`;
      const metaMax = document.getElementById(`exam-meta-max-${examId}`);
      if (metaMax) metaMax.innerText = examMaxMarks;

      const present = state.roster.filter(s => !s.is_absent);
      const pSum = present.reduce((sum, s) => sum + (Number(s.total_marks) || 0), 0);
      const pAvg = present.length ? (pSum / present.length) : 0;
      const avgEl = document.getElementById(`exam-class-avg-${examId}`);
      if (avgEl) avgEl.innerText = `${pAvg.toFixed(1)} / ${examMaxMarks}`;

      showToast(`Updated Q${qIdx + 1} maximum marks to ${newMax}`, 'info');
    }

    function addExamStudioQuestion(examId) {
      openExamQuestionsModal(examId);
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

    function addExamStudioRow(examId) {
      const state = window.examStudioState[examId];
      if (!state) return;
      const nextIdx = state.roster.length + 1;
      state.roster.push({
        student_id: Date.now(),
        class_roll_no: nextIdx,
        official_enrollment_no: 'ENR-NEW-' + nextIdx,
        full_name: 'Student ' + nextIdx,
        is_absent: false,
        question_scores: state.questions.map(() => 0),
        total_marks: 0
      });
      renderExamStudio(examId);
      showToast(`Added student row ${nextIdx}`, 'success');
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

    async function exportExamExcelDirect(examId) {
      try {
        showToast('Generating official Excel workbook (.xlsx)...', 'info');
        const res = await fetch(`/api/v1/exams/${examId}/export/excel`, {
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
        });
        if (!res.ok) throw new Error('Failed to download Excel file');
        const blob = await res.blob();
        downloadBlob(blob, `Class_Test_${examId}_Marksheet.xlsx`);
        showToast('Excel workbook downloaded successfully!', 'success');
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
          loadRegisterTabsCount();
        } else {
          showToast(res.error?.message || 'Could not save marks', 'error');
        }
      } catch (err) {
        showToast('Failed to save marks: ' + err.message, 'error');
      }
    }

    async function saveAllMarks(examId, studentIds) {
      return saveExamStudioMarks(examId);
    }

    // ─── MASTER INTERNAL EVALUATION SPREADSHEET STUDIO (Image 2) ───
    async function openInternalEvaluationStudio() {
      if (!registerData) {
        showToast('Please select a register first', 'error');
        return;
      }
      const modal = document.getElementById('internal-eval-modal');
      if (!modal) return;
      modal.classList.add('open');

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

        const defaultAssessCols = [
          { name: 'Lab Record', max: 10 },
          { name: 'Viva Voce', max: 5 },
          { name: 'Creative Work (Model/Chart/Project)', max: 10 },
          { name: 'Attendance', max: 5 }
        ];

        const sessionKey = (registerData && (registerData.academic_year_id || registerData.academic_year_label)) || '2026';
        const sessionStoreKey = `vidyaos_inst_header_session_${String(sessionKey).replace(/[^a-zA-Z0-9]/g, '_')}`;
        const defaultInstHeader = 'Uttarakhand Government Institute of Polytechnic, Nainital | Internal Evaluation Sheet 2026 Session';
        const sessionHeader = localStorage.getItem(sessionStoreKey) || localStorage.getItem('vidyaos_institution_marks_header') || d.institution_header || defaultInstHeader;

        const assessCols = (Array.isArray(d.assessment_columns) && d.assessment_columns.length)
          ? d.assessment_columns
          : (Array.isArray(d.custom_columns) && d.custom_columns.length
              ? d.custom_columns
              : defaultAssessCols);

        window.currentEvalSheetState = {
          register: registerData,
          institution_name: sessionHeader,
          institution_header: sessionHeader,
          session_label: d.session_label || (registerData && registerData.session_label) || 'Internal Evaluation Sheet 2026 Session',
          assignments: assignList,
          exams: examList,
          assessment_columns: assessCols,
          custom_columns: assessCols,
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
            
            const sAssess = (Array.isArray(s.assessment_scores) && s.assessment_scores.length)
              ? s.assessment_scores
              : [
                  s.lab_record !== undefined ? Number(s.lab_record) : 8.5,
                  s.presentation_score !== undefined ? Number(s.presentation_score) : 4.0,
                  s.creative_work !== undefined ? Number(s.creative_work) : 8.5,
                  s.attendance_score !== undefined ? Number(s.attendance_score) : (s.attendance_percentage !== undefined ? Math.round(((s.attendance_percentage / 100) * 5) * 10) / 10 : 4.5)
                ];

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
              assessment_scores: sAssess,
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
      // Assignment Avg out of 15
      let aSum = 0;
      let aValidCount = 0;
      (s.assignment_scores || []).forEach(v => {
        if (v !== '' && v !== null && !isNaN(v)) {
          aSum += Number(v);
          aValidCount++;
        }
      });
      s.assignment_avg = aValidCount > 0 ? Math.round((aSum / aValidCount) * 10) / 10 : 0;

      // UT Avg out of 20
      let eCount = 0;
      let eSum = 0;
      (s.exam_scores || []).forEach((sc, i) => {
        if (!s.exam_absent?.[i] && sc !== '' && sc !== null && !isNaN(sc)) {
          eCount++;
          eSum += Number(sc);
        }
      });
      s.exam_avg = eCount > 0 ? Math.round((eSum / eCount) * 10) / 10 : 0;

      // Dynamic assessment scores sum
      const assessSum = (s.assessment_scores || []).reduce((sum, v) => sum + (Number(v) || 0), 0);

      // Grand Total
      const tot = (Number(s.assignment_avg) || 0) + (Number(s.exam_avg) || 0) + assessSum;
      s.grand_total = Math.round(tot * 10) / 10;
    }

    function renderInternalEvalGrid() {
      const content = document.getElementById('internal-eval-content');
      const state = window.currentEvalSheetState;
      if (!content || !state) return;

      const aCount = state.assignments.length;
      const eCount = state.exams.length;
      const assessCols = state.assessment_columns || state.custom_columns || [];

      const deptCode = escapeHtml((registerData && registerData.department_code) || '');
      const deptName = escapeHtml((registerData && (registerData.department_name || registerData.branch_name)) || (deptCode ? `Dept of ${deptCode}` : 'Department'));
      const sem = (registerData && registerData.semester) || 1;
      const yr = (registerData && registerData.year) || Math.ceil(sem / 2) || 1;
      const subName = escapeHtml((registerData && registerData.subject_name) || 'Subject');
      const totalMax = 15 + 20 + assessCols.reduce((sum, c) => sum + (Number(c.max) || 10), 0);

      const sessionKey = (registerData && (registerData.academic_year_id || registerData.academic_year_label)) || '2026';
      const sessionStoreKey = `vidyaos_inst_header_session_${String(sessionKey).replace(/[^a-zA-Z0-9]/g, '_')}`;
      const defaultInstHeader = 'Government Polytechnic College | Internal Evaluation Sheet';
      const savedInstHeader = localStorage.getItem(sessionStoreKey) || localStorage.getItem('vidyaos_institution_marks_header') || state.institution_name || defaultInstHeader;

      content.innerHTML = `
        <div class="sheet-studio-container" style="margin-top: 0;">
          <!-- TOOLBAR -->
          <div class="sheet-toolbar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem;">
            <div class="sheet-toolbar-group" style="display:flex; align-items:center; gap:0.4rem;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="addInternalEvalColumn()" title="Add custom evaluation column">+ Add Column</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="removeInternalEvalColumn()" title="Remove last assessment column">- Remove Column</button>
            </div>
            <div class="sheet-toolbar-group" style="display:flex; align-items:center; gap:0.4rem;">
              <a href="/faculty/evaluation.html?id=${currentRegisterId}" class="btn btn-secondary btn-sm" style="font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:0.35rem;" title="Open full master internal evaluation spreadsheet">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                <span>Full Evaluation Studio</span>
              </a>
              <button type="button" class="btn btn-secondary btn-sm" onclick="exportInternalEvaluationExcel()" title="Download official Excel workbook (.xlsx)" style="font-weight:700; color:var(--status-present); display:inline-flex; align-items:center; gap:0.35rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Export Excel (.xlsx)</span>
              </button>
              <button type="button" class="btn btn-primary btn-sm" onclick="saveInternalEvalGrid()" style="font-weight:700; display:inline-flex; align-items:center; gap:0.35rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                <span>Save</span>
              </button>
            </div>
          </div>

          <!-- BANNER (3-Row Layout Matching Image 1 & Master Evaluation Sheet) -->
          <div class="sheet-header-banner excel-hdr-banner" style="margin-bottom:0;">
            <!-- ROW 1: Institution Header (Editable inline) -->
            <div class="excel-hdr-blue row-1" style="background:var(--col-att-group-bg); color:var(--text-main); padding:0.45rem 0.75rem; text-align:center; border:1px solid var(--table-border-strong); border-bottom:none;">
              <div style="display:flex; align-items:center; justify-content:center; gap:0.45rem;">
                <h3 class="excel-editable-inst-header"
                    contenteditable="true"
                    spellcheck="false"
                    title="Click to edit institute header (changes sync automatically across all tests & registers in this session)"
                    onblur="(function(t){const c=(t||'').trim().replace(/\\s+/g,' ');if(c){localStorage.setItem('${sessionStoreKey}',c);localStorage.setItem('vidyaos_institution_marks_header',c);if(typeof apiFetch==='function'){apiFetch('/api/v1/faculty/session-header',{method:'PUT',body:JSON.stringify({header:c,academic_year_id:'${sessionKey}'})}).catch(()=>{});}document.querySelectorAll('.excel-editable-inst-header').forEach(el=>{if(el.innerText!==c)el.innerText=c;});showToast('Institution header updated across all tests!');}})(this.innerText)"
                    onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
                    style="margin:0; font-size:1.02rem; font-weight:700; outline:none; cursor:text; padding:0.15rem 0.5rem; border-radius:var(--radius-sm); border:1px dashed transparent;"
                >${escapeHtml(savedInstHeader)}</h3>
                <span title="Click text to edit header. Automatically updates all tests & registers." style="cursor:pointer; display:inline-flex; align-items:center; opacity:0.8;" onclick="const h=this.previousElementSibling;if(h)h.focus()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </span>
              </div>
            </div>

            <!-- ROW 2: Department & Subject with Theory + Practical Integrated Badge -->
            <div class="excel-hdr-blue row-2" style="background:var(--col-att-group-bg); color:var(--text-main); padding:0.35rem 0.75rem; text-align:center; font-weight:700; font-size:0.92rem; border-left:1px solid var(--table-border-strong); border-right:1px solid var(--table-border-strong); border-bottom:none; display:flex; align-items:center; justify-content:center; gap:0.6rem; flex-wrap:wrap;">
              <span>Department (${deptCode}) | Subject : ${subName}</span>
              <span style="font-size:0.72rem; padding:0.15rem 0.45rem; border-radius:var(--radius-sm); background:var(--color-primary-subtle); color:var(--color-primary); font-weight:700; border:1px solid var(--border-color); display:inline-flex; align-items:center; gap:0.3rem;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                <span>Theory + Practical Integrated</span>
              </span>
            </div>

            <!-- ROW 3: Department Full Name, Year, and Semester -->
            <div class="excel-hdr-blue row-3" style="background:var(--col-att-group-bg); color:var(--text-main); padding:0.35rem 0.75rem; text-align:center; font-weight:700; font-size:0.90rem; border:1px solid var(--table-border-strong); border-top:none;">
              ${deptName} Year ${yr} | Semester ${sem}
            </div>
          </div>

          <!-- SPREADSHEET TABLE -->
          <div class="excel-sheet-viewport" style="max-height: 65vh; overflow: auto; border: 1px solid var(--table-border-strong); margin-top:0.4rem;">
            <table class="excel-table sheet-table">
              <thead>
                <tr class="excel-hdr-tan" style="background:var(--chip-hod-bg); color:var(--text-main);">
                  <th rowspan="2" style="width: 50px;">ROLL NO</th>
                  <th rowspan="2" style="width: 120px;">ENROLLMENT NO</th>
                  <th rowspan="2" style="width: 120px;">REG NO</th>
                  <th rowspan="2" style="width: 190px; text-align: left;">STUDENT NAME</th>
                  <th colspan="${aCount}">Assignment Marks</th>
                  <th rowspan="2" style="width: 95px;">Assign Avg (15)</th>
                  <th colspan="${eCount}">Unit Test Marks</th>
                  <th rowspan="2" style="width: 85px;">UT Avg (20)</th>
                  ${assessCols.map((c, cIdx) => `
                    <th rowspan="2" style="width: 110px;">
                      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.15rem;">
                        <div style="display:flex; align-items:center; justify-content:center; gap:0.25rem;">
                          <span style="font-weight:700; font-size:0.75rem;">${escapeHtml(c.name)}</span>
                          <button type="button" onclick="deleteInternalEvalColumn(${cIdx})" title="Delete '${escapeHtml(c.name)}' column" style="background:transparent; border:none; color:var(--status-absent); cursor:pointer; font-weight:800; font-size:0.8rem; padding:0 0.2rem; line-height:1; display:inline-flex; align-items:center;">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                        </div>
                        <span style="font-size:0.72rem; opacity:0.75; font-weight:700;">( ${c.max || 10} )</span>
                      </div>
                    </th>
                  `).join('')}
                  <th rowspan="2" style="width: 85px; font-weight: 800;">Total Marks (${totalMax})</th>
                </tr>
                <tr class="excel-hdr-sub" style="background:var(--chip-hod-bg); color:var(--text-main);">
                  ${state.assignments.map((a, i) => `<th class="th-secondary" style="width: 44px;">${escapeHtml(a.title || a.name || (i + 1))}</th>`).join('')}
                  ${state.exams.map((e, i) => `<th class="th-secondary" style="width: 44px;">${escapeHtml(e.title || e.name || (i + 1))}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${state.students.map((s, idx) => `
                  <tr>
                    <td class="cell-roll" style="text-align:center; font-weight:700;">${escapeHtml(String(s.class_roll_no))}</td>
                    <td style="font-family: var(--font-family-mono); font-size: 0.78rem; color: var(--text-muted); text-align:center;">${escapeHtml(s.official_enrollment_no || '—')}</td>
                    <td style="font-family: var(--font-family-mono); font-size: 0.78rem; color: var(--text-muted); text-align:center;">${escapeHtml(s.registration_no || '—')}</td>
                    <td class="cell-student-name" style="text-align: left;" title="${escapeHtml(s.full_name)}">
                      <span style="font-weight: 700; text-transform: uppercase;">${escapeHtml(s.full_name)}</span>
                    </td>
                    ${state.assignments.map((_, aIdx) => `
                      <td>
                        <input type="number" 
                               class="excel-cell-input sheet-cell-input" 
                               value="${s.assignment_scores[aIdx] ?? 0}" 
                               min="0" 
                               max="25" 
                               step="0.5" 
                               oninput="onEvalAssignmentScoreChange(${s.student_id}, ${aIdx}, this.value)">
                      </td>
                    `).join('')}
                    <td style="font-weight: 700; background: var(--bg-surface-secondary); text-align:center;" id="eval-assign-avg-${s.student_id}">${s.assignment_avg.toFixed(1)}</td>
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
                    <td style="font-weight: 700; background: var(--bg-surface-secondary); text-align:center;" id="eval-exam-avg-${s.student_id}">${s.exam_avg.toFixed(1)}</td>
                    ${assessCols.map((c, cIdx) => `
                      <td>
                        <input type="number" 
                               class="excel-cell-input sheet-cell-input" 
                               value="${s.assessment_scores ? (s.assessment_scores[cIdx] ?? 0) : 0}" 
                               min="0" 
                               max="${c.max || 10}" 
                               step="0.5" 
                               oninput="onEvalAssessmentScoreChange(${s.student_id}, ${cIdx}, this.value, this)">
                      </td>
                    `).join('')}
                    <td style="font-weight: 800; font-size: 0.92rem; color: var(--text-main); background: var(--bg-surface-secondary); text-align:center;" id="eval-grand-total-${s.student_id}">
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

    function onEvalAssessmentScoreChange(studentId, cIdx, val, inputEl) {
      const state = window.currentEvalSheetState;
      if (!state) return;
      const student = state.students.find(s => s.student_id === studentId);
      if (!student) return;

      const cols = state.assessment_columns || state.custom_columns || [];
      const col = cols[cIdx];
      const max = Number((col && col.max) || 10);
      let num = parseFloat(val);
      if (isNaN(num) || val === '') num = 0;
      else if (num > max) {
        num = max;
        if (inputEl) inputEl.value = max;
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

    // Aliases for backward compatibility
    function onEvalAttendanceScoreChange(studentId, val) {
      onEvalAssessmentScoreChange(studentId, 3, val);
    }

    function onEvalPresentationScoreChange(studentId, val) {
      onEvalAssessmentScoreChange(studentId, 1, val);
    }

    function onEvalCustomScoreChange(studentId, cIdx, val) {
      onEvalAssessmentScoreChange(studentId, cIdx, val);
    }

    function deleteInternalEvalColumn(idx) {
      const state = window.currentEvalSheetState;
      if (!state || !state.assessment_columns || !state.assessment_columns[idx]) return;
      const col = state.assessment_columns[idx];
      if (!confirm(`Are you sure you want to remove the "${col.name}" column from this evaluation sheet?`)) return;
      state.assessment_columns.splice(idx, 1);
      state.students.forEach(s => {
        if (Array.isArray(s.assessment_scores)) {
          s.assessment_scores.splice(idx, 1);
        }
        recalculateEvalRow(s);
      });
      renderInternalEvalGrid();
      showToast(`Removed assessment column: ${col.name}`, 'info');
    }

    function addInternalEvalColumn() {
      const state = window.currentEvalSheetState;
      if (!state) return;
      const title = prompt('Enter assessment column name (e.g. Viva Voce, Lab Record, Quiz, Project):');
      if (!title || !title.trim()) return;
      const maxInput = prompt('Enter maximum marks for this column (e.g. 10):', '10');
      const maxMarks = Math.max(1, parseInt(maxInput, 10) || 10);

      if (!Array.isArray(state.assessment_columns)) state.assessment_columns = [];
      state.assessment_columns.push({
        id: 'col_' + Date.now(),
        name: title.trim(),
        max: maxMarks
      });
      state.students.forEach(s => {
        if (!Array.isArray(s.assessment_scores)) s.assessment_scores = [];
        s.assessment_scores.push(0);
        recalculateEvalRow(s);
      });
      renderInternalEvalGrid();
      showToast(`Added assessment column: ${title.trim()} (${maxMarks} marks)!`, 'success');
    }

    function removeInternalEvalColumn() {
      const state = window.currentEvalSheetState;
      if (!state || !state.assessment_columns || !state.assessment_columns.length) {
        showToast('No custom assessment columns to remove', 'info');
        return;
      }
      const lastCol = state.assessment_columns[state.assessment_columns.length - 1];
      deleteInternalEvalColumn(state.assessment_columns.length - 1);
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
        const assessCols = state.assessment_columns || state.custom_columns || [];
        const payload = {
          institution_name: state.institution_name,
          institution_header: state.institution_name,
          session_label: state.session_label,
          department_name: (registerData && (registerData.department_name || registerData.branch_name)) || '',
          department_code: (registerData && registerData.department_code) || '',
          subject_name: (registerData && registerData.subject_name) || 'Subject',
          semester: (registerData && registerData.semester) || 1,
          year: (registerData && registerData.year) || (registerData && registerData.semester ? Math.ceil(registerData.semester / 2) : 1),
          assignments: state.assignments,
          exams: state.exams,
          assessment_columns: assessCols,
          custom_columns: assessCols,
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

    function exportInternalEvaluationExcel() {
      return exportInternalEvalExcel();
    }

    function saveInternalEvalGrid() {
      try {
        const state = window.currentEvalSheetState;
        if (state && currentRegisterId) {
          const assessCols = state.assessment_columns || state.custom_columns || [];
          localStorage.setItem(`eval_sheet_state_${currentRegisterId}`, JSON.stringify({
            institution_name: state.institution_name,
            session_label: state.session_label,
            assessment_columns: assessCols,
            custom_columns: assessCols,
            students: state.students
          }));
        }
      } catch (e) {}
      showToast('Internal evaluation spreadsheet synced and saved!', 'success');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }


    // ─── 2-STEP DELETE MODAL ───
    let _pendingDelete = { type: null, id: null };

    function openDeleteModal(type, id) {
      _pendingDelete = { type, id };
      const labelMap = { assignment: 'assignment and all its submissions', exam: 'class test and all student marks' };
      document.getElementById('del-modal-impact').textContent = 'This will permanently remove the ' + (labelMap[type] || type) + '. This action cannot be reversed.';
      // Reset to step 1
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
        const endpoint = type === 'assignment' ? `/assignments/${id}` : `/exams/${id}`;
        const res = await fetchApi(endpoint, { method: 'DELETE' });
        document.getElementById('delete-item-modal').classList.remove('open');
        if (res.success) {
          showToast(type === 'assignment' ? 'Assignment deleted' : 'Class test deleted', 'success');
          if (type === 'assignment') loadRegisterAssignments(); else loadRegisterExams();
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

    // Initialize View: Directly open register
    loadRegistersList();

