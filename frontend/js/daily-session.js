// =============================================
// js/daily-session.js — Daily Session Engine
// =============================================
// Responsabilități:
//   - loadTodaySession()      — fetch /api/learning/today, sync state
//   - renderDailySessionWidget() — widget pe dashboard
//   - renderDailySessionPage(el) — full-page card review
//   - submitCardReview(id, q)  — POST review, update UI
// Depinde de: app-core.js (authFetch, showToast, state, saveState, renderSidebar)
// =============================================

// ── Cache sesiune zilnică ───────────────────
window.__learningToday = null;        // { due_cards, due_count, est_minutes, streak, level }
window.__reviewSession = null;        // { cards, idx, correct, total }

// Safe icon wrapper — icon() is defined in stats-mentor-page.js (loaded after)
function dsIcon(name, size) {
  try { return typeof icon === 'function' ? icon(name, size) : ''; } catch(e) { return ''; }
}

// ─────────────────────────────────────────────────────────────────
// LOAD — fetch today's session from API
// ─────────────────────────────────────────────────────────────────
async function loadTodaySession() {
  if (!window.__shUser) return;
  try {
    var res = await authFetch('/api/learning/today');
    if (!res.ok) return;
    var data = await res.json();
    window.__learningToday = data;

    // Sync streak + XP din API → state (sidebar shows real data)
    if (data.streak) {
      state.streak = data.streak.current_streak || 0;
    }
    if (data.level) {
      state.xp    = data.level.xp    || state.xp    || 0;
      state.level = data.level.level || state.level || 1;
    }
    saveState();
    try { renderSidebar(); } catch(e) {}

    // Re-render dashboard widget if on dashboard
    if (state.tab === 'dashboard') {
      var widget = document.getElementById('dailySessionWidget');
      if (widget) widget.outerHTML = renderDailySessionWidget();
    }
  } catch(e) {}
}

// ─────────────────────────────────────────────────────────────────
// DASHBOARD WIDGET
// ─────────────────────────────────────────────────────────────────
function renderDailySessionWidget() {
  var today = window.__learningToday;
  var user  = window.__shUser;

  if (!user) {
    // Guest — CTA to sign in
    return '<div class="ds-widget ds-widget-guest" id="dailySessionWidget">'
      + '<div class="ds-widget-icon">' + dsIcon('brain', 'sm') + '</div>'
      + '<div class="ds-widget-body">'
      + '<div class="ds-widget-title">Sistemul tău de studiu zilnic</div>'
      + '<div class="ds-widget-sub">Conectează-te pentru a activa spaced repetition, streak și progresul tău real.</div>'
      + '</div>'
      + '<button class="ds-widget-cta" data-app-action="open-auth-modal">Intră în cont</button>'
      + '</div>';
  }

  if (!today || today.due_count === 0) {
    // Logged in, no cards due
    var streakVal = (today && today.streak) ? today.streak.current_streak : (state.streak || 0);
    return '<div class="ds-widget ds-widget-done" id="dailySessionWidget">'
      + '<div class="ds-widget-icon" style="color:var(--green)">' + dsIcon('check_circle', 'sm') + '</div>'
      + '<div class="ds-widget-body">'
      + '<div class="ds-widget-title">Sesiunea de azi: completă ' + (streakVal >= 1 ? '🔥' : '') + '</div>'
      + '<div class="ds-widget-sub">Nu ai carduri scadente. Revino mâine sau adaugă materie nouă.</div>'
      + '</div>'
      + '<button class="ds-widget-cta secondary" data-nav-tab="subjects">+ Materie</button>'
      + '</div>';
  }

  var dueCount   = today.due_count;
  var estMin     = today.est_minutes || Math.max(1, Math.round(dueCount * 0.5));
  var streakVal2 = today.streak ? today.streak.current_streak : (state.streak || 0);
  var streakHtml = streakVal2 > 0
    ? '<span class="ds-streak-badge">' + dsIcon('trending','xs') + ' ' + streakVal2 + ' zile</span>'
    : '';

  return '<div class="ds-widget" id="dailySessionWidget">'
    + '<div class="ds-widget-icon">' + dsIcon('cards', 'sm') + '</div>'
    + '<div class="ds-widget-body">'
    + '<div class="ds-widget-title">Sesiunea de azi' + (streakHtml ? ' &nbsp;' + streakHtml : '') + '</div>'
    + '<div class="ds-widget-sub">'
    + '<strong style="color:var(--text-primary)">' + dueCount + ' carduri</strong> de revizuit &nbsp;·&nbsp; ~' + estMin + ' minute'
    + '</div>'
    + '</div>'
    + '<button class="ds-widget-cta" data-app-action="start-daily-session">Începe sesiunea</button>'
    + '</div>';
}

// ─────────────────────────────────────────────────────────────────
// FULL PAGE — card review session
// ─────────────────────────────────────────────────────────────────
function renderDailySessionPage(element) {
  var today = window.__learningToday;

  if (!window.__shUser) {
    element.innerHTML = '<div class="empty-state"><p>Trebuie să fii autentificat pentru sesiunea zilnică.</p>'
      + '<button class="summary-gen-btn" data-app-action="open-auth-modal">Intră în cont</button></div>';
    return;
  }

  if (!today || !today.due_cards || today.due_cards.length === 0) {
    element.innerHTML = '<div class="empty-state">'
      + '<div style="font-size:2.5rem;margin-bottom:12px;">✅</div>'
      + '<div class="section-title" style="margin-bottom:8px;">Toate cardurile sunt la zi!</div>'
      + '<p class="section-copy">Nu ai carduri scadente azi. Adaugă materie sau revino mâine.</p>'
      + '<button class="summary-gen-btn" style="margin-top:16px;" data-nav-tab="dashboard">Înapoi la Dashboard</button>'
      + '</div>';
    return;
  }

  // Start review session
  window.__reviewSession = {
    cards:   today.due_cards.slice(),
    idx:     0,
    correct: 0,
    total:   today.due_cards.length,
    flipped: false,
  };

  element.innerHTML = '<div class="ds-session" id="dsSession"></div>';
  renderCurrentCard();
}

function renderCurrentCard() {
  var sess = window.__reviewSession;
  var container = document.getElementById('dsSession');
  if (!container) return;

  if (sess.idx >= sess.total) {
    renderSessionComplete(container);
    return;
  }

  var card    = sess.cards[sess.idx];
  var prog    = sess.idx + 1;
  var progPct = Math.round((sess.idx / sess.total) * 100);

  container.innerHTML = ''
    + '<div class="ds-progress-bar"><div class="ds-progress-fill" style="width:' + progPct + '%"></div></div>'
    + '<div class="ds-counter">' + prog + ' / ' + sess.total + '</div>'
    + (card.subject_name ? '<div class="ds-subject-tag" style="background:' + (card.subject_color || 'var(--accent-muted)') + '22;color:' + (card.subject_color || 'var(--accent)') + ';border-color:' + (card.subject_color || 'var(--accent)') + '44">' + escapeHtml(card.subject_name) + '</div>' : '')
    + '<div class="ds-card-wrap">'
    +   '<div class="ds-card" id="dsCard">'
    +     '<div class="ds-card-front">'
    +       '<div class="ds-card-label">Întrebare</div>'
    +       '<div class="ds-card-text">' + escapeHtml(card.front) + '</div>'
    +       '<button class="ds-reveal-btn" id="dsRevealBtn" data-app-action="ds-reveal">Arată răspunsul</button>'
    +     '</div>'
    +     '<div class="ds-card-back" id="dsCardBack" style="display:none;">'
    +       '<div class="ds-card-label">Răspuns</div>'
    +       '<div class="ds-card-text">' + escapeHtml(card.back) + '</div>'
    +       '<div class="ds-answer-btns">'
    +         '<button class="ds-ans-btn ds-ans-fail"  data-app-action="ds-answer" data-quality="0">Nu știam</button>'
    +         '<button class="ds-ans-btn ds-ans-hard"  data-app-action="ds-answer" data-quality="1">Greu</button>'
    +         '<button class="ds-ans-btn ds-ans-good"  data-app-action="ds-answer" data-quality="2">Știam ✓</button>'
    +       '</div>'
    +     '</div>'
    +   '</div>'
    + '</div>';
}

function revealCard() {
  var front = document.querySelector('.ds-card-front');
  var back  = document.getElementById('dsCardBack');
  var card  = document.getElementById('dsCard');
  if (!front || !back || !card) return;
  front.style.display = 'none';
  back.style.display  = 'flex';
  card.classList.add('flipped');
  window.__reviewSession.flipped = true;
}

async function answerCard(quality) {
  var sess = window.__reviewSession;
  if (!sess || sess.idx >= sess.total) return;

  var card = sess.cards[sess.idx];
  quality  = Number(quality);

  if (quality === 2) sess.correct++;

  // Disable buttons immediately (prevent double-tap)
  document.querySelectorAll('.ds-ans-btn').forEach(function(b) { b.disabled = true; });

  try {
    var res = await authFetch('/api/learning/cards/review', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ card_id: card.id, quality: quality }),
    });
    if (res.ok) {
      var data = await res.json();
      if (data.xp_earned > 0) {
        showToast('+' + data.xp_earned + ' XP', null, 'info', 1800);
      }
      if (data.milestone) {
        showToast('🔥 ' + data.milestone.streak + ' zile streak!', '+' + data.milestone.bonusXp + ' XP bonus', 'success', 4000);
      }
      // Sync state from server response
      if (data.streak) state.streak = data.streak.current_streak || 0;
      if (data.level)  { state.xp = data.level.xp || 0; state.level = data.level.level || 1; }
      saveState();
      try { renderSidebar(); } catch(e) {}
    }
  } catch(e) {}

  sess.idx++;
  setTimeout(function() { renderCurrentCard(); }, 150);
}

function renderSessionComplete(container) {
  var sess    = window.__reviewSession;
  var pct     = sess.total > 0 ? Math.round((sess.correct / sess.total) * 100) : 0;
  var emoji   = pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📚';
  var msg     = pct >= 80 ? 'Excelent! Retenție foarte bună.' : pct >= 50 ? 'Bine! Continuă constant.' : 'Ai muncit. Cardurile dificile revin mâine.';

  // Refresh session data for tomorrow
  loadTodaySession();

  container.innerHTML = ''
    + '<div class="ds-complete">'
    +   '<div class="ds-complete-emoji">' + emoji + '</div>'
    +   '<div class="ds-complete-title">Sesiune completă!</div>'
    +   '<div class="ds-complete-stats">'
    +     '<div class="ds-stat"><div class="ds-stat-val" style="color:var(--green)">' + sess.correct + '</div><div class="ds-stat-label">Corecte</div></div>'
    +     '<div class="ds-stat"><div class="ds-stat-val" style="color:var(--red)">' + (sess.total - sess.correct) + '</div><div class="ds-stat-label">De repetat</div></div>'
    +     '<div class="ds-stat"><div class="ds-stat-val">' + pct + '%</div><div class="ds-stat-label">Acuratețe</div></div>'
    +   '</div>'
    +   '<div class="ds-complete-msg">' + msg + '</div>'
    +   '<div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap;">'
    +     '<button class="summary-gen-btn" data-nav-tab="dashboard">Dashboard</button>'
    +   '</div>'
    + '</div>';
}

// ─────────────────────────────────────────────────────────────────
// ACTION HANDLER — called from app-core.js setupAppShellInteractions
// ─────────────────────────────────────────────────────────────────
function handleDailySessionAction(action, el) {
  if (action === 'start-daily-session') {
    if (typeof navigateTo === 'function') navigateTo('daily-session');
    return true;
  }
  if (action === 'ds-reveal') {
    revealCard();
    return true;
  }
  if (action === 'ds-answer') {
    answerCard(el.dataset.quality);
    return true;
  }
  return false;
}
