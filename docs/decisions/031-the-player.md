# 031 — The preview player
**Status:** Accepted · **Date:** 2026-11-04 · **Phase:** 4 (slice 10)

## Context
Releases now have 15-second previews in a public bucket (decision 028), with a start the artist chooses (030). Visitors, mostly advertisers, need to hear them on release pages, and artists need to hear their own preview in the editor. The master must never be requested.

## Decision
- **One player component** (`components/audio/preview-player.tsx`) on release pages and in the editor:
  - play/pause and the elapsed time;
  - the song's 200-bar waveform with the previewed 15 seconds highlighted and filling as it plays, so advertisers see which part of the song they're hearing.
- **The audio loads only when play is pressed** (`preload="none"`): visitors browsing pages download nothing.
- **Shown only when a preview exists:** the track is ready, previews are on, and a preview file is attached. Otherwise there's no player and no message; the page looks as it did before.
- **Public data only:** `getPublicTrack` turns the preview columns into a ready-to-play link (`preview: { url, durationMs, startMs, lengthMs, waveform }`) and drops the raw columns. The master's location is still never selected (decision 015).
- **`publicPreviewUrl`** builds the link and accepts preview keys only (`<trackId>/<random>.mp3`), so nothing else can become a public link. `PREVIEWS_PUBLIC_URL` points at a CDN in a real deployment; empty means the local storage server.

## Alternatives considered
- **Preload metadata or the whole file:** a faster first play, but every page view would download audio.
- **The browser's built-in audio controls:** no waveform and inconsistent styling across browsers.

## Consequences
- The song's waveform (loudness shape only) is public for releases with a preview.
- A real deployment must set `PREVIEWS_PUBLIC_URL` to an HTTPS address, or browsers will block the audio on an HTTPS site.
- Play buttons on Explore cards are a possible follow-up.
