"use server";

// Thin Server Actions: authenticate from the session cookie, rebuild the input from plain strings,
// then delegate. The services decide everything that matters.
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { currentCreatorId } from "../tracks/current-creator";
import { respondByCode, respondToShare, type Answer } from "./respond";
import { createInviteLink, saveSplit, type SaveSplitResult, type SplitRowSubmit } from "./service";

const str = (v: unknown) => (typeof v === "string" ? v : "");
const answerOf = (v: unknown): Answer => (v === "accept" ? "accept" : "decline");

export async function saveSplitAction(trackId: string, rows: SplitRowSubmit[]): Promise<SaveSplitResult> {
  const creatorId = await currentCreatorId();
  if (typeof creatorId !== "string") return { ok: false, errors: { form: "Please sign in again." } };
  // Plain strings only, and no more rows than the limit could ever accept (the rules count them).
  const clean: SplitRowSubmit[] = (Array.isArray(rows) ? rows.slice(0, 51) : []).map((r) => ({
    name: str(r?.name).slice(0, 200),
    role: str(r?.role),
    roleNote: str(r?.roleNote).slice(0, 200),
    percent: str(r?.percent).slice(0, 20),
    ...(str(r?.shareId) && { shareId: str(r?.shareId) }),
  }));
  const result = await saveSplit(creatorId, String(trackId), clean);
  if (result.ok) revalidatePath(`/dashboard/tracks/${trackId}`);
  return result;
}

export async function createInviteLinkAction(trackId: string, shareId: string) {
  const creatorId = await currentCreatorId();
  if (typeof creatorId !== "string") return { ok: false as const, error: "Please sign in again." };
  return createInviteLink(creatorId, String(trackId), String(shareId));
}

export async function respondByCodeAction(code: string, answer: Answer) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in again." };
  const result = await respondByCode(user.id, String(code), answerOf(answer));
  if (result.ok) revalidatePath("/splits");
  return result;
}

export async function respondToShareAction(shareId: string, answer: Answer) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in again." };
  const result = await respondToShare(user.id, String(shareId), answerOf(answer));
  if (result.ok) revalidatePath("/splits");
  return result;
}
