# 030 — The artist picks the preview's start on the waveform; only a preview of the current start is kept
**Status:** Accepted · **Date:** 2026-11-04 · **Phase:** 4 (slice 9)

## Context
Decision 022 lets the creator choose where the 15-second preview starts, and switch previews off. The worker makes previews in the background (decision 028), so the artist's choices can change while a preview is being made.

## Decision
- **A Preview section in the editor**, once the song is measured:
  - the stored waveform, with the 15 s window highlighted;
  - a standard slider (`<input type="range">`, 0.1 s steps), so dragging, arrow keys and screen readers work without custom code;
  - **Save start point** to apply it. A button, not "save as you drag", so a new preview isn't made for every small move.
- **An on/off switch** (`role="switch"`): off deletes the public preview at once; on asks the worker for one.
- **Server rules:**
  - only the owner can change these;
  - not for archived releases;
  - the start can be chosen only once the song is measured;
  - the start is a whole millisecond within range (the database checks this too).

  Drafts and published releases are both allowed, because the master doesn't change. Each change reads and writes the track in one locked step, then deletes the old preview and sends a ticket.
- **The worker keeps only a preview of the current start:** it attaches the new file only if `preview_start_ms` is still the value it was made from (null meaning the default); otherwise it deletes the file. Saving a start twice quickly therefore never leaves the first, outdated preview attached.
- **Changes during a job are picked up by that job (from review):** a new ticket for the same file is ignored while one runs, so the worker re-reads the start and on/off before each preview try, and tries again (up to 3 times) when the start changed while it worked. It also re-reads after measuring, so switching previews on mid-processing works. A give-up is recorded only for the start that was tried.
- A storage error while deleting an old preview is logged, not thrown: the change is saved and the page doesn't crash; the orphan clean-up (slice 12) removes the file.
- The editor shows the default start (about 25% in) using the same maths as the worker (`features/preview-settings/rules.ts`, checked against `previewWindow` by a test).

## Alternatives considered
- **Save on every slider change:** no button, but many preview jobs while the artist explores, each replacing the last.
- **A custom drag handle on the waveform:** prettier, but keyboard and screen-reader support would need building by hand; the standard slider gives them for free.

## Consequences
- Choosing a start while previews are off is allowed; it is used when they're switched back on.
- Previews can't be listened to in the editor until the player (slice 10).
