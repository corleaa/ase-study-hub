function renderStatsGuide() {
  return '<section class="summary-deck" style="margin-bottom:18px;">'
    + '<div class="section-kicker">Cum citești Insight Center</div>'
    + '<div class="section-title">Statisticile sunt utile doar dacă știi ce decizie cer</div>'
    + '<div class="dashboard-next-steps">'
    + '<div class="next-step-card"><span class="soft-badge">1</span><div class="section-title" style="font-size:1rem;margin-top:12px;">Observi ritmul</div><div class="section-copy" style="font-size:.86rem;">Heatmap-ul și timpul de studiu îți arată constanța, nu doar cantitatea brută.</div></div>'
    + '<div class="next-step-card"><span class="soft-badge">2</span><div class="section-title" style="font-size:1rem;margin-top:12px;">Cauți diferențe</div><div class="section-copy" style="font-size:.86rem;">Comparația între materii, quiz-uri și activități îți arată unde efortul nu se transformă în rezultate.</div></div>'
    + '<div class="next-step-card"><span class="soft-badge">3</span><div class="section-title" style="font-size:1rem;margin-top:12px;">Ieși cu o decizie</div><div class="section-copy" style="font-size:.86rem;">Dacă o materie are mult timp și scor slab, ai nevoie de alt mod de studiu, nu doar de mai mult timp.</div></div>'
    + '</div></section>';
}

function renderStatsInterpretation(totalQuizzes, avgQuizScore, totalFCReviews) {
  var text = 'Nu există încă destule date pentru o interpretare serioasă. Încearcă să generezi materiale, să completezi quiz-uri și să faci câteva review-uri.';
  if (totalQuizzes > 0 || totalFCReviews > 0) {
    text = 'Media quiz-urilor este ' + avgQuizScore + '%, iar numărul de review-uri flashcards este ' + totalFCReviews + '. Uită-te dacă progresul academic vine din înțelegere reală sau doar din volum de activitate.';
  }
  return '<div class="scenario-callout" style="margin-bottom:20px;"><strong>Ce urmărești aici</strong><p>' + text + '</p></div>';
}

function renderMentorGuide() {
  return '<div class="mentor-context-card">'
    + '<div class="mcc-title">Cum folosești AI Mentor</div>'
    + '<div style="font-size:.82rem;color:var(--text-secondary);line-height:1.65;">'
    + '<p style="margin:0 0 8px;"><strong>Folosește-l pentru decizii:</strong> ce studiezi azi, unde ești slab, cum legi materiile sau cum îți refaci planul înainte de examen.</p>'
    + '<p style="margin:0;">Dacă întrebarea e prea generală, răspunsul va fi vag. Dacă îi spui materia, scorurile sau blocajul concret, mentorul devine mult mai util.</p>'
    + '</div></div>';
}

let dashChartInstance = null;

function renderDashboardCharts() {
  const subjects = getSubjects();
  const ctx = document.getElementById('progressChart');
  if (!ctx) return;

  // Incarca Chart.js dinamic daca nu e deja disponibil
  if (typeof Chart === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
    script.onload = () => buildChart(ctx, subjects);
    script.onerror = () => { ctx.parentElement.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:.82rem;">Graficul necesită conexiune internet</div>'; };
    document.head.appendChild(script);
    return;
  }
  buildChart(ctx, subjects);
}

function buildChart(ctx, subjects) {
  if (dashChartInstance) { dashChartInstance.destroy(); dashChartInstance = null; }
  const labels = [], data = [], colors = [];
  for (const [key, subj] of Object.entries(subjects)) {
    const todos = state.todos[key] || [];
    const done = todos.filter(t => t.done).length;
    const pct = todos.length ? Math.round(done / todos.length * 100) : 0;
    const theme = getSubjectTheme(subj);
    labels.push(subj.name); data.push(pct); colors.push(theme.accent);
  }

  const isDark = document.body.getAttribute('data-theme') !== 'light';
  const textColor  = isDark ? '#7a8099' : '#4a5068';
  const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor  = isDark ? '#eceef5' : '#0d1021';

  dashChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Progres Tasks (%)', data, backgroundColor: colors.map(c => c + '33'), borderColor: colors, borderWidth: 2, borderRadius: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { color: tickColor, font: { family: "'JetBrains Mono'" }, callback: v => v + '%' }, grid: { color: gridColor } },
        x: { ticks: { color: tickColor, font: { family: "'DM Sans'" } }, grid: { display: false } }
      }
    }
  });
}

// =============================================
// V7 — MIND MAP AI
// =============================================
function renderMindMapPage(element) {
  const subjects = getSubjects();
  let html = '<div class="anim"><div class="dash-hero" style="padding:28px 20px 20px"><h2>' + icon('map','sm') + ' Mind Map AI</h2><p>Hărți conceptuale vizuale generate din prezentările tale</p></div>';
  html += '<div class="quiz-gen-section"><h3>' + icon('settings','sm') + ' Generează Mind Map</h3>';
  html += '<div class="quiz-options-row" id="mmSubjectChips">';
  for (const [key, subject] of Object.entries(subjects)) {
    const hasMM = state.mindMaps && state.mindMaps[key] && state.mindMaps[key].nodes;
    html += '<button class="quiz-chip ' + (state.mmActiveSubject===key?'active':'') + '" data-stats-action="select-mm-subject" data-mm-subject="' + key + '">' + subjectIcon(subject,'xs') + ' ' + subject.name + '</button>';
  }
  html += '</div>';
  if (false) {
    html += '<div style="padding:12px;background:var(--amber-muted);border-radius:var(--radius-sm);font-size:.85rem;color:var(--amber);margin-top:12px;">[!] Configurează API key-ul din Dashboard</div>';
  } else {
    html += '<div style="display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap;">';
    html += '<button class="summary-gen-btn" id="mmGenBtn" data-stats-action="generate-mindmap">' + icon('map','sm') + ' Generează Mind Map</button>';
    if (state.mmActiveSubject && state.mindMaps && state.mindMaps[state.mmActiveSubject]) {
      html += '<button class="quiz-nav-btn" data-stats-action="clear-mindmap">' + icon('trash','xs') + ' Șterge</button>';
    }
    html += '<span class="summary-status" id="mmGenStatus" style="font-size:.82rem;color:var(--text-muted);"></span></div>';
  }
  html += '</div>';
  html += '<div id="mmDisplayZone">';
  if (state.mmActiveSubject && state.mindMaps && state.mindMaps[state.mmActiveSubject]) {
    html += renderMindMapSVG(state.mindMaps[state.mmActiveSubject], state.mmActiveSubject);
  } else {
    html += '<div style="text-align:center;padding:60px;color:var(--text-muted);">Selectează o materie și generează un mind map</div>';
  }
  html += '</div></div>';
  element.innerHTML = html;
  setupStatsMentorInteractions(element);
  // Inițializează canvas după injectarea în DOM
  setTimeout(mmInitCanvas, 0);
}

function selectMMSubject(key, triggerEl) {
  state.mmActiveSubject = key;
  document.querySelectorAll('#mmSubjectChips .quiz-chip').forEach(b => b.classList.remove('active'));
  if (triggerEl) triggerEl.classList.add('active');
  const zone = document.getElementById('mmDisplayZone');
  if (zone) {
    if (state.mindMaps && state.mindMaps[key] && state.mindMaps[key].nodes) {
      zone.innerHTML = renderMindMapSVG(state.mindMaps[key], key);
      setTimeout(mmInitCanvas, 0);
    } else {
      zone.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted);">Niciun mind map pentru această materie. Generează unul!</div>';
    }
  }
}

async function generateMindMap() {
  const key = state.mmActiveSubject;
  if (!key) { document.getElementById('mmGenStatus').textContent = '[!] Selectează o materie'; return; }
  const subject = getSubjects()[key];
  const allPres = getAllPresentations(key);
  if (!allPres.length) { document.getElementById('mmGenStatus').textContent = '[!] Nu există prezentări pentru ' + subject.name; return; }

  let context = '';
  allPres.forEach(p => { context += '### ' + p.title + '\n'; p.slides.forEach(s => { context += s.title + ': ' + s.content.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim() + '\n'; }); });

  const btn = document.getElementById('mmGenBtn');
  const statusEl = document.getElementById('mmGenStatus');
  btn.disabled = true; btn.innerHTML = 'Se generează...'; statusEl.textContent = 'Durează ~15s...';

  try {
    const response = await (async function(){
      var __r = await authFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(window.__shAccessToken ? { 'Authorization': 'Bearer ' + window.__shAccessToken } : {}) },
        credentials: 'include',
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 2000,
        system: `Ești un generator de mind map-uri. Răspunzi DOAR cu un obiect JSON valid, fără text adițional, fără markdown, fără explicații.
Structura exactă:
{"center":"Titlu scurt","nodes":[{"label":"Concept 1","children":[{"label":"Sub-concept A"},{"label":"Sub-concept B"}]},{"label":"Concept 2","children":[{"label":"Sub-concept C"}]}]}
Reguli: 5-7 noduri principale, 2-4 copii fiecare, label-uri max 4 cuvinte, în română. DOAR JSON, nimic altceva.`,
        messages: [{ role: 'user', content: 'Generează mind map pentru ' + subject.name + ' (' + subject.full + ') din acest material:\n\n' + context.substring(0, 4000) }]
      })
      }); var __d = await __r.json(); return { content: [{ text: __d.content || '' }] }; })();
    const data = response;
    if (data.error) { statusEl.textContent = '[!] API: ' + data.error.message; btn.disabled = false; btn.innerHTML = icon('map','sm') + ' Generează Mind Map'; return; }

    if (data.content && data.content[0]) {
      let raw = data.content[0].text.trim();
      // Extrage JSON robust — caută primul { și ultimul }
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) raw = raw.substring(firstBrace, lastBrace + 1);
      raw = raw.replace(/^```json?\s*/,'').replace(/\s*```$/,'').trim();

      let mm = null;
      try { mm = JSON.parse(raw); } catch(e) {
        statusEl.textContent = '[!] Eroare parsare JSON: ' + e.message;
        btn.disabled = false; btn.innerHTML = icon('map','sm') + ' Generează Mind Map';
        return;
      }

      if (mm && mm.center && mm.nodes && mm.nodes.length > 0) {
        if (!state.mindMaps) state.mindMaps = {};
        state.mindMaps[key] = mm; saveState();
        window._mmCollapsed = {};
        awardXP(60, 'Mind Map generat', key);
        document.getElementById('mmDisplayZone').innerHTML = renderMindMapSVG(mm, key);
        setTimeout(mmInitCanvas, 0);
        statusEl.textContent = '';
        showToast('Mind Map generat!', mm.nodes.length + ' concepte principale', 'success', 2500);
      } else {
        statusEl.textContent = '[!] JSON incomplet (lipsesc center sau nodes)';
      }
    }
  } catch(err) { statusEl.textContent = '[!] ' + err.message; }

  btn.disabled = false; btn.innerHTML = icon('map','sm') + ' Generează Mind Map';
}

function clearMindMap() {
  if (!state.mmActiveSubject || !confirm('Ștergi mind map-ul?')) return;
  if (state.mindMaps) delete state.mindMaps[state.mmActiveSubject];
  saveState();
  document.getElementById('mmDisplayZone').innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted);">Mind map șters.</div>';
}

function renderMindMapSVG(mm, subjectKey) {
  const subject = getSubjects()[subjectKey];
  const theme = subject ? getSubjectTheme(subject) : SUBJECT_THEMES[0];
  window._mmData = mm;
  window._mmTheme = theme;
  if (!window._mmCollapsed) window._mmCollapsed = {};

  return `<div class="mindmap-container" style="margin-top:20px;">
    <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
      <span style="font-size:.82rem;font-weight:700;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">${icon('map','xs')} ${escapeHtml(mm.center || '')}</span>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
        <span style="font-size:.68rem;color:var(--text-muted);font-family:var(--font-mono);">scroll=zoom · drag=pan · click=collapse</span>
        <button class="quiz-nav-btn" style="font-size:.72rem;padding:5px 10px;" data-stats-action="mm-zoom-reset">⊙ Reset</button>
        <button class="quiz-nav-btn" style="font-size:.72rem;padding:5px 10px;" data-stats-action="mm-expand-all">⊕ Expand tot</button>
        <button class="quiz-nav-btn" style="font-size:.72rem;padding:5px 10px;" data-stats-action="download-mindmap-svg">${icon('download','xs')} SVG</button>
      </div>
    </div>
    <canvas id="mmCanvas" style="width:100%;display:block;cursor:grab;" height="560"></canvas>
  </div>`;
}

// ─── Mind Map Canvas Engine ───────────────────────────────────
let mmState = { zoom:0.85, panX:0, panY:0, dragging:false, dragMoved:false, dragStartX:0, dragStartY:0, lastTouchX:0, lastTouchY:0, nodes:[], edges:[], animFrame:null };

function mmBuildLayout(mm, theme) {
  const nodes = [], edges = [];
  const collapsed = window._mmCollapsed || {};
  const mainNodes = mm.nodes || [];
  const N = mainNodes.length;
  const CX = 560, CY = 280;
  const MAIN_R = Math.min(205, 90 + N * 16);

  nodes.push({ id:'center', x:CX, y:CY, r:58, label:(mm.center||'').split(' ').slice(0,3).join(' '), sub:(mm.center||'').split(' ').slice(3).join(' '), type:'center' });

  mainNodes.forEach((node, i) => {
    const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
    const nx = CX + MAIN_R * Math.cos(angle);
    const ny = CY + MAIN_R * Math.sin(angle);
    const nid = 'n' + i;
    const isCollapsed = collapsed[nid] === true;
    const children = node.children || [];
    const childIds = children.map((_,j) => nid+'c'+j);

    nodes.push({ id:nid, x:nx, y:ny, r:44, label:(node.label||'').split(' ').slice(0,2).join(' '), sub:(node.label||'').split(' ').slice(2,4).join(' '), type:'main', children:childIds, collapsed:isCollapsed, childCount:childIds.length });
    edges.push({ x1:CX, y1:CY, x2:nx, y2:ny, width:2, opacity:0.55 });

    if (!isCollapsed) {
      const nC = children.length;
      const totalSpread = nC <= 1 ? 0 : Math.min(nC * 0.36, 1.5);
      const dist = 108 + nC * 6;
      children.forEach((child, j) => {
        const cid = nid+'c'+j;
        const offset = nC <= 1 ? 0 : (j/(nC-1) - 0.5) * totalSpread;
        const ca = angle + offset;
        const cx2 = nx + dist * Math.cos(ca);
        const cy2 = ny + dist * Math.sin(ca);
        nodes.push({ id:cid, x:cx2, y:cy2, r:15, label:(child.label||'').substring(0,22), type:'child', parentId:nid });
        edges.push({ x1:nx, y1:ny, x2:cx2, y2:cy2, width:1.5, opacity:0.3 });
      });
    }
  });
  return { nodes, edges };
}

function mmDraw() {
  const canvas = document.getElementById('mmCanvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || canvas.parentElement && canvas.parentElement.offsetWidth || 700;
  const H = 560;
  if (canvas.width !== Math.round(W*dpr) || canvas.height !== Math.round(H*dpr)) {
    canvas.width = Math.round(W*dpr);
    canvas.height = Math.round(H*dpr);
    canvas.style.height = H + 'px';
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const mm = window._mmData, theme = window._mmTheme;
  if (!mm || !theme) return;
  const { nodes, edges } = mmBuildLayout(mm, theme);
  mmState.nodes = nodes; mmState.edges = edges;
  const { zoom, panX, panY } = mmState;
  ctx.save();
  ctx.translate(W/2 + panX, H/2 + panY);
  ctx.scale(zoom, zoom);
  ctx.translate(-560, -280);
  edges.forEach(e => {
    ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2);
    ctx.strokeStyle = theme.accent; ctx.globalAlpha = e.opacity; ctx.lineWidth = e.width; ctx.stroke(); ctx.globalAlpha = 1;
  });
  nodes.forEach(node => {
    ctx.save();
    ctx.textBaseline = 'middle';
    if (node.type === 'center') {
      const grd = ctx.createRadialGradient(node.x, node.y, node.r*0.3, node.x, node.y, node.r*1.7);
      grd.addColorStop(0, theme.accent+'30'); grd.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(node.x, node.y, node.r*1.7, 0, Math.PI*2); ctx.fillStyle=grd; ctx.fill();
      ctx.beginPath(); ctx.arc(node.x, node.y, node.r, 0, Math.PI*2);
      ctx.fillStyle=theme.accent; ctx.globalAlpha=0.93; ctx.fill(); ctx.globalAlpha=1;
      ctx.fillStyle='#fff'; ctx.textAlign='center';
      ctx.font='bold 13px sans-serif'; ctx.fillText(node.label, node.x, node.y+(node.sub?-7:0));
      if (node.sub){ctx.font='11px sans-serif'; ctx.globalAlpha=0.85; ctx.fillText(node.sub, node.x, node.y+9); ctx.globalAlpha=1;}
    } else if (node.type === 'main') {
      ctx.beginPath(); ctx.arc(node.x, node.y, node.r, 0, Math.PI*2);
      ctx.fillStyle=theme.muted; ctx.fill();
      ctx.strokeStyle=theme.accent; ctx.lineWidth=node.collapsed?3:2; ctx.stroke();
      if (node.childCount > 0) {
        const bx=node.x+node.r*0.72, by=node.y-node.r*0.72;
        ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI*2);
        ctx.fillStyle=node.collapsed?theme.accent:'#0e1118'; ctx.fill();
        ctx.strokeStyle=theme.accent; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle=node.collapsed?'#fff':theme.accent;
        ctx.font='bold 13px sans-serif'; ctx.textAlign='center';
        ctx.fillText(node.collapsed?'+':'−', bx, by);
      }
      ctx.fillStyle=theme.accent; ctx.textAlign='center';
      ctx.font='bold 12px sans-serif'; ctx.fillText(node.label, node.x, node.y+(node.sub?-7:0));
      if (node.sub){ctx.font='10px sans-serif'; ctx.globalAlpha=0.8; ctx.fillText(node.sub, node.x, node.y+8); ctx.globalAlpha=1;}
    } else if (node.type === 'child') {
      ctx.font='600 10px sans-serif';
      const tw=ctx.measureText(node.label).width;
      const pw=tw+22, ph=28, rx=8, bx=node.x-pw/2, by=node.y-ph/2;
      ctx.beginPath();
      ctx.moveTo(bx+rx,by); ctx.lineTo(bx+pw-rx,by); ctx.quadraticCurveTo(bx+pw,by,bx+pw,by+rx);
      ctx.lineTo(bx+pw,by+ph-rx); ctx.quadraticCurveTo(bx+pw,by+ph,bx+pw-rx,by+ph);
      ctx.lineTo(bx+rx,by+ph); ctx.quadraticCurveTo(bx,by+ph,bx,by+ph-rx);
      ctx.lineTo(bx,by+rx); ctx.quadraticCurveTo(bx,by,bx+rx,by); ctx.closePath();
      ctx.fillStyle=theme.muted; ctx.fill(); ctx.strokeStyle=theme.border; ctx.lineWidth=1.2; ctx.stroke();
      ctx.fillStyle=theme.accent; ctx.textAlign='center'; ctx.fillText(node.label, node.x, node.y);
    }
    ctx.restore();
  });
  ctx.restore();
}

function mmHitTest(cx, cy) {
  const canvas = document.getElementById('mmCanvas');
  if (!canvas) return null;
  const W = canvas.offsetWidth || 700, H = 560;
  const { zoom, panX, panY } = mmState;
  const lx = (cx - W/2 - panX) / zoom + 560;
  const ly = (cy - H/2 - panY) / zoom + 280;
  for (const node of mmState.nodes) {
    if (node.type !== 'main') continue;
    const dx = lx-node.x, dy = ly-node.y;
    if (Math.sqrt(dx*dx+dy*dy) <= node.r+12) return node;
  }
  return null;
}

function mmInitCanvas() {
  const canvas = document.getElementById('mmCanvas');
  if (!canvas) return;
  if (canvas._mmInited) { mmScheduleDraw(); return; }
  canvas._mmInited = true;
  mmState.zoom = 0.82; mmState.panX = 0; mmState.panY = 0;
  mmState.mouseOver = false; mmState.dragging = false;
  mmState.targetZoom = 0.82; // pentru smooth zoom

  canvas.addEventListener('mouseenter', () => { mmState.mouseOver = true; });
  canvas.addEventListener('mouseleave', () => { mmState.mouseOver = false; mmState.dragging = false; });

  // ── Wheel handler ──
  // Pe MacBook: pinch gesture = wheel cu e.ctrlKey === true
  // Scroll normal fără ctrlKey = scroll pagină (nu interceptăm)
  canvas.addEventListener('wheel', e => {
    const isPinch = e.ctrlKey; // MacBook trackpad pinch trimite ctrlKey=true

    if (isPinch) {
      // PINCH ZOOM — smooth, spre poziția cursorului
      e.preventDefault();
      e.stopPropagation();

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const W = canvas.offsetWidth || 700, H = 560;

      // deltaY la pinch e mic și continuu — factor proporțional, nu step
      // MacBook trackpad dă valori mici (-3 la +3 de obicei)
      const sensitivity = 0.008;
      const scaleFactor = Math.exp(-e.deltaY * sensitivity);
      const newZ = Math.max(0.15, Math.min(6, mmState.zoom * scaleFactor));

      // Zoom spre poziția cursorului
      const lx = (mx - W / 2 - mmState.panX) / mmState.zoom;
      const ly = (my - H / 2 - mmState.panY) / mmState.zoom;
      mmState.panX = mx - W / 2 - lx * newZ;
      mmState.panY = my - H / 2 - ly * newZ;
      mmState.zoom = newZ;
      mmScheduleDraw();

    } else if (mmState.mouseOver) {
      // SCROLL cu mouse normal deasupra canvas-ului = pan canvas (nu zoom)
      // Lasă pagina să scrolleze dacă mouse-ul nu e pe canvas
      e.preventDefault();
      mmState.panX -= e.deltaX;
      mmState.panY -= e.deltaY;
      mmScheduleDraw();
    }
    // Dacă nu e pinch și mouse-ul nu e pe canvas → scroll normal al paginii
  }, { passive: false });

  // Mouse drag: NUMAI pe canvas (nu window)
  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    mmState.dragging = true;
    mmState.dragStartX = e.clientX; mmState.dragStartY = e.clientY;
    mmState.dragMoved = false;
    mmState.lastMouseX = e.clientX; mmState.lastMouseY = e.clientY;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  });
  canvas.addEventListener('mousemove', e => {
    if (!mmState.dragging) return;
    mmState.panX += e.clientX - mmState.lastMouseX;
    mmState.panY += e.clientY - mmState.lastMouseY;
    mmState.lastMouseX = e.clientX; mmState.lastMouseY = e.clientY;
    if (Math.abs(e.clientX-mmState.dragStartX)>4||Math.abs(e.clientY-mmState.dragStartY)>4) mmState.dragMoved=true;
    mmScheduleDraw();
  });
  canvas.addEventListener('mouseup', e => {
    if (!mmState.dragging) return;
    mmState.dragging = false; canvas.style.cursor = 'grab';
    if (!mmState.dragMoved) {
      const rect = canvas.getBoundingClientRect();
      const node = mmHitTest(e.clientX-rect.left, e.clientY-rect.top);
      if (node) mmToggleCollapse(node.id);
    }
  });
  document.addEventListener('mouseup', () => { if (mmState.dragging) { mmState.dragging=false; const c=document.getElementById('mmCanvas'); if(c) c.style.cursor='grab'; } });

  // Touch: pinch only, scroll paginii funcționează normal
  let ltd = 0;
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 2) { ltd = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); e.preventDefault(); }
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && ltd > 0) {
      const d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
      mmState.zoom = Math.max(0.2, Math.min(5, mmState.zoom*(d/ltd))); ltd=d; mmScheduleDraw(); e.preventDefault();
    }
  }, { passive: false });

  const ro = new ResizeObserver(() => mmScheduleDraw());
  ro.observe(canvas);
  // Double rAF asigură că browser-ul a calculat layout-ul înainte de desenare
  requestAnimationFrame(() => requestAnimationFrame(mmDraw));
}

function mmScheduleDraw() {
  if (mmState.animFrame) cancelAnimationFrame(mmState.animFrame);
  mmState.animFrame = requestAnimationFrame(mmDraw);
}
function mmToggleCollapse(nid) {
  if (!window._mmCollapsed) window._mmCollapsed = {};
  window._mmCollapsed[nid] = !window._mmCollapsed[nid];
  mmScheduleDraw();
}
function mmZoomReset() { mmState.zoom = 0.82; mmState.panX = 0; mmState.panY = 0; mmScheduleDraw(); }
function mmExpandAll() { window._mmCollapsed = {}; mmScheduleDraw(); }


function downloadMindMapSVG() {
  const mm = window._mmData, theme = window._mmTheme;
  if (!mm||!theme) return;
  const saved = window._mmCollapsed; window._mmCollapsed = {};
  const { nodes, edges } = mmBuildLayout(mm, theme);
  window._mmCollapsed = saved;
  const W=1120, H=700, ox=0, oy=70;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#080a0f"/>`;
  edges.forEach(e => { svg+=`<line x1="${e.x1+ox}" y1="${e.y1+oy}" x2="${e.x2+ox}" y2="${e.y2+oy}" stroke="${theme.accent}" stroke-width="${e.width}" stroke-opacity="${e.opacity}"/>`; });
  nodes.forEach(n => {
    if (n.type==='center') { svg+=`<circle cx="${n.x+ox}" cy="${n.y+oy}" r="${n.r}" fill="${theme.accent}" opacity="0.93"/><text x="${n.x+ox}" y="${n.y+oy+(n.sub?-5:5)}" text-anchor="middle" font-size="13" fill="white" font-family="DM Sans,sans-serif" font-weight="bold">${escapeHtml(n.label)}</text>`; if (n.sub) svg+=`<text x="${n.x+ox}" y="${n.y+oy+11}" text-anchor="middle" font-size="10" fill="white" font-family="DM Sans,sans-serif" opacity="0.85">${escapeHtml(n.sub)}</text>`; }
    else if (n.type==='main') { svg+=`<circle cx="${n.x+ox}" cy="${n.y+oy}" r="${n.r}" fill="${theme.muted}" stroke="${theme.accent}" stroke-width="2"/><text x="${n.x+ox}" y="${n.y+oy+(n.sub?-4:4)}" text-anchor="middle" font-size="11" fill="${theme.accent}" font-family="DM Sans,sans-serif" font-weight="bold">${escapeHtml(n.label)}</text>`; if (n.sub) svg+=`<text x="${n.x+ox}" y="${n.y+oy+9}" text-anchor="middle" font-size="9" fill="${theme.accent}" font-family="DM Sans,sans-serif" opacity="0.8">${escapeHtml(n.sub)}</text>`; }
    else if (n.type==='child') { const pw=n.label.length*7+20,ph=30; svg+=`<rect x="${n.x+ox-pw/2}" y="${n.y+oy-ph/2}" width="${pw}" height="${ph}" rx="9" fill="${theme.muted}" stroke="${theme.border}" stroke-width="1.2"/><text x="${n.x+ox}" y="${n.y+oy+4}" text-anchor="middle" font-size="10.5" fill="${theme.accent}" font-family="DM Sans,sans-serif" font-weight="600">${escapeHtml(n.label)}</text>`; }
  });
  svg += '</svg>';
  const blob = new Blob([svg], {type:'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='mindmap.svg'; a.click(); URL.revokeObjectURL(url);
}



// =============================================
// V7 — EXAM SIMULATOR
// =============================================
let examSimInterval = null;

function renderExamSimPage(element) {
  const subjects = getSubjects();
  let html = '<div class="anim"><div class="dash-hero" style="padding:28px 20px 20px"><h2>🎓 Exam Simulator</h2><p>Simulează condiții reale de examen — timp limitat, fără ajutor</p></div>';

  if (!state.activeExamSim) {
    html += '<div class="quiz-gen-section"><h3>' + icon('settings','sm') + ' Configurează Sesiunea</h3>';
    html += '<div style="margin-bottom:14px;"><label style="font-size:.82rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">Materie</label>';
    html += '<div class="quiz-options-row" id="simSubjectChips">';
    for (const [key, subject] of Object.entries(subjects)) {
      html += '<button class="quiz-chip ' + (state.simConfig&&state.simConfig.subject===key?'active':'') + '" data-stats-action="select-sim-subject" data-sim-subject="' + key + '">' + subjectIcon(subject,'xs') + ' ' + subject.name + '</button>';
    }
    html += '</div></div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">';
    html += '<div><label style="font-size:.82rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">Număr întrebări</label><div class="quiz-options-row">';
    [10,20,30,40].forEach(n => html += '<button class="quiz-chip ' + (!state.simConfig&&n===20||state.simConfig&&state.simConfig.count===n?'active':'') + '" data-stats-action="select-sim-count" data-sim-count="' + n + '">' + n + '</button>');
    html += '</div></div><div><label style="font-size:.82rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">Timp (minute)</label><div class="quiz-options-row">';
    [30,45,60,90].forEach(m => html += '<button class="quiz-chip ' + (!state.simConfig&&m===45||state.simConfig&&state.simConfig.minutes===m?'active':'') + '" data-stats-action="select-sim-minutes" data-sim-minutes="' + m + '">' + m + ' min</button>');
    html += '</div></div></div>';
    if (false) html += '<div style="padding:12px;background:var(--amber-muted);border-radius:var(--radius-sm);font-size:.85rem;color:var(--amber);">[!] Configurează API key-ul</div>';
    else { html += '<button class="summary-gen-btn" id="simGenBtn" data-stats-action="start-exam-sim">' + icon('graduation','sm') + ' Începe Simularea</button><span class="summary-status" id="simGenStatus" style="margin-left:12px;font-size:.82rem;color:var(--text-muted);"></span>'; }
    html += '</div>';
    html += renderExamSimHistory();
  } else {
    html += renderActiveExamSim();
  }
  html += '</div>';
  element.innerHTML = html;
  setupStatsMentorInteractions(element);
  if (state.activeExamSim) startExamSimTimer();
}

// Bug 8 fix: explicit el param for all sim config selectors
function selectSimSubject(k, el) { if(!state.simConfig)state.simConfig={}; state.simConfig.subject=k; document.querySelectorAll('#simSubjectChips .quiz-chip').forEach(b=>b.classList.remove('active')); if(el) el.classList.add('active'); }
function selectSimCount(n, el) { if(!state.simConfig)state.simConfig={}; state.simConfig.count=n; if(el) el.closest('.quiz-options-row').querySelectorAll('.quiz-chip').forEach(b=>b.classList.remove('active')); if(el) el.classList.add('active'); }
function selectSimMinutes(m, el) { if(!state.simConfig)state.simConfig={}; state.simConfig.minutes=m; if(el) el.closest('.quiz-options-row').querySelectorAll('.quiz-chip').forEach(b=>b.classList.remove('active')); if(el) el.classList.add('active'); }

function renderExamSimHistory() {
  const sessions = Object.values(state.examSessions||{}).flat();
  if (!sessions.length) return '';
  const subjects = getSubjects();
  sessions.sort((a,b)=>b.timestamp-a.timestamp);
  let html = '<div style="margin-top:24px;"><div style="font-size:.82rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">📊 Sesiuni Anterioare</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">';
  sessions.slice(0,8).forEach(s => {
    const subj = subjects[s.subject];
    const pct = Math.round((s.score/s.total)*100);
    const color = pct>=80?'var(--green)':pct>=60?'var(--amber)':'var(--red)';
    html += '<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;">';
    html += '<div style="font-size:.72rem;color:var(--text-muted);margin-bottom:4px;">' + (subj?subjectIcon(subj,'xs')+' '+subj.name:s.subject) + ' · ' + new Date(s.timestamp).toLocaleDateString('ro') + '</div>';
    html += '<div style="font-size:1.6rem;font-weight:800;color:'+color+';font-family:Syne,sans-serif">'+pct+'%</div>';
    html += '<div style="font-size:.8rem;color:var(--text-secondary)">'+s.score+'/'+s.total+' corecte</div></div>';
  });
  html += '</div></div>';
  return html;
}

async function startExamSim() {
  const cfg = state.simConfig||{};
  const subjectKey = cfg.subject, count = cfg.count||20, minutes = cfg.minutes||45;
  if (!subjectKey) { document.getElementById('simGenStatus').textContent = '[!] Selectează o materie'; return; }
  const subject = getSubjects()[subjectKey];
  const allPres = getAllPresentations(subjectKey);
  if (!allPres.length) { document.getElementById('simGenStatus').textContent = '[!] Nu există prezentări'; return; }

  let context = '';
  allPres.forEach(p => { context += p.slides.map(s => s.title + ': ' + s.content.replace(/<[^>]+>/g,' ').trim()).join('\n') + '\n\n'; });

  const btn = document.getElementById('simGenBtn'), statusEl = document.getElementById('simGenStatus');
  btn.disabled = true; btn.innerHTML = 'Se generează...'; statusEl.textContent = 'Durează ~25s...';

  try {
    const response = await (async function(){
      var __r = await authFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(window.__shAccessToken ? { 'Authorization': 'Bearer ' + window.__shAccessToken } : {}) },
        credentials: 'include',
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 8000,
        system: 'Creezi subiecte de examen pentru ' + subject.full + '. RĂSPUNDE STRICT cu JSON array. [{"q":"text","options":["A. v1","B. v2","C. v3","D. v4"],"correct":0,"explanation":"de ce"}]. EXACT ' + count + ' întrebări. Mix 70% grile, 30% adevărat/fals. Dificultate reală. În română.',
        messages: [{ role: 'user', content: 'Generează ' + count + ' subiecte din:\n\n' + context.substring(0,7000) }]
      })
      }); var __d = await __r.json(); return { content: [{ text: __d.content || '' }] }; })();
    const data = response;
    if (data.content && data.content[0]) {
      let raw = data.content[0].text.trim().replace(/^```json?\s*/,'').replace(/\s*```$/,'').trim();
      let questions = null; try { questions = JSON.parse(raw); if (!Array.isArray(questions)) questions = null; } catch(e) {}
      if (questions && questions.length) {
        state.activeExamSim = { subjectKey, questions, answers: new Array(questions.length).fill(undefined), flagged: new Array(questions.length).fill(false), currentIndex: 0, timeLimitMs: minutes*60000, timeLeftMs: minutes*60000, startedAt: Date.now() };
        saveState(); renderPage();
      } else { statusEl.textContent = '[!] Eroare la parsare.'; }
    } else if (data.error) { statusEl.textContent = '[!] ' + data.error.message; }
  } catch(err) { statusEl.textContent = '[!] ' + err.message; }

  btn.disabled = false; btn.innerHTML = '' + icon('graduation','sm') + ' Începe Simularea';
}

function renderActiveExamSim() {
  const sim = state.activeExamSim; if (!sim) return '';
  const { questions, answers, flagged, currentIndex, timeLeftMs } = sim;
  const q = questions[currentIndex];
  const mL = Math.floor(timeLeftMs/60000), sL = Math.floor((timeLeftMs%60000)/1000);
  const tClass = mL<5?'danger':mL<10?'warning':'';
  const subjects = getSubjects(), subject = subjects[sim.subjectKey];
  const totalAnswered = answers.filter(a=>a!==undefined).length;

  let html = '<div>';
  html += '<div class="exam-sim-header">';
  html += '<div><div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:4px;">' + (subject?subjectIcon(subject,'xs')+' '+subject.name:'') + '</div><div style="font-size:.85rem;font-weight:600;">' + totalAnswered + '/' + questions.length + ' răspunse</div></div>';
  html += '<div class="exam-sim-meta"><div class="exam-sim-timer ' + tClass + '" id="examTimer">' + String(mL).padStart(2,'0') + ':' + String(sL).padStart(2,'0') + '</div><div class="esm-label">timp rămas</div></div>';
  html += '<button class="quiz-nav-btn" data-stats-action="submit-exam-sim" style="background:var(--red);color:#fff;border-color:var(--red);">🏁 Predă</button></div>';

  html += '<div class="exam-q-nav">';
  questions.forEach((_,i) => { let cls = 'eq-nav-dot'; if(i===currentIndex)cls+=' current'; else if(answers[i]!==undefined)cls+=' answered'; else if(flagged[i])cls+=' flagged'; html += '<button class="'+cls+'" data-stats-action="go-to-sim-question" data-sim-question-index="'+i+'">'+(i+1)+'</button>'; });
  html += '</div>';

  html += '<div class="quiz-question-card">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
  html += '<div class="quiz-q-num">Întrebarea ' + (currentIndex+1) + ' din ' + questions.length + '</div>';
  html += '<button data-stats-action="toggle-sim-flag" data-sim-question-index="' + currentIndex + '" style="background:' + (flagged[currentIndex]?'var(--amber-muted)':'var(--bg-surface)') + ';border:1px solid ' + (flagged[currentIndex]?'var(--amber)':'var(--border)') + ';color:' + (flagged[currentIndex]?'var(--amber)':'var(--text-muted)') + ';padding:5px 12px;border-radius:var(--radius-xs);font-size:.78rem;cursor:pointer;">🚩 Marchează</button></div>';
  html += '<div class="quiz-q-text">' + escapeHtml(q.q) + '</div><div class="quiz-options">';
  const letters = ['A','B','C','D'];
  (q.options||[]).forEach((opt,oi) => {
    const isSel = answers[currentIndex]===oi;
    html += '<button class="quiz-option' + (isSel?'" style="background:var(--accent-muted);border-color:var(--accent);"':'"') + ' data-stats-action="answer-sim-question" data-sim-answer-index="' + oi + '">';
    html += '<span class="quiz-option-letter"' + (isSel?' style="background:var(--accent);color:#fff;"':'') + '>' + letters[oi] + '</span><span>' + escapeHtml(opt) + '</span></button>';
  });
  html += '</div></div>';

  html += '<div class="quiz-nav-btns">';
  html += '<button class="quiz-nav-btn" data-stats-action="prev-sim-question" ' + (currentIndex===0?'disabled':'') + '>← Prev</button>';
  html += '<button class="quiz-nav-btn primary" data-stats-action="next-sim-question" ' + (currentIndex===questions.length-1?'disabled':'') + '>Next →</button></div></div>';
  return html;
}

function startExamSimTimer() {
  if (examSimInterval) clearInterval(examSimInterval);
  examSimInterval = setInterval(() => {
    if (!state.activeExamSim) { clearInterval(examSimInterval); return; }
    state.activeExamSim.timeLeftMs -= 1000;
    if (state.activeExamSim.timeLeftMs <= 0) { clearInterval(examSimInterval); submitExamSim(); return; }
    const ms = state.activeExamSim.timeLeftMs, m = Math.floor(ms/60000), s = Math.floor((ms%60000)/1000);
    const el = document.getElementById('examTimer');
    if (el) { el.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0'); el.className = 'exam-sim-timer ' + (m<5?'danger':m<10?'warning':''); }
  }, 1000);
}

function goToSimQuestion(i) { if(!state.activeExamSim)return; state.activeExamSim.currentIndex=i; document.getElementById('pageContent').innerHTML='<div class="anim">'+renderActiveExamSim()+'</div>'; startExamSimTimer(); }
function answerSimQuestion(oi) { if(!state.activeExamSim)return; state.activeExamSim.answers[state.activeExamSim.currentIndex]=oi; saveState(); document.getElementById('pageContent').innerHTML='<div class="anim">'+renderActiveExamSim()+'</div>'; startExamSimTimer(); }
function toggleSimFlag(i) { if(!state.activeExamSim)return; state.activeExamSim.flagged[i]=!state.activeExamSim.flagged[i]; saveState(); document.getElementById('pageContent').innerHTML='<div class="anim">'+renderActiveExamSim()+'</div>'; startExamSimTimer(); }
function nextSimQuestion() { if(!state.activeExamSim||state.activeExamSim.currentIndex>=state.activeExamSim.questions.length-1)return; state.activeExamSim.currentIndex++; document.getElementById('pageContent').innerHTML='<div class="anim">'+renderActiveExamSim()+'</div>'; startExamSimTimer(); }
function prevSimQuestion() { if(!state.activeExamSim||state.activeExamSim.currentIndex<=0)return; state.activeExamSim.currentIndex--; document.getElementById('pageContent').innerHTML='<div class="anim">'+renderActiveExamSim()+'</div>'; startExamSimTimer(); }

function submitExamSim() {
  if (!state.activeExamSim) return;
  if (examSimInterval) clearInterval(examSimInterval);
  const sim = state.activeExamSim;
  const { questions, answers, subjectKey, timeLimitMs, timeLeftMs } = sim;
  const score = answers.filter((a,i) => a === questions[i].correct).length, total = questions.length;
  const pct = Math.round((score/total)*100);
  if (!state.examSessions) state.examSessions = {};
  if (!state.examSessions[subjectKey]) state.examSessions[subjectKey] = [];
  state.examSessions[subjectKey].push({ subject: subjectKey, score, total, timeLimitMs, timeLeftMs, timestamp: Date.now() });
  state.activeExamSim = null;
  awardXP(pct>=80?150:pct>=60?80:40, 'Exam Simulator (' + pct + '%)', subjectKey);
  saveState();

  const subjects = getSubjects(), subject = subjects[subjectKey];
  const color = pct>=80?'var(--green)':pct>=60?'var(--amber)':'var(--red)';
  let html = '<div class="anim"><div class="quiz-score-card" style="margin:20px 0;">';
  html += '<div style="font-size:3rem;margin-bottom:12px;">' + (pct>=80?'✓':pct>=60?'→':'↑') + '</div>';
  html += '<div class="quiz-score-num" style="color:'+color+'">' + pct + '%</div>';
  html += '<div class="quiz-score-label">' + score + '/' + total + ' corecte</div>';
  html += '<div style="text-align:left;margin:20px 0;">';
  questions.forEach((q,i) => {
    const ok = answers[i]===q.correct;
    html += '<div style="padding:8px 12px;border-radius:var(--radius-xs);margin-bottom:5px;background:' + (ok?'var(--green-muted)':'var(--red-muted)') + ';border:1px solid ' + (ok?'var(--green)':'var(--red)') + ';font-size:.82rem;">';
    html += '<strong style="color:' + (ok?'var(--green)':'var(--red)') + '">' + (ok?'✓':'✗') + ' Q' + (i+1) + '.</strong> ' + escapeHtml(q.q.substring(0,60)) + (q.q.length>60?'...':'');
    if (!ok) html += '<div style="font-size:.75rem;color:var(--text-secondary);margin-top:3px;">Răspuns corect: ' + escapeHtml((q.options||[])[q.correct]||'') + '</div>';
    html += '</div>';
  });
  html += '</div><button class="quiz-nav-btn primary" data-nav-tab="examsim">↩ Sesiune nouă</button></div></div>';
  document.getElementById('pageContent').innerHTML = html;
}

// =============================================
// V7 — SETTINGS (Import / Export / Collab)
// =============================================
function renderSettingsPage(element) {
  let html = '<div class="anim"><div class="dash-hero" style="padding:28px 20px 20px"><h2>' + icon('settings','sm') + ' Setări</h2><p>API key, backup date, import/export</p></div>';

  // ── API KEY — prima și cea mai importantă secțiune ──
  const apiKeySet = !!(state.apiKey && state.apiKey.length > 10);
  html += '<div class="quiz-gen-section" style="border-color:' + (apiKeySet ? 'var(--accent-border)' : 'rgba(245,166,35,.4)') + ';background:' + (apiKeySet ? 'var(--accent-muted)' : 'var(--amber-muted)') + ';">';
  html += '<h3 style="color:' + (apiKeySet ? 'var(--accent)' : 'var(--amber)') + '">' + icon('key','sm') + ' ' + (apiKeySet ? 'Claude API Key — Activ ✓' : 'Claude API Key — Neconfigurat') + '</h3>';
  html += '<p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:14px;">Necesar pentru AI Tutor, Quiz, Flashcards AI, Mind Map și Prezentări. Obții gratuit de la <a href="https://console.anthropic.com/settings/keys" target="_blank" style="color:var(--accent);text-decoration:underline;">console.anthropic.com</a>.</p>';
  html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
  html += '<input type="password" id="apiKeyInput" class="todo-inp" placeholder="configurat automat de server" style="flex:1;min-width:220px;font-family:var(--font-mono);font-size:.82rem;letter-spacing:.04em;" value="' + (state.apiKey ? state.apiKey : '') + '">';
  html += '<button class="summary-gen-btn" data-stats-action="save-api-key" style="flex:none;">' + icon('check','xs') + ' Salvează</button>';
  if (apiKeySet) {
    html += '<button class="quiz-nav-btn" data-stats-action="clear-api-key" style="border-color:var(--red);color:var(--red);flex:none;">' + icon('trash','xs') + ' Șterge</button>';
  }
  html += '</div>';
  html += '<div id="apiStatus" class="api-status ' + (apiKeySet ? 'ok' : '') + '" style="margin-top:10px;font-size:.8rem;">' + (apiKeySet ? '[OK] API key activ — funcțiile AI sunt disponibile.' : '[!] Fără API key funcțiile AI nu sunt disponibile.') + '</div>';
  html += '</div>';

  // ── EXPORT / IMPORT ──
  html += '<div class="quiz-gen-section"><h3>' + icon('download','sm') + ' Export Date</h3>';
  html += '<p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:14px;">Descarcă toate datele tale ca fișier JSON pentru backup sau transfer.</p>';
  html += '<div style="display:flex;gap:10px;flex-wrap:wrap;">';
  html += '<button class="summary-gen-btn" data-stats-action="export-data">' + icon('download','xs') + ' Export JSON complet</button>';
  html += '<button class="quiz-nav-btn" data-stats-action="export-progress-pdf">' + icon('file','xs') + ' Export PDF Raport</button>';
  html += '<button class="quiz-nav-btn" data-stats-action="export-collab-code">' + icon('link','xs') + ' Generează Cod Collab</button></div></div>';

  html += '<div class="quiz-gen-section"><h3>' + icon('upload','sm') + ' Import Date</h3>';
  html += '<p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:14px;">Restaurează dintr-un backup JSON.</p>';
  html += '<div class="import-export-zone"><input type="file" id="settingsImportInput" accept=".json"><div style="font-size:2rem;margin-bottom:8px;">📁</div><div style="font-weight:600;">Trage fișierul JSON sau click</div><div style="font-size:.78rem;color:var(--text-muted);margin-top:4px;">Fișier exportat din ASE Real Study</div></div></div>';

  html += '<div class="quiz-gen-section"><h3>' + icon('layers','sm') + ' Collab Mode</h3>';
  html += '<p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:14px;">Partajează prezentările cu un coleg folosind un cod.</p>';
  html += '<div style="display:flex;gap:10px;"><input class="todo-inp" id="collabCodeInput" placeholder="Introdu cod collab..." style="flex:1;"><button class="quiz-nav-btn primary" data-stats-action="import-collab-code">' + icon('download','xs') + ' Import</button></div>';
  html += '<div id="collabCodeDisplay"></div></div>';

  html += '<div class="quiz-gen-section" style="border:1px solid var(--red);background:var(--red-muted);">';
  html += '<h3 style="color:var(--red)">' + icon('alert','sm') + ' Zonă Periculoasă</h3>';
  html += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">';
  html += '<button class="quiz-nav-btn" style="border-color:var(--red);color:var(--red);" data-stats-action="reset-pin">' + icon('lock','xs') + ' Schimbă PIN</button>';
  html += '<button class="quiz-nav-btn" style="border-color:var(--red);color:var(--red);" data-stats-action="clear-all-data">' + icon('trash','xs') + ' Șterge toate datele</button></div></div>';

  html += '</div>';
  element.innerHTML = html;
  setupStatsMentorInteractions(element);
}

function exportData() {
  const blob = new Blob([JSON.stringify({ version:7, exportDate: new Date().toISOString(), data: JSON.parse(JSON.stringify(state)) }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'ase-study-hub-backup-' + new Date().toISOString().split('T')[0] + '.json'; a.click(); URL.revokeObjectURL(url);
  showToast('[OK] Export complet descărcat!');
}

function importData(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      const data = imported.data || imported;
      if (!confirm('Importezi datele din backup? Datele curente vor fi înlocuite!')) return;
      Object.assign(state, data); SUBJECTS = getSubjects(); saveState();
      showToast('[OK] Date importate cu succes!'); renderPage(); renderSidebar();
    } catch(err) { alert('Fișier invalid: ' + err.message); }
  };
  reader.readAsText(file);
}

function exportCollabCode() {
  const collabData = { type:'collab', presentations: state.presentations, customSubjects: state.customSubjects, version:7 };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(collabData))));
  const shortCode = encoded.substring(0,8).toUpperCase();
  localStorage.setItem('ash_collab_' + shortCode, encoded);
  const displayEl = document.getElementById('collabCodeDisplay');
  if (displayEl) displayEl.innerHTML = '<div class="collab-code-display">' + shortCode + '</div><div style="font-size:.78rem;color:var(--text-muted);text-align:center;">Dă acest cod colegului tău</div>';
  showToast('Cod generat: ' + shortCode);
}

function importCollabCode() {
  const code = document.getElementById('collabCodeInput').value.trim().toUpperCase();
  if (!code) { alert('Introdu un cod!'); return; }
  const encoded = localStorage.getItem('ash_collab_' + code);
  if (!encoded) { alert('Codul nu a fost găsit în acest browser. Folosește Export JSON pentru transfer între dispozitive.'); return; }
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    if (!confirm('Importezi din codul "' + code + '"?')) return;
    if (data.presentations) {
      for (const [key, pres] of Object.entries(data.presentations)) {
        if (!state.presentations[key]) state.presentations[key] = [];
        const existing = state.presentations[key].map(p => p.id);
        pres.forEach(p => { if (!existing.includes(p.id)) state.presentations[key].push(p); });
      }
    }
    if (data.customSubjects && Object.keys(data.customSubjects).length) { state.customSubjects = { ...state.customSubjects, ...data.customSubjects }; SUBJECTS = getSubjects(); }
    saveState(); showToast('[OK] Date collab importate!'); renderPage(); renderSidebar();
  } catch(err) { alert('Eroare la import: ' + err.message); }
}

function resetPIN() {
  // PIN eliminat — butonul acum face logout
  if (!confirm('Ești sigur că vrei să te deconectezi?')) return;
  state.pin = null; saveState(); handleLogout();
}

function clearAllData() {
  if (!confirm('ATENȚIE! Pierzi TOATE datele. Continui?')) return;
  if (!confirm('Ești absolut sigur? Ireversibil!')) return;
  localStorage.clear(); location.reload();
}

// =============================================
// V8 — STATISTICI AVANSATE
// =============================================
function renderStatsPage(element) {
  const subjects = getSubjects();
  const log = state.activityLog || [];
  const today = new Date();

  // ── Calcule generale ──────────────────────
  const totalXP = state.xp || 0;
  const totalQuizzes = Object.values(state.quizHistory || {}).flat().length;
  const avgQuizScore = (() => {
    const all = Object.values(state.quizHistory || {}).flat();
    if (!all.length) return 0;
    return Math.round(all.reduce((a, r) => a + (r.score / r.total) * 100, 0) / all.length);
  })();
  const totalFC = Object.values(state.flashcardDecks || {}).flat().length;
  const totalFCReviews = Object.values(state.flashcardDecks || {}).flat().reduce((a, c) => a + (c.reviews || 0), 0);
  const totalPres = Object.values(state.presentations || {}).flat().length;
  const totalExamSessions = Object.values(state.examSessions || {}).flat().length;

  // Timp total estimat (din studyTime) — formatat corect
  const totalMinutes = Object.values(state.studyTime || {}).reduce((a, b) => a + b, 0);
  const totalHours = formatStudyTime(totalMinutes);

  // XP per zi (ultimele 30 zile)
  const xpPerDay = {};
  log.forEach(e => { xpPerDay[e.date] = (xpPerDay[e.date] || 0) + (e.xp || 0); });

  // XP per materie
  const xpPerSubject = {};
  log.forEach(e => {
    if (e.subject) xpPerSubject[e.subject] = (xpPerSubject[e.subject] || 0) + (e.xp || 0);
  });

  // Tipuri de activitate
  const actTypes = {};
  log.forEach(e => {
    const cat = categorizeActivity(e.type);
    actTypes[cat] = (actTypes[cat] || 0) + (e.xp || 0);
  });

  // ── HTML ──────────────────────────────────
  let html = '<div class="anim">';
  html += '<div class="dash-hero" style="padding:28px 20px 20px"><h2>' + icon('chart','sm') + ' Insight Center</h2><p>Vezi progresul, descompune indicatorii și explorează relațiile dintre efort, retenție și rezultate.</p></div>';
  html += renderStatsGuide();
  html += renderStatsInterpretation(totalQuizzes, avgQuizScore, totalFCReviews);

  // Hero stats cards
  html += '<div class="stats-grid">';
  const heroStats = [
    { val: totalXP, label: 'XP Total', sub: 'Nivel ' + (state.level || 1), color: 'var(--accent)' },
    { val: (state.streak || 0), label: 'Streak Actual', sub: 'zile consecutive', color: 'var(--amber)' },
    { val: totalHours, label: 'Timp Studiu', sub: 'estimat total', color: 'var(--blue)' },
    { val: totalQuizzes, label: 'Quiz-uri', sub: avgQuizScore + '% medie', color: 'var(--green)' },
    { val: totalFC, label: 'Flashcards', sub: totalFCReviews + ' reviews', color: 'var(--teal, #2ec4b6)' },
    { val: totalPres, label: 'Prezentări', sub: 'generate AI', color: 'var(--red)' },
    { val: totalExamSessions, label: 'Exam Sims', sub: 'sesiuni complete', color: 'var(--pink, #e879a0)' },
    { val: (state.achievements || []).length, label: 'Achievements', sub: 'din ' + 16, color: 'var(--amber)' },
  ];
  heroStats.forEach(s => {
    html += '<div class="stat-hero-card">';
    html += '<div class="shc-val" style="color:' + s.color + '">' + s.val + '</div>';
    html += '<div class="shc-label">' + s.label + '</div>';
    html += '<div class="shc-sub">' + s.sub + '</div>';
    html += '</div>';
  });
  html += '</div>';

  html += renderLearningPlayground(Object.keys(subjects)[0] || '__generic__', Object.values(subjects)[0] || { name: 'Study Flow', full: 'Learning Flow' });

  // Heatmap 30 zile + Distribuție activitate
  html += '<div class="stats-two-col">';

  // Heatmap
  html += '<div class="stats-chart-panel">';
  html += '<div class="scp-title">Activitate — 30 Zile</div>';
  html += '<div class="heatmap-30">';
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const dayXP = xpPerDay[dStr] || 0;
    const lvl = dayXP > 200 ? 4 : dayXP > 100 ? 3 : dayXP > 50 ? 2 : dayXP > 0 ? 1 : 0;
    const dayLabel = d.toLocaleDateString('ro', { weekday: 'short', day: 'numeric', month: 'short' });
    html += '<div class="heat-cell l' + lvl + '" title="' + dayLabel + ': ' + dayXP + ' XP" style="cursor:default;"></div>';
  }
  html += '</div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:.65rem;color:var(--text-muted);margin-top:8px;">';
  html += '<span>acum 30 zile</span><span>azi</span></div>';
  html += '<div style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:.7rem;color:var(--text-muted);">';
  html += '<span>Mai puțin</span>';
  [0,1,2,3,4].forEach(l => html += '<div class="heat-cell l' + l + '" style="width:14px;height:14px;border-radius:2px;flex-shrink:0;cursor:default;"></div>');
  html += '<span>Mai mult</span></div>';
  html += '</div>';

  // Distribuție activitate
  html += '<div class="stats-chart-panel">';
  html += '<div class="scp-title">' + icon('target','sm') + ' Distribuție Activitate (XP)</div>';
  const actColors = {
    'Quiz': 'var(--accent)', 'Flashcards': 'var(--green)', 'Prezentări': 'var(--blue)',
    'Exam Sim': 'var(--red)', 'Mind Map': 'var(--amber)', 'Altele': 'var(--text-muted)'
  };
  const totalActXP = Object.values(actTypes).reduce((a, b) => a + b, 1);

  // Visual bar chart pentru activitati
  html += '<div style="display:flex;flex-direction:column;gap:8px;">';
  Object.entries(actTypes).sort((a, b) => b[1] - a[1]).forEach(([type, xp]) => {
    const pct = Math.round((xp / totalActXP) * 100);
    const color = actColors[type] || 'var(--text-muted)';
    html += '<div>';
    html += '<div style="display:flex;justify-content:space-between;font-size:.75rem;margin-bottom:3px;">';
    html += '<span style="color:var(--text-secondary)">' + type + '</span>';
    html += '<span style="color:var(--text-muted);font-family:JetBrains Mono,monospace">' + xp + ' XP (' + pct + '%)</span>';
    html += '</div>';
    html += '<div style="height:6px;background:var(--bg-overlay);border-radius:3px;overflow:hidden;">';
    html += '<div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:3px;transition:width .6s"></div>';
    html += '</div></div>';
  });
  if (!Object.keys(actTypes).length) {
    html += '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:.85rem;">Nicio activitate înregistrată încă</div>';
  }
  html += '</div></div>';

  html += '</div>'; // end stats-two-col

  // Timp per materie + Performance quiz
  html += '<div class="stats-two-col">';

  // Timp per materie
  html += '<div class="stats-chart-panel">';
  html += '<div class="scp-title">⏱ Timp Studiu per Materie</div>';
  const studyEntries = Object.entries(state.studyTime || {})
    .filter(([k]) => subjects[k])
    .sort((a, b) => b[1] - a[1]);
  const maxTime = Math.max(...studyEntries.map(([, v]) => v), 1);

  if (studyEntries.length) {
    studyEntries.forEach(([key, minutes]) => {
      const subj = subjects[key];
      if (!subj) return;
      const theme = getSubjectTheme(subj);
      const pct = Math.round((minutes / maxTime) * 100);
      const hrs = formatStudyTime(minutes);
      html += '<div class="subject-time-row">';
      html += '<span class="str-icon" style="display:inline-flex;align-items:center;">' + subjectIcon(subj,'xs') + '</span>';
      html += '<span class="str-name" title="' + subj.name + '">' + subj.name + '</span>';
      html += '<div class="str-bar-wrap"><div class="str-bar-fill" style="width:' + pct + '%;background:' + theme.accent + '"></div></div>';
      html += '<span class="str-val">' + hrs + '</span>';
      html += '</div>';
    });
  } else {
    html += '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:.85rem;">Completează quiz-uri și flashcard-uri pentru a acumula timp de studiu</div>';
  }
  html += '</div>';

  // Performance quiz per materie
  html += '<div class="stats-chart-panel">';
  html += '<div class="scp-title">🧠 Performance Quiz per Materie</div>';
  const quizH = state.quizHistory || {};
  const quizSubjects = Object.keys(quizH).filter(k => quizH[k].length > 0);

  if (quizSubjects.length) {
    html += '<table class="perf-table"><thead><tr>';
    html += '<th>Materie</th><th>Quiz-uri</th><th>Medie</th><th>Best</th>';
    html += '</tr></thead><tbody>';
    quizSubjects.forEach(key => {
      const subj = subjects[key];
      const results = quizH[key] || [];
      const avg = Math.round(results.reduce((a, r) => a + (r.score / r.total) * 100, 0) / results.length);
      const best = Math.round(Math.max(...results.map(r => (r.score / r.total) * 100)));
      const avgColor = avg >= 80 ? 'var(--green)' : avg >= 60 ? 'var(--amber)' : 'var(--red)';
      html += '<tr>';
      html += '<td>' + (subj ? subjectIcon(subj,'xs') + ' ' + subj.name : key) + '</td>';
      html += '<td style="text-align:center;color:var(--text-muted)">' + results.length + '</td>';
      html += '<td><span class="score-pill" style="background:' + avgColor + '22;color:' + avgColor + '">' + avg + '%</span></td>';
      html += '<td><span class="score-pill" style="background:var(--green-muted);color:var(--green)">' + best + '%</span></td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
  } else {
    html += '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:.85rem;">Niciun quiz completat încă</div>';
  }
  html += '</div>';

  html += '</div>'; // end stats-two-col

  // XP per materie — bar orizontal
  html += '<div class="stats-chart-panel" style="margin-bottom:24px;">';
  html += '<div class="scp-title">XP per Materie</div>';
  const xpSubjEntries = Object.entries(xpPerSubject).filter(([k]) => subjects[k]).sort((a, b) => b[1] - a[1]);
  const maxXPSubj = Math.max(...xpSubjEntries.map(([, v]) => v), 1);

  if (xpSubjEntries.length) {
    xpSubjEntries.forEach(([key, xp]) => {
      const subj = subjects[key];
      if (!subj) return;
      const theme = getSubjectTheme(subj);
      const pct = Math.round((xp / maxXPSubj) * 100);
      html += '<div class="subject-time-row">';
      html += '<span class="str-icon" style="display:inline-flex;align-items:center;">' + subjectIcon(subj,'xs') + '</span>';
      html += '<span class="str-name" title="' + subj.name + '">' + subj.name + '</span>';
      html += '<div class="str-bar-wrap"><div class="str-bar-fill" style="width:' + pct + '%;background:' + theme.accent + '"></div></div>';
      html += '<span class="str-val">' + xp + ' XP</span>';
      html += '</div>';
    });
  } else {
    html += '<div style="text-align:center;color:var(--text-muted);padding:16px;font-size:.85rem;">Niciun XP acumulat per materie încă</div>';
  }
  html += '</div>';

  html += '</div>'; // end anim
  element.innerHTML = html;
}

// Versiune scurta a insight-ului pentru dashboard card
function generateAutoInsightShort() {
  const dueFC = getFlashcardsDueCount();
  if (dueFC > 0) return dueFC + ' flashcards scadente azi';
  const streak = state.streak || 0;
  if (streak >= 7) return 'Streak ' + streak + ' zile!';
  const nextExam = (state.exams || []).filter(e => new Date(e.date) >= new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date))[0];
  if (nextExam) { const d=Math.round((new Date(nextExam.date)-new Date())/(1000*60*60*24)); return 'Examen în ' + d + ' zile'; }
  return 'Analiză personalizată AI';
}

// Categorizeaza tipul de activitate pentru statistici
function categorizeActivity(type) {
  if (!type) return 'Altele';
  const t = type.toLowerCase();
  if (t.includes('quiz')) return 'Quiz';
  if (t.includes('flash') || t.includes('card')) return 'Flashcards';
  if (t.includes('prezent') || t.includes('generat')) return 'Prezentări';
  if (t.includes('exam')) return 'Exam Sim';
  if (t.includes('mind') || t.includes('map')) return 'Mind Map';
  return 'Altele';
}

// =============================================
// V8 — AI MENTOR
// =============================================
function buildSummaryQuickPrompts(sc) {
  const dom = sc.domain_category || 'other';
  const title = sc.title || '';
  const secs = sc.sectionObjects || [];

  // Domain-specific "Apply" prompts
  const applyMap = {
    exact_sciences: [
      { icon: '🧮', text: 'Rezolvă un exercițiu similar cu ce e în fișa "' + title + '"' },
      { icon: '🌍', text: 'Unde apare "' + title + '" în situații reale?' },
    ],
    social_sciences: [
      { icon: '🧠', text: 'Dă-mi un caz real de aplicare a conceptelor din "' + title + '"' },
      { icon: '💼', text: 'Cum aplic "' + title + '" la locul de muncă?' },
    ],
    law: [
      { icon: '⚖️', text: 'Dă-mi o speță juridică legată de "' + title + '"' },
      { icon: '📋', text: 'Care sunt condițiile și excepțiile din "' + title + '"?' },
    ],
    medicine: [
      { icon: '🏥', text: 'Dă-mi un caz clinic bazat pe "' + title + '"' },
      { icon: '🔬', text: 'Explică mecanismul fiziopatologic din "' + title + '"' },
    ],
    cs: [
      { icon: '💻', text: 'Scrie cod care ilustrează conceptul din "' + title + '"' },
      { icon: '⚡', text: 'Care e complexitatea și când îl folosesc în practică?' },
    ],
    humanities: [
      { icon: '📖', text: 'Care e contextul istoric al "' + title + '"?' },
      { icon: '🔄', text: 'Cum se compară cu alte teorii similare?' },
    ],
    other: [
      { icon: '💡', text: 'Dă-mi un exemplu practic din "' + title + '"' },
      { icon: '🌍', text: 'Unde apare "' + title + '" în viața reală?' },
    ],
  };

  const prompts = (applyMap[dom] || applyMap.other).slice();

  // Section-specific prompts (top 2 most relevant sections)
  const sectionPromptMap = {
    mechanism:    function(t) { return { icon: '⚙️', text: 'Explică mecanismul "' + t + '" cu un exemplu concret' }; },
    cauza_efect:  function(t) { return { icon: '🔗', text: 'Urmărește lanțul cauzal din "' + t + '"' }; },
    comparatie:   function(t) { return { icon: '⚖️', text: 'Când aleg prima față de a doua opțiune din "' + t + '"?' }; },
    ddx:          function(t) { return { icon: '🔍', text: 'Cum diferențiez variantele din "' + t + '"?' }; },
    protocol:     function(t) { return { icon: '📋', text: 'Parcurge cu mine protocolul din "' + t + '"' }; },
    caz:          function(t) { return { icon: '📁', text: 'Analizează împreună cu mine cazul din "' + t + '"' }; },
    warnings:     function(t) { return { icon: '⚠️', text: 'Ce greșeli frecvente trebuie să evit în "' + t + '"?' }; },
    aplicatii:    function(t) { return { icon: '🚀', text: 'Dezvoltă aplicațiile practice din "' + t + '"' }; },
    formule:      function(t) { return { icon: '🧮', text: 'Explică-mi formula din "' + t + '" pas cu pas' }; },
    taxonomie:    function(t) { return { icon: '🗂️', text: 'Cum clasific corect elementele din "' + t + '"?' }; },
    conditii:     function(t) { return { icon: '✅', text: 'Când se aplică și când nu se aplică "' + t + '"?' }; },
    articol:      function(t) { return { icon: '📜', text: 'Dă-mi un caz practic pentru "' + t + '"' }; },
  };

  secs.slice(0, 3).forEach(function(s) {
    var fn = sectionPromptMap[s.kind];
    if (fn) prompts.push(fn(s.title));
  });

  // Always add exam prep
  prompts.push({ icon: '📝', text: 'Ce ar putea fi la examen din "' + title + '"?' });

  return prompts.slice(0, 6);
}

function renderMentorPage(element) {
  let html = '<div class="anim">';
  html += '<div class="mentor-layout">';

  // ── Panoul principal de chat ──
  html += '<div class="mentor-chat">';
  html += '<div class="mentor-chat-header">';
  html += '<div class="mentor-avatar">' + icon('robot','lg') + '</div>';
  html += '<div><div style="font-weight:700;font-size:.95rem;">AI Mentor</div>';
  html += '<div class="mentor-status">Online — analizează progresul tău</div></div>';
  if ((state.mentorHistory || []).length > 0) {
    html += '<button data-stats-action="clear-mentor-history" style="margin-left:auto;padding:5px 10px;border-radius:var(--radius-xs);border:1px solid var(--border);background:var(--bg-surface);color:var(--text-muted);font-size:.72rem;cursor:pointer;">' + icon('trash','xs') + ' Șterge</button>';
  }
  html += '</div>';

  // Mesaje
  html += '<div class="mentor-messages" id="mentorMessages">';
  if ((state.mentorHistory || []).length === 0) {
    html += renderMentorWelcome();
  } else {
    (state.mentorHistory || []).forEach(msg => {
      if (msg.role === 'assistant') {
        // Bug 9 fix: re-apply formatAIText/sanitization at render time,
        // not just at write time. Defends against stale unsanitized localStorage data.
        html += '<div class="mentor-msg ai"><div class="msg-sender">AI Mentor</div>' + formatAIText(msg.content) + '</div>';
      } else {
        html += '<div class="mentor-msg user">' + escapeHtml(msg.content) + '</div>';
      }
    });
  }
  html += '</div>';

  // Input
  html += '<div class="mentor-input-area">';
  if (false) {
    html += '<div style="width:100%;text-align:center;color:var(--text-muted);font-size:.82rem;">[!] Configurează API key-ul din Dashboard pentru AI Mentor</div>';
  } else {
    html += '<textarea class="mentor-input" id="mentorInput" rows="1" placeholder="Pune o întrebare sau cere o analiză..."></textarea>';
    html += '<button class="mentor-send-btn" id="mentorSendBtn" data-stats-action="send-mentor-message">Trimite</button>';
  }
  html += '</div>';
  html += '</div>'; // end mentor-chat

  // ── Panoul lateral ──
  html += '<div class="mentor-side-panel">';
  html += renderMentorGuide();

  // Snapshot progres
  html += '<div class="mentor-context-card">';
  html += '<div class="mcc-title">Snapshot Progres</div>';
  html += renderMentorSnapshot();
  html += '</div>';

  // Fișa activă — banner dacă există context
  if (window.__activeSummaryContext) {
    const sc = window.__activeSummaryContext;
    html += '<div style="background:rgba(242,155,109,.08);border:1px solid rgba(242,155,109,.22);border-radius:11px;padding:12px 14px;margin-bottom:12px;">';
    html += '<div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);margin-bottom:6px;">📄 Fișă activă</div>';
    html += '<div style="font-size:.82rem;font-weight:600;color:var(--text-primary);margin-bottom:4px;">' + escapeHtml(sc.title||'') + '</div>';
    if (sc.subject) html += '<div style="font-size:.74rem;color:var(--text-muted);">' + escapeHtml(sc.subject) + '</div>';
    html += '<button onclick="window.__activeSummaryContext=null;renderMentorPage(document.getElementById(\'pageContent\'))" style="margin-top:8px;font-size:.7rem;color:var(--text-muted);background:none;border:none;cursor:pointer;padding:0;text-decoration:underline;">Șterge contextul</button>';
    html += '</div>';
  }

  // Quick prompts
  html += '<div class="mentor-context-card">';
  html += '<div class="mcc-title">Întrebări Rapide</div>';
  const summaryPrompts = window.__activeSummaryContext ? buildSummaryQuickPrompts(window.__activeSummaryContext) : [
    { icon: 'chart', text: 'Analizează-mi progresul complet' },
    { icon: '⚠️', text: 'Unde sunt cel mai slab?' },
    { icon: 'calendar', text: 'Cum să mă pregătesc pentru examene?' },
    { icon: 'target', text: 'Ce să studiez azi?' },
    { icon: 'flame', text: 'Cum îmi mențin streak-ul?' },
    { icon: 'brain', text: 'Strategii pentru quiz-uri mai bune' },
  ];
  summaryPrompts.forEach(p => {
    html += '<button class="mentor-quick-prompt" data-stats-action="mentor-quick-prompt" data-mentor-prompt="' + escapeHtml(p.text) + '">' + (typeof p.icon === 'string' && p.icon.length <= 2 ? p.icon : '') + ' ' + p.text + '</button>';
  });
  html += '</div>';

  // Insight automat
  html += '<div class="mentor-context-card">';
  html += '<div class="mcc-title">Insight Automat</div>';
  html += '<div style="font-size:.82rem;color:var(--text-secondary);line-height:1.6;">' + generateAutoInsight() + '</div>';
  html += '</div>';

  html += '</div>'; // end mentor-side-panel
  html += '</div>'; // end mentor-layout
  html += '</div>'; // end anim

  element.innerHTML = html;
  setupStatsMentorInteractions(element);

  // Scroll la bottom
  setTimeout(() => {
    const msgs = document.getElementById('mentorMessages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }, 50);

  // Auto-send if triggered from dashboard quick mentor widget
  if (state.pendingMentorMessage) {
    var pendingText = state.pendingMentorMessage;
    state.pendingMentorMessage = null;
    saveState();
    setTimeout(function() {
      var inp = document.getElementById('mentorInput');
      if (inp) {
        inp.value = pendingText;
        sendMentorMessage();
      }
    }, 150);
  }
}

function setupStatsMentorInteractions(element) {
  if (!element || element.__statsMentorBound) return;
  element.__statsMentorBound = true;

  const importInput = element.querySelector('#settingsImportInput');
  if (importInput && !importInput.dataset.bound) {
    importInput.dataset.bound = 'true';
    importInput.addEventListener('change', importData);
  }

  element.addEventListener('click', function(event) {
    const navEl = event.target.closest('[data-nav-tab]');
    if (navEl && element.contains(navEl)) {
      navigateTo(navEl.dataset.navTab);
      return;
    }

    const actionEl = event.target.closest('[data-stats-action]');
    if (!actionEl || !element.contains(actionEl)) return;

    const action = actionEl.dataset.statsAction;
    switch (action) {
      case 'select-mm-subject':
        selectMMSubject(actionEl.dataset.mmSubject, actionEl);
        return;
      case 'generate-mindmap':
        generateMindMap();
        return;
      case 'clear-mindmap':
        clearMindMap();
        return;
      case 'mm-zoom-reset':
        mmZoomReset();
        return;
      case 'mm-expand-all':
        mmExpandAll();
        return;
      case 'download-mindmap-svg':
        downloadMindMapSVG();
        return;
      case 'select-sim-subject':
        selectSimSubject(actionEl.dataset.simSubject, actionEl);
        return;
      case 'select-sim-count':
        selectSimCount(parseInt(actionEl.dataset.simCount, 10), actionEl);
        return;
      case 'select-sim-minutes':
        selectSimMinutes(parseInt(actionEl.dataset.simMinutes, 10), actionEl);
        return;
      case 'start-exam-sim':
        startExamSim();
        return;
      case 'submit-exam-sim':
        submitExamSim();
        return;
      case 'go-to-sim-question':
        goToSimQuestion(parseInt(actionEl.dataset.simQuestionIndex, 10));
        return;
      case 'toggle-sim-flag':
        toggleSimFlag(parseInt(actionEl.dataset.simQuestionIndex, 10));
        return;
      case 'answer-sim-question':
        answerSimQuestion(parseInt(actionEl.dataset.simAnswerIndex, 10));
        return;
      case 'prev-sim-question':
        prevSimQuestion();
        return;
      case 'next-sim-question':
        nextSimQuestion();
        return;
      case 'save-api-key':
        saveApiKey();
        return;
      case 'clear-api-key':
        clearApiKey();
        return;
      case 'export-data':
        exportData();
        return;
      case 'export-progress-pdf':
        exportProgressPDF();
        return;
      case 'export-collab-code':
        exportCollabCode();
        return;
      case 'import-collab-code':
        importCollabCode();
        return;
      case 'reset-pin':
        resetPIN();
        return;
      case 'clear-all-data':
        clearAllData();
        return;
      case 'clear-mentor-history':
        clearMentorHistory();
        return;
      case 'send-mentor-message':
        sendMentorMessage();
        return;
      case 'mentor-quick-prompt':
        sendMentorQuickPrompt(actionEl.dataset.mentorPrompt || '');
        return;
      default:
        return;
    }
  });

  element.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey && event.target.id === 'mentorInput') {
      event.preventDefault();
      sendMentorMessage();
    }
  });
}

function setupStatsMentorGlobalInteractions() {
  if (document.body.__statsMentorGlobalBound) return;
  document.body.__statsMentorGlobalBound = true;

  document.body.addEventListener('click', function(event) {
    const toastClose = event.target.closest('[data-stats-action="close-toast"]');
    if (toastClose) {
      removeToast(toastClose.parentElement);
      return;
    }

    const cmdItem = event.target.closest('[data-cmd-item]');
    if (cmdItem) {
      executeCmdItem(parseInt(cmdItem.dataset.cmdItem, 10));
      return;
    }

    const notifItem = event.target.closest('[data-notif-id]');
    if (notifItem) {
      readNotif(notifItem.dataset.notifId);
    }
  });
}

setTimeout(setupStatsMentorGlobalInteractions, 0);

// Mesajul de bun venit al mentorului
function renderMentorWelcome() {
  const subjects = getSubjects();
  const subjCount = Object.keys(subjects).length;
  const totalXP = state.xp || 0;
  const streak = state.streak || 0;

  let html = '<div class="mentor-msg ai">';
  html += '<div class="msg-sender">AI Mentor</div>';
  html += '<strong>Bună! Sunt AI Mentor-ul tău de studiu.</strong><br><br>';
  html += 'Am acces la întreaga ta activitate: <strong>' + subjCount + ' materii</strong>, ';
  html += '<strong>' + totalXP + ' XP</strong> acumulat, streak de <strong>' + streak + ' zile</strong>.<br><br>';
  html += 'Pot să-ți analizez progresul, să-ți recomand ce să studiezi azi, sau să te ajut cu strategii pentru examene.<br><br>';
  html += '<em>Apasă un prompt rapid din dreapta sau scrie o întrebare concretă: materie, scor, dificultate sau examen apropiat.</em>';
  html += '</div>';
  return html;
}

// Snapshot compact al progresului
function renderMentorSnapshot() {
  const subjects = getSubjects();
  const quizH = state.quizHistory || {};
  const fcDecks = state.flashcardDecks || {};
  let html = '';

  // Examen urmator
  const nextExam = (state.exams || [])
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  if (nextExam) {
    const days = Math.round((new Date(nextExam.date) - new Date()) / (1000*60*60*24));
    const subj = subjects[nextExam.subject];
    html += '<div style="background:var(--red-muted);border:1px solid var(--red);border-radius:var(--radius-xs);padding:8px 10px;margin-bottom:10px;font-size:.78rem;">';
    html += '<strong>' + (subj ? subj.name : nextExam.subject) + '</strong> în ' + days + ' zile';
    html += '</div>';
  }

  // Stats compacte
  const items = [
    { label: 'Nivel', val: '' + (state.level || 1), color: 'var(--accent)' },
    { label: 'Streak', val: '' + (state.streak || 0) + 'z', color: 'var(--amber)' },
    { label: 'Quiz avg', val: (() => { const all = Object.values(quizH).flat(); return all.length ? Math.round(all.reduce((a,r) => a + (r.score/r.total)*100, 0)/all.length) + '%' : '-'; })(), color: 'var(--green)' },
    { label: 'FC due', val: getFlashcardsDueCount(), color: 'var(--blue)' },
  ];

  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
  items.forEach(item => {
    html += '<div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-xs);padding:8px;text-align:center;">';
    html += '<div style="font-size:.78rem;font-weight:700;color:' + item.color + '">' + item.val + '</div>';
    html += '<div style="font-size:.65rem;color:var(--text-muted)">' + item.label + '</div>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

// Insight automat bazat pe date
function generateAutoInsight() {
  const subjects = getSubjects();
  const quizH = state.quizHistory || {};
  const fcDecks = state.flashcardDecks || {};
  const insights = [];

  // Insight streak
  const streak = state.streak || 0;
  if (streak === 0) insights.push('Nu ai studiat ieri. Începe azi pentru a-ți reporni streak-ul!');
  else if (streak >= 7) insights.push('' + streak + ' zile consecutive! Ești pe un drum excelent.');
  else insights.push('Streak de ' + streak + ' zile. Mai ai ' + (7 - streak) + ' zile până la achievement-ul "Săptămâna Studiu"!');

  // Insight flashcards
  const dueFC = getFlashcardsDueCount();
  if (dueFC > 0) insights.push('Ai ' + dueFC + ' flashcard-uri de revizuit azi. Nu le amâna!');

  // Insight quiz
  const allQuizzes = Object.values(quizH).flat();
  if (allQuizzes.length) {
    const avg = Math.round(allQuizzes.reduce((a, r) => a + (r.score / r.total) * 100, 0) / allQuizzes.length);
    if (avg < 60) insights.push('[!] Media quiz-urilor tale e ' + avg + '%. Revizuiește materialul și încearcă din nou.');
    else if (avg >= 80) insights.push('Media quiz-urilor: ' + avg + '%. Performanță excelentă!');
  }

  // Insight examen apropiat
  const nextExam = (state.exams || [])
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  if (nextExam) {
    const days = Math.round((new Date(nextExam.date) - new Date()) / (1000*60*60*24));
    const subj = subjects[nextExam.subject];
    if (days <= 3) insights.push('[!] ' + (subj ? subj.name : 'Examen') + ' este în ' + days + ' zile! Concentrează-te pe recapitulare!');
    else if (days <= 7) insights.push('' + (subj ? subj.name : 'Examen') + ' în ' + days + ' zile. Intensifică studiul!');
  }

  return insights.length ? insights[0] : '[OK] Totul e în ordine. Continuă să studiezi constant!';
}

// Construieste contextul complet pentru AI Mentor
function buildMentorContext() {
  const subjects = getSubjects();
  const quizH = state.quizHistory || {};
  const fcDecks = state.flashcardDecks || {};
  const log = state.activityLog || [];
  const today = new Date().toISOString().split('T')[0];

  let ctx = '=== PROFILUL STUDENTULUI ===\n';
  ctx += 'Nivel: ' + (state.level || 1) + ' | XP Total: ' + (state.xp || 0) + ' | Streak: ' + (state.streak || 0) + ' zile\n\n';

  ctx += '=== MATERII ===\n';
  Object.entries(subjects).forEach(([key, subj]) => {
    const todos = state.todos[key] || [];
    const done = todos.filter(t => t.done).length;
    const pres = getAllPresentations(key).length;
    const qResults = quizH[key] || [];
    const avgQ = qResults.length ? Math.round(qResults.reduce((a,r) => a + (r.score/r.total)*100,0)/qResults.length) : null;
    const fcCount = (fcDecks[key] || []).length;
    const studyMin = (state.studyTime || {})[key] || 0;
    ctx += '- ' + subj.name + ': ' + pres + ' prezentări, ' + todos.length + ' tasks (' + done + ' done)';
    if (avgQ !== null) ctx += ', quiz avg ' + avgQ + '%';
    if (fcCount) ctx += ', ' + fcCount + ' flashcards';
    if (studyMin) ctx += ', ~' + Math.round(studyMin/60*10)/10 + 'h studiu';
    ctx += '\n';
  });

  ctx += '\n=== EXAMENE VIITOARE ===\n';
  const upcoming = (state.exams || []).filter(e => new Date(e.date) >= new Date()).sort((a,b) => new Date(a.date)-new Date(b.date));
  if (upcoming.length) {
    upcoming.forEach(e => {
      const days = Math.round((new Date(e.date) - new Date()) / (1000*60*60*24));
      const subj = subjects[e.subject];
      ctx += '- ' + e.name + ' (' + (subj ? subj.name : e.subject) + '): ' + days + ' zile\n';
    });
  } else ctx += '- Niciun examen adăugat\n';

  ctx += '\n=== ACTIVITATE RECENTA (7 zile) ===\n';
  const recentLog = log.filter(e => {
    const d = new Date(today); d.setDate(d.getDate() - 7);
    return e.date >= d.toISOString().split('T')[0];
  });
  const recentXP = recentLog.reduce((a, e) => a + (e.xp||0), 0);
  ctx += 'XP săptămâna: ' + recentXP + ' | Activități: ' + recentLog.length + '\n';

  ctx += '\n=== FLASHCARDS ===\n';
  const dueFC = getFlashcardsDueCount();
  const totalFC = Object.values(fcDecks).flat().length;
  ctx += 'Total: ' + totalFC + ' | Scadente azi: ' + dueFC + '\n';

  ctx += '\n=== QUIZ PERFORMANCE ===\n';
  Object.entries(quizH).forEach(([key, results]) => {
    if (!results.length) return;
    const subj = subjects[key];
    const avg = Math.round(results.reduce((a,r) => a + (r.score/r.total)*100,0)/results.length);
    const best = Math.round(Math.max(...results.map(r => (r.score/r.total)*100)));
    ctx += '- ' + (subj ? subj.name : key) + ': ' + results.length + ' quiz-uri, avg ' + avg + '%, best ' + best + '%\n';
  });

  // Fișa activă — injectată când userul vine din smart summary
  if (window.__activeSummaryContext) {
    const sc = window.__activeSummaryContext;
    ctx += '\n=== FIȘA CURENTĂ DE STUDIU ===\n';
    ctx += 'Studentul tocmai a studiat fișa: "' + sc.title + '"\n';
    if (sc.subject) ctx += 'Materie: ' + sc.subject + '\n';
    if (sc.why) ctx += 'De ce contează: ' + sc.why + '\n';
    if (sc.insight) ctx += 'Ideea centrală: ' + sc.insight + '\n';
    if (sc.prerequisites && sc.prerequisites.length) ctx += 'Prerechiziți identificați: ' + sc.prerequisites.join(', ') + '\n';
    if (sc.sections && sc.sections.length) ctx += 'Secțiuni studiate: ' + sc.sections.join(', ') + '\n';
    if (sc.difficulty) ctx += 'Nivel: ' + sc.difficulty + '\n';
    if (sc.intent) ctx += 'Scopul studentului pentru această fișă: ' + sc.intent + '\n';
    if (sc.domain_category) ctx += 'Domeniu: ' + sc.domain_category + '\n';
    ctx += '\nMENTOR: Răspunde în contextul acestei fișe. Ajută studentul să aprofundeze conceptele identificate mai sus. Dacă pune o întrebare fără context, presupune că se referă la fișa curentă.\n';
  }

  return ctx;
}

// Trimite mesaj catre AI Mentor
async function sendMentorMessage() {
  if (false) return;

  const input = document.getElementById('mentorInput');
  const sendBtn = document.getElementById('mentorSendBtn');
  const messagesEl = document.getElementById('mentorMessages');
  const text = (input ? input.value : '').trim();
  if (!text) return;

  // Adauga mesajul userului
  if (!state.mentorHistory) state.mentorHistory = [];
  state.mentorHistory.push({ role: 'user', content: text });
  saveState();

  // Update UI — folosim appendChild în loc de innerHTML+= pentru siguranță
  if (messagesEl) {
    const userDiv = document.createElement('div');
    userDiv.className = 'mentor-msg user';
    userDiv.textContent = text;
    messagesEl.appendChild(userDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  if (input) input.value = '';
  if (sendBtn) sendBtn.disabled = true;

  // Typing indicator
  const typingId = 'mentor-typing-' + Date.now();
  let typingDiv = null;
  if (messagesEl) {
    typingDiv = document.createElement('div');
    typingDiv.className = 'mentor-msg ai';
    typingDiv.id = typingId;
    typingDiv.innerHTML = '<div class="msg-sender">AI Mentor</div><div class="typing-dots"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(typingDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  try {
    const context = buildMentorContext();
    const systemPrompt = `Ești AI Mentor-ul personal al unui student. Ai acces la profilul complet al studentului și îi oferi sfaturi personalizate, motivante și concrete.

PROFILUL STUDENTULUI:
${context}

INSTRUCȚIUNI:
- Răspunde în română, cald și motivant
- Fii specific — referă-te la datele reale ale studentului
- Dă recomandări concrete și acționabile
- Structurează răspunsurile cu emoji-uri pentru lizibilitate
- Max 300 cuvinte per răspuns
- Dacă studentul e pe cale bună, felicită-l specific
- Dacă are probleme, oferă soluții clare
- Folosește bold (**text**) pentru punctele cheie`;

    // Construim istoricul conversatiei pentru API
    const apiMessages = (state.mentorHistory || []).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.role === 'assistant' ? m.content.replace(/<[^>]+>/g, '') : m.content
    }));

    const response = await (async function(){
      var __r = await authFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(window.__shAccessToken ? { 'Authorization': 'Bearer ' + window.__shAccessToken } : {}) },
        credentials: 'include',
        body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: apiMessages
      })
      }); var __d = await __r.json(); return { content: [{ text: __d.content || '' }] }; })();

    const data = response;

    // Remove typing indicator
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    if (typingDiv) typingDiv.remove();

    if (data.content && data.content[0]) {
      const aiText = formatAIText(data.content[0].text);
      state.mentorHistory.push({ role: 'assistant', content: aiText });
      saveState();

      if (messagesEl) {
        const aiDiv = document.createElement('div');
        aiDiv.className = 'mentor-msg ai';
        aiDiv.innerHTML = '<div class="msg-sender">AI Mentor</div>' + aiText;
        messagesEl.appendChild(aiDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      // Mici XP pentru interactiunea cu mentorul
      awardXP(5, 'Sesiune AI Mentor');
    } else if (data.error) {
      if (typingDiv) typingDiv.remove();
      if (messagesEl) {
        const errDiv = document.createElement('div');
        errDiv.className = 'mentor-msg ai';
        errDiv.style.color = 'var(--red)';
        errDiv.textContent = '[!] Eroare API: ' + data.error.message;
        messagesEl.appendChild(errDiv);
      }
    }
  } catch (err) {
    if (typingDiv) typingDiv.remove();
    if (messagesEl) {
      const errDiv = document.createElement('div');
      errDiv.className = 'mentor-msg ai';
      errDiv.style.color = 'var(--red)';
      errDiv.textContent = '[!] Eroare conexiune: ' + err.message;
      messagesEl.appendChild(errDiv);
    }
  }

  if (sendBtn) sendBtn.disabled = false;
}

// Trimite un prompt rapid
function sendMentorQuickPrompt(text) {
  const input = document.getElementById('mentorInput');
  if (input) {
    input.value = text;
    sendMentorMessage();
  } else {
    // Daca nu exista input-ul (nu apiKey), simulam direct
    if (false) return;
    if (!state.mentorHistory) state.mentorHistory = [];
    const input2 = document.createElement('input');
    input2.id = 'mentorInput';
    input2.value = text;
    document.body.appendChild(input2);
    sendMentorMessage();
    input2.remove();
  }
}

function clearMentorHistory() {
  if (!confirm('Ștergi istoricul conversației cu AI Mentor?')) return;
  state.mentorHistory = [];
  saveState();
  renderMentorPage(document.getElementById('pageContent'));
}

// =============================================
// INIT
// =============================================
// =============================================
// SVG ICON LIBRARY — Lucide-style, 18x18 default
// =============================================
const ICONS = {
  // Navigation & UI
  home:        `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  menu:        `<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  lock:        `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  settings:    `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  moon:        `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  sun:         `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  logout:      `<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  search:      `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  close:       `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  plus:        `<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  trash:       `<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  edit:        `<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  download:    `<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  upload:      `<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  package:     `<svg viewBox="0 0 24 24"><path d="M16.5 9.4L7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  arrow_right: `<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  arrow_left:  `<svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  check:       `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  check_circle:`<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  alert:       `<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info:        `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  // Academic & Study
  graduation:  `<svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>`,
  book:        `<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  brain:       `<svg viewBox="0 0 24 24"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.66z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.66z"/></svg>`,
  layers:      `<svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  target:      `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  calendar:    `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  clock:       `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  trophy:      `<svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>`,
  chart:       `<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  trending:    `<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  map:         `<svg viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  robot:       `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 11V7"/><circle cx="12" cy="5" r="2"/><line x1="8" y1="15" x2="8" y2="15" stroke-width="2.5" stroke-linecap="round"/><line x1="12" y1="15" x2="12" y2="15" stroke-width="2.5" stroke-linecap="round"/><line x1="16" y1="15" x2="16" y2="15" stroke-width="2.5" stroke-linecap="round"/><path d="M6 11V9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>`,
  cards:       `<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
  note:        `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  file:        `<svg viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`,
  link:        `<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  folder:      `<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  video:       `<svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  microscope:  `<svg viewBox="0 0 24 24"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h.01"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg>`,
  globe:       `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  // Status & Feedback
  flame:       `<svg viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  star:        `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  zap:         `<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  activity:    `<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  bell:        `<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  shield:      `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  award:       `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  key:         `<svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  building:    `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h1"/><path d="M14 9h1"/><path d="M9 14h1"/><path d="M14 14h1"/><path d="M9 19v-3h6v3"/></svg>`,
  sparkle:     `<svg viewBox="0 0 24 24"><path d="M12 3L9.5 8.5 3 9.27l4.5 4.37-1.06 6.18L12 17l5.56 2.82-1.06-6.18L21 9.27l-6.5-.77z" stroke-width="1.5"/></svg>`,
  layers2:     `<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
  cpu:         `<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
  timer:       `<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3L2 6"/><path d="M22 6l-3-3"/><path d="M6.38 18.7L4 21"/><path d="M17.64 18.67L20 21"/><line x1="12" y1="1" x2="12" y2="3"/></svg>`,
  puzzle:      `<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" stroke-width="2.5"/></svg>`,
};

// Helper: renderize un icon
function icon(name, size, extraClass) {
  const svg = ICONS[name] || ICONS.info;
  const sizeClass = size ? 'icon-' + size : '';
  return `<span class="icon ${sizeClass} ${extraClass||''}">${svg}</span>`;
}

// Helper: icon badge cu culoare
function iconBadge(name, color, size) {
  const sizeClass = size === 'lg' ? ' lg' : '';
  return `<span class="icon-badge ${color||''}${sizeClass}">${icon(name, size === 'lg' ? 'md' : 'sm')}</span>`;
}

// Helper: redă iconița unui subject — SVG dacă e Lucide name, altfel emoji/text
function subjectIcon(subj, size, color) {
  const iconName = subj && subj.icon;
  if (!iconName) return '';
  const theme = getSubjectTheme(subj);
  const c = color || theme.accent;
  // Este un Lucide icon name?
  if (ICONS[iconName]) {
    return `<span class="icon icon-${size||'sm'}" style="color:${c}">${ICONS[iconName]}</span>`;
  }
  // Fallback: emoji sau text
  return `<span style="font-size:1rem;line-height:1;">${iconName}</span>`;
}

// Helper: subject icon badge (pătrat colorat cu icon înăuntru)
function subjectIconBadge(subj, sizePx) {
  const sz = sizePx || 40;
  const theme = getSubjectTheme(subj);
  const iconName = subj && subj.icon;
  const innerSize = sz >= 44 ? 'md' : 'sm';
  const inner = ICONS[iconName]
    ? `<span class="icon icon-${innerSize}" style="color:${theme.accent}">${ICONS[iconName]}</span>`
    : `<span style="font-size:${sz*0.45}px">${iconName||'?'}</span>`;
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:${sz}px;height:${sz}px;border-radius:${Math.round(sz*0.28)}px;background:${theme.muted};flex-shrink:0;">${inner}</span>`;
}

// =============================================
// TOAST NOTIFICATION SYSTEM
// =============================================
function showToast(title, message, type, duration) {
  type = type || 'info';
  duration = duration || 4000;

  const container = document.getElementById('toastContainer');
  if (!container) return;

  const iconMap = {
    success: icon('check_circle', 'sm'),
    warning: icon('alert', 'sm'),
    error:   icon('alert', 'sm'),
    info:    icon('info', 'sm')
  };

  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = `
    <span class="toast-icon ${type}">${iconMap[type]}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-msg">${message}</div>` : ''}
    </div>
    <button class="toast-close" data-stats-action="close-toast">${icon('close', 'xs')}</button>
  `;
  container.appendChild(toast);

  const timer = setTimeout(() => removeToast(toast), duration);
  toast._timer = timer;
}

function removeToast(toast) {
  if (!toast) return;
  clearTimeout(toast._timer);
  toast.classList.add('removing');
  setTimeout(() => toast.remove(), 280);
}

// =============================================
// COMMAND PALETTE (⌘K / Ctrl+K)
// =============================================
const CMD_ITEMS = [
  { section: 'Navigare', label: 'Dashboard',           sub: 'Acasă',                  icon: 'home',       action: () => navigateTo('dashboard') },
  { section: 'Navigare', label: 'Calendar Sesiune',    sub: 'Examene & countdown',     icon: 'calendar',   action: () => navigateTo('calendar') },
  { section: 'Navigare', label: 'Realizări & XP',      sub: 'Achievements',            icon: 'trophy',     action: () => navigateTo('achievements') },
  { section: 'Navigare', label: 'Statistici',          sub: 'Progres & timp studiu',   icon: 'chart',      action: () => navigateTo('stats') },
  { section: 'Tools AI', label: 'Quiz Mode',           sub: 'Generează quiz din curs', icon: 'brain',      action: () => navigateTo('quiz') },
  { section: 'Tools AI', label: 'Flashcards',          sub: 'Spaced repetition',       icon: 'cards',      action: () => navigateTo('flashcards') },
  { section: 'Tools AI', label: 'Mind Map AI',         sub: 'Hărți conceptuale',       icon: 'map',        action: () => navigateTo('mindmap') },
  { section: 'Tools AI', label: 'Exam Simulator',      sub: 'Sesiune cronometrată',    icon: 'graduation', action: () => navigateTo('examsim') },
  { section: 'Tools AI', label: 'AI Mentor',           sub: 'Coaching personalizat',   icon: 'robot',      action: () => navigateTo('mentor') },
  { section: 'Setări',   label: 'Import / Export',     sub: 'Date & backup',           icon: 'package',    action: () => navigateTo('settings') },
  { section: 'Setări',   label: 'Schimbă tema',        sub: 'Light / Dark',            icon: 'moon',       action: () => toggleTheme() },
  { section: 'Setări',   label: 'Gestionează materii', sub: 'Adaugă / editează',       icon: 'settings',   action: () => openSubjectManager() },
  { section: 'Setări',   label: 'Delogare',            sub: 'Blochează aplicația',     icon: 'logout',     action: () => handleLogout() },
];

let cmdSelectedIndex = 0;

function openCommandPalette() {
  const overlay = document.getElementById('cmdPaletteOverlay');
  if (!overlay) return;
  overlay.classList.add('open');
  const input = document.getElementById('cmdInput');
  if (input) { input.value = ''; input.focus(); }
  renderCmdResults('');
}

function closeCommandPalette() {
  const overlay = document.getElementById('cmdPaletteOverlay');
  if (overlay) overlay.classList.remove('open');
}

function renderCmdResults(query) {
  const container = document.getElementById('cmdResults');
  if (!container) return;

  const q = query.toLowerCase().trim();
  const filtered = q
    ? CMD_ITEMS.filter(i => i.label.toLowerCase().includes(q) || (i.sub||'').toLowerCase().includes(q))
    : CMD_ITEMS;

  if (!filtered.length) {
    container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:.875rem;">Niciun rezultat</div>';
    return;
  }

  let html = '';
  let lastSection = '';
  filtered.forEach((item, idx) => {
    if (item.section !== lastSection) {
      html += `<div class="cmd-section-label">${item.section}</div>`;
      lastSection = item.section;
    }
    html += `<div class="cmd-item ${idx === 0 ? 'selected' : ''}" data-cmd-item="${CMD_ITEMS.indexOf(item)}" data-idx="${idx}">
      ${icon(item.icon, 'sm')}
      <div class="cmd-item-label">${item.label}</div>
      ${item.sub ? `<div class="cmd-item-sub">${item.sub}</div>` : ''}
    </div>`;
  });

  container.innerHTML = html;
  cmdSelectedIndex = 0;
}

function executeCmdItem(globalIdx) {
  const item = CMD_ITEMS[globalIdx];
  if (item) {
    closeCommandPalette();
    setTimeout(() => item.action(), 100);
  }
}

// Keyboard navigation in command palette
document.addEventListener('keydown', function(e) {
  // ⌘K or Ctrl+K
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const overlay = document.getElementById('cmdPaletteOverlay');
    if (overlay && overlay.classList.contains('open')) closeCommandPalette();
    else openCommandPalette();
    return;
  }

  const overlay = document.getElementById('cmdPaletteOverlay');
  if (!overlay || !overlay.classList.contains('open')) return;

  const items = document.querySelectorAll('.cmd-item');
  if (e.key === 'Escape') { closeCommandPalette(); return; }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    cmdSelectedIndex = Math.min(cmdSelectedIndex + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    cmdSelectedIndex = Math.max(cmdSelectedIndex - 1, 0);
  } else if (e.key === 'Enter') {
    const sel = items[cmdSelectedIndex];
    if (sel) sel.click();
    return;
  } else return;

  items.forEach((el, i) => el.classList.toggle('selected', i === cmdSelectedIndex));
  items[cmdSelectedIndex]?.scrollIntoView({ block: 'nearest' });
});

// =============================================
// NOTIFICATION SYSTEM
// =============================================
let notifications = [];

function addNotification(title, msg, type, action) {
  const n = {
    id: Date.now() + Math.random(),
    title, msg, type: type||'info', action,
    time: new Date(),
    read: false
  };
  notifications.unshift(n);
  if (notifications.length > 20) notifications = notifications.slice(0, 20);
  updateNotifBadge();
  return n;
}

function updateNotifBadge() {
  const unread = notifications.filter(n => !n.read).length;
  const dot = document.getElementById('topbarNotifDot');
  if (dot) dot.classList.toggle('has-notif', unread > 0);
}

function openNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;
  const isOpen = panel.classList.contains('open');
  panel.classList.toggle('open', !isOpen);
  if (!isOpen) renderNotifList();
  document.addEventListener('click', closeNotifOutside, { once: true, capture: true });
}

function closeNotifOutside(e) {
  const panel = document.getElementById('notifPanel');
  if (panel && !panel.contains(e.target) && e.target.id !== 'topbarNotifBtn') {
    panel.classList.remove('open');
  }
}

function renderNotifList() {
  const list = document.getElementById('notifList');
  if (!list) return;

  if (!notifications.length) {
    list.innerHTML = '<div class="notif-empty">' + icon('bell','sm') + '<br>Nicio notificare</div>';
    return;
  }

  const iconMap = { info: icon('info','sm'), success: icon('check_circle','sm'), warning: icon('alert','sm'), exam: icon('calendar','sm'), flashcard: icon('cards','sm') };
  const colorMap = { info: 'var(--blue)', success: 'var(--green)', warning: 'var(--amber)', exam: 'var(--red)', flashcard: 'var(--purple)' };

  list.innerHTML = notifications.map(n => {
    const ago = formatTimeAgo(n.time);
    return `<div class="notif-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}">
      <span class="notif-icon" style="color:${colorMap[n.type]||colorMap.info}">${iconMap[n.type]||iconMap.info}</span>
      <div class="notif-body">
        <div class="notif-title">${escapeHtml(n.title)}</div>
        <div class="notif-msg">${escapeHtml(n.msg||'')}</div>
        <div class="notif-time">${ago}</div>
      </div>
    </div>`;
  }).join('');

  setTimeout(() => {
    notifications.forEach(n => n.read = true);
    updateNotifBadge();
  }, 1500);
}

function readNotif(id) {
  const n = notifications.find(n => String(n.id) === String(id));
  if (n) { n.read = true; if (n.action) n.action(); }
  updateNotifBadge();
}

function clearAllNotifs() {
  notifications = [];
  updateNotifBadge();
  renderNotifList();
}

function formatTimeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return 'Acum';
  if (diff < 3600) return Math.floor(diff / 60) + ' min';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return Math.floor(diff / 86400) + 'z';
}

function checkAndNotify() {
  const dueFC = getFlashcardsDueCount();
  if (dueFC > 0 && !window._notifiedFC) {
    window._notifiedFC = true;
    addNotification(
      'Flashcards de revizuit',
      'Ai ' + dueFC + ' flashcards scadente azi.',
      'flashcard',
      () => navigateTo('flashcards')
    );
  }

  const nextExam = (state.exams || [])
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  if (nextExam) {
    const days = Math.round((new Date(nextExam.date) - new Date()) / 86400000);
    if (days <= 3 && !window._notifiedExam) {
      window._notifiedExam = true;
      const subj = getSubjects()[nextExam.subject];
      addNotification(
        'Examen apropiat',
        (subj ? subj.name : nextExam.name) + ' este în ' + days + ' zile.',
        'exam',
        () => navigateTo('calendar')
      );
    }
  }
}

// =============================================
// PROFILE PAGE — Contul meu
// =============================================
function renderProfilePage(element) {
  if (!element) return;
  const p = state.userProfile || {};
  const ai = state.aiPersonality || {};
  const user = window.__shUser || {};
  const achievements = state.achievements || [];
  const xp = state.xp || 0;
  const level = state.level || 1;
  const streak = state.streak || 0;

  const toneOptions = [
    { val: 'friendly', label: '😊 Prietenos', desc: 'Explicații calde, cu analogii și încurajări' },
    { val: 'formal',   label: '🎓 Formal',    desc: 'Ton academic, precis, fără digresiuni' },
    { val: 'concise',  label: '⚡ Concis',    desc: 'Răspunsuri scurte, direct la subiect' }
  ];
  const detailOptions = [
    { val: 'brief',    label: 'Scurt',    desc: 'Ideia principală, fără detalii extra' },
    { val: 'medium',   label: 'Mediu',    desc: 'Echilibrat — concept + 1-2 exemple' },
    { val: 'detailed', label: 'Detaliat', desc: 'Explicație completă, toate straturile' }
  ];

  let html = '<div class="anim">';

  // ── HEADER ──
  html += '<div class="dash-hero" style="padding:28px 20px 20px">';
  html += '<div style="display:flex;align-items:center;gap:14px;">';
  html += '<div style="width:52px;height:52px;border-radius:50%;background:var(--accent-muted);border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:1.4rem;">👤</div>';
  html += '<div>';
  html += '<div style="font-family:var(--font-display);font-size:1.3rem;font-weight:800;">' + escapeHtml(p.displayName || user.email || 'Utilizator') + '</div>';
  html += '<div style="font-size:.8rem;color:var(--text-muted);">' + escapeHtml(user.email || '') + '</div>';
  html += '</div></div></div>';

  // ── PROFIL ──
  html += '<div class="quiz-gen-section">';
  html += '<h3 style="margin-bottom:16px;">' + icon('user','sm') + ' Profilul tău</h3>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">';
  html += '<div><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">Nume afișat</label><input class="todo-inp" id="profileName" placeholder="ex: Andrei" value="' + escapeHtml(p.displayName||'') + '" style="width:100%;"></div>';
  html += '<div><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">Facultate</label><input class="todo-inp" id="profileFaculty" placeholder="ex: ASE București" value="' + escapeHtml(p.faculty||'') + '" style="width:100%;"></div>';
  html += '<div><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">An de studiu</label><input class="todo-inp" id="profileYear" placeholder="ex: Anul 2" value="' + escapeHtml(p.year||'') + '" style="width:100%;"></div>';
  html += '</div>';
  html += '<button class="summary-gen-btn" data-profile-action="save-profile" style="margin-top:4px;">' + icon('check','xs') + ' Salvează profilul</button>';
  html += '<span id="profileSaved" style="display:none;margin-left:10px;font-size:.8rem;color:var(--green);">✓ Salvat</span>';
  html += '</div>';

  // ── AI PERSONALITY ──
  html += '<div class="quiz-gen-section">';
  html += '<h3 style="margin-bottom:6px;">' + icon('robot','sm') + ' Cum să explice AI-ul</h3>';
  html += '<p style="font-size:.82rem;color:var(--text-muted);margin-bottom:20px;">Configurează stilul AI Tutorului și al rezumatelor generate pentru toate materiile.</p>';

  // Ton
  html += '<div style="margin-bottom:18px;">';
  html += '<div style="font-size:.78rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Ton</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">';
  toneOptions.forEach(function(opt) {
    const active = (ai.tone || 'friendly') === opt.val;
    html += '<button class="ai-persona-card ' + (active ? 'active' : '') + '" data-profile-action="set-tone" data-val="' + opt.val + '">';
    html += '<div style="font-weight:600;font-size:.88rem;margin-bottom:3px;">' + opt.label + '</div>';
    html += '<div style="font-size:.72rem;color:var(--text-muted);line-height:1.4;">' + opt.desc + '</div>';
    html += '</button>';
  });
  html += '</div></div>';

  // Nivel detaliu
  html += '<div style="margin-bottom:18px;">';
  html += '<div style="font-size:.78rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Nivel de detaliu</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">';
  detailOptions.forEach(function(opt) {
    const active = (ai.detail || 'medium') === opt.val;
    html += '<button class="ai-persona-card ' + (active ? 'active' : '') + '" data-profile-action="set-detail" data-val="' + opt.val + '">';
    html += '<div style="font-weight:600;font-size:.88rem;margin-bottom:3px;">' + opt.label + '</div>';
    html += '<div style="font-size:.72rem;color:var(--text-muted);line-height:1.4;">' + opt.desc + '</div>';
    html += '</button>';
  });
  html += '</div></div>';

  // Exemple
  html += '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--bg-surface);border-radius:var(--radius-sm);border:1px solid var(--border);">';
  html += '<input type="checkbox" id="aiExamples" ' + (ai.examples !== false ? 'checked' : '') + ' style="accent-color:var(--accent);width:16px;height:16px;">';
  html += '<label for="aiExamples" style="font-size:.88rem;cursor:pointer;"><strong>Include exemple practice</strong> <span style="font-size:.78rem;color:var(--text-muted);">— AI-ul adaugă scenarii reale la fiecare concept</span></label>';
  html += '</div>';

  html += '<button class="summary-gen-btn" data-profile-action="save-ai-personality" style="margin-top:16px;">' + icon('sparkle','xs') + ' Salvează configurarea AI</button>';
  html += '<span id="aiPersonalitySaved" style="display:none;margin-left:10px;font-size:.8rem;color:var(--green);">✓ Salvat</span>';
  html += '</div>';

  // ── REALIZĂRI ──
  html += '<div class="quiz-gen-section">';
  html += '<h3 style="margin-bottom:4px;">' + icon('trophy','sm') + ' Realizări & XP</h3>';
  html += '<div style="display:flex;gap:12px;margin:14px 0;flex-wrap:wrap;">';
  html += '<div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 20px;text-align:center;min-width:80px;"><div style="font-family:var(--font-display);font-size:1.6rem;font-weight:800;color:var(--accent);">' + xp + '</div><div style="font-size:.72rem;color:var(--text-muted);">XP Total</div></div>';
  html += '<div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 20px;text-align:center;min-width:80px;"><div style="font-family:var(--font-display);font-size:1.6rem;font-weight:800;color:var(--accent);">' + level + '</div><div style="font-size:.72rem;color:var(--text-muted);">Nivel</div></div>';
  html += '<div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 20px;text-align:center;min-width:80px;"><div style="font-family:var(--font-display);font-size:1.6rem;font-weight:800;color:var(--accent);">' + streak + '</div><div style="font-size:.72rem;color:var(--text-muted);">Zile streak</div></div>';
  html += '<div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 20px;text-align:center;min-width:80px;"><div style="font-family:var(--font-display);font-size:1.6rem;font-weight:800;color:var(--amber);">' + achievements.length + '</div><div style="font-size:.72rem;color:var(--text-muted);">Realizări</div></div>';
  html += '</div>';

  if (achievements.length > 0) {
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
    achievements.forEach(function(ach) {
      html += '<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--amber-muted);border:1px solid rgba(233,187,116,.3);border-radius:20px;font-size:.78rem;">';
      html += '<span>' + (ach.icon || '🏆') + '</span><span>' + escapeHtml(ach.name || ach) + '</span>';
      html += '</div>';
    });
    html += '</div>';
  } else {
    html += '<div style="font-size:.82rem;color:var(--text-muted);">Nicio realizare încă — începe să folosești platforma pentru a debloca primele badge-uri.</div>';
  }
  html += '</div>';

  html += '</div>';
  element.innerHTML = html;

  // ── INTERACȚIUNI ──
  element.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-profile-action]');
    if (!btn) return;
    var action = btn.dataset.profileAction;

    if (action === 'set-tone') {
      if (!state.aiPersonality) state.aiPersonality = {};
      state.aiPersonality.tone = btn.dataset.val;
      element.querySelectorAll('[data-profile-action="set-tone"]').forEach(function(b) {
        b.classList.toggle('active', b.dataset.val === btn.dataset.val);
      });
      saveState();
    }

    if (action === 'set-detail') {
      if (!state.aiPersonality) state.aiPersonality = {};
      state.aiPersonality.detail = btn.dataset.val;
      element.querySelectorAll('[data-profile-action="set-detail"]').forEach(function(b) {
        b.classList.toggle('active', b.dataset.val === btn.dataset.val);
      });
      saveState();
    }

    if (action === 'save-profile') {
      if (!state.userProfile) state.userProfile = {};
      state.userProfile.displayName = document.getElementById('profileName').value.trim();
      state.userProfile.faculty     = document.getElementById('profileFaculty').value.trim();
      state.userProfile.year        = document.getElementById('profileYear').value.trim();
      saveState();
      var s = document.getElementById('profileSaved');
      if (s) { s.style.display = 'inline'; setTimeout(function() { s.style.display = 'none'; }, 2000); }
    }

    if (action === 'save-ai-personality') {
      if (!state.aiPersonality) state.aiPersonality = {};
      state.aiPersonality.examples = document.getElementById('aiExamples').checked;
      saveState();
      var s2 = document.getElementById('aiPersonalitySaved');
      if (s2) { s2.style.display = 'inline'; setTimeout(function() { s2.style.display = 'none'; }, 2000); }
      showToast('Configurare AI salvată!');
    }
  });
}
