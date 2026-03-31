#!/usr/bin/env node
// ═════════════════════════════════════════════════════════════════
// scripts/create-admin.js — Create or promote an admin user
//
// Usage:
//   node backend/scripts/create-admin.js <email> <password>
//
// Examples:
//   node backend/scripts/create-admin.js admin@studyhub.ro P@ssword123!
//
// What it does:
//   - If email doesn't exist: creates user with role='admin'
//   - If email exists: promotes existing user to role='admin'
// ═════════════════════════════════════════════════════════════════
'use strict';

const path    = require('path');
const bcrypt  = require('bcryptjs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'studyhub.db');

const [,, email, password] = process.argv;

if (!email || !password) {
  console.error('Usage: node backend/scripts/create-admin.js <email> <password>');
  console.error('Example: node backend/scripts/create-admin.js admin@studyhub.ro P@ssword123!');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Error: Password must be at least 8 characters.');
  process.exit(1);
}

const normalizedEmail = email.trim().toLowerCase();

(async () => {
  let db;
  try {
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const existing = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(normalizedEmail);

    if (existing) {
      // Promote existing user to admin
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
      console.log(`\n[create-admin] User promoted to admin:`);
      console.log(`  ID:    ${existing.id}`);
      console.log(`  Email: ${normalizedEmail}`);
      console.log(`  Role:  free → admin`);
    } else {
      // Create new admin user
      const hash   = await bcrypt.hash(password, 12);
      const result = db.prepare(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')"
      ).run(normalizedEmail, hash);

      console.log(`\n[create-admin] Admin user created:`);
      console.log(`  ID:    ${result.lastInsertRowid}`);
      console.log(`  Email: ${normalizedEmail}`);
      console.log(`  Role:  admin`);
    }

    console.log(`\nYou can now log in at the platform with these credentials.`);
    console.log(`Admin accounts have no AI rate limits.\n`);
  } catch (err) {
    console.error('[create-admin] Error:', err.message);
    process.exit(1);
  } finally {
    db?.close();
  }
})();
