/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: HOD-SETTINGS
 * frontend/faculty/hod-settings/hod-settings.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute({ roles: ['TEACHER'], requireHOD: true });

    let currentSettings = null;

    async function init() {
      await loadSettings();
    }

    async function loadSettings() {
      try {
        const res = await fetchApi('/hod/settings');
        if (res.success && res.data) {
          currentSettings = res.data;
          renderSettings(res.data);
        }
      } catch (err) {
        showToast('Failed to load department settings: ' + err.message, 'error');
      }
    }

    function renderSettings(d) {
      document.getElementById('dept-header-name').innerText = d.department_name + ' (HOD)';
      document.getElementById('page-subtitle').innerText = `Departmental curriculum specifications, attendance evaluation thresholds, and hardware scanner telemetry rules for ${d.department_name}.`;

      // KPIs
      document.getElementById('kpi-duration').innerText = `${d.degree_duration_years} Years`;
      document.getElementById('kpi-duration-sub').innerText = `Semesters 1 to ${d.degree_duration_years * 2}`;

      document.getElementById('kpi-threshold').innerText = `${d.defaulter_threshold_percent || 75}%`;
      document.getElementById('kpi-resources').innerText = `${d.teachers_count || 0} Faculty • ${d.students_count || 0} Students`;
      document.getElementById('kpi-resources-sub').innerText = `${d.terminals_count || 0} Biometric Terminals Registered`;

      // Form fields
      document.getElementById('setting-duration').value = String(Math.min(d.degree_duration_years || 3, 4));
      document.getElementById('setting-threshold').value = d.defaulter_threshold_percent || 75;

      // Governance
      document.getElementById('m-dept-name').innerText = d.department_name;
      document.getElementById('m-dept-code').innerText = d.department_code;
      document.getElementById('confirm-dept-code-label').innerText = d.department_code;
      document.getElementById('m-hod-name').innerText = d.hod_name;
      document.getElementById('m-hod-email').innerText = d.hod_email;

      onDurationChange();
    }

    function onDurationChange() {
      const selected = parseInt(document.getElementById('setting-duration').value, 10);
      const original = currentSettings ? currentSettings.degree_duration_years : 3;
      const confirmBox = document.getElementById('duration-confirm-box');
      if (selected !== original) {
        confirmBox.style.display = 'block';
      } else {
        confirmBox.style.display = 'none';
        document.getElementById('setting-confirm-code').value = '';
      }
    }

    async function saveCurriculumSettings() {
      if (!currentSettings) return;
      const duration = parseInt(document.getElementById('setting-duration').value, 10);
      const confirmBox = document.getElementById('duration-confirm-box');
      const btn = document.getElementById('save-curriculum-btn');

      // Check if duration changed and requires confirmation
      if (duration !== currentSettings.degree_duration_years) {
        const codeInput = document.getElementById('setting-confirm-code').value.trim().toUpperCase();
        if (codeInput !== currentSettings.department_code.toUpperCase()) {
          showToast(`Please enter your exact department code (${currentSettings.department_code}) to confirm changing degree duration.`, 'warning');
          return;
        }
      }

      btn.disabled = true;
      try {
        const res = await fetchApi('/hod/settings', {
          method: 'PUT',
          body: JSON.stringify({
            degree_duration_years: duration
          })
        });
        if (res.success) {
          showToast('Curriculum duration saved successfully!', 'success');
          await loadSettings();
        }
      } catch (err) {
        // Handled by fetchApi toast
      } finally {
        btn.disabled = false;
      }
    }

    async function savePolicySettings() {
      const threshold = parseInt(document.getElementById('setting-threshold').value, 10);
      if (isNaN(threshold) || threshold < 50 || threshold > 100) {
        showToast('Threshold must be a percentage between 50% and 100%.', 'warning');
        return;
      }

      const btn = document.getElementById('save-policy-btn');
      btn.disabled = true;
      try {
        const res = await fetchApi('/hod/settings', {
          method: 'PUT',
          body: JSON.stringify({
            defaulter_threshold_percent: threshold
          })
        });
        if (res.success) {
          showToast('Attendance defaulter threshold updated successfully!', 'success');
          await loadSettings();
        }
      } catch (err) {
        // Handled by fetchApi toast
      } finally {
        btn.disabled = false;
      }
    }

    init();

