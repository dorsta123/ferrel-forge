CREATE TYPE "public"."contributor_role" AS ENUM('producer', 'vocalist', 'writer', 'mixer', 'musician', 'other');--> statement-breakpoint
CREATE TYPE "public"."share_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TABLE "split_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"split_version_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"name" text NOT NULL,
	"role" "contributor_role" NOT NULL,
	"role_note" text,
	"basis_points" integer NOT NULL,
	"is_lead" boolean DEFAULT false NOT NULL,
	"user_id" uuid,
	"invite_hash" text,
	"status" "share_status" DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "split_shares_bp" CHECK ("split_shares"."basis_points" between 50 and 10000),
	CONSTRAINT "split_shares_name" CHECK (char_length(btrim("split_shares"."name")) between 1 and 60 and "split_shares"."name" = btrim("split_shares"."name")),
	CONSTRAINT "split_shares_role_note" CHECK ("split_shares"."role_note" is null or ("split_shares"."role" = 'other' and char_length(btrim("split_shares"."role_note")) between 1 and 40)),
	CONSTRAINT "split_shares_answer" CHECK (("split_shares"."status" = 'pending') = ("split_shares"."responded_at" is null) and ("split_shares"."status" = 'pending' or "split_shares"."user_id" is not null)),
	CONSTRAINT "split_shares_invite_hash" CHECK ("split_shares"."invite_hash" is null or "split_shares"."invite_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "split_shares_invite_pending" CHECK ("split_shares"."invite_hash" is null or "split_shares"."status" = 'pending'),
	CONSTRAINT "split_shares_lead" CHECK (not "split_shares"."is_lead" or ("split_shares"."user_id" is not null and "split_shares"."status" = 'accepted' and "split_shares"."invite_hash" is null)),
	CONSTRAINT "split_shares_position" CHECK ("split_shares"."position" between 0 and 49)
);
--> statement-breakpoint
CREATE TABLE "split_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "split_versions_id_track_uniq" UNIQUE("id","track_id"),
	CONSTRAINT "split_versions_version" CHECK ("split_versions"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "split_version_id" uuid;--> statement-breakpoint
ALTER TABLE "split_shares" ADD CONSTRAINT "split_shares_split_version_id_split_versions_id_fk" FOREIGN KEY ("split_version_id") REFERENCES "public"."split_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_shares" ADD CONSTRAINT "split_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_versions" ADD CONSTRAINT "split_versions_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "split_shares_position_uniq" ON "split_shares" USING btree ("split_version_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "split_shares_user_uniq" ON "split_shares" USING btree ("split_version_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "split_shares_invite_uniq" ON "split_shares" USING btree ("invite_hash");--> statement-breakpoint
CREATE INDEX "split_shares_user_id_idx" ON "split_shares" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "split_versions_track_version_uniq" ON "split_versions" USING btree ("track_id","version");--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_split_version_fk" FOREIGN KEY ("split_version_id","track_id") REFERENCES "public"."split_versions"("id","track_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Existing licenses: their tracks had no split, so they were 100% the lead artist's. Record that as version 1.
INSERT INTO "split_versions" ("track_id", "version") SELECT DISTINCT "track_id", 1 FROM "licenses";--> statement-breakpoint
INSERT INTO "split_shares" ("split_version_id", "position", "name", "role", "role_note", "basis_points", "is_lead", "user_id", "status", "responded_at")
  SELECT sv."id", 0, btrim(left(cp."artist_name", 60)), 'other', 'Lead artist', 10000, true, t."creator_id", 'accepted', now()
  FROM "split_versions" sv JOIN "tracks" t ON t."id" = sv."track_id" JOIN "creator_profiles" cp ON cp."user_id" = t."creator_id";--> statement-breakpoint
UPDATE "licenses" l SET "split_version_id" = sv."id" FROM "split_versions" sv WHERE sv."track_id" = l."track_id";--> statement-breakpoint
ALTER TABLE "licenses" ALTER COLUMN "split_version_id" SET NOT NULL;