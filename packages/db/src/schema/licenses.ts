import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, jsonb, pgEnum, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { AD_PLATFORMS, CITY_CODES, COUNTRY_CODES, LICENSE_TERM_DAYS, LICENSING_LIMITS } from "../constants/licensing";
import { TRACK_LIMITS } from "../constants/tracks";
import { users } from "./auth";
import { lit, timestamps } from "./columns";
import { splitVersions } from "./splits";
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
    /** Days added by extensions, at the same locked rate and split (phase 5 part 4). */
    extendedDays: integer("extended_days").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    /** Per 1,000 exposure-seconds, in micro-dollars, fixed for the license's life. */
    rateMicros: integer("rate_micros").notNull(),
    /** How the rate was worked out (the pricing engine's inputs and factors), so it can be replayed. */
    quote: jsonb("quote").notNull(),
    termsVersion: text("terms_version").notNull(),
    /** The contributor split in force when the license started; its invoices always use it (decision 019). */
    splitVersionId: uuid("split_version_id").notNull(),
    ...timestamps,
  },
  (t) => [
    index("licenses_track_id_idx").on(t.trackId),
    index("licenses_licensee_id_idx").on(t.licenseeId),
    // (split, track) together: a license can only lock a split of its own track.
    foreignKey({ name: "licenses_split_version_fk", columns: [t.splitVersionId, t.trackId], foreignColumns: [splitVersions.id, splitVersions.trackId] }).onDelete("restrict"),
    check("licenses_platforms", sql`cardinality(${t.platforms}) between 1 and ${lit(AD_PLATFORMS.length)}`),
    check("licenses_cities", sql`cardinality(${t.cities}) between 1 and ${lit(LICENSING_LIMITS.citiesMax)} and ${t.cities} <@ ${textList(CITY_CODES)}`),
    check("licenses_term", sql`${t.termDays} in (${sql.raw(LICENSE_TERM_DAYS.join(", "))})`),
    // Exact 24-hour days: calendar-day maths would depend on the session's time zone (daylight saving).
    check("licenses_dates", sql`${t.endsAt} = ${t.startsAt} + (${t.termDays} + ${t.extendedDays}) * interval '24 hours'`),
    check("licenses_extended_days", sql`${t.extendedDays} >= 0 and ${t.termDays} + ${t.extendedDays} <= ${lit(LICENSING_LIMITS.maxTotalDays)}`),
    check("licenses_rate", sql`${t.rateMicros} between ${lit(TRACK_LIMITS.rateMinMicros)} and ${lit(TRACK_LIMITS.rateMaxMicros)}`),
  ],
);

/** Each extension of a license: when, how many days, and the end date before and after (history). */
export const licenseExtensions = pgTable(
  "license_extensions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    licenseId: uuid("license_id")
      .notNull()
      .references(() => licenses.id, { onDelete: "restrict" }),
    days: smallint("days").notNull(),
    previousEndsAt: timestamp("previous_ends_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("license_extensions_license_id_idx").on(t.licenseId),
    check("license_extensions_days", sql`${t.days} in (${sql.raw(LICENSE_TERM_DAYS.join(", "))})`),
    check("license_extensions_dates", sql`${t.endsAt} = ${t.previousEndsAt} + ${t.days} * interval '24 hours'`),
  ],
);
