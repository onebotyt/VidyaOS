/**
 * ══════════════════════════════════════════════════════════════
 * STUDENT TIMETABLE (SIMPLE YEAR-BASED PDF SYSTEM)
 * Location: /student/timetable/timetable.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['STUDENT']);

let studentCohort = {
  year: 1,
  department_name: 'Department',
  department_id: null,
  semester: 1,
  academic_year_label: 'Current Academic Session'
};

let allPdfTimetables = [];
let currentYearFilter = 'MY'; // 'MY', 'ALL', 1, 2, 3, 4

const YEAR_NAMES = {
  1: '1st Year',
  2: '2nd Year',
  3: '3rd Year',
  4: '4th Year'
};

document.addEventListener('DOMContentLoaded', initTimetablePage);

async function initTimetablePage() {
  await loadStudentProfile();
  await loadPdfTimetables();
}

async function loadStudentProfile() {
  try {
    const res = await fetchApi('/students/me', { suppressToast: true }).catch(() => null);
    if (res && res.success && res.data) {
      const s = res.data;
      studentCohort.year = Number(s.year) || 1;
      studentCohort.department_name = s.department_name || 'Department';
      studentCohort.department_id = s.department_id || null;
      studentCohort.semester = s.semester || 1;
      studentCohort.academic_year_label = s.academic_year_label || 'Current Academic Session';

      const sub = document.getElementById('tt-cohort-subtitle');
      if (sub) {
        const yName = YEAR_NAMES[studentCohort.year] || `Year ${studentCohort.year}`;
        sub.textContent = `${studentCohort.department_name} • ${yName} (Semester ${studentCohort.semester}) • ${studentCohort.academic_year_label}`;
      }

      const myYearLabel = document.getElementById('label-my-year');
      if (myYearLabel) {
        myYearLabel.textContent = `My Year (${YEAR_NAMES[studentCohort.year] || 'Year ' + studentCohort.year})`;
      }
    }
  } catch (err) {
    console.warn('Could not load student profile for timetable:', err);
  }
}

async function loadPdfTimetables() {
  const mount = document.getElementById('tt-content-mount');
  try {
    const res = await fetchApi('/timetable/pdf');
    if (res && res.success && Array.isArray(res.data)) {
      allPdfTimetables = res.data;
    } else {
      allPdfTimetables = [];
    }
    renderTimetables();
  } catch (err) {
    if (mount) {
      mount.innerHTML = `
        <div class="tt-empty-state">
          <div class="tt-empty-icon" style="color:var(--status-absent, #ef4444);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h3 class="tt-empty-title">Failed to load Timetable</h3>
          <p class="tt-empty-desc">${escapeHtml(err.message || 'Please check your connection and try again.')}</p>
        </div>
      `;
    }
  }
}

function switchYearFilter(yearKey) {
  currentYearFilter = yearKey;

  document.querySelectorAll('.tt-year-pill').forEach(pill => {
    const pYear = pill.getAttribute('data-year');
    pill.classList.toggle('active', String(pYear) === String(yearKey));
  });

  renderTimetables();
}

function renderTimetables() {
  const mount = document.getElementById('tt-content-mount');
  if (!mount) return;

  let targetYear = null;
  if (currentYearFilter === 'MY') {
    targetYear = studentCohort.year;
  } else if (currentYearFilter !== 'ALL') {
    targetYear = Number(currentYearFilter);
  }

  const filtered = targetYear
    ? allPdfTimetables.filter(item => Number(item.year) === targetYear)
    : allPdfTimetables;

  if (filtered.length === 0) {
    const yLabel = targetYear ? (YEAR_NAMES[targetYear] || `Year ${targetYear}`) : 'Department';
    mount.innerHTML = `
      <div class="tt-empty-state">
        <div class="tt-empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
        </div>
        <h3 class="tt-empty-title">No Timetable Uploaded for ${yLabel}</h3>
        <p class="tt-empty-desc">Your department faculty has not uploaded an official PDF timetable for this year yet. Please check back soon or consult your class teacher.</p>
      </div>
    `;
    return;
  }

  // The latest upload for this year becomes featured
  const featured = filtered[0];
  const fileUrl = featured.file_path.startsWith('http') || featured.file_path.startsWith('/') 
    ? featured.file_path 
    : `/${featured.file_path}`;

  const formattedDate = featured.created_at ? new Date(featured.created_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  }) : 'Official Routine';

  const sizeKb = featured.file_size ? `${Math.round(featured.file_size / 1024)} KB` : 'PDF Document';

  let html = `
    <!-- Featured Active Timetable Card & Viewer -->
    <div class="tt-featured-card">
      <div class="tt-featured-header">
        <div>
          <h2 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0;">${escapeHtml(featured.title)}</h2>
          <div class="tt-featured-meta">
            <span class="tt-meta-pill primary">${YEAR_NAMES[featured.year] || 'Year ' + featured.year}</span>
            <span class="tt-meta-pill">Uploaded by: ${escapeHtml(featured.uploader_name || 'Faculty In-Charge')}</span>
            <span class="tt-meta-pill">Updated: ${formattedDate}</span>
            <span class="tt-meta-pill">${sizeKb}</span>
          </div>
        </div>
        <div class="tt-featured-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="openPreviewModal('${escapeHtml(featured.title)}', '${fileUrl}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="M21 3l-7 7"></path><path d="M3 21l7-7"></path>
            </svg>
            <span>Fullscreen</span>
          </button>
          <a href="${fileUrl}" download="${escapeHtml(featured.file_name || 'timetable.pdf')}" class="btn btn-primary btn-sm" target="_blank">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download PDF</span>
          </a>
        </div>
      </div>

      <!-- Embedded PDF Viewer Frame -->
      <div class="tt-viewer-frame-box">
        <iframe src="${fileUrl}#toolbar=1" class="tt-viewer-iframe" title="Timetable PDF Viewer"></iframe>
      </div>
    </div>
  `;

  // If there are other timetables (e.g. past revisions or other years), list them as secondary cards
  if (filtered.length > 1) {
    html += `
      <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin: 2rem 0 1rem;">All Timetable Documents (${filtered.length})</h3>
      <div class="tt-grid">
    `;

    filtered.forEach((item, idx) => {
      const itemUrl = item.file_path.startsWith('http') || item.file_path.startsWith('/') 
        ? item.file_path 
        : `/${item.file_path}`;
      const itemDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : '';
      const itemSize = item.file_size ? `${Math.round(item.file_size / 1024)} KB` : 'PDF';

      html += `
        <div class="tt-card">
          <div class="tt-card-header">
            <div class="tt-card-pdf-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div>
              <h4 class="tt-card-title">${escapeHtml(item.title)}</h4>
              <div class="tt-card-body" style="margin-top:0.35rem;">
                <span><strong>${YEAR_NAMES[item.year] || 'Year ' + item.year}</strong></span>
                <span>Uploaded: ${itemDate} • ${itemSize}</span>
              </div>
            </div>
          </div>
          <div class="tt-card-actions">
            <button type="button" class="btn btn-secondary btn-sm" style="flex:1;" onclick="openPreviewModal('${escapeHtml(item.title)}', '${itemUrl}')">Preview</button>
            <a href="${itemUrl}" download class="btn btn-primary btn-sm" style="flex:1; text-align:center;">Download</a>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  mount.innerHTML = html;
}

function openPreviewModal(title, url) {
  const modal = document.getElementById('tt-preview-modal');
  const titleEl = document.getElementById('tt-modal-title');
  const iframe = document.getElementById('tt-modal-iframe');
  const dBtn = document.getElementById('tt-modal-download-btn');

  if (titleEl) titleEl.textContent = title;
  if (iframe) iframe.src = url;
  if (dBtn) {
    dBtn.href = url;
    dBtn.download = title.replace(/\s+/g, '_') + '.pdf';
  }
  if (modal) modal.classList.add('open');
}

function closePreviewModal() {
  const modal = document.getElementById('tt-preview-modal');
  const iframe = document.getElementById('tt-modal-iframe');
  if (iframe) iframe.src = 'about:blank';
  if (modal) modal.classList.remove('open');
}

window.switchYearFilter = switchYearFilter;
window.openPreviewModal = openPreviewModal;
window.closePreviewModal = closePreviewModal;
