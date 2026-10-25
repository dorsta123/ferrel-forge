# 024 — Fetch the pinned FFmpeg ourselves, verified by SHA-256
**Status:** Accepted · **Date:** 2026-10-25 · **Phase:** 4 (slice 2)
**Amends:** [022](022-audio-previews.md) (which chose the `ffmpeg-static` npm package). The builds stay the same; only how they're installed changes.

## Context
The spike ([findings](../spikes/ffmpeg.md)) and slice 2's investigation found that `ffmpeg-static`'s installer:
- **always re-downloads** (~30 MB), so CI can't cache it;
- **has no timeout**: one install stalled indefinitely;
- **doesn't verify** the file it downloads (no checksum).

FFmpeg processes untrusted uploads, so an unverified 80 MB native program is the wrong default.

## Decision
- `packages/audio` pins the **same builds** `ffmpeg-static` uses (GitHub release `b6.1.1`) and records the **SHA-256 of each platform's binary** (`win32-x64`, `linux-x64`) in `src/ffmpeg-release.ts`.
- **`pnpm audio:fetch`:**
  - downloads into the git-ignored `.cache/ffmpeg/<release>/<platform>/`;
  - aborts attempts that stall for 60 s and retries 5 times;
  - verifies the SHA-256 before moving the file into place;
  - skips when a verified copy is already there.
- **At runtime**, `ffmpegPath()` re-checks the fingerprint once per process and refuses a missing or mismatching file with a clear message.
- **CI** caches `.cache/ffmpeg` keyed on the pinned-release file and runs the fetch in its shared setup.
- The `ffmpeg-static` npm package is **not** a dependency.
- Every input names its format (`localInput(file, format)`): with the format left to FFmpeg, a 37-byte `ffconcat` file named `evil.wav` made it read a neighbouring file (found by review in slice 2, now a test).

## Alternatives considered
- **Use `ffmpeg-static` as-is:** simplest, but no cache, no timeout, no verification.
- **System-installed FFmpeg:** manual setup per machine and different versions everywhere.

## Consequences
- After cloning, run `pnpm install` then `pnpm audio:fetch` once (documented in CLAUDE.md). Missing FFmpeg is a clear error, never a silent failure.
- **To upgrade:**
  1. change the release tag;
  2. fetch on each platform;
  3. record the new hashes;
  4. open a PR.

  The CI cache key changes automatically.
- Hashes were taken on first download from GitHub over HTTPS (trust on first use). Pinning them means later downloads must match.
- Only Windows x64 and Linux x64 are pinned. Other machines (e.g. a Mac) get a clear "unsupported platform" error until a build is added.
