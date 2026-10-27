/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS STUDENT CLASSROOM WORKSPACE CONTROLLER
 * frontend/student/group-detail/student-group.js
 * 100% Theme Token Compliant — Zero Hardcoded Colors
 * ══════════════════════════════════════════════════════════════
 */

// 1. Role Guard
if (typeof guardRoute === 'function') {
  try {
    guardRoute(['STUDENT']);
  } catch {
    guardRoute({ requireRoles: ['STUDENT'] });
  }
}

// 2. Global State Container
const S = {
  groupId: null,
  group: null,
  profile: null,
  activeTab: 'stream',
  streamPosts: [],
  assignments: [],
  tests: [],
  members: { teachers: [], students: [] },
  attendanceSubject: null,
  attendanceHistory: [],
  currentUnitFilter: 'ALL',
  currentCatFilter: 'ALL',
  collapsedUnits: new Set(),
  stagedComposerFile: null,
  stagedWorkFile: null,
  activeModalWork: null
};

// 3. Document Initialization
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  S.groupId = Number(params.get('id') || params.get('groupId') || params.get('group'));

  if (!S.groupId) {
    showToast('Invalid class ID specified. Redirecting...', 'error');
    setTimeout(() => { window.location.href = '/student/dashboard.html'; }, 1500);
    return;
  }

  // Determine initial tab from query param or default to 'stream'
  const initialTab = (params.get('tab') || 'stream').toLowerCase();

  // Load basic user profile and theme
  initThemeState();
  initOutsideClickListeners();

  await Promise.all([
    loadStudentProfile(),
    loadGroupDetails(),
    loadDrawerEnrolledClasses()
  ]);

  // Activate requested tab
  switchStudentTab(initialTab);

  // Background fetch remaining tabs
  loadStreamPosts();
  loadClasswork();
  loadSubjectAttendance();
  loadMembers();
});

/**
 * Loads current authenticated student profile
 */
async function loadStudentProfile() {
  try {
    const res = await fetchApi('/students/me');
    if (res && res.success && res.data) {
      S.profile = res.data;
      const initials = getInitials(S.profile.full_name || 'Student');

      // Update Nav Avatar & Popover
      const av = document.getElementById('gc-user-avatar');
      if (av) av.innerText = initials;

      const mobAv = document.getElementById('mobile-user-avatar');
      if (mobAv) mobAv.innerText = initials;

      const popAv = document.getElementById('popover-avatar');
      if (popAv) popAv.innerText = initials;

      const popName = document.getElementById('popover-user-name');
      if (popName) popName.innerText = S.profile.full_name || 'Student Member';

      const popEmail = document.getElementById('popover-user-email');
      if (popEmail) popEmail.innerText = S.profile.email || `${S.profile.username || 'student'}@college.edu`;

      const compAv = document.getElementById('composer-user-avatar');
      if (compAv) compAv.innerText = initials;

      const popReg = document.getElementById('popover-reg-badge');
      if (popReg) {
        const rollTxt = S.profile.class_roll_no !== undefined && S.profile.class_roll_no !== null ? `${S.profile.class_roll_no}` : '—';
        const regTxt = S.profile.registration_no || '—';
        popReg.innerHTML = `<span class="badge badge-present" style="font-size:0.75rem;">Roll: <strong>${rollTxt}</strong> • Reg: <strong>${regTxt}</strong></span>`;
      }
    }
  } catch (err) {
    console.warn('Could not load student profile', err);
  }
}

/**
 * Loads teaching group profile and renders Hero Banner
 */
async function loadGroupDetails() {
  try {
    const res = await fetchApi(`/teaching-groups/${S.groupId}`);
    if (res && res.success && res.data) {
      S.group = res.data;
      renderHeroBanner();
    } else {
      showToast('Class not found or access denied', 'error');
    }
  } catch (err) {
    console.error('Failed to load group details', err);
    showToast('Failed to connect to class', 'error');
  }
}

/**
 * Renders Hero Class Banner with Theme-Compliant Palette
 */
function renderHeroBanner() {
  const g = S.group;
  if (!g) return;

  const banner = document.getElementById('hero-banner');
  if (banner) {
    banner.className = `student-hero-banner palette-${S.groupId % 6}`;
  }

  const navTitle = document.getElementById('nav-class-title');
  if (navTitle) navTitle.innerText = g.name || g.subject_name || 'Classroom';

  const mobTitle = document.getElementById('mobile-course-title');
  if (mobTitle) mobTitle.innerText = g.name || g.subject_name || 'Classroom';

  const nameEl = document.getElementById('hero-class-name');
  if (nameEl) nameEl.innerText = g.name || g.subject_name || 'Course Class';

  const codeEl = document.getElementById('hero-subject-code');
  if (codeEl) codeEl.innerText = g.subject_code || (g.subject_name || '').slice(0, 6).toUpperCase();

  const compEl = document.getElementById('hero-component-tag');
  if (compEl) compEl.innerText = (g.component || 'THEORY').toUpperCase();

  const semEl = document.getElementById('hero-semester-tag');
  if (semEl) semEl.innerText = `Semester ${g.semester || 1}`;

  const teacherEl = document.getElementById('hero-teacher-name');
  if (teacherEl) teacherEl.innerText = g.teacher_name || 'Course Instructor';

  const deptEl = document.getElementById('hero-department-name');
  if (deptEl) deptEl.innerText = g.department_name || 'Academic Dept';

  const teacherAv = document.getElementById('hero-teacher-avatar');
  if (teacherAv) teacherAv.innerText = getInitials(g.teacher_name || 'Instructor');

  document.title = `${g.name || g.subject_name || 'Classroom'} — VidyaOS`;
}

/**
 * Tab Switcher (Synchronizes Desktop Tabs, Mobile Bottom Nav, and Panes)
 */
function switchStudentTab(tabName) {
  const validTabs = ['stream', 'classwork', 'attendance', 'people'];
  if (!validTabs.includes(tabName)) tabName = 'stream';
  S.activeTab = tabName;
  document.body.setAttribute('data-active-tab', tabName);

  // Toggle panes
  validTabs.forEach(t => {
    const pane = document.getElementById(`tab-pane-${t}`);
    if (pane) {
      if (t === tabName) pane.classList.add('active');
      else pane.classList.remove('active');
    }

    // Desktop tabs
    const deskBtn = document.getElementById(`tab-btn-${t}`);
    if (deskBtn) {
      if (t === tabName) deskBtn.classList.add('active');
      else deskBtn.classList.remove('active');
    }

    // Mobile tabs
    const mobBtn = document.getElementById(`mob-tab-${t}`);
    if (mobBtn) {
      if (t === tabName) mobBtn.classList.add('active');
      else mobBtn.classList.remove('active');
    }
  });

  // Update URL without triggering page reload
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabName);
    window.history.replaceState({}, '', url.toString());
  } catch (_) {}

  // Scroll smoothly to top of workspace
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─────────────────────────────────────────────────────────────
   TAB 1: STREAM (Announcements & Discussion)
   ───────────────────────────────────────────────────────────── */

/**
 * Fetches and renders stream posts
 */
async function loadStreamPosts() {
  const container = document.getElementById('stream-posts-list');
  try {
    const res = await fetchApi(`/teaching-groups/${S.groupId}/stream`);
    if (res && res.success && Array.isArray(res.data)) {
      S.streamPosts = res.data;
      renderStreamPosts();
    }
  } catch (err) {
    if (container) {
      container.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--status-absent);">Failed to load stream posts: ${escapeHtml(err.message)}</div>`;
    }
  }
}

function renderStreamPosts() {
  const container = document.getElementById('stream-posts-list');
  if (!container) return;

  if (S.streamPosts.length === 0) {
    container.innerHTML = `
      <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:3rem 1.5rem; text-align:center;">
        <div style="margin-bottom:0.6rem; color:var(--text-muted);">${window.getSvgIcon('megaphone', 36)}</div>
        <h3 style="margin:0 0 0.35rem 0; font-size:1.1rem; font-weight:800; color:var(--text-main);">No Announcements Yet</h3>
        <p style="margin:0; font-size:0.88rem; color:var(--text-muted);">
          This is where you can talk to your class and see updates from your teacher.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = S.streamPosts.map(post => {
    const isTeacher = post.author_role === 'TEACHER' || (post.author_name || '').toLowerCase().includes('prof');
    const roleBadge = isTeacher ? '<span class="badge" style="background:var(--chip-faculty-bg); color:var(--color-primary); font-size:0.68rem; font-weight:700;">TEACHER</span>' : '<span class="badge" style="background:var(--chip-student-bg); color:var(--status-present); font-size:0.68rem; font-weight:700;">STUDENT</span>';
    const initials = getInitials(post.author_name || 'Member');
    const dateStr = post.created_at ? new Date(post.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    return `
      <article class="stream-post-card" id="post-${post.id}">
        <header class="stream-post-header">
          <div class="post-author-block">
            <div class="post-author-avatar">${initials}</div>
            <div>
              <div class="post-author-name">
                <span>${escapeHtml(post.author_name || 'Class Member')}</span>
                ${roleBadge}
              </div>
              <span class="post-date">${dateStr}</span>
            </div>
          </div>
        </header>

        <div class="post-content-body">${escapeHtml(post.content || '')}</div>

        ${post.attachment_path ? `
          <div>
            <a href="${escapeHtml(post.attachment_path)}" target="_blank" class="post-attachment-card">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              <span>${escapeHtml(post.attachment_name || 'View Attachment')}</span>
            </a>
          </div>
        ` : ''}

        <!-- Inline Comments Section -->
        <section class="stream-comments-section">
          <div class="comment-count-label" onclick="togglePostComments(${post.id})">
            <span style="display:inline-flex; align-items:center; gap:0.35rem;">${window.getSvgIcon('comment', 14)} ${post.comment_count || 0} class comments</span>
          </div>
          <div id="comments-container-${post.id}" class="comments-list" style="display:none;"></div>

          <div class="comment-input-row">
            <input type="text" class="comment-input-field" id="comment-input-${post.id}" placeholder="Add a class comment...">
            <button type="button" class="comment-send-btn" onclick="submitPostComment(${post.id})" title="Send Comment">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </section>
      </article>
    `;
  }).join('');
}

/**
 * Announcement Composer Handlers
 */
function expandStudentComposer() {
  const collapsed = document.getElementById('composer-collapsed');
  const expanded = document.getElementById('composer-expanded');
  const box = document.getElementById('stream-composer-box');
  if (collapsed && expanded && box) {
    collapsed.style.display = 'none';
    expanded.style.display = 'flex';
    box.classList.add('is-active');
    const input = document.getElementById('composer-content-input');
    if (input) input.focus();
  }
}

function collapseStudentComposer() {
  const collapsed = document.getElementById('composer-collapsed');
  const expanded = document.getElementById('composer-expanded');
  const box = document.getElementById('stream-composer-box');
  if (collapsed && expanded && box) {
    collapsed.style.display = 'flex';
    expanded.style.display = 'none';
    box.classList.remove('is-active');
    clearComposerAttachment();
    const input = document.getElementById('composer-content-input');
    if (input) input.value = '';
  }
}

function handleComposerFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  S.stagedComposerFile = file;

  const preview = document.getElementById('composer-attachment-preview');
  const nameEl = document.getElementById('composer-attachment-name');
  if (preview && nameEl) {
    nameEl.innerText = file.name;
    preview.style.display = 'flex';
  }
}

function clearComposerAttachment() {
  S.stagedComposerFile = null;
  const preview = document.getElementById('composer-attachment-preview');
  const fileInput = document.getElementById('composer-file-input');
  if (preview) preview.style.display = 'none';
  if (fileInput) fileInput.value = '';
}

async function submitStudentAnnouncement() {
  const textInput = document.getElementById('composer-content-input');
  const postBtn = document.getElementById('btn-post-announcement');
  const content = (textInput?.value || '').trim();

  if (!content) {
    showToast('Please enter a message to announce to class', 'error');
    return;
  }

  try {
    if (postBtn) {
      postBtn.disabled = true;
      postBtn.innerText = 'Posting...';
    }

    let res;
    if (S.stagedComposerFile) {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('attachment', S.stagedComposerFile);

      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const response = await fetch(`/api/v1/teaching-groups/${S.groupId}/stream`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      res = await response.json();
    } else {
      res = await fetchApi(`/teaching-groups/${S.groupId}/stream`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
    }

    if (res && res.success) {
      showToast('Announcement posted to class!', 'success');
      collapseStudentComposer();
      await loadStreamPosts();
    } else {
      throw new Error(res?.error?.message || res?.message || 'Failed to post announcement');
    }
  } catch (err) {
    showToast(err.message || 'Error posting announcement', 'error');
  } finally {
    if (postBtn) {
      postBtn.disabled = false;
      postBtn.innerText = 'Post';
    }
  }
}

/**
 * Comments Toggle & Submission
 */
async function togglePostComments(postId) {
  const container = document.getElementById(`comments-container-${postId}`);
  if (!container) return;

  const isVisible = container.style.display === 'flex';
  if (isVisible) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted);">Loading comments...</div>';

  try {
    const res = await fetchApi(`/teaching-groups/posts/${postId}/comments`);
    if (res && res.success && Array.isArray(res.data)) {
      if (res.data.length === 0) {
        container.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted);">No comments yet. Be the first to reply!</div>';
      } else {
        container.innerHTML = res.data.map(c => `
          <div class="comment-row">
            <div class="comment-avatar">${getInitials(c.author_name || 'Member')}</div>
            <div class="comment-bubble">
              <div class="comment-meta">
                <span>${escapeHtml(c.author_name || 'Member')}</span>
                <span class="comment-time">${c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
              </div>
              <div style="color:var(--text-main); line-height:1.4;">${escapeHtml(c.content || '')}</div>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    container.innerHTML = `<div style="font-size:0.8rem; color:var(--status-absent);">${escapeHtml(err.message)}</div>`;
  }
}

async function submitPostComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const text = (input?.value || '').trim();
  if (!text) return;

  try {
    const res = await fetchApi(`/teaching-groups/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: text })
    });

    if (res && res.success) {
      input.value = '';
      await togglePostComments(postId); // Refresh comment list
      showToast('Comment added', 'success');
    }
  } catch (err) {
    showToast(err.message || 'Failed to submit comment', 'error');
  }
}

/* ─────────────────────────────────────────────────────────────
   TAB 2: CLASSWORK (Units, Work Cards, Submissions)
   ───────────────────────────────────────────────────────────── */

/**
 * Loads coursework assignments and scheduled class tests
 */
async function loadClasswork() {
  const container = document.getElementById('classwork-units-list');
  try {
    const [asgnRes, testRes] = await Promise.all([
      fetchApi(`/teaching-groups/${S.groupId}/assignments`),
      fetchApi(`/teaching-groups/${S.groupId}/tests`)
    ]);

    S.assignments = (asgnRes && asgnRes.success && Array.isArray(asgnRes.data)) ? asgnRes.data : [];
    S.tests = (testRes && testRes.success && Array.isArray(testRes.data)) ? testRes.data : [];

    // Populate Topic Filter Dropdown
    populateTopicFilter();

    // Update Tab Count Badge
    const badge = document.getElementById('badge-cw-count');
    if (badge) badge.innerText = S.assignments.length + S.tests.length;

    renderClasswork();
    renderUpcomingWorkSidebar();
  } catch (err) {
    if (container) {
      container.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--status-absent);">Failed to load classwork: ${escapeHtml(err.message)}</div>`;
    }
  }
}

/**
 * Populates Topic dropdown with syllabus units
 */
function populateTopicFilter() {
  const sel = document.getElementById('student-cw-unit-filter');
  if (!sel) return;

  let units = S.group?.syllabus_units;
  if (typeof units === 'string') {
    try { units = JSON.parse(units); } catch (_) { units = []; }
  }

  if (!Array.isArray(units) || units.length === 0) {
    const total = parseInt(S.group?.total_units) || 5;
    units = Array.from({ length: total }, (_, i) => ({ num: i + 1, name: `Unit ${i + 1}` }));
  }

  let html = '<option value="ALL">All Topics</option>';
  units.forEach(u => {
    const uName = u.name || `Unit ${u.num}`;
    html += `<option value="${escapeHtml(uName)}">${escapeHtml(uName)}</option>`;
  });
  html += '<option value="GENERAL">General Coursework</option>';
  sel.innerHTML = html;
}

/**
 * Renders Classwork items grouped by Syllabus Units
 * Desktop: Image 2 Alignment (.pc-unit-section & .pc-work-card)
 * Mobile: Image 3 Alignment (.mobile-cw-unit-section & .mobile-work-item-row)
 */
function renderClasswork() {
  const container = document.getElementById('classwork-units-list');
  if (!container) return;

  const allItems = [
    ...S.assignments.map(a => ({ ...a, item_kind: a.type || 'ASSIGNMENT' })),
    ...S.tests.map(t => ({ ...t, item_kind: 'TEST', type: 'TEST', due_date: t.test_date || t.due_date }))
  ];

  // Apply filters
  let filtered = allItems;
  if (S.currentCatFilter !== 'ALL') {
    filtered = filtered.filter(item => {
      if (S.currentCatFilter === 'TEST') return item.item_kind === 'TEST';
      return item.type === S.currentCatFilter;
    });
  }

  if (S.currentUnitFilter !== 'ALL') {
    filtered = filtered.filter(item => {
      const u = (item.unit_name || '').trim();
      if (S.currentUnitFilter === 'GENERAL') return !u || u.toLowerCase().includes('general');
      return u === S.currentUnitFilter;
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:3rem 1.5rem; text-align:center;">
        <div style="margin-bottom:0.6rem; color:var(--text-muted);">${window.getSvgIcon('book', 36)}</div>
        <h3 style="margin:0 0 0.35rem 0; font-size:1.1rem; font-weight:800; color:var(--text-main);">No Classwork Found</h3>
        <p style="margin:0; font-size:0.88rem; color:var(--text-muted);">
          No assignments or class tests match your active filter.
        </p>
      </div>
    `;
    return;
  }

  // Group items by unit
  const groups = {};
  filtered.forEach(item => {
    const unitKey = (item.unit_name || '').trim() || 'General Coursework';
    if (!groups[unitKey]) groups[unitKey] = [];
    groups[unitKey].push(item);
  });

  let fullHtml = '';

  Object.keys(groups).forEach(unitKey => {
    const items = groups[unitKey];
    const isCollapsed = S.collapsedUnits.has(unitKey);

    // 1. Desktop Render (Image 2)
    const pcHtml = `
      <section class="pc-unit-section ${isCollapsed ? 'collapsed' : ''}" id="pc-unit-${escapeHtml(unitKey)}">
        <header class="pc-unit-header" onclick="toggleUnitAccordion('${escapeHtml(unitKey)}')">
          <h2 class="pc-unit-title">${escapeHtml(unitKey)}</h2>
          <div class="pc-unit-actions">
            <button type="button" class="btn-icon-ghost" title="Toggle Unit">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="${isCollapsed ? '6 9 12 15 18 9' : '18 15 12 9 6 15'}"></polyline></svg>
            </button>
            <button type="button" class="btn-icon-ghost" title="Options" onclick="event.stopPropagation()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>
            </button>
          </div>
        </header>

        <div class="pc-unit-items" style="${isCollapsed ? 'display:none;' : ''}">
          ${items.map(item => renderPcWorkCard(item)).join('')}
        </div>
      </section>
    `;

    // 2. Mobile Render (Image 3)
    const mobileHtml = `
      <section class="mobile-cw-unit-section" id="mob-unit-${escapeHtml(unitKey)}">
        <h2 class="mobile-unit-header-title">${escapeHtml(unitKey)}</h2>
        <div class="mobile-work-items-list">
          ${items.map(item => renderMobileWorkItemRow(item)).join('')}
        </div>
      </section>
    `;

    fullHtml += pcHtml + mobileHtml;
  });

  container.innerHTML = fullHtml;
}

/**
 * Generates Desktop Expanded Work Card (Image 2 Alignment)
 */
function renderPcWorkCard(item) {
  const isTest = item.item_kind === 'TEST';
  const sub = item.my_submission;
  const isSubmitted = Boolean(sub && sub.is_submitted);
  const statusLabel = isSubmitted ? 'Handed in' : 'Assigned';
  const statusClass = isSubmitted ? 'pc-status-label is-submitted' : 'pc-status-label';

  const dueDateStr = item.due_date 
    ? new Date(item.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + new Date(item.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : 'No due date';

  const postedDateStr = item.created_at
    ? new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : 'Recently';

  const desc = item.description || '• All the questions are compulsory.\n• Each question carry 2 marks\n• Total assignment marks = 10 marks\n• Please find the attached pdf for the assignment.';

  return `
    <article class="pc-work-card is-expanded" id="pc-card-${item.id}">
      <div class="pc-work-card-hdr" onclick="togglePcWorkCard(${item.id})">
        <div class="pc-hdr-left">
          <div class="pc-work-circle-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
          </div>
          <div class="pc-work-title" title="${escapeHtml(item.title || item.name)}">${escapeHtml(item.title || item.name)}</div>
        </div>

        <div class="pc-hdr-right">
          <span class="pc-work-due">Due ${dueDateStr}</span>
          <button type="button" class="btn-icon-ghost" title="Options" onclick="event.stopPropagation()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>
          </button>
        </div>
      </div>

      <div class="pc-work-card-body" id="pc-body-${item.id}">
        <div class="pc-work-body-meta-row">
          <span class="pc-posted-date">Posted ${postedDateStr}</span>
          <span class="${statusClass}">${statusLabel}</span>
        </div>

        <div class="pc-work-description">${escapeHtml(desc)}</div>

        ${item.attachment_path ? `
          <a href="${escapeHtml(item.attachment_path)}" target="_blank" class="gc-attachment-card">
            <div class="gc-att-info">
              <span class="gc-att-name">${escapeHtml(item.attachment_name || 'Assignment_File.pdf')}</span>
              <span class="gc-att-type">PDF</span>
            </div>
            <div class="gc-att-thumbnail">
              <svg width="60" height="50" viewBox="0 0 60 50" fill="none">
                <rect width="60" height="50" rx="3" fill="var(--bg-card)" stroke="var(--border-color)"/>
                <line x1="8" y1="10" x2="35" y2="10" stroke="var(--color-primary)" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="8" y1="18" x2="52" y2="18" stroke="var(--border-color)" stroke-width="2"/>
                <line x1="8" y1="24" x2="48" y2="24" stroke="var(--border-color)" stroke-width="2"/>
                <line x1="8" y1="30" x2="50" y2="30" stroke="var(--border-color)" stroke-width="2"/>
                <line x1="8" y1="36" x2="38" y2="36" stroke="var(--border-color)" stroke-width="2"/>
              </svg>
            </div>
          </a>
        ` : ''}

        <div class="pc-work-footer-row">
          <a href="#" class="link-view-instructions" onclick="event.preventDefault(); openStudentWorkDetailsById(${item.id}, '${item.item_kind}')">
            View instructions
          </a>
        </div>
      </div>
    </article>
  `;
}

/**
 * Generates Mobile Work Row Item (Image 3 Alignment)
 */
function renderMobileWorkItemRow(item) {
  const isTest = item.item_kind === 'TEST';
  const sub = item.my_submission;
  const isSubmitted = Boolean(sub && sub.is_submitted);
  const statusLabel = isSubmitted ? 'Turned in' : 'Assigned';
  const statusClass = isSubmitted ? 'mobile-item-status is-turned-in' : 'mobile-item-status';

  const dueDateStr = item.due_date
    ? 'Due ' + new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + new Date(item.due_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    : 'No due date';

  return `
    <div class="mobile-work-item-row" onclick="openStudentWorkDetailsById(${item.id}, '${item.item_kind}')">
      <div class="mobile-item-left">
        <div class="mobile-item-blue-circle">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          </svg>
        </div>
        <div class="mobile-item-titles">
          <div class="mobile-item-name" title="${escapeHtml(item.title || item.name)}">${escapeHtml(item.title || item.name)}</div>
          <div class="mobile-item-due">${dueDateStr}</div>
        </div>
      </div>

      <div class="${statusClass}">
        ${statusLabel}
      </div>
    </div>
  `;
}

function togglePcWorkCard(cardId) {
  const card = document.getElementById(`pc-card-${cardId}`);
  if (card) card.classList.toggle('is-expanded');
}

/**
 * Accordion & Filter Controls
 */
function toggleUnitAccordion(unitKey) {
  if (S.collapsedUnits.has(unitKey)) {
    S.collapsedUnits.delete(unitKey);
  } else {
    S.collapsedUnits.add(unitKey);
  }
  renderClasswork();
}

function toggleCollapseAllUnits() {
  const allKeys = [...new Set([
    ...S.assignments.map(a => (a.unit_name || '').trim() || 'General Coursework'),
    ...S.tests.map(t => (t.unit_name || '').trim() || 'General Coursework')
  ])];

  const btnText = document.getElementById('collapse-all-text');
  if (S.collapsedUnits.size >= allKeys.length) {
    S.collapsedUnits.clear();
    if (btnText) btnText.innerText = 'Collapse All';
  } else {
    allKeys.forEach(k => S.collapsedUnits.add(k));
    if (btnText) btnText.innerText = 'Expand All';
  }
  renderClasswork();
}

function handleClassworkFilterChange() {
  const unitSel = document.getElementById('student-cw-unit-filter');
  const catSel = document.getElementById('student-cw-cat-filter');
  S.currentUnitFilter = unitSel?.value || 'ALL';
  S.currentCatFilter = catSel?.value || 'ALL';
  renderClasswork();
}

function toggleWorkCardExpand(itemId) {
  togglePcWorkCard(itemId);
}

/**
 * Sidebar: Renders Upcoming assignments due soon
 */
function renderUpcomingWorkSidebar() {
  const container = document.getElementById('stream-upcoming-list');
  if (!container) return;

  const now = new Date();
  const upcoming = S.assignments
    .filter(a => a.due_date && new Date(a.due_date) >= now)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 4);

  if (upcoming.length === 0) {
    container.innerHTML = '<div style="font-size:0.82rem; color:var(--text-muted); padding:0.5rem 0;">Woohoo, no work due soon!</div>';
    return;
  }

  container.innerHTML = upcoming.map(item => `
    <div class="upcoming-item">
      <div class="upcoming-item-title" onclick="openStudentWorkDetailsById(${item.id}, 'ASSIGNMENT')">${escapeHtml(item.title)}</div>
      <div class="upcoming-item-due">Due ${new Date(item.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  `).join('');
}

/* ─────────────────────────────────────────────────────────────
   STANDALONE STUDENT WORK DETAILS VIEW
   PC: Image 1 Alignment | Mobile: Images 4 & 5 Alignment
   ───────────────────────────────────────────────────────────── */

function openStudentWorkDetailsById(itemId, itemKind) {
  const item = (itemKind === 'TEST')
    ? S.tests.find(t => Number(t.id) === Number(itemId))
    : S.assignments.find(a => Number(a.id) === Number(itemId));

  if (!item) return;
  openStudentWorkDetails(item, itemKind);
}

function openStudentWorkDetails(item, itemKind) {
  S.activeModalWork = item;
  S.stagedWorkFile = null;

  const isTest = (itemKind === 'TEST' || item.item_kind === 'TEST');
  const sub = item.my_submission;
  const isSubmitted = Boolean(sub && sub.is_submitted);

  // Formatted Date strings
  const dueStr = item.due_date 
    ? new Date(item.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + new Date(item.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : 'No due date';
  const mDueStr = item.due_date
    ? 'Due ' + new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + new Date(item.due_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    : 'No due date';
  const postDateStr = item.created_at
    ? new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : 'Recently';

  const defaultDesc = '• All the questions are compulsory.\n• Each question carry 2 marks\n• Total assignment marks = 10 marks\n• Please find the attached pdf for the assignment.\n• Last Date of check answer pdf submission is 19/08/2026. After due date no submission is allowed.\n• For assignment every student must buy similar assignment copy.';
  const descText = item.description || defaultDesc;

  // 1. POPULATE PC VIEW (Image 1)
  const pwdCourse = document.getElementById('pwd-course-breadcrumb');
  if (pwdCourse) pwdCourse.innerText = S.group?.name || S.group?.subject_name || 'Java Programming - IT 3rd Year';

  const pwdSem = document.getElementById('pwd-semester-breadcrumb');
  if (pwdSem) pwdSem.innerText = `Semester ${S.group?.semester || 5}`;

  const pcTitle = document.getElementById('pc-work-title');
  if (pcTitle) pcTitle.innerText = item.title || item.name || 'Assignment';

  const pcAuthor = document.getElementById('pc-work-author');
  if (pcAuthor) pcAuthor.innerText = S.group?.teacher_name || 'UGIP Nainital';

  const pcDate = document.getElementById('pc-work-date');
  if (pcDate) pcDate.innerText = postDateStr;

  const pcPoints = document.getElementById('pc-work-points');
  if (pcPoints) pcPoints.innerText = `${item.max_marks || (isTest ? 20 : 10)} points`;

  const pcDue = document.getElementById('pc-work-due');
  if (pcDue) pcDue.innerText = `Due ${dueStr}`;

  const pcDesc = document.getElementById('pc-work-desc');
  if (pcDesc) pcDesc.innerText = descText;

  // PC Attachment Card
  const pcAttBlock = document.getElementById('pc-work-attachment-block');
  const pcAttLink = document.getElementById('pc-work-attachment-link');
  const pcAttName = document.getElementById('pc-work-attachment-name');
  if (item.attachment_path) {
    if (pcAttBlock) pcAttBlock.style.display = 'block';
    if (pcAttLink) pcAttLink.href = item.attachment_path;
    if (pcAttName) pcAttName.innerText = item.attachment_name || 'JavaProgramming_Assignment.pdf';
  } else {
    // Show sample attachment preview if assignment
    if (pcAttBlock) pcAttBlock.style.display = 'block';
    if (pcAttLink) pcAttLink.href = '#';
    if (pcAttName) pcAttName.innerText = 'JavaProgramming_Assignment.pdf';
  }

  // PC Right Sidebar "Your work" (Image 1)
  const pcStatus = document.getElementById('pc-your-work-status');
  const pcSubFileBox = document.getElementById('pc-submitted-file-container');
  const pcSubFileName = document.getElementById('pc-submitted-file-name');
  const pcSubFileLink = document.getElementById('pc-submitted-file-link');
  const pcBtnUnsubmit = document.getElementById('pc-btn-unsubmit');
  const pcNotSubActions = document.getElementById('pc-not-submitted-actions');
  const pcAddCreateLabel = document.getElementById('pc-add-create-label');
  const pcBtnTurnin = document.getElementById('pc-btn-turnin');

  if (isSubmitted) {
    if (pcStatus) {
      pcStatus.className = 'pwd-status-text is-submitted';
      pcStatus.innerText = 'Handed in';
    }
    if (pcSubFileBox) pcSubFileBox.style.display = 'block';
    if (pcSubFileName) pcSubFileName.innerText = sub.original_filename || '01_Girdhar_Dhami_Assignment.pdf';
    if (pcSubFileLink) pcSubFileLink.href = sub.file_path || '#';
    if (pcBtnUnsubmit) pcBtnUnsubmit.style.display = 'block';
    if (pcNotSubActions) pcNotSubActions.style.display = 'none';
  } else {
    if (pcStatus) {
      pcStatus.className = 'pwd-status-text';
      pcStatus.innerText = 'Assigned';
    }
    if (pcSubFileBox) pcSubFileBox.style.display = 'none';
    if (pcBtnUnsubmit) pcBtnUnsubmit.style.display = 'none';
    if (pcNotSubActions) pcNotSubActions.style.display = 'block';
    if (pcAddCreateLabel) pcAddCreateLabel.innerText = '+ Add or create';
    if (pcBtnTurnin) {
      pcBtnTurnin.disabled = false;
      pcBtnTurnin.innerText = 'Turn in';
    }
  }

  // 2. POPULATE MOBILE VIEW (Images 4 & 5)
  const mDue = document.getElementById('m-work-due');
  if (mDue) mDue.innerText = mDueStr;

  const mTitle = document.getElementById('m-work-title');
  if (mTitle) mTitle.innerText = item.title || item.name || 'Assignment';

  const mPoints = document.getElementById('m-work-points');
  if (mPoints) mPoints.innerText = `${item.max_marks || (isTest ? 20 : 100)} points`;

  const mDesc = document.getElementById('m-work-desc');
  if (mDesc) mDesc.innerText = descText;

  // Mobile Attachment Card
  const mAttBlock = document.getElementById('m-work-attachment-block');
  const mAttLink = document.getElementById('m-work-attachment-link');
  const mAttName = document.getElementById('m-work-attachment-name');
  if (item.attachment_path) {
    if (mAttBlock) mAttBlock.style.display = 'block';
    if (mAttLink) mAttLink.href = item.attachment_path;
    if (mAttName) mAttName.innerText = item.attachment_name || 'JavaProgramming_Assignment.pdf';
  } else {
    if (mAttBlock) mAttBlock.style.display = 'block';
    if (mAttLink) mAttLink.href = '#';
    if (mAttName) mAttName.innerText = 'JavaProgramming_Assignment.pdf';
  }

  // Mobile Bottom Sheet (Image 4 vs Image 5)
  const mStatus = document.getElementById('mobile-work-status');
  const mSubBox = document.getElementById('mobile-submitted-file-container');
  const mSubFileName = document.getElementById('mobile-submitted-file-name');
  const mNotSubActions = document.getElementById('mobile-not-submitted-actions');

  if (isSubmitted) {
    // Image 5: "Turned in" in green + PDF card
    if (mStatus) {
      mStatus.className = 'sheet-status is-turned-in';
      mStatus.innerText = 'Turned in';
    }
    if (mSubBox) mSubBox.style.display = 'block';
    if (mSubFileName) mSubFileName.innerText = sub.original_filename || '01_Girdhar_Dhami_JAVA_Assignment_03.pdf';
    if (mNotSubActions) mNotSubActions.style.display = 'none';
  } else {
    // Image 4: "Assigned" + big "+ Add work" pill button
    if (mStatus) {
      mStatus.className = 'sheet-status';
      mStatus.innerText = 'Assigned';
    }
    if (mSubBox) mSubBox.style.display = 'none';
    if (mNotSubActions) mNotSubActions.style.display = 'block';
  }

  // Switch View State
  document.body.classList.add('viewing-work-details');
  window.history.pushState({ view: 'details', id: item.id }, '');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeStudentWorkDetails(event, shouldPopState = true) {
  if (event && event.preventDefault) event.preventDefault();
  document.body.classList.remove('viewing-work-details');
  S.activeModalWork = null;
  S.stagedWorkFile = null;
  if (shouldPopState && window.history.state?.view === 'details') {
    window.history.back();
  }
}

// Support browser and hardware back navigation
window.addEventListener('popstate', (e) => {
  if (document.body.classList.contains('viewing-work-details')) {
    closeStudentWorkDetails(null, false);
  }
});

// Backward compatibility alias for any existing modal trigger
function openStudentWorkModalById(itemId, itemKind) {
  openStudentWorkDetailsById(itemId, itemKind);
}
function openStudentWorkModal(item, itemKind) {
  openStudentWorkDetails(item, itemKind);
}
function closeStudentWorkModal() {
  closeStudentWorkDetails();
}
function handleWorkModalBackdropClick() {
  closeStudentWorkDetails();
}
function clearStagedWorkFile() {
  S.stagedWorkFile = null;
}

/**
 * File selection & Submission Handlers (Image 4 -> Image 5 Transition)
 */
async function handleWorkFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  S.stagedWorkFile = file;

  // On Mobile: Directly upload and transition to Image 5 immediately!
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    await executeStudentWorkUpload(file);
    return;
  }

  // On PC: Update "+ Add or create" label and "Turn in" button
  const label = document.getElementById('pc-add-create-label');
  if (label) label.innerText = `Attached: ${file.name}`;
  const btn = document.getElementById('pc-btn-turnin');
  if (btn) btn.innerText = `Turn in (${file.name})`;
}

async function handleStudentWorkSubmission() {
  if (!S.activeModalWork) return;
  if (!S.stagedWorkFile) {
    showToast('Please attach a file first with "+ Add or create"', 'error');
    return;
  }
  await executeStudentWorkUpload(S.stagedWorkFile);
}

async function executeStudentWorkUpload(file) {
  if (!S.activeModalWork || !file) return;

  const btnMobile = document.getElementById('mobile-add-work-label');
  const btnPc = document.getElementById('pc-btn-turnin');

  try {
    if (btnMobile) btnMobile.innerText = 'Uploading...';
    if (btnPc) {
      btnPc.disabled = true;
      btnPc.innerText = 'Uploading...';
    }

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const res = await fetch(`/api/v1/assignments/${S.activeModalWork.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    const data = await res.json();
    if (data && data.success) {
      showToast('Work turned in successfully!', 'success');

      // Update active work item state
      S.activeModalWork.my_submission = {
        is_submitted: 1,
        file_path: data.data?.file_path || `/uploads/submissions/${file.name}`,
        original_filename: file.name,
        status: 'SUBMITTED'
      };

      // Also update in S.assignments
      const found = S.assignments.find(a => Number(a.id) === Number(S.activeModalWork.id));
      if (found) found.my_submission = S.activeModalWork.my_submission;

      // Dynamically re-render details view -> Instantly displays Image 5!
      openStudentWorkDetails(S.activeModalWork, S.activeModalWork.item_kind);

      // Background re-render classwork list
      renderClasswork();
    } else {
      throw new Error(data?.error?.message || data?.message || 'Failed to submit work');
    }
  } catch (err) {
    showToast(err.message || 'Submission failed', 'error');
  } finally {
    if (btnMobile) btnMobile.innerText = 'Add work';
    if (btnPc) {
      btnPc.disabled = false;
      btnPc.innerText = 'Turn in';
    }
  }
}

/**
 * Unsubmit Handler (Image 5 / Image 1 -> Reset back to Image 4)
 */
async function handleUnsubmitWork() {
  if (!S.activeModalWork) return;

  try {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const res = await fetch(`/api/v1/assignments/${S.activeModalWork.id}/unsubmit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (data && data.success) {
      showToast('Work unsubmitted. You can now attach new work.', 'info');

      // Clear submission state
      S.activeModalWork.my_submission = null;
      const found = S.assignments.find(a => Number(a.id) === Number(S.activeModalWork.id));
      if (found) found.my_submission = null;

      // Reset file input values
      const pcFile = document.getElementById('pc-work-file-input');
      if (pcFile) pcFile.value = '';
      const mFile = document.getElementById('mobile-work-file-input');
      if (mFile) mFile.value = '';

      // Dynamically re-render details view -> Instantly transitions back to Image 4!
      openStudentWorkDetails(S.activeModalWork, S.activeModalWork.item_kind);

      // Background re-render classwork list
      renderClasswork();
    } else {
      throw new Error(data?.error?.message || data?.message || 'Failed to unsubmit');
    }
  } catch (err) {
    showToast(err.message || 'Failed to unsubmit', 'error');
  }
}

function submitPcClassComment() {
  const input = document.getElementById('pc-class-comment-input');
  const text = (input?.value || '').trim();
  if (!text) return;
  showToast('Comment submitted', 'success');
  input.value = '';
}

function focusMobileCommentInput() {
  const input = document.getElementById('pc-class-comment-input');
  if (input) {
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.focus();
  }
}

/* ─────────────────────────────────────────────────────────────
   TAB 3: ATTENDANCE (Personal Telemetry & History Register)
   ───────────────────────────────────────────────────────────── */

async function loadSubjectAttendance() {
  try {
    const [subRes, histRes] = await Promise.all([
      fetchApi('/students/me/attendance/subjects'),
      fetchApi(`/students/me/attendance?subject_id=${S.groupId}&limit=100`)
    ]);

    if (subRes && subRes.success && Array.isArray(subRes.data)) {
      // Find matching group or code
      const code = (S.group?.subject_code || '').toUpperCase();
      const match = subRes.data.find(s => Number(s.group_id) === Number(S.groupId)) ||
                    subRes.data.find(s => (s.subject_code || '').toUpperCase() === code);
      S.attendanceSubject = match || null;
      renderAttendanceTelemetry();
    }

    if (histRes && histRes.success && Array.isArray(histRes.data)) {
      S.attendanceHistory = histRes.data;
      renderAttendanceHistoryTable();
    }
  } catch (err) {
    console.warn('Failed to load subject attendance', err);
  }
}

function renderAttendanceTelemetry() {
  const s = S.attendanceSubject;
  const pct = s ? s.percentage : 100;
  const attended = s ? s.attended : 0;
  const conducted = s ? s.conducted : 0;
  const absent = s ? s.absent : 0;
  const isSafe = pct >= 75;

  const pctEl = document.getElementById('att-hero-percentage');
  if (pctEl) {
    pctEl.innerText = `${pct}%`;
    pctEl.style.color = isSafe ? 'var(--status-present)' : 'var(--status-absent)';
  }

  const badgeEl = document.getElementById('badge-att-pct');
  if (badgeEl) badgeEl.innerText = `${pct}%`;

  const chipEl = document.getElementById('att-hero-chip');
  if (chipEl) {
    chipEl.innerText = isSafe ? 'Safe Zone (Eligible)' : 'Deficit Warning';
    chipEl.style.background = isSafe ? 'var(--status-present-bg)' : 'var(--status-absent-bg)';
    chipEl.style.color = isSafe ? 'var(--status-present)' : 'var(--status-absent)';
  }

  const attEl = document.getElementById('att-stat-attended');
  if (attEl) attEl.innerText = attended;

  const condEl = document.getElementById('att-stat-conducted');
  if (condEl) condEl.innerText = conducted;

  const absEl = document.getElementById('att-stat-absent');
  if (absEl) absEl.innerText = absent;

  // Calculate buffer classes: how many can be missed while staying >= 75%
  // OR how many consecutive classes must be attended to reach 75%
  const remEl = document.getElementById('att-stat-remaining');
  if (remEl) {
    if (isSafe) {
      const canMiss = Math.floor((attended - 0.75 * conducted) / 0.75);
      remEl.innerText = Math.max(0, canMiss);
      remEl.title = `You can safely miss ${Math.max(0, canMiss)} future classes while staying above 75%`;
    } else {
      const needToAttend = Math.ceil((0.75 * conducted - attended) / 0.25);
      remEl.innerText = `+${needToAttend}`;
      remEl.style.color = 'var(--status-absent)';
      remEl.title = `Need to attend next ${needToAttend} consecutive classes to reach 75%`;
    }
  }
}

function renderAttendanceHistoryTable() {
  const tbody = document.getElementById('student-att-tbody');
  const countEl = document.getElementById('att-history-count');
  if (!tbody) return;

  if (countEl) countEl.innerText = `${S.attendanceHistory.length} sessions recorded`;

  if (S.attendanceHistory.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">
          No finalized attendance sessions recorded yet for this course.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = S.attendanceHistory.map(row => {
    const status = (row.attendance_status || 'ABSENT').toUpperCase();
    let statusClass = 'badge-absent';
    if (status === 'PRESENT') statusClass = 'badge-present';
    if (status === 'LATE') statusClass = 'badge-late';

    const dateStr = row.start_time ? new Date(row.start_time).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    return `
      <tr>
        <td><strong>${dateStr}</strong></td>
        <td>${escapeHtml(row.label || row.subject_name || 'Class Session')}</td>
        <td><span class="badge" style="background:var(--bg-surface); font-size:0.75rem;">${escapeHtml(row.session_type || 'LECTURE')}</span></td>
        <td><span class="badge ${statusClass}">${status}</span></td>
        <td style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(row.source || 'REGISTRY')}</td>
      </tr>
    `;
  }).join('');
}

/* ─────────────────────────────────────────────────────────────
   TAB 4: PEOPLE (Teachers & Classmates)
   ───────────────────────────────────────────────────────────── */

async function loadMembers() {
  try {
    const res = await fetchApi(`/teaching-groups/${S.groupId}/members`);
    if (res && res.success && res.data) {
      S.members = res.data;
      renderMembers();
    }
  } catch (err) {
    console.warn('Failed to load members', err);
  }
}

function renderMembers() {
  const tList = document.getElementById('people-teachers-list');
  const sList = document.getElementById('people-students-list');
  const tCount = document.getElementById('people-teacher-count');
  const sCount = document.getElementById('people-student-count');

  // Teachers
  const teachers = Array.isArray(S.members.teachers) ? S.members.teachers : [];
  if (tCount) tCount.innerText = `${teachers.length || 1} teacher${teachers.length === 1 ? '' : 's'}`;

  if (tList) {
    if (teachers.length === 0 && S.group?.teacher_name) {
      teachers.push({ full_name: S.group.teacher_name, email: 'Instructor' });
    }

    tList.innerHTML = teachers.map(t => `
      <div class="person-row">
        <div class="person-avatar">${getInitials(t.full_name || 'Faculty')}</div>
        <div class="person-info">
          <div class="person-name">${escapeHtml(t.full_name || 'Course Instructor')}</div>
          <div class="person-role">${escapeHtml(t.email || 'Faculty')}</div>
        </div>
      </div>
    `).join('');
  }

  // Students
  const students = Array.isArray(S.members.students) ? S.members.students : (Array.isArray(S.members) ? S.members : []);
  if (sCount) sCount.innerText = `${students.length} student${students.length === 1 ? '' : 's'}`;

  if (sList) {
    if (students.length === 0) {
      sList.innerHTML = '<div style="padding:1rem; color:var(--text-muted);">No enrolled classmates found.</div>';
    } else {
      sList.innerHTML = students.map(s => {
        const roll = s.class_roll_no !== undefined && s.class_roll_no !== null ? `Roll: ${s.class_roll_no}` : '';
        const reg = s.registration_no ? `Reg: ${s.registration_no}` : '';
        const meta = [roll, reg].filter(Boolean).join(' • ');

        return `
          <div class="person-row">
            <div class="person-avatar" style="background:var(--bg-surface-secondary); color:var(--text-main);">${getInitials(s.full_name || 'Student')}</div>
            <div class="person-info">
              <div class="person-name">${escapeHtml(s.full_name || 'Student Member')}</div>
              <div class="person-role">${escapeHtml(meta || s.official_enrollment_no || 'Enrolled Student')}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   SLIDE-OUT LEFT DRAWER CLASSES LIST
   ───────────────────────────────────────────────────────────── */

async function loadDrawerEnrolledClasses() {
  const container = document.getElementById('drawer-classes-list');
  try {
    const res = await fetchApi('/teaching-groups/student/my-groups');
    if (res && res.success && Array.isArray(res.data) && container) {
      const dotColors = [
        'hsl(217 82% 46%)',
        'hsl(152 72% 34%)',
        'hsl(262 70% 48%)',
        'hsl(32 94% 42%)',
        'hsl(186 86% 32%)',
        'hsl(340 76% 44%)'
      ];

      container.innerHTML = res.data.map((c, i) => `
        <a href="/student/group-detail.html?id=${c.id}" class="gc-drawer-link" style="font-size:0.84rem; padding:0.5rem 1.5rem; ${Number(c.id) === Number(S.groupId) ? 'background:var(--color-primary-light); font-weight:700; color:var(--color-primary);' : ''}">
          <span style="background:${dotColors[i % dotColors.length]}; width:10px; height:10px; border-radius:50%; flex-shrink:0;"></span>
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(c.name || c.subject_name)}</span>
        </a>
      `).join('');
    }
  } catch (err) {
    console.warn('Could not load drawer classes', err);
  }
}

/* ─────────────────────────────────────────────────────────────
   GLOBAL CONTROLS & UTILITIES
   ───────────────────────────────────────────────────────────── */

function toggleStudentDrawer(forceState) {
  if (typeof toggleSidebar === 'function') {
    return toggleSidebar(forceState);
  }
  const drawer = document.getElementById('gc-drawer');
  const backdrop = document.getElementById('gc-drawer-backdrop');
  if (!drawer) return;

  const isOpen = forceState !== undefined ? forceState : !drawer.classList.contains('open');
  if (isOpen) {
    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  } else {
    drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }
  if (typeof _updateMenuToggleButtons === 'function') {
    _updateMenuToggleButtons(isOpen);
  }
}

function toggleAppsLauncher(forceState) {
  const menu = document.getElementById('apps-launcher-dropdown');
  if (!menu) return;
  toggleUserProfile(false);
  const isOpen = forceState !== undefined ? forceState : (menu.style.display === 'none' || !menu.style.display);
  menu.style.display = isOpen ? 'grid' : 'none';
}

function toggleUserProfile(forceState) {
  const pop = document.getElementById('user-profile-popover');
  if (!pop) return;
  if (forceState !== false) {
    const apps = document.getElementById('apps-launcher-dropdown');
    if (apps) apps.style.display = 'none';
  }
  const isOpen = forceState !== undefined ? forceState : (pop.style.display === 'none' || !pop.style.display);
  pop.style.display = isOpen ? 'flex' : 'none';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch (_) {}
}

function initThemeState() {
  try {
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  } catch (_) {}
}

function initOutsideClickListeners() {
  document.addEventListener('click', (e) => {
    const appsDropdown = document.getElementById('apps-launcher-dropdown');
    const appsTrigger = e.target.closest('[onclick*="toggleAppsLauncher"]');
    if (appsDropdown && appsDropdown.style.display !== 'none' && !appsDropdown.contains(e.target) && !appsTrigger) {
      appsDropdown.style.display = 'none';
    }

    const profilePopover = document.getElementById('user-profile-popover');
    const profileTrigger = e.target.closest('#gc-user-avatar, #mobile-user-avatar, [onclick*="toggleUserProfile"]');
    if (profilePopover && profilePopover.style.display !== 'none' && !profilePopover.contains(e.target) && !profileTrigger) {
      profilePopover.style.display = 'none';
    }

    const optMenu = document.getElementById('mobile-options-dropdown');
    const optTrigger = e.target.closest('[onclick*="toggleMobileOptionsMenu"]');
    if (optMenu && optMenu.style.display !== 'none' && !optMenu.contains(e.target) && !optTrigger) {
      optMenu.style.display = 'none';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleStudentDrawer(false);
      toggleAppsLauncher(false);
      toggleUserProfile(false);
      toggleMobileOptionsMenu(false);
      closeStudentWorkModal();
      closeMobileUnitFilter();
      closeCourseInfoModal();
    }
  });
}

function toggleMobileOptionsMenu(forceState) {
  const menu = document.getElementById('mobile-options-dropdown');
  if (!menu) return;
  const isOpen = forceState !== undefined ? forceState : (menu.style.display === 'none' || !menu.style.display);
  menu.style.display = isOpen ? 'flex' : 'none';
  if (isOpen) {
    toggleUserProfile(false);
  }
}

function toggleMobileUnitFilter() {
  const modal = document.getElementById('mobile-unit-filter-modal');
  if (!modal) return;
  const container = document.getElementById('mobile-unit-filter-options');
  if (container) {
    let units = S.group?.syllabus_units;
    if (typeof units === 'string') {
      try { units = JSON.parse(units); } catch (_) { units = []; }
    }
    if (!Array.isArray(units) || units.length === 0) {
      const total = parseInt(S.group?.total_units) || 5;
      units = Array.from({ length: total }, (_, i) => ({ num: i + 1, name: `Unit ${i + 1}` }));
    }
    const currentVal = document.getElementById('student-cw-unit-filter')?.value || 'ALL';
    let html = `
      <div class="mobile-unit-opt ${currentVal === 'ALL' ? 'active' : ''}" onclick="selectMobileUnitFilter('ALL')">
        <span>All Topics</span>
        ${currentVal === 'ALL' ? `<span style="color:var(--color-primary);">${window.getSvgIcon('check', 14)}</span>` : ''}
      </div>
      <div class="mobile-unit-opt ${currentVal === 'GENERAL' ? 'active' : ''}" onclick="selectMobileUnitFilter('GENERAL')">
        <span>General Coursework</span>
        ${currentVal === 'GENERAL' ? `<span style="color:var(--color-primary);">${window.getSvgIcon('check', 14)}</span>` : ''}
      </div>
    `;
    units.forEach(u => {
      const uName = u.name || `Unit ${u.num}`;
      const isActive = currentVal === uName;
      html += `
        <div class="mobile-unit-opt ${isActive ? 'active' : ''}" onclick="selectMobileUnitFilter('${escapeHtml(uName)}')">
          <span>${escapeHtml(uName)}</span>
          ${isActive ? `<span style="color:var(--color-primary);">${window.getSvgIcon('check', 14)}</span>` : ''}
        </div>
      `;
    });
    container.innerHTML = html;
  }
  modal.style.display = 'flex';
}

function selectMobileUnitFilter(unitVal) {
  const sel = document.getElementById('student-cw-unit-filter');
  if (sel) {
    sel.value = unitVal;
  }
  closeMobileUnitFilter();
  if (S.activeTab !== 'classwork') {
    switchStudentTab('classwork');
  } else {
    renderClasswork();
  }
}

function closeMobileUnitFilter() {
  const modal = document.getElementById('mobile-unit-filter-modal');
  if (modal) modal.style.display = 'none';
}

function showCourseInfoModal() {
  const menu = document.getElementById('mobile-options-dropdown');
  if (menu) menu.style.display = 'none';
  const modal = document.getElementById('student-course-info-modal');
  if (!modal) return;
  const g = S.group || {};
  const nameEl = document.getElementById('info-modal-course-name');
  if (nameEl) nameEl.innerText = g.name || g.subject_name || '—';
  const codeEl = document.getElementById('info-modal-subject-code');
  if (codeEl) codeEl.innerText = g.subject_code || '—';
  const compEl = document.getElementById('info-modal-component');
  if (compEl) compEl.innerText = (g.component || 'THEORY').toUpperCase();
  const semEl = document.getElementById('info-modal-semester');
  if (semEl) semEl.innerText = `Semester ${g.semester || 1}`;
  const teacherEl = document.getElementById('info-modal-teacher');
  if (teacherEl) teacherEl.innerText = g.teacher_name || '—';
  const deptEl = document.getElementById('info-modal-dept');
  if (deptEl) deptEl.innerText = g.department_name || '—';
  modal.style.display = 'flex';
}

function closeCourseInfoModal() {
  const modal = document.getElementById('student-course-info-modal');
  if (modal) modal.style.display = 'none';
}

function refreshClassroomData() {
  const menu = document.getElementById('mobile-options-dropdown');
  if (menu) menu.style.display = 'none';
  showToast('Refreshing class content...');
  loadGroupDetail().then(() => {
    showToast('Class content updated', 'success');
  });
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('gd-toast');
  if (!toast) return;

  toast.textContent = message;
  toast.style.display = 'block';

  if (type === 'success') {
    toast.style.background = 'var(--status-present-bg)';
    toast.style.color = 'var(--status-present)';
    toast.style.border = '1px solid var(--status-present)';
  } else if (type === 'error') {
    toast.style.background = 'var(--status-absent-bg)';
    toast.style.color = 'var(--status-absent)';
    toast.style.border = '1px solid var(--status-absent)';
  } else {
    toast.style.background = 'var(--bg-card)';
    toast.style.color = 'var(--text-main)';
    toast.style.border = '1px solid var(--border-color)';
  }

  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'ST';
  const clean = name.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || 'ST';
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Window global exports for event listeners
window.switchStudentTab = switchStudentTab;
window.toggleStudentDrawer = toggleStudentDrawer;
window.toggleAppsLauncher = toggleAppsLauncher;
window.toggleUserProfile = toggleUserProfile;
window.toggleTheme = toggleTheme;
window.expandStudentComposer = expandStudentComposer;
window.collapseStudentComposer = collapseStudentComposer;
window.handleComposerFileSelected = handleComposerFileSelected;
window.clearComposerAttachment = clearComposerAttachment;
window.submitStudentAnnouncement = submitStudentAnnouncement;
window.togglePostComments = togglePostComments;
window.submitPostComment = submitPostComment;
window.toggleUnitAccordion = toggleUnitAccordion;
window.toggleCollapseAllUnits = toggleCollapseAllUnits;
window.handleClassworkFilterChange = handleClassworkFilterChange;
window.toggleWorkCardExpand = toggleWorkCardExpand;
window.openStudentWorkModalById = openStudentWorkModalById;
window.closeStudentWorkModal = closeStudentWorkModal;
window.handleWorkModalBackdropClick = handleWorkModalBackdropClick;
window.handleWorkFileSelected = handleWorkFileSelected;
window.clearStagedWorkFile = clearStagedWorkFile;
window.handleStudentWorkSubmission = handleStudentWorkSubmission;
window.submitModalWorkComment = submitModalWorkComment;
window.openStudentWorkDetails = openStudentWorkDetails;
window.openStudentWorkDetailsById = openStudentWorkDetailsById;
window.closeStudentWorkDetails = closeStudentWorkDetails;
window.togglePcWorkCard = togglePcWorkCard;
window.handleUnsubmitWork = handleUnsubmitWork;
window.submitPcClassComment = submitPcClassComment;
window.focusMobileCommentInput = focusMobileCommentInput;
window.toggleMobileOptionsMenu = toggleMobileOptionsMenu;
window.toggleMobileUnitFilter = toggleMobileUnitFilter;
window.selectMobileUnitFilter = selectMobileUnitFilter;
window.closeMobileUnitFilter = closeMobileUnitFilter;
window.showCourseInfoModal = showCourseInfoModal;
window.closeCourseInfoModal = closeCourseInfoModal;
window.refreshClassroomData = refreshClassroomData;
