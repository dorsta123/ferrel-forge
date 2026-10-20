# 017 — Simulated ad platforms and market data
**Status:** Accepted · **Date:** 2026-10-20 · **Phase:** after 3 (used from 6)

## Context
Real ad-platform APIs (Meta Marketing API for Instagram, TikTok for Business, Google Ads) need business verification, app review and the advertiser's consent. That's out of reach for a non-commercial project ([001](001-non-commercial-zero-cost.md)). There is also no sales or exposure history to train a pricing model on.

## Decision
- **Ad platforms are simulated** behind the same adapter interface a real connector would implement: list campaigns, read daily delivery stats (views, watch time, city breakdown). A simulated campaign produces realistic, reproducible daily numbers from a seed (growth, decay, the occasional viral spike).
- **Market data and history are simulated:** city income, genre popularity, trend events, and past licenses/exposure for training the pricing model. Simulated datasets are generated from documented assumptions, so the model's behaviour can be checked against them.
- **Everything simulated is labelled** in the UI and data ("Simulated platform", "Simulated data").
- The metering, billing and pricing pipelines are **real code**; only the data source is simulated.

## Alternatives considered
- Real APIs in sandbox/test mode: possible later (stage 9) for one platform, but setup-heavy and still needs developer approval.
- Hand-entered numbers: not repeatable and can't show the system over time.

## Consequences
- Swapping in a real platform later means writing one adapter, with no pipeline changes.
- Model accuracy claims only hold for simulated data. Results must be presented that way.
- Simulators must be deterministic (seeded) so tests and demos are reproducible.
