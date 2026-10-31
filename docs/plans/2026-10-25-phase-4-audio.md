# Plan: phase 4 — audio previews, player, listen links

**Status:** Approved by the user 2026-10-25 · **PRs:** one per slice · **Decisions:** [022](../decisions/022-audio-previews.md)
**Why:** advertisers need to hear a track before licensing it, but masters stay private ([012](../decisions/012-direct-browser-uploads.md)). Each upload gets a short watermarked public preview, its length and a waveform; artists can also link to the full song elsewhere.

## Decisions (user, 2026-10-25)
| # | Decision |
|---|---|
| 1 | Previews are **15 seconds** (full songs: artists can link out, see 6) |
| 2 | **One soft watermark tone in the middle of each preview** (at 7.5 s), so every preview is protected wherever it starts |
| 3 | **The creator chooses the start point**; until they do, it starts **about 25% in**. Tracks shorter than 15 s use the whole track. |
| 4 | **FFmpeg pinned**: the same builds `ffmpeg-static` uses, but fetched by us and SHA-256-verified ([decision 024](../decisions/024-fetch-ffmpeg-ourselves.md)), the same on every machine and in CI |
| 5 | **Publishing never waits for a preview**, and the artist can **switch the preview off**. Public pages handle "processing", "off" and "failed" quietly. |
| 6 | An optional **"Listen on YouTube / Spotify / SoundCloud" link**, accepted only for those sites and checked on the server |

## How we build it (the AI-assisted loop, every slice)
1. **Slice card** (goal, done-when, out of scope): the user approves.
2. **Tests first**, in plain English, failing.
3. **Smallest code** that passes.
4. **Verify:** all test layers, plus a screenshot or demo when visible.
5. **Independent review**, plus a security review for uploads, media processing and links.
6. **PR with evidence**; the user merges.
7. **Learn:** 3–5 lines on what changed and where; CODEMAP/ARCHITECTURE updated.

Two-strike rule: if the same fix fails twice, stop and rethink.

## Slices (walking skeleton first: by slice 5 an upload shows its length)
| # | Slice | Done when |
|---|---|---|
| 1 ✅ | **Spike (throwaway):** [findings](../spikes/ffmpeg.md); FFmpeg on Windows and Linux: read length, cut 15 s from a chosen start, mix one tone at 7.5 s, compute waveform peaks, for WAV/MP3/FLAC | A findings note with the exact working commands; no app code kept |
| 2 ✅ | **FFmpeg in the project:** `packages/audio`: pinned FFmpeg fetched and SHA-256-verified by us ([decision 024](../decisions/024-fetch-ffmpeg-ourselves.md)), a safe runner (`runFfmpeg` + `localInput(file, format)`) and `analyzeAudio()` (exact length + waveform peaks) | Tests pass locally and in CI |
| 3 ✅ | **Database:** `audio_status` (none/processing/ready/failed), `audio_error`, `preview_key`, `preview_start_ms`, `preview_enabled` (default on), `waveform` (200 whole numbers 0–1000, so the database can check its shape); a new upload resets the old results; existing uploads are cleared (published ones go back to draft) so every track starts fresh in the pipeline (user, 2026-10-25). `listen_url` moved to slice 11 | Migration plus database-rule tests (e.g. the start must fit inside the track) |
| 4 | **Web → worker connection:** a shared queue package; every confirmed upload queues `audio:process` with the exact master key; the worker logs it. User choices (2026-10-31): **(1)** if Redis is down the upload still succeeds, and the worker re-queues tracks stuck in "processing" every few minutes; **(2)** a ticket's ID comes from track + file, so a duplicate while one is waiting is ignored | An upload makes the worker log the job; integration tests: one ticket per upload (even when confirmed twice), none for a rejected upload, stuck tracks re-queued; unit test: a hanging Redis doesn't block the upload |
| 5 | **Worker reads the length:** saves `duration_ms`, status ready/failed | **The length appears on cards and pages** |
| 6 | **Preview:** 15 s from the start point (default 25%), one tone at 7.5 s, uploaded to the public bucket; a stale job (audio replaced) writes nothing; the old preview is deleted | A preview in storage; replacement-race test |
| 7 | **Waveform peaks** saved | Peaks stored; unit tests |
| 8 | **Creator status in the editor:** Processing → Ready / Failed · Try again, updating itself | Visible live after an upload |
| 9 | **Start-point picker and preview on/off:** drag a 15 s window on the waveform; changing it regenerates the preview; a switch turns the preview off (and deletes the file) | Changing the start produces a new preview |
| 10 | **The player:** waveform play/pause on release pages and in the editor, preview only; nothing shown when the preview is off or not ready | **A visitor presses play**; the master is never requested |
| 11 | **Listen link:** the `listen_url` column (moved here from slice 3) and an optional field, only `youtube.com`, `youtu.be`, `open.spotify.com` or `soundcloud.com` over https; shown as "Listen to the full song" | Forged and hostile links refused (integration tests) |
| 12 | **Cleanup and hardening:** a daily job deletes abandoned uploads and orphaned previews; `/security-review` of the pipeline; the e2e journey "upload → process → pick start → publish → visitor plays"; docs | Leftovers disappear; journey green |

## Acceptance criteria (whole phase)
- [ ] After uploading, the creator sees the preview processing, then ready, with the length, without reloading.
- [ ] Previews are 15 s, start where the creator chose (or about 25% in), and contain one watermark tone at 7.5 s.
- [ ] Visitors can play the preview, never the master.
- [ ] A release can be published before its preview is ready, or with previews switched off; public pages then simply show no player.
- [ ] Replacing the audio, or changing the start, replaces the preview and deletes the old file.
- [ ] Corrupt files end as "Preview failed" with a reason and a retry.
- [ ] Listen links accept only the allowed sites; anything else is refused on the server.
- [ ] Abandoned uploads are deleted after 24 hours.
- [ ] CI passes, including tests that run real FFmpeg.

## Risks
- **Processing untrusted media:**
  - FFmpeg reads only a local temp file, with network protocols off;
  - each job has a time limit;
  - the output is always re-encoded;
  - the pipeline gets a security review.
- **New web → worker link:** jobs keyed on the master key are idempotent; retries run with back-off; failures are visible.
- **Links to other sites:** an allow-list of hosts, https only, normalized on the server, rendered with `rel="noopener noreferrer"`.
- **Copyright:** famous songs can be uploaded by people who don't own them (PRODUCT.md question 9). Out of scope here, and noted.
