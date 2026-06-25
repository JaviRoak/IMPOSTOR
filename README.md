# IMPOSTOR — MVP

Browser-based multiplayer social deduction word game, in **English and
Spanish**. Everyone gets a secret word — except the Impostor, who gets either
a *clue* (a neighboring word) or nothing at all, depending on the host's
settings. Give clues, vote, and survive the live-typed Final Guess.

## Stack

React 18 + TypeScript + Vite + Tailwind (client) · Node.js + Express +
Socket.io (server). Authoritative server-side state machine — the shared
snapshot never contains the Impostor's identity or the secret word; those
travel only via private `word:assign` events.

## Run it

```bash
npm install && npm run install:all
npm run dev          # server :3001 + client :5173 (Vite proxies socket/api/avatars)
```

Open http://localhost:5173 in 3+ tabs. Production: `npm run build && npm start`.

## Features

- **Language select on the first screen** (🇬🇧/🇪🇸) — the whole UI *and* the
  word corpus are bilingual; the host's language sets the room's language.
- **Profile pictures:** drop PNGs into **`server/avatars/`** — the 🎲
  Randomize button on the name screen picks from that folder
  (`GET /api/avatars`). 8 starter avatars included; replace them freely.
- **Host settings in the lobby:**
  - **Impostor clue toggle** — ON: the Impostor receives a hint word close to
    the secret word. OFF: the Impostor gets nothing and must improvise.
  - **Category picker** — All categories, any single category, or…
  - **Custom list** — the host pastes their own words (one per line, min 5,
    max 200). Custom words never carry a clue.
  - **Time to answer** — host picks 15 / 25 / 40 / 60 seconds per clue turn.
- **Constant header** (`AppHeader`) shared by Lobby and Game: brand · copyable
  room-code pill · Leave. Phase label and timer sit on their own row so nothing
  overlaps, and the whole thing is responsive down to ~360px.
- Full round loop: hold-to-open envelope → turn-based clues (1–3 words,
  validated) → secret vote → survival rounds → Final Guess with keystrokes
  broadcast live → results with both the word and the Impostor's clue
  revealed → host rematch keeping scores.


## UI preview / demo mode (dev only)

Preview every screen with mock data — no backend, no extra tabs:

```bash
npm run dev --prefix client          # client only is enough
# open http://localhost:5173/?demo
```

A 🧪 DEMO bar at the bottom switches between: Home · Lobby · Reveal ·
Reveal (Impostor) · Clues · Voting · Final guess · Results · Results (steal).
It renders the real production components with a mock 4-player room
(`client/src/demo/mockData.ts`). The module is lazy-loaded and guarded by
`import.meta.env.DEV`, so it is tree-shaken out of production builds, and the
socket skips connecting while in demo — the real multiplayer flow is untouched.


## Security hardening

- Per-socket **token-bucket rate limiting** (40 burst, 20/s) on every event —
  throttles spam/DoS, including the keystroke-driven `guess:typing` broadcast.
- **Global room cap** (5,000) + duplicate-create block → memory-exhaustion guard.
- All socket payloads are **coerced to objects and try/caught**, so a malformed
  message can never crash a handler.
- Avatar filenames are **regex-validated** (no path traversal, null bytes, or
  fake extensions); the listing is cached (no sync FS read per request).
- `customWords` input is **sliced before processing** (no CPU blow-up); category
  is validated against the known set.
- **CORS allowlist** via `CORS_ORIGIN` env (reflects any origin only in dev);
  100KB max message size; `x-powered-by` disabled.

## Socket protocol

| Direction | Event | Payload |
|---|---|---|
| C→S | `room:create` | `{ name, avatar, language }` → ack `{ ok, code, selfId }` |
| C→S | `room:join` | `{ code, name, avatar }` → ack |
| C→S | `room:settings` | `{ clueEnabled?, category?, customWords? }` (host only) |
| C→S | `player:ready` / `game:start` / `game:again` | — |
| C→S | `clue:submit` / `vote:cast` / `guess:typing` / `guess:submit` | `{ text }` / `{ targetId }` |
| S→C | `room:state` | full snapshot (no secrets) |
| S→C | `word:assign` | `{ isImpostor, word, clue, category }` — private |
| S→C | `toast` | localized to the room language |

HTTP: `GET /api/avatars` · `GET /api/categories?lang=en|es` · `/avatars/<file>`

## Layout

```
impostor-mvp/
├── server/
│   ├── avatars/              ← DROP YOUR PNG PROFILE PICS HERE
│   └── src/  index.ts · room.ts · words.ts (bilingual corpus) · types.ts
└── client/src/
    ├── i18n.ts               # EN/ES dictionary + useT() hook
    ├── App.tsx · socket.ts · types.ts · index.css
    └── components/  HomeScreen (language + pfp) · LobbyScreen (host settings)
                     GameScreen · PlayerTable · WordReveal · ClueBoard
                     ResultsScreen · Avatar · Timer
```

Minimum players is 3 for easy testing (`MIN_PLAYERS` in `server/src/room.ts`).
