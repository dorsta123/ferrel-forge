import { describe, expect, it } from "vitest";
import { paymentsMode } from "./mode";

describe("paymentsMode", () => {
  it("is simulated when no Stripe keys are set", () => {
    expect(paymentsMode({})).toEqual({ kind: "simulated" });
    expect(paymentsMode({ STRIPE_SECRET_KEY: " ", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "" })).toEqual({ kind: "simulated" });
  });

  it("is Stripe test mode when both test keys are set", () => {
    expect(paymentsMode({ STRIPE_SECRET_KEY: "sk_test_abc", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_def" })).toEqual({
      kind: "stripe",
      secretKey: "sk_test_abc",
      publishableKey: "pk_test_def",
    });
  });

  it("refuses live keys: no real money, ever", () => {
    expect(() => paymentsMode({ STRIPE_SECRET_KEY: "sk_live_abc", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_def" })).toThrow(/test keys/);
    expect(() => paymentsMode({ STRIPE_SECRET_KEY: "sk_test_abc", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_def" })).toThrow(/test keys/);
    expect(() => paymentsMode({ STRIPE_SECRET_KEY: "rk_live_abc", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_def" })).toThrow(/test keys/);
  });

  it("refuses half a configuration rather than silently simulating", () => {
    expect(() => paymentsMode({ STRIPE_SECRET_KEY: "sk_test_abc" })).toThrow(/both/);
    expect(() => paymentsMode({ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_def" })).toThrow(/both/);
  });
});
