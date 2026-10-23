import { describe, expect, it } from "vitest";
import { quoteRate } from "./index";

describe("quoteRate (placeholder until the pricing model)", () => {
  it("returns the artist's base rate with no adjustments", () => {
    expect(quoteRate({ baseRateCents: 1250 })).toEqual({ rateCents: 1250, factors: [] });
  });

  it("is pure: the same input always gives the same quote", () => {
    expect(quoteRate({ baseRateCents: 999 })).toEqual(quoteRate({ baseRateCents: 999 }));
  });

  it.each([0, -100, 12.5, Number.NaN])("refuses a base rate of %s", (baseRateCents) => {
    expect(() => quoteRate({ baseRateCents })).toThrow();
  });
});
