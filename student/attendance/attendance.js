/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: ATTENDANCE
 * frontend/student/attendance/attendance.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['STUDENT']);

    // State variables
    let allSubjects = [];
    let currentSubjectId = null;
    let currentSubjectName = '';
    let currentSubjectCode = '';
    let subjectAttendanceHistory = {}; // subject_id -> { 'YYYY-MM-DD': 'PRESENT'|'ABSENT' }
    
    // Calendar view state (defaulting to September 2026 or current date)
    let selectedYear = 2026;
    let selectedMonth = 8; // September (0-indexed: 8 = September)

    // ─── 1. Page Initialization ─────────────────────────────────
    async function initPage() {
      // Initialize to current date if 2026 or current year
      const now = new Date();
      if (now.getFullYear() >= 2026) {
        selectedYear = now.getFullYear();
        selectedMonth = now.getMonth();
      } else {
        selectedYear = 2026;
        selectedMonth = 8; // September 2026
      }
      syncDropdowns();

      await Promise.all([
        checkLiveSession(),
        loadAttendanceData()
      ]);
    }

    // ─── 2. Check Live Session & PIN Submission ─────────────────
    let activeSession = null;
    async function checkLiveSession() {
      try {
        const res = await fetchApi('/attendance/sessions?state=OPEN');
        if (res.success && res.data && res.data.length > 0) {
          activeSession = res.data[0];
          document.getElementById('live-subject-name').innerText = activeSession.subject_name;
          document.getElementById('live-teacher-name').innerText = 
            `Teacher: ${activeSession.teacher_name} • ${activeSession.label || activeSession.session_type}`;
          document.getElementById('live-session-banner').style.display = 'block';
        } else {
          document.getElementById('live-session-banner').style.display = 'none';
        }
      } catch (err) {
        document.getElementById('live-session-banner').style.display = 'none';
      }
    }

    async function submitLivePin() {
      if (!activeSession) return;
      const pin = document.getElementById('live-pin-input').value.trim();
      if (!pin || pin.length !== 6) {
        showToast('Please enter a valid 6-digit session PIN.', 'warning');
        return;
      }

      try {
        const res = await fetchApi(`/attendance/sessions/${activeSession.id}/self-attendance`, {
          method: 'POST',
          body: JSON.stringify({ method: 'PIN', pin })
        });
        if (res.success) {
          showToast('Attendance submitted successfully!', 'success');
          document.getElementById('live-session-banner').style.display = 'none';
          await loadAttendanceData();
        }
      } catch (err) {
        showToast(err.message || 'Failed to submit attendance', 'error');
      }
    }

    // ─── 3. Load Student Attendance Data ────────────────────────
    async function loadAttendanceData() {
      try {
        const [statsRes, subsRes, historyRes, profRes] = await Promise.all([
          fetchApi('/students/me/attendance/stats'),
          fetchApi('/students/me/attendance/subjects'),
          fetchApi('/students/me/attendance?limit=500'),
          fetchApi('/students/me')
        ]);

        // Student identity
        if (profRes && profRes.success && profRes.data) {
          const s = profRes.data;
          const badge = document.getElementById('student-identity-badge');
          if (badge) {
            const rollTxt = s.class_roll_no ? `${s.class_roll_no}` : '—';
            const regTxt = s.registration_no || '—';
            badge.innerHTML = `Roll: <strong>${rollTxt}</strong> • UBTER Reg: <strong>${regTxt}</strong>`;
            badge.style.display = 'inline-flex';
          }
        }

        // 1. Overall stats
        if (statsRes.success) {
          const stats = statsRes.data;
          const pct = stats.current_percentage || 0;
          const isDef = pct < 75.0 && stats.total_conducted > 0;
          
          document.getElementById('overall-pct').innerText = `${pct}%`;
          document.getElementById('overall-counts').innerText = `${stats.total_attended || 0} / ${stats.total_conducted || 0} Sessions`;
          document.getElementById('overall-msg').innerText = stats.prediction?.message || 'Attendance is within institutional requirements.';

          const card = document.getElementById('standing-card');
          const badge = document.getElementById('standing-badge');
          const pctEl = document.getElementById('overall-pct');

          if (isDef) {
            card.style.borderLeftColor = 'var(--status-absent)';
            badge.className = 'badge badge-absent';
            badge.innerText = 'Attendance Deficit (< 75%)';
            pctEl.style.color = 'var(--status-absent)';
          } else {
            card.style.borderLeftColor = 'var(--status-present)';
            badge.className = 'badge badge-present';
            badge.innerText = 'Eligible for Exams';
            pctEl.style.color = 'var(--status-present)';
          }
        }

        // 2. Build attendance history lookup by subject and date
        subjectAttendanceHistory = {};
        if (historyRes.success && historyRes.data) {
          historyRes.data.forEach(item => {
            const dateStr = String(item.start_time).substring(0, 10);
            const subId = item.subject_id;
            const subCode = item.subject_code;
            if (subId) {
              if (!subjectAttendanceHistory[subId]) subjectAttendanceHistory[subId] = {};
              subjectAttendanceHistory[subId][dateStr] = item.attendance_status;
            }
            if (subCode) {
              if (!subjectAttendanceHistory[subCode]) subjectAttendanceHistory[subCode] = {};
              subjectAttendanceHistory[subCode][dateStr] = item.attendance_status;
            }
          });
        }

        // 3. Render Subject Cards
        if (subsRes.success) {
          allSubjects = subsRes.data || [];
          renderSubjectCards(allSubjects);
          handleDeepLinkScroll();
        }
      } catch (err) {
        console.error('Failed to load attendance data:', err);
      }
    }

    function handleDeepLinkScroll() {
      const urlParams = new URLSearchParams(window.location.search);
      const targetId = urlParams.get('subject_id') || urlParams.get('group_id');
      if (targetId) {
        const targetEl = document.getElementById(`subject-card-${targetId}`);
        if (targetEl) {
          setTimeout(() => {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetEl.style.boxShadow = '0 0 0 3px var(--color-primary)';
            setTimeout(() => {
              targetEl.style.transition = 'box-shadow 1s ease';
              targetEl.style.boxShadow = '';
            }, 3000);
          }, 300);
        }
      }
    }

    // ─── 4. Render Subject Cards ────────────────────────────────
    function renderSubjectCards(subjects) {
      const container = document.getElementById('subjects-grid');
      if (!subjects.length) {
        container.innerHTML = `
          <div class="card" style="text-align: center; padding: 2.5rem; color: var(--text-muted); grid-column: 1 / -1;">
            No enrolled courses found for your cohort.
          </div>
        `;
        return;
      }

      container.innerHTML = subjects.map(s => {
        const isDef = s.percentage < 75.0 && s.conducted > 0;

        return `
          <div class="subject-card" id="subject-card-${s.subject_id || s.group_id || ''}" style="border-top-color: ${isDef ? 'var(--status-absent)' : 'var(--color-primary)'};">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <div>
                  <span class="badge badge-pending" style="font-family: var(--font-family-mono); font-size: 0.725rem;">${s.subject_code}</span>
                  <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-top: 0.25rem;">${s.subject_name}</h3>
                </div>
                <span class="pct-badge ${isDef ? 'pct-defaulter' : 'pct-safe'}" style="font-size: 1.05rem; padding: 0.25rem 0.6rem;">
                  ${s.percentage}%
                </span>
              </div>

              <!-- Progress Bar -->
              <div class="pct-track" title="Attendance: ${s.percentage}% (Threshold: 75%)">
                <div class="pct-marker-75" title="75% Threshold"></div>
                <div class="pct-fill" style="width: ${Math.min(100, s.percentage)}%; background: ${isDef ? 'var(--status-absent)' : 'var(--status-present)'};"></div>
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 0.825rem; color: var(--text-muted); margin-bottom: 1.25rem;">
                <div>Attended: <strong style="color: var(--text-main);">${s.attended}</strong> / ${s.conducted}</div>
                <div>Missed: <strong style="color: var(--status-absent);">${s.absent}</strong></div>
              </div>
            </div>

            <div>
              <button type="button" class="btn btn-primary" style="width: 100%; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;" onclick="openCalendarModal(${s.subject_id || s.group_id || 0}, '${(s.subject_name || '').replace(/'/g, "\\'")}', '${s.subject_code || ''}')">
                <span style="display:inline-flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> View Attendance Calendar</span>
                <span>→</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // ─── 5. Calendar Modal & Navigation ─────────────────────────
    function openCalendarModal(subjectId, subjectName, subjectCode) {
      currentSubjectId = subjectId;
      currentSubjectName = subjectName;
      currentSubjectCode = subjectCode;

      document.getElementById('cal-sub-code').innerText = subjectCode;
      document.getElementById('cal-sub-name').innerText = subjectName;

      // Detect if there's recorded attendance in September 2026 or another month
      const historyMap = subjectAttendanceHistory[subjectId] || subjectAttendanceHistory[subjectCode] || {};
      const recordDates = Object.keys(historyMap);
      if (recordDates.length > 0) {
        // Find most recent session date to auto-focus that month
        recordDates.sort();
        const latest = recordDates[recordDates.length - 1]; // e.g. "2026-09-12"
        const [y, m] = latest.split('-').map(n => parseInt(n, 10));
        if (y && m) {
          selectedYear = y;
          selectedMonth = m - 1; // 0-indexed
          syncDropdowns();
        }
      }

      renderCalendarGrid();
      document.getElementById('calendar-modal').classList.add('open');
    }

    function closeCalendarModal() {
      document.getElementById('calendar-modal').classList.remove('open');
    }

    function syncDropdowns() {
      document.getElementById('cal-month-select').value = selectedMonth;
      document.getElementById('cal-year-select').value = selectedYear;
    }

    function onMonthSelectChange() {
      selectedMonth = parseInt(document.getElementById('cal-month-select').value, 10);
      renderCalendarGrid();
    }

    function onYearSelectChange() {
      selectedYear = parseInt(document.getElementById('cal-year-select').value, 10);
      renderCalendarGrid();
    }

    function prevMonth() {
      selectedMonth--;
      if (selectedMonth < 0) {
        selectedMonth = 11;
        selectedYear--;
      }
      syncDropdowns();
      renderCalendarGrid();
    }

    function nextMonth() {
      selectedMonth++;
      if (selectedMonth > 11) {
        selectedMonth = 0;
        selectedYear++;
      }
      syncDropdowns();
      renderCalendarGrid();
    }

    // ─── 6. Real Calendar Grid Rendering ────────────────────────
    function renderCalendarGrid() {
      const grid = document.getElementById('calendar-grid');
      // Keep weekday headers
      const weekdayHeaders = `
        <div class="cal-weekday sunday">Sun</div>
        <div class="cal-weekday">Mon</div>
        <div class="cal-weekday">Tue</div>
        <div class="cal-weekday">Wed</div>
        <div class="cal-weekday">Thu</div>
        <div class="cal-weekday">Fri</div>
        <div class="cal-weekday">Sat</div>
      `;

      const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 for Sun, 1 for Mon...
      const totalDaysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate(); // 28..31

      // Today's date check
      const today = new Date();
      const isCurrentMonthToday = (today.getFullYear() === selectedYear && today.getMonth() === selectedMonth);
      const todayDate = today.getDate();

      // Attendance records for current subject
      const records = subjectAttendanceHistory[currentSubjectId] || subjectAttendanceHistory[currentSubjectCode] || {};

      let cellsHtml = '';
      let monthConducted = 0;
      let monthAttended = 0;
      let monthAbsent = 0;

      // 1. Leading empty cells
      for (let i = 0; i < firstDayIndex; i++) {
        cellsHtml += `<div class="cal-cell empty"></div>`;
      }

      // 2. Day cells
      for (let day = 1; day <= totalDaysInMonth; day++) {
        const dayOfWeek = (firstDayIndex + day - 1) % 7;
        const isSunday = (dayOfWeek === 0);
        
        // Format YYYY-MM-DD
        const mStr = String(selectedMonth + 1).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        const dateKey = `${selectedYear}-${mStr}-${dStr}`;

        const attStatus = records[dateKey]; // 'PRESENT', 'ABSENT', 'LATE', or undefined

        let cellClass = 'cal-cell';
        let statusBadge = '';

        if (attStatus === 'PRESENT' || attStatus === 'LATE') {
          cellClass += ' attended-present';
          statusBadge = '<span class="cal-cell-label">Present</span>';
          monthConducted++;
          monthAttended++;
        } else if (attStatus === 'ABSENT') {
          cellClass += ' attended-absent';
          statusBadge = '<span class="cal-cell-label">Absent</span>';
          monthConducted++;
          monthAbsent++;
        } else if (isSunday) {
          cellClass += ' sunday-holiday';
          statusBadge = '<span class="cal-cell-label">Holiday</span>';
        }

        if (isCurrentMonthToday && day === todayDate) {
          cellClass += ' today-ring';
        }

        cellsHtml += `
          <div class="${cellClass}" title="${dateKey}: ${attStatus || (isSunday ? 'Sunday Holiday' : 'No Class')}">
            <span>${day}</span>
            ${statusBadge}
          </div>
        `;
      }

      // 3. Trailing empty cells to complete the row
      const totalRenderedCells = firstDayIndex + totalDaysInMonth;
      const trailingCells = (7 - (totalRenderedCells % 7)) % 7;
      for (let i = 0; i < trailingCells; i++) {
        cellsHtml += `<div class="cal-cell empty"></div>`;
      }

      grid.innerHTML = weekdayHeaders + cellsHtml;

      // Update Monthly stats bar
      const monthPct = monthConducted > 0 ? ((monthAttended / monthConducted) * 100).toFixed(1) : '—';
      document.getElementById('cal-month-stats').innerHTML = `
        Sessions This Month: <strong>${monthConducted}</strong> &nbsp;|&nbsp; 
        Attended: <strong style="color: var(--status-present);">${monthAttended}</strong> &nbsp;|&nbsp; 
        Absent: <strong style="color: var(--status-absent);">${monthAbsent}</strong> &nbsp;|&nbsp; 
        Monthly Attendance: <strong>${monthPct}%</strong>
      `;
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCalendarModal();
    });

    initPage();

