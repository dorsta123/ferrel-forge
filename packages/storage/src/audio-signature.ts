import type { AudioFormat } from "@ferrel/db/constants";

/** How many leading bytes `detectAudioFormat` needs. */
export const AUDIO_SIGNATURE_BYTES = 16;

const ascii = (bytes: Uint8Array, start: number, text: string) =>
  [...text].every((char, i) => bytes[start + i] === char.charCodeAt(0));

/**
 * Identify an audio file from its first bytes ("magic numbers"), ignoring its
 * name and declared type. Returns null for anything else (text, images, .exe…).
 *
 *   WAV  — "RIFF" ???? "WAVE"
 *   FLAC — "fLaC"
 *   MP3  — "ID3" tag, or a raw MPEG audio frame sync (11 set bits: FF Ex)
 */
export function detectAudioFormat(bytes: Uint8Array): AudioFormat | null {
  if (bytes.length >= 12 && ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WAVE")) return "wav";
  if (bytes.length >= 4 && ascii(bytes, 0, "fLaC")) return "flac";
  if (bytes.length >= 3 && ascii(bytes, 0, "ID3")) return "mp3";
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "mp3";
  return null;
}
