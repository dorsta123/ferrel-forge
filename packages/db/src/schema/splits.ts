import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgEnum, pgTable, smallint, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { CONTRIBUTOR_ROLES, SHARE_STATUSES, SPLIT_LIMITS as L } from "../constants/splits";
import { users } from "./auth";
import { lit } from "./columns";
import { tracks } from "./tracks";

export const contributorRole = pgEnum("contributor_role", CONTRIBUTOR_ROLES);
export const shareStatus = pgEnum("share_status", SHARE_STATUSES);

/**
 * A track's split, numbered 1, 2, 3… The highest number is the one in force. Never edited:
 * a change makes a new version, so each license can keep the one it started with (decision 019).
 */
export const splitVersions = pgTable(
  "split_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("split_versions_track_version_uniq").on(t.trackId, t.version),
    // Lets a license point at (split, track) together, so its split is always its own track's.
    unique("split_versions_id_track_uniq").on(t.id, t.trackId),
    check("split_versions_version", sql`${t.version} >= 1`),
  ],
);

/**
 * One person's share in a split version. Shares in a version total exactly 10,000 basis points
 * (checked by the server when the version is written; rows are never changed afterwards except
 * a contributor's answer). The lead artist's row is accepted from the start.
 */
export const splitShares = pgTable(
  "split_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    splitVersionId: uuid("split_version_id")
      .notNull()
      .references(() => splitVersions.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    name: text("name").notNull(),
    role: contributorRole("role").notNull(),
    roleNote: text("role_note"),
    basisPoints: integer("basis_points").notNull(),
    isLead: boolean("is_lead").notNull().default(false),
    // Set when the person accepts or declines (or carried over from the previous version).
    userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }),
    // SHA-256 of the current invite code; the code itself is shown once and never stored.
    inviteHash: text("invite_hash"),
    status: shareStatus("status").notNull().default("pending"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("split_shares_position_uniq").on(t.splitVersionId, t.position),
    uniqueIndex("split_shares_user_uniq").on(t.splitVersionId, t.userId),
    uniqueIndex("split_shares_invite_uniq").on(t.inviteHash),
    index("split_shares_user_id_idx").on(t.userId),
    check("split_shares_bp", sql`${t.basisPoints} between ${lit(L.minBp)} and ${lit(L.totalBp)}`),
    check("split_shares_name", sql`char_length(btrim(${t.name})) between 1 and ${lit(L.nameMax)} and ${t.name} = btrim(${t.name})`),
    check(
      "split_shares_role_note",
      sql`${t.roleNote} is null or (${t.role} = 'other' and char_length(btrim(${t.roleNote})) between 1 and ${lit(L.roleNoteMax)})`,
    ),
    check("split_shares_answer", sql`(${t.status} = 'pending') = (${t.respondedAt} is null) and (${t.status} = 'pending' or ${t.userId} is not null)`),
    check("split_shares_invite_hash", sql`${t.inviteHash} is null or ${t.inviteHash} ~ '^[0-9a-f]{64}$'`),
    check("split_shares_invite_pending", sql`${t.inviteHash} is null or ${t.status} = 'pending'`),
    check("split_shares_lead", sql`not ${t.isLead} or (${t.userId} is not null and ${t.status} = 'accepted' and ${t.inviteHash} is null)`),
    check("split_shares_position", sql`${t.position} between 0 and ${lit(L.maxPeople - 1)}`),
  ],
);
