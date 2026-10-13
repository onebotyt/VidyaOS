/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: STUDENTS
 * frontend/admin/students/students.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['SYSTEM_ADMIN']);

    let allDepartments = [];
    let allBranches = [];
    let currentAnalytics = null;
    let rosterStudents = [];
    let isRosterVisible = false;
    let searchDebounce = null;

    // Chart.js instances
    let chartDeptsInstance = null;
    let chartBiometricsInstance = null;
    let chartCohortsInstance = null;

    // ─── Bootstrap ────────────────────────────────────────────
    async function init() {
      await loadDepartments();
      await loadAllAnalytics();
    }

    // ─── Load Departments for Filter ──────────────────────────
    async function loadDepartments() {
      try {
        const res = await fetchApi('/admin/departments');
        allDepartments = res.data || [];
        const deptSelect = document.getElementById('dept-filter');
        deptSelect.innerHTML = '<option value="">All Departments (College-wide)</option>';
        allDepartments.forEach(d => {
          deptSelect.innerHTML += `<option value="${d.id}">${esc(d.name)} (${esc(d.code)})</option>`;
        });

        const branchRes = await fetchApi('/admin/branches');
        allBranches = branchRes.data || [];
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    }

    function onDepartmentFilterChange() {
      loadAllAnalytics();
      if (isRosterVisible) {
        loadRoster();
      }
    }

    // ─── Load Analytics & Charts ──────────────────────────────
    async function loadAllAnalytics() {
      const deptId = document.getElementById('dept-filter').value;
      const url = deptId ? `/admin/students/analytics?department_id=${deptId}` : '/admin/students/analytics';

      try {
        const res = await fetchApi(url);
        if (!res.success) throw new Error(res.error?.message || 'Failed to load analytics');
        currentAnalytics = res.data;

        renderKPIs(currentAnalytics);
        renderCharts(currentAnalytics);
        renderCohortSummaryTable(currentAnalytics.cohort_breakdown || []);
      } catch (err) {
        showToast('Error loading analytics: ' + err.message, 'error');
      }
    }

    function renderKPIs(data) {
      document.getElementById('kpi-total-students').textContent = data.total_students;
      document.getElementById('kpi-total-sub').textContent = `${data.active_students} Active • ${data.provisioned_students} Prov.`;

      document.getElementById('kpi-biometric-pct').textContent = `${data.biometric_coverage_pct}%`;
      document.getElementById('kpi-biometric-sub').textContent = `${data.biometric_enrolled_students}/${data.total_students} Enrolled`;

      const activePct = data.total_students > 0 ? Math.round((data.active_students / data.total_students) * 100) : 0;
      document.getElementById('kpi-active-pct').textContent = `${activePct}%`;
      document.getElementById('kpi-active-sub').textContent = `${data.active_students} Active Students`;

      document.getElementById('kpi-cohorts-count').textContent = data.cohorts_count;
      document.getElementById('kpi-cohorts-sub').textContent = `Across Depts`;
    }

    function renderCharts(data) {
      // 1. Departments Distribution Chart
      const deptLabels = (data.department_breakdown || []).map(d => d.department_code || d.department_name);
      const deptCounts = (data.department_breakdown || []).map(d => d.student_count);
      const deptBioCounts = (data.department_breakdown || []).map(d => d.biometric_count);

      const colPrimary = getCssVar('--color-primary');
      const colPresent = getCssVar('--status-present');
      const colLate = getCssVar('--status-late');
      const colBgCard = getCssVar('--bg-card');

      const ctxDepts = document.getElementById('chart-departments').getContext('2d');
      if (chartDeptsInstance) chartDeptsInstance.destroy();

      chartDeptsInstance = new Chart(ctxDepts, {
        type: 'bar',
        data: {
          labels: deptLabels.length ? deptLabels : ['None'],
          datasets: [
            {
              label: 'Total Students',
              data: deptCounts.length ? deptCounts : [0],
              backgroundColor: colPrimary,
              borderRadius: 6
            },
            {
              label: 'Biometric Registered',
              data: deptBioCounts.length ? deptBioCounts : [0],
              backgroundColor: colPresent,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });

      // 2. Biometric Coverage Doughnut Chart
      const bioRegistered = data.biometric_enrolled_students || 0;
      const bioPending = Math.max(0, (data.total_students || 0) - bioRegistered);

      const ctxBio = document.getElementById('chart-biometrics').getContext('2d');
      if (chartBiometricsInstance) chartBiometricsInstance.destroy();

      chartBiometricsInstance = new Chart(ctxBio, {
        type: 'doughnut',
        data: {
          labels: ['Biometric Registered', 'Pending Terminal Registration'],
          datasets: [{
            data: [bioRegistered, bioPending],
            backgroundColor: [colPresent, colLate],
            borderWidth: 2,
            borderColor: colBgCard
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          },
          cutout: '68%'
        }
      });

      // 3. Cohort Distribution Bar Chart
      const cohortLabels = (data.cohort_breakdown || []).map(c => `${c.department_code} Y${c.year}S${c.semester}`);
      const cohortCounts = (data.cohort_breakdown || []).map(c => c.student_count);

      const ctxCohorts = document.getElementById('chart-cohorts').getContext('2d');
      if (chartCohortsInstance) chartCohortsInstance.destroy();

      chartCohortsInstance = new Chart(ctxCohorts, {
        type: 'bar',
        data: {
          labels: cohortLabels.length ? cohortLabels : ['None'],
          datasets: [{
            label: 'Students in Cohort',
            data: cohortCounts.length ? cohortCounts : [0],
            backgroundColor: [colPrimary, colPresent, colLate, colPrimary, colPresent],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });

      // Initialize responsive chart tab visibility
      const activeTabBtn = document.querySelector('.stud-tab-btn.active');
      const activeChart = activeTabBtn ? activeTabBtn.dataset.chart : 'departments';
      if (typeof window.switchChartTab === 'function') {
        window.switchChartTab(activeChart);
      }
    }

    // ─── Responsive Mobile Chart Tab Switcher ─────────────────
    window.switchChartTab = function(chartName) {
      document.querySelectorAll('.stud-tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.chart === chartName);
      });
      const cDepts = document.getElementById('chart-card-departments');
      const cBio = document.getElementById('chart-card-biometrics');
      const cCohorts = document.getElementById('chart-card-cohorts');

      if (window.innerWidth <= 639) {
        if (cDepts) cDepts.style.display = (chartName === 'departments') ? 'block' : 'none';
        if (cBio) cBio.style.display = (chartName === 'biometrics') ? 'block' : 'none';
        if (cCohorts) cCohorts.style.display = (chartName === 'cohorts') ? 'block' : 'none';
      } else {
        if (cDepts) cDepts.style.display = 'block';
        if (cBio) cBio.style.display = 'block';
        if (cCohorts) cCohorts.style.display = 'block';
      }
    };

    window.addEventListener('resize', () => {
      const activeBtn = document.querySelector('.stud-tab-btn.active');
      const chartName = activeBtn ? activeBtn.dataset.chart : 'departments';
      window.switchChartTab(chartName);
    });

    // ─── Render Cohort Breakdown Table & Mobile Cards ────────
    function renderCohortSummaryTable(cohorts) {
      document.getElementById('cohorts-badge').textContent = `${cohorts.length} Active Cohort${cohorts.length !== 1 ? 's' : ''}`;
      const tbody = document.getElementById('cohort-summary-tbody');
      const mwrap = document.getElementById('cohort-mobile-cards-wrap');

      if (!cohorts.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">No enrolled cohorts found for this selection.</td></tr>`;
        if (mwrap) mwrap.innerHTML = `<div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem;">No enrolled cohorts found.</div>`;
        return;
      }

      // 1. Desktop Table
      tbody.innerHTML = cohorts.map(c => {
        const bioPct = c.student_count > 0 ? Math.round((c.biometric_count / c.student_count) * 100) : 0;
        const ctCell = c.class_teacher_name 
          ? `<span style="font-weight: 600; color: var(--text-main);">${esc(c.class_teacher_name)}</span>`
          : `<span style="color: var(--text-muted); font-size: 0.8rem;">— Not Assigned</span>`;

        return `
          <tr>
            <td>
              <div style="font-weight: 600; color: var(--text-main);">${esc(c.department_name)}</div>
              <span class="code-badge" style="font-size: 0.75rem; padding: 0.1rem 0.4rem;">${esc(c.department_code || c.branch_code)}</span>
            </td>
            <td style="text-align: center;">
              <span class="badge badge-pending">Year ${c.year} • Sem ${c.semester}</span>
            </td>
            <td style="text-align: center; font-weight: 700; font-size: 1.05rem;">
              ${c.student_count}
            </td>
            <td style="text-align: center;">
              <span style="font-weight: 700; color: ${bioPct >= 50 ? 'var(--status-present)' : 'var(--status-late)'};">
                ${c.biometric_count} / ${c.student_count} (${bioPct}%)
              </span>
            </td>
            <td>${ctCell}</td>
          </tr>
        `;
      }).join('');

      // 2. Mobile Cards
      if (mwrap) {
        mwrap.innerHTML = cohorts.map(c => {
          const bioPct = c.student_count > 0 ? Math.round((c.biometric_count / c.student_count) * 100) : 0;
          const ctName = c.class_teacher_name ? esc(c.class_teacher_name) : 'Not Assigned';
          return `
            <div class="cohort-mob-card">
              <div class="cohort-mob-head">
                <div>
                  <div class="cohort-mob-dept">${esc(c.department_name)}</div>
                  <span class="code-badge" style="font-size: 0.68rem; padding: 0.1rem 0.35rem;">${esc(c.department_code || c.branch_code)}</span>
                </div>
                <span class="badge badge-pending" style="font-size: 0.72rem;">Y${c.year} • S${c.semester}</span>
              </div>
              <div class="cohort-mob-stats">
                <div class="cohort-mob-stat-item">
                  <div class="cohort-mob-stat-label">Students</div>
                  <div class="cohort-mob-stat-val">${c.student_count}</div>
                </div>
                <div class="cohort-mob-stat-item">
                  <div class="cohort-mob-stat-label">Biometric</div>
                  <div class="cohort-mob-stat-val" style="color: ${bioPct >= 50 ? 'var(--status-present)' : 'var(--status-late)'};">
                    ${c.biometric_count} <span style="font-size: 0.7rem; font-weight: 400;">(${bioPct}%)</span>
                  </div>
                </div>
                <div class="cohort-mob-stat-item">
                  <div class="cohort-mob-stat-label">Teacher</div>
                  <div class="cohort-mob-stat-val" style="font-size: 0.76rem; color: var(--text-main); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ctName}</div>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // ─── Collapsible Roster Logic ─────────────────────────────
    function toggleRosterView() {
      const rosterSec = document.getElementById('roster-section');
      const toggleBtn = document.getElementById('toggle-roster-btn');
      const toggleIcon = document.getElementById('toggle-icon');
      const toggleText = document.getElementById('toggle-text');

      isRosterVisible = !isRosterVisible;

      if (isRosterVisible) {
        rosterSec.style.display = 'block';
        toggleBtn.classList.add('active');
        toggleIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        toggleText.textContent = 'Hide Student Roster';
        loadRoster();

        // Smooth scroll to roster section
        setTimeout(() => {
          rosterSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        rosterSec.style.display = 'none';
        toggleBtn.classList.remove('active');
        toggleIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        toggleText.textContent = 'View Student Roster';
      }
    }

    function onRosterSearch() {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        loadRoster();
      }, 300);
    }

    async function loadRoster() {
      const tbody = document.getElementById('roster-tbody');
      const countBadge = document.getElementById('roster-count-badge');
      const searchVal = document.getElementById('roster-search').value.trim();
      const deptFilter = document.getElementById('dept-filter').value;

      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">Filtering roster records...</td></tr>`;

      try {
        let url = `/admin/students/roster?limit=250`;
        if (deptFilter) url += `&department_id=${encodeURIComponent(deptFilter)}`;
        if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;

        const res = await fetchApi(url);
        if (!res.success) throw new Error(res.error?.message || 'Failed to fetch roster');

        rosterStudents = res.data?.students || [];
        const total = res.data?.total || rosterStudents.length;

        countBadge.textContent = `${total} Student${total !== 1 ? 's' : ''}`;
        renderRosterTable(rosterStudents);
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--status-absent); padding: 2rem;">Failed to load roster: ${err.message}</td></tr>`;
      }
    }

    function renderRosterTable(students) {
      const tbody = document.getElementById('roster-tbody');
      const mwrap = document.getElementById('roster-mobile-cards-wrap');

      if (!students.length) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No students found matching your filter criteria.</td></tr>`;
        if (mwrap) mwrap.innerHTML = `<div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem;">No students found matching your filter criteria.</div>`;
        return;
      }

      // 1. Desktop Table
      tbody.innerHTML = students.map(s => {
        let statusBadge = `<span class="badge badge-present">ACTIVE</span>`;
        if (s.user_status === 'PROVISIONED') statusBadge = `<span class="badge badge-late">PROVISIONED</span>`;
        else if (s.user_status === 'SUSPENDED') statusBadge = `<span class="badge badge-absent">SUSPENDED</span>`;

        const bioCell = s.biometric_slot_id
          ? `<span style="font-weight: 600; color: var(--status-present); font-size: 0.85rem;">
               Slot #${s.biometric_slot_id} <span style="font-size: 0.75rem; color: var(--text-muted);">(${esc(s.device_name || 'Terminal')})</span>
             </span>`
          : `<span style="color: var(--text-muted); font-size: 0.8rem;">— Pending Slot</span>`;

        const googleBadge = s.google_linked
          ? `<span style="color: var(--status-present); font-weight: 700; font-size: 0.85rem;">Linked</span>`
          : `<span style="color: var(--text-muted); font-size: 0.78rem;">—</span>`;

        return `
          <tr>
            <td style="text-align: center; font-weight: 700;">${s.class_roll_no || '—'}</td>
            <td>
              <span style="font-family: var(--font-family-mono); font-weight: 700; color: var(--color-primary);">
                ${esc(s.official_enrollment_no)}
              </span>
            </td>
            <td>
              <span class="badge" style="background: var(--bg-surface-secondary); font-family: var(--font-family-mono); font-size: 0.78rem; color: var(--color-primary); font-weight: 700;">
                ${esc(s.registration_no || '—')}
              </span>
            </td>
            <td style="font-weight: 600; color: var(--text-main);">
              <a href="javascript:void(0)" onclick="openStudentDossier(${s.id})" style="color: var(--text-main); text-decoration: none; border-bottom: 1px dotted var(--color-primary);" title="Click to view full Academic Dossier &amp; Vault">
                ${esc(s.full_name)}
              </a>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${esc(s.email || '')}</div>
            </td>
            <td>
              <div style="font-weight: 600; color: var(--text-main);">${esc(s.department_name)}</div>
              <span class="code-badge" style="font-size: 0.75rem; padding: 0.1rem 0.4rem;">${esc(s.department_code || s.branch_code || '')}</span>
            </td>
            <td style="text-align: center;">
              <span class="badge badge-pending">Y${s.year} S${s.semester}</span>
            </td>
            <td>${bioCell}</td>
            <td style="text-align: center;">${statusBadge}</td>
            <td style="text-align: center;">${googleBadge}</td>
            <td style="text-align: right;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="openStudentDossier(${s.id})" title="View Student Academic Dossier &amp; Vault" style="font-size: 0.78rem; padding: 0.25rem 0.55rem; font-weight: 600;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> Dossier
              </button>
            </td>
          </tr>
        `;
      }).join('');

      // 2. Mobile Cards
      if (mwrap) {
        mwrap.innerHTML = students.map(s => {
          let statusBadge = `<span class="badge badge-present" style="font-size:0.68rem; padding:0.1rem 0.4rem;">ACTIVE</span>`;
          if (s.user_status === 'PROVISIONED') statusBadge = `<span class="badge badge-late" style="font-size:0.68rem; padding:0.1rem 0.4rem;">PROVISIONED</span>`;
          else if (s.user_status === 'SUSPENDED') statusBadge = `<span class="badge badge-absent" style="font-size:0.68rem; padding:0.1rem 0.4rem;">SUSPENDED</span>`;

          const bioBadge = s.biometric_slot_id
            ? `<span style="font-size:0.72rem; font-weight:600; color:var(--status-present);">Slot #${s.biometric_slot_id}</span>`
            : `<span style="font-size:0.72rem; color:var(--text-muted);">No Bio</span>`;

          return `
            <div class="roster-mob-card">
              <div class="roster-mob-head">
                <div>
                  <div class="roster-mob-name">${esc(s.full_name)}</div>
                  <div class="roster-mob-sub">Roll ${s.class_roll_no || '—'} • ${esc(s.department_code || '')} Y${s.year}S${s.semester}</div>
                </div>
                <div>${statusBadge}</div>
              </div>
              <div class="roster-mob-details">
                <div style="font-family: var(--font-family-mono); font-size: 0.74rem; font-weight: 700; color: var(--color-primary);">${esc(s.official_enrollment_no)}</div>
                <div>${bioBadge}</div>
              </div>
              <div class="roster-mob-actions">
                <div style="font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">${esc(s.email || '')}</div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="openStudentDossier(${s.id})" style="font-size: 0.72rem; padding: 0.2rem 0.55rem; font-weight: 600;">Dossier</button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // ─── Helpers ──────────────────────────────────────────────
    

    function getCssVar(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    

    init();

