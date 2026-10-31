// Audio status and "Try again", independent of Next.js: callers pass an already-
// authenticated creator id. Every function checks ownership itself.
import { and, db, eq, sql, tracks } from "@ferrel/db";
import { RETRYABLE_AUDIO_FAILURES } from "@ferrel/db/constants";
import { queueAudioProcessing } from "@ferrel/queues";
import { getOwnedTrack, type OwnedTrack } from "../tracks/track-access";
import type { AudioStatusSnapshot, RetryResult } from "./types";

type StatusFields = Pick<OwnedTrack, "audioStatus" | "audioError" | "durationMs" | "previewEnabled" | "previewKey" | "previewFailedAt">;

/** A retry can help: a file that was too slow (a busy moment), or a preview that couldn't be made (ours). */
const retryable = (t: StatusFields) =>
  (t.audioStatus === "failed" && RETRYABLE_AUDIO_FAILURES.includes(t.audioError ?? "")) || (t.audioStatus === "ready" && t.previewFailedAt !== null);

export const toSnapshot = (t: StatusFields): AudioStatusSnapshot => ({
  status: t.audioStatus,
  error: t.audioError,
  durationMs: t.durationMs,
  previewEnabled: t.previewEnabled,
  hasPreview: t.previewKey !== null,
  previewFailed: t.previewFailedAt !== null,
  canRetry: retryable(t),
});

/** The owner's view of the track's audio, or null ("not found") for anyone else. */
export async function getAudioStatus(creatorId: string, trackId: string): Promise<AudioStatusSnapshot | null> {
  const track = await getOwnedTrack(creatorId, trackId);
  return track ? toSnapshot(track) : null;
}

/**
 * Send the worker a fresh ticket after a failure a retry can help with: a slow file goes
 * back to "processing"; a preview that was given up on is cleared. Anything else (a file
 * that can't succeed, nothing failed) has nothing to retry. Each update is guarded on the
 * state it read, so a double click sends one ticket.
 */
export async function retryAudio(creatorId: string, trackId: string): Promise<RetryResult> {
  const track = await getOwnedTrack(creatorId, trackId);
  if (!track) return { ok: false, error: "Track not found." };
  if (!retryable(track)) return { ok: false, error: "Nothing to retry." };
  const owned = and(eq(tracks.id, trackId), eq(tracks.creatorId, creatorId), sql`${tracks.audioKey} is not null`);

  const [retried] =
    track.audioStatus === "failed"
      ? await db
          .update(tracks)
          .set({ audioStatus: "processing", audioError: null })
          .where(and(owned, eq(tracks.audioStatus, "failed"), eq(tracks.audioError, track.audioError ?? "")))
          .returning()
      : track.audioStatus === "ready" && track.previewFailedAt !== null
        ? await db
            .update(tracks)
            .set({ previewFailedAt: null })
            .where(and(owned, eq(tracks.audioStatus, "ready"), sql`${tracks.previewFailedAt} is not null`))
            .returning()
        : [];
  if (!retried?.audioKey) return { ok: false, error: "Nothing to retry." };

  // If Redis is down the change still counts: the worker's sweep sends the ticket later.
  await queueAudioProcessing({ trackId, audioKey: retried.audioKey });
  return { ok: true, snapshot: toSnapshot(retried) };
}
