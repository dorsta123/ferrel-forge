# 001 — Non-commercial, $0 to run
**Status:** Accepted · **Date:** 2026-10-17 · **Phase:** 0

## Context
ferrel-forge is a learning and portfolio project, not a business.

## Decision
Use only free / open-source tools and free tiers. Stripe runs in **test mode only** (fake cards, no real money). No paid services (e.g. audio fingerprinting is replaced by a report button + manual moderation).

## Alternatives considered
A commercial stack (Vercel Pro, paid fingerprinting, live Stripe) — unnecessary cost and legal obligations for a non-commercial project.

## Consequences
- Vercel's free Hobby plan is allowed. Real payments would make it commercial and change hosting, licensing and legal requirements.
- No email service yet, so no email verification or password-reset emails (links can be printed to the terminal in dev).
- Avoid a cash-out virtual currency (money-transmitter rules) even later.
