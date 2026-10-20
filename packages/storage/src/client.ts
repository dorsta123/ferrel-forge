import { S3Client } from "@aws-sdk/client-s3";
import { getStorageConfig } from "./config";

// One client per process, reused across Next.js dev hot reloads.
const globalForS3 = globalThis as unknown as { s3Client?: S3Client };

export function getS3Client(): S3Client {
  if (!globalForS3.s3Client) {
    const { endpoint, region, accessKeyId, secretAccessKey } = getStorageConfig();
    globalForS3.s3Client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      // RustFS (like MinIO) serves buckets as http://host/bucket, not bucket.host.
      forcePathStyle: true,
    });
  }
  return globalForS3.s3Client;
}
