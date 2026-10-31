# 027 — The worker measures each song once; failures are the file's or ours, never confused
**Status:** Accepted · **Date:** 2026-10-31 · **Phase:** 4 (slice 5)

## Context
Each audio ticket (decision 026) must turn an uploaded master into a length and a waveform (decision 025). Some failures are the artist's file (it isn't audio, it's silent, it's too long). Others are ours (FFmpeg missing, storage down). Telling the artist "your file is broken" when our server is at fault would be wrong, and so would retrying a broken file forever.

## Decision
- **One pass:** the worker downloads the master to a temporary file with a random name in the system temp folder, then runs `analyzeAudio` with the format checked at upload. It saves the **length and the waveform together** (user, 2026-10-31; this folds the planned slice 7 into slice 5) and sets "ready". The temporary copy is always deleted.
- **Only for the current file:** every read and write repeats the ticket's conditions (same track, same file, still "processing"). A ticket for a replaced song, or one already finished, changes nothing.
- **The file's problems** (shown to the artist with what to do, no retry):
  - not readable audio;
  - no sound;
  - over 4 hours;
  - the master is missing from storage;
  - too slow, only after the last attempt.
- **Our problems** (FFmpeg missing, tampered or not starting; storage or database errors; anything unexpected): the job throws, BullMQ retries 3 times, and after that the sweep re-sends it every 5 minutes. The track stays "processing" and is never marked failed for something the artist can't fix. FFmpeg failing to start has its own code (`START_FAILED`), so it isn't mistaken for a bad file.
- The artist-facing messages live in `apps/worker/src/audio/failure.ts` (`AUDIO_FAILURE`).
- **Hardening (from review):**
  - The download has a 5-minute limit (a stalled connection would otherwise hang the job forever, and the sweep can't replace a job that is still running).
  - The download's byte count must match storage's, so a cut-off copy is retried, not measured as a shorter song.
  - The temporary copy is created fresh and readable only by the worker's user.
  - Decoding stops one second past the 4-hour limit.
  - FFmpeg killed from outside (e.g. out of memory) is `KILLED` and retried, not blamed on the file.
  - A length under 1 ms counts as no audio; FFmpeg's resampler already turns such tiny files into 0 samples (measured: 121 input samples → 0, 124 → 18).
  - A failed temp-file delete is only logged.

## Alternatives considered
- **Measure with a quick header read (ffprobe):** faster, but MP3 headers can lie about length (decision 023: count decoded samples).
- **Mark everything failed after 3 attempts:** simple, but an outage on our side would show every new upload as "failed" to its artist.
- **A separate pass for the waveform (slice 7 as planned):** decodes every file twice for no gain.

## Consequences
- While our side is broken (e.g. FFmpeg not fetched on the worker machine), uploads wait in "processing", and the worker logs the cause on every retry. Run `pnpm audio:fetch` and they recover without anyone re-uploading.
- The worker machine needs temporary disk space for one master per running job (up to 150 MB × 2 at the current concurrency).
- Slice 6 adds the preview to the same job, with the same "current file" conditions.
