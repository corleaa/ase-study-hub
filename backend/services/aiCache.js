'use strict';

const crypto = require('crypto');

const MAX_ENTRIES = Number(process.env.AI_CACHE_MAX_ENTRIES || 200);
const DEFAULT_TTLS_MS = {
  quiz: Number(process.env.AI_CACHE_TTL_QUIZ_MS || 10 * 60 * 1000),
  flashcards: Number(process.env.AI_CACHE_TTL_FLASHCARDS_MS || 10 * 60 * 1000),
  exam: Number(process.env.AI_CACHE_TTL_EXAM_MS || 10 * 60 * 1000),
  summarize: Number(process.env.AI_CACHE_TTL_SUMMARIZE_MS || 5 * 60 * 1000),
};

const cache = new Map();

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function makeCacheKey(feature, payload) {
  return crypto
    .createHash('sha256')
    .update(`${feature}:${stableStringify(payload)}`)
    .digest('hex');
}

function pruneExpired(now = Date.now()) {
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

function evictIfNeeded() {
  if (cache.size < MAX_ENTRIES) return;

  const oldestKey = cache.keys().next().value;
  if (oldestKey) cache.delete(oldestKey);
}

function getCached(feature, payload) {
  const now = Date.now();
  pruneExpired(now);

  const key = makeCacheKey(feature, payload);
  const entry = cache.get(key);
  if (!entry) return null;

  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function setCached(feature, payload, value) {
  const ttl = DEFAULT_TTLS_MS[feature];
  if (!ttl || ttl <= 0) return value;

  pruneExpired();
  evictIfNeeded();
  cache.set(makeCacheKey(feature, payload), {
    value,
    expiresAt: Date.now() + ttl,
  });
  return value;
}

module.exports = {
  getCached,
  setCached,
};
