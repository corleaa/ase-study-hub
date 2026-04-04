// =============================================
// perception.js — Euristici de percepție umană
//
// Simulează modul în care un om atent și exigent
// observă interfața. Detectează:
//   - probleme de tipografie și lizibilitate
//   - disproporții (inspirate din golden ratio)
//   - densitate vizuală și oboseală cognitivă
//   - ierarhie vizuală slabă / CTA ascuns
//   - spacing inconsistent
//   - echilibru compozițional
//
// Fiecare euristică returnează:
//   { issues[], scores{} }
// Scorurile sunt 0-10 (10 = perfect)
// =============================================

'use strict';

const PERCEPTION_AUDIT_SCRIPT = /* js */ `(function() {
  'use strict';

  // ── Utilități ─────────────────────────────────────────────────

  function isVisible(el) {
    if (!el) return false;
    const s = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' &&
           Number(s.opacity) > 0 && r.width > 0 && r.height > 0;
  }

  function inViewport(el) {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0 &&
           r.left < window.innerWidth && r.right > 0;
  }

  function normalizeSelector(el) {
    if (el.id) return '#' + el.id;
    const cls = Array.from(el.classList || []).slice(0, 3).join('.');
    return cls ? el.tagName.toLowerCase() + '.' + cls : el.tagName.toLowerCase();
  }

  function rgbParts(color) {
    const m = color && color.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map(x => Number(x.trim()));
    return { r: p[0]||0, g: p[1]||0, b: p[2]||0, a: p[3]==null?1:p[3] };
  }

  function luminance(rgb) {
    function ch(v) {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055)/1.055, 2.4);
    }
    return 0.2126*ch(rgb.r) + 0.7152*ch(rgb.g) + 0.0722*ch(rgb.b);
  }

  function contrastRatio(fg, bg) {
    const l1 = luminance(fg), l2 = luminance(bg);
    return (Math.max(l1,l2)+0.05) / (Math.min(l1,l2)+0.05);
  }

  function findBackground(el) {
    let cur = el;
    while (cur && cur !== document.body) {
      const bg = rgbParts(window.getComputedStyle(cur).backgroundColor);
      if (bg && bg.a > 0.85) return bg;
      cur = cur.parentElement;
    }
    return { r: 22, g: 19, b: 22, a: 1 };
  }

  function pxToNum(val) { return parseFloat(val) || 0; }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const result = {
    typography: { issues: [], score: 10 },
    proportion: { issues: [], score: 10 },
    density: { issues: [], score: 10 },
    hierarchy: { issues: [], score: 10 },
    spacing: { issues: [], score: 10 },
    balance: { issues: [], score: 10 },
    human_perception: {
      readability: 10,
      visual_balance: 10,
      hierarchy: 10,
      density: 10,
      fatigue_risk: 0
    }
  };

  // ═══════════════════════════════════════════════════
  // 1. TIPOGRAFIE — lizibilitate, mărimi, line-height
  // ═══════════════════════════════════════════════════

  const bodyFontSizes = [];
  const headingFontSizes = [];
  let tinyTextCount = 0;
  let tightLineHeightCount = 0;
  let totalTextEls = 0;

  // Colectează elemente text semnificative
  const textSelectors = 'p, li, td, th, .card-sub, .subtitle, .description, [class*="body"], [class*="text"]';
  const headingSelectors = 'h1, h2, h3, h4, h5, [class*="title"], [class*="heading"], [class*="kpi-"]';

  document.querySelectorAll(textSelectors).forEach(el => {
    if (!isVisible(el) || !inViewport(el)) return;
    const text = (el.innerText || '').trim();
    if (text.length < 5) return;
    const s = window.getComputedStyle(el);
    const fs = pxToNum(s.fontSize);
    const lh = pxToNum(s.lineHeight);
    if (fs > 0) bodyFontSizes.push(fs);
    totalTextEls++;

    // Font prea mic
    if (fs < 11 && fs > 0) {
      tinyTextCount++;
      result.typography.issues.push({
        type: 'font_too_small',
        severity: fs < 9 ? 'critical' : 'high',
        confidence: 0.92,
        selector: normalizeSelector(el),
        value: fs,
        threshold: 11,
        human_note: 'Text de ' + fs.toFixed(1) + 'px este greu de citit confortabil, mai ales în condiții de oboseală vizuală.',
        text_preview: text.slice(0, 50)
      });
    } else if (fs >= 11 && fs < 13) {
      result.typography.issues.push({
        type: 'font_borderline',
        severity: 'medium',
        confidence: 0.7,
        selector: normalizeSelector(el),
        value: fs,
        threshold: 13,
        human_note: text.length > 100
          ? 'Text lung de ' + fs.toFixed(1) + 'px. Poate obosi la citit extins.'
          : null,
        text_preview: text.slice(0, 50)
      });
    }

    // Line-height prea strâns
    const lhRatio = fs > 0 ? lh / fs : 0;
    if (lhRatio > 0 && lhRatio < 1.3 && text.length > 30) {
      tightLineHeightCount++;
      result.typography.issues.push({
        type: 'tight_line_height',
        severity: 'medium',
        confidence: 0.78,
        selector: normalizeSelector(el),
        value: Number(lhRatio.toFixed(2)),
        threshold: 1.3,
        human_note: 'Line-height ' + lhRatio.toFixed(2) + 'x creează densitate vizuală care obosește ochiul la citit extins.'
      });
    }
  });

  document.querySelectorAll(headingSelectors).forEach(el => {
    if (!isVisible(el) || !inViewport(el)) return;
    const s = window.getComputedStyle(el);
    const fs = pxToNum(s.fontSize);
    if (fs > 0) headingFontSizes.push(fs);
  });

  // Raport titlu/body — trebuie să fie 1.3–2.5x
  if (bodyFontSizes.length > 0 && headingFontSizes.length > 0) {
    const avgBody = bodyFontSizes.reduce((a,b)=>a+b,0) / bodyFontSizes.length;
    const maxHeading = Math.max(...headingFontSizes);
    const minHeading = Math.min(...headingFontSizes);
    const ratio = maxHeading / avgBody;

    if (ratio < 1.2) {
      result.typography.issues.push({
        type: 'weak_heading_hierarchy',
        severity: 'high',
        confidence: 0.85,
        selector: headingSelectors,
        value: Number(ratio.toFixed(2)),
        threshold_min: 1.3,
        threshold_max: 2.5,
        human_note: 'Titlul (' + maxHeading.toFixed(0) + 'px) este aproape la fel de mare ca body text (' + avgBody.toFixed(0) + 'px). Ierarhia vizuală nu se simte.',
        proportion_analysis: {
          heading_px: Math.round(maxHeading),
          body_px: Math.round(avgBody),
          ratio: Number(ratio.toFixed(2)),
          ideal_range: '1.3–2.5x',
          deviation: 'sub-minim'
        }
      });
    } else if (ratio > 3.5) {
      result.typography.issues.push({
        type: 'excessive_heading_contrast',
        severity: 'low',
        confidence: 0.6,
        selector: headingSelectors,
        value: Number(ratio.toFixed(2)),
        threshold_max: 3.0,
        human_note: 'Diferența mare (' + ratio.toFixed(1) + 'x) între titlu și body poate crea dezechilibru compozițional.',
        proportion_analysis: {
          heading_px: Math.round(maxHeading),
          body_px: Math.round(avgBody),
          ratio: Number(ratio.toFixed(2)),
          ideal_range: '1.3–2.5x',
          deviation: 'supra-maxim'
        }
      });
    }
  }

  // Score tipografie
  const typoDeductions = (tinyTextCount * 2) + (tightLineHeightCount * 0.5)
    + result.typography.issues.filter(i => i.severity === 'critical').length * 3
    + result.typography.issues.filter(i => i.severity === 'high').length * 1.5;
  result.typography.score = Math.max(0, 10 - typoDeductions);

  // ═══════════════════════════════════════════════════
  // 2. PROPORȚII — golden ratio, echilibru dimensiuni
  // ═══════════════════════════════════════════════════
  // Euristică: raportul ideal pentru carduri/containere de date
  // este între 1.2 și 1.8 (zona „naturală" din golden ratio 1.618)

  const GOLDEN = 1.618;
  const PROPORTION_OK_MIN = 1.1;
  const PROPORTION_OK_MAX = 2.2;

  const cardSelectors = '.card, [class*="card-"], [class*="-card"], [class*="panel"], [class*="widget"], [class*="kpi"]';
  let proportionIssueCount = 0;

  document.querySelectorAll(cardSelectors).forEach(el => {
    if (!isVisible(el) || !inViewport(el)) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 80 || rect.height < 40) return; // ignoră elementele minuscule
    const ratio = rect.width / rect.height;

    if (ratio < 0.5) {
      // Card extrem de înalt față de lățime
      proportionIssueCount++;
      result.proportion.issues.push({
        type: 'card_too_tall',
        severity: 'medium',
        confidence: 0.68,
        selector: normalizeSelector(el),
        value: Number(ratio.toFixed(2)),
        ideal_range: PROPORTION_OK_MIN + '–' + PROPORTION_OK_MAX,
        human_note: 'Cardul (' + Math.round(rect.width) + 'x' + Math.round(rect.height) + 'px, ratio ' + ratio.toFixed(2) + ') pare disproporționat de înalt. Poate crea senzație de "coloană îngustă".',
        golden_ratio_distance: Math.abs(ratio - GOLDEN).toFixed(2)
      });
    } else if (ratio > 5) {
      // Card extrem de lat față de înălțime
      proportionIssueCount++;
      result.proportion.issues.push({
        type: 'card_too_wide',
        severity: 'low',
        confidence: 0.6,
        selector: normalizeSelector(el),
        value: Number(ratio.toFixed(2)),
        ideal_range: PROPORTION_OK_MIN + '–' + PROPORTION_OK_MAX,
        human_note: 'Cardul (' + Math.round(rect.width) + 'x' + Math.round(rect.height) + 'px) pare exagerat de lat și subțire. Poate fi greu de scanat vizual.',
        golden_ratio_distance: Math.abs(ratio - GOLDEN).toFixed(2)
      });
    }

    // Verifică dacă padding-ul intern e proporțional cu dimensiunea
    const s = window.getComputedStyle(el);
    const pt = pxToNum(s.paddingTop), pb = pxToNum(s.paddingBottom);
    const pl = pxToNum(s.paddingLeft), pr = pxToNum(s.paddingRight);
    const avgPad = (pt + pb + pl + pr) / 4;
    if (rect.height > 50 && avgPad < 6) {
      result.proportion.issues.push({
        type: 'insufficient_padding',
        severity: 'medium',
        confidence: 0.75,
        selector: normalizeSelector(el),
        value: avgPad,
        threshold: 8,
        human_note: 'Cardul are padding intern prea mic (' + avgPad.toFixed(0) + 'px medie). Conținutul pare înghessuit.'
      });
    }
  });

  // Verifică grafice/charts: ar trebui să aibă minim 40% din containerul lor
  const chartSelectors = '[class*="chart"], [class*="gauge"], canvas, svg[class*="chart"]';
  document.querySelectorAll(chartSelectors).forEach(el => {
    if (!isVisible(el) || !inViewport(el)) return;
    const rect = el.getBoundingClientRect();
    const parent = el.closest('.card, [class*="panel"], [class*="widget"]');
    if (!parent) return;
    const prect = parent.getBoundingClientRect();
    if (prect.width < 50 || prect.height < 50) return;
    const fillRatio = (rect.width * rect.height) / (prect.width * prect.height);
    if (fillRatio < 0.2 && rect.width > 30) {
      proportionIssueCount++;
      result.proportion.issues.push({
        type: 'chart_too_small',
        severity: 'medium',
        confidence: 0.72,
        selector: normalizeSelector(el),
        value: Number(fillRatio.toFixed(2)),
        threshold: 0.2,
        human_note: 'Graficul ocupă doar ' + (fillRatio*100).toFixed(0) + '% din containerul său. Pare neglijent față de importanța datei vizualizate.',
        sizes: { chart: Math.round(rect.width) + 'x' + Math.round(rect.height), container: Math.round(prect.width) + 'x' + Math.round(prect.height) }
      });
    }
  });

  result.proportion.score = Math.max(0, 10 - proportionIssueCount * 1.5
    - result.proportion.issues.filter(i=>i.severity==='medium').length * 0.5);

  // ═══════════════════════════════════════════════════
  // 3. DENSITATE VIZUALĂ — cognitive load estimate
  // ═══════════════════════════════════════════════════

  let totalContentArea = 0;
  const viewportArea = vw * Math.min(vh, 900); // primele 900px

  const contentEls = document.querySelectorAll(
    'p, h1, h2, h3, h4, button, input, select, .card, [class*="chip"], [class*="badge"], img, svg, canvas, table, li'
  );
  contentEls.forEach(el => {
    if (!isVisible(el) || !inViewport(el)) return;
    const r = el.getBoundingClientRect();
    if (r.top > 900) return;
    totalContentArea += r.width * r.height;
  });

  const densityRatio = viewportArea > 0 ? totalContentArea / viewportArea : 0;

  if (densityRatio > 1.8) {
    // Overlap de conținut sau densitate extremă
    result.density.issues.push({
      type: 'extreme_density',
      severity: 'high',
      confidence: 0.8,
      value: Number(densityRatio.toFixed(2)),
      threshold: 1.8,
      human_note: 'Pagina are o densitate vizuală foarte ridicată (' + (densityRatio*100).toFixed(0) + '%). Utilizatorul va simți oboseală cognitivă rapidă.'
    });
  } else if (densityRatio > 1.2) {
    result.density.issues.push({
      type: 'high_density',
      severity: 'medium',
      confidence: 0.72,
      value: Number(densityRatio.toFixed(2)),
      threshold: 1.2,
      human_note: 'Pagina este densă vizual. Ar putea beneficia de mai mult spațiu negativ.'
    });
  }

  // Contorizare elemente interactive per secțiune de viewport
  let interactiveCount = 0;
  document.querySelectorAll('button, a, input, select, [role="button"]').forEach(el => {
    if (isVisible(el) && inViewport(el)) interactiveCount++;
  });

  if (interactiveCount > 25) {
    result.density.issues.push({
      type: 'too_many_interactive_elements',
      severity: 'medium',
      confidence: 0.7,
      value: interactiveCount,
      threshold: 20,
      human_note: interactiveCount + ' elemente interactive vizibile simultan. Utilizatorul nu știe unde să se uite primul.'
    });
  }

  const densityDeductions = result.density.issues.filter(i=>i.severity==='high').length * 2
    + result.density.issues.filter(i=>i.severity==='medium').length * 1;
  result.density.score = Math.max(0, 10 - densityDeductions);

  // ═══════════════════════════════════════════════════
  // 4. IERARHIE VIZUALĂ — CTA, dominanță, scanabilitate
  // ═══════════════════════════════════════════════════

  // Caută CTA-ul principal și evaluează vizibilitatea lui
  const ctaSelectors = [
    'button.primary', 'button[class*="primary"]', 'button[class*="cta"]',
    'button[class*="accent"]', 'a.primary', 'a[class*="cta"]',
    '.btn-primary', '[class*="btn-accent"]',
    'button[type="submit"]'
  ];

  let ctaFound = false;
  let ctaIssues = [];

  ctaSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (!isVisible(el) || !inViewport(el)) return;
      ctaFound = true;
      const rect = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      const fg = rgbParts(s.color);
      const bg = rgbParts(s.backgroundColor);

      if (rect.width < 60 || rect.height < 28) {
        ctaIssues.push({
          type: 'cta_too_small',
          severity: 'high',
          confidence: 0.8,
          selector: normalizeSelector(el),
          size: Math.round(rect.width) + 'x' + Math.round(rect.height),
          human_note: 'CTA-ul principal este prea mic (' + Math.round(rect.width) + 'x' + Math.round(rect.height) + 'px). Nu atrage suficient atenția.'
        });
      }

      if (fg && bg && bg.a > 0.5) {
        const cr = contrastRatio(fg, bg);
        if (cr < 3.5) {
          ctaIssues.push({
            type: 'cta_low_contrast',
            severity: 'high',
            confidence: 0.85,
            selector: normalizeSelector(el),
            contrast: Number(cr.toFixed(2)),
            human_note: 'CTA-ul are contrast scăzut (' + cr.toFixed(1) + ':1). Un utilizator obosit sau distras poate să nu-l observe.'
          });
        }
      }
    });
  });

  result.hierarchy.issues.push(...ctaIssues);

  // Verifică dacă există heading h1 vizibil pe pagină
  const h1s = Array.from(document.querySelectorAll('h1, [class*="page-title"], [class*="section-title"]')).filter(isVisible);
  if (h1s.length === 0) {
    result.hierarchy.issues.push({
      type: 'no_clear_heading',
      severity: 'medium',
      confidence: 0.72,
      human_note: 'Pagina nu are un titlu principal clar. Utilizatorul poate fi confuz privind contextul actual.'
    });
  }

  // Verifică dacă există prea multe secțiuni cu aceeași greutate vizuală
  const sections = document.querySelectorAll('[class*="section"], [class*="zone"], [class*="panel"]');
  const sectionHeights = Array.from(sections).filter(isVisible).map(el => el.getBoundingClientRect().height);
  if (sectionHeights.length > 3) {
    const maxH = Math.max(...sectionHeights);
    const minH = Math.min(...sectionHeights.filter(h=>h>50));
    if (maxH > 0 && minH > 0 && maxH / minH < 1.1 && sectionHeights.length > 4) {
      result.hierarchy.issues.push({
        type: 'uniform_section_heights',
        severity: 'low',
        confidence: 0.55,
        human_note: 'Toate secțiunile par să aibă aceeași înălțime. Lipsa variației de ritm vizual poate face pagina monotonă.'
      });
    }
  }

  const hierarchyDeductions = ctaIssues.filter(i=>i.severity==='high').length * 2
    + result.hierarchy.issues.filter(i=>i.severity==='medium').length * 1;
  result.hierarchy.score = Math.max(0, 10 - hierarchyDeductions);

  // ═══════════════════════════════════════════════════
  // 5. SPACING — consistență și ritm
  // ═══════════════════════════════════════════════════

  // Colectează gap-urile și margin-urile din componente similare
  const spacingGroups = [
    { selector: '.card', prop: 'marginBottom', name: 'card margin-bottom' },
    { selector: '.card', prop: 'padding', name: 'card padding' },
    { selector: 'button', prop: 'paddingLeft', name: 'button padding-left' },
    { selector: '[class*="nav-item"]', prop: 'paddingTop', name: 'nav-item padding-top' }
  ];

  spacingGroups.forEach(group => {
    const els = Array.from(document.querySelectorAll(group.selector)).filter(isVisible);
    if (els.length < 3) return;
    const values = els.map(el => pxToNum(window.getComputedStyle(el)[group.prop]));
    const unique = new Set(values.filter(v => v > 0));
    if (unique.size > 3) {
      result.spacing.issues.push({
        type: 'spacing_inconsistency',
        severity: 'low',
        confidence: 0.65,
        selector: group.selector,
        property: group.name,
        unique_values: Array.from(unique).sort((a,b)=>a-b).slice(0,6),
        count: els.length,
        human_note: unique.size + ' valori diferite pentru "' + group.name + '" în ' + els.length + ' elemente similare. Lipsa ritmului vizual.'
      });
    }
  });

  result.spacing.score = Math.max(0, 10 - result.spacing.issues.length * 0.8);

  // ═══════════════════════════════════════════════════
  // 6. ECHILIBRU COMPOZIȚIONAL (balance)
  // ═══════════════════════════════════════════════════

  // Verifică distribuția conținutului stânga/dreapta și sus/jos
  const main = document.querySelector('#pageContent, main, [role="main"], #app');
  if (main) {
    const contentItems = Array.from(main.querySelectorAll('*')).filter(el => {
      if (!isVisible(el)) return false;
      const r = el.getBoundingClientRect();
      return r.width > 40 && r.height > 20 && inViewport(el);
    });

    let leftWeight = 0, rightWeight = 0;
    const midX = vw / 2;
    contentItems.forEach(el => {
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      const cx = r.left + r.width / 2;
      if (cx < midX) leftWeight += area;
      else rightWeight += area;
    });

    const totalWeight = leftWeight + rightWeight;
    if (totalWeight > 0) {
      const leftRatio = leftWeight / totalWeight;
      if (leftRatio > 0.8) {
        result.balance.issues.push({
          type: 'layout_heavy_left',
          severity: 'low',
          confidence: 0.6,
          value: Number(leftRatio.toFixed(2)),
          human_note: 'Conținutul este concentrat (' + (leftRatio*100).toFixed(0) + '%) pe jumătatea stângă a ecranului. Poate crea dezechilibru vizual pe ecrane largi.'
        });
      } else if (leftRatio < 0.2) {
        result.balance.issues.push({
          type: 'layout_heavy_right',
          severity: 'low',
          confidence: 0.6,
          value: Number((1-leftRatio).toFixed(2)),
          human_note: 'Conținutul este concentrat pe dreapta. Dezechilibru compozițional.'
        });
      }
    }
  }

  result.balance.score = Math.max(0, 10 - result.balance.issues.length * 1.5);

  // ═══════════════════════════════════════════════════
  // AGREGARE — human perception scores
  // ═══════════════════════════════════════════════════

  const criticalCount = [
    ...result.typography.issues,
    ...result.proportion.issues,
    ...result.density.issues,
    ...result.hierarchy.issues,
    ...result.spacing.issues,
    ...result.balance.issues
  ].filter(i => i.severity === 'critical').length;

  const highCount = [
    ...result.typography.issues,
    ...result.proportion.issues,
    ...result.density.issues,
    ...result.hierarchy.issues,
    ...result.spacing.issues,
    ...result.balance.issues
  ].filter(i => i.severity === 'high').length;

  result.human_perception = {
    readability: Math.max(0, 10 - tinyTextCount * 2 - tightLineHeightCount * 0.5),
    visual_balance: result.balance.score,
    hierarchy: result.hierarchy.score,
    density: result.density.score,
    fatigue_risk: Math.min(10,
      (densityRatio > 1.5 ? 3 : densityRatio > 1.0 ? 1.5 : 0) +
      (tightLineHeightCount > 3 ? 2 : tightLineHeightCount > 0 ? 1 : 0) +
      (tinyTextCount > 0 ? 2 : 0) +
      (interactiveCount > 25 ? 2 : interactiveCount > 15 ? 1 : 0) +
      (criticalCount * 1.5) + (highCount * 0.5)
    )
  };

  return result;
})()`;

module.exports = { PERCEPTION_AUDIT_SCRIPT };
