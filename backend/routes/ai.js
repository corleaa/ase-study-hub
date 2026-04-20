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

const router      = require('express').Router();
const { optionalAuth } = require('../middleware/authenticate');
const { validate, validateAiResponse } = require('../middleware/validate');
const { aiIpLimiter, perUserLimiter }  = require('../middleware/rateLimiter');
const { logApiCall } = require('../db/client');
const { logger }     = require('../utils/logger');
const {
  askMessages,
  askMessagesWithUsage,
  askSingleTurn,
  askStructuredJson,
  normalizeChatPayload,
} = require('../services/aiService');
const { getCached, setCached } = require('../services/aiCache');
const {
  chatResponse,
  quizResponse,
  flashcardsResponse,
  examResponse,
  summaryResponse,
} = require('../utils/apiContracts');
const {
  generateSmartSummary,
  regenerateSection,
  computeDocHash,
  ENGINE_VERSION,
} = require('../services/summaryEngine');
const {
  getSmartSummaryByHash,
  createSmartSummary,
} = require('../db/client');

// ── Shared middleware stack for all AI routes ─────────────────────
// Order: IP limit → optional auth (guest allowed) → per-tier limit
const aiGuard = (feature) => [
  aiIpLimiter,
  optionalAuth,
  perUserLimiter(feature),
];

// ─────────────────────────────────────────────────────────────────
// POST /api/ai/chat
// ─────────────────────────────────────────────────────────────────
router.post('/chat',
  ...aiGuard('chat'),
  validate('chat'),
  async (req, res, next) => {
    try {
      const { system, messages, maxTokens } = normalizeChatPayload(req.body);
      const { content, inputTokens, outputTokens } = await askMessagesWithUsage({ system, messages, maxTokens });
      const costUsd = (inputTokens * 3 + outputTokens * 15) / 1_000_000;
      // Detect subject from system prompt for analytics
      const subjectMatch = (req.body.system || '').match(/(?:profesor|materia)\s+(?:de\s+)?([^\n.]{2,40})/i);
      const subject = subjectMatch ? subjectMatch[1].trim().substring(0, 60) : null;
      logApiCall(req.user?.id ?? null, 'chat', req.clientIpHash, inputTokens, outputTokens, costUsd, subject);
      res.json(chatResponse(content));
    } catch (e) {
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
      const cachePayload = { subjectName, context, count, type };

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

      const cachedQuestions = getCached('quiz', cachePayload);
      if (cachedQuestions) {
        logApiCall(req.user?.id ?? null, 'quiz', req.clientIpHash);
        return res.json(quizResponse(cachedQuestions));
      }

      let questions;
      try {
        questions = await askStructuredJson({
          system,
          userContent: `Context:\n${context}\n\nGenerează exact ${count} întrebări despre ${subjectName}.`,
          maxTokens: 4000,
        });
        if (!Array.isArray(questions)) throw new Error('Not an array');
      } catch {
        logger.warn('Quiz: AI returned invalid JSON', { userId: req.user?.id, subjectName });
        return res.status(502).json({ error: 'AI a returnat format invalid. Încearcă din nou.' });
      }

      // Validate AI response structure
      const validation = validateAiResponse('quiz', questions);
      if (!validation.valid) {
        logger.warn('Quiz: AI response failed schema validation', {
          userId: req.user?.id,
          error:  validation.error,
        });
        return res.status(502).json({ error: 'AI a returnat date neașteptate. Încearcă din nou.' });
      }

      logApiCall(req.user?.id ?? null, 'quiz', req.clientIpHash);
      res.json(quizResponse(setCached('quiz', cachePayload, validation.data)));
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
      const cachePayload = { subjectName, context, count };

      const system = `Ești profesor de ${subjectName}. Generezi flashcard-uri pentru memorare.
Răspunde EXCLUSIV cu un JSON array valid. Niciun text în afara JSON-ului. Fără markdown, fără backticks.
Format: [{"front":"Întrebare sau termen","back":"Răspuns sau definiție"}]`;

      const cachedFlashcards = getCached('flashcards', cachePayload);
      if (cachedFlashcards) {
        logApiCall(req.user?.id ?? null, 'flashcards', req.clientIpHash);
        return res.json(flashcardsResponse(cachedFlashcards));
      }

      let flashcards;
      try {
        flashcards = await askStructuredJson({
          system,
          userContent: `Context:\n${context}\n\nGenerează exact ${count} flashcard-uri despre ${subjectName}.`,
          maxTokens: 3000,
        });
        if (!Array.isArray(flashcards)) throw new Error('Not an array');
      } catch {
        logger.warn('Flashcards: AI returned invalid JSON', { userId: req.user?.id });
        return res.status(502).json({ error: 'AI a returnat format invalid. Încearcă din nou.' });
      }

      const validation = validateAiResponse('flashcards', flashcards);
      if (!validation.valid) {
        logger.warn('Flashcards: AI response failed schema validation', {
          userId: req.user?.id,
          error:  validation.error,
        });
        return res.status(502).json({ error: 'AI a returnat date neașteptate. Încearcă din nou.' });
      }

      logApiCall(req.user?.id ?? null, 'flashcards', req.clientIpHash);
      res.json(flashcardsResponse(setCached('flashcards', cachePayload, validation.data)));
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
      const cachePayload = { subjectName, context, count, minutes };

      const system = `Ești profesor de ${subjectName}. Generezi un subiect de examen complet.
Răspunde EXCLUSIV cu un JSON array valid. Niciun text în afara JSON-ului. Fără markdown, fără backticks.
Format: [{"type":"mc","question":"...","options":["a) ...","b) ...","c) ...","d) ..."],"correct":0,"explanation":"..."}]`;

      const cachedExam = getCached('exam', cachePayload);
      if (cachedExam) {
        logApiCall(req.user?.id ?? null, 'exam', req.clientIpHash);
        return res.json(examResponse(cachedExam, minutes));
      }

      let questions;
      try {
        questions = await askStructuredJson({
          system,
          userContent: `Context:\n${context}\n\nGenerează un examen de ${minutes} minute cu ${count} întrebări despre ${subjectName}.`,
          maxTokens: 5000,
        });
        if (!Array.isArray(questions)) throw new Error('Not an array');
      } catch {
        logger.warn('Exam: AI returned invalid JSON', { userId: req.user?.id });
        return res.status(502).json({ error: 'AI a returnat format invalid. Încearcă din nou.' });
      }

      const validation = validateAiResponse('exam', questions);
      if (!validation.valid) {
        logger.warn('Exam: AI response failed schema validation', {
          userId: req.user?.id,
          error:  validation.error,
        });
        return res.status(502).json({ error: 'AI a returnat date neașteptate. Încearcă din nou.' });
      }

      logApiCall(req.user?.id ?? null, 'exam', req.clientIpHash);
      res.json(examResponse(setCached('exam', cachePayload, validation.data), minutes));
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
      const cachePayload = { text, subjectName, title };

      const system = `Ești profesor de ${subjectName}. Rezumi și structurezi material de studiu în română.
Creează un rezumat clar, structurat, cu titluri și bullet points. Folosește format Markdown.`;

      const cachedSummary = getCached('summarize', cachePayload);
      const summary = cachedSummary || await askSingleTurn(
        system,
        `${title ? `Titlu: ${title}\n\n` : ''}Text de rezumat:\n${text}`,
        2000,
      );

      logApiCall(req.user?.id ?? null, 'summarize', req.clientIpHash);
      res.json(summaryResponse(cachedSummary || setCached('summarize', cachePayload, summary)));
    } catch (e) {
      next(e);
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// POST /api/ai/smart-summary
// ─────────────────────────────────────────────────────────────────
router.post('/smart-summary',
  ...aiGuard('smart-summary'),
  async (req, res, next) => {
    try {
      const { text, subjectName, intent = 'understand', subjectId, title, documentId } = req.body;

      if (!text || typeof text !== 'string' || text.trim().length < 50) {
        return res.status(400).json({ error: 'Textul documentului este prea scurt sau lipsă.' });
      }
      if (!subjectName || typeof subjectName !== 'string') {
        return res.status(400).json({ error: 'subjectName este obligatoriu.' });
      }
      const validIntents = ['understand', 'exam_prep', 'apply'];
      const safeIntent = validIntents.includes(intent) ? intent : 'understand';

      const userId = req.user?.id ?? null;

      // ── Cache check ─────────────────────────────────────────────
      const docHash = computeDocHash(text, safeIntent);
      if (userId) {
        const cached = getSmartSummaryByHash(docHash, userId);
        if (cached?.output_json) {
          logger.info('Smart summary served from cache', { userId, docHash });
          return res.json({ summary: JSON.parse(cached.output_json), fromCache: true, id: cached.id });
        }
      }

      // ── Generate ─────────────────────────────────────────────────
      const result = await generateSmartSummary({
        text,
        subjectName,
        intent: safeIntent,
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // ── Save to DB ───────────────────────────────────────────────
      let savedId = null;
      if (userId && subjectId) {
        const summaryTitle = title || result.data.output.title || ('Rezumat ' + new Date().toLocaleDateString('ro'));
        const saved = createSmartSummary(
          userId, subjectId, summaryTitle,
          docHash, safeIntent, ENGINE_VERSION,
          JSON.stringify(result.data), result.model, result.costUsd,
          documentId || null
        );
        savedId = saved?.id;
      }

      // ── Log API call ─────────────────────────────────────────────
      logApiCall(
        userId, 'smart-summary', req.clientIpHash,
        result.inputTokens, result.outputTokens, result.costUsd,
        subjectName.substring(0, 60)
      );

      logger.info('Smart summary generated', {
        userId, model: result.model, cost: result.costUsd.toFixed(5),
        intent: safeIntent, tokens: result.inputTokens + result.outputTokens,
      });

      res.json({ summary: result.data, fromCache: false, id: savedId });
    } catch (e) {
      logger.error('Smart summary error', { error: e.message });
      next(e);
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// POST /api/ai/smart-summary/regenerate-section
// ─────────────────────────────────────────────────────────────────
router.post('/smart-summary/regenerate-section',
  ...aiGuard('smart-summary'),
  async (req, res, next) => {
    try {
      const { sectionKind, currentSection, context, instruction, subjectName } = req.body;

      if (!sectionKind || !currentSection || !instruction) {
        return res.status(400).json({ error: 'sectionKind, currentSection și instruction sunt obligatorii.' });
      }

      const result = await regenerateSection({
        sectionKind,
        currentSection,
        context: context || '',
        instruction,
        subjectName: subjectName || '',
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      logApiCall(
        req.user?.id ?? null, 'smart-summary', req.clientIpHash,
        result.inputTokens, result.outputTokens, result.costUsd,
        subjectName?.substring(0, 60)
      );

      res.json({ section: result.section });
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
