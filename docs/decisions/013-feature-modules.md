# 013 — Feature modules: pure rules, a service, thin actions
**Status:** Accepted · **Date:** 2026-10-20 · **Phase:** 3

## Context
The user asked for everything new to be modular, in separate files. Server Actions mixed with business logic are hard to test (they need a browser and a session) and hard to review.

## Decision
Each feature lives in `apps/web/src/features/<feature>/`, split by job:

| File | Job | Runs in |
|---|---|---|
| `rules.ts` | Pure validation (+ unit tests) | Browser and server |
| `types.ts` | Result shapes shared by server and browser | Both (types only) |
| `track-access.ts` (or similar) | Ownership-checked data access | Server |
| `service.ts` | The logic, given an authenticated user id; no Next.js imports | Server |
| `actions.ts` | `"use server"` wrappers: read the session, sanitize input, call the service, revalidate | Server |
| `use-*.ts` | Client hook (state, network calls) | Browser |
| `*.tsx` | UI component | Browser |

Shared domain constants come from `@ferrel/db/constants`, a separate entry point that never opens a database connection, so browser code can import it.

## Alternatives considered
Logic inside Server Actions (untestable without a browser); one file per feature (grows unreadable).

## Consequences
- Services can be attacked directly in tests with forged inputs (phase 3 step 3 runs 16 such checks).
- Never import `@ferrel/db` (root) from browser code — only `@ferrel/db/constants`.
- `apps/web/vitest.config.ts` mirrors the `@/` path alias for unit tests.
