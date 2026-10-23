# 021 — Phase 3 realignment: no copies, no public price, no sale locks
**Status:** Accepted · **Date:** 2026-10-23 · **Phase:** 3 (realignment)
**Amends:** [014](014-release-lifecycle.md) (lifecycle locks) and [015](015-public-catalog.md) (public columns). Follows from [016](016-metered-exposure-licensing.md).

## Context
Phase 3 was built for limited copies whose price rises with each sale. Under metered exposure licensing (016) there is no supply and no per-copy sale. Pricing isn't decided yet (PRODUCT.md question 15), so any public price would be a promise we can't keep.

## Decision
- **No supply:** `total_supply` and `copies_sold` are dropped (migration 0004), with their checks. There's no Copies field, and no "N of M left", "Sold out" or supply bar anywhere.
- **Track length:** `duration_ms` is added (migration 0005, null until phase 4 reads it from the audio, at most 4 hours) and shown when known.
- **The rate is private:**
  - `base_price_cents` stays, as the artist's placeholder "Base rate".
  - It is shown only to the artist: in the editor and on their dashboard rows.
  - Public queries don't select it. Cards and release pages show **"Licensing opens soon"** instead.
- **Lifecycle (amends 014):**
  - The "copies and price lock after the first sale" rule is gone.
  - Published releases can always be unpublished, and drafts can always be deleted.
  - The URL lock and "archived is final" stay.
  - Phase 5 adds limits based on active licenses.
- **Dashboard:** the stats are Releases · Published · Active licenses (0 until licensing exists).

## Alternatives considered
- Show the artist's rate publicly without a unit: it looks like a price but means nothing yet, so it would mislead advertisers.
- Keep the columns until phase 5: the UI would keep advertising a model we've dropped.
- Generate both migrations as one: drizzle-kit asks interactively whether a dropped and an added column are a rename. Two migrations avoid the prompt and read more clearly.

## Consequences
- Phase 5 must add license-based rules to `status.ts` and the service's guarded updates, the same way the sale lock worked.
- Phase 4's audio processing fills `duration_ms`.
- Until PR B, the homepage demo still uses the old pricing curve (`quotePrice`).
