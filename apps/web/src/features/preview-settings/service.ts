// The preview's start and on/off, independent of Next.js: callers pass an already-
// authenticated creator id. Each change reads and writes the track in one locked step,
// then deletes the old public preview and asks the worker for a new one (decision 028).
import { and, db, eq, tracks } from "@ferrel/db";
import { queueAudioProcessing } from "@ferrel/queues";
import { deleteObject } from "@ferrel/storage";
import { isUuid } from "../tracks/track-access";
import { checkStart } from "./rules";

export type SettingResult = { ok: true } | { ok: false; error: string };

const NOT_FOUND = { ok: false, error: "Track not found." } as const;
const ARCHIVED = { ok: false, error: "Archived releases can't be changed." } as const;

type Change = { ok: true; oldPreview: string | null; audioKey: string | null; makePreview: boolean } | { ok: false; error: string };

/** Lock the owner's track, let `decide` validate and update it, then clean up outside the lock. */
async function change(creatorId: string, trackId: string, decide: (t: LockedTrack, owned: ReturnType<typeof and>) => Promise<Change>): Promise<SettingResult> {
  if (!isUuid(trackId)) return NOT_FOUND;
  const owned = and(eq(tracks.id, trackId), eq(tracks.creatorId, creatorId));
  const outcome = await db.transaction(async (tx) => {
    const [t] = await tx
      .select({
        status: tracks.status,
        audioStatus: tracks.audioStatus,
        audioKey: tracks.audioKey,
        durationMs: tracks.durationMs,
        previewKey: tracks.previewKey,
        previewEnabled: tracks.previewEnabled,
      })
      .from(tracks)
      .where(owned)
      .for("update");
    if (!t) return NOT_FOUND;
    if (t.status === "archived") return ARCHIVED;
    return decide({ ...t, tx }, owned);
  });
  if (!outcome.ok) return outcome;
  // The change is saved; a storage hiccup must not undo it or crash the page. A file left behind
  // is unreferenced and removed by the orphan clean-up (phase 4 slice 12).
  if (outcome.oldPreview) {
    await deleteObject("previews", outcome.oldPreview).catch((err: Error) => console.error(`[previews] couldn't delete ${outcome.oldPreview}: ${err.message}`));
  }
  // If Redis is down the change still counts: the worker's sweep makes the preview later.
  if (outcome.makePreview && outcome.audioKey) await queueAudioProcessing({ trackId, audioKey: outcome.audioKey });
  return { ok: true };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type LockedTrack = {
  tx: Tx;
  audioStatus: string;
  audioKey: string | null;
  durationMs: number | null;
  previewKey: string | null;
  previewEnabled: boolean;
};

/** Choose where the preview starts. The old preview goes, and the worker makes a new one. */
export function setPreviewStart(creatorId: string, trackId: string, startMs: number): Promise<SettingResult> {
  return change(creatorId, trackId, async (t, owned) => {
    if (t.audioStatus !== "ready" || t.durationMs === null) return { ok: false, error: "You can choose the start once your track is measured." };
    const check = checkStart(startMs, t.durationMs);
    if (!check.ok) return check;
    await t.tx.update(tracks).set({ previewStartMs: check.startMs, previewKey: null, previewFailedAt: null }).where(owned);
    return { ok: true, oldPreview: t.previewKey, audioKey: t.audioKey, makePreview: t.previewEnabled };
  });
}

/** Turn previews off (the public file is deleted at once) or on (the worker makes one). */
export function setPreviewEnabled(creatorId: string, trackId: string, enabled: boolean): Promise<SettingResult> {
  return change(creatorId, trackId, async (t, owned) => {
    if (!enabled) {
      await t.tx.update(tracks).set({ previewEnabled: false, previewKey: null }).where(owned);
      return { ok: true, oldPreview: t.previewKey, audioKey: t.audioKey, makePreview: false };
    }
    await t.tx.update(tracks).set({ previewEnabled: true, previewFailedAt: null }).where(owned);
    // While still processing, the worker makes the preview right after measuring anyway.
    return { ok: true, oldPreview: null, audioKey: t.audioKey, makePreview: t.audioStatus === "ready" && t.previewKey === null };
  });
}
