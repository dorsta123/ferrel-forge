import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { bucketId, type BucketName } from "./buckets";
import { getS3Client } from "./client";

/** Upload a local file (server/worker only), streamed, with a time limit. */
export async function uploadFile(bucket: BucketName, key: string, path: string, contentType: string, { timeoutMs = 2 * 60_000 } = {}): Promise<void> {
  const { size } = await stat(path);
  await getS3Client().send(
    new PutObjectCommand({ Bucket: bucketId(bucket), Key: key, Body: createReadStream(path), ContentLength: size, ContentType: contentType }),
    { abortSignal: AbortSignal.timeout(timeoutMs) },
  );
}
