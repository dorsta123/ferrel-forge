import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { bucketId, type BucketName } from "./buckets";
import { getS3Client } from "./client";

export type StoredObject = { key: string; lastModified: Date };

/** Every object in a bucket (optionally under a prefix), a page of up to 1,000 at a time. Server/worker only. */
export async function* listObjects(bucket: BucketName, { prefix }: { prefix?: string } = {}): AsyncGenerator<StoredObject[]> {
  let token: string | undefined;
  do {
    const page = await getS3Client().send(
      new ListObjectsV2Command({ Bucket: bucketId(bucket), Prefix: prefix, ContinuationToken: token }),
    );
    const objects = (page.Contents ?? []).flatMap((o) => (o.Key && o.LastModified ? [{ key: o.Key, lastModified: o.LastModified }] : []));
    if (objects.length > 0) yield objects;
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
}
