'use strict';
// ─────────────────────────────────────────────────────────────────
// routes/subjects.js — Subject CRUD
// All routes require authentication.
// ─────────────────────────────────────────────────────────────────

const router       = require('express').Router();
const { z }        = require('zod');
const { authenticate } = require('../middleware/authenticate');
const {
  getSubjectsByUser,
  getSubjectById,
  createSubject,
  deleteSubject,
  getSubjectStats,
  getDocumentsBySubject,
  getSummariesBySubject,
  getFlashcardsBySubject,
} = require('../db/client');

const CreateSubjectSchema = z.object({
  name:        z.string().min(1).max(100).trim(),
  description: z.string().max(500).trim().optional().default(''),
  color:       z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#6366f1'),
});

// GET /api/subjects — list all subjects with stats
router.get('/', authenticate, (req, res) => {
  try {
    const stats = getSubjectStats(req.user.id);
    res.json({ subjects: stats });
  } catch (e) {
    res.status(500).json({ error: 'Could not load subjects.' });
  }
});

// POST /api/subjects — create a subject
router.post('/', authenticate, (req, res) => {
  const parsed = CreateSubjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input.', details: parsed.error.flatten() });
  }
  try {
    const { name, description, color } = parsed.data;
    const subject = createSubject(req.user.id, name, description, color);
    res.status(201).json({ subject });
  } catch (e) {
    res.status(500).json({ error: 'Could not create subject.' });
  }
});

// GET /api/subjects/:id — single subject with full detail
router.get('/:id', authenticate, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id.' });

  const subject = getSubjectById(id, req.user.id);
  if (!subject) return res.status(404).json({ error: 'Subject not found.' });

  try {
    const documents = getDocumentsBySubject(id, req.user.id);
    const summaries = getSummariesBySubject(id, req.user.id);
    const flashcards = getFlashcardsBySubject(id, req.user.id);

    res.json({ subject, documents, summaries, flashcards });
  } catch (e) {
    res.status(500).json({ error: 'Could not load subject data.' });
  }
});

// DELETE /api/subjects/:id
router.delete('/:id', authenticate, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id.' });

  const subject = getSubjectById(id, req.user.id);
  if (!subject) return res.status(404).json({ error: 'Subject not found.' });

  deleteSubject(id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
