'use strict';
// ─────────────────────────────────────────────────────────────────
// services/srsService.js — SM-2 Spaced Repetition Algorithm
//
// quality values (matches frontend buttons):
//   0 = "Nu știam"  (failed)
//   1 = "Greu"      (hard)
//   2 = "Știam"     (good)
// ─────────────────────────────────────────────────────────────────

const MIN_EASE    = 1.3;
const MAX_EASE    = 2.5;
const EASE_START  = 2.5;

/**
 * Apply SM-2 algorithm to a card and return updated SRS fields.
 * @param {object} card   - { ease_factor, interval_days, repetitions }
 * @param {number} quality - 0 | 1 | 2
 * @returns {{ ease_factor, interval_days, repetitions, due_date }}
 */
function reviewCard(card, quality) {
  let { ease_factor, interval_days, repetitions } = card;

  ease_factor   = Number(ease_factor)   || EASE_START;
  interval_days = Number(interval_days) || 1;
  repetitions   = Number(repetitions)   || 0;

  if (quality === 0) {
    // Failed — reset card to day 1
    repetitions   = 0;
    interval_days = 1;
    ease_factor   = Math.max(MIN_EASE, ease_factor - 0.2);

  } else if (quality === 1) {
    // Hard — short interval boost, ease decreases
    repetitions  += 1;
    interval_days = Math.max(1, Math.round(interval_days * 1.2));
    ease_factor   = Math.max(MIN_EASE, ease_factor - 0.15);

  } else {
    // Good — standard SM-2 progression
    repetitions += 1;
    if (repetitions === 1)      interval_days = 1;
    else if (repetitions === 2) interval_days = 6;
    else                        interval_days = Math.round(interval_days * ease_factor);

    ease_factor = Math.min(MAX_EASE, ease_factor + 0.1);
  }

  const due = new Date();
  due.setDate(due.getDate() + interval_days);
  const due_date = due.toISOString().split('T')[0];

  return { ease_factor, interval_days, repetitions, due_date };
}

/**
 * Calculate XP earned for a card review.
 * @param {number} quality  - 0 | 1 | 2
 * @param {number} reps     - repetitions BEFORE this review
 */
function xpForReview(quality, reps) {
  if (quality === 0) return 0;
  // First time correct is worth more
  return reps === 0 ? 10 : 5;
}

/**
 * Calculate XP earned for completing a quiz session.
 * @param {number} correct - number of correct answers
 * @param {number} total   - total questions
 */
function xpForQuiz(correct, total) {
  const base       = 20;
  const perCorrect = 3;
  const bonus      = correct === total && total > 0 ? 25 : 0;
  return base + correct * perCorrect + bonus;
}

/**
 * Determine XP milestones to surface in the UI.
 * Returns null or a milestone object when a noteworthy event happens.
 */
function checkMilestone(streak, totalXp) {
  const streakMilestones = [3, 7, 14, 30, 60, 100];
  if (streakMilestones.includes(streak)) {
    const bonusXp = streak >= 30 ? 500 : streak >= 7 ? 200 : 50;
    return { type: 'streak', streak, bonusXp };
  }
  return null;
}

module.exports = { reviewCard, xpForReview, xpForQuiz, checkMilestone };
