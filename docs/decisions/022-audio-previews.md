# 022 — Audio previews: 15 seconds, creator-chosen, optional
**Status:** Accepted · **Date:** 2026-10-25 · **Phase:** 4

## Context
Advertisers need to hear a track before licensing it. Masters are private ([012](012-direct-browser-uploads.md)), so a separate public preview is needed. The user set the product rules.

## Decision
- **Length:** 15 seconds (or the whole track if it's shorter). Enough to judge mood; full songs can be heard elsewhere (a listen link, below).
- **Start point:** chosen by the creator on a waveform. Until they choose, it starts about 25% into the track. Changing it regenerates the preview.
- **Watermark:** one soft tone mixed in at the middle of the preview (7.5 s). Every preview is protected wherever it starts, and the clip can't be used in an ad as-is.
- **Optional:** publishing never waits for a preview. Artists can switch previews off entirely (e.g. a well-known song). Public pages show no player when the preview is off, still processing, or failed.
- **Listen link:** artists may add one link to the full song, on YouTube, Spotify or SoundCloud only, https only, checked and normalized on the server.
- **Tooling:** FFmpeg comes from `ffmpeg-static`, pinned, so laptops and CI run the same version.

## Alternatives considered
- 30 or 60 s previews, or a whole low-quality track: more of the artist's work exposed. The user chose 15 s.
- A watermark at the middle of the *song*: the creator-chosen 15 s usually wouldn't contain it.
- Publishing requires a ready preview: simpler public pages, but blocks artists who don't want a preview.
- System-installed FFmpeg: different versions per machine.

## Consequences
- Tracks gain columns for processing status, preview location and start, the on/off switch, waveform peaks and the listen link.
- Public pages must handle a missing preview. The player is never the only way to judge a track.
- The listen link is user-supplied and points off-site: allow-list, https and safe link attributes are required.
- `ffmpeg-static` includes GPL components. That's fine non-commercially; revisit if the project ever goes commercial.
