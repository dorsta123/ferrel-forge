# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Start here

Before starting work, read `docs/PRODUCT.md` (what we are building, the agreed stages, open product questions), `docs/ROADMAP.md` (current phase and next step) and the current phase file in `docs/phases/`. `docs/decisions/` explains *why* things are built as they are; `docs/security.md` tracks findings, including open ones. After finishing a step: tick it in the phase file, update `ROADMAP.md`, and add a numbered decision record for any new non-obvious choice. Workflow: plan first and get the user's approval before writing code; build new code as small single-purpose modules in separate files; the user approves every commit, push and merge.

## Project

ferrel-forge is a **non-commercial** music licensing marketplace for advertisers: artists list tracks; advertisers license them for paid ads on Instagram/TikTok/Google and pay **postpaid, monthly** for metered **exposure-seconds** (views × seconds watched) at a rate from a pricing model (city income, demand, culture, capped AI trend score), **locked per license**. We only read ad stats, never stop ads. Each paid invoice is settled automatically to all of a track's contributors by their accepted percentage split (docs/decisions/019). Ad platforms and market data are **simulated** behind real adapter interfaces. It must stay $0 to run — only free/open-source tools, Stripe in **test mode only**, no paid services. The product was redefined after phase 3 (docs/decisions/016–018); phase 3's copies/supply columns and UI are obsolete and get replaced in phase 5.

Built in phases: 1 scaffold (done) → 2 auth (done: Better Auth — Auth.js now recommends it for new projects — email+password; a user is a creator iff they have a `creator_profiles` row) → 3 listings (done: tracks table, private master uploads, create/edit/publish releases, creator dashboard list, public Explore/creator/release pages) → 4 audio (worker + FFmpeg previews) → 5 licensing (advertiser accounts, rate locked per license, card saved in Stripe test mode) → 6 ad-platform simulator + daily exposure metering → 7 monthly billing + ledger → 8 pricing model (v1 formula, v2 ML on simulated data) → 9 extras.

## Commands

Run from the repo root (pnpm + Turborepo):

```sh
pnpm install
pnpm db:up            # docker compose: Postgres :5432, Redis :6379, RustFS (S3-compatible) :9000 (console :9001) — all bound to 127.0.0.1, images pinned
pnpm db:migrate       # apply Drizzle migrations
pnpm storage:setup    # create RustFS buckets (masters private, previews public-read) + upload CORS; idempotent
pnpm dev              # web on :3000 + worker, in parallel
pnpm test             # unit tests (vitest), no services needed
pnpm test:integration # services/queries with forged input, DB constraints, storage security (needs pnpm db:up)
pnpm e2e              # Playwright browser journeys with the installed Chrome (needs pnpm db:up; starts dev server if not running)
pnpm typecheck        # runs `next typegen` first for the web app
pnpm lint
pnpm build
```

- Single package: `pnpm --filter @ferrel/pricing test`, `pnpm --filter @ferrel/web dev`
- Single test: `pnpm --filter @ferrel/pricing exec vitest run -t "rises as supply"`; one e2e file: `pnpm --filter @ferrel/e2e exec playwright test specs/catalog.spec.ts`; failure report: `pnpm --filter @ferrel/e2e run report`
- Tests (docs/decisions/020): unit tests sit next to the code (`*.test.ts`); integration tests in `apps/web/tests/integration/` (helpers in `support.ts`); e2e in `e2e/specs/` using `open()` from `e2e/helpers/fixtures.ts` (fresh session per call, theme/viewport options, fails on console errors unless `allow`ed). Test accounts must use `e2e.*@example.com` (helpers do this); the e2e run purges them before and after. Restart the dev server after `pnpm install` before running e2e: a stale server once produced false Next.js validation errors.
- Schema change: edit the domain file in `packages/db/src/schema/` (`auth.ts`, `creators.ts`, `tracks.ts`, one table group per file, re-exported by `schema/index.ts`), then `pnpm db:generate` (writes SQL to `packages/db/drizzle/`) and `pnpm db:migrate`. Commit the generated migration.
- `pnpm db:studio` opens Drizzle Studio to browse the database.

All env vars live in the **root** `.env` (copy from `.env.example`). The web app loads it in `next.config.ts`, the worker via `tsx --env-file`, drizzle-kit in `drizzle.config.ts`.

## Architecture

```
apps/web         Next.js 16 (App Router, Tailwind v4) — pages + API routes
apps/worker      BullMQ worker (Node, run with tsx) — slow/scheduled jobs off Redis queues
packages/db      Drizzle schema (src/schema/, one domain per file), shared domain constants (src/constants/: genres, keys, limits for DB checks, validation and UI), db client
packages/pricing Pure pricing engine
packages/storage S3 client for RustFS (config, client, buckets, policies, setup); used by web uploads and the worker
```

- Internal packages are consumed as **TypeScript source** (`"exports": "./src/index.ts"`, no build step). The web app lists them in `transpilePackages`; the worker runs them through tsx. New internal packages need adding to both `package.json` deps (`workspace:*`) and `transpilePackages`.
- **Pricing engine must stay pure** — no DB, Redis, or clock access. Inputs in, price out, so it can be unit-tested and replayed against sales history. Callers (web/worker) gather inputs.
- **Auth**: server config in `apps/web/src/lib/auth.ts`, browser helpers in `auth-client.ts`. Server code gets the user only via `getCurrentUser()` (`apps/web/src/lib/session.ts`), which reads the session cookie, so callers must sit inside `<Suspense>`. Authorize inside each page/Server Action next to the data, never only in the header. After a Server Action changes something the header shows, call `revalidatePath("/", "layout")` before `redirect()` or the layout stays stale.
- **User data validation** lives in Better Auth `databaseHooks` in `auth.ts` (sign-up *and* the `/update-user` endpoint both write users). Display names: `lib/display-name.ts` (normalized, 1–60 chars). `image` is forced to null until avatar uploads exist. Hooks are merged as `{ ...request, ...hookData }` — to strip a field, overwrite it (e.g. `image: null`); omitting the key keeps the request value.
- **Feature modules** (`apps/web/src/features/<name>/`): `rules.ts` (pure, shared browser/server), `types.ts`, data access, `service.ts` (logic given an authenticated id, no Next imports), `actions.ts` (thin `"use server"` wrappers), `use-*.ts` hook, components — see docs/decisions/013. Browser code imports domain constants from `@ferrel/db/constants`, never `@ferrel/db` (which connects to the database).
- **Web → worker** communication is only through BullMQ queues in Redis. Queue names are defined in `apps/worker/src/queues.ts`; one queue per kind of work.
- Planned licensing/money rules (phases 5–8): each license stores its locked rate, the pricing feature snapshot it was quoted from, and the contributor split version in force; splits are integer basis points totalling 10,000, every contributor must accept, and settlement (on invoice paid → fee → split → ledger → Stripe Connect test transfer, held balance if no payout account) must be idempotent with shares summing exactly to the amount paid; exposure is recorded per license per day (per city when available) and invoices are computed from those rows, rounding once per invoice line; every money movement goes in a double-entry ledger table rather than mutating balances; a license is its own record separate from the audio file; master audio stays in a private bucket served only via signed URLs, previews in a public bucket; anything simulated is labelled as such.

## Next.js 16 specifics

This Next.js version differs from older training data — read `apps/web/AGENTS.md` and the bundled docs in `apps/web/node_modules/next/dist/docs/` before writing Next code. Key points already hit:

- `cacheComponents` is on: any DB query or other uncached I/O in a Server Component must sit inside `<Suspense>` and call `await connection()` (from `next/server`) first, or be cached with `"use cache"`.
- `LayoutProps` / `PageProps` are generated globals — `next typegen` must run before `tsc` (the `typecheck` script does this).
- ESLint's `react-hooks/error-boundaries` rule forbids building JSX inside `try/catch`; do the fallible work in a helper that returns data or an error, then render.

## Tooling notes

- pnpm requires explicit approval for dependency install scripts: add them under `allowBuilds` in `pnpm-workspace.yaml` (`true` to allow, `false` to silence) or install fails with `ERR_PNPM_IGNORED_BUILDS`.
- TypeScript is pinned to `^5` to match Next.js — don't upgrade to 7.
- BullMQ 6 needs an explicit `ioredis` client instance (see `apps/worker/src/queues.ts`); passing `{ url }` options fails under ESM.
- MinIO no longer publishes free Docker images; RustFS is the local S3 stand-in.
- Never name a package script `setup`: `pnpm setup` is a pnpm built-in that edits the user PATH (the storage script is `setup-buckets`). Prefer `pnpm run <script>` in root scripts.
- Signed upload URLs only sign `host` + `content-length` by default; pass `signableHeaders: new Set(["content-type", "content-length"])` to `getSignedUrl` so storage rejects a different content type.
- shadcn/ui here is the `base-nova` style on **Base UI** (not Radix): no `asChild`; menus use `Menu.LinkItem` with `render={<Link />}`, and `Menu.GroupLabel` must sit inside a `Group`. To style a `<Link>` as a button, use `className={buttonVariants(...)}` — `buttonVariants` is wrapped in `cn` (see `components/ui/button.tsx`) so passed classes override base ones; keep that wrapper if shadcn regenerates the file. Components import `cn` from the `cn` package (pinned to an exact version).
- Theme: "Ember Forge" tokens live in `globals.css` (`:root` = light, `.dark` = dark; brand utilities `text-molten`, `ember-glow`, `grain`, `text-brand-text`). `next-themes` toggles the `dark` class, default dark. Chart colors `--chart-1` were checked with the dataviz palette validator against both surfaces. No `Math.random()`/`new Date()` in prerendered components (cacheComponents) — decorative shapes are deterministic.
- Browser tests: React streams Suspense content via a hidden `S:n` holder, so for a moment two copies exist — scope Playwright locators to `main`; pass `caret: "initial"` to screenshots (the default injects styles that cause hydration mismatches); wait for `networkidle` before typing into a form or text typed before hydration is lost.
- Forms with controlled `<select>`s must not use `<form action={formAction}>`: React 19 resets the form after submit and the selects then show their first option while state holds another. Submit via `onSubmit` + `startTransition(() => formAction(formData))` (see `features/releases/release-form.tsx`).
- Release status rules (publish / unpublish / archive / delete, URL and sale locks) live in `features/releases/status.ts` and are repeated in the service's `WHERE` clauses — see docs/decisions/014.
- Git Bash rewrites `/absolute/paths` passed to `docker compose exec`; prefix with `MSYS_NO_PATHCONV=1`.
- Public pages (`features/catalog/`) select display columns only (never `audio_key` or owner ids), validate URL input in `params.ts`, and render fresh per request — see docs/decisions/015. `notFound()` inside Suspense can't set a 404 status; also call it in `generateMetadata` so crawlers get a real 404.
- Next 16 keeps visited pages mounted (hidden) after client navigation: in Playwright use `locator("main:visible")`.
- If styles look stale or unstyled in dev after changing `globals.css` or adding CSS imports, Turbopack's persistent dev cache is serving old CSS: stop the dev server and delete `apps/web/.next/dev`.
- Windows dev machine; FFmpeg is not installed yet (needed from phase 4).
