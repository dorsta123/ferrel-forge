// Which card provider runs: Stripe test mode when its keys are set, a labelled simulation when not.
// Pure: callers pass the environment (the server passes process.env).

export type PaymentsMode = { kind: "simulated" } | { kind: "stripe"; secretKey: string; publishableKey: string };

type Env = Record<string, string | undefined>;

/** Throws on live keys or half a configuration: both are mistakes worth stopping for. */
export function paymentsMode(env: Env): PaymentsMode {
  const secretKey = env.STRIPE_SECRET_KEY?.trim() ?? "";
  const publishableKey = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  if (!secretKey && !publishableKey) return { kind: "simulated" };
  if (!secretKey || !publishableKey) {
    throw new Error("Set both STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, or neither (simulated cards).");
  }
  // This project never moves real money: only Stripe *test* keys are accepted.
  if (!secretKey.startsWith("sk_test_") || !publishableKey.startsWith("pk_test_")) {
    throw new Error("Only Stripe test keys (sk_test_…, pk_test_…) are allowed.");
  }
  return { kind: "stripe", secretKey, publishableKey };
}

/** The mode for this server process. */
export const currentPaymentsMode = () => paymentsMode(process.env);
