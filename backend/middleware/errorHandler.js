// ═════════════════════════════════════════════════════════════════
// middleware/errorHandler.js — Centralised error handling
//
// PART 3 — Secure Error Handling
//
// Principles:
//   1. Internal errors → logged in full server-side
//   2. Clients → receive only a safe, human-readable message
//   3. Stack traces → NEVER sent to clients
//   4. Provider errors (Anthropic 500, DB errors) → wrapped in
//      generic messages; the word "Anthropic" or "SQLite" never
//      appears in a client response
//   5. 4xx errors → client message can be specific (it's their fault)
//   6. 5xx errors → always generic (it's our fault; hide details)
//
// Safe error messages by category:
//   400 validation → tell them what was wrong (Zod details)
//   401 auth       → generic "Authentication required"
//   403 forbidden  → generic "Access denied"
//   404            → "Not found"
//   413 too large  → specific size
//   415 wrong type → specific allowed types
//   422 unprocessable → specific but no internal detail
//   429 rate limit → when to retry
//   5xx            → "Something went wrong. Please try again."
// ═════════════════════════════════════════════════════════════════
'use strict';

const { logger } = require('../utils/logger');
const { auditLog } = require('../utils/auditLogger');

// ─────────────────────────────────────────────────────────────────
// Safe messages for server-side errors
// ─────────────────────────────────────────────────────────────────
const SAFE_SERVER_MESSAGES = {
  DB_ERROR:       'A database error occurred. Please try again.',
  AI_UNAVAILABLE: 'The AI service is temporarily unavailable. Please try again in a moment.',
  AI_TIMEOUT:     'The AI request timed out. Please try again with less content.',
  PARSE_ERROR:    'An error occurred processing your request. Please try again.',
  UNKNOWN:        'Something went wrong. Please try again.',
};

/**
 * Global Express error handler.
 * Must be registered as the last app.use() in server.js.
 *
 * Usage: app.use(errorHandler);
 */
function errorHandler(err, req, res, _next) {
  const status  = err.status || err.statusCode || 500;
  const isServer = status >= 500;

  // ── Log everything internally ──────────────────────────────────
  const logPayload = {
    status,
    message: err.message,
    code:    err.code,
    path:    req.path,
    method:  req.method,
    userId:  req.user?.id,
    ip:      req.ip,
    // Stack only in development — too verbose for production logs
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  };

  if (isServer) {
    logger.error('Server error', logPayload);
  } else {
    logger.warn('Client error', logPayload);
  }

  // Audit unexpected server errors — they may indicate an attack
  if (isServer) {
    auditLog('SERVER_ERROR', {
      status,
      code: err.code,
      path: req.path,
      userId: req.user?.id,
    });
  }

  // ── Send safe response ─────────────────────────────────────────
  if (isServer) {
    // Server errors: never reveal internals
    const safeMessage = mapServerError(err);
    return res.status(status).json({ error: safeMessage });
  }

  // Client errors (4xx): the message is for the client, but we still
  // sanitise it to make sure no internal detail slipped in
  const clientMessage = sanitiseClientMessage(err.message);
  res.status(status).json({ error: clientMessage });
}

/**
 * Map known server error patterns to safe messages.
 */
function mapServerError(err) {
  const msg = err.message?.toLowerCase() || '';

  // AI provider errors
  if (msg.includes('anthropic') || msg.includes('ai service'))
    return SAFE_SERVER_MESSAGES.AI_UNAVAILABLE;
  if (msg.includes('timeout') || msg.includes('timed out'))
    return SAFE_SERVER_MESSAGES.AI_TIMEOUT;

  // Database errors
  if (msg.includes('sqlite') || msg.includes('database') || err.code === 'SQLITE_ERROR')
    return SAFE_SERVER_MESSAGES.DB_ERROR;

  // JSON parse errors (corrupted request that slipped through)
  if (err.type === 'entity.parse.failed')
    return SAFE_SERVER_MESSAGES.PARSE_ERROR;

  return SAFE_SERVER_MESSAGES.UNKNOWN;
}

/**
 * Sanitise a client-facing error message.
 * Removes any mention of internal systems that might have slipped through.
 */
function sanitiseClientMessage(msg) {
  if (!msg) return 'Request failed.';
  return msg
    .replace(/anthropic/gi, 'AI service')
    .replace(/sqlite|postgres|mysql/gi, 'database')
    .replace(/\/home\/[^\s]+/g, '[path]')       // file system paths
    .replace(/node_modules\/[^\s]+/g, '[module]') // npm module paths
    .slice(0, 300);  // cap length
}

// ─────────────────────────────────────────────────────────────────
// 404 handler — register this before errorHandler in server.js
// ─────────────────────────────────────────────────────────────────
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'The requested resource was not found.' });
}

// ─────────────────────────────────────────────────────────────────
// Async wrapper — catches thrown errors in async route handlers
// and passes them to next() so errorHandler receives them.
//
// Usage: router.get('/path', asyncWrap(async (req, res) => { ... }))
// ─────────────────────────────────────────────────────────────────
function asyncWrap(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, notFoundHandler, asyncWrap };
