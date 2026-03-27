'use strict';
// ═════════════════════════════════════════════════════════════════
// middleware/validate.js — Request and AI response validation
//
// Fixes vs previous version:
//   + QuizQuestionSchema: field renamed 'q' → 'question' to match
//     what routes/ai.js actually returns. Previous mismatch meant
//     validateAiResponse('quiz') always failed silently.
//   + Added 'type' field to QuizQuestionSchema (mc / tf)
//   + TF questions: 'correct' is boolean, not number index
//   + FlashcardSchema: field names match what ai.js returns (front/back)
//   + chat schema: accepts messages[] directly (for /chat route)
// ═════════════════════════════════════════════════════════════════
'use strict';

const { z } = require('zod');

// ─────────────────────────────────────────────────────────────────
// 1. REQUEST BODY SCHEMAS (inbound validation)
// ─────────────────────────────────────────────────────────────────
const shortStr = (max = 200) => z.string().min(1).max(max).trim();
const longText = (max = 8000) => z.string().min(1).max(max).trim();

const REQUEST_SCHEMAS = {
  register: z.object({
    email:    z.string().email().max(254).toLowerCase().trim(),
    password: z.string().min(8).max(128),
  }),

  login: z.object({
    email:    z.string().email().max(254).toLowerCase().trim(),
    password: z.string().min(1).max(128),
  }),

  chat: z.object({
    // Format 1: mentor.js sends { message, subjectName, history }
    message:      shortStr(2000).optional(),
    subjectName:  shortStr(100).optional().default('General'),
    systemPrompt: shortStr(600).optional(),
    history: z.array(z.object({
      role:    z.enum(['user', 'assistant']),
      content: shortStr(4000),
    })).max(20).default([]),
    // Format 2: index.html callAI sends { system, messages, max_tokens }
    system:     z.string().max(8000).optional(),
    messages:   z.array(z.object({
      role:    z.enum(['user', 'assistant']),
      content: z.string().max(12000),
    })).max(40).optional(),
    max_tokens: z.coerce.number().int().min(100).max(8000).optional(),
  }).passthrough(),

  quiz: z.object({
    subjectName: shortStr(100),
    context:     longText(6000),
    count:       z.coerce.number().int().min(3).max(30).default(10),
    type:        z.enum(['mixed', 'grile', 'adevarat']).default('mixed'),
  }),

  flashcards: z.object({
    subjectName: shortStr(100),
    context:     longText(6000),
    count:       z.coerce.number().int().min(5).max(50).default(20),
  }),

  exam: z.object({
    subjectName: shortStr(100),
    context:     longText(7000),
    count:       z.coerce.number().int().min(10).max(40).default(20),
    minutes:     z.coerce.number().int().min(15).max(180).default(45),
  }),

  summarize: z.object({
    text:        longText(8000),
    subjectName: shortStr(100),
    title:       shortStr(200).optional(),
  }),
};

// ─────────────────────────────────────────────────────────────────
// 2. AI RESPONSE SCHEMAS (outbound validation)
//
// FIX: field name corrected from 'q' to 'question' — routes/ai.js
// instructs Claude to return {"question":"..."}, not {"q":"..."}.
// The previous mismatch caused validateAiResponse to always fail.
// ─────────────────────────────────────────────────────────────────
const safeStr  = (max) => z.string().max(max).default('');
const safeStr1 = (max) => z.string().min(1).max(max);

// Multiple-choice question
const McQuestionSchema = z.object({
  type:        z.literal('mc'),
  question:    safeStr1(500),
  options:     z.array(safeStr1(200)).min(2).max(4),
  correct:     z.number().int().min(0).max(3),
  explanation: safeStr(600),
});

// True/False question
const TfQuestionSchema = z.object({
  type:        z.literal('tf'),
  question:    safeStr1(500),
  correct:     z.boolean(),
  explanation: safeStr(600),
});

// Union — one schema handles both question types
const QuizQuestionSchema = z.discriminatedUnion('type', [
  McQuestionSchema,
  TfQuestionSchema,
]);

// Flashcard
const FlashcardSchema = z.object({
  front: safeStr1(300),
  back:  safeStr1(800),
});

const AI_RESPONSE_SCHEMAS = {
  quiz:       z.array(QuizQuestionSchema).min(1).max(40),
  flashcards: z.array(FlashcardSchema).min(1).max(100),
  exam:       z.array(QuizQuestionSchema).min(1).max(50),
};

// ─────────────────────────────────────────────────────────────────
// 3. REQUEST VALIDATION MIDDLEWARE
// ─────────────────────────────────────────────────────────────────
function validate(schemaName) {
  const schema = REQUEST_SCHEMAS[schemaName];
  if (!schema) throw new Error(`Unknown validation schema: ${schemaName}`);

  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      return res.status(400).json({ error: 'Invalid request.', details: issues });
    }
    req.body = result.data;   // Replace with sanitized + coerced version
    next();
  };
}

// ─────────────────────────────────────────────────────────────────
// 4. AI RESPONSE VALIDATION HELPER
// ─────────────────────────────────────────────────────────────────
function validateAiResponse(feature, data) {
  const schema = AI_RESPONSE_SCHEMAS[feature];
  if (!schema) {
    // Features without structured responses (chat, summarize) pass through
    return { valid: true, data };
  }

  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 3)
      .map(i => `[${i.path.join('.')}] ${i.message}`)
      .join('; ');
    return { valid: false, error: `AI response schema mismatch: ${issues}` };
  }

  return { valid: true, data: result.data };
}

module.exports = { validate, validateAiResponse };
