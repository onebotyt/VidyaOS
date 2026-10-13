/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: DASHBOARD
 * frontend/admin/dashboard/dashboard.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['SYSTEM_ADMIN']);

async function loadAdminStats() {
  try {
    const res = await fetchApi('/admin/stats');
    if (res && res.success && res.data) {
      const d = res.data;
      const elTeachers = document.getElementById('stat-teachers');
      const elStudents = document.getElementById('stat-students');
      const elEnrolled = document.getElementById('stat-enrolled-total');
      
      if (elTeachers) elTeachers.innerText = Number(d.total_teachers || 0).toLocaleString();
      if (elStudents) elStudents.innerText = Number(d.total_students || 0).toLocaleString();
      if (elEnrolled) elEnrolled.innerText = Number(d.total_enrolled_students || d.total_students || 0).toLocaleString();
    }
  } catch (err) {
    console.warn('Failed to load admin stats:', err);
  }
}

(async function init() {
  await loadAdminStats();
})();
