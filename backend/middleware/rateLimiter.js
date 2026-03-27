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
const { countRecentCalls } = require('../db/client');
const { logger } = require('../utils/logger');

// ── Budgets per feature (adjust these to taste) ───────────────────
// Format: { windowMinutes, maxPerWindow, dailyMax }
const FEATURE_LIMITS = {
  chat:       { windowMinutes: 1,  maxPerWindow: 5,  dailyMax: 100 },
  quiz:       { windowMinutes: 5,  maxPerWindow: 3,  dailyMax: 30  },
  flashcards: { windowMinutes: 5,  maxPerWindow: 3,  dailyMax: 30  },
  exam:       { windowMinutes: 10, maxPerWindow: 2,  dailyMax: 10  },
  summarize:  { windowMinutes: 5,  maxPerWindow: 3,  dailyMax: 20  },
};

// ── 1. IP-level limiter for auth routes ──────────────────────────
// Protects login / register from brute force.
// 10 attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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

// ── 3. Per-user, per-feature DB limiter ──────────────────────────
// Called AFTER authenticate so req.user is available.
// Returns a middleware function configured for a specific feature.
function perUserLimiter(feature) {
  const limits = FEATURE_LIMITS[feature];
  if (!limits) throw new Error(`Unknown feature for rate limiter: ${feature}`);

  return async function userRateLimit(req, res, next) {
    const userId = req.user.id;

    try {
      // Check short window (burst)
      const recentCount = countRecentCalls(userId, feature, limits.windowMinutes);
      if (recentCount >= limits.maxPerWindow) {
        logger.warn('User burst rate limit hit', { userId, feature, recentCount });
        return res.status(429).json({
          error: `You're generating ${feature} too fast. Please wait ${limits.windowMinutes} minute(s).`,
        });
      }

      // Check daily budget (cost control)
      const dailyCount = countRecentCalls(userId, feature, 24 * 60);
      if (dailyCount >= limits.dailyMax) {
        logger.warn('User daily rate limit hit', { userId, feature, dailyCount });
        return res.status(429).json({
          error: `You've reached your daily limit for ${feature} (${limits.dailyMax} per day). Try again tomorrow.`,
        });
      }

      next();
    } catch (err) {
      // If the DB check fails, fail open with a warning rather than
      // blocking the user entirely. Log it for investigation.
      logger.error('Rate limiter DB error — failing open', { err: err.message, userId, feature });
      next();
    }
  };
}

module.exports = { authLimiter, aiIpLimiter, perUserLimiter };
