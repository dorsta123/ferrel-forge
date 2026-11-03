"use server";

// Thin Server Actions: authenticate from the session cookie, then delegate.
import { revalidatePath } from "next/cache";
import { currentCreatorId } from "../tracks/current-creator";
import * as service from "./service";
import type { SettingResult } from "./service";

const SIGNED_OUT = { ok: false, error: "Please sign in again." } as const;
const NOT_FOUND = { ok: false, error: "Track not found." } as const;

export async function setPreviewStart(trackId: string, startMs: number): Promise<SettingResult> {
  const creatorId = await currentCreatorId();
  if (creatorId === null) return SIGNED_OUT;
  if (creatorId === "not-creator") return NOT_FOUND;
  const result = await service.setPreviewStart(creatorId, String(trackId), Number(startMs));
  // The status panel shows the new preview being made.
  if (result.ok) revalidatePath(`/dashboard/tracks/${trackId}`);
  return result;
}

export async function setPreviewEnabled(trackId: string, enabled: boolean): Promise<SettingResult> {
  const creatorId = await currentCreatorId();
  if (creatorId === null) return SIGNED_OUT;
  if (creatorId === "not-creator") return NOT_FOUND;
  const result = await service.setPreviewEnabled(creatorId, String(trackId), enabled === true);
  if (result.ok) revalidatePath(`/dashboard/tracks/${trackId}`);
  return result;
}
