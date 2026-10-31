// Upload logic, independent of Next.js: callers pass an already-authenticated
// creator id. Every function re-checks ownership and draft status itself.
import { and, db, eq, tracks } from "@ferrel/db";
import { AUDIO_CONTENT_TYPES, TRACK_LIMITS } from "@ferrel/db/constants";
import { queueAudioProcessing } from "@ferrel/queues";
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

  // Read the files being replaced and switch in the same locked step: the worker may attach
  // a preview of the old song at any moment until then, and that preview must be deleted too.
  const old = await db.transaction(async (tx) => {
    const owned = and(eq(tracks.id, trackId), eq(tracks.creatorId, creatorId), eq(tracks.status, "draft"));
    const [current] = await tx.select({ audioKey: tracks.audioKey, previewKey: tracks.previewKey }).from(tracks).where(owned).for("update");
    if (!current) return null; // published in the meantime
    await tx
      .update(tracks)
      // A new file starts over: the old song's length, waveform, start point, error and
      // preview no longer apply (the old preview must never play for the new song).
      .set({
        audioKey: key,
        audioSizeBytes: info.size,
        audioFormat: detected,
        audioStatus: "processing",
        audioError: null,
        durationMs: null,
        waveform: null,
        previewStartMs: null,
        previewKey: null,
        previewFailedAt: null,
      })
      .where(owned);
    return current;
  });
  if (!old) return reject(key, NOT_DRAFT.error);

  // Only now remove the files it replaced.
  if (old.audioKey && old.audioKey !== key) await deleteObject("masters", old.audioKey);
  if (old.previewKey) await deleteObject("previews", old.previewKey);

  // Hand the worker its ticket. If Redis is down the upload still counts: the track
  // is saved as "processing" and the worker's sweep re-sends the ticket later.
  await queueAudioProcessing({ trackId, audioKey: key });
  return { ok: true, format: detected, sizeBytes: info.size };
}

async function reject(key: string, error: string): Promise<ConfirmUploadResult> {
  await deleteObject("masters", key);
  return { ok: false, error };
}
