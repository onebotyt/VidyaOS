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
    mobilePeriod: 'ALL', // 'ALL' | 1 | 2 | 3...
    mobileSearchQuery: '',
    activePopoverStudentId: null,
    hasAddedSecondClass: false,
    selectedMatrixStudents: new Set(),
    selectedMobileStudents: new Set(),
    groupRegisters: [],
    loading: false
  };

  async function loadClassRegister(month) {
    try {
      const S = getS();
      const groupId = Number(S.groupId);

      const syncDate = ById('class-sync-date');
      if (syncDate && !syncDate.value) {
        syncDate.value = classRegState.selectedDate || new Date().toISOString().slice(0, 10);
      }

      // Fetch all registers to find those linked to this group or subject
      let groupRegisters = (Array.isArray(S.group?.registers) && S.group.registers.length > 0)
        ? [...S.group.registers]
        : [];

      if (groupRegisters.length === 0) {
        try {
          const listRes = await apiFetch('/faculty/registers');
          if (listRes && listRes.success && Array.isArray(listRes.data)) {
            groupRegisters = listRes.data.filter(r => (groupId && r.group_id === groupId) || (S.group?.subject_id && r.subject_id === S.group?.subject_id));
          }
        } catch (e) {
          console.warn('Could not fetch registers list:', e);
        }
      }
      classRegState.groupRegisters = groupRegisters;

      let regId = classRegState.registerId;
      if (!regId) {
        if (S.group?.register_id) {
          regId = S.group.register_id;
        } else if (groupRegisters.length > 0) {
          regId = groupRegisters[0].id;
        }
      }
      if (groupRegisters.length > 0 && !groupRegisters.some(r => r.id === regId)) {
        regId = groupRegisters[0].id;
      }

      if (!regId) {
        const body = ById('class-matrix-body');
        if (body) body.innerHTML = `<tr><td style="text-align:center;padding:2rem;color:var(--text-muted)">No attendance register linked to this subject classroom.</td></tr>`;
        return;
      }

      classRegState.registerId = regId;
      const qStr = month ? ('?month=' + encodeURIComponent(month)) : '';
      const res = await apiFetch('/faculty/registers/' + regId + qStr);
      if (res && res.success && res.data) {
        classRegState.registerData = res.data.register;
        classRegState.gridData = res.data.grid;
        classRegState.currentMonth = res.data.grid?.month || month || new Date().toISOString().slice(0, 7);

        document.body.classList.remove('mobile-full-ledger');
        renderClassRegisterHeader();
        renderRegisterScopeSwitcher();
        renderClassRegisterMatrix();
        renderMobileCompactMatrix();
        checkClassEspStatus();
      } else {
        const errMsg = res?.error?.message || 'Failed to load attendance register';
        console.warn('loadClassRegister error:', errMsg);
        const tbody = ById('class-matrix-body');
        if (tbody) {
          tbody.innerHTML = `<tr><td style="text-align:center;padding:2.5rem;color:var(--color-danger, #ef4444);">
            <div style="font-weight:600;margin-bottom:0.5rem;">Could not load attendance register</div>
            <div style="font-size:0.875rem;color:var(--text-muted);margin-bottom:1rem;">${errMsg}</div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.retryLoadClassRegister()" style="display:inline-flex;align-items:center;gap:0.4rem;">
              Retry
            </button>
          </td></tr>`;
        }
      }
    } catch (err) {
      console.error('loadClassRegister error:', err);
      const tbody = ById('class-matrix-body');
      if (tbody) {
        tbody.innerHTML = `<tr><td style="text-align:center;padding:2.5rem;color:var(--color-danger, #ef4444);">
          <div style="font-weight:600;margin-bottom:0.5rem;">Could not load attendance register</div>
          <div style="font-size:0.875rem;color:var(--text-muted);margin-bottom:1rem;">${err?.message || 'Server error occurred while loading register matrix.'}</div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.retryLoadClassRegister()" style="display:inline-flex;align-items:center;gap:0.4rem;">
            Retry
          </button>
        </td></tr>`;
      }
    }
  }

  function renderRegisterScopeSwitcher() {
    const rawRegs = classRegState.groupRegisters || [];
    const activeRegId = classRegState.registerId;

    const wrap = ById('class-reg-scope-switcher-wrap');
    const container = ById('class-reg-scope-pill-group');

    // Deduplicate registers by scope so duplicate Theory or duplicate Practical registers never render duplicate tabs
    const seenScopes = new Set();
    const regs = [];
    rawRegs.forEach(r => {
      const isPract = (r.session_type_scope || '').toUpperCase().includes('PRACT');
      const scopeKey = isPract ? 'PRACTICAL' : 'THEORY';
      if (!seenScopes.has(scopeKey)) {
        seenScopes.add(scopeKey);
        regs.push(r);
      }
    });

    if (regs.length <= 1) {
      if (wrap) wrap.style.display = 'none';
      return;
    }

    if (wrap) wrap.style.display = 'flex';

    const getScopeIcon = (scope) => {
      const s = (scope || 'THEORY').toUpperCase();
      if (s.includes('PRACT')) {
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M10 2v7.31L4.69 18.2A2 2 0 0 0 6.37 21h11.26a2 2 0 0 0 1.68-2.8L14 9.31V2"></path><line x1="8" y1="2" x2="16" y2="2"></line></svg>`;
      }
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
    };

    const buttonsHtml = regs.map(r => {
      const isActive = r.id === activeRegId;
      const isPract = (r.session_type_scope || '').toUpperCase().includes('PRACT');
      const label = isPract ? 'Practical' : 'Theory';
      return `
        <button type="button" class="reg-scope-btn ${isActive ? 'active' : ''}" onclick="switchGroupRegister(${r.id})" title="${r.name || (isPract ? 'Practical Register' : 'Theory Register')}">
          ${getScopeIcon(r.session_type_scope)}
          <span>${label}</span>
        </button>
      `;
    }).join('');

    if (container) container.innerHTML = buttonsHtml;
  }

  async function switchGroupRegister(regId) {
    if (!regId || classRegState.registerId === regId) return;
    classRegState.registerId = regId;
    classRegState.mobilePeriod = 'ALL';
    await loadClassRegister(classRegState.currentMonth);
  }

  function renderClassRegisterHeader() {
    const S = getS();
    const reg = classRegState.registerData || {};
    const grp = S.group || {};
    const esc = window.escapeHtml || (s => String(s == null ? '' : s));

    const titleEl = ById('class-reg-title');
    const rawTitle = reg.name || grp.name || 'Subject';
    const shortName = reg.short_name || grp.short_name || reg.subject_code || grp.subject_code || (rawTitle.split(/[\s-]+/).map(w => w[0]).join('').toUpperCase().slice(0, 6));
    if (titleEl) {
      titleEl.innerHTML = `<span class="subject-full-title">${esc(rawTitle)}</span><span class="subject-short-title">${esc(shortName)}</span>`;
      titleEl.title = rawTitle;
    }
    
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
      const mShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      monthDisplay.innerHTML = `<span class="month-full-name">${mNames[m - 1] || ''}</span><span class="month-short-name">${mShort[m - 1] || ''}</span> <span class="month-year-num">${y}</span>`;
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

    // Group month days and calculate period sub-columns without duplicating day headers
    const dayGroups = allDays.map(d => {
      const daySessions = finalizedSessions.filter(s => s.session_date === d.date);
      daySessions.sort((a, b) => (a.period_number || 1) - (b.period_number || 1));
      return {
        ...d,
        sessions: daySessions,
        colCount: Math.max(1, daySessions.length)
      };
    });

    const hasAnyMultiPeriod = dayGroups.some(dg => dg.colCount > 1);

    // Expand into individual period matrix columns for student mark lookup
    const matrixCols = [];
    dayGroups.forEach(dg => {
      if (dg.sessions.length > 0) {
        dg.sessions.forEach((s, sIdx) => {
          const pNum = s.period_number || (sIdx + 1);
          matrixCols.push({
            ...dg,
            period_number: pNum,
            session_id: s.id,
            session_label: s.label || `Period ${pNum}`,
            col_key: `${dg.date}_${pNum}`,
            session_key: `sess_${s.id}`,
            display_period: `P${pNum}`,
            display_title: `${dg.date} (${dg.day_name}) — Period ${pNum}${s.label ? ': ' + s.label : ''}`,
            is_multi: dg.colCount > 1
          });
        });
      } else {
        matrixCols.push({
          ...dg,
          period_number: 1,
          session_id: null,
          session_label: 'Period 1',
          col_key: dg.date,
          session_key: null,
          display_period: 'P1',
          display_title: `${dg.date} (${dg.day_name})${dg.holiday_label ? ' - ' + dg.holiday_label : ''}`,
          is_multi: false
        });
      }
    });

    const mNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const [yr, mo] = (grid.month || todayStr.slice(0, 7)).split('-').map(Number);
    const monthTitle = `${(mNames[mo - 1] || '').toUpperCase()} ${yr}`;

    const mainRowSpan = hasAnyMultiPeriod ? 3 : 2;

    // 1. TIER 1 THEAD: CHECKBOX, ROLL, NAME, DATES TITLE, ATTENDED & ABSENT TOTALS
    let headHtml = `
      <tr>
        <th class="sticky-col-0" rowspan="${mainRowSpan}" style="width: 32px; text-align: center; vertical-align: middle;">
          <input type="checkbox" id="matrix-check-all" onchange="toggleSelectAllMatrixStudents(this.checked)" title="Select all students">
        </th>
        <th class="sticky-col-1" rowspan="${mainRowSpan}" style="width: 36px; font-size: 0.65rem; padding: 0.2rem; text-align: center;">Roll<br>No.</th>
        <th class="print-only-col" rowspan="${mainRowSpan}" style="width: 105px; font-size: 0.65rem; padding: 0.2rem; text-align: center;">UBTER Reg. No.</th>
        <th class="print-only-col" rowspan="${mainRowSpan}" style="width: 95px; font-size: 0.65rem; padding: 0.2rem; text-align: center;">UBTER Roll No.</th>
        <th class="sticky-col-2" rowspan="${mainRowSpan}" style="width: 148px; min-width: 135px; max-width: 165px; font-size: 0.74rem; padding: 0.2rem 0.45rem; text-align: left;">Name</th>
        <th colspan="${matrixCols.length}" style="background: var(--table-th-bg); color: var(--table-th-color); font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.25rem; text-align: center;">
          DATES OF LECTURE — ${monthTitle}
        </th>
        <th class="sticky-r-att-total" rowspan="${mainRowSpan}" style="background: var(--col-att-group-bg); color: var(--col-att-group-color); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.02em; padding: 0.2rem 0.25rem; width: 60px; text-align: center;" title="Total Attended Classes">
          TOTAL<br>ATTENDED
        </th>
        <th class="sticky-r-abs-total" rowspan="${mainRowSpan}" style="background: var(--col-abs-group-bg); color: var(--col-abs-group-color); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.02em; padding: 0.2rem 0.25rem; width: 56px; text-align: center;" title="Total Absent Classes">
          TOTAL<br>ABSENT
        </th>
      </tr>
      <tr>
    `;

    // 2. TIER 2: DAY DATE HEADERS (DAYS ARE NEVER DUPLICATED)
    dayGroups.forEach(dg => {
      const isNonInst = dg.is_holiday;
      const bg = isNonInst ? 'var(--col-holiday-bg)' : 'var(--table-bg)';
      const fg = isNonInst ? 'var(--col-holiday-color)' : 'var(--text-main)';
      const isSun = dg.day_name === 'Sunday';
      const fgColor = isSun ? 'var(--status-absent)' : fg;
      const isToday = dg.date === todayStr;

      const holidayTag = dg.holiday_label ? `
        <div style="font-size: 0.5rem; color: var(--col-holiday-color); font-weight: 800; line-height: 1; margin-top: 1px; text-transform: uppercase;" title="${esc(dg.holiday_label)}">
          ${esc(dg.holiday_label.length > 8 ? dg.holiday_label.slice(0, 7) + '…' : dg.holiday_label)}
        </div>
      ` : '';

      const spanAttr = dg.colCount > 1 ? `colspan="${dg.colCount}"` : (hasAnyMultiPeriod ? 'rowspan="2"' : '');
      const minW = dg.colCount > 1 ? `min-width: ${dg.colCount * 28}px;` : 'min-width: 28px;';
      const clickAction = `onclick="openHolidayModal('${dg.date}')" style="${minW} padding: 0.25rem 0.15rem; cursor: pointer; text-align: center;" title="Click to manage holiday / working status: ${esc(dg.date)} (${dg.day_name})"`;

      // Single period badge if single session with period_number > 1
      const singlePeriodBadge = (dg.colCount === 1 && dg.sessions.length === 1 && dg.sessions[0].period_number > 1) ? `
        <div style="font-size: 0.52rem; font-weight: 800; color: var(--color-primary); margin-top: 1px;">[P${dg.sessions[0].period_number}]</div>
      ` : '';

      if (isToday) {
        headHtml += `
          <th data-today="true" class="date-col date-col-today" ${spanAttr} ${clickAction}>
            <div style="font-size: 0.72rem; font-weight: 900; font-family: var(--font-family-mono); line-height: 1.1; color: var(--text-white);">${dg.day}</div>
            <div style="font-size: 0.52rem; font-weight: 800; opacity: 0.9; text-transform: uppercase; color: var(--text-white);">${dg.day_name.slice(0,3)}</div>
            ${singlePeriodBadge}
            ${holidayTag}
            <div class="today-marker-pill">TODAY</div>
          </th>
        `;
      } else {
        headHtml += `
          <th class="date-col ${isNonInst ? 'date-col-holiday' : ''}" ${spanAttr} ${clickAction}>
            <div style="font-size: 0.72rem; font-weight: 800; font-family: var(--font-family-mono); line-height: 1.1; color: ${fgColor};">${dg.day}</div>
            <div style="font-size: 0.52rem; font-weight: 600; opacity: 0.8; text-transform: uppercase; color: ${fgColor};">${dg.day_name.slice(0,3)}</div>
            ${singlePeriodBadge}
            ${holidayTag}
          </th>
        `;
      }
    });

    headHtml += `</tr>`;

    // 3. TIER 3: PERIOD SUB-ROW (ONLY WHEN A DAY HAS MULTIPLE PERIODS)
    if (hasAnyMultiPeriod) {
      headHtml += `<tr class="period-subcol-row">`;
      dayGroups.forEach(dg => {
        if (dg.colCount > 1) {
          dg.sessions.forEach((s, sIdx) => {
            const pNum = s.period_number || (sIdx + 1);
            const isToday = dg.date === todayStr;
            headHtml += `
              <th class="period-subcol-th ${isToday ? 'date-col-today' : ''}" style="min-width: 26px; padding: 0.15rem 0.1rem; text-align: center; font-size: 0.6rem; font-weight: 800; font-family: var(--font-family-mono); background: var(--bg-surface); color: ${isToday ? 'var(--text-white)' : 'var(--text-muted)'};" title="${esc(dg.date)} — Period ${pNum}${s.label ? ': ' + s.label : ''}">
                <span class="period-badge-subcol">P${pNum}</span>
              </th>
            `;
          });
        }
      });
      headHtml += `</tr>`;
    }

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
            const cleanLabel = (col.holiday_label || (col.day_name === 'Sunday' ? 'SUNDAY' : 'HOLIDAY')).trim().toUpperCase();
            const isTodaySpan = col.date === todayStr;
            cellsHtml += `
              <td rowspan="${totalStudents}" class="vertical-holiday-cell ${isTodaySpan ? 'date-col-today' : ''}" ${isTodaySpan ? 'data-today="true"' : ''} title="${esc(col.holiday_label || (col.day_name === 'Sunday' ? 'Sunday' : 'Holiday'))} (${col.date})">
                <div class="vertical-holiday-text">
                  <span class="vertical-arrow-cap">↑</span>
                  <span class="vertical-holiday-title">${esc(cleanLabel)}</span>
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
          cellsHtml += `<td class="date-cell" style="color: var(--text-muted); font-size: 0.7rem; text-align: center;${col.date === todayStr ? ' background: var(--color-primary-light);' : ''}">—</td>`;
        } else {
          const isTodayCell = col.date === todayStr;
          cellsHtml += `
            <td class="date-cell ${isTodayCell ? 'date-col-today' : ''}" ${isTodayCell ? 'data-today="true"' : ''} style="padding: 2px; text-align: center;">
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

      // Total Attended, Total Absent (Percentage removed per requirement)
      const summaryHtml = `
        <td class="sticky-r-att-total" style="font-weight: 800; color: var(--col-att-tt-color); background: var(--col-att-tt-bg); text-align: center; font-size: 0.8rem;">
          ${st.total_attended != null ? st.total_attended : '0'}
        </td>
        <td class="sticky-r-abs-total" style="font-weight: 800; color: var(--col-abs-tt-color); background: var(--col-abs-tt-bg); text-align: center; font-size: 0.8rem;">
          ${st.total_absent != null ? st.total_absent : '0'}
        </td>
      `;

      const rollBadge = isTransferred ? `<span class="badge-transferred" title="Transferred Student">T</span>` : '';
      const cleanRoll = String(st.class_roll_no != null && String(st.class_roll_no) !== 'null' ? st.class_roll_no : (st.roll_number ? st.roll_number : (sIdx + 1))).replace(/^#/, '');
      const nameContent = isTransferred ? `
        <div style="text-decoration: line-through; color: var(--status-absent); font-weight: 700; font-size: 0.74rem; line-height: 1.2; white-space: nowrap;">${esc(st.full_name)}</div>
        <div style="font-size: 0.58rem; color: var(--status-absent); border-top: 1px solid var(--border-color); margin-top: 2px; padding-top: 2px; white-space: nowrap;">TRANSFERRED</div>
      ` : `
        <div style="font-weight: 700; color: var(--text-main); font-size: 0.74rem; line-height: 1.2; white-space: nowrap;">${esc(st.full_name)}</div>
      `;

      return `
        <tr class="${rowClass}" id="matrix-st-${st.student_id}">
          <td class="sticky-col-0" style="text-align: center; vertical-align: middle;">
            <input type="checkbox" class="matrix-student-chk" data-student-id="${st.student_id}" ${isChecked ? 'checked' : ''} onchange="onMatrixStudentSelectionChange()">
          </td>
          <td class="sticky-col-1" style="text-align: center; font-weight: 800; background: var(--table-sticky-bg); color: var(--text-main); font-size: 0.72rem; padding: 0.2rem;">
            ${rollBadge}${cleanRoll}
          </td>
          <td class="print-only-col" style="text-align: center; font-size: 0.68rem; font-family: var(--font-family-mono); padding: 0.2rem;">
            ${esc(st.registration_no || '--')}
          </td>
          <td class="print-only-col" style="text-align: center; font-size: 0.68rem; font-family: var(--font-family-mono); padding: 0.2rem;">
            ${esc(st.enrollment_no || st.roll_number || '--')}
          </td>
          <td class="sticky-col-2" style="background: var(--table-sticky-bg); color: var(--text-main); padding: 0.2rem 0.45rem; width: 148px; min-width: 135px; max-width: 165px;" title="${esc(st.full_name)}">
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
          <th class="print-only-col"></th>
          <th class="print-only-col"></th>
          <th class="sticky-col-2" style="font-size: 0.68rem; color: var(--status-present); font-weight: 800; text-align: left; padding: 0.2rem 0.45rem; width: 148px; min-width: 135px; max-width: 165px; line-height: 1.1; background: var(--table-sticky-th-bg);" title="Total Present (P)">
            Total Present (P)
          </th>
      `;
      let footA = `
        <tr>
          <th class="sticky-col-0"></th>
          <th class="sticky-col-1"></th>
          <th class="print-only-col"></th>
          <th class="print-only-col"></th>
          <th class="sticky-col-2" style="font-size: 0.68rem; color: var(--status-absent); font-weight: 800; text-align: left; padding: 0.2rem 0.45rem; width: 148px; min-width: 135px; max-width: 165px; line-height: 1.1; background: var(--table-sticky-th-bg);" title="Total Absent (A)">
            Total Absent (A)
          </th>
      `;

      let totalMonthP = 0;
      let totalMonthA = 0;

      matrixCols.forEach(col => {
        const isTodayCol = col.date === todayStr;
        const todayStyle = isTodayCol ? ' background: var(--color-primary-light); border-left: 2px solid var(--color-primary); border-right: 2px solid var(--color-primary);' : '';

        if (nonInstructionalSpans.has(col.date)) {
          footP += `<td class="vertical-holiday-cell" style="font-size: 0.7rem; color: var(--col-holiday-color); text-align:center;${todayStyle}">—</td>`;
          footA += `<td class="vertical-holiday-cell" style="font-size: 0.7rem; color: var(--col-holiday-color); text-align:center;${todayStyle}">—</td>`;
          return;
        }

        const daily = (col.session_key && grid.daily_totals?.[col.session_key]) ||
                      (col.col_key && grid.daily_totals?.[col.col_key]) ||
                      grid.daily_totals?.[col.date];
        if (daily) {
          footP += `<td style="font-weight: 900; color: var(--status-present); font-size: 0.72rem; text-align:center;${todayStyle}">P: ${daily.present}</td>`;
          footA += `<td style="font-weight: 900; color: var(--status-absent); font-size: 0.72rem; text-align:center;${todayStyle}">A: ${daily.absent}</td>`;
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
          footP += `<td style="font-weight: 800; color: var(--status-present); font-size: 0.72rem; text-align:center;${todayStyle}">${colP || '—'}</td>`;
          footA += `<td style="font-weight: 800; color: var(--status-absent); font-size: 0.72rem; text-align:center;${todayStyle}">${colA || '—'}</td>`;
          totalMonthP += colP;
          totalMonthA += colA;
        }
      });

      footP += `
        <td class="sticky-r-att-total" style="font-weight: 900; color: var(--col-att-tt-color); background: var(--col-att-tt-bg); text-align: center;">${totalMonthP}</td>
        <td class="sticky-r-abs-total" style="text-align: center; color: var(--text-muted);">—</td>
      </tr>`;

      footA += `
        <td class="sticky-r-att-total" style="text-align: center; color: var(--text-muted);">—</td>
        <td class="sticky-r-abs-total" style="font-weight: 900; color: var(--col-abs-tt-color); background: var(--col-abs-tt-bg); text-align: center;">${totalMonthA}</td>
      </tr>`;

      tfoot.innerHTML = footP + footA;
    }

    // Update bulk bar state
    updateMatrixBulkBar();

    // Smooth scroll to today's column only if container actually overflows
    setTimeout(() => {
      const wrapper = ById('class-matrix-scroll-wrapper');
      const todayTh = thead?.querySelector('th[data-today="true"]');
      if (wrapper && todayTh && wrapper.scrollWidth > wrapper.clientWidth + 5) {
        const stickyRightWidth = 116 + 10;
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

    // Retrieve all sessions for target date (Default is strictly 1 class if none created)
    const finalized = grid.finalized_sessions || [];
    let rawDaySessions = finalized.filter(s => s.session_date === targetDate);
    rawDaySessions.sort((a, b) => (a.period_number || 1) - (b.period_number || 1));

    if (rawDaySessions.length === 0) {
      rawDaySessions = [{
        id: null,
        session_date: targetDate,
        period_number: 1,
        label: 'Period 1',
        session_type: classRegState.registerData?.session_type_scope || 'THEORY'
      }];
    }

    // Deduplicate by period_number so each period has a single distinct column & pill
    const uniquePeriodsMap = new Map();
    rawDaySessions.forEach(s => {
      const p = s.period_number || 1;
      if (!uniquePeriodsMap.has(p)) {
        uniquePeriodsMap.set(p, s);
      }
    });
    const daySessions = Array.from(uniquePeriodsMap.values());
    daySessions.sort((a, b) => (a.period_number || 1) - (b.period_number || 1));

    // Validate active period filter
    if (classRegState.mobilePeriod !== 'ALL') {
      const exists = daySessions.some(s => (s.period_number || 1) === classRegState.mobilePeriod);
      if (!exists) {
        classRegState.mobilePeriod = daySessions.length > 1 ? 'ALL' : (daySessions[0]?.period_number || 1);
      }
    }

    // Update Class / Period Bar Pills (Pure text P1, P2, All - Compact and Clean)
    const pillsContainer = ById('mobile-period-pills-container');
    if (pillsContainer) {
      if (daySessions.length <= 1) {
        const s0 = daySessions[0];
        const pNum = s0?.period_number || 1;
        const displayLabel = s0?.label || (s0?.session_type === 'PRACTICAL' ? 'Practical Lab' : `Period ${pNum}`);
        pillsContainer.innerHTML = `
          <button type="button" class="mobile-period-btn active" onclick="setMobilePeriodFilter(${pNum})" title="${esc(displayLabel)}">
            <span>P${pNum}</span>
          </button>
        `;
      } else {
        let pillsHtml = `
          <button type="button" class="mobile-period-btn ${classRegState.mobilePeriod === 'ALL' ? 'active' : ''}" onclick="setMobilePeriodFilter('ALL')" title="All Periods">
            <span>All</span>
          </button>
        `;
        daySessions.forEach(s => {
          const pNum = s.period_number || 1;
          const fullLabel = s.label || (s.session_type === 'PRACTICAL' ? 'Practical Lab' : `Period ${pNum}`);
          pillsHtml += `
            <button type="button" class="mobile-period-btn ${classRegState.mobilePeriod === pNum ? 'active' : ''}" onclick="setMobilePeriodFilter(${pNum})" title="Period ${pNum}: ${esc(fullLabel)}">
              <span>P${pNum}</span>
            </button>
          `;
        });
        pillsContainer.innerHTML = pillsHtml;
      }
    }

    // Update Remove Period Action Button (Only allowed for Period 2 and above, never Period 1)
    const delBtn = ById('btn-mobile-del-class');
    const delText = ById('btn-mobile-del-text');
    if (delBtn) {
      const currentPeriodNum = parseInt(classRegState.mobilePeriod, 10);
      if (classRegState.mobilePeriod !== 'ALL' && currentPeriodNum > 1) {
        const curSess = daySessions.find(s => (s.period_number || 1) === currentPeriodNum);
        if (curSess && curSess.id) {
          delBtn.style.display = 'inline-flex';
          if (delText) delText.textContent = `Remove P${currentPeriodNum}`;
          delBtn.onclick = () => confirmDeletePeriod(curSess.id, currentPeriodNum);
        } else {
          delBtn.style.display = 'none';
        }
      } else {
        delBtn.style.display = 'none';
      }
    }

    const addClassBtn = ById('btn-mobile-add-class');
    if (addClassBtn) {
      addClassBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Add Period</span>
      `;
    }

    // Determine displayed sessions for columns
    const displayedSessions = (classRegState.mobilePeriod === 'ALL')
      ? daySessions
      : daySessions.filter(s => (s.period_number || 1) === classRegState.mobilePeriod);
    const effectiveSessions = displayedSessions.length > 0 ? displayedSessions : [daySessions[0]];

    // Dynamic Thead Headers
    const theadTr = ById('mobile-compact-thead-tr');
    if (theadTr) {
      let thCols = `
        <th style="width: 28px; text-align: center; vertical-align: middle;">
          <input type="checkbox" id="mobile-check-all" onchange="toggleSelectAllMobileStudents(this.checked)" title="Select all students">
        </th>
        <th style="width: 36px; text-align: center;">Roll</th>
        <th style="text-align: left; padding-left: 0.5rem;">Student Name</th>
      `;
      effectiveSessions.forEach((s, idx) => {
        const pNum = s.period_number || (idx + 1);
        const colWidth = effectiveSessions.length > 2 ? '48px' : '54px';
        const sType = (s.session_type || 'THEORY').toUpperCase();
        const typeBadge = sType.startsWith('PRACT') ? 'LAB' : (sType.startsWith('TUT') ? 'TUT' : 'TH');
        thCols += `
          <th style="width: ${colWidth}; text-align: center; padding: 0.3rem 0.15rem;" title="Period ${pNum}: ${esc(s.label || '')} (${sType})">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 3px;">
              <span style="font-weight: 800; font-size: 0.74rem; color: var(--text-main); line-height: 1;">P${pNum}</span>
              ${s.id && pNum > 1 ? `
                <button type="button" class="btn-period-del-mini" onclick="confirmDeletePeriod(${s.id}, ${pNum}, event)" title="Remove Period ${pNum}">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              ` : ''}
            </div>
            <div style="font-size: 0.58rem; color: var(--color-primary); font-weight: 700; margin-top: 1px; letter-spacing: 0.02em;">${typeBadge}</div>
          </th>
        `;
      });
      thCols += `
        <th id="m-th-attended" style="width: 52px; text-align: center;" title="Total classes attended this month">Attended</th>
      `;
      theadTr.innerHTML = thCols;
    }

    // Filter Students by Mobile Search Query
    const q = (classRegState.mobileSearchQuery || '').trim().toLowerCase();
    const studentsToRender = q ? grid.students.filter(st => {
      const name = (st.full_name || '').toLowerCase();
      const roll = String(st.class_roll_no != null ? st.class_roll_no : (st.roll_number || '')).toLowerCase();
      const reg = String(st.registration_no || st.official_enrollment_no || '').toLowerCase();
      return name.includes(q) || roll.includes(q) || reg.includes(q);
    }) : grid.students;

    if (!studentsToRender.length) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="${effectiveSessions.length + 4}" style="text-align: center; padding: 2rem; color: var(--text-muted);">No students matching "${esc(q)}"</td></tr>`;
      return;
    }

    let todayPCount = 0;
    let todayACount = 0;

    let rowsHtml = studentsToRender.map((st, idx) => {
      const marks = st.attendance_marks || {};
      const isTransferred = st.enrollment_status === 'TRANSFERRED';
      const isChecked = classRegState.selectedMobileStudents.has(st.student_id);

      let periodButtonsHtml = '';
      effectiveSessions.forEach((s, sIdx) => {
        const pNum = s.period_number || (sIdx + 1);
        const pKey = s.id ? `sess_${s.id}` : (pNum > 1 ? `${targetDate}_${pNum}` : targetDate);
        const markVal = marks[pKey] || (pNum === 1 ? marks[targetDate] : null) || null;
        const markStatus = typeof markVal === 'string' ? markVal : (markVal?.status || null);

        let pChar = '·';
        let pCls = 'empty';
        if (markStatus === 'PRESENT') {
          pChar = 'P';
          pCls = 'p';
          todayPCount++;
        } else if (markStatus === 'ABSENT') {
          pChar = 'A';
          pCls = 'a';
          todayACount++;
        }

        periodButtonsHtml += `
          <td style="text-align: center; padding: 0.25rem 0.2rem;">
            <button type="button" class="mobile-pen-btn ${pCls}" id="m-btn-p${pNum}-${st.student_id}"
                    onclick="toggleDigitalPen('${targetDate}', ${st.student_id}, this, ${pNum}, ${s.id || 'null'})"
                    title="${esc(st.full_name)} (Period ${pNum}: ${esc(s.label || '')}). Tap to toggle: Present → Absent → Clear">
              ${pChar}
            </button>
          </td>
        `;
      });

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
          ${periodButtonsHtml}
          <td style="text-align: center;">
            <span class="mobile-att-count" title="${st.total_attended || 0} classes attended">
              ${st.total_attended != null ? st.total_attended : 0}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    if (tbody) tbody.innerHTML = rowsHtml;

    // Update Live Headcount Summary in Mobile Header
    const pSummary = ById('mobile-summary-p');
    if (pSummary) pSummary.textContent = todayPCount;
    const aSummary = ById('mobile-summary-a');
    if (aSummary) aSummary.textContent = todayACount;

    updateMobileBulkBar();
  }

  // ─── DIGITAL PEN INTERACTION (Tap to toggle: Present -> Absent -> Clear, No Late) ───
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
      if (cnt) cnt.textContent = String(size);
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

  // ─── ADD ATTENDANCE PERIOD (THEORY, PRACTICAL, OR CUSTOM) ───
  function addNewClassForDay() {
    openAddPeriodModal();
  }

  function openAddPeriodModal(customDate) {
    const reg = classRegState.registerData || {};
    const targetDate = customDate || classRegState.selectedDate || ById('class-sync-date')?.value || new Date().toISOString().slice(0, 10);

    const dateInp = ById('sess-date');
    if (dateInp) {
      dateInp.value = targetDate;
      dateInp.onchange = () => updateModalAutoSlot();
    }

    // Auto-calculate slot
    updateModalAutoSlot(targetDate);

    // Default preset based on register scope
    const defaultType = (reg.session_type_scope === 'PRACTICAL') ? 'PRACTICAL' : 'THEORY';
    selectPeriodTypePreset(defaultType);

    // Reset optional time fields (collapsed by default)
    const startTimeInp = ById('sess-start-time');
    if (startTimeInp) startTimeInp.value = '';
    const endTimeInp = ById('sess-end-time');
    if (endTimeInp) endTimeInp.value = '';
    const timeFields = ById('period-time-fields');
    if (timeFields) timeFields.style.display = 'none';
    const timeLabel = ById('period-time-toggle-label');
    if (timeLabel) timeLabel.textContent = '+ Add class timing (optional)';

    openModal('add-session-modal');
  }

  function openAddSessionModal() {
    openAddPeriodModal();
  }

  function updateModalAutoSlot(optDate) {
    const targetDate = optDate || ById('sess-date')?.value || classRegState.selectedDate || new Date().toISOString().slice(0, 10);
    const grid = classRegState.gridData || {};
    const finalized = grid.finalized_sessions || [];
    const daySessions = finalized.filter(s => s.session_date === targetDate);
    const maxPeriod = daySessions.reduce((max, s) => Math.max(max, s.period_number || 1), 0);
    const nextSlot = Math.min(Math.max(daySessions.length + 1, maxPeriod + 1), 8);

    const hiddenPeriod = ById('sess-period');
    if (hiddenPeriod) hiddenPeriod.value = String(nextSlot);

    const slotBadgeText = ById('sess-auto-slot-text');
    if (slotBadgeText) slotBadgeText.textContent = `Auto: Period ${nextSlot}`;

    const labelInp = ById('sess-label');
    const type = ById('sess-type')?.value || 'THEORY';
    if (labelInp && (labelInp.value.startsWith('Theory Class') || !labelInp.value.trim())) {
      labelInp.value = nextSlot === 1 ? 'Theory Class' : `Theory Class (Period ${nextSlot})`;
    }

    const existWrap = ById('modal-existing-periods-wrap');
    const existList = ById('modal-existing-periods-list');
    if (existWrap && existList) {
      if (daySessions.length > 0) {
        existWrap.style.display = 'block';
        existList.innerHTML = daySessions.map(s => {
          const pNum = s.period_number || 1;
          const sLabel = s.label || `Period ${pNum}`;
          return `
            <div style="display:inline-flex; align-items:center; gap:4px; padding:2px 6px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-xs, 4px); font-size:0.7rem; color:var(--text-main);">
              <strong>P${pNum}</strong>: ${esc(sLabel)}
              ${pNum > 1 ? `
                <button type="button" class="btn-period-del-mini" onclick="confirmDeletePeriod(${s.id}, ${pNum}, event)" title="Remove Period ${pNum}" style="margin-left:3px;">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              ` : ''}
            </div>
          `;
        }).join('');
      } else {
        existWrap.style.display = 'none';
        existList.innerHTML = '';
      }
    }
  }

  function togglePeriodTimeInputs() {
    const fields = ById('period-time-fields');
    const label = ById('period-time-toggle-label');
    if (!fields) return;
    if (fields.style.display === 'none') {
      fields.style.display = 'block';
      if (label) label.textContent = '– Hide class timing';
      ById('sess-start-time')?.focus();
    } else {
      fields.style.display = 'none';
      if (label) label.textContent = '+ Add class timing (optional)';
    }
  }

  function selectPeriodTypePreset(type) {
    const hiddenType = ById('sess-type');
    if (hiddenType) hiddenType.value = (type === 'CUSTOM' ? 'THEORY' : type);

    const cardTheory = ById('type-card-theory');
    const cardPractical = ById('type-card-practical');
    const cardCustom = ById('type-card-custom');
    if (cardTheory) cardTheory.classList.toggle('active', type === 'THEORY');
    if (cardPractical) cardPractical.classList.toggle('active', type === 'PRACTICAL');
    if (cardCustom) cardCustom.classList.toggle('active', type === 'CUSTOM');

    const slot = ById('sess-period')?.value || '1';
    const labelInp = ById('sess-label');
    if (labelInp) {
      if (type === 'THEORY') {
        labelInp.value = slot === '1' ? 'Theory Class' : `Theory Class (Period ${slot})`;
      } else if (type === 'PRACTICAL') {
        labelInp.value = `Practical Lab`;
      } else if (type === 'CUSTOM') {
        labelInp.value = '';
        labelInp.placeholder = 'e.g. Tutorial, Remedial, Guest Lecture, Viva...';
        setTimeout(() => labelInp.focus(), 80);
      }
    }
  }

  function applyPeriodQuickName(name, type) {
    selectPeriodTypePreset(type);
    const labelInp = ById('sess-label');
    if (labelInp) {
      labelInp.value = name;
      labelInp.focus();
    }
  }

  function onPeriodSlotChange(slot) {
    const labelInp = ById('sess-label');
    if (labelInp && (labelInp.value.startsWith('Theory Class') || !labelInp.value.trim())) {
      labelInp.value = slot === '1' ? 'Theory Class' : `Theory Class (Period ${slot})`;
    }
  }

  async function createClassSession(e) {
    if (e) e.preventDefault();
    const regId = classRegState.registerId;
    if (!regId) {
      toast('Register not loaded. Please try again.');
      return;
    }

    const session_date = ById('sess-date')?.value;
    const label = ById('sess-label')?.value?.trim();
    let session_type = ById('sess-type')?.value || 'THEORY';
    if (session_type === 'CUSTOM') session_type = 'THEORY';
    const period_number = parseInt(ById('sess-period')?.value || '1', 10);
    const startTimeVal = ById('sess-start-time')?.value;
    const endTimeVal = ById('sess-end-time')?.value;

    if (!session_date) {
      toast('Please select a session date');
      return;
    }
    if (!label) {
      toast('Please enter a period title or name');
      ById('sess-label')?.focus();
      return;
    }

    const payload = {
      session_date,
      label,
      session_type,
      period_number,
      start_time: startTimeVal ? `${session_date} ${startTimeVal}:00` : `${session_date} 09:00:00`
    };
    if (endTimeVal) payload.end_time = `${session_date} ${endTimeVal}:00`;

    const submitBtn = ById('btn-submit-add-period');
    const origHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Creating...</span>';
    }

    try {
      const res = await apiFetch(`/api/v1/faculty/registers/${regId}/sessions`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res && res.success) {
        toast(`Added ${label}!`);
        closeModal('add-session-modal');
        classRegState.mobilePeriod = period_number;
        classRegState.selectedDate = session_date;
        const syncDate = ById('class-sync-date');
        if (syncDate) syncDate.value = session_date;
        await loadClassRegister(classRegState.currentMonth);
      } else {
        toast(res?.error?.message || 'Failed to add class period');
      }
    } catch (err) {
      toast('Error adding period: ' + err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHtml;
      }
    }
  }

  async function confirmDeletePeriod(sessionId, periodNum, evt) {
    if (evt && evt.stopPropagation) evt.stopPropagation();
    const regId = classRegState.registerId || classRegState.registerData?.id;
    if (!regId || !sessionId) {
      toast('Cannot delete: session not found');
      return;
    }

    const pNumber = parseInt(periodNum, 10) || 1;
    if (pNumber <= 1) {
      toast('Period 1 is the main class and cannot be removed');
      return;
    }

    const dateStr = classRegState.selectedDate || 'this date';
    const pLabel = `Period ${pNumber}`;
    const msg = `Remove ${pLabel} for ${dateStr}?\n\nAll attendance records associated with this period will be deleted.`;
    if (!confirm(msg)) return;

    try {
      const res = await apiFetch(`/api/v1/faculty/registers/${regId}/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      if (res && res.success) {
        toast(`Removed ${pLabel}!`);
        closeModal('add-session-modal');
        classRegState.mobilePeriod = 1;
        await loadClassRegister(classRegState.currentMonth);
      } else {
        toast(res?.error?.message || 'Failed to remove period');
      }
    } catch (err) {
      toast('Error removing period: ' + err.message);
    }
  }

  function confirmDeleteCurrentPeriod() {
    const grid = classRegState.gridData || {};
    const finalized = grid.finalized_sessions || [];
    const dateStr = classRegState.selectedDate || ById('class-sync-date')?.value || new Date().toISOString().slice(0, 10);
    const daySessions = finalized.filter(s => s.session_date === dateStr);
    let target = null;
    const currentPeriodNum = parseInt(classRegState.mobilePeriod, 10);
    if (classRegState.mobilePeriod !== 'ALL' && currentPeriodNum > 1) {
      target = daySessions.find(s => (s.period_number || 1) === currentPeriodNum);
    }
    if (target && target.id) {
      confirmDeletePeriod(target.id, target.period_number || currentPeriodNum);
    } else {
      toast('Please select Period 2 or higher to remove');
    }
  }


  function filterMobileStudents(query) {
    classRegState.mobileSearchQuery = (query || '').trim().toLowerCase();
    const clearBtn = ById('mobile-search-clear-btn');
    if (clearBtn) {
      clearBtn.style.display = classRegState.mobileSearchQuery ? 'inline-flex' : 'none';
    }
    renderMobileCompactMatrix();
  }

  function clearMobileStudentSearch() {
    const inp = ById('mobile-student-search-input');
    if (inp) inp.value = '';
    filterMobileStudents('');
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
  let _classRollManualStatus = {}; // student_id -> 'PRESENT' | 'ABSENT'

  function updateRollCallSummaryCounts() {
    const totalEl = ById('rc-stat-total');
    const presEl = ById('rc-stat-present');
    const absEl = ById('rc-stat-absent');
    const students = (classRegState.gridData?.students && classRegState.gridData.students.length)
      ? classRegState.gridData.students
      : (getS().members || []);
    
    let presentCount = 0;
    let absentCount = 0;
    students.forEach(st => {
      const sid = st.student_id || st.id;
      const status = _classRollManualStatus[sid] || 'PRESENT';
      if (status === 'PRESENT') presentCount++;
      else absentCount++;
    });

    if (totalEl) totalEl.textContent = students.length;
    if (presEl) presEl.textContent = presentCount;
    if (absEl) absEl.textContent = absentCount;
  }

  function filterClassRollCallRoster(q) {
    const query = (q || '').trim().toLowerCase();
    const rows = document.querySelectorAll('#class-rc-manual-tbody tr');
    rows.forEach(tr => {
      const text = tr.textContent.toLowerCase();
      tr.style.display = (!query || text.includes(query)) ? '' : 'none';
    });
  }

  function bulkSetRollCallStatus(status) {
    const students = (classRegState.gridData?.students && classRegState.gridData.students.length)
      ? classRegState.gridData.students
      : (getS().members || []);
    
    students.forEach(st => {
      const sid = st.student_id || st.id;
      _classRollManualStatus[sid] = status;
      const btn = ById(`rc-btn-toggle-${sid}`);
      if (btn) {
        if (status === 'PRESENT') {
          btn.className = 'rc-status-btn present';
          btn.textContent = 'Present';
        } else {
          btn.className = 'rc-status-btn absent';
          btn.textContent = 'Absent';
        }
      }
    });
    updateRollCallSummaryCounts();
  }

  function toggleRollCallStudent(studentId) {
    const current = _classRollManualStatus[studentId] || 'PRESENT';
    const next = current === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    _classRollManualStatus[studentId] = next;

    const btn = ById(`rc-btn-toggle-${studentId}`);
    if (btn) {
      if (next === 'PRESENT') {
        btn.className = 'rc-status-btn present';
        btn.textContent = 'Present';
      } else {
        btn.className = 'rc-status-btn absent';
        btn.textContent = 'Absent';
      }
    }
    updateRollCallSummaryCounts();
  }

  async function openClassRollCallModal() {
    const modal = ById('classroom-roll-modal');
    if (!modal) return;
    if (typeof openModal === 'function') {
      openModal('classroom-roll-modal');
    } else {
      modal.classList.add('open');
      modal.style.display = 'flex';
    }

    const S = getS();
    const grp = S.group || {};
    const reg = classRegState.registerData || {};
    const esc = window.escapeHtml || (s => String(s == null ? '' : s));

    const subjEl = ById('class-rc-subject');
    if (subjEl) subjEl.textContent = reg.name || grp.name || 'Class Attendance';

    const dateEl = ById('class-rc-date');
    const todayStr = new Date().toISOString().slice(0, 10);
    const dateVal = classRegState.selectedDate || todayStr;
    if (dateEl) {
      dateEl.textContent = new Date(dateVal + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Resolve register ID
    let regId = classRegState.registerId || grp.register_id;
    if (!regId) {
      try {
        const listRes = await apiFetch('/faculty/registers');
        if (listRes && listRes.success && Array.isArray(listRes.data)) {
          const found = listRes.data.find(r => r.group_id === Number(S.groupId) || r.subject_id === grp.subject_id);
          if (found) regId = found.id;
          else if (listRes.data.length > 0) regId = listRes.data[0].id;
        }
      } catch (_) {}
    }
    if (regId) classRegState.registerId = regId;

    // Resolve or create live session
    let sess = null;
    if (classRegState.gridData?.finalized_sessions) {
      sess = classRegState.gridData.finalized_sessions.find(s => s.session_date === dateVal);
    }

    if (!sess && regId) {
      try {
        const sListRes = await apiFetch(`/api/v1/faculty/registers/${regId}/sessions`);
        if (sListRes && sListRes.success && Array.isArray(sListRes.data)) {
          sess = sListRes.data.find(s => s.session_date === dateVal);
        }
        if (!sess) {
          const sScope = (reg.session_type_scope || grp.component || 'THEORY').toUpperCase();
          const normSessionType = sScope.includes('PRACT') ? 'PRACTICAL' : 'THEORY';
          const createRes = await apiFetch(`/api/v1/faculty/registers/${regId}/sessions`, {
            method: 'POST',
            body: JSON.stringify({
              session_date: dateVal,
              session_type: normSessionType,
              label: 'Class 1 (Period 1)',
              period_number: 1,
              start_time: `${dateVal} 09:00:00`
            })
          });
          if (createRes && createRes.success && createRes.data) {
            sess = createRes.data;
          }
        }
      } catch (e) {
        console.warn('Session resolution note:', e);
      }
    }

    if (sess) {
      sess.id = sess.id || sess.session_id;
    }
    _classRollSession = sess;

    // Ensure session is open
    if (sess && sess.id && sess.state === 'DRAFT') {
      try {
        await apiFetch(`/api/v1/attendance/sessions/${sess.id}/state`, {
          method: 'PUT',
          body: JSON.stringify({ state: 'OPEN' })
        });
        sess.state = 'OPEN';
      } catch (_) {}
    }

    // Generate dynamic PIN and dynamic QR Code
    let pinCode = '';
    let qrPayload = '';
    if (sess && sess.id) {
      try {
        const pinRes = await apiFetch(`/api/v1/attendance/sessions/${sess.id}/pin`, { method: 'POST' });
        if (pinRes && pinRes.success && pinRes.data?.pin) {
          pinCode = pinRes.data.pin;
        }
      } catch (_) {}

      try {
        const qrRes = await apiFetch(`/api/v1/attendance/sessions/${sess.id}/qr`, { method: 'POST' });
        if (qrRes && qrRes.success && qrRes.data?.payload) {
          qrPayload = qrRes.data.payload;
        }
      } catch (_) {}
    }

    if (!pinCode) {
      pinCode = String(Math.floor(100000 + Math.random() * 900000));
    }
    const pinEl = ById('class-rc-pin-display');
    if (pinEl) pinEl.textContent = pinCode;

    const qrWrap = ById('class-rc-qr-code');
    if (qrWrap) {
      if (qrPayload) {
        const encoded = encodeURIComponent(qrPayload);
        qrWrap.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encoded}&margin=2" alt="Dynamic Attendance QR Code" style="width:125px;height:125px;display:block;border-radius:var(--radius-sm);">`;
      } else {
        qrWrap.innerHTML = `
          <svg width="120" height="120" viewBox="0 0 100 100" fill="var(--text-main)">
            <rect width="100" height="100" fill="var(--bg-surface)" />
            <path d="M10 10h30v30h-30zM15 15v20h20v-20zM22 22h6v6h-6zM60 10h30v30h-30zM65 15v20h20v-20zM72 22h6v6h-6zM10 60h30v30h-30zM15 65v20h20v-20zM22 72h6v6h-6zM50 15h5v5h-5zM50 30h5v15h-5zM60 60h10v10h-10zM75 60h15v5h-15zM60 75h5v15h-5zM75 75h15v15h-15z" />
          </svg>
        `;
      }
    }

    // Total students count
    const students = (classRegState.gridData?.students && classRegState.gridData.students.length)
      ? classRegState.gridData.students
      : (S.members || []);
    const totalStudents = students.length;

    const totalEl = ById('class-rc-total-count');
    if (totalEl) totalEl.textContent = totalStudents;

    const footDateEl = ById('class-rc-footer-date');
    if (footDateEl) footDateEl.textContent = dateVal;

    // Reset manual status and search
    _classRollManualStatus = {};
    students.forEach(st => {
      const sid = st.student_id || st.id;
      _classRollManualStatus[sid] = 'PRESENT';
    });

    const searchInput = ById('class-rc-search');
    if (searchInput) searchInput.value = '';

    // Render manual roster
    const tbody = ById('class-rc-manual-tbody');
    if (tbody) {
      if (students.length) {
        tbody.innerHTML = students.map((m, i) => {
          const roll = String(m.class_roll_no != null && String(m.class_roll_no) !== 'null' ? m.class_roll_no : (m.roll_number || i + 1)).replace(/^#/, '');
          const name = m.full_name || m.name || 'Student';
          const sid = m.student_id || m.id;
          return `
            <tr style="border-bottom: 1px solid var(--border-color);" id="rc-roster-row-${sid}">
              <td style="padding: 0.45rem 0.6rem; font-weight: 700; text-align: center; color: var(--text-main);">${roll}</td>
              <td style="padding: 0.45rem 0.6rem; font-weight: 600; color: var(--text-main);">${esc(name)}</td>
              <td style="padding: 0.45rem 0.6rem; text-align: center;">
                <button type="button" class="rc-status-btn present" id="rc-btn-toggle-${sid}" onclick="toggleRollCallStudent(${sid})">
                  Present
                </button>
              </td>
            </tr>
          `;
        }).join('');
      } else {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:1.5rem;color:var(--text-muted);">No enrolled students found in cohort roster.</td></tr>`;
      }
    }
    updateRollCallSummaryCounts();

    // Setup live student claims polling
    if (_classRollPollInterval) {
      clearInterval(_classRollPollInterval);
      _classRollPollInterval = null;
    }
    if (sess && sess.id) {
      const pollLiveCheckins = async () => {
        try {
          const cRes = await apiFetch(`/api/v1/attendance/sessions/${sess.id}/self-attendance`);
          if (cRes && cRes.success && Array.isArray(cRes.data)) {
            const checkins = cRes.data;
            const countEl = ById('class-rc-live-count');
            if (countEl) countEl.textContent = checkins.length;

            const pct = totalStudents > 0 ? Math.min(100, Math.round((checkins.length / totalStudents) * 100)) : 0;
            const pctEl = ById('class-rc-live-pct');
            if (pctEl) pctEl.textContent = `${pct}%`;

            const barEl = ById('class-rc-progress-bar');
            if (barEl) barEl.style.width = `${pct}%`;

            const feedEl = ById('class-rc-live-feed-list');
            if (feedEl) {
              if (checkins.length === 0) {
                feedEl.innerHTML = `
                  <div style="text-align:center;padding:1rem;color:var(--text-muted);font-size:0.78rem;">
                    Waiting for students to check in via QR or PIN...
                  </div>
                `;
              } else {
                feedEl.innerHTML = checkins.map(chk => {
                  const sName = chk.student_name || chk.full_name || 'Student';
                  const initials = sName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const timeStr = chk.created_at ? new Date(chk.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
                  const methodStr = chk.auth_method === 'PIN' ? 'PIN' : (chk.auth_method === 'QR' ? 'QR Code' : 'Mobile Check-in');
                  return `
                    <div class="rollcall-feed-item">
                      <div class="rollcall-feed-avatar">${esc(initials)}</div>
                      <div class="rollcall-feed-details">
                        <div class="rollcall-feed-name">${esc(sName)}</div>
                        <div class="rollcall-feed-time">Verified via ${methodStr} • ${timeStr}</div>
                      </div>
                      <span style="background:var(--status-present-bg);color:var(--status-present);font-size:0.68rem;font-weight:800;padding:0.2rem 0.5rem;border-radius:var(--radius-pill);">CHECKED IN</span>
                    </div>
                  `;
                }).join('');
              }
            }

            // Sync checked-in students to manual roster
            checkins.forEach(chk => {
              const sid = chk.student_id;
              if (sid) {
                _classRollManualStatus[sid] = 'PRESENT';
                const btn = ById(`rc-btn-toggle-${sid}`);
                if (btn && !btn.classList.contains('present')) {
                  btn.className = 'rc-status-btn present';
                  btn.textContent = 'Present';
                }
              }
            });
            updateRollCallSummaryCounts();
          }
        } catch (_) {}
      };
      pollLiveCheckins();
      _classRollPollInterval = setInterval(pollLiveCheckins, 3000);
    }
  }

  function closeClassRollCallModal() {
    const modal = ById('classroom-roll-modal');
    if (modal) {
      if (typeof closeModal === 'function') {
        closeModal('classroom-roll-modal');
      } else {
        modal.classList.remove('open');
        modal.style.display = 'none';
      }
    }
    if (_classRollPollInterval) {
      clearInterval(_classRollPollInterval);
      _classRollPollInterval = null;
    }
    if (typeof loadClassRegister === 'function') {
      loadClassRegister(classRegState.currentMonth);
    }
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

  async function submitClassRollCall() {
    const regId = classRegState.registerId;
    if (!regId) {
      toast('Register not found');
      return;
    }
    const S = getS();
    const dateVal = ById('class-sync-date')?.value || classRegState.selectedDate || new Date().toISOString().slice(0, 10);
    const isLive = ById('class-rc-tab-live')?.classList.contains('active');
    const saveBtn = ById('btn-save-class-rollcall');
    const origHtml = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerText = 'Saving...';
    }

    try {
      let presentStudentIds = [];
      const students = (classRegState.gridData?.students && classRegState.gridData.students.length)
        ? classRegState.gridData.students
        : (S.members || []);

      if (isLive) {
        const sessId = _classRollSession?.id || _classRollSession?.session_id;
        if (sessId) {
          try {
            const cRes = await apiFetch(`/api/v1/attendance/sessions/${sessId}/self-attendance`);
            if (cRes && cRes.success && Array.isArray(cRes.data)) {
              presentStudentIds = cRes.data.map(req => Number(req.student_id)).filter(Boolean);
            }
          } catch (_) {}
        }
        // Fallback to manual status if no live check-ins or combined
        if (!presentStudentIds.length) {
          students.forEach(st => {
            const sid = st.student_id || st.id;
            if (_classRollManualStatus[sid] === 'PRESENT') {
              presentStudentIds.push(Number(sid));
            }
          });
        }
      } else {
        students.forEach(st => {
          const sid = st.student_id || st.id;
          if (_classRollManualStatus[sid] === 'PRESENT') {
            presentStudentIds.push(Number(sid));
          }
        });
      }

      const res = await apiFetch(`/api/v1/attendance/registers/${regId}/confirm-day-attendance`, {
        method: 'POST',
        body: JSON.stringify({
          date: dateVal,
          student_ids: presentStudentIds
        })
      });

      if (res && res.success) {
        toast(`Confirmed attendance for ${presentStudentIds.length} students on ${dateVal}!`);
        closeClassRollCallModal();
        if (typeof loadClassRegister === 'function') {
          await loadClassRegister(classRegState.currentMonth);
        }
      } else {
        toast(res?.error?.message || 'Failed to save attendance');
      }
    } catch (err) {
      toast('Error saving attendance: ' + err.message);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = origHtml;
      }
    }
  }

  // ─── HOLIDAY & WORKING DAYS CONTROLLER ───
  let _selectedHolidayType = 'HOLIDAY';

  function openHolidayModal(dateStr) {
    const modal = ById('manage-holiday-modal');
    if (!modal) return;
    if (typeof openModal === 'function') {
      openModal('manage-holiday-modal');
    } else {
      modal.classList.add('open');
      modal.style.display = 'flex';
    }

    const targetDate = dateStr || classRegState.selectedDate || ById('class-sync-date')?.value || new Date().toISOString().slice(0, 10);
    const dateInput = ById('holiday-modal-date') || ById('holiday-modal-date-picker');
    if (dateInput) {
      dateInput.value = targetDate;
      onHolidayModalDateChange(targetDate);
    }
  }

  function closeHolidayModal() {
    const modal = ById('manage-holiday-modal');
    if (modal) {
      if (typeof closeModal === 'function') {
        closeModal('manage-holiday-modal');
      } else {
        modal.classList.remove('open');
        modal.style.display = 'none';
      }
    }
  }

  function onHolidayModalDateChange(dateVal) {
    if (!dateVal) return;
    const dObj = classRegState.gridData?.month_days?.find(d => d.date === dateVal);
    
    let isHoliday = false;
    let label = '';
    
    if (dObj) {
      isHoliday = Boolean(dObj.is_holiday);
      label = dObj.holiday_label || '';
    } else {
      const dt = new Date(dateVal + 'T00:00:00');
      const dayOfWeek = dt.getDay();
      const dNum = dt.getDate();
      const isSun = dayOfWeek === 0;
      const is2ndSat = dayOfWeek === 6 && dNum >= 8 && dNum <= 14;
      isHoliday = isSun || is2ndSat;
      label = isSun ? 'Sunday' : (is2ndSat ? 'Second Saturday' : '');
    }

    const statusBanner = ById('holiday-current-status-banner');
    const statusText = ById('holiday-current-status-text') || ById('holiday-modal-date-display');
    if (statusText) {
      if (isHoliday) {
        if (statusBanner) {
          statusBanner.style.background = 'var(--col-holiday-bg)';
          statusBanner.style.borderColor = 'var(--col-holiday-color)';
        }
        statusText.style.color = 'var(--col-holiday-color)';
        statusText.textContent = `Marked as Holiday${label ? ' (' + label + ')' : ''}`;
      } else {
        if (statusBanner) {
          statusBanner.style.background = 'var(--bg-surface)';
          statusBanner.style.borderColor = 'var(--border-color)';
        }
        statusText.style.color = 'var(--color-primary)';
        statusText.textContent = `Marked as Active Working Day`;
      }
    }

    selectHolidayType(isHoliday ? 'HOLIDAY' : 'WORKING', false);
    const reasonInput = ById('holiday-modal-reason') || ById('holiday-name-input');
    if (reasonInput) reasonInput.value = label || '';
  }

  function selectHolidayType(type, clearReason = true) {
    const isHol = String(type || '').toUpperCase().startsWith('HOL');
    _selectedHolidayType = isHol ? 'HOLIDAY' : 'WORKING';

    const btnHol = ById('btn-type-holiday') || ById('btn-holiday-off');
    const btnWrk = ById('btn-type-working') || ById('btn-holiday-work');
    const reasonGroup = ById('holiday-reason-group') || ById('holiday-name-wrap');

    if (btnHol && btnWrk) {
      if (_selectedHolidayType === 'HOLIDAY') {
        btnHol.className = 'btn btn-sm btn-primary';
        btnHol.style.border = '2px solid var(--color-primary)';
        btnHol.style.background = 'var(--color-primary)';
        btnHol.style.color = 'var(--text-white)';

        btnWrk.className = 'btn btn-sm btn-secondary';
        btnWrk.style.border = '1px solid var(--border-color)';
        btnWrk.style.background = 'var(--bg-surface)';
        btnWrk.style.color = 'var(--text-main)';

        if (reasonGroup) reasonGroup.style.display = 'block';
      } else {
        btnWrk.className = 'btn btn-sm btn-primary';
        btnWrk.style.border = '2px solid var(--status-present)';
        btnWrk.style.background = 'var(--status-present)';
        btnWrk.style.color = 'var(--text-white)';

        btnHol.className = 'btn btn-sm btn-secondary';
        btnHol.style.border = '1px solid var(--border-color)';
        btnHol.style.background = 'var(--bg-surface)';
        btnHol.style.color = 'var(--text-main)';

        if (reasonGroup) reasonGroup.style.display = 'none';
        if (clearReason) {
          const reasonInput = ById('holiday-modal-reason') || ById('holiday-name-input');
          if (reasonInput) reasonInput.value = '';
        }
      }
    }
  }

  async function submitSaveHoliday() {
    const regId = classRegState.registerId;
    if (!regId) {
      toast('Register not found');
      return;
    }
    const dateVal = (ById('holiday-modal-date') || ById('holiday-modal-date-picker'))?.value;
    if (!dateVal) {
      toast('Please select a date');
      return;
    }

    const isWorking = _selectedHolidayType === 'WORKING';
    const reason = (ById('holiday-modal-reason') || ById('holiday-name-input'))?.value?.trim();
    const saveBtn = ById('btn-save-holiday') || ById('btn-save-holiday-config');
    const origText = saveBtn ? saveBtn.textContent : '';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    try {
      const res = await apiFetch(`/api/v1/faculty/registers/${regId}/holidays`, {
        method: 'POST',
        body: JSON.stringify({
          date: dateVal,
          holiday_name: isWorking ? null : (reason || 'Holiday'),
          is_working_day: isWorking ? 1 : 0
        })
      });

      if (res && res.success) {
        toast(isWorking ? `Date ${dateVal} set as Working Day!` : `Date ${dateVal} marked as Holiday!`);
        closeHolidayModal();
        if (typeof loadClassRegister === 'function') {
          await loadClassRegister(classRegState.currentMonth);
        }
      } else {
        toast(res?.error?.message || 'Failed to save date status');
      }
    } catch (err) {
      toast('Error updating date status: ' + err.message);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = origText;
      }
    }
  }

  async function resetDayHolidayDefault() {
    const regId = classRegState.registerId;
    if (!regId) {
      toast('Register not found');
      return;
    }
    const dateVal = (ById('holiday-modal-date') || ById('holiday-modal-date-picker'))?.value;
    if (!dateVal) {
      toast('Please select a date');
      return;
    }

    const resetBtn = ById('btn-reset-holiday') || ById('btn-reset-holiday-default');
    const origText = resetBtn ? resetBtn.textContent : '';
    if (resetBtn) {
      resetBtn.disabled = true;
      resetBtn.textContent = 'Resetting...';
    }

    try {
      const res = await apiFetch(`/api/v1/faculty/registers/${regId}/holidays/${dateVal}`, {
        method: 'DELETE'
      });

      if (res && res.success) {
        toast(`Date ${dateVal} reset to system default!`);
        closeHolidayModal();
        if (typeof loadClassRegister === 'function') {
          await loadClassRegister(classRegState.currentMonth);
        }
      } else {
        toast(res?.error?.message || 'Failed to reset date');
      }
    } catch (err) {
      toast('Error resetting date: ' + err.message);
    } finally {
      if (resetBtn) {
        resetBtn.disabled = false;
        resetBtn.textContent = origText;
      }
    }
  }

  // ─── ATTENDANCE EXPORT STUDIO CONTROLLER ───
  function openAttendanceExportModal() {
    const modal = ById('modal-export-attendance');
    if (!modal) return;

    // Populate available months
    const monthSelect = ById('export-month-select');
    if (monthSelect) {
      monthSelect.innerHTML = '';
      const availMonths = (classRegState.gridData?.available_months && classRegState.gridData.available_months.length > 0)
        ? classRegState.gridData.available_months
        : [classRegState.currentMonth || new Date().toISOString().slice(0, 7)];
      
      const distinctMonths = Array.from(new Set(availMonths)).filter(Boolean).sort().reverse();
      distinctMonths.forEach(m => {
        if (!m || typeof m !== 'string' || !m.includes('-')) return;
        const opt = document.createElement('option');
        opt.value = m;
        const [yr, mo] = m.split('-').map(Number);
        const d = new Date(yr, mo - 1, 1);
        opt.textContent = d.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (m === classRegState.currentMonth) opt.selected = true;
        monthSelect.appendChild(opt);
      });
    }

    // Set default day for Single Day export
    const dayInput = ById('export-day-input');
    if (dayInput && !dayInput.value) {
      dayInput.value = new Date().toISOString().slice(0, 10);
    }

    // Pre-select scope component matching active register
    const activeReg = (classRegState.groupRegisters || []).find(r => r.id === classRegState.registerId) || {};
    const defaultScope = activeReg.component || 'BOTH';
    selectExportScope(defaultScope);

    // Default to Excel and All Months
    selectExportFormat('xlsx');
    handleExportRangeChange('all_months');

    if (typeof openModal === 'function') {
      openModal('modal-export-attendance');
    } else {
      modal.classList.add('open');
      modal.style.display = 'flex';
    }
  }

  function closeAttendanceExportModal() {
    if (typeof closeModal === 'function') {
      closeModal('modal-export-attendance');
    } else {
      const modal = ById('modal-export-attendance');
      if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
      }
    }
  }

  function selectExportFormat(fmt) {
    ['xlsx', 'pdf', 'doc'].forEach(f => {
      const card = ById(`card-format-${f}`);
      if (card) {
        if (f === fmt) {
          card.classList.add('active');
          const radio = card.querySelector('input[type="radio"]');
          if (radio) radio.checked = true;
        } else {
          card.classList.remove('active');
        }
      }
    });
  }

  function handleExportRangeChange(range) {
    const ranges = ['overview_only', 'all_months', 'month', 'week', 'day'];
    ranges.forEach(r => {
      const key = r === 'overview_only' ? 'overview' : (r === 'all_months' ? 'all' : r);
      const label = ById(`label-range-${key}`);
      const radio = ById(`range-opt-${key}`);
      if (label) {
        if (r === range) {
          label.classList.add('active');
          if (radio) radio.checked = true;
        } else {
          label.classList.remove('active');
        }
      }
    });

    // Contextual inputs: only visible and active when Specific Month or Specific Day is selected
    const monthRow = ById('export-context-month-row');
    const dayRow = ById('export-context-day-row');
    if (monthRow) monthRow.style.display = (range === 'month') ? 'flex' : 'none';
    if (dayRow) dayRow.style.display = (range === 'day') ? 'flex' : 'none';

    updateExportRangeHint(range);
  }

  function updateExportRangeHint(range) {
    const hintText = ById('export-range-hint-text');
    if (!hintText) return;

    const hints = {
      'all_months': '<b>Full Semester:</b> Complete Day 1–31 daily matrix for all months + final summary.',
      'overview_only': '<b>Summary Only:</b> Student attendance % and totals only (no daily day-by-day grids).',
      'week': '<b>Current Week:</b> Monday to Saturday daily attendance for the active week.',
      'month': '<b>Selected Month:</b> Day 1–31 ledger for the chosen month only.',
      'day': '<b>Single Day:</b> Daily session check-in roster for the chosen date.'
    };

    hintText.innerHTML = hints[range] || hints['all_months'];
  }

  function selectExportScope(scope) {
    const scopeVal = ById('export-scope-val');
    if (scopeVal) scopeVal.value = scope;

    const pills = {
      'BOTH': ById('btn-scope-both'),
      'THEORY': ById('btn-scope-theory'),
      'PRACTICAL': ById('btn-scope-practical')
    };

    Object.keys(pills).forEach(s => {
      if (pills[s]) {
        if (s === scope) pills[s].classList.add('active');
        else pills[s].classList.remove('active');
      }
    });
  }

  async function executeAttendanceExport() {
    const regId = classRegState.registerId || (classRegState.groupRegisters && classRegState.groupRegisters[0]?.id) || (window.S && window.S.group && window.S.group.register_id);
    if (!regId) {
      toast('No active register found to export');
      return;
    }

    const fmtRadio = document.querySelector('input[name="export-format"]:checked');
    const format = fmtRadio ? fmtRadio.value : 'xlsx';

    const rangeRadio = document.querySelector('input[name="export-range"]:checked');
    const range = rangeRadio ? rangeRadio.value : 'all_months';

    const monthSelect = ById('export-month-select');
    const targetMonth = monthSelect ? monthSelect.value : (classRegState.currentMonth || new Date().toISOString().slice(0, 7));

    const dayInput = ById('export-day-input');
    const targetDay = dayInput ? dayInput.value : new Date().toISOString().slice(0, 10);

    const scopeVal = ById('export-scope-val');
    const scope = scopeVal ? scopeVal.value : 'BOTH';

    const btn = ById('btn-execute-export');
    const lbl = ById('lbl-export-btn');
    const originalText = lbl ? lbl.innerText : 'Download Report';

    try {
      if (btn) btn.disabled = true;
      if (lbl) lbl.innerText = 'Generating report...';

      const token = typeof getToken === 'function' ? getToken() : (localStorage.getItem('access_token') || '');
      const deviceId = typeof getDeviceId === 'function' ? getDeviceId() : (typeof localStorage !== 'undefined' ? localStorage.getItem('vidyaos_device_id') : null);

      const payload = {
        format,
        range,
        month: targetMonth,
        day: targetDay,
        scope
      };

      const resp = await fetch(`/api/v1/faculty/registers/${regId}/export/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(deviceId ? { 'X-Device-Id': deviceId } : {})
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        let errMessage = 'Failed to export attendance report';
        try {
          const errData = await resp.json();
          if (errData?.error?.message) errMessage = errData.error.message;
        } catch (e) {}
        throw new Error(errMessage);
      }

      // Handle download
      let filename = `Attendance_Register_${format.toUpperCase()}.${format}`;
      const disposition = resp.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const blob = await resp.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      closeAttendanceExportModal();
      toast('Attendance report generated successfully!');
    } catch (err) {
      toast('Export error: ' + (err.message || 'Unknown error'));
    } finally {
      if (btn) btn.disabled = false;
      if (lbl) lbl.innerText = originalText;
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
  window.openAddPeriodModal = openAddPeriodModal;
  window.selectPeriodTypePreset = selectPeriodTypePreset;
  window.applyPeriodQuickName = applyPeriodQuickName;
  window.onPeriodSlotChange = onPeriodSlotChange;
  window.filterMobileStudents = filterMobileStudents;
  window.clearMobileStudentSearch = clearMobileStudentSearch;
  window.setMobilePeriodFilter = setMobilePeriodFilter;
  window.toggleMobileRegisterMode = toggleMobileRegisterMode;
  window.onSyncDateChange = onSyncDateChange;
  window.openAddSessionModal = openAddSessionModal;
  window.createClassSession = createClassSession;
  window.switchGroupRegister = switchGroupRegister;
  window.togglePeriodTimeInputs = togglePeriodTimeInputs;
  window.updateModalAutoSlot = updateModalAutoSlot;
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
  window.submitClassRollCall = submitClassRollCall;
  window.filterClassRollCallRoster = filterClassRollCallRoster;
  window.bulkSetRollCallStatus = bulkSetRollCallStatus;
  window.updateRollCallSummaryCounts = updateRollCallSummaryCounts;
  window.openHolidayModal = openHolidayModal;
  window.closeHolidayModal = closeHolidayModal;
  window.onHolidayModalDateChange = onHolidayModalDateChange;
  window.selectHolidayType = selectHolidayType;
  window.submitSaveHoliday = submitSaveHoliday;
  window.resetDayHolidayDefault = resetDayHolidayDefault;
  window.confirmDeletePeriod = confirmDeletePeriod;
  window.confirmDeleteCurrentPeriod = confirmDeleteCurrentPeriod;
  window.openAttendanceExportModal = openAttendanceExportModal;
  window.closeAttendanceExportModal = closeAttendanceExportModal;
  window.selectExportFormat = selectExportFormat;
  window.handleExportRangeChange = handleExportRangeChange;
  window.selectExportScope = selectExportScope;
  window.executeAttendanceExport = executeAttendanceExport;
  window.retryLoadClassRegister = () => loadClassRegister(classRegState.currentMonth);

})();

