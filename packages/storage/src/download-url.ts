import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { bucketId, type BucketName } from "./buckets";
import { getS3Client } from "./client";

export const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

/**
 * A signed GET URL for one private object, valid for 5 minutes. The browser saves it as
 * `filename` (an attachment), so it downloads instead of playing inline.
 */
export async function createDownloadUrl(input: { bucket: BucketName; key: string; filename: string }): Promise<string> {
  // Only safe characters in the header value: callers pass slugs, this is belt and braces.
  const filename = input.filename.replace(/[^A-Za-z0-9._-]/g, "_");
  const command = new GetObjectCommand({
    Bucket: bucketId(input.bucket),
    Key: input.key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
}
