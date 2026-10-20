// Storage settings from the root .env. Read lazily so importing the package
// (e.g. during `next build`) doesn't require the variables to be set.

export type StorageConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  buckets: { masters: string; previews: string };
  /** Browser origins allowed to upload directly (CORS). */
  corsOrigins: string[];
};

let cached: StorageConfig | undefined;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (see .env.example)`);
  return value;
}

export function getStorageConfig(): StorageConfig {
  cached ??= {
    endpoint: required("S3_ENDPOINT"),
    region: process.env.S3_REGION || "us-east-1", // RustFS ignores it; the SDK requires one
    accessKeyId: required("S3_ACCESS_KEY"),
    secretAccessKey: required("S3_SECRET_KEY"),
    buckets: {
      masters: required("S3_BUCKET_MASTERS"),
      previews: required("S3_BUCKET_PREVIEWS"),
    },
    corsOrigins: required("S3_CORS_ORIGINS")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
  return cached;
}
