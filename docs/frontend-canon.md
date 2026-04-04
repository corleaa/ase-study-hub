# Frontend Canon Map — Study Hub

> Document de referință pentru AI agents și development.
> Ultima actualizare: 2026-04-04

---

## ARHITECTURA ACTIVĂ

### Single Page Application — fără framework, fără build system

```
index.html          ← shell HTML + 2 blocuri <script> inline (auth, state, routing)
css/app.css         ← TOT CSS-ul aplicației (5959 linii) ← SURSĂ CANONICĂ
css/finance-lab.css ← CSS specific Finance Lab (1324 linii) ← SURSĂ CANONICĂ
js/learning-layers.js
js/dashboard-page.js
js/subject-page.js
js/study-tools-page.js
js/system-pages.js
js/stats-mentor-page.js
js/finance-lab.js
js/finance-charts.js
```

---

## SURSĂ CANONICĂ PE SUPRAFAȚĂ UI

| Suprafață UI       | HTML           | CSS (secțiune)                        | JS                     |
|--------------------|----------------|---------------------------------------|------------------------|
| Shell / App layout | index.html     | `css/app.css` → APP LAYOUT (ln ~944)  | index.html inline      |
| Sidebar            | index.html     | `css/app.css` → SIDEBAR (ln ~965)     | index.html inline      |
| Dashboard / Home   | index.html     | `css/app.css` → DASHBOARD (ln ~1359)  | `js/dashboard-page.js` |
| Subject Page       | index.html     | `css/app.css` → SUBJECT HEADER (~2781)| `js/subject-page.js`   |
| Quiz               | index.html     | `css/app.css` → QUIZ MODE (~129)      | `js/quiz.js` (DEAD)    |
| Flashcards         | index.html     | `css/app.css` → FLASHCARDS (~357)     | `js/flashcards.js` (DEAD)|
| AI Mentor / Chat   | index.html     | `css/app.css` → AI CHAT (~1649)       | `js/mentor.js` (DEAD)  |
| Study Tools        | index.html     | `css/app.css` → PANELS (~1454)        | `js/study-tools-page.js`|
| Finance Lab        | index.html     | `css/finance-lab.css`                 | `js/finance-lab.js`    |
| Stats / Insight    | index.html     | `css/app.css` → V8 STATISTICI (~4509) | `js/stats-mentor-page.js`|
| Auth Modal         | index.html     | `css/app.css` → APP LAYOUT            | index.html inline      |
| Pomodoro           | index.html     | `css/app.css` → POMODORO (~2967)      | `js/system-pages.js`   |
| Calendar           | index.html     | `css/app.css` → CALENDAR (~523)       | `js/system-pages.js`   |
| Toast / Notif      | index.html     | `css/app.css` → TOAST (~4900)         | index.html inline      |
| Command Palette    | index.html     | `css/app.css` → CMD PALETTE (~4965)   | index.html inline      |

---

## FIȘIERE ACTIVE (RUNTIME)

### CSS
| Fișier              | Stare  | Dimensiune | Note                         |
|---------------------|--------|------------|------------------------------|
| `css/app.css`       | ACTIV  | ~6042 ln   | Extras din inline index.html |
| `css/finance-lab.css`| ACTIV | 1324 ln    | Linkuit ca fișier extern     |

### JavaScript (loaded in index.html)
| Fișier                    | Stare | Dimensiune | Tip      | Responsabilitate           |
|---------------------------|-------|------------|----------|----------------------------|
| `js/learning-layers.js`   | ACTIV | 780 ln     | IIFE     | Learning layers interactive|
| `js/dashboard-page.js`    | ACTIV | 579 ln     | Plain JS | Dashboard render           |
| `js/subject-page.js`      | ACTIV | 2002 ln    | Plain JS | Subject page render        |
| `js/study-tools-page.js`  | ACTIV | 984 ln     | Plain JS | Study tools render         |
| `js/system-pages.js`      | ACTIV | 732 ln     | Plain JS | Calendar, settings         |
| `js/stats-mentor-page.js` | ACTIV | 1937 ln    | Plain JS | Stats & Insight Center     |
| `js/finance-lab.js`       | ACTIV | 1404 ln    | Plain JS | Finance Lab interactive    |
| `js/finance-charts.js`    | ACTIV | 612 ln     | IIFE     | Finance charts/gauges      |

### JavaScript (inline în index.html)
| Bloc       | Linii (approx) | Responsabilitate                                    |
|------------|----------------|-----------------------------------------------------|
| Script #1  | ~1154 linii    | State mgmt, routing (renderPage), PDF export, auth  |
| Script #2  | ~215 linii     | Auth tokens, modals, theme toggle, init             |

---

## FIȘIERE INACTIVE / LEGACY (NU SUNT ÎNCĂRCATE)

> ⚠️ Aceste fișiere NU afectează UI-ul. Sunt candidate pentru ștergere după review manual.

### CSS
| Fișier          | Status  | Note                                              |
|-----------------|---------|---------------------------------------------------|
| `css/main.css`  | LEGACY  | Temă complet diferită (Electric Indigo/blue). Nelinkuit. |

### JavaScript
| Fișier            | Status  | Note                                                    |
|-------------------|---------|----------------------------------------------------------|
| `js/app.js`       | LEGACY  | Entry point ES6 modules — niciodată încărcat            |
| `js/auth.js`      | LEGACY  | Auth module ES6 — niciodată încărcat                    |
| `js/api.js`       | LEGACY  | API client ES6 — niciodată încărcat                     |
| `js/render.js`    | LEGACY  | Render utils ES6 — niciodată încărcat                   |
| `js/quiz.js`      | LEGACY  | Quiz ES6 module — funcționalitate acum în inline script |
| `js/mentor.js`    | LEGACY  | Mentor ES6 module — funcționalitate acum în inline script|
| `js/flashcards.js`| LEGACY  | Flashcards ES6 module — funcționalitate în inline script|
| `js/upload.js`    | LEGACY  | Upload ES6 module — funcționalitate în inline script    |

---

## ROUTING (cum funcționează navigația)

Aplicația are un router simplu bazat pe state:

```javascript
// În index.html inline script
function renderPage() {
  // Citește state.currentPage și randează componenta corectă
  // Fiecare pagină e un function call din js/*.js
}
```

Nu există URL routing real — totul e single-state în `window.state`.

---

## STATE MANAGEMENT

```javascript
window.state = { /* persisted în localStorage key: ash_state_v3 */ }
window.saveState() // serializează state în localStorage
```

---

## PENTRU AGENȚI AI — REPAIR ROUTING

### Spacing / Padding / Margin issues
→ Caută selectorul specific în `css/app.css` (vezi index de secțiuni din header-ul fișierului)

### Color / Token issues
→ `css/app.css` liniile 1-83 (`:root` dark + `[data-theme="light"]`)

### Layout principal breaks
→ `css/app.css` → APP LAYOUT (ln ~944) + SIDEBAR (ln ~965)

### Responsive / Mobile issues
→ `css/app.css` → caută `@media` pentru contextul specific

### Component-specific UI bugs
→ Mapare JS → CSS: folosește tabelul "Sursă Canonică" de mai sus

### Finance Lab issues
→ `css/finance-lab.css` (CSS) + `js/finance-lab.js` (comportament)

---

## ZONE CU RISC RIDICAT PENTRU AUTOMATIZARE

1. **index.html inline `<script>`** — conține `renderPage()`, `saveState()`, routing, auth.
   Nu modifica fără înțelegerea completă a flow-ului.

2. **`js/subject-page.js`** (2002 ln) și **`js/stats-mentor-page.js`** (1937 ln) —
   fișiere mari cu mult HTML generat dinamic. Schimbările de clase CSS pot afecta
   mai multe locuri simultan.

3. **CSS sections cu `V1.3` / `V7` / `V8`** prefix — stiluri adăugate incremental,
   pot exista override-uri. Dacă o schimbare nu produce efect, caută un override
   în secțiunile ulterioare.

4. **`css/app.css` → UPDATED GLOBAL STYLES (ln ~5405)** — ultima secțiune,
   conține override-uri globale. Un AI repair bot trebuie să verifice ACEASTĂ
   secțiune ULTIMUL când caută cauza unui stil neașteptat.
