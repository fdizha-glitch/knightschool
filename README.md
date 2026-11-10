# ♞ KnightSchool — Interactive Chess Tutor

A web app that teaches chess through interactive drills, engine analysis, and a Whisper-powered voice coaching loop.

## Features

| Feature | Details |
|---|---|
| **Openings** | Repertoire drill with spaced repetition — Italian, Caro-Kann, and more |
| **Tactics** | 12 curated middlegame positions tagged by theme (pins, forks, outposts…) |
| **Endgames** | 10 theoretical positions (Lucena, Philidor, K+P, minor pieces) |
| **Engine Analysis** | Stockfish 19 (WebAssembly, runs in the browser) — evaluation bar + top-3 candidate lines |
| **Voice Coaching** | Hold-to-talk → Whisper STT → rule-based (or GPT-4) coaching response |
| **TTS** | Web Speech API reads coaching messages aloud |
| **Progress Tracking** | Accuracy %, streaks, mistake history with replay |
| **Dark Mode** | System-aware, toggleable |

---

## Quick Start

### 1. Clone & install

```bash
git clone <repo-url> knightschool
cd knightschool
npm install        # or: pnpm install / yarn install
```

### 2. Set environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Required for voice transcription (Whisper STT)
OPENAI_API_KEY=sk-...

# Optional: use GPT-4o-mini for richer coaching responses
ENABLE_LLM_COACH=false
```

### 3. Chess engine — nothing to install

Stockfish 19 runs **in the browser** as WebAssembly (the "lite, single-threaded" build in `public/stockfish/`). There is no binary to install and no server work: every analysis happens on the player's own device, so the app deploys to any static-friendly host (Vercel, Netlify…) without special headers.

> **If the engine can't load** (very old browser, blocked Web Workers): the app falls back to a basic one-move material search and shows a warning. Everything else keeps working.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
knightschool/
├── data/                          # Static training content (JSON)
│   ├── openings.json              # Opening repertoires
│   ├── middlegame-positions.json  # 15 tactical positions
│   └── endgame-positions.json     # 10 endgame positions
├── public/                        # Static assets (incl. stockfish/ WASM engine)
├── src/
│   ├── app/                       # Next.js App Router pages
│   │   ├── page.tsx               # Home / mode selection
│   │   ├── openings/              # Openings trainer page
│   │   ├── middlegame/            # Tactics / plans page
│   │   ├── endgames/              # Endgames page
│   │   ├── review/                # Mistake review page
│   │   ├── settings/              # Settings page
│   │   └── api/
│   │       ├── transcribe/        # POST — Whisper STT endpoint
│   │       └── coach/             # POST — coaching message
│   ├── components/
│   │   ├── board/                 # ChessBoard, EvalBar, MoveHistory
│   │   ├── coach/                 # CoachPanel, VoiceButton
│   │   ├── training/              # OpeningTrainer, MiddlegameTrainer, EndgameTrainer
│   │   ├── ui/                    # Button, Card, ThemeToggle
│   │   └── progress/              # StatsPanel
│   ├── hooks/
│   │   ├── useStockfish.ts        # Engine analysis hook
│   │   ├── useVoice.ts            # Audio recording + STT hook
│   │   └── useCoach.ts            # Coaching fetch hook
│   ├── lib/
│   │   ├── stockfish/engine.ts    # Stockfish WASM Web Worker wrapper
│   │   ├── coach/coaching.ts      # Rule-based coaching logic
│   │   ├── data/loader.ts         # JSON data loaders
│   │   ├── store/                 # Zustand stores (game, progress, settings)
│   │   └── utils/                 # chess-utils, audio helpers
│   └── types/index.ts             # All TypeScript types
└── README.md
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | For voice | Whisper STT + optional GPT-4 coaching |
| `ENABLE_LLM_COACH` | Optional | `"true"` to use GPT-4o-mini for coaching |

---

## How to Add Content

### Add an Opening

Edit `data/openings.json`. Each opening follows this schema:

```json
{
  "id": "my-opening",           // unique slug
  "name": "My Opening",
  "eco": "A00",
  "family": "Flank Opening",
  "color": "white",             // which side the user drills
  "description": "...",
  "moves": ["Nf3", "d5", "c4"], // trunk moves in SAN
  "plans": ["..."],
  "branches": [
    {
      "id": "my-variation",
      "name": "My Variation",
      "moves": ["Nf3", "d5", "c4", "c6"], // full move sequence from start
      "description": "...",
      "plans": ["..."],
      "tags": ["solid", "positional"]
    }
  ]
}
```

### Add a Middlegame Position

Edit `data/middlegame-positions.json`:

```json
{
  "id": "mg-016",
  "title": "My Position",
  "fen": "rnbqkbnr/...",           // valid FEN string
  "theme": ["pin", "tactic"],
  "difficulty": "intermediate",    // beginner | intermediate | advanced
  "sideToMove": "white",
  "description": "What to find...",
  "hints": ["Hint 1", "Hint 2"],
  "bestMoves": ["Nxd5"],           // SAN, first element is the primary best move
  "explanation": "Full explanation of why this is correct..."
}
```

Validate your FEN with any chess tool or [lichess.org/editor](https://lichess.org/editor).

### Add an Endgame Position

Edit `data/endgame-positions.json`:

```json
{
  "id": "eg-011",
  "title": "My Endgame",
  "fen": "...",
  "theme": "rook-endgame",         // rook-endgame | king-pawn | minor-piece | queen-endgame
  "difficulty": "intermediate",
  "sideToMove": "white",
  "objective": "win",              // win | draw | survive
  "description": "What to achieve...",
  "explanation": "Full theoretical explanation...",
  "keyMoves": ["Re4", "Kc7"],
  "theoryName": "Optional theory name (e.g. Lucena Position)"
}
```

---

## API Endpoints

### `POST /api/transcribe`
Transcribes audio using Whisper.

**Request:** `multipart/form-data` with field `audio` (Blob, any common format).

**Response:**
```json
{ "text": "I think the best move is Nc6" }
```

### `POST /api/coach`
Generates a coaching message (rule-based or LLM-enhanced).

**Request:**
```json
{
  "fen": "...",
  "lastMoveSAN": "Nc6",
  "analysis": { ... },
  "voiceInput": "Why is this bad?",
  "mode": "middlegame"
}
```

**Response:**
```json
{
  "type": "feedback",
  "content": "Nc6 allows a pin after Bb5...",
  "detail": "Consider ...a6 to prevent the pin.",
  "principle": "Prevent opponent's threats before making your own."
}
```

---

## Manual Test Checklist

### Voice & Transcription
- [ ] Click "Hold to Talk" and speak: "What's the plan?" — release — transcript appears
- [ ] Edit the transcript and click "Ask coach" — coach message appears
- [ ] Check browser console for any `[/api/transcribe]` errors
- [ ] Without OPENAI_API_KEY: should show "OPENAI_API_KEY is not set" error gracefully

### Engine Analysis
- [ ] Open any training mode and make a move — eval bar updates
- [ ] Click "Analyse" in coach panel — best move arrow appears (if `showBestMove` on)
- [ ] DevTools → Network: `stockfish-19-lite-single.wasm` loads once (≈1.8 MB, `application/wasm`)
- [ ] Engine evaluations are from White's side: the bar favours White when White is better, whoever is to move

### Opening Trainer
- [ ] Select Italian Game → drill trunk → make the correct first move (e4) — green feedback
- [ ] Make an incorrect move — red feedback + coach explanation + "Try again" button
- [ ] Complete all moves — "Opening complete!" banner with accuracy shown
- [ ] Flip board, select black side, drill Caro-Kann

### Middlegame Trainer
- [ ] Open Tactics page → select a beginner position → make best move → "+10 pts" awarded
- [ ] Make a blunder → mistake recorded → feedback shown → "Try again" works
- [ ] Click "Hint" 1–2 times → coach hints appear
- [ ] Click "Show solution" → explanation reveals

### Endgame Trainer
- [ ] Open Endgames → Lucena position → apply the Lucena technique (Re4, Kc7, Rc4)
- [ ] Engine responds as the defending side
- [ ] Click "Theory" to reveal the Lucena explanation

### Progress & Review
- [ ] Play several positions with intentional mistakes
- [ ] Go to Review → mistakes appear in the list
- [ ] Click a mistake → board loads the position, explanation shown
- [ ] Mark as reviewed → disappears from "To review" filter

### Settings
- [ ] Toggle dark/light mode — persists on reload
- [ ] Disable eval bar — bar disappears from board
- [ ] Enable "Show Best Move" — arrow appears after analysis

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | TailwindCSS |
| Chess Logic | chess.js v1 |
| Board UI | react-chessboard |
| State | Zustand (persist to localStorage) |
| Engine | Stockfish 19 lite (WebAssembly in a Web Worker) |
| STT | OpenAI Whisper via `/api/transcribe` |
| TTS | Web Speech API (browser-native) |
| Coaching | Rule-based + optional GPT-4o-mini |

---

## Extending KnightSchool

**Add a new training mode:** Create a page in `src/app/`, a trainer component in `src/components/training/`, and add positions to `data/`.

**Connect a tablebase:** In `EndgameTrainer`, add an option to call Syzygy/Lomonosov via REST API for exact win/draw/loss verdicts.

**PGN import/export:** Add a `PGNImporter` component that parses PGN and generates opening branch objects. A `chess.js` PGN parser is already available.

**Persistent cloud progress:** Replace the Zustand `localStorage` store with an API-backed store (e.g., Prisma + PostgreSQL) for multi-device sync.

---

## Licence note

`public/stockfish/` contains [Stockfish.js](https://github.com/nmrugg/stockfish.js), which is licensed under the **GPL-3.0** (see `public/stockfish/COPYING.txt`). Shipping it to browsers counts as distribution, so if you publish this app you must make the engine's source available, as the GPL requires (linking to the Stockfish.js repository is the usual way).
