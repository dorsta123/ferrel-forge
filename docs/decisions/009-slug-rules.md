# 009 — Slug rules
**Status:** Accepted · **Date:** 2026-10-19 (creators), 2026-10-20 (tracks) · **Phases:** 2, 3

## Context
Public URLs use readable slugs: `/creators/dj-ferrel/midnight-run`. Changing a slug breaks every shared link.

## Decision
- **Creator slug:** 3–30 chars, `a-z0-9` with single dashes, globally unique, reserved words blocked (`admin`, `dashboard`, …). Set once; editing deferred to phase 7 (with redirects from old URLs).
- **Track slug:** 1–80 chars, same pattern, unique **per creator**, generated from the title, editable while draft, **locked once published**.

## Alternatives considered
IDs in URLs (unreadable); freely editable slugs (broken links).

## Consequences
The database enforces format and uniqueness; the app enforces reserved words and the publish lock.
