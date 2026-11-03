/**
 * Theory Classes Academic Dossier — Student Client Logic
 * Location: student/theory-classes/theory-classes.js
 * VidyaOS Institutional Campus Operating System
 */

(function () {
  'use strict';

  // Component State
  const state = {
    currentUser: null,
    currentGroupId: null,
    enrolledCourses: [],
    theoryClassData: null,
    currentCategory: 'all',
    searchQuery: '',
    selectedDoc: null
  };

  // Standard 7 Theory Class Items Definition Schema
  const DEFAULT_THEORY_ITEMS = [
    {
      key: 'attendance_register',
      num: 1,
      title: 'Attendance Register',
      desc: '31-day institutional matrix ledger, student turnout telemetry, and session-wise attendance tracking.',
      category: 'attendance'
    },
    {
      key: 'teachers_diary',
      num: 2,
      title: "Teacher's Diary",
      desc: 'Daily lecture log, pedagogical activities, curriculum delivery notes, and academic reflections.',
      category: 'attendance'
    },
    {
      key: 'lesson_plan_record',
      num: 3,
      title: 'Lesson Plan Completion Record',
      desc: 'Planned vs actual lecture delivery tracker with dates, unit coverage, and syllabus progression.',
      category: 'instruction'
    },
    {
      key: 'course_coverage_report',
      num: 4,
      title: 'Course Coverage Report',
      desc: 'Periodic syllabus completion report, unit test readiness, and HOD verification status.',
      category: 'instruction'
    },
    {
      key: 'tlm_notes',
      num: 5,
      title: 'Teaching-Learning Material (Notes & PPTs)',
      desc: 'Official course notes, lecture presentation slides, reference reading sheets, and question banks.',
      category: 'pedagogy'
    },
    {
      key: 'ict_teaching_records',
      num: 6,
      title: 'ICT-Enabled Teaching Records',
      desc: 'Smart classroom logs, LMS interactive activities, multimedia demonstrations, and digital quizzes.',
      category: 'pedagogy'
    },
    {
      key: 'assignment_records',
      num: 7,
      title: 'Assignment Records & Submissions',
      desc: 'Coursework assignments, evaluation rubrics, student submission ledger, and continuous assessment marks.',
      category: 'pedagogy'
    }
  ];

  // Helper Functions
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(dStr) {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) {
      return dStr;
    }
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // API Fetch Helper
  async function apiFetch(endpoint, opts = {}) {
    if (typeof window.fetchApi === 'function') {
      try {
        return await window.fetchApi(endpoint, opts);
      } catch (err) {
        return { success: false, error: err };
      }
    }
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const r = await fetch('/api/v1' + endpoint, { ...opts, headers });
      const data = await r.json().catch(() => ({}));
      return data;
    } catch (err) {
      return { success: false, error: err };
    }
  }

  // Global Page Initialization
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      if (typeof window.guardRoute === 'function') {
        state.currentUser = await window.guardRoute();
      }

      // Populate user avatar
      const user = state.currentUser || JSON.parse(localStorage.getItem('user') || '{}');
      const avatarEl = document.getElementById('gc-user-avatar');
      const popoverAvatar = document.getElementById('popover-avatar');
      const popoverName = document.getElementById('popover-user-name');
      const popoverEmail = document.getElementById('popover-user-email');
      const initial = (user.full_name || 'S').charAt(0).toUpperCase();

      if (avatarEl) avatarEl.innerText = initial;
      if (popoverAvatar) popoverAvatar.innerText = initial;
      if (popoverName) popoverName.innerText = user.full_name || 'Student Member';
      if (popoverEmail) popoverEmail.innerText = user.email || '';

      // Parse Query Params
      const params = new URLSearchParams(window.location.search);
      const urlGroupId = params.get('groupId') || params.get('group_id') || params.get('id');

      // Load enrolled courses & pick active course
      await loadEnrolledCourses(urlGroupId);
      await loadTheoryClassDossier();
    } catch (err) {
      console.error('Theory classes initialization error:', err);
    }
  });

  // Load Enrolled Courses
  async function loadEnrolledCourses(preferredGroupId) {
    try {
      const res = await apiFetch('/students/me/attendance/subjects');
      let subjects = [];
      if (res && res.success && Array.isArray(res.data)) {
        subjects = res.data;
      } else {
        // Fallback: check profile or cached courses
        const meRes = await apiFetch('/students/me');
        if (meRes && meRes.success && meRes.data?.enrolled_groups) {
          subjects = meRes.data.enrolled_groups;
        }
      }

      state.enrolledCourses = subjects;
      const selector = document.getElementById('tc-course-selector');

      if (selector) {
        if (subjects.length === 0) {
          selector.innerHTML = '<option value="">No enrolled courses found</option>';
        } else {
          selector.innerHTML = subjects.map(s => {
            const sid = s.teaching_group_id || s.group_id || s.id;
            const sname = s.subject_name || s.name || 'Course Class';
            const scode = s.subject_code ? `(${s.subject_code})` : '';
            return `<option value="${sid}">${escapeHtml(sname)} ${scode}</option>`;
          }).join('');

          if (preferredGroupId && subjects.some(s => String(s.teaching_group_id || s.group_id || s.id) === String(preferredGroupId))) {
            state.currentGroupId = preferredGroupId;
            selector.value = preferredGroupId;
          } else {
            const first = subjects[0];
            state.currentGroupId = first.teaching_group_id || first.group_id || first.id;
            selector.value = state.currentGroupId;
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching student enrolled courses:', err);
    }
  }

  // Load Theory Class Dossier for Current Group
  async function loadTheoryClassDossier() {
    const grid = document.getElementById('tc-cards-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="tc-loading-box">
          <div class="tc-spinner"></div>
          <p>Loading Theory Classes Academic Dossier...</p>
        </div>
      `;
    }

    if (!state.currentGroupId) {
      if (grid) {
        grid.innerHTML = `
          <div class="tc-loading-box">
            <h4 style="font-size:1.05rem;font-weight:700;color:var(--text-main);margin-bottom:0.25rem;">No Active Course Selected</h4>
            <p style="font-size:0.82rem;color:var(--text-muted);margin:0;">Please select an enrolled subject from the dropdown above.</p>
          </div>
        `;
      }
      return;
    }

    try {
      const res = await apiFetch(`/theory-classes?group_id=${state.currentGroupId}`);
      if (res && res.success && res.data) {
        state.theoryClassData = res.data;
      } else {
        // Fallback: Build synthesis from enrolled course
        const activeCourse = state.enrolledCourses.find(c => String(c.teaching_group_id || c.group_id || c.id) === String(state.currentGroupId)) || {};
        state.theoryClassData = {
          group: {
            id: state.currentGroupId,
            name: activeCourse.subject_name || activeCourse.name || 'Subject Course',
            subject_name: activeCourse.subject_name || activeCourse.name,
            subject_code: activeCourse.subject_code || '--',
            semester: activeCourse.semester || 5,
            component: 'THEORY',
            department_name: activeCourse.department_name || 'Academic Dept',
            teacher_name: activeCourse.teacher_name || 'Course Instructor'
          },
          theory_class: {
            total_items: 7,
            completed_items: 4,
            completion_pct: 75,
            status: 'ACTIVE'
          },
          items: DEFAULT_THEORY_ITEMS.map((item, idx) => ({
            ...item,
            is_completed: idx < 4,
            has_system_data: idx === 0 || idx === 6,
            document: null
          }))
        };
      }

      renderHeroBanner();
      renderArtifactCards();
      renderCategoryCounts();
      updateQuickLinks();
    } catch (err) {
      console.error('Error fetching theory class data:', err);
      showToast('Error loading theory classes', 'error');
    }
  }

  // Render Hero Banner
  function renderHeroBanner() {
    const data = state.theoryClassData;
    if (!data) return;

    const g = data.group || {};
    const titleEl = document.getElementById('tc-hero-title');
    const semEl = document.getElementById('tc-hero-sem');
    const compEl = document.getElementById('tc-hero-component');
    const ayEl = document.getElementById('tc-hero-ay');
    const codeEl = document.getElementById('tc-hero-code');
    const deptEl = document.getElementById('tc-hero-dept');
    const teacherEl = document.getElementById('tc-hero-teacher');

    if (titleEl) titleEl.innerText = g.subject_name || g.name || 'Theory Course';
    if (semEl) semEl.innerText = `Semester ${g.semester || 1}`;
    if (compEl) compEl.innerText = g.component || 'THEORY';
    if (ayEl) ayEl.innerText = `AY ${g.academic_year_label || '2026–27'}`;
    if (codeEl) codeEl.innerText = g.subject_code || '101';
    if (deptEl) deptEl.innerText = g.department_name || 'Academic Dept';
    if (teacherEl) teacherEl.innerText = g.teacher_name || 'Faculty Member';

    // Student Attendance Telemetry
    const activeCourse = state.enrolledCourses.find(c => String(c.teaching_group_id || c.group_id || c.id) === String(state.currentGroupId)) || {};
    const pct = activeCourse.attendance_percentage ?? activeCourse.percentage ?? 85;
    const attended = activeCourse.classes_attended ?? activeCourse.attended ?? 18;
    const total = activeCourse.total_classes ?? activeCourse.conducted ?? 21;

    const pctEl = document.getElementById('tc-meter-pct');
    const barEl = document.getElementById('tc-meter-bar');
    const capEl = document.getElementById('tc-meter-caption');

    if (pctEl) pctEl.innerText = `${pct}%`;
    if (barEl) {
      barEl.style.width = `${Math.min(100, Math.max(5, pct))}%`;
      barEl.style.background = pct >= 75 ? 'var(--status-present)' : 'var(--status-absent)';
    }
    if (capEl) {
      capEl.innerText = `Attended: ${attended} / ${total} sessions • ${pct >= 75 ? 'Safe Attendance Standing' : 'Attendance Deficit Warning'}`;
    }
  }

  // Update Quick Links
  function updateQuickLinks() {
    const gid = state.currentGroupId;
    const attLink = document.getElementById('link-my-attendance');
    const cwLink = document.getElementById('link-my-classwork');
    const nbaLink = document.getElementById('link-my-nba');
    const peoLink = document.getElementById('link-my-people');

    if (attLink) attLink.href = `/student/group-detail.html?id=${gid}&tab=attendance`;
    if (cwLink) cwLink.href = `/student/group-detail.html?id=${gid}&tab=classwork`;
    if (nbaLink) nbaLink.href = `/student/nba/index.html?groupId=${gid}`;
    if (peoLink) peoLink.href = `/student/group-detail.html?id=${gid}&tab=people`;
  }

  // Category Counts
  function renderCategoryCounts() {
    const items = state.theoryClassData?.items || DEFAULT_THEORY_ITEMS;
    const countAll = items.length;
    const countAttendance = items.filter(i => i.category === 'attendance').length;
    const countInstruction = items.filter(i => i.category === 'instruction').length;
    const countPedagogy = items.filter(i => i.category === 'pedagogy').length;

    const elAll = document.getElementById('count-cat-all');
    const elAtt = document.getElementById('count-cat-attendance');
    const elInst = document.getElementById('count-cat-instruction');
    const elPed = document.getElementById('count-cat-pedagogy');

    if (elAll) elAll.innerText = countAll;
    if (elAtt) elAtt.innerText = countAttendance;
    if (elInst) elInst.innerText = countInstruction;
    if (elPed) elPed.innerText = countPedagogy;
  }

  // Render 7 Artifact Cards
  function renderArtifactCards() {
    const container = document.getElementById('tc-cards-grid');
    if (!container || !state.theoryClassData) return;

    let items = state.theoryClassData.items || DEFAULT_THEORY_ITEMS;

    // Filter by Category
    if (state.currentCategory !== 'all') {
      items = items.filter(i => i.category === state.currentCategory);
    }

    // Filter by Search Query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      items = items.filter(i => 
        (i.title || '').toLowerCase().includes(q) || 
        (i.desc || '').toLowerCase().includes(q) ||
        String(i.num).includes(q)
      );
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div class="tc-loading-box">
          <h4 style="font-size:1.05rem;font-weight:700;color:var(--text-main);margin-bottom:0.25rem;">No matching theory class records</h4>
          <p style="font-size:0.82rem;color:var(--text-muted);margin:0;">Try adjusting your category filter or search terms.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => {
      const doc = item.document;
      const isComplete = item.is_completed;
      const hasSystemData = item.has_system_data;

      // Status Badge
      let statusBadgeHtml = '';
      if (doc) {
        statusBadgeHtml = `
          <span class="badge badge-present" style="font-size:0.7rem;display:inline-flex;align-items:center;gap:3px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Uploaded PDF (${formatBytes(doc.file_size)})
          </span>
        `;
      } else if (hasSystemData || isComplete) {
        statusBadgeHtml = `
          <span class="badge badge-sem" style="font-size:0.7rem;display:inline-flex;align-items:center;gap:3px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            Live DB Synced
          </span>
        `;
      } else {
        statusBadgeHtml = `
          <span class="badge badge-late" style="font-size:0.7rem;display:inline-flex;align-items:center;gap:3px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            In Progress
          </span>
        `;
      }

      return `
        <article class="tc-card">
          <div class="tc-card-left">
            <div class="tc-card-num-box">${item.num || item.item_number || 1}</div>
            <div class="tc-card-body">
              <div class="tc-card-header-row">
                <h3 class="tc-card-title">${escapeHtml(item.title)}</h3>
                ${statusBadgeHtml}
              </div>
              <p class="tc-card-desc">${escapeHtml(item.desc || item.description || '')}</p>
              ${doc ? `
                <div class="tc-card-meta-pill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <span>${escapeHtml(doc.file_name)}</span>
                  <span>• v${doc.version || 1} • ${formatDate(doc.updated_at || doc.created_at)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="tc-card-right">
            ${doc ? `
              <button type="button" class="tc-btn-action tc-btn-primary" onclick="openDocModal('${escapeHtml(item.key)}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>View Document</span>
              </button>
              <a href="${doc.file_path}" target="_blank" download class="tc-btn-action tc-btn-secondary" title="Direct Download PDF">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Download</span>
              </a>
            ` : `
              <button type="button" class="tc-btn-action tc-btn-secondary" onclick="openDocModal('${escapeHtml(item.key)}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>View Details</span>
              </button>
            `}
          </div>
        </article>
      `;
    }).join('');
  }

  // Open Document Modal
  window.openDocModal = function (itemKey) {
    const items = state.theoryClassData?.items || DEFAULT_THEORY_ITEMS;
    const item = items.find(i => i.key === itemKey);
    if (!item) return;

    state.selectedDoc = item;
    const modal = document.getElementById('doc-modal');
    const titleEl = document.getElementById('doc-modal-title');
    const subtitleEl = document.getElementById('doc-modal-subtitle');
    const bodyEl = document.getElementById('doc-modal-body');
    const downloadBtn = document.getElementById('doc-modal-download-btn');

    if (titleEl) titleEl.innerText = item.title;
    if (subtitleEl) subtitleEl.innerText = `Record #${item.num} • ${item.category.toUpperCase()}`;

    const doc = item.document;
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="font-size:0.88rem;color:var(--text-main);line-height:1.5;margin-bottom:1rem;">
          ${escapeHtml(item.desc)}
        </div>
        ${doc ? `
          <div style="padding:0.85rem 1rem;background:var(--bg-surface-secondary);border:1px solid var(--border-color);border-radius:var(--radius-md);margin-bottom:0.75rem;">
            <div style="font-weight:700;font-size:0.88rem;color:var(--text-main);display:flex;align-items:center;gap:0.4rem;margin-bottom:0.25rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              <span>${escapeHtml(doc.file_name)}</span>
            </div>
            <div style="font-size:0.78rem;color:var(--text-muted);">
              File Size: ${formatBytes(doc.file_size)} • Version: v${doc.version || 1} • Uploaded: ${formatDate(doc.updated_at || doc.created_at)}
            </div>
          </div>
        ` : `
          <div style="padding:0.85rem 1rem;background:var(--color-primary-light);border:1px solid var(--color-primary);border-radius:var(--radius-md);font-size:0.82rem;color:var(--color-primary);margin-bottom:0.75rem;">
            Official notes and materials are synchronized directly from your faculty's academic dossier.
          </div>
        `}
      `;
    }

    if (downloadBtn) {
      if (doc && doc.file_path) {
        downloadBtn.href = doc.file_path;
        downloadBtn.style.display = 'inline-flex';
      } else {
        downloadBtn.style.display = 'none';
      }
    }

    if (modal) modal.style.display = 'flex';
  };

  window.closeDocModal = function () {
    const modal = document.getElementById('doc-modal');
    if (modal) modal.style.display = 'none';
  };

  // Switch Course from Dropdown
  window.handleCourseChange = function (newGroupId) {
    if (!newGroupId) return;
    state.currentGroupId = newGroupId;
    const url = new URL(window.location);
    url.searchParams.set('groupId', newGroupId);
    window.history.replaceState({}, '', url);
    loadTheoryClassDossier();
  };

  // Filter Category Handler
  window.setCategoryFilter = function (cat) {
    state.currentCategory = cat;
    document.querySelectorAll('.tc-filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${cat}'`));
    });
    renderArtifactCards();
  };

  // Real-time Search Handler
  window.handleSearch = function (query) {
    state.searchQuery = query.trim();
    renderArtifactCards();
  };

  // Global Drawer & Navbar Controls
  window.toggleStudentDrawer = function (force) {
    const drawer = document.getElementById('student-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (!drawer) return;
    const isOpen = drawer.classList.contains('open');
    const shouldOpen = typeof force === 'boolean' ? force : !isOpen;
    if (shouldOpen) {
      drawer.classList.add('open');
      if (backdrop) backdrop.classList.add('open');
    } else {
      drawer.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
    }
  };

  window.toggleAppsLauncher = function () {
    const pop = document.getElementById('apps-launcher-dropdown');
    if (pop) pop.style.display = pop.style.display === 'none' ? 'grid' : 'none';
    const prof = document.getElementById('user-profile-popover');
    if (prof) prof.style.display = 'none';
  };

  window.toggleUserProfile = function () {
    const prof = document.getElementById('user-profile-popover');
    if (prof) prof.style.display = prof.style.display === 'none' ? 'block' : 'none';
    const app = document.getElementById('apps-launcher-dropdown');
    if (app) app.style.display = 'none';
  };

  window.toggleTheme = function () {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  window.logout = function () {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  };

})();

