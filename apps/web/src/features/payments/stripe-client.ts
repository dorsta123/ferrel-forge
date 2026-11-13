// The real Stripe client, created on first use and only in Stripe test mode.
import Stripe from "stripe";
import type { StripeLike } from "./stripe-cards";

let client: { key: string; stripe: Stripe } | null = null;

export function getStripe(secretKey: string): StripeLike {
  if (client?.key !== secretKey) client = { key: secretKey, stripe: new Stripe(secretKey, { maxNetworkRetries: 1, timeout: 10_000 }) };
  return client.stripe;
}
