function renderSubjectStudyPath(key, subject, allPres, todos) {
  const hasPresentation = allPres.length > 0;
  const hasTodos = todos.length > 0;
  const nextStep = hasPresentation
    ? 'Ai deja material generat. Următorul pas bun este să-l transformi în quiz sau flashcards, apoi să folosești AI Tutor doar pe conceptele care rămân neclare.'
    : 'Nu există încă o fișă generată. Începe cu upload sau text manual, apoi construiește înțelegerea din rezumat înainte să treci la testare.';

  return '<section class="summary-deck" style="margin-bottom:18px;">'
    + '<div class="section-kicker">Parcurs recomandat</div>'
    + '<div class="section-title">Ce faci în această pagină</div>'
    + '<div class="section-copy">Pagina materiei este construită în ordinea bună pentru învățare: mai întâi înțelegi materialul, apoi îl fixezi, apoi îl testezi.</div>'
    + '<div class="dashboard-next-steps">'
    + '<div class="next-step-card"><span class="soft-badge">Pasul 1</span><div class="section-title" style="font-size:1rem;margin-top:12px;">Construiești fișa de învățare</div><div class="section-copy" style="font-size:.86rem;">Încarci cursul sau lipești textul, iar platforma îl transformă într-un rezumat pe niveluri și exemple.</div></div>'
    + '<div class="next-step-card"><span class="soft-badge">Pasul 2</span><div class="section-title" style="font-size:1rem;margin-top:12px;">Clarifici și aplici</div><div class="section-copy" style="font-size:.86rem;">Folosești AI Tutor și blocurile interactive doar pentru părțile pe care încă nu le înțelegi clar.</div></div>'
    + '<div class="next-step-card"><span class="soft-badge">Pasul 3</span><div class="section-title" style="font-size:1rem;margin-top:12px;">Testezi și memorezi</div><div class="section-copy" style="font-size:.86rem;">Treci în quiz și flashcards ca să vezi dacă informația a devenit stabilă, nu doar familiară.</div></div>'
    + '</div>'
    + '<div class="scenario-callout"><strong>Pasul următor pentru ' + escapeHtml(subject.name) + '</strong><p>' + escapeHtml(nextStep) + (hasTodos && !hasPresentation ? ' Ai și ' + todos.length + ' task-uri active, deci merită să pornești din materialul cel mai urgent.' : '') + '</p></div>'
    + '</section>';
}

function renderGeneratorGuide() {
  return '<div class="scenario-callout" style="margin:14px 0 18px;">'
    + '<strong>Cum folosești generatorul</strong>'
    + '<p>1. Adu un material brut: PDF, DOCX, PPTX sau text lipit. 2. Dă-i un titlu clar, ca să-l regăsești ușor. 3. Generează fișa și verifică dacă explicația acoperă ideea simplă, mecanismul și exemplul.</p>'
    + '<p style="margin-top:8px;">Dacă rezultatul e prea vag, problema nu este mereu AI-ul: de multe ori ajută să încarci un fragment mai curat sau mai specific.</p>'
    + '</div>';
}

function renderTutorGuide(subjectName) {
  return '<div class="scenario-callout" style="margin-bottom:14px;">'
    + '<strong>Când folosești AI Tutor</strong>'
    + '<p>AI Tutor este util după ce ai citit fișa și știi exact unde te-ai blocat. Pune întrebări despre cauză-efect, comparații, exemple sau explicații mai simple pentru ' + escapeHtml(subjectName) + '.</p>'
    + '</div>';
}

function renderSubjectPage(element, key, subject) {
  const todos = state.todos[key] || [];
  const doneTodos = todos.filter(t => t.done).length;
  const allPres = getAllPresentations(key);
  const activeIndex = state.activePresIndex[key] || 0;
  const presId = 'pres_' + key;
  const todayStr2 = new Date().toISOString().split('T')[0];
  const pomoToday = (state.pomoLog || []).filter(s => s.date === todayStr2).length;
  const pomoTotal = (state.pomoLog || []).length;
  const pomoMinTotal = (state.pomoLog || []).reduce((a,s) => a + (s.minutes||0), 0);

  let html = '<div class="anim">';

  // === COMPACT HEADER ===
  html += '<div class="subj-header-compact">';
  html += '<div class="subj-icon-sm" style="background:var(--accent-muted);border:2px solid var(--accent);">' + subjectIcon(subject, 'sm') + '</div>';
  html += '<div class="subj-header-info">';
  html += '<div class="subj-name-compact">' + escapeHtml(subject.name) + '</div>';
  html += '<div class="subj-desc-compact">' + escapeHtml(subject.full) + '</div>';
  html += '</div>';
  html += '<div class="subj-stats-inline">';
  html += '<span class="subj-stat-badge">' + icon('layers2','xs') + ' ' + allPres.length + ' rezumate</span>';
  html += '<span class="subj-stat-badge">✅ ' + (todos.length ? Math.round(doneTodos / todos.length * 100) : 0) + '%</span>';
  html += '</div>';
  html += '</div>';

  // === HERO GENERATOR ZONE ===
  html += '<div class="hero-gen anim-d1">';
  html += '<div class="hero-gen-header">';
  html += '<div>';
  html += '<div class="hero-gen-title">' + icon('sparkle','sm') + ' Generează rezumat nou</div>';
  html += '<div class="hero-gen-subtitle">Încarcă un PDF sau lipește text — AI-ul face restul în ~30s</div>';
  html += '</div>';
  html += '</div>';

  html += '<div class="summary-upload-zone" id="uploadZone">';
  html += '<input type="file" id="fileUpload" accept=".pdf,.txt,.doc,.docx,.md,.csv,.pptx">';
  html += '<div class="su-icon" style="display:flex;justify-content:center;color:var(--text-muted);">' + icon('upload','lg') + '</div>';
  html += '<div class="su-text">Trage un fișier sau click pentru a încărca</div>';
  html += '<div class="su-hint">PDF, TXT, DOCX, PPTX, MD, CSV — max 10MB</div>';
  html += '</div>';

  html += '<div class="summary-file-info" id="fileInfo">';
  html += '<span>📎</span><span class="sf-name" id="fileName"></span>';
  html += '<span class="sf-size" id="fileSize"></span>';
  html += '<button class="sf-remove" data-subject-action="remove-uploaded-file">✕</button></div>';

  html += '<div class="summary-or">sau lipește textul manual</div>';
  html += '<textarea class="summary-textarea" id="summaryInput" placeholder="Lipește aici textul din curs, PDF, sau notițe..."></textarea>';

  html += '<div style="margin-top:8px;">';
  html += '<input class="todo-inp" id="presTitle" placeholder="Titlul rezumatului (ex: Curs 3 — Regresie Logistică)" style="width:100%;">';
  html += '</div>';

  html += '<div class="hero-gen-actions">';
  html += '<button class="hero-gen-btn" id="summaryBtn" data-subject-action="generate-presentation" data-subject-key="' + key + '">';
  html += icon('sparkle','sm') + ' Generează rezumatul</button>';
  html += '<span class="summary-status" id="summaryStatus"></span>';
  html += '</div>';

  html += '</div>'; // close hero-gen

  // === PRESENTATIONS LIBRARY ===
  html += '<div class="panel panel-full anim-d2">';
  html += '<div class="panel-head">';
  html += '<span>' + icon('layers2','sm') + ' Rezumatele tale</span>';
  html += '<span style="font-size:.72rem;color:var(--text-muted)">' + allPres.length + (allPres.length === 1 ? ' rezumat' : ' rezumate') + '</span>';
  html += '</div>';
  html += '<div class="panel-body">';

  if (allPres.length > 0) {
    html += '<div class="pres-library">';
    allPres.forEach(function(pres, index) {
      const isBuiltin = !!(BUILTIN_PRESENTATIONS[key] || []).find(function(bp) { return bp.id === pres.id; });
      const firstSlide = pres.slides && pres.slides[0];
      const thumbText = firstSlide ? escapeHtml(firstSlide.title) : pres.title;

      html += '<div class="pres-card" data-subject-action="open-presentation" data-subject-key="' + key + '" data-pres-index="' + index + '">';
      html += '<div class="pres-card-thumb">';
      html += '<div class="pres-card-thumb-inner">' + thumbText + '</div>';
      html += '<span class="pres-card-slide-count">' + (pres.slides ? pres.slides.length : 0) + ' slide-uri</span>';
      html += '</div>';
      html += '<div class="pres-card-title">' + escapeHtml(pres.title) + '</div>';
      html += '<div class="pres-card-meta">';
      html += '<span>' + (pres.date === 'built-in' ? 'Built-in' : pres.date) + '</span>';
      html += '<span style="color:var(--accent);font-size:.72rem;">' + icon('arrow_right','xs') + ' Deschide</span>';
      html += '</div>';
      if (!isBuiltin) {
        html += '<button class="pres-card-del" data-subject-action="delete-presentation" data-subject-key="' + key + '" data-pres-id="' + pres.id + '" title="Șterge">' + icon('trash','xs') + '</button>';
      }
      html += '</div>';
    });
    html += '</div>';
  } else {
    html += '<div class="empty-state" style="padding:20px 0 10px;">';
    html += '<div class="empty-state-desc" style="font-size:.82rem;text-align:center;color:var(--text-muted);">Primul rezumat generat va apărea aici.</div>';
    html += '</div>';
  }

  html += '</div></div>';

  // === TOOLS TABS ===
  html += '<div class="tools-tabs-wrap panel panel-full anim-d3">';
  html += '<div class="tools-tab-bar">';
  html += '<button class="tools-tab-btn active" data-subject-action="switch-tab" data-tab="tutor">' + icon('robot','xs') + ' AI Tutor</button>';
  html += '<button class="tools-tab-btn" data-subject-action="switch-tab" data-tab="notes">📝 Notițe</button>';
  html += '<button class="tools-tab-btn" data-subject-action="switch-tab" data-tab="todos">✅ To-Do</button>';
  html += '<button class="tools-tab-btn" data-subject-action="switch-tab" data-tab="pomodoro">' + icon('timer','xs') + ' Pomodoro</button>';
  html += '<button class="tools-tab-btn" data-subject-action="switch-tab" data-tab="links">' + icon('link','xs') + ' Linkuri</button>';
  html += '</div>';

  // --- TAB: AI TUTOR ---
  html += '<div class="tools-tab-panel active" data-tab-panel="tutor">';
  html += '<div class="panel-body">';
  html += renderTutorGuide(subject.name);
  html += '<div class="chat-container">';
  html += '<div class="chat-messages" id="chatMessages">' + renderChatHistory(key) + '</div>';
  html += '<div class="chat-input-row">';
  html += '<input class="chat-input" id="chatInput" placeholder="Pune o întrebare despre ' + escapeHtml(subject.name) + '..." data-subject-key="' + key + '">';
  html += '<button class="chat-send" id="chatSendBtn" data-subject-action="send-chat" data-subject-key="' + key + '">Trimite</button>';
  html += '</div></div>';
  if (state.chatHistories[key] && state.chatHistories[key].length > 0) {
    html += '<div style="margin-top:10px;display:flex;gap:8px;">';
    html += '<button class="quiz-nav-btn" style="font-size:.72rem;padding:5px 12px;" data-subject-action="export-chat" data-subject-key="' + key + '">⬇️ Export PDF</button>';
    html += '<button class="quiz-nav-btn" style="font-size:.72rem;padding:5px 12px;color:var(--red);" data-subject-action="clear-chat" data-subject-key="' + key + '">' + icon('trash','xs') + ' Șterge</button>';
    html += '</div>';
  }
  html += '</div></div>';

  // --- TAB: NOTIȚE ---
  html += '<div class="tools-tab-panel" data-tab-panel="notes">';
  html += '<div class="panel-body">';
  html += '<textarea class="notes-textarea" id="notesArea" placeholder="Scrie notițele tale aici...">' + (state.notes[key] || '') + '</textarea>';
  html += '<div class="save-indicator" id="noteSaved">✓ Salvat</div>';
  html += '</div></div>';

  // --- TAB: TO-DO ---
  html += '<div class="tools-tab-panel" data-tab-panel="todos">';
  html += '<div class="panel-body">';
  html += '<div class="todo-row">';
  html += '<input class="todo-inp" id="todoInput" placeholder="Adaugă un task..." data-subject-key="' + key + '">';
  html += '<button class="todo-btn" data-subject-action="add-todo" data-subject-key="' + key + '">+</button>';
  html += '</div>';
  html += '<div id="todoList">' + renderTodos(key) + '</div>';
  html += '</div></div>';

  // --- TAB: POMODORO ---
  html += '<div class="tools-tab-panel" data-tab-panel="pomodoro">';
  html += '<div class="panel-body">';
  html += '<div class="pomodoro-container">';
  html += '<div class="pomo-ring-wrap">';
  html += '<svg class="pomo-ring-svg" viewBox="0 0 160 160">';
  html += '<circle class="pomo-ring-bg" cx="80" cy="80" r="70"/>';
  html += '<circle class="pomo-ring-fill" id="pomoRingFill" cx="80" cy="80" r="70"/>';
  html += '</svg>';
  html += '<div class="pomo-ring-center">';
  html += '<div class="pomo-time" id="pomoTime">25:00</div>';
  html += '<div class="pomo-mode" id="pomoMode">Focus</div>';
  html += '</div></div>';
  html += '<div class="pomo-controls">';
  html += '<button class="pomo-btn primary" id="pomoStartBtn" data-subject-action="toggle-pomodoro">' + icon('activity','sm') + ' Start</button>';
  html += '<button class="pomo-btn" data-subject-action="reset-pomodoro">' + icon('arrow_left','xs') + ' Reset</button>';
  html += '</div>';
  html += '<div class="pomo-presets">';
  html += '<button class="pomo-preset active" data-subject-action="set-pomo-preset" data-pomo-minutes="25">25 min</button>';
  html += '<button class="pomo-preset" data-subject-action="set-pomo-preset" data-pomo-minutes="45">45 min</button>';
  html += '<button class="pomo-preset" data-subject-action="set-pomo-preset" data-pomo-minutes="60">60 min</button>';
  html += '<button class="pomo-preset break-preset" data-subject-action="set-pomo-preset" data-pomo-minutes="5" data-pomo-break="true">5 min · pauză</button>';
  html += '<button class="pomo-preset break-preset" data-subject-action="set-pomo-preset" data-pomo-minutes="15" data-pomo-break="true">15 min · pauză</button>';
  html += '</div>';
  html += '<div class="pomo-custom-row">';
  html += '<span class="pomo-custom-label">Custom:</span>';
  html += '<input type="number" class="pomo-custom-inp" id="pomoCustomInp" min="1" max="180" placeholder="min">';
  html += '<button class="pomo-custom-btn" data-subject-action="apply-pomo-custom">Set</button>';
  html += '</div>';
  html += '<div class="pomo-stats-row">';
  html += '<div class="pomo-stat"><div class="pomo-stat-val">' + pomoToday + '</div><div class="pomo-stat-label">Azi</div></div>';
  html += '<div class="pomo-stat"><div class="pomo-stat-val">' + pomoTotal + '</div><div class="pomo-stat-label">Total</div></div>';
  html += '<div class="pomo-stat"><div class="pomo-stat-val">' + (pomoMinTotal >= 60 ? (Math.round(pomoMinTotal/60*10)/10) + 'h' : pomoMinTotal + 'm') + '</div><div class="pomo-stat-label">Focus</div></div>';
  html += '</div>';
  html += '</div></div></div>';

  // --- TAB: LINKURI ---
  html += '<div class="tools-tab-panel" data-tab-panel="links">';
  html += '<div class="panel-body">';
  html += '<div class="link-add-row">';
  html += '<input id="linkName" placeholder="Nume (ex: Colab S4)">';
  html += '<input id="linkUrl" placeholder="https://...">';
  html += '<select id="linkCat"><option value="colab">Colab</option><option value="drive">Drive</option><option value="site">Site</option><option value="video">Video</option><option value="other">Altele</option></select>';
  html += '<button class="link-add-btn" data-subject-action="add-link" data-subject-key="' + key + '">+</button>';
  html += '</div>';
  html += '<div id="linkList" style="display:flex;flex-direction:column;gap:6px;">' + renderLinks(key) + '</div>';
  html += '</div></div>';

  html += '</div>'; // close tools-tabs-wrap

  // === ADVANCED SECTION (collapsed) ===
  html += '<details class="advanced-section anim-d4">';
  html += '<summary class="advanced-section-summary">⚙ Avansat &amp; Resurse</summary>';
  html += '<div class="advanced-section-body">';

  html += renderSubjectStudyPath(key, subject, allPres, todos);
  html += renderInteractiveLearningStudio(key, subject, allPres);

  html += '<div class="panel panel-full" style="margin-bottom:16px;">';
  html += '<div class="panel-head"><span>Progres Cursuri</span>';
  html += '<span style="font-size:.72rem;color:var(--text-muted)">click + / − pentru a actualiza</span></div>';
  html += '<div class="panel-body"><div class="progress-grid" id="progressGrid">' + renderProgress(key, subject) + '</div></div></div>';

  html += '<div class="panel panel-full" style="margin-bottom:16px;">';
  html += '<div class="panel-head"><span>🗂️ Organizator Fișiere</span>';
  html += '<span style="font-size:.72rem;color:var(--text-muted)">ține evidența documentelor</span></div>';
  html += '<div class="panel-body">';
  html += '<div class="file-add-row">';
  html += '<input id="fileName_input" placeholder="Numele fișierului (ex: Curs 3 - Regresie.pdf)">';
  html += '<select id="fileCat"><option value="curs">Curs</option><option value="seminar">Seminar</option><option value="lab">Lab</option><option value="proiect">Proiect</option><option value="examen">Examen</option><option value="altele">Altele</option></select>';
  html += '<button class="link-add-btn" data-subject-action="add-file" data-subject-key="' + key + '">+</button>';
  html += '</div>';
  html += '<div id="fileList">' + renderFileOrganizer(key) + '</div>';
  html += '</div></div>';

  html += '<div class="panel panel-full">';
  html += '<div class="panel-head">' + icon('layers2','sm') + ' <span>Resurse</span></div>';
  html += '<div class="panel-body"><div class="res-list">';
  subject.resources.forEach(function(resource) {
    html += '<div class="res-item">';
    html += '<span class="res-tag tag-' + resource.tag + '">' + resource.tag + '</span>';
    html += '<span>' + resource.label + '</span></div>';
  });
  html += '</div></div></div>';

  html += '</div></details>'; // close advanced-section

  html += '</div>'; // close .anim
  element.innerHTML = html;

  // Setup notes autosave
  var notesArea = document.getElementById('notesArea');
  if (notesArea) {
    var saveTimeout;
    notesArea.addEventListener('input', function() {
      state.notes[key] = notesArea.value;
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(function() {
        saveState();
        var savedIndicator = document.getElementById('noteSaved');
        if (savedIndicator) {
          savedIndicator.classList.add('show');
          setTimeout(function() { savedIndicator.classList.remove('show'); }, 1500);
        }
      }, 500);
    });
  }

  // Setup presentation navigation
  setupPresentationNav(presId, allPres[activeIndex] || null);

  setupSubjectPageInteractions(element, key, subject);

  // Setup drag & drop
  setupDragDrop();

  // Scroll chat to bottom
  var chatMessages = document.getElementById('chatMessages');
  if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;

  // Init pomodoro display
  updatePomoDisplay();

  // Auto-trigger file picker if navigated via "Alege fișier" from dashboard
  if (state.pendingUploadTrigger) {
    state.pendingUploadTrigger = false;
    setTimeout(function() {
      var fileInput = document.getElementById('fileUpload');
      if (fileInput) fileInput.click();
    }, 200);
  }
}

// =============================================
// PRESENTATION RENDERER
// =============================================

// Sanitizare HTML pentru slide-uri generate de AI
function sanitizeSlideHtml(html) {
  if (window.DOMPurify) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'ul', 'ol', 'li', 'div', 'span', 'h2', 'h3', 'h4', 'h5',
                     'strong', 'em', 'code', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
                     'sup', 'sub', 'blockquote'],
      ALLOWED_ATTR: ['style', 'class'],
      FORBID_TAGS: ['script', 'object', 'embed', 'link', 'iframe', 'form', 'input'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'href', 'src']
    });
  }
  // Fallback: strip tags not in safe list
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
             .replace(/on\w+="[^"]*"/gi, '');
}

// =============================================
// PRESENTATION VIEWER — modal fullscreen
// =============================================
let pvState = { slides: [], current: 0, key: null };

function openPresentationViewer(key, presIndex) {
  const allPres = getAllPresentations(key);
  const pres = allPres[presIndex];
  if (!pres || !pres.slides || !pres.slides.length) return;

  pvState = { slides: pres.slides, current: 0, key, presIndex };

  const overlay = document.getElementById('presViewerOverlay');
  const title = document.getElementById('presViewerTitle');
  if (title) title.textContent = pres.title;

  pvRenderSlides();
  pvUpdateUI();

  if (overlay) overlay.classList.add('open');

  // Bug 4 fix: remove before add to prevent accumulation if opened multiple times
  document.removeEventListener('keydown', pvKeyHandler);
  document.addEventListener('keydown', pvKeyHandler);
}

function closePresentationViewer() {
  const overlay = document.getElementById('presViewerOverlay');
  if (overlay) overlay.classList.remove('open');
  document.removeEventListener('keydown', pvKeyHandler);
  // Bug 13 fix: cleanup temporary rich summary keys so they don't
  // accumulate in state.presentations and bloat localStorage
  if (state && state.presentations) {
    Object.keys(state.presentations).forEach(function(k) {
      if (k.startsWith('__richtemp__')) {
        delete state.presentations[k];
      }
    });
  }
}

function pvKeyHandler(e) {
  if (e.key === 'Escape') { closePresentationViewer(); return; }
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); pvNavigate(1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); pvNavigate(-1); }
}

function pvRenderSlides() {
  const stage = document.getElementById('pvStage');
  const dots = document.getElementById('pvDots');
  if (!stage) return;

  stage.innerHTML = pvState.slides.map(function(slide, i) {
    return '<div class="pres-viewer-slide' + (i === 0 ? ' active' : '') + '" data-pvi="' + i + '">' +
      '<div class="slide-tag">' + escapeHtml(slide.tag || ('Slide ' + (i + 1))) + '</div>' +
      '<h2>' + escapeHtml(slide.title) + '</h2>' +
      sanitizeSlideHtml(slide.content) +
      '</div>';
  }).join('');

  if (dots) {
    dots.innerHTML = pvState.slides.map(function(_, i) {
      return '<button class="pres-viewer-dot' + (i === 0 ? ' active' : '') + '" data-pv-dot="' + i + '"></button>';
    }).join('');
  }
}

function pvNavigate(dir) {
  const next = pvState.current + dir;
  if (next < 0 || next >= pvState.slides.length) return;
  pvGoTo(next);
}

function pvGoTo(index) {
  const prev = pvState.current;
  pvState.current = index;

  const slides = document.querySelectorAll('.pres-viewer-slide');
  slides.forEach(function(s, i) {
    s.classList.toggle('active', i === index);
    if (i < index) s.style.transform = 'translateX(-60px)';
    else if (i > index) s.style.transform = 'translateX(60px)';
    else s.style.transform = 'none';
  });

  pvUpdateUI();
}

function pvUpdateUI() {
  const counter = document.getElementById('pvCounter');
  const prev = document.getElementById('pvPrev');
  const next = document.getElementById('pvNext');
  const dots = document.querySelectorAll('.pres-viewer-dot');

  if (counter) counter.textContent = (pvState.current + 1) + ' / ' + pvState.slides.length;
  if (prev) prev.disabled = pvState.current === 0;
  if (next) next.disabled = pvState.current >= pvState.slides.length - 1;
  dots.forEach(function(d, i) { d.classList.toggle('active', i === pvState.current); });
}

// Keep old renderPresentation as stub (used by some paths still)
function renderPresentation(presentation, presId) {
  // Now we use the modal viewer — this just returns empty
  return '';
}

function setupPresentationNav(presId, presentation) { /* noop — handled by modal */ }
function switchPresentation(key, index) {
  state.activePresIndex[key] = index;
  saveState();
  openPresentationViewer(key, index);
}

function deletePresentation(key, id) {
  if (!confirm('Sigur vrei să ștergi această prezentare?')) return;

  state.presentations[key] = (state.presentations[key] || []).filter(function(p) {
    return p.id !== id;
  });

  if ((state.activePresIndex[key] || 0) > 0) {
    state.activePresIndex[key]--;
  }

  saveState();
  renderPage();
  renderSidebar();
}

function setupSubjectPageInteractions(element, key, subject) {
  if (!element) return;

  var fileUpload = element.querySelector('#fileUpload');
  if (fileUpload && !fileUpload.dataset.bound) {
    fileUpload.dataset.bound = 'true';
    fileUpload.addEventListener('change', handleFileUpload);
  }

  element.addEventListener('click', function(event) {
    var actionEl = event.target.closest('[data-subject-action], [data-nav-tab], [data-pv-dot]');
    if (!actionEl || !element.contains(actionEl)) return;

    if (actionEl.dataset.navTab) {
      navigateTo(actionEl.dataset.navTab);
      return;
    }

    if (actionEl.dataset.pvDot) {
      pvGoTo(parseInt(actionEl.dataset.pvDot, 10));
      return;
    }

    var action = actionEl.dataset.subjectAction;
    if (!action) return;

    switch (action) {
      case 'open-presentation':
        openPresentationViewer(actionEl.dataset.subjectKey, parseInt(actionEl.dataset.presIndex, 10));
        return;
      case 'delete-presentation':
        event.stopPropagation();
        deletePresentation(actionEl.dataset.subjectKey, actionEl.dataset.presId);
        return;
      case 'scroll-generator':
        document.getElementById('uploadZone')?.scrollIntoView({ behavior: 'smooth' });
        return;
      case 'remove-uploaded-file':
        removeFile();
        return;
      case 'generate-presentation':
        generatePresentation(actionEl.dataset.subjectKey);
        return;
      case 'export-chat':
        exportChatAsPDF(actionEl.dataset.subjectKey);
        return;
      case 'clear-chat':
        clearChatHistory(actionEl.dataset.subjectKey);
        return;
      case 'send-chat':
        sendChatMessage(actionEl.dataset.subjectKey);
        return;
      case 'add-todo':
        addTodo(actionEl.dataset.subjectKey);
        return;
      case 'toggle-todo':
        toggleTodo(actionEl.dataset.subjectKey, parseInt(actionEl.dataset.todoIndex, 10));
        return;
      case 'delete-todo':
        deleteTodo(actionEl.dataset.subjectKey, parseInt(actionEl.dataset.todoIndex, 10));
        return;
      case 'add-link':
        addLink(actionEl.dataset.subjectKey);
        return;
      case 'delete-link':
        deleteLink(actionEl.dataset.subjectKey, parseInt(actionEl.dataset.linkIndex, 10));
        return;
      case 'toggle-pomodoro':
        togglePomodoro();
        return;
      case 'reset-pomodoro':
        resetPomodoro();
        return;
      case 'set-pomo-preset':
        setPomoPreset(
          parseInt(actionEl.dataset.pomoMinutes, 10),
          actionEl,
          actionEl.dataset.pomoBreak === 'true'
        );
        return;
      case 'apply-pomo-custom':
        applyPomoCustom();
        return;
      case 'add-file':
        addFile(actionEl.dataset.subjectKey);
        return;
      case 'delete-file':
        deleteFile(actionEl.dataset.subjectKey, parseInt(actionEl.dataset.fileIndex, 10));
        return;
      case 'set-progress':
        setProgress(actionEl.dataset.subjectKey, actionEl.dataset.progressKey, event);
        return;
      case 'adjust-progress':
        adjustProgress(
          actionEl.dataset.subjectKey,
          actionEl.dataset.progressKey,
          parseInt(actionEl.dataset.progressDelta, 10)
        );
        return;
      case 'switch-tab':
        var tabName = actionEl.dataset.tab;
        element.querySelectorAll('.tools-tab-btn').forEach(function(btn) {
          btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        element.querySelectorAll('.tools-tab-panel').forEach(function(panel) {
          panel.classList.toggle('active', panel.dataset.tabPanel === tabName);
        });
        if (tabName === 'tutor') {
          var cm = document.getElementById('chatMessages');
          if (cm) cm.scrollTop = cm.scrollHeight;
        }
        return;
      default:
        return;
    }
  });

  element.addEventListener('keydown', function(event) {
    if (event.key !== 'Enter' || event.shiftKey) return;

    if (event.target.id === 'chatInput') {
      event.preventDefault();
      sendChatMessage(key);
      return;
    }

    if (event.target.id === 'todoInput') {
      event.preventDefault();
      addTodo(key);
      return;
    }

    if (event.target.id === 'pomoCustomInp') {
      event.preventDefault();
      applyPomoCustom();
    }
  });
}

// =============================================
// TODOS
// =============================================
function renderTodos(key) {
  var items = state.todos[key] || [];
  if (!items.length) {
    return '<div style="text-align:center;color:var(--text-muted);padding:16px;font-size:.88rem;">Niciun task încă</div>';
  }

  var done = items.filter(function(item) { return item.done; }).length;
  var percent = Math.round(done / items.length * 100);

  var html = '';
  items.forEach(function(item, index) {
    html += '<div class="todo-item">';
    html += '<button class="t-check ' + (item.done ? 'done' : '') + '" data-subject-action="toggle-todo" data-subject-key="' + key + '" data-todo-index="' + index + '"></button>';
    html += '<span class="t-text ' + (item.done ? 'done' : '') + '">' + escapeHtml(item.text) + '</span>';
    html += '<button class="t-del" data-subject-action="delete-todo" data-subject-key="' + key + '" data-todo-index="' + index + '">×</button>';
    html += '</div>';
  });

  html += '<div class="t-progress"><div class="t-bar"><div class="t-fill" style="width:' + percent + '%"></div></div>';
  html += '<div class="t-pct">' + done + '/' + items.length + ' completate</div></div>';

  return html;
}

function addTodo(key) {
  var input = document.getElementById('todoInput');
  var text = input.value.trim();
  if (!text) return;

  if (!state.todos[key]) state.todos[key] = [];
  state.todos[key].push({ text: text, done: false });
  saveState();
  input.value = '';
  document.getElementById('todoList').innerHTML = renderTodos(key);
  renderSidebar();
}

function toggleTodo(key, index) {
  if (state.todos[key] && state.todos[key][index]) {
    state.todos[key][index].done = !state.todos[key][index].done;
    saveState();
    document.getElementById('todoList').innerHTML = renderTodos(key);
    renderSidebar();
  }
}

function deleteTodo(key, index) {
  if (state.todos[key]) {
    state.todos[key].splice(index, 1);
    saveState();
    document.getElementById('todoList').innerHTML = renderTodos(key);
    renderSidebar();
  }
}

// =============================================
// AI CHAT
// =============================================
function renderChatHistory(key) {
  var history = state.chatHistories[key] || [];
  if (!history.length) {
    return '<div class="chat-msg ai">Salut! Sunt tutorul tău AI pentru <strong>' + getSubjects()[key].name + '</strong>. Întreabă-mă orice despre materie — voi explica cât mai plastic și clar.</div>';
  }

  return history.map(function(msg) {
    if (msg.role === 'user') {
      return '<div class="chat-msg user">' + escapeHtml(msg.content) + '</div>';
    } else {
      // Bug 10 fix: re-sanitize AI content at render time
      return '<div class="chat-msg ai">' + formatAIText(msg.content) + '</div>';
    }
  }).join('');
}

async function sendChatMessage(key) {
  if (false) return;

  var input = document.getElementById('chatInput');
  var sendBtn = document.getElementById('chatSendBtn');
  var messagesContainer = document.getElementById('chatMessages');
  var text = input.value.trim();
  if (!text) return;

  // Add user message
  if (!state.chatHistories[key]) state.chatHistories[key] = [];
  state.chatHistories[key].push({ role: 'user', content: text });
  saveState();

  // Update UI
  messagesContainer.innerHTML = renderChatHistory(key);
  input.value = '';
  sendBtn.disabled = true;

  // Typing indicator
  var typingEl = document.createElement('div');
  typingEl.className = 'chat-msg ai';
  typingEl.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  messagesContainer.appendChild(typingEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    // Build API messages
    var apiMessages = state.chatHistories[key]
      .filter(function(m) { return m.role === 'user' || m.role === 'assistant'; })
      .map(function(m) {
        return { role: m.role === 'user' ? 'user' : 'assistant', content: m.content };
      });

    var response = await (async function(){
      var __r = await authFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(window.__shAccessToken ? { 'Authorization': 'Bearer ' + window.__shAccessToken } : {}) },
        credentials: 'include',
        body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: getSubjects()[key].systemPrompt,
        messages: apiMessages
      })
      }); var __d = await __r.json(); return { content: [{ text: __d.content || '' }] }; })();

    var data = response;
    typingEl.remove();

    if (data.content && data.content[0]) {
      var aiText = data.content[0].text;
      var formatted = formatAIText(aiText);
      state.chatHistories[key].push({ role: 'assistant', content: formatted });
      saveState();
    } else if (data.error) {
      state.chatHistories[key].push({ role: 'assistant', content: '[!] Eroare API: ' + data.error.message });
      saveState();
    }
  } catch (err) {
    typingEl.remove();
    state.chatHistories[key].push({ role: 'assistant', content: '[!] Eroare de conexiune: ' + err.message });
    saveState();
  }

  messagesContainer.innerHTML = renderChatHistory(key);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  sendBtn.disabled = false;
}

// =============================================
// FILE UPLOAD & PROCESSING
// =============================================
var uploadedFileText = '';

function handleFileUpload(event) {
  var file = event.target.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  var maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    alert('Fișierul e prea mare (max 10MB)');
    return;
  }

  var extension = file.name.split('.').pop().toLowerCase();
  var statusEl = document.getElementById('summaryStatus');
  if (statusEl) statusEl.textContent = 'Se extrage textul...';

  // Show file info
  var fileInfoEl = document.getElementById('fileInfo');
  var fileNameEl = document.getElementById('fileName');
  var fileSizeEl = document.getElementById('fileSize');
  if (fileInfoEl) fileInfoEl.classList.add('visible');
  if (fileNameEl) fileNameEl.textContent = file.name;
  if (fileSizeEl) fileSizeEl.textContent = formatFileSize(file.size);

  // Auto-fill title
  var titleInput = document.getElementById('presTitle');
  if (titleInput && !titleInput.value) {
    titleInput.value = file.name.replace(/\.[^.]+$/, '');
  }

  if (extension === 'txt' || extension === 'md' || extension === 'csv') {
    var reader = new FileReader();
    reader.onload = function(e) {
      uploadedFileText = e.target.result;
      document.getElementById('summaryInput').value = uploadedFileText.substring(0, 500) +
        (uploadedFileText.length > 500 ? '\n\n... [text complet încărcat — ' + uploadedFileText.length + ' caractere]' : '');
      if (statusEl) statusEl.textContent = '[OK] ' + uploadedFileText.length + ' caractere extrase';
    };
    reader.readAsText(file);

  } else if (extension === 'pdf') {
    var reader = new FileReader();
    reader.onload = async function(e) {
      try {
        if (!window.pdfjsLib) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        var typedArray = new Uint8Array(e.target.result);
        var pdf = await pdfjsLib.getDocument(typedArray).promise;
        var text = '';
        for (var i = 1; i <= pdf.numPages; i++) {
          var page = await pdf.getPage(i);
          var content = await page.getTextContent();
          text += content.items.map(function(item) { return item.str; }).join(' ') + '\n\n';
        }
        uploadedFileText = text.trim();
        document.getElementById('summaryInput').value = uploadedFileText.substring(0, 500) +
          (uploadedFileText.length > 500 ? '\n\n... [PDF complet — ' + pdf.numPages + ' pagini, ' + uploadedFileText.length + ' caractere]' : '');
        if (statusEl) statusEl.textContent = '[OK] PDF: ' + pdf.numPages + ' pagini, ' + uploadedFileText.length + ' caractere';
      } catch (err) {
        if (statusEl) statusEl.textContent = '[!] Eroare PDF: ' + err.message;
        uploadedFileText = '';
      }
    };
    reader.readAsArrayBuffer(file);

  } else if (extension === 'docx' || extension === 'pptx') {
    var reader = new FileReader();
    reader.onload = async function(e) {
      try {
        if (!window.JSZip) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        }
        var zip = await JSZip.loadAsync(e.target.result);
        var text = '';

        if (extension === 'docx') {
          var docXml = await zip.file('word/document.xml')?.async('text');
          if (docXml) {
            text = docXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          }
        } else if (extension === 'pptx') {
          var slideFiles = Object.keys(zip.files)
            .filter(function(f) { return f.match(/ppt\/slides\/slide\d+\.xml/); })
            .sort();
          for (var sf of slideFiles) {
            var slideXml = await zip.file(sf)?.async('text');
            if (slideXml) {
              text += slideXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() + '\n\n';
            }
          }
        }

        uploadedFileText = text.trim();
        document.getElementById('summaryInput').value = uploadedFileText.substring(0, 500) +
          (uploadedFileText.length > 500 ? '\n\n... [' + extension.toUpperCase() + ' complet — ' + uploadedFileText.length + ' caractere]' : '');
        if (statusEl) statusEl.textContent = '[OK] ' + extension.toUpperCase() + ': ' + uploadedFileText.length + ' caractere extrase';
      } catch (err) {
        if (statusEl) statusEl.textContent = '[!] Eroare ' + extension + ': ' + err.message;
        uploadedFileText = '';
      }
    };
    reader.readAsArrayBuffer(file);

  } else {
    if (statusEl) statusEl.textContent = '[!] Format nesuportat: ' + extension;
  }
}

function removeFile() {
  uploadedFileText = '';
  var fileInfoEl = document.getElementById('fileInfo');
  if (fileInfoEl) fileInfoEl.classList.remove('visible');
  var fileInput = document.getElementById('fileUpload');
  if (fileInput) fileInput.value = '';
  document.getElementById('summaryInput').value = '';
  var statusEl = document.getElementById('summaryStatus');
  if (statusEl) statusEl.textContent = '';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function loadScript(src) {
  return new Promise(function(resolve, reject) {
    var script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function setupDragDrop() {
  var zone = document.getElementById('uploadZone');
  if (!zone) return;

  ['dragenter', 'dragover'].forEach(function(eventName) {
    zone.addEventListener(eventName, function(e) {
      e.preventDefault();
      zone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(function(eventName) {
    zone.addEventListener(eventName, function(e) {
      e.preventDefault();
      zone.classList.remove('dragover');
    });
  });

  zone.addEventListener('drop', function(e) {
    var file = e.dataTransfer.files[0];
    if (file) processFile(file);
  });
}

// =============================================
// GENERATE PRESENTATION (AI)
// =============================================
// Try to repair truncated JSON arrays
function repairTruncatedJSON(raw) {
  // Clean markdown fences
  raw = raw.replace(/^```json?\s*/, '').replace(/\s*```$/, '').trim();

  // Try parsing as-is first
  try {
    var parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch(e) {}

  // If truncated, try to close open strings and brackets
  var repaired = raw;

  // Count open quotes — if odd, close the last string
  var quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    repaired += '"';
  }

  // Try closing any open objects/arrays
  var attempts = [
    repaired + '}]',
    repaired + '"}]',
    repaired + '</p>"}]',
    repaired + '</div>"}]',
    repaired + '</li></ul>"}]',
    repaired + '</td></tr></tbody></table>"}]',
  ];

  for (var attempt of attempts) {
    try {
      var parsed = JSON.parse(attempt);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Remove last slide if it looks incomplete (no title or no content)
        var lastSlide = parsed[parsed.length - 1];
        if (!lastSlide.title || !lastSlide.content || lastSlide.content.length < 20) {
          parsed.pop();
        }
        if (parsed.length > 0) return parsed;
      }
    } catch(e) {}
  }

  // Last resort: find the last complete object and close the array
  var lastCompleteObj = raw.lastIndexOf('},');
  if (lastCompleteObj === -1) lastCompleteObj = raw.lastIndexOf('}');
  if (lastCompleteObj > 0) {
    var trimmed = raw.substring(0, lastCompleteObj + 1) + ']';
    try {
      var parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch(e) {}
  }

  return null;
}

// =============================================
// RICH SUMMARY — prompt îmbunătățit + render vizual
// =============================================

// Detectează dacă subiectul are caracter financiar pentru prompt specializat
function isFinanceTopic(subjectFull) {
  const financeKeywords = ['finan', 'banking', 'contab', 'econom', 'burs', 'invest', 'cost', 'profit', 'risc', 'fiscal', 'mccp', 'controll'];
  return financeKeywords.some(k => subjectFull.toLowerCase().includes(k));
}

// Construiește system prompt adaptat domeniului
function buildSummarySystemPrompt(subjectFull, isFinance) {
  const domainHint = isFinance
    ? 'Subiectul este din domeniul financiar/economic. Când e relevant, include formule matematice, relații cauză-efect între variabile financiare, și date numerice exemplificative.'
    : 'Subiectul poate fi din orice domeniu academic (psihologie, drept, medicină, știință etc.). Adaptează tipul de exemple și relații la domeniu.';

  return `Ești un profesor expert care creează fișe de învățare vizuale și structurate.

${domainHint}

IMPORTANT: Răspunde EXCLUSIV cu un obiect JSON valid, fără markdown, fără backticks, fără text înainte sau după JSON.

Structura JSON pe care trebuie să o returnezi:
{
  "title": "Titlul concis al temei",
  "why_it_matters": "1-2 propoziții: de ce contează această temă, unde se aplică",
  "domain_tags": ["tag1", "tag2", "tag3"],
  "layers": [
    { "level": "Intuitiv", "color": "#10d9a0", "text": "Explicație simplă, fără jargon, analogie din viața reală" },
    { "level": "Conceptual", "color": "#4f6ef7", "text": "Explicație academică medie, termeni cheie, logica internă" },
    { "level": "Tehnic", "color": "#a78bfa", "text": "Detaliu tehnic, formule, excepții, nuanțe avansate" }
  ],
  "key_concepts": [
    { "name": "Concept 1", "definition": "Definiție clară și concisă", "color": "#4f6ef7" },
    { "name": "Concept 2", "definition": "...", "color": "#10d9a0" }
  ],
  "formulas": [
    { "expression": "Formula sau relația matematică", "label": "Numele formulei sau ce calculează" }
  ],
  "comparisons": [
    {
      "title": "Titlul comparației",
      "items": [
        { "aspect": "Aspect 1", "a": "Valoare pentru A", "b": "Valoare pentru B" },
        { "aspect": "Aspect 2", "a": "...", "b": "..." }
      ],
      "label_a": "Concept A",
      "label_b": "Concept B"
    }
  ],
  "examples": [
    { "scenario": "Scenariu practic realist", "insight": "Ce înveți din acest exemplu" }
  ],
  "warnings": [
    "Greșeală frecventă sau confuzie tipică despre acest subiect"
  ],
  "pathway": ["Concept anterior", "Acest concept", "Concept următor", "Aplicație"],
  "key_insight": "O propoziție-cheie care rezumă esența temei",
  "chart_suggestion": {
    "type": "bar|line|none",
    "description": "Ce ar arăta graficul dacă ar fi util (sau null dacă nu e relevant)"
  }
}

REGULI STRICTE:
- Toate câmpurile sunt obligatorii (poți lăsa arrays goale [] dacă nu sunt relevante)
- key_concepts: între 3 și 6 concepte
- comparisons: 0 sau 1 comparație (doar dacă există concepte pereche clare)
- examples: 1-2 exemple
- warnings: 1-2 avertismente
- pathway: 3-5 noduri
- Totul în română
- DOAR JSON valid`;
}

async function generatePresentation(key) {
  var inputEl   = document.getElementById('summaryInput');
  var btnEl     = document.getElementById('summaryBtn');
  var statusEl  = document.getElementById('summaryStatus');
  var titleInput = document.getElementById('presTitle');

  var text = uploadedFileText || (inputEl ? inputEl.value.trim() : '');
  if (!text) {
    if (statusEl) statusEl.textContent = '[!] Încarcă un fișier sau lipește text mai întâi';
    return;
  }

  var subjectObj  = getSubjects()[key];
  var subjectFull = subjectObj ? subjectObj.full : key;
  var isFinance   = isFinanceTopic(subjectFull);
  var title = (titleInput && titleInput.value.trim()) || ('Rezumat ' + (new Date().toLocaleDateString('ro')));

  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<span>⏳</span> Se generează fișa...'; }
  if (statusEl) statusEl.textContent = 'Durează ~20-40 secunde...';

  var inputText = text.substring(0, 8000);

  try {
    var res = await authFetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(window.__shAccessToken ? { 'Authorization': 'Bearer ' + window.__shAccessToken } : {})
      },
      credentials: 'include',
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        system: buildSummarySystemPrompt(subjectFull, isFinance),
        messages: [{ role: 'user', content: 'Creează fișa de învățare pentru:\n\n' + inputText }]
      })
    });

    var resData = await res.json();
    var rawText = (resData.content || '').trim();
    var clean   = rawText.replace(/^```json?\s*/m, '').replace(/\s*```$/m, '').trim();

    var summary = null;
    try {
      summary = JSON.parse(clean);
    } catch(e) {
      // Încearcă extragere JSON din mijlocul textului
      var jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { summary = JSON.parse(jsonMatch[0]); } catch(e2) { summary = null; }
      }
    }

    if (summary && summary.title) {
      // Construiește un obiect compatibil cu sistemul existent de prezentări
      // dar cu un slide special care conține rich summary HTML
      var richHtml = buildRichSummaryHtml(summary, isFinance);

      var newPresentation = {
        id:     'pres_' + Date.now(),
        title:  title,
        date:   new Date().toLocaleDateString('ro'),
        isRich: true,  // marker pentru rich summary
        richData: summary,
        slides: [
          { tag: 'Rezumat Vizual', title: summary.title, content: richHtml, isRich: true }
        ]
      };

      if (!state.presentations[key]) state.presentations[key] = [];
      state.presentations[key].push(newPresentation);
      state.activePresIndex[key] = getAllPresentations(key).length - 1;
      saveState();

      uploadedFileText = '';
      if (inputEl) inputEl.value = '';

      if (statusEl) statusEl.textContent = '[OK] Fișă generată!';

      renderPage();
      renderSidebar();
      var newIdx = getAllPresentations(key).length - 1;
      setTimeout(function() { openRichSummaryViewer(key, newIdx); }, 200);
      return;
    } else {
      if (statusEl) statusEl.textContent = '[!] Răspunsul AI nu a putut fi parsat. Încearcă din nou.';
      console.warn('Rich summary parse failed. Raw:', clean.substring(0, 300));
    }
  } catch(err) {
    if (statusEl) statusEl.textContent = '[!] Eroare: ' + err.message;
    console.error(err);
  }

  if (btnEl) {
    btnEl.disabled = false;
    btnEl.innerHTML = '<span>✨</span> Generează Rezumat';
  }
}

// ─────────────────────────────────────────────────────────────────
// Construiește HTML-ul rich summary pentru viewer
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// Convertește datele rich summary într-un array de slide-uri reale
// Fiecare secțiune devine un slide distinct în engine-ul existent
// ─────────────────────────────────────────────────────────────────
function buildRichSummarySlides(s) {
  var slides = [];

  // ── Slide 1: Titlu + De ce contează + Tags + Insight ────────────
  var s1 = '';
  s1 += '<div style="display:flex;flex-direction:column;gap:18px;height:100%;justify-content:center;">';
  s1 += '<div style="text-align:center;">';
  s1 += '<div style="font-size:1.55rem;font-weight:800;color:var(--text-primary);margin-bottom:12px;line-height:1.3;">' + escapeHtml(s.title) + '</div>';
  if (s.why_it_matters) {
    s1 += '<div style="font-size:.95rem;color:var(--text-secondary);max-width:540px;margin:0 auto;line-height:1.65;">' + escapeHtml(s.why_it_matters) + '</div>';
  }
  if (s.domain_tags && s.domain_tags.length) {
    s1 += '<div style="display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-top:16px;">';
    s.domain_tags.forEach(function(t) {
      s1 += '<span style="background:var(--accent-muted);color:var(--accent);border:1px solid var(--accent-border);border-radius:20px;padding:3px 13px;font-size:.75rem;font-weight:600;">' + escapeHtml(t) + '</span>';
    });
    s1 += '</div>';
  }
  s1 += '</div>';
  if (s.key_insight) {
    s1 += '<div style="background:var(--accent-muted);border:1px solid var(--accent-border);border-radius:18px;padding:16px 20px;text-align:center;color:var(--text-primary);font-size:.9rem;line-height:1.6;"><strong>Ideea centrală:</strong> ' + escapeHtml(s.key_insight) + '</div>';
  }
  s1 += '</div>';
  slides.push({ tag: 'Intro', title: s.title, content: s1 });

  // ── Slide 2: Explicații pe niveluri ─────────────────────────────
  if (s.layers && s.layers.length) {
    var s2 = '';
    s2 += '<div style="display:flex;flex-direction:column;gap:12px;">';
    s2 += '<div style="font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:2px;">Explicație pe niveluri</div>';
    var layerColors = { 'Intuitiv': '#10d9a0', 'Conceptual': '#4f6ef7', 'Tehnic': '#a78bfa' };
    s.layers.forEach(function(layer) {
      var c = layer.color || layerColors[layer.level] || '#4f6ef7';
      s2 += '<details open style="background:' + c + '11;border:1px solid ' + c + '33;border-radius:18px;padding:14px 16px;">';
      s2 += '<summary style="list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;"><span style="background:' + c + '22;color:' + c + ';border:1px solid ' + c + '44;border-radius:20px;display:inline-block;padding:2px 11px;font-size:.72rem;font-weight:700;">' + escapeHtml(layer.level) + '</span><span style="font-size:.78rem;color:var(--text-muted)">deschide sau restrânge</span></summary>';
      s2 += '<div style="color:var(--text-secondary);font-size:.87rem;line-height:1.65;margin-top:12px;">' + escapeHtml(layer.text) + '</div>';
      s2 += '</details>';
    });
    s2 += '</div>';
    slides.push({ tag: 'Niveluri', title: 'Explicație pe niveluri', content: s2 });
  }

  // ── Slide 3: Concepte cheie ──────────────────────────────────────
  if (s.key_concepts && s.key_concepts.length) {
    var s3 = '';
    s3 += '<div>';
    s3 += '<div style="font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px;">Concepte cheie</div>';
    s3 += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;">';
    var conceptColors = ['#4f6ef7','#10d9a0','#a78bfa','#f5a623','#38bdf8','#ef4565'];
    s.key_concepts.forEach(function(c, i) {
      var col = c.color || conceptColors[i % conceptColors.length];
      s3 += '<div style="border-top:3px solid ' + col + ';background:var(--bg-raised);border-radius:8px;padding:12px 14px;">';
      s3 += '<div style="font-weight:700;color:' + col + ';margin-bottom:6px;font-size:.84rem;">' + escapeHtml(c.name) + '</div>';
      s3 += '<div style="color:var(--text-secondary);font-size:.79rem;line-height:1.55;">' + escapeHtml(c.definition) + '</div>';
      s3 += '</div>';
    });
    s3 += '</div></div>';
    if (s.pathway && s.pathway.length) {
      s3 += '<div style="margin-top:18px;background:var(--bg-surface);border:1px solid var(--border);border-radius:18px;padding:16px 18px;">';
      s3 += '<div style="font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;">Cum legi ideile</div>';
      s3 += '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">';
      s.pathway.forEach(function(node, i) {
        if (i > 0) s3 += '<span style="color:var(--text-muted)">→</span>';
        s3 += '<span style="padding:7px 12px;border-radius:999px;background:var(--bg-overlay);border:1px solid var(--border);font-size:.8rem;">' + escapeHtml(node) + '</span>';
      });
      s3 += '</div></div>';
    }
    slides.push({ tag: 'Concepte', title: 'Concepte cheie', content: s3 });
  }

  // ── Slide 4: Formule + Comparații ───────────────────────────────
  var s4 = '';
  var hasS4 = false;

  if (s.formulas && s.formulas.length) {
    hasS4 = true;
    s4 += '<div style="margin-bottom:18px;">';
    s4 += '<div style="font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;">Formule</div>';
    s4 += '<div style="display:flex;flex-direction:column;gap:8px;">';
    s.formulas.forEach(function(f) {
      s4 += '<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:12px 16px;font-family:var(--font-mono,monospace);font-size:.88rem;color:var(--accent);">' + escapeHtml(f.expression) + '</div>';
      if (f.label) s4 += '<div style="font-size:.73rem;color:var(--text-muted);margin-top:-4px;padding-left:4px;">' + escapeHtml(f.label) + '</div>';
    });
    s4 += '</div></div>';
  }

  if (s.comparisons && s.comparisons.length) {
    hasS4 = true;
    s.comparisons.forEach(function(comp) {
      s4 += '<div>';
      s4 += '<div style="font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;">' + escapeHtml(comp.title || 'Comparație') + '</div>';
      s4 += '<div style="overflow-x:auto;">';
      s4 += '<table style="width:100%;border-collapse:collapse;font-size:.81rem;">';
      s4 += '<thead><tr style="border-bottom:1px solid var(--border);">';
      s4 += '<th style="text-align:left;padding:8px 10px;color:var(--text-muted);font-weight:600;">Aspect</th>';
      s4 += '<th style="text-align:left;padding:8px 10px;color:var(--accent);font-weight:600;">' + escapeHtml(comp.label_a || 'A') + '</th>';
      s4 += '<th style="text-align:left;padding:8px 10px;color:#a78bfa;font-weight:600;">' + escapeHtml(comp.label_b || 'B') + '</th>';
      s4 += '</tr></thead><tbody>';
      if (comp.items) {
        comp.items.forEach(function(row) {
          s4 += '<tr style="border-bottom:1px solid var(--border-subtle);">';
          s4 += '<td style="padding:8px 10px;font-weight:600;color:var(--text-secondary);">' + escapeHtml(row.aspect) + '</td>';
          s4 += '<td style="padding:8px 10px;color:var(--text-secondary);">' + escapeHtml(row.a) + '</td>';
          s4 += '<td style="padding:8px 10px;color:var(--text-secondary);">' + escapeHtml(row.b) + '</td>';
          s4 += '</tr>';
        });
      }
      s4 += '</tbody></table></div></div>';
    });
  }

  if (hasS4) {
    slides.push({ tag: 'Formule & Comparații', title: 'Formule și comparații', content: s4 });
  }

  // ── Slide 5: Exemple + Avertismente + Pathway ───────────────────
  var s5 = '';
  var hasS5 = false;

  if (s.examples && s.examples.length) {
    hasS5 = true;
    s5 += '<div style="margin-bottom:16px;">';
    s5 += '<div style="font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;">Exemple practice</div>';
    s5 += '<div style="display:flex;flex-direction:column;gap:10px;">';
    s.examples.forEach(function(ex) {
      s5 += '<div style="background:rgba(79,110,247,.08);border:1px solid rgba(79,110,247,.2);border-radius:8px;padding:12px 14px;">';
      s5 += '<div style="font-size:.67rem;font-weight:700;text-transform:uppercase;color:#4f6ef7;margin-bottom:6px;letter-spacing:.05em;">Exemplu real</div>';
      s5 += '<div style="color:var(--text-secondary);font-size:.84rem;line-height:1.55;">' + escapeHtml(ex.scenario) + '</div>';
      if (ex.insight) {
        s5 += '<div style="margin-top:8px;color:rgba(16,217,160,0.9);font-size:.79rem;">→ ' + escapeHtml(ex.insight) + '</div>';
      }
      s5 += '</div>';
    });
    s5 += '</div></div>';
  }

  if (s.warnings && s.warnings.length) {
    hasS5 = true;
    s5 += '<div style="margin-bottom:16px;">';
    s5 += '<div style="font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;">Greșeli frecvente</div>';
    s5 += '<div style="display:flex;flex-direction:column;gap:8px;">';
    s.warnings.forEach(function(w) {
      s5 += '<div style="background:rgba(239,69,101,.08);border:1px solid rgba(239,69,101,.2);border-radius:8px;padding:10px 14px;">';
      s5 += '<div style="font-size:.67rem;font-weight:700;text-transform:uppercase;color:#ef4565;margin-bottom:4px;letter-spacing:.05em;">Atenție</div>';
      s5 += '<div style="color:var(--text-secondary);font-size:.81rem;line-height:1.5;">' + escapeHtml(w) + '</div>';
      s5 += '</div>';
    });
    s5 += '</div></div>';
  }

  if (s.pathway && s.pathway.length) {
    hasS5 = true;
    s5 += '<div>';
    s5 += '<div style="font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;">Traseu conceptual</div>';
    s5 += '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;">';
    s.pathway.forEach(function(node, i) {
      if (i > 0) s5 += '<span style="color:var(--text-muted);font-size:1rem;padding:0 2px;">→</span>';
      s5 += '<span style="background:var(--bg-raised);border:1px solid var(--border);border-radius:20px;padding:5px 13px;font-size:.8rem;color:var(--text-primary);">' + escapeHtml(node) + '</span>';
    });
    s5 += '</div></div>';
  }

  if (hasS5) {
    slides.push({ tag: 'Exemple & Takeaways', title: 'Exemple, greșeli și traseu', content: s5 });
  }

  // Fallback: dacă n-am niciun slide din motive necunoscute
  if (slides.length === 0) {
    slides.push({ tag: 'Rezumat', title: s.title || 'Rezumat', content: '<div style="color:var(--text-secondary);padding:20px;">Nu s-au putut genera slide-uri.</div>' });
  }

  return slides;
}

// ─────────────────────────────────────────────────────────────────
// buildRichSummaryHtml — păstrat pentru compatibilitate cu prezentări
// vechi salvate ca un singur slide HTML. Nu mai e folosit pentru
// prezentări noi; buildRichSummarySlides() e calea principală.
// ─────────────────────────────────────────────────────────────────
function buildRichSummaryHtml(s, isFinance) {
  var allSlides = buildRichSummarySlides(s);
  return allSlides.map(function(sl) { return sl.content; }).join(
    '<hr style="border:none;border-top:1px solid var(--border);margin:24px 0;">'
  );
}

// ─────────────────────────────────────────────────────────────────
// Deschide summary ca slideshow real folosind engine-ul existent
// ─────────────────────────────────────────────────────────────────
function openRichSummaryViewer(key, presIndex) {
  var allPres = getAllPresentations(key);
  var pres    = allPres[presIndex];
  if (!pres) return;

  // Fallback la viewer clasic dacă nu e rich
  if (!pres.isRich) {
    var prev = document.getElementById('pvPrev');
    var next = document.getElementById('pvNext');
    if (prev) prev.style.display = '';
    if (next) next.style.display = '';
    _originalOpenPresViewer(key, presIndex);
    return;
  }

  // Construiește slide-urile din richData (dacă există) sau din conținutul salvat
  var realSlides;
  if (pres.richData) {
    // Cale normală: avem datele structurate → generăm slide-uri live
    realSlides = buildRichSummarySlides(pres.richData);
  } else if (pres.slides && pres.slides.length > 1) {
    // Prezentare deja convertită (slide-uri multiple salvate)
    realSlides = pres.slides;
  } else {
    // Fallback vechi: un singur slide HTML concatenat
    realSlides = pres.slides || [];
  }

  // Creăm o cheie temporară pentru engine-ul clasic
  var tempKey = '__richtemp__' + key;
  if (!state.presentations) state.presentations = {};
  state.presentations[tempKey] = [{
    id:     pres.id + '_temp',
    title:  pres.title,
    date:   pres.date,
    isRich: false,   // forțăm să fie tratat ca prezentare normală
    slides: realSlides
  }];

  // Asigurăm că butoanele prev/next sunt vizibile
  var prev = document.getElementById('pvPrev');
  var next = document.getElementById('pvNext');
  if (prev) prev.style.display = '';
  if (next) next.style.display = '';

  _originalOpenPresViewer(tempKey, 0);
}

// ─────────────────────────────────────────────────────────────────
// Override openPresentationViewer — detectează rich summaries
// ─────────────────────────────────────────────────────────────────
var _originalOpenPresViewer = openPresentationViewer;
openPresentationViewer = function(key, presIndex) {
  var allPres = getAllPresentations(key);
  var pres    = allPres ? allPres[presIndex] : null;
  if (pres && pres.isRich) {
    openRichSummaryViewer(key, presIndex);
  } else {
    var prev = document.getElementById('pvPrev');
    var next = document.getElementById('pvNext');
    if (prev) prev.style.display = '';
    if (next) next.style.display = '';
    _originalOpenPresViewer(key, presIndex);
  }
};


// =============================================
// QUICK LINKS
// =============================================
// Sanitizare URL — blochează javascript: și data: scheme-uri periculoase
function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    const allowed = ['https:', 'http:', 'mailto:'];
    if (!allowed.includes(parsed.protocol)) return '#';
    return url;
  } catch(e) {
    return '#';
  }
}

function renderLinks(key) {
  var links = state.links[key] || [];
  if (!links.length) {
    return '<div style="text-align:center;color:var(--text-muted);padding:12px;font-size:.85rem;">Niciun link adăugat</div>';
  }

  var catIcons = { colab: '◆', drive: '▣', site: '⊕', video: '▶', other: '↗' };

  return links.map(function(link, index) {
    return '<div class="link-item">' +
      '<span>' + (catIcons[link.cat] || '↗') + '</span>' +
      '<span class="link-cat">' + link.cat + '</span>' +
      '<a href="' + sanitizeUrl(link.url) + '" target="_blank" rel="noopener noreferrer" title="' + escapeHtml(link.url) + '">' + escapeHtml(link.name) + '</a>' +
      '<button class="link-del" data-subject-action="delete-link" data-subject-key="' + key + '" data-link-index="' + index + '">×</button>' +
      '</div>';
  }).join('');
}

function addLink(key) {
  var nameInput = document.getElementById('linkName');
  var urlInput = document.getElementById('linkUrl');
  var catSelect = document.getElementById('linkCat');

  var name = nameInput.value.trim();
  var url = urlInput.value.trim();
  var cat = catSelect.value;

  if (!name || !url) return;

  // Auto-add https if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  if (!state.links[key]) state.links[key] = [];
  state.links[key].push({ name: name, url: url, cat: cat });
  saveState();

  nameInput.value = '';
  urlInput.value = '';
  document.getElementById('linkList').innerHTML = renderLinks(key);
}

function deleteLink(key, index) {
  if (state.links[key]) {
    state.links[key].splice(index, 1);
    saveState();
    document.getElementById('linkList').innerHTML = renderLinks(key);
  }
}

// =============================================
// PROGRESS TRACKER
// =============================================
function renderProgress(key, subject) {
  var progressData = state.progress[key] || {};
  var items = subject.resources.filter(function(r) {
    return r.tag === 'slides' || r.tag === 'lab';
  });

  if (!items.length) {
    return '<div style="color:var(--text-muted);font-size:.85rem;">Nicio resursă de urmărit</div>';
  }

  // Add a total courses tracker
  var totalCourses = items.length;
  var html = '';

  items.forEach(function(item, index) {
    var itemKey = item.tag + '_' + index;
    var value = progressData[itemKey] || 0;
    var maxVal = 100;

    html += '<div class="progress-row">';
    html += '<span class="progress-label">' + (item.tag === 'slides' ? '📘' : '🔬') + ' ' + item.label.substring(0, 30) + (item.label.length > 30 ? '...' : '') + '</span>';
    html += '<div class="progress-bar-wrap" data-subject-action="set-progress" data-subject-key="' + key + '" data-progress-key="' + itemKey + '">';
    html += '<div class="progress-bar-inner" style="width:' + value + '%"></div>';
    html += '</div>';
    html += '<span class="progress-pct">' + value + '%</span>';
    html += '<div class="progress-btns">';
    html += '<button class="progress-btn" data-subject-action="adjust-progress" data-subject-key="' + key + '" data-progress-key="' + itemKey + '" data-progress-delta="-10">−</button>';
    html += '<button class="progress-btn" data-subject-action="adjust-progress" data-subject-key="' + key + '" data-progress-key="' + itemKey + '" data-progress-delta="10">+</button>';
    html += '</div>';
    html += '</div>';
  });

  return html;
}

function adjustProgress(key, itemKey, delta) {
  if (!state.progress[key]) state.progress[key] = {};
  var current = state.progress[key][itemKey] || 0;
  var newVal = Math.max(0, Math.min(100, current + delta));
  state.progress[key][itemKey] = newVal;
  saveState();

  // Re-render just the progress section
  var subject = getSubjects()[key];
  document.getElementById('progressGrid').innerHTML = renderProgress(key, subject);
}

function setProgress(key, itemKey, event) {
  var rect = event.currentTarget.getBoundingClientRect();
  var clickX = event.clientX - rect.left;
  var percent = Math.round((clickX / rect.width) * 100);
  percent = Math.max(0, Math.min(100, Math.round(percent / 5) * 5)); // Snap to 5%

  if (!state.progress[key]) state.progress[key] = {};
  state.progress[key][itemKey] = percent;
  saveState();

  var subject = getSubjects()[key];
  document.getElementById('progressGrid').innerHTML = renderProgress(key, subject);
}

// =============================================
// POMODORO TIMER — v2
// =============================================
var pomoInterval = null;
var pomoTimeLeft = 1500;
var pomoTotalTime = 1500; // for ring calculation
var pomoRunning = false;
var pomoWorkMinutes = 25;
var pomoIsBreak = false;

// Web Audio — beep on finish
function pomoPlayDone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (freq, start, dur, gain) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      g.gain.setValueAtTime(gain, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };
    beep(528, 0,    0.25, 0.4);
    beep(660, 0.28, 0.25, 0.35);
    beep(792, 0.56, 0.4,  0.3);
  } catch(e) {}
}

function togglePomodoro() {
  if (pomoRunning) {
    clearInterval(pomoInterval);
    pomoRunning = false;
    var btn = document.getElementById('pomoStartBtn');
    if (btn) btn.innerHTML = icon('activity','sm') + ' Start';
  } else {
    pomoRunning = true;
    var btn = document.getElementById('pomoStartBtn');
    if (btn) btn.innerHTML = icon('activity','sm') + ' Pauză';

    pomoInterval = setInterval(function() {
      pomoTimeLeft--;

      if (pomoTimeLeft <= 0) {
        clearInterval(pomoInterval);
        pomoRunning = false;
        pomoPlayDone();

        if (!pomoIsBreak) {
          // Logged completed focus session
          if (!state.pomoLog) state.pomoLog = [];
          const today = new Date().toISOString().split('T')[0];
          state.pomoLog.push({ date: today, minutes: pomoWorkMinutes, type: 'focus' });
          saveState();
          awardXP(20, 'Sesiune Pomodoro completată');
          openPomoDone(false, pomoWorkMinutes);
        } else {
          openPomoDone(true, Math.round(pomoTotalTime / 60));
        }

        var btn2 = document.getElementById('pomoStartBtn');
        if (btn2) btn2.innerHTML = icon('activity','sm') + ' Start';
        return;
      }

      updatePomoDisplay();
    }, 1000);
  }
}

function openPomoDone(isBreak, minutes) {
  const overlay = document.getElementById('pomoDoneOverlay');
  const ring    = document.getElementById('pomoDoneRing');
  const title   = document.getElementById('pomoDoneTitle');
  const sub     = document.getElementById('pomoDoneSub');
  const nextBtn = document.getElementById('pomoDoneNext');
  const iconEl  = document.getElementById('pomoDoneIcon');

  if (!overlay) return;

  if (isBreak) {
    ring.className = 'pomo-done-icon-wrap break-done';
    ring.style.background    = 'rgba(16,217,160,0.1)';
    ring.style.borderColor   = 'rgba(16,217,160,0.25)';
    iconEl.style.color       = 'var(--green)';
    title.textContent        = 'Pauza s-a terminat!';
    sub.textContent          = 'Gata de o nouă sesiune de focus?';
    nextBtn.textContent      = 'Start Focus';
    nextBtn.className        = 'pomo-done-btn primary';
  } else {
    ring.className = 'pomo-done-icon-wrap';
    ring.style.background    = 'rgba(79,110,247,0.1)';
    ring.style.borderColor   = 'rgba(79,110,247,0.25)';
    iconEl.style.color       = 'var(--accent)';
    title.textContent        = minutes + ' min — Bine făcut!';
    sub.textContent          = 'Ia o pauză meritată, apoi continuă.';
    nextBtn.textContent      = 'Start Pauză 5 min';
    nextBtn.className        = 'pomo-done-btn primary green';
  }

  overlay.classList.add('open');

  if (Notification.permission === 'granted') {
    new Notification(isBreak ? 'Pauza s-a terminat!' : 'Pomodoro ' + minutes + ' min terminat!', {
      body: isBreak ? 'Gata de focus.' : 'Ia o pauză meritată.'
    });
  }
}

function closePomoDone() {
  document.getElementById('pomoDoneOverlay')?.classList.remove('open');
}

function pomoRestartSame() {
  closePomoDone();
  resetPomodoro();
  setTimeout(togglePomodoro, 200);
}

function pomoDoneStartNext() {
  closePomoDone();
  if (pomoIsBreak) {
    setPomoPreset(pomoWorkMinutes, null, false);
  } else {
    setPomoPreset(5, null, true);
  }
  setTimeout(togglePomodoro, 300);
}

function resetPomodoro() {
  clearInterval(pomoInterval);
  pomoRunning = false;
  pomoTimeLeft = pomoWorkMinutes * 60;
  pomoTotalTime = pomoWorkMinutes * 60;
  pomoIsBreak = false;

  var btn = document.getElementById('pomoStartBtn');
  if (btn) btn.innerHTML = icon('activity','sm') + ' Start';

  var modeEl = document.getElementById('pomoMode');
  if (modeEl) { modeEl.textContent = 'Focus'; modeEl.className = 'pomo-mode'; }

  updatePomoDisplay();
}

function setPomoPreset(minutes, btnEl, isBreak) {
  clearInterval(pomoInterval);
  pomoRunning = false;
  pomoIsBreak = !!isBreak;
  pomoTimeLeft = minutes * 60;
  pomoTotalTime = minutes * 60;

  if (!isBreak) pomoWorkMinutes = minutes;

  var modeEl = document.getElementById('pomoMode');
  if (modeEl) {
    modeEl.textContent = isBreak ? 'Pauză' : 'Focus';
    modeEl.className   = 'pomo-mode' + (isBreak ? ' break' : '');
  }

  var btn = document.getElementById('pomoStartBtn');
  if (btn) btn.innerHTML = icon('activity','sm') + ' Start';

  document.querySelectorAll('.pomo-preset').forEach(function(b) { b.classList.remove('active'); });
  if (btnEl) btnEl.classList.add('active');

  updatePomoDisplay();
}

function applyPomoCustom() {
  var inp = document.getElementById('pomoCustomInp');
  if (!inp) return;
  var val = parseInt(inp.value, 10);
  if (!val || val < 1 || val > 180) {
    showToast('Timp invalid', 'Introdu un număr între 1 și 180 minute.', 'warning', 3000);
    return;
  }
  document.querySelectorAll('.pomo-preset').forEach(b => b.classList.remove('active'));
  setPomoPreset(val, null, val <= 15 && !!inp.dataset.break);
  inp.value = '';
  showToast(val + ' min setat', pomoIsBreak ? 'Mod pauză activat.' : 'Mod focus activat.', 'info', 2000);
}

function updatePomoDisplay() {
  var minutes = Math.floor(pomoTimeLeft / 60);
  var seconds = pomoTimeLeft % 60;
  var display = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

  var timeEl = document.getElementById('pomoTime');
  if (timeEl) timeEl.textContent = display;

  // Update SVG ring
  var ring = document.getElementById('pomoRingFill');
  if (ring) {
    var circumference = 2 * Math.PI * 70; // r=70
    var progress = pomoTotalTime > 0 ? pomoTimeLeft / pomoTotalTime : 1;
    var offset = circumference * (1 - progress);
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = offset;
    ring.className = 'pomo-ring-fill' + (pomoIsBreak ? ' break' : '');
  }

  // Tab title while running
  if (pomoRunning) {
    document.title = display + ' — ' + (pomoIsBreak ? 'Pauză' : 'Focus') + ' · Real Study';
  } else {
    document.title = 'Real Study';
  }
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// Initialize ring on load
setTimeout(updatePomoDisplay, 100);

// =============================================
// FILE ORGANIZER
// =============================================
function renderFileOrganizer(key) {
  var files = state.files[key] || [];
  if (!files.length) {
    return '<div style="text-align:center;color:var(--text-muted);padding:12px;font-size:.85rem;">Niciun fișier adăugat</div>';
  }

  var catColors = {
    curs: { bg: 'var(--accent-muted)', color: 'var(--accent)', icon: 'book' },
    seminar: { bg: 'var(--green-muted)', color: 'var(--green)', icon: '📗' },
    lab: { bg: 'var(--amber-muted)', color: 'var(--amber)', icon: 'book' },
    proiect: { bg: 'var(--red-muted)', color: 'var(--red)', icon: 'book' },
    examen: { bg: 'var(--blue-muted)', color: 'var(--blue)', icon: '📓' },
    altele: { bg: 'var(--accent-muted)', color: 'var(--text-muted)', icon: 'file' }
  };

  // Sort by category
  var sorted = files.slice().sort(function(a, b) {
    var catOrder = ['curs', 'seminar', 'lab', 'proiect', 'examen', 'altele'];
    return catOrder.indexOf(a.cat) - catOrder.indexOf(b.cat);
  });

  var html = '<div class="file-list">';
  var currentCat = '';

  sorted.forEach(function(file) {
    var cat = catColors[file.cat] || catColors.altele;

    if (file.cat !== currentCat) {
      currentCat = file.cat;
      html += '<div style="font-size:.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;padding:8px 0 4px;margin-top:8px;">' + cat.icon + ' ' + file.cat + '</div>';
    }

    // Find original index for deletion
    var origIndex = files.indexOf(file);

    html += '<div class="file-item">';
    html += '<span class="file-icon">' + cat.icon + '</span>';
    html += '<span class="file-name">' + escapeHtml(file.name) + '</span>';
    html += '<span class="file-cat-badge" style="background:' + cat.bg + ';color:' + cat.color + '">' + file.cat + '</span>';
    html += '<span class="file-date">' + file.date + '</span>';
    html += '<button class="file-del" data-subject-action="delete-file" data-subject-key="' + key + '" data-file-index="' + origIndex + '">×</button>';
    html += '</div>';
  });

  html += '</div>';
  return html;
}

function addFile(key) {
  var nameInput = document.getElementById('fileName_input');
  var catSelect = document.getElementById('fileCat');

  var name = nameInput.value.trim();
  var cat = catSelect.value;

  if (!name) return;

  if (!state.files[key]) state.files[key] = [];
  state.files[key].push({
    name: name,
    cat: cat,
    date: new Date().toLocaleDateString('ro')
  });
  saveState();

  nameInput.value = '';
  document.getElementById('fileList').innerHTML = renderFileOrganizer(key);
}

function deleteFile(key, index) {
  if (state.files[key]) {
    state.files[key].splice(index, 1);
    saveState();
    document.getElementById('fileList').innerHTML = renderFileOrganizer(key);
  }
}

// =============================================
// CHAT HISTORY — CLEAR & EXPORT PDF
// =============================================

// Sterge istoricul chat per materie
function clearChatHistory(key) {
  if (!confirm('Sigur vrei să ștergi istoricul conversației cu AI Tutor?')) return;
  state.chatHistories[key] = [];
  saveState();
  renderPage();
}

// Exporta conversatia cu AI ca PDF (folosind print dialog)
async function exportChatAsPDF(key) {
  const subject = getSubjects()[key];
  const history = state.chatHistories[key] || [];
  if (!history.length) {
    alert('Nu există conversații de exportat.');
    return;
  }

  // Construim HTML-ul pentru export
  const exportDate = new Date().toLocaleDateString('ro', { year: 'numeric', month: 'long', day: 'numeric' });
  const exportTime = new Date().toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' });

  let messagesHtml = '';
  history.forEach(function(msg) {
    if (msg.role === 'user') {
      messagesHtml += `
        <div style="margin-bottom:16px;">
          <div style="font-size:11px;font-weight:700;color:#6554d4;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">👤 Tu</div>
          <div style="background:#f4f2ee;border-radius:8px;padding:12px 16px;font-size:14px;line-height:1.6;">${escapeHtml(msg.content)}</div>
        </div>`;
    } else {
      messagesHtml += `
        <div style="margin-bottom:16px;">
          <div style="font-size:11px;font-weight:700;color:#1a1a28;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">AI Tutor</div>
          <div style="background:#ffffff;border:1px solid #e8e4dc;border-radius:8px;padding:12px 16px;font-size:14px;line-height:1.6;">${msg.content}</div>
        </div>`;
    }
  });

  // Deschidem o fereastra noua cu continut printabil
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ro">
    <head>
      <meta charset="UTF-8">
      <title>Real Study — ${subject.name} Chat Export</title>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: var(--font-body);
          color: #1a1a28;
          background: #fff;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          border-bottom: 2px solid #6554d4;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .logo {
          font-size: 20px;
          font-weight: 800;
          color: #6554d4;
        }
        .meta {
          font-size: 12px;
          color: #9494a8;
        }
        .title {
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .subtitle {
          font-size: 14px;
          color: #5c5c72;
        }
        .stats-bar {
          display: flex;
          gap: 20px;
          padding: 14px 16px;
          background: #f4f2ee;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 13px;
        }
        .stat { color: #5c5c72; }
        .stat strong { color: #1a1a28; }
        .messages { }
        .footer {
          margin-top: 30px;
          padding-top: 16px;
          border-top: 1px solid #e8e4dc;
          font-size: 11px;
          color: #9494a8;
          text-align: center;
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-top">
          <div class="logo">Real Study</div>
          <div class="meta">Exportat: ${exportDate}, ${exportTime}</div>
        </div>
        <div class="title">AI Tutor — ${subject.name}</div>
        <div class="subtitle">${subject.full}</div>
      </div>

      <div class="stats-bar">
        <div class="stat"><strong>${history.filter(m => m.role === 'user').length}</strong> întrebări</div>
        <div class="stat"><strong>${history.filter(m => m.role === 'assistant').length}</strong> răspunsuri</div>
        <div class="stat"><strong>${history.length}</strong> mesaje total</div>
      </div>

      <div class="messages">
        ${messagesHtml}
      </div>

      <div class="footer">
        Real Study · Generat cu Claude by Anthropic
      </div>

      <scr" + "ipt>
        // Auto-print la deschidere
        window.onload = function() {
          setTimeout(function() { window.print(); }, 500);
        };
      <\/scr" + "ipt>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// =============================================
// QUIZ MODE — PAGINA PRINCIPALA
// =============================================
