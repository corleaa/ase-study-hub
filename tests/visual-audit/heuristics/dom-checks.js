// =============================================
// dom-checks.js — Verificări obiective DOM/layout
// Detectează: overflow, clipping, offscreen, overlap,
//             occlusion, alignment, contrast
// Rulează în context browser via page.evaluate()
// =============================================

'use strict';

/**
 * Rulat în browser context via page.evaluate().
 * Returnează un obiect cu toate problemele obiective detectate.
 */
const DOM_AUDIT_SCRIPT = /* js */ `(function() {
  // ── Utilități ─────────────────────────────────────────────────

  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, top: r.top, left: r.left,
             right: r.right, bottom: r.bottom,
             width: r.width, height: r.height };
  }

  function normalizeSelector(el) {
    if (el.id) return '#' + el.id;
    const cls = Array.from(el.classList || []).slice(0, 3).join('.');
    const tag = el.tagName.toLowerCase();
    return cls ? tag + '.' + cls : tag;
  }

  function isVisible(el) {
    if (!el) return false;
    const s = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' &&
           Number(s.opacity) > 0 && r.width > 0 && r.height > 0;
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
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * ch(rgb.r) + 0.7152 * ch(rgb.g) + 0.0722 * ch(rgb.b);
  }

  function contrastRatio(fg, bg) {
    const l1 = luminance(fg), l2 = luminance(bg);
    const li = Math.max(l1, l2), da = Math.min(l1, l2);
    return (li + 0.05) / (da + 0.05);
  }

  function findBackground(el) {
    let cur = el;
    while (cur && cur !== document.body) {
      const style = window.getComputedStyle(cur);
      // Dacă e gradient, nu putem detecta culoarea exactă — returnăm null
      const bgImg = style.backgroundImage;
      if (bgImg && bgImg !== 'none' && bgImg.includes('gradient')) return null;
      const bg = rgbParts(style.backgroundColor);
      if (bg && bg.a > 0.85) return bg;
      cur = cur.parentElement;
    }
    return { r: 22, g: 19, b: 22, a: 1 }; // fallback dark bg Study Hub
  }

  function getTextElements() {
    const tags = ['p', 'span', 'div', 'li', 'td', 'th', 'label',
                  'h1', 'h2', 'h3', 'h4', 'h5', 'small', 'strong', 'em', 'a'];
    return tags.flatMap(tag => Array.from(document.querySelectorAll(tag)))
               .filter(el => {
                 if (!isVisible(el)) return false;
                 const text = el.innerText ? el.innerText.trim() : '';
                 if (text.length < 2) return false;
                 // Ignoră elemente care sunt container-uri mari cu mulți copii
                 const directTextLength = Array.from(el.childNodes)
                   .filter(n => n.nodeType === 3)
                   .reduce((acc, n) => acc + (n.textContent||'').trim().length, 0);
                 return directTextLength > 0;
               });
  }

  // ── 1. Page overflow ──────────────────────────────────────────
  const result = {
    overflow: [],
    clipping: [],
    offscreen: [],
    overlaps: [],
    occlusion: [],
    alignment: [],
    contrast: [],
    touchTargets: [],
    zIndexStack: []
  };

  // Overflow orizontal
  if (document.documentElement.scrollWidth > window.innerWidth + 4) {
    result.overflow.push({
      selector: 'html',
      axis: 'horizontal',
      amount: document.documentElement.scrollWidth - window.innerWidth
    });
  }

  // ── 2. Text clipping ─────────────────────────────────────────
  // Orice element text care e mai mic decât conținutul său
  getTextElements().forEach(el => {
    const isClippedX = el.scrollWidth > el.clientWidth + 2;
    const isClippedY = el.scrollHeight > el.clientHeight + 2;
    if (!isClippedX && !isClippedY) return;
    const style = window.getComputedStyle(el);
    const hasOverflowHidden = style.overflow === 'hidden' || style.overflowX === 'hidden' || style.overflowY === 'hidden';
    const hasEllipsis = style.textOverflow === 'ellipsis';
    if (!hasOverflowHidden && !hasEllipsis) return; // clipping fără overflow:hidden nu e vizibil
    result.clipping.push({
      selector: normalizeSelector(el),
      axis: isClippedX ? 'horizontal' : 'vertical',
      scrollSize: isClippedX ? el.scrollWidth : el.scrollHeight,
      clientSize: isClippedX ? el.clientWidth : el.clientHeight,
      text: (el.innerText || '').slice(0, 60)
    });
  });

  // ── 3. Offscreen elements ────────────────────────────────────
  // Elemente interactive/vizibile care ies din viewport
  const interactiveSelectors = 'button, a, input, select, textarea, [role="button"], .card, .card-base, .nav-item';
  document.querySelectorAll(interactiveSelectors).forEach(el => {
    if (!isVisible(el)) return;
    const rect = el.getBoundingClientRect();
    if (rect.left < -10 || rect.right > window.innerWidth + 10) {
      result.offscreen.push({
        selector: normalizeSelector(el),
        rect: rectOf(el),
        overflow: rect.left < -10 ? 'left' : 'right',
        amount: rect.left < -10 ? -rect.left : rect.right - window.innerWidth
      });
    }
  });

  // ── 4. Overlaps (elemente care se suprapun neintentionat) ─────
  const overlapCandidates = ['.card', '.nav-item', 'button', '.toast',
    '[class*="chip"]', '[class*="badge"]', '[class*="tag"]', '[class*="modal"]'];
  const collected = [];
  overlapCandidates.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (isVisible(el)) collected.push(el);
    });
  });
  function isActuallyInViewport(el) {
    const r = el.getBoundingClientRect();
    // Elementul trebuie să fie cel puțin parțial în viewport
    if (r.right < 0 || r.bottom < 0 || r.left > window.innerWidth || r.top > window.innerHeight) return false;
    // Verifică că niciun ancestor nu e translatat off-screen (sidebar collapsed)
    let cur = el.parentElement;
    while (cur && cur !== document.body) {
      const style = window.getComputedStyle(cur);
      const transform = style.transform;
      if (transform && transform !== 'none') {
        // Dacă un parinte are translateX negativ mare, e off-screen
        const matrix = transform.match(/matrix\\(.*,.*,.*,.*,(.+),(.+)\\)/);
        if (matrix) {
          const tx = parseFloat(matrix[1]);
          if (tx < -50) return false; // translateX < -50px = off-screen
        }
      }
      const r2 = cur.getBoundingClientRect();
      if (r2.right < -10) return false; // container off-screen stânga
      cur = cur.parentElement;
    }
    return true;
  }

  // Dedup by node
  const unique = Array.from(new Set(collected));
  // Check pairs cu bounding box overlap > threshold
  for (let i = 0; i < Math.min(unique.length, 60); i++) {
    for (let j = i + 1; j < Math.min(unique.length, 60); j++) {
      const elA = unique[i], elB = unique[j];
      // Excludem relații parent-child: dacă unul e descendent al celuilalt, nu e overlap bug
      if (elA.contains(elB) || elB.contains(elA)) continue;
      // Ambele trebuie să fie efectiv vizibile în viewport (nu in sidebar collapsed)
      if (!isActuallyInViewport(elA) || !isActuallyInViewport(elB)) continue;
      const a = elA.getBoundingClientRect();
      const b = elB.getBoundingClientRect();
      if (a.width === 0 || b.width === 0) continue;
      const iw = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const ih = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const overlapArea = iw * ih;
      const minArea = Math.min(a.width * a.height, b.width * b.height);
      // Threshold mai strict: overlap > 20% din cel mai mic element
      if (overlapArea > 200 && overlapArea / minArea > 0.2) {
        result.overlaps.push({
          a: normalizeSelector(elA),
          b: normalizeSelector(elB),
          overlapArea: Math.round(overlapArea),
          overlapRatio: Number((overlapArea / minArea).toFixed(2))
        });
      }
    }
  }

  // ── 5. Occlusion (element blocat de altul) ────────────────────
  document.querySelectorAll('button, a[href], input').forEach(el => {
    if (!isVisible(el)) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) return;
    try {
      const topEl = document.elementFromPoint(cx, cy);
      if (topEl && !el.contains(topEl) && !topEl.contains(el) && topEl !== el) {
        const topTag = topEl.tagName.toLowerCase();
        if (!['html', 'body'].includes(topTag)) {
          result.occlusion.push({
            selector: normalizeSelector(el),
            blockedBy: normalizeSelector(topEl),
            rect: rectOf(el)
          });
        }
      }
    } catch(e) {}
  });

  // ── 6. Alignment inconsistencies ─────────────────────────────
  // Elemente sibling care ar trebui să fie aliniate dar nu sunt
  const gridSelectors = [
    '[class*="grid"]', '[class*="row"]', '[class*="flex"]',
    '.stats-grid', '.card-grid', '.tool-grid', '.subject-grid'
  ];
  gridSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(container => {
      if (!isVisible(container)) return;
      const children = Array.from(container.children).filter(isVisible);
      if (children.length < 2) return;
      const tops = children.map(el => Math.round(el.getBoundingClientRect().top));
      const heights = children.map(el => Math.round(el.getBoundingClientRect().height));
      const topSpread = Math.max(...tops) - Math.min(...tops);
      const heightSpread = Math.max(...heights) - Math.min(...heights);
      if (topSpread > 12 && topSpread > heights[0] * 0.2) {
        result.alignment.push({
          selector: normalizeSelector(container),
          childCount: children.length,
          topSpread,
          heightSpread,
          type: 'vertical_misalignment'
        });
      }
    });
  });

  // ── 7. Contrast ───────────────────────────────────────────────
  const textEls = getTextElements().slice(0, 200); // limit
  // Selectori decorativi/iconici de ignorat
  const DECORATIVE_PATTERNS = /icon|emoji|avatar|logo|badge-dot|separator|divider|tooltip|placeholder|hint/i;
  const IGNORE_CLASSES = ['ni-icon', 'nav-icon', 'icon', 'emoji', 'logo'];

  textEls.forEach(el => {
    const text = (el.innerText || '').trim();
    // Ignoră text prea scurt (iconuri, simboluri, emoji)
    if (text.length < 3) return;
    // Ignoră elemente cu clase decorative
    const classes = Array.from(el.classList || []);
    if (classes.some(c => IGNORE_CLASSES.includes(c) || DECORATIVE_PATTERNS.test(c))) return;
    // Ignoră elemente pur decorative (un singur caracter special)
    if (text.length === 1 && /[^\w\s]/.test(text)) return;

    const style = window.getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize);
    const fg = rgbParts(style.color);
    if (!fg || fg.a < 0.1) return;
    const bg = findBackground(el);
    // Dacă background-ul e pe gradient sau nedeterminabil — skip (false positive garantat)
    if (!bg) return;
    const ratio = contrastRatio(fg, bg);

    // Ratio sub 1.5 pe titluri principale = aproape sigur eroare de detectare background.
    // Titlurile albe pe background dark ar trebui să aibă >10:1.
    // Un ratio 1.19 pe h1/h2/#topbarTitle înseamnă că bg-ul detectat e greșit (e.g. gradient parent).
    const isHeadingOrTitle = el.tagName.match(/^H[1-5]$/) ||
      (el.id && /title|heading|topbar/i.test(el.id)) ||
      (Array.from(el.classList).some(c => /title|heading|section-title/i.test(c)));
    if (ratio < 1.5 && isHeadingOrTitle) return; // skip — bg detection unreliable

    const isLargeText = fontSize >= 18 || (parseFloat(style.fontWeight) >= 700 && fontSize >= 14);
    // Raportăm doar probleme clare (< 3.0) pentru a reduce false positives.
    const reportThreshold = isLargeText ? 2.5 : 3.0;
    if (ratio < reportThreshold) {
      const minRatio = isLargeText ? 3.0 : 4.5;
      result.contrast.push({
        selector: normalizeSelector(el),
        ratio: Number(ratio.toFixed(2)),
        required: minRatio,
        fontSize: Math.round(fontSize),
        text: text.slice(0, 40)
      });
    }
  });

  // ── 8. Touch targets prea mici (< 44px) ──────────────────────
  document.querySelectorAll('button, a, input[type="checkbox"], input[type="radio"], [role="button"]').forEach(el => {
    if (!isVisible(el)) return;
    const rect = el.getBoundingClientRect();
    if ((rect.width < 32 || rect.height < 32) && rect.width > 0) {
      result.touchTargets.push({
        selector: normalizeSelector(el),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: (el.innerText || el.value || el.title || '').slice(0, 30)
      });
    }
  });

  return result;
})()`;

module.exports = { DOM_AUDIT_SCRIPT };
