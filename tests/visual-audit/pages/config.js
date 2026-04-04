// =============================================
// pages/config.js — Configurații per pagină pentru audit
//
// Fiecare pagină definește:
//   - cum se navighează (navigate function)
//   - ce să aștepte ca semnal de "pagina e gata"
//   - ce selectori sunt critici de verificat
//   - ce euristici specifice se aplică
//   - ce state minimal e necesar
// =============================================

'use strict';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001';

// State minimal de boot: skip onboarding, marchează că e logat guest
const BOOT_STATE = {
  tab: 'dashboard',
  apiKey: 'backend',
  notes: {},
  todos: { 'MAP': [{ title: 'Algebra liniară - recapitulare', done: false }, { title: 'Probabilități', done: true }] },
  chatHistories: {},
  presentations: {},
  links: {},
  progress: {},
  files: {},
  quizHistory: { 'MAP': [{ score: 82, total: 10, date: Date.now() }] },
  flashcardDecks: { 'MAP': [{ front: 'Ce este o matrice?', back: 'O structură de date dreptunghiulară.', box: 1 }] },
  exams: [],
  studyPlan: {},
  customSubjects: {
    'PYTHON': {
      key: 'PYTHON',
      name: 'Python Programming',
      icon: '🐍',
      color: '#73c9a6',
      group: 'info'
    }
  },
  mindMaps: {},
  examSessions: {},
  xp: 1240,
  level: 3,
  streak: 7,
  lastStudyDate: new Date().toISOString().slice(0, 10),
  achievements: [],
  activityLog: [],
  studyTime: { 'MAP': 120 },
  mentorHistory: [],
  subjectGroups: [],
  pomoLog: []
};

/**
 * Inițializare comună pentru toate paginile.
 * Setează localStorage cu state minimal și skip onboarding.
 */
async function bootPage(page, tab) {
  await page.addInitScript((state) => {
    const s = Object.assign({}, state);
    s.tab = state.tab; // va fi overridden dacă e nevoie
    window.localStorage.setItem('ash_state_v3', JSON.stringify(s));
    window.localStorage.setItem('ash_onboarding_done', '1');
  }, { ...BOOT_STATE, tab: tab || 'dashboard' });

  await page.goto(BASE_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800); // lasă JS să se inițializeze

  // Skip onboarding dacă apare
  const onboarding = page.locator('#onboardingOverlay');
  if (await onboarding.isVisible().catch(() => false)) {
    await page.evaluate(() => {
      const btn = document.querySelector('[data-app-action="close-onboarding"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);
  }
}

/**
 * Navighează la un tab specific via JS direct (mai rapid și mai fiabil decât click)
 */
async function navTo(page, tab) {
  await page.evaluate((t) => {
    if (typeof window.navigateTo === 'function') window.navigateTo(t);
    else if (window.state) {
      window.state.tab = t;
      if (typeof window.renderPage === 'function') window.renderPage();
    }
  }, tab);
  await page.waitForTimeout(600);
}

// ─────────────────────────────────────────────
// PAGINI CONFIGURATE
// ─────────────────────────────────────────────

const PAGES = [

  {
    id: 'dashboard',
    name: 'Dashboard',
    tab: 'dashboard',
    description: 'Pagina principală cu hub de navigare, statistici și onboarding',
    navigate: async (page) => {
      await bootPage(page, 'dashboard');
    },
    waitFor: '#pageContent',
    criticalSelectors: [
      '#pageContent',
      '.sidebar',
      '[data-nav-tab]'
    ],
    specificChecks: {
      // Verifică că există cel puțin un CTA vizibil în dashboard
      hasCTA: 'button, a[href], [role="button"]',
      // Verifică că există titlu de pagină
      hasTitle: '#topbarTitle, h1, [class*="page-title"]'
    },
    canonicalFiles: {
      css: 'css/app.css → DASHBOARD (ln ~1359)',
      js: 'js/dashboard-page.js'
    }
  },

  {
    id: 'subject-map',
    name: 'Subject Page (MAP)',
    tab: 'MAP',
    description: 'Pagina de materie - MAP. Conține tabs: Summaries, Flashcards, Quiz, etc.',
    navigate: async (page) => {
      await bootPage(page, 'MAP');
    },
    waitFor: '#pageContent',
    criticalSelectors: [
      '#pageContent',
      '[data-nav-tab="MAP"]'
    ],
    specificChecks: {
      hasTabs: '[data-subject-tab], [class*="tab"]'
    },
    canonicalFiles: {
      css: 'css/app.css → SUBJECT HEADER (ln ~2781)',
      js: 'js/subject-page.js'
    }
  },

  {
    id: 'quiz',
    name: 'Quiz Lab',
    tab: 'quiz',
    description: 'Interfața de quiz cu questions, options, progress bar',
    navigate: async (page) => {
      await bootPage(page, 'quiz');
    },
    waitFor: '#pageContent',
    criticalSelectors: [
      '#pageContent',
      '.quiz-container, [class*="quiz"]'
    ],
    canonicalFiles: {
      css: 'css/app.css → QUIZ MODE STYLES (ln ~130)',
      js: 'js/app-core.js (inline quiz logic)'
    }
  },

  {
    id: 'flashcards',
    name: 'Flashcards',
    tab: 'flashcards',
    description: 'Sistem de flashcards cu flip animation',
    navigate: async (page) => {
      await bootPage(page, 'flashcards');
    },
    waitFor: '#pageContent',
    criticalSelectors: [
      '#pageContent',
      '.flashcard-container, [class*="flashcard"]'
    ],
    canonicalFiles: {
      css: 'css/app.css → FLASHCARDS STYLES (ln ~357)',
      js: 'js/app-core.js (inline flashcard logic)'
    }
  },

  {
    id: 'mentor',
    name: 'AI Mentor',
    tab: 'mentor',
    description: 'Chat cu AI Mentor - interfață de conversație',
    navigate: async (page) => {
      await bootPage(page, 'mentor');
    },
    waitFor: '#pageContent',
    criticalSelectors: ['#pageContent'],
    canonicalFiles: {
      css: 'css/app.css → AI CHAT (ln ~1649)',
      js: 'js/stats-mentor-page.js'
    }
  },

  {
    id: 'stats',
    name: 'Insight Center',
    tab: 'stats',
    description: 'Dashboard de statistici: progres, quiz history, activitate',
    navigate: async (page) => {
      await bootPage(page, 'stats');
    },
    waitFor: '#pageContent',
    criticalSelectors: [
      '#pageContent',
      '[class*="stats"], [class*="insight"], [class*="chart"]'
    ],
    canonicalFiles: {
      css: 'css/app.css → V8 STATISTICI (ln ~4509)',
      js: 'js/stats-mentor-page.js'
    }
  },

  {
    id: 'finance-lab',
    name: 'Finance Lab',
    tab: 'finance',
    description: 'Finance Lab interactiv - Stability tool cu gauges, charts, network',
    navigate: async (page) => {
      await bootPage(page, 'finance');
      // Click pe stability tab dacă e nevoie
      try {
        await page.locator('[data-finance-mode="stability"]').first().click({ timeout: 3000 });
        await page.waitForTimeout(400);
      } catch(e) {}
    },
    waitFor: '#pageContent',
    criticalSelectors: [
      '#pageContent',
      '.finance-lab-shell, [class*="finance"]'
    ],
    canonicalFiles: {
      css: 'css/finance-lab.css',
      js: 'js/finance-lab.js'
    }
  },

  {
    id: 'study-tools',
    name: 'Study Tools',
    tab: 'mindmap',
    description: 'Mind Map AI și Exam Simulator',
    navigate: async (page) => {
      await bootPage(page, 'mindmap');
    },
    waitFor: '#pageContent',
    criticalSelectors: ['#pageContent'],
    canonicalFiles: {
      css: 'css/app.css → V7 MIND MAP (ln ~4320)',
      js: 'js/study-tools-page.js'
    }
  },

  {
    id: 'calendar',
    name: 'Calendar Sesiune',
    tab: 'calendar',
    description: 'Calendar de planificare sesiune de examen',
    navigate: async (page) => {
      await bootPage(page, 'calendar');
    },
    waitFor: '#pageContent',
    criticalSelectors: [
      '#pageContent',
      '[class*="calendar"]'
    ],
    canonicalFiles: {
      css: 'css/app.css → CALENDAR / EXAM PLANNER (ln ~523)',
      js: 'js/system-pages.js'
    }
  },

  {
    id: 'settings',
    name: 'Setări',
    tab: 'settings',
    description: 'Pagina de setări și export date',
    navigate: async (page) => {
      await bootPage(page, 'settings');
    },
    waitFor: '#pageContent',
    criticalSelectors: ['#pageContent'],
    canonicalFiles: {
      css: 'css/app.css',
      js: 'js/system-pages.js'
    }
  }

];

module.exports = { PAGES, bootPage, navTo, BASE_URL };
