import { readFileSync, writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyzeAudio, PEAK_COUNT } from "./analyze";
import { AudioToolError } from "./errors";
import { generate, makeTempDir } from "./test-fixtures";

// Lengths may differ by a few ms between FFmpeg builds (decision 023).
const TOLERANCE_MS = 50;
const tmp = makeTempDir();

beforeAll(async () => {
  await generate(tmp.file("tone 40s.wav"), { seconds: 40 });
  await generate(tmp.file("tone 40s.mp3"), { seconds: 40, extra: ["-c:a", "libmp3lame", "-q:a", "4"] }); // VBR
  await generate(tmp.file("tone 40s.flac"), { seconds: 40 });
  await generate(tmp.file("short 8s.wav"), { seconds: 8 });
  await generate(tmp.file("silence 10s.wav"), { seconds: 10, silent: true });
  // 20 s loud tone followed by 20 s of silence, to check the waveform's shape.
  await generate(tmp.file("loud.wav"), { seconds: 20, volume: 6 });
  await generate(tmp.file("quiet.wav"), { seconds: 20, silent: true });
  writeFileSync(tmp.file("list.txt"), `file '${tmp.file("loud.wav").replace(/'/g, "'\\''")}'\nfile '${tmp.file("quiet.wav").replace(/'/g, "'\\''")}'\n`);
  const { runFfmpeg } = await import("./run-ffmpeg");
  await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", tmp.file("list.txt"), tmp.file("loud then quiet.wav")]);
});
afterAll(() => tmp.cleanup());

describe("analyzeAudio", () => {
  it.each(["wav", "mp3", "flac"])("reads the exact length of a 40 s %s", async (ext) => {
    const { durationMs } = await analyzeAudio(tmp.file(`tone 40s.${ext}`), ext as "wav" | "mp3" | "flac");
    expect(Math.abs(durationMs - 40_000)).toBeLessThanOrEqual(TOLERANCE_MS);
  });

  it(`returns ${PEAK_COUNT} peaks between 0 and 1`, async () => {
    const { peaks } = await analyzeAudio(tmp.file("tone 40s.mp3"), "mp3");
    expect(peaks).toHaveLength(PEAK_COUNT);
    expect(peaks.every((p) => p >= 0 && p <= 1)).toBe(true);
  });

  it("draws loud parts high and silent parts near zero", async () => {
    const { durationMs, peaks } = await analyzeAudio(tmp.file("loud then quiet.wav"), "wav");
    expect(Math.abs(durationMs - 40_000)).toBeLessThanOrEqual(TOLERANCE_MS);
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(avg(peaks.slice(5, 95))).toBeGreaterThan(0.5);
    expect(avg(peaks.slice(105, 195))).toBeLessThan(0.01);
  });

  it("handles silence and short tracks", async () => {
    const silent = await analyzeAudio(tmp.file("silence 10s.wav"), "wav");
    expect(Math.abs(silent.durationMs - 10_000)).toBeLessThanOrEqual(TOLERANCE_MS);
    expect(Math.max(...silent.peaks)).toBeLessThan(0.001);
    const short = await analyzeAudio(tmp.file("short 8s.wav"), "wav");
    expect(Math.abs(short.durationMs - 8_000)).toBeLessThanOrEqual(TOLERANCE_MS);
    expect(short.peaks).toHaveLength(PEAK_COUNT);
  });

  it("measures a file with a damaged stretch as the audio that still decodes (documented behaviour)", async () => {
    // FFmpeg resyncs past the damage silently (no error at any log level, exit 0),
    // so the length comes out slightly short. If a future FFmpeg starts refusing
    // such files instead, this test will flag the change.
    const flac = Buffer.from(readFileSync(tmp.file("tone 40s.flac")));
    const middle = Math.floor(flac.length / 2);
    for (let i = 0; i < 4096; i++) flac[middle + i] = (i * 31) % 256;
    writeFileSync(tmp.file("damaged.flac"), flac);
    const { durationMs } = await analyzeAudio(tmp.file("damaged.flac"), "flac");
    expect(durationMs).toBeGreaterThan(38_000);
    expect(durationMs).toBeLessThanOrEqual(40_000 + TOLERANCE_MS);
  });

  it("measures a cut-off MP3 as the audio it really contains", async () => {
    // MP3 is designed to play from any piece: a shorter file is a valid, shorter track.
    // (Uploads arriving incomplete are caught earlier: storage checks the exact byte size.)
    const full = readFileSync(tmp.file("tone 40s.mp3"));
    writeFileSync(tmp.file("first third.mp3"), full.subarray(0, Math.floor(full.length / 3)));
    const { durationMs } = await analyzeAudio(tmp.file("first third.mp3"), "mp3");
    expect(durationMs).toBeGreaterThan(10_000);
    expect(durationMs).toBeLessThan(16_000);
  });

  it("refuses a file that isn't audio", async () => {
    writeFileSync(tmp.file("fake.wav"), "plain text pretending to be audio");
    await expect(analyzeAudio(tmp.file("fake.wav"), "wav")).rejects.toBeInstanceOf(AudioToolError);
  });
});
