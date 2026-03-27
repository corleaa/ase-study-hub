# ASE Study Hub — AI-Powered Exam Preparation

A full-stack web application for ASE București students. Generate AI-powered quizzes, flashcards with spaced repetition, and chat with an AI mentor — all from your own course material.

---

## Architecture

```
study-hub/
├── backend/          Node.js + Express API server
│   ├── routes/       /api/auth, /api/ai, /api/upload
│   ├── middleware/   Auth, validation, rate limiting, upload security
│   ├── db/           SQLite via better-sqlite3
│   └── utils/        Logger, audit logger
├── frontend/         Vanilla JS single-page app
│   ├── index.html    Main app (styles + markup)
│   └── js/           ES modules: auth, api, quiz, flashcards, mentor...
├── init-db.js        Database initializer (run once)
├── .env.example      Environment variable template
└── package.json      Root convenience scripts
```

The backend proxies all Anthropic API calls — the API key never reaches the browser. The frontend communicates only with `/api/*` on the same origin.

Authentication uses short-lived JWT access tokens (15 min, in-memory) and rotating HttpOnly refresh tokens (7 days, SQLite). Refresh token reuse invalidates all sessions for that user.

---

## Setup

### 1. Prerequisites

- Node.js 18 or higher
- An Anthropic API key → [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

### 2. Install dependencies

```bash
cd backend
npm install
```

### 3. Configure environment

```bash
cp .env.example backend/.env
```

Open `backend/.env` and fill in:

| Variable | Description |
|---|---|
| `PORT` | Port the server listens on (default: `3001`) |
| `NODE_ENV` | `development` or `production` |
| `JWT_SECRET` | Random secret for signing tokens — generate below |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins |
| `MAX_FILE_SIZE` | Max upload size in bytes (default: `5242880` = 5MB) |

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 4. Initialize the database

Run once before the first start (or after deleting the DB to reset):

```bash
node init-db.js
```

This creates `backend/studyhub.db` with the correct schema and no user data.

### 5. Start the server

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## Features

- **Quiz Mode** — AI-generated multiple choice and true/false questions from your course material
- **Flashcards** — Spaced repetition (SM-2 algorithm) with AI-generated cards
- **AI Mentor** — Conversational tutor with subject context
- **Upload & Summarize** — Extract text from PDF, DOCX, or TXT and use it as context
- **Finance Lab** — Built-in financial calculators (NPV, FV, PMT, ROI)
- **Gamification** — XP, levels, streak, achievements
- **Pomodoro Timer** — 25/5 minute work sessions
- **Calendar** — Exam countdown tracker

---

## Security notes

- `backend/.env` — contains real secrets, **never commit this file**
- `backend/studyhub.db` — contains user accounts, **never commit this file**
- `backend/*.db-wal`, `backend/*.db-shm` — SQLite journal files, may contain user data rows in plaintext, **never commit these**
- All of the above are excluded by `.gitignore`

---

## Resetting the database

To wipe all users and start clean:

```bash
rm backend/studyhub.db backend/studyhub.db-wal backend/studyhub.db-shm 2>/dev/null
node init-db.js
```
