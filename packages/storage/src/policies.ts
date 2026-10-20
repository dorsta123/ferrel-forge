import type { CORSRule } from "@aws-sdk/client-s3";

/** Anonymous read of objects (never listing) — for the public previews bucket. */
export function publicReadPolicy(bucket: string): string {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadObjects",
        Effect: "Allow",
        Principal: "*",
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  });
}

/**
 * Lets our own site PUT files straight from the browser using signed upload
 * URLs. The signature is what authorizes an upload; CORS only decides which
 * websites' JavaScript may make the request and read the response.
 */
export function uploadCorsRules(origins: string[]): CORSRule[] {
  return [
    {
      AllowedOrigins: origins,
      AllowedMethods: ["PUT"],
      AllowedHeaders: ["content-type", "content-length"],
      ExposeHeaders: ["etag"],
      MaxAgeSeconds: 3000,
    },
  ];
}
