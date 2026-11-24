// Licensing, independent of Next.js: callers pass an already-authenticated user id.
// The server decides everything that matters: which tracks can be licensed, and the rate.
import { and, billingProfiles, creatorProfiles, db, eq, licenses, sql, tracks } from "@ferrel/db";
import { formatRate } from "@/lib/rate";
import { LICENSE_TERMS_VERSION } from "@ferrel/db/constants";
import { quoteRate } from "@ferrel/pricing";
import { hasUsableCard } from "../payments/service";
import { lockSplitForLicense } from "../splits/lock";
import { splitReady } from "../splits/readiness";
import { isUuid } from "../tracks/track-access";
import { isActive } from "./active";
import { validateLicenseRequest, type LicenseErrors, type LicenseFormValues } from "./rules";

const UNAVAILABLE = { ok: false, error: "This track isn't available to license." } as const;
const OWN_TRACK = { ok: false, error: "You can't license your own track." } as const;
const NO_CARD = { ok: false, error: "Add a payment card before licensing." } as const;
const SPLIT_PENDING = { ok: false, error: "This track isn't available to license yet: its contributors are still confirming their shares." } as const;
const DAY_MS = 24 * 60 * 60_000;

/**
 * A published track with usable audio (processing is fine: publishing never waits for it), and
 * whether everyone has accepted its split (decision 019).
 */
async function licensableTrack(trackId: string) {
  if (!isUuid(trackId)) return null;
  const [track] = await db
    .select({ id: tracks.id, creatorId: tracks.creatorId, baseRateMicros: tracks.baseRateMicros, splitReady: splitReady() })
    .from(tracks)
    .where(and(eq(tracks.id, trackId), eq(tracks.status, "published"), sql`${tracks.audioStatus} <> 'failed'`))
    .limit(1);
  return track ?? null;
}

async function hasBilling(userId: string): Promise<boolean> {
  const [row] = await db.select({ id: billingProfiles.userId }).from(billingProfiles).where(eq(billingProfiles.userId, userId)).limit(1);
  return row !== undefined;
}

export type LicenseOffer = { ok: true; rateMicros: number; needsBilling: boolean; needsCard: boolean } | { ok: false; error: string };

/** What the license page shows: the rate the license would lock, and whether billing details or a card are still needed. */
export async function licenseOffer(userId: string, trackId: string): Promise<LicenseOffer> {
  const track = await licensableTrack(trackId);
  if (!track) return UNAVAILABLE;
  if (track.creatorId === userId) return OWN_TRACK;
  if (!track.splitReady) return SPLIT_PENDING;
  const [needsBilling, needsCard] = await Promise.all([hasBilling(userId).then((b) => !b), hasUsableCard(userId).then((c) => !c)]);
  return { ok: true, rateMicros: quoteRate({ baseRateMicros: track.baseRateMicros }).rateMicros, needsBilling, needsCard };
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
  if (!track.splitReady) return SPLIT_PENDING;
  const [billed, carded] = await Promise.all([hasBilling(userId), hasUsableCard(userId)]);
  const check = validateLicenseRequest(input, { needsBilling: !billed });
  if (!check.ok) return check;
  // Licenses are billed monthly to the saved card (phase 7), so one must exist first.
  if (!carded) return NO_CARD;
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
    // Hold the track as it is (shared lock): an unpublish waits for this license, then sees it.
    const [live] = await tx
      .select({ id: tracks.id })
      .from(tracks)
      .where(and(eq(tracks.id, track.id), eq(tracks.status, "published"), sql`${tracks.audioStatus} <> 'failed'`))
      .for("share");
    if (!live) return "unavailable" as const;
    // The split in force, locked for the license's life; null if it changed and isn't accepted yet.
    const splitVersionId = await lockSplitForLicense(tx, track.id, track.creatorId);
    if (!splitVersionId) return null;
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
        splitVersionId,
      })
      .returning({ id: licenses.id });
    return row.id;
  });
  if (licenseId === "unavailable") return UNAVAILABLE;
  return licenseId ? { ok: true, licenseId } : SPLIT_PENDING;
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
      audioStatus: tracks.audioStatus,
      trackStatus: tracks.status,
      extendedDays: licenses.extendedDays,
      // The database clock, as the download route uses: page and route never disagree.
      active: isActive,
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
