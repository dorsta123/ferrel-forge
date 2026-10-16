import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Phase 1 placeholder. Phase 3 expands this with creators, license tiers, and supply.
export const tracks = pgTable("tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
