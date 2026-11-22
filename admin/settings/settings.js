/**
 * ══════════════════════════════════════════════════════════════
 * VIDYAOS PAGE LOGIC: SETTINGS & INSTITUTIONAL BRANDING
 * Location: /admin/settings/settings.js
 * 100% Theme Token Compliant (Zero Hardcoded Hex Colors)
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['SYSTEM_ADMIN']);

const DEFAULT_BRANDING = {
  institution_name: 'Government Polytechnic Nainital',
  institution_tagline: '',
  institution_code: 'GP-UBTER-101',
  affiliating_body: 'UBTER (Uttarakhand Board of Technical Education) / IRDT',
  campus_location: 'Uttarakhand, India',
  institution_logo_url: '/images/college-logo.svg',
  institution_banner_url: '/admin/dashboard/campus-nainital.jpg'
};

async function loadSettings(isManual = false) {
  try {
    const res = await fetchApi('/admin/settings');
    if (res.success && res.data) {
      const s = res.data.map || res.data || {};
      const elName = document.getElementById('setting-inst-name');
      const elTagline = document.getElementById('setting-inst-tagline');
      const elCode = document.getElementById('setting-inst-code');
      const elAffil = document.getElementById('setting-affiliating-body');
      const elLoc = document.getElementById('setting-location');
      const elLogo = document.getElementById('setting-inst-logo-url');
      const elBanner = document.getElementById('setting-inst-banner-url');

      if (elName) elName.value = s.institution_name || DEFAULT_BRANDING.institution_name;
      if (elTagline) elTagline.value = s.institution_tagline || DEFAULT_BRANDING.institution_tagline;
      if (elCode) elCode.value = s.institution_code || DEFAULT_BRANDING.institution_code;
      if (elAffil) elAffil.value = s.affiliating_body || DEFAULT_BRANDING.affiliating_body;
      if (elLoc) elLoc.value = s.campus_location || DEFAULT_BRANDING.campus_location;

      const logoUrl = s.institution_logo_url || DEFAULT_BRANDING.institution_logo_url;
      const bannerUrl = s.institution_banner_url || DEFAULT_BRANDING.institution_banner_url;

      if (elLogo) elLogo.value = logoUrl;
      if (elBanner) elBanner.value = bannerUrl;

      // Update image previews
      updateImagePreviews(logoUrl, bannerUrl);

      // Synchronize in localStorage for instant access across tabs
      try {
        localStorage.setItem('institutionSettings', JSON.stringify({
          institution_name: elName?.value || DEFAULT_BRANDING.institution_name,
          institution_tagline: elTagline?.value || DEFAULT_BRANDING.institution_tagline,
          institution_code: elCode?.value || DEFAULT_BRANDING.institution_code,
          institution_logo_url: logoUrl,
          institution_banner_url: bannerUrl
        }));
      } catch (_) { }

      if (isManual && typeof showToast === 'function') {
        showToast('Settings reloaded from database', 'info');
      }
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
    if (isManual && typeof showToast === 'function') {
      showToast('Failed to load settings', 'error');
    }
  }
}

function updateImagePreviews(logoUrl, bannerUrl) {
  const pLogo = document.getElementById('preview-logo-img');
  if (pLogo && logoUrl) pLogo.src = logoUrl;

  const pBanner = document.getElementById('preview-banner-img');
  if (pBanner && bannerUrl) pBanner.src = bannerUrl;
}

// Client-side canvas downscaler
function downscaleImage(file, maxWidth, maxHeight, quality = 0.85) {
  return new Promise((resolve) => {
    if (!file) return resolve({ dataUrl: '', blob: null });
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => resolve({ dataUrl: e.target.result, blob: file });
      reader.onerror = () => resolve({ dataUrl: '', blob: file });
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mime, quality);
      canvas.toBlob((blob) => resolve({ dataUrl, blob: blob || file }), mime, quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ dataUrl: '', blob: file });
    };
    img.src = url;
  });
}

async function handleLogoFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  try {
    const { dataUrl } = await downscaleImage(file, 512, 512, 0.9);
    if (dataUrl) {
      document.getElementById('setting-inst-logo-url').value = dataUrl;
      const pLogo = document.getElementById('preview-logo-img');
      if (pLogo) pLogo.src = dataUrl;
      showToast('Logo preview updated. Click "Save Changes" to apply.', 'info');
    }
  } catch (err) {
    showToast('Failed to read logo image: ' + err.message, 'error');
  }
}

async function handleBannerFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  try {
    const { dataUrl } = await downscaleImage(file, 1600, 600, 0.82);
    if (dataUrl) {
      document.getElementById('setting-inst-banner-url').value = dataUrl;
      const pBanner = document.getElementById('preview-banner-img');
      if (pBanner) pBanner.src = dataUrl;
      showToast('Campus banner preview updated. Click "Save Changes" to apply.', 'info');
    }
  } catch (err) {
    showToast('Failed to read campus banner: ' + err.message, 'error');
  }
}

function resetDefaultLogo() {
  document.getElementById('setting-inst-logo-url').value = DEFAULT_BRANDING.institution_logo_url;
  const pLogo = document.getElementById('preview-logo-img');
  if (pLogo) pLogo.src = DEFAULT_BRANDING.institution_logo_url;
  showToast('Reset to default college logo', 'info');
}

function resetDefaultBanner() {
  document.getElementById('setting-inst-banner-url').value = DEFAULT_BRANDING.institution_banner_url;
  const pBanner = document.getElementById('preview-banner-img');
  if (pBanner) pBanner.src = DEFAULT_BRANDING.institution_banner_url;
  showToast('Reset to default campus image', 'info');
}

// ── Submit Institutional Settings ──
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('identity-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('save-settings-btn');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spin-anim" style="display:inline-block; animation:spin 1s linear infinite;">⏳</span> <span>Saving...</span>`;
      }

      const payload = {
        institution_name: document.getElementById('setting-inst-name')?.value.trim() || DEFAULT_BRANDING.institution_name,
        institution_tagline: document.getElementById('setting-inst-tagline')?.value.trim() || '',
        institution_code: document.getElementById('setting-inst-code')?.value.trim() || DEFAULT_BRANDING.institution_code,
        affiliating_body: document.getElementById('setting-affiliating-body')?.value.trim() || DEFAULT_BRANDING.affiliating_body,
        campus_location: document.getElementById('setting-location')?.value.trim() || DEFAULT_BRANDING.campus_location,
        institution_logo_url: document.getElementById('setting-inst-logo-url')?.value.trim() || DEFAULT_BRANDING.institution_logo_url,
        institution_banner_url: document.getElementById('setting-inst-banner-url')?.value.trim() || DEFAULT_BRANDING.institution_banner_url
      };

      try {
        const res = await fetchApi('/admin/settings', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (res && res.success) {
          showToast('Institution settings saved successfully', 'success');
          try {
            localStorage.setItem('institutionSettings', JSON.stringify(payload));
          } catch (_) { }
        } else {
          showToast(res?.error?.message || 'Failed to save settings', 'error');
        }
      } catch (err) {
        showToast('Error saving settings: ' + err.message, 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> <span>Save Changes</span>`;
        }
      }
    });
  }

  loadSettings();
});

// Window exports for inline handlers
window.loadSettings = loadSettings;
window.handleLogoFileSelect = handleLogoFileSelect;
window.handleBannerFileSelect = handleBannerFileSelect;
window.resetDefaultLogo = resetDefaultLogo;
window.resetDefaultBanner = resetDefaultBanner;
