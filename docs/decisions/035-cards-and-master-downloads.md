# 035 — Saved cards (Stripe test mode or simulated) and master downloads
**Status:** Accepted · **Date:** 2026-11-23 · **Phase:** 5 (part 2)

## Context
A license is billed monthly for exposure (phase 7), so an advertiser needs a card on file before licensing. And an active license must give the advertiser the full-quality master, which lives in a private bucket. The project must cost $0 and never move real money, and CI has no Stripe account.

## Decision
- **A card before licensing.** `createLicense` refuses an account without a usable card ("Add a payment card before licensing."). The license page shows a **Payment card** box above the form.
- **We never hold card numbers.** `payment_cards` (one row per account) keeps only the provider, Stripe's customer and payment-method ids, and brand + last 4 for display. Database checks: Stripe rows need well-formed `cus_…`/`pm_…` ids, simulated rows have none, `last4` is exactly 4 digits.
- **Two modes, chosen from `.env`** (`features/payments/mode.ts`):
  - **Stripe test mode** when `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are both set. A SetupIntent (`usage: off_session`, for later monthly charges) and Stripe's own card form. The SetupIntent id the browser sends back is checked with Stripe: it must have succeeded and carry this account's id in its metadata.
  - **Simulated** when neither key is set: a pretend "Visa ending 4242", labelled **Simulated** wherever it appears. The browser never loads or calls Stripe in this mode (Stripe.js is imported from `@stripe/stripe-js/pure` and the form is loaded on demand).
  - **Live keys are refused** (only `sk_test_`/`pk_test_`), and so is half a configuration.
  - Once Stripe keys are set, a simulated card saved earlier **doesn't count**: there is nothing to charge.
- **One Stripe customer per account:** created with an idempotency key (`customer-<userId>`), so opening the form again doesn't create more.
- **Master download:** "Download master" in "My licenses" hits `/licenses/<id>/master`. The route checks the license is the signed-in user's, active by the **database clock** (the same check the page uses), and the audio isn't failed. It then redirects (`303`, `no-store`) to a signed storage link valid for **5 minutes**, sent as an attachment named `<track-slug>.<format>`. Anything else gets a plain 404.

## Alternatives considered
- **Stripe Checkout (hosted page):** less code, but a redirect away mid-license, and still needs keys for CI.
- **Requiring Stripe keys everywhere:** CI and anyone trying the app would need an account. The simulated mode keeps $0 and zero setup.
- **Streaming the master through our server:** the storage key stays hidden either way; a signed link avoids pushing large files through the web app.

## Consequences
- Phase 7 charges the saved Stripe payment method off-session; simulated cards are "charged" by the simulator.
- A signed download link works for anyone holding it for 5 minutes (it is the licensee's own link). The storage path in it contains the artist's account id (an opaque UUID that grants nothing; [security.md](../security.md)).
- **Part 4 must block replacing the audio of a licensed track**, as well as unpublish/archive/delete: today an artist could unpublish, upload new audio, and the licensee would download the new file.
- "Change card" replaces the stored card but doesn't detach the old payment method at Stripe (test mode; tidy up with phase 7).
