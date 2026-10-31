/**
 * VIDYAOS PAGE LOGIC: SETTINGS & INSTITUTIONAL BRANDING
 * Location: /admin/settings/settings.js
 * 100% Theme Token Compliant (Zero Hardcoded Hex Colors)
 */

guardRoute(['SYSTEM_ADMIN']);

const DEFAULT_BRANDING = {
  institution_name: 'Government Polytechnic Nainital',
  institution_tagline: 'Uttarakhand | Completely Adhered to NBA Guidelines',
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
      updateLivePreview();

      // Synchronize in localStorage for instant access across tabs
      try {
        localStorage.setItem('institutionSettings', JSON.stringify({
          institution_name: elName?.value || DEFAULT_BRANDING.institution_name,
          institution_tagline: elTagline?.value || DEFAULT_BRANDING.institution_tagline,
          institution_code: elCode?.value || DEFAULT_BRANDING.institution_code,
          institution_logo_url: logoUrl,
          institution_banner_url: bannerUrl
        }));
      } catch (_) {}

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
  const mLogo = document.getElementById('mockup-logo-img');
  if (pLogo && logoUrl) pLogo.src = logoUrl;
  if (mLogo && logoUrl) mLogo.src = logoUrl;

  const pBanner = document.getElementById('preview-banner-img');
  const mBanner = document.getElementById('mockup-banner-img');
  if (pBanner && bannerUrl) pBanner.src = bannerUrl;
  if (mBanner && bannerUrl) mBanner.src = bannerUrl;
}

function updateLivePreview() {
  const name = document.getElementById('setting-inst-name')?.value?.trim() || DEFAULT_BRANDING.institution_name;
  const tagline = document.getElementById('setting-inst-tagline')?.value?.trim() || DEFAULT_BRANDING.institution_tagline;

  const mName = document.getElementById('mockup-inst-name');
  if (mName) mName.textContent = name;
  const mTagline = document.getElementById('mockup-inst-tagline');
  if (mTagline) mTagline.textContent = tagline;
}

// Live text update listeners
['setting-inst-name', 'setting-inst-tagline'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', updateLivePreview);
});

// Logo File Handler
async function handleLogoFileSelect(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  // Client-side quick preview via FileReader
  const reader = new FileReader();
  reader.onload = async function (e) {
    const dataUrl = e.target.result;
    document.getElementById('setting-inst-logo-url').value = dataUrl;
    updateImagePreviews(dataUrl, document.getElementById('setting-inst-banner-url')?.value);

    // Also attempt server upload
    await uploadBrandingAsset(file, 'logo');
  };
  reader.readAsDataURL(file);
}

// Banner File Handler
async function handleBannerFileSelect(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    const dataUrl = e.target.result;
    document.getElementById('setting-inst-banner-url').value = dataUrl;
    updateImagePreviews(document.getElementById('setting-inst-logo-url')?.value, dataUrl);

    // Also attempt server upload
    await uploadBrandingAsset(file, 'banner');
  };
  reader.readAsDataURL(file);
}

// Upload file to backend /api/v1/admin/branding/upload
async function uploadBrandingAsset(file, type) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const res = await fetch('/api/v1/admin/branding/upload', {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });

    const data = await res.json();
    if (data.success && data.data?.url) {
      if (type === 'logo') {
        document.getElementById('setting-inst-logo-url').value = data.data.url;
      } else {
        document.getElementById('setting-inst-banner-url').value = data.data.url;
      }
      if (typeof showToast === 'function') {
        showToast(`${type === 'banner' ? 'Campus banner' : 'College logo'} uploaded!`, 'success');
      }
    }
  } catch (err) {
    console.warn('Local preview preserved, server upload skipped:', err.message);
  }
}

function resetDefaultLogo() {
  document.getElementById('setting-inst-logo-url').value = DEFAULT_BRANDING.institution_logo_url;
  updateImagePreviews(DEFAULT_BRANDING.institution_logo_url, document.getElementById('setting-inst-banner-url')?.value);
  if (typeof showToast === 'function') showToast('Default college logo restored', 'info');
}

function resetDefaultBanner() {
  document.getElementById('setting-inst-banner-url').value = DEFAULT_BRANDING.institution_banner_url;
  updateImagePreviews(document.getElementById('setting-inst-logo-url')?.value, DEFAULT_BRANDING.institution_banner_url);
  if (typeof showToast === 'function') showToast('Default campus building photo restored', 'info');
}

function resetToOfficialDefaults() {
  const elName = document.getElementById('setting-inst-name');
  const elTagline = document.getElementById('setting-inst-tagline');
  const elCode = document.getElementById('setting-inst-code');
  const elAffil = document.getElementById('setting-affiliating-body');
  const elLoc = document.getElementById('setting-location');
  const elLogo = document.getElementById('setting-inst-logo-url');
  const elBanner = document.getElementById('setting-inst-banner-url');

  if (elName) elName.value = DEFAULT_BRANDING.institution_name;
  if (elTagline) elTagline.value = DEFAULT_BRANDING.institution_tagline;
  if (elCode) elCode.value = DEFAULT_BRANDING.institution_code;
  if (elAffil) elAffil.value = DEFAULT_BRANDING.affiliating_body;
  if (elLoc) elLoc.value = DEFAULT_BRANDING.campus_location;
  if (elLogo) elLogo.value = DEFAULT_BRANDING.institution_logo_url;
  if (elBanner) elBanner.value = DEFAULT_BRANDING.institution_banner_url;

  updateImagePreviews(DEFAULT_BRANDING.institution_logo_url, DEFAULT_BRANDING.institution_banner_url);
  updateLivePreview();
  if (typeof showToast === 'function') {
    showToast('Official UBTER defaults loaded. Click "Save Changes" to apply.', 'info');
  }
}

const form = document.getElementById('identity-form');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-settings-btn');
    if (btn) btn.disabled = true;
    const originalText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = `
      <svg class="spin-anim" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
      <span>Saving...</span>
    `;

    const settingsPayload = {
      institution_name: document.getElementById('setting-inst-name')?.value?.trim() || DEFAULT_BRANDING.institution_name,
      institution_tagline: document.getElementById('setting-inst-tagline')?.value?.trim() || DEFAULT_BRANDING.institution_tagline,
      institution_code: document.getElementById('setting-inst-code')?.value?.trim() || DEFAULT_BRANDING.institution_code,
      affiliating_body: document.getElementById('setting-affiliating-body')?.value?.trim() || DEFAULT_BRANDING.affiliating_body,
      campus_location: document.getElementById('setting-location')?.value?.trim() || DEFAULT_BRANDING.campus_location,
      institution_logo_url: document.getElementById('setting-inst-logo-url')?.value || DEFAULT_BRANDING.institution_logo_url,
      institution_banner_url: document.getElementById('setting-inst-banner-url')?.value || DEFAULT_BRANDING.institution_banner_url
    };

    try {
      const res = await fetchApi('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: settingsPayload })
      });
      if (res.success) {
        // Broadcast to localStorage & window event
        try {
          localStorage.setItem('institutionSettings', JSON.stringify(settingsPayload));
          window.dispatchEvent(new CustomEvent('institution-settings-updated', { detail: settingsPayload }));
        } catch (_) {}

        if (typeof showToast === 'function') showToast('Institutional branding & settings saved successfully', 'success');
        await loadSettings();
      } else {
        throw new Error(res.error?.message || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      if (typeof showToast === 'function') showToast('Failed to save: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  });
}

// Bind functions to window
window.handleLogoFileSelect = handleLogoFileSelect;
window.handleBannerFileSelect = handleBannerFileSelect;
window.resetDefaultLogo = resetDefaultLogo;
window.resetDefaultBanner = resetDefaultBanner;
window.resetToOfficialDefaults = resetToOfficialDefaults;
window.loadSettings = loadSettings;

loadSettings();
