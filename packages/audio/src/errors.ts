export type AudioToolErrorCode =
  | "UNSUPPORTED_PLATFORM" // no pinned FFmpeg for this operating system
  | "FFMPEG_MISSING" // not fetched yet: run `pnpm audio:fetch`
  | "FFMPEG_TAMPERED" // file doesn't match the pinned SHA-256
  | "START_FAILED" // the operating system couldn't start FFmpeg (our problem, not the file's)
  | "TIMEOUT" // FFmpeg ran past its time limit and was stopped
  | "FAILED" // FFmpeg exited with an error (e.g. not valid audio)
  | "NO_AUDIO"; // the file decoded to zero samples

/** Every failure from this package, with a stable code callers can branch on. */
export class AudioToolError extends Error {
  constructor(
    readonly code: AudioToolErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AudioToolError";
  }
}
