// "Has everyone accepted the split in force?" as a SQL condition, for licensing and public pages.
import { sql } from "@ferrel/db";

// Written out with its table: inside the subquery a bare "id" would be ambiguous.
const trackId = sql.raw(`"tracks"."id"`);

/**
 * True when the track's highest split version has no share that isn't accepted. A track with
 * no split at all is 100% the lead artist's, so it's ready too (decision 019). For queries
 * that select from `tracks`.
 */
export const splitReady = () => sql<boolean>`not exists (
  select 1 from split_shares s join split_versions v on v.id = s.split_version_id
  where v.track_id = ${trackId} and s.status <> 'accepted'
    and v.version = (select max(v2.version) from split_versions v2 where v2.track_id = ${trackId}))`;
