// Saving a card with Stripe, against a fake Stripe: what a tampered browser could send back.
import { describe, expect, it } from "vitest";
import { finishStripeSetup, startStripeSetup, type StripeLike } from "./stripe-cards";

type Intent = Awaited<ReturnType<StripeLike["setupIntents"]["retrieve"]>>;

function fakeStripe(intents: Record<string, Intent> = {}) {
  const calls: string[] = [];
  const stripe: StripeLike = {
    customers: {
      create: async (p) => {
        calls.push(`customer ${p.metadata.userId}`);
        return { id: "cus_new" };
      },
    },
    setupIntents: {
      create: async (p) => {
        calls.push(`intent ${p.customer} ${p.metadata.userId} ${p.usage}`);
        return { id: "seti_1", client_secret: "seti_1_secret_x" };
      },
      retrieve: async (id) => {
        calls.push(`retrieve ${id}`);
        const intent = intents[id];
        if (!intent) throw new Error("No such setupintent");
        return intent;
      },
    },
  };
  return { stripe, calls };
}

const succeeded = (patch: Partial<Intent> = {}): Intent => ({
  id: "seti_ok",
  status: "succeeded",
  customer: "cus_123",
  metadata: { userId: "u1" },
  payment_method: { id: "pm_abc", card: { brand: "visa", last4: "4242" } },
  ...patch,
});

describe("startStripeSetup", () => {
  it("creates a customer the first time and a SetupIntent for later (off-session) monthly charges", async () => {
    const { stripe, calls } = fakeStripe();
    expect(await startStripeSetup(stripe, "u1", null)).toEqual({ clientSecret: "seti_1_secret_x" });
    expect(calls).toEqual(["customer u1", "intent cus_new u1 off_session"]);
  });

  it("reuses the account's Stripe customer", async () => {
    const { stripe, calls } = fakeStripe();
    await startStripeSetup(stripe, "u1", "cus_old");
    expect(calls).toEqual(["intent cus_old u1 off_session"]);
  });
});

describe("finishStripeSetup", () => {
  it("returns the saved card's ids and display details", async () => {
    const { stripe } = fakeStripe({ seti_ok: succeeded() });
    expect(await finishStripeSetup(stripe, "u1", "seti_ok")).toEqual({
      ok: true,
      card: { stripeCustomerId: "cus_123", stripePaymentMethodId: "pm_abc", brand: "visa", last4: "4242" },
    });
  });

  it("accepts expanded customer objects", async () => {
    const { stripe } = fakeStripe({ seti_ok: succeeded({ customer: { id: "cus_123" } }) });
    expect(await finishStripeSetup(stripe, "u1", "seti_ok")).toMatchObject({ ok: true, card: { stripeCustomerId: "cus_123" } });
  });

  it("refuses someone else's SetupIntent", async () => {
    const { stripe } = fakeStripe({ seti_ok: succeeded() });
    expect(await finishStripeSetup(stripe, "u2", "seti_ok")).toMatchObject({ ok: false });
  });

  it.each([
    ["not finished", succeeded({ status: "requires_payment_method" })],
    ["without a customer", succeeded({ customer: null })],
    ["without a card", succeeded({ payment_method: { id: "pm_abc", card: null } })],
    ["with an unexpanded payment method", succeeded({ payment_method: "pm_abc" })],
    ["without metadata", succeeded({ metadata: null })],
  ])("refuses a SetupIntent %s", async (_, intent) => {
    const { stripe } = fakeStripe({ seti_ok: intent });
    expect(await finishStripeSetup(stripe, "u1", "seti_ok")).toMatchObject({ ok: false });
  });

  it("never sends a malformed id to Stripe, and survives Stripe saying no", async () => {
    const { stripe, calls } = fakeStripe();
    expect(await finishStripeSetup(stripe, "u1", "../customers/cus_1")).toMatchObject({ ok: false });
    expect(calls).toEqual([]);
    expect(await finishStripeSetup(stripe, "u1", "seti_missing")).toMatchObject({ ok: false });
  });
});
