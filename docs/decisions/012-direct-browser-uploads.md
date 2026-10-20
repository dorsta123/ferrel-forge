# 012 — Browser uploads straight to storage via signed URLs
**Status:** Accepted · **Date:** 2026-10-20 · **Phase:** 3

## Context
Masters can be up to 150 MB. Passing them through the web server wastes memory and time.

## Decision
The server issues a **signed, single-use upload URL** (5 minutes, exact size and content type, key inside the creator's own folder). The browser uploads directly to the private `masters` bucket; afterwards the server verifies the stored object (size + file-signature bytes) before recording it.

## Alternatives considered
Upload through a Next.js route handler (kept as the fallback if CORS hadn't worked); a public bucket (unsafe).

## Consequences
- The bucket needs CORS allowing `PUT` from our own origin only (`S3_CORS_ORIGINS`).
- `getSignedUrl` must use `signableHeaders: content-type, content-length`, otherwise storage accepts any content type (verified by test).
- Uploads that are never confirmed leave orphan files, so a cleanup job comes in phase 4.
