// The daily storage clean-up (decision 033): delete files no track points to, once they're old
// enough that nothing can still be about to use them. Conservative by design: only files named
// in our own formats are ever considered, and each page is checked against the database.
import { db, inArray, tracks } from "@ferrel/db";
import { deleteObject, isPreviewKey, listObjects, parseMasterKey, type BucketName } from "@ferrel/storage";

export type CleanUpOptions = {
  /** How old an unreferenced file must be before it's deleted. */
  olderThanMs?: { masters: number; previews: number };
  /** Only look under these prefixes (tests use their own folders). */
  prefixes?: { masters?: string; previews?: string };
};

export const CLEAN_UP_AFTER_MS = {
  /** Abandoned uploads: a signed upload link lasts 5 minutes and is confirmed right after. */
  masters: 24 * 60 * 60_000,
  /** Orphaned previews are public, so they shouldn't linger; the worker attaches a new one in seconds. */
  previews: 60 * 60_000,
};

const BUCKETS = {
  masters: { recognised: (key: string) => parseMasterKey(key) !== null, column: tracks.audioKey },
  previews: { recognised: isPreviewKey, column: tracks.previewKey },
} as const;

/** Deletes unreferenced old files in both buckets; returns how many were removed from each. */
export async function cleanUpStorage({ olderThanMs = CLEAN_UP_AFTER_MS, prefixes = {} }: CleanUpOptions = {}): Promise<Record<BucketName, number>> {
  const removed = { masters: 0, previews: 0 };
  for (const bucket of ["masters", "previews"] as const) {
    const cutoff = Date.now() - olderThanMs[bucket];
    for await (const page of listObjects(bucket, { prefix: prefixes[bucket] })) {
      const candidates = page.filter((o) => o.lastModified.getTime() <= cutoff && BUCKETS[bucket].recognised(o.key)).map((o) => o.key);
      if (candidates.length === 0) continue;
      const used = await referenced(bucket, candidates);
      for (const key of candidates) {
        if (used.has(key)) continue;
        await deleteObject(bucket, key);
        removed[bucket]++;
        console.log(`[cleanup] deleted unreferenced ${bucket} file ${key}`);
      }
    }
  }
  return removed;
}

/** Which of these keys a track still points to. */
async function referenced(bucket: BucketName, keys: string[]): Promise<Set<string>> {
  const column = BUCKETS[bucket].column;
  const rows = await db.select({ key: column }).from(tracks).where(inArray(column, keys));
  return new Set(rows.map((r) => r.key).filter((k): k is string => k !== null));
}
