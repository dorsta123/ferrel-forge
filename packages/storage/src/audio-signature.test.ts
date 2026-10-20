import { describe, expect, it } from "vitest";
import { detectAudioFormat } from "./audio-signature";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

describe("detectAudioFormat", () => {
  it("recognises WAV (RIFF....WAVE)", () => {
    expect(detectAudioFormat(bytes("RIFF", [0x24, 0, 0, 0], "WAVEfmt "))).toBe("wav");
  });

  it("recognises FLAC", () => {
    expect(detectAudioFormat(bytes("fLaC", [0, 0, 0, 34]))).toBe("flac");
  });

  it("recognises MP3 with an ID3 tag and as a raw frame", () => {
    expect(detectAudioFormat(bytes("ID3", [4, 0, 0]))).toBe("mp3");
    expect(detectAudioFormat(bytes([0xff, 0xfb, 0x90, 0x64]))).toBe("mp3");
  });

  it.each([
    ["plain text renamed .wav", bytes("hello, this is not audio")],
    ["HTML", bytes("<!doctype html><html>")],
    ["a Windows .exe", bytes("MZ", [0x90, 0])],
    ["a PNG image", bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a])],
    ["RIFF but not WAVE (AVI video)", bytes("RIFF", [0, 0, 0, 0], "AVI LIST")],
    ["empty file", new Uint8Array()],
  ])("rejects %s", (_, input) => {
    expect(detectAudioFormat(input)).toBeNull();
  });
});
