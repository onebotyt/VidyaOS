/**
 * VidyaOS Frontend — Local Development Server
 * =============================================
 * Mirrors the vercel.json routing rules and proxies /api/v1/* and /uploads/*
 * to the backend.
 *
 * Usage:  node server.js
 * Env:    PORT=5001  BACKEND_URL=http://localhost:3001
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load .env manually (no extra deps needed)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .forEach(line => {
      const [key, ...rest] = line.split('=');
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    });
}

const PORT = parseInt(process.env.PORT || '5000', 10);
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const ROOT = __dirname;

// ─── MIME types ──────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
};

// ─── Static rewrites (mirrors vercel.json) ───────────────────────────────────
const STATIC_REWRITES = [
  // Shared assets

  // Login page assets (isolated — not in shared/)
  // login/index.css and login/index.js live at login/ root
  // (no rewrite needed — direct paths work)

  // Frontend v2 Isolated SPA Rewrites
  [/^\/v2\/?$/, '/v2/index.html'],
  [/^\/v2\/(.+)$/, '/v2/$1'],
  [/^\/views\/(.+)$/, '/v2/views/$1'],
  [/^\/css\/(auth-loader\.css|v2\.css)$/, '/v2/css/$1'],

  // Login
  [/^\/login\/?$/, '/login/index.html'],
  [/^\/login\.html$/, '/login/index.html'],
  [/^\/register\/?$/, '/login/register/index.html'],
  [/^\/register\.html$/, '/login/register/index.html'],
  [/^\/login\/register\/?$/, '/login/register/index.html'],
  [/^\/login\/register\.html$/, '/login/register/index.html'],
  [/^\/login\/student-register\.html$/, '/login/register/index.html?role=student'],
  [/^\/login\/faculty-register\.html$/, '/login/register/index.html?role=faculty'],
  [/^\/login\/student-register$/, '/login/register/index.html?role=student'],
  [/^\/login\/faculty-register$/, '/login/register/index.html?role=faculty'],

  // Admin
  [/^\/admin\/?$/, '/admin/dashboard/index.html'],
  [/^\/admin\/academic_structure\.html$/, '/admin/academic-structure/index.html'],
  [/^\/admin\/audit_logs\.html$/, '/admin/audit-logs/index.html'],
  [/^\/admin\/departments\/?$/, '/admin/academic-structure/index.html?tab=departments'],
  [/^\/admin\/departments\.html$/, '/admin/academic-structure/index.html?tab=departments'],
  [/^\/admin\/faculty-management(\.html)?\/?$/, '/admin/faculty-management/index.html'],
  [/^\/admin\/faculty(\.html)?\/?$/, '/admin/faculty-management/index.html'],
  [/^\/admin\/hod(-management)?(\.html)?\/?$/, '/admin/faculty-management/index.html'],
  [/^\/admin\/faculty\/(.+)$/, '/admin/faculty-management/$1'],

  // Faculty
  [/^\/faculty\/?$/, '/faculty/dashboard/index.html'],
  [/^\/faculty\/dashboard(\.html)?\/?$/, '/faculty/dashboard/index.html'],
  [/^\/faculty\/classes(\.html)?\/?$/, '/faculty/classes/index.html'],
  [/^\/faculty\/groups(\.html)?\/?$/, '/faculty/classes/index.html'],
  [/^\/faculty\/analytics\/?$/, '/faculty/reports/index.html?tab=analytics'],
  [/^\/faculty\/assignments\/?$/, '/faculty/registers/index.html?tab=assignments'],
  [/^\/faculty\/tests\/?$/, '/faculty/registers/index.html?tab=marks'],
  [/^\/faculty\/marks\/?$/, '/faculty/registers/index.html?tab=marks'],
  [/^\/faculty\/attendance\/quick\/?$/, '/faculty/registers/index.html'],
  [/^\/faculty\/classwork\/create(\.html)?\/?$/, '/faculty/classwork/create/index.html'],

  // Student
  [/^\/student\/dashboard\/?$/, '/student/dashboard/index.html'],
  [/^\/student\/attendance\/?$/, '/student/attendance/index.html'],
  [/^\/student\/assignments\/?$/, '/student/assignments/index.html'],
  [/^\/student\/scores\/?$/, '/student/scores/index.html'],
  [/^\/student\/timetable\/?$/, '/student/timetable/index.html'],
  [/^\/student\/leave\/?$/, '/student/leave/index.html'],
  [/^\/student\/profile\/?$/, '/student/profile/index.html'],
  [/^\/faculty\/group[ -]detail(\/index\.html)?\/?$/, '/faculty/group-detail/index.html'],
  [/^\/student\/group[ -]detail(\/index\.html)?\/?$/, '/student/group-detail/index.html'],
  [/^\/faculty\/theory[ -_]classes(\.html|\/index\.html)?\/?$/, '/faculty/course-file/index.html?type=theory'],
  [/^\/faculty\/lab[ -_]classes(\.html|\/index\.html)?\/?$/, '/faculty/course-file/index.html?type=lab'],
  [/^\/faculty\/student[ -_]performance(\.html|\/index\.html)?\/?$/, '/faculty/course-file/index.html?type=performance'],
  [/^\/faculty\/direct[ -_]assessment(\.html|\/index\.html)?\/?$/, '/faculty/course-file/index.html?type=direct'],
  [/^\/faculty\/indirect[ -_]assessment(\.html|\/index\.html)?\/?$/, '/faculty/course-file/index.html?type=indirect'],
  [/^\/faculty\/assessment[ -_]process(\.html|\/index\.html)?\/?$/, '/faculty/course-file/index.html?type=nba'],
  [/^\/faculty\/course[ -_]file(\.html|\/index\.html)?\/?$/, '/faculty/course-file/index.html'],

  // Generic section/:page pattern
  [/^\/(admin|faculty|student)\/([a-zA-Z0-9_ -]+)\/?$/, '/$1/$2/index.html'],
  [/^\/(admin|faculty|student)\/([a-zA-Z0-9_ -]+)\.html$/, '/$1/$2/index.html'],
];

// ─── Resolve request path via rewrites ───────────────────────────────────────
function resolveRewrite(reqPath, query) {
  for (const [pattern, replacement] of STATIC_REWRITES) {
    if (pattern.test(reqPath)) {
      let resolved = reqPath.replace(pattern, replacement);
      // Carry over original query params (but don't double-append)
      if (query && !resolved.includes('?')) {
        resolved += '?' + query;
      } else if (query && resolved.includes('?')) {
        resolved += '&' + query;
      }
      return resolved;
    }
  }
  return null;
}

// ─── Serve a local file ───────────────────────────────────────────────────────
function serveFile(filePath, res, status = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const stat = fs.statSync(filePath);
  const isStaticAsset = ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2'].includes(ext);
  const cacheHeader = isStaticAsset ? 'public, max-age=86400, stale-while-revalidate=604800' : 'no-cache';
  res.writeHead(status, {
    'Content-Type': mime,
    'Content-Length': stat.size,
    'Cache-Control': cacheHeader,
  });
  fs.createReadStream(filePath).pipe(res);
}

const CLOUD_FALLBACK = 'https://vidyaos-backend.onrender.com';

// ─── Proxy to backend ─────────────────────────────────────────────────────────
function sendProxyRequest(targetUrlStr, req, res, bodyBuffer) {
  const target = new url.URL(targetUrlStr);
  const isHttps = target.protocol === 'https:';
  const headers = { ...req.headers, host: target.host };
  delete headers['connection'];
  delete headers['content-length'];
  if (bodyBuffer && bodyBuffer.length) {
    headers['content-length'] = Buffer.byteLength(bodyBuffer);
  }

  const options = {
    hostname: target.hostname,
    port: target.port || (isHttps ? 443 : 80),
    path: req.url,
    method: req.method,
    headers: headers,
    timeout: 15000
  };

  const mod = isHttps ? https : http;
  const proxyReq = mod.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    if (targetUrlStr !== CLOUD_FALLBACK) {
      console.log(`[proxy] Primary backend (${targetUrlStr}) offline: ${err.message}. Retrying cloud: ${CLOUD_FALLBACK}`);
      return sendProxyRequest(CLOUD_FALLBACK, req, res, bodyBuffer);
    }
    console.error('[proxy error]', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: { message: `Backend error: ${err.message}` } }));
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy(new Error('Proxy request timed out'));
  });

  if (bodyBuffer && bodyBuffer.length) {
    proxyReq.write(bodyBuffer);
  }
  proxyReq.end();
}

function proxyToBackend(req, res) {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const bodyBuffer = Buffer.concat(chunks);
    sendProxyRequest(BACKEND_URL, req, res, bodyBuffer);
  });
  req.on('error', (err) => {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: { message: err.message } }));
  });
}

// ─── Main request handler ─────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  let reqPath = parsed.pathname;
  try {
    reqPath = decodeURIComponent(reqPath);
  } catch (_) { }
  const query = parsed.query || '';

  // 1. Proxy API and uploads to backend
  if (reqPath.startsWith('/api/') || reqPath.startsWith('/uploads/')) {
    console.log(`[proxy] ${req.method} ${reqPath} → ${BACKEND_URL}`);
    return proxyToBackend(req, res);
  }

  // 2. Apply static rewrites
  const rewritten = resolveRewrite(reqPath, query);
  const targetPath = rewritten ? rewritten.split('?')[0] : reqPath;
  const targetQuery = rewritten && rewritten.includes('?') ? rewritten.split('?')[1] : query;

  // 3. Try to serve the file
  let fullPath = path.join(ROOT, targetPath);

  // Safety: block traversal outside ROOT
  if (!fullPath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  // If directory, try index.html
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    fullPath = path.join(fullPath, 'index.html');
  }

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    console.log(`[static] ${reqPath} → ${fullPath.replace(ROOT, '')}`);
    return serveFile(fullPath, res);
  }

  // 4. Fallback: serve root index.html (SPA-style)
  const rootIndex = path.join(ROOT, 'index.html');
  if (fs.existsSync(rootIndex)) {
    console.log(`[fallback] ${reqPath} → /index.html`);
    return serveFile(rootIndex, res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end(`404 Not Found: ${reqPath}`);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log(`  ║  VidyaOS Frontend Dev Server                 ║`);
  console.log(`  ║  http://localhost:${PORT}                       ║`);
  console.log(`  ║  Proxying API → ${BACKEND_URL.padEnd(28)} ║`);
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
});

