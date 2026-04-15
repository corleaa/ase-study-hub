'use strict';
// ─────────────────────────────────────────────────────────────────
// routes/concepts.js — Adaptive Recall Engine
//
// POST /api/concepts/extract   — extract concepts from a document via AI
// GET  /api/concepts/session   — get today's review session
// POST /api/concepts/answer    — submit answer, get AI feedback + update SRS
// GET  /api/concepts/stats     — overview stats for dashboard
// ─────────────────────────────────────────────────────────────────

const router           = require('express').Router();
const { z }            = require('zod');
const { authenticate } = require('../middleware/authenticate');
const { askStructuredJson } = require('../services/aiService');
const {
  createConceptsBatch,
  getDueConcepts,
  getConceptStats,
  getQuestionsForConcept,
  getPrimaryQuestion,
  saveConceptAnswer,
  updateConceptProgress,
  addXp,
  upsertStreak,
  getTotalXp,
  getXpLevel,
  getStreak,
} = require('../db/client');

// ─────────────────────────────────────────────────────────────────
// POST /api/concepts/extract
// Extract concepts from document text + generate questions via AI
// Body: { content, subject_id?, document_id? }
// ─────────────────────────────────────────────────────────────────
const ExtractSchema = z.object({
  content:     z.string().min(50).max(80000).trim(),
  subject_id:  z.coerce.number().int().positive().optional(),
  document_id: z.coerce.number().int().positive().optional(),
});

router.post('/extract', authenticate, async (req, res) => {
  const parsed = ExtractSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input.', details: parsed.error.flatten() });
  }

  try {
    const { content, subject_id, document_id } = parsed.data;
    const userId = req.user.id;

    // Truncate to avoid huge AI calls
    const truncated = content.slice(0, 12000);

    // Step 1: extract concepts
    const conceptsRaw = await askStructuredJson({
      system: 'You are an expert at identifying key learning concepts from academic text. Always respond with valid JSON only.',
      userContent: `Extract 6-12 key concepts from this text. For each concept, return a JSON array with objects:
{ "title": "clear concept name (max 60 chars)", "importance": "high"|"medium"|"low" }

Rules:
- "high" = foundational concept, must-know
- "medium" = important supporting idea
- "low" = supplementary detail
- Titles should be specific noun phrases, not full sentences
- Extract concepts that can be tested with questions

Text:
${truncated}

Respond with ONLY the JSON array.`,
      maxTokens: 1500,
    });

    if (!Array.isArray(conceptsRaw) || conceptsRaw.length === 0) {
      return res.status(422).json({ error: 'AI could not extract concepts from this text.' });
    }

    // Validate and clean concepts
    const concepts = conceptsRaw
      .filter(c => c && typeof c.title === 'string' && c.title.trim())
      .slice(0, 15)
      .map(c => ({
        title: String(c.title).trim().slice(0, 80),
        importance: ['high', 'medium', 'low'].includes(c.importance) ? c.importance : 'medium',
      }));

    // Step 2: generate questions for each concept
    const conceptsWithQuestions = await Promise.all(
      concepts.map(async (concept) => {
        try {
          const questions = await askStructuredJson({
            system: 'You are an expert at creating educational test questions. Always respond with valid JSON only.',
            userContent: `For the concept "${concept.title}", generate exactly 3 questions. Return a JSON array:
[
  { "type": "free_recall",   "question_text": "a direct question asking the student to explain or define this concept" },
  { "type": "logic",        "question_text": "a reasoning question about cause-effect, comparison, or relationships" },
  { "type": "application",  "question_text": "a practical real-world scenario question" }
]

Rules:
- free_recall: starts with "Explain", "Define", "What is", "Describe"
- logic: starts with "Why", "How does", "What would happen if", "Compare"
- application: starts with "Give an example", "How would you apply", "In what situation"
- Each question must be answerable in 2-4 sentences
- Do NOT use multiple choice options
- Respond with ONLY the JSON array`,
            maxTokens: 600,
          });

          const validQ = Array.isArray(questions)
            ? questions.filter(q => q && q.type && q.question_text).slice(0, 3)
            : [];

          return { ...concept, questions: validQ };
        } catch {
          // If question generation fails for one concept, skip questions
          return { ...concept, questions: [] };
        }
      })
    );

    // Step 3: store in DB
    const ids = createConceptsBatch(userId, subject_id, document_id, conceptsWithQuestions);

    // XP for extraction
    addXp(userId, 20, `concepts_extracted:${concepts.length}`);

    const stats = getConceptStats(userId);

    res.status(201).json({
      ok: true,
      extracted: concepts.length,
      concepts: conceptsWithQuestions.map((c, i) => ({ ...c, id: ids[i] })),
      stats,
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(422).json({ error: 'AI returned unexpected format. Try again.' });
    }
    res.status(500).json({ error: 'Could not extract concepts.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/concepts/session
// Returns due concepts with their primary question for today's session
// ─────────────────────────────────────────────────────────────────
router.get('/session', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const stats  = getConceptStats(userId);

    if (stats.total === 0) {
      return res.json({ session: [], stats, hasContent: false });
    }

    const due = getDueConcepts(userId, 20);

    // Attach primary question to each concept
    // Interleave: rotate by importance to avoid seeing same concept type in a row
    const session = due.map(concept => {
      const q = getPrimaryQuestion(concept.id);
      return {
        id:              concept.id,
        title:           concept.title,
        importance:      concept.importance,
        difficulty_level: concept.difficulty_level || 'medium',
        success_rate:    concept.success_rate || 0,
        total_attempts:  concept.total_attempts || 0,
        question: q ? {
          id:            q.id,
          type:          q.type,
          question_text: q.question_text,
        } : null,
      };
    }).filter(c => c.question !== null);  // skip concepts with no questions yet

    const streak = getStreak(userId) || { current_streak: 0 };

    res.json({
      session,
      stats,
      streak: streak.current_streak,
      hasContent: true,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not load session.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/concepts/answer
// Submit answer → AI evaluates → update SRS + XP
// Body: { concept_id, question_id, answer_text, confidence? }
// ─────────────────────────────────────────────────────────────────
const AnswerSchema = z.object({
  concept_id:  z.coerce.number().int().positive(),
  question_id: z.coerce.number().int().positive(),
  answer_text: z.string().min(1).max(5000).trim(),
  confidence:  z.coerce.number().int().min(1).max(5).optional(),
});

router.post('/answer', authenticate, async (req, res) => {
  const parsed = AnswerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input.', details: parsed.error.flatten() });
  }

  try {
    const { concept_id, question_id, answer_text, confidence } = parsed.data;
    const userId = req.user.id;

    // Get the question for context
    const questions = getQuestionsForConcept(concept_id);
    const question  = questions.find(q => q.id === question_id);
    if (!question) return res.status(404).json({ error: 'Question not found.' });

    // Get concept title for context
    const { getDb } = require('../db/client');
    const concept = getDb()
      .prepare('SELECT title FROM concepts WHERE id = ? AND user_id = ?')
      .get(concept_id, userId);
    if (!concept) return res.status(404).json({ error: 'Concept not found.' });

    // AI evaluation
    let evalResult;
    try {
      evalResult = await askStructuredJson({
        system: 'You are an educational assessment expert. Evaluate student answers fairly and constructively. Always respond with valid JSON only.',
        userContent: `Concept: "${concept.title}"
Question: "${question.question_text}"
Student answer: "${answer_text.slice(0, 2000)}"

Evaluate and return JSON:
{
  "score": <integer 0-100>,
  "feedback": "<1-2 sentence feedback on what was right/wrong>",
  "correct_explanation": "<2-3 sentence explanation of the complete correct answer>"
}

Scoring guide:
- 80-100: answer is correct, clear, complete
- 60-79: mostly correct, missing some nuance
- 40-59: partial understanding, key elements missing
- 0-39: incorrect or very incomplete

Be constructive. Respond with ONLY the JSON object.`,
        maxTokens: 500,
      });
    } catch {
      // Fallback if AI fails
      evalResult = {
        score: 50,
        feedback: 'Could not evaluate automatically. Review your answer.',
        correct_explanation: '',
      };
    }

    const score      = Math.min(100, Math.max(0, Number(evalResult.score) || 0));
    const isCorrect  = score >= 60;
    const feedback   = String(evalResult.feedback || '').slice(0, 500);
    const explanation = String(evalResult.correct_explanation || '').slice(0, 800);

    // Save answer
    saveConceptAnswer(userId, concept_id, question_id, {
      answerText: answer_text,
      score,
      confidence: confidence || null,
      aiFeedback: feedback,
      aiExplanation: explanation,
    });

    // Update SRS progress
    updateConceptProgress(userId, concept_id, score);

    // XP: 5 for attempt, +5 if correct, +3 if high confidence + correct
    let xp = 5;
    if (isCorrect) xp += 5;
    if (isCorrect && confidence && confidence >= 4) xp += 3;
    addXp(userId, xp, `concept_answer:${concept_id}:${score}`);

    // Update streak
    const streak  = upsertStreak(userId);
    const totalXp = getTotalXp(userId);
    const level   = getXpLevel(totalXp);

    res.json({
      ok:          true,
      score,
      is_correct:  isCorrect,
      feedback,
      correct_explanation: explanation,
      xp_earned:   xp,
      streak:      streak.current_streak,
      level,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not process answer.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/concepts/stats
// Dashboard stats: total concepts, due today, weak, streak
// ─────────────────────────────────────────────────────────────────
router.get('/stats', authenticate, (req, res) => {
  try {
    const userId  = req.user.id;
    const stats   = getConceptStats(userId);
    const streak  = getStreak(userId) || { current_streak: 0, best_streak: 0 };
    const totalXp = getTotalXp(userId);
    const level   = getXpLevel(totalXp);

    res.json({ ...stats, streak: streak.current_streak, level });
  } catch (err) {
    res.status(500).json({ error: 'Could not load stats.' });
  }
});

module.exports = router;
