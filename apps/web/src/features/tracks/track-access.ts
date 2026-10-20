import { and, db, eq, tracks } from "@ferrel/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string) => UUID.test(value);

export type OwnedTrack = typeof tracks.$inferSelect;

/**
 * A track, but only if it belongs to this creator. Anything else — someone
 * else's track, a deleted one, a malformed id — returns null, so callers
 * answer "not found" and never reveal that another creator's track exists.
 */
export async function getOwnedTrack(creatorId: string, trackId: string): Promise<OwnedTrack | null> {
  if (!isUuid(trackId)) return null; // also avoids a Postgres cast error
  const [track] = await db
    .select()
    .from(tracks)
    .where(and(eq(tracks.id, trackId), eq(tracks.creatorId, creatorId)))
    .limit(1);
  return track ?? null;
}
