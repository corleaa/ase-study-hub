#!/usr/bin/env node
'use strict';

const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'studyhub.db');

const [,, email, password, roleArg] = process.argv;
const role = (roleArg || 'free').trim().toLowerCase();

if (!email || !password) {
  console.error('Usage: node backend/scripts/create-user.js <email> <password> [free|pro]');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Error: Password must be at least 8 characters.');
  process.exit(1);
}

if (!['free', 'pro'].includes(role)) {
  console.error('Error: Role must be free or pro.');
  process.exit(1);
}

const normalizedEmail = email.trim().toLowerCase();

(async () => {
  let db;
  try {
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const existing = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(normalizedEmail);
    const hash = await bcrypt.hash(password, 12);

    if (existing) {
      db.prepare('UPDATE users SET password_hash = ?, role = ? WHERE id = ?').run(hash, role, existing.id);
      console.log(`[create-user] Updated existing user: ${normalizedEmail} (${role})`);
    } else {
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)'
      ).run(normalizedEmail, hash, role);
      console.log(`[create-user] Created user #${result.lastInsertRowid}: ${normalizedEmail} (${role})`);
    }
  } catch (err) {
    console.error('[create-user] Error:', err.message);
    process.exit(1);
  } finally {
    db?.close();
  }
})();
