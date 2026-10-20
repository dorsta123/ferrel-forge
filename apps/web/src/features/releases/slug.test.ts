import { describe, expect, it } from "vitest";
import { TRACK_LIMITS } from "@ferrel/db/constants";
import { TRACK_SLUG_PATTERN, firstFreeSlug, slugWithSuffix, trackSlugify } from "./slug";

describe("trackSlugify", () => {
  it.each([
    ["Midnight Run", "midnight-run"],
    ["Midnight Run (Remix)!", "midnight-run-remix"],
    ["  Café  del   Mar ", "cafe-del-mar"],
    ["Björk & Friends", "bjork-friends"],
    ["!!!", ""],
    ["東京", ""],
  ])("%s -> %s", (input, slug) => {
    expect(trackSlugify(input)).toBe(slug);
  });

  it("stays within the limit and never ends in a dash", () => {
    const slug = trackSlugify(`${"a".repeat(79)} b`);
    expect(slug.length).toBeLessThanOrEqual(TRACK_LIMITS.slugMax);
    expect(slug).toMatch(TRACK_SLUG_PATTERN);
  });
});

describe("firstFreeSlug", () => {
  it("keeps a free slug", () => {
    expect(firstFreeSlug("run", new Set(["other"]))).toBe("run");
  });

  it("adds the first free number", () => {
    expect(firstFreeSlug("run", new Set(["run"]))).toBe("run-2");
    expect(firstFreeSlug("run", new Set(["run", "run-2", "run-3"]))).toBe("run-4");
  });

  it("trims a long base so the suffix fits", () => {
    const base = "a".repeat(TRACK_LIMITS.slugMax);
    const slug = slugWithSuffix(base, 12);
    expect(slug).toHaveLength(TRACK_LIMITS.slugMax);
    expect(slug.endsWith("-12")).toBe(true);
  });
});
