"use server";

// Thin Server Actions: authenticate from the session cookie, then delegate.
import { revalidatePath } from "next/cache";
import { currentCreatorId } from "../tracks/current-creator";
import * as service from "./service";
import type { AudioStatusSnapshot, RetryResult } from "./types";

/** The current state, for the editor's live status. Null when signed out or not the owner. */
export async function getAudioStatus(trackId: string): Promise<AudioStatusSnapshot | null> {
  const creatorId = await currentCreatorId();
  if (creatorId === null || creatorId === "not-creator") return null;
  return service.getAudioStatus(creatorId, String(trackId));
}

export async function retryAudio(trackId: string): Promise<RetryResult> {
  const creatorId = await currentCreatorId();
  if (creatorId === null) return { ok: false, error: "Please sign in again." };
  if (creatorId === "not-creator") return { ok: false, error: "Track not found." };
  const result = await service.retryAudio(creatorId, String(trackId));
  // The publish button depends on the status, so refresh the page around it.
  if (result.ok) revalidatePath(`/dashboard/tracks/${trackId}`);
  return result;
}
