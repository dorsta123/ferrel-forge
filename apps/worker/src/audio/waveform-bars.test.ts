import { describe, expect, it } from "vitest";
import { toWaveformBars } from "./waveform-bars";

describe("toWaveformBars", () => {
  it("turns 200 peaks of 0–1 into 200 whole numbers of 0–1000", () => {
    const peaks = Array.from({ length: 200 }, (_, i) => i / 199);
    const bars = toWaveformBars(peaks);
    expect(bars).toHaveLength(200);
    expect(bars[0]).toBe(0);
    expect(bars[199]).toBe(1000);
    expect(bars.every((b) => Number.isInteger(b) && b >= 0 && b <= 1000)).toBe(true);
  });

  it("rounds to the nearest thousandth and keeps out-of-range values inside 0–1000", () => {
    const bars = toWaveformBars([0.4126, -0.2, 1.5, ...Array<number>(197).fill(0.5)]);
    expect(bars.slice(0, 3)).toEqual([413, 0, 1000]);
  });

  it("refuses the wrong number of peaks (the database would too)", () => {
    expect(() => toWaveformBars(Array<number>(199).fill(0.5))).toThrow(/200/);
  });
});
