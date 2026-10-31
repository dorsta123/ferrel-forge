# 029 — The editor checks the audio status every few seconds; a failed file blocks publishing
**Status:** Accepted · **Date:** 2026-10-31 · **Phase:** 4 (slice 8)

## Context
After an upload the worker measures the song and makes its preview (decisions 027, 028). The artist should see that happen without reloading, and see why a file failed. A failed file could still be published, giving advertisers a release with no length and no player.

## Decision
- **Polling, not a live connection:** while something is still in progress (processing, or a preview being made), the editor asks an owner-only Server Action every 3 seconds. It stops as soon as everything is settled, and after 10 minutes so a forgotten tab stops asking. A new upload remounts the panel and starts afresh.
- **The status never includes storage keys:** only the state, the artist-facing reason, the length and whether a preview exists.
- **"Try again"** only works after a failure:
  - a failed file goes back to "processing";
  - a preview that was given up on is cleared.

  Each is a guarded update, so a double click sends one ticket. Anything else answers "Nothing to retry."
- **Publishing is blocked while the audio is Failed** (user, 2026-10-31). The rule is in `checkAction` and repeated in the publish query (decision 014). Publishing during Processing still works, as decided in 022.
- When the polled status changes, the page refreshes around the panel, so the publish button always matches.

## Alternatives considered
- **Server-sent events or WebSockets:** instant updates, but a long-lived connection per open editor, and more moving parts (the worker would have to publish events). Processing takes seconds, so a 3-second poll is indistinguishable for the artist.
- **Allow publishing a failed file:** the public page would show no length or player, so advertisers would find a release that doesn't work.

## Consequences
- An open editor makes at most one small request every 3 seconds, and only while something is in progress.
- A release published *before* its audio failed stays published (unpublishing is the artist's choice); the block applies to publishing.
