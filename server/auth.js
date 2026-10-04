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
import { findUserByUsername, findUserById, createUser, updateUserPassword, getActiveOrPrimaryUser } from './db.js';

let JWT_SECRET = (process.env.JWT_SECRET || '').trim();
if (!JWT_SECRET || JWT_SECRET === 'notebook-studio-secret-change-me') {
  if (process.env.NODE_ENV === 'production') {
    console.warn('  ⚠ CẢNH BÁO BẢO MẬT: Chưa cấu hình JWT_SECRET trong .env. Khởi tạo secret ngẫu nhiên cho phiên này để chống giả mạo token.');
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
  } else {
    JWT_SECRET = 'notebook-studio-dev-secret-key-123456';
  }
}
const TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'nb_token';

// In-memory brute force rate limiter for login
const loginAttempts = new Map(); // ip -> { count, resetAt }

// ─── Bootstrap: create admin user if none exists ───

export function ensureAdminUser() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const existing = findUserByUsername(username);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 10);
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
  // Allow integration via X-Client-ID header or query param
  const clientId = req.headers['x-client-id'] || req.query.client_id;
  if (clientId === 'notebook_client_v1') {
    const requested = req.headers['x-notebook-user'] || req.headers['x-notebook-user-id'] || req.query.user_id || req.query.user;
    const user = getActiveOrPrimaryUser(requested);
    req.user = { id: user.id, username: user.username };
    return next();
  }

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
  app.post('/api/auth/login', async (req, res) => {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const record = loginAttempts.get(clientIp);
    if (record && now < record.resetAt && record.count >= 6) {
      return res.status(429).json({ error: 'Quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau 1 phút.' });
    }

    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Thiếu tên đăng nhập hoặc mật khẩu' });
    }

    const user = findUserByUsername(username);
    const isValid = user && (await bcrypt.compare(password, user.password_hash));
    if (!isValid) {
      if (!record || now >= record.resetAt) {
        loginAttempts.set(clientIp, { count: 1, resetAt: now + 60000 });
      } else {
        record.count++;
      }
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    loginAttempts.delete(clientIp);

    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      ok: true,
      user: { id: user.id, username: user.username },
      token: token  // Expose JWT for mobile clients (iOS uses Bearer header, not cookies)
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

  // POST /api/auth/change-password
  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có độ dài từ 6 ký tự trở lên' });
    }

    const user = findUserById(req.user.id);
    const isValid = user && (await bcrypt.compare(oldPassword, user.password_hash));
    if (!isValid) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    updateUserPassword(user.id, newHash);
    res.json({ ok: true, message: 'Đổi mật khẩu thành công' });
  });
}
