// When a license counts. One place for the download route, "My licenses", extensions and the
// rules protecting licensed tracks, all by the database clock.
import { and, db, eq, licenses, sql } from "@ferrel/db";

/** Started and not yet ended: the licensee can download and extend. */
export const isActive = sql<boolean>`(${licenses.startsAt} <= now() and ${licenses.endsAt} > now())`;

/**
 * Not yet ended, whether or not it has started. This is what protects a track: a license created a
 * moment ago may start a fraction later than the database's "now" (clocks, transactions), and must
 * still block unpublishing and audio swaps (review, part 4).
 */
const notEnded = sql<boolean>`${licenses.endsAt} > now()`;

type Reader = Pick<typeof db, "select">;

/** How many licenses of a track haven't ended (pass a transaction to read inside it). */
export async function activeLicenseCount(trackId: string, reader: Reader = db): Promise<number> {
  const [row] = await reader
    .select({ n: sql<number>`count(*)::int` })
    .from(licenses)
    .where(and(eq(licenses.trackId, trackId), notEnded));
  return row?.n ?? 0;
}
