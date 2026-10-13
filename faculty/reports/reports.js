/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: REPORTS
 * frontend/faculty/reports/reports.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute({ roles: ['TEACHER'], requireSubjects: true });

    let allDefaulters = [];

    async function loadAnalytics() {
      try {
        const res = await fetchApi('/reports/analytics');
        if (!res.success) return;
        const { classes, trend, defaulter_count } = res.data;

        const user = getCurrentUser();
        const hasSubjects = Boolean(classes.length > 0 || user?.is_hod);
        if (!hasSubjects) {
          ['nav-reg', 'nav-assign', 'nav-reports'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
          });

          document.querySelector('main.container').innerHTML = `
            <div class="page-header" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h1 class="page-title">Attendance Reports & Analytics</h1>
                <p class="page-subtitle">Unified insights and attendance trends</p>
              </div>
              <a href="/faculty/dashboard.html" class="btn btn-secondary btn-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Back to Dashboard</a>
            </div>
            <div class="card" style="text-align: center; padding: 3.5rem 2rem; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-color);">
              <div style="display:flex;justify-content:center;margin-bottom:0.75rem;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></div>
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text-main);">No Teaching Subjects Allocated Yet</h3>
              <p style="font-size: 0.875rem; color: var(--text-muted); max-width: 540px; margin: 0 auto 1.5rem; line-height: 1.5;">
                Your Department HOD has not allocated any course subjects to your profile yet. Once assigned, your class attendance analytics, trend charts, low-attendance alerts, and hardware scan logs will automatically appear here.
              </p>
              <a href="/faculty/dashboard.html" class="btn btn-secondary btn-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Back to Dashboard</a>
            </div>
          `;
          return;
        }

        const overall = classes.length
          ? (classes.reduce((sum, c) => sum + c.attendance_percentage, 0) / classes.length).toFixed(1)
          : '—';
        const totalSessions = classes.reduce((sum, c) => sum + c.sessions_conducted, 0);

        document.getElementById('kpi-row').innerHTML = `
          <div class="kpi-card">
            <div class="kpi-value ${overall >= 75 ? 'success' : 'danger'}">${overall}${overall !== '—' ? '%' : ''}</div>
            <div class="kpi-label">Overall Attendance</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${totalSessions}</div>
            <div class="kpi-label">Classes Conducted</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value ${defaulter_count > 0 ? 'danger' : 'success'}">${defaulter_count}</div>
            <div class="kpi-label">Students Below 75%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${classes.length}</div>
            <div class="kpi-label">Assigned Classes</div>
          </div>
        `;

        document.getElementById('class-bars').innerHTML = classes.length ? classes.map(c => `
          <div class="class-bar-row">
            <div class="class-bar-label">${c.subject_name}</div>
            <div class="class-bar-track">
              <div class="class-bar-fill ${c.attendance_percentage < 75 ? 'low' : ''}" style="width:${Math.max(c.attendance_percentage, 8)}%;">
                <span>${c.attendance_percentage}%</span>
              </div>
            </div>
          </div>
        `).join('') : `<div style="color:var(--text-muted); text-align:center; padding:1.5rem;">No finalized class attendance recorded yet.</div>`;

        const maxPct = Math.max(...trend.map(t => t.attendance_percentage), 100);
        document.getElementById('trend-row').innerHTML = trend.length ? trend.map(t => `
          <div class="trend-bar-wrap" title="${t.date}: ${t.attendance_percentage}% attendance">
            <div class="trend-bar" style="height:${Math.max((t.attendance_percentage / maxPct) * 100, 5)}%;"></div>
            <div class="trend-date">${new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
          </div>
        `).join('') : `<div style="color:var(--text-muted); text-align:center; padding:1.5rem; width:100%;">No recent sessions to display.</div>`;
      } catch (err) {
        console.error(err);
      }
    }

    let allDefaultersData = null;
    let currentFilter = 'defaulters';
    let selectedStudentIds = new Set();

    async function loadDefaulters() {
      try {
        const res = await fetchApi('/reports/defaulters?threshold=75');
        const tbody = document.getElementById('defaulters-tbody');
        if (res.success && res.data) {
          allDefaultersData = res.data;
          allDefaulters = res.data.data || [];

          // Update KPI counts
          document.getElementById('kpi-def-total').textContent = allDefaultersData.total_students || 0;
          document.getElementById('kpi-def-critical').textContent = allDefaultersData.critical_defaulters || 0;
          document.getElementById('kpi-def-warning').textContent = allDefaultersData.warning_defaulters || 0;
          document.getElementById('kpi-def-healthy').textContent = allDefaultersData.healthy_students || 0;

          // Update Filter Pill counts
          document.getElementById('pill-count-defaulters').textContent = allDefaultersData.total_defaulters || 0;
          document.getElementById('pill-count-critical').textContent = allDefaultersData.critical_defaulters || 0;
          document.getElementById('pill-count-warning').textContent = allDefaultersData.warning_defaulters || 0;
          document.getElementById('pill-count-healthy').textContent = allDefaultersData.healthy_students || 0;
          document.getElementById('pill-count-all').textContent = allDefaultersData.total_students || 0;

          filterDefaulters();
        }
      } catch (err) {
        console.error('Failed to load defaulters:', err);
      }
    }

    function setDefaulterFilter(filter) {
      currentFilter = filter;
      ['pill-defaulters', 'pill-critical', 'pill-warning', 'pill-healthy', 'pill-all'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove('active');
      });
      const activeBtn = document.getElementById(`pill-${filter}`);
      if (activeBtn) activeBtn.classList.add('active');

      filterDefaulters();
    }

    function filterDefaulters() {
      if (!allDefaulters) return;
      const q = (document.getElementById('defaulter-search').value || '').toLowerCase().trim();

      let filtered = allDefaulters;

      // Apply category pill filter
      if (currentFilter === 'defaulters') {
        filtered = filtered.filter(d => d.status === 'CRITICAL' || d.status === 'WARNING');
      } else if (currentFilter === 'critical') {
        filtered = filtered.filter(d => d.status === 'CRITICAL');
      } else if (currentFilter === 'warning') {
        filtered = filtered.filter(d => d.status === 'WARNING');
      } else if (currentFilter === 'healthy') {
        filtered = filtered.filter(d => d.status === 'HEALTHY');
      }

      // Apply text search
      if (q) {
        filtered = filtered.filter(d =>
          (d.student_name && d.student_name.toLowerCase().includes(q)) ||
          (d.official_enrollment_no && d.official_enrollment_no.toLowerCase().includes(q)) ||
          (d.department_name && d.department_name.toLowerCase().includes(q)) ||
          (d.group_name && d.group_name.toLowerCase().includes(q)) ||
          String(d.class_roll_no) === q
        );
      }

      renderDefaulters(filtered);
    }

    function renderDefaulters(data) {
      const tbody = document.getElementById('defaulters-tbody');
      if (!data.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--status-present); font-weight: 600;">
              No students matching current criteria.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = data.map(d => {
        const isChecked = selectedStudentIds.has(d.student_id) ? 'checked' : '';
        let badgeHtml = '';
        if (d.status === 'CRITICAL') {
          badgeHtml = `<span class="badge-critical">${d.attendance_percentage}% CRITICAL</span>`;
        } else if (d.status === 'WARNING') {
          badgeHtml = `<span class="badge-warning">${d.attendance_percentage}% WARNING</span>`;
        } else {
          badgeHtml = `<span class="badge-healthy">${d.attendance_percentage}% HEALTHY</span>`;
        }

        let targetHtml = '';
        if (d.status === 'HEALTHY') {
          targetHtml = `<span style="color: var(--status-present); font-weight: 700;">Eligible (&ge; ${currentReport?.threshold || 75}%)</span>`;
        } else {
          targetHtml = `
            <div style="color: var(--status-absent); font-weight: 700;">Deficit (&lt; ${currentReport?.threshold || 75}%)</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">Shortfall: ${d.shortfall || 0} sessions</div>
          `;
        }

        return `
          <tr>
            <td style="text-align: center;">
              <input type="checkbox" class="student-select-cb" value="${d.student_id}" ${isChecked} onchange="toggleStudentSelect(${d.student_id}, this.checked)">
            </td>
            <td style="text-align: center; font-weight: 700;">${d.class_roll_no || '—'}</td>
            <td style="font-family: var(--font-family-mono); font-size: 0.8rem;">${d.official_enrollment_no}</td>
            <td style="font-weight: 600; color: var(--text-main);">${d.student_name}</td>
            <td style="font-size: 0.8rem; color: var(--text-muted);">${d.group_name || d.department_name || '--'}</td>
            <td style="text-align: center; font-weight: 700;">${d.attended_sessions} / ${d.conducted_sessions}</td>
            <td style="text-align: center;">${badgeHtml}</td>
            <td style="text-align: right;">${targetHtml}</td>
            <td style="text-align: center;">
              ${(d.parent_phone || d.student_phone) ? `
                <button type="button" class="btn btn-sm" style="padding: 0.2rem 0.5rem; font-size: 0.72rem; background: var(--status-present-bg); color: var(--status-present); border: 1px solid var(--status-present); border-radius: var(--radius-sm); font-weight: 700; cursor: pointer;" onclick="openSingleEscalation(${d.student_id})" title="Dispatch Escalation to Parent (${d.parent_phone || d.student_phone})">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> Notify Parent
                </button>
              ` : `
                <span style="font-size: 0.72rem; color: var(--text-muted);">No phone</span>
              `}
            </td>
          </tr>
        `;
      }).join('');

      // Update Select All Checkbox State
      const selectAllCb = document.getElementById('select-all-defaulters');
      if (selectAllCb) {
        const allVisibleIds = data.map(d => d.student_id);
        selectAllCb.checked = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedStudentIds.has(id));
      }
    }

    function toggleStudentSelect(studentId, isSelected) {
      if (isSelected) {
        selectedStudentIds.add(studentId);
      } else {
        selectedStudentIds.delete(studentId);
      }
      updateSelectCountUI();
    }

    function toggleSelectAllDefaulters(checked) {
      const cbs = document.querySelectorAll('.student-select-cb');
      cbs.forEach(cb => {
        cb.checked = checked;
        const id = Number(cb.value);
        if (checked) selectedStudentIds.add(id);
        else selectedStudentIds.delete(id);
      });
      updateSelectCountUI();
    }

    function updateSelectCountUI() {
      const countEl = document.getElementById('notify-recipients-count');
      if (countEl) countEl.textContent = `${selectedStudentIds.size} student${selectedStudentIds.size === 1 ? '' : 's'}`;

      const parentCountEl = document.getElementById('parent-recipients-count');
      const parentPhoneEl = document.getElementById('parent-phone-count');
      if (parentCountEl || parentPhoneEl) {
        const selectedList = allDefaulters.filter(d => selectedStudentIds.has(d.student_id));
        const withPhone = selectedList.filter(d => d.parent_phone || d.student_phone);
        if (parentCountEl) parentCountEl.textContent = `${selectedList.length} student${selectedList.length === 1 ? '' : 's'}`;
        if (parentPhoneEl) parentPhoneEl.textContent = `${withPhone.length} contact${withPhone.length === 1 ? '' : 's'}`;
      }
    }

    function openNotifyModal() {
      // If no students explicitly checked, auto-select all defaulters
      if (selectedStudentIds.size === 0 && allDefaulters) {
        allDefaulters
          .filter(d => d.status === 'CRITICAL' || d.status === 'WARNING')
          .forEach(d => selectedStudentIds.add(d.student_id));
        filterDefaulters();
      }

      updateSelectCountUI();
      const modal = document.getElementById('notify-defaulters-modal');
      const statusMsg = document.getElementById('notify-status-msg');
      if (statusMsg) statusMsg.style.display = 'none';
      if (modal) modal.style.display = 'flex';
    }

    function closeNotifyModal() {
      const modal = document.getElementById('notify-defaulters-modal');
      if (modal) modal.style.display = 'none';
    }

    async function dispatchDefaulterNotifications() {
      if (selectedStudentIds.size === 0) {
        showToast('Please select at least one student recipient.', 'warning');
        return;
      }

      const msgInput = document.getElementById('notify-custom-message');
      const customMsg = msgInput ? msgInput.value.trim() : '';
      const dispatchBtn = document.getElementById('btn-confirm-dispatch');
      const statusMsg = document.getElementById('notify-status-msg');

      try {
        if (dispatchBtn) dispatchBtn.disabled = true;
        if (statusMsg) {
          statusMsg.style.display = 'block';
          statusMsg.style.background = 'var(--bg-surface)';
          statusMsg.style.color = 'var(--text-main)';
          statusMsg.textContent = 'Dispatching warning notices...';
        }

        const res = await fetchApi('/reports/defaulters/notify', {
          method: 'POST',
          body: JSON.stringify({
            studentIds: Array.from(selectedStudentIds),
            threshold: 75,
            customMessage: customMsg
          })
        });

        if (res.success) {
          if (statusMsg) {
            statusMsg.style.background = 'var(--status-present-bg)';
            statusMsg.style.color = 'var(--status-present)';
            statusMsg.textContent = `Successfully sent early warning notices to ${res.data?.recipients_count || selectedStudentIds.size} students!`;
          }
          setTimeout(() => {
            closeNotifyModal();
            selectedStudentIds.clear();
            filterDefaulters();
          }, 1400);
        } else {
          throw new Error(res.error?.message || 'Failed to dispatch notices');
        }
      } catch (err) {
        if (statusMsg) {
          statusMsg.style.background = 'var(--status-absent-bg)';
          statusMsg.style.color = 'var(--status-absent)';
          statusMsg.textContent = `Error: ${err.message}`;
        }
      } finally {
        if (dispatchBtn) dispatchBtn.disabled = false;
      }
    }

    /* PARENT ESCALATION SUITE */
    const PARENT_TEMPLATES = {
      ATTENDANCE_CRITICAL: "CRITICAL ATTENDANCE ALERT: Dear Parent, your ward {student_name} ({enrollment_no}) in {department} has reached a critical attendance level of {attendance_pct}% ({attended_classes}/{total_classes} classes conducted). Minimum 75% is mandatory for semester examination eligibility. Shortfall: {shortfall_classes} classes. Please contact the Head of Department immediately.",
      ATTENDANCE_WARNING: "ATTENDANCE EARLY WARNING: Dear Parent, your ward {student_name} ({enrollment_no}) currently has an attendance of {attendance_pct}%, which is below the mandatory 75% institutional threshold. Please advise your ward to attend upcoming lectures regularly.",
      CUSTOM: "Dear Parent, this is an official institutional attendance notification regarding your ward {student_name} ({enrollment_no}). Current attendance: {attendance_pct}%."
    };

    function openParentModal() {
      // If no students explicitly checked, auto-select all defaulters
      if (selectedStudentIds.size === 0 && allDefaulters) {
        allDefaulters
          .filter(d => d.status === 'CRITICAL' || d.status === 'WARNING')
          .forEach(d => selectedStudentIds.add(d.student_id));
        filterDefaulters();
      }

      updateSelectCountUI();

      const tplSelect = document.getElementById('parent-template-type');
      if (tplSelect) {
        tplSelect.value = 'ATTENDANCE_CRITICAL';
        updateParentTemplate('ATTENDANCE_CRITICAL');
      }

      const modal = document.getElementById('parent-escalation-modal');
      const statusMsg = document.getElementById('parent-status-msg');
      if (statusMsg) statusMsg.style.display = 'none';
      if (modal) modal.style.display = 'flex';
    }

    function closeParentModal() {
      const modal = document.getElementById('parent-escalation-modal');
      if (modal) modal.style.display = 'none';
    }

    function updateParentTemplate(type) {
      const preview = document.getElementById('parent-message-preview');
      if (preview) {
        preview.value = PARENT_TEMPLATES[type] || PARENT_TEMPLATES.CUSTOM;
      }
    }

    function updateParentPreview() {
      // Channel preview handler if needed
    }

    async function dispatchParentEscalation() {
      if (selectedStudentIds.size === 0) {
        showToast('Please select at least one student recipient.', 'warning');
        return;
      }

      const channelRadio = document.querySelector('input[name="parent_channel"]:checked');
      const channel = channelRadio ? channelRadio.value : 'SMS';
      const templateType = document.getElementById('parent-template-type')?.value || 'ATTENDANCE_CRITICAL';
      const previewMsg = document.getElementById('parent-message-preview')?.value || '';
      const dispatchBtn = document.getElementById('btn-confirm-parent-dispatch');
      const statusMsg = document.getElementById('parent-status-msg');

      try {
        if (dispatchBtn) dispatchBtn.disabled = true;
        if (statusMsg) {
          statusMsg.style.display = 'block';
          statusMsg.style.background = 'var(--bg-surface)';
          statusMsg.style.color = 'var(--text-main)';
          statusMsg.textContent = 'Executing parent escalation...';
        }

        const res = await fetchApi('/reports/defaulters/escalate-parents', {
          method: 'POST',
          body: JSON.stringify({
            studentIds: Array.from(selectedStudentIds),
            channel,
            templateType,
            customTemplate: previewMsg
          })
        });

        if (res.success) {
          if (statusMsg) {
            statusMsg.style.background = 'var(--status-present-bg)';
            statusMsg.style.color = 'var(--status-present)';
            statusMsg.textContent = `${res.data.message || 'Parent escalation dispatched successfully!'}`;
          }

          setTimeout(() => {
            closeParentModal();
            selectedStudentIds.clear();
            filterDefaulters();
          }, 1500);
        } else {
          throw new Error(res.error?.message || 'Failed to dispatch parent escalation');
        }
      } catch (err) {
        if (statusMsg) {
          statusMsg.style.background = 'var(--status-absent-bg)';
          statusMsg.style.color = 'var(--status-absent)';
          statusMsg.textContent = `Error: ${err.message}`;
        }
      } finally {
        if (dispatchBtn) dispatchBtn.disabled = false;
      }
    }

    async function openSingleEscalation(studentId) {
      try {
        const student = allDefaulters.find(d => d.student_id === studentId);
        if (!student) return;
        const res = await fetchApi('/reports/defaulters/escalate-parents', {
          method: 'POST',
          body: JSON.stringify({
            student_ids: [studentId],
            channel: 'SMS',
            template_type: 'ATTENDANCE_CRITICAL'
          })
        });
        if (res.success) {
          showToast(`Escalation notification dispatched to parent of ${student.student_name}!`, 'success');
        } else {
          showToast(res.error?.message || 'Unable to dispatch notice.', 'error');
        }
      } catch (err) {
        showToast(`Error dispatching notice: ${err.message}`, 'error');
      }
    }

    async function openCommLogsModal() {
      const modal = document.getElementById('comm-logs-modal');
      const tbody = document.getElementById('comm-logs-tbody');
      if (modal) modal.style.display = 'flex';
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading logs...</td></tr>';

      try {
        const res = await fetchApi('/reports/defaulters/communication-logs?limit=50');
        if (res.success) {
          if (!res.data.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No communication logs recorded yet.</td></tr>';
            return;
          }
          tbody.innerHTML = res.data.map(log => `
            <tr>
              <td style="font-family: var(--font-family-mono); font-size: 0.78rem; color: var(--text-muted);">${new Date(log.sent_at).toLocaleString()}</td>
              <td style="font-weight: 600; color: var(--text-main);">${log.student_name} <span style="font-size: 0.72rem; color: var(--text-muted);">(${log.official_enrollment_no})</span></td>
              <td style="font-family: var(--font-family-mono); font-size: 0.8rem;">${log.recipient_phone}</td>
              <td style="text-align: center;"><span class="badge ${log.channel === 'SMS' ? 'badge-present' : 'badge-pending'}">${log.channel}</span></td>
              <td style="text-align: center;"><span class="badge badge-present">${log.delivery_status}</span></td>
              <td style="text-align: right; font-weight: 700; color: ${Number(log.attendance_pct) < 60 ? 'var(--status-absent)' : 'var(--status-late)'};">${log.attendance_pct}%</td>
            </tr>
          `).join('');
        }
      } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--status-absent);">Failed to load logs: ${err.message}</td></tr>`;
      }
    }

    function closeCommLogsModal() {
      const modal = document.getElementById('comm-logs-modal');
      if (modal) modal.style.display = 'none';
    }

    function exportDefaultersCsv() {
      window.location.href = `${API}/reports/defaulters/export?threshold=75`;
    }

    async function loadEsp32Scans() {
      try {
        const res = await fetchApi('/reports/esp32-presence?limit=50');
        const tbody = document.getElementById('esp32-tbody');
        if (res.success) {
          if (!res.data.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No biometric scans recorded recently.</td></tr>`;
            return;
          }

          tbody.innerHTML = res.data.map(e => `
            <tr>
              <td style="font-family: var(--font-family-mono); font-size: 0.8rem; color: var(--text-muted);">${new Date(e.scan_time).toLocaleString()}</td>
              <td style="font-weight: 600;">${e.full_name}</td>
              <td style="font-family: var(--font-family-mono); font-size: 0.8rem;">${e.official_enrollment_no}</td>
              <td><span class="badge badge-pending" style="font-family: var(--font-family-mono);">${e.device_uid}</span></td>
              <td>${e.device_name || 'Classroom Terminal'}</td>
              <td style="text-align: right;"><span class="badge badge-present">TOUCH RECORDED</span></td>
            </tr>
          `).join('');
        }
      } catch (err) {
        console.error(err);
      }
    }

    function switchTab(tab) {
      document.getElementById('tab-analytics-panel').style.display = tab === 'analytics' ? 'block' : 'none';
      document.getElementById('tab-defaulters-panel').style.display = tab === 'defaulters' ? 'block' : 'none';
      document.getElementById('tab-esp32-panel').style.display = tab === 'esp32' ? 'block' : 'none';

      document.getElementById('tab-analytics-btn').className = tab === 'analytics' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
      document.getElementById('tab-defaulters-btn').className = tab === 'defaulters' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
      document.getElementById('tab-esp32-btn').className = tab === 'esp32' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';

      if (tab === 'analytics') loadAnalytics();
      if (tab === 'defaulters') loadDefaulters();
      if (tab === 'esp32') loadEsp32Scans();
    }

    // Check query params for tab
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab') || 'analytics';
    switchTab(initialTab);

