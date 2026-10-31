import { describe, expect, it } from "vitest";
import { AudioToolError } from "@ferrel/audio";
import { AUDIO_FAILURE, classifyFailure, MissingMasterError, TooLongError } from "./failure";

const tool = (code: ConstructorParameters<typeof AudioToolError>[0]) => new AudioToolError(code, "detail");

describe("classifyFailure", () => {
  it.each([
    ["a file FFmpeg can't read", tool("FAILED"), AUDIO_FAILURE.unreadable],
    ["a file with no sound", tool("NO_AUDIO"), AUDIO_FAILURE.noAudio],
    ["a track over 4 hours", new TooLongError(), AUDIO_FAILURE.tooLong],
    ["a master missing from storage", new MissingMasterError(), AUDIO_FAILURE.missing],
  ])("blames the file at once for %s", (_, err, reason) => {
    expect(classifyFailure(err, { lastAttempt: false })).toEqual({ action: "fail", reason });
  });

  it("retries a slow file, and only gives up on the last attempt", () => {
    expect(classifyFailure(tool("TIMEOUT"), { lastAttempt: false })).toEqual({ action: "retry" });
    expect(classifyFailure(tool("TIMEOUT"), { lastAttempt: true })).toEqual({ action: "fail", reason: AUDIO_FAILURE.tooSlow });
  });

  it.each([
    ["FFmpeg not installed", tool("FFMPEG_MISSING")],
    ["FFmpeg tampered with", tool("FFMPEG_TAMPERED")],
    ["FFmpeg not starting", tool("START_FAILED")],
    ["FFmpeg killed by the system (e.g. out of memory)", tool("KILLED")],
    ["an unsupported server", tool("UNSUPPORTED_PLATFORM")],
    ["storage or database errors", new Error("ECONNREFUSED")],
  ])("never blames the artist for our problem: %s (retried, even on the last attempt)", (_, err) => {
    expect(classifyFailure(err, { lastAttempt: true })).toEqual({ action: "retry" });
  });
});
