'use strict';
// ═════════════════════════════════════════════════════════════════
// routes/upload.js — File upload endpoint
//
// Security improvements vs previous version:
//   + Uses uploadValidator.js instead of its own multer config
//   + uploadRateLimit applied (was missing)
//   + verifyMagicBytes() called after multer (polyglot file detection)
//   + sanitizeExtractedText() applied before returning to frontend
//   + MIN/MAX_EXTRACTED_CHARS enforced
//   + authenticate before uploadRateLimit (rate limit keyed to user ID)
//   + Removed: overly permissive nameOk bypass (extension-only check)
//   + text truncated to MAX_EXTRACTED_CHARS (was 50_000, now 8_000)
// ═════════════════════════════════════════════════════════════════
'use strict';

const router       = require('express').Router();
const pdfParse     = require('pdf-parse');
const mammoth      = require('mammoth');
const authenticate = require('../middleware/authenticate');
const {
  upload,
  uploadRateLimit,
  verifyMagicBytes,
  sanitizeExtractedText,
  MAX_EXTRACTED_CHARS,
  MIN_EXTRACTED_CHARS,
} = require('../middleware/uploadValidator');
const { logger } = require('../utils/logger');

// Auth first → rate limit keyed to user ID → multer
router.post('/',
  authenticate,
  uploadRateLimit,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

      const { buffer, mimetype, originalname, size } = req.file;

      // ── Magic byte verification ──────────────────────────────────
      if (!verifyMagicBytes(req.file)) {
        logger.warn('Upload: magic byte mismatch', {
          userId:    req.user.id,
          mimetype,
          filename:  originalname,
        });
        return res.status(415).json({
          error: 'File content does not match its declared type. Upload rejected.',
        });
      }

      // ── Text extraction ──────────────────────────────────────────
      let rawText = '';

      if (mimetype === 'application/pdf') {
        const parsed = await pdfParse(buffer);
        rawText = parsed.text || '';

      } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value || '';

      } else {
        // Plain text / markdown / CSV — decode as UTF-8
        rawText = buffer.toString('utf8');
      }

      // ── Sanitize + truncate ──────────────────────────────────────
      const text = sanitizeExtractedText(rawText);

      if (text.length < MIN_EXTRACTED_CHARS) {
        return res.status(422).json({
          error: 'The file contains too little readable text. Please upload a text-based document.',
        });
      }

      logger.info('Upload success', {
        userId:   req.user.id,
        filename: originalname,
        size,
        extractedChars: text.length,
        truncated: rawText.length > MAX_EXTRACTED_CHARS,
      });

      res.json({
        text,
        filename: originalname,
        size,
        extractedChars: text.length,
      });
    } catch (e) {
      // Wrap multer / parser errors with safe messages
      if (e.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum allowed size is 5MB.' });
      }
      if (e.code === 'INVALID_TYPE' || e.code === 'INVALID_EXTENSION') {
        return res.status(415).json({ error: e.message });
      }
      next(e);
    }
  }
);

module.exports = router;
