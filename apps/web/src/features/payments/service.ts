// Saved payment cards, independent of Next.js: callers pass an already-authenticated user id.
import { db, eq, paymentCards } from "@ferrel/db";
import type { CardProvider } from "@ferrel/db/constants";
import { currentPaymentsMode } from "./mode";
import { finishStripeSetup, startStripeSetup } from "./stripe-cards";
import { getStripe } from "./stripe-client";

export type SavedCard = { provider: CardProvider; brand: string; last4: string };
type Result = { ok: true } | { ok: false; error: string };

const NO_STRIPE = { ok: false, error: "Card payments aren't set up on this server." } as const;

/** What to show for the account's card, or null. Never the Stripe ids. */
export async function savedCard(userId: string): Promise<SavedCard | null> {
  const [card] = await db
    .select({ provider: paymentCards.provider, brand: paymentCards.brand, last4: paymentCards.last4 })
    .from(paymentCards)
    .where(eq(paymentCards.userId, userId))
    .limit(1);
  return card ?? null;
}

async function saveCard(userId: string, card: Omit<typeof paymentCards.$inferInsert, "userId">) {
  const values = { stripeCustomerId: null, stripePaymentMethodId: null, ...card };
  await db
    .insert(paymentCards)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: paymentCards.userId, set: { ...values, updatedAt: new Date() } });
}

/** Only while no Stripe keys are set: a pretend Visa ending 4242, labelled as simulated wherever shown. */
export async function saveSimulatedCard(userId: string): Promise<Result> {
  if (currentPaymentsMode().kind !== "simulated") return { ok: false, error: "Add a real test card with Stripe's form." };
  await saveCard(userId, { provider: "simulated", brand: "visa", last4: "4242" });
  return { ok: true };
}

/** Starts Stripe's card form: the client secret it needs, and the public key. */
export async function startCardSetup(userId: string): Promise<{ ok: true; clientSecret: string; publishableKey: string } | { ok: false; error: string }> {
  const mode = currentPaymentsMode();
  if (mode.kind !== "stripe") return NO_STRIPE;
  const [existing] = await db
    .select({ customerId: paymentCards.stripeCustomerId })
    .from(paymentCards)
    .where(eq(paymentCards.userId, userId))
    .limit(1);
  const { clientSecret } = await startStripeSetup(getStripe(mode.secretKey), userId, existing?.customerId ?? null);
  return { ok: true, clientSecret, publishableKey: mode.publishableKey };
}

/** After Stripe's form succeeds: checks the SetupIntent with Stripe, then saves the card. */
export async function finishCardSetup(userId: string, setupIntentId: string): Promise<Result> {
  const mode = currentPaymentsMode();
  if (mode.kind !== "stripe") return NO_STRIPE;
  const result = await finishStripeSetup(getStripe(mode.secretKey), userId, setupIntentId);
  if (!result.ok) return result;
  await saveCard(userId, { provider: "stripe", ...result.card });
  return { ok: true };
}
