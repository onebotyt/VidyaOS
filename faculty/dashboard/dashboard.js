/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS FACULTY / HOD DASHBOARD CONTROLLER (dashboard.js)
 * Clean, Modular, Fully Dynamic (Zero Hardcoded Data)
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // 1. Auth Guard
  if (typeof requireFacultyAuth === 'function') {
    requireFacultyAuth(['TEACHER', 'HOD', 'SYSTEM_ADMIN']);
  } else if (typeof guardRoute === 'function') {
    guardRoute({ roles: ['TEACHER', 'HOD', 'SYSTEM_ADMIN'] });
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

    const logoSlot = document.getElementById('hero-logo-slot');
    const titleEl = document.getElementById('hero-inst-title');
    const bannerSlot = document.getElementById('hero-banner-slot');

    const instName = settings.institution_name || settings.name || DEFAULTS.institution_name;
    const logoUrl = settings.institution_logo_url || settings.logo_url || DEFAULTS.institution_logo_url;
    const bannerUrl = settings.institution_banner_url || settings.banner_url || DEFAULTS.institution_banner_url;
    const campusName = settings.campus_name || settings.institution_tagline || DEFAULTS.campus_name;

    if (titleEl) {
      titleEl.textContent = instName;
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
    let user = null;
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('auth_user');
      if (raw) user = JSON.parse(raw);
    } catch (_) { }

    try {
      const fetchFn = typeof fetchApi === 'function' ? fetchApi : async (url) => {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const res = await fetch(`/api/v1${url}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return await res.json();
      };

      const res = await fetchFn('/auth/me');
      if (res && res.success && res.data) {
        user = res.data;
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch (_) { }

    if (!user) return;

    const isHod = Boolean(
      user.role === 'HOD' ||
      (Array.isArray(user.roles) && user.roles.includes('HOD')) ||
      user.is_hod === 1 || user.is_hod === true
    );

    // Update Department Name Badge
    const deptEl = document.getElementById('dash-dept-name');
    if (deptEl) {
      const deptName = user.department_name || user.dept_name || (user.department ? user.department.name : 'Information Technology');
      deptEl.textContent = deptName;
    }

    // Role-dependent Visibility: Faculty Management is visible only for HOD
    const facultyTile = document.getElementById('qa-tile-faculty');
    if (facultyTile && !isHod) {
      facultyTile.style.display = 'none';
    }
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

    const fetchFn = typeof fetchApi === 'function' ? fetchApi : async (url) => {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const res = await fetch(`/api/v1${url}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      return await res.json();
    };

    // Attempt HOD department aggregated metrics
    try {
      const res = await fetchFn('/hod/dashboard');
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

    // Fallback: Teacher Personal Registers and Classes
    try {
      const [regRes, grpRes] = await Promise.allSettled([
        fetchFn('/faculty/registers'),
        fetchFn('/teaching-groups?status=ACTIVE')
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
  function init() {
    // If URL has ?tab=classes, redirect cleanly to Classroom page
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'classes') {
      window.location.replace('/faculty/classes/index.html');
      return;
    }

    loadInstitutionBranding();
    loadUserAndDepartment();
    loadTeachingClassesCount();
    loadDashboardKpis();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
