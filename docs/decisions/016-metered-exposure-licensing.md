# 016 — Metered exposure licensing for advertisers
**Status:** Accepted · **Date:** 2026-10-20 · **Phase:** after 3 (redefines 4 onward)
**Supersedes:** the "limited copies, price rises per sale" core idea and [007](007-one-license-type.md) (one license type per track with a fixed supply). **Extends:** [006](006-money-in-cents-and-pure-pricing.md).

## Context
After phase 3 the user clarified the intended product: advertisers license music for paid ads on Instagram, TikTok and Google/YouTube, and pay for the exposure the music gets. Roblox-style limited copies don't fit a usage-based license.

## Decision
- **Buyers are advertisers** running paid ad campaigns.
- **Unit of use: exposure-seconds = views × seconds watched**, summed per license per day (and per city where the platform reports it).
- **Rate locked per license.** The quote (e.g. "$X per 1,000 exposure-seconds") holds for the license term. New licenses get the current price.
- **Postpaid, monthly.** The advertiser saves a card at licensing (Stripe test mode). Each month's metered exposure × locked rate becomes one invoice.
- **Read-only.** We never pause, cap or edit ads. A "threshold" can only be an alert (open question 7 in PRODUCT.md).
- **Scarcity becomes a demand signal.** No fixed copy count. How many advertisers license a track (and how fast) is a pricing-model input ([018](018-pricing-model.md)).

## Alternatives considered
- Seconds of the song used (clip length): simple, but ignores how much the ad is seen.
- Time on air: easy to measure, but a quiet ad and a viral ad would cost the same.
- Prepaid with auto-pause at a threshold: would need write access to ad accounts, and delayed stats always overshoot. The user chose postpaid without stopping ads.
- Exclusivity slots per region: real scarcity, but adds slot management; may come back later.
- Rates floating daily: bills would be unpredictable and hard to explain.

## Consequences
- Phase 3's `total_supply` / `copies_sold` columns and the copies-left UI (cards, price panel, dashboard rows) become obsolete. They are reworked when licensing is built (stage 5), with a migration.
- Billing needs sub-cent precision: rates are per 1,000 exposure-seconds, so the money unit and rounding rule (round once per invoice line) are fixed in stage 7's plan.
- Every invoice line must trace back to recorded daily exposure and the license's locked rate.
- Credit risk exists (postpaid): a saved card is required, and failed payments need a policy (open question 8).
