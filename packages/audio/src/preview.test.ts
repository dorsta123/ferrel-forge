import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyzeAudio } from "./analyze";
import { makePreview, PREVIEW_MS, previewWindow } from "./preview";
import { generate, makeTempDir } from "./test-fixtures";

const TOLERANCE_MS = 50; // decision 023
const tmp = makeTempDir();

describe("previewWindow", () => {
  it("starts about 25% in by default, 15 s long, tone at 7.5 s", () => {
    expect(previewWindow(40_000, null)).toEqual({ startMs: 10_000, lengthMs: 15_000, toneAtMs: 7_500 });
  });

  it("uses the artist's start when it fits", () => {
    expect(previewWindow(40_000, 3_000).startMs).toBe(3_000);
  });

  it("pulls a start too close to the end back so 15 s fit", () => {
    expect(previewWindow(40_000, 39_000).startMs).toBe(25_000);
    expect(previewWindow(100_000, null).startMs).toBe(25_000); // 25% in, fits
    expect(previewWindow(18_000, null).startMs).toBe(3_000); // 25% = 4.5 s doesn't fit, pulled back
  });

  it("uses the whole of a track shorter than 15 s, with the tone in its middle", () => {
    expect(previewWindow(8_000, 2_000)).toEqual({ startMs: 0, lengthMs: 8_000, toneAtMs: 4_000 });
  });

  it("never starts before the beginning", () => {
    expect(previewWindow(40_000, -500).startMs).toBe(0);
  });
});

describe("makePreview", () => {
  beforeAll(async () => {
    await generate(tmp.file("tone 40s.mp3"), { seconds: 40, extra: ["-c:a", "libmp3lame", "-q:a", "4"] });
    await generate(tmp.file("silence 40s.flac"), { seconds: 40, silent: true });
    await generate(tmp.file("short 8s.wav"), { seconds: 8, silent: true });
  });
  afterAll(() => tmp.cleanup());

  it(`makes a ${PREVIEW_MS / 1000} s MP3 from a longer track`, async () => {
    await makePreview(tmp.file("tone 40s.mp3"), "mp3", tmp.file("p1.mp3"), previewWindow(40_000, null));
    const { durationMs } = await analyzeAudio(tmp.file("p1.mp3"), "mp3");
    expect(Math.abs(durationMs - 15_000)).toBeLessThanOrEqual(TOLERANCE_MS);
  });

  it("puts one tone at 7.5 s and nothing else (checked on a silent track)", async () => {
    await makePreview(tmp.file("silence 40s.flac"), "flac", tmp.file("p2.mp3"), previewWindow(40_000, null));
    const { peaks } = await analyzeAudio(tmp.file("p2.mp3"), "mp3"); // 200 peaks over 15 s: 75 ms each
    const loud = peaks.flatMap((p, i) => (p > 0.01 ? [i] : [])); // silence is ~0; the tone peaks around 0.03
    expect(loud.length).toBeGreaterThan(0);
    expect(Math.abs(loud[0] - 100)).toBeLessThanOrEqual(2); // starts at 7.5 s
    expect(loud[loud.length - 1]).toBeLessThanOrEqual(110); // lasts about 0.6 s
    expect(Math.max(...peaks)).toBeLessThan(0.5); // soft
  });

  it("uses the whole of a short track, tone in the middle", async () => {
    await makePreview(tmp.file("short 8s.wav"), "wav", tmp.file("p3.mp3"), previewWindow(8_000, null));
    const { durationMs, peaks } = await analyzeAudio(tmp.file("p3.mp3"), "mp3");
    expect(Math.abs(durationMs - 8_000)).toBeLessThanOrEqual(TOLERANCE_MS);
    const firstLoud = peaks.findIndex((p) => p > 0.01);
    expect(Math.abs(firstLoud - 100)).toBeLessThanOrEqual(2); // 4 s of 8 s
  });
});
