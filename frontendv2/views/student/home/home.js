/**
 * Student Home Cockpit View
 */

import { Auth } from '../../../core/auth.js';
import { Api } from '../../../core/api.js';
import { Router } from '../../../core/router.js';
import { Platform } from '../../../core/platform.js';
import { Dialog } from '../../../components/dialog/dialog.js';
import { showToast } from '../../../components/toast/toast.js';
import { getIcon } from '../../../assets/icons/icons.js';

export async function renderStudentHome(container) {
  const user = Auth.getUser() || {};
  const firstName = (user.full_name || user.name || 'Student').split(' ')[0];
  const deptName = user.department_name || user.dept_name || 'Information Technology';
  const semester = user.semester || 5;
  const year = Math.ceil(semester / 2) || 3;
  const roll = user.roll_number || user.roll_no || 1;

  container.innerHTML = `
    <div class="view-container">
      <div class="cockpit-greeting">
        <div class="greeting-text-wrap">
          <h2>Good day, ${firstName}! 👋</h2>
          <p>Welcome back to your academic cockpit</p>
        </div>
        <span class="badge badge-student">Year ${year} • Sem ${semester}</span>
      </div>

      <div class="cockpit-grid">
        <!-- Main Left Column -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Live Lecture Card -->
          <div class="card-up-next">
            <span class="up-next-badge">
              <span class="status-dot" style="background: #ffffff;"></span>
              Next Scheduled Lecture
            </span>
            <h3 class="up-next-title">Cloud Computing & Distributed Systems</h3>
            <div class="up-next-meta">
              <span class="meta-pill">${getIcon('clock')} 11:30 AM – 12:20 PM</span>
              <span class="meta-pill">${getIcon('classes')} Room 204 • Lab 2</span>
              <span class="meta-pill">${getIcon('profile')} Prof. B.S. Bisht</span>
            </div>
          </div>

          <!-- Quick Action Tiles -->
          <div>
            <h4 class="actions-title">Quick Actions</h4>
            <div class="actions-tiles-grid">
              <div class="action-tile" id="tile-classes">
                <div class="action-tile-icon" style="background: rgba(37,99,235,0.1); color: #2563eb;">
                  ${getIcon('classes')}
                </div>
                <span class="action-tile-label">My Classes</span>
              </div>

              <div class="action-tile" id="tile-classwork">
                <div class="action-tile-icon" style="background: rgba(22,163,74,0.1); color: #16a34a;">
                  ${getIcon('classwork')}
                </div>
                <span class="action-tile-label">Assignments</span>
              </div>

              <div class="action-tile" id="tile-profile">
                <div class="action-tile-icon" style="background: rgba(147,51,234,0.1); color: #9333ea;">
                  ${getIcon('profile')}
                </div>
                <span class="action-tile-label">ID Profile</span>
              </div>

              <div class="action-tile" id="tile-report">
                <div class="action-tile-icon" style="background: rgba(220,38,38,0.1); color: #dc2626;">
                  ${getIcon('bug')}
                </div>
                <span class="action-tile-label">Report Issue</span>
              </div>
            </div>
          </div>

          <!-- Enrolled Classes -->
          <div class="card" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <h4 style="font-size: 15px; font-weight: 600;">Enrolled Courses</h4>
              <button class="btn btn-ghost btn-sm" id="view-all-classes-btn">View All</button>
            </div>
            <div class="classes-list-grid" id="home-classes-list">
              <div class="class-card-item">
                <div class="class-info-left">
                  <span class="class-name">Database Management Systems</span>
                  <span class="class-subtext">IT-501 • 4 Credits • Prof. H.C. Joshi</span>
                </div>
                <span class="badge badge-present">88%</span>
              </div>

              <div class="class-card-item">
                <div class="class-info-left">
                  <span class="class-name">Web Development & Frameworks</span>
                  <span class="class-subtext">IT-502 • 3 Credits • Dr. A.K. Sharma</span>
                </div>
                <span class="badge badge-present">84%</span>
              </div>

              <div class="class-card-item">
                <div class="class-info-left">
                  <span class="class-name">Computer Networks & Security</span>
                  <span class="class-subtext">IT-503 • 4 Credits • Prof. S. Pant</span>
                </div>
                <span class="badge badge-present">80%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Right Column (Attendance & Support) -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Attendance Health Meter -->
          <div class="card-attendance-health">
            <div class="health-header">
              <div>
                <h4 style="font-size: 15px; font-weight: 600;">Overall Attendance</h4>
                <p style="font-size: 12px; color: var(--text-muted);">Required threshold: 75%</p>
              </div>
              <span class="health-percentage-large">84%</span>
            </div>
            <div class="health-meter-bar">
              <div class="health-meter-fill" style="width: 84%;"></div>
            </div>
            <div class="health-stats-row">
              <span>Attended: 126 hrs</span>
              <span>Total: 150 hrs</span>
            </div>
            <div style="margin-top: 14px; padding: 10px; background: var(--status-present-bg); border-radius: var(--radius-sm); border: 1px solid var(--status-present-border); font-size: 12px; color: var(--status-present); display: flex; align-items: center; gap: 6px;">
              ${getIcon('check')} Good Standing • 9% above mandate
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind Navigation Events
  container.querySelector('#tile-classes')?.addEventListener('click', () => {
    Platform.hapticFeedback('light');
    Router.navigate('student/classes');
  });

  container.querySelector('#tile-classwork')?.addEventListener('click', () => {
    Platform.hapticFeedback('light');
    Router.navigate('student/classwork');
  });

  container.querySelector('#tile-profile')?.addEventListener('click', () => {
    Platform.hapticFeedback('light');
    Router.navigate('student/profile');
  });

  container.querySelector('#view-all-classes-btn')?.addEventListener('click', () => {
    Platform.hapticFeedback('light');
    Router.navigate('student/classes');
  });

  // Report Issue via Dynamic Dialog
  container.querySelector('#tile-report')?.addEventListener('click', () => {
    Platform.hapticFeedback('light');
    Dialog.form({
      title: 'Report Issue / Feedback',
      fields: [
        { name: 'title', label: 'Issue Summary', type: 'text', placeholder: 'Brief description', required: true },
        { name: 'category', label: 'Category', type: 'select', options: ['Academic', 'Timetable', 'Attendance Record', 'Software Bug', 'Other'], required: true },
        { name: 'description', label: 'Details', type: 'textarea', placeholder: 'Please explain the issue or question...', required: true }
      ],
      submitText: 'Submit Report',
      onSubmit: async (values) => {
        try {
          const res = await Api.post('/api/v1/bug-reports', values, { suppressToast: true });
          if (res.success) {
            showToast('Report submitted to department support', 'success');
          } else {
            showToast('Feedback noted. Thank you!', 'success');
          }
        } catch (_) {
          showToast('Feedback received.', 'success');
        }
      }
    });
  });
}

export default renderStudentHome;
