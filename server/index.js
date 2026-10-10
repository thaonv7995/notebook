/**
 * Notebook Studio — Express Server
 * 
 * In development: proxies to Vite dev server for frontend HMR.
 * In production: serves the built dist/ folder.
 * 
 * API: /api/auth/* and /api/notebooks/*
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

import { ensureAdminUser, authRoutes } from './auth.js';
import { apiRoutes } from './api.js';
import { aiRoutes } from './ai.js';
import { pdfRoutes } from './pdf.js';
import { bilingualRoutes } from './bilingual.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT, 10) || 27972;
const IS_DEV = process.env.NODE_ENV !== 'production';
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

if (IS_DEV) {
  allowedOrigins.add(`http://localhost:${PORT}`);
  allowedOrigins.add(`http://127.0.0.1:${PORT}`);
  allowedOrigins.add(`http://localhost:${PORT + 1}`);
  allowedOrigins.add(`http://127.0.0.1:${PORT + 1}`);
}

// Ensure writable TMPDIR for environments with read-only /tmp (e.g. systemd ProtectSystem=strict, containers)
const localTempDir = join(__dirname, '..', 'data', 'temp');
try {
  const testFile = join(os.tmpdir(), `.nb_write_test_${Date.now()}`);
  writeFileSync(testFile, '1');
  unlinkSync(testFile);
} catch {
  try {
    mkdirSync(localTempDir, { recursive: true });
    process.env.TMPDIR = localTempDir;
    process.env.TEMP = localTempDir;
    process.env.TMP = localTempDir;
    console.log(`  ℹ Read-only system /tmp detected. Redirected temp dir to: ${localTempDir}`);
  } catch (err) {
    console.warn('  ⚠ Unable to initialize local temp dir:', err.message);
  }
}

const app = express();

// ─── Middleware ───
app.disable('x-powered-by');

// Only trust forwarded client IPs when the deployment explicitly enables it.
// Set TRUST_PROXY=1 for a single trusted reverse proxy such as Nginx.
if (process.env.TRUST_PROXY) {
  const trustProxy = /^\d+$/.test(process.env.TRUST_PROXY)
    ? Number(process.env.TRUST_PROXY)
    : process.env.TRUST_PROXY;
  app.set('trust proxy', trustProxy);
}

// Baseline security headers. CSP is intentionally scoped to production because
// Vite development mode requires websocket and development script connections.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  if (!IS_DEV) {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'self'",
        "form-action 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https:",
        "frame-src 'self'",
        "worker-src 'self' blob:",
        "manifest-src 'self'"
      ].join('; ')
    );
  }

  next();
});

app.use(cors((req, callback) => {
  const origin = req.header('Origin');
  const host = req.get('host');
  let isTrustedDevOrigin = false;
  if (IS_DEV && origin) {
    try {
      const originUrl = new URL(origin);
      const requestHostname = String(host || '').split(':')[0];
      isTrustedDevOrigin = (
        originUrl.protocol === 'http:'
        && (
          originUrl.hostname === 'localhost'
          || originUrl.hostname === '127.0.0.1'
          || originUrl.hostname === '::1'
          || originUrl.hostname === requestHostname
          || /^10\./.test(originUrl.hostname)
          || /^192\.168\./.test(originUrl.hostname)
          || /^172\.(1[6-9]|2\d|3[01])\./.test(originUrl.hostname)
        )
        && [PORT, PORT + 1].includes(Number(originUrl.port))
      );
    } catch {
      isTrustedDevOrigin = false;
    }
  }
  const isSameOrigin = Boolean(
    origin && host && (
      origin === `http://${host}` ||
      origin === `https://${host}` ||
      origin === `${req.protocol}://${host}`
    )
  );

  // Native apps, CLI clients, same-origin requests, or explicit allowedOrigins
  if (!origin || isSameOrigin || isTrustedDevOrigin || allowedOrigins.has(origin)) {
    return callback(null, { origin: true, credentials: true });
  }

  return callback(new Error('Origin is not allowed by CORS policy'));
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '10mb' }));
app.use(cookieParser());

// ─── API Routes ───
authRoutes(app);
apiRoutes(app);
aiRoutes(app);
pdfRoutes(app);
bilingualRoutes(app);

// ─── 404 Guard for API Routes (prevents HTML fallback) ───
app.all('/api/{*path}', (req, res) => {
  res.status(404).json({ ok: false, error: 'Endpoint không tồn tại' });
});
app.all('/api', (req, res) => {
  res.status(404).json({ ok: false, error: 'Endpoint không tồn tại' });
});

// Return controlled JSON errors for API requests, including rejected CORS
// origins and oversized/malformed JSON payloads.
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err?.message === 'Origin is not allowed by CORS policy') {
    return res.status(403).json({
      ok: false,
      error: 'Origin không được phép'
    });
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      ok: false,
      error: 'Dữ liệu gửi lên vượt quá giới hạn cho phép'
    });
  }

  if (err instanceof SyntaxError && err?.type === 'entity.parse.failed') {
    return res.status(400).json({
      ok: false,
      error: 'JSON không hợp lệ'
    });
  }

  console.error('Unhandled request error:', err);
  if (req.path.startsWith('/api')) {
    return res.status(500).json({
      ok: false,
      error: 'Lỗi máy chủ nội bộ'
    });
  }

  return next(err);
});

// ─── PWA & Asset Handlers (guarantees correct MIME types in dev & prod) ───
const distPath = join(__dirname, '..', 'dist');
const publicPath = join(__dirname, '..', 'public');
const rootPath = join(__dirname, '..');

// Service Worker: always application/javascript with Service-Worker-Allowed header
app.get('/sw.js', (req, res) => {
  const candidatePaths = [
    join(distPath, 'sw.js'),
    join(publicPath, 'sw.js'),
    join(rootPath, 'sw.js')
  ];
  for (const p of candidatePaths) {
    if (existsSync(p)) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(p);
    }
  }
  res.status(404).type('text/plain').send('Service Worker not found');
});

// Web App Manifest
app.get(['/manifest.webmanifest', '/manifest.json'], (req, res) => {
  const candidatePaths = [
    join(distPath, 'manifest.webmanifest'),
    join(publicPath, 'manifest.webmanifest'),
    join(rootPath, 'manifest.webmanifest')
  ];
  for (const p of candidatePaths) {
    if (existsSync(p)) {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      return res.sendFile(p);
    }
  }
  res.status(404).end();
});

// App Icons (handles both /notebook-icon.svg and /assets/notebook-icon.svg)
app.get(['/notebook-icon.svg', '/assets/notebook-icon.svg'], (req, res) => {
  const candidatePaths = [
    join(distPath, 'notebook-icon.svg'),
    join(distPath, 'assets', 'notebook-icon.svg'),
    join(publicPath, 'notebook-icon.svg'),
    join(publicPath, 'assets', 'notebook-icon.svg'),
    join(rootPath, 'public', 'notebook-icon.svg')
  ];
  for (const p of candidatePaths) {
    if (existsSync(p)) {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.sendFile(p);
    }
  }
  res.status(404).end();
});

// ─── Frontend Serving ───
if (IS_DEV) {
  // In development, Vite serves the frontend on PORT + 1 and proxies /api
  // requests back to this Express server. Keeping the proxy in Vite avoids
  // an additional runtime dependency in the backend.
  console.log(`  → Vite frontend → http://localhost:${PORT + 1}`);
} else {
  // In production, serve static files from dist/
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('{*path}', (req, res) => {
      res.sendFile(join(distPath, 'index.html'));
    });
  } else {
    console.warn('⚠ dist/ not found. Run "npm run build" first.');
  }
}

// ─── Bootstrap ───
ensureAdminUser();

app.listen(PORT, () => {
  console.log(`\n  ┌───────────────────────────────────────────┐`);
  console.log(`  │  Notebook Studio Server                   │`);
  console.log(`  │  http://localhost:${PORT}/                 │`);
  console.log(`  │  Mode: ${IS_DEV ? 'Development' : 'Production '}                     │`);
  console.log(`  └───────────────────────────────────────────┘\n`);
});
