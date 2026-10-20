# 006 — Money in integer cents; pricing engine is pure
**Status:** Accepted · **Date:** 2026-10-17 · **Phase:** 1 (reaffirmed in 3)

## Context
Prices change with every sale; money math must be exact and auditable.

## Decision
- All amounts are **integer cents** (`base_price_cents`), never floats.
- `packages/pricing` is a pure function: inputs in (base price, supply, copies left, later sales velocity), price out. No database, Redis or clock access.

## Alternatives considered
Floats (rounding errors); pricing inside the database or web handlers (untestable, can't replay history).

## Consequences
- The pricing engine can be unit-tested and replayed against real sales to compare curves (good for pricing experiments).
- Callers gather inputs. At checkout (phases 5–6) the quoted price is locked in Redis ~60s and charged exactly.
- Every money movement goes into a double-entry ledger (phase 5) — no mutable balances.
