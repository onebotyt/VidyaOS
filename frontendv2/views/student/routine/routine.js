/**
 * Student Daily Routine & Timetable View
 */

import { Api } from '../../../core/api.js';
import { Platform } from '../../../core/platform.js';
import { getIcon } from '../../../assets/icons/icons.js';

const WEEKDAYS = [
  { key: 'mon', label: 'Monday', dayIndex: 1 },
  { key: 'tue', label: 'Tuesday', dayIndex: 2 },
  { key: 'wed', label: 'Wednesday', dayIndex: 3 },
  { key: 'thu', label: 'Thursday', dayIndex: 4 },
  { key: 'fri', label: 'Friday', dayIndex: 5 },
  { key: 'sat', label: 'Saturday', dayIndex: 6 }
];

const DEFAULT_SCHEDULE = {
  mon: [
    { period: 1, time: '09:00 - 10:00 AM', code: 'IT-501', title: 'Database Management Systems', type: 'lecture', room: 'CS-101', faculty: 'Prof. H.C. Joshi' },
    { period: 2, time: '10:00 - 11:00 AM', code: 'IT-502', title: 'Web Development & Frameworks', type: 'lecture', room: 'CS-102', faculty: 'Er. Navneet Mishra' },
    { period: 3, time: '11:15 - 12:15 PM', code: 'IT-503', title: 'Operating Systems & Linux CLI', type: 'lecture', room: 'CS-101', faculty: 'Prof. R.K. Arya' },
    { period: 'L', time: '12:15 - 01:00 PM', code: 'RECESS', title: 'Institutional Lunch Recess', type: 'break', room: 'Cafeteria', faculty: '—' },
    { period: 4, time: '01:00 - 03:00 PM', code: 'IT-505P', title: 'Web Dev & API Laboratory', type: 'lab', room: 'Lab 2 / Server Studio', faculty: 'Er. Navneet Mishra' }
  ],
  tue: [
    { period: 1, time: '09:00 - 10:00 AM', code: 'IT-504', title: 'Computer Networks & Protocols', type: 'lecture', room: 'CS-102', faculty: 'Dr. S. Bhatt' },
    { period: 2, time: '10:00 - 11:00 AM', code: 'IT-501', title: 'Database Management Systems', type: 'lecture', room: 'CS-101', faculty: 'Prof. H.C. Joshi' },
    { period: 3, time: '11:15 - 12:15 PM', code: 'IT-502', title: 'Web Development & Frameworks', type: 'lecture', room: 'CS-102', faculty: 'Er. Navneet Mishra' },
    { period: 'L', time: '12:15 - 01:00 PM', code: 'RECESS', title: 'Institutional Lunch Recess', type: 'break', room: 'Cafeteria', faculty: '—' },
    { period: 4, time: '01:00 - 03:00 PM', code: 'IT-506P', title: 'DBMS SQL & Transactions Lab', type: 'lab', room: 'Lab 1', faculty: 'Prof. H.C. Joshi' }
  ],
  wed: [
    { period: 1, time: '09:00 - 10:00 AM', code: 'IT-503', title: 'Operating Systems & Linux CLI', type: 'lecture', room: 'CS-101', faculty: 'Prof. R.K. Arya' },
    { period: 2, time: '10:00 - 11:00 AM', code: 'IT-504', title: 'Computer Networks & Protocols', type: 'lecture', room: 'CS-102', faculty: 'Dr. S. Bhatt' },
    { period: 3, time: '11:15 - 12:15 PM', code: 'IT-501', title: 'Database Management Systems', type: 'lecture', room: 'CS-101', faculty: 'Prof. H.C. Joshi' },
    { period: 'L', time: '12:15 - 01:00 PM', code: 'RECESS', title: 'Institutional Lunch Recess', type: 'break', room: 'Cafeteria', faculty: '—' },
    { period: 4, time: '01:00 - 02:00 PM', code: 'IT-507', title: 'Cyber Security Essentials', type: 'lecture', room: 'CS-101', faculty: 'Er. P. Rawat' },
    { period: 5, time: '02:00 - 03:00 PM', code: 'TUT-5', title: 'Operating Systems Tutorial', type: 'lecture', room: 'CS-101', faculty: 'Prof. R.K. Arya' }
  ],
  thu: [
    { period: 1, time: '09:00 - 10:00 AM', code: 'IT-502', title: 'Web Development & Frameworks', type: 'lecture', room: 'CS-102', faculty: 'Er. Navneet Mishra' },
    { period: 2, time: '10:00 - 11:00 AM', code: 'IT-507', title: 'Cyber Security Essentials', type: 'lecture', room: 'CS-101', faculty: 'Er. P. Rawat' },
    { period: 3, time: '11:15 - 12:15 PM', code: 'IT-504', title: 'Computer Networks & Protocols', type: 'lecture', room: 'CS-102', faculty: 'Dr. S. Bhatt' },
    { period: 'L', time: '12:15 - 01:00 PM', code: 'RECESS', title: 'Institutional Lunch Recess', type: 'break', room: 'Cafeteria', faculty: '—' },
    { period: 4, time: '01:00 - 03:00 PM', code: 'IT-508P', title: 'Computer Networks Packet Lab', type: 'lab', room: 'Lab 3', faculty: 'Dr. S. Bhatt' }
  ],
  fri: [
    { period: 1, time: '09:00 - 10:00 AM', code: 'IT-501', title: 'Database Management Systems', type: 'lecture', room: 'CS-101', faculty: 'Prof. H.C. Joshi' },
    { period: 2, time: '10:00 - 11:00 AM', code: 'IT-503', title: 'Operating Systems & Linux CLI', type: 'lecture', room: 'CS-101', faculty: 'Prof. R.K. Arya' },
    { period: 3, time: '11:15 - 12:15 PM', code: 'IT-507', title: 'Cyber Security Essentials', type: 'lecture', room: 'CS-101', faculty: 'Er. P. Rawat' },
    { period: 'L', time: '12:15 - 01:00 PM', code: 'RECESS', title: 'Institutional Lunch Recess', type: 'break', room: 'Cafeteria', faculty: '—' },
    { period: 4, time: '01:00 - 03:00 PM', code: 'IT-PROJ', title: 'Major Project Mentorship Studio', type: 'lab', room: 'Project Lab', faculty: 'All Faculty' }
  ],
  sat: [
    { period: 1, time: '09:00 - 10:00 AM', code: 'IT-SEM', title: 'Technical Seminar & Paper Review', type: 'lecture', room: 'Auditorium', faculty: 'Department Chair' },
    { period: 2, time: '10:00 - 11:30 AM', code: 'CLUB', title: 'Coding Club & Hackathon Hour', type: 'lab', room: 'Incubation Lab', faculty: 'Student Council' },
    { period: 3, time: '11:30 - 01:00 PM', code: 'LIB', title: 'Digital Library & Research Access', type: 'lecture', room: 'Central Library', faculty: 'Librarian' }
  ]
};

export async function renderStudentRoutine(container) {
  // Determine current day of week (1=Mon..6=Sat)
  const d = new Date().getDay();
  let defaultDay = 'mon';
  if (d === 2) defaultDay = 'tue';
  else if (d === 3) defaultDay = 'wed';
  else if (d === 4) defaultDay = 'thu';
  else if (d === 5) defaultDay = 'fri';
  else if (d === 6) defaultDay = 'sat';

  container.innerHTML = `
    <div class="view-container">
      <div class="routine-header-bar">
        <div>
          <h2 style="font-size: 22px; font-weight: 700;">Daily Routine & Timetable</h2>
          <p style="font-size: 13.5px; color: var(--text-muted);" id="routine-cohort-text">Information Technology • Year 3 (Semester 5)</p>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" class="btn btn-outline" id="btn-download-pdf-tt">
            ${getIcon('download')} Download Official PDF
          </button>
        </div>
      </div>

      <!-- Weekday Selector Pills -->
      <div class="routine-day-pills" id="routine-day-pills">
        ${WEEKDAYS.map(day => `
          <button type="button" class="routine-day-pill ${day.key === defaultDay ? 'active' : ''}" data-day="${day.key}">
            ${day.label}
          </button>
        `).join('')}
      </div>

      <!-- Routine Timeline -->
      <div class="routine-timeline" id="routine-periods-container">
        <!-- Rendered dynamically -->
      </div>

      <!-- Official Published Timetables -->
      <div class="official-timetables-section">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">Institutional Timetables (UBTER Approved)</h3>
        <p style="font-size: 13px; color: var(--text-muted);">Official signed department schedules for the current academic session.</p>

        <div class="official-tt-grid">
          <a href="#" class="official-tt-card" id="tt-link-year3">
            <div class="official-tt-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
            </div>
            <div>
              <div style="font-weight: 700; font-size: 13.5px;">Year 3 (Sem 5) Timetable.pdf</div>
              <div style="font-size: 11.5px; color: var(--text-muted);">Signed by HOD • Updated Autumn 2026</div>
            </div>
          </a>
          <a href="#" class="official-tt-card" id="tt-link-master">
            <div class="official-tt-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
            </div>
            <div>
              <div style="font-weight: 700; font-size: 13.5px;">Master College Lab Timetable.pdf</div>
              <div style="font-size: 11.5px; color: var(--text-muted);">Central Academic Cell Nainital</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  `;

  // Function to render periods for selected day
  function renderPeriods(dayKey) {
    const list = DEFAULT_SCHEDULE[dayKey] || [];
    const container = document.querySelector('#routine-periods-container');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 40px; color:var(--text-muted);">
          No academic periods scheduled for ${dayKey.toUpperCase()}.
        </div>
      `;
      return;
    }

    container.innerHTML = list.map((item, idx) => {
      const isBreak = item.type === 'break';
      const pillClass = isBreak ? 'break' : (item.type === 'lab' ? 'lab' : 'lecture');
      const pillLabel = isBreak ? 'RECESS' : (item.type === 'lab' ? 'LAB WORK' : 'LECTURE');

      return `
        <div class="routine-period-card ${idx === 1 ? 'current' : ''}">
          <div class="period-time-block">
            <span class="period-time">${item.time}</span>
            <span class="period-badge">${isBreak ? 'Interval' : `Period ${item.period}`}</span>
          </div>

          <div class="period-details">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="subject-code-badge" style="font-size:10.5px; padding:2px 6px;">${item.code}</span>
              <h4 class="period-subject-title">${item.title}</h4>
            </div>
            <div class="period-meta-row">
              <span class="period-meta-item">${getIcon('profile')} ${item.faculty}</span>
              <span>•</span>
              <span class="period-meta-item">Room: ${item.room}</span>
            </div>
          </div>

          <div>
            <span class="period-status-pill ${pillClass}">${pillLabel}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Setup click listeners for day pills
  const pills = container.querySelectorAll('.routine-day-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const day = pill.dataset.day;
      renderPeriods(day);
      Platform.hapticFeedback('light');
    });
  });

  // Render initial day
  renderPeriods(defaultDay);

  // Load student profile & official timetables if API available
  try {
    const res = await Api.get('/api/v1/students/me', { suppressToast: true });
    if (res && res.success && res.data) {
      const s = res.data;
      const cohortEl = document.querySelector('#routine-cohort-text');
      if (cohortEl) {
        cohortEl.textContent = `${s.department_name || 'Information Technology'} • Year ${s.year || 3} (Semester ${s.semester || 5})`;
      }
    }
  } catch (_) {}
}
