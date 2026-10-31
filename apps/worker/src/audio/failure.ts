// Which failures are the file's (tell the artist, stop) and which are ours (retry,
// never blame the artist). Messages are shown to the artist, so they say what to do.
import { AudioToolError } from "@ferrel/audio";

export const AUDIO_FAILURE = {
  unreadable: "We couldn't read this file. Try exporting it again as WAV, MP3 or FLAC.",
  noAudio: "This file has no audio in it.",
  tooLong: "Tracks can be at most 4 hours long.",
  tooSlow: "This file took too long to process. Try exporting it again, or upload a shorter file.",
  missing: "The uploaded file is missing. Please upload it again.",
} as const;

/** The measured track is longer than the database allows. */
export class TooLongError extends Error {}
/** The master the ticket names isn't in storage. */
export class MissingMasterError extends Error {}

export type FailureAction = { action: "fail"; reason: string } | { action: "retry" };

export function classifyFailure(err: unknown, { lastAttempt }: { lastAttempt: boolean }): FailureAction {
  if (err instanceof TooLongError) return { action: "fail", reason: AUDIO_FAILURE.tooLong };
  if (err instanceof MissingMasterError) return { action: "fail", reason: AUDIO_FAILURE.missing };
  if (err instanceof AudioToolError) {
    switch (err.code) {
      case "FAILED":
        return { action: "fail", reason: AUDIO_FAILURE.unreadable };
      case "NO_AUDIO":
        return { action: "fail", reason: AUDIO_FAILURE.noAudio };
      case "TIMEOUT":
        return lastAttempt ? { action: "fail", reason: AUDIO_FAILURE.tooSlow } : { action: "retry" };
    }
  }
  // FFmpeg missing/tampered/not starting, storage or database down: ours. Retried by
  // BullMQ and later by the sweep, so it recovers once fixed.
  return { action: "retry" };
}
