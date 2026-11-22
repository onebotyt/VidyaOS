/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: STUDENT PROFILE, KYC DOSSIER & VERIFIED CREDENTIALS
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

    // 1. Identity & Hero Header
    const fullName = s.full_name || 'Student';
    document.getElementById('hero-name').innerText = fullName;
    document.getElementById('hero-enrollment').innerText = s.ubter_roll_no || s.official_enrollment_no || '--';
    document.getElementById('hero-dept').innerText = `${s.department_name || 'Engineering'} (${s.branch_code || s.department_code || 'DEPT'})`;
    document.getElementById('hero-roll-badge').innerText = `Roll: ${s.class_roll_no || '--'}`;
    if (document.getElementById('hero-reg-badge')) {
      document.getElementById('hero-reg-badge').innerText = `UBTER Reg: ${s.registration_no || '--'}`;
    }
    document.getElementById('hero-term-badge').innerText = `Year ${s.year || 1} • Sem ${s.semester || 1}`;

    // Academic Batch
    const batchStr = s.batch_label || (s.admission_year && s.passing_year ? `${s.admission_year} - ${s.passing_year}` : (s.batch ? `Batch ${s.batch}` : '2024 - 2027'));
    if (document.getElementById('hero-batch-badge')) {
      document.getElementById('hero-batch-badge').innerText = `Batch: ${batchStr}`;
    }
    if (document.getElementById('profile-batch-label')) {
      document.getElementById('profile-batch-label').innerText = batchStr;
    }

    // Avatar Initials
    const nameParts = fullName.trim().split(/\s+/);
    const initials = nameParts.length >= 2 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : fullName.slice(0, 2).toUpperCase();
    document.getElementById('hero-avatar').innerText = initials;

    // Cohort Details
    document.getElementById('profile-enrollment-no').innerText = s.ubter_roll_no || s.official_enrollment_no || '--';
    document.getElementById('profile-roll-no').innerText = s.class_roll_no ? `${s.class_roll_no}` : '--';
    document.getElementById('profile-reg-no').innerText = s.registration_no || '—';
    document.getElementById('profile-department').innerText = s.department_name || s.branch_name || '--';
    document.getElementById('profile-year-sem').innerText = `Year ${s.year} • Semester ${s.semester}`;
    document.getElementById('profile-academic-year').innerText = s.academic_year_label || 'Current Session';
    document.getElementById('profile-class-teacher').innerText = s.class_teacher_name || 'Class Teacher';

    // Account Fields
    document.getElementById('profile-username').value = s.ubter_roll_no || s.official_enrollment_no || s.username || '';
    document.getElementById('profile-email').value = s.email || '';

    // Demographic & KYC Dossier Fields
    if (document.getElementById('profile-father-name')) document.getElementById('profile-father-name').value = s.father_name || '';
    if (document.getElementById('profile-mother-name')) document.getElementById('profile-mother-name').value = s.mother_name || '';
    if (document.getElementById('profile-dob')) document.getElementById('profile-dob').value = s.dob || '';
    if (document.getElementById('profile-gender')) document.getElementById('profile-gender').value = s.gender || '';
    if (document.getElementById('profile-category')) document.getElementById('profile-category').value = s.category || '';
    if (document.getElementById('profile-aadhar')) document.getElementById('profile-aadhar').value = s.aadhar_number || '';
    if (document.getElementById('profile-phone')) document.getElementById('profile-phone').value = s.phone || s.student_phone || '';
    if (document.getElementById('profile-address')) document.getElementById('profile-address').value = s.address || '';

    // Completion Status Badge
    const compBadge = document.getElementById('profile-completion-badge');
    if (compBadge) {
      const isComplete = Boolean(s.profile_completed || (
        s.address && s.aadhar_number && s.father_name && s.mother_name && s.dob && s.gender && s.category
      ));
      if (isComplete) {
        compBadge.className = 'std-badge regular';
        compBadge.innerText = 'Status: Complete & Verified';
      } else {
        compBadge.className = 'std-badge defaulter';
        compBadge.innerText = 'Status: Incomplete Dossier';
      }
    }

    // Google SSO 1-Click Status
    const isGoogleLinked = Boolean(s.google_linked || s.google_sub);
    const googlePill = document.getElementById('student-google-status-pill');
    const googleDesc = document.getElementById('student-google-status-desc');
    const googleBtn = document.getElementById('btn-student-google-action');
    const googleBtnText = document.getElementById('btn-student-google-text');

    if (googlePill && googleDesc && googleBtn) {
      if (isGoogleLinked) {
        googlePill.textContent = 'Connected';
        googlePill.style.background = '#ecfdf5';
        googlePill.style.color = '#047857';
        googlePill.style.border = '1px solid #a7f3d0';
        googleDesc.textContent = `1-Click Sign-In is active for your account (${s.email || 'verified Google account'}). You can log in instantly with one tap without typing passwords.`;
        if (googleBtnText) googleBtnText.textContent = 'Re-link Google Account';
        googleBtn.className = 'btn btn-secondary';
      } else {
        googlePill.textContent = 'Not Linked';
        googlePill.style.background = '#fef3c7';
        googlePill.style.color = '#b45309';
        googlePill.style.border = '1px solid #fde68a';
        googleDesc.textContent = 'Connect your Google account to log in instantly on PC, mobile and web with a single tap.';
        if (googleBtnText) googleBtnText.textContent = 'Connect with Google';
        googleBtn.className = 'btn btn-primary';
      }
    }

    // 2. Student Standing Badge
    const standingBadge = document.getElementById('hero-standing-badge');
    if (standingBadge) {
      standingBadge.className = 'std-badge enrolled';
      standingBadge.innerText = 'Active Student';
    }

    // 3. Biometrics Hardware Status
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

    // 4. Load Verified Documents
    loadStudentDocuments();
  } catch (err) {
    console.error('Failed to load student profile', err);
  }
}

// Account Password Form
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

// Demographics & KYC Form Submission
const demoForm = document.getElementById('demographics-form');
if (demoForm) {
  demoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const feedback = document.getElementById('demographics-feedback');
    if (feedback) feedback.style.display = 'none';

    const father_name = document.getElementById('profile-father-name')?.value.trim();
    const mother_name = document.getElementById('profile-mother-name')?.value.trim();
    const dob = document.getElementById('profile-dob')?.value;
    const gender = document.getElementById('profile-gender')?.value;
    const category = document.getElementById('profile-category')?.value;
    const aadhar_number = document.getElementById('profile-aadhar')?.value.trim();
    const phone = document.getElementById('profile-phone')?.value.trim();
    const address = document.getElementById('profile-address')?.value.trim();
    const saveBtn = document.getElementById('save-demographics-btn');

    if (!father_name || !mother_name || !dob || !gender || !category || !aadhar_number || !address) {
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.background = 'var(--status-absent-bg)';
        feedback.style.color = 'var(--status-absent)';
        feedback.innerText = 'Please complete all required demographic fields marked with *.';
      }
      return;
    }

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = 'Saving Details...';
      }

      const res = await fetchApi('/students/me', {
        method: 'PUT',
        body: JSON.stringify({
          father_name,
          mother_name,
          dob,
          gender,
          category,
          aadhar_number,
          phone: phone || null,
          address
        })
      });

      if (res && res.success) {
        if (typeof showToast === 'function') {
          showToast('Demographic dossier saved successfully!', 'success');
        }
        if (feedback) {
          feedback.style.display = 'block';
          feedback.style.background = 'var(--status-present-bg)';
          feedback.style.color = 'var(--status-present)';
          feedback.innerText = '✓ Demographic details successfully updated and verified.';
        }
        loadStudentProfile();
      } else {
        if (feedback) {
          feedback.style.display = 'block';
          feedback.style.background = 'var(--status-absent-bg)';
          feedback.style.color = 'var(--status-absent)';
          feedback.innerText = res?.error?.message || 'Failed to save demographic details.';
        }
      }
    } catch (err) {
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.background = 'var(--status-absent-bg)';
        feedback.style.color = 'var(--status-absent)';
        feedback.innerText = err.message || 'Network error saving demographic details.';
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Save Demographic Details';
      }
    }
  });
}

// Load Verified Student Documents
async function loadStudentDocuments() {
  const container = document.getElementById('student-docs-container');
  const countBadge = document.getElementById('docs-count-badge');
  if (!container) return;

  try {
    const res = await fetchApi('/students/me/documents', { suppressToast: true });
    const docs = res && res.success && Array.isArray(res.data) ? res.data : [];

    if (countBadge) countBadge.textContent = `${docs.length} Document${docs.length === 1 ? '' : 's'}`;

    if (!docs.length) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
          <div style="margin-bottom: 0.5rem; display: flex; justify-content: center; color: var(--border-color);">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          </div>
          <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">No Verification Documents on File</div>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.82rem;">Official verification documents uploaded by department faculty or the admission cell will be archived and accessible here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: var(--bg-surface-secondary); text-align: left; font-size: 0.76rem; text-transform: uppercase; color: var(--text-muted);">
              <th style="padding: 0.65rem 0.85rem;">Document Title</th>
              <th style="padding: 0.65rem 0.85rem;">Type</th>
              <th style="padding: 0.65rem 0.85rem;">Date Added</th>
              <th style="padding: 0.65rem 0.85rem;">Size</th>
              <th style="padding: 0.65rem 0.85rem; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${docs.map(doc => {
              const dateStr = doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
              const sizeStr = doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : '—';
              return `
                <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.86rem;">
                  <td style="padding: 0.75rem 0.85rem; font-weight: 700; color: var(--text-main);">
                    ${escapeHtml(doc.title || doc.file_name || 'Document')}
                  </td>
                  <td style="padding: 0.75rem 0.85rem;">
                    <span class="badge" style="background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.74rem;">
                      ${escapeHtml(doc.document_type || 'GENERAL')}
                    </span>
                  </td>
                  <td style="padding: 0.75rem 0.85rem; color: var(--text-muted); font-size: 0.82rem;">
                    ${dateStr}
                  </td>
                  <td style="padding: 0.75rem 0.85rem; color: var(--text-muted); font-size: 0.82rem;">
                    ${sizeStr}
                  </td>
                  <td style="padding: 0.75rem 0.85rem; text-align: right;">
                    ${doc.file_path ? `
                      <a href="${escapeHtml(doc.file_path)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.65rem;">
                        View / Download
                      </a>
                    ` : '<span style="color: var(--text-muted); font-size: 0.78rem;">Archived</span>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.warn('Failed to load student documents:', err);
    container.innerHTML = `<div style="color: var(--status-absent); padding: 1rem; font-size: 0.85rem;">Failed to load documents: ${escapeHtml(err.message)}</div>`;
  }
}

// Export Student Academic Dossier (PDF, Excel, Word)
async function exportStudentDossier(format) {
  try {
    if (typeof showToast === 'function') showToast(`Preparing ${format} academic dossier...`, 'info');
    const res = await fetchApi('/students/me/dossier');
    if (!res || !res.success || !res.data) {
      if (typeof showToast === 'function') showToast('Could not fetch academic dossier data', 'error');
      return;
    }
    const { profile, assessments = [], attendance = [] } = res.data;
    const p = profile || {};
    const batch = p.batch_label || `${p.admission_year || 2024} - ${p.passing_year || 2027}`;

    if (format === 'PDF') {
      const printWin = window.open('', '_blank');
      if (!printWin) {
        if (typeof showToast === 'function') showToast('Please allow popups to print academic dossier', 'warning');
        return;
      }
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Academic Dossier — ${escapeHtml(p.full_name || 'Student')} (${escapeHtml(p.ubter_roll_no || p.official_enrollment_no || '')})</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 24px; line-height: 1.45; font-size: 13px; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            h1 { font-size: 20px; margin: 0; color: #0f172a; }
            .meta { font-size: 12px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background: #f8fafc; font-weight: 700; color: #334155; }
            .sec-title { font-size: 14px; font-weight: 800; color: #0f172a; margin: 16px 0 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>OFFICIAL STUDENT ACADEMIC DOSSIER</h1>
              <div class="meta">Department of ${escapeHtml(p.department_name || 'Technical Education')} • Session ${escapeHtml(p.academic_year_label || 'Current')}</div>
            </div>
            <div style="text-align: right;">
              <div><strong>Generated:</strong> ${new Date().toLocaleDateString('en-IN')}</div>
              <div class="meta">Status: <strong>${escapeHtml(p.status || 'ENROLLED')}</strong></div>
            </div>
          </div>

          <div class="sec-title">1. Student Profile &amp; Demographics</div>
          <table>
            <tr>
              <th width="20%">Full Name</th><td width="30%"><strong>${escapeHtml(p.full_name || '—')}</strong></td>
              <th width="20%">UBTER Roll No</th><td width="30%"><strong>${escapeHtml(p.ubter_roll_no || p.official_enrollment_no || '—')}</strong></td>
            </tr>
            <tr>
              <th>Class Roll No</th><td>${escapeHtml(p.class_roll_no ? String(p.class_roll_no) : '—')}</td>
              <th>UBTER Reg No</th><td>${escapeHtml(p.registration_no || '—')}</td>
            </tr>
            <tr>
              <th>Department</th><td>${escapeHtml(p.department_name || '—')} (${escapeHtml(p.department_code || '')})</td>
              <th>Academic Batch</th><td><strong>${escapeHtml(batch)}</strong></td>
            </tr>
            <tr>
              <th>Father's Name</th><td>${escapeHtml(p.father_name || '—')}</td>
              <th>Mother's Name</th><td>${escapeHtml(p.mother_name || '—')}</td>
            </tr>
            <tr>
              <th>Date of Birth</th><td>${escapeHtml(p.dob || '—')}</td>
              <th>Gender / Category</th><td>${escapeHtml(p.gender || '—')} / ${escapeHtml(p.category || '—')}</td>
            </tr>
            <tr>
              <th>Residential Address</th><td colspan="3">${escapeHtml(p.address || '—')}</td>
            </tr>
          </table>

          <div class="sec-title">2. Attendance Records Summary</div>
          <table>
            <thead>
              <tr>
                <th>Semester</th><th>Subject Name</th><th>Subject Code</th><th>Attended</th><th>Total</th><th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${attendance.length ? attendance.map(a => {
                const pct = a.total_sessions ? Math.round((Number(a.attended_sessions) / Number(a.total_sessions)) * 100) : 0;
                return `<tr>
                  <td>Sem ${a.semester || '—'}</td>
                  <td>${escapeHtml(a.subject_name || '—')}</td>
                  <td>${escapeHtml(a.subject_code || '—')}</td>
                  <td>${a.attended_sessions || 0}</td>
                  <td>${a.total_sessions || 0}</td>
                  <td><strong>${pct}%</strong></td>
                </tr>`;
              }).join('') : '<tr><td colspan="6" style="text-align:center;color:#64748b;">No attendance matrix records found.</td></tr>'}
            </tbody>
          </table>

          <div class="sec-title">3. Continuous Assessment &amp; Examination Records</div>
          <table>
            <thead>
              <tr>
                <th>Sem</th><th>Assessment</th><th>Type</th><th>Subject</th><th>Score Obtained</th><th>Max Marks</th><th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${assessments.length ? assessments.map(a => {
                const pct = a.max_marks ? Math.round((Number(a.marks_obtained) / Number(a.max_marks)) * 100) : 0;
                return `<tr>
                  <td>Sem ${a.semester || '—'}</td>
                  <td><strong>${escapeHtml(a.title || '—')}</strong></td>
                  <td>${escapeHtml(a.type || 'EXAM')}</td>
                  <td>${escapeHtml(a.subject_name || '—')} (${escapeHtml(a.subject_code || '')})</td>
                  <td>${a.marks_obtained !== null ? a.marks_obtained : '—'}</td>
                  <td>${a.max_marks || '—'}</td>
                  <td><strong>${pct}%</strong></td>
                </tr>`;
              }).join('') : '<tr><td colspan="7" style="text-align:center;color:#64748b;">No assessment submissions found.</td></tr>'}
            </tbody>
          </table>

          <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
            <div>Institutional Digital Record • Verified by VidyaOS Academic Engine</div>
            <div>Authorized Institutional Seal / Signature</div>
          </div>
        </body>
        </html>
      `);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => { printWin.print(); }, 400);
    } else if (format === 'EXCEL') {
      let csv = '\uFEFF';
      csv += `OFFICIAL STUDENT ACADEMIC DOSSIER\n`;
      csv += `Student Name,${p.full_name || ''}\n`;
      csv += `UBTER Roll No,${p.ubter_roll_no || p.official_enrollment_no || ''}\n`;
      csv += `Class Roll No,${p.class_roll_no || ''}\n`;
      csv += `UBTER Reg No,${p.registration_no || ''}\n`;
      csv += `Department,${p.department_name || ''}\n`;
      csv += `Academic Batch,${batch}\n`;
      csv += `Father Name,${p.father_name || ''}\n`;
      csv += `Mother Name,${p.mother_name || ''}\n`;
      csv += `DOB,${p.dob || ''}\n`;
      csv += `Gender,${p.gender || ''}\n`;
      csv += `Category,${p.category || ''}\n`;
      csv += `Address,"${(p.address || '').replace(/"/g, '""')}"\n\n`;

      csv += `ATTENDANCE SUMMARY\n`;
      csv += `Semester,Subject,Code,Attended,Total,Percentage\n`;
      attendance.forEach(a => {
        const pct = a.total_sessions ? Math.round((Number(a.attended_sessions) / Number(a.total_sessions)) * 100) : 0;
        csv += `Sem ${a.semester || ''},"${(a.subject_name || '').replace(/"/g, '""')}",${a.subject_code || ''},${a.attended_sessions || 0},${a.total_sessions || 0},${pct}%\n`;
      });

      csv += `\nASSESSMENTS & EXAMINATION MARKS\n`;
      csv += `Semester,Assessment,Type,Subject,Code,Marks Obtained,Max Marks,Percentage\n`;
      assessments.forEach(a => {
        const pct = a.max_marks ? Math.round((Number(a.marks_obtained) / Number(a.max_marks)) * 100) : 0;
        csv += `Sem ${a.semester || ''},"${(a.title || '').replace(/"/g, '""')}",${a.type || 'EXAM'},"${(a.subject_name || '').replace(/"/g, '""')}",${a.subject_code || ''},${a.marks_obtained !== null ? a.marks_obtained : ''},${a.max_marks || ''},${pct}%\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Academic_Dossier_${p.ubter_roll_no || p.official_enrollment_no || 'Student'}_${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      if (typeof showToast === 'function') showToast('Excel/CSV dossier exported successfully', 'success');
    } else if (format === 'DOC') {
      const docHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>Academic Dossier</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; }
          h1 { color: #0f172a; font-size: 16pt; }
          table { width: 100%; border-collapse: collapse; margin-top: 10pt; }
          th, td { border: 1pt solid #cbd5e1; padding: 6pt; }
          th { background-color: #f1f5f9; font-weight: bold; }
        </style>
        </head>
        <body>
          <h1>Official Student Academic Dossier</h1>
          <p><strong>Department:</strong> ${escapeHtml(p.department_name || '')} | <strong>Batch:</strong> ${escapeHtml(batch)}</p>
          <hr/>
          <h3>1. Demographics</h3>
          <table>
            <tr><td><strong>Name</strong></td><td>${escapeHtml(p.full_name || '')}</td><td><strong>UBTER Roll No</strong></td><td>${escapeHtml(p.ubter_roll_no || p.official_enrollment_no || '')}</td></tr>
            <tr><td><strong>Roll No</strong></td><td>${escapeHtml(p.class_roll_no ? String(p.class_roll_no) : '')}</td><td><strong>UBTER Reg</strong></td><td>${escapeHtml(p.registration_no || '')}</td></tr>
            <tr><td><strong>Father's Name</strong></td><td>${escapeHtml(p.father_name || '')}</td><td><strong>Mother's Name</strong></td><td>${escapeHtml(p.mother_name || '')}</td></tr>
            <tr><td><strong>DOB / Gender</strong></td><td>${escapeHtml(p.dob || '')} (${escapeHtml(p.gender || '')})</td><td><strong>Category</strong></td><td>${escapeHtml(p.category || '')}</td></tr>
            <tr><td><strong>Address</strong></td><td colspan="3">${escapeHtml(p.address || '')}</td></tr>
          </table>

          <h3>2. Assessment &amp; Marks Ledger</h3>
          <table>
            <tr style="background:#f1f5f9;"><th>Sem</th><th>Assessment</th><th>Type</th><th>Subject</th><th>Marks</th><th>Max</th></tr>
            ${assessments.map(a => `
              <tr>
                <td>Sem ${a.semester || ''}</td>
                <td>${escapeHtml(a.title || '')}</td>
                <td>${escapeHtml(a.type || '')}</td>
                <td>${escapeHtml(a.subject_name || '')}</td>
                <td>${a.marks_obtained !== null ? a.marks_obtained : ''}</td>
                <td>${a.max_marks || ''}</td>
              </tr>
            `).join('')}
          </table>
        </body>
        </html>
      `;
      const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Academic_Dossier_${p.ubter_roll_no || p.official_enrollment_no || 'Student'}_${Date.now()}.doc`;
      link.click();
      URL.revokeObjectURL(link.href);
      if (typeof showToast === 'function') showToast('Word (.doc) dossier exported successfully', 'success');
    }
  } catch (err) {
    console.error('Failed to export dossier:', err);
    if (typeof showToast === 'function') showToast('Failed to export dossier: ' + err.message, 'error');
  }
}

var escapeHtml = window.escapeHtml || (typeof esc !== 'undefined' ? esc : (s => s ? String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]) : ''));
window.loadStudentDocuments = loadStudentDocuments;
window.exportStudentDossier = exportStudentDossier;

// ══════════════════════════════════════════════════════════════
// SEGMENTED TAB SWITCHER FOR MOBILE & DESKTOP
// ══════════════════════════════════════════════════════════════
function switchProfileTab(tabKey) {
  const validTabs = ['academic', 'kyc', 'documents', 'security', 'all'];
  const target = validTabs.includes(tabKey) ? tabKey : 'academic';
  const workspace = document.getElementById('profile-workspace');

  if (target === 'all') {
    if (workspace) workspace.classList.add('show-all');
  } else {
    if (workspace) workspace.classList.remove('show-all');
  }

  // Toggle Tab Buttons
  validTabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    if (btn) {
      if (t === target) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    }
  });

  // Toggle Tab Panels
  ['academic', 'kyc', 'documents', 'security'].forEach(t => {
    const p = document.getElementById(`tab-panel-${t}`);
    if (p) {
      if (target === 'all' || t === target) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    }
  });

  // Update URL hash without jumping
  if (history.replaceState) {
    history.replaceState(null, '', `#${target}`);
  }
}
window.switchProfileTab = switchProfileTab;

/* ── Student Google 1-Click Linking ── */
async function handleStudentGoogleLink() {
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;

  // 1. Android Native App: Launch native Google Account Chooser bottom-sheet
  if (window.NativeAuthBridge && typeof window.NativeAuthBridge.launchGoogleSignIn === 'function') {
    try {
      window.NativeAuthBridge.launchGoogleSignIn();
      return;
    } catch (e) {
      console.warn('NativeAuthBridge.launchGoogleSignIn failed, using web flow:', e);
    }
  }

  // 2. Web browser flow (OAuth URL)
  try {
    const origin = (window.location.origin && !window.location.origin.startsWith('file:') && !window.location.origin.startsWith('capacitor:'))
      ? window.location.origin
      : 'https://vidyaos-pink.vercel.app';

    const res = await fetchApi('/auth/google/url?mode=LINK&user_id=' + (user?.id || '') + '&origin=' + encodeURIComponent(origin)).catch(() => null);
    if (res && res.success && res.data?.url) {
      window.location.href = res.data.url;
      return;
    }
  } catch (_) {}

  // 3. Fallback account picker modal
  openStudentGoogleModal();
}

function openStudentGoogleModal() {
  const modal = document.getElementById('student-google-modal');
  if (!modal) return;

  const emailInp = document.getElementById('profile-email');
  const nameEl = document.getElementById('hero-name');
  const currentEmail = (emailInp ? emailInp.value.trim() : '') || 'student@gmail.com';
  const currentName = (nameEl ? nameEl.textContent.trim() : '') || 'Student';
  const initial = (currentEmail.charAt(0) || 'S').toUpperCase();

  const listEl = document.getElementById('student-google-account-list');
  if (listEl) {
    const escEmail = currentEmail.replace(/'/g, "\\'");
    listEl.innerHTML = `
      <li onclick="linkStudentGoogleAccount('${escEmail}')" style="display:flex; align-items:center; gap:12px; padding:10px 12px; border:1px solid #e2e8f0; border-radius:10px; cursor:pointer; background:#f8fafc; transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">
        <div style="width:36px; height:36px; border-radius:50%; background:#e0f2fe; color:#0369a1; font-weight:700; display:flex; align-items:center; justify-content:center; font-size:0.9rem; flex-shrink:0;">${initial}</div>
        <div style="min-width:0; flex:1;">
          <div style="font-weight:600; font-size:0.86rem; color:#0f172a;">${currentName}</div>
          <div style="font-size:0.78rem; color:#64748b;">${currentEmail}</div>
        </div>
        <span style="font-size:0.7rem; font-weight:700; background:#ecfdf5; color:#047857; padding:2px 8px; border-radius:10px; border:1px solid #a7f3d0; white-space:nowrap;">Link Account</span>
      </li>
    `;
  }

  modal.style.display = 'flex';
}

function closeStudentGoogleModal() {
  const modal = document.getElementById('student-google-modal');
  if (modal) modal.style.display = 'none';
}

async function linkStudentGoogleAccount(email) {
  try {
    const res = await fetchApi('/auth/google/link', {
      method: 'POST',
      body: JSON.stringify({ id_token: `google_${email.toLowerCase()}` })
    });
    if (res && res.success) {
      closeStudentGoogleModal();
      if (typeof showToast === 'function') {
        showToast('Google account linked! You can now use 1-click Google login.', 'success');
      } else {
        alert('Google account linked! You can now use 1-click Google login.');
      }
      localStorage.removeItem('vidya_notify_google_connect');
      localStorage.removeItem('vidya_google_unlinked');
      loadStudentProfile();
    } else {
      throw new Error(res?.error?.message || 'Failed to link Google account');
    }
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast(err.message, 'error');
    } else {
      alert(err.message);
    }
  }
}

// Hash and query parameter resolution
function handleInitialTab() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  const urlParams = new URLSearchParams(window.location.search);

  if (hash === 'security' || hash === 'password') {
    switchProfileTab('security');
  } else if (hash === 'kyc' || hash === 'demographics' || urlParams.get('complete') === '1' || urlParams.get('complete') === 'true') {
    switchProfileTab('kyc');
  } else if (hash === 'documents' || hash === 'docs' || hash === 'dossier') {
    switchProfileTab('documents');
  } else {
    switchProfileTab('academic');
  }
}

window.addEventListener('hashchange', handleInitialTab);
document.addEventListener('DOMContentLoaded', handleInitialTab);

// Check URL parameters for ?complete=1
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('complete') === '1' || urlParams.get('complete') === 'true') {
  setTimeout(() => {
    switchProfileTab('kyc');
    const demoCard = document.getElementById('demographics-card');
    if (demoCard) {
      demoCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      demoCard.style.outline = '2px solid var(--color-primary)';
      setTimeout(() => { demoCard.style.outline = 'none'; }, 2500);
    }
  }, 400);
}

loadStudentProfile();
handleInitialTab();
