/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: GROUPS
 * frontend/student/groups/groups.js
 * ══════════════════════════════════════════════════════════════
 */

// Guard route for Students
    guardRoute({ requireRoles: ['STUDENT'] });

    let state = {
      groups: [],
      currentFilter: 'ALL', // 'ALL' | 'THEORY' | 'PRACTICAL'
      searchQuery: '',
      activeGroupId: null,
      activeGroupData: null
    };

    document.addEventListener('DOMContentLoaded', () => {
      loadMyGroups();
    });

    async function loadMyGroups() {
      try {
        const res = await apiRequest('/api/v1/teaching-groups/student/my-groups');
        if (res && res.data) {
          state.groups = res.data;
          updateFilterCounts();
          renderGroups();
        }
      } catch (err) {
        console.error('Failed to load student teaching groups:', err);
        const grid = document.getElementById('groups-grid');
        if (grid) {
          grid.innerHTML = `
            <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--status-absent);">
              Failed to load teaching groups: ${escapeHtml(err.message || 'Server error')}
            </div>
          `;
        }
      }
    }

    function updateFilterCounts() {
      const allCount = state.groups.length;
      const theoryCount = state.groups.filter(g => (g.component || '').toUpperCase() === 'THEORY').length;
      const practicalCount = state.groups.filter(g => (g.component || '').toUpperCase() === 'PRACTICAL').length;

      const elAll = document.getElementById('count-all');
      const elTheory = document.getElementById('count-theory');
      const elPractical = document.getElementById('count-practical');

      if (elAll) elAll.textContent = allCount;
      if (elTheory) elTheory.textContent = theoryCount;
      if (elPractical) elPractical.textContent = practicalCount;
    }

    function setComponentFilter(filter) {
      state.currentFilter = filter;
      ['all', 'theory', 'practical'].forEach(f => {
        const btn = document.getElementById(`filter-${f}`);
        if (btn) {
          if (f.toUpperCase() === filter) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        }
      });
      renderGroups();
    }

    function handleSearch(query) {
      state.searchQuery = (query || '').toLowerCase().trim();
      renderGroups();
    }

    function renderGroups() {
      const grid = document.getElementById('groups-grid');
      if (!grid) return;

      let filtered = state.groups;

      if (state.currentFilter !== 'ALL') {
        filtered = filtered.filter(g => (g.component || '').toUpperCase() === state.currentFilter);
      }

      if (state.searchQuery) {
        const q = state.searchQuery;
        filtered = filtered.filter(g => {
          const name = (g.name || '').toLowerCase();
          const sub = (g.subject_name || '').toLowerCase();
          const teacher = (g.teacher_name || '').toLowerCase();
          const dept = (g.department_name || g.department_code || '').toLowerCase();
          return name.includes(q) || sub.includes(q) || teacher.includes(q) || dept.includes(q);
        });
      }

      if (filtered.length === 0) {
        if (state.groups.length === 0) {
          grid.innerHTML = `
            <div class="empty-state-card">
              <div style="display:flex;justify-content:center;margin-bottom:0.6rem;"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></div>
              <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem;">
                No Enrolled Teaching Groups Yet
              </h3>
              <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 480px; margin: 0 auto 1.25rem auto; line-height: 1.45;">
                Ask your subject teachers for the 6-character invite code to join your classroom groups and sync coursework.
              </p>
              <button class="btn btn-primary" onclick="openJoinModal()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Join Group with Code
              </button>
            </div>
          `;
        } else {
          grid.innerHTML = `
            <div class="empty-state-card">
              <div style="display:flex;justify-content:center;margin-bottom:0.5rem;"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></div>
              <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.35rem;">
                No Matching Groups Found
              </h3>
              <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
                No teaching groups match your selected filter or search query.
              </p>
              <button class="btn btn-secondary btn-sm" onclick="clearFilters()">Clear Filters</button>
            </div>
          `;
        }
        return;
      }

      grid.innerHTML = filtered.map(group => {
        const isTheory = (group.component || '').toUpperCase() === 'THEORY';
        const compClass = isTheory ? 'component-theory' : 'component-practical';
        const compLabel = isTheory ? 'Theory' : 'Practical';
        const isArchived = (group.status || '').toUpperCase() === 'ARCHIVED';

        return `
          <div class="group-card" id="group-card-${group.id}">
            <div class="card-header-bar">
              <div class="card-header-main">
                <h3 class="group-name-title">${escapeHtml(group.name)}</h3>
                <div class="subject-sub">
                  <span>${escapeHtml(group.subject_name || 'Subject')}</span>
                  <span class="component-badge ${compClass}">${compLabel}</span>
                  ${isArchived ? '<span class="badge" style="background:var(--chip-classteacher-bg); color:var(--text-muted); font-size:0.65rem;">ARCHIVED</span>' : ''}
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="info-row">
                <span class="info-label" style="display:inline-flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Instructor:</span>
                <span class="info-val">${escapeHtml(group.teacher_name || 'Assigned Faculty')}</span>
              </div>
              <div class="info-row">
                <span class="info-label" style="display:inline-flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"></path></svg> Department:</span>
                <span class="info-val">${escapeHtml(group.department_code || group.department_name || 'General')}</span>
              </div>
              <div class="info-row">
                <span class="info-label" style="display:inline-flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Semester:</span>
                <span class="info-val">Sem ${group.semester || 1} • ${escapeHtml(group.academic_year_label || 'Current Session')}</span>
              </div>

              <div class="shortcuts-grid" style="margin-top: 0.4rem;">
                <a href="/student/assignments.html" class="shortcut-btn" title="View Coursework Assignments">
                  <span style="display:inline-flex;align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></span>
                  <span>Assignments (${group.assignment_count || 0})</span>
                </a>
                <a href="/student/scores.html" class="shortcut-btn" title="View Class Tests & Exam Marks">
                  <span style="display:inline-flex;align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></span>
                  <span>Tests (${group.exam_count || 0})</span>
                </a>
              </div>
            </div>

            <div class="card-footer">
              <button type="button" class="stream-open-btn" onclick="openStudentStream(${group.id}, '${escapeHtml(group.name)}')">
                <span style="display:inline-flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Classroom Stream &amp; Announcements</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    function clearFilters() {
      state.currentFilter = 'ALL';
      state.searchQuery = '';
      const input = document.getElementById('groups-search-input');
      if (input) input.value = '';
      setComponentFilter('ALL');
    }

    function openJoinModal() {
      const errBox = document.getElementById('join-error-msg');
      if (errBox) errBox.style.display = 'none';
      const input = document.getElementById('join-invite-code');
      if (input) input.value = '';
      openModal('join-group-modal');
      setTimeout(() => input?.focus(), 150);
    }

    async function handleJoinSubmit(e) {
      e.preventDefault();
      const input = document.getElementById('join-invite-code');
      const errBox = document.getElementById('join-error-msg');
      const submitBtn = document.getElementById('btn-submit-join');

      const code = (input?.value || '').trim().toUpperCase();
      if (!code) {
        if (errBox) {
          errBox.textContent = 'Please enter an invite code';
          errBox.style.display = 'block';
        }
        return;
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Joining...';
        }
        if (errBox) errBox.style.display = 'none';

        const res = await apiRequest('/api/v1/teaching-groups/join', {
          method: 'POST',
          body: JSON.stringify({ invite_code: code })
        });

        if (res && res.success) {
          showToast(res.message || 'Successfully joined teaching group!', 'success');
          closeModal('join-group-modal');
          await loadMyGroups();
        } else {
          throw new Error(res?.error?.message || 'Failed to join group');
        }
      } catch (err) {
        if (errBox) {
          errBox.textContent = err.message || 'Invalid invite code or group not found';
          errBox.style.display = 'block';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Join Group';
        }
      }
    }

    let currentHubTab = 'stream';
    let currentSubmitAssignmentId = null;

    async function openStudentStream(groupId, groupName) {
      state.activeGroupId = groupId;
      const grp = state.groups.find(g => g.id === Number(groupId));
      
      const titleEl = document.getElementById('stream-modal-group-name');
      if (titleEl) titleEl.textContent = `${groupName || grp?.name || 'Classroom'} — Hub`;

      const metaEl = document.getElementById('stream-modal-meta');
      if (metaEl && grp) {
        metaEl.textContent = `${grp.subject_name || 'Subject'} • ${grp.component || 'Theory'} • ${grp.teacher_name || 'Faculty'}`;
      }

      const commentInput = document.getElementById('stream-comment-input');
      if (commentInput) commentInput.value = '';

      openModal('student-stream-modal');
      studentSwitchHubTab('stream');
    }

    function studentSwitchHubTab(tab) {
      currentHubTab = tab;
      const tabs = ['stream', 'classwork', 'tests', 'attendance'];
      tabs.forEach(t => {
        const btn = document.getElementById(`student-tab-${t}-btn`);
        const pane = document.getElementById(`student-hub-${t}-pane`);
        if (btn) {
          if (t === tab) {
            btn.style.color = 'var(--color-primary)';
            btn.style.borderBottomColor = 'var(--color-primary)';
            btn.style.fontWeight = '700';
          } else {
            btn.style.color = 'var(--text-muted)';
            btn.style.borderBottomColor = 'transparent';
            btn.style.fontWeight = '600';
          }
        }
        if (pane) {
          pane.style.display = (t === tab) ? 'block' : 'none';
        }
      });

      const cwBtn = document.getElementById('student-tab-classwork-btn');
      if (cwBtn && state.activeGroupId) {
        const activeGrp = state.groups.find(g => g.id === state.activeGroupId);
        const hasPending = activeGrp && activeGrp.pending_work_count > 0;
        let dot = cwBtn.querySelector('.student-cw-dot');
        if (hasPending) {
          if (!dot) {
            dot = document.createElement('span');
            dot.className = 'student-cw-dot';
            dot.style.cssText = 'width:7px;height:7px;border-radius:50%;background:var(--status-absent);display:inline-block;margin-left:5px;box-shadow:0 0 4px var(--status-absent);';
            cwBtn.appendChild(dot);
          }
        } else if (dot) {
          dot.remove();
        }
      }

      if (!state.activeGroupId) return;

      if (tab === 'stream') {
        refreshActiveStream();
      } else if (tab === 'classwork') {
        loadStudentGroupAssignments(state.activeGroupId);
      } else if (tab === 'tests') {
        loadStudentGroupTests(state.activeGroupId);
      } else if (tab === 'attendance') {
        loadStudentGroupAttendance(state.activeGroupId);
      }
    }

    window._stagedDocs = window._stagedDocs || {};
    window._cachedAssignments = [];

    async function loadStudentGroupAssignments(groupId) {
      const container = document.getElementById('student-assignments-container');
      if (!container) return;
      container.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">Loading assignments...</div>';

      try {
        const res = await apiRequest(`/api/v1/assignments?group_id=${groupId}`);
        const assignments = res?.data || [];
        window._cachedAssignments = assignments;

        if (assignments.length === 0) {
          container.innerHTML = `
            <div style="text-align:center; padding:2rem 1rem; background:var(--bg-surface); border:1px dashed var(--border-color); border-radius:var(--radius-md);">
              <div style="display:flex;justify-content:center;margin-bottom:0.4rem;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></div>
              <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">
                No coursework assignments posted for this group yet.
              </p>
            </div>
          `;
          return;
        }

        container.innerHTML = assignments.map(a => {
          const dueStr = a.due_date ? new Date(a.due_date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          }) : 'No deadline';
          const isSubmitted = a.my_status === 'SUBMITTED' || a.my_status === 'LATE' || a.my_status === 'GRADED';
          const isGraded = a.my_status === 'GRADED';
          const isFinalDocs = a.type === 'FINAL_DOCS';

          let statusBadge = '';
          if (isGraded) {
            statusBadge = `<span class="badge" style="background:var(--chip-admin-bg); color:var(--status-present); border:1px solid var(--status-present); font-weight:700; padding:0.2rem 0.5rem; font-size:0.75rem; border-radius:var(--radius-sm);">Graded: ${a.my_marks !== null && a.my_marks !== undefined ? a.my_marks : '-'}/${a.max_marks || '--'}</span>`;
          } else if (isSubmitted) {
            statusBadge = `<span class="badge" style="background:var(--chip-faculty-bg); color:var(--color-primary); border:1px solid var(--color-primary); font-weight:700; padding:0.2rem 0.5rem; font-size:0.75rem; border-radius:var(--radius-sm);">Turned In (${a.my_status})</span>`;
          } else {
            statusBadge = `<span class="badge" style="background:var(--chip-classteacher-bg); color:var(--status-absent); border:1px solid var(--status-absent); font-weight:700; padding:0.2rem 0.5rem; font-size:0.75rem; border-radius:var(--radius-sm);">Pending Submission</span>`;
          }

          const feedbackRow = (a.my_feedback && a.my_feedback.trim()) ? `
            <div style="margin-top:0.5rem; padding:0.5rem 0.75rem; background:var(--bg-surface); border-left:3px solid var(--status-present); border-radius:var(--radius-sm); font-size:0.8rem; color:var(--text-main);">
              <strong>Feedback:</strong> ${escapeHtml(a.my_feedback)}
            </div>
          ` : '';

          const attachmentRow = a.attachment_path ? `
            <div style="margin-top:0.4rem; font-size:0.78rem;">
              <a href="${escapeHtml(a.attachment_path)}" target="_blank" style="color:var(--color-primary); text-decoration:underline;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg> ${escapeHtml(a.attachment_name || 'Assignment Brief/Attachment')}
              </a>
            </div>
          ` : '';

          // ── SPECIAL FINAL DOCUMENTS WORKFLOW ──
          if (isFinalDocs) {
            let reqs = [];
            if (Array.isArray(a.questions) && a.questions.length > 0) reqs = a.questions;
            else if (typeof a.questions === 'string') {
              try { reqs = JSON.parse(a.questions); } catch(_) { reqs = []; }
            }
            if (!reqs.length) {
              reqs = [
                'Total Assignments PDF Records (Consolidated)',
                'Class Test Records / Question Paper Solutions',
                'Practical / Lab Journal Records & Implementation',
                'Viva Voce / Micro-Project Documentation'
              ];
            }

            let submittedDocs = null;
            if (a.my_file_path) {
              try {
                const parsed = JSON.parse(a.my_file_path);
                if (Array.isArray(parsed)) submittedDocs = parsed;
              } catch (_) {}
            }

            const staged = window._stagedDocs[a.id] || {};
            const uploadedCount = reqs.filter(r => staged[r]).length;
            const allUploaded = reqs.length > 0 && uploadedCount === reqs.length;

            return `
              <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.1rem; margin-bottom:0.95rem;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.4rem; gap:0.5rem; flex-wrap:wrap;">
                  <div>
                    <span class="badge" style="background:var(--color-primary-light); color:var(--color-primary); font-size:0.72rem; font-weight:700; margin-bottom:0.25rem; display:inline-block">Final Documents Bundle</span>
                    <div style="font-weight:700; font-size:1rem; color:var(--text-main);">${escapeHtml(a.title)}</div>
                  </div>
                  <div>${statusBadge}</div>
                </div>

                <div style="display:flex; align-items:center; gap:1rem; font-size:0.78rem; color:var(--text-muted); margin-bottom:0.6rem; flex-wrap:wrap;">
                  <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Deadline: <strong style="color:var(--text-main);">${dueStr}</strong></span>
                  <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Instructor: <strong style="color:var(--text-main);">${escapeHtml(a.teacher_name || 'Faculty')}</strong></span>
                </div>

                ${a.description ? `<p style="font-size:0.82rem; color:var(--text-main); line-height:1.45; margin:0 0 0.65rem 0; white-space:pre-wrap;">${escapeHtml(a.description)}</p>` : ''}
                ${feedbackRow}

                <!-- Requirements List Area -->
                <div style="margin-top:0.75rem; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.85rem;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
                    <span style="font-size:0.8rem; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.04em">Required Documents Checklist</span>
                    <span style="font-size:0.75rem; font-weight:700; color:var(--color-primary)">${uploadedCount} of ${reqs.length} Attached</span>
                  </div>

                  <div style="display:flex; flex-direction:column; gap:0.45rem;">
                    ${reqs.map(req => {
                      const up = staged[req];
                      const subDoc = submittedDocs ? submittedDocs.find(d => d.requirement_name === req) : null;

                      if (subDoc) {
                        return `
                          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; padding:0.45rem 0.65rem; background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-sm);">
                            <span style="font-size:0.82rem; font-weight:600; color:var(--text-main);"><span style="display:inline-flex;align-items:center;margin-right:3px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>${escapeHtml(req)}</span>
                            <a href="${escapeHtml(subDoc.file_path)}" target="_blank" class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding:0.2rem 0.55rem; text-decoration:none;">View Submitted</a>
                          </div>
                        `;
                      }

                      if (up) {
                        return `
                          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; padding:0.45rem 0.65rem; background:var(--status-present-bg); border:1px solid var(--status-present); border-radius:var(--radius-sm);">
                            <div style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                              <span style="font-weight:700; color:var(--status-present); font-size:0.82rem;"><span style="display:inline-flex;align-items:center;margin-right:3px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>${escapeHtml(req)}:</span>
                              <span style="font-size:0.8rem; color:var(--text-main); margin-left:0.25rem;">${escapeHtml(up.original_filename)}</span>
                            </div>
                            <button type="button" class="btn btn-secondary btn-sm" onclick="openStudentItemUploadModal(${a.id}, '${escapeHtml(req)}')" style="font-size:0.75rem; padding:0.2rem 0.55rem; white-space:nowrap;">Replace</button>
                          </div>
                        `;
                      }

                      return `
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; padding:0.45rem 0.65rem; background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-sm);">
                          <span style="font-size:0.82rem; font-weight:500; color:var(--text-main);">• ${escapeHtml(req)}</span>
                          <button type="button" class="btn btn-primary btn-sm" onclick="openStudentItemUploadModal(${a.id}, '${escapeHtml(req)}')" style="font-size:0.75rem; padding:0.2rem 0.55rem; white-space:nowrap;">Upload</button>
                        </div>
                      `;
                    }).join('')}
                  </div>

                  <!-- Big Main Upload Button -->
                  ${!isSubmitted ? `
                    <button type="button" class="btn btn-secondary" onclick="openStudentBigUploadModal(${a.id})" style="width:100%; margin-top:0.75rem; padding:0.65rem; font-weight:700; display:flex; align-items:center; justify-content:center; gap:0.45rem; background:var(--bg-card); border:1px dashed var(--color-primary); color:var(--color-primary); border-radius:var(--radius-md); cursor:pointer;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                      <span>Upload Required Document (Select from Checklist)</span>
                    </button>
                  ` : ''}

                  <!-- Submit All Documents Button -->
                  ${!isSubmitted ? (
                    allUploaded ? `
                      <button type="button" class="btn btn-primary" onclick="submitFinalDocsBundle(${a.id})" style="width:100%; margin-top:0.65rem; padding:0.65rem 1rem; font-weight:800; background:var(--status-present); border:none; border-radius:var(--radius-md); cursor:pointer;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> Submit All (${uploadedCount}/${reqs.length}) Documents for Final Evaluation
                      </button>
                    ` : `
                      <button type="button" class="btn btn-secondary" disabled style="opacity:0.65; cursor:not-allowed; width:100%; margin-top:0.65rem; padding:0.65rem 1rem;">
                        Submit All Documents (${uploadedCount}/${reqs.length} Uploaded — Upload all items to unlock submit)
                      </button>
                    `
                  ) : `
                    <div style="margin-top:0.65rem; display:flex; justify-content:flex-end;">
                      <button type="button" class="btn btn-secondary btn-sm" onclick="openStudentBigUploadModal(${a.id})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Re-upload Bundle</button>
                    </div>
                  `}
                </div>
              </div>
            `;
          }

          // ── STANDARD ASSIGNMENT & PRACTICAL WORKFLOW ──
          const actionBtn = isGraded ? '' : `
            <button type="button" class="btn btn-primary btn-sm" onclick="openStudentSubmitModal(${a.id}, '${escapeHtml(a.title)}')" style="font-size:0.78rem; padding:0.35rem 0.75rem;">
              ${isSubmitted ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Re-submit Work' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Turn In Work'}
            </button>
          `;

          return `
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem; margin-bottom:0.85rem;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.4rem; gap:0.5rem; flex-wrap:wrap;">
                <div style="font-weight:700; font-size:0.95rem; color:var(--text-main);">${escapeHtml(a.title)}</div>
                <div>${statusBadge}</div>
              </div>
              <div style="display:flex; align-items:center; gap:1rem; font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem; flex-wrap:wrap;">
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Due: <strong style="color:var(--text-main);">${dueStr}</strong></span>
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg> Max Marks: <strong style="color:var(--text-main);">${a.max_marks || '--'}</strong></span>
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Instructor: <strong style="color:var(--text-main);">${escapeHtml(a.teacher_name || 'Faculty')}</strong></span>
              </div>
              ${a.description ? `<p style="font-size:0.82rem; color:var(--text-main); line-height:1.45; margin:0 0 0.5rem 0; white-space:pre-wrap;">${escapeHtml(a.description)}</p>` : ''}
              ${attachmentRow}
              ${feedbackRow}
              <div style="margin-top:0.75rem; display:flex; justify-content:flex-end;">
                ${actionBtn}
              </div>
            </div>
          `;
        }).join('');
      } catch (err) {
        container.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--status-absent); font-size:0.85rem;">Failed to load assignments: ${escapeHtml(err.message)}</div>`;
      }
    }

    function openStudentItemUploadModal(assignmentId, preselectedReq) {
      const a = (window._cachedAssignments || []).find(item => item.id === assignmentId);
      if (!a) return;
      document.getElementById('student-req-upload-asgn-id').value = assignmentId;
      document.getElementById('student-req-modal-title').textContent = `Upload Document: ${a.title}`;

      let reqs = [];
      if (Array.isArray(a.questions) && a.questions.length > 0) reqs = a.questions;
      else if (typeof a.questions === 'string') {
        try { reqs = JSON.parse(a.questions); } catch(_) { reqs = []; }
      }
      if (!reqs.length) reqs = ['Total Assignments PDF Records (Consolidated)', 'Class Test Records & Solutions', 'Practical / Lab Journal Records', 'Viva Voce Documentation'];

      const staged = window._stagedDocs[assignmentId] || {};
      const sel = document.getElementById('student-req-select');
      sel.innerHTML = reqs.map(r => {
        const isUp = Boolean(staged[r]);
        return `<option value="${escapeHtml(r)}" ${r === preselectedReq ? 'selected' : ''}>${escapeHtml(r)} ${isUp ? '(Attached)' : ''}</option>`;
      }).join('');

      document.getElementById('student-req-file-input').value = '';
      openModal('modal-student-req-upload');
    }

    function openStudentBigUploadModal(assignmentId) {
      openStudentItemUploadModal(assignmentId, null);
    }

    async function handleStudentReqUpload(e) {
      e.preventDefault();
      const assignmentId = Number(document.getElementById('student-req-upload-asgn-id').value);
      const reqName = document.getElementById('student-req-select').value;
      const fileInput = document.getElementById('student-req-file-input');
      const btn = document.getElementById('btn-upload-req-doc');

      if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        showToast('Please select a file to upload', 'warning');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Uploading...';

      try {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch('/api/v1/assignments/upload-document', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        const json = await res.json();
        if (res.ok && json.success) {
          window._stagedDocs[assignmentId] = window._stagedDocs[assignmentId] || {};
          window._stagedDocs[assignmentId][reqName] = {
            requirement_name: reqName,
            file_path: json.data.file_path,
            original_filename: json.data.original_filename
          };
          showToast(`Attached: ${json.data.original_filename}`, 'success');
          closeModal('modal-student-req-upload');
          if (state.activeGroupId) {
            await loadStudentGroupAssignments(state.activeGroupId);
          }
        } else {
          throw new Error(json.error?.message || 'Failed to upload document');
        }
      } catch (err) {
        showToast(err.message || 'Upload failed', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Upload Document';
      }
    }

    async function submitFinalDocsBundle(assignmentId) {
      const staged = window._stagedDocs[assignmentId] || {};
      const docsArray = Object.values(staged);
      if (!docsArray.length) {
        showToast('Please upload all required documents first', 'warning');
        return;
      }

      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`/api/v1/assignments/${assignmentId}/submit-final-docs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ documents: docsArray })
        });

        const json = await res.json();
        if (res.ok && json.success) {
          showToast('All final documents submitted successfully!', 'success');
          delete window._stagedDocs[assignmentId];
          if (state.activeGroupId) {
            await loadStudentGroupAssignments(state.activeGroupId);
          }
        } else {
          throw new Error(json.error?.message || 'Failed to submit bundle');
        }
      } catch (err) {
        showToast(err.message || 'Failed to submit documents', 'error');
      }
    }

    function openStudentSubmitModal(assignmentId, title) {
      currentSubmitAssignmentId = assignmentId;
      const titleEl = document.getElementById('submit-modal-title');
      if (titleEl) titleEl.textContent = `Turn In: ${title}`;
      const fileInput = document.getElementById('submit-file-input');
      if (fileInput) fileInput.value = '';
      openModal('student-submit-modal');
    }

    async function handleStudentAssignmentSubmit(e) {
      e.preventDefault();
      if (!currentSubmitAssignmentId) return;
      const fileInput = document.getElementById('submit-file-input');
      const submitBtn = document.getElementById('btn-submit-work');

      if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        showToast('Please select a file to upload', 'warning');
        return;
      }

      const formData = new FormData();
      formData.append('file', fileInput.files[0]);

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Uploading...';
        }

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`/api/v1/assignments/${currentSubmitAssignmentId}/submit`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const json = await res.json();
        if (res.ok && json.success) {
          showToast('Assignment submitted successfully!', 'success');
          closeModal('student-submit-modal');
          if (state.activeGroupId) {
            await loadStudentGroupAssignments(state.activeGroupId);
          }
        } else {
          throw new Error(json.error?.message || json.message || 'Failed to submit assignment');
        }
      } catch (err) {
        showToast(err.message || 'Upload failed', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Turn In Work';
        }
      }
    }

    async function loadStudentGroupTests(groupId) {
      const container = document.getElementById('student-tests-container');
      if (!container) return;
      container.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">Loading tests...</div>';

      try {
        const res = await apiRequest(`/api/v1/exams?group_id=${groupId}`);
        const tests = res?.data || [];

        if (tests.length === 0) {
          container.innerHTML = `
            <div style="text-align:center; padding:2rem 1rem; background:var(--bg-surface); border:1px dashed var(--border-color); border-radius:var(--radius-md);">
              <div style="display:flex;justify-content:center;margin-bottom:0.4rem;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></div>
              <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">
                No class tests or exams scheduled for this group yet.
              </p>
            </div>
          `;
          return;
        }

        container.innerHTML = tests.map(ex => {
          const dateStr = ex.exam_date ? new Date(ex.exam_date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          }) : 'Date TBA';

          const hasScore = ex.marks_obtained !== undefined && ex.marks_obtained !== null;

          let remarksText = '';
          if (ex.remarks && typeof ex.remarks === 'string') {
            try {
              const p = JSON.parse(ex.remarks);
              remarksText = p.remarks || '';
            } catch {
              remarksText = ex.remarks;
            }
          }

          return `
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem; margin-bottom:0.85rem;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.4rem; gap:0.5rem; flex-wrap:wrap;">
                <div style="font-weight:700; font-size:0.95rem; color:var(--text-main);">${escapeHtml(ex.name)}</div>
                <div>
                  ${hasScore ? `
                    <span class="badge" style="background:var(--chip-admin-bg); color:var(--status-present); border:1px solid var(--status-present); font-weight:700; padding:0.2rem 0.5rem; font-size:0.75rem; border-radius:var(--radius-sm);">
                      Score: ${ex.marks_obtained} / ${ex.max_marks}
                    </span>
                  ` : `
                    <span class="badge" style="background:var(--chip-classteacher-bg); color:var(--text-muted); font-weight:600; padding:0.2rem 0.5rem; font-size:0.75rem; border-radius:var(--radius-sm);">
                      Marks Pending
                    </span>
                  `}
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:1rem; font-size:0.78rem; color:var(--text-muted); flex-wrap:wrap;">
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Date: <strong style="color:var(--text-main);">${dateStr}</strong></span>
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg> Total Marks: <strong style="color:var(--text-main);">${ex.max_marks}</strong></span>
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Instructor: <strong style="color:var(--text-main);">${escapeHtml(ex.teacher_name || 'Faculty')}</strong></span>
              </div>
              ${remarksText ? `
                <div style="margin-top:0.5rem; padding:0.5rem 0.75rem; background:var(--bg-surface); border-left:3px solid var(--color-primary); border-radius:var(--radius-sm); font-size:0.8rem; color:var(--text-main);">
                  <strong>Teacher Note:</strong> ${escapeHtml(remarksText)}
                </div>
              ` : ''}
            </div>
          `;
        }).join('');
      } catch (err) {
        container.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--status-absent); font-size:0.85rem;">Failed to load tests: ${escapeHtml(err.message)}</div>`;
      }
    }

    async function loadStudentGroupAttendance(groupId) {
      const container = document.getElementById('student-attendance-container');
      if (!container) return;
      container.innerHTML = '<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">Loading attendance record...</div>';

      try {
        const res = await apiRequest('/api/v1/students/me/attendance/subjects');
        const subjects = res?.data || [];
        const grp = state.groups.find(g => g.id === Number(groupId));

        // Match by group_id, register_id, or name
        const match = subjects.find(s => 
          (s.group_id && Number(s.group_id) === Number(groupId)) ||
          (grp && grp.linked_register_id && Number(s.register_id) === Number(grp.linked_register_id)) ||
          (grp && s.subject_name && grp.subject_name && s.subject_name.toLowerCase() === grp.subject_name.toLowerCase())
        );

        if (!match || match.conducted === 0) {
          container.innerHTML = `
            <div style="text-align:center; padding:2rem 1rem; background:var(--bg-surface); border:1px dashed var(--border-color); border-radius:var(--radius-md);">
              <div style="display:flex;justify-content:center;margin-bottom:0.4rem;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></div>
              <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">
                No finalized official attendance sessions conducted yet for this group.
              </p>
            </div>
          `;
          return;
        }

        const isDefaulter = match.percentage < 75.0;
        const statusColor = isDefaulter ? 'var(--status-absent)' : 'var(--status-present)';
        const statusText = isDefaulter ? 'Defaulter Warning (&lt; 75%)' : 'Good Standing (≥ 75%)';

        container.innerHTML = `
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.25rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
              <div>
                <h4 style="margin:0; font-size:1rem; font-weight:700; color:var(--text-main);">Official Subject Attendance</h4>
                <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.2rem;">From finalized teacher register ledger</div>
              </div>
              <span class="badge" style="background:var(--bg-surface); color:${statusColor}; border:1px solid ${statusColor}; font-weight:700; padding:0.3rem 0.65rem; border-radius:var(--radius-sm); font-size:0.8rem;">
                ${statusText}
              </span>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:0.75rem; margin-bottom:1.25rem;">
              <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem; text-align:center;">
                <div style="font-size:1.5rem; font-weight:800; color:var(--text-main);">${match.conducted}</div>
                <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Sessions Held</div>
              </div>
              <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem; text-align:center;">
                <div style="font-size:1.5rem; font-weight:800; color:var(--status-present);">${match.attended}</div>
                <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Attended</div>
              </div>
              <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem; text-align:center;">
                <div style="font-size:1.5rem; font-weight:800; color:var(--status-absent);">${match.absent}</div>
                <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Absent</div>
              </div>
              <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem; text-align:center;">
                <div style="font-size:1.5rem; font-weight:800; color:${statusColor};">${match.percentage}%</div>
                <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Attendance %</div>
              </div>
            </div>

            <div style="font-size:0.78rem; color:var(--text-muted); line-height:1.45;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Note: Official attendance percentage is derived exclusively from finalized attendance ledger records confirmed by your course faculty (Section 62 &amp; Invariant 20).
            </div>
          </div>
        `;
      } catch (err) {
        container.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--status-absent); font-size:0.85rem;">Failed to load attendance summary: ${escapeHtml(err.message)}</div>`;
      }
    }

    async function refreshActiveStream() {
      if (!state.activeGroupId) return;
      const container = document.getElementById('stream-feed-container');
      if (!container) return;

      container.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">Loading announcements...</div>`;

      try {
        const res = await apiRequest(`/api/v1/teaching-groups/${state.activeGroupId}/stream`);
        const posts = res?.data || [];

        if (posts.length === 0) {
          container.innerHTML = `
            <div style="text-align:center; padding:2rem 1rem; background:var(--bg-surface); border:1px dashed var(--border-color); border-radius:var(--radius-md);">
              <div style="display:flex;justify-content:center;margin-bottom:0.4rem;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>
              <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">
                No announcements posted in this classroom stream yet.
              </p>
            </div>
          `;
          return;
        }

        container.innerHTML = posts.map(post => {
          const dateStr = post.created_at ? new Date(post.created_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          }) : '';
          const authorRole = post.author_role === 'TEACHER' ? 'Instructor' : (post.author_role || 'Student');

          return `
            <div class="stream-post-card" id="stream-post-${post.id}">
              <div class="stream-post-meta">
                <span style="font-weight:700; color:var(--text-main);">
                  ${escapeHtml(post.author_name || 'Member')} 
                  <span style="font-weight:400; font-size:0.75rem; color:var(--text-muted);">(${escapeHtml(authorRole)})</span>
                </span>
                <span>${dateStr}</span>
              </div>
              <div class="stream-post-content">${escapeHtml(post.content)}</div>

              <!-- Google Classroom Comments Section -->
              <div class="stream-comments-section">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.25rem 0.6rem; border:none; background:var(--bg-surface); color:var(--color-primary); cursor:pointer;" onclick="togglePostComments(${post.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Discussion (<span id="comment-count-${post.id}">${post.comment_count || 0}</span>)
                  </button>
                  <span style="font-size:0.72rem; color:var(--text-muted);">Click to view/add comments</span>
                </div>

                <div id="comments-container-${post.id}" style="display:none; margin-top:0.6rem;">
                  <div id="comments-list-${post.id}" style="margin-bottom:0.5rem;">
                    <!-- Injected via loadPostComments -->
                  </div>
                </div>

                <div class="comment-input-row">
                  <input type="text" id="comment-input-${post.id}" placeholder="Add a class comment or question..." onkeydown="if(event.key==='Enter')submitComment(${post.id})">
                  <button type="button" class="btn btn-primary" style="padding:0.4rem 0.75rem; font-size:0.78rem;" onclick="submitComment(${post.id})">
                    Post
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      } catch (err) {
        container.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--status-absent); font-size:0.85rem;">Failed to load stream: ${escapeHtml(err.message)}</div>`;
      }
    }

    async function togglePostComments(postId) {
      const container = document.getElementById(`comments-container-${postId}`);
      if (!container) return;
      const isHidden = container.style.display === 'none';
      container.style.display = isHidden ? 'block' : 'none';
      if (isHidden) {
        await loadPostComments(postId);
      }
    }

    async function loadPostComments(postId) {
      const listEl = document.getElementById(`comments-list-${postId}`);
      if (!listEl) return;
      listEl.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); padding:0.35rem 0;">Loading comments...</div>';

      try {
        const res = await apiRequest(`/api/v1/teaching-groups/posts/${postId}/comments`);
        if (res && res.success) {
          const comments = res.data || [];
          const countEl = document.getElementById(`comment-count-${postId}`);
          if (countEl) countEl.innerText = comments.length;

          if (!comments.length) {
            listEl.innerHTML = '<div style="font-size:0.78rem; color:var(--text-muted); padding:0.4rem 0; font-style:italic;">No comments yet. Start the conversation!</div>';
            return;
          }

          listEl.innerHTML = comments.map(c => {
            const initial = (c.author_name || 'U').charAt(0).toUpperCase();
            const isTeacher = c.author_role === 'TEACHER';
            const roleClass = isTeacher ? 'role-instructor' : 'role-student';
            const roleLabel = isTeacher ? 'Instructor' : (c.author_role || 'Student');

            return `
              <div class="stream-comment-item">
                <div class="comment-avatar">${initial}</div>
                <div class="comment-bubble">
                  <div class="comment-header">
                    <span class="comment-author">
                      ${escapeHtml(c.author_name || 'Member')}
                      <span class="comment-role-tag ${roleClass}">${roleLabel}</span>
                    </span>
                    <span class="comment-time">${new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div class="comment-text">${escapeHtml(c.content)}</div>
                </div>
              </div>
            `;
          }).join('');
        }
      } catch (err) {
        listEl.innerHTML = '<div style="font-size:0.75rem; color:var(--status-absent);">Failed to load comments</div>';
      }
    }

    async function submitComment(postId) {
      const input = document.getElementById(`comment-input-${postId}`);
      const content = (input?.value || '').trim();
      if (!content) return;

      try {
        const res = await apiRequest(`/api/v1/teaching-groups/posts/${postId}/comments`, {
          method: 'POST',
          body: JSON.stringify({ content })
        });
        if (res && res.success) {
          input.value = '';
          const container = document.getElementById(`comments-container-${postId}`);
          if (container) container.style.display = 'block';
          await loadPostComments(postId);
        } else {
          showToast(res?.error?.message || 'Failed to post comment', 'error');
        }
      } catch (err) {
        showToast(err.message || 'Failed to post comment', 'error');
      }
    }

    async function submitStreamPost() {
      if (!state.activeGroupId) return;
      const commentInput = document.getElementById('stream-comment-input');
      const text = (commentInput?.value || '').trim();
      if (!text) {
        showToast('Please type a message before posting', 'warning');
        return;
      }

      try {
        const res = await apiRequest(`/api/v1/teaching-groups/${state.activeGroupId}/stream`, {
          method: 'POST',
          body: JSON.stringify({ content: text })
        });

        if (res && res.success) {
          showToast('Message posted!', 'success');
          if (commentInput) commentInput.value = '';
          await refreshActiveStream();
        }
      } catch (err) {
        showToast(err.message || 'Failed to post message', 'error');
      }
    }

    function openModal(id) {
      const modal = document.getElementById(id);
      if (modal) modal.style.display = 'flex';
    }

    function toggleStudentFabMenu(forceState) {
      const menu = document.getElementById('student-fab-menu');
      const trigger = document.getElementById('student-fab-trigger');
      if (!menu || !trigger) return;
      const isOpen = forceState !== undefined ? !forceState : (menu.style.display !== 'none');
      if (isOpen) {
        menu.style.display = 'none';
        trigger.classList.remove('active');
      } else {
        menu.style.display = 'flex';
        trigger.classList.add('active');
      }
    }

    document.addEventListener('click', (e) => {
      const wrapper = document.getElementById('student-fab-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        toggleStudentFabMenu(false);
      }
    });

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

