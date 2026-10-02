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
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { ensureAdminUser, authRoutes } from './auth.js';
import { apiRoutes } from './api.js';
import { aiRoutes } from './ai.js';
import { pdfRoutes } from './pdf.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT, 10) || 27972;
const IS_DEV = process.env.NODE_ENV !== 'production';

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
  const distPath = join(__dirname, '..', 'dist');
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
