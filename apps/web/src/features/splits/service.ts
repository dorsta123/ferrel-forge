// The lead artist's side of splits, independent of Next.js: callers pass an authenticated creator id.
// A split is never edited: saving writes a new version that everyone but the lead accepts again.
import { and, db, eq, inArray, splitShares, splitVersions, sql } from "@ferrel/db";
import { PG_UNIQUE_VIOLATION, pgError } from "@/lib/pg-error";
import { getOwnedTrack, isUuid } from "../tracks/track-access";
import { isCurrentVersion } from "./current-version";
import { newInviteCode } from "./invite-code";
import { validateSplit, type SplitErrors, type SplitRowInput } from "./rules";

/** A row as submitted; `shareId` links it to a share of the split in force, keeping who it belongs to. */
export type SplitRowSubmit = SplitRowInput & { shareId?: string };
export type SaveSplitResult = { ok: true } | { ok: false; errors: SplitErrors };

const NOT_FOUND = { ok: false, errors: { form: "Track not found." } } as const;
const CHANGED = { ok: false, errors: { form: "This split changed in the meantime. Reload the page and try again." } } as const;

/** Saves the split as a new version. The first row is the lead artist, accepted from the start. */
export async function saveSplit(creatorId: string, trackId: string, rows: SplitRowSubmit[]): Promise<SaveSplitResult> {
  const track = await getOwnedTrack(creatorId, trackId);
  if (!track) return NOT_FOUND;
  if (track.status === "archived") return { ok: false, errors: { form: "Archived releases can't be changed." } };
  const check = validateSplit(rows);
  if (!check.ok) return check;

  // People already on the split in force stay tied to their account (they accept again, from "My splits").
  const carriedIds = rows.slice(1).map((r) => r.shareId).filter((id): id is string => !!id);
  if (carriedIds.some((id) => !isUuid(id)) || new Set(carriedIds).size !== carriedIds.length) return CHANGED;
  const carried = carriedIds.length
    ? await db
        .select({ id: splitShares.id, userId: splitShares.userId })
        .from(splitShares)
        .innerJoin(splitVersions, eq(splitVersions.id, splitShares.splitVersionId))
        .where(and(inArray(splitShares.id, carriedIds), eq(splitVersions.trackId, track.id), eq(splitShares.isLead, false), isCurrentVersion))
    : [];
  if (carried.length !== carriedIds.length) return CHANGED;
  const accountOf = new Map(carried.map((c) => [c.id, c.userId]));

  try {
    await db.transaction(async (tx) => {
      const [{ next }] = await tx
        .select({ next: sql<number>`coalesce(max(${splitVersions.version}), 0) + 1` })
        .from(splitVersions)
        .where(eq(splitVersions.trackId, track.id));
      const [version] = await tx.insert(splitVersions).values({ trackId: track.id, version: next }).returning({ id: splitVersions.id });
      const now = new Date();
      await tx.insert(splitShares).values(
        check.value.map((share, i) =>
          i === 0
            ? { ...share, splitVersionId: version.id, position: i, isLead: true, userId: creatorId, status: "accepted" as const, respondedAt: now }
            : { ...share, splitVersionId: version.id, position: i, userId: (rows[i].shareId && accountOf.get(rows[i].shareId!)) || null },
        ),
      );
    });
  } catch (err) {
    // Another save took this version number first.
    if (pgError(err)?.code === PG_UNIQUE_VIOLATION) return CHANGED;
    throw err;
  }
  return { ok: true };
}

/**
 * A fresh invite link code for someone still to answer on the split in force. Making a new one
 * kills the previous link. The code is returned once; only its hash is stored.
 */
export async function createInviteLink(creatorId: string, trackId: string, shareId: string): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const track = await getOwnedTrack(creatorId, trackId);
  if (!track || !isUuid(shareId)) return { ok: false, error: "Not found." };
  const { code, hash } = newInviteCode();
  const updated = await db
    .update(splitShares)
    .set({ inviteHash: hash })
    .where(
      and(
        eq(splitShares.id, shareId),
        eq(splitShares.isLead, false),
        eq(splitShares.status, "pending"),
        sql`${splitShares.splitVersionId} in (select id from split_versions where track_id = ${track.id})`,
        isCurrentVersion,
      ),
    )
    .returning({ id: splitShares.id });
  if (updated.length === 0) return { ok: false, error: "This person has already answered, or the split changed. Reload the page." };
  return { ok: true, code };
}
