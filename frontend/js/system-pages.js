function renderCalendarPage(element) {
  let html = '<div class="anim">';
  html += '<div class="dash-hero" style="padding:32px 20px 24px">';
  html += '<h2>' + icon('calendar','sm') + ' Calendar Sesiune</h2>';
  html += '<p>Countdown la examene și planificator de studiu</p>';
  html += '</div>';

  // Countdown cards pentru examene
  const exams = state.exams || [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (exams.length > 0) {
    html += '<div class="exam-countdown-grid anim-d1">';
    exams.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });

    exams.forEach(function(exam, index) {
      const examDate = new Date(exam.date);
      examDate.setHours(0, 0, 0, 0);
      const diffMs = examDate - now;
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      let urgency = 'ok';
      if (diffDays < 0) urgency = 'past';
      else if (diffDays <= 3) urgency = 'urgent';
      else if (diffDays <= 7) urgency = 'soon';

      const subject = getSubjects()[exam.subject];

      html += '<div class="exam-countdown-card ' + urgency + '">';
      html += '<button class="ecc-del" data-cal-action="delete-exam" data-exam-index="' + index + '">✕</button>';
      html += '<div class="ecc-subject">' + (subject ? subjectIcon(subject,'xs') + ' ' + subject.name : exam.subject) + '</div>';
      html += '<div class="ecc-name">' + escapeHtml(exam.name) + '</div>';

      if (diffDays < 0) {
        html += '<div class="ecc-days" style="color:var(--text-muted)">-</div>';
        html += '<div class="ecc-days-label">Trecut</div>';
      } else if (diffDays === 0) {
        html += '<div class="ecc-days" style="color:var(--red)">AZI</div>';
        html += '<div class="ecc-days-label">Mult succes! 💪</div>';
      } else {
        html += '<div class="ecc-days">' + diffDays + '</div>';
        html += '<div class="ecc-days-label">' + (diffDays === 1 ? 'zi rămase' : 'zile rămase') + '</div>';
      }

      html += '<div class="ecc-date">📅 ' + examDate.toLocaleDateString('ro', { weekday: 'long', day: 'numeric', month: 'long' }) + '</div>';

      if (exam.room) {
        html += '<div class="ecc-date" style="margin-top:4px;">🏛️ ' + escapeHtml(exam.room) + '</div>';
      }
      html += '</div>';
    });

    html += '</div>';
  }

  // Form adaugare examen + calendar mini
  html += '<div class="calendar-layout anim-d2">';

  // Stanga: form + plan
  html += '<div>';

  html += '<div class="add-exam-form">';
  html += '<h3>' + icon('plus','sm') + ' Adaugă Examen</h3>';
  html += '<div class="exam-form-row">';
  html += '<input class="todo-inp" id="examName" placeholder="Ex: Examen parțial MAP" style="width:100%;">';
  html += '<select class="todo-inp" id="examSubject" style="width:100%;">';
  html += '<option value="">— Materie —</option>';
  for (const [key, subject] of Object.entries(getSubjects())) {
    html += '<option value="' + key + '">' + subject.name + '</option>';
  }
  html += '</select>';
  html += '<button class="todo-btn" data-cal-action="add-exam">+</button>';
  html += '</div>';
  html += '<div class="exam-form-row" style="grid-template-columns:1fr 1fr;margin-top:10px;">';
  html += '<input class="todo-inp" type="date" id="examDate" value="' + new Date().toISOString().split('T')[0] + '" style="width:100%;">';
  html += '<input class="todo-inp" id="examRoom" placeholder="Sala (opțional)" style="width:100%;">';
  html += '</div>';
  html += '</div>'; // end add-exam-form

  // Plan de studiu auto-generat
  html += '<div class="study-plan-section">';
  html += '<h3>📋 Plan Auto de Studiu</h3>';

  if (exams.length === 0) {
    html += '<div style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:16px;">Adaugă examene pentru a genera un plan de studiu</div>';
  } else {
    // Generam plan pentru urmatoarele 14 zile
    const plan = generateStudyPlan(exams, 14);
    if (plan.length === 0) {
      html += '<div style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:16px;">Nu există examene viitoare în următoarele 14 zile</div>';
    } else {
      plan.forEach(function(day) {
        const dayDate = new Date(day.date);
        const isToday = dayDate.toDateString() === new Date().toDateString();
        html += '<div class="study-day-row">';
        html += '<div class="sdr-date" style="' + (isToday ? 'color:var(--accent);font-weight:700;' : '') + '">';
        html += dayDate.toLocaleDateString('ro', { weekday: 'short', day: 'numeric', month: 'short' });
        html += (isToday ? ' ●' : '');
        html += '</div>';
        html += '<div class="sdr-subject">';
        html += day.tasks.map(function(task) {
          const subj = getSubjects()[task.subject];
          return (subj ? subjectIcon(subj,'xs') + ' ' + subj.name : task.subject) + ' — ' + task.activity;
        }).join(' · ');
        html += '</div>';
        html += '<div class="sdr-hours">⏱ ' + day.hours + 'h</div>';
        html += '</div>';
      });
    }
  }

  html += '</div>'; // end study-plan-section
  html += '</div>'; // end stanga

  // Dreapta: calendar mini
  html += '<div>';
  html += '<div class="calendar-mini">';
  html += renderMiniCalendar(exams);
  html += '</div>';
  html += '</div>';

  html += '</div>'; // end calendar-layout
  html += '</div>'; // end anim
  element.innerHTML = html;
  setupSystemPagesInteractions(element);
}

// Genereaza plan de studiu automat bazat pe examene
function generateStudyPlan(exams, daysAhead) {
  const plan = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Activitati recomandate
  const activities = ['Recitire prezentări', 'Rezolvare exerciții', 'Flashcards', 'Quiz AI', 'Notițe rezumative', 'Recapitulare finală'];

  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);

    const tasks = [];
    let hours = 0;

    // Sortam examenele dupa distanta de la ziua curenta
    const upcoming = exams
      .filter(function(e) {
        const ed = new Date(e.date);
        ed.setHours(0, 0, 0, 0);
        return ed >= date;
      })
      .sort(function(a, b) {
        return new Date(a.date) - new Date(b.date);
      });

    if (upcoming.length === 0) continue;

    // Prioritizeaza examenele cele mai apropiate
    upcoming.slice(0, 2).forEach(function(exam, i) {
      const examDate = new Date(exam.date);
      examDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((examDate - date) / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) return;

      let activityIndex = 0;
      if (daysLeft === 0) activityIndex = 5; // Recapitulare finala
      else if (daysLeft <= 2) activityIndex = 4; // Notite rezumative
      else if (daysLeft <= 5) activityIndex = Math.floor(Math.random() * 2) + 2; // Flashcards sau Quiz
      else activityIndex = Math.floor(Math.random() * 2); // Recitire sau Exercitii

      tasks.push({
        subject: exam.subject,
        activity: activities[activityIndex],
        priority: i === 0 ? 'high' : 'normal'
      });

      hours += daysLeft <= 3 ? 3 : daysLeft <= 7 ? 2 : 1;
    });

    if (tasks.length > 0) {
      plan.push({
        date: date.toISOString().split('T')[0],
        tasks: tasks,
        hours: Math.min(hours, 6)
      });
    }
  }

  return plan;
}

// Randeaza calendarul mini
function renderMiniCalendar(exams) {
  const year = calendarState.year;
  const month = calendarState.month;

  const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
  const dayNames = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];

  // Construim set de date cu examene
  const examDates = new Set();
  (exams || []).forEach(function(exam) {
    examDates.add(exam.date);
  });

  const today = new Date();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay() - 1; // Luni = 0
  if (startDow < 0) startDow = 6;

  let html = '<div class="calendar-mini-header">';
  html += '<button class="cal-nav-btn" data-cal-action="prev-month">←</button>';
  html += '<div class="calendar-mini-title">' + monthNames[month] + ' ' + year + '</div>';
  html += '<button class="cal-nav-btn" data-cal-action="next-month">→</button>';
  html += '</div>';

  html += '<div class="calendar-grid">';

  // Header zile
  dayNames.forEach(function(d) {
    html += '<div class="cal-day-header">' + d + '</div>';
  });

  // Padding zile goale
  for (let i = 0; i < startDow; i++) {
    html += '<div class="cal-day empty"></div>';
  }

  // Zilele lunii
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const hasExam = examDates.has(dateStr);

    let classes = 'cal-day';
    if (isToday) classes += ' today';
    if (hasExam) classes += ' has-exam';

    html += '<div class="' + classes + '">' + d;
    if (hasExam) html += '<div class="cal-exam-dot"></div>';
    html += '</div>';
  }

  html += '</div>'; // end calendar-grid

  // Legenda
  html += '<div style="margin-top:14px;font-size:.72rem;color:var(--text-muted);display:flex;gap:14px;justify-content:center;">';
  html += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--accent);margin-right:4px;"></span>Azi</span>';
  html += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--red);margin-right:4px;"></span>Examen</span>';
  html += '</div>';

  return html;
}

// Navigare calendar
function prevCalMonth() {
  calendarState.month--;
  if (calendarState.month < 0) {
    calendarState.month = 11;
    calendarState.year--;
  }
  const calEl = document.querySelector('.calendar-mini');
  if (calEl) calEl.innerHTML = renderMiniCalendar(state.exams || []);
}

function nextCalMonth() {
  calendarState.month++;
  if (calendarState.month > 11) {
    calendarState.month = 0;
    calendarState.year++;
  }
  const calEl = document.querySelector('.calendar-mini');
  if (calEl) calEl.innerHTML = renderMiniCalendar(state.exams || []);
}

function setupSystemPagesInteractions(element) {
  if (element.__systemPagesInteractionsBound) return;
  element.__systemPagesInteractionsBound = true;

  element.addEventListener('click', function(e) {
    const actionEl = e.target.closest('[data-cal-action]');
    if (!actionEl) return;
    const action = actionEl.getAttribute('data-cal-action');
    if (action === 'add-exam') addExam();
    else if (action === 'delete-exam') deleteExam(Number(actionEl.getAttribute('data-exam-index')));
    else if (action === 'prev-month') prevCalMonth();
    else if (action === 'next-month') nextCalMonth();
  });
}

// Adauga examen
function addExam() {
  const nameInput = document.getElementById('examName');
  const subjectSelect = document.getElementById('examSubject');
  const dateInput = document.getElementById('examDate');
  const roomInput = document.getElementById('examRoom');

  const name = nameInput.value.trim();
  const subject = subjectSelect.value;
  const date = dateInput.value;

  if (!name || !subject || !date) {
    alert('Completează cel puțin numele, materia și data examenului!');
    return;
  }

  if (!state.exams) state.exams = [];
  state.exams.push({
    name: name,
    subject: subject,
    date: date,
    room: roomInput ? roomInput.value.trim() : '',
    addedAt: Date.now()
  });

  saveState();

  nameInput.value = '';
  roomInput.value = '';

  renderCalendarPage(document.getElementById('pageContent'));
  renderSidebar();
}

// Sterge examen
function deleteExam(index) {
  if (!confirm('Ștergi examenul?')) return;
  state.exams.splice(index, 1);
  saveState();
  renderCalendarPage(document.getElementById('pageContent'));
  renderSidebar();
}

// =============================================
// V7 — FLASHCARDS DUE COUNT (standalone)
// =============================================
function getFlashcardsDueCount() {
  const decks = state.flashcardDecks || {};
  let count = 0;
  const now = Date.now();
  for (const key of Object.keys(decks)) {
    (decks[key] || []).forEach(card => {
      if (!card.nextReview || card.nextReview <= now) count++;
    });
  }
  return count;
}

// =============================================
// V7 — GAMIFICATION SYSTEM
// =============================================
function getLevelXP(level) {
  if (level <= 0) return 0;
  return Math.round(100 * Math.pow(1.5, level - 1));
}

function getTotalXPForLevelAcc(level) {
  let total = 0;
  for (let i = 1; i <= level; i++) total += getLevelXP(i);
  return total;
}

function awardXP(amount, reason, subject) {
  state.xp = (state.xp || 0) + amount;
  const today = new Date().toISOString().split('T')[0];
  state.activityLog = state.activityLog || [];
  state.activityLog.push({ date: today, type: reason, subject: subject || '', xp: amount });
  if (state.activityLog.length > 500) state.activityLog = state.activityLog.slice(-500);

  // Tracks estimated study time per subject (1 XP ≈ 0.5 min)
  if (subject && subject !== '') {
    if (!state.studyTime) state.studyTime = {};
    state.studyTime[subject] = (state.studyTime[subject] || 0) + Math.round(amount * 0.5);
  }

  // Recalculeaza nivelul
  let xpAcc = 0, newLevel = 1;
  while (true) {
    const needed = getLevelXP(newLevel);
    if (xpAcc + needed > state.xp) break;
    xpAcc += needed;
    newLevel++;
  }
  const leveledUp = newLevel > (state.level || 1);
  state.level = newLevel;

  updateStreak();
  saveState();
  showToast('+' + amount + ' XP — ' + reason, leveledUp ? 'Nivel ' + newLevel + ' deblocat!' : null, leveledUp ? 'success' : 'info', 3000);
  checkAchievements();
  renderSidebar();
}

function updateStreak() {
  const today = new Date().toISOString().split('T')[0];
  if (state.lastStudyDate === today) return;
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];
  if (state.lastStudyDate === yStr) state.streak = (state.streak || 0) + 1;
  else state.streak = 1;
  state.lastStudyDate = today;
}

function checkAndUpdateStreak() {
  if (!state.lastStudyDate) return;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];
  if (state.lastStudyDate !== today && state.lastStudyDate !== yStr) state.streak = 0;
}

function showToast(message, subtitle) {
  const existing = document.getElementById('xpToast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.id = 'xpToast';
  toast.innerHTML = '<span style="font-size:1.3rem;">⭐</span><div><div>' + message + '</div>' +
    (subtitle ? '<div style="font-size:.78rem;color:var(--accent);margin-top:2px;">' + subtitle + '</div>' : '') + '</div>';
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
}

const ACHIEVEMENTS_DEF = [
  { id: 'first_login',   icon: 'graduation', name: 'Bun venit!',        desc: 'Prima autentificare',           xp: 10,   check: () => true },
  { id: 'first_quiz',    icon: 'brain', name: 'Quiz Master I',     desc: 'Primul quiz completat',         xp: 50,   check: () => Object.values(state.quizHistory||{}).flat().length >= 1 },
  { id: 'quiz_10',       icon: '🏆', name: 'Quiz Master II',    desc: '10 quiz-uri completate',        xp: 150,  check: () => Object.values(state.quizHistory||{}).flat().length >= 10 },
  { id: 'perfect_quiz',  icon: '💯', name: 'Perfectionist',     desc: 'Quiz cu scor 100%',            xp: 200,  check: () => Object.values(state.quizHistory||{}).flat().some(r => r.score === r.total) },
  { id: 'first_fc',      icon: 'cards', name: 'Flashcard Fan',     desc: 'Primul deck de flashcard-uri', xp: 30,   check: () => Object.values(state.flashcardDecks||{}).some(d => d.length > 0) },
  { id: 'fc_100',        icon: '🔮', name: 'Memorie de Fier',   desc: '100 flashcard-uri reviewed',   xp: 100,  check: () => Object.values(state.flashcardDecks||{}).flat().reduce((a,c)=>a+(c.reviews||0),0) >= 100 },
  { id: 'streak_3',      icon: 'flame', name: 'On Fire!',          desc: '3 zile consecutive',           xp: 75,   check: () => state.streak >= 3 },
  { id: 'streak_7',      icon: '⚡', name: 'Săptămâna Studiu', desc: '7 zile consecutive',           xp: 200,  check: () => state.streak >= 7 },
  { id: 'streak_30',     icon: '🌟', name: 'Legendă',           desc: '30 zile consecutive',          xp: 1000, check: () => state.streak >= 30 },
  { id: 'first_pres',    icon: 'chart', name: 'Prezentator',       desc: 'Prima prezentare generată',    xp: 40,   check: () => Object.values(state.presentations||{}).flat().length >= 1 },
  { id: 'pres_10',       icon: '🎨', name: 'Content Creator',   desc: '10 prezentări generate',       xp: 150,  check: () => Object.values(state.presentations||{}).flat().length >= 10 },
  { id: 'first_exam',    icon: 'calendar', name: 'Organizat',         desc: 'Primul examen adăugat',        xp: 20,   check: () => (state.exams||[]).length >= 1 },
  { id: 'level_5',       icon: 'trending', name: 'Rising Star',       desc: 'Nivel 5',                      xp: 300,  check: () => (state.level||1) >= 5 },
  { id: 'level_10',      icon: '💎', name: 'Elite',             desc: 'Nivel 10',                     xp: 500,  check: () => (state.level||1) >= 10 },
  { id: 'first_mindmap', icon: 'map', name: 'Cartograf',         desc: 'Primul mind map generat',      xp: 60,   check: () => Object.values(state.mindMaps||{}).some(m => m && m.nodes) },
  { id: 'exam_sim',      icon: 'graduation', name: 'Simulator Pro',     desc: 'Prima sesiune Exam Simulator', xp: 80,   check: () => Object.values(state.examSessions||{}).flat().length >= 1 },
];

function checkAchievements() {
  let newUnlocked = [];
  ACHIEVEMENTS_DEF.forEach(ach => {
    if (!(state.achievements||[]).includes(ach.id)) {
      try { if (ach.check()) { state.achievements = [...(state.achievements||[]), ach.id]; newUnlocked.push(ach); } } catch(e) {}
    }
  });
  if (newUnlocked.length) {
    saveState();
    newUnlocked.forEach((ach, i) => {
      setTimeout(() => showToast('' + ach.name + ' deblocat!', '+' + ach.xp + ' XP'), (i+1) * 2000);
    });
    renderSidebar();
  }
}

// =============================================
// V7 — ACHIEVEMENTS PAGE
// =============================================
function renderAchievementsPage(element) {
  const xpForNext = getLevelXP(state.level || 1);
  const xpAcc = getTotalXPForLevelAcc((state.level || 1) - 1);
  const xpInLevel = (state.xp || 0) - xpAcc;
  const xpPct = Math.min(100, Math.round((xpInLevel / xpForNext) * 100));

  let html = '<div class="anim">';

  // Hero XP card
  html += '<div style="background:linear-gradient(135deg,var(--accent-muted),var(--bg-raised));border:1px solid var(--accent-border);border-radius:var(--radius);padding:28px 32px;margin-bottom:24px;display:flex;align-items:center;gap:24px;flex-wrap:wrap;">';
  html += '<div style="font-size:3.5rem;">⭐</div>';
  html += '<div style="flex:1;">';
  html += '<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:4px;">Nivel Curent</div>';
  html += '<div style="font-family:Syne,sans-serif;font-size:2.2rem;font-weight:800;">Nivel ' + (state.level||1) + '</div>';
  html += '<div class="xp-bar-wrap" style="margin-top:8px;height:10px;"><div class="xp-bar-fill" style="width:' + xpPct + '%"></div></div>';
  html += '<div style="font-size:.8rem;color:var(--text-secondary);margin-top:4px;">' + (state.xp||0) + ' XP total · ' + xpInLevel + '/' + xpForNext + ' XP pentru nivel următor</div>';
  html += '</div>';
  html += '<div style="text-align:center;">';
  html += '<div style="font-size:.72rem;color:var(--text-muted);margin-bottom:4px;">Streak</div>';
  html += '<div style="font-size:2.5rem;font-weight:700;' + (state.streak >= 3 ? 'color:var(--amber)' : 'color:var(--text-muted)') + '">' + (state.streak||0) + ' <span style="opacity:.5">' + icon('flame','sm') + '</span></div>';
  html += '<div style="font-size:.72rem;color:var(--text-muted)">zile consecutive</div>';
  html += '</div></div>';

  // Activity heatmap
  html += '<div class="chart-panel" style="margin-bottom:24px;">';
  html += '<div class="chart-title">Activitate — ultimele 14 zile</div>';
  html += renderActivityHeatmap();
  html += '</div>';

  // Achievements grid
  const unlocked = (state.achievements||[]).length;
  html += '<div style="font-size:.82rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">' + unlocked + ' / ' + ACHIEVEMENTS_DEF.length + ' achievements deblocate</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;">';
  ACHIEVEMENTS_DEF.forEach(ach => {
    const isUnlocked = (state.achievements||[]).includes(ach.id);
    html += '<div class="achievement-card ' + (isUnlocked ? 'unlocked' : 'locked') + '">';
    html += '<div class="ach-icon">' + ach.icon + '</div>';
    html += '<div style="flex:1;"><div class="ach-name">' + ach.name + '</div><div class="ach-desc">' + ach.desc + '</div></div>';
    html += '<div class="ach-xp">+' + ach.xp + ' XP</div>';
    html += '</div>';
  });
  html += '</div></div>';

  element.innerHTML = html;
}

function renderActivityHeatmap() {
  const log = state.activityLog || [];
  const today = new Date();
  const cells = [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const dayXP = log.filter(e => e.date === dStr).reduce((a,c) => a + (c.xp||0), 0);
    cells.push({ date: dStr, xp: dayXP, level: dayXP > 200 ? 4 : dayXP > 100 ? 3 : dayXP > 50 ? 2 : dayXP > 0 ? 1 : 0 });
  }

  let html = '<div class="activity-heatmap">';
  cells.forEach(c => {
    const dayName = new Date(c.date).toLocaleDateString('ro', { weekday: 'short', day: 'numeric' });
    html += '<div class="heat-cell l' + c.level + '" title="' + dayName + ': ' + c.xp + ' XP"></div>';
  });
  html += '</div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:.65rem;color:var(--text-muted);margin-top:6px;">';
  html += '<span>' + new Date(cells[0].date).toLocaleDateString('ro', {day:'numeric',month:'short'}) + '</span><span>Azi</span></div>';
  return html;
}

// =============================================
// V7 — SUBJECT MANAGER (modal)
// =============================================
function openSubjectManager() {
  const subjects = getSubjects();
  const isCustom = Object.keys(state.customSubjects||{}).length > 0;
  let html = '<div class="modal-overlay" data-system-modal="close-if-overlay">';
  html += '<div class="modal-box"><div class="modal-header"><div class="modal-title">' + icon('settings','sm') + ' Gestionare Materii</div><button class="modal-close" data-system-action="close-modal">✕</button></div>';

  if (isCustom) {
    html += '<button data-system-action="import-ase-template" style="width:100%;padding:9px;border-radius:var(--radius-sm);border:1px solid var(--accent-border);background:var(--accent-muted);color:var(--accent);font-size:.82rem;font-weight:600;cursor:pointer;margin-bottom:16px;">Importă materiile ASE ca template</button>';
  } else {
    html += '<button data-system-action="import-ase-template" style="width:100%;padding:9px;border-radius:var(--radius-sm);border:1px solid var(--accent-border);background:var(--accent-muted);color:var(--accent);font-size:.82rem;font-weight:600;cursor:pointer;margin-bottom:16px;">Pornește cu materiile ASE (MAP, Python, Banking, Eco, MCCP)</button>';
  }

  html += '<div style="margin-bottom:20px;">';
  for (const [key, subj] of Object.entries(subjects)) {
    const theme = getSubjectTheme(subj);
    html += '<div class="subject-card-mini">';
    html += '<div class="scm-icon" style="background:' + theme.muted + ';color:' + theme.accent + ';display:flex;align-items:center;justify-content:center;">' + subjectIcon(subj,'sm') + '</div>';
    html += '<div class="scm-info"><div class="scm-name">' + escapeHtml(subj.name) + '</div><div class="scm-full">' + escapeHtml(subj.full||'') + '</div></div>';
    html += '<div class="scm-actions"><button class="scm-btn" data-system-action="edit-subject" data-subject-key="' + key + '">✏️</button><button class="scm-btn danger" data-system-action="delete-subject" data-subject-key="' + key + '">🗑️</button></div>';
    html += '</div>';
  }
  html += '</div>';

  html += '<div style="border-top:1px solid var(--border);padding-top:18px;">';
  html += '<div style="font-size:.82rem;font-weight:700;margin-bottom:12px;color:var(--text-secondary);">➕ Adaugă materie nouă</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">';
  html += '<input class="todo-inp" id="newSubjName" placeholder="Nume scurt (ex: Drept)" style="width:100%;">';
  html += '<input class="todo-inp" id="newSubjIcon" placeholder="Icon emoji (ex: ⚖️)" style="width:100%;">';
  html += '</div>';
  html += '<input class="todo-inp" id="newSubjFull" placeholder="Nume complet" style="width:100%;margin-bottom:10px;">';
  html += '<select class="todo-inp" id="newSubjDomain" style="width:100%;margin-bottom:10px;">';
  html += '<option value="">Domeniu (opțional)</option>';
  html += '<option value="medicine">Medicină / Biologie</option>';
  html += '<option value="law">Drept / Legislație</option>';
  html += '<option value="exact_sciences">Matematică / Fizică / Chimie</option>';
  html += '<option value="social_sciences">Economie / Psihologie / Management</option>';
  html += '<option value="cs">Informatică / Programare</option>';
  html += '<option value="humanities">Umanioare / Istorie / Filosofie</option>';
  html += '<option value="other">Altele</option>';
  html += '</select>';
  html += '<textarea class="summary-textarea" id="newSubjProfile" placeholder="Notă despre tine la această materie (opțional) — ex: nu sunt tehnic, știu deja bazele, am background economic" style="min-height:48px;margin-bottom:10px;"></textarea>';
  html += '<textarea class="summary-textarea" id="newSubjDesc" placeholder="Descriere scurtă" style="min-height:50px;margin-bottom:10px;"></textarea>';
  html += '<textarea class="summary-textarea" id="newSubjPrompt" placeholder="System prompt AI Tutor (ex: Ești un profesor de drept...)" style="min-height:70px;margin-bottom:12px;"></textarea>';
  html += '<div style="font-size:.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">Culoare temă</div>';
  html += '<div class="theme-swatches" id="newSubjThemeSwatches">';
  SUBJECT_THEMES.forEach((theme, i) => {
    html += '<div class="theme-swatch' + (i===0?' active':'') + '" style="background:' + theme.accent + '" data-theme-id="' + theme.id + '" data-system-action="select-new-theme" title="' + theme.label + '"></div>';
  });
  html += '</div>';
  html += '<button data-system-action="add-new-subject" style="width:100%;margin-top:14px;padding:11px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);font-weight:700;cursor:pointer;font-size:.92rem;">+ Adaugă Materie</button>';
  html += '</div></div></div>';
  document.getElementById('modalContainer').innerHTML = html;
}

let _newSubjThemeId = 'violet';
function selectNewSubjTheme(id) {
  _newSubjThemeId = id;
  document.querySelectorAll('#newSubjThemeSwatches .theme-swatch').forEach(s => s.classList.toggle('active', s.dataset.themeId===id));
}

function addNewSubject() {
  const name = document.getElementById('newSubjName').value.trim();
  const icon = document.getElementById('newSubjIcon').value.trim() || '◆';
  const full = document.getElementById('newSubjFull').value.trim() || name;
  const desc = document.getElementById('newSubjDesc').value.trim() || '';
  const prompt = document.getElementById('newSubjPrompt').value.trim() || 'Ești un profesor expert în ' + full + '. Răspunde în română.';
  const domain = document.getElementById('newSubjDomain').value || '';
  const userProfileNote = document.getElementById('newSubjProfile').value.trim() || '';
  if (!name) { alert('Introdu un nume pentru materie!'); return; }
  const key = 'subj_' + name.toLowerCase().replace(/[^a-z0-9]/g,'_').substring(0,15) + '_' + Date.now();
  if (!state.customSubjects) state.customSubjects = {};
  // NU copiem DEFAULT_SUBJECTS — incepem fresh cu materia userului
  state.customSubjects[key] = { icon, name, full, desc, themeId: _newSubjThemeId, resources: [], systemPrompt: prompt, domain, userProfileNote };
  SUBJECTS = getSubjects();
  saveState();
  closeModal();
  renderSidebar();
  renderBottomNav();
  renderPage();
  showToast('[OK] Materie adăugată: ' + name);
  awardXP(20, 'Materie nouă adăugată');
}

function deleteSubject(key) {
  const subj = getSubjects()[key];
  if (!confirm('Ștergi materia "' + subj.name + '"? Datele asociate rămân în state dar materia dispare.')) return;

  // Daca materiile sunt DEFAULT_SUBJECTS (customSubjects gol),
  // le copiem mai intai in customSubjects inainte sa stergem
  if (!state.customSubjects || Object.keys(state.customSubjects).length === 0) {
    state.customSubjects = JSON.parse(JSON.stringify(DEFAULT_SUBJECTS));
  }

  delete state.customSubjects[key];
  SUBJECTS = getSubjects();
  saveState();
  if (state.tab === key) navigateTo('dashboard');
  closeModal(); renderSidebar(); openSubjectManager();
}

function editSubject(key) {
  const subj = getSubjects()[key];
  let html = '<div class="modal-overlay" data-system-modal="close-if-overlay">';
  html += '<div class="modal-box"><div class="modal-header"><div class="modal-title">✏️ Editează ' + escapeHtml(subj.name) + '</div><button class="modal-close" data-system-action="close-and-open-manager">✕</button></div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">';
  html += '<input class="todo-inp" id="editSubjName" value="' + escapeHtml(subj.name) + '" style="width:100%;" placeholder="Nume scurt">';
  html += '<input class="todo-inp" id="editSubjIcon" value="' + escapeHtml(subj.icon) + '" style="width:100%;" placeholder="Icon">';
  html += '</div>';
  html += '<input class="todo-inp" id="editSubjFull" value="' + escapeHtml(subj.full||'') + '" style="width:100%;margin-bottom:10px;">';
  html += '<select class="todo-inp" id="editSubjDomain" style="width:100%;margin-bottom:10px;">';
  html += '<option value="">Domeniu (opțional)</option>';
  [['medicine','Medicină / Biologie'],['law','Drept / Legislație'],['exact_sciences','Matematică / Fizică / Chimie'],['social_sciences','Economie / Psihologie / Management'],['cs','Informatică / Programare'],['humanities','Umanioare / Istorie / Filosofie'],['other','Altele']].forEach(function(opt) {
    html += '<option value="' + opt[0] + '"' + (subj.domain===opt[0]?' selected':'') + '>' + opt[1] + '</option>';
  });
  html += '</select>';
  html += '<textarea class="summary-textarea" id="editSubjProfile" placeholder="Notă despre tine la această materie (opțional)" style="min-height:48px;margin-bottom:10px;">' + escapeHtml(subj.userProfileNote||'') + '</textarea>';
  html += '<textarea class="summary-textarea" id="editSubjDesc" style="min-height:50px;margin-bottom:10px;">' + escapeHtml(subj.desc||'') + '</textarea>';
  html += '<textarea class="summary-textarea" id="editSubjPrompt" style="min-height:70px;margin-bottom:12px;">' + escapeHtml(subj.systemPrompt||'') + '</textarea>';
  html += '<div class="theme-swatches" id="editSubjThemeSwatches">';
  SUBJECT_THEMES.forEach(t => { html += '<div class="theme-swatch' + (t.id===(subj.themeId||'violet')?' active':'') + '" style="background:' + t.accent + '" data-theme-id="' + t.id + '" data-system-action="select-edit-theme" title="' + t.label + '"></div>'; });
  html += '</div>';
  html += '<button data-system-action="save-edit-subject" data-subject-key="' + key + '" style="width:100%;margin-top:14px;padding:11px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);font-weight:700;cursor:pointer;">💾 Salvează</button>';
  html += '</div></div>';
  document.getElementById('modalContainer').innerHTML = html;
  _editSubjThemeId = subj.themeId || 'violet';
}

let _editSubjThemeId = 'violet';
function selectEditSubjTheme(id) {
  _editSubjThemeId = id;
  document.querySelectorAll('#editSubjThemeSwatches .theme-swatch').forEach(s => s.classList.toggle('active', s.dataset.themeId===id));
}

function saveEditSubject(key) {
  const name = document.getElementById('editSubjName').value.trim();
  if (!name) { alert('Numele nu poate fi gol!'); return; }
  if (!state.customSubjects) state.customSubjects = {};
  const existing = state.customSubjects[key] || {};
  state.customSubjects[key] = { ...existing, name, icon: document.getElementById('editSubjIcon').value.trim()||existing.icon, full: document.getElementById('editSubjFull').value.trim()||name, desc: document.getElementById('editSubjDesc').value.trim(), systemPrompt: document.getElementById('editSubjPrompt').value.trim(), themeId: _editSubjThemeId, domain: document.getElementById('editSubjDomain').value||'', userProfileNote: document.getElementById('editSubjProfile').value.trim()||'' };
  SUBJECTS = getSubjects();
  saveState();
  closeModal();
  renderSidebar();
  if (state.tab === key) renderPage();
  showToast('[OK] Materie actualizată: ' + name);
}

function resetToDefaultSubjects() {
  if (!confirm('Resetezi la materiile ASE default?')) return;
  state.customSubjects = {};
  SUBJECTS = getSubjects();
  saveState();
  closeModal();
  if (!getSubjects()[state.tab]) navigateTo('dashboard');
  renderSidebar(); renderPage();
}

function closeModal() { document.getElementById('modalContainer').innerHTML = ''; }

function setupSystemModalInteractions() {
  const modalContainer = document.getElementById('modalContainer');
  if (!modalContainer || modalContainer.__systemModalBound) return;
  modalContainer.__systemModalBound = true;

  modalContainer.addEventListener('click', function(event) {
    const overlay = event.target.closest('[data-system-modal="close-if-overlay"]');
    if (overlay && event.target === overlay) {
      closeModal();
      return;
    }

    const actionEl = event.target.closest('[data-system-action]');
    if (!actionEl || !modalContainer.contains(actionEl)) return;

    const action = actionEl.dataset.systemAction;
    switch (action) {
      case 'close-modal':
        closeModal();
        return;
      case 'import-ase-template':
        importASETemplate();
        closeModal();
        return;
      case 'edit-subject':
        editSubject(actionEl.dataset.subjectKey);
        return;
      case 'delete-subject':
        deleteSubject(actionEl.dataset.subjectKey);
        return;
      case 'select-new-theme':
        selectNewSubjTheme(actionEl.dataset.themeId);
        return;
      case 'add-new-subject':
        addNewSubject();
        return;
      case 'close-and-open-manager':
        closeModal();
        openSubjectManager();
        return;
      case 'select-edit-theme':
        selectEditSubjTheme(actionEl.dataset.themeId);
        return;
      case 'save-edit-subject':
        saveEditSubject(actionEl.dataset.subjectKey);
        return;
      default:
        return;
    }
  });
}

setTimeout(setupSystemModalInteractions, 0);

// =============================================
// V7 — DASHBOARD cu grafice Chart.js
// =============================================
