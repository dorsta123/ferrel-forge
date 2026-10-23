// The pricing engine is pure: same inputs always give the same rate.
// No database, Redis, or clock access here, so it can be unit-tested and
// replayed against history (decision 018).
//
// Placeholder until the pricing model (phase 8): the rate is the artist's base
// rate, with no adjustments. The unit (per second, per 1,000 exposure-seconds,
// ...) is not decided yet (PRODUCT.md question 15). Later factors (city income,
// demand, culture, capped trend score) arrive as entries in `factors`.

export interface RateInput {
  /** The artist's base rate, in integer cents. */
  baseRateCents: number;
}

/** One adjustment to the base rate, kept so every quote can be explained. */
export interface RateFactor {
  name: string;
  /** e.g. 1.18 for +18%. */
  multiplier: number;
  reason: string;
}

export interface RateQuote {
  rateCents: number;
  factors: RateFactor[];
}

export function quoteRate({ baseRateCents }: RateInput): RateQuote {
  // Safe integers only: anything larger can't be stored or multiplied exactly later.
  if (!Number.isSafeInteger(baseRateCents) || baseRateCents <= 0) {
    throw new Error("Base rate must be a positive whole number of cents");
  }
  return { rateCents: baseRateCents, factors: [] };
}
