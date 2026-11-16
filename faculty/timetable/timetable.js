/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: TIMETABLE
 * Location: /faculty/timetable/timetable.js
 * 
 * Strict Domain Isolation: Encapsulated IIFE execution.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // Auth & RBAC Gate
  if (typeof requireFacultyAuth === 'function') {
    requireFacultyAuth(['TEACHER', 'HOD']);
  } else if (typeof guardRoute === 'function') {
    guardRoute({ roles: ['TEACHER'], requireSubjects: true });
  }

  const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let classes = [];
  let selectedClass = null;

  const esc = (typeof escHtml === 'function') ? escHtml : (s) => (s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  const getIcon = (name, opts) => (window.FacultyIcons && typeof window.FacultyIcons.get === 'function') ? window.FacultyIcons.get(name, opts) : '';

  async function loadClasses() {
    try {
      const res = await fetchApi('/faculty/my-classes');
      classes = (res && res.success) ? res.data : [];
      const sel = document.getElementById('class-select');
      if (!sel) return;
      if (!classes.length) {
        sel.innerHTML = '<option>No classes assigned</option>';
        return;
      }
      sel.innerHTML = classes.map((c, i) => `<option value="${i}">${esc(c.subject_name)} — Year ${esc(c.year)} Sem ${esc(c.semester)}</option>`).join('');
      onClassChange();
    } catch (err) {
      console.warn('Could not load classes (backend unavailable):', err);
      const sel = document.getElementById('class-select');
      if (sel) sel.innerHTML = '<option>Unable to reach server</option>';
    }
  }

  function onClassChange() {
    const sel = document.getElementById('class-select');
    if (!sel) return;
    const idx = sel.value;
    selectedClass = classes[idx];
    loadTimetable();
  }

  async function loadTimetable() {
    if (!selectedClass) return;
    const c = selectedClass;
    const qs = `department_id=${c.department_id}&branch_id=${c.branch_id}&year=${c.year}&semester=${c.semester}&academic_year_id=${c.academic_year_id}`;
    try {
      const res = await fetchApi(`/timetable?${qs}`);
      const grid = document.getElementById('week-grid');
      if (!grid) return;
      const slots = (res && res.success) ? res.data : [];

      grid.innerHTML = [1, 2, 3, 4, 5, 6].map(day => {
        const daySlots = slots.filter(s => s.day_of_week === day);
        return `
          <div class="day-col">
            <div class="day-header">${DAYS[day]}</div>
            ${daySlots.length ? daySlots.map(s => `
              <div class="slot-card">
                <button class="remove-btn" onclick="removeSlot(${s.id})" title="Remove Slot">
                  ${getIcon('close', { size: 14 }) || '×'}
                </button>
                <div class="slot-time">${esc(s.start_time)} – ${esc(s.end_time)}</div>
                <div class="slot-subject">${esc(s.subject_name || 'Class')}</div>
                <div class="slot-meta">${s.room ? esc(s.room) + ' · ' : ''}${esc(s.session_type)}</div>
              </div>
            `).join('') : `<div style="font-size:0.78rem; color:var(--text-muted); text-align:center; padding:1rem 0;">No classes</div>`}
          </div>
        `;
      }).join('');
    } catch (err) {
      console.warn('Could not load timetable slots:', err);
    }
  }

  async function addSlot(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedClass) return;
    const c = selectedClass;
    try {
      const res = await fetchApi('/timetable', {
        method: 'POST',
        body: JSON.stringify({
          department_id: c.department_id,
          branch_id: c.branch_id,
          year: c.year,
          semester: c.semester,
          academic_year_id: c.academic_year_id,
          subject_id: c.subject_id,
          day_of_week: Number(document.getElementById('f-day').value),
          start_time: document.getElementById('f-start').value,
          end_time: document.getElementById('f-end').value,
          room: document.getElementById('f-room').value,
          session_type: document.getElementById('f-type').value
        })
      });
      if (res && res.success) {
        document.getElementById('f-room').value = '';
        loadTimetable();
      }
    } catch (err) {
      console.warn('Failed to add slot:', err);
    }
  }

  async function removeSlot(id) {
    if (!confirm('Remove this class slot?')) return;
    try {
      const res = await fetchApi(`/timetable/${id}`, { method: 'DELETE' });
      if (res && res.success) loadTimetable();
    } catch (err) {
      console.warn('Failed to remove slot:', err);
    }
  }

  // Export functions bound to DOM events
  window.onClassChange = onClassChange;
  window.addSlot = addSlot;
  window.removeSlot = removeSlot;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadClasses);
  } else {
    loadClasses();
  }
})();
