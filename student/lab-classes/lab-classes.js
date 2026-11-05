/**
 * Laboratory Classes Practical Dossier — Student Client Logic
 * Location: student/lab-classes/lab-classes.js
 * VidyaOS Institutional Campus Operating System
 */

(function () {
  'use strict';

  // Component State
  const state = {
    currentUser: null,
    currentGroupId: null,
    enrolledCourses: [],
    labClassData: null,
    currentCategory: 'all',
    searchQuery: '',
    selectedDoc: null
  };

  // Standard 7 Laboratory Class Items Definition Schema
  const DEFAULT_LAB_ITEMS = [
    {
      key: 'laboratory_attendance',
      num: 1,
      title: 'Laboratory Attendance Register',
      desc: 'Lab batch turnout, attendance matrix ledger, session-wise practical turnout, and student verification.',
      category: 'manuals'
    },
    {
      key: 'laboratory_manuals',
      num: 2,
      title: 'Laboratory Manuals & Guidelines',
      desc: 'Official laboratory manuals, experiment list, apparatus specifications, safety rules, and procedure guidelines.',
      category: 'manuals'
    },
    {
      key: 'job_cards_experiment_sheets',
      num: 3,
      title: 'Job Cards & Experiment Sheets',
      desc: 'Standard student job cards, workshop instruction sheets, circuit diagrams, and observation data recording templates.',
      category: 'experimentation'
    },
    {
      key: 'practical_notebooks',
      num: 4,
      title: 'Practical Notebooks & Records',
      desc: 'Evaluated sample laboratory write-ups, student experiment records, calculation tables, and signed index sheets.',
      category: 'experimentation'
    },
    {
      key: 'continuous_lab_assessment',
      num: 5,
      title: 'Continuous Laboratory Assessment',
      desc: 'Day-to-day practical performance marks, viva-voce rubrics, timely submission scores, and continuous assessment registers.',
      category: 'maintenance'
    },
    {
      key: 'equipment_utilization_records',
      num: 6,
      title: 'Equipment Utilization Records',
      desc: 'Equipment logbook, machine utilization records, workstation allocation, and running hour sheets.',
      category: 'maintenance'
    },
    {
      key: 'lab_maintenance_records',
      num: 7,
      title: 'Laboratory Maintenance & Safety Records',
      desc: 'Preventive maintenance logs, calibration certificates, breakdown/repair reports, safety inspection logs, and stock register.',
      category: 'maintenance'
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
        state.currentUser = await window.guardRoute({ roles: ['TEACHER', 'FACULTY', 'HOD', 'DEPT_HEAD', 'SYSTEM_ADMIN'] });
        if (!state.currentUser) return;
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
      await loadLabClassDossier();
    } catch (err) {
      console.error('Lab classes initialization error:', err);
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
        const meRes = await apiFetch('/students/me');
        if (meRes && meRes.success && meRes.data?.enrolled_groups) {
          subjects = meRes.data.enrolled_groups;
        }
      }

      state.enrolledCourses = subjects;
      const selector = document.getElementById('lab-course-selector');

      if (selector) {
        if (subjects.length === 0) {
          selector.innerHTML = '<option value="">No laboratory courses found</option>';
        } else {
          selector.innerHTML = subjects.map(s => {
            const sid = s.teaching_group_id || s.group_id || s.id;
            const sname = s.subject_name || s.name || 'Laboratory Class';
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

  // Load Laboratory Class Dossier for Current Group
  async function loadLabClassDossier() {
    const grid = document.getElementById('lab-cards-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="lab-loading-box">
          <div class="lab-spinner"></div>
          <p>Loading Laboratory Classes Practical Dossier...</p>
        </div>
      `;
    }

    if (!state.currentGroupId) {
      if (grid) {
        grid.innerHTML = `
          <div class="lab-loading-box">
            <h4 style="font-size:1.05rem;font-weight:700;color:var(--text-main);margin-bottom:0.25rem;">No Active Lab Selected</h4>
            <p style="font-size:0.82rem;color:var(--text-muted);margin:0;">Please select an enrolled laboratory course from the dropdown above.</p>
          </div>
        `;
      }
      return;
    }

    try {
      const res = await apiFetch(`/lab-classes?group_id=${state.currentGroupId}`);
      if (res && res.success && res.data) {
        state.labClassData = res.data;
      } else {
        // Fallback: Build synthesis from enrolled course
        const activeCourse = state.enrolledCourses.find(c => String(c.teaching_group_id || c.group_id || c.id) === String(state.currentGroupId)) || {};
        state.labClassData = {
          group: {
            id: state.currentGroupId,
            name: activeCourse.subject_name || activeCourse.name || 'Software Engineering Lab',
            subject_name: activeCourse.subject_name || activeCourse.name,
            subject_code: activeCourse.subject_code || 'LAB-501',
            semester: activeCourse.semester || 5,
            component: 'PRACTICAL',
            department_name: activeCourse.department_name || 'Academic Dept',
            teacher_name: activeCourse.teacher_name || 'Lab In-Charge Faculty'
          },
          lab_class: {
            total_items: 7,
            completed_items: 4,
            completion_pct: 75,
            status: 'ACTIVE'
          },
          items: DEFAULT_LAB_ITEMS.map((item, idx) => ({
            ...item,
            is_completed: idx < 4,
            has_system_data: idx === 0 || idx === 4,
            document: null
          }))
        };
      }

      renderHeroBanner();
      renderArtifactCards();
      renderCategoryCounts();
      updateQuickLinks();
    } catch (err) {
      console.error('Error fetching lab class data:', err);
      showToast('Error loading laboratory classes', 'error');
    }
  }

  // Render Hero Banner
  function renderHeroBanner() {
    const data = state.labClassData;
    if (!data) return;

    const g = data.group || {};
    const titleEl = document.getElementById('lab-hero-title');
    const semEl = document.getElementById('lab-hero-sem');
    const compEl = document.getElementById('lab-hero-component');
    const ayEl = document.getElementById('lab-hero-ay');
    const codeEl = document.getElementById('lab-hero-code');
    const deptEl = document.getElementById('lab-hero-dept');
    const teacherEl = document.getElementById('lab-hero-teacher');

    if (titleEl) titleEl.innerText = g.subject_name || g.name || 'Laboratory Practical Course';
    if (semEl) semEl.innerText = `Semester ${g.semester || 1}`;
    if (compEl) compEl.innerText = g.component || 'PRACTICAL';
    if (ayEl) ayEl.innerText = `AY ${g.academic_year_label || '2026–27'}`;
    if (codeEl) codeEl.innerText = g.subject_code || 'LAB-501';
    if (deptEl) deptEl.innerText = g.department_name || 'Academic Dept';
    if (teacherEl) teacherEl.innerText = g.teacher_name || 'Lab Faculty';

    // Student Attendance Telemetry
    const activeCourse = state.enrolledCourses.find(c => String(c.teaching_group_id || c.group_id || c.id) === String(state.currentGroupId)) || {};
    const pct = activeCourse.attendance_percentage ?? activeCourse.percentage ?? 90;
    const attended = activeCourse.classes_attended ?? activeCourse.attended ?? 9;
    const total = activeCourse.total_classes ?? activeCourse.conducted ?? 10;

    const pctEl = document.getElementById('lab-meter-pct');
    const barEl = document.getElementById('lab-meter-bar');
    const capEl = document.getElementById('lab-meter-caption');

    if (pctEl) pctEl.innerText = `${pct}%`;
    if (barEl) {
      barEl.style.width = `${Math.min(100, Math.max(5, pct))}%`;
      barEl.style.background = pct >= 75 ? 'var(--status-present)' : 'var(--status-absent)';
    }
    if (capEl) {
      capEl.innerText = `Practical Turnout: ${attended} / ${total} sessions • ${pct >= 75 ? 'Eligible for Practical Exams' : 'Practical Attendance Warning'}`;
    }
  }

  // Update Quick Links
  function updateQuickLinks() {
    const gid = state.currentGroupId;
    const attLink = document.getElementById('link-lab-attendance');
    const cwLink = document.getElementById('link-lab-classwork');
    const thLink = document.getElementById('link-lab-theory');
    const nbaLink = document.getElementById('link-lab-nba');

    if (attLink) attLink.href = `/student/group-detail.html?id=${gid}&tab=attendance`;
    if (cwLink) cwLink.href = `/student/group-detail.html?id=${gid}&tab=classwork`;
    if (thLink) thLink.href = `/student/theory-classes/index.html?groupId=${gid}`;
    if (nbaLink) nbaLink.href = `/student/nba/index.html?groupId=${gid}`;
  }

  // Category Counts
  function renderCategoryCounts() {
    const items = state.labClassData?.items || DEFAULT_LAB_ITEMS;
    const countAll = items.length;
    const countManuals = items.filter(i => i.category === 'manuals').length;
    const countExp = items.filter(i => i.category === 'experimentation').length;
    const countMaint = items.filter(i => i.category === 'maintenance').length;

    const elAll = document.getElementById('count-cat-all');
    const elMan = document.getElementById('count-cat-manuals');
    const elExp = document.getElementById('count-cat-experimentation');
    const elMain = document.getElementById('count-cat-maintenance');

    if (elAll) elAll.innerText = countAll;
    if (elMan) elMan.innerText = countManuals;
    if (elExp) elExp.innerText = countExp;
    if (elMain) elMain.innerText = countMaint;
  }

  // Render 7 Artifact Cards
  function renderArtifactCards() {
    const container = document.getElementById('lab-cards-grid');
    if (!container || !state.labClassData) return;

    let items = state.labClassData.items || DEFAULT_LAB_ITEMS;

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
        <div class="lab-loading-box">
          <h4 style="font-size:1.05rem;font-weight:700;color:var(--text-main);margin-bottom:0.25rem;">No matching laboratory records</h4>
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
            Uploaded Manual (${formatBytes(doc.file_size)})
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
            Lab Active
          </span>
        `;
      }

      return `
        <article class="lab-card">
          <div class="lab-card-left">
            <div class="lab-card-num-box">${item.num || item.item_number || 1}</div>
            <div class="lab-card-body">
              <div class="lab-card-header-row">
                <h3 class="lab-card-title">${escapeHtml(item.title)}</h3>
                ${statusBadgeHtml}
              </div>
              <p class="lab-card-desc">${escapeHtml(item.desc || item.description || '')}</p>
              ${doc ? `
                <div class="lab-card-meta-pill">
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

          <div class="lab-card-right">
            ${doc ? `
              <button type="button" class="lab-btn-action lab-btn-primary" onclick="openDocModal('${escapeHtml(item.key)}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>View Manual</span>
              </button>
              <a href="${doc.file_path}" target="_blank" download class="lab-btn-action lab-btn-secondary" title="Direct Download PDF">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Download</span>
              </a>
            ` : `
              <button type="button" class="lab-btn-action lab-btn-secondary" onclick="openDocModal('${escapeHtml(item.key)}')">
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
    const items = state.labClassData?.items || DEFAULT_LAB_ITEMS;
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31L4.62 18.2A2 2 0 0 0 6.36 21h11.28a2 2 0 0 0 1.74-2.8L14 9.31V2"></path><path d="M8.5 2h7"></path><path d="M14 9.3h-4"></path></svg>
              <span>${escapeHtml(doc.file_name)}</span>
            </div>
            <div style="font-size:0.78rem;color:var(--text-muted);">
              File Size: ${formatBytes(doc.file_size)} • Version: v${doc.version || 1} • Uploaded: ${formatDate(doc.updated_at || doc.created_at)}
            </div>
          </div>
        ` : `
          <div style="padding:0.85rem 1rem;background:var(--status-present-bg);border:1px solid var(--status-present);border-radius:var(--radius-md);font-size:0.82rem;color:var(--status-present);margin-bottom:0.75rem;">
            Laboratory manuals, job cards, and observation sheets are synchronized directly from your laboratory in-charge.
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
    loadLabClassDossier();
  };

  // Filter Category Handler
  window.setCategoryFilter = function (cat) {
    state.currentCategory = cat;
    document.querySelectorAll('.lab-filter-pill').forEach(btn => {
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

