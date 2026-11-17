/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: ADMIN EXECUTIVE DASHBOARD (dashboard.js)
 * frontend/admin/dashboard/dashboard.js
 * 
 * - Guarded for SYSTEM_ADMIN role
 * - Dynamic institutional branding fetched from Admin Settings
 *   (/api/v1/admin/settings & localStorage 'institutionSettings')
 *   - College Name (#dash-inst-name)
 *   - College Tagline (#dash-inst-tagline)
 *   - College Logo (#dash-inst-logo)
 *   - Campus Banner Photo (#dash-inst-banner)
 * - Real-time institutional stats (/api/v1/admin/stats)
 *   - 3 KPI stat cards: Total Students, Departments, Total Faculty
 * - 6 Quick Access Portals
 * ══════════════════════════════════════════════════════════════
 */

// Window object with any-cast for TypeScript / IDE language service compatibility
/** @type {any} */
const win = typeof window !== 'undefined' ? window : {};

// 1. RBAC Guard: Restrict page strictly to System Administrators
if (typeof win.guardRoute === 'function') {
  win.guardRoute(['SYSTEM_ADMIN']);
}

const DEFAULT_BRANDING = {
  institution_name: 'Government Polytechnic College',
  institution_tagline: 'Uttarakhand | NBA Compliant',
  institution_logo_url: '/uploads/branding/college_logo_1794620864273_107645.png',
  institution_banner_url: '/admin/dashboard/campus-nainital.jpg'
};

/**
 * 2. Institutional Branding Synchronization
 * Dynamically fetches and applies College Name, Tagline, Logo, and Campus Banner Photo
 */
function applyBrandingData(s) {
  if (!s) return;

  const elName = document.getElementById('dash-inst-name');
  const elTagline = document.getElementById('dash-inst-tagline');
  const elLogo = /** @type {HTMLImageElement | null} */ (document.getElementById('dash-inst-logo'));
  const elBanner = /** @type {HTMLImageElement | null} */ (document.getElementById('dash-inst-banner'));

  function resolveBrandingUrl(url, fallback) {
    if (!url) return fallback;
    if (typeof window !== 'undefined' && (window.VIDYAOS_IS_NATIVE || window.VIDYAOS_FORCE_NATIVE)) {
      if (url.startsWith('/uploads')) {
        return (window.VIDYAOS_CLOUD_BACKEND || 'https://vidyaos-backend.onrender.com') + url;
      }
    }
    return url;
  }

  const name = s.institution_name || DEFAULT_BRANDING.institution_name;
  const tagline = s.institution_tagline || DEFAULT_BRANDING.institution_tagline;
  const logoUrl = resolveBrandingUrl(s.institution_logo_url || DEFAULT_BRANDING.institution_logo_url, '/images/collegelogo.jpeg');
  const bannerUrl = resolveBrandingUrl(s.institution_banner_url || DEFAULT_BRANDING.institution_banner_url, '/images/campus-nainital.jpg');

  if (elName) elName.textContent = name;
  if (elTagline) elTagline.textContent = tagline;

  if (elLogo && logoUrl) {
    elLogo.src = logoUrl;
    elLogo.onerror = () => {
      elLogo.onerror = null;
      elLogo.src = '/images/collegelogo.jpeg';
    };
  }

  if (elBanner && bannerUrl) {
    elBanner.src = bannerUrl;
    elBanner.onerror = () => {
      elBanner.onerror = null;
      elBanner.src = '/images/campus-nainital.jpg';
    };
  }
}

async function loadInstitutionalBranding() {
  // 1. Instant paint from cached localStorage if available
  try {
    const cached = localStorage.getItem('institutionSettings');
    if (cached) {
      applyBrandingData(JSON.parse(cached));
    }
  } catch (_) { }

  // 2. Fetch fresh settings from backend API
  try {
    const fetchFn = win.fetchApi;
    if (!fetchFn) return;

    const res = await fetchFn('/admin/settings');
    if (res && res.success && res.data) {
      const s = res.data.map || res.data || {};
      const payload = {
        institution_name: s.institution_name || DEFAULT_BRANDING.institution_name,
        institution_tagline: s.institution_tagline || DEFAULT_BRANDING.institution_tagline,
        institution_code: s.institution_code || 'GP-UBTER-101',
        institution_logo_url: s.institution_logo_url || DEFAULT_BRANDING.institution_logo_url,
        institution_banner_url: s.institution_banner_url || DEFAULT_BRANDING.institution_banner_url
      };

      applyBrandingData(payload);

      try {
        localStorage.setItem('institutionSettings', JSON.stringify(payload));
      } catch (_) { }
    }
  } catch (err) {
    console.warn('[AdminDashboard] Using default institutional branding:', err);
    applyBrandingData(DEFAULT_BRANDING);
  }
}

// Listen for live updates broadcast from the Settings page
window.addEventListener('institution-settings-updated', (e) => {
  if (e && e.detail) {
    applyBrandingData(e.detail);
  }
});

window.addEventListener('storage', (e) => {
  if (e.key === 'institutionSettings' && e.newValue) {
    try {
      applyBrandingData(JSON.parse(e.newValue));
    } catch (_) { }
  }
});

/**
 * 3. Load Real-Time Institutional Statistics (/api/v1/admin/stats)
 */
let adminStatsData = null;

async function loadAdminStats() {
  try {
    const fetchFn = win.fetchApi;
    if (!fetchFn) return;

    const res = await fetchFn('/admin/stats');
    if (res && res.success && res.data) {
      const d = res.data;
      adminStatsData = d;

      // Update KPI Stat cards
      const elStudents = document.getElementById('stat-students');
      const elDepts = document.getElementById('stat-departments');
      const elTeachers = document.getElementById('stat-teachers');

      const totalStudents = Number(d.total_enrolled_students ?? d.total_students ?? 48);
      const totalDepartments = Number(d.total_departments ?? 6);
      const totalTeachers = Number(d.total_teachers ?? 5);

      if (elStudents) elStudents.innerText = totalStudents ? totalStudents.toLocaleString() : '48';
      if (elDepts) elDepts.innerText = totalDepartments.toLocaleString();
      if (elTeachers) elTeachers.innerText = totalTeachers.toLocaleString();
    }
  } catch (err) {
    console.warn('[AdminDashboard] Failed to load real-time stats:', err);
  }
}

/**
 * 4. Populate Session User Identity
 */
function populateUserIdentity() {
  const getUserFn = win.getCurrentUser;
  const user = getUserFn ? getUserFn() : null;
  if (!user) return;

  const displayName = user.full_name || user.name || user.username || 'System Administrator';

  const elHeaderName = document.getElementById('top-header-user-name');
  if (elHeaderName) elHeaderName.textContent = displayName;

  const elInitials = document.getElementById('header-user-initials');
  const elMobileInitials = document.getElementById('mobile-user-initials');

  const parts = displayName.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : displayName.slice(0, 2).toUpperCase();

  if (elInitials) elInitials.textContent = initials || 'SA';
  if (elMobileInitials) elMobileInitials.textContent = (user.username === 'admin' || !user.full_name) ? 'SA' : (initials ? initials[0] : 'SA');
}

/**
 * 5. Master Page Initialization
 */
(async function init() {
  populateUserIdentity();
  await loadInstitutionalBranding();
  await loadAdminStats();
})();
