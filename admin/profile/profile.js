/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: PROFILE
 * frontend/admin/profile/profile.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['SYSTEM_ADMIN']);

    let currentAdminUser = null;

    function togglePassVisibility(inputId, btn) {
      const input = document.getElementById(inputId);
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
      } else {
        input.type = 'password';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      }
    }

    async function loadAdminProfile() {
      try {
        const res = await fetchApi('/auth/me');
        if (res && res.success && res.data) {
          currentAdminUser = res.data;
          renderAdminProfile(res.data);
        }
      } catch (err) {
        showToast(err.message || 'Failed to load administrator profile', 'error');
      }
    }

    function renderAdminProfile(user) {
      const name = user.username || user.name || 'System Administrator';
      const email = user.email || 'admin@college.edu';
      const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'SA';

      document.getElementById('hero-name').textContent = name;
      document.getElementById('hero-email').textContent = email;
      document.getElementById('hero-avatar').textContent = initials;

      document.getElementById('admin-username').value = user.username || '';
      document.getElementById('admin-email').value = email;
    }

    async function loadGovernanceMetrics() {
      try {
        const res = await fetchApi('/admin/stats');
        if (res && res.success && res.data) {
          const d = res.data;
          document.getElementById('stat-dept').textContent = d.total_departments || '0';
          document.getElementById('stat-teachers').textContent = d.total_teachers || '0';
          document.getElementById('stat-students').textContent = d.total_students || '0';
          document.getElementById('stat-registers').textContent = d.today_sessions || '0';
          document.getElementById('stat-devices').textContent = d.active_terminals || '0';
        }
      } catch (e) {
        console.warn('Could not load governance stats:', e);
      }
    }

    document.getElementById('admin-profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('save-admin-btn');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      const username = document.getElementById('admin-username').value.trim();
      const email = document.getElementById('admin-email').value.trim();

      try {
        const res = await fetchApi('/admin/profile', {
          method: 'PUT',
          body: JSON.stringify({ username, email })
        });
        if (res && res.success) {
          showToast('Administrator profile updated successfully!', 'success');
          await loadAdminProfile();
        } else {
          showToast(res?.error?.message || 'Failed to update profile.', 'error');
        }
      } catch (err) {
        showToast(err.message || 'Error saving admin profile.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Update Admin Profile';
      }
    });

    document.getElementById('admin-pass-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('admin-current-pass').value;
      const newPassword = document.getElementById('admin-new-pass').value;
      const confirmPassword = document.getElementById('admin-confirm-pass').value;

      if (newPassword !== confirmPassword) {
        showToast('New passwords do not match.', 'error');
        return;
      }

      const btn = document.getElementById('save-pass-btn');
      btn.disabled = true;
      btn.textContent = 'Updating...';

      try {
        const res = await fetchApi('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword })
        });
        if (res && res.success) {
          showToast('Password changed successfully!', 'success');
          document.getElementById('admin-pass-form').reset();
        } else {
          showToast(res?.error?.message || 'Failed to change password.', 'error');
        }
      } catch (err) {
        showToast(err.message || 'Failed to change password.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Change Password';
      }
    });

    (async function init() {
      await loadAdminProfile();
      await loadGovernanceMetrics();
    })();

