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
import cookieParser from 'cookie-parser';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

import { ensureAdminUser, authRoutes } from './auth.js';
import { apiRoutes } from './api.js';
import { aiRoutes } from './ai.js';
import { pdfRoutes } from './pdf.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT, 10) || 27972;
const IS_DEV = process.env.NODE_ENV !== 'production';

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
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// ─── API Routes ───
authRoutes(app);
apiRoutes(app);
aiRoutes(app);
pdfRoutes(app);

// ─── 404 Guard for API Routes (prevents HTML fallback) ───
app.all('/api/{*path}', (req, res) => {
  res.status(404).json({ ok: false, error: 'Endpoint không tồn tại' });
});
app.all('/api', (req, res) => {
  res.status(404).json({ ok: false, error: 'Endpoint không tồn tại' });
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
  // In dev mode, proxy to Vite dev server on a different port
  const VITE_PORT = PORT + 1;  // 27973
  const { createProxyMiddleware } = await import('http-proxy-middleware');
  app.use('/', createProxyMiddleware({
    target: `http://localhost:${VITE_PORT}`,
    changeOrigin: true,
    ws: true, // WebSocket for Vite HMR
  }));
  console.log(`  → Vite dev proxy → http://localhost:${VITE_PORT}`);
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
