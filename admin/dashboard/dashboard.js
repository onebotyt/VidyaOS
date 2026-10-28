/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: ADMIN EXECUTIVE DASHBOARD
 * frontend/admin/dashboard/dashboard.js
 * 
 * - Guarded for SYSTEM_ADMIN role
 * - Real-time institutional KPI statistics loading
 * - Session user personalization (Hero Banner)
 * ══════════════════════════════════════════════════════════════
 */

// 1. RBAC Guard: Restrict page strictly to System Administrators
if (typeof guardRoute === 'function') {
  guardRoute(['SYSTEM_ADMIN']);
}

// 2. Load Institutional Statistics (Teachers, Active Students, Enrolled Total)
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
    console.warn('[AdminDashboard] Failed to load real-time stats:', err);
  }
}

// 3. Populate Session User Identity
function populateUserIdentity() {
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if (!user) return;

  const displayName = user.full_name || user.name || user.username || 'System Administrator';
  const elHero = document.getElementById('admin-hero-name');
  if (elHero) elHero.textContent = displayName;
}

// 4. Master Page Initialization
(async function init() {
  populateUserIdentity();
  await loadAdminStats();
})();
