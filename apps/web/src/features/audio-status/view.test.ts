import { describe, expect, it } from "vitest";
import type { AudioStatusSnapshot } from "./types";
import { audioStatusView } from "./view";

const ready: AudioStatusSnapshot = { status: "ready", error: null, durationMs: 222_000, previewEnabled: true, hasPreview: true, previewFailed: false };

describe("audioStatusView", () => {
  it("says nothing is uploaded yet when there's no audio, and doesn't keep checking", () => {
    expect(audioStatusView({ ...ready, status: "none", durationMs: null, hasPreview: false })).toMatchObject({ state: "none", settled: true, canRetry: false });
  });

  it("shows processing while the track is being measured, and keeps checking", () => {
    expect(audioStatusView({ ...ready, status: "processing", durationMs: null, hasPreview: false })).toEqual({
      state: "processing",
      title: "Processing",
      detail: "Measuring your track…",
      preview: null,
      canRetry: false,
      settled: false,
    });
  });

  it("shows ready with the length and a finished preview, and stops checking", () => {
    expect(audioStatusView(ready)).toEqual({ state: "ready", title: "Ready", detail: "3:42", preview: "Preview ready", canRetry: false, settled: true });
  });

  it("keeps checking while the preview is still being made", () => {
    expect(audioStatusView({ ...ready, hasPreview: false })).toMatchObject({ preview: "Making the preview…", settled: false });
  });

  it("says the preview is off when the artist switched it off", () => {
    expect(audioStatusView({ ...ready, previewEnabled: false, hasPreview: false })).toMatchObject({ preview: "Preview off", settled: true, canRetry: false });
  });

  it("offers a retry when the preview couldn't be made, while the song stays ready", () => {
    expect(audioStatusView({ ...ready, hasPreview: false, previewFailed: true })).toMatchObject({
      state: "ready",
      preview: "The preview couldn't be made.",
      canRetry: true,
      settled: true,
    });
  });

  it("shows the reason and offers a retry when the file failed", () => {
    const reason = "We couldn't read this file. Try exporting it again as WAV, MP3 or FLAC.";
    expect(audioStatusView({ ...ready, status: "failed", error: reason, durationMs: null, hasPreview: false })).toEqual({
      state: "failed",
      title: "Failed",
      detail: reason,
      preview: null,
      canRetry: true,
      settled: true,
    });
  });
});
