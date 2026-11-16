/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: STUDENT LEAVE APPLICATIONS
 * frontend/student/leave/leave.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['STUDENT']);

function updateLeaveDuration() {
  const fromVal = document.getElementById('f-from')?.value;
  const toVal = document.getElementById('f-to')?.value;
  const badge = document.getElementById('leave-duration-badge');
  if (!badge) return;
  if (!fromVal || !toVal) {
    badge.textContent = 'Select Dates';
    return;
  }
  const d1 = new Date(fromVal);
  const d2 = new Date(toVal);
  const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
  if (diff <= 0) {
    badge.textContent = 'Invalid Date Range';
    badge.className = 'badge badge-absent';
  } else {
    badge.textContent = `${diff} ${diff === 1 ? 'Day' : 'Days'} Selected`;
    badge.className = 'badge badge-sem';
  }
}

function setLeaveReason(text) {
  const input = document.getElementById('f-reason');
  if (input) {
    input.value = text;
    input.focus();
  }
}

async function applyLeave(e) {
  e.preventDefault();
  const from_date = document.getElementById('f-from').value;
  const to_date = document.getElementById('f-to').value;
  const reason = document.getElementById('f-reason').value.trim();

  if (new Date(to_date) < new Date(from_date)) {
    showToast('To Date cannot be earlier than From Date.', 'error');
    return;
  }

  const res = await fetchApi('/leave', {
    method: 'POST',
    body: JSON.stringify({ from_date, to_date, reason })
  });
  if (res && res.success) {
    showToast('Leave application submitted!', 'success');
    document.getElementById('f-reason').value = '';
    loadLeaves();
  } else {
    showToast(res?.error?.message || 'Could not submit leave request', 'error');
  }
}

async function loadLeaves() {
  const list = document.getElementById('leave-list');
  try {
    const res = await fetchApi('/leave/my');
    const items = res && res.success && Array.isArray(res.data) ? res.data : [];

    // Update KPI counters
    const totalEl = document.getElementById('kpi-leave-total');
    const appEl = document.getElementById('kpi-leave-approved');
    const pendEl = document.getElementById('kpi-leave-pending');
    if (totalEl) totalEl.textContent = String(items.length);
    if (appEl) appEl.textContent = String(items.filter(x => x.status === 'APPROVED').length);
    if (pendEl) pendEl.textContent = String(items.filter(x => x.status === 'PENDING').length);

    if (!items.length) {
      list.innerHTML = `<div class="card" style="text-align:center; padding:2.25rem; color:var(--text-muted);">No leave applications submitted yet.</div>`;
      return;
    }

    list.innerHTML = items.map(l => {
      const d1 = new Date(l.from_date);
      const d2 = new Date(l.to_date);
      const days = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
      return `
        <article class="leave-card">
          <div class="leave-card-top">
            <div style="display:flex; align-items:center; gap:0.55rem; flex-wrap:wrap;">
              <strong style="font-size:0.95rem; color:var(--text-main);">${formatDate(l.from_date)} → ${formatDate(l.to_date)}</strong>
              <span class="code-badge">${days} ${days === 1 ? 'Day' : 'Days'}</span>
            </div>
            <span class="status-pill ${escapeHtml(l.status)}">${escapeHtml(l.status)}</span>
          </div>
          <div class="leave-reason">${escapeHtml(l.reason)}</div>
          ${l.review_note ? `<div class="leave-review-note"><strong>Faculty Remark:</strong> ${escapeHtml(l.review_note)}</div>` : ''}
        </article>
      `;
    }).join('');
  } catch (err) {
    list.innerHTML = `<div class="card" style="color:var(--status-absent); padding:1.5rem;">Failed to load leave applications.</div>`;
  }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
var escapeHtml = window.escapeHtml || (typeof esc !== 'undefined' ? esc : (s => s));

window.updateLeaveDuration = updateLeaveDuration;
window.setLeaveReason = setLeaveReason;
window.applyLeave = applyLeave;

loadLeaves();
