# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Chutaí is a real-time multiplayer "dle" guessing game (Wordle/Loldle style) for a Brazilian audience. All UI text, code comments, test names, error messages and docs are in **Brazilian Portuguese** — keep new ones in pt-BR.

## Commands

pnpm 10 monorepo (pnpm workspaces + Turborepo), Node >= 22.12.

```bash
pnpm install
pnpm dev            # web on :3000 + realtime on :3001 (health: http://localhost:3001/health)
pnpm test           # all tests (turbo)
pnpm typecheck
pnpm lint           # ESLint flat config at repo root
pnpm format         # Prettier (with tailwind plugin); format:check for CI-style check
pnpm build
```

Single package / single test (Vitest in `@chutai/game`, `@chutai/realtime`, `@chutai/db` and `@chutai/web` — the web tests are component tests with Testing Library + jsdom; `shared` has none):

```bash
pnpm --filter @chutai/game test
pnpm --filter @chutai/realtime exec vitest run tests/room.test.ts
pnpm --filter @chutai/realtime exec vitest run -t "nome do teste"
```

Database (optional, see below): `docker compose up -d`, set `DATABASE_URL`, then `pnpm db:migrate` / `pnpm db:seed`. `pnpm db:generate` creates a migration from `packages/db/src/schema.ts` (no DB needed). Redis: `docker compose --profile redis up -d` + `REDIS_URL`.

Env vars are read from the root `.env` (see `.env.example`); none are required locally.

Theme images: `pnpm images:fetch` downloads the files listed in `packages/db/seed/image-sources.json` from Wikimedia Commons, rejects non-free licenses, writes `apps/web/public/temas/<slug>/<id>.webp`, fills `image`/`imageCredit` in the theme JSON and regenerates `CREDITOS.md`. Downloads are cached in `packages/db/.cache/` (gitignored).

Deploy (live: site https://chutai-bay.vercel.app, realtime https://chutairealtime-production.up.railway.app): realtime on Railway, configured by hand in the dashboard (no `railway.json`; build/start/healthcheck/watch paths are listed in `docs/DEPLOY.md`), Node 22 via `.nvmrc`; web on Vercel (Root Directory `apps/web`). Vercel preview deploys can't reach the realtime server (not in `CORS_ORIGIN`) — expected. A Railway deploy drops all in-memory rooms.

## Architecture

Two apps + three internal packages. Internal packages are **not built** — they export raw `src/*.ts` and are consumed directly (Next via `transpilePackages`, realtime via tsx/tsup bundling).

- `packages/shared` — types, the typed Socket.IO contract (`src/events.ts`: `ClientToServerEvents` / `ServerToClientEvents`), Zod schemas for every client payload, constants. Changing an event here is a compile error on both sides until both are updated.
- `packages/game` — pure game rules (compare attributes, scoring, hints, character draw, accent-insensitive search). No server or React deps. Tunable numbers (scoring formula, timing) live in `src/config.ts`.
- `packages/db` — Drizzle schema, migrations, official themes as JSON in `seed/` (registered in `src/themes.ts`), and repositories behind interfaces (`ThemeRepository`, `MatchRepository`). `createRepositories(databaseUrl)` returns JSON/in-memory implementations when `DATABASE_URL` is absent and Drizzle/Postgres ones when present (postgres driver is dynamically imported). Tests use PGlite (real Postgres in memory).
- `apps/realtime` — Node + Socket.IO game server, **authoritative**: clients never receive the round's answer, only computed guess comparisons.
  - `src/app.ts` builds HTTP + Socket.IO + RoomManager (also used by tests to spin up a real server); `index.ts` just starts it.
  - `rooms/Room.ts` holds one room's state and rules and knows nothing about Socket.IO — it talks out through an injected `RoomEmitter` and takes injectable `now`/`schedule`/`random`, so `tests/room.test.ts` drives whole matches with `FakeClock` (`tests/helpers.ts`). `tests/server.test.ts` runs a full match with two real socket.io clients.
  - `rooms/store/` — room snapshot store: memory by default, Redis when `REDIS_URL` is set. The snapshot (`Room.toSnapshot()` / `restoreFrom`) holds the whole match (phase, round with answer id, guesses, scores, `endsAt`/`intermissionEndsAt`/`countdownEndsAt`, image seed); after a restart timers resume from the saved end times (a round that expired while down ends at once) and players reconnect via token. Old snapshots without `version: 2` go back to the lobby.
  - Deploy safety: each room has an owner lease in the store (`LEASE_MS` 15 s, renewed every 5 s; saves are fenced by a Lua check). A new server never loads rooms at boot — `RoomManager.load(code)` loads lazily on join and waits for the lease. `SIGTERM` → `server.shutdown()`: stop timers, save, release leases, close sockets (the web client reconnects and retries "mudando de servidor"). `manager.close()` is the no-save version for tests. Tests share one `MemoryRoomStore` between two managers/servers to simulate a deploy (`tests/persistence.test.ts`); `tests/room-store.test.ts` runs the same contract on memory and `ioredis-mock`.
  - `socket/handlers/*` — each handler is wrapped with `withValidation(schema, fn)` / `withoutPayload(fn)` from `safe.ts`, which Zod-validates input and replies via ack `{ ok, data } | { ok: false, error }`. Throw `GameError` (`lib/errors.ts`) for player-facing errors; anything else is logged and replaced with a generic message. `middleware/identify.ts` resolves the socket's room/player.
- `apps/web` — Next.js 16 App Router + React 19 + Tailwind 4. Routes use pt-BR paths (`sala/[codigo]`, `temas`, `treino`, `criar-tema`, `diario`, `professores`). Server-side theme access goes through `src/lib/themes.ts` (`server-only`, uses `createRepositories`). All realtime communication for a room is encapsulated in `src/hooks/useRoom.ts` (socket client in `lib/socket.ts`, reconnect token/profile in localStorage via `lib/identity.ts`). Path alias `@/` → `apps/web/src`.

Phases: `lobby` → `countdown` (`TIMING.startCountdownSeconds`, server-timed via `countdownEndsAt`; the round — draw, timer, images — is only created when it ends, guesses are rejected) → `round` ⇄ `intermission` (the web shows 3, 2, 1 in the last `TIMING.betweenRoundsCountdownSeconds` of `intermissionEndsAt`, no extra time) → `finished`. Tests: `createTestRoom` defaults `countdownMs` to 0 (round starts immediately); pass `countdownMs` to test the countdown.

Abandoned rooms: if nobody is connected for `ROOM_LIFECYCLE.abandonedSeconds` (60 s) during a match, `Room` calls `onAbandoned` and the manager deletes the room (logged). While nobody is connected no new round starts (no images rendered); whoever returns gets the next round after `resumeSeconds`. Lobby/finished rooms are left to the periodic sweep (`EMPTY_ROOM_MINUTES`).

Server → client flow: `room:state` is the source of truth broadcast to everyone; `you:state` is per-player private state (guesses, hints); `player:progress` is spoiler-free progress. Full event table is in README.md.

## Onboarding

- `components/help/how-to-play.tsx`: "Como jogar" dialog (room top bar and practice) and the first-visit panel in the lobby (`localStorage` key `chutai:como-jogar-visto`; inline, never blocks starting). The example board uses real Fauna data and `compareCharacters`.
- Board tiles are buttons with a tooltip portal; the text comes from `explainFeedback` in `packages/game/src/explain.ts` (only uses the guess feedback, never the answer).

## Errors (Sentry) and Vercel limits

- Sentry is off unless `NEXT_PUBLIC_SENTRY_DSN` (web: `src/instrumentation-client.ts`, `src/instrumentation.ts`, options in `lib/sentry.ts`; `next.config.ts` only wraps with `withSentryConfig` from `@sentry/nextjs/config` when the DSN exists) or `SENTRY_DSN` (realtime: `src/lib/sentry.ts`, dynamic import; `logger.error` reports via `setErrorReporter`). Privacy is mandatory: `SENTRY_DATA_COLLECTION` (Sentry 11 replaced `sendDefaultPii` with `dataCollection`, whose defaults collect a lot — keep everything off), no Session Replay, no browser sessions, `scrubSentryEvent` (`packages/shared/src/privacy.ts`) drops user/extra/request data/query and ui/console/fetch breadcrumbs. Never put nicknames or guesses in error messages.
- Vercel Hobby: images are served as-is (`images.unoptimized`; 5k transformations/month would run out), `/temas/*.webp` get a 1-day browser cache, `/diario` and `/diario/[slug]` are ISR (`revalidate = 60`), footer links don't prefetch. The tightest limit is 1M CDN requests/month (~27 per first visit).

## Sound

- `apps/web/src/lib/sound/`: `director.ts` (pure: which state change plays which sound; tested with a fake player), `engine.ts` (Web Audio synth: effects + generative background music; nothing plays before the first pointer/key interaction or with the tab hidden), `settings.ts` (`localStorage` key `chutai:som`, effects on / music off by default), `index.ts` (`useSoundSetup` in `Providers`, `useRoomSounds` in the room screen, `playSound`). My own guess sound comes from the guess ack (`guessSound`), not from state diffs.

## Link previews (Open Graph)

- `apps/web/src/app/opengraph-image.tsx` (site default) and `app/sala/[codigo]/opengraph-image.tsx` (room card) use `ImageResponse`. Room data comes from the realtime read-only route `GET /rooms/:codigo/preview` (`Room.toPreview()`: host nickname/avatar, theme, player count, limit, phase — never anything from the round; rate-limited per IP) via `lib/room-preview.ts` (2 s timeout, `null` → generic "Essa sala já acabou" card).
- Shared pieces in `apps/web/src/lib/og/`: static Archivo TTFs in `src/assets/og` (OFL; the site's variable woff2 doesn't work in `ImageResponse`), brand components, and emojis as Twemoji `<img>` data URIs fetched with a timeout. **Never put emoji characters as text in an `ImageResponse`** (it would fetch them itself and fail the whole image if the CDN is down); if the fetch fails the image renders without the emoji. `ogText` strips glyphs the fonts don't have.
- `metadataBase` comes from `NEXT_PUBLIC_SITE_URL` (`lib/site.ts`).
- Share result: `app/sala/[codigo]/resultado/route.tsx` renders the podium PNG (1080×1350, `lib/og/podium-image.tsx`) from the realtime route `GET /rooms/:codigo/result` (`Room.toResult()`, only in `finished`). `components/scoreboard/share-result.tsx` prefetches the PNG when the podium appears (it disappears on restart, and iOS needs `navigator.share` right after the tap); touch devices with `canShare({files})` use the native share sheet, otherwise it downloads and offers "Copiar texto". Podium/tie/text rules in `lib/podium.ts`.

## Image mode (rules that must keep holding)

- Settings have `mode: "classic" | "image"`. Availability comes from `imageModeAvailability` in `packages/game/src/image-mode.ts`: `full` (100% of characters have an image), `partial` (≥ `IMAGE_MODE.partialMinShare` = 75% **and** ≥ `IMAGE_MODE.partialMinCount` = 10 with image) or `none`. In image mode the server's `Room.playableCharacters` keeps only characters with an image: the draw, the accepted guesses and the autocomplete list all come from it.
- The browser never gets the answer or anything that identifies it. Degraded images are generated server-side (`apps/realtime/src/services/roundImageService.ts`, with a per-round random disguise and a zoom that starts at 3x near the center and backs off each level) and pushed per player via `round:image` — only the level that player reached, never broadcast. The sharp image appears only in the round reveal.
- **No pictures in the options in image mode.** The autocomplete list comes from the server (`room:characters`) and, in image mode, has only `id`, `name`, `aliases` — no `image`, no `emoji`; `GuessResult` also drops them. UI components take `showPictures={false}` (`GuessInput`, `GuessList`), covered by `apps/web/tests/`. In classic mode pictures stay.
- Mixed mode (`mode: "mixed"`): each round has a `kind` (`roundKind(mode, n)` in `image-mode.ts`: odd rounds classic, even rounds image). `Room` stores `kind` on the active round and every image rule (draw pool, images, scoring, no pictures in options, `room:characters` re-broadcast at round start) follows the round's kind, not `settings.mode`. `RoomState.round.kind` and `nextRoundKind` (countdown/intermission) tell the client. Available only where image mode is (`modeNeedsImages`).
- The realtime server reads original images from disk (`ASSETS_DIR`, default `apps/web/public`) and falls back to HTTP (`ASSETS_BASE_URL`).

## Daily challenge (`/diario`)

- One character per official theme per day, same for everyone; the day turns at midnight in `America/Sao_Paulo`. Day number counts from `DAILY.launchDate` (`packages/game/src/config.ts`).
- Pure logic in `packages/game/src/daily.ts` (`dailyDateKey`, `dailyNumber`, `dailyAnswerId`: cycles over the roster without repeats, order from an injected `rank`). The secret part lives only in the web server: `apps/web/src/lib/daily/server.ts` ranks with HMAC-SHA256 of `DAILY_SECRET` (no default value: without it the route answers 503 with a clear message).
- `POST /api/diario/[slug]` (`dailyRequestSchema`) judges guesses and hints statelessly (hints re-judge the guesses the browser sends). The answer is only returned after a correct guess. Progress/streak/stats live in `localStorage` (`lib/daily/storage.ts`).
- `packages/db/seed/daily-roster.json` lists each character and the date it joins the daily — nothing about which day gets which character (the repo is public). New characters join at the next cycle, so today/yesterday never change. After adding characters run `pnpm daily:roster` (a db test fails otherwise). Entries not yet on `origin/main` get tomorrow's date on every run, so **run `git fetch && pnpm daily:roster` and commit right before merging** a branch that adds characters. A brand-new theme's daily starts on the first day its characters are valid (`dailyStartDate`; before that the page says when it starts).
- **Never change `DAILY_SECRET` after launch** (every answer changes, including today's) and **avoid removing characters from themes with a daily** (that day's answer changes; the roster keeps removed ids and the day falls to the next character).

## Themes with real people (mandatory rules)

- Adults only (18+). Only public, neutral facts: no religion, politics, sexual orientation, health, relationships, controversies or lawsuits. People with a big recent controversy are swapped for a reserve.
- Never invent data. Every value is checked against pt.wikipedia (infobox/lead) and Wikidata; if a fact can't be confirmed, the person leaves the theme. Sources per person go in `packages/db/seed/FONTES.md`.
- Data that changes (clubs, etc.) needs `dataUpdatedAt` ("AAAA-MM") on the theme; the theme page shows "Dados de <mês> de <ano>". Avoid attributes that change weekly. Fuzzy years use `range` with a tolerance.
- Uncertain facts (only where a theme explicitly allows it, e.g. history): an approximate year is a number listed in the character's `approx` (shown as "c. 1655", still compared with the attribute tolerance); an unknown value is the string `UNKNOWN_VALUE` ("Incerto") and compares as status `unknown` (gray, "ninguém sabe ao certo", never an error). Record every divergence in `FONTES.md`.
- Images: only free licenses (Wikimedia Commons: public domain, CC0, CC BY, CC BY-SA — government sources like Agência Brasil, Senado and Planalto are fine), credits recorded; no agency/club/social-media photos without a free license, no photos from political events. Without a free image the character falls back to its emoji.
- Anyone shown can ask to be removed via the e-mail on the credits page.

## Adding a theme

Optional `noun` (`{ singular, plural, gender }`, e.g. the states theme: `estado`) replaces "personagem" in theme-specific UI text (tile explanations via `explainFeedback`, empty board, reveal, counts); helpers in `packages/game/src/noun.ts`. Flags (`estados-do-brasil`) are fitted with `contain` on a white background by `images:fetch` instead of cropped.

Add a JSON file to `packages/db/seed/` (attribute types: `text`, `list`, `number`, `range` with `tolerance`/`unit`), then register it in `packages/db/src/themes.ts`. The db test "temas oficiais estão todos consistentes" catches missing values.

## Conventions

- ESLint enforces `consistent-type-imports` (use `import type`), unused vars allowed only with `_` prefix.
- Prettier: double quotes, semicolons, trailing commas, printWidth 100.
- The realtime server must stay deployable as a single bundle (`pnpm --filter @chutai/realtime build` → `dist/index.js` via tsup).
