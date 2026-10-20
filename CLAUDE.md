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

Deploy: realtime on Railway (`railway.json` at the repo root, Node 22 via `.nvmrc`), web on Vercel (Root Directory `apps/web`). Step by step in `docs/DEPLOY.md`.

## Architecture

Two apps + three internal packages. Internal packages are **not built** — they export raw `src/*.ts` and are consumed directly (Next via `transpilePackages`, realtime via tsx/tsup bundling).

- `packages/shared` — types, the typed Socket.IO contract (`src/events.ts`: `ClientToServerEvents` / `ServerToClientEvents`), Zod schemas for every client payload, constants. Changing an event here is a compile error on both sides until both are updated.
- `packages/game` — pure game rules (compare attributes, scoring, hints, character draw, accent-insensitive search). No server or React deps. Tunable numbers (scoring formula, timing) live in `src/config.ts`.
- `packages/db` — Drizzle schema, migrations, official themes as JSON in `seed/` (registered in `src/themes.ts`), and repositories behind interfaces (`ThemeRepository`, `MatchRepository`). `createRepositories(databaseUrl)` returns JSON/in-memory implementations when `DATABASE_URL` is absent and Drizzle/Postgres ones when present (postgres driver is dynamically imported). Tests use PGlite (real Postgres in memory).
- `apps/realtime` — Node + Socket.IO game server, **authoritative**: clients never receive the round's answer, only computed guess comparisons.
  - `src/app.ts` builds HTTP + Socket.IO + RoomManager (also used by tests to spin up a real server); `index.ts` just starts it.
  - `rooms/Room.ts` holds one room's state and rules and knows nothing about Socket.IO — it talks out through an injected `RoomEmitter` and takes injectable `now`/`schedule`/`random`, so `tests/room.test.ts` drives whole matches with `FakeClock` (`tests/helpers.ts`). `tests/server.test.ts` runs a full match with two real socket.io clients.
  - `rooms/store/` — room snapshot store: memory by default, Redis when `REDIS_URL` is set (rooms restored to lobby after restart; players reconnect via token).
  - `socket/handlers/*` — each handler is wrapped with `withValidation(schema, fn)` / `withoutPayload(fn)` from `safe.ts`, which Zod-validates input and replies via ack `{ ok, data } | { ok: false, error }`. Throw `GameError` (`lib/errors.ts`) for player-facing errors; anything else is logged and replaced with a generic message. `middleware/identify.ts` resolves the socket's room/player.
- `apps/web` — Next.js 16 App Router + React 19 + Tailwind 4. Routes use pt-BR paths (`sala/[codigo]`, `temas`, `treino`, `criar-tema`). Server-side theme access goes through `src/lib/themes.ts` (`server-only`, uses `createRepositories`). All realtime communication for a room is encapsulated in `src/hooks/useRoom.ts` (socket client in `lib/socket.ts`, reconnect token/profile in localStorage via `lib/identity.ts`). Path alias `@/` → `apps/web/src`.

Server → client flow: `room:state` is the source of truth broadcast to everyone; `you:state` is per-player private state (guesses, hints); `player:progress` is spoiler-free progress. Full event table is in README.md.

## Image mode (rules that must keep holding)

- Settings have `mode: "classic" | "image"`. Availability comes from `imageModeAvailability` in `packages/game/src/image-mode.ts`: `full` (100% of characters have an image), `partial` (≥ `IMAGE_MODE.partialMinShare` = 75% **and** ≥ `IMAGE_MODE.partialMinCount` = 10 with image) or `none`. In image mode the server's `Room.playableCharacters` keeps only characters with an image: the draw, the accepted guesses and the autocomplete list all come from it.
- The browser never gets the answer or anything that identifies it. Degraded images are generated server-side (`apps/realtime/src/services/roundImageService.ts`, with a per-round random disguise and a zoom that starts at 3x near the center and backs off each level) and pushed per player via `round:image` — only the level that player reached, never broadcast. The sharp image appears only in the round reveal.
- **No pictures in the options in image mode.** The autocomplete list comes from the server (`room:characters`) and, in image mode, has only `id`, `name`, `aliases` — no `image`, no `emoji`; `GuessResult` also drops them. UI components take `showPictures={false}` (`GuessInput`, `GuessList`), covered by `apps/web/tests/`. In classic mode pictures stay.
- The realtime server reads original images from disk (`ASSETS_DIR`, default `apps/web/public`) and falls back to HTTP (`ASSETS_BASE_URL`).

## Themes with real people (mandatory rules)

- Adults only (18+). Only public, neutral facts: no religion, politics, sexual orientation, health, relationships, controversies or lawsuits. People with a big recent controversy are swapped for a reserve.
- Never invent data. Every value is checked against pt.wikipedia (infobox/lead) and Wikidata; if a fact can't be confirmed, the person leaves the theme. Sources per person go in `packages/db/seed/FONTES.md`.
- Data that changes (clubs, etc.) needs `dataUpdatedAt` ("AAAA-MM") on the theme; the theme page shows "Dados de <mês> de <ano>". Avoid attributes that change weekly. Fuzzy years use `range` with a tolerance.
- Images: only free licenses (Wikimedia Commons: public domain, CC0, CC BY, CC BY-SA — government sources like Agência Brasil, Senado and Planalto are fine), credits recorded; no agency/club/social-media photos without a free license, no photos from political events. Without a free image the character falls back to its emoji.
- Anyone shown can ask to be removed via the e-mail on the credits page.

## Adding a theme

Add a JSON file to `packages/db/seed/` (attribute types: `text`, `list`, `number`, `range` with `tolerance`/`unit`), then register it in `packages/db/src/themes.ts`. The db test "temas oficiais estão todos consistentes" catches missing values.

## Conventions

- ESLint enforces `consistent-type-imports` (use `import type`), unused vars allowed only with `_` prefix.
- Prettier: double quotes, semicolons, trailing commas, printWidth 100.
- The realtime server must stay deployable as a single bundle (`pnpm --filter @chutai/realtime build` → `dist/index.js` via tsup).
