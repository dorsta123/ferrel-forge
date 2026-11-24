// "Has everyone accepted the split in force?" as a SQL condition, for licensing and public pages.
import { sql } from "@ferrel/db";
import { allAccepted, currentVersionOf } from "./current-version";

/**
 * True when nobody on the track's split in force is still to accept. A track with no split at
 * all is 100% the lead artist's, so it's ready too (decision 019). For queries that select from
 * `tracks` (written out with its table: inside the subquery a bare "id" would be ambiguous).
 */
export const splitReady = () => allAccepted(currentVersionOf(sql.raw(`"tracks"."id"`)));
