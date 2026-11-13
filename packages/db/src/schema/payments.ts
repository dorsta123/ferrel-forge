import { sql } from "drizzle-orm";
import { check, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { CARD_PROVIDERS, PAYMENT_LIMITS as L } from "../constants/payments";
import { users } from "./auth";
import { lit, timestamps } from "./columns";

export const cardProvider = pgEnum("card_provider", CARD_PROVIDERS);

/**
 * The card an account pays with (one per account). We never hold card numbers: only Stripe's
 * customer and payment-method ids, plus brand and last 4 digits to show. A simulated card has no ids.
 */
export const paymentCards = pgTable(
  "payment_cards",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: cardProvider("provider").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripePaymentMethodId: text("stripe_payment_method_id"),
    brand: text("brand").notNull(),
    last4: text("last4").notNull(),
    ...timestamps,
  },
  (t) => [
    check(
      "payment_cards_provider_ids",
      // coalesce: a missing id must fail the check, not make it "unknown" (which passes).
      sql`case ${t.provider}
        when 'stripe' then coalesce(${t.stripeCustomerId} ~ '^cus_[A-Za-z0-9]+$' and ${t.stripePaymentMethodId} ~ '^pm_[A-Za-z0-9]+$'
          and char_length(${t.stripeCustomerId}) <= ${lit(L.stripeIdMax)} and char_length(${t.stripePaymentMethodId}) <= ${lit(L.stripeIdMax)}, false)
        else ${t.stripeCustomerId} is null and ${t.stripePaymentMethodId} is null end`,
    ),
    check("payment_cards_brand", sql`${t.brand} ~ '^[a-z_]+$' and char_length(${t.brand}) <= ${lit(L.brandMax)}`),
    check("payment_cards_last4", sql`${t.last4} ~ '^[0-9]{4}$'`),
  ],
);
