# 005 — "Creator" means having a creator_profiles row
**Status:** Accepted · **Date:** 2026-10-19 · **Phase:** 2

## Context
Every user can buy; some also sell. Creators need extra fields (artist name, slug, bio, later payout details).

## Decision
No `role` column. A user is a creator **iff** a `creator_profiles` row exists for them. "Become a creator" creates that row.

## Alternatives considered
A `role = 'creator'` column on `users` — mostly-empty creator fields on buyers, and a clash with Better Auth's admin plugin `role`.

## Consequences
- `getCurrentUser()` returns `creator: {...} | null`.
- `tracks.creator_id` references `creator_profiles` with **RESTRICT**, so a creator with releases can't be deleted.
