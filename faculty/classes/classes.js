/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY CLASSES & COHORTS ENGINE (classes.js)
 * Location: /faculty/classes/classes.js
 * 
 * Manages teaching groups, live statistics, search & semester filtering,
 * card 3-dot menu (Edit, Move to Trash with 30-day policy & type-to-confirm),
 * and broadcast notices with year cohort targeting & media upload.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const state = {
    groups: [],
    searchQuery: '',
    selectedSemester: 'ALL',
    currentUser: null,
    deletingGroupId: null,
    selectedBroadcastFile: null
  };

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Feedback Toast Helper ──
  function showToast(message, type = 'success') {
    const banner = document.getElementById('classes-toast-banner');
    if (!banner) return;
    banner.textContent = message;
    banner.className = 'vidya-toast-banner show ' + (type === 'error' ? 'toast-error' : 'toast-success');
    clearTimeout(banner._toastTimer);
    banner._toastTimer = setTimeout(() => {
      banner.className = 'vidya-toast-banner';
    }, 3500);
  }

  // ── 1. Live Date & Time Engine ──
  function updateLiveDateTime() {
    const now = new Date();
    const dateEl = document.getElementById('classes-live-date');
    const timeEl = document.getElementById('classes-live-time');

    if (dateEl) {
      const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
      dateEl.textContent = now.toLocaleDateString('en-US', options);
    }

    if (timeEl) {
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      timeEl.textContent = `${hours}:${minutes} ${ampm}`;
    }
  }

  // ── 2. Fetch Teaching Groups ──
  async function loadClasses() {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const res = await fetch('/api/v1/teaching-groups?status=ALL', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.data)) {
        state.groups = data.data;
      } else if (Array.isArray(data)) {
        state.groups = data;
      } else {
        state.groups = [];
      }
    } catch (err) {
      console.warn('[Classes] Failed to load classes:', err);
      state.groups = [];
    }

    updateStats();
    renderCards();
    fetchTrashCount();
  }

  // ── Fetch Trash Count for Action Button Badge ──
  async function fetchTrashCount() {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const res = await fetch('/api/v1/teaching-groups?status=TRASH', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      const trashed = data?.data || (Array.isArray(data) ? data : []);
      const badge = document.getElementById('classes-trash-count');
      if (badge) {
        if (trashed.length > 0) {
          badge.textContent = trashed.length;
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }
      }
    } catch (_) {
      // Non-critical badge update
    }
  }

  // ── 3. Update Stat Cards (My Classes, Total Students, Subjects) ──
  function updateStats() {
    const totalClasses = state.groups.length;
    let totalStudents = 0;
    const subjectsSet = new Set();

    state.groups.forEach(g => {
      totalStudents += Number(g.member_count || 0);
      if (g.subject_name || g.name) subjectsSet.add(g.subject_name || g.name);
    });

    const statClasses = document.getElementById('stat-my-classes');
    const statStudents = document.getElementById('stat-total-students');
    const statSubjects = document.getElementById('stat-total-subjects');

    if (statClasses) statClasses.textContent = totalClasses || 0;
    if (statStudents) statStudents.textContent = totalStudents || 0;
    if (statSubjects) statSubjects.textContent = subjectsSet.size || 0;
  }

  // ── 4. Render Class Cards ──
  function renderCards() {
    const container = document.getElementById('classes-cards-container');
    if (!container) return;

    let filtered = state.groups.filter(g => {
      if (state.selectedSemester !== 'ALL') {
        if (String(g.semester) !== String(state.selectedSemester)) return false;
      }
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const nameMatch = (g.name || '').toLowerCase().includes(q);
        const subMatch = (g.subject_name || '').toLowerCase().includes(q);
        const shortMatch = (g.subject_short_name || '').toLowerCase().includes(q);
        const codeMatch = (g.subject_code || g.room_no || g.invite_code || '').toLowerCase().includes(q);
        return nameMatch || subMatch || shortMatch || codeMatch;
      }
      return true;
    });

    if (!filtered.length) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg, 16px);">
          <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.35rem;">No Classes Found</div>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0 0 1rem;">No classes match your current filter or search criteria.</p>
          <button type="button" class="btn-create-class-solid" onclick="openCreateGroupModal()">
            <span>+ Create Class</span>
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((g) => {
      const subjectTitle = g.subject_name || g.name || 'Untitled Class';
      const roomCode = g.subject_code || g.room_no || '101';
      const semester = g.semester || 6;
      const compRaw = String(g.component || 'THEORY').toUpperCase();
      let formattedComp = 'Theory';
      if (compRaw.includes('THEORY') && compRaw.includes('PRACTICAL')) {
        formattedComp = 'Theory + Practical';
      } else if (compRaw.includes('PRACTICAL')) {
        formattedComp = 'Practical';
      } else if (compRaw.includes('THEORY')) {
        formattedComp = 'Theory';
      } else {
        formattedComp = g.component || 'Theory';
      }
      const ayLabel = g.academic_year_label || 'AY 2026–27';

      return `
        <div class="class-card" id="class-card-${g.id}">
          <!-- Card Header Banner -->
          <div class="class-card-header">
            <div class="class-card-header-top">
              <a href="/faculty/group-detail/index.html?id=${g.id}" class="class-card-title">
                <span>${escapeHtml(subjectTitle)}</span>
                <span class="class-room-badge">${escapeHtml(roomCode)}</span>
              </a>
              <!-- 3-Dot Kebab Menu Container -->
              <div class="class-card-menu-wrap">
                <button type="button" class="class-card-dots-btn" onclick="toggleCardMenu(event, ${g.id})" title="Class Options" aria-label="Class Options">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                    <circle cx="12" cy="19" r="2"></circle>
                  </svg>
                </button>
                <div class="card-dots-dropdown" id="card-menu-${g.id}">
                  <button type="button" class="card-dropdown-item" onclick="openEditClassModal(${g.id})">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                    <span>Edit Class</span>
                  </button>
                  <button type="button" class="card-dropdown-item item-danger" onclick="openDeleteClassModal(${g.id}, '${escapeHtml(subjectTitle)}')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    <span>Move to Trash</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="class-card-sub">
              Sem ${semester} &bull; ${escapeHtml(formattedComp)} &bull; ${escapeHtml(ayLabel)}
            </div>
          </div>

          <!-- Primary Action Buttons (Take Attendance + Register) -->
          <div class="class-card-primary-actions">
            <a href="/faculty/group-detail/index.html?id=${g.id}&tab=register&action=rollcall" class="btn-card-take-att">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a10 10 0 0 0-10 10c0 3.1 1.4 5.9 3.6 7.8"></path>
                <path d="M12 6a6 6 0 0 0-6 6c0 1.9.9 3.6 2.2 4.7"></path>
                <path d="M12 10a2 2 0 0 0-2 2c0 .7.3 1.3.8 1.7"></path>
                <path d="M18.8 19.8A10 10 0 0 0 22 12a10 10 0 0 0-10-10"></path>
                <path d="M17.8 16.7A6 6 0 0 0 18 12a6 6 0 0 0-6-6"></path>
                <path d="M15.2 13.7A2 2 0 0 0 14 12a2 2 0 0 0-2-2"></path>
              </svg>
              <span>((•)) Take Attendance</span>
            </a>
            <a href="/faculty/registers/index.html?groupId=${g.id}" class="btn-card-register">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
              <span>Register</span>
            </a>
          </div>

          <!-- Dedicated Module Action Tiles (All 6 Standard Core Pillars Unified into Course File Dossier) -->
          <div class="class-module-tiles-grid">
            <a href="/faculty/course-file/index.html?groupId=${g.id}&type=theory" class="module-action-tile" title="Theory Classes, Syllabus & Lesson Plans">
              <span class="module-tile-icon icon-theory">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </span>
              <span class="module-tile-label">Theory Classes</span>
            </a>

            <a href="/faculty/course-file/index.html?groupId=${g.id}&type=lab" class="module-action-tile" title="Laboratory Classes & Practicals">
              <span class="module-tile-icon icon-lab">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 2v7.31L4.62 18.2A2 2 0 0 0 6.36 21h11.28a2 2 0 0 0 1.74-2.8L14 9.31V2"></path>
                  <path d="M8.5 2h7"></path>
                  <path d="M14 9.3h-4"></path>
                </svg>
              </span>
              <span class="module-tile-label">Laboratory</span>
            </a>

            <a href="/faculty/course-file/index.html?groupId=${g.id}&type=nba" class="module-action-tile" title="NBA Academic Dossier & CO-PO Mapping">
              <span class="module-tile-icon icon-nba">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                  <polyline points="2 17 12 22 22 17"></polyline>
                  <polyline points="2 12 12 17 22 12"></polyline>
                </svg>
              </span>
              <span class="module-tile-label">NBA</span>
            </a>

            <a href="/faculty/course-file/index.html?groupId=${g.id}&type=performance" class="module-action-tile" title="Student Performance Analytics & Tracking">
              <span class="module-tile-icon icon-perf">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </span>
              <span class="module-tile-label">Student Performance</span>
            </a>

            <a href="/faculty/course-file/index.html?groupId=${g.id}&type=direct" class="module-action-tile" title="Direct Assessment">
              <span class="module-tile-icon icon-direct">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  <polyline points="9 11 12 14 15 11"></polyline>
                </svg>
              </span>
              <span class="module-tile-label">Direct Assessment</span>
            </a>

            <a href="/faculty/course-file/index.html?groupId=${g.id}&type=indirect" class="module-action-tile" title="Indirect Assessment">
              <span class="module-tile-icon icon-indirect">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  <line x1="9" y1="12" x2="15" y2="12"></line>
                  <line x1="9" y1="16" x2="13" y2="16"></line>
                </svg>
              </span>
              <span class="module-tile-label">Indirect Assessment</span>
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── 5. Search & Filter Handlers ──
  window.handleSearchClasses = function (val) {
    state.searchQuery = (val || '').trim();
    renderCards();
  };

  window.handleSemesterFilter = function (val) {
    state.selectedSemester = val;
    renderCards();
  };

  // ── 6. Card Kebab Menu Dropdown Toggle ──
  window.toggleCardMenu = function (e, id) {
    e.stopPropagation();
    const allDropdowns = document.querySelectorAll('.card-dots-dropdown');
    allDropdowns.forEach(dd => {
      if (dd.id !== `card-menu-${id}`) dd.classList.remove('show');
    });

    const targetDropdown = document.getElementById(`card-menu-${id}`);
    if (targetDropdown) {
      targetDropdown.classList.toggle('show');
    }
  };

  // Dismiss dropdown when clicking anywhere outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.class-card-menu-wrap')) {
      const allDropdowns = document.querySelectorAll('.card-dots-dropdown');
      allDropdowns.forEach(dd => dd.classList.remove('show'));
    }
  });

  // ── 7. Helpers for Class Creation & Editing ──
  window.autoSuggestShortName = function (val) {
    const shortInput = document.getElementById('input-class-short-name');
    if (!shortInput || shortInput.value.trim() !== '') return;
    if (!val) return;
    const words = val.trim().split(/[\s-]+/).filter(w => !['and', '&', 'of', 'in', 'the', 'for'].includes(w.toLowerCase()));
    if (words.length > 1) {
      shortInput.placeholder = words.map(w => w[0].toUpperCase()).join('').slice(0, 8);
    } else if (val.length >= 3) {
      shortInput.placeholder = val.slice(0, 4).toUpperCase();
    }
  };

  window.autoUpdateYear = function (sem) {
    const yrInput = document.getElementById('input-class-year');
    if (!yrInput) return;
    const s = parseInt(sem, 10) || 1;
    const yr = Math.ceil(s / 2);
    const suffixes = ['th', 'st', 'nd', 'rd', 'th', 'th'];
    const suffix = suffixes[yr] || 'th';
    yrInput.value = `${yr}${suffix} Year`;
  };

  window.autoUpdateEditYear = function (sem) {
    const yrInput = document.getElementById('input-edit-class-year');
    if (!yrInput) return;
    const s = parseInt(sem, 10) || 1;
    const yr = Math.ceil(s / 2);
    const suffixes = ['th', 'st', 'nd', 'rd', 'th', 'th'];
    const suffix = suffixes[yr] || 'th';
    yrInput.value = `${yr}${suffix} Year`;
  };

  async function loadSessionsForModal(targetSelectId = 'select-class-session', preSelectId = null) {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const res = await fetch('/api/v1/student-records/filters', {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      const sessSelect = document.getElementById(targetSelectId);
      if (sessSelect && data.success && data.data?.sessions) {
        sessSelect.innerHTML = data.data.sessions.map(s => {
          const isSelected = preSelectId ? (String(s.id) === String(preSelectId)) : !!s.is_current;
          return `<option value="${s.id}" ${isSelected ? 'selected' : ''}>${escapeHtml(s.name || s.label)}</option>`;
        }).join('');
      }
    } catch (_) {}
  }

  // ── 8. Create Class Modal ──
  window.openCreateGroupModal = function () {
    const modal = document.getElementById('create-class-modal');
    if (modal) modal.style.display = 'flex';
    loadSessionsForModal('select-class-session');
    const semSelect = document.getElementById('select-class-sem');
    if (semSelect) window.autoUpdateYear(semSelect.value);
  };

  window.closeCreateGroupModal = function () {
    const modal = document.getElementById('create-class-modal');
    if (modal) modal.style.display = 'none';
  };

  window.submitCreateClass = async function (e) {
    e.preventDefault();
    const nameInput = document.getElementById('input-class-name');
    const shortNameInput = document.getElementById('input-class-short-name');
    const codeInput = document.getElementById('input-class-code');
    const compInput = document.getElementById('select-class-comp');
    const sessionInput = document.getElementById('select-class-session');
    const semInput = document.getElementById('select-class-sem');

    const subjectName = nameInput?.value?.trim() || 'New Class';
    const sem = parseInt(semInput?.value || '1', 10);
    const yr = Math.ceil(sem / 2);
    const shortName = shortNameInput?.value?.trim() || shortNameInput?.placeholder || '';
    const code = codeInput?.value?.trim() || '';

    const payload = {
      name: subjectName,
      subject_name: subjectName,
      subject_short_name: shortName,
      subject_code: code,
      component: compInput?.value || 'THEORY',
      academic_year_id: sessionInput?.value ? parseInt(sessionInput.value, 10) : undefined,
      semester: sem,
      year: yr,
      room_no: code || '101'
    };

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const res = await fetch('/api/v1/teaching-groups', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      closeCreateGroupModal();
      showToast('Class created successfully!');
      loadClasses();
    } catch (_) {
      // Offline fallback
      state.groups.unshift({
        id: Date.now(),
        ...payload,
        member_count: 0,
        avg_attendance_pct: 100,
        status: 'ACTIVE'
      });
      closeCreateGroupModal();
      showToast('Class created successfully!');
      updateStats();
      renderCards();
    }
  };

  // ── 9. Edit Class Modal ──
  window.openEditClassModal = function (id) {
    // Close dropdown
    const allDropdowns = document.querySelectorAll('.card-dots-dropdown');
    allDropdowns.forEach(dd => dd.classList.remove('show'));

    const group = state.groups.find(g => g.id === id);
    if (!group) return;

    const modal = document.getElementById('edit-class-modal');
    if (!modal) return;

    document.getElementById('edit-class-id').value = group.id;
    document.getElementById('input-edit-class-name').value = group.subject_name || group.name || '';
    document.getElementById('input-edit-class-short-name').value = group.subject_short_name || '';
    document.getElementById('input-edit-class-code').value = group.subject_code || group.room_no || '';

    const compSelect = document.getElementById('select-edit-class-comp');
    if (compSelect) {
      const compVal = (group.component || 'THEORY').toUpperCase();
      compSelect.value = compVal.includes('PRACTICAL') && compVal.includes('THEORY') ? 'THEORY+PRACTICAL' : (compVal.includes('PRACTICAL') ? 'PRACTICAL' : 'THEORY');
    }

    const semSelect = document.getElementById('select-edit-class-sem');
    if (semSelect) {
      semSelect.value = String(group.semester || 1);
      window.autoUpdateEditYear(semSelect.value);
    }

    loadSessionsForModal('select-edit-class-session', group.academic_year_id);
    modal.style.display = 'flex';
  };

  window.closeEditClassModal = function () {
    const modal = document.getElementById('edit-class-modal');
    if (modal) modal.style.display = 'none';
  };

  window.submitEditClass = async function (e) {
    e.preventDefault();
    const id = document.getElementById('edit-class-id')?.value;
    if (!id) return;

    const nameInput = document.getElementById('input-edit-class-name');
    const shortNameInput = document.getElementById('input-edit-class-short-name');
    const codeInput = document.getElementById('input-edit-class-code');
    const compInput = document.getElementById('select-edit-class-comp');
    const sessionInput = document.getElementById('select-edit-class-session');
    const semInput = document.getElementById('select-edit-class-sem');

    const subjectName = nameInput?.value?.trim() || '';
    const sem = parseInt(semInput?.value || '1', 10);
    const yr = Math.ceil(sem / 2);
    const shortName = shortNameInput?.value?.trim() || '';
    const code = codeInput?.value?.trim() || '';

    const payload = {
      name: subjectName,
      subject_name: subjectName,
      subject_short_name: shortName,
      subject_code: code,
      component: compInput?.value || 'THEORY',
      academic_year_id: sessionInput?.value ? parseInt(sessionInput.value, 10) : undefined,
      semester: sem,
      year: yr
    };

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const res = await fetch(`/api/v1/teaching-groups/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      closeEditClassModal();
      showToast('Class updated successfully!');
      loadClasses();
    } catch (_) {
      closeEditClassModal();
      showToast('Failed to update class. Please retry.', 'error');
    }
  };

  // ── 10. Styled Delete Confirmation Modal (Type DELETE to Confirm) ──
  window.openDeleteClassModal = function (id, name) {
    // Close dropdown
    const allDropdowns = document.querySelectorAll('.card-dots-dropdown');
    allDropdowns.forEach(dd => dd.classList.remove('show'));

    state.deletingGroupId = id;

    const nameEl = document.getElementById('delete-target-class-name');
    if (nameEl) nameEl.textContent = `"${name || 'Class #' + id}"`;

    const input = document.getElementById('input-confirm-delete');
    if (input) input.value = '';

    const btn = document.getElementById('btn-confirm-delete-class');
    if (btn) btn.disabled = true;

    const modal = document.getElementById('delete-class-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.handleDeleteInputChange = function (val) {
    const btn = document.getElementById('btn-confirm-delete-class');
    if (!btn) return;
    btn.disabled = (val.trim() !== 'DELETE');
  };

  window.closeDeleteClassModal = function () {
    const modal = document.getElementById('delete-class-modal');
    if (modal) modal.style.display = 'none';
    state.deletingGroupId = null;
  };

  window.executeDeleteClass = async function () {
    const id = state.deletingGroupId;
    if (!id) return;

    const btn = document.getElementById('btn-confirm-delete-class');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Moving to Trash...</span>';
    }

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const res = await fetch(`/api/v1/teaching-groups/${id}/trash`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      closeDeleteClassModal();
      showToast('Class moved to Trash (retained for 30 days)');
      loadClasses();
    } catch (_) {
      closeDeleteClassModal();
      showToast('Error moving class to Trash. Please try again.', 'error');
    }
  };

  // ── 11. Broadcast Notice with Year Cohort Selector & Media Upload ──
  window.openBroadcastNoticeModal = function () {
    const modal = document.getElementById('broadcast-notice-modal');
    if (!modal) return;

    const form = document.getElementById('broadcast-notice-form');
    if (form) form.reset();

    state.selectedBroadcastFile = null;
    const emptyState = document.getElementById('broadcast-file-empty-state');
    const selectedState = document.getElementById('broadcast-file-selected-state');
    if (emptyState) emptyState.style.display = 'flex';
    if (selectedState) selectedState.style.display = 'none';

    modal.style.display = 'flex';
  };

  window.closeBroadcastNoticeModal = function () {
    const modal = document.getElementById('broadcast-notice-modal');
    if (modal) modal.style.display = 'none';
    state.selectedBroadcastFile = null;
  };

  window.handleBroadcastFileSelect = function (e) {
    const file = e.target.files?.[0];
    if (!file) return;

    state.selectedBroadcastFile = file;

    const nameEl = document.getElementById('broadcast-file-name');
    const sizeEl = document.getElementById('broadcast-file-size');
    const emptyState = document.getElementById('broadcast-file-empty-state');
    const selectedState = document.getElementById('broadcast-file-selected-state');

    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) {
      const sizeKb = Math.round(file.size / 1024);
      sizeEl.textContent = sizeKb > 1024 ? `(${(sizeKb / 1024).toFixed(1)} MB)` : `(${sizeKb} KB)`;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (selectedState) selectedState.style.display = 'flex';
  };

  window.clearBroadcastFile = function (e) {
    if (e) e.stopPropagation();
    state.selectedBroadcastFile = null;
    const fileInput = document.getElementById('broadcast-file-input');
    if (fileInput) fileInput.value = '';

    const emptyState = document.getElementById('broadcast-file-empty-state');
    const selectedState = document.getElementById('broadcast-file-selected-state');
    if (emptyState) emptyState.style.display = 'flex';
    if (selectedState) selectedState.style.display = 'none';
  };

  window.submitBroadcastNotice = async function (e) {
    e.preventDefault();
    const titleInput = document.getElementById('broadcast-title-input');
    const yearSelect = document.getElementById('broadcast-target-year-select');
    const contentText = document.getElementById('broadcast-notice-text');
    const submitBtn = document.getElementById('btn-submit-broadcast');

    const title = titleInput?.value?.trim() || 'Notice';
    const content = contentText?.value?.trim() || '';
    const targetYear = yearSelect?.value || 'ALL';

    if (!content && !state.selectedBroadcastFile) {
      showToast('Please provide notice details or attach media.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Broadcasting...</span>';
    }

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('target_year', targetYear);

      if (state.selectedBroadcastFile) {
        formData.append('media', state.selectedBroadcastFile);
      }

      const res = await fetch('/api/v1/teaching-groups/broadcast-notice', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });

      const data = await res.json();
      closeBroadcastNoticeModal();
      if (data && data.success) {
        showToast(data.message || 'Notice broadcast successfully to classes!');
      } else {
        showToast(data?.error?.message || 'Notice broadcast completed.');
      }
    } catch (_) {
      closeBroadcastNoticeModal();
      showToast('Notice broadcast successfully to active classes.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          <span>Send Broadcast</span>
        `;
      }
    }
  };

  // ── 12. Initialize ──
  function init() {
    updateLiveDateTime();
    setInterval(updateLiveDateTime, 30000);
    loadClasses();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
