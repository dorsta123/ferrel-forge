// The worker's reads and writes on a track. Every write repeats the ticket's
// conditions (same track, same file, right status), so an out-of-date ticket
// (song replaced, already finished, previews switched off) writes nothing (decision 025).
import { and, db, eq, sql, tracks } from "@ferrel/db";
import type { AudioProcessJob } from "@ferrel/queues";

const sameFile = (t: AudioProcessJob) => and(eq(tracks.id, t.trackId), eq(tracks.audioKey, t.audioKey));

/** What still needs doing for this ticket's file, or null if the track no longer has that file. */
export async function audioState(ticket: AudioProcessJob) {
  const [row] = await db
    .select({
      status: tracks.audioStatus,
      format: tracks.audioFormat,
      durationMs: tracks.durationMs,
      previewEnabled: tracks.previewEnabled,
      previewKey: tracks.previewKey,
      previewStartMs: tracks.previewStartMs,
      previewFailedAt: tracks.previewFailedAt,
    })
    .from(tracks)
    .where(sameFile(ticket));
  return row?.format ? { ...row, format: row.format } : null;
}

/** Save the measurements. False if the ticket went out of date meanwhile. */
export async function saveMeasured(ticket: AudioProcessJob, m: { durationMs: number; waveform: number[] }): Promise<boolean> {
  const done = await db
    .update(tracks)
    .set({ audioStatus: "ready", audioError: null, durationMs: m.durationMs, waveform: m.waveform })
    .where(and(sameFile(ticket), eq(tracks.audioStatus, "processing")))
    .returning({ id: tracks.id });
  return done.length > 0;
}

/** Mark the track failed with a reason for the artist. False if the ticket went out of date. */
export async function saveFailed(ticket: AudioProcessJob, reason: string): Promise<boolean> {
  const done = await db
    .update(tracks)
    .set({ audioStatus: "failed", audioError: reason })
    .where(and(sameFile(ticket), eq(tracks.audioStatus, "processing")))
    .returning({ id: tracks.id });
  return done.length > 0;
}

/** Give up on this file's preview after its last attempt, so it isn't retried forever. */
export async function savePreviewFailed(ticket: AudioProcessJob): Promise<void> {
  await db
    .update(tracks)
    .set({ previewFailedAt: new Date() })
    .where(and(sameFile(ticket), eq(tracks.audioStatus, "ready"), sql`${tracks.previewKey} is null`));
}

/** Attach a new preview, only while the track is ready, still wants one and has none. */
export async function savePreview(ticket: AudioProcessJob, previewKey: string): Promise<boolean> {
  const done = await db
    .update(tracks)
    .set({ previewKey })
    .where(and(sameFile(ticket), eq(tracks.audioStatus, "ready"), eq(tracks.previewEnabled, true), sql`${tracks.previewKey} is null`))
    .returning({ id: tracks.id });
  return done.length > 0;
}
