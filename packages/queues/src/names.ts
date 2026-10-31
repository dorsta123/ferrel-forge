/** One queue per kind of background work (web → worker only through these). */
export const QUEUE_NAMES = { system: "system", audio: "audio" } as const;

export const JOB_NAMES = {
  ping: "ping",
  /** Re-send tickets for tracks stuck in "processing" (e.g. Redis was down at upload). */
  requeueStuckAudio: "requeue-stuck-audio",
  /** Process one uploaded file: length, preview, waveform (phase 4 slices 5–7). */
  audioProcess: "audio:process",
} as const;
