# Phase 1 — Scaffold ✅

**Done:** 2026-10-17 · **Commits:** `5fccb8f`, `9d6618e`

## Goal
An empty but running skeleton: every part starts, connects, and is testable.

## Built
- pnpm + Turborepo monorepo: `apps/web` (Next.js 16), `apps/worker` (BullMQ), `packages/db` (Drizzle), `packages/pricing` (pure pricing engine, placeholder formula + tests).
- `docker-compose.yml`: Postgres, Redis, object storage.
- Homepage that read from Postgres; worker that answered a `ping` job.
- `CLAUDE.md` for future sessions.

## Learned
- Next.js 16 with `cacheComponents` needs DB reads inside `<Suspense>` after `await connection()`.
- MinIO stopped publishing free Docker images → switched to RustFS ([decision 004](../decisions/004-rustfs-and-s3-protocol.md)).
- BullMQ 6 needs an explicit `ioredis` client under ESM.
- Docker Desktop needed WSL installed first.

## Decisions
[002 monorepo](../decisions/002-monorepo-turborepo-pnpm.md) · [004 RustFS/S3](../decisions/004-rustfs-and-s3-protocol.md) · [006 cents + pure pricing](../decisions/006-money-in-cents-and-pure-pricing.md)
