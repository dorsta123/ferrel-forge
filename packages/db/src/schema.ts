import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ---------------------------------------------------------------------------
// Better Auth tables. Property names (camelCase) must match Better Auth's field
// names exactly; the adapter is configured with usePlural + generateId "uuid".
// Don't add columns here by hand — use Better Auth plugins / additionalFields.
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(), // Better Auth lowercases on sign-up and sign-in
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(), // "credential" = email + password
    accountId: text("account_id").notNull(),
    password: text("password"), // hash only
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    ...timestamps,
  },
  (t) => [
    index("accounts_user_id_idx").on(t.userId),
    uniqueIndex("accounts_provider_account_uniq").on(t.providerId, t.accountId),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

// ---------------------------------------------------------------------------
// App tables
// ---------------------------------------------------------------------------

// A user is a creator iff they have a row here; every user can buy.
export const creatorProfiles = pgTable(
  "creator_profiles",
  {
    // Cascade is fine until tracks/licenses exist; phases 3 and 5 must block
    // deleting a creator whose work has been sold.
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    artistName: text("artist_name").notNull(),
    // Reserved words (admin, settings, ...) are rejected in the app, not here.
    slug: text("slug").notNull().unique(),
    bio: text("bio"),
    ...timestamps,
  },
  (t) => [
    check("creator_profiles_artist_name_len", sql`char_length(btrim(${t.artistName})) between 1 and 60`),
    check(
      "creator_profiles_slug_format",
      sql`char_length(${t.slug}) between 3 and 30 and ${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
    check("creator_profiles_bio_len", sql`${t.bio} is null or char_length(${t.bio}) <= 500`),
  ],
);

// Phase 1 placeholder. Phase 3 expands this with creator_id, license tiers, and supply.
export const tracks = pgTable("tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
