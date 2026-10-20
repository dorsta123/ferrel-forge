# 019 — Contributor splits and automatic settlement
**Status:** Accepted · **Date:** 2026-10-20 · **Phase:** 5 (splits) and 7 (settlement)
**Extends:** [016](016-metered-exposure-licensing.md) and [006](006-money-in-cents-and-pure-pricing.md).

## Context
Tracks are often made by many people: producers, vocalists, writers, mixers. The user wants each contributor paid automatically by percentage, for tracks with dozens of contributors.

## Decision
- **Splits per track.** The lead artist lists contributors with a role and a share. Shares are stored as integer **basis points** (100% = 10,000) and must total exactly 10,000. The lead artist is a contributor like any other.
- **Anyone with an account can be a contributor**, with or without an artist profile. Contributors are invited by **link** (no email service). A share for someone who hasn't joined yet is **held** until they sign up and claim it.
- **Everyone must accept.** Each contributor confirms their share. A track can't be licensed until every contributor has accepted the current split. Changing a split creates a new version that needs acceptance again.
- **Locked per license.** A license stores the split version in force when it was created, just like its rate. Invoices for that license always use that split.
- **Settled as each invoice is paid.**
  1. The advertiser's payment succeeds.
  2. The platform fee is deducted.
  3. The rest is divided by the license's locked split.
  4. Each share is written to the double-entry ledger and sent as a **Stripe Connect transfer (test mode)** to the contributor's connected account. Shares of contributors without a payout account are held in the ledger.
- **Exact rounding.** Each share is rounded down to whole units, and leftover units go one at a time to the largest shares (ties by a fixed order). The shares always add up to exactly the amount paid.
- **Nothing settles before money arrives.** Failed payments split nothing. A refund or reversal posts mirror-image ledger entries for every share.

## Alternatives considered
- The lead artist decides without consent: fast, but one person could set everyone else's pay.
- New splits applying to running licenses: simpler, but changes the deal mid-license and makes past invoices ambiguous.
- Monthly batches or withdraw-on-request: fewer transfers, but not the "automatic settlement" the user asked for.
- Contributors must be artists: forces session musicians to create profiles.
- Floating-point percentages: rounding drift, and shares wouldn't add up to the total.

## Consequences
- New data: contributors, split versions with per-person shares, acceptances, a split snapshot on each license, and ledger accounts per contributor (including held balances).
- Phase 3's single-owner track model gains a lead artist plus contributors. Edit rights stay with the lead artist.
- Settlement must be idempotent (a payment event processed twice must not pay twice) and fully replayable from the ledger.
- Contributors need an earnings page; the lead artist needs to see split status ("3 of 5 accepted").
