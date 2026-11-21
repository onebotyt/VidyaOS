/**
 * Student Attendance Ledger & Biometric Matrix View
 */

import { Api } from '../../../core/api.js';
import { Platform } from '../../../core/platform.js';
import { getIcon } from '../../../assets/icons/icons.js';

const MOCK_SUBJECTS = [
  { id: 1, code: 'IT-501', title: 'Database Management Systems', attended: 42, total: 48, pct: 87.5 },
  { id: 2, code: 'IT-502', title: 'Web Development & Frameworks', attended: 38, total: 45, pct: 84.4 },
  { id: 3, code: 'IT-503', title: 'Operating Systems & Linux CLI', attended: 35, total: 42, pct: 83.3 },
  { id: 4, code: 'IT-504', title: 'Computer Networks & Protocols', attended: 32, total: 40, pct: 80.0 },
  { id: 5, code: 'IT-505P', title: 'Web Dev & API Laboratory', attended: 22, total: 24, pct: 91.6 },
  { id: 6, code: 'IT-506P', title: 'DBMS SQL & Transactions Lab', attended: 20, total: 24, pct: 83.3 }
];

export async function renderStudentAttendance(container) {
  let selectedSubjectId = 1;
  let activeMonth = new Date().getMonth(); // 0-11
  let activeYear = new Date().getFullYear();

  // Aggregate stats
  const totalAttended = MOCK_SUBJECTS.reduce((acc, s) => acc + s.attended, 0);
  const totalConducted = MOCK_SUBJECTS.reduce((acc, s) => acc + s.total, 0);
  const aggregatePct = ((totalAttended / totalConducted) * 100).toFixed(1);

  container.innerHTML = `
    <div class="view-container">
      <div class="attendance-header-bar">
        <div>
          <h2 style="font-size: 22px; font-weight: 700;">Attendance Studio</h2>
          <p style="font-size: 13.5px; color: var(--text-muted);">Real-time biometric logs and statutory UBTER attendance records</p>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="badge" style="background:rgba(16,185,129,0.1); color:#059669; font-weight:700;">
            ● ESP32 Hardware Synced
          </span>
        </div>
      </div>

      <!-- Live Session Banner (Conditional) -->
      <div class="live-session-banner" id="live-session-banner" style="display:none;">
        <div class="live-session-left">
          <div class="live-session-pulse"></div>
          <div>
            <div style="font-weight:700; font-size:14px;" id="live-session-title">Live Class Attendance Active</div>
            <div style="font-size:12px; color:var(--text-muted);" id="live-session-subtitle">Enter 4-digit session code broadcast by faculty</div>
          </div>
        </div>
        <div class="live-pin-input-group">
          <input type="text" class="live-pin-input" id="live-pin-input" maxlength="4" placeholder="••••" />
          <button type="button" class="btn btn-primary btn-sm" id="btn-submit-live-pin">Check In</button>
        </div>
      </div>

      <!-- Statutory Compliance Overview -->
      <div class="compliance-banner">
        <div class="compliance-info">
          <div class="compliance-title">
            <span>Statutory UBTER Compliance Status</span>
            <span class="badge badge-present" style="font-size:11px;">ELIGIBLE</span>
          </div>
          <p class="compliance-desc">Mandatory 75.0% aggregate attendance required for semester board examinations.</p>
          <div style="font-size:12.5px; color:var(--text-muted); margin-top:4px;">
            Total Attended: <strong>${totalAttended}</strong> / <strong>${totalConducted}</strong> sessions conducted across all subjects.
          </div>
        </div>
        <div class="compliance-stat">
          <span class="compliance-pct">${aggregatePct}%</span>
          <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Aggregate</span>
        </div>
      </div>

      <!-- Subject Wise Attendance Cards Grid -->
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">Subject-wise Attendance</h3>
      <div class="attendance-subjects-grid" id="att-subjects-grid">
        ${MOCK_SUBJECTS.map(s => `
          <div class="att-subject-card ${s.id === selectedSubjectId ? 'selected' : ''}" data-id="${s.id}">
            <div class="att-card-top">
              <span class="subject-code-badge">${s.code}</span>
              <span style="font-weight:800; font-size:15px; color:${s.pct >= 75 ? '#10b981' : '#ef4444'}">${s.pct}%</span>
            </div>
            <div style="font-weight:700; font-size:14px; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${s.title}
            </div>
            <div class="att-card-bar-wrap">
              <div class="att-card-bar-fill ${s.pct < 75 ? 'danger' : ''}" style="width: ${s.pct}%"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted);">
              <span>${s.attended} of ${s.total} Lectures</span>
              <span>${s.pct >= 75 ? '+ Safe margin' : '⚠ Action needed'}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Interactive 31-Day Monthly Attendance Matrix -->
      <div class="attendance-matrix-section">
        <div class="matrix-header">
          <div>
            <h4 style="font-weight:700; font-size:16px;" id="matrix-subject-title">Database Management Systems (IT-501)</h4>
            <p style="font-size:12.5px; color:var(--text-muted);">Monthly Day 1–31 Attendance Ledger</p>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" class="btn btn-outline btn-sm" id="btn-prev-month">◀</button>
            <span style="font-weight:700; font-size:13px; min-width:110px; text-align:center;" id="matrix-month-label">November 2026</span>
            <button type="button" class="btn btn-outline btn-sm" id="btn-next-month">▶</button>
          </div>
        </div>

        <!-- 7-column calendar grid -->
        <div class="days-grid">
          <div class="day-cell-header">Sun</div>
          <div class="day-cell-header">Mon</div>
          <div class="day-cell-header">Tue</div>
          <div class="day-cell-header">Wed</div>
          <div class="day-cell-header">Thu</div>
          <div class="day-cell-header">Fri</div>
          <div class="day-cell-header">Sat</div>
        </div>

        <div class="days-grid" id="matrix-cells-container">
          <!-- Populated dynamically -->
        </div>

        <!-- Legend -->
        <div style="display:flex; gap:16px; margin-top:16px; font-size:12px; color:var(--text-muted); flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="day-status-dot present"></span>
            <span>Present</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="day-status-dot absent"></span>
            <span>Absent</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="day-status-dot holiday"></span>
            <span>Sunday / Holiday</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Check for live session via API
  async function checkLive() {
    try {
      const res = await Api.get('/api/v1/attendance/sessions?state=OPEN', { suppressToast: true });
      if (res && res.success && res.data && res.data.length > 0) {
        const s = res.data[0];
        const banner = container.querySelector('#live-session-banner');
        const title = container.querySelector('#live-session-title');
        const sub = container.querySelector('#live-session-subtitle');
        if (banner) banner.style.display = 'flex';
        if (title) title.textContent = `Live Session: ${s.subject_name || 'Class Attendance'}`;
        if (sub) sub.textContent = `Instructor: ${s.teacher_name || 'Faculty'} • Enter 4-digit PIN`;
      }
    } catch (_) {}
  }
  checkLive();

  // Function to render calendar days
  function renderCalendar(month, year, subjectId) {
    const containerEl = container.querySelector('#matrix-cells-container');
    const monthLabel = container.querySelector('#matrix-month-label');
    if (!containerEl) return;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (monthLabel) monthLabel.textContent = `${monthNames[month]} ${year}`;

    // Calculate first day and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = '';

    // Empty cells for preceding days
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="day-cell holiday" style="border:none; background:transparent;"></div>`;
    }

    // Days 1..daysInMonth
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = (firstDay + d - 1) % 7;
      const isSunday = dayOfWeek === 0;

      let status = 'present';
      if (isSunday) {
        status = 'holiday';
      } else if (d === 4 || d === 12 || d === 19) {
        // Sample absent days
        status = 'absent';
      }

      html += `
        <div class="day-cell ${status}">
          <span>${d}</span>
          <span class="day-status-dot ${status}"></span>
        </div>
      `;
    }

    containerEl.innerHTML = html;
  }

  // Initial calendar render
  renderCalendar(activeMonth, activeYear, selectedSubjectId);

  // Month navigation
  container.querySelector('#btn-prev-month')?.addEventListener('click', () => {
    activeMonth--;
    if (activeMonth < 0) { activeMonth = 11; activeYear--; }
    renderCalendar(activeMonth, activeYear, selectedSubjectId);
  });

  container.querySelector('#btn-next-month')?.addEventListener('click', () => {
    activeMonth++;
    if (activeMonth > 11) { activeMonth = 0; activeYear++; }
    renderCalendar(activeMonth, activeYear, selectedSubjectId);
  });

  // Subject selection click
  container.querySelectorAll('.att-subject-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.att-subject-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedSubjectId = Number(card.dataset.id);
      const subj = MOCK_SUBJECTS.find(s => s.id === selectedSubjectId);
      const titleEl = container.querySelector('#matrix-subject-title');
      if (titleEl && subj) {
        titleEl.textContent = `${subj.title} (${subj.code})`;
      }
      renderCalendar(activeMonth, activeYear, selectedSubjectId);
      Platform.hapticFeedback('light');
    });
  });

  // Submit live PIN
  container.querySelector('#btn-submit-live-pin')?.addEventListener('click', async () => {
    const pin = container.querySelector('#live-pin-input')?.value;
    if (!pin || pin.length < 4) {
      alert('Please enter a 4-digit attendance PIN.');
      return;
    }
    try {
      const res = await Api.post('/api/v1/attendance/check-in', { pin }, { suppressToast: false });
      if (res && res.success) {
        alert('Attendance marked successfully!');
        const banner = container.querySelector('#live-session-banner');
        if (banner) banner.style.display = 'none';
      }
    } catch (e) {
      alert(e.message || 'Check-in failed');
    }
  });
}
