# 029 — The editor checks the audio status every few seconds; a failed file blocks publishing
**Status:** Accepted · **Date:** 2026-10-31 · **Phase:** 4 (slice 8)

## Context
After an upload the worker measures the song and makes its preview (decisions 027, 028). The artist should see that happen without reloading, and see why a file failed. A failed file could still be published, giving advertisers a release with no length and no player.

## Decision
- **Polling, not a live connection:** while something is still in progress (processing, or a preview being made), the editor asks an owner-only Server Action every 3 seconds, one check at a time (Server Actions run one after another, so stacked checks would delay the artist's own saves). Errors are ignored until the next check; a "not found" answer stops it. After 10 minutes it says "Still working on it. Reload the page to check again." It stops as soon as everything is settled, and after 10 minutes so a forgotten tab stops asking. A new upload remounts the panel and starts afresh.
- **The status never includes storage keys:** only the state, the artist-facing reason, the length and whether a preview exists.
- **"Try again"** is offered only when a retry can help (from review):
  - a file that took too long goes back to "processing";
  - a preview that was given up on is cleared.

  Broken, silent, over-long or missing files need a different file, so their message says so and there is no button (the server refuses too). Each retry is a guarded update, so a double click sends one ticket. The failure messages live in `@ferrel/db/constants` (`AUDIO_FAILURE`, `RETRYABLE_AUDIO_FAILURES`), shared by the worker and the editor.
- **Publishing is blocked while the audio is Failed** (user, 2026-10-31). The rule is in `checkAction` and repeated in the publish query (decision 014). Publishing during Processing still works, as decided in 022.
- When the polled status changes, the page refreshes around the panel, so the publish button always matches.

## Alternatives considered
- **Server-sent events or WebSockets:** instant updates, but a long-lived connection per open editor, and more moving parts (the worker would have to publish events). Processing takes seconds, so a 3-second poll is indistinguishable for the artist.
- **Allow publishing a failed file:** the public page would show no length or player, so advertisers would find a release that doesn't work.

## Consequences
- An open editor makes at most one small request every 3 seconds, and only while something is in progress.
- **A release whose audio fails after publishing is hidden from public pages until fixed** (user, 2026-11-01, option A): Explore, the homepage, creator pages and its own page all skip `audio_status = 'failed'` (`features/catalog/queries.ts`). It stays published; the editor says "Hidden from public pages until fixed. Unpublish to upload a new file." Rejected: leaving it public (B), or unpublishing it automatically (C), which would surprise the artist.
- A creator could still script retries of a slow file. Per-creator rate limits come with the pre-deployment rate limiting (security.md finding 4).
