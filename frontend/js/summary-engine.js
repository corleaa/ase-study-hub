// ─────────────────────────────────────────────────────────────────
// summary-engine.js — Smart Summary Renderer
// Renderează output-ul JSON de la /api/ai/smart-summary
// ─────────────────────────────────────────────────────────────────
/* global escapeHtml */

// ─────────────────────────────────────────────────────────────────
// SECTION RENDERERS — one per kind
// ─────────────────────────────────────────────────────────────────
var SECTION_RENDERERS = {

  formule: function(s) {
    var h = '';
    (s.items || []).forEach(function(f) {
      h += '<div style="background:var(--bg-surface);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:0 10px 10px 0;padding:11px 16px;margin-bottom:8px;">';
      h += '<div style="font-family:var(--font-mono);font-size:.95rem;color:var(--accent);letter-spacing:.02em;">' + escapeHtml(f.expression || '') + '</div>';
      if (f.label) h += '<div style="font-size:.75rem;color:var(--text-muted);margin-top:4px;">' + escapeHtml(f.label) + '</div>';
      h += '</div>';
    });
    return h;
  },

  derivare: function(s) {
    var h = '';
    (s.steps || []).forEach(function(step, i) {
      h += '<div style="display:flex;gap:12px;padding:9px 0;border-bottom:1px solid var(--border);">';
      h += '<span style="background:var(--accent-muted);color:var(--accent);border:1px solid var(--accent-border);border-radius:6px;padding:2px 9px;font-size:.7rem;font-weight:700;font-family:var(--font-mono);flex-shrink:0;height:fit-content;margin-top:2px;">' + (i+1) + '</span>';
      h += '<div style="font-size:.85rem;color:var(--text-secondary);line-height:1.65;font-family:var(--font-mono);">' + escapeHtml(step) + '</div>';
      h += '</div>';
    });
    return h;
  },

  complexitate: function(s) {
    var h = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:.8rem;">';
    h += '<thead><tr style="border-bottom:1px solid var(--border);">';
    ['Caz','Timp','Spațiu','Notă'].forEach(function(th) {
      h += '<th style="text-align:left;padding:7px 10px;font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);">' + th + '</th>';
    });
    h += '</tr></thead><tbody>';
    (s.rows || []).forEach(function(r) {
      var caseColor = r.case==='Best' ? 'var(--green)' : r.case==='Worst' ? 'var(--red)' : 'var(--amber)';
      h += '<tr style="border-bottom:1px solid var(--border);">';
      h += '<td style="padding:7px 10px;color:' + caseColor + ';font-weight:600;">' + escapeHtml(r.case||'') + '</td>';
      h += '<td style="padding:7px 10px;font-family:var(--font-mono);color:var(--accent);">' + escapeHtml(r.time||'') + '</td>';
      h += '<td style="padding:7px 10px;font-family:var(--font-mono);color:var(--blue);">' + escapeHtml(r.space||'') + '</td>';
      h += '<td style="padding:7px 10px;color:var(--text-muted);">' + escapeHtml(r.note||'') + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    return h;
  },

  date_numerice: function(s) {
    var h = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">';
    (s.rows || []).forEach(function(r) {
      h += '<div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px;">';
      h += '<div style="font-size:.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">' + escapeHtml(r.metric||'') + '</div>';
      h += '<div style="font-size:1.3rem;font-weight:700;color:var(--accent);font-family:var(--font-mono);">' + escapeHtml(r.value||'') + '</div>';
      if (r.note) h += '<div style="font-size:.7rem;color:var(--text-muted);margin-top:3px;">' + escapeHtml(r.note) + '</div>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  },

  mechanism: function(s) {
    var colors = ['var(--green)', 'var(--blue)', 'var(--purple)', 'var(--amber)', 'var(--accent)'];
    var h = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">';
    (s.items || []).forEach(function(item, i) {
      var c = colors[i % colors.length];
      h += '<div style="background:' + c + '0f;border:1px solid ' + c + '33;border-radius:10px;padding:13px 15px;">';
      h += '<div style="font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:' + c + ';margin-bottom:7px;">' + escapeHtml(item.level||'') + '</div>';
      h += '<div style="font-size:.83rem;color:var(--text-secondary);line-height:1.65;">' + escapeHtml(item.text||'') + '</div>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  },

  cauza_efect: function(s) {
    var h = '';
    (s.chains || []).forEach(function(chain) {
      h += '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:10px 0;border-bottom:1px solid var(--border);">';
      chain.forEach(function(elem) {
        if (elem === '→' || elem === '->' || elem === '⟹') {
          h += '<span style="color:var(--accent);font-size:1rem;padding:0 2px;">→</span>';
        } else {
          h += '<span style="background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:5px 11px;font-size:.8rem;color:var(--text-secondary);">' + escapeHtml(elem) + '</span>';
        }
      });
      h += '</div>';
    });
    return h;
  },

  comparatie: function(s) {
    var h = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:.82rem;">';
    h += '<thead><tr style="border-bottom:1px solid var(--border);">';
    h += '<th style="text-align:left;padding:8px 10px;font-size:.65rem;font-weight:600;text-transform:uppercase;color:var(--text-muted);">Aspect</th>';
    h += '<th style="text-align:left;padding:8px 10px;font-size:.65rem;font-weight:600;text-transform:uppercase;color:var(--accent);">' + escapeHtml(s.label_a||'A') + '</th>';
    h += '<th style="text-align:left;padding:8px 10px;font-size:.65rem;font-weight:600;text-transform:uppercase;color:var(--blue);">' + escapeHtml(s.label_b||'B') + '</th>';
    h += '</tr></thead><tbody>';
    (s.items || []).forEach(function(r) {
      h += '<tr style="border-bottom:1px solid var(--border);">';
      h += '<td style="padding:8px 10px;font-weight:500;color:var(--text-primary);">' + escapeHtml(r.aspect||'') + '</td>';
      h += '<td style="padding:8px 10px;color:var(--text-secondary);">' + escapeHtml(r.a||'') + '</td>';
      h += '<td style="padding:8px 10px;color:var(--text-secondary);">' + escapeHtml(r.b||'') + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    return h;
  },

  taxonomie: function(s) {
    var h = '';
    (s.items || []).forEach(function(item, i) {
      h += '<div style="display:flex;gap:12px;padding:9px 0;border-bottom:1px solid var(--border);">';
      h += '<span style="font-size:.7rem;color:var(--text-muted);width:20px;flex-shrink:0;padding-top:2px;">' + (i+1) + '</span>';
      h += '<div><div style="font-size:.85rem;font-weight:500;color:var(--text-primary);margin-bottom:3px;">' + escapeHtml(item.name||'') + '</div>';
      h += '<div style="font-size:.8rem;color:var(--text-secondary);line-height:1.6;">' + escapeHtml(item.description||'') + '</div></div>';
      h += '</div>';
    });
    return h;
  },

  protocol: function(s) {
    var h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;">';
    (s.items || []).forEach(function(item) {
      h += '<div style="display:flex;gap:8px;align-items:flex-start;background:var(--bg-surface);border:1px solid var(--border);border-radius:9px;padding:9px 12px;">';
      h += '<span style="color:var(--green);font-size:.85rem;flex-shrink:0;margin-top:1px;">✓</span>';
      h += '<span style="font-size:.8rem;color:var(--text-secondary);line-height:1.55;">' + escapeHtml(item) + '</span>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  },

  cod: function(s) {
    var h = '<div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;">';
    if (s.language) h += '<div style="background:var(--bg-overlay);padding:6px 14px;font-size:.65rem;color:var(--text-muted);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;">' + escapeHtml(s.language) + '</div>';
    h += '<pre style="margin:0;padding:14px 16px;font-family:var(--font-mono);font-size:.8rem;color:var(--accent);line-height:1.6;overflow-x:auto;white-space:pre-wrap;word-break:break-word;">' + escapeHtml(s.code||'') + '</pre>';
    h += '</div>';
    return h;
  },

  conditii: function(s) {
    var h = '';
    (s.items || []).forEach(function(item, i) {
      h += '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">';
      h += '<span style="background:var(--blue-muted);color:var(--blue);border:1px solid rgba(138,184,216,.22);border-radius:5px;padding:2px 8px;font-size:.7rem;font-weight:700;font-family:var(--font-mono);flex-shrink:0;height:fit-content;">' + (i+1) + '</span>';
      h += '<div style="font-size:.83rem;color:var(--text-secondary);line-height:1.65;">' + escapeHtml(item) + '</div>';
      h += '</div>';
    });
    return h;
  },

  articol: function(s) {
    var h = '';
    if (s.cite) h += '<div style="font-size:.72rem;color:var(--accent);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">' + escapeHtml(s.cite) + '</div>';
    h += '<div style="background:var(--bg-surface);border:1px solid var(--border);border-left:3px solid var(--amber);border-radius:0 10px 10px 0;padding:13px 16px;font-size:.83rem;color:var(--text-secondary);line-height:1.75;font-style:italic;">' + escapeHtml(s.body||'') + '</div>';
    return h;
  },

  exceptii: function(s) {
    var h = '';
    (s.items || []).forEach(function(item) {
      h += '<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">';
      h += '<span style="color:var(--amber);flex-shrink:0;">⚠</span>';
      h += '<div style="font-size:.83rem;color:var(--text-secondary);line-height:1.65;">' + escapeHtml(item) + '</div>';
      h += '</div>';
    });
    return h;
  },

  studii: function(s) {
    var h = '';
    (s.items || []).forEach(function(item) {
      h += '<div style="padding:10px 0;border-bottom:1px solid var(--border);">';
      h += '<div style="font-size:.8rem;font-weight:600;color:var(--text-primary);margin-bottom:4px;">' + escapeHtml(item.t||'') + '</div>';
      h += '<div style="font-size:.8rem;color:var(--text-secondary);line-height:1.6;">' + escapeHtml(item.d||'') + '</div>';
      h += '</div>';
    });
    return h;
  },

  autori: function(s) {
    var h = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">';
    (s.cards || []).forEach(function(card) {
      h += '<div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:13px 15px;">';
      h += '<div style="font-size:.88rem;font-weight:600;color:var(--text-primary);">' + escapeHtml(card.name||'') + '</div>';
      if (card.year) h += '<div style="font-size:.7rem;color:var(--accent);font-family:var(--font-mono);margin:3px 0;">' + escapeHtml(card.year) + '</div>';
      h += '<div style="font-size:.78rem;color:var(--text-secondary);line-height:1.6;">' + escapeHtml(card.contribution||'') + '</div>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  },

  critici: function(s) {
    var h = '';
    (s.items || []).forEach(function(item) {
      h += '<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">';
      h += '<span style="color:var(--purple);flex-shrink:0;font-size:.85rem;">◆</span>';
      h += '<div style="font-size:.83rem;color:var(--text-secondary);line-height:1.65;">' + escapeHtml(item) + '</div>';
      h += '</div>';
    });
    return h;
  },

  caz: function(s) {
    var h = '<div style="background:var(--accent-muted);border:1px solid var(--accent-border);border-radius:12px;padding:15px 18px;">';
    h += '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);margin-bottom:8px;">Caz ilustrativ</div>';
    h += '<div style="font-size:.85rem;color:var(--text-secondary);line-height:1.75;">' + escapeHtml(s.body||'') + '</div>';
    h += '</div>';
    return h;
  },

  ddx: function(s) {
    var colors = ['var(--red)','var(--amber)','var(--blue)','var(--purple)','var(--green)'];
    var h = '';
    (s.rows || []).forEach(function(r, i) {
      var c = colors[i % colors.length];
      h += '<div style="display:flex;gap:12px;padding:9px 0;border-bottom:1px solid var(--border);align-items:flex-start;">';
      h += '<div style="width:3px;min-height:20px;background:' + c + ';border-radius:2px;flex-shrink:0;margin-top:3px;"></div>';
      h += '<div><div style="font-size:.83rem;font-weight:500;color:var(--text-primary);">' + escapeHtml(r.name||'') + '</div>';
      h += '<div style="font-size:.78rem;color:var(--text-muted);margin-top:2px;">' + escapeHtml(r.cue||'') + '</div></div>';
      h += '</div>';
    });
    return h;
  },

  aplicatii: function(s) {
    var h = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">';
    (s.items || []).forEach(function(item) {
      h += '<div style="background:var(--green-muted);border:1px solid rgba(115,201,166,.2);border-radius:9px;padding:10px 13px;font-size:.8rem;color:var(--text-secondary);line-height:1.6;">';
      h += '<span style="color:var(--green);margin-right:6px;">→</span>' + escapeHtml(item) + '</div>';
    });
    h += '</div>';
    return h;
  },

  warnings: function(s) {
    var h = '';
    (s.items || []).forEach(function(item) {
      h += '<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">';
      h += '<span style="color:var(--red);flex-shrink:0;font-size:.9rem;">!</span>';
      h += '<div style="font-size:.83rem;color:var(--text-secondary);line-height:1.65;">' + escapeHtml(item) + '</div>';
      h += '</div>';
    });
    return h;
  },

  glosar: function(s) {
    var h = '';
    (s.items || []).forEach(function(item) {
      h += '<div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);">';
      h += '<div style="min-width:120px;font-size:.8rem;font-weight:600;color:var(--accent);font-family:var(--font-mono);">' + escapeHtml(item.term||'') + '</div>';
      h += '<div style="font-size:.8rem;color:var(--text-secondary);line-height:1.6;">' + escapeHtml(item.definition||'') + '</div>';
      h += '</div>';
    });
    return h;
  },

  // Fallback for unknown kinds
  _generic: function(s) {
    var content = s.items || s.steps || s.rows || s.cards || [];
    var h = '';
    if (s.body) {
      h += '<div style="font-size:.85rem;color:var(--text-secondary);line-height:1.75;">' + escapeHtml(s.body) + '</div>';
    }
    if (Array.isArray(content)) {
      content.forEach(function(item) {
        var text = typeof item === 'string' ? item : JSON.stringify(item);
        h += '<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:.83rem;color:var(--text-secondary);">· ' + escapeHtml(text) + '</div>';
      });
    }
    return h || '<div style="color:var(--text-muted);font-size:.8rem;">Secțiune generată</div>';
  },
};

// ─────────────────────────────────────────────────────────────────
// renderSection — dispatches to the right renderer
// ─────────────────────────────────────────────────────────────────
function renderSection(section) {
  var renderer = SECTION_RENDERERS[section.kind] || SECTION_RENDERERS._generic;
  var sectionColor = {
    formule: 'var(--accent)', derivare: 'var(--accent)', complexitate: 'var(--red)',
    date_numerice: 'var(--amber)', mechanism: 'var(--green)', cauza_efect: 'var(--blue)',
    comparatie: 'var(--blue)', taxonomie: 'var(--purple)', protocol: 'var(--green)',
    cod: 'var(--teal)', conditii: 'var(--blue)', articol: 'var(--amber)',
    exceptii: 'var(--amber)', studii: 'var(--purple)', autori: 'var(--purple)',
    critici: 'var(--purple)', caz: 'var(--accent)', ddx: 'var(--red)',
    aplicatii: 'var(--green)', warnings: 'var(--red)', glosar: 'var(--accent)',
  }[section.kind] || 'var(--text-muted)';

  var h = '<div style="margin-bottom:14px;">';
  // Section header
  h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">';
  h += '<div style="width:3px;height:18px;background:' + sectionColor + ';border-radius:2px;flex-shrink:0;"></div>';
  h += '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:' + sectionColor + ';">' + escapeHtml(section.title || section.kind) + '</div>';
  if (section.relevance && section.relevance < 0.7) {
    h += '<div style="margin-left:auto;font-size:.62rem;color:var(--text-muted);font-family:var(--font-mono);">' + Math.round(section.relevance * 100) + '% relevance</div>';
  }
  h += '</div>';
  // Section content
  h += renderer(section);
  h += '</div>';
  return h;
}

// ─────────────────────────────────────────────────────────────────
// buildSmartSummarySlides — converts smart summary JSON to slides
// ─────────────────────────────────────────────────────────────────
function buildSmartSummarySlides(data) {
  if (!data || !data.output) return [];
  var o = data.output;
  var a = data.analysis || {};
  var slides = [];

  // ── Slide 1: Title + Why + Analysis badge + Layers ──────────────
  var s1 = '<div style="display:flex;flex-direction:column;gap:16px;">';

  // Title + why + tags
  s1 += '<div style="text-align:center;">';
  s1 += '<div style="font-size:1.5rem;font-weight:800;color:var(--text-primary);line-height:1.3;margin-bottom:10px;">' + escapeHtml(o.title||'') + '</div>';
  if (o.why_it_matters) {
    s1 += '<div style="font-size:.9rem;color:var(--text-secondary);max-width:520px;margin:0 auto;line-height:1.7;">' + escapeHtml(o.why_it_matters) + '</div>';
  }
  if (o.domain_tags && o.domain_tags.length) {
    s1 += '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:12px;">';
    o.domain_tags.forEach(function(t) {
      s1 += '<span style="background:var(--accent-muted);color:var(--accent);border:1px solid var(--accent-border);border-radius:20px;padding:3px 12px;font-size:.72rem;font-weight:600;">' + escapeHtml(t) + '</span>';
    });
    s1 += '</div>';
  }
  s1 += '</div>';

  // Analysis badges
  if (a.difficulty || a.confidence) {
    s1 += '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">';
    if (a.difficulty) {
      var diffColor = {introductory:'var(--green)',intermediate:'var(--amber)',advanced:'var(--red)'}[a.difficulty] || 'var(--text-muted)';
      s1 += '<span style="background:' + diffColor + '1a;color:' + diffColor + ';border:1px solid ' + diffColor + '33;border-radius:8px;padding:4px 12px;font-size:.72rem;font-weight:600;">' + a.difficulty + '</span>';
    }
    if (a.confidence) {
      s1 += '<span style="background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:4px 12px;font-size:.72rem;color:var(--text-muted);">confidence ' + Math.round(a.confidence*100) + '%</span>';
    }
    if (a.source_quality) {
      var sqColor = {good:'var(--green)',medium:'var(--amber)',poor:'var(--red)'}[a.source_quality] || 'var(--text-muted)';
      s1 += '<span style="background:' + sqColor + '1a;color:' + sqColor + ';border:1px solid ' + sqColor + '33;border-radius:8px;padding:4px 12px;font-size:.72rem;">sursă ' + a.source_quality + '</span>';
    }
    s1 += '</div>';
  }

  // Prerequisites
  if (a.prerequisites && a.prerequisites.length) {
    s1 += '<div style="background:var(--blue-muted);border:1px solid rgba(138,184,216,.22);border-radius:10px;padding:12px 15px;">';
    s1 += '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--blue);margin-bottom:7px;">Înainte să citești, trebuie să știi</div>';
    s1 += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    a.prerequisites.forEach(function(p) {
      s1 += '<span style="background:var(--bg-surface);border:1px solid var(--border);border-radius:7px;padding:3px 10px;font-size:.78rem;color:var(--text-secondary);">' + escapeHtml(p) + '</span>';
    });
    s1 += '</div></div>';
  }

  // Key insight
  if (o.key_insight) {
    s1 += '<div style="background:var(--green-muted);border:1px solid rgba(115,201,166,.2);border-radius:10px;padding:13px 16px;text-align:center;">';
    s1 += '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--green);margin-bottom:5px;">Ideea centrală</div>';
    s1 += '<div style="font-size:.87rem;color:var(--text-secondary);line-height:1.65;">' + escapeHtml(o.key_insight) + '</div>';
    s1 += '</div>';
  }

  s1 += '</div>';
  slides.push({ tag: 'Intro', title: o.title, content: s1 });

  // ── Slide 2: Layers ─────────────────────────────────────────────
  if (o.layers && o.layers.length) {
    var s2 = '<div style="display:flex;flex-direction:column;gap:10px;">';
    s2 += '<div style="font-size:.68rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">Trei niveluri de înțelegere</div>';
    var layerColors = { 'Intuitiv': 'var(--green)', 'Conceptual': 'var(--blue)', 'Tehnic': 'var(--purple)' };
    o.layers.forEach(function(layer, idx) {
      var c = layer.color || layerColors[layer.level] || 'var(--accent)';
      s2 += '<details ' + (idx===0?'open':'') + ' style="background:' + c + '0d;border:1px solid ' + c + '2a;border-radius:14px;padding:13px 16px;">';
      s2 += '<summary style="list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;">';
      s2 += '<span style="background:' + c + '1f;color:' + c + ';border:1px solid ' + c + '44;border-radius:20px;padding:2px 11px;font-size:.7rem;font-weight:700;">' + escapeHtml(layer.level||'') + '</span>';
      s2 += '<span style="font-size:.72rem;color:var(--text-muted);margin-left:auto;">' + (idx===0?'▲':'▼') + '</span>';
      s2 += '</summary>';
      s2 += '<div style="font-size:.85rem;color:var(--text-secondary);line-height:1.7;margin-top:11px;">' + escapeHtml(layer.text||'') + '</div>';
      s2 += '</details>';
    });
    s2 += '</div>';
    slides.push({ tag: 'Niveluri', title: 'Explicație pe niveluri', content: s2 });
  }

  // ── Slides 3+: Domain sections ──────────────────────────────────
  var sections = (o.sections || []).filter(function(s) { return (s.relevance || 1) > 0.45; });
  // Sort by relevance descending
  sections.sort(function(a, b) { return (b.relevance||0) - (a.relevance||0); });

  // Group sections 2 per slide for density
  for (var i = 0; i < sections.length; i += 2) {
    var slideContent = '<div style="display:flex;flex-direction:column;gap:6px;">';
    slideContent += renderSection(sections[i]);
    if (sections[i+1]) slideContent += renderSection(sections[i+1]);
    slideContent += '</div>';
    var slideTag = sections[i].title || sections[i].kind;
    slides.push({ tag: slideTag, title: slideTag, content: slideContent });
  }

  // ── Last slide: Pathway + Ce urmează ────────────────────────────
  var sLast = '<div style="display:flex;flex-direction:column;gap:16px;">';

  // Pathway
  if (o.pathway && o.pathway.length) {
    sLast += '<div>';
    sLast += '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--text-muted);margin-bottom:10px;">Traseul conceptual</div>';
    sLast += '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0;">';
    o.pathway.forEach(function(step, i) {
      sLast += '<div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:6px 13px;font-size:.8rem;color:var(--text-secondary);white-space:nowrap;">' + escapeHtml(step) + '</div>';
      if (i < o.pathway.length - 1) sLast += '<div style="color:var(--accent);padding:0 6px;font-size:.9rem;">→</div>';
    });
    sLast += '</div></div>';
  }

  // Learning position
  if (a.learning_position) {
    var lp = a.learning_position;
    sLast += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
    if (lp.requires && lp.requires.length) {
      sLast += '<div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px;">';
      sLast += '<div style="font-size:.65rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:7px;">← Vine după</div>';
      lp.requires.forEach(function(r) {
        sLast += '<div style="font-size:.78rem;color:var(--text-secondary);padding:3px 0;">' + escapeHtml(r) + '</div>';
      });
      sLast += '</div>';
    }
    if (lp.leads_to && lp.leads_to.length) {
      sLast += '<div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px;">';
      sLast += '<div style="font-size:.65rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:7px;">→ Duce spre</div>';
      lp.leads_to.forEach(function(l) {
        sLast += '<div style="font-size:.78rem;color:var(--text-secondary);padding:3px 0;">' + escapeHtml(l) + '</div>';
      });
      sLast += '</div>';
    }
    sLast += '</div>';
  }

  // Ce urmează
  if (o.ce_urmeaza) {
    sLast += '<div style="background:var(--accent-muted);border:1px solid var(--accent-border);border-radius:12px;padding:15px 18px;">';
    sLast += '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);margin-bottom:8px;">Ce vei găsi în documentul complet</div>';
    sLast += '<div style="font-size:.85rem;color:var(--text-secondary);line-height:1.7;">' + escapeHtml(o.ce_urmeaza) + '</div>';
    sLast += '</div>';
  }

  sLast += '</div>';
  slides.push({ tag: 'Traseul tău', title: 'Traseul tău de învățare', content: sLast });

  return slides;
}
