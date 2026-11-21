/**
 * Student Profile View
 */

import { Auth } from '../../../core/auth.js';
import { getIcon } from '../../../assets/icons/icons.js';

export async function renderStudentProfile(container) {
  const user = Auth.getUser() || {};
  const name = user.full_name || user.name || 'Girdhar Dhami';
  const email = user.email || 'gdhami115@gmail.com';
  const regNumber = user.registration_number || user.reg_number || '2100501001';
  const dept = user.department_name || user.dept_name || 'Information Technology';
  const semester = user.semester || 5;
  const year = Math.ceil(semester / 2) || 3;
  const roll = user.roll_number || user.roll_no || 1;
  const phone = user.phone || '+91 98765 43210';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'GD';

  container.innerHTML = `
    <div class="view-container">
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 22px; font-weight: 700;">Student Profile</h2>
        <p style="font-size: 13.5px; color: var(--text-muted);">Verified institutional identity & academic enrollment record</p>
      </div>

      <div class="profile-layout-grid">
        <!-- Left Hero Identity Card -->
        <div class="profile-id-card">
          <div class="profile-avatar-large">
            ${initials}
            <span class="status-dot"></span>
          </div>
          <h3 class="profile-name-large">${name}</h3>
          <p class="profile-dept-sub">${dept}</p>

          <div class="profile-chips-row">
            <span class="badge badge-student">STUDENT</span>
            <span class="badge badge-present">Enrolled</span>
          </div>

          <div class="profile-reg-chip">
            Reg: ${regNumber}
          </div>

          <div style="display: flex; gap: 8px; margin-top: 12px; width: 100%; justify-content: center;">
            <span class="badge badge-info">Year ${year} • Sem ${semester}</span>
            <span class="badge badge-info">Roll: ${roll}</span>
          </div>
        </div>

        <!-- Right Column (Academic & Personal Details) -->
        <div class="profile-details-column">
          <!-- Academic Information -->
          <div class="profile-section-card">
            <h4 class="profile-section-title">
              ${getIcon('graduationCap')} Academic Enrollment
            </h4>
            <div class="profile-data-grid">
              <div class="data-row-item">
                <span class="data-row-label">Institution</span>
                <span class="data-row-val">Government Polytechnic Nainital</span>
              </div>
              <div class="data-row-item">
                <span class="data-row-label">Department</span>
                <span class="data-row-val">${dept}</span>
              </div>
              <div class="data-row-item">
                <span class="data-row-label">Current Academic Term</span>
                <span class="data-row-val">Semester ${semester} (Year ${year})</span>
              </div>
              <div class="data-row-item">
                <span class="data-row-label">Section & Batch</span>
                <span class="data-row-val">Section A • 2024-2027</span>
              </div>
              <div class="data-row-item">
                <span class="data-row-label">Class Roll Number</span>
                <span class="data-row-val">${roll}</span>
              </div>
              <div class="data-row-item">
                <span class="data-row-label">Academic Standing</span>
                <span class="data-row-val" style="color: var(--status-present);">Good Standing (Eligible)</span>
              </div>
            </div>
          </div>

          <!-- Personal Information -->
          <div class="profile-section-card">
            <h4 class="profile-section-title">
              ${getIcon('profile')} Personal & Contact Records
            </h4>
            <div class="profile-data-grid">
              <div class="data-row-item">
                <span class="data-row-label">Registered Email</span>
                <span class="data-row-val">${email}</span>
              </div>
              <div class="data-row-item">
                <span class="data-row-label">Mobile Contact</span>
                <span class="data-row-val">${phone}</span>
              </div>
              <div class="data-row-item">
                <span class="data-row-label">Admission Category</span>
                <span class="data-row-val">General / Merit</span>
              </div>
              <div class="data-row-item">
                <span class="data-row-label">Biometric ID Status</span>
                <span class="data-row-val" style="color: var(--status-present);">Hardware Synced (ESP32)</span>
              </div>
            </div>
          </div>

          <!-- Google 1-Click Sign-In Section -->
          <div class="profile-section-card" style="border: 1.5px solid var(--border-color); background: var(--bg-surface);">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <svg viewBox="0 0 48 48" width="22" height="22">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="font-size: 15px; color: var(--text-main);">Google 1-Click Sign-In</strong>
                    <span class="badge ${user.google_linked ? 'badge-present' : 'badge-absent'}" style="font-size: 11px;">
                      ${user.google_linked ? 'Connected' : 'Not Linked'}
                    </span>
                  </div>
                  <p style="font-size: 12.5px; color: var(--text-muted); margin: 2px 0 0 0;">
                    ${user.google_linked ? `Active for ${email}` : 'Connect your Google account to sign in with a single tap'}
                  </p>
                </div>
              </div>
              <button type="button" class="btn ${user.google_linked ? 'btn-secondary' : 'btn-primary'}" onclick="window.location.href='/student/profile/index.html#security'" style="font-size: 12.5px; padding: 6px 14px; border-radius: 8px; font-weight: 600;">
                ${user.google_linked ? 'Manage Google Account' : 'Connect with Google'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export default renderStudentProfile;
