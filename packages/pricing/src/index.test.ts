import { describe, expect, it } from "vitest";
import { quotePrice } from "./index";

describe("quotePrice", () => {
  it("charges the base price at full supply", () => {
    expect(quotePrice({ basePriceCents: 1000, totalSupply: 100, remainingSupply: 100 })).toBe(1000);
  });

  it("rises as supply runs out", () => {
    expect(quotePrice({ basePriceCents: 1000, totalSupply: 100, remainingSupply: 50 })).toBe(1500);
  });

  it("throws when sold out", () => {
    expect(() => quotePrice({ basePriceCents: 1000, totalSupply: 100, remainingSupply: 0 })).toThrow();
  });
});
