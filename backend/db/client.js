'use strict';
// ═════════════════════════════════════════════════════════════════
// db/client.js — Database layer
//
// Security additions vs previous version:
//   + ai_calls table: enables countRecentCalls() for perUserLimiter
//   + logApiCall(): records every AI call for rate-limit enforcement
//   + countRecentCalls(): burst + daily budget checks
//   + rotateRefreshToken(): issues new token, deletes old (rotation)
//   + invalidateAllUserSessions(): used on reuse detection
//   + enforceSessionLimit(): max 5 active sessions per user
//   + cleanExpiredTokens(): removes stale rows (call on startup + cron)
//   + findRefreshToken(): single lookup used in /refresh route
// ═════════════════════════════════════════════════════════════════
const path     = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'studyhub.db');
let db;

const MAX_SESSIONS_PER_USER = 5;

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────
function initDb() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      email        TEXT    UNIQUE NOT NULL,
      password_hash TEXT   NOT NULL,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT    UNIQUE NOT NULL,
      expires_at  DATETIME NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ai_calls: one row per AI endpoint call, used by perUserLimiter
    CREATE TABLE IF NOT EXISTS ai_calls (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      feature    TEXT    NOT NULL,
      called_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ai_calls_user_feature
      ON ai_calls(user_id, feature, called_at);

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
      ON refresh_tokens(user_id, expires_at);
  `);

  // Remove expired tokens on startup
  cleanExpiredTokens();

  return db;
}

function getDb() {
  if (!db) throw new Error('DB not initialised');
  return db;
}

// ─────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────
function findUserById(id) {
  return getDb()
    .prepare('SELECT id, email FROM users WHERE id = ?')
    .get(id);
}

// isTokenRevoked: per-jti revocation not used (short-lived access tokens
// make it unnecessary). Always returns false — revocation happens at the
// refresh token level via invalidateAllUserSessions().
function isTokenRevoked(_jti) {
  return false;
}

// ─────────────────────────────────────────────────────────────────
// REFRESH TOKEN MANAGEMENT
// ─────────────────────────────────────────────────────────────────

/**
 * Find a refresh token row by its hash.
 * Returns the row or undefined.
 */
function findRefreshToken(tokenHash) {
  return getDb()
    .prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?')
    .get(tokenHash);
}

/**
 * Store a new refresh token for a user.
 * Enforces session limit before inserting.
 */
function storeRefreshToken(userId, tokenHash, expiresAt) {
  enforceSessionLimit(userId);
  getDb()
    .prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
    .run(userId, tokenHash, expiresAt);
}

/**
 * Rotate a refresh token:
 *   1. Delete the old token by ID
 *   2. Insert the new token
 * Returns false if oldId not found (reuse detection: token already deleted).
 */
function rotateRefreshToken(oldId, userId, newTokenHash, expiresAt) {
  const deleteResult = getDb()
    .prepare('DELETE FROM refresh_tokens WHERE id = ?')
    .run(oldId);

  if (deleteResult.changes === 0) {
    // Token was already deleted — this is a REUSE attempt
    return false;
  }

  enforceSessionLimit(userId);
  getDb()
    .prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
    .run(userId, newTokenHash, expiresAt);

  return true;
}

/**
 * Invalidate ALL sessions for a user.
 * Called when refresh token reuse is detected.
 */
function invalidateAllUserSessions(userId) {
  getDb()
    .prepare('DELETE FROM refresh_tokens WHERE user_id = ?')
    .run(userId);
}

/**
 * Delete a specific refresh token (logout).
 */
function deleteRefreshToken(tokenHash) {
  getDb()
    .prepare('DELETE FROM refresh_tokens WHERE token_hash = ?')
    .run(tokenHash);
}

/**
 * Enforce max active sessions per user.
 * Deletes the oldest session(s) if over the limit.
 */
function enforceSessionLimit(userId) {
  const rows = getDb()
    .prepare('SELECT id FROM refresh_tokens WHERE user_id = ? ORDER BY created_at ASC')
    .all(userId);

  if (rows.length >= MAX_SESSIONS_PER_USER) {
    const toDelete = rows.slice(0, rows.length - MAX_SESSIONS_PER_USER + 1);
    const ids = toDelete.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');
    getDb()
      .prepare(`DELETE FROM refresh_tokens WHERE id IN (${placeholders})`)
      .run(...ids);
  }
}

/**
 * Remove all expired refresh tokens.
 * Called on startup and can be called periodically.
 */
function cleanExpiredTokens() {
  getDb()
    .prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')")
    .run();
}

// ─────────────────────────────────────────────────────────────────
// AI CALL TRACKING (for perUserLimiter)
// ─────────────────────────────────────────────────────────────────

/**
 * Record one AI call for rate-limit accounting.
 * Call this at the END of a successful AI request.
 */
function logApiCall(userId, feature) {
  getDb()
    .prepare('INSERT INTO ai_calls (user_id, feature) VALUES (?, ?)')
    .run(userId, feature);
}

/**
 * Count recent calls for a user+feature within the last N minutes.
 * Used by perUserLimiter for both burst and daily budget checks.
 */
function countRecentCalls(userId, feature, windowMinutes) {
  const row = getDb()
    .prepare(`
      SELECT COUNT(*) AS cnt
      FROM ai_calls
      WHERE user_id = ?
        AND feature  = ?
        AND called_at >= datetime('now', ? || ' minutes')
    `)
    .get(userId, feature, `-${windowMinutes}`);
  return row?.cnt ?? 0;
}

module.exports = {
  initDb,
  getDb,
  findUserById,
  isTokenRevoked,
  // Refresh tokens
  findRefreshToken,
  storeRefreshToken,
  rotateRefreshToken,
  invalidateAllUserSessions,
  deleteRefreshToken,
  cleanExpiredTokens,
  // AI call tracking
  logApiCall,
  countRecentCalls,
};
