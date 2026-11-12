// The pricing engine is pure: same inputs always give the same rate.
// No database, Redis, or clock access here, so it can be unit-tested and
// replayed against history (decision 018).
//
// Placeholder until the pricing model (phase 8): the rate is the artist's base
// rate, with no adjustments. Rates are per 1,000 exposure-seconds, in whole
// micro-dollars (decision 034). Later factors (city income, demand, culture,
// capped trend score) arrive as entries in `factors`.

export interface RateInput {
  /** The artist's base rate per 1,000 exposure-seconds, in whole micro-dollars. */
  baseRateMicros: number;
}

/** One adjustment to the base rate, kept so every quote can be explained. */
export interface RateFactor {
  name: string;
  /** e.g. 1.18 for +18%. */
  multiplier: number;
  reason: string;
}

export interface RateQuote {
  /** Per 1,000 exposure-seconds, in whole micro-dollars. */
  rateMicros: number;
  factors: RateFactor[];
}

export function quoteRate({ baseRateMicros }: RateInput): RateQuote {
  // Safe integers only: anything larger can't be stored or multiplied exactly later.
  if (!Number.isSafeInteger(baseRateMicros) || baseRateMicros <= 0) {
    throw new Error("Base rate must be a positive whole number of micro-dollars");
  }
  return { rateMicros: baseRateMicros, factors: [] };
}
