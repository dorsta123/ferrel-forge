# Roadmap

**ferrel-forge** — a non-commercial music licensing marketplace for advertisers. Artists list tracks; advertisers license them for paid ads on Instagram, TikTok and Google/YouTube and pay monthly for metered **exposure** (views × seconds watched) at a rate set by a pricing model and locked per license. Ad platforms and market data are simulated. Must cost $0 to run (see [decision 001](decisions/001-non-commercial-zero-cost.md)). Full product definition: [PRODUCT.md](PRODUCT.md). The product was redefined on 2026-10-20 ([decision 016](decisions/016-metered-exposure-licensing.md)); phases 1–3 were built for the earlier "limited copies" model and mostly carry over.

**Current:** Phase 4 — Audio ([plan](plans/2026-10-25-phase-4-audio.md), [decision 022](decisions/022-audio-previews.md)), built in 12 small slices. Slices 1 (FFmpeg spike) and 2 (`packages/audio`: verified FFmpeg, safe runner, length + waveform) are done, and slice 3 (audio result columns with database rules, [decision 025](decisions/025-audio-result-columns.md)). Slice 4 (web → worker queue, [decision 026](decisions/026-audio-queue.md)) is done too. Slice 5 (the worker measures each song: length + waveform, [decision 027](decisions/027-measuring-songs.md); slice 7 folded in) is done. Slice 6 (the 15-second preview, [decision 028](decisions/028-previews.md)) is done. Slice 8 (the live audio status in the editor, Try again, publishing blocked while Failed) is done. Next: slice 9, the start-point picker and preview on/off. Phase 3, including its realignment, is complete.

| Phase | Scope | Status |
|---|---|---|
| 1 | [Scaffold](phases/phase-1-scaffold.md) — monorepo, Postgres/Redis/storage in Docker, worker, pricing engine stub | ✅ Done 2026-10-17 |
| 2 | [Auth](phases/phase-2-auth.md) — sign-up/in/out, creator profiles, creators-only dashboard | ✅ Done 2026-10-19 |
| — | [UI redesign + security fixes](phases/interlude-redesign-and-security.md) — Ember Forge theme; localhost-only services, input validation | ✅ Done 2026-10-20 |
| 3 | [Listings](phases/phase-3-listings.md) — tracks table, storage, secure upload, create/publish releases, explore + public pages | ✅ Done 2026-10-20 |
| 4 | Audio — 15 s watermarked previews (creator picks the start; optional), waveform player, track length, listen links, cleanup of abandoned uploads | ⏳ In progress |
| 5 | Licensing — contributors and percentage splits (invite links, everyone accepts); advertiser accounts; license flow (track, platforms, cities, term); rate and split locked per license (artist base rate until phase 8); card saved in Stripe test mode; license records; master download; replace phase 3's copies/supply with the new model | Not started |
| 6 | Ad simulator + metering — simulated Instagram/TikTok/Google behind a real adapter interface; campaigns linked to licenses; daily exposure-seconds by city | Not started |
| 7 | Billing + settlement — monthly invoices from exposure × locked rate, Stripe test-mode charges, double-entry ledger, automatic split to every contributor as each invoice is paid (Stripe Connect test-mode transfers), held balances, earnings pages | Not started |
| 8 | Pricing model — city/country income, demand, culture, capped AI trend score; v1 formula then v2 ML on simulated history; artist custom rate + earnings forecast | Not started |
| 9 | Extras — search, license PDFs, admin tools, profile/slug editing, optionally one real platform connector (sandbox) | Not started |

## Before any deployment

- Rate limiting on sign-in/sign-up (security finding #4) — see [security.md](security.md).
- Swap RustFS for an S3-compatible host (e.g. Cloudflare R2 free tier) via `.env` only.

## Git conventions

- From 2026-10-23: see [WORKFLOW.md](WORKFLOW.md). A plan in `docs/plans/`, a branch per piece of work, a commit per working step, a PR with CI and independent review, and the user merges on GitHub. (Phases 1–3 used one commit per phase, merged locally.)
