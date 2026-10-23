import { sql } from "drizzle-orm";
import { bigint, check, index, integer, pgEnum, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { AUDIO_FORMATS, GENRES, MUSICAL_KEYS, TRACK_LIMITS as L, TRACK_STATUSES } from "../constants/tracks";
import { lit, timestamps } from "./columns";
import { creatorProfiles } from "./creators";

export const trackStatus = pgEnum("track_status", TRACK_STATUSES);
export const trackGenre = pgEnum("track_genre", GENRES);
export const musicalKey = pgEnum("musical_key", MUSICAL_KEYS);
export const audioFormat = pgEnum("audio_format", AUDIO_FORMATS);

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
    // Anything beyond a draft must have audio and a publish time.
    check(
      "tracks_live_needs_audio",
      sql`${t.status} = 'draft' or (${t.audioKey} is not null and ${t.publishedAt} is not null)`,
    ),
  ],
);
