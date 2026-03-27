// ═════════════════════════════════════════════════════════════════
// finance.js — Finance Lab cu Neural Pathways & Simulatoare Interactive
//
// Arhitectură domain-extensibilă:
//   DOMAIN_REGISTRY → înregistrezi un domeniu nou cu topicuri și noduri
//   TOPIC_REGISTRY  → fiecare topic are: nodes, connections, simulators
//   Simulatoarele sunt funcții pure: (inputs) → { outputs, insights }
//
// Fișier standalone — se include în index.html cu <script src="js/finance.js">
// Nu are dependențe externe în afara Chart.js (încărcat inline când e nevoie).
// ═════════════════════════════════════════════════════════════════

'use strict';

// ─────────────────────────────────────────────────────────────────
// SVG ICONS — înlocuiesc emoji-urile pentru consistență vizuală
// ─────────────────────────────────────────────────────────────────
const FIN_ICONS = {
  profit:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  balance:  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  compound: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  roi:      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  cashflow: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  lab:      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11"/><path d="m3 9 9 9 9-9"/></svg>',
};

// Map topic ID → icon key
const FIN_TOPIC_ICON = {
  profit_loss:       'profit',
  break_even:        'balance',
  compound_interest: 'compound',
  roi:               'roi',
  cash_flow:         'cashflow',
};

function finIcon(key, color) {
  const svg = FIN_ICONS[key] || FIN_ICONS.profit;
  return '<span style="display:inline-flex;align-items:center;vertical-align:middle;color:' + (color || 'currentColor') + ';">' + svg + '</span>';
}

// ─────────────────────────────────────────────────────────────────
// SLIDER CSS — inject once so drag thumb is big enough to grab
// ─────────────────────────────────────────────────────────────────
(function injectFinanceSliderCSS() {
  if (document.getElementById('fin-slider-styles')) return;
  const s = document.createElement('style');
  s.id = 'fin-slider-styles';
  s.textContent = `
    .fin-range {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 22px;
      padding: 8px 0;
      background: transparent;
      cursor: grab;
      touch-action: pan-x;
      outline: none;
    }
    .fin-range:active { cursor: grabbing; }
    .fin-range::-webkit-slider-runnable-track {
      height: 5px;
      border-radius: 3px;
      background: var(--border);
    }
    .fin-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      margin-top: -7.5px;
      border-radius: 50%;
      background: var(--accent);
      border: 2.5px solid var(--bg-raised);
      box-shadow: 0 1px 5px rgba(0,0,0,0.28);
      cursor: grab;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .fin-range::-webkit-slider-thumb:active {
      transform: scale(1.15);
      box-shadow: 0 2px 10px rgba(0,0,0,0.35);
      cursor: grabbing;
    }
    .fin-range::-moz-range-track {
      height: 5px;
      border-radius: 3px;
      background: var(--border);
    }
    .fin-range::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--accent);
      border: 2.5px solid var(--bg-raised);
      box-shadow: 0 1px 5px rgba(0,0,0,0.28);
      cursor: grab;
    }
    @keyframes fin-pulse-ring {
      0%   { r: 9;  opacity: 0.6; }
      100% { r: 15; opacity: 0;   }
    }
  `;
  document.head.appendChild(s);
})();

// ─────────────────────────────────────────────────────────────────
// 1. DOMAIN REGISTRY — extensibil pentru psihologie, drept, medicină
// ─────────────────────────────────────────────────────────────────
const DOMAIN_REGISTRY = {
  finance: {
    id:     'finance',
    label:  'Finanțe',
    color:  '#10d9a0',
    muted:  'rgba(16,217,160,0.10)',
    border: 'rgba(16,217,160,0.25)',
    icon:   'chart',
    topics: ['profit_loss', 'break_even', 'compound_interest', 'roi', 'cash_flow'],
  },
  // Extensii viitoare — decompentate, adăugate când e nevoie:
  // psychology: { id: 'psychology', label: 'Psihologie', ... },
  // law:        { id: 'law',        label: 'Drept',      ... },
  // medicine:   { id: 'medicine',   label: 'Medicină',   ... },
};

// ─────────────────────────────────────────────────────────────────
// 2. TOPIC REGISTRY — structura de date reutilizabilă
//
// Fiecare topic are:
//   id, domain, label, description
//   nodes[]     → nodurile grafului Neural Pathways
//   connections[] → muchiile dintre noduri
//   simulator   → funcția care calculează outputs din inputs
//   inputs[]    → definiția controalelor interactive
// ─────────────────────────────────────────────────────────────────
const TOPIC_REGISTRY = {

  // ── PROFIT / PIERDERE ─────────────────────────────────────────
  profit_loss: {
    id:     'profit_loss',
    domain: 'finance',
    label:  'Profit & Pierdere',
    emoji:  null,  // replaced by finIcon(FIN_TOPIC_ICON[id])
    description: 'Relația fundamentală dintre venituri, costuri și profit. Înțelege cum fiecare leu cheltuit sau câștigat îți afectează rezultatul final.',
    inputs: [
      { id: 'revenue',       label: 'Venituri totale (lei)',    type: 'range', min: 1000,  max: 200000, step: 1000,  default: 50000 },
      { id: 'fixed_costs',   label: 'Costuri fixe (lei)',       type: 'range', min: 0,     max: 100000, step: 500,   default: 15000 },
      { id: 'variable_rate', label: 'Costuri variabile (%)',    type: 'range', min: 0,     max: 90,     step: 1,     default: 40    },
    ],
    simulator: function(inputs) {
      const rev  = inputs.revenue;
      const fc   = inputs.fixed_costs;
      const vc   = rev * (inputs.variable_rate / 100);
      const tc   = fc + vc;
      const profit = rev - tc;
      const margin = rev > 0 ? (profit / rev * 100) : 0;
      return {
        outputs: [
          { id: 'variable_costs', label: 'Costuri variabile',  value: vc,     format: 'currency', color: '#f5a623' },
          { id: 'total_costs',    label: 'Costuri totale',     value: tc,     format: 'currency', color: '#ef4565' },
          { id: 'profit',         label: 'Profit net',         value: profit, format: 'currency', color: profit >= 0 ? '#10d9a0' : '#ef4565' },
          { id: 'margin',         label: 'Marjă profit',       value: margin, format: 'percent',  color: margin >= 20 ? '#10d9a0' : margin >= 0 ? '#f5a623' : '#ef4565' },
        ],
        chartData: {
          type: 'bar',
          labels: ['Costuri Fixe', 'Costuri Variabile', 'Profit'],
          datasets: [{
            data:  [fc, vc, Math.max(0, profit)],
            colors: ['#4f6ef7', '#f5a623', '#10d9a0'],
          }],
          lossValue: profit < 0 ? Math.abs(profit) : 0,
        },
        insights: profit >= 0
          ? (margin >= 20
              ? `Marjă excelentă de ${margin.toFixed(1)}%. Afacerea este profitabilă și sănătoasă.`
              : `Afacerea este profitabilă, dar marja de ${margin.toFixed(1)}% este sub 20%. Caută să reduci costurile variabile.`)
          : `Pierdere de ${fmtCurrency(Math.abs(profit))}. Veniturile nu acoperă costurile totale de ${fmtCurrency(tc)}.`,
      };
    },
    nodes: [
      { id: 'revenue',    x: 50,  y: 15, label: 'Venituri',          color: '#10d9a0', type: 'input',     info: 'Totalul sumelor încasate din vânzări sau servicii.' },
      { id: 'fixed',      x: 15,  y: 50, label: 'Costuri Fixe',      color: '#4f6ef7', type: 'cost',      info: 'Chiria, salariile fixe, abonamente — nu variază cu volumul vânzărilor.' },
      { id: 'variable',   x: 35,  y: 65, label: 'Costuri Variabile', color: '#f5a623', type: 'cost',      info: 'Materii prime, comisioane — cresc proporțional cu vânzările.' },
      { id: 'total_cost', x: 25,  y: 82, label: 'Cost Total',        color: '#ef4565', type: 'derived',   info: 'Suma costurilor fixe și variabile. Dacă depășește veniturile → pierdere.' },
      { id: 'profit',     x: 70,  y: 55, label: 'Profit',            color: '#10d9a0', type: 'output',    info: 'Venituri − Costuri Totale. Poate fi pozitiv (profit) sau negativ (pierdere).' },
      { id: 'margin',     x: 85,  y: 75, label: 'Marjă',             color: '#a78bfa', type: 'output',    info: 'Profit / Venituri × 100. Arată cât % din fiecare leu încasat rămâne profit.' },
    ],
    connections: [
      { from: 'revenue',    to: 'profit'     },
      { from: 'fixed',      to: 'total_cost' },
      { from: 'variable',   to: 'total_cost' },
      { from: 'total_cost', to: 'profit'     },
      { from: 'profit',     to: 'margin'     },
      { from: 'revenue',    to: 'margin'     },
    ],
  },

  // ── BREAK-EVEN ────────────────────────────────────────────────
  break_even: {
    id:     'break_even',
    domain: 'finance',
    label:  'Punct de Echilibru',
    emoji:  null,  // replaced by finIcon(FIN_TOPIC_ICON[id])
    description: 'Câte unități trebuie să vinzi ca să nu pierzi bani? Break-even-ul este pragul de la care începi să faci profit.',
    inputs: [
      { id: 'price',       label: 'Preț de vânzare / unitate (lei)', type: 'range', min: 10,   max: 5000,  step: 10,  default: 200  },
      { id: 'var_cost',    label: 'Cost variabil / unitate (lei)',    type: 'range', min: 1,    max: 4000,  step: 5,   default: 80   },
      { id: 'fixed_costs', label: 'Costuri fixe totale (lei)',        type: 'range', min: 1000, max: 500000,step: 1000,default: 36000},
    ],
    simulator: function(inputs) {
      const p  = inputs.price;
      const vc = inputs.var_cost;
      const fc = inputs.fixed_costs;
      const cm = p - vc;  // contribuție marginală per unitate
      if (cm <= 0) {
        return {
          outputs: [{ id: 'error', label: 'Eroare', value: 'Prețul trebuie să fie mai mare decât costul variabil!', format: 'text', color: '#ef4565' }],
          chartData: null,
          insights: 'Imposibil de calculat: prețul de vânzare este mai mic sau egal cu costul variabil per unitate.',
        };
      }
      const bep_units   = fc / cm;
      const bep_revenue = bep_units * p;
      const margin_pct  = (cm / p * 100);
      const target_units = Math.ceil(bep_units * 1.2); // +20% profit target
      return {
        outputs: [
          { id: 'contribution', label: 'Contribuție marginală / buc', value: cm,          format: 'currency', color: '#4f6ef7' },
          { id: 'bep_units',    label: 'Break-even (unități)',         value: bep_units,   format: 'units',    color: '#10d9a0' },
          { id: 'bep_revenue',  label: 'Break-even (venituri)',        value: bep_revenue, format: 'currency', color: '#10d9a0' },
          { id: 'margin_pct',   label: 'Marjă contribuție',            value: margin_pct,  format: 'percent',  color: '#a78bfa' },
        ],
        chartData: {
          type: 'line',
          bep_units:    Math.ceil(bep_units),
          price:        p,
          var_cost:     vc,
          fixed_costs:  fc,
        },
        insights: `Trebuie să vinzi cel puțin ${Math.ceil(bep_units)} unități (${fmtCurrency(bep_revenue)}) ca să acoperi costurile. Fiecare unitate vândută peste acest prag aduce ${fmtCurrency(cm)} profit net.`,
      };
    },
    nodes: [
      { id: 'price',       x: 20,  y: 15, label: 'Preț Vânzare',  color: '#10d9a0', type: 'input',   info: 'Suma pe care o încasezi pentru fiecare unitate vândută.' },
      { id: 'var_cost',    x: 20,  y: 55, label: 'Cost Variabil', color: '#f5a623', type: 'cost',    info: 'Costul direct al producerii / livrării unei unități.' },
      { id: 'cm',          x: 50,  y: 35, label: 'Contribuție Marginală', color: '#4f6ef7', type: 'derived', info: 'Preț − Cost Variabil. Cât din fiecare vânzare acoperă costurile fixe.' },
      { id: 'fixed',       x: 80,  y: 55, label: 'Costuri Fixe',  color: '#ef4565', type: 'cost',    info: 'Costuri care există indiferent de câte unități vinzi.' },
      { id: 'bep',         x: 65,  y: 80, label: 'Break-Even',    color: '#10d9a0', type: 'output',  info: 'Costuri Fixe ÷ Contribuție Marginală = nr. minim de unități de vândut.' },
    ],
    connections: [
      { from: 'price',    to: 'cm'    },
      { from: 'var_cost', to: 'cm'    },
      { from: 'cm',       to: 'bep'   },
      { from: 'fixed',    to: 'bep'   },
    ],
  },

  // ── DOBÂNDĂ COMPUSĂ ───────────────────────────────────────────
  compound_interest: {
    id:     'compound_interest',
    domain: 'finance',
    label:  'Dobândă Compusă',
    emoji:  null,  // replaced by finIcon(FIN_TOPIC_ICON[id])
    description: 'Dobânda compusă este "a opta minune a lumii" — Einstein. Dobânda câștigată generează la rândul ei dobândă. Efectul în timp este exponențial.',
    inputs: [
      { id: 'principal',   label: 'Capital inițial (lei)',   type: 'range', min: 100,  max: 100000, step: 100,  default: 10000 },
      { id: 'rate',        label: 'Rată anuală dobândă (%)', type: 'range', min: 0.5,  max: 30,     step: 0.5,  default: 7     },
      { id: 'years',       label: 'Perioadă (ani)',          type: 'range', min: 1,    max: 40,     step: 1,    default: 10    },
      { id: 'monthly_add', label: 'Adaos lunar (lei)',       type: 'range', min: 0,    max: 5000,   step: 50,   default: 0     },
    ],
    simulator: function(inputs) {
      const P  = inputs.principal;
      const r  = inputs.rate / 100;
      const n  = inputs.years;
      const m  = inputs.monthly_add;

      // Calcul compus simplu (fără adaos lunar)
      const simple_final = P * Math.pow(1 + r, n);

      // Calcul cu adaos lunar (compound monthly)
      const r_monthly = r / 12;
      let balance = P;
      const yearlyBalances = [P];
      for (let yr = 1; yr <= n; yr++) {
        for (let mo = 0; mo < 12; mo++) {
          balance = balance * (1 + r_monthly) + m;
        }
        yearlyBalances.push(balance);
      }

      const total_invested = P + m * 12 * n;
      const total_interest = balance - total_invested;

      return {
        outputs: [
          { id: 'final',     label: 'Valoare finală',           value: balance,         format: 'currency', color: '#10d9a0' },
          { id: 'invested',  label: 'Total investit',           value: total_invested,  format: 'currency', color: '#4f6ef7' },
          { id: 'interest',  label: 'Dobândă totală câștigată', value: total_interest,  format: 'currency', color: '#a78bfa' },
          { id: 'multiplier',label: 'Factor multiplicare',       value: balance / P,     format: 'multiplier',color:'#10d9a0' },
        ],
        chartData: {
          type: 'area',
          labels: Array.from({length: n+1}, (_, i) => `An ${i}`),
          principal_line: yearlyBalances.map(() => P),
          balance_line:   yearlyBalances,
          invested_line:  yearlyBalances.map((_, i) => P + m * 12 * i),
        },
        insights: `Investiția ta de ${fmtCurrency(P)} crește la ${fmtCurrency(balance)} în ${n} ani${m > 0 ? ` cu adaos lunar de ${fmtCurrency(m)}` : ''}. Dobânda compusă generează ${fmtCurrency(total_interest)} — adică ${((total_interest/total_invested)*100).toFixed(0)}% din capitalul investit.`,
      };
    },
    nodes: [
      { id: 'principal', x: 15,  y: 20, label: 'Capital Inițial', color: '#4f6ef7', type: 'input',   info: 'Suma cu care pornești. Baza de la care pornește calculul.' },
      { id: 'rate',      x: 50,  y: 15, label: 'Rata Dobânzii',   color: '#f5a623', type: 'input',   info: 'Procentul anual aplicat asupra capitalului. Cu cât e mai mare, cu atât crești mai repede.' },
      { id: 'time',      x: 85,  y: 20, label: 'Timp (ani)',      color: '#a78bfa', type: 'input',   info: 'Cel mai puternic factor. Dublarea timpului poate tripla valoarea finală.' },
      { id: 'compound',  x: 50,  y: 50, label: 'Efect Compus',    color: '#10d9a0', type: 'derived', info: 'Dobânda generează dobândă. Creștere exponențială, nu liniară.' },
      { id: 'final',     x: 50,  y: 82, label: 'Valoare Finală',  color: '#10d9a0', type: 'output',  info: 'P × (1 + r)ⁿ + contribuții lunare. Rezultatul compunerii în timp.' },
    ],
    connections: [
      { from: 'principal', to: 'compound' },
      { from: 'rate',      to: 'compound' },
      { from: 'time',      to: 'compound' },
      { from: 'compound',  to: 'final'    },
    ],
  },

  // ── ROI ──────────────────────────────────────────────────────
  roi: {
    id:     'roi',
    domain: 'finance',
    label:  'Return on Investment',
    emoji:  null,  // replaced by finIcon(FIN_TOPIC_ICON[id])
    description: 'ROI măsoară eficiența unei investiții. Cât câștig pentru fiecare leu investit? Folosit pentru a compara oportunități diferite.',
    inputs: [
      { id: 'investment', label: 'Investiție inițială (lei)',  type: 'range', min: 100,   max: 500000, step: 500,  default: 50000  },
      { id: 'return_val', label: 'Valoare returnată (lei)',    type: 'range', min: 0,     max: 1000000,step: 1000, default: 75000  },
      { id: 'period',     label: 'Perioadă (luni)',            type: 'range', min: 1,     max: 120,    step: 1,    default: 12     },
    ],
    simulator: function(inputs) {
      const inv  = inputs.investment;
      const ret  = inputs.return_val;
      const mo   = inputs.period;
      const gain = ret - inv;
      const roi  = inv > 0 ? (gain / inv * 100) : 0;
      const annualized = mo > 0 ? (Math.pow(1 + roi/100, 12/mo) - 1) * 100 : 0;
      return {
        outputs: [
          { id: 'gain',       label: 'Câștig net',        value: gain,       format: 'currency', color: gain >= 0 ? '#10d9a0' : '#ef4565' },
          { id: 'roi',        label: 'ROI total',         value: roi,        format: 'percent',  color: roi >= 15 ? '#10d9a0' : roi >= 0 ? '#f5a623' : '#ef4565' },
          { id: 'annualized', label: 'ROI anualizat',     value: annualized, format: 'percent',  color: annualized >= 12 ? '#10d9a0' : annualized >= 0 ? '#f5a623' : '#ef4565' },
        ],
        chartData: {
          type: 'donut',
          invested: inv,
          gain:     Math.max(0, gain),
          loss:     Math.max(0, -gain),
        },
        insights: gain >= 0
          ? `ROI de ${roi.toFixed(1)}% în ${mo} luni (${annualized.toFixed(1)}% anualizat). ${roi >= 15 ? 'Investiție excelentă.' : roi >= 5 ? 'Investiție acceptabilă.' : 'Randament scăzut — compară cu alternative.'}`
          : `Pierdere de ${fmtCurrency(Math.abs(gain))}. ROI negativ de ${roi.toFixed(1)}%. Revizuiește strategia.`,
      };
    },
    nodes: [
      { id: 'investment', x: 20,  y: 30, label: 'Investiție',     color: '#4f6ef7', type: 'input',   info: 'Suma totală cheltuită / riscat.' },
      { id: 'return_val', x: 80,  y: 30, label: 'Valoare Return', color: '#10d9a0', type: 'input',   info: 'Ce ai obținut la finalul perioadei.' },
      { id: 'gain',       x: 50,  y: 55, label: 'Câștig Net',     color: '#10d9a0', type: 'derived', info: 'Return − Investiție. Poate fi negativ.' },
      { id: 'roi',        x: 50,  y: 82, label: 'ROI (%)',        color: '#a78bfa', type: 'output',  info: 'Câștig Net / Investiție × 100. Util pentru a compara oportunități.' },
    ],
    connections: [
      { from: 'investment', to: 'gain' },
      { from: 'return_val', to: 'gain' },
      { from: 'gain',       to: 'roi'  },
      { from: 'investment', to: 'roi'  },
    ],
  },

  // ── CASH FLOW ────────────────────────────────────────────────
  cash_flow: {
    id:     'cash_flow',
    domain: 'finance',
    label:  'Cash Flow',
    emoji:  null,  // replaced by finIcon(FIN_TOPIC_ICON[id])
    description: 'Cash flow-ul arată mișcarea reală a banilor — nu profitul contabil, ci lichiditatea. O companie profitabilă poate intra în insolvență din lipsă de cash.',
    inputs: [
      { id: 'cash_in',     label: 'Intrări de cash (lei/lună)',  type: 'range', min: 0,    max: 200000, step: 500,  default: 40000 },
      { id: 'operations',  label: 'Cheltuieli operaționale',     type: 'range', min: 0,    max: 100000, step: 500,  default: 20000 },
      { id: 'salaries',    label: 'Salarii',                     type: 'range', min: 0,    max: 100000, step: 500,  default: 10000 },
      { id: 'investments', label: 'Investiții (CAPEX)',          type: 'range', min: 0,    max: 50000,  step: 500,  default: 3000  },
    ],
    simulator: function(inputs) {
      const inflow = inputs.cash_in;
      const ops    = inputs.operations;
      const sal    = inputs.salaries;
      const inv    = inputs.investments;
      const outflow = ops + sal + inv;
      const net    = inflow - outflow;
      const ratio  = inflow > 0 ? (net / inflow * 100) : 0;
      return {
        outputs: [
          { id: 'outflow', label: 'Total ieșiri',      value: outflow, format: 'currency', color: '#ef4565' },
          { id: 'net',     label: 'Cash Flow Net',     value: net,     format: 'currency', color: net >= 0 ? '#10d9a0' : '#ef4565' },
          { id: 'ratio',   label: 'Rată cash flow',    value: ratio,   format: 'percent',  color: ratio >= 20 ? '#10d9a0' : ratio >= 0 ? '#f5a623' : '#ef4565' },
        ],
        chartData: {
          type: 'waterfall',
          items: [
            { label: 'Intrări',       value: inflow, type: 'positive' },
            { label: 'Operaționale',  value: -ops,   type: 'negative' },
            { label: 'Salarii',       value: -sal,   type: 'negative' },
            { label: 'Investiții',    value: -inv,   type: 'negative' },
            { label: 'Net',           value: net,    type: net >= 0 ? 'positive' : 'negative' },
          ],
        },
        insights: net >= 0
          ? `Cash flow pozitiv de ${fmtCurrency(net)}/lună. ${ratio >= 20 ? 'Lichiditate excelentă.' : 'Lichiditate acceptabilă, dar monitorizează cheltuielile.'}`
          : `Cash flow negativ de ${fmtCurrency(Math.abs(net))}/lună. Risc de insolvență dacă nu există rezerve. Ieșirile depășesc intrările cu ${Math.abs(ratio).toFixed(1)}%.`,
      };
    },
    nodes: [
      { id: 'inflow',  x: 15,  y: 15, label: 'Intrări Cash',    color: '#10d9a0', type: 'input',   info: 'Toate sumele care intră: vânzări, împrumuturi, investiții primite.' },
      { id: 'ops',     x: 80,  y: 25, label: 'Cheltuieli Op.',  color: '#ef4565', type: 'cost',    info: 'Chirii, utilități, materiale — costul zilnic al operațiunilor.' },
      { id: 'sal',     x: 80,  y: 50, label: 'Salarii',         color: '#f5a623', type: 'cost',    info: 'Cel mai mare cost fix pentru majoritatea companiilor.' },
      { id: 'capex',   x: 80,  y: 75, label: 'Investiții',      color: '#a78bfa', type: 'cost',    info: 'Achiziții de echipamente, proprietăți. Nu sunt cheltuieli curente.' },
      { id: 'net',     x: 40,  y: 82, label: 'CF Net',          color: '#10d9a0', type: 'output',  info: 'Intrări − Ieșiri. Pozitiv = bani disponibili. Negativ = risc lichiditate.' },
    ],
    connections: [
      { from: 'inflow', to: 'net'  },
      { from: 'ops',    to: 'net'  },
      { from: 'sal',    to: 'net'  },
      { from: 'capex',  to: 'net'  },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────
// 3. HELPERS DE FORMATARE
// ─────────────────────────────────────────────────────────────────
function fmtCurrency(v) {
  if (typeof v !== 'number') return v;
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(v);
}
function fmtPercent(v) {
  return (typeof v === 'number' ? v.toFixed(1) : v) + '%';
}
function fmtUnits(v) {
  return typeof v === 'number' ? Math.ceil(v).toLocaleString('ro-RO') + ' buc.' : v;
}
function fmtMultiplier(v) {
  return typeof v === 'number' ? v.toFixed(2) + '×' : v;
}
function formatValue(v, fmt) {
  switch(fmt) {
    case 'currency':   return fmtCurrency(v);
    case 'percent':    return fmtPercent(v);
    case 'units':      return fmtUnits(v);
    case 'multiplier': return fmtMultiplier(v);
    default:           return String(v);
  }
}

// ─────────────────────────────────────────────────────────────────
// 4. STATE LOCAL AL MODULULUI
// ─────────────────────────────────────────────────────────────────
const financeState = {
  activeTopic:    'profit_loss',
  activeNode:     null,
  inputValues:    {},  // { topicId: { inputId: value } }
};

function getInputValues(topicId) {
  if (!financeState.inputValues[topicId]) {
    const topic = TOPIC_REGISTRY[topicId];
    financeState.inputValues[topicId] = {};
    topic.inputs.forEach(inp => {
      financeState.inputValues[topicId][inp.id] = inp.default;
    });
  }
  return financeState.inputValues[topicId];
}

// ─────────────────────────────────────────────────────────────────
// 5. RENDERER PRINCIPAL — renderFinancePage(element)
// ─────────────────────────────────────────────────────────────────
function renderFinancePage(element) {
  const domain = DOMAIN_REGISTRY.finance;

  element.innerHTML = `
    <div class="anim" id="financeRoot">
      <!-- Header -->
      <div style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <span style="display:inline-flex;align-items:center;color:#10d9a0;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="m8 21 4-4 4 4"/><path d="M7 7h.01M11 7h6"/><path d="M7 11h.01M11 11h6"/></svg></span>
          <h2 style="font-family:var(--font-display);font-size:1.4rem;font-weight:800;">Finance Lab</h2>
          <span style="padding:3px 10px;background:rgba(16,217,160,0.1);border:1px solid rgba(16,217,160,0.25);border-radius:20px;font-size:.72rem;color:#10d9a0;font-weight:600;">INTERACTIVE</span>
        </div>
        <p style="color:var(--text-secondary);font-size:.88rem;">Explorează concepte financiare prin simulatoare interactive și hărți de relații.</p>
      </div>

      <!-- Topic selector -->
      <div id="financeTopicTabs" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">
        ${domain.topics.map(tid => {
          const t = TOPIC_REGISTRY[tid];
          if (!t) return '';
          const isActive = tid === financeState.activeTopic;
          return `<button onclick="window.finSwitchTopic('${tid}')"
            style="padding:8px 14px;border-radius:8px;border:1px solid ${isActive ? 'rgba(16,217,160,0.4)' : 'var(--border)'};
            background:${isActive ? 'rgba(16,217,160,0.1)' : 'var(--bg-raised)'};
            color:${isActive ? '#10d9a0' : 'var(--text-secondary)'};
            font-size:.82rem;font-weight:${isActive ? '700' : '400'};cursor:pointer;transition:.2s;">
            ${finIcon(FIN_TOPIC_ICON[tid] || 'profit', isActive ? '#10d9a0' : 'var(--text-muted)')} <span style="margin-left:4px;">${t.label}</span>
          </button>`;
        }).join('')}
      </div>

      <!-- Main layout: simulator stânga, neural pathways dreapta -->
      <div id="financeMainLayout" style="display:grid;grid-template-columns:1fr 340px;gap:16px;align-items:start;">
        <div id="financeSimPanel"></div>
        <div id="financePathwayPanel"></div>
      </div>
    </div>`;

  window.finSwitchTopic = function(tid) {
    financeState.activeTopic = tid;
    financeState.activeNode  = null;
    renderFinancePage(element);
  };

  renderSimPanel();
  renderPathwayPanel();
}

// ─────────────────────────────────────────────────────────────────
// 6. PANOUL SIMULATOR (stânga)
// ─────────────────────────────────────────────────────────────────
function renderSimPanel() {
  const panel = document.getElementById('financeSimPanel');
  if (!panel) return;
  const topic  = TOPIC_REGISTRY[financeState.activeTopic];
  const values = getInputValues(topic.id);
  const result = topic.simulator(values);

  panel.innerHTML = `
    <div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">

      <!-- Topic header -->
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);background:var(--bg-surface);">
        <div style="font-size:1rem;font-weight:700;display:flex;align-items:center;gap:8px;">${finIcon(FIN_TOPIC_ICON[topic.id] || 'profit', '#10d9a0')} ${topic.label}</div>
        <div style="color:var(--text-secondary);font-size:.83rem;margin-top:4px;line-height:1.5;">${topic.description}</div>
      </div>

      <!-- Inputs — sliders -->
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);">
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--text-muted);margin-bottom:12px;">Controale Interactive</div>
        ${topic.inputs.map(inp => renderSlider(inp, values[inp.id], topic.id)).join('')}
      </div>

      <!-- Outputs — KPI cards -->
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);">
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--text-muted);margin-bottom:12px;">Rezultate</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;">
          ${result.outputs.map(out => `
            <div style="padding:12px 14px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);border-left:3px solid ${out.color};">
              <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:4px;">${out.label}</div>
              <div style="font-size:1.1rem;font-weight:700;color:${out.color};">${formatValue(out.value, out.format)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Insight text -->
      <div style="padding:14px 20px;background:rgba(79,110,247,0.05);border-bottom:1px solid var(--border);">
        <div style="font-size:.82rem;color:var(--text-secondary);line-height:1.6;">
          <span style="color:var(--accent);font-weight:600;">💡 Interpretare: </span>${result.insights}
        </div>
      </div>

      <!-- Chart -->
      <div style="padding:16px 20px;">
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--text-muted);margin-bottom:12px;">Vizualizare</div>
        <div style="position:relative;height:220px;">
          <canvas id="financeChart" style="width:100%;height:100%;"></canvas>
        </div>
      </div>
    </div>`;

  // ── Sincronizare bidirecțională slider ↔ input numeric ──────────
  topic.inputs.forEach(inp => {
    const slider   = document.getElementById('fslider_' + topic.id + '_' + inp.id);
    const numInput = document.getElementById('fnum_'    + topic.id + '_' + inp.id);

    if (!slider || !numInput) return;

    function clampSnap(raw) {
      const parsed  = parseFloat(raw);
      if (isNaN(parsed)) return null;
      const clamped = Math.min(inp.max, Math.max(inp.min, parsed));
      const snapped = Math.round(clamped / inp.step) * inp.step;
      const prec    = (inp.step.toString().split('.')[1] || '').length;
      return parseFloat(snapped.toFixed(prec));
    }

    // Slider drag — actualizează DOAR valoarea stocată și câmpul numeric.
    // NU apelează refreshSimResults/renderSimPanel — re-randarea DOM-ului
    // în timpul drag-ului întrerupe evenimentul pointermove în Safari/Chrome.
    slider.addEventListener('input', function() {
      const final = clampSnap(this.value);
      if (final === null) return;
      financeState.inputValues[topic.id][inp.id] = final;
      numInput.value = final;
    });

    // La mouseup/touchend (change) — acum re-randăm rezultatele
    slider.addEventListener('change', function() {
      const final = clampSnap(this.value);
      if (final === null) return;
      financeState.inputValues[topic.id][inp.id] = final;
      numInput.value = final;
      refreshSimResults(topic);
    });

    // Numeric input: confirmare la blur sau Enter
    numInput.addEventListener('change', function() {
      const final = clampSnap(this.value);
      if (final === null) return;
      financeState.inputValues[topic.id][inp.id] = final;
      slider.value   = final;
      numInput.value = final;
      refreshSimResults(topic);
    });

    // Numeric: sincronizează slider live în timp ce tastezi (fără re-render)
    numInput.addEventListener('input', function() {
      const val = parseFloat(this.value);
      if (!isNaN(val)) {
        slider.value = Math.min(inp.max, Math.max(inp.min, val));
      }
    });

    // Keyboard pe numeric: ArrowUp/Down ± step, Shift×10
    numInput.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const mult  = e.shiftKey ? 10 : 1;
        const delta = (e.key === 'ArrowUp' ? inp.step : -inp.step) * mult;
        const final = clampSnap((parseFloat(this.value) || inp.default) + delta);
        if (final === null) return;
        financeState.inputValues[topic.id][inp.id] = final;
        slider.value   = final;
        numInput.value = final;
        refreshSimResults(topic);
      }
      if (e.key === 'Enter') { this.blur(); }
    });

    // Keyboard pe slider: Shift+Arrow = 10× step
    slider.addEventListener('keydown', function(e) {
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.shiftKey) {
        e.preventDefault();
        const delta = (e.key === 'ArrowRight' ? inp.step : -inp.step) * 10;
        const final = clampSnap(parseFloat(this.value) + delta);
        if (final === null) return;
        financeState.inputValues[topic.id][inp.id] = final;
        slider.value   = final;
        numInput.value = final;
        refreshSimResults(topic);
      }
    });
  });

  // Desenează graficul
  drawFinanceChart(result.chartData, topic.id);
}

function renderSlider(inp, currentVal, topicId) {
  const numId    = 'fnum_'    + topicId + '_' + inp.id;
  const sliderId = 'fslider_' + topicId + '_' + inp.id;
  return `
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:10px;">
        <label for="${sliderId}" style="font-size:.82rem;color:var(--text-secondary);font-weight:500;flex:1;cursor:pointer;">${inp.label}</label>
        <input type="number" id="${numId}"
          value="${currentVal}"
          min="${inp.min}" max="${inp.max}" step="${inp.step}"
          style="width:92px;padding:4px 8px;background:var(--bg-raised);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-size:.83rem;font-weight:700;text-align:right;outline:none;appearance:textfield;-moz-appearance:textfield;flex-shrink:0;"
          onfocus="this.select()">
      </div>
      <input type="range" id="${sliderId}"
        min="${inp.min}" max="${inp.max}" step="${inp.step}" value="${currentVal}"
        class="fin-range">
      <div style="display:flex;justify-content:space-between;margin-top:3px;">
        <span style="font-size:.64rem;color:var(--text-muted);">${formatSliderDisplay(inp, inp.min)}</span>
        <span style="font-size:.64rem;color:var(--text-muted);">${formatSliderDisplay(inp, inp.max)}</span>
      </div>
    </div>`;
}

function formatSliderDisplay(inp, val) {
  if (inp.label.includes('%')) return val + '%';
  if (inp.label.includes('lei') || inp.label.includes('Lei')) return fmtCurrency(val);
  if (inp.label.includes('ani') || inp.label.includes('luni') || inp.label.includes('buc')) return val + (inp.label.includes('ani') ? ' ani' : inp.label.includes('luni') ? ' luni' : ' buc.');
  return val;
}

function refreshSimResults(topic) {
  const values = getInputValues(topic.id);
  const result = topic.simulator(values);

  // Update KPI cards
  result.outputs.forEach(out => {
    // Găsim cel mai rapid cardul — re-render doar dacă există
  });

  // Cel mai simplu: re-render complet panoul de sim (e rapid)
  renderSimPanel();
}

// ─────────────────────────────────────────────────────────────────
// 7. PANOUL NEURAL PATHWAYS (dreapta)
// ─────────────────────────────────────────────────────────────────
function renderPathwayPanel() {
  const panel = document.getElementById('financePathwayPanel');
  if (!panel) return;
  const topic = TOPIC_REGISTRY[financeState.activeTopic];

  panel.innerHTML = `
    <div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">
      <div style="padding:14px 16px;border-bottom:1px solid var(--border);background:var(--bg-surface);">
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--text-muted);">Neural Pathways</div>
        <div style="font-size:.8rem;color:var(--text-secondary);margin-top:2px;">Apasă un nod pentru explicație</div>
      </div>

      <!-- SVG graf -->
      <div style="padding:12px;position:relative;">
        <svg id="pathwaySVG" viewBox="0 0 100 100" style="width:100%;height:260px;overflow:visible;">
          ${renderPathwayEdges(topic)}
          ${renderPathwayNodes(topic)}
        </svg>
      </div>

      <!-- Detaliu nod selectat -->
      <div id="nodeDetail" style="padding:14px 16px;border-top:1px solid var(--border);min-height:80px;">
        ${financeState.activeNode
          ? renderNodeDetail(topic, financeState.activeNode)
          : `<div style="color:var(--text-muted);font-size:.82rem;text-align:center;padding:16px 0;">
               Apasă un nod de mai sus pentru a vedea explicația
             </div>`
        }
      </div>

      <!-- Legenda tipuri noduri -->
      <div style="padding:10px 16px;border-top:1px solid var(--border);display:flex;gap:12px;flex-wrap:wrap;">
        ${[
          { type: 'input',   color: '#4f6ef7', label: 'Input' },
          { type: 'cost',    color: '#ef4565', label: 'Cost' },
          { type: 'derived', color: '#f5a623', label: 'Derivat' },
          { type: 'output',  color: '#10d9a0', label: 'Output' },
        ].map(l => `
          <div style="display:flex;align-items:center;gap:5px;font-size:.7rem;color:var(--text-muted);">
            <div style="width:8px;height:8px;border-radius:50%;background:${l.color};"></div>
            ${l.label}
          </div>
        `).join('')}
      </div>
    </div>`;
}

function renderPathwayEdges(topic) {
  const isDark = document.body.getAttribute('data-theme') !== 'light';
  const inactiveStroke = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';

  return topic.connections.map(conn => {
    const from = topic.nodes.find(n => n.id === conn.from);
    const to   = topic.nodes.find(n => n.id === conn.to);
    if (!from || !to) return '';

    const isActive = financeState.activeNode === conn.from || financeState.activeNode === conn.to;
    const stroke   = isActive ? '#4f6ef7' : inactiveStroke;
    const sw       = isActive ? 1.4 : 0.8;

    // Shorten line so it ends at node edge, not center
    const len  = Math.hypot(to.x - from.x, to.y - from.y);
    if (len < 1) return '';
    const trim = 7; // radius + small gap
    const sx   = from.x + (to.x - from.x) / len * trim;
    const sy   = from.y + (to.y - from.y) / len * trim;
    const ex   = to.x   - (to.x - from.x) / len * trim;
    const ey   = to.y   - (to.y - from.y) / len * trim;

    // Arrowhead at end point
    const angle = Math.atan2(ey - sy, ex - sx);
    const al = 4.5; // arrow length
    const aw = 2.2; // arrow half-width
    const ax1 = ex - al * Math.cos(angle - 0.45);
    const ay1 = ey - al * Math.sin(angle - 0.45);
    const ax2 = ex - al * Math.cos(angle + 0.45);
    const ay2 = ey - al * Math.sin(angle + 0.45);

    return `<g style="transition:opacity .25s;" opacity="${isActive ? '1' : '0.75'}">
      <line x1="${sx.toFixed(2)}" y1="${sy.toFixed(2)}" x2="${ex.toFixed(2)}" y2="${ey.toFixed(2)}"
        stroke="${stroke}" stroke-width="${sw}"
        stroke-dasharray="${isActive ? 'none' : '2.5,2.5'}"
        stroke-linecap="round"/>
      <polyline points="${ax1.toFixed(2)},${ay1.toFixed(2)} ${ex.toFixed(2)},${ey.toFixed(2)} ${ax2.toFixed(2)},${ay2.toFixed(2)}"
        fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
  }).join('');
}

function renderPathwayNodes(topic) {
  const isDark       = document.body.getAttribute('data-theme') !== 'light';
  const inactiveFill = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const inactiveText = isDark ? 'rgba(255,255,255,0.6)'  : 'rgba(0,0,0,0.6)';

  return topic.nodes.map(node => {
    const isActive = financeState.activeNode === node.id;
    const label    = node.label.length > 10 ? node.label.substring(0, 9) + '\u2026' : node.label;
    const r        = isActive ? 8 : 6;
    const fill     = isActive ? node.color : inactiveFill;
    const sw       = isActive ? 2 : 1.5;
    const filter   = isActive ? `drop-shadow(0 0 4px ${node.color})` : 'none';
    const txtFill  = isActive ? node.color : inactiveText;
    const txtW     = isActive ? '700' : '500';

    return `<g onclick="window.finSelectNode('${node.id}')" style="cursor:pointer;">
      <circle cx="${node.x}" cy="${node.y}" r="12" fill="transparent"/>
      ${isActive ? `<circle cx="${node.x}" cy="${node.y}" r="${r + 5}"
        fill="none" stroke="${node.color}" stroke-width="0.6" opacity="0.35"
        style="animation:fin-pulse-ring 1.6s ease-out infinite;"/>` : ''}
      <circle cx="${node.x}" cy="${node.y}" r="${r}"
        fill="${fill}" stroke="${node.color}" stroke-width="${sw}"
        style="transition:all .2s;filter:${filter};"/>
      <text x="${node.x}" y="${node.y + r + 5.5}"
        text-anchor="middle" font-size="4.6"
        fill="${txtFill}" font-weight="${txtW}"
        style="pointer-events:none;font-family:var(--font-body);transition:fill .2s;">
        ${label}
      </text>
    </g>`;
  }).join('');
}

function renderNodeDetail(topic, nodeId) {
  const node = topic.nodes.find(n => n.id === nodeId);
  if (!node) return '';
  const typeLabels = { input: 'Variabilă de intrare', cost: 'Componentă de cost', derived: 'Valoare derivată', output: 'Rezultat' };
  return `
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <div style="width:10px;height:10px;border-radius:50%;background:${node.color};margin-top:3px;flex-shrink:0;"></div>
      <div>
        <div style="font-weight:700;font-size:.88rem;margin-bottom:3px;">${node.label}</div>
        <div style="font-size:.72rem;color:${node.color};margin-bottom:6px;text-transform:uppercase;letter-spacing:.8px;">${typeLabels[node.type] || node.type}</div>
        <div style="font-size:.82rem;color:var(--text-secondary);line-height:1.55;">${node.info}</div>
      </div>
    </div>`;
}

window.finSelectNode = function(nodeId) {
  financeState.activeNode = financeState.activeNode === nodeId ? null : nodeId;
  renderPathwayPanel();
};

// ─────────────────────────────────────────────────────────────────
// 8. GRAFICE — Chart.js inline, fără dependențe externe suplimentare
// ─────────────────────────────────────────────────────────────────
let _finChart = null;

function drawFinanceChart(chartData, topicId) {
  if (!chartData) return;

  const canvas = document.getElementById('financeChart');
  if (!canvas) return;

  // Distruge graficul anterior dacă există
  if (_finChart) { try { _finChart.destroy(); } catch(e) {} _finChart = null; }

  // Încarcă Chart.js dacă nu e deja disponibil
  if (typeof Chart === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
    script.onload = function() { drawChartNow(canvas, chartData, topicId); };
    document.head.appendChild(script);
    return;
  }
  drawChartNow(canvas, chartData, topicId);
}

function drawChartNow(canvas, chartData, topicId) {
  const ctx = canvas.getContext('2d');
  const isDark = document.body.getAttribute('data-theme') !== 'light';
  const gridColor  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const labelColor = isDark ? 'rgba(255,255,255,0.4)'  : 'rgba(0,0,0,0.4)';

  const baseOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => fmtCurrency(ctx.parsed.y ?? ctx.parsed),
        },
      },
    },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: labelColor, font: { size: 10 } } },
      y: { grid: { color: gridColor }, ticks: { color: labelColor, font: { size: 10 },
             callback: v => fmtCurrency(v) } },
    },
  };

  // ── BAR chart (profit_loss) ──────────────────────────────────
  if (chartData.type === 'bar') {
    _finChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [{
          data: chartData.datasets[0].data,
          backgroundColor: chartData.datasets[0].colors,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: { ...baseOpts },
    });
    return;
  }

  // ── LINE / AREA chart (compound_interest) ────────────────────
  if (chartData.type === 'area') {
    _finChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Valoare totală',
            data:  chartData.balance_line,
            borderColor: '#10d9a0',
            backgroundColor: 'rgba(16,217,160,0.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
          },
          {
            label: 'Total investit',
            data:  chartData.invested_line,
            borderColor: '#4f6ef7',
            backgroundColor: 'transparent',
            fill: false,
            borderDash: [4, 4],
            tension: 0,
            pointRadius: 0,
          },
        ],
      },
      options: {
        ...baseOpts,
        plugins: {
          ...baseOpts.plugins,
          legend: { display: true, labels: { color: labelColor, font: { size: 10 }, boxWidth: 14 } },
        },
      },
    });
    return;
  }

  // ── LINE break-even ──────────────────────────────────────────
  if (chartData.type === 'line') {
    const maxUnits = Math.ceil(chartData.bep_units * 2.2);
    const step     = Math.max(1, Math.ceil(maxUnits / 12));
    const labels   = [];
    const revLine  = [];
    const costLine = [];
    for (let u = 0; u <= maxUnits; u += step) {
      labels.push(u + ' buc');
      revLine.push(u * chartData.price);
      costLine.push(chartData.fixed_costs + u * chartData.var_cost);
    }
    _finChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Venituri', data: revLine,  borderColor: '#10d9a0', backgroundColor: 'rgba(16,217,160,0.05)', fill: true, tension: 0, pointRadius: 0 },
          { label: 'Costuri',  data: costLine, borderColor: '#ef4565', backgroundColor: 'transparent', fill: false, tension: 0, pointRadius: 0 },
        ],
      },
      options: {
        ...baseOpts,
        plugins: {
          ...baseOpts.plugins,
          legend: { display: true, labels: { color: labelColor, font: { size: 10 }, boxWidth: 14 } },
          annotation: {}, // placeholder dacă vrei să adaugi linia BEP
        },
      },
    });
    return;
  }

  // ── DONUT chart (ROI) ─────────────────────────────────────────
  if (chartData.type === 'donut') {
    const hasLoss = chartData.loss > 0;
    _finChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: hasLoss
          ? ['Investiție', 'Pierdere']
          : ['Investiție', 'Câștig'],
        datasets: [{
          data: hasLoss
            ? [chartData.invested, chartData.loss]
            : [chartData.invested, chartData.gain],
          backgroundColor: hasLoss
            ? ['#4f6ef7', '#ef4565']
            : ['#4f6ef7', '#10d9a0'],
          borderWidth: 0,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: labelColor, font: { size: 10 }, boxWidth: 12 } },
          tooltip: {
            callbacks: { label: ctx => fmtCurrency(ctx.parsed) },
          },
        },
      },
    });
    return;
  }

  // ── WATERFALL chart (cash_flow) ───────────────────────────────
  if (chartData.type === 'waterfall') {
    const items  = chartData.items;
    _finChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: items.map(i => i.label),
        datasets: [{
          data:            items.map(i => Math.abs(i.value)),
          backgroundColor: items.map(i => i.type === 'positive' ? '#10d9a0' : '#ef4565'),
          borderRadius: 5,
          borderSkipped: false,
        }],
      },
      options: {
        ...baseOpts,
        plugins: {
          ...baseOpts.plugins,
          tooltip: { callbacks: { label: ctx => fmtCurrency(items[ctx.dataIndex].value) } },
        },
      },
    });
    return;
  }
}

// ─────────────────────────────────────────────────────────────────
// 9. RESPONSIVE — pe ecrane mici, schimbă layout-ul în coloană
// ─────────────────────────────────────────────────────────────────
function applyFinanceResponsive() {
  const layout = document.getElementById('financeMainLayout');
  if (!layout) return;
  if (window.innerWidth < 900) {
    layout.style.gridTemplateColumns = '1fr';
  } else {
    layout.style.gridTemplateColumns = '1fr 340px';
  }
}

window.addEventListener('resize', applyFinanceResponsive);

// ─────────────────────────────────────────────────────────────────
// 10. ENTRY POINT — înregistrează funcția globală apelată din index.html
// ─────────────────────────────────────────────────────────────────
window.renderFinancePage = renderFinancePage;
