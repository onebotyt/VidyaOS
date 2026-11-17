/**
 * prepare-mobile.js
 * Synchronizes frontend web assets into Capacitor's `www/` directory for Android APK packaging.
 * Injects mobile-bridge.js into HTML entry points for native API routing and OTA updates.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const WWW_DIR = path.join(ROOT_DIR, 'www');

const DIRS_TO_COPY = ['admin', 'faculty', 'student', 'login', 'landing', 'images'];
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

console.log('[Mobile Build] âœ… Capacitor www directory prepared successfully!');
