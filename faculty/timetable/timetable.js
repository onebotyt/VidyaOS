/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: TIMETABLE
 * frontend/faculty/timetable/timetable.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute({ roles: ['TEACHER'], requireSubjects: true });

    const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let classes = [];
    let selectedClass = null;

    async function loadClasses() {
      const res = await fetchApi('/faculty/my-classes');
      classes = res.success ? res.data : [];
      const sel = document.getElementById('class-select');
      if (!classes.length) {
        sel.innerHTML = '<option>No classes assigned</option>';
        return;
      }
      sel.innerHTML = classes.map((c, i) => `<option value="${i}">${c.subject_name} — Year ${c.year} Sem ${c.semester}</option>`).join('');
      onClassChange();
    }

    function onClassChange() {
      const idx = document.getElementById('class-select').value;
      selectedClass = classes[idx];
      loadTimetable();
    }

    async function loadTimetable() {
      if (!selectedClass) return;
      const c = selectedClass;
      const qs = `department_id=${c.department_id}&branch_id=${c.branch_id}&year=${c.year}&semester=${c.semester}&academic_year_id=${c.academic_year_id}`;
      const res = await fetchApi(`/timetable?${qs}`);
      const grid = document.getElementById('week-grid');
      const slots = res.success ? res.data : [];

      grid.innerHTML = [1,2,3,4,5,6].map(day => {
        const daySlots = slots.filter(s => s.day_of_week === day);
        return `
          <div class="day-col">
            <div class="day-header">${DAYS[day]}</div>
            ${daySlots.length ? daySlots.map(s => `
              <div class="slot-card">
                <button class="remove-btn" onclick="removeSlot(${s.id})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                <div class="slot-time">${s.start_time} – ${s.end_time}</div>
                <div class="slot-subject">${s.subject_name || 'Class'}</div>
                <div class="slot-meta">${s.room ? s.room + ' · ' : ''}${s.session_type}</div>
              </div>
            `).join('') : `<div style="font-size:0.78rem; color:var(--text-muted); text-align:center; padding:1rem 0;">No classes</div>`}
          </div>
        `;
      }).join('');
    }

    async function addSlot(e) {
      e.preventDefault();
      if (!selectedClass) return;
      const c = selectedClass;
      const res = await fetchApi('/timetable', {
        method: 'POST',
        body: JSON.stringify({
          department_id: c.department_id, branch_id: c.branch_id, year: c.year, semester: c.semester,
          academic_year_id: c.academic_year_id, subject_id: c.subject_id,
          day_of_week: Number(document.getElementById('f-day').value),
          start_time: document.getElementById('f-start').value,
          end_time: document.getElementById('f-end').value,
          room: document.getElementById('f-room').value,
          session_type: document.getElementById('f-type').value
        })
      });
      if (res.success) {
        document.getElementById('f-room').value = '';
        loadTimetable();
      }
    }

    async function removeSlot(id) {
      if (!confirm('Remove this class slot?')) return;
      const res = await fetchApi(`/timetable/${id}`, { method: 'DELETE' });
      if (res.success) loadTimetable();
    }

    loadClasses();

