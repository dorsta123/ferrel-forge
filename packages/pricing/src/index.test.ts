import { describe, expect, it } from "vitest";
import { quoteRate } from "./index";

describe("quoteRate (placeholder until the pricing model)", () => {
  it("returns the artist's base rate with no adjustments", () => {
    expect(quoteRate({ baseRateMicros: 500_000 })).toEqual({ rateMicros: 500_000, factors: [] });
  });

  it("is pure: the same input always gives the same quote", () => {
    expect(quoteRate({ baseRateMicros: 12_500 })).toEqual(quoteRate({ baseRateMicros: 12_500 }));
  });

  it.each([0, -100, 12.5, Number.NaN, 1e300, Number.MAX_SAFE_INTEGER + 1])("refuses a base rate of %s", (baseRateMicros) => {
    expect(() => quoteRate({ baseRateMicros })).toThrow();
  });
});
