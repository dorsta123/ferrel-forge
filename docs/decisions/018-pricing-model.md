# 018 — Pricing model: inputs, staging and guardrails
**Status:** Accepted (details fixed in stage 8's plan) · **Date:** 2026-10-20 · **Phase:** 8
**Replaces:** the supply-based price curve concept. **Keeps:** the pure engine from [006](006-money-in-cents-and-pure-pricing.md).

## Context
The rate per 1,000 exposure-seconds should reflect the market an ad targets and the demand for a track, not one fixed number. The user wants a machine-learning model, and artists want control over the price and a forecast of what they'll earn.

## Decision
- **Inputs:**
  - the artist's base (or custom) rate;
  - **local income**: per-capita income of the target **city**, falling back to the **country** where no city data exists;
  - **demand**: licenses for the track, genre and artist, and their growth;
  - **culture**: genre popularity in the target city or country;
  - **trend score**: from an AI reading news and trend signals.
- **Staging:**
  - **v1** is a transparent formula. Each factor is a capped multiplier on the base rate, so every quote can be explained ("+18% local income, +6% demand").
  - **v2** is a machine-learning model trained on simulated history ([017](017-simulated-data.md)), validated against v1 and the simulation's known assumptions.
- **Guardrails:**
  - AI trend scores are **bounded** (e.g. at most ±30%), stored with the reason and source, and can be switched off.
  - News text is treated as untrusted input to the AI.
  - Final rates are clamped to a sane range.
- **Purity:** the engine takes a feature snapshot and returns a rate plus the factor breakdown. No database, network or clock access. Feature gathering happens elsewhere (worker jobs). The snapshot is stored with each locked quote, so any rate can be replayed.
- **Artist tools:** the artist can set a custom rate (fixed vs floor is open question 1 in PRODUCT.md) and see an **earnings forecast** with a range, comparing the model rate with their own.

## Alternatives considered
- ML from day one: there's no data, so it would only learn our assumptions while hiding them.
- Uncapped AI input: one bad or manipulated news item could swing prices wildly.
- Country-only pricing: simpler, but the user chose city precision where data allows.

## Consequences
- Quotes need a stored feature snapshot and factor breakdown.
- Stage 8 must pick free tools for training/inference and the AI trend scorer (no paid APIs).
- Forecasts must show uncertainty and say they are based on simulated data until real data exists.
