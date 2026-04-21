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
// POST /api/ai/scenarios — generate 3 practice scenarios from summary
// ─────────────────────────────────────────────────────────────────
router.post('/scenarios',
  ...aiGuard('quiz'),
  async (req, res, next) => {
    try {
      const { subjectName, context, count = 3, domainCategory } = req.body;
      if (!context) return res.status(400).json({ error: 'context este obligatoriu.' });

      const typeMap = {
        social_sciences: 'vignete de caz real (psihologic, social sau organizațional)',
        law:             'spețe juridice cu situație de fapt și întrebare juridică precisă',
        medicine:        'cazuri clinice cu pacient, simptome și întrebare de diagnostic/management',
        cs:              'probleme de programare sau design de sistem cu cerință clară',
        exact_sciences:  'probleme aplicative cu date numerice și calcul sau analiză cerută',
        humanities:      'analize de text, contextualizări istorice sau interpretări teoretice',
        other:           'scenarii practice care cer aplicarea conceptelor',
      };
      const instrType = typeMap[domainCategory] || typeMap.other;

      const userContent = `Materie: ${(subjectName || '').substring(0, 60)}
Generează exact ${count} ${instrType} bazate STRICT pe conceptele din materialul de mai jos.

Format JSON obligatoriu — returnează EXCLUSIV acest JSON, fără text în afara lui:
{"scenarios":[{"situation":"descriere scenariu realist 3-4 propoziții","task":"întrebarea specifică la care studentul trebuie să răspundă în 5-10 rânduri","hint":"un concept cheie din material care ajută la răspuns"}]}

Material:
${context.substring(0, 3500)}`;

      let result;
      try {
        result = await askStructuredJson({
          system: 'Ești un profesor care creează scenarii de practică aplicată. Returnează EXCLUSIV JSON valid.',
          userContent,
          maxTokens: 1500,
        });
      } catch {
        return res.status(502).json({ error: 'Nu am putut genera scenariile. Încearcă din nou.' });
      }

      if (!Array.isArray(result?.scenarios) || !result.scenarios.length) {
        return res.status(502).json({ error: 'Format invalid de la AI.' });
      }

      logApiCall(req.user?.id ?? null, 'quiz', req.clientIpHash, 0, 0, 0, subjectName?.substring(0, 60));
      res.json({ scenarios: result.scenarios });
    } catch (e) { next(e); }
  }
);

// ─────────────────────────────────────────────────────────────────
// POST /api/ai/summary-integrate
// Haiku decides if a Q&A fits an existing scaffold section
// ─────────────────────────────────────────────────────────────────
router.post('/summary-integrate',
  ...aiGuard('quiz'),
  async (req, res, next) => {
    try {
      const { question, answer, sections, subjectName } = req.body;
      if (!question || !answer || !Array.isArray(sections)) {
        return res.status(400).json({ match: false });
      }

      const sectionsDesc = sections
        .slice(0, 8)
        .map(s => `- ${s.kind}: "${s.title || s.kind}"`)
        .join('\n');

      const userContent = `Materie: ${(subjectName || '').substring(0, 60)}

Secțiunile existente în scaffold:
${sectionsDesc}

Conversație:
Q: ${question.substring(0, 400)}
A: ${answer.substring(0, 800)}

Dacă răspunsul extinde sau clarifică una din secțiunile de mai sus, returnează:
{"match":true,"sectionKind":"...","sectionTitle":"...","addition":"text de adăugat, max 2 propoziții, în stilul scaffoldului cognitiv, în română"}

Dacă nu se potrivește cu nicio secțiune existentă, returnează:
{"match":false}

EXCLUSIV JSON valid.`;

      let result;
      try {
        result = await askStructuredJson({
          system: 'Ești un arhitect pedagogic. Analizezi dacă un Q&A se integrează într-un scaffold cognitiv. Returnează EXCLUSIV JSON valid.',
          userContent,
          maxTokens: 300,
        });
      } catch {
        return res.json({ match: false });
      }

      if (typeof result?.match !== 'boolean') return res.json({ match: false });
      logApiCall(req.user?.id ?? null, 'quiz', req.clientIpHash, 0, 0, 0, subjectName?.substring(0, 60));
      res.json(result.match ? result : { match: false });
    } catch (e) {
      next(e);
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// POST /api/ai/section-quiz
// Generates 2 quiz questions for a single summary section (Haiku)
// ─────────────────────────────────────────────────────────────────
router.post('/section-quiz',
  ...aiGuard('quiz'),
  async (req, res, next) => {
    try {
      const { sectionKind, sectionTitle, sectionContent, subjectName, domainCategory } = req.body;

      if (!sectionKind || !sectionContent) {
        return res.status(400).json({ error: 'sectionKind și sectionContent sunt obligatorii.' });
      }

      const domainHints = {
        exact_sciences: 'Pune întrebări de calcul, aplicare formule sau interpretare numerică.',
        social_sciences: 'Pune întrebări despre mecanisme, cauze, efecte, exemple concrete.',
        law: 'Pune întrebări despre condiții de aplicare, excepții, articole.',
        medicine: 'Pune întrebări despre diagnostic, mecanism fiziopatologic, protocol.',
        cs: 'Pune întrebări despre algoritmi, complexitate, pattern-uri.',
        humanities: 'Pune întrebări despre autori, teorii, contexte, interpretări.',
      };
      const hint = domainHints[domainCategory] || '';

      const userContent = `Materie: ${subjectName || 'necunoscută'}
Secțiune "${sectionTitle || sectionKind}" (tip: ${sectionKind})
${hint}

Conținut:
${JSON.stringify(sectionContent).substring(0, 2000)}

Generează EXACT 2 întrebări grilă. Returnează EXCLUSIV JSON valid:
{"questions":[{"q":"...","opts":["a","b","c","d"],"answer":0,"explain":"1 propoziție explicație"}]}`;

      let result;
      try {
        result = await askStructuredJson({
          system: 'Ești un profesor care generează întrebări de verificare. Returnează EXCLUSIV JSON valid fără text în afara lui.',
          userContent,
          maxTokens: 600,
        });
      } catch {
        logger.warn('Section quiz: AI returned invalid JSON', { userId: req.user?.id, sectionKind });
        return res.status(502).json({ error: 'Nu am putut genera întrebările. Încearcă din nou.' });
      }

      if (!Array.isArray(result?.questions) || result.questions.length === 0) {
        return res.status(502).json({ error: 'Format invalid de la AI.' });
      }

      logApiCall(req.user?.id ?? null, 'quiz', req.clientIpHash, 0, 0, 0, subjectName?.substring(0, 60));
      res.json({ questions: result.questions });
    } catch (e) {
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
