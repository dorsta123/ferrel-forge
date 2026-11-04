# 033 — A daily clean-up deletes storage files no track points to
**Status:** Accepted · **Date:** 2026-11-05 · **Phase:** 4 (slice 12)

## Context
Files can end up in storage with nothing pointing to them:
- a master uploaded through a signed link but never confirmed (the tab closed);
- a preview the worker uploaded just before crashing;
- an old file whose delete failed during a storage hiccup (decisions 028, 030).

Masters cost space. Stray previews are public, so they should not linger.

## Decision
- **A daily worker job** (`apps/worker/src/cleanup/clean-up-storage.ts`, scheduled with the other housekeeping jobs) lists each bucket page by page. It deletes a file when all of these hold:
  - its name is in **our own format**: `<creator>/<track>/<random>.<wav|mp3|flac>` for masters, `<track>/<random>.mp3` for previews. Anything else is never touched;
  - **no track points to it** (checked against the database for each page);
  - it's **old enough**:
    - masters after **24 hours**: a signed upload link lasts 5 minutes and is confirmed right after;
    - previews after **1 hour**: the worker attaches a new preview within seconds of uploading it.
- **Every deletion is logged.**

## Alternatives considered
- **Storage lifecycle rules** (expire objects automatically): they can't check whether a track still points to a file.
- **Delete only inside each feature's own error paths:** already done where possible, but crashes and hiccups can always leave something behind.

## Consequences
- A file is only safe from the clean-up once a track points to it. Any future feature that stores files must attach them within these windows, or give its files a name format the clean-up doesn't recognise.
- The full phase 4 journey (upload → processed → preview → new start → publish → a visitor plays it) now runs as a browser test with the real worker, so CI's browser job fetches FFmpeg too.
