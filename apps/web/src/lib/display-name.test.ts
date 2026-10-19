import { describe, expect, it } from "vitest";
import { DISPLAY_NAME_MAX, displayNameError, normalizeDisplayName } from "./display-name";

describe("normalizeDisplayName", () => {
  it.each([
    ["  Sahil   Sharma ", "Sahil Sharma"],
    ["Tab\tand\nnewline", "Tab and newline"],
    ["   ", ""],
  ])("%j -> %j", (input, expected) => {
    expect(normalizeDisplayName(input)).toBe(expected);
  });
});

describe("displayNameError", () => {
  it("accepts 1 to 60 characters", () => {
    expect(displayNameError("A")).toBeNull();
    expect(displayNameError("x".repeat(DISPLAY_NAME_MAX))).toBeNull();
  });

  it("rejects empty and over-long names", () => {
    expect(displayNameError("")).not.toBeNull();
    expect(displayNameError("x".repeat(DISPLAY_NAME_MAX + 1))).not.toBeNull();
    expect(displayNameError("A".repeat(200_000))).not.toBeNull();
  });
});
