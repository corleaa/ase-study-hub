// ═════════════════════════════════════════════════════════════════
// js/api.js — Hardened API client
//
// Closes RM-4: JWT stored in memory only (not sessionStorage / localStorage).
// Access tokens are a JavaScript variable — they vanish on page reload.
// The refresh token lives in an HttpOnly cookie set by the server —
// JavaScript cannot read it at all, so XSS cannot steal it.
//
// Token lifecycle:
//   Login     → server sets refreshToken cookie (HttpOnly), returns accessToken
//   Requests  → accessToken sent in Authorization: Bearer header
//   Expiry    → POST /api/auth/refresh automatically gets a new accessToken
//               using the HttpOnly cookie (browser sends it automatically)
//   Logout    → server revokes both tokens, clears cookie
//   Reload    → accessToken is lost (in-memory) → auto-refresh on first request
// ═════════════════════════════════════════════════════════════════
'use strict';

const API_BASE = window.STUDYHUB_API_BASE || '/api';

// ─────────────────────────────────────────────────────────────────
// 1. IN-MEMORY TOKEN STORAGE
// ─────────────────────────────────────────────────────────────────
// Access token lives only in this module's closure.
// No sessionStorage. No localStorage. No cookies.
// XSS cannot reach it (it's not in any global object a script can enumerate).
// The trade-off: lost on page reload — handled by auto-refresh below.
let _accessToken = null;

export function setAccessToken(t) { _accessToken = t; }
export function getAccessToken()  { return _accessToken; }
export function clearAccessToken() { _accessToken = null; }

// ─────────────────────────────────────────────────────────────────
// 2. CORE FETCH WITH AUTOMATIC TOKEN REFRESH
// ─────────────────────────────────────────────────────────────────
let _refreshPromise = null;  // Deduplicate concurrent refresh calls

async function request(method, path, body = null, isFormData = false, isRetry = false) {
  const headers = {};

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const opts = {
    method,
    headers,
    credentials: 'include',  // ← Required so browser sends the HttpOnly refreshToken cookie
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  };

  const res = await fetch(`${API_BASE}${path}`, opts);

  // ── Auto-refresh on 401 ───────────────────────────────────────
  // If the access token expired, try refreshing once using the
  // HttpOnly cookie (browser sends it automatically via credentials:'include').
  if (res.status === 401 && !isRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // Retry the original request with the new access token
      return request(method, path, body, isFormData, true /* isRetry */);
    }
    // Refresh failed — session is truly expired
    clearAccessToken();
    window.dispatchEvent(new CustomEvent('sh:session-expired'));
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json().catch(() => ({ error: 'Invalid server response' }));

  if (!res.ok) {
    // Surface 429 rate-limit messages to help users understand limits
    if (res.status === 429) {
      throw Object.assign(new Error(data.error || 'Too many requests. Please wait.'), { status: 429 });
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────
// 3. TOKEN REFRESH
// ─────────────────────────────────────────────────────────────────
async function tryRefresh() {
  // Deduplicate: if a refresh is already in-flight, wait for it
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      // POST to /refresh — the browser automatically sends the refreshToken
      // HttpOnly cookie because of credentials: 'include'
      const res  = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data.accessToken) {
        _accessToken = data.accessToken;
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// ─────────────────────────────────────────────────────────────────
// 4. PUBLIC API METHODS
// ─────────────────────────────────────────────────────────────────
export const api = {
  // ── Auth ──────────────────────────────────────────────────────
  async register(email, password) {
    const data = await request('POST', '/auth/register', { email, password });
    if (data.accessToken) _accessToken = data.accessToken;
    return data;
  },

  async login(email, password) {
    const data = await request('POST', '/auth/login', { email, password });
    if (data.accessToken) _accessToken = data.accessToken;
    return data;
  },

  async logout() {
    try { await request('POST', '/auth/logout'); } catch { /* ignore network errors */ }
    clearAccessToken();
  },

  async me() {
    // On page reload, accessToken is null — tryRefresh() runs automatically
    // because the first request will get a 401 and trigger the refresh flow.
    return request('GET', '/auth/me');
  },

  // ── AI features ───────────────────────────────────────────────
  chat(message, subjectName, systemPrompt, history = []) {
    return request('POST', '/ai/chat', { message, subjectName, systemPrompt, history });
  },
  generateQuiz(subjectName, context, count = 10, type = 'mixed') {
    return request('POST', '/ai/quiz', { subjectName, context, count, type });
  },
  generateFlashcards(subjectName, context, count = 20) {
    return request('POST', '/ai/flashcards', { subjectName, context, count });
  },
  generateExam(subjectName, context, count = 20, minutes = 45) {
    return request('POST', '/ai/exam', { subjectName, context, count, minutes });
  },
  summarize(text, subjectName, title = '') {
    return request('POST', '/ai/summarize', { text, subjectName, title });
  },

  // ── File upload ────────────────────────────────────────────────
  uploadFile(file) {
    const form = new FormData();
    form.append('file', file);
    return request('POST', '/upload', form, true /* isFormData */);
  },
};
