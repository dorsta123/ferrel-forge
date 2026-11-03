import { describe, expect, it } from "vitest";
import { captionFor, playedBars, timeLabel, windowBars } from "./player-math";

describe("windowBars", () => {
  it("maps the preview window onto the 200 waveform bars", () => {
    // 40 s song, preview 10–25 s: bars 50 up to 125.
    expect(windowBars(200, 40_000, 10_000, 15_000)).toEqual({ from: 50, to: 125 });
  });

  it("covers every bar for a song shorter than the preview", () => {
    expect(windowBars(200, 8_000, 0, 8_000)).toEqual({ from: 0, to: 200 });
  });
});

describe("playedBars", () => {
  it("fills the window from its start as the preview plays", () => {
    const w = { from: 50, to: 125 };
    expect(playedBars(w, 0, 15_000)).toBe(50);
    expect(playedBars(w, 7_500, 15_000)).toBe(87.5);
    expect(playedBars(w, 15_000, 15_000)).toBe(125);
    expect(playedBars(w, 99_000, 15_000)).toBe(125); // never past the window
  });
});

describe("captionFor", () => {
  it("says how long the preview really is", () => {
    expect(captionFor(15_000)).toBe("Preview · 15 s with a soft watermark tone");
    expect(captionFor(8_000)).toBe("Preview · 8 s with a soft watermark tone");
  });
});

describe("timeLabel", () => {
  it("shows the elapsed and total time", () => {
    expect(timeLabel(0, 15_000)).toBe("0:00 / 0:15");
    expect(timeLabel(4_400, 15_000)).toBe("0:04 / 0:15");
  });
});
