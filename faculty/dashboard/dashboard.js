/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY / HOD DASHBOARD CONTROLLER (dashboard.js)
 * Clean, Modular, Fully Dynamic (Zero Hardcoded Data)
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // 1. Auth Guard
  const curUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const curRoles = curUser && Array.isArray(curUser.roles) ? curUser.roles : [];
  const isSysAdmin = curRoles.includes('SYSTEM_ADMIN') || curRoles.includes('ADMIN') || curUser?.role === 'SYSTEM_ADMIN' || curUser?.role === 'ADMIN' || Boolean(curUser?.is_admin);
  if (isSysAdmin) {
    window.location.replace('/admin/dashboard/index.html');
    return;
  }

  if (typeof requireFacultyAuth === 'function') {
    requireFacultyAuth(['TEACHER', 'HOD']);
  } else if (typeof guardRoute === 'function') {
    guardRoute({ roles: ['TEACHER', 'HOD'] });
  }

  const DEFAULTS = {
    institution_name: 'Government Polytechnic College',
    campus_name: 'Nainital Campus',
    institution_logo_url: '/images/collegelogo.jpeg',
    institution_banner_url: '/images/campus-nainital.jpg'
  };

  /**
   * 2. DYNAMIC INSTITUTIONAL HERO SECTION (Linked with Admin Settings)
   */
  function applyInstitutionSettings(settings) {
    if (!settings) return;

    if (typeof window.applyBrandingData === 'function') {
      window.applyBrandingData(settings);
    }

    const logoSlot = document.getElementById('hero-logo-slot');
    const titleEl = document.getElementById('hero-inst-title');
    const bannerSlot = document.getElementById('hero-banner-slot');

    function resolveBrandingUrl(url, fallback) {
      if (!url) return fallback;
      if (typeof window !== 'undefined' && (window.VIDYAOS_IS_NATIVE || window.VIDYAOS_FORCE_NATIVE)) {
        if (url.startsWith('/uploads')) {
          return (window.VIDYAOS_CLOUD_BACKEND || 'https://vidyaos-backend.onrender.com') + url;
        }
      }
      return url;
    }

    const instName = settings.institution_name || settings.name || DEFAULTS.institution_name;
    const logoUrl = resolveBrandingUrl(settings.institution_logo_url || settings.logo_url || DEFAULTS.institution_logo_url, '/images/collegelogo.jpeg');
    const bannerUrl = resolveBrandingUrl(settings.institution_banner_url || settings.banner_url || DEFAULTS.institution_banner_url, '/images/campus-nainital.jpg');
    const campusName = settings.campus_name || settings.institution_tagline || DEFAULTS.campus_name;

    if (titleEl) {
      titleEl.textContent = instName;
      document.title = `${instName} — Faculty Dashboard`;
    }

    if (logoSlot) {
      logoSlot.innerHTML = `<img src="${logoUrl}" alt="${instName} Logo" onerror="this.onerror=null;this.src='/images/collegelogo.jpeg';">`;
    }

    if (bannerSlot) {
      if (bannerUrl) {
        bannerSlot.innerHTML = `<img src="${bannerUrl}" alt="${instName} Campus" onerror="this.onerror=null;this.style.display='none';this.parentElement.innerText='${campusName}';">`;
      } else {
        bannerSlot.textContent = campusName;
      }
    }
  }

  async function loadInstitutionBranding() {
    // A. Instant Hydration from localStorage Cache
    try {
      const cached = localStorage.getItem('institutionSettings');
      if (cached) {
        applyInstitutionSettings(JSON.parse(cached));
      }
    } catch (_) { }

    // B. Live Fetch from Admin Settings API
    try {
      const fetchFn = typeof fetchApi === 'function' ? fetchApi : async (url) => {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const res = await fetch(`/api/v1${url}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return await res.json();
      };

      const res = await fetchFn('/settings/institution');
      if (res && res.success && res.data) {
        localStorage.setItem('institutionSettings', JSON.stringify(res.data));
        applyInstitutionSettings(res.data);
      }
    } catch (err) {
      console.warn('[Dashboard] Using cached or default institution branding:', err.message);
    }
  }

  // Listen for live updates triggered by Admin Settings modal or page
  window.addEventListener('institution-settings-updated', function (e) {
    if (e.detail) applyInstitutionSettings(e.detail);
  });

  /**
   * 3. DYNAMIC DEPARTMENT, USER & HOD ROLE HYDRATION
   */
  async function loadUserAndDepartment() {
    function updateDeptUI(u) {
      if (!u) return;
      const deptEl = document.getElementById('dash-dept-name');
      if (deptEl) {
        const deptName = u.department_name || u.dept_name || (u.department && typeof u.department === 'object' ? u.department.name : null) || u.department || 'Academic Department';
        deptEl.textContent = deptName;
      }
      const isHod = Boolean(
        u.role === 'HOD' ||
        (Array.isArray(u.roles) && u.roles.includes('HOD')) ||
        u.is_hod === 1 || u.is_hod === true
      );
      const facultyTile = document.getElementById('qa-tile-faculty');
      if (facultyTile) {
        facultyTile.style.display = isHod ? '' : 'none';
      }
    }

    let user = null;
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('auth_user');
      if (raw) {
        user = JSON.parse(raw);
        updateDeptUI(user);
      }
    } catch (_) { }

    try {
      const fetchFn = typeof fetchApi === 'function' ? fetchApi : async (url, opts = {}) => {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const res = await fetch(`/api/v1${url}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          ...opts
        });
        return await res.json();
      };

      const res = await fetchFn('/auth/me', { suppressToast: true });
      if (res && res.success && res.data) {
        user = res.data;
        localStorage.setItem('user', JSON.stringify(user));
        updateDeptUI(user);
      }
    } catch (_) { }
  }

  /**
   * 4. DYNAMIC TEACHING CLASSES COUNT
   */
  async function loadTeachingClassesCount() {
    const badgeEl = document.getElementById('badge-teaching-count');
    try {
      const fetchFn = typeof fetchApi === 'function' ? fetchApi : async (url) => {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const res = await fetch(`/api/v1${url}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return await res.json();
      };

      const res = await fetchFn('/teaching-groups?status=ALL');
      if (res && res.success && Array.isArray(res.data)) {
        const count = res.data.filter(g => g.status !== 'ARCHIVED').length;
        if (badgeEl) badgeEl.textContent = count;
        const statMyClasses = document.getElementById('stat-my-classes');
        if (statMyClasses) statMyClasses.textContent = count;
      }
    } catch (err) {
      console.warn('[Dashboard] Could not fetch teaching classes count:', err.message);
    }
  }

  /**
   * 5. DYNAMIC 4 KPI METRIC CARDS
   */
  async function loadDashboardKpis() {
    const elFaculty = document.getElementById('kpi-total-faculty');
    const elStudents = document.getElementById('kpi-total-students');
    const elSubjects = document.getElementById('kpi-total-subjects');
    const elRegisters = document.getElementById('kpi-active-registers');

    const fetchFn = typeof fetchApi === 'function' ? fetchApi : async (url, opts = {}) => {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const res = await fetch(`/api/v1${url}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        ...opts
      });
      return await res.json();
    };

    let user = {};
    try {
      user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    } catch (_) {}

    const isHod = Boolean(
      user.is_hod === 1 ||
      user.is_hod === true ||
      user.role === 'HOD' ||
      (Array.isArray(user.roles) && user.roles.includes('HOD'))
    );

    // Attempt HOD department aggregated metrics if user is an HOD
    if (isHod) {
      try {
        const res = await fetchFn('/hod/dashboard', { suppressToast: true });
        if (res && res.success && res.data) {
          const counts = res.data.counts || {};
          if (elFaculty) elFaculty.textContent = counts.teachers ?? 0;
          if (elStudents) elStudents.textContent = counts.students ?? 0;
          if (elSubjects) elSubjects.textContent = counts.subjects ?? 0;
          if (elRegisters) elRegisters.textContent = counts.activeRegisters ?? 0;

          // Sync backward compatibility IDs
          const syncMap = {
            'kpi-dept-faculty': counts.teachers ?? 0,
            'kpi-dept-students': counts.students ?? 0,
            'kpi-dept-subjects': counts.subjects ?? 0,
            'kpi-dept-registers': counts.activeRegisters ?? 0,
            'stat-total-students': counts.students ?? 0,
            'stat-total-subjects': counts.subjects ?? 0
          };
          Object.entries(syncMap).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
          });

          if (res.data.deptInfo?.name) {
            const deptEl = document.getElementById('dash-dept-name');
            if (deptEl) deptEl.textContent = res.data.deptInfo.name;
          }
          return;
        }
      } catch (_) { }
    }

    // Fallback: Teacher Personal Registers and Classes
    try {
      const [regRes, grpRes] = await Promise.allSettled([
        fetchFn('/faculty/registers', { suppressToast: true }),
        fetchFn('/teaching-groups?status=ACTIVE', { suppressToast: true })
      ]);

      let regCount = 0;
      if (regRes.status === 'fulfilled' && regRes.value?.success && Array.isArray(regRes.value.data)) {
        regCount = regRes.value.data.filter(r => r.is_active).length;
        if (elRegisters) elRegisters.textContent = regCount;
      }

      let groups = [];
      if (grpRes.status === 'fulfilled' && grpRes.value?.success && Array.isArray(grpRes.value.data)) {
        groups = grpRes.value.data;
        const totalSubj = new Set(groups.map(g => g.subject_name || g.name)).size;
        if (elSubjects) elSubjects.textContent = totalSubj;

        let totalStudents = 0;
        groups.forEach(g => { totalStudents += (g.student_count || 0); });
        if (elStudents) elStudents.textContent = totalStudents;
      }

      if (elFaculty) elFaculty.textContent = '1';
    } catch (err) {
      console.warn('[Dashboard] Could not load fallback KPIs:', err.message);
    }
  }

  /**
   * 6. TAB SWITCHER COMPATIBILITY
   */
  function switchDashboardTab(tab) {
    if (tab === 'CLASSES') {
      window.location.href = '/faculty/classes/index.html';
      return;
    }
  }

  window.switchDashboardTab = switchDashboardTab;
  window.loadHodDashboardData = loadDashboardKpis;

  /**
   * 7. INITIALIZE ON DOM READY
   */
  async function init() {
    // If URL has ?tab=classes, redirect cleanly to Classroom page
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'classes') {
      window.location.replace('/faculty/classes/index.html');
      return;
    }

    loadInstitutionBranding();
    await loadUserAndDepartment();
    checkAndMountFacultyGoogleConnect();
    loadTeachingClassesCount();
    loadDashboardKpis();
  }

  function checkAndMountFacultyGoogleConnect() {
    try {
      const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
      if (!user || user.google_linked) return;

      const mustNotify = localStorage.getItem('vidya_notify_google_connect') === '1';
      const lastDismissed = parseInt(localStorage.getItem('vidya_dismiss_google_connect_faculty') || '0', 10);
      const now = Date.now();
      if (!mustNotify && (now - lastDismissed < 24 * 60 * 60 * 1000)) {
        return;
      }

      if (document.getElementById('faculty-google-connect-banner')) return;

      const banner = document.createElement('div');
      banner.id = 'faculty-google-connect-banner';
      banner.setAttribute('role', 'alert');
      banner.style.cssText = 'background:linear-gradient(90deg, #1e293b, #0f172a); color:#ffffff; padding:10px 16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; font-size:0.86rem; border-bottom:1px solid #334155; margin-bottom:1rem; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.12);';
      banner.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:260px;">
          <div style="width:28px; height:28px; border-radius:50%; background:#ffffff; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg viewBox="0 0 48 48" width="16" height="16">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </div>
          <div>
            <strong style="color:#ffffff;">Connect Google for 1-Click Login:</strong>
            <span style="color:#cbd5e1; margin-left:4px;">Sign in instantly on PC and mobile next time without entering passwords.</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" onclick="window.location.href='/faculty/profile/index.html'" style="background:linear-gradient(135deg, #2563eb, #1d4ed8); color:#ffffff; border:none; padding:6px 14px; border-radius:8px; font-weight:700; font-size:0.8rem; cursor:pointer; display:flex; align-items:center; gap:5px;">
            <span>Connect Google</span>
            <span>→</span>
          </button>
          <button type="button" onclick="document.getElementById('faculty-google-connect-banner').remove(); localStorage.setItem('vidya_dismiss_google_connect_faculty', Date.now().toString()); localStorage.removeItem('vidya_notify_google_connect');" style="background:transparent; border:none; color:#94a3b8; font-size:18px; cursor:pointer; padding:2px 8px; line-height:1;" title="Dismiss">&times;</button>
        </div>
      `;

      const main = document.querySelector('main') || document.querySelector('.container') || document.body;
      if (main) main.prepend(banner);
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
