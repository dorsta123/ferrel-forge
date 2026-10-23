// Read-only queries for the creator dashboard. Every query is scoped to the
// creator id the caller got from the session, never to anything in the URL.
import { and, db, eq, sql, tracks } from "@ferrel/db";
import type { TrackFilter } from "./filters";

/** Creators have a handful of releases for now; paging comes later if needed. */
export const TRACK_LIST_LIMIT = 100;

export async function listCreatorTracks(creatorId: string, filter: TrackFilter) {
  return db
    .select({
      id: tracks.id,
      title: tracks.title,
      status: tracks.status,
      genre: tracks.genre,
      basePriceCents: tracks.basePriceCents,
      durationMs: tracks.durationMs,
      hasAudio: sql<boolean>`${tracks.audioKey} is not null`,
      updatedAt: tracks.updatedAt,
    })
    .from(tracks)
    .where(and(eq(tracks.creatorId, creatorId), filter === "all" ? undefined : eq(tracks.status, filter)))
    .orderBy(sql`${tracks.updatedAt} desc`, sql`${tracks.id}`)
    .limit(TRACK_LIST_LIMIT);
}

export type CreatorTrackRow = Awaited<ReturnType<typeof listCreatorTracks>>[number];

export type CreatorTrackStats = Record<TrackFilter, number>;

/** Counts per status, in one query. */
export async function creatorTrackStats(creatorId: string): Promise<CreatorTrackStats> {
  const [row] = await db
    .select({
      all: sql<number>`count(*)::int`,
      draft: sql<number>`(count(*) filter (where ${tracks.status} = 'draft'))::int`,
      published: sql<number>`(count(*) filter (where ${tracks.status} = 'published'))::int`,
      archived: sql<number>`(count(*) filter (where ${tracks.status} = 'archived'))::int`,
    })
    .from(tracks)
    .where(eq(tracks.creatorId, creatorId));
  return row;
}
