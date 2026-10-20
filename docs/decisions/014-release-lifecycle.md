# 014 — Release lifecycle and locks
**Status:** Accepted · **Date:** 2026-10-20 · **Phase:** 3

## Context
Creators need to fix mistakes and take releases down, but buyers and shared links must be able to rely on what was published: the URL, the number of copies and the price they were sold against.

## Decision
```
draft ──publish──▶ published ──archive──▶ archived (final)
  ▲                    │
  └────unpublish───────┘   only while no copies are sold
draft ──delete──▶ gone      only while no copies are sold (its audio file is deleted too)
```
- **Publish** needs an attached audio file. `published_at` is set on the *first* publish and never cleared or moved, so re-publishing doesn't jump the queue on Explore.
- **URL lock:** the slug is fixed once `published_at` is set, even after unpublishing.
- **Sale lock:** copies and starting price are fixed once `copies_sold > 0`; unpublish and delete are no longer offered (archive is).
- **Archived is final and read-only** (restoring could come later as its own feature). Archived releases keep their audio for buyers.
- **Duplicate URL on create** gets `-2`, `-3`, … automatically; on edit it is an error.
- Rules live in one pure module (`features/releases/status.ts`) used for both the buttons and the server check. The service then repeats each rule **inside its UPDATE/DELETE `WHERE`**, so a request racing a sale or another tab can't slip past. Locked fields are taken from the stored row, whatever the request sends.

## Alternatives considered
Freely editable published releases (breaks links and buyers' deal); hard delete of published releases (buyers' licenses would point at nothing); a separate "unlisted" status (not needed yet).

## Consequences
- Checkout (phase 5) must increment `copies_sold` only on `published` tracks; that alone switches the sale lock on.
- Public pages (step 6) list only `published`; what archived tracks show publicly is decided there.
