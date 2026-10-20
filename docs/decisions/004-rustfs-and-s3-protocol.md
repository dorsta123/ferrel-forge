# 004 — RustFS locally, via the S3 protocol
**Status:** Accepted · **Date:** 2026-10-17 (RustFS), 2026-10-20 (S3 client) · **Phases:** 1, 3

## Context
Audio files need object storage. MinIO, the usual local choice, stopped publishing free Docker images.

## Decision
Run **RustFS** (open source, S3-compatible) in Docker, and talk to it with the **S3 protocol** using the free `@aws-sdk/client-s3` library. No Amazon account or service is involved.

## Alternatives considered
MinIO (no free images); local disk (code would need rewriting for deployment); Cloudflare R2 directly (needs an account while developing).

## Consequences
- Moving to Cloudflare R2 (free tier, no download fees) or any S3 host is a `.env` change only.
- RustFS needs path-style URLs (`forcePathStyle: true`).
- Image pinned to `rustfs/rustfs:1.0.2`.
