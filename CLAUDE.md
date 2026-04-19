@AGENTS.md

# WhospAI — Project Overview

Watch 6 AI models play the social-deduction game **Who is the Spy**. The user sets two related words (one civilian, one undercover), one randomly-picked model is the spy, and everyone else is a civilian. Over rounds of describe → vote → elimination, the game plays out autonomously in the browser.

## Stack

- **Next.js 16 App Router** (Turbopack dev), TypeScript, Tailwind CSS v4 via `@import "tailwindcss"`, shadcn base
- **Vercel AI Gateway** via AI SDK v6 (`streamText`, `generateText` + `Output.object`). Auth is OIDC — no API keys in `.env.local`; `vercel env pull` populates `VERCEL_OIDC_TOKEN`
- **SSE** from `/api/play` streams game events to the client
- Client-side **`useReducer` + playback queue** replays events at a human-readable pace (the server races ahead, the client buffers + animates)
- **TTS**: Microsoft Edge TTS via `msedge-tts`, transcoded to Opus/WebM, played through Web Audio API (`decodeAudioData` + `AudioBufferSourceNode`) — never `<audio>` (streaming buffer underruns cause word-swallowing)
- **Framer Motion** for layout transitions / overlays; Phosphor Icons (filled weight)
- **Space Mono + Noto Sans SC/JP/KR** for CJK glyph fallback

## Directory map

```
app/
  api/
    play/             SSE stream of game events
    generate-words/   LLM word-pair generator (with randomized category + nonce for variety)
    tts/              Edge TTS → Opus/WebM proxy
  page.tsx            SetupScreen ↔ GameViewer switch
  layout.tsx          Fonts + <LanguageProvider>
  globals.css         Reigns palette, pixel-btn / ink-chip classes
components/
  SetupScreen.tsx     Word input + preset picker (lang-filtered) + roster showcase
  GameViewer.tsx      Dual layout: desktop (Stage + Seats) / mobile (Seats + MobileInfoBar)
  MainStage.tsx       Desktop-only focus card: bubble + avatar + word + inner thoughts + speaking order
  PanelSeats.tsx      6-player grid (3×2 on mobile, 6-col on desktop)
  SeatCard.tsx        One seat: avatar disc + role-filled card + nested word card + vote badge
  MobileInfoBar.tsx   Mobile-only: mini speaking-order discs + streaming-ticker reasoning
  HistoryStrip.tsx    Per-round statement+vote grid
  PhaseOverlay.tsx    Full-screen curtain for GAME START / ROUND N / ELIMINATION
  GameOverPage.tsx    Winner banner + final roster + timeline + replay buttons
  ProviderAvatar.tsx  Canonical avatar — provider-color disc + ink outline + optional glow
  ThoughtBubble.tsx   Cream speech bubble with arrow tail; avatar-only for vote phase
  LangSwitcher.tsx    Globe + dropdown, only rendered in SetupScreen
hooks/
  useGameReducer.ts   Dispatches GameEvents → GameState (players, phase, round, statements, votes, ...)
  useGameSSE.ts       EventSource wrapper for /api/play
  usePlaybackDispatch.ts  Queues server events, preloads TTS, animates typewriter, advances sequentially
  useSpeech.ts        Web Audio-based TTS player with concurrency limiter
  useOverlayTrigger.ts    Watches state transitions, emits overlay items
lib/
  game/               Types, reducer, engine, role assignment, roster, turn runners
  voices.ts           Edge TTS voice mapping per provider × language
  avatars.ts          Provider avatar + initial + color helpers
  provider-colors.ts  Reigns-palette provider bg/ring + role fill/ring/text helpers
  i18n.tsx            LanguageProvider + useLang() + 8-language dictionary
data/
  word-pairs.ts       12 preset pairs × 8 languages
```

## Visual design — Reigns: Three Kingdoms-inspired warm palette

All palette variables live at the top of `app/globals.css`:

- `--reigns-bg` `#E8D4A6` (sandstone background)
- `--reigns-ink` `#2A2723` (dark warm ink — used for borders and primary text)
- Provider signature colors: `--reigns-openai / anthropic / google / deepseek / xai / alibaba`
- Role colors: `--reigns-green` (civilian), `--reigns-red` (undercover), `--reigns-gold` (accents / NOW label)

### Card design rules (applies to seats, focus card, roster cards)

- **Outline**: 3–4px `var(--reigns-ink)` black
- **Fill**: role color (`roleFill()` from `lib/provider-colors.ts`) — civilian green, undercover red
- **Text**: ink black (all names, words, small labels) — no cream text on role-filled cards
- **Offset shadow**: `4px 4px 0 0 var(--reigns-ink)` (2px on nested card)
- **Active speaker highlight**: role-color glow `0 0 0 3px ROLE, 0 0 12px ROLE, 4px 4px 0 0 ink` — applied to BOTH avatar disc and card
- **Word display**: nested sub-card with `background: var(--reigns-ink)` + `color: CARD_TEXT` (cream). `break-words`, never truncated.
- **Corner chips** (p-id, role icon): absolutely positioned at `top-1 left-1 / right-1`, not negative offsets

### ProviderAvatar (`components/ProviderAvatar.tsx`)

Canonical avatar rendering — used everywhere a model appears:
- Round disc with provider-color background
- Black ink outline
- Optional `activeGlow={roleColor}` prop for active-speaker highlight
- `padding` / `outline` props parameterize per-location sizing

## Mobile vs desktop

Breakpoint: Tailwind `lg` (1024px). Mobile = portrait phone target; no-scroll feel is a hard requirement.

- **Desktop**: `GameViewer` renders `MainStage` (left) + `PanelSeats` (right) in a 2-col grid
- **Mobile**: `GameViewer` drops `MainStage` entirely; shows `PanelSeats` (3×2 seat grid, history hidden) + fixed-bottom `MobileInfoBar`
- `MobileInfoBar` contains two rows:
  - Row 1: speaking-order mini discs (ProviderAvatar size 34px NOW with role-color glow / 26px others)
  - Row 2: **streaming ticker** for current speaker's inner thoughts. Uses `useLayoutEffect` to measure `scrollWidth`; when text overflows the container, `translateX(-overflow)` animates at fixed 60 px/s linear transition. Key-reset on speaker change. No looping.
- `PhaseOverlay` scales down on mobile: avatars 72→44px with `flex-wrap` (6 roster avatars wrap to 3×2), elimination avatar 180→110px, titles 6xl→3xl, `break-words`

## Internationalization (`lib/i18n.tsx`)

- 8 languages: `en / zh / ja / ko / es / fr / de / ru`
- Default: auto-detected from `navigator.language`, persisted to `localStorage['whospy.lang']`
- SSR renders `en` then hydrates (avoids hydration mismatch)
- `useLang()` returns `{ lang, setLang, t }`; `t('key', { params })` does `{placeholder}` interpolation
- **Game labels stay English** deliberately (`NOW`, `UPNEXT`, `DONE`, `SKIPPED`, `OUT`, `R{n}`, `CIVILIAN`, `UNDERCOVER` in timeline chips) — gamified mono-font aesthetic
- **Overlay titles are translated**: `GAME START`, `ROUND N`, `DESCRIBE PHASE`, `VOTE PHASE`, `TIEBREAK`, `NO ELIMINATION`, `{name} OUT`, `CIVILIANS WIN`, `UNDERCOVER WINS`
- **Language switch is locked during a game**: `LangSwitcher` only renders in SetupScreen. Once the game starts the language is fixed for that run (prevents mid-game language drift in LLM prompts that already committed to one language).

## Playback & TTS pipeline

### Dispatch queue (`hooks/usePlaybackDispatch.ts`)

1. Server streams events: `game-start`, `speak-start`, `think-token*`, `speak-token*`, `speak-end`, `vote-start`, `vote-cast`, `elimination`, `round-start`, …
2. Client pushes each event into a per-turn queue
3. When a turn closes (`speak-end` or `vote-cast`), `preloadTurn()` fires — kicks off TTS fetches for think / speak / vote-announcement audio in parallel with whatever turn is currently animating
4. `drain()` pulls turns in order, animating the typewriter + awaiting preloaded audio via `Promise.all`
5. Overlay-triggering events (`round-start`, `elimination`, ...) are greedily batched so multiple overlays play as one curtain sequence

### Speech (`hooks/useSpeech.ts`)

- **Concurrency limiter** (`TtsConcurrencyLimiter`, max=2) — module-level semaphore shared by all `useSpeech` calls. Edge TTS (`msedge-tts`) gets throttled when 4+ WebSocket connections come from the same client, surfacing as "some model has no voice". Cap at 2 prevents throttle, while still preloading the next turn's audio.
- **Retry budget** `[0, 400, 1200, 2500]` ms — 4.1s total so 2–3s throttle windows can be ridden out instead of silently failing
- Abort-aware: cancelling during an acquire-wait removes from the queue instead of holding a slot
- Playback via Web Audio API (`AudioContext.decodeAudioData` + `AudioBufferSourceNode`) — buffer fully decoded before play starts, eliminating streaming underruns that caused the original "word-swallowing" glitches

### Voice mapping (`lib/voices.ts`)

- Per-provider × per-language Edge TTS voice name
- `detectTextLanguage()` infers lang from character ranges (hiragana/katakana → ja, hangul → other, CJK → zh, latin → en)
- Languages without a native voice currently fall back to the provider's English voice

## Setup / running

```bash
pnpm install
vercel env pull .env.local   # populates VERCEL_OIDC_TOKEN for AI Gateway
pnpm dev
```

Dev server: http://localhost:3000. Uses Turbopack (`next dev --turbopack`).

`VERCEL_OIDC_TOKEN` expires every ~24h locally — re-pull when AI Gateway calls start returning 401.

## Deployment

Deployed on Vercel. Project link stored in `.vercel/project.json` (gitignored). The AI Gateway OIDC token is auto-injected in Vercel deployments, so no manual env var setup is needed beyond linking.

- Production: `vercel --prod`
- Preview: `vercel` (default target)
