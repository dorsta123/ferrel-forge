// Public catalog queries. Rules (decision 015):
// - lists show only published releases;
// - a release page also opens for archived releases (buyers' links keep working);
// - drafts are never public;
// - only display columns are selected — never the audio file location or owner ids.
import { cache } from "react";
import { and, creatorProfiles, db, eq, sql, tracks } from "@ferrel/db";
import type { Genre } from "@ferrel/db/constants";
import { EXPLORE_PAGE_SIZE } from "./params";

const cardColumns = {
  id: tracks.id,
  slug: tracks.slug,
  title: tracks.title,
  genre: tracks.genre,
  bpm: tracks.bpm,
  musicalKey: tracks.musicalKey,
  totalSupply: tracks.totalSupply,
  copiesSold: tracks.copiesSold,
  basePriceCents: tracks.basePriceCents,
  creatorSlug: creatorProfiles.slug,
  artistName: creatorProfiles.artistName,
};

const published = eq(tracks.status, "published");
const newestFirst = [sql`${tracks.publishedAt} desc`, sql`${tracks.id}`];

function cards() {
  return db.select(cardColumns).from(tracks).innerJoin(creatorProfiles, eq(creatorProfiles.userId, tracks.creatorId));
}

export type PublicTrackCard = Awaited<ReturnType<typeof latestReleases>>[number];

export async function latestReleases(limit = 4) {
  return cards().where(published).orderBy(...newestFirst).limit(limit);
}

export async function explorePage({ genre, page }: { genre: Genre | null; page: number }) {
  const where = and(published, genre ? eq(tracks.genre, genre) : undefined);
  const [rows, [{ total }]] = await Promise.all([
    cards()
      .where(where)
      .orderBy(...newestFirst)
      .limit(EXPLORE_PAGE_SIZE)
      .offset((page - 1) * EXPLORE_PAGE_SIZE),
    db.select({ total: sql<number>`count(*)::int` }).from(tracks).where(where),
  ]);
  return { rows, total };
}

/** Cached per request: generateMetadata and the page share one query. */
export const getPublicCreator = cache(async (slug: string) => {
  const [creator] = await db
    .select({ userId: creatorProfiles.userId, slug: creatorProfiles.slug, artistName: creatorProfiles.artistName, bio: creatorProfiles.bio })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.slug, slug))
    .limit(1);
  return creator ?? null;
});

export async function creatorReleases(creatorUserId: string) {
  return cards()
    .where(and(published, eq(tracks.creatorId, creatorUserId)))
    .orderBy(...newestFirst)
    .limit(100);
}

/** One release page: published or archived, looked up by both slugs. */
export const getPublicTrack = cache(async (creatorSlug: string, trackSlug: string) => {
  const [track] = await db
    .select({
      ...cardColumns,
      description: tracks.description,
      status: tracks.status,
      publishedAt: tracks.publishedAt,
    })
    .from(tracks)
    .innerJoin(creatorProfiles, eq(creatorProfiles.userId, tracks.creatorId))
    .where(and(eq(creatorProfiles.slug, creatorSlug), eq(tracks.slug, trackSlug), sql`${tracks.status} in ('published', 'archived')`))
    .limit(1);
  return track ?? null;
});

export type PublicTrack = NonNullable<Awaited<ReturnType<typeof getPublicTrack>>>;
