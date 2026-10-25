CREATE TYPE "public"."audio_status" AS ENUM('none', 'processing', 'ready', 'failed');--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "audio_status" "audio_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "audio_error" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "preview_key" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "preview_start_ms" integer;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "preview_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "waveform" smallint[];--> statement-breakpoint
-- Phase 4 slice 3 (user decision, 2026-10-25): every track starts fresh in the audio
-- pipeline. Existing uploads are removed: published tracks go back to draft (like
-- "Unpublish": published_at stays, so the URL stays reserved), then their audio fields
-- are cleared so the rules below hold. The master files themselves are deleted from
-- storage separately (a database migration can't reach storage).
-- Archived is final and can't return to draft, so stop rather than guess.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "tracks" WHERE "status" = 'archived' AND "audio_key" IS NOT NULL) THEN
    RAISE EXCEPTION 'Archived tracks with audio exist; clearing their audio would break tracks_live_needs_audio. Decide how to handle them first.';
  END IF;
END $$;--> statement-breakpoint
UPDATE "tracks" SET "status" = 'draft' WHERE "status" = 'published' AND "audio_key" IS NOT NULL;--> statement-breakpoint
UPDATE "tracks" SET "audio_key" = NULL, "audio_size_bytes" = NULL, "audio_format" = NULL, "duration_ms" = NULL WHERE "audio_key" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_audio_status_matches_file" CHECK (("tracks"."audio_key" is null) = ("tracks"."audio_status" = 'none'));--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_audio_ready_has_length" CHECK ("tracks"."audio_status" <> 'ready' or "tracks"."duration_ms" is not null);--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_audio_error" CHECK (("tracks"."audio_status" = 'failed') = ("tracks"."audio_error" is not null)
        and ("tracks"."audio_error" is null or char_length(btrim("tracks"."audio_error")) between 1 and 500));--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_audio_results_need_file" CHECK ("tracks"."audio_key" is not null or ("tracks"."preview_key" is null and "tracks"."waveform" is null));--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_preview_off_no_file" CHECK ("tracks"."preview_enabled" or "tracks"."preview_key" is null);--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_preview_start" CHECK ("tracks"."preview_start_ms" is null or ("tracks"."preview_start_ms" >= 0
        and ("tracks"."duration_ms" is null or "tracks"."preview_start_ms" <= greatest("tracks"."duration_ms" - 15000, 0))));--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_waveform_shape" CHECK ("tracks"."waveform" is null or (array_ndims("tracks"."waveform") = 1 and cardinality("tracks"."waveform") = 200
        and array_position("tracks"."waveform", null) is null
        and 0 <= all("tracks"."waveform") and 1000 >= all("tracks"."waveform")));