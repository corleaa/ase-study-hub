// ═════════════════════════════════════════════════════════════════
// js/app.js — Study Hub application entry point
//
// Compatibility notes vs old version:
//   • Imports from final auth.js (no getToken/setToken — those are gone)
//   • Works with api.js that uses in-memory access token + HttpOnly cookie
//   • initAuth() triggers auto-refresh via cookie on page load
//   • Theme preference stored in localStorage (non-sensitive, intentional)
// ═════════════════════════════════════════════════════════════════
'use strict';

import { initAuth, handleLogout, renderAuthScreen, showAuthScreen, hideAuthScreen } from './auth.js';
import { api }              from './api.js';
import { setText, showToast } from './render.js';
import { initQuiz }         from './quiz.js';
import { initMentor }       from './mentor.js';
import { initFlashcards }   from './flashcards.js';
import { initUpload }       from './upload.js';

// ─────────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', boot);

// Guard to prevent double-calling onAuthenticated (boot vs manual login)
let _sessionBootCompleted = false;

async function boot() {
  // Inject the auth screen DOM before anything else renders
  const authEl = renderAuthScreen();
  document.body.insertBefore(authEl, document.body.firstChild);

  // Apply saved theme immediately to avoid flash
  applyTheme(loadPref('sh_theme') || 'dark');

  // Try to resume the session using the HttpOnly refresh cookie.
  // On page load the in-memory access token is gone — api.me() will
  // trigger a 401, auto-refresh via cookie, then succeed.
  await initAuth(onAuthenticated, showAuthScreen);
}

// ─────────────────────────────────────────────────────────────────
// SESSION EVENTS
// ─────────────────────────────────────────────────────────────────
// Fired by api.js when the refresh cookie is also expired/invalid
window.addEventListener('sh:session-expired', () => {
  _sessionBootCompleted = false;
  showAuthScreen();
  showToast('Session expired', 'Please sign in again.', 'warning');
});

// Fired by auth.js after a successful login or register.
// If boot() already ran onAuthenticated (session restore via cookie),
// skip the second call — just hide the auth screen.
window.addEventListener('sh:authenticated', () => {
  if (_sessionBootCompleted) {
    // Session was already restored on page load; this event came from
    // a manual login after expiry — re-run onAuthenticated fully.
    _sessionBootCompleted = false;
  }
  api.me()
    .then(({ user }) => onAuthenticated(user))
    .catch(() => showAuthScreen());
});

// ─────────────────────────────────────────────────────────────────
// AUTHENTICATED STATE
// ─────────────────────────────────────────────────────────────────
function onAuthenticated(user) {
  _sessionBootCompleted = true;
  hideAuthScreen();

  // Show user email in sidebar footer (textContent — never innerHTML)
  const userLabel = document.getElementById('userLabel');
  if (userLabel) userLabel.textContent = user.email;

  // Initialise all feature modules (they register window.render* functions)
  initQuiz();
  initMentor();
  initFlashcards();
  initUpload();

  // Navigate to the last active tab, defaulting to dashboard
  navigateTo(loadPref('sh_tab') || 'dashboard');
}

// ─────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────
function navigateTo(tab) {
  savePref('sh_tab', tab);

  // Update active state on sidebar buttons
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });

  const pageEl  = document.getElementById('pageContent');
  const titleEl = document.getElementById('topbarTitle');
  if (!pageEl) return;

  const TITLES = {
    dashboard:  'Dashboard',
    quiz:       'Quiz Mode',
    flashcards: 'Flashcards',
    mentor:     'AI Mentor',
    calendar:   'Calendar',
    settings:   'Settings',
  };
  if (titleEl) titleEl.textContent = TITLES[tab] || 'Study Hub';

  switch (tab) {
    case 'dashboard':  renderDashboard(pageEl);    break;
    case 'quiz':       window.renderQuiz?.(pageEl);       break;
    case 'flashcards': window.renderFlashcards?.(pageEl); break;
    case 'mentor':     window.renderMentor?.(pageEl);     break;
    case 'calendar':   renderCalendar(pageEl);     break;
    case 'settings':   renderSettings(pageEl);    break;
    default:           renderDashboard(pageEl);
  }
}

// ─────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────
function renderDashboard(el) {
  // Static developer-written HTML — safe to use innerHTML directly.
  // No user data appears in this template.
  el.innerHTML = `
    <div class="anim">
      <div class="dash-hero">
        <div class="dash-hero-content">
          <h2>📚 Study Hub</h2>
          <p style="color:var(--text-secondary);margin-top:6px;">
            Your AI-powered exam preparation platform
          </p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-top:24px;">
        ${featureCard('🧠', 'Quiz Mode',    'AI-generated exam questions',    'quiz')}
        ${featureCard('🃏', 'Flashcards',   'Spaced repetition system',       'flashcards')}
        ${featureCard('🤖', 'AI Mentor',    'Personalised chat tutor',        'mentor')}
        ${featureCard('📄', 'Upload & Summarize', 'Extract slides from files', 'settings')}
      </div>

      <div style="margin-top:32px;padding:20px;background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);">
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:12px;">
          How to get started
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${step('1', 'Go to Settings and upload a course file (PDF, DOCX, or text)')}
          ${step('2', 'Use Quiz Mode to generate exam questions from that material')}
          ${step('3', 'Generate Flashcards and study with spaced repetition')}
          ${step('4', 'Chat with AI Mentor for explanations and study tips')}
        </div>
      </div>
    </div>`;
}

function featureCard(emoji, name, desc, tab) {
  // Values are all developer-authored constants — no user data
  return `
    <div class="stat-hero-card" onclick="app.navigateTo('${tab}')"
         style="cursor:pointer;text-align:center;padding:24px 16px;">
      <div style="font-size:2rem;margin-bottom:10px;">${emoji}</div>
      <div style="font-weight:700;font-size:.95rem;margin-bottom:4px;">${name}</div>
      <div style="font-size:.78rem;color:var(--text-secondary);">${desc}</div>
    </div>`;
}

function step(num, text) {
  return `
    <div style="display:flex;align-items:center;gap:12px;font-size:.88rem;">
      <div style="width:24px;height:24px;border-radius:50%;background:var(--accent-muted);
                  color:var(--accent);font-weight:700;font-size:.75rem;display:flex;
                  align-items:center;justify-content:center;flex-shrink:0;">${num}</div>
      <span style="color:var(--text-secondary);">${text}</span>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────
// CALENDAR (minimal placeholder — extend as needed)
// ─────────────────────────────────────────────────────────────────
function renderCalendar(el) {
  el.innerHTML = `
    <div class="anim">
      <div class="dash-hero">
        <h2>📅 Calendar</h2>
        <p style="color:var(--text-secondary);margin-top:6px;">Exam schedule coming soon.</p>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────
function renderSettings(el) {
  el.innerHTML = `
    <div class="anim">
      <h2 style="font-family:var(--font-display);font-size:1.4rem;font-weight:800;margin-bottom:20px;">
        ⚙️ Settings
      </h2>

      <div class="panel" style="margin-bottom:16px;">
        <div class="panel-head">📤 Upload course material</div>
        <div class="panel-body">
          <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:14px;">
            Upload a PDF, Word document, or text file. The server extracts the text,
            which you can then use for Quiz, Flashcard, and Summarization generation.
          </p>
          <div id="uploadSection"></div>
        </div>
      </div>

      <div class="panel" style="margin-bottom:16px;">
        <div class="panel-head">🎨 Theme</div>
        <div class="panel-body" style="display:flex;gap:10px;">
          <button class="quiz-nav-btn" onclick="app.toggleTheme()">
            Toggle Light / Dark
          </button>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">👤 Account</div>
        <div class="panel-body">
          <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:14px;">
            Signed in as <strong id="settingsEmail"></strong>
          </p>
          <button class="quiz-nav-btn" onclick="app.logout()"
                  style="color:var(--red);border-color:var(--red-muted);">
            Sign out
          </button>
        </div>
      </div>
    </div>`;

  // Set email via textContent — safe
  const emailEl = document.getElementById('settingsEmail');
  if (emailEl) {
    api.me()
      .then(({ user }) => { emailEl.textContent = user.email; })
      .catch(() => {});
  }

  // Mount the upload widget into its container
  const uploadSection = document.getElementById('uploadSection');
  if (uploadSection) {
    window.mountUpload?.(uploadSection, (text, filename) => {
      showToast('File ready', `Extracted from ${filename}. Paste into Quiz or Flashcard generator.`, 'success', 5000);
      // Store extracted text in sessionStorage so quiz/flashcard pages can read it
      try { sessionStorage.setItem('sh_last_upload', text); } catch { /* quota */ }
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme') || 'dark';
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  savePref('sh_theme', next);
}

// ─────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────
async function logout() {
  await handleLogout();
}

// ─────────────────────────────────────────────────────────────────
// localStorage — non-sensitive UI preferences only
// ─────────────────────────────────────────────────────────────────
function savePref(key, val) {
  try { localStorage.setItem(key, String(val)); } catch { /* storage full */ }
}
function loadPref(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────
// GLOBAL SURFACE for onclick handlers in static HTML
// Only developer-authored functions are exposed here — no user data
// ever enters these function signatures from HTML attributes.
// ─────────────────────────────────────────────────────────────────
window.app = { navigateTo, logout, toggleTheme };
