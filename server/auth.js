/**
 * Authentication Module
 * 
 * - Single-user login/logout with bcrypt + JWT
 * - Auto-creates admin user on first boot from .env
 * - JWT stored in httpOnly cookie for security
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { findUserByUsername, createUser } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'notebook-studio-secret-change-me';
const TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'nb_token';

// ─── Bootstrap: create admin user if none exists ───

export function ensureAdminUser() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const existing = findUserByUsername(username);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 12);
    createUser(username, hash);
    console.log(`✓ Admin user "${username}" created.`);
  }
}

// ─── JWT helpers ───

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ─── Middleware: require auth ───

export function requireAuth(req, res, next) {
  // Check cookie first, then Authorization header
  const token = req.cookies?.[COOKIE_NAME]
    || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

  if (!token) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ error: 'Phiên đăng nhập hết hạn' });
  }

  req.user = payload;
  next();
}

// ─── Auth Routes ───

export function authRoutes(app) {
  // POST /api/auth/login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Thiếu tên đăng nhập hoặc mật khẩu' });
    }

    const user = findUserByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      ok: true,
      user: { id: user.id, username: user.username }
    });
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ ok: true });
  });

  // GET /api/auth/me — check current session
  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({
      ok: true,
      user: { id: req.user.id, username: req.user.username }
    });
  });
}
