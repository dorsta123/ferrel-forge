import type { AudioStatus } from "@ferrel/db/constants";

// Shapes passed between the Server Actions and the browser. No server imports here.

/** What the editor needs to know about a track's audio processing (no storage keys). */
export type AudioStatusSnapshot = {
  status: AudioStatus;
  /** The reason shown to the artist when the file failed. */
  error: string | null;
  durationMs: number | null;
  previewEnabled: boolean;
  hasPreview: boolean;
  /** The preview failed every attempt (decision 028). */
  previewFailed: boolean;
  /** A retry can help: a slow file, or a preview that couldn't be made. Other failures need a different file. */
  canRetry: boolean;
};

export type RetryResult = { ok: true; snapshot: AudioStatusSnapshot } | { ok: false; error: string };
