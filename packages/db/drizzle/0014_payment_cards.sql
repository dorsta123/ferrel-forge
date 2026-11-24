CREATE TYPE "public"."card_provider" AS ENUM('stripe', 'simulated');--> statement-breakpoint
CREATE TABLE "payment_cards" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"provider" "card_provider" NOT NULL,
	"stripe_customer_id" text,
	"stripe_payment_method_id" text,
	"brand" text NOT NULL,
	"last4" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_cards_provider_ids" CHECK (case "payment_cards"."provider"
        when 'stripe' then coalesce("payment_cards"."stripe_customer_id" ~ '^cus_[A-Za-z0-9]+$' and "payment_cards"."stripe_payment_method_id" ~ '^pm_[A-Za-z0-9]+$'
          and char_length("payment_cards"."stripe_customer_id") <= 255 and char_length("payment_cards"."stripe_payment_method_id") <= 255, false)
        else "payment_cards"."stripe_customer_id" is null and "payment_cards"."stripe_payment_method_id" is null end),
	CONSTRAINT "payment_cards_brand" CHECK ("payment_cards"."brand" ~ '^[a-z_]+$' and char_length("payment_cards"."brand") <= 20),
	CONSTRAINT "payment_cards_last4" CHECK ("payment_cards"."last4" ~ '^[0-9]{4}$')
);
--> statement-breakpoint
ALTER TABLE "payment_cards" ADD CONSTRAINT "payment_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;