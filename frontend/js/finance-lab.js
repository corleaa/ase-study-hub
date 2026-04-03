function getFinanceLabState() {
  if (!window.__studyHubFinanceLab) {
    window.__studyHubFinanceLab = {
      mode: 'investments',
      initialInvestment: 300000,
      annualCashflow: 85000,
      discountRate: 9,
      years: 5,
      growthRate: 4,
      expectedReturn: 11,
      volatility: 18,
      exposure: 60,
      scenario: 'baseline',
      leverage: 4.2,
      liquidityBuffer: 150,
      capitalBuffer: 19,
      stressShock: 26,
      creditGrowth: 9.5,
      concentrationRisk: 30,
      householdDebt: 43,
      contagionRisk: 24,
      policyRate: 6.5,
      inflation: 5,
      marketVol: 18,
      refinancingGap: 28,
      budgetDeficit: 6.2
    };
  }
  return window.__studyHubFinanceLab;
}

function getFinanceLabModeConfig(mode) {
  var configs = {
    investments: {
      title: 'Investments',
      hero: 'Studio interactiv pentru investiții, risc și stabilitate',
      copy: 'Construiești scenarii de investiții, vezi cash flow-urile actualizate, distribuțiile de randament și presiunea din stres într-un singur workspace.',
      zone1: 'Time Value & Valuation',
      zone1Copy: 'Pleci de la investiția inițială, vezi fluxurile pe ani și observi cum rata de actualizare comprimă valoarea prezentă.',
      zone2: 'Risk & Distributions',
      zone2Copy: 'Vezi distribuția rezultatelor, nu doar valoarea medie. Când volatilitatea crește, riscul se mută spre extreme.',
      zone3: 'Stress Testing',
      zone3Copy: 'Transformi un scenariu abstract într-o poveste concretă: cost mai mare al finanțării, portofoliu mai slab și presiune pe capital.',
      zone4: 'Market & Stability',
      zone4Copy: 'Legi dobânzile, inflația, leverage-ul și volatilitatea de stabilitatea generală.'
    },
    modeling: {
      title: 'Modeling',
      hero: 'Workspace pentru modelare financiară și sensitivity analysis',
      copy: 'Lucrezi pe ipoteze, vezi efectul lor în timp real și poți folosi aceeași logică pentru forecast, valuation și scenarii de bază/adverse.',
      zone1: 'Forecast & Valuation',
      zone1Copy: 'Testezi ipoteze de creștere, discount și orizont ca într-un model financiar dinamic.',
      zone2: 'Parameter Sensitivity',
      zone2Copy: 'Înțelegi ce variabile mută cel mai mult rezultatul final și cum se lărgește banda de incertitudine.',
      zone3: 'Model Stress',
      zone3Copy: 'Aplici șocuri pe capital, lichiditate și refinanțare pentru a vedea ce rupe modelul primul.',
      zone4: 'System Balance',
      zone4Copy: 'Vezi dacă setul de ipoteze rămâne coerent într-un mediu financiar tensionat.'
    },
    analysis: {
      title: 'Analysis',
      hero: 'Analiză financiară vizuală cu scenarii și distribuții',
      copy: 'Compari randamente, downside, presiune pe bilanț și stabilitate fără să sari între foi și formule ascunse.',
      zone1: 'Cash Flow Analysis',
      zone1Copy: 'Observi cum decizia de investiție se schimbă în funcție de discounting și profilul fluxurilor.',
      zone2: 'Return Profile',
      zone2Copy: 'Curba îți arată imediat dacă profilul de risc-randament devine prea agresiv.',
      zone3: 'Balance Sheet Pressure',
      zone3Copy: 'Testezi rezistența bilanțului când cresc pierderile, costul finanțării și nevoia de refinanțare.',
      zone4: 'Market Conditions',
      zone4Copy: 'Corelezi condițiile de piață cu stabilitatea structurală a instituției sau portofoliului.'
    },
    stability: {
      title: 'Stability',
      hero: 'Stabilitate financiară și supraveghere macroprudențială',
      copy: 'Lucrezi ca într-un laborator de stabilitate: vezi ciclul creditului, buffer-ele, canalele de contagiune și cum se erodează reziliența sistemului sub șoc.',
      zone1: 'Buffers & Credit Cycle',
      zone1Copy: 'Legi creșterea creditului și datoria gospodăriilor de capacitatea buffer-elor de a absorbi presiunea înainte să intre scenariile adverse.',
      zone2: 'Tail Risk & Contagion',
      zone2Copy: 'Nu urmărești un randament, ci coada distribuției pierderilor sistemice și cât de repede se propagă fragilitatea între sectoare.',
      zone3: 'Macro Stress Ladder',
      zone3Copy: 'Scenariile mută simultan capitalul, lichiditatea, gap-ul de refinanțare și costul de risc, exact ca într-un exercițiu macroprudențial.',
      zone4: 'System Vulnerability Map',
      zone4Copy: 'Radarul și indicatorii de stabilitate arată unde se concentrează riscul: credit, housing, interconnectedness sau piață.'
    },
    monetary: {
      title: 'Monetary Policy',
      hero: 'Politici monetare, transmisie și stabilitate financiară',
      copy: 'Vezi cum se propagă dobânzile, inflația și volatilitatea prin bilanțuri, randamente și presiunea de refinanțare.',
      zone1: 'Discounting Under Policy Shift',
      zone1Copy: 'Ratele de politică monetară modifică direct discounting-ul și valoarea prezentă a fluxurilor viitoare.',
      zone2: 'Yield Distribution',
      zone2Copy: 'Distribuția randamentelor se mută odată cu regimul de dobânzi și volatilități mai ridicate.',
      zone3: 'Transmission Stress',
      zone3Copy: 'Testezi cum intră șocul monetar în capital, lichiditate și profitabilitate.',
      zone4: 'Policy Stability Map',
      zone4Copy: 'Observi relația dintre rata de politică monetară, inflație, leverage și stabilitate.'
    }
  };
  return configs[mode] || configs.investments;
}

function setFinanceLabMode(mode) {
  var finance = getFinanceLabState();
  finance.mode = mode;
  var presets = {
    investments: { discountRate: 9, growthRate: 4, expectedReturn: 11, volatility: 18, leverage: 4.2, policyRate: 6.5, inflation: 5.1, marketVol: 24 },
    modeling: { discountRate: 8, growthRate: 3, expectedReturn: 9, volatility: 14, leverage: 3.8, policyRate: 5.5, inflation: 4.2, marketVol: 18 },
    analysis: { discountRate: 10, growthRate: 2, expectedReturn: 7, volatility: 22, leverage: 4.8, policyRate: 6.8, inflation: 5.9, marketVol: 28 },
    stability: { discountRate: 11, growthRate: 1, expectedReturn: 4, volatility: 27, leverage: 4.8, capitalBuffer: 19, liquidityBuffer: 150, creditGrowth: 9.5, concentrationRisk: 30, householdDebt: 43, contagionRisk: 24, policyRate: 6.5, inflation: 5, marketVol: 18, refinancingGap: 28, budgetDeficit: 6.2 },
    monetary: { discountRate: 12, growthRate: 1.5, expectedReturn: 6, volatility: 24, leverage: 4.6, policyRate: 8.5, inflation: 7.1, marketVol: 29, refinancingGap: 38 }
  };
  Object.assign(finance, presets[mode] || presets.investments);
  if (mode === 'stability' && !getFinanceStabilityScenarioPresets()[finance.scenario]) {
    finance.scenario = 'baseline';
  }
  if (mode !== 'stability' && !['base', 'adverse', 'crisis'].includes(finance.scenario)) {
    finance.scenario = 'adverse';
  }
  var page = document.getElementById('pageContent');
  if (state.tab === 'finance' && page) renderFinanceLab(page);
}

function financeMoney(n) {
  return n.toLocaleString('ro-RO', { maximumFractionDigits: 0 }) + ' RON';
}

function financePct(n, digits) {
  var precision = digits == null ? 1 : digits;
  return n.toLocaleString('ro-RO', { minimumFractionDigits: precision, maximumFractionDigits: precision }) + '%';
}

function financeClamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function financeNorm(value, min, max) {
  if (max <= min) return 0;
  return financeClamp((value - min) / (max - min), 0, 1);
}

function financeAvg(values) {
  if (!values.length) return 0;
  return values.reduce(function(sum, value) { return sum + value; }, 0) / values.length;
}

function financeFieldDisplay(field, value) {
  if (field === 'initialInvestment' || field === 'annualCashflow') return Math.round(value).toLocaleString('ro-RO') + ' RON';
  if (field === 'exposure') return Math.round(value).toLocaleString('ro-RO') + ' mil. RON';
  if (field === 'leverage') return value.toLocaleString('ro-RO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'x';
  if (field === 'concentrationRisk' || field === 'contagionRisk') return Math.round(value).toLocaleString('ro-RO') + '/100';
  if (field === 'budgetDeficit') return value.toLocaleString('ro-RO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '% PIB';
  if (field === 'years' || field === 'stressShock') return Math.round(value).toLocaleString('ro-RO');
  return value.toLocaleString('ro-RO', { minimumFractionDigits: value % 1 ? 1 : 0, maximumFractionDigits: 1 }) + '%';
}

function financeSlider(field, label, value, min, max, step, hint) {
  var decimals = String(step).indexOf('.') >= 0 ? String(step).split('.')[1].length : 0;
  return '<div class="finance-control' + (hint ? ' finance-control--sim' : '') + '">'
    + '<div class="finance-control-row"><label>' + label + (hint ? ' <span class="finance-control-help" title="' + escapeHtml(hint) + '">?</span>' : '') + '</label><div class="finance-control-value"><strong data-finance-value-for="' + field + '">' + financeFieldDisplay(field, value) + '</strong><input class="finance-control-number" data-finance-number-for="' + field + '" type="number" min="' + min + '" max="' + max + '" step="' + step + '" value="' + Number(value).toFixed(decimals) + '"></div></div>'
    + '<input data-finance-input="' + field + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">'
    + (hint ? '<div class="finance-control-hint">' + escapeHtml(hint) + '</div>' : '')
    + '</div>';
}

function normalCdfApprox(z) {
  var t = 1 / (1 + 0.2316419 * Math.abs(z));
  var d = 0.3989423 * Math.exp(-z * z / 2);
  var prob = 1 - d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z >= 0 ? prob : 1 - prob;
}

function financeLineChartSvg(metrics) {
  var width = 620, height = 250, padL = 46, padR = 20, padT = 16, padB = 30;
  var plotW = width - padL - padR;
  var plotH = height - padT - padB;
  var points = metrics.finance.mode === 'stability' ? metrics.bufferPath : metrics.pvFlows;
  var maxY = Math.max.apply(null, points.map(function(p) { return Math.max(p.nominal, p.discounted); }));
  function x(i) { return padL + (points.length === 1 ? plotW / 2 : i * (plotW / (points.length - 1))); }
  function y(v) { return padT + plotH - (v / maxY) * plotH; }
  var nominalPath = '';
  var discountedPath = '';
  points.forEach(function(point, idx) {
    nominalPath += (idx ? ' L ' : 'M ') + x(idx).toFixed(2) + ' ' + y(point.nominal).toFixed(2);
    discountedPath += (idx ? ' L ' : 'M ') + x(idx).toFixed(2) + ' ' + y(point.discounted).toFixed(2);
  });
  var areaPath = discountedPath + ' L ' + x(points.length - 1).toFixed(2) + ' ' + (padT + plotH) + ' L ' + x(0).toFixed(2) + ' ' + (padT + plotH) + ' Z';
  var svg = '<svg viewBox="0 0 ' + width + ' ' + height + '"><defs><linearGradient id="finAreaA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f29b6d" stop-opacity="0.34"/><stop offset="100%" stop-color="#f29b6d" stop-opacity="0.02"/></linearGradient></defs>';
  for (var g = 0; g <= 4; g++) {
    var gy = padT + (plotH / 4) * g;
    svg += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (padL + plotW) + '" y2="' + gy + '" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>';
  }
  svg += '<path class="fin-anim-fade" d="' + areaPath + '" fill="url(#finAreaA)"/>';
  svg += '<path class="fin-anim-draw" d="' + nominalPath + '" fill="none" stroke="#73c9a6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  svg += '<path class="fin-anim-draw" d="' + discountedPath + '" fill="none" stroke="#f29b6d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  points.forEach(function(point, idx) {
    svg += '<circle class="fin-anim-fade" cx="' + x(idx).toFixed(2) + '" cy="' + y(point.discounted).toFixed(2) + '" r="4.5" fill="#f29b6d" stroke="#1d171c" stroke-width="2"/>';
    svg += '<text class="fin-anim-fade" x="' + x(idx).toFixed(2) + '" y="' + (height - 8) + '" text-anchor="middle" fill="rgba(255,255,255,0.55)" font-size="11">' + (metrics.finance.mode === 'stability' ? point.label : 'Y' + point.year) + '</text>';
  });
  return svg + '</svg>';
}

function financeDistributionSvg(metrics) {
  var width = 620, height = 250, padL = 30, padR = 30, padT = 18, padB = 36;
  var plotW = width - padL - padR;
  var plotH = height - padT - padB;
  var isStability = metrics.finance.mode === 'stability';
  var axisColor = isStability ? 'rgba(37,51,70,0.68)' : 'rgba(255,255,255,0.14)';
  var gridColor = isStability ? 'rgba(56,73,96,0.22)' : 'rgba(255,255,255,0.08)';
  var labelColor = isStability ? 'rgba(39,53,73,0.98)' : 'rgba(255,255,255,0.55)';
  var center = isStability ? metrics.tailLossMedian : metrics.finance.expectedReturn;
  var spread = isStability ? Math.max(metrics.tailLossSpread, 0.0001) : Math.max(metrics.finance.volatility, 0.0001);
  var minX = isStability
    ? Math.max(0, Math.floor((center - spread * 2.5) / 5) * 5)
    : -40;
  var maxX = isStability
    ? Math.max(32, Math.ceil((center + spread * 3.2) / 5) * 5)
    : 40;
  var points = [];
  var maxDensity = 0;
  for (var i = 0; i <= 48; i++) {
    var value = minX + (maxX - minX) * (i / 48);
    var density = Math.exp(-0.5 * Math.pow((value - center) / spread, 2));
    points.push({ value: value, density: density });
    maxDensity = Math.max(maxDensity, density);
  }
  function x(v) { return padL + ((v - minX) / (maxX - minX)) * plotW; }
  function y(d) { return padT + plotH - (d / maxDensity) * plotH; }
  var line = '';
  points.forEach(function(point, idx) {
    line += (idx ? ' L ' : 'M ') + x(point.value).toFixed(2) + ' ' + y(point.density).toFixed(2);
  });
  var area = line + ' L ' + x(maxX).toFixed(2) + ' ' + (padT + plotH) + ' L ' + x(minX).toFixed(2) + ' ' + (padT + plotH) + ' Z';
  var markers = [
    { label: isStability ? 'Mild' : 'P10', value: Math.max(minX, Math.min(maxX, isStability ? metrics.tailLossMild : metrics.p10)), color: '#e9bb74' },
    { label: isStability ? 'Median' : 'P50', value: Math.max(minX, Math.min(maxX, isStability ? metrics.tailLossMedian : metrics.p50)), color: '#f29b6d' },
    { label: isStability ? 'Tail' : 'P90', value: Math.max(minX, Math.min(maxX, isStability ? metrics.tailLossTail : metrics.p90)), color: '#73c9a6' }
  ];
  var zeroX = minX <= 0 && maxX >= 0 ? x(0) : null;
  var svg = '<svg viewBox="0 0 ' + width + ' ' + height + '"><defs><linearGradient id="finAreaB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8ab8d8" stop-opacity="0.42"/><stop offset="100%" stop-color="#8ab8d8" stop-opacity="0.04"/></linearGradient></defs>';
  if (zeroX !== null) {
    svg += '<rect x="' + padL + '" y="' + padT + '" width="' + Math.max(0, zeroX - padL) + '" height="' + plotH + '" fill="rgba(224,141,134,0.08)"/>';
    svg += '<rect x="' + zeroX + '" y="' + padT + '" width="' + Math.max(0, padL + plotW - zeroX) + '" height="' + plotH + '" fill="rgba(115,201,166,0.05)"/>';
  }
  for (var g = 0; g <= 4; g++) {
    var gy = padT + (plotH / 4) * g;
    svg += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (padL + plotW) + '" y2="' + gy + '" stroke="' + gridColor + '" stroke-width="1"/>';
  }
  svg += '<line x1="' + padL + '" y1="' + (padT + plotH) + '" x2="' + (padL + plotW) + '" y2="' + (padT + plotH) + '" stroke="' + axisColor + '" stroke-width="1"/>';
  if (zeroX !== null) {
    svg += '<line x1="' + zeroX + '" y1="' + padT + '" x2="' + zeroX + '" y2="' + (padT + plotH) + '" stroke="' + axisColor + '" stroke-width="1.5"/>';
  }
  svg += '<path class="fin-anim-fade" d="' + area + '" fill="url(#finAreaB)"/>';
  svg += '<path class="fin-anim-draw" d="' + line + '" fill="none" stroke="#79add6" stroke-width="' + (isStability ? '4.8' : '3') + '" stroke-linecap="round" stroke-linejoin="round"/>';
  markers.forEach(function(marker, idx) {
    var mx = x(marker.value).toFixed(2);
    svg += '<line class="fin-anim-link" x1="' + mx + '" y1="' + padT + '" x2="' + mx + '" y2="' + (padT + plotH) + '" stroke="' + marker.color + '" stroke-width="2" stroke-dasharray="5 6"/>';
    svg += '<text class="fin-anim-fade" x="' + mx + '" y="' + (padT + 14 + idx * 2) + '" text-anchor="middle" fill="' + marker.color + '" font-size="12" font-weight="800">' + marker.label + '</text>';
  });
  svg += '<text x="' + padL + '" y="' + (height - 10) + '" fill="' + labelColor + '" font-size="11">' + financePct(minX, 0) + '</text>';
  if (zeroX !== null) {
    svg += '<text x="' + zeroX + '" y="' + (height - 10) + '" text-anchor="middle" fill="' + (isStability ? '#243348' : 'rgba(255,255,255,0.85)') + '" font-size="11" font-weight="700">0%</text>';
  }
  svg += '<text x="' + (width - padR) + '" y="' + (height - 10) + '" text-anchor="end" fill="' + labelColor + '" font-size="11">' + financePct(maxX, 0) + '</text>';
  return svg + '</svg>';
}

function financeStressSvg(metrics) {
  var width = 620, height = 250, pad = 24, baseY = 212, barW = 84;
  var isStability = metrics.finance.mode === 'stability';
  var axisColor = isStability ? 'rgba(42,57,78,0.42)' : 'rgba(255,255,255,0.16)';
  var labelColor = isStability ? 'rgba(34,47,67,0.98)' : 'rgba(255,255,255,0.62)';
  var items = metrics.finance.mode === 'stability'
    ? [
      { label: 'CET1', value: Math.max(0, metrics.capitalRatio), color: metrics.capitalRatio > 14 ? '#73c9a6' : metrics.capitalRatio > 10 ? '#e9bb74' : '#e08d86', max: 22 },
      { label: 'LCR', value: Math.max(0, metrics.liquidityCoverage), color: metrics.liquidityCoverage > 120 ? '#73c9a6' : metrics.liquidityCoverage > 100 ? '#e9bb74' : '#e08d86', max: 220 },
      { label: 'Gap proxy', value: Math.max(0, metrics.creditGapStress), color: metrics.creditGapStress < 2 ? '#73c9a6' : metrics.creditGapStress < 10 ? '#e9bb74' : '#e08d86', max: 16 },
      { label: 'Contagion', value: Math.max(0, metrics.contagionPressure), color: metrics.contagionPressure < 35 ? '#73c9a6' : metrics.contagionPressure < 55 ? '#e9bb74' : '#e08d86', max: 80 }
    ]
    : [
      { label: 'Capital', value: Math.max(0, metrics.capitalRatio), color: metrics.capitalRatio > 10 ? '#73c9a6' : metrics.capitalRatio > 8 ? '#e9bb74' : '#e08d86', max: 18 },
      { label: 'Lichiditate', value: Math.max(0, metrics.liquidityCoverage), color: metrics.liquidityCoverage > 110 ? '#73c9a6' : metrics.liquidityCoverage > 100 ? '#e9bb74' : '#e08d86', max: 160 },
      { label: 'NPL', value: Math.max(0, metrics.nplRate), color: metrics.nplRate < 6 ? '#73c9a6' : metrics.nplRate < 10 ? '#e9bb74' : '#e08d86', max: 18 },
      { label: 'Drag', value: Math.max(0, metrics.earningsDrag), color: metrics.earningsDrag < 10 ? '#73c9a6' : metrics.earningsDrag < 18 ? '#e9bb74' : '#e08d86', max: 28 }
    ];
  var svg = '<svg viewBox="0 0 ' + width + ' ' + height + '">';
  if (isStability) {
    svg += '<rect x="' + pad + '" y="34" width="' + (width - pad * 2) + '" height="52" rx="18" fill="rgba(94,166,140,0.10)"/>';
    svg += '<rect x="' + pad + '" y="86" width="' + (width - pad * 2) + '" height="54" rx="18" fill="rgba(233,187,116,0.13)"/>';
    svg += '<rect x="' + pad + '" y="140" width="' + (width - pad * 2) + '" height="58" rx="18" fill="rgba(224,141,134,0.13)"/>';
    svg += '<text x="' + (pad + 12) + '" y="54" text-anchor="start" fill="rgba(76,127,106,0.98)" font-size="13" font-weight="900">Zonă sigură</text>';
    svg += '<text x="' + (pad + 12) + '" y="108" text-anchor="start" fill="rgba(187,125,51,0.98)" font-size="13" font-weight="900">Supraveghere</text>';
    svg += '<text x="' + (pad + 12) + '" y="164" text-anchor="start" fill="rgba(190,66,84,0.98)" font-size="13" font-weight="900">Zonă critică</text>';
  }
  svg += '<line x1="' + pad + '" y1="' + baseY + '" x2="' + (width - pad) + '" y2="' + baseY + '" stroke="' + axisColor + '" stroke-width="1"/>';
  items.forEach(function(item, idx) {
    var x = 52 + idx * 138;
    var h = Math.max(16, (item.value / item.max) * 150);
    svg += '<rect class="fin-anim-bar" x="' + x + '" y="' + (baseY - h) + '" width="' + barW + '" height="' + h + '" rx="18" fill="' + item.color + '" fill-opacity="0.88" stroke="rgba(36,51,72,0.14)" stroke-width="2"/>';
    svg += '<text class="fin-anim-fade" x="' + (x + barW / 2) + '" y="' + (baseY - h - 8) + '" text-anchor="middle" fill="' + item.color + '" font-size="14" font-weight="800">' + ((item.label === 'Drag' || item.label === 'Contagion') ? Math.round(item.value) + (item.label === 'Drag' ? 'bps' : '/100') : (item.label === 'LCR' ? financePct(item.value, 0) : financePct(item.value, 1))) + '</text>';
    svg += '<text class="fin-anim-fade" x="' + (x + barW / 2) + '" y="' + (baseY + 22) + '" text-anchor="middle" fill="' + labelColor + '" font-size="12" font-weight="700">' + item.label + '</text>';
  });
  return svg + '</svg>';
}

function financeStabilitySvg(metrics) {
  var width = 620, height = 260, cx = 310, cy = 132, radius = 90;
  var isStability = metrics.finance.mode === 'stability';
  var ringColor = isStability ? 'rgba(39,55,76,0.24)' : 'rgba(255,255,255,0.08)';
  var axisColor = isStability ? 'rgba(33,47,66,0.42)' : 'rgba(255,255,255,0.12)';
  var labelColor = isStability ? 'rgba(38,52,73,0.98)' : 'rgba(255,255,255,0.6)';
  var axes = [
    { label: isStability ? 'Capital' : 'Stability', value: isStability ? Math.max(0, Math.min(100, metrics.finance.capitalBuffer * 5)) : metrics.stabilityScore },
    { label: 'Liquidity', value: Math.max(0, Math.min(100, metrics.finance.liquidityBuffer - 60)) },
    { label: isStability ? 'Credit Cycle' : 'Capital', value: isStability ? Math.max(0, Math.min(100, 100 - metrics.creditHeat)) : Math.max(0, Math.min(100, metrics.finance.capitalBuffer * 5)) },
    { label: isStability ? 'Housing' : 'Market Risk', value: isStability ? Math.max(0, Math.min(100, 100 - metrics.housingFragility)) : Math.max(0, Math.min(100, 100 - metrics.finance.marketVol * 1.7)) },
    { label: isStability ? 'Network' : 'Debt Load', value: isStability ? Math.max(0, Math.min(100, 100 - metrics.contagionPressure)) : Math.max(0, Math.min(100, 100 - metrics.debtStress)) }
  ];
  var polygon = '';
  var svg = '<svg viewBox="0 0 ' + width + ' ' + height + '">';
  for (var ring = 1; ring <= 4; ring++) {
    var ringPath = '';
    axes.forEach(function(axis, idx) {
      var angle = -Math.PI / 2 + idx * (Math.PI * 2 / axes.length);
      var px = cx + Math.cos(angle) * radius * (ring / 4);
      var py = cy + Math.sin(angle) * radius * (ring / 4);
      ringPath += (idx ? ' L ' : 'M ') + px.toFixed(2) + ' ' + py.toFixed(2);
    });
    svg += '<path d="' + ringPath + ' Z" fill="none" stroke="' + ringColor + '" stroke-width="1"/>';
  }
  axes.forEach(function(axis, idx) {
    var angle = -Math.PI / 2 + idx * (Math.PI * 2 / axes.length);
    var ex = cx + Math.cos(angle) * radius;
    var ey = cy + Math.sin(angle) * radius;
    var px = cx + Math.cos(angle) * radius * (axis.value / 100);
    var py = cy + Math.sin(angle) * radius * (axis.value / 100);
    polygon += (idx ? ' L ' : 'M ') + px.toFixed(2) + ' ' + py.toFixed(2);
    svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + ex.toFixed(2) + '" y2="' + ey.toFixed(2) + '" stroke="' + axisColor + '" stroke-width="1"/>';
    svg += '<text x="' + (cx + Math.cos(angle) * (radius + 30)).toFixed(2) + '" y="' + (cy + Math.sin(angle) * (radius + 30)).toFixed(2) + '" text-anchor="middle" fill="' + labelColor + '" font-size="12" font-weight="700">' + axis.label + '</text>';
    if (isStability) {
      svg += '<text x="' + (cx + Math.cos(angle) * (radius + 30)).toFixed(2) + '" y="' + (cy + Math.sin(angle) * (radius + 44)).toFixed(2) + '" text-anchor="middle" fill="rgba(67,82,103,0.92)" font-size="11" font-weight="700">' + Math.round(axis.value) + '/100</text>';
    }
  });
  svg += '<path d="' + polygon + ' Z" fill="rgba(242,155,109,0.20)" stroke="' + (isStability ? '#243348' : '#f29b6d') + '" stroke-width="3.8"/>';
  if (isStability) {
    svg += '<path d="' + polygon + ' Z" fill="none" stroke="#f29b6d" stroke-width="2.6"/>';
  }
  return svg + '</svg>';
}

function financeSparklineSvg(values, color) {
  var width = 120, height = 38, pad = 4;
  var min = Math.min.apply(null, values);
  var max = Math.max.apply(null, values);
  // Ensure a minimum visual range so even flat series show something
  var span = Math.max(0.5, max - min);
  var path = '', areaPath = '';
  var baseY = height - pad;
  values.forEach(function(v, i) {
    var x = pad + i * ((width - pad * 2) / (values.length - 1));
    var y = height - pad - ((v - min) / span) * (height - pad * 2 - 4);
    var op = i ? ' L ' : 'M ';
    path += op + x.toFixed(2) + ' ' + y.toFixed(2);
    if (i === 0) areaPath = 'M ' + x.toFixed(2) + ' ' + baseY + ' L ' + x.toFixed(2) + ' ' + y.toFixed(2);
    else areaPath += ' L ' + x.toFixed(2) + ' ' + y.toFixed(2);
  });
  var lastX = (pad + (values.length - 1) * ((width - pad * 2) / (values.length - 1))).toFixed(2);
  var lastY = (height - pad - ((values[values.length - 1] - min) / span) * (height - pad * 2 - 4)).toFixed(2);
  areaPath += ' L ' + lastX + ' ' + baseY + ' Z';
  var gradId = 'spkG' + Math.round(Math.random() * 99999);
  return '<svg viewBox="0 0 ' + width + ' ' + height + '">'
    + '<defs><linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.24"/>'
    + '<stop offset="100%" stop-color="' + color + '" stop-opacity="0.02"/>'
    + '</linearGradient></defs>'
    + '<path d="' + areaPath + '" fill="url(#' + gradId + ')"/>'
    + '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<circle cx="' + lastX + '" cy="' + lastY + '" r="3.2" fill="' + color + '"/>'
    + '</svg>';
}

function financeHistorySeries(current, deltas) {
  return deltas.map(function(delta) {
    return Math.max(0, current + delta);
  });
}

function financeStabilityRiskBoardHtml(metrics) {
  var risks = metrics.riskBoard || [];
  return '<div class="finance-risk-board">' + risks.map(function(risk) {
    return '<div class="finance-risk-item">'
      + '<span class="finance-risk-dot" style="background:' + risk.color + ';"></span>'
      + '<div><div class="finance-risk-title">' + risk.title + '</div><div class="finance-risk-copy">' + risk.copy + '</div></div>'
      + '<div class="finance-risk-meta"><span class="finance-risk-badge" style="color:' + risk.color + ';background:' + risk.bg + ';">' + risk.level + '</span><span class="finance-risk-trend" style="color:' + risk.color + ';">' + risk.trend + '</span></div>'
      + '</div>';
  }).join('') + '</div>';
}

function financeVulnerabilityHtml(metrics) {
  return '<div class="finance-vuln-grid">' + metrics.vulnerabilityCards.map(function(card) {
    return '<div class="finance-vuln-card" style="background:' + card.color + ';">'
      + '<div><div class="finance-vuln-title">' + card.title + '</div><div class="finance-vuln-copy">' + card.copy + '</div></div>'
      + '<div class="finance-vuln-tone">' + card.tone + '</div>'
      + '</div>';
  }).join('') + '</div>';
}

function financeScorecardHtml(metrics) {
  return '<div class="finance-scorecard"><table class="finance-scorecard-table"><thead><tr><th>Indicator</th><th>Bandă prudentă</th><th>Istoric</th><th>Acum</th><th>UE/Bench</th></tr></thead><tbody>'
    + metrics.scorecard.map(function(row) {
      return '<tr>'
        + '<td class="finance-scorecard-label">' + row.label + '</td>'
        + '<td class="finance-scorecard-band">' + row.band + '</td>'
        + '<td class="finance-scorecard-spark">' + financeSparklineSvg(row.history, row.color) + '</td>'
        + '<td class="finance-scorecard-value" style="color:' + row.color + ';">' + row.value + '</td>'
        + '<td class="finance-scorecard-benchmark">' + row.benchmark + '</td>'
        + '</tr>';
    }).join('') + '</tbody></table></div>';
}

function financePolicySvg(metrics) {
  var width = 620, height = 240, padL = 38, padR = 20, padT = 18, padB = 28;
  var marketPressure = financeNorm(metrics.finance.marketVol, 10, 45) * 100;
  var items = [
    { label: 'CCyB', base: metrics.ccybNeed, top: Math.max(0, metrics.creditGapStress * 0.12), color: '#4b83d1' },
    { label: 'SyRB', base: Math.max(0, Math.min(3.5, Math.max(0, metrics.nplRate - 3) * 0.45 + metrics.contagionPressure * 0.012)), top: Math.max(0, (metrics.contagionPressure - 35) * 0.025), color: '#5fb49c' },
    { label: 'O-SII', base: Math.max(0.5, Math.min(2.5, 0.55 + metrics.systemicRiskScore * 0.015)), top: Math.max(0, metrics.finance.leverage * 0.06), color: '#8b78cf' },
    { label: 'MREL', base: Math.max(18, Math.min(30, 20 + metrics.finance.capitalBuffer * 0.42)), top: Math.max(0, metrics.shockAbsorption * 0.05), color: '#e08d86' }
  ];
  var maxVal = 32;
  var barW = 84;
  var gap = 50;
  var svg = '<svg viewBox="0 0 ' + width + ' ' + height + '">';
  svg += '<rect x="' + padL + '" y="34" width="' + (width - padL - padR) + '" height="34" rx="16" fill="rgba(94,166,140,0.08)"/>';
  svg += '<rect x="' + padL + '" y="68" width="' + (width - padL - padR) + '" height="58" rx="16" fill="rgba(233,187,116,0.09)"/>';
  svg += '<rect x="' + padL + '" y="126" width="' + (width - padL - padR) + '" height="70" rx="16" fill="rgba(224,141,134,0.10)"/>';
  svg += '<text x="' + (padL + 8) + '" y="56" text-anchor="start" fill="rgba(76,127,106,0.92)" font-size="13" font-weight="900">Buffere confortabile</text>';
  svg += '<text x="' + (padL + 8) + '" y="98" text-anchor="start" fill="rgba(187,125,51,0.94)" font-size="13" font-weight="900">Calibrare atentă</text>';
  svg += '<text x="' + (padL + 8) + '" y="154" text-anchor="start" fill="rgba(190,66,84,0.94)" font-size="13" font-weight="900">Intervenție necesară</text>';
  for (var g = 0; g <= 4; g++) {
    var gy = padT + ((height - padT - padB) / 4) * g;
    svg += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (width - padR) + '" y2="' + gy + '" stroke="rgba(86,102,122,0.16)" stroke-width="1"/>';
  }
  items.forEach(function(item, idx) {
    var x = padL + 26 + idx * (barW + gap);
    var baseH = (item.base / maxVal) * (height - padT - padB);
    var topH = (item.top / maxVal) * (height - padT - padB);
    var yBase = height - padB - baseH;
    svg += '<rect class="fin-anim-bar" x="' + x + '" y="' + yBase.toFixed(2) + '" width="' + barW + '" height="' + baseH.toFixed(2) + '" rx="16" fill="' + item.color + '" fill-opacity="0.92" stroke="rgba(36,51,72,0.18)" stroke-width="2"/>';
    svg += '<rect class="fin-anim-fade" x="' + x + '" y="' + (yBase - topH).toFixed(2) + '" width="' + barW + '" height="' + topH.toFixed(2) + '" rx="16" fill="' + item.color + '" fill-opacity="0.28"/>';
    if (item.label !== 'MREL') {
      svg += '<text class="fin-anim-fade" x="' + (x + barW / 2) + '" y="' + (height - 34) + '" text-anchor="middle" fill="rgba(73,89,110,0.86)" font-size="10" font-weight="700">buffer</text>';
    } else {
      svg += '<text class="fin-anim-fade" x="' + (x + barW / 2) + '" y="' + (height - 34) + '" text-anchor="middle" fill="rgba(73,89,110,0.86)" font-size="10" font-weight="700">resoluție</text>';
    }
    svg += '<text class="fin-anim-fade" x="' + (x + barW / 2) + '" y="' + (height - 8) + '" text-anchor="middle" fill="rgba(46,60,80,0.92)" font-size="12" font-weight="700">' + item.label + '</text>';
    svg += '<text class="fin-anim-fade" x="' + (x + barW / 2) + '" y="' + (yBase - topH - 8).toFixed(2) + '" text-anchor="middle" fill="' + item.color + '" font-size="14" font-weight="800">' + item.base.toLocaleString('ro-RO', { maximumFractionDigits: 1 }) + (item.label === 'MREL' ? '%' : '%') + '</text>';
  });
  return svg + '</svg>';
}

function financeRiskLevelMeta(score) {
  if (score >= 75) return { label: 'Foarte ridicat', color: '#c84b5a' };
  if (score >= 55) return { label: 'Ridicat', color: '#de8b3d' };
  if (score >= 30) return { label: 'Moderat', color: '#6f9fc9' };
  return { label: 'Redus', color: '#5ea68c' };
}

function financeNetworkInfoPayload(key, metrics) {
  var map = {
    credit_boom: {
      title: 'Credit boom',
      score: Math.round(metrics.creditHeat),
      what: 'Arată cât de mult ritmul creditării depășește o dinamică sustenabilă și începe să împingă sistemul într-o fază prociclică.',
      high: 'La scor mare, creditarea accelerează mai repede decât fundamentele, iar riscul este acumularea de vulnerabilități care ies la suprafață după o corecție.',
      low: 'La scor mic, ciclul creditului este mai temperat și presiunea sistemică venită din expansiunea bilanțurilor rămâne controlabilă.',
      example: 'Exemplu: creditele ipotecare și de consum cresc rapid, prețurile activelor urcă, iar băncile relaxează standardele de creditare.'
    },
    market_vol: {
      title: 'Volatilitate piață',
      score: Math.round(metrics.finance.marketVol),
      what: 'Măsoară cât de instabil devine mediul de piață pentru prețuri, finanțare și reevaluarea activelor.',
      high: 'La scor mare, reevaluările sunt bruște, costul finanțării urcă și pierderile mark-to-market se pot transmite în bilanțuri.',
      low: 'La scor mic, piețele rămân ordonate și mișcările de preț nu forțează ajustări rapide în sistem.',
      example: 'Exemplu: randamentele obligațiunilor cresc repede, piețele de acțiuni corectează, iar costul de hedging și finanțare se scumpește.'
    },
    refinancing: {
      title: 'Refinanțare',
      score: Math.round(metrics.finance.refinancingGap),
      what: 'Arată presiunea de rulare a pasivelor și cât de dependent este sistemul de accesul continuu la finanțare.',
      high: 'La scor mare, nevoia de refinanțare devine un punct de fragilitate: dacă piețele se închid, stresul se mută rapid spre lichiditate.',
      low: 'La scor mic, maturitățile și profilele de finanțare sunt mai bine distribuite și șocul de rulare este mai ușor de absorbit.',
      example: 'Exemplu: o bancă sau un grup de instituții trebuie să rostogolească volume mari de datorie într-o perioadă cu spread-uri crescute.'
    },
    capital_liquidity: {
      title: 'Capital & lichiditate',
      score: Math.round(Math.max(0, 100 - metrics.stabilityScore)),
      what: 'Acest canal arată cât de mult se transformă șocurile în presiune directă asupra amortizoarelor de capital și lichiditate.',
      high: 'La scor mare, sistemul începe să consume buffer-ele și apare riscul ca șocul să nu mai fie absorbit, ci transmis mai departe.',
      low: 'La scor mic, amortizoarele rămân funcționale și pot absorbi șocul fără să forțeze reacții defensive puternice.',
      example: 'Exemplu: creșterea pierderilor și a haircuts-urilor reduce CET1 și LCR simultan, ceea ce restrânge capacitatea de creditare.'
    },
    contagion_channel: {
      title: 'Canal de contagiune',
      score: Math.round(metrics.contagionPressure),
      what: 'Arată viteza cu care un șoc local poate fi transmis între segmente prin expuneri comune, finanțare, sentiment și reevaluări.',
      high: 'La scor mare, un șoc într-un segment poate fi amplificat în restul sistemului, inclusiv prin efecte indirecte.',
      low: 'La scor mic, legăturile există, dar propagarea rămâne limitată și mai lentă.',
      example: 'Exemplu: pierderile dintr-o zonă de piață duc la retrageri din fonduri, costuri mai mari pentru bănci și presiune pe activele suverane.'
    },
    banks_ifn: {
      title: 'Bănci & IFN',
      score: Math.round(metrics.systemicRiskScore),
      what: 'Indică presiunea relativă cu care șocul ajunge în nucleul intermedierii financiare.',
      high: 'La scor mare, creditarea, calitatea activelor și costul de finanțare se pot deteriora simultan în intermedierea bancară și nebancară.',
      low: 'La scor mic, segmentul rămâne mai rezilient și are spațiu să absoarbă șocul fără efecte sistemice puternice.',
      example: 'Exemplu: băncile reduc oferta de credit, IFN-urile văd costuri mai mari, iar standardele de creditare se înăspresc.'
    },
    funds_insurance: {
      title: 'Fonduri & asigurări',
      score: Math.round(metrics.tailLossTail * 3),
      what: 'Arată cât de mult se transferă șocul spre investitori instituționali și portofolii sensibile la reevaluare.',
      high: 'La scor mare, cresc răscumpărările, pierderile de portofoliu și nevoia de ajustare a pozițiilor.',
      low: 'La scor mic, acest segment rămâne mai stabil și nu devine amplificator major al șocului.',
      example: 'Exemplu: ieșiri din fonduri și pierderi pe obligațiuni sau acțiuni creează presiune suplimentară pe piețe și lichiditate.'
    },
    sovereign: {
      title: 'Canal suveran',
      score: Math.round(metrics.housingFragility),
      what: 'Reflectă legătura dintre stresul financiar, costul finanțării publice și efectele indirecte prin active suverane.',
      high: 'La scor mare, spread-urile suverane, costul datoriei și expunerile sistemului la active publice devin un canal clar de transmitere.',
      low: 'La scor mic, relația cu segmentul suveran rămâne stabilă și nu agravează propagarea șocului.',
      example: 'Exemplu: randamentele titlurilor de stat cresc, portofoliile se reevaluează, iar costul de finanțare urcă pentru întregul sistem.'
    }
  };
  return map[key];
}

function openFinanceNetworkInfo(key) {
  var metrics = getFinanceLabMetrics();
  var info = financeNetworkInfoPayload(key, metrics);
  if (!info) return;
  var level = financeRiskLevelMeta(info.score);
  var body = '<div class="modal-overlay" data-finance-modal="close-if-overlay">';
  body += '<div class="modal-box" style="max-width:620px;">';
  body += '<div class="modal-header"><div class="modal-title">' + escapeHtml(info.title) + '</div><button class="modal-close" data-finance-action="close-modal">✕</button></div>';
  body += '<div style="display:grid;gap:16px;">';
  body += '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;"><span style="display:inline-flex;padding:7px 12px;border-radius:999px;background:' + level.color + '18;color:' + level.color + ';border:1px solid ' + level.color + '55;font-size:.76rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;">' + level.label + '</span><span style="font-family:var(--font-mono);font-size:1rem;font-weight:800;color:var(--text-primary);">' + info.score + '/100</span></div>';
  body += '<div style="color:var(--text-secondary);font-size:.92rem;line-height:1.7;">' + escapeHtml(info.what) + '</div>';
  body += '<div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:18px;padding:14px 16px;color:var(--text-secondary);line-height:1.65;font-size:.88rem;"><strong style="display:block;color:var(--text-primary);margin-bottom:6px;">Interpretare la scorul actual</strong>' + escapeHtml(info.score >= 50 ? info.high : info.low) + '</div>';
  body += '<div style="background:var(--accent-muted);border:1px solid var(--accent-border);border-radius:18px;padding:14px 16px;color:var(--text-secondary);line-height:1.65;font-size:.88rem;"><strong style="display:block;color:var(--text-primary);margin-bottom:6px;">Exemplu concret</strong>' + escapeHtml(info.example) + '</div>';
  body += '</div></div></div>';
  document.getElementById('modalContainer').innerHTML = body;
}

function getFinanceStabilityScenarioPresets() {
  return {
    baseline: {
      title: 'Baseline',
      copy: 'Tensiuni moderate, transmisie controlată.',
      values: { policyRate: 6.5, inflation: 5.0, budgetDeficit: 6.2, marketVol: 18, contagionRisk: 24, stressShock: 26, creditGrowth: 9.5, leverage: 4.8, liquidityBuffer: 150, capitalBuffer: 19, refinancingGap: 28, householdDebt: 43, concentrationRisk: 30 }
    },
    inflation_shock: {
      title: 'Inflation shock',
      copy: 'Inflația persistă și apasă simultan pe debitori și lichiditate.',
      values: { policyRate: 8.8, inflation: 8.5, budgetDeficit: 6.9, marketVol: 28, contagionRisk: 30, stressShock: 40, creditGrowth: 8.5, leverage: 5.4, liquidityBuffer: 138, capitalBuffer: 17.2, refinancingGap: 36, householdDebt: 50, concentrationRisk: 34 }
    },
    fiscal_crisis: {
      title: 'Fiscal crisis',
      copy: 'Deficitul și datoria publică devin focarul principal de stres.',
      values: { policyRate: 8.2, inflation: 7.0, budgetDeficit: 9.0, marketVol: 30, contagionRisk: 34, stressShock: 46, creditGrowth: 8.0, leverage: 5.5, liquidityBuffer: 132, capitalBuffer: 16.8, refinancingGap: 44, householdDebt: 48, concentrationRisk: 36 }
    },
    credit_bubble: {
      title: 'Credit bubble',
      copy: 'Creditul și leverage-ul cresc prea repede înainte de corecție.',
      values: { policyRate: 7.1, inflation: 6.1, budgetDeficit: 6.4, marketVol: 24, contagionRisk: 32, stressShock: 44, creditGrowth: 18.0, leverage: 7.6, liquidityBuffer: 138, capitalBuffer: 17.0, refinancingGap: 38, householdDebt: 72, concentrationRisk: 58 }
    },
    banking_stress: {
      title: 'Banking stress',
      copy: 'NPL, refinanțarea și lichiditatea intră în zona critică.',
      values: { policyRate: 8.0, inflation: 6.5, budgetDeficit: 7.0, marketVol: 32, contagionRisk: 55, stressShock: 58, creditGrowth: 8.5, leverage: 6.8, liquidityBuffer: 108, capitalBuffer: 13.5, refinancingGap: 58, householdDebt: 54, concentrationRisk: 44 }
    },
    external_shock: {
      title: 'External shock',
      copy: 'Șoc global pe piețe, finanțare și active riscante.',
      values: { policyRate: 8.4, inflation: 7.2, budgetDeficit: 7.2, marketVol: 42, contagionRisk: 48, stressShock: 52, creditGrowth: 8.2, leverage: 6.0, liquidityBuffer: 122, capitalBuffer: 15.8, refinancingGap: 52, householdDebt: 50, concentrationRisk: 40 }
    }
  };
}

function financeStressStatus(score) {
  if (score < 30) return { label: 'Safe', color: '#73c9a6', tone: 'safe' };
  if (score < 50) return { label: 'Watch', color: '#e9bb74', tone: 'watch' };
  if (score < 70) return { label: 'Stress', color: '#e08d86', tone: 'stress' };
  return { label: 'Crisis', color: '#b64d66', tone: 'crisis' };
}

function financeShockNarrative(metrics) {
  var scenario = metrics.finance.scenario || 'baseline';
  var drivers = [
    { key: 'inflation', value: metrics.finance.inflation + metrics.finance.policyRate * 0.35, text: 'Creșterea inflației și a dobânzii lovește debitorii, ridică serviciul datoriei și începe să împingă NPL-urile și costul refinanțării în sus.' },
    { key: 'fiscal', value: metrics.finance.budgetDeficit * 7 + metrics.publicDebt * 0.35, text: 'Deficitul și datoria publică pun presiune pe canalul suveran, ridică costul finanțării și mută șocul spre bănci și lichiditate.' },
    { key: 'credit', value: metrics.creditHeat + metrics.finance.leverage * 4, text: 'Expansiunea creditului și leverage-ul accelerează pro-ciclicitatea: când apare șocul, ajustarea se face mai brutal în bilanțuri.' },
    { key: 'contagion', value: metrics.contagionPressure + metrics.finance.marketVol * 0.8, text: 'Interconectarea și volatilitatea pieței fac ca stresul să circule rapid între stat, bănci, firme și populație.' }
  ].sort(function(a, b) { return b.value - a.value; });
  var lead = drivers[0];
  var secondary = drivers[1];
  var scenarioPrefix = {
    baseline: 'În scenariul de bază, tensiunea rămâne controlată.',
    inflation_shock: 'În șocul inflaționist, presiunea pornește din prețuri și dobânzi.',
    fiscal_crisis: 'În criza fiscală, canalul suveran devine sursa dominantă de stres.',
    credit_bubble: 'În bula de credit, acumularea ciclică face corecția mai abruptă.',
    banking_stress: 'În stres bancar, bilanțurile și lichiditatea transmit cel mai repede șocul.',
    external_shock: 'În șoc extern, piețele și finanțarea globală împing stresul în economie.'
  }[scenario] || 'Scenariul curent mută presiunea prin mai multe canale simultan.';
  var bridge = {
    inflation: 'Efectul secundar apare apoi în refinanțare și în bilanțurile băncilor.',
    fiscal: 'Efectul secundar apare apoi în costul de finanțare al băncilor și al economiei.',
    credit: 'Efectul secundar apare apoi în default, ajustarea consumului și reculul investițiilor.',
    contagion: 'Efectul secundar apare apoi în reevaluări, lichiditate și transmitere rapidă între sectoare.'
  }[secondary.key];
  return scenarioPrefix + ' ' + lead.text + ' ' + bridge;
}

function financeStabilityHeroHtml(metrics) {
  var presets = getFinanceStabilityScenarioPresets();
  var status = financeStressStatus(metrics.systemStressGauge);
  // 260° gauge arc: circumference of 260/360 * 2π*90 = 408.4
  var gaugeArc = 408.4;
  var gaugeFill = ((Math.max(0, Math.min(100, metrics.systemStressGauge)) / 100) * gaugeArc).toFixed(2);
  return '<section class="finance-sim-hero">'
    + '<div class="finance-sim-grid">'
    + '<div class="finance-sim-panel">'
    + '<div class="finance-sim-kicker">Financial Stability Simulator</div>'
    + '<div class="finance-sim-title">System Stress Gauge</div>'
    + '<div class="finance-sim-copy">Simulezi cum un șoc pe inflație, dobândă, deficit sau interconectare circulă prin sistem. Nu vezi doar indicatori — ci traseul riscului prin economie.</div>'
    + '<div class="finance-sim-scenarios">'
    + Object.keys(presets).map(function(key) {
      var preset = presets[key];
      return '<button class="finance-sim-scenario' + (metrics.finance.scenario === key ? ' active' : '') + '" data-fin-scenario-card="' + key + '" data-finance-action="set-scenario" data-finance-scenario="' + key + '"><strong>' + preset.title + '</strong><span>' + preset.copy + '</span></button>';
    }).join('')
    + '</div></div>'
    + '<div class="finance-sim-panel">'
    + '<div class="finance-gauge-shell">'
    + '<div class="finance-gauge-wrap" id="finStressGauge" style="--finance-gauge-color:' + status.color + ';">'
    + '<div class="finance-gauge-glow"></div>'
    + '<svg viewBox="0 0 230 230">'
    + '<circle class="finance-gauge-track" cx="115" cy="115" r="90" stroke-dasharray="408.4 157.1"></circle>'
    + '<circle class="finance-gauge-progress" id="finStressGaugeProgress" cx="115" cy="115" r="90" stroke-dasharray="' + gaugeFill + ' 565.49" stroke-dashoffset="0"></circle>'
    + '</svg>'
    + '<div class="finance-gauge-needle" id="finStressGaugeNeedle"></div><div class="finance-gauge-center-dot"></div>'
    + '<div class="finance-gauge-core"><div class="finance-gauge-label"><strong id="finStressGaugeValue">' + Math.round(metrics.systemStressGauge) + '</strong><span id="finStressGaugeState">' + status.label + '</span></div></div>'
    + '</div>'
    + '<div class="finance-gauge-meta">'
    + '<div class="finance-gauge-status" id="finStressGaugeBadge" style="--finance-gauge-color:' + status.color + ';"><i></i>' + status.label + ' mode</div>'
    + '<div class="finance-gauge-summary" id="finStressGaugeSummary">' + financeShockNarrative(metrics) + '</div>'
    + '<div class="finance-gauge-mini">'
    + '<div class="finance-gauge-mini-card"><strong>NPL simulat</strong><span id="finMiniNpl">' + financePct(metrics.nplRate, 1) + '</span></div>'
    + '<div class="finance-gauge-mini-card"><strong>Datorie publică</strong><span id="finMiniDebt">' + financePct(metrics.publicDebt, 1) + '</span></div>'
    + '<div class="finance-gauge-mini-card"><strong>LCR sub stres</strong><span id="finMiniTail">' + financePct(metrics.liquidityCoverage, 0) + '</span></div>'
    + '</div></div></div>'
    + '<div class="finance-sim-explainer" id="finShockExplainer"><strong>Lanțul de propagare:</strong> ' + financeShockNarrative(metrics) + '</div>'
    + '</div></div>'
    + '<div class="finance-sim-panel" style="margin-top:20px;">'
    + '<div class="finance-sim-kicker">Interactive Inputs</div>'
    + '<div class="finance-sim-controls-grid">'
    + financeSlider('policyRate', 'Rată de politică monetară', metrics.finance.policyRate, 1, 12, 0.1, 'Dacă urcă, se scumpește creditul și refinanțarea pentru firme, populație și stat.')
    + financeSlider('inflation', 'Inflație anuală', metrics.finance.inflation, 1, 15, 0.1, 'Inflația persistentă reduce veniturile reale și mărește tensiunea pe debitori.')
    + financeSlider('budgetDeficit', 'Deficit bugetar', metrics.finance.budgetDeficit, 1, 12, 0.1, 'Deficitul mare mărește presiunea pe datoria publică și pe canalul suveran.')
    + financeSlider('marketVol', 'Volatilitate piețe', metrics.finance.marketVol, 5, 50, 1, 'Piața mai volatilă înseamnă reevaluări mai bruște și pierderi mark-to-market.')
    + financeSlider('contagionRisk', 'Interconectare sistemică', metrics.finance.contagionRisk, 5, 90, 1, 'Legături mai strânse între segmente înseamnă propagare mai rapidă a șocului.')
    + financeSlider('stressShock', 'Severitate scenariu', metrics.finance.stressShock, 10, 80, 1, 'Controlează cât de puternic lovește șocul în scenariul curent.')
    + financeSlider('creditGrowth', 'Ritm credit privat', metrics.finance.creditGrowth, 0, 20, 0.5, 'Creditul care crește prea repede alimentează faza prociclică.')
    + financeSlider('leverage', 'Leverage sistemic', metrics.finance.leverage, 1, 10, 0.1, 'Leverage-ul mare lasă mai puțin spațiu de absorbție când începe corecția.')
    + '</div>'
    + '</div>'
    + '<div class="finance-sim-panel" style="margin-top:20px;">'
    + '<div class="finance-sim-kicker">Shock Propagation</div>'
    + '<div class="finance-propagation-headline">Vezi cum șocul circulă prin sistem: stat → bănci → firme → populație</div>'
    + '<div class="finance-propagation-grid">'
    + '<div class="finance-propagation-node" id="finNodeState" data-delay="0"><strong>Stat</strong><span id="finNodeStateVal">' + Math.round(metrics.stateSectorStress) + '/100</span><small>Deficitul și datoria publică deschid presiunea pe finanțare.</small><div class="finance-propagation-link" id="finLinkState" style="--link-fill:' + Math.round(metrics.linkStateBanks) + '%;--link-color:#f29b6d;"></div></div>'
    + '<div class="finance-propagation-node" id="finNodeBanks" data-delay="1"><strong>Bănci</strong><span id="finNodeBanksVal">' + Math.round(metrics.banksSectorStress) + '/100</span><small>NPL, CET1 și lichiditatea absorb sau transmit mai departe șocul.</small><div class="finance-propagation-link" id="finLinkBanks" style="--link-fill:' + Math.round(metrics.linkBanksFirms) + '%;--link-color:#6fa2ea;"></div></div>'
    + '<div class="finance-propagation-node" id="finNodeFirms" data-delay="2"><strong>Firme</strong><span id="finNodeFirmsVal">' + Math.round(metrics.firmsSectorStress) + '/100</span><small>Firmele văd cost mai mare al creditului și cerere mai slabă.</small><div class="finance-propagation-link" id="finLinkFirms" style="--link-fill:' + Math.round(metrics.linkFirmsHouseholds) + '%;--link-color:#7cc8a7;"></div></div>'
    + '<div class="finance-propagation-node" id="finNodeHouseholds" data-delay="3"><strong>Populație</strong><span id="finNodeHouseholdsVal">' + Math.round(metrics.householdsSectorStress) + '/100</span><small>Serviciul datoriei și inflația apasă direct pe consum și risc de default.</small></div>'
    + '</div>'
    + '</div></section>';
}

function financeStabilityBriefHtml(metrics) {
  var status = financeStressStatus(metrics.systemStressGauge);
  return '<section class="finance-stability-brief">'
    + '<div class="finance-stability-brief-head">'
    + '<div><div class="finance-zone-kicker">Cum se citește simulatorul</div><div class="finance-zone-title">Transformă indicatorii abstracți în efecte pe care le vezi în economie</div></div>'
    + '<div class="finance-stability-brief-badge" style="--brief-color:' + status.color + ';">Regim curent: ' + status.label + '</div>'
    + '</div>'
    + '<div class="finance-stability-brief-grid">'
    + '<div class="finance-stability-brief-card"><strong>1. Citești șocul</strong><p>Dobânda, inflația, deficitul și leverage-ul descriu sursa tensiunii. Nu sunt doar numere: ele spun dacă se scumpește creditul, se erodează venitul real sau se blochează refinanțarea.</p></div>'
    + '<div class="finance-stability-brief-card"><strong>2. Urmărești transmisia</strong><p>Simulatorul arată cum stresul trece din canalul suveran și financiar în bănci, firme și populație. Asta este povestea socială a stabilității, nu doar o matrice de risc.</p></div>'
    + '<div class="finance-stability-brief-card"><strong>3. Interpretezi reacția</strong><p>Dacă pierderile se mută în coadă, CET1 și LCR se comprimă, iar CCyB urcă, înseamnă că sistemul consumă amortizoare și intră într-o zonă în care politica macroprudențială devine relevantă.</p></div>'
    + '</div>'
    + '<div class="finance-stability-brief-strip">'
    + '<div class="finance-stability-brief-metric"><span>Regim sistemic</span><strong>' + status.label + '</strong></div>'
    + '<div class="finance-stability-brief-metric"><span>NPL estimat</span><strong>' + financePct(metrics.nplRate, 1) + '</strong></div>'
    + '<div class="finance-stability-brief-metric"><span>CET1 după stres</span><strong>' + financePct(metrics.capitalRatio, 1) + '</strong></div>'
    + '<div class="finance-stability-brief-metric"><span>LCR după stres</span><strong>' + financePct(metrics.liquidityCoverage, 1) + '</strong></div>'
    + '</div>'
    + '</section>';
}

function financeNetworkSvg(metrics) {
  var width = 620, height = 300;
  var left = [
    { title: 'Credit boom', value: Math.round(metrics.creditHeat), color: '#e08d86' },
    { title: 'Volatilitate piață', value: Math.round(financeNorm(metrics.finance.marketVol, 10, 45) * 100), color: '#d79c63' },
    { title: 'Refinanțare', value: Math.round(financeNorm(metrics.finance.refinancingGap, 20, 70) * 100), color: '#8b78cf' }
  ];
  var middle = [
    { title: 'Capital & lichiditate', value: Math.round((financeNorm(18 - metrics.capitalRatio, 0, 10) * 55) + (financeNorm(130 - metrics.liquidityCoverage, 0, 60) * 45)), color: '#4b83d1' },
    { title: 'Canal de contagiune', value: Math.round(metrics.contagionPressure), color: '#5fb49c' }
  ];
  var right = [
    { title: 'Bănci & IFN', value: Math.round(metrics.banksSectorStress), color: '#4b83d1' },
    { title: 'Fonduri & asigurări', value: Math.round(metrics.contagionPressure * 0.55 + financeNorm(metrics.finance.marketVol, 10, 45) * 45), color: '#5fb49c' },
    { title: 'Canal suveran', value: Math.round(metrics.stateSectorStress), color: '#6e7d91' }
  ];
  // Determine overall stress level for visual intensity
  var netStressLevel = metrics.systemicRiskScore;
  function netStressColor(score) {
    if (score >= 65) return '#c84b5a';
    if (score >= 45) return '#de8b3d';
    if (score >= 25) return '#6f9fc9';
    return '#5ea68c';
  }
  function box(x, y, w, h, item, key) {
    var sColor = netStressColor(item.value);
    var pulseOp = Math.min(0.32, 0.08 + item.value / 300);
    return '<g data-finance-network="' + key + '" style="cursor:pointer">'
      + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="16" fill="' + item.color + '" fill-opacity="0.12" stroke="' + item.color + '" stroke-opacity="0.55" stroke-width="2"/>'
      + '<rect x="' + (x+1) + '" y="' + (y+1) + '" width="' + (w-2) + '" height="4" rx="8" fill="' + sColor + '" fill-opacity="' + pulseOp.toFixed(2) + '"/>'
      + '<text x="' + (x + 12) + '" y="' + (y + 22) + '" fill="#1e2e44" font-size="11.5" font-weight="800" font-family="system-ui,Arial,sans-serif">' + item.title + '</text>'
      + '<text x="' + (x + 12) + '" y="' + (y + 42) + '" fill="' + sColor + '" font-size="17" font-weight="800" font-family="system-ui,Arial,sans-serif">' + item.value + '<tspan font-size="10" fill="rgba(60,80,110,0.7)">/100</tspan></text>'
      + '<text x="' + (x + w - 10) + '" y="' + (y + h - 8) + '" text-anchor="end" fill="rgba(60,80,110,0.55)" font-size="9" font-family="system-ui,Arial,sans-serif">↗ detalii</text>'
      + '</g>';
  }
  function arrow(x1, y1, x2, y2, color) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + color + '" stroke-opacity="0.65" stroke-width="3.5" marker-end="url(#finArrow)"/>';
  }
  function badge(x, y, color, label) {
    var bw = Math.max(58, 12 + label.length * 7.2);
    return '<g>'
      + '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="22" rx="11" fill="' + color + '" fill-opacity="0.14" stroke="' + color + '" stroke-opacity="0.62" stroke-width="1.5"/>'
      + '<text x="' + (x + bw / 2) + '" y="' + (y + 15) + '" text-anchor="middle" fill="' + color + '" font-size="10.5" font-weight="800" font-family="system-ui,Arial,sans-serif">' + label + '</text>'
      + '</g>';
  }
  var svg = '<svg viewBox="0 0 ' + width + ' ' + height + '"><defs><marker id="finArrow" markerWidth="10" markerHeight="10" refX="8" refY="3.5" orient="auto"><polygon points="0 0, 9 3.5, 0 7" fill="#6b7f9a"/></marker></defs>';
  // Column headers
  svg += '<rect x="24" y="16" width="150" height="20" rx="10" fill="rgba(224,141,134,0.14)"/>';
  svg += '<text x="99" y="30" text-anchor="middle" fill="rgba(160,68,80,0.9)" font-size="10" font-weight="800" font-family="system-ui,Arial,sans-serif">1. Surse de șoc</text>';
  svg += '<rect x="230" y="16" width="164" height="20" rx="10" fill="rgba(75,131,209,0.12)"/>';
  svg += '<text x="312" y="30" text-anchor="middle" fill="rgba(52,96,168,0.9)" font-size="10" font-weight="800" font-family="system-ui,Arial,sans-serif">2. Canale de transmitere</text>';
  svg += '<rect x="446" y="16" width="150" height="20" rx="10" fill="rgba(94,180,156,0.12)"/>';
  svg += '<text x="521" y="30" text-anchor="middle" fill="rgba(48,128,104,0.9)" font-size="10" font-weight="800" font-family="system-ui,Arial,sans-serif">3. Zone afectate</text>';
  svg += box(24, 48, 150, 52, left[0], 'credit_boom');
  svg += box(24, 114, 150, 52, left[1], 'market_vol');
  svg += box(24, 180, 150, 52, left[2], 'refinancing');
  svg += box(232, 78, 160, 58, middle[0], 'capital_liquidity');
  svg += box(232, 178, 160, 58, middle[1], 'contagion_channel');
  svg += box(448, 48, 148, 52, right[0], 'banks_ifn');
  svg += box(448, 132, 148, 52, right[1], 'funds_insurance');
  svg += box(448, 216, 148, 52, right[2], 'sovereign');
  svg += arrow(174, 74, 232, 106, '#d79c63');
  svg += arrow(174, 140, 232, 106, '#8b78cf');
  svg += arrow(174, 206, 232, 206, '#e08d86');
  svg += arrow(392, 106, 448, 74, '#4b83d1');
  svg += arrow(392, 106, 448, 158, '#5fb49c');
  svg += arrow(392, 206, 448, 242, '#6e7d91');
  svg += badge(182, 58, '#d79c63', Math.round(metrics.creditGapStress) + ' proxy');
  svg += badge(170, 130, '#8b78cf', Math.round(metrics.finance.refinancingGap) + ' funding');
  svg += badge(170, 206, '#e08d86', Math.round(metrics.contagionPressure) + ' contagion');
  svg += badge(394, 52, '#4b83d1', Math.round(metrics.systemicRiskScore) + ' risk');
  svg += badge(394, 138, '#5fb49c', Math.round(metrics.tailLossTail * 3) + ' spillover');
  svg += badge(394, 224, '#6e7d91', Math.round(metrics.housingFragility) + ' sovereign');
  return svg + '</svg>';
}

function getFinanceLabMetrics() {
  var finance = getFinanceLabState();
  var isStability = finance.mode === 'stability';
  var rate = finance.discountRate / 100;
  var pvFlows = [];
  var totalPV = 0;
  var totalNominal = 0;
  for (var year = 1; year <= finance.years; year++) {
    var nominal = finance.annualCashflow * Math.pow(1 + finance.growthRate / 100, year - 1);
    var discounted = nominal / Math.pow(1 + rate, year);
    pvFlows.push({ year: year, nominal: nominal, discounted: discounted });
    totalPV += discounted;
    totalNominal += nominal;
  }
  var npv = totalPV - finance.initialInvestment;
  var futureValue = finance.initialInvestment * Math.pow(1 + rate, finance.years);
  var payback = finance.initialInvestment / Math.max(finance.annualCashflow, 1);
  var roi = ((totalNominal - finance.initialInvestment) / Math.max(finance.initialInvestment, 1)) * 100;
  var lossProbability = normalCdfApprox((0 - finance.expectedReturn) / Math.max(finance.volatility, 0.0001)) * 100;
  var p10 = finance.expectedReturn - 1.28 * finance.volatility;
  var p50 = finance.expectedReturn;
  var p90 = finance.expectedReturn + 1.28 * finance.volatility;
  var expectedPnl = finance.exposure * finance.expectedReturn / 100;
  var scenarioMeta = {
    base:    { title: 'Scenariu de bază', copy: 'Șocuri mici, piață ordonată, refinanțare normală.' },
    adverse: { title: 'Scenariu advers', copy: 'Costul finanțării crește, lichiditatea se strânge, default-urile urcă.' },
    crisis:  { title: 'Scenariu de criză', copy: 'Volatilitate mare, pierderi accelerate și presiune pe capital.' }
  };
  var scenarioPresetNames = { baseline: 0.22, inflation_shock: 1.1, fiscal_crisis: 1.75, credit_bubble: 1.45, banking_stress: 1.95, external_shock: 1.65 };
  var scenarioShock = scenarioPresetNames[finance.scenario];
  if (scenarioShock == null) {
    scenarioShock = finance.scenario === 'base' ? (isStability ? 0.15 : 0.45) : finance.scenario === 'adverse' ? (isStability ? 1.25 : 1) : (isStability ? 2.45 : 1.55);
  }
  var capitalRatio = finance.capitalBuffer - finance.leverage * 0.72 - scenarioShock * (finance.stressShock / 14) - (isStability ? finance.concentrationRisk / 45 : 0);
  var liquidityCoverage = finance.liquidityBuffer - scenarioShock * (finance.refinancingGap / 2.6) + (finance.policyRate < 5 ? 4 : -2) - (isStability ? finance.contagionRisk / 5.5 : 0);
  var nplRate = 2.4 + scenarioShock * (finance.stressShock / 7.5) + finance.marketVol / 24;
  var earningsDrag = scenarioShock * finance.marketVol * 0.24 + finance.policyRate * 0.7;
  var creditHeat = Math.max(0, (finance.creditGrowth - 8) * 3.8 + (finance.householdDebt - 45) * 1.2 + finance.concentrationRisk * 0.35);
  var cyclePressure = financeAvg([
    financeNorm(finance.creditGrowth, 6, 18),
    financeNorm(finance.householdDebt, 40, 80),
    financeNorm(finance.concentrationRisk, 20, 80)
  ]);
  var fundingPressure = financeAvg([
    financeNorm(finance.refinancingGap, 20, 70),
    financeNorm(finance.marketVol, 10, 45),
    financeNorm(finance.leverage, 3, 9)
  ]);
  var macroPressure = financeAvg([
    financeNorm(finance.policyRate, 2, 11),
    financeNorm(finance.inflation, 2, 12),
    financeNorm(finance.budgetDeficit, 2, 10),
    financeNorm(finance.stressShock, 15, 75)
  ]);
  var networkPressure = financeAvg([
    financeNorm(finance.contagionRisk, 10, 80),
    financeNorm(finance.marketVol, 10, 45),
    financeNorm(finance.concentrationRisk, 20, 80)
  ]);
  var capitalSupport = financeAvg([
    financeNorm(finance.capitalBuffer, 10, 20),
    financeNorm(finance.liquidityBuffer, 95, 160)
  ]);

  creditHeat = financeClamp(100 * (0.54 * cyclePressure + 0.16 * macroPressure + 0.16 * networkPressure + 0.14 * fundingPressure), 0, 100);
  var contagionPressure = financeClamp(100 * (0.50 * networkPressure + 0.22 * fundingPressure + 0.18 * macroPressure + 0.10 * (1 - capitalSupport)), 0, 100);
  var housingFragility = financeClamp(100 * (
    0.55 * financeNorm(finance.householdDebt, 40, 80)
    + 0.20 * financeNorm(finance.policyRate, 2, 11)
    + 0.15 * financeNorm(finance.inflation, 2, 12)
    + 0.10 * cyclePressure
  ), 0, 100);
  capitalRatio = financeClamp(
    19.8
      + (finance.capitalBuffer - 14) * 0.30
      + (finance.liquidityBuffer - 120) * 0.015
      - macroPressure * 4.1
      - fundingPressure * 3.0
      - cyclePressure * 2.2
      - networkPressure * 1.7
      - scenarioShock * 1.1,
    6,
    28
  );
  liquidityCoverage = financeClamp(
    145
      + (finance.liquidityBuffer - 120) * 0.65
      + (finance.capitalBuffer - 14) * 1.4
      - fundingPressure * 48
      - networkPressure * 20
      - macroPressure * 15
      - scenarioShock * 8,
    75,
    260
  );
  nplRate = financeClamp(2.1 + macroPressure * 2.2 + cyclePressure * 1.8 + fundingPressure * 1.0 + scenarioShock * 0.35, 2, 16);
  earningsDrag = financeClamp(35 + macroPressure * 80 + fundingPressure * 65 + networkPressure * 35 + scenarioShock * 12, 20, 240);
  var tailLossMedian = financeClamp(5.2 + cyclePressure * 3.8 + networkPressure * 3.2 + macroPressure * 2.6 + fundingPressure * 2.7 + scenarioShock, 3.5, 20);
  var tailLossSpread = Math.max(1.8, 1.4 + finance.marketVol * 0.03 + finance.contagionRisk * 0.016 + finance.stressShock * 0.018);
  var tailLossMild = Math.max(0, tailLossMedian - 1.1 * tailLossSpread);
  var tailLossTail = Math.min(26, tailLossMedian + 1.45 * tailLossSpread);
  var creditGapStress = financeClamp(-0.8 + cyclePressure * 7.8 + macroPressure * 0.9 + fundingPressure * 0.6 + scenarioShock * 0.75 - capitalSupport * 0.9, -2, 16);
  var guideGap = Math.max(0, creditGapStress);
  var ccybGuide = guideGap <= 2 ? 0 : guideGap >= 10 ? 2.5 : ((guideGap - 2) / 8) * 2.5;
  var ccybNeed = financeClamp(
    ccybGuide
      + Math.max(0, housingFragility - 60) * 0.01
      + Math.max(0, contagionPressure - 60) * 0.008
      - Math.max(0, capitalRatio - 18) * 0.04,
    0,
    2.75
  );
  var publicDebt = financeClamp(48 + (finance.budgetDeficit - 3) * 3.3 + macroPressure * 6 + fundingPressure * 3 + scenarioShock * 1.4, 40, 105);
  var nplPressure = financeClamp(nplRate + finance.policyRate * 0.2 + macroPressure * 2.2, 0, 20);
  var capitalStress = financeNorm(18 - capitalRatio, 0, 10);
  var liquidityStress = financeNorm(130 - liquidityCoverage, 0, 60);
  var nplStress = financeNorm(nplRate, 2, 10);
  var cycleStress = financeNorm(Math.max(0, creditGapStress), 0, 10);
  var sovereignStress = financeAvg([
    financeNorm(publicDebt, 50, 95),
    financeNorm(finance.budgetDeficit, 3, 9),
    macroPressure
  ]);
  var systemicRiskScore = financeClamp(100 * (
    0.20 * capitalStress
      + 0.18 * liquidityStress
      + 0.18 * nplStress
      + 0.18 * cycleStress
      + 0.14 * networkPressure
      + 0.12 * sovereignStress
  ), 0, 100);
  var stabilityScore = financeClamp(88 - systemicRiskScore * 0.5 - Math.max(0, tailLossTail - 12) * 1.1 + capitalSupport * 8, 0, 100);
  if (isStability) stabilityScore = financeClamp(stabilityScore, 0, 100);
  else stabilityScore = Math.max(0, Math.min(100, stabilityScore));
  var stateSectorStress = financeClamp(100 * (
    0.42 * financeNorm(publicDebt, 50, 95)
      + 0.28 * financeNorm(finance.budgetDeficit, 3, 9)
      + 0.18 * fundingPressure
      + 0.12 * financeNorm(finance.marketVol, 10, 45)
  ), 0, 100);
  var banksSectorStress = financeClamp(100 * (
    0.30 * capitalStress
      + 0.24 * liquidityStress
      + 0.22 * nplStress
      + 0.24 * networkPressure
  ), 0, 100);
  var firmsSectorStress = financeClamp(100 * (
    0.34 * financeNorm(finance.policyRate, 2, 10)
      + 0.24 * cycleStress
      + 0.22 * fundingPressure
      + 0.20 * financeNorm(finance.marketVol, 10, 45)
  ), 0, 100);
  var householdsSectorStress = financeClamp(100 * (
    0.34 * financeNorm(finance.inflation, 2, 12)
      + 0.28 * financeNorm(finance.policyRate, 2, 10)
      + 0.22 * financeNorm(finance.householdDebt, 40, 80)
      + 0.16 * cycleStress
  ), 0, 100);
  var linkStateBanks = Math.max(0, Math.min(100, stateSectorStress * 0.68 + banksSectorStress * 0.20));
  var linkBanksFirms = Math.max(0, Math.min(100, banksSectorStress * 0.48 + firmsSectorStress * 0.36 + cycleStress * 16));
  var linkFirmsHouseholds = Math.max(0, Math.min(100, firmsSectorStress * 0.44 + householdsSectorStress * 0.40 + financeNorm(finance.inflation, 2, 12) * 16));
  var systemStressGauge = financeClamp(
    0.22 * stateSectorStress
      + 0.30 * banksSectorStress
      + 0.28 * firmsSectorStress
      + 0.20 * householdsSectorStress,
    0,
    100
  );
  var repricingPressure = finance.policyRate * 4.5 + finance.inflation * 3.2;
  var debtStress = finance.leverage * 13 + finance.policyRate * 3.5;
  var shockAbsorption = finance.capitalBuffer * 4 + finance.liquidityBuffer * 0.36 - finance.marketVol * 1.2;
  var bufferPath = [
    { label: 'Credit boom', nominal: Math.max(0, finance.capitalBuffer * 1.6 + finance.liquidityBuffer * 0.2), discounted: Math.max(0, finance.capitalBuffer * 1.35 + finance.liquidityBuffer * 0.14 - creditHeat * 0.22) },
    { label: 'Housing', nominal: Math.max(0, finance.capitalBuffer * 1.55 + finance.liquidityBuffer * 0.18), discounted: Math.max(0, finance.capitalBuffer * 1.18 + finance.liquidityBuffer * 0.12 - housingFragility * 0.19) },
    { label: 'Funding', nominal: Math.max(0, finance.capitalBuffer * 1.48 + finance.liquidityBuffer * 0.16), discounted: Math.max(0, finance.capitalBuffer * 1.05 + finance.liquidityBuffer * 0.1 - finance.refinancingGap * 0.26 - contagionPressure * 0.1) },
    { label: 'Shock', nominal: Math.max(0, finance.capitalBuffer * 1.42 + finance.liquidityBuffer * 0.13), discounted: Math.max(0, finance.capitalBuffer + finance.liquidityBuffer * 0.08 - systemicRiskScore * 0.14 - finance.stressShock * 0.11) },
    { label: 'Buffer left', nominal: Math.max(0, finance.capitalBuffer * 1.35 + finance.liquidityBuffer * 0.11), discounted: Math.max(0, finance.capitalBuffer * 0.92 + finance.liquidityBuffer * 0.07 - systemicRiskScore * 0.1 - finance.stressShock * 0.09) }
  ];
  function riskMeta(score) {
    if (score >= 70) return { level: 'Sever', color: '#c84b5a', bg: 'rgba(200,75,90,0.12)', trend: '↑ ridicat' };
    if (score >= 50) return { level: 'Ridicat', color: '#de8b3d', bg: 'rgba(222,139,61,0.12)', trend: '↗ în creștere' };
    if (score >= 30) return { level: 'Moderat', color: '#6f9fc9', bg: 'rgba(111,159,201,0.12)', trend: '→ persistent' };
    return { level: 'Redus', color: '#5ea68c', bg: 'rgba(94,166,140,0.12)', trend: '↘ controlat' };
  }
  var riskBoard = [
    Object.assign({ title: 'Ciclul creditului și îndatorarea', copy: 'Creșterea creditului și datoria gospodăriilor pot împinge rapid sistemul într-o fază prociclică dacă buffer-ele rămân subțiri.' }, riskMeta(creditHeat)),
    Object.assign({ title: 'Contagiune și interconectare', copy: 'Legăturile dintre bănci, IFN și fonduri pot transmite șocul dintr-un nod în întregul sistem mai repede decât sugerează indicatorii agregați.' }, riskMeta(contagionPressure)),
    Object.assign({ title: 'Piața imobiliară și housing stress', copy: 'Fragilitatea crește când ratele, leverage-ul și povara datoriei gospodăriilor se comprimă simultan pe segmentul imobiliar.' }, riskMeta(housingFragility)),
    Object.assign({ title: 'Reevaluări de piață și refinanțare', copy: 'Volatilitatea de piață și gap-ul de refinanțare pot eroda simultan lichiditatea și capitalul, mai ales în scenarii adverse.' }, riskMeta(Math.min(100, systemicRiskScore * 0.7 + finance.refinancingGap * 0.7)))
  ];
  var vulnerabilityCards = [
    { title: 'Credit și leverage', copy: 'Când creditul crește mai repede decât economia, iar leverage-ul urcă, corecțiile devin mai agresive și mai greu de absorbit.', tone: Math.round(creditHeat) + '/100', color: 'linear-gradient(180deg,#d46a55,#b94655)' },
    { title: 'Capital și lichiditate', copy: 'Aici vezi cât de bine pot băncile să absoarbă un șoc fără să intre imediat în restrângerea creditării.', tone: financePct(Math.max(0, capitalRatio), 1) + ' CET1', color: 'linear-gradient(180deg,#397cc7,#2e5ca8)' },
    { title: 'Contagiune între segmente', copy: 'Legăturile dintre bănci, fonduri, asigurări și stat decid cât de repede un șoc local devine stres sistemic.', tone: Math.round(contagionPressure) + '/100', color: 'linear-gradient(180deg,#6b68c9,#4c53a9)' },
    { title: 'Gospodării și imobiliare', copy: 'Dobânzile ridicate și povara datoriei apasă simultan pe consum, default și piața rezidențială.', tone: Math.round(housingFragility) + '/100', color: 'linear-gradient(180deg,#4ea29d,#318a85)' }
  ];
  // Dynamic sparkline history — scales with stress magnitude for visual reactivity
  var stressScale = 1 + (macroPressure + fundingPressure + cyclePressure) * 0.6;
  var volFactor = 1 + finance.marketVol * 0.018;
  function dynHist(current, baseDeltas) {
    // Scale deltas by stress level, add slight volatility variation
    return baseDeltas.map(function(d, i) {
      var jitter = (i % 2 === 0 ? 1 : -1) * volFactor * 0.08 * Math.abs(d);
      return Math.max(0, current + d * stressScale + jitter);
    });
  }
  var scorecard = [
    { label: 'CET1 după stres', band: '>14% confort | 10-14% watch | <10% critic',
      history: dynHist(Math.max(0, capitalRatio), [3.8, 3.1, 2.5, 1.8, 1.1, 0.4, 0]),
      value: financePct(capitalRatio, 1), benchmark: 'BNR 2024: solv. totală 24,6%',
      color: capitalRatio > 14 ? '#5ea68c' : capitalRatio > 10 ? '#de8b3d' : '#c84b5a' },
    { label: 'LCR după stres', band: '>120% confort | 100-120% watch | <100% critic',
      history: dynHist(Math.max(0, liquidityCoverage), [28, 22, 16, 11, 6, 2, 0]),
      value: financePct(liquidityCoverage, 1), benchmark: 'BNR 2024: LCR 248,8%',
      color: liquidityCoverage > 120 ? '#5ea68c' : liquidityCoverage > 100 ? '#de8b3d' : '#c84b5a' },
    { label: 'Rată NPL simulată', band: '<3% confort | 3-5% watch | >5% risc',
      history: dynHist(nplRate, [-1.2, -1.0, -0.8, -0.55, -0.32, -0.12, 0]),
      value: financePct(nplRate, 1), benchmark: 'BNR 2024: NPL 2,5%',
      color: nplRate < 3 ? '#5ea68c' : nplRate < 5 ? '#de8b3d' : '#c84b5a' },
    { label: 'Gap de credit (proxy)', band: '<2 benign | 2-10 build-up | >10 excesiv',
      history: dynHist(creditGapStress, [-2.8, -2.2, -1.7, -1.1, -0.6, -0.2, 0]),
      value: financePct(creditGapStress, 1), benchmark: 'Ghid Basel: 2-10 pp',
      color: creditGapStress < 2 ? '#5ea68c' : creditGapStress < 10 ? '#de8b3d' : '#c84b5a' },
    { label: 'Scor risc sistemic intern', band: '<35 redus | 35-55 watch | >55 ridicat',
      history: dynHist(systemicRiskScore, [-18, -14, -10, -6.5, -3.8, -1.4, 0]),
      value: Math.round(systemicRiskScore) + '/100', benchmark: 'Țintă <35',
      color: systemicRiskScore < 35 ? '#5ea68c' : systemicRiskScore < 55 ? '#de8b3d' : '#c84b5a' },
    { label: 'CCyB sugerat', band: '0% redus | 0-1% build-up | 1-2.5% activ',
      history: dynHist(ccybNeed, [-0.6, -0.52, -0.4, -0.28, -0.16, -0.06, 0]),
      value: financePct(ccybNeed, 1), benchmark: 'RO 1,0%',
      color: ccybNeed < 0.1 ? '#5ea68c' : ccybNeed < 1 ? '#de8b3d' : '#c84b5a' }
  ];
  var overviewTone = isStability
    ? (stabilityScore >= 62 ? 'Sistemul rămâne absorbant, dar amortizoarele trebuie monitorizate în jurul creditului, refinanțării și pieței.' : 'Fragilitatea sistemică se acumulează prea repede; buffer-ele nu mai compensează complet ciclul creditului și canalele de contagiune.')
    : (npv >= 0 && stabilityScore >= 55 ? 'Poziție rezonabilă pentru un scenariu de lucru.' : 'Modelul arată presiune și merită stresat înainte de decizie.');
  return { finance: finance, pvFlows: pvFlows, bufferPath: bufferPath, npv: npv, futureValue: futureValue, payback: payback, roi: roi, lossProbability: lossProbability, p10: p10, p50: p50, p90: p90, expectedPnl: expectedPnl, scenarioMeta: scenarioMeta, capitalRatio: capitalRatio, liquidityCoverage: liquidityCoverage, nplRate: nplRate, nplPressure: nplPressure, earningsDrag: earningsDrag, creditHeat: creditHeat, contagionPressure: contagionPressure, housingFragility: housingFragility, publicDebt: publicDebt, tailLossMedian: tailLossMedian, tailLossSpread: tailLossSpread, tailLossMild: tailLossMild, tailLossTail: tailLossTail, systemicRiskScore: systemicRiskScore, ccybNeed: ccybNeed, creditGapStress: creditGapStress, stabilityScore: stabilityScore, systemStressGauge: systemStressGauge, stateSectorStress: stateSectorStress, banksSectorStress: banksSectorStress, firmsSectorStress: firmsSectorStress, householdsSectorStress: householdsSectorStress, linkStateBanks: linkStateBanks, linkBanksFirms: linkBanksFirms, linkFirmsHouseholds: linkFirmsHouseholds, repricingPressure: repricingPressure, debtStress: debtStress, shockAbsorption: shockAbsorption, overviewTone: overviewTone, riskBoard: riskBoard, vulnerabilityCards: vulnerabilityCards, scorecard: scorecard };
}

function scheduleFinanceLabUpdate() {
  if (window.__financeLabUpdateRaf) cancelAnimationFrame(window.__financeLabUpdateRaf);
  window.__financeLabUpdateRaf = requestAnimationFrame(function() {
    window.__financeLabUpdateRaf = null;
    updateFinanceLabUI();
  });
}

function financePulse(el) {
  if (!el) return;
  el.classList.remove('finance-live-bump');
  void el.offsetWidth;
  el.classList.add('finance-live-bump');
}

function setFinanceLabValue(field, value) {
  var parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) return;
  getFinanceLabState()[field] = parsed;
  scheduleFinanceLabUpdate();
}

function setFinanceLabScenario(name) {
  var finance = getFinanceLabState();
  finance.scenario = name;
  if (finance.mode === 'stability') {
    var presets = getFinanceStabilityScenarioPresets();
    if (presets[name]) Object.assign(finance, presets[name].values);
  }
  updateFinanceLabUI();
}

function updateFinanceLabUI() {
  if (state.tab !== 'finance') return;
  var metrics = getFinanceLabMetrics();
  var finance = metrics.finance;
  var isStability = finance.mode === 'stability';
  var stabilityPresets = isStability ? getFinanceStabilityScenarioPresets() : null;
  var stabilityPreset = stabilityPresets ? (stabilityPresets[finance.scenario] || stabilityPresets.baseline) : null;
  Object.keys(finance).forEach(function(field) {
    var valueEl = document.querySelector('[data-finance-value-for="' + field + '"]');
    if (valueEl) valueEl.textContent = financeFieldDisplay(field, finance[field]);
    var numberEl = document.querySelector('[data-finance-number-for="' + field + '"]');
    if (numberEl && document.activeElement !== numberEl) numberEl.value = finance[field];
    var rangeEl = document.querySelector('[data-finance-input="' + field + '"]');
    if (rangeEl && document.activeElement !== rangeEl) rangeEl.value = finance[field];
  });
  var kpis = isStability
    ? [
      ['finKpiNpv', Math.round(metrics.systemicRiskScore) + '/100', metrics.systemicRiskScore < 35 ? 'var(--green)' : metrics.systemicRiskScore < 55 ? 'var(--amber)' : 'var(--red)'],
      ['finKpiLoss', financePct(metrics.tailLossTail, 1), metrics.tailLossTail < 12 ? 'var(--green)' : metrics.tailLossTail < 18 ? 'var(--amber)' : 'var(--red)'],
      ['finKpiCapital', financePct(metrics.ccybNeed, 1), metrics.ccybNeed < 1.5 ? 'var(--green)' : metrics.ccybNeed < 2.5 ? 'var(--amber)' : 'var(--red)'],
      ['finKpiStability', Math.round(metrics.stabilityScore) + '/100', metrics.stabilityScore > 65 ? 'var(--green)' : metrics.stabilityScore > 45 ? 'var(--amber)' : 'var(--red)']
    ]
    : [
      ['finKpiNpv', financeMoney(metrics.npv), metrics.npv >= 0 ? 'var(--green)' : 'var(--red)'],
      ['finKpiLoss', financePct(metrics.lossProbability, 1), metrics.lossProbability < 35 ? 'var(--green)' : metrics.lossProbability < 55 ? 'var(--amber)' : 'var(--red)'],
      ['finKpiCapital', financePct(metrics.capitalRatio, 1), metrics.capitalRatio > 10 ? 'var(--green)' : metrics.capitalRatio > 8 ? 'var(--amber)' : 'var(--red)'],
      ['finKpiStability', Math.round(metrics.stabilityScore) + '/100', metrics.stabilityScore > 65 ? 'var(--green)' : metrics.stabilityScore > 45 ? 'var(--amber)' : 'var(--red)']
    ];
  kpis.forEach(function(item) {
    var el = document.getElementById(item[0]);
    if (el) { el.textContent = item[1]; el.style.color = item[2]; financePulse(el); }
  });
  var valuationStory = document.getElementById('finStoryValuation');
  if (valuationStory) valuationStory.innerHTML = isStability
    ? 'Context real: tratează blocul ca pe monitorizarea stabilității unui sistem bancar. Cu ritmul actual al creditului și cu buffer-ele setate aici, capacitatea de absorbție rămasă după șoc coboară spre <strong style="color:' + (metrics.stabilityScore > 55 ? 'var(--green)' : 'var(--red)') + ';">' + Math.round(metrics.stabilityScore) + '/100</strong>.'
    : 'Exemplu real: tratează acest bloc ca pe evaluarea unui proiect de investiții sau a unei linii noi de business. În configurația actuală, VPN-ul este <strong style="color:' + (metrics.npv >= 0 ? 'var(--green)' : 'var(--red)') + ';">' + financeMoney(metrics.npv) + '</strong>, iar payback-ul aproximativ este <strong>' + metrics.payback.toLocaleString('ro-RO', { maximumFractionDigits: 1 }) + ' ani</strong>.';
  var distributionStory = document.getElementById('finStoryDistribution');
  if (distributionStory) distributionStory.innerHTML = isStability
    ? 'Curba nu arată randamente, ci pierdere sistemică. În starea actuală, scenariul median este <strong style="color:' + (metrics.tailLossMedian < 14 ? 'var(--green)' : metrics.tailLossMedian < 18 ? 'var(--amber)' : 'var(--red)') + ';">' + financePct(metrics.tailLossMedian, 1) + '</strong>, iar coada severă urcă la <strong>' + financePct(metrics.tailLossTail, 1) + '</strong>.'
    : 'Cu setările actuale, probabilitatea de pierdere este <strong style="color:' + (metrics.lossProbability < 35 ? 'var(--green)' : metrics.lossProbability < 55 ? 'var(--amber)' : 'var(--red)') + ';">' + financePct(metrics.lossProbability, 1) + '</strong>. Dacă vrei să înțelegi riscul vizual, urmărește cum se lățește curba când crești volatilitatea.';
  var stressStory = document.getElementById('finStoryStress');
  if (stressStory) stressStory.innerHTML = isStability
    ? '<strong>' + escapeHtml(stabilityPreset.title) + ':</strong> ' + escapeHtml(stabilityPreset.copy) + ' ' + (metrics.systemStressGauge < 35
      ? 'Sistemul încă absoarbe șocul fără să intre în regim defensiv.'
      : metrics.systemStressGauge < 55
        ? 'Zona de watch cere monitorizare atentă pe gapul de credit, LCR și NPL.'
        : metrics.systemStressGauge < 75
          ? 'Riscul trece vizibil în capital, lichiditate și propagare între sectoare.'
          : 'Sistemul intră în regim de criză, iar măsurile macroprudențiale și conservarea buffer-elor devin prioritare.')
    : metrics.scenarioMeta[finance.scenario].title + ': ' + (metrics.capitalRatio <= 8 ? 'presiunea pe capital devine critică și probabil ai nevoie de măsuri defensive.' : metrics.liquidityCoverage <= 100 ? 'lichiditatea devine primul punct fragil și trebuie redus refinancing gap-ul.' : 'instituția rezistă, dar costul de risc și profitabilitatea rămân sub presiune.');
  var stabilityStory = document.getElementById('finStoryStability');
  if (stabilityStory) stabilityStory.innerHTML = isStability
    ? financeShockNarrative(metrics) + ' Citește blocul ca pe o poveste socială: statul mută presiune spre bănci, băncile o mută spre costul creditului, iar firmele și populația absorb efectele în consum, investiții și default.'
    : metrics.overviewTone + ' Dacă vrei să testezi o criză de stabilitate, urcă leverage-ul și volatilitatea în același timp; dacă vrei o normalizare, coboară dobânda și îmbunătățește bufferul de lichiditate.';
  var strips = {
    finValuationStrip: isStability
      ? '<div class="finance-stat-chip"><strong>Credit heat</strong><span>' + Math.round(metrics.creditHeat) + '/100</span></div><div class="finance-stat-chip"><strong>Buffer rămas</strong><span>' + Math.round(metrics.stabilityScore) + '/100</span></div><div class="finance-stat-chip"><strong>CET1 sub șoc</strong><span>' + financePct(metrics.capitalRatio, 1) + '</span></div><div class="finance-stat-chip"><strong>LCR sub șoc</strong><span>' + financePct(metrics.liquidityCoverage, 1) + '</span></div>'
      : '<div class="finance-stat-chip"><strong>Valoare viitoare</strong><span>' + financeMoney(metrics.futureValue) + '</span></div><div class="finance-stat-chip"><strong>Payback</strong><span>' + metrics.payback.toLocaleString('ro-RO', { maximumFractionDigits: 1 }) + ' ani</span></div><div class="finance-stat-chip"><strong>ROI nominal</strong><span>' + financePct(metrics.roi, 1) + '</span></div><div class="finance-stat-chip"><strong>Mesaj</strong><span>' + (metrics.npv >= 0 ? 'Proiectul creează valoare netă.' : 'Rata cerută este prea mare pentru fluxurile actuale.') + '</span></div>',
    finDistributionStrip: isStability
      ? '<div class="finance-stat-chip"><strong>Mild loss</strong><span>' + financePct(metrics.tailLossMild, 1) + '</span></div><div class="finance-stat-chip"><strong>Median loss</strong><span>' + financePct(metrics.tailLossMedian, 1) + '</span></div><div class="finance-stat-chip"><strong>Tail loss</strong><span>' + financePct(metrics.tailLossTail, 1) + '</span></div><div class="finance-stat-chip"><strong>Contagion</strong><span>' + Math.round(metrics.contagionPressure) + '/100</span></div>'
      : '<div class="finance-stat-chip"><strong>P10</strong><span>' + financePct(metrics.p10, 1) + '</span></div><div class="finance-stat-chip"><strong>P50</strong><span>' + financePct(metrics.p50, 1) + '</span></div><div class="finance-stat-chip"><strong>P90</strong><span>' + financePct(metrics.p90, 1) + '</span></div><div class="finance-stat-chip"><strong>P&L așteptat</strong><span>' + financeMoney(metrics.expectedPnl * 1000000) + '</span></div>',
    finStressStrip: isStability
      ? '<div class="finance-stat-chip"><strong>CET1</strong><span>' + financePct(metrics.capitalRatio, 1) + '</span></div><div class="finance-stat-chip"><strong>LCR</strong><span>' + financePct(metrics.liquidityCoverage, 1) + '</span></div><div class="finance-stat-chip"><strong>Gap credit (proxy)</strong><span>' + financePct(metrics.creditGapStress, 1) + '</span></div><div class="finance-stat-chip"><strong>CCyB sugerat</strong><span>' + financePct(metrics.ccybNeed, 1) + '</span></div>'
      : '<div class="finance-stat-chip"><strong>Capital</strong><span>' + financePct(metrics.capitalRatio, 1) + '</span></div><div class="finance-stat-chip"><strong>Lichiditate</strong><span>' + financePct(metrics.liquidityCoverage, 1) + '</span></div><div class="finance-stat-chip"><strong>NPL</strong><span>' + financePct(metrics.nplRate, 1) + '</span></div><div class="finance-stat-chip"><strong>Earnings Drag</strong><span>' + Math.round(metrics.earningsDrag) + ' bps</span></div>',
    finStabilityStrip: isStability
      ? '<div class="finance-stat-chip"><strong>Scor stabilitate</strong><span>' + Math.round(metrics.stabilityScore) + '/100</span></div><div class="finance-stat-chip"><strong>Housing fragility</strong><span>' + Math.round(metrics.housingFragility) + '/100</span></div><div class="finance-stat-chip"><strong>Systemic risk</strong><span>' + Math.round(metrics.systemicRiskScore) + '/100</span></div><div class="finance-stat-chip"><strong>Shock absorption</strong><span>' + Math.round(metrics.shockAbsorption) + '/100</span></div>'
      : '<div class="finance-stat-chip"><strong>Scor stabilitate</strong><span>' + Math.round(metrics.stabilityScore) + '/100</span></div><div class="finance-stat-chip"><strong>Repricing</strong><span>' + Math.round(metrics.repricingPressure) + ' bps</span></div><div class="finance-stat-chip"><strong>Debt Stress</strong><span>' + Math.round(metrics.debtStress) + '/100</span></div><div class="finance-stat-chip"><strong>Shock Absorption</strong><span>' + Math.round(metrics.shockAbsorption) + '/100</span></div>'
  };
  Object.keys(strips).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.innerHTML = strips[id]; financePulse(el); }
  });
  if (isStability) {
    var gaugeStatus = financeStressStatus(metrics.systemStressGauge);
    var gaugeArc2 = 408.4; // 260° arc
    var gaugeFill2 = ((Math.max(0, Math.min(100, metrics.systemStressGauge)) / 100) * gaugeArc2).toFixed(2);
    var gaugeProgress = document.getElementById('finStressGaugeProgress');
    if (gaugeProgress) {
      gaugeProgress.style.stroke = gaugeStatus.color;
      gaugeProgress.style.strokeDasharray = gaugeFill2 + ' 565.49';
      gaugeProgress.style.strokeDashoffset = '0';
    }
    var gaugeNeedle = document.getElementById('finStressGaugeNeedle');
    if (gaugeNeedle) gaugeNeedle.style.transform = 'rotate(' + (-220 + metrics.systemStressGauge * 2.6).toFixed(1) + 'deg)';
    var gaugeWrap = document.getElementById('finStressGauge');
    if (gaugeWrap) {
      gaugeWrap.style.setProperty('--finance-gauge-color', gaugeStatus.color);
      gaugeWrap.classList.remove('is-pulsing');
      void gaugeWrap.offsetWidth;
      gaugeWrap.classList.add('is-pulsing');
    }
    var gaugeValue = document.getElementById('finStressGaugeValue');
    if (gaugeValue) gaugeValue.textContent = Math.round(metrics.systemStressGauge);
    var gaugeState = document.getElementById('finStressGaugeState');
    if (gaugeState) gaugeState.textContent = gaugeStatus.label;
    var gaugeBadge = document.getElementById('finStressGaugeBadge');
    if (gaugeBadge) {
      gaugeBadge.style.setProperty('--finance-gauge-color', gaugeStatus.color);
      gaugeBadge.innerHTML = '<i></i>' + gaugeStatus.label + ' mode';
    }
    var gaugeSummary = document.getElementById('finStressGaugeSummary');
    if (gaugeSummary) gaugeSummary.textContent = financeShockNarrative(metrics);
    var miniNpl = document.getElementById('finMiniNpl');
    if (miniNpl) miniNpl.textContent = financePct(metrics.nplRate, 1);
    var miniDebt = document.getElementById('finMiniDebt');
    if (miniDebt) miniDebt.textContent = financePct(metrics.publicDebt, 1);
    var miniTail = document.getElementById('finMiniTail');
    if (miniTail) miniTail.textContent = financePct(metrics.liquidityCoverage, 0);
    var shockExplainer = document.getElementById('finShockExplainer');
    if (shockExplainer) shockExplainer.innerHTML = '<strong>Lanțul de propagare:</strong> ' + financeShockNarrative(metrics);

    // Dynamic descriptions based on stress level
    var nodeMeta = {
      State: {
        low:  'Finanțele publice sunt sustenabile, canalul suveran rămâne stabil.',
        mid:  'Deficitul apasă pe datoria publică — canalul suveran devine relevant.',
        high: 'Datoria publică ridică costul finanțării pentru tot sistemul.',
        crit: 'Criza suverană transmite stres direct în bănci și piețe.'
      },
      Banks: {
        low:  'Buffer-ele absorb fără presiune — creditarea rămâne funcțională.',
        mid:  'NPL și lichiditatea intră sub presiune — supraveghere atentă necesară.',
        high: 'CET1 și LCR se comprimă simultan — transmisia se accelerează.',
        crit: 'Băncile restrâng creditarea și transmit stresul în economia reală.'
      },
      Firms: {
        low:  'Costul creditului este suportabil — investițiile continuă.',
        mid:  'Marjele se comprimă și cererea slăbește — primele semnale în venituri.',
        high: 'Firmele reduc investițiile și crește presiunea pe locuri de muncă.',
        crit: 'Valul de restructurări și defaults amplifică stresul sistemic.'
      },
      Households: {
        low:  'Serviciul datoriei este suportabil — consumul rămâne stabil.',
        mid:  'Inflația și dobânzile reduc venitul real — presiunea crește.',
        high: 'Gospodăriile intră în dificultate — NPL retail urcă vizibil.',
        crit: 'Criza de lichiditate la nivel de gospodărie — cererea se prăbușește.'
      }
    };
    function nodeDesc(key, score) {
      var m = nodeMeta[key];
      if (!m) return '';
      if (score >= 72) return m.crit;
      if (score >= 52) return m.high;
      if (score >= 34) return m.mid;
      return m.low;
    }
    [
      ['State', metrics.stateSectorStress, '#f29b6d'],
      ['Banks', metrics.banksSectorStress, '#6fa2ea'],
      ['Firms', metrics.firmsSectorStress, '#7cc8a7'],
      ['Households', metrics.householdsSectorStress, '#e9bb74']
    ].forEach(function(item) {
      var node = document.getElementById('finNode' + item[0]);
      var nodeVal = document.getElementById('finNode' + item[0] + 'Val');
      var nodeDesc2 = node ? node.querySelector('small') : null;
      if (node) {
        node.style.setProperty('--node-color', item[2]);
        node.style.setProperty('--node-glow', (0.16 + Math.min(0.72, item[1] / 95)).toFixed(2));
        node.classList.toggle('is-hot',      item[1] >= 38);
        node.classList.toggle('is-very-hot', item[1] >= 60);
      }
      if (nodeVal) nodeVal.textContent = Math.round(item[1]) + '/100';
      if (nodeDesc2) nodeDesc2.textContent = nodeDesc(item[0], item[1]);
    });
    [
      ['finLinkState', metrics.linkStateBanks, '#f29b6d'],
      ['finLinkBanks', metrics.linkBanksFirms, '#6fa2ea'],
      ['finLinkFirms', metrics.linkFirmsHouseholds, '#7cc8a7']
    ].forEach(function(item) {
      var link = document.getElementById(item[0]);
      if (!link) return;
      link.style.setProperty('--link-fill', Math.round(item[1]) + '%');
      link.style.setProperty('--link-color', item[2]);
      financePulse(link);
    });
    document.querySelectorAll('[data-fin-scenario-card]').forEach(function(card) {
      card.classList.toggle('active', card.getAttribute('data-fin-scenario-card') === finance.scenario);
    });
  }
  var riskBoard = document.getElementById('finRiskBoard');
  if (riskBoard) { riskBoard.innerHTML = financeStabilityRiskBoardHtml(metrics); financePulse(riskBoard); }
  var vulnMap = document.getElementById('finVulnerabilityMap');
  if (vulnMap) { vulnMap.innerHTML = financeVulnerabilityHtml(metrics); financePulse(vulnMap); }
  var scorecard = document.getElementById('finScorecard');
  if (scorecard) { scorecard.innerHTML = financeScorecardHtml(metrics); financePulse(scorecard); }
  var chartA = document.getElementById('finValuationChart'); if (chartA) { chartA.innerHTML = financeLineChartSvg(metrics); financePulse(chartA); }
  var chartB = document.getElementById('finDistributionChart'); if (chartB) { chartB.innerHTML = financeDistributionSvg(metrics); financePulse(chartB); }
  var chartC = document.getElementById('finStressChart'); if (chartC) { chartC.innerHTML = financeStressSvg(metrics); financePulse(chartC); }
  var chartD = document.getElementById('finStabilityChart'); if (chartD) { chartD.innerHTML = financeStabilitySvg(metrics); financePulse(chartD); }
  var chartPolicy = document.getElementById('finPolicyChart'); if (chartPolicy) { chartPolicy.innerHTML = financePolicySvg(metrics); financePulse(chartPolicy); }
  var chartNetwork = document.getElementById('finNetworkChart'); if (chartNetwork) { chartNetwork.innerHTML = financeNetworkSvg(metrics); financePulse(chartNetwork); }
  document.querySelectorAll('.finance-scenario-card').forEach(function(card) {
    card.classList.toggle('active', card.getAttribute('data-fin-scenario') === finance.scenario);
  });
}

function renderFinanceLab(el) {
  var finance = getFinanceLabState();
  var mode = finance.mode || 'investments';
  var cfg = getFinanceLabModeConfig(mode);
  var isStability = mode === 'stability';
  var html = '<div class="anim"><div class="finance-lab-shell">';
  html += '<div class="dash-hero-v13" style="margin-bottom:0;"><div class="dash-hero-v13-content"><div class="dash-hero-v13-tag">' + icon('chart','xs') + ' Finance Lab · ' + cfg.title + '</div><h1 style="font-size:1.65rem;">' + cfg.hero + '</h1><p class="dash-hero-v13-sub">' + cfg.copy + '</p><div class="finance-mode-tabs">'
    + '<button class="finance-mode-tab ' + (mode === 'investments' ? 'active' : '') + '" data-finance-action="set-mode" data-finance-mode="investments">Investiții</button>'
    + '<button class="finance-mode-tab ' + (mode === 'modeling' ? 'active' : '') + '" data-finance-action="set-mode" data-finance-mode="modeling">Modelare</button>'
    + '<button class="finance-mode-tab ' + (mode === 'analysis' ? 'active' : '') + '" data-finance-action="set-mode" data-finance-mode="analysis">Analiză</button>'
    + '<button class="finance-mode-tab ' + (mode === 'stability' ? 'active' : '') + '" data-finance-action="set-mode" data-finance-mode="stability">Stabilitate</button>'
    + '<button class="finance-mode-tab ' + (mode === 'monetary' ? 'active' : '') + '" data-finance-action="set-mode" data-finance-mode="monetary">Politici Monetare</button>'
    + '</div></div></div>';
  if (isStability) {
    html += financeStabilityHeroHtml(getFinanceLabMetrics());
    html += financeStabilityBriefHtml(getFinanceLabMetrics());
    html += '<div class="finance-overview"><div class="finance-kpi"><div class="finance-kpi-label">Risc sistemic</div><div class="finance-kpi-value" id="finKpiNpv"></div></div><div class="finance-kpi"><div class="finance-kpi-label">Tail loss</div><div class="finance-kpi-value" id="finKpiLoss"></div></div><div class="finance-kpi"><div class="finance-kpi-label">CCyB sugerat</div><div class="finance-kpi-value" id="finKpiCapital"></div></div><div class="finance-kpi"><div class="finance-kpi-label">Scor stabilitate</div><div class="finance-kpi-value" id="finKpiStability"></div></div></div>';
    html += '<section class="finance-zone"><div class="finance-zone-head"><div><div class="finance-zone-kicker">Secțiunea 1</div><div class="finance-zone-title">Harta presiunilor sistemice</div><div class="finance-zone-copy">Pornești de la motoarele economiei reale: ritmul creditului, datoria gospodăriilor și amortizoarele băncilor. Aici vezi dacă sistemul intră într-o fază de acumulare a dezechilibrelor sau rămâne într-o zonă digestibilă pentru economie.</div></div></div><div class="finance-stability-grid"><div class="finance-control-panel"><div class="finance-panel-title">Motoarele ciclului financiar</div>' + financeSlider('creditGrowth', 'Ritm credit privat', finance.creditGrowth, 0, 20, 0.5, 'Când creditul crește prea repede, vulnerabilitatea nu se vede imediat, dar se acumulează înainte de corecție.') + financeSlider('householdDebt', 'Datorie gospodării / venit', finance.householdDebt, 20, 90, 1, 'Acest raport arată cât de repede devin familiile sensibile la dobânzi mai mari și venituri reale mai mici.') + financeSlider('capitalBuffer', 'CET1 / capital disponibil', finance.capitalBuffer, 8, 22, 0.5, 'Mai mult capital înseamnă mai mult spațiu de absorbție a pierderilor înainte ca băncile să restrângă creditarea.') + financeSlider('liquidityBuffer', 'LCR / buffer lichiditate', finance.liquidityBuffer, 80, 180, 1, 'Lichiditatea ridicată face ca ieșirile de finanțare și retragerile să poată fi absorbite fără panică imediată.') + financeSlider('leverage', 'Leverage sistemic', finance.leverage, 1, 10, 0.1, 'Leverage-ul mare reduce marja de eroare atunci când apare o scădere de preț sau o creștere a costului de finanțare.') + '<div class="finance-story" id="finStoryValuation"></div></div><div class="finance-stability-stack"><div class="finance-report-card"><div class="finance-panel-title">Principalele riscuri la adresa stabilității financiare</div><div id="finRiskBoard"></div></div><div class="finance-report-card"><div class="finance-panel-title">Unde se concentrează fragilitatea</div><div id="finVulnerabilityMap"></div></div></div></div></section>';
    html += '<section class="finance-zone"><div class="finance-zone-head"><div><div class="finance-zone-kicker">Secțiunea 2</div><div class="finance-zone-title">Monitorul rezilienței bancare</div><div class="finance-zone-copy">Acest bloc traduce limbajul din rapoartele de stabilitate în ceva ușor de urmărit: vezi dacă buffer-ele încă absorb șocul sau dacă sistemul bancar începe să consume din reziliență.</div></div></div><div class="finance-stability-grid"><div class="finance-control-panel"><div class="finance-panel-title">Ce îngroașă coada pierderilor</div>' + financeSlider('concentrationRisk', 'Concentrare sectorială', finance.concentrationRisk, 10, 90, 1, 'Dacă expunerile sunt prea concentrate, un șoc local poate produce pierderi disproporționat de mari.') + financeSlider('contagionRisk', 'Interconectare / contagiune', finance.contagionRisk, 5, 90, 1, 'Legături mai dese între instituții și piețe înseamnă transmitere mai rapidă și mai greu de oprit.') + financeSlider('marketVol', 'Volatilitate piețe', finance.marketVol, 5, 50, 1, 'Piețele instabile înseamnă reevaluări, haircuts și pierderi mark-to-market mai greu de absorbit.') + financeSlider('stressShock', 'Severitate șoc', finance.stressShock, 10, 80, 1, 'Aici controlezi cât de violent este scenariul: o corecție ordonată sau o fază în care amortizoarele sunt puse la încercare.') + '<div class="finance-story" id="finStoryDistribution"></div></div><div class="finance-stability-stack"><div class="finance-report-card"><div class="finance-panel-title">Indicatori de risc ai sistemului bancar</div><div id="finScorecard"></div></div><div class="finance-report-card"><div class="finance-panel-title">Cum se erodează amortizoarele</div><div class="finance-chart" id="finValuationChart"></div><div class="finance-chart-legend"><span><i style="background:#73c9a6"></i>Buffer brut</span><span><i style="background:#f29b6d"></i>Buffer după stres</span></div><div class="finance-chart-caption">Vezi dacă șocul doar tensionează sistemul sau începe să consume în mod real capitalul și lichiditatea care țin creditarea funcțională.</div><div class="finance-stat-strip" id="finValuationStrip"></div></div></div></div></section>';
    html += '<section class="finance-zone"><div class="finance-zone-head"><div><div class="finance-zone-kicker">Secțiunea 3</div><div class="finance-zone-title">Transmisie macro și răspuns de politică</div><div class="finance-zone-copy">Aici legi șocul de răspunsul autorităților. Nu vezi doar dacă apare stres, ci și dacă instrumentele macroprudențiale par suficiente sau trebuie înăsprite.</div></div></div><div class="finance-stability-grid finance-stability-grid--stacked"><div class="finance-control-panel finance-control-panel--horizontal"><div class="finance-panel-title">Parametrii scenariului macro</div><div class="finance-control-grid finance-control-grid--4">' + financeSlider('capitalBuffer', 'Capital disponibil', finance.capitalBuffer, 8, 22, 0.5, 'Dacă pornești cu mai puțin capital, fiecare pierdere se vede mai repede în capacitatea de creditare.') + financeSlider('liquidityBuffer', 'LCR / buffer lichiditate', finance.liquidityBuffer, 80, 180, 1, 'Un LCR mai mic înseamnă că ieșirile de finanțare și nevoia de cash apasă mai devreme pe sistem.') + financeSlider('stressShock', 'Intensitate șoc', finance.stressShock, 10, 80, 1, 'Mută scenariul dintr-o tensiune de supraveghere într-o fază în care intră în discuție intervenția.') + financeSlider('refinancingGap', 'Gap de refinanțare', finance.refinancingGap, 10, 80, 1, 'Arată cât de dependent este sistemul de rostogolirea datoriei și de condițiile din piață.') + '</div><div class="finance-story" id="finStoryStress"></div></div><div class="finance-stability-stack"><div class="finance-dual-grid"><div class="finance-report-card finance-report-card--wide"><div class="finance-panel-title">Unde se rupe prima dată reziliența</div><div class="finance-chart" id="finStressChart"></div><div class="finance-chart-caption">Compari imediat capitalul, lichiditatea, gapul de credit folosit ca proxy ciclic și contagiunea. Graficul trebuie citit ca un semnal despre ce canal intră primul în regim de stres.</div><div class="finance-stat-strip" id="finStressStrip"></div></div><div class="finance-report-card finance-report-card--wide"><div class="finance-panel-title">Panoul de politici macroprudențiale</div><div class="finance-chart" id="finPolicyChart"></div><div class="finance-chart-caption">CCyB este ancorat de ghidul Basel al gapului de credit, iar SyRB, O-SII și MREL îți arată cât spațiu mai are arhitectura de politici înainte să treacă în regim defensiv.</div><div class="finance-policy-strip" id="finStabilityStrip"></div></div></div></div></div></section>';
    html += '<section class="finance-zone"><div class="finance-zone-head"><div><div class="finance-zone-kicker">Secțiunea 4</div><div class="finance-zone-title">Distribuția pierderilor și traseul contagiunii</div><div class="finance-zone-copy">Ultimul bloc traduce partea cea mai abstractă din cursuri: cât de repede se mută stresul prin sistem și când pierderile ies din scenariul central și intră în coada severă.</div></div></div><div class="finance-stability-grid finance-stability-grid--stacked"><div class="finance-control-panel finance-control-panel--horizontal"><div class="finance-panel-title">Canale structurale de vulnerabilitate</div><div class="finance-control-grid finance-control-grid--4">' + financeSlider('policyRate', 'Rată de politică monetară', finance.policyRate, 1, 12, 0.1, 'Dobânda mai mare scumpește creditul, tensionează refinanțarea și mută stresul spre debitori.') + financeSlider('inflation', 'Inflație anuală', finance.inflation, 1, 15, 0.1, 'Inflația ridicată reduce venitul real și poate transforma un șoc financiar într-un șoc social și de cerere.') + financeSlider('leverage', 'Leverage sistemic', finance.leverage, 1, 10, 0.1, 'Leverage-ul mare face corecția mai dureroasă, pentru că pierderile mici se transformă mai repede în pierderi de capital.') + financeSlider('marketVol', 'Volatilitate piețe', finance.marketVol, 5, 50, 1, 'Când piețele devin volatile, șocul poate fi amplificat prin prețuri, marje și retrageri de finanțare.') + '</div><div class="finance-story" id="finStoryStability"></div></div><div class="finance-stability-stack"><div class="finance-dual-grid"><div class="finance-report-card finance-report-card--wide"><div class="finance-panel-title">Cum se mută masa pierderilor</div><div class="finance-chart" id="finDistributionChart"></div><div class="finance-chart-caption">Curba trebuie citită ca un spectru de pierderi posibile. Când medianul urcă și coada se îngroașă, sistemul nu mai este doar tensionat, ci devine vulnerabil la un episod sever.</div><div class="finance-stat-strip" id="finDistributionStrip"></div></div><div class="finance-report-card finance-report-card--wide"><div class="finance-panel-title">Hartă radială a fragilității</div><div class="finance-chart" id="finStabilityChart"></div><div class="finance-chart-caption">Radarul arată dacă fragilitatea vine mai ales din amortizoare, ciclul creditului, gospodării și piața imobiliară sau din interconectarea sistemului.</div></div></div><div class="finance-report-card finance-report-card--wide"><div class="finance-panel-title">Traseul contagiunii în economie</div><div class="finance-chart" id="finNetworkChart"></div><div class="finance-network-note">Schema urmărește traseul șocului de la surse, la canale de transmitere și apoi la zonele afectate. Dacă apeși pe box-uri, vezi ce înseamnă fiecare scor în termeni economici.</div></div></div></div></section>';
    html += '</div></div>';
    el.innerHTML = html;
    setupFinanceLabInteractions(el);
    updateFinanceLabUI();
    return;
  }
  html += '<div class="finance-overview"><div class="finance-kpi"><div class="finance-kpi-label">' + (isStability ? 'Risc sistemic' : 'VPN curent') + '</div><div class="finance-kpi-value" id="finKpiNpv"></div></div><div class="finance-kpi"><div class="finance-kpi-label">' + (isStability ? 'Tail loss' : 'Probabilitate pierdere') + '</div><div class="finance-kpi-value" id="finKpiLoss"></div></div><div class="finance-kpi"><div class="finance-kpi-label">' + (isStability ? 'CCyB sugerat' : 'Capital sub stres') + '</div><div class="finance-kpi-value" id="finKpiCapital"></div></div><div class="finance-kpi"><div class="finance-kpi-label">Scor stabilitate</div><div class="finance-kpi-value" id="finKpiStability"></div></div></div>';
  html += '<section class="finance-zone"><div class="finance-zone-head"><div><div class="finance-zone-kicker">Zona 1</div><div class="finance-zone-title">' + cfg.zone1 + '</div><div class="finance-zone-copy">' + cfg.zone1Copy + '</div></div></div><div class="finance-zone-grid"><div class="finance-control-panel"><div class="finance-panel-title">' + (isStability ? 'Motoarele ciclului financiar' : 'Controlează ipotezele') + '</div>' + (isStability ? financeSlider('creditGrowth', 'Creștere credit', finance.creditGrowth, 0, 20, 0.5) + financeSlider('householdDebt', 'Datorie gospodării / venit', finance.householdDebt, 20, 90, 1) + financeSlider('capitalBuffer', 'Capital disponibil', finance.capitalBuffer, 8, 22, 0.5) + financeSlider('liquidityBuffer', 'LCR / buffer lichiditate', finance.liquidityBuffer, 80, 180, 1) + financeSlider('leverage', 'Leverage sistemic', finance.leverage, 1, 10, 0.1) : financeSlider('initialInvestment', 'Investiție inițială', finance.initialInvestment, 50000, 1000000, 10000) + financeSlider('annualCashflow', 'Cash flow anual', finance.annualCashflow, 10000, 250000, 5000) + financeSlider('discountRate', 'Rata de actualizare', finance.discountRate, 1, 20, 0.5) + financeSlider('years', 'Orizont (ani)', finance.years, 2, 10, 1) + financeSlider('growthRate', 'Creștere cash flow', finance.growthRate, -5, 15, 0.5)) + '<div class="finance-story" id="finStoryValuation"></div></div><div class="finance-visual-panel"><div class="finance-panel-title">' + (isStability ? 'Eroziunea buffer-elor pe ciclul financiar' : 'Curba fluxurilor nominale vs. actualizate') + '</div><div class="finance-chart" id="finValuationChart"></div><div class="finance-chart-legend"><span><i style="background:#73c9a6"></i>' + (isStability ? 'Buffer brut' : 'Cash flow nominal') + '</span><span><i style="background:#f29b6d"></i>' + (isStability ? 'Buffer după stres' : 'Cash flow actualizat') + '</span></div><div class="finance-chart-caption">' + (isStability ? 'Vezi unde se consumă rezervele de reziliență când urcă ritmul creditului, leverage-ul și datoria gospodăriilor.' : 'Graficul arată cum scade valoarea cash flow-ului pe măsură ce îl aduci în prezent prin rata de actualizare.') + '</div><div class="finance-stat-strip" id="finValuationStrip"></div></div></div></section>';
  html += '<section class="finance-zone"><div class="finance-zone-head"><div><div class="finance-zone-kicker">Zona 2</div><div class="finance-zone-title">' + cfg.zone2 + '</div><div class="finance-zone-copy">' + cfg.zone2Copy + '</div></div></div><div class="finance-zone-grid"><div class="finance-control-panel"><div class="finance-panel-title">' + (isStability ? 'Amplificatori de coadă' : 'Reglează profilul de risc') + '</div>' + (isStability ? financeSlider('concentrationRisk', 'Concentrare sectorială', finance.concentrationRisk, 10, 90, 1) + financeSlider('contagionRisk', 'Interconectare / contagiune', finance.contagionRisk, 5, 90, 1) + financeSlider('marketVol', 'Volatilitate piață', finance.marketVol, 5, 50, 1) + financeSlider('stressShock', 'Intensitate șoc', finance.stressShock, 10, 80, 1) : financeSlider('expectedReturn', 'Randament așteptat', finance.expectedReturn, -5, 25, 0.5) + financeSlider('volatility', 'Volatilitate', finance.volatility, 5, 45, 0.5) + financeSlider('exposure', 'Expunere economică', finance.exposure, 10, 200, 5)) + '<div class="finance-story" id="finStoryDistribution"></div></div><div class="finance-visual-panel"><div class="finance-panel-title">' + (isStability ? 'Distribuția pierderilor sistemice' : 'Distribuția randamentelor') + '</div><div class="finance-chart" id="finDistributionChart"></div><div class="finance-chart-caption">' + (isStability ? 'Curba arată cât de groasă devine coada pierderilor când se suprapun concentrare, contagiune și volatilitate.' : 'Curba îți arată distribuția probabilă a rezultatelor, cu markeri pentru percentilele cheie.') + '</div><div class="finance-stat-strip" id="finDistributionStrip"></div></div></div></section>';
  html += '<section class="finance-zone"><div class="finance-zone-head"><div><div class="finance-zone-kicker">Zona 3</div><div class="finance-zone-title">' + cfg.zone3 + '</div><div class="finance-zone-copy">' + cfg.zone3Copy + '</div></div></div><div class="finance-scenario-row"><div class="finance-scenario-card active" data-fin-scenario="base" data-finance-action="set-scenario" data-finance-scenario="base"><div class="finance-scenario-name">Scenariu de bază</div><div class="finance-scenario-copy">' + (isStability ? 'Creditul încetinește ordonat, buffer-ele țin și refinanțarea rămâne deschisă.' : 'Șocuri mici, piață ordonată, refinanțare normală.') + '</div></div><div class="finance-scenario-card" data-fin-scenario="adverse" data-finance-action="set-scenario" data-finance-scenario="adverse"><div class="finance-scenario-name">Scenariu advers</div><div class="finance-scenario-copy">' + (isStability ? 'Crește costul finanțării, housing-ul slăbește și canalele de contagiune se activează.' : 'Costul finanțării crește, lichiditatea se strânge, default-urile urcă.') + '</div></div><div class="finance-scenario-card" data-fin-scenario="crisis" data-finance-action="set-scenario" data-finance-scenario="crisis"><div class="finance-scenario-name">Scenariu de criză</div><div class="finance-scenario-copy">' + (isStability ? 'Buffer-ele se consumă rapid, LCR-ul cade și credit gap-ul intră în zonă critică.' : 'Volatilitate mare, pierderi accelerate și presiune pe capital.') + '</div></div></div><div class="finance-zone-grid"><div class="finance-control-panel"><div class="finance-panel-title">' + (isStability ? 'Parametri macro de stres' : 'Parametri bilanț și șoc') + '</div>' + financeSlider('capitalBuffer', 'Capital disponibil', finance.capitalBuffer, 8, 22, 0.5) + financeSlider('liquidityBuffer', 'LCR / buffer lichiditate', finance.liquidityBuffer, 80, 180, 1) + financeSlider('stressShock', 'Intensitate șoc', finance.stressShock, 10, 80, 1) + financeSlider('refinancingGap', 'Refinancing gap', finance.refinancingGap, 10, 80, 1) + '<div class="finance-story" id="finStoryStress"></div></div><div class="finance-visual-panel"><div class="finance-panel-title">' + (isStability ? 'Transmisia șocului sistemic' : 'Impactul scenariului ales') + '</div><div class="finance-chart" id="finStressChart"></div><div class="finance-chart-caption">' + (isStability ? 'Barele arată unde intră prima ruptură într-un exercițiu macroprudențial: capital, lichiditate, credit gap sau rețea.' : 'Barele compară zonele cele mai sensibile din bilanț după șocul selectat.') + '</div><div class="finance-stat-strip" id="finStressStrip"></div></div></div></section>';
  html += '<section class="finance-zone"><div class="finance-zone-head"><div><div class="finance-zone-kicker">Zona 4</div><div class="finance-zone-title">' + cfg.zone4 + '</div><div class="finance-zone-copy">' + cfg.zone4Copy + '</div></div></div><div class="finance-zone-grid"><div class="finance-control-panel"><div class="finance-panel-title">' + (isStability ? 'Canale structurale de vulnerabilitate' : 'Motoarele stabilității') + '</div>' + financeSlider('policyRate', 'Dobânda de politică monetară', finance.policyRate, 1, 12, 0.1) + financeSlider('inflation', 'Inflație', finance.inflation, 1, 15, 0.1) + financeSlider('leverage', isStability ? 'Leverage sistemic' : 'Leverage', finance.leverage, 1, 10, 0.1) + financeSlider('marketVol', 'Volatilitate piață', finance.marketVol, 5, 50, 1) + '<div class="finance-story" id="finStoryStability"></div></div><div class="finance-visual-panel"><div class="finance-panel-title">' + (isStability ? 'Hartă a vulnerabilităților sistemice' : 'Hartă de stabilitate') + '</div><div class="finance-chart" id="finStabilityChart"></div><div class="finance-chart-caption">' + (isStability ? 'Radarul îți arată dacă fragilitatea vine mai ales din ciclul creditului, housing, rețea sau risc de piață.' : 'Radarul sintetizează starea sistemului pe 5 dimensiuni și arată rapid unde apare fragilitatea.') + '</div><div class="finance-stat-strip" id="finStabilityStrip"></div></div></div></section>';
  html += '</div></div>';
  el.innerHTML = html;
  setupFinanceLabInteractions(el);
  updateFinanceLabUI();
}

function setupFinanceLabInteractions(el) {
  if (!el || el.__financeLabBound) return;
  el.__financeLabBound = true;

  el.addEventListener('click', function(event) {
    const networkEl = event.target.closest('[data-finance-network]');
    if (networkEl && el.contains(networkEl)) {
      openFinanceNetworkInfo(networkEl.dataset.financeNetwork);
      return;
    }

    const actionEl = event.target.closest('[data-finance-action]');
    if (!actionEl || !el.contains(actionEl)) return;

    const action = actionEl.dataset.financeAction;
    switch (action) {
      case 'set-mode':
        setFinanceLabMode(actionEl.dataset.financeMode);
        return;
      case 'set-scenario':
        setFinanceLabScenario(actionEl.dataset.financeScenario);
        return;
      case 'run-calc':
        if (typeof window[actionEl.dataset.financeCalc] === 'function') {
          window[actionEl.dataset.financeCalc]();
        }
        return;
      default:
        return;
    }
  });

  el.addEventListener('input', function(event) {
    const target = event.target;
    if (target.matches('[data-finance-input]')) {
      setFinanceLabValue(target.dataset.financeInput, target.value);
      return;
    }
    if (target.matches('[data-finance-number-for]')) {
      setFinanceLabValue(target.dataset.financeNumberFor, target.value);
    }
  });

  el.addEventListener('keydown', function(event) {
    if (event.key !== 'Enter') return;
    const target = event.target;
    if (target.matches('[data-finance-calc-enter]')) {
      event.preventDefault();
      if (typeof window[target.dataset.financeCalcEnter] === 'function') {
        window[target.dataset.financeCalcEnter]();
      }
    }
  });
}

function setupFinanceLabModalInteractions() {
  const modalContainer = document.getElementById('modalContainer');
  if (!modalContainer || modalContainer.__financeModalBound) return;
  modalContainer.__financeModalBound = true;

  modalContainer.addEventListener('click', function(event) {
    const overlay = event.target.closest('[data-finance-modal="close-if-overlay"]');
    if (overlay && event.target === overlay) {
      closeModal();
      return;
    }
    const actionEl = event.target.closest('[data-finance-action="close-modal"]');
    if (actionEl) closeModal();
  });
}

setTimeout(setupFinanceLabModalInteractions, 0);

function finCard(title, fields, calcFn, resultId) {
  var html = '<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);padding:20px;">';
  html += '<div style="font-weight:700;font-size:.9rem;margin-bottom:14px;">' + title + '</div>';
  fields.forEach(function(f) {
    html += '<div style="margin-bottom:10px;">';
    html += '<label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">' + f.label + '</label>';
    html += '<input id="' + f.id + '" class="todo-inp" type="number" placeholder="' + f.placeholder + '" style="width:100%;" data-finance-calc-enter="' + calcFn + '">';
    html += '</div>';
  });
  html += '<button class="quiz-nav-btn primary" style="width:100%;margin-top:4px;" data-finance-action="run-calc" data-finance-calc="' + calcFn + '">Calculează</button>';
  html += '<div id="' + resultId + '" style="margin-top:12px;font-family:var(--font-mono);font-size:.85rem;color:var(--accent);min-height:20px;"></div>';
  html += '</div>';
  return html;
}

function finResult(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}
