// ═════════════════════════════════════════════════════════════════
// js/auth.js — Authentication UI with in-memory token
//
// Closes RM-4: no sessionStorage/localStorage for auth tokens.
// Access token is only in api.js memory.
// Refresh token is in an HttpOnly cookie managed by the server.
// ═════════════════════════════════════════════════════════════════
'use strict';

import { api, clearAccessToken } from './api.js';

let _currentUser = null;

export function getUser()    { return _currentUser; }
export function isLoggedIn() { return !!_currentUser; }

// ─────────────────────────────────────────────────────────────────
// Session initialisation on page load
// ─────────────────────────────────────────────────────────────────
// On page load, the access token is gone (in-memory). We call /api/auth/me
// which triggers a 401 → automatic refresh via the HttpOnly cookie →
// new access token → /me succeeds. If the refresh cookie is also expired,
// the user sees the login screen.
export async function initAuth(onAuthenticated, onUnauthenticated) {
  try {
    const { user } = await api.me();
    _currentUser = user;
    window._currentUser = user;  // Expose for settings page rendering
    onAuthenticated(user);
  } catch {
    // me() failed and refresh also failed — session is fully expired
    onUnauthenticated();
  }
}

// ─────────────────────────────────────────────────────────────────
// Session expiry (triggered by api.js when refresh fails)
// ─────────────────────────────────────────────────────────────────
window.addEventListener('sh:session-expired', () => {
  _currentUser = null;
  window._currentUser = null;
  showAuthScreen();
});

// ─────────────────────────────────────────────────────────────────
// Auth form handlers
// ─────────────────────────────────────────────────────────────────
export async function handleLogin(email, password, onSuccess) {
  _clearAuthError();
  try {
    const { user } = await api.login(email, password);
    _currentUser = user;
    window._currentUser = user;
    onSuccess(user);
  } catch (err) {
    _showAuthError(err.message);
  }
}

export async function handleRegister(email, password, onSuccess) {
  _clearAuthError();
  if (password.length < 8) {
    return _showAuthError('Password must be at least 8 characters.');
  }
  try {
    const { user } = await api.register(email, password);
    _currentUser = user;
    window._currentUser = user;
    onSuccess(user);
  } catch (err) {
    _showAuthError(err.message);
  }
}

export async function handleLogout() {
  await api.logout();
  _currentUser = null;
  window._currentUser = null;
  showAuthScreen();
}

// ─────────────────────────────────────────────────────────────────
// Screen visibility
// ─────────────────────────────────────────────────────────────────
export function showAuthScreen() {
  document.getElementById('authScreen')?.style.setProperty('display', 'flex');
  document.getElementById('app')?.style.setProperty('display', 'none');
}

export function hideAuthScreen() {
  document.getElementById('authScreen')?.style.setProperty('display', 'none');
  document.getElementById('app')?.style.setProperty('display', 'flex');
}

// ─────────────────────────────────────────────────────────────────
// Auth screen HTML (DOM API — no innerHTML with user data)
// ─────────────────────────────────────────────────────────────────
export function renderAuthScreen() {
  const wrap = document.createElement('div');
  wrap.id = 'authScreen';
  wrap.setAttribute('role', 'main');
  wrap.style.cssText = 'display:none;align-items:center;justify-content:center;min-height:100vh;background:var(--bg-base);';

  const box = document.createElement('div');
  box.style.cssText = 'width:100%;max-width:380px;background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);padding:36px 32px;';

  const title = document.createElement('h1');
  title.style.cssText = 'font-size:1.5rem;font-weight:800;margin-bottom:6px;font-family:var(--font-display);';
  title.textContent = 'Study Hub';

  const sub = document.createElement('p');
  sub.style.cssText = 'color:var(--text-secondary);font-size:.88rem;margin-bottom:24px;';
  sub.textContent = 'Sign in or create a free account';

  // Tabs
  const tabs = document.createElement('div');
  tabs.style.cssText = 'display:flex;gap:4px;background:var(--bg-surface);border-radius:var(--radius-sm);padding:4px;margin-bottom:20px;';

  const loginTab = _makeTabBtn('Sign in', true);
  const regTab   = _makeTabBtn('Register', false);
  tabs.append(loginTab, regTab);

  // Forms
  const loginForm = _makeForm('login');
  const regForm   = _makeForm('register');
  regForm.style.display = 'none';

  // Error container
  const errEl = document.createElement('div');
  errEl.id = 'authError';
  errEl.setAttribute('role', 'alert');
  errEl.style.cssText = 'display:none;color:var(--red);font-size:.82rem;margin-top:12px;padding:8px 12px;background:var(--red-muted);border-radius:var(--radius-xs);';

  // Tab switching
  loginTab.addEventListener('click', () => {
    loginTab.style.background = 'var(--bg-overlay)';
    regTab.style.background   = 'transparent';
    loginForm.style.display   = 'flex';
    regForm.style.display     = 'none';
    _clearAuthError();
  });
  regTab.addEventListener('click', () => {
    regTab.style.background   = 'var(--bg-overlay)';
    loginTab.style.background = 'transparent';
    regForm.style.display     = 'flex';
    loginForm.style.display   = 'none';
    _clearAuthError();
  });

  box.append(title, sub, tabs, loginForm, regForm, errEl);
  wrap.appendChild(box);
  return wrap;
}

function _makeTabBtn(label, active) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = `flex:1;padding:7px;border:none;border-radius:var(--radius-xs);font-size:.88rem;font-weight:600;cursor:pointer;background:${active ? 'var(--bg-overlay)' : 'transparent'};color:var(--text-primary);`;
  return btn;
}

function _makeForm(mode) {
  const form = document.createElement('div');
  form.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

  const emailInput = _makeInput('email', 'Email address', 'email', 'email');
  const passInput  = _makeInput('password', mode === 'login' ? 'Password' : 'Password (min 8 characters)', 'password', 'current-password');

  const btn = document.createElement('button');
  btn.textContent = mode === 'login' ? 'Sign in' : 'Create account';
  btn.style.cssText = 'padding:12px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);font-weight:700;cursor:pointer;font-size:.95rem;margin-top:4px;';

  const setLoading = (loading) => {
    btn.disabled    = loading;
    btn.textContent = loading ? 'Please wait…' : (mode === 'login' ? 'Sign in' : 'Create account');
  };

  btn.addEventListener('click', () => {
    const email    = emailInput.value.trim();
    const password = passInput.value;
    if (!email || !password) return _showAuthError('Please fill in both fields.');

    setLoading(true);
    const onSuccess = () => { setLoading(false); hideAuthScreen(); window.dispatchEvent(new CustomEvent('sh:authenticated')); };
    const restoreOnError = () => setLoading(false);

    if (mode === 'login') {
      handleLogin(email, password, onSuccess).catch(restoreOnError);
    } else {
      handleRegister(email, password, onSuccess).catch(restoreOnError);
    }
  });

  [emailInput, passInput].forEach(inp => {
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
  });

  form.append(emailInput, passInput, btn);
  return form;
}

function _makeInput(name, placeholder, type, autocomplete) {
  const inp = document.createElement('input');
  inp.name         = name;
  inp.type         = type;
  inp.placeholder  = placeholder;
  inp.autocomplete = autocomplete;
  inp.style.cssText = 'padding:11px 14px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:.92rem;width:100%;';
  return inp;
}

function _showAuthError(msg) {
  const el = document.getElementById('authError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function _clearAuthError() {
  const el = document.getElementById('authError');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}
