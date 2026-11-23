// Reading a track's split in force. Callers check who may see it (the lead artist's editor).
import { asc, db, desc, eq, splitShares, splitVersions } from "@ferrel/db";
import type { ContributorRole, ShareStatus } from "@ferrel/db/constants";

export type CurrentShare = {
  id: string;
  name: string;
  role: ContributorRole;
  roleNote: string | null;
  basisPoints: number;
  isLead: boolean;
  status: ShareStatus;
  /** Whether someone's account is tied to it (never which account). */
  hasAccount: boolean;
};
export type CurrentSplit = { versionId: string; version: number; shares: CurrentShare[] };

/** The highest split version of a track, or null if it has none (100% the lead artist's). */
export async function currentSplit(trackId: string): Promise<CurrentSplit | null> {
  const [version] = await db
    .select({ id: splitVersions.id, version: splitVersions.version })
    .from(splitVersions)
    .where(eq(splitVersions.trackId, trackId))
    .orderBy(desc(splitVersions.version))
    .limit(1);
  if (!version) return null;
  const rows = await db.select().from(splitShares).where(eq(splitShares.splitVersionId, version.id)).orderBy(asc(splitShares.position));
  return {
    versionId: version.id,
    version: version.version,
    shares: rows.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      roleNote: s.roleNote,
      basisPoints: s.basisPoints,
      isLead: s.isLead,
      status: s.status,
      hasAccount: s.userId !== null,
    })),
  };
}
