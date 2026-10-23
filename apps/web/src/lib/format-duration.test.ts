import { describe, expect, it } from "vitest";
import { formatDuration } from "./format-duration";

describe("formatDuration", () => {
  it.each([
    [0, "0:00"],
    [499, "0:00"],
    [500, "0:01"],
    [59_000, "0:59"],
    [222_000, "3:42"],
    [3_600_000, "1:00:00"],
    [3_725_000, "1:02:05"],
  ])("%i ms -> %s", (ms, label) => {
    expect(formatDuration(ms)).toBe(label);
  });
});
