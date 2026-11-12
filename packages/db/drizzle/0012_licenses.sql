CREATE TYPE "public"."ad_platform" AS ENUM('instagram', 'tiktok', 'google');--> statement-breakpoint
CREATE TABLE "billing_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"country" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_profiles_company_name_len" CHECK (char_length(btrim("billing_profiles"."company_name")) between 1 and 100),
	CONSTRAINT "billing_profiles_country" CHECK ("billing_profiles"."country" = any(array['AE', 'AR', 'AU', 'BR', 'CA', 'DE', 'ES', 'FR', 'GB', 'IE', 'IN', 'IT', 'JP', 'KR', 'MX', 'NG', 'NL', 'NZ', 'SE', 'SG', 'US', 'ZA']::text[]))
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"licensee_id" uuid NOT NULL,
	"platforms" "ad_platform"[] NOT NULL,
	"cities" text[] NOT NULL,
	"term_days" smallint NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"rate_micros" integer NOT NULL,
	"quote" jsonb NOT NULL,
	"terms_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "licenses_platforms" CHECK (cardinality("licenses"."platforms") between 1 and 3),
	CONSTRAINT "licenses_cities" CHECK (cardinality("licenses"."cities") between 1 and 20 and "licenses"."cities" <@ array['new-york', 'los-angeles', 'chicago', 'toronto', 'mexico-city', 'sao-paulo', 'buenos-aires', 'london', 'paris', 'berlin', 'madrid', 'lagos', 'johannesburg', 'dubai', 'mumbai', 'delhi', 'singapore', 'tokyo', 'seoul', 'sydney']::text[]),
	CONSTRAINT "licenses_term" CHECK ("licenses"."term_days" in (30, 90, 365)),
	CONSTRAINT "licenses_dates" CHECK ("licenses"."ends_at" = "licenses"."starts_at" + make_interval(days => "licenses"."term_days")),
	CONSTRAINT "licenses_rate" CHECK ("licenses"."rate_micros" between 10000 and 50000000)
);
--> statement-breakpoint
ALTER TABLE "billing_profiles" ADD CONSTRAINT "billing_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_licensee_id_users_id_fk" FOREIGN KEY ("licensee_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "licenses_track_id_idx" ON "licenses" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "licenses_licensee_id_idx" ON "licenses" USING btree ("licensee_id");