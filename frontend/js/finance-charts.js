/**
 * finance-charts.js — Study Hub Finance Lab
 * Animated, BNR-style interactive charts with smooth RAF interpolation.
 * Loaded after index.html inline script — overrides chart SVG functions globally.
 */
(function () {
  'use strict';

  console.log('[Finance Charts v2] Loaded — animated charts + BNR style active');

  // ─── Animation Engine ───────────────────────────────────────────────────────

  var _anim = { raf: null, from: null, to: null, t0: null, dur: 520 };

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function L(a, b, t) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return b;
    return a + (b - a) * t;
  }

  function lerpPath(aPath, bPath, t) {
    if (!aPath || aPath.length !== bPath.length) return bPath;
    return bPath.map(function (bp, i) {
      var ap = aPath[i] || bp;
      return { label: bp.label, nominal: L(ap.nominal, bp.nominal, t), discounted: L(ap.discounted, bp.discounted, t) };
    });
  }

  function lerpFlows(aFlows, bFlows, t) {
    if (!aFlows || aFlows.length !== bFlows.length) return bFlows;
    return bFlows.map(function (bp, i) {
      var ap = aFlows[i] || bp;
      return { year: bp.year, nominal: L(ap.nominal, bp.nominal, t), discounted: L(ap.discounted, bp.discounted, t) };
    });
  }

  function lerpScorecard(aCard, bCard, t) {
    if (!aCard || aCard.length !== bCard.length) return bCard;
    return bCard.map(function (bc, i) {
      var ac = aCard[i] || bc;
      var hist = bc.history.map(function (v, j) { return L(ac.history && ac.history[j], v, t); });
      return Object.assign({}, bc, { history: hist });
    });
  }

  function interpMetrics(a, b, rawT) {
    if (!a) return b;
    var t = easeOut(rawT);
    return {
      finance: b.finance,
      bufferPath: lerpPath(a.bufferPath, b.bufferPath, t),
      pvFlows: lerpFlows(a.pvFlows, b.pvFlows, t),
      npv: L(a.npv, b.npv, t), futureValue: L(a.futureValue, b.futureValue, t),
      payback: L(a.payback, b.payback, t), roi: L(a.roi, b.roi, t),
      lossProbability: L(a.lossProbability, b.lossProbability, t),
      p10: L(a.p10, b.p10, t), p50: L(a.p50, b.p50, t), p90: L(a.p90, b.p90, t),
      expectedPnl: L(a.expectedPnl, b.expectedPnl, t),
      scenarioMeta: b.scenarioMeta,
      capitalRatio: L(a.capitalRatio, b.capitalRatio, t),
      liquidityCoverage: L(a.liquidityCoverage, b.liquidityCoverage, t),
      nplRate: L(a.nplRate, b.nplRate, t),
      earningsDrag: L(a.earningsDrag, b.earningsDrag, t),
      creditHeat: L(a.creditHeat, b.creditHeat, t),
      contagionPressure: L(a.contagionPressure, b.contagionPressure, t),
      housingFragility: L(a.housingFragility, b.housingFragility, t),
      tailLossMedian: L(a.tailLossMedian, b.tailLossMedian, t),
      tailLossSpread: L(a.tailLossSpread, b.tailLossSpread, t),
      tailLossMild: L(a.tailLossMild, b.tailLossMild, t),
      tailLossTail: L(a.tailLossTail, b.tailLossTail, t),
      systemicRiskScore: L(a.systemicRiskScore, b.systemicRiskScore, t),
      ccybNeed: L(a.ccybNeed, b.ccybNeed, t),
      creditGapStress: L(a.creditGapStress, b.creditGapStress, t),
      stabilityScore: L(a.stabilityScore, b.stabilityScore, t),
      repricingPressure: L(a.repricingPressure, b.repricingPressure, t),
      debtStress: L(a.debtStress, b.debtStress, t),
      shockAbsorption: L(a.shockAbsorption, b.shockAbsorption, t),
      overviewTone: b.overviewTone,
      riskBoard: b.riskBoard,
      vulnerabilityCards: b.vulnerabilityCards,
      scorecard: lerpScorecard(a.scorecard, b.scorecard, t)
    };
  }

  var CHART_IDS = ['finValuationChart', 'finDistributionChart', 'finStressChart', 'finStabilityChart', 'finPolicyChart'];

  function renderCharts(m) {
    var a = document.getElementById('finValuationChart');   if (a) a.innerHTML = financeLineChartSvg(m);
    var b = document.getElementById('finDistributionChart');if (b) b.innerHTML = financeDistributionSvg(m);
    var c = document.getElementById('finStressChart');       if (c) c.innerHTML = financeStressSvg(m);
    var d = document.getElementById('finStabilityChart');    if (d) d.innerHTML = financeStabilitySvg(m);
    var e = document.getElementById('finPolicyChart');       if (e) e.innerHTML = financePolicySvg(m);
  }

  function startAnim(fromM, toM) {
    if (_anim.raf) { cancelAnimationFrame(_anim.raf); _anim.raf = null; }
    _anim.from = fromM; _anim.to = toM; _anim.t0 = null;
    function frame(ts) {
      if (!_anim.t0) _anim.t0 = ts;
      var t = Math.min(1, (ts - _anim.t0) / _anim.dur);
      renderCharts(interpMetrics(_anim.from, _anim.to, t));
      if (t < 1) { _anim.raf = requestAnimationFrame(frame); }
      else { _anim.raf = null; }
    }
    _anim.raf = requestAnimationFrame(frame);
  }

  // ─── Patch updateFinanceLabUI for animated chart transitions ────────────────

  var _prevMetrics = null;

  function patchUpdate() {
    var orig = window.updateFinanceLabUI;
    if (!orig) { setTimeout(patchUpdate, 60); return; }

    window.updateFinanceLabUI = function () {
      var newM = window.getFinanceLabMetrics ? window.getFinanceLabMetrics() : null;

      // Save old chart SVGs before original runs
      var oldHtml = {};
      if (_prevMetrics) {
        CHART_IDS.forEach(function (id) {
          var el = document.getElementById(id);
          if (el && el.innerHTML) oldHtml[id] = el.innerHTML;
        });
      }

      // Run original (updates sliders, KPIs, text, scorecard, snaps charts)
      orig.call(this);

      if (_prevMetrics && newM && Object.keys(oldHtml).length > 0) {
        // Restore old chart state immediately (before browser paints)
        CHART_IDS.forEach(function (id) {
          var el = document.getElementById(id);
          if (el && oldHtml[id]) el.innerHTML = oldHtml[id];
        });
        // Animate from old to new
        startAnim(_prevMetrics, newM);
      }

      _prevMetrics = newM;
    };
  }

  // ─── Shared SVG helpers ─────────────────────────────────────────────────────

  var FONT = 'font-family="system-ui,\'Helvetica Neue\',Arial,sans-serif"';

  function gridH(x1, x2, y, opacity) {
    return '<line x1="' + x1 + '" y1="' + y.toFixed(1) + '" x2="' + x2 + '" y2="' + y.toFixed(1) +
      '" stroke="rgba(255,255,255,' + (opacity || 0.07) + ')" stroke-width="1"/>';
  }

  function yLabel(x, y, val, color) {
    return '<text x="' + x + '" y="' + y.toFixed(1) + '" text-anchor="end" fill="' +
      (color || 'rgba(255,255,255,0.35)') + '" font-size="10" ' + FONT + '>' + val + '</text>';
  }

  function dot(cx, cy, r, fill, strokeFill, strokeW) {
    return '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (r || 4.5) +
      '" fill="' + fill + '" stroke="' + (strokeFill || '#1a1520') + '" stroke-width="' + (strokeW || 2) + '"/>';
  }

  function txt(x, y, content, opts) {
    opts = opts || {};
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) +
      '" text-anchor="' + (opts.anchor || 'middle') + '"' +
      ' fill="' + (opts.fill || 'rgba(255,255,255,0.55)') + '"' +
      ' font-size="' + (opts.size || 11) + '"' +
      (opts.weight ? ' font-weight="' + opts.weight + '"' : '') +
      ' ' + FONT + '>' + content + '</text>';
  }

  function pct(v, d) { return (Number.isFinite(v) ? v.toFixed(d === undefined ? 1 : d) : '—') + '%'; }
  function round1(v) { return Number.isFinite(v) ? v.toFixed(1) : '—'; }

  // ─── 1. Line / Area Chart — Buffer Erosion ──────────────────────────────────

  window.financeLineChartSvg = function (metrics) {
    var W = 640, H = 268, pL = 52, pR = 22, pT = 20, pB = 44;
    var pw = W - pL - pR, ph = H - pT - pB;
    var isStab = metrics.finance.mode === 'stability';
    var pts = isStab ? metrics.bufferPath : metrics.pvFlows;

    var maxY = Math.max.apply(null, pts.map(function (p) { return Math.max(p.nominal || 0, p.discounted || 0); }));
    maxY = Math.max(maxY * 1.12, 1);

    function px(i) { return pL + (pts.length < 2 ? pw / 2 : i * pw / (pts.length - 1)); }
    function py(v) { return pT + ph - Math.max(0, Math.min(1, v / maxY)) * ph; }

    var nomP = '', discP = '';
    pts.forEach(function (p, i) {
      var op = i ? ' L ' : 'M ';
      nomP  += op + px(i).toFixed(1) + ' ' + py(p.nominal || 0).toFixed(1);
      discP += op + px(i).toFixed(1) + ' ' + py(p.discounted || 0).toFixed(1);
    });
    var lastX = px(pts.length - 1).toFixed(1), firstX = px(0).toFixed(1), baseY = (pT + ph).toFixed(1);
    var areaP = discP + ' L ' + lastX + ' ' + baseY + ' L ' + firstX + ' ' + baseY + ' Z';

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="overflow:visible">'
      + '<defs>'
      + '<linearGradient id="fcGA" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#f29b6d" stop-opacity="0.32"/>'
      + '<stop offset="100%" stop-color="#f29b6d" stop-opacity="0.03"/>'
      + '</linearGradient>'
      + '<linearGradient id="fcGN" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#73c9a6" stop-opacity="0.15"/>'
      + '<stop offset="100%" stop-color="#73c9a6" stop-opacity="0.01"/>'
      + '</linearGradient>'
      + '</defs>';

    // Y-axis grid + labels
    var STEPS = 5;
    for (var g = 0; g <= STEPS; g++) {
      var gy = pT + (ph / STEPS) * g;
      var gv = maxY * (1 - g / STEPS);
      svg += gridH(pL, pL + pw, gy);
      svg += yLabel(pL - 6, gy + 4, round1(gv));
    }

    // Area + lines
    svg += '<path d="' + areaP + '" fill="url(#fcGA)"/>';
    svg += '<path d="' + nomP  + '" fill="none" stroke="#73c9a6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="7 5" opacity="0.65"/>';
    svg += '<path d="' + discP + '" fill="none" stroke="#f29b6d" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>';

    // Y-axis rule
    svg += '<line x1="' + pL + '" y1="' + pT + '" x2="' + pL + '" y2="' + (pT + ph) + '" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>';

    // Data points
    pts.forEach(function (p, i) {
      var cx = px(i), cyn = py(p.nominal || 0), cyd = py(p.discounted || 0);
      var label = isStab ? p.label : 'Y' + p.year;

      // Nominal dot (subtle)
      svg += dot(cx, cyn, 3, '#73c9a6', '#1a1520', 1.5);

      // Discounted dot with halo
      svg += '<circle cx="' + cx.toFixed(1) + '" cy="' + cyd.toFixed(1) + '" r="9" fill="#f29b6d" fill-opacity="0.12"/>';
      svg += dot(cx, cyd, 4.5, '#f29b6d');

      // Gap annotation: vertical line between nominal and discounted
      if (Math.abs(cyn - cyd) > 6) {
        svg += '<line x1="' + cx.toFixed(1) + '" y1="' + Math.min(cyn, cyd).toFixed(1) +
          '" x2="' + cx.toFixed(1) + '" y2="' + Math.max(cyn, cyd).toFixed(1) +
          '" stroke="rgba(242,155,109,0.22)" stroke-width="1.5" stroke-dasharray="3 3"/>';
      }

      // Value label (discounted)
      svg += txt(cx, cyd - 13, round1(p.discounted || 0), { fill: '#f29b6d', size: 10.5, weight: 700 });

      // X label
      svg += txt(cx, H - 10, label, { size: 10, fill: 'rgba(255,255,255,0.42)' });
    });

    return svg + '</svg>';
  };

  // ─── 2. Distribution Curve — Systemic Loss Distribution ─────────────────────

  window.financeDistributionSvg = function (metrics) {
    var W = 640, H = 268, pL = 34, pR = 34, pT = 24, pB = 44;
    var pw = W - pL - pR, ph = H - pT - pB;
    var isStab = metrics.finance.mode === 'stability';

    var center = isStab ? metrics.tailLossMedian : metrics.finance.expectedReturn;
    var spread = isStab ? Math.max(metrics.tailLossSpread, 0.01) : Math.max(metrics.finance.volatility, 0.01);
    var minX = isStab ? Math.max(0, Math.floor((center - spread * 2.8) / 5) * 5) : -42;
    var maxX = isStab ? Math.max(36, Math.ceil((center + spread * 3.2) / 5) * 5) : 42;

    var nPts = 80, pts2 = [], maxD = 0;
    for (var i = 0; i <= nPts; i++) {
      var v = minX + (maxX - minX) * i / nPts;
      var d = Math.exp(-0.5 * Math.pow((v - center) / spread, 2));
      pts2.push({ v: v, d: d });
      if (d > maxD) maxD = d;
    }

    function qx(v) { return pL + (v - minX) / (maxX - minX) * pw; }
    function qy(d) { return pT + ph - d / maxD * ph; }

    var lineSvg = '', areaSvg = '';
    pts2.forEach(function (p, i) {
      var op = i ? ' L ' : 'M ';
      lineSvg += op + qx(p.v).toFixed(1) + ' ' + qy(p.d).toFixed(1);
    });
    areaSvg = lineSvg + ' L ' + qx(maxX).toFixed(1) + ' ' + (pT + ph) + ' L ' + qx(minX).toFixed(1) + ' ' + (pT + ph) + ' Z';

    var markers = [
      { label: isStab ? 'Mild' : 'P10',   v: isStab ? metrics.tailLossMild   : metrics.p10, color: '#e9bb74' },
      { label: isStab ? 'Median' : 'P50', v: isStab ? metrics.tailLossMedian : metrics.p50, color: '#8ab8d8' },
      { label: isStab ? 'Tail' : 'P90',   v: isStab ? metrics.tailLossTail   : metrics.p90, color: '#e08d86' }
    ];

    // Light-bg colors for stability
    var dGridClr  = isStab ? 'rgba(39,55,82,0.10)'  : 'rgba(255,255,255,0.07)';
    var dAxisClr  = isStab ? 'rgba(39,55,82,0.22)'  : 'rgba(255,255,255,0.14)';
    var dTickFill = isStab ? 'rgba(36,51,72,0.66)'  : 'rgba(255,255,255,0.38)';
    var dPillBg   = isStab ? 'rgba(240,244,252,0.95)' : 'rgba(20,17,24,0.75)';
    // For stability: bigger tail highlight, stronger area gradient opacity
    var areaOpTop = isStab ? '0.52' : '0.42';
    var tailFillOp = isStab ? '0.32' : '0.24';

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '">'
      + '<defs>'
      + '<linearGradient id="fcDB" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#8ab8d8" stop-opacity="' + areaOpTop + '"/>'
      + '<stop offset="100%" stop-color="#8ab8d8" stop-opacity="0.04"/>'
      + '</linearGradient>'
      + '<linearGradient id="fcDT" x1="0" y1="0" x2="1" y2="0">'
      + '<stop offset="0%" stop-color="#e08d86" stop-opacity="0"/>'
      + '<stop offset="100%" stop-color="#e08d86" stop-opacity="' + tailFillOp + '"/>'
      + '</linearGradient>'
      + '</defs>';

    // Tail zone highlight (right of tail marker)
    var tailV = Math.max(minX, Math.min(maxX, markers[2].v));
    var tailXpx = qx(tailV);
    svg += '<rect x="' + tailXpx.toFixed(1) + '" y="' + pT + '" width="' + Math.max(0, pL + pw - tailXpx).toFixed(1) + '" height="' + ph + '" fill="url(#fcDT)"/>';

    // Grid
    for (var g2 = 0; g2 <= 4; g2++) {
      var gy2 = pT + (ph / 4) * g2;
      svg += '<line x1="' + pL + '" y1="' + gy2.toFixed(1) + '" x2="' + (pL + pw) + '" y2="' + gy2.toFixed(1) + '" stroke="' + dGridClr + '" stroke-width="1"/>';
    }
    svg += '<line x1="' + pL + '" y1="' + (pT + ph) + '" x2="' + (pL + pw) + '" y2="' + (pT + ph) + '" stroke="' + dAxisClr + '" stroke-width="1.5"/>';

    // Area + curve
    svg += '<path d="' + areaSvg + '" fill="url(#fcDB)"/>';
    svg += '<path d="' + lineSvg + '" fill="none" stroke="#8ab8d8" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>';

    // Marker lines + labels
    markers.forEach(function (m, idx) {
      var mx = Math.max(pL + 2, Math.min(pL + pw - 2, qx(m.v)));
      svg += '<line x1="' + mx.toFixed(1) + '" y1="' + pT + '" x2="' + mx.toFixed(1) + '" y2="' + (pT + ph) + '" stroke="' + m.color + '" stroke-width="2.2" stroke-dasharray="5 5"/>';
      // Pill label with adaptive background
      var lx = mx.toFixed(1), ly = (pT + 14 + idx * 24).toFixed(1);
      svg += '<rect x="' + (mx - 34).toFixed(1) + '" y="' + (pT + 2 + idx * 24) + '" width="68" height="20" rx="6" fill="' + dPillBg + '" stroke="' + m.color + '" stroke-width="1" stroke-opacity="0.6"/>';
      svg += '<text x="' + lx + '" y="' + ly + '" text-anchor="middle" fill="' + m.color + '" font-size="10.5" font-weight="800" ' + FONT + '>' + m.label + ' ' + pct(m.v) + '</text>';
    });

    // Tail label annotation
    if (isStab) {
      var tailLabelX = Math.min(pL + pw - 44, tailXpx + 6);
      svg += '<text x="' + tailLabelX.toFixed(1) + '" y="' + (pT + ph - 8) + '" fill="#e08d86" font-size="9.5" font-weight="800" ' + FONT + '>← Tail risk zone</text>';
    }

    // X-axis tick labels
    var xTicks = [minX, center, maxX];
    xTicks.forEach(function (v) {
      svg += txt(qx(v), H - 10, pct(v, 0), { size: 10, fill: dTickFill, weight: isStab ? 600 : 400 });
    });

    return svg + '</svg>';
  };

  // ─── 3. Bar Chart — Shock Transmission ──────────────────────────────────────

  window.financeStressSvg = function (metrics) {
    var W = 700, H = 316, pL = 84, pR = 30, pT = 28, pB = 58;
    var plotW = W - pL - pR;
    var baseY = H - pB;
    var plotH = baseY - pT;
    var isStab = metrics.finance.mode === 'stability';

    var items = isStab
      ? [
          { label: 'CET1',       v: Math.max(0, metrics.capitalRatio),      max: 22,  thresh: 10,  tLbl: '10%', color: metrics.capitalRatio > 10 ? '#73c9a6' : metrics.capitalRatio > 8 ? '#e9bb74' : '#e08d86' },
          { label: 'LCR',        v: Math.max(0, metrics.liquidityCoverage),  max: 180, thresh: 100, tLbl: '100%', color: metrics.liquidityCoverage > 110 ? '#73c9a6' : metrics.liquidityCoverage > 100 ? '#e9bb74' : '#e08d86' },
          { label: 'Credit Gap', v: Math.max(0, metrics.creditGapStress),    max: 18,  thresh: 6,   tLbl: '6%', color: metrics.creditGapStress < 6 ? '#73c9a6' : metrics.creditGapStress < 10 ? '#e9bb74' : '#e08d86' },
          { label: 'Contagion',  v: Math.max(0, metrics.contagionPressure),  max: 100, thresh: 35,  tLbl: '35', color: metrics.contagionPressure < 35 ? '#73c9a6' : metrics.contagionPressure < 55 ? '#e9bb74' : '#e08d86' }
        ]
      : [
          { label: 'Capital',     v: Math.max(0, metrics.capitalRatio),      max: 22,  thresh: 10,  tLbl: '10%', color: metrics.capitalRatio > 10 ? '#73c9a6' : metrics.capitalRatio > 8 ? '#e9bb74' : '#e08d86' },
          { label: 'Lichiditate', v: Math.max(0, metrics.liquidityCoverage), max: 180, thresh: 100, tLbl: '100%', color: metrics.liquidityCoverage > 110 ? '#73c9a6' : metrics.liquidityCoverage > 100 ? '#e9bb74' : '#e08d86' },
          { label: 'NPL',         v: Math.max(0, metrics.nplRate),           max: 18,  thresh: 6,   tLbl: '6%', color: metrics.nplRate < 6 ? '#73c9a6' : metrics.nplRate < 10 ? '#e9bb74' : '#e08d86' },
          { label: 'Drag',        v: Math.max(0, metrics.earningsDrag),      max: 28,  thresh: 10,  tLbl: '10', color: metrics.earningsDrag < 10 ? '#73c9a6' : metrics.earningsDrag < 18 ? '#e9bb74' : '#e08d86' }
        ];

    // Light-bg aware colors (stability charts render on white card background)
    var axisColor    = isStab ? 'rgba(39,54,78,0.28)'  : 'rgba(255,255,255,0.12)';
    var barLabelClr  = isStab ? 'rgba(36,51,72,0.82)'  : 'rgba(255,255,255,0.5)';
    var threshClr    = isStab ? 'rgba(36,51,72,0.42)'  : 'rgba(255,255,255,0.28)';

    var slotW = plotW / items.length;
    var barW = Math.min(124, slotW * 0.64);
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '">';

    // Zone bands
    if (isStab) {
      var zoneH = plotH / 3;
      var zones = [
        { y: 30, color: 'rgba(94,166,140,0.07)',  label: 'Zonă sigură',  lc: 'rgba(94,166,140,0.7)' },
        { y: 30 + zoneH, color: 'rgba(233,187,116,0.07)', label: 'Supraveghere', lc: 'rgba(196,140,71,0.7)' },
        { y: 30 + zoneH * 2, color: 'rgba(224,141,134,0.09)', label: 'Zonă critică', lc: 'rgba(200,75,90,0.7)' }
      ];
      zones.forEach(function (z) {
        svg += '<rect x="' + pL + '" y="' + z.y.toFixed(0) + '" width="' + plotW + '" height="' + zoneH.toFixed(0) + '" fill="' + z.color + '"/>';
        svg += '<text x="18" y="' + (z.y + 18).toFixed(0) + '" fill="' + z.lc + '" font-size="11.5" font-weight="800" ' + FONT + '>' + z.label + '</text>';
      });
    }

    for (var gy = 0; gy <= 4; gy++) {
      var y = pT + (plotH / 4) * gy;
      var gv = items[gy === 4 ? 0 : 1] ? null : null;
      svg += '<line x1="' + pL + '" y1="' + y.toFixed(1) + '" x2="' + (pL + plotW) + '" y2="' + y.toFixed(1) + '" stroke="' + axisColor + '" stroke-width="1"/>';
    }
    svg += '<line x1="' + pL + '" y1="' + baseY + '" x2="' + (pL + plotW) + '" y2="' + baseY + '" stroke="' + axisColor + '" stroke-width="1.5"/>';

    items.forEach(function (item, idx) {
      var bx = pL + idx * slotW + (slotW - barW) / 2;
      var h = Math.max(10, (item.v / item.max) * plotH);
      var barY = baseY - h;

      // Shadow
      svg += '<rect x="' + (bx + 3) + '" y="' + (barY + 3) + '" width="' + barW + '" height="' + h.toFixed(1) + '" rx="12" fill="' + item.color + '" fill-opacity="0.15"/>';
      // Bar
      svg += '<rect x="' + bx + '" y="' + barY.toFixed(1) + '" width="' + barW + '" height="' + h.toFixed(1) + '" rx="12" fill="' + item.color + '" fill-opacity="0.88"/>';

      // Threshold line
      var tY = baseY - (item.thresh / item.max) * plotH;
      svg += '<line x1="' + pL + '" y1="' + tY.toFixed(1) + '" x2="' + (pL + plotW) + '" y2="' + tY.toFixed(1) + '" stroke="' + threshClr + '" stroke-width="1.5" stroke-dasharray="4 4"/>';
      svg += txt(pL + plotW + 8, tY + 4, item.tLbl, { anchor: 'start', size: 10, fill: threshClr, weight: 800 });

      // Value
      var vText = (item.label === 'Contagion' || item.label === 'Drag')
        ? Math.round(item.v) + (item.label === 'Contagion' ? '/100' : '')
        : pct(item.v);
      svg += txt(bx + barW / 2, barY - 12, vText, { size: 14, weight: 800, fill: item.color });

      // Label
      svg += txt(bx + barW / 2, baseY + 28, item.label, { size: 12.5, weight: 800, fill: barLabelClr });
    });

    return svg + '</svg>';
  };

  // ─── 4. Radar Chart — Vulnerability Profile ──────────────────────────────────

  window.financeStabilitySvg = function (metrics) {
    var W = 640, H = 292, cx = 320, cy = 142, R = 104;
    var isStab = metrics.finance.mode === 'stability';

    // Radar axes — 6 dimensions for richer picture in stability mode
    var axes = isStab
      ? [
          { label: 'Capital',       sub: 'CET1 / buffer', v: Math.max(0, Math.min(100, metrics.finance.capitalBuffer * 5)) },
          { label: 'Lichiditate',   sub: 'LCR / funding', v: Math.max(0, Math.min(100, metrics.finance.liquidityBuffer - 60)) },
          { label: 'Credit cycle',  sub: 'expansiune',    v: Math.max(0, Math.min(100, 100 - metrics.creditHeat)) },
          { label: 'Housing',       sub: 'gospodării',    v: Math.max(0, Math.min(100, 100 - metrics.housingFragility)) },
          { label: 'Contagiune',    sub: 'propagare',     v: Math.max(0, Math.min(100, 100 - metrics.contagionPressure)) },
          { label: 'Macro',         sub: 'presiune',      v: Math.max(0, Math.min(100, 100 - metrics.systemicRiskScore)) }
        ]
      : [
          { label: 'Stability',  sub: '', v: metrics.stabilityScore },
          { label: 'Liquidity',  sub: '', v: Math.max(0, Math.min(100, metrics.finance.liquidityBuffer - 60)) },
          { label: 'Capital',    sub: '', v: Math.max(0, Math.min(100, metrics.finance.capitalBuffer * 5)) },
          { label: 'Market Risk',sub: '', v: Math.max(0, Math.min(100, 100 - metrics.finance.marketVol * 1.7)) },
          { label: 'Debt Load',  sub: '', v: Math.max(0, Math.min(100, 100 - metrics.debtStress)) }
        ];
    var n = axes.length;
    function ang(i) { return -Math.PI / 2 + i * 2 * Math.PI / n; }

    // Light-bg colors for stability (renders on white .finance-report-card)
    var ringFills = isStab
      ? ['rgba(224,141,134,0.16)', 'rgba(233,187,116,0.12)', 'rgba(115,201,166,0.09)', 'rgba(115,201,166,0.05)']
      : ['rgba(224,141,134,0.1)',  'rgba(233,187,116,0.08)', 'rgba(115,201,166,0.06)', 'rgba(115,201,166,0.04)'];
    var ringStroke = isStab ? 'rgba(39,55,82,0.18)'      : 'rgba(255,255,255,0.08)';
    var axisStroke = isStab ? 'rgba(39,55,82,0.24)'      : 'rgba(255,255,255,0.12)';
    var labelFill  = isStab ? '#243348'                   : 'rgba(255,255,255,0.78)';
    var scoreFill  = isStab ? 'rgba(36,51,72,0.68)'      : 'rgba(255,255,255,0.4)';
    var polyFill   = isStab ? 'rgba(242,155,109,0.30)'   : 'rgba(242,155,109,0.18)';
    var dotStroke  = isStab ? '#f5f8fc'                   : '#1a1520';

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '">';

    // Concentric rings with zone coloring
    for (var ring = 4; ring >= 1; ring--) {
      var rPath = '';
      for (var j = 0; j < n; j++) {
        var a = ang(j), r = R * ring / 4;
        rPath += (j ? ' L ' : 'M ') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1);
      }
      svg += '<path d="' + rPath + ' Z" fill="' + ringFills[ring - 1] + '" stroke="' + ringStroke + '" stroke-width="1"/>';
    }

    // Axis lines
    for (var j2 = 0; j2 < n; j2++) {
      var a2 = ang(j2);
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Math.cos(a2) * R).toFixed(1) + '" y2="' + (cy + Math.sin(a2) * R).toFixed(1) + '" stroke="' + axisStroke + '" stroke-width="1.5"/>';
    }

    // Data polygon — filled + outlined
    var poly = '';
    axes.forEach(function (ax, i) {
      var a3 = ang(i), r3 = R * ax.v / 100;
      poly += (i ? ' L ' : 'M ') + (cx + Math.cos(a3) * r3).toFixed(1) + ' ' + (cy + Math.sin(a3) * r3).toFixed(1);
    });
    svg += '<path d="' + poly + ' Z" fill="' + polyFill + '" stroke="#f29b6d" stroke-width="3.2"/>';

    // Vertex dots + labels
    axes.forEach(function (ax, i) {
      var a4 = ang(i), r4 = R * ax.v / 100;
      var px3 = cx + Math.cos(a4) * r4, py3 = cy + Math.sin(a4) * r4;
      svg += dot(px3, py3, 5.5, '#f29b6d', dotStroke, 2);

      var labelR = R + 34;
      var lx = cx + Math.cos(a4) * labelR, ly = cy + Math.sin(a4) * labelR;
      svg += txt(lx, ly - 5, ax.label, { size: 11.5, weight: 700, fill: labelFill });
      if (isStab) {
        var scoreColor = ax.v >= 65 ? '#4ea88c' : ax.v >= 40 ? '#c48c3a' : '#c84b5a';
        svg += txt(lx, ly + 12, Math.round(ax.v) + '/100', { size: 10, weight: 700, fill: scoreColor });
      }
    });

    // Center label
    if (isStab) {
      var avgScore = Math.round(axes.reduce(function(s,a){ return s+a.v; }, 0) / n);
      var cColor = avgScore >= 65 ? '#4ea88c' : avgScore >= 40 ? '#c48c3a' : '#c84b5a';
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="20" fill="rgba(242,155,109,0.12)" stroke="#f29b6d" stroke-width="1.5"/>';
      svg += txt(cx, cy + 5, avgScore + '', { size: 13, weight: 800, fill: cColor });
    }

    return svg + '</svg>';
  };

  // ─── 5. Stacked Bar Chart — Macroprudential Policy ───────────────────────────

  window.financePolicySvg = function (metrics) {
    var W = 700, H = 288, pL = 56, pR = 26, pT = 24, pB = 54;
    var pw = W - pL - pR, ph = H - pT - pB;

    var items = [
      { label: 'CCyB',  base: Math.max(0.5, Math.min(4, metrics.ccybNeed)), top: Math.max(0, metrics.creditHeat / 55), color: '#4b83d1' },
      { label: 'SyRB',  base: Math.max(0.4, Math.min(3, metrics.creditGapStress * 0.17 + metrics.contagionPressure * 0.012)), top: Math.max(0, metrics.creditGapStress * 0.08), color: '#5fb49c' },
      { label: 'O-SII', base: Math.max(0.5, Math.min(2.5, 0.5 + metrics.finance.leverage * 0.16)), top: Math.max(0, metrics.systemicRiskScore * 0.01), color: '#8b78cf' },
      { label: 'MREL',  base: Math.max(18, Math.min(30, 20 + metrics.finance.capitalBuffer * 0.42)), top: Math.max(0, metrics.shockAbsorption * 0.05), color: '#e08d86' }
    ];

    var maxVal = Math.max.apply(null, items.map(function (it) { return it.base + it.top; }));
    maxVal = Math.max(maxVal * 1.04, 32);
    var baseY = pT + ph;

    function bH(v) { return Math.max(0, (v / maxVal) * ph); }

    var barW = Math.min(94, pw / items.length * 0.56);
    var barSlot = pw / items.length;

    // Policy chart always renders inside light .finance-report-card
    var pGridClr  = 'rgba(39,55,82,0.10)';
    var pAxisClr  = 'rgba(39,55,82,0.24)';
    var pYLblClr  = 'rgba(36,51,72,0.60)';
    var pBarLblClr = 'rgba(36,51,72,0.84)';

    // Tooltip descriptions per instrument
    var policyDesc = {
      'CCyB':  'Contraciclic — eliberat în criză',
      'SyRB':  'Risc sistemic structural',
      'O-SII': 'Instituții sistemice',
      'MREL':  'Absorbție pierderi'
    };

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '">';

    // Zone bands (more opaque for light bg)
    var zones2 = [
      { pct: 0.18, fill: 'rgba(94,166,140,0.12)',   label: 'Buffere confortabile', lc: 'rgba(52,120,96,0.88)' },
      { pct: 0.32, fill: 'rgba(233,187,116,0.14)',  label: 'Calibrare atentă',    lc: 'rgba(158,104,32,0.9)' },
      { pct: 0.50, fill: 'rgba(224,141,134,0.16)',  label: 'Intervenție necesară', lc: 'rgba(168,52,68,0.88)' }
    ];
    var zoneTop = pT;
    zones2.forEach(function (z) {
      var zh = ph * z.pct;
      svg += '<rect x="' + pL + '" y="' + zoneTop.toFixed(0) + '" width="' + pw + '" height="' + zh.toFixed(0) + '" fill="' + z.fill + '"/>';
      svg += txt(pL + 10, zoneTop + 17, z.label, { anchor: 'start', size: 11, weight: 700, fill: z.lc });
      zoneTop += zh;
    });

    // Y-axis grid + labels
    for (var g3 = 0; g3 <= 4; g3++) {
      var gy2 = pT + (ph / 4) * g3;
      var gv2 = maxVal * (1 - g3 / 4);
      svg += '<line x1="' + pL + '" y1="' + gy2.toFixed(1) + '" x2="' + (pL + pw) + '" y2="' + gy2.toFixed(1) + '" stroke="' + pGridClr + '" stroke-width="1"/>';
      svg += '<text x="' + (pL - 8) + '" y="' + (gy2 + 4).toFixed(1) + '" text-anchor="end" fill="' + pYLblClr + '" font-size="11" font-weight="700" ' + FONT + '>' + round1(gv2) + '%</text>';
    }
    svg += '<line x1="' + pL + '" y1="' + baseY + '" x2="' + (pL + pw) + '" y2="' + baseY + '" stroke="' + pAxisClr + '" stroke-width="1.5"/>';

    items.forEach(function (item, idx) {
      var bx = pL + idx * barSlot + (barSlot - barW) / 2;
      var baseH = bH(item.base), topH = bH(item.top);
      var barTopY = baseY - baseH - topH;

      // Stress top (requirement headroom)
      if (topH > 1) {
        svg += '<rect x="' + bx.toFixed(1) + '" y="' + barTopY.toFixed(1) + '" width="' + barW + '" height="' + topH.toFixed(1) + '" rx="10" fill="' + item.color + '" fill-opacity="0.28"/>';
        svg += '<line x1="' + bx.toFixed(1) + '" y1="' + (baseY - baseH).toFixed(1) + '" x2="' + (bx + barW).toFixed(1) + '" y2="' + (baseY - baseH).toFixed(1) + '" stroke="' + item.color + '" stroke-width="1" stroke-dasharray="3 3" stroke-opacity="0.6"/>';
      }
      // Base bar
      svg += '<rect x="' + (bx + 4).toFixed(1) + '" y="' + (baseY - baseH + 4).toFixed(1) + '" width="' + (barW - 2).toFixed(1) + '" height="' + Math.max(0, baseH - 2).toFixed(1) + '" rx="10" fill="' + item.color + '" fill-opacity="0.14"/>';
      svg += '<rect x="' + bx.toFixed(1) + '" y="' + (baseY - baseH).toFixed(1) + '" width="' + barW + '" height="' + baseH.toFixed(1) + '" rx="10" fill="' + item.color + '" fill-opacity="0.92"/>';

      // Value label
      svg += txt(bx + barW / 2, barTopY - 12, round1(item.base + item.top) + '%', { size: 14, weight: 800, fill: item.color });

      // Instrument label
      svg += txt(bx + barW / 2, H - 24, item.label, { size: 13, weight: 800, fill: pBarLblClr });
      // Description sub-label
      var desc = policyDesc[item.label] || '';
      if (desc) svg += txt(bx + barW / 2, H - 8, desc, { size: 9.5, fill: 'rgba(52,70,98,0.72)' });
    });

    return svg + '</svg>';
  };

  // ─── Init ────────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchUpdate);
  } else {
    patchUpdate();
  }

})();
