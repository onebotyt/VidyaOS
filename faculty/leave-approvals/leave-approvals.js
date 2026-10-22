/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: LEAVE-APPROVALS
 * frontend/faculty/leave-approvals/leave-approvals.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute({ roles: ['TEACHER'], requireDepartmentFaculty: true });
    let currentFilter = 'PENDING';

    function setFilter(status) {
      currentFilter = status;
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.toggle('active', t.dataset.status === status));
      loadLeaves();
    }

    async function loadLeaves() {
      const list = document.getElementById('leave-list');
      list.innerHTML = 'Loading...';
      try {
        const qs = currentFilter ? `?status=${currentFilter}` : '';
        const res = await fetchApi(`/leave${qs}`);
        if (!res.success || !res.data.length) {
          list.innerHTML = `<div class="card" style="text-align:center; padding:2rem; color:var(--text-muted);">No leave requests here.</div>`;
          return;
        }
        list.innerHTML = res.data.map(l => `
          <div class="leave-card">
            <div>
              <div class="leave-name">${l.student_name} <span class="leave-meta">(${l.official_enrollment_no})</span></div>
              <div class="leave-meta">${l.department_name} · Year ${l.year} Sem ${l.semester} — ${formatDate(l.from_date)} to ${formatDate(l.to_date)}</div>
              <div class="leave-reason">"${escapeHtml(l.reason)}"</div>
              <div style="margin-top:0.5rem;"><span class="status-pill ${l.status}">${l.status}</span></div>
              ${l.review_note ? `<div class="leave-meta" style="margin-top:0.3rem;">Note: ${escapeHtml(l.review_note)}</div>` : ''}
            </div>
            ${l.status === 'PENDING' ? `
              <div class="leave-actions">
                <button class="btn btn-success btn-sm" onclick="decide(${l.id}, 'APPROVED')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Approve</button>
                <button class="btn btn-danger btn-sm" onclick="decide(${l.id}, 'REJECTED')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Reject</button>
              </div>` : ''}
          </div>
        `).join('');
      } catch (err) {
        list.innerHTML = `<div class="card" style="padding:1rem; color:var(--status-absent);">Could not load leave requests.</div>`;
      }
    }

    async function decide(id, decision) {
      let review_note = '';
      if (decision === 'REJECTED') {
        review_note = prompt('Optional: add a short reason for rejecting') || '';
      }
      try {
        const res = await fetchApi(`/leave/${id}/decision`, {
          method: 'PUT',
          body: JSON.stringify({ decision, review_note })
        });
        if (res.success) loadLeaves();
      } catch (err) {
        console.error(err);
      }
    }

    loadLeaves();


