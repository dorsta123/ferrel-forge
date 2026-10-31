// The sweep (worker side): tracks still "processing" long after their upload lost
// their ticket (e.g. Redis was down), so send it again. A ticket still waiting or
// running has the same id, so nothing is duplicated.
import { and, db, eq, sql, tracks } from "@ferrel/db";
import { queueAudioProcessing } from "./audio-queue";

export async function requeueStuckAudio({ olderThanMs = 10 * 60_000, limit = 100 } = {}): Promise<number> {
  const stuck = await db
    .select({ trackId: tracks.id, audioKey: tracks.audioKey })
    .from(tracks)
    .where(and(eq(tracks.audioStatus, "processing"), sql`${tracks.updatedAt} < now() - make_interval(secs => ${olderThanMs / 1000})`))
    .orderBy(tracks.updatedAt)
    .limit(limit);
  let sent = 0;
  for (const t of stuck) {
    if (t.audioKey && (await queueAudioProcessing({ trackId: t.trackId, audioKey: t.audioKey }))) sent++;
  }
  return sent;
}
