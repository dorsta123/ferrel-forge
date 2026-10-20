import { describe, expect, it } from "vitest";
import { TRACK_LIMITS } from "@ferrel/db/constants";
import { checkAudioFile } from "./rules";

const ok = (name: string, type = "", size = 1000) => checkAudioFile({ name, size, type });

describe("checkAudioFile", () => {
  it.each([
    ["song.wav", "audio/wav", "wav"],
    ["song.WAV", "audio/x-wav", "wav"],
    ["song.wave", "", "wav"],
    ["song.mp3", "audio/mpeg", "mp3"],
    ["song.flac", "", "flac"],
    ["my.track.v2.flac", "audio/x-flac", "flac"],
  ])("accepts %s (%s)", (name, type, format) => {
    expect(ok(name, type)).toEqual({ ok: true, format });
  });

  it.each([
    ["no extension", "song"],
    ["wrong extension", "song.ogg"],
    ["executable", "song.exe"],
    ["extension only in the middle", "song.wav.txt"],
  ])("rejects %s", (_, name) => {
    expect(ok(name).ok).toBe(false);
  });

  it("rejects a declared type that disagrees with the extension", () => {
    expect(ok("song.wav", "text/html").ok).toBe(false);
    expect(ok("song.mp3", "audio/wav").ok).toBe(false);
  });

  it("rejects empty and over-limit sizes", () => {
    expect(ok("a.wav", "", 0).ok).toBe(false);
    expect(ok("a.wav", "", -5).ok).toBe(false);
    expect(ok("a.wav", "", TRACK_LIMITS.audioMaxBytes).ok).toBe(true);
    expect(ok("a.wav", "", TRACK_LIMITS.audioMaxBytes + 1).ok).toBe(false);
  });
});
