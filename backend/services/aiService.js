'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const DEFAULT_CHAT_SYSTEM = 'Ești un asistent de studiu util și concis. Răspunde în română.';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function clampMaxTokens(value, fallback = 1500, hardMax = 8000) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.min(Math.trunc(numeric), hardMax);
}

function sanitizeMessages(messages = [], maxChars = 8000) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => message && (message.role === 'user' || message.role === 'assistant'))
    .map((message) => ({
      role: message.role,
      content: String(message.content || '').slice(0, maxChars),
    }));
}

function normalizeChatPayload(body) {
  if (Array.isArray(body.messages)) {
    return {
      system: body.system || DEFAULT_CHAT_SYSTEM,
      messages: sanitizeMessages(body.messages, 8000),
      maxTokens: clampMaxTokens(body.max_tokens, 1500, 3000),
    };
  }

  const system = body.systemPrompt
    || `Ești un asistent de studiu util și concis pentru materia ${body.subjectName}. Răspunde în română.`;

  const history = sanitizeMessages(body.history || [], 4000);
  return {
    system,
    messages: [
      ...history,
      { role: 'user', content: String(body.message || '').slice(0, 4000) },
    ],
    maxTokens: clampMaxTokens(body.max_tokens, 1500, 3000),
  };
}

async function askMessages({ system, messages, maxTokens = 1500 }) {
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: clampMaxTokens(maxTokens),
    system,
    messages: sanitizeMessages(messages),
  });

  return response.content[0]?.text || '';
}

async function askSingleTurn(system, userContent, maxTokens = 2000) {
  return askMessages({
    system,
    messages: [{ role: 'user', content: userContent }],
    maxTokens,
  });
}

function stripJsonFences(raw) {
  return String(raw || '')
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```$/m, '')
    .trim();
}

async function askStructuredJson({ system, userContent, maxTokens = 3000 }) {
  const raw = await askSingleTurn(system, userContent, maxTokens);
  return JSON.parse(stripJsonFences(raw));
}

module.exports = {
  askMessages,
  askSingleTurn,
  askStructuredJson,
  clampMaxTokens,
  normalizeChatPayload,
  sanitizeMessages,
  stripJsonFences,
};
