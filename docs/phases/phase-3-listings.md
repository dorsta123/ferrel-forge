# Phase 3 — Listings ✅

**Started:** 2026-10-20 · **Finished:** 2026-10-20 · **Branch:** `phase-3-listings` (merged into `main`, then deleted)

## Goal
A creator can create a release, upload its audio, and publish it; anyone can find it and see its current price. Success metric: a creator publishes a release in under 3 minutes.

## Approved decisions
| Topic | Choice | Record |
|---|---|---|
| Audio | Upload now, stored privately; playback in phase 4 | [012](../decisions/012-direct-browser-uploads.md) |
| License types | One per track for now | [007](../decisions/007-one-license-type.md) |
| Cover art | Generated from the track id, no uploads | [008](../decisions/008-generated-cover-art.md) |
| Limits | 1–1,000 copies · $1–$500 start price · title ≤100 · description ≤2,000 · BPM 40–250 | `packages/db/src/constants/tracks.ts` |
| Genres | Fixed list: Hip-hop, Electronic, Lo-fi, Pop, Rock, R&B, Ambient, Cinematic, Other | same file |
| Audio files | WAV / MP3 / FLAC, ≤150 MB | same file |
| Track URLs | `/creators/<creator>/<track>`; track slug editable as draft, **locked once published** | [009](../decisions/009-slug-rules.md) |
| Code layout | Small single-purpose modules in separate files | — |

## Steps
1. ✅ **Tracks table** — split `packages/db` into `schema/` (one domain per file) + `constants/`; new `tracks` table with 4 enums, 3 indexes, 10 check constraints; migrations `0002` (clear demo row) and `0003_listings`. All 15 constraint tests pass.
2. ✅ **Storage** — `packages/storage` (config, client, buckets, policies, setup); `pnpm storage:setup` creates `masters` (private) and `previews` (public-read) + upload CORS. Browser direct upload confirmed; 10/10 storage security checks.
3. ✅ **Secure audio upload** — `packages/storage` gained `upload-url`, `objects`, `audio-signature`, `keys`; web feature module `features/audio-upload/` (rules, track-access, service, actions, hook, field) per [decision 013](../decisions/013-feature-modules.md). Signed link (5 min, exact size + type, own folder) → direct upload with progress/cancel → server checks size + file-signature bytes, records it, deletes the replaced file. Minimal `/dashboard/tracks/[id]` hosts the field (step 4 grows it). Tests: 16 storage unit, 19 new web unit, 16 forged-request attacks, 14 browser checks; all earlier suites still pass (74/74 twice).
4. ✅ **Create / edit release** — feature module `features/releases/` (slug, money, labels, rules, status, form-values, preview-values, service, actions, hooks, form, preview, actions panel, status badge); shared `features/tracks/` (track access, current creator), `components/track/` (generated cover + card, reused in step 6), `lib/pg-error.ts`. `/dashboard/tracks/new` with live card preview; `/dashboard/tracks/[id]` with status, actions, audio and details. Lifecycle and locks in [decision 014](../decisions/014-release-lifecycle.md). Dashboard "New release" button (the list itself is step 5). Tests: 69 new unit, 28 forged-request attacks, 28 browser checks; all earlier suites pass twice.
5. ✅ **Dashboard track list** — feature module `features/creator-tracks/` (filters, row-view, queries, status-tabs, track-row, empty-state, creator-releases). Releases newest-edited first, capped at 100; filter tabs with counts via `?status=` (unknown values fall back to all); rows show cover, status, genre, edited time, "Needs audio", current price (pricing engine) or "Sold out", copies left; whole row opens the editor. Stats are real: Releases · Published · Copies sold (Earnings returns in phase 5 with real sales). Tests: 23 new unit, 11 data checks (isolation between creators, filters, counts, cap), 19 browser checks; all earlier suites pass twice.
6. ✅ **Public pages** — feature module `features/catalog/` (params, queries, track-href, release-grid, genre-filter, pagination, price-panel, latest-releases). `/explore` (newest first, genre filter, 24/page), `/creators/[slug]` (profile + published releases), `/creators/[slug]/[track]` (big cover, live price from the pricing engine, copies left, disabled "Buying opens soon"; archived = "No longer for sale"; drafts not public), "Latest releases" on the homepage, Explore in header + footer, "view public page" link in the editor. Rules in [decision 015](../decisions/015-public-catalog.md). Tests: 25 new unit, 17 data checks (visibility, no private columns, paging), 30 browser checks; all earlier suites pass twice.
7. ✅ **Tests** — filled the remaining gaps: 30 database-rule checks (invalid rows written directly are refused by each constraint, delete-with-releases is blocked), 17 storage checks (expired, re-pathed, re-bucketed, extended or mismatched upload links refused; anonymous upload/download/delete/listing refused; CORS only for our site), and a 33-check end-to-end journey (create → upload → publish → visitor finds it → edit → sale moves the price → archive) in dark desktop, light desktop and light phone. Final run, twice: 287 browser/data/security checks + 174 unit tests, typecheck, lint, build — all green. *These checks were first written as session scripts; on 2026-10-21 they moved into the repo as `pnpm test:integration` and `pnpm e2e` ([decision 020](../decisions/020-test-layout.md)).*
8. ✅ **Commit, push, merge** — approved by the user; one commit for the phase, merged into `main` with `--no-ff`, branch deleted.

## Realignment (after the product was redefined, 2026-10-23)
Steps 4–6 above describe the original "limited copies" model. The realignment ([plan](../plans/2026-10-23-phase-3-realignment.md), [decision 021](../decisions/021-phase-3-realignment.md)) updated them for metered exposure licensing:
- ✅ **PR A (#3):**
  - Copies and supply removed (migrations 0004–0005, plus `duration_ms`).
  - The artist's rate is a private "Base rate".
  - Public pages say "Licensing opens soon" and show no price.
  - The after-first-sale lock is gone.
  - Dashboard stats: Releases · Published · Active licenses.
- ✅ **PR B:**
  - The homepage and sign-in panel explain exposure licensing, using a labelled example campaign with no prices.
  - The price-curve demo is removed.
  - `packages/pricing` now offers the `quoteRate` placeholder.

## Learned so far
- Signed upload URLs only sign `host` + `content-length` by default; content type is enforced only with `signableHeaders` (found by test — step 2 initially accepted HTML through a WAV link).
- `pnpm setup` is a pnpm built-in that edits the user PATH; a package script named `setup` triggered it. Script renamed to `setup-buckets`. Its changes (user `PNPM_HOME`, `%PNPM_HOME%\bin` at the front of the user PATH, a second pnpm copy in `AppData\Local\pnpm\bin` + `global`) were undone on 2026-10-20; the pnpm `store` was kept.
- Splitting the schema into files produced zero SQL changes for existing tables (verified in the migration).
- `@ferrel/db` (root) opens a DB connection on import; browser code and `packages/storage` must import `@ferrel/db/constants` instead.
- React streams `<Suspense>` content through a hidden holder (`<div hidden id="S:n">`); for ~50 ms two copies exist. Browser tests must scope locators to `main`, and Playwright screenshots need `caret: "initial"` or they alter inputs and cause hydration mismatches.
- Next.js warns when `scroll-behavior: smooth` is set without `data-scroll-behavior="smooth"` on `<html>` (fixed).
- React 19 resets a `<form action={fn}>` after every submit; controlled `<select>`s then *show* their first option while state keeps the real value, so the next save would silently change genre and key. Forms with selects submit via `onSubmit` + `startTransition(() => formAction(formData))` (found by screenshot review).
- A label like `BPM<span>(optional)</span>` has the accessible name "BPM(optional)"; `FormField` adds the space.
- Browser tests must wait for `networkidle` before typing into a controlled form, or React discards the text typed before hydration (caused rare flaky runs).
- In Git Bash, `docker compose exec … /data/…` paths are rewritten to Windows paths; set `MSYS_NO_PATHCONV=1` (Node's `execSync` is unaffected).
- `notFound()` inside a streamed `<Suspense>` can't change the status (already 200); Next adds `noindex`. Calling `notFound()` in `generateMetadata` too gives crawlers a real 404 (metadata blocks for them).
- Next 16 keeps previously visited pages mounted but hidden after client navigation, so `locator("main")` can match two elements; tests use `main:visible`.

## Out of scope
Playback and previews (4), buying (5), price changes (6), search, uploaded covers, license tiers, abandoned-upload cleanup (4).
