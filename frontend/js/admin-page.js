// ─────────────────────────────────────────────────────────────────
// admin-page.js — Admin Dashboard
// Visible only to users with role = 'admin'
// ─────────────────────────────────────────────────────────────────
/* global authFetch, navigateTo, window */

async function renderAdminPage(container) {
  if (!window.__shUser || window.__shUser.role !== 'admin') {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-title">Acces restricționat</div><div class="empty-state-desc">Această pagină este disponibilă doar pentru administratori.</div></div>';
    return;
  }

  container.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:32px 0 16px;color:var(--text-muted);font-size:.9rem;">Se încarcă datele...</div>';

  let data, settings;
  try {
    const [statsRes, settingsRes] = await Promise.all([
      authFetch('/api/admin/stats', { credentials: 'include' }),
      authFetch('/api/admin/settings', { credentials: 'include' }),
    ]);
    if (!statsRes.ok) throw new Error('Eroare ' + statsRes.status);
    data = await statsRes.json();
    settings = settingsRes.ok ? await settingsRes.json() : { registration_open: 'true' };
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-title">Eroare la încărcare</div><div class="empty-state-desc">' + e.message + '</div></div>';
    return;
  }

  const ov = data.overview || {};
  const days = data.costLast7Days || [];
  const features = data.byFeature || [];
  const subjects = data.topSubjects || [];
  const recent = data.recentCalls || [];
  const topUsers = data.topUsersByCost || [];

  const fmt = n => n == null ? '0' : Number(n).toLocaleString('ro');
  const fmtCost = n => n == null ? '$0.0000' : '$' + Number(n).toFixed(4);
  const fmtCostShort = n => n == null ? '$0.00' : '$' + Number(n).toFixed(2);
  const timeAgo = dt => {
    if (!dt) return '—';
    const diff = Date.now() - new Date(dt).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'acum';
    if (m < 60) return m + 'm în urmă';
    if (m < 1440) return Math.floor(m/60) + 'h în urmă';
    return Math.floor(m/1440) + 'z în urmă';
  };

  // Max cost for bar chart scaling
  const maxDayCost = Math.max(...days.map(d => d.cost || 0), 0.001);
  const maxFeatureCost = Math.max(...features.map(f => f.cost || 0), 0.001);

  const featureColor = f => ({
    chat: 'var(--accent)', quiz: 'var(--blue)', flashcards: 'var(--green)',
    summarize: 'var(--purple)', exam: 'var(--amber)',
  }[f] || 'var(--text-muted)');

  let html = '';

  // ── Header ──────────────────────────────────────────────────────
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">';
  html += '<div><div style="font-size:1.4rem;font-weight:700;color:var(--text-primary);">Admin Dashboard</div>';
  html += '<div style="font-size:.8rem;color:var(--text-muted);margin-top:3px;">Study Hub · Date în timp real · ' + new Date().toLocaleDateString('ro', {day:'numeric',month:'long',year:'numeric'}) + '</div></div>';
  html += '<button onclick="renderAdminPage(document.getElementById(\'pageContent\'))" style="background:var(--bg-surface);border:1px solid var(--border);color:var(--text-secondary);border-radius:var(--radius-xs);padding:7px 16px;font-size:.82rem;cursor:pointer;">↺ Reîncarcă</button>';
  html += '</div>';

  // ── Setări platformă ────────────────────────────────────────────
  const regOpen = settings.registration_open === 'true';
  html += '<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius-xs);padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">';
  html += '<div><div style="font-size:.85rem;font-weight:600;color:var(--text-primary);margin-bottom:3px;">⚙ Setări platformă</div>';
  html += '<div style="font-size:.75rem;color:var(--text-muted);">Controlează accesul utilizatorilor la platformă</div></div>';
  html += '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">';
  // Registration toggle
  html += '<div style="display:flex;align-items:center;gap:10px;">';
  html += '<span style="font-size:.8rem;color:var(--text-secondary);">Înregistrări noi</span>';
  html += '<button id="adminRegToggle" onclick="adminToggleRegistration()" style="background:' + (regOpen ? 'var(--green)' : 'var(--bg-overlay)') + ';border:1px solid ' + (regOpen ? 'var(--green)' : 'var(--border)') + ';color:' + (regOpen ? '#0d0b10' : 'var(--text-muted)') + ';border-radius:20px;padding:5px 16px;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s;">' + (regOpen ? '✓ Deschise' : '✗ Închise') + '</button>';
  html += '</div>';
  html += '</div></div>';

  // ── Overview cards ───────────────────────────────────────────────
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px;">';
  const cards = [
    { label: 'Useri totali', value: fmt(ov.totalUsers), color: 'var(--accent)', icon: '👥' },
    { label: 'Activi azi', value: fmt(ov.activeToday), color: 'var(--green)', icon: '🟢' },
    { label: 'Calls azi', value: fmt(ov.callsToday), color: 'var(--blue)', icon: '⚡' },
    { label: 'Cost azi', value: fmtCostShort(ov.totalCostToday), color: 'var(--amber)', icon: '💰' },
    { label: 'Calls total', value: fmt(ov.totalCalls), color: 'var(--purple)', icon: '📊' },
    { label: 'Cost total', value: fmtCostShort(ov.totalCostAllTime), color: 'var(--red)', icon: '🏦' },
  ];
  cards.forEach(c => {
    html += '<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius-xs);padding:16px 18px;">';
    html += '<div style="font-size:1.1rem;margin-bottom:6px;">' + c.icon + '</div>';
    html += '<div style="font-size:1.5rem;font-weight:700;color:' + c.color + ';font-family:var(--font-mono);">' + c.value + '</div>';
    html += '<div style="font-size:.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-top:4px;">' + c.label + '</div>';
    html += '</div>';
  });
  html += '</div>';

  // ── Cost last 7 days chart ───────────────────────────────────────
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">';

  html += '<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius-xs);padding:18px 20px;">';
  html += '<div style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:16px;">Cost API — ultimele 7 zile</div>';
  if (days.length === 0) {
    html += '<div style="color:var(--text-muted);font-size:.85rem;">Nu există date încă.</div>';
  } else {
    html += '<div style="display:flex;align-items:flex-end;gap:8px;height:100px;">';
    // Fill missing days
    const allDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const found = days.find(x => x.day === key);
      allDays.push({ day: key, cost: found ? found.cost : 0, calls: found ? found.calls : 0 });
    }
    allDays.forEach(d => {
      const h = Math.max(4, Math.round((d.cost / maxDayCost) * 90));
      const label = new Date(d.day + 'T12:00:00').toLocaleDateString('ro', {day:'numeric',month:'short'});
      html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">';
      html += '<div style="font-size:.62rem;color:var(--accent);font-family:var(--font-mono);">' + fmtCostShort(d.cost) + '</div>';
      html += '<div style="width:100%;height:' + h + 'px;background:var(--accent);border-radius:4px 4px 2px 2px;opacity:' + (d.cost > 0 ? '1' : '0.18') + ';transition:height .3s;"></div>';
      html += '<div style="font-size:.6rem;color:var(--text-muted);text-align:center;white-space:nowrap;">' + label + '</div>';
      html += '</div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // Feature breakdown chart
  html += '<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius-xs);padding:18px 20px;">';
  html += '<div style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:14px;">Cost per feature</div>';
  if (features.length === 0) {
    html += '<div style="color:var(--text-muted);font-size:.85rem;">Nu există date încă.</div>';
  } else {
    features.forEach(f => {
      const pct = Math.max(3, Math.round((f.cost / maxFeatureCost) * 100));
      const col = featureColor(f.feature);
      html += '<div style="margin-bottom:10px;">';
      html += '<div style="display:flex;justify-content:space-between;font-size:.75rem;margin-bottom:4px;">';
      html += '<span style="color:var(--text-secondary);font-weight:500;">' + f.feature + '</span>';
      html += '<span style="color:' + col + ';font-family:var(--font-mono);">' + fmtCost(f.cost) + ' · ' + fmt(f.calls) + ' calls</span>';
      html += '</div>';
      html += '<div style="background:var(--bg-overlay);border-radius:4px;height:6px;">';
      html += '<div style="width:' + pct + '%;height:100%;background:' + col + ';border-radius:4px;transition:width .4s;"></div>';
      html += '</div></div>';
    });
  }
  html += '</div>';
  html += '</div>'; // end 2-col grid

  // ── Top subjects + Top users ─────────────────────────────────────
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">';

  // Top subjects
  html += '<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius-xs);padding:18px 20px;">';
  html += '<div style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:14px;">Top subiecte studiate</div>';
  if (subjects.length === 0) {
    html += '<div style="color:var(--text-muted);font-size:.85rem;">Nu există date încă.</div>';
  } else {
    subjects.forEach((s, i) => {
      html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">';
      html += '<span style="font-size:.7rem;color:var(--text-muted);width:16px;text-align:right;">' + (i+1) + '</span>';
      html += '<span style="flex:1;font-size:.82rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + s.subject + '">' + s.subject + '</span>';
      html += '<span style="font-size:.72rem;color:var(--green);font-family:var(--font-mono);">' + fmt(s.cnt) + ' calls</span>';
      html += '</div>';
    });
  }
  html += '</div>';

  // Top users by cost
  html += '<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius-xs);padding:18px 20px;">';
  html += '<div style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:14px;">Top useri după cost</div>';
  if (topUsers.length === 0) {
    html += '<div style="color:var(--text-muted);font-size:.85rem;">Nu există date încă.</div>';
  } else {
    topUsers.forEach((u, i) => {
      const roleColor = u.role === 'admin' ? 'var(--red)' : u.role === 'pro' ? 'var(--amber)' : 'var(--text-muted)';
      html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">';
      html += '<span style="font-size:.7rem;color:var(--text-muted);width:16px;text-align:right;">' + (i+1) + '</span>';
      html += '<span style="flex:1;font-size:.78rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (u.email||'—') + '">' + (u.email||'—') + '</span>';
      html += '<span style="font-size:.65rem;padding:2px 7px;border-radius:10px;background:' + roleColor + '22;color:' + roleColor + ';margin-right:4px;">' + (u.role||'free') + '</span>';
      html += '<span style="font-size:.72rem;color:var(--accent);font-family:var(--font-mono);">' + fmtCost(u.cost) + '</span>';
      html += '</div>';
    });
  }
  html += '</div>';
  html += '</div>'; // end 2-col grid

  // ── Recent activity ──────────────────────────────────────────────
  html += '<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius-xs);padding:18px 20px;">';
  html += '<div style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:14px;">Activitate recentă — ultimele 30 calls</div>';
  if (recent.length === 0) {
    html += '<div style="color:var(--text-muted);font-size:.85rem;">Nu există activitate încă.</div>';
  } else {
    html += '<div style="overflow-x:auto;">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:.78rem;">';
    html += '<thead><tr style="border-bottom:1px solid var(--border);">';
    ['Feature', 'User', 'Subiect', 'Tokens in', 'Tokens out', 'Cost', 'Când'].forEach(h => {
      html += '<th style="text-align:left;padding:6px 10px;font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);">' + h + '</th>';
    });
    html += '</tr></thead><tbody>';
    recent.forEach(r => {
      const col = featureColor(r.feature);
      html += '<tr style="border-bottom:1px solid var(--border);transition:background .15s;" onmouseover="this.style.background=\'var(--bg-surface)\'" onmouseout="this.style.background=\'\';">';
      html += '<td style="padding:7px 10px;"><span style="background:' + col + '1a;color:' + col + ';border-radius:6px;padding:2px 9px;font-size:.72rem;font-weight:600;">' + r.feature + '</span></td>';
      html += '<td style="padding:7px 10px;color:var(--text-secondary);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (r.email||'guest') + '">' + (r.email||'<span style="color:var(--text-muted)">guest</span>') + '</td>';
      html += '<td style="padding:7px 10px;color:var(--text-muted);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (r.subject || '—') + '</td>';
      html += '<td style="padding:7px 10px;color:var(--text-secondary);font-family:var(--font-mono);">' + fmt(r.tokens_input) + '</td>';
      html += '<td style="padding:7px 10px;color:var(--text-secondary);font-family:var(--font-mono);">' + fmt(r.tokens_output) + '</td>';
      html += '<td style="padding:7px 10px;color:var(--accent);font-family:var(--font-mono);">' + fmtCost(r.cost_usd) + '</td>';
      html += '<td style="padding:7px 10px;color:var(--text-muted);">' + timeAgo(r.called_at) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';

  container.innerHTML = html;
}

async function adminToggleRegistration() {
  const btn = document.getElementById('adminRegToggle');
  if (!btn) return;
  const isOpen = btn.textContent.includes('Deschise');
  const newVal = isOpen ? 'false' : 'true';
  btn.textContent = '...';
  btn.disabled = true;
  try {
    const res = await authFetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ registration_open: newVal }),
    });
    if (!res.ok) throw new Error('Eroare');
    btn.textContent = newVal === 'true' ? '✓ Deschise' : '✗ Închise';
    btn.style.background = newVal === 'true' ? 'var(--green)' : 'var(--bg-overlay)';
    btn.style.borderColor = newVal === 'true' ? 'var(--green)' : 'var(--border)';
    btn.style.color = newVal === 'true' ? '#0d0b10' : 'var(--text-muted)';
  } catch {
    btn.textContent = '! Eroare';
  }
  btn.disabled = false;
}
