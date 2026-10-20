import { describe, expect, it } from "vitest";
import { COVER_BARS, coverArt } from "./cover-art";

describe("coverArt", () => {
  it("is deterministic", () => {
    const id = "6f1c2c7e-6a0b-4f43-9a55-0f4b1d5c2e11";
    expect(coverArt(id)).toEqual(coverArt(id));
  });

  it("differs between tracks", () => {
    expect(coverArt("track-a")).not.toEqual(coverArt("track-b"));
  });

  it("produces drawable values", () => {
    for (const seed of ["", "a", "6f1c2c7e-6a0b-4f43-9a55-0f4b1d5c2e11", "x".repeat(500)]) {
      const art = coverArt(seed);
      expect(art.bars).toHaveLength(COVER_BARS);
      expect(art.bars.every((h) => h >= 0.15 && h <= 1)).toBe(true);
      expect(art.angle).toBeGreaterThanOrEqual(0);
      expect(art.angle).toBeLessThan(360);
      expect(art.from).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
