"use server";

// Thin Server Actions: authenticate from the session cookie, then delegate.
import { getCurrentUser } from "@/lib/session";
import { finishCardSetup, saveSimulatedCard, startCardSetup } from "./service";

const SIGNED_OUT = { ok: false, error: "Please sign in again." } as const;

export async function saveSimulatedCardAction() {
  const user = await getCurrentUser();
  return user ? saveSimulatedCard(user.id) : SIGNED_OUT;
}

export async function startCardSetupAction() {
  const user = await getCurrentUser();
  return user ? startCardSetup(user.id) : SIGNED_OUT;
}

export async function finishCardSetupAction(setupIntentId: string) {
  const user = await getCurrentUser();
  return user ? finishCardSetup(user.id, String(setupIntentId)) : SIGNED_OUT;
}
