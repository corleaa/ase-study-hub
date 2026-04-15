'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const AI_PROVIDER = (process.env.AI_PROVIDER || (process.env.GOOGLE_API_KEY ? 'google' : 'anthropic'))
  .trim()
  .toLowerCase();
const AI_FALLBACK_PROVIDER = (process.env.AI_FALLBACK_PROVIDER || 'anthropic')
  .trim()
  .toLowerCase();
const DEFAULT_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const DEFAULT_GOOGLE_MODEL = process.env.GOOGLE_MODEL || 'gemma-3-27b-it';
const DEFAULT_CHAT_SYSTEM = 'Ești un asistent de studiu util și concis. Răspunde în română.';
const GOOGLE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

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

function getActiveProvider() {
  if (AI_PROVIDER === 'google') {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is missing while AI_PROVIDER=google.');
    }
    return 'google';
  }

  if (!anthropicClient) {
    throw new Error('ANTHROPIC_API_KEY is missing while AI_PROVIDER=anthropic.');
  }

  return 'anthropic';
}

function getFallbackProvider() {
  if (AI_FALLBACK_PROVIDER === 'anthropic' && anthropicClient) return 'anthropic';
  if (AI_FALLBACK_PROVIDER === 'google' && process.env.GOOGLE_API_KEY) return 'google';
  return null;
}

function toGoogleRole(role) {
  return role === 'assistant' ? 'model' : 'user';
}

function toGoogleContents(messages = []) {
  return sanitizeMessages(messages).map((message) => ({
    role: toGoogleRole(message.role),
    parts: [{ text: message.content }],
  }));
}

async function googleGenerate({ system, messages, maxTokens = 1500, responseMimeType }) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const model = DEFAULT_GOOGLE_MODEL;

  const response = await fetch(
    `${GOOGLE_API_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: system ? {
          role: 'system',
          parts: [{ text: String(system) }],
        } : undefined,
        contents: toGoogleContents(messages),
        generationConfig: {
          maxOutputTokens: clampMaxTokens(maxTokens),
          temperature: 0.4,
          responseMimeType,
        },
      }),
    },
  );

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Google AI returned a non-JSON response (${response.status}).`);
  }

  if (!response.ok) {
    const apiMessage = payload?.error?.message || `Google AI request failed (${response.status}).`;
    throw new Error(apiMessage);
  }

  const finishReason = payload?.candidates?.[0]?.finishReason;
  if (finishReason && ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII'].includes(finishReason)) {
    throw new Error(`Google AI blocked the response (${finishReason}).`);
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Google AI returned an empty response.');
  }

  return text;
}

async function anthropicGenerate({ system, messages, maxTokens = 1500 }) {
  const response = await anthropicClient.messages.create({
    model: DEFAULT_ANTHROPIC_MODEL,
    max_tokens: clampMaxTokens(maxTokens),
    system,
    messages: sanitizeMessages(messages),
  });

  return response.content[0]?.text || '';
}

async function runWithFallback(primaryProvider, task) {
  try {
    return await task(primaryProvider);
  } catch (primaryError) {
    const fallbackProvider = getFallbackProvider();
    if (!fallbackProvider || fallbackProvider === primaryProvider) {
      throw primaryError;
    }

    return task(fallbackProvider);
  }
}

async function askMessages({ system, messages, maxTokens = 1500 }) {
  return runWithFallback(getActiveProvider(), async (provider) => {
    if (provider === 'google') {
      return googleGenerate({ system, messages, maxTokens });
    }

    return anthropicGenerate({ system, messages, maxTokens });
  });
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
  const raw = await runWithFallback(getActiveProvider(), async (provider) => {
    if (provider === 'google') {
      return googleGenerate({
        system,
        messages: [{ role: 'user', content: userContent }],
        maxTokens,
        responseMimeType: 'application/json',
      });
    }

    return anthropicGenerate({
      system,
      messages: [{ role: 'user', content: userContent }],
      maxTokens,
    });
  });
  return JSON.parse(stripJsonFences(raw));
}

module.exports = {
  AI_PROVIDER,
  AI_FALLBACK_PROVIDER,
  askMessages,
  askSingleTurn,
  askStructuredJson,
  clampMaxTokens,
  normalizeChatPayload,
  sanitizeMessages,
  stripJsonFences,
};
