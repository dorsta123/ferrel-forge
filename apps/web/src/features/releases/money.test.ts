import { describe, expect, it } from "vitest";
import { centsToInput, formatCents, parseDollars } from "./money";

describe("parseDollars", () => {
  it.each([
    ["12", 1200],
    ["12.5", 1250],
    ["12.50", 1250],
    ["$12.05", 1205],
    [" 0.99 ", 99],
    ["500", 50000],
  ])("%s -> %i cents", (input, cents) => {
    expect(parseDollars(input)).toBe(cents);
  });

  it.each(["", "abc", "-5", "12.345", "1e3", "1,000", "12.", ".5", "Infinity", "0x10"])("rejects %j", (input) => {
    expect(parseDollars(input)).toBeNull();
  });
});

describe("formatting", () => {
  it("formats cents as dollars", () => {
    expect(formatCents(1250)).toBe("$12.50");
    expect(formatCents(100)).toBe("$1.00");
  });

  it("round-trips through the input format", () => {
    expect(centsToInput(1205)).toBe("12.05");
    expect(parseDollars(centsToInput(50000))).toBe(50000);
  });
});
