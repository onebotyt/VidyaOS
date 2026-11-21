/**
 * Student Settings & Account View
 */

import { Auth } from '../../../core/auth.js';
import { Router } from '../../../core/router.js';
import { Updater } from '../../../core/updater.js';
import { Platform } from '../../../core/platform.js';
import { Dialog } from '../../../components/dialog/dialog.js';
import { showToast } from '../../../components/toast/toast.js';
import { getIcon } from '../../../assets/icons/icons.js';

export async function renderStudentSettings(container) {
  const user = Auth.getUser() || {};
  const name = user.full_name || user.name || 'Girdhar Dhami';
  const dept = user.department_name || user.dept_name || 'Information Technology';
  const regNumber = user.registration_number || user.reg_number || '2100501001';
  const semester = user.semester || 5;
  const year = Math.ceil(semester / 2) || 3;
  const roll = user.roll_number || user.roll_no || 1;
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'GD';
  const installedVersion = await Updater.getInstalledVersion();

  container.innerHTML = `
    <div class="view-container">
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 22px; font-weight: 700;">Settings & Account</h2>
        <p style="font-size: 13.5px; color: var(--text-muted);">Manage your profile, app updates, institutional support, and preferences</p>
      </div>

      <div class="settings-stack">
        <!-- Profile Preview Card (Opens Profile Page) -->
        <div class="settings-profile-preview" id="settings-profile-card">
          <div class="settings-avatar">${initials}</div>
          <div class="settings-profile-info">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="settings-profile-name">${name}</span>
              <span class="badge badge-student">STUDENT</span>
            </div>
            <span class="settings-profile-sub">${dept} • Reg: ${regNumber}</span>
            <div style="display: flex; gap: 6px; margin-top: 6px;">
              <span class="badge badge-info" style="font-size: 11px;">Year ${year} • Sem ${semester}</span>
              <span class="badge badge-info" style="font-size: 11px;">Roll: ${roll}</span>
            </div>
          </div>
          <div style="color: var(--text-muted);">
            ${getIcon('chevronRight')}
          </div>
        </div>

        <!-- App & Updates Section -->
        <div>
          <h4 class="settings-group-title">App & Updates</h4>
          <div class="card" style="padding: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;" id="update-status-row">
              <div style="display: flex; align-items: center; gap: 14px;">
                <div class="settings-item-icon" style="color: var(--color-primary); background: var(--color-primary-subtle);">
                  ${getIcon('download')}
                </div>
                <div>
                  <div style="font-size: 15px; font-weight: 600;">Check for App Updates</div>
                  <div style="font-size: 12.5px; color: var(--text-muted);" id="installed-ver-label">
                    Installed: VidyaOS v${installedVersion} • Platform: ${Platform.os.toUpperCase()}
                  </div>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" id="check-updates-btn">
                Check Updates
              </button>
            </div>

            <!-- Dynamic Update Card (Revealed only if newer version exists) -->
            <div id="update-action-container" style="display: none; margin-top: 16px; padding: 14px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
            </div>
          </div>
        </div>

        <!-- Institutional Support -->
        <div>
          <h4 class="settings-group-title">Institutional Support</h4>
          <div class="settings-list-card">
            <div class="settings-item-row" id="support-helpdesk-btn">
              <div class="settings-item-left">
                <div class="settings-item-icon" style="color: #0284c7;">
                  ${getIcon('graduationCap')}
                </div>
                <div>
                  <div class="settings-item-title">Student Campus Helpdesk</div>
                  <div class="settings-item-subtitle">Government Polytechnic Nainital support cell & academic queries</div>
                </div>
              </div>
              <span style="color: var(--text-muted);">${getIcon('chevronRight')}</span>
            </div>

            <div class="settings-item-row" id="report-complaint-btn">
              <div class="settings-item-left">
                <div class="settings-item-icon" style="color: var(--status-absent);">
                  ${getIcon('bug')}
                </div>
                <div>
                  <div class="settings-item-title">Report Issue / Bug</div>
                  <div class="settings-item-subtitle">Submit software feedback or grievance directly to admin</div>
                </div>
              </div>
              <span style="color: var(--text-muted);">${getIcon('chevronRight')}</span>
            </div>
          </div>
        </div>

        <!-- Account Actions -->
        <div>
          <h4 class="settings-group-title">Account Session</h4>
          <div class="settings-list-card">
            <div class="settings-item-row" id="settings-logout-btn" style="color: var(--status-absent);">
              <div class="settings-item-left">
                <div class="settings-item-icon" style="color: var(--status-absent); background: var(--status-absent-bg);">
                  ${getIcon('logout')}
                </div>
                <div>
                  <div class="settings-item-title" style="color: var(--status-absent);">Sign Out of Device</div>
                  <div class="settings-item-subtitle">End session on this device</div>
                </div>
              </div>
              <span style="color: var(--status-absent);">${getIcon('chevronRight')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Profile click redirect
  container.querySelector('#settings-profile-card')?.addEventListener('click', () => {
    Platform.hapticFeedback('light');
    Router.navigate('student/profile');
  });

  // Check Updates button with strict semver logic
  const checkBtn = container.querySelector('#check-updates-btn');
  const updateContainer = container.querySelector('#update-action-container');

  checkBtn?.addEventListener('click', async () => {
    Platform.hapticFeedback('light');
    checkBtn.disabled = true;
    checkBtn.textContent = 'Checking...';

    try {
      const updateResult = await Updater.checkForUpdates();
      checkBtn.disabled = false;
      checkBtn.textContent = 'Check Updates';

      if (updateResult.updateAvailable) {
        Platform.hapticFeedback('success');
        updateContainer.style.display = 'block';
        updateContainer.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge badge-present">Update Available: v${updateResult.remoteVersion}</span>
            </div>
            <p style="font-size: 13px; color: var(--text-secondary);">${updateResult.notes}</p>
            <button class="btn btn-primary btn-sm" id="install-update-action-btn" style="align-self: flex-start; margin-top: 6px;">
              ${getIcon('download')} Download & Install Now
            </button>
          </div>
        `;
        updateContainer.querySelector('#install-update-action-btn')?.addEventListener('click', () => {
          Updater.applyUpdate(updateResult);
        });
      } else {
        updateContainer.style.display = 'block';
        updateContainer.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; color: var(--status-present); font-size: 13.5px; font-weight: 500;">
            ${getIcon('check')} You are already running the latest version (v${installedVersion}).
          </div>
        `;
        setTimeout(() => {
          updateContainer.style.display = 'none';
        }, 5000);
      }
    } catch (err) {
      checkBtn.disabled = false;
      checkBtn.textContent = 'Check Updates';
      showToast('Could not reach update server', 'warning');
    }
  });

  // Campus Helpdesk Modal
  container.querySelector('#support-helpdesk-btn')?.addEventListener('click', () => {
    Dialog.confirm({
      title: 'Student Campus Helpdesk',
      message: 'Government Polytechnic Nainital support cell is available Monday through Saturday (10:00 AM - 4:00 PM) in Administrative Block 1 or via email at support@gpnainital.ac.in',
      confirmText: 'Understood',
      cancelText: 'Close'
    });
  });

  // Report Issue
  container.querySelector('#report-complaint-btn')?.addEventListener('click', () => {
    Dialog.form({
      title: 'Report Bug / Feedback',
      fields: [
        { name: 'title', label: 'Issue Title', type: 'text', placeholder: 'Brief summary', required: true },
        { name: 'category', label: 'Category', type: 'select', options: ['App Bug', 'Attendance Discrepancy', 'Profile Error', 'Other'], required: true },
        { name: 'description', label: 'Detailed Description', type: 'textarea', placeholder: 'Describe what happened...', required: true }
      ],
      submitText: 'Submit Issue',
      onSubmit: async (values) => {
        showToast('Your issue report has been submitted to administrator', 'success');
      }
    });
  });

  // Logout confirmation
  container.querySelector('#settings-logout-btn')?.addEventListener('click', () => {
    Dialog.confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of VidyaOS on this device?',
      confirmText: 'Sign Out',
      confirmVariant: 'danger',
      onConfirm: async () => {
        await Auth.logout();
        showToast('You have been signed out', 'info');
      }
    });
  });
}

export default renderStudentSettings;
