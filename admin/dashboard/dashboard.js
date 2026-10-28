/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: ADMIN EXECUTIVE DASHBOARD
 * frontend/admin/dashboard/dashboard.js
 * 
 * - Guarded for SYSTEM_ADMIN role
 * - Real-time institutional KPI statistics loading
 * - Session user personalization (Hero & Profile)
 * - Instant live search filtering across all administration modules
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

  const displayName = user.full_name || user.name || user.username || 'System Admin';
  
  // Welcome hero greeting
  const elHero = document.getElementById('admin-hero-name');
  if (elHero) elHero.textContent = displayName;

  // Top bar profile pill
  const elProfile = document.getElementById('admin-profile-name');
  if (elProfile) elProfile.textContent = displayName;

  // Popover details
  const elPopoverName = document.getElementById('popover-user-name');
  if (elPopoverName) elPopoverName.textContent = displayName;
  const elPopoverEmail = document.getElementById('popover-user-email');
  if (elPopoverEmail && user.email) elPopoverEmail.textContent = user.email;

  // Dynamic Avatar Initials
  const cleanName = displayName.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() 
    : (cleanName.slice(0, 2).toUpperCase() || 'SA');

  const elAvatar = document.getElementById('admin-avatar-initials');
  if (elAvatar) elAvatar.textContent = initials;
  const elPopoverAvatar = document.getElementById('popover-avatar');
  if (elPopoverAvatar) elPopoverAvatar.textContent = initials;
}

// 4. Client-Side Instant Module Search Filter
function setupModuleSearch() {
  const searchInput = document.getElementById('admin-module-search');
  const container = document.getElementById('admin-modules-container');
  if (!searchInput || !container) return;

  const cards = container.querySelectorAll('.module-card');

  // Keyboard shortcut: Pressing '/' or 'Ctrl+K' focuses search
  window.addEventListener('keydown', (e) => {
    if ((e.key === '/' && document.activeElement !== searchInput) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    if (e.key === 'Escape' && document.activeElement === searchInput) {
      searchInput.value = '';
      searchInput.blur();
      filterModules('');
    }
  });

  function filterModules(query) {
    const q = query.trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach(card => {
      const title = (card.querySelector('.module-title')?.textContent || '').toLowerCase();
      const desc = (card.querySelector('.module-description')?.textContent || '').toLowerCase();
      const tag = (card.querySelector('.module-tag')?.textContent || '').toLowerCase();
      const keywords = (card.getAttribute('data-module-keywords') || '').toLowerCase();

      const matches = !q || title.includes(q) || desc.includes(q) || tag.includes(q) || keywords.includes(q);
      card.style.display = matches ? 'flex' : 'none';
      if (matches) visibleCount++;
    });

    // Empty state handling
    let emptyEl = document.getElementById('admin-modules-empty');
    if (visibleCount === 0) {
      if (!emptyEl) {
        emptyEl = document.createElement('div');
        emptyEl.id = 'admin-modules-empty';
        emptyEl.style.cssText = 'grid-column: 1 / -1; padding: 2.5rem 1rem; text-align: center; color: var(--text-muted); background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg);';
        emptyEl.innerHTML = `
          <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍</div>
          <div style="font-weight: 700; font-size: 1rem; color: var(--text-main); margin-bottom: 0.25rem;">No matching modules found</div>
          <div style="font-size: 0.85rem;">Try searching for "faculty", "structure", "reports", or "audit".</div>
        `;
        container.appendChild(emptyEl);
      }
      emptyEl.style.display = 'block';
    } else if (emptyEl) {
      emptyEl.style.display = 'none';
    }
  }

  searchInput.addEventListener('input', (e) => filterModules(e.target.value));
}

// 5. Master Page Initialization
(async function init() {
  populateUserIdentity();
  setupModuleSearch();
  await loadAdminStats();
})();
