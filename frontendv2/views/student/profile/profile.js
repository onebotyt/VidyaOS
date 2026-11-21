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
        </div>
      </div>
    </div>
  `;
}

export default renderStudentProfile;
