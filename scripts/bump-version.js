const fs = require('fs');
const path = require('path');

const runNum = process.env.BUILD_NUM || process.env.GITHUB_RUN_NUMBER || process.argv[2];
let buildNum = parseInt(runNum, 10);
if (isNaN(buildNum) || buildNum <= 0) {
  try {
    const gradle = fs.readFileSync('android/app/build.gradle', 'utf8');
    const match = gradle.match(/versionCode\s+(\d+)/);
    buildNum = match ? parseInt(match[1], 10) + 1 : 12;
  } catch (_) {
    buildNum = 12;
  }
}

const version = `1.0.${buildNum}`;
console.log(`[Version Bumper] Setting App Version to ${version} (versionCode ${buildNum})`);

// 1. Update app-version.json
const repo = process.env.GITHUB_REPOSITORY || 'onebotyt/VidyaOS';
const appVersion = {
  version,
  buildNumber: buildNum,
  releaseDate: new Date().toISOString().split('T')[0],
  appName: 'VidyaOS',
  apkUrl: `https://github.com/${repo}/releases/latest/download/VidyaOS.apk`,
  releaseNotes: `Automated build ${version} with instant cloud sync and mobile attendance studio.`
};
fs.writeFileSync('app-version.json', JSON.stringify(appVersion, null, 2) + '\n');

// 2. Update package.json
const pkgPath = 'package.json';
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

// 3. Update android/app/build.gradle
const gradlePath = 'android/app/build.gradle';
if (fs.existsSync(gradlePath)) {
  let g = fs.readFileSync(gradlePath, 'utf8');
  g = g.replace(/versionCode\s+\d+/, `versionCode ${buildNum}`);
  g = g.replace(/versionName\s+".*?"/, `versionName "${version}"`);
  fs.writeFileSync(gradlePath, g);
}

// 4. Update mobile-bridge.js
const mbPath = 'mobile-bridge.js';
if (fs.existsSync(mbPath)) {
  let mb = fs.readFileSync(mbPath, 'utf8');
  mb = mb.replace(/window\.VIDYAOS_APP_VERSION = '.*?';/, `window.VIDYAOS_APP_VERSION = '${version}';`);
  fs.writeFileSync(mbPath, mb);
}
const wwwMbPath = 'www/mobile-bridge.js';
if (fs.existsSync(wwwMbPath)) {
  let mb = fs.readFileSync(wwwMbPath, 'utf8');
  mb = mb.replace(/window\.VIDYAOS_APP_VERSION = '.*?';/, `window.VIDYAOS_APP_VERSION = '${version}';`);
  fs.writeFileSync(wwwMbPath, mb);
}

console.log(`[Version Bumper] Successfully stamped version ${version}`);
