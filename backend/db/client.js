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
//   + role column on users: 'free' | 'pro' | 'admin'
//   + guest_ai_calls: IP-hash based tracking for unauthenticated users
// ═════════════════════════════════════════════════════════════════
const path     = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'studyhub.db');
let db;

const MAX_SESSIONS_PER_USER = 5;
const USAGE_LOG_RETENTION_DAYS = Number(process.env.USAGE_LOG_RETENTION_DAYS || 35);

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────
function initDb() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('temp_store = MEMORY');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    UNIQUE NOT NULL,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'free' CHECK(role IN ('free', 'pro', 'admin')),
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT    UNIQUE NOT NULL,
      expires_at  DATETIME NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ai_calls: one row per AI endpoint call for authenticated users
    CREATE TABLE IF NOT EXISTS ai_calls (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      feature    TEXT    NOT NULL,
      called_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- guest_ai_calls: IP-hash based tracking for unauthenticated users
    CREATE TABLE IF NOT EXISTS guest_ai_calls (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_hash   TEXT    NOT NULL,
      feature   TEXT    NOT NULL,
      called_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ── LEARNING ENGINE TABLES ────────────────────────────────────

    -- subjects: user's study subjects
    CREATE TABLE IF NOT EXISTS subjects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        TEXT    NOT NULL,
      description TEXT    DEFAULT '',
      color       TEXT    NOT NULL DEFAULT '#6366f1',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- documents: uploaded or manually created docs per subject
    CREATE TABLE IF NOT EXISTS documents (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id  INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT    NOT NULL,
      content     TEXT    NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- summaries: AI-generated summaries (markdown)
    CREATE TABLE IF NOT EXISTS summaries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id  INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
      title       TEXT    NOT NULL,
      content     TEXT    NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- flashcards: individual cards with SM-2 SRS data
    CREATE TABLE IF NOT EXISTS flashcards (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id    INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_id   INTEGER REFERENCES documents(id) ON DELETE SET NULL,
      front         TEXT    NOT NULL,
      back          TEXT    NOT NULL,
      ease_factor   REAL    NOT NULL DEFAULT 2.5,
      interval_days INTEGER NOT NULL DEFAULT 1,
      repetitions   INTEGER NOT NULL DEFAULT 0,
      due_date      DATE    NOT NULL DEFAULT (date('now')),
      last_reviewed DATETIME,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- quiz_sessions: each completed quiz attempt
    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id   INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      score        INTEGER NOT NULL DEFAULT 0,
      total        INTEGER NOT NULL DEFAULT 0,
      xp_earned    INTEGER NOT NULL DEFAULT 0,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- quiz_answers: individual answer records for mistake tracking
    CREATE TABLE IF NOT EXISTS quiz_answers (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id     INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      flashcard_id   INTEGER REFERENCES flashcards(id) ON DELETE SET NULL,
      question       TEXT    NOT NULL,
      correct_answer TEXT    NOT NULL,
      user_answer    TEXT,
      is_correct     INTEGER NOT NULL DEFAULT 0,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- streaks: one row per user, updated daily
    CREATE TABLE IF NOT EXISTS streaks (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      current_streak   INTEGER NOT NULL DEFAULT 0,
      best_streak      INTEGER NOT NULL DEFAULT 0,
      last_study_date  DATE,
      freeze_available INTEGER NOT NULL DEFAULT 1,
      freeze_used_week TEXT,
      updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- xp_events: XP transaction log
    CREATE TABLE IF NOT EXISTS xp_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount     INTEGER NOT NULL,
      reason     TEXT    NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ── ADAPTIVE RECALL ENGINE ───────────────────────────────────

    -- concepts: key concepts extracted from documents by AI
    CREATE TABLE IF NOT EXISTS concepts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id  INTEGER REFERENCES documents(id) ON DELETE CASCADE,
      subject_id   INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title        TEXT    NOT NULL,
      importance   TEXT    NOT NULL DEFAULT 'medium' CHECK(importance IN ('high','medium','low')),
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- concept_questions: 3 question types per concept
    CREATE TABLE IF NOT EXISTS concept_questions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      concept_id    INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
      type          TEXT    NOT NULL CHECK(type IN ('free_recall','logic','application')),
      question_text TEXT    NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- concept_answers: user answers with AI scoring
    CREATE TABLE IF NOT EXISTS concept_answers (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      concept_id     INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
      question_id    INTEGER NOT NULL REFERENCES concept_questions(id) ON DELETE CASCADE,
      answer_text    TEXT    NOT NULL,
      score          INTEGER NOT NULL DEFAULT 0,
      confidence     INTEGER,
      ai_feedback    TEXT,
      ai_explanation TEXT,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- concept_progress: per-concept SRS + difficulty tracking
    CREATE TABLE IF NOT EXISTS concept_progress (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      concept_id       INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
      difficulty_level TEXT    NOT NULL DEFAULT 'medium' CHECK(difficulty_level IN ('easy','medium','hard')),
      success_rate     REAL    NOT NULL DEFAULT 0.0,
      total_attempts   INTEGER NOT NULL DEFAULT 0,
      correct_attempts INTEGER NOT NULL DEFAULT 0,
      ease_factor      REAL    NOT NULL DEFAULT 2.5,
      interval_days    INTEGER NOT NULL DEFAULT 1,
      next_review_date DATE    NOT NULL DEFAULT (date('now')),
      last_seen        DATETIME,
      UNIQUE(user_id, concept_id)
    );

    -- ── INDEXES ──────────────────────────────────────────────────

    CREATE INDEX IF NOT EXISTS idx_ai_calls_user_feature
      ON ai_calls(user_id, feature, called_at);

    CREATE INDEX IF NOT EXISTS idx_ai_calls_feature_time
      ON ai_calls(feature, called_at);

    CREATE INDEX IF NOT EXISTS idx_guest_ai_calls_ip_feature
      ON guest_ai_calls(ip_hash, feature, called_at);

    CREATE INDEX IF NOT EXISTS idx_guest_ai_calls_feature_time
      ON guest_ai_calls(feature, called_at);

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
      ON refresh_tokens(user_id, expires_at);

    CREATE INDEX IF NOT EXISTS idx_subjects_user
      ON subjects(user_id);

    CREATE INDEX IF NOT EXISTS idx_documents_subject
      ON documents(subject_id, user_id);

    CREATE INDEX IF NOT EXISTS idx_flashcards_due
      ON flashcards(user_id, due_date);

    CREATE INDEX IF NOT EXISTS idx_flashcards_subject
      ON flashcards(subject_id, user_id);

    CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user
      ON quiz_sessions(user_id, completed_at);

    CREATE INDEX IF NOT EXISTS idx_xp_events_user
      ON xp_events(user_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_concepts_user
      ON concepts(user_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_concepts_document
      ON concepts(document_id, user_id);

    CREATE INDEX IF NOT EXISTS idx_concept_questions_concept
      ON concept_questions(concept_id);

    CREATE INDEX IF NOT EXISTS idx_concept_answers_user
      ON concept_answers(user_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_concept_progress_review
      ON concept_progress(user_id, next_review_date);
  `);

  // Migrations — safe to re-run (errors mean column already exists)
  try {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'free' CHECK(role IN ('free', 'pro', 'admin'))");
  } catch { /* already exists */ }
  try { db.exec('ALTER TABLE ai_calls ADD COLUMN tokens_input INTEGER NOT NULL DEFAULT 0'); } catch {}
  try { db.exec('ALTER TABLE ai_calls ADD COLUMN tokens_output INTEGER NOT NULL DEFAULT 0'); } catch {}
  try { db.exec('ALTER TABLE ai_calls ADD COLUMN cost_usd REAL NOT NULL DEFAULT 0.0'); } catch {}
  try { db.exec('ALTER TABLE ai_calls ADD COLUMN subject TEXT'); } catch {}
  // Settings table
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`);
    // Default: registration open
    db.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('registration_open', 'true')");
  } catch {}
  // Smart summary columns
  try { db.exec('ALTER TABLE summaries ADD COLUMN doc_hash TEXT'); } catch {}
  try { db.exec('ALTER TABLE summaries ADD COLUMN intent TEXT DEFAULT \'understand\''); } catch {}
  try { db.exec('ALTER TABLE summaries ADD COLUMN engine_version TEXT DEFAULT \'v1.0\''); } catch {}
  try { db.exec('ALTER TABLE summaries ADD COLUMN output_json TEXT'); } catch {}
  try { db.exec('ALTER TABLE summaries ADD COLUMN model TEXT'); } catch {}
  try { db.exec('ALTER TABLE summaries ADD COLUMN cost_usd REAL DEFAULT 0'); } catch {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_summaries_hash ON summaries(doc_hash, user_id)'); } catch {}

  // Summary feedback — thumbs up/down after reading a summary
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS summary_feedback (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      summary_id INTEGER REFERENCES summaries(id) ON DELETE SET NULL,
      user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      rating     INTEGER NOT NULL CHECK(rating IN (1, -1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  } catch {}

  // AI response cache — persistent 24h cache for quiz/flashcards/exam
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS ai_response_cache (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      feature      TEXT    NOT NULL,
      payload_hash TEXT    NOT NULL,
      response     TEXT    NOT NULL,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at   DATETIME NOT NULL,
      UNIQUE(feature, payload_hash)
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup ON ai_response_cache(feature, payload_hash, expires_at)');
  } catch {}

  // Document prescans — lightweight Haiku pre-analysis before summary generation
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS document_prescans (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_hash         TEXT    NOT NULL,
      user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
      detected_topics  TEXT,
      detected_kinds   TEXT,
      difficulty       TEXT,
      language         TEXT,
      domain_hint      TEXT,
      tokens_used      INTEGER DEFAULT 0,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_prescans_hash ON document_prescans(doc_hash, user_id)');
  } catch {}

  // Remove expired tokens on startup
  cleanExpiredTokens();
  cleanUsageLogs();
  cleanExpiredAiCache();

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
    .prepare('SELECT id, email, role FROM users WHERE id = ?')
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

function cleanUsageLogs(retentionDays = USAGE_LOG_RETENTION_DAYS) {
  const retention = Number(retentionDays);
  if (!Number.isFinite(retention) || retention <= 0) return;

  getDb()
    .prepare("DELETE FROM ai_calls WHERE called_at < datetime('now', ? || ' days')")
    .run(`-${retention}`);

  getDb()
    .prepare("DELETE FROM guest_ai_calls WHERE called_at < datetime('now', ? || ' days')")
    .run(`-${retention}`);
}

// ─────────────────────────────────────────────────────────────────
// AI CALL TRACKING (for perUserLimiter)
// ─────────────────────────────────────────────────────────────────

/**
 * Record one AI call for rate-limit accounting.
 * For authenticated users pass userId; for guests pass null + ipHash.
 */
function logApiCall(userId, feature, ipHash, tokensInput = 0, tokensOutput = 0, costUsd = 0, subject = null) {
  if (userId !== null && userId !== undefined) {
    getDb()
      .prepare('INSERT INTO ai_calls (user_id, feature, tokens_input, tokens_output, cost_usd, subject) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, feature, tokensInput, tokensOutput, costUsd, subject || null);
  } else if (ipHash) {
    getDb()
      .prepare('INSERT INTO guest_ai_calls (ip_hash, feature) VALUES (?, ?)')
      .run(ipHash, feature);
  }
}

// Daily cost check — returns true if user has exceeded daily token budget
const DAILY_TOKEN_LIMIT_FREE  = 200_000;  // ~$0.50/zi
const DAILY_TOKEN_LIMIT_PRO   = 800_000;  // ~$2/zi
function isDailyTokenBudgetExceeded(userId, role) {
  if (role === 'admin') return false;
  const row = getDb()
    .prepare("SELECT COALESCE(SUM(tokens_input+tokens_output),0) AS total FROM ai_calls WHERE user_id=? AND called_at >= date('now')")
    .get(userId);
  const total = row?.total ?? 0;
  const limit = role === 'pro' ? DAILY_TOKEN_LIMIT_PRO : DAILY_TOKEN_LIMIT_FREE;
  return total >= limit;
}

/**
 * Count recent calls for an authenticated user+feature within the last N minutes.
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

/**
 * Count recent calls for a guest by IP hash within the last N minutes.
 */
function countRecentCallsByIp(ipHash, feature, windowMinutes) {
  const row = getDb()
    .prepare(`
      SELECT COUNT(*) AS cnt
      FROM guest_ai_calls
      WHERE ip_hash  = ?
        AND feature  = ?
        AND called_at >= datetime('now', ? || ' minutes')
    `)
    .get(ipHash, feature, `-${windowMinutes}`);
  return row?.cnt ?? 0;
}

// ─────────────────────────────────────────────────────────────────
// SUBJECTS
// ─────────────────────────────────────────────────────────────────
function getSubjectsByUser(userId) {
  return getDb()
    .prepare('SELECT * FROM subjects WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId);
}

function getSubjectById(id, userId) {
  return getDb()
    .prepare('SELECT * FROM subjects WHERE id = ? AND user_id = ?')
    .get(id, userId);
}

function createSubject(userId, name, description, color) {
  const result = getDb()
    .prepare('INSERT INTO subjects (user_id, name, description, color) VALUES (?, ?, ?, ?)')
    .run(userId, name, description || '', color || '#6366f1');
  return getDb().prepare('SELECT * FROM subjects WHERE id = ?').get(result.lastInsertRowid);
}

function deleteSubject(id, userId) {
  return getDb()
    .prepare('DELETE FROM subjects WHERE id = ? AND user_id = ?')
    .run(id, userId);
}

// ─────────────────────────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────────────────────────
function createDocument(userId, subjectId, title, content) {
  const result = getDb()
    .prepare('INSERT INTO documents (subject_id, user_id, title, content) VALUES (?, ?, ?, ?)')
    .run(subjectId, userId, title, content);
  return getDb().prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
}

function getDocumentsBySubject(subjectId, userId) {
  return getDb()
    .prepare('SELECT id, subject_id, title, created_at FROM documents WHERE subject_id = ? AND user_id = ? ORDER BY created_at DESC')
    .all(subjectId, userId);
}

// ─────────────────────────────────────────────────────────────────
// SUMMARIES
// ─────────────────────────────────────────────────────────────────
function createSummary(userId, subjectId, title, content, documentId) {
  const result = getDb()
    .prepare('INSERT INTO summaries (subject_id, user_id, document_id, title, content) VALUES (?, ?, ?, ?, ?)')
    .run(subjectId, userId, documentId || null, title, content);
  return getDb().prepare('SELECT * FROM summaries WHERE id = ?').get(result.lastInsertRowid);
}

function getSummariesBySubject(subjectId, userId) {
  return getDb()
    .prepare('SELECT id, subject_id, document_id, title, created_at FROM summaries WHERE subject_id = ? AND user_id = ? ORDER BY created_at DESC')
    .all(subjectId, userId);
}

// ─────────────────────────────────────────────────────────────────
// FLASHCARDS
// ─────────────────────────────────────────────────────────────────
function createFlashcard(userId, subjectId, front, back, documentId) {
  const result = getDb()
    .prepare(`
      INSERT INTO flashcards (subject_id, user_id, document_id, front, back)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(subjectId, userId, documentId || null, front, back);
  return getDb().prepare('SELECT * FROM flashcards WHERE id = ?').get(result.lastInsertRowid);
}

function createFlashcardsBatch(userId, subjectId, cards, documentId) {
  const insert = getDb().prepare(`
    INSERT INTO flashcards (subject_id, user_id, document_id, front, back)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertMany = getDb().transaction((items) => {
    for (const card of items) {
      insert.run(subjectId, userId, documentId || null, card.front, card.back);
    }
  });
  insertMany(cards);
}

function getFlashcardsBySubject(subjectId, userId) {
  return getDb()
    .prepare('SELECT * FROM flashcards WHERE subject_id = ? AND user_id = ? ORDER BY due_date ASC')
    .all(subjectId, userId);
}

function getDueFlashcards(userId, limit = 50) {
  return getDb()
    .prepare(`
      SELECT f.*, s.name AS subject_name, s.color AS subject_color
      FROM flashcards f
      JOIN subjects s ON s.id = f.subject_id
      WHERE f.user_id = ?
        AND f.due_date <= date('now')
      ORDER BY f.due_date ASC, f.ease_factor ASC
      LIMIT ?
    `)
    .all(userId, limit);
}

function getDueCountBySubject(userId) {
  return getDb()
    .prepare(`
      SELECT s.id, s.name, s.color, COUNT(f.id) AS due_count
      FROM subjects s
      LEFT JOIN flashcards f ON f.subject_id = s.id
        AND f.user_id = s.user_id
        AND f.due_date <= date('now')
      WHERE s.user_id = ?
      GROUP BY s.id
      ORDER BY due_count DESC
    `)
    .all(userId);
}

function updateFlashcardSRS(id, userId, easeFactor, intervalDays, repetitions, dueDate) {
  return getDb()
    .prepare(`
      UPDATE flashcards
      SET ease_factor   = ?,
          interval_days = ?,
          repetitions   = ?,
          due_date      = ?,
          last_reviewed = datetime('now')
      WHERE id = ? AND user_id = ?
    `)
    .run(easeFactor, intervalDays, repetitions, dueDate, id, userId);
}

function getFlashcardById(id, userId) {
  return getDb()
    .prepare('SELECT * FROM flashcards WHERE id = ? AND user_id = ?')
    .get(id, userId);
}

function deleteFlashcard(id, userId) {
  return getDb()
    .prepare('DELETE FROM flashcards WHERE id = ? AND user_id = ?')
    .run(id, userId);
}

// ─────────────────────────────────────────────────────────────────
// QUIZ SESSIONS
// ─────────────────────────────────────────────────────────────────
function createQuizSession(userId, subjectId, score, total, xpEarned) {
  const result = getDb()
    .prepare('INSERT INTO quiz_sessions (user_id, subject_id, score, total, xp_earned) VALUES (?, ?, ?, ?, ?)')
    .run(userId, subjectId || null, score, total, xpEarned);
  return result.lastInsertRowid;
}

function getQuizHistory(userId, limit = 20) {
  return getDb()
    .prepare(`
      SELECT qs.*, s.name AS subject_name
      FROM quiz_sessions qs
      LEFT JOIN subjects s ON s.id = qs.subject_id
      WHERE qs.user_id = ?
      ORDER BY qs.completed_at DESC
      LIMIT ?
    `)
    .all(userId, limit);
}

// ─────────────────────────────────────────────────────────────────
// STREAKS
// ─────────────────────────────────────────────────────────────────
function getStreak(userId) {
  return getDb()
    .prepare('SELECT * FROM streaks WHERE user_id = ?')
    .get(userId);
}

function upsertStreak(userId) {
  const today = new Date().toISOString().split('T')[0];
  const row = getStreak(userId);

  if (!row) {
    getDb()
      .prepare('INSERT INTO streaks (user_id, current_streak, best_streak, last_study_date) VALUES (?, 1, 1, ?)')
      .run(userId, today);
    return getStreak(userId);
  }

  // Already studied today — no change
  if (row.last_study_date === today) return row;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let newStreak;

  if (row.last_study_date === yesterday) {
    // Consecutive day
    newStreak = row.current_streak + 1;
  } else {
    // Missed at least one day — check freeze
    const currentWeek = getISOWeek(new Date());
    if (row.freeze_available && row.freeze_used_week !== currentWeek) {
      // Use freeze — streak preserved, freeze consumed
      newStreak = row.current_streak;
      getDb()
        .prepare(`
          UPDATE streaks
          SET freeze_available = 0, freeze_used_week = ?, updated_at = datetime('now')
          WHERE user_id = ?
        `)
        .run(currentWeek, userId);
    } else {
      // Reset streak
      newStreak = 1;
    }
  }

  const bestStreak = Math.max(row.best_streak, newStreak);
  // Reset weekly freeze on new week
  const currentWeek = getISOWeek(new Date());
  const freezeAvailable = (row.freeze_used_week !== currentWeek) ? 1 : row.freeze_available;

  getDb()
    .prepare(`
      UPDATE streaks
      SET current_streak  = ?,
          best_streak     = ?,
          last_study_date = ?,
          freeze_available = ?,
          updated_at      = datetime('now')
      WHERE user_id = ?
    `)
    .run(newStreak, bestStreak, today, freezeAvailable, userId);

  return getStreak(userId);
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-W${String(Math.ceil((((d - yearStart) / 86400000) + 1) / 7)).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────
// XP
// ─────────────────────────────────────────────────────────────────
function addXp(userId, amount, reason) {
  getDb()
    .prepare('INSERT INTO xp_events (user_id, amount, reason) VALUES (?, ?, ?)')
    .run(userId, amount, reason);
}

function getTotalXp(userId) {
  const row = getDb()
    .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM xp_events WHERE user_id = ?')
    .get(userId);
  return row?.total ?? 0;
}

function getXpLevel(totalXp) {
  const levels = [
    { level: 1, label: 'Beginner',     min: 0    },
    { level: 2, label: 'Learner',      min: 500  },
    { level: 3, label: 'Practitioner', min: 1500 },
    { level: 4, label: 'Expert',       min: 4000 },
    { level: 5, label: 'Master',       min: 10000 },
  ];
  let current = levels[0];
  for (const l of levels) {
    if (totalXp >= l.min) current = l;
  }
  const next = levels.find(l => l.min > totalXp);
  return {
    level:    current.level,
    label:    current.label,
    xp:       totalXp,
    nextAt:   next?.min ?? null,
    progress: next ? Math.round(((totalXp - current.min) / (next.min - current.min)) * 100) : 100,
  };
}

// ─────────────────────────────────────────────────────────────────
// READINESS SCORE (per subject)
// ─────────────────────────────────────────────────────────────────
function getReadinessScore(subjectId, userId) {
  const row = getDb()
    .prepare(`
      SELECT AVG(ease_factor) AS avg_ease, COUNT(*) AS card_count
      FROM flashcards
      WHERE subject_id = ? AND user_id = ? AND repetitions > 0
    `)
    .get(subjectId, userId);

  if (!row || row.card_count === 0) return 0;
  return Math.round((row.avg_ease / 2.5) * 100);
}

function getSubjectStats(userId) {
  const subjects = getSubjectsByUser(userId);
  return subjects.map(s => {
    const cards = getDb()
      .prepare('SELECT COUNT(*) AS total FROM flashcards WHERE subject_id = ? AND user_id = ?')
      .get(s.id, userId);
    const due = getDb()
      .prepare("SELECT COUNT(*) AS cnt FROM flashcards WHERE subject_id = ? AND user_id = ? AND due_date <= date('now')")
      .get(s.id, userId);
    const mastered = getDb()
      .prepare('SELECT COUNT(*) AS cnt FROM flashcards WHERE subject_id = ? AND user_id = ? AND repetitions >= 3 AND ease_factor >= 2.3')
      .get(s.id, userId);
    return {
      ...s,
      card_count:     cards.total,
      due_count:      due.cnt,
      mastered_count: mastered.cnt,
      readiness:      getReadinessScore(s.id, userId),
    };
  });
}

// ─────────────────────────────────────────────────────────────────
// ADAPTIVE RECALL ENGINE
// ─────────────────────────────────────────────────────────────────

function createConceptsBatch(userId, subjectId, documentId, concepts) {
  const insertConcept = getDb().prepare(
    "INSERT INTO concepts (user_id, subject_id, document_id, title, importance) VALUES (?, ?, ?, ?, ?)"
  );
  const insertQuestion = getDb().prepare(
    "INSERT INTO concept_questions (concept_id, type, question_text) VALUES (?, ?, ?)"
  );
  const insertAll = getDb().transaction((items) => {
    const ids = [];
    for (const c of items) {
      const r = insertConcept.run(userId, subjectId || null, documentId || null, c.title, c.importance || 'medium');
      ids.push(r.lastInsertRowid);
      for (const q of (c.questions || [])) {
        insertQuestion.run(r.lastInsertRowid, q.type, q.question_text);
      }
    }
    return ids;
  });
  return insertAll(concepts);
}

function getConceptsByUser(userId) {
  return getDb()
    .prepare('SELECT * FROM concepts WHERE user_id = ? ORDER BY importance DESC, created_at DESC')
    .all(userId);
}

function getDueConcepts(userId, limit = 20) {
  return getDb()
    .prepare(`
      SELECT c.*, cp.difficulty_level, cp.success_rate, cp.total_attempts,
             cp.ease_factor, cp.interval_days, cp.next_review_date, cp.last_seen
      FROM concepts c
      LEFT JOIN concept_progress cp ON cp.concept_id = c.id AND cp.user_id = c.user_id
      WHERE c.user_id = ?
        AND (cp.next_review_date IS NULL OR cp.next_review_date <= date('now'))
      ORDER BY
        CASE c.importance WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END ASC,
        cp.success_rate ASC NULLS FIRST
      LIMIT ?
    `)
    .all(userId, limit);
}

function getConceptStats(userId) {
  const total = getDb()
    .prepare('SELECT COUNT(*) AS cnt FROM concepts WHERE user_id = ?')
    .get(userId)?.cnt ?? 0;

  const dueToday = getDb()
    .prepare(`
      SELECT COUNT(*) AS cnt
      FROM concepts c
      LEFT JOIN concept_progress cp ON cp.concept_id = c.id AND cp.user_id = c.user_id
      WHERE c.user_id = ?
        AND (cp.next_review_date IS NULL OR cp.next_review_date <= date('now'))
    `)
    .get(userId)?.cnt ?? 0;

  const weak = getDb()
    .prepare(`
      SELECT COUNT(*) AS cnt FROM concept_progress
      WHERE user_id = ? AND success_rate < 0.5 AND total_attempts >= 2
    `)
    .get(userId)?.cnt ?? 0;

  return { total, dueToday, weak };
}

function getQuestionsForConcept(conceptId) {
  return getDb()
    .prepare('SELECT * FROM concept_questions WHERE concept_id = ? ORDER BY type ASC')
    .all(conceptId);
}

function getPrimaryQuestion(conceptId) {
  return getDb()
    .prepare("SELECT * FROM concept_questions WHERE concept_id = ? AND type = 'free_recall' LIMIT 1")
    .get(conceptId)
    || getDb()
    .prepare('SELECT * FROM concept_questions WHERE concept_id = ? LIMIT 1')
    .get(conceptId);
}

function saveConceptAnswer(userId, conceptId, questionId, { answerText, score, confidence, aiFeedback, aiExplanation }) {
  const result = getDb()
    .prepare(`
      INSERT INTO concept_answers (user_id, concept_id, question_id, answer_text, score, confidence, ai_feedback, ai_explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(userId, conceptId, questionId, answerText, score, confidence || null, aiFeedback || null, aiExplanation || null);
  return result.lastInsertRowid;
}

function updateConceptProgress(userId, conceptId, score) {
  const isCorrect = score >= 60;
  const existing = getDb()
    .prepare('SELECT * FROM concept_progress WHERE user_id = ? AND concept_id = ?')
    .get(userId, conceptId);

  if (!existing) {
    // First attempt — create progress row
    const interval = isCorrect ? 1 : 0;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);
    const nextReview = nextDate.toISOString().split('T')[0];
    getDb()
      .prepare(`
        INSERT INTO concept_progress
          (user_id, concept_id, difficulty_level, success_rate, total_attempts, correct_attempts,
           ease_factor, interval_days, next_review_date, last_seen)
        VALUES (?, ?, ?, ?, 1, ?, 2.5, ?, ?, datetime('now'))
      `)
      .run(
        userId, conceptId,
        isCorrect ? 'medium' : 'hard',
        isCorrect ? 1.0 : 0.0,
        isCorrect ? 1 : 0,
        interval,
        nextReview
      );
    return;
  }

  const total    = existing.total_attempts + 1;
  const correct  = existing.correct_attempts + (isCorrect ? 1 : 0);
  const rate     = correct / total;

  // Adaptive difficulty
  let diff = existing.difficulty_level;
  if (rate > 0.8 && total >= 3) diff = 'easy';
  else if (rate < 0.5 && total >= 2) diff = 'hard';
  else diff = 'medium';

  // SRS interval (simplified SM-2)
  let ease   = existing.ease_factor;
  let iDays  = existing.interval_days;

  if (isCorrect) {
    ease  = Math.max(1.3, Math.min(2.5, ease + 0.1));
    iDays = iDays === 0 ? 1 : Math.round(iDays * ease);
    iDays = Math.min(iDays, 30);
  } else {
    ease  = Math.max(1.3, ease - 0.2);
    iDays = 0; // review again today
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + iDays);
  const nextReview = nextDate.toISOString().split('T')[0];

  getDb()
    .prepare(`
      UPDATE concept_progress
      SET difficulty_level  = ?,
          success_rate      = ?,
          total_attempts    = ?,
          correct_attempts  = ?,
          ease_factor       = ?,
          interval_days     = ?,
          next_review_date  = ?,
          last_seen         = datetime('now')
      WHERE user_id = ? AND concept_id = ?
    `)
    .run(diff, rate, total, correct, ease, iDays, nextReview, userId, conceptId);
}

// ─────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────
function getSetting(key) {
  return getDb().prepare('SELECT value FROM settings WHERE key=?').get(key)?.value ?? null;
}
function setSetting(key, value) {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
}

// ─────────────────────────────────────────────────────────────────
// SMART SUMMARIES
// ─────────────────────────────────────────────────────────────────
function getSmartSummaryByHash(docHash, userId) {
  return getDb()
    .prepare('SELECT * FROM summaries WHERE doc_hash = ? AND user_id = ? LIMIT 1')
    .get(docHash, userId);
}

function createSmartSummary(userId, subjectId, title, docHash, intent, engineVersion, outputJson, model, costUsd, documentId) {
  const result = getDb()
    .prepare(`INSERT INTO summaries
      (user_id, subject_id, document_id, title, content, doc_hash, intent, engine_version, output_json, model, cost_usd)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(userId, subjectId, documentId || null, title, '', docHash, intent, engineVersion, outputJson, model, costUsd);
  return getDb().prepare('SELECT * FROM summaries WHERE id = ?').get(result.lastInsertRowid);
}

// ─────────────────────────────────────────────────────────────────
// SUMMARY FEEDBACK
// ─────────────────────────────────────────────────────────────────
function createSummaryFeedback(summaryId, userId, rating) {
  getDb()
    .prepare('INSERT INTO summary_feedback (summary_id, user_id, rating) VALUES (?, ?, ?)')
    .run(summaryId || null, userId || null, rating);
}

// ─────────────────────────────────────────────────────────────────
// AI RESPONSE CACHE (persistent, 24h TTL)
// ─────────────────────────────────────────────────────────────────
function getDbCached(feature, payloadHash) {
  const row = getDb()
    .prepare(`SELECT response FROM ai_response_cache WHERE feature = ? AND payload_hash = ? AND expires_at > datetime('now') LIMIT 1`)
    .get(feature, payloadHash);
  if (!row) return null;
  try { return JSON.parse(row.response); } catch { return null; }
}

function setDbCached(feature, payloadHash, data, ttlSeconds = 86400) {
  try {
    getDb()
      .prepare(`INSERT OR REPLACE INTO ai_response_cache (feature, payload_hash, response, expires_at) VALUES (?, ?, ?, datetime('now', '+${ttlSeconds} seconds'))`)
      .run(feature, payloadHash, JSON.stringify(data));
  } catch { /* non-critical — cache miss is acceptable */ }
  return data;
}

function cleanExpiredAiCache() {
  try { getDb().prepare("DELETE FROM ai_response_cache WHERE expires_at <= datetime('now')").run(); } catch {}
}

// ─────────────────────────────────────────────────────────────────
// DOCUMENT PRESCANS
// ─────────────────────────────────────────────────────────────────
function getPrescanByHash(docHash, userId) {
  return getDb()
    .prepare('SELECT * FROM document_prescans WHERE doc_hash = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(docHash, userId);
}

function createPrescan(docHash, userId, detected) {
  const result = getDb()
    .prepare(`INSERT INTO document_prescans
      (doc_hash, user_id, detected_topics, detected_kinds, difficulty, language, domain_hint, tokens_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      docHash,
      userId || null,
      JSON.stringify(detected.topics || []),
      JSON.stringify(detected.kinds || []),
      detected.difficulty || null,
      detected.language || null,
      detected.domain_hint || null,
      detected.tokens_used || 0,
    );
  return getDb().prepare('SELECT * FROM document_prescans WHERE id = ?').get(result.lastInsertRowid);
}

// ─────────────────────────────────────────────────────────────────
// ADMIN STATS
// ─────────────────────────────────────────────────────────────────
function getAdminStats() {
  const db = getDb();

  const totalUsers = db.prepare('SELECT COUNT(*) AS cnt FROM users').get()?.cnt ?? 0;
  const totalCostToday = db.prepare("SELECT COALESCE(SUM(cost_usd),0) AS c FROM ai_calls WHERE called_at >= date('now')").get()?.c ?? 0;
  const callsToday = db.prepare("SELECT COUNT(*) AS cnt FROM ai_calls WHERE called_at >= date('now')").get()?.cnt ?? 0;
  const activeToday = db.prepare("SELECT COUNT(DISTINCT user_id) AS cnt FROM ai_calls WHERE called_at >= date('now')").get()?.cnt ?? 0;
  const totalCostAllTime = db.prepare('SELECT COALESCE(SUM(cost_usd),0) AS c FROM ai_calls').get()?.c ?? 0;
  const totalCalls = db.prepare('SELECT COUNT(*) AS cnt FROM ai_calls').get()?.cnt ?? 0;

  const costLast7Days = db.prepare(`
    SELECT date(called_at) AS day,
           COUNT(*) AS calls,
           COALESCE(SUM(cost_usd),0) AS cost,
           COALESCE(SUM(tokens_input+tokens_output),0) AS tokens
    FROM ai_calls
    WHERE called_at >= date('now','-6 days')
    GROUP BY date(called_at)
    ORDER BY day ASC
  `).all();

  const byFeature = db.prepare(`
    SELECT feature,
           COUNT(*) AS calls,
           COALESCE(SUM(cost_usd),0) AS cost,
           COALESCE(SUM(tokens_input),0) AS tokens_in,
           COALESCE(SUM(tokens_output),0) AS tokens_out
    FROM ai_calls
    GROUP BY feature
    ORDER BY cost DESC
  `).all();

  const topSubjects = db.prepare(`
    SELECT subject, COUNT(*) AS cnt, COALESCE(SUM(cost_usd),0) AS cost
    FROM ai_calls
    WHERE subject IS NOT NULL
    GROUP BY subject
    ORDER BY cnt DESC
    LIMIT 8
  `).all();

  const recentCalls = db.prepare(`
    SELECT ac.id, ac.feature, ac.tokens_input, ac.tokens_output, ac.cost_usd,
           ac.subject, ac.called_at, u.email
    FROM ai_calls ac
    LEFT JOIN users u ON u.id = ac.user_id
    ORDER BY ac.called_at DESC
    LIMIT 30
  `).all();

  const topUsersByCost = db.prepare(`
    SELECT u.email, u.role, COUNT(*) AS calls,
           COALESCE(SUM(ac.cost_usd),0) AS cost
    FROM ai_calls ac
    JOIN users u ON u.id = ac.user_id
    GROUP BY ac.user_id
    ORDER BY cost DESC
    LIMIT 10
  `).all();

  return {
    overview: { totalUsers, totalCostToday, callsToday, activeToday, totalCostAllTime, totalCalls },
    costLast7Days,
    byFeature,
    topSubjects,
    recentCalls,
    topUsersByCost,
  };
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
  cleanUsageLogs,
  // AI call tracking
  logApiCall,
  countRecentCalls,
  countRecentCallsByIp,
  isDailyTokenBudgetExceeded,
  // Subjects
  getSubjectsByUser,
  getSubjectById,
  createSubject,
  deleteSubject,
  // Documents
  createDocument,
  getDocumentsBySubject,
  // Summaries
  createSummary,
  getSummariesBySubject,
  // Flashcards
  createFlashcard,
  createFlashcardsBatch,
  getFlashcardsBySubject,
  getDueFlashcards,
  getDueCountBySubject,
  updateFlashcardSRS,
  getFlashcardById,
  deleteFlashcard,
  // Quiz sessions
  createQuizSession,
  getQuizHistory,
  // Streaks
  getStreak,
  upsertStreak,
  // XP
  addXp,
  getTotalXp,
  getXpLevel,
  // Stats
  getReadinessScore,
  getSubjectStats,
  // Settings
  getSetting,
  setSetting,
  // Smart summaries
  getSmartSummaryByHash,
  createSmartSummary,
  getPrescanByHash,
  createPrescan,
  getDbCached,
  setDbCached,
  createSummaryFeedback,
  // Admin
  getAdminStats,
  // Adaptive recall engine
  createConceptsBatch,
  getConceptsByUser,
  getDueConcepts,
  getConceptStats,
  getQuestionsForConcept,
  getPrimaryQuestion,
  saveConceptAnswer,
  updateConceptProgress,
};
