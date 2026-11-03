// Where the 15-second preview may start (pure: shared by browser and server).
// Mirrors the worker's previewWindow (packages/audio/src/preview.ts); a test checks they agree.
import { TRACK_LIMITS } from "@ferrel/db/constants";
import { formatDuration } from "@/lib/format-duration";

/** The latest start that still leaves room for the whole preview (0 for shorter tracks). */
export const latestStartMs = (durationMs: number) => Math.max(0, durationMs - TRACK_LIMITS.previewMs);

/** Until the artist chooses: about 25% in, pulled back to fit. */
export const defaultStartMs = (durationMs: number) => Math.min(Math.round(durationMs * 0.25), latestStartMs(durationMs));

export type StartCheck = { ok: true; startMs: number } | { ok: false; error: string };

/** A start must be a whole millisecond from 0 to the latest start (the database checks this too). */
export function checkStart(startMs: number, durationMs: number): StartCheck {
  const latest = latestStartMs(durationMs);
  if (!Number.isInteger(startMs) || startMs < 0 || startMs > latest) {
    return { ok: false, error: `That start doesn't fit: pick a start between 0:00 and ${formatDuration(latest)}.` };
  }
  return { ok: true, startMs };
}
