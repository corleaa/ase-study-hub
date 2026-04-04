const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const {
  ensureDir,
  issueId,
  parseJsonFile,
  summarizeIssues,
  compareAuditReports,
  writeJson
} = require('./helpers/visual-audit');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'test-results', 'visual-audit', 'finance-lab-stability');
const CURRENT_RUN_DIR = path.join(OUT_DIR, 'current');
const BASELINE_DIR = path.join(ROOT, 'tests', 'baselines', 'finance-lab-stability');
const DEFAULT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 2200 },
  { name: 'tablet', width: 1024, height: 1900 },
  { name: 'mobile', width: 390, height: 2200 }
];

const SECTION_KEYS = [
  { key: 'hero', selector: '.finance-sim-hero', index: null },
  { key: 'section-1', selector: '.finance-zone', index: 0 },
  { key: 'section-2', selector: '.finance-zone', index: 1 },
  { key: 'section-3', selector: '.finance-zone', index: 2 },
  { key: 'section-4', selector: '.finance-zone', index: 3 }
];

async function bootStability(page, baseURL) {
  await page.addInitScript(() => {
    window.localStorage.setItem('ash_onboarding_done', '1');
  });
  await page.goto(baseURL);
  await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('[data-nav-tab="finance"], [data-tab="finance"]'));
    const target = candidates.find((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
    }) || candidates[0];
    if (target) target.click();
  });
  await page.locator('[data-finance-mode="stability"]').first().click();
  await page.waitForTimeout(300);
}

async function captureScreens(page, viewportName, scenario) {
  const shots = {};
  for (const section of SECTION_KEYS) {
    const filePath = path.join(CURRENT_RUN_DIR, viewportName, `${scenario}-${section.key}.png`);
    ensureDir(path.dirname(filePath));
    const locator = section.index == null
      ? page.locator(section.selector).first()
      : page.locator(section.selector).nth(section.index);
    await locator.screenshot({ path: filePath });
    shots[section.key] = filePath;
  }
  return shots;
}

async function collectDomDiagnostics(page, viewportName, scenario) {
  return page.evaluate(({ viewportName, scenario }) => {
    function rectOf(el) {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    }

    function normalizeSelector(el) {
      if (el.id) return `#${el.id}`;
      const cls = Array.from(el.classList || []).slice(0, 3).join('.');
      return cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase();
    }

    function isVisible(el) {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    }

    function rgbParts(color) {
      const match = color && color.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(',').map((part) => Number(part.trim()));
      return {
        r: parts[0] || 0,
        g: parts[1] || 0,
        b: parts[2] || 0,
        a: parts[3] == null ? 1 : parts[3]
      };
    }

    function relativeLuminance(rgb) {
      function channel(value) {
        const s = value / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      }
      return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
    }

    function contrastRatio(fg, bg) {
      const l1 = relativeLuminance(fg);
      const l2 = relativeLuminance(bg);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    function findBackground(el) {
      let current = el;
      while (current) {
        const bg = rgbParts(window.getComputedStyle(current).backgroundColor);
        if (bg && bg.a > 0.92) return bg;
        current = current.parentElement;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    }

    const diagnostics = {
      viewport: viewportName,
      scenario,
      pageOverflow: [],
      clipping: [],
      offscreen: [],
      overlaps: [],
      occlusion: [],
      alignment: [],
      contrast: [],
      layoutShiftCandidates: []
    };

    if (document.documentElement.scrollWidth > window.innerWidth + 2) {
      diagnostics.pageOverflow.push({
        selector: 'html',
        amount: document.documentElement.scrollWidth - window.innerWidth
      });
    }

    const clippingSelectors = [
      '.finance-control-number',
      '.finance-chart-caption',
      '.finance-panel-title',
      '.finance-gauge-mini-card strong',
      '.finance-gauge-mini-card span',
      '.finance-propagation-node strong',
      '.finance-propagation-node small',
      '.finance-stat-chip strong',
      '.finance-stat-chip span',
      '.finance-network-note',
      '.finance-scorecard-table td',
      '.finance-scorecard-table th'
    ];

    for (const selector of clippingSelectors) {
      document.querySelectorAll(selector).forEach((el, index) => {
        if (!isVisible(el)) return;
        const clippedX = el.scrollWidth > el.clientWidth + 1;
        const clippedY = el.scrollHeight > el.clientHeight + 1;
        if (clippedX || clippedY) {
          diagnostics.clipping.push({
            selector: `${selector}:nth-match(${index + 1})`,
            component: normalizeSelector(el),
            axis: clippedX ? 'horizontal' : 'vertical'
          });
        }
      });
    }

    document.querySelectorAll('.finance-control-number, .finance-stat-chip, .finance-report-card, .finance-propagation-node').forEach((el) => {
      if (!isVisible(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.left < -1 || rect.right > window.innerWidth + 1) {
        diagnostics.offscreen.push({
          selector: normalizeSelector(el),
          rect: rectOf(el)
        });
      }
    });

    const overlapGroups = ['.finance-propagation-node', '.finance-report-card', '.finance-stat-chip'];
    for (const group of overlapGroups) {
      const items = Array.from(document.querySelectorAll(group)).filter(isVisible);
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i].getBoundingClientRect();
          const b = items[j].getBoundingClientRect();
          const interWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const interHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          if (interWidth > 6 && interHeight > 6) {
            diagnostics.overlaps.push({
              a: normalizeSelector(items[i]),
              b: normalizeSelector(items[j]),
              overlapArea: interWidth * interHeight
            });
          }
        }
      }
    }

    const focusables = Array.from(document.querySelectorAll('button, a, input')).filter(isVisible);
    for (const el of focusables) {
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
      const topEl = document.elementFromPoint(x, y);
      if (topEl && !el.contains(topEl) && !topEl.contains(el)) {
        diagnostics.occlusion.push({
          selector: normalizeSelector(el),
          blockedBy: normalizeSelector(topEl)
        });
      }
    }

    const controlRows = Array.from(document.querySelectorAll('.finance-control-grid--4')).filter(isVisible);
    for (const row of controlRows) {
      const items = Array.from(row.children).filter(isVisible);
      if (items.length < 2) continue;
      const tops = items.map((el) => Math.round(el.getBoundingClientRect().top));
      const heights = items.map((el) => Math.round(el.getBoundingClientRect().height));
      const topSpread = Math.max(...tops) - Math.min(...tops);
      const heightSpread = Math.max(...heights) - Math.min(...heights);
      if (topSpread > 8 || heightSpread > 18) {
        diagnostics.alignment.push({
          selector: '.finance-control-grid--4',
          topSpread,
          heightSpread
        });
      }
    }

    const contrastSelectors = [
      '.finance-chart-caption',
      '.finance-scorecard-band',
      '.finance-scorecard-benchmark',
      '.finance-network-note',
      '.finance-propagation-node small'
    ];
    for (const selector of contrastSelectors) {
      document.querySelectorAll(selector).forEach((el, index) => {
        if (!isVisible(el)) return;
        const fg = rgbParts(window.getComputedStyle(el).color);
        const bg = findBackground(el);
        if (!fg || !bg) return;
        const ratio = contrastRatio(fg, bg);
        if (ratio < 4.0) {
          diagnostics.contrast.push({
            selector: `${selector}:nth-match(${index + 1})`,
            ratio: Number(ratio.toFixed(2))
          });
        }
      });
    }

    const sectionRects = Array.from(document.querySelectorAll('.finance-zone')).filter(isVisible).map((el, index) => ({
      selector: `.finance-zone:nth-of-type(${index + 1})`,
      height: Math.round(el.getBoundingClientRect().height),
      width: Math.round(el.getBoundingClientRect().width)
    }));
    diagnostics.layoutShiftCandidates = sectionRects;

    return diagnostics;
  }, { viewportName, scenario });
}

function buildIssue(partial) {
  return {
    id: partial.id,
    title: partial.title,
    category: 'visual',
    type: partial.type,
    severity: partial.severity,
    confidence: partial.confidence,
    viewport: partial.viewport,
    page_or_flow: 'Finance Lab > Stabilitate',
    location: {
      file: partial.file || '/Users/corleaa/Desktop/study-hub-final/frontend/js/finance-lab.js',
      selector: partial.selector || '',
      component: partial.component || ''
    },
    evidence: {
      baseline_screenshot: partial.baseline_screenshot || '',
      current_screenshot: partial.current_screenshot || '',
      diff_screenshot: partial.diff_screenshot || ''
    },
    impact: partial.impact,
    probable_cause: partial.probable_cause,
    recommended_fix: partial.recommended_fix,
    repair_scope: 'minimal'
  };
}

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const arr = groups.get(key) || [];
    arr.push(item);
    groups.set(key, arr);
  }
  return groups;
}

function evaluateViewportIssues(diagnostics, screenshots) {
  const issues = [];
  const viewport = diagnostics.viewport;

  for (const item of diagnostics.pageOverflow) {
    issues.push(buildIssue({
      id: issueId(['page-overflow', viewport]),
      title: 'Pagina are overflow orizontal în viewportul curent',
      type: 'overflow',
      severity: viewport === 'mobile' ? 'critical' : 'high',
      confidence: 0.97,
      viewport,
      selector: item.selector,
      component: 'page shell',
      current_screenshot: screenshots['section-4'] || screenshots.hero,
      impact: 'Utilizatorul poate pierde conținut lateral sau poate vedea layout rupt pe ecrane mai mici.',
      probable_cause: 'Un container din Finance Lab depășește lățimea viewportului sau nu permite wrapping adecvat.',
      recommended_fix: 'Verifică containerele late și grilele din Finance Lab; adaugă constrângeri locale de lățime și wrapping doar pe selectorul problematic.',
      file: '/Users/corleaa/Desktop/study-hub-final/frontend/css/finance-lab.css'
    }));
  }

  const clippingGroups = groupBy(diagnostics.clipping, (item) => item.selector.replace(/:nth-match\(\d+\)/, ''));
  for (const [selectorKey, items] of Array.from(clippingGroups.entries()).slice(0, 8)) {
    const item = items[0];
    issues.push(buildIssue({
      id: issueId(['text-clipping', viewport, selectorKey]),
      title: 'Text tăiat sau comprimat în Stability',
      type: 'clipping',
      severity: selectorKey.includes('.finance-control-number') ? 'medium' : 'high',
      confidence: 0.9,
      viewport,
      selector: selectorKey,
      component: items.length > 1 ? `${item.component} (${items.length} instanțe)` : item.component,
      current_screenshot: screenshots['section-3'] || screenshots['section-4'],
      impact: 'Etichetele sau valorile pot deveni greu de citit și duc la interpretare greșită a graficelor.',
      probable_cause: 'Înălțimea, lățimea sau line-height-ul elementului nu sunt suficient calibrate pentru conținutul curent.',
      recommended_fix: 'Ajustează local dimensiunea sau spațiul intern al selectorului raportat; evită schimbări globale.',
      file: '/Users/corleaa/Desktop/study-hub-final/frontend/css/finance-lab.css'
    }));
  }

  const offscreenFiltered = diagnostics.offscreen.filter((item) => !/toast-close|bn-item/.test(item.selector));
  for (const item of offscreenFiltered.slice(0, 6)) {
    issues.push(buildIssue({
      id: issueId(['offscreen', viewport, item.selector]),
      title: 'Element iese din viewport sau din containerul vizibil',
      type: 'responsive',
      severity: 'high',
      confidence: 0.88,
      viewport,
      selector: item.selector,
      component: 'layout block',
      current_screenshot: screenshots['section-3'] || screenshots['section-4'],
      impact: 'Utilizatorul nu vede integral informația sau controlul respectiv.',
      probable_cause: 'Lățimea minimă, gap-ul sau grid-ul curent nu se adaptează corect la viewport.',
      recommended_fix: 'Corectează doar selectorul raportat prin lățimi minime mai mici, wrapping sau grid responsive local.',
      file: '/Users/corleaa/Desktop/study-hub-final/frontend/css/finance-lab.css'
    }));
  }

  for (const item of diagnostics.overlaps.slice(0, 8)) {
    issues.push(buildIssue({
      id: issueId(['overlap', viewport, item.a, item.b]),
      title: 'Două elemente vizuale se suprapun',
      type: 'overlap',
      severity: 'critical',
      confidence: 0.95,
      viewport,
      selector: `${item.a} <> ${item.b}`,
      component: 'Finance Lab Stability',
      current_screenshot: screenshots['section-4'] || screenshots['section-3'],
      impact: 'Suprapunerile fac informația ilizibilă și pot ascunde controale sau date.',
      probable_cause: 'Spațierea sau calculele de poziționare sunt prea strânse pentru starea și viewportul actual.',
      recommended_fix: 'Ajustează local spacing-ul sau poziționarea componentelor implicate; nu rearanja întreaga secțiune.',
      file: '/Users/corleaa/Desktop/study-hub-final/frontend/css/finance-lab.css'
    }));
  }

  const occlusionFiltered = diagnostics.occlusion.filter((item) => !/toast-close|bn-item/.test(item.selector));
  for (const item of occlusionFiltered.slice(0, 6)) {
    issues.push(buildIssue({
      id: issueId(['occlusion', viewport, item.selector]),
      title: 'Control vizual parțial ascuns sau inaccesibil',
      type: 'other',
      severity: 'high',
      confidence: 0.84,
      viewport,
      selector: item.selector,
      component: 'interactive control',
      current_screenshot: screenshots.hero,
      impact: 'Butonul sau inputul pare prezent, dar experiența reală de click poate fi blocată.',
      probable_cause: 'Un overlay sau un strat vecin interceptează pointer events.',
      recommended_fix: 'Verifică stacking, pointer-events și ordinea vizuală doar pentru elementele implicate.',
      file: '/Users/corleaa/Desktop/study-hub-final/frontend/index.html'
    }));
  }

  for (const item of diagnostics.alignment.slice(0, 4)) {
    issues.push(buildIssue({
      id: issueId(['alignment', viewport, item.selector]),
      title: 'Aliniere inconsistentă în grila de controale',
      type: 'alignment',
      severity: 'medium',
      confidence: 0.8,
      viewport,
      selector: item.selector,
      component: 'control grid',
      current_screenshot: screenshots['section-3'] || screenshots['section-4'],
      impact: 'Interfața pare instabilă și reduce încrederea în seriozitatea simulatorului.',
      probable_cause: 'Diferențele dintre înălțimile cardurilor și poziționarea verticală a controalelor nu sunt constrânse suficient.',
      recommended_fix: 'Uniformizează doar cardurile din grila raportată prin min-height, alignment și gap local.',
      file: '/Users/corleaa/Desktop/study-hub-final/frontend/css/finance-lab.css'
    }));
  }

  const contrastGroups = groupBy(diagnostics.contrast, (item) => item.selector.replace(/:nth-match\(\d+\)/, ''));
  for (const [selectorKey, items] of Array.from(contrastGroups.entries()).slice(0, 5)) {
    const item = items[0];
    const lowestRatio = Math.min(...items.map((entry) => entry.ratio));
    issues.push(buildIssue({
      id: issueId(['contrast', viewport, selectorKey]),
      title: 'Contrast vizual problematic pe text informativ',
      type: 'contrast',
      severity: lowestRatio < 3 ? 'high' : 'medium',
      confidence: 0.82,
      viewport,
      selector: selectorKey,
      component: items.length > 1 ? `text layer (${items.length} instanțe)` : 'text layer',
      current_screenshot: screenshots['section-3'] || screenshots['section-4'],
      impact: 'Textul devine greu de citit, mai ales în cardurile deschise și pe viewporturi mici.',
      probable_cause: 'Raportul dintre culoarea textului și fundal este prea mic pentru conținut explicativ.',
      recommended_fix: 'Întărește local culoarea textului sau fundalul elementului raportat, fără a schimba întreaga temă.',
      file: '/Users/corleaa/Desktop/study-hub-final/frontend/css/finance-lab.css'
    }));
  }

  return issues;
}

function compareLayoutShifts(viewportName, baselineDiag, stressDiag, screenshots) {
  const issues = [];
  const baselineBySelector = new Map((baselineDiag.layoutShiftCandidates || []).map((item) => [item.selector, item]));
  for (const current of stressDiag.layoutShiftCandidates || []) {
    const previous = baselineBySelector.get(current.selector);
    if (!previous) continue;
    const heightDelta = Math.abs(current.height - previous.height);
    if (heightDelta > 32) {
      issues.push(buildIssue({
        id: issueId(['layout-shift', viewportName, current.selector]),
        title: 'Layout shift vizibil între scenarii similare',
        type: 'hierarchy',
        severity: viewportName === 'mobile' ? 'high' : 'medium',
        confidence: 0.77,
        viewport: viewportName,
        selector: current.selector,
        component: 'section container',
        current_screenshot: screenshots['section-4'],
        impact: 'Componentele își schimbă disproporționat înălțimea între stări și creează senzație de UI instabil.',
        probable_cause: 'Conținutul sau grila nu au constrângeri consistente între scenarii.',
        recommended_fix: 'Stabilizează local înălțimea minimă sau wrapping-ul pentru secțiunea raportată.',
        file: '/Users/corleaa/Desktop/study-hub-final/frontend/css/finance-lab.css'
      }));
    }
  }
  return issues;
}

function attachBaselineEvidence(issue) {
  if (!issue.evidence.current_screenshot) return issue;
  const currentPath = issue.evidence.current_screenshot;
  const relative = path.relative(CURRENT_RUN_DIR, currentPath);
  const baselinePath = path.join(BASELINE_DIR, relative);
  if (fs.existsSync(baselinePath)) {
    issue.evidence.baseline_screenshot = baselinePath;
    if (fs.readFileSync(baselinePath).equals(fs.readFileSync(currentPath)) === false) {
      issue.evidence.diff_screenshot = 'playwright_visual_diff_not_generated';
      if (issue.type === 'hierarchy') issue.severity = issue.severity === 'medium' ? 'high' : issue.severity;
    }
  }
  return issue;
}

async function main() {
  ensureDir(CURRENT_RUN_DIR);

  const previousReportArg = process.argv.find((arg) => arg.startsWith('--previous='));
  const previousReport = parseJsonFile(previousReportArg ? previousReportArg.split('=')[1] : '');

  const browser = await chromium.launch();
  const issues = [];

  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await bootStability(page, DEFAULT_BASE_URL);

    const baselineShots = await captureScreens(page, viewport.name, 'baseline');
    const baselineDiag = await collectDomDiagnostics(page, viewport.name, 'baseline');
    issues.push(...evaluateViewportIssues(baselineDiag, baselineShots));

    await page.locator('[data-fin-scenario-card="external_shock"]').first().click();
    await page.waitForTimeout(350);
    const stressShots = await captureScreens(page, viewport.name, 'external_shock');
    const stressDiag = await collectDomDiagnostics(page, viewport.name, 'external_shock');
    issues.push(...evaluateViewportIssues(stressDiag, stressShots));
    issues.push(...compareLayoutShifts(viewport.name, baselineDiag, stressDiag, stressShots));

    await page.close();
  }

  const deduped = Array.from(new Map(issues.map((issue) => [issue.id, attachBaselineEvidence(issue)])).values())
    .sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const sev = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      if (sev) return sev;
      return (b.confidence || 0) - (a.confidence || 0);
    });
  const report = {
    summary: summarizeIssues(deduped),
    issues: deduped
  };

  if (previousReport) {
    report.verification = compareAuditReports(previousReport, report);
  }

  writeJson(path.join(CURRENT_RUN_DIR, 'report.json'), report);
  writeJson(path.join(CURRENT_RUN_DIR, 'repair-plan.json'), {
    summary: report.summary,
    actions: deduped.slice(0, 10).map((issue) => ({
      issue_id: issue.id,
      title: issue.title,
      severity: issue.severity,
      file: issue.location.file,
      selector: issue.location.selector,
      component: issue.location.component,
      recommended_fix: issue.recommended_fix,
      probable_cause: issue.probable_cause,
      repair_scope: issue.repair_scope,
      patch_status: 'not_fixed'
    }))
  });
  await browser.close();
  console.log(`Visual audit written to ${path.join(CURRENT_RUN_DIR, 'report.json')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
