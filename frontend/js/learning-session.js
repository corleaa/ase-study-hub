// =============================================
// js/learning-session.js — Adaptive Recall Learning Loop
// =============================================
// Rendered via renderPage() when state.tab === 'session'
//
// Flow:
//   load session → show concept + question → user answers →
//   AI feedback → confidence input → next → session complete
//
// Depends on: app-core.js (authFetch, showToast, navigateTo)
// =============================================

(function() {

// ── Session state ─────────────────────────────────────────────────
let _session    = [];   // array of concept objects
let _idx        = 0;    // current concept index
let _stats      = {};   // { total, dueToday, weak }
let _phase      = 'loading';   // loading | question | feedback | complete | empty | error
let _lastResult = null;  // last AI answer result
let _container  = null;  // DOM element
let _sessionXp  = 0;
let _sessionCorrect = 0;

// ── Entry point ───────────────────────────────────────────────────
function renderLearningSessionPage(container) {
  _container = container;
  _phase     = 'loading';
  _idx       = 0;
  _session   = [];
  _lastResult = null;
  _sessionXp  = 0;
  _sessionCorrect = 0;
  _render();
  _loadSession();
}

// ── API calls ─────────────────────────────────────────────────────
async function _loadSession() {
  try {
    const res  = await authFetch('/api/concepts/session');
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Load failed');

    _stats   = data.stats || {};
    _session = data.session || [];

    if (!data.hasContent || _session.length === 0) {
      _phase = 'empty';
    } else {
      _phase = 'question';
    }
    _render();
  } catch (e) {
    _phase = 'error';
    _render();
  }
}

async function _submitAnswer(answerText, conceptId, questionId) {
  _phase = 'submitting';
  _render();

  try {
    const res = await authFetch('/api/concepts/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concept_id:  conceptId,
        question_id: questionId,
        answer_text: answerText,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Submit failed');

    _lastResult = data;
    _sessionXp += data.xp_earned || 0;
    if (data.is_correct) _sessionCorrect++;
    _phase = 'feedback';
    _render();
  } catch (e) {
    showToast('Eroare', 'Nu s-a putut evalua răspunsul. Încearcă din nou.', 'error');
    _phase = 'question';
    _render();
  }
}

async function _submitConfidence(confidence, conceptId, questionId) {
  // Post confidence update silently (best-effort)
  try {
    await authFetch('/api/concepts/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concept_id:  conceptId,
        question_id: questionId,
        answer_text: _lastResult?._answerText || '(reviewed)',
        confidence,
      }),
    });
  } catch {}
  _advanceToNext();
}

function _advanceToNext() {
  _idx++;
  if (_idx >= _session.length) {
    _phase = 'complete';
  } else {
    _phase = 'question';
    _lastResult = null;
  }
  _render();
}

// ── Render dispatcher ─────────────────────────────────────────────
function _render() {
  if (!_container) return;
  switch (_phase) {
    case 'loading':
    case 'submitting': _container.innerHTML = _tplLoading(); break;
    case 'question':   _container.innerHTML = _tplQuestion(); break;
    case 'feedback':   _container.innerHTML = _tplFeedback(); break;
    case 'complete':   _container.innerHTML = _tplComplete(); break;
    case 'empty':      _container.innerHTML = _tplEmpty(); break;
    case 'error':      _container.innerHTML = _tplError(); break;
  }
  _bindEvents();
}

// ── Templates ─────────────────────────────────────────────────────
function _tplLoading() {
  const msg = _phase === 'submitting' ? 'Evaluare răspuns…' : 'Se încarcă sesiunea…';
  return `
    <div class="ls-wrap anim">
      <div class="ls-loading">
        <div class="ls-spinner"></div>
        <p>${msg}</p>
      </div>
    </div>`;
}

function _tplEmpty() {
  return `
    <div class="ls-wrap anim">
      <div class="ls-empty">
        <div class="ls-empty-icon">🎯</div>
        <h2>Nicio sesiune de revizuit</h2>
        <p>Nu ai concepte de revizuit acum. Încarcă un document pentru a extrage concepte noi.</p>
        <button class="ls-btn-primary" id="ls-go-upload">Încarcă document</button>
        <button class="ls-btn-ghost" id="ls-go-home">Înapoi acasă</button>
      </div>
    </div>`;
}

function _tplError() {
  return `
    <div class="ls-wrap anim">
      <div class="ls-empty">
        <div class="ls-empty-icon">⚠️</div>
        <h2>Sesiunea nu a putut fi încărcată</h2>
        <p>Verifică conexiunea și încearcă din nou.</p>
        <button class="ls-btn-primary" id="ls-retry">Încearcă din nou</button>
      </div>
    </div>`;
}

function _tplQuestion() {
  const concept  = _session[_idx];
  if (!concept || !concept.question) return _tplError();

  const progress = Math.round((_idx / _session.length) * 100);
  const diffColor = { easy: 'var(--green)', medium: 'var(--amber)', hard: 'var(--red)' }[concept.difficulty_level] || 'var(--accent)';
  const importanceLabel = { high: '🔴 Prioritar', medium: '🟡 Important', low: '⚪ Secundar' }[concept.importance] || '';

  return `
    <div class="ls-wrap anim">
      <div class="ls-progress-bar"><div class="ls-progress-fill" style="width:${progress}%"></div></div>
      <div class="ls-counter">${_idx + 1} / ${_session.length}</div>

      <div class="ls-card">
        <div class="ls-concept-meta">
          <span class="ls-importance-badge">${importanceLabel}</span>
          ${concept.total_attempts > 0 ? `<span class="ls-attempts" style="color:${diffColor}">${Math.round(concept.success_rate * 100)}% reușite</span>` : '<span class="ls-attempts">Prima oară</span>'}
        </div>

        <div class="ls-concept-title">${_esc(concept.title)}</div>

        <div class="ls-question-label">Întrebare</div>
        <div class="ls-question-text">${_esc(concept.question.question_text)}</div>

        <textarea
          id="ls-answer-input"
          class="ls-answer-textarea"
          placeholder="Scrie răspunsul tău aici…"
          rows="5"
          maxlength="3000"
          autofocus
        ></textarea>

        <div class="ls-actions">
          <button class="ls-btn-primary" id="ls-submit-answer"
            data-concept-id="${concept.id}"
            data-question-id="${concept.question.id}">
            Trimite răspuns
          </button>
          <button class="ls-btn-ghost" id="ls-skip-concept">Sari peste</button>
        </div>
      </div>
    </div>`;
}

function _tplFeedback() {
  const concept = _session[_idx];
  const r       = _lastResult;
  if (!r || !concept) return _tplError();

  const isCorrect    = r.is_correct;
  const scoreColor   = r.score >= 80 ? 'var(--green)' : r.score >= 60 ? 'var(--amber)' : 'var(--red)';
  const scoreLabel   = r.score >= 80 ? '✓ Corect' : r.score >= 60 ? '~ Parțial corect' : '✗ Incorect';
  const scoreIcon    = r.score >= 80 ? '🎯' : r.score >= 60 ? '💡' : '📖';

  return `
    <div class="ls-wrap anim">
      <div class="ls-progress-bar"><div class="ls-progress-fill" style="width:${Math.round(((_idx + 1) / _session.length) * 100)}%"></div></div>

      <div class="ls-card">
        <div class="ls-score-row">
          <span class="ls-score-icon">${scoreIcon}</span>
          <span class="ls-score-label" style="color:${scoreColor}">${scoreLabel}</span>
          <span class="ls-score-num" style="color:${scoreColor}">${r.score}%</span>
        </div>

        ${r.feedback ? `<div class="ls-feedback-block">${_esc(r.feedback)}</div>` : ''}

        ${r.correct_explanation ? `
          <div class="ls-explanation-label">Răspuns complet</div>
          <div class="ls-explanation-text">${_esc(r.correct_explanation)}</div>
        ` : ''}

        <div class="ls-confidence-section">
          <div class="ls-confidence-label">Cât de sigur te-ai simțit?</div>
          <div class="ls-confidence-row">
            ${[1,2,3,4,5].map(n => `
              <button class="ls-conf-btn" data-conf="${n}"
                data-concept-id="${concept.id}"
                data-question-id="${concept.question.id}">
                ${n}
              </button>`).join('')}
          </div>
        </div>

        <div class="ls-xp-earned">+${r.xp_earned || 0} XP</div>
        <button class="ls-btn-primary" id="ls-next-concept">
          ${_idx + 1 >= _session.length ? 'Finalizează sesiunea' : 'Conceptul următor →'}
        </button>
      </div>
    </div>`;
}

function _tplComplete() {
  const total    = _session.length;
  const pct      = total > 0 ? Math.round((_sessionCorrect / total) * 100) : 0;
  const emoji    = pct >= 80 ? '🏆' : pct >= 60 ? '🎯' : '📚';
  const msg      = pct >= 80 ? 'Sesiune excelentă!' : pct >= 60 ? 'Progres bun!' : 'Continuă să exersezi!';

  return `
    <div class="ls-wrap anim">
      <div class="ls-complete">
        <div class="ls-complete-icon">${emoji}</div>
        <h2>${msg}</h2>
        <div class="ls-complete-stats">
          <div class="ls-cstat">
            <div class="ls-cstat-num">${_sessionCorrect}/${total}</div>
            <div class="ls-cstat-label">Corecte</div>
          </div>
          <div class="ls-cstat">
            <div class="ls-cstat-num">${pct}%</div>
            <div class="ls-cstat-label">Scor</div>
          </div>
          <div class="ls-cstat">
            <div class="ls-cstat-num">+${_sessionXp}</div>
            <div class="ls-cstat-label">XP câștigat</div>
          </div>
        </div>
        <button class="ls-btn-primary" id="ls-go-home">Înapoi acasă</button>
        <button class="ls-btn-ghost" id="ls-new-session">Sesiune nouă</button>
      </div>
    </div>`;
}

// ── Event binding ─────────────────────────────────────────────────
function _bindEvents() {
  if (!_container) return;

  // Submit answer
  const submitBtn = _container.querySelector('#ls-submit-answer');
  if (submitBtn) {
    submitBtn.addEventListener('click', function() {
      const input = _container.querySelector('#ls-answer-input');
      const text  = (input?.value || '').trim();
      if (!text) {
        input?.focus();
        input?.classList.add('ls-shake');
        setTimeout(() => input?.classList.remove('ls-shake'), 400);
        return;
      }
      if (_lastResult) _lastResult._answerText = text;
      else _lastResult = { _answerText: text };
      _submitAnswer(text, Number(submitBtn.dataset.conceptId), Number(submitBtn.dataset.questionId));
    });
  }

  // Keyboard shortcut: Ctrl+Enter to submit
  const textarea = _container.querySelector('#ls-answer-input');
  if (textarea) {
    textarea.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        submitBtn?.click();
      }
    });
    // Auto-focus
    setTimeout(() => textarea.focus(), 50);
  }

  // Skip concept
  const skipBtn = _container.querySelector('#ls-skip-concept');
  if (skipBtn) {
    skipBtn.addEventListener('click', _advanceToNext);
  }

  // Confidence buttons
  _container.querySelectorAll('.ls-conf-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const conf       = Number(btn.dataset.conf);
      const conceptId  = Number(btn.dataset.conceptId);
      const questionId = Number(btn.dataset.questionId);
      _container.querySelectorAll('.ls-conf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setTimeout(() => _submitConfidence(conf, conceptId, questionId), 300);
    });
  });

  // Next button (without confidence)
  const nextBtn = _container.querySelector('#ls-next-concept');
  if (nextBtn) {
    nextBtn.addEventListener('click', _advanceToNext);
  }

  // Navigation buttons
  _container.querySelector('#ls-go-home')?.addEventListener('click', () => navigateTo('dashboard'));
  _container.querySelector('#ls-go-upload')?.addEventListener('click', () => navigateTo('study-tools'));
  _container.querySelector('#ls-retry')?.addEventListener('click', () => { _phase = 'loading'; _render(); _loadSession(); });
  _container.querySelector('#ls-new-session')?.addEventListener('click', () => { _phase = 'loading'; _render(); _loadSession(); });
}

// ── Helpers ───────────────────────────────────────────────────────
function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

// ── Expose globally ───────────────────────────────────────────────
window.renderLearningSessionPage = renderLearningSessionPage;

})();
