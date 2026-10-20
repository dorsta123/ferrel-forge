import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { bucketId, type BucketName } from "./buckets";
import { getS3Client } from "./client";

const statusOf = (err: unknown) => (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;

/** Size and type as storage recorded them, or null if the object doesn't exist. */
export async function getObjectInfo(
  bucket: BucketName,
  key: string,
): Promise<{ size: number; contentType: string | undefined } | null> {
  try {
    const head = await getS3Client().send(new HeadObjectCommand({ Bucket: bucketId(bucket), Key: key }));
    return { size: head.ContentLength ?? 0, contentType: head.ContentType };
  } catch (err) {
    if (statusOf(err) === 404) return null;
    throw err;
  }
}

/** The first `length` bytes of an object (a ranged read — never downloads the whole file). */
export async function readObjectStart(bucket: BucketName, key: string, length: number): Promise<Uint8Array> {
  const res = await getS3Client().send(
    new GetObjectCommand({ Bucket: bucketId(bucket), Key: key, Range: `bytes=0-${length - 1}` }),
  );
  return res.Body ? new Uint8Array(await res.Body.transformToByteArray()) : new Uint8Array();
}

/** Delete an object. Deleting something that's already gone is not an error. */
export async function deleteObject(bucket: BucketName, key: string): Promise<void> {
  await getS3Client().send(new DeleteObjectCommand({ Bucket: bucketId(bucket), Key: key }));
}
