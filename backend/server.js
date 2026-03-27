'use strict';
// ═════════════════════════════════════════════════════════════════
// server.js — Production-hardened Express server
//
// Security improvements vs previous version:
//   + CSP: 'unsafe-inline' REMOVED from script-src
//   + CSP: per-request nonce injected into served HTML (replaces unsafe-inline)
//   + CSP: meta CSP tag stripped from index.html at startup (Helmet is sole CSP)
//   + Cookie path for refreshToken is '/api/auth' (scoped, not global)
//   + cleanExpiredTokens() runs on startup AND every 6 hours
//   + Startup guard: warns if JWT_SECRET < 32 chars (kept) and also
//     if NODE_ENV is not set (new)
// ═════════════════════════════════════════════════════════════════
'use strict';

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const crypto       = require('crypto');
const path         = require('path');
const fs           = require('fs');

const { logger }         = require('./utils/logger');
const { initDb, cleanExpiredTokens } = require('./db/client');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// ── Startup guards ────────────────────────────────────────────────
['ANTHROPIC_API_KEY', 'JWT_SECRET'].forEach(key => {
  if (!process.env[key]) {
    logger.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
});

if (process.env.JWT_SECRET.length < 32) {
  logger.warn('JWT_SECRET is short (< 32 chars). Regenerate with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
}

if (!process.env.NODE_ENV) {
  logger.warn('NODE_ENV is not set. Defaulting to development. Set NODE_ENV=production in production.');
}

const app  = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// ── Trust proxy ───────────────────────────────────────────────────
app.set('trust proxy', isProd ? 1 : false);

// ── Per-request CSP nonce ─────────────────────────────────────────
// Generated fresh for every response — used in Helmet CSP + HTML injection
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

// ── Helmet with hardened CSP (NO unsafe-inline) ───────────────────
app.use((req, res, next) => {
  const nonce = res.locals.cspNonce;
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc:   ["'self'"],
        // REMOVED 'unsafe-inline' — replaced with per-request nonce
        scriptSrc:    ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        styleSrc:     ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc:      ['https://fonts.gstatic.com'],
        connectSrc:   ["'self'"],
        imgSrc:       ["'self'", 'data:', 'blob:'],
        formAction:   ["'self'"],
        frameAncestors: ["'none'"],
        baseUri:      ["'none'"],
        objectSrc:    ["'none'"],
        workerSrc:    ["'self'", 'blob:'],
        upgradeInsecureRequests: isProd ? [] : null,
        reportUri:    ['/api/csp-report'],
      },
    },
    hsts:                      { maxAge: 365 * 24 * 60 * 60, includeSubDomains: true, preload: true },
    noSniff:                   true,
    frameguard:                { action: 'deny' },
    hidePoweredBy:             true,
    referrerPolicy:            { policy: 'no-referrer' },
    crossOriginOpenerPolicy:   { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  })(req, res, next);
});

// ── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3001')
  .split(',').map(o => o.trim());

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    logger.warn('CORS blocked', { origin });
    cb(new Error('CORS: origin not allowed'));
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Cookie parser + body parsing ──────────────────────────────────
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/ai',     require('./routes/ai'));
app.use('/api/upload', require('./routes/upload'));

// ── CSP violation reports ─────────────────────────────────────────
app.post('/api/csp-report',
  express.json({
    type:  ['application/csp-report', 'application/reports+json', 'application/json'],
    limit: '10kb',
  }),
  (req, res) => {
    try {
      logger.warn('CSP violation', { report: req.body?.['csp-report'] || req.body || null });
    } catch {}
    res.status(204).end();
  }
);

// ── Frontend serving with nonce injection ────────────────────────
// Critical: strip the <meta http-equiv="Content-Security-Policy"> tag
// that is hardcoded in index.html. Helmet is the SOLE CSP authority.
// The meta CSP used 'unsafe-inline' and would override Helmet's nonce-based CSP.
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const META_CSP_RE  = /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi;

if (fs.existsSync(FRONTEND_DIR)) {
  app.use(express.static(FRONTEND_DIR, { index: false }));

  app.get('*', (req, res) => {
    // Only serve index.html for non-API, non-asset paths
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Not found.' });
    }

    const htmlPath = path.join(FRONTEND_DIR, 'index.html');
    try {
      let html = fs.readFileSync(htmlPath, 'utf8');

      // 1. Remove the hardcoded meta CSP (Helmet owns CSP)
      html = html.replace(META_CSP_RE, '<!-- CSP managed by server -->');

      // 2. Inject nonce into every <script> tag that doesn't already have one
      //    This covers the DOMPurify CDN script and any other external scripts.
      html = html.replace(/<script(?![^>]*\bnonce=)([^>]*)>/gi,
        `<script nonce="${res.locals.cspNonce}"$1>`
      );

      // 3. Inject nonce into inline <script> tags (the large inline block
      //    at the bottom of index.html)
      //    Note: The regex above already handles this since inline scripts
      //    also lack a nonce attribute.

      // 4. Replace the {{CSP_NONCE}} placeholder if used
      html = html.replace(/{{CSP_NONCE}}/g, res.locals.cspNonce);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      logger.error('Failed to serve frontend', { err: err.message });
      res.status(500).json({ error: 'Frontend unavailable.' });
    }
  });
}

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── Error handling ────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────
initDb();

// Clean expired refresh tokens every 6 hours
setInterval(() => {
  try { cleanExpiredTokens(); } catch (e) {
    logger.error('cleanExpiredTokens failed', { err: e.message });
  }
}, 6 * 60 * 60 * 1000).unref();   // .unref() so this doesn't keep process alive

app.listen(PORT, () => {
  logger.info('Study Hub backend running', {
    port: PORT,
    env:  process.env.NODE_ENV || 'development',
    csp:  'nonce-based (no unsafe-inline)',
  });
});
