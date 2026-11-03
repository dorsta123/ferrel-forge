// What the worker tells the artist when their audio can't be used (decision 027).
// Shared so the editor knows which failures are worth trying again.

export const AUDIO_FAILURE = {
  unreadable: "We couldn't read this file. Try exporting it again as WAV, MP3 or FLAC.",
  noAudio: "This file has no audio in it.",
  tooLong: "Tracks can be at most 4 hours long.",
  tooSlow: "This file took too long to process. Try exporting it again, or upload a shorter file.",
  missing: "The uploaded file is missing. Please upload it again.",
} as const;

/** Failures a retry can fix (a busy moment); the rest need a different file. */
export const RETRYABLE_AUDIO_FAILURES: readonly string[] = [AUDIO_FAILURE.tooSlow];
