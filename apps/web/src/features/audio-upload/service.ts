// Upload logic, independent of Next.js: callers pass an already-authenticated
// creator id. Every function re-checks ownership and draft status itself.
import { and, db, eq, tracks } from "@ferrel/db";
import { AUDIO_CONTENT_TYPES, TRACK_LIMITS } from "@ferrel/db/constants";
import {
  AUDIO_SIGNATURE_BYTES,
  createUploadUrl,
  deleteObject,
  detectAudioFormat,
  getObjectInfo,
  isMasterKeyFor,
  newMasterKey,
  parseMasterKey,
  readObjectStart,
} from "@ferrel/storage";
import { checkAudioFile, type AudioFileInfo } from "./rules";
import { getOwnedTrack } from "../tracks/track-access";
import type { ConfirmUploadResult, RequestUploadResult } from "./types";

const NOT_FOUND = { ok: false, error: "Track not found." } as const;
const NOT_DRAFT = { ok: false, error: "Audio can only be changed while the track is a draft." } as const;

/** Step 1: validate the file description and hand out a signed upload link. */
export async function requestAudioUpload(creatorId: string, trackId: string, file: AudioFileInfo): Promise<RequestUploadResult> {
  const track = await getOwnedTrack(creatorId, trackId);
  if (!track) return NOT_FOUND;
  if (track.status !== "draft") return NOT_DRAFT;

  const check = checkAudioFile(file);
  if (!check.ok) return check;

  const key = newMasterKey(creatorId, trackId, check.format);
  const contentType = AUDIO_CONTENT_TYPES[check.format];
  const uploadUrl = await createUploadUrl({ bucket: "masters", key, contentType, contentLength: file.size });
  return { ok: true, uploadUrl, key, contentType };
}

/** Step 2: after the browser uploaded, verify the stored bytes and attach the file to the track. */
export async function confirmAudioUpload(creatorId: string, trackId: string, key: string): Promise<ConfirmUploadResult> {
  const track = await getOwnedTrack(creatorId, trackId);
  if (!track) return NOT_FOUND;
  // Only keys we could have issued for this creator + track are ever touched.
  if (!isMasterKeyFor(key, creatorId, trackId)) return { ok: false, error: "Upload not recognised." };
  if (track.status !== "draft") return reject(key, NOT_DRAFT.error);

  const info = await getObjectInfo("masters", key);
  if (!info) return { ok: false, error: "The upload didn't arrive. Please try again." };
  if (info.size <= 0 || info.size > TRACK_LIMITS.audioMaxBytes) return reject(key, "That file is too large or empty.");

  // Trust the bytes, not the name: the detected format must match the extension.
  const detected = detectAudioFormat(await readObjectStart("masters", key, AUDIO_SIGNATURE_BYTES));
  const expected = parseMasterKey(key)!.format;
  if (detected !== expected) return reject(key, "That file isn't valid audio. Use a real WAV, MP3 or FLAC file.");

  const updated = await db
    .update(tracks)
    // A new file starts over: the old song's length, waveform, start point and error
    // no longer apply. (The worker replaces the old preview file itself.)
    .set({
      audioKey: key,
      audioSizeBytes: info.size,
      audioFormat: detected,
      audioStatus: "processing",
      audioError: null,
      durationMs: null,
      waveform: null,
      previewStartMs: null,
    })
    .where(and(eq(tracks.id, trackId), eq(tracks.creatorId, creatorId), eq(tracks.status, "draft")))
    .returning({ id: tracks.id });
  if (updated.length === 0) return reject(key, NOT_DRAFT.error); // published in the meantime

  // Only now remove the file it replaced.
  if (track.audioKey && track.audioKey !== key) await deleteObject("masters", track.audioKey);
  return { ok: true, format: detected, sizeBytes: info.size };
}

async function reject(key: string, error: string): Promise<ConfirmUploadResult> {
  await deleteObject("masters", key);
  return { ok: false, error };
}
