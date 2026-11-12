# 034 — Licensing basics: rate unit, who can license, and what a license records
**Status:** Accepted · **Date:** 2026-11-13 · **Phase:** 5 (part 1)

## Context
Phase 5 makes the marketplace real: an advertiser licenses a track at a locked rate. That needed answers to several open product questions (PRODUCT.md 2, 3, 5 and 15), which the user approved on 2026-11-13.

## Decision
- **Rate unit (Q15):** rates are set and shown **per 1,000 exposure-seconds**, like ad "CPM" prices, and stored as whole **micro-dollars** (millionths of a dollar, as Google Ads does), so money maths never rounds wrongly.
  - The artist's base rate is **$0.01–$50.00** with up to 4 decimals (`tracks.base_rate_micros`, migrations 0010–0011).
  - The old "$1–$500" placeholder values meant nothing in the new unit, so existing tracks were set to $0.50 (test data only).
  - `lib/rate.ts` parses and formats rates; `quoteRate` takes and returns micro-dollars.
- **Who can license (Q3):** **every signed-in account** (user, 2026-11-13). Browsing needs no account, so a role-less account has no purpose. Creator stays the opt-in extra. Company name and country are asked **once, at the first license** (`billing_profiles`), because invoices need them. Artists can't license their own tracks.
- **What can be licensed:** a published track whose audio isn't failed (processing is fine: publishing never waits for it). Drafts, archived releases and failed audio are refused.
- **The license (Q2, Q5):**
  - platforms: Instagram, TikTok, Google/YouTube;
  - cities from a starter list of 20;
  - a term of **30, 90 or 365 days**;
  - the **rate locked** when agreed, with the quote snapshot (inputs and factors) so it can be replayed;
  - the **terms version**. The terms are one plain-English standard license, shown before agreeing.

  The database enforces the choices, the term and end date, and the rate range. Licensed tracks and licensees can't be deleted (RESTRICT).
- **The server decides the rate** from the database and ignores anything the browser sends about it.
- **Sign in and come back:** signing in or up returns to the page you came from via `?next=`, accepted only as a path on this site (`lib/return-to.ts`), so a crafted link can't bounce people to another site.

## Alternatives considered
- **Per exposure-second or per million:** literal, or bigger round numbers, but less familiar to advertisers than per-1,000 pricing.
- **A separate advertiser account type, or an "advertiser profile" step:** extra sign-up friction for the role nearly every account has anyway.
- **Any end date:** more flexible, but more edge cases to price, invoice and test.

## Consequences
- Cards (Stripe test mode) and master downloads come in part 2; splits in part 3; release rules for licensed tracks (no unpublish/archive/delete while active) and extensions in part 4. Until part 4, unpublishing then deleting a licensed track is refused by the database rather than with a friendly message.
- Phase 8's pricing model replaces the base rate as the quote; each license keeps the rate and snapshot it started with.
