import { writeFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { AudioToolError } from "./errors";
import { ffmpegPath, resolveBinary, verifyBinary } from "./ffmpeg-binary";
import { FFMPEG_BUILDS } from "./ffmpeg-release";
import { makeTempDir } from "./test-fixtures";

const tmp = makeTempDir();
afterAll(() => tmp.cleanup());

const codeOf = (p: Promise<unknown>) => p.then(() => "resolved", (e: unknown) => (e instanceof AudioToolError ? e.code : String(e)));

describe("resolveBinary", () => {
  it("knows the pinned builds for Windows and Linux on x64", () => {
    expect(resolveBinary("win32", "x64").sha256).toBe(FFMPEG_BUILDS["win32-x64"].sha256);
    expect(resolveBinary("linux", "x64").path).toMatch(/linux-x64[\\/]ffmpeg$/);
  });

  it("refuses machines without a pinned build", () => {
    expect(() => resolveBinary("darwin", "arm64")).toThrow(expect.objectContaining({ code: "UNSUPPORTED_PLATFORM" }));
  });
});

describe("verifyBinary", () => {
  it("refuses a file that isn't the pinned build (tampered or corrupted)", async () => {
    const fake = tmp.file("ffmpeg-fake.exe");
    writeFileSync(fake, "not really ffmpeg");
    expect(await codeOf(verifyBinary(fake, FFMPEG_BUILDS["win32-x64"].sha256))).toBe("FFMPEG_TAMPERED");
  });

  it("explains how to fix a missing binary", async () => {
    const err = await verifyBinary(tmp.file("does-not-exist"), "x").catch((e: AudioToolError) => e);
    expect(err).toMatchObject({ code: "FFMPEG_MISSING", message: expect.stringContaining("pnpm audio:fetch") });
  });
});

describe("ffmpegPath", () => {
  it("returns the fetched, verified binary for this machine", async () => {
    expect(await ffmpegPath()).toBe(resolveBinary().path);
  });
});
