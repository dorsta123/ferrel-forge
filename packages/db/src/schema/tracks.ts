import { sql } from "drizzle-orm";
import { bigint, boolean, check, index, integer, pgEnum, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { AUDIO_FORMATS, AUDIO_STATUSES, GENRES, MUSICAL_KEYS, TRACK_LIMITS as L, TRACK_STATUSES } from "../constants/tracks";
import { lit, timestamps } from "./columns";
import { creatorProfiles } from "./creators";

export const trackStatus = pgEnum("track_status", TRACK_STATUSES);
export const trackGenre = pgEnum("track_genre", GENRES);
export const musicalKey = pgEnum("musical_key", MUSICAL_KEYS);
export const audioFormat = pgEnum("audio_format", AUDIO_FORMATS);
export const audioStatus = pgEnum("audio_status", AUDIO_STATUSES);

/**
 * A release a creator sells licenses for. One license type per track (phase 3).
 * `basePriceCents` is the artist's placeholder rate until pricing is decided (PRODUCT.md question 15).
 */
export const tracks = pgTable(
  "tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // RESTRICT: a creator with releases can't be deleted, so buyers' licenses survive.
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => creatorProfiles.userId, { onDelete: "restrict" }),
    title: text("title").notNull(),
    // Unique per creator; locked once published so shared links never break.
    slug: text("slug").notNull(),
    description: text("description"),
    genre: trackGenre("genre").notNull(),
    bpm: smallint("bpm"),
    musicalKey: musicalKey("musical_key"),
    status: trackStatus("status").notNull().default("draft"),
    basePriceCents: integer("base_price_cents").notNull(),
    // Master file in the private bucket. All three set together, or none.
    audioKey: text("audio_key"),
    audioSizeBytes: bigint("audio_size_bytes", { mode: "number" }),
    audioFormat: audioFormat("audio_format"),
    // Track length, read from the audio in phase 4. Null until then.
    durationMs: integer("duration_ms"),
    // Processing results (phase 4). A new upload resets them and sets "processing".
    audioStatus: audioStatus("audio_status").notNull().default("none"),
    audioError: text("audio_error"), // shown to the artist; only when "failed"
    previewKey: text("preview_key"), // 15 s preview in the public bucket
    previewStartMs: integer("preview_start_ms"), // null = the default, about 25% in
    previewEnabled: boolean("preview_enabled").notNull().default(true),
    waveform: smallint("waveform").array(), // exactly 200 bars, each 0–1000
    // Set when the preview failed every attempt, so it isn't retried forever (decision 028).
    // Cleared by a new upload; slice 9's start change clears it too.
    previewFailedAt: timestamp("preview_failed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("tracks_creator_slug_uniq").on(t.creatorId, t.slug),
    index("tracks_creator_id_idx").on(t.creatorId),
    // Explore: newest published first.
    index("tracks_published_idx").on(t.publishedAt.desc()).where(sql`${t.status} = 'published'`),

    check("tracks_title_len", sql`char_length(btrim(${t.title})) between 1 and ${lit(L.titleMax)}`),
    check(
      "tracks_slug_format",
      sql`char_length(${t.slug}) between 1 and ${lit(L.slugMax)} and ${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
    check("tracks_description_len", sql`${t.description} is null or char_length(${t.description}) <= ${lit(L.descriptionMax)}`),
    check("tracks_bpm_range", sql`${t.bpm} is null or ${t.bpm} between ${lit(L.bpmMin)} and ${lit(L.bpmMax)}`),
    check("tracks_price_range", sql`${t.basePriceCents} between ${lit(L.priceMinCents)} and ${lit(L.priceMaxCents)}`),
    check("tracks_duration_range", sql`${t.durationMs} is null or ${t.durationMs} between 1 and ${lit(L.durationMaxMs)}`),
    check(
      "tracks_audio_all_or_none",
      sql`(${t.audioKey} is null) = (${t.audioSizeBytes} is null) and (${t.audioKey} is null) = (${t.audioFormat} is null)`,
    ),
    check("tracks_audio_size", sql`${t.audioSizeBytes} is null or ${t.audioSizeBytes} between 1 and ${lit(L.audioMaxBytes)}`),
    // Audio processing results (phase 4 slice 3).
    check("tracks_audio_status_matches_file", sql`(${t.audioKey} is null) = (${t.audioStatus} = 'none')`),
    check("tracks_audio_ready_has_length", sql`${t.audioStatus} <> 'ready' or ${t.durationMs} is not null`),
    check(
      "tracks_audio_error",
      sql`(${t.audioStatus} = 'failed') = (${t.audioError} is not null)
        and (${t.audioError} is null or (${t.audioError} ~ '[^[:space:]]' and char_length(${t.audioError}) <= ${lit(L.audioErrorMax)}))`,
    ),
    check(
      "tracks_audio_results_need_file",
      sql`${t.audioKey} is not null or (${t.durationMs} is null and ${t.previewKey} is null and ${t.previewStartMs} is null and ${t.waveform} is null)`,
    ),
    check("tracks_preview_off_no_file", sql`${t.previewEnabled} or ${t.previewKey} is null`),
    // Chosen on the waveform, so only once the length is known; the 15 s preview must fit
    // inside the track, and a track shorter than that plays from 0.
    check(
      "tracks_preview_start",
      sql`${t.previewStartMs} is null or (${t.durationMs} is not null and ${t.previewStartMs} >= 0
        and ${t.previewStartMs} <= greatest(${t.durationMs} - ${lit(L.previewMs)}, 0))`,
    ),
    // One row of bars (no grid, no gaps), each 0–1000.
    check(
      "tracks_waveform_shape",
      sql`${t.waveform} is null or (array_ndims(${t.waveform}) = 1 and cardinality(${t.waveform}) = ${lit(L.waveformBars)}
        and array_position(${t.waveform}, null) is null
        and 0 <= all(${t.waveform}) and ${lit(L.waveformMax)} >= all(${t.waveform}))`,
    ),
    // Anything beyond a draft must have audio and a publish time.
    check(
      "tracks_live_needs_audio",
      sql`${t.status} = 'draft' or (${t.audioKey} is not null and ${t.publishedAt} is not null)`,
    ),
  ],
);
