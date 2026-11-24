// The lead artist's side of splits, independent of Next.js: callers pass an authenticated creator id.
// A split is never edited: saving writes a new version that everyone but the lead accepts again.
import { and, asc, db, desc, eq, splitShares, splitVersions, sql, tracks } from "@ferrel/db";
import { PG_UNIQUE_VIOLATION, pgError } from "@/lib/pg-error";
import { getOwnedTrack, isUuid } from "../tracks/track-access";
import { isCurrentVersion } from "./current-version";
import { newInviteCode } from "./invite-code";
import { validateSplit, type SplitErrors, type SplitRow, type SplitRowInput } from "./rules";

/** A row as submitted; `shareId` links it to a share of the split in force, keeping who it belongs to. */
export type SplitRowSubmit = SplitRowInput & { shareId?: string };
export type SaveSplitResult = { ok: true } | { ok: false; errors: SplitErrors };

const NOT_FOUND = { ok: false, errors: { form: "Track not found." } } as const;
const CHANGED = { ok: false, errors: { form: "This split changed in the meantime. Reload the page and try again." } } as const;

type StoredShare = typeof splitShares.$inferSelect;

/** The same people, in the same order, with the same roles and shares: saving would change nothing. */
function unchanged(current: StoredShare[], next: SplitRow[], rows: SplitRowSubmit[]): boolean {
  return (
    current.length === next.length &&
    current.every(
      (s, i) =>
        s.isLead === (i === 0) &&
        (i === 0 || rows[i].shareId === s.id) &&
        s.name === next[i].name &&
        s.role === next[i].role &&
        s.roleNote === next[i].roleNote &&
        s.basisPoints === next[i].basisPoints,
    )
  );
}

/**
 * Saves the split as a new version, based on `baseVersion` (the version the form showed; 0 = none).
 * The first row is the lead artist, accepted from the start. Rules (decision 019, review):
 * - a form based on an older version is refused, never silently overwriting a newer split;
 * - anyone who accepted the split in force stays on it (their share can change, then they accept
 *   again): the lead can't cut someone out without their consent. Pending or declined people can go;
 * - an unchanged split makes no new version, so nobody is asked again for nothing.
 */
export async function saveSplit(creatorId: string, trackId: string, rows: SplitRowSubmit[], baseVersion: number): Promise<SaveSplitResult> {
  const track = await getOwnedTrack(creatorId, trackId);
  if (!track) return NOT_FOUND;
  if (track.status === "archived") return { ok: false, errors: { form: "Archived releases can't be changed." } };
  const check = validateSplit(rows);
  if (!check.ok) return check;

  const carriedIds = rows.slice(1).map((r) => r.shareId).filter((id): id is string => !!id);
  if (carriedIds.some((id) => !isUuid(id)) || new Set(carriedIds).size !== carriedIds.length) return CHANGED;

  try {
    return await db.transaction(async (tx): Promise<SaveSplitResult> => {
      // One save at a time per track, so the version checks below can't race.
      await tx.select({ id: tracks.id }).from(tracks).where(eq(tracks.id, track.id)).for("update");
      const [current] = await tx
        .select({ id: splitVersions.id, version: splitVersions.version })
        .from(splitVersions)
        .where(eq(splitVersions.trackId, track.id))
        .orderBy(desc(splitVersions.version))
        .limit(1);
      if ((current?.version ?? 0) !== baseVersion) return CHANGED;
      const shares = current ? await tx.select().from(splitShares).where(eq(splitShares.splitVersionId, current.id)).orderBy(asc(splitShares.position)) : [];

      // Carried rows must be non-lead shares of the split in force.
      const carriable = new Map(shares.filter((s) => !s.isLead).map((s) => [s.id, s]));
      if (carriedIds.some((id) => !carriable.has(id))) return CHANGED;
      const dropped = shares.filter((s) => !s.isLead && s.status === "accepted" && !carriedIds.includes(s.id));
      if (dropped.length) {
        const names = dropped.map((s) => s.name).join(", ");
        return { ok: false, errors: { form: `${names} accepted their share, so they stay on the split. You can change their share; they'll be asked to accept again.` } };
      }
      if (unchanged(shares, check.value, rows)) return { ok: true };

      const [version] = await tx
        .insert(splitVersions)
        .values({ trackId: track.id, version: baseVersion + 1 })
        .returning({ id: splitVersions.id });
      const now = new Date();
      await tx.insert(splitShares).values(
        check.value.map((share, i) =>
          i === 0
            ? { ...share, splitVersionId: version.id, position: i, isLead: true, userId: creatorId, status: "accepted" as const, respondedAt: now }
            : // People already on the split stay tied to their account (they answer again from "My splits").
              { ...share, splitVersionId: version.id, position: i, userId: carriable.get(rows[i].shareId ?? "")?.userId ?? null },
        ),
      );
      return { ok: true };
    });
  } catch (err) {
    // Belt and braces: another save took this version number first.
    if (pgError(err)?.code === PG_UNIQUE_VIOLATION) return CHANGED;
    throw err;
  }
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
