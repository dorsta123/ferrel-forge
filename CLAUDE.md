# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ferrel-forge is a **non-commercial** licensed music marketplace: creators list tracks, buyers purchase licenses at Roblox-style dynamic prices (limited supply, demand-driven). It must stay $0 to run — only free/open-source tools, Stripe in **test mode only**, no paid services.

Built in phases: 1 scaffold (done) → 2 auth (Auth.js, creator/buyer roles) → 3 listings → 4 audio (worker + FFmpeg previews) → 5 fixed-price checkout (Stripe Connect test mode, ledger, licenses) → 6 dynamic pricing → 7 search/dashboard/extras.

## Commands

Run from the repo root (pnpm + Turborepo):

```sh
pnpm install
pnpm db:up            # docker compose: Postgres :5432, Redis :6379, MinIO :9000 (console :9001)
pnpm db:migrate       # apply Drizzle migrations
pnpm dev              # web on :3000 + worker, in parallel
pnpm test             # vitest (currently only @ferrel/pricing)
pnpm typecheck        # runs `next typegen` first for the web app
pnpm lint
pnpm build
```

- Single package: `pnpm --filter @ferrel/pricing test`, `pnpm --filter @ferrel/web dev`
- Single test: `pnpm --filter @ferrel/pricing exec vitest run -t "rises as supply"`
- Schema change: edit `packages/db/src/schema.ts`, then `pnpm db:generate` (writes SQL to `packages/db/drizzle/`) and `pnpm db:migrate`. Commit the generated migration.
- `pnpm db:studio` opens Drizzle Studio to browse the database.

All env vars live in the **root** `.env` (copy from `.env.example`). The web app loads it in `next.config.ts`, the worker via `tsx --env-file`, drizzle-kit in `drizzle.config.ts`.

## Architecture

```
apps/web         Next.js 16 (App Router, Tailwind v4) — pages + API routes
apps/worker      BullMQ worker (Node, run with tsx) — slow/scheduled jobs off Redis queues
packages/db      Drizzle schema + shared `db` client (postgres.js)
packages/pricing Pure pricing engine
```

- Internal packages are consumed as **TypeScript source** (`"exports": "./src/index.ts"`, no build step). The web app lists them in `transpilePackages`; the worker runs them through tsx. New internal packages need adding to both `package.json` deps (`workspace:*`) and `transpilePackages`.
- **Pricing engine must stay pure** — no DB, Redis, or clock access. Inputs in, price out, so it can be unit-tested and replayed against sales history. Callers (web/worker) gather inputs.
- **Web → worker** communication is only through BullMQ queues in Redis. Queue names are defined in `apps/worker/src/queues.ts`; one queue per kind of work.
- Planned money/licensing rules (phases 5–6): lock a price quote in Redis (~60s) at checkout and charge exactly that; record every money movement in a double-entry ledger table rather than mutating balances; a license is its own record separate from the audio file; master audio files stay in a private bucket and are served only via signed URLs, previews in a public bucket.

## Next.js 16 specifics

This Next.js version differs from older training data — read `apps/web/AGENTS.md` and the bundled docs in `apps/web/node_modules/next/dist/docs/` before writing Next code. Key points already hit:

- `cacheComponents` is on: any DB query or other uncached I/O in a Server Component must sit inside `<Suspense>` and call `await connection()` (from `next/server`) first, or be cached with `"use cache"`.
- `LayoutProps` / `PageProps` are generated globals — `next typegen` must run before `tsc` (the `typecheck` script does this).
- ESLint's `react-hooks/error-boundaries` rule forbids building JSX inside `try/catch`; do the fallible work in a helper that returns data or an error, then render.

## Tooling notes

- pnpm requires explicit approval for dependency install scripts: add them under `allowBuilds` in `pnpm-workspace.yaml` (`true` to allow, `false` to silence) or install fails with `ERR_PNPM_IGNORED_BUILDS`.
- TypeScript is pinned to `^5` to match Next.js — don't upgrade to 7.
- Windows dev machine; FFmpeg is not installed yet (needed from phase 4).
