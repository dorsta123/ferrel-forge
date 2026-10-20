# 007 — One license type per track (for now)
**Status:** Accepted · **Date:** 2026-10-20 · **Phase:** 3

## Context
Marketplaces often sell tiers (personal / commercial / exclusive). With dynamic pricing, every tier would need its own supply and price curve.

## Decision
One standard license per track. Each track has one `total_supply` and one `base_price_cents`.

## Alternatives considered
Tiers now — multiplies complexity before the core mechanism is proven.

## Consequences
Tiers can be added later as a `license_tiers` table referencing `tracks`; existing tracks become a single default tier.
