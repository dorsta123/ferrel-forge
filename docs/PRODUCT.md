# Product: ferrel-forge

> A marketplace for limited-run music licenses, where every sale makes the next copy cost more.

**Status:** non-commercial portfolio project · $0 to run · payments in Stripe **test mode** only ([decision 001](decisions/001-non-commercial-zero-cost.md)).
**Defined:** 2026-10-17 (stack and stages), refined through 2026-10-20.

## Problem

Independent musicians and producers sell licenses for their tracks (for videos, podcasts, games, content) at **fixed prices**. A fixed price is a guess: too high scares off early fans, too low leaves money on the table when a track takes off. There's also no reward for discovering a track early.

## Core idea

Borrowed from Roblox "limited" items:

1. A creator releases a track with a **limited number of license copies** (for example 100) and a **starting price**.
2. **Every sale raises the price** of the next copy. Fewer copies left, higher price.
3. **Early supporters pay the least**, and scarcity makes each license feel worth more.
4. When the copies are gone, they're gone.

### How the price moves (concept agreed at the start)

- The price **rises as fewer copies remain**.
- It rises **faster when sales come in quickly** (hot demand).
- If **nobody buys for a while, the price slowly drifts back down**.
- When a buyer clicks **Buy**, the price is **locked for 60 seconds** so it can't change while they pay.

Today the engine implements only the first rule as a placeholder (a straight line from the starting price to 2× at the last copy). The full formula is built in stage 6 — see open question 2.

## Users

| User | Who | Wants |
|---|---|---|
| **Creator** | Independent producers, beatmakers, artists | Fair pricing that grows with demand; a simple way to release; a public profile |
| **Buyer** | Content creators, video makers, podcasters, fans | A clear license, a visible price curve, and a reward for getting in early |

Every account can buy. Becoming a creator is opt-in ([decision 005](decisions/005-creator-as-profile-row.md)).

## Core loop

```
Creator lists a limited run ──► Buyer sees price + copies left ──► Buys (price locked 60s)
          ▲                                                              │
          └──── price rises · fewer copies · creator earns ◄─────────────┘
```

## Stages (agreed at the start, 2026-10-17)

Each stage ends with something you can see working.

| # | Stage | What gets built | Done when you can… | Status |
|---|---|---|---|---|
| 1 | **Scaffold** | Monorepo, Next.js app, Docker Compose, database connection, CLAUDE.md | Open a homepage that reads from Postgres | ✅ |
| 2 | **Accounts** | Login, creator / buyer roles | Sign up, log in, become a creator | ✅ |
| 3 | **Listings** | Track tables, upload form, track pages | Upload a track as a creator and see it in the marketplace | ⏳ |
| 4 | **Audio** | Worker + BullMQ + FFmpeg previews, waveform player | Press play on a watermarked preview | ⬜ |
| 5 | **Fixed-price buying** | Stripe test-mode checkout, ledger, license records | Buy a track with a test card and receive a license | ⬜ |
| 6 | **Dynamic pricing** | Pricing engine, price recalculation job, price locks, live updates | Watch the price rise as copies sell | ⬜ |
| 7 | **Extras** | Search, creator dashboard, license PDFs, resale (if wanted) | Use it as a full marketplace | ⬜ |

**Why this order:** buying (5) comes before dynamic pricing (6) because pricing is just the formula that decides the number — the purchase flow, ledger and licenses must work first.

Detailed plans and progress: [ROADMAP.md](ROADMAP.md) and [phases/](phases/).

### Changed since the start

| Originally | Now | Why |
|---|---|---|
| Auth.js | Better Auth | Auth.js joined Better Auth, which is recommended for new projects ([003](decisions/003-better-auth.md)) |
| A `role` for creator / buyer | Creator = has a profile row | Creators need extra fields; avoids clashing with admin roles ([005](decisions/005-creator-as-profile-row.md)) |
| MinIO for local storage | RustFS (S3 protocol) | MinIO stopped publishing free images ([004](decisions/004-rustfs-and-s3-protocol.md)) |
| — | Ember Forge redesign + security fixes between stages 2 and 3 | Portfolio-quality UI; review found local exposure and unchecked input ([interlude](phases/interlude-redesign-and-security.md)) |

## Stack (agreed at the start, adapted for $0)

| Layer | Choice |
|---|---|
| Monorepo | pnpm + Turborepo |
| Web | Next.js + TypeScript, Tailwind, shadcn/ui |
| Audio UI | wavesurfer.js (stage 4) |
| Database | PostgreSQL + Drizzle ORM |
| Cache / live state / queues | Redis + BullMQ worker |
| Payments | Stripe Connect, **test mode** |
| File storage | RustFS locally; Cloudflare R2 free tier if deployed |
| Audio processing | FFmpeg in the worker (stage 4) |
| Auth | Better Auth |
| Search | Postgres full-text search (stage 7) |
| Live prices | Server-sent events (stage 6) |
| Hosting (optional) | Vercel Hobby (allowed because non-commercial) |

## Principles

- **Money is exact and auditable:** integer cents, a double-entry ledger, no mutable balances ([006](decisions/006-money-in-cents-and-pure-pricing.md)).
- **A license is its own record**, separate from the audio file.
- **Master audio is never public**; previews are watermarked.
- **Honest UI:** no fake tracks, sales or stats; demo charts run the real pricing engine.
- **The pricing engine is pure**, so curves can be tested and replayed against real sales history.

## Non-goals (for now)

Real money and payouts · audio fingerprinting (paid) · license tiers ([007](decisions/007-one-license-type.md)) · uploaded cover art ([008](decisions/008-generated-cover-art.md)) · a cash-out virtual currency · email verification (needs an email service) · mobile apps.

## Success metrics (draft)

| Metric | Target / why |
|---|---|
| Time for a new creator to publish a release | Under 3 minutes |
| Share of a release's copies sold in its first week | Tests whether scarcity creates urgency |
| Track page → purchase conversion | Does seeing the price curve help or hurt buying? |
| Average price paid vs starting price | How much value dynamic pricing captures for creators |

## Open questions

Not yet decided. Answers become decision records.

| # | Question | Needed by |
|---|---|---|
| 1 | **Resale:** can buyers resell licenses (secondary market, with a creator royalty), or only the creator sells? | Stage 5 (data model) |
| 2 | **Exact price formula:** how steep the curve near sell-out, how much sales speed matters, how fast prices drift down without sales | Stage 6 |
| 3 | **Platform fee:** what cut the marketplace takes (even in test mode) | Stage 5 |
| 4 | **License terms:** what a license allows (personal, YouTube/podcasts, commercial) in plain English | Stage 5 |
| 5 | **Copyright:** what stops uploads of music the creator doesn't own — report button + manual review, or more? | Before going public |
| 6 | **Refunds:** allowed? Does a refunded copy return to supply and lower the price? | Stage 5 |
