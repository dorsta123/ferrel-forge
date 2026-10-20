# 010 — Validate user data in Better Auth hooks
**Status:** Accepted · **Date:** 2026-10-20 · **Phase:** security fixes

## Context
Better Auth's sign-up and `/update-user` endpoints accepted any `name` and `image` (security findings #2, #3). Browser-side checks can be bypassed.

## Decision
Validate in `databaseHooks.user.create.before` and `update.before` in `apps/web/src/lib/auth.ts`, the path every user write takes. Names are normalized and limited to 1–60 chars (`lib/display-name.ts`); `image` is always set to null until avatar uploads exist.

## Alternatives considered
Validation in forms only (bypassable); a custom sign-up endpoint (duplicates Better Auth).

## Consequences
- Better Auth merges hook results **over** the request (`{ ...request, ...hookData }`): to strip a field, overwrite it; omitting it keeps the attacker's value (found by testing).
- `name` is `undefined` in update hooks when it isn't being changed.
