// =============================================
// js/app-core.js — SURSĂ CANONICĂ: State, Routing, Render
// =============================================
//
// FIȘIER ACTIV — încărcat direct în index.html
//
// Conține:
//   - window.state (state global persistent în localStorage)
//   - saveState() / loadState()
//   - renderPage() — ROUTER PRINCIPAL al aplicației
//   - unlock() — inițializare după auth
//   - setupAppShellInteractions() — sidebar, tooltips, cmd palette
//   - exportProgressPDF() — PDF export în popup window
//   - showToast() — notificări globale
//   - getSubjects() / setSubjectData() — acces la materii
//
// ⚠️  RISC RIDICAT PENTRU AUTOMATIZARE:
//   Nu modifica renderPage() sau saveState() fără review complet.
//   Orice eroare în aceste funcții rupe ÎNTREAGA aplicație.
//
// Depinde de: dashboard-page.js, subject-page.js, study-tools-page.js,
//             system-pages.js, stats-mentor-page.js, finance-lab.js
//   (aceste fișiere sunt încărcate DUPĂ app-core.js și app-init.js)
// =============================================

// ── Backend AI proxy helper ───────────────────────────────────────
// Replaces direct Anthropic fetch calls with server-side proxy
// Auto-set apiKey so UI doesn't show "configure API key" warnings
document.addEventListener('DOMContentLoaded', function() {
  try { setupAppShellInteractions(); } catch(e) {}
  setTimeout(function() {
    if (window.state) {
      window.state.apiKey = 'backend';
      if (window.saveState) window.saveState();
    }
  }, 200);
});
async function refreshAccessToken() {
  if (window.__shRefreshPromise) return window.__shRefreshPromise;
  window.__shRefreshPromise = (async function() {
    try {
      var res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) return false;
      var data = await res.json().catch(function() { return {}; });
      if (!data.accessToken) return false;
      window.__shAccessToken = data.accessToken;
      return true;
    } catch (e) {
      return false;
    } finally {
      window.__shRefreshPromise = null;
    }
  })();
  return window.__shRefreshPromise;
}

function handleSessionExpired() {
  // Defined again in auth script block below — this stub is kept for
  // compatibility with old event listeners. Real logic in auth block.
  window.__shAccessToken = null;
  window.__shUser = null;
  try { if (typeof updateAuthUI === 'function') updateAuthUI(null); } catch(e) {}
}

async function authFetch(url, options, isRetry) {
  options = options || {};
  var opts = Object.assign({}, options);
  opts.credentials = 'include';
  opts.headers = Object.assign({}, options.headers || {});

  if (window.__shAccessToken && !opts.headers.Authorization) {
    opts.headers.Authorization = 'Bearer ' + window.__shAccessToken;
  }

  var response = await fetch(url, opts);

  if (response.status === 401 && !isRetry) {
    var refreshed = await refreshAccessToken();
    if (refreshed) {
      var retryOpts = Object.assign({}, options || {});
      retryOpts.headers = Object.assign({}, (options && options.headers) || {});
      delete retryOpts.headers.Authorization;
      return authFetch(url, retryOpts, true);
    }
    handleSessionExpired();
  }

  // 429 = rate limit: show upgrade modal (non-blocking — caller still gets the response)
  if (response.status === 429) {
    response.clone().json().then(function(data) {
      if (data && data.upgradeRequired && typeof handleRateLimitError === 'function') {
        handleRateLimitError(data);
      }
    }).catch(function() {});
  }

  return response;
}

async function callAI(system, messages, max_tokens) {
  max_tokens = max_tokens || 1500;
  var response = await authFetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ system: system, messages: messages, max_tokens: max_tokens })
  });
  if (!response.ok) {
    var err = await response.json().catch(function() { return { error: 'Server error' }; });
    throw new Error(err.error || 'AI request failed');
  }
  var data = await response.json();
  return { content: [{ text: data.content }] };
}


// =============================================
// SUBJECT THEMES — 12 palete de culori
// =============================================
const SUBJECT_THEMES = [
  { id: 'violet',  label: 'Violet',   accent: '#7b68ee', muted: 'rgba(123,104,238,0.12)', border: 'rgba(123,104,238,0.25)' },
  { id: 'blue',    label: 'Albastru', accent: '#4f8ef7', muted: 'rgba(79,142,247,0.12)',  border: 'rgba(79,142,247,0.25)' },
  { id: 'teal',    label: 'Teal',     accent: '#2ec4b6', muted: 'rgba(46,196,182,0.12)',  border: 'rgba(46,196,182,0.25)' },
  { id: 'green',   label: 'Verde',    accent: '#3dd68c', muted: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.25)' },
  { id: 'lime',    label: 'Lime',     accent: '#95d840', muted: 'rgba(149,216,64,0.12)',  border: 'rgba(149,216,64,0.25)' },
  { id: 'amber',   label: 'Chihlimb', accent: '#f0b45b', muted: 'rgba(240,180,91,0.12)', border: 'rgba(240,180,91,0.25)' },
  { id: 'orange',  label: 'Portocal', accent: '#f4845f', muted: 'rgba(244,132,95,0.12)', border: 'rgba(244,132,95,0.25)' },
  { id: 'red',     label: 'Roșu',     accent: '#f06272', muted: 'rgba(240,98,114,0.12)', border: 'rgba(240,98,114,0.25)' },
  { id: 'pink',    label: 'Roz',      accent: '#e879a0', muted: 'rgba(232,121,160,0.12)',border: 'rgba(232,121,160,0.25)' },
  { id: 'rose',    label: 'Rose',     accent: '#fb7185', muted: 'rgba(251,113,133,0.12)',border: 'rgba(251,113,133,0.25)' },
  { id: 'indigo',  label: 'Indigo',   accent: '#6366f1', muted: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)' },
  { id: 'cyan',    label: 'Cyan',     accent: '#22d3ee', muted: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.25)' },
];

// Returneaza tema pentru o materie (sau default violet)
function getSubjectTheme(subject) {
  return SUBJECT_THEMES.find(t => t.id === (subject.themeId || 'violet')) || SUBJECT_THEMES[0];
}

// Aplica CSS variables pentru culoarea materiei active
function applySubjectTheme(subject) {
  if (!subject) return;
  const theme = getSubjectTheme(subject);
  document.documentElement.style.setProperty('--subject-accent', theme.accent);
  document.documentElement.style.setProperty('--subject-muted', theme.muted);
  document.documentElement.style.setProperty('--subject-border', theme.border);
}

function resetSubjectTheme() {
  document.documentElement.style.removeProperty('--subject-accent');
  document.documentElement.style.removeProperty('--subject-muted');
  document.documentElement.style.removeProperty('--subject-border');
}

// =============================================
// SUBJECTS — DYNAMIC (nu mai sunt hardcodate!)
// =============================================
// Materiile default sunt ASE — dar pot fi complet șterse/înlocuite
const DEFAULT_SUBJECTS = {
  demo: {
    icon: 'graduation', name: 'Materie Demo', full: 'Cum funcționează Study Hub',
    desc: 'Exemplu — încarcă un PDF și generează primul rezumat', themeId: 'violet',
    resources: [
      { tag: 'slides', label: 'Exemplu: Curs 1 — Introducere' }
    ],
    systemPrompt: 'Ești un profesor AI. Explică conceptele clar și cu exemple practice. Răspunde în română.',
    isDemo: true
  }
};

// Returneaza SUBJECTS — NUMAI ce a definit userul
// Platforma porneste GOALA — userul isi adauga materiile lui
function getSubjects() {
  // Daca userul si-a definit propriile materii → le folosim pe ale lui
  // Altfel → DEFAULT_SUBJECTS (cele 5 ASE) ca demo/punct de plecare
  return state.customSubjects && Object.keys(state.customSubjects).length > 0
    ? state.customSubjects
    : DEFAULT_SUBJECTS;
}

// Verifica daca userul nu si-a personalizat inca materiile
function isFirstRun() {
  return Object.keys(state.customSubjects || {}).length === 0;
}

// Compatibilitate cu codul vechi care folosea SUBJECTS direct
// SUBJECTS se initializeaza dupa loadState() — vezi mai jos
let SUBJECTS = DEFAULT_SUBJECTS;

// =============================================
// BUILT-IN PRESENTATIONS
// =============================================
const BUILTIN_PRESENTATIONS = {
  mccp: [{
    id: 'builtin_rating',
    title: 'Modele de Rating',
    date: 'built-in',
    slides: [
      {
        tag: 'MCCP — Modele de Rating',
        title: 'Modele de Rating',
        content: '<p style="max-width:560px;margin-top:14px;">Instrumente cantitative pentru evaluarea riscului de credit al debitorilor — persoane fizice, companii sau entități suverane.</p><div class="s-grid" style="margin-top:20px;"><div class="s-card"><h4>📌 Obiectiv</h4><p>Cuantificarea probabilității de nerambursare (PD)</p></div><div class="s-card"><h4>📌 Utilizare</h4><p>Decizii de creditare, pricing, cerințe de capital</p></div></div>'
      },
      {
        tag: 'Slide 2',
        title: 'De ce avem nevoie de Rating?',
        content: '<ul><li>Asimetria informațională între debitor și creditor</li><li>Reglementări prudenţiale (Basel II / III / IV)</li><li>Standardizarea evaluării riscului de credit</li><li>Optimizarea alocării capitalului economic</li><li>Cerințe de transparență și raportare</li></ul><div class="formula" style="margin-top:18px;">Expected Loss = PD × LGD × EAD</div>'
      },
      {
        tag: 'Slide 3',
        title: 'Tipuri de Modele de Rating',
        content: '<div class="s-grid"><div class="s-card"><h4>Expert-Based</h4><p>Bazate pe judecata analiștilor de credit. Criterii calitative: management, industrie, strategie.</p></div><div class="s-card"><h4>Statistical Models</h4><p>Bazate pe date istorice. Metode: regresie logistică, analiză discriminantă, ML.</p></div><div class="s-card"><h4>Hybrid Models</h4><p>Combină judecata expertă cu modelele statistice. Cele mai utilizate în practică.</p></div><div class="s-card"><h4>Market-Based</h4><p>Derivate din prețuri de piață: spread CDS, yield obligațiuni, modele structurale (Merton).</p></div></div>'
      },
      {
        tag: 'Slide 4',
        title: 'Scala de Rating — Agenții Majore',
        content: '<table class="s-table"><thead><tr><th>Nivel Risc</th><th>S&P / Fitch</th><th>Moody\'s</th><th>Descriere</th></tr></thead><tbody><tr><td>▲ Investment</td><td>AAA</td><td>Aaa</td><td>Cea mai înaltă calitate</td></tr><tr><td>▲ Investment</td><td>AA+, AA, AA−</td><td>Aa1-Aa3</td><td>Calitate foarte ridicată</td></tr><tr><td>▲ Investment</td><td>A+, A, A−</td><td>A1-A3</td><td>Calitate ridicată</td></tr><tr><td>◑ Investment</td><td>BBB+, BBB, BBB−</td><td>Baa1-Baa3</td><td>Medie — limita investment grade</td></tr><tr><td>▼ Speculative</td><td>BB+ și sub</td><td>Ba1 și sub</td><td>Junk bonds / speculative</td></tr><tr><td>■ Default</td><td>D</td><td>C</td><td>Default / nerambursare</td></tr></tbody></table>'
      },
      {
        tag: 'Slide 5',
        title: 'Modelul Altman Z-Score',
        content: '<p>Unul dintre cele mai cunoscute modele statistice de predicție a falimentului, dezvoltat de Edward Altman (1968).</p><div class="formula">Z = 1.2·X₁ + 1.4·X₂ + 3.3·X₃ + 0.6·X₄ + 1.0·X₅</div><div class="s-grid" style="margin-top:12px;"><div class="s-card"><h4>Variabile</h4><p>X₁ = WC/TA<br>X₂ = RE/TA<br>X₃ = EBIT/TA<br>X₄ = MVE/BVD<br>X₅ = Sales/TA</p></div><div class="s-card"><h4>Interpretare</h4><p>Z &gt; 2.99 → Safe Zone<br>1.81 &lt; Z &lt; 2.99 → Grey Zone<br>Z &lt; 1.81 → Distress Zone</p></div></div>'
      },
      {
        tag: 'Slide 6',
        title: 'Regresie Logistică în Rating',
        content: '<p>Metoda cea mai utilizată pentru modele interne de rating (IRB — Basel II).</p><div class="formula">PD = 1 / (1 + e<sup>−(β₀ + β₁X₁ + β₂X₂ + ... + βₖXₖ)</sup>)</div><ul style="margin-top:16px;"><li>Variabila dependentă: default (1) vs. non-default (0)</li><li>Variabile independente: ratii financiare, indicatori calitativi</li><li>Output: probabilitate de default (PD) între 0 și 1</li><li>Estimare prin Maximum Likelihood (MLE)</li></ul>'
      },
      {
        tag: 'Slide 7',
        title: 'Variabile Frecvente în Modele',
        content: '<table class="s-table"><thead><tr><th>Categorie</th><th>Indicatori</th><th>Interpretare</th></tr></thead><tbody><tr><td>Profitabilitate</td><td>ROA, ROE, EBITDA margin</td><td>Capacitate de generare profit</td></tr><tr><td>Lichiditate</td><td>Current Ratio, Quick Ratio</td><td>Capacitate de plată pe termen scurt</td></tr><tr><td>Leverage</td><td>Debt/Equity, Debt/EBITDA</td><td>Gradul de îndatorare</td></tr><tr><td>Acoperire</td><td>Interest Coverage Ratio</td><td>Capacitatea de a plăti dobânzile</td></tr><tr><td>Dimensiune</td><td>Total Assets, Revenue</td><td>Stabilitate, diversificare</td></tr></tbody></table>'
      },
      {
        tag: 'Slide 8',
        title: 'Validarea Modelelor de Rating',
        content: '<div class="s-grid"><div class="s-card"><h4>Putere Discriminatorie</h4><p>Curba ROC / AUC — Gini Coefficient. Măsoară cât de bine separă modelul defaulterii de non-defaulteri.</p></div><div class="s-card"><h4>Calibrare</h4><p>Testul Hosmer-Lemeshow. PD estimat vs. rata de default observată pe fiecare clasă de rating.</p></div><div class="s-card"><h4>Stabilitate</h4><p>Population Stability Index (PSI). Verifică dacă distribuția scorurilor rămâne stabilă în timp.</p></div><div class="s-card"><h4>Backtesting</h4><p>Binomial test, Traffic Light Approach (Basel). Compară PD prognozat cu default-urile reale.</p></div></div>'
      },
      {
        tag: 'Slide 9',
        title: 'Cadrul Regulamentar — Basel IRB',
        content: '<p>Basel II/III permite băncilor să utilizeze modele interne de rating (IRB) pentru calculul cerințelor de capital.</p><ul style="margin-top:12px;"><li><strong>Foundation IRB (F-IRB):</strong> Banca estimează PD; LGD și EAD sunt prescrise de regulament</li><li><strong>Advanced IRB (A-IRB):</strong> Banca estimează PD, LGD și EAD cu modele proprii</li><li>Cerințe de date: minim 5 ani de observații, 7 ani pentru LGD</li><li>Validare independentă obligatorie (audit intern + supraveghetor)</li></ul><div class="formula" style="margin-top:12px;">RWA = K(PD, LGD, M) × 12.5 × EAD</div>'
      },
      {
        tag: 'Slide 10',
        title: 'Provocări & Tendințe Actuale',
        content: '<div class="s-grid"><div class="s-card"><h4>🤖 Machine Learning</h4><p>XGBoost, Random Forest, Neural Nets — performanță superioară dar „black box" (explicabilitate redusă).</p></div><div class="s-card"><h4>📐 Explicabilitate (XAI)</h4><p>SHAP, LIME — cerute de reglementări pentru interpretarea deciziilor modelului.</p></div><div class="s-card"><h4>🌍 ESG Integration</h4><p>Integrarea factorilor de mediu, sociali și de guvernanță în modelele de rating.</p></div><div class="s-card"><h4>Real-Time Rating</h4><p>Modele bazate pe date alternative (tranzacții, social media) pentru evaluare continuă.</p></div></div>'
      },
      {
        tag: 'Slide 11',
        title: 'Studiu de Caz — Model de Rating Corporate',
        content: '<p>Pași în construcția unui model de rating intern:</p><ul style="margin-top:12px;"><li><strong>1.</strong> Definirea default-ului (90+ zile restanță / restructurare)</li><li><strong>2.</strong> Colectare date: bilanț, cont P&L — minim 5 ani</li><li><strong>3.</strong> Analiză univariată: putere discriminatorie per variabilă (IV, WoE)</li><li><strong>4.</strong> Selecție variabile: stepwise, LASSO, VIF &lt; 5</li><li><strong>5.</strong> Estimare model: logistic regression</li><li><strong>6.</strong> Validare: ROC-AUC &gt; 0.70, Gini &gt; 40%</li><li><strong>7.</strong> Mapping PD → clase de rating (master scale)</li><li><strong>8.</strong> Monitorizare & recalibrare anuală</li></ul>'
      },
      {
        tag: 'Slide 12',
        title: 'Concluzii — Key Takeaways',
        content: '<ul><li>Modelele de rating sunt esențiale pentru managementul riscului de credit</li><li>Combinația expert + statistic dă cele mai robuste rezultate</li><li>Validarea este la fel de importantă ca estimarea</li><li>Reglementările Basel impun standarde stricte pentru IRB</li><li>ML crește performanța, dar trebuie explicabilitate (XAI)</li><li>ESG și date alternative redefinesc viitorul rating-ului</li></ul><div class="formula" style="margin-top:24px;font-size:clamp(0.8rem,1.5vw,1.1rem);color:var(--text-primary);">🎯 „Un model bun nu prezice doar — el explică și inspiră încredere."</div>'
      }
    ]
  }]
};

// =============================================
// STATE MANAGEMENT — v7
// =============================================
let state = {
  tab: 'dashboard',
  pin: null,
  apiKey: '',
  notes: {},
  todos: {},
  chatHistories: {},
  presentations: {},
  activePresIndex: {},
  links: {},
  progress: {},
  files: {},
  pomodoro: { running: false, mode: 'work', timeLeft: 1500 },
  // v6 features
  quizHistory: {},
  flashcardDecks: {},
  exams: [],
  studyPlan: {},
  // === v7 features ===
  customSubjects: {},      // materiile user-defined
  mindMaps: {},            // mind maps per materie
  examSessions: {},        // sesiuni exam simulator
  xp: 0,                  // XP total
  level: 1,               // nivel
  streak: 0,              // streak zile
  lastStudyDate: null,    // data ultimei sesiuni
  achievements: [],       // achievements deblocate
  activityLog: [],        // log [{date, type, subject, xp}]
  // === v8 features ===
  studyTime: {},          // timp studiu per materie {key: minutes}
  mentorHistory: [],      // istoricul conversatiilor cu AI Mentor
  subjectGroups: [],      // grupari materii: [{id, name, keys:[]}]
  pomoLog: [],            // log sesiuni pomodoro [{date, minutes, type}]
  // === v9 features ===
  aiPersonality: {        // configurare personalitate AI
    tone: 'friendly',     // 'friendly' | 'formal' | 'concise'
    detail: 'medium',     // 'brief' | 'medium' | 'detailed'
    examples: true,       // include exemple practice
    language: 'ro'        // limba de răspuns
  },
  userProfile: {          // profilul utilizatorului
    displayName: '',
    faculty: '',
    year: '',
    bio: ''
  }
};

let presSlidePositions = {};

function loadState() {
  try {
    const raw = localStorage.getItem('ash_state_v3');
    if (raw) {
      const saved = JSON.parse(raw);
      Object.assign(state, saved);
    }
    // Compatibilitate cu versiuni mai vechi
    if (!state.exams) state.exams = [];
    if (!state.quizHistory) state.quizHistory = {};
    if (!state.flashcardDecks) state.flashcardDecks = {};
    if (!state.studyPlan) state.studyPlan = {};
    if (!state.customSubjects) state.customSubjects = {};
    if (!state.mindMaps) state.mindMaps = {};
    if (!state.examSessions) state.examSessions = {};
    if (!state.achievements) state.achievements = [];
    if (!state.activityLog) state.activityLog = [];
    if (!state.studyTime) state.studyTime = {};
    if (!state.mentorHistory) state.mentorHistory = [];
    if (!state.subjectGroups) state.subjectGroups = [];
    if (!state.pomoLog) state.pomoLog = [];
    if (!state.aiPersonality) state.aiPersonality = { tone: 'friendly', detail: 'medium', examples: true, language: 'ro' };
    if (!state.userProfile) state.userProfile = { displayName: '', faculty: '', year: '', bio: '' };
    if (state.xp === undefined) state.xp = 0;
    if (state.level === undefined) state.level = 1;
    if (state.streak === undefined) state.streak = 0;

    // Reincarca SUBJECTS dupa loadState
    SUBJECTS = getSubjects();

    // Calculeaza streak-ul la fiecare login
    if (typeof checkAndUpdateStreak === 'function') checkAndUpdateStreak();
  } catch (e) {
    console.error('Failed to load state:', e);
  }
}

function saveState() {
  // Bug 11 fix: catch QuotaExceededError so the app doesn't silently lose data
  try {
    localStorage.setItem('ash_state_v3', JSON.stringify(state));
  } catch (e) {
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      showToast('Spațiu insuficient', 'Șterge câteva prezentări vechi pentru a elibera spațiu de salvare.', 'warning', 8000);
    }
  }
}

loadState();

// Refresh SUBJECTS reference dupa load (customSubjects pot fi acum populate)
SUBJECTS = getSubjects();

// Get all presentations for a subject (built-in + user-generated)
function getAllPresentations(subjectKey) {
  const builtin = BUILTIN_PRESENTATIONS[subjectKey] || [];
  const userGenerated = state.presentations[subjectKey] || [];
  return [...builtin, ...userGenerated];
}

// =============================================
// AUTHENTICATION
// =============================================

// SHA-256 hash using WebCrypto API (non-reversible, unlike btoa)
async function hashPin(value) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// handleLock / unlock / handleLogout — PIN screen eliminat, acum folosim auth backend
function handleLock() {
  // PIN screen nu mai există — funcție păstrată pentru compatibilitate cu apeluri vechi
  unlock();
}

function unlock() {
  // App is always visible now (guest mode supported)
  // Just render the UI components
  try { updateThemeButton(); } catch(e) {}
  try { renderSidebar(); } catch(e) {}
  try { renderPage(); } catch(e) {}
  try { renderBottomNav(); } catch(e) {}
  // Load today's learning session from API (only when logged in)
  setTimeout(function() {
    try { if (typeof loadTodaySession === 'function') loadTodaySession(); } catch(e) {}
  }, 400);
  setTimeout(function() {
    try {
      if (!state.lastStudyDate || state.lastStudyDate !== new Date().toISOString().split('T')[0]) {
        awardXP(10, 'Zi de studiu');
      }
      checkAchievements();
    } catch(e) {}
  }, 1200);
  setTimeout(function() {
    try {
      // Only show onboarding when the user is authenticated
      if (!window.__shUser) return;
      if (shouldShowOnboarding()) {
        openOnboarding();
      } else {
        checkAndNotify();
        setInterval(checkAndNotify, 5 * 60 * 1000);
      }
    } catch(e) {}
  }, 700);
}

async function handleLogout() {
  // Call server to revoke refresh token
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch(e) {}
  // Clear in-memory token and update UI to guest state
  window.__shAccessToken = null;
  window.__shUser = null;
  if (typeof updateAuthUI === 'function') updateAuthUI(null);
  // Re-render sidebar (no personal data anymore)
  try { renderSidebar(); } catch(e) {}
}

// =============================================
// THEME
// =============================================
// =============================================
// THEME — cu system sync
// =============================================
(function initTheme() {
  const saved = localStorage.getItem('ash_theme');
  // Dacă userul n-a ales manual → sync cu sistemul
  if (!saved) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.body.setAttribute('data-theme', saved);
  }
})();

// Ascultă schimbările sistemului în timp real (dacă userul n-a ales manual)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
  if (!localStorage.getItem('ash_theme')) {
    document.body.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    updateThemeButton();
  }
});

function toggleTheme() {
  const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('ash_theme', newTheme); // marchează alegere manuală
  updateThemeButton();
}

function updateThemeButton() {
  const btn = document.getElementById('themeBtn');
  if (btn) {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    btn.innerHTML = isDark
      ? `<span class="icon icon-sm">${ICONS.moon}</span>`
      : `<span class="icon icon-sm">${ICONS.sun}</span>`;
    btn.title = isDark ? 'Mod întunecat' : 'Mod luminos';
  }
}

// =============================================
// CLOCK
// =============================================
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('clock').textContent = hours + ':' + minutes;
}

setInterval(updateClock, 15000);
updateClock();

// =============================================
// UTILITIES
// =============================================

// Formatează minutele de studiu într-un string lizibil
// 0 → '0m' | 45 → '45m' | 90 → '1h 30m' | 120 → '2h'
function formatStudyTime(minutes) {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return m + 'm';
  if (m === 0) return h + 'h';
  return h + 'h ' + m + 'm';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatAIText(text) {
  // Sanitize AI-generated text to prevent XSS before inserting into DOM
  const ALLOWED_TAGS = ['strong', 'em', 'code', 'br', 'p', 'ul', 'ol', 'li', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span'];
  const ALLOWED_ATTR = ['style', 'class'];

  const raw = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:var(--bg-overlay);padding:2px 6px;border-radius:3px;font-family:JetBrains Mono,monospace;font-size:.82rem;">$1</code>')
    .replace(/\n/g, '<br>');

  if (window.DOMPurify) {
    return DOMPurify.sanitize(raw, { ALLOWED_TAGS, ALLOWED_ATTR, KEEP_CONTENT: true });
  }
  // Fallback if DOMPurify not loaded: strip all tags
  return raw.replace(/<(?!\/?(strong|em|code|br|p|ul|ol|li)\b)[^>]+>/gi, '');
}

// =============================================
// SIDEBAR — v7
// =============================================
function renderSidebar() {
  const nav = document.getElementById('sidebarNav');
  const subjects = getSubjects();
  let html = '';

  // XP & Streak indicator
  const currentLevel = state.level || 1;
  const currentXP = state.xp || 0;
  const currentStreak = state.streak || 0;
  const xpForLevel = getLevelXP(currentLevel) || 100;
  const xpPrev = currentLevel > 1 ? getLevelXP(currentLevel - 1) : 0;
  const xpProgress = Math.max(0, currentXP - xpPrev);
  const xpNeeded = Math.max(1, xpForLevel - xpPrev);
  const xpPct = Math.min(100, Math.round((xpProgress / xpNeeded) * 100));

  html += '<div style="padding:10px 14px;border-bottom:1px solid var(--border);margin-bottom:4px;">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">';
  html += '<span class="level-badge">Nivel ' + currentLevel + '</span>';
  html += '<span class="streak-flame ' + (currentStreak >= 3 ? 'hot' : 'cold') + '">' + currentStreak + ' zile</span>';
  html += '</div>';
  html += '<div class="xp-bar-wrap"><div class="xp-bar-fill" style="width:' + xpPct + '%"></div></div>';
  html += '<div style="font-size:.65rem;color:var(--text-muted);margin-top:3px;text-align:right;">' + xpProgress + '/' + xpNeeded + ' XP</div>';
  html += '</div>';

  html += '<div class="nav-section">General</div>';
  html += navBtn('dashboard', 'home', 'Pagina principală');
  html += navBtn('calendar', 'calendar', 'Calendar', getUpcomingExamBadge());

  html += '<div class="nav-section">Materii</div>';

  // Buton "Adaugă o materie" mereu vizibil deasupra listei
  html += '<button class="nav-item nav-item-add-subject" data-app-action="open-subject-manager">';
  html += '<span class="ni-icon">' + icon('plus', 'sm') + '</span> Adaugă o materie</button>';

  if (Object.keys(subjects).length > 0) {
    for (const [key, subject] of Object.entries(subjects)) {
      const todoCount = (state.todos[key] || []).filter(t => !t.done).length;
      const presCount = getAllPresentations(key).length;
      const theme = getSubjectTheme(subject);
      const isDemoSubj = subject.isDemo;
      html += '<button class="nav-item ' + (state.tab === key ? 'active' : '') + '" data-nav-tab="' + key + '" style="' + (state.tab === key ? '--accent:' + theme.accent + ';--accent-muted:' + theme.muted + ';--accent-border:' + theme.border : '') + '">';
      html += '<span class="ni-icon">' + subjectIcon(subject, 'sm') + '</span> ' + subject.name;
      if (isDemoSubj) html += '<span class="ni-badge" style="background:var(--amber-muted);color:var(--amber);font-size:.6rem;">demo</span>';
      if (todoCount) html += '<span class="ni-badge">' + todoCount + '</span>';
      if (presCount) html += '<span class="ni-badge" style="background:var(--green-muted);color:var(--green)">' + presCount + '</span>';
      html += '</button>';
    }
    html += '<button class="nav-item" data-app-action="open-subject-manager" style="color:var(--text-muted);font-size:.8rem;">';
    html += '<span class="ni-icon">' + icon('settings', 'sm') + '</span> Gestionează materii</button>';
  }

  html += '<div class="nav-section">Tools AI</div>';
  html += navBtn('finance', 'chart', 'Finance Lab');
  html += navBtn('quiz', 'brain', 'Quiz Mode');
  html += navBtn('flashcards', 'cards', 'Flashcards', getFlashcardDueBadge());
  html += navBtn('mindmap', 'map', 'Mind Map AI');
  html += navBtn('examsim', 'graduation', 'Exam Simulator');
  html += '<div class="nav-section">Analiză</div>';
  html += navBtn('stats', 'chart', 'Statistici Avansate');
  html += navBtn('mentor', 'robot', 'AI Mentor');
  html += '<div class="nav-section">Cont</div>';
  html += navBtn('profile', 'user', 'Contul meu', getAchievementBadge());
  html += navBtn('settings', 'settings', 'Setări & API Key');

  nav.innerHTML = html;
}

// Helper pentru nav button — acceptă icon name (string) sau emoji fallback
function navBtn(tab, iconName, label, badge) {
  let html = '<button class="nav-item ' + (state.tab === tab ? 'active' : '') + '" data-nav-tab="' + tab + '">';
  // iconName poate fi un string Lucide sau un emoji (compatibilitate materii)
  const isEmoji = [...iconName].some(c => c.codePointAt(0) > 0x2000);
  html += '<span class="ni-icon">' + (isEmoji ? iconName : icon(iconName, 'sm')) + '</span> ' + label;
  if (badge) html += badge;
  html += '</button>';
  return html;
}

function getUpcomingExamBadge() {
  const n = (state.exams || []).filter(e => new Date(e.date) >= new Date()).length;
  return n ? '<span class="ni-badge" style="background:var(--red-muted);color:var(--red)">' + n + '</span>' : '';
}

function getAchievementBadge() {
  const unlocked = (state.achievements || []).length;
  return unlocked ? '<span class="ni-badge" style="background:var(--amber-muted);color:var(--amber)">' + unlocked + '</span>' : '';
}

function getFlashcardDueBadge() {
  const n = getFlashcardsDueCount();
  return n ? '<span class="ni-badge" style="background:var(--amber-muted);color:var(--amber)">' + n + '</span>' : '';
}

function navigateTo(tab) {
  state.tab = tab;
  presSlidePositions = {};
  // Bug 5 fix: reset uploadedFileText so a file uploaded in subject A
  // doesn't bleed into a summary generated in subject B
  uploadedFileText = '';
  closeSidebar();
  renderSidebar();
  renderPage();
  renderBottomNav();
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (backdrop) backdrop.style.display = 'none';
}

function openSidebarMobile() {
  document.getElementById('sidebar').classList.toggle('open');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (backdrop) {
    backdrop.style.display = document.getElementById('sidebar').classList.contains('open') ? 'block' : 'none';
  }
}

function setupAppShellInteractions() {
  if (document.body.__appShellBound) return;
  document.body.__appShellBound = true;

  document.body.addEventListener('click', function(event) {
    if (event.target.id === 'onboardingOverlay') {
      closeOnboarding();
      return;
    }

    const overlayEl = event.target.closest('[data-app-overlay]');
    if (overlayEl && event.target === overlayEl) {
      const overlayAction = overlayEl.dataset.appOverlay;
      if (overlayAction === 'close-pomo-done') closePomoDone();
      else if (overlayAction === 'close-shortcuts') closeShortcuts();
      else if (overlayAction === 'close-command-palette') closeCommandPalette();
      return;
    }

    const navEl = event.target.closest('[data-nav-tab]');
    if (navEl) {
      const onboardingOverlay = document.getElementById('onboardingOverlay');
      if (onboardingOverlay && onboardingOverlay.classList.contains('open')) closeOnboarding();
      if (navEl.closest('#subjectsDrawer')) closeSubjectsDrawer();
      navigateTo(navEl.dataset.navTab);
      return;
    }

    const actionEl = event.target.closest('[data-app-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.appAction;
    switch (action) {
      case 'close-auth-modal': closeAuthModal(); return;
      case 'switch-auth-tab': switchAuthTab(actionEl.dataset.authTab); return;
      case 'submit-auth': submitAuth(); return;
      case 'close-upgrade-modal': closeUpgradeModal(); return;
      case 'upgrade-open-auth': openAuthModal(); closeUpgradeModal(); return;
      case 'close-sidebar': closeSidebar(); return;
      case 'toggle-theme': toggleTheme(); return;
      case 'open-command-palette': openCommandPalette(); return;
      case 'handle-logout': handleLogout(); return;
      case 'open-sidebar-mobile': openSidebarMobile(); return;
      case 'open-notif-panel': openNotifPanel(); return;
      case 'close-pomo-done': closePomoDone(); return;
      case 'pomo-restart-same': pomoRestartSame(); return;
      case 'pomo-done-start-next': pomoDoneStartNext(); return;
      case 'pv-prev': pvNavigate(-1); return;
      case 'pv-next': pvNavigate(1); return;
      case 'close-presentation-viewer': closePresentationViewer(); return;
      case 'clear-all-notifs': clearAllNotifs(); return;
      case 'onb-import-ase': onbImportASE(); return;
      case 'onb-skip-subjects': onbSkipSubjects(); return;
      case 'close-onboarding': closeOnboarding(); return;
      case 'onb-next': onbNext(); return;
      case 'close-shortcuts': closeShortcuts(); return;
      case 'open-subject-manager': openSubjectManager(); return;
      case 'open-subjects-drawer': openSubjectsDrawer(); return;
      case 'close-subjects-drawer': closeSubjectsDrawer(); return;
      case 'drawer-open-subject-manager': closeSubjectsDrawer(); openSubjectManager(); return;
      case 'drawer-import-ase': closeSubjectsDrawer(); importASETemplate(); return;
      case 'drawer-nav-tab': closeSubjectsDrawer(); navigateTo(actionEl.dataset.navTab); return;
      case 'open-auth-modal': openAuthModal(); return;
      default:
        // Delegate to daily-session handler if available
        if (typeof handleDailySessionAction === 'function') {
          if (handleDailySessionAction(action, actionEl)) return;
        }
        return;
    }
  });

  document.body.addEventListener('input', function(event) {
    if (event.target.id === 'cmdInput') {
      renderCmdResults(event.target.value);
    }
  });
}

// Randeaza bara de navigare de jos (mobile)
function renderBottomNav() {
  const el = document.getElementById('bottomNavItems');
  if (!el) return;
  const subjects = getSubjects();
  const hasSubjects = Object.keys(subjects).length > 0;
  const dueFC = getFlashcardsDueCount();

  const tabs = [
    { tab: 'dashboard', icon: 'home', label: 'Acasă' },
    { tab: 'subjects_drawer', icon: 'book', label: 'Materii', special: true },
    { tab: 'quiz', icon: 'brain', label: 'Quiz' },
    { tab: 'flashcards', icon: 'cards', label: 'Cards', badge: dueFC || 0 },
    { tab: 'mentor', icon: 'robot', label: 'Mentor' },
  ];

  let html = '';
  tabs.forEach(t => {
    const iconHtml = ICONS[t.icon] ? `<span class="icon icon-sm">${ICONS[t.icon]}</span>` : t.icon;
    if (t.special) {
      const isSubjectActive = Object.keys(subjects).includes(state.tab);
      html += '<button class="bn-item ' + (isSubjectActive ? 'active' : '') + '" data-app-action="open-subjects-drawer">';
      html += '<span class="bn-icon">' + iconHtml + '</span>';
      html += '<span class="bn-label">' + t.label + '</span>';
      if (!hasSubjects) html += '<span class="bn-badge">+</span>';
      html += '</button>';
    } else {
      const isActive = state.tab === t.tab;
      html += '<button class="bn-item ' + (isActive ? 'active' : '') + '" data-nav-tab="' + t.tab + '">';
      html += '<span class="bn-icon">' + iconHtml + '</span>';
      html += '<span class="bn-label">' + t.label + '</span>';
      if (t.badge) html += '<span class="bn-badge">' + t.badge + '</span>';
      html += '</button>';
    }
  });

  el.innerHTML = html;
}

// Drawer cu materiile — apare de jos pe mobil
function openSubjectsDrawer() {
  // Inchide daca e deja deschis
  const existing = document.getElementById('subjectsDrawer');
  if (existing) { closeSubjectsDrawer(); return; }

  const subjects = getSubjects();
  const subjectKeys = Object.keys(subjects);

  let html = '<div id="subjectsDrawerBackdrop" data-app-action="close-subjects-drawer" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:70;backdrop-filter:blur(3px);animation:fadeIn .2s ease;"></div>';

  html += '<div id="subjectsDrawer" style="position:fixed;bottom:0;left:0;right:0;z-index:71;background:var(--bg-raised);border-top:1px solid var(--border);border-radius:20px 20px 0 0;padding:0 0 max(16px,env(safe-area-inset-bottom));animation:slideUpDrawer .3s var(--ease);">';

  // Handle bar
  html += '<div style="display:flex;justify-content:center;padding:12px 0 4px;"><div style="width:40px;height:4px;border-radius:2px;background:var(--border-hover);"></div></div>';

  // Titlu
  html += '<div style="padding:8px 20px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);">';
  html += '<div style="font-weight:700;font-size:1rem;display:flex;align-items:center;gap:8px;">' + icon('book','sm') + ' Materiile mele</div>';
  html += '<button data-app-action="drawer-open-subject-manager" style="padding:6px 12px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-xs);font-size:.78rem;font-weight:600;cursor:pointer;">+ Adaugă</button>';
  html += '</div>';

  // Lista materii
  html += '<div style="max-height:55vh;overflow-y:auto;padding:10px 14px;">';

  if (subjectKeys.length === 0) {
    html += '<div style="text-align:center;padding:28px;color:var(--text-muted);">';
    html += '<div style="margin-bottom:10px;">' + iconBadge('book','','lg') + '</div>';
    html += '<div style="font-weight:600;margin-bottom:6px;">Nicio materie adăugată</div>';
    html += '<div style="font-size:.82rem;margin-bottom:16px;">Adaugă prima ta materie sau importă template-ul ASE</div>';
    html += '<button data-app-action="drawer-import-ase" style="padding:10px 20px;background:var(--accent-muted);color:var(--accent);border:1px solid var(--accent-border);border-radius:var(--radius-sm);font-weight:600;font-size:.85rem;cursor:pointer;width:100%;">Import Template ASE</button>';
    html += '</div>';
  } else {
    subjectKeys.forEach(key => {
      const subj = subjects[key];
      const theme = getSubjectTheme(subj);
      const isActive = state.tab === key;
      const todos = state.todos[key] || [];
      const done = todos.filter(t => t.done).length;
      const presCount = getAllPresentations(key).length;

      html += '<button data-app-action="drawer-nav-tab" data-nav-tab="' + key + '" style="width:100%;display:flex;align-items:center;gap:14px;padding:13px 14px;background:' + (isActive ? theme.muted : 'var(--bg-surface)') + ';border:1px solid ' + (isActive ? theme.border : 'var(--border)') + ';border-radius:var(--radius-sm);margin-bottom:8px;cursor:pointer;transition:all .2s;text-align:left;">';
      html += subjectIconBadge(subj, 40);
      html += '<div style="flex:1;min-width:0;">';
      html += '<div style="font-weight:700;font-size:.92rem;color:' + (isActive ? theme.accent : 'var(--text-primary)') + '">' + escapeHtml(subj.name) + '</div>';
      html += '<div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">' + presCount + ' prezentări · ' + (todos.length ? done + '/' + todos.length + ' tasks' : '0 tasks') + '</div>';
      html += '</div>';
      if (isActive) html += '<span style="color:' + theme.accent + ';font-size:1rem;">✓</span>';
      html += '</button>';
    });

    // Buton gestionare
    html += '<button data-app-action="drawer-open-subject-manager" style="width:100%;padding:11px;background:transparent;border:1px dashed var(--border);border-radius:var(--radius-sm);color:var(--text-muted);font-size:.82rem;cursor:pointer;margin-top:4px;">' + icon('settings','xs') + ' Gestionează materii</button>';
  }

  html += '</div></div>';

  // Injecteaza in body
  const container = document.createElement('div');
  container.id = 'subjectsDrawerContainer';
  container.innerHTML = html;
  document.body.appendChild(container);
}

function closeSubjectsDrawer() {
  const container = document.getElementById('subjectsDrawerContainer');
  if (container) container.remove();
}

// =============================================
// PAGE ROUTER — v7
// =============================================
function renderPage() {
  const page = document.getElementById('pageContent');
  const title = document.getElementById('topbarTitle');
  if (!page || !title) return;

  // Clear dashboard "Fereastra" full-bleed mode on every navigation
  page.classList.remove('page--dash-window');

  // Reset subject theme
  resetSubjectTheme();

  if (state.tab === 'session') {
    title.textContent = 'Sesiune de învățare';
    if (typeof renderLearningSessionPage === 'function') renderLearningSessionPage(page);
    else page.innerHTML = '<div class="empty-state">Se încarcă...</div>';
  } else if (state.tab === 'daily-session') {
    title.textContent = 'Sesiunea de azi';
    if (typeof renderDailySessionPage === 'function') renderDailySessionPage(page);
    else page.innerHTML = '<div class="empty-state">Se încarcă...</div>';
  } else if (state.tab === 'dashboard') {
    title.textContent = 'Pagina principală';
    renderDashboard(page);
  } else if (state.tab === 'calendar') {
    title.textContent = 'Calendar Sesiune';
    renderCalendarPage(page);
  } else if (state.tab === 'quiz') {
    title.textContent = 'Quiz Lab';
    renderQuizPage(page);
  } else if (state.tab === 'flashcards') {
    title.textContent = 'Flashcards';
    renderFlashcardsPage(page);
  } else if (state.tab === 'mindmap') {
    title.textContent = 'Mind Map AI';
    renderMindMapPage(page);
  } else if (state.tab === 'examsim') {
    title.textContent = 'Exam Simulator';
    renderExamSimPage(page);
  } else if (state.tab === 'achievements') {
    title.textContent = 'Realizări & XP';
    renderAchievementsPage(page);
  } else if (state.tab === 'stats') {
    title.textContent = 'Insight Center';
    renderStatsPage(page);
  } else if (state.tab === 'mentor') {
    title.textContent = 'AI Mentor';
    renderMentorPage(page);
  } else if (state.tab === 'finance') {
    title.textContent = 'Finance Lab';
    renderFinanceLab(page);
  } else if (state.tab === 'profile') {
    if (!window.__shUser) {
      navigateTo('dashboard');
      if (typeof openAuthModal === 'function') openAuthModal();
      if (typeof switchAuthTab === 'function') switchAuthTab('register');
      return;
    }
    title.textContent = 'Contul meu';
    renderProfilePage(page);
  } else if (state.tab === 'settings') {
    title.textContent = 'Setări & Date';
    renderSettingsPage(page);
  } else {
    // Subject page
    const subject = getSubjects()[state.tab];
    if (!subject) { navigateTo('dashboard'); return; }
    // Aplica tema materiei
    applySubjectTheme(subject);
    title.textContent = subject.name + ' — ' + subject.full;
    renderSubjectPage(page, state.tab, subject);
  }
}

// =============================================
// ONBOARDING FLOW
// =============================================
let onbCurrentStep = 1;
const ONB_TOTAL = 4;

function shouldShowOnboarding() {
  return !localStorage.getItem('ash_onboarding_done');
}

function openOnboarding() {
  const overlay = document.getElementById('onboardingOverlay');
  if (overlay) overlay.classList.add('open');
  onbCurrentStep = 1;
  updateOnbUI();
}

function closeOnboarding() {
  const overlay = document.getElementById('onboardingOverlay');
  if (overlay) overlay.classList.remove('open');
  localStorage.setItem('ash_onboarding_done', '1');
  // Save API key if entered
  const keyInput = document.getElementById('onbApiKey');
  if (keyInput && keyInput.value.trim()) {
    state.apiKey = keyInput.value.trim();
    saveState();
  }
}

function onbNext() {
  // Step 2: save API key if entered
  if (onbCurrentStep === 2) {
    const keyInput = document.getElementById('onbApiKey');
    if (keyInput && keyInput.value.trim()) {
      state.apiKey = keyInput.value.trim();
      saveState();
    }
  }

  if (onbCurrentStep >= ONB_TOTAL) {
    closeOnboarding();
    showToast('Bun venit!', 'Study Hub e configurat. Apasă ? pentru shortcut-uri.', 'success', 5000);
    return;
  }
  onbCurrentStep++;
  updateOnbUI();
}

function onbImportASE() {
  if (!Object.keys(state.customSubjects||{}).length) {
    state.customSubjects = JSON.parse(JSON.stringify(DEFAULT_SUBJECTS));
    SUBJECTS = getSubjects();
    saveState();
  }
  onbNext();
}

function onbSkipSubjects() {
  onbNext();
}

function updateOnbUI() {
  for (let i = 1; i <= ONB_TOTAL; i++) {
    const el = document.getElementById('onbStep' + i);
    if (el) el.classList.toggle('active', i === onbCurrentStep);
  }

  const fill = document.getElementById('onbProgressFill');
  if (fill) fill.style.width = (onbCurrentStep / ONB_TOTAL * 100) + '%';

  const dots = document.querySelectorAll('.onb-dot');
  dots.forEach((d, i) => d.classList.toggle('active', i === onbCurrentStep - 1));

  const nextBtn = document.getElementById('onbNextBtn');
  if (nextBtn) nextBtn.textContent = onbCurrentStep >= ONB_TOTAL ? 'Pornește' : 'Continuă';

  const skipBtn = document.getElementById('onbSkipBtn');
  if (skipBtn) skipBtn.style.visibility = onbCurrentStep >= ONB_TOTAL ? 'hidden' : 'visible';
}

// =============================================
// KEYBOARD SHORTCUTS (extended)
// =============================================
let gKeyPressed = false;
let gKeyTimer = null;

document.addEventListener('keydown', function(e) {
  const tag = e.target.tagName;
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

  // ⌘K / Ctrl+K — Command Palette (already handled in existing code)
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); return; }

  // ⌘E / Ctrl+E — Export PDF
  if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
    e.preventDefault();
    exportProgressPDF();
    return;
  }

  if (inInput) return;

  // ? — Show keyboard shortcuts
  if (e.key === '?') {
    e.preventDefault();
    const panel = document.getElementById('shortcutsPanel');
    if (panel) panel.classList.toggle('open');
    return;
  }

  // T — Toggle theme
  if (e.key === 't' || e.key === 'T') {
    toggleTheme();
    return;
  }

  // Escape — close panels
  if (e.key === 'Escape') {
    closeShortcuts();
    closeOnboarding();
    document.getElementById('notifPanel')?.classList.remove('open');
    return;
  }

  // G + key navigation
  if (e.key === 'g' || e.key === 'G') {
    gKeyPressed = true;
    clearTimeout(gKeyTimer);
    gKeyTimer = setTimeout(() => { gKeyPressed = false; }, 1500);
    return;
  }

  if (gKeyPressed) {
    gKeyPressed = false;
    clearTimeout(gKeyTimer);
    const navMap = {
      'd': 'dashboard', 'D': 'dashboard',
      'q': 'quiz',      'Q': 'quiz',
      'f': 'flashcards','F': 'flashcards',
      'c': 'calendar',  'C': 'calendar',
      's': 'stats',     'S': 'stats',
      'm': 'mentor',    'M': 'mentor',
      'x': 'examsim',   'X': 'examsim',
    };
    if (navMap[e.key]) {
      e.preventDefault();
      navigateTo(navMap[e.key]);
    }
  }
});

function closeShortcuts() {
  const panel = document.getElementById('shortcutsPanel');
  if (panel) panel.classList.remove('open');
}

// =============================================
// PDF PROGRESS EXPORT
// =============================================
async function exportProgressPDF() {
  const subjects = getSubjects();
  const quizH = state.quizHistory || {};
  const fcDecks = state.flashcardDecks || {};

  const win = window.open('', '_blank');
  if (!win) { showToast('Export blocat', 'Permite pop-up-uri pentru a exporta PDF.', 'warning'); return; }

  const today = new Date().toLocaleDateString('ro', { day: 'numeric', month: 'long', year: 'numeric' });

  let subjectRows = '';
  Object.entries(subjects).forEach(([key, subj]) => {
    const todos = state.todos[key] || [];
    const done = todos.filter(t => t.done).length;
    const pct = todos.length ? Math.round(done/todos.length*100) : 0;
    const pres = getAllPresentations(key).length;
    const qResults = quizH[key] || [];
    const avgQ = qResults.length ? Math.round(qResults.reduce((a,r) => a + (r.score/r.total)*100, 0)/qResults.length) : '—';
    const fcCount = (fcDecks[key] || []).length;
    const studyMin = (state.studyTime||{})[key] || 0;
    const studyH = studyMin ? formatStudyTime(studyMin) : '—';

    const barColor = pct >= 80 ? '#10d9a0' : pct >= 50 ? '#f5a623' : '#ef4565';
    subjectRows += `
      <tr>
        <td>${escapeHtml(subj.name)}</td>
        <td><div style="display:flex;align-items:center;gap:8px;">
          <div style="flex:1;height:6px;background:#1a2030;border-radius:3px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${barColor};border-radius:3px;"></div>
          </div>
          <span style="font-size:11px;color:#7a8099;white-space:nowrap;">${done}/${todos.length}</span>
        </div></td>
        <td style="text-align:center;">${pres}</td>
        <td style="text-align:center;color:${typeof avgQ==='number'?(avgQ>=70?'#10d9a0':avgQ>=50?'#f5a623':'#ef4565'):'#7a8099'}">${typeof avgQ==='number'?avgQ+'%':avgQ}</td>
        <td style="text-align:center;">${fcCount}</td>
        <td style="text-align:center;color:#7a8099;">${studyH}</td>
      </tr>`;
  });

  const allQuizzes = Object.values(quizH).flat();
  const globalAvg = allQuizzes.length ? Math.round(allQuizzes.reduce((a,r) => a + (r.score/r.total)*100, 0)/allQuizzes.length) : 0;
  const totalFC = Object.values(fcDecks).flat().length;
  const totalPres = Object.values(state.presentations||{}).flat().length;

  win.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>Raport Progres — Study Hub</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Syne:wght@700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'DM Sans',sans-serif; background:#080a0f; color:#eceef5; padding:40px; font-size:14px; line-height:1.5; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:36px; padding-bottom:24px; border-bottom:1px solid rgba(255,255,255,0.06); }
  .header-logo { display:flex; align-items:center; gap:12px; }
  .logo-icon { width:40px; height:40px; background:rgba(79,110,247,0.15); border:1px solid rgba(79,110,247,0.25); border-radius:10px; display:flex; align-items:center; justify-content:center; }
  .logo-title { font-family:'Syne',sans-serif; font-size:1.1rem; font-weight:700; }
  .logo-sub { font-family:'JetBrains Mono',monospace; font-size:0.62rem; color:#4f6ef7; letter-spacing:0.1em; text-transform:uppercase; margin-top:2px; }
  .header-meta { text-align:right; }
  .header-date { font-family:'JetBrains Mono',monospace; font-size:0.75rem; color:#7a8099; }
  .header-name { font-family:'Syne',sans-serif; font-size:1rem; font-weight:700; margin-bottom:4px; }
  .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:32px; }
  .kpi { background:#0e1118; border:1px solid rgba(255,255,255,0.045); border-radius:10px; padding:18px 20px; }
  .kpi-val { font-family:'Syne',sans-serif; font-size:1.8rem; font-weight:700; margin-bottom:4px; }
  .kpi-label { font-size:0.75rem; color:#7a8099; text-transform:uppercase; letter-spacing:0.08em; }
  .section-title { font-family:'Syne',sans-serif; font-size:0.9rem; font-weight:700; margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06); }
  table { width:100%; border-collapse:collapse; margin-bottom:32px; }
  th { text-align:left; padding:10px 14px; font-size:0.72rem; font-family:'JetBrains Mono',monospace; color:#4a5068; text-transform:uppercase; letter-spacing:0.08em; border-bottom:1px solid rgba(255,255,255,0.06); }
  td { padding:12px 14px; border-bottom:1px solid rgba(255,255,255,0.03); font-size:0.85rem; }
  tr:last-child td { border-bottom:none; }
  .footer { margin-top:40px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.06); font-family:'JetBrains Mono',monospace; font-size:0.68rem; color:#414860; display:flex; justify-content:space-between; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head><body>
<div class="header">
  <div class="header-logo">
    <div class="logo-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f6ef7" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg></div>
    <div><div class="logo-title">Study Hub</div><div class="logo-sub">Progress Report</div></div>
  </div>
  <div class="header-meta">
    <div class="header-name">Nivel ${state.level||1} · ${state.xp||0} XP</div>
    <div class="header-date">Generat ${today}</div>
  </div>
</div>
<div class="kpis">
  <div class="kpi"><div class="kpi-val" style="color:#4f6ef7">${state.streak||0}</div><div class="kpi-label">Zile streak</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#10d9a0">${globalAvg || 0}%</div><div class="kpi-label">Medie quiz</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#f5a623">${totalFC}</div><div class="kpi-label">Flashcard-uri</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#a78bfa">${totalPres}</div><div class="kpi-label">Prezentări</div></div>
</div>
<div class="section-title">Progres per Materie</div>
<table>
  <thead><tr><th>Materie</th><th style="width:220px">Tasks</th><th>Prez.</th><th>Quiz avg</th><th>Flashcards</th><th>Studiu</th></tr></thead>
  <tbody>${subjectRows||'<tr><td colspan="6" style="text-align:center;color:#414860;padding:24px;">Nicio materie configurată</td></tr>'}</tbody>
</table>
<div class="footer"><span>Study Hub</span><span>${today}</span></div>
<scr" + "ipt>window.print();<\/scr" + "ipt>
</body></html>`);
  win.document.close();
}

// Page is ready, waiting for PIN input

// Award first login XP — integrat direct in unlock (fara redeclarare)
// XP-ul se acorda din renderPage dupa primul load

