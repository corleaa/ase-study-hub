function renderStudyToolGuide(title, steps) {
  return '<div class="summary-deck" style="margin-bottom:18px;">'
    + '<div class="section-kicker">Cum folosești acest tool</div>'
    + '<div class="section-title">' + title + '</div>'
    + '<div class="dashboard-next-steps">' + steps.map(function(step, index) {
      return '<div class="next-step-card"><span class="soft-badge">Pasul ' + (index + 1) + '</span>'
        + '<div class="section-title" style="font-size:1rem;margin-top:12px;">' + step.title + '</div>'
        + '<div class="section-copy" style="font-size:.86rem;">' + step.copy + '</div></div>';
    }).join('') + '</div></div>';
}

function renderQuizResultGuide(pct) {
  var guidance = pct >= 80
    ? 'Performanța este bună. Repetă doar întrebările în care explicația te-a surprins sau pe care le-ai rezolvat corect din intuiție.'
    : pct >= 60
      ? 'Ai înțeles o parte importantă din material, dar încă există lacune. Reia explicațiile și treci apoi în flashcards pentru conceptele instabile.'
      : 'Scorul arată că materialul nu este încă stabil. Nu forța încă un quiz nou imediat; revino la fișă și cere AI Tutor-ului explicații mai simple pe conceptele greșite.';
  return '<div class="scenario-callout" style="text-align:left;margin:0 auto 20px;max-width:760px;"><strong>Interpretare</strong><p>' + guidance + '</p></div>';
}

function renderFlashcardGuide() {
  return '<div class="summary-deck" style="margin-bottom:18px;">'
    + '<div class="section-kicker">Cum funcționează memorarea</div>'
    + '<div class="section-title">Flashcards nu înseamnă doar repetare, ci timing bun</div>'
    + '<div class="dashboard-next-steps">'
    + '<div class="next-step-card"><span class="soft-badge">Pasul 1</span><div class="section-title" style="font-size:1rem;margin-top:12px;">Generezi din material deja înțeles</div><div class="section-copy" style="font-size:.86rem;">Flashcards funcționează mai bine după ce ai clarificat conceptele în rezumat sau AI Tutor.</div></div>'
    + '<div class="next-step-card"><span class="soft-badge">Pasul 2</span><div class="section-title" style="font-size:1rem;margin-top:12px;">Răspunzi sincer la dificultate</div><div class="section-copy" style="font-size:.86rem;">\"Greu\" înseamnă că informația nu e stabilă și trebuie să revină repede. \"Ușor\" împinge cardul mai departe în timp.</div></div>'
    + '<div class="next-step-card"><span class="soft-badge">Pasul 3</span><div class="section-title" style="font-size:1rem;margin-top:12px;">Folosești due cards ca semnal</div><div class="section-copy" style="font-size:.86rem;">Cardurile scadente nu sunt o pedeapsă, ci exact locurile unde memoria începe să se degradeze.</div></div>'
    + '</div></div>';
}

function renderQuizPage(element) {
  let html = '<div class="anim">';

  // Header cu selectie materie si optiuni
  html += '<div class="dash-hero" style="padding:32px 20px 24px">';
  html += '<h2>' + icon('brain','sm') + ' Quiz Mode</h2>';
  html += '<p>Grile și întrebări tip examen generate de AI din prezentările tale</p>';
  html += '</div>';
  html += renderStudyToolGuide('Quiz-ul îți arată dacă ai înțeles, nu doar dacă ai citit', [
    { title: 'Alegi materia cu material bun', copy: 'Quiz-ul este mai util când există deja prezentări sau fișe generate din cursul real.' },
    { title: 'Răspunzi și citești explicația', copy: 'Nu te opri la corect/greșit. Explicația este partea care fixează conceptul.' },
    { title: 'Folosești scorul pentru următorul pas', copy: 'Scor mic: revii la fișă. Scor mediu: clarifici punctele slabe. Scor bun: treci în flashcards sau examen simulat.' }
  ]);

  // Sectiunea de generare quiz
  html += '<div class="quiz-gen-section">';
  html += '<h3>' + icon('settings','sm') + ' Configurează Quiz-ul</h3>';

  // Selectie materie
  html += '<div style="margin-bottom:14px;">';
  html += '<label style="font-size:.82rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">Materie</label>';
  html += '<div class="quiz-options-row" id="quizSubjectChips">';
  for (const [key, subject] of Object.entries(getSubjects())) {
    const isActive = (state.quizConfig && state.quizConfig.subject === key) || false;
    html += '<button class="quiz-chip ' + (isActive ? 'active' : '') + '" data-quiz-subject="' + key + '">';
    html += subject.icon + ' ' + subject.name;
    html += '</button>';
  }
  html += '</div></div>';

  // Numar intrebari
  html += '<div style="margin-bottom:14px;">';
  html += '<label style="font-size:.82rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">Număr întrebări</label>';
  html += '<div class="quiz-options-row" id="quizCountChips">';
  [5, 10, 15, 20].forEach(function(n) {
    const isActive = (state.quizConfig && state.quizConfig.count === n) || n === 10;
    html += '<button class="quiz-chip ' + (isActive ? 'active' : '') + '" data-quiz-count="' + n + '">' + n + ' întrebări</button>';
  });
  html += '</div></div>';

  // Tip intrebari
  html += '<div style="margin-bottom:16px;">';
  html += '<label style="font-size:.82rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">Tip întrebări</label>';
  html += '<div class="quiz-options-row" id="quizTypeChips">';
  [
    { val: 'mixed', label: '🎲 Mix' },
    { val: 'grile', label: '☑️ Grile (4 variante)' },
    { val: 'adevarat', label: '✓✗ Adevărat/Fals' }
  ].forEach(function(t) {
    const isActive = (state.quizConfig && state.quizConfig.type === t.val) || t.val === 'mixed';
    html += '<button class="quiz-chip ' + (isActive ? 'active' : '') + '" data-quiz-type="' + t.val + '">' + t.label + '</button>';
  });
  html += '</div></div>';

  if (false) {
    html += '<div style="padding:12px;background:var(--amber-muted);border-radius:var(--radius-sm);font-size:.85rem;color:var(--amber);">[!] Configurează API key-ul din Dashboard pentru a genera quiz-uri AI</div>';
  } else {
    html += '<button class="summary-gen-btn" id="quizGenBtn" data-quiz-action="generate">';
    html += icon('brain','sm') + ' Generează Quiz</button>';
    html += '<span class="summary-status" id="quizGenStatus" style="margin-left:12px;font-size:.82rem;color:var(--text-muted);"></span>';
  }

  html += '</div>'; // end quiz-gen-section

  // Zona quiz activ sau istoric
  html += '<div id="quizActiveZone">';
  if (state.activeQuiz) {
    html += renderActiveQuiz();
  } else {
    html += renderQuizHistory();
  }
  html += '</div>';

  html += '</div>'; // end anim
  element.innerHTML = html;
  setupStudyToolsInteractions(element);
}

// Functii selectie optiuni quiz
function selectQuizSubject(key, el) {
  if (!state.quizConfig) state.quizConfig = {};
  state.quizConfig.subject = key;
  document.querySelectorAll('#quizSubjectChips .quiz-chip').forEach(function(btn) {
    btn.classList.remove('active');
  });
  // Bug 8 fix: use explicit el param instead of implicit window.event.target
  if (el) el.classList.add('active');
}

function selectQuizCount(n, el) {
  if (!state.quizConfig) state.quizConfig = {};
  state.quizConfig.count = n;
  document.querySelectorAll('#quizCountChips .quiz-chip').forEach(function(btn) {
    btn.classList.remove('active');
  });
  if (el) el.classList.add('active');
}

function selectQuizType(type, el) {
  if (!state.quizConfig) state.quizConfig = {};
  state.quizConfig.type = type;
  document.querySelectorAll('#quizTypeChips .quiz-chip').forEach(function(btn) {
    btn.classList.remove('active');
  });
  if (el) el.classList.add('active');
}

// Afiseaza istoricul quiz-urilor anterioare
function renderQuizHistory() {
  const history = state.quizHistory || {};
  const allResults = [];
  for (const [key, results] of Object.entries(history)) {
    results.forEach(function(r) {
      allResults.push({ subject: key, ...r });
    });
  }

  if (!allResults.length) {
    return '<div style="text-align:center;padding:40px;color:var(--text-muted);">Niciun quiz completat încă. Generează primul tău quiz!</div>';
  }

  // Sorteaza dupa data, cel mai recent primul
  allResults.sort(function(a, b) { return b.timestamp - a.timestamp; });

  let html = '<div style="margin-top:4px;">';
  html += '<div style="font-size:.82rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Rezultate anterioare</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">';

  allResults.slice(0, 12).forEach(function(result) {
    const subj = getSubjects()[result.subject];
    const pct = Math.round((result.score / result.total) * 100);
    const color = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';
    const date = new Date(result.timestamp).toLocaleDateString('ro');

    html += '<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;">';
    html += '<div style="font-size:.72rem;color:var(--text-muted);margin-bottom:4px;">' + (subj ? subjectIcon(subj,'xs') + ' ' + subj.name : result.subject) + ' · ' + date + '</div>';
    html += '<div style="font-size:1.6rem;font-weight:800;color:' + color + ';font-family:Syne,sans-serif">' + pct + '%</div>';
    html += '<div style="font-size:.8rem;color:var(--text-secondary)">' + result.score + '/' + result.total + ' corecte · ' + result.count + ' întrebări</div>';
    html += '</div>';
  });

  html += '</div></div>';
  return html;
}

// Genereaza quiz cu AI
async function generateQuiz() {
  const cfg = state.quizConfig || {};
  const subjectKey = cfg.subject;
  const count = cfg.count || 10;
  const type = cfg.type || 'mixed';

  if (!subjectKey) {
    document.getElementById('quizGenStatus').textContent = '[!] Selectează o materie mai întâi';
    return;
  }

  const subject = getSubjects()[subjectKey];
  const allPres = getAllPresentations(subjectKey);

  // Construim contextul din prezentari disponibile
  let context = '';
  if (allPres.length > 0) {
    allPres.forEach(function(pres) {
      context += '### ' + pres.title + '\n';
      pres.slides.forEach(function(slide) {
        context += '**' + slide.title + '**: ';
        // Strip HTML tags pentru context
        context += slide.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        context += '\n\n';
      });
    });
  }

  if (!context) {
    document.getElementById('quizGenStatus').textContent = '[!] Nu există prezentări pentru ' + subject.name + '. Generează mai întâi o prezentare!';
    return;
  }

  const btn = document.getElementById('quizGenBtn');
  const statusEl = document.getElementById('quizGenStatus');
  btn.disabled = true;
  btn.innerHTML = 'Se generează quiz-ul...';
  statusEl.textContent = 'Durează ~20-30 secunde...';

  // Prompt pentru tipul de intrebari
  let typeInstruction = '';
  if (type === 'grile') {
    typeInstruction = 'TOATE întrebările să fie cu 4 variante de răspuns (A, B, C, D). Exact UN singur răspuns corect.';
  } else if (type === 'adevarat') {
    typeInstruction = 'TOATE întrebările să fie de tip Adevărat/Fals. Opțiunile sunt ["Adevărat", "Fals"].';
  } else {
    typeInstruction = 'Mix: jumătate grile cu 4 variante, jumătate Adevărat/Fals.';
  }

  const systemPrompt = `Ești un profesor expert în ${subject.full}. Generezi întrebări de examen de calitate înaltă.

RĂSPUNDE STRICT cu un JSON array. FĂRĂ markdown, FĂRĂ backticks, FĂRĂ alt text.

Fiecare întrebare are structura:
{
  "q": "textul întrebării",
  "options": ["A. varianta 1", "B. varianta 2", "C. varianta 3", "D. varianta 4"],
  "correct": 0,
  "explanation": "explicație scurtă de ce este corect"
}

Unde "correct" este indexul (0-based) răspunsului corect din array-ul options.

REGULI:
- EXACT ${count} întrebări
- ${typeInstruction}
- Întrebările trebuie să fie relevante pentru materie și bazate pe conținut
- Dificultate variată: 30% ușoare, 50% medii, 20% dificile
- Explicații clare și educative
- În română
- DOAR JSON valid`;

  try {
    const response = await (async function(){
      var __r = await authFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(window.__shAccessToken ? { 'Authorization': 'Bearer ' + window.__shAccessToken } : {}) },
        credentials: 'include',
        body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: 'Generează ' + count + ' întrebări de examen bazate pe acest material:\n\n' + context.substring(0, 6000)
        }]
      })
      }); var __d = await __r.json(); return { content: [{ text: __d.content || '' }] }; })();

    const data = response;

    if (data.content && data.content[0]) {
      let rawText = data.content[0].text.trim();
      rawText = rawText.replace(/^```json?\s*/, '').replace(/\s*```$/, '').trim();

      let questions = null;
      try {
        questions = JSON.parse(rawText);
        if (!Array.isArray(questions)) questions = null;
      } catch (e) {
        console.error('Quiz JSON parse error:', e);
      }

      if (questions && questions.length > 0) {
        // Seteaza quiz-ul activ
        state.activeQuiz = {
          subjectKey: subjectKey,
          questions: questions,
          currentIndex: 0,
          answers: [],
          startedAt: Date.now()
        };
        saveState();

        const zone = document.getElementById('quizActiveZone');
        if (zone) zone.innerHTML = renderActiveQuiz();
        statusEl.textContent = '';
      } else {
        statusEl.textContent = '[!] Eroare la parsarea întrebărilor. Încearcă din nou.';
      }
    } else if (data.error) {
      statusEl.textContent = '[!] Eroare API: ' + data.error.message;
    }
  } catch (err) {
    statusEl.textContent = '[!] Eroare conexiune: ' + err.message;
  }

  btn.disabled = false;
  btn.innerHTML = icon('brain','sm') + ' Generează Quiz';
}

// Randeaza quiz-ul activ (grile interactive)
function renderActiveQuiz() {
  const quiz = state.activeQuiz;
  if (!quiz) return '';

  const { questions, currentIndex, answers } = quiz;
  const total = questions.length;
  const isDone = currentIndex >= total;

  if (isDone) {
    // Calculam scorul
    const score = answers.filter(function(a, i) {
      return a === questions[i].correct;
    }).length;

    // Salvam in istoric
    if (!state.quizHistory) state.quizHistory = {};
    if (!state.quizHistory[quiz.subjectKey]) state.quizHistory[quiz.subjectKey] = [];
    state.quizHistory[quiz.subjectKey].push({
      score: score,
      total: total,
      count: total,
      timestamp: Date.now()
    });
    state.activeQuiz = null;
    saveState();

    const pct = Math.round((score / total) * 100);
    const color = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';
    const emoji = '';
    const msg = pct >= 80 ? 'Excelent! Ești pregătit!' : pct >= 60 ? 'Bun! Mai exersează puțin.' : 'Continuă să studiezi — poți!';

    let html = '<div class="quiz-score-card" style="margin-top:20px;">';
    html += '<div style="font-size:3rem;margin-bottom:12px;">' + emoji + '</div>';
    html += '<div class="quiz-score-num" style="color:' + color + '">' + pct + '%</div>';
    html += '<div class="quiz-score-label">' + score + ' din ' + total + ' corecte</div>';
    html += '<p style="color:var(--text-secondary);margin-bottom:24px;">' + msg + '</p>';
    html += renderQuizResultGuide(pct);

    // Recapitulare
    html += '<div style="text-align:left;margin-bottom:24px;">';
    questions.forEach(function(q, i) {
      const userAnswer = answers[i];
      const isCorrect = userAnswer === q.correct;
      html += '<div style="padding:12px;border-radius:var(--radius-sm);margin-bottom:8px;background:' + (isCorrect ? 'var(--green-muted)' : 'var(--red-muted)') + ';border:1px solid ' + (isCorrect ? 'var(--green)' : 'var(--red)') + ';">';
      html += '<div style="font-size:.82rem;font-weight:700;color:' + (isCorrect ? 'var(--green)' : 'var(--red)') + '">' + (isCorrect ? '✓ Corect' : '✗ Greșit') + ' — Întrebarea ' + (i + 1) + '</div>';
      html += '<div style="font-size:.88rem;margin-top:4px;">' + q.q + '</div>';
      if (!isCorrect) {
        html += '<div style="font-size:.8rem;color:var(--text-secondary);margin-top:4px;">Răspuns corect: ' + (q.options[q.correct] || 'Adevărat') + '</div>';
      }
      html += '</div>';
    });
    html += '</div>';

    html += '<button class="quiz-nav-btn primary" data-quiz-action="restart">Nou Quiz</button>';
    html += '</div>';
    return html;
  }

  // Intrebarea curenta
  const q = questions[currentIndex];
  const hasAnswered = answers[currentIndex] !== undefined;
  const userAnswer = answers[currentIndex];
  const progress = Math.round((currentIndex / total) * 100);

  let html = '<div class="quiz-container" style="margin-top:20px;">';
  html += '<div class="quiz-header">';
  html += '<span style="font-size:.88rem;font-weight:600;">Întrebarea ' + (currentIndex + 1) + ' din ' + total + '</span>';
  html += '<button class="quiz-nav-btn" style="font-size:.78rem;" data-quiz-action="abandon">✕ Abandonează</button>';
  html += '</div>';

  html += '<div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:' + progress + '%"></div></div>';

  html += '<div class="quiz-question-card">';
  html += '<div class="quiz-q-num">' + getSubjects()[quiz.subjectKey].icon + ' ' + getSubjects()[quiz.subjectKey].name + '</div>';
  html += '<div class="quiz-q-text">' + escapeHtml(q.q) + '</div>';

  html += '<div class="quiz-options">';
  const letters = ['A', 'B', 'C', 'D'];
  q.options.forEach(function(option, optIndex) {
    let className = 'quiz-option';
    if (hasAnswered) {
      if (optIndex === q.correct) className += ' correct';
      else if (optIndex === userAnswer) className += ' wrong';
    }
    const disabled = hasAnswered ? 'disabled' : '';
    html += '<button class="' + className + '" ' + disabled + ' data-quiz-answer="' + optIndex + '">';
    html += '<span class="quiz-option-letter">' + letters[optIndex] + '</span>';
    html += '<span>' + escapeHtml(option) + '</span>';
    html += '</button>';
  });
  html += '</div>';

  // Explicatie (arata dupa raspuns)
  if (hasAnswered && q.explanation) {
    html += '<div class="quiz-explanation show">' + escapeHtml(q.explanation) + '</div>';
  }

  html += '</div>'; // end quiz-question-card

  // Navigare
  html += '<div class="quiz-nav-btns">';
  if (currentIndex > 0) {
    html += '<button class="quiz-nav-btn" data-quiz-action="prev">← Prev</button>';
  } else {
    html += '<div></div>';
  }

  if (hasAnswered) {
    const isLast = currentIndex === total - 1;
    if (isLast) {
      html += '<button class="quiz-nav-btn primary" data-quiz-action="next">Finalizează</button>';
    } else {
      html += '<button class="quiz-nav-btn primary" data-quiz-action="next">Următor →</button>';
    }
  } else {
    html += '<span style="font-size:.82rem;color:var(--text-muted)">Selectează un răspuns</span>';
  }

  html += '</div>';
  html += '</div>'; // end quiz-container
  return html;
}

// Raspunde la intrebare
function answerQuizQuestion(optionIndex) {
  if (!state.activeQuiz) return;
  const { currentIndex } = state.activeQuiz;
  if (state.activeQuiz.answers[currentIndex] !== undefined) return; // deja raspuns

  state.activeQuiz.answers[currentIndex] = optionIndex;
  saveState();

  const zone = document.getElementById('quizActiveZone');
  if (zone) zone.innerHTML = renderActiveQuiz();
}

// Urmator
function nextQuizQuestion() {
  if (!state.activeQuiz) return;
  state.activeQuiz.currentIndex++;
  saveState();
  const zone = document.getElementById('quizActiveZone');
  if (zone) zone.innerHTML = renderActiveQuiz();
}

// Precedent
function prevQuizQuestion() {
  if (!state.activeQuiz) return;
  if (state.activeQuiz.currentIndex > 0) {
    state.activeQuiz.currentIndex--;
    saveState();
    const zone = document.getElementById('quizActiveZone');
    if (zone) zone.innerHTML = renderActiveQuiz();
  }
}

// Abandoneaza quiz
function abandonQuiz() {
  if (!confirm('Sigur vrei să abandonezi quiz-ul? Progresul se va pierde.')) return;
  state.activeQuiz = null;
  saveState();
  navigateTo('quiz');
}

// =============================================
// FLASHCARDS — SPACED REPETITION (SM-2 simplificat)
// =============================================

// Calcula intervalul urmator bazat pe rating Easy/Hard
// Easy → interval * 2.5, Hard → interval / 2 (min 1 zi)
function calculateNextReview(card, rating) {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  if (rating === 'easy') {
    const interval = (card.interval || 1) * 2.5;
    card.interval = Math.round(interval);
    card.ease = Math.min((card.ease || 2.5) + 0.1, 3.0);
    card.nextReview = now + card.interval * DAY_MS;
    card.streak = (card.streak || 0) + 1;
  } else if (rating === 'hard') {
    card.interval = Math.max(1, Math.round((card.interval || 1) / 2));
    card.ease = Math.max((card.ease || 2.5) - 0.2, 1.3);
    card.nextReview = now + card.interval * DAY_MS;
    card.streak = 0;
  }

  card.lastReviewed = now;
  card.reviews = (card.reviews || 0) + 1;
  return card;
}

// Randeaza pagina Flashcards
function renderFlashcardsPage(element) {
  let html = '<div class="anim">';
  html += '<div class="dash-hero" style="padding:32px 20px 24px">';
  html += '<h2>Flashcards</h2>';
  html += '<p>Spaced repetition — revizuiești mai puțin, reții mai mult</p>';
  html += '</div>';
  html += renderFlashcardGuide();

  // Selectie materie + generare
  html += '<div class="quiz-gen-section">';
  html += '<h3>' + icon('settings','sm') + ' Generează sau Studiază</h3>';

  html += '<div style="margin-bottom:14px;">';
  html += '<label style="font-size:.82rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">Selectează materia</label>';
  html += '<div class="quiz-options-row" id="fcSubjectChips">';
  for (const [key, subject] of Object.entries(getSubjects())) {
    const isActive = state.fcActiveSubject === key;
    const cardCount = (state.flashcardDecks && state.flashcardDecks[key] || []).length;
    html += '<button class="quiz-chip ' + (isActive ? 'active' : '') + '" data-fc-subject="' + key + '">';
    html += subject.icon + ' ' + subject.name;
    if (cardCount) html += ' <span style="font-size:.72rem;opacity:.7">(' + cardCount + ')</span>';
    html += '</button>';
  }
  html += '</div></div>';

  if (false) {
    html += '<div style="padding:12px;background:var(--amber-muted);border-radius:var(--radius-sm);font-size:.85rem;color:var(--amber);">[!] Configurează API key-ul din Dashboard pentru a genera flashcard-uri AI</div>';
  } else {
    html += '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">';
    html += '<button class="summary-gen-btn" id="fcGenBtn" data-fc-action="generate" style="flex:none;">';
    html += '' + icon('sparkle','sm') + ' Generează Flashcard-uri AI</button>';
    html += '<span class="summary-status" id="fcGenStatus" style="font-size:.82rem;color:var(--text-muted);"></span>';
    html += '</div>';
  }

  html += '</div>'; // end quiz-gen-section

  // Zona de studiu
  html += '<div id="fcStudyZone">';
  if (state.fcActiveSubject) {
    html += renderFlashcardStudy(state.fcActiveSubject);
  } else {
    html += renderAllFCStats();
  }
  html += '</div>';

  html += '</div>';
  element.innerHTML = html;
}

// Statistici globale flashcards
function renderAllFCStats() {
  const decks = state.flashcardDecks || {};
  const now = Date.now();

  let totalCards = 0;
  let dueCards = 0;
  let masteredCards = 0;

  for (const [key, cards] of Object.entries(decks)) {
    cards.forEach(function(card) {
      totalCards++;
      if (!card.nextReview || card.nextReview <= now) dueCards++;
      if ((card.streak || 0) >= 5) masteredCards++;
    });
  }

  if (!totalCards) {
    return '<div class="empty-state">' +
      '<div class="empty-state-icon">' + icon('cards','md') + '</div>' +
      '<div class="empty-state-title">Niciun flashcard încă</div>' +
      '<div class="empty-state-desc">Selectează o materie și generează flashcard-uri AI din prezentările tale. Sistemul de spaced repetition îți va programa recapitulările optim.</div>' +
      (state.apiKey ? '' : '<button class="empty-state-btn" data-nav-tab="settings">' + icon('key','xs') + ' Configurează API Key</button>') +
      '</div>';
  }

  let html = '<div class="flashcard-stats" style="margin-top:20px;">';
  html += '<div class="fc-stat"><div class="fc-stat-val">' + totalCards + '</div><div class="fc-stat-label">Total Cards</div></div>';
  html += '<div class="fc-stat"><div class="fc-stat-val" style="color:var(--amber)">' + dueCards + '</div><div class="fc-stat-label">De Revizuit</div></div>';
  html += '<div class="fc-stat"><div class="fc-stat-val" style="color:var(--green)">' + masteredCards + '</div><div class="fc-stat-label">Memorate</div></div>';
  html += '</div>';
  html += '<div style="text-align:center;color:var(--text-muted);font-size:.88rem;">Selectează o materie pentru a studia flashcard-urile.</div>';
  return html;
}

// Selectie materie pentru flashcards
function selectFCSubject(key, el) {
  state.fcActiveSubject = key;
  state.fcCurrentCard = 0;
  state.fcFlipped = false;

  document.querySelectorAll('#fcSubjectChips .quiz-chip').forEach(function(btn) {
    btn.classList.remove('active');
  });
  // Bug 8 fix: explicit el param
  if (el) el.classList.add('active');

  const zone = document.getElementById('fcStudyZone');
  if (zone) zone.innerHTML = renderFlashcardStudy(key);
}

// Randeaza studiul de flashcards pentru o materie
function renderFlashcardStudy(key) {
  const decks = state.flashcardDecks || {};
  const allCards = decks[key] || [];
  const subject = getSubjects()[key];
  const now = Date.now();

  // Filtram cardurile scadente (due)
  const dueCards = allCards.filter(function(card) {
    return !card.nextReview || card.nextReview <= now;
  });

  const totalCards = allCards.length;
  const masteredCards = allCards.filter(function(c) { return (c.streak || 0) >= 5; }).length;

  let html = '<div style="margin-top:20px;">';

  // Stats deck
  html += '<div class="flashcard-stats">';
  html += '<div class="fc-stat"><div class="fc-stat-val">' + totalCards + '</div><div class="fc-stat-label">Total</div></div>';
  html += '<div class="fc-stat"><div class="fc-stat-val" style="color:var(--amber)">' + dueCards.length + '</div><div class="fc-stat-label">De Revizuit</div></div>';
  html += '<div class="fc-stat"><div class="fc-stat-val" style="color:var(--green)">' + masteredCards + '</div><div class="fc-stat-label">Memorate</div></div>';
  html += '<div class="fc-stat"><div class="fc-stat-val">' + (totalCards - dueCards.length - masteredCards) + '</div><div class="fc-stat-label">In Progres</div></div>';
  html += '</div>';

  if (!dueCards.length && totalCards > 0) {
    // Toate memorate pe azi!
    html += '<div class="fc-deck-done">';
    html += '<div style="font-size:3rem;margin-bottom:12px;">🎉</div>';
    html += '<div style="font-size:1.3rem;font-weight:700;margin-bottom:8px;">Bravo! Ai terminat pentru azi!</div>';
    html += '<p style="color:var(--text-secondary);margin-bottom:20px;">Revino mâine pentru următoarea sesiune de revizie.</p>';
    html += '<button class="quiz-nav-btn primary" data-fc-action="study-all" data-fc-key="' + key + '">📚 Studiază Toate (' + totalCards + ')</button>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  if (!totalCards) {
    html += '<div style="text-align:center;padding:40px;color:var(--text-muted);">Niciun flashcard pentru ' + subject.name + '. Generează mai întâi!</div>';
    html += '</div>';
    return html;
  }

  // Card curent
  const cardIndex = state.fcCurrentCard || 0;
  const card = dueCards[cardIndex % dueCards.length];
  const isFlipped = state.fcFlipped || false;
  const remaining = dueCards.length - cardIndex;

  html += '<div class="fc-queue-info">' + Math.max(0, remaining) + ' carduri rămase din ' + dueCards.length + ' scadente</div>';

  // Flashcard cu flip
  html += '<div class="flashcard-scene" data-fc-action="flip">';
  html += '<div class="flashcard-inner ' + (isFlipped ? 'flipped' : '') + '" id="fcInner">';

  // Fata (intrebarea)
  html += '<div class="flashcard-face flashcard-front">';
  html += '<div class="fc-label">❓ Întrebare</div>';
  html += '<div class="fc-content">' + escapeHtml(card.front) + '</div>';
  html += '<div class="fc-flip-hint"><span>👆</span> Click pentru a vedea răspunsul</div>';
  html += '</div>';

  // Spate (raspunsul)
  html += '<div class="flashcard-face flashcard-back">';
  html += '<div class="fc-label" style="color:var(--accent)">Răspuns</div>';
  html += '<div class="fc-content">' + escapeHtml(card.back) + '</div>';
  html += '</div>';

  html += '</div></div>'; // end flashcard-inner și flashcard-scene

  // Butoane de rating (apar dupa flip)
  if (isFlipped) {
    html += '<div class="flashcard-answer-btns">';
    html += '<button class="fc-btn hard" data-fc-action="rate" data-fc-key="' + key + '" data-fc-index="' + dueCards.indexOf(card) + '" data-fc-rating="hard">✕ Greu — Revizuiesc</button>';
    html += '<button class="fc-btn skip" data-fc-action="skip">⏭ Skip</button>';
    html += '<button class="fc-btn easy" data-fc-action="rate" data-fc-key="' + key + '" data-fc-index="' + dueCards.indexOf(card) + '" data-fc-rating="easy">✓ Ușor — Știu!</button>';
    html += '</div>';

    html += '<div style="text-align:center;font-size:.78rem;color:var(--text-muted);">';
    html += '✕ Greu = revizuiești în ' + Math.max(1, Math.round((card.interval || 1) / 2)) + ' zi · ';
    html += '✓ Ușor = revizuiești în ' + Math.round((card.interval || 1) * 2.5) + ' zile';
    html += '</div>';
  } else {
    html += '<div style="text-align:center;color:var(--text-muted);font-size:.85rem;padding:12px;">Întoarce cardul pentru a vedea răspunsul</div>';
  }

  // Optiune stergere deck
  html += '<div style="text-align:center;margin-top:16px;">';
  html += '<button class="quiz-nav-btn" style="font-size:.75rem;color:var(--red);" data-fc-action="clear-deck" data-fc-key="' + key + '">' + icon('trash','xs') + ' Șterge toate flashcard-urile din ' + subject.name + '</button>';
  html += '</div>';

  html += '</div>';
  return html;
}

// Rastoarnă flashcard-ul
function flipFlashcard() {
  state.fcFlipped = !state.fcFlipped;
  const inner = document.getElementById('fcInner');
  if (inner) {
    inner.classList.toggle('flipped', state.fcFlipped);
  }
  // Re-render pentru a arata butoanele dupa flip
  const zone = document.getElementById('fcStudyZone');
  if (zone && state.fcActiveSubject) {
    zone.innerHTML = renderFlashcardStudy(state.fcActiveSubject);
  }
}

// Evalueaza cardul (Easy/Hard)
function rateFlashcard(key, cardIndex, rating) {
  const decks = state.flashcardDecks || {};
  const allCards = decks[key] || [];
  const now = Date.now();

  // Gasim cardul in deck-ul principal
  const dueCards = allCards.filter(function(card) {
    return !card.nextReview || card.nextReview <= now;
  });

  if (cardIndex >= dueCards.length) return;

  const card = dueCards[cardIndex];
  // Updatam in deck-ul principal
  const mainIndex = allCards.findIndex(function(c) { return c.id === card.id; });
  if (mainIndex >= 0) {
    allCards[mainIndex] = calculateNextReview(allCards[mainIndex], rating);
  }

  state.flashcardDecks[key] = allCards;
  state.fcCurrentCard = (state.fcCurrentCard || 0) + 1;
  state.fcFlipped = false;
  saveState();

  // Re-render
  const zone = document.getElementById('fcStudyZone');
  if (zone) zone.innerHTML = renderFlashcardStudy(key);
  renderSidebar();
}

function setupStudyToolsInteractions(element) {
  if (element.__studyToolsInteractionsBound) return;
  element.__studyToolsInteractionsBound = true;

  element.addEventListener('click', function(e) {
    const navEl = e.target.closest('[data-nav-tab]');
    if (navEl) {
      navigateTo(navEl.getAttribute('data-nav-tab'));
      return;
    }

    const subjectEl = e.target.closest('[data-quiz-subject]');
    if (subjectEl) {
      selectQuizSubject(subjectEl.getAttribute('data-quiz-subject'), subjectEl);
      return;
    }
    const countEl = e.target.closest('[data-quiz-count]');
    if (countEl) {
      selectQuizCount(Number(countEl.getAttribute('data-quiz-count')), countEl);
      return;
    }
    const typeEl = e.target.closest('[data-quiz-type]');
    if (typeEl) {
      selectQuizType(typeEl.getAttribute('data-quiz-type'), typeEl);
      return;
    }
    const quizAction = e.target.closest('[data-quiz-action]');
    if (quizAction) {
      const action = quizAction.getAttribute('data-quiz-action');
      if (action === 'generate') generateQuiz();
      else if (action === 'restart') navigateTo('quiz');
      else if (action === 'abandon') abandonQuiz();
      else if (action === 'prev') prevQuizQuestion();
      else if (action === 'next') nextQuizQuestion();
      return;
    }
    const answerEl = e.target.closest('[data-quiz-answer]');
    if (answerEl) {
      answerQuizQuestion(Number(answerEl.getAttribute('data-quiz-answer')));
      return;
    }

    const fcSubject = e.target.closest('[data-fc-subject]');
    if (fcSubject) {
      selectFCSubject(fcSubject.getAttribute('data-fc-subject'), fcSubject);
      return;
    }
    const fcAction = e.target.closest('[data-fc-action]');
    if (fcAction) {
      const action = fcAction.getAttribute('data-fc-action');
      if (action === 'generate') generateFlashcards();
      else if (action === 'study-all') studyAllCardsNow(fcAction.getAttribute('data-fc-key'));
      else if (action === 'flip') flipFlashcard();
      else if (action === 'skip') skipFlashcard();
      else if (action === 'clear-deck') clearFlashcardDeck(fcAction.getAttribute('data-fc-key'));
      else if (action === 'rate') {
        rateFlashcard(
          fcAction.getAttribute('data-fc-key'),
          Number(fcAction.getAttribute('data-fc-index')),
          fcAction.getAttribute('data-fc-rating')
        );
      }
    }
  });
}

// Skip card (trece la urmatorul)
function skipFlashcard() {
  state.fcCurrentCard = (state.fcCurrentCard || 0) + 1;
  state.fcFlipped = false;
  const zone = document.getElementById('fcStudyZone');
  if (zone && state.fcActiveSubject) {
    zone.innerHTML = renderFlashcardStudy(state.fcActiveSubject);
  }
}

// Studiaza toate cardurile (nu doar cele scadente)
function studyAllCardsNow(key) {
  const decks = state.flashcardDecks || {};
  const allCards = decks[key] || [];
  // Reseteaza nextReview pentru toate
  allCards.forEach(function(card) {
    card.nextReview = Date.now() - 1;
  });
  state.flashcardDecks[key] = allCards;
  state.fcCurrentCard = 0;
  state.fcFlipped = false;
  saveState();
  const zone = document.getElementById('fcStudyZone');
  if (zone) zone.innerHTML = renderFlashcardStudy(key);
}

// Sterge deck-ul unei materii
function clearFlashcardDeck(key) {
  if (!confirm('Sigur vrei să ștergi toate flashcard-urile pentru ' + getSubjects()[key].name + '?')) return;
  if (!state.flashcardDecks) state.flashcardDecks = {};
  state.flashcardDecks[key] = [];
  state.fcCurrentCard = 0;
  state.fcFlipped = false;
  saveState();
  const zone = document.getElementById('fcStudyZone');
  if (zone) zone.innerHTML = renderFlashcardStudy(key);
  renderSidebar();
}

// Genereaza flashcard-uri cu AI
async function generateFlashcards() {
  const key = state.fcActiveSubject;
  if (!key) {
    document.getElementById('fcGenStatus').textContent = '[!] Selectează o materie mai întâi';
    return;
  }

  const subject = getSubjects()[key];
  const allPres = getAllPresentations(key);

  if (!allPres.length) {
    document.getElementById('fcGenStatus').textContent = '[!] Nu există prezentări pentru ' + subject.name + '. Generează mai întâi o prezentare!';
    return;
  }

  // Construim contextul din prezentari
  let context = '';
  allPres.forEach(function(pres) {
    context += '### ' + pres.title + '\n';
    pres.slides.forEach(function(slide) {
      context += slide.title + ': ';
      context += slide.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      context += '\n\n';
    });
  });

  const btn = document.getElementById('fcGenBtn');
  const statusEl = document.getElementById('fcGenStatus');
  btn.disabled = true;
  btn.innerHTML = 'Se generează...';
  statusEl.textContent = 'Durează ~15-25 secunde...';

  const systemPrompt = `Ești un expert în ${subject.full}. Generezi flashcard-uri pentru memorare eficientă.

RĂSPUNDE STRICT cu un JSON array. FĂRĂ markdown, FĂRĂ backticks, FĂRĂ alt text.

Fiecare flashcard are structura:
{
  "front": "întrebarea sau conceptul",
  "back": "răspunsul complet și clar"
}

REGULI:
- EXACT 20 flashcard-uri
- Front: întrebare directă sau concept de definit
- Back: răspuns concis, clar, memorable (max 60 cuvinte)
- Acoperă toate conceptele cheie din material
- Variație: definiții, formule, exemple, comparații
- În română
- DOAR JSON valid`;

  try {
    const response = await (async function(){
      var __r = await authFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(window.__shAccessToken ? { 'Authorization': 'Bearer ' + window.__shAccessToken } : {}) },
        credentials: 'include',
        body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: 'Generează 20 flashcard-uri din:\n\n' + context.substring(0, 6000)
        }]
      })
      }); var __d = await __r.json(); return { content: [{ text: __d.content || '' }] }; })();

    const data = response;

    if (data.content && data.content[0]) {
      let rawText = data.content[0].text.trim();
      rawText = rawText.replace(/^```json?\s*/, '').replace(/\s*```$/, '').trim();

      let cards = null;
      try {
        cards = JSON.parse(rawText);
        if (!Array.isArray(cards)) cards = null;
      } catch (e) {
        console.error('FC JSON parse error:', e);
      }

      if (cards && cards.length > 0) {
        // Adaugam ID unic si metadate spaced repetition fiecarui card
        const newCards = cards.map(function(card, i) {
          return {
            id: 'fc_' + Date.now() + '_' + i,
            front: card.front,
            back: card.back,
            interval: 1,         // interval initial: 1 zi
            ease: 2.5,           // ease factor initial
            streak: 0,           // zile consecutive corecte
            reviews: 0,          // numar total de reviews
            nextReview: null,    // null = scadent acum
            lastReviewed: null
          };
        });

        if (!state.flashcardDecks) state.flashcardDecks = {};
        // Adaugam la deck-ul existent (nu inlocuim)
        const existing = state.flashcardDecks[key] || [];
        state.flashcardDecks[key] = [...existing, ...newCards];
        state.fcCurrentCard = 0;
        state.fcFlipped = false;
        saveState();

        statusEl.textContent = '[OK] ' + newCards.length + ' flashcard-uri adăugate!';
        const zone = document.getElementById('fcStudyZone');
        if (zone) zone.innerHTML = renderFlashcardStudy(key);
        renderSidebar();
      } else {
        statusEl.textContent = '[!] Eroare la parsare. Încearcă din nou.';
      }
    } else if (data.error) {
      statusEl.textContent = '[!] Eroare API: ' + data.error.message;
    }
  } catch (err) {
    statusEl.textContent = '[!] Eroare conexiune: ' + err.message;
  }

  btn.disabled = false;
  btn.innerHTML = icon('sparkle','sm') + ' Generează Flashcard-uri AI';
}

// =============================================
// CALENDAR SESIUNE — EXAMENE + PLANNER
// =============================================

// Starea calendarului mini
let calendarState = {
  year: new Date().getFullYear(),
  month: new Date().getMonth()
};

// Randeaza pagina Calendar
