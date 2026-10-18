import { describe, expect, it } from "vitest";
import { slugify, validateCreatorProfile } from "./creator-profile";

describe("slugify", () => {
  it.each([
    ["DJ Ferrel", "dj-ferrel"],
    ["The Midnight Forge", "the-midnight-forge"],
    ["Björk & Friends!", "bjork-friends"],
    ["  --2Pac--  ", "2pac"],
    ["a".repeat(40), "a".repeat(30)],
  ])("%s -> %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("never ends in a dash after truncation", () => {
    expect(slugify("abcdefghijklmnopqrstuvwxyz abcd efg")).not.toMatch(/-$/);
  });
});

describe("validateCreatorProfile", () => {
  const valid = { artistName: "DJ Ferrel", slug: "dj-ferrel", bio: "" };

  it("accepts a valid profile", () => {
    expect(validateCreatorProfile(valid)).toEqual({});
  });

  it.each([
    ["blank artist name", { ...valid, artistName: "   " }, "artistName"],
    ["long artist name", { ...valid, artistName: "x".repeat(61) }, "artistName"],
    ["short slug", { ...valid, slug: "ab" }, "slug"],
    ["uppercase slug", { ...valid, slug: "DJ-ferrel" }, "slug"],
    ["double dash", { ...valid, slug: "dj--ferrel" }, "slug"],
    ["reserved slug", { ...valid, slug: "dashboard" }, "slug"],
    ["long bio", { ...valid, bio: "x".repeat(501) }, "bio"],
  ] as const)("rejects %s", (_, input, field) => {
    expect(validateCreatorProfile(input)).toHaveProperty(field);
  });
});
