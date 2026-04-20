'use strict';

const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const { authenticate } = require('../middleware/authenticate');
const { getAdminStats, getDb } = require('../db/client');

function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  next();
}

router.get('/stats', authenticate, requireAdmin, (req, res, next) => {
  try { res.json(getAdminStats()); } catch (e) { next(e); }
});

// ── Reset parolă proprie (admin logged in) ────────────────────────
router.post('/reset-my-password', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Parola trebuie să aibă minim 8 caractere.' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    getDb().prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, req.user.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── One-time password reset (fără autentificare, protejat prin secret) ──
// TEMPORAR — va fi șters după folosire
router.post('/one-time-reset', async (req, res, next) => {
  try {
    const secret = req.body.secret || req.query.secret;
    const RESET_SECRET = process.env.RESET_SECRET;
    if (!RESET_SECRET || secret !== RESET_SECRET) {
      return res.status(403).json({ error: 'Invalid secret.' });
    }
    const email = req.body.email || 'alexcorlea@gmail.com';
    const newPassword = req.body.password || 'RealStudy2026!';
    const hash = await bcrypt.hash(newPassword, 12);
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
    if (existing) {
      db.prepare('UPDATE users SET password_hash=?, role=? WHERE email=?').run(hash, 'admin', email);
      res.json({ ok: true, action: 'updated', email, message: 'Parolă resetată.' });
    } else {
      db.prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')").run(email, hash);
      res.json({ ok: true, action: 'created', email, message: 'Cont creat cu rol admin.' });
    }
  } catch (e) { next(e); }
});

// ── Cleanup documente dintr-un subiect (pentru testing) ──────────
router.delete('/cleanup-subject/:subjectId', authenticate, requireAdmin, (req, res, next) => {
  try {
    const subjectId = parseInt(req.params.subjectId, 10);
    const db = getDb();
    const subject = db.prepare('SELECT * FROM subjects WHERE id=? AND user_id=?').get(subjectId, req.user.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });

    const deletedDocs = db.prepare('DELETE FROM documents WHERE subject_id=?').run(subjectId);
    const deletedSums = db.prepare('DELETE FROM summaries WHERE subject_id=?').run(subjectId);
    const deletedFlash = db.prepare('DELETE FROM flashcards WHERE subject_id=?').run(subjectId);
    const deletedQuiz = db.prepare('DELETE FROM quiz_sessions WHERE subject_id=?').run(subjectId);

    res.json({
      ok: true,
      subject: subject.name,
      deleted: {
        documents: deletedDocs.changes,
        summaries: deletedSums.changes,
        flashcards: deletedFlash.changes,
        quizSessions: deletedQuiz.changes,
      }
    });
  } catch (e) { next(e); }
});

module.exports = router;
