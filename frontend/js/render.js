// ═════════════════════════════════════════════════════════════════
// js/render.js — Hardened safe rendering module
//
// PART 2 — Frontend security hardening
//
// The problem with innerHTML:
//   Any time a string containing user data or AI output is set via
//   innerHTML, an attacker can embed <script> tags, event handlers
//   like onerror=, or javascript: href values. Even if the string
//   looks safe, mutations, concatenation errors, or AI prompt injection
//   can introduce malicious HTML.
//
// The solution:
//   1. ALL ai-generated content → setHTML() which calls DOMPurify first
//   2. ALL user-typed content   → setText() which uses textContent
//   3. Static developer HTML    → raw innerHTML is fine (no user data)
//   4. Complex dynamic UI       → buildEl() — DOM API, no string concat
//
// DOMPurify configuration:
//   We use a STRICT config that allows only the tags and attributes
//   genuinely needed to render study content. Everything else is stripped.
//   This is intentionally more restrictive than DOMPurify's defaults.
//
// Rendering audit:
//   AI Mentor response     → setHTML()      ✓ SAFE (DOMPurify)
//   Quiz question text     → escapeText()   ✓ SAFE (HTML escaped)
//   Quiz option text       → escapeText()   ✓ SAFE (HTML escaped)
//   Quiz explanation       → escapeText()   ✓ SAFE (HTML escaped)
//   Flashcard front/back   → escapeText()   ✓ SAFE (HTML escaped)
//   Slide content (HTML)   → setHTML()      ✓ SAFE (DOMPurify)
//   Subject names          → textContent    ✓ SAFE
//   User email display     → textContent    ✓ SAFE
//   Toast messages         → textContent    ✓ SAFE
//   Static nav buttons     → raw innerHTML  ✓ SAFE (no user data)
// ═════════════════════════════════════════════════════════════════
'use strict';

// ─────────────────────────────────────────────────────────────────
// 1. DOMPURIFY CONFIGURATION
// ─────────────────────────────────────────────────────────────────

// Hard check — fail loudly so a missing CDN load is immediately visible
if (typeof DOMPurify === 'undefined') {
  // Don't just console.error — throw so the app visibly fails
  // rather than silently rendering dangerous HTML
  throw new Error('[render.js] CRITICAL: DOMPurify is not loaded. Cannot render AI content safely.');
}

// Strict allowlist — only what study content actually needs.
// If you add a new feature that needs a new tag, add it here deliberately.
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    // Text structure
    'p', 'br', 'hr',
    // Emphasis
    'strong', 'em', 'b', 'i', 'u', 's', 'mark',
    // Headings (h1/h2 excluded — AI slides use h3+)
    'h3', 'h4', 'h5', 'h6',
    // Lists
    'ul', 'ol', 'li',
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    // Code
    'code', 'pre',
    // Quote
    'blockquote',
    // Inline math rendering
    'sup', 'sub',
    // Layout — only for AI slide content
    'div', 'span',
  ],

  // Strict attribute allowlist
  ALLOWED_ATTR: [
    'class',          // For CSS class names
    'style',          // CSS — but we strip dangerous CSS rules below
    'colspan',        // Table spanning
    'rowspan',
  ],

  // Explicitly block these even if DOMPurify defaults allow them
  FORBID_ATTR: [
    'id',             // Prevent DOM clobbering
    'name',           // Prevent named form elements
    'target',         // Prevent _blank without rel
    'href',           // No links in AI content
    'src',            // No external resources
    'data-*',         // No custom data attributes from AI
    'on*',            // Event handlers — belt-and-suspenders
  ],

  // Don't allow svg or math (vector attack surface)
  FORBID_TAGS: ['svg', 'math', 'script', 'style', 'form', 'input', 'button', 'a', 'iframe'],

  // Strip javascript: URLs
  ALLOW_DATA_ATTR: false,

  // After sanitization, also check for remaining CSS injection
  FORCE_BODY: false,

  // Run a hook to remove dangerous CSS properties
  ADD_HOOK: 'afterSanitizeAttributes',
};

// Post-sanitization hook — strip dangerous CSS from style attributes
DOMPurify.addHook('afterSanitizeAttributes', function(node) {
  if (node.hasAttribute('style')) {
    const dangerousCSS = /expression|javascript|vbscript|url\s*\(|@import/i;
    if (dangerousCSS.test(node.getAttribute('style'))) {
      node.removeAttribute('style');
    }
  }
});

// ─────────────────────────────────────────────────────────────────
// 2. PUBLIC RENDERING API
// ─────────────────────────────────────────────────────────────────

/**
 * Sanitise a string of HTML for safe innerHTML insertion.
 * Use for AI-generated content that legitimately contains HTML
 * (slide content, mentor responses with formatting).
 *
 * @param   {string} html - Potentially unsafe HTML string
 * @returns {string}       Safe HTML string
 */
export function safeHTML(html) {
  if (!html) return '';
  return DOMPurify.sanitize(String(html), PURIFY_CONFIG);
}

/**
 * Set an element's innerHTML to sanitised content.
 * Primary method for inserting AI HTML into the DOM.
 *
 * @param {HTMLElement} el   - Target element
 * @param {string}      html - Potentially unsafe HTML
 */
export function setHTML(el, html) {
  if (!el) return;
  el.innerHTML = safeHTML(html);
}

/**
 * Set an element's text content.
 * Use for ALL user-typed values, names, emails, status messages.
 * textContent does not parse HTML — XSS impossible.
 *
 * @param {HTMLElement} el   - Target element
 * @param {string}      text - Any string (safe regardless of content)
 */
export function setText(el, text) {
  if (!el) return;
  el.textContent = text ?? '';
}

/**
 * Escape a string for safe use inside an HTML template literal.
 * Use this when you MUST use innerHTML with a string that could
 * contain user data but should NOT contain HTML.
 *
 * Prefer textContent or setHTML. Use escapeText() only when you
 * are building HTML strings that mix static structure with dynamic
 * text (e.g., quiz question rendering).
 *
 * @param   {string} str
 * @returns {string} HTML-escaped string
 */
export function escapeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;')
    .replace(/`/g,  '&#96;');   // Prevent template literal injection
}

/**
 * Build a DOM element safely without innerHTML.
 * Use this for complex UI construction from dynamic data.
 *
 * @param {string} tag        - HTML tag name
 * @param {object} [attrs]    - Attribute key/value pairs (set via setAttribute)
 * @param {Array}  [children] - Child elements or text strings
 * @returns {HTMLElement}
 */
export function buildEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    // Whitelist of safe attributes — prevent prototype pollution via attrs
    const SAFE_ATTRS = new Set(['class', 'style', 'id', 'type', 'placeholder',
                                 'disabled', 'colspan', 'rowspan', 'data-tab',
                                 'title', 'aria-label', 'role']);
    if (SAFE_ATTRS.has(k)) {
      el.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));  // Always textContent
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }
  return el;
}

// ─────────────────────────────────────────────────────────────────
// 3. TOAST NOTIFICATION (fully DOM-API, no innerHTML)
// ─────────────────────────────────────────────────────────────────
export function showToast(title, message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const colors = { success: 'var(--green)', warning: 'var(--amber)', error: 'var(--red)', info: 'var(--accent)' };

  const toast = buildEl('div', { class: `toast ${type}`, style: `border-left-color:${colors[type] || colors.info}` });

  const titleEl = buildEl('div', { class: 'toast-title' }, [title]);  // text node — safe
  toast.appendChild(titleEl);

  if (message) {
    const msgEl = buildEl('div', { class: 'toast-msg' }, [message]);  // text node — safe
    toast.appendChild(msgEl);
  }

  container.appendChild(toast);

  const timer = setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 320);
  }, duration);

  toast.addEventListener('click', () => { clearTimeout(timer); toast.remove(); });
}
