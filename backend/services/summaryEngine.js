'use strict';
// ═══════════════════════════════════════════════════════════════════
// summaryEngine.js — Smart Summary Engine v1.0
//
// Flow per request:
//   1. preprocessDocument()  — local heuristics, zero LLM cost
//   2. computeDocHash()       — cache key
//   3. selectModel()          — Haiku vs Sonnet routing
//   4. buildUserPrompt()      — subject + intent + chunked doc
//   5. API call with cached system prompt
//   6. Parse + validate JSON output
// ═══════════════════════════════════════════════════════════════════

const crypto   = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');

const ENGINE_VERSION = 'v1.0';

const MODEL_SONNET = process.env.ANTHROPIC_MODEL      || 'claude-sonnet-4-20250514';
const MODEL_HAIKU  = process.env.ANTHROPIC_HAIKU_MODEL || 'claude-haiku-4-5-20251001';

// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — domain-aware, cacheable per variant
// Full prompt used as fallback when domain is unknown.
// Domain-specific variants exclude irrelevant section kinds (~400 fewer tokens).
// ─────────────────────────────────────────────────────────────────

const PROMPT_PREAMBLE = `Ești un arhitect pedagogic. Scopul tău NU este să rezumi — ci să construiești un SCAFFOLD COGNITIV: structura mentală minimă necesară ca studentul, după ce citește fișa ta, să intre în documentul original și fiecare paragraf nou să îi provoace reacția "aha, asta se leagă de ce am văzut".

────────────────────────────────────────────
ANALIZA DOCUMENTULUI
────────────────────────────────────────────
Distribuie 1.0 între aceste tipuri de cunoaștere (suma = 1.0):
- quantitative: formule matematice, demonstrații, date numerice
- conceptual: teorii, definiții, modele mentale, relații logice
- empirical: studii, autori, experimente, dovezi
- procedural: pași, protocoale, algoritmi, procese
- normative: legi, articole, condiții juridice, reglementări`;

// All 21 section kind definitions (used in full/fallback prompt)
const ALL_SECTION_KINDS = `
────────────────────────────────────────────
BIBLIOTECA DE SECȚIUNI (23 tipuri)
────────────────────────────────────────────
Alege 3-5 secțiuni cu relevance > 0.5. Fiecare are schema exactă de mai jos.

CANTITATIVE:
formule      → {"kind":"formule","title":"...","relevance":0.0,"items":[{"expression":"LaTeX: ex \\frac{F}{m}","label":"ce calculează","vars":[{"symbol":"F","meaning":"forța [N]"}]}]}
derivare     → {"kind":"derivare","title":"...","relevance":0.0,"steps":["pas 1 cu LaTeX inline dacă e nevoie: $E=mc^2$","pas 2"]}
complexitate → {"kind":"complexitate","title":"...","relevance":0.0,"rows":[{"case":"Best/Average/Worst","time":"O(...)","space":"O(...)","note":"..."}]}
date_numerice→ {"kind":"date_numerice","title":"...","relevance":0.0,"rows":[{"metric":"...","value":"...","note":"..."}]}
constante    → {"kind":"constante","title":"...","relevance":0.0,"items":[{"symbol":"G","value":"6.674×10⁻¹¹","unit":"N·m²/kg²","meaning":"constanta gravitației universale"}]}
assumptions  → {"kind":"assumptions","title":"...","relevance":0.0,"model":"Modelul sau teorema","items":["H1: homoscedasticity — Var(εᵢ) = σ² constant","H2: ..."]}


STRUCTURALE:
mechanism    → {"kind":"mechanism","title":"...","relevance":0.0,"items":[{"level":"Macro","text":"..."},{"level":"Mediu","text":"..."},{"level":"Micro","text":"..."}]}
cauza_efect  → {"kind":"cauza_efect","title":"...","relevance":0.0,"chains":[["elem1","→","elem2","→","elem3"]]}
comparatie   → {"kind":"comparatie","title":"...","relevance":0.0,"label_a":"A","label_b":"B","items":[{"aspect":"...","a":"...","b":"..."}]}
taxonomie    → {"kind":"taxonomie","title":"...","relevance":0.0,"items":[{"name":"...","description":"..."}]}

PROCEDURALE:
protocol     → {"kind":"protocol","title":"...","relevance":0.0,"items":["pas 1","pas 2"]}
cod          → {"kind":"cod","title":"...","relevance":0.0,"code":"pseudocod sau cod","language":"Python/JS/pseudocod"}
conditii     → {"kind":"conditii","title":"...","relevance":0.0,"items":["condiție 1","condiție 2"]}

NORMATIVE:
articol      → {"kind":"articol","title":"...","relevance":0.0,"cite":"Art. X din Legea Y","body":"textul exact sau parafraza precisă"}
exceptii     → {"kind":"exceptii","title":"...","relevance":0.0,"items":["excepție 1","excepție 2"]}

EMPIRICE:
studii       → {"kind":"studii","title":"...","relevance":0.0,"items":[{"t":"Autor (an)","d":"rezultat/descriere"}]}
autori       → {"kind":"autori","title":"...","relevance":0.0,"cards":[{"name":"...","year":"...","contribution":"..."}]}
critici      → {"kind":"critici","title":"...","relevance":0.0,"items":["critică 1","critică 2"]}

VIZUALE:
distributie  → {"kind":"distributie","title":"...","relevance":0.0,"dist_type":"normal","description":"ce ilustrează distribuția în context","annotation":"Ce reprezintă aria colorată — ex: P[pierdere > prag] = 0.05%"}
             → Folosește DOAR când documentul discută explicit distribuții de probabilitate, variabile aleatoare continue, curbe normale, VaR, sau pierderi stochastice.

APLICATE:
caz          → {"kind":"caz","title":"...","relevance":0.0,"body":"descriere caz real sau rezolvat"}
ddx          → {"kind":"ddx","title":"...","relevance":0.0,"rows":[{"name":"alternativa","cue":"cum o distingi"}]}
aplicatii    → {"kind":"aplicatii","title":"...","relevance":0.0,"items":["aplicație 1","aplicație 2"]}
warnings     → {"kind":"warnings","title":"...","relevance":0.0,"items":["greșeală frecventă 1"]}
glosar       → {"kind":"glosar","title":"...","relevance":0.0,"items":[{"term":"...","definition":"..."}]}`;

// Section kind schemas — one per kind
const KIND_SCHEMAS = {
  formule:      'formule      → {"kind":"formule","title":"...","relevance":0.0,"items":[{"expression":"LaTeX: ex \\\\frac{F}{m}","label":"ce calculează","vars":[{"symbol":"F","meaning":"forța [N]"}]}]}',
  derivare:     'derivare     → {"kind":"derivare","title":"...","relevance":0.0,"steps":["pas 1 — LaTeX inline cu $...$: $E=mc^2$","pas 2"]}',
  constante:    'constante    → {"kind":"constante","title":"...","relevance":0.0,"items":[{"symbol":"G","value":"6.674×10⁻¹¹","unit":"N·m²/kg²","meaning":"constanta gravitației universale"}]}',
  assumptions:  'assumptions  → {"kind":"assumptions","title":"...","relevance":0.0,"model":"Modelul sau teorema","items":["H1: ...","H2: ..."]}',
  complexitate: 'complexitate → {"kind":"complexitate","title":"...","relevance":0.0,"rows":[{"case":"Best/Average/Worst","time":"O(...)","space":"O(...)","note":"..."}]}',
  date_numerice:'date_numerice→ {"kind":"date_numerice","title":"...","relevance":0.0,"rows":[{"metric":"...","value":"...","note":"..."}]}',
  mechanism:    'mechanism    → {"kind":"mechanism","title":"...","relevance":0.0,"items":[{"level":"Macro","text":"..."},{"level":"Mediu","text":"..."},{"level":"Micro","text":"..."}]}',
  cauza_efect:  'cauza_efect  → {"kind":"cauza_efect","title":"...","relevance":0.0,"chains":[["elem1","→","elem2","→","elem3"]]}',
  comparatie:   'comparatie   → {"kind":"comparatie","title":"...","relevance":0.0,"label_a":"A","label_b":"B","items":[{"aspect":"...","a":"...","b":"..."}]}',
  taxonomie:    'taxonomie    → {"kind":"taxonomie","title":"...","relevance":0.0,"items":[{"name":"...","description":"..."}]}',
  protocol:     'protocol     → {"kind":"protocol","title":"...","relevance":0.0,"items":["pas 1","pas 2"]}',
  cod:          'cod          → {"kind":"cod","title":"...","relevance":0.0,"code":"pseudocod sau cod","language":"Python/JS/pseudocod"}',
  conditii:     'conditii     → {"kind":"conditii","title":"...","relevance":0.0,"items":["condiție 1","condiție 2"]}',
  articol:      'articol      → {"kind":"articol","title":"...","relevance":0.0,"cite":"Art. X din Legea Y","body":"textul exact sau parafraza precisă"}',
  exceptii:     'exceptii     → {"kind":"exceptii","title":"...","relevance":0.0,"items":["excepție 1","excepție 2"]}',
  studii:       'studii       → {"kind":"studii","title":"...","relevance":0.0,"items":[{"t":"Autor (an)","d":"rezultat/descriere"}]}',
  autori:       'autori       → {"kind":"autori","title":"...","relevance":0.0,"cards":[{"name":"...","year":"...","contribution":"..."}]}',
  critici:      'critici      → {"kind":"critici","title":"...","relevance":0.0,"items":["critică 1","critică 2"]}',
  distributie:  'distributie  → {"kind":"distributie","title":"...","relevance":0.0,"dist_type":"normal","description":"ce ilustrează distribuția în context","annotation":"Ce reprezintă aria colorată — ex: P[pierdere > prag] = 0.05%"}\n             → Folosește DOAR când documentul discută explicit distribuții de probabilitate, variabile aleatoare continue, curbe normale, VaR, sau pierderi stochastice.',
  caz:          'caz          → {"kind":"caz","title":"...","relevance":0.0,"body":"descriere caz real sau rezolvat"}',
  ddx:          'ddx          → {"kind":"ddx","title":"...","relevance":0.0,"rows":[{"name":"alternativa","cue":"cum o distingi"}]}',
  aplicatii:    'aplicatii    → {"kind":"aplicatii","title":"...","relevance":0.0,"items":["aplicație 1","aplicație 2"]}',
  warnings:     'warnings     → {"kind":"warnings","title":"...","relevance":0.0,"items":["greșeală frecventă 1"]}',
  glosar:       'glosar       → {"kind":"glosar","title":"...","relevance":0.0,"items":[{"term":"...","definition":"..."}]}',
};

// Section kinds relevant per domain — reduces library from 21 to 9-12
const DOMAIN_KINDS = {
  medicine:       ['mechanism','cauza_efect','protocol','ddx','warnings','caz','glosar','comparatie','taxonomie','studii','date_numerice'],
  law:            ['articol','exceptii','conditii','protocol','glosar','comparatie','taxonomie','warnings','caz','cauza_efect'],
  exact_sciences: ['formule','derivare','complexitate','date_numerice','mechanism','cauza_efect','comparatie','distributie','glosar','warnings','constante','assumptions'],
  engineering:    ['formule','derivare','constante','date_numerice','mechanism','cauza_efect','comparatie','protocol','warnings','glosar','assumptions','conditii'],
  social_sciences:['mechanism','cauza_efect','comparatie','taxonomie','studii','autori','critici','aplicatii','warnings','glosar','caz','date_numerice'],
  cs:             ['cod','complexitate','protocol','mechanism','comparatie','warnings','glosar','aplicatii','caz','cauza_efect'],
  humanities:     ['autori','studii','critici','comparatie','taxonomie','glosar','cauza_efect','caz','aplicatii','warnings'],
};

// Selection rules per domain — shorter than generic ruleset
const DOMAIN_RULES = {
  medicine:        '- procedural > 0.3 → include protocol\n- empirical > 0.3 → include studii\n- Dacă alternative de diagnostic → ddx obligatoriu\n- Dacă pași clari → protocol',
  law:             '- normative > 0.25 → articol și conditii obligatorii\n- exceptii dacă legea prevede excepții explicite\n- procedural → protocol pentru proceduri juridice',
  exact_sciences:  '- quantitative > 0.35 → formule sau derivare obligatoriu\n- constante dacă document conține constante fizice sau parametri de referință\n- assumptions dacă document menționează ipoteze de model (Gauss-Markov, regularitate, etc.)\n- distributie DOAR dacă probabilitate/VaR/pierderi stochastice explicit menționate\n- complexitate dacă algoritmi prezenți',
  engineering:     '- quantitative > 0.35 → formule și constante obligatorii\n- assumptions dacă sunt menționate condiții de aplicabilitate sau limite de model\n- protocol pentru proceduri tehnice sau proceduri de calcul\n- comparatie dacă sunt puse în contrast metode sau abordări',
  social_sciences: '- empirical > 0.3 → studii sau autori\n- comparatie dacă două teorii/modele puse față în față\n- critici dacă document prezintă limite sau dezbateri',
  cs:              '- cod obligatoriu dacă algoritmi sau pseudocod în document\n- complexitate dacă cod prezent\n- protocol pentru fluxuri de date sau arhitecturi',
  humanities:      '- autori dacă contribuții individuale menționate\n- critici dacă dezbateri sau limite prezentate\n- caz dacă exemple istorice sau literare concrete',
};

const PROMPT_INTENT = `
────────────────────────────────────────────
ADAPTARE DUPĂ LEARNING INTENT
────────────────────────────────────────────
understand  → accent pe mechanism, cauza_efect, analogii intuitive
exam_prep   → accent pe formule, warnings, conditii, pathway cu termeni exact
apply       → accent pe caz, aplicatii, protocol, exemple concrete`;

const PROMPT_DOMAIN_DETECTION = `
────────────────────────────────────────────
DETECTARE DOMENIU (domain_category)
────────────────────────────────────────────
exact_sciences: matematică, fizică, chimie, statistică, econometrie, analiză numerică, termodinamică, mecanică cuantică — orice disciplină cu formalism matematic dens
engineering: inginerie aerospațială, inginerie mecanică, electrică, electronică, automatică, construcții, inginerie industrială, robotică
social_sciences: psihologie, sociologie, economie generală, management, marketing, comportament organizațional — fără matematică intensivă
law: drept, legislație, constituție, articole de lege, reglementări
medicine: medicină, anatomie, farmacologie, fiziologie, patologie, biologie
humanities: filozofie, istorie, literatură, lingvistică, artă, pedagogie
cs: programare, algoritmi, sisteme, rețele, baze de date, securitate IT
other: orice alt domeniu

IMPORTANT: econometria, statistica matematică și modelele cantitative din economie → exact_sciences (nu social_sciences)`;

const PROMPT_SCAFFOLD_PRINCIPLES = `
────────────────────────────────────────────
PRINCIPIU SCAFFOLD
────────────────────────────────────────────
Fiecare secțiune trebuie să:
1. Folosească terminologia exactă din document (nu parafrazeze în alt limbaj)
2. Creeze ancore mentale pe care studentul le va recunoaște în textul original
3. Prioritizeze STRUCTURA față de completitudine
4. Nu explice tot — deschidă calea spre document

────────────────────────────────────────────
NOTAȚIE MATEMATICĂ
────────────────────────────────────────────
- Câmpul "expression" din "formule": folosește EXCLUSIV notație LaTeX (ex: \\frac{a}{b}, \\int_0^T f(x)dx, \\sigma^2, \\nabla^2\\psi)
- Pașii din "derivare": poți folosi LaTeX inline cu delimitatori $...$ (ex: "Din $F=ma$ rezultă $a=\\frac{F}{m}$")
- Orice alt câmp de text: text simplu cu simboluri Unicode (σ², ∂x, ≤) — FĂRĂ LaTeX
- Fiecare item din "formule" trebuie să aibă câmpul "vars" cu toate variabilele explicate`;

const PROMPT_OUTPUT_FORMAT = (domainCategory) => `
────────────────────────────────────────────
FORMAT OUTPUT — EXCLUSIV JSON VALID
────────────────────────────────────────────
Niciun text, niciun markdown, niciun backtick în afara JSON-ului.

{
  "analysis": {
    "knowledge_profile": {"quantitative":0.0,"conceptual":0.0,"empirical":0.0,"procedural":0.0,"normative":0.0},
    "difficulty": "introductory|intermediate|advanced",
    "source_quality": "good|medium|poor",
    "confidence": 0.0,
    "prerequisites": ["concept 1"],
    "learning_position": {"requires":["prerequisit 1"],"leads_to":["subiect următor 1"]}
  },
  "output": {
    "title": "Titlu concis al temei",
    "why_it_matters": "1-2 propoziții de ce contează",
    "domain_tags": ["tag1","tag2","tag3"],
    "domain_category": "${domainCategory || 'exact_sciences|engineering|social_sciences|law|medicine|humanities|cs|other'}",
    "layers": [
      {"level":"Intuitiv","text":"explicație simplă, analogie din viața reală"},
      {"level":"Conceptual","text":"explicație academică, termeni cheie, logica internă"},
      {"level":"Tehnic","text":"detaliu tehnic, formule, excepții, nuanțe avansate"}
    ],
    "sections": [],
    "pathway": ["Concept A","Concept B","Concept C"],
    "ce_urmeaza": "Ce vei găsi în documentul original că nu e în această fișă...",
    "key_insight": "O propoziție esențială care rezumă tot"
  }
}`;

function buildSystemPrompt(domain) {
  if (!domain || !DOMAIN_KINDS[domain]) {
    // Full prompt — fallback for unknown domain
    return PROMPT_PREAMBLE
      + ALL_SECTION_KINDS
      + '\n\n────────────────────────────────────────────\nREGULI DE SELECȚIE\n────────────────────────────────────────────\n- Alege secțiunile cu relevance > 0.5, maximum 5\n- quantitative > 0.35 → include formule sau derivare\n- document menționează distribuții/probabilitate/VaR/pierderi stochastice → include distributie (max 1 per rezumat)\n- normative > 0.25 → include articol și conditii\n- empirical > 0.3 → include studii sau autori\n- procedural > 0.3 → include protocol sau cod\n- Dacă documentul are alternative clare → include ddx sau comparatie\n- Dacă documentul e bazat pe algoritmi → include cod și complexitate\n- Nu forța secțiuni fără conținut real'
      + PROMPT_INTENT
      + PROMPT_DOMAIN_DETECTION
      + PROMPT_SCAFFOLD_PRINCIPLES
      + PROMPT_OUTPUT_FORMAT(null);
  }

  // Domain-specific prompt — trimmed library + no domain detection section
  const kinds = DOMAIN_KINDS[domain];
  const sectionDefs = kinds.map(k => KIND_SCHEMAS[k]).filter(Boolean).join('\n');

  return PROMPT_PREAMBLE
    + `\n\n────────────────────────────────────────────\nSECȚIUNI DISPONIBILE PENTRU ${domain.toUpperCase()} (${kinds.length} tipuri)\n────────────────────────────────────────────\nAlege 3-5 secțiuni cu relevance > 0.5. Schema exactă:\n\n`
    + sectionDefs
    + `\n\n────────────────────────────────────────────\nREGULI DE SELECȚIE\n────────────────────────────────────────────\n- Alege secțiunile cu relevance > 0.5, maximum 5\n`
    + DOMAIN_RULES[domain]
    + '\n- Nu forța secțiuni fără conținut real'
    + PROMPT_INTENT
    + PROMPT_SCAFFOLD_PRINCIPLES
    + PROMPT_OUTPUT_FORMAT(domain);
}

// Backwards-compatible constant for the full prompt
const SYSTEM_PROMPT = buildSystemPrompt(null);

// ─────────────────────────────────────────────────────────────────
// PREPROCESSING LOCAL — zero LLM cost
// ─────────────────────────────────────────────────────────────────
function preprocessDocument(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const wordCount = clean.split(' ').length;

  // Formula detection — math symbols, LaTeX, Greek names, subscripts, units
  const formulaMatches = clean.match(
    /[=∑∫∂≤≥±√∞∈∩∪→←⟹∀∃λμσπθφψωΓΔΘΛΞΠΣΦΨΩαβγδεζηικνξορτυχ]|\\[a-zA-Z]+[\{\s(]|[A-Za-z]_[0-9a-zA-Z{]|[A-Za-z]\^[0-9a-zA-Z{-]|d[²³]|∂²|P\[|E\[|Var\[|Cov\[|\b(?:alpha|beta|gamma|delta|epsilon|theta|lambda|sigma|omega|phi|chi|psi|mu|nu|rho|tau)\b/g
  ) || [];
  const formulaDensity = formulaMatches.length / Math.max(wordCount, 1);

  // OCR artifact detection
  const words = clean.split(' ');
  const singleCharWords = words.filter(function(w){ return w.length === 1 && /[a-zA-Z]/.test(w); }).length;
  const singleCharRatio = singleCharWords / Math.max(words.length, 1);
  const avgWordLen = words.reduce(function(s, w){ return s + w.length; }, 0) / Math.max(words.length, 1);
  const suspiciousChars = (clean.match(/[□■▪▫◆◇○●‐‑…� -]/g) || []).length;
  const ocrRisk = (singleCharRatio > 0.15 || avgWordLen < 2.5 || suspiciousChars > 20) ? 'high'
    : (singleCharRatio > 0.08 || avgWordLen < 3.2) ? 'medium' : 'low';

  // Code detection
  const hasCode = /function\s+\w+|def\s+\w+|class\s+\w+|import\s+\w+|SELECT\s+|for\s*\(|while\s*\(|```/.test(clean);

  // Legal/normative detection
  const hasLegalContent = /art\.\s*\d+|alin\.\s*\d+|cod\s+penal|legea\s+nr|regulament|directiv/i.test(clean);

  // Headings detection
  const headingCount = (clean.match(/\b[A-ZȘȚĂÎÂ][A-ZȘȚĂÎÂ\s]{4,}\b/g) || []).length;

  // Source quality estimate
  let sourceQuality = 'good';
  const avgWordLength = clean.split(' ').reduce((s, w) => s + w.length, 0) / Math.max(wordCount, 1);
  if (avgWordLength < 3 || wordCount < 100) sourceQuality = 'poor';
  else if (wordCount < 300 || headingCount === 0) sourceQuality = 'medium';

  // Smart chunking — formula-dense docs get larger window + middle preserved
  const isTechnical = formulaDensity > 0.02;
  const MAX_CHARS = isTechnical ? 20000 : 14000;
  let chunk = clean;
  if (clean.length > MAX_CHARS) {
    if (isTechnical) {
      // head 40% + middle 40% + tail 20% — preserves derivations at center
      const head = clean.substring(0, Math.floor(MAX_CHARS * 0.4));
      const midStart = Math.floor(clean.length * 0.4);
      const mid  = clean.substring(midStart, midStart + Math.floor(MAX_CHARS * 0.4));
      const tail = clean.substring(clean.length - Math.floor(MAX_CHARS * 0.2));
      chunk = head + '\n\n[...]\n\n' + mid + '\n\n[...]\n\n' + tail;
    } else {
      const head = clean.substring(0, Math.floor(MAX_CHARS * 0.75));
      const tail = clean.substring(clean.length - Math.floor(MAX_CHARS * 0.25));
      chunk = head + '\n\n[...]\n\n' + tail;
    }
  }

  return {
    wordCount,
    formulaDensity,
    hasCode,
    hasLegalContent,
    headingCount,
    sourceQuality,
    ocrRisk,
    chunk,
    originalLength: text.length,
    truncated: text.length > MAX_CHARS,
  };
}

// ─────────────────────────────────────────────────────────────────
// MODEL ROUTING — Haiku vs Sonnet
// ─────────────────────────────────────────────────────────────────
function selectModel(heuristics) {
  const { wordCount, formulaDensity, hasCode, sourceQuality } = heuristics;
  // Use Sonnet for complex/dense documents
  if (
    wordCount > 2500 ||
    formulaDensity > 0.03 ||
    hasCode ||
    sourceQuality === 'poor'
  ) {
    return MODEL_SONNET;
  }
  return MODEL_HAIKU;
}

// ─────────────────────────────────────────────────────────────────
// DOCUMENT HASH — for cache key
// ─────────────────────────────────────────────────────────────────
function computeDocHash(text, intent) {
  return crypto
    .createHash('sha256')
    .update(text.substring(0, 50000) + intent + ENGINE_VERSION)
    .digest('hex')
    .substring(0, 32);
}

// ─────────────────────────────────────────────────────────────────
// BUILD USER PROMPT — changes per request
// ─────────────────────────────────────────────────────────────────
function buildUserPrompt(subjectName, intent, heuristics, domain, userProfileNote, knowledgeLevel, timeContext) {
  const intentMap = {
    understand: 'ÎNȚELEGERE PROFUNDĂ — accent pe mecanisme și analogii intuitive',
    exam_prep:  'PREGĂTIRE EXAMEN — accent pe termeni exacți, formule, greșeli frecvente',
    apply:      'APLICARE PRACTICĂ — accent pe cazuri, exemple, protocoale',
  };

  const knowledgeMap = {
    first_contact: 'PRIMUL CONTACT cu materia — explică termenii de bază, folosește analogii simple, nu presupune cunoștințe anterioare, glosar obligatoriu dacă există terminologie specifică',
    intermediate:  'CUNOAȘTE BAZELE — poți folosi terminologia specifică, focusează pe conexiuni și nuanțe, nu explica ce știe deja',
    review:        'RECAPITULARE — dens și concis, accent pe ce diferențiază conceptele, warnings pentru greșeli frecvente la examen',
  };

  const timeMap = {
    exam_soon:      'EXAMEN IMINENT — prioritizează formule esențiale, warnings, conditii de aplicare, ce iese frecvent la examene',
    studying_ahead: 'TIMP SUFICIENT — include profunzime, conexiuni cu alte concepte, aplicații practice, context larg',
    quick_review:   'REVIZUIRE RAPIDĂ — key_insight și pathway sunt prioritare, secțiunile să fie concise, fără divagații',
  };

  const hints = [];
  if (heuristics.formulaDensity > 0.02) hints.push('documentul conține formule matematice — include secțiuni cantitative');
  if (heuristics.hasCode) hints.push('documentul conține cod sau algoritmi — include secțiunea cod');
  if (heuristics.hasLegalContent) hints.push('documentul conține conținut normativ/juridic — include articol și conditii');
  if (heuristics.sourceQuality === 'poor') hints.push('documentul pare fragmentat — reconstruiește conceptual mai mult decât urmezi structura textului');
  if (heuristics.ocrRisk === 'high') hints.push('ATENȚIE: textul conține artefacte OCR sau extracție defectuoasă — ignoră caracterele garbled, reconstruiește conceptele din context');
  if (heuristics.truncated) hints.push(`documentul original are ${heuristics.wordCount} cuvinte — am trimis un chunk reprezentativ`);

  const domainLine       = domain          ? `Domeniu materie: ${domain}` : '';
  const profileLine      = userProfileNote ? `Profil student la această materie: "${userProfileNote}" — adaptează explicațiile și exemplele în consecință` : '';
  const knowledgeLine    = knowledgeLevel && knowledgeMap[knowledgeLevel] ? `Nivel student: ${knowledgeMap[knowledgeLevel]}` : '';
  const timeContextLine  = timeContext && timeMap[timeContext] ? `Context timp: ${timeMap[timeContext]}` : '';

  return `Materie: ${subjectName}
${domainLine}
${profileLine}
${knowledgeLine}
${timeContextLine}
Intent student: ${intentMap[intent] || intentMap.understand}
${hints.length ? 'Hints din analiză locală:\n' + hints.map(h => '- ' + h).join('\n') : ''}

DOCUMENT:
${heuristics.chunk}

Generează scaffold-ul cognitiv conform instrucțiunilor. EXCLUSIV JSON valid.`;
}

// ─────────────────────────────────────────────────────────────────
// GENERATE — main entry point
// ─────────────────────────────────────────────────────────────────
async function generateSmartSummary({ text, subjectName, intent = 'understand', apiKey, domain, userProfileNote, knowledgeLevel, timeContext }) {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');

  const client = new Anthropic({ apiKey });
  const heuristics = preprocessDocument(text);
  const model = selectModel(heuristics);
  const userPrompt = buildUserPrompt(subjectName, intent, heuristics, domain, userProfileNote, knowledgeLevel, timeContext);

  const response = await client.messages.create({
    model,
    max_tokens: model === MODEL_SONNET ? 8000 : 5000,
    system: [
      {
        type: 'text',
        text: buildSystemPrompt(domain),
        cache_control: { type: 'ephemeral' }, // cached per domain variant
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = response.content[0]?.text || '';
  const clean = raw
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```$/m, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (firstErr) {
    // Try extracting the largest JSON object from response
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI nu a returnat JSON valid');
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      // JSON truncated mid-response (output exceeded max_tokens)
      const isTruncated = firstErr.message && firstErr.message.includes('position');
      throw new Error(
        isTruncated
          ? 'Documentul este prea lung pentru o singură fișă. Încearcă cu primele 3-4 pagini sau un capitol specific.'
          : 'AI nu a returnat JSON valid. Încearcă din nou.'
      );
    }
  }

  // Validate minimal structure
  if (!parsed.output || !parsed.output.title) {
    throw new Error('Structura JSON incompletă — încearcă din nou.');
  }

  return {
    data: parsed,
    model,
    inputTokens:  response.usage?.input_tokens  || 0,
    outputTokens: response.usage?.output_tokens || 0,
    costUsd: ((response.usage?.input_tokens || 0) * 3 + (response.usage?.output_tokens || 0) * 15) / 1_000_000,
    heuristics,
    engineVersion: ENGINE_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────
// PARTIAL REGENERATION — single section
// ─────────────────────────────────────────────────────────────────
async function regenerateSection({ sectionKind, currentSection, context, instruction, subjectName, apiKey }) {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
  const client = new Anthropic({ apiKey });

  const prompt = `Materie: ${subjectName}
Task: Regenerează DOAR secțiunea de tip "${sectionKind}".
Instrucțiune utilizator: ${instruction}

Secțiunea curentă:
${JSON.stringify(currentSection, null, 2)}

Context relevant din document:
${context.substring(0, 3000)}

Returnează EXCLUSIV obiectul JSON al secțiunii regenerate, cu același format și același "kind".`;

  const response = await client.messages.create({
    model: MODEL_HAIKU,
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0]?.text || '';
  const clean = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Secțiunea regenerată nu e JSON valid');

  return {
    section: JSON.parse(match[0]),
    inputTokens:  response.usage?.input_tokens  || 0,
    outputTokens: response.usage?.output_tokens || 0,
    costUsd: ((response.usage?.input_tokens || 0) * 3 + (response.usage?.output_tokens || 0) * 15) / 1_000_000,
  };
}

module.exports = {
  ENGINE_VERSION,
  preprocessDocument,
  selectModel,
  computeDocHash,
  generateSmartSummary,
  regenerateSection,
};
