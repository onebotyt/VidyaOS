/**
 * Student Classes View
 */

import { Api } from '../../../core/api.js';
import { Platform } from '../../../core/platform.js';
import { getIcon } from '../../../assets/icons/icons.js';

export async function renderStudentClasses(container) {
  container.innerHTML = `
    <div class="view-container">
      <div class="classes-header-bar">
        <div>
          <h2 style="font-size: 22px; font-weight: 700;">My Classes</h2>
          <p style="font-size: 13.5px; color: var(--text-muted);">Enrolled curriculum courses and lecture schedules</p>
        </div>
        <div style="max-width: 280px; width: 100%;">
          <input type="text" class="form-input" id="class-search-input" placeholder="Search courses or faculty..." />
        </div>
      </div>

      <div class="classes-cards-grid" id="classes-grid">
        <!-- Course 1 -->
        <div class="subject-card">
          <div class="subject-top-row">
            <span class="subject-code-badge">IT-501</span>
            <span class="badge badge-present">88% Present</span>
          </div>
          <div>
            <h3 class="subject-title">Database Management Systems</h3>
            <p class="subject-faculty">${getIcon('profile')} Prof. H.C. Joshi</p>
          </div>
          <div class="subject-meta-grid">
            <div>
              <span class="subject-meta-label">Credits:</span>
              <span class="subject-meta-val"> 4.0</span>
            </div>
            <div>
              <span class="subject-meta-label">Room:</span>
              <span class="subject-meta-val"> Lab 1 / CS-101</span>
            </div>
            <div>
              <span class="subject-meta-label">Schedule:</span>
              <span class="subject-meta-val"> Mon, Wed, Fri</span>
            </div>
            <div>
              <span class="subject-meta-label">Hours:</span>
              <span class="subject-meta-val"> 42 / 48 Attended</span>
            </div>
          </div>
        </div>

        <!-- Course 2 -->
        <div class="subject-card">
          <div class="subject-top-row">
            <span class="subject-code-badge">IT-502</span>
            <span class="badge badge-present">84% Present</span>
          </div>
          <div>
            <h3 class="subject-title">Web Development & Frameworks</h3>
            <p class="subject-faculty">${getIcon('profile')} Dr. A.K. Sharma</p>
          </div>
          <div class="subject-meta-grid">
            <div>
              <span class="subject-meta-label">Credits:</span>
              <span class="subject-meta-val"> 3.0</span>
            </div>
            <div>
              <span class="subject-meta-label">Room:</span>
              <span class="subject-meta-val"> Software Studio 3</span>
            </div>
            <div>
              <span class="subject-meta-label">Schedule:</span>
              <span class="subject-meta-val"> Tue, Thu</span>
            </div>
            <div>
              <span class="subject-meta-label">Hours:</span>
              <span class="subject-meta-val"> 32 / 38 Attended</span>
            </div>
          </div>
        </div>

        <!-- Course 3 -->
        <div class="subject-card">
          <div class="subject-top-row">
            <span class="subject-code-badge">IT-503</span>
            <span class="badge badge-present">80% Present</span>
          </div>
          <div>
            <h3 class="subject-title">Computer Networks & Security</h3>
            <p class="subject-faculty">${getIcon('profile')} Prof. S. Pant</p>
          </div>
          <div class="subject-meta-grid">
            <div>
              <span class="subject-meta-label">Credits:</span>
              <span class="subject-meta-val"> 4.0</span>
            </div>
            <div>
              <span class="subject-meta-label">Room:</span>
              <span class="subject-meta-val"> Network Lab 2</span>
            </div>
            <div>
              <span class="subject-meta-label">Schedule:</span>
              <span class="subject-meta-val"> Mon, Tue, Thu</span>
            </div>
            <div>
              <span class="subject-meta-label">Hours:</span>
              <span class="subject-meta-val"> 36 / 45 Attended</span>
            </div>
          </div>
        </div>

        <!-- Course 4 -->
        <div class="subject-card">
          <div class="subject-top-row">
            <span class="subject-code-badge">IT-504</span>
            <span class="badge badge-late">76% Warning</span>
          </div>
          <div>
            <h3 class="subject-title">Operating Systems & Kernels</h3>
            <p class="subject-faculty">${getIcon('profile')} Dr. R.K. Pandey</p>
          </div>
          <div class="subject-meta-grid">
            <div>
              <span class="subject-meta-label">Credits:</span>
              <span class="subject-meta-val"> 4.0</span>
            </div>
            <div>
              <span class="subject-meta-label">Room:</span>
              <span class="subject-meta-val"> Block B • Rm 202</span>
            </div>
            <div>
              <span class="subject-meta-label">Schedule:</span>
              <span class="subject-meta-val"> Wed, Fri</span>
            </div>
            <div>
              <span class="subject-meta-label">Hours:</span>
              <span class="subject-meta-val"> 29 / 38 Attended</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Search filter
  const searchInput = container.querySelector('#class-search-input');
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const cards = container.querySelectorAll('.subject-card');
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? 'flex' : 'none';
    });
  });
}

export default renderStudentClasses;
