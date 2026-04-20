// ─────────────────────────────────────────────────────────────────
// summary-engine.js — Smart Summary Renderer v2
// Layout: pagină scrollabilă unică, nu slide-uri paginate
// ─────────────────────────────────────────────────────────────────
/* global escapeHtml, state, saveState, getAllPresentations */

// ─────────────────────────────────────────────────────────────────
// SECTION RENDERERS
// ─────────────────────────────────────────────────────────────────
var SR = {

  formule: function(s) {
    var h = '';
    (s.items || []).forEach(function(f) {
      h += '<div style="background:#1a1520;border:1px solid rgba(242,155,109,.18);border-left:3px solid var(--accent);border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:8px;">';
      h += '<div style="font-family:var(--font-mono);font-size:.92rem;color:var(--accent);">' + escapeHtml(f.expression||'') + '</div>';
      if (f.label) h += '<div style="font-size:.72rem;color:var(--text-muted);margin-top:4px;">' + escapeHtml(f.label) + '</div>';
      h += '</div>';
    });
    return h;
  },

  derivare: function(s) {
    var h = '<div style="display:flex;flex-direction:column;gap:0;">';
    (s.steps||[]).forEach(function(step, i) {
      h += '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">';
      h += '<span style="font-family:var(--font-mono);font-size:.7rem;color:var(--accent);background:rgba(242,155,109,.1);border:1px solid rgba(242,155,109,.2);border-radius:4px;padding:1px 7px;flex-shrink:0;height:fit-content;margin-top:2px;">'+(i+1)+'</span>';
      h += '<div style="font-size:.83rem;color:var(--text-secondary);line-height:1.6;font-family:var(--font-mono);">' + escapeHtml(step) + '</div>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  },

  complexitate: function(s) {
    var h = '<table style="width:100%;border-collapse:collapse;font-size:.8rem;">';
    h += '<thead><tr style="border-bottom:1px solid var(--border);">';
    ['Caz','Timp','Spațiu','Notă'].forEach(function(th) { h += '<th style="text-align:left;padding:6px 10px;font-size:.62rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);">'+th+'</th>'; });
    h += '</tr></thead><tbody>';
    (s.rows||[]).forEach(function(r) {
      var c = r.case==='Best'?'var(--green)':r.case==='Worst'?'var(--red)':'var(--amber)';
      h += '<tr style="border-bottom:1px solid var(--border);"><td style="padding:6px 10px;color:'+c+';font-weight:600;">'+escapeHtml(r.case||'')+'</td><td style="padding:6px 10px;font-family:var(--font-mono);color:var(--accent);">'+escapeHtml(r.time||'')+'</td><td style="padding:6px 10px;font-family:var(--font-mono);color:var(--blue);">'+escapeHtml(r.space||'')+'</td><td style="padding:6px 10px;color:var(--text-muted);">'+escapeHtml(r.note||'')+'</td></tr>';
    });
    h += '</tbody></table>';
    return h;
  },

  date_numerice: function(s) {
    var h = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;">';
    (s.rows||[]).forEach(function(r) {
      h += '<div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:11px 13px;"><div style="font-size:.62rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">'+escapeHtml(r.metric||'')+'</div><div style="font-size:1.2rem;font-weight:700;color:var(--accent);font-family:var(--font-mono);">'+escapeHtml(r.value||'')+'</div>'+(r.note?'<div style="font-size:.68rem;color:var(--text-muted);margin-top:2px;">'+escapeHtml(r.note)+'</div>':'')+'</div>';
    });
    h += '</div>';
    return h;
  },

  mechanism: function(s) {
    var colors = ['var(--green)','var(--blue)','var(--purple)','var(--amber)','var(--accent)'];
    var h = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">';
    (s.items||[]).forEach(function(item, i) {
      var c = colors[i%colors.length];
      h += '<div style="background:'+c+'10;border:1px solid '+c+'28;border-radius:9px;padding:12px 13px;"><div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+c+';margin-bottom:6px;">'+escapeHtml(item.level||'')+'</div><div style="font-size:.81rem;color:var(--text-secondary);line-height:1.6;">'+escapeHtml(item.text||'')+'</div></div>';
    });
    h += '</div>';
    return h;
  },

  cauza_efect: function(s) {
    var h = '<div style="display:flex;flex-direction:column;gap:2px;">';
    (s.chains||[]).forEach(function(chain) {
      h += '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:5px;padding:8px 0;border-bottom:1px solid var(--border);">';
      chain.forEach(function(e) {
        if (e==='→'||e==='->'||e==='⟹') { h += '<span style="color:var(--accent);font-size:.9rem;">→</span>'; }
        else { h += '<span style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:7px;padding:4px 10px;font-size:.78rem;color:var(--text-secondary);">'+escapeHtml(e)+'</span>'; }
      });
      h += '</div>';
    });
    h += '</div>';
    return h;
  },

  comparatie: function(s) {
    var h = '<table style="width:100%;border-collapse:collapse;font-size:.81rem;">';
    h += '<thead><tr style="border-bottom:1px solid var(--border);"><th style="text-align:left;padding:7px 10px;font-size:.62rem;font-weight:600;text-transform:uppercase;color:var(--text-muted);">Aspect</th><th style="text-align:left;padding:7px 10px;font-size:.62rem;font-weight:600;text-transform:uppercase;color:var(--accent);">'+escapeHtml(s.label_a||'A')+'</th><th style="text-align:left;padding:7px 10px;font-size:.62rem;font-weight:600;text-transform:uppercase;color:var(--blue);">'+escapeHtml(s.label_b||'B')+'</th></tr></thead><tbody>';
    (s.items||[]).forEach(function(r) {
      h += '<tr style="border-bottom:1px solid var(--border);"><td style="padding:7px 10px;font-weight:500;color:var(--text-primary);">'+escapeHtml(r.aspect||'')+'</td><td style="padding:7px 10px;color:var(--text-secondary);">'+escapeHtml(r.a||'')+'</td><td style="padding:7px 10px;color:var(--text-secondary);">'+escapeHtml(r.b||'')+'</td></tr>';
    });
    h += '</tbody></table>';
    return h;
  },

  taxonomie: function(s) {
    var h = '<div style="display:flex;flex-direction:column;">';
    (s.items||[]).forEach(function(item, i) {
      h += '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);"><span style="font-size:.68rem;color:var(--text-muted);width:18px;flex-shrink:0;padding-top:2px;">'+(i+1)+'</span><div><div style="font-size:.83rem;font-weight:500;color:var(--text-primary);margin-bottom:2px;">'+escapeHtml(item.name||'')+'</div><div style="font-size:.78rem;color:var(--text-muted);line-height:1.55;">'+escapeHtml(item.description||'')+'</div></div></div>';
    });
    h += '</div>';
    return h;
  },

  protocol: function(s) {
    var h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
    (s.items||[]).forEach(function(item) {
      h += '<div style="display:flex;gap:8px;align-items:flex-start;background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:8px 11px;"><span style="color:var(--green);flex-shrink:0;">✓</span><span style="font-size:.79rem;color:var(--text-secondary);line-height:1.5;">'+escapeHtml(item)+'</span></div>';
    });
    h += '</div>';
    return h;
  },

  cod: function(s) {
    var h = '<div style="background:#0d0b10;border:1px solid var(--border);border-radius:9px;overflow:hidden;">';
    if (s.language) h += '<div style="background:var(--bg-overlay);padding:5px 13px;font-size:.62rem;color:var(--text-muted);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;">'+escapeHtml(s.language)+'</div>';
    h += '<pre style="margin:0;padding:13px 15px;font-family:var(--font-mono);font-size:.79rem;color:var(--accent);line-height:1.6;overflow-x:auto;white-space:pre-wrap;word-break:break-word;">'+escapeHtml(s.code||'')+'</pre></div>';
    return h;
  },

  conditii: function(s) {
    var h = '<div style="display:flex;flex-direction:column;">';
    (s.items||[]).forEach(function(item, i) {
      h += '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);"><span style="background:rgba(138,184,216,.1);color:var(--blue);border:1px solid rgba(138,184,216,.2);border-radius:4px;padding:1px 7px;font-size:.68rem;font-weight:700;font-family:var(--font-mono);flex-shrink:0;height:fit-content;margin-top:1px;">'+(i+1)+'</span><div style="font-size:.82rem;color:var(--text-secondary);line-height:1.6;">'+escapeHtml(item)+'</div></div>';
    });
    h += '</div>';
    return h;
  },

  articol: function(s) {
    var h = '';
    if (s.cite) h += '<div style="font-size:.7rem;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px;">'+escapeHtml(s.cite)+'</div>';
    h += '<div style="background:rgba(233,187,116,.06);border:1px solid rgba(233,187,116,.15);border-left:3px solid var(--amber);border-radius:0 8px 8px 0;padding:12px 15px;font-size:.82rem;color:var(--text-secondary);line-height:1.75;font-style:italic;">'+escapeHtml(s.body||'')+'</div>';
    return h;
  },

  exceptii: function(s) {
    var h = '<div style="display:flex;flex-direction:column;">';
    (s.items||[]).forEach(function(item) {
      h += '<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);"><span style="color:var(--amber);flex-shrink:0;">⚠</span><div style="font-size:.82rem;color:var(--text-secondary);line-height:1.6;">'+escapeHtml(item)+'</div></div>';
    });
    h += '</div>';
    return h;
  },

  studii: function(s) {
    var h = '<div style="display:flex;flex-direction:column;">';
    (s.items||[]).forEach(function(item) {
      h += '<div style="padding:9px 0;border-bottom:1px solid var(--border);"><div style="font-size:.8rem;font-weight:600;color:var(--text-primary);margin-bottom:3px;">'+escapeHtml(item.t||'')+'</div><div style="font-size:.79rem;color:var(--text-muted);line-height:1.55;">'+escapeHtml(item.d||'')+'</div></div>';
    });
    h += '</div>';
    return h;
  },

  autori: function(s) {
    var h = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">';
    (s.cards||[]).forEach(function(c) {
      h += '<div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:9px;padding:12px 14px;"><div style="font-size:.85rem;font-weight:600;color:var(--text-primary);">'+escapeHtml(c.name||'')+'</div>'+(c.year?'<div style="font-size:.68rem;color:var(--accent);font-family:var(--font-mono);margin:2px 0;">'+escapeHtml(c.year)+'</div>':'')+'<div style="font-size:.77rem;color:var(--text-muted);line-height:1.5;margin-top:3px;">'+escapeHtml(c.contribution||'')+'</div></div>';
    });
    h += '</div>';
    return h;
  },

  critici: function(s) {
    var h = '<div style="display:flex;flex-direction:column;">';
    (s.items||[]).forEach(function(item) {
      h += '<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);"><span style="color:var(--purple);flex-shrink:0;font-size:.8rem;">◆</span><div style="font-size:.82rem;color:var(--text-secondary);line-height:1.6;">'+escapeHtml(item)+'</div></div>';
    });
    h += '</div>';
    return h;
  },

  caz: function(s) {
    return '<div style="background:rgba(242,155,109,.07);border:1px solid rgba(242,155,109,.18);border-radius:10px;padding:14px 16px;"><div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);margin-bottom:7px;">Caz ilustrativ</div><div style="font-size:.83rem;color:var(--text-secondary);line-height:1.72;">'+escapeHtml(s.body||'')+'</div></div>';
  },

  ddx: function(s) {
    var colors = ['var(--red)','var(--amber)','var(--blue)','var(--purple)','var(--green)'];
    var h = '<div style="display:flex;flex-direction:column;">';
    (s.rows||[]).forEach(function(r, i) {
      var c = colors[i%colors.length];
      h += '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);align-items:flex-start;"><div style="width:3px;min-height:18px;background:'+c+';border-radius:2px;flex-shrink:0;margin-top:3px;"></div><div><div style="font-size:.82rem;font-weight:500;color:var(--text-primary);">'+escapeHtml(r.name||'')+'</div><div style="font-size:.76rem;color:var(--text-muted);margin-top:2px;">'+escapeHtml(r.cue||'')+'</div></div></div>';
    });
    h += '</div>';
    return h;
  },

  aplicatii: function(s) {
    var h = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:7px;">';
    (s.items||[]).forEach(function(item) {
      h += '<div style="background:rgba(115,201,166,.07);border:1px solid rgba(115,201,166,.15);border-radius:8px;padding:9px 12px;font-size:.79rem;color:var(--text-secondary);line-height:1.5;"><span style="color:var(--green);margin-right:5px;">→</span>'+escapeHtml(item)+'</div>';
    });
    h += '</div>';
    return h;
  },

  warnings: function(s) {
    var h = '<div style="display:flex;flex-direction:column;">';
    (s.items||[]).forEach(function(item) {
      h += '<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);"><span style="color:var(--red);flex-shrink:0;font-weight:700;">!</span><div style="font-size:.82rem;color:var(--text-secondary);line-height:1.6;">'+escapeHtml(item)+'</div></div>';
    });
    h += '</div>';
    return h;
  },

  glosar: function(s) {
    var h = '<div style="display:flex;flex-direction:column;">';
    (s.items||[]).forEach(function(item) {
      h += '<div style="display:flex;gap:12px;padding:7px 0;border-bottom:1px solid var(--border);"><div style="min-width:130px;font-size:.78rem;font-weight:600;color:var(--accent);font-family:var(--font-mono);">'+escapeHtml(item.term||'')+'</div><div style="font-size:.78rem;color:var(--text-secondary);line-height:1.55;">'+escapeHtml(item.definition||'')+'</div></div>';
    });
    h += '</div>';
    return h;
  },

  _generic: function(s) {
    var arr = s.items||s.steps||s.rows||s.cards||[];
    var h = s.body ? '<div style="font-size:.83rem;color:var(--text-secondary);line-height:1.7;">'+escapeHtml(s.body)+'</div>' : '';
    if (Array.isArray(arr)) arr.forEach(function(it) {
      h += '<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:.81rem;color:var(--text-secondary);">· '+escapeHtml(typeof it==='string'?it:JSON.stringify(it))+'</div>';
    });
    return h || '<div style="color:var(--text-muted);font-size:.78rem;">—</div>';
  },
};

var SECTION_COLOR = {
  formule:'var(--accent)',derivare:'var(--accent)',complexitate:'var(--red)',
  date_numerice:'var(--amber)',mechanism:'var(--green)',cauza_efect:'var(--blue)',
  comparatie:'var(--blue)',taxonomie:'var(--purple)',protocol:'var(--green)',
  cod:'var(--teal)',conditii:'var(--blue)',articol:'var(--amber)',
  exceptii:'var(--amber)',studii:'var(--purple)',autori:'var(--purple)',
  critici:'var(--purple)',caz:'var(--accent)',ddx:'var(--red)',
  aplicatii:'var(--green)',warnings:'var(--red)',glosar:'var(--accent)',
};

// ─────────────────────────────────────────────────────────────────
// renderSmartSummaryPage — full scrollable HTML for a smart summary
// ─────────────────────────────────────────────────────────────────
function renderSmartSummaryPage(data) {
  if (!data || !data.output) return '<div style="color:var(--text-muted);padding:32px;text-align:center;">Date lipsă</div>';
  var o = data.output;
  var a = data.analysis || {};

  var h = '<div style="max-width:820px;margin:0 auto;padding:28px 24px 52px;font-family:var(--font-body);">';

  // ── Header ────────────────────────────────────────────────────
  h += '<div style="margin-bottom:28px;">';
  h += '<div style="font-size:1.6rem;font-weight:800;color:var(--text-primary);line-height:1.25;margin-bottom:12px;letter-spacing:-.01em;">' + escapeHtml(o.title||'') + '</div>';
  if (o.why_it_matters) h += '<div style="font-size:.92rem;color:var(--text-secondary);line-height:1.75;margin-bottom:14px;border-left:3px solid rgba(242,155,109,.35);padding-left:14px;">' + escapeHtml(o.why_it_matters) + '</div>';

  // Tags
  if (o.domain_tags && o.domain_tags.length) {
    h += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">';
    o.domain_tags.forEach(function(t) {
      h += '<span style="background:rgba(242,155,109,.1);color:var(--accent);border:1px solid rgba(242,155,109,.22);border-radius:20px;padding:3px 11px;font-size:.7rem;font-weight:600;">'+escapeHtml(t)+'</span>';
    });
    h += '</div>';
  }

  // Badges
  var badges = [];
  if (a.difficulty) {
    var dc = {introductory:'var(--green)',intermediate:'var(--amber)',advanced:'var(--red)'}[a.difficulty]||'var(--text-muted)';
    badges.push('<span style="background:'+dc+'18;color:'+dc+';border:1px solid '+dc+'30;border-radius:7px;padding:3px 11px;font-size:.7rem;font-weight:600;">'+escapeHtml(a.difficulty)+'</span>');
  }
  if (a.confidence) badges.push('<span style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:7px;padding:3px 11px;font-size:.7rem;color:var(--text-muted);">confidence '+Math.round(a.confidence*100)+'%</span>');
  if (badges.length) h += '<div style="display:flex;gap:6px;flex-wrap:wrap;">' + badges.join('') + '</div>';
  h += '</div>';

  // ── Prerequisites ───────────────────────────────────────────────
  if (a.prerequisites && a.prerequisites.length) {
    h += '<div style="background:rgba(138,184,216,.07);border:1px solid rgba(138,184,216,.18);border-radius:10px;padding:12px 15px;margin-bottom:20px;">';
    h += '<div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--blue);margin-bottom:8px;">Înainte să citești, trebuie să știi</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    a.prerequisites.forEach(function(p) { h += '<span style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:7px;padding:3px 10px;font-size:.77rem;color:var(--text-secondary);">'+escapeHtml(p)+'</span>'; });
    h += '</div></div>';
  }

  // ── Layers ────────────────────────────────────────────────────
  if (o.layers && o.layers.length) {
    h += '<div style="margin-bottom:28px;">';
    h += '<div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--text-muted);margin-bottom:12px;">Trei niveluri de înțelegere</div>';
    var lc = {'Intuitiv':'var(--green)','Conceptual':'var(--blue)','Tehnic':'var(--purple)'};
    o.layers.forEach(function(layer, idx) {
      var c = layer.color || lc[layer.level] || 'var(--accent)';
      h += '<details '+(idx===0?'open':'')+' style="background:'+c+'0a;border:1px solid '+c+'22;border-radius:13px;padding:13px 16px;margin-bottom:8px;transition:background .2s;">';
      h += '<summary style="list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;user-select:none;">';
      h += '<span style="background:'+c+'1a;color:'+c+';border:1px solid '+c+'38;border-radius:20px;padding:3px 12px;font-size:.69rem;font-weight:700;letter-spacing:.02em;">'+escapeHtml(layer.level||'')+'</span>';
      h += '<span style="font-size:.69rem;color:var(--text-muted);margin-left:auto;font-family:var(--font-mono);">'+(idx===0?'▲ deschis':'▼ deschide')+'</span>';
      h += '</summary>';
      h += '<div style="font-size:.85rem;color:var(--text-secondary);line-height:1.75;margin-top:12px;padding-top:10px;border-top:1px solid '+c+'18;">'+escapeHtml(layer.text||'')+'</div>';
      h += '</details>';
    });
    h += '</div>';
  }

  // ── Sections ──────────────────────────────────────────────────
  var sections = (o.sections||[]).filter(function(s){ return (s.relevance||1)>0.45; });
  sections.sort(function(a,b){ return (b.relevance||0)-(a.relevance||0); });

  if (sections.length) {
    // 2-column grid for sections where content is compact
    var singleKinds = ['caz','articol','derivare','cod'];
    var i = 0;
    while (i < sections.length) {
      var sec = sections[i];
      var isSingle = singleKinds.indexOf(sec.kind) >= 0 || !sections[i+1];
      if (isSingle) {
        h += renderSectionBlock(sec);
        i++;
      } else {
        // pair side-by-side
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">';
        h += renderSectionBlock(sections[i], true);
        h += renderSectionBlock(sections[i+1], true);
        h += '</div>';
        i += 2;
      }
    }
  }

  // ── Key insight ───────────────────────────────────────────────
  if (o.key_insight) {
    h += '<div style="background:rgba(115,201,166,.07);border:1px solid rgba(115,201,166,.17);border-radius:10px;padding:14px 17px;margin-bottom:20px;text-align:center;">';
    h += '<div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--green);margin-bottom:6px;">Ideea centrală</div>';
    h += '<div style="font-size:.87rem;color:var(--text-secondary);line-height:1.65;font-style:italic;">'+escapeHtml(o.key_insight)+'</div>';
    h += '</div>';
  }

  // ── Pathway ───────────────────────────────────────────────────
  if (o.pathway && o.pathway.length) {
    h += '<div style="margin-bottom:20px;">';
    h += '<div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--text-muted);margin-bottom:10px;">Traseu conceptual</div>';
    h += '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0;">';
    o.pathway.forEach(function(step, i) {
      h += '<div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:7px;padding:6px 12px;font-size:.78rem;color:var(--text-secondary);white-space:nowrap;">'+escapeHtml(step)+'</div>';
      if (i < o.pathway.length-1) h += '<div style="color:var(--accent);padding:0 5px;font-size:.85rem;">→</div>';
    });
    h += '</div></div>';
  }

  // ── Learning position ─────────────────────────────────────────
  if (a.learning_position && ((a.learning_position.requires||[]).length || (a.learning_position.leads_to||[]).length)) {
    var lp = a.learning_position;
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">';
    if ((lp.requires||[]).length) {
      h += '<div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:9px;padding:12px 14px;"><div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:7px;">← Vine după</div>';
      lp.requires.forEach(function(r){ h += '<div style="font-size:.78rem;color:var(--text-secondary);padding:2px 0;">'+escapeHtml(r)+'</div>'; });
      h += '</div>';
    }
    if ((lp.leads_to||[]).length) {
      h += '<div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:9px;padding:12px 14px;"><div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:7px;">→ Duce spre</div>';
      lp.leads_to.forEach(function(l){ h += '<div style="font-size:.78rem;color:var(--text-secondary);padding:2px 0;">'+escapeHtml(l)+'</div>'; });
      h += '</div>';
    }
    h += '</div>';
  }

  // ── Ce urmează ────────────────────────────────────────────────
  if (o.ce_urmeaza) {
    h += '<div style="background:rgba(242,155,109,.07);border:1px solid rgba(242,155,109,.2);border-radius:11px;padding:15px 17px;">';
    h += '<div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);margin-bottom:7px;">Ce vei găsi în documentul complet</div>';
    h += '<div style="font-size:.84rem;color:var(--text-secondary);line-height:1.7;">'+escapeHtml(o.ce_urmeaza)+'</div>';
    h += '</div>';
  }

  h += '</div>'; // end page wrapper
  return h;
}

function renderSectionBlock(sec, noMargin) {
  var c = SECTION_COLOR[sec.kind] || 'var(--text-muted)';
  var renderer = SR[sec.kind] || SR._generic;
  var mb = noMargin ? '' : 'margin-bottom:14px;';
  var h = '<div style="background:var(--bg-raised);border:1px solid var(--border);border-top:2px solid '+c+'40;border-radius:12px;padding:15px 17px;'+mb+'">';
  h += '<div style="display:flex;align-items:center;gap:7px;margin-bottom:12px;">';
  h += '<div style="font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:'+c+';">'+escapeHtml(sec.title||sec.kind)+'</div>';
  h += '</div>';
  h += renderer(sec);
  h += '</div>';
  return h;
}

// ─────────────────────────────────────────────────────────────────
// openSmartSummaryModal — opens full-screen scrollable modal
// ─────────────────────────────────────────────────────────────────
function openSmartSummaryModal(data, title, subjectName, intent) {
  // Remove any existing modal
  var existing = document.getElementById('smartSummaryModal');
  if (existing) existing.remove();

  // Set active summary context for Mentor
  if (data && data.output) {
    var o = data.output;
    var a = data.analysis || {};
    window.__activeSummaryContext = {
      title:       o.title || title || '',
      subject:     subjectName || '',
      why:         o.why_it_matters || '',
      insight:     o.key_insight || '',
      prerequisites: a.prerequisites || [],
      sections:    (o.sections||[]).map(function(s){ return s.title||s.kind; }),
      difficulty:  a.difficulty || '',
      intent:      intent || '',
    };
  }

  var modal = document.createElement('div');
  modal.id = 'smartSummaryModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.84);display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;';

  var inner = document.createElement('div');
  inner.style.cssText = 'background:var(--bg-base);border:1px solid var(--border);border-radius:16px;width:100%;max-width:860px;overflow:hidden;flex-shrink:0;margin-bottom:20px;';

  // Header bar
  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 18px;background:var(--bg-raised);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:10;';
  header.innerHTML = '<div style="font-size:.8rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">'+escapeHtml(title||'Fișă de învățare')+'</div>'
    + '<button id="ssm-mentor-btn" style="background:rgba(242,155,109,.1);border:1px solid rgba(242,155,109,.25);color:var(--accent);border-radius:8px;padding:6px 13px;cursor:pointer;font-size:.78rem;font-weight:600;flex-shrink:0;white-space:nowrap;">💬 Discută cu AI Mentorul</button>'
    + '<button onclick="document.getElementById(\'smartSummaryModal\').remove()" style="background:var(--bg-overlay);border:1px solid var(--border);color:var(--text-muted);border-radius:8px;padding:6px 12px;cursor:pointer;font-size:.78rem;flex-shrink:0;">✕</button>';

  var content = document.createElement('div');
  content.innerHTML = renderSmartSummaryPage(data);

  // Footer with chat button
  var footer = document.createElement('div');
  footer.style.cssText = 'padding:14px 20px;background:var(--bg-raised);border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px;';
  footer.innerHTML = '<div style="font-size:.76rem;color:var(--text-muted);">Ai întrebări despre această fișă? AI Mentorul știe deja ce ai studiat.</div>'
    + '<button id="ssm-mentor-btn2" style="background:rgba(242,155,109,.1);border:1px solid rgba(242,155,109,.25);color:var(--accent);border-radius:9px;padding:8px 16px;cursor:pointer;font-size:.82rem;font-weight:600;white-space:nowrap;">💬 Aprofundează cu AI Mentorul →</button>';

  inner.appendChild(header);
  inner.appendChild(content);
  inner.appendChild(footer);
  modal.appendChild(inner);
  document.body.appendChild(modal);

  // Mentor button handler
  function goToMentor() {
    modal.remove();
    if (typeof navigateTo === 'function') navigateTo('mentor');
  }
  var btn1 = document.getElementById('ssm-mentor-btn');
  var btn2 = document.getElementById('ssm-mentor-btn2');
  if (btn1) btn1.addEventListener('click', goToMentor);
  if (btn2) btn2.addEventListener('click', goToMentor);

  // Close on backdrop click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.remove();
  });
  // Close on Escape
  var escHandler = function(e) { if (e.key==='Escape') { modal.remove(); document.removeEventListener('keydown', escHandler); } };
  document.addEventListener('keydown', escHandler);
}

// ─────────────────────────────────────────────────────────────────
// buildSmartSummarySlides — kept for backward compat with slide system
// For smart summaries we use openSmartSummaryModal directly
// ─────────────────────────────────────────────────────────────────
function buildSmartSummarySlides(data) {
  if (!data || !data.output) return [];
  // Return single "page" slide — content is full scrollable HTML
  return [{
    tag: 'Fișă',
    title: data.output.title || 'Rezumat',
    content: renderSmartSummaryPage(data),
  }];
}
