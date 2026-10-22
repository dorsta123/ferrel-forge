// Test accounts for integration tests: created straight in the database and
// removed afterwards together with their tracks and stored audio.
import { randomUUID } from "node:crypto";
import { creatorProfiles, db, eq, sql, tracks, users } from "@ferrel/db";
import { deleteObject } from "@ferrel/storage";

/** Every test account uses this pattern, so leftovers are easy to find and remove. */
export const TEST_EMAIL_LIKE = "e2e.%@example.com";

const run = Date.now().toString(36);

export type TestUser = { id: string; slug: string | null };

/** Users (optionally with creator profiles). Slugs are unique per run. */
export async function createUsers(labels: string[], { creators = true } = {}): Promise<TestUser[]> {
  const created = labels.map((label) => ({ id: randomUUID(), label: label.toLowerCase() }));
  await db.insert(users).values(created.map((u) => ({ id: u.id, name: u.label, email: `e2e.int.${u.label}.${run}@example.com` })));
  if (!creators) return created.map((u) => ({ id: u.id, slug: null }));
  const withSlugs = created.map((u) => ({ ...u, slug: `int-${u.label}-${run}`.slice(0, 30) }));
  await db.insert(creatorProfiles).values(withSlugs.map((u) => ({ userId: u.id, artistName: `Int ${u.label}`, slug: u.slug })));
  return withSlugs.map((u) => ({ id: u.id, slug: u.slug }));
}

/** Remove users with their tracks and any audio those tracks still point to. */
export async function removeUsers(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const owned = sql`${tracks.creatorId} in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`;
  for (const t of await db.select({ key: tracks.audioKey }).from(tracks).where(owned)) {
    if (t.key) await deleteObject("masters", t.key);
  }
  await db.delete(tracks).where(owned);
  for (const id of ids) await db.delete(users).where(eq(users.id, id));
}

/** Postgres error code and constraint name from a Drizzle error. */
export function pgError(err: unknown): { code?: string; constraint?: string } {
  const e = (err as { cause?: unknown })?.cause ?? err;
  const { code, constraint_name } = (e ?? {}) as { code?: string; constraint_name?: string };
  return { code, constraint: constraint_name };
}

export const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);
