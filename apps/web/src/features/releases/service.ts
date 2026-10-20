// Release logic, independent of Next.js: callers pass an already-authenticated
// creator id. Every write re-checks ownership and repeats its rules inside the
// UPDATE/DELETE itself, so a request racing another (or a sale) can't slip past.
import { and, db, eq, sql, tracks } from "@ferrel/db";
import { deleteObject } from "@ferrel/storage";
import { PG_UNIQUE_VIOLATION, pgError } from "@/lib/pg-error";
import { getOwnedTrack } from "../tracks/track-access";
import { centsToInput } from "./money";
import { validateRelease } from "./rules";
import { firstFreeSlug } from "./slug";
import { RELEASE_ACTIONS, checkAction, releaseFacts, releaseLocks, type ReleaseAction } from "./status";
import type { ReleaseActionResult, ReleaseErrors, ReleaseFormValues } from "./types";

const SLUG_UNIQUE = "tracks_creator_slug_uniq";
const SLUG_TAKEN = "You already have a release at this URL.";
const CHANGED = "This release changed in the meantime. Reload the page and try again.";
const NOT_FOUND = "Track not found.";

export type CreateReleaseResult = { ok: true; id: string } | { ok: false; errors: ReleaseErrors };
export type UpdateReleaseResult = { ok: true } | { ok: false; errors: ReleaseErrors };

/** New draft. A URL the creator already uses gets "-2", "-3", … */
export async function createRelease(creatorId: string, input: ReleaseFormValues): Promise<CreateReleaseResult> {
  const check = validateRelease(input);
  if (!check.ok) return check;

  // Retry if a parallel request takes the chosen slug between the lookup and the insert.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = firstFreeSlug(check.value.slug, await slugsLike(creatorId, check.value.slug));
    try {
      const [row] = await db
        .insert(tracks)
        .values({ ...check.value, slug, creatorId })
        .returning({ id: tracks.id });
      return { ok: true, id: row.id };
    } catch (err) {
      if (!isSlugClash(err)) throw err;
    }
  }
  return { ok: false, errors: { slug: SLUG_TAKEN } };
}

/** Edit details. Locked fields keep their stored values whatever was submitted. */
export async function updateRelease(creatorId: string, trackId: string, input: ReleaseFormValues): Promise<UpdateReleaseResult> {
  const track = await getOwnedTrack(creatorId, trackId);
  if (!track) return { ok: false, errors: { form: NOT_FOUND } };
  const locks = releaseLocks(releaseFacts(track));
  if (locks.readOnly) return { ok: false, errors: { form: "Archived releases can't be edited." } };

  const check = validateRelease({
    ...input,
    ...(locks.slug && { slug: track.slug }),
    ...(locks.sale && { totalSupply: String(track.totalSupply), price: centsToInput(track.basePriceCents) }),
  });
  if (!check.ok) return check;
  const v = check.value;

  try {
    const updated = await db
      .update(tracks)
      .set(v)
      .where(
        and(
          eq(tracks.id, trackId),
          eq(tracks.creatorId, creatorId),
          sql`${tracks.status} <> 'archived'`,
          // The same locks, enforced by the database row as it is right now.
          sql`(${tracks.publishedAt} is null or ${tracks.slug} = ${v.slug})`,
          sql`(${tracks.copiesSold} = 0 or (${tracks.totalSupply} = ${v.totalSupply} and ${tracks.basePriceCents} = ${v.basePriceCents}))`,
        ),
      )
      .returning({ id: tracks.id });
    if (updated.length === 0) return { ok: false, errors: { form: CHANGED } };
  } catch (err) {
    if (isSlugClash(err)) return { ok: false, errors: { slug: SLUG_TAKEN } };
    throw err;
  }
  return { ok: true };
}

/** Publish, unpublish, archive or delete (see status.ts for the rules). */
export async function changeReleaseStatus(creatorId: string, trackId: string, action: ReleaseAction): Promise<ReleaseActionResult> {
  if (!RELEASE_ACTIONS.includes(action)) return { ok: false, error: "Unknown action." };
  const track = await getOwnedTrack(creatorId, trackId);
  if (!track) return { ok: false, error: NOT_FOUND };
  const check = checkAction(releaseFacts(track), action);
  if (!check.ok) return check;

  const owned = and(eq(tracks.id, trackId), eq(tracks.creatorId, creatorId));
  const unsold = eq(tracks.copiesSold, 0);
  let changed: unknown[];

  switch (action) {
    case "publish":
      changed = await db
        .update(tracks)
        // Keep the first publish time: it locks the URL, and re-publishing doesn't jump the queue on Explore.
        .set({ status: "published", publishedAt: sql`coalesce(${tracks.publishedAt}, now())` })
        .where(and(owned, eq(tracks.status, "draft"), sql`${tracks.audioKey} is not null`))
        .returning({ id: tracks.id });
      break;
    case "unpublish":
      changed = await db
        .update(tracks)
        .set({ status: "draft" })
        .where(and(owned, eq(tracks.status, "published"), unsold))
        .returning({ id: tracks.id });
      break;
    case "archive":
      changed = await db
        .update(tracks)
        .set({ status: "archived" })
        .where(and(owned, eq(tracks.status, "published")))
        .returning({ id: tracks.id });
      break;
    case "delete": {
      const [gone] = await db
        .delete(tracks)
        .where(and(owned, eq(tracks.status, "draft"), unsold))
        .returning({ audioKey: tracks.audioKey });
      if (gone?.audioKey) await deleteObject("masters", gone.audioKey);
      changed = gone ? [gone] : [];
      break;
    }
  }
  return changed.length > 0 ? { ok: true } : { ok: false, error: CHANGED };
}

/** This creator's slugs equal to `base` or starting with "base-". `base` is pattern-checked, so it has no LIKE wildcards. */
async function slugsLike(creatorId: string, base: string): Promise<Set<string>> {
  const rows = await db
    .select({ slug: tracks.slug })
    .from(tracks)
    .where(and(eq(tracks.creatorId, creatorId), sql`(${tracks.slug} = ${base} or ${tracks.slug} like ${`${base}-%`})`));
  return new Set(rows.map((r) => r.slug));
}

function isSlugClash(err: unknown): boolean {
  const pg = pgError(err);
  return pg?.code === PG_UNIQUE_VIOLATION && pg.constraint === SLUG_UNIQUE;
}
