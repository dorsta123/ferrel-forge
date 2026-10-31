# 026 — Uploads reach the worker through one ticket per file, with a sweep as the safety net
**Status:** Accepted · **Date:** 2026-10-31 · **Phase:** 4 (slice 4)

## Context
A confirmed upload is saved as "processing" (decision 025), and the slow work (length, preview, waveform) happens in the worker. The website and the worker only talk through BullMQ queues in Redis. Two things could go wrong: Redis is down at the moment of upload (no ticket, so the track waits forever), and the same upload is confirmed twice (two tickets, so the work runs twice).

## Decision
- **`packages/queues`** holds what both sides must agree on:
  - queue and job names;
  - the ticket (`{ trackId, audioKey }`, the exact file) and `parseAudioJob`, which refuses anything else;
  - Redis connection settings.

  The website can't import from inside the worker app, so these can't live there.
- **One ticket per file (user choice 2):** the job id is a fingerprint of track + file. BullMQ ignores a second ticket with the same id while one is waiting or running. A new file gets a new id. Finished and failed tickets are removed, so the same file can be queued again later; the track row, not Redis, records the outcome.
- **The upload never waits on Redis (user choice 1):** sending a ticket has a 2-second limit and never throws. The website's Redis client gives up after one retry. If sending fails, the upload still succeeds and the track stays "processing".
- **The sweep:** every 5 minutes the worker re-sends tickets for tracks still "processing" 10+ minutes after their last change (at most 100 per run). The ticket id stops duplicates of tickets still in the queue.
- **Retries:** 3 attempts with growing waits (10 s, 20 s). A malformed ticket fails at once without retries.
- **Queue prefix:** keys live under `ferrel`; integration tests use `ferrel-test` (`QUEUE_PREFIX`), so a worker running from `pnpm dev` can't take their tickets.

## Alternatives considered
- **Fail the upload when Redis is down:** honest, but the artist would have to upload again for a problem that isn't theirs.
- **Save tickets in Postgres first and forward them to Redis ("outbox"):** the strongest guarantee, but a new table and a forwarding loop. The track's "processing" status already acts as the record of work owed, which the sweep reads.
- **No job id (allow duplicates):** simpler, but double work, and two jobs racing to write the same track.

## Consequences
- Until slice 5 the worker only logs tickets. A track never leaves "processing" yet, so the sweep re-sends its ticket every 5 minutes (harmless: it is just logged).
- Slices 5–7 must check that the ticket's `audioKey` is still the track's file before writing (decision 025).
- Every `pnpm dev` worker also runs the sweep. Running several workers is safe because of the ticket ids.
