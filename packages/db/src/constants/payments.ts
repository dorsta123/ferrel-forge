// Saved payment cards (phase 5 part 2). Card details stay with Stripe; we keep ids and what to show.

/** "stripe": a real Stripe test-mode card. "simulated": used when no Stripe keys are set (labelled as such). */
export const CARD_PROVIDERS = ["stripe", "simulated"] as const;
export type CardProvider = (typeof CARD_PROVIDERS)[number];

/** Card brands Stripe reports, for display. Anything else shows as "Card". */
export const CARD_BRAND_LABELS: Record<string, string> = {
  amex: "American Express",
  diners: "Diners Club",
  discover: "Discover",
  jcb: "JCB",
  mastercard: "Mastercard",
  unionpay: "UnionPay",
  visa: "Visa",
};

export const PAYMENT_LIMITS = { brandMax: 20, stripeIdMax: 255 } as const;
