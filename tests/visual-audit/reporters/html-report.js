// =============================================
// html-report.js — Generator raport HTML vizual
// Produce un raport interactiv cu screenshots,
// scoruri euristice și issues filtrabilepe severitate/categorie
// =============================================

'use strict';

const path = require('path');

function severityColor(sev) {
  return { critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#22c55e' }[sev] || '#6b7280';
}

function severityBg(sev) {
  return { critical: 'rgba(239,68,68,0.12)', high: 'rgba(245,158,11,0.12)', medium: 'rgba(99,102,241,0.12)', low: 'rgba(34,197,94,0.12)' }[sev] || 'rgba(107,114,128,0.12)';
}

function scoreColor(score) {
  if (score >= 8) return '#22c55e';
  if (score >= 6) return '#f59e0b';
  return '#ef4444';
}

function scoreLabel(score) {
  if (score >= 9) return 'Excelent';
  if (score >= 7.5) return 'Bun';
  if (score >= 6) return 'Acceptabil';
  if (score >= 4) return 'Slab';
  return 'Critic';
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function screenshotTag(filePath, caption, outDir) {
  if (!filePath) return '';
  const rel = path.relative(outDir, filePath).replace(/\\/g, '/');
  return `<figure class="screenshot-wrap">
    <img src="${escHtml(rel)}" loading="lazy" alt="${escHtml(caption)}" />
    <figcaption>${escHtml(caption)}</figcaption>
  </figure>`;
}

function issueCard(issue, outDir) {
  const sev = issue.severity || 'low';
  const hp = issue.human_perception_score || {};
  const ev = issue.evidence || {};
  const hasScreenshot = ev.screenshot_path || ev.current_screenshot;

  return `
  <div class="issue-card" data-severity="${sev}" data-type="${escHtml(issue.type||'')}">
    <div class="issue-header">
      <span class="issue-id">${escHtml(issue.id||'')}</span>
      <span class="badge badge-${sev}">${sev.toUpperCase()}</span>
      <span class="badge badge-type">${escHtml(issue.type||'')}</span>
      ${issue.confidence ? `<span class="confidence">conf: ${(issue.confidence*100).toFixed(0)}%</span>` : ''}
    </div>

    <div class="issue-title">${escHtml(issue.title||'')}</div>

    <div class="issue-meta">
      <span>📍 ${escHtml(issue.page_or_flow||'')}</span>
      ${issue.viewport ? `<span>🖥 ${escHtml(issue.viewport)}</span>` : ''}
      ${issue.selector_or_component ? `<code>${escHtml(issue.selector_or_component)}</code>` : ''}
    </div>

    <div class="issue-body">
      ${issue.description ? `<p class="desc">${escHtml(issue.description)}</p>` : ''}
      ${issue.why_it_matters ? `<p class="why"><strong>De ce contează:</strong> ${escHtml(issue.why_it_matters)}</p>` : ''}
      ${issue.probable_cause ? `<p class="cause"><strong>Cauza probabilă:</strong> ${escHtml(issue.probable_cause)}</p>` : ''}
      ${issue.recommended_fix ? `<p class="fix"><strong>Fix recomandat:</strong> ${escHtml(issue.recommended_fix)}</p>` : ''}
    </div>

    ${Object.keys(hp).length > 0 ? `
    <div class="hp-scores">
      ${Object.entries(hp).map(([k,v]) => `
        <div class="hp-item">
          <span class="hp-label">${k}</span>
          <div class="hp-bar-wrap">
            <div class="hp-bar" style="width:${Math.max(0,Math.min(100,v*10))}%;background:${scoreColor(v)}"></div>
          </div>
          <span class="hp-val" style="color:${scoreColor(v)}">${Number(v).toFixed(1)}</span>
        </div>
      `).join('')}
    </div>` : ''}

    ${ev.layout_issue ? `<div class="evidence-text"><strong>Evidence:</strong> ${escHtml(ev.layout_issue)}</div>` : ''}
    ${hasScreenshot ? screenshotTag(ev.screenshot_path || ev.current_screenshot, `Screenshot: ${issue.title}`, outDir) : ''}

    <div class="repair-scope repair-${issue.repair_scope || 'manual_review'}">
      <strong>Repair scope:</strong> ${escHtml(issue.repair_scope || 'needs review')}
    </div>
  </div>`;
}

function pageSection(pageName, pageId, viewportName, issues, screenshots, perceptionScores, outDir) {
  const sortedIssues = [...issues].sort((a,b) => {
    const w = { critical:4, high:3, medium:2, low:1 };
    return (w[b.severity]||0) - (w[a.severity]||0);
  });

  const critCount = issues.filter(i=>i.severity==='critical').length;
  const highCount = issues.filter(i=>i.severity==='high').length;
  const medCount = issues.filter(i=>i.severity==='medium').length;
  const lowCount = issues.filter(i=>i.severity==='low').length;

  const thumbs = Object.entries(screenshots || {})
    .map(([key, fp]) => screenshotTag(fp, `${pageName} — ${key}`, outDir))
    .join('');

  const ps = perceptionScores || {};
  const scoreItems = [
    { label: 'Readability', key: 'readability' },
    { label: 'Visual Balance', key: 'visual_balance' },
    { label: 'Hierarchy', key: 'hierarchy' },
    { label: 'Density', key: 'density' },
    { label: 'Typography', key: 'typography' },
    { label: 'Proportion', key: 'proportion' },
    { label: 'Spacing', key: 'spacing' }
  ];

  return `
  <section class="page-section" id="page-${pageId}-${viewportName}">
    <div class="page-section-header">
      <div class="page-section-title">${escHtml(pageName)} <span class="viewport-badge">${escHtml(viewportName)}</span></div>
      <div class="page-counters">
        ${critCount ? `<span class="counter counter-critical">${critCount} critical</span>` : ''}
        ${highCount ? `<span class="counter counter-high">${highCount} high</span>` : ''}
        ${medCount ? `<span class="counter counter-medium">${medCount} medium</span>` : ''}
        ${lowCount ? `<span class="counter counter-low">${lowCount} low</span>` : ''}
        ${!critCount && !highCount && !medCount && !lowCount ? '<span class="counter counter-ok">✓ Clean</span>' : ''}
      </div>
    </div>

    <div class="page-section-body">
      ${thumbs ? `<div class="screenshots-row">${thumbs}</div>` : ''}

      ${Object.keys(ps).length > 0 ? `
      <div class="perception-grid">
        ${scoreItems.map(si => {
          const val = ps[si.key];
          if (val == null) return '';
          return `<div class="perception-cell">
            <div class="perception-score" style="color:${scoreColor(val)}">${Number(val).toFixed(1)}</div>
            <div class="perception-label">${si.label}</div>
            <div class="perception-status">${scoreLabel(val)}</div>
          </div>`;
        }).join('')}
        ${ps.fatigue_risk != null ? `<div class="perception-cell fatigue">
          <div class="perception-score" style="color:${scoreColor(10-ps.fatigue_risk)}">${Number(ps.fatigue_risk).toFixed(1)}/10</div>
          <div class="perception-label">Fatigue Risk</div>
          <div class="perception-status">${ps.fatigue_risk > 5 ? '⚠️ Ridicat' : ps.fatigue_risk > 2 ? 'Moderat' : 'Scăzut'}</div>
        </div>` : ''}
      </div>` : ''}

      <div class="issues-list">
        ${sortedIssues.length > 0
          ? sortedIssues.map(i => issueCard(i, outDir)).join('')
          : '<div class="no-issues">✓ Nicio problemă detectată pe această pagină/viewport</div>'}
      </div>
    </div>
  </section>`;
}

function generateHTML(report, outDir) {
  const now = new Date().toLocaleString('ro', { dateStyle: 'medium', timeStyle: 'short' });
  const s = report.summary || {};
  const allIssues = report.issues || [];

  // Grupează pe pagini
  const byPage = new Map();
  for (const section of report.sections || []) {
    byPage.set(`${section.pageId}-${section.viewport}`, section);
  }

  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Study Hub — Visual Audit Report</title>
<style>
:root {
  --bg: #0f1117; --bg2: #161b27; --bg3: #1e2535; --bg4: #252f42;
  --border: rgba(255,255,255,0.07);
  --text: #e8eaf0; --muted: #6b7280;
  --accent: #6366f1; --green: #22c55e; --amber: #f59e0b;
  --red: #ef4444; --blue: #38bdf8; --purple: #a78bfa;
  --r: 10px; --mono: 'JetBrains Mono', monospace;
}
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: system-ui, -apple-system, sans-serif; background:var(--bg); color:var(--text); font-size:14px; line-height:1.6; }
.wrap { max-width: 1200px; margin:0 auto; padding: 32px 20px 80px; }

/* Header */
.report-header { margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
.report-header h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 4px; }
.report-header .meta { color: var(--muted); font-size: 0.82rem; }
.report-header .badges { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }

/* Summary cards */
.summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:40px; }
.summary-card { background:var(--bg2); border:1px solid var(--border); border-radius:var(--r); padding:18px 16px; text-align:center; }
.summary-card .val { font-size:2rem; font-weight:700; line-height:1; margin-bottom:4px; }
.summary-card .lbl { font-size:0.7rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.07em; }
.s-critical .val { color:var(--red); }
.s-high .val { color:var(--amber); }
.s-medium .val { color:var(--accent); }
.s-low .val { color:var(--green); }

/* Filters */
.filters { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:24px; }
.filter-btn { padding:6px 14px; border-radius:20px; border:1px solid var(--border); background:var(--bg2); color:var(--muted); font-size:0.78rem; cursor:pointer; transition:all 0.15s; }
.filter-btn:hover, .filter-btn.active { background:var(--accent); color:#fff; border-color:var(--accent); }
.filter-btn.f-critical { --a:#ef4444; }
.filter-btn.f-critical.active { background:var(--a); border-color:var(--a); }
.filter-btn.f-high.active { background:#f59e0b; border-color:#f59e0b; color:#000; }

/* Page sections */
.page-section { margin-bottom:48px; }
.page-section-header {
  display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;
  padding:14px 18px; background:var(--bg2); border:1px solid var(--border);
  border-radius:var(--r) var(--r) 0 0; border-bottom:2px solid var(--accent);
}
.page-section-title { font-size:0.95rem; font-weight:700; display:flex; align-items:center; gap:8px; }
.viewport-badge { font-size:0.7rem; background:var(--bg3); padding:2px 8px; border-radius:20px; color:var(--muted); font-weight:400; }
.page-counters { display:flex; gap:6px; flex-wrap:wrap; }
.counter { font-size:0.7rem; padding:2px 8px; border-radius:20px; font-weight:700; }
.counter-critical { background:rgba(239,68,68,.15); color:#ef4444; }
.counter-high { background:rgba(245,158,11,.15); color:#f59e0b; }
.counter-medium { background:rgba(99,102,241,.15); color:#818cf8; }
.counter-low { background:rgba(34,197,94,.15); color:#22c55e; }
.counter-ok { background:rgba(34,197,94,.1); color:#22c55e; }
.page-section-body { background:var(--bg); border:1px solid var(--border); border-top:none; border-radius:0 0 var(--r) var(--r); padding:20px; }

/* Screenshots */
.screenshots-row { display:flex; gap:12px; overflow-x:auto; padding-bottom:8px; margin-bottom:20px; }
.screenshot-wrap { flex-shrink:0; }
.screenshot-wrap img { max-height:280px; max-width:400px; border-radius:6px; border:1px solid var(--border); display:block; }
.screenshot-wrap figcaption { font-size:0.68rem; color:var(--muted); margin-top:4px; text-align:center; }

/* Perception scores grid */
.perception-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(100px,1fr)); gap:10px; margin-bottom:20px; padding:16px; background:var(--bg2); border-radius:var(--r); border:1px solid var(--border); }
.perception-cell { text-align:center; padding:8px 4px; }
.perception-score { font-size:1.4rem; font-weight:700; line-height:1; }
.perception-label { font-size:0.65rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; margin-top:2px; }
.perception-status { font-size:0.7rem; color:var(--muted); margin-top:2px; }
.perception-cell.fatigue { background:rgba(239,68,68,0.05); border-radius:6px; }

/* Issue cards */
.issue-card { border:1px solid var(--border); border-radius:var(--r); padding:16px 18px; margin-bottom:10px; background:var(--bg2); border-left:3px solid; }
.issue-card[data-severity="critical"] { border-left-color:#ef4444; }
.issue-card[data-severity="high"] { border-left-color:#f59e0b; }
.issue-card[data-severity="medium"] { border-left-color:#6366f1; }
.issue-card[data-severity="low"] { border-left-color:#22c55e; }
.issue-header { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
.issue-id { font-family:var(--mono); font-size:0.68rem; color:var(--muted); }
.issue-title { font-weight:600; font-size:0.9rem; margin-bottom:6px; }
.issue-meta { display:flex; gap:10px; flex-wrap:wrap; font-size:0.75rem; color:var(--muted); margin-bottom:10px; }
.issue-meta code { font-family:var(--mono); font-size:0.7rem; background:var(--bg3); padding:1px 5px; border-radius:3px; color:var(--blue); }
.issue-body p { font-size:0.82rem; line-height:1.6; margin-bottom:6px; color:var(--muted); }
.issue-body p strong { color:var(--text); }
.issue-body .fix { color:#86efac; }
.badge { padding:2px 8px; border-radius:20px; font-size:0.68rem; font-weight:700; text-transform:uppercase; }
.badge-critical { background:rgba(239,68,68,.15); color:#ef4444; }
.badge-high { background:rgba(245,158,11,.15); color:#f59e0b; }
.badge-medium { background:rgba(99,102,241,.15); color:#818cf8; }
.badge-low { background:rgba(34,197,94,.15); color:#22c55e; }
.badge-type { background:var(--bg3); color:var(--muted); }
.confidence { font-size:0.68rem; color:var(--muted); font-family:var(--mono); }

/* HP bar */
.hp-scores { margin-top:12px; display:flex; flex-direction:column; gap:4px; }
.hp-item { display:flex; align-items:center; gap:8px; font-size:0.75rem; }
.hp-label { width:110px; color:var(--muted); }
.hp-bar-wrap { flex:1; height:4px; background:var(--bg3); border-radius:2px; overflow:hidden; }
.hp-bar { height:100%; border-radius:2px; }
.hp-val { width:30px; text-align:right; font-family:var(--mono); font-size:0.72rem; }

/* Repair scope */
.repair-scope { margin-top:10px; font-size:0.72rem; padding:4px 10px; border-radius:4px; display:inline-block; }
.repair-minimal { background:rgba(34,197,94,.1); color:#22c55e; }
.repair-moderate { background:rgba(245,158,11,.1); color:#f59e0b; }
.repair-manual_review { background:rgba(239,68,68,.1); color:#ef4444; }

/* Evidence */
.evidence-text { font-size:0.78rem; color:var(--muted); background:var(--bg3); padding:8px 12px; border-radius:6px; margin-top:8px; font-family:var(--mono); }
.no-issues { padding:20px; text-align:center; color:var(--green); font-size:0.88rem; }

/* TOC */
.toc { background:var(--bg2); border:1px solid var(--border); border-radius:var(--r); padding:16px 20px; margin-bottom:32px; }
.toc-title { font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--muted); margin-bottom:10px; }
.toc-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px,1fr)); gap:6px; }
.toc-item { font-size:0.8rem; color:var(--accent); text-decoration:none; padding:4px 0; }
.toc-item:hover { color:var(--text); }

@media (max-width:700px) {
  .summary-grid { grid-template-columns:repeat(2,1fr); }
  .screenshot-wrap img { max-height:200px; max-width:280px; }
}

/* Print */
@media print { body { background:#fff; color:#000; } .issue-card { break-inside:avoid; } }
</style>
</head>
<body>
<div class="wrap">

<div class="report-header">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
    <h1>Study Hub — Visual Audit Report</h1>
  </div>
  <div class="meta">Generat: ${escHtml(now)} · ${escHtml(report.metadata?.viewport_count || '')} viewporturi · ${escHtml(String(report.metadata?.pages_audited || ''))} pagini auditate</div>
  <div class="badges">
    ${s.critical_count ? `<span class="badge badge-critical">${s.critical_count} critical</span>` : ''}
    ${s.high_count ? `<span class="badge badge-high">${s.high_count} high</span>` : ''}
    ${s.medium_count ? `<span class="badge badge-medium">${s.medium_count} medium</span>` : ''}
    ${s.low_count ? `<span class="badge badge-low">${s.low_count} low</span>` : ''}
    ${!s.critical_count && !s.high_count ? '<span class="badge badge-low">✓ No critical issues</span>' : ''}
  </div>
</div>

<div class="summary-grid">
  <div class="summary-card s-critical"><div class="val">${s.critical_count||0}</div><div class="lbl">Critical</div></div>
  <div class="summary-card s-high"><div class="val">${s.high_count||0}</div><div class="lbl">High</div></div>
  <div class="summary-card s-medium"><div class="val">${s.medium_count||0}</div><div class="lbl">Medium</div></div>
  <div class="summary-card s-low"><div class="val">${s.low_count||0}</div><div class="lbl">Low</div></div>
</div>

${(s.top_visual_issues||[]).length > 0 ? `
<div class="toc" style="margin-bottom:20px">
  <div class="toc-title">Top probleme detectate</div>
  ${(s.top_visual_issues).map(i => `
    <div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
      <span class="badge badge-${i.severity}">${escHtml(i.severity)}</span>
      <span style="font-size:0.85rem">${escHtml(i.title)}</span>
      <span style="color:var(--muted);font-size:0.75rem;margin-left:auto">${escHtml(i.page_or_flow||'')} · ${escHtml(i.viewport||'')}</span>
    </div>
  `).join('')}
</div>` : ''}

<div class="filters">
  <button class="filter-btn active" onclick="filterIssues('all')">Toate</button>
  <button class="filter-btn f-critical" onclick="filterIssues('critical')">Critical</button>
  <button class="filter-btn f-high" onclick="filterIssues('high')">High</button>
  <button class="filter-btn" onclick="filterIssues('medium')">Medium</button>
  <button class="filter-btn" onclick="filterIssues('low')">Low</button>
  <button class="filter-btn" onclick="filterIssues('overflow')">Overflow</button>
  <button class="filter-btn" onclick="filterIssues('contrast')">Contrast</button>
  <button class="filter-btn" onclick="filterIssues('clipping')">Clipping</button>
  <button class="filter-btn" onclick="filterIssues('typography')">Typography</button>
  <button class="filter-btn" onclick="filterIssues('proportion')">Proportion</button>
  <button class="filter-btn" onclick="filterIssues('density')">Density</button>
  <button class="filter-btn" onclick="filterIssues('hierarchy')">Hierarchy</button>
</div>

<div id="sections-container">
${(report.sections||[]).map(sec =>
  pageSection(sec.pageName, sec.pageId, sec.viewport, sec.issues, sec.screenshots, sec.perceptionScores, outDir)
).join('\n')}
</div>

</div>

<script>
function filterIssues(type) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  document.querySelectorAll('.issue-card').forEach(card => {
    if (type === 'all') { card.style.display = ''; return; }
    const sev = card.dataset.severity;
    const t = card.dataset.type;
    const show = sev === type || t === type ||
      (type === 'overflow' && t === 'overflow') ||
      (type === 'contrast' && t === 'contrast') ||
      (type === 'clipping' && t === 'clipping') ||
      (type === 'typography' && (t.includes('font') || t.includes('line_height') || t.includes('heading'))) ||
      (type === 'proportion' && (t.includes('card_') || t.includes('chart_') || t.includes('padding'))) ||
      (type === 'density' && t.includes('density')) ||
      (type === 'hierarchy' && (t.includes('hierarchy') || t.includes('cta') || t.includes('heading')));
    card.style.display = show ? '' : 'none';
  });
}
</script>
</body>
</html>`;
}

module.exports = { generateHTML };
