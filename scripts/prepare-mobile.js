/**
 * prepare-mobile.js
 * Synchronizes frontend web assets into Capacitor's `www/` directory for Android APK packaging.
 * Injects mobile-bridge.js into HTML entry points for native API routing and OTA updates.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const WWW_DIR = path.join(ROOT_DIR, 'www');

const DIRS_TO_COPY = ['admin', 'faculty', 'student', 'login', 'landing', 'images', 'frontendv2', 'shared'];
const FILES_TO_COPY = ['index.html', 'register.html', 'mobile-bridge.js', 'app-version.json'];

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

console.log('[Mobile Build] Preparing www/ directory for Capacitor Android build...');

if (!fs.existsSync(WWW_DIR)) {
  fs.mkdirSync(WWW_DIR, { recursive: true });
}

// Copy directories
for (const dir of DIRS_TO_COPY) {
  const src = path.join(ROOT_DIR, dir);
  const dest = path.join(WWW_DIR, dir);
  if (fs.existsSync(src)) {
    console.log(`[Mobile Build] Copying ${dir}/...`);
    copyRecursiveSync(src, dest);
  }
}

// Copy files
for (const file of FILES_TO_COPY) {
  const src = path.join(ROOT_DIR, file);
  const dest = path.join(WWW_DIR, file);
  if (fs.existsSync(src)) {
    console.log(`[Mobile Build] Copying ${file}...`);
    fs.copyFileSync(src, dest);
  }
}

// Scan and inject mobile-bridge.js into HTML files in www
function injectMobileBridge(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      injectMobileBridge(fullPath);
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('mobile-bridge.js')) {
        // Compute relative path to root mobile-bridge.js
        const relPath = path.relative(path.dirname(fullPath), path.join(WWW_DIR, 'mobile-bridge.js')).replace(/\\/g, '/');
        const scriptTag = `\n  <script src="${relPath.startsWith('.') ? relPath : './' + relPath}"></script>\n`;
        if (content.includes('</head>')) {
          content = content.replace('</head>', `${scriptTag}</head>`);
        } else if (content.includes('</body>')) {
          content = content.replace('</body>', `${scriptTag}</body>`);
        }
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

console.log('[Mobile Build] Injecting mobile-bridge into HTML entry points...');
injectMobileBridge(WWW_DIR);

// Generate direct mobile entry point at www/index.html (bypasses marketing landing page)
const mobileIndexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>VidyaOS</title>
  <script>window.VIDYAOS_FORCE_NATIVE = true;</script>
  <script src="/mobile-bridge.js"></script>
  <script>
    (function () {
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
        const userRaw = localStorage.getItem('user') || localStorage.getItem('auth_user') || localStorage.getItem('currentUser');
        if (token && userRaw) {
          const user = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw;
          const role = (user.role || (Array.isArray(user.roles) ? user.roles[0] : '') || '').toLowerCase();
          if (role === 'student') {
            window.location.replace('/student/home/index.html');
            return;
          } else if (role === 'teacher' || role === 'faculty' || role === 'hod') {
            window.location.replace('/faculty/classes/index.html');
            return;
          } else if (role === 'admin') {
            window.location.replace('/admin/academic-structure/index.html');
            return;
          }
        }
      } catch (_) {}
      window.location.replace('/login/index.html');
    })();
  </script>
  <style>
    body {
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      color: #94a3b8;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <div>Launching VidyaOS...</div>
</body>
</html>`;

fs.writeFileSync(path.join(WWW_DIR, 'index.html'), mobileIndexHtml, 'utf8');
console.log('[Mobile Build] Created direct mobile sign-in entry point at www/index.html');

// Stamp current version into mobile-bridge.js in www
let appVersion = '1.0.1';
try {
  const vData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'app-version.json'), 'utf8'));
  if (vData.version) appVersion = vData.version;
} catch (_) {}

const bridgePath = path.join(WWW_DIR, 'mobile-bridge.js');
if (fs.existsSync(bridgePath)) {
  let bridgeContent = fs.readFileSync(bridgePath, 'utf8');
  if (!bridgeContent.startsWith('window.VIDYAOS_FORCE_NATIVE = true;')) {
    bridgeContent = 'window.VIDYAOS_FORCE_NATIVE = true;\n' + bridgeContent;
  }
  bridgeContent = bridgeContent.replace(
    /window\.VIDYAOS_APP_VERSION = .*?;/g,
    `window.VIDYAOS_APP_VERSION = '${appVersion}';`
  );
  fs.writeFileSync(bridgePath, bridgeContent, 'utf8');
  console.log(`[Mobile Build] Stamped version ${appVersion} and FORCE_NATIVE into mobile-bridge.js`);
}

console.log('[Mobile Build] ✅ Capacitor www directory prepared successfully!');
