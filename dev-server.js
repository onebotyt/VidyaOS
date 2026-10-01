/**
 * VidyaOS Standalone Frontend Dev Server & API Reverse Proxy
 * Location: frontend/dev-server.js
 * 
 * Features:
 * - Zero external npm dependencies (uses native Node.js http, https, fs, path, url)
 * - Automatically proxies /api/v1/* and /uploads/* to the configured BACKEND_URL
 * - Zero CORS issues for frontend developers working on their local PCs
 * - Serves all HTML, CSS, JS, and shared assets with anti-cache headers for instant updates
 * - Works identically on Windows, macOS, and Linux
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Simple zero-dependency .env file parser
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const PORT = parseInt(process.env.PORT || '5000', 10);
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const parsedBackend = new URL(BACKEND_URL);

// MIME type map
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf'
};

/**
 * Reverse proxy for API calls and uploads to the remote or local backend
 */
function proxyRequest(req, res) {
  const clientProtocol = parsedBackend.protocol === 'https:' ? https : http;
  const startTime = Date.now();

  const proxyHeaders = {
    ...req.headers,
    host: parsedBackend.host,
    'x-forwarded-for': req.socket.remoteAddress,
    'x-forwarded-proto': req.socket.encrypted ? 'https' : 'http'
  };

  const options = {
    protocol: parsedBackend.protocol,
    hostname: parsedBackend.hostname,
    port: parsedBackend.port || (parsedBackend.protocol === 'https:' ? 443 : 80),
    method: req.method,
    path: req.url,
    headers: proxyHeaders,
    timeout: 30000
  };

  const proxyReq = clientProtocol.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
    proxyRes.on('end', () => {
      const duration = Date.now() - startTime;
      console.log(`[PROXY ${req.method}] ${req.url} -> ${proxyRes.statusCode} (${duration}ms)`);
    });
  });

  proxyReq.on('error', (err) => {
    console.error(`[PROXY ERROR] ${req.method} ${req.url} -> ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: {
          code: 'BACKEND_UNREACHABLE',
          message: `Unable to connect to backend at ${BACKEND_URL}. Ensure the backend server is running or update BACKEND_URL in .env.`,
          details: err.message
        }
      }));
    }
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: { code: 'GATEWAY_TIMEOUT', message: 'Backend request timed out.' }
      }));
    }
  });

  req.pipe(proxyReq);
}

/**
 * Resolves static file path with shared asset aliases
 */
function resolveFilePath(reqPath) {
  let cleanPath = reqPath.split('?')[0];
  if (cleanPath === '/' || cleanPath === '') {
    cleanPath = '/index.html';
  }

  // Handle shared asset aliases matching server.js
  if (cleanPath.startsWith('/js/')) {
    const directPath = path.join(__dirname, cleanPath);
    if (fs.existsSync(directPath)) return directPath;
    const sharedPath = path.join(__dirname, 'shared', cleanPath);
    if (fs.existsSync(sharedPath)) return sharedPath;
  }

  if (cleanPath.startsWith('/css/')) {
    const directPath = path.join(__dirname, cleanPath);
    if (fs.existsSync(directPath)) return directPath;
    const sharedPath = path.join(__dirname, 'shared', cleanPath);
    if (fs.existsSync(sharedPath)) return sharedPath;
  }

  // Exact file path
  let targetPath = path.join(__dirname, cleanPath);
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
    targetPath = path.join(targetPath, 'index.html');
  }

  // If path has no extension and doesn't exist, try appending .html
  if (!fs.existsSync(targetPath) && !path.extname(cleanPath)) {
    const withHtml = path.join(__dirname, `${cleanPath}.html`);
    if (fs.existsSync(withHtml)) return withHtml;
  }

  return targetPath;
}

// Create HTTP Server
const server = http.createServer((req, res) => {
  // CORS Headers for safety
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Anti-cache headers for local development
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Reverse proxy API routes and uploads to target backend
  if (req.url.startsWith('/api/') || req.url.startsWith('/uploads/')) {
    return proxyRequest(req, res);
  }

  // Serve static frontend files
  const filePath = resolveFilePath(req.url);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      console.warn(`[404 NOT FOUND] ${req.url} (Resolved: ${filePath})`);
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html>
<head><title>404 Not Found - VidyaOS</title></head>
<body style="font-family: system-ui, sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc;">
  <h2>404 — Page or Asset Not Found</h2>
  <p>The requested URL <code>${req.url}</code> was not found on this VidyaOS frontend dev server.</p>
  <a href="/index.html" style="color: #38bdf8;">← Back to Home / Login</a>
</body>
</html>`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('===============================================================');
  console.log(' 🎓 VIDYAOS FRONTEND DEV SERVER & REVERSE PROXY ACTIVE');
  console.log('===============================================================');
  console.log(` 🌐 Local Frontend Portal : http://localhost:${PORT}`);
  console.log(` 🔗 Target Backend API    : ${BACKEND_URL}`);
  console.log(' ⚡ Zero CORS Mode        : Enabled (Requests transparently proxied)');
  console.log(' 📁 Serving Directory     : ' + __dirname);
  console.log('===============================================================');
  console.log(' Tip: To point to remote Render backend, set BACKEND_URL in .env');
  console.log(' Ready for frontend developers. Press Ctrl+C to terminate.');
  console.log('---------------------------------------------------------------');
});
