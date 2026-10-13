/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: TIMETABLE
 * frontend/student/timetable/timetable.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['STUDENT']);
    const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    async function loadTimetable() {
      const res = await fetchApi('/timetable');
      const grid = document.getElementById('week-grid');
      const slots = res.success ? res.data : [];

      if (!slots.length) {
        grid.innerHTML = `<div class="card" style="text-align:center; padding:2rem; color:var(--text-muted); width:100%;">No timetable has been set up yet.</div>`;
        return;
      }

      grid.innerHTML = [1,2,3,4,5,6].map(day => {
        const daySlots = slots.filter(s => s.day_of_week === day);
        return `
          <div class="day-col">
            <div class="day-header">${DAYS[day]}</div>
            ${daySlots.length ? daySlots.map(s => `
              <div class="slot-card">
                <div class="slot-time">${s.start_time} – ${s.end_time}</div>
                <div class="slot-subject">${s.subject_name || 'Class'}</div>
                <div class="slot-meta">${s.teacher_name || ''}${s.room ? ' · ' + s.room : ''}</div>
              </div>
            `).join('') : `<div style="font-size:0.78rem; color:var(--text-muted); text-align:center; padding:1rem 0;">No classes</div>`}
          </div>
        `;
      }).join('');
    }

    loadTimetable();

