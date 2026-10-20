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

Single package / single test (Vitest is used in `@chutai/game`, `@chutai/realtime`, `@chutai/db`; `web` and `shared` have no tests):

```bash
pnpm --filter @chutai/game test
pnpm --filter @chutai/realtime exec vitest run tests/room.test.ts
pnpm --filter @chutai/realtime exec vitest run -t "nome do teste"
```

Database (optional, see below): `docker compose up -d`, set `DATABASE_URL`, then `pnpm db:migrate` / `pnpm db:seed`. `pnpm db:generate` creates a migration from `packages/db/src/schema.ts` (no DB needed). Redis: `docker compose --profile redis up -d` + `REDIS_URL`.

Env vars are read from the root `.env` (see `.env.example`); none are required locally.

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

## Adding a theme

Add a JSON file to `packages/db/seed/` (attribute types: `text`, `list`, `number`, `range` with `tolerance`/`unit`), then register it in `packages/db/src/themes.ts`. The db test "temas oficiais estão todos consistentes" catches missing values.

## Conventions

- ESLint enforces `consistent-type-imports` (use `import type`), unused vars allowed only with `_` prefix.
- Prettier: double quotes, semicolons, trailing commas, printWidth 100.
- The realtime server must stay deployable as a single bundle (`pnpm --filter @chutai/realtime build` → `dist/index.js` via tsup).
