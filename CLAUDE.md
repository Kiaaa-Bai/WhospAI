@AGENTS.md

# WhospAI — Project Overview

Watch 6 AI models play the social-deduction game **Who is the Spy**. The user sets two related words (one civilian, one undercover), one randomly-picked model is the spy, and everyone else is a civilian. Over rounds of describe → vote → elimination, the game plays out autonomously in the browser.

- Production: https://whospy-pi.vercel.app
- Source: https://github.com/Kiaaa-Bai/WhospAI
- Vercel project: `whospai` (team `kias-projects-d8d6a01e`)

## Stack

- **Next.js 16 App Router** (Turbopack dev), TypeScript, Tailwind CSS v4 via `@import "tailwindcss"`, shadcn base
- **Vercel AI Gateway** via AI SDK v6 (`streamText`, `generateText` + `Output.object`). Auth is OIDC — no API keys in `.env.local`; `vercel env pull` populates `VERCEL_OIDC_TOKEN`
- **SSE** from `/api/play` streams game events to the client
- Client-side **`useReducer` + playback queue** replays events at a human-readable pace (the server races ahead, the client buffers + animates)
- **TTS**: Microsoft Edge TTS via `msedge-tts`, transcoded to Opus/WebM, played through Web Audio API (`decodeAudioData` + `AudioBufferSourceNode`) — never `<audio>` (streaming buffer underruns cause word-swallowing)
- **Rate limit**: Per-IP counters in **Upstash Redis** (Vercel Marketplace), exposed via `KV_REST_API_*` env vars
- **Framer Motion** for layout transitions / overlays; Phosphor Icons (filled weight)
- **Space Mono + Noto Sans SC/JP/KR** for CJK glyph fallback

## Directory map

```
app/
  api/
    play/             SSE stream of game events (rate-limited)
    generate-words/   LLM word-pair generator (rate-limited, random category + nonce)
    tts/              Edge TTS → Opus/WebM proxy (concurrency-limited on client)
    quota/            Non-mutating GET — SetupScreen pre-checks remaining budget
  page.tsx            SetupScreen ↔ GameViewer switch
  layout.tsx          Fonts + <LanguageProvider>
  icon.svg            Spy-logo favicon (fedora + domino mask, Reigns palette)
  globals.css         Reigns palette, pixel-btn / ink-chip classes
components/
  SetupScreen.tsx     Word input + preset picker (lang-filtered) + quota display + roster
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
  LangSwitcher.tsx    Globe + dropdown, only rendered in SetupScreen (locked during game)
hooks/
  useGameReducer.ts       Dispatches GameEvents → GameState
  useGameSSE.ts           EventSource wrapper for /api/play
  usePlaybackDispatch.ts  Queues server events, preloads TTS, animates typewriter
  useSpeech.ts            Web Audio-based TTS player with concurrency limiter
  useOverlayTrigger.ts    Watches state transitions, emits overlay items
lib/
  game/               Types (incl. `GameLanguage`), reducer, engine, role assignment, roster
  voices.ts           Edge TTS voice mapping + vote-announcement translation
  rate-limit.ts       Per-IP Upstash counters (fail-open when Upstash env absent)
  avatars.ts          Provider avatar + initial + color helpers
  provider-colors.ts  Reigns-palette provider bg/ring + role fill/ring/text helpers
  i18n.tsx            LanguageProvider + useLang() + 8-language dictionary
data/
  word-pairs.ts       12 preset pairs × 8 languages
scripts/
  list-voices.mjs     `pnpm exec tsx scripts/list-voices.mjs` — audit live Edge TTS
                      voice catalog (zh/ja/en/es/fr/de/ko/ru). RUN THIS before
                      adding a new voice to lib/voices.ts.
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
- **Language switch is locked during a game**: `LangSwitcher` only renders in SetupScreen. Once the game starts the language is fixed for that run (prevents mid-game language drift in LLM prompts that already committed to one language). `lang` is stored into `GameConfig.language` at startup so the client TTS layer knows the true game language even for Latin-alphabet cases where character detection can't distinguish es/fr/de from en.

## Playback & TTS pipeline

### Dispatch queue (`hooks/usePlaybackDispatch.ts`)

1. Server streams events: `game-start`, `speak-start`, `think-token*`, `speak-token*`, `speak-end`, `vote-start`, `vote-cast`, `elimination`, `round-start`, …
2. Client pushes each event into a per-turn queue
3. When a turn closes (`speak-end` or `vote-cast`), `preloadTurn()` fires — kicks off TTS fetches for think / speak / vote-announcement audio in parallel with whatever turn is currently animating. `gameLanguage` is threaded in so TTS can pick the right voice for Latin-alphabet games.
4. `drain()` pulls turns in order, animating the typewriter + awaiting preloaded audio via `Promise.all`
5. Overlay-triggering events (`round-start`, `elimination`, ...) are greedily batched so multiple overlays play as one curtain sequence

### Speech (`hooks/useSpeech.ts`)

- **Concurrency limiter** (`TtsConcurrencyLimiter`, max=2) — module-level semaphore shared by all `useSpeech` calls. Edge TTS gets throttled when 4+ WebSocket connections come from the same client, surfacing as "some model has no voice". Cap at 2 prevents throttle, while still preloading the next turn's audio.
- **Retry budget** `[0, 400, 1200, 2500]` ms — 4.1s total so 2–3s throttle windows can be ridden out instead of silently failing
- Abort-aware: cancelling during an acquire-wait removes from the queue instead of holding a slot
- Playback via Web Audio API — buffer fully decoded before play starts, eliminating streaming underruns that caused the original "word-swallowing" glitches
- **Diagnostic logs**: server `/api/tts` logs `[tts] req / ok / empty-stream / stream-error`; client logs `[tts] empty blob / http N / fetch err / give-up` per retry attempt.

### Voice mapping (`lib/voices.ts`)

Edge TTS exposes a strict subset of the full Azure catalog. **Always verify** voices via `pnpm exec tsx scripts/list-voices.mjs` before adding to the table — voices present in Azure but missing from Edge return HTTP 200 with 0 audio bytes (silent failure). See the incident log in the file header.

Voice assignment by language:

| Language | Edge voices available | Strategy |
|---|---|---|
| en | 17 | `PER_PROVIDER` — each of 6 providers gets a unique voice |
| zh | 6 standard (+ 2 dialect) | `PER_PROVIDER` — all 6 unique |
| es | 7 | `PER_PROVIDER` — 6 unique, male/female balanced |
| fr | 9 | `PER_PROVIDER` — 6 unique, mostly fr-FR |
| de | 6 | `PER_PROVIDER` — all 6 used |
| ja | 2 (Keita, Nanami) | `PER_PROVIDER` — alternated across 6 providers |
| ko | 3 | `SHARED` — single voice (`ko-KR-SunHiNeural`) |
| ru | 2 | `SHARED` — single voice (`ru-RU-DmitryNeural`) |

`voiceFor(slug, text, gameLanguage?)` uses character-range detection (kana, hangul, cyrillic, CJK) and falls back to `gameLanguage` for Latin-alphabet disambiguation. `voteAnnouncementText(name, gameLanguage)` returns the localized "I vote for X" string in the chosen language.

## Rate limiting (`lib/rate-limit.ts`, `/api/quota`)

Per-IP counters backed by **Upstash Redis** (Vercel Marketplace integration → env vars `KV_REST_API_URL` + `KV_REST_API_TOKEN`). Also accepts direct Upstash naming (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).

- `play` bucket: **10 games / IP / UTC day** — guards the expensive `/api/play` (each run fires ~60 LLM calls)
- `gen` bucket: **10 picks / IP / UTC hour** — guards `/api/generate-words`
- Both buckets use `INCR + EXPIREAT` rolling windows — keys self-expire
- `/api/quota` (GET, non-mutating) — SetupScreen pre-fetches on mount + after each generate, shows `X / Y games left today` and disables START at zero
- Rate-limited requests return HTTP 429 with `X-RateLimit-*` headers
- **Fail-open**: if Redis is unavailable or env is missing, all requests pass. No black-hole.

## Setup / running

```bash
pnpm install
vercel env pull .env.local   # populates VERCEL_OIDC_TOKEN + KV_REST_API_* for local dev
pnpm dev
```

Dev server: http://localhost:3000. Uses Turbopack (`next dev --turbopack`).

`VERCEL_OIDC_TOKEN` expires every ~24h locally — re-pull when AI Gateway calls start returning 401.

Audit available TTS voices before changing `lib/voices.ts`:
```bash
pnpm exec tsx scripts/list-voices.mjs
```

## Deployment

Deployed on Vercel. Project link stored in `.vercel/project.json` (gitignored). GitHub remote at `Kiaaa-Bai/WhospAI`. AI Gateway OIDC + Upstash KV envs are auto-injected in Vercel runtime; no manual setup beyond provisioning the Upstash integration in dashboard.

- Production: `vercel --prod` (or `git push origin main` if GitHub auto-deploy is linked)
- Preview: `vercel` (default target)
