// The pricing engine is pure: same inputs always give the same price.
// No database, Redis, or clock access here, so it can be unit-tested and
// replayed against historical sales. Phase 6 replaces this with the real model.

export interface PricingInput {
  basePriceCents: number;
  totalSupply: number;
  remainingSupply: number;
}

/** Price rises as supply runs out: base price at full supply, 2x when one copy is left. */
export function quotePrice({ basePriceCents, totalSupply, remainingSupply }: PricingInput): number {
  if (totalSupply <= 0 || remainingSupply <= 0) throw new Error("Sold out");
  const scarcity = 1 - remainingSupply / totalSupply;
  return Math.round(basePriceCents * (1 + scarcity));
}
