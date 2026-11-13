// Licensing, independent of Next.js: callers pass an already-authenticated user id.
// The server decides everything that matters: which tracks can be licensed, and the rate.
import { and, billingProfiles, creatorProfiles, db, eq, licenses, sql, tracks } from "@ferrel/db";
import { formatRate } from "@/lib/rate";
import { LICENSE_TERMS_VERSION } from "@ferrel/db/constants";
import { quoteRate } from "@ferrel/pricing";
import { isUuid } from "../tracks/track-access";
import { validateLicenseRequest, type LicenseErrors, type LicenseFormValues } from "./rules";

const UNAVAILABLE = { ok: false, error: "This track isn't available to license." } as const;
const OWN_TRACK = { ok: false, error: "You can't license your own track." } as const;
const DAY_MS = 24 * 60 * 60_000;

/** A published track with usable audio (processing is fine: publishing never waits for it). */
async function licensableTrack(trackId: string) {
  if (!isUuid(trackId)) return null;
  const [track] = await db
    .select({ id: tracks.id, creatorId: tracks.creatorId, baseRateMicros: tracks.baseRateMicros })
    .from(tracks)
    .where(and(eq(tracks.id, trackId), eq(tracks.status, "published"), sql`${tracks.audioStatus} <> 'failed'`))
    .limit(1);
  return track ?? null;
}

async function hasBilling(userId: string): Promise<boolean> {
  const [row] = await db.select({ id: billingProfiles.userId }).from(billingProfiles).where(eq(billingProfiles.userId, userId)).limit(1);
  return row !== undefined;
}

export type LicenseOffer = { ok: true; rateMicros: number; needsBilling: boolean } | { ok: false; error: string };

/** What the license page shows: the rate the license would lock, and whether to ask for billing details. */
export async function licenseOffer(userId: string, trackId: string): Promise<LicenseOffer> {
  const track = await licensableTrack(trackId);
  if (!track) return UNAVAILABLE;
  if (track.creatorId === userId) return OWN_TRACK;
  return { ok: true, rateMicros: quoteRate({ baseRateMicros: track.baseRateMicros }).rateMicros, needsBilling: !(await hasBilling(userId)) };
}

export type CreateLicenseResult =
  | { ok: true; licenseId: string }
  | { ok: false; error: string }
  | { ok: false; errors: LicenseErrors }
  /** The rate changed since the page showed it: the new one, to show before trying again. */
  | { ok: false; error: string; rateMicros: number };

export async function createLicense(userId: string, trackId: string, input: LicenseFormValues): Promise<CreateLicenseResult> {
  const track = await licensableTrack(trackId);
  if (!track) return UNAVAILABLE;
  if (track.creatorId === userId) return OWN_TRACK;

  const check = validateLicenseRequest(input, { needsBilling: !(await hasBilling(userId)) });
  if (!check.ok) return check;
  const { platforms, cities, termDays, billing } = check.value;

  // The rate comes from the database, never from the request, and is locked on the license.
  const inputs = { baseRateMicros: track.baseRateMicros };
  const quote = quoteRate(inputs);
  // ...but only if it's the rate the advertiser saw: never lock them into one they didn't agree to.
  if (quote.rateMicros !== input.shownRateMicros) {
    return { ok: false, error: `The rate changed to ${formatRate(quote.rateMicros)}. Review it and confirm again.`, rateMicros: quote.rateMicros };
  }
  const startsAt = new Date();

  const licenseId = await db.transaction(async (tx) => {
    if (billing) await tx.insert(billingProfiles).values({ userId, ...billing }).onConflictDoNothing();
    const [row] = await tx
      .insert(licenses)
      .values({
        trackId: track.id,
        licenseeId: userId,
        platforms,
        cities,
        termDays,
        startsAt,
        endsAt: new Date(startsAt.getTime() + termDays * DAY_MS),
        rateMicros: quote.rateMicros,
        quote: { inputs, ...quote },
        termsVersion: LICENSE_TERMS_VERSION,
      })
      .returning({ id: licenses.id });
    return row.id;
  });
  return { ok: true, licenseId };
}

/** The signed-in account's licenses, newest first (display fields only). */
export async function myLicenses(userId: string) {
  return db
    .select({
      id: licenses.id,
      trackTitle: tracks.title,
      trackSlug: tracks.slug,
      artistName: creatorProfiles.artistName,
      creatorSlug: creatorProfiles.slug,
      platforms: licenses.platforms,
      cities: licenses.cities,
      termDays: licenses.termDays,
      startsAt: licenses.startsAt,
      endsAt: licenses.endsAt,
      rateMicros: licenses.rateMicros,
    })
    .from(licenses)
    .innerJoin(tracks, eq(tracks.id, licenses.trackId))
    .innerJoin(creatorProfiles, eq(creatorProfiles.userId, tracks.creatorId))
    .where(eq(licenses.licenseeId, userId))
    .orderBy(sql`${licenses.startsAt} desc`, sql`${licenses.id}`);
}

export type MyLicense = Awaited<ReturnType<typeof myLicenses>>[number];

/** How many licenses of a creator's tracks are active now, in total and per track. */
export async function creatorLicenseCounts(creatorId: string): Promise<{ active: number; byTrack: Record<string, number> }> {
  const rows = await db
    .select({ trackId: licenses.trackId, n: sql<number>`count(*)::int` })
    .from(licenses)
    .innerJoin(tracks, eq(tracks.id, licenses.trackId))
    .where(and(eq(tracks.creatorId, creatorId), sql`${licenses.endsAt} > now()`))
    .groupBy(licenses.trackId);
  const byTrack = Object.fromEntries(rows.map((r) => [r.trackId, r.n]));
  return { active: rows.reduce((sum, r) => sum + r.n, 0), byTrack };
}
