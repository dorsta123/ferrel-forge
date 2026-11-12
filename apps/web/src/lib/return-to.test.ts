import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./return-to";

describe("safeReturnTo", () => {
  it.each([
    ["/creators/sahil/ding-dong/license", "/creators/sahil/ding-dong/license"],
    ["/licenses?new=1", "/licenses?new=1"],
  ])("keeps a path on this site: %s", (input, expected) => {
    expect(safeReturnTo(input)).toBe(expected);
  });

  it.each([
    ["nothing", null],
    ["another site", "https://evil.example/x"],
    ["a protocol-relative address", "//evil.example/x"],
    ["a backslash trick", "/\\evil.example"],
    ["a script", "javascript:alert(1)"],
    ["a relative path", "creators/x"],
    ["an encoded double slash", "/%2F%2Fevil.example"],
    ["control characters", "/x\u0000y"],
  ])("falls back to the homepage for %s", (_, input) => {
    expect(safeReturnTo(input)).toBe("/");
  });
});
