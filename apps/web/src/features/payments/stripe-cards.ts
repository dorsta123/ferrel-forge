// Saving a card with Stripe (test mode). Card numbers go from Stripe's own form straight to Stripe;
// we only ever see ids and the brand/last 4 that Stripe reports back.
// Takes a Stripe client as input (the real one or a test fake); no Next or database imports.

/** The few Stripe calls we use; the real `Stripe` client fits this shape. */
export type StripeLike = {
  customers: { create(params: { metadata: { userId: string } }): Promise<{ id: string }> };
  setupIntents: {
    create(params: {
      customer: string;
      usage: "off_session";
      payment_method_types: ["card"];
      metadata: { userId: string };
    }): Promise<{ id: string; client_secret: string | null }>;
    retrieve(
      id: string,
      params: { expand: ["payment_method"] },
    ): Promise<{
      id: string;
      status: string;
      customer: string | { id: string } | null;
      metadata: Record<string, string> | null;
      payment_method: string | { id: string; card?: { brand: string; last4: string } | null } | null;
    }>;
  };
};

export type StripeCard = { stripeCustomerId: string; stripePaymentMethodId: string; brand: string; last4: string };

const SETUP_INTENT_ID = /^seti_[A-Za-z0-9]{1,200}$/;
const FAILED = { ok: false, error: "We couldn't save that card. Please try again." } as const;

/** A SetupIntent for this account's Stripe customer (created the first time), for later monthly charges. */
export async function startStripeSetup(stripe: StripeLike, userId: string, customerId: string | null): Promise<{ clientSecret: string }> {
  const customer = customerId ?? (await stripe.customers.create({ metadata: { userId } })).id;
  const intent = await stripe.setupIntents.create({
    customer,
    usage: "off_session",
    payment_method_types: ["card"],
    metadata: { userId },
  });
  if (!intent.client_secret) throw new Error("Stripe returned a SetupIntent without a client secret.");
  return { clientSecret: intent.client_secret };
}

/**
 * The card a finished SetupIntent saved. The id comes from the browser, so it's checked against
 * Stripe: it must be this account's (set in metadata by `startStripeSetup`) and have succeeded.
 */
export async function finishStripeSetup(
  stripe: StripeLike,
  userId: string,
  setupIntentId: string,
): Promise<{ ok: true; card: StripeCard } | { ok: false; error: string }> {
  if (!SETUP_INTENT_ID.test(setupIntentId)) return FAILED;
  const intent = await stripe.setupIntents.retrieve(setupIntentId, { expand: ["payment_method"] }).catch(() => null);
  if (!intent || intent.status !== "succeeded" || intent.metadata?.userId !== userId) return FAILED;
  const customer = typeof intent.customer === "string" ? intent.customer : intent.customer?.id;
  const method = typeof intent.payment_method === "object" ? intent.payment_method : null;
  if (!customer || !method?.card) return FAILED;
  return { ok: true, card: { stripeCustomerId: customer, stripePaymentMethodId: method.id, brand: method.card.brand, last4: method.card.last4 } };
}
