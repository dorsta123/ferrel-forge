# Product: ferrel-forge

> Music licensing priced like ad inventory: advertisers license tracks for their ads and pay for the **exposure** the music actually gets, at a rate set by a pricing model.

**Status:** non-commercial portfolio project · $0 to run · payments in Stripe **test mode** only ([decision 001](decisions/001-non-commercial-zero-cost.md)) · ad-platform and market data are **simulated** ([017](decisions/017-simulated-data.md)).
**Defined:** 2026-10-17 · **Redefined:** 2026-10-20 (from "limited copies" to metered exposure licensing, [016](decisions/016-metered-exposure-licensing.md)).

## Problem

Independent artists license music for ads at **flat fees**. A flat fee ignores the ad itself: the same track costs the same in a small local campaign and in a viral national one. The artist is underpaid when an ad takes off, and the advertiser overpays for a campaign nobody sees. Prices also ignore the market: what an ad audience in one city is worth differs widely from another.

## Core idea

1. An **artist** lists tracks and sets a **base rate**. They can keep the model's suggested rate or set a **custom rate**, and they see an **earnings forecast** either way.
2. An **advertiser** (a brand running paid ads) licenses a track for a campaign on **Instagram, TikTok or Google/YouTube**, choosing target cities and the license term.
3. A **pricing model** quotes a rate, for example *$X per 1,000 exposure-seconds*. The rate is **locked for that license**.
4. While the ad runs, we read the platform's delivery stats and meter **exposure-seconds = views × seconds watched**. We **never stop or edit ads**; we only read.
5. **Postpaid:** the advertiser saves a card when licensing and receives a **monthly invoice** for that month's exposure × the locked rate.
6. **Automatic settlement to every contributor** ([019](decisions/019-contributor-splits.md)). A track can have dozens of contributors (producers, vocalists, writers…), each with an agreed percentage. As soon as an invoice is paid, the platform fee comes off, and the rest is split and sent to each contributor automatically (Stripe Connect, test mode). Every contributor must accept their share before the track can be licensed, and each license keeps the split that applied when it started.

### The pricing model's inputs ([018](decisions/018-pricing-model.md))

| Input | Meaning | Source |
|---|---|---|
| Base / custom rate | The artist's starting point | Artist |
| Local income | Per-capita income of the target **city**, falling back to the country where city data doesn't exist | Public datasets (simulated at first) |
| Demand | How many advertisers license this track, genre and artist, and how fast that is growing (replaces the old limited-copies scarcity) | Our own data |
| Culture | How popular the track's genre is in the target city or country | Public chart data (simulated at first) |
| Trends / viral news | A score from an AI that reads news and trend signals. **Capped**, logged with its reason, and can be switched off | AI (simulated at first) |

Staged: **v1** is a transparent formula with capped factors, so every rate can be explained. **v2** is a machine-learning model trained on **simulated** history, clearly labelled as such until real data exists.

## Users

| User | Who | Wants |
|---|---|---|
| **Artist** (creator) | Independent producers and musicians | Paid in proportion to how much their music is actually heard; control over price; a forecast of earnings |
| **Contributor** | Anyone who helped make a track: producer, vocalist, writer, mixer, session musician | Their agreed percentage, paid automatically and transparently, without chasing the lead artist |
| **Advertiser** | Brands and agencies running paid social and video ads | A clear license, a price that fits the market they target, bills that match real exposure |

Becoming an artist stays opt-in ([005](decisions/005-creator-as-profile-row.md)). A contributor only needs a free account, not an artist profile; they join through an invite link from the lead artist. How advertiser accounts work is decided when that stage is planned.

## Core loop

```
Artist lists track + base rate ──► Advertiser picks track, platforms, cities, term
        ▲                                   │  model quotes a rate → locked → card saved
        │                                   ▼
Contributors paid ◄── split by locked % ◄── invoice paid ◄── exposure metered daily (views × seconds watched)
(automatic, ledger)    (after platform fee)
        │
        └── demand, exposure and outcomes feed back into the pricing model
```

## Stages

Stages 1–3 were built for the original "limited copies" product and mostly carry over (accounts, artist profiles, track uploads, catalog). Stages 4 onward are re-planned for the new model. Detailed progress: [ROADMAP.md](ROADMAP.md).

| # | Stage | What gets built | Done when you can… | Status |
|---|---|---|---|---|
| 1 | **Scaffold** | Monorepo, Next.js, Docker Compose, database | Open a homepage that reads from Postgres | ✅ |
| 2 | **Accounts** | Login, artist profiles | Sign up, log in, become an artist | ✅ |
| 3 | **Listings** | Tracks, secure uploads, release management, public catalog | Publish a track and see it in Explore | ✅ |
| 4 | **Audio** | Worker + FFmpeg watermarked previews, waveform player | Press play on a preview | ⬜ |
| 5 | **Licensing** | Contributors and splits (invite links, acceptance); advertiser accounts; license flow (track, platforms, cities, term); rate and split locked per license; card saved in Stripe test mode; license record; master download | Split a track between contributors, then license it and receive the file and license | ⬜ |
| 6 | **Ad simulator + metering** | Simulated Instagram/TikTok/Google ad platforms behind a real adapter interface; campaigns linked to licenses; daily exposure metering by city | Watch a campaign's exposure-seconds grow day by day | ⬜ |
| 7 | **Billing + settlement** | Monthly invoices from metered exposure × locked rate; Stripe test-mode charges; double-entry ledger; automatic split and Stripe Connect transfers to every contributor as each invoice is paid; held balances; earnings pages | Pay an invoice and watch every contributor's share arrive | ⬜ |
| 8 | **Pricing model** | Market data (city income, culture), simulated history, v1 formula, v2 ML model, capped AI trend score, artist custom rate + earnings forecast | See a quote change by city and an artist forecast change with price | ⬜ |
| 9 | **Extras** | Search, license PDFs, admin tools, optionally one real platform connector in sandbox mode | Use it as a full product | ⬜ |

**Why this order:** licensing, metering and billing (5–7) must work before the model (8) decides the number, the same reasoning as "buying before dynamic pricing" originally. Until stage 8, a license's rate is the artist's base rate.

### Changed since the start

| Originally | Now | Why |
|---|---|---|
| Auth.js | Better Auth | Auth.js joined Better Auth, which is recommended for new projects ([003](decisions/003-better-auth.md)) |
| A `role` for creator / buyer | Creator = has a profile row | Creators need extra fields; avoids clashing with admin roles ([005](decisions/005-creator-as-profile-row.md)) |
| MinIO for local storage | RustFS (S3 protocol) | MinIO stopped publishing free images ([004](decisions/004-rustfs-and-s3-protocol.md)) |
| — | Ember Forge redesign + security fixes between stages 2 and 3 | Portfolio-quality UI; review found local exposure and unchecked input ([interlude](phases/interlude-redesign-and-security.md)) |
| **Limited copies, price rises per sale (Roblox-style); buyers are fans and content creators** | **Metered exposure licensing for advertisers; rate from a pricing model; postpaid monthly** | The user's intended product, clarified 2026-10-20 ([016](decisions/016-metered-exposure-licensing.md)) |
| Copies left = scarcity | Licensing demand = a model input | No fixed supply in a metered model ([016](decisions/016-metered-exposure-licensing.md)) |
| Price formula on supply | Model on income, demand, culture, trends, base rate | [018](decisions/018-pricing-model.md) |
| Real platform data | Simulated ad platforms and market data | Real ad APIs need business verification and app review; $0 rule ([017](decisions/017-simulated-data.md)) |
| One owner per track | Lead artist + contributors with accepted percentage splits, settled automatically | User requirement ([019](decisions/019-contributor-splits.md)) |

## Stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm + Turborepo |
| Web | Next.js + TypeScript, Tailwind, shadcn/ui |
| Audio UI | wavesurfer.js (stage 4) |
| Database | PostgreSQL + Drizzle ORM |
| Queues / scheduled jobs | Redis + BullMQ worker (previews, daily metering, monthly invoicing, data refresh) |
| Payments | Stripe **test mode**: saved cards, usage-based invoices |
| File storage | RustFS locally; Cloudflare R2 free tier if deployed |
| Audio processing | FFmpeg in the worker (stage 4) |
| Auth | Better Auth |
| Pricing model | Pure TypeScript engine (v1); ML training and inference approach chosen in stage 8, free tools only |
| AI trend scoring | Simulated first; a free or local model chosen in stage 8 |
| Hosting (optional) | Vercel Hobby (allowed because non-commercial) |

## Principles

- **Money is exact and auditable:** integer amounts, a double-entry ledger, no mutable balances. Usage-based amounts are rounded **once per invoice line**, never per event ([006](decisions/006-money-in-cents-and-pure-pricing.md)).
- **Every invoice line is traceable** to recorded daily exposure and to the locked rate on the license.
- **Shares always add up exactly:** splits are whole basis points totalling 100%, and leftover cents are assigned by a fixed rule, so contributors' payouts sum to precisely what was paid. Settlement is idempotent and replayable from the ledger.
- **No one's pay is set without consent:** every contributor accepts their share before a track can be licensed.
- **The pricing engine is pure:** features in, rate out. It can be tested, explained and replayed.
- **Every quote is explainable:** the advertiser and artist can see which inputs moved the rate. AI-derived inputs are capped and logged.
- **Simulated means labelled:** simulated platform stats, market data and training history are marked as such everywhere they appear.
- **Read-only on ad platforms:** we never pause, edit or stop an advertiser's ads.
- **Master audio is never public**; previews are watermarked. A license is its own record.

## Non-goals (for now)

Real money and payouts · real ad-platform connections in production (sandbox at most) · stopping or capping ads · organic (non-ad) posts, which have no metering API · audio fingerprinting (paid) · uploaded cover art ([008](decisions/008-generated-cover-art.md)) · email verification (needs an email service) · mobile apps.

## Success metrics (draft, measured on simulated data until real data exists)

| Metric | Why |
|---|---|
| Time for a new artist to publish a track | Under 3 minutes |
| Quote → license conversion | Do advertisers accept model rates? |
| Artist earnings vs flat-fee baseline | Does metered pricing pay artists more for successful ads? |
| Forecast error (predicted vs actual earnings) | Is the earnings forecast trustworthy? |
| Invoice disputes | Do bills match what advertisers expect? |

## Open questions

Not yet decided. Answers become decision records.

| # | Question | Needed by |
|---|---|---|
| 1 | **Artist custom rate:** a fixed rate that replaces the model, or a floor the model can't go below? | Stage 8 (forecast UI in 5) |
| 2 | **License term:** fixed lengths (30/90/365 days) or any end date? Can a license be extended? | Stage 5 |
| 3 | **Advertiser accounts:** same account type with an "advertiser profile" (like artists), or separate? Company details needed? | Stage 5 |
| 4 | **Platform fee:** what cut of each invoice the marketplace keeps (even in test mode) | Stage 7 |
| 5 | **License terms:** what the license allows (which platforms, ad formats, edits, territories) in plain English | Stage 5 |
| 6 | **Exposure definition details:** does a 2-second scroll-past count? Minimum watch time per view? | Stage 6 |
| 7 | **Budget alerts:** notify advertisers when estimated monthly cost passes a limit they set? | Stage 7 |
| 8 | **Unpaid invoices:** what happens if a saved card fails (retries, license suspended, artist still credited?) | Stage 7 |
| 9 | **Copyright:** what stops uploads of music the artist doesn't own: report button + manual review, or more? | Before going public |
| 10 | **City data:** which free datasets cover city income and genre popularity, and where we fall back to countries | Stage 8 |
| 11 | **Contributor roles:** a fixed list (producer, vocalist, writer, mixer, musician, other) or free text? | Stage 5 |
| 12 | **Limits:** maximum contributors per track (e.g. 50), minimum share (e.g. 0.5%)? | Stage 5 |
| 13 | **Unclaimed shares:** how long are held balances kept for invitees who never join, and what happens after? | Stage 7 |
| 14 | **Declined split:** if a contributor declines, does the lead artist just edit and re-send, and can the track stay published (unlicensable) meanwhile? | Stage 5 |
| 15 | **Rate unit and limits:** how rates are shown and stored (e.g. per 1,000 or per 1 million exposure-seconds), the allowed range, and the money precision underneath. Deliberately deferred by the user (2026-10-21); until then phase 3's existing artist price field stays as a placeholder | Before stage 5 |
