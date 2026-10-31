// The worker's reads and writes on a track. Every write repeats the ticket's
// conditions (same track, same file, still "processing"), so an out-of-date ticket
// (song replaced, or already finished) writes nothing (decision 025).
import { and, db, eq, tracks } from "@ferrel/db";
import type { AudioFormat } from "@ferrel/db/constants";
import type { AudioProcessJob } from "@ferrel/queues";

const current = (t: AudioProcessJob) =>
  and(eq(tracks.id, t.trackId), eq(tracks.audioKey, t.audioKey), eq(tracks.audioStatus, "processing"));

/** The upload's checked format, or null if the ticket is out of date. */
export async function formatIfCurrent(ticket: AudioProcessJob): Promise<AudioFormat | null> {
  const [row] = await db.select({ format: tracks.audioFormat }).from(tracks).where(current(ticket));
  return row?.format ?? null;
}

/** Save the measurements. False if the ticket went out of date meanwhile. */
export async function saveMeasured(ticket: AudioProcessJob, m: { durationMs: number; waveform: number[] }): Promise<boolean> {
  const done = await db
    .update(tracks)
    .set({ audioStatus: "ready", audioError: null, durationMs: m.durationMs, waveform: m.waveform })
    .where(current(ticket))
    .returning({ id: tracks.id });
  return done.length > 0;
}

/** Mark the track failed with a reason for the artist. False if the ticket went out of date. */
export async function saveFailed(ticket: AudioProcessJob, reason: string): Promise<boolean> {
  const done = await db.update(tracks).set({ audioStatus: "failed", audioError: reason }).where(current(ticket)).returning({ id: tracks.id });
  return done.length > 0;
}
