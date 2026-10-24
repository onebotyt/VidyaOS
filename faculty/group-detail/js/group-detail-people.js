/**
 * ══════════════════════════════════════════════════════════════
 * GROUP-DETAIL: PEOPLE & ROSTER CONTROLLER
 * frontend/faculty/group-detail/js/group-detail-people.js
 * ══════════════════════════════════════════════════════════════
 */

async function loadMembers() {
  try {
    const r = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/members');
    S.members = r.data || [];
    renderPeople();
    if (ById('tab-people-count')) ById('tab-people-count').textContent = S.members.length;
    if (ById('stat-enrolled')) ById('stat-enrolled').textContent = S.members.length;
    if (ById('kpi-students')) ById('kpi-students').textContent = S.members.length;
    if (ById('students-count-label')) ById('students-count-label').textContent = S.members.length + ' students';
  } catch {
    S.members = [];
    if (ById('students-list')) {
      ById('students-list').innerHTML = '<div style="padding:1rem;color:var(--text-muted);font-size:.85rem">Failed to load students.</div>';
    }
  }
}

function renderPeople() {
  const g = S.group || {};
  if (ById('teacher-list')) {
    ById('teacher-list').innerHTML = '<div class="person-row"><div class="person-av teacher-av">' + initials(g.teacher_name || 'T') + '</div><div class="person-info"><div class="person-name">' + esc(g.teacher_name || 'Teacher') + '</div><div class="person-sub">' + esc(g.department_name || '') + ' • Instructor</div></div></div>';
  }
  const sl = ById('students-list');
  if (!sl) return;
  if (!S.members.length) {
    sl.innerHTML = emptyState('students', 'No students enrolled yet', 'Add students using their enrollment number or share the invite code.');
    return;
  }
  const isStudent = document.body.classList.contains('student-mode') || S.isStudent;
  sl.innerHTML = S.members.map((m, i) =>
    '<div class="person-row">' +
      '<div class="person-av" style="background:hsl(' + ((i * 47 + 142) % 360) + ',55%,48%)">' + initials(m.full_name) + '</div>' +
      '<div class="person-info">' +
        '<div class="person-name">' + esc(m.full_name || 'Student') + '</div>' +
        '<div class="person-sub">Roll ' + (m.class_roll_no || '—') + ' • ' + esc(m.official_enrollment_no || m.enrollment_no || 'No enrollment no.') + '</div>' +
      '</div>' +
      (!isStudent ? (
        '<button class="person-rm-btn" onclick="removeStudent(' + m.student_id + ')" title="Remove">' +
          (window.getSvgIcon ? window.getSvgIcon('close', 14) : '✕') +
        '</button>'
      ) : '') +
    '</div>'
  ).join('');
}

async function addStudentByEnroll() {
  const inp = ById('add-enroll-input');
  if (!inp) return;
  const eno = inp.value.trim();
  if (!eno) {
    toast('Enter an enrollment number');
    return;
  }
  try {
    await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/members', {
      method: 'POST',
      body: JSON.stringify({ official_enrollment_no: eno })
    });
    inp.value = '';
    toast('Student added!');
    await loadMembers();
  } catch (e) {
    toast(e.message || 'Student not found');
  }
}

function requestRemoveStudent(sid) {
  const member = S.members.find(m => m.student_id === sid);
  const name = member ? member.full_name : 'Student';
  const roll = member ? (member.class_roll_no ? ('Roll #' + member.class_roll_no) : '') : '';
  const enroll = member ? (member.official_enrollment_no || member.enrollment_no || '') : '';
  const detailStr = [roll, enroll].filter(Boolean).join(' • ');

  window._pendingDelete = {
    action: 'remove_student',
    id: sid,
    name: name,
    execute: async () => {
      await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/members/' + sid, { method: 'DELETE' });
      toast(name + ' removed from group');
      await loadMembers();
    }
  };

  if (ById('del-modal-title')) ById('del-modal-title').textContent = 'Remove Student from Group';
  if (ById('del-modal-desc')) ById('del-modal-desc').innerHTML = 'Remove <strong>' + esc(name) + '</strong>' + (detailStr ? ' (' + esc(detailStr) + ')' : '') + ' from <strong>' + esc(S.group?.name || 'this group') + '</strong>?';
  if (ById('del-modal-step2-text')) ById('del-modal-step2-text').innerHTML = 'You are about to remove <strong>' + esc(name) + '</strong> from this teaching group. The student will lose access to the classroom stream, assignments, and test rosters.';
  if (ById('del-checkbox-label')) ById('del-checkbox-label').innerHTML = 'Yes, remove <strong>' + esc(name) + '</strong> from this teaching group';
  if (ById('btn-final-delete-confirm')) ById('btn-final-delete-confirm').textContent = 'Confirm & Remove';

  if (ById('del-step-1')) ById('del-step-1').style.display = '';
  if (ById('del-step-2')) ById('del-step-2').style.display = 'none';
  if (ById('del-confirm-checkbox')) ById('del-confirm-checkbox').checked = false;
  if (ById('btn-final-delete-confirm')) ById('btn-final-delete-confirm').disabled = true;
  openModal('modal-confirm-delete');
}

function removeStudent(sid) {
  requestRemoveStudent(sid);
}

// Unenrolled Students Modal
let unenrolledList = [];

async function openAddUnenrolledModal() {
  const tbody = ById('unenrolled-checklist-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Finding unenrolled students...</td></tr>';
  if (ById('search-unenrolled-input')) ById('search-unenrolled-input').value = '';
  openModal('modal-add-unenrolled');
  try {
    const res = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/unenrolled-students');
    if (res.success) {
      unenrolledList = res.data || [];
      renderUnenrolledStudents();
    } else {
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--status-absent)">Failed to load unenrolled students</td></tr>';
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--status-absent)">' + esc(err.message) + '</td></tr>';
  }
}

function renderUnenrolledStudents() {
  const tbody = ById('unenrolled-checklist-tbody');
  if (!tbody) return;
  const q = (ById('search-unenrolled-input')?.value || '').trim().toLowerCase();
  const filtered = unenrolledList.filter(s => {
    if (!q) return true;
    const name = (s.full_name || '').toLowerCase();
    const eno = (s.official_enrollment_no || '').toLowerCase();
    const roll = String(s.class_roll_no || '');
    return name.includes(q) || eno.includes(q) || roll.includes(q);
  });
  if (ById('unenrolled-count')) ById('unenrolled-count').textContent = filtered.length;
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-muted)">No unenrolled students found for this cohort.</td></tr>';
    updateUnenrolledTally();
    return;
  }
  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td style="text-align:center">
        <input type="checkbox" class="unenrolled-student-chk" value="${s.student_id}" onchange="updateUnenrolledTally()">
      </td>
      <td style="font-weight:700">${s.class_roll_no || '—'}</td>
      <td style="font-weight:600">${esc(s.full_name)}</td>
      <td><code>${esc(s.official_enrollment_no)}</code></td>
      <td style="text-align:right">
        <button type="button" class="btn btn-secondary" style="padding:.25rem .55rem;font-size:.75rem" onclick="enrollSingleStudent(${s.student_id})">+ Enroll</button>
      </td>
    </tr>
  `).join('');
  if (ById('unenrolled-select-all')) ById('unenrolled-select-all').checked = false;
  updateUnenrolledTally();
}

function filterUnenrolledStudents() {
  renderUnenrolledStudents();
}

function toggleUnenrolledSelectAll(checked) {
  document.querySelectorAll('.unenrolled-student-chk').forEach(c => c.checked = checked);
  updateUnenrolledTally();
}

function updateUnenrolledTally() {
  const chks = document.querySelectorAll('.unenrolled-student-chk');
  const selected = Array.from(chks).filter(c => c.checked).length;
  if (ById('unenrolled-selected-tally')) ById('unenrolled-selected-tally').textContent = selected;
  const batchBtn = ById('btn-batch-enroll-unenrolled');
  if (batchBtn) batchBtn.disabled = selected === 0;
}

async function enrollSingleStudent(studentId) {
  await executeEnrollBatch([studentId]);
}

async function submitBatchEnrollUnenrolled() {
  const chks = document.querySelectorAll('.unenrolled-student-chk:checked');
  const ids = Array.from(chks).map(c => Number(c.value));
  if (!ids.length) return;
  await executeEnrollBatch(ids);
}

async function executeEnrollBatch(studentIds) {
  try {
    const res = await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/members', {
      method: 'POST',
      body: JSON.stringify({ student_ids: studentIds })
    });
    if (res.success) {
      toast('Enrolled ' + studentIds.length + ' student(s) successfully!');
      closeModal('modal-add-unenrolled');
      await loadMembers();
    } else {
      toast(res.error?.message || 'Failed to enroll students');
    }
  } catch (err) {
    toast(err.message);
  }
}

function openPromoteModal() {
  location.href = '/faculty/groups.html?action=promote&id=' + S.groupId;
}

function openClassInfoModal() {
  openModal('modal-class-info');
}

function openArchiveModal() {
  openModal('modal-archive');
}

async function executeArchive() {
  try {
    await apiFetch('/api/v1/teaching-groups/' + S.groupId + '/archive', { method: 'POST' });
    toast('Group archived!');
    closeModal('modal-archive');
    setTimeout(() => location.href = '/faculty/groups.html', 1500);
  } catch (e) {
    toast(e.message);
  }
}

function openEditGroupModal() {
  if (!S.group) return;
  if (ById('edit-group-id')) ById('edit-group-id').value = S.group.id;
  if (ById('edit-group-name')) ById('edit-group-name').value = S.group.name || '';
  if (ById('edit-group-subject')) ById('edit-group-subject').value = S.group.subject_name || '';
  if (ById('edit-group-component')) ById('edit-group-component').value = S.group.component || 'THEORY';
  if (ById('edit-group-total-units')) ById('edit-group-total-units').value = S.group.total_units || 5;
  openModal('modal-edit-group');
}

async function submitEditGroup(e) {
  if (e) e.preventDefault();
  const btn = ById('btn-save-edit-group');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving...';
  }
  const name = ById('edit-group-name')?.value.trim() || ById('edit-group-subject')?.value.trim() || '';
  const subject_name = ById('edit-group-subject')?.value.trim() || '';
  const component = ById('edit-group-component')?.value || 'THEORY';
  const total_units = parseInt(ById('edit-group-total-units')?.value) || 5;
  try {
    const res = await apiFetch('/api/v1/teaching-groups/' + S.groupId, {
      method: 'PUT',
      body: JSON.stringify({ name, subject_name, component, total_units })
    });
    if (res.success) {
      toast('Class settings updated!');
      closeModal('modal-edit-group');
      S.group.name = name;
      S.group.subject_name = subject_name;
      S.group.component = component;
      S.group.total_units = total_units;
      renderBanner(S.group);
      if (typeof renderCWList === 'function') renderCWList();
    } else {
      toast(res.error?.message || 'Failed to update class settings');
    }
  } catch (err) {
    toast(err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  }
}

// Bind people methods to window
window.loadMembers = loadMembers;
window.renderPeople = renderPeople;
window.addStudentByEnroll = addStudentByEnroll;
window.requestRemoveStudent = requestRemoveStudent;
window.removeStudent = removeStudent;
window.openAddUnenrolledModal = openAddUnenrolledModal;
window.renderUnenrolledStudents = renderUnenrolledStudents;
window.filterUnenrolledStudents = filterUnenrolledStudents;
window.toggleUnenrolledSelectAll = toggleUnenrolledSelectAll;
window.updateUnenrolledTally = updateUnenrolledTally;
window.enrollSingleStudent = enrollSingleStudent;
window.submitBatchEnrollUnenrolled = submitBatchEnrollUnenrolled;
window.executeEnrollBatch = executeEnrollBatch;
window.openPromoteModal = openPromoteModal;
window.openClassInfoModal = openClassInfoModal;
window.openArchiveModal = openArchiveModal;
window.executeArchive = executeArchive;
window.openEditGroupModal = openEditGroupModal;
window.submitEditGroup = submitEditGroup;
