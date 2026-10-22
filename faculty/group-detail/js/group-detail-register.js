/**
 * group-detail-register.js
 * 
 * Modular Register Matrix & Live Roll Call Studio controller for classroom workspace:
 * - Scoped attendance register loader & month navigator
 * - Two-tier physical PC matrix (Sunday/holiday vertical spans, today gradient, summary columns, tfoot totals)
 * - Ultra-compact mobile daily matrix with 2-class per day period selector & pen buttons
 * - Digital Pen interaction (P -> A -> L -> Clear)
 * - Real ESP32 day sync & multi-student check confirmation
 * - Student status remarks popover menu (Regular, Short, Below 75%, Xfer, Drop)
 * - Classroom Live Roll Call studio (dynamic QR, PIN, and manual check-in roster)
 */

(function () {
  'use strict';

  // Shared application state reference
  const getS = () => window.S || {};

  /* ══════════════════════════════════════════════════════════════
     CLASSROOM REGISTER MATRIX CONTROLLER (Scoped to THIS subject only)
     ══════════════════════════════════════════════════════════════ */
  let classRegState = {
    registerId: null,
    registerData: null,
    gridData: null,
    currentMonth: null,
    selectedDate: new Date().toISOString().slice(0, 10),
    mobilePeriod: 'ALL', // 'ALL' | 1 | 2
    activePopoverStudentId: null,
    hasAddedSecondClass: false,
    selectedMatrixStudents: new Set(),
    selectedMobileStudents: new Set(),
    loading: false
  };

  async function loadClassRegister(month) {
    try {
      const S = getS();
      let regId = S.group?.register_id || classRegState.registerId;
      if (!regId) {
        const listRes = await apiFetch('/api/v1/faculty/registers');
        if (listRes && listRes.success && Array.isArray(listRes.data)) {
          const found = listRes.data.find(r => r.group_id === Number(S.groupId) || r.subject_id === S.group?.subject_id);
          if (found) regId = found.id;
          else if (listRes.data.length > 0) regId = listRes.data[0].id;
        }
      }
      if (!regId) {
        const body = ById('class-matrix-body');
        if (body) body.innerHTML = `<tr><td style="text-align:center;padding:2rem;color:var(--text-muted)">No attendance register linked to this subject classroom.</td></tr>`;
        return;
      }

      classRegState.registerId = regId;
      const qStr = month ? ('?month=' + encodeURIComponent(month)) : '';
      const res = await apiFetch('/api/v1/faculty/registers/' + regId + qStr);
      if (res && res.success && res.data) {
        classRegState.registerData = res.data.register;
        classRegState.gridData = res.data.grid;
        classRegState.currentMonth = res.data.grid?.month || month || new Date().toISOString().slice(0, 7);

        renderClassRegisterHeader();
        renderClassRegisterMatrix();
        renderMobileCompactMatrix();
        checkClassEspStatus();
      }
    } catch (err) {
      console.error('loadClassRegister error:', err);
    }
  }

  function renderClassRegisterHeader() {
    const S = getS();
    const reg = classRegState.registerData || {};
    const grp = S.group || {};
    const esc = window.escapeHtml || (s => String(s == null ? '' : s));

    const titleEl = ById('class-reg-title');
    if (titleEl) titleEl.textContent = (reg.name || grp.name || 'Subject') + ' — Attendance Matrix';
    
    const subEl = ById('class-reg-subtitle');
    if (subEl) {
      const sub = reg.subject_name || grp.subject_name || '';
      const dept = reg.department_name || grp.department_name || '';
      const sem = reg.semester || grp.semester || 1;
      subEl.textContent = [sub, dept, 'Sem ' + sem].filter(Boolean).join(' • ');
    }

    const offBadge = ById('class-reg-badge-official');
    if (offBadge) offBadge.textContent = reg.is_official ? 'Official Register' : 'Class Register';

    const compBadge = ById('class-reg-badge-component');
    if (compBadge) compBadge.textContent = reg.session_type_scope || grp.component || 'THEORY';

    const monthDisplay = ById('class-reg-current-month-display');
    if (monthDisplay && classRegState.currentMonth) {
      const [y, m] = classRegState.currentMonth.split('-').map(Number);
      const mNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      monthDisplay.textContent = (mNames[m - 1] || '') + ' ' + y;
    }
    const syncDate = ById('class-sync-date');
    if (syncDate && !syncDate.value) {
      syncDate.value = classRegState.selectedDate || new Date().toISOString().slice(0, 10);
    }
  }

  // ─── PC VIEW: FULL PHYSICAL 31-DAY MATRIX ───
  function renderClassRegisterMatrix() {
    const thead = ById('class-matrix-head');
    const tbody = ById('class-matrix-body');
    const tfoot = ById('class-matrix-foot');
    const grid = classRegState.gridData;
    const esc = window.escapeHtml || (s => String(s == null ? '' : s));
    const todayStr = new Date().toISOString().slice(0, 10);

    if (!grid || !grid.students || !grid.students.length) {
      if (thead) thead.innerHTML = `<tr><th>Roster</th></tr>`;
      if (tbody) tbody.innerHTML = `<tr><td style="text-align:center;padding:2.5rem;color:var(--text-muted)">No enrolled students found in cohort roster.</td></tr>`;
      if (tfoot) tfoot.innerHTML = '';
      return;
    }

    const allDays = grid.month_days || [];
    const finalizedSessions = grid.finalized_sessions || [];

    // Expand month days into multi-period columns when multiple class periods exist on a single date
    const matrixCols = [];
    allDays.forEach(d => {
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

    const mNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const [yr, mo] = (grid.month || todayStr.slice(0, 7)).split('-').map(Number);
    const monthTitle = `${(mNames[mo - 1] || '').toUpperCase()} ${yr}`;

    // 1. TWO-TIER THEAD WITH BULK CHECKBOX & CLEAN TOTAL ATTENDED / ABSENT
    let headHtml = `
      <tr>
        <th class="sticky-col-0" rowspan="2" style="width: 32px; text-align: center; vertical-align: middle;">
          <input type="checkbox" id="matrix-check-all" onchange="toggleSelectAllMatrixStudents(this.checked)" title="Select all students">
        </th>
        <th class="sticky-col-1" rowspan="2" style="width: 36px; font-size: 0.65rem; padding: 0.2rem; text-align: center;">Roll<br>No.</th>
        <th class="sticky-col-2" rowspan="2" style="width: 148px; min-width: 135px; max-width: 165px; font-size: 0.74rem; padding: 0.2rem 0.45rem; text-align: left;">Name</th>
        <th colspan="${matrixCols.length}" style="background: var(--table-th-bg); color: var(--table-th-color); font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.25rem; text-align: center;">
          DATES OF LECTURE — ${monthTitle}
        </th>
        <th class="sticky-r-att-total" rowspan="2" style="background: var(--col-att-group-bg); color: var(--col-att-group-color); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.02em; padding: 0.2rem 0.25rem; width: 58px; text-align: center;" title="Total Attended Classes">
          TOTAL<br>ATTENDED
        </th>
        <th class="sticky-r-abs-total" rowspan="2" style="background: var(--col-abs-group-bg); color: var(--col-abs-group-color); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.02em; padding: 0.2rem 0.25rem; width: 54px; text-align: center;" title="Total Absent Classes">
          TOTAL<br>ABSENT
        </th>
        <th class="sticky-r-pct" rowspan="2" style="background: var(--table-sticky-th-bg); color: var(--table-th-color); font-size: 0.7rem; font-weight: 800; padding: 0.2rem; width: 44px; text-align: center;">
          %
        </th>
      </tr>
      <tr>
    `;

    // Sub-headers for Matrix Columns
    matrixCols.forEach(col => {
      const isNonInst = col.is_holiday;
      const bg = isNonInst ? 'var(--col-holiday-bg)' : 'var(--table-bg)';
      const fg = isNonInst ? 'var(--col-holiday-color)' : 'var(--text-main)';
      const eventTag = col.event_label ? `
        <div style="font-size: 0.5rem; color: var(--col-holiday-color); font-weight: 800; line-height: 1; margin-top: 1px; text-transform: uppercase;" title="${esc(col.event_label)}">
          ${esc(col.event_label.length > 8 ? col.event_label.slice(0, 7) + '…' : col.event_label)}
        </div>
      ` : '';

      const isToday = col.date === todayStr;
      if (isToday) {
        headHtml += `
          <th data-today="true" style="min-width: 28px; max-width: 38px; padding: 0.15rem 0.1rem;
              background: linear-gradient(180deg, var(--color-primary-hover) 0%, var(--color-primary) 100%);
              color: var(--text-white);
              position: relative;
              box-shadow: 0 0 0 2px var(--color-primary) inset;"
              title="${esc(col.display_title)}">
            <div style="font-size: 0.68rem; font-weight: 900; font-family: var(--font-family-mono);">${esc(col.display_day)}</div>
            <div style="font-size: 0.52rem; font-weight: 700; opacity: 0.85;">${col.day_name.slice(0,3)}</div>
            <div style="position:absolute; bottom: 2px; left:50%; transform:translateX(-50%); width: 5px; height: 5px; background: var(--color-primary-light); border-radius: 50%;"></div>
          </th>
        `;
      } else {
        headHtml += `
          <th style="min-width: 28px; max-width: 38px; padding: 0.15rem 0.1rem; background: ${bg}; color: ${fg}; text-align: center;" title="${esc(col.display_title)}">
            <div style="font-size: 0.68rem; font-weight: 800; font-family: var(--font-family-mono);">${esc(col.display_day)}</div>
            <div style="font-size: 0.52rem; font-weight: 600; opacity: 0.75;">${col.day_name.slice(0,3)}</div>
            ${eventTag}
          </th>
        `;
      }
    });

    headHtml += `</tr>`;
    if (thead) thead.innerHTML = headHtml;

    // 2. IDENTIFY SUNDAYS/HOLIDAYS WITH NO CLASS HELD (VERTICAL SPAN)
    const nonInstructionalSpans = new Set();
    allDays.forEach(d => {
      if (d.is_holiday) {
        const hasAnyRecord = grid.students.some(st => Boolean(st.attendance_marks?.[d.date]));
        if (!hasAnyRecord) {
          nonInstructionalSpans.add(d.date);
        }
      }
    });

    // 3. TBODY ROWS
    const totalStudents = grid.students.length;
    let bodyHtml = grid.students.map((st, sIdx) => {
      const isTransferred = st.enrollment_status === 'TRANSFERRED';
      const isDropped = st.enrollment_status === 'DROPPED';
      const rowClass = isTransferred ? 'row-transferred' : (isDropped ? 'row-dropped' : '');
      const isChecked = classRegState.selectedMatrixStudents.has(st.student_id);

      let cellsHtml = '';
      matrixCols.forEach(col => {
        if (nonInstructionalSpans.has(col.date)) {
          if (sIdx === 0) {
            const labelWords = (col.holiday_label || 'HOLIDAY').split(' ');
            const formattedLabel = labelWords.map(w => w.split('').join(' ')).join('   ');
            cellsHtml += `
              <td rowspan="${totalStudents}" class="vertical-holiday-cell" title="${esc(col.holiday_label || 'Holiday')} (${col.date})">
                <div class="vertical-holiday-text">
                  <span class="vertical-arrow-cap">↑</span>
                  <span>${esc(formattedLabel)}</span>
                  <span class="vertical-arrow-cap">↓</span>
                </div>
              </td>
            `;
          }
          return;
        }

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

        if (isTransferred) {
          cellsHtml += `<td style="color: var(--text-muted); font-size: 0.7rem; text-align: center;${col.date === todayStr ? ' background: var(--color-primary-light);' : ''}">—</td>`;
        } else {
          const isTodayCell = col.date === todayStr;
          cellsHtml += `
            <td style="padding: 2px; text-align: center;${isTodayCell ? ' background: var(--color-primary-light); border-left: 2px solid var(--color-primary) !important; border-right: 2px solid var(--color-primary) !important;' : ''}">
              <span class="pen-mark ${penClass}" 
                    id="pen-mark-${st.student_id}-${col.col_key}"
                    onclick="toggleDigitalPen('${col.date}', ${st.student_id}, this, ${col.period_number}, ${col.session_id || 'null'})"
                    title="${esc(st.full_name)} on ${col.date} (Period ${col.period_number}): ${mark || 'Unmarked'}. Tap to toggle: Present → Absent → Clear">
                ${penChar}
              </span>
            </td>
          `;
        }
      });

      // Total Attended, Total Absent, % (Clean columns, Remarks removed)
      const isDefaulter = st.is_defaulter;
      const pctColor = isDefaulter ? 'var(--status-absent)' : 'var(--status-present)';
      const pctBg = isDefaulter ? 'var(--status-absent-bg)' : 'var(--status-present-bg)';
      const summaryHtml = `
        <td class="sticky-r-att-total" style="font-weight: 800; color: var(--col-att-tt-color); background: var(--col-att-tt-bg); text-align: center; font-size: 0.8rem;">
          ${st.total_attended != null ? st.total_attended : '0'}
        </td>
        <td class="sticky-r-abs-total" style="font-weight: 800; color: var(--col-abs-tt-color); background: var(--col-abs-tt-bg); text-align: center; font-size: 0.8rem;">
          ${st.total_absent != null ? st.total_absent : '0'}
        </td>
        <td class="sticky-r-pct" style="font-weight: 900; color: ${pctColor}; background: ${pctBg}; letter-spacing: -0.02em; text-align: center; font-size: 0.78rem;">
          ${st.percentage != null ? st.percentage : '0'}%
        </td>
      `;

      const rollBadge = isTransferred ? `<span class="badge-transferred" title="Transferred Student">T</span>` : '';
      const cleanRoll = String(st.class_roll_no != null && String(st.class_roll_no) !== 'null' ? st.class_roll_no : (st.roll_number ? st.roll_number : (sIdx + 1))).replace(/^#/, '');
      const idSubtitle = `${st.registration_no ? `<span style="font-weight: 600; color: var(--text-main);">${esc(st.registration_no)}</span> • ` : ''}${esc(st.official_enrollment_no || '—')}`;
      const nameContent = isTransferred ? `
        <div style="text-decoration: line-through; color: var(--status-absent); font-weight: 700; font-size: 0.74rem; line-height: 1.2; white-space: nowrap;">${esc(st.full_name)}</div>
        <div style="font-size: 0.58rem; color: var(--status-absent); border-top: 1px solid var(--border-color); margin-top: 2px; padding-top: 2px; white-space: nowrap;">TRANSFERRED</div>
      ` : `
        <div style="font-weight: 700; color: var(--text-main); font-size: 0.74rem; line-height: 1.2; white-space: nowrap;">${esc(st.full_name)}</div>
        <div style="font-size: 0.6rem; color: var(--text-muted); font-family: var(--font-family-mono);
                    border-top: 1px solid var(--border-color); margin-top: 2px; padding-top: 2px;
                    letter-spacing: 0.01em; white-space: nowrap;" title="UBTER Reg: ${esc(st.registration_no || '—')} | Enroll: ${esc(st.official_enrollment_no || '—')}">${idSubtitle}</div>
      `;

      return `
        <tr class="${rowClass}" id="matrix-st-${st.student_id}">
          <td class="sticky-col-0" style="text-align: center; vertical-align: middle;">
            <input type="checkbox" class="matrix-student-chk" data-student-id="${st.student_id}" ${isChecked ? 'checked' : ''} onchange="onMatrixStudentSelectionChange()">
          </td>
          <td class="sticky-col-1" style="text-align: center; font-weight: 800; background: var(--table-sticky-bg); color: var(--text-main); font-size: 0.72rem; padding: 0.2rem;">
            ${rollBadge}${cleanRoll}
          </td>
          <td class="sticky-col-2" style="background: var(--table-sticky-bg); color: var(--text-main); padding: 0.2rem 0.45rem; width: 148px; min-width: 135px; max-width: 165px;" title="${esc(st.full_name)} (${st.registration_no ? 'UBTER: ' + st.registration_no + ' • ' : ''}${st.official_enrollment_no || ''})">
            ${nameContent}
          </td>
          ${cellsHtml}
          ${summaryHtml}
        </tr>
      `;
    }).join('');
    if (tbody) tbody.innerHTML = bodyHtml;

    // 4. TFOOT DAILY PRESENT & ABSENT TOTALS
    if (tfoot) {
      let footP = `
        <tr>
          <th class="sticky-col-0"></th>
          <th class="sticky-col-1"></th>
          <th class="sticky-col-2" style="font-size: 0.68rem; color: var(--status-present); font-weight: 800; text-align: left; padding: 0.2rem 0.45rem; width: 148px; min-width: 135px; max-width: 165px; line-height: 1.1; background: var(--table-sticky-th-bg);" title="Total Present (P)">
            Total Present (P)
          </th>
      `;
      let footA = `
        <tr>
          <th class="sticky-col-0"></th>
          <th class="sticky-col-1"></th>
          <th class="sticky-col-2" style="font-size: 0.68rem; color: var(--status-absent); font-weight: 800; text-align: left; padding: 0.2rem 0.45rem; width: 148px; min-width: 135px; max-width: 165px; line-height: 1.1; background: var(--table-sticky-th-bg);" title="Total Absent (A)">
            Total Absent (A)
          </th>
      `;

      let totalMonthP = 0;
      let totalMonthA = 0;

      matrixCols.forEach(col => {
        if (nonInstructionalSpans.has(col.date)) {
          footP += `<td class="vertical-holiday-cell" style="font-size: 0.7rem; color: var(--col-holiday-color); text-align:center;">—</td>`;
          footA += `<td class="vertical-holiday-cell" style="font-size: 0.7rem; color: var(--col-holiday-color); text-align:center;">—</td>`;
          return;
        }

        const daily = (col.session_key && grid.daily_totals?.[col.session_key]) ||
                      (col.col_key && grid.daily_totals?.[col.col_key]) ||
                      grid.daily_totals?.[col.date];
        if (daily) {
          footP += `<td style="font-weight: 900; color: var(--status-present); font-size: 0.72rem; text-align:center;">P: ${daily.present}</td>`;
          footA += `<td style="font-weight: 900; color: var(--status-absent); font-size: 0.72rem; text-align:center;">A: ${daily.absent}</td>`;
          totalMonthP += (daily.present || 0);
          totalMonthA += (daily.absent || 0);
        } else {
          let colP = 0, colA = 0;
          grid.students.forEach(st => {
            const m = (col.session_key && st.attendance_marks?.[col.session_key]) ||
                      (col.col_key && st.attendance_marks?.[col.col_key]) ||
                      st.attendance_marks?.[col.date];
            if (m === 'PRESENT') colP++;
            else if (m === 'ABSENT') colA++;
          });
          footP += `<td style="font-weight: 800; color: var(--status-present); font-size: 0.72rem; text-align:center;">${colP || '—'}</td>`;
          footA += `<td style="font-weight: 800; color: var(--status-absent); font-size: 0.72rem; text-align:center;">${colA || '—'}</td>`;
          totalMonthP += colP;
          totalMonthA += colA;
        }
      });

      footP += `
        <td class="sticky-r-att-total" style="font-weight: 900; color: var(--col-att-tt-color); background: var(--col-att-tt-bg); text-align: center;">${totalMonthP}</td>
        <td class="sticky-r-abs-total" style="text-align: center; color: var(--text-muted);">—</td>
        <td class="sticky-r-pct" style="text-align: center; color: var(--text-muted);">—</td>
      </tr>`;

      footA += `
        <td class="sticky-r-att-total" style="text-align: center; color: var(--text-muted);">—</td>
        <td class="sticky-r-abs-total" style="font-weight: 900; color: var(--col-abs-tt-color); background: var(--col-abs-tt-bg); text-align: center;">${totalMonthA}</td>
        <td class="sticky-r-pct" style="text-align: center; color: var(--text-muted);">—</td>
      </tr>`;

      tfoot.innerHTML = footP + footA;
    }

    // Update bulk bar state
    updateMatrixBulkBar();

    // Smooth scroll to today's column
    setTimeout(() => {
      const wrapper = ById('class-matrix-scroll-wrapper');
      const todayTh = thead?.querySelector('th[data-today="true"]');
      if (wrapper && todayTh) {
        const stickyRightWidth = 156 + 10;
        const thLeft = todayTh.offsetLeft;
        const thWidth = todayTh.offsetWidth;
        const target = thLeft - (wrapper.clientWidth - stickyRightWidth - thWidth - 6);
        wrapper.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
      }
    }, 60);
  }

  // ─── MOBILE VIEW: COMPACT DAILY MATRIX ───
  // ─── MOBILE VIEW: COMPACT DAILY MATRIX (Minimal, Single Class Default) ───
  function renderMobileCompactMatrix() {
    const tbody = ById('mobile-compact-tbody');
    const dateDisp = ById('mobile-matrix-date-display');
    const thP1 = ById('m-th-p1');
    const thP2 = ById('m-th-p2');
    const grid = classRegState.gridData;
    const esc = window.escapeHtml || (s => String(s == null ? '' : s));
    const targetDate = classRegState.selectedDate || ById('class-sync-date')?.value || new Date().toISOString().slice(0, 10);

    if (!grid || !grid.students || !grid.students.length) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">No students found in cohort roster.</td></tr>`;
      return;
    }

    // Update Date Display
    if (dateDisp) {
      try {
        const dt = new Date(targetDate + 'T00:00:00');
        const dStr = dt.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        dateDisp.textContent = dStr;
      } catch {
        dateDisp.textContent = targetDate;
      }
    }

    // Check sessions for target date: Default is strictly 1 class
    const finalized = grid.finalized_sessions || [];
    const daySessions = finalized.filter(s => s.session_date === targetDate);
    const sessionP1 = daySessions.find(s => (s.period_number || 1) === 1) || daySessions[0] || null;
    const sessionP2 = daySessions.find(s => (s.period_number || 1) === 2) || (daySessions.length > 1 ? daySessions[1] : null);

    const hasMultiClasses = daySessions.length > 1 || Boolean(classRegState.hasAddedSecondClass);
    const periodFilter = classRegState.mobilePeriod || 'ALL';
    const showP1 = (periodFilter === 'ALL' || periodFilter === 1);
    const showP2 = hasMultiClasses && (periodFilter === 'ALL' || periodFilter === 2);

    // Update Class Controller Strip Pills
    const pillsContainer = ById('mobile-period-pills-container');
    if (pillsContainer) {
      if (!hasMultiClasses) {
        pillsContainer.innerHTML = `<span class="mobile-period-btn active" style="cursor:default;font-weight:700;">Class 1</span>`;
      } else {
        pillsContainer.innerHTML = `
          <button type="button" class="mobile-period-btn ${periodFilter === 'ALL' ? 'active' : ''}" onclick="setMobilePeriodFilter('ALL')">All</button>
          <button type="button" class="mobile-period-btn ${periodFilter === 1 ? 'active' : ''}" onclick="setMobilePeriodFilter(1)">Class 1</button>
          <button type="button" class="mobile-period-btn ${periodFilter === 2 ? 'active' : ''}" onclick="setMobilePeriodFilter(2)">Class 2</button>
        `;
      }
    }

    const addClassBtn = ById('btn-mobile-add-class');
    if (addClassBtn) {
      addClassBtn.textContent = hasMultiClasses ? '+ Add Period' : '+ Add Class';
    }

    if (thP1) {
      thP1.style.display = showP1 ? '' : 'none';
      thP1.textContent = sessionP1 ? `Class 1` : 'Class 1';
    }
    if (thP2) {
      thP2.style.display = showP2 ? '' : 'none';
      thP2.textContent = sessionP2 ? `Class 2` : 'Class 2';
    }

    let rowsHtml = grid.students.map((st, idx) => {
      const marks = st.attendance_marks || {};
      const isTransferred = st.enrollment_status === 'TRANSFERRED';
      const isChecked = classRegState.selectedMobileStudents.has(st.student_id);

      // Mark 1 (Class 1 / Period 1)
      const p1Key = sessionP1 ? `sess_${sessionP1.id}` : targetDate;
      const mark1 = marks[p1Key] || marks[targetDate] || null;
      const mark1Status = typeof mark1 === 'string' ? mark1 : (mark1?.status || null);
      let p1Char = '·';
      let p1Cls = 'empty';
      if (mark1Status === 'PRESENT') { p1Char = 'P'; p1Cls = 'p'; }
      else if (mark1Status === 'ABSENT') { p1Char = 'A'; p1Cls = 'a'; }

      // Mark 2 (Class 2 / Period 2)
      const p2Key = sessionP2 ? `sess_${sessionP2.id}` : `${targetDate}_2`;
      const mark2 = marks[p2Key] || null;
      const mark2Status = typeof mark2 === 'string' ? mark2 : (mark2?.status || null);
      let p2Char = '·';
      let p2Cls = 'empty';
      if (mark2Status === 'PRESENT') { p2Char = 'P'; p2Cls = 'p'; }
      else if (mark2Status === 'ABSENT') { p2Char = 'A'; p2Cls = 'a'; }

      const rollBadge = isTransferred ? `<span class="badge-transferred">T</span> ` : '';
      const cleanRoll = String(st.class_roll_no != null && String(st.class_roll_no) !== 'null' ? st.class_roll_no : (st.roll_number ? st.roll_number : (idx + 1))).replace(/^#/, '');
      const idSubtitle = esc(st.official_enrollment_no || st.registration_no || '—');

      return `
        <tr id="mobile-row-${st.student_id}">
          <td style="text-align: center; vertical-align: middle;">
            <input type="checkbox" class="mobile-student-chk" data-student-id="${st.student_id}" ${isChecked ? 'checked' : ''} onchange="onMobileStudentSelectionChange()">
          </td>
          <td style="text-align: center; font-weight: 800; font-size: 0.78rem; color: var(--text-main);">
            ${rollBadge}${cleanRoll}
          </td>
          <td style="padding: 0.45rem 0.5rem;">
            <div style="font-weight: 700; font-size: 0.8rem; color: var(--text-main); line-height: 1.2;">
              ${esc(st.full_name)}
            </div>
            <div style="font-size: 0.65rem; color: var(--text-muted); font-family: var(--font-family-mono); margin-top: 1px;">
              ${idSubtitle}
            </div>
          </td>
          ${showP1 ? `
            <td style="text-align: center; padding: 0.25rem 0.35rem;">
              <button type="button" class="mobile-pen-btn ${p1Cls}" id="m-btn-p1-${st.student_id}"
                      onclick="toggleDigitalPen('${targetDate}', ${st.student_id}, this, 1, ${sessionP1?.id || 'null'})"
                      title="Class 1: ${esc(st.full_name)}. Tap to toggle: Present → Absent → Clear">
                ${p1Char}
              </button>
            </td>
          ` : ''}
          ${showP2 ? `
            <td style="text-align: center; padding: 0.25rem 0.35rem;">
              <button type="button" class="mobile-pen-btn ${p2Cls}" id="m-btn-p2-${st.student_id}"
                      onclick="toggleDigitalPen('${targetDate}', ${st.student_id}, this, 2, ${sessionP2?.id || 'null'})"
                      title="Class 2: ${esc(st.full_name)}. Tap to toggle: Present → Absent → Clear">
                ${p2Char}
              </button>
            </td>
          ` : ''}
          <td style="text-align: center;">
            <span class="mobile-att-count" title="${st.total_attended || 0} classes attended">
              ${st.total_attended != null ? st.total_attended : 0}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    if (tbody) tbody.innerHTML = rowsHtml;
    updateMobileBulkBar();
  }

  // ─── DIGITAL PEN INTERACTION (Tap to toggle: Present ➔ Absent ➔ Clear, No Late) ───
  async function toggleDigitalPen(date, studentId, el, periodNumber, sessionId) {
    if (!classRegState.registerId) return;

    // Determine current status
    let currentStatus = 'CLEAR';
    if (el.classList.contains('p')) currentStatus = 'PRESENT';
    else if (el.classList.contains('a')) currentStatus = 'ABSENT';

    // Cycle strictly without Late
    const cycle = {
      'CLEAR': 'PRESENT',
      'PRESENT': 'ABSENT',
      'ABSENT': 'CLEAR'
    };
    const nextStatus = cycle[currentStatus] || 'PRESENT';

    // Optimistic visual update
    const isMobileBtn = el.classList.contains('mobile-pen-btn');
    const clsBase = isMobileBtn ? 'mobile-pen-btn ' : 'pen-mark ';
    el.className = clsBase + (nextStatus === 'CLEAR' ? 'empty' : nextStatus.toLowerCase());
    el.innerText = nextStatus === 'CLEAR' ? '·' : (nextStatus === 'PRESENT' ? 'P' : 'A');

    try {
      const payload = {
        date,
        student_id: studentId,
        status: nextStatus
      };
      if (periodNumber) payload.period_number = periodNumber;
      if (sessionId) payload.session_id = sessionId;

      const res = await apiFetch(`/api/v1/faculty/registers/${classRegState.registerId}/mark-cell`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res && res.success) {
        const grid = classRegState.gridData;
        if (grid && Array.isArray(grid.students)) {
          const st = grid.students.find(s => s.student_id === studentId);
          if (st) {
            const markKey = periodNumber && periodNumber > 1 ? `${date}_${periodNumber}` : date;
            if (!st.attendance_marks) st.attendance_marks = {};
            if (nextStatus === 'CLEAR') {
              delete st.attendance_marks[markKey];
              if (sessionId) delete st.attendance_marks[`sess_${sessionId}`];
            } else {
              st.attendance_marks[markKey] = nextStatus;
              if (sessionId) st.attendance_marks[`sess_${sessionId}`] = nextStatus;
            }
          }
        }
        // Silent reload to update statistics and daily counts
        loadClassRegister(classRegState.currentMonth);
      } else {
        toast(res?.error?.message || 'Failed to update attendance mark');
        loadClassRegister(classRegState.currentMonth);
      }
    } catch (err) {
      console.error('toggleDigitalPen error:', err);
      loadClassRegister(classRegState.currentMonth);
    }
  }

  // ─── BULK ATTENDANCE MARKING CONTROLLER ───
  function toggleSelectAllMatrixStudents(checked) {
    const chks = document.querySelectorAll('.matrix-student-chk');
    chks.forEach(cb => {
      cb.checked = checked;
      const sId = Number(cb.getAttribute('data-student-id'));
      if (sId) {
        if (checked) classRegState.selectedMatrixStudents.add(sId);
        else classRegState.selectedMatrixStudents.delete(sId);
      }
    });
    updateMatrixBulkBar();
  }

  function onMatrixStudentSelectionChange() {
    const chks = document.querySelectorAll('.matrix-student-chk');
    classRegState.selectedMatrixStudents.clear();
    let allChecked = chks.length > 0;
    chks.forEach(cb => {
      const sId = Number(cb.getAttribute('data-student-id'));
      if (cb.checked && sId) classRegState.selectedMatrixStudents.add(sId);
      else allChecked = false;
    });
    const master = ById('matrix-check-all');
    if (master) master.checked = allChecked;
    updateMatrixBulkBar();
  }

  function deselectAllMatrixStudents() {
    classRegState.selectedMatrixStudents.clear();
    const chks = document.querySelectorAll('.matrix-student-chk');
    chks.forEach(cb => { cb.checked = false; });
    const master = ById('matrix-check-all');
    if (master) master.checked = false;
    updateMatrixBulkBar();
  }

  function updateMatrixBulkBar() {
    const bar = ById('pc-matrix-bulk-bar');
    const cnt = ById('pc-bulk-count');
    const size = classRegState.selectedMatrixStudents.size;
    if (!bar) return;
    if (size > 0) {
      bar.style.display = 'flex';
      if (cnt) cnt.textContent = `${size} student${size > 1 ? 's' : ''} selected`;
    } else {
      bar.style.display = 'none';
    }
  }

  function toggleSelectAllMobileStudents(checked) {
    const chks = document.querySelectorAll('.mobile-student-chk');
    chks.forEach(cb => {
      cb.checked = checked;
      const sId = Number(cb.getAttribute('data-student-id'));
      if (sId) {
        if (checked) classRegState.selectedMobileStudents.add(sId);
        else classRegState.selectedMobileStudents.delete(sId);
      }
    });
    updateMobileBulkBar();
  }

  function onMobileStudentSelectionChange() {
    const chks = document.querySelectorAll('.mobile-student-chk');
    classRegState.selectedMobileStudents.clear();
    let allChecked = chks.length > 0;
    chks.forEach(cb => {
      const sId = Number(cb.getAttribute('data-student-id'));
      if (cb.checked && sId) classRegState.selectedMobileStudents.add(sId);
      else allChecked = false;
    });
    const master = ById('mobile-check-all');
    if (master) master.checked = allChecked;
    updateMobileBulkBar();
  }

  function deselectAllMobileStudents() {
    classRegState.selectedMobileStudents.clear();
    const chks = document.querySelectorAll('.mobile-student-chk');
    chks.forEach(cb => { cb.checked = false; });
    const master = ById('mobile-check-all');
    if (master) master.checked = false;
    updateMobileBulkBar();
  }

  function updateMobileBulkBar() {
    const bar = ById('mobile-bulk-bar');
    const cnt = ById('mobile-bulk-count');
    const size = classRegState.selectedMobileStudents.size;
    if (!bar) return;
    if (size > 0) {
      bar.style.display = 'flex';
      if (cnt) cnt.textContent = `${size} selected`;
    } else {
      bar.style.display = 'none';
    }
  }

  async function bulkMarkAttendance(status, isMobile = false) {
    const regId = classRegState.registerId;
    if (!regId) return;

    const targetDate = classRegState.selectedDate || ById('class-sync-date')?.value || new Date().toISOString().slice(0, 10);
    const set = isMobile ? classRegState.selectedMobileStudents : classRegState.selectedMatrixStudents;
    const selectedStudentIds = Array.from(set);

    if (!selectedStudentIds.length) {
      toast('Please select at least one student');
      return;
    }

    const periodNumber = (isMobile && classRegState.mobilePeriod && classRegState.mobilePeriod !== 'ALL')
      ? classRegState.mobilePeriod
      : 1;

    toast(`Marking ${selectedStudentIds.length} students as ${status}...`);

    try {
      await Promise.all(selectedStudentIds.map(stId => {
        return apiFetch(`/api/v1/faculty/registers/${regId}/mark-cell`, {
          method: 'PUT',
          body: JSON.stringify({
            date: targetDate,
            student_id: stId,
            status: status,
            period_number: periodNumber
          })
        });
      }));

      toast(`Successfully marked ${selectedStudentIds.length} students!`);
      if (isMobile) deselectAllMobileStudents();
      else deselectAllMatrixStudents();
      loadClassRegister(classRegState.currentMonth);
    } catch (err) {
      toast('Error bulk marking: ' + err.message);
      loadClassRegister(classRegState.currentMonth);
    }
  }

  // ─── ADD CLASS (DEFAULT 1 CLASS PER DAY) ───
  function addNewClassForDay() {
    const regId = classRegState.registerId;
    const targetDate = classRegState.selectedDate || ById('class-sync-date')?.value || new Date().toISOString().slice(0, 10);
    if (!classRegState.hasAddedSecondClass) {
      classRegState.hasAddedSecondClass = true;
      toast('Added Class 2 for ' + targetDate);
      renderMobileCompactMatrix();
      if (regId) {
        apiFetch(`/api/v1/faculty/registers/${regId}/sessions`, {
          method: 'POST',
          body: JSON.stringify({
            session_date: targetDate,
            label: 'Class 2 / Period 2',
            session_type: 'THEORY',
            period_number: 2
          })
        }).then(() => loadClassRegister(classRegState.currentMonth));
      }
    } else {
      openAddSessionModal();
    }
  }

  // ─── MULTI-CLASS FILTER ───
  function setMobilePeriodFilter(filter) {
    classRegState.mobilePeriod = filter;
    renderMobileCompactMatrix();
  }

  function toggleMobileRegisterMode() {
    const isFull = document.body.classList.toggle('mobile-full-ledger');
    const lbl = ById('lbl-toggle-mobile-mode');
    if (lbl) {
      lbl.textContent = isFull ? 'Compact View' : 'Full 31-Day Ledger';
    }
  }

  function onSyncDateChange() {
    const syncDate = ById('class-sync-date')?.value;
    if (syncDate) {
      classRegState.selectedDate = syncDate;
      renderMobileCompactMatrix();
      checkClassEspStatus();
    }
  }

  function openAddSessionModal() {
    const dateInp = ById('sess-date');
    if (dateInp) dateInp.value = classRegState.selectedDate || new Date().toISOString().slice(0, 10);
    const labelInp = ById('sess-label');
    if (labelInp) labelInp.value = 'Period 2: Extra / Practical Class';
    const periodSelect = ById('sess-period');
    if (periodSelect) periodSelect.value = '2';
    openModal('add-session-modal');
  }

  async function createClassSession(e) {
    if (e) e.preventDefault();
    const regId = classRegState.registerId;
    if (!regId) return;

    const session_date = ById('sess-date')?.value;
    const label = ById('sess-label')?.value?.trim();
    const session_type = ById('sess-type')?.value || 'THEORY';
    const period_number = parseInt(ById('sess-period')?.value || '2', 10);

    try {
      const res = await apiFetch(`/api/v1/faculty/registers/${regId}/sessions`, {
        method: 'POST',
        body: JSON.stringify({ session_date, label, session_type, period_number })
      });
      if (res && res.success) {
        toast('Class session added for date!');
        closeModal('add-session-modal');
        loadClassRegister(classRegState.currentMonth);
      } else {
        toast(res?.error?.message || 'Failed to add class session');
      }
    } catch (err) {
      toast('Error adding session: ' + err.message);
    }
  }

  // ─── ESP32 HARDWARE SYNC ───
  async function checkClassEspStatus() {
    const badge = ById('class-esp-status-badge');
    const regId = classRegState.registerId;
    if (!badge || !regId) return;

    try {
      const syncDate = ById('class-sync-date')?.value || classRegState.selectedDate || new Date().toISOString().slice(0, 10);
      const res = await apiFetch(`/api/v1/attendance/registers/${regId}/esp32-day-scans?date=${syncDate}`);
      if (res && res.success && res.data) {
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
    } catch {
      badge.innerHTML = `<span class="badge badge-pending" style="font-size: 0.68rem; padding: 0.15rem 0.45rem;">Ready</span>`;
    }
  }

  let _currentEspScansList = [];

  async function triggerClassEspDaySync() {
    const regId = classRegState.registerId;
    if (!regId) {
      toast('No register linked to this subject');
      return;
    }
    const syncDate = ById('class-sync-date')?.value || classRegState.selectedDate || new Date().toISOString().slice(0, 10);
    const btn = ById('btn-class-esp-sync');
    if (btn) { btn.disabled = true; btn.innerText = 'Syncing...'; }

    try {
      const res = await apiFetch(`/api/v1/attendance/registers/${regId}/esp32-day-scans?date=${syncDate}`);
      if (res && res.success) {
        _currentEspScansList = res.data?.scans || [];
        const countEl = ById('esp-scanned-count');
        if (countEl) countEl.innerText = _currentEspScansList.length;

        const desc = ById('esp-confirm-desc');
        if (desc) {
          desc.innerHTML = `Found <strong>${_currentEspScansList.length}</strong> scan records for <strong>${syncDate}</strong>. Verify students, then click <strong>Confirm & Add to Register</strong>.`;
        }

        const tbody = ById('esp-scans-tbody');
        if (tbody) {
          if (!_currentEspScansList.length) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">No scans recorded on ${syncDate} for this cohort.</td></tr>`;
          } else {
            const esc = window.escapeHtml || (s => String(s == null ? '' : s));
            tbody.innerHTML = _currentEspScansList.map((s, idx) => `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="text-align: center; padding: 0.4rem;">
                  <input type="checkbox" class="esp-chk" value="${s.student_id}" checked>
                </td>
                <td style="font-weight: 700; padding: 0.4rem;">${String(s.class_roll_no || (idx + 1)).replace(/^#/, '')}</td>
                <td style="font-weight: 600; padding: 0.4rem;">${esc(s.full_name)}</td>
                <td style="font-family: var(--font-family-mono); font-size: 0.78rem; color: var(--text-muted); padding: 0.4rem;">${esc(s.official_enrollment_no || '—')}</td>
                <td style="text-align: right; font-family: var(--font-family-mono); font-size: 0.78rem; padding: 0.4rem;">${s.scan_time ? s.scan_time.slice(11, 19) : '—'}</td>
              </tr>
            `).join('');
          }
        }

        openModal('esp-confirm-modal');
      } else {
        toast(res?.error?.message || 'Failed to fetch ESP scans');
      }
    } catch (err) {
      toast('Error syncing ESP scans: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg><span>Sync ESP Scans</span>`;
      }
    }
  }

  function toggleAllEspCheckboxes(checked) {
    document.querySelectorAll('.esp-chk').forEach(cb => cb.checked = checked);
  }

  async function submitEspConfirmation() {
    const regId = classRegState.registerId;
    if (!regId) return;

    const date = ById('class-sync-date')?.value || classRegState.selectedDate || new Date().toISOString().slice(0, 10);
    const chks = Array.from(document.querySelectorAll('.esp-chk:checked'));
    const studentIds = chks.map(c => Number(c.value)).filter(Boolean);

    const btn = ById('btn-confirm-save-esp');
    if (btn) { btn.disabled = true; btn.innerText = 'Saving...'; }

    try {
      const res = await apiFetch(`/api/v1/attendance/registers/${regId}/confirm-day-attendance`, {
        method: 'POST',
        body: JSON.stringify({ date, student_ids: studentIds })
      });
      if (res && res.success) {
        toast(`Confirmed attendance for ${studentIds.length} students on ${date}!`);
        closeModal('esp-confirm-modal');
        loadClassRegister(classRegState.currentMonth);
      } else {
        toast(res?.error?.message || 'Failed to confirm attendance');
      }
    } catch (err) {
      toast('Error saving attendance: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Confirm & Add to Register</span>`;
      }
    }
  }

  // ─── REMARK POPOVER STATUS CONTROLLER ───
  function openRemarkMenu(e, studentId, currentStatus, studentName) {
    if (e) e.stopPropagation();
    classRegState.activePopoverStudentId = studentId;
    const popover = ById('remark-popover');
    if (!popover) return;

    const titleEl = ById('remark-popover-name');
    if (titleEl) titleEl.innerText = studentName || 'Student Status';

    const rect = e.currentTarget.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.left - 130;

    if (left + 235 > window.innerWidth - 10) left = window.innerWidth - 245;
    if (left < 10) left = 10;
    if (top + 180 > window.innerHeight - 10) top = rect.top - 175;

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    popover.style.display = 'block';
  }

  function closeRemarkMenu() {
    const popover = ById('remark-popover');
    if (popover) popover.style.display = 'none';
    classRegState.activePopoverStudentId = null;
  }

  async function applyStudentStatusChange(status) {
    const sId = classRegState.activePopoverStudentId;
    if (!sId || !classRegState.registerId) return;
    closeRemarkMenu();

    try {
      const res = await apiFetch(`/api/v1/faculty/registers/${classRegState.registerId}/student-status`, {
        method: 'PUT',
        body: JSON.stringify({ student_id: sId, status })
      });
      if (res && res.success) {
        toast(`Student status updated to ${status}`);
        loadClassRegister(classRegState.currentMonth);
      } else {
        toast(res?.error?.message || 'Could not update status');
      }
    } catch (err) {
      toast('Error updating status: ' + err.message);
    }
  }

  document.addEventListener('click', (e) => {
    const popover = ById('remark-popover');
    if (popover && popover.style.display !== 'none' && !popover.contains(e.target)) {
      closeRemarkMenu();
    }
  });

  // ─── MONTH NAVIGATION ───
  function navigateClassRegisterMonth(delta) {
    const grid = classRegState.gridData;
    const months = grid?.available_months || [];
    let curr = classRegState.currentMonth || new Date().toISOString().slice(0, 7);
    let idx = months.indexOf(curr);
    if (idx !== -1 && idx + delta >= 0 && idx + delta < months.length) {
      changeClassRegisterMonth(months[idx + delta]);
    } else {
      const [yr, mo] = curr.split('-').map(Number);
      const nextDt = new Date(yr, mo - 1 + delta, 1);
      const y = nextDt.getFullYear();
      const m = String(nextDt.getMonth() + 1).padStart(2, '0');
      changeClassRegisterMonth(`${y}-${m}`);
    }
  }

  function changeClassRegisterMonth(val) {
    if (!val) return;
    loadClassRegister(val);
  }

  function jumpToClassRegisterCurrentMonth() {
    const cur = new Date().toISOString().slice(0, 7);
    changeClassRegisterMonth(cur);
  }

  function openClassRegMonthPicker() {
    const picker = ById('hidden-class-reg-month-picker');
    if (picker && typeof picker.showPicker === 'function') {
      picker.showPicker();
    } else if (picker) {
      picker.click();
    }
  }

  function printClassRegister() {
    window.print();
  }

  /* ══════════════════════════════════════════════════════════════
     CLASSROOM LIVE ROLL CALL STUDIO
     ══════════════════════════════════════════════════════════════ */
  let _classRollSession = null;
  let _classRollPollInterval = null;

  async function openClassRollCallModal() {
    const modal = ById('classroom-roll-modal');
    if (!modal) return;
    modal.classList.add('active');

    const S = getS();
    const grp = S.group || {};
    const reg = classRegState.registerData || {};
    const esc = window.escapeHtml || (s => String(s == null ? '' : s));

    const subjEl = ById('class-rc-subject');
    if (subjEl) subjEl.textContent = reg.name || grp.name || 'Class Attendance';

    const dateEl = ById('class-rc-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Generate or fetch PIN & QR
    const regId = classRegState.registerId || grp.register_id || 1;
    try {
      const res = await apiFetch('/api/v1/attendance/roll-call/start', {
        method: 'POST',
        body: JSON.stringify({ register_id: regId })
      });
      if (res && res.success && res.data) {
        _classRollSession = res.data;
        const pinEl = ById('class-rc-pin-display');
        if (pinEl) pinEl.textContent = res.data.pin_code || '847291';

        const qrWrap = ById('class-rc-qr-code');
        if (qrWrap) {
          qrWrap.innerHTML = `
            <svg width="150" height="150" viewBox="0 0 100 100" fill="var(--text-main)">
              <rect width="100" height="100" fill="var(--bg-surface)" />
              <path d="M10 10h30v30h-30zM15 15v20h20v-20zM22 22h6v6h-6zM60 10h30v30h-30zM65 15v20h20v-20zM72 22h6v6h-6zM10 60h30v30h-30zM15 65v20h20v-20zM22 72h6v6h-6zM50 15h5v5h-5zM50 30h5v15h-5zM60 60h10v10h-10zM75 60h15v5h-15zM60 75h5v15h-5zM75 75h15v15h-15z" />
            </svg>
          `;
        }
      }
    } catch {
      const pinEl = ById('class-rc-pin-display');
      if (pinEl) pinEl.textContent = String(Math.floor(100000 + Math.random() * 900000));
    }

    // Populate manual roster view
    const tbody = ById('class-rc-manual-tbody');
    if (tbody && S.members && S.members.length) {
      tbody.innerHTML = S.members.map((m, i) => `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 0.45rem 0.6rem; font-weight: 700;">${m.class_roll_no || i + 1}</td>
          <td style="padding: 0.45rem 0.6rem;">${esc(m.full_name || '')}</td>
          <td style="padding: 0.45rem 0.6rem; text-align: center;">
            <button type="button" class="btn btn-secondary btn-xs" id="rc-btn-toggle-${m.student_id}" onclick="toggleRollCallStudent(${m.student_id})" style="font-size:0.75rem;padding:0.2rem 0.5rem;">
              Toggle Present
            </button>
          </td>
        </tr>
      `).join('');
    }
  }

  function closeClassRollCallModal() {
    const modal = ById('classroom-roll-modal');
    if (modal) modal.classList.remove('active');
    if (_classRollPollInterval) {
      clearInterval(_classRollPollInterval);
      _classRollPollInterval = null;
    }
    loadClassRegister(classRegState.currentMonth);
  }

  function switchClassRollCallMode(mode) {
    const liveBtn = ById('class-rc-tab-live');
    const manBtn = ById('class-rc-tab-manual');
    const liveView = ById('class-rc-view-live');
    const manView = ById('class-rc-view-manual');

    if (liveBtn) liveBtn.classList.toggle('active', mode === 'live');
    if (manBtn) manBtn.classList.toggle('active', mode === 'manual');
    if (liveView) liveView.style.display = mode === 'live' ? '' : 'none';
    if (manView) manView.style.display = mode === 'manual' ? '' : 'none';
  }

  function toggleRollCallStudent(studentId) {
    const btn = ById(`rc-btn-toggle-${studentId}`);
    if (btn) {
      const isPres = btn.classList.contains('btn-primary');
      btn.classList.toggle('btn-primary', !isPres);
      btn.classList.toggle('btn-secondary', isPres);
      btn.textContent = isPres ? 'Absent' : 'Present';
    }
  }

  // ─── WINDOW EXPORTS ───
  window.classRegState = classRegState;
  window.loadClassRegister = loadClassRegister;
  window.renderClassRegisterHeader = renderClassRegisterHeader;
  window.renderClassRegisterMatrix = renderClassRegisterMatrix;
  window.renderMobileCompactMatrix = renderMobileCompactMatrix;
  window.toggleDigitalPen = toggleDigitalPen;
  window.toggleClassCellAttendance = toggleDigitalPen; // backward-compat alias
  window.toggleSelectAllMatrixStudents = toggleSelectAllMatrixStudents;
  window.onMatrixStudentSelectionChange = onMatrixStudentSelectionChange;
  window.deselectAllMatrixStudents = deselectAllMatrixStudents;
  window.updateMatrixBulkBar = updateMatrixBulkBar;
  window.toggleSelectAllMobileStudents = toggleSelectAllMobileStudents;
  window.onMobileStudentSelectionChange = onMobileStudentSelectionChange;
  window.deselectAllMobileStudents = deselectAllMobileStudents;
  window.updateMobileBulkBar = updateMobileBulkBar;
  window.bulkMarkAttendance = bulkMarkAttendance;
  window.addNewClassForDay = addNewClassForDay;
  window.setMobilePeriodFilter = setMobilePeriodFilter;
  window.toggleMobileRegisterMode = toggleMobileRegisterMode;
  window.onSyncDateChange = onSyncDateChange;
  window.openAddSessionModal = openAddSessionModal;
  window.createClassSession = createClassSession;
  window.checkClassEspStatus = checkClassEspStatus;
  window.triggerClassEspDaySync = triggerClassEspDaySync;
  window.toggleAllEspCheckboxes = toggleAllEspCheckboxes;
  window.submitEspConfirmation = submitEspConfirmation;
  window.openRemarkMenu = openRemarkMenu;
  window.closeRemarkMenu = closeRemarkMenu;
  window.applyStudentStatusChange = applyStudentStatusChange;
  window.navigateClassRegisterMonth = navigateClassRegisterMonth;
  window.changeClassRegisterMonth = changeClassRegisterMonth;
  window.jumpToClassRegisterCurrentMonth = jumpToClassRegisterCurrentMonth;
  window.openClassRegMonthPicker = openClassRegMonthPicker;
  window.printClassRegister = printClassRegister;
  window.openClassRollCallModal = openClassRollCallModal;
  window.closeClassRollCallModal = closeClassRollCallModal;
  window.switchClassRollCallMode = switchClassRollCallMode;
  window.toggleRollCallStudent = toggleRollCallStudent;

})();

