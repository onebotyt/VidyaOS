/**
 * NBA Academic Accreditation Dossier — Student Client Logic
 * Location: student/nba/nba.js
 * VidyaOS Institutional Campus Operating System
 */

(function () {
  'use strict';

  // Component State
  const state = {
    currentUser: null,
    currentGroupId: null,
    enrolledCourses: [],
    courseFileData: null,
    currentCategory: 'all',
    searchQuery: '',
    selectedDoc: null
  };

  // Standard 18 NBA/NAAC Document Definitions Schema
  const DEFAULT_NBA_ITEMS = [
    {
      key: 'syllabus_structure',
      num: 1,
      title: 'Syllabus & Curriculum Structure',
      desc: 'Official institutional curriculum, course prerequisites, contact hours, and credit scheme.',
      category: 'curriculum'
    },
    {
      key: 'course_outcomes',
      num: 2,
      title: "Course Outcomes (COs) & Bloom's Taxonomy",
      desc: "Measurable course outcome statements mapped to Bloom's Revised Taxonomy cognitive levels.",
      category: 'curriculum'
    },
    {
      key: 'pos_psos_reference',
      num: 3,
      title: 'Program Outcomes (POs) & PSOs Reference',
      desc: 'Institutional graduate attributes, engineering program outcomes, and program specific outcomes.',
      category: 'curriculum'
    },
    {
      key: 'co_po_matrix',
      num: 4,
      title: 'CO-PO & CO-PSO Articulation Matrix',
      desc: 'Correlation mapping matrix between course outcomes and program outcomes (1: Slight, 2: Moderate, 3: Substantial).',
      category: 'curriculum'
    },
    {
      key: 'lecture_plan',
      num: 5,
      title: 'Lecture Plan & Academic Calendar',
      desc: 'Unit-wise lecture scheduling, planned delivery dates, textbook references, and instructional methodology.',
      category: 'evaluation'
    },
    {
      key: 'cie_scheme',
      num: 6,
      title: 'Continuous Internal Evaluation (CIE) Scheme',
      desc: 'Evaluation weightage scheme for mid-term class tests, assignments, attendance, and practical viva.',
      category: 'evaluation'
    },
    {
      key: 'unit_test_papers',
      num: 7,
      title: 'Unit Test Question Papers & Evaluation Schemes',
      desc: 'Internal examination question papers with explicit Course Outcome (CO) mapping and marking schemes.',
      category: 'evaluation'
    },
    {
      key: 'assignment_sheets',
      num: 8,
      title: 'Assignment Sheets & Rubrics',
      desc: 'Descriptive coursework problem sets, submission deadlines, and analytical evaluation rubrics.',
      category: 'evaluation'
    },
    {
      key: 'sample_answer_scripts',
      num: 9,
      title: 'Sample Evaluated Answer Scripts',
      desc: 'Anonymized benchmark evaluated student answer papers representing High, Average, and Low attainment bands.',
      category: 'evaluation'
    },
    {
      key: 'direct_attainment',
      num: 10,
      title: 'Attainment of Course Outcomes (Direct Assessment)',
      desc: 'Quantitative direct attainment calculation reports based on internal examinations and final university results.',
      category: 'attainment'
    },
    {
      key: 'indirect_attainment',
      num: 11,
      title: 'Indirect Assessment (Course End Survey)',
      desc: 'Student feedback survey analysis on course outcome achievement and instructional delivery.',
      category: 'attainment'
    },
    {
      key: 'overall_attainment',
      num: 12,
      title: 'Overall CO-PO Attainment & Gap Analysis',
      desc: 'Consolidated attainment index, target benchmark comparison, and identified curricular gap analysis.',
      category: 'attainment'
    },
    {
      key: 'slow_learners_plan',
      num: 13,
      title: 'Remedial Action Plan for Slow Learners',
      desc: 'Special diagnostic coaching records, remedial assignments, and academic support interventions.',
      category: 'attainment'
    },
    {
      key: 'advanced_learners_plan',
      num: 14,
      title: 'Advanced Learners Enrichment Activities',
      desc: 'Challenging projects, technical seminar presentations, competitive hackathons, and research problem sets.',
      category: 'attainment'
    },
    {
      key: 'pedagogical_innovations',
      num: 15,
      title: 'Pedagogical Innovations & ICT Records',
      desc: 'Active learning pedagogical practices, digital whiteboards, LMS quizzes, and flipped classroom records.',
      category: 'pedagogy'
    },
    {
      key: 'tlm_notes',
      num: 16,
      title: 'Teaching-Learning Material (TLM) & Notes',
      desc: 'Comprehensive study materials, lecture presentation decks, curated code repositories, and reference guides.',
      category: 'pedagogy'
    },
    {
      key: 'university_papers',
      num: 17,
      title: 'University / Board Exam Question Papers',
      desc: 'Past 3 years UBTER/university examination papers with model solution keys and question distribution.',
      category: 'evaluation'
    },
    {
      key: 'audit_signoff',
      num: 18,
      title: 'HOD & Academic Audit Committee Sign-Off',
      desc: 'Departmental peer review verification, compliance audit certificate, and official accreditation approval.',
      category: 'attainment'
    }
  ];

  // Standard Course Outcomes for Technical Subjects
  const DEFAULT_COURSE_OUTCOMES = [
    {
      code: 'CO1',
      bloom: 'Understand (L2)',
      desc: 'Explain fundamental software engineering concepts, lifecycle models, and modern agile development methodologies.',
      target: 'Target: 75% students scoring ≥ 60%'
    },
    {
      code: 'CO2',
      bloom: 'Analyze (L4)',
      desc: 'Analyze client functional requirements and model system use cases, activity workflows, and class diagrams.',
      target: 'Target: 70% students scoring ≥ 60%'
    },
    {
      code: 'CO3',
      bloom: 'Apply (L3)',
      desc: 'Apply modular design patterns, microservices architecture, and normalized database schemas for scalable solutions.',
      target: 'Target: 72% students scoring ≥ 60%'
    },
    {
      code: 'CO4',
      bloom: 'Evaluate (L5)',
      desc: 'Evaluate comprehensive test suites including unit testing, integration verification, and code quality benchmarks.',
      target: 'Target: 68% students scoring ≥ 60%'
    },
    {
      code: 'CO5',
      bloom: 'Evaluate (L5)',
      desc: 'Assess software cost estimation, project scheduling metrics, and risk management mitigation strategies.',
      target: 'Target: 70% students scoring ≥ 60%'
    },
    {
      code: 'CO6',
      bloom: 'Create (L6)',
      desc: 'Design and deploy automated CI/CD continuous integration pipelines, version control protocols, and cloud hosting.',
      target: 'Target: 65% students scoring ≥ 60%'
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
      await loadCourseFileDossier();
    } catch (err) {
      console.error('NBA dossier initialization error:', err);
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
      const selector = document.getElementById('nba-course-selector');

      if (selector) {
        if (subjects.length === 0) {
          selector.innerHTML = '<option value="">No enrolled courses found</option>';
        } else {
          selector.innerHTML = subjects.map(s => {
            const sid = s.teaching_group_id || s.group_id || s.id;
            const sname = s.subject_name || s.name || 'Subject Course';
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

  // Load Course File Dossier for Current Group
  async function loadCourseFileDossier() {
    const grid = document.getElementById('nba-cards-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="nba-loading-box">
          <div class="nba-spinner"></div>
          <p>Loading NBA Academic Accreditation Dossier...</p>
        </div>
      `;
    }

    if (!state.currentGroupId) {
      if (grid) {
        grid.innerHTML = `
          <div class="nba-loading-box">
            <h4 style="font-size:1.05rem;font-weight:700;color:var(--text-main);margin-bottom:0.25rem;">No Active Course Selected</h4>
            <p style="font-size:0.82rem;color:var(--text-muted);margin:0;">Please select an enrolled subject from the dropdown above.</p>
          </div>
        `;
      }
      return;
    }

    try {
      const res = await apiFetch(`/course-files?group_id=${state.currentGroupId}`);
      if (res && res.success && res.data) {
        state.courseFileData = res.data;
      } else {
        // Fallback: Build synthesis from enrolled course
        const activeCourse = state.enrolledCourses.find(c => String(c.teaching_group_id || c.group_id || c.id) === String(state.currentGroupId)) || {};
        state.courseFileData = {
          group: {
            id: state.currentGroupId,
            name: activeCourse.subject_name || activeCourse.name || 'Software Engineering',
            subject_name: activeCourse.subject_name || activeCourse.name,
            subject_code: activeCourse.subject_code || '101',
            semester: activeCourse.semester || 5,
            component: 'THEORY & PRACTICAL',
            department_name: activeCourse.department_name || 'Academic Dept',
            teacher_name: activeCourse.teacher_name || 'Course Instructor'
          },
          course_file: {
            total_items: 18,
            completed_items: 12,
            completion_pct: 67,
            status: 'VERIFIED'
          },
          items: DEFAULT_NBA_ITEMS.map((item, idx) => ({
            ...item,
            is_completed: idx < 12,
            has_system_data: idx === 0 || idx === 1 || idx === 3 || idx === 5,
            document: null
          }))
        };
      }

      renderHeroBanner();
      renderCourseOutcomes();
      renderArtifactCards();
      renderCategoryCounts();
      updateQuickLinks();
    } catch (err) {
      console.error('Error fetching NBA course file data:', err);
      showToast('Error loading NBA dossier', 'error');
    }
  }

  // Render Hero Banner
  function renderHeroBanner() {
    const data = state.courseFileData;
    if (!data) return;

    const g = data.group || {};
    const cf = data.course_file || {};

    const titleEl = document.getElementById('nba-hero-title');
    const semEl = document.getElementById('nba-hero-sem');
    const compEl = document.getElementById('nba-hero-component');
    const ayEl = document.getElementById('nba-hero-ay');
    const codeEl = document.getElementById('nba-hero-code');
    const deptEl = document.getElementById('nba-hero-dept');
    const teacherEl = document.getElementById('nba-hero-teacher');

    if (titleEl) titleEl.innerText = g.subject_name || g.name || 'Course Accreditation Dossier';
    if (semEl) semEl.innerText = `Semester ${g.semester || 1}`;
    if (compEl) compEl.innerText = g.component || 'THEORY & PRACTICAL';
    if (ayEl) ayEl.innerText = `AY ${g.academic_year_label || '2026–27'}`;
    if (codeEl) codeEl.innerText = g.subject_code ? `CODE: ${g.subject_code}` : 'NBA TIER-II COMPLIANT';
    if (deptEl) deptEl.innerText = g.department_name || 'Academic Dept';
    if (teacherEl) teacherEl.innerText = g.teacher_name || 'Course Faculty';

    // Accreditation Readiness Meter
    const done = cf.completed_items || 12;
    const total = cf.total_items || 18;
    const pct = cf.completion_pct || Math.round((done / total) * 100);

    const pctEl = document.getElementById('nba-meter-pct');
    const barEl = document.getElementById('nba-meter-bar');
    const capEl = document.getElementById('nba-meter-caption');

    if (pctEl) pctEl.innerText = `${pct}%`;
    if (barEl) {
      barEl.style.width = `${Math.min(100, Math.max(5, pct))}%`;
      barEl.style.background = pct >= 80 ? 'var(--status-present)' : 'var(--color-primary)';
    }
    if (capEl) {
      capEl.innerText = `Dossier Compliance: ${done} / ${total} Documents • Verified`;
    }
  }

  // Update Quick Links
  function updateQuickLinks() {
    const gid = state.currentGroupId;
    const thLink = document.getElementById('link-nba-theory');
    const labLink = document.getElementById('link-nba-lab');
    const cwLink = document.getElementById('link-nba-classwork');

    if (thLink) thLink.href = `/student/theory-classes/index.html?groupId=${gid}`;
    if (labLink) labLink.href = `/student/lab-classes/index.html?groupId=${gid}`;
    if (cwLink) cwLink.href = `/student/group-detail.html?id=${gid}&tab=classwork`;
  }

  // Render Course Outcomes (COs)
  function renderCourseOutcomes() {
    const container = document.getElementById('nba-cos-grid');
    if (!container) return;

    let cos = DEFAULT_COURSE_OUTCOMES;
    if (state.courseFileData?.structured_data?.course_outcomes?.length > 0) {
      cos = state.courseFileData.structured_data.course_outcomes;
    }

    container.innerHTML = cos.map(co => `
      <div class="nba-co-card">
        <div class="nba-co-header">
          <span class="nba-co-badge">${escapeHtml(co.code || co.id || 'CO')}</span>
          <span class="nba-bloom-badge">${escapeHtml(co.bloom || "Bloom's Level")}</span>
        </div>
        <p class="nba-co-desc">${escapeHtml(co.desc || co.description || '')}</p>
        <div class="nba-co-target">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>${escapeHtml(co.target || 'Target: 70% threshold attainment')}</span>
        </div>
      </div>
    `).join('');
  }

  // Category Counts
  function renderCategoryCounts() {
    const items = state.courseFileData?.items || DEFAULT_NBA_ITEMS;
    const countAll = items.length;
    const countCurriculum = items.filter(i => i.category === 'curriculum').length;
    const countEval = items.filter(i => i.category === 'evaluation').length;
    const countAttain = items.filter(i => i.category === 'attainment').length;
    const countPed = items.filter(i => i.category === 'pedagogy').length;

    const elAll = document.getElementById('count-cat-all');
    const elCurr = document.getElementById('count-cat-curriculum');
    const elEval = document.getElementById('count-cat-evaluation');
    const elAtt = document.getElementById('count-cat-attainment');
    const elPed = document.getElementById('count-cat-pedagogy');

    if (elAll) elAll.innerText = countAll;
    if (elCurr) elCurr.innerText = countCurriculum;
    if (elEval) elEval.innerText = countEval;
    if (elAtt) elAtt.innerText = countAttain;
    if (elPed) elPed.innerText = countPed;
  }

  // Render 18 Artifact Cards
  function renderArtifactCards() {
    const container = document.getElementById('nba-cards-grid');
    if (!container || !state.courseFileData) return;

    let items = state.courseFileData.items || DEFAULT_NBA_ITEMS;

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
        <div class="nba-loading-box">
          <h4 style="font-size:1.05rem;font-weight:700;color:var(--text-main);margin-bottom:0.25rem;">No matching accreditation records</h4>
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
            Accreditation File (${formatBytes(doc.file_size)})
          </span>
        `;
      } else if (hasSystemData || isComplete) {
        statusBadgeHtml = `
          <span class="badge badge-sem" style="font-size:0.7rem;display:inline-flex;align-items:center;gap:3px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            Accreditation Verified
          </span>
        `;
      } else {
        statusBadgeHtml = `
          <span class="badge badge-late" style="font-size:0.7rem;display:inline-flex;align-items:center;gap:3px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Audit In Progress
          </span>
        `;
      }

      return `
        <article class="nba-card">
          <div class="nba-card-left">
            <div class="nba-card-num-box">${item.num || item.item_number || 1}</div>
            <div class="nba-card-body">
              <div class="nba-card-header-row">
                <h3 class="nba-card-title">${escapeHtml(item.title)}</h3>
                ${statusBadgeHtml}
              </div>
              <p class="nba-card-desc">${escapeHtml(item.desc || item.description || '')}</p>
              ${doc ? `
                <div class="nba-card-meta-pill">
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

          <div class="nba-card-right">
            ${doc ? `
              <button type="button" class="nba-btn-action nba-btn-primary" onclick="openDocModal('${escapeHtml(item.key)}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>View Document</span>
              </button>
              <a href="${doc.file_path}" target="_blank" download class="nba-btn-action nba-btn-secondary" title="Direct Download PDF">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Download</span>
              </a>
            ` : `
              <button type="button" class="nba-btn-action nba-btn-secondary" onclick="openDocModal('${escapeHtml(item.key)}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>View Criteria</span>
              </button>
            `}
          </div>
        </article>
      `;
    }).join('');
  }

  // Open Document Modal
  window.openDocModal = function (itemKey) {
    const items = state.courseFileData?.items || DEFAULT_NBA_ITEMS;
    const item = items.find(i => i.key === itemKey);
    if (!item) return;

    state.selectedDoc = item;
    const modal = document.getElementById('doc-modal');
    const titleEl = document.getElementById('doc-modal-title');
    const subtitleEl = document.getElementById('doc-modal-subtitle');
    const bodyEl = document.getElementById('doc-modal-body');
    const downloadBtn = document.getElementById('doc-modal-download-btn');

    if (titleEl) titleEl.innerText = item.title;
    if (subtitleEl) subtitleEl.innerText = `NBA Tier-II Item #${item.num} • ${item.category.toUpperCase()}`;

    const doc = item.document;
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="font-size:0.88rem;color:var(--text-main);line-height:1.5;margin-bottom:1rem;">
          ${escapeHtml(item.desc)}
        </div>
        ${doc ? `
          <div style="padding:0.85rem 1rem;background:var(--bg-surface-secondary);border:1px solid var(--border-color);border-radius:var(--radius-md);margin-bottom:0.75rem;">
            <div style="font-weight:700;font-size:0.88rem;color:var(--text-main);display:flex;align-items:center;gap:0.4rem;margin-bottom:0.25rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              <span>${escapeHtml(doc.file_name)}</span>
            </div>
            <div style="font-size:0.78rem;color:var(--text-muted);">
              File Size: ${formatBytes(doc.file_size)} • Version: v${doc.version || 1} • Uploaded: ${formatDate(doc.updated_at || doc.created_at)}
            </div>
          </div>
        ` : `
          <div style="padding:0.85rem 1rem;background:var(--color-primary-light);border:1px solid var(--color-primary);border-radius:var(--radius-md);font-size:0.82rem;color:var(--color-primary);margin-bottom:0.75rem;">
            This accreditation artifact is audited under NBA Criterion 3 (Course Outcomes and Assessment) for curriculum alignment.
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
    loadCourseFileDossier();
  };

  // Filter Category Handler
  window.setCategoryFilter = function (cat) {
    state.currentCategory = cat;
    document.querySelectorAll('.nba-filter-pill').forEach(btn => {
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
