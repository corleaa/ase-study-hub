#!/usr/bin/env node
// =============================================
// audit-global.js — Orchestrator audit vizual global
//
// Rulare:
//   node tests/visual-audit/audit-global.js
//   node tests/visual-audit/audit-global.js --pages=dashboard,quiz
//   node tests/visual-audit/audit-global.js --viewport=desktop
//   node tests/visual-audit/audit-global.js --previous=path/to/report.json
//
// Output:
//   test-results/visual-audit/global/current/
//     report.json          ← raport JSON complet
//     report.html          ← raport HTML vizual (deschide în browser)
//     repair-plan.json     ← plan de reparații prioritizat
//     screenshots/         ← capturi ecran per pagină/viewport
// =============================================

'use strict';

const fs   = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const { DOM_AUDIT_SCRIPT }       = require('./heuristics/dom-checks');
const { PERCEPTION_AUDIT_SCRIPT} = require('./heuristics/perception');
const { PAGES }                  = require('./pages/config');
const { generateHTML }           = require('./reporters/html-report');
const {
  ensureDir, issueId, parseJsonFile,
  summarizeIssues, compareAuditReports, writeJson
} = require('../review/helpers/visual-audit');

// ── Configurare ───────────────────────────────────────────────

const ROOT    = process.cwd();
const OUT_DIR = path.join(ROOT, 'test-results', 'visual-audit', 'global');
const CUR_DIR = path.join(OUT_DIR, 'current');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'mobile',  width: 390,  height: 844  }
];

// Parse CLI args
const args = process.argv.slice(2);
const pageFilter = (args.find(a => a.startsWith('--pages=')) || '').replace('--pages=', '').split(',').filter(Boolean);
const vpFilter   = (args.find(a => a.startsWith('--viewport=')) || '').replace('--viewport=', '').split(',').filter(Boolean);
const prevArg    = args.find(a => a.startsWith('--previous='));
const quiet      = args.includes('--quiet');

const pagesRun    = pageFilter.length ? PAGES.filter(p => pageFilter.includes(p.id)) : PAGES;
const viewportsRun = vpFilter.length ? VIEWPORTS.filter(v => vpFilter.includes(v.name)) : VIEWPORTS;

function log(msg) { if (!quiet) console.log(msg); }

// ── Issue builders ─────────────────────────────────────────────

function makeIssue(partial) {
  return {
    id: partial.id || issueId([partial.type, partial.page, partial.selector]),
    title: partial.title || partial.type,
    type: partial.type || 'other',
    severity: partial.severity || 'medium',
    confidence: partial.confidence || 0.75,
    page_or_flow: partial.page || '',
    viewport: partial.viewport || '',
    selector_or_component: partial.selector || partial.component || '',
    human_perception_score: partial.human_perception_score || {},
    description: partial.description || '',
    why_it_matters: partial.why_it_matters || '',
    evidence: {
      layout_issue: partial.layout_issue || '',
      screenshot_path: partial.screenshot_path || '',
      dom_reference: partial.dom_reference || ''
    },
    probable_cause: partial.probable_cause || '',
    recommended_fix: partial.recommended_fix || '',
    repair_scope: partial.repair_scope || 'minimal',
    canonical_file: partial.canonical_file || ''
  };
}

// ── DOM check → issues ─────────────────────────────────────────

function domResultToIssues(domResult, pageConfig, viewport, screenshotPath) {
  const issues = [];
  const page = pageConfig.name;
  const vp = viewport.name;
  const canon = pageConfig.canonicalFiles || {};

  // Overflow
  for (const o of (domResult.overflow || [])) {
    issues.push(makeIssue({
      id: issueId(['overflow', page, vp]),
      title: `Overflow orizontal detectat pe ${page}`,
      type: 'overflow',
      severity: vp === 'mobile' ? 'critical' : 'high',
      confidence: 0.97,
      page, viewport: vp,
      selector: o.selector,
      description: `Pagina ${page} are overflow orizontal de ${o.amount}px la viewport ${vp}.`,
      why_it_matters: 'Utilizatorul vede un scroll bar orizontal neașteptat sau conținut tăiat. Experiența este ruptă.',
      layout_issue: `scrollWidth ${o.amount}px > innerWidth la viewport ${vp}`,
      screenshot_path: screenshotPath,
      probable_cause: 'Un container sau element depășește lățimea viewportului. Cauze frecvente: min-width fix, white-space:nowrap, grid columns prea late.',
      recommended_fix: `Verifică în ${canon.css || 'css/app.css'} elementele cu min-width sau width fix. Adaugă overflow-x:hidden sau corectează layout-ul pentru ${vp}.`,
      repair_scope: 'minimal',
      canonical_file: canon.css
    }));
  }

  // Clipping
  const clippingGroups = new Map();
  for (const c of (domResult.clipping || [])) {
    const key = c.selector.replace(/:\w+\(\d+\)/g, '');
    if (!clippingGroups.has(key)) clippingGroups.set(key, []);
    clippingGroups.get(key).push(c);
  }
  for (const [key, items] of clippingGroups) {
    const first = items[0];
    issues.push(makeIssue({
      id: issueId(['clipping', page, vp, key]),
      title: `Text tăiat în ${page} — ${key}`,
      type: 'clipping',
      severity: 'high',
      confidence: 0.88,
      page, viewport: vp,
      selector: key,
      description: `${items.length} element(e) cu text tăiat (${first.axis} overflow, overflow:hidden activ). Text: "${first.text}"`,
      why_it_matters: 'Informație invizibilă. Utilizatorul nu poate citi textul tăiat, ceea ce poate duce la decizii greșite sau confuzie.',
      layout_issue: `scrollSize ${first.scrollSize}px vs clientSize ${first.clientSize}px`,
      screenshot_path: screenshotPath,
      probable_cause: 'Containerul este prea mic pentru conținut sau font-size prea mare față de spațiul alocat.',
      recommended_fix: `Mărește containerul, reduce font-size, sau elimină overflow:hidden din ${key} în ${canon.css || 'css/app.css'}.`,
      repair_scope: 'minimal',
      canonical_file: canon.css
    }));
  }

  // Offscreen
  for (const o of (domResult.offscreen || []).slice(0, 5)) {
    issues.push(makeIssue({
      id: issueId(['offscreen', page, vp, o.selector]),
      title: `Element iesit din viewport pe ${vp}`,
      type: 'responsive',
      severity: 'high',
      confidence: 0.9,
      page, viewport: vp,
      selector: o.selector,
      description: `"${o.selector}" iese ${o.amount}px din viewport pe ${o.overflow}.`,
      why_it_matters: 'Utilizatorul nu poate accesa sau vedea elementul. Funcționalitate pierdută complet.',
      layout_issue: `rect: left=${Math.round(o.rect.left)}, right=${Math.round(o.rect.right)}, vw=${viewport.width}`,
      screenshot_path: screenshotPath,
      probable_cause: 'Width fix sau positioning absolut care nu se adaptează la viewport mai mic.',
      recommended_fix: `Înlocuiește dimensiunile fixe cu relative (%, vw) sau adaugă @media query pentru ${vp} în ${canon.css || 'css/app.css'}.`,
      repair_scope: 'minimal',
      canonical_file: canon.css
    }));
  }

  // Overlaps
  for (const o of (domResult.overlaps || []).slice(0, 4)) {
    issues.push(makeIssue({
      id: issueId(['overlap', page, vp, o.a, o.b]),
      title: `Suprapunere elemente în ${page}`,
      type: 'overlap',
      severity: 'critical',
      confidence: 0.92,
      page, viewport: vp,
      selector: `${o.a} ↔ ${o.b}`,
      description: `"${o.a}" și "${o.b}" se suprapun cu ${o.overlapArea}px² (${(o.overlapRatio*100).toFixed(0)}% din elementul mai mic).`,
      why_it_matters: 'Conținut ilegibil sau controale inaccesibile. Impact critic asupra utilizabilității.',
      layout_issue: `overlap area: ${o.overlapArea}px², ratio: ${o.overlapRatio}`,
      screenshot_path: screenshotPath,
      probable_cause: 'z-index incorrect, position:absolute fără constrângeri, sau calcul de grid greșit.',
      recommended_fix: 'Verifică z-index și positioning. Adaugă constrângeri de spacing explicit.',
      repair_scope: 'moderate',
      canonical_file: canon.css
    }));
  }

  // Contrast
  const contrastGroups = new Map();
  for (const c of (domResult.contrast || [])) {
    const key = c.selector.replace(/:\w+\(\d+\)/g, '');
    if (!contrastGroups.has(key)) contrastGroups.set(key, []);
    contrastGroups.get(key).push(c);
  }
  for (const [key, items] of contrastGroups) {
    const minRatio = Math.min(...items.map(i => i.ratio));
    issues.push(makeIssue({
      id: issueId(['contrast', page, vp, key]),
      title: `Contrast scăzut (${minRatio.toFixed(1)}:1) în ${page}`,
      type: 'contrast',
      severity: minRatio < 3 ? 'high' : 'medium',
      confidence: 0.85,
      page, viewport: vp,
      selector: key,
      description: `Ratio contrast: ${minRatio.toFixed(2)}:1 (minim requit: ${items[0].required}:1). Text: "${items[0].text}"`,
      why_it_matters: 'Text greu de citit, mai ales în condiții de lumină puternică sau oboseală vizuală. Afectează accesibilitatea.',
      layout_issue: `contrast ratio: ${minRatio.toFixed(2)}, required: ${items[0].required}, fontSize: ${items[0].fontSize}px`,
      screenshot_path: screenshotPath,
      probable_cause: 'Culoarea textului este prea apropiată de fundal. Frecvent în componentele cu temă dark sau elemente secundare.',
      recommended_fix: `Întărește culoarea textului în ${key} din ${canon.css || 'css/app.css'}. Alternativ, mărește fundalul.`,
      repair_scope: 'minimal',
      canonical_file: canon.css
    }));
  }

  // Touch targets
  const ttGroups = new Map();
  for (const t of (domResult.touchTargets || [])) {
    const key = t.selector;
    if (!ttGroups.has(key)) ttGroups.set(key, []);
    ttGroups.get(key).push(t);
  }
  for (const [key, items] of Array.from(ttGroups.entries()).slice(0, 4)) {
    const t = items[0];
    if (vp === 'mobile' || vp === 'tablet') {
      issues.push(makeIssue({
        id: issueId(['touch-target', page, vp, key]),
        title: `Target touch prea mic pe ${vp}: ${t.width}x${t.height}px`,
        type: 'component_sizing',
        severity: vp === 'mobile' ? 'high' : 'medium',
        confidence: 0.82,
        page, viewport: vp,
        selector: key,
        description: `Element interactiv "${t.text || key}" are dimensiunea ${t.width}x${t.height}px. Minimul recomandat este 44x44px.`,
        why_it_matters: 'Butonul sau link-ul este greu de apăsat pe touchscreen. Frecvent duce la tap-uri accidentale.',
        screenshot_path: screenshotPath,
        probable_cause: 'Padding insuficient sau element prea mic stilizat pentru desktop fără adaptare mobile.',
        recommended_fix: `Adaugă padding sau min-height/min-width pentru ${key} în media query mobile din ${canon.css || 'css/app.css'}.`,
        repair_scope: 'minimal',
        canonical_file: canon.css
      }));
    }
  }

  // Alignment
  for (const a of (domResult.alignment || []).slice(0, 3)) {
    issues.push(makeIssue({
      id: issueId(['alignment', page, vp, a.selector]),
      title: `Aliniere inconsistentă în grid (${a.selector})`,
      type: 'alignment',
      severity: 'medium',
      confidence: 0.75,
      page, viewport: vp,
      selector: a.selector,
      description: `${a.childCount} elemente cu spread vertical de ${a.topSpread}px. Pare asimetric.`,
      why_it_matters: 'Interfața pare instabilă și neglijentă. Afectează percepția de calitate a platformei.',
      layout_issue: `topSpread: ${a.topSpread}px, heightSpread: ${a.heightSpread}px`,
      screenshot_path: screenshotPath,
      probable_cause: 'Conținut de dimensiuni variabile fără align-items sau min-height pe containerul grid/flex.',
      recommended_fix: `Adaugă align-items:start sau min-height pe elementele din ${a.selector} în ${canon.css || 'css/app.css'}.`,
      repair_scope: 'minimal',
      canonical_file: canon.css
    }));
  }

  return issues;
}

// ── Perception check → issues ──────────────────────────────────

function perceptionToIssues(percResult, pageConfig, viewport, screenshotPath) {
  const issues = [];
  const page = pageConfig.name;
  const vp = viewport.name;
  const canon = pageConfig.canonicalFiles || {};

  function mapPerc(rawIssues, categoryLabel, defaultHpScores) {
    for (const pi of (rawIssues || [])) {
      if (!pi.human_note) continue; // skip entries without human note
      issues.push(makeIssue({
        id: issueId([pi.type, page, vp, pi.selector || '']),
        title: pi.human_note.slice(0, 90) + (pi.human_note.length > 90 ? '...' : ''),
        type: pi.type,
        severity: pi.severity || 'medium',
        confidence: pi.confidence || 0.7,
        page, viewport: vp,
        selector: pi.selector || '',
        description: pi.human_note,
        why_it_matters: categoryLabel,
        layout_issue: pi.value != null ? `Valoare măsurată: ${pi.value}` + (pi.threshold ? ` (threshold: ${pi.threshold})` : '') + (pi.proportion_analysis ? ` — ${JSON.stringify(pi.proportion_analysis)}` : '') : '',
        screenshot_path: screenshotPath,
        probable_cause: pi.text_preview ? `Text afectat: "${pi.text_preview}"` : '',
        recommended_fix: pi.recommended_fix || `Revizuiește ${pi.selector || 'elementul'} în ${canon.css || 'css/app.css'} sau ${canon.js || 'codul JS relevant'}.`,
        human_perception_score: defaultHpScores || {},
        repair_scope: pi.severity === 'critical' || pi.severity === 'high' ? 'minimal' : 'moderate',
        canonical_file: canon.css
      }));
    }
  }

  const hp = percResult.human_perception || {};

  mapPerc(percResult.typography?.issues, 'Tipografie — afectează lizibilitatea și confortul de citire.', { readability: hp.readability });
  mapPerc(percResult.proportion?.issues, 'Proporții — dezechilibru vizual perceput ca neglijent sau aglomerat.', { visual_balance: hp.visual_balance });
  mapPerc(percResult.density?.issues, 'Densitate vizuală — risc de oboseală cognitivă și supraîncărcare.', { density: hp.density, fatigue_risk: hp.fatigue_risk });
  mapPerc(percResult.hierarchy?.issues, 'Ierarhie vizuală — utilizatorul nu știe unde să se uite primul.', { hierarchy: hp.hierarchy });
  mapPerc(percResult.spacing?.issues, 'Spacing inconsistent — lipsă de ritm vizual, interfață percepută ca neglijentă.', {});
  mapPerc(percResult.balance?.issues, 'Echilibru compozițional — layout dezechilibrat sau monoton.', { visual_balance: hp.visual_balance });

  return issues;
}

// ── Screenshot ────────────────────────────────────────────────

async function takeScreenshot(page, pageId, viewportName, shotDir) {
  ensureDir(shotDir);
  const filePath = path.join(shotDir, `${pageId}-${viewportName}-full.png`);
  try {
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  } catch(e) {
    log(`  ⚠ Screenshot failed: ${e.message}`);
    return null;
  }
}

// ── Audit per pagina + viewport ───────────────────────────────

async function auditPage(browser, pageConfig, viewport, shotDir) {
  log(`  → ${pageConfig.name} @ ${viewport.name} (${viewport.width}x${viewport.height})`);

  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  const section = {
    pageId: pageConfig.id,
    pageName: pageConfig.name,
    viewport: viewport.name,
    issues: [],
    screenshots: {},
    perceptionScores: {}
  };

  try {
    await pageConfig.navigate(page);

    // Screenshot
    const screenshotPath = await takeScreenshot(page, pageConfig.id, viewport.name, shotDir);
    if (screenshotPath) {
      section.screenshots.full = screenshotPath;
    }

    // DOM objective checks
    let domResult = {};
    try {
      domResult = await page.evaluate(new Function(`return ${DOM_AUDIT_SCRIPT}`));
    } catch(e) {
      log(`    ⚠ DOM check error: ${e.message}`);
    }

    // Perception heuristic checks
    let percResult = {};
    try {
      percResult = await page.evaluate(new Function(`return ${PERCEPTION_AUDIT_SCRIPT}`));
    } catch(e) {
      log(`    ⚠ Perception check error: ${e.message}`);
    }

    // Build issues
    section.issues.push(...domResultToIssues(domResult, pageConfig, viewport, screenshotPath));
    section.issues.push(...perceptionToIssues(percResult, pageConfig, viewport, screenshotPath));

    // Perception scores pentru raport
    const hp = percResult.human_perception || {};
    section.perceptionScores = {
      readability: hp.readability,
      visual_balance: hp.visual_balance,
      hierarchy: hp.hierarchy,
      density: hp.density,
      fatigue_risk: hp.fatigue_risk,
      typography: percResult.typography?.score,
      proportion: percResult.proportion?.score,
      spacing: percResult.spacing?.score
    };

    log(`    ✓ ${section.issues.length} issues (dom: ${domResult.overflow?.length||0} overflows, ${domResult.clipping?.length||0} clips, ${domResult.contrast?.length||0} contrast)`);

  } catch(e) {
    log(`    ✗ Error auditing ${pageConfig.name}@${viewport.name}: ${e.message}`);
    section.issues.push(makeIssue({
      id: issueId(['audit-error', pageConfig.id, viewport.name]),
      title: `Eroare audit: ${pageConfig.name} @ ${viewport.name}`,
      type: 'other',
      severity: 'medium',
      confidence: 1.0,
      page: pageConfig.name,
      viewport: viewport.name,
      description: `Audit-ul a eșuat cu eroarea: ${e.message}`,
      probable_cause: 'Pagina nu s-a încărcat corect sau navigarea a eșuat.',
      recommended_fix: 'Verifică că serverul rulează la BASE_URL și pagina se încarcă manual.',
      repair_scope: 'manual_review'
    }));
  } finally {
    await page.close();
  }

  return section;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  ensureDir(CUR_DIR);
  const shotDir = path.join(CUR_DIR, 'screenshots');
  ensureDir(shotDir);

  const previousReport = parseJsonFile(prevArg ? prevArg.replace('--previous=', '') : '');

  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  log(`Study Hub — Visual Audit Global`);
  log(`Pagini: ${pagesRun.map(p=>p.name).join(', ')}`);
  log(`Viewporturi: ${viewportsRun.map(v=>v.name).join(', ')}`);
  log(`Output: ${CUR_DIR}`);
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const browser = await chromium.launch({ headless: true });
  const allSections = [];
  const allIssues = [];

  for (const pageConfig of pagesRun) {
    log(`\n[ ${pageConfig.name} ]`);
    for (const viewport of viewportsRun) {
      const section = await auditPage(browser, pageConfig, viewport, shotDir);
      allSections.push(section);
      allIssues.push(...section.issues);
    }
  }

  await browser.close();

  // Dedup & sort
  const deduped = Array.from(
    new Map(allIssues.map(i => [i.id, i])).values()
  ).sort((a, b) => {
    const w = { critical:4, high:3, medium:2, low:1 };
    const sd = (w[b.severity]||0) - (w[a.severity]||0);
    return sd !== 0 ? sd : (b.confidence||0) - (a.confidence||0);
  });

  // Filtrare false positives: elimină issues cu confidence < 0.5
  const filtered = deduped.filter(i => (i.confidence || 0) >= 0.5);

  const summary = {
    critical_count: filtered.filter(i=>i.severity==='critical').length,
    high_count:     filtered.filter(i=>i.severity==='high').length,
    medium_count:   filtered.filter(i=>i.severity==='medium').length,
    low_count:      filtered.filter(i=>i.severity==='low').length,
    top_visual_issues: filtered.slice(0, 5).map(i => ({
      id: i.id, title: i.title, severity: i.severity,
      page_or_flow: i.page_or_flow, viewport: i.viewport
    }))
  };

  const report = {
    metadata: {
      generated_at: new Date().toISOString(),
      duration_seconds: ((Date.now() - startTime) / 1000).toFixed(1),
      pages_audited: pagesRun.length,
      viewport_count: viewportsRun.length,
      base_url: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001'
    },
    summary,
    issues: filtered,
    sections: allSections.map(sec => ({
      ...sec,
      issues: sec.issues.filter(i => (i.confidence||0) >= 0.5)
    }))
  };

  // Verificare față de run anterior
  if (previousReport) {
    report.verification = compareAuditReports(previousReport, report);
    const fixed   = report.verification.filter(v=>v.status==='fixed').length;
    const regressed = report.verification.filter(v=>v.status==='caused_regression').length;
    log(`\nVerificare: ${fixed} fixed, ${regressed} regresii noi`);
  }

  // Repair plan — top 15 acțiuni prioritizate
  const repairPlan = {
    generated_at: report.metadata.generated_at,
    summary,
    actions: filtered
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .slice(0, 15)
      .map((i, idx) => ({
        priority: idx + 1,
        issue_id: i.id,
        title: i.title,
        severity: i.severity,
        page: i.page_or_flow,
        viewport: i.viewport,
        type: i.type,
        canonical_file: i.canonical_file || '',
        selector: i.selector_or_component,
        probable_cause: i.probable_cause,
        recommended_fix: i.recommended_fix,
        repair_scope: i.repair_scope,
        patch_status: 'not_fixed'
      }))
  };

  // Write outputs
  writeJson(path.join(CUR_DIR, 'report.json'), report);
  writeJson(path.join(CUR_DIR, 'repair-plan.json'), repairPlan);

  // HTML report
  const htmlContent = generateHTML(report, CUR_DIR);
  fs.writeFileSync(path.join(CUR_DIR, 'report.html'), htmlContent, 'utf8');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  log(`DONE în ${elapsed}s`);
  log(`Critical: ${summary.critical_count} | High: ${summary.high_count} | Medium: ${summary.medium_count} | Low: ${summary.low_count}`);
  log(`\nRapoarte:`);
  log(`  JSON:   ${path.join(CUR_DIR, 'report.json')}`);
  log(`  HTML:   ${path.join(CUR_DIR, 'report.html')}`);
  log(`  Repair: ${path.join(CUR_DIR, 'repair-plan.json')}`);
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
