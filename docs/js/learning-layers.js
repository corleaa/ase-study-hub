// ═════════════════════════════════════════════════════════════════
// learning-layers.js — 5-Layer Interactive Learning System
//
// Cum funcționează:
//   - NU modifică logica existentă de slideshow
//   - Adaugă un buton "🧠 Mod Interactiv" în header-ul viewer-ului
//   - Când e activ, înlocuiește stage-ul cu cele 5 layere interactive
//   - La dezactivare, revine la slideshow-ul normal
//   - Toate apelurile AI folosesc authFetch() existent
// ═════════════════════════════════════════════════════════════════

(function() {
'use strict';

// ─────────────────────────────────────────────────────────────────
// UTIL: escape HTML (reuse din index.html dacă există)
// ─────────────────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ─────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────
var _llActive    = false;   // modul interactiv activ?
var _llData      = null;    // richData curent
var _llKey       = null;    // subject key curent
var _llBtn       = null;    // referință buton toggle

// ─────────────────────────────────────────────────────────────────
// INJECT: buton în header-ul viewer-ului
// ─────────────────────────────────────────────────────────────────
function injectToggleButton() {
  var controls = document.querySelector('.pres-viewer-controls');
  if (!controls || document.getElementById('llToggleBtn')) return;

  var btn = document.createElement('button');
  btn.id = 'llToggleBtn';
  btn.className = 'pres-viewer-btn';
  btn.title = 'Mod Interactiv (5 layere de învățare)';
  btn.style.cssText = 'gap:5px;font-size:.75rem;font-weight:700;padding:6px 12px;border-radius:6px;';
  btn.innerHTML = '🧠 Interactiv';
  btn.onclick = toggleInteractiveMode;

  // Inserăm înaintea butonului de close
  var closeBtn = controls.querySelector('.close-btn');
  if (closeBtn) {
    controls.insertBefore(btn, closeBtn);
  } else {
    controls.appendChild(btn);
  }

  _llBtn = btn;
}

// ─────────────────────────────────────────────────────────────────
// TOGGLE
// ─────────────────────────────────────────────────────────────────
function toggleInteractiveMode() {
  if (!_llData) return;

  _llActive = !_llActive;

  if (_llBtn) {
    _llBtn.style.background  = _llActive ? 'var(--accent)'      : '';
    _llBtn.style.color       = _llActive ? '#fff'               : '';
    _llBtn.style.borderColor = _llActive ? 'var(--accent)'      : '';
    _llBtn.innerHTML         = _llActive ? '✕ Slideshow normal' : '🧠 Interactiv';
  }

  var stage = document.getElementById('pvStage');
  var dots  = document.getElementById('pvDots');
  var prev  = document.getElementById('pvPrev');
  var next  = document.getElementById('pvNext');
  var ctr   = document.getElementById('pvCounter');

  if (_llActive) {
    // Ascunde controalele slideshow
    if (prev) prev.style.display = 'none';
    if (next) next.style.display = 'none';
    if (ctr)  ctr.style.display  = 'none';
    if (dots) dots.style.display = 'none';

    if (stage) {
      stage.style.overflow   = 'auto';
      stage.style.alignItems = 'flex-start';
      stage.innerHTML = renderAllLayers(_llData, _llKey);
      attachLayerHandlers(stage);
    }
  } else {
    // Revine la slideshow normal
    if (prev) prev.style.display = '';
    if (next) next.style.display = '';
    if (ctr)  ctr.style.display  = '';
    if (dots) dots.style.display = '';

    if (stage) {
      stage.style.overflow   = '';
      stage.style.alignItems = '';
    }

    if (typeof pvRenderSlides === 'function') pvRenderSlides();
    if (typeof pvUpdateUI    === 'function') pvUpdateUI();
  }
}

// ─────────────────────────────────────────────────────────────────
// RENDER: toate cele 5 layere
// ─────────────────────────────────────────────────────────────────
function renderAllLayers(s, key) {
  return [
    '<div style="width:100%;max-width:860px;margin:0 auto;padding:20px 24px 48px;display:flex;flex-direction:column;gap:28px;">',

    renderLayer1Overview(s),
    renderLayer2Expandable(s),
    renderLayer3Visual(s),
    renderLayer4Buttons(s, key),
    renderLayer5Retention(s),

    '</div>'
  ].join('');
}

// ─────────────────────────────────────────────────────────────────
// LAYER 1 — OVERVIEW: 5–7 idei cheie
// ─────────────────────────────────────────────────────────────────
function renderLayer1Overview(s) {
  var ideas = buildIdeas(s);

  var cards = ideas.map(function(idea, i) {
    return [
      '<div class="ll-idea-card" data-idx="' + i + '" ',
      'style="background:var(--bg-raised);border:1px solid var(--border);border-radius:10px;',
      'padding:14px 16px;cursor:pointer;transition:border-color .18s,background .18s;"',
      'onmouseover="this.style.borderColor=\'var(--accent-border)\';this.style.background=\'var(--bg-surface)\'"',
      'onmouseout="this.style.borderColor=\'var(--border)\';this.style.background=\'var(--bg-raised)\'"',
      'onclick="llExpandIdea(this,' + i + ')"',
      '>',
      '<div style="display:flex;align-items:flex-start;gap:12px;">',
      '<div style="min-width:26px;height:26px;border-radius:50%;background:var(--accent-muted);color:var(--accent);',
      'font-family:var(--font-mono);font-size:.72rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">',
      (i + 1),
      '</div>',
      '<div>',
      '<div style="font-weight:700;font-size:.88rem;color:var(--text-primary);margin-bottom:3px;">' + esc(idea.title) + '</div>',
      '<div style="font-size:.8rem;color:var(--text-secondary);line-height:1.5;">' + esc(idea.summary) + '</div>',
      '</div>',
      '<div style="margin-left:auto;color:var(--text-muted);font-size:.8rem;flex-shrink:0;" class="ll-chevron-' + i + '">▼</div>',
      '</div>',
      // Expanded content placeholder
      '<div class="ll-idea-expand" id="ll-expand-' + i + '" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);"></div>',
      '</div>'
    ].join('');
  });

  return [
    '<div>',
    '<div style="font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:12px;">',
    '🧠 LAYER 1 — OVERVIEW',
    '</div>',
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">',
    cards.join(''),
    '</div>',
    '</div>'
  ].join('');
}

// ─────────────────────────────────────────────────────────────────
// LAYER 2 — EXPANDABLE: accordion cu detalii per concept
// ─────────────────────────────────────────────────────────────────
function renderLayer2Expandable(s) {
  var sections = [];

  if (s.layers && s.layers.length) {
    sections.push({ title: '📐 Explicație pe niveluri', content: renderLayersDetail(s.layers) });
  }
  if (s.key_concepts && s.key_concepts.length) {
    sections.push({ title: '🔑 Concepte cheie', content: renderConceptsDetail(s.key_concepts) });
  }
  if (s.formulas && s.formulas.length) {
    sections.push({ title: '∑ Formule', content: renderFormulasDetail(s.formulas) });
  }
  if (s.comparisons && s.comparisons.length) {
    sections.push({ title: '⚖ Comparații', content: renderComparisonsDetail(s.comparisons) });
  }

  if (!sections.length) return '';

  var accordions = sections.map(function(sec, i) {
    return [
      '<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;">',
      '<button onclick="llToggleAccordion(\'llacc' + i + '\')" ',
      'style="width:100%;text-align:left;background:var(--bg-raised);border:none;',
      'padding:14px 16px;font-size:.88rem;font-weight:700;color:var(--text-primary);',
      'cursor:pointer;display:flex;justify-content:space-between;align-items:center;">',
      esc(sec.title),
      '<span id="llacc' + i + '-chevron" style="color:var(--text-muted);transition:transform .2s;">▼</span>',
      '</button>',
      '<div id="llacc' + i + '" style="display:none;padding:16px;background:var(--bg-surface);">',
      sec.content,
      '</div>',
      '</div>'
    ].join('');
  });

  return [
    '<div>',
    '<div style="font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--green);margin-bottom:12px;">',
    '📚 LAYER 2 — SECȚIUNI EXPANDABILE',
    '</div>',
    '<div style="display:flex;flex-direction:column;gap:8px;">',
    accordions.join(''),
    '</div>',
    '</div>'
  ].join('');
}

// ─────────────────────────────────────────────────────────────────
// LAYER 3 — VISUAL STRUCTURE
// ─────────────────────────────────────────────────────────────────
function renderLayer3Visual(s) {
  var parts = [];

  // Pathway vizual
  if (s.pathway && s.pathway.length) {
    var nodes = s.pathway.map(function(node, i) {
      var isActive = node === s.title || i === Math.floor(s.pathway.length / 2);
      return [
        i > 0 ? '<span style="color:var(--text-muted);padding:0 4px;">→</span>' : '',
        '<span style="background:' + (isActive ? 'var(--accent)' : 'var(--bg-raised)') + ';',
        'color:' + (isActive ? '#fff' : 'var(--text-primary)') + ';',
        'border:1px solid ' + (isActive ? 'var(--accent)' : 'var(--border)') + ';',
        'border-radius:20px;padding:5px 14px;font-size:.8rem;white-space:nowrap;">',
        esc(node),
        '</span>'
      ].join('');
    }).join('');

    parts.push([
      '<div>',
      '<div style="font-size:.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px;">Traseu conceptual</div>',
      '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:14px;background:var(--bg-raised);border:1px solid var(--border);border-radius:10px;">',
      nodes,
      '</div>',
      '</div>'
    ].join(''));
  }

  // Warnings ca highlight blocks
  if (s.warnings && s.warnings.length) {
    var warnItems = s.warnings.map(function(w) {
      return [
        '<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 14px;',
        'background:var(--red-muted);border:1px solid rgba(239,69,101,.25);border-radius:8px;">',
        '<span style="color:var(--red);font-size:1rem;flex-shrink:0;">⚠</span>',
        '<span style="color:var(--text-secondary);font-size:.83rem;line-height:1.5;">' + esc(w) + '</span>',
        '</div>'
      ].join('');
    }).join('');

    parts.push([
      '<div>',
      '<div style="font-size:.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px;">Greșeli frecvente</div>',
      '<div style="display:flex;flex-direction:column;gap:8px;">' + warnItems + '</div>',
      '</div>'
    ].join(''));
  }

  // Examples as highlighted cards
  if (s.examples && s.examples.length) {
    var exItems = s.examples.map(function(ex) {
      return [
        '<div style="background:rgba(79,110,247,.07);border:1px solid rgba(79,110,247,.2);border-radius:8px;padding:14px;">',
        '<div style="font-size:.67rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Exemplu</div>',
        '<div style="color:var(--text-secondary);font-size:.85rem;line-height:1.55;">' + esc(ex.scenario) + '</div>',
        ex.insight ? '<div style="margin-top:8px;color:var(--green);font-size:.79rem;">→ ' + esc(ex.insight) + '</div>' : '',
        '</div>'
      ].join('');
    }).join('');

    parts.push([
      '<div>',
      '<div style="font-size:.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px;">Exemple practice</div>',
      '<div style="display:flex;flex-direction:column;gap:10px;">' + exItems + '</div>',
      '</div>'
    ].join(''));
  }

  if (!parts.length) return '';

  return [
    '<div>',
    '<div style="font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--amber);margin-bottom:12px;">',
    '📊 LAYER 3 — STRUCTURĂ VIZUALĂ',
    '</div>',
    '<div style="display:flex;flex-direction:column;gap:16px;">',
    parts.join(''),
    '</div>',
    '</div>'
  ].join('');
}

// ─────────────────────────────────────────────────────────────────
// LAYER 4 — INTERACTION BUTTONS
// ─────────────────────────────────────────────────────────────────
function renderLayer4Buttons(s, key) {
  var ideas = buildIdeas(s);

  var sections = ideas.map(function(idea, i) {
    return [
      '<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px;">',
      '<div style="font-weight:700;font-size:.88rem;color:var(--text-primary);">' + esc(idea.title) + '</div>',
      '<div style="font-size:.8rem;color:var(--text-secondary);line-height:1.5;">' + esc(idea.summary) + '</div>',

      // Action buttons
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">',
      llActionBtn('Explică mai simplu', 'explica_simplu', i, idea),
      llActionBtn('Dă un exemplu', 'da_exemplu', i, idea),
      llActionBtn('Compară cu ceva similar', 'compara', i, idea),
      llActionBtn('Generează o întrebare', 'intrebare', i, idea),
      llActionBtn('Fă flashcard', 'flashcard', i, idea),
      '</div>',

      // Result area
      '<div id="ll-result-' + i + '" style="display:none;margin-top:8px;padding:12px 14px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;font-size:.83rem;color:var(--text-secondary);line-height:1.6;"></div>',
      '</div>'
    ].join('');
  });

  return [
    '<div>',
    '<div style="font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--purple);margin-bottom:12px;">',
    '⚡ LAYER 4 — BUTOANE INTERACTIVE',
    '</div>',
    '<div style="display:flex;flex-direction:column;gap:10px;">',
    sections.join(''),
    '</div>',
    '</div>'
  ].join('');
}

function llActionBtn(label, action, idx, idea) {
  var contextJson = JSON.stringify({ title: idea.title, summary: idea.summary }).replace(/"/g, '&quot;');
  return [
    '<button onclick="llHandleAction(this,\'' + action + '\',' + idx + ',' + "'" + contextJson + "')" ,
    'style="padding:5px 12px;border-radius:20px;border:1px solid var(--border);background:var(--bg-surface);',
    'color:var(--text-secondary);font-size:.75rem;cursor:pointer;transition:all .15s;"',
    'onmouseover="this.style.borderColor=\'var(--accent-border)\';this.style.color=\'var(--accent)\'"',
    'onmouseout="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--text-secondary)\'"',
    '>',
    esc(label),
    '</button>'
  ].join('');
}

// ─────────────────────────────────────────────────────────────────
// LAYER 5 — RETENTION: quiz + key takeaways
// ─────────────────────────────────────────────────────────────────
function renderLayer5Retention(s) {
  var ideas = buildIdeas(s);

  // Key takeaways
  var takeaways = ideas.slice(0, 5).map(function(idea, i) {
    return [
      '<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 14px;',
      'background:var(--bg-raised);border:1px solid var(--border);border-radius:8px;">',
      '<span style="color:var(--accent);font-family:var(--font-mono);font-size:.72rem;font-weight:700;min-width:22px;">' + (i + 1) + '</span>',
      '<div>',
      '<div style="font-weight:600;font-size:.84rem;color:var(--text-primary);margin-bottom:2px;">' + esc(idea.title) + '</div>',
      '<div style="font-size:.78rem;color:var(--text-secondary);line-height:1.45;">' + esc(idea.summary) + '</div>',
      '</div>',
      '</div>'
    ].join('');
  }).join('');

  // Mini quiz — generate button
  var quiz = [
    '<div id="ll-quiz-container">',
    '<button onclick="llGenerateQuiz(this)" ',
    'style="padding:10px 20px;background:var(--accent);color:#fff;border:none;border-radius:8px;',
    'font-size:.85rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;">',
    '🧪 Generează mini-quiz (3 întrebări)',
    '</button>',
    '</div>'
  ].join('');

  return [
    '<div>',
    '<div style="font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--green);margin-bottom:12px;">',
    '🧪 LAYER 5 — RETENȚIE',
    '</div>',

    '<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:10px;padding:18px;margin-bottom:14px;">',
    '<div style="font-weight:700;font-size:.9rem;margin-bottom:12px;">📌 5 idei esențiale de reținut</div>',
    '<div style="display:flex;flex-direction:column;gap:8px;">',
    takeaways,
    '</div>',
    '</div>',

    '<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:10px;padding:18px;">',
    '<div style="font-weight:700;font-size:.9rem;margin-bottom:14px;">🎯 Mini-Quiz</div>',
    quiz,
    '</div>',

    '</div>'
  ].join('');
}

// ─────────────────────────────────────────────────────────────────
// HELPERS: build ideas array din richData
// ─────────────────────────────────────────────────────────────────
function buildIdeas(s) {
  var ideas = [];

  // Din key_concepts
  if (s.key_concepts && s.key_concepts.length) {
    s.key_concepts.slice(0, 4).forEach(function(c) {
      ideas.push({ title: c.name, summary: c.definition, source: 'concept' });
    });
  }

  // Din layers
  if (s.layers && s.layers.length && ideas.length < 6) {
    s.layers.forEach(function(l) {
      if (ideas.length >= 7) return;
      ideas.push({ title: l.level + ': ' + s.title, summary: l.text, source: 'layer' });
    });
  }

  // Fallback: titlu + why_it_matters
  if (ideas.length === 0) {
    ideas.push({ title: s.title || 'Concept principal', summary: s.why_it_matters || s.key_insight || '', source: 'title' });
  }

  return ideas;
}

function renderLayersDetail(layers) {
  return layers.map(function(l) {
    var c = l.color || '#4f6ef7';
    return [
      '<div style="border-left:3px solid ' + c + ';padding:10px 14px;margin-bottom:10px;background:' + c + '0d;border-radius:0 8px 8px 0;">',
      '<div style="font-weight:700;color:' + c + ';font-size:.82rem;margin-bottom:4px;">' + esc(l.level) + '</div>',
      '<div style="color:var(--text-secondary);font-size:.83rem;line-height:1.55;">' + esc(l.text) + '</div>',
      '</div>'
    ].join('');
  }).join('');
}

function renderConceptsDetail(concepts) {
  var colors = ['#4f6ef7','#10d9a0','#a78bfa','#f5a623','#38bdf8','#ef4565'];
  return concepts.map(function(c, i) {
    var col = c.color || colors[i % colors.length];
    return [
      '<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border);">',
      '<div style="width:8px;height:8px;border-radius:50%;background:' + col + ';margin-top:5px;flex-shrink:0;"></div>',
      '<div>',
      '<div style="font-weight:700;font-size:.85rem;color:var(--text-primary);">' + esc(c.name) + '</div>',
      '<div style="font-size:.8rem;color:var(--text-secondary);line-height:1.5;margin-top:2px;">' + esc(c.definition) + '</div>',
      '</div></div>'
    ].join('');
  }).join('');
}

function renderFormulasDetail(formulas) {
  return formulas.map(function(f) {
    return [
      '<div style="margin-bottom:10px;">',
      '<div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:7px;padding:10px 14px;',
      'font-family:var(--font-mono);font-size:.88rem;color:var(--accent);">' + esc(f.expression) + '</div>',
      f.label ? '<div style="font-size:.73rem;color:var(--text-muted);margin-top:4px;padding-left:4px;">' + esc(f.label) + '</div>' : '',
      '</div>'
    ].join('');
  }).join('');
}

function renderComparisonsDetail(comparisons) {
  return comparisons.map(function(comp) {
    if (!comp.items || !comp.items.length) return '';
    return [
      '<div style="margin-bottom:14px;overflow-x:auto;">',
      '<div style="font-weight:700;font-size:.84rem;margin-bottom:8px;">' + esc(comp.title || 'Comparație') + '</div>',
      '<table style="width:100%;border-collapse:collapse;font-size:.81rem;">',
      '<thead><tr>',
      '<th style="text-align:left;padding:7px 10px;border-bottom:1px solid var(--border);color:var(--text-muted);">Aspect</th>',
      '<th style="text-align:left;padding:7px 10px;border-bottom:1px solid var(--border);color:var(--accent);">' + esc(comp.label_a || 'A') + '</th>',
      '<th style="text-align:left;padding:7px 10px;border-bottom:1px solid var(--border);color:var(--purple);">' + esc(comp.label_b || 'B') + '</th>',
      '</tr></thead><tbody>',
      comp.items.map(function(row) {
        return [
          '<tr>',
          '<td style="padding:7px 10px;font-weight:600;color:var(--text-secondary);border-bottom:1px solid var(--border);">' + esc(row.aspect) + '</td>',
          '<td style="padding:7px 10px;color:var(--text-secondary);border-bottom:1px solid var(--border);">' + esc(row.a) + '</td>',
          '<td style="padding:7px 10px;color:var(--text-secondary);border-bottom:1px solid var(--border);">' + esc(row.b) + '</td>',
          '</tr>'
        ].join('');
      }).join(''),
      '</tbody></table></div>'
    ].join('');
  }).join('');
}

// ─────────────────────────────────────────────────────────────────
// HANDLERS (expuse global)
// ─────────────────────────────────────────────────────────────────

// Expand idee în Layer 1
window.llExpandIdea = function(el, idx) {
  var expandEl = document.getElementById('ll-expand-' + idx);
  var chevron  = el.querySelector('.ll-chevron-' + idx);
  if (!expandEl) return;

  var isOpen = expandEl.style.display !== 'none';
  expandEl.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.textContent = isOpen ? '▼' : '▲';

  if (!isOpen && _llData) {
    var ideas = buildIdeas(_llData);
    var idea  = ideas[idx];
    if (!idea) return;

    expandEl.innerHTML = [
      '<div style="font-size:.82rem;color:var(--text-secondary);line-height:1.6;">',
      '<strong style="color:var(--text-primary);">Detalii:</strong> ' + esc(idea.summary),
      '</div>',
      // Legătură cu alte concepte
      _llData.key_concepts && _llData.key_concepts.length > 1 ? [
        '<div style="margin-top:10px;font-size:.78rem;color:var(--text-muted);">',
        '<strong>Concepte conexe: </strong>',
        _llData.key_concepts.filter(function(c) { return c.name !== idea.title; }).slice(0,3).map(function(c) {
          return '<span style="background:var(--accent-muted);color:var(--accent);border-radius:20px;padding:2px 10px;margin-left:4px;">' + esc(c.name) + '</span>';
        }).join(''),
        '</div>'
      ].join('') : ''
    ].join('');
  }
};

// Toggle accordion în Layer 2
window.llToggleAccordion = function(id) {
  var el = document.getElementById(id);
  var chevron = document.getElementById(id + '-chevron');
  if (!el) return;
  var isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
};

// Handle action buttons în Layer 4
window.llHandleAction = function(btn, action, idx, contextJson) {
  var resultEl = document.getElementById('ll-result-' + idx);
  if (!resultEl) return;

  var context;
  try { context = JSON.parse(contextJson); } catch(e) { context = { title: '', summary: '' }; }

  var prompts = {
    'explica_simplu': 'Explică acest concept cât mai simplu posibil, ca și cum ai vorbi cu cineva fără cunoștințe de specialitate. Concept: ' + context.title + '. Detalii: ' + context.summary,
    'da_exemplu':     'Dă un exemplu concret și practic din viața reală pentru conceptul: ' + context.title + '. Context: ' + context.summary,
    'compara':        'Compară "' + context.title + '" cu un concept similar sau opus. Evidențiază diferențele cheie. Context: ' + context.summary,
    'intrebare':      'Generează o întrebare de examen (cu răspuns) despre conceptul: ' + context.title + '. Context: ' + context.summary,
    'flashcard':      'Creează un flashcard (față/verso) pentru: ' + context.title + '. Față = întrebarea, verso = răspunsul complet. Context: ' + context.summary
  };

  var prompt = prompts[action] || context.title;

  btn.disabled = true;
  btn.style.opacity = '0.5';
  resultEl.style.display = 'block';
  resultEl.innerHTML = '<div style="color:var(--text-muted);font-size:.8rem;">⏳ Se generează...</div>';

  authFetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      system: 'Ești un profesor expert. Răspunde concis, în română, maxim 3-4 propoziții.',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var text = data.content || data.response || 'Eroare la generare.';
    resultEl.innerHTML = [
      '<div style="font-size:.72rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">',
      btn.textContent.trim(),
      '</div>',
      '<div style="white-space:pre-wrap;">' + esc(text) + '</div>'
    ].join('');
    btn.disabled = false;
    btn.style.opacity = '1';
  })
  .catch(function() {
    resultEl.innerHTML = '<div style="color:var(--red);font-size:.8rem;">Eroare. Încearcă din nou.</div>';
    btn.disabled = false;
    btn.style.opacity = '1';
  });
};

// Generate quiz în Layer 5
window.llGenerateQuiz = function(btn) {
  var container = document.getElementById('ll-quiz-container');
  if (!container || !_llData) return;

  btn.disabled = true;
  btn.innerHTML = '⏳ Se generează...';

  var ideas = buildIdeas(_llData);
  var context = ideas.map(function(i) { return i.title + ': ' + i.summary; }).join('\n');

  authFetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      system: 'Ești profesor. Generează EXCLUSIV un JSON array cu 3 întrebări multiple choice. Format: [{"q":"întrebare","options":["a) ...","b) ...","c) ...","d) ..."],"correct":0,"explanation":"..."}]. Niciun text în afara JSON-ului.',
      messages: [{ role: 'user', content: 'Generează 3 întrebări de examen despre:\n' + context }],
      max_tokens: 1200
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var raw = (data.content || data.response || '').replace(/^```json?\s*/m,'').replace(/\s*```$/m,'').trim();
    var questions;
    try { questions = JSON.parse(raw); } catch(e) { questions = null; }

    if (!questions || !questions.length) {
      container.innerHTML = '<div style="color:var(--red);font-size:.84rem;">Nu s-a putut genera quiz-ul. Încearcă din nou.</div>';
      return;
    }

    container.innerHTML = renderQuizUI(questions);
    attachQuizHandlers(container);
  })
  .catch(function() {
    container.innerHTML = '<div style="color:var(--red);font-size:.84rem;">Eroare la generare. Încearcă din nou.</div>';
  });
};

function renderQuizUI(questions) {
  var html = '<div style="display:flex;flex-direction:column;gap:16px;" id="ll-quiz-questions">';

  questions.forEach(function(q, qi) {
    html += '<div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:14px;" id="ll-q-' + qi + '">';
    html += '<div style="font-weight:700;font-size:.87rem;margin-bottom:10px;color:var(--text-primary);">' + (qi + 1) + '. ' + esc(q.q || q.question || '') + '</div>';
    html += '<div style="display:flex;flex-direction:column;gap:6px;">';

    (q.options || []).forEach(function(opt, oi) {
      html += [
        '<button class="ll-quiz-opt" data-qi="' + qi + '" data-oi="' + oi + '" data-correct="' + q.correct + '" data-explanation="' + esc(q.explanation || '') + '"',
        'style="text-align:left;padding:9px 12px;border:1px solid var(--border);border-radius:6px;',
        'background:var(--bg-raised);color:var(--text-secondary);font-size:.82rem;cursor:pointer;transition:all .15s;">',
        esc(opt),
        '</button>'
      ].join('');
    });

    html += '</div></div>';
  });

  html += '</div>';
  return html;
}

function attachQuizHandlers(container) {
  container.querySelectorAll('.ll-quiz-opt').forEach(function(btn) {
    btn.onclick = function() {
      var qi      = parseInt(this.dataset.qi);
      var oi      = parseInt(this.dataset.oi);
      var correct = parseInt(this.dataset.correct);
      var expl    = this.dataset.explanation;
      var qEl     = document.getElementById('ll-q-' + qi);
      if (!qEl) return;

      // Disable all options in this question
      qEl.querySelectorAll('.ll-quiz-opt').forEach(function(b, i) {
        b.disabled = true;
        if (i === correct) {
          b.style.background   = 'rgba(16,217,160,.15)';
          b.style.borderColor  = 'var(--green)';
          b.style.color        = 'var(--green)';
        } else if (parseInt(b.dataset.oi) === oi && oi !== correct) {
          b.style.background   = 'var(--red-muted)';
          b.style.borderColor  = 'var(--red)';
          b.style.color        = 'var(--red)';
        }
      });

      if (expl) {
        var explEl = document.createElement('div');
        explEl.style.cssText = 'margin-top:10px;padding:9px 12px;background:var(--accent-muted);border:1px solid var(--accent-border);border-radius:6px;font-size:.79rem;color:var(--text-secondary);';
        explEl.textContent = '💡 ' + expl;
        qEl.appendChild(explEl);
      }
    };
  });
}

// ─────────────────────────────────────────────────────────────────
// attachLayerHandlers — chiamat după ce DOM-ul e injectat
// ─────────────────────────────────────────────────────────────────
function attachLayerHandlers(stage) {
  // Nimic special necesar — toate handler-ele sunt inline onclick sau global
}

// ─────────────────────────────────────────────────────────────────
// HOOK: interceptăm openRichSummaryViewer pentru a stoca richData
// ─────────────────────────────────────────────────────────────────
function hookRichSummaryViewer() {
  if (typeof openRichSummaryViewer !== 'function') return;

  var _original = openRichSummaryViewer;
  window.openRichSummaryViewer = function(key, presIndex) {
    // Reset starea interactivă
    _llActive = false;
    _llData   = null;
    _llKey    = key;

    // Extragem richData din prezentare
    var allPres = typeof getAllPresentations === 'function' ? getAllPresentations(key) : [];
    var pres    = allPres ? allPres[presIndex] : null;
    if (pres && pres.richData) {
      _llData = pres.richData;
    }

    // Apelăm originalul
    _original(key, presIndex);

    // Injectăm butonul după ce DOM-ul e gata
    setTimeout(function() {
      injectToggleButton();
      // Resetăm vizual butonul
      if (_llBtn) {
        _llBtn.style.background  = '';
        _llBtn.style.color       = '';
        _llBtn.style.borderColor = '';
        _llBtn.innerHTML = '🧠 Interactiv';
      }
    }, 50);
  };
}

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────
function init() {
  hookRichSummaryViewer();

  // Re-injectăm butonul dacă viewer-ul se redeschide
  var observer = new MutationObserver(function() {
    var overlay = document.getElementById('presViewerOverlay');
    if (overlay && overlay.classList.contains('open') && !document.getElementById('llToggleBtn')) {
      injectToggleButton();
    }
  });

  var overlay = document.getElementById('presViewerOverlay');
  if (overlay) {
    observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
  } else {
    // Retry after DOM ready
    document.addEventListener('DOMContentLoaded', function() {
      var ov = document.getElementById('presViewerOverlay');
      if (ov) observer.observe(ov, { attributes: true, attributeFilter: ['class'] });
    });
  }
}

// Rulăm imediat sau după DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
