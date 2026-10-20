import { describe, expect, it } from "vitest";
import { formatBytes } from "./format-bytes";

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [1023, "1023 B"],
    [1024, "1 KB"],
    [1536, "1.5 KB"],
    [44_100, "43 KB"],
    [5 * 1024 * 1024, "5 MB"],
    [150 * 1024 * 1024, "150 MB"],
  ])("%d -> %s", (bytes, expected) => {
    // Units are joined with a non-breaking space.
    expect(formatBytes(bytes)).toBe(expected.replace(" ", " "));
  });
});
