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
// SYSTEM PROMPT — fixed, cacheable, ~3000 tokens
// ─────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Ești un arhitect pedagogic. Scopul tău NU este să rezumi — ci să construiești un SCAFFOLD COGNITIV: structura mentală minimă necesară ca studentul, după ce citește fișa ta, să intre în documentul original și fiecare paragraf nou să îi provoace reacția "aha, asta se leagă de ce am văzut".

────────────────────────────────────────────
ANALIZA DOCUMENTULUI
────────────────────────────────────────────
Distribuie 1.0 între aceste tipuri de cunoaștere (suma = 1.0):
- quantitative: formule matematice, demonstrații, date numerice
- conceptual: teorii, definiții, modele mentale, relații logice
- empirical: studii, autori, experimente, dovezi
- procedural: pași, protocoale, algoritmi, procese
- normative: legi, articole, condiții juridice, reglementări

────────────────────────────────────────────
BIBLIOTECA DE SECȚIUNI (21 tipuri)
────────────────────────────────────────────
Alege 3-5 secțiuni cu relevance > 0.5. Fiecare are schema exactă de mai jos.

CANTITATIVE:
formule      → {"kind":"formule","title":"...","relevance":0.0,"items":[{"expression":"formula","label":"ce calculează"}]}
derivare     → {"kind":"derivare","title":"...","relevance":0.0,"steps":["pas 1","pas 2"]}
complexitate → {"kind":"complexitate","title":"...","relevance":0.0,"rows":[{"case":"Best/Average/Worst","time":"O(...)","space":"O(...)","note":"..."}]}
date_numerice→ {"kind":"date_numerice","title":"...","relevance":0.0,"rows":[{"metric":"...","value":"...","note":"..."}]}

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
glosar       → {"kind":"glosar","title":"...","relevance":0.0,"items":[{"term":"...","definition":"..."}]}

────────────────────────────────────────────
REGULI DE SELECȚIE
────────────────────────────────────────────
- Alege secțiunile cu relevance > 0.5, maximum 5
- quantitative > 0.35 → include formule sau derivare
- document menționează distribuții/probabilitate/VaR/pierderi stochastice → include distributie (max 1 per rezumat)
- normative > 0.25 → include articol și conditii
- empirical > 0.3 → include studii sau autori
- procedural > 0.3 → include protocol sau cod
- Dacă documentul are alternative clare → include ddx sau comparatie
- Dacă documentul e bazat pe algoritmi → include cod și complexitate
- Nu forța secțiuni fără conținut real

────────────────────────────────────────────
ADAPTARE DUPĂ LEARNING INTENT
────────────────────────────────────────────
understand  → accent pe mechanism, cauza_efect, analogii intuitive
exam_prep   → accent pe formule, warnings, conditii, pathway cu termeni exact
apply       → accent pe caz, aplicatii, protocol, exemple concrete

────────────────────────────────────────────
DETECTARE DOMENIU (domain_category)
────────────────────────────────────────────
exact_sciences: matematică, fizică, chimie, statistică, inginerie
social_sciences: psihologie, sociologie, economie, management, marketing
law: drept, legislație, constituție, articole de lege, reglementări
medicine: medicină, anatomie, farmacologie, fiziologie, patologie, biologie
humanities: filozofie, istorie, literatură, lingvistică, artă, pedagogie
cs: programare, algoritmi, sisteme, rețele, baze de date, securitate IT
other: orice alt domeniu

────────────────────────────────────────────
PRINCIPIU SCAFFOLD
────────────────────────────────────────────
Fiecare secțiune trebuie să:
1. Folosească terminologia exactă din document (nu parafrazeze în alt limbaj)
2. Creeze ancore mentale pe care studentul le va recunoaște în textul original
3. Prioritizeze STRUCTURA față de completitudine
4. Nu explice tot — deschidă calea spre document

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
    "domain_category": "exact_sciences|social_sciences|law|medicine|humanities|cs|other",
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

// ─────────────────────────────────────────────────────────────────
// PREPROCESSING LOCAL — zero LLM cost
// ─────────────────────────────────────────────────────────────────
function preprocessDocument(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const wordCount = clean.split(' ').length;

  // Formula detection — math symbols + LaTeX patterns
  const formulaMatches = clean.match(/[=∑∫∂≤≥±√∞∈∩∪→←⟹∀∃]|\\[a-z]+\{|[A-Z]\([A-Z]\)|P\[|E\[/g) || [];
  const formulaDensity = formulaMatches.length / Math.max(wordCount, 1);

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

  // Smart chunking — keep beginning + end for context
  const MAX_CHARS = 14000;
  let chunk = clean;
  if (clean.length > MAX_CHARS) {
    const head = clean.substring(0, Math.floor(MAX_CHARS * 0.75));
    const tail = clean.substring(clean.length - Math.floor(MAX_CHARS * 0.25));
    chunk = head + '\n\n[...]\n\n' + tail;
  }

  return {
    wordCount,
    formulaDensity,
    hasCode,
    hasLegalContent,
    headingCount,
    sourceQuality,
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
function buildUserPrompt(subjectName, intent, heuristics) {
  const intentMap = {
    understand: 'ÎNȚELEGERE PROFUNDĂ — accent pe mecanisme și analogii intuitive',
    exam_prep:  'PREGĂTIRE EXAMEN — accent pe termeni exacți, formule, greșeli frecvente',
    apply:      'APLICARE PRACTICĂ — accent pe cazuri, exemple, protocoale',
  };

  const hints = [];
  if (heuristics.formulaDensity > 0.02) hints.push('documentul conține formule matematice — include secțiuni cantitative');
  if (heuristics.hasCode) hints.push('documentul conține cod sau algoritmi — include secțiunea cod');
  if (heuristics.hasLegalContent) hints.push('documentul conține conținut normativ/juridic — include articol și conditii');
  if (heuristics.sourceQuality === 'poor') hints.push('documentul pare fragmentat — reconstruiește conceptual mai mult decât urmezi structura textului');
  if (heuristics.truncated) hints.push(`documentul original are ${heuristics.wordCount} cuvinte — am trimis un chunk reprezentativ`);

  return `Materie: ${subjectName}
Intent student: ${intentMap[intent] || intentMap.understand}
${hints.length ? 'Hints din analiză locală:\n' + hints.map(h => '- ' + h).join('\n') : ''}

DOCUMENT:
${heuristics.chunk}

Generează scaffold-ul cognitiv conform instrucțiunilor. EXCLUSIV JSON valid.`;
}

// ─────────────────────────────────────────────────────────────────
// GENERATE — main entry point
// ─────────────────────────────────────────────────────────────────
async function generateSmartSummary({ text, subjectName, intent = 'understand', apiKey }) {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');

  const client = new Anthropic({ apiKey });
  const heuristics = preprocessDocument(text);
  const model = selectModel(heuristics);
  const userPrompt = buildUserPrompt(subjectName, intent, heuristics);

  const response = await client.messages.create({
    model,
    max_tokens: 4000,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' }, // prompt caching
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
  } catch {
    // Try extracting JSON object from response
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI nu a returnat JSON valid');
    parsed = JSON.parse(match[0]);
  }

  // Validate minimal structure
  if (!parsed.output || !parsed.output.title) {
    throw new Error('Structura JSON incompletă');
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
