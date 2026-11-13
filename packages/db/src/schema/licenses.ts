import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgEnum, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { AD_PLATFORMS, CITY_CODES, COUNTRY_CODES, LICENSE_TERM_DAYS, LICENSING_LIMITS } from "../constants/licensing";
import { TRACK_LIMITS } from "../constants/tracks";
import { users } from "./auth";
import { lit, timestamps } from "./columns";
import { tracks } from "./tracks";

export const adPlatform = pgEnum("ad_platform", AD_PLATFORMS);

const textList = (values: readonly string[]) => sql.raw(`array[${values.map((v) => `'${v}'`).join(", ")}]::text[]`);

/**
 * Who pays: one row per account, asked for at the first license (decision 034). Every
 * signed-in account can license; this only holds the details invoices will need.
 */
export const billingProfiles = pgTable(
  "billing_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    country: text("country").notNull(),
    ...timestamps,
  },
  (t) => [
    check("billing_profiles_company_name_len", sql`char_length(btrim(${t.companyName})) between 1 and ${lit(LICENSING_LIMITS.companyNameMax)}`),
    check("billing_profiles_country", sql`${t.country} = any(${textList(COUNTRY_CODES)})`),
  ],
);

/**
 * A license: a track, for chosen platforms and cities, for a term, at a rate **locked** when it
 * was agreed. Kept separate from the audio file; never deleted while it matters (RESTRICT).
 */
export const licenses = pgTable(
  "licenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "restrict" }),
    licenseeId: uuid("licensee_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    platforms: adPlatform("platforms").array().notNull(),
    cities: text("cities").array().notNull(),
    termDays: smallint("term_days").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    /** Per 1,000 exposure-seconds, in micro-dollars, fixed for the license's life. */
    rateMicros: integer("rate_micros").notNull(),
    /** How the rate was worked out (the pricing engine's inputs and factors), so it can be replayed. */
    quote: jsonb("quote").notNull(),
    termsVersion: text("terms_version").notNull(),
    ...timestamps,
  },
  (t) => [
    index("licenses_track_id_idx").on(t.trackId),
    index("licenses_licensee_id_idx").on(t.licenseeId),
    check("licenses_platforms", sql`cardinality(${t.platforms}) between 1 and ${lit(AD_PLATFORMS.length)}`),
    check("licenses_cities", sql`cardinality(${t.cities}) between 1 and ${lit(LICENSING_LIMITS.citiesMax)} and ${t.cities} <@ ${textList(CITY_CODES)}`),
    check("licenses_term", sql`${t.termDays} in (${sql.raw(LICENSE_TERM_DAYS.join(", "))})`),
    // Exact 24-hour days: calendar-day maths would depend on the session's time zone (daylight saving).
    check("licenses_dates", sql`${t.endsAt} = ${t.startsAt} + ${t.termDays} * interval '24 hours'`),
    check("licenses_rate", sql`${t.rateMicros} between ${lit(TRACK_LIMITS.rateMinMicros)} and ${lit(TRACK_LIMITS.rateMaxMicros)}`),
  ],
);
