/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: ASSIGNMENTS
 * frontend/student/assignments/assignments.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['STUDENT']);

    window._stagedDocs = window._stagedDocs || {};
    window._cachedAssignments = [];

    function openModal(id) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'flex';
    }

    function closeModal(id) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    async function authedFetch(url, options = {}) {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
      const res = await fetch(`/api/v1${url}`, { ...options, headers });
      return res.json();
    }

    async function loadAssignments() {
      const res = await fetchApi('/assignments');
      const list = document.getElementById('assignment-list');
      if (!res.success || !res.data.length) {
        list.innerHTML = `<div class="card" style="text-align:center; padding:2rem; color:var(--text-muted);">No assignments yet.</div>`;
        return;
      }
      window._cachedAssignments = res.data;

      list.innerHTML = res.data.map(a => {
        const status = a.my_status || 'NOT_SUBMITTED';
        const isSubmitted = (status === 'SUBMITTED' || status === 'LATE' || status === 'GRADED');
        const isFinalDocs = (a.type === 'FINAL_DOCS');

        if (isFinalDocs) {
          let reqs = [];
          if (Array.isArray(a.questions) && a.questions.length > 0) reqs = a.questions;
          else if (typeof a.questions === 'string') {
            try { reqs = JSON.parse(a.questions); } catch(_) { reqs = []; }
          }
          if (!reqs.length) reqs = ['Total Assignments PDF Records (Consolidated)', 'Class Test Records & Solutions', 'Practical / Lab Journal Records', 'Viva Voce Documentation'];

          let submittedDocs = null;
          if (a.my_file_path && a.my_file_path.startsWith('[')) {
            try { submittedDocs = JSON.parse(a.my_file_path); } catch(_) { submittedDocs = null; }
          }

          const staged = window._stagedDocs[a.id] || {};
          const stagedKeys = Object.keys(staged);
          const uploadedCount = isSubmitted ? reqs.length : stagedKeys.length;
          const allUploaded = reqs.every(r => Boolean(staged[r]));

          return `
            <div class="assignment-card" style="border:1px solid var(--border-color); border-radius:var(--radius-lg); background:var(--bg-card); padding:1.2rem; margin-bottom:1rem;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem;">
                <div>
                  <div class="assignment-title" style="display:flex; align-items:center; gap:0.4rem;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--color-primary);"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    <span>${escapeHtml(a.title)}</span>
                  </div>
                  <div class="assignment-meta">${escapeHtml(a.subject_name || '')} · ${escapeHtml(a.teacher_name || '')} ${a.due_date ? '· Due ' + new Date(a.due_date).toLocaleDateString('en-IN') : '· No Final Deadline'}</div>
                </div>
                <span class="status-tag ${status}">${status.replace('_',' ')}</span>
              </div>
              ${a.description ? `<div class="assignment-desc" style="white-space:pre-wrap; margin-top:0.5rem;">${escapeHtml(a.description)}</div>` : ''}

              <!-- Document Requirements Checklist -->
              <div style="margin-top:0.85rem; padding:0.75rem; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md);">
                <div style="font-size:0.82rem; font-weight:700; color:var(--text-main); margin-bottom:0.6rem; display:flex; justify-content:space-between; align-items:center;">
                  <span style="display:flex; align-items:center; gap:0.35rem;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Required Document Checklist
                  </span>
                  <span style="font-size:0.75rem; color:var(--text-muted);">${uploadedCount} of ${reqs.length} ready</span>
                </div>

                <div style="display:flex; flex-direction:column; gap:0.45rem;">
                  ${reqs.map(req => {
                    const up = staged[req];
                    const subDoc = submittedDocs ? submittedDocs.find(d => d.requirement_name === req) : null;

                    if (subDoc) {
                      return `
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; padding:0.45rem 0.65rem; background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-sm);">
                          <span style="font-size:0.82rem; font-weight:600; color:var(--status-present);"><span style="display:inline-flex;align-items:center;margin-right:3px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>${escapeHtml(req)}</span>
                          <a href="${escapeHtml(subDoc.file_path)}" target="_blank" class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding:0.2rem 0.55rem; text-decoration:none;">View Submitted</a>
                        </div>
                      `;
                    }

                    if (up) {
                      return `
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; padding:0.45rem 0.65rem; background:var(--status-present-bg); border:1px solid var(--status-present); border-radius:var(--radius-sm);">
                          <div style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            <span style="font-weight:700; color:var(--status-present); font-size:0.82rem;"><span style="display:inline-flex;align-items:center;margin-right:3px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>${escapeHtml(req)}:</span>
                            <span style="font-size:0.8rem; color:var(--text-main); margin-left:0.25rem;">${escapeHtml(up.original_filename)}</span>
                          </div>
                          <button type="button" class="btn btn-secondary btn-sm" onclick="openStudentItemUploadModal(${a.id}, '${escapeHtml(req)}')" style="font-size:0.75rem; padding:0.2rem 0.55rem; white-space:nowrap;">Replace</button>
                        </div>
                      `;
                    }

                    return `
                      <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; padding:0.45rem 0.65rem; background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-sm);">
                        <span style="font-size:0.82rem; font-weight:500; color:var(--text-main);">• ${escapeHtml(req)}</span>
                        <button type="button" class="btn btn-primary btn-sm" onclick="openStudentItemUploadModal(${a.id}, '${escapeHtml(req)}')" style="font-size:0.75rem; padding:0.2rem 0.55rem; white-space:nowrap;">Upload</button>
                      </div>
                    `;
                  }).join('')}
                </div>

                <!-- Big Main Upload Button -->
                ${!isSubmitted ? `
                  <button type="button" class="btn btn-secondary" onclick="openStudentBigUploadModal(${a.id})" style="width:100%; margin-top:0.75rem; padding:0.65rem; font-weight:700; display:flex; align-items:center; justify-content:center; gap:0.45rem; background:var(--bg-card); border:1px dashed var(--color-primary); color:var(--color-primary); border-radius:var(--radius-md); cursor:pointer;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    <span>Upload Required Document (Select from Checklist)</span>
                  </button>
                ` : ''}

                <!-- Submit All Documents Button -->
                ${!isSubmitted ? (
                  allUploaded ? `
                    <button type="button" class="btn btn-primary" onclick="submitFinalDocsBundle(${a.id})" style="width:100%; margin-top:0.65rem; padding:0.65rem 1rem; font-weight:800; background:var(--status-present); border:none; border-radius:var(--radius-md); cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.4rem;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      Submit All (${uploadedCount}/${reqs.length}) Documents for Final Evaluation
                    </button>
                  ` : `
                    <button type="button" class="btn btn-secondary" disabled style="opacity:0.65; cursor:not-allowed; width:100%; margin-top:0.65rem; padding:0.65rem 1rem;">
                      Submit All Documents (${uploadedCount}/${reqs.length} Uploaded — Upload all items to unlock submit)
                    </button>
                  `
                ) : `
                  <div style="margin-top:0.65rem; display:flex; justify-content:flex-end;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="openStudentBigUploadModal(${a.id})">Re-upload Bundle</button>
                  </div>
                `}
              </div>
            </div>
          `;
        }

        return `
          <div class="assignment-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem;">
              <div>
                <div class="assignment-title">${escapeHtml(a.title)}</div>
                <div class="assignment-meta">${escapeHtml(a.subject_name || '')} · ${escapeHtml(a.teacher_name || '')} ${a.due_date ? '· Due ' + new Date(a.due_date).toLocaleDateString('en-IN') : ''}</div>
              </div>
              <span class="status-tag ${status}">${status.replace('_',' ')}</span>
            </div>
            ${a.description ? `<div class="assignment-desc">${escapeHtml(a.description)}</div>` : ''}
            ${a.attachment_path ? `<div style="margin-top:0.5rem;"><a class="file-link" href="${escapeHtml(a.attachment_path)}" target="_blank" style="display:inline-flex; align-items:center; gap:0.3rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> Download question file</a></div>` : ''}
            <div class="upload-row">
              <input type="file" id="file-${a.id}">
              <button class="btn btn-primary btn-sm" onclick="submitAssignment(${a.id})">${a.my_file_path ? 'Replace My Upload' : 'Upload My Work'}</button>
              ${a.my_file_path ? `<a class="file-link" href="${escapeHtml(a.my_file_path)}" target="_blank">View my current upload</a>` : ''}
            </div>
            ${a.my_status === 'GRADED' ? `
              <div class="feedback-box">
                <strong>Marks: ${a.my_marks ?? '—'} / ${a.max_marks || '--'}</strong>
                ${a.my_feedback ? `<div style="margin-top:0.3rem;">${escapeHtml(a.my_feedback)}</div>` : ''}
              </div>` : ''}
          </div>
        `;
      }).join('');
    }

    function openStudentItemUploadModal(assignmentId, preselectedReq) {
      const a = (window._cachedAssignments || []).find(item => item.id === assignmentId);
      if (!a) return;
      document.getElementById('student-req-upload-asgn-id').value = assignmentId;
      document.getElementById('student-req-modal-title').innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
        <span>Upload Document: ${escapeHtml(a.title)}</span>
      `;

      let reqs = [];
      if (Array.isArray(a.questions) && a.questions.length > 0) reqs = a.questions;
      else if (typeof a.questions === 'string') {
        try { reqs = JSON.parse(a.questions); } catch(_) { reqs = []; }
      }
      if (!reqs.length) reqs = ['Total Assignments PDF Records (Consolidated)', 'Class Test Records & Solutions', 'Practical / Lab Journal Records', 'Viva Voce Documentation'];

      const staged = window._stagedDocs[assignmentId] || {};
      const sel = document.getElementById('student-req-select');
      sel.innerHTML = reqs.map(r => {
        const isUp = Boolean(staged[r]);
        return `<option value="${escapeHtml(r)}" ${r === preselectedReq ? 'selected' : ''}>${escapeHtml(r)} ${isUp ? '(Attached)' : ''}</option>`;
      }).join('');

      document.getElementById('student-req-file-input').value = '';
      openModal('modal-student-req-upload');
    }

    function openStudentBigUploadModal(assignmentId) {
      openStudentItemUploadModal(assignmentId, null);
    }

    async function handleStudentReqUpload(e) {
      e.preventDefault();
      const assignmentId = Number(document.getElementById('student-req-upload-asgn-id').value);
      const reqName = document.getElementById('student-req-select').value;
      const fileInput = document.getElementById('student-req-file-input');
      const btn = document.getElementById('btn-upload-req-doc');

      if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        showToast('Please select a file to upload', 'warning');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Uploading...';

      try {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        const token = localStorage.getItem('token') || localStorage.getItem('access_token') || sessionStorage.getItem('token');
        const res = await fetch('/api/v1/assignments/upload-document', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        const json = await res.json();
        if (res.ok && json.success) {
          window._stagedDocs[assignmentId] = window._stagedDocs[assignmentId] || {};
          window._stagedDocs[assignmentId][reqName] = {
            requirement_name: reqName,
            file_path: json.data.file_path,
            original_filename: json.data.original_filename
          };
          showToast(`Attached: ${json.data.original_filename}`, 'success');
          closeModal('modal-student-req-upload');
          await loadAssignments();
        } else {
          throw new Error(json.error?.message || 'Failed to upload document');
        }
      } catch (err) {
        showToast(err.message || 'Upload failed', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload Document
        `;
      }
    }

    async function submitFinalDocsBundle(assignmentId) {
      const staged = window._stagedDocs[assignmentId] || {};
      const docsArray = Object.values(staged);
      if (!docsArray.length) {
        showToast('Please upload all required documents first', 'warning');
        return;
      }

      try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token') || sessionStorage.getItem('token');
        const res = await fetch(`/api/v1/assignments/${assignmentId}/submit-final-docs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ documents: docsArray })
        });

        const json = await res.json();
        if (res.ok && json.success) {
          showToast('All final documents submitted successfully!', 'success');
          delete window._stagedDocs[assignmentId];
          await loadAssignments();
        } else {
          throw new Error(json.error?.message || 'Failed to submit bundle');
        }
      } catch (err) {
        showToast(err.message || 'Failed to submit documents', 'error');
      }
    }

    async function submitAssignment(id) {
      const fileInput = document.getElementById(`file-${id}`);
      if (!fileInput.files[0]) { showToast('Choose a file first', 'error'); return; }
      const fd = new FormData();
      fd.append('file', fileInput.files[0]);
      const res = await authedFetch(`/assignments/${id}/submit`, { method: 'POST', body: fd });
      if (res.success) {
        showToast('Uploaded!', 'success');
        loadAssignments();
      } else {
        showToast(res.error?.message || 'Upload failed', 'error');
      }
    }

    loadAssignments();

