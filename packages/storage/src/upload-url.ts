import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { bucketId, type BucketName } from "./buckets";
import { getS3Client } from "./client";

export const UPLOAD_URL_TTL_SECONDS = 5 * 60;

/**
 * A signed PUT URL for exactly one object. Storage rejects the upload unless
 * the path, byte length and content type all match what was signed, and the
 * link expires after `expiresIn` seconds.
 */
export async function createUploadUrl(input: {
  bucket: BucketName;
  key: string;
  contentType: string;
  contentLength: number;
  expiresIn?: number;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketId(input.bucket),
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
  });
  return getSignedUrl(getS3Client(), command, {
    expiresIn: input.expiresIn ?? UPLOAD_URL_TTL_SECONDS,
    // Without this only host + content-length are signed and storage would
    // accept any content type (verified in phase 3 step 2).
    signableHeaders: new Set(["content-type", "content-length"]),
  });
}
