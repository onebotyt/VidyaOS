/**
 * Classroom Trash Bin & Recovery Studio Controller
 * Handles soft-deleted teaching groups, 30-day auto-purge countdowns,
 * safe classroom restoration, and permanent deletion with verification.
 */

(function () {
  'use strict';

  const state = {
    trashedGroups: [],
    searchQuery: '',
    selectedSemester: 'ALL',
    permDeletingId: null,
    permDeletingTitle: ''
  };

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── 1. Initialization ──
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      if (typeof guardRoute === 'function') {
        const authed = await guardRoute({
          allowedRoles: ['TEACHER', 'SYSTEM_ADMIN', 'HOD', 'FACULTY']
        });
        if (!authed) return;
      }
    } catch (_) {}

    loadTrash();
  });

  // ── 2. Load Soft-Deleted Classes from Backend ──
  async function loadTrash() {
    const container = document.getElementById('trash-cards-container');
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem;">
          <div style="display:inline-block; width: 32px; height: 32px; border: 3px solid var(--border-color); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <p style="font-size: 0.86rem; color: var(--text-muted); margin-top: 0.75rem;">Loading deleted classrooms...</p>
        </div>
      `;
    }

    try {
      let data = [];
      if (window.api && typeof window.api.get === 'function') {
        const res = await window.api.get('/teaching-groups?status=TRASH');
        data = (res && res.data) ? res.data : res;
      } else {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
        const res = await fetch('/api/v1/teaching-groups?status=TRASH', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const resJson = await res.json();
        data = resJson.data || resJson;
      }
      state.trashedGroups = Array.isArray(data) ? data : (data.groups || data.classes || []);
      renderTrashCards();
    } catch (err) {
      console.error('[Trash] Failed to load trashed teaching groups:', err);
      if (container) {
        container.innerHTML = `
          <div class="trash-empty-state">
            <div class="trash-empty-icon" style="color: var(--status-absent);">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 class="trash-empty-title">Error Loading Trash</h3>
            <p class="trash-empty-desc">Could not connect to the classroom service. Please try refreshing.</p>
            <button type="button" class="btn-create-class-solid" onclick="loadTrash()">Retry</button>
          </div>
        `;
      }
    }
  }

  // ── 3. Render Trashed Classroom Cards ──
  function renderTrashCards() {
    const container = document.getElementById('trash-cards-container');
    if (!container) return;

    const filtered = state.trashedGroups.filter(g => {
      if (state.selectedSemester !== 'ALL') {
        if (String(g.semester) !== String(state.selectedSemester)) return false;
      }
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const nameMatch = (g.name || '').toLowerCase().includes(q);
        const subMatch = (g.subject_name || '').toLowerCase().includes(q);
        const codeMatch = (g.subject_code || '').toLowerCase().includes(q);
        const teacherMatch = (g.teacher_name || '').toLowerCase().includes(q);
        return nameMatch || subMatch || codeMatch || teacherMatch;
      }
      return true;
    });

    if (!filtered.length) {
      container.innerHTML = `
        <div class="trash-empty-state">
          <div class="trash-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </div>
          <h3 class="trash-empty-title">Trash Bin is Empty</h3>
          <p class="trash-empty-desc">
            ${state.searchQuery || state.selectedSemester !== 'ALL'
              ? 'No deleted classes match your current search criteria.'
              : 'There are currently no deleted classrooms in your trash bin. Soft-deleted classes remain here for 30 days before permanent auto-purge.'}
          </p>
          <a href="/faculty/classes/index.html" class="btn-create-class-solid">
            <span>Return to My Classes</span>
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(g => {
      const subjectTitle = g.subject_name || g.name || 'Untitled Class';
      const roomCode = g.subject_code || g.room_no || 'N/A';
      const semester = g.semester || 'N/A';
      const ayLabel = g.academic_year_label || 'AY 2026–27';
      const teacherName = g.teacher_name || 'Assigned Faculty';
      const dept = g.department_name || g.department_code || 'Academic Dept';
      const daysLeft = g.days_remaining != null ? Number(g.days_remaining) : 30;
      const isUrgent = daysLeft <= 5;
      const members = Number(g.member_count || 0);
      const assignments = Number(g.assignment_count || 0);

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

      return `
        <article class="trash-card" id="trash-card-${g.id}">
          <header class="trash-card-header">
            <div>
              <h3 class="trash-card-title">${escapeHtml(subjectTitle)}</h3>
              <span class="trash-card-code">Code: ${escapeHtml(roomCode)}</span>
            </div>
            <span class="trash-days-badge ${isUrgent ? 'urgent' : ''}" title="Days remaining before permanent deletion">
              ⏳ ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left
            </span>
          </header>

          <div class="trash-card-body">
            <div class="trash-card-meta-row">
              <span><strong>Semester:</strong> Sem ${semester}</span>
              <span><strong>Component:</strong> ${escapeHtml(formattedComp)}</span>
            </div>
            <div class="trash-card-meta-row">
              <span><strong>Session:</strong> ${escapeHtml(ayLabel)}</span>
              <span><strong>Enrolled:</strong> ${members} Students</span>
            </div>
            <div class="trash-card-meta-row">
              <span><strong>Faculty:</strong> ${escapeHtml(teacherName)}</span>
              <span><strong>Dept:</strong> ${escapeHtml(dept)}</span>
            </div>
            ${assignments > 0 ? `
              <div class="trash-card-meta-row" style="font-size: 0.76rem; color: var(--text-muted);">
                <span>Assignments / Coursework: ${assignments}</span>
              </div>
            ` : ''}
          </div>

          <footer class="trash-card-footer">
            <button type="button" class="btn-trash-restore" onclick="restoreClass(${g.id})" title="Restore class back to active teaching">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              <span>Restore Class</span>
            </button>
            <button type="button" class="btn-trash-perm-delete" onclick="openPermanentDeleteModal(${g.id}, '${escapeHtml(subjectTitle)}')" title="Permanently delete class immediately">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete Permanently</span>
            </button>
          </footer>
        </article>
      `;
    }).join('');
  }

  // ── 4. Search & Filter Handlers ──
  window.handleSearchTrash = function (query) {
    state.searchQuery = query || '';
    renderTrashCards();
  };

  window.handleTrashSemesterFilter = function (semester) {
    state.selectedSemester = semester || 'ALL';
    renderTrashCards();
  };

  // ── 5. Restore Class Action ──
  window.restoreClass = async function (groupId) {
    if (!groupId) return;

    try {
      if (window.api && typeof window.api.post === 'function') {
        await window.api.post(`/teaching-groups/${groupId}/restore`, {});
      } else {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
        const res = await fetch(`/api/v1/teaching-groups/${groupId}/restore`, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();
        if (!res.ok || data.success === false) {
          throw new Error(data.error?.message || 'Restore failed');
        }
      }
      showToast('Classroom restored successfully! Reactivated in My Classes.');
      loadTrash();
    } catch (err) {
      console.error('[Trash] Restore error:', err);
      showToast(err.message || 'Error restoring class. Please try again.', 'error');
    }
  };

  // ── 6. Permanent Deletion Confirmation Dialog ──
  window.openPermanentDeleteModal = function (groupId, title) {
    state.permDeletingId = groupId;
    state.permDeletingTitle = title;

    const modal = document.getElementById('permanent-delete-modal');
    const nameEl = document.getElementById('perm-delete-class-name');
    const input = document.getElementById('input-confirm-perm-delete');
    const btn = document.getElementById('btn-confirm-perm-delete');

    if (nameEl) nameEl.textContent = `"${title}"`;
    if (input) input.value = '';
    if (btn) btn.disabled = true;

    if (modal) modal.style.display = 'flex';
  };

  window.closePermanentDeleteModal = function () {
    const modal = document.getElementById('permanent-delete-modal');
    if (modal) modal.style.display = 'none';
    state.permDeletingId = null;
    state.permDeletingTitle = '';
  };

  window.handlePermDeleteInputChange = function (val) {
    const btn = document.getElementById('btn-confirm-perm-delete');
    if (btn) {
      btn.disabled = (val.trim().toUpperCase() !== 'DELETE');
    }
  };

  window.executePermanentDelete = async function () {
    const groupId = state.permDeletingId;
    if (!groupId) return;

    const btn = document.getElementById('btn-confirm-perm-delete');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Purging...</span>';
    }

    try {
      if (window.api && typeof window.api.delete === 'function') {
        await window.api.delete(`/teaching-groups/${groupId}/permanent`);
      } else {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
        const res = await fetch(`/api/v1/teaching-groups/${groupId}/permanent`, {
          method: 'DELETE',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();
        if (!res.ok || data.success === false) {
          throw new Error(data.error?.message || 'Permanent deletion failed');
        }
      }
      closePermanentDeleteModal();
      showToast('Classroom permanently purged from system.');
      loadTrash();
    } catch (err) {
      console.error('[Trash] Permanent deletion error:', err);
      closePermanentDeleteModal();
      showToast(err.message || 'Error deleting classroom permanently.', 'error');
    }
  };

  // ── 7. Feedback Toast Notification ──
  function showToast(message, type = 'success') {
    const toast = document.getElementById('trash-toast-banner');
    if (!toast) return;

    toast.className = `vidya-toast-banner ${type} show`;
    toast.innerHTML = `
      <div class="toast-content">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${type === 'error'
            ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
            : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'}
        </svg>
        <span>${escapeHtml(message)}</span>
      </div>
    `;

    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  window.loadTrash = loadTrash;
})();
