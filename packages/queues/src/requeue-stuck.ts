// The sweep (worker side): tracks still unfinished long after their last change lost
// their ticket (e.g. Redis was down, or the preview step kept failing), so send it again.
// A ticket still waiting or running has the same id, so nothing is duplicated.
import { and, db, eq, or, sql, tracks } from "@ferrel/db";
import { queueAudioProcessing } from "./audio-queue";

const PAGE = 100;

/** Still owed work: not measured yet, or measured but missing a wanted preview that hasn't been given up on. */
const unfinished = or(
  eq(tracks.audioStatus, "processing"),
  and(eq(tracks.audioStatus, "ready"), eq(tracks.previewEnabled, true), sql`${tracks.previewKey} is null and ${tracks.previewFailedAt} is null`),
);

/**
 * Re-send tickets for every stuck track, a page at a time (by id, so every stuck
 * track is reached, not the same first 100 each run). Stops at `max` per run.
 */
export async function requeueStuckAudio({ olderThanMs = 10 * 60_000, max = 5_000 } = {}): Promise<number> {
  let sent = 0;
  let seen = 0;
  let after = "00000000-0000-0000-0000-000000000000";
  while (seen < max) {
    const page = await db
      .select({ trackId: tracks.id, audioKey: tracks.audioKey })
      .from(tracks)
      .where(and(unfinished, sql`${tracks.updatedAt} < now() - make_interval(secs => ${olderThanMs / 1000})`, sql`${tracks.id} > ${after}`))
      .orderBy(tracks.id)
      .limit(PAGE);
    for (const t of page) {
      if (t.audioKey && (await queueAudioProcessing({ trackId: t.trackId, audioKey: t.audioKey }))) sent++;
    }
    seen += page.length;
    if (page.length < PAGE) break;
    after = page[page.length - 1].trackId;
  }
  return sent;
}
