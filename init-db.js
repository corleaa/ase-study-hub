#!/usr/bin/env node
// ═════════════════════════════════════════════════════════════════
// init-db.js — Initialize a clean Study Hub database
//
// Run this ONCE before starting the server for the first time,
// or after deleting the database to reset to a clean state.
//
// Usage:
//   node init-db.js
//
// What it does:
//   - Creates studyhub.db in backend/ with the correct schema
//   - Creates all required tables and indexes
//   - Does NOT create any users or tokens
//   - Safe to run multiple times (uses CREATE IF NOT EXISTS)
// ═════════════════════════════════════════════════════════════════
'use strict';

const path     = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'backend', 'studyhub.db');

console.log('[init-db] Initializing database at:', DB_PATH);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT    UNIQUE NOT NULL,
    expires_at  DATETIME NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

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

db.close();

console.log('[init-db] Done. Tables created: users, refresh_tokens, ai_calls');
console.log('[init-db] You can now start the server with: npm run dev');
