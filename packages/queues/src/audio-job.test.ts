import { describe, expect, it } from "vitest";
import { audioJobId, parseAudioJob } from "./audio-job";

const TRACK = "d85d9986-0ec6-41b8-85e2-cc42b3ee75ed";
const KEY = `adc0827c-a718-401d-aad7-ddcf0b454ad7/${TRACK}/4996c036-8bdb-466d-8c1e-f7ab1100d93e.mp3`;

describe("audioJobId", () => {
  it("is the same for the same track and file, so a duplicate ticket is ignored", () => {
    expect(audioJobId({ trackId: TRACK, audioKey: KEY })).toBe(audioJobId({ trackId: TRACK, audioKey: KEY }));
  });

  it("differs when the file is replaced, so the new file gets its own ticket", () => {
    expect(audioJobId({ trackId: TRACK, audioKey: KEY })).not.toBe(audioJobId({ trackId: TRACK, audioKey: KEY.replace("4996", "5996") }));
  });

  it("is a valid BullMQ id (no ':' and not a plain number)", () => {
    const id = audioJobId({ trackId: TRACK, audioKey: KEY });
    expect(id).not.toContain(":");
    expect(Number.isInteger(Number(id))).toBe(false);
  });
});

describe("parseAudioJob", () => {
  it("accepts a well-formed ticket", () => {
    expect(parseAudioJob({ trackId: TRACK, audioKey: KEY })).toEqual({ trackId: TRACK, audioKey: KEY });
  });

  it.each([
    ["nothing", undefined],
    ["a missing key", { trackId: TRACK }],
    ["a track id that isn't a UUID", { trackId: "1; drop table", audioKey: KEY }],
    ["an empty key", { trackId: TRACK, audioKey: "" }],
    ["extra fields smuggled in", { trackId: TRACK, audioKey: KEY, status: "ready" }],
  ])("refuses %s", (_, data) => {
    expect(parseAudioJob(data)).toBeNull();
  });
});
