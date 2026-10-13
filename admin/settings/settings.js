/**
 * ══════════════════════════════════════════════════════════════
 * PAGE LOGIC: SETTINGS
 * frontend/admin/settings/settings.js
 * ══════════════════════════════════════════════════════════════
 */

guardRoute(['SYSTEM_ADMIN']);

async function loadSettings(isManual = false) {
  try {
    const res = await fetchApi('/admin/settings');
    if (res.success && res.data) {
      const s = res.data.map || res.data || {};
      const elName = document.getElementById('setting-inst-name');
      const elCode = document.getElementById('setting-inst-code');
      const elAffil = document.getElementById('setting-affiliating-body');
      const elLoc = document.getElementById('setting-location');

      if (elName) elName.value   = s.institution_name  || 'Government Polytechnic College';
      if (elCode) elCode.value   = s.institution_code  || 'GP-UBTER-101';
      if (elAffil) elAffil.value = s.affiliating_body  || 'UBTER (Uttarakhand Board of Technical Education) / IRDT';
      if (elLoc) elLoc.value     = s.campus_location   || 'Uttarakhand, India';

      if (typeof updateLivePreview === 'function') updateLivePreview();
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

function updateLivePreview() {
  const name  = document.getElementById('setting-inst-name')?.value?.trim()        || 'Government Polytechnic College';
  const code  = document.getElementById('setting-inst-code')?.value?.trim()        || 'GP-UBTER-101';
  const affil = document.getElementById('setting-affiliating-body')?.value?.trim() || 'UBTER / IRDT Uttarakhand';
  const loc   = document.getElementById('setting-location')?.value?.trim()         || 'Uttarakhand, India';

  const pName = document.getElementById('preview-inst-name');
  if (pName) pName.textContent = name;
  const pCode = document.getElementById('preview-inst-code');
  if (pCode) pCode.textContent = code;
  const pAffil = document.getElementById('preview-affil');
  if (pAffil) pAffil.textContent = affil + ' \u2022 ' + loc;
  const pNameVal = document.getElementById('preview-name-val');
  if (pNameVal) pNameVal.textContent = name;
  const pCodeVal = document.getElementById('preview-code-val');
  if (pCodeVal) pCodeVal.textContent = code;
  const pBoardVal = document.getElementById('preview-board-val');
  if (pBoardVal) pBoardVal.textContent = affil || '\u2014';
  const pCampusVal = document.getElementById('preview-campus-val');
  if (pCampusVal) pCampusVal.textContent = loc || '\u2014';
}

function resetToOfficialDefaults() {
  const elName = document.getElementById('setting-inst-name');
  const elCode = document.getElementById('setting-inst-code');
  const elAffil = document.getElementById('setting-affiliating-body');
  const elLoc = document.getElementById('setting-location');

  if (elName) elName.value   = 'Government Polytechnic College';
  if (elCode) elCode.value   = 'GP-UBTER-101';
  if (elAffil) elAffil.value = 'UBTER (Uttarakhand Board of Technical Education) / IRDT';
  if (elLoc) elLoc.value     = 'Uttarakhand, India';

  if (typeof updateLivePreview === 'function') updateLivePreview();
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

    try {
      const res = await fetchApi('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          settings: {
            institution_name: document.getElementById('setting-inst-name')?.value?.trim() || '',
            institution_code: document.getElementById('setting-inst-code')?.value?.trim() || '',
            affiliating_body: document.getElementById('setting-affiliating-body')?.value?.trim() || '',
            campus_location:  document.getElementById('setting-location')?.value?.trim() || ''
          }
        })
      });
      if (res.success) {
        if (typeof showToast === 'function') showToast('Institutional settings saved successfully', 'success');
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

loadSettings();
