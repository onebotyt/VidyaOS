/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: LEAVE
 * frontend/student/leave/leave.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['STUDENT']);

    async function applyLeave(e) {
      e.preventDefault();
      const res = await fetchApi('/leave', {
        method: 'POST',
        body: JSON.stringify({
          from_date: document.getElementById('f-from').value,
          to_date: document.getElementById('f-to').value,
          reason: document.getElementById('f-reason').value
        })
      });
      if (res.success) {
        showToast('Leave application submitted!', 'success');
        document.getElementById('f-reason').value = '';
        loadLeaves();
      } else {
        showToast(res.error?.message || 'Could not submit', 'error');
      }
    }

    async function loadLeaves() {
      const res = await fetchApi('/leave/my');
      const list = document.getElementById('leave-list');
      if (!res.success || !res.data.length) {
        list.innerHTML = `<div class="card" style="text-align:center; padding:2rem; color:var(--text-muted);">No leave applications yet.</div>`;
        return;
      }
      list.innerHTML = res.data.map(l => `
        <div class="leave-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${formatDate(l.from_date)} → ${formatDate(l.to_date)}</strong>
            <span class="status-pill ${l.status}">${l.status}</span>
          </div>
          <div class="leave-meta">${escapeHtml(l.reason)}</div>
          ${l.review_note ? `<div class="leave-meta">Teacher's note: ${escapeHtml(l.review_note)}</div>` : ''}
        </div>
      `).join('');
    }

    function formatDate(d) { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    var escapeHtml = window.escapeHtml || (typeof esc !== 'undefined' ? esc : (s => s));


    loadLeaves();

