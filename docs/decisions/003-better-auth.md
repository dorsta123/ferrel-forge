# 003 — Better Auth for login
**Status:** Accepted · **Date:** 2026-10-19 · **Phase:** 2

## Context
The original plan said Auth.js. By late 2025 Auth.js had joined Better Auth, whose team recommends Better Auth for new projects.

## Decision
Better Auth with email + password, Drizzle adapter, plural table names, uuid ids. Sessions stored in Postgres.

## Alternatives considered
Auth.js (now in maintenance mode); Clerk (hosted, user limits, extra account).

## Consequences
- Google/GitHub login can be added later as extra rows in `accounts`.
- Admin roles/bans come later via Better Auth's admin plugin (which adds `role` itself — don't hand-roll one).
- Rate limiting is off outside production — must be configured before deploying ([security.md](../security.md) #4).
