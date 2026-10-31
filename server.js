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

const PORT = parseInt(process.env.PORT || '5001', 10);
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
const ROOT = __dirname;

// ─── MIME types ──────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.otf':  'font/otf',
  '.webp': 'image/webp',
  '.mp4':  'video/mp4',
  '.pdf':  'application/pdf',
};

// ─── Static rewrites (mirrors vercel.json) ───────────────────────────────────
const STATIC_REWRITES = [
  // Shared assets
  [/^\/css\/(.+)$/,        '/shared/css/$1'],
  [/^\/js\/(.+)$/,         '/shared/js/$1'],

  // Login page assets (isolated — not in shared/)
  // login/index.css and login/index.js live at login/ root
  // (no rewrite needed — direct paths work)

  // Login
  [/^\/login\/?$/,                      '/login/index.html'],
  [/^\/login\.html$/,                   '/login/index.html'],
  [/^\/register\/?$/,                   '/login/register/index.html'],
  [/^\/register\.html$/,                '/login/register/index.html'],
  [/^\/login\/register\/?$/,            '/login/register/index.html'],
  [/^\/login\/register\.html$/,         '/login/register/index.html'],
  [/^\/login\/student-register\.html$/, '/login/register/index.html?role=student'],
  [/^\/login\/faculty-register\.html$/, '/login/register/index.html?role=faculty'],
  [/^\/login\/student-register$/,       '/login/register/index.html?role=student'],
  [/^\/login\/faculty-register$/,       '/login/register/index.html?role=faculty'],

  // Admin
  [/^\/admin\/?$/,                      '/admin/academic-structure/index.html'],
  [/^\/admin\/academic_structure\.html$/, '/admin/academic-structure/index.html'],
  [/^\/admin\/audit_logs\.html$/,       '/admin/audit-logs/index.html'],
  [/^\/admin\/departments\/?$/,         '/admin/academic-structure/index.html?tab=departments'],
  [/^\/admin\/departments\.html$/,      '/admin/academic-structure/index.html?tab=departments'],

  // Faculty
  [/^\/faculty\/?$/,                    '/faculty/dashboard/index.html'],
  [/^\/faculty\/dashboard(\.html)?\/?$/,'/faculty/dashboard/index.html'],
  [/^\/faculty\/classes(\.html)?\/?$/,  '/faculty/dashboard/index.html'],
  [/^\/faculty\/groups(\.html)?\/?$/,   '/faculty/dashboard/index.html'],
  [/^\/faculty\/analytics\/?$/,         '/faculty/reports/index.html?tab=analytics'],
  [/^\/faculty\/assignments\/?$/,       '/faculty/registers/index.html?tab=assignments'],
  [/^\/faculty\/tests\/?$/,             '/faculty/registers/index.html?tab=marks'],
  [/^\/faculty\/marks\/?$/,             '/faculty/registers/index.html?tab=marks'],
  [/^\/faculty\/attendance\/quick\/?$/, '/faculty/registers/index.html'],

  // Student
  [/^\/student\/dashboard\/?$/,         '/student/dashboard/index.html'],
  [/^\/student\/attendance\/?$/,        '/student/attendance/index.html'],
  [/^\/student\/assignments\/?$/,       '/student/assignments/index.html'],
  [/^\/student\/scores\/?$/,            '/student/scores/index.html'],
  [/^\/student\/timetable\/?$/,         '/student/timetable/index.html'],
  [/^\/student\/leave\/?$/,             '/student/leave/index.html'],
  [/^\/student\/profile\/?$/,           '/student/profile/index.html'],
  [/^\/student\/group-detail\/?$/,      '/faculty/group-detail/index.html'],

  // Generic section/:page pattern
  [/^\/(admin|faculty|student)\/([a-zA-Z0-9_-]+)\/?$/, '/$1/$2/index.html'],
  [/^\/(admin|faculty|student)\/([a-zA-Z0-9_-]+)\.html$/, '/$1/$2/index.html'],
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
  res.writeHead(status, {
    'Content-Type': mime,
    'Content-Length': stat.size,
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(filePath).pipe(res);
}

// ─── Proxy to backend ─────────────────────────────────────────────────────────
function proxyToBackend(req, res) {
  const target = new url.URL(BACKEND_URL);
  const isHttps = target.protocol === 'https:';
  const options = {
    hostname: target.hostname,
    port: target.port || (isHttps ? 443 : 80),
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: target.host,
    },
  };

  const mod = isHttps ? https : http;
  const proxyReq = mod.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[proxy error]', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(`Backend proxy error: ${err.message}\nIs the backend running at ${BACKEND_URL}?`);
  });

  req.pipe(proxyReq);
}

// ─── Main request handler ─────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const reqPath = parsed.pathname;
  const query   = parsed.query || '';

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

