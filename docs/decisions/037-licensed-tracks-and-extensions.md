# 037 — Protecting licensed tracks, and extending licenses
**Status:** Accepted · **Date:** 2026-11-25 · **Phase:** 5 (part 4)
**Builds on:** [014](014-release-lifecycle.md) (release lifecycle), [034](034-licensing-basics.md), [035](035-cards-and-master-downloads.md), [036](036-splits-in-practice.md).

## Context
Advertisers pay for, and download, a specific track. Once licensed, the artist must not be able to pull it from under them or swap the file. Advertisers also need to keep a good track running past its term without renegotiating.

## Decision
- **While a track has a license that hasn't ended:**
  - **unpublish is refused**, with the reason under the disabled button;
  - **its audio can't be replaced** (from the part 2 review), and the server refuses even if the track were back to draft;
  - **delete** was already refused for any track ever licensed (the database too).
- **Archive stays allowed** (a change from the first plan): it's how an artist stops selling. An archived track takes no new licenses or extensions, while existing licenses and master downloads keep working, as the release page says. Blocking archive would leave no way to stop sales.
- **"Not yet ended" protects; "started and not ended" serves.** Protection counts every license whose end is still ahead; downloads and extensions need a license that has started. Licenses take their dates from the **database clock**, the same clock every check uses, so app-server clock drift can't open a gap (review).
- **No racing past the rules:** unpublishing locks the track row and counts licenses after the lock; a new license or extension holds a shared lock on the track while it checks the track is live. One waits for the other.
- **Extensions:** "Extend" in My licenses adds 30, 90 or 365 days to an active license.
  - **Same license**, so the same **locked rate and split**.
  - Only while the track is still published with usable audio, and with a usable card.
  - At most **5 years** in total.
  - `licenses.extended_days` records the added days, and the database checks that the end date = start + (term + extensions) days. `license_extensions` keeps each extension: days, previous end and new end.
  - Dates are computed in the database: its timestamps carry microseconds, and the checks compare exactly.

## Alternatives considered
- **Block archive too** (the first plan): no way to stop selling while any license runs.
- **Extension as a new license:** a fresh rate and split, which defeats "at its locked rate", and splits invoices across records.
- **Freely chosen extension lengths:** more edge cases for pricing and billing; the same 30/90/365 steps as new licenses keep it simple.

## Consequences
- Invoices (phase 7) bill exposure up to each license's current end date; the extension history explains changes.
- An archived track's licenses run out as agreed; the artist can't take the track down sooner.
