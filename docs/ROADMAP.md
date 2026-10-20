# Roadmap

**ferrel-forge** — a non-commercial licensed music marketplace. Creators release a limited number of licenses per track; every sale raises the price of the next copy (Roblox-style scarcity pricing). Must cost $0 to run (see [decision 001](decisions/001-non-commercial-zero-cost.md)). Full product definition and the stages as agreed: [PRODUCT.md](PRODUCT.md).

**Current:** Phase 3 done. Next: move the browser/security test scripts into the repo (proposed), then plan Phase 4 — Audio.

| Phase | Scope | Status |
|---|---|---|
| 1 | [Scaffold](phases/phase-1-scaffold.md) — monorepo, Postgres/Redis/storage in Docker, worker, pricing engine stub | ✅ Done 2026-10-17 |
| 2 | [Auth](phases/phase-2-auth.md) — sign-up/in/out, creator profiles, creators-only dashboard | ✅ Done 2026-10-19 |
| — | [UI redesign + security fixes](phases/interlude-redesign-and-security.md) — Ember Forge theme; localhost-only services, input validation | ✅ Done 2026-10-20 |
| 3 | [Listings](phases/phase-3-listings.md) — tracks table, storage, secure upload, create/publish releases, explore + public pages | ✅ Done 2026-10-20 |
| 4 | Audio — worker + FFmpeg watermarked previews, waveform player, cleanup of abandoned uploads | Not started |
| 5 | Checkout — Stripe Connect **test mode**, double-entry ledger, license records | Not started |
| 6 | Dynamic pricing — real price curve, 60s price-quote lock in Redis, live price updates | Not started |
| 7 | Extras — search, dashboard stats, license PDFs, profile/slug editing, admin tools | Not started |

## Before any deployment

- Rate limiting on sign-in/sign-up (security finding #4) — see [security.md](security.md).
- Swap RustFS for an S3-compatible host (e.g. Cloudflare R2 free tier) via `.env` only.

## Git conventions

- One branch per phase/topic off `main`; commit at the end of the phase; merge with `--no-ff`; delete the branch after merging. The user approves every commit/push/merge.
