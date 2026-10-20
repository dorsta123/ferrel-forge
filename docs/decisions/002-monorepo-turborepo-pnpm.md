# 002 — TypeScript monorepo: pnpm + Turborepo
**Status:** Accepted · **Date:** 2026-10-17 · **Phase:** 1

## Context
The web app, background worker and pricing engine need to share types and code.

## Decision
One repo: `apps/web` (Next.js), `apps/worker` (BullMQ), `packages/*` (db, pricing, storage). Internal packages are consumed as TypeScript source (no build step). pnpm workspaces + Turborepo run tasks across packages.

## Alternatives considered
Separate repos (duplicated types, version drift); a single Next.js app doing everything (slow jobs would block web requests).

## Consequences
- New internal packages must be added to `transpilePackages` in the web app.
- TypeScript pinned to `^5` to match Next.js.
- Never name a package script `setup` — `pnpm setup` is a pnpm built-in that edits the user PATH.
