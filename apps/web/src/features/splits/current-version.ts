// "This share belongs to the split in force" as a SQL condition: answers and invite links only
// ever apply to a track's highest version, so old links die when the split changes.
import { splitShares, sql } from "@ferrel/db";

export const isCurrentVersion = sql<boolean>`${splitShares.splitVersionId} = (
  select v.id from split_versions v
  where v.track_id = (select v0.track_id from split_versions v0 where v0.id = ${splitShares.splitVersionId})
  order by v.version desc limit 1)`;
