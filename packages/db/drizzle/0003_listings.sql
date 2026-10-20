CREATE TYPE "public"."audio_format" AS ENUM('wav', 'mp3', 'flac');--> statement-breakpoint
CREATE TYPE "public"."musical_key" AS ENUM('C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm');--> statement-breakpoint
CREATE TYPE "public"."track_genre" AS ENUM('hip-hop', 'electronic', 'lo-fi', 'pop', 'rock', 'rnb', 'ambient', 'cinematic', 'other');--> statement-breakpoint
CREATE TYPE "public"."track_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "creator_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "genre" "track_genre" NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "bpm" smallint;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "musical_key" "musical_key";--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "status" "track_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "total_supply" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "base_price_cents" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "copies_sold" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "audio_key" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "audio_size_bytes" bigint;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "audio_format" "audio_format";--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_creator_id_creator_profiles_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_creator_slug_uniq" ON "tracks" USING btree ("creator_id","slug");--> statement-breakpoint
CREATE INDEX "tracks_creator_id_idx" ON "tracks" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "tracks_published_idx" ON "tracks" USING btree ("published_at" DESC NULLS LAST) WHERE "tracks"."status" = 'published';--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_title_len" CHECK (char_length(btrim("tracks"."title")) between 1 and 100);--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_slug_format" CHECK (char_length("tracks"."slug") between 1 and 80 and "tracks"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_description_len" CHECK ("tracks"."description" is null or char_length("tracks"."description") <= 2000);--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_bpm_range" CHECK ("tracks"."bpm" is null or "tracks"."bpm" between 40 and 250);--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_supply_range" CHECK ("tracks"."total_supply" between 1 and 1000);--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_price_range" CHECK ("tracks"."base_price_cents" between 100 and 50000);--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_copies_sold_range" CHECK ("tracks"."copies_sold" between 0 and "tracks"."total_supply");--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_audio_all_or_none" CHECK (("tracks"."audio_key" is null) = ("tracks"."audio_size_bytes" is null) and ("tracks"."audio_key" is null) = ("tracks"."audio_format" is null));--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_audio_size" CHECK ("tracks"."audio_size_bytes" is null or "tracks"."audio_size_bytes" between 1 and 157286400);--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_live_needs_audio" CHECK ("tracks"."status" = 'draft' or ("tracks"."audio_key" is not null and "tracks"."published_at" is not null));