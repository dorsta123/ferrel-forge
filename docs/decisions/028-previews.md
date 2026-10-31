# 028 — Previews are made in the same job, right after measuring
**Status:** Accepted · **Date:** 2026-10-31 · **Phase:** 4 (slice 6)

## Context
Decision 022 set the preview's shape: 15 seconds, the artist's start (about 25% in until they choose), one soft watermark tone in the middle, optional. The spike proved the FFmpeg recipe on both platforms. This slice decides where and how the worker makes it, and what "ready" means once there is a preview too.

## Decision
- **One job, two steps, one download.** The worker downloads the master once, measures it if it's new (step 1, decision 027), then makes the preview if one is wanted and missing (step 2). A step already done is skipped, so a retry or a sweep re-send only does what's left.
- **"Ready" means measured** (user, 2026-10-31). The preview follows a few seconds later. The player (slice 10) appears only once a preview exists. Previews switched off, or a preview temporarily failing, never make a good song look unfinished.
- **The window** (`previewWindow`): the artist's start, or 25% in; pulled back so 15 s fit; the whole track if it's shorter. The tone sits at the middle (7.5 s).
- **The sound:** a 1 kHz sine, 0.6 s with short fades, mixed at about −30 dBFS (FFmpeg's sine is 1/8 scale, at 25% volume). MP3 at 128 kbps stereo, about 240 KB. The level will be tuned by ear once a real preview can be heard.
- **Public file, new random name:** `previews/<trackId>/<random>.mp3`. A new name every time means browsers never play an old cached copy.
- **Attached only if nothing changed:** the key is saved only while the track is "ready", still has that master, previews are on and it has no preview yet. Otherwise the just-uploaded file is deleted again, so nothing stray stays public.
- **Preview failures are ours:** the song already decoded while measuring, so the step throws and is retried, never shown to the artist as "failed". After the last attempt it records `preview_failed_at` and stops (migration `0008_preview_failed_at`). The sweep re-sends "ready" tracks still missing a wanted preview, except those given up on. A new upload clears the mark.
- **Old previews are always removed (from review):** a re-upload reads the old preview inside the same locked update (`SELECT … FOR UPDATE`), so one the worker attached a moment earlier is deleted too. Deleting a release deletes its preview.
- **Seeking:** `-ss`/`-t` on the input were checked on a variable-bitrate MP3 with no seek table. The start was exact (±75 ms), and a test keeps it that way.

## Alternatives considered
- **A separate preview job:** cleaner separation, but a second download of up to 150 MB and a second ticket type to keep in step.
- **"Ready" only once the preview exists:** one status for everything, but previews switched off would need a special case, and a preview problem would hold back the length too.
- **A fixed key per track (overwrite in place):** fewer files, but browsers and any cache could keep playing the old preview.

## Consequences
- Draft tracks get a preview too, so it's ready the moment they're published. Its address contains the track id and a random part. It isn't listed anywhere public until the release is, but anyone who has the exact link could play it.
- Changing the start point (slice 9) must clear the preview key and delete the old file, so the worker makes a new one.
- A preview uploaded just before a crash, but never attached, stays in the bucket. Slice 12's clean-up removes such orphans.
