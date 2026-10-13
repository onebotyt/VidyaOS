/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: HOD-DEVICES
 * frontend/faculty/hod-devices/hod-devices.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute({ roles: ['TEACHER'], requireHOD: true });

    let devicesList = [];
    let allRecords = [];
    let departmentName = 'Department';

    async function init() {
      const user = getCurrentUser();
      if (user && user.hod_department_name) {
        departmentName = user.hod_department_name;
        document.getElementById('dept-header-name').innerText = departmentName + ' (HOD)';
        document.getElementById('dept-subtitle').innerText = `Manage classroom biometric kiosk terminals for ${departmentName}, register new hardware, and monitor real-time physical attendance presence scans.`;
        document.getElementById('modal-dept-label').innerText = `Add a biometric kiosk for ${departmentName}`;
      }

      try {
        const hRes = await fetchApi('/hod/hierarchy');
        if (hRes.success && hRes.data?.department_degree_duration_years) {
          deptDurationYears = parseInt(hRes.data.department_degree_duration_years, 10) || 4;
        }
      } catch {}

      await Promise.all([
        loadDevices(),
        loadReportData()
      ]);
    }

    async function loadDevices() {
      try {
        const res = await fetchApi('/hod/devices');
        if (res.success && res.data) {
          devicesList = res.data;
          renderDevicesTable();
        }
      } catch (err) {
        console.error('Failed to load devices:', err);
        document.getElementById('devices-tbody').innerHTML = `
          <tr><td colspan="7" style="text-align: center; color: var(--status-absent); padding: 2rem;">
            Failed to load department devices: ${err.message}
          </td></tr>`;
      }
    }

    function renderDevicesTable() {
      const tbody = document.getElementById('devices-tbody');
      document.getElementById('terminal-count-badge').innerText = `${devicesList.length} Terminals`;

      if (!devicesList.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
              <div style="display:flex;justify-content:center;margin-bottom:0.5rem;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg></div>
              <div style="font-weight: 700; font-size: 1rem; color: var(--text-main);">No ESP32 Hardware Terminals Registered Yet</div>
              <div style="font-size: 0.82rem; margin-top: 0.25rem;">Click the "+ Register Hardware Terminal" button above to link your department's first scanner.</div>
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = devicesList.map(dev => {
        const isOnline = dev.is_online;
        return `
          <tr>
            <td style="font-weight: 600; color: var(--text-muted);">#${dev.id}</td>
            <td>
              <span class="badge" style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; background: var(--bg-surface); color: var(--text-main); font-weight: 700; border: 1px solid var(--border-color);">
                ${esc(dev.device_uid)}
              </span>
            </td>
            <td>
              <div style="font-weight: 700; color: var(--text-main);">${esc(dev.name)}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${dev.enrolled_count || 0} students enrolled in biometric storage</div>
            </td>
            <td>
              ${(() => {
                if (dev.cohort_scope_label) {
                  return `<span class="badge" style="background: var(--bg-surface); color: var(--color-primary); font-weight: 700; font-size: 0.8rem; padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid var(--border-color);">${esc(dev.cohort_scope_label)}</span>`;
                }
                const yrs = dev.assigned_years && dev.assigned_years.length > 0 ? dev.assigned_years : (dev.year ? [dev.year] : []);
                const sems = dev.assigned_semesters && dev.assigned_semesters.length > 0 ? dev.assigned_semesters : (dev.semester ? [dev.semester] : []);
                if (yrs.length > 1) {
                  return `<span class="badge" style="background: var(--bg-surface); color: var(--color-primary); font-weight: 700; font-size: 0.8rem; padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid var(--border-color);">Years ${yrs.join(', ')} (Sems ${sems.join(', ')})</span>`;
                } else if (yrs.length === 1) {
                  return `<span class="badge" style="background: var(--bg-surface); color: var(--text-main); font-weight: 600; font-size: 0.8rem; padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid var(--border-color);">Year ${yrs[0]} • Sem ${sems.join(', ')}</span>`;
                }
                return '<span style="font-size: 0.82rem; color: var(--text-muted);">Campus / Dept Wide</span>';
              })()}
            </td>
            <td>
              <span style="font-size: 0.8rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">
                ${dev.last_heartbeat_at ? formatTimestamp(dev.last_heartbeat_at) : 'Never'}
              </span>
            </td>
            <td style="text-align: center;">
              <span class="esp-badge ${isOnline ? '' : 'esp-badge-offline'}">
                <span class="esp-pulse ${isOnline ? '' : 'esp-pulse-offline'}"></span>
                ${isOnline ? 'ONLINE' : (dev.is_active ? 'OFFLINE' : 'DISABLED')}
              </span>
            </td>
            <td style="text-align: right;" class="no-print">
              <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
                <button class="btn btn-secondary btn-sm" onclick="toggleDevice(${dev.id})" title="${dev.is_active ? 'Disable' : 'Enable'} device">
                  ${dev.is_active ? 'Disable' : 'Enable'}
                </button>
                <button class="btn btn-secondary btn-sm" onclick="deleteDevice(${dev.id}, '${esc(dev.name)}')" style="color: var(--status-absent);" title="Delete terminal">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    async function loadReportData() {
      const year = document.getElementById('report-year').value;
      const sem = document.getElementById('report-sem').value;
      const datePreset = document.getElementById('report-date-preset').value;

      let qs = [];
      if (year) qs.push(`year=${year}`);
      if (sem) qs.push(`semester=${sem}`);
      if (datePreset) qs.push(`date_preset=${datePreset}`);

      const url = `/hod/reports${qs.length ? '?' + qs.join('&') : ''}`;

      try {
        const res = await fetchApi(url);
        if (res.success && res.data) {
          allRecords = res.data.records || [];
          renderKpis(res.data.kpis || {});
          applySearchFilter();
        }
      } catch (err) {
        console.error('Failed to load presence records:', err);
        document.getElementById('table-wrap').innerHTML = `
          <div style="text-align: center; color: var(--status-absent); padding: 3rem;">
            Failed to load presence records: ${err.message}
          </div>`;
      }
    }

    function renderKpis(k) {
      document.getElementById('kpi-scans').textContent = (k.total_scans || 0).toLocaleString();
      document.getElementById('kpi-students').textContent = (k.unique_students || 0).toLocaleString();
      document.getElementById('kpi-terminals').textContent = (k.active_terminals || devicesList.filter(d => d.is_active).length || 0).toLocaleString();
      document.getElementById('kpi-today').textContent = (k.today_scans || 0).toLocaleString();
    }

    function applySearchFilter() {
      const q = (document.getElementById('report-search').value || '').toLowerCase().trim();
      let filtered = allRecords;

      if (q) {
        filtered = allRecords.filter(r => 
          (r.student_name || '').toLowerCase().includes(q) ||
          (r.official_enrollment_no || '').toLowerCase().includes(q) ||
          (r.device_uid || '').toLowerCase().includes(q) ||
          (r.device_name || '').toLowerCase().includes(q)
        );
      }

      renderPresenceTable(filtered);
    }

    function renderPresenceTable(records) {
      const wrap = document.getElementById('table-wrap');
      document.getElementById('record-count-badge').innerText = `${records.length} Scans`;

      if (!records.length) {
        wrap.innerHTML = `
          <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <div style="display:flex;justify-content:center;margin-bottom:0.5rem;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg></div>
            <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-main);">No ESP32 Biometric Scans Found</div>
            <div style="font-size: 0.85rem; margin-top: 0.25rem;">No attendance scans match your search or filter criteria for this department.</div>
          </div>`;
        return;
      }

      wrap.innerHTML = `
        <table class="custom-table">
          <thead>
            <tr>
              <th style="width: 180px;">Scan Timestamp</th>
              <th>Student Name</th>
              <th style="width: 140px;">Enrollment No</th>
              <th style="width: 140px;">Program &amp; Cohort</th>
              <th style="width: 170px;">Terminal Reader</th>
              <th style="width: 110px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td>
                  <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; font-weight: 700; color: var(--text-main);">
                    ${formatTimestamp(r.scan_time)}
                  </span>
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-weight: 700; color: var(--text-main); font-size: 0.92rem;">
                      ${esc(r.student_name)}
                    </span>
                    ${r.class_roll_no ? `<span style="font-size: 0.72rem; background: var(--bg-surface); color: var(--text-muted); font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 4px; border: 1px solid var(--border-color);">${r.class_roll_no}</span>` : ''}
                  </div>
                </td>
                <td>
                  <span style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--color-primary); background: var(--bg-surface); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; border: 1px solid var(--border-color);">
                    ${esc(r.official_enrollment_no)}
                  </span>
                </td>
                <td>
                  <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-main);">
                    ${esc(r.branch_code || r.branch_name || 'Cohort')}
                  </span>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">
                    Year ${r.year || 1} • Sem ${r.semester || 1}
                  </div>
                </td>
                <td>
                  <div class="esp-badge">
                    <span class="esp-pulse"></span>
                    ${esc(r.device_uid || 'ESP32_READER')}
                  </div>
                </td>
                <td style="text-align: center;">
                  <span style="font-size: 0.75rem; font-weight: 800; color: var(--status-present); background: var(--status-present-bg); padding: 0.2rem 0.6rem; border-radius: 999px;">
                    VERIFIED
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    function resetFilters() {
      document.getElementById('report-year').value = '';
      document.getElementById('report-sem').value = '';
      document.getElementById('report-date-preset').value = 'all';
      document.getElementById('report-search').value = '';
      loadReportData();
    }

    let deptDurationYears = 4;

    function renderYearCheckboxes(durationYears = 4) {
      const wrap = document.getElementById('year-checkboxes-wrap');
      if (!wrap) return;
      let html = '';
      for (let y = 1; y <= durationYears; y++) {
        html += `
          <label class="year-select-chip" id="chip-year-${y}" style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: 8px; padding: 0.45rem 0.85rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; user-select: none; transition: all 0.15s;">
            <input type="checkbox" name="dev-years" value="${y}" onchange="onYearSelectionChange()" style="cursor: pointer; accent-color: var(--color-primary); width: 16px; height: 16px;">
            <span>Year ${y}</span>
          </label>
        `;
      }
      wrap.innerHTML = html;
      // Default: select Year 1 and Year 2
      const checkboxes = wrap.querySelectorAll('input[name="dev-years"]');
      if (checkboxes.length > 0) {
        checkboxes[0].checked = true;
        if (checkboxes.length > 1) checkboxes[1].checked = true;
      }
      onYearSelectionChange();
    }

    function onYearSelectionChange() {
      const checkboxes = document.querySelectorAll('input[name="dev-years"]');
      const selectedYears = [];
      checkboxes.forEach(cb => {
        const chip = document.getElementById(`chip-year-${cb.value}`);
        if (cb.checked) {
          selectedYears.push(parseInt(cb.value, 10));
          if (chip) {
            chip.style.borderColor = 'var(--color-primary)';
            chip.style.background = 'var(--bg-surface)';
            chip.style.color = 'var(--color-primary)';
          }
        } else {
          if (chip) {
            chip.style.borderColor = 'var(--border-color)';
            chip.style.background = 'var(--bg-card)';
            chip.style.color = 'var(--text-main)';
          }
        }
      });

      // Calculate semesters automatically: (Year * 2) - 1 and Year * 2
      const autoSemesters = [];
      selectedYears.sort((a, b) => a - b).forEach(y => {
        autoSemesters.push((y * 2) - 1);
        autoSemesters.push(y * 2);
      });

      const preview = document.getElementById('auto-semesters-preview');
      if (!selectedYears.length) {
        preview.innerHTML = `
          <div style="color: var(--status-absent); font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 0.35rem;">
            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></span> Please select at least one target cohort year above.
          </div>
        `;
      } else {
        preview.innerHTML = autoSemesters.map(s => `
          <span class="badge" style="background: var(--color-primary); color: var(--bg-card); padding: 0.3rem 0.65rem; border-radius: 6px; font-weight: 700; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.3rem;">
            <span style="opacity: 0.85;display:inline-flex;align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></span> Semester ${s}
          </span>
        `).join('');
      }

      const allBtn = document.getElementById('btn-select-all-years');
      if (allBtn) {
        const allChecked = checkboxes.length > 0 && selectedYears.length === checkboxes.length;
        allBtn.innerText = allChecked ? 'Deselect All' : 'Select All Years';
      }
    }

    function toggleAllYears() {
      const checkboxes = document.querySelectorAll('input[name="dev-years"]');
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      checkboxes.forEach(cb => {
        cb.checked = !allChecked;
      });
      onYearSelectionChange();
    }

    function openCreateModal() {
      document.getElementById('dev-uid').value = '';
      document.getElementById('dev-name').value = '';
      document.getElementById('dev-secret').value = 'secret_' + Math.random().toString(36).slice(2, 8);
      renderYearCheckboxes(deptDurationYears);
      document.getElementById('device-modal').classList.add('open');
    }

    

    document.getElementById('device-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const device_uid = document.getElementById('dev-uid').value.trim();
      const name = document.getElementById('dev-name').value.trim();
      const secret_key = document.getElementById('dev-secret').value;
      const selectedYears = Array.from(document.querySelectorAll('input[name="dev-years"]:checked')).map(cb => parseInt(cb.value, 10));

      if (!selectedYears.length) {
        showToast('Please select at least one Target Cohort Year.', 'warning');
        return;
      }

      const autoSemesters = [];
      selectedYears.sort((a, b) => a - b).forEach(y => {
        autoSemesters.push((y * 2) - 1);
        autoSemesters.push(y * 2);
      });

      const btn = document.getElementById('save-btn');
      btn.disabled = true;

      try {
        const res = await fetchApi('/hod/devices', {
          method: 'POST',
          body: JSON.stringify({
            device_uid,
            name,
            years: selectedYears,
            semesters: autoSemesters,
            year: selectedYears[0],
            semester: autoSemesters[0],
            secret_key
          })
        });
        if (res.success) {
          showToast('Hardware terminal registered successfully!', 'success');
          closeModal();
          await loadDevices();
        }
      } catch (err) {
        // Handled by fetchApi toast
      } finally {
        btn.disabled = false;
      }
    });

    async function toggleDevice(id) {
      try {
        const res = await fetchApi(`/hod/devices/${id}/toggle`, { method: 'PATCH' });
        if (res.success) {
          showToast(res.message || 'Device status updated', 'success');
          await loadDevices();
        }
      } catch (err) {
        // Handled by fetchApi toast
      }
    }

    async function deleteDevice(id, name) {
      if (!confirm(`Are you sure you want to remove the terminal "${name}" from your department?`)) return;
      try {
        const res = await fetchApi(`/hod/devices/${id}`, { method: 'DELETE' });
        if (res.success) {
          showToast('Device removed', 'success');
          await loadDevices();
        }
      } catch (err) {
        // Handled by fetchApi toast
      }
    }

    function exportCsv() {
      if (!allRecords.length) {
        showToast('No attendance scan records available to export.', 'info');
        return;
      }
      const headers = ['Scan ID', 'Event ID', 'Scan Timestamp', 'Student Name', 'Class Roll No', 'Enrollment No', 'Department', 'Cohort Year', 'Cohort Sem', 'Device UID', 'Status'];
      const rows = allRecords.map(r => [
        r.scan_id || '',
        r.event_id || '',
        r.scan_time || '',
        `"${(r.student_name || '').replace(/"/g, '""')}"`,
        r.class_roll_no || '',
        r.official_enrollment_no || '',
        `"${(r.department_name || departmentName).replace(/"/g, '""')}"`,
        r.year || '',
        r.semester || '',
        r.device_uid || '',
        r.status || 'PRESENT'
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `ESP_Presence_Report_${departmentName}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    function formatTimestamp(ts) {
      if (!ts) return '—';
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
             d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    

    init();

