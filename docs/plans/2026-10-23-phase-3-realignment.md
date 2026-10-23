# Plan: phase 3 realignment

**Status:** Approved by the user 2026-10-23 · **PRs:** A (remove copies and supply), B (pricing placeholder + homepage copy) · **Why:** phase 3 was built for "limited copies whose price rises per sale". The product is now metered exposure licensing for advertisers ([016](../decisions/016-metered-exposure-licensing.md)), so the copies/supply parts are wrong and misleading.

## Decisions taken (user, 2026-10-23)
- **Hide the price publicly** until pricing is decided (PRODUCT.md open question 15). Public pages say "Licensing opens soon". The artist still enters and sees their own rate in the dashboard, as a placeholder.
- **Rewrite the homepage** for the new model: artist lists → advertiser licenses → pays for exposure → contributors paid automatically.

## Scope

### PR A: remove copies and supply
- **Database:** migration dropping `total_supply`, `copies_sold` and their two checks; add `duration_ms` (empty until phase 4 fills it). `base_price_cents` stays as the artist's placeholder rate.
- **Release rules:**
  - Remove the Copies field.
  - "Starting price" becomes "Base rate", private to the artist.
  - Drop the "copies and price lock after the first sale" rule.
  - Unpublish is allowed for any published release, and delete for any draft. Checks based on licenses arrive in phase 5.
- **What people see:**
  - Cards, release page and dashboard rows lose "N of M left", "Sold out", the supply bar and the price.
  - The release page shows track length (once known) and **"Licensing opens soon"**.
  - Dashboard stats: Releases · Published · **Active licenses** (0 until phase 5).
- **Public queries** stop selecting price and supply.
- **Tests and docs:** tests updated; decision 021 (amends 014 and 015).

### PR B: pricing placeholder + homepage
- `packages/pricing`: `quotePrice` (copies curve) is replaced by `quoteRate({ baseRateCents })`, which returns the rate plus an empty factor list (the shape from decision 018).
- **Homepage:**
  - A new hero and "how it works" for advertisers and artists.
  - The copies price-curve demo is removed; the sign-in side panel stops using it.
  - The footer, Explore and become-creator copy are updated.
- Tests and ARCHITECTURE.md updated.

Not in scope: licenses, contributors, real pricing, audio previews.

## Acceptance criteria
- [x] No page shows copies, "left", "sold out", a supply bar or a public price.
- [x] Release pages show "Licensing opens soon"; archived ones still say "No longer for sale".
- [x] Artists can still set and edit their base rate in the dashboard, and see it on their rows.
- [x] Published releases can be unpublished; drafts can be deleted (no sale-based locks).
- [x] The database has no `total_supply`/`copies_sold`; `duration_ms` exists. Existing tracks survive the migration.
- [x] The homepage explains the new model, with no copies demo.
- [ ] All test layers pass in CI.

## Risks
- **The migration drops two columns.** Their only data is test data plus one real release, with no sales. That release keeps everything else.
- **Wide UI change:** e2e covers every public page and the dashboard.
