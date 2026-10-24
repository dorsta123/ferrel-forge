# Spike: FFmpeg for audio previews (phase 4, slice 1)

**Date:** 2026-10-25 · **Plan:** [phase 4](../plans/2026-10-25-phase-4-audio.md) · **Decision:** [022](../decisions/022-audio-previews.md)
**Question:** can `ffmpeg-static` do everything phase 4 needs, on Windows (dev) and Linux (CI and servers)?
**Answer:** **yes, every recipe works on both.** But `ffmpeg-static` installs **different FFmpeg versions** per platform, and the install is a large download that can stall.

The experiment code was throwaway (session scratchpad). Only these findings and the recipes below are kept.

## Results
23 checks on generated WAV, MP3 (VBR) and FLAC files, from a folder whose path contains spaces.

| Check | Windows: FFmpeg 6.1.1 (gyan.dev) | Linux: FFmpeg 7.0.2 (johnvansickle) |
|---|---|---|
| Runs from a path with spaces | ✅ | ✅ |
| MP3 encoder (`libmp3lame`) included | ✅ | ✅ |
| **Exact length by counting decoded samples**, WAV/MP3/FLAC | ✅ 40,000 ms each | ✅ 40,000 ms each |
| Length from the last progress timestamp | ⚠️ FLAC 39,910 ms (one frame short) | ✅ |
| 15 s preview from WAV/MP3/FLAC | ✅ 14,990 ms | ✅ 15,000 ms |
| Watermark tone at 7.5 s (measured on a silent track) | ✅ 7,508 ms | ✅ 7,508 ms |
| Start too close to the end is pulled back to fit 15 s | ✅ | ✅ |
| Default start 25% in | ✅ | ✅ |
| Track shorter than 15 s: whole track, tone at its middle | ✅ | ✅ |
| Waveform: 200 peaks, values 0..1 | ✅ | ✅ |
| 159 MB WAV (15 min): length / preview / peaks | ✅ 0.8 s / 0.2 s / 1.1 s | ✅ 0.2 s / 0.1 s / 0.5 s |
| Garbage file fails fast and cleanly | ✅ 45 ms | ✅ 7 ms |
| Network playlist blocked | ✅ (checked by hand, see below) | ✅ |

## Findings
1. **Versions differ by platform.** `ffmpeg-static@5.3.0` pins a release, but its Windows file is a gyan.dev 6.1.1 build and its Linux file a johnvansickle 7.0.2 build. Outputs are equivalent for our recipes, but small details differ (preview 14,990 vs 15,000 ms; the timestamp length method). **This contradicts decision 022's "same version everywhere".** It needs a decision (see "Open decision").
2. **No `ffprobe`** in `ffmpeg-static`, and `ffprobe-static` hasn't been updated since 2022. That's fine: length is read with FFmpeg itself.
3. **Read length by counting samples, not timestamps.** Decode to mono 8 kHz 16-bit and divide the sample count by 8,000. It's exact for every format on both versions, and it's the same decode the waveform needs, so one pass gives both.
4. **The install downloads ~30 MB (82 MB unpacked) from GitHub** in a postinstall script:
   - one attempt stalled indefinitely (the installer has no timeout);
   - a resumable `curl` of the same file took under a minute;
   - in the repo this needs a pnpm `allowBuilds` approval and a CI cache.
5. **Fast enough.** A 150 MB, 15-minute WAV takes about 2 s in total on the laptop and under 1 s on Linux, so jobs need a timeout, not a queue redesign.
6. **Security, defence in depth.** A real HLS playlist pointing at `http://…`:
   - without our flag: blocked by FFmpeg's own default for local playlists (`file,crypto,data`);
   - with `-protocol_whitelist file`: blocked by our stricter rule;
   - disguised as `.wav`: not even recognised.

   On top of that, uploads must already pass the byte-signature check before processing. **Slice 6 hardening:** pass the detected format explicitly (`-f wav|mp3|flac`), so FFmpeg never guesses.

   *(The automated playlist check in the script was inconclusive, because FFmpeg rejected the test file as malformed; a hand-written, valid playlist proved the behaviour above.)*

## Recipes (to copy into slices 2, 6 and 7)
Always: `spawn` with an argument array (no shell), `-nostdin -hide_banner`, `-protocol_whitelist file` before `-i`, and a kill timer.

**Length and waveform, in one pass**
```
ffmpeg -nostdin -hide_banner -protocol_whitelist file -i <master> -map 0:a:0 -ac 1 -ar 8000 -f s16le pipe:1
```
- Read stdout as Int16 samples.
- Length (ms) = samples / 8000 × 1000.
- Peaks: split into 200 buckets and take the max |sample| / 32768 in each.

**15-second preview with one tone at 7.5 s** (length L = min(15 s, track); start clamped to [0, track − L]; tone at min(7.5 s, L/2))
```
ffmpeg -nostdin -hide_banner -y -protocol_whitelist file \
  -ss <start s> -t <L s> -i <master> \
  -f lavfi -i sine=frequency=1000:sample_rate=44100:duration=0.6 \
  -filter_complex "[0:a]aresample=44100,aformat=channel_layouts=stereo[m];
                   [1:a]volume=0.25,afade=t=in:d=0.05,afade=t=out:st=0.55:d=0.05,adelay=<toneMs>|<toneMs>,aformat=channel_layouts=stereo[w];
                   [m][w]amix=inputs=2:duration=first:normalize=0,atrim=0:<L s>[out]" \
  -map "[out]" -c:a libmp3lame -b:a 128k <preview.mp3>
```

## Open decision: what to do about the version mismatch
| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Accept, CI is the reference** | Keep `ffmpeg-static`. Tests allow small tolerances (±50 ms). Linux 7.0.2 (CI, any server) is "the" version; Windows is dev only. | Simplest; every recipe already proven on both | "Same everywhere" isn't literally true |
| B. Pin one build ourselves | Set `FFMPEG_BIN` to the same version on each machine (e.g. download matching 7.0.x builds) | Truly one version | We maintain downloads per platform; more setup |
| C. Run the worker in Docker | The worker always runs Linux (FFmpeg 7.0.2), locally too | Dev = CI = server | Slower edit-and-retry loop for worker code; Docker always on (already needed for the database) |

**Recommendation: A** for now. Every behaviour we rely on matched on both builds within tolerance. Move to C if a real difference ever appears.
