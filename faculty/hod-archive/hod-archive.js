/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: HOD-ARCHIVE
 * frontend/faculty/hod-archive/hod-archive.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute({ roles: ['TEACHER'], requireHOD: true });

    let currentArchive = [];
    let searchTimer = null;
    let deptInfo = null;

    async function init() {
      try {
        // Load HOD department hierarchy metadata
        const hRes = await fetchApi('/hod/hierarchy');
        if (hRes.success && hRes.data) {
          deptInfo = hRes.data;
          document.getElementById('dept-header-name').textContent = deptInfo.department_name;
          document.getElementById('kpi-dept-code').textContent = deptInfo.department_name;
          document.getElementById('kpi-duration-sub').textContent = `${deptInfo.degree_duration_years || 3}-Year Program (Semesters 1 to ${(deptInfo.degree_duration_years || 3) * 2})`;
        }

        await loadBatches();
        await loadArchive();
      } catch (err) {
        console.error('Init failed:', err);
      }
    }

    async function loadBatches() {
      try {
        const res = await fetchApi('/hod/archive/batches');
        if (res.success && res.data) {
          const select = document.getElementById('filter-batch');
          select.innerHTML = '<option value="">All Graduation Batches</option>';
          res.data.forEach(y => {
            select.innerHTML += `<option value="${y}">Batch of ${y}</option>`;
          });
        }
      } catch (err) {
        console.error('Load batches failed:', err);
      }
    }

    async function loadArchive() {
      const batch = document.getElementById('filter-batch').value;
      const search = document.getElementById('filter-search').value.trim();

      const params = new URLSearchParams();
      if (batch) params.set('batch_year', batch);
      if (search) params.set('search', search);

      const tbody = document.getElementById('archive-tbody');
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading records...</td></tr>`;

      try {
        const res = await fetchApi(`/hod/archive?${params.toString()}`);
        if (res.success && res.data) {
          currentArchive = res.data;
          renderKPIs(res.kpis);
          renderTable(currentArchive);
        } else {
          tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--status-absent); padding: 2rem;">Failed to load archive</td></tr>`;
        }
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--status-absent); padding: 2rem;">Error: ${err.message}</td></tr>`;
      }
    }

    function renderKPIs(kpis) {
      if (!kpis) return;
      document.getElementById('kpi-total-alumni').textContent = kpis.total_graduated;
      document.getElementById('kpi-batches-count').textContent = kpis.batches_count;
      document.getElementById('kpi-batches-sub').textContent = kpis.batches.length ? `Batches: ${kpis.batches.join(', ')}` : 'No batches yet';
      document.getElementById('kpi-avg-attendance').textContent = `${kpis.avg_attendance}%`;
    }

    function renderTable(students) {
      const tbody = document.getElementById('archive-tbody');
      if (!students.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-muted);">
              <div style="display:flex;justify-content:center;margin-bottom:0.5rem;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg></div>
              <strong>No archived alumni records found.</strong>
              <div style="font-size: 0.8rem; margin-top: 0.25rem;">Students graduating from final semester promotion are automatically archived here.</div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = students.map((s, idx) => {
        const attScore = Number(s.attendance_percentage || 0);
        const barColor = attScore >= 75 ? 'var(--status-present)' : attScore >= 60 ? 'var(--status-late)' : 'var(--status-absent)';
        const admission = s.admission_year || (s.graduation_year ? s.graduation_year - (deptInfo?.degree_duration_years || 3) : '2023');
        const grad = s.graduation_year || 'Completed';

        return `
          <tr>
            <td>
              <span class="badge badge-pending" style="font-family: var(--font-family-mono); font-size: 0.8rem; font-weight: 700;">
                ${s.official_enrollment_no}
              </span>
            </td>
            <td>
              <div style="font-weight: 700; color: var(--text-main);">${escapeHtml(s.full_name)}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">
                ${s.is_lateral_entry ? '<span class="badge" style="background: var(--status-late-bg); color: var(--status-late); font-size: 0.68rem;">Lateral Entry</span>' : 'Regular Admission'}
              </div>
            </td>
            <td>
              <span style="font-size: 0.85rem; font-weight: 600;">${admission} – ${grad}</span>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${deptInfo?.degree_duration_years || 3} Years</div>
            </td>
            <td>
              <span style="font-size: 0.85rem; font-weight: 600;">Year ${s.final_year} • Sem ${s.final_semester}</span>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${s.department_name}</div>
            </td>
            <td style="text-align: center; font-weight: 700; color: var(--text-muted);">
              ${s.final_class_roll_no > 0 ? s.final_class_roll_no : '--'}
            </td>
            <td>
              <div style="display: flex; align-items: center;">
                <div class="progress-bar-wrap">
                  <div class="progress-bar-fill" style="width: ${Math.min(attScore, 100)}%; background: ${barColor};"></div>
                </div>
                <strong style="font-size: 0.82rem; color: ${barColor};">${attScore}%</strong>
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.15rem;">
                ${s.attended_sessions} / ${s.total_sessions} sessions
              </div>
            </td>
            <td style="text-align: center;">
              <span class="badge badge-present" style="font-size: 0.72rem; font-weight: 700;">
                ALUMNI
              </span>
            </td>
            <td style="text-align: right;">
              <div style="display: inline-flex; gap: 0.35rem; align-items: center;">
                <button class="btn btn-secondary btn-sm" onclick="openStudentDossier(${s.id})" title="View Complete Multi-Semester Academic Dossier &amp; Vault" style="font-weight: 600; font-size: 0.78rem; padding: 0.25rem 0.55rem;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> Dossier
                </button>
                <button class="btn btn-secondary btn-sm" onclick="viewDetails(${idx})" style="font-size: 0.78rem; padding: 0.25rem 0.55rem;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> Details
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    let selectedArchiveStudentId = null;

    function viewDetails(idx) {
      const s = currentArchive[idx];
      if (!s) return;
      selectedArchiveStudentId = s.id;

      document.getElementById('m-name').textContent = s.full_name;
      document.getElementById('m-email').textContent = s.email || 'No email registered';
      document.getElementById('m-prn').textContent = s.official_enrollment_no;
      document.getElementById('m-dept').textContent = s.department_name;
      document.getElementById('m-tenor').textContent = `${s.admission_year || '2023'} – ${s.graduation_year || 'Completed'} (${deptInfo?.degree_duration_years || 3} Years)`;
      document.getElementById('m-cohort').textContent = `Year ${s.final_year}, Semester ${s.final_semester} (Roll: ${s.final_class_roll_no > 0 ? s.final_class_roll_no : '--'})`;
      document.getElementById('m-biometric').textContent = s.has_fingerprint ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Master Template Preserved' : 'Not Registered';

      const att = Number(s.attendance_percentage || 0);
      document.getElementById('m-att-score').textContent = `${att}%`;
      document.getElementById('m-att-bar').style.width = `${Math.min(att, 100)}%`;
      document.getElementById('m-att-bar').style.background = att >= 75 ? 'var(--status-present)' : att >= 60 ? 'var(--status-late)' : 'var(--status-absent)';
      document.getElementById('m-conducted').textContent = s.total_sessions;
      document.getElementById('m-attended').textContent = s.attended_sessions;

      document.getElementById('details-modal').style.display = 'flex';
    }

    function openStudentDossierFromArchive() {
      if (selectedArchiveStudentId) {
        closeDetailsModal();
        openStudentDossier(selectedArchiveStudentId);
      }
    }

    function closeDetailsModal() {
      document.getElementById('details-modal').style.display = 'none';
    }

    function debounceSearch() {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        loadArchive();
      }, 300);
    }

    function resetFilters() {
      document.getElementById('filter-batch').value = '';
      document.getElementById('filter-search').value = '';
      loadArchive();
    }

    function exportArchiveCSV() {
      if (!currentArchive.length) {
        showToast('No alumni records available to export', 'error');
        return;
      }

      const headers = ['Board PRN', 'Full Name', 'Admission Year', 'Graduation Year', 'Department', 'Final Year', 'Final Semester', 'Total Sessions', 'Attended Sessions', 'Attendance %', 'Account Status'];
      const rows = currentArchive.map(s => [
        `"${s.official_enrollment_no}"`,
        `"${s.full_name}"`,
        s.admission_year || '',
        s.graduation_year || '',
        `"${s.department_name}"`,
        s.final_year,
        s.final_semester,
        s.total_sessions,
        s.attended_sessions,
        `${s.attendance_percentage}%`,
        `"${s.user_status}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const batchVal = document.getElementById('filter-batch').value || 'all';
      a.download = `Alumni_Archive_${deptInfo?.department_code || 'DEPT'}_Batch_${batchVal}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Alumni batch CSV exported successfully!', 'success');
    }

    

    var escapeHtml = window.escapeHtml || (typeof esc !== 'undefined' ? esc : (s => s));


    document.addEventListener('DOMContentLoaded', init);

