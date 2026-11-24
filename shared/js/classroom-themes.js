/**
 * VidyaOS Classroom Theme & Banner Helper
 * Provides Google Classroom style banner images, card templates, and hero section styling.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ClassroomThemes = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Theme catalog with gradients and fallback styles
  const THEME_DEFS = {
    commerce: {
      key: 'commerce',
      name: 'E-Commerce & Economics',
      gradient: 'linear-gradient(135deg, #1c262f 0%, #283747 50%, #17202a 100%)',
      accent: '#f39c12'
    },
    android: {
      key: 'android',
      name: 'Android & Mobile Development',
      gradient: 'linear-gradient(135deg, #093b39 0%, #0d5c58 50%, #004d40 100%)',
      accent: '#3ddc84'
    },
    literature: {
      key: 'literature',
      name: 'Literature & Books',
      gradient: 'linear-gradient(135deg, #3d141e 0%, #5c1e2b 50%, #421319 100%)',
      accent: '#e17055'
    },
    programming: {
      key: 'programming',
      name: 'Computer Science & Coding',
      gradient: 'linear-gradient(135deg, #0f1c3f 0%, #1e2e62 50%, #111a3b 100%)',
      accent: '#00d2d3'
    },
    mathematics: {
      key: 'mathematics',
      name: 'Mathematics & Engineering',
      gradient: 'linear-gradient(135deg, #1f0b3b 0%, #3a1566 50%, #200735 100%)',
      accent: '#a29bfe'
    },
    science: {
      key: 'science',
      name: 'Science & Chemistry Lab',
      gradient: 'linear-gradient(135deg, #072a36 0%, #0c4a5e 50%, #083342 100%)',
      accent: '#00cec9'
    },
    arts: {
      key: 'arts',
      name: 'Arts & Creative Design',
      gradient: 'linear-gradient(135deg, #380d2a 0%, #61184a 50%, #3e092b 100%)',
      accent: '#fd79a8'
    },
    general_campus: {
      key: 'general_campus',
      name: 'Academic Campus & Diploma',
      gradient: 'linear-gradient(135deg, #0d324d 0%, #175279 50%, #0e3b5c 100%)',
      accent: '#48dbfb'
    }
  };

  const THEME_KEYS = Object.keys(THEME_DEFS);

  const BANNER_POOL = [
    '/uploads/classroom-banners/banner_commerce_2_c285dc.svg',
    '/uploads/classroom-banners/banner_commerce_2_fe6da7.svg',
    '/uploads/classroom-banners/banner_android_3_068a91.svg',
    '/uploads/classroom-banners/banner_literature_4_ace95b.svg',
    '/uploads/classroom-banners/banner_mathematics_5_0bb160.svg',
    '/uploads/classroom-banners/banner_programming_1_c065d9.svg',
    '/uploads/classroom-banners/banner_programming_3_0146f5.svg',
    '/uploads/classroom-banners/banner_programming_4_dac80b.svg',
    '/uploads/classroom-banners/banner_programming_5_bba507.svg',
    '/uploads/classroom-banners/banner_programming_7_de3701.svg',
    '/uploads/classroom-banners/banner_science_7_e015a5.svg',
    '/uploads/classroom-banners/theme_android_fallback.svg',
    '/uploads/classroom-banners/theme_commerce_fallback.svg',
    '/uploads/classroom-banners/theme_literature_fallback.svg',
    '/uploads/classroom-banners/theme_mathematics_fallback.svg',
    '/uploads/classroom-banners/theme_programming_fallback.svg',
    '/uploads/classroom-banners/theme_science_fallback.svg',
    '/uploads/classroom-banners/theme_arts_fallback.svg',
    '/uploads/classroom-banners/theme_general_campus_fallback.svg'
  ];

  /**
   * Generates or picks a random authentic Google Classroom banner for a new classroom
   */
  function getRandomBanner(group = {}) {
    const themeKey = resolveThemeKey(group);
    const matching = BANNER_POOL.filter(b => b.includes(themeKey));
    if (matching.length > 0) {
      return matching[Math.floor(Math.random() * matching.length)];
    }
    return BANNER_POOL[Math.floor(Math.random() * BANNER_POOL.length)];
  }

  /**
   * Resolves a theme key from class text or ID
   */
  function resolveThemeKey(group = {}) {
    const text = `${group.name || ''} ${group.subject_name || ''} ${group.subject_code || ''} ${group.subject_short_name || ''}`.toLowerCase();

    if (text.includes('commerce') || text.includes('business') || text.includes('trade') || text.includes('economic') || text.includes('finance') || text.includes('account')) {
      return 'commerce';
    }
    if (text.includes('android') || text.includes('mobile') || text.includes('kotlin') || text.includes('flutter') || text.includes('swift') || text.includes('app')) {
      return 'android';
    }
    if (text.includes('book') || text.includes('literature') || text.includes('english') || text.includes('hindi') || text.includes('history') || text.includes('language')) {
      return 'literature';
    }
    if (text.includes('code') || text.includes('program') || text.includes('cs') || text.includes('it') || text.includes('software') || text.includes('dsa') || text.includes('web') || text.includes('data') || text.includes('cloud')) {
      return 'programming';
    }
    if (text.includes('math') || text.includes('algebra') || text.includes('calculus') || text.includes('physics') || text.includes('statistic') || text.includes('discrete')) {
      return 'mathematics';
    }
    if (text.includes('science') || text.includes('chem') || text.includes('bio') || text.includes('lab') || text.includes('environment')) {
      return 'science';
    }
    if (text.includes('art') || text.includes('design') || text.includes('ui') || text.includes('ux') || text.includes('graphic') || text.includes('media') || text.includes('animation')) {
      return 'arts';
    }

    const idSeed = Math.abs(parseInt(group.id || group.teacher_id || 1, 10)) || 1;
    return THEME_KEYS[idSeed % THEME_KEYS.length];
  }

  /**
   * Returns the banner URL for a classroom group.
   * If theme_image is set, returns that URL; otherwise returns generated fallback.
   */
  function getBannerUrl(group = {}) {
    if (group && typeof group.theme_image === 'string' && group.theme_image.trim()) {
      const img = group.theme_image.trim();
      if (BANNER_POOL.includes(img)) {
        return img;
      }
    }
    const themeKey = resolveThemeKey(group);
    const matching = BANNER_POOL.filter(b => b.includes(themeKey));
    if (matching.length > 0) {
      const idSeed = Math.abs(parseInt(group.id || 1, 10)) || 0;
      return matching[idSeed % matching.length];
    }
    return `/uploads/classroom-banners/theme_${themeKey}_fallback.svg`;
  }

  /**
   * Applies banner image to a classroom hero banner element (in student/faculty group-detail)
   */
  function applyHeroBanner(bannerEl, group = {}) {
    if (!bannerEl) return;
    const bannerUrl = getBannerUrl(group);
    const themeKey = resolveThemeKey(group);
    const theme = THEME_DEFS[themeKey] || THEME_DEFS.general_campus;

    bannerEl.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%), url('${bannerUrl}')`;
    bannerEl.style.backgroundColor = theme.accent;
    bannerEl.style.backgroundSize = 'cover';
    bannerEl.style.backgroundPosition = 'right center';
    bannerEl.style.backgroundRepeat = 'no-repeat';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Renders a real Google Classroom card (Image 2 style)
   */
  function renderCard(group = {}, options = {}) {
    const isStudent = options.role === 'student' || options.isStudent !== false;
    const title = group.name || group.subject_name || 'Classroom';
    const subTitle = group.subject_code ? `${group.subject_code} • ${group.department_name || group.department_code || 'IT'}` : (group.department_name || 'Institutional Class');
    const teacher = group.teacher_name || group.created_by_name || 'Faculty Instructor';
    const bannerUrl = getBannerUrl(group);
    const linkHref = isStudent 
      ? `/student/group-detail/index.html?id=${group.id}` 
      : `/faculty/group-detail/index.html?id=${group.id}`;
    const pendingTasks = group.pending_work_count || group.pending_assignments_count || 0;

    return `
      <div class="google-classroom-card" id="gc-card-${group.id}" style="background-image: linear-gradient(to right, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.28) 55%, rgba(0,0,0,0) 100%), url('${bannerUrl}');" onclick="window.location.href='${linkHref}'" role="button" tabindex="0">
        <!-- 3-Dot Kebab Menu in top-right -->
        <button type="button" class="gc-card-kebab-btn" onclick="event.stopPropagation(); ClassroomThemes.toggleCardMenu(event, '${group.id}')" title="Classroom Options" aria-label="Classroom Options">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2.2"></circle>
            <circle cx="12" cy="12" r="2.2"></circle>
            <circle cx="12" cy="19" r="2.2"></circle>
          </svg>
        </button>

        <div class="gc-card-menu-dropdown" id="gc-dropdown-${group.id}" onclick="event.stopPropagation()">
          <a href="${linkHref}" class="gc-dropdown-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            <span>Open Classroom</span>
          </a>
          ${isStudent ? `
            ${group.invite_code ? `
              <button type="button" class="gc-dropdown-item" onclick="ClassroomThemes.copyInviteCode('${escapeHtml(group.invite_code)}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Copy Invite Code (${escapeHtml(group.invite_code)})</span>
              </button>
            ` : ''}
            <button type="button" class="gc-dropdown-item item-danger" onclick="if(typeof openDeleteSubjectCardModal==='function'){openDeleteSubjectCardModal(${group.id},'${escapeHtml(title)}');}else{alert('Classroom: ${escapeHtml(title)}');}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Hide Subject Card</span>
            </button>
          ` : `
            <button type="button" class="gc-dropdown-item" onclick="if(typeof openEditClassModal==='function')openEditClassModal(${group.id});">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              <span>Edit Class</span>
            </button>
            <button type="button" class="gc-dropdown-item item-danger" onclick="if(typeof openDeleteClassModal==='function')openDeleteClassModal(${group.id},'${escapeHtml(title)}');">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Move to Trash</span>
            </button>
          `}
        </div>

        <div class="gc-card-content">
          <div class="gc-card-header-info">
            <h2 class="gc-card-heading" title="${escapeHtml(title)}">${escapeHtml(title)}</h2>
            <div class="gc-card-cohort">${escapeHtml(subTitle)}</div>
          </div>
          <div class="gc-card-footer-info">
            <span class="gc-card-faculty">${escapeHtml(teacher)}</span>
            ${options.showTasks && pendingTasks > 0 ? `
              <span class="gc-card-tasks-pill">${pendingTasks} due</span>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function toggleCardMenu(e, id) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById(`gc-dropdown-${id}`);
    if (!dropdown) return;

    // Close other dropdowns
    document.querySelectorAll('.gc-card-menu-dropdown.active').forEach(d => {
      if (d !== dropdown) d.classList.remove('active');
    });

    dropdown.classList.toggle('active');
  }

  function copyInviteCode(code) {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      alert(`Invite code copied: ${code}`);
    }).catch(() => {
      prompt('Copy invite code:', code);
    });
  }

  // Global click outside to close dropdowns
  if (typeof document !== 'undefined') {
    document.addEventListener('click', () => {
      document.querySelectorAll('.gc-card-menu-dropdown.active').forEach(d => d.classList.remove('active'));
    });
  }

  return {
    THEME_DEFS,
    resolveThemeKey,
    getBannerUrl,
    getRandomBanner,
    applyHeroBanner,
    renderCard,
    toggleCardMenu,
    copyInviteCode
  };
}));
