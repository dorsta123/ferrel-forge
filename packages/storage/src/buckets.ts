import { getStorageConfig } from "./config";

export type BucketName = "masters" | "previews";

/**
 * masters  — full-quality uploads. PRIVATE: no public policy, read only via
 *            short-lived signed URLs (licensed downloads, phase 5).
 * previews — watermarked previews (phase 4). PUBLIC read, so players can stream.
 */
export const BUCKET_ACCESS: Record<BucketName, "private" | "public-read"> = {
  masters: "private",
  previews: "public-read",
};

export function bucketId(name: BucketName): string {
  return getStorageConfig().buckets[name];
}
