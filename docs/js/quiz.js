// ─────────────────────────────────────────────────────────────────
// js/quiz.js — Quiz Mode
//
// Changed from original:
//   REMOVED: fetch('https://api.anthropic.com/v1/messages', ...)
//   REMOVED: x-api-key in headers
//   REMOVED: state.apiKey checks
//   ADDED:   api.generateQuiz() → POST /api/ai/quiz
//   ADDED:   escapeText() for safe question/option rendering
//   KEPT:    all quiz UI logic (renderActiveQuiz, scoring, history)
// ─────────────────────────────────────────────────────────────────
'use strict';

import { api }              from './api.js';
import { showToast }        from './render.js';

// ── Local state ───────────────────────────────────────────────────
let quizConfig  = { subject: '', count: 10, type: 'mixed' };
let activeQuiz  = null;   // { questions, currentIndex, answers }
let quizHistory = [];     // [{ score, total, subject, timestamp }]

export function initQuiz() {
  window.renderQuiz = renderQuizPage;
}

// ── Page renderer ─────────────────────────────────────────────────
function renderQuizPage(el) {
  el.innerHTML = `
    <div class="anim">
      <div class="dash-hero" style="padding:32px 20px 24px">
        <h2>🧠 Quiz Mode</h2>
        <p>AI-generated exam questions from your course material</p>
      </div>

      <div class="quiz-gen-section">
        <h3>⚙️ Configure Quiz</h3>

        <div style="margin-bottom:14px;">
          <label style="font-size:.82rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">
            Subject name
          </label>
          <input id="quizSubjectName" class="todo-inp" placeholder="e.g. Econometrie, Banking, Python..."
            style="width:100%;max-width:360px;" value="${escapeAttr(quizConfig.subject)}">
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:.82rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">
            Course material (paste text or upload a file first)
          </label>
          <textarea id="quizContext" class="summary-textarea"
            placeholder="Paste your course notes, slide text, or chapter content here..."
            style="min-height:100px;"></textarea>
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:.82rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">
            Number of questions
          </label>
          <div class="quiz-options-row" id="quizCountChips">
            ${[5,10,15,20].map(n =>
              `<button class="quiz-chip ${quizConfig.count === n ? 'active' : ''}"
                onclick="window._quizSetCount(${n})">${n} questions</button>`
            ).join('')}
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <label style="font-size:.82rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">
            Question type
          </label>
          <div class="quiz-options-row" id="quizTypeChips">
            ${[
              { val:'mixed',    label:'🎲 Mix' },
              { val:'grile',    label:'☑️ Multiple choice' },
              { val:'adevarat', label:'✓✗ True / False' },
            ].map(t =>
              `<button class="quiz-chip ${quizConfig.type === t.val ? 'active' : ''}"
                onclick="window._quizSetType('${t.val}', this)">${t.label}</button>`
            ).join('')}
          </div>
        </div>

        <button class="summary-gen-btn" id="quizGenBtn" onclick="window._generateQuiz()">
          🧠 Generate Quiz
        </button>
        <span class="summary-status" id="quizGenStatus" style="margin-left:12px;font-size:.82rem;color:var(--text-muted);"></span>
      </div>

      <div id="quizActiveZone">
        ${activeQuiz ? renderActiveQuiz() : renderQuizHistory()}
      </div>
    </div>`;

  // Expose handlers
  window._quizSetCount = n => {
    quizConfig.count = n;
    document.querySelectorAll('#quizCountChips .quiz-chip')
      .forEach(b => b.classList.toggle('active', b.textContent.startsWith(String(n))));
  };
  window._quizSetType = (t, el) => {
    quizConfig.type = t;
    document.querySelectorAll('#quizTypeChips .quiz-chip')
      .forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
  };
  window._generateQuiz = generateQuiz;
  window._answerQuiz   = answerQuestion;
  window._nextQuiz     = nextQuestion;
  window._prevQuiz     = prevQuestion;
  window._abandonQuiz  = abandonQuiz;
}

// ── Generate quiz via backend ─────────────────────────────────────
async function generateQuiz() {
  const subjectName = document.getElementById('quizSubjectName')?.value.trim();
  const context     = document.getElementById('quizContext')?.value.trim();
  const statusEl    = document.getElementById('quizGenStatus');
  const btn         = document.getElementById('quizGenBtn');

  if (!subjectName) { if (statusEl) statusEl.textContent = '⚠ Enter a subject name first'; return; }
  if (!context)     { if (statusEl) statusEl.textContent = '⚠ Paste some course material first'; return; }

  quizConfig.subject = subjectName;
  btn.disabled       = true;
  btn.textContent    = 'Generating…';
  if (statusEl) statusEl.textContent = 'Usually takes 15–25 seconds…';

  try {
    // ← This is the ONLY change needed: call our backend, not Anthropic directly
    const { questions } = await api.generateQuiz(
      subjectName, context, quizConfig.count, quizConfig.type
    );

    activeQuiz = { subjectName, questions, currentIndex: 0, answers: [] };
    if (statusEl) statusEl.textContent = '';
    document.getElementById('quizActiveZone').innerHTML = renderActiveQuiz();
  } catch (err) {
    if (statusEl) statusEl.textContent = '';
    showToast('Quiz generation failed', err.message, 'error');
  }

  btn.disabled    = false;
  btn.textContent = '🧠 Generate Quiz';
}

// ── Active quiz rendering ─────────────────────────────────────────
function renderActiveQuiz() {
  if (!activeQuiz) return '';
  const { questions, currentIndex, answers } = activeQuiz;
  const total  = questions.length;
  const isDone = currentIndex >= total;

  if (isDone) return renderQuizScore();

  const q           = questions[currentIndex];
  const hasAnswered  = answers[currentIndex] !== undefined;
  const userAnswer   = answers[currentIndex];
  const progress     = Math.round((currentIndex / total) * 100);
  const letters      = ['A', 'B', 'C', 'D'];

  // Build HTML using safe patterns:
  // - Question text and options use escapeText() to prevent XSS
  // - No innerHTML with user-controlled strings used raw
  let html = `
    <div class="quiz-container" style="margin-top:20px;">
      <div class="quiz-header">
        <span style="font-size:.88rem;font-weight:600;">Question ${currentIndex + 1} of ${total}</span>
        <button class="quiz-nav-btn" onclick="window._abandonQuiz()">✕ Abandon</button>
      </div>
      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width:${progress}%"></div>
      </div>
      <div class="quiz-question-card">
        <div class="quiz-q-num">${escapeText(activeQuiz.subjectName)}</div>
        <div class="quiz-q-text">${escapeText(q.q)}</div>
        <div class="quiz-options">`;

  q.options.forEach((option, idx) => {
    let cls = 'quiz-option';
    if (hasAnswered) {
      if (idx === q.correct)                       cls += ' correct';
      else if (idx === userAnswer && idx !== q.correct) cls += ' wrong';
    }
    html += `
      <button class="${cls}" ${hasAnswered ? 'disabled' : ''} onclick="window._answerQuiz(${idx})">
        <span class="quiz-option-letter">${letters[idx] || idx}</span>
        <span>${escapeText(option)}</span>
      </button>`;
  });

  html += '</div>';

  if (hasAnswered && q.explanation) {
    html += `<div class="quiz-explanation show">${escapeText(q.explanation)}</div>`;
  }

  html += `</div>
    <div class="quiz-nav-btns">
      <div>${currentIndex > 0 ? `<button class="quiz-nav-btn" onclick="window._prevQuiz()">← Prev</button>` : ''}</div>
      ${hasAnswered ? `<button class="quiz-nav-btn primary" onclick="window._nextQuiz()">${currentIndex === total - 1 ? 'Finish' : 'Next →'}</button>` : '<div></div>'}
    </div>
  </div>`;

  return html;
}

function renderQuizScore() {
  const { questions, answers, subjectName } = activeQuiz;
  const score = answers.filter((a, i) => a === questions[i].correct).length;
  const total = questions.length;
  const pct   = Math.round((score / total) * 100);
  const color = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';
  const msg   = pct >= 80 ? 'Excellent! Well prepared.' : pct >= 60 ? 'Good. Keep studying.' : 'Keep going — you can do it.';

  quizHistory.push({ subject: subjectName, score, total, timestamp: Date.now() });
  activeQuiz = null;

  let html = `
    <div class="quiz-score-card" style="margin-top:20px;">
      <div class="quiz-score-num" style="color:${color}">${pct}%</div>
      <div class="quiz-score-label">${score} of ${total} correct</div>
      <p style="color:var(--text-secondary);margin-bottom:24px;">${escapeText(msg)}</p>
      <button class="quiz-nav-btn primary" onclick="window.renderQuiz(document.getElementById('pageContent'))">
        New Quiz
      </button>
    </div>`;

  return html;
}

function renderQuizHistory() {
  if (!quizHistory.length) {
    return '<div style="text-align:center;padding:40px;color:var(--text-muted);">No quizzes completed yet. Generate your first quiz above!</div>';
  }
  const sorted = [...quizHistory].sort((a, b) => b.timestamp - a.timestamp);
  let html = '<div style="margin-top:4px;"><div style="font-size:.82rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Previous results</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">';
  sorted.slice(0, 12).forEach(r => {
    const pct   = Math.round((r.score / r.total) * 100);
    const color = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';
    html += `
      <div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;">
        <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:4px;">${escapeText(r.subject)} · ${new Date(r.timestamp).toLocaleDateString()}</div>
        <div style="font-size:1.6rem;font-weight:800;color:${color};font-family:Syne,sans-serif">${pct}%</div>
        <div style="font-size:.8rem;color:var(--text-secondary)">${r.score}/${r.total} correct</div>
      </div>`;
  });
  html += '</div></div>';
  return html;
}

// ── Quiz control functions ────────────────────────────────────────
function answerQuestion(idx) {
  if (!activeQuiz) return;
  activeQuiz.answers[activeQuiz.currentIndex] = idx;
  document.getElementById('quizActiveZone').innerHTML = renderActiveQuiz();
}
function nextQuestion() {
  if (!activeQuiz) return;
  activeQuiz.currentIndex++;
  document.getElementById('quizActiveZone').innerHTML = renderActiveQuiz();
}
function prevQuestion() {
  if (!activeQuiz || activeQuiz.currentIndex === 0) return;
  activeQuiz.currentIndex--;
  document.getElementById('quizActiveZone').innerHTML = renderActiveQuiz();
}
function abandonQuiz() {
  if (!confirm('Abandon this quiz?')) return;
  activeQuiz = null;
  document.getElementById('quizActiveZone').innerHTML = renderQuizHistory();
}

// ── Safe text helpers ─────────────────────────────────────────────
// Used for AI-generated content inserted into HTML strings.
// DOMPurify is used in render.js for rich HTML; for plain text in
// attribute/text contexts we use manual escaping.
function escapeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(str) { return escapeText(str); }
