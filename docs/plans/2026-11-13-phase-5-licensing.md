# Plan: phase 5 — licensing

**Status:** Approved by the user 2026-11-13; parts 1 and 2 done · **Why:** Everything built so far is the artist side. Phase 5 adds the core of the marketplace: an advertiser licenses a track at a locked rate, saves a card, and downloads the master; every contributor's share is agreed before a track can be licensed.

## How we work this phase (lighter, user request 2026-11-13)
- **Visible first:** an advertiser can license a track at the end of part 1; depth (cards, downloads, splits) follows.
- **Four parts** (user, 2026-11-13), one PR each, built as several commits (tests first, then code). Each part: one review, plus a security review where money, accounts or downloads are involved. Tests stay at every layer; decision records only for real choices; docs updated in the same PR.

## Parts
| # | What | You can… |
|---|---|---|
| 1 ✅ | **Advertisers license a track.** Every signed-in account is an advertiser (browsing needs no account; creator stays the opt-in extra). Company name and country are asked once, at the first license. "License this track" on release pages → choose platforms (Instagram, TikTok, Google/YouTube), cities (a starter list of ~20 major cities), term (30/90/365 days) → see the rate (the artist's base rate for now, *per 1,000 exposure-seconds*) and the license terms → confirm. A license record keeps the **locked rate**, the quote snapshot and the dates. Advertisers see it under "My licenses"; artists see their licenses on their dashboard | **Sign up, license a track, and see it on both dashboards** |
| 2 ✅ | **Pay and receive.** The advertiser saves a card in Stripe test mode (Stripe's own form; we store only Stripe's ids, never card details) before confirming a license. An active license unlocks the full-quality master through a short-lived private link; nobody else can get it | License with a saved test card and download the master |
| 3 | **Contributors and splits.** The lead artist lists contributors (name, role, %) totalling exactly 100%; each gets an invite link and accepts or declines (signing in or up from the link). Until a split exists a track is 100% the lead artist's. A track is licensable only when everyone has accepted; each license **locks the split version** in force | Split a track, have contributors accept, and see a license keep its split after the split changes |
| 4 | **Rules and hardening.** No unpublish / archive / delete while licenses are active (the phase 3 placeholders); a license can be extended at its locked rate before it ends. The full journey as a browser test (split → accept → license → card → download), a security review of licensing and downloads, docs | Phase 5 done |

## Decisions taken (recommendations — the user confirms or changes)
| # | Question (PRODUCT.md) | Recommendation |
|---|---|---|
| 15 | **Rate unit** | Shown and set **per 1,000 exposure-seconds** (like ad "CPM" prices). Stored as whole micro-dollars (millionths of a dollar), so money maths never rounds wrongly. The artist's base rate field changes from "$1–$500" to **$0.01–$50.00 per 1,000 exposure-seconds** (existing values are converted or reset; only test data today) |
| 2 | **License term** | 30, 90 or 365 days; extendable before it ends at the same locked rate (part 4) |
| 3 | **Advertiser accounts** | **Every signed-in account is an advertiser** (user, 2026-11-13): browsing needs no account, so a role-less account has no purpose; creator stays the opt-in extra. Company name and country are asked once, at the first license, and kept as billing details. No registration numbers or VAT in test mode |
| 5 | **What a license allows** | One standard license, in plain English: use the track in paid ads on the chosen platforms, shown in the chosen cities, for the term; trimming and looping allowed; no remixing, no use as standalone music, no transfer. Text shown before confirming and stored with each license |
| 11 | **Contributor roles** | Fixed list: producer, vocalist, writer, mixer, musician, other (with a short note) |
| 12 | **Split limits** | At most 50 contributors per track; smallest share 0.5% |
| 14 | **A contributor declines** | The lead artist edits the split and re-sends; the track stays published but shows "not yet available to license" until everyone accepts |
| — | **Cities** | A starter list of ~20 major cities; real market data comes in phase 8 |

## Part 1 in detail
Four steps, one PR.
1. **Rate unit.** The base rate is set per 1,000 exposure-seconds, $0.01–$50.00 (up to 4 decimals), stored in **micro-dollars** (millionths of a dollar, as Google Ads does). Migration: the column becomes `base_rate_micros`; existing tracks get $0.50 (old values were placeholders; test data only). The editor, dashboard and pricing engine switch to it. Not shown on public pages.
2. **Billing details and "My licenses".** A `billing_profiles` table (one row per account: company name, country), created at the first license. "My licenses" in every signed-in user's menu, listing their licenses (empty at first).
3. **Licensing a track.** The release page's box becomes **License this track** → a license page: platforms (Instagram, TikTok, Google/YouTube; one or more), cities (~20 major cities), term (30/90/365 days), the rate ("$0.50 per 1,000 exposure-seconds, locked for this license"), the plain-English terms with "I agree", and company name + country the first time. Signed-out visitors are sent to sign in or sign up and brought back. A `licenses` table keeps track, licensee, platforms, cities, term, start and end, the **locked rate**, the quote snapshot and the terms version, with database checks. The server works out the rate from the database (never from the browser) and refuses: drafts, archived or failed-audio tracks, your own tracks, invalid choices.
4. **Both sides see it.** "My licenses" lists track, artist, platforms, cities, dates and locked rate. The creator dashboard's "Active licenses" shows the real count (today always 0), and each release row its count.

**Choices:** micro-dollars, reset existing rates to $0.50; no licensing your own tracks; a still-processing track can be licensed (only failed audio blocks it); the rate is shown on the license page, not publicly.

**Not in part 1:** cards (Stripe), master downloads, splits, blocking deletion of licensed tracks, extensions.

**Done when:** unit tests (rate in the new unit, license choices); integration tests with forged requests (no account, own track, draft/archived/failed tracks, bad choices, a forged rate ignored, database checks); a browser test (sign up → license → "My licenses" → the creator sees the count); one code review + a security review; CI green; docs.

## Part 2 in detail (user: "code it", 2026-11-14)
- **Step A — master download.** An active license shows **Download master** in "My licenses". A route checks the license is the signed-in user's and active, then redirects to a private storage link valid for 5 minutes (`Content-Disposition: attachment`, named after the track). The storage key never appears on a page. Nobody else (other users, ended licenses, failed audio) gets a link.
- **Step B — a saved card before licensing.** A small payments adapter with two implementations: **Stripe test mode** (used when `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are set: a SetupIntent and Stripe's own card form; we store only Stripe's customer and payment-method ids plus brand/last 4 for display) and a **simulated card** when no keys are set, clearly labelled, so the app and CI work at $0 without an account. A license needs a saved card.

**Done (2026-11-23, [decision 035](../decisions/035-cards-and-master-downloads.md)):** both steps, one code review (9 fixes; the 10th moves to part 4 below) and a security review ([security.md](../security.md)).

**Added to part 4 from the review:** block replacing a licensed track's audio (unpublish → new upload would change the licensee's master).

## Part 3 in detail (approved by the user 2026-11-24)
Four steps, one PR.
- **A. Tables and rules.** `split_versions` (a track's numbered splits) and `split_shares` (name, role, basis points, the account once claimed, invite-code hash, pending/accepted/declined). Pure rules: percentages ↔ basis points, total exactly 10,000, at most 50 people, at least 0.5% each, fixed roles (producer, vocalist, writer, mixer, musician, other + note).
- **B. The lead artist's "Contributors" box** in the release editor: rows of name, role, %; the lead artist is always on the split (at least 0.5%) and accepted automatically; saving makes a new version that everyone else accepts again; "copy invite link" per person (a new link can be made any time); "2 of 3 accepted".
- **C. Invite links and "My splits".** `/splits/invite/<code>`: sign in or up and come back; the track, your role and share, the whole split, Accept / Decline. Accepting ties the share to your account (one share per person per version). Links stop working when the split changes. Only a hash of the code is stored. "My splits" in the account menu lists every track you're on.
- **D. Licensing.** A track is licensable only when everyone has accepted the current split; no split = 100% the lead artist's. The release page says "Not yet available to license" meanwhile. Each license locks the split version in force; existing licenses get a "100% lead artist" version.

**Choices (user, 2026-11-24):** the lead artist always keeps a share; splits can be edited while licenses are active (running licenses keep theirs; new licenses wait for the new split to be accepted); contributors see the whole split.

**Not in part 3:** paying contributors (phase 7), unclaimed shares (phase 7), blocking unpublish while licensed (part 4).

**Done when:** unit tests (split maths, limits); integration tests with forged requests (someone else's track, an old or reused link, two shares for one person, accepting someone else's share, 99.99%, licensing while someone is pending); a browser test (split → contributor signs up from the link and accepts → license → split changes → license keeps the old split); a code review + security review; docs.

## Needs from the user
- *Optional:* a free **Stripe account** and its **test-mode keys** in `.env` to try Stripe's real card form. Without them a labelled simulated card is used. Test mode never charges real money.

## Acceptance criteria (whole phase)
- [x] Every signed-in account can license tracks and see its licenses.
- [x] An advertiser licenses a published track for chosen platforms, cities and term; the rate shown is the rate locked on the license.
- [x] A license needs a saved test card; no card data is stored by us.
- [x] Only an active licensee can download the master, through a short-lived private link.
- [ ] Shares total exactly 100%; every contributor must accept before a track can be licensed; each license keeps the split version it started with.
- [ ] Licensed tracks can't be unpublished, archived or deleted while a license is active.
- [ ] CI passes, including the full licensing journey in the browser.

## Risks
- **Money and accounts:** card handling stays inside Stripe; security review on parts 1, 2 and 4.
- **Changing the rate unit** touches the existing price field and its database rule; done in part 1 with a migration.
- **Scope creep:** invoices, metering and payouts are phases 6–7, not here.
- **Phase 8 note (from review):** the `licenses_rate` check reuses the base-rate range ($0.01–$50). Once the pricing model applies multipliers, a quote above $50 would be refused, so that range must be revisited with phase 8.

## Tests
Unit: split maths (basis points summing to 10,000), quote and term rules. Integration: forged licenses, someone else's track, unpublished tracks, downloads without a license, splits that don't total 100%. E2e: advertiser licenses a track (part 1), and the full journey (part 4).
