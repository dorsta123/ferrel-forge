# 008 — Generated cover art
**Status:** Accepted · **Date:** 2026-10-20 · **Phase:** 3

## Context
Releases need artwork. Image uploads mean processing, storage and moderation.

## Decision
Each track's cover is generated in the Ember style, deterministically from its id (gradient angle, waveform shape, title initials). Same track, same cover.

## Alternatives considered
Uploaded covers (moderation + image pipeline); a single placeholder image (every release looks the same).

## Consequences
No `cover_key` column yet. Uploaded covers can be added later with a fallback to the generated one. Generation must stay deterministic (no `Math.random()` in prerendered components).
