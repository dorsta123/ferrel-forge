import { describe, expect, it } from "vitest";
import { exploreHref, pageCount, parseCreatorSlug, parseExploreParams, parseTrackSlug } from "./params";

describe("parseExploreParams", () => {
  it("reads a valid genre and page", () => {
    expect(parseExploreParams({ genre: "lo-fi", page: "3" })).toEqual({ genre: "lo-fi", page: 3 });
  });

  it.each([
    [{}, { genre: null, page: 1 }],
    [{ genre: "polka", page: "0" }, { genre: null, page: 1 }],
    [{ genre: "LO-FI", page: "-2" }, { genre: null, page: 1 }],
    [{ page: "2.5" }, { genre: null, page: 1 }],
    [{ page: "1e3" }, { genre: null, page: 1 }],
    [{ page: "99999" }, { genre: null, page: 10_000 }],
    [{ genre: ["rock", "pop"], page: ["2", "9"] }, { genre: "rock", page: 2 }],
  ])("%j -> %j", (input, expected) => {
    expect(parseExploreParams(input)).toEqual(expected);
  });
});

describe("exploreHref", () => {
  it("omits defaults", () => {
    expect(exploreHref({ genre: null, page: 1 })).toBe("/explore");
    expect(exploreHref({ genre: "rnb", page: 1 })).toBe("/explore?genre=rnb");
    expect(exploreHref({ genre: "rnb", page: 2 })).toBe("/explore?genre=rnb&page=2");
  });

  it("round-trips through the parser", () => {
    const params = { genre: "hip-hop" as const, page: 4 };
    const query = Object.fromEntries(new URLSearchParams(exploreHref(params).split("?")[1]));
    expect(parseExploreParams(query)).toEqual(params);
  });
});

describe("slugs from the URL", () => {
  it("accepts real slugs", () => {
    expect(parseCreatorSlug("dj-ferrel")).toBe("dj-ferrel");
    expect(parseTrackSlug("midnight-run-2")).toBe("midnight-run-2");
    expect(parseTrackSlug("a")).toBe("a");
  });

  it.each(["", "ab", "DJ-Ferrel", "dj--ferrel", "-dj", "../admin", "dj ferrel", "a".repeat(31)])("rejects creator slug %j", (v) => {
    expect(parseCreatorSlug(v)).toBeNull();
  });

  it.each(["", "Track", "a/b", "%2e%2e", "a".repeat(81)])("rejects track slug %j", (v) => {
    expect(parseTrackSlug(v)).toBeNull();
  });
});

describe("pageCount", () => {
  it("is at least one page", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(24)).toBe(1);
    expect(pageCount(25)).toBe(2);
  });
});
