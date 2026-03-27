// ─────────────────────────────────────────────────────────────────
// js/flashcards.js — Flashcard generation + spaced repetition study
//
// Changed from original:
//   REMOVED: direct Anthropic API calls
//   ADDED:   api.generateFlashcards() → POST /api/ai/flashcards
//   KEPT:    all SRS scheduling logic (safe client-side — no secrets)
//   KEPT:    flip animation, easy/hard rating UI
// ─────────────────────────────────────────────────────────────────
'use strict';

import { api }       from './api.js';
import { showToast } from './render.js';

// ── Local state ───────────────────────────────────────────────────
// Key = subject name, value = array of card objects
let decks = {};
let activeSubject = null;
let currentCardIdx = 0;
let isFlipped = false;

export function initFlashcards() {
  window.renderFlashcards = renderFlashcardsPage;
}

// ── Page renderer ─────────────────────────────────────────────────
function renderFlashcardsPage(el) {
  const deckNames = Object.keys(decks);

  el.innerHTML = `
    <div class="anim">
      <div class="dash-hero" style="padding:28px 20px 20px">
        <h2>🃏 Flashcards</h2>
        <p>AI-generated cards with spaced repetition scheduling</p>
      </div>

      <div class="quiz-gen-section">
        <h3>✨ Generate Flashcards</h3>

        <div style="margin-bottom:12px;">
          <input id="fcSubjectName" class="todo-inp" placeholder="Subject name (e.g. Banking)"
            style="width:100%;max-width:320px;margin-bottom:10px;">
          <textarea id="fcContext" class="summary-textarea"
            placeholder="Paste course material here…" style="min-height:80px;"></textarea>
        </div>

        <div class="quiz-options-row" id="fcCountChips" style="margin-bottom:12px;">
          ${[10,20,30].map(n =>
            `<button class="quiz-chip ${n===20?'active':''}" onclick="window._fcSetCount(${n})">${n} cards</button>`
          ).join('')}
        </div>

        <button class="summary-gen-btn" id="fcGenBtn" onclick="window._generateFC()">
          ✨ Generate Flashcards
        </button>
        <span id="fcGenStatus" style="margin-left:12px;font-size:.82rem;color:var(--text-muted);"></span>
      </div>

      ${deckNames.length ? `
        <div style="margin-bottom:16px;">
          <div class="quiz-options-row" id="fcDeckChips">
            ${deckNames.map(n =>
              `<button class="quiz-chip ${activeSubject===n?'active':''}" onclick="window._fcSelect('${escapeAttr(n)}')">${escapeText(n)}</button>`
            ).join('')}
          </div>
        </div>
      ` : ''}

      <div id="fcStudyZone">
        ${activeSubject && decks[activeSubject] ? renderStudy() : renderEmpty()}
      </div>
    </div>`;

  let selectedCount = 20;
  window._fcSetCount = n => {
    selectedCount = n;
    document.querySelectorAll('#fcCountChips .quiz-chip')
      .forEach(b => b.classList.toggle('active', b.textContent.startsWith(String(n))));
  };

  window._generateFC = async () => {
    const name    = document.getElementById('fcSubjectName')?.value.trim();
    const context = document.getElementById('fcContext')?.value.trim();
    const btn     = document.getElementById('fcGenBtn');
    const status  = document.getElementById('fcGenStatus');

    if (!name || !context) { showToast('Missing input', 'Enter a subject name and paste some material.', 'warning'); return; }

    btn.disabled    = true;
    btn.textContent = 'Generating…';
    if (status) status.textContent = 'Usually 15–20 seconds…';

    try {
      const { cards } = await api.generateFlashcards(name, context, selectedCount);

      // Add SRS metadata to each card
      decks[name] = cards.map((c, i) => ({
        id:         `${name}_${i}_${Date.now()}`,
        front:      c.front,
        back:       c.back,
        interval:   1,       // days until next review
        easeFactor: 2.5,     // SRS multiplier
        streak:     0,
        nextReview: Date.now(),  // due immediately
      }));

      activeSubject = name;
      currentCardIdx = 0;
      isFlipped = false;

      showToast('Flashcards ready!', `${cards.length} cards generated for ${name}`, 'success');
      renderFlashcardsPage(document.getElementById('pageContent'));
    } catch (err) {
      showToast('Generation failed', err.message, 'error');
    }

    btn.disabled    = false;
    btn.textContent = '✨ Generate Flashcards';
    if (status) status.textContent = '';
  };

  window._fcSelect = subj => {
    activeSubject  = subj;
    currentCardIdx = 0;
    isFlipped      = false;
    document.getElementById('fcStudyZone').innerHTML = renderStudy();
    document.querySelectorAll('#fcDeckChips .quiz-chip')
      .forEach(b => b.classList.toggle('active', b.textContent === subj));
  };

  window._fcFlip  = flipCard;
  window._fcRate  = rateCard;
  window._fcSkip  = skipCard;
}

// ── Study rendering ───────────────────────────────────────────────
function renderStudy() {
  const cards    = decks[activeSubject] || [];
  const now      = Date.now();
  const dueCards = cards.filter(c => !c.nextReview || c.nextReview <= now);
  const total    = cards.length;
  const mastered = cards.filter(c => c.streak >= 5).length;

  if (!total) return renderEmpty();

  let html = `
    <div class="flashcard-stats" style="margin-top:20px;">
      <div class="fc-stat"><div class="fc-stat-val">${total}</div><div class="fc-stat-label">Total</div></div>
      <div class="fc-stat"><div class="fc-stat-val" style="color:var(--amber)">${dueCards.length}</div><div class="fc-stat-label">Due</div></div>
      <div class="fc-stat"><div class="fc-stat-val" style="color:var(--green)">${mastered}</div><div class="fc-stat-label">Mastered</div></div>
    </div>`;

  if (!dueCards.length) {
    return html + `
      <div class="fc-deck-done">
        <div style="font-size:3rem;margin-bottom:12px;">🎉</div>
        <div style="font-size:1.3rem;font-weight:700;margin-bottom:8px;">All done for today!</div>
        <p style="color:var(--text-secondary);">Come back tomorrow for your next review session.</p>
      </div>`;
  }

  const card = dueCards[currentCardIdx % dueCards.length];
  const remaining = dueCards.length - (currentCardIdx % dueCards.length);

  html += `
    <div class="fc-queue-info">${remaining} cards remaining today</div>
    <div class="flashcard-scene" onclick="window._fcFlip()">
      <div class="flashcard-inner ${isFlipped ? 'flipped' : ''}">
        <div class="flashcard-face flashcard-front">
          <div class="fc-label">❓ Question</div>
          <div class="fc-content">${escapeText(card.front)}</div>
          <div class="fc-flip-hint">👆 Click to reveal answer</div>
        </div>
        <div class="flashcard-face flashcard-back">
          <div class="fc-label" style="color:var(--accent)">Answer</div>
          <div class="fc-content">${escapeText(card.back)}</div>
        </div>
      </div>
    </div>`;

  if (isFlipped) {
    const nextEasy = Math.round((card.interval || 1) * 2.5);
    const nextHard = Math.max(1, Math.round((card.interval || 1) / 2));
    html += `
      <div class="flashcard-answer-btns">
        <button class="fc-btn hard" onclick="window._fcRate('hard')">✕ Hard — retry in ${nextHard}d</button>
        <button class="fc-btn skip" onclick="window._fcSkip()">⏭ Skip</button>
        <button class="fc-btn easy" onclick="window._fcRate('easy')">✓ Easy — next in ${nextEasy}d</button>
      </div>`;
  }

  return html;
}

function renderEmpty() {
  return '<div style="text-align:center;padding:40px;color:var(--text-muted);">No flashcards yet. Generate a deck above!</div>';
}

// ── SRS logic (pure math — safe to keep client-side) ─────────────
function flipCard() {
  isFlipped = !isFlipped;
  document.getElementById('fcStudyZone').innerHTML = renderStudy();
}

function rateCard(rating) {
  const cards    = decks[activeSubject] || [];
  const now      = Date.now();
  const dueCards = cards.filter(c => !c.nextReview || c.nextReview <= now);
  if (!dueCards.length) return;

  const card      = dueCards[currentCardIdx % dueCards.length];
  const mainCard  = cards.find(c => c.id === card.id);
  if (!mainCard) return;

  if (rating === 'easy') {
    mainCard.streak     = (mainCard.streak || 0) + 1;
    mainCard.easeFactor = Math.min(3.0, (mainCard.easeFactor || 2.5) + 0.1);
    mainCard.interval   = Math.round((mainCard.interval || 1) * mainCard.easeFactor);
  } else {
    mainCard.streak     = 0;
    mainCard.easeFactor = Math.max(1.3, (mainCard.easeFactor || 2.5) - 0.2);
    mainCard.interval   = Math.max(1, Math.round((mainCard.interval || 1) / 2));
  }

  mainCard.nextReview = now + mainCard.interval * 24 * 60 * 60 * 1000;

  currentCardIdx++;
  isFlipped = false;
  document.getElementById('fcStudyZone').innerHTML = renderStudy();
}

function skipCard() {
  currentCardIdx++;
  isFlipped = false;
  document.getElementById('fcStudyZone').innerHTML = renderStudy();
}

// ── Safe text helpers ─────────────────────────────────────────────
function escapeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(str) { return escapeText(str); }
