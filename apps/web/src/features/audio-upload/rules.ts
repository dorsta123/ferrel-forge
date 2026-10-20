// Which files may be uploaded as a track master. Pure: used in the browser for
// instant feedback and on the server as the real check (before signing a link).
import { AUDIO_BROWSER_TYPES, AUDIO_FORMATS, TRACK_LIMITS, type AudioFormat } from "@ferrel/db/constants";
import { formatBytes } from "@/lib/format-bytes";

const EXTENSIONS: Record<string, AudioFormat> = { wav: "wav", wave: "wav", mp3: "mp3", flac: "flac" };

/** For <input accept>: extensions plus the browser content types. */
export const AUDIO_ACCEPT = [
  ...Object.keys(EXTENSIONS).map((ext) => `.${ext}`),
  ...AUDIO_FORMATS.flatMap((f) => AUDIO_BROWSER_TYPES[f]),
].join(",");

export const AUDIO_HINT = `WAV, MP3 or FLAC · up to ${formatBytes(TRACK_LIMITS.audioMaxBytes)}`;

export type AudioFileInfo = { name: string; size: number; type: string };
export type AudioFileCheck = { ok: true; format: AudioFormat } | { ok: false; error: string };

/**
 * The extension decides the format; a declared content type, if the browser
 * sent one, must agree with it. The server later verifies the actual bytes.
 */
export function checkAudioFile({ name, size, type }: AudioFileInfo): AudioFileCheck {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const format = name.includes(".") ? EXTENSIONS[ext] : undefined;
  if (!format) return { ok: false, error: "Use a WAV, MP3 or FLAC file." };
  if (type && !AUDIO_BROWSER_TYPES[format].includes(type.toLowerCase())) {
    return { ok: false, error: "That file doesn't look like the audio type its name says." };
  }
  if (!Number.isInteger(size) || size <= 0) return { ok: false, error: "That file is empty." };
  if (size > TRACK_LIMITS.audioMaxBytes) {
    return { ok: false, error: `That file is ${formatBytes(size)}. The limit is ${formatBytes(TRACK_LIMITS.audioMaxBytes)}.` };
  }
  return { ok: true, format };
}
