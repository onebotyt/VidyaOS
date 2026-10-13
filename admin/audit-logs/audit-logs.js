/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: AUDIT-LOGS
 * frontend/admin/audit-logs/audit-logs.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute({ roles: ['SYSTEM_ADMIN'] });

    let currentOffset = 0;
    const pageSize = 25;
    let totalRecords = 0;
    let cachedRecords = [];

    async function init() {
      await loadAuditLogs();
      await loadKpis();
    }

    function getEventChipClass(eventType) {
      if (!eventType) return '';
      const et = eventType.toUpperCase();
      if (et.includes('APPROVED')) return 'event-approved';
      if (et.includes('REJECTED') || et.includes('DISABLED') || et.includes('REMOVED')) return 'event-rejected';
      if (et.includes('HOD') || et.includes('COMMON_MANAGER')) return 'event-admin';
      if (et.includes('BIOMETRIC') || et.includes('DEVICE') || et.includes('ESP')) return 'event-biometric';
      if (et.includes('TEACHING_GROUP') || et.includes('ASSIGNMENT') || et.includes('TEST')) return 'event-academic';
      if (et.includes('ATTENDANCE')) return 'event-attendance';
      return '';
    }

    async function loadKpis() {
      try {
        const res = await fetchApi('/admin/audit-logs?limit=1000');
        if (res && res.success && Array.isArray(res.data)) {
          const rows = res.data;
          document.getElementById('kpi-total').innerText = res.total || rows.length;

          const govCount = rows.filter(r => /APPROVED|REJECTED|HOD|COMMON_MANAGER/i.test(r.event_type || '')).length;
          const bioCount = rows.filter(r => /BIOMETRIC|DEVICE|ESP/i.test(r.event_type || '')).length;
          const acadCount = rows.filter(r => /TEACHING_GROUP|ATTENDANCE|ASSIGNMENT|TEST/i.test(r.event_type || '')).length;

          document.getElementById('kpi-governance').innerText = govCount;
          document.getElementById('kpi-biometric').innerText = bioCount;
          document.getElementById('kpi-academic').innerText = acadCount;
        }
      } catch (_) {}
    }

    async function loadAuditLogs() {
      const search = document.getElementById('filter-search').value.trim();
      const eventType = document.getElementById('filter-event').value;
      const targetType = document.getElementById('filter-target').value;
      const startDate = document.getElementById('filter-start-date').value;
      const endDate = document.getElementById('filter-end-date').value;

      const params = new URLSearchParams({
        limit: pageSize,
        offset: currentOffset
      });

      if (search) params.append('search', search);
      if (eventType) params.append('event_type', eventType);
      if (targetType) params.append('target_type', targetType);
      if (startDate) params.append('start_date', startDate + ' 00:00:00');
      if (endDate) params.append('end_date', endDate + ' 23:59:59');

      const tbody = document.getElementById('audit-table-body');
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">Fetching audit records...</td></tr>`;

      try {
        const res = await fetchApi(`/admin/audit-logs?${params.toString()}`);
        if (res && res.success) {
          cachedRecords = res.data || [];
          totalRecords = res.total !== undefined ? res.total : cachedRecords.length;
          renderTable(cachedRecords);
          updatePagination();
        } else {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--status-absent);">Failed to load audit trail.</td></tr>`;
        }
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--status-absent);">Error: ${escapeHtml(err.message)}</td></tr>`;
      }
    }

    function renderTable(rows) {
      const tbody = document.getElementById('audit-table-body');
      if (!rows || rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No audit records found matching your filters.</td></tr>`;
        return;
      }

      tbody.innerHTML = rows.map((r, index) => {
        const timeStr = r.created_at ? new Date(r.created_at.includes('Z') ? r.created_at : r.created_at.replace(' ', 'T') + 'Z').toLocaleString('en-IN', {
          year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : '--';

        const chipClass = getEventChipClass(r.event_type);
        const detailsPreview = r.details ? JSON.stringify(r.details) : 'None';
        const actorName = r.actor_username || r.actor_email || (r.actor_id ? `User #${r.actor_id}` : 'System');
        const roleName = r.actor_role || (r.actor_id === 1 ? 'SYSTEM_ADMIN' : 'USER');
        const targetStr = r.target_type ? `${r.target_type}${r.target_id ? ` #${r.target_id}` : ''}` : '--';

        return `
          <tr>
            <td style="font-family: var(--font-family-mono); font-size: 0.76rem; color: var(--text-muted); white-space: nowrap;">
              ${escapeHtml(timeStr)}
            </td>
            <td>
              <span class="event-chip ${chipClass}">${escapeHtml(r.event_type || 'UNKNOWN')}</span>
            </td>
            <td style="font-weight: 600;">
              ${escapeHtml(actorName)}
            </td>
            <td>
              <span class="badge" style="background: var(--bg-surface); font-size: 0.72rem; font-weight: 700;">${escapeHtml(roleName)}</span>
            </td>
            <td style="font-family: var(--font-family-mono); font-size: 0.76rem; color: var(--text-main);">
              ${escapeHtml(targetStr)}
            </td>
            <td>
              ${r.details ? `<span class="json-chip" onclick="openDetailsModal(${index})" title="Click to view full JSON payload">${escapeHtml(detailsPreview)}</span>` : '<span style="color: var(--text-muted); font-size: 0.75rem;">None</span>'}
            </td>
            <td style="font-family: var(--font-family-mono); font-size: 0.76rem; color: var(--text-muted);">
              ${escapeHtml(r.ip_address || '127.0.0.1')}
            </td>
          </tr>
        `;
      }).join('');
    }

    function updatePagination() {
      const page = Math.floor(currentOffset / pageSize) + 1;
      const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

      document.getElementById('page-num').innerText = `Page ${page} of ${totalPages}`;
      document.getElementById('pagination-info').innerText = `Showing ${totalRecords > 0 ? currentOffset + 1 : 0}–${Math.min(currentOffset + pageSize, totalRecords)} of ${totalRecords} entries`;

      document.getElementById('prev-btn').disabled = currentOffset <= 0;
      document.getElementById('next-btn').disabled = currentOffset + pageSize >= totalRecords;
    }

    function changePage(direction) {
      currentOffset += direction * pageSize;
      if (currentOffset < 0) currentOffset = 0;
      loadAuditLogs();
    }

    function applyFilters() {
      currentOffset = 0;
      loadAuditLogs();
    }

    function resetFilters() {
      document.getElementById('filter-search').value = '';
      document.getElementById('filter-event').value = '';
      document.getElementById('filter-target').value = '';
      document.getElementById('filter-start-date').value = '';
      document.getElementById('filter-end-date').value = '';
      currentOffset = 0;
      loadAuditLogs();
    }

    function openDetailsModal(index) {
      const r = cachedRecords[index];
      if (!r) return;

      document.getElementById('modal-event-title').innerText = `Audit Event: ${r.event_type || 'Unknown'}`;
      document.getElementById('modal-meta-line').innerText = `${r.created_at} • Actor: ${r.actor_username || r.actor_id || 'System'} (${r.actor_role || 'ADMIN'}) • Target: ${r.target_type || '--'} #${r.target_id || ''}`;
      document.getElementById('modal-json-content').innerText = r.details ? JSON.stringify(r.details, null, 2) : 'No payload details.';
      document.getElementById('details-modal').classList.add('open');
    }

    

    function exportLogsJson() {
      if (!cachedRecords || cachedRecords.length === 0) {
        showToast('No audit logs loaded to export.', 'info');
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cachedRecords, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `institutional_audit_logs_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }

    var escapeHtml = window.escapeHtml || (typeof esc !== 'undefined' ? esc : (s => s));


    init();

