/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: PROFILE
 * frontend/student/profile/profile.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['STUDENT']);

    function togglePassVisibility(inputId, btn) {
      const inp = document.getElementById(inputId);
      if (!inp) return;
      if (inp.type === 'password') {
        inp.type = 'text';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
      } else {
        inp.type = 'password';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      }
    }

    async function loadStudentProfile() {
      try {
        const res = await fetchApi('/students/me');
        if (!res.success || !res.data) return;

        const s = res.data;

        // 1. Identity
        const fullName = s.full_name || 'Student';
        document.getElementById('hero-name').innerText = fullName;
        document.getElementById('hero-enrollment').innerText = s.official_enrollment_no || '--';
        document.getElementById('hero-dept').innerText = `${s.department_name || 'Engineering'} (${s.branch_code || s.department_code || 'DEPT'})`;
        document.getElementById('hero-roll-badge').innerText = `Roll: ${s.class_roll_no || '--'}`;
        if (document.getElementById('hero-reg-badge')) {
          document.getElementById('hero-reg-badge').innerText = `UBTER Reg: ${s.registration_no || '--'}`;
        }
        document.getElementById('hero-term-badge').innerText = `Year ${s.year || 1} • Sem ${s.semester || 1}`;

        // Avatar Initials
        const nameParts = fullName.trim().split(/\s+/);
        const initials = nameParts.length >= 2 
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : fullName.slice(0, 2).toUpperCase();
        document.getElementById('hero-avatar').innerText = initials;

        // Cohort details
        document.getElementById('profile-enrollment-no').innerText = s.official_enrollment_no || '--';
        document.getElementById('profile-roll-no').innerText = s.class_roll_no ? `${s.class_roll_no}` : '--';
        document.getElementById('profile-reg-no').innerText = s.registration_no || '—';
        document.getElementById('profile-department').innerText = s.department_name || s.branch_name || '--';
        document.getElementById('profile-year-sem').innerText = `Year ${s.year} • Semester ${s.semester}`;
        document.getElementById('profile-academic-year').innerText = s.academic_year_label || 'Current Session';
        document.getElementById('profile-class-teacher').innerText = s.class_teacher_name || 'Faculty Advisor';

        // Account fields
        document.getElementById('profile-username').value = s.official_enrollment_no || s.username || '';
        document.getElementById('profile-email').value = s.email || '';

        // 2. Attendance Health Stats
        const stats = s.attendance_stats;
        const standingBadge = document.getElementById('hero-standing-badge');
        const healthPct = document.getElementById('health-pct');
        const healthProgressBar = document.getElementById('health-progress-bar');
        const healthStatusTag = document.getElementById('health-status-tag');
        const healthAttended = document.getElementById('health-attended');
        const healthTotal = document.getElementById('health-total');
        const healthStanding = document.getElementById('health-exam-standing');

        if (stats) {
          const pct = parseFloat(stats.percentage || 0);
          healthPct.innerText = `${pct.toFixed(1)}%`;
          healthProgressBar.style.width = `${Math.min(100, pct)}%`;
          healthAttended.innerText = stats.total_attended || 0;
          healthTotal.innerText = stats.total_classes || 0;

          if (pct >= 75) {
            standingBadge.className = 'std-badge regular';
            standingBadge.innerText = 'Regular (≥ 75%)';
            healthPct.style.color = 'var(--status-present)';
            healthProgressBar.className = 'progress-bar-fill';
            healthStatusTag.innerText = 'Good Standing';
            healthStatusTag.style.color = 'var(--status-present)';
            healthStanding.innerText = 'Eligible for End-Semester Examinations';
            healthStanding.style.color = 'var(--status-present)';
          } else {
            standingBadge.className = 'std-badge defaulter';
            standingBadge.innerText = 'Defaulter (< 75%)';
            healthPct.style.color = 'var(--status-absent)';
            healthProgressBar.className = 'progress-bar-fill defaulter';
            healthStatusTag.innerText = 'Attendance Shortage';
            healthStatusTag.style.color = 'var(--status-absent)';
            healthStanding.innerText = 'Action Required: Minimum 75% needed';
            healthStanding.style.color = 'var(--status-absent)';
          }
        } else {
          healthPct.innerText = '100%';
          healthProgressBar.style.width = '100%';
          healthStatusTag.innerText = 'Verified Standing';
          healthStanding.innerText = 'Eligible for Examinations';
        }

        // 3. Biometrics
        const bioIcon = document.getElementById('biometric-icon');
        const bioHead = document.getElementById('biometric-headline');
        const bioSub = document.getElementById('biometric-sub');
        const bioPanel = document.getElementById('biometric-detail-panel');

        if (s.fingerprint_enrolled) {
          bioIcon.style.background = 'var(--status-present-bg)';
          bioIcon.style.color = 'var(--status-present)';
          bioIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          bioHead.innerText = 'Fingerprint Enrolled & Synced';
          bioSub.innerText = 'Active on hardware attendance terminal';
          bioPanel.style.display = 'block';
          document.getElementById('biometric-slot-val').innerText = `#${s.fingerprint_slot}`;
          document.getElementById('biometric-device-val').innerText = s.fingerprint_device || 'Main Lab Terminal';
        } else {
          bioIcon.style.background = 'var(--status-absent-bg)';
          bioIcon.style.color = 'var(--status-absent)';
          bioIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
          bioHead.innerText = 'Not Registered on Terminal';
          bioSub.innerText = 'Visit your department faculty or lab terminal to register fingerprint template.';
          bioPanel.style.display = 'none';
        }
      } catch (err) {
        console.error('Failed to load student profile', err);
      }
    }

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const feedback = document.getElementById('profile-feedback');
      feedback.style.display = 'none';

      const email = document.getElementById('profile-email').value.trim();
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      if (newPassword && newPassword.length < 8) {
        feedback.style.display = 'block';
        feedback.style.background = 'var(--status-absent-bg)';
        feedback.style.color = 'var(--status-absent)';
        feedback.innerText = 'New password must be at least 8 characters long.';
        return;
      }

      if (newPassword && newPassword !== confirmPassword) {
        feedback.style.display = 'block';
        feedback.style.background = 'var(--status-absent-bg)';
        feedback.style.color = 'var(--status-absent)';
        feedback.innerText = 'New passwords do not match.';
        return;
      }

      const btn = document.getElementById('save-profile-btn');
      btn.disabled = true;

      try {
        const payload = { email };
        if (newPassword) {
          payload.current_password = currentPassword;
          payload.new_password = newPassword;
        }

        const res = await fetchApi('/students/me', {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        if (res.success) {
          showToast('Profile updated successfully!', 'success');
          document.getElementById('current-password').value = '';
          document.getElementById('new-password').value = '';
          document.getElementById('confirm-password').value = '';
          loadStudentProfile();
        } else {
          feedback.style.display = 'block';
          feedback.style.background = 'var(--status-absent-bg)';
          feedback.style.color = 'var(--status-absent)';
          feedback.innerText = res.error?.message || 'Update failed.';
        }
      } catch (err) {
        feedback.style.display = 'block';
        feedback.style.background = 'var(--status-absent-bg)';
        feedback.style.color = 'var(--status-absent)';
        feedback.innerText = err.message || 'An error occurred while updating profile.';
      } finally {
        btn.disabled = false;
      }
    });

    loadStudentProfile();

