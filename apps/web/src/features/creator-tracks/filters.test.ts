import { describe, expect, it } from "vitest";
import { filterHref, parseTrackFilter } from "./filters";

describe("parseTrackFilter", () => {
  it.each(["all", "draft", "published", "archived"])("accepts %s", (v) => {
    expect(parseTrackFilter(v)).toBe(v);
  });

  it.each([undefined, "", "Draft", "deleted", "draft' or 1=1", "__proto__", "constructor"])("falls back to all for %j", (v) => {
    expect(parseTrackFilter(v)).toBe("all");
  });

  it("uses the first value when repeated (?status=a&status=b)", () => {
    expect(parseTrackFilter(["published", "draft"])).toBe("published");
  });
});

describe("filterHref", () => {
  it("keeps the plain dashboard URL for all", () => {
    expect(filterHref("all")).toBe("/dashboard");
    expect(filterHref("archived")).toBe("/dashboard?status=archived");
  });
});
