// Saved cards (phase 5 part 2, step B), with forged input. Runs without Stripe keys (simulated mode).
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { db, eq, paymentCards } from "@ferrel/db";
import { finishCardSetup, hasUsableCard, saveSimulatedCard, savedCard, startCardSetup } from "@/features/payments/service";
import { createUsers, pgError, removeCreatedUsers, type TestUser } from "./support";

let a: TestUser, b: TestUser;
const env = { ...process.env };

beforeAll(async () => {
  [a, b] = await createUsers(["payA", "payB"], { creators: false });
});
afterEach(() => {
  process.env.STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (env.STRIPE_SECRET_KEY === undefined) delete process.env.STRIPE_SECRET_KEY;
  if (env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === undefined) delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
});
afterAll(removeCreatedUsers);

describe("simulated cards (no Stripe keys)", () => {
  it("has no card until one is saved, then shows only brand and last 4", async () => {
    expect(await savedCard(a.id)).toBeNull();
    expect(await saveSimulatedCard(a.id)).toEqual({ ok: true });
    expect(await savedCard(a.id)).toEqual({ provider: "simulated", brand: "visa", last4: "4242" });
    expect(await savedCard(b.id)).toBeNull();
  });

  it("saving again keeps one card per account", async () => {
    await saveSimulatedCard(a.id);
    expect(await db.select().from(paymentCards).where(eq(paymentCards.userId, a.id))).toHaveLength(1);
  });

  it("refuses the Stripe flow when Stripe isn't set up", async () => {
    expect(await startCardSetup(b.id)).toMatchObject({ ok: false });
    expect(await finishCardSetup(b.id, "seti_123")).toMatchObject({ ok: false });
    expect(await savedCard(b.id)).toBeNull();
  });
});

describe("with Stripe keys set", () => {
  it("refuses a simulated card: it would bypass Stripe", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_fake";
    expect(await saveSimulatedCard(b.id)).toMatchObject({ ok: false });
    expect(await savedCard(b.id)).toBeNull();
  });

  it("doesn't count a simulated card saved before the keys were set: it can't be billed", async () => {
    expect(await hasUsableCard(a.id)).toBe(true); // simulated mode: saved above
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_fake";
    expect(await hasUsableCard(a.id)).toBe(false);
    expect(await savedCard(a.id)).toBeNull();
  });

  it("refuses live keys outright", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_fake";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_fake";
    await expect(saveSimulatedCard(b.id)).rejects.toThrow(/test keys/);
  });
});

describe("database checks", () => {
  const insert = (values: Partial<typeof paymentCards.$inferInsert>) =>
    db.insert(paymentCards).values({ userId: b.id, provider: "stripe", brand: "visa", last4: "4242", ...values });

  it.each([
    ["a Stripe card without ids", {}],
    ["a Stripe card without a payment method", { stripeCustomerId: "cus_1" }],
    ["a Stripe card with odd ids", { stripeCustomerId: "cus_1' or 1=1", stripePaymentMethodId: "pm_1" }],
    ["a simulated card with Stripe ids", { provider: "simulated" as const, stripeCustomerId: "cus_1", stripePaymentMethodId: "pm_1" }],
    ["a full card number", { stripeCustomerId: "cus_1", stripePaymentMethodId: "pm_1", last4: "4242424242424242" }],
    ["an odd brand", { stripeCustomerId: "cus_1", stripePaymentMethodId: "pm_1", brand: "<b>Visa</b>" }],
  ])("refuses %s", async (_, values) => {
    const err = await insert(values).catch((e: unknown) => e);
    expect(pgError(err).code).toBe("23514");
  });
});
