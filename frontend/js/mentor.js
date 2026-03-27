// ─────────────────────────────────────────────────────────────────
// js/mentor.js — AI Mentor chat
//
// Changed from original:
//   REMOVED: fetch('https://api.anthropic.com/v1/messages', ...)
//   REMOVED: x-api-key header
//   REMOVED: anthropic-dangerous-direct-browser-access header
//   ADDED:   api.chat() → POST /api/ai/chat (backend proxy)
//   ADDED:   setHTML() from render.js instead of raw innerHTML
//   FIX:     destructuring { response } → acum acceptă { content } sau { response }
// ─────────────────────────────────────────────────────────────────
'use strict';

import { api }               from './api.js';
import { setHTML, showToast } from './render.js';

let mentorHistory = [];  // In-memory conversation history

export function initMentor() {
  window.renderMentor = renderMentorPage;
}

function renderMentorPage(el) {
  el.innerHTML = `
    <div class="anim mentor-layout">
      <div class="mentor-chat">
        <div class="mentor-chat-header">
          <div class="mentor-avatar">🤖</div>
          <div>
            <div style="font-weight:700;">AI Mentor</div>
            <div class="mentor-status">Ready to help</div>
          </div>
          <button onclick="window.clearMentor()" style="margin-left:auto;padding:5px 10px;border-radius:var(--radius-xs);border:1px solid var(--border);background:var(--bg-surface);color:var(--text-muted);font-size:.72rem;cursor:pointer;">Clear</button>
        </div>
        <div class="mentor-messages" id="mentorMessages"></div>
        <div class="mentor-input-area">
          <textarea class="mentor-input" id="mentorInput" rows="1"
            placeholder="Ask anything about your subject..."
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.sendMentor()}"></textarea>
          <button class="mentor-send-btn" id="mentorSendBtn" onclick="window.sendMentor()">Send</button>
        </div>
      </div>
    </div>`;

  // Render existing history
  renderHistory();

  window.sendMentor  = sendMessage;
  window.clearMentor = clearHistory;
}

function renderHistory() {
  const container = document.getElementById('mentorMessages');
  if (!container) return;
  container.innerHTML = '';

  if (!mentorHistory.length) {
    const welcome = document.createElement('div');
    welcome.className = 'mentor-msg ai';
    const sender = document.createElement('div');
    sender.className = 'msg-sender';
    sender.textContent = 'AI Mentor';
    const body = document.createElement('p');
    body.textContent = 'Hello! I\'m your AI study mentor. Ask me anything about your course material.';
    welcome.append(sender, body);
    container.appendChild(welcome);
    return;
  }

  mentorHistory.forEach(msg => appendMessage(msg.role, msg.content, false));
}

function appendMessage(role, content, scroll = true) {
  const container = document.getElementById('mentorMessages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `mentor-msg ${role === 'assistant' ? 'ai' : 'user'}`;

  if (role === 'assistant') {
    const sender = document.createElement('div');
    sender.className = 'msg-sender';
    sender.textContent = 'AI Mentor';
    div.appendChild(sender);

    // AI content can contain formatting — use safeHTML via setHTML
    const body = document.createElement('div');
    setHTML(body, content);  // ← DOMPurify applied here
    div.appendChild(body);
  } else {
    // User content — always textContent, never innerHTML
    div.textContent = content;
  }

  container.appendChild(div);
  if (scroll) container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input   = document.getElementById('mentorInput');
  const sendBtn = document.getElementById('mentorSendBtn');
  const text    = input?.value.trim();
  if (!text) return;

  input.value = '';
  if (sendBtn) sendBtn.disabled = true;

  // Add user message to history and UI
  mentorHistory.push({ role: 'user', content: text });
  appendMessage('user', text);

  // Typing indicator
  const indicator = document.createElement('div');
  indicator.className = 'mentor-msg ai';
  indicator.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  document.getElementById('mentorMessages')?.appendChild(indicator);

  try {
    // POST to backend — backend calls Anthropic and returns the response
    // FIX: backend returnează { content, response } — acceptăm ambele
    const data = await api.chat(text, 'General', null, mentorHistory.slice(-20));
    const response = data.content || data.response || '';

    indicator.remove();
    mentorHistory.push({ role: 'assistant', content: response });
    appendMessage('assistant', response);
  } catch (err) {
    indicator.remove();
    showToast('AI Mentor error', err.message, 'error');
  }

  if (sendBtn) sendBtn.disabled = false;
  input?.focus();
}

function clearHistory() {
  mentorHistory = [];
  renderHistory();
}
