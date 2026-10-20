import {
  CreateBucketCommand,
  DeleteBucketPolicyCommand,
  GetBucketCorsCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { BUCKET_ACCESS, bucketId, type BucketName } from "./buckets";
import { getS3Client } from "./client";
import { getStorageConfig } from "./config";
import { publicReadPolicy, uploadCorsRules } from "./policies";

export type BucketReport = { bucket: string; created: boolean; access: string; cors: string };

async function exists(bucket: string): Promise<boolean> {
  try {
    await getS3Client().send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return false;
    throw err;
  }
}

/** Create both buckets and apply access + CORS. Safe to run any number of times. */
export async function setupBuckets(): Promise<BucketReport[]> {
  const s3 = getS3Client();
  const { corsOrigins } = getStorageConfig();
  const reports: BucketReport[] = [];

  for (const name of Object.keys(BUCKET_ACCESS) as BucketName[]) {
    const bucket = bucketId(name);
    const created = !(await exists(bucket));
    if (created) await s3.send(new CreateBucketCommand({ Bucket: bucket }));

    if (BUCKET_ACCESS[name] === "public-read") {
      await s3.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: publicReadPolicy(bucket) }));
    } else {
      // Remove any policy someone added by hand: masters must stay private.
      await s3.send(new DeleteBucketPolicyCommand({ Bucket: bucket })).catch(() => undefined);
    }

    // Only masters receives browser uploads (previews are written by the worker).
    let cors = "none";
    if (name === "masters") {
      await s3.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: uploadCorsRules(corsOrigins) } }));
      const applied = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
      cors = (applied.CORSRules ?? []).map((r) => `${r.AllowedMethods?.join("/")} from ${r.AllowedOrigins?.join(", ")}`).join("; ");
    }

    reports.push({ bucket, created, access: BUCKET_ACCESS[name], cors });
  }
  return reports;
}
