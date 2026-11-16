/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: STUDENT TIMETABLE (Mobile-First & Day-Filterable)
 * frontend/student/timetable/timetable.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['STUDENT']);

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
let allSlots = [];
let activeDayFilter = 'all';

function getTodayDayOfWeek() {
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon...6=Sat
  return jsDay === 0 ? 7 : jsDay;
}

async function initTimetablePage() {
  try {
    const meRes = await fetchApi('/students/me', { suppressToast: true }).catch(() => null);
    if (meRes && meRes.success && meRes.data) {
      const s = meRes.data;
      const sub = document.getElementById('tt-cohort-subtitle');
      if (sub) {
        sub.textContent = `${s.department_name || 'Department'} • Year ${s.year || 1} Semester ${s.semester || 1} (${s.academic_year_label || 'Current Academic Session'})`;
      }
    }
  } catch (_) {}

  const todayIdx = getTodayDayOfWeek();
  const todayLabelEl = document.getElementById('kpi-today-label');
  if (todayLabelEl) {
    todayLabelEl.textContent = DAYS[todayIdx] ? `${DAYS[todayIdx]}'s schedule` : 'Current day';
  }

  // Highlight today's pill badge
  const todayPill = document.querySelector(`.tt-day-pill[data-day="${todayIdx}"]`);
  if (todayPill) {
    todayPill.innerHTML = `${todayPill.textContent} <span class="tt-today-dot" title="Today"></span>`;
  }

  // On mobile viewports (<= 640px), default to Today if Mon-Sat, otherwise All Days
  if (window.innerWidth <= 640 && todayIdx >= 1 && todayIdx <= 6) {
    activeDayFilter = todayIdx;
  }

  await loadTimetable();
}

async function loadTimetable() {
  const grid = document.getElementById('week-grid');
  try {
    const res = await fetchApi('/timetable');
    allSlots = res && res.success && Array.isArray(res.data) ? res.data : [];
    updateTimetableKpis();
    renderTimetableGrid();
  } catch (err) {
    if (grid) {
      grid.innerHTML = `<div class="card" style="text-align:center; padding:2rem; color:var(--status-absent); grid-column: 1 / -1;">Failed to load timetable: ${escapeHtml(err.message || 'Unknown error')}</div>`;
    }
  }
}

function updateTimetableKpis() {
  const todayIdx = getTodayDayOfWeek();
  const todaySlots = allSlots.filter(s => Number(s.day_of_week) === todayIdx);
  const practicalCount = allSlots.filter(s => String(s.session_type || '').toUpperCase().includes('PRACTICAL') || String(s.session_type || '').toUpperCase().includes('LAB')).length;
  const theoryCount = allSlots.length - practicalCount;

  const totalEl = document.getElementById('kpi-total-slots');
  const todayEl = document.getElementById('kpi-today-slots');
  const splitEl = document.getElementById('kpi-theory-lab');

  if (totalEl) totalEl.textContent = String(allSlots.length);
  if (todayEl) todayEl.textContent = String(todaySlots.length);
  if (splitEl) splitEl.textContent = `${theoryCount} / ${practicalCount}`;
}

function filterTimetableDay(day) {
  if (day === 'today') {
    const todayIdx = getTodayDayOfWeek();
    activeDayFilter = (todayIdx >= 1 && todayIdx <= 6) ? todayIdx : 'all';
  } else {
    activeDayFilter = day;
  }

  document.querySelectorAll('.tt-day-pill').forEach(btn => {
    const btnDay = btn.getAttribute('data-day');
    btn.classList.toggle('active', String(btnDay) === String(activeDayFilter));
  });

  renderTimetableGrid();
}

function renderTimetableGrid() {
  const grid = document.getElementById('week-grid');
  if (!grid) return;

  if (!allSlots.length) {
    grid.innerHTML = `
      <div class="card" style="text-align:center; padding:2.5rem 1.25rem; color:var(--text-muted); grid-column: 1 / -1;">
        <div style="font-weight:700; font-size:1rem; color:var(--text-main); margin-bottom:0.35rem;">No Timetable Slots Published Yet</div>
        <div style="font-size:0.85rem;">Once your department publishes the weekly schedule, your theory and lab periods will appear here automatically.</div>
      </div>
    `;
    return;
  }

  const todayIdx = getTodayDayOfWeek();
  const daysToRender = activeDayFilter === 'all' ? [1, 2, 3, 4, 5, 6] : [Number(activeDayFilter)];

  grid.innerHTML = daysToRender.map(day => {
    const daySlots = allSlots
      .filter(s => Number(s.day_of_week) === day)
      .sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
    const isToday = day === todayIdx;

    return `
      <section class="day-col ${isToday ? 'is-today' : ''}" aria-label="${DAYS[day]}">
        <div class="day-header">
          <div style="display:flex; align-items:center; gap:0.45rem;">
            <span>${DAYS[day]}</span>
            ${isToday ? '<span class="badge badge-present" style="font-size:0.65rem; padding:0.12rem 0.45rem;">TODAY</span>' : ''}
          </div>
          <span class="day-count-badge">${daySlots.length} ${daySlots.length === 1 ? 'period' : 'periods'}</span>
        </div>

        <div class="day-slots-list">
          ${daySlots.length ? daySlots.map(s => {
            const isLab = String(s.session_type || '').toUpperCase().includes('PRACTICAL') || String(s.session_type || '').toUpperCase().includes('LAB');
            return `
              <article class="slot-card ${isLab ? 'slot-lab' : 'slot-theory'}">
                <div class="slot-top-row">
                  <span class="slot-time">${escapeHtml(s.start_time || '—')} – ${escapeHtml(s.end_time || '—')}</span>
                  <span class="slot-type-pill ${isLab ? 'lab' : 'theory'}">${isLab ? 'LAB' : 'THEORY'}</span>
                </div>
                <div class="slot-subject">${escapeHtml(s.subject_name || 'Scheduled Class')}</div>
                ${s.subject_code ? `<div style="margin-top:0.2rem;"><span class="code-badge">${escapeHtml(s.subject_code)}</span></div>` : ''}
                <div class="slot-meta">
                  ${s.teacher_name ? `<span>${escapeHtml(s.teacher_name)}</span>` : '<span>Faculty Assigned</span>'}
                  ${s.room ? `<span class="slot-room-pill">Room: ${escapeHtml(s.room)}</span>` : ''}
                </div>
              </article>
            `;
          }).join('') : `
            <div class="slot-empty">No scheduled classes for ${DAYS[day]}</div>
          `}
        </div>
      </section>
    `;
  }).join('');
}

window.filterTimetableDay = filterTimetableDay;
initTimetablePage();
