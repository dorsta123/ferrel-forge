// "Active license": started and not yet ended, by the database clock. One definition for the
// download route, "My licenses", extensions and the rules protecting licensed tracks.
import { and, db, eq, licenses, sql, tracks } from "@ferrel/db";

export const isActive = sql<boolean>`(${licenses.startsAt} <= now() and ${licenses.endsAt} > now())`;

/** True when the track (in a query selecting from `tracks`) has an active license. */
export const trackHasActiveLicense = sql<boolean>`exists (select 1 from ${licenses} where ${licenses.trackId} = ${tracks.id} and ${isActive})`;

type Reader = Pick<typeof db, "select">;

/** How many active licenses a track has (pass a transaction to read inside it). */
export async function activeLicenseCount(trackId: string, reader: Reader = db): Promise<number> {
  const [row] = await reader
    .select({ n: sql<number>`count(*)::int` })
    .from(licenses)
    .where(and(eq(licenses.trackId, trackId), isActive));
  return row?.n ?? 0;
}
