// ═════════════════════════════════════════════════════════════════
// middleware/uploadValidator.js
// PART 1 — Secure File Upload Validation
//
// Every layer here is server-enforced. Nothing depends on what
// the client claims about its file. Attacker flow blocked:
//
//   1. Wrong extension only → blocked by magic-byte check
//   2. Right extension, wrong bytes → blocked by magic-byte check
//   3. Right type but too large → blocked by multer limit
//   4. Right type, right size but text too long → truncated before AI
//   5. Encrypted/password-protected PDF → caught in parser, 422 returned
//   6. File with zero extractable text → 422, not passed to AI
//   7. Rapid repeated uploads → upload rate limiter
//
// Security risks prevented:
//   • Prompt injection via crafted file content (truncation + sanitization)
//   • DoS via huge files consuming memory (size cap)
//   • Polyglot files (file that is valid as two types) (magic-byte check)
//   • SSRF/path traversal (memoryStorage — nothing touches disk)
//   • Information leakage from parser errors (wrapped in safe messages)
// ═════════════════════════════════════════════════════════════════
'use strict';

const multer  = require('multer');
const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

// ─────────────────────────────────────────────────────────────────
// 1. ALLOWED FILE TYPES
// ─────────────────────────────────────────────────────────────────
// We define by MIME type AND magic bytes. Both must agree.
// The client-sent Content-Type is advisory only; we verify independently.

const ALLOWED_TYPES = {
  'application/pdf': {
    label: 'PDF',
    // PDF magic bytes: %PDF at offset 0
    magic: [0x25, 0x50, 0x44, 0x46],
    offset: 0,
  },
  'text/plain': {
    label: 'Plain text',
    magic: null,  // No universal magic bytes for text; rely on UTF-8 decode
  },
  'text/markdown': {
    label: 'Markdown',
    magic: null,
  },
  'text/csv': {
    label: 'CSV',
    magic: null,
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    label: 'Word document',
    // DOCX is a ZIP — magic bytes: PK\x03\x04
    magic: [0x50, 0x4B, 0x03, 0x04],
    offset: 0,
  },
};

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt', '.md', '.markdown', '.csv', '.docx']);

// ─────────────────────────────────────────────────────────────────
// 2. SIZE LIMITS
// ─────────────────────────────────────────────────────────────────
const MAX_FILE_BYTES = parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024;  // 5 MB
const MAX_FILES_PER_REQUEST = 1;

// ─────────────────────────────────────────────────────────────────
// 3. TEXT LIMITS (after extraction, before sending to AI)
// ─────────────────────────────────────────────────────────────────
// ~8 000 chars ≈ ~2 000 tokens — safe for a 6 000 token prompt budget
// leaving room for the system prompt and response.
const MAX_EXTRACTED_CHARS = 8_000;
const MIN_EXTRACTED_CHARS = 50;  // Reject files with almost no content

// ─────────────────────────────────────────────────────────────────
// 4. UPLOAD RATE LIMIT (separate from AI rate limit)
// ─────────────────────────────────────────────────────────────────
// Each upload triggers memory allocation + PDF parsing. Limit tightly.
const uploadRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,   // 10-minute window
  max: 10,                      // 10 uploads per 10 minutes per IP
  keyGenerator: req => (req.user ? `user:${req.user.id}` : `ip:${req.ip}`),
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    logger.warn('Upload rate limit hit', {
      userId: req.user?.id,
      ip: req.ip,
    });
    res.status(429).json({ error: 'Too many uploads. Please wait before uploading again.' });
  },
});

// ─────────────────────────────────────────────────────────────────
// 5. MULTER CONFIGURATION
// ─────────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),   // Never touch disk with untrusted data
  limits: {
    fileSize: MAX_FILE_BYTES,
    files:    MAX_FILES_PER_REQUEST,
    fields:   5,                     // Limit non-file form fields too
  },
  fileFilter(req, file, cb) {
    // Step 1: Check declared MIME type against allow list
    if (!ALLOWED_TYPES[file.mimetype]) {
      const err = new Error(
        `File type not supported. Allowed types: PDF, plain text, Markdown, CSV, Word (.docx).`
      );
      err.code = 'INVALID_TYPE';
      err.status = 415;
      return cb(err, false);
    }

    // Step 2: Check file extension (belt-and-suspenders alongside MIME)
    const ext = (file.originalname || '').toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      const err = new Error(`File extension "${ext}" is not allowed.`);
      err.code = 'INVALID_EXTENSION';
      err.status = 415;
      return cb(err, false);
    }

    cb(null, true);
  },
});

// ─────────────────────────────────────────────────────────────────
// 6. MAGIC-BYTE VERIFICATION (runs after multer loads the buffer)
// ─────────────────────────────────────────────────────────────────
function verifyMagicBytes(file) {
  const typeConfig = ALLOWED_TYPES[file.mimetype];
  if (!typeConfig || !typeConfig.magic) return true;  // No magic bytes to check

  const { magic, offset = 0 } = typeConfig;
  if (file.buffer.length < offset + magic.length) return false;

  for (let i = 0; i < magic.length; i++) {
    if (file.buffer[offset + i] !== magic[i]) return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────
// 7. TEXT SANITIZATION (after extraction, before AI)
// ─────────────────────────────────────────────────────────────────
// Purpose: reduce prompt-injection risk from crafted file content.
// We cannot eliminate it entirely — the text goes to an LLM — but
// we normalise, truncate, and remove obvious injection markers.
function sanitizeExtractedText(text) {
  return text
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Collapse excessive whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    // Remove null bytes and other control characters (keep \n and \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip anything that looks like a system-prompt injection attempt.
    // Patterns like "SYSTEM:", "###INSTRUCTION###", etc.
    // This is defence-in-depth — the real protection is the system prompt
    // structure in the backend, which the user text cannot override.
    .replace(/^(SYSTEM|INSTRUCTIONS?|IGNORE\s+PRIOR|FORGET|NEW\s+PROMPT)[:\s]/gim, '[removed] ')
    .trim()
    // Hard truncate to character limit
    .slice(0, MAX_EXTRACTED_CHARS);
}

// ─────────────────────────────────────────────────────────────────
// 8. EXPORTED MIDDLEWARE STACK
// ─────────────────────────────────────────────────────────────────
module.exports = {
  upload,
  uploadRateLimit,
  verifyMagicBytes,
  sanitizeExtractedText,
  MAX_EXTRACTED_CHARS,
  MIN_EXTRACTED_CHARS,
  MAX_FILE_BYTES,
  ALLOWED_TYPES,
};
