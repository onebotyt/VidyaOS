/**
 * Shared Client Authentication, Session Management & RBAC Guard
 * Location: /shared/js/auth.js
 */

function getAuthToken() {
  return localStorage.getItem('access_token');
}

function getToken() {
  return typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('access_token') || '');
}

function getAccessToken() {
  return typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('access_token') || '');
}

if (typeof window !== 'undefined') {
  window.getAuthToken = getAuthToken;
  window.getToken = getToken;
  window.getAccessToken = getAccessToken;
}

function setAuthSession(token, user) {
  localStorage.setItem('access_token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

// Auto-capture token and user if redirected from OAuth callback URL
if (typeof window !== 'undefined' && window.location && window.location.search) {
  try {
    const _urlParams = new URLSearchParams(window.location.search);
    const _oauthToken = _urlParams.get('token');
    const _oauthUser = _urlParams.get('user');
    if (_oauthToken) {
      localStorage.setItem('access_token', _oauthToken);
      if (_oauthUser) {
        try { localStorage.setItem('user', JSON.stringify(JSON.parse(_oauthUser))); }
        catch (_) { localStorage.setItem('user', _oauthUser); }
      }
      _urlParams.delete('token');
      _urlParams.delete('user');
      const _newQuery = _urlParams.toString();
      const _cleanUrl = window.location.pathname + (_newQuery ? '?' + _newQuery : '') + window.location.hash;
      window.history.replaceState({}, document.title, _cleanUrl);
    }
  } catch (_e) {
    console.warn('OAuth URL param capture warning:', _e);
  }
}

// Fallback showToast to guarantee no ReferenceError occurs if ui.js is omitted
if (typeof window !== 'undefined' && typeof window.showToast !== 'function') {
  window.showToast = function(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = 'animation: fadeIn 0.2s ease-out; margin-bottom: 8px; padding: 10px 16px; border-radius: 6px; font-size: 0.875rem; color: var(--text-white); box-shadow: var(--shadow-md);';
    toast.style.background = type === 'error' ? 'var(--status-absent)' : (type === 'success' ? 'var(--status-present)' : (type === 'warning' ? 'var(--status-late)' : 'var(--color-primary)'));
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  };
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

function logout() {
  const token = getAuthToken();
  if (token) {
    fetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(() => {});
  }
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  window.location.href = '/index.html';
}

/**
 * Strong Role-Based Route Guard
 * @param {Array|Object} options - Either an array of allowed roles or an options object:
 *   {
 *     roles: ['TEACHER', 'SYSTEM_ADMIN'],
 *     requireHOD: true,            // Requires HOD assignment (or SYSTEM_ADMIN)
 *     requireClassTeacher: true,    // Requires CLASS_TEACHER assignment (or SYSTEM_ADMIN)
 *     requireSubjects: true         // Requires active assigned subjects (or SYSTEM_ADMIN/HOD)
 *   }
 */
function guardRoute(options = []) {
  const user = getCurrentUser();
  const token = getAuthToken();

  if (!token || !user) {
    window.location.href = '/index.html';
    return false;
  }

  const config = Array.isArray(options) ? { roles: options } : (options || {});
  const allowedRoles = config.roles || config.requireRoles || [];

  // 1. Role verification
  if (allowedRoles.length > 0) {
    const hasRole = user.roles && user.roles.some(r => allowedRoles.includes(r));
    if (!hasRole) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('flash_toast', JSON.stringify({ message: 'Access Denied: You do not have permission to view this portal.', type: 'error' }));
        }
      } catch (_) {}
      if (typeof showToast === 'function') {
        showToast('Access Denied: You do not have permission to view this portal.', 'error');
      }
      if (user.roles?.includes('STUDENT')) {
        window.location.href = '/student/dashboard.html';
      } else if (user.roles?.includes('TEACHER')) {
        window.location.href = '/faculty/dashboard.html';
      } else if (user.roles?.includes('SYSTEM_ADMIN')) {
        window.location.href = '/admin/dashboard.html';
      } else {
        window.location.href = '/index.html';
      }
      return false;
    }
  }

  // 2. HOD administrative requirement
  if (config.requireHOD && !user.roles?.includes('SYSTEM_ADMIN')) {
    if (!user.is_hod) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('flash_toast', JSON.stringify({ message: 'Access Denied: Head of Department (HOD) authorization required.', type: 'error' }));
        }
      } catch (_) {}
      window.location.href = '/faculty/dashboard.html';
      return false;
    }
  }

  // 3. Department faculty / Class Teacher cohort requirement (redesign.md Section 13, 14, 65 & Invariant 5)
  if ((config.requireDepartmentFaculty || config.requireClassTeacher) && !user.roles?.includes('SYSTEM_ADMIN')) {
    const isDeptFaculty = Boolean(user.department_id || user.teacher?.department_id || user.is_class_teacher || user.is_hod);
    if (!isDeptFaculty) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('flash_toast', JSON.stringify({ message: 'Access Denied: Department faculty authorization required.', type: 'error' }));
        }
      } catch (_) {}
      window.location.href = '/faculty/dashboard.html';
      return false;
    }
  }

  // 4. Subject assignment requirement
  if (config.requireSubjects && !user.roles?.includes('SYSTEM_ADMIN') && !user.is_hod) {
    if (!user.has_assigned_subjects) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('flash_toast', JSON.stringify({ message: 'No subjects have been assigned to you yet.', type: 'info' }));
        }
      } catch (_) {}
      window.location.href = '/faculty/dashboard.html';
      return false;
    }
  }

  // 5. Common Faculty Manager requirement
  if (config.requireCommonFacultyManager && !user.roles?.includes('SYSTEM_ADMIN')) {
    if (!user.is_common_faculty_manager && !user.roles?.includes('COMMON_FACULTY_MANAGER')) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('flash_toast', JSON.stringify({ message: 'Access Denied: Common Faculty Manager authorization required.', type: 'error' }));
        }
      } catch (_) {}
      window.location.href = '/faculty/dashboard.html';
      return false;
    }
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      const flash = sessionStorage.getItem('flash_toast');
      if (flash) {
        sessionStorage.removeItem('flash_toast');
        const parsed = JSON.parse(flash);
        setTimeout(() => {
          if (typeof showToast === 'function') showToast(parsed.message, parsed.type);
        }, 300);
      }
    }
  } catch (_) {}

  try {
    renderSidebar();
  } catch (err) {
    console.error('Error in renderSidebar:', err);
  }

  try {
    renderFooter();
  } catch (err) {
    console.error('Error in renderFooter:', err);
  }

  try {
    renderMobileBottomNav(user);
  } catch (err) {
    console.error('Error in renderMobileBottomNav:', err);
  }

  try {
    renderUserNav();
  } catch (err) {
    console.error('Error in renderUserNav:', err);
  }

  return true;
}

function getUserDisplayName(user) {
  if (!user) return 'User';
  let name = user.full_name || user.name || user.username;
  if (!name || name === 'undefined' || name === 'null' || name.trim() === '') {
    if (user.roles?.includes('SYSTEM_ADMIN')) {
      return 'System Administrator';
    } else if (user.roles?.includes('TEACHER')) {
      return user.is_hod ? 'Head of Department' : 'Faculty Member';
    } else if (user.roles?.includes('STUDENT')) {
      return 'Student';
    } else if (user.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  }
  return name;
}

// ─────────────────────────────────────────────────────────
// SIDEBAR NAVIGATION (Persistent Collapsible)
// ─────────────────────────────────────────────────────────

function _getSidebarState() {
  return localStorage.getItem('sidebar_open') !== 'false';
}

function _setSidebarState(open) {
  localStorage.setItem('sidebar_open', open ? 'true' : 'false');
}

function toggleSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle('sidebar-open');
  document.body.classList.toggle('sidebar-open', isOpen);
  if (backdrop) {
    backdrop.classList.toggle('active', isOpen);
  }
  _setSidebarState(isOpen);
  // Update toggle button icon
  const btn = document.getElementById('sidebar-toggle-btn');
  if (btn) btn.setAttribute('aria-pressed', isOpen ? 'true' : 'false');
}

function closeSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;
  sidebar.classList.remove('sidebar-open');
  document.body.classList.remove('sidebar-open');
  if (backdrop) backdrop.classList.remove('active');
  _setSidebarState(false);
}

function renderSidebar() {
  const user = getCurrentUser();
  const header = document.querySelector('.app-header');
  if (!header || !user) return;

  // 1. Inject toggle button into header left
  if (!document.getElementById('sidebar-toggle-btn')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'sidebar-toggle-btn';
    toggleBtn.className = 'sidebar-toggle-btn';
    toggleBtn.type = 'button';
    toggleBtn.onclick = toggleSidebar;
    toggleBtn.setAttribute('aria-label', 'Toggle navigation sidebar');
    toggleBtn.setAttribute('aria-pressed', 'false');
    toggleBtn.innerHTML = '☰';

    const brand = header.querySelector('.brand');
    let leftWrap = header.querySelector('.header-left');
    if (!leftWrap) {
      leftWrap = document.createElement('div');
      leftWrap.className = 'header-left';
      if (brand) {
        brand.parentNode.insertBefore(leftWrap, brand);
        leftWrap.appendChild(toggleBtn);
        leftWrap.appendChild(brand);
      } else {
        header.insertBefore(leftWrap, header.firstChild);
        leftWrap.appendChild(toggleBtn);
      }
    } else {
      leftWrap.insertBefore(toggleBtn, leftWrap.firstChild);
    }
  }

  // 2. Build sidebar if not present
  if (document.getElementById('app-sidebar')) return;

  const currentPath = window.location.pathname.toLowerCase();
  const currentUrl = (window.location.pathname + window.location.search).toLowerCase();
  const roleBadge = user.roles ? user.roles[0] : 'USER';
  const displayName = getUserDisplayName(user);
  const email = user.email || user.username || 'System Account';

  let navSections = [];
  let portalLabel = 'College Portal';

  if (user.roles?.includes('SYSTEM_ADMIN') || currentPath.includes('/admin/')) {
    portalLabel = 'Administration';
    navSections = [{
      label: 'Admin',
      items: [
        { icon: '📊', label: 'Dashboard', href: '/admin/dashboard.html' },
        { icon: '🏛️', label: 'Academic Structure', href: '/admin/academic-structure.html' },
        { icon: '👨‍🏫', label: 'HOD Management', href: '/admin/faculty.html' },
        { icon: '📱', label: 'WhatsApp Gateway', href: '/admin/whatsapp-gateway.html' },
        { icon: '👥', label: 'Student Analytics', href: '/admin/students.html' },
        { icon: '📈', label: 'Department Reports', href: '/admin/reports.html' },
        { icon: '⚙️', label: 'System Settings', href: '/admin/settings.html' },
        { icon: '🛡️', label: 'Audit Logs', href: '/admin/audit-logs.html' }
      ]
    }];
  } else if (user.roles?.includes('TEACHER') || currentPath.includes('/faculty/')) {
    portalLabel = user.is_hod ? `HOD — ${user.hod_department_name || 'Dept'}` : 'Faculty Portal';

    const mainItems = [
      { icon: '📊', label: 'Dashboard', href: '/faculty/dashboard.html' },
      { icon: '🏫', label: 'Teaching Groups', href: '/faculty/groups.html' }
    ];
    if (user.has_assigned_subjects) {
      mainItems.push(
        { icon: '📖', label: 'Registers & Attendance', href: '/faculty/registers.html' },
        { icon: '📝', label: 'Assignments', href: '/faculty/assignments.html' },
        { icon: '📊', label: 'Class Tests & Marks', href: '/faculty/tests.html' },
        { icon: '📈', label: 'Internal Evaluation', href: '/faculty/evaluation.html' },
        { icon: '📉', label: 'Reports & Analytics', href: '/faculty/reports.html' }
      );
    }
    mainItems.push(
      { icon: '🗓️', label: 'Timetable', href: '/faculty/timetable.html' },
      { icon: '🧾', label: 'Leave Requests', href: '/faculty/leave-approvals.html' }
    );
    const isDeptFaculty = Boolean(user.department_id || user.teacher?.department_id || user.is_class_teacher || user.is_hod || (user.roles?.includes('TEACHER') && !user.is_common_faculty_manager));
    if (isDeptFaculty) {
      mainItems.push({ icon: '👥', label: 'Department Students', href: '/faculty/students.html', id: 'nav-students-item', hasBadge: true });
    }
    if (user.is_common_faculty_manager || user.roles?.includes('COMMON_FACULTY_MANAGER')) {
      mainItems.push({ icon: '🌐', label: 'Common Faculty', href: '/faculty/common-teachers.html' });
    }
    navSections.push({ label: 'Faculty', items: mainItems });

    if (user.is_hod || currentPath.includes('hod-')) {
      navSections.push({
        label: 'HOD Management',
        items: [
          { icon: '👨‍🏫', label: 'My Teachers', href: '/faculty/hod-teachers.html' },
          { icon: '📚', label: 'Department Subjects', href: '/faculty/hod-subjects.html' },
          { icon: '👥', label: 'Dept Students', href: '/faculty/hod-students.html' },
          { icon: '🎓', label: 'Student Archive', href: '/faculty/hod-archive.html' },
          { icon: '📈', label: 'Dept Reports', href: '/faculty/hod-reports.html' },
          { icon: '📡', label: 'ESP Terminals', href: '/faculty/hod-devices.html' },
          { icon: '⚙️', label: 'Dept Settings', href: '/faculty/hod-settings.html' }
        ]
      });
    }
  } else if (user.roles?.includes('STUDENT') || currentPath.includes('/student/')) {
    portalLabel = 'Student Portal';
    navSections = [{
      label: 'Student',
      items: [
        { icon: '📊', label: 'Dashboard', href: '/student/dashboard.html' },
        { icon: '🏫', label: 'Teaching Groups', href: '/student/groups.html' },
        { icon: '📅', label: 'Attendance & Calendar', href: '/student/attendance.html' },
        { icon: '🗓️', label: 'My Timetable', href: '/student/timetable.html' },
        { icon: '📝', label: 'My Assignments', href: '/student/assignments.html' },
        { icon: '🧾', label: 'Apply for Leave', href: '/student/leave.html' },
        { icon: '🧮', label: 'My Test Scores', href: '/student/scores.html' }
      ]
    }];
  }

  // Build link HTML
  function buildLinks(sections) {
    return sections.map(section => {
      const links = section.items.map(item => {
        const hrefLower = item.href.toLowerCase();
        const isActive = (hrefLower.includes('?') ? currentUrl === hrefLower : currentPath === hrefLower)
          || (item.href.endsWith('dashboard.html') && currentPath.endsWith('/'));
        return `
          <a href="${item.href}" ${item.id ? `id="${item.id}"` : ''}
             class="sidebar-item ${isActive ? 'active' : ''}"
             onclick="if(window.innerWidth<=768)closeSidebar()" style="position:relative;">
            <span class="sidebar-item-icon">${item.icon}</span>
            <span>${item.label}</span>
            ${item.hasBadge ? `<span id="${item.id}-badge" style="display:none;position:absolute;right:0.65rem;top:50%;transform:translateY(-50%);background:var(--status-absent);color:white;border-radius:9999px;min-width:18px;height:18px;font-size:0.65rem;font-weight:700;align-items:center;justify-content:center;padding:0 5px;"></span>` : ''}
          </a>`;
      }).join('');
      return `<div class="sidebar-section-label">${section.label}</div>${links}`;
    }).join('');
  }

  // Safe escape helper for HTML attributes
  const safeAttr = (s) => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Extract initials for executive avatar
  const userInitials = (displayName || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('') || 'U';

  const sidebarHtml = `
    <aside id="app-sidebar" class="app-sidebar" aria-label="Site Navigation">

      <!-- Executive Profile Card -->
      <div class="sidebar-user-card">
        <div class="sidebar-user-top">
          <span class="sidebar-role-pill">${safeAttr(roleBadge)}</span>
          <button type="button" class="sidebar-close-btn" onclick="closeSidebar()" aria-label="Close sidebar" title="Close sidebar">✕</button>
        </div>
        <div class="sidebar-user-profile">
          <div class="sidebar-avatar">
            <span>${userInitials}</span>
            <span class="sidebar-avatar-status" title="Status: Online"></span>
          </div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name" title="${safeAttr(displayName)}">${displayName}</div>
            <div class="sidebar-user-email" title="${safeAttr(email)}">${email}</div>
          </div>
        </div>
      </div>

      <!-- Scoped Navigation Links -->
      <div class="sidebar-links">
        ${buildLinks(navSections)}
      </div>

      <!-- Institutional Footer Tier -->
      <div class="sidebar-footer">
        <div class="sidebar-footer-row">
          <div class="sidebar-system-pill">
            <span class="sidebar-system-dot"></span>
            <span>VidyaOS &bull; ${safeAttr(portalLabel)}</span>
          </div>
          <button type="button" class="sidebar-logout-btn" onclick="logout()" title="Sign out of system">
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
    <div id="sidebar-backdrop" class="sidebar-backdrop" onclick="closeSidebar()"></div>
  `;

  document.body.insertAdjacentHTML('afterbegin', sidebarHtml);

  // Restore sidebar state (open on desktop by default)
  const isDesktop = window.innerWidth >= 769;
  const savedOpen = _getSidebarState();
  const shouldOpen = isDesktop ? (savedOpen !== false) : false;
  if (shouldOpen) {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.add('sidebar-open');
    document.body.classList.add('sidebar-open');
    const btn = document.getElementById('sidebar-toggle-btn');
    if (btn) btn.setAttribute('aria-pressed', 'true');
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  // Async: load pending registration count badge for Department Teachers / Class Teachers
  if (user.is_class_teacher || user.department_id || user.teacher?.department_id || user.is_hod) {
    _loadNavPendingBadge();
  }
}

// ─────────────────────────────────────────────────────────
// UNIVERSAL INSTITUTIONAL PAGE FOOTER (.app-footer)
// ─────────────────────────────────────────────────────────
function renderFooter() {
  if (document.querySelector('.app-footer')) return;
  const footerHtml = `
    <footer class="app-footer" role="contentinfo">
      <div class="app-footer-inner">
        <div class="app-footer-brand">
          <span style="font-size: 1.25rem;">🏛️</span>
          <div>
            <div style="font-weight: 700; color: var(--text-main);">VidyaOS — Institutional Campus Operating System</div>
            <div class="app-footer-copy">Autonomous College Attendance &amp; Academic Management Platform &copy; 2026-27</div>
          </div>
        </div>
        <div class="app-footer-status">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--status-present); display: inline-block;"></span>
          <span>Autonomous Session Active &bull; Offline-First Engine</span>
        </div>
        <div class="app-footer-links">
          <a href="/index.html">System Home</a>
          <span>&bull;</span>
          <a href="#" onclick="if (typeof showToast === 'function') { showToast('VidyaOS Institutional Platform Documentation v2.4.1 (Offline-First Edition)', 'info'); } return false;">Documentation</a>
          <span>&bull;</span>
          <span style="font-size: 0.72rem; color: var(--text-muted);">Build v2.4.1</span>
        </div>
      </div>
    </footer>
  `;
  const main = document.querySelector('main');
  if (main && main.parentNode) {
    main.insertAdjacentHTML('afterend', footerHtml);
  } else {
    document.body.insertAdjacentHTML('beforeend', footerHtml);
  }
}

// ─────────────────────────────────────────────────────────
// MOBILE BOTTOM NAVIGATION BAR (.mobile-bottom-nav)
// ─────────────────────────────────────────────────────────
function renderMobileBottomNav(user) {
  if (document.querySelector('.mobile-bottom-nav') || !user) return;
  const currentPath = window.location.pathname.toLowerCase();

  let tabs = [];
  if (user.roles?.includes('SYSTEM_ADMIN') || currentPath.includes('/admin/')) {
    tabs = [
      { icon: '🏠', label: 'Home', href: '/admin/dashboard.html' },
      { icon: '🏛️', label: 'Structure', href: '/admin/academic-structure.html' },
      { icon: '👨‍🏫', label: 'Faculty', href: '/admin/faculty.html' },
      { icon: '☰', label: 'Menu', isMenu: true }
    ];
  } else if (user.roles?.includes('TEACHER') || currentPath.includes('/faculty/')) {
    tabs = [
      { icon: '🏠', label: 'Home', href: '/faculty/dashboard.html' },
      { icon: '📖', label: 'Registers', href: '/faculty/registers.html' },
      { icon: '👥', label: 'Students', href: '/faculty/students.html' },
      { icon: '☰', label: 'Menu', isMenu: true }
    ];
  } else if (user.roles?.includes('STUDENT') || currentPath.includes('/student/')) {
    tabs = [
      { icon: '🏠', label: 'Home', href: '/student/dashboard.html' },
      { icon: '📅', label: 'Attendance', href: '/student/attendance.html' },
      { icon: '🧮', label: 'Scores', href: '/student/scores.html' },
      { icon: '☰', label: 'Menu', isMenu: true }
    ];
  }

  if (!tabs.length) return;

  const itemsHtml = tabs.map(tab => {
    if (tab.isMenu) {
      return `
        <button type="button" class="mobile-nav-item" onclick="toggleSidebar()" aria-label="Open Navigation Menu">
          <span class="mobile-nav-icon">${tab.icon}</span>
          <span class="mobile-nav-label">${tab.label}</span>
        </button>
      `;
    }
    const isActive = currentPath === tab.href.toLowerCase() ||
      (tab.href.endsWith('dashboard.html') && (currentPath.endsWith('/') || currentPath.endsWith('index.html')));
    return `
      <a href="${tab.href}" class="mobile-nav-item ${isActive ? 'active' : ''}">
        <span class="mobile-nav-icon">${tab.icon}</span>
        <span class="mobile-nav-label">${tab.label}</span>
      </a>
    `;
  }).join('');

  const navHtml = `
    <nav class="mobile-bottom-nav" aria-label="Mobile Quick Navigation">
      <div class="mobile-bottom-nav-inner">
        ${itemsHtml}
      </div>
    </nav>
  `;
  document.body.insertAdjacentHTML('beforeend', navHtml);
}

// ─────────────────────────────────────────────────────────
// PENDING REGISTRATION BADGE (Nav Drawer — Class Teachers)
// ─────────────────────────────────────────────────────────
async function _loadNavPendingBadge() {
  try {
    const token = getAuthToken();
    if (!token) return;
    const res = await fetch('/api/v1/students/registrations/count', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const json = await res.json();
    const count = json?.data?.count;
    if (count && count > 0) {
      const badge = document.getElementById('nav-students-item-badge');
      if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
      }
    }
  } catch (_) {
    // silently ignore — badge is a non-critical enhancement
  }
}

// ─────────────────────────────────────────────────────────
// THEME MANAGEMENT (Dark / Light Mode)
// ─────────────────────────────────────────────────────────
function initAppTheme() {
  const savedTheme = localStorage.getItem('app_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeToggleUI(savedTheme);
}

function updateThemeToggleUI(theme) {
  const tag = document.getElementById('theme-mode-tag');
  const icon = document.getElementById('theme-toggle-icon');
  const title = document.getElementById('theme-toggle-title');
  const desc = document.getElementById('theme-toggle-desc');

  if (theme === 'dark') {
    if (tag) { tag.textContent = 'DARK 🌙'; tag.style.color = 'var(--color-primary-light)'; }
    if (icon) icon.textContent = '☀️';
    if (title) title.textContent = 'Light Mode';
    if (desc) desc.textContent = 'Switch to light appearance';
  } else {
    if (tag) { tag.textContent = 'LIGHT ☀️'; tag.style.color = 'var(--text-muted)'; }
    if (icon) icon.textContent = '🌙';
    if (title) title.textContent = 'Dark Mode';
    if (desc) desc.textContent = 'Switch to dark appearance';
  }
}

function toggleAppTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const nextTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nextTheme);
  localStorage.setItem('app_theme', nextTheme);
  updateThemeToggleUI(nextTheme);
  if (typeof showToast === 'function') {
    showToast(`Appearance changed to ${nextTheme === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️'}`, 'info', 2000);
  }
}

// ─────────────────────────────────────────────────────────
// USER DROPDOWN CONTROLS
// ─────────────────────────────────────────────────────────
function toggleUserDropdown(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const menu = document.getElementById('user-dropdown-menu');
  const chevron = document.getElementById('top-profile-chevron');
  if (!menu) return;
  const isOpen = menu.classList.toggle('open');
  if (chevron) {
    chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  }
}

function closeUserDropdown() {
  const menu = document.getElementById('user-dropdown-menu');
  const chevron = document.getElementById('top-profile-chevron');
  if (menu) menu.classList.remove('open');
  if (chevron) chevron.style.transform = 'rotate(0deg)';
}

// ─────────────────────────────────────────────────────────
// QUICK PASSWORD CHANGE MODAL
// ─────────────────────────────────────────────────────────
function openQuickPasswordModal() {
  closeUserDropdown();
  let modal = document.getElementById('quick-password-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'quick-password-modal';
    modal.className = 'quick-modal-backdrop';
    modal.onclick = function(e) { if (e.target === modal) closeQuickPasswordModal(); };
    modal.innerHTML = `
      <div class="quick-modal-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
          <div>
            <h2 style="font-size: 1.15rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 0.5rem; color: var(--text-main);">
              <span>🔑</span>
              <span>Change Account Password</span>
            </h2>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0.2rem 0 0 0;">
              Update your institutional account credentials securely.
            </p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeQuickPasswordModal()" style="border-radius: 50%; width: 30px; height: 30px; padding: 0; display: flex; align-items: center; justify-content: center;" aria-label="Close modal">✕</button>
        </div>

        <form id="quick-password-form" onsubmit="handleQuickPasswordSubmit(event)">
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" for="quick-curr-pass" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.35rem; display: block;">Current Password</label>
            <div style="position: relative; display: flex; align-items: center;">
              <input type="password" id="quick-curr-pass" class="form-control" required placeholder="••••••••" style="width: 100%; padding-right: 40px;">
              <button type="button" onclick="toggleQuickPassView('quick-curr-pass', this)" style="position: absolute; right: 8px; background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 4px;" aria-label="Toggle password visibility">👁️</button>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" for="quick-new-pass" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.35rem; display: block;">New Password (min 8 chars)</label>
            <div style="position: relative; display: flex; align-items: center;">
              <input type="password" id="quick-new-pass" class="form-control" required minlength="8" placeholder="••••••••" style="width: 100%; padding-right: 40px;">
              <button type="button" onclick="toggleQuickPassView('quick-new-pass', this)" style="position: absolute; right: 8px; background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 4px;" aria-label="Toggle password visibility">👁️</button>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.25rem;">
            <label class="form-label" for="quick-confirm-pass" style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.35rem; display: block;">Confirm New Password</label>
            <div style="position: relative; display: flex; align-items: center;">
              <input type="password" id="quick-confirm-pass" class="form-control" required minlength="8" placeholder="••••••••" style="width: 100%; padding-right: 40px;">
              <button type="button" onclick="toggleQuickPassView('quick-confirm-pass', this)" style="position: absolute; right: 8px; background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 4px;" aria-label="Toggle password visibility">👁️</button>
            </div>
          </div>

          <div id="quick-pass-msg" style="display: none; font-size: 0.8rem; padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); margin-bottom: 1rem;"></div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" class="btn btn-secondary" onclick="closeQuickPasswordModal()">Cancel</button>
            <button type="submit" id="quick-pass-btn" class="btn btn-primary" style="font-weight: 700;">Update Password</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  setTimeout(() => {
    const input = document.getElementById('quick-curr-pass');
    if (input) input.focus();
  }, 100);
}

function closeQuickPasswordModal() {
  const modal = document.getElementById('quick-password-modal');
  if (modal) {
    modal.style.display = 'none';
    const form = document.getElementById('quick-password-form');
    if (form) form.reset();
    const msg = document.getElementById('quick-pass-msg');
    if (msg) msg.style.display = 'none';
  }
}

function toggleQuickPassView(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.textContent = '🙈';
  } else {
    inp.type = 'password';
    btn.textContent = '👁️';
  }
}

async function handleQuickPasswordSubmit(event) {
  event.preventDefault();
  const curr = document.getElementById('quick-curr-pass')?.value || '';
  const newP = document.getElementById('quick-new-pass')?.value || '';
  const conf = document.getElementById('quick-confirm-pass')?.value || '';
  const btn = document.getElementById('quick-pass-btn');
  const msg = document.getElementById('quick-pass-msg');

  if (newP !== conf) {
    if (msg) {
      msg.style.display = 'block';
      msg.style.background = 'var(--status-absent-bg)';
      msg.style.color = 'var(--status-absent)';
      msg.textContent = 'New passwords do not match. Please verify.';
    }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }

  try {
    const token = getAuthToken();
    const res = await fetch('/api/v1/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ current_password: curr, new_password: newP })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.data?.access_token) {
        localStorage.setItem('access_token', data.data.access_token);
      }
      if (typeof showToast === 'function') {
        showToast('Password updated successfully!', 'success');
      }
      closeQuickPasswordModal();
    } else {
      if (msg) {
        msg.style.display = 'block';
        msg.style.background = 'var(--status-absent-bg)';
        msg.style.color = 'var(--status-absent)';
        msg.textContent = data.error?.message || 'Failed to update password.';
      }
    }
  } catch (err) {
    if (msg) {
      msg.style.display = 'block';
      msg.style.background = 'var(--status-absent-bg)';
      msg.style.color = 'var(--status-absent)';
      msg.textContent = err.message || 'Network error updating password.';
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Update Password'; }
  }
}

// ─────────────────────────────────────────────────────────
// EXECUTIVE USER TOP-RIGHT NAV WITH FLOATING DROPDOWN
// ─────────────────────────────────────────────────────────
function renderUserNav() {
  const user = getCurrentUser();
  const navContainer = document.getElementById('user-nav');
  if (!navContainer || !user) return;

  const currentPath = window.location.pathname.toLowerCase();
  const displayName = getUserDisplayName(user);
  const email = user.email || user.username || 'System Account';

  let profileHref = '/index.html';
  let roleChipText = 'USER';
  let roleClass = 'chip-user';
  let avatarRoleClass = 'role-user';
  let avatarContent = '👤';

  if (user.roles?.includes('STUDENT')) {
    profileHref = '/student/profile.html';
    roleChipText = 'Student';
    roleClass = 'chip-student';
    avatarRoleClass = 'role-student';
    avatarContent = '🎓';
  } else if (user.roles?.includes('TEACHER')) {
    profileHref = '/faculty/profile.html';
    if (user.is_hod) {
      roleChipText = 'HOD';
      roleClass = 'chip-hod';
      avatarRoleClass = 'role-hod';
    } else if (user.is_common_faculty_manager || user.roles?.includes('COMMON_FACULTY_MANAGER')) {
      roleChipText = 'Common Mgr';
      roleClass = 'chip-hod';
      avatarRoleClass = 'role-hod';
    } else if (user.is_class_teacher) {
      roleChipText = 'Class Teacher';
      roleClass = 'chip-classteacher';
      avatarRoleClass = 'role-classteacher';
    } else {
      roleChipText = 'Faculty';
      roleClass = 'chip-faculty';
      avatarRoleClass = 'role-classteacher';
    }
    // Calculate initials
    const cleanName = displayName.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim();
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      avatarContent = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length >= 2) {
      avatarContent = parts[0].substring(0, 2).toUpperCase();
    } else {
      avatarContent = 'T';
    }
  } else if (user.roles?.includes('SYSTEM_ADMIN')) {
    profileHref = '/admin/profile.html';
    roleChipText = 'Admin';
    roleClass = 'chip-admin';
    avatarRoleClass = 'role-admin';
    avatarContent = 'SA';
  } else if (currentPath.includes('/admin/')) {
    profileHref = '/admin/profile.html';
    roleChipText = 'Admin';
    roleClass = 'chip-admin';
    avatarRoleClass = 'role-admin';
    avatarContent = 'SA';
  } else if (currentPath.includes('/student/')) {
    profileHref = '/student/profile.html';
    roleChipText = 'Student';
    roleClass = 'chip-student';
    avatarRoleClass = 'role-student';
    avatarContent = '🎓';
  } else if (currentPath.includes('/faculty/')) {
    profileHref = '/faculty/profile.html';
    roleChipText = 'Faculty';
    roleClass = 'chip-faculty';
    avatarRoleClass = 'role-classteacher';
    avatarContent = 'T';
  }

  const isProfileActive = currentPath.endsWith('/profile.html') || currentPath.endsWith('profile.html');

  navContainer.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.65rem;">
      <!-- IN-APP NOTIFICATIONS (Section 55) -->
      <div class="notification-bell-container" id="notification-bell-container">
        <button type="button" class="notification-bell-btn" id="notification-bell-btn" onclick="toggleNotificationDropdown(event)" aria-label="Notifications" title="Notifications">
          <span>🔔</span>
          <span class="notification-badge" id="notification-badge" style="display: none;">0</span>
        </button>
        <div class="notification-dropdown-menu" id="notification-dropdown-menu" onclick="event.stopPropagation()">
          <div class="notification-header">
            <div style="display: flex; align-items: center;">
              <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-main);">Notifications</span>
              <span class="notification-unread-tag" id="notification-unread-tag">0 new</span>
            </div>
            <button type="button" class="mark-all-read-btn" onclick="markAllNotificationsRead(event)">Mark all read</button>
          </div>
          <div class="notification-list" id="notification-list">
            <div class="notification-empty">No notifications</div>
          </div>
        </div>
      </div>

      <!-- EXECUTIVE USER PILL -->
      <div class="top-profile-container">
        <button type="button" class="top-profile-pill ${isProfileActive ? 'active' : ''}" id="top-profile-btn" onclick="toggleUserDropdown(event)" aria-haspopup="true" aria-expanded="false" title="Account Menu (${displayName})">
          <div class="top-profile-avatar ${avatarRoleClass}">
            <span>${avatarContent}</span>
            <div class="top-profile-beacon" title="Session Active"></div>
          </div>
          <div class="top-profile-meta">
            <span class="top-profile-name">${displayName}</span>
            <div class="top-profile-role">
              <span class="top-profile-chip ${roleClass}">${roleChipText}</span>
            </div>
          </div>
          <span class="top-profile-chevron" id="top-profile-chevron" aria-hidden="true">▼</span>
        </button>

        <!-- FLOATING EXECUTIVE USER DROPDOWN -->
        <div class="user-dropdown-menu" id="user-dropdown-menu" aria-labelledby="top-profile-btn">
          <div class="user-dropdown-header">
            <div class="dropdown-avatar-wrap">
              <div class="dropdown-avatar ${avatarRoleClass}">${avatarContent}</div>
            </div>
            <div class="dropdown-user-details">
              <div class="dropdown-user-name">${displayName}</div>
              <div class="dropdown-user-email">${email}</div>
              <div class="dropdown-badge-row">
                <span class="top-profile-chip ${roleClass}">${roleChipText}</span>
              </div>
            </div>
          </div>

          <div class="user-dropdown-divider"></div>

          <div class="user-dropdown-items">
            <a href="${profileHref}" class="user-dropdown-item ${isProfileActive ? 'active-item' : ''}" onclick="closeUserDropdown()">
              <span class="dropdown-item-icon">👤</span>
              <div class="dropdown-item-text">
                <div class="dropdown-item-title">My Profile & Identity</div>
                <div class="dropdown-item-desc">View credentials & allocations</div>
              </div>
            </a>

            <button type="button" class="user-dropdown-item" onclick="openQuickPasswordModal()">
              <span class="dropdown-item-icon">🔑</span>
              <div class="dropdown-item-text">
                <div class="dropdown-item-title">Change Password</div>
                <div class="dropdown-item-desc">Quick security update</div>
              </div>
            </button>

            <button type="button" class="user-dropdown-item" onclick="toggleAppTheme()">
              <span class="dropdown-item-icon" id="theme-toggle-icon">🌓</span>
              <div class="dropdown-item-text">
                <div class="dropdown-item-title" id="theme-toggle-title">Dark Mode</div>
                <div class="dropdown-item-desc" id="theme-toggle-desc">Switch color appearance</div>
              </div>
              <span class="theme-mode-tag" id="theme-mode-tag">LIGHT</span>
            </button>
          </div>

          <div class="user-dropdown-divider"></div>

          <div class="user-dropdown-footer">
            <button type="button" class="dropdown-logout-btn" onclick="logout()" title="Sign out of system">
              <span>Sign Out</span>
              <span>🚪</span>
            </button>
          </div>
        </div>
      </div>

      <button type="button" class="top-logout-btn" onclick="logout()" title="Sign out of system">
        <span>Logout</span>
        <span style="font-size: 0.9em;">🚪</span>
      </button>
    </div>
  `;

  const savedTheme = localStorage.getItem('app_theme') || 'light';
  updateThemeToggleUI(savedTheme);

  // Poll for unread notification count
  fetchNotificationUnreadCount();
  if (typeof window !== 'undefined' && !window.__notificationPollInterval) {
    window.__notificationPollInterval = setInterval(fetchNotificationUnreadCount, 45000);
  }
}

// ─────────────────────────────────────────────────────────
// IN-APP NOTIFICATIONS POPUP CONTROLLER (Section 55)
// ─────────────────────────────────────────────────────────

function getNotificationIcon(type) {
  switch (type) {
    case 'FACULTY_APPROVAL':
    case 'STUDENT_APPROVAL':
      return '✅';
    case 'GROUP_INVITE':
      return '👥';
    case 'ASSIGNMENT_POSTED':
      return '📚';
    case 'ASSIGNMENT_GRADED':
      return '💯';
    case 'TEST_MARKS_PUBLISHED':
      return '📝';
    case 'ATTENDANCE_NOTICE':
      return '⏱️';
    default:
      return '📢';
  }
}

async function fetchNotificationUnreadCount() {
  const token = typeof getAuthToken === 'function' ? getAuthToken() : (typeof getAccessToken === 'function' ? getAccessToken() : localStorage.getItem('access_token'));
  if (!token) return;
  try {
    const res = await fetchApi('/notifications/unread-count');
    if (res && res.success && res.data) {
      updateNotificationBadge(res.data.unreadCount || 0);
    }
  } catch (_) {}
}

function updateNotificationBadge(unreadCount) {
  const badge = document.getElementById('notification-badge');
  const tag = document.getElementById('notification-unread-tag');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
  if (tag) {
    tag.textContent = `${unreadCount} new`;
  }
}

async function loadNotifications() {
  const list = document.getElementById('notification-list');
  if (!list) return;
  list.innerHTML = `<div class="notification-empty" style="padding: 1.5rem;">Loading notifications...</div>`;

  try {
    const res = await fetchApi('/notifications?limit=20');
    if (res && res.success && Array.isArray(res.data)) {
      updateNotificationBadge(res.unreadCount || 0);
      if (res.data.length === 0) {
        list.innerHTML = `<div class="notification-empty">No notifications yet.</div>`;
        return;
      }
      list.innerHTML = res.data.map(n => {
        const timeAgo = formatTimeAgo(n.created_at);
        const icon = getNotificationIcon(n.type);
        const unreadClass = n.is_read ? '' : 'unread';
        const link = n.link_url ? n.link_url : '#';

        return `
          <div class="notification-item ${unreadClass}" onclick="handleNotificationClick(${n.id}, '${link}', event)">
            <div class="notification-item-icon">${icon}</div>
            <div class="notification-item-content">
              <div class="notification-item-title">${escapeAuthHtml(n.title)}</div>
              <div class="notification-item-msg">${escapeAuthHtml(n.message)}</div>
              <div class="notification-item-time">${timeAgo}</div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      list.innerHTML = `<div class="notification-empty">Unable to load notifications.</div>`;
    }
  } catch (_) {
    list.innerHTML = `<div class="notification-empty">Unable to load notifications.</div>`;
  }
}

function toggleNotificationDropdown(e) {
  if (e) e.stopPropagation();
  closeUserDropdown();
  const dropdown = document.getElementById('notification-dropdown-menu');
  if (!dropdown) return;
  const isOpen = dropdown.classList.contains('open');
  if (isOpen) {
    dropdown.classList.remove('open');
  } else {
    dropdown.classList.add('open');
    loadNotifications();
  }
}

function closeNotificationDropdown() {
  const dropdown = document.getElementById('notification-dropdown-menu');
  if (dropdown) dropdown.classList.remove('open');
}

async function markAllNotificationsRead(e) {
  if (e) e.stopPropagation();
  try {
    await fetchApi('/notifications/mark-all-read', { method: 'PUT' });
    updateNotificationBadge(0);
    await loadNotifications();
  } catch (_) {}
}

async function handleNotificationClick(id, linkUrl, e) {
  if (e) e.preventDefault();
  try {
    await fetchApi(`/notifications/${id}/read`, { method: 'PUT' });
  } catch (_) {}
  closeNotificationDropdown();
  if (linkUrl && linkUrl !== '#') {
    window.location.href = linkUrl;
  } else {
    fetchNotificationUnreadCount();
  }
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function escapeAuthHtml(text) {
  if (text == null) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Global outside click listener to close dropdowns
document.addEventListener('click', (e) => {
  if (!e.target.closest('.top-profile-container')) {
    closeUserDropdown();
  }
  if (!e.target.closest('.notification-bell-container')) {
    closeNotificationDropdown();
  }
});

// Auto-initialize theme on script execution
if (typeof document !== 'undefined') {
  initAppTheme();
}
