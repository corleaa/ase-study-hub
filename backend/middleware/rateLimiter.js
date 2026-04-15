// ─────────────────────────────────────────────────────────────────
// middleware/rateLimiter.js — Rate limiting for all AI endpoints
//
// Security responsibilities:
//   • Per-IP limiting: protects unauthenticated paths (login, register)
//     from brute-force and credential stuffing attacks.
//   • Per-user DB limiting: protects AI endpoints from abuse even if
//     an attacker has a valid JWT. Keyed by user ID, not IP, so VPNs
//     and shared networks don't affect other users.
//   • Different budgets per feature: expensive endpoints (exam sim,
//     presentations) get tighter limits than cheap ones (chat).
//
// Why separate limits?
//   express-rate-limit handles IP-level burst protection in memory
//   (fast, no DB needed). The DB-based check handles the daily budget
//   per user, which persists across server restarts.
// ─────────────────────────────────────────────────────────────────
'use strict';

const rateLimit = require('express-rate-limit');
const { countRecentCalls, countRecentCallsByIp } = require('../db/client');
const { logger } = require('../utils/logger');

// ── Budgets per feature per tier ──────────────────────────────────
// Format: { windowMinutes, maxPerWindow, dailyMax }
// admin: null = no limits
// dailyMax: 0 = feature blocked for this tier
const FEATURE_LIMITS = {
  chat: {
    guest: { windowMinutes: 1,  maxPerWindow: 2,  dailyMax: 5   },
    free:  { windowMinutes: 1,  maxPerWindow: 5,  dailyMax: 30  },
    pro:   { windowMinutes: 1,  maxPerWindow: 10, dailyMax: 200 },
    admin: null,
  },
  quiz: {
    guest: { windowMinutes: 5,  maxPerWindow: 1,  dailyMax: 2  },
    free:  { windowMinutes: 5,  maxPerWindow: 3,  dailyMax: 10 },
    pro:   { windowMinutes: 5,  maxPerWindow: 5,  dailyMax: 50 },
    admin: null,
  },
  flashcards: {
    guest: { windowMinutes: 5,  maxPerWindow: 1,  dailyMax: 2  },
    free:  { windowMinutes: 5,  maxPerWindow: 3,  dailyMax: 10 },
    pro:   { windowMinutes: 5,  maxPerWindow: 5,  dailyMax: 50 },
    admin: null,
  },
  exam: {
    guest: { windowMinutes: 10, maxPerWindow: 0,  dailyMax: 0  },  // blocked
    free:  { windowMinutes: 10, maxPerWindow: 2,  dailyMax: 3  },
    pro:   { windowMinutes: 10, maxPerWindow: 3,  dailyMax: 20 },
    admin: null,
  },
  summarize: {
    guest: { windowMinutes: 5,  maxPerWindow: 1,  dailyMax: 1  },
    free:  { windowMinutes: 5,  maxPerWindow: 3,  dailyMax: 5  },
    pro:   { windowMinutes: 5,  maxPerWindow: 5,  dailyMax: 30 },
    admin: null,
  },
};

// ── 1. IP-level limiter for auth routes ──────────────────────────
// Protects login / register from brute force.
// 10 attempts per 15 minutes per IP (higher in dev/test).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait and try again.' },
  handler(req, res, _next, options) {
    logger.warn('Auth rate limit hit', { ip: req.ip, path: req.path });
    res.status(429).json(options.message);
  },
});

// ── 2. IP-level limiter for AI routes ────────────────────────────
// A broad IP-level guard (30 req / 1 min) before any auth check.
// Catches completely anonymous bots hammering the endpoints.
const aiIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: req => req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from your network. Please slow down.' },
  handler(req, res, _next, options) {
    logger.warn('AI IP rate limit hit', { ip: req.ip, path: req.path });
    res.status(429).json(options.message);
  },
});

// ── 3. Per-user/per-guest, per-feature DB limiter ────────────────
// Works with optionalAuth: req.userRole is always set ('guest'/'free'/'pro'/'admin').
// Returns a middleware function configured for a specific feature.
function perUserLimiter(feature) {
  const featureLimits = FEATURE_LIMITS[feature];
  if (!featureLimits) throw new Error(`Unknown feature for rate limiter: ${feature}`);

  return async function userRateLimit(req, res, next) {
    const role   = req.userRole || 'guest';
    const limits = featureLimits[role];

    // Admin — no limits at all
    if (limits === null) return next();

    // Feature completely blocked for this tier (dailyMax === 0)
    if (!limits || limits.dailyMax === 0) {
      const upgradeMsg = role === 'guest'
        ? 'Creează un cont gratuit pentru acces la această funcționalitate.'
        : 'Upgrade la Pro pentru acces la această funcționalitate.';
      logger.warn('Feature blocked for tier', { role, feature });
      return res.status(429).json({
        error: upgradeMsg,
        upgradeRequired: true,
        currentRole: role,
      });
    }

    try {
      const isGuest  = role === 'guest';
      const id       = isGuest ? req.clientIpHash : req.user.id;
      const countFn  = isGuest ? countRecentCallsByIp : countRecentCalls;

      // Burst check
      const recentCount = countFn(id, feature, limits.windowMinutes);
      if (recentCount >= limits.maxPerWindow) {
        logger.warn('Burst rate limit hit', { role, feature, recentCount });
        return res.status(429).json({
          error: `Generezi ${feature} prea rapid. Așteaptă ${limits.windowMinutes} minut(e).`,
          retryAfterMinutes: limits.windowMinutes,
        });
      }

      // Daily budget
      const dailyCount = countFn(id, feature, 24 * 60);
      if (dailyCount >= limits.dailyMax) {
        logger.warn('Daily rate limit hit', { role, feature, dailyCount });
        const freeLimit = featureLimits.free?.dailyMax;
        const proLimit  = featureLimits.pro?.dailyMax;
        const upgradeMsg = role === 'guest'
          ? `Limită atinsă (${limits.dailyMax}/zi fără cont). Creează un cont gratuit pentru ${freeLimit}/zi.`
          : `Limită zilnică atinsă (${limits.dailyMax}/zi). Upgrade la Pro pentru ${proLimit}/zi.`;
        return res.status(429).json({
          error: upgradeMsg,
          upgradeRequired: true,
          currentRole: role,
          dailyLimitHit: true,
        });
      }

      next();
    } catch (err) {
      logger.error('Rate limiter DB error — failing open', { err: err.message, feature, role });
      next();
    }
  };
}

module.exports = { authLimiter, aiIpLimiter, perUserLimiter };
