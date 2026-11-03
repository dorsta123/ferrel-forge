import { describe, expect, it } from "vitest";
import { previewWindow } from "@ferrel/audio";
import { checkStart, defaultStartMs, latestStartMs } from "./rules";

describe("latestStartMs", () => {
  it("leaves room for the 15 s preview, and is 0 for shorter tracks", () => {
    expect(latestStartMs(222_000)).toBe(207_000);
    expect(latestStartMs(15_000)).toBe(0);
    expect(latestStartMs(8_000)).toBe(0);
  });
});

describe("defaultStartMs", () => {
  it("matches the worker's default (about 25% in, pulled back to fit)", () => {
    for (const d of [8_000, 15_000, 18_000, 40_000, 222_000, 4 * 3600_000]) {
      expect(defaultStartMs(d)).toBe(previewWindow(d, null).startMs);
    }
  });
});

describe("checkStart", () => {
  it("accepts any whole millisecond from 0 to the latest start", () => {
    expect(checkStart(0, 222_000)).toEqual({ ok: true, startMs: 0 });
    expect(checkStart(207_000, 222_000)).toEqual({ ok: true, startMs: 207_000 });
  });

  it.each([
    ["past the latest start", 207_001],
    ["negative", -1],
    ["a fraction", 1.5],
    ["not a number", Number.NaN],
    ["infinite", Number.POSITIVE_INFINITY],
  ])("refuses a start %s", (_, startMs) => {
    expect(checkStart(startMs, 222_000).ok).toBe(false);
  });
});
