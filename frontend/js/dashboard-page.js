function renderProductIdentityCards() {
  const cards = [
    { iconN: 'layers2', title: 'Summaries', copy: 'Transformă cursurile în explicații clare, secțiuni compacte și idei ordonate vizual.' },
    { iconN: 'cards', title: 'Flashcards', copy: 'Memorează cu revizuire distribuită și sesiuni scurte care îți arată exact ce merită repetat.' },
    { iconN: 'brain', title: 'Quizzes', copy: 'Testează înțelegerea cu întrebări generate din materia ta, nu din exemple abstracte.' },
    { iconN: 'chart', title: 'Interactive Learning', copy: 'Explorarea vizuală te ajută să vezi relații, cauze și efecte înainte de formule.' }
  ];
  return '<div class="purpose-grid">' + cards.map(function(card) {
    return '<div class="purpose-card">'
      + '<span class="icon icon-sm" style="color:var(--accent)">' + icon(card.iconN, 'sm') + '</span>'
      + '<strong>' + card.title + '</strong>'
      + '<p>' + card.copy + '</p>'
      + '</div>';
  }).join('') + '</div>';
}

function renderDashboardNextSteps() {
  const steps = [
    { badge: '1', title: 'Generează un rezumat vizual', copy: 'Începe cu o fișă de învățare. Este baza pentru înțelegere, recapitulare și exemple concrete.', action: 'subjects', label: 'Alege o materie' },
    { badge: '2', title: 'Testează ideile importante', copy: 'Treci rapid din rezumat în quiz. Vezi unde înțelegi bine și unde ai nevoie de clarificare.', action: 'quiz', label: 'Deschide quiz' },
    { badge: '3', title: 'Fixează în memorie', copy: 'Mută conceptele în flashcards pentru recapitulări scurte, dese și ușor de urmărit.', action: 'flashcards', label: 'Studiază flashcards' }
  ];
  return '<div class="dashboard-next-steps">' + steps.map(function(step) {
    return '<div class="next-step-card"><span class="soft-badge">Pasul ' + step.badge + '</span><div class="section-title" style="font-size:1.02rem;margin-top:12px;">'
      + step.title + '</div><div class="section-copy" style="font-size:.86rem;">' + step.copy + '</div><button class="summary-gen-btn" style="margin-top:16px;" data-dashboard-action="' + step.action + '">' + step.label + '</button></div>';
  }).join('') + '</div>';
}

function getLearningPlaygroundState(subjectKey, subject) {
  if (!window.__studyHubPlaygrounds) window.__studyHubPlaygrounds = {};
  if (!window.__studyHubPlaygrounds[subjectKey]) {
    const lower = (subject.full || subject.name || '').toLowerCase();
    const economicsLike = /micro|macro|econ|elastic|cerere|ofert|finance|bank|pia|cost/.test(lower);
    window.__studyHubPlaygrounds[subjectKey] = economicsLike
      ? { mode: 'economics', price: 12, demand: 70, sensitivity: 50 }
      : { mode: 'learning', chunk: 4, repetition: 3, difficulty: 55 };
  }
  return window.__studyHubPlaygrounds[subjectKey];
}

function setPlaygroundValue(subjectKey, field, value) {
  const subject = getSubjects()[subjectKey];
  if (!subject) return;
  const stateObj = getLearningPlaygroundState(subjectKey, subject);
  stateObj[field] = Number(value);
  const zone = document.getElementById('learningStudioZone');
  if (zone) zone.innerHTML = renderInteractiveLearningStudio(subjectKey, subject, getAllPresentations(subjectKey));
}

function renderLearningPlayground(subjectKey, subject) {
  const play = getLearningPlaygroundState(subjectKey, subject);

  if (play.mode === 'economics') {
    const adjustedDemand = Math.max(10, Math.round(play.demand - (play.price - 10) * (play.sensitivity / 8)));
    const revenue = adjustedDemand * play.price;
    const stableDemand = Math.max(12, Math.round(play.demand - (play.price - 10) * 2));
    return '<div class="graph-playground"><div class="section-kicker">Interactive Graph</div><div class="section-title">Elasticitate explicată vizual</div><div class="section-copy">Mișcă variabilele și vezi separat prețul, cererea și venitul. Așa înțelegi graficul ca relație reală, nu doar ca teorie.</div>'
      + '<div class="slider-grid">'
      + '<div class="slider-card"><label><span>Preț</span><strong>' + play.price + ' lei</strong></label><input type="range" min="4" max="20" value="' + play.price + '" data-playground-subject="' + subjectKey + '" data-playground-field="price"></div>'
      + '<div class="slider-card"><label><span>Cerere de bază</span><strong>' + play.demand + ' unități</strong></label><input type="range" min="30" max="110" value="' + play.demand + '" data-playground-subject="' + subjectKey + '" data-playground-field="demand"></div>'
      + '<div class="slider-card"><label><span>Sensibilitate</span><strong>' + play.sensitivity + '%</strong></label><input type="range" min="10" max="90" value="' + play.sensitivity + '" data-playground-subject="' + subjectKey + '" data-playground-field="sensitivity"></div>'
      + '<div class="slider-card"><label><span>Scenariu</span><strong>Piață de cafea</strong></label><div class="section-copy" style="font-size:.82rem;">Prețul crește, clienții reacționează diferit în funcție de cât de elastică este cererea.</div></div>'
      + '</div>'
      + '<div class="playground-stage"><div class="decompose-steps"><div class="decompose-step"><span class="step-no">1</span><strong>Prețul urcă</strong><p class="section-copy" style="font-size:.82rem;">Valoarea produsului pleacă din controlul tău direct.</p></div><div class="decompose-step"><span class="step-no">2</span><strong>Cererea reacționează</strong><p class="section-copy" style="font-size:.82rem;">Sensibilitatea arată cât de repede scad cumpărătorii.</p></div><div class="decompose-step"><span class="step-no">3</span><strong>Venitul se schimbă</strong><p class="section-copy" style="font-size:.82rem;">Abia la final vezi dacă noul preț ajută sau nu.</p></div></div>'
      + '<div class="playground-bars"><div class="play-bar"><div class="play-bar-label">Preț</div><div class="play-bar-visual" style="height:' + Math.max(70, play.price * 10) + 'px;"></div><div class="play-bar-value">' + play.price + ' lei</div></div><div class="play-bar"><div class="play-bar-label">Cerere estimată</div><div class="play-bar-visual" style="height:' + Math.max(70, adjustedDemand * 2) + 'px;background:linear-gradient(180deg,var(--blue),color-mix(in srgb,var(--blue) 56%, black));"></div><div class="play-bar-value">' + adjustedDemand + ' unități</div></div><div class="play-bar"><div class="play-bar-label">Venit</div><div class="play-bar-visual" style="height:' + Math.max(70, revenue * .22) + 'px;background:linear-gradient(180deg,var(--green),color-mix(in srgb,var(--green) 56%, black));"></div><div class="play-bar-value">' + revenue + ' lei</div></div></div>'
      + '<div class="scenario-callout"><strong>Exemplu concret</strong><p>Dacă vinzi cafea într-o zonă cu multe alternative, o sensibilitate mare înseamnă că o creștere mică de preț mută clienții în altă parte. Dacă cererea este mai stabilă, venitul poate crește chiar dacă vinzi puțin mai puțin.</p><p style="margin-top:8px;">Comparație rapidă: la aceeași cerere de bază, un model stabil ar produce aproximativ ' + stableDemand + ' unități. Asta te ajută să vezi diferența dintre cerere elastică și cerere inelastică.</p></div></div></div>';
  }

  const clarity = Math.max(5, 100 - play.difficulty);
  const retention = Math.max(8, Math.round(play.chunk * 12 + play.repetition * 14 + clarity * 0.35));
  const overload = Math.max(5, Math.round(play.difficulty * 0.8 + play.chunk * 6 - play.repetition * 8));
  return '<div class="graph-playground"><div class="section-kicker">Interactive Graph</div><div class="section-title">Cum se construiește retenția</div><div class="section-copy">Experimentează cu dimensiunea unui bloc de studiu, numărul de repetiții și dificultatea. Vezi separat ce ajută și ce obosește memoria.</div>'
    + '<div class="slider-grid">'
    + '<div class="slider-card"><label><span>Bloc de studiu</span><strong>' + play.chunk + ' idei</strong></label><input type="range" min="1" max="8" value="' + play.chunk + '" data-playground-subject="' + subjectKey + '" data-playground-field="chunk"></div>'
    + '<div class="slider-card"><label><span>Repetiții</span><strong>' + play.repetition + ' treceri</strong></label><input type="range" min="1" max="6" value="' + play.repetition + '" data-playground-subject="' + subjectKey + '" data-playground-field="repetition"></div>'
    + '<div class="slider-card"><label><span>Dificultate</span><strong>' + play.difficulty + '%</strong></label><input type="range" min="20" max="95" value="' + play.difficulty + '" data-playground-subject="' + subjectKey + '" data-playground-field="difficulty"></div>'
    + '<div class="slider-card"><label><span>Scenariu</span><strong>Capitol înainte de examen</strong></label><div class="section-copy" style="font-size:.82rem;">Dacă pui prea multe idei într-un bloc mare, înțelegerea scade chiar dacă petreci mai mult timp.</div></div>'
    + '</div>'
    + '<div class="playground-stage"><div class="decompose-steps"><div class="decompose-step"><span class="step-no">1</span><strong>Fragmentare</strong><p class="section-copy" style="font-size:.82rem;">Mai puține idei pe bloc înseamnă mai puțină încărcare mentală.</p></div><div class="decompose-step"><span class="step-no">2</span><strong>Repetiție</strong><p class="section-copy" style="font-size:.82rem;">Fiecare revenire întărește traseul până când informația devine familiară.</p></div><div class="decompose-step"><span class="step-no">3</span><strong>Aplicare</strong><p class="section-copy" style="font-size:.82rem;">Retenția bună apare când blocul e clar, iar dificultatea rămâne gestionabilă.</p></div></div>'
    + '<div class="playground-bars"><div class="play-bar"><div class="play-bar-label">Claritate</div><div class="play-bar-visual" style="height:' + Math.max(70, clarity * 2) + 'px;background:linear-gradient(180deg,var(--blue),color-mix(in srgb,var(--blue) 56%, black));"></div><div class="play-bar-value">' + clarity + '%</div></div><div class="play-bar"><div class="play-bar-label">Retenție</div><div class="play-bar-visual" style="height:' + Math.max(70, retention * 2) + 'px;"></div><div class="play-bar-value">' + retention + '%</div></div><div class="play-bar"><div class="play-bar-label">Supraîncărcare</div><div class="play-bar-visual" style="height:' + Math.max(70, overload * 2) + 'px;background:linear-gradient(180deg,var(--red),color-mix(in srgb,var(--red) 56%, black));"></div><div class="play-bar-value">' + overload + '%</div></div></div>'
    + '<div class="scenario-callout"><strong>Exemplu concret</strong><p>Dacă înveți un capitol greu într-un singur bloc mare, supraîncărcarea crește și reții mai puțin. Dacă îl spargi în 3-4 idei și revii de câteva ori, crește claritatea și retenția, chiar dacă timpul total rămâne similar.</p></div></div></div>';
}

function renderInteractiveLearningStudio(subjectKey, subject, allPres) {
  const summaryCount = allPres.length;
  const hasGenerated = summaryCount > 0;
  const subjectHint = subject.desc || subject.full || subject.name;
  const exampleText = hasGenerated
    ? 'Ai deja ' + summaryCount + ' rezumate sau prezentări pentru această materie. Folosește-le ca sursă pentru quiz, cards și explorarea vizuală.'
    : 'Nu ai încă un rezumat generat. După primul material, această zonă devine punctul central pentru explicații stratificate și exemple reale.';

  return '<div id="learningStudioZone">'
    + '<section class="learning-studio anim-d1">'
    + '<div class="studio-grid">'
    + '<div><div class="section-kicker">Interactive Learning</div><div class="section-title">Înțelege materia în straturi, nu într-un bloc de text</div><div class="section-copy">Zona aceasta explică mai clar la ce folosește platforma pentru materia curentă și te pregătește pentru rezumatul interactiv. Fiecare card poate fi deschis separat, astfel încât utilizatorul să nu fie copleșit.</div>'
    + '<div class="layer-stack">'
    + '<div class="layer-card"><details open><summary><span>Imagine rapidă a materiei</span><span class="detail-chevron">›</span></summary><p class="section-copy" style="margin-top:12px;">' + escapeHtml(subjectHint) + '. Începe cu ideea simplă: ce problemă rezolvă această materie și unde apare ea în practică.</p></details></div>'
    + '<div class="layer-card"><details><summary><span>Întrebări care te ghidează</span><span class="detail-chevron">›</span></summary><p class="section-copy" style="margin-top:12px;">Ce se schimbă, ce rămâne constant și ce variabile controlezi? Aceste întrebări fac legătura dintre rezumat, grafic și quiz.</p></details></div>'
    + '<div class="layer-card"><details><summary><span>Semnale pentru concepte abstracte</span><span class="detail-chevron">›</span></summary><p class="section-copy" style="margin-top:12px;">Când apare un termen vag sau o relație greu de imaginat, platforma îl mută spre exemplu concret, comparație și vizualizare.</p></details></div>'
    + '</div><div class="concept-chips"><span class="concept-chip">Summary first</span><span class="concept-chip">Example driven</span><span class="concept-chip">Quiz ready</span><span class="concept-chip">Visual breakdown</span></div></div>'
    + '<div><div class="section-kicker">Studio</div><div class="section-title">Ce se întâmplă mai departe</div><div class="example-stack"><div class="example-card"><details open><summary><span>1. Generezi un rezumat ghidat</span><span class="detail-chevron">›</span></summary><p class="section-copy" style="margin-top:12px;">Rezumatul este împărțit pe niveluri: idee simplă, explicație conceptuală, formulă sau mecanism, plus exemple și greșeli frecvente.</p></details></div><div class="example-card"><details><summary><span>2. Explorezi un scenariu real</span><span class="detail-chevron">›</span></summary><p class="section-copy" style="margin-top:12px;">Ajustezi variabile și vezi rezultatul imediat, ca să înțelegi cauza și efectul înainte de memorare.</p></details></div><div class="example-card"><details><summary><span>3. Treci în memorare și testare</span><span class="detail-chevron">›</span></summary><p class="section-copy" style="margin-top:12px;">După clarificare, același material poate fi transformat în flashcards și quiz-uri fără să schimbi contextul.</p></details></div></div><div class="scenario-callout"><strong>Context pentru această materie</strong><p>' + escapeHtml(exampleText) + '</p></div></div>'
    + '</div></section>'
    + renderLearningPlayground(subjectKey, subject)
    + '</div>';
}

// =============================================
// ONBOARDING — prima utilizare, nicio materie
// =============================================
function renderOnboarding() {
  let html = '';

  // Hero onboarding
  html += '<div style="text-align:center;padding:48px 20px 32px;">';
  html += '<div style="margin-bottom:16px;">' + iconBadge('graduation','','lg') + '</div>';
  html += '<div style="font-family:Syne,sans-serif;font-size:2rem;font-weight:800;margin-bottom:8px;">Bun venit la Study Hub!</div>';
  html += '<div style="color:var(--text-secondary);font-size:1rem;max-width:480px;margin:0 auto;">Platforma ta AI-powered pentru studiu. Începe prin a-ți adăuga materiile.</div>';
  html += '</div>';

  // API Config first — important
  html += '<details class="api-config anim anim-d1" ' + (state.apiKey ? '' : 'open') + ' style="margin-bottom:24px;">';
  html += '<summary>' + icon('key','xs') + ' ' + (state.apiKey ? '[OK] API Anthropic configurat' : 'Pasul 1 — Configurează API Anthropic (pentru AI)') + '</summary>';
  html += '<p style="font-size:.82rem;color:var(--text-secondary);margin-top:10px;">API key-ul e necesar pentru AI Tutor, Quiz, Flashcards și prezentări. Obțin gratuit de la <a href="https://console.anthropic.com/settings/keys" target="_blank" style="color:var(--accent);">console.anthropic.com</a>.</p>';
  html += '<div class="api-row"><input type="password" class="api-inp" id="apiKeyInput" placeholder="configurat automat de server" value="' + (state.apiKey || '') + '">';
  html += '<button class="api-save" data-dashboard-action="save-api">Salvează</button></div>';
  html += '<div class="api-status" id="apiStatus"></div></details>';

  // Optiuni onboarding
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-bottom:32px;" class="anim anim-d2">';

  // Optiunea 1: Adauga manual
  html += '<div style="background:var(--bg-raised);border:2px solid var(--accent-border);border-radius:var(--radius);padding:28px 24px;text-align:center;cursor:pointer;transition:all .2s;" data-dashboard-action="open-subject-manager" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--accent-border)\'">';
  html += '<div style="margin-bottom:12px;">' + iconBadge('plus','muted','lg') + '</div>';
  html += '<div style="font-weight:700;font-size:1.05rem;margin-bottom:6px;">Adaugă materiile tale</div>';
  html += '<div style="font-size:.82rem;color:var(--text-secondary);">Creează materii personalizate cu icon, culoare și descriere proprie. Recomandat dacă nu ești la ASE.</div>';
  html += '<div style="margin-top:16px;padding:10px 20px;background:var(--accent);color:#fff;border-radius:var(--radius-sm);font-weight:600;font-size:.88rem;display:inline-block;">Adaugă materie →</div>';
  html += '</div>';

  // Optiunea 2: Import ASE template
  html += '<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);padding:28px 24px;text-align:center;cursor:pointer;transition:all .2s;" data-dashboard-action="import-ase" onmouseover="this.style.borderColor=\'var(--border-hover)\'" onmouseout="this.style.borderColor=\'var(--border)\'">';
  html += '<div style="margin-bottom:12px;">' + iconBadge('building','','lg') + '</div>';
  html += '<div style="font-weight:700;font-size:1.05rem;margin-bottom:6px;">Importă template ASE</div>';
  html += '<div style="font-size:.82rem;color:var(--text-secondary);">Pornește cu materiile ASE pre-configurate (MAP, Python & ML, Banking, Econometrie, MCCP). Le poți edita sau șterge după.</div>';
  html += '<div style="margin-top:16px;padding:10px 20px;background:var(--bg-overlay);color:var(--text-secondary);border-radius:var(--radius-sm);font-weight:600;font-size:.88rem;border:1px solid var(--border);display:inline-block;">Import template →</div>';
  html += '</div>';

  html += '</div>';

  // Features preview
  html += '<div class="anim anim-d3" style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);padding:24px;">';
  html += '<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:16px;">Ce poți face cu Study Hub</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;">';
  const features = [
    ['robot', 'AI Tutor', 'Chat cu Claude per materie'],
    ['chart', 'Prezentări AI', 'Din PDF/DOCX/TXT'],
    ['brain', 'Quiz Mode', 'Grile generate AI'],
    ['cards', 'Flashcards', 'Spaced repetition'],
    ['map', 'Mind Map AI', 'Hărți conceptuale'],
    ['graduation', 'Exam Sim', 'Sesiune cronometrată'],
    ['calendar', 'Calendar', 'Countdown examene'],
    ['trophy', 'XP & Streak', 'Gamification'],
  ];
  features.forEach(([iconName, name, desc]) => {
    const iconHtml = ICONS[iconName] ? `<span class="icon icon-md" style="color:var(--accent)">${ICONS[iconName]}</span>` : iconName;
    html += '<div style="padding:12px;background:var(--bg-surface);border-radius:var(--radius-sm);text-align:center;">';
    html += '<div style="margin-bottom:6px;">' + iconHtml + '</div>';
    html += '<div style="font-weight:600;font-size:.82rem;">' + name + '</div>';
    html += '<div style="font-size:.7rem;color:var(--text-muted);margin-top:2px;">' + desc + '</div>';
    html += '</div>';
  });
  html += '</div></div>';

  return html;
}

// Import template ASE (cele 5 materii default)
function importASETemplate() {
  if (!confirm('Importezi materiile ASE (MAP, Python & ML, Banking, Econometrie, MCCP)? Le poți edita sau șterge după.')) return;
  state.customSubjects = JSON.parse(JSON.stringify(DEFAULT_SUBJECTS));
  SUBJECTS = getSubjects();
  saveState();
  renderSidebar();
  renderPage();
  showToast('[OK] 5 materii ASE importate! Le poți edita din Settings');
}
function renderDailyGoals() {
  return '';
}

// ── Finance Lab interactive studio ──

// Prevent nested scroll areas from pushing scroll into the main page on Safari/trackpads.
document.addEventListener('wheel', function(e) {
  if (e.ctrlKey) return;
  if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;

  var scrollParent = e.target.closest('.sidebar-nav, .chat-messages, .mentor-messages, .slide.active, .pres-viewer-slide.active, #cmdResults, .notif-list');
  if (!scrollParent) return;

  var canScroll = scrollParent.scrollHeight > scrollParent.clientHeight + 1;
  if (!canScroll) {
    e.preventDefault();
    return;
  }

  var atTop = scrollParent.scrollTop <= 0;
  var atBottom = scrollParent.scrollTop + scrollParent.clientHeight >= scrollParent.scrollHeight - 1;

  if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
    e.preventDefault();
  }
}, { passive: false });

function renderDashboard(element) {
  // Show skeleton while fetching concept stats
  element.innerHTML = '<div class="anim"><div class="dash-skeleton"></div></div>';

  authFetch('/api/concepts/stats')
    .then(function(res) { return res.json(); })
    .then(function(stats) {
      _renderDashboardWithStats(element, stats);
    })
    .catch(function() {
      _renderDashboardWithStats(element, null);
    });
}

function _renderWindowStep(n, label, time, active, last) {
  return '<div class="dw-step' + (last ? ' last' : '') + '">'
    + '<div class="dw-step-dot' + (active ? ' active' : '') + '">' + n + '</div>'
    + '<div class="dw-step-body">'
    + '<span class="dw-step-label' + (active ? ' active' : '') + '">' + escapeHtml(label) + '</span>'
    + '<span class="dw-step-time">' + escapeHtml(time) + '</span>'
    + '</div>'
    + (!last ? '<div class="dw-step-line"></div>' : '')
    + '</div>';
}

// colorToken: 'accent' | 'blue' | 'green' | 'purple'
function _renderWindowTool(title, sub, colorToken, iconName, navTab) {
  return '<div class="dw-tool dw-tool--' + colorToken + (navTab ? '" data-nav-tab="' + navTab + '" style="cursor:pointer"' : '"') + '>'
    + '<div class="dw-tool-head">'
    + '<div class="dw-tool-icon">' + icon(iconName, 'xs') + '</div>'
    + '<div class="dw-tool-info"><div class="dw-tool-name">' + escapeHtml(title) + '</div><div class="dw-tool-sub">' + escapeHtml(sub) + '</div></div>'
    + '<div class="dw-tool-empty">gol</div>'
    + '</div>'
    + '<div class="dw-tool-bars">'
    + '<div class="dw-tool-bar" style="width:86%"></div>'
    + '<div class="dw-tool-bar" style="width:64%"></div>'
    + '<div class="dw-tool-bar" style="width:72%"></div>'
    + '<div class="dw-tool-bar" style="width:50%"></div>'
    + '</div>'
    + '</div>';
}

// ── Collect all user-generated presentations across subjects ──
function _getAllRecentSummaries() {
  var result = [];
  var subjects = getSubjects();
  var pres = state.presentations || {};
  for (var key in pres) {
    var arr = pres[key] || [];
    // getAllPresentations returns [...builtins, ...userGenerated]
    // so user-generated idx in getAllPresentations = builtins.length + userIdx
    var builtinCount = (typeof BUILTIN_PRESENTATIONS !== 'undefined' && BUILTIN_PRESENTATIONS[key])
      ? BUILTIN_PRESENTATIONS[key].length : 0;
    arr.forEach(function(p, userIdx) {
      result.push({ key: key, idx: builtinCount + userIdx, pres: p, subject: subjects[key] });
    });
  }
  // Sort by newest first (presentations don't have timestamps, so use array order reversed)
  result.reverse();
  return result;
}

// ── Recent summaries section for the returning user dashboard ──
function _renderRecentSummaries() {
  var all = _getAllRecentSummaries();
  if (!all.length) return '';

  var recent = all.slice(0, 3);
  var html = '<div class="dash-summaries-section">';
  html += '<div class="dash-section-header">'
    + '<span class="dash-section-label">' + icon('layers2','xs') + ' Rezumate recente</span>'
    + '<button class="dash-section-link" data-nav-tab="study-tools">Toate →</button>'
    + '</div>';

  recent.forEach(function(item) {
    var subj = item.subject;
    var p = item.pres;
    // Build preview text from slides
    var previewText = '';
    if (p.slides && p.slides.length) {
      var firstSlide = p.slides[0];
      // Strip HTML tags
      previewText = (firstSlide.content || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 220);
      if (previewText.length === 220) previewText += '…';
    }
    // Build full content (all slides as sections)
    var fullHtml = '';
    if (p.slides && p.slides.length) {
      p.slides.forEach(function(slide) {
        fullHtml += '<div class="dsum-slide">';
        if (slide.tag) fullHtml += '<div class="dsum-slide-tag">' + escapeHtml(slide.tag) + '</div>';
        if (slide.title) fullHtml += '<div class="dsum-slide-title">' + escapeHtml(slide.title) + '</div>';
        fullHtml += '<div class="dsum-slide-body">' + (slide.content || '') + '</div>';
        fullHtml += '</div>';
      });
    }

    var cardId = 'dsum_' + item.key + '_' + item.idx;
    var subjLabel = subj ? (subj.icon || '') + ' ' + subj.name : item.key;

    html += '<div class="dash-summary-card" id="' + cardId + '" data-dsum-key="' + escapeHtml(item.key) + '" data-dsum-idx="' + item.idx + '">';
    html += '<div class="dsum-head" data-dsum-toggle="' + cardId + '">';
    html += '<span class="dsum-subject-badge">' + subjLabel + '</span>';
    html += '<span class="dsum-title">' + escapeHtml(p.title || 'Rezumat') + '</span>';
    html += '<span class="dsum-chevron" id="' + cardId + '_chev">▼</span>';
    html += '</div>';
    if (previewText) {
      html += '<p class="dsum-preview" id="' + cardId + '_prev">' + escapeHtml(previewText) + '</p>';
    }
    html += '<div class="dsum-body" id="' + cardId + '_body" style="display:none">' + fullHtml + '</div>';
    html += '<div class="dsum-actions" id="' + cardId + '_acts" style="display:none">';
    html += '<button class="dsum-open-full" data-dsum-open-key="' + escapeHtml(item.key) + '" data-dsum-open-idx="' + item.idx + '">' + icon('layers2','xs') + ' Deschide complet</button>';
    html += '</div>';
    html += '</div>';
  });

  html += '</div>';
  return html;
}

// ── Quick AI Mentor widget for the dashboard ──
function _renderDashMentorWidget() {
  var history = state.mentorHistory || [];
  var lastMsg = history.filter(function(m) { return m.role === 'assistant'; }).slice(-1)[0];
  var html = '<div class="dash-mentor-widget">';
  html += '<div class="dash-section-header" style="margin-bottom:10px;">'
    + '<span class="dash-section-label">' + icon('robot','xs') + ' AI Mentor</span>'
    + '<button class="dash-section-link" data-nav-tab="mentor">Deschide chat →</button>'
    + '</div>';
  if (lastMsg) {
    html += '<div class="dmw-last-reply">'
      + '<div class="dmw-last-label">Ultimul răspuns</div>'
      + '<div class="dmw-last-text">' + formatAIText(lastMsg.content.substring(0, 180) + (lastMsg.content.length > 180 ? '…' : '')) + '</div>'
      + '</div>';
  }
  html += '<div class="dmw-input-row">';
  html += '<input class="dmw-input" id="dashMentorInput" type="text" placeholder="Pune o întrebare rapidă…" autocomplete="off">';
  html += '<button class="dmw-send-btn" id="dashMentorSend">' + icon('robot','xs') + ' Trimite</button>';
  html += '</div>';
  html += '</div>';
  return html;
}

function _renderDashboardWithStats(element, stats) {
  const hasContent   = stats && stats.total > 0;
  const dueToday     = (stats && stats.dueToday) || 0;
  const weakCount    = (stats && stats.weak) || 0;
  const streak       = (stats && stats.streak) || 0;
  const level        = (stats && stats.level) || { level: 1, xp: 0, label: 'Beginner', progress: 0 };

  let html = '<div class="anim">';

  if (!hasContent) {
    // ── STATE 1: new user — "Fereastra" design ───────────────────
    const userName = (state.userProfile && state.userProfile.displayName) || 'Student';

    html += '<div class="dash-window">'
      + '<div class="dash-window-bg"></div>'
      + '<div class="dash-window-wash"></div>'
      + '<div class="dash-window-glow"></div>'
      + '<div class="dash-window-inner">'

      // ── Hero glass card ──
      + '<div class="dw-hero">'
      + '<div class="dw-badge"><span class="dw-badge-dot"></span>Ziua 1 · cont nou</div>'
      + '<div class="dw-title">Bună, ' + escapeHtml(userName) + '. Aici începe <span class="dw-accent">sesiunea</span>.</div>'
      + '<p class="dw-desc">Platforma nu știe încă nimic despre tine. Urcă un curs și vei avea rezumat, quiz, flashcards și un tutor care îl citește cu tine.</p>'

      // ── Upload + steps row ──
      + '<div class="dw-grid">'

      // Upload zone
      + '<div class="dw-upload-zone" data-nav-tab="study-tools">'
      + '<div class="dw-pdf-icon">'
      + '<div class="dw-pdf-shadow"></div>'
      + '<div class="dw-pdf-card">'
      + '<div class="dw-pdf-line"></div>'
      + '<div class="dw-pdf-line" style="width:70%"></div>'
      + '<div class="dw-pdf-line" style="width:80%"></div>'
      + '<span class="dw-pdf-tag">PDF</span>'
      + '</div>'
      + '</div>'
      + '<div class="dw-upload-body">'
      + '<div class="dw-upload-title">Trage primul curs aici.</div>'
      + '<p class="dw-upload-sub">PDF, DOCX, PPTX sau text lipit. ~30 secunde.</p>'
      + '<div class="dw-upload-row">'
      + '<button class="dw-btn-primary" data-nav-tab="study-tools">Alege fișier</button>'
      + '<button class="dw-btn-ghost" data-nav-tab="study-tools">curs demo</button>'
      + '</div>'
      + '</div>'
      + '</div>'

      // Session steps
      + '<div class="dw-steps-card">'
      + '<div class="dw-steps-kicker">Prima sesiune · 20 min</div>'
      + _renderWindowStep(1, 'Urcă un curs', '1 min', true, false)
      + _renderWindowStep(2, 'Citește rezumatul', '5 min', false, false)
      + _renderWindowStep(3, 'Dă un quiz', '8 min', false, false)
      + _renderWindowStep(4, 'Salvează 10 cartonașe', '6 min', false, true)
      + '</div>'
      + '</div>'
      + '</div>'

      // ── Bottom 4 tool preview cards ──
      + '<div class="dw-tools">'
      + _renderWindowTool('Rezumat', '3 niveluri', 'accent', 'layers2', 'study-tools')
      + _renderWindowTool('Quiz', 'grilă · A/F', 'blue', 'brain', 'quiz')
      + _renderWindowTool('Flashcards', 'spaced repetition', 'green', 'cards', 'flashcards')
      + _renderWindowTool('AI Mentor', 'știe cursul tău', 'purple', 'robot', 'mentor')
      + '</div>'

      + '</div>'
      + '</div>';
  } else {
    // ── STATE 2: returning user — show due concepts ───────────────
    const dueLabel  = dueToday === 1 ? '1 concept' : `${dueToday} concepte`;
    const weakLabel = weakCount > 0 ? `${weakCount} concepte slabe` : null;
    const streakTxt = streak > 0 ? `🔥 ${streak} zile consecutiv` : '';

    html += `
      <div class="dash-hero dash-hero--returning">
        <div class="dash-hero-content">
          ${streakTxt ? `<div class="dash-hero-eyebrow">${streakTxt}</div>` : ''}
          <h1 class="dash-hero-title">
            ${dueToday > 0
              ? `Ai <span class="dash-due-num">${dueLabel}</span> de revizuit azi`
              : 'Ești la zi cu revizuirile! 🎉'}
          </h1>
          ${weakLabel ? `<p class="dash-hero-sub">${weakLabel} au nevoie de atenție extra.</p>` : ''}
          <div class="dash-level-row">
            <span>Nivel ${level.level} · ${level.label}</span>
            <div class="dash-xp-bar"><div class="dash-xp-fill" style="width:${level.progress || 0}%"></div></div>
            <span>${level.xp} XP</span>
          </div>
        </div>

        <div class="dash-session-card">
          ${dueToday > 0 ? `
            <div class="dash-session-count">
              <span class="dash-session-num">${dueToday}</span>
              <span class="dash-session-label">concepte de revizuit</span>
            </div>
            ${weakCount > 0 ? `<div class="dash-weak-hint">${weakCount} concepte slabe incluse</div>` : ''}
            <button class="dash-cta-primary" data-nav-tab="session">Continuă să înveți →</button>
          ` : `
            <div class="dash-done-msg">✅ Toate conceptele sunt la zi</div>
            <div class="dash-done-sub">Revino mâine pentru noile recapitulări</div>
          `}
          <button class="dash-cta-ghost" data-nav-tab="study-tools">+ Încarcă document nou</button>
        </div>
      </div>`;
  }

  // ── COMPACT TOOLS (only for returning users — new user gets the window design tools) ──
  if (hasContent) {
    const dueFC = (typeof getFlashcardsDueCount === 'function') ? getFlashcardsDueCount() : 0;
    html += `
    <div class="dash-tools-row">
      <div class="dash-tool-item" data-nav-tab="quiz">
        <span>🧩</span><span>Quiz</span>
      </div>
      <div class="dash-tool-item" data-nav-tab="flashcards">
        <span>🃏</span><span>Flashcards${dueFC > 0 ? ' <b>'+dueFC+'</b>' : ''}</span>
      </div>
      <div class="dash-tool-item" data-nav-tab="mentor">
        <span>🤖</span><span>AI Mentor</span>
      </div>
      <div class="dash-tool-item" data-nav-tab="stats">
        <span>📊</span><span>Statistici</span>
      </div>
      <div class="dash-tool-item" data-nav-tab="finance">
        <span>📈</span><span>Finance Lab</span>
      </div>
    </div>`;

    // Recent summaries + mentor widget
    html += _renderRecentSummaries();
    html += _renderDashMentorWidget();
  }

  html += '</div>';
  element.innerHTML = html;

  // Toggle full-bleed page mode for the "Fereastra" empty state
  var pageEl = document.getElementById('pageContent');
  if (pageEl) {
    if (!hasContent) {
      pageEl.classList.add('page--dash-window');
    } else {
      pageEl.classList.remove('page--dash-window');
    }
  }

  setupDashboardPageInteractions(element);
}

function _renderDashboardOld(element) {
  const subjects = getSubjects();
  const hasSubjects = Object.keys(subjects).length > 0;

  let html = '<div class="anim">';

  if (!hasSubjects) {
    html += renderOnboarding();
    html += '</div>';
    element.innerHTML = html;
    return;
  }

  // ── API KEY BANNER (dacă nu e setat) ──────
  if (false) {
    html += '<div class="api-key-banner">';
    html += '<div style="width:38px;height:38px;border-radius:10px;background:var(--accent-muted);color:var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + icon('key','sm') + '</div>';
    html += '<div class="api-key-banner-text">';
    html += '<div class="api-key-banner-title">Conectează Claude AI pentru a debloca toate funcționalitățile</div>';
    html += '<div class="api-key-banner-sub">Quiz, Flashcards AI, Prezentări, Mind Maps și Mentor necesită un API key Anthropic gratuit.</div>';
    html += '</div>';
    html += '<button class="api-key-banner-btn" data-nav-tab="settings">' + icon('key','xs') + ' Configurează</button>';
    html += '</div>';
  }

  // ── DAILY SESSION WIDGET ─────────────────────
  if (typeof renderDailySessionWidget === 'function') {
    html += renderDailySessionWidget();
  }

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Bun venit în sesiunea de studiu de azi' : hour < 18 ? 'Continuă sesiunea cu claritate' : 'Închide ziua cu o recapitulare bună';
  const streak = state.streak || 0;

  html += '<section class="clarity-hero">';
  html += '<div>';
  html += '<div class="clarity-label">' + icon('sparkle','xs') + ' Learning Platform</div>';
  html += '<div class="clarity-title">' + greet + '</div>';
  html += '<p class="clarity-copy">Study Hub este construit pentru patru lucruri foarte clare: rezumate structurate, flashcards, quiz-uri și învățare interactivă. Totul pornește din materia ta și se transformă în explicații mai ușor de înțeles.</p>';
  html += '<div class="clarity-actions" style="margin-top:18px;">';
  html += '<button class="summary-gen-btn" data-dashboard-action="open-subject-manager">' + icon('plus','xs') + ' Adaugă materie</button>';
  html += '<button class="quiz-nav-btn primary" data-nav-tab="quiz">' + icon('brain','xs') + ' Începe un quiz</button>';
  html += '</div>';
  html += '<div class="clarity-pill-row" style="margin-top:18px;">';
  html += '<div class="clarity-pill">' + icon('layers2','xs') + '<span>Rezumate explicate pe niveluri</span></div>';
  html += '<div class="clarity-pill">' + icon('cards','xs') + '<span>Memorie activă cu revizuire</span></div>';
  html += '<div class="clarity-pill">' + icon('chart','xs') + '<span>Grafice explorabile și scenarii reale</span></div>';
  html += '</div>';
  html += '</div>';
  html += '<div class="insight-shell" style="padding:22px;">';
  html += '<div class="section-kicker">Ce poți face aici</div>';
  html += renderProductIdentityCards();
  html += '</div>';
  html += '</section>';

  // ── STREAK / GAMIFICATION BAR ─────────────
  const totalTodos = Object.values(state.todos).flat().length;
  const doneTodos  = Object.values(state.todos).flat().filter(t => t.done).length;
  const dueFC      = getFlashcardsDueCount();
  const nextExam   = (state.exams||[]).filter(e=>new Date(e.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date))[0];
  const avgQ = (() => { const all=Object.values(state.quizHistory||{}).flat(); return all.length?Math.round(all.reduce((a,r)=>a+(r.score/r.total)*100,0)/all.length):null; })();
  const xpForLevel = (state.level || 1) * 50;
  const xpPct = Math.min(100, Math.round(((state.xp||0) % xpForLevel) / xpForLevel * 100));

  html += '<div class="dash-streak-bar">';
  // Streak
  html += '<div class="dsb-item">';
  html += '<span style="color:' + (streak>=7?'var(--amber)':streak>0?'var(--accent)':'var(--text-muted)') + '">' + icon('trending','xs') + '</span>';
  html += '<div><div class="dsb-val" style="color:' + (streak>=7?'var(--amber)':streak>0?'var(--accent)':'var(--text-muted)') + '">' + streak + ' zile</div><div class="dsb-label">Streak</div></div>';
  html += '</div>';
  html += '<div class="dsb-divider"></div>';
  // Level + XP bar
  html += '<div class="dsb-item" style="gap:10px;">';
  html += '<div style="width:30px;height:30px;border-radius:8px;background:var(--accent-muted);color:var(--accent);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:.72rem;font-weight:700;">L' + (state.level||1) + '</div>';
  html += '<div class="dsb-xp-bar"><div style="font-size:.72rem;color:var(--text-secondary);font-family:var(--font-mono);">' + (state.xp||0) + ' XP</div><div class="dsb-xp-track"><div class="dsb-xp-fill" style="width:' + xpPct + '%"></div></div></div>';
  html += '</div>';
  html += '<div class="dsb-divider"></div>';
  // Quiz avg
  if (avgQ !== null) {
    html += '<div class="dsb-item"><span style="color:var(--green)">' + icon('trending','xs') + '</span><div><div class="dsb-val" style="color:var(--green)">' + avgQ + '%</div><div class="dsb-label">Quiz avg</div></div></div>';
    html += '<div class="dsb-divider"></div>';
  }
  // Tasks
  const progPct = totalTodos ? Math.round(doneTodos/totalTodos*100) : 0;
  html += '<div class="dsb-item"><span style="color:var(--accent)">' + icon('check_circle','xs') + '</span><div><div class="dsb-val" style="color:var(--accent)">' + progPct + '%</div><div class="dsb-label">Tasks (' + doneTodos + '/' + totalTodos + ')</div></div></div>';
  // Flashcards due
  if (dueFC > 0) {
    html += '<div class="dsb-divider"></div>';
    html += '<div class="dsb-item clickable" data-nav-tab="flashcards" style="cursor:pointer;"><span style="color:var(--amber)">' + icon('cards','xs') + '</span><div><div class="dsb-val" style="color:var(--amber)">' + dueFC + '</div><div class="dsb-label">De revizuit</div></div></div>';
  }
  // Next exam
  if (nextExam) {
    const examDays = Math.round((new Date(nextExam.date)-new Date())/86400000);
    html += '<div class="dsb-divider"></div>';
    html += '<div class="dsb-item clickable" data-nav-tab="calendar" style="cursor:pointer;margin-left:auto;"><span style="color:' + (examDays<=3?'var(--red)':'var(--blue)') + '">' + icon('calendar','xs') + '</span><div><div class="dsb-val" style="color:' + (examDays<=3?'var(--red)':'var(--blue)') + '">' + examDays + 'z</div><div class="dsb-label" style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(nextExam.name) + '</div></div></div>';
  }
  html += '</div>';

  html += '<div class="summary-deck">';
  html += '<div class="section-kicker">Flux recomandat</div>';
  html += '<div class="section-title">Înțelege mai întâi, apoi memorizează și testează</div>';
  html += '<div class="section-copy">Interfața nouă mută accentul dinspre listare de funcții spre un parcurs clar. Ai mereu un pas următor vizibil.</div>';
  html += renderDashboardNextSteps();
  html += '</div>';

  // ── HOW TO START (prima utilizare) ────────
  if (isFirstRun()) {
    html += '<div class="home-section-header" style="margin-top:0;">';
    html += '<div class="home-section-title">' + icon('sparkle','xs') + ' Cum începi</div>';
    html += '</div>';
    html += '<div class="how-to-start">';
    const steps = [
      { n:'01', icon:'settings', title:'Creează o materie', desc:'Adaugă materiile tale din universitate cu nume și descriere', color:'var(--accent)', bg:'var(--accent-muted)' },
      { n:'02', icon:'upload',   title:'Adaugă bibliografie', desc:'Încarcă PDF-uri, DOCX sau lipește text din cursuri', color:'var(--blue)', bg:'var(--blue-muted)' },
      { n:'03', icon:'sparkle',  title:'Generează cu AI', desc:'Creează rezumate, prezentări și flashcard-uri automat', color:'var(--green)', bg:'var(--green-muted)' },
      { n:'04', icon:'brain',    title:'Testează-te', desc:'Quiz-uri, simulări de examen și spaced repetition', color:'var(--purple)', bg:'var(--purple-muted)' },
    ];
    steps.forEach(s => {
      html += '<div class="hts-card" style="--hts-color:' + s.color + ';--hts-bg:' + s.bg + '">';
      html += '<div class="hts-step">Pas ' + s.n + '</div>';
      html += '<div class="hts-icon">' + icon(s.icon,'sm') + '</div>';
      html += '<div class="hts-title">' + s.title + '</div>';
      html += '<div class="hts-desc">' + s.desc + '</div>';
      html += '</div>';
    });
    html += '</div>';
    // Demo banner subtil
    html += '<div style="background:var(--amber-muted);border:1px solid rgba(245,166,35,.25);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:20px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">';
    html += '<div style="font-size:.82rem;color:var(--text-secondary);flex:1;">' + icon('alert','xs') + ' Acestea sunt <strong style="color:var(--amber)">materii demo</strong> — personalizează sau înlocuiește-le cu ale tale.</div>';
    html += '<button data-dashboard-action="open-subject-manager" style="padding:5px 12px;background:var(--amber);color:#fff;border:none;border-radius:var(--radius-xs);font-weight:600;font-size:.75rem;cursor:pointer;white-space:nowrap;">Personalizează</button>';
    html += '</div>';
  }

  // ── DAILY GOALS ───────────────────────────
  html += renderDailyGoals();

  // ── MATERII PE GRUPE ──────────────────────
  html += '<div class="home-section-header">';
  html += '<div class="home-section-title">' + icon('book','sm') + ' Materiile mele</div>';
  html += '<button class="home-section-action" data-dashboard-action="open-subject-manager">' + icon('settings','xs') + ' Gestionează</button>';
  html += '</div>';

  const groups = getSubjectGroupsForDisplay(subjects);
  groups.forEach(group => {
    html += '<div class="subject-group">';
    html += '<div class="subject-group-label">';
    html += '<span class="subject-group-name">' + icon('layers','xs') + ' ' + escapeHtml(group.name) + '</span>';
    html += '<button class="subject-group-edit" data-group-edit="' + group.id + '">' + icon('edit','xs') + ' Redenumește</button>';
    html += '</div>';
    html += '<div class="subject-group-grid">';

    group.keys.forEach(key => {
      const subj = subjects[key];
      if (!subj) return;
      const theme = getSubjectTheme(subj);
      const todos = state.todos[key] || [];
      const done  = todos.filter(t => t.done).length;
      const pct   = todos.length ? Math.round(done/todos.length*100) : 0;
      const pres  = getAllPresentations(key).length;
      const fcCount = (state.flashcardDecks && state.flashcardDecks[key] || []).length;
      const qCount = (state.quizHistory && state.quizHistory[key] || []).length;

      html += '<div class="home-subj-card" data-subject-nav="' + key + '" style="--subj-accent:' + theme.accent + ';--subj-border:' + theme.border + '">';
      // Top: icon + percent
      html += '<div class="home-subj-top">';
      html += subjectIconBadge(subj, 32);
      if (pct > 0) html += '<span style="font-family:var(--font-mono);font-size:.7rem;font-weight:700;color:' + theme.accent + '">' + pct + '%</span>';
      html += '</div>';
      // Name
      html += '<div>';
      html += '<div class="home-subj-name">' + escapeHtml(subj.name) + '</div>';
      html += '<div class="home-subj-meta" style="margin-top:2px;">' + escapeHtml(subj.desc ? subj.desc.split(',')[0] : '') + '</div>';
      html += '</div>';
      // Stats row
      html += '<div class="home-subj-stats">';
      html += '<span class="home-subj-stat">' + icon('layers','xs') + ' ' + pres + ' prez</span>';
      if (fcCount) html += '<span class="home-subj-stat">' + icon('cards','xs') + ' ' + fcCount + '</span>';
      if (qCount) html += '<span class="home-subj-stat">' + icon('brain','xs') + ' ' + qCount + '</span>';
      html += '</div>';
      // Progress bar
      if (todos.length) {
        html += '<div class="home-subj-progress"><div class="home-subj-progress-fill" style="width:' + pct + '%;background:' + theme.accent + '"></div></div>';
      } else {
        html += '<div class="home-subj-progress"><div class="home-subj-progress-fill" style="width:0%;background:' + theme.accent + '"></div></div>';
      }
      html += '</div>';
    });

    html += '<div class="home-add-subj-card" data-dashboard-action="open-subject-manager">' + icon('plus','sm') + '<span>Adaugă materie</span></div>';
    html += '</div></div>';
  });

  // ── TOOLS AI ──────────────────────────────
  html += '<div class="home-section-header">';
  html += '<div class="home-section-title">' + icon('cpu','sm') + ' Tool-uri AI</div>';
  html += '</div>';

  const toolGroups = [
    {
      title: 'Învățare activă',
      copy: 'Treci din înțelegere în practică și feedback, fără să sari între ecrane fără context.',
      tools: [
        { tab:'quiz',        iconN:'brain',      color:'var(--accent)',  muted:'var(--accent-muted)',  border:'var(--accent-border)',  name:'Quiz Mode',      desc:'Grile generate din cursul tău' },
        { tab:'flashcards',  iconN:'cards',      color:'var(--blue)',    muted:'var(--blue-muted)',    border:'rgba(56,189,248,.22)', name:'Flashcards',     desc:'Spaced repetition · ' + (dueFC?'<span style="color:var(--amber);font-weight:700">'+dueFC+' scadente</span>':'0 scadente') },
        { tab:'mentor',      iconN:'robot',      color:'var(--accent)',  muted:'var(--accent-muted)',  border:'var(--accent-border)',  name:'AI Mentor',      desc:generateAutoInsightShort() },
        { tab:'examsim',     iconN:'graduation', color:'var(--purple)',  muted:'var(--purple-muted)',  border:'rgba(167,139,250,.22)',name:'Exam Simulator', desc:'Sesiune cronometrată cu feedback' }
      ]
    },
    {
      title: 'Planificare și insight',
      copy: 'Vezi imaginea de ansamblu, organizează sesiunea și urmărește progresul fără ecrane aglomerate.',
      tools: [
        { tab:'mindmap',      iconN:'map',      color:'var(--green)',  muted:'var(--green-muted)',   border:'rgba(16,217,160,.22)', name:'Mind Map AI',      desc:'Hărți conceptuale vizuale' },
        { tab:'calendar',     iconN:'calendar', color:'var(--red)',    muted:'var(--red-muted)',     border:'rgba(239,69,101,.22)', name:'Calendar Sesiune', desc:nextExam ? Math.round((new Date(nextExam.date)-new Date())/86400000)+'z · '+escapeHtml(nextExam.name) : 'Programează examene' },
        { tab:'stats',        iconN:'chart',    color:'var(--blue)',   muted:'var(--blue-muted)',    border:'rgba(56,189,248,.22)', name:'Statistici',       desc:'Progres detaliat & grafice' },
        { tab:'achievements', iconN:'trophy',   color:'var(--amber)',  muted:'var(--amber-muted)',   border:'rgba(245,166,35,.22)', name:'Realizări & XP',   desc:'Nivel '+(state.level||1)+' · '+(state.xp||0)+' XP total' }
      ]
    }
  ];

  html += '<div class="home-tools-shell">';
  toolGroups.forEach(function(group) {
    html += '<section class="home-tools-group">';
    html += '<div class="home-tools-head"><div><strong>' + group.title + '</strong><span>' + group.copy + '</span></div></div>';
    html += '<div class="home-tools-grid">';
    group.tools.forEach(function(t) {
      html += '<div class="home-tool-card" data-nav-tab="' + t.tab + '" style="--tool-border:' + t.border + ';--tool-muted:' + t.muted + '">';
      html += '<div class="home-tool-icon" style="background:' + t.muted + ';color:' + t.color + '">' + icon(t.iconN,'sm') + '</div>';
      html += '<div class="home-tool-copy"><div class="home-tool-name">' + t.name + '</div><div class="home-tool-desc">' + t.desc + '</div></div>';
      html += '</div>';
    });
    html += '</div></section>';
  });
  html += '</div>';

  html += '</div>';
  element.innerHTML = html;
  setupDashboardPageInteractions(element);
}  // end _renderDashboardOld

function _sendDashMentorMessage() {
  var input = document.getElementById('dashMentorInput');
  if (!input) return;
  var text = input.value.trim();
  if (!text) { navigateTo('mentor'); return; }
  state.pendingMentorMessage = text;
  saveState();
  navigateTo('mentor');
}

function setupDashboardPageInteractions(element) {
  if (element.__dashboardInteractionsBound) return;
  element.__dashboardInteractionsBound = true;

  element.addEventListener('click', function(e) {
    const actionEl = e.target.closest('[data-dashboard-action]');
    if (actionEl) {
      const action = actionEl.getAttribute('data-dashboard-action');
      if (action === 'open-subject-manager' || action === 'subjects') openSubjectManager();
      else if (action === 'quiz') navigateTo('quiz');
      else if (action === 'flashcards') navigateTo('flashcards');
      else if (action === 'save-api') saveApiKey();
      else if (action === 'import-ase') importASETemplate();
      return;
    }

    const tabEl = e.target.closest('[data-nav-tab]');
    if (tabEl) {
      navigateTo(tabEl.getAttribute('data-nav-tab'));
      return;
    }

    const subjectEl = e.target.closest('[data-subject-nav]');
    if (subjectEl) {
      navigateTo(subjectEl.getAttribute('data-subject-nav'));
      return;
    }

    const groupEl = e.target.closest('[data-group-edit]');
    if (groupEl) {
      editGroupName(groupEl.getAttribute('data-group-edit'));
    }

    // ── Summary card toggle ──
    const toggleEl = e.target.closest('[data-dsum-toggle]');
    if (toggleEl) {
      var cardId = toggleEl.getAttribute('data-dsum-toggle');
      var body = document.getElementById(cardId + '_body');
      var acts = document.getElementById(cardId + '_acts');
      var prev = document.getElementById(cardId + '_prev');
      var chev = document.getElementById(cardId + '_chev');
      var card = document.getElementById(cardId);
      if (!body) return;
      var isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'block';
      if (acts) acts.style.display = isOpen ? 'none' : 'flex';
      if (prev) prev.style.display = isOpen ? '' : 'none';
      if (chev) chev.textContent = isOpen ? '▼' : '▲';
      if (card) card.classList.toggle('dsum-open', !isOpen);
      return;
    }

    // ── Open full presentation viewer ──
    const openFullEl = e.target.closest('[data-dsum-open-key]');
    if (openFullEl) {
      var key = openFullEl.getAttribute('data-dsum-open-key');
      var idx = parseInt(openFullEl.getAttribute('data-dsum-open-idx'), 10);
      if (typeof openPresentationViewer === 'function') {
        openPresentationViewer(key, idx);
      }
      return;
    }

    // ── Dashboard quick mentor send ──
    const mentorSendEl = e.target.closest('#dashMentorSend');
    if (mentorSendEl) {
      _sendDashMentorMessage();
      return;
    }
  });

  element.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.id === 'dashMentorInput') {
      _sendDashMentorMessage();
    }
  });

  element.addEventListener('input', function(e) {
    const input = e.target.closest('[data-playground-field]');
    if (!input) return;
    setPlaygroundValue(
      input.getAttribute('data-playground-subject'),
      input.getAttribute('data-playground-field'),
      input.value
    );
  });

  // Drag & drop on window upload zone — navigate to study-tools
  var uploadZone = element.querySelector('.dw-upload-zone');
  if (uploadZone) {
    uploadZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      uploadZone.classList.add('dw-upload-zone--drag');
    });
    uploadZone.addEventListener('dragleave', function() {
      uploadZone.classList.remove('dw-upload-zone--drag');
    });
    uploadZone.addEventListener('drop', function(e) {
      e.preventDefault();
      uploadZone.classList.remove('dw-upload-zone--drag');
      navigateTo('study-tools');
    });
  }
}

// ── Subject groups helpers ──────────────────
function getSubjectGroupsForDisplay(subjects) {
  const subjectKeys = Object.keys(subjects);
  if (!subjectKeys.length) return [];

  // Dacă nu există grupe definite, creează un grup default
  if (!state.subjectGroups || !state.subjectGroups.length) {
    return [{ id: 'default', name: 'Materiile mele', keys: subjectKeys }];
  }

  // Colectează cheile deja asignate
  const assigned = new Set(state.subjectGroups.flatMap(g => g.keys));
  const unassigned = subjectKeys.filter(k => !assigned.has(k));

  const result = state.subjectGroups
    .map(g => ({ ...g, keys: g.keys.filter(k => subjects[k]) }))
    .filter(g => g.keys.length > 0);

  // Materiile neasignate → grup "Negruupate"
  if (unassigned.length) {
    result.push({ id: 'ungrouped', name: 'Alte materii', keys: unassigned });
  }

  return result.length ? result : [{ id: 'default', name: 'Materiile mele', keys: subjectKeys }];
}

function editGroupName(groupId) {
  // Găsim sau creăm grupul
  if (groupId === 'default') {
    // Convertim la grup real
    if (!state.subjectGroups.length) {
      const name = prompt('Numele grupului:', 'Semestrul 1');
      if (!name) return;
      state.subjectGroups = [{ id: 'grp_' + Date.now(), name, keys: Object.keys(getSubjects()) }];
      saveState();
      navigateTo('dashboard');
    }
    return;
  }

  const grp = state.subjectGroups.find(g => g.id === groupId);
  if (!grp) return;
  const name = prompt('Redenumește grupul:', grp.name);
  if (!name || name === grp.name) return;
  grp.name = name;
  saveState();
  navigateTo('dashboard');
}

// Adaugă grup nou din subject manager
function addSubjectGroup() {
  const name = prompt('Numele noului grup (ex: Semestrul 2, Opționale):', '');
  if (!name) return;
  if (!state.subjectGroups) state.subjectGroups = [];
  state.subjectGroups.push({ id: 'grp_' + Date.now(), name, keys: [] });
  saveState();
  showToast('Grup creat: ' + name, null, 'success', 2500);
  navigateTo('dashboard');
}

function saveApiKey() {
  const input = document.getElementById('apiKeyInput');
  const statusEl = document.getElementById('apiStatus');
  state.apiKey = 'backend';
  saveState();

  if (state.apiKey) {
    statusEl.className = 'api-status ok';
    statusEl.textContent = '[OK] API key salvat local. Funcțiile AI sunt active.';
  } else {
    statusEl.className = 'api-status err';
    statusEl.textContent = '[!] API key șters. Funcțiile AI nu vor funcționa.';
  }
}

function clearApiKey() {
  if (!confirm('Sigur vrei să ștergi API key-ul? Funcțiile AI vor fi dezactivate.')) return;
  state.apiKey = '';
  saveState();
  renderSettingsPage(document.getElementById('pageContent'));
  showToast('API key șters', 'Funcțiile AI sunt dezactivate.', 'warning', 3000);
}

// =============================================
// SUBJECT PAGE
// =============================================
