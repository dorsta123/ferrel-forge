// The licensed master: only the licensee, only while the license is active (phase 5 part 2).
import { and, db, eq, licenses, sql, tracks } from "@ferrel/db";
import { createDownloadUrl } from "@ferrel/storage";
import { isUuid } from "../tracks/track-access";
import { isActive } from "./active";

export type MasterDownload = { ok: true; url: string } | { ok: false; error: string };

const NONE = { ok: false, error: "This download isn't available." } as const;

/** A 5-minute private link to the master, or nothing. The storage key never leaves the server. */
export async function masterDownload(userId: string, licenseId: string): Promise<MasterDownload> {
  if (!isUuid(licenseId)) return NONE;
  const [row] = await db
    .select({ key: tracks.audioKey, format: tracks.audioFormat, slug: tracks.slug })
    .from(licenses)
    .innerJoin(tracks, eq(tracks.id, licenses.trackId))
    .where(
      and(
        eq(licenses.id, licenseId),
        eq(licenses.licenseeId, userId),
        isActive,
        sql`${tracks.audioStatus} <> 'failed'`,
      ),
    )
    .limit(1);
  if (!row?.key || !row.format) return NONE;
  return { ok: true, url: await createDownloadUrl({ bucket: "masters", key: row.key, filename: `${row.slug}.${row.format}` }) };
}
