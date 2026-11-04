# 032 — An optional "Listen to the full song" link, to a short list of sites only
**Status:** Accepted · **Date:** 2026-11-05 · **Phase:** 4 (slice 11)

## Context
Previews are 15 seconds (decision 022). Artists who want advertisers to hear the whole song can point to where it already lives. A link the artist types appears on a public page, so it must not become a way to send visitors to phishing or malware sites, or to run scripts.

## Decision
- **One optional field** in the release's Details: "Listen to the full song", stored in `tracks.listen_url` (migration `0009_listen_url`).
- **Allowed sites only, https only:**
  - `youtube.com` (also `www.`, `m.`, `music.`) and `youtu.be`;
  - `open.spotify.com`;
  - `soundcloud.com` (also `www.`, `m.`).

  The common `www.`/`m.` forms are included because that's what people paste.
- **The link must** have a path beyond the home page, no login part (`user@`), no port, no spaces, and at most 300 characters. It's stored in the browser's standard form (host lowercased), so what's saved is exactly what visitors open.
- **One list, three checks:**
  - `LISTEN_HOSTS` in `@ferrel/db/constants` feeds the form's instant check and the server's real check (`features/releases/listen-link.ts`, using the standard URL parser);
  - it also builds the database check `tracks_listen_url`, a regular expression requiring an allowed host right after `https://`. Lookalikes (`youtube.com.evil.com`) and hidden logins (`youtube.com@evil.com`) fail all three.
- **On the release page:** a "Listen to the full song on YouTube/Spotify/SoundCloud" button. It opens in a new tab with `rel="noopener noreferrer nofollow"`: the other site can't control our page, isn't told where the visitor came from, and gets no search ranking from us.
- **A plain text field**, not the browser's URL field, so the artist sees our message naming the allowed sites instead of a generic browser one.

## Alternatives considered
- **Any https link:** flexible, but a public page would then link anywhere, including phishing pages.
- **Exactly the four hosts in the original plan:** would refuse the `www.`/`m.` links people actually copy.

## Consequences
- Adding a site means adding it to `LISTEN_HOSTS` **and** a migration, since the database check is built from the list when generated.
- Links stay within the allowed sites, but those sites' own redirect pages could still forward elsewhere; that's a risk we accept from YouTube, Spotify and SoundCloud.
