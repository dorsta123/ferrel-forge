"use server";

// Thin Server Actions: authenticate from the session cookie, then delegate.
import { revalidatePath } from "next/cache";
import { currentCreatorId } from "../tracks/current-creator";
import type { AudioFileInfo } from "./rules";
import * as service from "./service";
import type { ConfirmUploadResult, RequestUploadResult } from "./types";

const SIGNED_OUT = { ok: false, error: "Please sign in again." } as const;
const NOT_FOUND = { ok: false, error: "Track not found." } as const;

export async function requestAudioUpload(trackId: string, file: AudioFileInfo): Promise<RequestUploadResult> {
  const creatorId = await currentCreatorId();
  if (creatorId === null) return SIGNED_OUT;
  if (creatorId === "not-creator") return NOT_FOUND;
  // Rebuild the object so only the expected fields reach the service.
  return service.requestAudioUpload(creatorId, String(trackId), {
    name: String(file?.name ?? ""),
    size: Number(file?.size),
    type: String(file?.type ?? ""),
  });
}

export async function confirmAudioUpload(trackId: string, key: string): Promise<ConfirmUploadResult> {
  const creatorId = await currentCreatorId();
  if (creatorId === null) return SIGNED_OUT;
  if (creatorId === "not-creator") return NOT_FOUND;
  const result = await service.confirmAudioUpload(creatorId, String(trackId), String(key));
  if (result.ok) revalidatePath(`/dashboard/tracks/${trackId}`);
  return result;
}
