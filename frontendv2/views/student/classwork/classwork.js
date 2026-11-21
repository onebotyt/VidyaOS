/**
 * Student Classwork View
 */

import { Dialog } from '../../../components/dialog/dialog.js';
import { showToast } from '../../../components/toast/toast.js';
import { Platform } from '../../../core/platform.js';
import { getIcon } from '../../../assets/icons/icons.js';

export async function renderStudentClasswork(container) {
  const assignments = [
    {
      id: 1,
      title: 'ER Diagram & Relational Schema Design',
      subject: 'Database Management Systems (IT-501)',
      dueDate: 'Tomorrow, 11:59 PM',
      status: 'pending',
      statusLabel: 'Due Soon',
      points: '20 pts'
    },
    {
      id: 2,
      title: 'Responsive Dashboard with CSS Grid & Flexbox',
      subject: 'Web Development & Frameworks (IT-502)',
      dueDate: 'Nov 25, 2026',
      status: 'pending',
      statusLabel: 'Pending',
      points: '25 pts'
    },
    {
      id: 3,
      title: 'Socket Programming TCP Client-Server in C',
      subject: 'Computer Networks & Security (IT-503)',
      dueDate: 'Nov 18, 2026',
      status: 'submitted',
      statusLabel: 'Submitted',
      points: '15 pts'
    },
    {
      id: 4,
      title: 'Round Robin CPU Scheduling Simulation',
      subject: 'Operating Systems & Kernels (IT-504)',
      dueDate: 'Nov 12, 2026',
      status: 'graded',
      statusLabel: 'Graded (19/20)',
      points: '20 pts'
    }
  ];

  container.innerHTML = `
    <div class="view-container">
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 22px; font-weight: 700;">Classwork & Assignments</h2>
        <p style="font-size: 13.5px; color: var(--text-muted);">Track lab exercises, term projects, and submission deadlines</p>
      </div>

      <div class="classwork-filters">
        <button class="classwork-filter-chip active" data-filter="all">All Items</button>
        <button class="classwork-filter-chip" data-filter="pending">Pending</button>
        <button class="classwork-filter-chip" data-filter="submitted">Submitted</button>
        <button class="classwork-filter-chip" data-filter="graded">Graded</button>
      </div>

      <div class="classwork-items-list" id="classwork-list">
        ${assignments.map(item => `
          <div class="classwork-item-card" data-status="${item.status}">
            <div class="classwork-left">
              <div class="classwork-icon-badge">
                ${getIcon('classwork')}
              </div>
              <div class="classwork-info">
                <span class="classwork-title">${item.title}</span>
                <div class="classwork-details">
                  <span>${item.subject}</span>
                  <span>• Due: ${item.dueDate}</span>
                  <span>• ${item.points}</span>
                </div>
              </div>
            </div>
            <div>
              ${item.status === 'pending'
                ? `<button class="btn btn-primary btn-sm submit-assignment-btn" data-id="${item.id}" data-title="${item.title}">Submit Work</button>`
                : item.status === 'submitted'
                ? `<span class="badge badge-info">${item.statusLabel}</span>`
                : `<span class="badge badge-present">${item.statusLabel}</span>`
              }
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Filter chips
  const chips = container.querySelectorAll('.classwork-filter-chip');
  const cards = container.querySelectorAll('.classwork-item-card');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      Platform.hapticFeedback('light');
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const filter = chip.dataset.filter;
      cards.forEach(card => {
        if (filter === 'all' || card.dataset.status === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Submit modal via Dynamic Dialog
  container.querySelectorAll('.submit-assignment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.dataset.title;
      Dialog.form({
        title: `Submit: ${title}`,
        fields: [
          { name: 'github_link', label: 'GitHub / Drive Submission URL', type: 'text', placeholder: 'https://github.com/...', required: true },
          { name: 'notes', label: 'Submission Remarks / Notes', type: 'textarea', placeholder: 'Optional notes for instructor...' }
        ],
        submitText: 'Turn In Assignment',
        onSubmit: async (values) => {
          showToast(`Successfully submitted "${title}"!`, 'success');
          btn.parentElement.innerHTML = `<span class="badge badge-info">Submitted</span>`;
        }
      });
    });
  });
}

export default renderStudentClasswork;
