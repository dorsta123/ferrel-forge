import { describe, expect, it } from "vitest";
import { formatCount } from "./format-number";

describe("formatCount", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [1000, "1,000"],
    [1_080_000, "1,080,000"],
  ])("%i -> %s", (value, label) => {
    expect(formatCount(value)).toBe(label);
  });
});
