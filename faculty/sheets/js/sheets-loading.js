/* ══════════════════════════════════════════════════════════════
   OFFICE ENGINE FULLSCREEN GRAY LOADING OVERLAY (PREVENTS EXTRA CLICKS)
   ══════════════════════════════════════════════════════════════ */

var _officeLoaderTimer = null;

function showOfficeScreenLoader(msg = 'Loading...') {
  const loader = document.getElementById('office-engine-loader');
  const txt = document.getElementById('office-loader-status');
  if (txt) txt.textContent = msg;
  if (loader) {
    loader.style.display = 'flex';
    loader.classList.remove('hidden');
    if (_officeLoaderTimer) clearTimeout(_officeLoaderTimer);
    // Hard safety timeout: loader never stays stuck for more than 15000ms
    _officeLoaderTimer = setTimeout(() => {
      hideOfficeScreenLoader();
    }, 15000);
  }
}

function hideOfficeScreenLoader() {
  const loader = document.getElementById('office-engine-loader');
  if (loader) {
    loader.style.display = 'none';
    loader.classList.add('hidden');
  }
  if (_officeLoaderTimer) {
    clearTimeout(_officeLoaderTimer);
    _officeLoaderTimer = null;
  }
}

function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('sheets-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'sheets-toast-container';
    toastContainer.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `sheets-toast toast-${type}`;
  toast.style.cssText = 'pointer-events:all;padding:0.6rem 1.1rem;background:var(--bg-card);color:var(--text-main);border:1px solid var(--border-color);border-radius:var(--radius-md,8px);box-shadow:0 8px 24px hsla(220,30%,10%,0.18);font-size:0.82rem;font-weight:600;display:flex;align-items:center;gap:0.5rem;animation:officeFadeIn 0.15s ease-out;';
  toast.textContent = message;

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(() => { toast.remove(); }, 250);
  }, 2200);
}

// Window Globals
window.showOfficeScreenLoader = showOfficeScreenLoader;
window.hideOfficeScreenLoader = hideOfficeScreenLoader;
window.showToast = showToast;
