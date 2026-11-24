// "The split in force": a track's highest split version. Defined once here and used by licensing,
// public pages, answers and invite links, so they can never disagree (review, part 3).
import { splitShares, sql, type SQL } from "@ferrel/db";

/** The id of the split version in force for a track id expression (null if it has none). */
export const currentVersionOf = (trackId: SQL) =>
  sql`(select v.id from split_versions v where v.track_id = ${trackId} order by v.version desc limit 1)`;

/** True if a version has nobody left to answer (or decline): everyone has accepted it. */
export const allAccepted = (versionId: SQL) =>
  sql<boolean>`not exists (select 1 from split_shares s where s.split_version_id = ${versionId} and s.status <> 'accepted')`;

/** This share row belongs to the split in force: answers and invite links only ever apply there. */
export const isCurrentVersion = sql<boolean>`${splitShares.splitVersionId} = ${currentVersionOf(
  sql`(select v0.track_id from split_versions v0 where v0.id = ${splitShares.splitVersionId})`,
)}`;
