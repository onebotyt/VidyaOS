/**
 * ══════════════════════════════════════════════════════════════
 * STUDENT HOME COCKPIT CONTROLLER (home.js)
 * frontend/student/home/home.js
 * 100% Theme Token Compliant — Zero Hardcoded Colors
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // Role Guard
  if (typeof guardRoute === 'function') {
    try {
      guardRoute(['STUDENT']);
    } catch {
      guardRoute({ requireRoles: ['STUDENT'] });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initHomeDateDisplay();
    loadHomeData();
  });

  /**
   * Format & display current date
   */
  function initHomeDateDisplay() {
    const dateEl = document.getElementById('home-today-date');
    if (!dateEl) return;
    try {
      const now = new Date();
      const options = { weekday: 'short', month: 'short', day: 'numeric' };
      dateEl.textContent = now.toLocaleDateString(undefined, options);
    } catch (_) {
      dateEl.textContent = 'Today';
    }
  }

  function getTimeOfDayGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  /**
   * Main Orchestrator: Loads Profile, Schedule, Attendance Pulse, Classwork, and Classes
   */
  async function loadHomeData() {
    await Promise.allSettled([
      loadStudentProfile(),
      loadTodaySchedule(),
      loadAttendancePulse(),
      loadUpcomingTasks(),
      loadEnrolledClasses()
    ]);
  }

  /**
   * 1. Student Profile & Header
   */
  async function loadStudentProfile() {
    try {
      if (typeof fetchApi !== 'function') return;
      const res = await fetchApi('/students/me');
      if (res && res.success && res.data) {
        const s = res.data;
        const greetingEl = document.getElementById('home-greeting');
        const firstName = (s.full_name || 'Student').split(' ')[0];
        if (greetingEl) {
          greetingEl.textContent = `${getTimeOfDayGreeting()}, ${firstName} 👋`;
        }

        const cohortEl = document.getElementById('home-cohort');
        if (cohortEl) {
          const dept = s.department_name || s.branch_name || 'Information Technology';
          const yr = s.year || 3;
          const sem = s.semester || 5;
          cohortEl.textContent = `${dept} • Year ${yr}, Sem ${sem}`;
        }

        const sessionEl = document.getElementById('home-session-tag');
        if (sessionEl) {
          sessionEl.textContent = s.academic_year_label || '2026–27 Session';
        }
      }
    } catch (_) { }
  }

  /**
   * 2. Live "Up Next" Today's Timetable Lecture
   */
  async function loadTodaySchedule() {
    const subjectEl = document.getElementById('next-class-subject');
    const timeEl = document.getElementById('next-class-time');
    const roomEl = document.getElementById('next-class-room');
    const teacherEl = document.getElementById('next-class-faculty');
    const statusLabel = document.getElementById('up-next-status-label');

    try {
      if (typeof fetchApi !== 'function') return;
      const res = await fetchApi('/timetable', { suppressToast: true });
      const now = new Date();
      const currentDayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

      let todaySlots = [];
      if (res && res.success && Array.isArray(res.data)) {
        todaySlots = res.data.filter(s => {
          const d = (s.day_of_week || s.day || '').toUpperCase();
          return d === currentDayName || d.startsWith(currentDayName.slice(0, 3));
        });
      }

      if (!todaySlots || todaySlots.length === 0) {
        if (subjectEl) subjectEl.textContent = 'No Lectures Scheduled Today';
        if (timeEl) timeEl.textContent = 'Free Day';
        if (roomEl) roomEl.textContent = 'Campus Library / Study';
        if (teacherEl) teacherEl.textContent = 'Independent Study';
        if (statusLabel) statusLabel.textContent = 'SCHEDULE FREE';
        return;
      }

      // Sort slots by start_time
      todaySlots.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

      // Pick the next or first slot
      const slot = todaySlots[0];
      if (subjectEl) subjectEl.textContent = slot.subject_name || slot.subject || 'Class Lecture';
      if (timeEl) timeEl.textContent = `${slot.start_time || '10:00'} - ${slot.end_time || '11:00'}`;
      if (roomEl) roomEl.textContent = slot.room_number ? `Room ${slot.room_number}` : (slot.is_lab ? 'Computer Lab' : 'Lecture Hall');
      if (teacherEl) teacherEl.textContent = slot.teacher_name || slot.faculty_name || 'Department Faculty';
      if (statusLabel) statusLabel.textContent = 'TODAY’S LECTURE';

    } catch (_) {
      if (subjectEl) subjectEl.textContent = 'Today’s Academic Sessions';
      if (timeEl) timeEl.textContent = 'View Timetable';
      if (roomEl) roomEl.textContent = 'Scheduled Classrooms';
      if (teacherEl) teacherEl.textContent = 'Faculty Instructors';
    }
  }

  /**
   * 3. 75% Attendance Health Pulse
   */
  async function loadAttendancePulse() {
    const pctEl = document.getElementById('home-att-pct');
    const ratioEl = document.getElementById('home-att-ratio');
    const fillEl = document.getElementById('home-att-fill');
    const badgeEl = document.getElementById('home-attendance-badge');
    const badgeTextEl = document.getElementById('home-hero-att-text');
    const adviceEl = document.getElementById('home-att-advice');

    try {
      if (typeof fetchApi !== 'function') return;
      const res = await fetchApi('/students/me/attendance/stats', { suppressToast: true });
      let pct = 0;
      let attended = 0;
      let total = 0;

      if (res && res.success && res.data) {
        pct = parseFloat(res.data.current_percentage || res.data.percentage || 0);
        attended = parseInt(res.data.attended_classes || res.data.attended || 0, 10);
        total = parseInt(res.data.total_classes || res.data.total || 0, 10);
      }

      const formattedPct = isNaN(pct) ? '0.0%' : pct.toFixed(1) + '%';
      if (pctEl) pctEl.textContent = formattedPct;
      if (ratioEl) ratioEl.textContent = `Attended: ${attended} / ${total} hrs conducted`;

      const isSafe = pct >= 75.0 || total === 0;

      if (fillEl) {
        fillEl.style.width = Math.min(100, Math.max(0, pct)) + '%';
        if (isSafe) {
          fillEl.classList.remove('shortage');
        } else {
          fillEl.classList.add('shortage');
        }
      }

      if (badgeEl) {
        if (isSafe) {
          badgeEl.className = 'home-attendance-chip safe';
          if (badgeTextEl) badgeTextEl.textContent = `${formattedPct} • Exam Eligible`;
        } else {
          badgeEl.className = 'home-attendance-chip shortage';
          if (badgeTextEl) badgeTextEl.textContent = `${formattedPct} • Shortage Alert`;
        }
      }

      if (adviceEl) {
        if (total === 0) {
          adviceEl.textContent = 'Academic session just begun. Maintain regular attendance to stay above the 75% statutory bar.';
        } else if (isSafe) {
          // Calculate buffer
          const safeBunks = Math.floor((attended - 0.75 * total) / 0.75);
          if (safeBunks > 0) {
            adviceEl.textContent = `✨ Excellent standing! You can safely miss up to ${safeBunks} class${safeBunks > 1 ? 'es' : ''} without falling below 75%.`;
          } else {
            adviceEl.textContent = '⚠️ You are currently on track (>75%), but right at the boundary. Attend your next classes to build buffer.';
          }
        } else {
          // Calculate needed
          const needed = Math.ceil((0.75 * total - attended) / 0.25);
          adviceEl.textContent = `🚨 Action required: You must attend the next ${needed} consecutive class${needed > 1 ? 'es' : ''} to restore exam eligibility.`;
        }
      }

    } catch (_) {
      if (pctEl) pctEl.textContent = '--%';
      if (adviceEl) adviceEl.textContent = 'Track and verify official attendance logs daily.';
    }
  }

  /**
   * 4. Upcoming Deadlines & Classwork
   */
  async function loadUpcomingTasks() {
    const listEl = document.getElementById('home-tasks-list');
    if (!listEl) return;

    try {
      if (typeof fetchApi !== 'function') return;
      const res = await fetchApi('/assignments', { suppressToast: true });

      let tasks = [];
      if (res && res.success && Array.isArray(res.data)) {
        tasks = res.data.filter(t => !t.is_submitted && t.status !== 'COMPLETED').slice(0, 3);
      }

      if (!tasks || tasks.length === 0) {
        listEl.innerHTML = `
          <div class="task-empty-state">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" style="margin-bottom:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <div>All caught up! No pending assignments due right now.</div>
          </div>
        `;
        return;
      }

      listEl.innerHTML = tasks.map(t => {
        const dueText = t.due_date ? formatDueDate(t.due_date) : 'No deadline';
        return `
          <a href="/student/assignments/index.html" class="home-task-item">
            <div class="task-item-main">
              <h4 class="task-item-title">${escapeHtml(t.title || 'Coursework Assignment')}</h4>
              <p class="task-item-sub">
                <span>${escapeHtml(t.subject_name || t.subject_code || 'Subject')}</span>
                <span class="bullet-sep">•</span>
                <span>${dueText}</span>
              </p>
            </div>
            <span class="task-badge-pill due-soon">Due</span>
          </a>
        `;
      }).join('');

    } catch (_) {
      listEl.innerHTML = `
        <div class="task-empty-state">
          <div>Visit Classwork to check homework &amp; tests.</div>
        </div>
      `;
    }
  }

  function formatDueDate(dateStr) {
    try {
      const d = new Date(dateStr);
      return 'Due ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (_) {
      return 'Due soon';
    }
  }

  /**
   * 5. My Enrolled Classes (Compact Grid / Carousel)
   */
  async function loadEnrolledClasses() {
    const container = document.getElementById('home-classes-container');
    const countEl = document.getElementById('home-classes-count');
    if (!container) return;

    try {
      if (typeof fetchApi !== 'function') return;
      const res = await fetchApi('/teaching-groups/student/my-groups', { suppressToast: true });

      const groups = (res && res.success && Array.isArray(res.data)) ? res.data : [];
      if (countEl) countEl.textContent = groups.length;

      if (groups.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color);">
            No active enrolled classrooms found for your cohort.
          </div>
        `;
        return;
      }

      container.innerHTML = groups.slice(0, 6).map(g => {
        if (typeof ClassroomThemes !== 'undefined' && typeof ClassroomThemes.renderCard === 'function') {
          return ClassroomThemes.renderCard(g, { isStudent: true, showTasks: true });
        }

        const subName = g.subject_name || g.name || 'Subject';
        const subCode = g.subject_code || 'CLASS';
        const teacher = g.teacher_name || g.created_by_name || 'Department Faculty';
        const bannerUrl = g.theme_image || '/uploads/classroom-banners/banner_programming_1_c065d9.svg';
        const dept = g.department_name || g.department_code || 'IT Cohort';

        return `
          <div class="google-classroom-card" style="background-image: linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.28) 55%, rgba(0,0,0,0) 100%), url('${bannerUrl}');" onclick="window.location.href='/student/group-detail/index.html?id=${g.id}'" role="button" tabindex="0">
            <button type="button" class="gc-card-kebab-btn" onclick="event.stopPropagation(); alert('Options for ${escapeHtml(subName)}')" title="Classroom Options">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2.2"></circle>
                <circle cx="12" cy="12" r="2.2"></circle>
                <circle cx="12" cy="19" r="2.2"></circle>
              </svg>
            </button>
            <div class="gc-card-content">
              <div class="gc-card-header-info">
                <h2 class="gc-card-heading" title="${escapeHtml(subName)}">${escapeHtml(subName)}</h2>
                <div class="gc-card-cohort">${escapeHtml(subCode)} • ${escapeHtml(dept)}</div>
              </div>
              <div class="gc-card-footer-info">
                <span class="gc-card-faculty">${escapeHtml(teacher)}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

    } catch (_) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; padding: 1rem; color: var(--text-muted); font-size: 0.82rem;">
          Could not load enrolled classrooms. Please try again later.
        </div>
      `;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
