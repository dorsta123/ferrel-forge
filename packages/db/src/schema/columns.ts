import { sql } from "drizzle-orm";
import { timestamp } from "drizzle-orm/pg-core";

/** created_at / updated_at, both timezone-aware; updated_at bumps on every Drizzle update. */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * Inline a trusted constant into DDL (check constraints can't take bind
 * parameters). Only ever pass values from our own constants, never user input.
 */
export const lit = (value: number | string) => sql.raw(typeof value === "number" ? String(value) : `'${value}'`);
