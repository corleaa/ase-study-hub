'use strict';
// ─────────────────────────────────────────────────────────────────
// routes/learning.js — Learning engine API
//
// Endpoints:
//   GET  /api/learning/today         — daily session data (due cards + stats)
//   GET  /api/learning/stats         — full user stats (XP, streak, readiness)
//   POST /api/learning/cards/review  — submit a card review (SRS + XP)
//   POST /api/learning/cards         — create a flashcard manually
//   POST /api/learning/cards/batch   — save AI-generated flashcards to DB
//   DELETE /api/learning/cards/:id   — delete a card
//   POST /api/learning/quiz/complete — record a quiz session result
//   GET  /api/learning/quiz/history  — quiz history
//   POST /api/learning/documents     — save a document
//   POST /api/learning/summaries     — save a summary
// ─────────────────────────────────────────────────────────────────

const router            = require('express').Router();
const { z }             = require('zod');
const { authenticate }  = require('../middleware/authenticate');
const { reviewCard, xpForReview, xpForQuiz, checkMilestone } = require('../services/srsService');
const {
  getDueFlashcards,
  getDueCountBySubject,
  getFlashcardById,
  updateFlashcardSRS,
  createFlashcard,
  createFlashcardsBatch,
  deleteFlashcard,
  getFlashcardsBySubject,
  createQuizSession,
  getQuizHistory,
  createDocument,
  createSummary,
  getSubjectById,
  getSubjectStats,
  getStreak,
  upsertStreak,
  addXp,
  getTotalXp,
  getXpLevel,
  getReadinessScore,
} = require('../db/client');

// ─────────────────────────────────────────────────────────────────
// GET /api/learning/today
// Returns: due cards (max 50), streak, XP level, subject stats
// ─────────────────────────────────────────────────────────────────
router.get('/today', authenticate, (req, res) => {
  try {
    const userId      = req.user.id;
    const dueCards    = getDueFlashcards(userId, 50);
    const dueBySubj   = getDueCountBySubject(userId);
    const streak      = getStreak(userId) || { current_streak: 0, best_streak: 0, freeze_available: 1 };
    const totalXp     = getTotalXp(userId);
    const level       = getXpLevel(totalXp);

    // Estimate session time: ~30s per card
    const estMinutes  = Math.max(1, Math.round((dueCards.length * 0.5)));

    res.json({
      due_cards:    dueCards,
      due_by_subj:  dueBySubj,
      due_count:    dueCards.length,
      est_minutes:  estMinutes,
      streak,
      level,
    });
  } catch (e) {
    res.status(500).json({ error: 'Could not load today\'s session.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/learning/stats
// Full stats: XP, level, streak, per-subject readiness
// ─────────────────────────────────────────────────────────────────
router.get('/stats', authenticate, (req, res) => {
  try {
    const userId    = req.user.id;
    const totalXp   = getTotalXp(userId);
    const level     = getXpLevel(totalXp);
    const streak    = getStreak(userId) || { current_streak: 0, best_streak: 0, freeze_available: 1 };
    const subjects  = getSubjectStats(userId);

    res.json({ level, streak, subjects });
  } catch (e) {
    res.status(500).json({ error: 'Could not load stats.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/learning/cards/review
// Body: { card_id, quality }  quality: 0=fail, 1=hard, 2=good
// ─────────────────────────────────────────────────────────────────
const ReviewSchema = z.object({
  card_id: z.coerce.number().int().positive(),
  quality: z.coerce.number().int().min(0).max(2),
});

router.post('/cards/review', authenticate, (req, res) => {
  const parsed = ReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input.', details: parsed.error.flatten() });
  }

  try {
    const userId          = req.user.id;
    const { card_id, quality } = parsed.data;

    const card = getFlashcardById(card_id, userId);
    if (!card) return res.status(404).json({ error: 'Card not found.' });

    // Apply SM-2
    const updated = reviewCard(card, quality);
    updateFlashcardSRS(card_id, userId, updated.ease_factor, updated.interval_days, updated.repetitions, updated.due_date);

    // XP
    const xp = xpForReview(quality, card.repetitions);
    if (xp > 0) addXp(userId, xp, `card_review:${card_id}`);

    // Update streak
    const streak    = upsertStreak(userId);
    const totalXp   = getTotalXp(userId);
    const level     = getXpLevel(totalXp);
    const milestone = checkMilestone(streak.current_streak, totalXp);

    // Streak bonus XP on milestone
    if (milestone?.bonusXp) {
      addXp(userId, milestone.bonusXp, `streak_milestone:${streak.current_streak}`);
    }

    res.json({
      ok:        true,
      card_id,
      next_due:  updated.due_date,
      xp_earned: xp + (milestone?.bonusXp ?? 0),
      streak,
      level:     getXpLevel(getTotalXp(userId)),
      milestone: milestone || null,
    });
  } catch (e) {
    res.status(500).json({ error: 'Could not record review.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/learning/cards
// Create a single flashcard manually
// ─────────────────────────────────────────────────────────────────
const CardSchema = z.object({
  subject_id:  z.coerce.number().int().positive(),
  front:       z.string().min(1).max(1000).trim(),
  back:        z.string().min(1).max(2000).trim(),
  document_id: z.coerce.number().int().positive().optional(),
});

router.post('/cards', authenticate, (req, res) => {
  const parsed = CardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input.', details: parsed.error.flatten() });
  }

  try {
    const { subject_id, front, back, document_id } = parsed.data;
    const subject = getSubjectById(subject_id, req.user.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });

    const card = createFlashcard(req.user.id, subject_id, front, back, document_id);
    res.status(201).json({ card });
  } catch (e) {
    res.status(500).json({ error: 'Could not create card.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/learning/cards/batch
// Save AI-generated flashcards array to DB
// Body: { subject_id, cards: [{front, back}], document_id? }
// ─────────────────────────────────────────────────────────────────
const BatchSchema = z.object({
  subject_id:  z.coerce.number().int().positive(),
  document_id: z.coerce.number().int().positive().optional(),
  cards: z.array(z.object({
    front: z.string().min(1).max(1000).trim(),
    back:  z.string().min(1).max(2000).trim(),
  })).min(1).max(200),
});

router.post('/cards/batch', authenticate, (req, res) => {
  const parsed = BatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input.', details: parsed.error.flatten() });
  }

  try {
    const { subject_id, cards, document_id } = parsed.data;
    const subject = getSubjectById(subject_id, req.user.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });

    createFlashcardsBatch(req.user.id, subject_id, cards, document_id);

    // XP for importing cards
    addXp(req.user.id, 15, `batch_import:${cards.length}_cards`);

    const all = getFlashcardsBySubject(subject_id, req.user.id);
    res.status(201).json({ ok: true, saved: cards.length, all_cards: all });
  } catch (e) {
    res.status(500).json({ error: 'Could not save cards.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/learning/cards/:id
// ─────────────────────────────────────────────────────────────────
router.delete('/cards/:id', authenticate, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id.' });

  const card = getFlashcardById(id, req.user.id);
  if (!card) return res.status(404).json({ error: 'Card not found.' });

  deleteFlashcard(id, req.user.id);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────
// POST /api/learning/quiz/complete
// Record a completed quiz session
// Body: { subject_id, score, total, answers?: [{question, correct_answer, user_answer, is_correct}] }
// ─────────────────────────────────────────────────────────────────
const QuizCompleteSchema = z.object({
  subject_id: z.coerce.number().int().positive().optional(),
  score:      z.coerce.number().int().min(0),
  total:      z.coerce.number().int().min(1),
});

router.post('/quiz/complete', authenticate, (req, res) => {
  const parsed = QuizCompleteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input.', details: parsed.error.flatten() });
  }

  try {
    const userId                   = req.user.id;
    const { subject_id, score, total } = parsed.data;

    const xpEarned = xpForQuiz(score, total);
    createQuizSession(userId, subject_id, score, total, xpEarned);
    addXp(userId, xpEarned, `quiz:${score}/${total}`);

    const streak    = upsertStreak(userId);
    const totalXp   = getTotalXp(userId);
    const level     = getXpLevel(totalXp);
    const milestone = checkMilestone(streak.current_streak, totalXp);

    if (milestone?.bonusXp) {
      addXp(userId, milestone.bonusXp, `streak_milestone:${streak.current_streak}`);
    }

    res.json({
      ok:        true,
      xp_earned: xpEarned + (milestone?.bonusXp ?? 0),
      streak,
      level:     getXpLevel(getTotalXp(userId)),
      milestone: milestone || null,
    });
  } catch (e) {
    res.status(500).json({ error: 'Could not record quiz.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/learning/quiz/history
// ─────────────────────────────────────────────────────────────────
router.get('/quiz/history', authenticate, (req, res) => {
  try {
    res.json({ history: getQuizHistory(req.user.id) });
  } catch (e) {
    res.status(500).json({ error: 'Could not load quiz history.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/learning/documents
// Save a document (for persistence across sessions)
// ─────────────────────────────────────────────────────────────────
const DocSchema = z.object({
  subject_id: z.coerce.number().int().positive(),
  title:      z.string().min(1).max(300).trim(),
  content:    z.string().min(1).max(100000).trim(),
});

router.post('/documents', authenticate, (req, res) => {
  const parsed = DocSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input.', details: parsed.error.flatten() });
  }

  try {
    const { subject_id, title, content } = parsed.data;
    const subject = getSubjectById(subject_id, req.user.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });

    addXp(req.user.id, 15, `document_upload:${title}`);
    const doc = createDocument(req.user.id, subject_id, title, content);
    res.status(201).json({ document: doc });
  } catch (e) {
    res.status(500).json({ error: 'Could not save document.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/learning/summaries
// Save a generated summary
// ─────────────────────────────────────────────────────────────────
const SummarySchema = z.object({
  subject_id:  z.coerce.number().int().positive(),
  document_id: z.coerce.number().int().positive().optional(),
  title:       z.string().min(1).max(300).trim(),
  content:     z.string().min(1).max(100000).trim(),
});

router.post('/summaries', authenticate, (req, res) => {
  const parsed = SummarySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input.', details: parsed.error.flatten() });
  }

  try {
    const { subject_id, document_id, title, content } = parsed.data;
    const subject = getSubjectById(subject_id, req.user.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });

    const summary = createSummary(req.user.id, subject_id, title, content, document_id);
    res.status(201).json({ summary });
  } catch (e) {
    res.status(500).json({ error: 'Could not save summary.' });
  }
});

module.exports = router;
