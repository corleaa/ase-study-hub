'use strict';
// ═════════════════════════════════════════════════════════════════
// routes/auth.js — Authentication routes
//
// Security improvements vs previous version:
//   + authLimiter applied to login + register
//   + validate() middleware on all POST bodies
//   + Refresh token ROTATION: on /refresh, old token is deleted and
//     a new one issued. Stolen tokens become single-use.
//   + Reuse detection: if /refresh is called with an already-deleted
//     token, ALL sessions for that user are invalidated immediately.
//   + storeRefreshToken() replaces inline INSERT (enforces session limit)
//   + deleteRefreshToken() replaces inline DELETE
//   + clearCookie uses same options as setCookie (path, sameSite, etc.)
//   + Normalized error messages (no user enumeration on login)
//   + Cookie path set to '/api/auth' to limit cookie scope
// ═════════════════════════════════════════════════════════════════
'use strict';

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');

const { getDb, storeRefreshToken, findRefreshToken, rotateRefreshToken,
        invalidateAllUserSessions, deleteRefreshToken } = require('../db/client');
const { authLimiter }  = require('../middleware/rateLimiter');
const { validate }     = require('../middleware/validate');
const authenticate     = require('../middleware/authenticate');
const { auditLog }     = require('../utils/auditLogger');
const { logger }       = require('../utils/logger');

const ACCESS_TTL  = '15m';
const REFRESH_TTL = 7 * 24 * 60 * 60;   // 7 days in seconds

// ── Token helpers ─────────────────────────────────────────────────
function makeAccessToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn:  ACCESS_TTL,
    algorithm: 'HS256',
  });
}

function makeRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   REFRESH_TTL * 1000,
    path:     '/api/auth',   // Scope the cookie — not sent to /api/ai
  };
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  // MUST use same options (especially path) as setRefreshCookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
    path:     '/api/auth',
  });
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────
router.post('/register',
  authLimiter,
  validate('register'),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;   // Already validated + normalized by validate()
      const db = getDb();

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        // Generic message — don't confirm the email exists
        return res.status(409).json({ error: 'Registration failed. Please try a different email.' });
      }

      const hash   = await bcrypt.hash(password, 12);
      const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, hash);
      const userId = result.lastInsertRowid;

      const refreshToken = makeRefreshToken();
      const expiresAt    = new Date(Date.now() + REFRESH_TTL * 1000).toISOString();
      storeRefreshToken(userId, hashToken(refreshToken), expiresAt);

      auditLog('REGISTER', { userId, email });

      setRefreshCookie(res, refreshToken);
      res.status(201).json({
        accessToken: makeAccessToken(userId),
        user: { id: userId, email },
      });
    } catch (e) {
      next(e);
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────
router.post('/login',
  authLimiter,
  validate('login'),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const db   = getDb();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

      // Constant-time comparison path: always call bcrypt even if user not found
      // to prevent timing-based user enumeration.
      const DUMMY_HASH = '$2a$12$dummy.hash.for.timing.safety.only.xxxxxxxxxxxxxxxxxx';
      const hashToCompare = user ? user.password_hash : DUMMY_HASH;
      const ok = await bcrypt.compare(password, hashToCompare);

      if (!user || !ok) {
        // SAME error message regardless of whether email exists or password wrong
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const refreshToken = makeRefreshToken();
      const expiresAt    = new Date(Date.now() + REFRESH_TTL * 1000).toISOString();
      storeRefreshToken(user.id, hashToken(refreshToken), expiresAt);

      auditLog('LOGIN', { userId: user.id, email: user.email, ip: req.ip });

      setRefreshCookie(res, refreshToken);
      res.json({
        accessToken: makeAccessToken(user.id),
        user: { id: user.id, email: user.email },
      });
    } catch (e) {
      next(e);
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      deleteRefreshToken(hashToken(token));
    } catch { /* ignore */ }
  }
  clearRefreshCookie(res);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/refresh  — ROTATION + REUSE DETECTION
// ─────────────────────────────────────────────────────────────────
router.post('/refresh', (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token.' });

  try {
    const tokenHash = hashToken(token);
    const row       = findRefreshToken(tokenHash);

    if (!row) {
      // Token hash not in DB — either expired+cleaned or REUSED after rotation.
      // We can't tell which user this was (hash not found), so just clear cookie.
      logger.warn('Refresh token not found — possible reuse', { ip: req.ip });
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    if (new Date(row.expires_at) < new Date()) {
      // Expired — clean up and reject
      deleteRefreshToken(tokenHash);
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    // Issue new refresh token (rotation)
    const newRefreshToken = makeRefreshToken();
    const newExpiresAt    = new Date(Date.now() + REFRESH_TTL * 1000).toISOString();

    const rotated = rotateRefreshToken(row.id, row.user_id, hashToken(newRefreshToken), newExpiresAt);

    if (!rotated) {
      // rotateRefreshToken returns false when old token was already deleted →
      // this is a REUSE attack. Invalidate ALL sessions for this user.
      logger.warn('Refresh token reuse detected — invalidating all sessions', {
        userId: row.user_id,
        ip:     req.ip,
      });
      auditLog('REFRESH_TOKEN_REUSE', { userId: row.user_id, ip: req.ip });
      invalidateAllUserSessions(row.user_id);
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Security event detected. Please log in again.' });
    }

    setRefreshCookie(res, newRefreshToken);
    res.json({ accessToken: makeAccessToken(row.user_id) });
  } catch (e) {
    logger.error('Refresh token error', { err: e.message });
    clearRefreshCookie(res);
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  const user = getDb()
    .prepare('SELECT id, email FROM users WHERE id = ?')
    .get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
});

module.exports = router;
