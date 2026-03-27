// ─────────────────────────────────────────────────────────────────
// js/upload.js — File upload widget
//
// Changed from original:
//   REMOVED: FileReader reading files client-side and passing to AI
//   REMOVED: local file processing without server validation
//   ADDED:   POST /api/upload (server validates MIME + size, returns text)
//   KEPT:    drag-and-drop UX
//
// The file goes to our server. The server validates it (MIME type,
// size limit) and extracts plain text. We receive text and use it.
// No binary file content is processed in the browser.
// ─────────────────────────────────────────────────────────────────
'use strict';

import { api }       from './api.js';
import { showToast } from './render.js';

export function initUpload() {
  window.mountUpload = mountUploadWidget;
}

/**
 * Mount the upload widget into a given container element.
 * Can be used in the settings page or within any feature.
 *
 * @param {HTMLElement} container
 * @param {function}    onTextReady  - Called with extracted text when upload succeeds
 */
export function mountUploadWidget(container, onTextReady) {
  if (!container) return;

  // Build using DOM API — no innerHTML with user data
  const zone = document.createElement('div');
  zone.className = 'summary-upload-zone';
  zone.style.cssText = 'position:relative;cursor:pointer;';

  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = '.pdf,.txt,.md,.csv,.docx';
  input.style.cssText = 'position:absolute;inset:0;opacity:0;cursor:pointer;';

  const iconDiv = document.createElement('div');
  iconDiv.style.cssText = 'display:flex;justify-content:center;margin-bottom:8px;font-size:2rem;';
  iconDiv.textContent = '📤';

  const label = document.createElement('div');
  label.className = 'su-text';
  label.textContent = 'Drag a file here or click to choose';

  const hint = document.createElement('div');
  hint.className = 'su-hint';
  hint.textContent = 'PDF, TXT, DOCX, MD, CSV — max 5 MB';

  zone.append(input, iconDiv, label, hint);

  const statusEl = document.createElement('div');
  statusEl.style.cssText = 'margin-top:10px;font-size:.82rem;color:var(--text-muted);min-height:20px;';

  container.innerHTML = '';
  container.append(zone, statusEl);

  // Handle file selection
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) handleFile(file, statusEl, label, onTextReady);
  });

  // Drag-and-drop
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.style.borderColor = '';
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file, statusEl, label, onTextReady);
  });
}

async function handleFile(file, statusEl, label, onTextReady) {
  // Basic client-side size check before uploading (UX only — server enforces the real limit)
  const MAX_MB = 5;
  if (file.size > MAX_MB * 1024 * 1024) {
    statusEl.textContent = `File too large. Maximum size is ${MAX_MB} MB.`;
    return;
  }

  // Show the filename safely (textContent, never innerHTML)
  label.textContent = `📎 ${file.name}`;
  statusEl.textContent = 'Uploading and extracting text…';

  try {
    // The server validates MIME type, enforces size limit, and extracts text
    const { text, chars } = await api.uploadFile(file);

    statusEl.textContent = `✓ Extracted ${chars.toLocaleString()} characters`;

    if (onTextReady) {
      onTextReady(text, file.name);
    } else {
      // Default: copy to whichever textarea is currently focused / visible
      const textareas = ['quizContext', 'fcContext', 'mentorContext', 'summaryInput'];
      const target = textareas.map(id => document.getElementById(id)).find(Boolean);
      if (target) {
        target.value = text;
        showToast('File uploaded', `Text ready in the input below`, 'success');
      } else {
        showToast('File extracted', `${chars.toLocaleString()} characters ready to use`, 'success');
      }
    }
  } catch (err) {
    statusEl.textContent = '';
    showToast('Upload failed', err.message, 'error');
    label.textContent = 'Drag a file here or click to choose';
  }
}
