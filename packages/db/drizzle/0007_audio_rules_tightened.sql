ALTER TABLE "tracks" DROP CONSTRAINT "tracks_audio_error";--> statement-breakpoint
ALTER TABLE "tracks" DROP CONSTRAINT "tracks_audio_results_need_file";--> statement-breakpoint
ALTER TABLE "tracks" DROP CONSTRAINT "tracks_preview_start";--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_audio_error" CHECK (("tracks"."audio_status" = 'failed') = ("tracks"."audio_error" is not null)
        and ("tracks"."audio_error" is null or ("tracks"."audio_error" ~ '[^[:space:]]' and char_length("tracks"."audio_error") <= 500)));--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_audio_results_need_file" CHECK ("tracks"."audio_key" is not null or ("tracks"."duration_ms" is null and "tracks"."preview_key" is null and "tracks"."preview_start_ms" is null and "tracks"."waveform" is null));--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_preview_start" CHECK ("tracks"."preview_start_ms" is null or ("tracks"."duration_ms" is not null and "tracks"."preview_start_ms" >= 0
        and "tracks"."preview_start_ms" <= greatest("tracks"."duration_ms" - 15000, 0)));