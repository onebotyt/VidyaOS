/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: COMMON-TEACHERS
 * frontend/faculty/common-teachers/common-teachers.js
 * ══════════════════════════════════════════════════════════════
 */

try {
      if (typeof guardRoute === 'function') {
        guardRoute({ roles: ['COMMON_FACULTY_MANAGER', 'SYSTEM_ADMIN'] });
      }
    } catch (_) {}

    const API = '/api/v1';
    let pendingList = [];
    let rosterList = [];

    

    (async function init() {
      await loadAllData();
    })();

    async function loadAllData() {
      await Promise.all([loadPending(), loadRoster()]);
    }

    async function loadPending() {
      const wrap = document.getElementById('pending-common-wrap');
      const badge = document.getElementById('pending-common-badge');
      try {
        const res = await apiFetch(`${API}/faculty/common/pending`);
        pendingList = res.data || [];
        badge.textContent = `${pendingList.length} Pending`;

        if (!pendingList.length) {
          wrap.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
              <div style="display:flex;justify-content:center;margin-bottom:0.5rem;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--status-present)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
              <div style="font-weight: 600; color: var(--text-main);">No Pending Common Faculty Registrations</div>
              <div style="font-size: 0.8rem; margin-top: 0.25rem;">All registration applications for common faculty have been processed.</div>
            </div>`;
          return;
        }

        wrap.innerHTML = `
          <div style="overflow-x: auto;">
            <table class="table" style="margin: 0; font-size: 0.85rem;">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Institutional Gmail</th>
                  <th>Phone</th>
                  <th>Employee ID</th>
                  <th>Applied On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${pendingList.map(item => `
                  <tr>
                    <td>
                      <div style="font-weight: 600; color: var(--text-main);">${esc(item.full_name)}</div>
                    </td>
                    <td style="font-family: monospace; font-size: 0.82rem; color: var(--color-primary);">${esc(item.email)}</td>
                    <td style="font-size: 0.8rem; color: var(--text-muted);">${esc(item.phone || '—')}</td>
                    <td style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">${esc(item.employee_id || '—')}</td>
                    <td style="font-size: 0.78rem; color: var(--text-muted);">${new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style="display: flex; gap: 0.4rem; align-items: center;">
                        <button type="button" class="btn btn-primary btn-sm" onclick="approveCommonFaculty(${item.id}, '${esc(item.full_name)}')">Approve</button>
                        <button type="button" class="btn btn-secondary btn-sm" style="color: var(--status-absent); border-color: var(--status-absent);" onclick="rejectCommonFaculty(${item.id}, '${esc(item.full_name)}')">Reject</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`;
      } catch (err) {
        wrap.innerHTML = `<div style="color: var(--status-absent); font-size: 0.85rem; text-align: center; padding: 1.5rem;">Failed to load pending requests: ${esc(err.message)}</div>`;
      }
    }

    async function loadRoster() {
      const wrap = document.getElementById('active-roster-wrap');
      const badge = document.getElementById('roster-count-badge');
      try {
        const res = await apiFetch(`${API}/faculty/common/members`);
        rosterList = res.data || [];
        badge.textContent = `${rosterList.length} Members`;
        renderRoster(rosterList);
      } catch (err) {
        wrap.innerHTML = `<div style="color: var(--status-absent); font-size: 0.85rem; text-align: center; padding: 1.5rem;">Failed to load roster: ${esc(err.message)}</div>`;
      }
    }

    function filterRoster(query) {
      const q = (query || '').toLowerCase().trim();
      if (!q) {
        renderRoster(rosterList);
        return;
      }
      const filtered = rosterList.filter(m =>
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.gmail || '').toLowerCase().includes(q) ||
        (m.employee_id || '').toLowerCase().includes(q)
      );
      renderRoster(filtered);
    }

    function renderRoster(list) {
      const wrap = document.getElementById('active-roster-wrap');
      if (!list.length) {
        wrap.innerHTML = `
          <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            <div style="display:flex;justify-content:center;margin-bottom:0.75rem;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
            <div style="font-weight: 600; color: var(--text-main);">No Common Faculty Members Found</div>
            <div style="font-size: 0.82rem; margin-top: 0.25rem;">Approved common faculty who belong to no specific department will appear here.</div>
          </div>`;
        return;
      }

      wrap.innerHTML = `
        <div class="faculty-grid">
          ${list.map(t => {
            const initial = (t.full_name || 'T').charAt(0).toUpperCase();
            return `
              <div class="faculty-card">
                <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.85rem;">
                  <div class="fc-avatar">${initial}</div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; font-size: 1rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(t.full_name)}</div>
                    <div style="font-size: 0.8rem; color: var(--color-primary); font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(t.gmail)}</div>
                  </div>
                  <span class="badge badge-present" style="font-size: 0.72rem;">Active</span>
                </div>
                <div style="border-top: 1px dashed var(--border-color); padding-top: 0.65rem; font-size: 0.8rem; color: var(--text-muted); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.4rem;">
                  <span>${t.employee_id ? `Emp ID: <strong style="color: var(--text-main); font-family: monospace;">${esc(t.employee_id)}</strong>` : 'No Emp ID'}</span>
                  <span>${t.phone ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> ${esc(t.phone)}` : ''}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>`;
    }

    async function approveCommonFaculty(reqId, name) {
      if (!confirm(`Approve ${name} as a Common Faculty member?`)) return;

      try {
        const res = await apiFetch(`${API}/faculty/common/${reqId}/approve`, {
          method: 'POST'
        });
        showToast(res.message || 'Common faculty member approved successfully!', 'success');
        await loadAllData();
      } catch (err) {
        showToast(err.message || 'Failed to approve request.', 'error');
      }
    }

    async function rejectCommonFaculty(reqId, name) {
      const reason = prompt(`Enter rejection reason for ${name}:`, 'Application requirements not met');
      if (reason === null) return;

      try {
        const res = await apiFetch(`${API}/faculty/common/${reqId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason.trim() || 'Application not approved' })
        });
        showToast(res.message || 'Registration rejected.', 'info');
        await loadPending();
      } catch (err) {
        showToast(err.message || 'Failed to reject request.', 'error');
      }
    }

    async function apiFetch(url, opts = {}) {
      const token = localStorage.getItem('access_token');
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) };
      const r = await fetch(url, { ...opts, headers });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.success) throw new Error(data?.error?.message || `HTTP ${r.status}`);
      return data;
    }

