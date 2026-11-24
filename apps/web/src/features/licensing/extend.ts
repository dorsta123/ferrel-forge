// Extending a license (phase 5 part 4), independent of Next.js: callers pass an authenticated user id.
// An extension continues the same license: same locked rate, same locked split, later end date.
import { and, db, eq, licenseExtensions, licenses, sql, tracks } from "@ferrel/db";
import { LICENSE_TERM_DAYS, LICENSING_LIMITS } from "@ferrel/db/constants";
import { hasUsableCard } from "../payments/service";
import { isUuid } from "../tracks/track-access";
import { isActive } from "./active";

export type ExtendResult = { ok: true; endsAt: Date } | { ok: false; error: string };

const NOT_FOUND = { ok: false, error: "License not found." } as const;
const DAY_MS = 24 * 60 * 60_000;

/** "30" | "90" | "365" → days; anything else → null. */
const parseDays = (input: string) => LICENSE_TERM_DAYS.find((d) => String(d) === input) ?? null;

export async function extendLicense(userId: string, licenseId: string, daysInput: string): Promise<ExtendResult> {
  if (!isUuid(licenseId)) return NOT_FOUND;
  const days = parseDays(String(daysInput));
  if (!days) return { ok: false, error: "Choose 30, 90 or 365 days." };
  // The extension is billed like the license: monthly, to the saved card.
  if (!(await hasUsableCard(userId))) return { ok: false, error: "Add a payment card before extending." };

  return db.transaction(async (tx): Promise<ExtendResult> => {
    // Lock the license, so two extensions at once each add their days exactly once.
    const [license] = await tx
      .select({ id: licenses.id, trackId: licenses.trackId, termDays: licenses.termDays, extendedDays: licenses.extendedDays, endsAt: licenses.endsAt, active: isActive })
      .from(licenses)
      .where(and(eq(licenses.id, licenseId), eq(licenses.licenseeId, userId)))
      .for("update");
    if (!license) return NOT_FOUND;
    if (!license.active) return { ok: false, error: "This license has ended. License the track again to keep using it." };

    // The track must still be for sale (archiving stops new licenses and extensions). Shared lock:
    // it can't be archived or unpublished until this extension is in.
    const [live] = await tx.select({ id: tracks.id }).from(tracks).where(and(eq(tracks.id, license.trackId), eq(tracks.status, "published"))).for("share");
    if (!live) return { ok: false, error: "This track is no longer for sale, so its licenses can't be extended." };

    if (license.termDays + license.extendedDays + days > LICENSING_LIMITS.maxTotalDays) return { ok: false, error: "A license can run for at most 5 years in total." };

    const endsAt = new Date(license.endsAt.getTime() + days * DAY_MS);
    await tx
      .update(licenses)
      .set({ extendedDays: sql`${licenses.extendedDays} + ${days}`, endsAt })
      .where(eq(licenses.id, license.id));
    await tx.insert(licenseExtensions).values({ licenseId: license.id, days, previousEndsAt: license.endsAt, endsAt });
    return { ok: true, endsAt };
  });
}
