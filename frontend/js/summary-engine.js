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
    var rows = s.rows || [];
    // Extract numeric values for bar scaling
    var numVals = rows.map(function(r) {
      var v = parseFloat((r.value||'').replace(/[^0-9.,]/g,'').replace(',','.'));
      return isNaN(v) ? 0 : v;
    });
    var maxVal = Math.max.apply(null, numVals) || 1;

    var h = '<div style="display:flex;flex-direction:column;gap:10px;">';
    rows.forEach(function(r, i) {
      var pct = numVals[i] > 0 ? Math.max(6, Math.round((numVals[i]/maxVal)*100)) : 0;
      var hasBar = pct > 0;
      h += '<div style="display:grid;grid-template-columns:180px 1fr auto;align-items:center;gap:12px;">';
      // Label
      h += '<div style="font-size:.79rem;color:var(--text-secondary);">'+escapeHtml(r.metric||'')+'</div>';
      // Bar
      if (hasBar) {
        h += '<div style="background:rgba(255,255,255,.05);border-radius:4px;height:8px;overflow:hidden;">';
        h += '<div style="width:'+pct+'%;height:100%;background:var(--accent);border-radius:4px;transition:width .4s;opacity:.75;"></div>';
        h += '</div>';
      } else {
        h += '<div style="height:8px;"></div>';
      }
      // Value
      h += '<div style="font-size:.85rem;font-weight:700;color:var(--accent);font-family:var(--font-mono);white-space:nowrap;min-width:60px;text-align:right;">'+escapeHtml(r.value||'')+'</div>';
      h += '</div>';
      if (r.note) h += '<div style="font-size:.68rem;color:var(--text-muted);padding-left:192px;margin-top:-6px;margin-bottom:2px;">'+escapeHtml(r.note)+'</div>';
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
    var colors = ['var(--accent)','var(--blue)','var(--green)','var(--purple)','var(--amber)'];
    var h = '<div style="display:flex;flex-direction:column;gap:12px;">';
    (s.chains||[]).forEach(function(chain, ci) {
      var baseColor = colors[ci % colors.length];
      h += '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px;">';
      chain.forEach(function(e, ei) {
        if (e==='→'||e==='->'||e==='⟹') {
          h += '<div style="display:flex;align-items:center;padding:0 4px;">';
          h += '<svg width="20" height="12" viewBox="0 0 20 12"><path d="M0 6h16M12 1l6 5-6 5" stroke="'+baseColor+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".6"/></svg>';
          h += '</div>';
        } else {
          var isFirst = ei === 0;
          var style = isFirst
            ? 'background:'+baseColor+'15;border:1px solid '+baseColor+'35;color:'+baseColor+';font-weight:600;'
            : 'background:var(--bg-overlay);border:1px solid var(--border);color:var(--text-secondary);';
          h += '<div style="'+style+'border-radius:8px;padding:5px 12px;font-size:.79rem;white-space:nowrap;">'+escapeHtml(e)+'</div>';
        }
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

  distributie: function(s) {
    var uid = 'dist_' + Math.random().toString(36).slice(2,8);
    var distType = s.dist_type || 'normal';
    var annotation = s.annotation || '';
    var description = s.description || '';

    var h = '';
    if (description) h += '<div style="font-size:.83rem;color:var(--text-secondary);line-height:1.65;margin-bottom:14px;">'+escapeHtml(description)+'</div>';

    // Controls
    h += '<div style="display:grid;grid-template-columns:220px 1fr;gap:16px;align-items:start;">';
    h += '<div>';
    h += '<div style="margin-bottom:12px;"><div style="font-size:.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;">Medie μ</div>';
    h += '<div style="display:flex;align-items:center;gap:8px;"><input type="range" id="'+uid+'_mu" min="-3" max="3" step="0.5" value="0" style="flex:1;accent-color:var(--accent);"><span id="'+uid+'_muv" style="font-size:.78rem;font-family:var(--font-mono);color:var(--text-secondary);min-width:28px;">0</span></div></div>';
    h += '<div style="margin-bottom:12px;"><div style="font-size:.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;">Deviație σ</div>';
    h += '<div style="display:flex;align-items:center;gap:8px;"><input type="range" id="'+uid+'_sig" min="0.5" max="3" step="0.5" value="1" style="flex:1;accent-color:var(--accent);"><span id="'+uid+'_sigv" style="font-size:.78rem;font-family:var(--font-mono);color:var(--text-secondary);min-width:28px;">1</span></div></div>';
    h += '<div style="margin-bottom:12px;"><div style="font-size:.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;">Interval a</div>';
    h += '<div style="display:flex;align-items:center;gap:8px;"><input type="range" id="'+uid+'_a" min="-5" max="4" step="0.5" value="-1" style="flex:1;accent-color:var(--accent);"><span id="'+uid+'_av" style="font-size:.78rem;font-family:var(--font-mono);color:var(--text-secondary);min-width:28px;">-1</span></div></div>';
    h += '<div style="margin-bottom:14px;"><div style="font-size:.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;">Interval b</div>';
    h += '<div style="display:flex;align-items:center;gap:8px;"><input type="range" id="'+uid+'_b" min="-4" max="5" step="0.5" value="1" style="flex:1;accent-color:var(--accent);"><span id="'+uid+'_bv" style="font-size:.78rem;font-family:var(--font-mono);color:var(--text-secondary);min-width:28px;">1</span></div></div>';
    // Stats
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
    h += '<div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:9px 11px;"><div style="font-size:.62rem;color:var(--text-muted);margin-bottom:3px;">P[a≤X≤b]</div><div id="'+uid+'_prob" style="font-size:1.1rem;font-weight:700;color:var(--accent);font-family:var(--font-mono);">68.3%</div></div>';
    h += '<div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:9px 11px;"><div style="font-size:.62rem;color:var(--text-muted);margin-bottom:3px;">E[X] = μ</div><div id="'+uid+'_ex" style="font-size:1.1rem;font-weight:700;color:var(--text-secondary);font-family:var(--font-mono);">0</div></div>';
    h += '<div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:9px 11px;"><div style="font-size:.62rem;color:var(--text-muted);margin-bottom:3px;">Var = σ²</div><div id="'+uid+'_var" style="font-size:1.1rem;font-weight:700;color:var(--blue);font-family:var(--font-mono);">1.00</div></div>';
    h += '<div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:9px 11px;"><div style="font-size:.62rem;color:var(--text-muted);margin-bottom:3px;">σ</div><div id="'+uid+'_sd" style="font-size:1.1rem;font-weight:700;color:var(--green);font-family:var(--font-mono);">1.00</div></div>';
    h += '</div></div>';

    // Canvas
    h += '<div>';
    h += '<div style="background:#0d0b10;border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:8px;">';
    h += '<canvas id="'+uid+'_cvPDF" style="display:block;width:100%;height:180px;"></canvas>';
    h += '</div>';
    h += '<div style="background:#0d0b10;border:1px solid var(--border);border-radius:10px;overflow:hidden;">';
    h += '<canvas id="'+uid+'_cvCDF" style="display:block;width:100%;height:120px;"></canvas>';
    h += '</div>';
    if (annotation) h += '<div style="font-size:.75rem;color:var(--text-muted);margin-top:8px;line-height:1.5;">'+escapeHtml(annotation)+'</div>';
    h += '</div></div>';

    // Inline script to init widget after render
    h += '<script>(function(){';
    h += 'function erf(x){var t=1/(1+.3275911*Math.abs(x));var p=t*(.254829592+t*(-.284496736+t*(1.421413741+t*(-1.453152027+t*1.061405429))));var r=1-p*Math.exp(-x*x);return x>=0?r:-r;}';
    h += 'function ncdf(x,m,s){return .5*(1+erf((x-m)/(s*Math.SQRT2)));}';
    h += 'function npdf(x,m,s){return Math.exp(-.5*((x-m)/s)*((x-m)/s))/(s*Math.sqrt(2*Math.PI));}';
    h += 'var uid="'+uid+'";';
    h += 'function draw(){';
    h += 'var mu=+document.getElementById(uid+"_mu").value,sig=+document.getElementById(uid+"_sig").value,a=+document.getElementById(uid+"_a").value,b=+document.getElementById(uid+"_b").value;';
    h += 'document.getElementById(uid+"_muv").textContent=mu;document.getElementById(uid+"_sigv").textContent=sig;document.getElementById(uid+"_av").textContent=a;document.getElementById(uid+"_bv").textContent=b;';
    h += 'document.getElementById(uid+"_ex").textContent=mu;document.getElementById(uid+"_var").textContent=(sig*sig).toFixed(2);document.getElementById(uid+"_sd").textContent=sig.toFixed(2);';
    h += 'var p=ncdf(b,mu,sig)-ncdf(a,mu,sig);document.getElementById(uid+"_prob").textContent=(p*100).toFixed(1)+"%";';
    // PDF canvas
    h += 'var cv=document.getElementById(uid+"_cvPDF");var W=cv.offsetWidth||400,H=180,dpr=window.devicePixelRatio||1;cv.width=W*dpr;cv.height=H*dpr;cv.style.height=H+"px";var ctx=cv.getContext("2d");ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);';
    h += 'var xMin=-7,xMax=7,pL=28,pR=14,pT=12,pB=24,steps=400,dx=(xMax-xMin)/steps,peak=npdf(mu,mu,sig);';
    h += 'var tX=function(x){return pL+(x-xMin)/(xMax-xMin)*(W-pL-pR);};var tY=function(y){return H-pB-y/peak*(H-pT-pB)*.9;};';
    h += 'ctx.strokeStyle="rgba(255,255,255,.04)";ctx.lineWidth=.5;for(var g=-6;g<=6;g+=2){ctx.beginPath();ctx.moveTo(tX(g),pT);ctx.lineTo(tX(g),H-pB);ctx.stroke();}';
    h += 'ctx.strokeStyle="rgba(255,255,255,.1)";ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(pL,H-pB);ctx.lineTo(W-pR,H-pB);ctx.stroke();';
    h += 'ctx.beginPath();ctx.moveTo(tX(a),H-pB);for(var i=0;i<=steps;i++){var xi=xMin+i*dx;if(xi>=a&&xi<=b)ctx.lineTo(tX(xi),tY(npdf(xi,mu,sig)));}ctx.lineTo(tX(b),H-pB);ctx.closePath();ctx.fillStyle="rgba(242,155,109,.2)";ctx.fill();ctx.strokeStyle="rgba(242,155,109,.4)";ctx.lineWidth=1;ctx.stroke();';
    h += 'ctx.beginPath();for(var i=0;i<=steps;i++){var xi=xMin+i*dx,y=npdf(xi,mu,sig);i===0?ctx.moveTo(tX(xi),tY(y)):ctx.lineTo(tX(xi),tY(y));}ctx.strokeStyle="#f29b6d";ctx.lineWidth=2;ctx.stroke();';
    h += '[a,b].forEach(function(xv){ctx.setLineDash([3,3]);ctx.strokeStyle="rgba(242,155,109,.5)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tX(xv),pT);ctx.lineTo(tX(xv),H-pB);ctx.stroke();ctx.setLineDash([]);});';
    h += 'ctx.fillStyle="rgba(150,148,164,.6)";ctx.font="9px Inter,sans-serif";for(var g=-6;g<=6;g+=2)ctx.fillText(g,tX(g)-4,H-pB+13);';
    // CDF canvas
    h += 'var cv2=document.getElementById(uid+"_cvCDF");var W2=cv2.offsetWidth||400,H2=120;cv2.width=W2*dpr;cv2.height=H2*dpr;cv2.style.height=H2+"px";var ctx2=cv2.getContext("2d");ctx2.scale(dpr,dpr);ctx2.clearRect(0,0,W2,H2);';
    h += 'var tY2=function(y){return H2-pB-y*(H2-pT-pB);};';
    h += 'var Fa=ncdf(a,mu,sig),Fb=ncdf(b,mu,sig);';
    h += 'ctx2.fillStyle="rgba(78,203,141,.08)";ctx2.fillRect(tX(a),tY2(Fb),tX(b)-tX(a),tY2(Fa)-tY2(Fb));';
    h += 'ctx2.beginPath();for(var i=0;i<=steps;i++){var xi=xMin+i*dx,y=ncdf(xi,mu,sig);i===0?ctx2.moveTo(tX(xi),tY2(y)):ctx2.lineTo(tX(xi),tY2(y));}ctx2.strokeStyle="#4ecb8d";ctx2.lineWidth=2;ctx2.stroke();';
    h += 'ctx2.strokeStyle="rgba(255,255,255,.1)";ctx2.lineWidth=.8;ctx2.beginPath();ctx2.moveTo(pL,H2-pB);ctx2.lineTo(W2-pR,H2-pB);ctx2.stroke();ctx2.beginPath();ctx2.moveTo(pL,pT);ctx2.lineTo(pL,H2-pB);ctx2.stroke();';
    h += 'ctx2.fillStyle="rgba(150,148,164,.5)";ctx2.font="9px Inter,sans-serif";[0,.25,.5,.75,1].forEach(function(v){ctx2.fillText(v.toFixed(2),2,tY2(v)+3);});';
    h += '}';
    h += 'draw();';
    h += '["'+uid+'_mu","'+uid+'_sig","'+uid+'_a","'+uid+'_b"].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener("input",draw);});';
    h += 'window.addEventListener("resize",function(){setTimeout(draw,50);});';
    h += '})();<\/script>';
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

var QUIZ_SKIP_KINDS = {formule:1,derivare:1,distributie:1,cod:1,glosar:1,autori:1};

function simpleHash(str) {
  var h = 0;
  for (var i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

var SECTION_COLOR = {
  formule:'var(--accent)',derivare:'var(--accent)',complexitate:'var(--red)',
  date_numerice:'var(--amber)',mechanism:'var(--green)',cauza_efect:'var(--blue)',
  comparatie:'var(--blue)',taxonomie:'var(--purple)',protocol:'var(--green)',
  cod:'var(--teal)',conditii:'var(--blue)',articol:'var(--amber)',
  exceptii:'var(--amber)',studii:'var(--purple)',autori:'var(--purple)',
  critici:'var(--purple)',caz:'var(--accent)',ddx:'var(--red)',
  aplicatii:'var(--green)',warnings:'var(--red)',glosar:'var(--accent)',
  distributie:'var(--green)',
};

// ─────────────────────────────────────────────────────────────────
// renderSmartSummaryPage — full scrollable HTML for a smart summary
// ─────────────────────────────────────────────────────────────────
function renderSmartSummaryPage(data) {
  if (!data || !data.output) return '<div style="color:var(--text-muted);padding:32px;text-align:center;">Date lipsă</div>';
  var o = data.output;
  var a = data.analysis || {};

  var h = '<div style="max-width:740px;margin:0 auto;padding:36px 28px 60px;font-family:var(--font-body);">';

  // ── Header ────────────────────────────────────────────────────
  h += '<div style="margin-bottom:8px;">';

  // Difficulty + tags inline, small
  var meta = [];
  if (a.difficulty) {
    var dc = {introductory:'var(--green)',intermediate:'var(--amber)',advanced:'var(--red)'}[a.difficulty]||'var(--text-muted)';
    meta.push('<span style="color:'+dc+';font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">'+escapeHtml(a.difficulty)+'</span>');
  }
  if (o.domain_tags && o.domain_tags.length) {
    o.domain_tags.slice(0,3).forEach(function(t) {
      meta.push('<span style="color:var(--text-muted);font-size:.72rem;">'+escapeHtml(t)+'</span>');
    });
  }
  if (meta.length) h += '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:14px;">' + meta.join('<span style="color:var(--border);font-size:.7rem;">·</span>') + '</div>';

  // Title — big and breathing
  h += '<div style="font-size:1.85rem;font-weight:800;color:var(--text-primary);line-height:1.2;letter-spacing:-.02em;margin-bottom:18px;">' + escapeHtml(o.title||'') + '</div>';

  // Why it matters — pull quote style
  if (o.why_it_matters) {
    h += '<div style="font-size:1rem;color:var(--text-secondary);line-height:1.8;margin-bottom:0;font-weight:400;">' + escapeHtml(o.why_it_matters) + '</div>';
  }
  h += '</div>';

  // Divider
  h += '<div style="height:1px;background:linear-gradient(to right,var(--accent)40,transparent);margin:28px 0;"></div>';

  // ── Prerequisites ───────────────────────────────────────────────
  if (a.prerequisites && a.prerequisites.length) {
    h += '<div style="margin-bottom:32px;">';
    h += '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--blue);margin-bottom:10px;">Înainte să citești, trebuie să știi</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:7px;">';
    a.prerequisites.forEach(function(p) {
      h += '<span style="background:rgba(138,184,216,.08);border:1px solid rgba(138,184,216,.2);border-radius:20px;padding:4px 12px;font-size:.78rem;color:var(--text-secondary);">'+escapeHtml(p)+'</span>';
    });
    h += '</div></div>';
  }

  // ── Layers ────────────────────────────────────────────────────
  if (o.layers && o.layers.length) {
    h += '<div style="margin-bottom:36px;">';
    h += '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:14px;">Trei niveluri de înțelegere</div>';
    var lc = {'Intuitiv':'var(--green)','Conceptual':'var(--blue)','Tehnic':'var(--purple)'};
    o.layers.forEach(function(layer, idx) {
      var c = layer.color || lc[layer.level] || 'var(--accent)';
      h += '<details '+(idx===0?'open':'')+' style="margin-bottom:6px;">';
      h += '<summary style="list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;padding:11px 14px;background:'+c+'09;border-radius:10px;user-select:none;border:1px solid '+c+'1e;">';
      h += '<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:'+c+'20;color:'+c+';border-radius:6px;font-size:.65rem;font-weight:800;flex-shrink:0;">'+(idx+1)+'</span>';
      h += '<span style="font-size:.82rem;font-weight:600;color:'+c+';">'+escapeHtml(layer.level||'')+'</span>';
      h += '<span style="font-size:.7rem;color:var(--text-muted);margin-left:auto;">'+(idx===0?'▲':'▼')+'</span>';
      h += '</summary>';
      h += '<div style="font-size:.87rem;color:var(--text-secondary);line-height:1.78;padding:14px 14px 6px 46px;">'+escapeHtml(layer.text||'')+'</div>';
      h += '</details>';
    });
    h += '</div>';
  }

  // ── Sections — editorial style ────────────────────────────────
  var sections = (o.sections||[]).filter(function(s){ return (s.relevance||1)>0.45; });
  sections.sort(function(a,b){ return (b.relevance||0)-(a.relevance||0); });

  var boxKinds = ['formule','derivare','cod','caz','articol','protocol','complexitate','distributie'];
  var secIdx = 0;
  sections.forEach(function(sec) {
    var c = SECTION_COLOR[sec.kind] || 'var(--text-muted)';
    var renderer = SR[sec.kind] || SR._generic;

    h += '<div style="margin-bottom:32px;" data-sec-idx="'+secIdx+'" data-sec-kind="'+sec.kind+'">';
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">';
    h += '<div style="width:24px;height:2px;background:'+c+';border-radius:2px;flex-shrink:0;"></div>';
    h += '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:'+c+';">'+escapeHtml(sec.title||sec.kind)+'</div>';
    h += '</div>';
    h += renderer(sec);

    if (!QUIZ_SKIP_KINDS[sec.kind]) {
      h += '<div style="margin-top:16px;background:var(--bg-overlay);border:1px solid var(--border);border-radius:10px;padding:12px 16px;">';
      h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">';
      h += '<span style="font-size:.75rem;color:var(--text-muted);">Verifică-ți înțelegerea acestei secțiuni</span>';
      h += '<button data-quiz-trigger="'+secIdx+'" style="background:rgba(242,155,109,.1);border:1px solid rgba(242,155,109,.25);color:var(--accent);border-radius:8px;padding:7px 16px;cursor:pointer;font-size:.79rem;font-weight:600;white-space:nowrap;flex-shrink:0;">? Testează-te</button>';
      h += '</div>';
      h += '<div data-quiz-container="'+secIdx+'" style="display:none;"></div>';
      h += '</div>';
    }

    h += '</div>';
    secIdx++;
  });

  // Divider
  if (sections.length) h += '<div style="height:1px;background:var(--border);margin:8px 0 32px;"></div>';

  // ── Key insight — large pull quote ────────────────────────────
  if (o.key_insight) {
    h += '<div style="margin-bottom:32px;padding:0 16px;">';
    h += '<div style="font-size:1.05rem;color:var(--text-secondary);line-height:1.75;font-style:italic;text-align:center;position:relative;">';
    h += '<span style="color:rgba(242,155,109,.3);font-size:3rem;line-height:1;position:absolute;top:-10px;left:-16px;font-family:Georgia,serif;">"</span>';
    h += escapeHtml(o.key_insight);
    h += '<span style="color:rgba(242,155,109,.3);font-size:3rem;line-height:1;font-family:Georgia,serif;">"</span>';
    h += '</div></div>';
  }

  // ── Pathway ───────────────────────────────────────────────────
  if (o.pathway && o.pathway.length) {
    h += '<div style="margin-bottom:24px;">';
    h += '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:12px;">Traseu conceptual</div>';
    h += '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px;">';
    o.pathway.forEach(function(step, i) {
      var isActive = i === Math.floor(o.pathway.length / 2);
      h += '<div style="padding:5px 12px;border-radius:20px;font-size:.78rem;'+(isActive?'background:rgba(242,155,109,.12);color:var(--accent);border:1px solid rgba(242,155,109,.25);font-weight:600;':'color:var(--text-muted);')+'white-space:nowrap;">'+escapeHtml(step)+'</div>';
      if (i < o.pathway.length-1) h += '<div style="color:var(--border);font-size:.8rem;padding:0 2px;">→</div>';
    });
    h += '</div></div>';
  }

  // ── Learning position — inline, minimal ──────────────────────
  if (a.learning_position) {
    var lp = a.learning_position;
    var has = (lp.requires||[]).length || (lp.leads_to||[]).length;
    if (has) {
      h += '<div style="display:flex;gap:32px;margin-bottom:28px;flex-wrap:wrap;">';
      if ((lp.requires||[]).length) {
        h += '<div><div style="font-size:.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">← Vine după</div>';
        h += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
        lp.requires.forEach(function(r){ h += '<span style="font-size:.76rem;color:var(--text-muted);">'+escapeHtml(r)+'</span>'; });
        h += '</div></div>';
      }
      if ((lp.leads_to||[]).length) {
        h += '<div><div style="font-size:.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">→ Duce spre</div>';
        h += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
        lp.leads_to.forEach(function(l){ h += '<span style="font-size:.76rem;color:var(--text-muted);">'+escapeHtml(l)+'</span>'; });
        h += '</div></div>';
      }
      h += '</div>';
    }
  }

  // ── Ce urmează — single important callout ────────────────────
  if (o.ce_urmeaza) {
    h += '<div style="background:rgba(242,155,109,.06);border-left:3px solid var(--accent);padding:16px 20px;border-radius:0 10px 10px 0;">';
    h += '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--accent);margin-bottom:8px;">Ce vei găsi în documentul complet</div>';
    h += '<div style="font-size:.86rem;color:var(--text-secondary);line-height:1.75;">'+escapeHtml(o.ce_urmeaza)+'</div>';
    h += '</div>';
  }

  // ── Feedback widget ───────────────────────────────────────────
  var summaryId = (window.__summaryPageData && window.__summaryPageData.summaryId) || null;
  h += '<div id="summaryFeedbackWidget" style="margin-top:32px;padding-top:20px;border-top:1px solid var(--border);text-align:center;">';
  h += '<div style="font-size:.78rem;color:var(--text-muted);margin-bottom:10px;">Rezumatul a fost util?</div>';
  h += '<div style="display:flex;gap:10px;justify-content:center;">';
  h += '<button onclick="submitSummaryFeedback(' + JSON.stringify(summaryId) + ', 1, this)" style="padding:8px 20px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-surface);color:var(--text-secondary);font-size:.85rem;cursor:pointer;font-family:inherit;transition:all .15s;">Da, a fost util</button>';
  h += '<button onclick="submitSummaryFeedback(' + JSON.stringify(summaryId) + ', -1, this)" style="padding:8px 20px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-surface);color:var(--text-secondary);font-size:.85rem;cursor:pointer;font-family:inherit;transition:all .15s;">Nu era ce aveam nevoie</button>';
  h += '</div></div>';

  h += '</div>';
  return h;
}

async function submitSummaryFeedback(summaryId, rating, buttonEl) {
  var widget = document.getElementById('summaryFeedbackWidget');
  if (!widget || widget.dataset.voted) return;
  widget.dataset.voted = '1';

  try {
    await authFetch('/api/ai/summary-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ summaryId: summaryId, rating: rating }),
    });
  } catch (e) { /* non-critical */ }

  widget.innerHTML = '<div style="font-size:.82rem;color:var(--text-muted);padding:8px 0;">Mulțumim pentru feedback!</div>';
}

function downloadSummaryAsPrint() {
  var sd = window.__summaryPageData;
  if (!sd || !sd.data) return;

  var summaryHTML = renderSmartSummaryPage(sd.data);

  var printPage = '<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8">' +
    '<title>' + (sd.title || 'Rezumat').replace(/</g,'&lt;') + '</title>' +
    '<style>' +
    '*{box-sizing:border-box;margin:0;padding:0;}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;color:#1a1a2e;}' +
    ':root{' +
      '--text-primary:#1a1a2e;--text-secondary:#3a3a5a;--text-muted:#7878a0;' +
      '--border:#dddde8;--bg-surface:#f5f5fa;--bg-raised:#ededf5;--bg-overlay:#f5f5fa;--bg-base:#fff;' +
      '--accent:#e8895a;--green:#3d9e6e;--blue:#4a78d8;--purple:#8558d8;--amber:#d4901c;--red:#cc4444;' +
      '--font-body:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
      '--radius:10px;--radius-sm:8px;--radius-xs:6px;' +
    '}' +
    /* hide all site-specific interactive elements */
    'div:has([data-quiz-trigger]){display:none!important;}' +
    '[data-quiz-trigger],[data-quiz-container],#summaryFeedbackWidget{display:none!important;}' +
    'details{page-break-inside:avoid;}' +
    '@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}' +
    '</style></head><body>' +
    '<div style="max-width:720px;margin:0 auto;padding:24px 28px 48px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:14px;margin-bottom:20px;border-bottom:2px solid #e8895a;">' +
    '<div style="font-size:.8rem;font-weight:700;color:#3a3a5a;">' + (sd.subjectName || '').replace(/</g,'&lt;') + '</div>' +
    '<div style="font-size:.72rem;color:#aaa;">' + new Date().toLocaleDateString('ro') + '</div>' +
    '</div>' +
    summaryHTML +
    '</div>' +
    '<script>window.onload=function(){window.print();}<\/script>' +
    '</body></html>';

  var win = window.open('', '_blank');
  if (!win) {
    alert('Permite pop-up-urile în browser pentru a descărca rezumatul.');
    return;
  }
  win.document.write(printPage);
  win.document.close();
}

function renderSectionBlock(sec) {
  var c = SECTION_COLOR[sec.kind] || 'var(--text-muted)';
  var renderer = SR[sec.kind] || SR._generic;
  var h = '<div style="margin-bottom:32px;">';
  h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">';
  h += '<div style="width:24px;height:2px;background:'+c+';border-radius:2px;flex-shrink:0;"></div>';
  h += '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:'+c+';">'+escapeHtml(sec.title||sec.kind)+'</div>';
  h += '</div>';
  h += renderer(sec);
  h += '</div>';
  return h;
}

// openSmartSummaryModal redirects to full-page flow
function openSmartSummaryModal(data, title, subjectName, intent) {
  openSummaryPage(data, title, subjectName, intent, '');
}

// ─────────────────────────────────────────────────────────────────
// SECTION QUIZ — on-demand quiz generation per section
// ─────────────────────────────────────────────────────────────────
function renderQuizQuestions(questions, areaIdx) {
  var h = '<div style="border-top:1px solid var(--border);padding-top:14px;display:flex;flex-direction:column;gap:14px;">';
  questions.forEach(function(q, qi) {
    var qKey = areaIdx + '-' + qi;
    h += '<div data-quiz-q="'+qKey+'" style="background:rgba(255,255,255,.025);border:1px solid var(--border);border-radius:10px;padding:14px 16px;">';
    h += '<div style="font-size:.82rem;color:var(--text-primary);font-weight:500;margin-bottom:12px;">'+escapeHtml(q.q||'')+'</div>';
    h += '<div style="display:flex;flex-direction:column;gap:6px;">';
    (q.opts||[]).forEach(function(opt, oi) {
      h += '<button data-quiz-opt="'+qKey+'-'+oi+'" data-correct="'+(oi===q.answer?'1':'0')+'" style="text-align:left;background:var(--bg-overlay);border:1px solid var(--border);border-radius:7px;padding:7px 12px;cursor:pointer;font-size:.79rem;color:var(--text-secondary);">';
      h += '<span style="color:var(--text-muted);font-family:var(--font-mono);margin-right:8px;">'+'abcd'[oi]+')</span>';
      h += escapeHtml(opt);
      h += '</button>';
    });
    h += '</div>';
    h += '<div id="quiz-explain-'+qKey+'" style="display:none;margin-top:10px;font-size:.76rem;color:var(--text-muted);line-height:1.6;padding-left:10px;border-left:2px solid var(--border);">'+escapeHtml(q.explain||'')+'</div>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function initQuizAnswers(container) {
  container.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-quiz-opt]');
    if (!btn) return;

    var parts = btn.dataset.quizOpt.split('-');
    var qKey = parts[0] + '-' + parts[1];
    var qBlock = container.querySelector('[data-quiz-q="'+qKey+'"]');
    if (!qBlock || qBlock.dataset.answered) return;
    qBlock.dataset.answered = '1';

    var isCorrect = btn.dataset.correct === '1';
    qBlock.querySelectorAll('[data-quiz-opt]').forEach(function(optBtn) {
      optBtn.style.cursor = 'default';
      optBtn.disabled = true;
      if (optBtn.dataset.correct === '1') {
        optBtn.style.borderColor = 'var(--green)';
        optBtn.style.background = 'rgba(115,201,166,.1)';
        optBtn.style.color = 'var(--green)';
      } else if (optBtn === btn && !isCorrect) {
        optBtn.style.borderColor = 'var(--red)';
        optBtn.style.background = 'rgba(255,100,100,.08)';
        optBtn.style.color = 'var(--red)';
      }
    });

    var explainEl = document.getElementById('quiz-explain-'+qKey);
    if (explainEl) {
      explainEl.style.display = 'block';
      explainEl.style.borderColor = isCorrect ? 'var(--green)' : 'var(--red)';
    }
  });
}

function initSectionQuiz(contentEl, sections, subjectName, domainCategory, summaryHash) {
  contentEl.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-quiz-trigger]');
    if (!btn) return;

    var idx = parseInt(btn.dataset.quizTrigger, 10);
    var sec = sections[idx];
    if (!sec) return;

    var container = contentEl.querySelector('[data-quiz-container="'+idx+'"]');
    if (!container) return;

    if (container.style.display !== 'none') {
      container.style.display = 'none';
      btn.style.display = 'inline-flex';
      return;
    }

    var cacheKey = 'sq_' + summaryHash + '_' + idx;
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem(cacheKey)); } catch {}
    if (cached && Array.isArray(cached)) {
      container.innerHTML = renderQuizQuestions(cached, idx);
      container.style.display = 'block';
      initQuizAnswers(container);
      btn.style.display = 'none';
      return;
    }

    var origHtml = btn.innerHTML;
    btn.innerHTML = '<span style="color:var(--accent);">⟳</span> Se generează...';
    btn.disabled = true;
    container.innerHTML = '';
    container.style.display = 'block';

    var headers = {'Content-Type':'application/json'};
    if (window.__shAccessToken) headers['Authorization'] = 'Bearer ' + window.__shAccessToken;

    fetch('/api/ai/section-quiz', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        sectionKind: sec.kind,
        sectionTitle: sec.title || sec.kind,
        sectionContent: sec,
        subjectName: subjectName || '',
        domainCategory: domainCategory || 'other',
      }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.error) throw new Error(data.error);
      try { localStorage.setItem(cacheKey, JSON.stringify(data.questions)); } catch {}
      container.innerHTML = renderQuizQuestions(data.questions, idx);
      container.style.display = 'block';
      initQuizAnswers(container);
      btn.style.display = 'none';
    })
    .catch(function() {
      container.innerHTML = '<div style="font-size:.75rem;color:var(--text-muted);padding:10px 0;">Nu am putut genera întrebările. Încearcă din nou.</div>';
      btn.innerHTML = origHtml;
      btn.disabled = false;
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// HIGHLIGHT SYSTEM — text selection + color + localStorage persist
// ─────────────────────────────────────────────────────────────────
function highlightTextInEl(el, text, bg, borderColor) {
  var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  var node;
  while ((node = walker.nextNode())) {
    var idx = node.textContent.indexOf(text);
    if (idx >= 0) {
      var before = node.textContent.substring(0, idx);
      var after  = node.textContent.substring(idx + text.length);
      var mark   = document.createElement('mark');
      mark.style.cssText = 'background:'+bg+';border-radius:3px;padding:0 2px;color:inherit;border-bottom:1.5px solid '+(borderColor||bg)+';';
      mark.textContent = text;
      var frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      frag.appendChild(mark);
      if (after)  frag.appendChild(document.createTextNode(after));
      node.parentNode.replaceChild(frag, node);
      return true;
    }
  }
  return false;
}

function initHighlightSystem(contentEl, storageKey) {
  var saved = [];
  try { saved = JSON.parse(localStorage.getItem('hl_' + storageKey) || '[]'); } catch {}
  saved.forEach(function(hl) {
    try { highlightTextInEl(contentEl, hl.text, hl.bg, hl.border); } catch {}
  });

  var toolbar = null;

  function removeToolbar() {
    if (toolbar) { toolbar.remove(); toolbar = null; }
  }

  function showToolbar(text, rect, range) {
    removeToolbar();
    toolbar = document.createElement('div');
    toolbar.style.cssText = 'position:fixed;z-index:99999;background:var(--bg-raised);border:1px solid var(--border);border-radius:8px;padding:5px 8px;display:flex;align-items:center;gap:5px;box-shadow:0 4px 16px rgba(0,0,0,.5);';
    var top = rect.top - 44;
    if (top < 8) top = rect.bottom + 8;
    toolbar.style.top = top + 'px';
    toolbar.style.left = Math.max(8, rect.left + rect.width/2 - 90) + 'px';

    var colors = [
      {bg:'rgba(255,220,0,.38)', border:'rgba(255,200,0,.7)',  label:'Galben'},
      {bg:'rgba(100,200,150,.35)',border:'rgba(80,190,130,.7)', label:'Verde'},
      {bg:'rgba(255,90,90,.32)', border:'rgba(240,60,60,.65)', label:'Roșu'},
      {bg:'rgba(100,160,230,.32)',border:'rgba(80,140,220,.65)',label:'Albastru'},
    ];

    colors.forEach(function(c) {
      var cBtn = document.createElement('button');
      cBtn.title = c.label;
      cBtn.style.cssText = 'width:20px;height:20px;border-radius:50%;background:'+c.bg+';border:1.5px solid '+c.border+';cursor:pointer;flex-shrink:0;';
      cBtn.addEventListener('mousedown', function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        try {
          var mark = document.createElement('mark');
          mark.style.cssText = 'background:'+c.bg+';border-radius:3px;padding:0 2px;color:inherit;border-bottom:1.5px solid '+c.border+';';
          range.surroundContents(mark);
        } catch {
          highlightTextInEl(contentEl, text, c.bg, c.border);
        }
        saved.push({text: text, bg: c.bg, border: c.border});
        try { localStorage.setItem('hl_' + storageKey, JSON.stringify(saved)); } catch {}
        window.getSelection().removeAllRanges();
        removeToolbar();
      });
      toolbar.appendChild(cBtn);
    });

    var xBtn = document.createElement('button');
    xBtn.textContent = '✕';
    xBtn.style.cssText = 'background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:.7rem;padding:0 3px;';
    xBtn.addEventListener('mousedown', function(ev) { ev.preventDefault(); removeToolbar(); });
    toolbar.appendChild(xBtn);
    document.body.appendChild(toolbar);
  }

  contentEl.addEventListener('mouseup', function() {
    setTimeout(function() {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed) { removeToolbar(); return; }
      var text = sel.toString().trim();
      if (text.length < 3 || text.length > 400) { removeToolbar(); return; }
      if (!contentEl.contains(sel.anchorNode)) { removeToolbar(); return; }
      try {
        var range = sel.getRangeAt(0);
        var rect  = range.getBoundingClientRect();
        showToolbar(text, rect, range);
      } catch { removeToolbar(); }
    }, 20);
  });

  document.addEventListener('mousedown', function(e) {
    if (toolbar && !toolbar.contains(e.target)) removeToolbar();
  });
}

// ─────────────────────────────────────────────────────────────────
// openSummaryPage — navigate to summary as a full app page
// ─────────────────────────────────────────────────────────────────
function openSummaryPage(data, title, subjectName, intent, subjectKey, summaryId) {
  window.__summaryPageData = { data: data, title: title, subjectName: subjectName, intent: intent, summaryId: summaryId || null };

  if (typeof state !== 'undefined') {
    state.activeSummary = {
      subjectKey: subjectKey || '',
      title:      title || '',
      subjectName: subjectName || '',
      intent:     intent || 'understand',
    };
    if (typeof saveState === 'function') saveState();
  }

  if (data && data.output) {
    var o = data.output;
    var a = data.analysis || {};
    window.__activeSummaryContext = {
      title:          o.title || title || '',
      subject:        subjectName || '',
      why:            o.why_it_matters || '',
      insight:        o.key_insight || '',
      prerequisites:  a.prerequisites || [],
      sections:       (o.sections || []).map(function(s){ return s.title || s.kind; }),
      sectionObjects: (o.sections || []).map(function(s){ return { kind: s.kind, title: s.title || s.kind }; }),
      difficulty:     a.difficulty || '',
      intent:         intent || '',
      domain_category: o.domain_category || 'other',
    };
  }

  if (typeof navigateTo === 'function') navigateTo('summary');
}

// ─────────────────────────────────────────────────────────────────
// RIGHT PANEL — tab system + quiz + flashcards + mentor
// ─────────────────────────────────────────────────────────────────
function extractSummaryContext(data) {
  if (!data || !data.output) return '';
  var o = data.output;
  var parts = [];
  if (o.title) parts.push(o.title);
  if (o.why_it_matters) parts.push(o.why_it_matters);
  (o.layers || []).forEach(function(l) { if (l.text) parts.push(l.level + ': ' + l.text); });
  (o.sections || []).forEach(function(s) {
    var t = (s.title || s.kind) + ': ';
    if (s.items) s.items.forEach(function(i) {
      t += typeof i === 'string' ? i + '. ' : (i.text||i.description||i.definition||i.term||'') + '. ';
    });
    if (s.chains) s.chains.forEach(function(c) { t += c.join(' → ') + '. '; });
    if (s.body) t += s.body + '. ';
    if (s.steps) s.steps.forEach(function(st) { t += st + '. '; });
    if (s.rows) s.rows.forEach(function(r) { t += Object.values(r).join(' | ') + '. '; });
    parts.push(t);
  });
  if (o.key_insight) parts.push(o.key_insight);
  return parts.join('\n').substring(0, 4000);
}

function initRightPanel(ctx, domCat, data, subjectName, summaryHash) {
  // ── Tab switching ─────────────────────────────────────────────────
  var tabBar = document.getElementById('smTabBar');
  if (!tabBar) return;

  function activateTab(name) {
    ['mentor','quiz','cards','map','scen'].forEach(function(t) {
      var btn   = document.getElementById('smTab-' + t);
      var panel = document.getElementById('smPanel-' + t);
      var active = t === name;
      if (btn) {
        btn.style.borderBottom = active ? '2px solid var(--accent)' : '2px solid transparent';
        btn.style.color = active ? 'var(--accent)' : 'var(--text-muted)';
        btn.style.fontWeight = active ? '600' : '400';
      }
      if (panel) panel.style.display = active ? (t === 'mentor' ? 'flex' : 'block') : 'none';
    });
  }

  tabBar.addEventListener('click', function(e) {
    var btn = e.target.closest('[id^="smTab-"]');
    if (!btn) return;
    var name = btn.id.replace('smTab-', '');
    activateTab(name);
  });

  // ── Init each panel ───────────────────────────────────────────────
  var filteredSections = (data.output.sections || [])
    .filter(function(s) { return (s.relevance || 1) > 0.45; })
    .sort(function(a, b) { return (b.relevance || 0) - (a.relevance || 0); });

  var summaryCtx = extractSummaryContext(data);
  initMentorPanel(ctx, domCat, summaryHash, filteredSections, subjectName);
  initQuizPanel(summaryCtx, subjectName, summaryHash);
  initFlashcardsPanel(summaryCtx, subjectName, summaryHash);
  initConceptMap(data, summaryHash);
  initScenariosPanel(summaryCtx, subjectName, domCat, summaryHash, ctx);

  // Restore stored integrations + notes from previous sessions
  applyStoredIntegrations(summaryHash);
  renderNotesSection(summaryHash);
}

function initQuizPanel(context, subjectName, summaryHash) {
  var genBtn    = document.getElementById('smQuizGen');
  var countSel  = document.getElementById('smQuizCount');
  var contentEl = document.getElementById('smQuizContent');
  if (!genBtn || !contentEl) return;

  // Restore cached
  function tryLoadCache(count) {
    try {
      var c = JSON.parse(localStorage.getItem('rpq_' + summaryHash + '_' + count) || 'null');
      if (c && c.length) { renderQuizInPanel(c); return true; }
    } catch {}
    return false;
  }

  function renderQuizInPanel(questions) {
    var answered = 0;
    var h = '<div style="display:flex;flex-direction:column;gap:12px;">';
    questions.forEach(function(q, qi) {
      var qk = 'rpq_' + qi;
      h += '<div data-rpq="'+qi+'" style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:10px;padding:12px 14px;">';
      h += '<div style="font-size:.8rem;color:var(--text-primary);font-weight:500;margin-bottom:10px;line-height:1.5;">'+escapeHtml(q.question||q.q||'')+'</div>';
      var opts = q.options || q.opts || [];
      h += '<div style="display:flex;flex-direction:column;gap:5px;">';
      opts.forEach(function(opt, oi) {
        var isCorrect = oi === (q.correct !== undefined ? q.correct : q.answer);
        h += '<button data-rpq-opt="'+qi+'-'+oi+'" data-correct="'+(isCorrect?'1':'0')+'" style="text-align:left;background:var(--bg-raised);border:1px solid var(--border);border-radius:6px;padding:6px 10px;cursor:pointer;font-size:.76rem;color:var(--text-secondary);">'+escapeHtml(typeof opt==='string'?opt:opt.text||'')+'</button>';
      });
      h += '</div>';
      if (q.explanation) h += '<div id="rpqexp-'+qi+'" style="display:none;margin-top:8px;font-size:.73rem;color:var(--text-muted);line-height:1.55;padding-left:8px;border-left:2px solid var(--border);">'+escapeHtml(q.explanation)+'</div>';
      h += '</div>';
    });
    h += '</div>';
    contentEl.innerHTML = h;

    // Answer handler
    contentEl.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-rpq-opt]');
      if (!btn) return;
      var parts = btn.dataset.rpqOpt.split('-');
      var qi = parts[0];
      var qBlock = contentEl.querySelector('[data-rpq="'+qi+'"]');
      if (!qBlock || qBlock.dataset.done) return;
      qBlock.dataset.done = '1';
      qBlock.querySelectorAll('[data-rpq-opt]').forEach(function(b) {
        b.disabled = true; b.style.cursor = 'default';
        if (b.dataset.correct === '1') { b.style.borderColor='var(--green)'; b.style.color='var(--green)'; b.style.background='rgba(115,201,166,.1)'; }
        else if (b === btn) { b.style.borderColor='var(--red)'; b.style.color='var(--red)'; }
      });
      var exp = document.getElementById('rpqexp-'+qi);
      if (exp) { exp.style.display='block'; exp.style.borderColor = btn.dataset.correct==='1'?'var(--green)':'var(--red)'; }
    });
  }

  genBtn.addEventListener('click', function() {
    var count = parseInt(countSel.value, 10) || 10;
    if (tryLoadCache(count)) return;

    genBtn.disabled = true; genBtn.textContent = '⟳ ...';
    contentEl.innerHTML = '<div style="font-size:.75rem;color:var(--text-muted);padding:10px 0;">Se generează ' + count + ' întrebări...</div>';

    var headers = {'Content-Type':'application/json'};
    if (window.__shAccessToken) headers['Authorization'] = 'Bearer ' + window.__shAccessToken;

    fetch('/api/ai/quiz', {
      method:'POST', headers: headers,
      body: JSON.stringify({ subjectName: subjectName||'', context: context, count: count, type: 'grile' }),
    })
    .then(function(r){return r.json();})
    .then(function(d){
      if (d.error) throw new Error(d.error);
      var qs = d.questions || [];
      try { localStorage.setItem('rpq_'+summaryHash+'_'+count, JSON.stringify(qs)); } catch {}
      renderQuizInPanel(qs);
    })
    .catch(function(e){
      contentEl.innerHTML = '<div style="font-size:.75rem;color:var(--red);padding:10px 0;">'+escapeHtml(e.message)+'</div>';
    })
    .finally(function(){ genBtn.disabled=false; genBtn.textContent='Generează'; });
  });
}

function initFlashcardsPanel(context, subjectName, summaryHash) {
  var genBtn    = document.getElementById('smCardsGen');
  var countSel  = document.getElementById('smCardsCount');
  var contentEl = document.getElementById('smCardsContent');
  if (!genBtn || !contentEl) return;

  var cards = [], current = 0, flipped = false;

  function tryLoadCache(count) {
    try {
      var c = JSON.parse(localStorage.getItem('rpf_'+summaryHash+'_'+count)||'null');
      if (c && c.length) { cards = c; current = 0; renderCard(); return true; }
    } catch {}
    return false;
  }

  function renderCard() {
    if (!cards.length) return;
    flipped = false;
    var card = cards[current];
    var h = '<div style="display:flex;flex-direction:column;gap:10px;">';
    h += '<div style="font-size:.72rem;color:var(--text-muted);text-align:center;">' + (current+1) + ' / ' + cards.length + '</div>';
    h += '<div id="rpfCard" style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:12px;padding:20px 16px;min-height:120px;display:flex;align-items:center;justify-content:center;cursor:pointer;text-align:center;">';
    h += '<div style="font-size:.85rem;color:var(--text-primary);line-height:1.6;">'+escapeHtml(card.front||card.question||'')+'</div>';
    h += '</div>';
    h += '<div style="font-size:.72rem;color:var(--text-muted);text-align:center;">Click pe card pentru răspuns</div>';
    h += '<div style="display:flex;gap:8px;justify-content:center;">';
    h += '<button id="rpfPrev" style="background:var(--bg-overlay);border:1px solid var(--border);color:var(--text-secondary);border-radius:7px;padding:6px 14px;cursor:pointer;font-size:.78rem;"'+(current===0?' disabled':'')+'">← Anterior</button>';
    h += '<button id="rpfNext" style="background:var(--bg-overlay);border:1px solid var(--border);color:var(--text-secondary);border-radius:7px;padding:6px 14px;cursor:pointer;font-size:.78rem;"'+(current===cards.length-1?' disabled':'')+'>Următor →</button>';
    h += '</div></div>';
    contentEl.innerHTML = h;

    document.getElementById('rpfCard').addEventListener('click', function() {
      flipped = !flipped;
      var cardEl = document.getElementById('rpfCard');
      if (!cardEl) return;
      var content = flipped
        ? '<div style="font-size:.85rem;color:var(--accent);line-height:1.6;">'+escapeHtml(cards[current].back||cards[current].answer||'')+'</div>'
        : '<div style="font-size:.85rem;color:var(--text-primary);line-height:1.6;">'+escapeHtml(cards[current].front||cards[current].question||'')+'</div>';
      cardEl.innerHTML = content;
      cardEl.style.borderColor = flipped ? 'rgba(242,155,109,.4)' : 'var(--border)';
    });

    var prevBtn = document.getElementById('rpfPrev');
    var nextBtn = document.getElementById('rpfNext');
    if (prevBtn) prevBtn.addEventListener('click', function() { if (current>0){current--;renderCard();} });
    if (nextBtn) nextBtn.addEventListener('click', function() { if (current<cards.length-1){current++;renderCard();} });
  }

  genBtn.addEventListener('click', function() {
    var count = parseInt(countSel.value, 10) || 10;
    if (tryLoadCache(count)) return;

    genBtn.disabled = true; genBtn.textContent = '⟳ ...';
    contentEl.innerHTML = '<div style="font-size:.75rem;color:var(--text-muted);padding:10px 0;">Se generează ' + count + ' flashcard-uri...</div>';

    var headers = {'Content-Type':'application/json'};
    if (window.__shAccessToken) headers['Authorization'] = 'Bearer ' + window.__shAccessToken;

    fetch('/api/ai/flashcards', {
      method:'POST', headers:headers,
      body: JSON.stringify({ subjectName: subjectName||'', context: context, count: count }),
    })
    .then(function(r){return r.json();})
    .then(function(d){
      if (d.error) throw new Error(d.error);
      cards = d.flashcards || [];
      current = 0;
      try { localStorage.setItem('rpf_'+summaryHash+'_'+count, JSON.stringify(cards)); } catch {}
      renderCard();
    })
    .catch(function(e){
      contentEl.innerHTML = '<div style="font-size:.75rem;color:var(--red);padding:10px 0;">'+escapeHtml(e.message)+'</div>';
    })
    .finally(function(){ genBtn.disabled=false; genBtn.textContent='Generează'; });
  });
}

// ─────────────────────────────────────────────────────────────────
// CONVERSAȚIE → REZUMAT — notes + integration system
// ─────────────────────────────────────────────────────────────────
function renderNotesSection(summaryHash) {
  var container = document.getElementById('summaryPageContent');
  if (!container) return;
  var existing = document.getElementById('smNotesSection');
  if (existing) existing.remove();

  var notes = [];
  try { notes = JSON.parse(localStorage.getItem('sumnotes_' + summaryHash) || '[]'); } catch {}
  if (!notes.length) return;

  var section = document.createElement('div');
  section.id = 'smNotesSection';
  section.style.cssText = 'padding:0 28px 32px;';

  var h = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">';
  h += '<div style="width:24px;height:2px;background:var(--blue);border-radius:2px;flex-shrink:0;"></div>';
  h += '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--blue);">Notele mele din conversație</div>';
  h += '</div>';
  notes.forEach(function(note) {
    h += '<div style="background:rgba(138,184,216,.06);border:1px solid rgba(138,184,216,.15);border-radius:10px;padding:12px 14px;margin-bottom:10px;">';
    h += '<div style="font-size:.72rem;font-weight:600;color:var(--blue);margin-bottom:5px;">Q: ' + escapeHtml((note.question||'').substring(0,120)) + ((note.question||'').length>120?'…':'') + '</div>';
    h += '<div style="font-size:.79rem;color:var(--text-secondary);line-height:1.65;">' + escapeHtml(note.answer||'') + '</div>';
    h += '</div>';
  });
  section.innerHTML = h;
  container.appendChild(section);
}

function applyStoredIntegrations(summaryHash) {
  var integrations = [];
  try { integrations = JSON.parse(localStorage.getItem('smintegrations_' + summaryHash) || '[]'); } catch {}
  integrations.forEach(function(intg) {
    var sectionEl = document.querySelector('[data-sec-kind="' + intg.sectionKind + '"]');
    if (sectionEl && !sectionEl.querySelector('[data-integration]')) {
      var div = document.createElement('div');
      div.setAttribute('data-integration', '1');
      div.style.cssText = 'margin-top:10px;padding:8px 12px;background:rgba(242,155,109,.06);border-left:2px solid var(--accent);border-radius:0 6px 6px 0;font-size:.79rem;color:var(--text-secondary);line-height:1.65;';
      div.innerHTML = '<span style="font-size:.62rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:4px;">Din conversația ta</span>' + escapeHtml(intg.addition);
      sectionEl.appendChild(div);
    }
  });
}

function showIntegrationBanner(sectionKind, sectionTitle, addition, noteId, summaryHash) {
  var container = document.getElementById('summaryPageContent');
  if (!container) return;
  var existing = document.getElementById('smIntegrateBanner');
  if (existing) existing.remove();

  var banner = document.createElement('div');
  banner.id = 'smIntegrateBanner';
  banner.style.cssText = 'position:sticky;top:0;z-index:50;background:var(--bg-raised);border:1px solid rgba(242,155,109,.3);border-radius:10px;padding:10px 14px;margin:8px 28px;display:flex;align-items:center;gap:10px;box-shadow:0 2px 12px rgba(0,0,0,.2);';
  banner.innerHTML = '<div style="flex:1;font-size:.78rem;color:var(--text-secondary);line-height:1.45;">💡 Se leagă de secțiunea <strong style="color:var(--text-primary);">' + escapeHtml(sectionTitle) + '</strong>. Integrezi în scaffold?</div>'
    + '<button id="smBannerOk" style="background:rgba(242,155,109,.15);border:1px solid rgba(242,155,109,.3);color:var(--accent);border-radius:7px;padding:5px 12px;cursor:pointer;font-size:.74rem;font-weight:600;white-space:nowrap;flex-shrink:0;">Integrează</button>'
    + '<button id="smBannerNo" style="background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:.74rem;padding:5px 8px;white-space:nowrap;">Lasă în Note</button>';

  container.insertBefore(banner, container.firstChild);

  var timeout = setTimeout(function() { if (banner.parentNode) banner.remove(); }, 30000);

  document.getElementById('smBannerOk').addEventListener('click', function() {
    clearTimeout(timeout); banner.remove();
    // Append to section in DOM
    var sectionEl = document.querySelector('[data-sec-kind="' + sectionKind + '"]');
    if (sectionEl) {
      var div = document.createElement('div');
      div.setAttribute('data-integration', '1');
      div.style.cssText = 'margin-top:10px;padding:8px 12px;background:rgba(242,155,109,.06);border-left:2px solid var(--accent);border-radius:0 6px 6px 0;font-size:.79rem;color:var(--text-secondary);line-height:1.65;';
      div.innerHTML = '<span style="font-size:.62rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:4px;">Din conversația ta</span>' + escapeHtml(addition);
      sectionEl.appendChild(div);
    }
    // Save integration
    var integrations = [];
    try { integrations = JSON.parse(localStorage.getItem('smintegrations_' + summaryHash) || '[]'); } catch {}
    integrations.push({ sectionKind: sectionKind, sectionTitle: sectionTitle, addition: addition, timestamp: Date.now() });
    try { localStorage.setItem('smintegrations_' + summaryHash, JSON.stringify(integrations)); } catch {}
    // Remove note
    var notes = [];
    try { notes = JSON.parse(localStorage.getItem('sumnotes_' + summaryHash) || '[]'); } catch {}
    notes = notes.filter(function(n) { return n.id !== noteId; });
    try { localStorage.setItem('sumnotes_' + summaryHash, JSON.stringify(notes)); } catch {}
    renderNotesSection(summaryHash);
  });

  document.getElementById('smBannerNo').addEventListener('click', function() {
    clearTimeout(timeout); banner.remove();
  });
}

function addToSummaryNotes(question, answer, summaryHash, sections, subjectName) {
  var notes = [];
  try { notes = JSON.parse(localStorage.getItem('sumnotes_' + summaryHash) || '[]'); } catch {}
  var note = { id: 'n_' + Date.now(), question: question, answer: answer, timestamp: Date.now() };
  notes.push(note);
  try { localStorage.setItem('sumnotes_' + summaryHash, JSON.stringify(notes)); } catch {}
  renderNotesSection(summaryHash);

  // Background: propose integration
  var headers = { 'Content-Type': 'application/json' };
  if (window.__shAccessToken) headers['Authorization'] = 'Bearer ' + window.__shAccessToken;
  var sectionData = (sections || []).map(function(s) { return { kind: s.kind, title: s.title || s.kind }; });

  fetch('/api/ai/summary-integrate', {
    method: 'POST', headers: headers,
    body: JSON.stringify({ question: question, answer: answer, sections: sectionData, subjectName: subjectName || '' }),
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.match && d.sectionKind && d.addition) {
      showIntegrationBanner(d.sectionKind, d.sectionTitle || d.sectionKind, d.addition, note.id, summaryHash);
    }
  })
  .catch(function() {});
}

// ─────────────────────────────────────────────────────────────────
// SCENARIO-BASED LEARNING
// ─────────────────────────────────────────────────────────────────
function initScenariosPanel(context, subjectName, domCat, summaryHash, summaryCtx) {
  var genBtn    = document.getElementById('smScenGen');
  var container = document.getElementById('smScenContent');
  if (!genBtn || !container) return;

  var scenarios = [], current = 0;

  function tryLoadCache() {
    try {
      var c = JSON.parse(localStorage.getItem('rpsc_' + summaryHash) || 'null');
      if (c && c.length) { scenarios = c; current = 0; renderScenario(); genBtn.style.display = 'none'; return true; }
    } catch {}
    return false;
  }

  function renderScenario() {
    var sc = scenarios[current];
    if (!sc) return;
    var h = '<div style="font-size:.68rem;color:var(--text-muted);text-align:right;margin-bottom:10px;">Scenariul ' + (current+1) + ' din ' + scenarios.length + '</div>';

    // Situation card
    h += '<div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:10px;padding:13px 14px;margin-bottom:12px;">';
    h += '<div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--blue);margin-bottom:7px;">Situație</div>';
    h += '<div style="font-size:.8rem;color:var(--text-secondary);line-height:1.7;">' + escapeHtml(sc.situation||'') + '</div>';
    h += '</div>';

    // Task
    h += '<div style="font-size:.79rem;font-weight:600;color:var(--text-primary);margin-bottom:8px;line-height:1.5;">' + escapeHtml(sc.task||'') + '</div>';

    // Hint
    if (sc.hint) {
      h += '<div style="font-size:.71rem;color:var(--accent);background:rgba(242,155,109,.07);border-radius:7px;padding:5px 10px;margin-bottom:10px;">💡 ' + escapeHtml(sc.hint) + '</div>';
    }

    // Answer textarea
    h += '<textarea id="smScenAnswer" placeholder="Scrie răspunsul tău aici..." rows="5" style="width:100%;box-sizing:border-box;background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:9px 11px;font-size:.79rem;color:var(--text-primary);resize:vertical;font-family:inherit;outline:none;margin-bottom:10px;"></textarea>';
    h += '<button id="smScenSubmit" style="background:var(--accent);border:none;color:#fff;border-radius:8px;padding:8px 18px;cursor:pointer;font-size:.79rem;font-weight:600;width:100%;">Evaluează răspunsul</button>';
    h += '<div id="smScenEval" style="display:none;margin-top:12px;"></div>';

    container.innerHTML = h;

    document.getElementById('smScenSubmit').addEventListener('click', function() {
      var answer = (document.getElementById('smScenAnswer') || {}).value || '';
      if (answer.trim().length < 5) return;
      evaluateScenario(sc, answer.trim());
    });
  }

  async function evaluateScenario(sc, answer) {
    var evalEl  = document.getElementById('smScenEval');
    var submitBtn = document.getElementById('smScenSubmit');
    var answerEl  = document.getElementById('smScenAnswer');
    if (!evalEl) return;

    submitBtn.disabled = true; submitBtn.textContent = '⟳ Se evaluează...';
    if (answerEl) answerEl.disabled = true;
    evalEl.style.display = 'block';
    evalEl.innerHTML = '<div style="font-size:.75rem;color:var(--text-muted);">Se generează evaluarea...</div>';

    var sysPrompt = 'Ești un profesor evaluator pentru materia ' + (subjectName||'') + '.\n';
    if (summaryCtx) {
      if (summaryCtx.title)   sysPrompt += 'Fișa: "' + summaryCtx.title + '"\n';
      if (summaryCtx.insight) sysPrompt += 'Ideea centrală: ' + summaryCtx.insight + '\n';
    }
    sysPrompt += '\nEvaluezi răspunsul unui student la un scenariu practic. Fii specific și constructiv în max 5 propoziții: ce a prins bine, ce lipsește, explicație scurtă. Răspunde în română.';

    var headers = { 'Content-Type': 'application/json' };
    if (window.__shAccessToken) headers['Authorization'] = 'Bearer ' + window.__shAccessToken;

    try {
      var res = await fetch('/api/ai/chat', {
        method: 'POST', headers: headers,
        body: JSON.stringify({
          system: sysPrompt,
          messages: [{ role: 'user', content: 'Scenariu: ' + sc.situation + '\nÎntrebare: ' + sc.task + '\n\nRăspunsul meu: ' + answer }],
          max_tokens: 600,
        }),
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error);
      var evaluation = data.content || data.response || '';

      var evalH = '<div style="background:rgba(115,201,166,.07);border:1px solid rgba(115,201,166,.2);border-radius:10px;padding:12px 14px;">';
      evalH += '<div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--green);margin-bottom:7px;">Evaluare</div>';
      evalH += '<div style="font-size:.79rem;color:var(--text-secondary);line-height:1.7;white-space:pre-wrap;">' + escapeHtml(evaluation) + '</div>';
      evalH += '</div>';

      if (current < scenarios.length - 1) {
        evalH += '<button id="smScenNext" style="margin-top:12px;background:var(--bg-overlay);border:1px solid var(--border);color:var(--text-secondary);border-radius:8px;padding:8px 16px;cursor:pointer;font-size:.78rem;width:100%;">Scenariul următor →</button>';
      } else {
        evalH += '<div style="margin-top:12px;text-align:center;font-size:.78rem;color:var(--green);font-weight:600;">✓ Ai completat toate scenariile!</div>';
        evalH += '<button id="smScenReset" style="margin-top:8px;background:transparent;border:1px solid var(--border);color:var(--text-muted);border-radius:7px;padding:6px 14px;cursor:pointer;font-size:.74rem;width:100%;">Regenerează scenarii noi</button>';
      }
      evalEl.innerHTML = evalH;

      var nextBtn = document.getElementById('smScenNext');
      if (nextBtn) nextBtn.addEventListener('click', function() { current++; renderScenario(); });

      var resetBtn = document.getElementById('smScenReset');
      if (resetBtn) resetBtn.addEventListener('click', function() {
        try { localStorage.removeItem('rpsc_' + summaryHash); } catch {}
        scenarios = []; current = 0;
        container.innerHTML = '';
        genBtn.style.display = 'block';
      });
    } catch(e) {
      evalEl.innerHTML = '<div style="font-size:.75rem;color:var(--red);">' + escapeHtml(e.message) + '</div>';
      submitBtn.disabled = false; submitBtn.textContent = 'Evaluează răspunsul';
      if (answerEl) answerEl.disabled = false;
    }
  }

  genBtn.addEventListener('click', function() {
    if (tryLoadCache()) return;
    genBtn.disabled = true; genBtn.textContent = '⟳ Se generează...';
    container.innerHTML = '<div style="font-size:.75rem;color:var(--text-muted);padding:8px 0;">Se generează 3 scenarii...</div>';

    var headers = { 'Content-Type': 'application/json' };
    if (window.__shAccessToken) headers['Authorization'] = 'Bearer ' + window.__shAccessToken;

    fetch('/api/ai/scenarios', {
      method: 'POST', headers: headers,
      body: JSON.stringify({ subjectName: subjectName||'', context: context||'', count: 3, domainCategory: domCat||'other' }),
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.error) throw new Error(d.error);
      scenarios = d.scenarios || [];
      current = 0;
      try { localStorage.setItem('rpsc_' + summaryHash, JSON.stringify(scenarios)); } catch {}
      genBtn.style.display = 'none';
      renderScenario();
    })
    .catch(function(e) {
      container.innerHTML = '<div style="font-size:.75rem;color:var(--red);padding:8px 0;">' + escapeHtml(e.message) + '</div>';
      genBtn.disabled = false; genBtn.textContent = 'Generează scenarii';
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// CONCEPT MAP — SVG graph from structural sections
// ─────────────────────────────────────────────────────────────────
function initConceptMap(data, summaryHash) {
  var container = document.getElementById('smMapContent');
  if (!container || !data || !data.output) return;

  // Extract nodes + edges from structural sections
  var nodes = [], edges = [];
  var nodeIndex = {};
  var o = data.output;

  function addNode(label, kind) {
    if (nodeIndex[label] !== undefined) return nodeIndex[label];
    var id = nodes.length;
    nodes.push({ id: id, label: label, kind: kind || 'default' });
    nodeIndex[label] = id;
    return id;
  }

  // Central node = summary title
  var centerId = addNode(o.title || 'Concept central', 'center');

  // Pathway nodes chained from center
  (o.pathway || []).forEach(function(step, i) {
    var nid = addNode(step, 'pathway');
    if (i === 0) edges.push({ from: centerId, to: nid, label: '' });
    else edges.push({ from: nodeIndex[o.pathway[i-1]], to: nid, label: '' });
  });

  // Sections: cauza_efect chains
  (o.sections || []).forEach(function(s) {
    if (s.kind === 'cauza_efect') {
      (s.chains || []).forEach(function(chain) {
        var prev = null;
        chain.forEach(function(el) {
          if (el === '→' || el === '->' || el === '⟹') return;
          var nid = addNode(el.length > 30 ? el.substring(0,28)+'…' : el, 'cauza');
          if (prev !== null) edges.push({ from: prev, to: nid, label: '→' });
          prev = nid;
        });
      });
    }
    if (s.kind === 'comparatie') {
      var aId = addNode(s.label_a || 'A', 'comp');
      var bId = addNode(s.label_b || 'B', 'comp');
      edges.push({ from: centerId, to: aId, label: 'vs' });
      edges.push({ from: centerId, to: bId, label: 'vs' });
    }
    if (s.kind === 'taxonomie') {
      (s.items || []).slice(0, 5).forEach(function(item) {
        var nid = addNode(item.name || '', 'taxo');
        edges.push({ from: centerId, to: nid, label: 'include' });
      });
    }
    if (s.kind === 'mechanism') {
      (s.items || []).forEach(function(item) {
        var nid = addNode(item.level || '', 'mech');
        edges.push({ from: centerId, to: nid, label: item.level || '' });
      });
    }
  });

  if (nodes.length <= 1) {
    container.innerHTML = '<div style="font-size:.78rem;color:var(--text-muted);padding:8px 0;line-height:1.6;">Fișa nu conține secțiuni structurale suficiente pentru o hartă (cauza_efect, comparatie, taxonomie).</div>';
    return;
  }

  // Simple force-directed layout (iterative)
  var W = 330, H = 320;
  var pos = nodes.map(function(n, i) {
    var angle = (i / nodes.length) * 2 * Math.PI;
    return n.id === 0
      ? { x: W/2, y: H/2 }
      : { x: W/2 + (W*0.35) * Math.cos(angle), y: H/2 + (H*0.35) * Math.sin(angle) };
  });

  // 80 iterations of simple spring layout
  for (var iter = 0; iter < 80; iter++) {
    var forces = pos.map(function() { return { fx: 0, fy: 0 }; });
    // Repulsion
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i+1; j < nodes.length; j++) {
        var dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y;
        var dist = Math.max(Math.sqrt(dx*dx+dy*dy), 1);
        var rep = 2200 / (dist*dist);
        forces[i].fx += rep*dx/dist; forces[i].fy += rep*dy/dist;
        forces[j].fx -= rep*dx/dist; forces[j].fy -= rep*dy/dist;
      }
    }
    // Attraction along edges
    edges.forEach(function(e) {
      var dx = pos[e.to].x - pos[e.from].x, dy = pos[e.to].y - pos[e.from].y;
      var dist = Math.max(Math.sqrt(dx*dx+dy*dy), 1);
      var att = (dist - 80) * 0.05;
      forces[e.from].fx += att*dx/dist; forces[e.from].fy += att*dy/dist;
      forces[e.to].fx   -= att*dx/dist; forces[e.to].fy   -= att*dy/dist;
    });
    // Apply + clamp
    pos.forEach(function(p, i) {
      if (i === 0) return; // center fixed
      p.x = Math.max(40, Math.min(W-40, p.x + forces[i].fx * 0.3));
      p.y = Math.max(24, Math.min(H-24, p.y + forces[i].fy * 0.3));
    });
  }

  // Color per kind
  var kindColor = {
    center:'var(--accent)', pathway:'var(--blue)', cauza:'var(--green)',
    comp:'var(--purple)', taxo:'var(--amber)', mech:'var(--teal)', default:'var(--text-muted)'
  };

  // Build SVG
  var svg = '<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block;">';

  // Edges
  edges.forEach(function(e) {
    var x1=pos[e.from].x, y1=pos[e.from].y, x2=pos[e.to].x, y2=pos[e.to].y;
    svg += '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="rgba(255,255,255,.12)" stroke-width="1.5" marker-end="url(#arr)"/>';
  });

  // Arrow marker
  svg += '<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="rgba(255,255,255,.2)"/></marker></defs>';

  // Nodes
  nodes.forEach(function(n, i) {
    var x = pos[i].x, y = pos[i].y;
    var col = kindColor[n.kind] || 'var(--text-muted)';
    var isCenter = n.kind === 'center';
    var r = isCenter ? 22 : 14;
    var label = n.label.length > 18 ? n.label.substring(0,16)+'…' : n.label;
    svg += '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+col+'22" stroke="'+col+'" stroke-width="'+(isCenter?2:1.5)+'"/>';
    svg += '<text x="'+x+'" y="'+(y-r-5)+'" text-anchor="middle" font-size="'+(isCenter?8:7)+'" fill="'+col+'" font-family="Inter,sans-serif">'+escapeHtml(label)+'</text>';
  });

  svg += '</svg>';

  // Legend
  var legend = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">';
  var used = {};
  nodes.forEach(function(n) { used[n.kind] = kindColor[n.kind]; });
  var labels = {center:'Central',pathway:'Traseu',cauza:'Cauza-Efect',comp:'Comparație',taxo:'Taxonomie',mech:'Mecanism'};
  Object.keys(used).forEach(function(k) {
    if (k === 'default') return;
    legend += '<span style="font-size:.62rem;color:'+used[k]+';display:flex;align-items:center;gap:3px;"><span style="width:8px;height:8px;border-radius:50%;background:'+used[k]+'22;border:1px solid '+used[k]+';display:inline-block;"></span>'+escapeHtml(labels[k]||k)+'</span>';
  });
  legend += '</div>';

  // Click on node → scroll to section
  container.innerHTML = svg + legend;

  // Add click handlers to scroll left panel
  container.querySelector('svg').addEventListener('click', function(e) {
    var svgEl = e.currentTarget;
    var rect = svgEl.getBoundingClientRect();
    var scaleX = W / rect.width;
    var cx = (e.clientX - rect.left) * scaleX;
    var cy = (e.clientY - rect.top) * scaleX;
    pos.forEach(function(p, i) {
      var dx = cx-p.x, dy = cy-p.y;
      if (Math.sqrt(dx*dx+dy*dy) < 22) {
        var n = nodes[i];
        var secEl = document.querySelector('[data-sec-kind="'+n.kind+'"]');
        if (secEl) secEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// INLINE MENTOR PANEL — helpers
// ─────────────────────────────────────────────────────────────────
function buildSummaryMentorSystem(ctx) {
  if (!ctx) return 'Ești un asistent de studiu. Răspunde în română.';
  return 'Ești AI Mentorul pentru fișa de studiu: "' + ctx.title + '"\n'
    + 'Materie: ' + ctx.subject + '\n'
    + (ctx.why ? 'Relevanță: ' + ctx.why + '\n' : '')
    + (ctx.sections && ctx.sections.length ? 'Secțiuni din fișă: ' + ctx.sections.join(', ') + '\n' : '')
    + (ctx.insight ? 'Insight cheie: ' + ctx.insight + '\n' : '')
    + 'Ajuți studentul să înțeleagă profund conținutul fișei. Faci referință la conceptele specifice. Răspunzi în română.';
}

function getSummaryQuickPrompts(ctx, domainCategory) {
  var base = ctx && ctx.title ? 'Explică-mi "' + ctx.title + '" cu un exemplu concret.' : 'Dă-mi un exemplu concret.';
  var domain = {
    exact_sciences: ['Rezolvă un exercițiu similar.', 'Unde apare asta în realitate?', base],
    social_sciences: ['Dă-mi un caz real din practică.', 'Care sunt criticile principale?', base],
    law:            ['Dă-mi o speță juridică.', 'Care sunt excepțiile?', base],
    medicine:       ['Dă-mi un caz clinic.', 'Care e mecanismul fiziopatologic?', base],
    cs:             ['Scrie cod care ilustrează asta.', 'Care e complexitatea?', base],
    humanities:     ['Care e contextul istoric?', 'Cum se compară cu alte teorii?', base],
  };
  return (domain[domainCategory] || [base, 'De ce contează asta?', 'Explică mai simplu.']).slice(0, 3);
}

function initMentorPanel(ctx, domainCategory, summaryHash, sections, subjectName) {
  var chatEl     = document.getElementById('smChat');
  var inputEl    = document.getElementById('smInput');
  var sendBtn    = document.getElementById('smSend');
  var promptsEl  = document.getElementById('smQuickPrompts');
  if (!chatEl || !inputEl || !sendBtn) return;

  var messages = [];
  var busy = false;
  var lastUserMsg = '';
  var systemPrompt = buildSummaryMentorSystem(ctx);

  function appendMsg(role, text) {
    messages.push({ role: role, content: text });
    var wrapper = document.createElement('div');

    var div = document.createElement('div');
    div.style.cssText = role === 'user'
      ? 'font-size:.82rem;color:var(--text-primary);background:rgba(242,155,109,.1);border:1px solid rgba(242,155,109,.15);border-radius:10px 10px 4px 10px;padding:9px 13px;margin-left:24px;line-height:1.6;'
      : 'font-size:.82rem;color:var(--text-secondary);line-height:1.7;background:var(--bg-overlay);border:1px solid var(--border);border-radius:10px 10px 10px 4px;padding:10px 13px;white-space:pre-wrap;';
    div.textContent = text;
    wrapper.appendChild(div);

    if (role === 'assistant' && summaryHash && lastUserMsg) {
      var addBtn = document.createElement('button');
      addBtn.textContent = '+ Adaugă la fișă';
      addBtn.style.cssText = 'display:block;margin-top:5px;margin-left:2px;background:transparent;border:1px solid var(--border);color:var(--text-muted);border-radius:6px;padding:3px 10px;cursor:pointer;font-size:.69rem;transition:color .15s,border-color .15s;';
      var capturedQ = lastUserMsg;
      var capturedA = text;
      addBtn.addEventListener('click', function() {
        addBtn.textContent = '✓ Adăugat';
        addBtn.disabled = true;
        addBtn.style.color = 'var(--green)';
        addBtn.style.borderColor = 'var(--green)';
        addToSummaryNotes(capturedQ, capturedA, summaryHash, sections, subjectName);
      });
      wrapper.appendChild(addBtn);
    }

    chatEl.appendChild(wrapper);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    lastUserMsg = text;
    if (promptsEl) promptsEl.style.display = 'none';
    inputEl.value = '';
    appendMsg('user', text);

    var loadDiv = document.createElement('div');
    loadDiv.style.cssText = 'font-size:.75rem;color:var(--text-muted);padding:6px 4px;display:flex;align-items:center;gap:6px;';
    loadDiv.innerHTML = '<span style="animation:spin 1s linear infinite;display:inline-block;">⟳</span> Generez răspuns...';
    chatEl.appendChild(loadDiv);
    chatEl.scrollTop = chatEl.scrollHeight;

    var headers = { 'Content-Type': 'application/json' };
    if (window.__shAccessToken) headers['Authorization'] = 'Bearer ' + window.__shAccessToken;

    try {
      var res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ system: systemPrompt, messages: messages.slice(), max_tokens: 1200 }),
      });
      var data = await res.json();
      chatEl.removeChild(loadDiv);
      if (data.error) throw new Error(data.error);
      appendMsg('assistant', data.content || data.response || '');
    } catch(e) {
      chatEl.removeChild(loadDiv);
      appendMsg('assistant', 'Eroare: ' + e.message);
    }
    busy = false;
    sendBtn.disabled = false;
  }

  sendBtn.addEventListener('click', function() { send(inputEl.value); });
  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(inputEl.value); }
  });
  if (promptsEl) {
    promptsEl.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-qp]');
      if (btn) send(btn.dataset.qp);
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// renderSummaryPage — split layout: summary left, mentor right
// ─────────────────────────────────────────────────────────────────
function renderSummaryPage(element) {
  var sd = window.__summaryPageData;
  var activeInfo = (typeof state !== 'undefined') ? state.activeSummary : null;

  if (!sd || !sd.data) {
    if (typeof navigateTo === 'function') navigateTo((activeInfo && activeInfo.subjectKey) || 'dashboard');
    return;
  }

  var data        = sd.data;
  var title       = sd.title || (data.output && data.output.title) || 'Rezumat';
  var subjectName = sd.subjectName || '';
  var subjectKey  = activeInfo && activeInfo.subjectKey;
  var domCat      = (data.output && data.output.domain_category) || 'other';
  var ctx         = window.__activeSummaryContext || null;
  var prompts     = getSummaryQuickPrompts(ctx, domCat);

  // ── Outer shell — fills #pageContent ─────────────────────────────
  var h = '<div style="display:flex;flex-direction:column;height:calc(100vh - 62px);">';

  // ── Header bar ────────────────────────────────────────────────────
  h += '<div style="flex-shrink:0;display:flex;align-items:center;gap:10px;padding:0 20px;height:48px;background:var(--bg-base);border-bottom:1px solid var(--border);">';
  h += '<button id="summaryBackBtn" style="background:var(--bg-overlay);border:1px solid var(--border);color:var(--text-secondary);border-radius:8px;padding:5px 12px;cursor:pointer;font-size:.78rem;white-space:nowrap;flex-shrink:0;">← ' + escapeHtml(subjectName || 'Înapoi') + '</button>';
  h += '<div style="flex:1;font-size:.8rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(title) + '</div>';
  h += '<button onclick="downloadSummaryAsPrint()" style="background:transparent;border:1px solid var(--border);color:var(--text-muted);border-radius:8px;padding:5px 12px;cursor:pointer;font-size:.78rem;white-space:nowrap;flex-shrink:0;display:flex;align-items:center;gap:5px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Descarcă</button>';
  h += '</div>';

  // ── Split body ────────────────────────────────────────────────────
  h += '<div style="display:flex;flex:1;min-height:0;overflow:hidden;">';

  // Left: scrollable summary
  h += '<div id="summaryPageContent" style="flex:1;overflow-y:auto;min-width:0;">';
  h += renderSmartSummaryPage(data);
  h += '</div>';

  // Divider
  h += '<div style="width:1px;background:var(--border);flex-shrink:0;"></div>';

  // Right: tabbed panel (Mentor / Quiz / Flashcards)
  h += '<div style="width:360px;flex-shrink:0;display:flex;flex-direction:column;min-height:0;background:var(--bg-raised);">';

  // Context header
  if (ctx && ctx.title) {
    h += '<div style="flex-shrink:0;padding:8px 14px;border-bottom:1px solid var(--border);">';
    h += '<div style="font-size:.68rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📄 ' + escapeHtml(ctx.title) + '</div>';
    h += '</div>';
  }

  // Tab bar
  h += '<div id="smTabBar" style="flex-shrink:0;display:flex;border-bottom:1px solid var(--border);">';
  h += '<button id="smTab-mentor" style="flex:1;padding:9px 2px;background:transparent;border:none;border-bottom:2px solid var(--accent);color:var(--accent);cursor:pointer;font-size:.68rem;font-weight:600;">💬 Mentor</button>';
  h += '<button id="smTab-quiz"   style="flex:1;padding:9px 2px;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--text-muted);cursor:pointer;font-size:.68rem;">📝 Quiz</button>';
  h += '<button id="smTab-cards"  style="flex:1;padding:9px 2px;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--text-muted);cursor:pointer;font-size:.68rem;">🎴 Cards</button>';
  h += '<button id="smTab-map"    style="flex:1;padding:9px 2px;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--text-muted);cursor:pointer;font-size:.68rem;">🗺️ Hartă</button>';
  h += '<button id="smTab-scen"   style="flex:1;padding:9px 2px;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--text-muted);cursor:pointer;font-size:.68rem;">🎯 Scenarii</button>';
  h += '</div>';

  // ── Mentor panel ──────────────────────────────────────────────────
  h += '<div id="smPanel-mentor" style="flex:1;display:flex;flex-direction:column;min-height:0;">';
  h += '<div id="smChat" style="flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:8px;">';
  h += '<div style="font-size:.82rem;color:var(--text-secondary);line-height:1.7;background:var(--bg-overlay);border:1px solid var(--border);border-radius:10px 10px 10px 4px;padding:10px 13px;">';
  h += 'Bună! Am citit fișa despre <strong>' + escapeHtml(ctx && ctx.title || title) + '</strong>. Pune-mi orice întrebare.';
  h += '</div></div>';
  h += '<div id="smQuickPrompts" style="flex-shrink:0;padding:8px 14px;display:flex;flex-direction:column;gap:5px;border-top:1px solid var(--border);">';
  prompts.forEach(function(p) {
    h += '<button data-qp="'+escapeHtml(p)+'" style="text-align:left;background:var(--bg-overlay);border:1px solid var(--border);border-radius:7px;padding:7px 10px;cursor:pointer;font-size:.74rem;color:var(--text-secondary);line-height:1.4;">'+escapeHtml(p)+'</button>';
  });
  h += '</div>';
  h += '<div style="flex-shrink:0;padding:10px 14px;border-top:1px solid var(--border);display:flex;gap:8px;align-items:flex-end;">';
  h += '<textarea id="smInput" placeholder="Întreabă ceva... (Enter = trimite)" rows="2" style="flex:1;background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:.8rem;color:var(--text-primary);resize:none;font-family:inherit;outline:none;"></textarea>';
  h += '<button id="smSend" style="background:var(--accent);border:none;color:#fff;border-radius:8px;padding:9px 13px;cursor:pointer;font-size:1rem;flex-shrink:0;align-self:flex-end;">↑</button>';
  h += '</div>';
  h += '</div>';

  // ── Quiz panel ────────────────────────────────────────────────────
  h += '<div id="smPanel-quiz" style="flex:1;overflow-y:auto;display:none;padding:16px 14px;display:none;">';
  h += '<div style="font-size:.78rem;color:var(--text-muted);margin-bottom:14px;line-height:1.5;">Întrebări generate din conținutul fișei active.</div>';
  h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">';
  h += '<select id="smQuizCount" style="flex:1;background:var(--bg-overlay);border:1px solid var(--border);color:var(--text-secondary);border-radius:7px;padding:6px 10px;font-size:.78rem;">';
  h += '<option value="5">5 întrebări</option><option value="10" selected>10 întrebări</option><option value="15">15 întrebări</option>';
  h += '</select>';
  h += '<button id="smQuizGen" style="background:var(--accent);border:none;color:#fff;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:.78rem;font-weight:600;white-space:nowrap;">Generează</button>';
  h += '</div>';
  h += '<div id="smQuizContent"></div>';
  h += '</div>';

  // ── Flashcards panel ──────────────────────────────────────────────
  h += '<div id="smPanel-cards" style="flex:1;overflow-y:auto;display:none;padding:16px 14px;">';
  h += '<div style="font-size:.78rem;color:var(--text-muted);margin-bottom:14px;line-height:1.5;">Flashcard-uri generate din conținutul fișei active.</div>';
  h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">';
  h += '<select id="smCardsCount" style="flex:1;background:var(--bg-overlay);border:1px solid var(--border);color:var(--text-secondary);border-radius:7px;padding:6px 10px;font-size:.78rem;">';
  h += '<option value="10" selected>10 carduri</option><option value="20">20 carduri</option><option value="30">30 carduri</option>';
  h += '</select>';
  h += '<button id="smCardsGen" style="background:var(--accent);border:none;color:#fff;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:.78rem;font-weight:600;white-space:nowrap;">Generează</button>';
  h += '</div>';
  h += '<div id="smCardsContent"></div>';
  h += '</div>';

  // ── Concept map panel ─────────────────────────────────────────────
  h += '<div id="smPanel-map" style="flex:1;overflow-y:auto;display:none;padding:14px;">';
  h += '<div id="smMapContent"><div style="font-size:.78rem;color:var(--text-muted);line-height:1.6;">Conexiunile dintre conceptele din fișă, extrase din secțiunile structurale.</div></div>';
  h += '</div>';

  // ── Scenarios panel ───────────────────────────────────────────────
  h += '<div id="smPanel-scen" style="flex:1;overflow-y:auto;display:none;padding:16px 14px;">';
  h += '<div style="font-size:.78rem;color:var(--text-muted);margin-bottom:14px;line-height:1.5;">Aplică conceptele din fișă în situații reale. AI-ul îți evaluează răspunsul.</div>';
  h += '<button id="smScenGen" style="background:var(--accent);border:none;color:#fff;border-radius:8px;padding:8px 18px;cursor:pointer;font-size:.79rem;font-weight:600;margin-bottom:14px;">Generează scenarii</button>';
  h += '<div id="smScenContent"></div>';
  h += '</div>';

  h += '</div>'; // end right panel
  h += '</div>'; // end split body
  h += '</div>'; // end outer shell

  element.innerHTML = h;

  // Back button
  var backBtn = document.getElementById('summaryBackBtn');
  if (backBtn) backBtn.addEventListener('click', function() {
    if (typeof navigateTo === 'function') navigateTo(subjectKey || 'dashboard');
  });

  // Hashes and sections for left panel
  var summaryHash = simpleHash((data.output.title || '') + '|' + (subjectName || ''));
  var contentEl = document.getElementById('summaryPageContent');
  if (contentEl && data.output) {
    var filteredSections = (data.output.sections || [])
      .filter(function(s) { return (s.relevance || 1) > 0.45; })
      .sort(function(a, b) { return (b.relevance || 0) - (a.relevance || 0); });
    initSectionQuiz(contentEl, filteredSections, subjectName, domCat, summaryHash);
    initHighlightSystem(contentEl, summaryHash);
  }

  // Init right panel (tabs + mentor + quiz + flashcards)
  initRightPanel(ctx, domCat, data, subjectName, summaryHash);
}

// ─────────────────────────────────────────────────────────────────
// openSmartSummaryModal — kept for backward compat, delegates to page
// ─────────────────────────────────────────────────────────────────
function openSmartSummaryModalLegacy(data, title, subjectName, intent) {
  openSummaryPage(data, title, subjectName, intent, '');
}

// ─────────────────────────────────────────────────────────────────
// buildSmartSummarySlides — kept for backward compat with slide system
// For smart summaries we use openSummaryPage directly
// ─────────────────────────────────────────────────────────────────
function buildSmartSummarySlides(data) {
  if (!data || !data.output) return [];
  return [{
    tag: 'Fișă',
    title: data.output.title || 'Rezumat',
    content: renderSmartSummaryPage(data),
  }];
}
