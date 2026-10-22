# 020 — Three test layers, all in the repo
**Status:** Accepted · **Date:** 2026-10-21 · **Phase:** after 3

## Context
Phases 1–3 were verified by about 300 browser, data and security checks written as throwaway scripts in a session scratchpad, outside the repo. They would be lost with the session, and the upcoming realignment of phase 3 changes much of what they cover.

## Decision
Three layers, each with one command:

| Layer | Command | Needs | What it covers |
|---|---|---|---|
| Unit | `pnpm test` | Nothing | Pure rules: validation, slugs, money, status rules, pricing, covers (Vitest, `src/**/*.test.ts` in each package) |
| Integration | `pnpm test:integration` | Docker (`pnpm db:up`) | Services and queries called directly with forged input; database constraints; storage security (Vitest, `apps/web/tests/integration/`) |
| End to end | `pnpm e2e` | Docker; starts the dev server if it isn't running | Real browser journeys in both themes and on a phone (Playwright with the installed Chrome, `e2e/specs/`) |

- **Isolation:**
  - Every test account uses an `e2e.*@example.com` email.
  - Integration tests remove their own data.
  - The e2e suite purges all test accounts, their tracks and their audio both before and after a run, so an interrupted run can't leave data behind.
  - Real accounts are never touched.
- **Console errors fail browser tests**, unless a page explicitly allows a known message (for example, an expected 404 or 422).
- Both database-backed layers run **one test file at a time**, because they share one database and some tests count what is public.
- `pnpm test` stays fast and needs no services. The e2e package deliberately has no `test` script, so Turborepo never runs it there.

## Alternatives considered
- Keep scratch scripts: lost with the session, and no proper reporting.
- Playwright for everything: service and database checks are faster and more precise when called directly.
- Downloading Playwright's own browsers: unnecessary, since the installed Chrome works and saves a large download.

## Consequences
- New features add tests at the right layer. Rules go in unit tests; anything an attacker could forge goes in integration tests.
- When dependencies change (`pnpm install`), restart the dev server before running e2e. A stale server produced false errors once.
- No CI yet. These commands are run locally before each commit.
