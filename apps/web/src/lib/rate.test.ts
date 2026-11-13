import { describe, expect, it } from "vitest";
import { formatRate, parseRate, rateToInput } from "./rate";

describe("parseRate", () => {
  it.each([
    ["0.5", 500_000],
    ["0.50", 500_000],
    ["$0.50", 500_000],
    ["0.0125", 12_500],
    [" 12 ", 12_000_000],
    ["50", 50_000_000],
    ["0.01", 10_000],
  ])("%s -> %i micro-dollars", (input, micros) => {
    expect(parseRate(input)).toBe(micros);
  });

  it.each(["", "abc", "-5", "0.12345", "1e3", "1,000", "12.", ".5", "Infinity", "0x10"])("rejects %j", (input) => {
    expect(parseRate(input)).toBeNull();
  });
});

describe("formatting", () => {
  it("shows at least cents, and up to 4 decimals when the rate needs them", () => {
    expect(formatRate(500_000)).toBe("$0.50");
    expect(formatRate(12_500_000)).toBe("$12.50");
    expect(formatRate(12_500)).toBe("$0.0125");
    expect(formatRate(10_000)).toBe("$0.01");
  });

  it("round-trips through the input format", () => {
    expect(rateToInput(500_000)).toBe("0.50");
    expect(rateToInput(12_500)).toBe("0.0125");
    expect(parseRate(rateToInput(12_345_600))).toBe(12_345_600);
  });
});
