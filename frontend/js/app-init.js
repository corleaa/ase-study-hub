// =============================================
// js/app-init.js — SURSĂ CANONICĂ: Auth Init, Theme, Modals
// =============================================
//
// FIȘIER ACTIV — încărcat direct în index.html (după app-core.js)
//
// Conține:
//   - window.__shAccessToken, __shRefreshPromise, __shUser
//   - openAuthModal() / closeAuthModal()
//   - openUpgradeModal()
//   - updateAuthUI(user) — actualizează sidebar/topbar după login
//   - handleLogin() / handleRegister() / handleLogout()
//   - initTheme() / toggleTheme()
//   - IIFE de inițializare (rulează la load, verifică sesiunea)
//
// ⚠️  RISC RIDICAT PENTRU AUTOMATIZARE:
//   Conține IIFE care verifică sesiunea și apelează unlock() la final.
//   Nu modifica fără înțelegerea completă a flow-ului de auth.
// =============================================

// ── Auth management ───────────────────────────────────────────────
window.__shAccessToken = null;
window.__shRefreshPromise = null;
window.__shUser = null;  // { id, email, role }
var __authTab = 'login';

// ── Auth Modal ────────────────────────────────────────────────────
function openAuthModal() {
  var modal = document.getElementById('authModal');
  if (modal) modal.style.display = 'flex';
  setTimeout(function() {
    var emailInput = document.getElementById('authEmail');
    if (emailInput) emailInput.focus();
  }, 50);
}
function closeAuthModal() {
  var modal = document.getElementById('authModal');
  if (modal) modal.style.display = 'none';
  var errEl = document.getElementById('authError');
  if (errEl) errEl.style.display = 'none';
}

// ── Upgrade Modal ─────────────────────────────────────────────────
function openUpgradeModal(message, isLoggedIn) {
  var modal = document.getElementById('upgradeModal');
  var msgEl = document.getElementById('upgradeModalMsg');
  var ctaBtn = document.getElementById('upgradeModalCta');
  if (msgEl) msgEl.textContent = message;
  if (ctaBtn) {
    if (isLoggedIn) {
      // User is logged in (free tier) — show upgrade to pro CTA
      ctaBtn.textContent = 'Upgrade la Pro';
      ctaBtn.onclick = function() { closeUpgradeModal(); navigateTo('settings'); };
    } else {
      // Guest — show create account CTA
      ctaBtn.textContent = 'Creează cont gratuit';
      ctaBtn.onclick = function() { closeUpgradeModal(); openAuthModal(); };
    }
  }
  if (modal) modal.style.display = 'flex';
}
function closeUpgradeModal() {
  var modal = document.getElementById('upgradeModal');
  if (modal) modal.style.display = 'none';
}

// ── Handle 429 rate limit errors from API ────────────────────────
function handleRateLimitError(data) {
  var msg = data.error || 'Limită atinsă. Încearcă mai târziu.';
  var isLoggedIn = !!window.__shUser;
  openUpgradeModal(msg, isLoggedIn);
}

// ── Topbar auth UI ────────────────────────────────────────────────
function updateAuthUI(user) {
  var area = document.getElementById('topbarAuthArea');
  if (!area) return;
  window.__shUser = user;

  if (!user) {
    // Guest state
    area.innerHTML = '<button data-app-action="open-auth-modal" style="padding:6px 14px;border-radius:var(--radius-sm);border:1px solid var(--accent-border);background:var(--accent-muted);color:var(--accent);font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;">Intră în cont</button>';
    // Update sidebar logout button to show login
    var logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.title = 'Intră în cont';
      logoutBtn.onclick = function() { openAuthModal(); };
    }
  } else {
    // Logged-in state
    var roleBadge = '';
    if (user.role === 'admin') {
      roleBadge = '<span style="padding:2px 7px;background:rgba(245,166,35,0.15);border:1px solid rgba(245,166,35,0.3);border-radius:4px;font-size:.65rem;font-weight:700;color:var(--amber);text-transform:uppercase;letter-spacing:.5px;">ADMIN</span>';
    } else if (user.role === 'pro') {
      roleBadge = '<span style="padding:2px 7px;background:var(--green-muted);border:1px solid rgba(16,217,160,0.25);border-radius:4px;font-size:.65rem;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px;">PRO</span>';
    }
    var emailShort = user.email.length > 20 ? user.email.slice(0, 18) + '…' : user.email;
    area.innerHTML = '<div style="display:flex;align-items:center;gap:8px;">'
      + roleBadge
      + '<span style="font-size:.78rem;color:var(--text-secondary);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + user.email + '">' + emailShort + '</span>'
      + '<button data-app-action="handle-logout" style="padding:4px 10px;border-radius:var(--radius-xs);border:1px solid var(--border);background:transparent;color:var(--text-muted);font-size:.75rem;cursor:pointer;font-family:inherit;">Ieși</button>'
      + '</div>';
    // Update sidebar logout button behavior
    var logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.title = 'Delogare';
      logoutBtn.onclick = function() { handleLogout(); };
    }
  }
}

function switchAuthTab(tab) {
  __authTab = tab;
  var isLogin   = tab === 'login';
  var loginBtn  = document.getElementById('authTabLogin');
  var regBtn    = document.getElementById('authTabRegister');
  var submitBtn = document.getElementById('authSubmitBtn');
  if (loginBtn) {
    loginBtn.style.background  = isLogin ? 'var(--accent)' : 'transparent';
    loginBtn.style.color       = isLogin ? '#fff' : 'var(--text-secondary)';
    loginBtn.style.borderColor = isLogin ? 'var(--accent)' : 'var(--border)';
  }
  if (regBtn) {
    regBtn.style.background  = !isLogin ? 'var(--accent)' : 'transparent';
    regBtn.style.color       = !isLogin ? '#fff' : 'var(--text-secondary)';
    regBtn.style.borderColor = !isLogin ? 'var(--accent)' : 'var(--border)';
  }
  if (submitBtn) submitBtn.textContent = isLogin ? 'Intră în cont' : 'Creează cont';
  var errEl = document.getElementById('authError');
  if (errEl) errEl.style.display = 'none';
}

async function submitAuth() {
  var email    = (document.getElementById('authEmail')?.value || '').trim();
  var password = document.getElementById('authPassword')?.value || '';
  var errEl    = document.getElementById('authError');
  if (errEl) errEl.style.display = 'none';
  if (!email || !password) {
    if (errEl) { errEl.textContent = 'Completează email și parolă.'; errEl.style.display = 'block'; }
    return;
  }
  var btn = document.getElementById('authSubmitBtn');
  if (btn) { btn.textContent = 'Se procesează...'; btn.disabled = true; }
  try {
    var endpoint = __authTab === 'login' ? '/api/auth/login' : '/api/auth/register';
    var res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email, password: password })
    });
    var data = await res.json();
    if (!res.ok) {
      if (errEl) { errEl.textContent = data.error || 'Eroare. Încearcă din nou.'; errEl.style.display = 'block'; }
      return;
    }
    window.__shAccessToken = data.accessToken;
    closeAuthModal();
    hideLanding();
    updateAuthUI(data.user);
    // Compatibilitate cu state vechi
    if (window.state) window.state.apiKey = 'backend';
    if (window.saveState) window.saveState();
    // Re-render to reflect logged-in state
    try { renderSidebar(); } catch(e) {}
    try { renderPage(); } catch(e) {}
    // Load daily session after login
    setTimeout(function() {
      try { if (typeof loadTodaySession === 'function') loadTodaySession(); } catch(e) {}
    }, 300);
  } catch (e) {
    if (errEl) { errEl.textContent = 'Eroare de conexiune cu serverul.'; errEl.style.display = 'block'; }
  } finally {
    if (btn) { btn.disabled = false; switchAuthTab(__authTab); }
  }
}

function handleSessionExpired() {
  window.__shAccessToken = null;
  window.__shUser = null;
  updateAuthUI(null);
}

document.addEventListener('keydown', function(e) {
  var modal = document.getElementById('authModal');
  if (e.key === 'Enter' && modal && modal.style.display !== 'none') submitAuth();
  if (e.key === 'Escape') {
    closeAuthModal();
    closeUpgradeModal();
  }
});

// Close modals on backdrop click
document.addEventListener('click', function(e) {
  var authModal = document.getElementById('authModal');
  if (authModal && e.target === authModal) closeAuthModal();
  var upgradeModal = document.getElementById('upgradeModal');
  if (upgradeModal && e.target === upgradeModal) closeUpgradeModal();
});

window.addEventListener('sh:session-expired', handleSessionExpired);

// ── Landing overlay helpers ───────────────────────────────────────
function showLanding() {
  var overlay = document.getElementById('landingOverlay');
  if (overlay) overlay.style.display = 'block';
}

function hideLanding() {
  var overlay = document.getElementById('landingOverlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity .25s';
    setTimeout(function() { overlay.style.display = 'none'; }, 260);
  }
}

function setupLandingButtons() {
  function openRegister() { hideLanding(); openAuthModal(); switchAuthTab('register'); }
  function openLogin()    { hideLanding(); openAuthModal(); switchAuthTab('login'); }

  var ids = ['landingRegisterBtn', 'landingHeroRegisterBtn', 'landingCtaBtn'];
  ids.forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', openRegister);
  });
  var loginBtn = document.getElementById('landingLoginBtn');
  if (loginBtn) loginBtn.addEventListener('click', openLogin);

  var scrollBtn = document.getElementById('landingScrollBtn');
  if (scrollBtn) scrollBtn.addEventListener('click', function() {
    var target = document.getElementById('landingHowItWorks');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
}

// ── On page load: try to restore session via HttpOnly cookie ─────
// If no valid session → show landing page
(async function() {
  try {
    var res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      var data = await res.json();
      window.__shAccessToken = data.accessToken;
      // Fetch full user profile (includes role)
      try {
        var meRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': 'Bearer ' + data.accessToken },
          credentials: 'include'
        });
        if (meRes.ok) {
          var meData = await meRes.json();
          window.__shUser = meData.user;
          updateAuthUI(meData.user);
        }
      } catch(e) {}
      if (window.state) window.state.apiKey = 'backend';
      if (window.saveState) window.saveState();
      // Logged in — go straight to app
      try { unlock(); } catch(e) {}
    } else {
      // No valid session — show landing page
      updateAuthUI(null);
      showLanding();
      setupLandingButtons();
      try { unlock(); } catch(e) {} // unlock app in background (behind landing)
    }
  } catch(e) {
    updateAuthUI(null);
    showLanding();
    setupLandingButtons();
    try { unlock(); } catch(e) {}
  }
})();
