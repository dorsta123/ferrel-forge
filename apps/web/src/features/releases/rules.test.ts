import { describe, expect, it } from "vitest";
import { validateRelease } from "./rules";
import type { ReleaseFormValues } from "./types";

const valid: ReleaseFormValues = {
  title: "Midnight Run",
  slug: "",
  description: "",
  genre: "electronic",
  bpm: "",
  musicalKey: "",
  price: "12.50",
};
const run = (patch: Partial<ReleaseFormValues>) => validateRelease({ ...valid, ...patch });
const errorFor = (patch: Partial<ReleaseFormValues>) => {
  const r = run(patch);
  return r.ok ? {} : r.errors;
};

describe("validateRelease", () => {
  it("accepts a minimal release and normalizes it", () => {
    expect(run({ title: "  Midnight   Run " })).toEqual({
      ok: true,
      value: {
        title: "Midnight Run",
        slug: "midnight-run",
        description: null,
        genre: "electronic",
        bpm: null,
        musicalKey: null,
        basePriceCents: 1250,
      },
    });
  });

  it("keeps optional details and an explicit slug", () => {
    const r = run({ slug: "night-drive", description: "Line one\r\nLine two", bpm: "128", musicalKey: "C#m" });
    expect(r.ok && r.value).toMatchObject({ slug: "night-drive", description: "Line one\nLine two", bpm: 128, musicalKey: "C#m" });
  });

  it("falls back to a usable slug when the title has no latin characters", () => {
    const r = run({ title: "東京" });
    expect(r.ok && r.value.slug).toBe("release");
  });

  it.each<[string, Partial<ReleaseFormValues>, keyof ReleaseFormValues]>([
    ["empty title", { title: "   " }, "title"],
    ["title too long", { title: "a".repeat(101) }, "title"],
    ["control character in title", { title: "Hi\u0007" }, "title"],
    ["bad slug", { slug: "Not A Slug" }, "slug"],
    ["slug with double dash", { slug: "a--b" }, "slug"],
    ["description too long", { description: "a".repeat(2001) }, "description"],
    ["unknown genre", { genre: "polka" }, "genre"],
    ["missing genre", { genre: "" }, "genre"],
    ["bpm too low", { bpm: "39" }, "bpm"],
    ["bpm too high", { bpm: "251" }, "bpm"],
    ["fractional bpm", { bpm: "120.5" }, "bpm"],
    ["unknown key", { musicalKey: "H" }, "musicalKey"],
    ["price below $1", { price: "0.99" }, "price"],
    ["price above $500", { price: "500.01" }, "price"],
    ["price not a number", { price: "ten" }, "price"],
  ])("rejects %s", (_, patch, field) => {
    expect(errorFor(patch)[field]).toBeTruthy();
  });

  it("accepts the limits themselves", () => {
    expect(run({ bpm: "40", price: "1" }).ok).toBe(true);
    expect(run({ bpm: "250", price: "500" }).ok).toBe(true);
  });
});
