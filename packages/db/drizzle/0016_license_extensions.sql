CREATE TABLE "license_extensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_id" uuid NOT NULL,
	"days" smallint NOT NULL,
	"previous_ends_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "license_extensions_days" CHECK ("license_extensions"."days" in (30, 90, 365)),
	CONSTRAINT "license_extensions_dates" CHECK ("license_extensions"."ends_at" = "license_extensions"."previous_ends_at" + "license_extensions"."days" * interval '24 hours')
);
--> statement-breakpoint
ALTER TABLE "licenses" DROP CONSTRAINT "licenses_dates";--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "extended_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "license_extensions" ADD CONSTRAINT "license_extensions_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "license_extensions_license_id_idx" ON "license_extensions" USING btree ("license_id");--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_extended_days" CHECK ("licenses"."extended_days" >= 0 and "licenses"."term_days" + "licenses"."extended_days" <= 1825);--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_dates" CHECK ("licenses"."ends_at" = "licenses"."starts_at" + ("licenses"."term_days" + "licenses"."extended_days") * interval '24 hours');