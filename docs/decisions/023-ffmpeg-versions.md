# 023 — FFmpeg versions differ by platform; Linux is the reference
**Status:** Accepted · **Date:** 2026-10-25 · **Phase:** 4
**Amends:** [022](022-audio-previews.md), which chose `ffmpeg-static` partly for "the same version on every machine".

## Context
The phase 4 spike ([findings](../spikes/ffmpeg.md)) showed that `ffmpeg-static@5.3.0` installs FFmpeg **6.1.1 on Windows** (gyan.dev build) and **7.0.2 on Linux** (johnvansickle build). Every recipe phase 4 needs gave equivalent results on both, but small details differ (a preview of 14,990 vs 15,000 ms; a timestamp-based length that is one frame short on 6.1).

## Decision
Keep `ffmpeg-static` (option A in the spike):
- **Linux is the reference.** CI and any future server run 7.0.2; Windows is for development only.
- **Tests allow small tolerances** (e.g. ±50 ms on lengths) rather than exact equality across platforms.
- **Use only recipes proven equivalent on both.** In particular, read length by counting decoded samples, never from timestamps.

## Alternatives considered
- **B. Pin one build per platform via `FFMPEG_BIN`:** truly identical, but we would maintain downloads ourselves.
- **C. Always run the worker in Docker (Linux):** identical everywhere, but a slower loop for worker development.

## Consequences
- A test that passes on Windows but fails in CI means a real difference: CI wins, and we fix the recipe.
- If differences start to matter, switch to option C. Only how the worker is started changes.
