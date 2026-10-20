"use server";

// Thin Server Actions: authenticate from the session cookie, rebuild the input, delegate.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentCreatorId } from "../tracks/current-creator";
import { readReleaseForm } from "./form-values";
import * as service from "./service";
import { RELEASE_ACTIONS, type ReleaseAction } from "./status";
import type { ReleaseActionResult, ReleaseFormState } from "./types";

const FAILED = "Something went wrong. Please try again.";

export async function createRelease(_prev: ReleaseFormState, formData: FormData): Promise<ReleaseFormState> {
  const creatorId = await currentCreatorId();
  if (creatorId === null) redirect("/sign-in");
  if (creatorId === "not-creator") redirect("/become-creator");

  const result = await service.createRelease(creatorId, readReleaseForm(formData)).catch(logged);
  if (!result) return { errors: { form: FAILED } };
  if (!result.ok) return { errors: result.errors };

  revalidatePath("/dashboard");
  redirect(`/dashboard/tracks/${result.id}`);
}

export async function updateRelease(trackId: string, _prev: ReleaseFormState, formData: FormData): Promise<ReleaseFormState> {
  const creatorId = await currentCreatorId();
  if (creatorId === null) redirect("/sign-in");
  if (creatorId === "not-creator") return { errors: { form: "Track not found." } };

  const result = await service.updateRelease(creatorId, String(trackId), readReleaseForm(formData)).catch(logged);
  if (!result) return { errors: { form: FAILED } };
  if (!result.ok) return { errors: result.errors };

  revalidatePath(`/dashboard/tracks/${trackId}`);
  return { errors: {}, savedAt: Date.now() };
}

export async function changeReleaseStatus(trackId: string, action: ReleaseAction): Promise<ReleaseActionResult> {
  const creatorId = await currentCreatorId();
  if (creatorId === null) return { ok: false, error: "Please sign in again." };
  if (creatorId === "not-creator") return { ok: false, error: "Track not found." };
  if (!RELEASE_ACTIONS.includes(action)) return { ok: false, error: "Unknown action." };

  const result = await service.changeReleaseStatus(creatorId, String(trackId), action).catch(logged);
  if (!result) return { ok: false, error: FAILED };
  if (!result.ok) return result;

  revalidatePath("/dashboard");
  if (action === "delete") redirect("/dashboard");
  revalidatePath(`/dashboard/tracks/${trackId}`);
  return result;
}

function logged(err: unknown): null {
  console.error("release action failed", err);
  return null;
}
