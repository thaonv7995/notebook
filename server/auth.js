/**
 * Authentication Module
 * 
 * - Single-user login/logout with bcrypt + JWT
 * - Auto-creates admin user on first boot from .env
 * - JWT stored in httpOnly cookie for security
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { findUserByUsername, findUserById, createUser, updateUserPassword } from './db.js';

let JWT_SECRET = (process.env.JWT_SECRET || '').trim();
if (!JWT_SECRET || JWT_SECRET === 'notebook-studio-secret-change-me') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Production requires a secure JWT_SECRET');
  } else {
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
    console.warn('  ⚠ Using an ephemeral JWT secret in development. Sessions will expire when the server restarts.');
  }
}
if (process.env.NODE_ENV === 'production' && JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters in production');
}
const TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'nb_token';
const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 6;
const MAX_LOGIN_RECORDS = 10000;
const EXPOSE_AUTH_TOKEN = process.env.EXPOSE_AUTH_TOKEN === 'true';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/'
};

// In-memory brute force rate limiter for login
const loginAttempts = new Map(); // ip + username -> { count, resetAt }

function normalizeLoginKey(req, username) {
  const ip = typeof req.ip === 'string' && req.ip ? req.ip : 'unknown';
  return `${ip}:${String(username || '').trim().toLowerCase().slice(0, 200)}`;
}

function cleanupExpiredLoginAttempts(now) {
  for (const [key, record] of loginAttempts) {
    if (!record || now >= record.resetAt) {
      loginAttempts.delete(key);
    }
  }

  if (loginAttempts.size > MAX_LOGIN_RECORDS) {
    const oldestKeys = [...loginAttempts.entries()]
      .sort((a, b) => a[1].resetAt - b[1].resetAt)
      .slice(0, loginAttempts.size - MAX_LOGIN_RECORDS)
      .map(([key]) => key);
    oldestKeys.forEach(key => loginAttempts.delete(key));
  }
}

// ─── Bootstrap: create admin user if none exists ───

export function ensureAdminUser() {
  const isProduction = process.env.NODE_ENV === 'production';
  const username = (process.env.ADMIN_USERNAME || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';

  if (isProduction && (!username || !password)) {
    throw new Error('Production requires ADMIN_USERNAME and ADMIN_PASSWORD');
  }

  const effectiveUsername = username || 'admin';
  const effectivePassword = password || 'admin123';

  if (isProduction && effectivePassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters in production');
  }

  if (!isProduction && !password) {
    console.warn('  ⚠ Using the development-only default admin password. Configure ADMIN_PASSWORD before deployment.');
  }

  const existing = findUserByUsername(effectiveUsername);
  if (!existing) {
    const hash = bcrypt.hashSync(effectivePassword, 10);
    createUser(effectiveUsername, hash);
    console.log(`✓ Admin user "${effectiveUsername}" created.`);
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
  // Allow server-to-server integration via BILINGUAL_CLIENT_ID
  const incomingClientId = req.headers['x-client-id'];
  const expectedClientId = (process.env.BILINGUAL_CLIENT_ID || '').trim();
  if (expectedClientId && incomingClientId === expectedClientId) {
    const requestedUser = req.headers['x-notebook-user'] || req.headers['x-notebook-user-id'];
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
    let targetUser = requestedUser
      ? (findUserByUsername(requestedUser) || findUserById(Number(requestedUser)))
      : null;
    if (!targetUser) {
      targetUser = findUserByUsername(adminUsername) || findUserById(1);
    }
    if (targetUser) {
      req.user = { id: targetUser.id, username: targetUser.username };
      return next();
    }
  }

  // Check cookie first, then Authorization header
  const token = req.cookies?.[COOKIE_NAME]
    || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

  if (!token) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
    return res.status(401).json({ error: 'Phiên đăng nhập hết hạn' });
  }

  req.user = payload;
  next();
}

// ─── Auth Routes ───

export function authRoutes(app) {
  // POST /api/auth/login
  app.post('/api/auth/login', async (req, res) => {
    const now = Date.now();
    const { username, password } = req.body || {};
    if (
      typeof username !== 'string'
      || typeof password !== 'string'
      || !username.trim()
      || !password
      || username.length > 200
      || password.length > 1000
    ) {
      return res.status(400).json({ error: 'Thiếu tên đăng nhập hoặc mật khẩu' });
    }

    cleanupExpiredLoginAttempts(now);
    const loginKey = normalizeLoginKey(req, username);
    const record = loginAttempts.get(loginKey);
    if (record && now < record.resetAt && record.count >= LOGIN_MAX_ATTEMPTS) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: 'Quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau 1 phút.'
      });
    }

    const normalizedUsername = username.trim();
    const user = findUserByUsername(normalizedUsername);
    const isValid = user && (await bcrypt.compare(password, user.password_hash));
    if (!isValid) {
      if (!record || now >= record.resetAt) {
        loginAttempts.set(loginKey, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
      } else {
        record.count++;
      }
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    loginAttempts.delete(loginKey);

    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const response = {
      ok: true,
      user: { id: user.id, username: user.username }
    };

    // Disabled by default so browser JavaScript cannot read the JWT.
    // Native clients that cannot use cookies may opt in via EXPOSE_AUTH_TOKEN=true.
    if (EXPOSE_AUTH_TOKEN) {
      response.token = token;
    }

    res.json(response);
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
    res.json({ ok: true });
  });

  // GET /api/auth/me — check current session
  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({
      ok: true,
      user: { id: req.user.id, username: req.user.username }
    });
  });

  // POST /api/auth/change-password
  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    const { oldPassword, newPassword } = req.body || {};
    if (typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
    }
    if (
      oldPassword.length === 0
      || oldPassword.length > 1000
      || newPassword.length < 12
      || newPassword.length > 1000
    ) {
      return res.status(400).json({
        error: 'Mật khẩu mới phải có độ dài từ 12 đến 1000 ký tự'
      });
    }
    if (oldPassword === newPassword) {
      return res.status(400).json({
        error: 'Mật khẩu mới phải khác mật khẩu hiện tại'
      });
    }

    const user = findUserById(req.user.id);
    const isValid = user && (await bcrypt.compare(oldPassword, user.password_hash));
    if (!isValid) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    updateUserPassword(user.id, newHash);
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
    res.json({ ok: true, message: 'Đổi mật khẩu thành công' });
  });
}
