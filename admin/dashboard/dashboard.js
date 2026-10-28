/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: ADMIN EXECUTIVE DASHBOARD
 * frontend/admin/dashboard/dashboard.js
 * 
 * - Guarded for SYSTEM_ADMIN role
 * - Responsive Dual-State Sidebar Controller (PC Rail & Mobile Drawer)
 * - Real-time institutional KPI statistics loading
 * - Session user personalization (Hero Banner)
 * - Instant live search filtering across all administration modules
 * ══════════════════════════════════════════════════════════════
 */

// 1. RBAC Guard: Restrict page strictly to System Administrators
if (typeof guardRoute === 'function') {
  guardRoute(['SYSTEM_ADMIN']);
}

// 2. Responsive Sidebar Controls (Desktop Rail & Mobile Drawer)
function toggleDesktopSidebar() {
  const layout = document.getElementById('admin-app-layout') || document.body;
  const isCurrentlyCollapsed = layout.classList.contains('sidebar-collapsed') || document.body.classList.contains('sidebar-collapsed');
  const willCollapse = !isCurrentlyCollapsed;

  if (willCollapse) {
    layout.classList.add('sidebar-collapsed');
    document.body.classList.add('sidebar-collapsed');
    document.documentElement.classList.add('sidebar-collapsed');
  } else {
    layout.classList.remove('sidebar-collapsed');
    document.body.classList.remove('sidebar-collapsed');
    document.documentElement.classList.remove('sidebar-collapsed');
  }

  try {
    localStorage.setItem('admin_sidebar_collapsed', willCollapse ? 'true' : 'false');
  } catch (_) {}
}

function toggleSidebar(forceState) {
  if (window.innerWidth >= 769) {
    toggleDesktopSidebar();
    return;
  }

  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;

  const isCurrentlyOpen = sidebar.classList.contains('sidebar-open') || sidebar.classList.contains('open');
  const shouldOpen = typeof forceState === 'boolean' ? forceState : !isCurrentlyOpen;

  if (shouldOpen) {
    sidebar.classList.add('sidebar-open', 'open');
    if (backdrop) backdrop.classList.add('active', 'open');
    document.body.style.overflow = 'hidden';
  } else {
    sidebar.classList.remove('sidebar-open', 'open');
    if (backdrop) backdrop.classList.remove('active', 'open');
    document.body.style.overflow = '';
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('sidebar-open', 'open');
  if (backdrop) backdrop.classList.remove('active', 'open');
  document.body.style.overflow = '';
}

// Expose navigation methods globally for HTML onclick handlers
window.toggleDesktopSidebar = toggleDesktopSidebar;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;

// Mobile Search Toggle
function toggleMobileSearch(forceState) {
  const dropdown = document.getElementById('mobile-search-dropdown');
  const input = document.getElementById('admin-module-search-mobile');
  if (!dropdown) return;

  const isOpen = typeof forceState === 'boolean' ? forceState : (dropdown.style.display === 'none' || !dropdown.style.display);
  dropdown.style.display = isOpen ? 'block' : 'none';
  if (isOpen && input) {
    setTimeout(() => {
      input.focus();
    }, 50);
  }
}
window.toggleMobileSearch = toggleMobileSearch;

// Notifications Alert Toggle
function toggleNotifications(e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  if (typeof showToast === 'function') {
    showToast('All system services active. 0 critical security alerts.', 'info');
  } else {
    alert('VidyaOS Notifications: All institutional modules nominal. 0 pending alerts.');
  }
}
window.toggleNotifications = toggleNotifications;

// 3. Load Institutional Statistics (Teachers, Active Students, Enrolled Total)
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

// 4. Populate Session User Identity
function populateUserIdentity() {
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if (!user) return;

  const displayName = user.full_name || user.name || user.username || 'System Administrator';
  const elHero = document.getElementById('admin-hero-name');
  if (elHero) elHero.textContent = displayName;
}

// 5. Client-Side Instant Module Search Filter
function setupModuleSearch() {
  const desktopSearch = document.getElementById('admin-module-search-desktop');
  const mobileSearch = document.getElementById('admin-module-search-mobile');
  const container = document.getElementById('admin-modules-container');
  if (!container) return;

  const cards = container.querySelectorAll('.module-card');

  // Synchronized search filtering
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

  if (desktopSearch) {
    desktopSearch.addEventListener('input', (e) => {
      filterModules(e.target.value);
      if (mobileSearch) mobileSearch.value = e.target.value;
    });
  }

  if (mobileSearch) {
    mobileSearch.addEventListener('input', (e) => {
      filterModules(e.target.value);
      if (desktopSearch) desktopSearch.value = e.target.value;
    });
  }

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // 1. Toggle Sidebar: Ctrl+B or Cmd+B
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebar();
      return;
    }

    // 2. Focus Search: '/' or Ctrl+K / Cmd+K
    const activeEl = document.activeElement;
    const isSearching = activeEl === desktopSearch || activeEl === mobileSearch;

    if (((e.key === '/' && !isSearching && activeEl?.tagName !== 'INPUT' && activeEl?.tagName !== 'TEXTAREA') || 
         ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'))) {
      e.preventDefault();
      if (window.innerWidth >= 769 && desktopSearch) {
        desktopSearch.focus();
        desktopSearch.select();
      } else if (mobileSearch) {
        toggleMobileSearch(true);
      }
      return;
    }

    // 3. Close on Escape
    if (e.key === 'Escape') {
      if (isSearching) {
        if (desktopSearch) { desktopSearch.value = ''; desktopSearch.blur(); }
        if (mobileSearch) { mobileSearch.value = ''; mobileSearch.blur(); }
        filterModules('');
        toggleMobileSearch(false);
      } else {
        closeSidebar();
      }
    }
  });
}

// 6. Master Page Initialization
(async function init() {
  populateUserIdentity();
  setupModuleSearch();
  await loadAdminStats();
})();
