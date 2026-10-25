# 025 — Audio results live on the track, guarded by the database
**Status:** Accepted · **Date:** 2026-10-25 · **Phase:** 4 (slice 3)

## Context
Phase 4's worker will measure each upload, make a 15 s preview and draw a waveform. Those results need a home, and they must never contradict the file they came from (e.g. a replaced song keeping the old song's length, which the phase 3 upload code allowed).

## Decision
- **Columns on `tracks`** (migrations `0006_audio_results`, `0007_audio_rules_tightened`): `audio_status` (none / processing / ready / failed), `audio_error`, `preview_key`, `preview_start_ms` (null = the default, about 25% in), `preview_enabled` (default on), `waveform`.
- **The database enforces the combinations** with check constraints, so a bug elsewhere can't save a contradiction:
  - status is "none" exactly when there is no file;
  - "ready" needs a length;
  - an error is required for "failed", and only then;
  - a length, preview, start point or waveform needs a file;
  - no preview file while previews are off;
  - a start point needs a known length (it's picked on the waveform), and the 15 s preview must fit inside the track (tracks under 15 s play from 0).
- **Waveform = `smallint[]`, exactly 200 bars of 0–1000**, not JSON. The database can check the shape (one row, 200 values, no gaps, in range); with JSON it could only check that the text parses. Rounding to thousandths is far finer than a pixel. `TRACK_LIMITS.waveformBars` must match `PEAK_COUNT` in `@ferrel/audio`.
- **A new upload resets the results**: status "processing"; length, waveform, start point, error **and preview** cleared, and the old preview file deleted. The old song's preview must never play for the new song (found in review: "ready" with the new length but the old preview would otherwise be allowed).
- **Existing uploads were cleared** (user decision), so every track starts fresh in the pipeline:
  - published tracks returned to draft, exactly like "Unpublish": `published_at` is kept, so the URL stays reserved;
  - their audio fields were emptied, and the master files were deleted from storage by hand (a migration can't reach storage);
  - the migration stops if an archived track has audio, since archived is final and can't return to draft.
- `listen_url` moved to slice 11, next to the feature and its allowed-sites rule.

## Alternatives considered
- **Waveform as JSON:** flexible, but the database can't see inside it, so a broken waveform would only show up as a broken player.
- **Mark existing uploads "processing"** (recommended at the time): keeps the files and lets the worker catch up. The user chose a clean start instead; in development the only affected track was a test release.
- **A separate `track_audio` table:** one row per track either way; a second table would add joins for no gain today.

## Consequences
- Later slices must write with guards: the worker's "ready + length" update only for the job's own `audio_key`; slice 6's preview write only `WHERE preview_enabled AND audio_key = <job key>`, so a job finishing after the artist switched previews off or replaced the audio writes nothing.
- Every confirmed upload, even of the same key, resets to "processing", so slice 4 must queue a job on every confirm.
- Test data that inserts tracks with audio must set `audio_status` (fixtures updated).
- Any future status or preview change must satisfy these constraints; the constraint name in a "violates check constraint" error says which rule failed.
- Slice 5's worker moves "processing" to "ready" or "failed"; slice 7 converts `analyzeAudio`'s 0–1 peaks to 0–1000.
