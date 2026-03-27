'use strict';
// ═════════════════════════════════════════════════════════════════
// routes/ai.js — AI proxy routes
//
// Security improvements vs previous version:
//   + validate() middleware on EVERY route (blocks malformed input)
//   + aiIpLimiter + perUserLimiter on EVERY route (rate limiting now live)
//   + validateAiResponse() on every structured response (quiz/flashcards/exam)
//   + logApiCall() after each successful call (feeds perUserLimiter)
//   + Consistent field names: AI returns 'question' not 'q'
//     (validate.js QuizQuestionSchema updated to match)
//   + messages array sanitized before passing to Anthropic
//   + max_tokens capped at reasonable per-feature values
// ═════════════════════════════════════════════════════════════════
'use strict';

const router       = require('express').Router();
const Anthropic    = require('@anthropic-ai/sdk');
const authenticate = require('../middleware/authenticate');
const { validate, validateAiResponse } = require('../middleware/validate');
const { aiIpLimiter, perUserLimiter }  = require('../middleware/rateLimiter');
const { logApiCall } = require('../db/client');
const { logger }     = require('../utils/logger');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Shared middleware stack for all AI routes ─────────────────────
// Order: IP limit → auth → per-user limit
const aiGuard = (feature) => [
  aiIpLimiter,
  authenticate,
  perUserLimiter(feature),
];

// ── Core Claude call ──────────────────────────────────────────────
async function askClaude(system, userContent, maxTokens = 2000) {
  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: Math.min(maxTokens, 8000),
    system,
    messages:   [{ role: 'user', content: userContent }],
  });
  return response.content[0]?.text || '';
}

// ── Strip markdown code fences from JSON responses ────────────────
function stripJsonFences(raw) {
  return raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
}

// ─────────────────────────────────────────────────────────────────
// POST /api/ai/chat
// ─────────────────────────────────────────────────────────────────
router.post('/chat',
  ...aiGuard('chat'),
  validate('chat'),
  async (req, res, next) => {
    try {
      const { system, messages, max_tokens } = (() => {
        const b = req.body;

        // Format 2: index.html callAI sends { system, messages[], max_tokens }
        if (b.messages && Array.isArray(b.messages)) {
          const sysPrompt = b.system || 'Ești un asistent de studiu util și concis. Răspunde în română.';
          const msgs = b.messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role, content: String(m.content || '').slice(0, 8000) }));
          return { system: sysPrompt, messages: msgs, max_tokens: b.max_tokens || 1500 };
        }

        // Format 1: mentor.js sends { message, subjectName, history }
        const sysPrompt = b.systemPrompt
          || `Ești un asistent de studiu util și concis pentru materia ${b.subjectName}. Răspunde în română.`;
        const history = (b.history || []).map(m => ({
          role:    m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content || '').slice(0, 4000),
        }));
        const allMessages = [
          ...history,
          { role: 'user', content: b.message || '' },
        ];
        return { system: sysPrompt, messages: allMessages, max_tokens: b.max_tokens || 1500 };
      })();

      const response = await client.messages.create({
        model:      'claude-sonnet-4-20250514',
        max_tokens: Math.min(max_tokens, 3000),
        system,
        messages,
      });

      const content = response.content[0]?.text || '';
      logApiCall(req.user.id, 'chat');

      // Return both keys for frontend compatibility
      res.json({ content, response: content });
    } catch (e) {
      console.error('AI CHAT ERROR FULL:', e);
      next(e);
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// POST /api/ai/quiz
// ─────────────────────────────────────────────────────────────────
router.post('/quiz',
  ...aiGuard('quiz'),
  validate('quiz'),
  async (req, res, next) => {
    try {
      const { subjectName, context, count, type } = req.body;

      const typeMap = {
        grile:    'multiple choice cu 4 variante (a, b, c, d), un singur răspuns corect',
        adevarat: 'adevărat/fals',
        mixed:    'mix de multiple choice și adevărat/fals',
      };
      const typeDesc = typeMap[type] || typeMap.mixed;

      const system = `Ești profesor de ${subjectName}. Generezi întrebări de examen de tip ${typeDesc}.
Răspunde EXCLUSIV cu un JSON array valid. Niciun text în afara JSON-ului. Fără markdown, fără backticks.
Format pentru multiple choice:
{"type":"mc","question":"...","options":["a) ...","b) ...","c) ...","d) ..."],"correct":0,"explanation":"..."}
Format pentru adevărat/fals:
{"type":"tf","question":"...","correct":true,"explanation":"..."}`;

      const userMsg = `Context:\n${context}\n\nGenerează exact ${count} întrebări despre ${subjectName}.`;
      const raw     = await askClaude(system, userMsg, 4000);
      const clean   = stripJsonFences(raw);

      let questions;
      try {
        questions = JSON.parse(clean);
        if (!Array.isArray(questions)) throw new Error('Not an array');
      } catch {
        logger.warn('Quiz: AI returned invalid JSON', { userId: req.user.id, subjectName });
        return res.status(500).json({ error: 'AI a returnat format invalid. Încearcă din nou.' });
      }

      // Validate AI response structure
      const validation = validateAiResponse('quiz', questions);
      if (!validation.valid) {
        logger.warn('Quiz: AI response failed schema validation', {
          userId: req.user.id,
          error:  validation.error,
        });
        return res.status(502).json({ error: 'AI a returnat date neașteptate. Încearcă din nou.' });
      }

      logApiCall(req.user.id, 'quiz');
      res.json({ questions: validation.data });
    } catch (e) {
      next(e);
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// POST /api/ai/flashcards
// ─────────────────────────────────────────────────────────────────
router.post('/flashcards',
  ...aiGuard('flashcards'),
  validate('flashcards'),
  async (req, res, next) => {
    try {
      const { subjectName, context, count } = req.body;

      const system = `Ești profesor de ${subjectName}. Generezi flashcard-uri pentru memorare.
Răspunde EXCLUSIV cu un JSON array valid. Niciun text în afara JSON-ului. Fără markdown, fără backticks.
Format: [{"front":"Întrebare sau termen","back":"Răspuns sau definiție"}]`;

      const userMsg = `Context:\n${context}\n\nGenerează exact ${count} flashcard-uri despre ${subjectName}.`;
      const raw     = await askClaude(system, userMsg, 3000);
      const clean   = stripJsonFences(raw);

      let flashcards;
      try {
        flashcards = JSON.parse(clean);
        if (!Array.isArray(flashcards)) throw new Error('Not an array');
      } catch {
        logger.warn('Flashcards: AI returned invalid JSON', { userId: req.user.id });
        return res.status(500).json({ error: 'AI a returnat format invalid. Încearcă din nou.' });
      }

      const validation = validateAiResponse('flashcards', flashcards);
      if (!validation.valid) {
        logger.warn('Flashcards: AI response failed schema validation', {
          userId: req.user.id,
          error:  validation.error,
        });
        return res.status(502).json({ error: 'AI a returnat date neașteptate. Încearcă din nou.' });
      }

      logApiCall(req.user.id, 'flashcards');
      res.json({ flashcards: validation.data });
    } catch (e) {
      next(e);
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// POST /api/ai/exam
// ─────────────────────────────────────────────────────────────────
router.post('/exam',
  ...aiGuard('exam'),
  validate('exam'),
  async (req, res, next) => {
    try {
      const { subjectName, context, count, minutes } = req.body;

      const system = `Ești profesor de ${subjectName}. Generezi un subiect de examen complet.
Răspunde EXCLUSIV cu un JSON array valid. Niciun text în afara JSON-ului. Fără markdown, fără backticks.
Format: [{"type":"mc","question":"...","options":["a) ...","b) ...","c) ...","d) ..."],"correct":0,"explanation":"..."}]`;

      const userMsg = `Context:\n${context}\n\nGenerează un examen de ${minutes} minute cu ${count} întrebări despre ${subjectName}.`;
      const raw     = await askClaude(system, userMsg, 5000);
      const clean   = stripJsonFences(raw);

      let questions;
      try {
        questions = JSON.parse(clean);
        if (!Array.isArray(questions)) throw new Error('Not an array');
      } catch {
        logger.warn('Exam: AI returned invalid JSON', { userId: req.user.id });
        return res.status(500).json({ error: 'AI a returnat format invalid. Încearcă din nou.' });
      }

      const validation = validateAiResponse('exam', questions);
      if (!validation.valid) {
        logger.warn('Exam: AI response failed schema validation', {
          userId: req.user.id,
          error:  validation.error,
        });
        return res.status(502).json({ error: 'AI a returnat date neașteptate. Încearcă din nou.' });
      }

      logApiCall(req.user.id, 'exam');
      res.json({ questions: validation.data, minutes });
    } catch (e) {
      next(e);
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// POST /api/ai/summarize
// ─────────────────────────────────────────────────────────────────
router.post('/summarize',
  ...aiGuard('summarize'),
  validate('summarize'),
  async (req, res, next) => {
    try {
      const { text, subjectName, title } = req.body;

      const system = `Ești profesor de ${subjectName}. Rezumi și structurezi material de studiu în română.
Creează un rezumat clar, structurat, cu titluri și bullet points. Folosește format Markdown.`;

      const userMsg = `${title ? `Titlu: ${title}\n\n` : ''}Text de rezumat:\n${text}`;
      const summary = await askClaude(system, userMsg, 2000);

      logApiCall(req.user.id, 'summarize');
      res.json({ summary });
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
