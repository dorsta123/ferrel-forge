// The split a new license locks (decision 019), inside the license's own transaction.
import { creatorProfiles, db, desc, eq, splitShares, splitVersions, sql } from "@ferrel/db";
import { allAccepted } from "./current-version";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The id of the split version in force if everyone has accepted it, or null. A track without a
 * split gets version 1 here: 100% the lead artist's, accepted (as the migration did for old licenses).
 */
export async function lockSplitForLicense(tx: Tx, trackId: string, creatorId: string): Promise<string | null> {
  const [current] = await tx
    .select({
      id: splitVersions.id,
      ready: allAccepted(sql`${splitVersions.id}`),
    })
    .from(splitVersions)
    .where(eq(splitVersions.trackId, trackId))
    .orderBy(desc(splitVersions.version))
    .limit(1);
  if (current) return current.ready ? current.id : null;

  // A parallel license may create version 1 at the same moment: take whichever got there first.
  const [created] = await tx.insert(splitVersions).values({ trackId, version: 1 }).onConflictDoNothing().returning({ id: splitVersions.id });
  if (!created) return lockSplitForLicense(tx, trackId, creatorId);
  const [creator] = await tx.select({ name: creatorProfiles.artistName }).from(creatorProfiles).where(eq(creatorProfiles.userId, creatorId));
  await tx.insert(splitShares).values({
    splitVersionId: created.id,
    position: 0,
    name: creator.name.trim().slice(0, 60).trim(),
    role: "other",
    roleNote: "Lead artist",
    basisPoints: 10_000,
    isLead: true,
    userId: creatorId,
    status: "accepted",
    respondedAt: new Date(),
  });
  return created.id;
}
