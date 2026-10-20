import { sql } from "drizzle-orm";
import { check, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { timestamps } from "./columns";

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
